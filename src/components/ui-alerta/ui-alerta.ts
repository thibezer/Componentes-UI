import estilos from './ui-alerta.css?inline';
import { ListenerBag } from '../../core/listener-bag';

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

    // Variante e Acessibilidade Semântica
    this.alertaElement.className = 'ui-alerta';
    this.alertaElement.classList.add(`ui-alerta--${tipo}`);

    if (tipo === 'erro' || tipo === 'alerta') {
      this.alertaElement.setAttribute('role', 'alert');
      this.alertaElement.setAttribute('aria-live', 'assertive');
    } else {
      this.alertaElement.setAttribute('role', 'status');
      this.alertaElement.setAttribute('aria-live', 'polite');
    }

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
      this.mensagemTextoElement.textContent = mensagemText;
      this.mensagemTextoElement.style.display = 'inline';
    } else {
      this.mensagemTextoElement.textContent = '';
      this.mensagemTextoElement.style.display = 'none';
    }

    // Botão de fechar
    if (isFechavel) {
      this.closeElement.style.display = 'block';
    } else {
      this.closeElement.style.display = 'none';
    }
  }
}

export interface UIToastAcao {
  rotulo: string;
  onClick: (e: MouseEvent) => void;
  tipo?: 'primario' | 'secundario' | 'destrutivo';
}

export interface UIToastOpcoes {
  tipo?: 'sucesso' | 'erro' | 'alerta' | 'info';
  titulo?: string;
  mensagem: string;
  duracao?: number;
  posicao?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' | 'bottom-center' | 'top-center';
  acao?: UIToastAcao;
  fechavel?: boolean;
  pausarNoHover?: boolean;
}

export class UIToast extends UIAlerta {
  private timerId: any = null;
  private tempoRestante: number = 4000;
  private inicioTimestamp: number = 0;
  private isPausado: boolean = false;
  private acaoConfig?: UIToastAcao;
  private containerRef: HTMLElement | null = null;

  public configurarAcao(acao: UIToastAcao) {
    this.acaoConfig = acao;
    this.botaoAcaoElement.textContent = acao.rotulo;
    this.acoesElement.style.display = 'flex';
    const tipo = acao.tipo || 'primario';
    this.botaoAcaoElement.className = `ui-alerta__botao-acao ui-alerta__botao-acao--${tipo}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.containerRef = this.parentElement;
    this.alertaElement.classList.add('ui-toast__banner');

    if (this.acaoConfig) {
      this.listeners.add(this.botaoAcaoElement, 'click', this.handleAcaoClick);
    }

    const duracaoStr = this.getAttribute('duracao') || this.getAttribute('duration') || '4000';
    const duracao = parseInt(duracaoStr, 10);
    this.tempoRestante = isNaN(duracao) ? 4000 : duracao;

    if (this.tempoRestante > 0) {
      this.progressoContainer.style.display = 'block';
      this.progressoBarra.style.animationDuration = `${this.tempoRestante}ms`;

      const pausarNoHover = this.getAttribute('pausar-no-hover') !== 'false';
      if (pausarNoHover) {
        this.listeners.add(this, 'mouseenter', this.pausarTimer);
        this.listeners.add(this, 'mouseleave', this.retomarTimer);
        this.listeners.add(this, 'focusin', this.pausarTimer);
        this.listeners.add(this, 'focusout', this.retomarTimer);
      }

      this.iniciarTimer(this.tempoRestante);
    } else {
      this.progressoContainer.style.display = 'none';
    }
  }

  public override fechar(): void {
    const container = this.parentElement || this.containerRef;
    super.fechar();
    if (container && container.id.startsWith('ui-toast-container-') && container.children.length === 0) {
      container.remove();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.containerRef && this.containerRef.id.startsWith('ui-toast-container-') && this.containerRef.children.length === 0) {
      this.containerRef.remove();
      this.containerRef = null;
    }
  }

  private handleAcaoClick = (e: Event) => {
    e.stopPropagation();
    if (this.acaoConfig?.onClick) {
      this.acaoConfig.onClick(e as MouseEvent);
    }
    this.dispatchEvent(
      new CustomEvent('ui-toast-acao', {
        detail: {
          rotulo: this.acaoConfig?.rotulo,
          tipo: this.acaoConfig?.tipo
        },
        bubbles: true,
        composed: true
      })
    );
    this.fechar();
  };

  private iniciarTimer(ms: number) {
    if (this.timerId) clearTimeout(this.timerId);
    this.inicioTimestamp = Date.now();
    this.timerId = setTimeout(() => {
      this.fechar();
    }, ms);
  }

  private pausarTimer = () => {
    if (this.isPausado || this.tempoRestante <= 0) return;
    this.isPausado = true;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    const decorrido = Date.now() - this.inicioTimestamp;
    this.tempoRestante = Math.max(0, this.tempoRestante - decorrido);
    this.progressoBarra.style.animationPlayState = 'paused';
  };

  private retomarTimer = () => {
    if (!this.isPausado || this.tempoRestante <= 0) return;
    this.isPausado = false;
    this.progressoBarra.style.animationPlayState = 'running';
    this.iniciarTimer(Math.max(this.tempoRestante, 300));
  };

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
      container.style.maxWidth = '400px';
      container.style.width = 'calc(100vw - 32px)';
      container.style.pointerEvents = 'none';
      container.style.boxSizing = 'border-box';
      container.style.transition = 'all 0.2s ease';

      if (posicao === 'top-right') {
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.flexDirection = 'column';
      } else if (posicao === 'top-left') {
        container.style.top = '20px';
        container.style.left = '20px';
        container.style.flexDirection = 'column';
      } else if (posicao === 'bottom-left') {
        container.style.bottom = '20px';
        container.style.left = '20px';
        container.style.flexDirection = 'column-reverse';
      } else if (posicao === 'top-center') {
        container.style.top = '20px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.flexDirection = 'column';
      } else if (posicao === 'bottom-center') {
        container.style.bottom = '20px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.flexDirection = 'column-reverse';
      } else {
        // bottom-right (padrão)
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.flexDirection = 'column-reverse';
      }
      document.body.appendChild(container);
    }
    return container;
  }

  // Utilitário estático para disparo imperativo de Toasts de qualquer lugar no código
  static notificar(opcoes: UIToastOpcoes) {
    const posicao = opcoes.posicao || 'bottom-right';
    const toast = document.createElement('ui-toast') as UIToast;
    if (opcoes.tipo) toast.setAttribute('tipo', opcoes.tipo);
    if (opcoes.titulo) toast.setAttribute('titulo', opcoes.titulo);
    if (opcoes.mensagem) toast.setAttribute('mensagem', opcoes.mensagem);
    if (opcoes.duracao !== undefined) toast.setAttribute('duracao', String(opcoes.duracao));
    if (opcoes.pausarNoHover === false) toast.setAttribute('pausar-no-hover', 'false');
    toast.setAttribute('posicao', posicao);
    if (opcoes.fechavel !== false) toast.setAttribute('fechavel', '');

    if (opcoes.acao) {
      toast.configurarAcao(opcoes.acao);
    }

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
