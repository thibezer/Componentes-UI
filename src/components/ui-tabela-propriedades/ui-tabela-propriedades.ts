/* ====================================================
   UI Tabela de Propriedades - Web Component Nativo W3C
   Inspirado nas paletas de propriedades do AutoCAD e Revit.
   ==================================================== */

import { ListenerBag } from '../../core/listener-bag';
import {
  CategoriaPropriedades,
  SeletorTipoItem,
  ItemPropriedade,
  DefinirEstadoCategoriasOpcoes,
  UICategoriasEstadoDetail,
  TextosPropriedades,
  TEXTOS_PADRAO
} from './tipos';
import { renderizarSeletorTipos } from './propriedades-seletor-tipo';
import { criarControladorSplitter, ControladorSplitterPropriedades } from './propriedades-splitter';
import { criarTemplateTabelaPropriedades } from './propriedades-template';
import { renderizarCategoriasETree } from './propriedades-render-arvore';
import {
  alternarPosicionamentoFlutuante,
  conectarArrastoFlutuante,
  sincronizarFlutuanteExterno
} from './propriedades-flutuante';
import { proximaDensidade } from './propriedades-densidade';
import { GerenciadorValoresPropriedades } from './propriedades-gerenciador-valores';
import {
  conectarPainelControles,
  sincronizarPainelControles
} from './propriedades-painel-controles';
import {
  focarProximoEditor,
  focarEditorAnterior,
  focarPrimeiroEditor,
  atualizarCampoVisual,
  expandirTodasCategorias,
  colapsarTodasCategorias,
  alternarCategoria,
  sincronizarDomCategorias
} from './propriedades-dom-utils';
import {
  LembrancaCategoriasPropriedades,
  idDaCategoria
} from './propriedades-persistencia';

export * from './tipos';
export { avaliarExpressaoMatematica } from './avaliador-expressao';
export * from './propriedades-editores';
export * from './propriedades-seletor-tipo';
export * from './propriedades-splitter';
export * from './propriedades-render-arvore';
export * from './propriedades-gerenciador-valores';
export * from './propriedades-painel-controles';
export * from './propriedades-dom-utils';
export * from './propriedades-persistencia';
export * from './propriedades-flutuante';
export * from './propriedades-densidade';
export * from './propriedades-valor-misto';
import { TEXTO_MISTO_PADRAO } from './propriedades-valor-misto';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ATRIBUTOS_DEGRADE, aplicarDegradeNoElemento, ehAtributoDegrade } from '../../core/degrade';

export class UITabelaPropriedades extends SafeHTMLElement {
  private static instanciasChavePadrao = new Set<UITabelaPropriedades>();

  static get observedAttributes() {
    return [
      'titulo',
      'estilo-visual',
      'modo-aplicar',
      'filtro',
      'densidade',
      'largura-rotulo',
      'fechavel',
      'colapsado',
      'flutuante',
      'texto-misto',
      'persistir',
      'storage-key',
      ...ATRIBUTOS_DEGRADE
    ];
  }

  private shadow: ShadowRoot;
  private listeners = new ListenerBag();
  private splitterListeners = new ListenerBag();
  private controladorSplitter!: ControladorSplitterPropriedades;
  private gerenciadorValores: GerenciadorValoresPropriedades;
  private _conectado = false;
  private readonly lembranca = new LembrancaCategoriasPropriedades(() => ({
    persistir: this.persistir,
    conectado: this._conectado,
    storageKey: this.storageKey,
    id: this.id
  }));

  private _categorias: CategoriaPropriedades[] = [];
  private _tipos: SeletorTipoItem[] = [];
  private _tipoSelecionadoId: string = '';
  private _termoBusca: string = '';
  private _larguraRotuloPorcentagem: number = 45;
  private _sincronizandoFlutuante = false;
  private _textos: Partial<TextosPropriedades> = {};

  public get larguraRotuloPorcentagem(): number {
    return this._larguraRotuloPorcentagem;
  }

  private tipoContainerElement!: HTMLDivElement;
  private corpoElement!: HTMLDivElement;
  private btnAplicarElement!: HTMLButtonElement;
  private btnDesfazerElement!: HTMLButtonElement;
  private splitterElement!: HTMLDivElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = criarTemplateTabelaPropriedades();

