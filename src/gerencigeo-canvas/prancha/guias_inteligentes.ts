import type { CaixaMm } from './tipos';

/*
 * Guias inteligentes (L2, puras): ao mover uma caixa, encontra o alinhamento mais perto (bordas e centros) com as caixas
 * de referência (outros elementos, a folha), devolve a correção que encaixa e as linhas a desenhar, com a distância
 * entre as caixas ao longo da guia (o "espaço" que o editor vetorial mostra). Unidades em mm.
 */

export interface LinhaGuiaInteligente {
  /** `vertical`: x = `posicao`; `horizontal`: y = `posicao`. */
  orientacao: 'vertical' | 'horizontal';
  posicao: number;
  /** Trecho da linha (no outro eixo) que cobre as duas caixas. */
  de: number;
  ate: number;
  /** Distância (mm) entre as duas caixas ao longo da guia, quando elas não se sobrepõem nesse eixo. */
  distancia?: number;
}

export interface ResultadoGuiasInteligentes {
  /** Quanto somar ao deslocamento para encaixar (0 no eixo sem alinhamento). */
  correcao: [number, number];
  linhas: LinhaGuiaInteligente[];
}

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const valida = (c: CaixaMm | null | undefined): c is CaixaMm =>
  !!c && fin(c.x) && fin(c.y) && fin(c.largura) && fin(c.altura) && c.largura >= 0 && c.altura >= 0;

const marcasX = (c: CaixaMm): number[] => [c.x, c.x + c.largura / 2, c.x + c.largura];
const marcasY = (c: CaixaMm): number[] => [c.y, c.y + c.altura / 2, c.y + c.altura];

interface Melhor { delta: number; posicao: number; alvo: CaixaMm }

function melhorNoEixo(valores: number[], alvos: readonly CaixaMm[], marcas: (c: CaixaMm) => number[], tol: number): Melhor | null {
  let melhor: Melhor | null = null;
  for (const alvo of alvos) {
    for (const t of marcas(alvo)) {
      for (const v of valores) {
        const delta = t - v;
        if (Math.abs(delta) <= tol && (!melhor || Math.abs(delta) < Math.abs(melhor.delta))) melhor = { delta, posicao: t, alvo };
      }
    }
  }
  return melhor;
}

function linha(orientacao: 'vertical' | 'horizontal', posicao: number, a: CaixaMm, b: CaixaMm): LinhaGuiaInteligente {
  const [a0, a1, b0, b1] = orientacao === 'vertical'
    ? [a.y, a.y + a.altura, b.y, b.y + b.altura]
    : [a.x, a.x + a.largura, b.x, b.x + b.largura];
  const l: LinhaGuiaInteligente = { orientacao, posicao, de: Math.min(a0, b0), ate: Math.max(a1, b1) };
  if (a1 < b0) l.distancia = b0 - a1;
  else if (b1 < a0) l.distancia = a0 - b1;
  return l;
}

/**
 * Alinha `movel` às `referencias` dentro de `tolerancia` (mm). Em cada eixo vale o alinhamento mais perto (borda ou
 * centro com borda ou centro). Entrada inválida ou nada perto: correção [0, 0] e nenhuma linha.
 */
export function guiasInteligentes(movel: CaixaMm, referencias: readonly CaixaMm[], tolerancia: number): ResultadoGuiasInteligentes {
  const vazio: ResultadoGuiasInteligentes = { correcao: [0, 0], linhas: [] };
  if (!valida(movel) || !fin(tolerancia) || tolerancia < 0 || !Array.isArray(referencias)) return vazio;
  const alvos = referencias.filter(valida);
  const mx = melhorNoEixo(marcasX(movel), alvos, marcasX, tolerancia);
  const my = melhorNoEixo(marcasY(movel), alvos, marcasY, tolerancia);
  const dx = mx?.delta ?? 0;
  const dy = my?.delta ?? 0;
  const final: CaixaMm = { ...movel, x: movel.x + dx, y: movel.y + dy };
  const linhas: LinhaGuiaInteligente[] = [];
  if (mx) linhas.push(linha('vertical', mx.posicao, final, mx.alvo));
  if (my) linhas.push(linha('horizontal', my.posicao, final, my.alvo));
  return { correcao: [dx, dy], linhas };
}
