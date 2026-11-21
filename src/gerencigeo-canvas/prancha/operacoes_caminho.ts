import type { NoCurva, Par } from '../feature_types';
import { dividirPoligonoComLinha, gerarBuffer, juntarLinhas, juntarPoligonos } from '../feature_algoritmos';
import { simplificarAnel, simplificarLinha } from '../feature_simplificacao';
import { controlesDoSegmento, pontoDaCubica } from '../feature_curvas';
import { nosOuVertices, segmentosDoEditor } from '../feature_edicao_ops';
import { distSegmentoPx } from '../motor/geometria-px';
import { ESPACO_PLANO } from '../espaco/espaco_plano';
import { aplicar } from '../espaco/espaco_matriz';
import { contornoLocal, contornoNaFolha, matrizDoElemento, type ContornoElemento } from './elemento_geometria';
import { aparenciaDe } from './aparencia_estilo';
import { ordenarPorEmpilhamento } from './elemento_consulta';
import type { CamadaPrancha, ElementoGrafico } from './tipos';

/*
 * Operações de caminho (L2, puras), reaproveitando os algoritmos do mapa no espaço plano (mm): unir, dividir com uma linha,
 * deslocar caminho (offset), simplificar, contorno do traço, máscara de recorte, e a localização de âncoras e trechos que
 * as ferramentas de âncora usam. Curvas entram pelos vértices amostrados (o resultado é poligonal), como no mapa.
 * Cada função devolve o resultado ou `{ motivo }` (nunca lança).
 */

export type MotivoOperacaoCaminho =
  | 'selecao-insuficiente' | 'tipos-incompativeis' | 'sem-ligacao' | 'sem-intersecao' | 'sem-forma-fechada' | 'texto' | 'degenerado'
  | 'resultado-vazio';

export type ResultadoOperacao<T> = { ok: T } | { motivo: MotivoOperacaoCaminho };

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Elemento caminho (matriz identidade) com o contorno dado na folha, herdando o resto de `base`. */
export function comoCaminhoNaFolha(base: ElementoGrafico, c: ContornoElemento, id = base.id): ElementoGrafico {
  const { transformacao: _t, pivo: _p, ...resto } = base;
  return { ...resto, id, geometria: { tipo: 'caminho', geometria: c } };
}

/** Une linhas abertas (pontas a até `tolerancia` mm) ou dois polígonos (por uma ponte). */
export function unirCaminhos(elementos: readonly ElementoGrafico[], tolerancia = 0.01): ResultadoOperacao<ElementoGrafico> {
  const contornos = elementos.map((e) => ({ e, c: contornoNaFolha(e) })).filter((x) => x.c && x.e.geometria.tipo !== 'texto');
  if (contornos.length < 2) return { motivo: 'selecao-insuficiente' };
  const tol = fin(tolerancia) && tolerancia >= 0 ? tolerancia : 0.01;
  if (contornos.every((x) => x.c!.tipo === 'LineString')) {
    const linhas = contornos.flatMap((x) => {
      const c = x.c as Extract<ContornoElemento, { tipo: 'LineString' }>;
      return c.partes && c.partes.length > 1 ? c.partes : [c.coordenadas];
    });
    const r = juntarLinhas(linhas, tol, ESPACO_PLANO);
    return r ? { ok: comoCaminhoNaFolha(contornos[0].e, { tipo: 'LineString', coordenadas: r }) } : { motivo: 'sem-ligacao' };
  }
  if (contornos.length === 2 && contornos.every((x) => x.c!.tipo === 'Polygon')) {
    const [a, b] = contornos.map((x) => (x.c as Extract<ContornoElemento, { tipo: 'Polygon' }>).aneis[0]);
    const r = juntarPoligonos(a, b, tol, ESPACO_PLANO);
    return r ? { ok: comoCaminhoNaFolha(contornos[0].e, { tipo: 'Polygon', aneis: [r] }) } : { motivo: 'sem-ligacao' };
  }
  return { motivo: 'tipos-incompativeis' };
}

