/**
 * Contratos públicos do gerenciador de feições do <ui-canvas-cad>.
 * Responsabilidade única: tipos de entrada/saída (opções, lotes, resultados) sem lógica.
 */
import type { LayerStyleDef } from '../../gerencigeo-canvas/types';
import type { MotivoRecusaEdicao } from '../../gerencigeo-canvas/feature_edicao_ops';

export const TIPO_CAMADA_FEICOES = 'feicoes';

export interface OpcoesCamadaFeicoes {
  nome?: string;
  zIndex?: number;
  opacidade?: number;
  interativo?: boolean;
  estilo?: Partial<LayerStyleDef>;
}

/** Opções de `aplicarLote` / `atualizarFeicao`. */
export interface OpcoesLote extends OpcoesCamadaFeicoes {
  /**
   * Em atualizações, `propriedades` informadas SUBSTITUEM as atuais (o padrão é mesclar, e chaves apagadas
   * pelo consumidor ficam para trás). Sem `propriedades` no item, nada muda.
   */
  substituirPropriedades?: boolean;
}

/** Itens de atualização: `id` aponta a feição; o resto é mesclado como em `atualizarFeicao`. */
export type AtualizacaoFeicao = Record<string, any> & { id: string };

export interface LoteFeicoes {
  adicionar?: unknown[];
  atualizar?: AtualizacaoFeicao[];
  remover?: string[];
}

export interface ResultadoLote {
  adicionadas: number;
  atualizadas: number;
  removidas: number;
  /** Ids (ou posições, quando não há id) recusados: geometria inválida, feição inexistente numa atualização, camada que não é de feições. */
  recusadas: string[];
}

export interface ResultadoFeicoes {
  /** Quantas feições entraram na camada. */
  aceitas: number;
  /** Ids (ou posições, quando não há id) das feições recusadas por geometria inválida. */
  recusadas: string[];
}

/** Opções do popup da feição. */
export interface OpcoesPopup {
  /** A ação "copiar" grava as coordenadas na área de transferência (padrão `true`); `cad-feicao-acao` sai de qualquer jeito. */
  copiarParaAreaDeTransferencia?: boolean;
}

export interface ResultadoFerramenta {
  ok: boolean;
  motivo?: 'ferramenta-invalida' | 'sem-mapa' | 'sem-camada' | 'camada-invalida' | 'camada-bloqueada';
}

export interface ResultadoEdicao {
  ok: boolean;
  motivo?: MotivoRecusaEdicao | 'inexistente' | 'sem-mapa';
}
