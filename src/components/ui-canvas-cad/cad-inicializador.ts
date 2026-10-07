import type { UICanvasCAD } from './ui-canvas-cad';
import type { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';
import type { GerenciadorToolbarPainel } from './cad-toolbar-painel';
import type { GerenciadorColecoesDados } from './cad-colecoes-dados';
import { tratarCliqueMarcador, tratarCliqueSegmento, type ContextoEventosCanvas } from './cad-eventos-canvas';

export interface ContextoInicializadorCAD {
  host: UICanvasCAD;
  shadow: ShadowRoot;
  mapContainer: HTMLDivElement | null;
  controller: GerenciGeoMapaController;
  toolbarPainel: GerenciadorToolbarPainel;
  colecoesDados: GerenciadorColecoesDados;
  obterContextoEventos: () => ContextoEventosCanvas;
  renderLayersUI: () => void;
  invalidateSizeSafely: () => void;
  tratarCliqueLivreCanvas: (e: any, latlng?: any, containerPoint?: any) => void;
  dispararAcaoPopup: (acaoId: string, elementoId: string | number, elemento?: any) => void;
}

export function inicializarCAD(ctx: ContextoInicializadorCAD): void {
  if (!ctx.mapContainer) return;

  if ((ctx.mapContainer as any)._leaflet_id && !ctx.controller.getMap()) {
    try {
      delete (ctx.mapContainer as any)._leaflet_id;
    } catch {
      (ctx.mapContainer as any)._leaflet_id = undefined;
    }
  }

  ctx.controller.init(ctx.mapContainer, ctx.shadow);
  ctx.toolbarPainel.vincularEventos();
  ctx.renderLayersUI();

  if (ctx.host.hasAttribute('modo-sequencial')) {
    ctx.controller.modoCliqueSequencialAtivo = true;
    ctx.controller.context.modoSequencial = true;
  }
  if (ctx.host.hasAttribute('chave-grupo')) {
    const cg = ctx.host.getAttribute('chave-grupo');
    if (cg) ctx.host.chaveGrupo = cg;
  }
  if (ctx.host.hasAttribute('zona-projecao') || ctx.host.hasAttribute('fuso')) {
    const z = ctx.host.zonaProjecao;
    ctx.controller.zonaProjecao = z;
    ctx.controller.context.zonaProjecao = z;
  }
  if (ctx.host.hasAttribute('crosshair')) {
    const isCrosshair = ctx.host.getAttribute('crosshair') !== 'false';
    if (ctx.mapContainer) ctx.mapContainer.style.cursor = isCrosshair ? 'crosshair' : '';
    ctx.controller.core.config.crosshair = isCrosshair;
  }

  ctx.colecoesDados.sincronizarInicial();

  ctx.controller.layerManager.onChange((layers) => {
    ctx.renderLayersUI();
    ctx.host.dispatchEvent(new CustomEvent('ui-camadas-alteradas', {
      detail: { layers },
      bubbles: true,
      composed: true
    }));
  });

  const prevMarkerClick = ctx.controller.context.onMarkerClick;
  ctx.controller.context.onMarkerClick = (pId, isVizinho, elemento, coords) => {
    tratarCliqueMarcador(
      ctx.obterContextoEventos(),
      pId,
      isVizinho,
      elemento,
      coords,
      prevMarkerClick,
      ctx.colecoesDados.customMarkerClickHandler
    );
  };

  ctx.controller.context.onSegmentoClick = (segmentoId, segmento, coords) => {
    tratarCliqueSegmento(
      ctx.obterContextoEventos(),
      segmentoId,
      segmento,
      coords
    );
  };

  ctx.controller.context.onPopupAcao = (acaoId, elementoId, elemento) => {
    ctx.dispararAcaoPopup(acaoId, elementoId, elemento);
  };

  const map = ctx.controller.getMap();
  if (map) {
    map.on('click', (e: any) => {
      if (ctx.toolbarPainel.houveMovimentoMouse) return;
      ctx.tratarCliqueLivreCanvas(e, e.latlng, e.containerPoint);
    });
  }

  setTimeout(() => {
    ctx.invalidateSizeSafely();
  }, 150);
}
