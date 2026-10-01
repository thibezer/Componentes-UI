import estilos from './ui-checkbox.css?inline';
import { ListenerBag } from '../../core/listener-bag';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

export class UICheckbox extends SafeHTMLElement {
  static formAssociated = true;
  private internals: ReturnType<HTMLElement['attachInternals']>;

  static get observedAttributes() {
    return [
      'marcado',
      'checked',
      'indeterminado',
      'indeterminate',
      'disabled',
      'value',
      'label',
      'posicao-label',
      'name',
      'obrigatorio',
      'required',
      'mensagem-validacao'
    ];
  }

  private containerElement: HTMLDivElement;
  private markElement: HTMLSpanElement;
  private labelElement: HTMLSpanElement;
  private listeners = new ListenerBag();
  private _defaultChecked: boolean = false;
  private _defaultIndeterminate: boolean = false;
  private _formDisabled: boolean = false;
  private _customErrorMessage: string = '';

  constructor() {
    super();
    this.internals = typeof this.attachInternals === 'function' ? this.attachInternals() : ({} as any);
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
    this.markElement = shadow.querySelector('.ui-checkbox__mark')!;
    this.labelElement = shadow.querySelector('.ui-checkbox__label')!;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.containerElement, 'click', this.handleClick);
    this.listeners.add(this.containerElement, 'keydown', this.handleKeyDown);
    this.listeners.add(this.containerElement, 'focus', this.handleFocus);
    this.listeners.add(this.containerElement, 'blur', this.handleBlur);
    this._defaultChecked = this.hasAttribute('marcado') || this.hasAttribute('checked');
    this._defaultIndeterminate = this.hasAttribute('indeterminado') || this.hasAttribute('indeterminate');
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
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

  get checked(): boolean {
    return this.marcado;
  }

  set checked(val: boolean) {
    this.marcado = val;
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

  get form(): HTMLFormElement | null {
    return this.closest('form') ?? this.internals?.form ?? null;
  }

  get type(): string {
    return 'checkbox';
  }

  get required(): boolean {
    return this.hasAttribute('obrigatorio') || this.hasAttribute('required');
  }

  set required(val: boolean) {
    if (val) this.setAttribute('obrigatorio', '');
    else {
      this.removeAttribute('obrigatorio');
      this.removeAttribute('required');
    }
    this.syncState();
  }

  get obrigatorio(): boolean {
    return this.required;
  }

  set obrigatorio(val: boolean) {
    this.required = val;
  }

  get validity(): ValidityState | undefined {
    this.atualizarValidade();
    return this.internals?.validity;
  }

  get validationMessage(): string {
    this.atualizarValidade();
    return this.internals?.validationMessage ?? '';
  }

  get willValidate(): boolean {
    return this.internals?.willValidate ?? false;
  }

  public checkValidity(): boolean {
    this.atualizarValidade();
    return this.internals?.checkValidity?.() ?? true;
  }

  public reportValidity(): boolean {
    this.atualizarValidade();
    return this.internals?.reportValidity?.() ?? true;
  }

  public setCustomValidity(error: string): void {
    this._customErrorMessage = error || '';
    this.atualizarValidade();
  }

  private atualizarValidade(): void {
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
    if (isRequired && !this.marcado) {
      const msg = this.getAttribute('mensagem-validacao') || 'Marque esta caixa para continuar.';
      this.internals.setValidity({ valueMissing: true }, msg, this.containerElement);
      return;
    }

    this.internals.setValidity({});
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

    this.dispatchEvent(
      new Event('change', {
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

    this.atualizarValidade();
  }

  // === Ciclo de Vida Form-Associated Custom Elements (W3C FACE) ===
  public formDisabledCallback(disabled: boolean): void {
    this._formDisabled = disabled;
    this.syncState();
  }

  public formResetCallback(): void {
    this.marcado = this._defaultChecked;
    this.indeterminado = this._defaultIndeterminate;
    this.syncState();
  }

  public formStateRestoreCallback(state: any, _mode: 'restore' | 'autocomplete'): void {
    if (typeof state === 'string') {
      this.marcado = state === (this.getAttribute('value') || 'on');
    } else if (typeof state === 'boolean') {
      this.marcado = state;
    }
    this.syncState();
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

definirCustomElement('ui-checkbox', UICheckbox);
