import estilos from './ui-switch.css?inline';
import { ListenerBag } from '../../core/listener-bag';
import { definirCustomElement } from '../../core/ssr-safe';
import { FormAssociatedElement } from '../../core/form-associated-element';
import { gerarIdUnico, obterRotuloExterno, cliqueVeioDeRotuloExterno } from '../../core/acessibilidade';

export class UISwitch extends FormAssociatedElement {
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
      'value',
      'name',
      'obrigatorio',
      'required',
      'mensagem-validacao',
      'aria-label'
    ];
  }

  private containerElement: HTMLDivElement;
  private labelElement: HTMLSpanElement;
  private labelId: string;
  private listeners = new ListenerBag();
  private _defaultChecked: boolean = false;

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
    this.labelElement = shadow.querySelector('.ui-switch__label')!;

    // Associação rótulo ↔ controle gerada internamente: o consumidor não gerencia IDs
    this.labelId = gerarIdUnico('ui-switch-label');
    this.labelElement.id = this.labelId;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.containerElement, 'click', this.handleClick);
    this.listeners.add(this.containerElement, 'keydown', this.handleKeyDown);
    this.listeners.add(this.containerElement, 'focus', this.handleFocus);
    this.listeners.add(this.containerElement, 'blur', this.handleBlur);
    this.listeners.add(this, 'click', this.handleHostClick);
    this._defaultChecked = this.hasAttribute('ativo') || this.hasAttribute('ligado') || this.hasAttribute('checked');
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
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

  get checked(): boolean {
    return this.ativo;
  }

  set checked(val: boolean) {
    this.ativo = val;
  }

  get value(): string {
    return this.getAttribute('value') || 'on';
  }

  set value(val: string) {
    this.setAttribute('value', val);
    this.syncState();
  }

  get name(): string {
    return this.getAttribute('name') || '';
  }

  set name(val: string) {
    this.setAttribute('name', val);
    this.syncState();
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  set disabled(val: boolean) {
    if (val) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
    this.syncState();
  }

  get type(): string {
    return 'checkbox';
  }

  public atualizarValidade(): void {
    if (!this.internals || typeof this.internals.setValidity !== 'function') return;

    if (this.disabled) {
      this.internals.setValidity({});
      return;
    }

    if (this._customErrorMessage) {
      this.internals.setValidity({ customError: true }, this._customErrorMessage, this.containerElement);
      return;
    }

    const isRequired = this.hasAttribute('obrigatorio') || this.hasAttribute('required');
    if (isRequired && !this.ativo) {
      const msg = this.getAttribute('mensagem-validacao') || 'Ative este interruptor para continuar.';
      this.internals.setValidity({ valueMissing: true }, msg, this.containerElement);
      return;
    }

    this.internals.setValidity({});
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

    this.dispatchEvent(
      new Event('change', {
        bubbles: true,
        composed: true,
      })
    );
  }

  protected syncState() {
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

    // Rótulo (visível via atributo `label` ou externo via aria-label / <label for> / <label> envolvente)
    if (labelText) {
      this.labelElement.textContent = labelText;
      this.labelElement.style.display = 'inline';
      this.containerElement.setAttribute('aria-labelledby', this.labelId);
      this.containerElement.removeAttribute('aria-label');
    } else {
      this.labelElement.style.display = 'none';
      this.containerElement.removeAttribute('aria-labelledby');
      const rotuloExterno = obterRotuloExterno(this, this.internals);
      if (rotuloExterno) {
        this.containerElement.setAttribute('aria-label', rotuloExterno);
      } else {
        this.containerElement.removeAttribute('aria-label');
      }
    }

    if (isChecked) {
      this.internals.setFormValue(this.getAttribute('value') || 'on');
    } else {
      this.internals.setFormValue(null);
    }

    this.atualizarValidade();
  }

  // === Ciclo de Vida Form-Associated Custom Elements (W3C FACE) ===
  public formResetCallback(): void {
    this.ativo = this._defaultChecked;
    this.syncState();
  }

  public formStateRestoreCallback(state: any, _mode: 'restore' | 'autocomplete'): void {
    if (typeof state === 'string') {
      this.ativo = state === (this.getAttribute('value') || 'on');
    } else if (typeof state === 'boolean') {
      this.ativo = state;
    }
    this.syncState();
  }

  private handleClick = (e: MouseEvent) => {
    e.preventDefault();
    this.alternar();
  };

  private handleHostClick = (e: MouseEvent) => {
    // Clique em <label> externo associado ao host: alterna como um checkbox nativo
    if (cliqueVeioDeRotuloExterno(this, e)) {
      this.alternar();
      this.containerElement.focus();
    }
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

definirCustomElement('ui-switch', UISwitch);
definirCustomElement('ui-toggle', UIToggle);
