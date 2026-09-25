/**
 * Gerenciador de navegação por teclado para botões de segmented control (padrão radiogroup)
 */
export function tratarTecladoSegmented(
  e: KeyboardEvent,
  trackElement: HTMLElement,
  desabilitado: boolean,
  onSelecionarIndice: (indice: number) => void
): void {
  if (desabilitado) return;

  const botoesHabilitados = Array.from(
    trackElement.querySelectorAll('.ui-segmented__item:not(:disabled)')
  ) as HTMLButtonElement[];

  if (botoesHabilitados.length === 0) return;

  const ativoIndex = botoesHabilitados.findIndex(b => b.classList.contains('ui-segmented__item--ativo'));
  let proximoIndex = ativoIndex;

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    proximoIndex = (ativoIndex + 1) % botoesHabilitados.length;
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    proximoIndex = (ativoIndex - 1 + botoesHabilitados.length) % botoesHabilitados.length;
  } else if (e.key === 'Home') {
    e.preventDefault();
    proximoIndex = 0;
  } else if (e.key === 'End') {
    e.preventDefault();
    proximoIndex = botoesHabilitados.length - 1;
  } else {
    return;
  }

  const proximoBtn = botoesHabilitados[proximoIndex];
  if (proximoBtn && proximoBtn.dataset.indice) {
    const realIndice = parseInt(proximoBtn.dataset.indice, 10);
    onSelecionarIndice(realIndice);
  }
}
