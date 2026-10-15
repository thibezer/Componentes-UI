import L from 'leaflet';
import type { CanvasLayerDef } from './types';
import { nomeSubPane, ORDEM_GEOMETRIA, type TipoGeometriaPane } from './layer_pane_ops';

/*
 * Hit-test central dos canvases vetoriais.
 *
 * O Leaflet cria um <canvas> do tamanho do mapa por pane. Se cada canvas recebesse o clique, só o
 * da camada do topo responderia e as de baixo ficariam impossíveis de selecionar. Os canvases ficam
 * com pointer-events: none e o clique é resolvido aqui, sobre todas as camadas:
 *  - tolerância em pixels (linhas e pontos são finos demais para exigir pixel exato);
 *  - prioridade ponto/texto > linha > área;
 *  - pontos e linhas desempatam pela camada do topo; áreas pela menor (a menor fica por cima);
 *  - cliques repetidos no mesmo lugar alternam entre as feições empilhadas.
 */

const ID_ESTILO = 'ui-canvas-hit-test-estilo';

/** Tolerância (px) somada à espessura do traço. */
export const TOLERANCIA_LINHA_PX = 6;
export const TOLERANCIA_PONTO_PX = 4;
/** Distância (px) máxima entre dois cliques para contarem como "o mesmo lugar". */
const REPETICAO_PX = 4;

const PRIORIDADE: Record<TipoGeometriaPane, number> = { poligono: 1, linha: 2, ponto: 3, texto: 3 };

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
  options: { interactive?: boolean; weight?: number; stroke?: boolean; fill?: boolean };
  _containsPoint?: (p: L.Point) => boolean;
  _parts?: L.Point[][];
  _point?: L.Point;
  _radius?: number;
  _radiusY?: number;
  _pxBounds?: L.Bounds;
  _map?: L.Map;
};

interface RendererInterno {
  _drawFirst?: { layer: CamadaCanvas; next?: RendererInterno['_drawFirst'] };
}

/** Feição candidata sob o cursor, já ordenada por prioridade. */
export interface CandidatoHit {
  camada: CanvasLayerDef;
  tipo: TipoGeometriaPane;
  alvo: L.Layer;
  /** Distância (px) ao traço/centro; 0 quando o ponto cai dentro de uma área. */
  distancia: number;
  /** Área do envelope em px²; só usada para desempatar áreas. */
  area: number;
}

function tolerarTraco(layer: CamadaCanvas, base: number): number {
  return base + (layer.options?.stroke === false ? 0 : (layer.options?.weight ?? 0) / 2);
}

function distanciaAoTraco(partes: L.Point[][], ponto: L.Point, fechado: boolean): number {
  let menor = Infinity;
  for (const parte of partes) {
    for (let i = 1; i < parte.length; i++) {
      menor = Math.min(menor, L.LineUtil.pointToSegmentDistance(ponto, parte[i - 1], parte[i]));
    }
    if (fechado && parte.length > 2) {
      menor = Math.min(menor, L.LineUtil.pointToSegmentDistance(ponto, parte[parte.length - 1], parte[0]));
    }
  }
  return menor;
}

function areaEnvelope(layer: CamadaCanvas): number {
  const b = layer._pxBounds;
  return b ? (b.max!.x - b.min!.x) * (b.max!.y - b.min!.y) : 0;
}

/** Distância do clique à feição, ou `null` se não acerta. Usa a geometria do Leaflet quando há. */
function testarFeicao(layer: CamadaCanvas, ponto: L.Point, tipo: TipoGeometriaPane): number | null {
  if (!layer.options?.interactive) return null;

  // Círculos e marcadores circulares
  if (layer._point && layer._radius !== undefined) {
    const raioX = layer._radius;
    const raioY = layer._radiusY ?? layer._radius;
    const d = layer._point.distanceTo(ponto);
    const raio = (raioX + raioY) / 2;
    const tol = tipo === 'ponto' ? TOLERANCIA_PONTO_PX : tolerarTraco(layer, TOLERANCIA_LINHA_PX);
    if (layer.options.fill !== false && tipo === 'poligono') return d <= raio + 1 ? 0 : null;
    if (tipo === 'ponto') return d <= raio + tol ? d : null;
    return Math.abs(d - raio) <= tol ? Math.abs(d - raio) : null;
  }

  // Linhas e polígonos
  if (layer._parts) {
    const ehPoligono = layer instanceof L.Polygon;
    const dist = distanciaAoTraco(layer._parts, ponto, ehPoligono);
    if (tipo === 'linha') {
      return dist <= tolerarTraco(layer, TOLERANCIA_LINHA_PX) ? dist : null;
    }
    if (ehPoligono && layer._containsPoint?.(ponto)) return 0;
    return dist <= tolerarTraco(layer, TOLERANCIA_LINHA_PX) ? dist : null;
  }

  // Camadas sem geometria exposta: confia no teste nativo
  return layer._containsPoint?.(ponto) ? 0 : null;
}

