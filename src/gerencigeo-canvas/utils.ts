/**
 * Utilitários auxiliares para o ecossistema Canvas/Mapa do GerenciGeo
 */

export const escapeHtml = (unsafe: string | null | undefined): string => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const formatUTM = (val: number | null | undefined, casas = 3): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
};

export interface CoordenadaGeo {
  lat: number;
  lon: number;
}

/**
 * Converte e valida coordenadas geográficas (Lat/Lon) em graus decimais WGS-84.
 * - Trata números e strings no formato brasileiro (vírgula como separador decimal: "-23,7661")
 * - Filtra valores inválidos, NaN, Null Island (0, 0)
 * - Identifica e rejeita coordenadas planas métricas (UTM/SIRGAS2000 acima de 90°/180°)
 */
export const parseCoordenada = (rawLat: any, rawLon: any): CoordenadaGeo | null => {
  if (rawLat === null || rawLat === undefined || rawLon === null || rawLon === undefined) {
    return null;
  }

  const cleanNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const sanitized = val.trim().replace(',', '.');
      return parseFloat(sanitized);
    }
    return NaN;
  };

  const lat = cleanNum(rawLat);
  const lon = cleanNum(rawLon);

  if (isNaN(lat) || isNaN(lon)) {
    return null;
  }

  // Detecta coordenadas métricas UTM (ex: Norte ~7.000.000m, Este ~300.000m)
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    console.warn(`[gerencigeo-canvas] Coordenada fora do limite geográfico WGS-84 (Lat: ${lat}, Lon: ${lon}). Parece ser projeção UTM plana.`);
    return null;
  }

  // Rejeita coordenadas (0, 0) exatas ("Null Island"), comuns como placeholder de erro
  if (lat === 0 && lon === 0) {
    return null;
  }

  return { lat, lon };
};

