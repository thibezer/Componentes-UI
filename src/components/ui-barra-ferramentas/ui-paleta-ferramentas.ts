import estilos from './ui-paleta-ferramentas.css?inline';
import estilosComuns from './ferramentas-comum.css?inline';
import { ListenerBag } from '../../core/listener-bag';
import type { FerramentaItem } from './tipos';
import {
  abrirMenu,
  acharItem,
  criarBotaoFerramenta,
  definirRoving,
  navegarRoving,
  type MenuHandle
} from './ferramentas-comum';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

const TEMPO_PRESSAO_LONGA_MS = 380;
const TAMANHO_ICONE: Record<string, number> = { sm: 16, md: 18, lg: 22 };

/**
 * <ui-paleta-ferramentas> — paleta de ferramentas (estilo Illustrator / Photoshop).
 *
 * - Itens com `filhos` viram um grupo: mostra a última ferramenta usada e abre um flyout
 *   com clique longo, botão direito ou seta (→ na vertical, ↓ na horizontal).
 * - Ferramentas (`tipo` padrão) são exclusivas; `toggle` liga/desliga; `botao` só dispara ação.
 * - Com o atributo `atalhos`, a tecla `atalho` do item ativa a ferramenta; teclas repetidas
 *   entre itens percorrem o grupo (como Shift+letra no Photoshop).
 *
 * Atributos: valor, orientacao (vertical|horizontal), colunas (1|2), tamanho (sm|md|lg), atalhos
 * Propriedades: ferramentas, valor
 * Métodos: ativar(id), atualizarItem(id, parcial)
 * Eventos: ui-change / ui-selecionar { valor, item, anterior }, ui-ferramenta { id, item, pai?, ativo?, origem }
 */
export class UIPaletaFerramentas extends SafeHTMLElement {
  static get observedAttributes() {
    return ['valor', 'value', 'orientacao', 'colunas', 'tamanho', 'size'];
  }

  private rootElement: HTMLDivElement;
  private _ferramentas: FerramentaItem[] = [];
  private _ativo = '';
  private visiveis = new Map<string, string>(); // id do grupo → id do filho exibido
  private menu: MenuHandle | null = null;
  private timerPressao: number | undefined;
  private suprimirClique = false;
  private listeners = new ListenerBag();

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
    this.listeners.add(this.rootElement, 'click', this.handleClick);
    this.listeners.add(this.rootElement, 'pointerdown', this.handlePointerDown);
    this.listeners.add(this.rootElement, 'pointerup', this.cancelarPressao);
    this.listeners.add(this.rootElement, 'pointerleave', this.cancelarPressao);
    this.listeners.add(this.rootElement, 'pointercancel', this.cancelarPressao);
    this.listeners.add(this.rootElement, 'contextmenu', this.handleContextMenu);
    this.listeners.add(this.rootElement, 'keydown', this.handleKeyDown);
    this.listeners.add(document, 'keydown', this.handleAtalho);

