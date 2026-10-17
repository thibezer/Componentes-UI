/**
 * Teclado das abas do <ui-ribbon> (padrão WAI-ARIA de abas com ativação automática).
 * Responsabilidade única: traduzir uma tecla em uma ação; quem chama executa (foco, seleção, painel).
 */

export type AcaoTeclaAba =
  | { tipo: 'ir-para'; indice: number }
  /** Seta para baixo: leva o foco aos botões do painel (abrindo o painel flutuante se recolhido). */
  | { tipo: 'descer' };

/**
 * `indiceAtual` < 0 (foco fora das abas) ou lista vazia não produzem ação. Em RTL as setas se invertem.
 * Navegação circular; Home/End vão às pontas.
 */
export function acaoDaTeclaAba(key: string, indiceAtual: number, total: number, rtl: boolean): AcaoTeclaAba | null {
  if (indiceAtual < 0 || total <= 0) return null;
  const [proxima, anterior] = rtl ? ['ArrowLeft', 'ArrowRight'] : ['ArrowRight', 'ArrowLeft'];
  if (key === proxima) return { tipo: 'ir-para', indice: (indiceAtual + 1) % total };
  if (key === anterior) return { tipo: 'ir-para', indice: (indiceAtual - 1 + total) % total };
  if (key === 'Home') return { tipo: 'ir-para', indice: 0 };
  if (key === 'End') return { tipo: 'ir-para', indice: total - 1 };
  if (key === 'ArrowDown') return { tipo: 'descer' };
  return null;
}
