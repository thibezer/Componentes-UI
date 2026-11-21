import type { Par } from '../feature_types';

/*
 * Contrato do espaço de coordenadas (L2, puro). O núcleo de formas (métricas, formas, algoritmos, edição, desenho, caixa,
 * índice) recebe um `Espaco` opcional; sem ele, vale o geográfico de sempre (`ESPACO_GEOGRAFICO`), bit a bit igual ao
 * comportamento anterior. O plano (`ESPACO_PLANO`) é a folha da prancha: `[x, y]` em mm, y para baixo.
 *
 * Tudo que um espaço devolve está na unidade dele (`unidade`): metros no geográfico, mm no plano.
 */

export type TipoEspaco = 'geografico' | 'plano';

/** Coordenadas de um plano cartesiano local (x, y), na unidade do espaço. */
export type XY = [number, number];

/** Plano local em torno de um ponto de referência: onde os algoritmos (dividir, juntar, buffer) fazem as contas. */
export interface PlanoLocal {
  paraXY(p: Par): XY;
  deXY(p: XY): Par;
}

export interface Espaco {
  readonly tipo: TipoEspaco;
  /** Unidade das medidas devolvidas: `'m'` (geográfico) ou `'mm'` (plano). */
  readonly unidade: 'm' | 'mm';
  /** Distância entre dois pontos. */
  distancia(a: Par, b: Par): number;
  /** Comprimento de uma poligonal; `fechado` soma o trecho que volta ao primeiro (com 3+ pontos). */
  comprimento(pts: Par[], fechado?: boolean): number;
  /** Área do polígono (primeiro anel externo, os demais são furos), nunca negativa. */
  area(aneis: Par[][]): number;
  /** Plano local em torno de `ref` (relativo a ele) para algoritmos geométricos. */
  planoLocal(ref: Par): PlanoLocal;
  /** Ponto deslocado: geográfico = `dx` m para leste e `dy` m para norte; plano = `+dx` em x e `+dy` em y (para baixo). */
  deslocar(p: Par, dx: number, dy: number): Par;
  /** Alça da borda do círculo usada pelo editor (a leste/à direita do centro, a `raio` de distância). */
  pontoDaBorda(centro: Par, raio: number): Par;
  /**
   * Ponto a `raio` do centro usado para MEDIR o raio em px (caixa de seleção e hit-test). No geográfico é a aproximação
   * esférica para o norte (111 320 m/°) que esses módulos sempre usaram; no plano é o mesmo da borda.
   */
  pontoDeMedidaDoRaio(centro: Par, raio: number): Par;
  /** Dois cantos opostos que envolvem o círculo (para o envelope). */
  extremosDoCirculo(centro: Par, raio: number): [Par, Par];
  /** Fator aplicado ao eixo 1 das formas regulares (o `cos(lat)` do geográfico; 1 no plano). Nunca 0. */
  fatorEixo(ref: Par): number;
}
