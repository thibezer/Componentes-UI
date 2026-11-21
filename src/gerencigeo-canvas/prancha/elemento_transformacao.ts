import type { Par } from '../feature_types';
import {
  IDENTIDADE, aplicar, cisalhamento, compor, escala, espelhamento, inverter, multiplicar, rotacao, translacao, type Matriz2D
} from '../espaco/espaco_matriz';
import { limitesLocais, limitesNaFolha, matrizDoElemento } from './elemento_geometria';
import type { ElementoGrafico } from './tipos';

/*
 * Transformações de elementos (L2, puras): caixa orientada, alças e as matrizes que as alças produzem (escala, rotação,
 * cisalhamento), espelhar, mover. Toda matriz devolvida está em coordenadas da FOLHA e se aplica DEPOIS da transformação
 * atual (`transformarElemento`). A UI (Fase 3) só converte o ponteiro em chamadas destas funções.
 */

/** Caixa no referencial `quadro` (local → folha): `min`/`max` são os cantos no referencial local. */
export interface CaixaOrientada {
  quadro: Matriz2D;
  min: Par;
  max: Par;
}

export type AlcaEscala = 'no' | 'n' | 'ne' | 'e' | 'se' | 's' | 'so' | 'o';
export const ALCAS_ESCALA: readonly AlcaEscala[] = ['no', 'n', 'ne', 'e', 'se', 's', 'so', 'o'];
export type AlcaLateral = 'n' | 'e' | 's' | 'o';

/** Menor fator de escala aceito (evita matriz singular ao arrastar uma alça além da oposta). */
export const ESCALA_MINIMA = 1e-4;

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Caixa orientada do elemento: a caixa local transformada (gira e cisalha com ele). `null` se degenerado. */
export function caixaOrientada(el: ElementoGrafico): CaixaOrientada | null {
  const l = limitesLocais(el);
  if (!l) return null;
  return { quadro: matrizDoElemento(el), min: [l.x, l.y], max: [l.x + l.largura, l.y + l.altura] };
}

/** Caixa da seleção: alinhada aos eixos da folha, envolvendo todos (ou a orientada, se for um elemento só). */
export function caixaDaSelecao(elementos: readonly ElementoGrafico[]): CaixaOrientada | null {
  if (elementos.length === 1) return caixaOrientada(elementos[0]);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const el of elementos) {
    const c = limitesNaFolha(el);
    if (!c) continue;
    x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y);
    x1 = Math.max(x1, c.x + c.largura); y1 = Math.max(y1, c.y + c.altura);
  }
  return x0 <= x1 && y0 <= y1 ? { quadro: IDENTIDADE, min: [x0, y0], max: [x1, y1] } : null;
}

/** Posição local (no referencial da caixa) de uma alça ou do centro. */
export function posicaoLocalDaAlca(c: CaixaOrientada, alca: AlcaEscala | 'centro'): Par {
  const mx = (c.min[0] + c.max[0]) / 2;
  const my = (c.min[1] + c.max[1]) / 2;
  switch (alca) {
    case 'no': return [c.min[0], c.min[1]];
    case 'n': return [mx, c.min[1]];
    case 'ne': return [c.max[0], c.min[1]];
    case 'e': return [c.max[0], my];
    case 'se': return [c.max[0], c.max[1]];
    case 's': return [mx, c.max[1]];
    case 'so': return [c.min[0], c.max[1]];
    case 'o': return [c.min[0], my];
    default: return [mx, my];
  }
}

const OPOSTA: Record<AlcaEscala, AlcaEscala> = { no: 'se', n: 's', ne: 'so', e: 'o', se: 'no', s: 'n', so: 'ne', o: 'e' };

export interface PosicoesAlcas {
  cantos: [Par, Par, Par, Par];
  alcas: Record<AlcaEscala, Par>;
  centro: Par;
  /** Alça de rotação: `distancia` mm além da alça `n`, para fora da caixa. */
  rotacao: Par;
}

