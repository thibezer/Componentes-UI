import { ListenerBag } from '../../core/listener-bag';
import type { DensidadeTabela, TabelaColuna, UISortDetail, UIColumnResizeDetail, UIRowScrollOptions, UISelecaoRemovidaDetail } from './tipos';
import { TabelaRemotaController } from './tabela-remota';
import { TabelaSelecaoController } from './tabela-selecao';
import { TabelaOrquestradorDados } from './tabela-orquestrador-dados';
import { getRowHeight } from './tabela-dom';
import {
  executarOrquestracaoHeader,
  executarOrquestracaoCorpo,
  inicializarScrollVirtualizacao,
  orquestrarEstruturaInicial,
  ContextoOrquestradorRender
} from './tabela-renderizador';
import { sincronizarAtributosTabela, tratarMudancaAtributoTabela } from './tabela-atributos-sync';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

export type { DensidadeTabela, TabelaColuna, UISortDetail, UIColumnResizeDetail, UIRowScrollOptions, UISelecaoRemovidaDetail };

export class UITabela extends SafeHTMLElement {
  static get observedAttributes() {
    return ['texto-vazio', 'empty-text', 'max-height', 'densidade', 'density', 'altura-linha', 'row-height', 'virtualizar', 'virtualize', 'src', 'carregando', 'loading', 'chave-id', 'id-key', 'aria-label'];
  }

  private shadow: ShadowRoot;
  private _colunas: TabelaColuna[] = [];
  private _textoVazio: string = 'Nenhum registro encontrado';
  private _virtualizar: boolean = true;
  private _isResizing: boolean = false;
  private _carregando: boolean = false;
  private _src: string | null = null;

  private _containerElement: HTMLDivElement | null = null;
  private _tableElement: HTMLTableElement | null = null;
  private _theadElement: HTMLTableSectionElement | null = null;
  private _tbodyElement: HTMLTableSectionElement | null = null;
  private _colgroupElement: HTMLTableColElement | null = null;
  private _emptyElement: HTMLDivElement | null = null;
  private _loadingElement: HTMLDivElement | null = null;

  private _scrollHandler: ((e: Event) => void) | null = null;
  private _activeResizeCleanup: (() => void) | null = null;
  private _headerListeners = new ListenerBag();
  private _corpoListeners = new ListenerBag();
  /** Linha com o foco móvel (navegação por teclado); null = primeira linha visível. */
  private _indiceAtivo: number | null = null;
  /** Altura real das linhas medida no DOM; null = usa a estimativa da densidade. */
  private _alturaLinhaMedida: number | null = null;
  /** Cancela a correção pendente de uma rolagem suave anterior. */
  private _cancelarCorrecaoRolagem: (() => void) | null = null;

