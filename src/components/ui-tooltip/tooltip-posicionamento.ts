/**
 * Posicionamento do balão do <ui-tooltip>.
 * Responsabilidade única: normalizar o lado pedido e calcular `top`/`left` (em px, relativos à janela) do balão,
 * mantendo-o dentro da tela. Funções puras, sem acesso ao DOM.
 */

export type PosicaoTooltip = 'topo' | 'baixo' | 'esquerda' | 'direita';

export interface Retangulo {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Viewport {
  largura: number;
  altura: number;
}

/** Distância entre o gatilho e o balão (seta + folga). */
export const DESLOCAMENTO_PX = 8;
/** Margem mínima até a borda da janela. */
export const MARGEM_TELA_PX = 8;

const ALIASES: Record<string, PosicaoTooltip> = {
  topo: 'topo',
  top: 'topo',
  baixo: 'baixo',
  bottom: 'baixo',
  esquerda: 'esquerda',
  left: 'esquerda',
  direita: 'direita',
  right: 'direita'
};

/** Aceita português e inglês, ignora caixa e espaços; qualquer outra coisa vira `topo`. */
export function normalizarPosicao(bruto: string | null | undefined): PosicaoTooltip {
  const chave = (bruto ?? '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(ALIASES, chave) ? ALIASES[chave] : 'topo';
}

const finito = (n: number): number => (Number.isFinite(n) ? n : 0);

/** Posição do balão em torno do gatilho, limitada à janela (balão maior que a janela fica na margem). */
export function calcularPosicaoBalao(
  gatilho: Retangulo,
  balao: Pick<Retangulo, 'width' | 'height'>,
  posicao: PosicaoTooltip,
  viewport: Viewport
): { top: number; left: number } {
  const bw = finito(balao.width);
  const bh = finito(balao.height);
  const centroX = finito(gatilho.left) + finito(gatilho.width) / 2;
  const centroY = finito(gatilho.top) + finito(gatilho.height) / 2;

  let top = 0;
  let left = 0;
  if (posicao === 'topo') {
    top = finito(gatilho.top) - bh - DESLOCAMENTO_PX;
    left = centroX - bw / 2;
  } else if (posicao === 'baixo') {
    top = finito(gatilho.bottom) + DESLOCAMENTO_PX;
    left = centroX - bw / 2;
  } else if (posicao === 'esquerda') {
    top = centroY - bh / 2;
    left = finito(gatilho.left) - bw - DESLOCAMENTO_PX;
  } else {
    top = centroY - bh / 2;
    left = finito(gatilho.right) + DESLOCAMENTO_PX;
  }

  const limite = (valor: number, tamanho: number, janela: number): number =>
    Math.max(MARGEM_TELA_PX, Math.min(valor, finito(janela) - tamanho - MARGEM_TELA_PX));
  return {
    top: Math.round(limite(top, bh, viewport.altura)),
    left: Math.round(limite(left, bw, viewport.largura))
  };
}
