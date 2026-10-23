import estilos from './ui-card.css?inline';
import { ListenerBag } from '../../core/listener-bag';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { escolherOpcao, escolherOpcaoOpcional } from '../../core/opcoes';
import { ehControleInterno, teclaAtivaCard } from './card-interacao';
import { secaoTemConteudo } from './card-secoes';

const ELEVACOES = ['plano', 'elevado', 'destaque'] as const;

/**
 * Cartão de conteúdo com mídia, cabeçalho, corpo e rodapé opcionais; pode ser clicável (vira um botão).
 *
 * @attr {'plano'|'elevado'|'destaque'} elevacao - Profundidade visual (alias `elevation`).
 * @attr {'plano'|'elevado'|'destaque'} variante - Estilo adicional (alias `variant`); valores desconhecidos são ignorados.
 * @attr {boolean} clicavel - Torna o card um botão focável que emite `ui-clique` (alias `clickable`).
 * @attr {boolean} compacto - Reduz os espaçamentos internos (alias `compact`).
 * @attr {boolean} disabled - Desativa a interação e reduz a opacidade.
 * @attr {string} aria-label - Nome acessível do card clicável (um card sem clique não é anunciado como controle).
 * @slot - Corpo do card.
 * @slot midia - Imagem ou vídeo no topo (alias `media`).
 * @slot cabecalho - Título e ações (alias `header`); a seção some quando vazia.
 * @slot rodape - Ações e metadados (alias `footer`); a seção some quando vazia.
 * @csspart base - O contêiner do card.
 * @csspart midia - A seção de mídia.
 * @csspart cabecalho - A seção de cabeçalho.
 * @csspart corpo - A seção do corpo.
 * @csspart rodape - A seção de rodapé.
 * @fires ui-clique - Card clicável ativado por clique, Enter ou Espaço (`detail.id`); também emitido como `ui-click`.
 */
export class UICard extends SafeHTMLElement {
  static get observedAttributes() {
    return [
      'elevacao',
      'elevation',
      'variante',
      'variant',
      'clicavel',
      'clickable',
      'compacto',
      'compact',
      'disabled',
      'aria-label'
    ];
  }

  private cardElement: HTMLDivElement;
  private listeners = new ListenerBag();

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-card" part="base">
        <div class="ui-card__media" part="midia">
          <slot name="midia"></slot>
          <slot name="media"></slot>
        </div>
        <div class="ui-card__header" part="cabecalho">
          <slot name="cabecalho"></slot>
          <slot name="header"></slot>
        </div>
        <div class="ui-card__body" part="corpo">
          <slot></slot>
        </div>
        <div class="ui-card__footer" part="rodape">
          <slot name="rodape"></slot>
          <slot name="footer"></slot>
        </div>
      </div>
    `;

    this.cardElement = shadow.querySelector('.ui-card')!;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.cardElement, 'click', this.handleClick);
    this.listeners.add(this.cardElement, 'keydown', this.handleKeyDown);
    const slots = this.shadowRoot?.querySelectorAll('slot');
    slots?.forEach(s => this.listeners.add(s, 'slotchange', this.handleSlotChange));
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  private handleSlotChange = () => {
    this.syncState();
  };

  /** Leva o foco ao card clicável e habilitado; nos demais casos mantém o comportamento nativo do host. */
  focus(options?: FocusOptions) {
    if (this.clicavel && !this.disabled) this.cardElement.focus(options);
    else super.focus(options);
  }

  get clicavel(): boolean {
    return this.hasAttribute('clicavel') || this.hasAttribute('clickable');
  }

  set clicavel(val: boolean) {
    if (val) {
      this.setAttribute('clicavel', '');
    } else {
      this.removeAttribute('clicavel');
      this.removeAttribute('clickable');
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

  private syncState() {
    const elevacao = escolherOpcao(this.getAttribute('elevacao') || this.getAttribute('elevation'), ELEVACOES, 'plano');
    const variante = escolherOpcaoOpcional(this.getAttribute('variante') || this.getAttribute('variant'), ELEVACOES);
    const isClicavel = this.clicavel;
    const isCompacto = this.hasAttribute('compacto') || this.hasAttribute('compact');
    const isDisabled = this.disabled;

    this.cardElement.className = 'ui-card';
    this.cardElement.classList.add(`ui-card--${elevacao}`);
    if (variante) {
      this.cardElement.classList.add(`ui-card--${variante}`);
    }

    if (isClicavel) {
      this.cardElement.classList.add('ui-card--clicavel');
      // um card clicável é um botão: precisa de papel para ser anunciado e de tabindex só quando habilitado
      this.cardElement.setAttribute('role', 'button');
      this.cardElement.setAttribute('tabindex', isDisabled ? '-1' : '0');
      // o aria-label do host não atravessa o shadow: repassa para o elemento que tem o papel
      const nome = this.getAttribute('aria-label')?.trim();
      if (nome) this.cardElement.setAttribute('aria-label', nome);
      else this.cardElement.removeAttribute('aria-label');
    } else {
      this.cardElement.removeAttribute('role');
      this.cardElement.removeAttribute('tabindex');
      this.cardElement.removeAttribute('aria-label');
    }
    if (isDisabled) this.cardElement.setAttribute('aria-disabled', 'true');
    else this.cardElement.removeAttribute('aria-disabled');

    if (isCompacto) {
      this.cardElement.classList.add('ui-card--compacto');
    }

    if (isDisabled) {
      this.cardElement.classList.add('ui-card--disabled');
    }

    // Ocultar seções de slots se não tiverem elementos atribuídos
    const headerSlot = this.shadowRoot?.querySelector('.ui-card__header') as HTMLElement | null;
    const footerSlot = this.shadowRoot?.querySelector('.ui-card__footer') as HTMLElement | null;
    const mediaSlot = this.shadowRoot?.querySelector('.ui-card__media') as HTMLElement | null;

    const hasSlotContent = (slotNames: string[]) => secaoTemConteudo(this.shadowRoot, this, slotNames);

    if (mediaSlot) {
      mediaSlot.style.display = hasSlotContent(['midia', 'media']) ? 'block' : 'none';
    }

    if (headerSlot) {
      headerSlot.style.display = hasSlotContent(['cabecalho', 'header']) ? 'flex' : 'none';
    }

    if (footerSlot) {
      footerSlot.style.display = hasSlotContent(['rodape', 'footer']) ? 'flex' : 'none';
    }
  }

  private handleClick = (e?: Event) => {
    if (this.disabled || !this.clicavel) return;
    // controles internos têm o próprio clique; o `role=button` da base do card não conta como controle interno
    if (e && ehControleInterno(e.target, this)) return;
    this.emitirClique();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.clicavel || this.disabled || !teclaAtivaCard(e, this.cardElement)) return;
    e.preventDefault();
    this.emitirClique();
  };

  private emitirClique() {
    const detail = { id: this.id || 'sem-id' };
    this.dispatchEvent(new CustomEvent('ui-click', { detail, bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('ui-clique', { detail: { ...detail }, bubbles: true, composed: true }));
  }
}

definirCustomElement('ui-card', UICard);
