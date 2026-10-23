/**
 * Tipos "emprestados" do Leaflet e do contexto do mapa usados pelo <ui-canvas-cad>.
 * Responsabilidade única: descrever, em um só lugar, as formas dinâmicas que o código antes acessava com `as any`.
 */

import type { JuncaoTraco, TerminacaoTraco, TipoLinha } from '../../gerencigeo-canvas/motor/tipos-linha';

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

/**
 * Linha padrão do <ui-canvas-cad> (`definirLinhaPadrao` e atributos `linha-*`): o traço das feições desenhadas daqui
 * para frente. Cada opção vira um campo do estilo de desenho (`EstiloFeicao`).
 */
export interface OpcoesLinhaPadrao {
  /** Cor do traço (hex, rgb/hsl ou nome) → `corTraco`. */
  cor?: string;
  /** Espessura em px (0 a 100) → `espessuraTraco`. */
  espessura?: number;
  /** Tipo de linha CAD → `tipoLinha`. */
  tipo?: TipoLinha;
  /** Escala do tipo de linha (LTSCALE) → `escalaTipoLinha`. */
  escala?: number;
  /** Tracejado explícito ("8 4 2 4"), vence `tipo` → `dashArray`. */
  tracejado?: string;
  /** Deslocamento do tracejado em px → `deslocamentoTracejado`. */
  deslocamento?: number;
  /** Opacidade do traço, 0 a 1 → `opacidadeTraco`. */
  opacidade?: number;
  /** Pontas do traço → `terminacaoTraco`. */
  terminacao?: TerminacaoTraco;
  /** Cantos do traço → `juncaoTraco`. */
  juncao?: JuncaoTraco;
}
