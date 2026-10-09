import L from 'leaflet';
import type { CanvasLayerDef } from './types';
import { nomeSubPane, ORDEM_GEOMETRIA } from './layer_pane_ops';

/*
 * Hit-test central dos canvases vetoriais.
 *
 * O Leaflet cria um <canvas> do tamanho do mapa por pane. Se cada canvas recebesse o clique, só o
 * da camada do topo responderia e as de baixo ficariam impossíveis de selecionar. Os canvases ficam
 * com pointer-events: none e o clique é resolvido aqui, percorrendo as camadas por zIndex decrescente.
 */

const ID_ESTILO = 'ui-canvas-hit-test-estilo';

/** Desliga o pointer-events dos canvases de pane (markers DOM e popups não são afetados). */
export function garantirCanvasSemEventos(container: HTMLElement): void {
  const raiz = container.getRootNode() as Document | ShadowRoot;
  const alvo: ParentNode = raiz instanceof ShadowRoot ? raiz : document.head;
  if (alvo.querySelector?.(`#${ID_ESTILO}`)) return;
  const estilo = document.createElement('style');
  estilo.id = ID_ESTILO;
  estilo.textContent = '.leaflet-pane > canvas { pointer-events: none !important; }';
  alvo.appendChild(estilo);
}

type CamadaCanvas = L.Layer & {
  options: { interactive?: boolean };
  _containsPoint?: (p: L.Point) => boolean;
  _map?: L.Map;
};

interface RendererInterno {
  _drawFirst?: { layer: CamadaCanvas; next?: RendererInterno['_drawFirst'] };
}

function camadaNoPonto(renderer: RendererInterno, ponto: L.Point): CamadaCanvas | null {
  let achada: CamadaCanvas | null = null;
  for (let ordem = renderer._drawFirst; ordem; ordem = ordem.next) {
    const camada = ordem.layer;
    // a última desenhada fica por cima, como no hit-test nativo do Leaflet
    if (camada.options?.interactive && camada._containsPoint?.(ponto)) achada = camada;
  }
  return achada;
}

/**
 * Resolve o clique entre todas as camadas interativas, da mais alta para a mais baixa.
 * Dispara o evento só na feição vencedora e devolve `true` se houve acerto.
 */
export function resolverCliqueCentral(
  map: L.Map,
  camadas: CanvasLayerDef[],
  e: MouseEvent
): boolean {
  const renderers = (map as unknown as { _paneRenderers?: Record<string, RendererInterno> })._paneRenderers;
  if (!renderers) return false;

  const ponto = map.mouseEventToLayerPoint(e);
  const ordenadas = camadas
    .filter((c) => c.visivel && c.interativo && !c.bloqueada)
    .sort((a, b) => b.zIndex - a.zIndex);

  // dentro de cada camada, o sub-pane de geometria mais alta (texto > ponto > linha > polígono) vence
  const subPanes = [...ORDEM_GEOMETRIA].reverse();
  for (const def of ordenadas) {
    let alvo: CamadaCanvas | null = null;
    for (const tipo of subPanes) {
      const renderer = renderers[nomeSubPane(def.id, tipo)];
      alvo = renderer ? camadaNoPonto(renderer, ponto) : null;
      if (alvo) break;
    }
    if (!alvo) continue;

    alvo.fire(
      e.type,
      {
        originalEvent: e,
        latlng: map.mouseEventToLatLng(e),
        layerPoint: ponto,
        containerPoint: map.mouseEventToContainerPoint(e)
      },
      true
    );
    return true;
  }
  return false;
}
