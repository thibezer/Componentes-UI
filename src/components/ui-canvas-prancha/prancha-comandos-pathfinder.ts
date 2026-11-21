import { OPERACOES_BOOLEANAS } from '../../gerencigeo-canvas/booleanas/tipos';
import { aplicarPathfinder, type OperacaoPathfinder } from '../../gerencigeo-canvas/prancha/pathfinder';
import { ordenarPorEmpilhamento } from '../../gerencigeo-canvas/prancha/elemento_consulta';
import type { ControladorPrancha } from './prancha-controlador';
import { selecaoEditavel } from './prancha-comandos-organizacao';

/*
 * Pathfinder (Fase 5), sem DOM: unir, subtrair ("menos frente"), interseção e excluir sobre a seleção. O resultado
 * substitui o elemento de referência (o mais à frente; na subtração, o mais atrás) e os outros que entraram saem do
 * documento, num passo só do histórico (motivo `pathfinder`). Linhas, textos e máscaras da seleção ficam como estão.
 */

export function pathfinderSelecao(c: ControladorPrancha, operacao: OperacaoPathfinder): boolean {
  if (!OPERACOES_BOOLEANAS.includes(operacao)) { c.recusar('pathfinder', 'comando-desconhecido'); return false; }
  const sel = selecaoEditavel(c, 'pathfinder', 2);
  if (!sel) return false;
  const r = aplicarPathfinder(ordenarPorEmpilhamento(sel, c.camadas), operacao);
  if (!('ok' in r)) {
    const vazio = r.motivo === 'sem-intersecao' || r.motivo === 'resultado-vazio';
    c.recusar('pathfinder', vazio ? 'resultado-vazio' : 'tipo-nao-suportado');
    return false;
  }
  const { resultado, usados } = r.ok;
  const fora = new Set(usados.filter((id) => id !== resultado.id));
  c.aplicar(c.doc.elementos.filter((e) => !fora.has(e.id)).map((e) => (e.id === resultado.id ? resultado : e)), 'pathfinder');
  c.selecionar([resultado.id]);
  return true;
}
