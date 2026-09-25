import { criarTemplateCampoTexto, ATRIBUTOS_OBSERVADOS_CAMPO_TEXTO } from './campo-texto-template';
import {
  sincronizarLabelEPlaceholder,
  sincronizarIconeSenha,
  sincronizarFeedbackErro
} from './campo-texto-estados';

export class UICampoTexto extends HTMLElement {
  static formAssociated = true;
  private internals: ReturnType<HTMLElement['attachInternals']>;

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
    this.internals = this.attachInternals();
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
    return this.inputElement.value;
  }

  set value(val: string) {
    this.inputElement.value = val;
    this.setAttribute('value', val);
    this.syncState();
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

  private syncState() {
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
      estaFocado: this._focado
    });

    const tipoBase = this.getAttribute('tipo') || 'text';
    if (!this._senhaVisivel) {
      this.inputElement.type = tipoBase;
    }

    this.internals.setFormValue(this.inputElement.value);

    const isDisabled = this.hasAttribute('disabled');
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

  formResetCallback() {
    this.inputElement.value = this._defaultValue;
    this.syncState();
  }

  private handleChange = (e: Event) => {
    e.stopPropagation();
    const val = (e.target as HTMLInputElement).value;
    this.internals.setFormValue(val);
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

if (!customElements.get('ui-campo-texto')) {
  customElements.define('ui-campo-texto', UICampoTexto);
}

export * from './campo-texto-estados';
export * from './campo-texto-template';
