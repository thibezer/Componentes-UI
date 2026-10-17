import { ListenerBag } from '../../core/listener-bag';
import type { DensidadeTabela, TabelaColuna, TabelaFetcher, UISortDetail, UIColumnResizeDetail, UIRowScrollOptions, UISelecaoRemovidaDetail, UIFetchErroDetail } from './tipos';
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
import { acaoDaTeclaLinha } from './tabela-teclado';
import { renderizarErroTabela, anunciarResultadoFiltro, sincronizarAriaTabela, TEXTO_SEM_RESULTADOS_PADRAO } from './tabela-estados';
import { RolagemLinhas } from './tabela-rolagem';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

export type { DensidadeTabela, TabelaColuna, TabelaFetcher, UISortDetail, UIColumnResizeDetail, UIRowScrollOptions, UISelecaoRemovidaDetail, UIFetchErroDetail };

export class UITabela extends SafeHTMLElement {
  static get observedAttributes() {
    return ['texto-vazio', 'empty-text', 'max-height', 'densidade', 'density', 'altura-linha', 'row-height', 'virtualizar', 'virtualize', 'src', 'carregando', 'loading', 'chave-id', 'id-key', 'aria-label', 'ordenacao-remota', 'texto-erro', 'texto-sem-resultados', 'texto-carregando'];
  }

  private shadow: ShadowRoot;
  private _colunas: TabelaColuna[] = [];
  private _textoVazio: string = 'Nenhum registro encontrado';
  private _virtualizar: boolean = true;
  private _isResizing: boolean = false;
  private _carregando: boolean = false;
  private _src: string | null = null;
  private _fetchOpcoes: RequestInit | null = null;
  private _fetcher: TabelaFetcher | null = null;

  private _containerElement: HTMLDivElement | null = null;
  private _tableElement: HTMLTableElement | null = null;
  private _theadElement: HTMLTableSectionElement | null = null;
  private _tbodyElement: HTMLTableSectionElement | null = null;
  private _colgroupElement: HTMLTableColElement | null = null;
  private _emptyElement: HTMLDivElement | null = null;
  private _loadingElement: HTMLDivElement | null = null;
  private _erroElement: HTMLDivElement | null = null;
  private _anuncioElement: HTMLDivElement | null = null;
  /** Último erro de carregamento remoto (null = sem erro). */
  private _erro: UIFetchErroDetail | null = null;

  private _scrollHandler: ((e: Event) => void) | null = null;
  private _activeResizeCleanup: (() => void) | null = null;
  private _headerListeners = new ListenerBag();
  private _corpoListeners = new ListenerBag();
  /** Linha com o foco móvel (navegação por teclado); null = primeira linha visível. */
  private _indiceAtivo: number | null = null;
  /** Altura real das linhas medida no DOM; null = usa a estimativa da densidade. */
  private _alturaLinhaMedida: number | null = null;
  private rolagem = new RolagemLinhas({
    container: () => this._containerElement,
    tbody: () => this._tbodyElement,
    cabecalho: () => this._theadElement,
    alturaLinha: () => this.getRowHeight(),
    renderizarCorpo: () => this.renderBody(),
    aoLinhaAtiva: (indice) => { this._indiceAtivo = indice; }
  });

