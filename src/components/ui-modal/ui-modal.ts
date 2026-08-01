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

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-modal__backdrop"></div>
      <div class="ui-modal__dialog" role="dialog" aria-modal="true">
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
      this.aberto = true;
      this.dispatchEvent(
        new CustomEvent('ui-abrir', {
          bubbles: true,
          composed: true,
        })
      );
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
    }
  }

  private syncState() {
    const isAberto = this.aberto;
    const tituloText = this.getAttribute('titulo') || this.getAttribute('title') || '';
    const headerSlot = this.shadowRoot?.querySelector('.ui-modal__header') as HTMLElement | null;
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

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.aberto) {
      this.fechar();
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
