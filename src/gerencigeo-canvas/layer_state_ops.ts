import L from 'leaflet';
import type { CanvasLayerDef, CanvasLayerState, CanvasRenderContext } from './types';
import { LayerRendererFactory } from './layer_renderer_factory';

export function exportarEstadoCamadas(layers: CanvasLayerDef[]): CanvasLayerState[] {
  return layers.map(l => ({
    id: l.id,
    visivel: l.visivel,
    opacidade: l.opacidade,
    zIndex: l.zIndex,
    bloqueada: l.bloqueada,
    estilo: { ...l.estilo }
  }));
}

export function importarEstadoCamadas(layers: CanvasLayerDef[], state: CanvasLayerState[]): void {
  if (!state || !Array.isArray(state)) return;

  state.forEach(saved => {
    const layer = layers.find(l => l.id === saved.id);
    if (layer) {
      if (saved.visivel !== undefined) layer.visivel = saved.visivel;
      if (saved.opacidade !== undefined) layer.opacidade = saved.opacidade;
      if (saved.zIndex !== undefined) layer.zIndex = saved.zIndex;
      if (saved.bloqueada !== undefined) layer.bloqueada = saved.bloqueada;
      if (saved.estilo) layer.estilo = { ...layer.estilo, ...saved.estilo };
    }
  });
}

export function limparDadosCamadas(
  layers: CanvasLayerDef[],
  layerInstances: Map<string, L.Layer | L.LayerGroup>,
  context: CanvasRenderContext | null,
  idsCamadas?: string[]
): void {
  const targetLayers = idsCamadas && idsCamadas.length > 0
    ? layers.filter(l => idsCamadas.includes(l.id))
    : layers.filter(l => typeof l.tipo === 'string' && l.tipo.startsWith('vetorial'));

  targetLayers.forEach(layer => {
    layer.dados = null;
    const instance = layerInstances.get(layer.id);
    if (instance && (instance as any).clearLayers) {
      (instance as any).clearLayers();
    }
  });

  if (!idsCamadas || idsCamadas.length === 0) {
    if (context) {
      context.pontos = [];
      context.segmentos = [];
      context.confrontantes = [];
    }
  } else {
    if (context) {
      if (idsCamadas.includes('vertices')) context.pontos = [];
      if (idsCamadas.includes('linhas') || idsCamadas.includes('perimetro') || idsCamadas.includes('polilinha')) context.segmentos = [];
      if (idsCamadas.includes('poligonos') || idsCamadas.includes('vizinhos')) context.confrontantes = [];
    }
  }
}

export function aplicarDadosCamada(
  layer: CanvasLayerDef,
  dados: any,
  map: L.Map | null,
  context: CanvasRenderContext | null,
  layerInstances: Map<string, L.Layer | L.LayerGroup>
): void {
  layer.dados = dados;
  const instance = layerInstances.get(layer.id);

  if (instance && map && context) {
    const renderer = LayerRendererFactory.get(layer.tipo);
    if (renderer) {
      renderer.update(layer, instance, { dados }, context, map);
    }
  } else if (map && context && layer.visivel) {
    const renderer = LayerRendererFactory.get(layer.tipo);
    if (renderer) {
      const newInst = renderer.render(layer, map, context);
      if (newInst) {
        newInst.addTo(map);
        layerInstances.set(layer.id, newInst);
      }
    }
  }
}
