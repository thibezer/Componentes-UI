/**
 * Texto de exibição de um valor somente leitura: rótulo da opção em vez do id,
 * Sim/Não para booleanos e casas decimais dos números. Sem DOM.
 */

import type { ItemPropriedade } from './tipos';
import { formatarNumero } from './propriedades-numero';

export function formatarValorExibicao(prop: ItemPropriedade, valor: unknown): string {
  if (valor === undefined || valor === null || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (Array.isArray(prop.opcoes)) {
    const opcao = prop.opcoes.find(o => o && String(o.id) === String(valor));
    if (opcao) return opcao.rotulo;
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) return formatarNumero(valor, prop.casasDecimais);
  return String(valor);
}
