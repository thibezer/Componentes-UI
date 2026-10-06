/**
 * Escreve o texto do rótulo sempre como texto puro (nunca HTML), evitando que um
 * `label` vindo de dados do servidor injete marcação. Quando obrigatório, acrescenta
 * o asterisco decorativo, oculto de leitores de tela.
 */
export function renderizarRotulo(
  rotulo: HTMLElement,
  texto: string,
  obrigatorio: boolean,
  classeAsterisco: string
): void {
  rotulo.textContent = texto;
  if (!obrigatorio) return;

  const asterisco = document.createElement('span');
  asterisco.className = classeAsterisco;
  asterisco.setAttribute('aria-hidden', 'true');
  asterisco.textContent = '*';
  rotulo.append(' ', asterisco);
}
