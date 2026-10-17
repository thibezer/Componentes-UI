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
