import estilos from './ui-modal.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ListenerBag } from '../../core/listener-bag';
import { empilharModal, desempilharModal, ehModalDoTopo } from './modal-pilha';
import { elementoAtivoProfundo, focarConteudoInicial, prenderTab } from './modal-foco';

export class UIModal extends SafeHTMLElement {
  static get observedAttributes() {
    return [
      'aberto',
      'open',
      'titulo',
      'title',
      'aria-label',
      'aria-labelledby',
      'rotulo',
      'bottom-sheet',
      'bloquear-fechamento'
    ];
  }

  private backdropElement: HTMLDivElement;
  private dialogElement: HTMLDivElement;
  private tituloElement: HTMLHeadingElement;
  private closeElement: HTMLButtonElement;
  private ouvintes = new ListenerBag();
  private _elementoGatilho: HTMLElement | null = null;
  private _tituloId: string;
  /** Estado já aplicado (pilha, inert, scroll, eventos); difere de `aberto` durante uma transição. */
  private _estaAberto = false;

  constructor() {
    super();
    this._tituloId = `ui-modal-title-${Math.random().toString(36).substring(2, 9)}`;
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-modal__backdrop" part="fundo"></div>
      <div class="ui-modal__dialog" part="painel" role="dialog" aria-modal="true" aria-labelledby="${this._tituloId}" tabindex="-1">
        <div class="ui-modal__handle"></div>
        <div class="ui-modal__header" part="cabecalho">
          <h3 class="ui-modal__titulo" part="titulo" id="${this._tituloId}"></h3>
          <button class="ui-modal__close" part="fechar" type="button" aria-label="Fechar modal" title="Fechar">✕</button>
        </div>
        <div class="ui-modal__body" part="corpo">
          <slot></slot>
        </div>
        <div class="ui-modal__footer" part="rodape">
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
    this.ouvintes.cleanup();
    this.ouvintes.add(this.backdropElement, 'click', this.handleBackdropClick);
    this.ouvintes.add(this.closeElement, 'click', this.handleCloseClick);
    this.ouvintes.add(window, 'keydown', this.handleKeyDown);
    this.shadowRoot!.querySelectorAll('slot').forEach((slot) => {
      this.ouvintes.add(slot, 'slotchange', this.handleSlotChange);
    });

    this.syncState();
  }

  disconnectedCallback() {
    this.ouvintes.cleanup();

    if (this._estaAberto) {
      this._estaAberto = false;
      desempilharModal(this);
    }
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
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
  }

  public abrir() {
    this.aberto = true;
  }

  /** Fecha o modal, exceto com `bloquear-fechamento` (remova o atributo ou use `aberto = false` para forçar). */
  public fechar() {
    if (this.hasAttribute('bloquear-fechamento')) return;
    this.aberto = false;
  }

  /**
   * Abrir/fechar pelo método, pela propriedade ou pelo atributo (`aberto`/`open`, comum em
   * React/Vue) passa sempre por aqui: mesmos eventos, mesmo foco e mesma camada de inert.
   */
  private aoAbrir() {
    this._estaAberto = true;
    const ativo = elementoAtivoProfundo();
    this._elementoGatilho = ativo && ativo !== document.body && !this.contains(ativo) ? ativo : null;

    empilharModal(this);
    this.dispatchEvent(new CustomEvent('ui-abrir', { bubbles: true, composed: true }));

    // Aguarda o slot ser renderizado para localizar o conteúdo focável
    setTimeout(() => {
      if (this._estaAberto) focarConteudoInicial(this.shadowRoot!, this.dialogElement);
    }, 0);
  }

  private aoFechar() {
    this._estaAberto = false;
    desempilharModal(this);
    this.dispatchEvent(new CustomEvent('ui-fechar', { bubbles: true, composed: true }));

    // Devolve o foco ao gatilho, a menos que a aplicação já o tenha movido para outro lugar
    const gatilho = this._elementoGatilho;
    this._elementoGatilho = null;
    const ativo = document.activeElement;
    const focoPerdido = !ativo || ativo === document.body || ativo === this || this.contains(ativo);
    if (gatilho?.isConnected && focoPerdido) {
      gatilho.focus();
    }
  }

  private syncState() {
    const isAberto = this.aberto;
    const tituloText = this.getAttribute('titulo') || this.getAttribute('title') || '';
    const footerSlot = this.shadowRoot?.querySelector('.ui-modal__footer') as HTMLElement | null;

    // Acessibilidade semântica WAI-ARIA
    this.dialogElement.setAttribute('aria-hidden', String(!isAberto));

    const ariaLabel = this.getAttribute('aria-label') || this.getAttribute('rotulo');
    const ariaLabelledby = this.getAttribute('aria-labelledby');

    if (ariaLabel) {
      this.dialogElement.setAttribute('aria-label', ariaLabel);
      this.dialogElement.removeAttribute('aria-labelledby');
    } else if (ariaLabelledby) {
      this.dialogElement.setAttribute('aria-labelledby', ariaLabelledby);
      this.dialogElement.removeAttribute('aria-label');
    } else if (tituloText) {
      this.tituloElement.textContent = tituloText;
      this.tituloElement.style.display = 'block';
      this.dialogElement.setAttribute('aria-labelledby', this._tituloId);
      this.dialogElement.removeAttribute('aria-label');
    } else {
      this.tituloElement.style.display = 'none';
      this.dialogElement.removeAttribute('aria-labelledby');
      this.dialogElement.setAttribute('aria-label', 'Diálogo modal');
    }

    // Ocultar rodapé se não houver elementos atribuídos
    if (footerSlot) {
      const footerSlots = Array.from(this.shadowRoot?.querySelectorAll('slot[name="rodape"], slot[name="footer"]') || []) as HTMLSlotElement[];
      const hasFooterContent = footerSlots.some(s => {
        const nodes = s.assignedNodes({ flatten: true });
        return nodes.some(node => node.nodeType === Node.ELEMENT_NODE || (node.textContent && node.textContent.trim() !== ''));
      }) || this.querySelector('[slot="rodape"], [slot="footer"]') !== null;

      footerSlot.style.display = hasFooterContent ? 'flex' : 'none';
    }

    // Transição de estado (inert, bloqueio de rolagem, eventos e foco) só com o elemento no documento
    if (this.isConnected && isAberto !== this._estaAberto) {
      if (isAberto) this.aoAbrir();
      else this.aoFechar();
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
    if (!this._estaAberto) return;

    // Apenas o modal aberto por último responde ao teclado
    if (!ehModalDoTopo(this)) return;

    if (e.key === 'Escape') {
      this.fechar();
      e.stopImmediatePropagation();
    } else if (e.key === 'Tab') {
      prenderTab(e, this, this.shadowRoot!);
    }
  };
}

export class UIDialog extends UIModal {}

definirCustomElement('ui-modal', UIModal);
definirCustomElement('ui-dialog', UIDialog);
