import type { Par } from '../feature_types';
import { nosDaGeometria, passosDaCurva } from '../feature_curvas';
import { gerarBuffer } from '../feature_algoritmos';
import { ESPACO_PLANO } from '../espaco/espaco_plano';
import { compor, escala, ehSingular, translacao, type Matriz2D } from '../espaco/espaco_matriz';
import { FONTE_PADRAO, contornoNaFolha, fonteSegura, limitesLocais, limitesNaFolha, matrizDoElemento, type ContornoElemento } from './elemento_geometria';
import { ordenarPorEmpilhamento } from './elemento_consulta';
import { aparenciaDe, type TracoResolvido } from './aparencia_estilo';
import { direcaoNaPonta, geometriaDaPonta, linhasDeHachura } from './pintura_formas';
import type { CamadaPrancha, ElementoGrafico, GradienteElemento } from './tipos';
import { mapaDeCamadas } from './camadas';

/*
 * Plano de pintura (L2, puro): para cada elemento, os caminhos JÁ NA FOLHA (mm) e o estilo resolvido de cada camada da
 * pintura (preenchimento, hachura, traço, pontas, texto). É a fonte única da prancha: o pintor Canvas
 * (`pintura_canvas.ts`, tela e PDF) e a exportação SVG (`exportar_svg.ts`) só executam este plano, sem decidir nada.
 * O plano fica em cache pelo objeto do elemento.
 */

export type ComandoCaminho =
  | { c: 'M'; p: Par }
  | { c: 'L'; p: Par }
  | { c: 'C'; c1: Par; c2: Par; p: Par }
  | { c: 'Z' };

export type Caminho = ComandoCaminho[];

export interface PreenchimentoPlanejado {
  caminho: Caminho;
  regra: 'nonzero' | 'evenodd';
  /** Cor sólida (ou a degradação do gradiente). */
  cor: string;
  opacidade: number;
  /** Gradiente nas coordenadas relativas da caixa; `quadro` leva a caixa unitária [0,1]² para a folha. */
  gradiente?: { def: GradienteElemento; quadro: Matriz2D; opacidadeDegradacao: number };
}

export interface HachuraPlanejada {
  recorte: Caminho;
  regra: 'nonzero' | 'evenodd';
  linhas: Array<[Par, Par]>;
  cor: string;
  largura: number;
  opacidade: number;
}

export interface TracoPlanejado {
  caminho: Caminho;
  cor: string;
  largura: number;
  opacidade: number;
  tracejado: number[];
  terminacao: CanvasLineCap;
  juncao: CanvasLineJoin;
  limitePonta: number;
}

export interface PontaPlanejada {
  caminho: Caminho;
  preenchida: boolean;
  cor: string;
  largura: number;
  opacidade: number;
}

export interface TextoPlanejado {
  linhas: string[];
  /** Corpo em mm (coordenadas locais). */
  tamanho: number;
  fonte: string;
  alinhamento: 'left' | 'center' | 'right';
  cor: string;
  opacidade: number;
  /** Local → folha (a linha de base da primeira linha está em y = 0 local). */
  matriz: Matriz2D;
  entrelinha: number;
}

export interface ItemPintura {
  id: string;
  opacidade: number;
  preenchimento: PreenchimentoPlanejado | null;
  hachura: HachuraPlanejada | null;
  traco: TracoPlanejado | null;
  pontas: PontaPlanejada[];
  texto: TextoPlanejado | null;
  /** Máscara de recorte (o contorno da forma-máscara): tudo do item é pintado só dentro dele. */
  recorte?: { caminho: Caminho; regra: 'nonzero' | 'evenodd' };
  /** Fase 5: nome Canvas/CSS do modo de mesclagem (ausente = normal). Capacidade opcional. */
  mesclagem?: string;
  /** Fase 5: sombra projetada (silhueta vetorial, pintada antes do resto). */
  sombra?: SombraPlanejada;
}

/** Uma parte da silhueta da sombra: área a encher ou linha a traçar (na cor da sombra). */
export interface ParteSombra {
  caminho: Caminho;
  modo: 'encher' | 'tracar';
  regra: 'nonzero' | 'evenodd';
  largura: number;
  tracejado: number[];
  terminacao: CanvasLineCap;
  juncao: CanvasLineJoin;
}

