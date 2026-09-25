import estilos from './ui-alerta.css?inline';
import { ListenerBag } from '../../core/listener-bag';

export const ICONES_ALERTA: Record<string, string> = {
  sucesso: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  erro: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  alerta: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  info: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
};

export class UIAlerta extends HTMLElement {
  static get observedAttributes() {
    return [
      'tipo',
      'variante',
      'variant',
      'titulo',
      'title',
      'mensagem',
      'fechavel',
      'dismissible'
    ];
  }

  protected alertaElement: HTMLDivElement;
  protected iconeElement: HTMLSpanElement;
  protected tituloElement: HTMLHeadingElement;
  protected mensagemElement: HTMLParagraphElement;
  protected mensagemTextoElement: HTMLSpanElement;
  protected closeElement: HTMLButtonElement;
  protected acoesElement: HTMLDivElement;
  protected botaoAcaoElement: HTMLButtonElement;
  protected progressoContainer: HTMLDivElement;
  protected progressoBarra: HTMLDivElement;
  protected listeners = new ListenerBag();

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-alerta" role="alert">
        <span class="ui-alerta__icone"></span>
        <div class="ui-alerta__conteudo">
          <h4 class="ui-alerta__titulo" style="display: none;"></h4>
          <p class="ui-alerta__mensagem">
            <span class="ui-alerta__mensagem-texto" style="display: none;"></span>
            <slot></slot>
          </p>
        </div>
        <div class="ui-alerta__acoes" style="display: none;">
          <button type="button" class="ui-alerta__botao-acao"></button>
        </div>
        <button class="ui-alerta__close" type="button" aria-label="Fechar alerta" style="display: none;" title="Fechar">✕</button>
        <div class="ui-toast__progresso" style="display: none;">
          <div class="ui-toast__progresso-barra"></div>
        </div>
      </div>
    `;

    this.alertaElement = shadow.querySelector('.ui-alerta')!;
    this.iconeElement = shadow.querySelector('.ui-alerta__icone')!;
    this.tituloElement = shadow.querySelector('.ui-alerta__titulo')!;
    this.mensagemElement = shadow.querySelector('.ui-alerta__mensagem')!;
    this.mensagemTextoElement = shadow.querySelector('.ui-alerta__mensagem-texto')!;
    this.closeElement = shadow.querySelector('.ui-alerta__close')!;
    this.acoesElement = shadow.querySelector('.ui-alerta__acoes')!;
    this.botaoAcaoElement = shadow.querySelector('.ui-alerta__botao-acao')!;
    this.progressoContainer = shadow.querySelector('.ui-toast__progresso')!;
    this.progressoBarra = shadow.querySelector('.ui-toast__progresso-barra')!;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.closeElement, 'click', () => this.fechar());
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  public fechar(): void {
    this.dispatchEvent(
      new CustomEvent('ui-fechar', {
        bubbles: true,
        composed: true,
      })
    );
    this.remove();
  }

  protected syncState() {
    const tipo = this.getAttribute('tipo') || this.getAttribute('variante') || this.getAttribute('variant') || 'info';
    const tituloText = this.getAttribute('titulo') || this.getAttribute('title');
    const mensagemText = this.getAttribute('mensagem');
    const isFechavel = this.hasAttribute('fechavel') || this.hasAttribute('dismissible');

    // Estilo e Tipo
    this.alertaElement.className = `ui-alerta ui-alerta--${tipo}`;

    // Ícone SVG
    const iconeSvg = ICONES_ALERTA[tipo] || ICONES_ALERTA['info'];
    this.iconeElement.innerHTML = iconeSvg;

    // Título
    if (tituloText) {
      this.tituloElement.textContent = tituloText;
      this.tituloElement.style.display = 'block';
    } else {
      this.tituloElement.style.display = 'none';
      this.tituloElement.textContent = '';
    }

    // Mensagem via atributo
    if (mensagemText) {
      this.mensagemTextoElement.textContent = mensagemText;
      this.mensagemTextoElement.style.display = 'inline';
    } else {
      this.mensagemTextoElement.style.display = 'none';
      this.mensagemTextoElement.textContent = '';
    }

    // Botão de fechar
    if (isFechavel) {
      this.closeElement.style.display = 'block';
    } else {
      this.closeElement.style.display = 'none';
    }
  }
}

if (!customElements.get('ui-alerta')) {
  customElements.define('ui-alerta', UIAlerta);
}
