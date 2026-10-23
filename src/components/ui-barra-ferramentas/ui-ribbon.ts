import estilos from './ui-ribbon.css?inline';
import estilosComuns from './ferramentas-comum.css?inline';
import { ListenerBag } from '../../core/listener-bag';
import type { FerramentaItem, RibbonAba, RibbonGrupo } from './tipos';
import {
  abrirMenu,
  acharItem,
  aplicarEstadoBotao,
  atualizarRoving,
  avisarIdsDuplicados,
  coletarIds,
  correspondeAtalho,
  criarBotaoDividido,
  criarBotaoFerramenta,
  definirRoving,
  GerenciadorTooltip,
  navegarRoving,
  seguirFoco,
  type MenuHandle
} from './ferramentas-comum';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { criarBotaoAba, criarGrupoRibbon } from './ribbon-render';
import { acaoDaTeclaAba } from './ribbon-teclado';

/**
 * <ui-ribbon> — barra de ferramentas em abas com grupos (estilo AutoCAD / Word / Excel).
 *
 * Atributos: aba-ativa, recolhido, compacto, ativacao-manual, copiar-dados, modo-controlado, atalhos, keytips,
 *            aria-label (rótulo da toolbar), rotulo-abas (rótulo do tablist)
 * Propriedades: abas, abaAtiva, recolhido, compacto, ativacaoManual, modoControlado, copiarDados
 * Métodos: atualizarItem(id, parcial), definirAbaVisivel(id, visivel), selecionarAba(id)
 * Eventos: ui-ferramenta { id, item, pai?, ativo?, origem, aba } (cancelável: preventDefault reverte o toggle),
 *          ui-aba-change { id, aba }, ui-recolhido-change { recolhido }, ui-grupo-dialogo { id, grupo }
 *
 * `aba-ativa` pode ser definido antes de `abas`: o valor fica pendente até a aba existir/ficar visível.
 */
let contadorRibbon = 0;

export class UIRibbon extends SafeHTMLElement {
  static get observedAttributes() {
    return [
      'aba-ativa',
      'recolhido',
      'compacto',
      'ativacao-manual',
      'copiar-dados',
      'modo-controlado',
      'atalhos',
      'keytips',
      'aria-label',
      'rotulo-abas',
      'rotulo-fixar',
      'rotulo-expandir'
    ];
  }

  private rootElement: HTMLDivElement;
  private abasElement: HTMLDivElement;
  private gruposElement: HTMLDivElement;
  private painelElement: HTMLDivElement;
  private fixarElement: HTMLButtonElement;
  private readonly uid = `ui-ribbon-${++contadorRibbon}`;
  private _abaPendente = '';
  private _pronto = false;
  private _modoControlado = false;

