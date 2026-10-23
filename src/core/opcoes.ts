/**
 * Escolha segura de opções vindas de atributos HTML.
 * Responsabilidade única: transformar texto de atributo (hostil por definição) num valor de um conjunto
 * conhecido, para que nunca vire nome de classe CSS arbitrário nem estado inesperado.
 */

/** Devolve `valor` (sem espaços, em minúsculas) se estiver em `permitidas`; senão `padrao`. */
export function escolherOpcao<T extends string>(
  valor: string | null | undefined,
  permitidas: readonly T[],
  padrao: T
): T {
  const chave = (valor ?? '').trim().toLowerCase();
  return (permitidas as readonly string[]).includes(chave) ? (chave as T) : padrao;
}

/** Como `escolherOpcao`, mas devolve `null` quando o valor não é reconhecido (opção opcional). */
export function escolherOpcaoOpcional<T extends string>(
  valor: string | null | undefined,
  permitidas: readonly T[]
): T | null {
  const chave = (valor ?? '').trim().toLowerCase();
  return (permitidas as readonly string[]).includes(chave) ? (chave as T) : null;
}

/**
 * Converte um atributo numérico (hostil por definição) num inteiro dentro de [minimo, maximo].
 * Texto vazio, não numérico, `NaN` ou `Infinity` devolvem `padrao`; valores fora da faixa são limitados.
 */
export function escolherInteiro(
  valor: string | number | null | undefined,
  minimo: number,
  maximo: number,
  padrao: number
): number {
  if (valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '')) return padrao;
  const numero = typeof valor === 'number' ? valor : Number(valor.trim());
  if (!Number.isFinite(numero)) return padrao;
  return Math.min(maximo, Math.max(minimo, Math.trunc(numero)));
}

/** Inteiro >= `minimo` ou `null` quando ausente/inválido (para limites opcionais como `maxlength`). */
export function inteiroOuNulo(valor: string | null | undefined, minimo = 0): number | null {
  if (valor === null || valor === undefined || valor.trim() === '') return null;
  const numero = Number(valor.trim());
  if (!Number.isFinite(numero) || numero < minimo) return null;
  return Math.trunc(numero);
}
