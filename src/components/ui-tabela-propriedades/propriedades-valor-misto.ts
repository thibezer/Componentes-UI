/**
 * Estado misto ("Varia"): várias formas selecionadas com valores diferentes numa propriedade.
 * Funções puras, sem DOM.
 */

import type { ContextoEditorPropriedade, ItemPropriedade } from './tipos';

/**
 * Valor de uma propriedade que difere entre os objetos selecionados. `Symbol.for` mantém a
 * identidade mesmo com duas cópias do pacote carregadas.
 */
export const VALOR_MISTO: unique symbol = Symbol.for('ui-tabela-propriedades:misto');

/** Texto exibido no lugar do valor misto quando a aplicação não define `texto-misto`. */
export const TEXTO_MISTO_PADRAO = 'Varia';

export function isValorMisto(valor: unknown): valor is typeof VALOR_MISTO {
  return valor === VALOR_MISTO;
}

/** Texto do estado misto definido pela aplicação, com fallback para "Varia". */
export function textoMistoDe(ctx: Pick<ContextoEditorPropriedade, 'obterTextoMisto'>): string {
  let texto: unknown;
  try {
    texto = ctx.obterTextoMisto?.();
  } catch (_err) {}
  return typeof texto === 'string' && texto.trim() ? texto : TEXTO_MISTO_PADRAO;
}

/** Igualdade de valores de propriedade: estrita, com null/undefined equivalentes e NaN igual a NaN. */
export function valoresIguais(a: any, b: any): boolean {
  if (a == null && b == null) return true;
  return Object.is(a, b);
}

/** Valor inicial de um item: `misto: true` tem precedência sobre `valor`. */
export function valorInicialDaPropriedade(prop: ItemPropriedade): any {
  return prop.misto ? VALOR_MISTO : prop.valor;
}

/**
 * Valor comum a todos os itens, ou `VALOR_MISTO` se algum diferir. Lista vazia → `undefined`.
 */
export function valorComum(valores: readonly unknown[]): any {
  if (!Array.isArray(valores) || valores.length === 0) return undefined;
  const primeiro = valores[0];
  for (let i = 1; i < valores.length; i++) {
    if (!valoresIguais(primeiro, valores[i])) return VALOR_MISTO;
  }
  return primeiro;
}

/**
 * Combina as propriedades dos objetos selecionados: cada chave recebe o valor comum ou
 * `VALOR_MISTO`. Chave ausente em algum objeto conta como valor diferente.
 * Uso: `painel.valores = combinarValores(formas.map(f => f.propriedades))`.
 */
export function combinarValores(registros: readonly unknown[]): Record<string, any> {
  if (!Array.isArray(registros)) return {};
  const validos = registros.filter(
    (r): r is Record<string, unknown> => r !== null && typeof r === 'object' && !Array.isArray(r)
  );
  const chaves = new Set<string>();
  validos.forEach(r => Object.keys(r).forEach(k => chaves.add(k)));

  const resultado: Record<string, any> = {};
  chaves.forEach(chave => {
    resultado[chave] = valorComum(validos.map(r => (chave in r ? r[chave] : undefined)));
  });
  return resultado;
}
