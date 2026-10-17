import estilos from './ui-skeleton.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

/** Limite de linhas: um atributo hostil (`linhas="100000000"`) não pode criar milhões de nós. */
const MAX_LINHAS = 100;

export type VarianteSkeleton = 'texto' | 'circular' | 'retangular' | 'card';
export type AnimacaoSkeleton = 'shimmer' | 'pulso' | 'nenhum';

export class UISkeleton extends SafeHTMLElement {
  static get observedAttributes() {
    return [
      'variante',
      'variant',
      'largura',
      'width',
      'altura',
      'height',
      'raio',
      'radius',
      'linhas',
      'lines',
      'count',
      'animado',
      'animated',
      'aria-label'
    ];
  }

  private rootElement: HTMLDivElement;
  /** O que este componente escreveu em aria-hidden / role (para não sobrescrever o consumidor). */
  private _ocultoAuto = false;
  private _papelAuto = false;
  private _sincronizando = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-skeleton-container"></div>
    `;
    this.rootElement = shadow.querySelector('.ui-skeleton-container')!;
  }

  connectedCallback() {
    this.sincronizarAcessibilidade();
    this.syncState();
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    if (this._sincronizando) return;
    this.sincronizarAcessibilidade();
    this.syncState();
  }

  /**
   * Decorativo por padrão (`aria-hidden`). Com `aria-label` vira uma região de status anunciável
   * ("Carregando tabela"). O que o consumidor definiu em aria-hidden/role é preservado.
   */
  private sincronizarAcessibilidade() {
    this._sincronizando = true;
    const rotulado = !!this.getAttribute('aria-label');
    const ocultoDoConsumidor = this.hasAttribute('aria-hidden') && !this._ocultoAuto;
    if (rotulado) {
      if (this._ocultoAuto) this.removeAttribute('aria-hidden');
      this._ocultoAuto = false;
      if (!this.hasAttribute('role')) {
        this.setAttribute('role', 'status');
        this._papelAuto = true;
      }
    } else {
      if (this._papelAuto) this.removeAttribute('role');
      this._papelAuto = false;
      if (!ocultoDoConsumidor) {
        this.setAttribute('aria-hidden', 'true');
        this._ocultoAuto = true;
      }
    }
    this._sincronizando = false;
  }

  get variante(): VarianteSkeleton {
    const v = (this.getAttribute('variante') || this.getAttribute('variant') || 'texto').toLowerCase();
    if (v === 'circulo' || v === 'circular') return 'circular';
    if (v === 'retangulo' || v === 'retangular') return 'retangular';
    if (v === 'card') return 'card';
    return 'texto';
  }

  set variante(val: VarianteSkeleton) {
    this.setAttribute('variante', val);
  }

  get animado(): AnimacaoSkeleton {
    const a = (this.getAttribute('animado') || this.getAttribute('animated') || 'shimmer').toLowerCase();
    if (a === 'pulse' || a === 'pulso') return 'pulso';
    if (a === 'none' || a === 'nenhum' || a === 'estatico') return 'nenhum';
    return 'shimmer';
  }

  set animado(val: AnimacaoSkeleton) {
    this.setAttribute('animado', val);
  }

  get linhas(): number {
    const l = parseInt(this.getAttribute('linhas') || this.getAttribute('lines') || this.getAttribute('count') || '1', 10);
    return isNaN(l) || l < 1 ? 1 : Math.min(l, MAX_LINHAS);
  }

  set linhas(val: number) {
    this.setAttribute('linhas', String(val));
  }

  private syncState() {
    const variante = this.variante;
    const animado = this.animado;
    const largura = this.getAttribute('largura') || this.getAttribute('width');
    const altura = this.getAttribute('altura') || this.getAttribute('height');
    const raio = this.getAttribute('raio') || this.getAttribute('radius');
    const totalLinhas = this.linhas;

    this.rootElement.innerHTML = '';

    const animClasse = animado === 'pulso' 
      ? 'ui-skeleton--pulso' 
      : animado === 'nenhum' 
        ? 'ui-skeleton--estatico' 
        : '';

    if (variante === 'card') {
      const card = document.createElement('div');
      card.className = 'ui-skeleton ui-skeleton--card';

      const media = document.createElement('div');
      media.className = `ui-skeleton ui-skeleton__card-media ${animClasse}`;

      const header = document.createElement('div');
      header.className = 'ui-skeleton__card-header';

      const avatar = document.createElement('div');
      avatar.className = `ui-skeleton ui-skeleton__card-avatar ${animClasse}`;

      const title = document.createElement('div');
      title.className = `ui-skeleton ui-skeleton__card-title ${animClasse}`;

      header.appendChild(avatar);
      header.appendChild(title);

      const body = document.createElement('div');
      body.className = 'ui-skeleton__linhas';

      for (let i = 0; i < 2; i++) {
        const linha = document.createElement('div');
        linha.className = `ui-skeleton ui-skeleton--texto ${animClasse}`;
        body.appendChild(linha);
      }

      card.appendChild(media);
      card.appendChild(header);
      card.appendChild(body);
      this.rootElement.appendChild(card);
      return;
    }

    if (totalLinhas > 1 && variante === 'texto') {
      const containerLinhas = document.createElement('div');
      containerLinhas.className = 'ui-skeleton__linhas';

      for (let i = 0; i < totalLinhas; i++) {
        const linha = document.createElement('div');
        linha.className = `ui-skeleton ui-skeleton--texto ${animClasse}`;
        if (altura) linha.style.height = isNaN(Number(altura)) ? altura : `${altura}px`;
        if (raio) linha.style.borderRadius = isNaN(Number(raio)) ? raio : `${raio}px`;
        containerLinhas.appendChild(linha);
      }

      if (largura) {
        containerLinhas.style.width = isNaN(Number(largura)) ? largura : `${largura}px`;
      }
      this.rootElement.appendChild(containerLinhas);
      return;
    }

    // Item individual
    const el = document.createElement('div');
    el.className = `ui-skeleton ui-skeleton--${variante} ${animClasse}`.trim();

    if (largura) el.style.width = isNaN(Number(largura)) ? largura : `${largura}px`;
    if (altura) el.style.height = isNaN(Number(altura)) ? altura : `${altura}px`;
    if (raio) el.style.borderRadius = isNaN(Number(raio)) ? raio : `${raio}px`;

    this.rootElement.appendChild(el);
  }
}

export class UIEsqueleto extends UISkeleton {}

definirCustomElement('ui-skeleton', UISkeleton);
definirCustomElement('ui-esqueleto', UIEsqueleto);
