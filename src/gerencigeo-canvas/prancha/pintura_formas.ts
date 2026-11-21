import type { Par } from '../feature_types';
import type { EstiloPontaSeta, PontaSeta } from './tipos';

/*
 * Geometria auxiliar da pintura (L2, pura), em mm da folha: pontas de seta e linhas de hachura. Tudo vira caminhos
 * comuns (moveTo/lineTo), então tela, PDF e SVG desenham o mesmo.
 */

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export interface GeometriaPonta {
  /** Vértices da ponta na folha (mm). */
  pontos: Par[];
  /** Fecha o caminho (triângulo, círculo, quadrado, losango) ou não (V aberto, barra). */
  fechada: boolean;
  /** Pintada cheia com a cor do traço; senão só contornada. */
  preenchida: boolean;
  /** Quanto a linha deve recuar a partir da ponta para não aparecer além dela (mm). */
  recuo: number;
}

/**
 * Comprimento da ponta em mm: 5× a espessura do traço, com mínimo de 2 mm, vezes a `escala` da ponta (limitada a
 * [0,1; 100]). A largura total é 0,8× o comprimento.
 */
export function comprimentoDaPonta(espessura: number, escala?: number): number {
  const e = fin(espessura) && espessura > 0 ? espessura : 0.25;
  const k = fin(escala) && escala > 0 ? Math.min(100, Math.max(0.1, escala)) : 1;
  return Math.max(2, 5 * e) * k;
}

const LADOS_CIRCULO = 24;

/**
 * Ponta de seta com o bico em `bico`, apontando na direção `dir` (para FORA do caminho, unitária ou não). `null` se a
 * direção for nula ou a entrada não for finita.
 */
export function geometriaDaPonta(ponta: PontaSeta, bico: Par, dir: Par, espessura: number): GeometriaPonta | null {
  if (!ponta || !fin(bico?.[0]) || !fin(bico?.[1]) || !fin(dir?.[0]) || !fin(dir?.[1])) return null;
  const n = Math.hypot(dir[0], dir[1]);
  if (!(n > 1e-12)) return null;
  const d: Par = [dir[0] / n, dir[1] / n];
  const nx = -d[1];
  const ny = d[0];
  const L = comprimentoDaPonta(espessura, ponta.escala);
  const W = 0.4 * L;
  const at = (ao: number, lado: number): Par => [bico[0] + d[0] * ao + nx * lado, bico[1] + d[1] * ao + ny * lado];
  const estilo: EstiloPontaSeta = ponta.estilo;
  switch (estilo) {
    case 'triangulo':
      return { pontos: [bico, at(-L, W), at(-L, -W)], fechada: true, preenchida: true, recuo: L / 2 };
    case 'triangulo-aberto':
      return { pontos: [bico, at(-L, W), at(-L, -W)], fechada: true, preenchida: false, recuo: L };
    case 'aberta':
      return { pontos: [at(-L, W), bico, at(-L, -W)], fechada: false, preenchida: false, recuo: 0 };
    case 'barra':
      return { pontos: [at(0, W), at(0, -W)], fechada: false, preenchida: false, recuo: 0 };
    case 'quadrado': {
      const m = L / 3;
      return { pontos: [at(m, m), at(m, -m), at(-m, -m), at(-m, m)], fechada: true, preenchida: true, recuo: m };
    }
    case 'losango':
      return { pontos: [at(L / 2, 0), at(0, W), at(-L / 2, 0), at(0, -W)], fechada: true, preenchida: true, recuo: L / 4 };
    case 'circulo': {
      const r = L / 3;
      const pontos: Par[] = [];
      for (let i = 0; i < LADOS_CIRCULO; i++) {
        const a = (2 * Math.PI * i) / LADOS_CIRCULO;
        pontos.push([bico[0] + r * Math.cos(a), bico[1] + r * Math.sin(a)]);
      }
      return { pontos, fechada: true, preenchida: true, recuo: r };
    }
    default:
      return null;
  }
}

/** Direção de saída numa ponta da poligonal: do primeiro vizinho distinto até a ponta. `null` se todos coincidem. */
export function direcaoNaPonta(pts: readonly Par[], noFim: boolean): Par | null {
  const n = pts.length;
  if (n < 2) return null;
  const ponta = noFim ? pts[n - 1] : pts[0];
  for (let k = 1; k < n; k++) {
    const v = noFim ? pts[n - 1 - k] : pts[k];
    const dx = ponta[0] - v[0];
    const dy = ponta[1] - v[1];
    if (Math.hypot(dx, dy) > 1e-9) return [dx, dy];
  }
  return null;
}

/** Máximo de linhas de hachura por elemento (espaçamento minúsculo numa forma grande não trava a pintura). */
export const MAX_LINHAS_HACHURA = 4000;

/**
 * Linhas paralelas de ângulo `angulo` (rad) e espaçamento `espacamento` (mm), alinhadas à origem da folha (vizinhos com a
 * mesma hachura casam), cobrindo a caixa [x0, y0]–[x1, y1]. O pintor recorta pela forma. Se passariam de
 * `MAX_LINHAS_HACHURA`, o espaçamento cresce para caber.
 */
export function linhasDeHachura(x0: number, y0: number, x1: number, y1: number, angulo: number, espacamento: number): Array<[Par, Par]> {
  if (![x0, y0, x1, y1, angulo, espacamento].every(fin) || espacamento <= 0 || x1 < x0 || y1 < y0) return [];
  const dx = Math.cos(angulo);
  const dy = Math.sin(angulo);
  // normal: a hachura avança ao longo dela, de `espacamento` em `espacamento`
  const nx = -dy;
  const ny = dx;
  const cantos: Par[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const proj = cantos.map(([x, y]) => x * nx + y * ny);
  const min = Math.min(...proj);
  const max = Math.max(...proj);
  let esp = espacamento;
  if ((max - min) / esp > MAX_LINHAS_HACHURA) esp = (max - min) / MAX_LINHAS_HACHURA;
  const meio = cantos.map(([x, y]) => x * dx + y * dy);
  const a0 = Math.min(...meio) - esp;
  const a1 = Math.max(...meio) + esp;
  const linhas: Array<[Par, Par]> = [];
  for (let k = Math.ceil(min / esp); k * esp <= max; k++) {
    const t = k * esp;
    linhas.push([[nx * t + dx * a0, ny * t + dy * a0], [nx * t + dx * a1, ny * t + dy * a1]]);
  }
  return linhas;
}
