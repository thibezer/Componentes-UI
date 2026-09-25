import type { UISortDetail } from './tipos';

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

/**
 * Ordena os dados em memória respeitando valores nulos/undefined, números e strings com collation pt-BR.
 */
export function aplicarOrdenacaoTabela(
  dadosOriginais: Record<string, any>[],
  colunaOrdenada: string | null,
  direcao: 'asc' | 'desc' | 'original'
): Record<string, any>[] {
  if (!colunaOrdenada || direcao === 'original') {
    return [...dadosOriginais];
  }

  const factor = direcao === 'asc' ? 1 : -1;

  return [...dadosOriginais].sort((a, b) => {
    const valA = a[colunaOrdenada];
    const valB = b[colunaOrdenada];

    if (valA === valB) return 0;
    if (valA == null) return 1 * factor;
    if (valB == null) return -1 * factor;

    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * factor;
    }

    return (
      String(valA).localeCompare(String(valB), 'pt-BR', {
        numeric: true,
        sensitivity: 'base'
      }) * factor
    );
  });
}
