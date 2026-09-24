/* ====================================================
   UI Tabela de Propriedades - Web Component Nativo W3C
   Inspirado nas paletas de propriedades do AutoCAD e Revit.
   ==================================================== */

import estilos from './ui-tabela-propriedades.css?inline';
import { ListenerBag } from '../../core/listener-bag';

export type TipoPropriedade =
  | 'texto'
  | 'numero'
  | 'selecao'
  | 'booleano'
  | 'cor'
  | 'cor-cad'
  | 'linha'
  | 'linetype'
  | 'espessura'
  | 'lineweight'
  | 'acao'
  | 'readonly';

export interface OpcaoPropriedade {
  id: string | number;
  rotulo: string;
}

export interface ItemPropriedade {
  id: string;
  rotulo: string;
  tipo: TipoPropriedade;
  valor: any;
  unidade?: string;
  casasDecimais?: number;
  opcoes?: OpcaoPropriedade[];
  placeholder?: string;
  somenteLeitura?: boolean;
  dica?: string;
  rotuloAcao?: string;
  textoAmostra?: string;
  onClickAcao?: (item: ItemPropriedade) => void;
}

export interface CategoriaPropriedades {
  id: string;
  titulo: string;
  aberto?: boolean;
  propriedades: ItemPropriedade[];
}

export interface SeletorTipoItem {
  id: string;
  rotulo: string;
  subtipo?: string;
  iconeSvg?: string;
}

export interface UIPropertyChangeDetail {
  id: string;
  categoriaId: string;
  valor: any;
  valorAnterior: any;
  todosValores: Record<string, any>;
}

/**
 * Avaliador de expressões matemáticas para campos numéricos técnicos (AutoCAD / Revit / Blender).
 * Parser seguro de descida recursiva sem eval(), com suporte a +, -, *, /, ^, parênteses,
 * porcentagens, constantes (pi) e funções matemáticas (sqrt, abs, round, sin, cos).
 */
