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

export interface ContextoEditorPropriedade {
  obterValorAtual: (propId: string) => any;
  registrarAlteracao: (categoriaId: string, propId: string, novoValor: any) => void;
  focarProximoEditor: (elementoAtual: HTMLElement) => void;
  despacharEventoAcao: (prop: ItemPropriedade, categoriaId: string) => void;
  /** Texto exibido para valores mistos (atributo `texto-misto`); padrão "Varia". */
  obterTextoMisto?: () => string;
}
