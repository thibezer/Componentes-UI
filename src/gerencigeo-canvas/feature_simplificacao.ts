import { criarLinha, partesDaLinha, type GeometriaFeicao, type LatLonPar } from './feature_types';

/*
 * Simplificação por zoom (Douglas-Peucker), só para desenhar. A geometria da feição nunca é alterada:
 * métricas, seleção e popup seguem usando os vértices originais.
 */

/** A partir deste zoom a geometria é desenhada completa. */
export const ZOOM_SEM_SIMPLIFICACAO = 12;
/** Geometrias com menos vértices que isto não valem o custo. */
export const MIN_VERTICES_SIMPLIFICAR = 40;
/** Tolerância em pixels de tela. */
const TOLERANCIA_PX = 1.2;

/** Tolerância em graus para o zoom; 0 = sem simplificar. */
export function toleranciaPorZoom(zoom: number): number {
  if (zoom >= ZOOM_SEM_SIMPLIFICACAO) return 0;
  return (360 / (256 * 2 ** zoom)) * TOLERANCIA_PX;
}

function distanciaPontoSegmento(p: LatLonPar, a: LatLonPar, b: LatLonPar): number {
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const c = dx * dx + dy * dy;
  let t = c === 0 ? 0 : ((p[1] - a[1]) * dx + (p[0] - a[0]) * dy) / c;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[1] - (a[1] + t * dx), p[0] - (a[0] + t * dy));
}

/** Douglas-Peucker iterativo (sem recursão: linhas com centenas de milhares de vértices). */
export function simplificarLinha(pts: LatLonPar[], tolerancia: number): LatLonPar[] {
  if (tolerancia <= 0 || pts.length < 3) return pts;
  const manter = new Uint8Array(pts.length);
  manter[0] = 1;
  manter[pts.length - 1] = 1;
  const pilha: Array<[number, number]> = [[0, pts.length - 1]];
  while (pilha.length > 0) {
    const [ini, fim] = pilha.pop()!;
    let maior = 0;
    let indice = -1;
    for (let i = ini + 1; i < fim; i++) {
      const d = distanciaPontoSegmento(pts[i], pts[ini], pts[fim]);
      if (d > maior) {
        maior = d;
        indice = i;
      }
    }
    if (indice !== -1 && maior > tolerancia) {
      manter[indice] = 1;
      pilha.push([ini, indice], [indice, fim]);
    }
  }
  return pts.filter((_, i) => manter[i] === 1);
}

/** Anel aberto: mantém pelo menos 3 vértices (senão volta o original). */
export function simplificarAnel(anel: LatLonPar[], tolerancia: number): LatLonPar[] {
  if (tolerancia <= 0 || anel.length < 4) return anel;
  // fecha, simplifica e reabre, para o corte não depender de onde o anel "começa"
  const fechado = [...anel, anel[0]];
  const s = simplificarLinha(fechado, tolerancia);
  s.pop();
  return s.length >= 3 ? s : anel;
}

/** Curvas não se simplificam: os vértices de apoio só medem, o desenho é calculado a partir dos nós. */
export function vertices(g: GeometriaFeicao): number {
  if ((g.tipo === 'LineString' || g.tipo === 'Polygon') && g.curva) return 0;
  if (g.tipo === 'LineString') return partesDaLinha(g).reduce((s, p) => s + p.length, 0);
  if (g.tipo === 'Polygon') return g.aneis.reduce((s, a) => s + a.length, 0);
  return 0;
}

/** Geometria para desenho no zoom dado; devolve a própria `g` quando não há o que simplificar. */
export function simplificarGeometria(g: GeometriaFeicao, zoom: number): GeometriaFeicao {
  const tol = toleranciaPorZoom(zoom);
  if (tol === 0 || vertices(g) < MIN_VERTICES_SIMPLIFICAR) return g;
  if (g.tipo === 'LineString') return criarLinha(partesDaLinha(g).map((p) => simplificarLinha(p, tol)));
  if (g.tipo === 'Polygon') return { tipo: 'Polygon', aneis: g.aneis.map((a) => simplificarAnel(a, tol)) };
  return g;
}
