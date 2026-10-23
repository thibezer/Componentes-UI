import estilos from './ui-paleta-ferramentas.css?inline';
import estilosComuns from './ferramentas-comum.css?inline';
import { ListenerBag } from '../../core/listener-bag';
import type { FerramentaItem } from './tipos';
import {
  abrirMenu,
  acharItem,
  aplicarEstadoBotao,
  atualizarRoving,
  avisarIdsDuplicados,
  coletarIds,
  correspondeAtalho,
  criarBotaoFerramenta,
  definirRoving,
  GerenciadorTooltip,
  navegarGrade2Colunas,
  navegarRoving,
  seguirFoco,
  type MenuHandle
} from './ferramentas-comum';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

const TEMPO_PRESSAO_LONGA_MS = 380;
const DISTANCIA_CANCELA_PRESSAO_PX = 8;
const TEMPO_LIMPA_SUPRESSAO_MS = 50;
const TAMANHO_ICONE: Record<string, number> = { sm: 16, md: 18, lg: 22 };

/**
 * <ui-paleta-ferramentas> — paleta de ferramentas gráficas com grupos expansíveis.
 *
 * - Itens com `filhos` viram um grupo: mostra a última ferramenta usada e abre um flyout
 *   com clique longo, botão direito ou seta (→ na vertical, ↓ na horizontal).
 * - Ferramentas (`tipo` padrão) são exclusivas; `toggle` liga/desliga; `botao` só dispara ação.
 * - Com o atributo `atalhos`, a tecla `atalho` do item ativa a ferramenta; teclas repetidas
 *   entre itens percorrem o grupo.
 *
 * Atributos: valor (vazio limpa a seleção), orientacao (vertical|horizontal), colunas (1|2),
 *            tamanho (sm|md|lg), atalhos, aria-label (rótulo da toolbar)
 * Propriedades: ferramentas, valor, orientacao, colunas, tamanho
 * Métodos: ativar(id), limpar(), atualizarItem(id, parcial)
 * Eventos: ui-change / ui-selecionar { valor, item, anterior },
 *          ui-ferramenta { id, item, pai?, ativo?, origem } (cancelável: preventDefault reverte a ação)
 *
 * `valor` pode ser definido antes de `ferramentas`: fica pendente até a ferramenta existir.
 */
export class UIPaletaFerramentas extends SafeHTMLElement {
  static get observedAttributes() {
    return ['valor', 'value', 'orientacao', 'colunas', 'tamanho', 'size', 'aria-label', 'copiar-dados', 'modo-controlado'];
  }

