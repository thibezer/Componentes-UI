import estilos from './ui-alerta.css?inline';

const ICONES_ALERTA: Record<string, string> = {
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
  protected closeElement: HTMLButtonElement;

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
            <slot></slot>
          </p>
        </div>
        <button class="ui-alerta__close" style="display: none;" title="Fechar">✕</button>
      </div>
    `;

    this.alertaElement = shadow.querySelector('.ui-alerta')!;
    this.iconeElement = shadow.querySelector('.ui-alerta__icone')!;
    this.tituloElement = shadow.querySelector('.ui-alerta__titulo')!;
    this.mensagemElement = shadow.querySelector('.ui-alerta__mensagem')!;
    this.closeElement = shadow.querySelector('.ui-alerta__close')!;
  }

  connectedCallback() {
    this.closeElement.addEventListener('click', this.fechar);
    this.syncState();
  }

  disconnectedCallback() {
    this.closeElement.removeEventListener('click', this.fechar);
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  public fechar = () => {
    this.dispatchEvent(
      new CustomEvent('ui-fechar', {
        bubbles: true,
        composed: true,
      })
    );
    this.remove();
  };

  protected syncState() {
    const tipo = this.getAttribute('tipo') || this.getAttribute('variante') || this.getAttribute('variant') || 'info';
    const tituloText = this.getAttribute('titulo') || this.getAttribute('title');
    const mensagemText = this.getAttribute('mensagem');
    const isFechavel = this.hasAttribute('fechavel') || this.hasAttribute('dismissible');

    // Variante
    this.alertaElement.className = 'ui-alerta';
    this.alertaElement.classList.add(`ui-alerta--${tipo}`);

    // Ícone
    this.iconeElement.innerHTML = ICONES_ALERTA[tipo] || ICONES_ALERTA.info;

    // Título
    if (tituloText) {
      this.tituloElement.textContent = tituloText;
      this.tituloElement.style.display = 'block';
    } else {
      this.tituloElement.style.display = 'none';
    }

    // Mensagem por atributo (se fornecida)
    if (mensagemText) {
      this.mensagemElement.textContent = mensagemText;
    }

    // Botão de fechar
    if (isFechavel) {
      this.closeElement.style.display = 'block';
    } else {
      this.closeElement.style.display = 'none';
    }
  }
}

export class UIToast extends UIAlerta {
  private timerId: any = null;

  connectedCallback() {
    super.connectedCallback();
    this.alertaElement.classList.add('ui-toast__banner');
    
    const duracaoStr = this.getAttribute('duracao') || this.getAttribute('duration') || '4000';
    const duracao = parseInt(duracaoStr, 10);
    
    if (!isNaN(duracao) && duracao > 0) {
      this.timerId = setTimeout(() => {
        this.fechar();
      }, duracao);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
  }

  private static obterContainer(posicao: string): HTMLElement {
    const containerId = `ui-toast-container-${posicao}`;
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.zIndex = '10000';
      container.style.display = 'flex';
      container.style.gap = '10px';
      container.style.maxWidth = '380px';
      container.style.width = 'calc(100vw - 32px)';
      container.style.pointerEvents = 'none';
      container.style.boxSizing = 'border-box';
      container.style.transition = 'all 0.2s ease';

      if (posicao === 'top-right') {
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.flexDirection = 'column';
      } else {
        // bottom-right (padrão)
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.flexDirection = 'column-reverse'; // Empurra Toasts anteriores para CIMA!
      }
      document.body.appendChild(container);
    }
    return container;
  }

  // Utilitário estático para disparo imperativo de Toasts de qualquer lugar no código
  static notificar(opcoes: {
    tipo?: 'sucesso' | 'erro' | 'alerta' | 'info';
    titulo?: string;
    mensagem: string;
    duracao?: number;
    posicao?: 'bottom-right' | 'top-right';
  }) {
    const posicao = opcoes.posicao || 'bottom-right';
    const toast = document.createElement('ui-toast') as UIToast;
    if (opcoes.tipo) toast.setAttribute('tipo', opcoes.tipo);
    if (opcoes.titulo) toast.setAttribute('titulo', opcoes.titulo);
    if (opcoes.mensagem) toast.setAttribute('mensagem', opcoes.mensagem);
    if (opcoes.duracao) toast.setAttribute('duracao', String(opcoes.duracao));
    toast.setAttribute('posicao', posicao);
    toast.setAttribute('fechavel', '');

    const container = UIToast.obterContainer(posicao);
    container.appendChild(toast);
    return toast;
  }
}

if (!customElements.get('ui-alerta')) {
  customElements.define('ui-alerta', UIAlerta);
}

if (!customElements.get('ui-toast')) {
  customElements.define('ui-toast', UIToast);
}
