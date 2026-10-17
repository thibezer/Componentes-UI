/**
 * Tipos compartilhados do <ui-mapa> e de seus filhos.
 * Responsabilidade única: descrever o módulo do Leaflet e a vista padrão sem recorrer a `any`.
 */
import type * as Leaflet from 'leaflet';

/** O módulo do Leaflet (o `L` global). */
export type LeafletModulo = typeof Leaflet;

export interface VistaMapa {
  lat: number;
  lng: number;
  zoom: number;
}

export type FormatoMarcador = 'pin' | 'circle';
