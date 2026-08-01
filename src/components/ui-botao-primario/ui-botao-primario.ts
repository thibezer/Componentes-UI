import estilos from './ui-botao-primario.css?inline';

export type VarianteBotao = 
  | 'primary' | 'primario'
  | 'secondary' | 'secundario'
  | 'ghost' | 'terciario'
  | 'destructive' | 'destrutivo' | 'erro'
  | 'icon-only' | 'icone'
  | 'destaque';

export class UIBotaoPrimario extends HTMLElement {
  static get observedAttributes() {
    return ['disabled', 'variante', 'carregando', 'loading', 'estado'];
  }

  private button: HTMLButtonElement;
  private spinnerContainer: HTMLSpanElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <button class="ui-botao-primario" type="button">
        <span class="ui-botao-primario__spinner-container" style="display: none;">
          <svg class="ui-botao-primario__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2 a 10 10 0 0 1 10 10"></path>
          </svg>
        </span>
        <slot></slot>
      </button>
    `;
    this.button = shadow.querySelector('button')!;
    this.spinnerContainer = shadow.querySelector('.ui-botao-primario__spinner-container')!;
  }

  connectedCallback() {
    this.button.addEventListener('click', this.handleClick);
    this.syncState();
  }

  disconnectedCallback() {
    this.button.removeEventListener('click', this.handleClick);
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  get carregando(): boolean {
    return this.hasAttribute('carregando') || this.hasAttribute('loading');
  }

  set carregando(val: boolean) {
    if (val) {
      this.setAttribute('carregando', '');
    } else {
      this.removeAttribute('carregando');
      this.removeAttribute('loading');
    }
  }

  private syncState() {
    const isCarregando = this.carregando;
    const isDisabled = this.hasAttribute('disabled') || isCarregando;
    const variante = this.getAttribute('variante') || 'primario';
    const estadoForcado = this.getAttribute('estado');

    this.button.disabled = isDisabled;
    this.spinnerContainer.style.display = isCarregando ? 'inline-flex' : 'none';

    const classes = ['ui-botao-primario', `ui-botao-primario--${variante}`];

    if (isDisabled && !isCarregando) {
      classes.push('ui-botao-primario--disabled');
    }

    if (isCarregando) {
      classes.push('ui-botao-primario--carregando');
    }

    if (estadoForcado) {
      classes.push(`ui-botao-primario--${estadoForcado}`);
    }

    this.button.className = classes.join(' ');
  }

  private handleClick = (e: MouseEvent) => {
    if (this.hasAttribute('disabled') || this.carregando) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    this.dispatchEvent(new CustomEvent('ui-click', { detail: { originalEvent: e }, bubbles: true, composed: true }));
  };
}

if (!customElements.get('ui-botao-primario')) {
  customElements.define('ui-botao-primario', UIBotaoPrimario);
}
