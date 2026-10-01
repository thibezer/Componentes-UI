import estilos from './ui-ribbon.css?inline';
import estilosComuns from './ferramentas-comum.css?inline';
import { ListenerBag } from '../../core/listener-bag';
import type { FerramentaItem, RibbonAba, RibbonGrupo } from './tipos';
import {
  abrirMenu,
  acharItem,
  aplicarEstadoBotao,
  criarBotaoFerramenta,
  definirRoving,
  navegarRoving,
  type MenuHandle
} from './ferramentas-comum';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

/**
 * <ui-ribbon> — barra de ferramentas em abas com grupos (estilo AutoCAD / Word / Excel).
 *
 * Atributos: aba-ativa, recolhido, compacto
 * Propriedades: abas, abaAtiva, recolhido
 * Métodos: atualizarItem(id, parcial), definirAbaVisivel(id, visivel), selecionarAba(id)
 * Eventos: ui-ferramenta { id, item, pai?, ativo?, origem, aba }, ui-aba-change { id, aba }
 */
export class UIRibbon extends SafeHTMLElement {
  static get observedAttributes() {
    return ['aba-ativa', 'recolhido'];
  }

  private rootElement: HTMLDivElement;
  private abasElement: HTMLDivElement;
  private gruposElement: HTMLDivElement;

