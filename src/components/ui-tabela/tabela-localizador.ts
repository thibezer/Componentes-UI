/**
 * Localiza o índice de um item pelo ID, chave customizada, predicado funcional ou índice direto.
 */
export function localizarIndiceItem(
  dados: Record<string, any>[],
  idOuIndice: string | number | ((item: any, idx: number) => boolean),
  chaveId: string = 'id'
): number {
  if (!dados || dados.length === 0) return -1;

  // 1. Predicado funcional
  if (typeof idOuIndice === 'function') {
    return dados.findIndex(idOuIndice);
  }

  // 2. Busca por chave configurada ou chaves canônicas comuns nos itens
  const idxPorId = dados.findIndex((item) => {
    if (!item || typeof item !== 'object') return false;
    if (
      item[chaveId] !== undefined &&
      (item[chaveId] === idOuIndice || String(item[chaveId]) === String(idOuIndice))
    ) {
      return true;
    }
    if (
      item.id !== undefined &&
      (item.id === idOuIndice || String(item.id) === String(idOuIndice))
    ) {
      return true;
    }
    if (
      item._id !== undefined &&
      (item._id === idOuIndice || String(item._id) === String(idOuIndice))
    ) {
      return true;
    }
    if (
      item.codigo !== undefined &&
      (item.codigo === idOuIndice || String(item.codigo) === String(idOuIndice))
    ) {
      return true;
    }
    if (
      item.key !== undefined &&
      (item.key === idOuIndice || String(item.key) === String(idOuIndice))
    ) {
      return true;
    }
    return false;
  });

  if (idxPorId !== -1) {
    return idxPorId;
  }

  // 3. Se for índice numérico direto ou string puramente numérica representando índice válido
  if (typeof idOuIndice === 'number' && Number.isInteger(idOuIndice)) {
    if (idOuIndice >= 0 && idOuIndice < dados.length) {
      return idOuIndice;
    }
  } else if (typeof idOuIndice === 'string' && /^\d+$/.test(idOuIndice.trim())) {
    const parsed = parseInt(idOuIndice.trim(), 10);
    if (parsed >= 0 && parsed < dados.length) {
      return parsed;
    }
  }

  return -1;
}
