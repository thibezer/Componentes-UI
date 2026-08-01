import estilos from './ui-switch.css?inline';

export class UISwitch extends HTMLElement {
  static get observedAttributes() {
    return [
      'ativo',
      'ligado',
      'checked',
      'disabled',
      'tamanho',
      'size',
      'label',
      'posicao-label',
      'value'
    ];
  }

  private containerElement: HTMLDivElement;
  private trackElement: HTMLSpanElement;
  private thumbElement: HTMLSpanElement;
  private labelElement: HTMLSpanElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-switch" tabindex="0" role="switch" aria-checked="false">
        <span class="ui-switch__track">
          <span class="ui-switch__thumb"></span>
        </span>
        <span class="ui-switch__label" style="display: none;"></span>
      </div>
    `;

    this.containerElement = shadow.querySelector('.ui-switch')!;
    this.trackElement = shadow.querySelector('.ui-switch__track')!;
    this.thumbElement = shadow.querySelector('.ui-switch__thumb')!;
    this.labelElement = shadow.querySelector('.ui-switch__label')!;
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

  get ativo(): boolean {
    return this.hasAttribute('ativo') || this.hasAttribute('ligado') || this.hasAttribute('checked');
  }

  set ativo(val: boolean) {
    if (val) {
      this.setAttribute('ativo', '');
    } else {
      this.removeAttribute('ativo');
      this.removeAttribute('ligado');
      this.removeAttribute('checked');
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
    this.ativo = !this.ativo;

    this.dispatchEvent(
      new CustomEvent('ui-change', {
        detail: {
          ativo: this.ativo,
          value: this.getAttribute('value') || ''
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private syncState() {
    const isChecked = this.ativo;
    const isDisabled = this.disabled;
    const tamanho = this.getAttribute('tamanho') || this.getAttribute('size') || 'md';
    const labelText = this.getAttribute('label');
    const posicaoLabel = this.getAttribute('posicao-label') || 'direita';

    // Acessibilidade
    this.containerElement.setAttribute('aria-checked', String(isChecked));

    if (isDisabled) {
      this.containerElement.classList.add('ui-switch--disabled');
      this.containerElement.setAttribute('tabindex', '-1');
      this.containerElement.setAttribute('aria-disabled', 'true');
    } else {
      this.containerElement.classList.remove('ui-switch--disabled');
      this.containerElement.setAttribute('tabindex', '0');
      this.containerElement.removeAttribute('aria-disabled');
    }

    // Classes de estado
    if (isChecked) {
      this.containerElement.classList.add('ui-switch--checked');
    } else {
      this.containerElement.classList.remove('ui-switch--checked');
    }

    // Tamanho (sm, md, lg)
    this.containerElement.classList.remove('ui-switch--sm', 'ui-switch--md', 'ui-switch--lg');
    if (['sm', 'md', 'lg'].includes(tamanho)) {
      this.containerElement.classList.add(`ui-switch--${tamanho}`);
    } else {
      this.containerElement.classList.add('ui-switch--md');
    }

    // Posição do Rótulo
    if (posicaoLabel === 'esquerda') {
      this.containerElement.classList.add('ui-switch--label-esquerda');
    } else {
      this.containerElement.classList.remove('ui-switch--label-esquerda');
    }

    // Rótulo
    if (labelText) {
      this.labelElement.textContent = labelText;
      this.labelElement.style.display = 'inline';
    } else {
      this.labelElement.style.display = 'none';
    }
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
    this.containerElement.classList.add('ui-switch--foco');
  };

  private handleBlur = () => {
    this.containerElement.classList.remove('ui-switch--foco');
  };
}

export class UIToggle extends UISwitch {}

if (!customElements.get('ui-switch')) {
  customElements.define('ui-switch', UISwitch);
}

if (!customElements.get('ui-toggle')) {
  customElements.define('ui-toggle', UIToggle);
}
