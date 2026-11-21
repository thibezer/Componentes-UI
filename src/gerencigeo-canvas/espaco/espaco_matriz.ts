import type { Par } from '../feature_types';

/*
 * Matriz afim 2D (L2, pura), na convenção do Canvas 2D / SVG / DOMMatrix:
 *
 *   x' = a·x + c·y + e
 *   y' = b·x + d·y + f          (setTransform(a, b, c, d, e, f))
 *
 * Imutável: toda operação devolve uma matriz nova. `multiplicar(m1, m2)` aplica m2 primeiro e depois m1; `compor(...)`
 * aplica na ordem dos argumentos. Ângulos em radianos, crescendo de +x para +y (no plano da folha, com y para baixo, é o
 * sentido horário na tela). Nada aqui lança: entrada não finita vira identidade (`saneada`) e a inversa de matriz singular
 * é `null`.
 */

export interface Matriz2D {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

/** Abaixo disto o determinante é tratado como zero (escala nula: não há inversa). */
export const EPSILON_DETERMINANTE = 1e-12;

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export const IDENTIDADE: Matriz2D = Object.freeze({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

export function matriz(a: number, b: number, c: number, d: number, e: number, f: number): Matriz2D {
  return { a, b, c, d, e, f };
}

/** Todos os seis coeficientes são números finitos? */
export function ehMatrizFinita(m: unknown): m is Matriz2D {
  if (!m || typeof m !== 'object') return false;
  const x = m as Record<string, unknown>;
  return fin(x.a) && fin(x.b) && fin(x.c) && fin(x.d) && fin(x.e) && fin(x.f);
}

/** A própria matriz (copiada) se for finita; senão a identidade. Use em toda matriz vinda de fora. */
export function saneada(m: unknown): Matriz2D {
  if (!ehMatrizFinita(m)) return IDENTIDADE;
  return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f };
}

export const determinante = (m: Matriz2D): number => m.a * m.d - m.b * m.c;

export const ehSingular = (m: Matriz2D): boolean => !(Math.abs(determinante(m)) > EPSILON_DETERMINANTE);

export const ehIdentidade = (m: Matriz2D, eps = 0): boolean =>
  Math.abs(m.a - 1) <= eps && Math.abs(m.b) <= eps && Math.abs(m.c) <= eps && Math.abs(m.d - 1) <= eps && Math.abs(m.e) <= eps && Math.abs(m.f) <= eps;

export function iguais(m1: Matriz2D, m2: Matriz2D, eps = 1e-9): boolean {
  return Math.abs(m1.a - m2.a) <= eps && Math.abs(m1.b - m2.b) <= eps && Math.abs(m1.c - m2.c) <= eps
    && Math.abs(m1.d - m2.d) <= eps && Math.abs(m1.e - m2.e) <= eps && Math.abs(m1.f - m2.f) <= eps;
}

/** `m1 · m2`: aplica `m2` primeiro e depois `m1`. */
export function multiplicar(m1: Matriz2D, m2: Matriz2D): Matriz2D {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f
  };
}

/** Composição na ordem de aplicação: `compor(A, B, C)` aplica A, depois B, depois C. Sem argumentos: identidade. */
export function compor(...ms: Matriz2D[]): Matriz2D {
  let r = IDENTIDADE;
  for (const m of ms) r = multiplicar(m, r);
  return r;
}

/** Inversa, ou `null` se a matriz é singular (escala zero) ou não finita. */
export function inverter(m: Matriz2D): Matriz2D | null {
  if (!ehMatrizFinita(m)) return null;
  const det = determinante(m);
  if (!(Math.abs(det) > EPSILON_DETERMINANTE)) return null;
  const inv = {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det,
    e: (m.c * m.f - m.d * m.e) / det,
    f: (m.b * m.e - m.a * m.f) / det
  };
  return ehMatrizFinita(inv) ? inv : null;
}

export function aplicar(m: Matriz2D, p: Par): Par {
  return [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f];
}

/** Aplica só a parte linear (sem translação): para vetores, como alças relativas. */
export function aplicarVetor(m: Matriz2D, v: Par): Par {
  return [m.a * v[0] + m.c * v[1], m.b * v[0] + m.d * v[1]];
}

export function aplicarTodos(m: Matriz2D, pts: readonly Par[]): Par[] {
  return pts.map((p) => aplicar(m, p));
}

// ---------- construtores ----------

export const translacao = (tx: number, ty: number): Matriz2D => ({ a: 1, b: 0, c: 0, d: 1, e: tx, f: ty });

/** Conjuga `m` com uma translação: a mesma operação feita em torno de `pivo` em vez da origem. */
export function emTornoDe(m: Matriz2D, pivo?: Par): Matriz2D {
  if (!pivo) return m;
  return compor(translacao(-pivo[0], -pivo[1]), m, translacao(pivo[0], pivo[1]));
}

export const escala = (sx: number, sy: number = sx, pivo?: Par): Matriz2D =>
  emTornoDe({ a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 }, pivo);

export function rotacao(angulo: number, pivo?: Par): Matriz2D {
  const cos = Math.cos(angulo);
  const sen = Math.sin(angulo);
  return emTornoDe({ a: cos, b: sen, c: -sen, d: cos, e: 0, f: 0 }, pivo);
}

/** Cisalhamento: `x' = x + kx·y`, `y' = y + ky·x` (kx, ky são tangentes dos ângulos). */
export const cisalhamento = (kx: number, ky = 0, pivo?: Par): Matriz2D =>
  emTornoDe({ a: 1, b: ky, c: kx, d: 1, e: 0, f: 0 }, pivo);

/** Espelha pelo eixo vertical (`'horizontal'`: inverte x) ou horizontal (`'vertical'`: inverte y) que passa no pivô. */
export function espelhamento(direcao: 'horizontal' | 'vertical', pivo?: Par): Matriz2D {
  return escala(direcao === 'horizontal' ? -1 : 1, direcao === 'vertical' ? -1 : 1, pivo);
}

// ---------- decomposição ----------

/**
 * Partes de uma matriz em `translação · rotação · cisalhamento · escala` (aplicadas da direita para a esquerda): escala
 * primeiro, depois cisalhamento horizontal, rotação e translação. `escalaY < 0` indica espelhamento. Matriz com
 * `escalaX = 0` devolve rotação e cisalhamento 0.
 */
export interface DecomposicaoMatriz {
  translacaoX: number;
  translacaoY: number;
  /** Radianos. */
  rotacao: number;
  escalaX: number;
  escalaY: number;
  /** Tangente do ângulo de cisalhamento horizontal (x += k·y antes da rotação). */
  cisalhamento: number;
}

export function decompor(m: Matriz2D): DecomposicaoMatriz {
  const s = saneada(m);
  const escalaX = Math.hypot(s.a, s.b);
  if (escalaX === 0) {
    return { translacaoX: s.e, translacaoY: s.f, rotacao: 0, escalaX: 0, escalaY: Math.hypot(s.c, s.d), cisalhamento: 0 };
  }
  const rot = Math.atan2(s.b, s.a);
  const escalaY = determinante(s) / escalaX;
  const cos = Math.cos(rot);
  const sen = Math.sin(rot);
  const cis = escalaY === 0 ? 0 : (s.c * cos + s.d * sen) / escalaY;
  return { translacaoX: s.e, translacaoY: s.f, rotacao: rot, escalaX, escalaY, cisalhamento: cis };
}

/** Inverso de `decompor`. */
export function recompor(p: DecomposicaoMatriz): Matriz2D {
  const cos = Math.cos(p.rotacao);
  const sen = Math.sin(p.rotacao);
  // R · K · S, com K = [[1, k], [0, 1]] e S = diag(sx, sy)
  const a = cos * p.escalaX;
  const b = sen * p.escalaX;
  const c = (cos * p.cisalhamento - sen) * p.escalaY;
  const d = (sen * p.cisalhamento + cos) * p.escalaY;
  return saneada({ a, b, c, d, e: p.translacaoX, f: p.translacaoY });
}
