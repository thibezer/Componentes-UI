import type { OpcoesPredefinicao } from '../../gerencigeo-canvas/prancha/elemento_predefinicoes';
import type { Par } from '../../gerencigeo-canvas/feature_types';
import type { AparenciaElemento, CamadaPrancha, ElementoGrafico, PontaSeta } from '../../gerencigeo-canvas/prancha/tipos';
import type { Guia } from '../../gerencigeo-canvas/prancha/elemento_snap';
import type { MotivoRecusaElemento } from '../../gerencigeo-canvas/prancha/elemento_validacao';

/* Contratos públicos do `<ui-canvas-prancha>`: ferramentas, opções, lotes e `detail` dos eventos `prancha-*`. */

export const FERRAMENTAS_PRANCHA = [
  'selecao', 'selecao-direta', 'mao', 'retangulo', 'elipse', 'poligono-regular', 'estrela', 'linha', 'seta',
  'polilinha', 'poligono', 'caneta', 'texto',
  // Fase 4
  'conta-gotas', 'adicionar-ancora', 'excluir-ancora', 'converter-ancora'
] as const;

export type FerramentaPrancha = (typeof FERRAMENTAS_PRANCHA)[number];

export function ehFerramentaPrancha(v: unknown): v is FerramentaPrancha {
  return typeof v === 'string' && (FERRAMENTAS_PRANCHA as readonly string[]).includes(v);
}

/** Opções das ferramentas de desenho (o que o painel de propriedades do app ajusta antes de desenhar). */
export interface OpcoesFerramentasPrancha {
  /** Aparência dos elementos novos (padrão: traço preto de 0,25 mm, sem preenchimento). */
  aparencia?: AparenciaElemento;
  /** Retângulo: raio dos cantos em mm (padrão 0). */
  raioCantos?: number;
  /** Polígono regular: lados (padrão 6). */
  lados?: number;
  /** Estrela: pontas (padrão 5) e raio interno sobre o externo (padrão 0,45). */
  pontas?: number;
  proporcaoInterna?: number;
  /** Seta: estilo da ponta (padrão triângulo cheio). */
  ponta?: PontaSeta;
  /** Texto: corpo em mm (padrão 12 pt) e texto inicial (padrão "Texto"). */
  tamanhoTexto?: number;
  textoPadrao?: string;
}

/** Por que a mudança aconteceu (vem em `prancha-elemento-*`). */
export type MotivoAlteracaoPrancha =
  | 'ferramenta' | 'mover' | 'transformar' | 'editar-ancoras' | 'teclado' | 'remover' | 'desfazer' | 'refazer' | 'comando'
  | 'predefinicao' | 'texto' | 'cantos'
  // Fase 4: organização e operações
  | 'ordem' | 'agrupar' | 'desagrupar' | 'bloquear' | 'ocultar' | 'alinhar' | 'distribuir' | 'duplicar' | 'colar' | 'recortar'
  | 'conta-gotas' | 'aparencia' | 'camada' | 'mascara' | 'unir' | 'dividir' | 'deslocar-caminho' | 'simplificar' | 'contorno-traco'
  | 'converter-caminho'
  // Fase 5
  | 'pathfinder'
  // Fase 6: painéis (propriedades e camadas)
  | 'propriedades';

export type MotivoRecusaPrancha =
  | MotivoRecusaElemento | 'bloqueado' | 'texto-sem-ancoras' | 'matriz-singular' | 'sem-selecao' | 'nada-a-desfazer'
  | 'nada-a-refazer' | 'comando-desconhecido' | 'forma-pequena' | 'somente-leitura' | 'minimo-de-ancoras' | 'tipo-nao-suportado'
  | 'resultado-vazio';

export interface DetalheElementosPrancha {
  elementos: ElementoGrafico[];
  motivo: MotivoAlteracaoPrancha;
}

export interface DetalheRemovidosPrancha {
  ids: string[];
  elementos: ElementoGrafico[];
  motivo: MotivoAlteracaoPrancha;
}