/** Divide a forma fechada pela linha de corte; as partes herdam a aparência da forma (ids de `gerarId`). */
export function dividirComLinha(forma: ElementoGrafico, corte: ElementoGrafico, gerarId: (tipo: string) => string): ResultadoOperacao<ElementoGrafico[]> {
  const cf = contornoNaFolha(forma);
  const cl = contornoNaFolha(corte);
  if (!cf || !cl) return { motivo: 'degenerado' };
  if (cf.tipo !== 'Polygon' || forma.geometria.tipo === 'texto') return { motivo: 'sem-forma-fechada' };
  if (cl.tipo !== 'LineString') return { motivo: 'tipos-incompativeis' };
  const partes = dividirPoligonoComLinha(cf.aneis[0], cl.coordenadas, ESPACO_PLANO);
  if (!partes) return { motivo: 'sem-intersecao' };
  return { ok: partes.map((anel) => comoCaminhoNaFolha(forma, { tipo: 'Polygon', aneis: [anel] }, gerarId('caminho'))) };
}

/** Deslocar caminho (offset) de `distancia` mm (negativo encolhe); é um elemento NOVO, como nos editores vetoriais. */
export function deslocarCaminho(el: ElementoGrafico, distancia: number, id: string): ResultadoOperacao<ElementoGrafico> {
  const c = contornoNaFolha(el);
  if (!c || el.geometria.tipo === 'texto') return { motivo: el.geometria?.tipo === 'texto' ? 'texto' : 'degenerado' };
  if (!fin(distancia) || distancia === 0) return { motivo: 'degenerado' };
  const anel = gerarBuffer(c.tipo === 'Polygon' ? { tipo: 'Polygon', aneis: [c.aneis[0]] } : { tipo: 'LineString', coordenadas: c.coordenadas }, distancia, ESPACO_PLANO);
  return anel ? { ok: comoCaminhoNaFolha(el, { tipo: 'Polygon', aneis: [anel] }, id) } : { motivo: 'degenerado' };
}

/** Simplifica (Douglas-Peucker com tolerância em mm); o mesmo id. Curvas viram poligonais. */
export function simplificarCaminho(el: ElementoGrafico, tolerancia: number): ResultadoOperacao<ElementoGrafico> {
  const c = contornoNaFolha(el);
  if (!c || el.geometria.tipo === 'texto') return { motivo: el.geometria?.tipo === 'texto' ? 'texto' : 'degenerado' };
  const tol = fin(tolerancia) && tolerancia > 0 ? tolerancia : 0.1;
  if (c.tipo === 'Polygon') return { ok: comoCaminhoNaFolha(el, { tipo: 'Polygon', aneis: c.aneis.map((a) => simplificarAnel(a, tol, 1)) }) };
  const partes = (c.partes && c.partes.length > 1 ? c.partes : [c.coordenadas]).map((p) => simplificarLinha(p, tol, 1));
  return { ok: comoCaminhoNaFolha(el, partes.length > 1 ? { tipo: 'LineString', coordenadas: partes[0], partes } : { tipo: 'LineString', coordenadas: partes[0] }) };
}

/**
 * Contorno do traço: o traço vira uma forma preenchida com a cor dele (linha aberta: o contorno em volta; forma fechada:
 * o anel entre o lado de fora e o de dentro). O mesmo id; sem traço, `null` no motivo.
 */
export function contornoDoTraco(el: ElementoGrafico): ResultadoOperacao<ElementoGrafico> {
  const c = contornoNaFolha(el);
  const t = aparenciaDe(el).traco;
  if (!c || el.geometria.tipo === 'texto') return { motivo: el.geometria?.tipo === 'texto' ? 'texto' : 'degenerado' };
  if (!t) return { motivo: 'degenerado' };
  const meia = t.largura / 2;
  let geometria: ContornoElemento | null = null;
  if (c.tipo === 'LineString') {
    const anel = gerarBuffer({ tipo: 'LineString', coordenadas: c.coordenadas }, meia, ESPACO_PLANO);
    geometria = anel ? { tipo: 'Polygon', aneis: [anel] } : null;
  } else {
    const fora = gerarBuffer({ tipo: 'Polygon', aneis: [c.aneis[0]] }, meia, ESPACO_PLANO);
    const dentro = gerarBuffer({ tipo: 'Polygon', aneis: [c.aneis[0]] }, -meia, ESPACO_PLANO);
    geometria = fora ? { tipo: 'Polygon', aneis: dentro ? [fora, dentro] : [fora] } : null;
  }
  if (!geometria) return { motivo: 'degenerado' };
  const novo = comoCaminhoNaFolha(el, geometria);
  novo.aparencia = { ...(el.aparencia ?? {}), traco: null, preenchimento: { cor: t.cor, opacidade: t.opacidade, regra: 'evenodd' }, hachura: null };
  return { ok: novo };
}

