import { UIAlerta } from './ui-alerta-base';

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

if (!customElements.get('ui-toast')) {
  customElements.define('ui-toast', UIToast);
}
