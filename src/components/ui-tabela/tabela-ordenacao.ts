import type { TabelaColuna, UISortDetail } from './tipos';

/**
 * Alterna ciclicamente a ordenação tri-state:
 * Primeira vez -> 'asc'
 * Segunda vez -> 'desc'
 * Terceira vez -> 'original' (reseta)
 */
export function alternarDirecaoOrdenacao(
  colunaAtual: string | null,
  direcaoAtual: 'asc' | 'desc' | 'original',
  colunaClicada: string
): UISortDetail {
  if (colunaAtual !== colunaClicada) {
    return {
      idColuna: colunaClicada,
      direcao: 'asc'
    };
  }

  if (direcaoAtual === 'asc') {
    return {
      idColuna: colunaClicada,
      direcao: 'desc'
    };
  }

  if (direcaoAtual === 'desc') {
    return {
      idColuna: null,
      direcao: 'original'
    };
  }

  return {
    idColuna: colunaClicada,
    direcao: 'asc'
  };
}

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

function aDataEmMs(v: unknown): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  const texto = String(v).trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(texto);
  if (br) return new Date(+br[3], +br[2] - 1, +br[1], +(br[4] ?? 0), +(br[5] ?? 0)).getTime();
  return Date.parse(texto);
}

/** Compara dois valores não nulos no sentido crescente, conforme o `tipo` da coluna ou o tipo dos valores. */
function compararValores(a: any, b: any, tipo?: TabelaColuna['tipo']): number {
  if (tipo === 'data' || (!tipo && (a instanceof Date || b instanceof Date))) {
    const x = aDataEmMs(a);
    const y = aDataEmMs(b);
    if (!Number.isNaN(x) && !Number.isNaN(y)) return x - y;
  } else if (tipo === 'numero' || (!tipo && typeof a === 'number' && typeof b === 'number')) {
    const x = Number(a);
    const y = Number(b);
    if (!Number.isNaN(x) && !Number.isNaN(y)) return x - y;
  } else if (tipo === 'booleano' || (!tipo && typeof a === 'boolean' && typeof b === 'boolean')) {
    return Number(Boolean(a)) - Number(Boolean(b));
  }
  return collator.compare(String(a), String(b));
}

/**
 * Ordena os dados em memória (sem alterar o array recebido). Estável; valores nulos/undefined ficam
 * sempre no fim, em qualquer direção. Usa `coluna.comparador` quando existir; senão `coluna.tipo`
 * (numero, data, booleano, texto) ou o tipo dos valores, com collation pt-BR reutilizada.
 */
export function aplicarOrdenacaoTabela(
  dadosOriginais: Record<string, any>[],
  colunaOrdenada: string | null,
  direcao: 'asc' | 'desc' | 'original',
  coluna?: TabelaColuna | null
): Record<string, any>[] {
  if (!colunaOrdenada || direcao === 'original') {
    return [...dadosOriginais];
  }

  const factor = direcao === 'desc' ? -1 : 1;

  return [...dadosOriginais].sort((a, b) => {
    const valA = a[colunaOrdenada];
    const valB = b[colunaOrdenada];
    const nuloA = valA == null;
    const nuloB = valB == null;
    if (nuloA || nuloB) return nuloA === nuloB ? 0 : nuloA ? 1 : -1;
    if (coluna?.comparador) return coluna.comparador(valA, valB, a, b) * factor;
    if (valA === valB) return 0;
    return compararValores(valA, valB, coluna?.tipo) * factor;
  });
}
