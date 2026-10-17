import estilos from './ui-radio.css?inline';
import { RadioGrupoRegistry } from './radio-grupo-registry';
import { definirCustomElement } from '../../core/ssr-safe';
import { FormAssociatedElement } from '../../core/form-associated-element';
import { ListenerBag } from '../../core/listener-bag';
import { gerarIdUnico, cliqueVeioDeRotuloExterno } from '../../core/acessibilidade';
import { sincronizarRotuloControle } from '../../core/rotulo-controle';

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
  private listeners = new ListenerBag();
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
    // Associação rótulo ↔ controle gerada internamente: o consumidor não gerencia IDs
    this.labelElement.id = gerarIdUnico('ui-radio-label');
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.containerElement, 'click', this.handleClick);
    this.listeners.add(this.containerElement, 'keydown', this.handleKeyDown);
    this.listeners.add(this.containerElement, 'focus', this.handleFocus);
    this.listeners.add(this.containerElement, 'blur', this.handleBlur);
    this.listeners.add(this, 'click', this.handleHostClick);
    this._defaultChecked = this.hasAttribute('marcado') || this.hasAttribute('checked');
    RadioGrupoRegistry.registrar(this);
    this.syncState();
    // quem já estava no grupo precisa reavaliar o tabindex (roving)
    RadioGrupoRegistry.atualizarGrupo(RadioGrupoRegistry.obterRadiosDoGrupo(this).filter((r) => r !== this));
  }

  disconnectedCallback() {
    this.listeners.cleanup();
    const restantes = RadioGrupoRegistry.obterRadiosDoGrupo(this).filter((r) => r !== this && r.isConnected);
    RadioGrupoRegistry.desregistrar(this);
    RadioGrupoRegistry.atualizarGrupo(restantes);
  }

  attributeChangedCallback(nome: string, _old: string | null, _value: string | null) {
    // mudar o nome depois de conectado move o radio de grupo (setAttribute não passa pelo setter `name`)
    if ((nome === 'name' || nome === 'nome') && this.isConnected) {
      const antigos = RadioGrupoRegistry.obterRadiosDoGrupo(this).filter((r) => r !== this);
      RadioGrupoRegistry.registrar(this);
      this.syncState();
      RadioGrupoRegistry.atualizarGrupo([...antigos, ...RadioGrupoRegistry.obterRadiosDoGrupo(this).filter((r) => r !== this)]);
      return;
    }
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
    // o attributeChangedCallback re-registra no novo grupo
    this.setAttribute('name', val);
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

    this.marcado = true;
    RadioGrupoRegistry.desmarcarOutros(this);

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

  /**
   * Roving tabindex: só um radio do grupo entra na ordem de Tab (o marcado; sem marcado, o primeiro habilitado).
   * Isolado de `syncState` para reavaliar os vizinhos sem mexer no valor/validade do formulário.
   */
  public atualizarTabindex(): void {
    if (this.disabled) {
      this.containerElement.setAttribute('tabindex', '-1');
      return;
    }
    const radios = RadioGrupoRegistry.obterRadiosDoGrupo(this).filter((r) => r.isConnected || r === this);
    if (radios.length === 0) {
      this.containerElement.setAttribute('tabindex', '0');
      return;
    }
    if (radios.some((r) => r.marcado)) {
      this.containerElement.setAttribute('tabindex', this.marcado ? '0' : '-1');
    } else {
      // ninguém marcado: o primeiro radio HABILITADO entra na ordem de Tab
      const primeiro = radios.find((r) => !r.disabled);
      this.containerElement.setAttribute('tabindex', primeiro === this ? '0' : '-1');
    }
  }

  public syncState() {
    const isChecked = this.marcado;
    const isDisabled = this.disabled;
    const labelText = this.getAttribute('label');
    const posicaoLabel = this.getAttribute('posicao-label') || 'direita';

    this.containerElement.setAttribute('aria-checked', String(isChecked));

    this.atualizarTabindex();
    if (isDisabled) {
      this.containerElement.classList.add('ui-radio--disabled');
      this.containerElement.setAttribute('aria-disabled', 'true');
    } else {
      this.containerElement.classList.remove('ui-radio--disabled');
      this.containerElement.removeAttribute('aria-disabled');
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

    // Rótulo (visível via atributo `label` ou externo via aria-label / <label for> / <label> envolvente)
    sincronizarRotuloControle({
      host: this,
      internals: this.internals,
      controle: this.containerElement,
      rotulo: this.labelElement,
      texto: labelText
    });

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

  public formStateRestoreCallback(state: unknown, _mode: 'restore' | 'autocomplete'): void {
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

  private handleHostClick = (e: MouseEvent) => {
    // Clique em <label> externo associado ao host: seleciona como um radio nativo
    if (cliqueVeioDeRotuloExterno(this, e)) {
      this.selecionar();
      this.containerElement.focus();
    }
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