  private _abas: RibbonAba[] = [];
  private _abaAtiva = '';
  private menu: MenuHandle | null = null;
  private listeners = new ListenerBag();

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilosComuns}${estilos}</style>
      <div class="ui-ribbon">
        <div class="ui-ribbon__abas" role="tablist"></div>
        <div class="ui-ribbon__painel" role="tabpanel">
          <div class="ui-ribbon__grupos" role="toolbar" aria-label="Ferramentas"></div>
        </div>
      </div>
    `;
    this.rootElement = shadow.querySelector('.ui-ribbon')!;
    this.abasElement = shadow.querySelector('.ui-ribbon__abas')!;
    this.gruposElement = shadow.querySelector('.ui-ribbon__grupos')!;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.abasElement, 'click', this.handleClickAbas);
    this.listeners.add(this.abasElement, 'dblclick', this.handleDblClickAbas);
    this.listeners.add(this.abasElement, 'keydown', this.handleKeyDownAbas);
    this.listeners.add(this.gruposElement, 'click', this.handleClickGrupos);
    this.listeners.add(this.gruposElement, 'keydown', this.handleKeyDownGrupos);
    this.listeners.add(document, 'pointerdown', this.handlePointerDownFora, true);
    this.listeners.add(this.rootElement, 'keydown', this.handleEscape);

    const inicial = this.getAttribute('aba-ativa');
    if (inicial && !this._abaAtiva) this._abaAtiva = inicial;
    this.renderizar();
  }

  disconnectedCallback() {
    this.fecharMenu();
    this.listeners.cleanup();
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (old === value) return;
    if (name === 'aba-ativa' && value && value !== this._abaAtiva) {
      this.selecionarAba(value, false);
    } else if (name === 'recolhido') {
      this.rootElement.classList.remove('ui-ribbon--aberto');
    }
  }

  /* ---------- API pública ---------- */

  get abas(): RibbonAba[] {
    return this._abas;
  }

  set abas(val: RibbonAba[]) {
    this._abas = Array.isArray(val) ? val : [];
    this.renderizar();
  }

  get abaAtiva(): string {
    return this._abaAtiva;
  }

  set abaAtiva(id: string) {
    this.selecionarAba(id);
  }

  get recolhido(): boolean {
    return this.hasAttribute('recolhido');
  }

  set recolhido(val: boolean) {
    if (val) this.setAttribute('recolhido', '');
    else this.removeAttribute('recolhido');
  }

  public selecionarAba(id: string, emitir: boolean = true) {
    const aba = this._abas.find(a => a.id === id && !a.oculta);
    if (!aba || aba.id === this._abaAtiva) return;

    this.fecharMenu();
    this._abaAtiva = aba.id;
    if (this.getAttribute('aba-ativa') !== aba.id) this.setAttribute('aba-ativa', aba.id);
    this.renderizar();

    if (emitir) {
      this.dispatchEvent(
        new CustomEvent('ui-aba-change', {
          detail: { id: aba.id, aba },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  public definirAbaVisivel(id: string, visivel: boolean) {
    const aba = this._abas.find(a => a.id === id);
    if (!aba) return;
    aba.oculta = !visivel;
    if (!visivel && this._abaAtiva === id) this._abaAtiva = '';
    this.renderizar();
  }

  /** Atualiza um item (estado ou aparência) sem precisar recriar as abas. */
  public atualizarItem(id: string, parcial: Partial<FerramentaItem>) {
    const todos = this._abas.flatMap(a => a.grupos.flatMap(g => g.itens));
    const item = acharItem(todos, id);
    if (!item) return;
    Object.assign(item, parcial);

    const soEstado = Object.keys(parcial).every(k => k === 'ativo' || k === 'disabled');
    const btn = this.gruposElement.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${CSS.escape(id)}"]`);
    if (soEstado && btn) aplicarEstadoBotao(btn, item);
    else this.renderizarPainel();
  }

  /* ---------- Renderização ---------- */

  private abasVisiveis(): RibbonAba[] {
    return this._abas.filter(a => !a.oculta);
  }

  private renderizar() {
    const visiveis = this.abasVisiveis();
    if (!visiveis.some(a => a.id === this._abaAtiva)) {
      this._abaAtiva = visiveis[0]?.id ?? '';
    }
    this.renderizarAbas();
    this.renderizarPainel();
  }

  private renderizarAbas() {
    this.abasElement.innerHTML = '';
    this.abasVisiveis().forEach(aba => {
      const ativa = aba.id === this._abaAtiva;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ui-ribbon__aba';
      btn.setAttribute('role', 'tab');
      btn.dataset.id = aba.id;
      btn.textContent = aba.rotulo;
      btn.tabIndex = ativa ? 0 : -1;
      btn.setAttribute('aria-selected', String(ativa));
      btn.classList.toggle('ui-ribbon__aba--ativa', ativa);
      btn.classList.toggle('ui-ribbon__aba--contextual', !!aba.contextual);
      this.abasElement.appendChild(btn);
    });
  }

  private renderizarPainel() {
    this.fecharMenu();
    this.gruposElement.innerHTML = '';
    const aba = this._abas.find(a => a.id === this._abaAtiva);
    if (!aba) return;

    aba.grupos.forEach(grupo => this.gruposElement.appendChild(this.criarGrupo(grupo)));
    definirRoving(this.botoesPainel());
  }

  private criarGrupo(grupo: RibbonGrupo): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ui-ribbon__grupo';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', grupo.rotulo);
    el.dataset.id = grupo.id;

    const itens = document.createElement('div');
    itens.className = 'ui-ribbon__grupo-itens';

    // Botões pequenos consecutivos são agrupados em colunas de até 3 (padrão Office/CAD)
    let coluna: HTMLElement | null = null;
    let naColuna = 0;
    const fecharColuna = () => {
      if (coluna) itens.appendChild(coluna);
      coluna = null;
      naColuna = 0;
    };

    grupo.itens.forEach(item => {
      if (item.tipo === 'separador') {
        fecharColuna();
        const sep = document.createElement('div');
        sep.className = 'ui-ribbon__separador';
        sep.setAttribute('role', 'separator');
        itens.appendChild(sep);
      } else if (item.tamanho === 'grande') {
        fecharColuna();
        itens.appendChild(this.criarBotao(item, 'grande', 24));
      } else {
        if (!coluna) {
          coluna = document.createElement('div');
          coluna.className = 'ui-ribbon__coluna';
        }
        coluna.appendChild(this.criarBotao(item, 'pequeno', 16));
        if (++naColuna === 3) fecharColuna();
      }
    });
    fecharColuna();

    const rotulo = document.createElement('div');
    rotulo.className = 'ui-ribbon__grupo-rotulo';
    rotulo.textContent = grupo.rotulo;

    el.appendChild(itens);
    el.appendChild(rotulo);
    return el;
  }

  private criarBotao(item: FerramentaItem, variante: 'grande' | 'pequeno', icone: number): HTMLButtonElement {
    const efetivo: FerramentaItem = item.filhos?.length ? { ...item, tipo: 'menu' } : item;
    return criarBotaoFerramenta(efetivo, variante, icone);
  }

  private botoesPainel(): HTMLButtonElement[] {
    return Array.from(this.gruposElement.querySelectorAll<HTMLButtonElement>('.ui-ferr-btn'));
  }

  /* ---------- Interação ---------- */

  private handleClickAbas = (e: Event) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>('.ui-ribbon__aba');
    if (!tab?.dataset.id) return;
    this.selecionarAba(tab.dataset.id);
    if (this.recolhido) this.rootElement.classList.toggle('ui-ribbon--aberto');
  };

  private handleDblClickAbas = (e: Event) => {
    if (!(e.target as HTMLElement).closest('.ui-ribbon__aba')) return;
    this.recolhido = !this.recolhido;
  };

  private handleKeyDownAbas = (e: KeyboardEvent) => {
    const tabs = Array.from(this.abasElement.querySelectorAll<HTMLButtonElement>('.ui-ribbon__aba'));
    const atual = tabs.findIndex(t => t === e.target);
    if (atual < 0) return;

    let destino = atual;
    if (e.key === 'ArrowRight') destino = (atual + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') destino = (atual - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') destino = 0;
    else if (e.key === 'End') destino = tabs.length - 1;
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.botoesPainel().find(b => !b.disabled)?.focus();
      return;
    } else return;

    e.preventDefault();
    const id = tabs[destino].dataset.id;
    if (id) this.selecionarAba(id);
    this.abasElement.querySelector<HTMLButtonElement>(`.ui-ribbon__aba[data-id="${CSS.escape(id ?? '')}"]`)?.focus();
  };

  private handleClickGrupos = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ui-ferr-btn');
    if (!btn?.dataset.id) return;
    this.acionar(btn, false);
  };

  private handleKeyDownGrupos = (e: KeyboardEvent) => {
    const botoes = this.botoesPainel();
    if (navegarRoving(e, botoes, ['ArrowLeft'], ['ArrowRight'])) return;

    const btn = e.target instanceof HTMLButtonElement ? e.target : null;
    if (btn?.getAttribute('aria-haspopup') === 'menu' && e.key === 'ArrowDown') {
      e.preventDefault();
      this.acionar(btn, true);
    }
  };

  private handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !this.menu) this.rootElement.classList.remove('ui-ribbon--aberto');
  };

  private handlePointerDownFora = (e: Event) => {
    if (!this.recolhido || !this.rootElement.classList.contains('ui-ribbon--aberto')) return;
    if (!e.composedPath().includes(this)) this.rootElement.classList.remove('ui-ribbon--aberto');
  };

  private acionar(btn: HTMLButtonElement, focarMenu: boolean) {
    const aba = this._abas.find(a => a.id === this._abaAtiva);
    const item = aba && acharItem(aba.grupos.flatMap(g => g.itens), btn.dataset.id!);
    if (!item || item.disabled) return;

    if (item.filhos?.length) {
      this.alternarMenu(btn, item, focarMenu);
      return;
    }

    if (item.tipo === 'toggle') {
      item.ativo = !item.ativo;
      aplicarEstadoBotao(btn, item);
    }
    this.emitir(item);
    this.rootElement.classList.remove('ui-ribbon--aberto');
  }

  private alternarMenu(btn: HTMLButtonElement, item: FerramentaItem, focar: boolean) {
    const jaAberto = this.menu?.ancora === btn;
    this.fecharMenu();
    if (jaAberto) return;

    btn.setAttribute('aria-expanded', 'true');
    this.menu = abrirMenu(
      this.shadowRoot!,
      btn,
      item.filhos!,
      filho => {
        if (filho.tipo === 'toggle') filho.ativo = !filho.ativo;
        this.emitir(filho, item);
        this.rootElement.classList.remove('ui-ribbon--aberto');
      },
      {
        lado: 'baixo',
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

  private emitir(item: FerramentaItem, pai?: FerramentaItem) {
    this.dispatchEvent(
      new CustomEvent('ui-ferramenta', {
        detail: { id: item.id, item, pai, ativo: item.ativo, origem: 'ribbon', aba: this._abaAtiva },
        bubbles: true,
        composed: true
      })
    );
  }
}

definirCustomElement('ui-ribbon', UIRibbon);
