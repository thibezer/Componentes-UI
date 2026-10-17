/**
 * Tipos "emprestados" do Leaflet e do contexto do mapa usados pelo <ui-canvas-cad>.
 * Responsabilidade única: descrever, em um só lugar, as formas dinâmicas que o código antes acessava com `as any`.
 */

/** Contêiner de mapa do Leaflet: o Leaflet marca o elemento com `_leaflet_id` ao inicializar. */
export type ContainerLeaflet = HTMLElement & { _leaflet_id?: number };

export interface PontoPixelEvento {
  x?: number;
  y?: number;
}

export interface LatLngEvento {
  lat?: number;
  lng?: number;
  /** Alguns emissores usam `lon`. */
  lon?: number;
}

/** Evento de mapa/DOM como chega ao canvas: pode ser do Leaflet (com `originalEvent`) ou um MouseEvent cru. */
export interface EventoMapaCad {
  originalEvent?: EventoMapaCad;
  target?: EventTarget | null;
  composedPath?: () => EventTarget[];
  clientX?: number;
  clientY?: number;
  containerPoint?: PontoPixelEvento;
  layerPoint?: PontoPixelEvento;
  latlng?: LatLngEvento;
}

/** Elemento com coordenadas em qualquer das grafias aceitas na entrada. */
export interface ElementoComCoordenadas {
  lat?: number | string;
  lon?: number | string;
  lng?: number | string;
  latitude?: number | string;
  longitude?: number | string;
}
