import type { Par } from '../../gerencigeo-canvas/feature_types';
import { translacao, aplicar } from '../../gerencigeo-canvas/espaco/espaco_matriz';
import { envelopeNaFolha, limitesNaFolha } from '../../gerencigeo-canvas/prancha/elemento_geometria';
import {
  ALCAS_ESCALA, caixaDaSelecao, matrizDeCisalhamentoPorAlca, matrizDeEscalaPorAlca, posicoesDasAlcas, rotacaoPorArrasto,
  transformarElementos, type AlcaEscala, type AlcaLateral, type CaixaOrientada
} from '../../gerencigeo-canvas/prancha/elemento_transformacao';
import { alcasDoElemento, ancorasDoElemento, moverAlcaDaAncora, moverAncora, moverAncoras } from '../../gerencigeo-canvas/prancha/elemento_edicao';
import { guiasInteligentes } from '../../gerencigeo-canvas/prancha/guias_inteligentes';
import { buscarSnapPrancha } from '../../gerencigeo-canvas/prancha/elemento_snap';
import { duplicarElementos } from '../../gerencigeo-canvas/prancha/organizacao';
import type { Matriz2D } from '../../gerencigeo-canvas/espaco/espaco_matriz';
import { inserirNovos } from './prancha-comandos';
import { lembrarTransformacao } from './prancha-comandos-organizacao';
import { comRaioDeCanto, marcasDosCantos, profundidadeNoCanto, raiosEfetivos } from '../../gerencigeo-canvas/prancha/cantos_vivos';
import type { QualAlca } from '../../gerencigeo-canvas/feature_edicao_ops';
import type { CaixaMm, ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import type { ControladorPrancha } from './prancha-controlador';
import { pivoDaSelecao } from './prancha-comandos';
import { DISTANCIA_ALCA_ROTACAO_PX } from './prancha-pintura';
import type { Modificadores } from './prancha-ferramentas';

/*
 * Gestos de seleção e transformação (sem listeners): mover (com snap e guias inteligentes), escalar pelas alças,
 * girar (alça de rotação, pivô movível), cisalhar (Ctrl na alça lateral) e, na seleção direta, arrastar âncoras e
 * alças Bézier. Durante o gesto o documento NÃO muda: os elementos transformados vão em `ui.substitutos`; ao soltar,
 * uma única mudança entra no histórico e sai nos eventos.
 */

export type GestoSelecao =
  | { tipo: 'mover'; inicio: Par; originais: ElementoGrafico[]; caixa: CaixaMm | null; duplicar: boolean; matriz?: Matriz2D }
  | { tipo: 'escala'; caixa: CaixaOrientada; alca: AlcaEscala; originais: ElementoGrafico[]; matriz?: Matriz2D }
  | { tipo: 'cisalhamento'; caixa: CaixaOrientada; alca: AlcaLateral; originais: ElementoGrafico[]; matriz?: Matriz2D }
  | { tipo: 'rotacao'; pivo: Par; inicio: Par; originais: ElementoGrafico[]; matriz?: Matriz2D }
  | { tipo: 'pivo' }
  | { tipo: 'ancora'; original: ElementoGrafico; indice: number; inicio: Par }
  | { tipo: 'alca-bezier'; original: ElementoGrafico; indice: number; qual: QualAlca }
  | { tipo: 'canto'; original: ElementoGrafico; indice: number; raio0: number; profundidade0: number };

export interface AlvoAlca {
  tipo: 'escala' | 'rotacao' | 'pivo' | 'canto';
  alca?: AlcaEscala;
  /** Canto (0 a 3) da marca de cantos arredondados. */
  canto?: number;
}

/** Distância mínima (px) da marca de canto até o canto, para não encostar na alça de escala. */
export const MINIMO_MARCA_CANTO_PX = 14;

/** Marcas de canto do retângulo quando ele é o único selecionado (senão `null`). */
export function marcasDeCantoDaSelecao(c: ControladorPrancha): [Par, Par, Par, Par] | null {
  const sel = c.doc.elementosSelecionados();
  if (sel.length !== 1 || c.ferramenta !== 'selecao' || c.somenteLeitura) return null;
  return marcasDosCantos(c.ui.substitutos.get(sel[0].id) ?? sel[0], MINIMO_MARCA_CANTO_PX / c.vista.zoom);
}

const distPx = (a: Par, b: Par): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Alça da caixa de transformação sob o ponteiro (px), com a tolerância maior no toque (alvo ≥ 38 px). */
export function alcaSobPonteiro(c: ControladorPrancha, px: Par, toque: boolean): AlvoAlca | null {
  const sel = c.doc.elementosSelecionados();
  const caixa = sel.length > 0 ? caixaDaSelecao(sel) : null;
  if (!caixa) return null;
  const tol = toque ? 19 : 6;
  const v = c.vista;
  const pos = posicoesDasAlcas(caixa, DISTANCIA_ALCA_ROTACAO_PX / v.zoom);
  const marcas = marcasDeCantoDaSelecao(c);
  if (marcas) {
    const i = marcas.findIndex((m) => distPx(v.paraTela(m), px) <= tol);
    if (i >= 0) return { tipo: 'canto', canto: i };
  }
  if (distPx(v.paraTela(c.ui.pivo ?? pos.centro), px) <= tol) return { tipo: 'pivo' };
  if (distPx(v.paraTela(pos.rotacao), px) <= tol) return { tipo: 'rotacao' };
  for (const a of ALCAS_ESCALA) if (distPx(v.paraTela(pos.alcas[a]), px) <= tol) return { tipo: 'escala', alca: a };
  return null;
}

export function iniciarGestoAlca(c: ControladorPrancha, alvo: AlvoAlca, p: Par, mod: Modificadores & { ctrl: boolean }): GestoSelecao | null {
  const originais = c.doc.elementosSelecionados().filter((e) => !e.bloqueado);
  const caixa = caixaDaSelecao(originais);
  if (!caixa || originais.length === 0) return null;
  if (alvo.tipo === 'pivo') return { tipo: 'pivo' };
  if (alvo.tipo === 'canto') {
    const el = originais[0];
    const r = raiosEfetivos(el);
    const prof = profundidadeNoCanto(el, alvo.canto ?? 0, p);
    if (originais.length !== 1 || !r || prof === null) return null;
    return { tipo: 'canto', original: el, indice: alvo.canto ?? 0, raio0: r[alvo.canto ?? 0], profundidade0: prof };
  }
  if (alvo.tipo === 'rotacao') return { tipo: 'rotacao', pivo: pivoDaSelecao(c) ?? p, inicio: p, originais };
  const a = alvo.alca!;
  if (mod.ctrl && (a === 'n' || a === 's' || a === 'e' || a === 'o')) return { tipo: 'cisalhamento', caixa, alca: a, originais };
  return { tipo: 'escala', caixa, alca: a, originais };
}

/** Caixas de referência das guias inteligentes: a folha e os elementos perto (sem os que estão se movendo). */
function referencias(c: ControladorPrancha, caixa: CaixaMm, fora: Set<string>): CaixaMm[] {
  const folga = 50 / c.vista.zoom;
  const perto = c.doc.indice.consultarCaixa(caixa, folga).filter((e) => !fora.has(e.id) && !e.oculto);
  const refs: CaixaMm[] = [{ x: 0, y: 0, largura: c.folha.largura, altura: c.folha.altura }];
  for (const e of perto.slice(0, 200)) {
    const l = limitesNaFolha(e);
    if (l) refs.push(l);
  }
  return refs;
}

function caixaDosElementos(els: readonly ElementoGrafico[]): CaixaMm | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of els) {
    const l = envelopeNaFolha(e);
    if (!l) continue;
    x0 = Math.min(x0, l.x); y0 = Math.min(y0, l.y); x1 = Math.max(x1, l.x + l.largura); y1 = Math.max(y1, l.y + l.altura);
  }
  return x0 <= x1 ? { x: x0, y: y0, largura: x1 - x0, altura: y1 - y0 } : null;
}

