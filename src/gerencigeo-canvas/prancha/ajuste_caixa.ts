import { aplicar, escala, translacao } from '../espaco/espaco_matriz';
import { envelopeVisual } from './envelope_visual';
import { centroDaSelecao, transformarElemento } from './elemento_transformacao';
import type { CaixaMm, ElementoGrafico } from './tipos';

/*
 * Ajuste de elementos a uma caixa (L2, puro): esticar/encolher um desenho inteiro e levá-lo à origem, que é o que um
 * hospedeiro faz ao redimensionar o item que contém o desenho.
 *
 * GARANTIA (testada): a espessura, o tracejado e as pontas de seta são em mm DA FOLHA, não da geometria; a escala (mesmo
 * não uniforme) muda só o contorno, nunca o traço. O único que "estica" é o texto, conforme `escalarTexto`.
 */

export interface OpcoesAjusteCaixa {
  /** Escala uniforme (a menor das duas) e centraliza no destino. Padrão `false`. */
  manterProporcao?: boolean;
  /**
   * `'distorcer'` (padrão): o texto acompanha a matriz, esticado junto; `'tamanho'`: o texto muda de posição e de corpo
   * uniformemente (média geométrica das escalas), sem distorcer; `'nao'`: só muda de posição.
   */
  escalarTexto?: 'distorcer' | 'tamanho' | 'nao';
  /** Também ajusta os elementos bloqueados (padrão `true`: o desenho é um bloco só). */
  incluirBloqueados?: boolean;
}

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const caixaValida = (c: CaixaMm | null | undefined): c is CaixaMm => !!c && [c.x, c.y, c.largura, c.altura].every(fin) && c.largura > 0 && c.altura > 0;

/**
 * Leva `elementos`, que ocupam `caixaOrigem`, para `caixaDestino`. Caixa inválida ou degenerada (largura/altura ≤ 0, não
 * finita) RECUSA: devolve uma cópia sem alteração. Nunca lança.
 */
export function ajustarElementosACaixa(
  elementos: readonly ElementoGrafico[], caixaOrigem: CaixaMm, caixaDestino: CaixaMm, opcoes: OpcoesAjusteCaixa = {}
): ElementoGrafico[] {
  const lista = Array.isArray(elementos) ? elementos.filter((e) => e && typeof e === 'object') : [];
  if (!caixaValida(caixaOrigem) || !caixaValida(caixaDestino)) return [...lista];
  let sx = caixaDestino.largura / caixaOrigem.largura;
  let sy = caixaDestino.altura / caixaOrigem.altura;
  let dx = caixaDestino.x;
  let dy = caixaDestino.y;
  if (opcoes.manterProporcao) {
    const s = Math.min(sx, sy);
    dx += (caixaDestino.largura - caixaOrigem.largura * s) / 2;
    dy += (caixaDestino.altura - caixaOrigem.altura * s) / 2;
    sx = s;
    sy = s;
  }
  if (!(sx > 0 && sy > 0) || !fin(sx) || !fin(sy)) return [...lista];
  // ponto da origem → destino
  const mapa = (p: [number, number]): [number, number] => [(p[0] - caixaOrigem.x) * sx + dx, (p[1] - caixaOrigem.y) * sy + dy];
  const matriz = { a: sx, b: 0, c: 0, d: sy, e: dx - caixaOrigem.x * sx, f: dy - caixaOrigem.y * sy };
  const modoTexto = opcoes.escalarTexto ?? 'distorcer';
  const sUniforme = Math.sqrt(sx * sy);
  return lista.map((el) => {
    if (el.bloqueado && opcoes.incluirBloqueados === false) return el;
    if (el.geometria?.tipo === 'texto' && modoTexto !== 'distorcer') {
      const c = centroDaSelecao([el]);
      if (!c) return el;
      const alvo = mapa(c);
      const corpo = modoTexto === 'tamanho' ? transformarElemento(el, escala(sUniforme, sUniforme, c)) : el;
      return transformarElemento(corpo, translacao(alvo[0] - c[0], alvo[1] - c[1]));
    }
    return transformarElemento(el, matriz);
  });
}

export interface OpcoesNormalizarOrigem {
  /** Tamanho mínimo (mm) da caixa resultante; o desenho fica centrado nela. Padrão 0. */
  minimo?: number;
}

/**
 * Translada TODOS os elementos (bloqueados inclusive) para que o envelope visual comece em (0, 0). Com `minimo`, uma
 * caixa menor que ele é ampliada e o desenho centrado. Devolve os elementos e a caixa resultante (`x = y = 0`). Sem nada
 * visível, devolve a cópia e uma caixa `minimo × minimo` (ou 0 × 0).
 */
export function normalizarParaOrigem(elementos: readonly ElementoGrafico[], opcoes: OpcoesNormalizarOrigem = {}): { elementos: ElementoGrafico[]; caixa: CaixaMm } {
  const lista = Array.isArray(elementos) ? elementos.filter((e) => e && typeof e === 'object') : [];
  const minimo = fin(opcoes.minimo) && opcoes.minimo > 0 ? opcoes.minimo : 0;
  const env = envelopeVisual(lista);
  if (!env) return { elementos: [...lista], caixa: { x: 0, y: 0, largura: minimo, altura: minimo } };
  const largura = Math.max(env.largura, minimo);
  const altura = Math.max(env.altura, minimo);
  const dx = (largura - env.largura) / 2 - env.x;
  const dy = (altura - env.altura) / 2 - env.y;
  const m = translacao(dx, dy);
  return { elementos: lista.map((el) => transformarElemento(el, m)), caixa: { x: 0, y: 0, largura, altura } };
}

/** Ponto da caixa origem mapeado por `ajustarElementosACaixa` (útil ao app para reposicionar guias). */
export function mapearPontoNaCaixa(p: [number, number], origem: CaixaMm, destino: CaixaMm): [number, number] | null {
  if (!caixaValida(origem) || !caixaValida(destino) || !fin(p?.[0]) || !fin(p?.[1])) return null;
  return aplicar({ a: destino.largura / origem.largura, b: 0, c: 0, d: destino.altura / origem.altura, e: destino.x - (origem.x * destino.largura) / origem.largura, f: destino.y - (origem.y * destino.altura) / origem.altura }, p);
}
