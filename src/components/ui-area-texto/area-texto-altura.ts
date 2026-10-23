/**
 * Altura automática da área de texto (atributo `auto-altura`).
 * `calcularAlturaAutomatica` é pura; `ajustarAlturaAutomatica` aplica o resultado no DOM.
 */

/**
 * Altura (px) a aplicar para o conteúdo caber sem rolagem, ou `null` quando o conteúdo cabe nas linhas
 * mínimas (a altura volta a ser definida por `rows`). Medidas inválidas resultam em `null`.
 */
export function calcularAlturaAutomatica(alturaConteudo: number, alturaVisivel: number): number | null {
  if (!Number.isFinite(alturaConteudo) || !Number.isFinite(alturaVisivel)) return null;
  if (alturaConteudo <= 0 || alturaConteudo <= alturaVisivel) return null;
  return Math.ceil(alturaConteudo);
}

/**
 * Faz o `textarea` crescer com o conteúdo. O envoltorio segura a altura atual durante a medição, para a
 * página não encolher (e rolar sozinha) quando a área está no fim de um documento comprido.
 */
export function ajustarAlturaAutomatica(textarea: HTMLTextAreaElement, envoltorio: HTMLElement): void {
  const alturaAnterior = envoltorio.offsetHeight;
  if (alturaAnterior > 0) envoltorio.style.minHeight = `${alturaAnterior}px`;

  textarea.style.height = 'auto';
  const alvo = calcularAlturaAutomatica(textarea.scrollHeight, textarea.clientHeight);
  if (alvo !== null) textarea.style.height = `${alvo}px`;

  envoltorio.style.minHeight = '';
}

/** Devolve a altura ao controle de `rows`/redimensionamento do navegador. */
export function limparAlturaAutomatica(textarea: HTMLTextAreaElement, envoltorio: HTMLElement): void {
  textarea.style.height = '';
  envoltorio.style.minHeight = '';
}
