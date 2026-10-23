import { partesDaLinha, type Feicao, type GeometriaFeicao, type LatLonPar } from './feature_types';

/* Medidas geodésicas das feições no elipsoide GRS80 (SIRGAS 2000 / WGS-84). */

const SEMIEIXO_A = 6378137;
const ACHATAMENTO = 1 / 298.257222101;
const E2 = ACHATAMENTO * (2 - ACHATAMENTO);
const rad = (g: number): number => (g * Math.PI) / 180;

/** Raios de curvatura do meridiano (M) e do primeiro vertical (N) na latitude (graus). */
function raiosCurvatura(latGraus: number): { M: number; N: number } {
  const s = Math.sin(rad(latGraus));
  const w = 1 - E2 * s * s;
  return { N: SEMIEIXO_A / Math.sqrt(w), M: (SEMIEIXO_A * (1 - E2)) / (w * Math.sqrt(w)) };
}

/** Metros por grau de latitude e de longitude na latitude dada (escala local do elipsoide). */
export function metrosPorGrau(latGraus: number): { lat: number; lng: number } {
  const { M, N } = raiosCurvatura(latGraus);
  return { lat: rad(1) * M, lng: rad(1) * N * Math.cos(rad(latGraus)) };
}

/** Distância geodésica inversa de Vincenty (usada quando os pontos estão distantes). */
function vincenty(a: LatLonPar, b: LatLonPar): number {
  const B = SEMIEIXO_A * (1 - ACHATAMENTO);
  const f = ACHATAMENTO;
  const L = rad(b[1] - a[1]);
  const U1 = Math.atan((1 - f) * Math.tan(rad(a[0])));
  const U2 = Math.atan((1 - f) * Math.tan(rad(b[0])));
  const sU1 = Math.sin(U1), cU1 = Math.cos(U1), sU2 = Math.sin(U2), cU2 = Math.cos(U2);
  let lambda = L;
  let sinS = 0, cosS = 0, sigma = 0, cos2A = 0, cos2Sm = 0;
  for (let i = 0; i < 100; i++) {
    const sl = Math.sin(lambda), cl = Math.cos(lambda);
    sinS = Math.hypot(cU2 * sl, cU1 * sU2 - sU1 * cU2 * cl);
    if (sinS === 0) return 0;
    cosS = sU1 * sU2 + cU1 * cU2 * cl;
    sigma = Math.atan2(sinS, cosS);
    const sinA = (cU1 * cU2 * sl) / sinS;
    cos2A = 1 - sinA * sinA;
    cos2Sm = cos2A === 0 ? 0 : cosS - (2 * sU1 * sU2) / cos2A;
    const C = (f / 16) * cos2A * (4 + f * (4 - 3 * cos2A));
    const anterior = lambda;
    lambda = L + (1 - C) * f * sinA * (sigma + C * sinS * (cos2Sm + C * cosS * (-1 + 2 * cos2Sm * cos2Sm)));
    if (Math.abs(lambda - anterior) < 1e-12) break;
  }
  const u2 = (cos2A * (SEMIEIXO_A * SEMIEIXO_A - B * B)) / (B * B);
  const k1 = 1 + (u2 / 16384) * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
  const k2 = (u2 / 1024) * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
  const dSigma = k2 * sinS * (cos2Sm + (k2 / 4) * (cosS * (-1 + 2 * cos2Sm * cos2Sm)
    - (k2 / 6) * cos2Sm * (-3 + 4 * sinS * sinS) * (-3 + 4 * cos2Sm * cos2Sm)));
  return B * k1 * (sigma - dSigma);
}

/**
 * Distância em metros no elipsoide. Até ~11 km (0,1°) usa a escala local do elipsoide (M e N na
 * latitude média, erro < 2e-7); acima disso, Vincenty. Rápida o bastante para laços de arraste/encaixe.
 */
export function distanciaMetros(a: LatLonPar, b: LatLonPar): number {
  const dLat = b[0] - a[0];
  const dLon = b[1] - a[1];
  if (Math.abs(dLat) < 0.1 && Math.abs(dLon) < 0.1) {
    const { M, N } = raiosCurvatura((a[0] + b[0]) / 2);
    const dy = rad(dLat) * M;
    const dx = rad(dLon) * N * Math.cos(rad((a[0] + b[0]) / 2));
    return Math.hypot(dx, dy);
  }
  return vincenty(a, b);
}

