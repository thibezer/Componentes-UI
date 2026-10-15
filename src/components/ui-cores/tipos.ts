/** Qual das duas cores de uma forma está em edição. */
export type AlvoCor = 'preenchimento' | 'traco';

/**
 * Cor aceita pelos componentes de cor: hexadecimal `#rrggbb` (ou `#rgb`) ou `'none'` (sem cor).
 * Internamente tudo é normalizado para `#rrggbb` minúsculo ou `'none'`.
 */
export type ValorCor = string;

/** Estado emitido pelo `<ui-seletor-cor>` a cada alteração, confirmação ou cancelamento. */
export interface DetalheSeletorCor {
  /** Alvo em edição no momento do evento. */
  alvo: AlvoCor;
  /** Cor do alvo em edição (no modo simples, a única cor). */
  cor: ValorCor;
  preenchimento: ValorCor;
  traco: ValorCor;
  /** Opacidade do preenchimento, de 0 a 1. */
  opacidade: number;
}

/** Opções de `abrirSeletorCor()`. */
export interface OpcoesSeletorCor {
  /** Elemento ao lado do qual o seletor aparece (à direita; à esquerda se não couber). */
  ancora: Element;
  titulo?: string;
  /**
   * `duplo` mostra as abas Preenchimento/Traço (exige `preenchimento` e `traco`);
   * `simples` edita uma única `cor`. Padrão: `duplo` quando `preenchimento` e `traco` são informados.
   */
  modo?: 'duplo' | 'simples';
  alvo?: AlvoCor;
  preenchimento?: ValorCor;
  traco?: ValorCor;
  /** Cor inicial do modo simples. */
  cor?: ValorCor;
  /** Opacidade inicial do preenchimento (0 a 1). Padrão 0.35. */
  opacidade?: number;
  /** Mostra o controle de opacidade. Padrão: só quando o alvo é o preenchimento. */
  mostrarOpacidade?: boolean;
  /** A cor inicial representa uma seleção com cores diferentes (mostra "MISTO"). */
  misto?: boolean;
  /** Cores extras oferecidas em "Cores do projeto" (duplicadas e inválidas são ignoradas). */
  coresProjeto?: ValorCor[];
  /** Substitui a paleta padrão. */
  paleta?: ValorCor[];
  /** Cada alteração (pré-visualização, ainda não confirmada). */
  aoAlterar?: (detalhe: DetalheSeletorCor) => void;
  /** Ao fechar confirmando: Concluir, ✕, Enter no hexadecimal, Esc ou clique fora. */
  aoConfirmar?: (detalhe: DetalheSeletorCor) => void;
  /** Ao cancelar: as cores iniciais são restauradas (com um `aoAlterar` antes) e não há confirmação. */
  aoCancelar?: (detalhe: DetalheSeletorCor) => void;
  /** Ao trocar de aba Preenchimento/Traço. */
  aoTrocarAlvo?: (alvo: AlvoCor) => void;
}

/** Controle de um seletor aberto por `abrirSeletorCor()`. */
export interface SeletorCorAberto {
  readonly elemento: HTMLElement;
  /** Fecha o seletor; com `confirmar` (padrão `true`) chama `aoConfirmar`. */
  fechar(confirmar?: boolean): void;
  readonly aberto: boolean;
}

/** Detalhe do evento `ui-cores-change` do `<ui-controle-cores>`. */
export interface DetalheControleCores {
  preenchimento: ValorCor;
  traco: ValorCor;
  opacidade: number;
  alvo: AlvoCor;
  /** `false` durante a pré-visualização no seletor; `true` quando a alteração deve ser gravada. */
  confirmado: boolean;
  /** Quais valores mudaram. */
  alterados: Array<'preenchimento' | 'traco' | 'opacidade'>;
  /** O que gerou a mudança. */
  origem: 'seletor' | 'inverter' | 'sem-cor' | 'padrao';
}

/** Textos de atalho exibidos nas dicas dos botões (o kit não registra os atalhos; quem usa decide). */
export interface AtalhosControleCores {
  alternar?: string;
  inverter?: string;
  semCor?: string;
  padrao?: string;
}
