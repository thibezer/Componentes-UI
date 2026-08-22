/**
 * Gerenciador utilitário de Event Listeners compartilhado para Web Components.
 * Rastreia todas as assinaturas de eventos e garante remoção atômica no disconnectedCallback,
 * prevenindo vazamentos de memória e duplicação de handlers.
 */
export class ListenerBag {
  private entries: Array<{
    target: EventTarget;
    type: string;
    listener: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
  }> = [];

  /**
   * Adiciona um ouvinte de evento e rastreia sua referência para limpeza futura.
   * Suporta handlers tipados (MouseEvent, KeyboardEvent, CustomEvent, etc.).
   */
  add<E extends Event = Event>(
    target: EventTarget | null | undefined,
    type: string,
    listener: ((evt: E) => void) | EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!target) return;
    const genericListener = listener as EventListener;
    target.addEventListener(type, genericListener, options);
    this.entries.push({ target, type, listener: genericListener, options });
  }

  /**
   * Remove todos os ouvintes de eventos atualmente registrados e esvazia a coleção.
   */
  cleanup(): void {
    this.entries.forEach(({ target, type, listener, options }) => {
      target.removeEventListener(type, listener, options);
    });
    this.entries = [];
  }

  /**
   * Retorna a quantidade de ouvintes ativos rastreados.
   */
  get size(): number {
    return this.entries.length;
  }
}
