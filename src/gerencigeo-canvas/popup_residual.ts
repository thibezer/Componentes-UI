import type L from 'leaflet';

/*
 * O Leaflet mantém `map._popup` apontando para o último popup mesmo depois de ele fechar, e o atalho de teclado do
 * mapa (`map.keyboard`) engole o Esc (stopPropagation) sempre que `_popup` existe. Resultado: depois do primeiro popup
 * aberto, o Esc deixa de chegar a quem o escuta em `window` (cancelar desenho, encerrar edição, limpar seleção).
 * Soltar a referência quando o popup fecha devolve o Esc ao CAD; popup aberto continua fechando com Esc como sempre.
 */

/** Solta `map._popup` se ele ainda for o `popup` (já fechado). Devolve se soltou. */
export function descartarPopupResidual(map: L.Map | null | undefined, popup: L.Popup | null | undefined): boolean {
  const interno = map as unknown as { _popup?: L.Popup | null } | null | undefined;
  if (!interno || !popup || interno._popup !== popup) return false;
  interno._popup = null;
  return true;
}

/** Liga a limpeza ao evento `popupclose` do mapa (o mapa descarta o ouvinte ao ser removido). */
export function liberarEscDoPopup(map: L.Map): void {
  map.on('popupclose', (e: L.PopupEvent) => {
    descartarPopupResidual(map, e.popup);
  });
}
