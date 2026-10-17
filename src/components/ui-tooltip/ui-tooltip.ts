import estilos from './ui-tooltip.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ListenerBag } from '../../core/listener-bag';
import { normalizarPosicao, calcularPosicaoBalao } from './tooltip-posicionamento';
import { mostrarPopover, ocultarPopover } from './tooltip-popover';

/** Tempo para levar o ponteiro do gatilho até o balão sem que ele feche (WCAG 1.4.13). */
const ATRASO_OCULTAR_MS = 120;

/**
 * Dica contextual (e popover) ao redor de um gatilho.
 *
 * @attr {string} texto - Texto do balão (alias `text`); também vira `aria-description` do gatilho.
 * @attr {'topo'|'baixo'|'esquerda'|'direita'} posicao - Lado do balão (alias `position`, aceita top/bottom/left/right).
 * @attr {'hover'|'clique'} gatilho - Como abre (alias `trigger`); em telas de toque o toque sempre alterna.
 * @attr {boolean} aberto - Balão visível (alias `open`).
 * @attr {boolean} disabled - Desativa o tooltip; fecha se estiver aberto.
 * @slot - Elemento gatilho.
 * @slot conteudo - Conteúdo rico do balão.
 * @csspart balao - O balão.
 * @csspart texto - O texto do balão.
 * @csspart seta - A seta do balão.
 */
export class UITooltip extends SafeHTMLElement {
  static get observedAttributes() {
    return [
      'texto',
      'text',
      'posicao',
      'position',
      'gatilho',
      'trigger',
      'aberto',
      'open',
      'disabled'
    ];
  }

