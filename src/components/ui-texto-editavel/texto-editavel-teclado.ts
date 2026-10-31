/* ====================================================
   UI Texto Editável - Tratamento de Teclado
   ==================================================== */

/**
 * Trata atalhos de teclado no modo leitura (foco no botão do componente).
 * Enter ou F2 ativam o modo de edição inline.
 */
export function tratarTecladoLeitura(
  evento: KeyboardEvent,
  iniciarEdicao: () => void
): void {
  if (evento.key === 'Enter' || evento.key === 'F2') {
    evento.preventDefault();
    evento.stopPropagation();
    iniciarEdicao();
  }
}

/**
 * Trata atalhos de teclado no modo de edição (foco no input interno).
 * - Enter: confirma e salva a edição.
 * - Escape: cancela e restaura o valor original.
 * - Tab: confirma e salva antes de permitir a mudança de foco natural.
 */
export function tratarTecladoEdicao(
  evento: KeyboardEvent,
  salvar: () => void,
  cancelar: () => void
): void {
  if (evento.key === 'Enter') {
    evento.preventDefault();
    evento.stopPropagation();
    salvar();
  } else if (evento.key === 'Escape') {
    evento.preventDefault();
    evento.stopPropagation();
    cancelar();
  } else if (evento.key === 'Tab') {
    salvar();
  }
}
