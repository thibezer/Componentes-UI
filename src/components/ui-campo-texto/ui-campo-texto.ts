import { criarTemplateCampoTexto, ATRIBUTOS_OBSERVADOS_CAMPO_TEXTO } from './campo-texto-template';
import {
  sincronizarLabelEPlaceholder,
  sincronizarIconeSenha,
  sincronizarFeedbackErro
} from './campo-texto-estados';
import { definirCustomElement } from '../../core/ssr-safe';
import { FormAssociatedElement } from '../../core/form-associated-element';
import { validarRestricoesCampoTexto, aplicarValidadeInternals } from '../../core/form-validacao';

export class UICampoTexto extends FormAssociatedElement {
  static get observedAttributes() {
    return ATRIBUTOS_OBSERVADOS_CAMPO_TEXTO;
  }

  private labelElement: HTMLLabelElement;
  private wrapperElement: HTMLDivElement;
  private inputElement: HTMLInputElement;
  private helperElement: HTMLDivElement;
  private rightIconContainer: HTMLSpanElement;
  private leftSlotElement: HTMLSlotElement;

  private _senhaVisivel: boolean = false;
  private _checkTimer: any = null;
  private _focado: boolean = false;
  private _inputId: string;
  private _defaultValue: string = '';

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    shadow.innerHTML = criarTemplateCampoTexto();

    this.labelElement = shadow.querySelector('.ui-campo-texto__label')!;
    this.wrapperElement = shadow.querySelector('.ui-campo-texto__wrapper')!;
    this.inputElement = shadow.querySelector('.ui-campo-texto__input')!;
    this.helperElement = shadow.querySelector('.ui-campo-texto__helper')!;
    this.rightIconContainer = shadow.querySelector('.ui-campo-texto__icone--direita')!;
    this.leftSlotElement = shadow.querySelector('slot[name="icone-esquerda"]')!;
    
