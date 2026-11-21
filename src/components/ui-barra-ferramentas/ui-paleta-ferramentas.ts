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
  criarBotaoFerramenta,
  definirRoving,
  GerenciadorTooltip,
  navegarGrade2Colunas,
  navegarRoving,
  seguirFoco,
  type MenuHandle
} from './ferramentas-comum';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ATRIBUTOS_DEGRADE, aplicarDegradeNoElemento, ehAtributoDegrade } from '../../core/degrade';
import { PressaoLonga } from './paleta-pressao-longa';
import { atalhoBloqueadoPeloContexto, paletaDonaDosAtalhos, resolverAtalho } from './paleta-atalhos';
import { calcularAjuste, particionarItens, type ResultadoAjuste } from './paleta-ajuste';
import { acharAtivoOculto, criarBotaoMais, idsOcultos } from './paleta-excesso';

const TAMANHO_ICONE: Record<string, number> = { sm: 16, md: 18, lg: 22 };
/** Lado do botão (px) quando o CSS não pode ser lido: [ponteiro fino, ponteiro grosso/toque]. */
const TAMANHO_BOTAO: Record<string, [number, number]> = { sm: [28, 36], md: [34, 40], lg: [42, 48] };
/** Espessura de um separador (1px + margens de 3px). */
const ESPESSURA_SEPARADOR = 7;

const lerPx = (valor: string | undefined, padrao: number): number => {
  const n = parseFloat(valor ?? '');
  return Number.isFinite(n) ? n : padrao;
};

/**
 * <ui-paleta-ferramentas> — paleta de ferramentas gráficas com grupos expansíveis.
 *
 * - Itens com `filhos` viram um grupo: mostra a última ferramenta usada e abre um flyout
 *   com clique longo, botão direito ou seta (→ na vertical, ↓ na horizontal).
 * - Ferramentas (`tipo` padrão) são exclusivas; `toggle` liga/desliga; `botao` só dispara ação.
 * - Com o atributo `atalhos`, a tecla `atalho` do item ativa a ferramenta; teclas repetidas
 *   entre itens percorrem o grupo.
 * - Responsiva: quando o contêiner direto não comporta a paleta, `colunas="auto"` passa para 2 colunas
 *   e, se ainda faltar espaço, `excesso="menu"` (padrão) move o restante para o botão "Mais ferramentas".
 *   Se a ferramenta ativa estiver oculta, o botão assume o ícone e o destaque dela. Atalhos, API e
 *   eventos seguem valendo para itens ocultos. O espaço é medido no elemento pai (que precisa ter
 *   altura/largura própria); sem limite, nada é ocultado.
 *
 * Atributos: valor (vazio limpa a seleção), orientacao (vertical|horizontal), colunas (1|2|auto),
 *            tamanho (sm|md|lg), excesso (menu|rolar), atalhos, aria-label (rótulo da toolbar)
 * Propriedades: ferramentas, valor, orientacao, colunas, tamanho, excesso
 * Métodos: ativar(id), limpar(), atualizarItem(id, parcial), reajustar()
 * Eventos: ui-change / ui-selecionar { valor, item, anterior },
 *          ui-ferramenta { id, item, pai?, ativo?, origem } (cancelável: preventDefault reverte a ação),
 *          ui-paleta-ajuste { colunas, visiveis, total, ocultos } (colunas efetivas / itens ocultos mudaram)
 *
 * `valor` pode ser definido antes de `ferramentas`: fica pendente até a ferramenta existir.
 *
 * @csspart base - Contêiner raiz da paleta de ferramentas.
 */
export class UIPaletaFerramentas extends SafeHTMLElement {
  static get observedAttributes() {
    return ['valor', 'value', 'orientacao', 'colunas', 'tamanho', 'size', 'excesso', 'aria-label', 'copiar-dados', 'modo-controlado', ...ATRIBUTOS_DEGRADE];
  }