export interface DetalheSelecaoPrancha {
  ids: string[];
  elementos: ElementoGrafico[];
}

export interface DetalheFerramentaPrancha {
  ferramenta: FerramentaPrancha;
}

export interface DetalheEdicaoPrancha {
  elemento: ElementoGrafico;
}

export interface DetalheRecusaPrancha {
  acao: string;
  motivo: MotivoRecusaPrancha;
  id?: string;
}

/** Opções de `inserirPredefinicao`: as da pré-definição e `quadro`. */
export interface OpcoesInserirPredefinicao extends OpcoesPredefinicao {
  /** `'margens'`: usa o quadro das margens da folha (atributo `margens`) como caixa quando `caixa` é omitida (retângulo, moldura dupla). */
  quadro?: 'margens';
}

/** `prancha-modificado`: só nas transições de `modificado`. */
export interface DetalheModificadoPrancha { modificado: boolean; revisao: number }

/** Opções de `ajustarElementos`. */
export interface OpcoesAjustarElementos {
  /** Margem em px em volta (padrão 48). */
  margem?: number;
  /** Teto de zoom em % (100 = tamanho real): um elemento pequeno não é ampliado além disso. Padrão 800. */
  zoomMaximo?: number;
}

export interface DetalheVistaPrancha {
  /** px de tela por mm. */
  zoom: number;
  /** Zoom em % (100% = tamanho real a 96 dpi). */
  zoomPercentual: number;
  /** Posição (px) da origem da folha na área de desenho. */
  pan: Par;
}

/** `prancha-ordem`: a ordem de empilhamento mudou (ids de trás para a frente). */
export interface DetalheOrdemPrancha {
  ids: string[];
  motivo: MotivoAlteracaoPrancha;
}

/** `prancha-camadas`: as camadas foram definidas (normalizadas). */
export interface DetalheCamadasPrancha {
  camadas: CamadaPrancha[];
}

/** `prancha-isolamento`: grupo isolado (duplo clique), ou `null` ao sair. */
export interface DetalheIsolamentoPrancha {
  grupoId: string | null;
}

/** `prancha-conta-gotas`: a aparência amostrada (aplicada à seleção ou guardada para as formas novas). */
export interface DetalheContaGotasPrancha {
  elemento: ElementoGrafico;
  aparencia: AparenciaElemento | undefined;
}

export interface DetalheHistoricoPrancha {
  podeDesfazer: boolean;
  podeRefazer: boolean;
}

export interface DetalheGuiasPrancha {
  guias: Guia[];
}

export interface DetalhePonteiroPrancha {
  /** Posição do ponteiro na folha (mm), ou `null` ao sair. */
  coordenada: Par | null;
}

/** `prancha-texto-solicitado` (cancelável): o app pode abrir o próprio campo e chamar `concluir(texto)`. */
export interface DetalheTextoSolicitadoPrancha {
  posicao: Par;
  concluir(texto: string): ElementoGrafico | null;
}

/** Lote de sincronização (o app manda as mudanças de uma vez, nunca um laço de adições). */
export interface LotePrancha {
  adicionar?: unknown[];
  atualizar?: unknown[];
  remover?: string[];
}

export interface ResultadoLotePrancha {
  adicionados: string[];
  atualizados: string[];
  removidos: string[];
  recusados: Array<{ indice?: number; id?: string; motivo: MotivoRecusaPrancha }>;
}

export interface OpcoesDadosPrancha {
  /** A mudança entra no desfazer/refazer (padrão: sim; `definirElementos` recomeça o histórico). */
  historico?: boolean;
}

/** Comando pelo `ui-bus` (canal `prancha:comando`). `alvo` = id do elemento host; sem alvo, vale para todas as pranchas. */
export interface ComandoPrancha {
  alvo?: string;
  comando: string;
  args?: unknown[];
}

export const CANAL_COMANDOS_PRANCHA = 'prancha:comando';
