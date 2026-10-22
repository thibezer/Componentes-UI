/**
 * Zoom em passos finos (como CAD/GIS). O padrão do Leaflet (`zoomSnap: 1`) arredonda cada giro da roda para um nível
 * inteiro, e um nível dobra a escala: o mapa "pula". Com 0,25 de passo, cada giro da roda anda cerca de meio nível (medido no Chrome/Windows) e as teclas +/- andam 0,5.
 * Funções que dependem do zoom (simplificação, clusters, densidade, pré-carga de tiles) aceitam valores fracionários.
 */
export const OPCOES_ZOOM_FINO = {
  zoomSnap: 0.25,
  zoomDelta: 0.5,
  wheelPxPerZoomLevel: 90
} as const;