export function comprimentoMetros(pts: LatLonPar[], fechado = false): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += distanciaMetros(pts[i - 1], pts[i]);
  if (fechado && pts.length > 2) total += distanciaMetros(pts[pts.length - 1], pts[0]);
  return total;
}

/**
 * Área (m²) de um anel no elipsoide: Σ (λ[i+1] − λ[i−1]) · sen(φ[i]) · M·N / 2, com M·N na latitude
 * média do anel. Erro abaixo de 0,01% de lotes a municípios (referência: área elipsoidal geodésica).
 */
function areaAnelMetros2(anel: LatLonPar[]): number {
  const n = anel.length;
  if (n < 3) return 0;
  let soma = 0;
  let latMedia = 0;
  for (let i = 0; i < n; i++) {
    const anterior = anel[(i - 1 + n) % n];
    const atual = anel[i];
    const proximo = anel[(i + 1) % n];
    soma += rad(proximo[1] - anterior[1]) * Math.sin(rad(atual[0]));
    latMedia += atual[0];
  }
  const { M, N } = raiosCurvatura(latMedia / n);
  const area = Math.abs((soma * M * N) / 2);
  return Number.isFinite(area) ? area : 0;
}

/** Área (m²) do polígono, descontando os furos. */
export function areaMetros2(aneis: LatLonPar[][]): number {
  const [externo, ...furos] = aneis;
  if (!externo) return 0;
  return Math.max(0, areaAnelMetros2(externo) - furos.reduce((s, f) => s + areaAnelMetros2(f), 0));
}

const nfHa = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const nfM = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatarArea(m2: number): string {
  return `${nfHa.format(m2 / 10000)} ha`;
}

export function formatarExtensao(m: number): string {
  return m >= 1000 ? `${nfM.format(m / 1000)} km` : `${nfM.format(m)} m`;
}

export function areaDaGeometria(g: GeometriaFeicao): number | null {
  if (g.tipo === 'Polygon') return areaMetros2(g.aneis);
  if (g.tipo === 'Circle') return Math.PI * g.raioMetros ** 2;
  return null;
}

export function extensaoDaGeometria(g: GeometriaFeicao): number | null {
  // multiparte: a extensão é a soma das partes
  if (g.tipo === 'LineString') return partesDaLinha(g).reduce((s, p) => s + comprimentoMetros(p), 0);
  if (g.tipo === 'Polygon') return comprimentoMetros(g.aneis[0] ?? [], true);
  if (g.tipo === 'Circle') return 2 * Math.PI * g.raioMetros;
  return null;
}

/**
 * Texto do rótulo permanente. `campo` pode ser `area`, `extensao`, `id` ou qualquer chave de
 * `propriedades` (name, category, description...). Sem campo: nome, senão id.
 */
export function textoRotulo(f: Feicao, campo?: string): string {
  const chave = campo ?? 'name';
  if (chave === 'area') {
    const a = areaDaGeometria(f.geometria);
    return a === null ? '' : formatarArea(a);
  }
  if (chave === 'extensao') {
    const e = extensaoDaGeometria(f.geometria);
    return e === null ? '' : formatarExtensao(e);
  }
  if (chave === 'id') return f.id;
  const v = f.propriedades?.[chave];
  if (v !== undefined && v !== null && v !== '') return String(v);
  return campo ? '' : f.id;
}

/** Envelope [[sul, oeste], [norte, leste]] da geometria. */
export function limitesDaGeometria(g: GeometriaFeicao): [LatLonPar, LatLonPar] {
  let pts: LatLonPar[];
  switch (g.tipo) {
    case 'Point':
    case 'Text': pts = [g.coordenada]; break;
    case 'LineString': pts = partesDaLinha(g).flat(); break;
    case 'Polygon': pts = g.aneis.flat(); break;
    case 'Circle': {
      const dLat = g.raioMetros / 111320;
      const dLon = dLat / Math.max(0.01, Math.cos(rad(g.centro[0])));
      pts = [[g.centro[0] - dLat, g.centro[1] - dLon], [g.centro[0] + dLat, g.centro[1] + dLon]];
      break;
    }
  }
  const lats = pts.map((p) => p[0]);
  const lons = pts.map((p) => p[1]);
  return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
}