  private containerElement: HTMLDivElement;
  private bubbleElement: HTMLDivElement;
  /** Ouvintes do host: valem enquanto o elemento está conectado. */
  private ouvintesHost = new ListenerBag();
  /** Ouvintes globais (documento/janela): valem só enquanto o balão está aberto. */
  private ouvintesAberto = new ListenerBag();
  private _timerOcultar: ReturnType<typeof setTimeout> | null = null;
  private _quadro: number | null = null;
  /** Gatilho que recebeu `aria-description` deste tooltip (para remover depois). */
  private _gatilhoDescrito: HTMLElement | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-tooltip ui-tooltip--topo">
        <slot></slot>
        <div class="ui-tooltip__bubble" part="balao" role="tooltip" popover="manual">
          <span class="ui-tooltip__texto" part="texto"></span>
          <slot name="conteudo"></slot>
          <span class="ui-tooltip__arrow" part="seta"></span>
        </div>
      </div>
    `;

    this.containerElement = shadow.querySelector('.ui-tooltip')!;
    this.bubbleElement = shadow.querySelector('.ui-tooltip__bubble')!;
    shadow.querySelectorAll('slot').forEach((slot) => slot.addEventListener('slotchange', () => this.sincronizarDescricao()));
  }

  connectedCallback() {
    this.ouvintesHost.cleanup();
    this.ouvintesHost.add(this, 'mouseenter', this.handleMouseEnter);
    this.ouvintesHost.add(this, 'mouseleave', this.handleMouseLeave);
    this.ouvintesHost.add(this, 'focusin', this.handleMouseEnter);
    this.ouvintesHost.add(this, 'focusout', this.handleMouseLeave);
    this.ouvintesHost.add(this, 'click', this.handleClick);
    this.syncState();
  }

  disconnectedCallback() {
    this.ouvintesHost.cleanup();
    this.ouvintesAberto.cleanup();
    this.cancelarOcultar();
    this.cancelarQuadro();
    this.removerDescricao();
    this.ocultar();
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  get aberto(): boolean {
    return this.hasAttribute('aberto') || this.hasAttribute('open');
  }

  set aberto(val: boolean) {
    if (val) {
      this.setAttribute('aberto', '');
    } else {
      this.removeAttribute('aberto');
      this.removeAttribute('open');
    }
    this.syncState();
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(val: boolean) {
    if (val) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
    this.syncState();
  }

  public mostrar() {
    if (this.disabled) return;
    this.aberto = true;
  }

  public ocultar() {
    this.aberto = false;
  }

  private lerGatilho(): string {
    return this.getAttribute('gatilho') || this.getAttribute('trigger') || 'hover';
  }

  private posicionarBubble = () => {
    if (!this.aberto) return;
    const posicao = normalizarPosicao(this.getAttribute('posicao') || this.getAttribute('position'));
    const { top, left } = calcularPosicaoBalao(
      this.getBoundingClientRect(),
      this.bubbleElement.getBoundingClientRect(),
      posicao,
      { largura: window.innerWidth, altura: window.innerHeight }
    );
    this.bubbleElement.style.top = `${top}px`;
    this.bubbleElement.style.left = `${left}px`;
  };

  private cancelarQuadro() {
    if (this._quadro !== null) {
      cancelAnimationFrame(this._quadro);
      this._quadro = null;
    }
  }

  private syncState() {
    // desabilitado nunca fica visível, mesmo com `aberto` declarado ou definido antes de desabilitar
    const visivel = this.aberto && !this.disabled;
    const posicao = normalizarPosicao(this.getAttribute('posicao') || this.getAttribute('position'));
    const texto = this.getAttribute('texto') || this.getAttribute('text') || '';
    const textoSpan = this.shadowRoot?.querySelector('.ui-tooltip__texto') as HTMLElement | null;

    this.containerElement.className = `ui-tooltip ui-tooltip--${posicao}`;

    if (textoSpan) {
      textoSpan.textContent = texto;
      textoSpan.style.display = texto ? 'inline' : 'none';
    }

    this.sincronizarDescricao();

    if (visivel) {
      this.abrirBalao();
    } else {
      this.fecharBalao();
    }
  }

  private abrirBalao() {
    // idempotente: só registra os ouvintes globais na transição fechado → aberto
    if (this.ouvintesAberto.size === 0) {
      this.ouvintesAberto.add(document, 'click', this.handleClickOutside);
      this.ouvintesAberto.add(document, 'keydown', this.handleEscape, true);
      this.ouvintesAberto.add(window, 'scroll', this.posicionarBubble, { capture: true, passive: true });
      this.ouvintesAberto.add(window, 'resize', this.posicionarBubble, { passive: true });
    }
    mostrarPopover(this.bubbleElement);
    this.containerElement.classList.add('ui-tooltip--visivel');

    // o layout só existe depois de exibido
    this.cancelarQuadro();
    this._quadro = requestAnimationFrame(() => {
      this._quadro = null;
      this.posicionarBubble();
    });
  }

  private fecharBalao() {
    this.ouvintesAberto.cleanup();
    this.cancelarQuadro();
    ocultarPopover(this.bubbleElement);
    this.containerElement.classList.remove('ui-tooltip--visivel');
  }

  private handleMouseEnter = () => {
    const gatilho = this.lerGatilho();
    if (gatilho === 'hover' || gatilho === 'passar-mouse') {
      this.cancelarOcultar();
      this.mostrar();
    }
  };

  private handleMouseLeave = () => {
    const gatilho = this.lerGatilho();
    if (gatilho === 'hover' || gatilho === 'passar-mouse') {
      // Atraso: atravessar o espaço até o balão não o fecha (o balão está no Shadow DOM do host)
      this.cancelarOcultar();
      this._timerOcultar = setTimeout(() => {
        this._timerOcultar = null;
        this.ocultar();
      }, ATRASO_OCULTAR_MS);
    }
  };

  private cancelarOcultar() {
    if (this._timerOcultar) {
      clearTimeout(this._timerOcultar);
      this._timerOcultar = null;
    }
  }

  /**
   * Escape fecha o tooltip sem mover o foco (WCAG 1.4.13). Ouvido na captura e interrompido,
   * para que dentro de um modal o primeiro Escape feche só o tooltip.
   */
  private handleEscape = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !this.aberto) return;
    e.stopPropagation();
    this.cancelarOcultar();
    this.ocultar();
  };

  /**
   * O balão vive no Shadow DOM, fora do alcance de `aria-describedby` do gatilho (light DOM).
   * O texto é exposto como `aria-description` no gatilho, sem sobrescrever uma descrição do consumidor.
   */
  private sincronizarDescricao() {
    if (!this.isConnected) {
      this.removerDescricao();
      return;
    }
    const gatilho = Array.from(this.children).find((el) => !el.hasAttribute('slot')) as HTMLElement | undefined;
    const descricao = (
      this.getAttribute('texto') || this.getAttribute('text') ||
      this.querySelector('[slot="conteudo"]')?.textContent || ''
    ).replace(/\s+/g, ' ').trim();

    if (this._gatilhoDescrito && this._gatilhoDescrito !== gatilho) this.removerDescricao();
    if (!gatilho) return;

    const descritoPeloConsumidor = this._gatilhoDescrito !== gatilho &&
      (gatilho.hasAttribute('aria-describedby') || gatilho.hasAttribute('aria-description'));
    if (descritoPeloConsumidor) return;

    if (descricao && !this.disabled) {
      gatilho.setAttribute('aria-description', descricao);
      this._gatilhoDescrito = gatilho;
    } else {
      this.removerDescricao();
    }
  }

  private removerDescricao() {
    this._gatilhoDescrito?.removeAttribute('aria-description');
    this._gatilhoDescrito = null;
  }

  /** O clique do gatilho continua chegando aos ancestrais: o "clicar fora" já ignora cliques dentro do host. */
  private handleClick = () => {
    const toque = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const gatilho = this.lerGatilho();
    if (gatilho === 'clique' || gatilho === 'click' || toque) {
      this.aberto = !this.aberto;
    }
  };

  private handleClickOutside = (e: MouseEvent) => {
    if (!e.composedPath().includes(this)) {
      this.ocultar();
    }
  };
}

export class UIPopover extends UITooltip {}

definirCustomElement('ui-tooltip', UITooltip);
definirCustomElement('ui-popover', UIPopover);
