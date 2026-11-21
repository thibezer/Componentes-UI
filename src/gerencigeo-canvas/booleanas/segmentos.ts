import type { Par } from '../feature_types';

/*
 * Vértices canônicos e divisão das arestas (L2 puro), primeira etapa das booleanas.
 *
 * Todo ponto passa pelo `RegistroVertices`: pontos a menos de `q` de um vértice já registrado viram ESSE vértice (com a
 * coordenada original dele, então as entradas saem bit a bit iguais). Depois, cada par de arestas que se toca (cruzamento,
 * ponta encostada no meio da outra, trecho colinear sobreposto) ganha os pontos de corte, e as arestas são quebradas
 * neles. O resultado são pedaços que só se encontram nas pontas.
 */

export interface Vertice {
  p: Par;
  /** Identidade do vértice (inteiro sequencial). */
  id: number;
}

/** Fusão de vértices por grade de lado `q`, procurando também nas 8 células vizinhas. */
export class RegistroVertices {
  private readonly celulas = new Map<number, Vertice[]>();
  private seq = 0;

  constructor(readonly q: number, private readonly x0: number, private readonly y0: number) {}

  /** Hash da célula (colisões são inofensivas: a distância é conferida vértice a vértice). */
  private celula(ix: number, iy: number): number {
    return (Math.imul(ix | 0, 73856093) ^ Math.imul(iy | 0, 19349663)) >>> 0;
  }

  /** O vértice de `p`: um já registrado a até `q`, ou um novo. */
  registrar(x: number, y: number): Vertice {
    const ix = Math.floor((x - this.x0) / this.q);
    const iy = Math.floor((y - this.y0) / this.q);
    let melhor: Vertice | null = null;
    let dMelhor = this.q * this.q;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const lista = this.celulas.get(this.celula(ix + dx, iy + dy));
        if (!lista) continue;
        for (const v of lista) {
          const d = (v.p[0] - x) ** 2 + (v.p[1] - y) ** 2;
          if (d <= dMelhor) { dMelhor = d; melhor = v; }
        }
      }
    }
    if (melhor) return melhor;
    const v: Vertice = { p: [x, y], id: this.seq++ };
    const k = this.celula(ix, iy);
    const lista = this.celulas.get(k);
    if (lista) lista.push(v);
    else this.celulas.set(k, [v]);
    return v;
  }
}

/** Aresta de entrada (orientada como no anel) de um operando, com os pontos de corte achados. */
export interface Segmento {
  a: Vertice;
  b: Vertice;
  operando: number;
  cortes: Vertice[];
}

/** Pedaço de aresta entre dois vértices consecutivos (sem orientação de interesse ainda). */
export interface Peca {
  a: Vertice;
  b: Vertice;
}

const minX = (s: Segmento): number => Math.min(s.a.p[0], s.b.p[0]);
const maxX = (s: Segmento): number => Math.max(s.a.p[0], s.b.p[0]);
const minY = (s: Segmento): number => Math.min(s.a.p[1], s.b.p[1]);
const maxY = (s: Segmento): number => Math.max(s.a.p[1], s.b.p[1]);

/** Se o vértice `v` encosta no MEIO de `s` (a até `eps`), vira corte de `s`. */
function tocar(s: Segmento, v: Vertice, eps: number): number {
  if (v.id === s.a.id || v.id === s.b.id) return 0;
  const [ax, ay] = s.a.p;
  const dx = s.b.p[0] - ax, dy = s.b.p[1] - ay;
  const l2 = dx * dx + dy * dy;
  if (!(l2 > 0)) return 0;
  const t = ((v.p[0] - ax) * dx + (v.p[1] - ay) * dy) / l2;
  const tt = eps / Math.sqrt(l2);
  if (t <= tt || t >= 1 - tt) return 0;
  const dist = Math.abs((v.p[0] - ax) * dy - (v.p[1] - ay) * dx) / Math.sqrt(l2);
  if (dist > eps) return 0;
  s.cortes.push(v);
  return 1;
}

