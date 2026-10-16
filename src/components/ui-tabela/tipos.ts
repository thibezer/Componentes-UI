/**
 * Tipos e interfaces de configuração para a Tabela Técnica de Alta Densidade (<ui-tabela>).
 */

export type DensidadeTabela = 'compacta' | 'normal' | 'relaxada';

export interface TabelaColuna<T = any> {
  id: string;
  rotulo: string;
  largura?: string | number;
  larguraMinima?: string | number;
  larguraMaxima?: string | number;
  alinhamento?: 'esquerda' | 'centro' | 'direita' | 'left' | 'center' | 'right';
  ordenavel?: boolean;
  tooltip?: string;
  /** Tipo do dado, usado só na ordenação local: `data` aceita Date, ISO e dd/mm/aaaa. Padrão: inferido pelo valor. */
  tipo?: 'texto' | 'numero' | 'data' | 'booleano';
  /** Comparador próprio para a ordenação local (sentido crescente; a direção é aplicada pela tabela). */
  comparador?: (a: any, b: any, itemA: T, itemB: T) => number;
  /** Texto pesquisável da célula (o filtro padrão olha o valor bruto); útil quando `render` formata o valor. */
  textoFiltro?: (valor: any, item: T) => string;
  render?: (valor: any, item: T, index: number) => HTMLElement | string;
}

export interface UISortDetail {
  idColuna: string | null;
  direcao: 'asc' | 'desc' | 'original';
}

export interface UIColumnResizeDetail {
  idColuna: string;
  largura: string;
}

export interface UIRowScrollOptions {
  comportamento?: 'smooth' | 'auto';
  selecionar?: boolean;
  /** Trata o valor apenas como índice da linha exibida, nunca como ID (evita ambiguidade com IDs numéricos). */
  porIndice?: boolean;
}

export interface UISelecaoRemovidaDetail {
  /** Item que estava selecionado e deixou de existir nos dados. */
  item: Record<string, any>;
}

export interface UIFetchErroDetail {
  url: string;
  erro: string;
  /** Código HTTP quando a falha veio de uma resposta; undefined em falha de rede/JSON/render. */
  status?: number;
  origem: 'rede' | 'http' | 'json' | 'render';
}

/** Substitui o `fetch` do modo remoto (autenticação, interceptadores, mocks). */
export type TabelaFetcher = (url: string, init: RequestInit) => Promise<Response>;
