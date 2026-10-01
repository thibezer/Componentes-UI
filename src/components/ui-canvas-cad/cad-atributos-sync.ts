import type { UICanvasCAD } from './ui-canvas-cad';
import type { GerenciadorBroadcastConfig } from './cad-broadcast';
import type { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';

export interface ContextoAtributosCAD {
  host: UICanvasCAD;
  controller: GerenciGeoMapaController;
  mapContainer: HTMLDivElement | null;
  broadcastConfig: GerenciadorBroadcastConfig;
  setLayerOpacity: (id: string, op: number) => void;
  setLayerScaleMode: (id: string, mode: any) => void;
  atualizarZonaProjecao: (zona: number) => void;
}

export function sincronizarAtributoCAD(
  ctx: ContextoAtributosCAD,
  name: string,
  oldVal: string,
  newVal: string
): void {
  if (oldVal === newVal) return;

  if (name === 'sat-opacity') {
    const op = parseFloat(newVal);
    if (!isNaN(op)) ctx.setLayerOpacity('satelite', op);
  } else if (name === 'scale-mode') {
    if (newVal === 'world' || newVal === 'screen') {
      ctx.setLayerScaleMode('perimetro', newVal);
      ctx.setLayerScaleMode('vertices', newVal);
    }
  } else if (name === 'modo-sequencial') {
    ctx.host.modoSequencial = newVal !== null && newVal !== 'false';
  } else if (name === 'chave-grupo') {
    ctx.host.chaveGrupo = newVal || undefined;
  } else if (name === 'zona-projecao' || name === 'fuso') {
    const parsed = parseInt(newVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      ctx.atualizarZonaProjecao(parsed);
      if (name === 'fuso' && ctx.host.getAttribute('zona-projecao') !== newVal) {
        ctx.host.setAttribute('zona-projecao', newVal);
      } else if (name === 'zona-projecao' && ctx.host.hasAttribute('fuso') && ctx.host.getAttribute('fuso') !== newVal) {
        ctx.host.setAttribute('fuso', newVal);
      }
      ctx.controller.zonaProjecao = parsed;
      ctx.controller.context.zonaProjecao = parsed;
    }
  } else if (name === 'canal-configuracao') {
    ctx.broadcastConfig.conectar(newVal);
  } else if (name === 'crosshair') {
    const isCrosshair = newVal !== null && newVal !== 'false';
    if (ctx.mapContainer) ctx.mapContainer.style.cursor = isCrosshair ? 'crosshair' : '';
    const map = ctx.controller.getMap();
    if (map) {
      const c = map.getContainer();
      if (c) c.style.cursor = isCrosshair ? 'crosshair' : '';
    }
    ctx.controller.core.config.crosshair = isCrosshair;
  }
}
