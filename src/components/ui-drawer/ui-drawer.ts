import estilos from './ui-drawer.css?inline';
import { ListenerBag } from '../../core/listener-bag';
import {
  obterElementosFocaveis,
  isTopMostDrawer,
  gerenciarTabTrap,
  atualizarScrollLockDrawer
} from './drawer-acessibilidade';

export type PosicaoDrawer = 'direita' | 'esquerda' | 'baixo' | 'cima';

export class UIDrawer extends HTMLElement {
  static get observedAttributes() {
    return [
      'aberto',
      'open',
      'posicao',
      'position',
      'titulo',
      'title',
      'descricao',
      'description',
      'largura',
      'width',
      'estatico',
      'static'
    ];
  }

  private backdropElement: HTMLDivElement;
  private painelElement: HTMLElement;
  private tituloElement: HTMLHeadingElement;
  private descricaoElement: HTMLParagraphElement;
  private closeElement: HTMLButtonElement;
  private listeners = new ListenerBag();
  private _elementoGatilho: HTMLElement | null = null;
  private _focables: HTMLElement[] = [];

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-drawer__backdrop"></div>
      <aside class="ui-drawer__painel" role="dialog" aria-modal="true" tabindex="-1">
        <div class="ui-drawer__header">
          <div class="ui-drawer__titulo-container">
            <h3 class="ui-drawer__titulo"></h3>
            <p class="ui-drawer__descricao" style="display: none;"></p>
          </div>
          <button type="button" class="ui-drawer__close" aria-label="Fechar painel lateral" title="Fechar">✕</button>
        </div>
        <div class="ui-drawer__body">
          <slot></slot>
        </div>
        <div class="ui-drawer__footer">
          <slot name="rodape"></slot>
          <slot name="footer"></slot>
        </div>
      </aside>
    `;

    this.backdropElement = shadow.querySelector('.ui-drawer__backdrop')!;
    this.painelElement = shadow.querySelector('.ui-drawer__painel')!;
    this.tituloElement = shadow.querySelector('.ui-drawer__titulo')!;
    this.descricaoElement = shadow.querySelector('.ui-drawer__descricao')!;
    this.closeElement = shadow.querySelector('.ui-drawer__close')!;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.backdropElement, 'click', this.handleBackdropClick);
    this.listeners.add(this.closeElement, 'click', this.handleCloseClick);
    this.listeners.add(window, 'keydown', this.handleKeyDown);

    const slotElements = this.shadowRoot!.querySelectorAll('slot');
    slotElements.forEach(slot => {
      this.listeners.add(slot, 'slotchange', this.handleSlotChange);
    });

    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
    UIDrawer.atualizarScrollLock();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if ((name === 'aberto' || name === 'open') && value !== null) {
      if (document.activeElement && document.activeElement !== document.body) {
        this._elementoGatilho = document.activeElement as HTMLElement;
      }
      setTimeout(() => {
        this._focables = obterElementosFocaveis(this.shadowRoot!, this);
        if (this._focables.length > 0) {
          this._focables[0].focus();
        } else {
          this.painelElement.focus();
        }
      }, 0);
    }
    this.syncState();
  }

  private handleSlotChange = () => {
    this.syncState();
  };

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

  get posicao(): PosicaoDrawer {
    const p = (this.getAttribute('posicao') || this.getAttribute('position') || 'direita').toLowerCase();
    if (p === 'esquerda' || p === 'left') return 'esquerda';
    if (p === 'baixo' || p === 'bottom') return 'baixo';
    if (p === 'cima' || p === 'top') return 'cima';
    return 'direita';
  }

  set posicao(val: PosicaoDrawer) {
    this.setAttribute('posicao', val);
  }

  public abrir() {
    if (!this.aberto) {
      if (document.activeElement && document.activeElement !== document.body) {
        this._elementoGatilho = document.activeElement as HTMLElement;
      }
      this.aberto = true;
      this.dispatchEvent(
        new CustomEvent('ui-abrir', {
          bubbles: true,
          composed: true,
        })
      );
      setTimeout(() => {
        this._focables = obterElementosFocaveis(this.shadowRoot!, this);
        if (this._focables.length > 0) {
          this._focables[0].focus();
        } else {
          this.painelElement.focus();
        }
      }, 0);
    }
  }

  public fechar() {
    if (this.aberto) {
      this.aberto = false;
      this.dispatchEvent(
        new CustomEvent('ui-fechar', {
          bubbles: true,
          composed: true,
        })
      );
      if (this._elementoGatilho) {
        this._elementoGatilho.focus();
        this._elementoGatilho = null;
      }
    }
  }

  public alternar() {
    if (this.aberto) this.fechar();
    else this.abrir();
  }

  private syncState() {
    const isAberto = this.aberto;
    const tituloText = this.getAttribute('titulo') || this.getAttribute('title') || '';
    const descText = this.getAttribute('descricao') || this.getAttribute('description') || '';
    const largura = this.getAttribute('largura') || this.getAttribute('width');
    const footerSlot = this.shadowRoot?.querySelector('.ui-drawer__footer') as HTMLElement | null;

    // Acessibilidade
    this.painelElement.setAttribute('aria-hidden', String(!isAberto));

    // Título e Descrição (seguro com textContent)
    if (tituloText) {
      this.tituloElement.textContent = tituloText;
      this.tituloElement.style.display = 'block';
    } else {
      this.tituloElement.style.display = 'none';
    }

    if (descText) {
      this.descricaoElement.textContent = descText;
      this.descricaoElement.style.display = 'block';
    } else {
      this.descricaoElement.style.display = 'none';
    }

    // Largura inline opcional
    if (largura) {
      this.style.setProperty('--ui-drawer-largura', isNaN(Number(largura)) ? largura : `${largura}px`);
    } else {
      this.style.removeProperty('--ui-drawer-largura');
    }

    // Ocultar rodapé se vazio
    if (footerSlot) {
      const footerSlots = Array.from(this.shadowRoot?.querySelectorAll('slot[name="rodape"], slot[name="footer"]') || []) as HTMLSlotElement[];
      const hasFooterContent = footerSlots.some(s => {
        const nodes = s.assignedNodes({ flatten: true });
        return nodes.some(node => node.nodeType === Node.ELEMENT_NODE || (node.textContent && node.textContent.trim() !== ''));
      }) || this.querySelector('[slot="rodape"], [slot="footer"]') !== null;

      footerSlot.style.display = hasFooterContent ? 'flex' : 'none';
    }

    // Bloqueio de rolagem do body coordenado
    UIDrawer.atualizarScrollLock();
  }

  public static atualizarScrollLock() {
    atualizarScrollLockDrawer();
  }

  private handleBackdropClick = (e: MouseEvent) => {
    e.stopPropagation();
    const isEstatico = this.hasAttribute('estatico') || this.hasAttribute('static');
    if (!isEstatico) {
      this.fechar();
    }
  };

  private handleCloseClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.fechar();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.aberto) return;
    if (!isTopMostDrawer(this)) return;

    if (e.key === 'Escape') {
      const isEstatico = this.hasAttribute('estatico') || this.hasAttribute('static');
      if (!isEstatico) {
        this.fechar();
        e.stopImmediatePropagation();
      }
    } else if (e.key === 'Tab') {
      this._focables = obterElementosFocaveis(this.shadowRoot!, this);
      gerenciarTabTrap(e, this._focables, this, this.shadowRoot!);
    }
  };
}

// Aliases W3C através de subclasses
export class UISheet extends UIDrawer {}
export class UIPainelLateral extends UIDrawer {}
export class UIGaveta extends UIDrawer {}

if (!customElements.get('ui-drawer')) {
  customElements.define('ui-drawer', UIDrawer);
}

if (!customElements.get('ui-sheet')) {
  customElements.define('ui-sheet', UISheet);
}

if (!customElements.get('ui-painel-lateral')) {
  customElements.define('ui-painel-lateral', UIPainelLateral);
}

if (!customElements.get('ui-gaveta')) {
  customElements.define('ui-gaveta', UIGaveta);
}

export * from './drawer-acessibilidade';