export interface SombraPlanejada {
  /** Deslocamento em mm na folha. */
  dx: number;
  dy: number;
  /** Desvio-padrão do desfoque em mm. */
  desfoque: number;
  cor: string;
  opacidade: number;
  partes: ParteSombra[];
  /** Texto: a sombra é o próprio texto na cor da sombra. */
  texto: TextoPlanejado | null;
}

/** Fonte segura e padrão: definidas em `elemento_geometria.ts` (a caixa do texto mede com elas). */
export { FONTE_PADRAO, fonteSegura };

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Caminho do contorno: a curva Bézier (passosDaCurva) quando houver, senão a poligonal. */
export function caminhoDoContorno(c: ContornoElemento): Caminho {
  const nos = nosDaGeometria(c);
  const fechado = c.tipo === 'Polygon';
  if (nos) {
    const cam: Caminho = passosDaCurva(nos, fechado).map((p): ComandoCaminho =>
      p.cmd === 'C' ? { c: 'C', c1: p.pts[0], c2: p.pts[1], p: p.pts[2] } : { c: p.cmd, p: p.pts[0] });
    if (fechado) cam.push({ c: 'Z' });
    return cam;
  }
  const trechos = c.tipo === 'Polygon' ? c.aneis : c.partes && c.partes.length > 1 ? c.partes : [c.coordenadas];
  const cam: Caminho = [];
  for (const pts of trechos) {
    if (pts.length === 0) continue;
    cam.push({ c: 'M', p: pts[0] });
    for (let i = 1; i < pts.length; i++) cam.push({ c: 'L', p: pts[i] });
    if (fechado) cam.push({ c: 'Z' });
  }
  return cam;
}

const anelComoCaminho = (anel: Par[]): Caminho =>
  anel.length < 3 ? [] : [{ c: 'M', p: anel[0] }, ...anel.slice(1).map((p): ComandoCaminho => ({ c: 'L', p })), { c: 'Z' }];

/** Contorno deslocado para o traço `dentro`/`fora` (reaproveita o buffer do kit); `null` = fica no centro. */
function caminhoAlinhado(c: ContornoElemento, t: TracoResolvido): Caminho | null {
  if (t.alinhamento === 'centro' || c.tipo !== 'Polygon') return null;
  const d = t.alinhamento === 'fora' ? t.largura / 2 : -t.largura / 2;
  const anel = gerarBuffer({ tipo: 'Polygon', aneis: [c.aneis[0]] }, d, ESPACO_PLANO);
  return anel ? anelComoCaminho(anel) : null;
}

/** Recua a ponta da linha (só em trecho reto) para a seta cobrir o fim do traço. */
function recuar(cam: Caminho, noFim: boolean, recuo: number): void {
  if (!(recuo > 0) || cam.length < 2) return;
  const i = noFim ? cam.length - 1 : 0;
  const viz = noFim ? cam[cam.length - 2] : cam[1];
  const atual = cam[i];
  if (atual.c === 'Z' || viz.c === 'Z' || (noFim ? atual.c !== 'L' : viz.c !== 'L')) return;
  const a = atual.p;
  const b = viz.p;
  const len = Math.hypot(a[0] - b[0], a[1] - b[1]);
  if (len <= recuo * 1.01) return;
  const k = recuo / len;
  cam[i] = { ...atual, p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k] } as ComandoCaminho;
}

function quadroDoGradiente(el: ElementoGrafico): Matriz2D | null {
  const l = limitesLocais(el);
  if (!l || !(l.largura > 0) || !(l.altura > 0)) return null;
  const q = compor(escala(l.largura, l.altura), translacao(l.x, l.y), matrizDoElemento(el));
  return ehSingular(q) ? null : q;
}

