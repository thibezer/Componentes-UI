import type { Par } from '../feature_types';
import type { OperacaoBooleana, RegraPreenchimento } from './tipos';

/** Aresta orientada de um operando (as `Segmento` das booleanas, ou os anéis do resultado na montagem). */
export interface ArestaIndexavel {
  a: { p: Par };
  b: { p: Par };
  operando: number;
}

/*
 * Classificação (L2 puro), segunda etapa das booleanas: o número de voltas (winding) de um ponto em cada operando, com as
 * arestas ORIGINAIS indexadas por faixas horizontais (a consulta só olha as arestas da faixa do ponto,
 * ordenadas pelo x máximo: o raio vai para +x, então as arestas inteiras à esquerda do ponto encerram a busca). Com o
 * número de voltas e a regra de cada operando, sabe-se se o ponto está dentro de cada um, e então dentro ou fora do resultado.
 */

/** Arestas por faixas horizontais, para o número de voltas sem percorrer todas. */
export class IndiceFaixas {
  private readonly coords: Float64Array;
  private readonly operandos: Int32Array;
  private readonly faixas: Int32Array[];
  private readonly y0: number;
  private readonly altura: number;
  private readonly nf: number;
  private readonly maxX: Float64Array;

  constructor(segs: readonly ArestaIndexavel[], y0: number, y1: number) {
    const n = segs.length;
    this.coords = new Float64Array(n * 4);
    this.operandos = new Int32Array(n);
    this.maxX = new Float64Array(n);
    const nf = Math.max(1, Math.min(4096, Math.ceil(n / 6)));
    this.nf = nf;
    const listas: number[][] = Array.from({ length: nf }, () => []);
    this.y0 = y0;
    this.altura = y1 > y0 ? (y1 - y0) / nf : 1;
    segs.forEach((s, i) => {
      this.maxX[i] = Math.max(s.a.p[0], s.b.p[0]);
      this.coords[i * 4] = s.a.p[0];
      this.coords[i * 4 + 1] = s.a.p[1];
      this.coords[i * 4 + 2] = s.b.p[0];
      this.coords[i * 4 + 3] = s.b.p[1];
      this.operandos[i] = s.operando;
      const f0 = this.faixa(Math.min(s.a.p[1], s.b.p[1]));
      const f1 = this.faixa(Math.max(s.a.p[1], s.b.p[1]));
      for (let f = f0; f <= f1; f++) listas[f].push(i);
    });
    const mx = this.maxX;
    this.faixas = listas.map((l) => Int32Array.from(l.sort((i, j) => mx[j] - mx[i])));
  }

  private faixa(y: number): number {
    const f = Math.floor((y - this.y0) / this.altura);
    return f < 0 ? 0 : f >= this.nf ? this.nf - 1 : f;
  }

  /**
   * Número de voltas de (x, y) em cada operando, em `v.voltas`; só os operandos com aresta cruzada pelo raio entram em
   * `v.tocados` (os demais têm 0 voltas). A consulta zera só o que a anterior tocou.
   */
  voltas(x: number, y: number, v: Voltas): void {
    const w = v.voltas;
    for (let k = 0; k < v.n; k++) w[v.tocados[k]] = 0;
    v.n = 0;
    const c = this.coords;
    const mx = this.maxX;
    const lista = this.faixas[this.faixa(y)];
    for (let k = 0; k < lista.length; k++) {
      const i = lista[k];
      if (mx[i] < x) break; // daqui em diante, tudo à esquerda: o raio para +x não cruza
      const ax = c[i * 4], ay = c[i * 4 + 1], bx = c[i * 4 + 2], by = c[i * 4 + 3];
      let d = 0;
      if (ay <= y) {
        if (by > y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) > 0) d = 1;
      } else if (by <= y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) < 0) {
        d = -1;
      }
      if (d === 0) continue;
      const op = this.operandos[i];
      if (!v.marcado[op]) { v.marcado[op] = 1; v.tocados[v.n++] = op; }
      w[op] += d;
    }
    for (let k = 0; k < v.n; k++) v.marcado[v.tocados[k]] = 0;
  }
}

/** Resultado (reaproveitável) de uma consulta de voltas. */
export class Voltas {
  readonly voltas: Int32Array;
  readonly tocados: Int32Array;
  readonly marcado: Uint8Array;
  n = 0;
  constructor(operandos: number) {
    this.voltas = new Int32Array(operandos);
    this.tocados = new Int32Array(operandos);
    this.marcado = new Uint8Array(operandos);
  }
}

/** Dentro do operando pela regra dele. */
export const dentroPelaRegra = (voltas: number, regra: RegraPreenchimento): boolean =>
  regra === 'evenodd' ? (voltas & 1) !== 0 : voltas !== 0;

/** O ponto (com as voltas em cada operando) está dentro do resultado da operação? Só olha os operandos tocados. */
export function dentroDoResultado(op: OperacaoBooleana, v: Voltas, regras: readonly RegraPreenchimento[]): boolean {
  let dentro = 0;
  let primeiro = false;
  for (let k = 0; k < v.n; k++) {
    const i = v.tocados[k];
    if (!dentroPelaRegra(v.voltas[i], regras[i])) continue;
    dentro++;
    if (i === 0) primeiro = true;
    if (op === 'uniao') return true;
    if (op === 'subtracao' && i !== 0) return false;
  }
  if (op === 'uniao') return false;
  if (op === 'intersecao') return regras.length > 0 && dentro === regras.length;
  if (op === 'subtracao') return primeiro;
  return (dentro & 1) === 1;
}
