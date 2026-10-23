import { criarTemplateCampoTexto, ATRIBUTOS_OBSERVADOS_CAMPO_TEXTO } from './campo-texto-template';
import {
  sincronizarLabelEPlaceholder,
  sincronizarIconeSenha,
  sincronizarFeedbackErro
} from './campo-texto-estados';
import { definirCustomElement } from '../../core/ssr-safe';
import { aplicarAlturaControle } from '../../core/altura-controle';
import { ListenerBag } from '../../core/listener-bag';
import { inteiroOuNulo } from '../../core/opcoes';
import { gerarIdUnico, obterRotuloExterno, cliqueVeioDeRotuloExterno } from '../../core/acessibilidade';
import { FormAssociatedElement } from '../../core/form-associated-element';
import { validarRestricoesCampoTexto, aplicarValidadeInternals } from '../../core/form-validacao';
import { submeterImplicitamente } from '../../core/form-submissao';

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
  private listeners = new ListenerBag();
  private _checkTimer: ReturnType<typeof setTimeout> | null = null;
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
    
    // Associação label ↔ input nativo gerada internamente: o consumidor não gerencia IDs
    this._inputId = gerarIdUnico('ui-input');
    this.inputElement.id = this._inputId;
    this.labelElement.htmlFor = this._inputId;
    this.helperElement.id = `${this._inputId}-helper`;
  }

  public override focus(options?: FocusOptions) {
    this.inputElement.focus(options);
  }

  public override blur() {
    this.inputElement.blur();
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.inputElement, 'input', this.handleInput);
    this.listeners.add(this.inputElement, 'change', this.handleChange);
    this.listeners.add(this.inputElement, 'focus', this.handleFocus);
    this.listeners.add(this.inputElement, 'blur', this.handleBlur);
    this.listeners.add(this.inputElement, 'keydown', this.handleKeyDown);
    this.listeners.add(this.rightIconContainer, 'click', this.handleRightIconClick);
    this.listeners.add(this.rightIconContainer, 'keydown', this.handleRightIconKeyDown);
    this.listeners.add(this.leftSlotElement, 'slotchange', this.handleSlotChange);
    this.listeners.add(this, 'click', this.handleHostClick);

    this._defaultValue = this.getAttribute('value') || '';
    if (this.hasAttribute('value') && !this.inputElement.value) {
      this.inputElement.value = this._defaultValue;
    }

    this.syncState();
    if (this._checkTimer) clearTimeout(this._checkTimer);
    this._checkTimer = setTimeout(() => this.syncState(), 100);
  }

  disconnectedCallback() {
    this.listeners.cleanup();
    if (this._checkTimer) clearTimeout(this._checkTimer);
    this._checkTimer = null;
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
    return inteiroOuNulo(this.getAttribute('minlength') ?? this.getAttribute('min-length')) ?? -1;
  }

  set minLength(val: number) {
    if (val >= 0) this.setAttribute('minlength', String(val));
    else this.removeAttribute('minlength');
    this.syncState();
  }

  get maxLength(): number {
    return inteiroOuNulo(this.getAttribute('maxlength') ?? this.getAttribute('max-length')) ?? -1;
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
      minlength: this.minLength >= 0 ? this.minLength : null,
      maxlength: this.maxLength >= 0 ? this.maxLength : null,
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

    aplicarAlturaControle(this);

    sincronizarLabelEPlaceholder({
      labelElement: this.labelElement,
      inputElement: this.inputElement,
      labelText: this.getAttribute('label'),
      placeholderText: this.getAttribute('placeholder') || '',
      isFlutuante: this.hasAttribute('label-flutuante'),
      estaFocado: this._focado,
      obrigatorio: this.required
    });
    this.sincronizarNomeAcessivel();

    const tipoBase = this.getAttribute('tipo') || this.getAttribute('type') || 'text';
    if (!this._senhaVisivel) {
      try {
        this.inputElement.type = tipoBase;
      } catch {
        this.inputElement.type = 'text';
      }
    }

    if (this.minLength >= 0) this.inputElement.minLength = this.minLength;
    else this.inputElement.removeAttribute('minlength');

    if (this.maxLength >= 0) this.inputElement.maxLength = this.maxLength;
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
    // Só referencia a ajuda quando ela está visível
    if (this.helperElement.style.display === 'none') this.inputElement.removeAttribute('aria-describedby');
    else this.inputElement.setAttribute('aria-describedby', this.helperElement.id);

    if (this.required) this.inputElement.setAttribute('aria-required', 'true');
    else this.inputElement.removeAttribute('aria-required');

    this.atualizarValidade();
  }

  /**
   * Sem o atributo `label`, o input nativo herda o nome acessível de fora do Shadow DOM
   * (`aria-label` no host, `<label for>` ou `<label>` envolvente).
   */
  private sincronizarNomeAcessivel() {
    const rotuloExterno = this.getAttribute('label') ? '' : obterRotuloExterno(this, this.internals);
    if (rotuloExterno) {
      this.inputElement.setAttribute('aria-label', rotuloExterno);
    } else {
      this.inputElement.removeAttribute('aria-label');
    }
  }

  private handleHostClick = (e: MouseEvent) => {
    // Clique em <label> externo associado ao host: foca o input nativo
    if (cliqueVeioDeRotuloExterno(this, e) && !this.disabled) {
      this.inputElement.focus();
    }
  };

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

  /**
   * Enter submete o formulário como num <input> nativo. Aguarda um tick para que
   * ouvintes do consumidor possam cancelar com `preventDefault()` no keydown.
   */
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const form = this.form;
    if (!form) return;
    setTimeout(() => {
      if (!e.defaultPrevented && this.isConnected) submeterImplicitamente(form);
    });
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

/** Alias semântico: `<ui-input>` é idêntico a `<ui-campo-texto>`. */
export class UIInput extends UICampoTexto {}

definirCustomElement('ui-campo-texto', UICampoTexto);
definirCustomElement('ui-input', UIInput);

export * from './campo-texto-estados';
export * from './campo-texto-template';
