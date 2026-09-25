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


