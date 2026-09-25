import { ItemLista } from './tipos';

/**
 * Renderiza os itens <li> na lista do listbox
 */
export function renderizarItensLista(
  listElement: HTMLUListElement,
  itens: ItemLista[],
  valorAtual: string
): void {
  listElement.innerHTML = '';
  itens.forEach((item) => {
    const li = document.createElement('li');
    const isSelected = String(item.id) === String(valorAtual);
    li.className = `ui-lista-flutuante__item ${isSelected ? 'ui-lista-flutuante__item--selecionado' : ''}`;
    li.setAttribute('data-id', item.id);
    li.textContent = item.label;
    li.role = 'option';
    li.tabIndex = -1;
    if (isSelected) li.setAttribute('aria-selected', 'true');
    listElement.appendChild(li);
  });
}

/**
 * Atualiza classes visuais de item selecionado sem recriar os elementos <li>
 */
export function atualizarEstadoSelecaoLista(listElement: HTMLUListElement, valorAtual: string): void {
  const liElements = listElement.querySelectorAll('.ui-lista-flutuante__item');
  liElements.forEach((li) => {
    const itemId = li.getAttribute('data-id');
    if (itemId === String(valorAtual)) {
      li.classList.add('ui-lista-flutuante__item--selecionado');
      li.setAttribute('aria-selected', 'true');
    } else {
      li.classList.remove('ui-lista-flutuante__item--selecionado');
      li.removeAttribute('aria-selected');
    }
  });
}
