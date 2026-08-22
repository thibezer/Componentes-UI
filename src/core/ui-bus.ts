/* ====================================================
   UIBus - Barramento Central de Eventos e Orquestração
   Permite controlar qualquer componente da tela sem
   precisar navegar pelo DOM com querySelector.
   ==================================================== */

import { UIToast, type UIToastOpcoes } from '../components/ui-alerta';

export type UIEmitterCallback = (dados?: any) => void;

class UIBusManager {
  private listeners: Map<string, Set<UIEmitterCallback>> = new Map();

  /**
   * Registra um ouvinte para um canal ou evento global.
   */
  public on(evento: string, callback: UIEmitterCallback): () => void {
    if (!this.listeners.has(evento)) {
      this.listeners.set(evento, new Set());
    }
    this.listeners.get(evento)!.add(callback);

    // Retorna função para cancelar a inscrição facilmente
    return () => this.off(evento, callback);
  }

  /**
   * Registra um ouvinte que será executado apenas uma única vez.
   */
  public once(evento: string, callback: UIEmitterCallback): void {
    const wrapper: UIEmitterCallback = (dados?: any) => {
      this.off(evento, wrapper);
      callback(dados);
    };
    this.on(evento, wrapper);
  }

  /**
   * Remove um ouvinte previamente registrado.
   */
  public off(evento: string, callback: UIEmitterCallback): void {
    const set = this.listeners.get(evento);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(evento);
      }
    }
  }

  /**
   * Emite um evento com dados para todos os ouvintes inscritos.
   */
  public emit(evento: string, dados?: any): void {
    const set = this.listeners.get(evento);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(dados);
        } catch (err) {
          console.error(`[UIBus] Erro ao executar ouvinte do evento "${evento}":`, err);
        }
      });
    }

    // Dispara também um CustomEvent no objeto window para interoperabilidade
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(`uibus:${evento}`, {
          detail: dados,
          bubbles: true,
          composed: true
        })
      );
    }
  }

  /* ====================================================
     Métodos de Atalho e Ações de Alta Produtividade
     ==================================================== */

  /**
   * Abre um modal pelo seu ID no documento.
   */
  public abrirModal(idModal: string): boolean {
    const modal = document.getElementById(idModal) as any;
    if (modal && typeof modal.abrir === 'function') {
      modal.abrir();
      this.emit('modal:aberto', { id: idModal });
      return true;
    } else if (modal) {
      modal.setAttribute('aberto', '');
      this.emit('modal:aberto', { id: idModal });
      return true;
    }
    console.warn(`[UIBus] Modal com ID "${idModal}" não encontrado no DOM.`);
    return false;
  }

  /**
   * Fecha um modal pelo seu ID ou todos os modais abertos se nenhum ID for passado.
   */
  public fecharModal(idModal?: string): boolean {
    if (idModal) {
      const modal = document.getElementById(idModal) as any;
      if (modal && typeof modal.fechar === 'function') {
        modal.fechar();
        this.emit('modal:fechado', { id: idModal });
        return true;
      } else if (modal) {
        modal.removeAttribute('aberto');
        modal.removeAttribute('open');
        this.emit('modal:fechado', { id: idModal });
        return true;
      }
      return false;
    } else {
      const modais = document.querySelectorAll('ui-modal[aberto], ui-modal[open], ui-dialog[aberto], ui-dialog[open]');
      modais.forEach((m: any) => {
        if (typeof m.fechar === 'function') m.fechar();
        else {
          m.removeAttribute('aberto');
          m.removeAttribute('open');
        }
      });
      this.emit('modal:fechado-todos');
      return true;
    }
  }

  /**
   * Dispara uma notificação toast flutuante inteligente.
   */
  public notificar(opcoes: UIToastOpcoes | string): void {
    if (typeof opcoes === 'string') {
      UIToast.notificar({ mensagem: opcoes, tipo: 'info' });
    } else {
      UIToast.notificar(opcoes);
    }
  }

  /**
   * Copia um texto para a área de transferência do usuário e exibe feedback opcional.
   */
  public async copiar(texto: string, mensagemFeedback?: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(texto);
      if (mensagemFeedback !== undefined) {
        this.notificar({
          tipo: 'sucesso',
          mensagem: mensagemFeedback || 'Copiado para a área de transferência!'
        });
      }
      this.emit('clipboard:copiado', { texto });
      return true;
    } catch (err) {
      console.error('[UIBus] Falha ao copiar texto:', err);
      this.notificar({
        tipo: 'erro',
        mensagem: 'Não foi possível copiar o texto.'
      });
      return false;
    }
  }

  /**
   * Altera a densidade visual global do kit (compacta, normal ou relaxada).
   */
  public definirDensidade(densidade: 'compacta' | 'normal' | 'relaxada' | number): void {
    let altura = 20;
    if (typeof densidade === 'number') {
      altura = densidade;
    } else if (densidade === 'compacta') {
      altura = 16;
    } else if (densidade === 'relaxada') {
      altura = 32;
    } else {
      altura = 20;
    }
    document.documentElement.style.setProperty('--ui-altura-minima', `${altura}px`);
    document.documentElement.setAttribute('data-ui-densidade', typeof densidade === 'string' ? densidade : 'custom');
    this.emit('densidade:alterada', { densidade, alturaPx: altura });
  }

  /**
   * Alterna ou define o tema visual global.
   */
  public definirTema(tema?: 'claro' | 'escuro'): string {
    const html = document.documentElement;
    const temaAtual = html.getAttribute('data-tema') || (html.classList.contains('dark') ? 'escuro' : 'claro');
    const novoTema = tema || (temaAtual === 'escuro' ? 'claro' : 'escuro');

    html.setAttribute('data-tema', novoTema);
    if (novoTema === 'escuro') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    this.emit('tema:alterado', { tema: novoTema });
    return novoTema;
  }
}

export const UIBus = new UIBusManager();
