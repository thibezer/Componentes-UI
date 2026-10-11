import { ehMultilinha, type Feicao, type GeometriaFeicao, type LatLonPar } from './feature_types';

/*
 * Operações puras sobre os vértices de uma feição editável (ponto, linha e polígono de um anel).
 * Sem Leaflet: o editor visual (`feature_editor_vertices.ts`) só desenha e chama estas funções.
 */

export type MotivoRecusaEdicao = 'bloqueada' | 'tipo-nao-suportado' | 'poligono-com-furos' | 'multiparte' | 'muitos-vertices';

/** Acima disto cada vértice seria uma alça no DOM: recusa em vez de travar a página. */
export const MAX_VERTICES_EDICAO = 5000;

/** Linha precisa de 2 vértices; polígono, de 3. */
export function minimoVertices(g: GeometriaFeicao): number {
  if (g.tipo === 'Polygon') return 3;
  if (g.tipo === 'LineString') return 2;
  return 1;
}

/** `null` quando pode editar; senão, o motivo da recusa. Polígono com furos/multipartes vai para a tabela de vértices. */
export function verificarEditavel(f: Feicao, camadaBloqueada = false): MotivoRecusaEdicao | null {
  if (f.bloqueada || camadaBloqueada) return 'bloqueada';
  const g = f.geometria;
  if (g.tipo !== 'Point' && g.tipo !== 'LineString' && g.tipo !== 'Polygon') return 'tipo-nao-suportado';
  if (g.tipo === 'Polygon' && g.aneis.length !== 1) return 'poligono-com-furos';
  if (ehMultilinha(g)) return 'multiparte';
  if (verticesDe(g).length > MAX_VERTICES_EDICAO) return 'muitos-vertices';
  return null;
}

export function verticesDe(g: GeometriaFeicao): LatLonPar[] {
  if (g.tipo === 'Point') return [g.coordenada];
  if (g.tipo === 'LineString') return g.coordenadas;
  if (g.tipo === 'Polygon') return g.aneis[0] ?? [];
  return [];
}

/** Nova geometria do mesmo tipo com estes vértices (não altera a original). */
export function comVertices(g: GeometriaFeicao, pts: LatLonPar[]): GeometriaFeicao {
  if (g.tipo === 'Point') return { tipo: 'Point', coordenada: pts[0] };
  if (g.tipo === 'LineString') return { tipo: 'LineString', coordenadas: pts };
  if (g.tipo === 'Polygon') return { tipo: 'Polygon', aneis: [pts] };
  return g;
}

export function moverVertice(g: GeometriaFeicao, indice: number, coord: LatLonPar): GeometriaFeicao {
  const pts = verticesDe(g).slice();
  if (indice < 0 || indice >= pts.length) return g;
  pts[indice] = coord;
  return comVertices(g, pts);
}

/** Insere `coord` logo depois do vértice `depoisDe` (no polígono, `depoisDe` = último vale entre o último e o primeiro). */
export function inserirVertice(g: GeometriaFeicao, depoisDe: number, coord: LatLonPar): GeometriaFeicao {
  if (g.tipo !== 'LineString' && g.tipo !== 'Polygon') return g;
  const pts = verticesDe(g).slice();
  if (depoisDe < 0 || depoisDe >= pts.length) return g;
  pts.splice(depoisDe + 1, 0, coord);
  return comVertices(g, pts);
}

/** `null` quando o vértice não pode sair (mínimo de 3 no polígono, 2 na linha, ponto não perde o único). */
export function removerVertice(g: GeometriaFeicao, indice: number): GeometriaFeicao | null {
  if (g.tipo !== 'LineString' && g.tipo !== 'Polygon') return null;
  const pts = verticesDe(g);
  if (indice < 0 || indice >= pts.length || pts.length <= minimoVertices(g)) return null;
  return comVertices(g, pts.filter((_, i) => i !== indice));
}

export function pontoMedio(a: LatLonPar, b: LatLonPar): LatLonPar {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** Pares de índices dos segmentos (o polígono inclui o que fecha o último no primeiro). */
export function segmentosDe(g: GeometriaFeicao): Array<[number, number]> {
  const n = verticesDe(g).length;
  const pares: Array<[number, number]> = [];
  if (g.tipo !== 'LineString' && g.tipo !== 'Polygon') return pares;
  for (let i = 0; i < n - 1; i++) pares.push([i, i + 1]);
  if (g.tipo === 'Polygon' && n > 2) pares.push([n - 1, 0]);
  return pares;
}
