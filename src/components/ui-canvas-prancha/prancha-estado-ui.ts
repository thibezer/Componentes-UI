import type { Par } from '../../gerencigeo-canvas/feature_types';
import type { ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import type { Guia, ResultadoSnapPrancha } from '../../gerencigeo-canvas/prancha/elemento_snap';
import type { LinhaGuiaInteligente } from '../../gerencigeo-canvas/prancha/guias_inteligentes';

/*
 * Estado efêmero da interação (o que a sobreposição desenha e não é documento): hover, caixa de seleção, elementos em
 * arrasto/transformação (substitutos temporários), prévia da ferramenta, snap, guias inteligentes, guia sendo arrastada,
 * pivô e âncoras selecionadas da seleção direta. Nada disto entra no histórico.
 */

export interface EstadoInterfacePrancha {
  hoverId: string | null;
  /** Caixa de seleção em mm; `crossing` = arrastada da direita para a esquerda. */
  caixaSelecao: { de: Par; ate: Par; crossing: boolean } | null;
  /** Elementos mostrados no lugar dos originais enquanto um gesto não termina (mover, alça, âncora). */
  substitutos: Map<string, ElementoGrafico>;
  /** Prévia da ferramenta de desenho (elemento ainda sem id definitivo). */
  previa: ElementoGrafico | null;
  /** Pontos já colocados pela polilinha/polígono/caneta (para marcar). */
  pontosPrevia: Par[];
  snap: ResultadoSnapPrancha | null;
  linhasInteligentes: LinhaGuiaInteligente[];
  /** Guia em arrasto (nova, vinda da régua, ou uma existente). */
  guiaArrastada: { guia: Guia; indice: number | null } | null;
  /** Pivô de rotação da seleção (mm); `null` = centro da caixa. */
  pivo: Par | null;
  /** Seleção direta: elemento em edição e índices das âncoras selecionadas. */
  edicao: { id: string; ancoras: number[] } | null;
  /** Texto curto perto do cursor (medidas ao vivo). */
  rotulo: { texto: string; em: Par } | null;
  /** Posição do ponteiro na folha (para as réguas marcarem). */
  ponteiro: Par | null;
  /** Cópias em arrasto (Alt + arrastar duplica): pintadas na sobreposição até soltar. */
  copiasEmGesto: ElementoGrafico[];
}

export function criarEstadoInterface(): EstadoInterfacePrancha {
  return {
    hoverId: null, caixaSelecao: null, substitutos: new Map(), previa: null, pontosPrevia: [], snap: null, linhasInteligentes: [],
    guiaArrastada: null, pivo: null, edicao: null, rotulo: null, ponteiro: null, copiasEmGesto: []
  };
}

/** Limpa tudo que é de um gesto (mantém pivô, edição e ponteiro). */
export function encerrarGesto(e: EstadoInterfacePrancha): void {
  e.caixaSelecao = null;
  e.substitutos = new Map();
  e.previa = null;
  e.pontosPrevia = [];
  e.snap = null;
  e.linhasInteligentes = [];
  e.guiaArrastada = null;
  e.rotulo = null;
  e.copiasEmGesto = [];
}
