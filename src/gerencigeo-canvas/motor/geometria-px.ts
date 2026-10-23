import type { LatLonPar } from '../feature_types';

/*
 * Geometria em pixels de mundo (Web Mercator, tiles de 256 px). Tudo em Float64Array plano `[x0, y0, x1, y1, ...]`:
 * sem alocar um objeto por vértice, que é o que custava caro em 20 mil formas. Funções puras, sem DOM nem Leaflet.
 */

const TAMANHO_TILE = 256;
const LATITUDE_MAX = 85.0511287798;
const CIRCUNFERENCIA_EQUADOR_M = 40075016.685578488;

/** Pixels de mundo da latitude/longitude no zoom, gravados em `saida[i]` (x) e `saida[i + 1]` (y). Não lança. */
export function projetarEm(saida: Float64Array, i: number, lat: number, lon: number, escala: number): void {
  const la = lat > LATITUDE_MAX ? LATITUDE_MAX : lat < -LATITUDE_MAX ? -LATITUDE_MAX : lat;
  const sen = Math.sin((la * Math.PI) / 180);
  saida[i] = ((lon + 180) / 360) * escala;
  saida[i + 1] = (0.5 - Math.log((1 + sen) / (1 - sen)) / (4 * Math.PI)) * escala;
}

export const escalaDoZoom = (zoom: number): number => TAMANHO_TILE * 2 ** zoom;

/** Inverso de `projetarEm`: pixels de mundo no zoom → [lat, lon]. */
export function latLonDoMundo(x: number, y: number, zoom: number): LatLonPar {
  const e = escalaDoZoom(zoom);
  return [(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / e))) * 180) / Math.PI, (x / e) * 360 - 180];
}

/** Projeta uma lista de [lat, lon]. */
export function projetarVertices(coords: ReadonlyArray<LatLonPar>, zoom: number): Float64Array {
  const escala = escalaDoZoom(zoom);
  const saida = new Float64Array(coords.length * 2);
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    projetarEm(saida, i * 2, c[0], c[1], escala);
  }
  return saida;
}

export function projetarCentro(lat: number, lon: number, zoom: number): Float64Array {
  const saida = new Float64Array(2);
  projetarEm(saida, 0, lat, lon, escalaDoZoom(zoom));
  return saida;
}

/** Metros por pixel na latitude e no zoom. */
export function metrosPorPixel(lat: number, zoom: number): number {
  const la = Math.max(-LATITUDE_MAX, Math.min(LATITUDE_MAX, lat));
  return (CIRCUNFERENCIA_EQUADOR_M * Math.cos((la * Math.PI) / 180)) / escalaDoZoom(zoom);
}

/** Raio, em pixels, de um círculo de `raioMetros` com centro na latitude (raio por zoom e latitude). */
export function raioCirculoPx(lat: number, raioMetros: number, zoom: number): number {
  const mpp = metrosPorPixel(lat, zoom);
  const r = raioMetros / mpp;
  return Number.isFinite(r) && r >= 0 ? r : 0;
}

export interface CaixaMundoPx {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Envelope em px de vários arrays planos; `null` se não houver nenhum vértice finito. */
export function caixaPx(partes: ReadonlyArray<Float64Array>): CaixaMundoPx | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of partes) {
    for (let i = 0; i + 1 < p.length; i += 2) {
      const x = p[i];
      const y = p[i + 1];
      if (!(Number.isFinite(x) && Number.isFinite(y))) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return minX <= maxX && minY <= maxY ? { minX, minY, maxX, maxY } : null;
}

function distSegmentoPx(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const c = dx * dx + dy * dy;
  let t = c === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / c;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Douglas-Peucker iterativo em pixels (tolerância em px, sem cos(lat): as coordenadas já são de tela). `fechado`
 * trata o anel como fechado (o corte não depende de onde ele "começa") e nunca devolve menos de 3 vértices (senão
 * volta o original). Tolerância inválida (≤ 0, NaN) devolve a própria entrada.
 */
export function simplificarPx(pts: Float64Array, tolerancia: number, fechado: boolean): Float64Array {
  const n0 = pts.length >> 1;
  if (!(tolerancia > 0) || n0 < 3) return pts;
  let a = pts;
  let n = n0;
  if (fechado) {
    a = new Float64Array((n0 + 1) * 2);
    a.set(pts);
    a[n0 * 2] = pts[0];
    a[n0 * 2 + 1] = pts[1];
    n = n0 + 1;
  }
  const manter = new Uint8Array(n);
  manter[0] = 1;
  manter[n - 1] = 1;
  const pilha: number[] = [0, n - 1];
  while (pilha.length > 0) {
    const fim = pilha.pop()!;
    const ini = pilha.pop()!;
    let maior = 0;
    let indice = -1;
    const ax = a[ini * 2];
    const ay = a[ini * 2 + 1];
    const bx = a[fim * 2];
    const by = a[fim * 2 + 1];
    for (let i = ini + 1; i < fim; i++) {
      const d = distSegmentoPx(a[i * 2], a[i * 2 + 1], ax, ay, bx, by);
      if (d > maior) {
        maior = d;
        indice = i;
      }
    }
    if (indice !== -1 && maior > tolerancia) {
      manter[indice] = 1;
      pilha.push(ini, indice, indice, fim);
    }
  }
  const total = fechado ? n - 1 : n; // o vértice repetido do anel fechado não entra
  let mantidos = 0;
  for (let i = 0; i < total; i++) if (manter[i]) mantidos++;
  if (fechado && mantidos < 3) return pts;
  if (mantidos === total) return pts;
  const saida = new Float64Array(mantidos * 2);
  let k = 0;
  for (let i = 0; i < total; i++) {
    if (!manter[i]) continue;
    saida[k++] = a[i * 2];
    saida[k++] = a[i * 2 + 1];
  }
  return saida;
}
