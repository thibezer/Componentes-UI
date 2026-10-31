/**
 * Contratos, tipos e interfaces para a Paleta Técnica de Propriedades (<ui-tabela-propriedades>).
 */

export type TipoPropriedade =
  | 'texto'
  | 'numero'
  | 'selecao'
  | 'booleano'
  | 'cor'
  | 'cor-cad'
  | 'linha'
  | 'linetype'
  | 'espessura'
  | 'lineweight'
  | 'acao'
  | 'readonly';

export interface OpcaoPropriedade {
  id: string | number;
  rotulo: string;
}

export interface ItemPropriedade {
  id: string;
  rotulo: string;
  tipo: TipoPropriedade;
  /** Valor atual; `VALOR_MISTO` quando difere entre os objetos selecionados (exibe "Varia"). */
  valor: any;
  /** Atalho para `valor: VALOR_MISTO`: a propriedade difere entre os objetos selecionados. */
  misto?: boolean;
  unidade?: string;
  casasDecimais?: number;
  /** Menor valor aceito (números): digitação, setas e scrubber são limitados a ele. */
  min?: number;
  /** Maior valor aceito (números). */
  max?: number;
  /** Passo das setas ↑/↓ e do scrubber (números); padrão: 10^-casasDecimais ou 1. */
  passo?: number;
  opcoes?: OpcaoPropriedade[];
  placeholder?: string;
  somenteLeitura?: boolean;
  dica?: string;
  rotuloAcao?: string;
  textoAmostra?: string;
  onClickAcao?: (item: ItemPropriedade) => void;
}

export interface CategoriaPropriedades {
  id: string;
  titulo: string;
  aberto?: boolean;
  propriedades: ItemPropriedade[];
}

export interface SeletorTipoItem {
  id: string;
  rotulo: string;
  subtipo?: string;
  iconeSvg?: string;
}

export interface UIPropertyChangeDetail {
  id: string;
  categoriaId: string;
  valor: any;
  valorAnterior: any;
  todosValores: Record<string, any>;
}

export interface UIAplicarDetail {
  /** Todos os valores atuais. */
  valores: Record<string, any>;
  /** Só as propriedades que mudaram desde o último carregar/aplicar. */
  alterados: Record<string, any>;
}

export interface ContextoEditorPropriedade {
  obterValorAtual: (propId: string) => any;
  registrarAlteracao: (categoriaId: string, propId: string, novoValor: any) => void;
  focarProximoEditor: (elementoAtual: HTMLElement) => void;
  /** Shift+Enter: volta ao editor anterior. */
  focarEditorAnterior?: (elementoAtual: HTMLElement) => void;
  despacharEventoAcao: (prop: ItemPropriedade, categoriaId: string) => void;
  /** Texto exibido para valores mistos (atributo `texto-misto`); padrão "Varia". */
  obterTextoMisto?: () => string;
}
