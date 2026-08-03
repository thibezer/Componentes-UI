import estilos from './ui-tooltip.css?inline';

export class UITooltip extends HTMLElement {
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

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-tooltip ui-tooltip--topo">
        <slot></slot>
        <div class="ui-tooltip__bubble" role="tooltip" popover="manual">
          <span class="ui-tooltip__texto"></span>
          <slot name="conteudo"></slot>
          <span class="ui-tooltip__arrow"></span>
        </div>
      </div>
    `;

    this.containerElement = shadow.querySelector('.ui-tooltip')!;
    this.bubbleElement = shadow.querySelector('.ui-tooltip__bubble')!;
  }

  connectedCallback() {
    this.addEventListener('mouseenter', this.handleMouseEnter);
    this.addEventListener('mouseleave', this.handleMouseLeave);
    this.addEventListener('focusin', this.handleMouseEnter);
    this.addEventListener('focusout', this.handleMouseLeave);
    this.addEventListener('click', this.handleClick);
    document.addEventListener('click', this.handleClickOutside);
    this.syncState();
  }

  disconnectedCallback() {
    this.removeEventListener('mouseenter', this.handleMouseEnter);
    this.removeEventListener('mouseleave', this.handleMouseLeave);
    this.removeEventListener('focusin', this.handleMouseEnter);
    this.removeEventListener('focusout', this.handleMouseLeave);
    this.removeEventListener('click', this.handleClick);
    document.removeEventListener('click', this.handleClickOutside);
    
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

  private posicionarBubble = () => {
    if (!this.aberto) return;

    const hostRect = this.getBoundingClientRect();
    const bubbleRect = this.bubbleElement.getBoundingClientRect();
    const posicaoRaw = this.getAttribute('posicao') || this.getAttribute('position') || 'topo';

    let posicao = 'topo';
    if (['topo', 'top'].includes(posicaoRaw)) posicao = 'topo';
    else if (['baixo', 'bottom'].includes(posicaoRaw)) posicao = 'baixo';
    else if (['esquerda', 'left'].includes(posicaoRaw)) posicao = 'esquerda';
    else if (['direita', 'right'].includes(posicaoRaw)) posicao = 'direita';

    let top = 0;
    let left = 0;
    const offset = 8; // tooltip arrow + margin

    if (posicao === 'topo') {
      top = hostRect.top - bubbleRect.height - offset;
      left = hostRect.left + (hostRect.width / 2) - (bubbleRect.width / 2);
    } else if (posicao === 'baixo') {
      top = hostRect.bottom + offset;
      left = hostRect.left + (hostRect.width / 2) - (bubbleRect.width / 2);
    } else if (posicao === 'esquerda') {
      top = hostRect.top + (hostRect.height / 2) - (bubbleRect.height / 2);
      left = hostRect.left - bubbleRect.width - offset;
    } else if (posicao === 'direita') {
      top = hostRect.top + (hostRect.height / 2) - (bubbleRect.height / 2);
      left = hostRect.right + offset;
    }

    // fallback bounds (não vazar da tela)
    left = Math.max(8, Math.min(left, window.innerWidth - bubbleRect.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - bubbleRect.height - 8));
    
    this.bubbleElement.style.top = `${top}px`;
    this.bubbleElement.style.left = `${left}px`;
  };

  private syncState() {
    const isAberto = this.aberto;
    const posicaoRaw = this.getAttribute('posicao') || this.getAttribute('position') || 'topo';
    const textoText = this.getAttribute('texto') || this.getAttribute('text') || '';
    const textoSpan = this.shadowRoot?.querySelector('.ui-tooltip__texto') as HTMLElement | null;

    let posicao = 'topo';
    if (['topo', 'top'].includes(posicaoRaw)) posicao = 'topo';
    else if (['baixo', 'bottom'].includes(posicaoRaw)) posicao = 'baixo';
    else if (['esquerda', 'left'].includes(posicaoRaw)) posicao = 'esquerda';
    else if (['direita', 'right'].includes(posicaoRaw)) posicao = 'direita';

    this.containerElement.className = `ui-tooltip ui-tooltip--${posicao}`;

    if (textoSpan) {
      if (textoText) {
        textoSpan.textContent = textoText;
        textoSpan.style.display = 'inline';
      } else {
        textoSpan.style.display = 'none';
      }
    }

    if (isAberto) {
      if (typeof (this.bubbleElement as any).showPopover === 'function') {
        try { (this.bubbleElement as any).showPopover(); } catch(_e) {}
      }
      this.containerElement.classList.add('ui-tooltip--visivel');
      
      // Calculate layout after the element is displayed
      requestAnimationFrame(() => {
        this.posicionarBubble();
      });

      window.addEventListener('scroll', this.posicionarBubble, { capture: true, passive: true });
      window.addEventListener('resize', this.posicionarBubble, { passive: true });
    } else {
      if (typeof (this.bubbleElement as any).hidePopover === 'function') {
        try { (this.bubbleElement as any).hidePopover(); } catch(_e) {}
      }
      this.containerElement.classList.remove('ui-tooltip--visivel');
      window.removeEventListener('scroll', this.posicionarBubble, { capture: true });
      window.removeEventListener('resize', this.posicionarBubble);
    }
  }

  private handleMouseEnter = () => {
    const gatilho = this.getAttribute('gatilho') || this.getAttribute('trigger') || 'hover';
    if (gatilho === 'hover' || gatilho === 'passar-mouse') {
      this.mostrar();
    }
  };

  private handleMouseLeave = () => {
    const gatilho = this.getAttribute('gatilho') || this.getAttribute('trigger') || 'hover';
    if (gatilho === 'hover' || gatilho === 'passar-mouse') {
      this.ocultar();
    }
  };

  private handleClick = (e: MouseEvent) => {
    const gatilho = this.getAttribute('gatilho') || this.getAttribute('trigger') || 'hover';
    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    if (gatilho === 'clique' || gatilho === 'click' || isTouch) {
      e.stopPropagation();
      this.aberto = !this.aberto;
    }
  };

  private handleClickOutside = (e: MouseEvent) => {
    const path = e.composedPath();
    if (!path.includes(this)) {
      this.ocultar();
    }
  };
}

export class UIPopover extends UITooltip {}

if (!customElements.get('ui-tooltip')) {
  customElements.define('ui-tooltip', UITooltip);
}

if (!customElements.get('ui-popover')) {
  customElements.define('ui-popover', UIPopover);
}