  private rootElement: HTMLDivElement;
  private _ferramentas: FerramentaItem[] = [];
  private _ativo = '';
  private _pendente = '';
  private visiveis = new Map<string, string>(); // id do grupo → id do filho exibido
  private menu: MenuHandle | null = null;
  private timerPressao: number | undefined;
  private timerSupressao: number | undefined;
  private inicioPressao: { x: number; y: number } | null = null;
  private suprimirClique = false;
  private listeners = new ListenerBag();
  private tooltip: GerenciadorTooltip | null = null;
  private _modoControlado = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilosComuns}${estilos}</style>
      <div class="ui-paleta ui-paleta--vertical" role="toolbar" aria-orientation="vertical" aria-label="Ferramentas"></div>
    `;
    this.rootElement = shadow.querySelector('.ui-paleta')!;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.tooltip?.destruir();
    this.tooltip = new GerenciadorTooltip(this.shadowRoot!, this.rootElement);

    this.listeners.add(this.rootElement, 'click', this.handleClick);
    this.listeners.add(this.rootElement, 'pointerdown', this.handlePointerDown);
    this.listeners.add(this.rootElement, 'pointermove', this.handlePointerMove);
    this.listeners.add(this.rootElement, 'pointerup', this.handlePointerFim);
    this.listeners.add(this.rootElement, 'pointerleave', this.handlePointerFim);
    this.listeners.add(this.rootElement, 'pointercancel', this.handlePointerFim);
    this.listeners.add(this.rootElement, 'contextmenu', this.handleContextMenu);
    this.listeners.add(this.rootElement, 'keydown', this.handleKeyDown);
    this.listeners.add(this.rootElement, 'focusin', this.handleFocusIn);
    this.listeners.add(document, 'keydown', this.handleAtalho);

    const inicial = this.getAttribute('valor') || this.getAttribute('value');
    if (inicial && !this._ativo) this._pendente = inicial;
    this.aplicarPendente();
    this.renderizar();
  }

  disconnectedCallback() {
    this.cancelarPressao();
    window.clearTimeout(this.timerSupressao);
    this.suprimirClique = false;
    this.fecharMenu();
    this.tooltip?.destruir();
    this.tooltip = null;
    this.listeners.cleanup();
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (old === value) return;
    if (name === 'valor' || name === 'value') {
      const v = this.getAttribute('valor') || this.getAttribute('value') || '';
      if (!v) this.limpar(false);
      else if (v !== this._ativo) this.ativar(v, false);
    } else {
      this.renderizar();
    }
  }

  /* ---------- API pública ---------- */

  /**
   * Quando `true` ou atributo `copiar-dados` / `modo-controlado`: clona a árvore de itens
   * para não mutar os objetos fornecidos pelo consumidor (Item 11).
   */
  get modoControlado(): boolean {
    return this._modoControlado || this.hasAttribute('modo-controlado') || this.hasAttribute('copiar-dados');
  }

  set modoControlado(val: boolean) {
    this._modoControlado = !!val;
  }

  get copiarDados(): boolean {
    return this.modoControlado;
  }

  set copiarDados(val: boolean) {
    this.modoControlado = val;
  }

  get ferramentas(): FerramentaItem[] {
    return this._ferramentas;
  }

  set ferramentas(val: FerramentaItem[]) {
    const lista = Array.isArray(val) ? val : [];
    this._ferramentas = this.modoControlado
      ? lista.map(f => ({ ...f, filhos: f.filhos?.map(c => ({ ...c })) }))
      : lista;
    avisarIdsDuplicados(coletarIds(this._ferramentas), '<ui-paleta-ferramentas> ferramentas');
    this.visiveis.clear();
    if (this._pendente) this.aplicarPendente();
    else if (this._ativo) this.definirAtivoInterno(this._ativo);
    this.renderizar();
  }

  get valor(): string {
    return this._ativo;
  }

  set valor(id: string) {
    this.ativar(id);
  }

  get value(): string {
    return this.valor;
  }

  set value(id: string) {
    this.valor = id;
  }

  get orientacao(): 'vertical' | 'horizontal' {
    return this.getAttribute('orientacao') === 'horizontal' ? 'horizontal' : 'vertical';
  }

  set orientacao(val: 'vertical' | 'horizontal') {
    this.setAttribute('orientacao', val);
  }

  get colunas(): 1 | 2 {
    return this.getAttribute('colunas') === '2' ? 2 : 1;
  }

  set colunas(val: 1 | 2) {
    this.setAttribute('colunas', String(val));
  }

  get tamanho(): 'sm' | 'md' | 'lg' {
    const t = this.getAttribute('tamanho') || this.getAttribute('size') || 'md';
    return t === 'sm' || t === 'lg' ? t : 'md';
  }

  set tamanho(val: 'sm' | 'md' | 'lg') {
    this.setAttribute('tamanho', val);
  }

  /**
   * Ativa uma ferramenta (exclusiva). Se estiver dentro de um grupo, ela passa a ser a exibida.
   * `id` vazio limpa a seleção. Se as `ferramentas` ainda não foram definidas, o valor fica pendente.
   */
  public ativar(id: string, emitir: boolean = true) {
    if (!id) {
      this.limpar(emitir);
      return;
    }
    const item = acharItem(this._ferramentas, id);
    if (!item) {
      if (this._ferramentas.length) {
        console.warn(`[ui-paleta-ferramentas] ativar("${id}"): ferramenta não encontrada.`);
      } else {
        this._pendente = id; // ferramentas ainda não carregadas
      }
      return;
    }
    if (item.disabled || (item.tipo ?? 'ferramenta') !== 'ferramenta') {
      console.warn(`[ui-paleta-ferramentas] ativar("${id}"): só ferramentas habilitadas (tipo "ferramenta") podem ser ativadas.`);
      return;
    }

    this._pendente = '';
    const anterior = this._ativo;
    this.definirAtivoInterno(id);
    this.refletirValor(id);
    this.renderizar();

    if (emitir && anterior !== id) this.emitirMudanca(id, item, anterior);
  }

  /** Remove a seleção atual (nenhuma ferramenta ativa). Equivale a `valor = ''`. */
  public limpar(emitir: boolean = true) {
    const anterior = this._ativo;
    if (!anterior && !this._pendente) return;
    this._ativo = '';
    this._pendente = '';
    this.removeAttribute('valor');
    this.removeAttribute('value');
    this.renderizar();
    if (emitir && anterior) this.emitirMudanca('', null, anterior);
  }

  public atualizarItem(id: string, parcial: Partial<FerramentaItem>) {
    const item = acharItem(this._ferramentas, id);
    if (!item) {
      console.warn(`[ui-paleta-ferramentas] atualizarItem("${id}"): item não encontrado.`);
      return;
    }
    Object.assign(item, parcial);

    const soEstado = Object.keys(parcial).every(k => k === 'ativo' || k === 'disabled');
    const grupoPai = this._ferramentas.find(g => g.filhos?.some(f => f.id === id));
    // `disabled` num filho pode mudar qual filho é exibido → re-renderiza
    if (soEstado && !(grupoPai && 'disabled' in parcial)) {
      const btn = this.botoes().find(b => b.dataset.id === id || b.dataset.grupo === id);
      if (btn) {
        aplicarEstadoBotao(btn, this.itemParaBotao(grupoPai ?? item));
        atualizarRoving(this.botoes());
        return;
      }
      if (grupoPai || item.filhos?.length) return; // filho não exibido: nada visível muda
    }
    this.renderizar();
  }

  /* ---------- Estado interno ---------- */

  private refletirValor(id: string) {
    // mantém o atributo que o consumidor usou (valor ou value)
    const nome = this.hasAttribute('value') && !this.hasAttribute('valor') ? 'value' : 'valor';
    if (this.getAttribute(nome) !== id) this.setAttribute(nome, id);
  }

  private aplicarPendente() {
    if (!this._pendente) return;
    const item = acharItem(this._ferramentas, this._pendente);
    if (item && !item.disabled && (item.tipo ?? 'ferramenta') === 'ferramenta') {
      this.definirAtivoInterno(this._pendente);
      this._pendente = '';
    } else if (this._ferramentas.length) {
      console.warn(`[ui-paleta-ferramentas] valor="${this._pendente}" não é uma ferramenta ativável em "ferramentas".`);
      this._pendente = '';
    }
  }

  private definirAtivoInterno(id: string) {
    this._ativo = id;
    const grupo = this._ferramentas.find(g => g.filhos?.some(f => f.id === id));
    if (grupo) this.visiveis.set(grupo.id, id);
  }

  private emitirMudanca(valor: string, item: FerramentaItem | null, anterior: string) {
    const detail = { valor, item, anterior };
    this.dispatchEvent(new CustomEvent('ui-change', { detail, bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('ui-selecionar', { detail, bubbles: true, composed: true }));
  }

  /** Filho exibido de um grupo: o último usado, pulando separadores e itens desabilitados. */
  private itemExibido(item: FerramentaItem): FerramentaItem {
    if (!item.filhos?.length) return item;
    const util = (f: FerramentaItem) => f.tipo !== 'separador' && !f.disabled;
    const idVisivel = this.visiveis.get(item.id);
    const lembrado = item.filhos.find(f => f.id === idVisivel);
    return (
      (lembrado && util(lembrado) ? lembrado : undefined) ??
      item.filhos.find(util) ??
      item.filhos.find(f => f.tipo !== 'separador') ??
      item.filhos[0]
    );
  }

  private itemParaBotao(item: FerramentaItem): FerramentaItem {
    const exibido = this.itemExibido(item);
    const tipo = exibido.tipo ?? 'ferramenta';
    return {
      ...exibido,
      tipo,
      ativo: tipo === 'ferramenta' ? exibido.id === this._ativo : exibido.ativo,
      filhos: item.filhos
    };
  }

  private todasFerramentas(): FerramentaItem[] {
    return this._ferramentas.flatMap(f => (f.filhos?.length ? f.filhos : [f])).filter(f => f.tipo !== 'separador');
  }

  /* ---------- Renderização ---------- */

  private renderizar() {
    // Preserva o foco do teclado (o botão de um grupo é identificado pelo grupo, pois o filho exibido pode mudar)
    const ativoEl = this.shadowRoot?.activeElement as HTMLElement | null;
    const foco =
      ativoEl && ativoEl.classList.contains('ui-ferr-btn')
        ? { id: ativoEl.dataset.id ?? '', grupo: ativoEl.dataset.grupo ?? '' }
        : null;

    this.fecharMenu();
    const orientacao = this.orientacao;
    const tamanho = this.tamanho;
    const colunas = this.colunas;

    this.rootElement.className = `ui-paleta ui-paleta--${orientacao} ui-paleta--${tamanho}`;
    if (colunas === 2 && orientacao === 'vertical') this.rootElement.classList.add('ui-paleta--cols-2');
    this.rootElement.setAttribute('aria-orientation', orientacao);
    this.rootElement.setAttribute('aria-label', this.getAttribute('aria-label') || 'Ferramentas');
    this.rootElement.innerHTML = '';

    const tamanhoIcone = TAMANHO_ICONE[tamanho] ?? 18;

    this._ferramentas.forEach(item => {
      if (item.tipo === 'separador') {
        const sep = document.createElement('div');
        sep.className = 'ui-paleta__sep';
        sep.setAttribute('role', 'separator');
        this.rootElement.appendChild(sep);
        return;
      }

      const exibido = this.itemExibido(item);
      const btn = criarBotaoFerramenta(this.itemParaBotao(item), 'paleta', tamanhoIcone);
      btn.dataset.id = exibido.id;
      if (item.filhos?.length) btn.dataset.grupo = item.id;
      this.rootElement.appendChild(btn);
    });

    definirRoving(this.botoes());
    const ativo = this.botoes().find(b => b.dataset.id === this._ativo && !b.disabled);
    if (ativo) {
      this.botoes().forEach(b => (b.tabIndex = -1));
      ativo.tabIndex = 0;
    }

    if (foco) {
      const alvo = this.botoes().find(b => (foco.grupo ? b.dataset.grupo === foco.grupo : b.dataset.id === foco.id));
      if (alvo && !alvo.disabled) alvo.focus();
    }
  }

  private botoes(): HTMLButtonElement[] {
    return Array.from(this.rootElement.querySelectorAll<HTMLButtonElement>('.ui-ferr-btn'));
  }

  /** Reflete no botão o estado atual do item (sem recriar o DOM). */
  private atualizarBotaoDe(item: FerramentaItem, pai?: FerramentaItem) {
    const btn = this.botoes().find(b => b.dataset.id === item.id);
    if (btn) aplicarEstadoBotao(btn, this.itemParaBotao(pai ?? item));
  }

  /* ---------- Interação ---------- */

  private acionar(item: FerramentaItem, pai?: FerramentaItem) {
    if (item.disabled) return;
    const tipo = item.tipo ?? 'ferramenta';
    const anterior = this._ativo;
    const anteriorAtivo = item.ativo;

    if (tipo === 'ferramenta') {
      this.ativar(item.id);
    } else if (tipo === 'toggle') {
      item.ativo = !item.ativo;
      this.atualizarBotaoDe(item, pai);
    }

    const prosseguiu = this.dispatchEvent(
      new CustomEvent('ui-ferramenta', {
        detail: {
          id: item.id,
          item,
          pai,
          ativo: tipo === 'ferramenta' ? true : item.ativo,
          origem: 'paleta'
        },
        bubbles: true,
        composed: true,
        cancelable: true
      })
    );

    if (!prosseguiu) {
      // consumidor vetou (preventDefault): reverte
      if (tipo === 'ferramenta' && anterior !== item.id) {
        if (anterior) this.ativar(anterior);
        else this.limpar();
      } else if (tipo === 'toggle') {
        item.ativo = anteriorAtivo;
        this.atualizarBotaoDe(item, pai);
      }
    }
  }

  private handleClick = (e: Event) => {
    if (this.suprimirClique) {
      this.suprimirClique = false;
      window.clearTimeout(this.timerSupressao);
      return;
    }
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ui-ferr-btn');
    const item = btn?.dataset.id ? acharItem(this._ferramentas, btn.dataset.id) : undefined;
    if (!btn || !item) return;
    const pai = btn.dataset.grupo ? acharItem(this._ferramentas, btn.dataset.grupo) : undefined;
    this.acionar(item, pai);
  };

  private handleFocusIn = (e: Event) => seguirFoco(this.botoes(), e.target);

  private handlePointerDown = (e: Event) => {
    const pe = e as PointerEvent;
    if (pe.pointerType === 'mouse' && pe.button !== 0) return;
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ui-ferr-btn--grupo');
    if (!btn || btn.disabled) return;

    this.cancelarPressao();
    window.clearTimeout(this.timerSupressao);
    this.inicioPressao = { x: pe.clientX ?? 0, y: pe.clientY ?? 0 };
    this.timerPressao = window.setTimeout(() => {
      this.suprimirClique = true;
      this.abrirFlyout(btn, false);
    }, TEMPO_PRESSAO_LONGA_MS);
  };

  /** Arrastar/rolar com o dedo cancela o clique longo. */
  private handlePointerMove = (e: Event) => {
    if (this.timerPressao === undefined || !this.inicioPressao) return;
    const pe = e as PointerEvent;
    const dx = (pe.clientX ?? 0) - this.inicioPressao.x;
    const dy = (pe.clientY ?? 0) - this.inicioPressao.y;
    if (Math.hypot(dx, dy) > DISTANCIA_CANCELA_PRESSAO_PX) this.cancelarPressao();
  };

  /** Fim do gesto: cancela o timer e, se o flyout abriu, descarta a supressão logo após o `click` residual. */
  private handlePointerFim = () => {
    this.cancelarPressao();
    if (this.suprimirClique) {
      window.clearTimeout(this.timerSupressao);
      this.timerSupressao = window.setTimeout(() => {
        this.suprimirClique = false;
      }, TEMPO_LIMPA_SUPRESSAO_MS);
    }
  };

  private cancelarPressao = () => {
    if (this.timerPressao !== undefined) {
      window.clearTimeout(this.timerPressao);
      this.timerPressao = undefined;
    }
    this.inicioPressao = null;
  };

  private handleContextMenu = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ui-ferr-btn--grupo');
    if (!btn) return;
    e.preventDefault();
    this.cancelarPressao();
    this.abrirFlyout(btn, false);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const horizontal = this.getAttribute('orientacao') === 'horizontal';
    const rtl = getComputedStyle(this).direction === 'rtl';
    const colunas = this.colunas;

    // Item 5: Navegação em grade quando colunas=2 em layout vertical
    if (!horizontal && colunas === 2) {
      if (navegarGrade2Colunas(e, this.botoes(), rtl)) return;
    } else {
      const prev = horizontal ? [rtl ? 'ArrowRight' : 'ArrowLeft'] : ['ArrowUp'];
      const next = horizontal ? [rtl ? 'ArrowLeft' : 'ArrowRight'] : ['ArrowDown'];
      if (navegarRoving(e, this.botoes(), prev, next)) return;
    }

    const teclaFlyout = horizontal ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const btn = e.target instanceof HTMLButtonElement ? e.target : null;
    if (btn?.dataset.grupo && e.key === teclaFlyout) {
      e.preventDefault();
      if (this.menu?.ancora === btn) this.menu.focarPrimeiro();
      else this.abrirFlyout(btn, true);
    }
  };

  private handleAtalho = (e: KeyboardEvent) => {
    if (!this.hasAttribute('atalhos') || e.defaultPrevented) return;
    const caminho = e.composedPath() as HTMLElement[];
    const origem = caminho[0];
    if (origem && (/^(INPUT|TEXTAREA|SELECT)$/.test(origem.tagName) || origem.isContentEditable)) return;
    // não sequestra teclas em campos customizados nem dentro de diálogos modais
    const bloqueia = caminho.some(el => {
      const role = el.getAttribute?.('role');
      return (
        el.getAttribute?.('aria-modal') === 'true' ||
        role === 'textbox' || role === 'searchbox' || role === 'combobox' || role === 'spinbutton'
      );
    });
    if (bloqueia) return;

    // Item 4: Evita conflito entre várias paletas com "atalhos" na mesma página.
    // Apenas a paleta dona (que contém o foco ativo) ou a primeira no DOM se nenhuma tiver foco.
    const todasPaletas = Array.from(document.querySelectorAll<UIPaletaFerramentas>('ui-paleta-ferramentas[atalhos]'));
    if (todasPaletas.length > 1) {
      const dona = todasPaletas.find(p => p.matches(':focus-within') || p.shadowRoot?.activeElement) || todasPaletas[0];
      if (dona !== this) return;
    }

    const candidatos = this.todasFerramentas().filter(f => !f.disabled && correspondeAtalho(e, f.atalho));
    if (!candidatos.length) return;

    e.preventDefault();
    let alvo = candidatos[0];
    if (candidatos.length > 1) {
      const i = candidatos.findIndex(c => c.id === this._ativo);
      alvo = candidatos[(i + 1) % candidatos.length];
    }
    const pai = this._ferramentas.find(g => g.filhos?.some(f => f.id === alvo.id));
    this.acionar(alvo, pai);
  };

  private abrirFlyout(btn: HTMLButtonElement, focar: boolean) {
    const grupo = btn.dataset.grupo ? acharItem(this._ferramentas, btn.dataset.grupo) : undefined;
    if (!grupo?.filhos?.length) return;

    this.fecharMenu();
    const filhos = grupo.filhos.map(f => ({
      ...f,
      ativo: (f.tipo ?? 'ferramenta') === 'ferramenta' ? f.id === this._ativo : f.ativo
    }));
    btn.setAttribute('aria-expanded', 'true');
    this.menu = abrirMenu(
      this.shadowRoot!,
      btn,
      filhos,
      escolhido => {
        const original = acharItem(grupo.filhos!, escolhido.id);
        if (!original) return;
        this.acionar(original, grupo);
        // o botão do grupo foi recriado: devolve o foco a ele
        this.botoes().find(b => b.dataset.grupo === grupo.id)?.focus();
      },
      {
        lado: this.getAttribute('orientacao') === 'horizontal' ? 'baixo' : 'direita',
        focar,
        tipoPadrao: 'ferramenta',
        onFechar: () => {
          btn.setAttribute('aria-expanded', 'false');
          this.menu = null;
        }
      }
    );
  }

  private fecharMenu() {
    this.menu?.fechar();
    this.menu = null;
  }
}

definirCustomElement('ui-paleta-ferramentas', UIPaletaFerramentas);
