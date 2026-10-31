/* ====================================================
   UI Tabela de Propriedades - Web Component Nativo W3C
   Inspirado nas paletas de propriedades do AutoCAD e Revit.
   ==================================================== */

import { ListenerBag } from '../../core/listener-bag';
import {
  CategoriaPropriedades,
  SeletorTipoItem,
  ItemPropriedade
} from './tipos';
import { renderizarSeletorTipos } from './propriedades-seletor-tipo';
import { criarControladorSplitter, ControladorSplitterPropriedades } from './propriedades-splitter';
import { criarTemplateTabelaPropriedades } from './propriedades-template';
import { renderizarCategoriasETree } from './propriedades-render-arvore';
import { alternarPosicionamentoFlutuante, conectarArrastoFlutuante } from './propriedades-flutuante';
import { proximaDensidade } from './propriedades-densidade';
import { GerenciadorValoresPropriedades } from './propriedades-gerenciador-valores';
import {
  conectarPainelControles,
  sincronizarPainelControles
} from './propriedades-painel-controles';
import { conectarTecladoPainel } from './propriedades-teclado';
import { normalizarCategorias, normalizarTipos } from './propriedades-normalizacao';
import {
  focarProximoEditor,
  focarEditorAnterior,
  atualizarCampoVisual,
  expandirTodasCategorias,
  colapsarTodasCategorias,
  alternarCategoria
} from './propriedades-dom-utils';

export * from './tipos';
export { avaliarExpressaoMatematica } from './avaliador-expressao';
export * from './propriedades-editores';
export * from './propriedades-seletor-tipo';
export * from './propriedades-splitter';
export * from './propriedades-render-arvore';
export * from './propriedades-gerenciador-valores';
export * from './propriedades-painel-controles';
export * from './propriedades-dom-utils';
export * from './propriedades-flutuante';
export * from './propriedades-densidade';
export * from './propriedades-valor-misto';
export * from './propriedades-numero';
export * from './propriedades-filtro';
export * from './propriedades-normalizacao';
export * from './propriedades-exibicao';
export * from './propriedades-teclado';
import { TEXTO_MISTO_PADRAO } from './propriedades-valor-misto';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

