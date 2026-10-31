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
  if (
    !Array.isArray(p1) ||
    !Array.isArray(p2) ||
    p1.length < 2 ||
    p2.length < 2 ||
    !Number.isFinite(p1[0]) ||
    !Number.isFinite(p1[1]) ||
    !Number.isFinite(p2[0]) ||
    !Number.isFinite(p2[1])
  ) {
    return 0;
  }
  // Suporta detecção [lat, lon] padrão Leaflet ou [lon, lat] GeoJSON
  const lat1 = (p1[0] * Math.PI) / 180;
  const lon1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[0] * Math.PI) / 180;
  const lon2 = (p2[1] * Math.PI) / 180;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a = Math.min(
    1,
    Math.max(
      0,
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    )
  );

  const dist = RAIO_TERRA * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number.isFinite(dist) ? dist : 0;
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
 * Calcula a área de um único anel fechado de coordenadas em m² usando a Fórmula de Gauss (Shoelace)
 * com projeção geodésica local na esfera WGS84.
 */
export function calcularAreaAnelSimples(coords: unknown): number {
  if (!Array.isArray(coords)) return 0;

  const validos: [number, number][] = [];
  for (let i = 0; i < coords.length; i++) {
    const p = coords[i];
    if (Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
      validos.push([p[0], p[1]]);
    }
  }

  // Remove ponto final duplicado de fechamento, se existir, para uma média de latitude limpa
  if (
    validos.length > 3 &&
    validos[0][0] === validos[validos.length - 1][0] &&
    validos[0][1] === validos[validos.length - 1][1]
  ) {
    validos.pop();
  }

  const len = validos.length;
  if (len < 3) return 0;

  let somaLat = 0;
  for (let i = 0; i < len; i++) {
    somaLat += validos[i][0];
  }
  const latMediaRad = ((somaLat / len) * Math.PI) / 180;
  const cosLat = Math.cos(latMediaRad);
  const radPorGrau = Math.PI / 180;
  const lat0 = validos[0][0];
  const lon0 = validos[0][1];

  let somaGauss = 0;
  for (let i = 0; i < len; i++) {
    const p1 = validos[i];
    const p2 = validos[(i + 1) % len];

    const x1 = (p1[1] - lon0) * radPorGrau * RAIO_TERRA * cosLat;
    const y1 = (p1[0] - lat0) * radPorGrau * RAIO_TERRA;
    const x2 = (p2[1] - lon0) * radPorGrau * RAIO_TERRA * cosLat;
    const y2 = (p2[0] - lat0) * radPorGrau * RAIO_TERRA;

    somaGauss += x1 * y2 - x2 * y1;
  }

  const area = Math.abs(somaGauss) / 2;
  return Number.isFinite(area) ? area : 0;
}

/**
 * Calcula a área de um polígono em m² com suporte a:
 * - Anel simples: [ [lat,lon], [lat,lon], ... ]
 * - Polygon GeoJSON com furos (anel exterior menos furos): [ [exterior], [furo1], [furo2] ]
 * - MultiPolygon GeoJSON: [ [ [exterior], [furo] ], [ [exterior] ] ]
 */
export function calcularAreaPoligono(coords: unknown): number {
  if (!Array.isArray(coords) || coords.length === 0) return 0;

  // 1. Caso seja anel simples: [ [lat,lon], ... ] onde coords[0] é um par [lat,lon]
  if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
    return calcularAreaAnelSimples(coords);
  }

  // 2. Se coords[0][0] for um array, podemos ter:
  //    - Polygon: coords[0] é um anel [ [lat,lon], ... ], portanto coords[0][0] é [lat,lon]
  //    - MultiPolygon: coords[0] é um Polygon [ [ [lat,lon], ... ] ]
  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    // MultiPolygon detectado: coords[0][0][0] é um par de coordenadas (array)
    if (Array.isArray(coords[0][0][0])) {
      return coords.reduce((acc, subPoligono) => acc + calcularAreaPoligono(subPoligono), 0);
    }

    // Polygon padrão com anéis: [anelExterior, ...furos]
    // O primeiro anel (índice 0) é o anel exterior; os demais (índices 1..n) são furos/holes
    const areaExterior = calcularAreaAnelSimples(coords[0]);
    let areaFuros = 0;
    for (let i = 1; i < coords.length; i++) {
      areaFuros += calcularAreaAnelSimples(coords[i]);
    }

    return Math.max(0, areaExterior - areaFuros);
  }

  return 0;
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
