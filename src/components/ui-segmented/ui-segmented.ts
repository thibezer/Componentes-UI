import { ListenerBag } from '../../core/listener-bag';
import { SegmentedIndicadorController } from './segmented-indicador';
import { tratarTecladoSegmented } from './segmented-teclado';
import {
  criarTemplateSegmented,
  criarBotaoOpcao,
  ATRIBUTOS_OBSERVADOS_SEGMENTED
} from './segmented-template';

export interface UISegmentedOpcao {
  valor: string;
  rotulo: string;
  icone?: string;
  disabled?: boolean;
}

export class UISegmented extends HTMLElement {
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

  formResetCallback() {
    this.valor = this._defaultValue;
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
    return this.hasAttribute('disabled');
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

    if (!valorAtual && this._opcoes.length > 0) {
      this.selecionarIndice(0, false);
    } else {
      this.indicadorController.atualizar();
    }
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
  }
}

export class UISegmento extends UISegmented {}

if (!customElements.get('ui-segmented')) {
  customElements.define('ui-segmented', UISegmented);
}

if (!customElements.get('ui-segmento')) {
  customElements.define('ui-segmento', UISegmento);
}

export * from './segmented-indicador';
export * from './segmented-teclado';
export * from './segmented-template';