export class UITabelaPropriedades extends SafeHTMLElement {
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
      'texto-misto'
    ];
  }

  private shadow: ShadowRoot;
  private listeners = new ListenerBag();
  private splitterListeners = new ListenerBag();
  private controladorSplitter!: ControladorSplitterPropriedades;
  private gerenciadorValores: GerenciadorValoresPropriedades;

  private _categorias: CategoriaPropriedades[] = [];
  private _tipos: SeletorTipoItem[] = [];
  private _tipoSelecionadoId: string = '';
  private _termoBusca: string = '';
  private _larguraRotuloPorcentagem: number = 45;

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
      onAlternarColapsoHorizontal: () => this.alternarColapsoHorizontal()
    });

    conectarTecladoPainel({
      shadow: this.shadow,
      listeners: this.listeners,
      isModoManual: () => this.getAttribute('modo-aplicar') === 'manual',
      onAplicar: () => this.aplicar()
    });

    conectarArrastoFlutuante(this, this.shadow, this.listeners);
    this.controladorSplitter.init();
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
    this.splitterListeners.cleanup();
  }

  /**
   * Cada atributo atualiza só o que depende dele: redesenhar todas as linhas (ex.: ao trocar o
   * `titulo`) tiraria o foco de um campo em edição.
   */
  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
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
      default:
        sincronizarPainelControles(this.shadow, this);
    }
  }

  get categorias(): CategoriaPropriedades[] {
    return this._categorias;
  }

  set categorias(novasCategorias: CategoriaPropriedades[]) {
    // Entradas externas são hostis: categorias/propriedades nulas ou sem id são descartadas
    this._categorias = normalizarCategorias(novasCategorias);
    this.gerenciadorValores.inicializarCategorias(this._categorias);
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

  get tipos(): SeletorTipoItem[] {
    return this._tipos;
  }

  set tipos(novosTipos: SeletorTipoItem[]) {
    this._tipos = normalizarTipos(novosTipos);
    this.renderSeletorTipos();
  }

  /** Id do tipo exibido no seletor: sem seleção válida, o seletor mostra (e devolve) o primeiro. */
  get tipoSelecionado(): string {
    const existe = this._tipos.some(t => String(t.id) === String(this._tipoSelecionadoId));
    if (!existe && this._tipos.length > 0) return String(this._tipos[0].id);
    return this._tipoSelecionadoId;
  }

  set tipoSelecionado(idTipo: string) {
    this._tipoSelecionadoId = idTipo == null ? '' : String(idTipo);
    this.renderSeletorTipos();
  }

  get valores(): Record<string, any> {
    return this.gerenciadorValores.getValores();
  }

  set valores(novosValores: Record<string, any>) {
    this.gerenciadorValores.setValores(novosValores);
    this.renderCategorias();
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

  public aplicar(): void {
    this.gerenciadorValores.aplicar();
  }

  public desfazer(): void {
    this.gerenciadorValores.desfazer();
  }

  /**
   * Volta uma propriedade ao valor do último carregar/aplicar (o mesmo que o botão ↺ da linha).
   * Fora do modo manual emite `ui-propriedade-alterada`. Devolve `false` se não havia o que restaurar.
   */
  public reverterPropriedade(propId: string): boolean {
    return this.gerenciadorValores.reverter(propId);
  }

  public expandirTudo(): void {
    expandirTodasCategorias(this.shadow, this._categorias);
  }

  public colapsarTudo(): void {
    colapsarTodasCategorias(this.shadow, this._categorias);
  }

  public toggleCategoria(idCategoria: string): void {
    alternarCategoria(this.shadow, this, this._categorias, idCategoria);
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
    const algumaFechada = this._categorias.some(c => c.aberto === false);
    if (algumaFechada) {
      this.expandirTudo();
    } else {
      this.colapsarTudo();
    }
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
        const item = this._tipos.find(t => String(t.id) === String(id));
        this.dispatchEvent(new CustomEvent('ui-tipo-alterado', { bubbles: true, composed: true, detail: { id, tipo: item } }));
      },
      onEditarTipo: (tipo) => this.dispatchEvent(new CustomEvent('ui-editar-tipo-clique', { bubbles: true, composed: true, detail: { tipo } })),
      onQuickSelect: (tipo) => this.dispatchEvent(new CustomEvent('ui-quick-select', { bubbles: true, composed: true, detail: { tipo } })),
      onSelectObjects: (tipo) => this.dispatchEvent(new CustomEvent('ui-selecionar-objetos', { bubbles: true, composed: true, detail: { tipo } })),
      onCalculadora: (tipo) => this.dispatchEvent(new CustomEvent('ui-calculadora', { bubbles: true, composed: true, detail: { tipo } }))
    });
  }

  private renderCategorias() {
    const listaContainer = this.shadow.getElementById('lista-categorias');
    if (!listaContainer) return;

    renderizarCategoriasETree({
      listaContainer,
      categorias: this._categorias,
      termoBusca: this._termoBusca,
      onToggleCategoria: (id) => this.toggleCategoria(id),
      linhaCtx: {
        valoresAtuais: this.gerenciadorValores.getValores(),
        valoresOriginais: this.gerenciadorValores.getValoresOriginais(),
        onAtualizarCampoVisual: (propId, novoValor) => atualizarCampoVisual(this.shadow, propId, novoValor),
        onReverter: (propId) => this.reverterPropriedade(propId),
        editorCtx: {
          obterValorAtual: (id: string) => this.gerenciadorValores.obterValor(id),
          registrarAlteracao: (catId: string, id: string, val: any) => {
            this.gerenciadorValores.registrarAlteracao(catId, id, val);
          },
          focarProximoEditor: (el: HTMLElement) => focarProximoEditor(this.shadow, el),
          focarEditorAnterior: (el: HTMLElement) => focarEditorAnterior(this.shadow, el),
          obterTextoMisto: () => this.textoMisto,
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

definirCustomElement('ui-tabela-propriedades', UITabelaPropriedades);
