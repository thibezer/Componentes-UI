import estilos from './ui-card.css?inline';

export class UICard extends HTMLElement {
  static get observedAttributes() {
    return [
      'elevacao',
      'elevation',
      'variante',
      'variant',
      'clicavel',
      'clickable',
      'compacto',
      'compact',
      'disabled'
    ];
  }

  private cardElement: HTMLDivElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-card">
        <div class="ui-card__media">
          <slot name="midia"></slot>
          <slot name="media"></slot>
        </div>
        <div class="ui-card__header">
          <slot name="cabecalho"></slot>
          <slot name="header"></slot>
        </div>
        <div class="ui-card__body">
          <slot></slot>
        </div>
        <div class="ui-card__footer">
          <slot name="rodape"></slot>
          <slot name="footer"></slot>
        </div>
      </div>
    `;

    this.cardElement = shadow.querySelector('.ui-card')!;
  }

  connectedCallback() {
    this.cardElement.addEventListener('click', this.handleClick);
    this.syncState();
  }

  disconnectedCallback() {
    this.cardElement.removeEventListener('click', this.handleClick);
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  get clicavel(): boolean {
    return this.hasAttribute('clicavel') || this.hasAttribute('clickable');
  }

  set clicavel(val: boolean) {
    if (val) {
      this.setAttribute('clicavel', '');
    } else {
      this.removeAttribute('clicavel');
      this.removeAttribute('clickable');
    }
    this.syncState();
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(val: boolean) {
    if (val) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
    this.syncState();
  }

  private syncState() {
    const elevacao = this.getAttribute('elevacao') || this.getAttribute('elevation') || 'plano';
    const variante = this.getAttribute('variante') || this.getAttribute('variant') || elevacao;
    const isClicavel = this.clicavel;
    const isCompacto = this.hasAttribute('compacto') || this.hasAttribute('compact');
    const isDisabled = this.disabled;

    this.cardElement.className = 'ui-card';
    this.cardElement.classList.add(`ui-card--${variante}`);

    if (isClicavel) {
      this.cardElement.classList.add('ui-card--clicavel');
      this.cardElement.setAttribute('tabindex', '0');
    } else {
      this.cardElement.removeAttribute('tabindex');
    }

    if (isCompacto) {
      this.cardElement.classList.add('ui-card--compacto');
    }

    if (isDisabled) {
      this.cardElement.classList.add('ui-card--disabled');
    }

    // Ocultar seções de slots se não tiverem elementos atribuídos
    const headerSlot = this.shadowRoot?.querySelector('.ui-card__header') as HTMLElement | null;
    const footerSlot = this.shadowRoot?.querySelector('.ui-card__footer') as HTMLElement | null;
    const mediaSlot = this.shadowRoot?.querySelector('.ui-card__media') as HTMLElement | null;

    if (mediaSlot) {
      const hasMedia = this.querySelector('[slot="midia"], [slot="media"]');
      mediaSlot.style.display = hasMedia ? 'block' : 'none';
    }

    if (headerSlot) {
      const hasHeader = this.querySelector('[slot="cabecalho"], [slot="header"]');
      headerSlot.style.display = hasHeader ? 'flex' : 'none';
    }

    if (footerSlot) {
      const hasFooter = this.querySelector('[slot="rodape"], [slot="footer"]');
      footerSlot.style.display = hasFooter ? 'flex' : 'none';
    }
  }

  private handleClick = (e: MouseEvent) => {
    if (this.disabled) return;
    if (this.clicavel) {
      this.dispatchEvent(
        new CustomEvent('ui-click', {
          detail: {
            id: this.id || 'sem-id'
          },
          bubbles: true,
          composed: true,
        })
      );
    }
  };
}

if (!customElements.get('ui-card')) {
  customElements.define('ui-card', UICard);
}