export function avaliarExpressaoMatematica(expr: string): number | null {
  if (!expr || typeof expr !== 'string') return null;

  let s = expr.trim();
  if (!s) return null;

  // Substitui vírgulas decimais entre números por ponto (ex: "10,5 + 2,5" -> "10.5 + 2.5")
  s = s.replace(/(\d),(\d)/g, '$1.$2').replace(/,/g, '.');

  // Substitui constantes conhecidas
  s = s.replace(/\bpi\b/gi, String(Math.PI));
  s = s.replace(/\be\b/gi, String(Math.E));

  let pos = 0;

  function peek(): string {
    return s[pos] || '';
  }

  function get(): string {
    return s[pos++] || '';
  }

  function eatSpaces() {
    while (pos < s.length && /\s/.test(s[pos])) {
      pos++;
    }
  }

  function parseExpression(): number {
    eatSpaces();
    let val = parseTerm();
    eatSpaces();

    while (pos < s.length) {
      const op = peek();
      if (op === '+' || op === '-') {
        get();
        eatSpaces();
        const startSub = pos;
        const right = parseTerm();
        eatSpaces();
        // Trata porcentagem contextual em adição/subtração (ex: 100 + 10% -> 110)
        const subStr = s.slice(startSub, pos);
        if (subStr.includes('%')) {
          val = op === '+' ? val + (val * right) : val - (val * right);
        } else {
          val = op === '+' ? val + right : val - right;
        }
      } else {
        break;
      }
    }
    return val;
  }

  function parseTerm(): number {
    eatSpaces();
    let val = parseFactor();
    eatSpaces();

    while (pos < s.length) {
      const op = peek();
      if (op === '*' || op === '/' || op === 'x' || op === 'X') {
        get();
        eatSpaces();
        const right = parseFactor();
        if (op === '/' && right === 0) {
          throw new Error('Divisão por zero');
        }
        val = op === '/' ? val / right : val * right;
        eatSpaces();
      } else {
        break;
      }
    }
    return val;
  }

  function parseFactor(): number {
    eatSpaces();
    let val = parsePrimary();
    eatSpaces();

    // Potência com ^ ou **
    if (peek() === '^') {
      get();
      const exp = parseFactor();
      val = Math.pow(val, exp);
    } else if (s.slice(pos, pos + 2) === '**') {
      pos += 2;
      const exp = parseFactor();
      val = Math.pow(val, exp);
    }
    return val;
  }

  function parsePrimary(): number {
    eatSpaces();
    const ch = peek();

    // Sinais unários (+ ou -)
    if (ch === '+' || ch === '-') {
      get();
      const val = parsePrimary();
      return ch === '-' ? -val : val;
    }

    // Parênteses
    if (ch === '(') {
      get();
      const val = parseExpression();
      eatSpaces();
      if (peek() === ')') {
        get();
      }
      eatSpaces();
      if (peek() === '%') {
        get();
        return val / 100;
      }
      return val;
    }

    // Funções matemáticas (sqrt, abs, round, sin, cos, tan)
    const funcMatch = s.slice(pos).match(/^([a-zA-Z_]\w*)\s*\(/);
    if (funcMatch) {
      const fnName = funcMatch[1].toLowerCase();
      pos += funcMatch[0].length;
      const arg = parseExpression();
      eatSpaces();
      if (peek() === ')') get();
      let res = arg;
      switch (fnName) {
        case 'sqrt': res = Math.sqrt(arg); break;
        case 'abs': res = Math.abs(arg); break;
        case 'round': res = Math.round(arg); break;
        case 'floor': res = Math.floor(arg); break;
        case 'ceil': res = Math.ceil(arg); break;
        case 'sin': res = Math.sin(arg); break;
        case 'cos': res = Math.cos(arg); break;
        case 'tan': res = Math.tan(arg); break;
      }
      eatSpaces();
      if (peek() === '%') {
        get();
        return res / 100;
      }
      return res;
    }

    // Número literal
    const numMatch = s.slice(pos).match(/^([0-9]+(?:\.[0-9]+)?|\.[0-9]+)/);
    if (numMatch) {
      pos += numMatch[0].length;
      let num = parseFloat(numMatch[0]);
      eatSpaces();
      if (peek() === '%') {
        get();
        num = num / 100;
      }
      return num;
    }

    throw new Error('Caractere inválido: ' + ch);
  }

  try {
    const result = parseExpression();
    eatSpaces();
    if (pos < s.length) {
      return null;
    }
    return isFinite(result) ? result : null;
  } catch (_e) {
    return null;
  }
}

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

  // Dados Internos
  private _categorias: CategoriaPropriedades[] = [];
  private _valoresOriginais: Record<string, any> = {};
  private _valoresAtuais: Record<string, any> = {};
  private _tipos: SeletorTipoItem[] = [];
  private _tipoSelecionadoId: string = '';
  private _termoBusca: string = '';
  private _dirty: boolean = false;
  private _larguraRotuloPorcentagem: number = 45;

  // Elementos DOM
  private headerTituloElement!: HTMLSpanElement;
  private tipoContainerElement!: HTMLDivElement;
  private filtroInputElement!: HTMLInputElement;
  private corpoElement!: HTMLDivElement;
  private footerElement!: HTMLDivElement;
  private btnAplicarElement!: HTMLButtonElement;
  private btnDesfazerElement!: HTMLButtonElement;
  private splitterElement!: HTMLDivElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-prop__container" id="container">
        <!-- 1. Header Superior -->
        <header class="ui-prop__header" id="header">
          <div class="ui-prop__header-titulo">
            <span class="ui-prop__header-icone">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </span>
            <span id="header-titulo-texto">Propriedades</span>
          </div>
          <div class="ui-prop__header-acoes">
            <button type="button" class="ui-prop__btn-icone" id="btn-expandir-tudo" title="Expandir/Recolher Tudo" aria-label="Expandir ou recolher tudo">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="7 13 12 18 17 13"></polyline>
                <polyline points="7 6 12 11 17 6"></polyline>
              </svg>
            </button>
            <button type="button" class="ui-prop__btn-icone" id="btn-fechar" title="Fechar" aria-label="Fechar" style="display: none;">
              ✕
            </button>
          </div>
        </header>

        <!-- 2. Seletor de Tipo (AutoCAD / Revit) -->
        <div class="ui-prop__tipo-seletor-container" id="tipo-container" style="display: none;"></div>

        <!-- 3. Busca Rápida de Propriedades -->
        <div class="ui-prop__filtro-container" id="filtro-container" style="display: none;">
          <svg class="ui-prop__filtro-icone" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="ui-prop__filtro-input" id="filtro-input" placeholder="Filtrar propriedades..." />
        </div>

        <!-- 4. Corpo Rolável com Grade de Categorias -->
        <div class="ui-prop__corpo" id="corpo">
          <div class="ui-prop__splitter" id="splitter"></div>
          <div class="ui-prop__lista-categorias" id="lista-categorias"></div>
        </div>

        <!-- 5. Rodapé com Ações (Aplicar / Desfazer) -->
        <footer class="ui-prop__footer" id="footer" style="display: none;">
          <a class="ui-prop__link-ajuda" id="link-ajuda">Ajuda de propriedades</a>
          <div class="ui-prop__footer-botoes">
            <button type="button" class="ui-prop__btn-desfazer" id="btn-desfazer" disabled>Desfazer</button>
            <button type="button" class="ui-prop__btn-aplicar" id="btn-aplicar" disabled>Aplicar</button>
          </div>
        </footer>
      </div>
    `;
    this.headerTituloElement = this.shadow.getElementById('header-titulo-texto') as HTMLSpanElement;
    this.tipoContainerElement = this.shadow.getElementById('tipo-container') as HTMLDivElement;
    this.filtroInputElement = this.shadow.getElementById('filtro-input') as HTMLInputElement;
    this.corpoElement = this.shadow.getElementById('corpo') as HTMLDivElement;
    this.footerElement = this.shadow.getElementById('footer') as HTMLDivElement;
    this.btnAplicarElement = this.shadow.getElementById('btn-aplicar') as HTMLButtonElement;
    this.btnDesfazerElement = this.shadow.getElementById('btn-desfazer') as HTMLButtonElement;
    this.splitterElement = this.shadow.getElementById('splitter') as HTMLDivElement;
  }

  connectedCallback() {
    this.listeners.cleanup();

    // Eventos do cabeçalho
    const btnExpandir = this.shadow.getElementById('btn-expandir-tudo');
    this.listeners.add(btnExpandir, 'click', () => this.toggleExpandirTodas());

    const btnFechar = this.shadow.getElementById('btn-fechar');
    this.listeners.add(btnFechar, 'click', () => {
      this.dispatchEvent(new CustomEvent('ui-fechar', { bubbles: true, composed: true }));
    });

    // Filtro de propriedades
    this.listeners.add(this.filtroInputElement, 'input', () => {
      this._termoBusca = (this.filtroInputElement.value || '').trim().toLowerCase();
      this.renderCategorias();
    });

    // Rodapé Aplicar / Desfazer
    this.listeners.add(this.btnAplicarElement, 'click', () => this.aplicar());
    this.listeners.add(this.btnDesfazerElement, 'click', () => this.desfazer());

    // Link de Ajuda Revit
    const linkAjuda = this.shadow.getElementById('link-ajuda');
    if (linkAjuda) {
      this.listeners.add(linkAjuda, 'click', (e: MouseEvent) => {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('ui-ajuda', { bubbles: true, composed: true }));
      });
    }

    // Splitter Arrastável
    this.initSplitter();

    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
    this.splitterListeners.cleanup();
  }

  attributeChangedCallback(_name: string, _oldVal: string | null, _newVal: string | null) {
    this.syncState();
  }

  /* ====================================================
     Getters e Setters de Propriedades Públicas
     ==================================================== */

  get categorias(): CategoriaPropriedades[] {
    return this._categorias;
  }

  set categorias(novas: CategoriaPropriedades[]) {
    this._categorias = Array.isArray(novas) ? novas : [];
    // Mapeia valores iniciais
    this._valoresOriginais = {};
    this._valoresAtuais = {};
    this._categorias.forEach(cat => {
      (cat.propriedades || []).forEach(prop => {
        this._valoresOriginais[prop.id] = prop.valor;
        this._valoresAtuais[prop.id] = prop.valor;
      });
    });
    this._dirty = false;
    this.atualizarBotoesFooter();
    this.renderCategorias();
  }

  get valores(): Record<string, any> {
    return { ...this._valoresAtuais };
  }

  set valores(novosValores: Record<string, any>) {
    if (novosValores && typeof novosValores === 'object') {
      this._valoresAtuais = { ...this._valoresAtuais, ...novosValores };
      this._valoresOriginais = { ...this._valoresAtuais };
      this._dirty = false;
      this.atualizarBotoesFooter();
      this.renderCategorias();
    }
  }

  get tipos(): SeletorTipoItem[] {
    return this._tipos;
  }

  set tipos(novosTipos: SeletorTipoItem[]) {
    this._tipos = Array.isArray(novosTipos) ? novosTipos : [];
    if (this._tipos.length > 0 && !this._tipoSelecionadoId) {
      this._tipoSelecionadoId = this._tipos[0].id;
    }
    this.renderSeletorTipos();
  }

  get tipoSelecionado(): string {
    return this._tipoSelecionadoId;
  }

  set tipoSelecionado(novoId: string) {
    this._tipoSelecionadoId = String(novoId);
    this.renderSeletorTipos();
  }

  get dirty(): boolean {
    return this._dirty;
  }

  /* ====================================================
     Métodos Públicos de Controle
     ==================================================== */

  /**
   * Define programmaticamente o valor de uma propriedade.
   */
  public definirValor(idPropriedade: string, valor: any) {
    if (this._valoresAtuais[idPropriedade] !== valor) {
      const valorAnterior = this._valoresAtuais[idPropriedade];
      this._valoresAtuais[idPropriedade] = valor;
      this._dirty = true;
      this.atualizarBotoesFooter();
      this.atualizarCampoVisual(idPropriedade, valor);

      if (this.getAttribute('modo-aplicar') !== 'manual') {
        this.emitirAlteracao(idPropriedade, valor, valorAnterior);
      }
    }
  }

  /**
   * Obtém o valor atual de uma propriedade pelo ID.
   */
  public obterValor(idPropriedade: string): any {
    return this._valoresAtuais[idPropriedade];
  }

  /**
   * Confirma e aplica todas as edições pendentes (modo manual estilo Revit).
   */
  public aplicar(): void {
    if (!this._dirty) return;
    this._valoresOriginais = { ...this._valoresAtuais };
    this._dirty = false;
    this.atualizarBotoesFooter();

    // Remove destaque de linhas modificadas
    const linhasMod = this.shadow.querySelectorAll('.ui-prop__linha--modificada');
    linhasMod.forEach(l => l.classList.remove('ui-prop__linha--modificada'));

    this.dispatchEvent(
      new CustomEvent('ui-aplicar', {
        bubbles: true,
        composed: true,
        detail: { valores: { ...this._valoresAtuais } }
      })
    );
  }

  /**
   * Desfaz todas as alterações pendentes e restaura os valores originais.
   */
  public desfazer(): void {
    if (!this._dirty) return;
    this._valoresAtuais = { ...this._valoresOriginais };
    this._dirty = false;
    this.atualizarBotoesFooter();
    this.renderCategorias();

    this.dispatchEvent(
      new CustomEvent('ui-desfazer', {
        bubbles: true,
        composed: true,
        detail: { valores: { ...this._valoresAtuais } }
      })
    );
  }

  /**
   * Expande todas as categorias da tabela.
   */
  public expandirTudo(): void {
    this._categorias.forEach(cat => cat.aberto = true);
    const catEls = this.shadow.querySelectorAll('.ui-prop__categoria');
    catEls.forEach(el => el.classList.add('ui-prop__categoria--aberta'));
  }

  /**
   * Colapsa todas as categorias da tabela.
   */
  public colapsarTudo(): void {
    this._categorias.forEach(cat => cat.aberto = false);
    const catEls = this.shadow.querySelectorAll('.ui-prop__categoria');
    catEls.forEach(el => el.classList.remove('ui-prop__categoria--aberta'));
  }

  /**
   * Alterna uma categoria específica entre expandida e colapsada.
   */
  public toggleCategoria(idCategoria: string): void {
    const cat = this._categorias.find(c => c.id === idCategoria);
    if (cat) {
      cat.aberto = cat.aberto === false ? true : false;
      const el = this.shadow.querySelector(`[data-cat-id="${idCategoria}"]`);
      if (el) {
        el.classList.toggle('ui-prop__categoria--aberta', Boolean(cat.aberto));
      }
      this.dispatchEvent(
        new CustomEvent('ui-categoria-toggle', {
          bubbles: true,
          composed: true,
          detail: { id: idCategoria, aberto: cat.aberto }
        })
      );
    }
  }

  /* ====================================================
     Lógica Interna e Sincronização
     ==================================================== */

  private syncState() {
    const titulo = this.getAttribute('titulo') || 'Propriedades';
    this.headerTituloElement.textContent = titulo;

    // Botão Fechar
    const fechavel = this.hasAttribute('fechavel');
    const btnFechar = this.shadow.getElementById('btn-fechar');
    if (btnFechar) btnFechar.style.display = fechavel ? 'inline-flex' : 'none';

    // Barra de Busca
    const temFiltro = this.hasAttribute('filtro');
    const filtroCont = this.shadow.getElementById('filtro-container');
    if (filtroCont) filtroCont.style.display = temFiltro ? 'flex' : 'none';

    // Largura do rótulo
    const larguraRotulo = this.getAttribute('largura-rotulo');
    if (larguraRotulo) {
      const pct = parseFloat(larguraRotulo);
      if (!isNaN(pct)) {
        this.definirLarguraRotulo(pct);
      }
    }

    // Modo Aplicar (Revit com footer)
    const modoAplicar = this.getAttribute('modo-aplicar');
    this.footerElement.style.display = modoAplicar === 'manual' ? 'flex' : 'none';

    this.renderSeletorTipos();
    this.renderCategorias();
  }

  private initSplitter() {
    this.splitterListeners.cleanup();

    let isDragging = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      this.splitterElement.classList.add('ui-prop__splitter--ativo');
      try {
        this.splitterElement.setPointerCapture(e.pointerId);
      } catch (_err) {}

      const corpoRect = this.corpoElement.getBoundingClientRect();

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!isDragging) return;
        const totalLargura = corpoRect.width;
        if (totalLargura <= 0) return;
        const offset = moveEvent.clientX - corpoRect.left;

        // Limite mínimo em pixels: rótulo mínimo 80px e valor restante mínimo 130px
        const minRotuloPx = 80;
        const minValorPx = 130;
        const offsetLimitado = Math.max(minRotuloPx, Math.min(totalLargura - minValorPx, offset));

        let pct = (offsetLimitado / totalLargura) * 100;
        pct = Math.max(20, Math.min(65, pct)); // Teto de 65% impede estrangulamento da coluna de valores
        this.definirLarguraRotulo(pct);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        if (!isDragging) return;
        isDragging = false;
        this.splitterElement.classList.remove('ui-prop__splitter--ativo');
        try {
          if (this.splitterElement.hasPointerCapture(upEvent.pointerId)) {
            this.splitterElement.releasePointerCapture(upEvent.pointerId);
          }
        } catch (_err) {}

        this.splitterElement.removeEventListener('pointermove', onPointerMove);
        this.splitterElement.removeEventListener('pointerup', onPointerUp);
        this.splitterElement.removeEventListener('pointercancel', onPointerUp);

        this.dispatchEvent(
          new CustomEvent('ui-splitter-resize', {
            bubbles: true,
            composed: true,
            detail: { larguraPorcentagem: this._larguraRotuloPorcentagem }
          })
        );
      };

      this.splitterElement.addEventListener('pointermove', onPointerMove);
      this.splitterElement.addEventListener('pointerup', onPointerUp);
      this.splitterElement.addEventListener('pointercancel', onPointerUp);
    };

    this.splitterListeners.add(this.splitterElement, 'pointerdown', onPointerDown);

    // Duplo-clique no splitter reseta para 45% (posição padrão de equilíbrio CAD)
    this.splitterListeners.add(this.splitterElement, 'dblclick', () => {
      this.definirLarguraRotulo(45);
      this.dispatchEvent(
        new CustomEvent('ui-splitter-resize', {
          bubbles: true,
          composed: true,
          detail: { larguraPorcentagem: 45 }
        })
      );
    });
  }

  private definirLarguraRotulo(porcentagem: number) {
    const clamped = Math.max(20, Math.min(65, porcentagem));
    this._larguraRotuloPorcentagem = clamped;
    this.style.setProperty('--ui-prop-rotulo-largura', `${clamped}%`);
    if (this.splitterElement) {
      this.splitterElement.style.left = `calc(${clamped}% - 4px)`;
    }
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
    if (!this._tipos || this._tipos.length === 0) {
      this.tipoContainerElement.style.display = 'none';
      return;
    }

    this.tipoContainerElement.style.display = 'flex';
    this.tipoContainerElement.innerHTML = '';

    const estiloVisual = this.getAttribute('estilo-visual') || 'autocad';
    const tipoAtual = this._tipos.find(t => String(t.id) === String(this._tipoSelecionadoId)) || this._tipos[0];

    if (estiloVisual === 'revit') {
      // 1. Card Grande de Tipo (Estilo Revit)
      const card = document.createElement('div');
      card.className = 'ui-prop__tipo-revit-card';

      const miniatura = document.createElement('div');
      miniatura.className = 'ui-prop__tipo-miniatura';
      if (tipoAtual.iconeSvg) {
        miniatura.innerHTML = tipoAtual.iconeSvg;
      } else {
        miniatura.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <path d="M3 9h18M9 21V9"></path>
          </svg>
        `;
      }

      const info = document.createElement('div');
      info.className = 'ui-prop__tipo-info';

      const nome = document.createElement('div');
      nome.className = 'ui-prop__tipo-nome';
      nome.textContent = tipoAtual.rotulo;

      const subtexto = document.createElement('div');
      subtexto.className = 'ui-prop__tipo-subtexto';
      subtexto.textContent = tipoAtual.subtipo || 'Tipo de Família';

      info.appendChild(nome);
      info.appendChild(subtexto);
      card.appendChild(miniatura);
      card.appendChild(info);

      // Sub-barra: Dropdown de seleção de instância/tipo + Botão "Editar tipo"
      const subbarra = document.createElement('div');
      subbarra.className = 'ui-prop__tipo-revit-subbarra';

      const select = document.createElement('select');
      select.className = 'ui-prop__tipo-select';
      this._tipos.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.rotulo}${t.subtipo ? ` : ${t.subtipo}` : ''}`;
        if (String(t.id) === String(this._tipoSelecionadoId)) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        this.selecionarTipo(select.value);
      });

      const btnEditarTipo = document.createElement('button');
      btnEditarTipo.type = 'button';
      btnEditarTipo.className = 'ui-prop__btn-editar-tipo';
      btnEditarTipo.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: -1px;">
          <rect x="3" y="3" width="12" height="12" rx="1"></rect>
          <rect x="9" y="9" width="12" height="12" rx="1"></rect>
        </svg>
        <span>Editar tipo</span>
      `;
      btnEditarTipo.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('ui-editar-tipo-clique', {
          bubbles: true,
          composed: true,
          detail: { tipo: tipoAtual }
        }));
      });

      subbarra.appendChild(select);
      subbarra.appendChild(btnEditarTipo);

      this.tipoContainerElement.appendChild(card);
      this.tipoContainerElement.appendChild(subbarra);
    } else {
      // 2. Barra Compacta (Estilo AutoCAD com Ações Rápidas)
      const autocadBar = document.createElement('div');
      autocadBar.className = 'ui-prop__tipo-autocad-bar';

      const select = document.createElement('select');
      select.className = 'ui-prop__tipo-select';
      this._tipos.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.rotulo;
        if (String(t.id) === String(this._tipoSelecionadoId)) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        this.selecionarTipo(select.value);
      });

      // Botões de Ação Clássicos do AutoCAD (Quick Select, Select Objects, QuickCalc)
      const acoesDiv = document.createElement('div');
      acoesDiv.className = 'ui-prop__tipo-autocad-acoes';

      // 1. Quick Select
      const btnQuickSelect = document.createElement('button');
      btnQuickSelect.type = 'button';
      btnQuickSelect.className = 'ui-prop__btn-autocad';
      btnQuickSelect.title = 'Seleção Rápida (Quick Select)';
      btnQuickSelect.setAttribute('aria-label', 'Seleção rápida');
      btnQuickSelect.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          <path d="M19 13v6M16 16h6" stroke-width="2.5"></path>
        </svg>
      `;
      btnQuickSelect.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('ui-quick-select', {
          bubbles: true,
          composed: true,
          detail: { tipo: tipoAtual }
        }));
      });

      // 2. Select Objects
      const btnSelectObjects = document.createElement('button');
      btnSelectObjects.type = 'button';
      btnSelectObjects.className = 'ui-prop__btn-autocad';
      btnSelectObjects.title = 'Selecionar Objetos';
      btnSelectObjects.setAttribute('aria-label', 'Selecionar objetos');
      btnSelectObjects.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="7"></circle>
          <line x1="12" y1="2" x2="12" y2="7"></line>
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <line x1="2" y1="12" x2="7" y2="12"></line>
          <line x1="17" y1="12" x2="22" y2="12"></line>
          <line x1="12" y1="9" x2="12" y2="15" stroke-width="2.5"></line>
          <line x1="9" y1="12" x2="15" y2="12" stroke-width="2.5"></line>
        </svg>
      `;
      btnSelectObjects.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('ui-selecionar-objetos', {
          bubbles: true,
          composed: true,
          detail: { tipo: tipoAtual }
        }));
      });

      // 3. QuickCalc (Calculadora)
      const btnCalc = document.createElement('button');
      btnCalc.type = 'button';
      btnCalc.className = 'ui-prop__btn-autocad';
      btnCalc.title = 'Calculadora Rápida (QuickCalc)';
      btnCalc.setAttribute('aria-label', 'Calculadora rápida');
      btnCalc.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="2" width="16" height="20" rx="2"></rect>
          <line x1="8" y1="6" x2="16" y2="6"></line>
          <circle cx="8" cy="11" r="1" fill="currentColor"></circle>
          <circle cx="12" cy="11" r="1" fill="currentColor"></circle>
          <circle cx="16" cy="11" r="1" fill="currentColor"></circle>
          <circle cx="8" cy="15" r="1" fill="currentColor"></circle>
          <circle cx="12" cy="15" r="1" fill="currentColor"></circle>
          <circle cx="16" cy="15" r="1" fill="currentColor"></circle>
        </svg>
      `;
      btnCalc.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('ui-calculadora', {
          bubbles: true,
          composed: true,
          detail: { tipo: tipoAtual }
        }));
      });

      acoesDiv.appendChild(btnQuickSelect);
      acoesDiv.appendChild(btnSelectObjects);
      acoesDiv.appendChild(btnCalc);

      autocadBar.appendChild(select);
      autocadBar.appendChild(acoesDiv);
      this.tipoContainerElement.appendChild(autocadBar);
    }
  }

  private selecionarTipo(idTipo: string) {
    this._tipoSelecionadoId = idTipo;
    this.renderSeletorTipos();
    const item = this._tipos.find(t => String(t.id) === String(idTipo));
    this.dispatchEvent(
      new CustomEvent('ui-tipo-alterado', {
        bubbles: true,
        composed: true,
        detail: { id: idTipo, tipo: item }
      })
    );
  }

  private renderCategorias() {
    const listaContainer = this.shadow.getElementById('lista-categorias');
    if (!listaContainer) return;
    listaContainer.innerHTML = '';

    if (!this._categorias || this._categorias.length === 0) {
      const vazio = document.createElement('div');
      vazio.className = 'ui-prop__vazio';
      vazio.textContent = 'Nenhuma propriedade disponível.';
      listaContainer.appendChild(vazio);
      return;
    }

    const fragment = document.createDocumentFragment();

    this._categorias.forEach(cat => {
      // Filtragem por termo de busca
      const propriedadesFiltradas = (cat.propriedades || []).filter(prop => {
        if (!this._termoBusca) return true;
        return (
          prop.rotulo.toLowerCase().includes(this._termoBusca) ||
          String(prop.id).toLowerCase().includes(this._termoBusca)
        );
      });

      // Se há busca e nenhum item bateu nesta categoria, oculta a categoria inteira
      if (this._termoBusca && propriedadesFiltradas.length === 0) {
        return;
      }

      const isAberta = cat.aberto !== false;
      const catEl = document.createElement('div');
      catEl.className = `ui-prop__categoria ${isAberta ? 'ui-prop__categoria--aberta' : ''}`;
      catEl.setAttribute('data-cat-id', cat.id);

      // Header da Categoria
      const headerEl = document.createElement('div');
      headerEl.className = 'ui-prop__categoria-header';

      const tituloBloco = document.createElement('div');
      tituloBloco.className = 'ui-prop__categoria-titulo-bloco';

      const setaEl = document.createElement('span');
      setaEl.className = 'ui-prop__categoria-seta';
      setaEl.textContent = '▶';

      const tituloTexto = document.createElement('span');
      tituloTexto.textContent = cat.titulo;

      tituloBloco.appendChild(setaEl);
      tituloBloco.appendChild(tituloTexto);

      const contador = document.createElement('span');
      contador.className = 'ui-prop__categoria-contador';
      contador.textContent = String(propriedadesFiltradas.length);

      headerEl.appendChild(tituloBloco);
      headerEl.appendChild(contador);

      headerEl.addEventListener('click', () => {
        this.toggleCategoria(cat.id);
      });

      headerEl.addEventListener('dblclick', () => {
        this.toggleCategoria(cat.id);
      });

      // Conteúdo da Categoria (Linhas)
      const conteudoEl = document.createElement('div');
      conteudoEl.className = 'ui-prop__categoria-conteudo';

      propriedadesFiltradas.forEach(prop => {
        const linhaEl = this.criarLinhaPropriedade(cat.id, prop);
        conteudoEl.appendChild(linhaEl);
      });

      catEl.appendChild(headerEl);
      catEl.appendChild(conteudoEl);
      fragment.appendChild(catEl);
    });

    listaContainer.appendChild(fragment);
  }

  private criarLinhaPropriedade(categoriaId: string, prop: ItemPropriedade): HTMLDivElement {
    const linha = document.createElement('div');
    linha.className = 'ui-prop__linha';
    linha.setAttribute('data-prop-id', prop.id);

    const valorAtual = this._valoresAtuais[prop.id] !== undefined ? this._valoresAtuais[prop.id] : prop.valor;
    const valorOriginal = this._valoresOriginais[prop.id];

    if (this._dirty && valorAtual !== valorOriginal) {
      linha.classList.add('ui-prop__linha--modificada');
    }

    // Usabilidade: Duplo clique na linha foca diretamente no editor de valor
    linha.addEventListener('dblclick', () => {
      const editor = linha.querySelector<HTMLElement>(
        'input:not([type="color"]):not(.ui-prop__cor-picker-oculto), select, .ui-prop__btn-acao-inline'
      );
      if (editor) {
        editor.focus();
        if (editor instanceof HTMLInputElement) {
          editor.select();
        }
      }
    });

    // Coluna 1: Rótulo
    const colRotulo = document.createElement('div');
    colRotulo.className = 'ui-prop__col-rotulo';
    colRotulo.title = prop.rotulo;
    const spanRotulo = document.createElement('span');
    spanRotulo.textContent = prop.rotulo;
    colRotulo.appendChild(spanRotulo);

    // Se for numérico, habilita arraste (scrubbing) no rótulo para ajuste contínuo do valor (estilo CAD / Blender / Figma)
    if (prop.tipo === 'numero' && !prop.somenteLeitura) {
      colRotulo.classList.add('ui-prop__col-rotulo--scrub');
      colRotulo.title = `${prop.rotulo} (Arraste para ajustar, duplo-clique para editar)`;

      let startX = 0;
      let valorInicial = 0;
      let arrastou = false;

      colRotulo.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.button !== 0) return;
        startX = e.clientX;
        const vAtual = this._valoresAtuais[prop.id];
        valorInicial = typeof vAtual === 'number' ? vAtual : (parseFloat(String(vAtual || 0)) || 0);
        arrastou = false;

        try {
          colRotulo.setPointerCapture(e.pointerId);
        } catch (_err) {}
        colRotulo.classList.add('ui-prop__col-rotulo--arrastando');

        const onPointerMove = (moveEvent: PointerEvent) => {
          const deltaX = moveEvent.clientX - startX;
          if (Math.abs(deltaX) > 2) {
            arrastou = true;
          }

          if (arrastou) {
            let fator = 1;
            if (moveEvent.shiftKey) fator = 0.1;
            else if (moveEvent.ctrlKey || moveEvent.metaKey) fator = 10;

            const casas = prop.casasDecimais !== undefined ? prop.casasDecimais : 2;
            const passoBase = Math.pow(10, -Math.min(casas, 2));
            let novo = valorInicial + (deltaX * passoBase * fator);

            if (prop.casasDecimais !== undefined) {
              novo = Number(novo.toFixed(prop.casasDecimais));
            } else {
              novo = Math.round(novo * 100) / 100;
            }

            this.registrarAlteracao(categoriaId, prop.id, novo);
            this.atualizarCampoVisual(prop.id, novo);
          }
        };

        const onPointerUp = (upEvent: PointerEvent) => {
          colRotulo.classList.remove('ui-prop__col-rotulo--arrastando');
          try {
            if (colRotulo.hasPointerCapture(upEvent.pointerId)) {
              colRotulo.releasePointerCapture(upEvent.pointerId);
            }
          } catch (_err) {}

          colRotulo.removeEventListener('pointermove', onPointerMove);
          colRotulo.removeEventListener('pointerup', onPointerUp);
          colRotulo.removeEventListener('pointercancel', onPointerUp);
        };

        colRotulo.addEventListener('pointermove', onPointerMove);
        colRotulo.addEventListener('pointerup', onPointerUp);
        colRotulo.addEventListener('pointercancel', onPointerUp);
      });
    }

    // Coluna 2: Editor de Valor
    const colValor = document.createElement('div');
    colValor.className = 'ui-prop__col-valor';

    const editorEl = this.criarEditorValor(categoriaId, prop, valorAtual);
    colValor.appendChild(editorEl);

    if (prop.unidade) {
      const unidadeSpan = document.createElement('span');
      unidadeSpan.className = 'ui-prop__unidade-sufixo';
      unidadeSpan.textContent = prop.unidade;
      colValor.appendChild(unidadeSpan);
    }

    linha.appendChild(colRotulo);
    linha.appendChild(colValor);
    return linha;
  }

  private criarEditorValor(categoriaId: string, prop: ItemPropriedade, valorAtual: any): HTMLElement {
    // 1. Somente leitura ou tipo 'readonly'
    if (prop.somenteLeitura || prop.tipo === 'readonly') {
      const span = document.createElement('span');
      const isNumero = typeof valorAtual === 'number' || (typeof valorAtual === 'string' && /^-?\d+(\.\d+)?$/.test(valorAtual.trim()));
      span.className = `ui-prop__valor-readonly ${isNumero ? 'ui-prop__valor-readonly--numero' : ''}`.trim();
      span.textContent = valorAtual !== undefined && valorAtual !== null ? String(valorAtual) : '—';
      return span;
    }

    // 2. Tipo Booleano (Checkbox compacto)
    if (prop.tipo === 'booleano') {
      const container = document.createElement('label');
      container.className = 'ui-prop__editor-booleano';

      const isChecked = Boolean(valorAtual);
      const customCheck = document.createElement('div');
      customCheck.className = `ui-prop__checkbox-custom ${isChecked ? 'ui-prop__checkbox-custom--marcado' : ''}`;
      customCheck.textContent = isChecked ? '✓' : '';

      const rotulo = document.createElement('span');
      rotulo.className = 'ui-prop__booleano-rotulo';
      rotulo.textContent = isChecked ? 'Sim' : 'Não';

      container.appendChild(customCheck);
      container.appendChild(rotulo);

      container.addEventListener('click', (e) => {
        e.preventDefault();
        const novoValor = !Boolean(this._valoresAtuais[prop.id]);
        this.registrarAlteracao(categoriaId, prop.id, novoValor);
        customCheck.classList.toggle('ui-prop__checkbox-custom--marcado', novoValor);
        customCheck.textContent = novoValor ? '✓' : '';
        rotulo.textContent = novoValor ? 'Sim' : 'Não';
      });

      return container;
    }

    // 3. Tipo Tipo de Linha CAD (Linetype com preview SVG)
    if (prop.tipo === 'linha' || prop.tipo === 'linetype') {
      const container = document.createElement('div');
      container.className = 'ui-prop__editor-linha-container';

      const svgAmostra = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgAmostra.setAttribute('class', 'ui-prop__linha-amostra-svg');
      svgAmostra.setAttribute('viewBox', '0 0 44 12');

      const lineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineSvg.setAttribute('x1', '0');
      lineSvg.setAttribute('y1', '6');
      lineSvg.setAttribute('x2', '44');
      lineSvg.setAttribute('y2', '6');

      const aplicarEstiloLinha = (val: string) => {
        const v = String(val || '').toLowerCase();
        if (v.includes('dash') || v.includes('tracej') || v.includes('hidden')) {
          lineSvg.setAttribute('stroke-dasharray', '6,3');
        } else if (v.includes('dot') || v.includes('ponto') || v.includes('pontilh')) {
          lineSvg.setAttribute('stroke-dasharray', '2,3');
        } else if (v.includes('center') || v.includes('eixo')) {
          lineSvg.setAttribute('stroke-dasharray', '8,3,2,3');
        } else {
          lineSvg.setAttribute('stroke-dasharray', 'none');
        }
      };

      aplicarEstiloLinha(valorAtual);
      svgAmostra.appendChild(lineSvg);

      const select = document.createElement('select');
      select.className = 'ui-prop__linha-select';

      const opcoesLinha = prop.opcoes && prop.opcoes.length > 0 ? prop.opcoes : [
        { id: 'ByLayer', rotulo: 'ByLayer' },
        { id: 'ByBlock', rotulo: 'ByBlock' },
        { id: 'Continuous', rotulo: 'Continuous' },
        { id: 'Dashed', rotulo: 'Dashed' },
        { id: 'Hidden', rotulo: 'Hidden' },
        { id: 'Center', rotulo: 'Center' },
        { id: 'Dotted', rotulo: 'Dotted' }
      ];

      opcoesLinha.forEach(op => {
        const opt = document.createElement('option');
        opt.value = String(op.id);
        opt.textContent = op.rotulo;
        if (String(op.id).toLowerCase() === String(valorAtual).toLowerCase()) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        aplicarEstiloLinha(select.value);
        this.registrarAlteracao(categoriaId, prop.id, select.value);
      });

      select.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.focarProximoEditor(select);
        }
      });

      container.appendChild(svgAmostra);
      container.appendChild(select);
      return container;
    }

    // 4. Tipo Espessura de Linha CAD (Lineweight com espessura proporcional)
    if (prop.tipo === 'espessura' || prop.tipo === 'lineweight') {
      const container = document.createElement('div');
      container.className = 'ui-prop__editor-espessura-container';

      const svgAmostra = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgAmostra.setAttribute('class', 'ui-prop__espessura-amostra-svg');
      svgAmostra.setAttribute('viewBox', '0 0 38 12');

      const lineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineSvg.setAttribute('x1', '0');
      lineSvg.setAttribute('y1', '6');
      lineSvg.setAttribute('x2', '38');
      lineSvg.setAttribute('y2', '6');

      const calcularStroke = (val: string) => {
        const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
        if (isNaN(num) || num <= 0) return 1.5;
        return Math.min(8, Math.max(1, num * 8));
      };

      lineSvg.setAttribute('stroke-width', String(calcularStroke(valorAtual)));
      svgAmostra.appendChild(lineSvg);

      const select = document.createElement('select');
      select.className = 'ui-prop__espessura-select';

      const opcoesEspessura = prop.opcoes && prop.opcoes.length > 0 ? prop.opcoes : [
        { id: 'ByLayer', rotulo: 'ByLayer' },
        { id: 'ByBlock', rotulo: 'ByBlock' },
        { id: '0.00 mm', rotulo: '0.00 mm' },
        { id: '0.05 mm', rotulo: '0.05 mm' },
        { id: '0.09 mm', rotulo: '0.09 mm' },
        { id: '0.13 mm', rotulo: '0.13 mm' },
        { id: '0.15 mm', rotulo: '0.15 mm' },
        { id: '0.18 mm', rotulo: '0.18 mm' },
        { id: '0.20 mm', rotulo: '0.20 mm' },
        { id: '0.25 mm', rotulo: '0.25 mm' },
        { id: '0.30 mm', rotulo: '0.30 mm' },
        { id: '0.35 mm', rotulo: '0.35 mm' },
        { id: '0.40 mm', rotulo: '0.40 mm' },
        { id: '0.50 mm', rotulo: '0.50 mm' },
        { id: '0.60 mm', rotulo: '0.60 mm' },
        { id: '0.70 mm', rotulo: '0.70 mm' },
        { id: '1.00 mm', rotulo: '1.00 mm' },
        { id: '1.40 mm', rotulo: '1.40 mm' },
        { id: '2.00 mm', rotulo: '2.00 mm' }
      ];

      opcoesEspessura.forEach(op => {
        const opt = document.createElement('option');
        opt.value = String(op.id);
        opt.textContent = op.rotulo;
        if (String(op.id).toLowerCase() === String(valorAtual).toLowerCase()) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        lineSvg.setAttribute('stroke-width', String(calcularStroke(select.value)));
        this.registrarAlteracao(categoriaId, prop.id, select.value);
      });

      select.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.focarProximoEditor(select);
        }
      });

      container.appendChild(svgAmostra);
      container.appendChild(select);
      return container;
    }

    // 5. Tipo Cor CAD Avançado (ByLayer, ByBlock, Cores Indexadas e Hex)
    if (prop.tipo === 'cor-cad') {
      const container = document.createElement('div');
      container.className = 'ui-prop__editor-cor-cad-container';

      const amostra = document.createElement('div');
      amostra.className = 'ui-prop__cor-amostra';
      const getHexCor = (val: string): string => {
        const v = String(val).toLowerCase();
        if (v === 'red' || v === '1') return '#ff0000';
        if (v === 'yellow' || v === '2') return '#ffff00';
        if (v === 'green' || v === '3') return '#00ff00';
        if (v === 'cyan' || v === '4') return '#00ffff';
        if (v === 'blue' || v === '5') return '#0000ff';
        if (v === 'magenta' || v === '6') return '#ff00ff';
        if (v === 'white' || v === '7' || v === 'bylayer' || v === 'byblock') return '#ffffff';
        if (v.startsWith('#')) return v;
        return '#ffffff';
      };

      amostra.style.backgroundColor = getHexCor(valorAtual);

      const select = document.createElement('select');
      select.className = 'ui-prop__cor-cad-select';

      const coresCad = [
        { id: 'ByLayer', rotulo: 'ByLayer' },
        { id: 'ByBlock', rotulo: 'ByBlock' },
        { id: 'Red', rotulo: 'Red (1)' },
        { id: 'Yellow', rotulo: 'Yellow (2)' },
        { id: 'Green', rotulo: 'Green (3)' },
        { id: 'Cyan', rotulo: 'Cyan (4)' },
        { id: 'Blue', rotulo: 'Blue (5)' },
        { id: 'Magenta', rotulo: 'Magenta (6)' },
        { id: 'White', rotulo: 'White (7)' },
        { id: 'custom', rotulo: 'Selecionar cor...' }
      ];

      coresCad.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.rotulo;
        if (String(c.id).toLowerCase() === String(valorAtual).toLowerCase()) opt.selected = true;
        select.appendChild(opt);
      });

      const picker = document.createElement('input');
      picker.type = 'color';
      picker.className = 'ui-prop__cor-picker-oculto';

      picker.addEventListener('input', () => {
        const novaCor = picker.value;
        amostra.style.backgroundColor = novaCor;
        this.registrarAlteracao(categoriaId, prop.id, novaCor);
      });

      select.addEventListener('change', () => {
        if (select.value === 'custom') {
          picker.click();
        } else {
          amostra.style.backgroundColor = getHexCor(select.value);
          this.registrarAlteracao(categoriaId, prop.id, select.value);
        }
      });

      select.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.focarProximoEditor(select);
        }
      });

      container.appendChild(amostra);
      container.appendChild(select);
      container.appendChild(picker);
      return container;
    }

    // 6. Tipo Seleção (Dropdown Select Tradicional)
    if (prop.tipo === 'selecao') {
      const select = document.createElement('select');
      select.className = 'ui-prop__editor-select';

      (prop.opcoes || []).forEach(op => {
        const opt = document.createElement('option');
        opt.value = String(op.id);
        opt.textContent = op.rotulo;
        if (String(op.id) === String(valorAtual)) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        this.registrarAlteracao(categoriaId, prop.id, select.value);
      });

      select.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.focarProximoEditor(select);
        }
      });

      return select;
    }

    // 7. Tipo Cor Padrão (Swatch com Color Picker Nativo)
    if (prop.tipo === 'cor') {
      const container = document.createElement('div');
      container.className = 'ui-prop__editor-cor-container';

      const amostra = document.createElement('div');
      amostra.className = 'ui-prop__cor-amostra';
      amostra.style.backgroundColor = valorAtual || '#ffffff';

      const texto = document.createElement('span');
      texto.className = 'ui-prop__cor-texto';
      texto.textContent = prop.textoAmostra || String(valorAtual || 'ByLayer');

      const picker = document.createElement('input');
      picker.type = 'color';
      picker.className = 'ui-prop__cor-picker-oculto';
      picker.value = (typeof valorAtual === 'string' && valorAtual.startsWith('#')) ? valorAtual : '#ffffff';

      picker.addEventListener('input', () => {
        const novaCor = picker.value;
        amostra.style.backgroundColor = novaCor;
        texto.textContent = novaCor;
        this.registrarAlteracao(categoriaId, prop.id, novaCor);
      });

      container.addEventListener('click', () => {
        picker.click();
      });

      container.appendChild(amostra);
      container.appendChild(texto);
      container.appendChild(picker);
      return container;
    }

    // 8. Tipo Ação (Botão "Editar...", "Executar...")
    if (prop.tipo === 'acao') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ui-prop__btn-acao-inline';
      btn.textContent = prop.rotuloAcao || 'Editar...';

      btn.addEventListener('click', () => {
        if (typeof prop.onClickAcao === 'function') {
          prop.onClickAcao(prop);
        }
        this.dispatchEvent(
          new CustomEvent('ui-acao-clique', {
            bubbles: true,
            composed: true,
            detail: { id: prop.id, categoriaId, propriedade: prop }
          })
        );
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          btn.click();
        }
      });

      return btn;
    }

    // 9. Tipo Número com Funções de Cálculo Inline (+, -, *, /, ^, %), Atalhos e Navegação
    if (prop.tipo === 'numero') {
      const input = document.createElement('input');
      input.type = 'text'; // Permite digitar expressões matemáticas como "100 + 50" ou "25 * 4"
      input.inputMode = 'decimal';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.className = 'ui-prop__editor-input ui-prop__editor-input--numero';
      if (prop.placeholder) input.placeholder = prop.placeholder;

      const formatarValor = (val: any) => {
        if (val === undefined || val === null || val === '') return '';
        const n = Number(val);
        if (isNaN(n)) return String(val);
        if (prop.casasDecimais !== undefined) {
          return n.toFixed(prop.casasDecimais);
        }
        return String(n);
      };

      input.value = formatarValor(valorAtual);

      input.addEventListener('focus', () => {
        input.select();
      });

      // Detecta se o usuário está digitando fórmula matemática e fornece feedback visual
      input.addEventListener('input', () => {
        const val = input.value;
        const contemOperadores = /[\+\-\*\/\^\%\(\)]/.test(val) && !/^[+-]?[0-9]*\.?[0-9]*$/.test(val.trim());
        input.classList.toggle('ui-prop__editor-input--calculando', contemOperadores);
      });

      const commitNumero = () => {
        input.classList.remove('ui-prop__editor-input--calculando');
        const raw = input.value.trim();
        if (raw === '') {
          this.registrarAlteracao(categoriaId, prop.id, null);
          return;
        }

        // Tenta avaliar como expressão matemática ou número
        const calculado = avaliarExpressaoMatematica(raw);
        if (calculado !== null && !isNaN(calculado)) {
          let finalVal = calculado;
          if (prop.casasDecimais !== undefined) {
            finalVal = Number(calculado.toFixed(prop.casasDecimais));
          }
          input.value = formatarValor(finalVal);
          if (finalVal !== this._valoresAtuais[prop.id]) {
            this.registrarAlteracao(categoriaId, prop.id, finalVal);
          }
        } else {
          // Se for expressão inválida, restaura o valor anterior
          input.value = formatarValor(this._valoresAtuais[prop.id]);
        }
      };

      input.addEventListener('change', commitNumero);
      input.addEventListener('blur', commitNumero);

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          commitNumero();
          this.focarProximoEditor(input);
        } else if (e.key === 'Escape') {
          input.classList.remove('ui-prop__editor-input--calculando');
          input.value = formatarValor(this._valoresAtuais[prop.id]);
          input.blur();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          // Incremento / Decremento rápido pelo teclado (com Shift: 10x, com Alt: 0.1x)
          e.preventDefault();
          const atual = parseFloat(input.value) || 0;
          let passo = prop.casasDecimais !== undefined ? Math.pow(10, -prop.casasDecimais) : 1;
          if (e.shiftKey) passo *= 10;
          else if (e.altKey) passo *= 0.1;

          let novo = e.key === 'ArrowUp' ? atual + passo : atual - passo;
          if (prop.casasDecimais !== undefined) {
            novo = Number(novo.toFixed(prop.casasDecimais));
          } else {
            novo = Math.round(novo * 100) / 100;
          }

          input.value = formatarValor(novo);
          this.registrarAlteracao(categoriaId, prop.id, novo);
        }
      });

      return input;
    }

    // 10. Tipo Texto padrão
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ui-prop__editor-input';
    if (prop.placeholder) input.placeholder = prop.placeholder;
    input.value = valorAtual != null ? String(valorAtual) : '';

    input.addEventListener('focus', () => {
      input.select();
    });

    const commitTexto = () => {
      if (input.value !== this._valoresAtuais[prop.id]) {
        this.registrarAlteracao(categoriaId, prop.id, input.value);
      }
    };

    input.addEventListener('change', commitTexto);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        commitTexto();
        this.focarProximoEditor(input);
      } else if (e.key === 'Escape') {
        input.value = String(this._valoresAtuais[prop.id] ?? '');
        input.blur();
      }
    });

    return input;
  }

  private registrarAlteracao(categoriaId: string, propId: string, novoValor: any) {
    const valorAnterior = this._valoresAtuais[propId];
    this._valoresAtuais[propId] = novoValor;
    this._dirty = true;
    this.atualizarBotoesFooter();

    const linha = this.shadow.querySelector(`[data-prop-id="${propId}"]`);
    if (linha) {
      linha.classList.add('ui-prop__linha--modificada');
    }

    if (this.getAttribute('modo-aplicar') !== 'manual') {
      this.emitirAlteracao(propId, novoValor, valorAnterior, categoriaId);
    }
  }

  private emitirAlteracao(propId: string, novoValor: any, valorAnterior: any, categoriaId: string = '') {
    this.dispatchEvent(
      new CustomEvent<UIPropertyChangeDetail>('ui-propriedade-alterada', {
        bubbles: true,
        composed: true,
        detail: {
          id: propId,
          categoriaId,
          valor: novoValor,
          valorAnterior,
          todosValores: { ...this._valoresAtuais }
        }
      })
    );
  }

  private atualizarBotoesFooter() {
    this.btnAplicarElement.disabled = !this._dirty;
    this.btnDesfazerElement.disabled = !this._dirty;
  }

  private focarProximoEditor(atual: HTMLElement) {
    const editores = Array.from(
      this.shadow.querySelectorAll<HTMLElement>(
        '.ui-prop__linha input:not([disabled]):not([type="color"]):not(.ui-prop__cor-picker-oculto), ' +
        '.ui-prop__linha select:not([disabled]), ' +
        '.ui-prop__linha .ui-prop__btn-acao-inline:not([disabled])'
      )
    );
    const idx = editores.indexOf(atual);
    if (idx !== -1 && idx + 1 < editores.length) {
      const prox = editores[idx + 1];
      prox.focus();
      if (prox instanceof HTMLInputElement) {
        prox.select();
      }
    }
  }

  private atualizarCampoVisual(propId: string, novoValor: any) {
    const linha = this.shadow.querySelector(`[data-prop-id="${propId}"]`);
    if (!linha) return;

    const input = linha.querySelector('input:not([type="color"]):not(.ui-prop__cor-picker-oculto)') as HTMLInputElement | null;
    if (input) {
      input.value = String(novoValor ?? '');
    }

    const select = linha.querySelector('select') as HTMLSelectElement | null;
    if (select) {
      select.value = String(novoValor ?? '');
    }

    // Amostra de linha SVG
    const lineSvg = linha.querySelector('.ui-prop__linha-amostra-svg line');
    if (lineSvg) {
      const v = String(novoValor || '').toLowerCase();
      if (v.includes('dash') || v.includes('tracej') || v.includes('hidden')) {
        lineSvg.setAttribute('stroke-dasharray', '6,3');
      } else if (v.includes('dot') || v.includes('ponto') || v.includes('pontilh')) {
        lineSvg.setAttribute('stroke-dasharray', '2,3');
      } else if (v.includes('center') || v.includes('eixo')) {
        lineSvg.setAttribute('stroke-dasharray', '8,3,2,3');
      } else {
        lineSvg.setAttribute('stroke-dasharray', 'none');
      }
    }

    // Amostra de espessura SVG
    const espessuraSvg = linha.querySelector('.ui-prop__espessura-amostra-svg line');
    if (espessuraSvg) {
      const num = parseFloat(String(novoValor).replace(/[^0-9.]/g, ''));
      const sw = isNaN(num) || num <= 0 ? 1.5 : Math.min(8, Math.max(1, num * 8));
      espessuraSvg.setAttribute('stroke-width', String(sw));
    }

    // Amostra de cor
    const amostraCor = linha.querySelector('.ui-prop__cor-amostra') as HTMLElement | null;
    if (amostraCor && typeof novoValor === 'string') {
      amostraCor.style.backgroundColor = novoValor;
    }

    const readonlySpan = linha.querySelector('.ui-prop__valor-readonly') as HTMLSpanElement | null;
    if (readonlySpan) {
      readonlySpan.textContent = novoValor !== undefined && novoValor !== null ? String(novoValor) : '—';
    }
  }
}

if (!customElements.get('ui-tabela-propriedades')) {
  customElements.define('ui-tabela-propriedades', UITabelaPropriedades);
}

// Aliases declarativos úteis
if (!customElements.get('ui-painel-propriedades')) {
  customElements.define('ui-painel-propriedades', class extends UITabelaPropriedades {});
}

if (!customElements.get('ui-propriedades')) {
  customElements.define('ui-propriedades', class extends UITabelaPropriedades {});
}