function camadasDoRenderer(renderer: RendererInterno): CamadaCanvas[] {
  const lista: CamadaCanvas[] = [];
  for (let ordem = renderer._drawFirst; ordem; ordem = ordem.next) lista.push(ordem.layer);
  return lista;
}

/**
 * Todas as feições sob o ponto, na ordem em que um clique deve escolhê-las
 * (a primeira é a que o clique simples seleciona). Serve também para hover, menu de contexto e conta-gotas.
 */
export function consultarFeicoesNoPonto(
  map: L.Map,
  camadas: CanvasLayerDef[],
  ponto: L.Point
): CandidatoHit[] {
  const renderers = (map as unknown as { _paneRenderers?: Record<string, RendererInterno> })._paneRenderers;
  if (!renderers) return [];

  const ordenadas = camadas
    .filter((c) => c.visivel && c.interativo && !c.bloqueada)
    .sort((a, b) => b.zIndex - a.zIndex);

  const candidatos: CandidatoHit[] = [];
  for (const def of ordenadas) {
    for (const tipo of ORDEM_GEOMETRIA) {
      const renderer = renderers[nomeSubPane(def.id, tipo)];
      if (!renderer) continue;
      // a última desenhada fica por cima, como no hit-test nativo do Leaflet
      for (const layer of camadasDoRenderer(renderer).reverse()) {
        const distancia = testarFeicao(layer, ponto, tipo);
        if (distancia !== null) {
          candidatos.push({ camada: def, tipo, alvo: layer, distancia, area: areaEnvelope(layer) });
        }
      }
    }
  }

  // sort estável: dentro do mesmo empate preserva camada do topo > desenhada por último
  return candidatos.sort((a, b) => {
    if (PRIORIDADE[a.tipo] !== PRIORIDADE[b.tipo]) return PRIORIDADE[b.tipo] - PRIORIDADE[a.tipo];
    if (a.camada.zIndex !== b.camada.zIndex) return b.camada.zIndex - a.camada.zIndex;
    if (a.tipo === 'poligono' && a.area !== b.area) return a.area - b.area;
    return 0;
  });
}

/** Memória do último clique: se o próximo cai no mesmo lugar e no mesmo empilhamento, avança. */
const ultimoClique = new WeakMap<L.Map, { x: number; y: number; ids: number[]; indice: number }>();

function escolherComAlternancia(map: L.Map, ponto: L.Point, candidatos: CandidatoHit[]): CandidatoHit {
  const ids = candidatos.map((c) => L.Util.stamp(c.alvo));
  const anterior = ultimoClique.get(map);
  let indice = 0;
  if (
    anterior &&
    Math.hypot(anterior.x - ponto.x, anterior.y - ponto.y) <= REPETICAO_PX &&
    anterior.ids.length === ids.length &&
    anterior.ids.every((id, i) => id === ids[i])
  ) {
    indice = (anterior.indice + 1) % candidatos.length;
  }
  ultimoClique.set(map, { x: ponto.x, y: ponto.y, ids, indice });
  return candidatos[indice];
}

function escolhidaPeloUltimoClique(map: L.Map, ponto: L.Point, candidatos: CandidatoHit[]): CandidatoHit {
  const anterior = ultimoClique.get(map);
  const mesmoLugar = !!anterior && Math.hypot(anterior.x - ponto.x, anterior.y - ponto.y) <= REPETICAO_PX
    && anterior.ids.length === candidatos.length;
  return candidatos[mesmoLugar ? anterior!.indice : 0] ?? candidatos[0];
}

/**
 * Resolve o clique entre todas as camadas, da mais alta para a mais baixa.
 * Dispara o evento só na feição vencedora e devolve `true` se houve acerto.
 */
export function resolverCliqueCentral(
  map: L.Map,
  camadas: CanvasLayerDef[],
  e: MouseEvent
): boolean {
  const ponto = map.mouseEventToLayerPoint(e);
  const candidatos = consultarFeicoesNoPonto(map, camadas, ponto);
  if (candidatos.length === 0) {
    ultimoClique.delete(map);
    return false;
  }

  // duplo clique: fica com a feição escolhida pelo clique anterior (alternar de novo trocaria a feição no meio do gesto)
  const alvo = e.type === 'dblclick'
    ? escolhidaPeloUltimoClique(map, ponto, candidatos).alvo
    : escolherComAlternancia(map, ponto, candidatos).alvo;
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

/** Feição do topo sob o evento (sem alternar): hover, menu de contexto, conta-gotas. */
export function feicaoNoTopo(map: L.Map, camadas: CanvasLayerDef[], e: MouseEvent): CandidatoHit | null {
  return consultarFeicoesNoPonto(map, camadas, map.mouseEventToLayerPoint(e))[0] ?? null;
}
