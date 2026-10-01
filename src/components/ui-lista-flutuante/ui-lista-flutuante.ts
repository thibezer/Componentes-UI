import { ListenerBag } from '../../core/listener-bag';
import { ItemLista } from './tipos';
import { ListaFlutuantePosicionamento } from './lista-flutuante-posicionamento';
import { ListaFlutuanteTeclado } from './lista-flutuante-teclado';
import {
  criarTemplateListaFlutuante,
  ATRIBUTOS_OBSERVADOS_LISTA_FLUTUANTE
} from './lista-flutuante-template';
import { renderizarItensLista, atualizarEstadoSelecaoLista } from './lista-flutuante-render';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

export * from './tipos';
export * from './lista-flutuante-posicionamento';
export * from './lista-flutuante-teclado';
export * from './lista-flutuante-template';
export * from './lista-flutuante-render';

export class UIListaFlutuante extends SafeHTMLElement {
  static formAssociated = true;
  private internals: ReturnType<HTMLElement['attachInternals']>;

  static get observedAttributes() {
    return ATRIBUTOS_OBSERVADOS_LISTA_FLUTUANTE;
  }

  private labelElement: HTMLLabelElement;
  private button: HTMLButtonElement;
  private content: HTMLDivElement;
  private listElement: HTMLUListElement;
  private textoElement: HTMLSpanElement;
  private backdropElement: HTMLDivElement;
  private sheetTituloElement: HTMLSpanElement;
  private sheetCloseButton: HTMLButtonElement;
  private listeners = new ListenerBag();
  private _itens: ItemLista[] = [];
  private _value: string = '';
  private _defaultValue: string = '';
  private _formDisabled: boolean = false;
  private _customErrorMessage: string = '';
  private observer!: MutationObserver;
  private posicionamento: ListaFlutuantePosicionamento;
  private teclado: ListaFlutuanteTeclado;

  constructor() {
    super();
    this.internals = typeof this.attachInternals === 'function' ? this.attachInternals() : ({} as any);
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = criarTemplateListaFlutuante();

    this.labelElement = shadow.querySelector('.ui-lista-flutuante__label')!;
    this.button = shadow.querySelector('.ui-lista-flutuante__gatilho')!;
    this.content = shadow.querySelector('.ui-lista-flutuante__conteudo')!;
    this.listElement = shadow.querySelector('.ui-lista-flutuante__lista')!;
    this.textoElement = shadow.querySelector('.ui-lista-flutuante__texto')!;
    this.backdropElement = shadow.querySelector('.ui-lista-flutuante__backdrop')!;
    this.sheetTituloElement = shadow.querySelector('.ui-lista-flutuante__sheet-titulo')!;
    this.sheetCloseButton = shadow.querySelector('.ui-lista-flutuante__sheet-close')!;

    this.posicionamento = new ListaFlutuantePosicionamento(this, this.button, this.content);
    this.teclado = new ListaFlutuanteTeclado(this.listElement);
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.button, 'click', this.toggleLista);
    this.listeners.add(this.button, 'keydown', this.handleKeyDown);
    this.listeners.add(this.content, 'keydown', this.handleListKeyDown);
    this.listeners.add(this.backdropElement, 'click', this.fechar);
    this.listeners.add(this.listElement, 'click', this.handleListClick);
    this.listeners.add(this.sheetCloseButton, 'click', (e: Event) => {
      e.stopPropagation();
      this.fechar();
    });
    this.listeners.add(document, 'click', this.handleClickFora);
    this._defaultValue = this.getAttribute('value') || '';
    this.carregarItensFilhos();
    this.syncState();