  private rootElement: HTMLDivElement;
  private _ferramentas: FerramentaItem[] = [];
  private _ativo = '';
  private _pendente = '';
  private visiveis = new Map<string, string>(); // id do grupo → id do filho exibido
  private menu: MenuHandle | null = null;
  private pressao = new PressaoLonga();
  private listeners = new ListenerBag();
  private tooltip: GerenciadorTooltip | null = null;
  private _modoControlado = false;
  /** Ajuste ao espaço atual (null até a primeira renderização). */
  private _ajuste: ResultadoAjuste | null = null;
  /** Quantidade de itens da lista para a qual `_ajuste` foi calculado. */
  private _totalAjustado = 0;
  /** Itens de topo que não couberam (menu "Mais ferramentas"). */
  private _excesso: FerramentaItem[] = [];
  private observador: ResizeObserver | null = null;
  private rafAjuste: number | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilosComuns}${estilos}</style>
      <div class="ui-paleta ui-paleta--vertical" part="base" role="toolbar" aria-orientation="vertical" aria-label="Ferramentas"></div>
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
    aplicarDegradeNoElemento(this, this.rootElement);
    this.aplicarPendente();
    this.renderizar();
    this.iniciarObservador();
  }

  disconnectedCallback() {
    this.pararObservador();
    this.pressao.destruir();
    this.fecharMenu();
    this.tooltip?.destruir();
    this.tooltip = null;
    this.listeners.cleanup();
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (old === value) return;
    if (ehAtributoDegrade(name)) {
      aplicarDegradeNoElemento(this, this.rootElement);
      return;
    }
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

  /** Colunas em uso. Com `colunas="auto"` reflete o ajuste atual ao espaço (1 ou 2). */
  get colunas(): 1 | 2 {
    const a = this.getAttribute('colunas');
    if (a === '2') return 2;
    if (a === 'auto') return this._ajuste?.colunas ?? 1;
    return 1;
  }

  set colunas(val: 1 | 2 | 'auto') {
    this.setAttribute('colunas', String(val));
  }

  private get modoColunas(): 1 | 2 | 'auto' {
    const a = this.getAttribute('colunas');
    return a === '2' ? 2 : a === 'auto' ? 'auto' : 1;
  }

  /** O que fazer quando a paleta não cabe: `menu` (botão "Mais ferramentas", padrão) ou `rolar` (barra de rolagem). */
  get excesso(): 'menu' | 'rolar' {
    return this.getAttribute('excesso') === 'rolar' ? 'rolar' : 'menu';
  }

  set excesso(val: 'menu' | 'rolar') {
    this.setAttribute('excesso', val);
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
    // item oculto no menu "Mais ferramentas": o estado do botão "mais" depende dele → re-renderiza
    const oculto = this._excesso.some(e => e.id === (grupoPai?.id ?? id));
    // `disabled` num filho pode mudar qual filho é exibido → re-renderiza
    if (soEstado && !oculto && !(grupoPai && 'disabled' in parcial)) {
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

  /**
   * Reavalia o espaço disponível (colunas e itens ocultos). É chamado sozinho quando o contêiner
   * muda de tamanho; chame manualmente após mudanças de layout que o navegador não notifica.
   */
  public reajustar() {
    if (!this.isConnected) return;
    const novo = this.calcularAtual();
    if (this.mesmoAjuste(novo, this._ajuste)) return;
    this.renderizar(novo);
  }

  /* ---------- Ajuste ao espaço ---------- */

  /** `a` foi calculado para a lista atual; `b` (o ajuste guardado) para a lista de `_totalAjustado` itens. */
  private mesmoAjuste(a: ResultadoAjuste, b: ResultadoAjuste | null): boolean {
    if (!b || a.colunas !== b.colunas) return false;
    const aTodos = a.visiveis >= this._ferramentas.length;
    const bTodos = b.visiveis >= this._totalAjustado;
    return (aTodos && bTodos) || a.visiveis === b.visiveis;
  }

  /**
   * Só reduz quando a paleta realmente transborda (ou já estava reduzida e precisa decidir se pode
   * crescer): um contêiner de altura automática nunca causa ocultação por erro de estimativa.
   */
  private calcularAtual(): ResultadoAjuste {
    const total = this._ferramentas.length;
    const modo = this.modoColunas;
    const vertical = this.orientacao === 'vertical';
    const base: ResultadoAjuste = { colunas: vertical && modo === 2 ? 2 : 1, visiveis: total };
    if (!this.isConnected || total === 0) return base;

    const anterior = this._ajuste;
    // "reduzido" = o ajuste guardado ocultou itens da lista para a qual foi calculado (lista vazia não conta)
    const reduzido = !!anterior && (anterior.visiveis < this._totalAjustado || (vertical && modo === 'auto' && anterior.colunas === 2));
    if (!reduzido && !this.transbordando(vertical)) return base;

    const medidas = this.medirPaleta(vertical);
    return calcularAjuste({
      separadores: this._ferramentas.map(f => f?.tipo === 'separador'),
      vertical,
      colunas: modo,
      limite: this.limiteDisponivel(vertical),
      ...medidas,
      excessoMenu: this.excesso === 'menu'
    });
  }

  private transbordando(vertical: boolean): boolean {
    const r = this.rootElement;
    return vertical ? r.scrollHeight > r.clientHeight + 1 : r.scrollWidth > r.clientWidth + 1;
  }

  /** Espaço (px) que o elemento pai oferece no eixo principal; 0 = desconhecido (sem limite). */
  private limiteDisponivel(vertical: boolean): number {
    const pai = this.parentElement;
    if (!pai) return 0;
    const cs = getComputedStyle(pai);
    const tamanho = vertical ? pai.clientHeight : pai.clientWidth;
    const padding = vertical
      ? lerPx(cs.paddingTop, 0) + lerPx(cs.paddingBottom, 0)
      : lerPx(cs.paddingLeft, 0) + lerPx(cs.paddingRight, 0);
    return tamanho - padding;
  }

  /** Medidas reais do CSS (tamanho/toque/tema); cai em valores padrão se o navegador não as expõe. */
  private medirPaleta(vertical: boolean) {
    const cs = getComputedStyle(this.rootElement);
    const toque = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const [fino, grosso] = TAMANHO_BOTAO[this.tamanho] ?? TAMANHO_BOTAO.md;
    const moldura = vertical
      ? lerPx(cs.paddingTop, 4) + lerPx(cs.paddingBottom, 4) + lerPx(cs.borderTopWidth, 1) + lerPx(cs.borderBottomWidth, 1)
      : lerPx(cs.paddingLeft, 4) + lerPx(cs.paddingRight, 4) + lerPx(cs.borderLeftWidth, 1) + lerPx(cs.borderRightWidth, 1);
    return {
      botao: lerPx(cs.getPropertyValue('--ui-paleta-btn'), toque ? grosso : fino),
      gap: lerPx(vertical ? cs.rowGap : cs.columnGap, 2),
      moldura,
      separador: ESPESSURA_SEPARADOR
    };
  }

  private iniciarObservador() {
    this.pararObservador();
    if (typeof ResizeObserver === 'undefined') return;
    this.observador = new ResizeObserver(() => this.agendarAjuste());
    if (this.parentElement) this.observador.observe(this.parentElement);
    this.observador.observe(this);
  }

  private pararObservador() {
    this.observador?.disconnect();
    this.observador = null;
    if (this.rafAjuste !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.rafAjuste);
    this.rafAjuste = null;
  }

  /** Agrupa rajadas de resize num único reajuste por quadro (evita "ResizeObserver loop"). */
  private agendarAjuste() {
    if (typeof requestAnimationFrame !== 'function') {
      this.reajustar();
      return;
    }
    if (this.rafAjuste !== null) return;
    this.rafAjuste = requestAnimationFrame(() => {
      this.rafAjuste = null;
      this.reajustar();
    });
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

  private renderizar(ajuste?: ResultadoAjuste) {
    // Preserva o foco do teclado (o botão de um grupo é identificado pelo grupo, pois o filho exibido pode mudar)
    const ativoEl = this.shadowRoot?.activeElement as HTMLElement | null;
    const foco =
      ativoEl && ativoEl.classList.contains('ui-ferr-btn')
        ? { id: ativoEl.dataset.id ?? '', grupo: ativoEl.dataset.grupo ?? '', mais: ativoEl.dataset.mais !== undefined }
        : null;

    this.fecharMenu();
    const orientacao = this.orientacao;
    const tamanho = this.tamanho;

    const novoAjuste = ajuste ?? this.calcularAtual();
    const anterior = this._ajuste;
    const mudouAjuste = !!anterior && !this.mesmoAjuste(novoAjuste, anterior);
    this._ajuste = novoAjuste;
    this._totalAjustado = this._ferramentas.length;

    this.rootElement.className = `ui-paleta ui-paleta--${orientacao} ui-paleta--${tamanho}`;
    if (novoAjuste.colunas === 2 && orientacao === 'vertical') this.rootElement.classList.add('ui-paleta--cols-2');
    this.rootElement.setAttribute('aria-orientation', orientacao);
    this.rootElement.setAttribute('aria-label', this.getAttribute('aria-label') || 'Ferramentas');
    this.rootElement.innerHTML = '';

    const tamanhoIcone = TAMANHO_ICONE[tamanho] ?? 18;
    const { visiveis, excesso } = particionarItens(this._ferramentas, novoAjuste.visiveis, i => i.tipo === 'separador');
    this._excesso = excesso;

    visiveis.forEach(item => {
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

    if (excesso.length) {
      this.rootElement.appendChild(criarBotaoMais(excesso, this._ativo, tamanhoIcone));
    }

    definirRoving(this.botoes());
    // a ferramenta ativa (ou o "mais", se ela estiver oculta) recebe o tabindex do roving
    const ativo =
      this.botoes().find(b => b.dataset.id === this._ativo && !b.disabled) ??
      (acharAtivoOculto(excesso, this._ativo) ? this.botaoMais() : null);
    if (ativo && !ativo.disabled) {
      this.botoes().forEach(b => (b.tabIndex = -1));
      ativo.tabIndex = 0;
    }

    if (foco) {
      const alvo = foco.mais
        ? this.botaoMais()
        : this.botoes().find(b => (foco.grupo ? b.dataset.grupo === foco.grupo : b.dataset.id === foco.id));
      if (alvo && !alvo.disabled) alvo.focus();
    }

    if (mudouAjuste) {
      this.dispatchEvent(
        new CustomEvent('ui-paleta-ajuste', {
          detail: {
            colunas: novoAjuste.colunas,
            visiveis: visiveis.filter(i => i.tipo !== 'separador').length,
            total: this._ferramentas.filter(i => i.tipo !== 'separador').length,
            ocultos: idsOcultos(excesso)
          },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  private botaoMais(): HTMLButtonElement | null {
    return this.rootElement.querySelector<HTMLButtonElement>('.ui-ferr-btn--mais');
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
    if (this.pressao.consumirSupressao()) return;
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ui-ferr-btn');
    if (btn && btn.dataset.mais !== undefined) {
      if (btn.disabled) return;
      if (this.menu?.ancora === btn) this.fecharMenu();
      else this.abrirFlyout(btn, false);
      return;
    }
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
    this.pressao.iniciar(pe.clientX ?? 0, pe.clientY ?? 0, () => this.abrirFlyout(btn, false));
  };

  private handlePointerMove = (e: Event) => {
    const pe = e as PointerEvent;
    this.pressao.mover(pe.clientX ?? 0, pe.clientY ?? 0);
  };

  private handlePointerFim = () => this.pressao.fim();

  private handleContextMenu = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ui-ferr-btn--grupo');
    if (!btn) return;
    e.preventDefault();
    this.pressao.cancelar();
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
    if (btn && (btn.dataset.grupo || btn.dataset.mais !== undefined) && e.key === teclaFlyout) {
      e.preventDefault();
      if (this.menu?.ancora === btn) this.menu.focarPrimeiro();
      else this.abrirFlyout(btn, true);
    }
  };

  /** Várias paletas com `atalhos` na página: só a que contém o foco (ou a primeira no DOM) responde. */
  private donaDosAtalhos(): boolean {
    const paletas = Array.from(document.querySelectorAll<UIPaletaFerramentas>('ui-paleta-ferramentas[atalhos]'));
    if (paletas.length <= 1) return true;
    return paletaDonaDosAtalhos(paletas, (p) => p.matches(':focus-within') || !!p.shadowRoot?.activeElement) === this;
  }

  private handleAtalho = (e: KeyboardEvent) => {
    // combinações (Ctrl+Z, Shift+V, Esc) contam; só a paleta dona responde quando há várias na página
    if (!this.hasAttribute('atalhos') || e.defaultPrevented) return;
    if (atalhoBloqueadoPeloContexto(e.composedPath())) return;
    if (!this.donaDosAtalhos()) return;

    const resolvido = resolverAtalho(e, this.todasFerramentas(), this._ferramentas, this._ativo);
    if (!resolvido) return;

    e.preventDefault();
    this.acionar(resolvido.alvo, resolvido.pai);
  };

  private abrirFlyout(btn: HTMLButtonElement, focar: boolean) {
    const ehMais = btn.dataset.mais !== undefined;
    const grupo = !ehMais && btn.dataset.grupo ? acharItem(this._ferramentas, btn.dataset.grupo) : undefined;
    const origem = ehMais ? this._excesso : grupo?.filhos;
    if (!origem?.length) return;

    this.fecharMenu();
    // o menu "mais" pode conter grupos (submenus): marca a ferramenta ativa em todos os níveis
    const marcar = (f: FerramentaItem): FerramentaItem => ({
      ...f,
      ativo: !f.filhos?.length && (f.tipo ?? 'ferramenta') === 'ferramenta' ? f.id === this._ativo : f.ativo,
      filhos: f.filhos?.map(marcar)
    });
    const filhos = origem.map(marcar);
    const vertical = this.getAttribute('orientacao') !== 'horizontal';
    const rtl = getComputedStyle(this).direction === 'rtl';
    btn.setAttribute('aria-expanded', 'true');
    this.menu = abrirMenu(
      this.shadowRoot!,
      btn,
      filhos,
      escolhido => {
        const original = acharItem(this._ferramentas, escolhido.id);
        if (!original) return;
        const pai = grupo ?? this._ferramentas.find(g => g.filhos?.some(f => f.id === original.id));
        this.acionar(original, pai);
        // o botão do grupo (ou o "mais") foi recriado: devolve o foco a ele
        (ehMais ? this.botaoMais() : this.botoes().find(b => b.dataset.grupo === grupo?.id))?.focus();
      },
      {
        lado: !vertical ? 'baixo' : rtl ? 'esquerda' : 'direita',
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
