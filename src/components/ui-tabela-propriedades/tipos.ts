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
  /** Alias para `casasDecimais`. */
  precisao?: number;
  /** Passo de incremento para teclado (ArrowUp/ArrowDown) e scrubber. */
  passo?: number;
  /** Alias para `passo`. */
  step?: number;
  /** Limite numérico mínimo permitido. */
  min?: number;
  /** Limite numérico máximo permitido. */
  max?: number;
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
  /** Alias para `aberto`. */
  aberta?: boolean;
  icone?: string;
  propriedades: ItemPropriedade[];
}

export interface SeletorTipoItem {
  id: string;
  rotulo: string;
  subtipo?: string;
  iconeSvg?: string;
}

export interface UIAplicarDetail {
  /** Todos os valores atuais. */
  valores: Record<string, any>;
  /** Só as propriedades que mudaram desde o último carregar/aplicar. */
  alterados: Record<string, any>;
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
  focarEditorAnterior?: (elementoAtual: HTMLElement) => void;
  despacharEventoAcao: (prop: ItemPropriedade, categoriaId: string) => void;
  /** Texto exibido para valores mistos (atributo `texto-misto`); padrão "Varia". */
  obterTextoMisto?: () => string;
  /** Textos fixos personalizáveis (propriedade `textos` do painel). */
  obterTexto?: (chave: keyof TextosPropriedades) => string;
}

export interface EstadoPersistidoPropriedades {
  versao: number;
  /** Mapa `categoriaId -> aberto` das preferências de expansão salvas. */
  categorias: Record<string, boolean>;
  ultimaAtualizacao?: number;
}

export interface UICategoriasEstadoDetail {
  /** Mapa `categoriaId -> aberto` das categorias atuais e lembradas. */
  estado: Record<string, boolean>;
  abertas: string[];
  fechadas: string[];
}

export interface DefinirEstadoCategoriasOpcoes {
  persistir?: boolean;
  emitirEvento?: boolean;
}

/** Textos fixos do painel, para tradução/personalização (propriedade `textos`). */
export interface TextosPropriedades {
  vazio: string;
  /** Use `{termo}` onde o texto buscado deve aparecer. */
  vazioBusca: string;
  sim: string;
  nao: string;
  editarAcao: string;
  selecionarCor: string;
  editarTipo: string;
  tipoFamilia: string;
  restaurarValor: string;
  filtroPlaceholder: string;
  aplicar: string;
  desfazer: string;
  ajuda: string;
}

export const TEXTOS_PADRAO: Readonly<TextosPropriedades> = Object.freeze({
  vazio: 'Nenhuma propriedade disponível.',
  vazioBusca: 'Nenhuma propriedade encontrada para "{termo}".',
  sim: 'Sim',
  nao: 'Não',
  editarAcao: 'Editar...',
  selecionarCor: 'Selecionar cor...',
  editarTipo: 'Editar tipo',
  tipoFamilia: 'Tipo de Família',
  restaurarValor: 'Restaurar valor original',
  filtroPlaceholder: 'Filtrar propriedades...',
  aplicar: 'Aplicar',
  desfazer: 'Desfazer',
  ajuda: 'Ajuda de propriedades'
});

/** Lê um texto personalizado do host (que expõe `obterTexto`), com o padrão como reserva. */
export function textoDoHost(host: unknown, chave: keyof TextosPropriedades): string {
  const fn = (host as { obterTexto?: (c: keyof TextosPropriedades) => string } | null)?.obterTexto;
  if (typeof fn === 'function') {
    try {
      const t = fn.call(host, chave);
      if (typeof t === 'string' && t) return t;
    } catch (_e) {}
  }
  return TEXTOS_PADRAO[chave];
}
