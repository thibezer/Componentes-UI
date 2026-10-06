import estilos from './ui-radio.css?inline';
import { RadioGrupoRegistry } from './radio-grupo-registry';
import { definirCustomElement } from '../../core/ssr-safe';
import { FormAssociatedElement } from '../../core/form-associated-element';

export class UIRadio extends FormAssociatedElement {
  static get observedAttributes() {
    return [
      'marcado',
      'checked',
      'name',
      'nome',
      'disabled',
      'value',
      'label',
      'posicao-label',
      'obrigatorio',
      'required',
      'mensagem-validacao'
    ];
  }

  public containerElement: HTMLDivElement;
  private labelElement: HTMLSpanElement;
  private _defaultChecked: boolean = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-radio" part="base" tabindex="0" role="radio" aria-checked="false">
        <span class="ui-radio__circle" part="controle">
          <span class="ui-radio__dot" part="indicador"></span>
        </span>
        <span class="ui-radio__label" part="rotulo" style="display: none;"></span>
      </div>
    `;

    this.containerElement = shadow.querySelector('.ui-radio')!;
    this.labelElement = shadow.querySelector('.ui-radio__label')!;
  }

  connectedCallback() {
    this.containerElement.addEventListener('click', this.handleClick);
    this.containerElement.addEventListener('keydown', this.handleKeyDown);
    this.containerElement.addEventListener('focus', this.handleFocus);
    this.containerElement.addEventListener('blur', this.handleBlur);
    this._defaultChecked = this.hasAttribute('marcado') || this.hasAttribute('checked');
    RadioGrupoRegistry.registrar(this);
    this.syncState();
  }

  disconnectedCallback() {
    this.containerElement.removeEventListener('click', this.handleClick);
    this.containerElement.removeEventListener('keydown', this.handleKeyDown);
    this.containerElement.removeEventListener('focus', this.handleFocus);
    this.containerElement.removeEventListener('blur', this.handleBlur);
    RadioGrupoRegistry.desregistrar(this);
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
  }

  get name(): string {
    return this.getAttribute('name') || this.getAttribute('nome') || '';
  }

  set name(val: string) {
    RadioGrupoRegistry.desregistrar(this);
    this.setAttribute('name', val);
    RadioGrupoRegistry.registrar(this);
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
    return 'radio';
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

    const radios = RadioGrupoRegistry.obterRadiosDoGrupo(this);
    const grupoRequerido = this.required || (radios.length > 0 && radios.some(r => r.required));

    if (grupoRequerido) {
      const algumMarcado = this.marcado || (radios.length > 0 && radios.some(r => r.marcado));
      if (!algumMarcado) {
        const msg = this.getAttribute('mensagem-validacao') || 'Selecione uma opção.';
        this.internals.setValidity({ valueMissing: true }, msg, this.containerElement);
        return;
      }
    }

    this.internals.setValidity({});
  }

  public override focus(options?: FocusOptions): void {
    this.containerElement.focus(options);
  }

  public selecionar() {
    if (this.disabled || this.marcado) return;

    RadioGrupoRegistry.desmarcarOutros(this);
    this.marcado = true;

    this.dispatchEvent(
      new CustomEvent('ui-change', {
        detail: {
          marcado: true,
          name: this.name,
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

    RadioGrupoRegistry.obterRadiosDoGrupo(this).forEach(r => r.atualizarValidade());
  }

  public syncState() {
    const isChecked = this.marcado;
    const isDisabled = this.disabled;
    const labelText = this.getAttribute('label');
    const posicaoLabel = this.getAttribute('posicao-label') || 'direita';

    this.containerElement.setAttribute('aria-checked', String(isChecked));

    if (isDisabled) {
      this.containerElement.classList.add('ui-radio--disabled');
      this.containerElement.setAttribute('tabindex', '-1');
      this.containerElement.setAttribute('aria-disabled', 'true');
    } else {
      this.containerElement.classList.remove('ui-radio--disabled');
      this.containerElement.removeAttribute('aria-disabled');

      const radios = RadioGrupoRegistry.obterRadiosDoGrupo(this);
      if (radios.length > 0) {
        const hasChecked = radios.some(r => r.marcado);
        if (hasChecked) {
          this.containerElement.setAttribute('tabindex', isChecked ? '0' : '-1');
        } else {
          this.containerElement.setAttribute('tabindex', radios[0] === this ? '0' : '-1');
        }
      } else {
        this.containerElement.setAttribute('tabindex', '0');
      }
    }

    if (isChecked) {
      this.containerElement.classList.add('ui-radio--checked');
    } else {
      this.containerElement.classList.remove('ui-radio--checked');
    }

    if (posicaoLabel === 'esquerda') {
      this.containerElement.classList.add('ui-radio--label-esquerda');
    } else {
      this.containerElement.classList.remove('ui-radio--label-esquerda');
    }

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
  public formResetCallback(): void {
    this.marcado = this._defaultChecked;
    if (this._defaultChecked) {
      this.internals.setFormValue(this.getAttribute('value') || 'on');
    } else {
      this.internals.setFormValue(null);
    }
    this.atualizarValidade();
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
    this.selecionar();
    this.containerElement.focus();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.selecionar();
    } else {
      RadioGrupoRegistry.tratarNavegacaoTeclado(e, this);
    }
  };

  private handleFocus = () => {
    this.containerElement.classList.add('ui-radio--foco');
  };

  private handleBlur = () => {
    this.containerElement.classList.remove('ui-radio--foco');
  };
}

definirCustomElement('ui-radio', UIRadio);

export * from './radio-grupo-registry';