    this.tipoContainerElement = this.shadow.getElementById('tipo-container') as HTMLDivElement;
    this.corpoElement = this.shadow.getElementById('corpo') as HTMLDivElement;
    this.btnAplicarElement = this.shadow.getElementById('btn-aplicar') as HTMLButtonElement;
    this.btnDesfazerElement = this.shadow.getElementById('btn-desfazer') as HTMLButtonElement;
    this.splitterElement = this.shadow.getElementById('splitter') as HTMLDivElement;

    this.gerenciadorValores = new GerenciadorValoresPropriedades({
      hostElement: this,
      getCategorias: () => this._categorias,
      onAtualizarBotoesFooter: (dirty) => {
        this.btnAplicarElement.disabled = !dirty;
        this.btnDesfazerElement.disabled = !dirty;
      },
      onAtualizarCampoVisual: (propId, val) => atualizarCampoVisual(this.shadow, propId, val),
      onRenderCategorias: () => this.renderCategorias(),
      isModoManual: () => this.getAttribute('modo-aplicar') === 'manual'
    });

    this.controladorSplitter = criarControladorSplitter({
      hostElement: this,
      corpoElement: this.corpoElement,
      splitterElement: this.splitterElement,
      splitterListeners: this.splitterListeners,
      onLarguraAlterada: (porcentagem) => {
        this._larguraRotuloPorcentagem = porcentagem;
      }
    });
  }

  connectedCallback() {
    this.listeners.cleanup();
    this._conectado = true;
    this.atualizarRegistroChavePadrao();

    if (this.persistir) {
      this.lembranca.sincronizarSeChaveMudou();
      this.lembranca.restaurarOrigensEmCategorias(this._categorias);
      this.lembranca.aplicarEmCategorias(this._categorias);
    }

    conectarPainelControles({
      shadow: this.shadow,
      listeners: this.listeners,
      host: this,
      onToggleExpandirTodas: () => this.toggleExpandirTodas(),
      onFiltrar: (termo) => {
        this._termoBusca = termo;
        this.renderCategorias();
      },
      onAplicar: () => this.aplicar(),
      onDesfazer: () => this.desfazer(),
      onAlternarDensidade: () => this.alternarDensidade(),
      onAlternarFlutuante: () => this.alternarFlutuante(),
      onAlternarColapsoHorizontal: () => this.alternarColapsoHorizontal(),
      onFocarPrimeiroEditor: () => focarPrimeiroEditor(this.shadow)
    });

    if (this.hasAttribute('flutuante')) sincronizarFlutuanteExterno(this);
    conectarArrastoFlutuante(this, this.shadow, this.listeners);
    this.controladorSplitter.init();
    aplicarDegradeNoElemento(this, this.shadow.getElementById('container'));
    this.syncState();
  }

  disconnectedCallback() {
    this._conectado = false;
    this.atualizarRegistroChavePadrao();
    this.listeners.cleanup();
    this.splitterListeners.cleanup();
    this.shadow.querySelectorAll('.ui-prop__ac').forEach(el => el.remove());
  }

  /**
   * Cada atributo atualiza só o que depende dele: redesenhar todas as linhas (ex.: ao trocar o
   * `titulo`) tiraria o foco de um campo em edição.
   */
  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    if (ehAtributoDegrade(name)) {
      aplicarDegradeNoElemento(this, this.shadow.getElementById('container'));
      return;
    }
    switch (name) {
      case 'largura-rotulo': {
        const pct = parseFloat(newVal ?? '');
        if (!isNaN(pct)) this._larguraRotuloPorcentagem = this.controladorSplitter.definirLarguraRotulo(pct);
        return;
      }
      case 'estilo-visual':
        this.renderSeletorTipos();
        return;
      case 'texto-misto':
        this.renderCategorias();
        return;
      case 'filtro':
        sincronizarPainelControles(this.shadow, this);
        // Filtro escondido não pode continuar escondendo propriedades
        if (newVal === null && this._termoBusca) {
          this._termoBusca = '';
          const input = this.shadow.getElementById('filtro-input') as HTMLInputElement | null;
          if (input) input.value = '';
          this.renderCategorias();
        }
        return;
      case 'flutuante':
        if (!this._sincronizandoFlutuante) {
          if (this._conectado) sincronizarFlutuanteExterno(this);
          sincronizarPainelControles(this.shadow, this);
        }
        return;
      case 'modo-aplicar':
        // Sair do modo manual com edições pendentes as aplica: o rodapé some e elas ficariam presas
        if (newVal !== 'manual' && this.gerenciadorValores.isDirty) this.aplicar();
        sincronizarPainelControles(this.shadow, this);
        return;
      case 'persistir':
        this.atualizarRegistroChavePadrao();
        if (this._conectado && this.persistir) {
          this.lembranca.sincronizarSeChaveMudou();
          this.lembranca.restaurarOrigensEmCategorias(this._categorias);
          this.lembranca.aplicarEmCategorias(this._categorias);
          this.atualizarVisaoCategorias();
        }
        return;
      case 'storage-key':
        this.atualizarRegistroChavePadrao();
        if (this._conectado && this.persistir) {
          this.lembranca.carregarDoStorage(true);
          this.lembranca.restaurarOrigensEmCategorias(this._categorias);
          this.lembranca.aplicarEmCategorias(this._categorias);
          this.atualizarVisaoCategorias();
        }
        return;
      default:
        sincronizarPainelControles(this.shadow, this);
    }
  }

  // --- Propriedades Públicas Espelhadas (Getters e Setters Tipados) ---

  get titulo(): string {
    return this.getAttribute('titulo') || 'Propriedades';
  }

  set titulo(val: string) {
    if (val) this.setAttribute('titulo', val);
    else this.removeAttribute('titulo');
  }

  get estiloVisual(): 'autocad' | 'revit' {
    return (this.getAttribute('estilo-visual') as 'autocad' | 'revit') || 'autocad';
  }

  set estiloVisual(val: 'autocad' | 'revit') {
    if (val && val !== 'autocad') this.setAttribute('estilo-visual', val);
    else this.removeAttribute('estilo-visual');
  }

  get modoAplicar(): 'imediato' | 'manual' {
    return (this.getAttribute('modo-aplicar') as 'imediato' | 'manual') || 'imediato';
  }

  set modoAplicar(val: 'imediato' | 'manual') {
    if (val === 'manual') this.setAttribute('modo-aplicar', 'manual');
    else this.removeAttribute('modo-aplicar');
  }

  get filtro(): boolean {
    return this.hasAttribute('filtro');
  }

  set filtro(val: boolean) {
    if (val) this.setAttribute('filtro', '');
    else this.removeAttribute('filtro');
  }

  get termoBusca(): string {
    return this._termoBusca;
  }

  set termoBusca(val: string) {
    this._termoBusca = (val || '').trim().toLowerCase();
    const input = this.shadow.getElementById('filtro-input') as HTMLInputElement | null;
    if (input) input.value = val || '';
    this.renderCategorias();
  }

  get larguraRotulo(): number {
    return this._larguraRotuloPorcentagem;
  }

  set larguraRotulo(pct: number) {
    const num = typeof pct === 'number' ? pct : parseFloat(String(pct));
    if (!isNaN(num)) {
      this.setAttribute('largura-rotulo', String(num));
    }
  }

  get fechavel(): boolean {
    return this.hasAttribute('fechavel');
  }

  set fechavel(val: boolean) {
    if (val) this.setAttribute('fechavel', '');
    else this.removeAttribute('fechavel');
  }

  /**
   * Habilita a persistência das abas/categorias abertas no `localStorage`.
   * Ativo por padrão (`true`); defina `persistir="false"` para manter apenas em memória.
   */
  get persistir(): boolean {
    return this.getAttribute('persistir') !== 'false';
  }

  set persistir(val: boolean) {
    if (val === false) this.setAttribute('persistir', 'false');
    else this.removeAttribute('persistir');
  }

  /**
   * Chave customizada de armazenamento no `localStorage` (`storage-key`).
   * Quando omitida, usa o atributo `id` do componente ou `'default'`.
   */
  get storageKey(): string | null {
    return this.getAttribute('storage-key');
  }

  set storageKey(val: string | null) {
    if (val && val.trim()) this.setAttribute('storage-key', val.trim());
    else this.removeAttribute('storage-key');
  }

  get categorias(): CategoriaPropriedades[] {
    return this._categorias;
  }

  set categorias(novasCategorias: CategoriaPropriedades[]) {
    this._categorias = Array.isArray(novasCategorias) ? novasCategorias : [];
    this.gerenciadorValores.inicializarCategorias(this._categorias);
    this.lembranca.registrarOrigens(this._categorias);
    if (this._conectado && this.persistir) {
      this.lembranca.sincronizarSeChaveMudou();
    }
    this.lembranca.aplicarEmCategorias(this._categorias);
    this.renderCategorias();
  }

  /**
   * Texto exibido nas propriedades cujo valor difere entre os objetos selecionados
   * (`VALOR_MISTO`). Reflete o atributo `texto-misto`; padrão "Varia".
   */
  get textoMisto(): string {
    const texto = this.getAttribute('texto-misto');
    return texto && texto.trim() ? texto : TEXTO_MISTO_PADRAO;
  }

  set textoMisto(texto: string) {
    if (typeof texto === 'string' && texto.trim()) {
      this.setAttribute('texto-misto', texto);
    } else {
      this.removeAttribute('texto-misto');
    }
  }

  /** Textos fixos do painel (tradução/personalização). Chaves omitidas usam o padrão em português. */
  get textos(): TextosPropriedades {
    return { ...TEXTOS_PADRAO, ...this._textos };
  }

  set textos(novos: Partial<TextosPropriedades>) {
    const limpos: Partial<TextosPropriedades> = {};
    if (novos && typeof novos === 'object') {
      (Object.keys(TEXTOS_PADRAO) as Array<keyof TextosPropriedades>).forEach(chave => {
        const v = (novos as Record<string, unknown>)[chave];
        if (typeof v === 'string' && v.trim()) limpos[chave] = v;
      });
    }
    this._textos = limpos;
    sincronizarPainelControles(this.shadow, this);
    this.renderSeletorTipos();
    this.renderCategorias();
  }

  /** Texto personalizado de uma chave (ou o padrão). */
  public obterTexto(chave: keyof TextosPropriedades): string {
    return this._textos[chave] || TEXTOS_PADRAO[chave];
  }

  get tipos(): SeletorTipoItem[] {
    return this._tipos;
  }

  set tipos(novosTipos: SeletorTipoItem[]) {
    this._tipos = Array.isArray(novosTipos) ? novosTipos : [];
    this.renderSeletorTipos();
  }

  /** Id do tipo exibido no seletor: sem seleção válida, o seletor mostra (e devolve) o primeiro. */
  get tipoSelecionado(): string {
    const validos = this._tipos.filter(t => t && t.id !== null && t.id !== undefined);
    const existe = validos.some(t => String(t.id) === this._tipoSelecionadoId);
    if (!existe && validos.length > 0) return String(validos[0].id);
    return this._tipoSelecionadoId;
  }

  set tipoSelecionado(idTipo: string) {
    this._tipoSelecionadoId = String(idTipo ?? '');
    this.renderSeletorTipos();
  }

  get valores(): Record<string, any> {
    return this.gerenciadorValores.getValores();
  }

  set valores(novosValores: Record<string, any>) {
    this.gerenciadorValores.setValores(novosValores);
    // Só os campos que mudaram são atualizados (foco e arrasto em andamento são preservados).
    // Com busca ativa, o valor pode mudar quais linhas aparecem: redesenha.
    if (this._termoBusca) this.renderCategorias();
  }

  get isDirty(): boolean {
    return this.gerenciadorValores.isDirty;
  }

  get dirty(): boolean {
    return this.gerenciadorValores.isDirty;
  }

  public obterValor(propId: string): any {
    return this.gerenciadorValores.obterValor(propId);
  }

  public definirValor(propId: string, novoValor: any, emitirEvento: boolean = true): void {
    this.gerenciadorValores.definirValor(propId, novoValor, emitirEvento);
  }

  /**
   * Volta uma propriedade ao valor do último carregar/aplicar (o mesmo que o botão ↺ da linha).
   * Fora do modo manual emite `ui-propriedade-alterada`. Devolve `false` se não havia o que restaurar.
   */
  public redefinirValor(propId: string, emitirEvento: boolean = true): boolean {
    return this.gerenciadorValores.redefinirValor(propId, emitirEvento);
  }

  public aplicar(): void {
    this.gerenciadorValores.aplicar();
  }

  public desfazer(): void {
    this.gerenciadorValores.desfazer();
  }

  public expandirTudo(): void {
    const entradas: Array<[string, boolean]> = [];
    for (const cat of this._categorias) {
      const id = idDaCategoria(cat);
      if (id !== null) entradas.push([id, true]);
    }
    this.lembranca.registrarVarias(entradas);
    expandirTodasCategorias(this.shadow, this._categorias);
    if (entradas.length > 0) {
      this.emitirEstadoCategorias();
    }
  }

  public colapsarTudo(): void {
    const entradas: Array<[string, boolean]> = [];
    for (const cat of this._categorias) {
      const id = idDaCategoria(cat);
      if (id !== null) entradas.push([id, false]);
    }
    this.lembranca.registrarVarias(entradas);
    colapsarTodasCategorias(this.shadow, this._categorias);
    if (entradas.length > 0) {
      this.emitirEstadoCategorias();
    }
  }

  public toggleCategoria(idCategoria: string): void {
    const cat = this._categorias.find((c) => idDaCategoria(c) === idCategoria);
    if (!cat) return;

    // Durante a busca as categorias ficam abertas na tela: alterna a partir do que o usuário vê
    const estadoAtual = this._termoBusca ? undefined : this.lembranca.estaAberta(cat);
    const novoEstado = alternarCategoria(this.shadow, this, this._categorias, idCategoria, estadoAtual);
    if (typeof novoEstado === 'boolean') {
      this.lembranca.registrar(idCategoria, novoEstado);
      this.emitirEstadoCategorias();
    }
  }

  /**
   * Retorna a chave completa de armazenamento utilizada por esta instância no `localStorage`.
   */
  public obterChaveStorageAtual(): string {
    return this.lembranca.chaveAtual();
  }

  /**
   * Retorna um mapa `{ categoriaId: aberto }` refletindo as abas atualmente lembradas e visíveis.
   */
  public obterEstadoCategorias(): Record<string, boolean> {
    return this.lembranca.obterEstado(this._categorias);
  }

  /**
   * Define programaticamente o estado aberto/fechado de um conjunto de categorias.
   */
  public definirEstadoCategorias(
    estado: Record<string, boolean>,
    opcoes?: DefinirEstadoCategoriasOpcoes
  ): void {
    if (!estado || typeof estado !== 'object') return;
    const entradas: Array<[string, boolean]> = [];
    for (const [id, aberto] of Object.entries(estado)) {
      if (typeof aberto === 'boolean') {
        entradas.push([id, aberto]);
      }
    }
    if (entradas.length === 0) return;

    this.lembranca.registrarVarias(entradas, opcoes?.persistir !== false);
    this.lembranca.aplicarEmCategorias(this._categorias);
    this.atualizarVisaoCategorias();

    if (opcoes?.emitirEvento) {
      this.emitirEstadoCategorias();
    }
  }

  /**
   * Remove as preferências lembradas em memória e no `localStorage`, restaurando o padrão das categorias.
   */
  public limparEstadoCategorias(): void {
    this.lembranca.limpar(this._categorias);
    this.atualizarVisaoCategorias();
  }

  /**
   * Alias compatível com `<ui-camadas>` para limpar a memória persistida das categorias.
   */
  public limparLembranca(): void {
    this.limparEstadoCategorias();
  }

  get densidade(): 'padrao' | 'compacta' | 'ultracompacta' | 'relaxada' {
    return (this.getAttribute('densidade') as any) || 'padrao';
  }

  set densidade(val: 'padrao' | 'compacta' | 'ultracompacta' | 'relaxada') {
    if (!val || val === 'padrao') {
      this.removeAttribute('densidade');
    } else {
      this.setAttribute('densidade', val);
    }
  }

  public alternarDensidade(): string {
    const proxima = proximaDensidade(this.getAttribute('densidade') || 'padrao');

    if (proxima === 'padrao') {
      this.removeAttribute('densidade');
    } else {
      this.setAttribute('densidade', proxima);
    }

    this.dispatchEvent(
      new CustomEvent('ui-densidade-alterada', {
        bubbles: true,
        composed: true,
        detail: { densidade: proxima }
      })
    );
    sincronizarPainelControles(this.shadow, this);
    return proxima;
  }

  get flutuante(): boolean {
    return this.hasAttribute('flutuante');
  }

  set flutuante(val: boolean) {
    if (Boolean(val) !== this.hasAttribute('flutuante')) {
      this.alternarFlutuante();
    }
  }

  get colapsado(): boolean {
    return this.hasAttribute('colapsado');
  }

  set colapsado(val: boolean) {
    if (Boolean(val) !== this.hasAttribute('colapsado')) {
      this.alternarColapsoHorizontal();
    }
  }

  public alternarFlutuante(): boolean {
    this._sincronizandoFlutuante = true;
    try {
      const novoEstado = alternarPosicionamentoFlutuante(this);
      sincronizarPainelControles(this.shadow, this);
      this.dispatchEvent(new CustomEvent('ui-flutuante-alterado', {
        bubbles: true,
        composed: true,
        detail: {
          flutuante: novoEstado,
          left: this.style.left,
          top: this.style.top,
          width: this.style.width,
          height: this.style.height
        }
      }));
      return novoEstado;
    } finally {
      this._sincronizandoFlutuante = false;
    }
  }

  public alternarColapsoHorizontal(): boolean {
    const isColapsado = this.hasAttribute('colapsado');
    if (isColapsado) {
      this.removeAttribute('colapsado');
    } else {
      this.setAttribute('colapsado', '');
    }
    const novoEstado = !isColapsado;
    sincronizarPainelControles(this.shadow, this);
    this.dispatchEvent(new CustomEvent('ui-colapso-horizontal', {
      bubbles: true,
      composed: true,
      detail: { colapsado: novoEstado }
    }));
    return novoEstado;
  }

  private syncState() {
    sincronizarPainelControles(this.shadow, this);

    const larguraRotulo = this.getAttribute('largura-rotulo');
    if (larguraRotulo) {
      const pct = parseFloat(larguraRotulo);
      if (!isNaN(pct)) {
        this._larguraRotuloPorcentagem = this.controladorSplitter.definirLarguraRotulo(pct);
      }
    }

    this.renderSeletorTipos();
    this.renderCategorias();
  }

  private toggleExpandirTodas() {
    const algumaFechada = this._categorias.some(
      (c) => Boolean(c && typeof c === 'object') && !this.lembranca.estaAberta(c)
    );
    if (algumaFechada) {
      this.expandirTudo();
    } else {
      this.colapsarTudo();
    }
  }

  private atualizarRegistroChavePadrao(): void {
    const usaChavePadrao =
      this._conectado &&
      this.persistir &&
      !this.getAttribute('storage-key')?.trim() &&
      !this.id?.trim();

    if (usaChavePadrao) {
      const jaRegistrada = UITabelaPropriedades.instanciasChavePadrao.has(this);
      UITabelaPropriedades.instanciasChavePadrao.add(this);
      if (!jaRegistrada && UITabelaPropriedades.instanciasChavePadrao.size > 1) {
        console.warn(
          '[ui-tabela-propriedades] Múltiplos painéis persistentes conectados sem "id" ou "storage-key". Todos compartilharão a mesma chave de armazenamento.'
        );
      }
    } else {
      UITabelaPropriedades.instanciasChavePadrao.delete(this);
    }
  }

  private atualizarVisaoCategorias(): void {
    const temCategoriasRenderizadas = this.shadow.querySelectorAll('.ui-prop__categoria').length > 0;
    if (!this._termoBusca && temCategoriasRenderizadas) {
      sincronizarDomCategorias(this.shadow, this._categorias, (cat) => this.lembranca.estaAberta(cat));
      return;
    }
    this.renderCategorias();
  }

  private emitirEstadoCategorias(): void {
    const detail = this.lembranca.montarDetalheEvento(this._categorias);
    this.dispatchEvent(
      new CustomEvent<UICategoriasEstadoDetail>('ui-categorias-estado', {
        bubbles: true,
        composed: true,
        detail
      })
    );
  }

  private renderSeletorTipos() {
    renderizarSeletorTipos({
      tipoContainerElement: this.tipoContainerElement,
      tipos: this._tipos,
      tipoSelecionadoId: this._tipoSelecionadoId,
      estiloVisual: this.getAttribute('estilo-visual') || 'autocad',
      onSelecionarTipo: (id) => {
        this._tipoSelecionadoId = id;
        this.renderSeletorTipos();
        const item = this._tipos.find(t => t && String(t.id) === String(id));
        this.dispatchEvent(new CustomEvent('ui-tipo-alterado', { bubbles: true, composed: true, detail: { id, tipo: item } }));
      },
      onEditarTipo: (tipo) => this.dispatchEvent(new CustomEvent('ui-editar-tipo-clique', { bubbles: true, composed: true, detail: { tipo } })),
      onQuickSelect: (tipo) => this.dispatchEvent(new CustomEvent('ui-quick-select', { bubbles: true, composed: true, detail: { tipo } })),
      onSelectObjects: (tipo) => this.dispatchEvent(new CustomEvent('ui-selecionar-objetos', { bubbles: true, composed: true, detail: { tipo } })),
      onCalculadora: (tipo) => this.dispatchEvent(new CustomEvent('ui-calculadora', { bubbles: true, composed: true, detail: { tipo } })),
      obterTexto: (chave) => this.obterTexto(chave)
    });
  }

  private renderCategorias() {
    const listaContainer = this.shadow.getElementById('lista-categorias');
    if (!listaContainer) return;
    // O guia de funções vive fora da lista: não pode sobrar quando o campo some
    this.shadow.querySelectorAll('.ui-prop__ac').forEach(el => el.remove());

    renderizarCategoriasETree({
      listaContainer,
      categorias: this._categorias,
      termoBusca: this._termoBusca,
      obterTexto: (chave) => this.obterTexto(chave),
      onToggleCategoria: (id) => this.toggleCategoria(id),
      obterCategoriaAberta: (categoria) => this.lembranca.estaAberta(categoria),
      linhaCtx: {
        valoresAtuais: this.gerenciadorValores.getValores(),
        valoresOriginais: this.gerenciadorValores.getValoresOriginais(),
        onAtualizarCampoVisual: (propId, novoValor) => atualizarCampoVisual(this.shadow, propId, novoValor),
        onRedefinir: (propId) => this.redefinirValor(propId),
        editorCtx: {
          obterValorAtual: (id: string) => this.gerenciadorValores.obterValor(id),
          registrarAlteracao: (catId: string, id: string, val: any) => {
            this.gerenciadorValores.registrarAlteracao(catId, id, val);
          },
          focarProximoEditor: (el: HTMLElement) => focarProximoEditor(this.shadow, el),
          focarEditorAnterior: (el: HTMLElement) => focarEditorAnterior(this.shadow, el),
          obterTextoMisto: () => this.textoMisto,
          obterTexto: (chave: keyof TextosPropriedades) => this.obterTexto(chave),
          despacharEventoAcao: (p: ItemPropriedade, catId: string) => {
            this.dispatchEvent(
              new CustomEvent('ui-acao-clique', {
                bubbles: true,
                composed: true,
                detail: { id: p.id, categoriaId: catId, propriedade: p }
              })
            );
          }
        }
      }
    });
  }
}

export class UIPainelPropriedades extends UITabelaPropriedades {}
export class UIPropriedades extends UITabelaPropriedades {}

definirCustomElement('ui-tabela-propriedades', UITabelaPropriedades);
definirCustomElement('ui-painel-propriedades', UIPainelPropriedades);
definirCustomElement('ui-propriedades', UIPropriedades);