/** Cortes entre duas arestas: toques de ponta (inclui sobreposição colinear) e o cruzamento próprio. */
function intersectar(s1: Segmento, s2: Segmento, reg: RegistroVertices, eps: number): number {
  let n = tocar(s1, s2.a, eps) + tocar(s1, s2.b, eps) + tocar(s2, s1.a, eps) + tocar(s2, s1.b, eps);
  const [ax, ay] = s1.a.p;
  const [cx, cy] = s2.a.p;
  const dx = s1.b.p[0] - ax, dy = s1.b.p[1] - ay;
  const ex = s2.b.p[0] - cx, ey = s2.b.p[1] - cy;
  const den = dx * ey - dy * ex;
  const l1 = Math.hypot(dx, dy), l2 = Math.hypot(ex, ey);
  if (!(Math.abs(den) > 1e-12 * l1 * l2)) return n; // paralelas: os toques já cobriram a sobreposição
  const t = ((cx - ax) * ey - (cy - ay) * ex) / den;
  const u = ((cx - ax) * dy - (cy - ay) * dx) / den;
  const tt = eps / l1, tu = eps / l2;
  if (t <= tt || t >= 1 - tt || u <= tu || u >= 1 - tu) return n; // perto das pontas: é caso de toque
  const v = reg.registrar(ax + t * dx, ay + t * dy);
  if (v.id !== s1.a.id && v.id !== s1.b.id) { s1.cortes.push(v); n++; }
  if (v.id !== s2.a.id && v.id !== s2.b.id) { s2.cortes.push(v); n++; }
  return n;
}

/**
 * Acha os cortes de todos os pares de arestas que se tocam (varredura em x: só compara arestas cujos intervalos em x e y
 * se sobrepõem). Devolve o número de cortes.
 */
export function acharCortes(segs: Segmento[], reg: RegistroVertices, eps: number): number {
  const n = segs.length;
  // caixas em vetores planos (o laço interno não toca nos objetos)
  const cx0 = new Float64Array(n), cx1 = new Float64Array(n), cy0 = new Float64Array(n), cy1 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const s = segs[i];
    cx0[i] = minX(s); cx1[i] = maxX(s); cy0[i] = minY(s); cy1[i] = maxY(s);
  }
  const ordem = Array.from({ length: n }, (_, i) => i).sort((i, j) => cx0[i] - cx0[j]);
  const ativos = new Int32Array(n);
  let nAtivos = 0;
  let cortes = 0;
  for (const i of ordem) {
    const x = cx0[i] - eps;
    const y0 = cy0[i] - eps, y1 = cy1[i] + eps;
    let k = 0;
    for (let m = 0; m < nAtivos; m++) {
      const j = ativos[m];
      if (cx1[j] < x) continue; // saiu da varredura
      ativos[k++] = j;
      if (cy1[j] < y0 || cy0[j] > y1) continue;
      cortes += intersectar(segs[i], segs[j], reg, eps);
    }
    nAtivos = k;
    ativos[nAtivos++] = i;
  }
  return cortes;
}

/** Quebra as arestas nos cortes; pedaços repetidos (mesmos dois vértices, em qualquer sentido) entram uma vez só. */
export function quebrarEmPecas(segs: readonly Segmento[]): Peca[] {
  const vistas = new Set<number>();
  const pecas: Peca[] = [];
  for (const s of segs) {
    const [ax, ay] = s.a.p;
    const dx = s.b.p[0] - ax, dy = s.b.p[1] - ay;
    const param = (v: Vertice): number => (v.p[0] - ax) * dx + (v.p[1] - ay) * dy;
    const pontos = [s.a, ...[...s.cortes].sort((u, v) => param(u) - param(v)), s.b];
    for (let k = 1; k < pontos.length; k++) {
      const a = pontos[k - 1], b = pontos[k];
      if (a.id === b.id) continue;
      const chave = a.id < b.id ? a.id * 67108864 + b.id : b.id * 67108864 + a.id;
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      pecas.push({ a, b });
    }
  }
  return pecas;
}
