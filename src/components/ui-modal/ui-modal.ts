import estilos from './ui-modal.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { empilharModal, desempilharModal, ehModalDoTopo } from './modal-pilha';

const SELETORES_FOCAVEIS = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"]), ui-campo-texto, ui-input, ui-botao, ui-botao-primario, ui-checkbox, ui-switch, ui-lista-flutuante, ui-radio, ui-select, ui-segmented';

/** Elemento realmente focado, atravessando Shadow DOMs (ex.: o <button> interno de um <ui-botao>). */
function elementoAtivoProfundo(): HTMLElement | null {
  let ativo = document.activeElement as HTMLElement | null;
  while (ativo?.shadowRoot?.activeElement) {
    ativo = ativo.shadowRoot.activeElement as HTMLElement;
  }
  return ativo;
}

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
  private _elementoGatilho: HTMLElement | null = null;
  private _focables: HTMLElement[] = [];
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
    this.backdropElement.addEventListener('click', this.handleBackdropClick);
    this.closeElement.addEventListener('click', this.handleCloseClick);
    window.addEventListener('keydown', this.handleKeyDown);

    const slotElements = this.shadowRoot!.querySelectorAll('slot');
    slotElements.forEach(slot => {
      slot.addEventListener('slotchange', this.handleSlotChange);
    });

    this.syncState();
  }

  disconnectedCallback() {
    this.backdropElement.removeEventListener('click', this.handleBackdropClick);
    this.closeElement.removeEventListener('click', this.handleCloseClick);
    window.removeEventListener('keydown', this.handleKeyDown);

    const slotElements = this.shadowRoot!.querySelectorAll('slot');
    slotElements.forEach(slot => {
      slot.removeEventListener('slotchange', this.handleSlotChange);
    });

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
      if (this._estaAberto) this.focarConteudoInicial();
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

  /**
   * Foco inicial: `[autofocus]`, senão o primeiro controle do conteúdo/rodapé.
   * O botão "✕" não recebe o foco inicial, evitando fechar o modal com um Enter acidental;
   * sem controles, o próprio diálogo é focado para que o leitor de tela anuncie o título.
   */
  private focarConteudoInicial() {
    const conteudo = this.obterFocaveisDoConteudo();
    const comAutofocus = conteudo.filter((el) => el.hasAttribute('autofocus'));

    for (const candidato of [...comAutofocus, ...conteudo]) {
      candidato.focus();
      const ativo = document.activeElement;
      if (ativo === candidato || candidato.contains(ativo)) return;
    }
    this.dialogElement.focus();
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

  private static ehFocavel(el: HTMLElement): boolean {
    return !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
  }

  /** Focáveis do conteúdo projetado (corpo e rodapé), na ordem dos slots. */
  private obterFocaveisDoConteudo(): HTMLElement[] {
    const focaveis: HTMLElement[] = [];
    this.shadowRoot!.querySelectorAll('slot').forEach(slot => {
      slot.assignedElements({ flatten: true }).forEach(node => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches(SELETORES_FOCAVEIS)) focaveis.push(node);
        focaveis.push(...Array.from(node.querySelectorAll<HTMLElement>(SELETORES_FOCAVEIS)));
      });
    });
    return focaveis.filter(UIModal.ehFocavel);
  }

  private _atualizarFocables() {
    // Focáveis do próprio Shadow DOM (botão fechar), exceto os ocultos
    const shadowFocables = Array.from(this.shadowRoot!.querySelectorAll<HTMLElement>(SELETORES_FOCAVEIS))
      .filter(el => window.getComputedStyle(el).display !== 'none' && UIModal.ehFocavel(el));

    this._focables = [...shadowFocables, ...this.obterFocaveisDoConteudo()];
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this._estaAberto) return;

    // Apenas o modal aberto por último responde ao teclado
    if (!ehModalDoTopo(this)) return;

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

definirCustomElement('ui-modal', UIModal);
definirCustomElement('ui-dialog', UIDialog);