/**
 * Começa a mover a seleção. Se o ponto agarrado está perto de um vértice, canto ou centro dos próprios elementos, esse
 * ponto vira a referência do snap (é ele que encaixa no alvo, como nos editores vetoriais), não o cursor cru.
 */
export function iniciarMover(c: ControladorPrancha, p: Par, toque = false, duplicar = false): GestoSelecao | null {
  const originais = c.doc.elementosSelecionados().filter((e) => !e.bloqueado);
  if (originais.length === 0) return null;
  const caixa = originais.length <= 200 ? (originais.length === 1 ? limitesNaFolha(originais[0]) : caixaDosElementos(originais)) : null;
  const proprio = c.snapLigado && originais.length <= 200
    ? buscarSnapPrancha(p, originais, c.vista.zoom, { toleranciaPx: c.toleranciaPx(toque), meio: false, aresta: false })
    : null;
  return { tipo: 'mover', inicio: proprio ? proprio.coordenada : p, originais, caixa, duplicar };
}

/** Atualiza o gesto com o ponteiro em `p` (mm); preenche `ui.substitutos` (ou o pivô). */
export function moverGesto(c: ControladorPrancha, g: GestoSelecao, p: Par, mod: Modificadores): void {
  const ui = c.ui;
  ui.linhasInteligentes = [];
  ui.snap = null;
  let novos: ElementoGrafico[] = [];
  switch (g.tipo) {
    case 'pivo':
      ui.pivo = c.snapPonto(p, { toque: mod.toque, desligado: mod.alt }).ponto;
      break;
    case 'mover': {
      let dx = p[0] - g.inicio[0];
      let dy = p[1] - g.inicio[1];
      if (mod.shift) { if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0; }
      const fora = new Set(g.originais.map((e) => e.id));
      // Alt + arrastar duplica (não desliga o snap); sem duplicar, Alt desliga o snap
      if ((!mod.alt || g.duplicar) && c.snapLigado) {
        const s = c.snapPonto([g.inicio[0] + dx, g.inicio[1] + dy], { excluir: fora, grade: false, toque: mod.toque });
        if (s.resultado) {
          dx = s.ponto[0] - g.inicio[0];
          dy = s.ponto[1] - g.inicio[1];
        } else if (g.caixa && c.guiasInteligentes) {
          const movida = { ...g.caixa, x: g.caixa.x + dx, y: g.caixa.y + dy };
          const r = guiasInteligentes(movida, referencias(c, movida, fora), 6 / c.vista.zoom);
          dx += r.correcao[0];
          dy += r.correcao[1];
          ui.linhasInteligentes = r.linhas;
          if (r.linhas.length === 0) {
            const gr = c.snapPonto([g.inicio[0] + dx, g.inicio[1] + dy], { excluir: fora, toque: mod.toque });
            if (gr.resultado?.tipo === 'grade') { dx = gr.ponto[0] - g.inicio[0]; dy = gr.ponto[1] - g.inicio[1]; }
          }
        }
      }
      g.matriz = translacao(dx, dy);
      novos = transformarElementos(g.originais, g.matriz);
      if (g.duplicar) {
        // as cópias aparecem na sobreposição; os originais ficam onde estão
        ui.copiasEmGesto = novos;
        novos = [];
      }
      const r = (n: number) => Math.round(n * 100) / 100;
      ui.rotulo = { texto: `Δ ${r(dx)}, ${r(dy)} mm`, em: p };
      break;
    }
    case 'escala': {
      // Alt na alça é "a partir do centro": o snap continua
      const destino = c.snapPonto(p, { excluir: g.originais.map((e) => e.id), toque: mod.toque }).ponto;
      const m = matrizDeEscalaPorAlca(g.caixa, g.alca, destino, { proporcional: mod.shift, doCentro: mod.alt });
      if (m) { g.matriz = m; novos = transformarElementos(g.originais, m); }
      break;
    }
    case 'cisalhamento': {
      const m = matrizDeCisalhamentoPorAlca(g.caixa, g.alca, p);
      if (m) { g.matriz = m; novos = transformarElementos(g.originais, m); }
      break;
    }
    case 'rotacao': {
      const r = rotacaoPorArrasto(g.pivo, g.inicio, p, mod.shift ? Math.PI / 4 : undefined);
      g.matriz = r.matriz;
      novos = transformarElementos(g.originais, r.matriz);
      ui.rotulo = { texto: `${Math.round((r.angulo * 180) / Math.PI * 10) / 10}°`, em: p };
      break;
    }
    case 'ancora': {
      const sel = ui.edicao?.ancoras ?? [];
      if (sel.length > 1 && sel.includes(g.indice)) {
        const novo = moverAncoras(g.original, sel, p[0] - g.inicio[0], p[1] - g.inicio[1]);
        if (novo) novos = [novo];
      } else {
        const destino = c.snapPonto(p, { excluir: [g.original.id], toque: mod.toque, desligado: mod.alt }).ponto;
        const novo = moverAncora(g.original, g.indice, destino);
        if (novo) novos = [novo];
      }
      break;
    }
    case 'alca-bezier': {
      const novo = moverAlcaDaAncora(g.original, g.indice, g.qual, p, !mod.alt);
      if (novo) novos = [novo];
      break;
    }
    case 'canto': {
      // arrastar para dentro aumenta o raio; Alt muda só este canto (sem Alt, os quatro)
      const prof = profundidadeNoCanto(g.original, g.indice, p);
      if (prof === null) break;
      const novo = comRaioDeCanto(g.original, mod.alt ? g.indice : null, g.raio0 + prof - g.profundidade0);
      if (novo) {
        novos = [novo];
        const r = raiosEfetivos(novo)?.[g.indice] ?? 0;
        ui.rotulo = { texto: `R ${Math.round(r * 100) / 100} mm`, em: p };
      }
      break;
    }
  }
  ui.substitutos = new Map(novos.map((e) => [e.id, e]));
  c.agendar();
}

