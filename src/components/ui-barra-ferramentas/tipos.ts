/**
 * Tipos compartilhados pelos componentes de barra de ferramentas:
 *  - <ui-ribbon>              → barra contextual com abas e grupos
 *  - <ui-paleta-ferramentas>  → paleta de ferramentas com flyouts expansíveis
 */

/**
 * - `botao`      ação pontual (Desfazer, Colar…). Padrão no ribbon.
 * - `toggle`     liga/desliga de forma independente (Negrito, Grade…).
 * - `ferramenta` seleção exclusiva: só uma ativa por vez (Mover, Linha…). Padrão na paleta.
 * - `menu`       abre um menu com `filhos` (ribbon).
 * - `separador`  divisor visual.
 */
export type TipoFerramenta = 'botao' | 'toggle' | 'ferramenta' | 'menu' | 'separador';

export interface FerramentaItem {
  id: string;
  rotulo?: string;
  /** Nome de um ícone do <ui-icone> ou um trecho `<svg>…</svg>` confiável. */
  icone?: string;
  /** Tecla de atalho exibida no tooltip/menu. Na paleta, com o atributo `atalhos`, também é ativa. */
  atalho?: string;
  tipo?: TipoFerramenta;
  ativo?: boolean;
  disabled?: boolean;
  /**
   * Nome acessível (leitor de tela) quando não há `rotulo` visível (ex.: botões só de ícone).
   * Sem ele e sem `rotulo`, usa-se o nome do ícone e, por último, o `id`.
   */
  rotuloAcessivel?: string;
  /** Apenas ribbon: botão grande (ícone sobre o rótulo) ou pequeno (em colunas de 3). Padrão: 'pequeno'. */
  tamanho?: 'grande' | 'pequeno';
  /** Apenas ribbon: oculta o rótulo em botões pequenos. */
  somenteIcone?: boolean;
  /** Ribbon: itens do menu suspenso. Paleta: ferramentas agrupadas (flyout). */
  filhos?: FerramentaItem[];
  /**
   * Ribbon: botão dividido (split button). A ação principal dispara no clique do corpo
   * e a seta abre o menu suspenso com os `filhos`.
   */
  dividido?: boolean;
}

export interface RibbonGrupo {
  id: string;
  rotulo: string;
  itens: FerramentaItem[];
  /**
   * Prioridade para colapso automático quando a largura é insuficiente (estilo Office).
   * Grupos de menor prioridade viram um botão único com flyout primeiro. Padrão: 0.
   */
  prioridade?: number;
  /** Ícone exibido quando o grupo for colapsado em um botão de flyout. */
  icone?: string;
  /**
   * Exibe um botão "lançador de diálogo" no canto inferior do grupo (estilo Office Dialog Box Launcher).
   * Pode ser `true` ou o identificador/ação a disparar.
   */
  lancadorDialogo?: boolean | string;
  /** Rótulo acessível para o botão lançador de diálogo. Padrão: "Mais opções de [rotulo]". */
  rotuloLancador?: string;
  /**
   * Quando `true` (padrão para grupos com ferramentas no ribbon), garante exclusividade
   * de seleção entre itens `tipo: 'ferramenta'` dentro do mesmo grupo.
   * Defina como `false` para desativar a exclusividade automática no grupo.
   */
  exclusivo?: boolean;
}

export interface RibbonAba {
  id: string;
  rotulo: string;
  grupos: RibbonGrupo[];
  /** Aba contextual (destacada, ex.: "Edição de Polilinha"). */
  contextual?: boolean;
  /** Aba oculta até ser habilitada via `definirAbaVisivel`. */
  oculta?: boolean;
}

export interface FerramentaDetail {
  id: string;
  item: FerramentaItem;
  /** Item pai quando o disparo veio de um menu/flyout. */
  pai?: FerramentaItem;
  /** Estado atual para itens `toggle` / `ferramenta`. */
  ativo?: boolean;
  origem: 'ribbon' | 'paleta';
  /** Apenas ribbon: id da aba ativa no momento do disparo. */
  aba?: string;
}

/** `detail` de `ui-aba-change`. */
export interface AbaChangeDetail {
  id: string;
  aba: RibbonAba;
}

/** `detail` de `ui-change` / `ui-selecionar` da paleta. `item` é `null` quando a seleção é limpa (`valor = ''`). */
export interface PaletaChangeDetail {
  valor: string;
  item: FerramentaItem | null;
  anterior: string;
}

/** `detail` de `ui-recolhido-change` do ribbon. */
export interface RecolhidoChangeDetail {
  recolhido: boolean;
}

/** `detail` de `ui-grupo-dialogo` do ribbon (lançador de diálogo do grupo). */
export interface GrupoDialogoDetail {
  id: string;
  grupo: RibbonGrupo;
}

declare global {
  interface HTMLElementEventMap {
    /** Cancelável: `preventDefault()` reverte o toggle / a seleção feita pelo clique. */
    'ui-ferramenta': CustomEvent<FerramentaDetail>;
    'ui-aba-change': CustomEvent<AbaChangeDetail>;
    'ui-recolhido-change': CustomEvent<RecolhidoChangeDetail>;
    'ui-change': CustomEvent<PaletaChangeDetail>;
    'ui-selecionar': CustomEvent<PaletaChangeDetail>;
    'ui-grupo-dialogo': CustomEvent<GrupoDialogoDetail>;
  }
}

