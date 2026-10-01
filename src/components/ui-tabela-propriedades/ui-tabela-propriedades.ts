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
      'flutuante'
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

    this.configurarArrastoFlutuante();
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
    const atual = this.getAttribute('densidade') || 'padrao';
    let proxima = 'compacta';
    if (atual === 'compacta') {
      proxima = 'ultracompacta';
    } else if (atual === 'ultracompacta') {
      proxima = 'padrao';
    } else {
      proxima = 'compacta';
    }

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
    const isFlutuante = this.hasAttribute('flutuante');
    if (isFlutuante) {
      this.removeAttribute('flutuante');
      this.style.left = '';
      this.style.top = '';
      this.style.right = '';
      this.style.bottom = '';
      this.style.position = '';
      this.style.zIndex = '';
    } else {
      this.setAttribute('flutuante', '');
      this.style.position = 'fixed';
      if (!this.style.left && !this.style.top) {
        const largura = 300;
        const left = Math.max(20, (typeof window !== 'undefined' ? window.innerWidth : 1024) - largura - 30);
        this.style.left = `${left}px`;
        this.style.top = `70px`;
        this.style.width = `${largura}px`;
        this.style.height = `480px`;
      }
    }
    const novoEstado = !isFlutuante;
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

  private configurarArrastoFlutuante(): void {
    const headerEl = this.shadow.getElementById('header');
    if (headerEl) {
      let dragId: number | null = null;
      let startX = 0;
      let startY = 0;
      let initLeft = 0;
      let initTop = 0;

      const onPointerMove = (e: PointerEvent) => {
        if (dragId === null) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let nLeft = initLeft + dx;
        let nTop = initTop + dy;

        const maxL = Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 1024) - this.offsetWidth);
        const maxT = Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 768) - 30);
        nLeft = Math.max(0, Math.min(maxL, nLeft));
        nTop = Math.max(0, Math.min(maxT, nTop));

        this.style.left = `${nLeft}px`;
        this.style.top = `${nTop}px`;
        this.style.right = 'auto';
        this.style.bottom = 'auto';
      };

      const onPointerUp = (e: PointerEvent) => {
        if (dragId === null) return;
        try {
          headerEl.releasePointerCapture(e.pointerId);
        } catch (_err) {}
        headerEl.removeEventListener('pointermove', onPointerMove);
        headerEl.removeEventListener('pointerup', onPointerUp);
        headerEl.removeEventListener('pointercancel', onPointerUp);
        dragId = null;
        this.classList.remove('arrastando');

        this.dispatchEvent(new CustomEvent('ui-mover', {
          bubbles: true,
          composed: true,
          detail: { left: this.style.left, top: this.style.top }
        }));
      };

      this.listeners.add(headerEl, 'pointerdown', (e: PointerEvent) => {
        if (!this.hasAttribute('flutuante')) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, a')) return;
        if (e.button !== 0) return;

        e.preventDefault();
        dragId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;

        const rect = this.getBoundingClientRect();
        initLeft = rect.left;
        initTop = rect.top;

        this.classList.add('arrastando');
        try {
          headerEl.setPointerCapture(e.pointerId);
        } catch (_err) {}

        headerEl.addEventListener('pointermove', onPointerMove);
        headerEl.addEventListener('pointerup', onPointerUp);
        headerEl.addEventListener('pointercancel', onPointerUp);
      });
    }

    const resizerCanto = this.shadow.getElementById('resizer-canto');
    if (resizerCanto) {
      let resizeId: number | null = null;
      let startW = 0;
      let startH = 0;
      let startX = 0;
      let startY = 0;

      const onResizeMove = (e: PointerEvent) => {
        if (resizeId === null) return;
        const nw = Math.max(200, startW + (e.clientX - startX));
        const nh = Math.max(180, startH + (e.clientY - startY));
        this.style.width = `${nw}px`;
        this.style.height = `${nh}px`;
      };

      const onResizeUp = (e: PointerEvent) => {
        if (resizeId === null) return;
        try {
          resizerCanto.releasePointerCapture(e.pointerId);
        } catch (_err) {}
        resizerCanto.removeEventListener('pointermove', onResizeMove);
        resizerCanto.removeEventListener('pointerup', onResizeUp);
        resizerCanto.removeEventListener('pointercancel', onResizeUp);
        resizeId = null;

        this.dispatchEvent(new CustomEvent('ui-redimensionar', {
          bubbles: true,
          composed: true,
          detail: { width: this.style.width, height: this.style.height }
        }));
      };

      this.listeners.add(resizerCanto, 'pointerdown', (e: PointerEvent) => {
        if (!this.hasAttribute('flutuante')) return;
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        resizeId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        const rect = this.getBoundingClientRect();
        startW = rect.width;
        startH = rect.height;

        try {
          resizerCanto.setPointerCapture(e.pointerId);
        } catch (_err) {}

        resizerCanto.addEventListener('pointermove', onResizeMove);
        resizerCanto.addEventListener('pointerup', onResizeUp);
        resizerCanto.addEventListener('pointercancel', onResizeUp);
      });
    }
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

definirCustomElement('ui-tabela-propriedades', UITabelaPropriedades);
