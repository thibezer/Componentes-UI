import { ListenerBag } from '../../core/listener-bag';
import type {
  DensidadeTabela,
  TabelaColuna,
  UISortDetail,
  UIColumnResizeDetail,
  UIRowScrollOptions
} from './tipos';
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
import {
  sincronizarAtributosTabela,
  tratarMudancaAtributoTabela
} from './tabela-atributos-sync';

export type { DensidadeTabela, TabelaColuna, UISortDetail, UIColumnResizeDetail, UIRowScrollOptions };

export class UITabela extends HTMLElement {
  static get observedAttributes() {
    return ['texto-vazio', 'empty-text', 'max-height', 'densidade', 'density', 'virtualizar', 'virtualize', 'src', 'carregando', 'loading', 'chave-id', 'id-key'];
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
      tbodyElement: null,
      containerElement: null,
      dadosExibicao: this.dadosController.getDadosExibicao(),
      chaveId: this.chaveId,
      getRowHeight: () => this.getRowHeight(),
      onRenderBody: () => this.renderBody()
    });
  }

  connectedCallback() {
    this.syncAttributes();
    if (!this.hasAttribute('densidade') && !this.hasAttribute('density')) this.setAttribute('densidade', 'normal');
    this.renderTotal();
    if (this._src) this.remotaController.carregar(this._src);
  }

  disconnectedCallback() { this.cleanupEventListeners(); }

  attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null) {
    tratarMudancaAtributoTabela(name, newVal, this.obterContextoAtributos());
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
  }

  public async carregarDoEndpoint(url?: string): Promise<void> { await this.remotaController.carregar(url || this._src || ''); }
  public async recarregar(): Promise<void> {
    if (this._src) await this.remotaController.carregar(this._src);
    else { this.dadosController.aplicarOrdenacao(); this.renderBody(); }
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
    this.remotaController.abortar();
    this._headerListeners.cleanup();
  }

  get colunas(): TabelaColuna[] { return this._colunas; }
  set colunas(val: TabelaColuna[]) { this._colunas = Array.isArray(val) ? val : []; this.renderTotal(); }
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
    this.renderHeader();
    this.renderBody();
  }

  get direcaoOrdenacao(): 'asc' | 'desc' | 'original' { return this.dadosController.getDirecaoOrdenacao(); }
  set direcaoOrdenacao(dir: 'asc' | 'desc' | 'original') {
    this.dadosController.setDirecaoOrdenacao(dir);
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

  private getRowHeight(): number { return getRowHeight(this.densidade); }

  private atualizarContextoSelecao() {
    this.selecaoController = new TabelaSelecaoController({
      host: this,
      tbodyElement: this._tbodyElement,
      containerElement: this._containerElement,
      dadosExibicao: this.dadosController.getDadosExibicao(),
      chaveId: this.chaveId,
      getRowHeight: () => this.getRowHeight(),
      onRenderBody: () => this.renderBody()
    });
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
      this.atualizarContextoSelecao();
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
      headerListeners: this._headerListeners,
      onSetIsResizing: (res) => { this._isResizing = res; },
      onActiveResizeCleanup: (cleanup) => { this._activeResizeCleanup = cleanup; },
      onHeaderClick: (col) => this.handleHeaderClick(col)
    };
  }

  private renderHeader() { executarOrquestracaoHeader(this.obterContextoRenderizador()); }
  public renderBody() { executarOrquestracaoCorpo(this.obterContextoRenderizador()); }

  public rolarPara(
    idOuIndice: string | number | ((item: any, index: number) => boolean),
    opcoes?: UIRowScrollOptions
  ): boolean {
    return this.selecaoController.rolarPara(idOuIndice, opcoes);
  }
}

if (!customElements.get('ui-tabela')) {
  customElements.define('ui-tabela', UITabela);
}

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
