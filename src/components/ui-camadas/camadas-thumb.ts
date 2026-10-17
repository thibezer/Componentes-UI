/* ====================================================
   UI Camadas - Miniaturas de geometria
   Responsabilidade única: gerar o SVG (string segura) da miniatura de uma feição/camada, a partir da
   geometria real (simplificada) ou de um ícone genérico por tipo. Função pura.
   ==================================================== */

import { sanitizarCorCss } from './camadas-utils';

type ParLatLon = [number, number];

const THUMB_MAX_PONTOS = 64;

function ehPar(v: unknown): v is ParLatLon {
  return Array.isArray(v) && v.length >= 2 && Number.isFinite(v[0]) && Number.isFinite(v[1]);
}

/** Achata coordenadas (anel, polígono, multi*) em uma lista de partes, cada uma uma lista de pares. */
function extrairPartes(coords: unknown): ParLatLon[][] {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  if (ehPar(coords[0])) return [(coords as unknown[]).filter(ehPar)];
  return coords.flatMap(extrairPartes);
}

function decimar(pts: ParLatLon[]): ParLatLon[] {
  if (pts.length <= THUMB_MAX_PONTOS) return pts;
  const passo = pts.length / THUMB_MAX_PONTOS;
  const saida: ParLatLon[] = [];
  for (let i = 0; i < THUMB_MAX_PONTOS; i++) saida.push(pts[Math.floor(i * passo)]);
  saida.push(pts[pts.length - 1]);
  return saida;
}

/**
 * Miniatura fiel à geometria real (coordenadas [lat, lon]), enquadrada e com proporção preservada.
 * Retorna string vazia quando não há coordenadas utilizáveis (usa-se então o ícone genérico).
 */
function renderizarThumbReal(tipo: string, coords: unknown, cor: string): string {
  const partes = extrairPartes(coords).filter((p) => p.length > 0);
  if (partes.length === 0) return '';

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const parte of partes) {
    for (const [lat, lon] of parte) {
      if (lon < minX) minX = lon;
      if (lon > maxX) maxX = lon;
      if (-lat < minY) minY = -lat;
      if (-lat > maxY) maxY = -lat;
    }
  }

  const tam = 16;
  const margem = 2;
  const util = tam - margem * 2;
  const larg = maxX - minX;
  const alt = maxY - minY;
  const maior = Math.max(larg, alt);
  const escala = maior > 0 ? util / maior : 0;
  const offX = margem + (util - larg * escala) / 2;
  const offY = margem + (util - alt * escala) / 2;
  const f = (n: number) => Math.round(n * 100) / 100;
  const proj = ([lat, lon]: ParLatLon) => `${f(offX + (lon - minX) * escala)},${f(offY + (-lat - minY) * escala)}`;

  const ehPoligono = tipo === 'polygon' || tipo === 'multipolygon';
  const ehLinha = tipo === 'linestring' || tipo === 'multilinestring';
  const svg = (corpo: string) =>
    `<svg viewBox="0 0 ${tam} ${tam}" width="100%" height="100%" aria-hidden="true">${corpo}</svg>`;

  if (ehPoligono) {
    // Um único path com evenodd: furos (anéis internos) ficam vazados
    const d = partes
      .filter((p) => p.length >= 3)
      .map((p) => `M${decimar(p).map(proj).join('L')}Z`)
      .join('');
    if (!d) return '';
    return svg(
      `<path d="${d}" fill="${cor}" fill-opacity="0.45" fill-rule="evenodd" stroke="${cor}" stroke-width="1.2" stroke-linejoin="round"/>`
    );
  }
  if (ehLinha) {
    const d = partes
      .filter((p) => p.length >= 2)
      .map((p) => `M${decimar(p).map(proj).join('L')}`)
      .join('');
    if (!d) return '';
    return svg(
      `<path d="${d}" fill="none" stroke="${cor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }
  return '';
}

export function renderizarThumbGeometria(
  tipo: string | undefined,
  cor: string,
  coords?: unknown
): string {
  const safeColor = sanitizarCorCss(cor, '#00E08A');
  const t = (tipo || '').toLowerCase();

  const real = coords !== undefined ? renderizarThumbReal(t, coords, safeColor) : '';
  if (real) return real;

  if (t === 'polygon' || t === 'multipolygon') {
    return `<svg viewBox="0 0 16 16" width="11" height="11"><polygon points="2,14 14,14 12,2 4,4" fill="${safeColor}" fill-opacity="0.45" stroke="${safeColor}" stroke-width="1.5"/></svg>`;
  }
  if (t === 'linestring' || t === 'multilinestring') {
    return `<svg viewBox="0 0 16 16" width="11" height="11"><polyline points="2,13 8,3 14,10" fill="none" stroke="${safeColor}" stroke-width="2"/></svg>`;
  }
  if (t === 'text') {
    return `<svg viewBox="0 0 16 16" width="11" height="11"><text x="8" y="12" font-size="12" font-weight="bold" fill="${safeColor}" text-anchor="middle" font-family="sans-serif">T</text></svg>`;
  }
  return `<svg viewBox="0 0 16 16" width="11" height="11"><circle cx="8" cy="8" r="4.2" fill="${safeColor}" stroke="#ffffff" stroke-width="1.2"/></svg>`;
}
