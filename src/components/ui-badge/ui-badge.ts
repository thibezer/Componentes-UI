import estilos from './ui-badge.css?inline';
import { ListenerBag } from '../../core/listener-bag';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { escolherOpcao } from '../../core/opcoes';

const VARIANTES = ['neutro', 'primaria', 'sucesso', 'erro', 'alerta', 'info'] as const;
const ESTILOS = ['suave', 'solido', 'contornado'] as const;

export class UIBadge extends SafeHTMLElement {
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
      <span class="ui-badge" part="base">
        <slot></slot>
        <span class="ui-badge__label" part="rotulo" style="display: none;"></span>
        <span class="ui-badge__close" part="remover" role="button" tabindex="0" aria-label="Remover" style="display: none;" title="Remover">✕</span>
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
        this.handleRemove(e);
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
    const variante = escolherOpcao(this.getAttribute('variante') || this.getAttribute('variant'), VARIANTES, 'neutro');
    const estilo = escolherOpcao(this.getAttribute('estilo'), ESTILOS, 'suave');
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
      // o nome identifica o item removido; desabilitado sai da ordem de Tab
      const alvo = labelText || this.getAttribute('value') || this.textContent?.trim() || '';
      this.closeElement.setAttribute('aria-label', alvo ? `Remover ${alvo}` : 'Remover');
      if (this.disabled) {
        this.closeElement.setAttribute('tabindex', '-1');
        this.closeElement.setAttribute('aria-disabled', 'true');
      } else {
        this.closeElement.setAttribute('tabindex', '0');
        this.closeElement.removeAttribute('aria-disabled');
      }
    } else {
      this.closeElement.style.display = 'none';
    }
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(val: boolean) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  private handleRemove = (e: Event) => {
    e.stopPropagation();
    if (this.disabled) return;
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

definirCustomElement('ui-badge', UIBadge);
definirCustomElement('ui-chip', UIChip);
definirCustomElement('ui-tag', UITag);
