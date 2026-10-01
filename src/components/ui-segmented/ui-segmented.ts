import { ListenerBag } from '../../core/listener-bag';
import { SegmentedIndicadorController } from './segmented-indicador';
import { tratarTecladoSegmented } from './segmented-teclado';
import {
  criarTemplateSegmented,
  criarBotaoOpcao,
  ATRIBUTOS_OBSERVADOS_SEGMENTED
} from './segmented-template';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

export interface UISegmentedOpcao {
  valor: string;
  rotulo: string;
  icone?: string;
  disabled?: boolean;
}

export class UISegmented extends SafeHTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ATRIBUTOS_OBSERVADOS_SEGMENTED;
  }

  private internals?: ReturnType<HTMLElement['attachInternals']>;
  private rootElement: HTMLDivElement;
  private trackElement: HTMLDivElement;
  private indicadorElement: HTMLDivElement;
  private slotElement: HTMLSlotElement;
  private _opcoes: UISegmentedOpcao[] = [];
  private _defaultValue: string = '';
  private _formDisabled: boolean = false;
  private _customErrorMessage: string = '';
  private listeners = new ListenerBag();
  private indicadorController: SegmentedIndicadorController;

  constructor() {
    super();
    if (this.attachInternals) {
      this.internals = this.attachInternals();
    }

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = criarTemplateSegmented();

    this.rootElement = shadow.querySelector('.ui-segmented')!;
    this.indicadorElement = shadow.querySelector('.ui-segmented__indicador')!;
    this.trackElement = shadow.querySelector('.ui-segmented__track')!;
    this.slotElement = shadow.querySelector('slot')!;

    this.indicadorController = new SegmentedIndicadorController(
      this.trackElement,
      this.indicadorElement
    );
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.rootElement, 'keydown', this.handleKeyDown);
    this.listeners.add(this.slotElement, 'slotchange', this.handleSlotChange);

    if (!this._defaultValue) {
      this._defaultValue = this.getAttribute('valor') || this.getAttribute('value') || '';
    }

    this.indicadorController.iniciarObserver(this.rootElement);
    this.carregarOpcoes();
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
    this.indicadorController.destruir();
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (old === value) return;
    if (name === 'valor' || name === 'value') {
      this.atualizarSelecao(value || '');
    } else {
      this.syncState();
    }
  }

  // === Ciclo de Vida Form-Associated Custom Elements (W3C FACE) ===
  public formDisabledCallback(disabled: boolean): void {
    this._formDisabled = disabled;
    this.syncState();
  }

  public formResetCallback(): void {
    this.valor = this._defaultValue;
    this.syncState();
  }

  public formStateRestoreCallback(state: any, _mode: 'restore' | 'autocomplete'): void {
    if (typeof state === 'string') {
      this.valor = state;
    }
    this.syncState();
  }

  get form(): HTMLFormElement | null {
    return this.closest('form') ?? this.internals?.form ?? null;
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
      this.internals.setValidity({ customError: true }, this._customErrorMessage, this.rootElement);
      return;
    }

    const isRequired = this.hasAttribute('obrigatorio') || this.hasAttribute('required');
    if (isRequired && (!this.valor || this.valor.trim() === '')) {
      const msg = this.getAttribute('mensagem-validacao') || 'Selecione uma opção.';
      this.internals.setValidity({ valueMissing: true }, msg, this.rootElement);
      return;
    }

    this.internals.setValidity({});
  }

  get valor(): string {
    return this.getAttribute('valor') || this.getAttribute('value') || '';
  }

  set valor(val: string) {
    this.setAttribute('valor', val);
    this.atualizarSelecao(val);
  }

  get value(): string {
    return this.valor;
  }

  set value(val: string) {
    this.valor = val;
  }

  get name(): string {
    return this.getAttribute('name') || '';
  }

  set name(val: string) {
    this.setAttribute('name', val);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  set disabled(val: boolean) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get opcoes(): UISegmentedOpcao[] {
    return this._opcoes;
  }

  set opcoes(val: UISegmentedOpcao[]) {
    this._opcoes = Array.isArray(val) ? val : [];
    this.renderizarOpcoes();
  }

  private handleSlotChange = () => {
    if (this._opcoes.length === 0) {
      this.carregarOpcoes();
    }
  };

  private carregarOpcoes() {
    const slottedNodes = this.slotElement.assignedElements();
    if (slottedNodes.length > 0) {
      const extraidas: UISegmentedOpcao[] = [];
      slottedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          const val = node.getAttribute('valor') || node.getAttribute('value') || node.getAttribute('data-value') || node.textContent?.trim() || '';
          const rotulo = node.getAttribute('label') || node.getAttribute('rotulo') || node.textContent?.trim() || val;
          const icone = node.getAttribute('icone') || node.getAttribute('icon') || undefined;
          const dis = node.hasAttribute('disabled');
          extraidas.push({ valor: val, rotulo, icone, disabled: dis });
        }
      });
      this._opcoes = extraidas;
      this.renderizarOpcoes();
    }
  }

  private renderizarOpcoes() {
    this.trackElement.innerHTML = '';
    const valorAtual = this.valor;
    const isDesabilitadoGeral = this.disabled;

    this._opcoes.forEach((opcao, indice) => {
      const btn = criarBotaoOpcao(
        opcao,
        indice,
        valorAtual,
        isDesabilitadoGeral,
        () => this.selecionarIndice(indice)
      );
      this.trackElement.appendChild(btn);
    });

    const permiteSemSelecao = this.required || this.hasAttribute('sem-selecao-inicial');
    if (!valorAtual && this._opcoes.length > 0 && !permiteSemSelecao) {
      this.selecionarIndice(0, false);
    } else {
      this.indicadorController.atualizar();
    }
    this.atualizarValidade();
  }

  public selecionarIndice(indice: number, dispararEventos: boolean = true) {
    if (this.disabled) return;
    const opcao = this._opcoes[indice];
    if (!opcao || opcao.disabled) return;

    const valorAntigo = this.valor;
    this.setAttribute('valor', opcao.valor);

    if (this.internals) {
      this.internals.setFormValue(opcao.valor);
    }

    this.atualizarSelecao(opcao.valor);

    if (dispararEventos && valorAntigo !== opcao.valor) {
      this.dispatchEvent(
        new CustomEvent('ui-change', {
          detail: { valor: opcao.valor, rotulo: opcao.rotulo, indice },
          bubbles: true,
          composed: true
        })
      );
      this.dispatchEvent(
        new CustomEvent('ui-selecionar', {
          detail: { valor: opcao.valor, rotulo: opcao.rotulo, indice },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  private atualizarSelecao(novoValor: string) {
    const botoes = Array.from(this.trackElement.querySelectorAll('.ui-segmented__item')) as HTMLButtonElement[];
    botoes.forEach(btn => {
      const isAtivo = btn.dataset.valor === novoValor;
      btn.classList.toggle('ui-segmented__item--ativo', isAtivo);
      btn.setAttribute('aria-checked', String(isAtivo));
      btn.tabIndex = isAtivo ? 0 : -1;
      if (isAtivo) {
        btn.focus();
      }
    });

    if (this.internals) {
      this.internals.setFormValue(novoValor);
    }

    this.indicadorController.atualizar();
    this.atualizarValidade();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    tratarTecladoSegmented(e, this.trackElement, this.disabled, (indice) => {
      this.selecionarIndice(indice);
    });
  };

  private syncState() {
    const tamanho = this.getAttribute('tamanho') || this.getAttribute('size') || 'md';
    const isFull = this.hasAttribute('largura-total') || this.hasAttribute('full-width');
    const isDisabled = this.disabled;

    this.rootElement.className = `ui-segmented ui-segmented--${tamanho}`;
    if (isFull) {
      this.rootElement.classList.add('ui-segmented--full');
    }

    this.rootElement.setAttribute('aria-disabled', String(isDisabled));

    const botoes = Array.from(this.trackElement.querySelectorAll('.ui-segmented__item')) as HTMLButtonElement[];
    botoes.forEach(b => {
      b.disabled = isDisabled;
    });

    this.indicadorController.atualizar();
    this.atualizarValidade();
  }
}

export class UISegmento extends UISegmented {}

definirCustomElement('ui-segmented', UISegmented);
definirCustomElement('ui-segmento', UISegmento);

export * from './segmented-indicador';
export * from './segmented-teclado';
export * from './segmented-template';
