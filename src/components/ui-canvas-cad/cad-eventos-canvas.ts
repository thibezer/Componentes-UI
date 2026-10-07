/**
 * Normalizador de eventos e despacho canônico de cliques e ações do Canvas (<ui-canvas-cad>).
 * Responsabilidade única: isolar a lógica de filtragem de pan/seleção, cálculo de coordenadas,
 * detecção de elementos interativos e despacho canônico de 'ui-canvas-clique' e 'ui-acao-popup'.
 */

import L from 'leaflet';
import type { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';

export interface ContextoEventosCanvas {
  host: HTMLElement;
  controller: GerenciGeoMapaController;
  mapContainer: HTMLElement | null;
  modoSequencial: boolean;
  mouseMovedSinceDown: boolean;
  obterElementoPorId: (id: string | number) => any;
  fecharPopup: () => void;
}

export function processarCliqueLivreCanvas(
  ctx: ContextoEventosCanvas,
  e: MouseEvent | any,
  latLngParam?: { lat: number; lng?: number; lon?: number },
  containerPointParam?: { x: number; y: number }
): boolean {
  // 1. Condição: O modo-sequencial deve estar desligado
  if (ctx.modoSequencial) return false;

  // 2. Condição: Nenhuma caixa de seleção retangular CAD ocorreu (selectionHappened === false)
  if (ctx.controller.canvasInteracao.selectionHappened) return false;

  // 3. Arrastar para selecionar nós ou dar Pan na tela nunca deve emitir o evento
  if (ctx.controller.canvasInteracao.panHappened || ctx.mouseMovedSinceDown) return false;

  // 4. Captura cliques fora de marcadores e vetores
  const origEvt = (e as any)?.originalEvent || e;
  const path = typeof origEvt?.composedPath === 'function' ? origEvt.composedPath() : [];
  const target = (path.length > 0 ? path[0] : (origEvt?.target || (e as any)?.target)) as HTMLElement | null;
  if (target) {
    const interactiveSelector = '.custom-leaflet-marker, .leaflet-marker-icon, .leaflet-interactive, .compact-popup, .leaflet-popup, .ui-popup-btn, .cad-btn-tool, .qgis-layer-panel, [class*="leaflet-marker"], [class*="leaflet-popup"]';
    const isInteractive = target.matches?.(interactiveSelector) || target.closest?.(interactiveSelector);
    if (isInteractive) return false;
  }

  const map = ctx.controller.getMap();
  if (!map || !ctx.mapContainer) return false;

  // Calcula ponto pixel relativo ao container de forma segura
  let pontoPixelX: number;
  let pontoPixelY: number;

  if (containerPointParam) {
    pontoPixelX = Math.round(containerPointParam.x);
    pontoPixelY = Math.round(containerPointParam.y);
  } else if ((e as any)?.containerPoint || (e as any)?.layerPoint) {
    pontoPixelX = Math.round((e as any).containerPoint?.x ?? (e as any).layerPoint?.x ?? 0);
    pontoPixelY = Math.round((e as any).containerPoint?.y ?? (e as any).layerPoint?.y ?? 0);
  } else {
    const rect = ctx.mapContainer.getBoundingClientRect();
    const clientX = origEvt?.clientX ?? 0;
    const clientY = origEvt?.clientY ?? 0;
    pontoPixelX = Math.round(clientX - rect.left);
    pontoPixelY = Math.round(clientY - rect.top);
  }

  const pontoPixel = { x: pontoPixelX, y: pontoPixelY };

  // Calcula coordenadas geográficas normalizadas
  let lat: number;
  let lng: number;

  const latlngSource = latLngParam || (e as any)?.latlng;
  if (latlngSource && typeof latlngSource.lat === 'number') {
    lat = latlngSource.lat;
    lng = latlngSource.lng ?? (latlngSource as any).lon ?? 0;
  } else {
    const latlng = map.containerPointToLatLng(L.point(pontoPixel.x, pontoPixel.y));
    lat = latlng.lat;
    lng = latlng.lng;
  }

  // Lista de camadas ativas (visíveis)
  const camadasAtivas = ctx.controller.layerManager
    ? ctx.controller.layerManager.getLayers().filter((l) => l.visivel).map((l) => l.id)
    : [];

  const eventoOriginal = origEvt;

  // Dispara evento customizado com payload canônico e normalizado
  ctx.host.dispatchEvent(new CustomEvent('ui-canvas-clique', {
    detail: {
      coordenadas: {
        lat,
        lng
      },
      pontoPixel,
      eventoOriginal,
      lat,
      lon: lng,
      lng,
      camadasAtivas
    },
    bubbles: true,
    composed: true
  }));

  return true;
}

export function processarAcaoPopup(
  ctx: ContextoEventosCanvas,
  acaoId: string,
  elementoId: string | number,
  elemento?: any
): void {
  const safeElemento = elemento || ctx.obterElementoPorId(elementoId);

  ctx.host.dispatchEvent(new CustomEvent('ui-acao-popup', {
    detail: {
      acaoId,
      elementoId,
      elemento: safeElemento ?? { id: elementoId }
    },
    bubbles: true,
    composed: true
  }));

  ctx.fecharPopup();
}

export function tratarCliqueMarcador(
  ctx: ContextoEventosCanvas,
  pId: string | number,
  isVizinho: boolean | undefined,
  elemento: any,
  coords: { lat: number; lon: number } | undefined,
  prevMarkerClick?: (pId: string | number, isVizinho?: boolean, elemento?: any, coords?: { lat: number; lon: number }) => void,
  customMarkerClickHandler?: (pontoId: number, isVizinho?: boolean) => void
): void {
  let safeElemento = elemento || ctx.obterElementoPorId(pId);

  let safeCoords = coords;
  if (!safeCoords && safeElemento) {
    const rawLat = safeElemento.lat ?? (safeElemento as any).latitude ?? 0;
    const rawLon = safeElemento.lon ?? safeElemento.lng ?? (safeElemento as any).longitude ?? 0;
    safeCoords = { lat: Number(rawLat), lon: Number(rawLon) };
  }
  if (!safeCoords) {
    safeCoords = { lat: 0, lon: 0 };
  }

  if (ctx.modoSequencial) {
    ctx.fecharPopup();
    ctx.host.dispatchEvent(new CustomEvent('ui-clique-sequencial', {
      detail: {
        id: pId,
        elemento: safeElemento ?? { id: pId, lat: safeCoords.lat, lon: safeCoords.lon },
        coordenadas: safeCoords
      },
      bubbles: true,
      composed: true
    }));
    return;
  }

  if (customMarkerClickHandler) {
    try {
      const parsedId = (pId !== undefined && pId !== null && !isNaN(Number(pId)) && String(pId).trim() !== '')
        ? Number(pId)
        : pId;
      customMarkerClickHandler(parsedId as any, isVizinho);
    } catch (err) {
      console.error('Erro no callback de clique de marcador:', err);
    }
  }
  if (prevMarkerClick) {
    try {
      prevMarkerClick(pId, isVizinho, safeElemento, safeCoords);
    } catch (err) {
      console.error('Erro no handler anterior de marker click:', err);
    }
  }
  if (ctx.controller.context.selectedSegmentoId) {
    ctx.controller.selectSegmento(null);
  }

  ctx.host.dispatchEvent(new CustomEvent('ui-ponto-selecionado', {
    detail: { selectedIds: [pId], lastSelectedId: pId, isVizinho },
    bubbles: true,
    composed: true
  }));
  ctx.host.dispatchEvent(new CustomEvent('ui-elemento-selecionado', {
    detail: { id: pId, elemento: safeElemento, tipo: isVizinho ? 'vizinho' : 'vertice', coordenadas: safeCoords },
    bubbles: true,
    composed: true
  }));
}

export function tratarCliqueSegmento(
  ctx: ContextoEventosCanvas,
  segmentoId: string | number,
  segmento: any,
  coords?: { lat: number; lon: number },
  customSegmentoClickHandler?: (segmentoId: string | number, segmento: any) => void
): void {
  if (ctx.modoSequencial) {
    ctx.fecharPopup();
    return;
  }

  // Desmarca pontos selecionados e seleciona o segmento ativo
  ctx.controller.canvasInteracao.ctx.selectedPontoIds = [];
  ctx.controller.canvasInteracao.ctx.selectedVizinhoPontoIds = [];
  ctx.controller.canvasInteracao.ctx.lastSelectedPontoId = null;
  (ctx.controller.context as any).selectedPontoIds = [];
  ctx.controller.atualizarDestaqueMarcadores();

  ctx.controller.selectSegmento(segmentoId);

  if (customSegmentoClickHandler) {
    try {
      customSegmentoClickHandler(segmentoId, segmento);
    } catch (err) {
      console.error('Erro no callback de clique de segmento:', err);
    }
  }

  // Notifica o host via CustomEvent canônico
  ctx.host.dispatchEvent(new CustomEvent('ui-segmento-selecionado', {
    detail: {
      segmentoId,
      segmento,
      pontoInicioId: segmento?.ponto_inicio_id,
      pontoFimId: segmento?.ponto_fim_id,
      coordenadas: coords
    },
    bubbles: true,
    composed: true
  }));

  ctx.host.dispatchEvent(new CustomEvent('ui-elemento-selecionado', {
    detail: {
      id: segmentoId,
      elemento: segmento,
      tipo: 'segmento',
      coordenadas: coords
    },
    bubbles: true,
    composed: true
  }));
}