    this._inputId = `ui-input-${Math.random().toString(36).substring(2, 9)}`;
    this.inputElement.id = this._inputId;
    this.labelElement.htmlFor = this._inputId;
    this.helperElement.id = `${this._inputId}-helper`;
    this.inputElement.setAttribute('aria-describedby', `${this._inputId}-helper`);
  }

  public override focus(options?: FocusOptions) {
    this.inputElement.focus(options);
  }

  public override blur() {
    this.inputElement.blur();
  }

  connectedCallback() {
    this.inputElement.addEventListener('input', this.handleInput);
    this.inputElement.addEventListener('change', this.handleChange);
    this.inputElement.addEventListener('focus', this.handleFocus);
    this.inputElement.addEventListener('blur', this.handleBlur);
    this.rightIconContainer.addEventListener('click', this.handleRightIconClick);
    this.rightIconContainer.addEventListener('keydown', this.handleRightIconKeyDown);
    this.leftSlotElement.addEventListener('slotchange', this.handleSlotChange);

    this._defaultValue = this.getAttribute('value') || '';
    if (this.hasAttribute('value') && !this.inputElement.value) {
      this.inputElement.value = this._defaultValue;
    }

    this.syncState();
    this._checkTimer = setTimeout(() => this.syncState(), 100);
  }

  disconnectedCallback() {
    this.inputElement.removeEventListener('input', this.handleInput);
    this.inputElement.removeEventListener('change', this.handleChange);
    this.inputElement.removeEventListener('focus', this.handleFocus);
    this.inputElement.removeEventListener('blur', this.handleBlur);
    this.rightIconContainer.removeEventListener('click', this.handleRightIconClick);
    this.rightIconContainer.removeEventListener('keydown', this.handleRightIconKeyDown);
    this.leftSlotElement.removeEventListener('slotchange', this.handleSlotChange);

    if (this._checkTimer) clearTimeout(this._checkTimer);
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'value' && value !== this.inputElement.value && !this._focado) {
      this.inputElement.value = value || '';
    }
    this.syncState();
  }

  get value(): string {
    return this.inputElement ? this.inputElement.value : (this.getAttribute('value') || '');
  }

  set value(val: string) {
    this.setAttribute('value', val);
    if (this.inputElement) {
      try {
        this.inputElement.value = val;
      } catch {
        // Ignora caso valor viole formato restrito de input nativo
      }
    }
    this.syncState();
  }

  // === Ciclo de Vida Form-Associated Custom Elements (W3C FACE) ===
  public formResetCallback(): void {
    this.inputElement.value = this._defaultValue;
    this.internals?.setFormValue(this._defaultValue);
    this.syncState();
  }

  public formStateRestoreCallback(state: any, _mode: 'restore' | 'autocomplete'): void {
    if (typeof state === 'string') {
      this.value = state;
    }
  }

  get name(): string {
    return this.getAttribute('name') || '';
  }

  set name(val: string) {
    this.setAttribute('name', val);
  }

  get type(): string {
    return this.getAttribute('tipo') || this.getAttribute('type') || 'text';
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  set disabled(val: boolean) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get minLength(): number {
    const val = this.getAttribute('minlength') ?? this.getAttribute('min-length');
    return val ? parseInt(val, 10) : -1;
  }

  set minLength(val: number) {
    if (val >= 0) this.setAttribute('minlength', String(val));
    else this.removeAttribute('minlength');
    this.syncState();
  }

  get maxLength(): number {
    const val = this.getAttribute('maxlength') ?? this.getAttribute('max-length');
    return val ? parseInt(val, 10) : -1;
  }

  set maxLength(val: number) {
    if (val >= 0) this.setAttribute('maxlength', String(val));
    else this.removeAttribute('maxlength');
    this.syncState();
  }

  get pattern(): string {
    return this.getAttribute('pattern') || '';
  }

  set pattern(val: string) {
    if (val) this.setAttribute('pattern', val);
    else this.removeAttribute('pattern');
    this.syncState();
  }

  public atualizarValidade(): void {
    const minLenStr = this.getAttribute('minlength') ?? this.getAttribute('min-length');
    const maxLenStr = this.getAttribute('maxlength') ?? this.getAttribute('max-length');
    const minStr = this.getAttribute('min');
    const maxStr = this.getAttribute('max');

    const inputVal = this.inputElement ? this.inputElement.value : '';
    const rawVal = this.getAttribute('value') || inputVal;
    const isBadInput = Boolean(this.inputElement?.validity?.badInput);

    const resultado = validarRestricoesCampoTexto({
      val: inputVal,
      rawVal,
      badInput: isBadInput,
      disabled: this.disabled,
      required: this.required,
      tipo: this.type,
      minlength: minLenStr !== null ? parseInt(minLenStr, 10) : null,
      maxlength: maxLenStr !== null ? parseInt(maxLenStr, 10) : null,
      min: minStr !== null ? parseFloat(minStr) : null,
      max: maxStr !== null ? parseFloat(maxStr) : null,
      step: this.getAttribute('step'),
      pattern: this.getAttribute('pattern'),
      customError: this._customErrorMessage,
      mensagemValidacao: this.getAttribute('mensagem-validacao')
    });

    aplicarValidadeInternals(this.internals, resultado, this.inputElement);
  }

  public alternarVisibilidadeSenha() {
    const isPasswordType = this.getAttribute('tipo') === 'password' || this._senhaVisivel;
    if (!isPasswordType) return;

    this._senhaVisivel = !this._senhaVisivel;
    this.inputElement.type = this._senhaVisivel ? 'text' : 'password';

    const slotEl = this.shadowRoot?.querySelector('slot[name="icone-direita"]') as HTMLSlotElement;
    if (slotEl) {
      const assigned = slotEl.assignedElements();
      assigned.forEach(el => {
        if (el.textContent?.trim() === '👁️' || el.textContent?.trim() === '🙈') {
          el.textContent = this._senhaVisivel ? '🙈' : '👁️';
        }
      });
    }

    this.dispatchEvent(
      new CustomEvent('ui-toggle-senha', {
        detail: { visivel: this._senhaVisivel },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleSlotChange = () => {
    this.syncState();
  };

  protected syncState() {
    const temIconeEsquerda = this.leftSlotElement.assignedNodes().length > 0 || this.querySelector('[slot="icone-esquerda"]') !== null;
    if (temIconeEsquerda) {
      this.setAttribute('tem-icone-esquerda', '');
    } else {
      this.removeAttribute('tem-icone-esquerda');
    }

    const altura = this.getAttribute('altura') || this.getAttribute('height');
    if (altura) {
      this.style.setProperty('--ui-campo-altura', isNaN(Number(altura)) ? altura : `${altura}px`);
    } else {
      this.style.removeProperty('--ui-campo-altura');
    }

    sincronizarLabelEPlaceholder({
      labelElement: this.labelElement,
      inputElement: this.inputElement,
      labelText: this.getAttribute('label'),
      placeholderText: this.getAttribute('placeholder') || '',
      isFlutuante: this.hasAttribute('label-flutuante'),
      estaFocado: this._focado,
      obrigatorio: this.required
    });

    const tipoBase = this.getAttribute('tipo') || this.getAttribute('type') || 'text';
    if (!this._senhaVisivel) {
      try {
        this.inputElement.type = tipoBase;
      } catch {
        this.inputElement.type = 'text';
      }
    }

    const minLen = this.getAttribute('minlength') ?? this.getAttribute('min-length');
    if (minLen !== null) this.inputElement.minLength = parseInt(minLen, 10);
    else this.inputElement.removeAttribute('minlength');

    const maxLen = this.getAttribute('maxlength') ?? this.getAttribute('max-length');
    if (maxLen !== null) this.inputElement.maxLength = parseInt(maxLen, 10);
    else this.inputElement.removeAttribute('maxlength');

    const patternVal = this.getAttribute('pattern');
    if (patternVal !== null) this.inputElement.pattern = patternVal;
    else this.inputElement.removeAttribute('pattern');

    this.internals.setFormValue(this.inputElement.value);

    const isDisabled = this.hasAttribute('disabled') || this._formDisabled;
    const isReadonly = this.hasAttribute('readonly');
    this.inputElement.disabled = isDisabled;
    this.inputElement.readOnly = isReadonly;

    if (isDisabled) {
      this.wrapperElement.classList.add('ui-campo-texto__wrapper--disabled');
    } else {
      this.wrapperElement.classList.remove('ui-campo-texto__wrapper--disabled');
    }

    const ehSenhaOuAlternar = tipoBase === 'password' || this.hasAttribute('alternar-senha');
    sincronizarIconeSenha(this.rightIconContainer, ehSenhaOuAlternar, this._senhaVisivel);

    const temErro = this.hasAttribute('erro') || this.hasAttribute('mensagem-erro');
    sincronizarFeedbackErro(
      this.wrapperElement,
      this.inputElement,
      this.helperElement,
      temErro,
      this.getAttribute('mensagem-erro'),
      this.getAttribute('helper-text')
    );

    this.atualizarValidade();
  }

  private handleRightIconClick = (e: MouseEvent) => {
    const tipoBase = this.getAttribute('tipo');
    if (tipoBase === 'password' || this.hasAttribute('alternar-senha')) {
      e.stopPropagation();
      this.alternarVisibilidadeSenha();
    }
  };

  private handleRightIconKeyDown = (e: KeyboardEvent) => {
    const tipoBase = this.getAttribute('tipo');
    if (tipoBase === 'password' || this.hasAttribute('alternar-senha')) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        this.alternarVisibilidadeSenha();
      }
    }
  };

  private handleFocus = () => {
    this._focado = true;
    this.wrapperElement.classList.add('ui-campo-texto__wrapper--foco');
    this.syncState();
  };

  private handleBlur = () => {
    this._focado = false;
    this.wrapperElement.classList.remove('ui-campo-texto__wrapper--foco');
    this.syncState();
  };

  private handleInput = (e: Event) => {
    e.stopPropagation();
    const val = (e.target as HTMLInputElement).value;
    this.internals.setFormValue(val);
    this.syncState();

    this.dispatchEvent(
      new CustomEvent('ui-input', {
        detail: { value: val },
        bubbles: true,
        composed: true,
      })
    );

    this.dispatchEvent(
      new Event('input', {
        bubbles: true,
        composed: true,
      })
    );
  };

  private handleChange = (e: Event) => {
    e.stopPropagation();
    const val = (e.target as HTMLInputElement).value;
    this.internals.setFormValue(val);
    this.syncState();
    this.dispatchEvent(
      new CustomEvent('ui-change', {
        detail: { value: val },
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
  };
}

definirCustomElement('ui-campo-texto', UICampoTexto);

export * from './campo-texto-estados';
export * from './campo-texto-template';
