/**
 * Leitura segura de atributos do <ui-mapa>, <ui-mapa-marcador> e <ui-mapa-linha>.
 * Responsabilidade única: funções puras que transformam texto de atributo em valores válidos, com padrão
 * quando a entrada é nula, malformada ou fora do domínio. Nenhuma toca no DOM.
 */
import type { VistaMapa } from './tipos';

export const VISTA_PADRAO: VistaMapa = { lat: -23.55052, lng: -46.633308, zoom: 13 };
export const COR_MARCADOR_PADRAO = '#00f5a0';
export const COR_LINHA_PADRAO = '#3388ff';
export const ESPESSURA_PADRAO = 3;

const finito = (n: number): boolean => Number.isFinite(n);

/** Lê lat/lng/zoom; cada campo inválido (ou fora de -90..90, -180..180, 0..22) cai no padrão. */
export function lerVista(lat: string | null, lng: string | null, zoom: string | null): VistaMapa {
  const la = parseFloat(lat ?? '');
  const lo = parseFloat(lng ?? '');
  const z = parseInt(zoom ?? '', 10);
  return {
    lat: finito(la) && Math.abs(la) <= 90 ? la : VISTA_PADRAO.lat,
    lng: finito(lo) && Math.abs(lo) <= 180 ? lo : VISTA_PADRAO.lng,
    zoom: finito(z) && z >= 0 && z <= 22 ? z : VISTA_PADRAO.zoom
  };
}

export function lerInteiroPositivo(valor: string | null, padrao: number): number {
  const n = parseInt(valor ?? '', 10);
  return finito(n) && n > 0 ? n : padrao;
}

const COR_HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COR_FUNCAO = /^(?:rgb|rgba|hsl|hsla)\(\s*[\d.,%\s/deg-]+\)$/i;
const COR_NOME = /^[a-z]{3,30}$/i;

/** Aceita só cores CSS conhecidas (hex, rgb/hsl, nome); qualquer outra coisa vira `padrao`. Impede injeção em estilo/atributo. */
export function corSegura(cor: string | null | undefined, padrao: string): string {
  const v = (cor ?? '').trim();
  return COR_HEX.test(v) || COR_FUNCAO.test(v) || COR_NOME.test(v) ? v : padrao;
}

/** Lista de camadas base pedidas, filtrada pelas conhecidas; vazia → `['osm']`. */
export function lerCamadas(texto: string | null, conhecidas: string[]): string[] {
  const pedidas = (texto ?? '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => conhecidas.includes(s));
  return pedidas.length > 0 ? pedidas : ['osm'];
}

/** Interpreta `pontos` (JSON `[[lat, lng], ...]`); descarta pares inválidos e devolve `[]` se o JSON não for um array. */
export function lerPontos(texto: string | null): Array<[number, number]> {
  if (!texto) return [];
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch (erro) {
    console.error('Formato inválido para atributo pontos no <ui-mapa-linha>. Deve ser um JSON array, ex: "[[lat, lng], ...]"', erro);
    return [];
  }
  if (!Array.isArray(bruto)) return [];
  const pontos: Array<[number, number]> = [];
  for (const item of bruto) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const [lat, lng] = item as unknown[];
    if (typeof lat === 'number' && typeof lng === 'number' && finito(lat) && finito(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      pontos.push([lat, lng]);
    }
  }
  return pontos;
}
