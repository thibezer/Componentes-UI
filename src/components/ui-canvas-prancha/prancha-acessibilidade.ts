/*
 * Acessibilidade do <ui-canvas-prancha>: textos dos anúncios (região viva `#status`), no padrão do `cad-acessibilidade.ts`.
 */

const NOMES_FERRAMENTAS: Record<string, string> = {
  selecao: 'Seleção', 'selecao-direta': 'Seleção direta', mao: 'Mão', retangulo: 'Retângulo', elipse: 'Elipse',
  'poligono-regular': 'Polígono regular', estrela: 'Estrela', linha: 'Linha', seta: 'Seta', polilinha: 'Polilinha',
  poligono: 'Polígono', caneta: 'Caneta', texto: 'Texto'
};

export function textoSelecao(quantidade: number): string {
  if (quantidade <= 0) return 'Nenhum elemento selecionado';
  return quantidade === 1 ? '1 elemento selecionado' : `${quantidade} elementos selecionados`;
}

export function textoFerramenta(ferramenta: string): string {
  return `Ferramenta ${NOMES_FERRAMENTAS[ferramenta] ?? ferramenta}`;
}

export function textoZoom(percentual: number): string {
  return `Zoom ${Math.round(percentual)}%`;
}

/** Escreve na região viva; trocar o texto é o que dispara o anúncio. */
export function anunciar(regiao: HTMLElement | null, texto: string): void {
  if (regiao && regiao.textContent !== texto) regiao.textContent = texto;
}