  private remotaController: TabelaRemotaController;
  private selecaoController: TabelaSelecaoController;
  private dadosController = new TabelaOrquestradorDados();

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.remotaController = new TabelaRemotaController({
      host: this,
      onCarregandoAlterado: (c) => { this.carregando = c; },
      onDadosRecebidos: (d) => { this.dados = d; }
    });
    this.selecaoController = new TabelaSelecaoController({
      host: this,
      getTbody: () => this._tbodyElement,
      getDadosExibicao: () => this.dadosController.getDadosExibicao(),
      getDadosOriginais: () => this.dadosController.getDadosOriginais(),
      getChaveId: () => this.chaveId,
      onRolarParaIndice: (indice, comportamento) => this.posicionarLinha(indice, comportamento),
      onLinhaAtiva: (indice) => this.definirLinhaAtiva(indice)
    });
  }

  connectedCallback() {
    this.syncAttributes();
    if (this.alturaLinha) this.style.setProperty('--ui-tabela-altura-linha', `${this.alturaLinha}px`);
    if (!this.hasAttribute('densidade') && !this.hasAttribute('density')) this.setAttribute('densidade', 'normal');
    this.renderTotal();
    if (this._src) this.remotaController.carregar(this._src);
  }

  disconnectedCallback() { this.cleanupEventListeners(); }

  attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null) {
    if (name === 'densidade' || name === 'density' || name === 'altura-linha' || name === 'row-height') this._alturaLinhaMedida = null;
    if (name === 'altura-linha' || name === 'row-height') this.aplicarAlturaLinha();
    if (name === 'chave-id' || name === 'id-key') this.atualizarContextoSelecao();
    tratarMudancaAtributoTabela(name, newVal, this.obterContextoAtributos());
    this.sincronizarAria();
  }

  /** Nome acessível vem do host (`aria-label`); `aria-busy` acompanha o carregamento remoto. */
  private sincronizarAria() {
    if (!this._tableElement) return;
    const rotulo = this.getAttribute('aria-label');
    if (rotulo) this._tableElement.setAttribute('aria-label', rotulo);
    else this._tableElement.removeAttribute('aria-label');
    this._tableElement.setAttribute('aria-busy', String(this._carregando));
  }

  private syncAttributes() { sincronizarAtributosTabela(this.obterContextoAtributos()); }

  private obterContextoAtributos() {
    return {
      host: this,
      containerElement: this._containerElement,
      emptyElement: this._emptyElement,
      loadingElement: this._loadingElement,
      onTextoVazioAlterado: (t: string) => { this._textoVazio = t; },
      onVirtualizarAlterado: (v: boolean) => { this._virtualizar = v; },
      onCarregarSrc: (s: string) => { this._src = s; this.remotaController.carregar(s); },
      onCarregandoAlterado: (c: boolean) => { this._carregando = c; },
      onRenderBody: () => this.renderBody(),
      onRenderTotal: () => this.renderTotal()
    };
  }

  get src(): string | null { return this._src; }
  set src(val: string | null) {
    this._src = val;
    if (val) { this.setAttribute('src', val); this.remotaController.carregar(val); }
    else this.removeAttribute('src');
  }

  get carregando(): boolean { return this._carregando; }
  set carregando(val: boolean) {
    this._carregando = Boolean(val);
    if (this._carregando) this.setAttribute('carregando', '');
    else { this.removeAttribute('carregando'); this.removeAttribute('loading'); }
    if (this._loadingElement) this._loadingElement.style.display = this._carregando ? 'flex' : 'none';
    this.sincronizarAria();
  }

  public async carregarDoEndpoint(url?: string): Promise<void> { await this.remotaController.carregar(url || this._src || ''); }
  public async recarregar(): Promise<void> {
    if (this._src) await this.remotaController.carregar(this._src);
    else { this.dadosController.aplicarOrdenacao(); this.atualizarContextoSelecao(); this.renderBody(); }
  }

  public filtrar(termo: string): void {
    this.dadosController.filtrar(termo);
    this.atualizarContextoSelecao();
    this.renderBody();
  }

  private cleanupEventListeners() {
    if (this._containerElement && this._scrollHandler) {
      this._containerElement.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }
    if (this._activeResizeCleanup) { this._activeResizeCleanup(); this._activeResizeCleanup = null; }
    this._cancelarCorrecaoRolagem?.();
    this.remotaController.abortar();
    this._headerListeners.cleanup();
    this._corpoListeners.cleanup();
  }

  get colunas(): TabelaColuna[] { return this._colunas; }
  set colunas(val: TabelaColuna[]) {
    this._colunas = Array.isArray(val) ? val : [];
    this._alturaLinhaMedida = null;
    this.renderTotal();
  }
  get dados(): Record<string, any>[] { return this.dadosController.getDadosOriginais(); }
  set dados(val: Record<string, any>[]) {
    this.dadosController.setDadosOriginais(val);
    this.atualizarContextoSelecao();
    this.renderBody();
  }
  get itens(): Record<string, any>[] { return this.dados; }
  set itens(val: Record<string, any>[]) { this.dados = val; }
  get chaveId(): string { return this.getAttribute('chave-id') || this.getAttribute('id-key') || 'id'; }
  set chaveId(val: string) {
    if (val) this.setAttribute('chave-id', val);
    else { this.removeAttribute('chave-id'); this.removeAttribute('id-key'); }
    this.atualizarContextoSelecao();
  }
  get itemSelecionado(): Record<string, any> | null { return this.selecaoController.getItemSelecionado(); }
  set itemSelecionado(item: Record<string, any> | null) { this.selecaoController.setItemSelecionado(item); }
  get indiceSelecionado(): number | null { return this.selecaoController.getIndiceSelecionado(); }
  set indiceSelecionado(idx: number | null) { this.selecaoController.setIndiceSelecionado(idx); }
  public limparSelecao(): void { this.selecaoController.limparSelecao(); }

  get densidade(): DensidadeTabela {
    const val = this.getAttribute('densidade') || this.getAttribute('density');
    return val === 'compacta' || val === 'compact' ? 'compacta' : (val === 'relaxada' || val === 'relaxed' ? 'relaxada' : 'normal');
  }
  set densidade(val: DensidadeTabela) {
    if (val) this.setAttribute('densidade', val);
    else { this.removeAttribute('densidade'); this.removeAttribute('density'); }
    this.renderBody();
  }

  get virtualizar(): boolean { return this._virtualizar; }
  set virtualizar(val: boolean) {
    this._virtualizar = Boolean(val);
    if (val) this.setAttribute('virtualizar', 'true');
    else this.removeAttribute('virtualizar');
    this.renderTotal();
  }

  get colunaOrdenada(): string | null { return this.dadosController.getColunaOrdenada(); }
  set colunaOrdenada(id: string | null) {
    this.dadosController.setColunaOrdenada(id);
    this.atualizarContextoSelecao();
    this.renderHeader();
    this.renderBody();
  }

  get direcaoOrdenacao(): 'asc' | 'desc' | 'original' { return this.dadosController.getDirecaoOrdenacao(); }
  set direcaoOrdenacao(dir: 'asc' | 'desc' | 'original') {
    this.dadosController.setDirecaoOrdenacao(dir);
    this.atualizarContextoSelecao();
    this.renderHeader();
    this.renderBody();
  }

  get textoVazio(): string { return this._textoVazio; }
  set textoVazio(txt: string) { this._textoVazio = txt || 'Nenhum registro encontrado'; this.renderTotal(); }

  private handleHeaderClick(coluna: TabelaColuna) {
    if (!coluna.ordenavel || this._isResizing) return;
    const proxima = this.dadosController.alternarOrdenacaoColuna(coluna);
    if (!proxima) return;
    this.atualizarContextoSelecao();
    this.renderHeader();
    this.renderBody();
    this.dispatchEvent(new CustomEvent<UISortDetail>('ui-sort', { detail: proxima, bubbles: true, composed: true }));
  }

  /** Altura fixa das linhas em px (`altura-linha`), sobrepõe a densidade; null = vale a densidade. */
  get alturaLinha(): number | null {
    const bruto = this.getAttribute('altura-linha') ?? this.getAttribute('row-height');
    const n = bruto === null ? NaN : parseFloat(bruto);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  set alturaLinha(val: number | null) {
    if (val && val > 0) this.setAttribute('altura-linha', String(val));
    else { this.removeAttribute('altura-linha'); this.removeAttribute('row-height'); }
  }

  /** Publica a altura fixa como variável CSS (usada pelo estilo `:host([altura-linha])`). */
  private aplicarAlturaLinha() {
    const h = this.alturaLinha;
    if (h) this.style.setProperty('--ui-tabela-altura-linha', `${h}px`);
    else this.style.removeProperty('--ui-tabela-altura-linha');
    this.renderBody();
  }

  /** Altura usada na virtualização: a fixa (`altura-linha`), a medida no DOM ou a estimativa da densidade. */
  private getRowHeight(): number { return this.alturaLinha ?? this._alturaLinhaMedida ?? getRowHeight(this.densidade); }

  /**
   * Mede a altura real das linhas uma vez por configuração (densidade/colunas): padding, fonte e
   * renderizadores customizados mudam a altura, e a estimativa fixa desalinharia a janela virtual.
   * Não remede a cada rolagem para os espaçadores não "pularem" com linhas de alturas diferentes.
   */
  private medirAlturaLinha() {
    if (this._alturaLinhaMedida !== null || !this._tbodyElement) return;
    const linhas = this._tbodyElement.querySelectorAll<HTMLElement>('tr[data-index]');
    if (linhas.length === 0) return;
    let soma = 0;
    linhas.forEach((linha) => { soma += linha.getBoundingClientRect().height; });
    const media = soma / linhas.length;
    if (media <= 0) return; // tabela oculta ou sem layout: mede na próxima renderização
    this._alturaLinhaMedida = media;
    if (Math.abs(media - getRowHeight(this.densidade)) > 0.5) this.renderBody();
  }

  /** Ordenar, filtrar, trocar os dados ou a chave mantém a linha selecionada (se ainda existir). */
  private atualizarContextoSelecao() {
    this.selecaoController.reconciliar();
    this._indiceAtivo = this.selecaoController.getIndiceSelecionado();
  }

  public renderTotal() {
    if (!this.shadow) return;
    if (!this._containerElement) {
      this.cleanupEventListeners();
      const dom = orquestrarEstruturaInicial(this.shadow, this._textoVazio, this.getAttribute('max-height'), this._carregando);
      this._containerElement = dom.containerElement;
      this._tableElement = dom.tableElement;
      this._colgroupElement = dom.colgroupElement;
      this._theadElement = dom.theadElement;
      this._tbodyElement = dom.tbodyElement;
      this._emptyElement = dom.emptyElement;
      this._loadingElement = dom.loadingElement;
    } else {
      this._containerElement.style.maxHeight = this.getAttribute('max-height') || '';
      if (this._emptyElement) {
        const textSpan = this._emptyElement.querySelector('.ui-tabela__empty-text');
        if (textSpan) textSpan.textContent = this._textoVazio;
      }
    }
    this.renderHeader();
    this.renderBody();

    if (this._virtualizar && this._containerElement && !this._scrollHandler) {
      this._scrollHandler = inicializarScrollVirtualizacao(this._containerElement, () => this.renderBody());
    }

    if (this._tbodyElement && this._corpoListeners.size === 0) {
      this._corpoListeners.add<KeyboardEvent>(this._tbodyElement, 'keydown', this.handleTecladoCorpo);
      this._corpoListeners.add<FocusEvent>(this._tbodyElement, 'focusin', this.handleFocoLinha);
    }
    this.sincronizarAria();
  }

  /** Mantém um único tabindex=0 (foco móvel): Tab entra na tabela pela última linha ativa. */
  private handleFocoLinha = (e: FocusEvent) => {
    const tr = e.target as HTMLElement;
    if (tr.parentElement !== this._tbodyElement || !tr.hasAttribute('data-index')) return;
    this.definirLinhaAtiva(Number(tr.getAttribute('data-index')));
  };

  private definirLinhaAtiva(indice: number) {
    this._indiceAtivo = indice;
    const tbody = this._tbodyElement;
    // Fora da janela virtual a próxima renderização aplica o tabindex pelo _indiceAtivo
    const alvo = tbody?.querySelector<HTMLElement>(`tr[data-index="${indice}"]`);
    if (!tbody || !alvo) return;
    tbody.querySelectorAll<HTMLElement>('tr[tabindex="0"]').forEach((linha) => {
      if (linha !== alvo) linha.tabIndex = -1;
    });
    alvo.tabIndex = 0;
  }

  /**
   * Teclado nas linhas: setas, Home/End e PageUp/PageDown movem o foco;
   * Enter/Espaço selecionam a linha (mesmo caminho do clique, emite `ui-linha-clique`).
   */
  private handleTecladoCorpo = (e: KeyboardEvent) => {
    const tr = e.target as HTMLElement;
    // Teclas dentro de controles da célula (input, botão) pertencem ao controle
    if (tr.parentElement !== this._tbodyElement || !tr.hasAttribute('data-index')) return;

    const atual = Number(tr.getAttribute('data-index'));
    const ultimo = this.dadosController.getDadosExibicao().length - 1;
    let destino: number;

    switch (e.key) {
      case 'ArrowDown': destino = Math.min(ultimo, atual + 1); break;
      case 'ArrowUp': destino = Math.max(0, atual - 1); break;
      case 'Home': destino = 0; break;
      case 'End': destino = ultimo; break;
      case 'PageDown': destino = Math.min(ultimo, atual + this.linhasPorPagina()); break;
      case 'PageUp': destino = Math.max(0, atual - this.linhasPorPagina()); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        tr.click();
        return;
      default:
        return;
    }

    e.preventDefault();
    this.focarLinha(destino);
  };

  private linhasPorPagina(): number {
    const visivel = (this._containerElement?.clientHeight ?? 0) - (this._theadElement?.offsetHeight ?? 0);
    return Math.max(1, Math.floor(visivel / this.getRowHeight()));
  }

  /** Foca a linha, renderizando a janela virtual se necessário, e a mantém visível abaixo do cabeçalho fixo. */
  private focarLinha(indice: number) {
    const container = this._containerElement;
    const tbody = this._tbodyElement;
    if (!container || !tbody) return;

    this._indiceAtivo = indice;
    const seletor = `tr[data-index="${indice}"]`;
    let tr = tbody.querySelector<HTMLElement>(seletor);
    if (!tr) {
      container.scrollTop = Math.max(0, indice * this.getRowHeight() - container.clientHeight / 2);
      this.renderBody();
      tr = tbody.querySelector<HTMLElement>(seletor);
    }
    if (!tr) return;

    tr.focus({ preventScroll: true });
    const delta = this.deslocamentoAteLinha(tr);
    if (delta) container.scrollTop += delta;
  }

  /**
   * Quanto o container precisa rolar para a linha ficar inteira na área útil: abaixo do cabeçalho
   * fixo e acima da barra de rolagem horizontal. 0 = já visível. Linha maior que a área alinha pelo topo.
   */
  private deslocamentoAteLinha(tr: HTMLElement): number {
    const container = this._containerElement!;
    const caixa = container.getBoundingClientRect();
    const linha = tr.getBoundingClientRect();
    const topoUtil = caixa.top + container.clientTop + (this._theadElement?.offsetHeight ?? 0);
    const baseUtil = caixa.top + container.clientTop + container.clientHeight;
    if (linha.top < topoUtil) return linha.top - topoUtil;
    if (linha.bottom > baseUtil) return Math.min(linha.bottom - baseUtil, linha.top - topoUtil);
    return 0;
  }

  /** Rola só o container da tabela (nunca a página, ao contrário de `scrollIntoView`). */
  private rolarContainer(topo: number, comportamento: 'smooth' | 'auto') {
    const container = this._containerElement!;
    if (comportamento === 'smooth' && typeof container.scrollTo === 'function') {
      container.scrollTo({ top: topo, behavior: 'smooth' });
    } else {
      container.scrollTop = topo;
    }
  }

  /**
   * Posiciona a linha exibida `indice` na área visível.
   * Fora da janela virtual, rola até a posição estimada, renderiza a janela e corrige pela posição
   * real da linha. No modo suave a correção ocorre ao fim da animação (`scrollend`, com timeout de
   * segurança para navegadores sem o evento ou quando não há rolagem a fazer).
   */
  private posicionarLinha(indice: number, comportamento: 'smooth' | 'auto'): boolean {
    const container = this._containerElement;
    const tbody = this._tbodyElement;
    if (!container || !tbody) return false;

    this._cancelarCorrecaoRolagem?.();
    const buscarLinha = () => tbody.querySelector<HTMLElement>(`tr[data-index="${indice}"]`);
    const corrigir = (modo: 'smooth' | 'auto') => {
      const tr = buscarLinha();
      if (!tr) return;
      const delta = this.deslocamentoAteLinha(tr);
      if (delta) this.rolarContainer(container.scrollTop + delta, modo);
    };

    if (buscarLinha()) {
      corrigir(comportamento);
      return true;
    }

    const saltar = () => {
      container.scrollTop = Math.max(0, indice * this.getRowHeight());
      this.renderBody();
      corrigir('auto');
      this.renderBody();
    };
    if (comportamento === 'auto') {
      saltar();
      return true;
    }

    this.rolarContainer(Math.max(0, indice * this.getRowHeight()), 'smooth');
    let pendente = true;
    const finalizar = () => {
      if (!pendente) return;
      this._cancelarCorrecaoRolagem?.();
      this.renderBody();
      // Animação interrompida ou não executada (aba oculta, outro scroll): garante a chegada
      if (buscarLinha()) corrigir('smooth');
      else saltar();
    };
    const timer = window.setTimeout(finalizar, 800);
    container.addEventListener('scrollend', finalizar, { once: true });
    this._cancelarCorrecaoRolagem = () => {
      pendente = false;
      window.clearTimeout(timer);
      container.removeEventListener('scrollend', finalizar);
      this._cancelarCorrecaoRolagem = null;
    };
    return true;
  }

  private obterContextoRenderizador(): ContextoOrquestradorRender {
    return {
      host: this,
      shadow: this.shadow,
      theadElement: this._theadElement,
      colgroupElement: this._colgroupElement,
      tbodyElement: this._tbodyElement,
      tableElement: this._tableElement,
      emptyElement: this._emptyElement,
      containerElement: this._containerElement,
      colunas: this._colunas,
      dadosController: this.dadosController,
      selecaoController: this.selecaoController,
      chaveId: this.chaveId,
      virtualizar: this._virtualizar,
      rowHeight: this.getRowHeight(),
      indiceAtivo: this._indiceAtivo,
      headerListeners: this._headerListeners,
      onSetIsResizing: (res: boolean) => { this._isResizing = res; },
      onActiveResizeCleanup: (cleanup: (() => void) | null) => { this._activeResizeCleanup = cleanup; },
      onHeaderClick: (col: TabelaColuna) => this.handleHeaderClick(col)
    };
  }

  private renderHeader() { executarOrquestracaoHeader(this.obterContextoRenderizador()); }
  public renderBody() {
    executarOrquestracaoCorpo(this.obterContextoRenderizador());
    this.medirAlturaLinha();
  }

  /**
   * Rola até um item e opcionalmente o seleciona. Aceita ID (pela `chave-id`, depois `id`, `_id`,
   * `codigo`, `key`), predicado ou índice. Um número é procurado primeiro como ID; use
   * `{ porIndice: true }` ou `rolarParaIndice()` para tratá-lo só como índice da linha exibida.
   */
  public rolarPara(
    idOuIndice: string | number | ((item: any, index: number) => boolean),
    opcoes?: UIRowScrollOptions
  ): boolean {
    return this.selecaoController.rolarPara(idOuIndice, opcoes);
  }

  /** Rola até a linha exibida de índice `indice` (posição após ordenação/filtro, base 0). */
  public rolarParaIndice(indice: number, opcoes?: Omit<UIRowScrollOptions, 'porIndice'>): boolean {
    return this.selecaoController.rolarPara(indice, { ...opcoes, porIndice: true });
  }
}

definirCustomElement('ui-tabela', UITabela);

export * from './tabela-ordenacao';
export * from './tabela-localizador';
export * from './tabela-redimensionamento';
export * from './tabela-header';
export * from './tabela-corpo';
export * from './tabela-remota';
export * from './tabela-selecao';
export * from './tabela-orquestrador-dados';
export * from './tabela-interacao';
export * from './tabela-dom';
export * from './tabela-renderizador';
export * from './tabela-atributos-sync';
