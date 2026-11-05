/**
 * Utilitários auxiliares para o ecossistema de Canvas e Mapas CAD
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

export interface CoordenadaUTM {
  este: number;
  norte: number;
  fuso: number;
  hemisferio: 'N' | 'S';
}

/**
 * Converte latitude e longitude (graus decimais WGS-84 / SIRGAS 2000) para coordenadas planas UTM.
 * Elipsoide GRS80 (a = 6378137.0, f = 1 / 298.257222101).
 * @param lat Latitude em graus decimais (-84 a 84)
 * @param lon Longitude em graus decimais (-180 a 180)
 * @param fusoForcado Fuso UTM opcional (1 a 60). Se omitido, calcula o fuso natural.
 */
export function latLonParaUtm(lat: number, lon: number, fusoForcado?: number): CoordenadaUTM | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 84 || Math.abs(lon) > 180) {
    return null;
  }

  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ePrime2 = e2 / (1 - e2);

  const fuso = Number.isInteger(fusoForcado) && fusoForcado! >= 1 && fusoForcado! <= 60
    ? fusoForcado!
    : Math.floor((lon + 180) / 6) + 1;

  const lon0 = (fuso * 6 - 183) * (Math.PI / 180);
  const phi = lat * (Math.PI / 180);
  const lambda = lon * (Math.PI / 180);

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = ePrime2 * cosPhi * cosPhi;
  const A = (lambda - lon0) * cosPhi;

  const e4 = e2 * e2;
  const e6 = e4 * e2;
  const M = a * (
    (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi
    - (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * phi)
    + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * phi)
    - (35 * e6 / 3072) * Math.sin(6 * phi)
  );

  const A2 = A * A;
  const A3 = A2 * A;
  const A4 = A2 * A2;
  const A5 = A4 * A;
  const A6 = A3 * A3;

  const este = k0 * N * (
    A
    + (1 - T + C) * A3 / 6
    + (5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * A5 / 120
  ) + 500000;

  let norte = k0 * (
    M + N * tanPhi * (
      A2 / 2
      + (5 - T + 9 * C + 4 * C * C) * A4 / 24
      + (61 - 58 * T + T * T + 600 * C - 330 * ePrime2) * A6 / 720
    )
  );

  const hemisferio: 'N' | 'S' = lat < 0 ? 'S' : 'N';
  if (lat < 0) {
    norte += 10000000;
  }

  return {
    este: Math.round(este * 1000) / 1000,
    norte: Math.round(norte * 1000) / 1000,
    fuso,
    hemisferio
  };
}

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
export const parseCoordenada = (rawLat: any, rawLon: any, opcoes?: { aceitarOrigem?: boolean }): CoordenadaGeo | null => {
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

  // Rejeita coordenadas (0, 0) exatas ("Null Island"), comuns como placeholder de erro (a menos que `aceitarOrigem`)
  if (lat === 0 && lon === 0 && !opcoes?.aceitarOrigem) {
    return null;
  }

  return { lat, lon };
};

import type { PopupAcaoCAD } from './types';

/**
 * Gera o HTML dos botões de ação customizados para o rodapé do popup.
 */
export const renderPopupAcoesHtml = (
  acoes: PopupAcaoCAD[] | undefined | null,
  elementoId: string | number
): string => {
  if (!acoes || !Array.isArray(acoes) || acoes.length === 0) return '';
  const btns = acoes.map(a => {
    const variante = a.variante || 'secondary';
    return `<button type="button" class="ui-popup-btn ui-popup-btn-${escapeHtml(variante)}" data-acao-id="${escapeHtml(a.id)}" data-elemento-id="${escapeHtml(String(elementoId))}">${escapeHtml(a.rotulo)}</button>`;
  }).join('');
  return `<div class="ui-popup-actions-footer">${btns}</div>`;
};

/**
 * Associa os eventos de clique nos botões de ação renderizados dentro do popup do Leaflet.
 */