/** Plano de um elemento, ou `null` se oculto ou degenerado. */
export function planejarElemento(el: ElementoGrafico): ItemPintura | null {
  if (!el || typeof el !== 'object' || el.oculto) return null;
  const contorno = contornoNaFolha(el);
  if (!contorno) return null;
  const ap = aparenciaDe(el);
  const item: ItemPintura = { id: String(el.id), opacidade: ap.opacidade, preenchimento: null, hachura: null, traco: null, pontas: [], texto: null };
  const texto = el.geometria.tipo === 'texto' ? el.geometria : null;

  if (texto) {
    if (ap.preenchimento) {
      item.texto = {
        linhas: String(texto.texto ?? '').split('\n'),
        tamanho: texto.tamanho,
        fonte: fonteSegura(texto.fonte),
        alinhamento: texto.alinhamento === 'centro' ? 'center' : texto.alinhamento === 'direita' ? 'right' : 'left',
        cor: ap.preenchimento.cor,
        opacidade: ap.preenchimento.opacidade,
        matriz: matrizDoElemento(el),
        entrelinha: 1.2
      };
    }
    efeitos(item, ap, contorno);
    return item;
  }

  const caminho = caminhoDoContorno(contorno);
  if (ap.preenchimento && contorno.tipo === 'Polygon') {
    const p = ap.preenchimento;
    item.preenchimento = { caminho, regra: p.regra, cor: p.cor, opacidade: p.opacidade };
    const quadro = p.gradiente ? quadroDoGradiente(el) : null;
    if (p.gradiente && quadro) item.preenchimento.gradiente = { def: p.gradiente.def, quadro, opacidadeDegradacao: p.gradiente.opacidadeDegradacao };
  }

  if (ap.hachura && contorno.tipo === 'Polygon') {
    const h = ap.hachura;
    const l = limitesNaFolha(el);
    if (l) {
      const x1 = l.x + l.largura, y1 = l.y + l.altura;
      const linhas = linhasDeHachura(l.x, l.y, x1, y1, h.angulo, h.espacamento);
      if (h.cruzada) linhas.push(...linhasDeHachura(l.x, l.y, x1, y1, h.angulo + Math.PI / 2, h.espacamento));
      if (linhas.length > 0) {
        item.hachura = { recorte: caminho, regra: ap.preenchimento?.regra ?? 'nonzero', linhas, cor: h.cor, largura: h.largura, opacidade: h.opacidade };
      }
    }
  }

  const t = ap.traco;
  if (t) {
    const camTraco = caminhoAlinhado(contorno, t) ?? caminho.slice();
    if (contorno.tipo === 'LineString') {
      const partes = contorno.partes && contorno.partes.length > 1 ? contorno.partes : [contorno.coordenadas];
      const extremos: Array<[boolean, typeof t.pontaInicio]> = [[false, t.pontaInicio], [true, t.pontaFim]];
      for (const [noFim, ponta] of extremos) {
        if (!ponta) continue;
        const pts = noFim ? partes[partes.length - 1] : partes[0];
        const dir = direcaoNaPonta(pts, noFim);
        const g = dir ? geometriaDaPonta(ponta, noFim ? pts[pts.length - 1] : pts[0], dir, t.largura) : null;
        if (!g) continue;
        if (partes.length === 1) recuar(camTraco, noFim, g.recuo);
        const camPonta: Caminho = [{ c: 'M', p: g.pontos[0] }, ...g.pontos.slice(1).map((p): ComandoCaminho => ({ c: 'L', p }))];
        if (g.fechada) camPonta.push({ c: 'Z' });
        item.pontas.push({ caminho: camPonta, preenchida: g.preenchida, cor: t.cor, largura: t.largura, opacidade: t.opacidade });
      }
    }
    item.traco = {
      caminho: camTraco, cor: t.cor, largura: t.largura, opacidade: t.opacidade, tracejado: t.tracejado,
      terminacao: t.terminacao, juncao: t.juncao, limitePonta: t.limitePonta
    };
  }
  efeitos(item, ap, contorno);
  return item;
}

/**
 * Silhueta da sombra, numa passada só onde possível (sem sobrepor partes semitransparentes): forma fechada com
 * preenchimento e traço de um anel vira a área do contorno alargado pelo traço (o buffer do kit); com vários anéis, o
 * preenchimento e o traço; só traço ou linha aberta, o traço (e as pontas de seta).
 */
