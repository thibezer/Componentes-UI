import estilos from './ui-segmented.css?inline';
import { ListenerBag } from '../../core/listener-bag';

export interface UISegmentedOpcao {
  valor: string;
  rotulo: string;
  icone?: string;
  disabled?: boolean;
}

export class UISegmented extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return [
      'valor',
      'value',
      'name',
      'disabled',
      'tamanho',
      'size',
      'largura-total',
      'full-width'
    ];
  }

  private internals?: ReturnType<HTMLElement['attachInternals']>;
  private rootElement: HTMLDivElement;
  private trackElement: HTMLDivElement;
  private indicadorElement: HTMLDivElement;
  private slotElement: HTMLSlotElement;
  private _opcoes: UISegmentedOpcao[] = [];
  private _defaultValue: string = '';
  private listeners = new ListenerBag();
  private resizeObserver?: ResizeObserver;
  private _rafId: number | null = null;

  constructor() {
    super();
    if (this.attachInternals) {
      this.internals = this.attachInternals();
    }

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-segmented ui-segmented--md" role="radiogroup">
        <div class="ui-segmented__indicador"></div>
        <div class="ui-segmented__track" style="display: contents;"></div>
        <slot style="display: none;"></slot>
      </div>
    `;

    this.rootElement = shadow.querySelector('.ui-segmented')!;
    this.indicadorElement = shadow.querySelector('.ui-segmented__indicador')!;
    this.trackElement = shadow.querySelector('.ui-segmented__track')!;
    this.slotElement = shadow.querySelector('slot')!;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.rootElement, 'keydown', this.handleKeyDown);
    this.listeners.add(this.slotElement, 'slotchange', this.handleSlotChange);

    // Capturar valor inicial padrão para formResetCallback confiável
    if (!this._defaultValue) {
      this._defaultValue = this.getAttribute('valor') || this.getAttribute('value') || '';
    }

    // Inicializar observador de resize para atualizar o indicador de pastilha
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.atualizarPosicaoIndicador();
      });
      this.resizeObserver.observe(this.rootElement);
    }

    this.carregarOpcoes();
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
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
    // Se não foram passadas opções via JS, extrai das tags filhas
    if (this._opcoes.length === 0) {
      this.carregarOpcoes();
    }
  };

  private carregarOpcoes() {
    // Opções declarativas via HTML (ex.: <button data-value="mapa">Mapa</button> ou <ui-opcao>)
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
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.role = 'radio';
      btn.className = 'ui-segmented__item';
      btn.dataset.valor = opcao.valor;
      btn.dataset.indice = String(indice);

      const isAtivo = opcao.valor === valorAtual;
      btn.setAttribute('aria-checked', String(isAtivo));
      btn.tabIndex = isAtivo ? 0 : -1;

      if (isAtivo) {
        btn.classList.add('ui-segmented__item--ativo');
      }

      if (isDesabilitadoGeral || opcao.disabled) {
        btn.disabled = true;
      }

      // Ícone opcional
      if (opcao.icone) {
        const spanIcone = document.createElement('span');
        spanIcone.className = 'ui-segmented__icone';
        const iconeEl = document.createElement('ui-icone');
        iconeEl.setAttribute('nome', opcao.icone);
        iconeEl.setAttribute('tamanho', '14');
        spanIcone.appendChild(iconeEl);
        btn.appendChild(spanIcone);
      }

      // Rótulo seguro com textContent
      const spanTexto = document.createElement('span');
      spanTexto.className = 'ui-segmented__texto';
      spanTexto.textContent = opcao.rotulo;
      btn.appendChild(spanTexto);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selecionarIndice(indice);
      });

      this.trackElement.appendChild(btn);
    });

    // Se nenhuma estiver ativa e houver opções, seleciona a primeira por padrão
    if (!valorAtual && this._opcoes.length > 0) {
      this.selecionarIndice(0, false);
    } else {
      this.atualizarPosicaoIndicador();
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

    this.atualizarPosicaoIndicador();
  }

  private atualizarPosicaoIndicador() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
    }

    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      const btnAtivo = this.trackElement.querySelector('.ui-segmented__item--ativo') as HTMLElement | null;
      if (!btnAtivo) {
        this.indicadorElement.style.opacity = '0';
        return;
      }

      const offsetLeft = Math.round(btnAtivo.offsetLeft);
      const offsetWidth = Math.round(btnAtivo.offsetWidth);

      this.indicadorElement.style.transform = `translateX(${offsetLeft}px)`;
      this.indicadorElement.style.width = `${offsetWidth}px`;
      this.indicadorElement.style.opacity = '1';
    });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.disabled) return;
    const botoesHabilitados = Array.from(
      this.trackElement.querySelectorAll('.ui-segmented__item:not(:disabled)')
    ) as HTMLButtonElement[];

    if (botoesHabilitados.length === 0) return;

    const ativoIndex = botoesHabilitados.findIndex(b => b.classList.contains('ui-segmented__item--ativo'));
    let proximoIndex = ativoIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      proximoIndex = (ativoIndex + 1) % botoesHabilitados.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      proximoIndex = (ativoIndex - 1 + botoesHabilitados.length) % botoesHabilitados.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      proximoIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      proximoIndex = botoesHabilitados.length - 1;
    } else {
      return;
    }

    const proximoBtn = botoesHabilitados[proximoIndex];
    if (proximoBtn && proximoBtn.dataset.indice) {
      const realIndice = parseInt(proximoBtn.dataset.indice, 10);
      this.selecionarIndice(realIndice);
    }
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

    this.atualizarPosicaoIndicador();
  }
}

export class UISegmento extends UISegmented {}

if (!customElements.get('ui-segmented')) {
  customElements.define('ui-segmented', UISegmented);
}

if (!customElements.get('ui-segmento')) {
  customElements.define('ui-segmento', UISegmento);
}