    this.observer = new MutationObserver(() => this.carregarItensFilhos());
    this.observer.observe(this, { childList: true, subtree: true });
  }

  public carregarItensFilhos() {
    const options = Array.from(this.querySelectorAll('option, ui-opcao, [role="option"], [data-opcao], [data-value]:not(input):not(select)'));
    if (options.length > 0) {
      this._itens = options.map((opt, idx) => {
        const idVal = opt.getAttribute('value') || opt.getAttribute('data-value') || String(idx + 1);
        return {
          id: idVal,
          label: opt.textContent?.trim() || idVal || `Opção ${idx + 1}`
        };
      });
      renderizarItensLista(this.listElement, this._itens, this._value);
      this.syncLabel();
    }
  }

  disconnectedCallback() {
    this.listeners.cleanup();
    if (this.observer) {
      this.observer.disconnect();
    }
    this.fechar();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'aberta') {
      this.button.setAttribute('aria-expanded', String(value !== null));
    }
    if (name === 'texto-padrao' || name === 'placeholder' || name === 'label' || name === 'rotulo') {
      this.syncLabel();
    }
    if (name === 'value' && value !== this._value) {
      this.value = value || '';
    }
    if (name === 'disabled') {
      this.button.disabled = this.disabled;
    }
    if (name === 'altura' || name === 'height') {
      if (value) {
        this.style.setProperty('--ui-campo-altura', isNaN(Number(value)) ? value : `${value}px`);
      } else {
        this.style.removeProperty('--ui-campo-altura');
      }
    }
  }

  get value(): string {
    return this._value;
  }

  set value(val: string) {
    this._value = val;
    this.setAttribute('value', val);
    this.internals.setFormValue(val);
    this.syncLabel();
    atualizarEstadoSelecaoLista(this.listElement, this._value);
    this.atualizarValidade();
  }

  get label(): string { return this.getAttribute('label') || this.getAttribute('rotulo') || ''; }
  set label(val: string) {
    if (val) this.setAttribute('label', val);
    else { this.removeAttribute('label'); this.removeAttribute('rotulo'); }
    this.syncLabel();
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
    this.button.disabled = this.disabled;
  }

  get form(): HTMLFormElement | null {
    return this.closest('form') ?? this.internals?.form ?? null;
  }

  get name(): string {
    return this.getAttribute('name') || '';
  }

  set name(val: string) {
    this.setAttribute('name', val);
  }

  get type(): string {
    return 'select-one';
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

  public atualizarValidade(): void {
    if (!this.internals || typeof this.internals.setValidity !== 'function') return;

    if (this.disabled) {
      this.internals.setValidity({});
      return;
    }

    if (this._customErrorMessage) {
      this.internals.setValidity({ customError: true }, this._customErrorMessage, this.button);
      return;
    }

    const isRequired = this.hasAttribute('obrigatorio') || this.hasAttribute('required');
    if (isRequired && (!this._value || this._value.trim() === '')) {
      const msg = this.getAttribute('mensagem-validacao') || 'Selecione um item da lista.';
      this.internals.setValidity({ valueMissing: true }, msg, this.button);
      return;
    }

    this.internals.setValidity({});
  }

  // === Ciclo de Vida Form-Associated Custom Elements (W3C FACE) ===
  public formDisabledCallback(disabled: boolean): void {
    this._formDisabled = disabled;
    this.button.disabled = this.disabled;
    if (this.disabled) {
      this.fechar();
    }
  }

  public formResetCallback(): void {
    this.value = this._defaultValue;
  }

  public formStateRestoreCallback(state: any, _mode: 'restore' | 'autocomplete'): void {
    if (typeof state === 'string') {
      this.value = state;
    }
  }

  get itens(): ItemLista[] {
    return this._itens;
  }

  set itens(value: ItemLista[]) {
    this._itens = value || [];
    renderizarItensLista(this.listElement, this._itens, this._value);
    this.syncLabel();
  }

  private toggleLista = (e: MouseEvent) => {
    e.stopPropagation();
    if (this.disabled) return;
    if (this.hasAttribute('aberta')) {
      this.fechar();
    } else {
      this.abrir();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this.hasAttribute('aberta')) {
        this.abrir();
      } else {
        this.teclado.focarPrimeiroItem();
      }
    }
  };

  private handleListKeyDown = (e: KeyboardEvent) => {
    if (!this.hasAttribute('aberta')) return;
    this.teclado.tratarKeydownLista(
      e,
      this._itens,
      (item) => this.selecionarItem(item),
      this.fechar,
      this.button
    );
  };

  public abrir() {
    if (this.disabled || this.hasAttribute('aberta')) return;
    this.setAttribute('aberta', '');
    this.posicionamento.posicionar();
    this.posicionamento.ativarAcompanhamento(this.fechar);
  }

  public fechar = () => {
    if (!this.hasAttribute('aberta')) return;
    this.removeAttribute('aberta');
    this.posicionamento.desativarAcompanhamento();
    this.teclado.resetarFoco();
  };

  private handleClickFora = (event: MouseEvent) => {
    if (!this.hasAttribute('aberta')) return;
    const composedPath = event.composedPath();
    if (!composedPath.includes(this) && !composedPath.includes(this.content)) {
      this.fechar();
    }
  };

  private syncLabel() {
    const labelAttr = this.getAttribute('label') || this.getAttribute('rotulo');
    if (labelAttr) {
      if (this.required) {
        this.labelElement.innerHTML = `${labelAttr} <span class="ui-lista-flutuante__asterisco" style="color: var(--ui-cor-texto-erro, #ff5555); margin-left: 2px;">*</span>`;
      } else {
        this.labelElement.textContent = labelAttr;
      }
      this.labelElement.style.display = 'block';
      this.sheetTituloElement.textContent = labelAttr;
    } else {
      this.labelElement.style.display = 'none';
      const textoPadrao = this.getAttribute('texto-padrao') || this.getAttribute('placeholder') || 'Opções';
      this.sheetTituloElement.textContent = textoPadrao;
    }

    const itemEncontrado = this._itens.find((i) => String(i.id) === String(this._value));
    if (itemEncontrado) {
      this.textoElement.textContent = itemEncontrado.label;
    } else {
      const textoPadrao = this.getAttribute('texto-padrao') || this.getAttribute('placeholder') || 'Opções';
      this.textoElement.textContent = textoPadrao;
    }
  }

  private handleListClick = (e: MouseEvent) => {
    e.stopPropagation();
    const target = (e.target as HTMLElement)?.closest('li[data-id]');
    if (!target) return;
    const id = target.getAttribute('data-id');
    const item = this._itens.find((i) => String(i.id) === String(id));
    if (item) {
      this.selecionarItem(item);
    }
  };

  private syncState() {
    const altura = this.getAttribute('altura') || this.getAttribute('height');
    if (altura) {
      this.style.setProperty('--ui-campo-altura', isNaN(Number(altura)) ? altura : `${altura}px`);
    }
    if (this.hasAttribute('value')) {
      this._value = this.getAttribute('value') || '';
      this.internals.setFormValue(this._value);
    }
    this.syncLabel();
    this.atualizarValidade();
  }

  private selecionarItem(item: ItemLista) {
    this.value = item.id;
    this.fechar();

    this.dispatchEvent(
      new CustomEvent('ui-selecionar', {
        detail: item,
        bubbles: true,
        composed: true
      })
    );

    this.dispatchEvent(
      new Event('change', {
        bubbles: true,
        composed: true
      })
    );

    this.dispatchEvent(
      new Event('input', {
        bubbles: true,
        composed: true
      })
    );
  }
}

export class UISelect extends UIListaFlutuante {}

definirCustomElement('ui-lista-flutuante', UIListaFlutuante);
definirCustomElement('ui-select', UISelect);