function silhueta(item: ItemPintura, t: TracoResolvido | null, contorno: ContornoElemento): ParteSombra[] {
  const encher = (caminho: Caminho, regra: 'nonzero' | 'evenodd'): ParteSombra =>
    ({ caminho, modo: 'encher', regra, largura: 0, tracejado: [], terminacao: 'butt', juncao: 'miter' });
  const partes: ParteSombra[] = [];
  const area = item.preenchimento ?? (item.hachura ? { caminho: item.hachura.recorte, regra: item.hachura.regra } : null);
  const tr = item.traco;
  if (area && tr && t && contorno.tipo === 'Polygon' && contorno.aneis.length === 1 && t.alinhamento !== 'dentro' && tr.tracejado.length === 0) {
    const anel = gerarBuffer({ tipo: 'Polygon', aneis: [contorno.aneis[0]] }, t.alinhamento === 'fora' ? t.largura : t.largura / 2, ESPACO_PLANO);
    if (anel) return [encher(anelComoCaminho(anel), 'nonzero')];
  }
  if (area) partes.push(encher(area.caminho, area.regra));
  if (tr) partes.push({ caminho: tr.caminho, modo: 'tracar', regra: 'nonzero', largura: tr.largura, tracejado: tr.tracejado, terminacao: tr.terminacao, juncao: tr.juncao });
  for (const p of item.pontas) {
    partes.push(p.preenchida ? encher(p.caminho, 'nonzero') : { caminho: p.caminho, modo: 'tracar', regra: 'nonzero', largura: p.largura, tracejado: [], terminacao: 'butt', juncao: 'miter' });
  }
  return partes;
}

/** Mesclagem e sombra (Fase 5) no item já planejado. */
function efeitos(item: ItemPintura, ap: ReturnType<typeof aparenciaDe>, contorno: ContornoElemento): void {
  if (ap.mesclagem) item.mesclagem = ap.mesclagem;
  const s = ap.sombra;
  if (!s) return;
  const partes = item.texto ? [] : silhueta(item, ap.traco, contorno);
  if (partes.length === 0 && !item.texto) return;
  item.sombra = { dx: s.dx, dy: s.dy, desfoque: s.desfoque, cor: s.cor, opacidade: s.opacidade, partes, texto: item.texto };
}

const cachePlano = new WeakMap<ElementoGrafico, ItemPintura | null>();

/** `planejarElemento` em cache pelo objeto do elemento. */
export function planoDe(el: ElementoGrafico): ItemPintura | null {
  if (!el || typeof el !== 'object') return null;
  if (cachePlano.has(el)) return cachePlano.get(el)!;
  let p: ItemPintura | null = null;
  try {
    p = planejarElemento(el);
  } catch {
    p = null;
  }
  cachePlano.set(el, p);
  return p;
}

/** Planos na ordem de pintura (de trás para a frente), sem ocultos nem degenerados. */
/**
 * Planos na ordem de pintura (de trás para a frente), sem ocultos nem degenerados. Com `camadas`: ordem por camada,
 * camadas ocultas fora e a opacidade da camada multiplicada. Formas-máscara não são pintadas; quem as aponta em
 * `recorteId` ganha o recorte (o contorno da máscara).
 */
export function planejarElementos(elementos: readonly ElementoGrafico[], camadas?: readonly CamadaPrancha[]): ItemPintura[] {
  if (!Array.isArray(elementos)) return [];
  const validos = elementos.filter((e) => e && typeof e === 'object');
  const mapa = mapaDeCamadas(camadas);
  const porId = new Map(validos.map((e) => [e.id, e]));
  const saida: ItemPintura[] = [];
  for (const el of ordenarPorEmpilhamento(validos, mapa)) {
    if (el.mascara || !mapa.visivel(el)) continue;
    const p = planoDe(el);
    if (!p) continue;
    let item = p;
    const opCamada = mapa.opacidade(el);
    if (opCamada < 1) item = { ...item, opacidade: item.opacidade * opCamada };
    const masc = el.recorteId ? porId.get(el.recorteId) : undefined;
    const cm = masc && masc.mascara ? contornoNaFolha(masc) : null;
    if (cm && cm.tipo === 'Polygon') item = { ...item, recorte: { caminho: caminhoDoContorno(cm), regra: cm.aneis.length > 1 ? 'evenodd' : 'nonzero' } };
    saida.push(item);
  }
  return saida;
}

/** Todos os pontos do caminho são finitos? (O pintor descarta o que não for.) */
export const caminhoFinito = (cam: Caminho): boolean =>
  cam.every((k) => k.c === 'Z' || (fin(k.p[0]) && fin(k.p[1]) && (k.c !== 'C' || (fin(k.c1[0]) && fin(k.c1[1]) && fin(k.c2[0]) && fin(k.c2[1])))));
