import type { Par } from '../feature_types';
import { amostrarCurva } from '../feature_curvas';
import { operacaoBooleana, type OperacaoBooleana, type RegiaoBooleana } from '../booleanas/index';
import { contornoNaFolha } from './elemento_geometria';
import { aparenciaDe } from './aparencia_estilo';
import { comoCaminhoNaFolha, type ResultadoOperacao } from './operacoes_caminho';
import type { ElementoGrafico } from './tipos';

/*
 * Pathfinder da prancha (L2, puro): adapta os elementos às booleanas do núcleo (`gerencigeo-canvas/booleanas`) e devolve
 * um caminho composto (externos e furos num elemento só, preenchido por par-ímpar), como os editores vetoriais.
 *
 * Regras (as do Illustrator):
 *   - unir, interseção e excluir: o resultado fica com a aparência e o id do elemento MAIS À FRENTE;
 *   - subtrair ("menos frente"): o elemento MAIS ATRÁS menos todos os outros, com a aparência e o id dele;
 *   - formas abertas com 3 pontos ou mais entram fechadas; linhas, textos e máscaras não entram (ficam como estão).
 * Curvas entram pelos vértices amostrados: o resultado é poligonal.
 */

export type OperacaoPathfinder = OperacaoBooleana;

export interface ResultadoPathfinder {
  /** O elemento resultante (id do elemento de referência). */
  resultado: ElementoGrafico;
  /** Ids dos elementos que entraram na operação (o de referência incluso): o chamador remove os outros. */
  usados: string[];
}

/** Região booleana do elemento (na folha), ou `null` se ele não entra no Pathfinder. */
export function regiaoDoElemento(el: ElementoGrafico): RegiaoBooleana | null {
  if (!el || typeof el !== 'object' || el.mascara || el.geometria?.tipo === 'texto' || el.geometria?.tipo === 'linha') return null;
  const c = contornoNaFolha(el);
  if (!c) return null;
  if (c.tipo === 'Polygon') {
    const aneis = c.curva && c.aneis.length === 1 ? [amostrarCurva(c.curva, true)] : c.aneis;
    const regra = aparenciaDe(el).preenchimento?.regra ?? (aneis.length > 1 ? 'evenodd' : 'nonzero');
    return { aneis, regra };
  }
  const partes = c.partes && c.partes.length > 1 ? c.partes : [c.curva ? amostrarCurva(c.curva, false) : c.coordenadas];
  const aneis = partes.filter((p) => p.length >= 3);
  return aneis.length > 0 ? { aneis, regra: 'nonzero' } : null;
}

/**
 * Aplica a operação aos elementos, que vêm NA ORDEM DE EMPILHAMENTO (de trás para a frente). Precisa de dois elementos
 * que entrem; resultado vazio (ex.: interseção de formas separadas) é recusado com o motivo.
 */
export function aplicarPathfinder(elementos: readonly ElementoGrafico[], operacao: OperacaoPathfinder): ResultadoOperacao<ResultadoPathfinder> {
  const validos = (Array.isArray(elementos) ? elementos : [])
    .map((e) => ({ e, r: regiaoDoElemento(e) }))
    .filter((x): x is { e: ElementoGrafico; r: RegiaoBooleana } => x.r !== null);
  if (validos.length < 2) return { motivo: 'selecao-insuficiente' };
  const base = operacao === 'subtracao' ? validos[0].e : validos[validos.length - 1].e;
  const { poligonos } = operacaoBooleana(validos.map((x) => x.r), operacao);
  if (poligonos.length === 0) return { motivo: operacao === 'intersecao' ? 'sem-intersecao' : 'resultado-vazio' };
  const aneis: Par[][] = poligonos.flatMap((p) => [p.exterior, ...p.furos]);
  const resultado = comoCaminhoNaFolha(base, { tipo: 'Polygon', aneis });
  const ap = base.aparencia ?? {};
  if (ap.preenchimento && aneis.length > 1) resultado.aparencia = { ...ap, preenchimento: { ...ap.preenchimento, regra: 'evenodd' } };
  return { ok: { resultado, usados: validos.map((x) => x.e.id) } };
}