    const inicial = this.getAttribute('valor') || this.getAttribute('value');
    if (inicial && !this._ativo) this.definirAtivoInterno(inicial);
    this.renderizar();
  }

  disconnectedCallback() {
    this.cancelarPressao();
    this.fecharMenu();
    this.listeners.cleanup();
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (old === value) return;
    if (name === 'valor' || name === 'value') {
      if (value && value !== this._ativo) this.ativar(value, false);
    } else {
      this.renderizar();
    }
  }

  /* ---------- API pública ---------- */

  get ferramentas(): FerramentaItem[] {
    return this._ferramentas;
  }

  set ferramentas(val: FerramentaItem[]) {
    this._ferramentas = Array.isArray(val) ? val : [];
    this.visiveis.clear();
    if (this._ativo) this.definirAtivoInterno(this._ativo);
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

  /** Ativa uma ferramenta (exclusiva). Se estiver dentro de um grupo, ela passa a ser a exibida. */
  public ativar(id: string, emitir: boolean = true) {
    const item = acharItem(this._ferramentas, id);
    if (!item || item.disabled || (item.tipo ?? 'ferramenta') !== 'ferramenta') return;

    const anterior = this._ativo;
    this.definirAtivoInterno(id);
    if (this.getAttribute('valor') !== id) this.setAttribute('valor', id);
    this.renderizar();

    if (emitir && anterior !== id) {
      const detail = { valor: id, item, anterior };
      this.dispatchEvent(new CustomEvent('ui-change', { detail, bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('ui-selecionar', { detail, bubbles: true, composed: true }));
    }
  }

  public atualizarItem(id: string, parcial: Partial<FerramentaItem>) {
    const item = acharItem(this._ferramentas, id);
    if (!item) return;
    Object.assign(item, parcial);
    this.renderizar();
  }

  /* ---------- Estado interno ---------- */

  private definirAtivoInterno(id: string) {
    this._ativo = id;
    const grupo = this._ferramentas.find(g => g.filhos?.some(f => f.id === id));
    if (grupo) this.visiveis.set(grupo.id, id);
  }

  private itemExibido(item: FerramentaItem): FerramentaItem {
    if (!item.filhos?.length) return item;
    const idVisivel = this.visiveis.get(item.id);
    return item.filhos.find(f => f.id === idVisivel) ?? item.filhos[0];
  }

  private todasFerramentas(): FerramentaItem[] {
    return this._ferramentas.flatMap(f => (f.filhos?.length ? f.filhos : [f])).filter(f => f.tipo !== 'separador');
  }

  /* ---------- Renderização ---------- */

  private renderizar() {
    this.fecharMenu();
    const orientacao = this.getAttribute('orientacao') === 'horizontal' ? 'horizontal' : 'vertical';
    const tamanho = this.getAttribute('tamanho') || this.getAttribute('size') || 'md';
    const colunas = this.getAttribute('colunas') === '2' ? 2 : 1;

    this.rootElement.className = `ui-paleta ui-paleta--${orientacao} ui-paleta--${tamanho}`;
    if (colunas === 2 && orientacao === 'vertical') this.rootElement.classList.add('ui-paleta--cols-2');
    this.rootElement.setAttribute('aria-orientation', orientacao);
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
      const tipo = exibido.tipo ?? 'ferramenta';
      const paraBotao: FerramentaItem = {
        ...exibido,
        tipo,
        ativo: tipo === 'ferramenta' ? exibido.id === this._ativo : exibido.ativo,
        filhos: item.filhos
      };

      const btn = criarBotaoFerramenta(paraBotao, 'paleta', tamanhoIcone);
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
  }

  private botoes(): HTMLButtonElement[] {
    return Array.from(this.rootElement.querySelectorAll<HTMLButtonElement>('.ui-ferr-btn'));
  }

  /* ---------- Interação ---------- */

  private acionar(item: FerramentaItem, pai?: FerramentaItem) {
    if (item.disabled) return;
    const tipo = item.tipo ?? 'ferramenta';

    if (tipo === 'ferramenta') {
      this.ativar(item.id);
    } else if (tipo === 'toggle') {
      item.ativo = !item.ativo;
      this.renderizar();
    }

    this.dispatchEvent(
      new CustomEvent('ui-ferramenta', {
        detail: {
          id: item.id,
          item,
          pai,
          ativo: tipo === 'ferramenta' ? true : item.ativo,
          origem: 'paleta'
        },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleClick = (e: Event) => {
    if (this.suprimirClique) {
      this.suprimirClique = false;
      return;
    }
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ui-ferr-btn');
    const item = btn?.dataset.id ? acharItem(this._ferramentas, btn.dataset.id) : undefined;
    if (!btn || !item) return;
    const pai = btn.dataset.grupo ? acharItem(this._ferramentas, btn.dataset.grupo) : undefined;
    this.acionar(item, pai);
  };

  private handlePointerDown = (e: Event) => {
    const pe = e as PointerEvent;
    if (pe.pointerType === 'mouse' && pe.button !== 0) return;
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ui-ferr-btn--grupo');
    if (!btn || btn.disabled) return;

    this.cancelarPressao();
    this.timerPressao = window.setTimeout(() => {
      this.suprimirClique = true;
      this.abrirFlyout(btn, false);
    }, TEMPO_PRESSAO_LONGA_MS);
  };

  private cancelarPressao = () => {
    if (this.timerPressao !== undefined) {
      window.clearTimeout(this.timerPressao);
      this.timerPressao = undefined;
    }
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
    const prev = horizontal ? ['ArrowLeft'] : ['ArrowUp'];
    const next = horizontal ? ['ArrowRight'] : ['ArrowDown'];
    if (navegarRoving(e, this.botoes(), prev, next)) return;

    const teclaFlyout = horizontal ? 'ArrowDown' : 'ArrowRight';
    const btn = e.target instanceof HTMLButtonElement ? e.target : null;
    if (btn?.dataset.grupo && e.key === teclaFlyout) {
      e.preventDefault();
      this.abrirFlyout(btn, true);
    }
  };

  private handleAtalho = (e: KeyboardEvent) => {
    if (!this.hasAttribute('atalhos') || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const origem = e.composedPath()[0] as HTMLElement | undefined;
    if (origem && (/^(INPUT|TEXTAREA|SELECT)$/.test(origem.tagName) || origem.isContentEditable)) return;

    const tecla = (e.key || '').toUpperCase();
    if (tecla.length !== 1) return;

    const candidatos = this.todasFerramentas().filter(f => !f.disabled && f.atalho?.toUpperCase() === tecla);
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
    const filhos = grupo.filhos.map(f => ({ ...f, ativo: f.id === this._ativo }));
    btn.setAttribute('aria-expanded', 'true');
    this.menu = abrirMenu(
      this.shadowRoot!,
      btn,
      filhos,
      escolhido => {
        const original = acharItem(grupo.filhos!, escolhido.id);
        if (original) this.acionar(original, grupo);
      },
      {
        lado: this.getAttribute('orientacao') === 'horizontal' ? 'baixo' : 'direita',
        focar,
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
