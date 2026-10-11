import { ItemLista } from './tipos';

/**
 * Navegação de foco e teclado acessível para UIListaFlutuante (padrão listbox)
 */
export class ListaFlutuanteTeclado {
  private focusedIndex: number = -1;

  constructor(private listElement: HTMLUListElement) {}

  public focarPrimeiroItem(): void {
    const liElements = Array.from(this.listElement.querySelectorAll('.ui-lista-flutuante__item')) as HTMLLIElement[];
    if (liElements.length > 0) {
      // Como o <select> nativo: entra pelo item já escolhido, se houver
      const selecionado = liElements.findIndex((li) => li.classList.contains('ui-lista-flutuante__item--selecionado'));
      this.focusedIndex = Math.max(0, selecionado);
      liElements[this.focusedIndex].focus();
    }
  }

  public resetarFoco(): void {
    this.focusedIndex = -1;
  }

  public moverFoco(direcao: number): void {
    const liElements = Array.from(this.listElement.querySelectorAll('.ui-lista-flutuante__item')) as HTMLLIElement[];
    if (liElements.length === 0) return;

    this.focusedIndex += direcao;
    if (this.focusedIndex < 0) this.focusedIndex = liElements.length - 1;
    if (this.focusedIndex >= liElements.length) this.focusedIndex = 0;

    liElements[this.focusedIndex].focus();
  }

  public tratarKeydownLista(
    e: KeyboardEvent,
    itens: ItemLista[],
    onSelecionar: (item: ItemLista) => void,
    onFechar: () => void,
    button: HTMLButtonElement
  ): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.moverFoco(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.moverFoco(-1);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const fim = e.key === 'End';
      this.focusedIndex = fim ? -1 : 0;
      if (fim) this.moverFoco(-1); // de -1 para -1 cai no último item
      else this.moverFoco(0);
    } else if (e.key === 'Tab') {
      // O foco sai da lista: ela fecha, sem impedir o Tab
      onFechar();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.focusedIndex >= 0 && this.focusedIndex < itens.length) {
        onSelecionar(itens[this.focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onFechar();
      button.focus();
    }
  }
}