/**
 * Cria a máscara de recorte: a forma fechada MAIS À FRENTE da seleção vira a máscara (não é pintada) e recorta as demais;
 * todos entram no grupo `grupoId`. Devolve a lista inteira atualizada.
 */
export function criarMascara(lista: readonly ElementoGrafico[], ids: Iterable<string>, grupoId: string, camadas?: readonly CamadaPrancha[]): ResultadoOperacao<ElementoGrafico[]> {
  const sel = new Set(ids);
  const escolhidos = ordenarPorEmpilhamento(lista.filter((e) => sel.has(e.id)), camadas);
  if (escolhidos.length < 2) return { motivo: 'selecao-insuficiente' };
  const mascara = [...escolhidos].reverse().find((e) => e.geometria.tipo !== 'texto' && contornoNaFolha(e)?.tipo === 'Polygon');
  if (!mascara) return { motivo: 'sem-forma-fechada' };
  return {
    ok: lista.map((e) => {
      if (e.id === mascara.id) return { ...e, mascara: true, grupoId };
      if (sel.has(e.id)) return { ...e, recorteId: mascara.id, grupoId };
      return e;
    })
  };
}

/** Libera as máscaras dos grupos dos ids: a forma volta a ser comum e os demais deixam de ser recortados. */
export function liberarMascara(lista: readonly ElementoGrafico[], ids: Iterable<string>): ElementoGrafico[] {
  const sel = new Set(ids);
  const grupos = new Set(lista.filter((e) => sel.has(e.id) && e.grupoId).map((e) => e.grupoId!));
  const mascaras = new Set(lista.filter((e) => e.mascara && (sel.has(e.id) || (e.grupoId && grupos.has(e.grupoId)))).map((e) => e.id));
  if (mascaras.size === 0) return [...lista];
  return lista.map((e) => {
    if (mascaras.has(e.id)) { const { mascara: _m, ...r } = e; return r; }
    if (e.recorteId && mascaras.has(e.recorteId)) { const { recorteId: _r, ...r } = e; return r; }
    return e;
  });
}

// ---------- localização para as ferramentas de âncora ----------

/** Índice da âncora (nó ou vértice) mais perto de `p` (folha), dentro de `tolerancia` mm; `null` se nenhuma. */
export function ancoraMaisProxima(el: ElementoGrafico, p: Par, tolerancia: number): number | null {
  const c = el?.geometria && el.geometria.tipo !== 'texto' ? contornoLocal(el.geometria) : null;
  const nos = c ? nosOuVertices(c) : null;
  if (!nos || !fin(p?.[0]) || !fin(p?.[1])) return null;
  const m = matrizDoElemento(el);
  let melhor: { i: number; d: number } | null = null;
  nos.forEach((n: NoCurva, i: number) => {
    const q = aplicar(m, n.ponto);
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d <= tolerancia && (!melhor || d < melhor.d)) melhor = { i, d };
  });
  return melhor ? (melhor as { i: number }).i : null;
}

/** Trecho (índice da âncora de início) mais perto de `p` (folha), dentro de `tolerancia` mm; `null` se nenhum. */
export function trechoMaisProximo(el: ElementoGrafico, p: Par, tolerancia: number): number | null {
  const c = el?.geometria && el.geometria.tipo !== 'texto' ? contornoLocal(el.geometria) : null;
  const nos = c ? nosOuVertices(c) : null;
  if (!c || !nos || !fin(p?.[0]) || !fin(p?.[1])) return null;
  const m = matrizDoElemento(el);
  let melhor: { i: number; d: number } | null = null;
  for (const [i, j] of segmentosDoEditor(c)) {
    const [c1, c2] = controlesDoSegmento(nos[i], nos[j]);
    let anterior = aplicar(m, nos[i].ponto);
    for (let k = 1; k <= 16; k++) {
      const q = aplicar(m, pontoDaCubica(nos[i].ponto, c1, c2, nos[j].ponto, k / 16));
      const d = distSegmentoPx(p[0], p[1], anterior[0], anterior[1], q[0], q[1]);
      if (d <= tolerancia && (!melhor || d < melhor.d)) melhor = { i, d };
      anterior = q;
    }
  }
  return melhor ? (melhor as { i: number }).i : null;
}
