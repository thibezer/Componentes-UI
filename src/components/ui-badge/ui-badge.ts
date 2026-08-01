import estilos from './ui-badge.css?inline';

export class UIBadge extends HTMLElement {
  static get observedAttributes() {
    return [
      'variante',
      'variant',
      'estilo',
      'removivel',
      'removable',
      'disabled',
      'label',
      'value'
    ];
  }

  private badgeElement: HTMLSpanElement;
  private labelElement: HTMLSpanElement;
  private closeElement: HTMLSpanElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <span class="ui-badge">
        <slot></slot>
        <span class="ui-badge__label" style="display: none;"></span>
        <span class="ui-badge__close" style="display: none;" title="Remover">✕</span>
      </span>
    `;

    this.badgeElement = shadow.querySelector('.ui-badge')!;
    this.labelElement = shadow.querySelector('.ui-badge__label')!;
    this.closeElement = shadow.querySelector('.ui-badge__close')!;
  }

  connectedCallback() {
    this.closeElement.addEventListener('click', this.handleRemove);
    this.syncState();
  }

  disconnectedCallback() {
    this.closeElement.removeEventListener('click', this.handleRemove);
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  get removivel(): boolean {
    return this.hasAttribute('removivel') || this.hasAttribute('removable');
  }

  set removivel(val: boolean) {
    if (val) {
      this.setAttribute('removivel', '');
    } else {
      this.removeAttribute('removivel');
      this.removeAttribute('removable');
    }
    this.syncState();
  }

  private syncState() {
    const variante = this.getAttribute('variante') || this.getAttribute('variant') || 'neutro';
    const estilo = this.getAttribute('estilo') || 'suave';
    const labelText = this.getAttribute('label');
    const isRemovivel = this.removivel;

    // Reset de classes
    this.badgeElement.className = 'ui-badge';
    this.badgeElement.classList.add(`ui-badge--${variante}`);
    this.badgeElement.classList.add(`ui-badge--${estilo}`);

    // Rótulo por atributo (se fornecido)
    if (labelText) {
      this.labelElement.textContent = labelText;
      this.labelElement.style.display = 'inline';
    } else {
      this.labelElement.style.display = 'none';
    }

    // Botão de fechar/remover
    if (isRemovivel) {
      this.closeElement.style.display = 'inline-flex';
    } else {
      this.closeElement.style.display = 'none';
    }
  }

  private handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('ui-remove', {
        detail: {
          value: this.getAttribute('value') || this.textContent?.trim() || ''
        },
        bubbles: true,
        composed: true,
      })
    );
  };
}

export class UIChip extends UIBadge {}
export class UITag extends UIBadge {}

if (!customElements.get('ui-badge')) {
  customElements.define('ui-badge', UIBadge);
}

if (!customElements.get('ui-chip')) {
  customElements.define('ui-chip', UIChip);
}

if (!customElements.get('ui-tag')) {
  customElements.define('ui-tag', UITag);
}
