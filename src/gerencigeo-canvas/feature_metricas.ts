import { partesDaLinha, type Feicao, type GeometriaFeicao, type LatLonPar } from './feature_types';

/* Medidas geodésicas simples das feições (WGS-84 esférico; suficiente para rótulos). */

const RAIO_TERRA_M = 6371008.8;
const rad = (g: number): number => (g * Math.PI) / 180;

export function distanciaMetros(a: LatLonPar, b: LatLonPar): number {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function comprimentoMetros(pts: LatLonPar[], fechado = false): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += distanciaMetros(pts[i - 1], pts[i]);
  if (fechado && pts.length > 2) total += distanciaMetros(pts[pts.length - 1], pts[0]);
  return total;
}

/** Área (m²) de um anel pela projeção equiretangular local; vale para áreas de até alguns km. */
function areaAnelMetros2(anel: LatLonPar[]): number {
  const lat0 = rad(anel.reduce((s, p) => s + p[0], 0) / anel.length);
  const xy = anel.map((p) => [rad(p[1]) * Math.cos(lat0) * RAIO_TERRA_M, rad(p[0]) * RAIO_TERRA_M]);
  let soma = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    soma += x1 * y2 - x2 * y1;
  }
  return Math.abs(soma) / 2;
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
