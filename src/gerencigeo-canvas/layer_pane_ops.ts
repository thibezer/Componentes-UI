import L from 'leaflet';

/* Nomes e sub-panes Leaflet de cada camada (z-index, opacidade e interação são do LayerManager) */

export function nomePane(layerId: string): string {
  return `pane-${layerId}`;
}

/**
 * Tipos de geometria de uma camada, do fundo para o topo. Cada um vira um sub-pane aninhado no
 * pane da camada, para polígonos não cobrirem linhas/pontos da mesma camada.
 */
export type TipoGeometriaPane = 'poligono' | 'linha' | 'ponto' | 'texto';

export const ORDEM_GEOMETRIA: TipoGeometriaPane[] = ['poligono', 'linha', 'ponto', 'texto'];

export function nomeSubPane(layerId: string, tipo: TipoGeometriaPane): string {
  return `${nomePane(layerId)}-${tipo}`;
}

/** Garante (e devolve o nome de) o sub-pane de um tipo de geometria dentro do pane da camada. */
export function garantirSubPane(map: L.Map, layerId: string, tipo: TipoGeometriaPane): string {
  const pai = map.getPane(nomePane(layerId)) ?? map.createPane(nomePane(layerId));
  const nome = nomeSubPane(layerId, tipo);
  if (!map.getPane(nome)) {
    const sub = map.createPane(nome, pai);
    sub.style.zIndex = String((ORDEM_GEOMETRIA.indexOf(tipo) + 1) * 100);
  }
  return nome;
}
