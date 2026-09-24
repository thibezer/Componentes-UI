import estilos from './ui-card.css?inline';
import { ListenerBag } from '../../core/listener-bag';

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
  private listeners = new ListenerBag();

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
    this.listeners.cleanup();
    this.listeners.add(this.cardElement, 'click', this.handleClick);
    this.listeners.add(this.cardElement, 'keydown', this.handleKeyDown);
    const slots = this.shadowRoot?.querySelectorAll('slot');
    slots?.forEach(s => this.listeners.add(s, 'slotchange', this.handleSlotChange));
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  private handleSlotChange = () => {
    this.syncState();
  };

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
    const variante = this.getAttribute('variante') || this.getAttribute('variant');
    const isClicavel = this.clicavel;
    const isCompacto = this.hasAttribute('compacto') || this.hasAttribute('compact');
    const isDisabled = this.disabled;

    this.cardElement.className = 'ui-card';
    this.cardElement.classList.add(`ui-card--${elevacao}`);
    if (variante) {
      this.cardElement.classList.add(`ui-card--${variante}`);
    }

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

    const hasSlotContent = (slotNames: string[]) => {
      const selectors = slotNames.map(name => `slot[name="${name}"]`).join(', ');
      const slots = Array.from(this.shadowRoot?.querySelectorAll(selectors) || []) as HTMLSlotElement[];
      return slots.some(s => {
        const nodes = s.assignedNodes({ flatten: true });
        return nodes.some(node => node.nodeType === Node.ELEMENT_NODE || (node.textContent && node.textContent.trim() !== ''));
      }) || slotNames.some(name => this.querySelector(`[slot="${name}"]`) !== null);
    };

    if (mediaSlot) {
      mediaSlot.style.display = hasSlotContent(['midia', 'media']) ? 'block' : 'none';
    }

    if (headerSlot) {
      headerSlot.style.display = hasSlotContent(['cabecalho', 'header']) ? 'flex' : 'none';
    }

    if (footerSlot) {
      footerSlot.style.display = hasSlotContent(['rodape', 'footer']) ? 'flex' : 'none';
    }
  }

  private handleClick = (e?: Event) => {
    if (this.disabled) return;
    if (e && e.target && e.target instanceof HTMLElement) {
      if (e.target.closest('button, a, input, select, textarea, ui-botao, ui-switch, ui-checkbox, ui-radio, [role="button"]')) {
        return;
      }
    }
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
      this.dispatchEvent(
        new CustomEvent('ui-clique', {
          detail: {
            id: this.id || 'sem-id'
          },
          bubbles: true,
          composed: true,
        })
      );
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.clicavel || this.disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick();
    }
  };
}

if (!customElements.get('ui-card')) {
  customElements.define('ui-card', UICard);
}
