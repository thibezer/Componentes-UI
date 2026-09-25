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
import { GerenciadorValoresPropriedades } from './propriedades-gerenciador-valores';
import {
  conectarPainelControles,
  sincronizarPainelControles
} from './propriedades-painel-controles';
import {
  focarProximoEditor,
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

export class UITabelaPropriedades extends HTMLElement {
  static get observedAttributes() {
    return [
      'titulo',
      'estilo-visual',
      'modo-aplicar',
      'filtro',
      'densidade',
      'largura-rotulo',
      'fechavel'
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
      onDesfazer: () => this.desfazer()
    });

    this.controladorSplitter.init();
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
    this.splitterListeners.cleanup();
  }

  attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null) {
    if (name === 'largura-rotulo' && newVal) {
      const pct = parseFloat(newVal);
      if (!isNaN(pct)) {
        this._larguraRotuloPorcentagem = this.controladorSplitter.definirLarguraRotulo(pct);
      }
    }
    this.syncState();
  }

  get categorias(): CategoriaPropriedades[] {
    return this._categorias;
  }

  set categorias(novasCategorias: CategoriaPropriedades[]) {
    this._categorias = Array.isArray(novasCategorias) ? novasCategorias : [];
    this.gerenciadorValores.inicializarCategorias(this._categorias);
    this.renderCategorias();
  }

  get tipos(): SeletorTipoItem[] {
    return this._tipos;
  }

  set tipos(novosTipos: SeletorTipoItem[]) {
    this._tipos = Array.isArray(novosTipos) ? novosTipos : [];
    this.renderSeletorTipos();
  }

  get tipoSelecionado(): string {
    return this._tipoSelecionadoId;
  }

  set tipoSelecionado(idTipo: string) {
    this._tipoSelecionadoId = idTipo;
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

  public expandirTudo(): void {
    expandirTodasCategorias(this.shadow, this._categorias);
  }

  public colapsarTudo(): void {
    colapsarTodasCategorias(this.shadow, this._categorias);
  }

  public toggleCategoria(idCategoria: string): void {
    alternarCategoria(this.shadow, this, this._categorias, idCategoria);
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
        valoresOriginais: {},
        isDirty: this.gerenciadorValores.isDirty,
        onAtualizarCampoVisual: (propId, novoValor) => atualizarCampoVisual(this.shadow, propId, novoValor),
        editorCtx: {
          obterValorAtual: (id: string) => this.gerenciadorValores.obterValor(id),
          registrarAlteracao: (catId: string, id: string, val: any) => {
            this.gerenciadorValores.registrarAlteracao(catId, id, val);
          },
          focarProximoEditor: (el: HTMLElement) => focarProximoEditor(this.shadow, el),
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

if (!customElements.get('ui-tabela-propriedades')) {
  customElements.define('ui-tabela-propriedades', UITabelaPropriedades);
}
