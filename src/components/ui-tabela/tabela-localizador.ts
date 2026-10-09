/** Chaves canônicas tentadas, em ordem, quando a chave configurada não encontra o item. */
const CHAVES_ALTERNATIVAS = ['id', '_id', 'codigo', 'key'];

function mesmoValor(valor: unknown, alvo: string | number): boolean {
  return valor !== undefined && valor !== null && (valor === alvo || String(valor) === String(alvo));
}

/** Converte `idOuIndice` em índice de linha válido, ou -1. Aceita número inteiro ou string só com dígitos. */
export function interpretarIndice(idOuIndice: string | number, total: number): number {
  let indice = -1;
  if (typeof idOuIndice === 'number' && Number.isInteger(idOuIndice)) indice = idOuIndice;
  else if (typeof idOuIndice === 'string' && /^\d+$/.test(idOuIndice.trim())) indice = parseInt(idOuIndice.trim(), 10);
  return indice >= 0 && indice < total ? indice : -1;
}

/**
 * Localiza o índice de um item pelo ID, chave customizada, predicado funcional ou índice direto.
 *
 * Ordem de busca: predicado → chave configurada (`chaveId`) em todos os itens → chaves
 * alternativas (`id`, `_id`, `codigo`, `key`), uma de cada vez → índice numérico.
 * Assim um item cujo `codigo` coincide com o valor nunca "rouba" o item da chave configurada.
 * Com `porIndice`, o valor é tratado apenas como índice de linha (sem ambiguidade com IDs numéricos).
 */
export function localizarIndiceItem(
  dados: Record<string, any>[],
  idOuIndice: string | number | ((item: any, idx: number) => boolean),
  chaveId: string = 'id',
  porIndice: boolean = false
): number {
  if (!dados || dados.length === 0) return -1;

  // 1. Predicado funcional
  if (typeof idOuIndice === 'function') {
    return dados.findIndex(idOuIndice);
  }

  if (porIndice) return interpretarIndice(idOuIndice, dados.length);

  // 2. Chave configurada primeiro, depois as alternativas — cada uma varrendo todos os itens
  const chaves = [chaveId, ...CHAVES_ALTERNATIVAS.filter((c) => c !== chaveId)];
  for (const chave of chaves) {
    const idx = dados.findIndex((item) => !!item && typeof item === 'object' && mesmoValor(item[chave], idOuIndice));
    if (idx !== -1) return idx;
  }

  // 3. Índice numérico direto ou string puramente numérica representando índice válido
  return interpretarIndice(idOuIndice, dados.length);
}
