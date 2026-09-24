import estilos from './ui-badge.css?inline';
import { ListenerBag } from '../../core/listener-bag';

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
  private listeners = new ListenerBag();

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <span class="ui-badge">
        <slot></slot>
        <span class="ui-badge__label" style="display: none;"></span>
        <span class="ui-badge__close" role="button" tabindex="0" aria-label="Remover" style="display: none;" title="Remover">✕</span>
      </span>
    `;

    this.badgeElement = shadow.querySelector('.ui-badge')!;
    this.labelElement = shadow.querySelector('.ui-badge__label')!;
    this.closeElement = shadow.querySelector('.ui-badge__close')!;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.closeElement, 'click', this.handleRemove);
    this.listeners.add(this.closeElement, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleRemove(e as any);
      }
    });
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
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
