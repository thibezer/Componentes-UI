/*
 * Modelo único de feição do canvas CAD (Fase 0 da migração do MapEngine).
 * Coordenadas internas sempre em [lat, lon], já normalizadas.
 */

export type TipoFeicao = 'Point' | 'LineString' | 'Polygon' | 'Circle' | 'Text';

export type StatusGeometria = 'oficial' | 'previa';

/** [lat, lon] */
export type LatLonPar = [number, number];

export type GeometriaFeicao =
  | { tipo: 'Point'; coordenada: LatLonPar }
  /**
   * Linha. Multiparte (MultiLineString): `partes` traz todas (2 ou mais) e `coordenadas` repete a primeira, de modo que
   * quem só conhece `coordenadas` continua vendo uma linha válida. Use `partesDaLinha` para ler sempre todas as partes.
   */
  | { tipo: 'LineString'; coordenadas: LatLonPar[]; partes?: LatLonPar[][] }
  /** O primeiro anel é o externo; os demais são furos. Anéis ficam abertos (sem repetir o primeiro vértice). */
  | { tipo: 'Polygon'; aneis: LatLonPar[][] }
  | { tipo: 'Circle'; centro: LatLonPar; raioMetros: number }
  | { tipo: 'Text'; coordenada: LatLonPar; texto: string };

export type GeometriaLinha = Extract<GeometriaFeicao, { tipo: 'LineString' }>;

/** Todas as partes da linha (uma só quando é simples). */
export function partesDaLinha(g: GeometriaLinha): LatLonPar[][] {
  return g.partes && g.partes.length > 1 ? g.partes : [g.coordenadas];
}

export function ehMultilinha(g: GeometriaFeicao): boolean {
  return g.tipo === 'LineString' && !!g.partes && g.partes.length > 1;
}

/** Monta a linha a partir das partes já válidas: uma parte vira linha simples; duas ou mais, multiparte. */
export function criarLinha(partes: LatLonPar[][]): GeometriaLinha {
  return partes.length > 1
    ? { tipo: 'LineString', coordenadas: partes[0], partes }
    : { tipo: 'LineString', coordenadas: partes[0] };
}

export interface EstiloFeicao {
  corPreenchimento?: string;
  opacidadePreenchimento?: number;
  corTraco?: string;
  espessuraTraco?: number;
  dashArray?: string;
  icone?: string;
  tamanhoIcone?: number;
  rotacaoIcone?: number;
  mostrarRotulo?: boolean;
  campoRotulo?: string;
  /** Texto: contorno claro/escuro em volta para legibilidade sobre o satélite. */
  halo?: boolean;
  /** Texto: tamanho da fonte em px. */
  tamanhoFonte?: number;
  /** Texto: cor do fundo do selo (etiqueta). Com ela, o selo substitui o `halo`. Só hex, rgb/hsl ou nome de cor. */
  corFundo?: string;
  /** Texto: cor da borda do selo (1 px). */
  corBorda?: string;
  /** Texto: opacidade do fundo do selo, de 0 a 1 (padrão 0,85); a borda e o texto ficam opacos. */
  opacidadeFundo?: number;
  /** Texto: raio dos cantos do selo em px (padrão 4). */
  raioBorda?: number;
  /** Ponto sem ícone: cor do contorno, separada do preenchimento (`corPreenchimento`) e de `corTraco`. */
  corContorno?: string;
  /** Ponto sem ícone: espessura do contorno em px (0 = sem contorno). */
  espessuraContorno?: number;
}

export interface Feicao {
  id: string;
  camadaId: string;
  geometria: GeometriaFeicao;
  estilo?: EstiloFeicao;
  propriedades: Record<string, unknown>;
  bloqueada?: boolean;
  /** Oficial ou prévia; ver `feature_versoes.ts` (também lido de `propriedades.status`/`tipo_geometria`). */
  status?: StatusGeometria;
  /** Agrupa a geometria oficial e as prévias da mesma coisa. Sem isto, a feição é a própria entidade. */
  entidadeId?: string;
  /** Foi removida: some de tudo (desenho, seleção, snap, versões) e encerra edição/popup. */
  excluida?: boolean;
  /**
   * Oculta, mas existe: não é desenhada nem selecionada (clique, caixa, laço, hit-test, hover) e não atrai snap,
   * não entra em `ajustarTudo`; segue nos dados (`obterFeicoes`, atualizações), não encerra edição e conta na
   * regra oficial × prévia como qualquer outra.
   */
  oculta?: boolean;
}
