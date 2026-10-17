/**
 * Teclado nas linhas da <ui-tabela>.
 * Responsabilidade única: traduzir uma tecla em um destino de foco ou em "ativar a linha". Função pura; quem
 * chama move o foco, renderiza a janela virtual e dispara o clique.
 */

export type AcaoTeclaLinha =
  | { tipo: 'mover'; indice: number }
  | { tipo: 'ativar' };

/**
 * Setas, Home/End e PageUp/PageDown movem o foco (limitados a `0..ultimo`); Enter e Espaço ativam a linha.
 * Sem linhas (`ultimo < 0`) ou com índice inválido nenhuma tecla de movimento produz ação.
 */
export function acaoDaTeclaLinha(key: string, atual: number, ultimo: number, linhasPorPagina: number): AcaoTeclaLinha | null {
  if (key === 'Enter' || key === ' ') return { tipo: 'ativar' };
  if (!Number.isInteger(atual) || !Number.isInteger(ultimo) || ultimo < 0) return null;

  const pagina = Math.max(1, Math.floor(Number.isFinite(linhasPorPagina) ? linhasPorPagina : 1));
  const limitar = (i: number) => Math.min(ultimo, Math.max(0, i));
  switch (key) {
    case 'ArrowDown': return { tipo: 'mover', indice: limitar(atual + 1) };
    case 'ArrowUp': return { tipo: 'mover', indice: limitar(atual - 1) };
    case 'Home': return { tipo: 'mover', indice: 0 };
    case 'End': return { tipo: 'mover', indice: ultimo };
    case 'PageDown': return { tipo: 'mover', indice: limitar(atual + pagina) };
    case 'PageUp': return { tipo: 'mover', indice: limitar(atual - pagina) };
    default: return null;
  }
}
