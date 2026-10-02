/* ====================================================
   UI Camadas - Calculador de Métricas Geométricas
   Cálculo geodésico de distâncias e áreas para feições
   ==================================================== */

import { FeicaoItem } from './tipos';

const RAIO_TERRA = 6378137; // Raio equatorial WGS84 em metros

/**
 * Calcula a distância em metros entre duas coordenadas [lat, lon] ou [lon, lat]
 */
export function calcularDistanciaPontos(p1: [number, number], p2: [number, number]): number {
  if (!p1 || !p2) return 0;
  // Suporta detecção [lat, lon] padrão Leaflet ou [lon, lat] GeoJSON
  const lat1 = (p1[0] * Math.PI) / 180;
  const lon1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[0] * Math.PI) / 180;
  const lon2 = (p2[1] * Math.PI) / 180;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return RAIO_TERRA * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calcula o comprimento total de uma linha de coordenadas em metros
 */
export function calcularComprimentoLinha(coords: unknown): number {
  if (!Array.isArray(coords) || coords.length < 2) return 0;

  // Suporte a MultiLineString: [ [ [lat,lon], ... ], [ ... ] ]
  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    return coords.reduce((acc, subLine) => acc + calcularComprimentoLinha(subLine), 0);
  }

  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    if (Array.isArray(p1) && Array.isArray(p2) && p1.length >= 2 && p2.length >= 2) {
      total += calcularDistanciaPontos([p1[0], p1[1]], [p2[0], p2[1]]);
    }
  }
  return total;
}

/**
 * Calcula a área de um anel poligonal em m² usando fórmula esférica
 */
export function calcularAreaPoligono(coords: unknown): number {
  if (!Array.isArray(coords) || coords.length === 0) return 0;

  // Suporte a MultiPolygon ou anéis [ [ [lat,lon], ... ] ]
  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    return coords.reduce((acc, subRing) => acc + calcularAreaPoligono(subRing), 0);
  }

  const len = coords.length;
  if (len < 3) return 0;

  let total = 0;
  for (let i = 0; i < len; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % len];
    const p3 = coords[(i + 2) % len];
    if (!Array.isArray(p1) || !Array.isArray(p2) || !Array.isArray(p3)) continue;

    const x1 = (p2[1] - p1[1]) * (Math.PI / 180);
    const y1 = (p2[0] - p1[0]) * (Math.PI / 180);
    const x2 = (p3[1] - p2[1]) * (Math.PI / 180);
    const y2 = (p3[0] - p2[0]) * (Math.PI / 180);

    total += x1 * y2 - y1 * x2;
  }

  const area = Math.abs((total * (RAIO_TERRA * RAIO_TERRA)) / 2);
  return isNaN(area) ? 0 : area;
}

/**
 * Formata métrica resumida para lista de feições selecionadas
 */
export function formatarMetricaFeicoes(feicoes: FeicaoItem[]): string {
  if (!feicoes || feicoes.length === 0) return '';

  const poligonos = feicoes.filter(
    (f) => f.type === 'Polygon' || f.type === 'MultiPolygon' || f.geometryType === 'Polygon'
  );
  if (poligonos.length > 0) {
    const areaM2 = poligonos.reduce(
      (acc, f) => acc + (calcularAreaPoligono(f.coordinates) || 0),
      0
    );
    if (areaM2 >= 10000) {
      const ha = (areaM2 / 10000).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
      });
      return `${ha} ha`;
    }
    return `${Math.round(areaM2).toLocaleString('pt-BR')} m²`;
  }

  const linhas = feicoes.filter(
    (f) => f.type === 'LineString' || f.type === 'MultiLineString' || f.geometryType === 'LineString'
  );
  if (linhas.length > 0) {
    const lenM = linhas.reduce(
      (acc, f) => acc + (calcularComprimentoLinha(f.coordinates) || 0),
      0
    );
    if (lenM >= 1000) {
      const km = (lenM / 1000).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
      });
      return `${km} km`;
    }
    return `${Math.round(lenM).toLocaleString('pt-BR')} m`;
  }

  return '';
}
