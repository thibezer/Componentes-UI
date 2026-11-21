import type { Par } from '../feature_types';

/*
 * Contratos das operações booleanas de polígonos (Pathfinder), L2 puro. As coordenadas são planas e sem unidade: mm na
 * prancha; no mapa, graus como plano local (boa aproximação em áreas pequenas).
 */

/** União, subtração (a primeira região menos todas as outras), interseção e exclusão (XOR: sobreposição par sai). */
export type OperacaoBooleana = 'uniao' | 'subtracao' | 'intersecao' | 'exclusao';

export const OPERACOES_BOOLEANAS: readonly OperacaoBooleana[] = ['uniao', 'subtracao', 'intersecao', 'exclusao'];

export type RegraPreenchimento = 'nonzero' | 'evenodd';

/**
 * Uma região de entrada: anéis (abertos ou fechados, em qualquer sentido) e a regra que define o "dentro". Anéis que se
 * cruzam, furos, partes separadas e arestas repetidas são aceitos: o que vale é a regra de preenchimento.
 */
export interface RegiaoBooleana {
  aneis: ReadonlyArray<ReadonlyArray<Par>>;
  /** Padrão `'nonzero'`. */
  regra?: RegraPreenchimento;
}

/** Polígono do resultado: o anel externo (área positiva, sentido anti-horário matemático) e os furos (sentido oposto). */
export interface PoligonoBooleano {
  exterior: Par[];
  furos: Par[][];
}

export interface OpcoesBooleana {
  /**
   * Distância de fusão de vértices, RELATIVA ao maior lado da caixa de todas as entradas (padrão 1e-9, entre 1e-12 e
   * 1e-3). Pontos mais perto que isso viram o mesmo vértice; é o que torna o algoritmo robusto a toques e colinearidades.
   */
  tolerancia?: number;
}

export interface EstatisticasBooleana {
  /** Arestas de entrada válidas. */
  segmentos: number;
  /** Pontos de corte achados (cruzamentos, toques e sobreposições). */
  cortes: number;
  /** Pedaços de aresta classificados. */
  pecas: number;
  /** Pedaços que viraram borda do resultado. */
  bordas: number;
  /** Anéis montados (externos e furos). */
  aneis: number;
  /** Cadeias abertas ou furos sem anel externo, descartados (só em casos numéricos extremos). */
  descartados: number;
}

export interface ResultadoBooleana {
  poligonos: PoligonoBooleano[];
  estatisticas: EstatisticasBooleana;
}
