import estilos from './ui-campo-texto.css?inline';

export class UICampoTexto extends HTMLElement {
  static formAssociated = true;
  private internals: ElementInternals;

  static get observedAttributes() {
    return [
      'label',
      'placeholder',
      'value',
      'tipo',
      'helper-text',
      'erro',
      'mensagem-erro',
      'disabled',
      'readonly',
      'label-flutuante',
      'alternar-senha'
    ];
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

  constructor() {
    super();
    this.internals = this.attachInternals();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-campo-texto__container">
        <label class="ui-campo-texto__label" style="display: none;"></label>
        <div class="ui-campo-texto__wrapper">
          <span class="ui-campo-texto__icone ui-campo-texto__icone--esquerda">
            <slot name="icone-esquerda"></slot>
          </span>
          <input class="ui-campo-texto__input" type="text" />
          <span class="ui-campo-texto__icone ui-campo-texto__icone--direita">
            <slot name="icone-direita"></slot>
          </span>
        </div>
      </div>
      <div class="ui-campo-texto__helper" style="display: none;"></div>
    `;

    this.labelElement = shadow.querySelector('.ui-campo-texto__label')!;
    this.wrapperElement = shadow.querySelector('.ui-campo-texto__wrapper')!;
    this.inputElement = shadow.querySelector('.ui-campo-texto__input')!;
    this.helperElement = shadow.querySelector('.ui-campo-texto__helper')!;
    this.rightIconContainer = shadow.querySelector('.ui-campo-texto__icone--direita')!;
    this.leftSlotElement = shadow.querySelector('slot[name="icone-esquerda"]')!;
  }

  connectedCallback() {
    this.inputElement.addEventListener('input', this.handleInput);
    this.inputElement.addEventListener('change', this.handleChange);
    this.inputElement.addEventListener('focus', this.handleFocus);
    this.inputElement.addEventListener('blur', this.handleBlur);
    this.inputElement.addEventListener('keyup', this.handleInput);
    this.rightIconContainer.addEventListener('click', this.handleRightIconClick);
    this.leftSlotElement.addEventListener('slotchange', this.handleSlotChange);

    this.syncState();

    // Verificação de segurança adicional para capturar preenchimento automático (Autofill)
    this._checkTimer = setTimeout(() => this.syncState(), 100);
  }

  disconnectedCallback() {
    this.inputElement.removeEventListener('input', this.handleInput);
    this.inputElement.removeEventListener('change', this.handleChange);
    this.inputElement.removeEventListener('focus', this.handleFocus);
    this.inputElement.removeEventListener('blur', this.handleBlur);
    this.inputElement.removeEventListener('keyup', this.handleInput);
    this.rightIconContainer.removeEventListener('click', this.handleRightIconClick);
    this.leftSlotElement.removeEventListener('slotchange', this.handleSlotChange);

    if (this._checkTimer) clearTimeout(this._checkTimer);
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    const estaFocado = this._focado;
    if (name === 'value' && value !== this.inputElement.value && !estaFocado) {
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

    // Atualizar ícone de olho no slot se fornecido
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
    // Detectar se há ícone na esquerda
    const temIconeEsquerda = this.leftSlotElement.assignedNodes().length > 0 || this.querySelector('[slot="icone-esquerda"]') !== null;
    if (temIconeEsquerda) {
      this.setAttribute('tem-icone-esquerda', '');
    } else {
      this.removeAttribute('tem-icone-esquerda');
    }

    // 1. Label e Floating Label
    const labelText = this.getAttribute('label');
    const isFlutuante = this.hasAttribute('label-flutuante');
    const temValor = this.inputElement.value.trim() !== '';
    const estaFocado = this._focado;
    const temAutofill = (() => {
      try {
        return this.inputElement.matches(':-webkit-autofill');
      } catch (_e) {
        return false;
      }
    })();

    if (labelText) {
      this.labelElement.textContent = labelText;
      this.labelElement.style.display = 'flex';

      if (isFlutuante) {
        if (estaFocado || temValor || temAutofill) {
          this.labelElement.classList.add('ui-campo-texto__label--ativa');
        } else {
          this.labelElement.classList.remove('ui-campo-texto__label--ativa');
        }
      } else {
        this.labelElement.classList.remove('ui-campo-texto__label--ativa');
      }
    } else {
      this.labelElement.style.display = 'none';
    }

    // 2. Placeholder
    const placeholder = this.getAttribute('placeholder') || '';
    if (isFlutuante && !estaFocado && !temValor && !temAutofill) {
      this.inputElement.placeholder = '';
    } else {
      this.inputElement.placeholder = placeholder;
    }

    // 3. Tipo (type)
    const tipoBase = this.getAttribute('tipo') || 'text';
    if (!this._senhaVisivel) {
      this.inputElement.type = tipoBase;
    }

    // 4. Value
    if (this.hasAttribute('value') && this.getAttribute('value') !== this.inputElement.value && !estaFocado) {
      this.inputElement.value = this.getAttribute('value') || '';
    }
    this.internals.setFormValue(this.inputElement.value);

    // 5. Disabled & Readonly
    const isDisabled = this.hasAttribute('disabled');
    const isReadonly = this.hasAttribute('readonly');
    this.inputElement.disabled = isDisabled;
    this.inputElement.readOnly = isReadonly;

    if (isDisabled) {
      this.wrapperElement.classList.add('ui-campo-texto__wrapper--disabled');
    } else {
      this.wrapperElement.classList.remove('ui-campo-texto__wrapper--disabled');
    }

    // 6. Configurar ícone da direita como clicável para senha
    if (tipoBase === 'password' || this.hasAttribute('alternar-senha')) {
      this.rightIconContainer.classList.add('ui-campo-texto__icone--clicavel');
    } else {
      this.rightIconContainer.classList.remove('ui-campo-texto__icone--clicavel');
    }

    // 7. Mensagem de Erro ou Helper Text
    const temErro = this.hasAttribute('erro') || this.hasAttribute('mensagem-erro');
    const mensagemErro = this.getAttribute('mensagem-erro');
    const helperText = this.getAttribute('helper-text');

    if (temErro) {
      this.wrapperElement.classList.add('ui-campo-texto__wrapper--erro');
    } else {
      this.wrapperElement.classList.remove('ui-campo-texto__wrapper--erro');
    }

    if (temErro && mensagemErro) {
      this.helperElement.textContent = `⚠️ ${mensagemErro}`;
      this.helperElement.className = 'ui-campo-texto__helper ui-campo-texto__helper--erro';
      this.helperElement.style.display = 'block';
    } else if (helperText) {
      this.helperElement.textContent = helperText;
      this.helperElement.className = 'ui-campo-texto__helper';
      this.helperElement.style.display = 'block';
    } else {
      this.helperElement.style.display = 'none';
    }
  }

  private handleRightIconClick = (e: MouseEvent) => {
    const tipoBase = this.getAttribute('tipo');
    if (tipoBase === 'password' || this.hasAttribute('alternar-senha')) {
      e.stopPropagation();
      this.alternarVisibilidadeSenha();
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
    const val = (e.target as HTMLInputElement).value;
    // O valor já está no inputElement. Apenas notifique o exterior e sincronize o label flutuante

    this.internals.setFormValue(val);

    // Atualiza apenas classes de foco/flutuante
    this.syncState();

    this.dispatchEvent(
      new CustomEvent('ui-input', {
        detail: { value: val },
        bubbles: true,
        composed: true,
      })
    );
  };

  formResetCallback() {
    this.value = this.getAttribute('value') || '';
    this.syncState();
  }

  private handleChange = (e: Event) => {
    const val = (e.target as HTMLInputElement).value;
    this.internals.setFormValue(val);
    this.dispatchEvent(
      new CustomEvent('ui-change', {
        detail: { value: val },
        bubbles: true,
        composed: true,
      })
    );
  };
}

if (!customElements.get('ui-campo-texto')) {
  customElements.define('ui-campo-texto', UICampoTexto);
}
