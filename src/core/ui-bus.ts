/* ====================================================
   UIBus - Barramento Central de Eventos e Orquestração
   Permite controlar qualquer componente da tela sem
   precisar navegar pelo DOM com querySelector.
   ==================================================== */

import { UIToast, type UIToastOpcoes } from '../components/ui-alerta';

export interface UIBusEventsMap {
  'modal:aberto': { id: string };
  'modal:fechado': { id: string };
  'modal:fechado-todos': void;
  'drawer:aberto': { id: string };
  'drawer:fechado': { id: string };
  'drawer:fechado-todos': void;
  'clipboard:copiado': { texto: string };
  'densidade:alterada': { densidade: 'compacta' | 'normal' | 'padrao' | 'relaxada' | number; alturaPx: number };
  'tema:alterado': { tema: 'claro' | 'escuro' };
}

export type UIEmitterCallback<T = any> = (dados?: T) => void;

interface ControllableUIElement extends HTMLElement {
  abrir?: () => void;
  fechar?: () => void;
}

class UIBusManager {
  private listeners: Map<string, Set<UIEmitterCallback<any>>> = new Map();

  /**
   * Registra um ouvinte para um canal ou evento global tipado.
   */
  public on<K extends keyof UIBusEventsMap>(evento: K, callback: UIEmitterCallback<UIBusEventsMap[K]>): () => void;
  public on<T = any>(evento: string, callback: UIEmitterCallback<T>): () => void;
  public on(evento: string, callback: UIEmitterCallback<any>): () => void {
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
  public once<K extends keyof UIBusEventsMap>(evento: K, callback: UIEmitterCallback<UIBusEventsMap[K]>): void;
  public once<T = any>(evento: string, callback: UIEmitterCallback<T>): void;
  public once(evento: string, callback: UIEmitterCallback<any>): void {
    const wrapper: UIEmitterCallback<any> = (dados?: any) => {
      this.off(evento, wrapper);
      callback(dados);
    };
    this.on(evento, wrapper);
  }

  /**
   * Remove um ouvinte previamente registrado.
   */
  public off<K extends keyof UIBusEventsMap>(evento: K, callback: UIEmitterCallback<UIBusEventsMap[K]>): void;
  public off<T = any>(evento: string, callback: UIEmitterCallback<T>): void;
  public off(evento: string, callback: UIEmitterCallback<any>): void {
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
  public emit<K extends keyof UIBusEventsMap>(evento: K, dados?: UIBusEventsMap[K]): void;
  public emit<T = any>(evento: string, dados?: T): void;
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
    const modal = document.getElementById(idModal) as ControllableUIElement | null;
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
      const modal = document.getElementById(idModal) as ControllableUIElement | null;
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
      const modais = document.querySelectorAll<ControllableUIElement>(
        'ui-modal[aberto], ui-modal[open], ui-dialog[aberto], ui-dialog[open]'
      );
      modais.forEach((m) => {
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
   * Abre um painel lateral (drawer / sheet) pelo seu ID no documento.
   */
  public abrirDrawer(idDrawer: string): boolean {
    const drawer = document.getElementById(idDrawer) as ControllableUIElement | null;
    if (drawer && typeof drawer.abrir === 'function') {
      drawer.abrir();
      this.emit('drawer:aberto', { id: idDrawer });
      return true;
    } else if (drawer) {
      drawer.setAttribute('aberto', '');
      this.emit('drawer:aberto', { id: idDrawer });
      return true;
    }
    console.warn(`[UIBus] Drawer com ID "${idDrawer}" não encontrado no DOM.`);
    return false;
  }

  /**
   * Fecha um painel lateral (drawer / sheet) pelo seu ID ou todos se nenhum for passado.
   */
  public fecharDrawer(idDrawer?: string): boolean {
    if (idDrawer) {
      const drawer = document.getElementById(idDrawer) as ControllableUIElement | null;
      if (drawer && typeof drawer.fechar === 'function') {
        drawer.fechar();
        this.emit('drawer:fechado', { id: idDrawer });
        return true;
      } else if (drawer) {
        drawer.removeAttribute('aberto');
        drawer.removeAttribute('open');
        this.emit('drawer:fechado', { id: idDrawer });
        return true;
      }
      return false;
    } else {
      const drawers = document.querySelectorAll<ControllableUIElement>(
        'ui-drawer[aberto], ui-drawer[open], ui-sheet[aberto], ui-sheet[open]'
      );
      drawers.forEach((d) => {
        if (typeof d.fechar === 'function') d.fechar();
        else {
          d.removeAttribute('aberto');
          d.removeAttribute('open');
        }
      });
      this.emit('drawer:fechado-todos');
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
  public definirDensidade(densidade: 'compacta' | 'normal' | 'padrao' | 'relaxada' | number): void {
    let altura = 20;
    if (typeof densidade === 'number') {
      altura = Math.max(15, densidade);
    } else if (densidade === 'compacta') {
      altura = 15;
    } else if (densidade === 'relaxada') {
      altura = 32;
    } else {
      altura = 20;
    }
    document.documentElement.style.setProperty('--ui-altura-minima', `${altura}px`);
    document.documentElement.style.setProperty('--ui-campo-altura', `${altura}px`);
    document.documentElement.setAttribute('data-ui-densidade', typeof densidade === 'string' ? densidade : 'custom');
    this.emit('densidade:alterada', { densidade, alturaPx: altura });
  }

  /**
   * Alterna ou define o tema visual global.
   */
  public definirTema(tema?: 'claro' | 'escuro'): string {
    const html = document.documentElement;
    let temaAtual = html.getAttribute('data-tema');
    if (!temaAtual) {
      temaAtual = html.classList.contains('dark') ? 'escuro' : (html.classList.contains('light') ? 'claro' : 'escuro');
    }
    const novoTema = tema || (temaAtual === 'escuro' ? 'claro' : 'escuro');

    html.setAttribute('data-tema', novoTema);
    if (novoTema === 'escuro') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
    }

    this.emit('tema:alterado', { tema: novoTema });
    return novoTema;
  }
}

export const UIBus = new UIBusManager();
