import { partesDaLinha, type Feicao, type LatLonPar } from './feature_types';
import type { PontoPx, Projetor } from './feature_caixa';
import { pontoMedio, verticesDe } from './feature_edicao_ops';

/*
 * Snap (imã) sobre as feições candidatas. Puro: recebe as candidatas (vindas do índice espacial) e um
 * projetor lat/lon -> px; quem chama decide de onde elas vêm.
 * Prioridade: vértice > ponto médio > aresta (o mais perto dentro da tolerância, em cada nível).
 */

export type TipoSnap = 'vertice' | 'meio' | 'aresta';

export interface ResultadoSnap {
  tipo: TipoSnap;
  coordenada: LatLonPar;
  feicaoId: string;
  camadaId: string;
  /** Distância (px) entre o cursor e o ponto de snap. */
  distanciaPx: number;
}

export interface OpcoesSnap {
  toleranciaPx?: number;
  vertice?: boolean;
  meio?: boolean;
  aresta?: boolean;
}

export interface ExcluirSnap {
  feicaoId: string;
  camadaId?: string;
  /** Vértice em arrasto: ele e os segmentos que o tocam não atraem. */
  vertice?: number;
}

export const TOLERANCIA_SNAP_PX = 10;

const dist = (a: PontoPx, b: PontoPx): number => Math.hypot(a.x - b.x, a.y - b.y);

function projetarNoSegmento(p: PontoPx, a: PontoPx, b: PontoPx): { t: number; d: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const c = dx * dx + dy * dy;
  const t = c === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / c));
  return { t, d: Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) };
}

export function buscarSnap(
  cursor: PontoPx,
  candidatas: Feicao[],
  projetar: Projetor,
  opcoes: OpcoesSnap = {},
  excluir?: ExcluirSnap
): ResultadoSnap | null {
  const tol = opcoes.toleranciaPx ?? TOLERANCIA_SNAP_PX;
  const usaVertice = opcoes.vertice !== false;
  const usaMeio = opcoes.meio !== false;
  const usaAresta = opcoes.aresta !== false;

  let melhorVertice: ResultadoSnap | null = null;
  let melhorMeio: ResultadoSnap | null = null;
  let melhorAresta: ResultadoSnap | null = null;

  const proporia = (atual: ResultadoSnap | null, novo: ResultadoSnap): ResultadoSnap =>
    !atual || novo.distanciaPx < atual.distanciaPx ? novo : atual;

  for (const f of candidatas) {
    if (f.excluida || f.oculta) continue;
    const propria = !!excluir && excluir.feicaoId === f.id && (excluir.camadaId === undefined || excluir.camadaId === f.camadaId);
    const g = f.geometria;
    const base = { feicaoId: f.id, camadaId: f.camadaId };

    if (g.tipo === 'Point' || g.tipo === 'Text' || g.tipo === 'Circle') {
      if (!usaVertice || propria) continue;
      const c = g.tipo === 'Circle' ? g.centro : g.coordenada;
      const d = dist(cursor, projetar(c));
      if (d <= tol) melhorVertice = proporia(melhorVertice, { tipo: 'vertice', coordenada: c, distanciaPx: d, ...base });
      continue;
    }

    // curva em edição: o índice arrastado é de um nó, não dos vértices de apoio, e a própria curva não atrai
    if (propria && (g.tipo === 'LineString' || g.tipo === 'Polygon') && g.curva) continue;

    // trechos: cada parte de uma linha (vértices de todas as partes atraem; o último de uma parte não liga ao primeiro da
    // seguinte) ou o anel externo do polígono (fechado). O vértice em arrasto só existe na edição, que é de uma parte só.
    const trechos: Array<{ pts: LatLonPar[]; fechado: boolean }> =
      g.tipo === 'LineString' ? partesDaLinha(g).map((pts) => ({ pts, fechado: false })) : [{ pts: verticesDe(g), fechado: g.tipo === 'Polygon' }];
    const arrastado = propria ? excluir!.vertice : undefined;

    for (const { pts, fechado } of trechos) {
      const px = pts.map(projetar);
      if (usaVertice) {
        for (let i = 0; i < pts.length; i++) {
          if (i === arrastado) continue;
          const d = dist(cursor, px[i]);
          if (d <= tol) melhorVertice = proporia(melhorVertice, { tipo: 'vertice', coordenada: pts[i], distanciaPx: d, ...base });
        }
      }

      if (!usaMeio && !usaAresta) continue;
      const pares: Array<[number, number]> = [];
      for (let i = 0; i < pts.length - 1; i++) pares.push([i, i + 1]);
      if (fechado && pts.length > 2) pares.push([pts.length - 1, 0]);
      for (const [i, j] of pares) {
        if (arrastado !== undefined && (i === arrastado || j === arrastado)) continue;
        if (propria && arrastado === undefined) continue;
        if (usaMeio) {
          const m = pontoMedio(pts[i], pts[j]);
          const d = dist(cursor, projetar(m));
          if (d <= tol) melhorMeio = proporia(melhorMeio, { tipo: 'meio', coordenada: m, distanciaPx: d, ...base });
        }
        if (usaAresta) {
          const { t, d } = projetarNoSegmento(cursor, px[i], px[j]);
          if (d <= tol) {
            const c: LatLonPar = [pts[i][0] + t * (pts[j][0] - pts[i][0]), pts[i][1] + t * (pts[j][1] - pts[i][1])];
            melhorAresta = proporia(melhorAresta, { tipo: 'aresta', coordenada: c, distanciaPx: d, ...base });
          }
        }
      }
    }
  }

  return melhorVertice ?? melhorMeio ?? melhorAresta;
}