/** Posições na folha dos cantos, das 8 alças, do centro e da alça de rotação. */
export function posicoesDasAlcas(c: CaixaOrientada, distanciaRotacao = 6): PosicoesAlcas {
  const f = (p: Par): Par => aplicar(c.quadro, p);
  const alcas = Object.fromEntries(ALCAS_ESCALA.map((a) => [a, f(posicaoLocalDaAlca(c, a))])) as Record<AlcaEscala, Par>;
  const centro = f(posicaoLocalDaAlca(c, 'centro'));
  const n = alcas.n;
  let dx = n[0] - centro[0], dy = n[1] - centro[1];
  const len = Math.hypot(dx, dy);
  if (len > 1e-9) { dx /= len; dy /= len; } else { dx = 0; dy = -1; }
  const d = fin(distanciaRotacao) ? distanciaRotacao : 6;
  return { cantos: [alcas.no, alcas.ne, alcas.se, alcas.so], alcas, centro, rotacao: [n[0] + dx * d, n[1] + dy * d] };
}

/** Conjuga uma operação feita no referencial da caixa para a folha. `null` se o quadro não é inversível. */
function naFolha(c: CaixaOrientada, local: Matriz2D): Matriz2D | null {
  const inv = inverter(c.quadro);
  return inv ? compor(inv, local, c.quadro) : null;
}

const limitarEscala = (s: number): number => (Math.abs(s) < ESCALA_MINIMA ? (s < 0 ? -ESCALA_MINIMA : ESCALA_MINIMA) : s);

export interface OpcoesEscalaAlca {
  /** Shift: mantém a proporção. */
  proporcional?: boolean;
  /** Alt: escala a partir do centro (em vez da alça oposta). */
  doCentro?: boolean;
}

/**
 * Matriz (na folha) que leva a alça até `destino`, com a alça oposta (ou o centro) parada. Alças laterais só escalam um
 * eixo, a não ser com `proporcional`. Atravessar a oposta espelha. `null` com entrada inválida ou caixa degenerada.
 */
export function matrizDeEscalaPorAlca(c: CaixaOrientada, alca: AlcaEscala, destino: Par, opcoes: OpcoesEscalaAlca = {}): Matriz2D | null {
  if (!c || !OPOSTA[alca] || !fin(destino?.[0]) || !fin(destino?.[1])) return null;
  const inv = inverter(c.quadro);
  if (!inv) return null;
  const q = aplicar(inv, destino);
  const h = posicaoLocalDaAlca(c, alca);
  const ancora = posicaoLocalDaAlca(c, opcoes.doCentro ? 'centro' : OPOSTA[alca]);
  const mexeX = alca !== 'n' && alca !== 's';
  const mexeY = alca !== 'e' && alca !== 'o';
  const dx = h[0] - ancora[0];
  const dy = h[1] - ancora[1];
  let sx = mexeX && Math.abs(dx) > 1e-12 ? (q[0] - ancora[0]) / dx : 1;
  let sy = mexeY && Math.abs(dy) > 1e-12 ? (q[1] - ancora[1]) / dy : 1;
  if (opcoes.proporcional) {
    const s = !mexeY ? sx : !mexeX ? sy : Math.abs(sx) >= Math.abs(sy) ? sx : sy;
    sx = s;
    sy = s;
  }
  if (!fin(sx) || !fin(sy)) return null;
  return naFolha(c, escala(limitarEscala(sx), limitarEscala(sy), ancora));
}

export interface ResultadoRotacao {
  matriz: Matriz2D;
  /** Radianos (positivo = horário na tela). */
  angulo: number;
}

/**
 * Rotação em torno de `pivo` pelo ângulo entre `inicio − pivo` e `atual − pivo`. `passo` (radianos, ex. π/4 com Shift)
 * arredonda o ângulo. Vetor nulo ou entrada inválida = identidade.
 */
export function rotacaoPorArrasto(pivo: Par, inicio: Par, atual: Par, passo?: number): ResultadoRotacao {
  const ok = [pivo?.[0], pivo?.[1], inicio?.[0], inicio?.[1], atual?.[0], atual?.[1]].every(fin);
  if (!ok) return { matriz: IDENTIDADE, angulo: 0 };
  const ax = inicio[0] - pivo[0], ay = inicio[1] - pivo[1];
  const bx = atual[0] - pivo[0], by = atual[1] - pivo[1];
  if (Math.hypot(ax, ay) < 1e-9 || Math.hypot(bx, by) < 1e-9) return { matriz: IDENTIDADE, angulo: 0 };
  let ang = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
  if (fin(passo) && passo > 0) ang = Math.round(ang / passo) * passo;
  return { matriz: rotacao(ang, pivo), angulo: ang };
}