/** Termina o gesto: uma mudança só no documento (se algo mudou). */
export function soltarGesto(c: ControladorPrancha, g: GestoSelecao): void {
  const trocas = [...c.ui.substitutos.values()];
  c.ui.substitutos = new Map();
  c.ui.copiasEmGesto = [];
  c.ui.linhasInteligentes = [];
  c.ui.snap = null;
  c.ui.rotulo = null;
  if (g.tipo === 'mover' && g.duplicar) {
    if (g.matriz) {
      const copias = transformarElementos(duplicarElementos(g.originais, c.gerarId), g.matriz);
      inserirNovos(c, copias, 'duplicar');
      lembrarTransformacao(c, g.matriz, true);
    }
    c.agendar();
    return;
  }
  if ((g.tipo === 'mover' || g.tipo === 'escala' || g.tipo === 'rotacao' || g.tipo === 'cisalhamento') && g.matriz && trocas.length > 0) {
    lembrarTransformacao(c, g.matriz, false);
  }
  if (g.tipo === 'pivo' || trocas.length === 0) { c.agendar(); return; }
  const motivo = g.tipo === 'mover' ? 'mover' : g.tipo === 'ancora' || g.tipo === 'alca-bezier' ? 'editar-ancoras' : g.tipo === 'canto' ? 'cantos' : 'transformar';
  if (g.tipo === 'rotacao' || g.tipo === 'escala' || g.tipo === 'cisalhamento') {
    // o pivô acompanha a seleção
    if (c.ui.pivo && g.tipo !== 'rotacao') c.ui.pivo = null;
  }
  c.aplicarSubstituicoes(trocas, motivo);
}