  private _abas: RibbonAba[] = [];
  private _abaAtiva = '';
  private menu: MenuHandle | null = null;
  private listeners = new ListenerBag();
  private tooltip: GerenciadorTooltip | null = null;
  private observerResize: ResizeObserver | null = null;
  private gruposColapsados = new Set<string>();
  private keytipsAtivas = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilosComuns}${estilos}</style>
      <div class="ui-ribbon">
        <div class="ui-ribbon__cabecalho">
          <div class="ui-ribbon__abas" role="tablist"></div>
          <button type="button" class="ui-ribbon__fixar"></button>
        </div>
        <div class="ui-ribbon__painel" role="tabpanel">
          <div class="ui-ribbon__grupos" role="toolbar" aria-label="Ferramentas"></div>
        </div>
      </div>
    `;
    this.rootElement = shadow.querySelector('.ui-ribbon')!;
    this.abasElement = shadow.querySelector('.ui-ribbon__abas')!;
    this.gruposElement = shadow.querySelector('.ui-ribbon__grupos')!;
    this.painelElement = shadow.querySelector('.ui-ribbon__painel')!;
    this.fixarElement = shadow.querySelector('.ui-ribbon__fixar')!;
    this.painelElement.id = `${this.uid}-painel`;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.tooltip?.destruir();
    this.tooltip = new GerenciadorTooltip(this.shadowRoot!, this.rootElement);

    this.listeners.add(this.abasElement, 'click', this.handleClickAbas);
    this.listeners.add(this.fixarElement, 'click', this.handleClickFixar);
    this.listeners.add(this.abasElement, 'dblclick', this.handleDblClickAbas);
    this.listeners.add(this.abasElement, 'keydown', this.handleKeyDownAbas);
    this.listeners.add(this.gruposElement, 'click', this.handleClickGrupos);
    this.listeners.add(this.gruposElement, 'keydown', this.handleKeyDownGrupos);
    this.listeners.add(document, 'pointerdown', this.handlePointerDownFora, true);
    this.listeners.add(this.rootElement, 'keydown', this.handleEscape);
    this.listeners.add(this.gruposElement, 'focusin', this.handleFocusInGrupos);
    this.listeners.add(document, 'keydown', this.handleAtalho);

    this.iniciarResizeObserver();

    const inicial = this.getAttribute('aba-ativa');
    if (inicial && !this._abaAtiva) this._abaPendente = inicial;
    this.aplicarRotulos();
    this.renderizar();
    this._pronto = true;
  }

  disconnectedCallback() {
    this._pronto = false;
    this.fecharMenu();
    this.observerResize?.disconnect();
    this.observerResize = null;
    this.tooltip?.destruir();
    this.tooltip = null;
    this.listeners.cleanup();
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (old === value) return;
    if (name === 'aba-ativa') {
      if (!value || value === this._abaAtiva) return;
      if (this._abas.some(a => a.id === value && !a.oculta)) {
        this._abaPendente = '';
        this.selecionarAba(value, false);
      } else {
        // abas ainda não carregadas (ou aba oculta): aplica quando existir
        this._abaPendente = value;
        if (this.abasVisiveis().length) this.renderizar();
      }
    } else if (name === 'recolhido') {
      this.rootElement.classList.remove('ui-ribbon--aberto');
      this.aplicarRotulos();
      if (this._pronto && (old === null) !== (value === null)) {
        this.dispatchEvent(
          new CustomEvent('ui-recolhido-change', {
            detail: { recolhido: value !== null },
            bubbles: true,
            composed: true
          })
        );
      }
    } else if (name === 'aria-label' || name === 'rotulo-abas' || name === 'rotulo-fixar' || name === 'rotulo-expandir') {
      this.aplicarRotulos();
    }
  }

  private aplicarRotulos() {
    this.gruposElement.setAttribute('aria-label', this.getAttribute('aria-label') || 'Ferramentas');
    this.abasElement.setAttribute('aria-label', this.getAttribute('rotulo-abas') || 'Abas');
    // Botão fixar/recolher: o rótulo descreve a ação e aria-expanded o estado da faixa
    const recolhido = this.hasAttribute('recolhido');
    const rotulo = recolhido
      ? this.getAttribute('rotulo-expandir') || 'Fixar faixa de opções'
      : this.getAttribute('rotulo-fixar') || 'Recolher faixa de opções';
    this.fixarElement.setAttribute('aria-label', rotulo);
    this.fixarElement.title = rotulo;
    this.fixarElement.setAttribute('aria-expanded', String(!recolhido));
    this.fixarElement.setAttribute('aria-controls', this.painelElement.id);
  }

  /* ---------- API pública ---------- */

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

  get ativacaoManual(): boolean {
    return this.hasAttribute('ativacao-manual');
  }

  set ativacaoManual(val: boolean) {
    if (val) this.setAttribute('ativacao-manual', '');
    else this.removeAttribute('ativacao-manual');
  }

  get abas(): RibbonAba[] {
    return this._abas;
  }

  set abas(val: RibbonAba[]) {
    const lista = Array.isArray(val) ? val : [];
    this._abas = this.modoControlado
      ? lista.map(a => ({
          ...a,
          grupos: a.grupos.map(g => ({
            ...g,
            itens: g.itens.map(i => ({
              ...i,
              filhos: i.filhos?.map(c => ({ ...c }))
            }))
          }))
        }))
      : lista;

    avisarIdsDuplicados(this._abas.map(a => a.id), '<ui-ribbon> abas');
    avisarIdsDuplicados(
      this._abas.flatMap(a => a.grupos.flatMap(g => coletarIds(g.itens))),
      '<ui-ribbon> itens'
    );
    this.gruposColapsados.clear();
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

  get compacto(): boolean {
    return this.hasAttribute('compacto');
  }

  set compacto(val: boolean) {
    if (val) this.setAttribute('compacto', '');
    else this.removeAttribute('compacto');
  }

  public selecionarAba(id: string, emitir: boolean = true) {
    const aba = this._abas.find(a => a.id === id && !a.oculta);
    if (!aba) {
      if (id && this._abas.length) console.warn(`[ui-ribbon] selecionarAba("${id}"): aba inexistente ou oculta.`);
      return;
    }
    if (aba.id === this._abaAtiva) return;
    this._abaPendente = '';

    this.fecharMenu();
    this.gruposColapsados.clear();
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
    const antes = this._abaAtiva;
    aba.oculta = !visivel;
    if (!visivel && antes === id) this._abaAtiva = '';
    this.renderizar();

    // A aba ativa foi ocultada e outra assumiu: avisa o consumidor
    const nova = this._abas.find(a => a.id === this._abaAtiva);
    if (!visivel && antes === id && nova) {
      this.dispatchEvent(
        new CustomEvent('ui-aba-change', { detail: { id: nova.id, aba: nova }, bubbles: true, composed: true })
      );
    }
  }

  /** Atualiza um item (estado ou aparência) sem precisar recriar as abas. */
  public atualizarItem(id: string, parcial: Partial<FerramentaItem>) {
    const todos = this._abas.flatMap(a => a.grupos.flatMap(g => g.itens));
    const item = acharItem(todos, id);
    if (!item) {
      console.warn(`[ui-ribbon] atualizarItem("${id}"): item não encontrado.`);
      return;
    }
    Object.assign(item, parcial);

    // Item de outra aba: nada visível muda; a aba será montada com o estado novo ao ser aberta
    const aba = this._abas.find(a => a.id === this._abaAtiva);
    if (!aba || !acharItem(aba.grupos.flatMap(g => g.itens), id)) return;

    const soEstado = Object.keys(parcial).every(k => k === 'ativo' || k === 'disabled');
    const btn = this.gruposElement.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${CSS.escape(id)}"]`);
    if (soEstado) {
      // filho de menu não tem botão no painel: o estado aparece quando o menu for aberto
      if (btn) {
        aplicarEstadoBotao(btn, this.efetivo(item));
        atualizarRoving(this.botoesPainel());
      }
    } else {
      this.comFoco(() => this.renderizarPainel());
    }
  }

  private efetivo(item: FerramentaItem): FerramentaItem {
    return item.filhos?.length ? { ...item, tipo: 'menu' } : item;
  }

  /* ---------- Foco preservado em re-renderizações ---------- */

  private capturarFoco(): { seletor: string; id: string } | null {
    const ativo = this.shadowRoot?.activeElement as HTMLElement | null;
    if (!ativo?.dataset?.id) return null;
    if (ativo.classList.contains('ui-ribbon__aba')) return { seletor: '.ui-ribbon__aba', id: ativo.dataset.id };
    if (ativo.classList.contains('ui-ferr-btn')) return { seletor: '.ui-ferr-btn', id: ativo.dataset.id };
    return null;
  }

  private comFoco(fn: () => void) {
    const foco = this.capturarFoco();
    fn();
    if (!foco) return;
    const alvo = this.shadowRoot!.querySelector<HTMLButtonElement>(`${foco.seletor}[data-id="${CSS.escape(foco.id)}"]`);
    if (alvo && !alvo.disabled) alvo.focus();
  }

  private handleFocusInGrupos = (e: Event) => seguirFoco(this.botoesPainel(), e.target);

  /* ---------- Renderização ---------- */

  private abasVisiveis(): RibbonAba[] {
    return this._abas.filter(a => !a.oculta);
  }

  private renderizar() {
    const visiveis = this.abasVisiveis();
    if (this._abaPendente && visiveis.length) {
      if (visiveis.some(a => a.id === this._abaPendente)) {
        this._abaAtiva = this._abaPendente;
        this._abaPendente = '';
      } else if (!this._abas.some(a => a.id === this._abaPendente)) {
        console.warn(`[ui-ribbon] aba-ativa="${this._abaPendente}" não existe em "abas".`);
        this._abaPendente = '';
      }
      // aba existente porém oculta: continua pendente até definirAbaVisivel(id, true)
    }
    if (!visiveis.some(a => a.id === this._abaAtiva)) {
      this._abaAtiva = visiveis[0]?.id ?? '';
    }
    if (this._abaAtiva && !this._abaPendente && this.getAttribute('aba-ativa') !== this._abaAtiva) {
      this.setAttribute('aba-ativa', this._abaAtiva);
    }
    this.comFoco(() => {
      this.renderizarAbas();
      this.renderizarPainel();
    });
  }

  private renderizarAbas() {
    this.abasElement.innerHTML = '';
    this.abasVisiveis().forEach(aba => {
      this.abasElement.appendChild(criarBotaoAba({
        aba,
        ativa: aba.id === this._abaAtiva,
        idBotao: this.idAba(aba.id),
        idPainel: this.painelElement.id
      }));
    });
  }

  private idAba(id: string): string {
    return `${this.uid}-aba-${id.replace(/\s+/g, '_')}`;
  }

  private renderizarPainel() {
    this.fecharMenu();
    this.gruposElement.innerHTML = '';
    const aba = this._abas.find(a => a.id === this._abaAtiva);
    if (!aba) {
      this.painelElement.removeAttribute('aria-labelledby');
      return;
    }
    this.painelElement.setAttribute('aria-labelledby', this.idAba(aba.id));

    aba.grupos.forEach(grupo => this.gruposElement.appendChild(criarGrupoRibbon(
      grupo,
      (item, variante, icone) => this.criarBotao(item, variante, icone),
      {
        colapsado: this.gruposColapsados.has(grupo.id),
        criarDividido: (item, variante, icone) => criarBotaoDividido(this.efetivo(item), variante, icone)
      }
    )));
    definirRoving(this.botoesPainel());
  }

  private iniciarResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    this.observerResize = new ResizeObserver(() => {
      this.ajustarColapsoGrupos();
    });
    this.observerResize.observe(this.painelElement);
  }

  private ajustarColapsoGrupos() {
    const aba = this._abas.find(a => a.id === this._abaAtiva);
    if (!aba || !aba.grupos.length) return;

    const container = this.gruposElement;
    if (container.scrollWidth > container.clientWidth) {
      // Ordena grupos não colapsados por prioridade crescente (menor prioridade colapsa primeiro)
      const candidatos = [...aba.grupos]
        .filter(g => !this.gruposColapsados.has(g.id))
        .sort((a, b) => (a.prioridade ?? 0) - (b.prioridade ?? 0));

      if (candidatos.length > 0) {
        this.gruposColapsados.add(candidatos[0].id);
        this.renderizarPainel();
      }
    } else if (this.gruposColapsados.size > 0) {
      const colapsados = [...aba.grupos]
        .filter(g => this.gruposColapsados.has(g.id))
        .sort((a, b) => (b.prioridade ?? 0) - (a.prioridade ?? 0));

      if (colapsados.length > 0) {
        this.gruposColapsados.delete(colapsados[0].id);
        this.renderizarPainel();
        if (container.scrollWidth > container.clientWidth) {
          this.gruposColapsados.add(colapsados[0].id);
          this.renderizarPainel();
        }
      }
    }
  }

  private alternarMenuGrupoColapsado(btn: HTMLButtonElement, grupo: RibbonGrupo) {
    const jaAberto = this.menu?.ancora === btn;
    this.fecharMenu();
    if (jaAberto) return;

    btn.setAttribute('aria-expanded', 'true');
    this.menu = abrirMenu(
      this.shadowRoot!,
      btn,
      grupo.itens,
      item => {
        const btnReal = this.gruposElement.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${CSS.escape(item.id)}"]`);
        if (btnReal) this.acionar(btnReal, false);
        else {
          const antes = item.ativo;
          if (item.tipo === 'toggle') item.ativo = !antes;
          else if (item.tipo === 'ferramenta') item.ativo = true;
          if (!this.emitir(item)) item.ativo = antes;
        }
        this.rootElement.classList.remove('ui-ribbon--aberto');
      },
      {
        lado: 'baixo',
        onFechar: () => {
          btn.setAttribute('aria-expanded', 'false');
          this.menu = null;
        }
      }
    );
  }

  private criarBotao(item: FerramentaItem, variante: 'grande' | 'pequeno', icone: number): HTMLButtonElement {
    return criarBotaoFerramenta(this.efetivo(item), variante, icone);
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

  private handleClickFixar = () => {
    this.recolhido = !this.recolhido;
  };

  private get rtl(): boolean {
    return getComputedStyle(this).direction === 'rtl';
  }

  private handleDblClickAbas = (e: Event) => {
    if (!(e.target as HTMLElement).closest('.ui-ribbon__aba')) return;
    this.recolhido = !this.recolhido;
  };

  private handleKeyDownAbas = (e: KeyboardEvent) => {
    const tabs = Array.from(this.abasElement.querySelectorAll<HTMLButtonElement>('.ui-ribbon__aba'));
    const acao = acaoDaTeclaAba(e.key, tabs.findIndex(t => t === e.target), tabs.length, this.rtl, this.ativacaoManual);
    if (!acao) return;

    e.preventDefault();
    if (acao.tipo === 'descer') {
      // faixa recolhida: abre o painel flutuante antes de focar o primeiro botão
      if (this.recolhido) this.rootElement.classList.add('ui-ribbon--aberto');
      this.botoesPainel().find(b => !b.disabled)?.focus();
      return;
    }

    if (acao.tipo === 'ativar') {
      const id = tabs[acao.indice].dataset.id;
      if (id) this.selecionarAba(id);
      return;
    }

    const id = tabs[acao.indice].dataset.id;
    if (this.ativacaoManual) {
      // ativacao manual: as setas so movem o foco (roving); Enter/Espaco ativam
      tabs.forEach(t => (t.tabIndex = -1));
      tabs[acao.indice].tabIndex = 0;
      tabs[acao.indice].focus();
      return;
    }
    if (id) this.selecionarAba(id);
    this.abasElement.querySelector<HTMLButtonElement>(`.ui-ribbon__aba[data-id="${CSS.escape(id ?? '')}"]`)?.focus();
  };

  private handleClickGrupos = (e: Event) => {
    const alvo = e.target as HTMLElement;
    const aba = this._abas.find(a => a.id === this._abaAtiva);

    // grupo colapsado (sem espaço): o botão único abre o flyout com os itens do grupo
    const colapsado = alvo.closest<HTMLButtonElement>('.ui-ribbon__btn-colapsado');
    if (colapsado) {
      const grupo = aba?.grupos.find(g => g.id === colapsado.dataset.grupoColapsado);
      if (grupo) this.alternarMenuGrupoColapsado(colapsado, grupo);
      return;
    }

    // lançador de diálogo do grupo
    const lancador = alvo.closest<HTMLButtonElement>('.ui-ribbon__lancador');
    if (lancador) {
      const grupo = aba?.grupos.find(g => g.id === lancador.dataset.lancador);
      if (grupo) {
        this.dispatchEvent(new CustomEvent('ui-grupo-dialogo', {
          detail: { id: typeof grupo.lancadorDialogo === 'string' ? grupo.lancadorDialogo : grupo.id, grupo },
          bubbles: true,
          composed: true
        }));
      }
      return;
    }

    const splitGatilho = alvo.closest<HTMLButtonElement>('.ui-ferr-split__gatilho');
    if (splitGatilho) {
      const split = splitGatilho.closest<HTMLElement>('.ui-ferr-split');
      const id = split?.dataset.id;
      const item = aba && acharItem(aba.grupos.flatMap(g => g.itens), id ?? '');
      if (item && item.filhos?.length) {
        this.alternarMenu(splitGatilho, item, false);
      }
      return;
    }

    const btn = alvo.closest<HTMLButtonElement>('.ui-ferr-btn');
    if (!btn?.dataset.id) return;
    // detail === 0: ativação por teclado (Enter/Espaço) → foca o primeiro item do menu
    this.acionar(btn, (e as MouseEvent).detail === 0);
  };

  private handleKeyDownGrupos = (e: KeyboardEvent) => {
    const botoes = this.botoesPainel();
    if (this.rtl ? navegarRoving(e, botoes, ['ArrowRight'], ['ArrowLeft']) : navegarRoving(e, botoes, ['ArrowLeft'], ['ArrowRight'])) return;

    const btn = e.target instanceof HTMLButtonElement ? e.target : null;
    if (btn?.getAttribute('aria-haspopup') === 'menu' && e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.menu?.ancora === btn) this.menu.focarPrimeiro();
      else this.acionar(btn, true);
    }
  };

  private handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !this.menu) this.rootElement.classList.remove('ui-ribbon--aberto');
  };

  private handlePointerDownFora = (e: Event) => {
    if (!this.recolhido || !this.rootElement.classList.contains('ui-ribbon--aberto')) return;
    if (!e.composedPath().includes(this)) this.rootElement.classList.remove('ui-ribbon--aberto');
  };

  private handleAtalho = (e: KeyboardEvent) => {
    if (!this.hasAttribute('atalhos') && !this.hasAttribute('keytips')) return;
    if (e.defaultPrevented) return;

    const caminho = e.composedPath() as HTMLElement[];
    const origem = caminho[0];
    if (origem && (/^(INPUT|TEXTAREA|SELECT)$/.test(origem.tagName) || origem.isContentEditable)) return;
    const bloqueia = caminho.some(el => {
      const role = el.getAttribute?.('role');
      return (
        el.getAttribute?.('aria-modal') === 'true' ||
        role === 'textbox' || role === 'searchbox' || role === 'combobox' || role === 'spinbutton'
      );
    });
    if (bloqueia) return;

    if (this.hasAttribute('keytips') && (e.key === 'Alt' || e.key === 'F10') && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
      e.preventDefault();
      this.alternarKeyTips();
      return;
    }

    if (!this.hasAttribute('atalhos')) return;

    const aba = this._abas.find(a => a.id === this._abaAtiva);
    if (!aba) return;
    const itens = aba.grupos.flatMap(g => g.itens);
    const item = itens.find(i => !i.disabled && correspondeAtalho(e, i.atalho));
    if (!item) return;

    e.preventDefault();
    const btn = this.gruposElement.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${CSS.escape(item.id)}"]`);
    if (btn) this.acionar(btn, false);
    else this.emitir(item);
  };

  private alternarKeyTips() {
    this.keytipsAtivas = !this.keytipsAtivas;
    this.shadowRoot!.querySelectorAll('.ui-ribbon__keytip').forEach(el => el.remove());
    if (!this.keytipsAtivas) return;

    const tabs = Array.from(this.abasElement.querySelectorAll<HTMLButtonElement>('.ui-ribbon__aba'));
    tabs.forEach((tab, idx) => {
      const badge = document.createElement('span');
      badge.className = 'ui-ribbon__keytip';
      badge.textContent = String(idx + 1);
      badge.style.top = '2px';
      badge.style.left = '4px';
      tab.style.position = 'relative';
      tab.appendChild(badge);
    });
  }

  private acionar(btn: HTMLButtonElement, focarMenu: boolean) {
    const aba = this._abas.find(a => a.id === this._abaAtiva);
    const grupo = aba?.grupos.find(g => acharItem(g.itens, btn.dataset.id!));
    const item = grupo && acharItem(grupo.itens, btn.dataset.id!);
    if (!item || item.disabled) return;

    if (item.filhos?.length && !item.dividido) {
      this.alternarMenu(btn, item, focarMenu);
      return;
    }

    if (item.tipo === 'toggle') {
      const antes = item.ativo;
      item.ativo = !antes;
      aplicarEstadoBotao(btn, item);
      if (!this.emitir(item)) {
        item.ativo = antes;
        aplicarEstadoBotao(btn, item);
      }
    } else if (item.tipo === 'ferramenta') {
      const antesAtivo = item.ativo;
      const exclusivo = grupo ? grupo.exclusivo !== false : true;
      const irmaos = (exclusivo && grupo)
        ? grupo.itens.filter(i => i.tipo === 'ferramenta' && i.id !== item.id && i.ativo)
        : [];

      item.ativo = true;
      aplicarEstadoBotao(btn, item);
      if (exclusivo) {
        irmaos.forEach(i => {
          i.ativo = false;
          const b = this.gruposElement.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${CSS.escape(i.id)}"]`);
          if (b) aplicarEstadoBotao(b, i);
        });
      }

      if (!this.emitir(item)) {
        item.ativo = antesAtivo;
        aplicarEstadoBotao(btn, item);
        if (exclusivo) {
          irmaos.forEach(i => {
            i.ativo = true;
            const b = this.gruposElement.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${CSS.escape(i.id)}"]`);
            if (b) aplicarEstadoBotao(b, i);
          });
        }
      }
    } else {
      this.emitir(item);
    }
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
        if (filho.tipo === 'toggle') {
          const antes = filho.ativo;
          filho.ativo = !antes;
          if (!this.emitir(filho, item)) filho.ativo = antes;
        } else {
          this.emitir(filho, item);
        }
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

  /** Retorna false se o consumidor cancelou o evento (preventDefault). */
  private emitir(item: FerramentaItem, pai?: FerramentaItem): boolean {
    return this.dispatchEvent(
      new CustomEvent('ui-ferramenta', {
        detail: { id: item.id, item, pai, ativo: item.ativo, origem: 'ribbon', aba: this._abaAtiva },
        bubbles: true,
        composed: true,
        cancelable: true
      })
    );
  }
}

definirCustomElement('ui-ribbon', UIRibbon);
