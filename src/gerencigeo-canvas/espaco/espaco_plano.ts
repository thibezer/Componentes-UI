import type { Par } from '../feature_types';
import type { Espaco, PlanoLocal, XY } from './espaco_tipos';

/*
 * Espaço plano da prancha: `[x, y]` em milímetros, origem no canto superior esquerdo da folha, y para baixo. Medidas
 * euclidianas em mm (área em mm²). Ângulos crescem de +x para +y, ou seja, no sentido horário na tela.
 */

/** Área com sinal de um anel aberto (fórmula de Gauss); `NaN` se algum vértice não for finito. */
export function areaComSinal(anel: readonly Par[]): number {
  const n = anel.length;
  if (n < 3) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = anel[i];
    const b = anel[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

function areaPlana(aneis: Par[][]): number {
  const [externo, ...furos] = aneis;
  if (!externo) return 0;
  const area = Math.abs(areaComSinal(externo)) - furos.reduce((s, f) => s + Math.abs(areaComSinal(f)), 0);
  return Number.isFinite(area) ? Math.max(0, area) : 0;
}

function comprimentoPlano(pts: Par[], fechado = false): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (fechado && pts.length > 2) total += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  return total;
}

function planoLocalPlano(ref: Par): PlanoLocal {
  const x0 = ref[0];
  const y0 = ref[1];
  return {
    paraXY: (p: Par): XY => [p[0] - x0, p[1] - y0],
    deXY: (p: XY): Par => [x0 + p[0], y0 + p[1]]
  };
}

export const ESPACO_PLANO: Espaco = Object.freeze({
  tipo: 'plano',
  unidade: 'mm',
  distancia: (a: Par, b: Par): number => Math.hypot(b[0] - a[0], b[1] - a[1]),
  comprimento: comprimentoPlano,
  area: areaPlana,
  planoLocal: planoLocalPlano,
  deslocar: (p: Par, dx: number, dy: number): Par => [p[0] + dx, p[1] + dy],
  pontoDaBorda: (c: Par, raio: number): Par => [c[0] + raio, c[1]],
  pontoDeMedidaDoRaio: (c: Par, raio: number): Par => [c[0] + raio, c[1]],
  extremosDoCirculo(c: Par, raio: number): [Par, Par] {
    const r = Math.abs(raio);
    return [[c[0] - r, c[1] - r], [c[0] + r, c[1] + r]];
  },
  fatorEixo: (): number => 1
}) as Espaco;

// ---------- unidades de exibição (o dado é sempre mm) ----------

export type UnidadePrancha = 'mm' | 'cm' | 'pt' | 'pol' | 'px';

/** Milímetros por unidade. `pt` = 1/72 pol (tipográfico); `px` = 1/96 pol (CSS). */
export const MM_POR_UNIDADE: Readonly<Record<UnidadePrancha, number>> = Object.freeze({
  mm: 1,
  cm: 10,
  pt: 25.4 / 72,
  pol: 25.4,
  px: 25.4 / 96
});

export function ehUnidadePrancha(v: unknown): v is UnidadePrancha {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(MM_POR_UNIDADE, v);
}

/** Converte `valor` em `unidade` para mm; entrada não finita ou unidade desconhecida = `NaN`. */
export function paraMm(valor: number, unidade: UnidadePrancha): number {
  if (!Number.isFinite(valor) || !ehUnidadePrancha(unidade)) return NaN;
  return valor * MM_POR_UNIDADE[unidade];
}

/** Converte mm para `unidade`; entrada não finita ou unidade desconhecida = `NaN`. */
export function deMm(mm: number, unidade: UnidadePrancha): number {
  if (!Number.isFinite(mm) || !ehUnidadePrancha(unidade)) return NaN;
  return mm / MM_POR_UNIDADE[unidade];
}