/** Seleção direta: âncora ou alça Bézier do elemento em edição sob o ponteiro. */
export function alvoDeEdicao(c: ControladorPrancha, px: Par, toque: boolean): { tipo: 'ancora'; indice: number } | { tipo: 'alca'; indice: number; qual: QualAlca } | null {
  const e = c.ui.edicao;
  const el = e ? c.doc.obter(e.id) : undefined;
  if (!e || !el) return null;
  const tol = toque ? 19 : 6;
  const v = c.vista;
  const alcas = alcasDoElemento(el);
  for (const i of e.ancoras) {
    const h = alcas[i];
    if (h?.saida && distPx(v.paraTela(h.saida), px) <= tol) return { tipo: 'alca', indice: i, qual: 'saida' };
    if (h?.entrada && distPx(v.paraTela(h.entrada), px) <= tol) return { tipo: 'alca', indice: i, qual: 'entrada' };
  }
  const ancoras = ancorasDoElemento(el);
  let melhor: { indice: number; d: number } | null = null;
  ancoras.forEach((a, i) => {
    const d = distPx(v.paraTela(a), px);
    if (d <= tol && (!melhor || d < melhor.d)) melhor = { indice: i, d };
  });
  return melhor ? { tipo: 'ancora', indice: (melhor as { indice: number }).indice } : null;
}

/** Âncoras do elemento em edição dentro da caixa (mm). */
export function ancorasNaCaixa(c: ControladorPrancha, de: Par, ate: Par): number[] {
  const e = c.ui.edicao;
  const el = e ? c.doc.obter(e.id) : undefined;
  if (!el) return [];
  const x0 = Math.min(de[0], ate[0]), x1 = Math.max(de[0], ate[0]), y0 = Math.min(de[1], ate[1]), y1 = Math.max(de[1], ate[1]);
  return ancorasDoElemento(el).map((a, i) => (a[0] >= x0 && a[0] <= x1 && a[1] >= y0 && a[1] <= y1 ? i : -1)).filter((i) => i >= 0);
}

/** Centro (na folha) da caixa de seleção atual, para o pivô padrão. */
export function centroDaCaixa(caixa: CaixaOrientada): Par {
  return aplicar(caixa.quadro, [(caixa.min[0] + caixa.max[0]) / 2, (caixa.min[1] + caixa.max[1]) / 2]);
}
