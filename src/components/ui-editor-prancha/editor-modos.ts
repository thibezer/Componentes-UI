import type { BarraFormasEditorPrancha, LateralEditorPrancha } from './editor-tipos';

/**
 * Largura (px do próprio editor) abaixo da qual `lateral="auto"` vira gaveta. É a mesma do
 * `@container editor (max-width: 719.98px)` do CSS (o CSS não lê variáveis em condições de container).
 */
export const LARGURA_ESTREITA_PX = 720;

/**
 * Folga mínima (px) acima da largura necessária para `barra-formas="auto"` voltar de `"Formas ▾"` para os botões,
 * evitando oscilação na fronteira por arredondamentos de subpixel ou pequenas variações de largura.
 */
export const HISTERESE_BARRA_FORMAS_PX = 24;

/** Tolerância de subpixel (px) antes de declarar transbordo ao comparar largura necessária e disponível. */
export const TOLERANCIA_TRANSBORDO_PX = 0.5;

export interface EntradaDecisaoBarraFormas {
  /** Estado atual no modo `auto` (`false` = botões visíveis, `true` = menu `"Formas ▾"`). */
  colapsadaAtual: boolean;
  /** Largura (px) necessária para exibir todos os botões em uma única linha. */
  larguraNecessaria: number;
  /** Largura (px) disponível para `.botoes-formas` dentro da barra. */
  larguraDisponivel: number;
  /** Quando os botões estão visíveis no DOM, indica se houve quebra para segunda linha ou transbordo horizontal. */
  transbordouNoDom?: boolean;
  /** Histerese (px) exigida para expandir de `"Formas ▾"` de volta para os botões. */
  histerese?: number;
}

/** `barra-formas`: desconhecido ou ausente = `auto`. */
export const lerBarraFormas = (v: unknown): BarraFormasEditorPrancha => (v === 'botoes' || v === 'menu' ? v : 'auto');

/** `lateral`: desconhecido ou ausente = `auto`. */
export const lerLateral = (v: unknown): LateralEditorPrancha => (v === 'fixa' || v === 'gaveta' ? v : 'auto');

/**
 * Decide se a barra de formas no modo `auto` deve colapsar para `"Formas ▾"` (`true`) ou exibir os botões (`false`).
 * Função pura (sem DOM): aplica histerese assimétrica para evitar "pisca-pisca" na fronteira e preserva o estado
 * atual quando ainda não há medidas válidas de layout.
 */
export function decidirBarraColapsada(entrada: EntradaDecisaoBarraFormas): boolean {
  if (!entrada || typeof entrada !== 'object') return false;
  const colapsadaAtual = Boolean(entrada.colapsadaAtual);
  const transbordou = entrada.transbordouNoDom === true;
  const necessaria = entrada.larguraNecessaria;
  const disponivel = entrada.larguraDisponivel;
  const histerese =
    typeof entrada.histerese === 'number' && Number.isFinite(entrada.histerese) && entrada.histerese >= 0
      ? entrada.histerese
      : HISTERESE_BARRA_FORMAS_PX;

  const disponivelValido = typeof disponivel === 'number' && Number.isFinite(disponivel) && disponivel > 0;
  const necessariaValida = typeof necessaria === 'number' && Number.isFinite(necessaria) && necessaria > 0;
  if (!disponivelValido || !necessariaValida) {
    return transbordou ? true : colapsadaAtual;
  }

  if (colapsadaAtual) {
    if (transbordou) return true;
    return disponivel < necessaria + histerese;
  }

  return transbordou || necessaria > disponivel + TOLERANCIA_TRANSBORDO_PX;
}
