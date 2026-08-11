import type L from 'leaflet';
import type { CanvasLayerDef, CanvasRenderContext } from './types';

export interface ILayerRenderer {
  render(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext): L.Layer | L.LayerGroup | null;
  update(layerDef: CanvasLayerDef, layerInstance: L.Layer | L.LayerGroup, changes: Partial<CanvasLayerDef>, context: CanvasRenderContext, map: L.Map): void;
  destroy(layerInstance: L.Layer | L.LayerGroup, map: L.Map): void;
}

export class LayerRendererFactory {
  private static renderers = new Map<string, ILayerRenderer>();

  public static register(tipo: string, renderer: ILayerRenderer): void {
    this.renderers.set(tipo.toLowerCase(), renderer);
  }

  public static get(tipo: string): ILayerRenderer | undefined {
    return this.renderers.get(tipo.toLowerCase());
  }

  public static has(tipo: string): boolean {
    return this.renderers.has(tipo.toLowerCase());
  }

  public static getRegisteredTypes(): string[] {
    return Array.from(this.renderers.keys());
  }
}
