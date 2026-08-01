import estilos from './ui-checkbox.css?inline';

export class UICheckbox extends HTMLElement {
  static formAssociated = true;
  private internals: ElementInternals;

  static get observedAttributes() {
    return [
      'marcado',
      'checked',
      'indeterminado',
      'indeterminate',
      'disabled',
      'value',
      'label',
      'posicao-label'
    ];
  }

  private containerElement: HTMLDivElement;
  private boxElement: HTMLSpanElement;
  private markElement: HTMLSpanElement;
  private labelElement: HTMLSpanElement;

  constructor() {
    super();
    this.internals = this.attachInternals();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-checkbox" tabindex="0" role="checkbox" aria-checked="false">
        <span class="ui-checkbox__box">
          <span class="ui-checkbox__mark"></span>
        </span>
        <span class="ui-checkbox__label" style="display: none;"></span>
      </div>
    `;

    this.containerElement = shadow.querySelector('.ui-checkbox')!;
    this.boxElement = shadow.querySelector('.ui-checkbox__box')!;
    this.markElement = shadow.querySelector('.ui-checkbox__mark')!;
    this.labelElement = shadow.querySelector('.ui-checkbox__label')!;
  }

  connectedCallback() {
    this.containerElement.addEventListener('click', this.handleClick);
    this.containerElement.addEventListener('keydown', this.handleKeyDown);
    this.containerElement.addEventListener('focus', this.handleFocus);
    this.containerElement.addEventListener('blur', this.handleBlur);
    this.syncState();
  }

  disconnectedCallback() {
    this.containerElement.removeEventListener('click', this.handleClick);
    this.containerElement.removeEventListener('keydown', this.handleKeyDown);
    this.containerElement.removeEventListener('focus', this.handleFocus);
    this.containerElement.removeEventListener('blur', this.handleBlur);
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  get marcado(): boolean {
    return this.hasAttribute('marcado') || this.hasAttribute('checked');
  }

  set marcado(val: boolean) {
    if (val) {
      this.setAttribute('marcado', '');
    } else {
      this.removeAttribute('marcado');
      this.removeAttribute('checked');
    }
    this.syncState();
  }

  get indeterminado(): boolean {
    return this.hasAttribute('indeterminado') || this.hasAttribute('indeterminate');
  }

  set indeterminado(val: boolean) {
    if (val) {
      this.setAttribute('indeterminado', '');
    } else {
      this.removeAttribute('indeterminado');
      this.removeAttribute('indeterminate');
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

  public alternar() {
    if (this.disabled) return;
    if (this.indeterminado) {
      this.indeterminado = false;
      this.marcado = true;
    } else {
      this.marcado = !this.marcado;
    }

    this.dispatchEvent(
      new CustomEvent('ui-change', {
        detail: {
          marcado: this.marcado,
          indeterminado: this.indeterminado,
          value: this.getAttribute('value') || ''
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private syncState() {
    const isChecked = this.marcado;
    const isIndeterminate = this.indeterminado;
    const isDisabled = this.disabled;
    const labelText = this.getAttribute('label');
    const posicaoLabel = this.getAttribute('posicao-label') || 'direita';

    // Acessibilidade
    this.containerElement.setAttribute(
      'aria-checked',
      isIndeterminate ? 'mixed' : String(isChecked)
    );

    if (isDisabled) {
      this.containerElement.classList.add('ui-checkbox--disabled');
      this.containerElement.setAttribute('tabindex', '-1');
      this.containerElement.setAttribute('aria-disabled', 'true');
    } else {
      this.containerElement.classList.remove('ui-checkbox--disabled');
      this.containerElement.setAttribute('tabindex', '0');
      this.containerElement.removeAttribute('aria-disabled');
    }

    // Classes de estado
    if (isChecked) {
      this.containerElement.classList.add('ui-checkbox--checked');
    } else {
      this.containerElement.classList.remove('ui-checkbox--checked');
    }

    if (isIndeterminate) {
      this.containerElement.classList.add('ui-checkbox--indeterminate');
    } else {
      this.containerElement.classList.remove('ui-checkbox--indeterminate');
    }

    if (posicaoLabel === 'esquerda') {
      this.containerElement.classList.add('ui-checkbox--label-esquerda');
    } else {
      this.containerElement.classList.remove('ui-checkbox--label-esquerda');
    }

    // Marca visual (Check ou Indeterminado)
    if (isIndeterminate) {
      this.markElement.innerHTML = `
        <svg viewBox="0 0 24 24">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      `;
    } else if (isChecked) {
      this.markElement.innerHTML = `
        <svg viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    } else {
      this.markElement.innerHTML = '';
    }

    // Rótulo
    if (labelText) {
      this.labelElement.textContent = labelText;
      this.labelElement.style.display = 'inline';
    } else {
      this.labelElement.style.display = 'none';
    }

    if (isChecked) {
      this.internals.setFormValue(this.getAttribute('value') || 'on');
    } else {
      this.internals.setFormValue(null);
    }
  }

  formResetCallback() {
    this.marcado = this.hasAttribute('checked');
    this.indeterminado = this.hasAttribute('indeterminate');
  }

  private handleClick = (e: MouseEvent) => {
    e.preventDefault();
    this.alternar();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.alternar();
    }
  };

  private handleFocus = () => {
    this.containerElement.classList.add('ui-checkbox--foco');
  };

  private handleBlur = () => {
    this.containerElement.classList.remove('ui-checkbox--foco');
  };
}

if (!customElements.get('ui-checkbox')) {
  customElements.define('ui-checkbox', UICheckbox);
}
