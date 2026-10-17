/**
 * Camadas base (tiles) disponíveis no <ui-mapa>.
 * Responsabilidade única: catálogo de provedores de tiles; não conhece o elemento.
 */
import type { TileLayer } from 'leaflet';
import type { LeafletModulo } from './tipos';

export interface Basemap {
  nome: string;
  layer: () => TileLayer;
}

export function obterBasemaps(L: LeafletModulo): Record<string, Basemap> {
  return {
    osm: {
      nome: 'OpenStreetMap',
      layer: () => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      })
    },
    satelite: {
      nome: 'Satélite (Esri)',
      layer: () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      })
    },
    topografia: {
      nome: 'Topografia',
      layer: () => L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
      })
    },
    ruas: {
      nome: 'Ruas (Esri)',
      layer: () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
      })
    }
  };
}
