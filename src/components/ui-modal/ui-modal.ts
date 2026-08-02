import estilos from './ui-modal.css?inline';

export class UIModal extends HTMLElement {
  static get observedAttributes() {
    return [
      'aberto',
      'open',
      'titulo',
      'title',
      'bottom-sheet',
      'bloquear-fechamento'
    ];
  }

  private backdropElement: HTMLDivElement;
  private dialogElement: HTMLDivElement;
  private tituloElement: HTMLHeadingElement;
  private closeElement: HTMLButtonElement;
  private _elementoGatilho: HTMLElement | null = null;
  private _focables: HTMLElement[] = [];

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-modal__backdrop"></div>
      <div class="ui-modal__dialog" role="dialog" aria-modal="true" tabindex="-1">
        <div class="ui-modal__handle"></div>
        <div class="ui-modal__header">
          <h3 class="ui-modal__titulo"></h3>
          <button class="ui-modal__close" title="Fechar (Esc)">✕</button>
        </div>
        <div class="ui-modal__body">
          <slot></slot>
        </div>
        <div class="ui-modal__footer">
          <slot name="rodape"></slot>
          <slot name="footer"></slot>
        </div>
      </div>
    `;

    this.backdropElement = shadow.querySelector('.ui-modal__backdrop')!;
    this.dialogElement = shadow.querySelector('.ui-modal__dialog')!;
    this.tituloElement = shadow.querySelector('.ui-modal__titulo')!;
    this.closeElement = shadow.querySelector('.ui-modal__close')!;
  }

  connectedCallback() {
    this.backdropElement.addEventListener('click', this.handleBackdropClick);
    this.closeElement.addEventListener('click', this.handleCloseClick);
    window.addEventListener('keydown', this.handleKeyDown);
    this.syncState();
  }

  disconnectedCallback() {
    this.backdropElement.removeEventListener('click', this.handleBackdropClick);
    this.closeElement.removeEventListener('click', this.handleCloseClick);
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.aberto) {
      document.body.style.overflow = '';
    }
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

  public abrir() {
    if (!this.aberto) {
      // Salvar quem disparou o modal
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
      // Aguardar render para capturar os focusables e focar o primeiro
      setTimeout(() => {
        this._atualizarFocables();
        if (this._focables.length > 0) {
          this._focables[0].focus();
        } else {
          this.dialogElement.focus();
        }
      }, 0);
    }
  }

  public fechar() {
    if (this.hasAttribute('bloquear-fechamento')) return;
    if (this.aberto) {
      this.aberto = false;
      this.dispatchEvent(
        new CustomEvent('ui-fechar', {
          bubbles: true,
          composed: true,
        })
      );
      // Restaurar o foco
      if (this._elementoGatilho) {
        this._elementoGatilho.focus();
        this._elementoGatilho = null;
      }
    }
  }

  private syncState() {
    const isAberto = this.aberto;
    const tituloText = this.getAttribute('titulo') || this.getAttribute('title') || '';
    const footerSlot = this.shadowRoot?.querySelector('.ui-modal__footer') as HTMLElement | null;

    // Acessibilidade
    this.dialogElement.setAttribute('aria-hidden', String(!isAberto));

    // Título
    if (tituloText) {
      this.tituloElement.textContent = tituloText;
      this.tituloElement.style.display = 'block';
    } else {
      this.tituloElement.style.display = 'none';
    }

    // Ocultar rodapé se não houver elementos atribuídos
    if (footerSlot) {
      const hasFooter = this.querySelector('[slot="rodape"], [slot="footer"]');
      footerSlot.style.display = hasFooter ? 'flex' : 'none';
    }

    // Bloquear rolagem do corpo da página ao abrir
    if (isAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  private handleBackdropClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.fechar();
  };

  private handleCloseClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.fechar();
  };

  private _atualizarFocables() {
    // Busca por elementos focáveis no shadow dom e light dom associado
    const focusableSelectors = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';

    // Obter focáveis do Shadow DOM
    let shadowFocables = Array.from(this.shadowRoot!.querySelectorAll(focusableSelectors)) as HTMLElement[];
    // Remover elementos que estão explicitamente display: none
    shadowFocables = shadowFocables.filter(el => window.getComputedStyle(el).display !== 'none');

    // Obter focáveis do Light DOM (slotted content)
    const slotElements = this.shadowRoot!.querySelectorAll('slot');
    let lightFocables: HTMLElement[] = [];
    slotElements.forEach(slot => {
      const assigned = slot.assignedElements({ flatten: true });
      assigned.forEach(node => {
        if (node instanceof HTMLElement) {
          if (node.matches(focusableSelectors)) {
            lightFocables.push(node);
          }
          lightFocables.push(...Array.from(node.querySelectorAll(focusableSelectors)) as HTMLElement[]);
        }
      });
    });

    this._focables = [...shadowFocables, ...lightFocables].filter(el => {
      // Filter out disabled elements
      return !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
    });
  }

  private _isTopMostModal(): boolean {
    const modaisAbertos = Array.from(document.querySelectorAll('ui-modal[aberto], ui-modal[open], ui-dialog[aberto], ui-dialog[open]'));
    return modaisAbertos[modaisAbertos.length - 1] === this;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.aberto) return;

    // Process keyboard events only if this modal is the top-most active modal
    if (!this._isTopMostModal()) return;

    if (e.key === 'Escape') {
      this.fechar();
      e.stopImmediatePropagation();
    } else if (e.key === 'Tab') {
      this._atualizarFocables();
      if (this._focables.length === 0) {
        e.preventDefault();
        return;
      }

      const firstFocable = this._focables[0];
      const lastFocable = this._focables[this._focables.length - 1];

      // Pegar elemento ativo considerando Light e Shadow DOM
      const activeEl = (this.getRootNode() as Document | ShadowRoot).activeElement;

      if (e.shiftKey) {
        if (activeEl === firstFocable || !this.contains(activeEl as Node) && !this.shadowRoot?.contains(activeEl as Node)) {
          e.preventDefault();
          lastFocable.focus();
        }
      } else {
        if (activeEl === lastFocable || !this.contains(activeEl as Node) && !this.shadowRoot?.contains(activeEl as Node)) {
          e.preventDefault();
          firstFocable.focus();
        }
      }
    }
  };
}

export class UIDialog extends UIModal {}

if (!customElements.get('ui-modal')) {
  customElements.define('ui-modal', UIModal);
}

if (!customElements.get('ui-dialog')) {
  customElements.define('ui-dialog', UIDialog);
}