  private remotaController: TabelaRemotaController;
  private selecaoController: TabelaSelecaoController;
  private dadosController = new TabelaOrquestradorDados();

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.remotaController = new TabelaRemotaController({
      host: this,
      onCarregandoAlterado: (c) => { this.carregando = c; },
      onDadosRecebidos: (d) => { this.dados = d; },
      getOpcoes: () => this._fetchOpcoes,
      getFetcher: () => this._fetcher
    });
    this.selecaoController = new TabelaSelecaoController({
      host: this,
      getTbody: () => this._tbodyElement,
      getDadosExibicao: () => this.dadosController.getDadosExibicao(),
      getDadosOriginais: () => this.dadosController.getDadosOriginais(),
      getChaveId: () => this.chaveId,
      onRolarParaIndice: (indice, comportamento) => this.rolagem.posicionar(indice, comportamento),
      onLinhaAtiva: (indice) => this.definirLinhaAtiva(indice)
    });
    // Estado de erro visível: acompanha os eventos do carregamento remoto
    this.addEventListener('ui-fetch-erro', (e) => this.mostrarErro((e as CustomEvent<UIFetchErroDetail>).detail));
    this.addEventListener('ui-fetch-start', () => this.mostrarErro(null));
    this.addEventListener('ui-fetch-sucesso', () => this.mostrarErro(null));
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
    if (name === 'ordenacao-remota') {
      this.dadosController.setOrdenacaoRemota(newVal !== null);
      this.atualizarContextoSelecao();
    }
    if (name === 'densidade' || name === 'density' || name === 'altura-linha' || name === 'row-height') this._alturaLinhaMedida = null;
    if (name === 'altura-linha' || name === 'row-height') this.aplicarAlturaLinha();
    if (name === 'chave-id' || name === 'id-key') this.atualizarContextoSelecao();
    tratarMudancaAtributoTabela(name, newVal, this.obterContextoAtributos());
    this.sincronizarAria();
  }

  /** Nome acessível vem do host (`aria-label`); `aria-busy` acompanha o carregamento remoto. */
  private sincronizarAria() {
    if (!this._tableElement) return;
    sincronizarAriaTabela({ tabela: this._tableElement, container: this._containerElement }, this.getAttribute('aria-label'), this._carregando);
    this.atualizarTextosEstado();
  }

  /** Textos de estado configuráveis por atributo (carregando, sem resultados, erro). */
  private atualizarTextosEstado() {
    const carregando = this._loadingElement?.querySelector('.ui-tabela__loading-texto');
    if (carregando) carregando.textContent = this.getAttribute('texto-carregando') || 'Carregando dados...';
    this.renderizarErro();
  }

  /** Mostra (ou oculta, com null) o aviso de erro de carregamento com a ação "Tentar novamente". */
  private mostrarErro(detalhe: UIFetchErroDetail | null) {
    this._erro = detalhe;
    this.renderizarErro();
  }

  private renderizarErro() {
    renderizarErroTabela(this._erroElement, this._erro, this.getAttribute('texto-erro'), !!this._src);
  }

  /** Anuncia ao leitor de tela o resultado do filtro (a região é limpa sem filtro ativo). */
  private anunciarResultado() {
    anunciarResultadoFiltro(
      this._anuncioElement,
      this.dadosController.getDadosExibicao().length,
      this.dadosController.temFiltro(),
      this._textoSemResultados()
    );
  }

  private _textoSemResultados(): string {
    return this.getAttribute('texto-sem-resultados') || TEXTO_SEM_RESULTADOS_PADRAO;
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
      onSrcLido: (s: string | null) => { this._src = s; },
      onCarregarSrc: (s: string) => { this.remotaController.carregar(s); },
      onCarregandoAlterado: (c: boolean) => { this._carregando = c; },
      onRenderBody: () => this.renderBody(),
      onRenderTotal: () => this.renderTotal()
    };
  }

  get src(): string | null { return this._src; }
  set src(val: string | null) {
    this._src = val;
    // o attributeChangedCallback busca os dados (conectado) ou o connectedCallback (ao conectar)
    if (val) this.setAttribute('src', val);
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

  /** Opções do `fetch` do modo remoto (headers, credentials, method, body...); o `signal` é da tabela. */
  get fetchOpcoes(): RequestInit | null { return this._fetchOpcoes; }
  set fetchOpcoes(val: RequestInit | null) { this._fetchOpcoes = val ?? null; }

  /** Função de busca alternativa ao `fetch` (autenticação, renovação de token, mocks). */
  get fetcher(): TabelaFetcher | null { return this._fetcher; }
  set fetcher(val: TabelaFetcher | null) { this._fetcher = typeof val === 'function' ? val : null; }

  /** Ordenação feita pelo servidor: o clique no cabeçalho atualiza o indicador e emite `ui-sort`, mas não reordena. */
  get ordenacaoRemota(): boolean { return this.hasAttribute('ordenacao-remota'); }
  set ordenacaoRemota(val: boolean) { this.toggleAttribute('ordenacao-remota', Boolean(val)); }

  /** Busca a URL (guardada como `src`, para `recarregar()`). Resolve `true` em sucesso; falhas vão em `ui-fetch-erro`. */
  public async carregarDoEndpoint(url?: string): Promise<boolean> {
    if (url && url !== this._src) this.src = url;
    return this.remotaController.carregar(url || this._src || '');
  }
  public async recarregar(): Promise<boolean> {
    if (this._src) return this.remotaController.carregar(this._src);
    else { this.dadosController.aplicarOrdenacao(); this.atualizarContextoSelecao(); this.renderBody(); return true; }
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
    if (this._activeResizeCleanup) { this._activeResizeCleanup(); this._activeResizeCleanup = null; this._isResizing = false; }
    this.rolagem.cancelar();
    this.remotaController.abortar();
    this._headerListeners.cleanup();
    this._corpoListeners.cleanup();
  }

  get colunas(): TabelaColuna[] { return this._colunas; }
  set colunas(val: TabelaColuna[]) {
    // cópia: redimensionar não altera (nem falha com) objetos congelados/reativos/compartilhados do consumidor
    this._colunas = Array.isArray(val) ? val.filter((c) => c != null).map((c) => ({ ...c })) : [];
    this.dadosController.setColunas(this._colunas);
    this.dadosController.setColunasFiltro(this._colunas.map((c) => c.id));
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
    const colAnterior = this.dadosController.getColunaOrdenada();
    const dirAnterior = this.dadosController.getDirecaoOrdenacao();
    const proxima = this.dadosController.alternarOrdenacaoColuna(coluna);
    if (!proxima) return;
    this.atualizarContextoSelecao();
    this.renderHeader();
    this.renderBody();
    const evento = new CustomEvent<UISortDetail>('ui-sort', { detail: proxima, bubbles: true, composed: true, cancelable: true });
    this.dispatchEvent(evento);
    if (evento.defaultPrevented) {
      // preventDefault(): o sistema recusou a ordenação, volta ao estado anterior
      this.dadosController.restaurarOrdenacao(colAnterior, dirAnterior);
      this.atualizarContextoSelecao();
      this.renderHeader();
      this.renderBody();
    }
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
      this._erroElement = dom.erroElement;
      this._anuncioElement = dom.anuncioElement;
      dom.erroElement.querySelector('.ui-tabela__erro-acao')?.addEventListener('click', () => { void this.recarregar(); });
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

    const ultimo = this.dadosController.getDadosExibicao().length - 1;
    const acao = acaoDaTeclaLinha(e.key, Number(tr.getAttribute('data-index')), ultimo, this.rolagem.linhasPorPagina());
    if (!acao) return;

    e.preventDefault();
    if (acao.tipo === 'ativar') tr.click();
    else this.rolagem.focar(acao.indice);
  };

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
      textoVazio: this._textoVazio,
      textoSemResultados: this._textoSemResultados(),
      headerListeners: this._headerListeners,
      onSetIsResizing: (res: boolean) => { this._isResizing = res; },
      onActiveResizeCleanup: (cleanup: (() => void) | null) => { this._activeResizeCleanup = cleanup; },
      onHeaderClick: (col: TabelaColuna) => this.handleHeaderClick(col)
    };
  }

  private renderHeader() { executarOrquestracaoHeader(this.obterContextoRenderizador()); }
  public renderBody() {
    executarOrquestracaoCorpo(this.obterContextoRenderizador());
    this.anunciarResultado();
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
