import { FERRAMENTAS_PRANCHA, type FerramentaPrancha } from './tipos';

/*
 * Itens da paleta de ferramentas (sem DOM): as ferramentas da prancha no formato do `<ui-paleta-ferramentas>` do kit,
 * agrupadas em flyouts como nos editores vetoriais, com os atalhos de `prancha-teclado.ts` e ícones SVG fixos (confiáveis:
 * constantes do kit, a paleta ainda os higieniza). A prancha não importa a paleta (outro L4). O app liga:
 * `paleta.ferramentas = FERRAMENTAS_PALETA_PRANCHA`; `ui-change` → `prancha.definirFerramenta(ferramentaDaPaleta(valor))`;
 * `prancha-ferramenta` → `paleta.valor = detail.ferramenta`.
 */

export interface FerramentaPaletaPrancha {
  id: string;
  rotulo: string;
  icone?: string;
  atalho?: string;
  tipo?: 'ferramenta';
  filhos?: FerramentaPaletaPrancha[];
}

const svg = (interno: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${interno}</svg>`;

const ICONES: Record<FerramentaPrancha, string> = {
  selecao: svg('<path d="M5 3l14 8-6 2-3 6z" fill="currentColor"/>'),
  'selecao-direta': svg('<path d="M5 3l14 8-6 2-3 6z"/>'),
  mao: svg('<path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15"/>'),
  retangulo: svg('<rect x="3" y="5" width="18" height="14" rx="1"/>'),
  elipse: svg('<ellipse cx="12" cy="12" rx="9" ry="7"/>'),
  'poligono-regular': svg('<path d="M12 3l8 5v8l-8 5-8-5V8z"/>'),
  estrela: svg('<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>'),
  linha: svg('<line x1="5" y1="19" x2="19" y2="5"/>'),
  seta: svg('<line x1="5" y1="19" x2="19" y2="5"/><path d="M11 5h8v8"/>'),
  polilinha: svg('<polyline points="3 17 9 11 13 15 21 7"/>'),
  poligono: svg('<path d="M4 18l3-12 10 2 3 9z"/>'),
  caneta: svg('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/>'),
  texto: svg('<path d="M4 7V4h16v3M9 20h6M12 4v16"/>'),
  'conta-gotas': svg('<path d="M14 4l6 6M17 7l-9 9-4 1 1-4 9-9"/>'),
  'adicionar-ancora': svg('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5"/><path d="M4 20h6M7 17v6"/>'),
  'excluir-ancora': svg('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5"/><path d="M4 20h6"/>'),
  'converter-ancora': svg('<path d="M4 20L12 4l8 16"/><path d="M8 12h8"/>')
};

const item = (id: FerramentaPrancha, rotulo: string, atalho?: string): FerramentaPaletaPrancha =>
  ({ id, rotulo, icone: ICONES[id], tipo: 'ferramenta', ...(atalho ? { atalho } : {}) });

/** Paleta padrão da prancha (grupos com flyout; o primeiro filho é o padrão do grupo). */
export const FERRAMENTAS_PALETA_PRANCHA: readonly FerramentaPaletaPrancha[] = Object.freeze([
  item('selecao', 'Seleção', 'V'),
  item('selecao-direta', 'Seleção direta', 'A'),
  { id: 'grupo-caneta', rotulo: 'Caneta', icone: ICONES.caneta, tipo: 'ferramenta', filhos: [
    item('caneta', 'Caneta', 'P'), item('adicionar-ancora', 'Adicionar âncora', '+'), item('excluir-ancora', 'Excluir âncora', '-'),
    item('converter-ancora', 'Converter âncora', 'Shift+C')
  ] },
  item('texto', 'Texto', 'T'),
  { id: 'grupo-linhas', rotulo: 'Linhas', icone: ICONES.linha, tipo: 'ferramenta', filhos: [
    item('linha', 'Linha', '\\'), item('seta', 'Seta'), item('polilinha', 'Polilinha'), item('poligono', 'Polígono')
  ] },
  { id: 'grupo-formas', rotulo: 'Formas', icone: ICONES.retangulo, tipo: 'ferramenta', filhos: [
    item('retangulo', 'Retângulo', 'M'), item('elipse', 'Elipse', 'L'), item('poligono-regular', 'Polígono regular'), item('estrela', 'Estrela')
  ] },
  item('conta-gotas', 'Conta-gotas', 'I'),
  item('mao', 'Mão', 'H')
]);

/** Id da paleta → ferramenta da prancha (`null` para ids de grupo ou desconhecidos). */
export function ferramentaDaPaleta(id: unknown): FerramentaPrancha | null {
  return typeof id === 'string' && (FERRAMENTAS_PRANCHA as readonly string[]).includes(id) ? (id as FerramentaPrancha) : null;
}