export const bindPopupAcoesEvents = (
  popup: any,
  elemento: any,
  context: { onPopupAcao?: (acaoId: string, elementoId: string | number, elemento: any) => void },
  sourceLayer?: any
): void => {
  const popupEl = popup?.getElement ? popup.getElement() : null;
  if (!popupEl) return;
  const btns = popupEl.querySelectorAll('.ui-popup-btn');
  btns.forEach((btn: Element) => {
    (btn as HTMLElement).onclick = (evt: MouseEvent) => {
      evt.preventDefault();
      evt.stopPropagation();
      const acaoId = (btn as HTMLElement).getAttribute('data-acao-id');
      const elementoId = (btn as HTMLElement).getAttribute('data-elemento-id') ?? elemento?.id;
      if (acaoId && elementoId !== undefined && elementoId !== null) {
        if (context.onPopupAcao) {
          context.onPopupAcao(acaoId, elementoId, elemento);
        }
        if (sourceLayer && typeof sourceLayer.closePopup === 'function') {
          sourceLayer.closePopup();
        } else if (popup._map && typeof popup._map.closePopup === 'function') {
          popup._map.closePopup();
        }
      }
    };
  });
};

/**
 * Agrupa coleção de pontos geométricos por uma chave de grupo genérica.
 * Prioridade de resolução da chave:
 * 1. ponto[chaveGrupo] (se chaveGrupo for fornecida explicitamente)
 * 2. ponto.grupoId
 * 3. ponto.grupoKey
 * 4. ponto.matricula_id (como `mat_${matricula_id}`)
 * 5. ponto.planilha_origem
 * 6. 'padrao'
 */
export const agruparPontosPorChave = (
  pontos: any[],
  chaveGrupo?: string
): Record<string, any[]> => {
  const grupos: Record<string, any[]> = {};

  pontos.forEach(p => {
    let key: any;

    if (chaveGrupo && p[chaveGrupo] !== undefined && p[chaveGrupo] !== null) {
      key = p[chaveGrupo];
    } else {
      key = p.grupoId ?? p.grupoKey;
      if (key === undefined || key === null) {
        if (p.matricula_id !== undefined && p.matricula_id !== null) {
          key = `mat_${p.matricula_id}`;
        } else if (p.planilha_origem) {
          key = p.planilha_origem;
        } else {
          key = 'padrao';
        }
      }
    }

    const strKey = String(key);
    if (!grupos[strKey]) {
      grupos[strKey] = [];
    }
    grupos[strKey].push(p);
  });

  return grupos;
};

/**
 * Ordena pontos de um grupo por sua propriedade de sequência (ordem, indice, index, seq, ordem_caminhamento, id).
 */
export const ordenarPontosPorSequencia = (pontos: any[]): any[] => {
  return [...pontos].sort((a, b) => {
    const getSeq = (p: any): number => {
      const v = p.ordem ?? p.indice ?? p.index ?? p.seq ?? p.ordem_caminhamento ?? p.id;
      const num = Number(v);
      return isNaN(num) ? 999999 : num;
    };
    return getSeq(a) - getSeq(b);
  });
};

/**
 * Extrai o centroide geográfico (Lat, Lon) a partir de uma representação WKT (ex: POLYGON, MULTIPOLYGON, POINT, LINESTRING).
 */
export const extrairCentroDeWkt = (wkt: string | null | undefined): CoordenadaGeo | null => {
  if (!wkt || typeof wkt !== 'string') return null;
  const regex = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  let totalLat = 0;
  let totalLon = 0;
  let count = 0;

  while ((match = regex.exec(wkt)) !== null) {
    const val1 = parseFloat(match[1]);
    const val2 = parseFloat(match[2]);
    if (!isNaN(val1) && !isNaN(val2)) {
      // No padrão WKT tradicional a ordem é X Y (Lon Lat).
      // Testamos parseCoordenada(lat=val2, lon=val1) primeiro, depois (lat=val1, lon=val2)
      const coord = parseCoordenada(val2, val1) || parseCoordenada(val1, val2);
      if (coord) {
        totalLat += coord.lat;
        totalLon += coord.lon;
        count++;
      }
    }
  }

  if (count > 0) {
    return {
      lat: totalLat / count,
      lon: totalLon / count
    };
  }
  return null;
};


