/**
 * Regras numéricas puras da Tabela de Propriedades: interpretação do texto digitado
 * (expressão + unidade), intervalo min/max, passo das setas/scrubber e formatação. Sem DOM.
 */

import type { ItemPropriedade } from './tipos';
import { avaliarExpressaoMatematica } from './avaliador-expressao';

type Intervalo = Pick<ItemPropriedade, 'min' | 'max'>;

const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Limita ao intervalo; limites não numéricos são ignorados e, com min > max, o mínimo prevalece. */
export function limitarAoIntervalo(valor: number, intervalo: Intervalo): number {
  let v = valor;
  if (finito(intervalo.max) && v > intervalo.max) v = intervalo.max;
  if (finito(intervalo.min) && v < intervalo.min) v = intervalo.min;
  return v;
}

/** Remove o ruído de ponto flutuante (0.1 + 0.2) preservando 15 dígitos significativos. */
function limparRuido(v: number): number {
  return Number(v.toPrecision(15));
}

/** Arredonda nas casas decimais da propriedade (ou só limpa o ruído) e aplica o intervalo. */
export function ajustarNumero(valor: number, prop: Pick<ItemPropriedade, 'casasDecimais' | 'min' | 'max'>): number {
  const casas = prop.casasDecimais;
  const arredondado = finito(casas) && casas >= 0 ? Number(valor.toFixed(Math.min(casas, 20))) : limparRuido(valor);
  return limitarAoIntervalo(arredondado, prop);
}

/**
 * Texto digitado → número final, ou `null` se inválido. Aceita expressões ("10+5"),
 * vírgula decimal e a unidade da propriedade no fim ("25 mm", "90°").
 */
export function interpretarEntradaNumerica(texto: string, prop: ItemPropriedade): number | null {
  if (typeof texto !== 'string') return null;
  let s = texto.trim();
  const unidade = typeof prop.unidade === 'string' ? prop.unidade.trim() : '';
  if (unidade && s.toLowerCase().endsWith(unidade.toLowerCase())) {
    s = s.slice(0, s.length - unidade.length).trim();
  }
  if (!s) return null;
  const calculado = avaliarExpressaoMatematica(s);
  if (calculado === null || !Number.isFinite(calculado)) return null;
  return ajustarNumero(calculado, prop);
}

/** Passo das setas: `passo` válido, senão 10^-casas, senão 1. Shift ×10; Alt ×0,1 só sem passo/casas. */
export function passoNumerico(
  prop: Pick<ItemPropriedade, 'passo' | 'casasDecimais'>,
  mod: { shift?: boolean; alt?: boolean } = {}
): number {
  const temPasso = finito(prop.passo) && prop.passo > 0;
  const temCasas = finito(prop.casasDecimais) && prop.casasDecimais >= 0;
  let passo = temPasso ? (prop.passo as number) : temCasas ? Math.pow(10, -(prop.casasDecimais as number)) : 1;
  if (mod.shift) passo *= 10;
  else if (mod.alt && !temPasso && !temCasas) passo *= 0.1;
  return limparRuido(passo);
}

/** Texto exibido no campo: casas decimais fixas quando definidas; valor não numérico como está. */
export function formatarNumero(valor: unknown, casas?: number): string {
  if (valor === undefined || valor === null || valor === '') return '';
  const n = Number(valor);
  if (Number.isNaN(n)) return String(valor);
  return finito(casas) && casas >= 0 ? n.toFixed(Math.min(casas, 20)) : String(n);
}