/** Cisalhamento por alça lateral: `n`/`s` inclinam na horizontal, `e`/`o` na vertical, com a borda oposta parada. */
export function matrizDeCisalhamentoPorAlca(c: CaixaOrientada, alca: AlcaLateral, destino: Par): Matriz2D | null {
  if (!c || !['n', 's', 'e', 'o'].includes(alca) || !fin(destino?.[0]) || !fin(destino?.[1])) return null;
  const inv = inverter(c.quadro);
  if (!inv) return null;
  const q = aplicar(inv, destino);
  const h = posicaoLocalDaAlca(c, alca);
  const ancora = posicaoLocalDaAlca(c, OPOSTA[alca]);
  if (alca === 'n' || alca === 's') {
    const dy = h[1] - ancora[1];
    if (Math.abs(dy) < 1e-12) return null;
    return naFolha(c, cisalhamento((q[0] - h[0]) / dy, 0, ancora));
  }
  const dx = h[0] - ancora[0];
  if (Math.abs(dx) < 1e-12) return null;
  return naFolha(c, cisalhamento(0, (q[1] - h[1]) / dx, ancora));
}

// ---------- aplicar ----------

/** Aplica `m` (na folha) depois da transformação atual. Matriz não finita deixa o elemento como está. */
export function transformarElemento(el: ElementoGrafico, m: Matriz2D): ElementoGrafico {
  const atual = matrizDoElemento(el);
  const nova = multiplicar(m, atual);
  if (![nova.a, nova.b, nova.c, nova.d, nova.e, nova.f].every(fin)) return el;
  return { ...el, transformacao: nova };
}

export const moverElemento = (el: ElementoGrafico, dx: number, dy: number): ElementoGrafico =>
  fin(dx) && fin(dy) ? transformarElemento(el, translacao(dx, dy)) : el;

/** Centro da caixa da seleção (o pivô padrão de girar e espelhar vários). */
export function centroDaSelecao(elementos: readonly ElementoGrafico[]): Par | null {
  const c = caixaDaSelecao(elementos);
  return c ? aplicar(c.quadro, posicaoLocalDaAlca(c, 'centro')) : null;
}

/** Pivô do elemento na folha (o `pivo` local transformado, ou o centro da caixa). */
export function pivoNaFolha(el: ElementoGrafico): Par | null {
  if (el.pivo && fin(el.pivo[0]) && fin(el.pivo[1])) return aplicar(matrizDoElemento(el), el.pivo);
  const c = caixaOrientada(el);
  return c ? aplicar(c.quadro, posicaoLocalDaAlca(c, 'centro')) : null;
}

/** Aplica a mesma matriz a todos (os bloqueados ficam como estão). */
export function transformarElementos(elementos: readonly ElementoGrafico[], m: Matriz2D): ElementoGrafico[] {
  return elementos.map((el) => (el.bloqueado ? el : transformarElemento(el, m)));
}

/** Espelha a seleção pelo eixo que passa no pivô (padrão: o centro da seleção). */
export function espelharElementos(elementos: readonly ElementoGrafico[], direcao: 'horizontal' | 'vertical', pivo?: Par): ElementoGrafico[] {
  const p = pivo ?? centroDaSelecao(elementos);
  return p ? transformarElementos(elementos, espelhamento(direcao, p)) : [...elementos];
}

/** Gira a seleção `angulo` radianos em torno do pivô (padrão: o centro da seleção). */
export function girarElementos(elementos: readonly ElementoGrafico[], angulo: number, pivo?: Par): ElementoGrafico[] {
  const p = pivo ?? centroDaSelecao(elementos);
  return p && fin(angulo) ? transformarElementos(elementos, rotacao(angulo, p)) : [...elementos];
}
