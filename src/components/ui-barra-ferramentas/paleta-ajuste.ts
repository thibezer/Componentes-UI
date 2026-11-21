/**
 * Cálculo puro (sem DOM) do ajuste da <ui-paleta-ferramentas> ao espaço disponível.
 *
 * Ordem de adaptação quando a paleta não cabe no eixo principal:
 *  1. `colunas="auto"` (vertical): passa de 1 para 2 colunas;
 *  2. `excesso="menu"`: o que ainda não cabe vai para o botão "Mais ferramentas" (flyout).
 */

export interface EntradaAjuste {
  /** Itens de topo na ordem; `true` = separador. */
  separadores: boolean[];
  vertical: boolean;
  colunas: 1 | 2 | 'auto';
  /** Espaço disponível (px) no eixo principal. `<= 0`, `NaN` ou `Infinity` = sem limite. */
  limite: number;
  /** Lado do botão (px). */
  botao: number;
  /** Espaçamento entre linhas/botões (px). */
  gap: number;
  /** Padding + borda somados nos dois extremos do eixo (px). */
  moldura: number;
  /** Espessura de um separador, margens incluídas (px). */
  separador: number;
  /** `true` = o excedente vai para o botão "mais"; `false` = só rolagem (nunca oculta itens). */
  excessoMenu: boolean;
}

export interface ResultadoAjuste {
  colunas: 1 | 2;
  /** Quantidade de itens de topo exibidos (os demais vão para o menu "mais"). */
  visiveis: number;
}

function numeroSeguro(n: number, padrao: number): number {
  return Number.isFinite(n) && n >= 0 ? n : padrao;
}

/** Comprimento (px) no eixo principal para os `k` primeiros itens (+ botão "mais" opcional). */
export function medirComprimento(e: EntradaAjuste, k: number, comMais: boolean, colunas: 1 | 2): number {
  const botao = numeroSeguro(e.botao, 0);
  const gap = numeroSeguro(e.gap, 0);
  const sep = numeroSeguro(e.separador, 0);
  const grade = e.vertical && colunas === 2;
  let comprimento = 0;
  let coluna = 0;
  const linha = (tam: number) => {
    comprimento += (comprimento > 0 ? gap : 0) + tam;
  };
  const botaoNaGrade = () => {
    if (!grade) return linha(botao);
    if (coluna === 0) linha(botao);
    coluna = (coluna + 1) % 2;
  };

  const limiteItens = Math.min(Math.max(0, Math.floor(k)), e.separadores.length);
  for (let i = 0; i < limiteItens; i++) {
    if (e.separadores[i]) {
      linha(sep);
      coluna = 0;
    } else {
      botaoNaGrade();
    }
  }
  if (comMais) botaoNaGrade();
  return comprimento + numeroSeguro(e.moldura, 0);
}

/** Escolhe colunas e quantidade de itens visíveis. Nunca lança; entradas inválidas → tudo visível. */
export function calcularAjuste(e: EntradaAjuste): ResultadoAjuste {
  const total = Array.isArray(e.separadores) ? e.separadores.length : 0;
  const candidatas: Array<1 | 2> = !e.vertical ? [1] : e.colunas === 'auto' ? [1, 2] : [e.colunas === 2 ? 2 : 1];
  const semLimite = !(e.limite > 0) || !Number.isFinite(e.limite);
  if (semLimite || total === 0) return { colunas: candidatas[0], visiveis: total };

  for (const colunas of candidatas) {
    if (medirComprimento(e, total, false, colunas) <= e.limite) return { colunas, visiveis: total };
  }
  const colunas = candidatas[candidatas.length - 1];
  if (!e.excessoMenu) return { colunas, visiveis: total };

  for (let k = total - 1; k >= 1; k--) {
    if (medirComprimento(e, k, true, colunas) <= e.limite) return { colunas, visiveis: k };
  }
  return { colunas, visiveis: 1 };
}

/**
 * Separa os itens entre os que ficam na paleta e os que vão para o menu "mais".
 * Separadores soltos nas bordas do corte são descartados; se o excedente só tinha separadores,
 * nada é ocultado (não faz sentido um botão "mais" vazio).
 */
export function particionarItens<T>(itens: T[], visiveis: number, ehSeparador: (i: T) => boolean): { visiveis: T[]; excesso: T[] } {
  const corte = Math.min(Math.max(0, Math.floor(visiveis)), itens.length);
  let dentro = itens.slice(0, corte);
  let fora = itens.slice(corte);
  while (fora.length && ehSeparador(fora[0])) fora = fora.slice(1);
  while (fora.length && ehSeparador(fora[fora.length - 1])) fora = fora.slice(0, -1);
  if (!fora.length) return { visiveis: itens, excesso: [] };
  while (dentro.length && ehSeparador(dentro[dentro.length - 1])) dentro = dentro.slice(0, -1);
  return { visiveis: dentro, excesso: fora };
}
