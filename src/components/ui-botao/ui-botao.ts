import estilos from './ui-botao.css?inline';
import { ListenerBag } from '../../core/listener-bag';

export type VarianteBotao = 
  | 'primary' | 'primario'
  | 'secondary' | 'secundario'
  | 'ghost' | 'terciario'
  | 'destructive' | 'destrutivo' | 'erro'
  | 'icon-only' | 'icone'
  | 'destaque'
  | 'outline' | 'borda';

export class UIBotao extends HTMLElement {
  static get observedAttributes() {
    return ['disabled', 'variante', 'carregando', 'loading', 'estado', 'tamanho', 'size', 'altura', 'height', 'densidade'];
  }

  private button: HTMLButtonElement;
  private spinnerContainer: HTMLSpanElement;
  private slotElement: HTMLSlotElement;
  private opticalState: 'icon-start' | 'icon-end' | 'icon-only' | null = null;
  private listeners = new ListenerBag();

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <button class="ui-botao-primario" type="button">
        <span class="ui-botao-primario__spinner-container" style="display: none;">
          <svg class="ui-botao-primario__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2 a 10 10 0 0 1 10 10"></path>
          </svg>
        </span>
        <slot></slot>
      </button>
    `;
    this.button = shadow.querySelector('button')!;
    this.spinnerContainer = shadow.querySelector('.ui-botao-primario__spinner-container')!;
    this.slotElement = shadow.querySelector('slot')!;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.button, 'click', this.handleClick);
    this.listeners.add(this.slotElement, 'slotchange', this.handleSlotChange);
    this.sanitizeAndBalanceContent();
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  get carregando(): boolean {
    return this.hasAttribute('carregando') || this.hasAttribute('loading');
  }

  set carregando(val: boolean) {
    if (val) {
      this.setAttribute('carregando', '');
    } else {
      this.removeAttribute('carregando');
      this.removeAttribute('loading');
    }
  }

  private handleSlotChange = () => {
    this.sanitizeAndBalanceContent();
    this.syncState();
  };

  /**
   * Remove espaços e quebras de linha fantasmas no slot e identifica
   * se há ícone no início ou fim para aplicar compensação óptica de padding.
   */
  private sanitizeAndBalanceContent() {
    const isIconNode = (node: Node): boolean => {
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'ui-icone' || tag === 'svg' || tag === 'i') return true;
      if (el.hasAttribute('data-icon') || el.classList.contains('icon') || el.classList.contains('icone')) return true;
      const className = typeof el.className === 'string' ? el.className : '';
      if (/\b(fa[srlb]?|fa-[\w-]+|lucide|tabler)\b/i.test(className)) return true;
      return false;
    };

    const nodes = this.slotElement ? this.slotElement.assignedNodes() : Array.from(this.childNodes);
    const meaningfulNodes: Node[] = [];

    // Higienização de whitespace fantasma entre nós
    for (let i = 0; i < nodes.length; i++) {
      const current = nodes[i];
      if (current.nodeType === Node.TEXT_NODE) {
        const text = current.textContent || '';
        if (!text.trim()) {
          // Espaço fantasma puro entre elementos
          if (nodes.length > 1) {
            current.textContent = '';
          }
        } else {
          // Remove espaços excedentes adjacentes a ícones
          const prev = nodes[i - 1];
          if (prev && isIconNode(prev)) {
            current.textContent = text.replace(/^\s+/, '');
          }
          const next = nodes[i + 1];
          if (next && isIconNode(next)) {
            current.textContent = (current.textContent || '').replace(/\s+$/, '');
          }
          if ((current.textContent || '').trim().length > 0) {
            meaningfulNodes.push(current);
          }
        }
      } else if (current.nodeType === Node.ELEMENT_NODE) {
        meaningfulNodes.push(current);
      }
    }

    if (meaningfulNodes.length >= 2) {
      if (isIconNode(meaningfulNodes[0])) {
        this.opticalState = 'icon-start';
      } else if (isIconNode(meaningfulNodes[meaningfulNodes.length - 1])) {
        this.opticalState = 'icon-end';
      } else {
        this.opticalState = null;
      }
    } else if (meaningfulNodes.length === 1) {
      const first = meaningfulNodes[0];
      if (isIconNode(first)) {
        this.opticalState = 'icon-only';
      } else if (first.nodeType === Node.ELEMENT_NODE) {
        const el = first as Element;
        // Suporte quando o desenvolvedor usou um wrapper interno (ex: div.cm-header-btn)
        if (el.children.length >= 2) {
          if (isIconNode(el.firstElementChild!)) {
            this.opticalState = 'icon-start';
          } else if (isIconNode(el.lastElementChild!)) {
            this.opticalState = 'icon-end';
          } else {
            this.opticalState = null;
          }
        } else if (el.children.length === 1 && isIconNode(el.firstElementChild!)) {
          this.opticalState = 'icon-only';
        } else {
          this.opticalState = null;
        }
      } else {
        this.opticalState = null;
      }
    } else {
      this.opticalState = null;
    }
  }

  private syncState() {
    const altura = this.getAttribute('altura') || this.getAttribute('height');
    if (altura) {
      this.style.setProperty('--ui-campo-altura', isNaN(Number(altura)) ? altura : `${altura}px`);
    } else {
      this.style.removeProperty('--ui-campo-altura');
    }

    const isCarregando = this.carregando;
    const isDisabled = this.hasAttribute('disabled') || isCarregando;
    const variante = this.getAttribute('variante') || 'primario';
    const estadoForcado = this.getAttribute('estado');

    this.button.disabled = isDisabled;
    this.spinnerContainer.style.display = isCarregando ? 'inline-flex' : 'none';

    const classes = ['ui-botao-primario', `ui-botao-primario--${variante}`];

    if (isDisabled && !isCarregando) {
      classes.push('ui-botao-primario--disabled');
    }

    if (isCarregando) {
      classes.push('ui-botao-primario--carregando');
    }

    if (estadoForcado) {
      classes.push(`ui-botao-primario--${estadoForcado}`);
    }

    if (this.opticalState === 'icon-start') {
      classes.push('ui-botao-primario--has-icon-start');
    } else if (this.opticalState === 'icon-end') {
      classes.push('ui-botao-primario--has-icon-end');
    }

    if (this.opticalState === 'icon-only' || variante === 'icon-only' || variante === 'icone') {
      classes.push('ui-botao-primario--icon-only');
    }

    this.button.className = classes.join(' ');
  }

  private handleClick = (e: MouseEvent) => {
    if (this.hasAttribute('disabled') || this.carregando) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    this.dispatchEvent(new CustomEvent('ui-click', { detail: { originalEvent: e }, bubbles: true, composed: true }));

    const form = this.closest('form');
    if (form) {
      if (this.hasAttribute('tipo-reset') || this.getAttribute('type') === 'reset') {
        form.reset();
      } else if (this.hasAttribute('tipo-submit') || this.getAttribute('type') === 'submit') {
        try {
          form.requestSubmit(this.button);
        } catch {
          form.requestSubmit();
        }
      }
    }
  };
}

export class UIBotaoPrimario extends UIBotao {}

if (!customElements.get('ui-botao')) {
  customElements.define('ui-botao', UIBotao);
}

if (!customElements.get('ui-botao-primario')) {
  customElements.define('ui-botao-primario', UIBotaoPrimario);
}
