/**
 * Renderização e gerenciamento de editores de valores técnicos para a Tabela de Propriedades.
 * Dá suporte aos tipos: readonly, booleano, linha/linetype, espessura/lineweight,
 * cor-cad, selecao, cor, acao, numero (com avaliação de expressões) e texto.
 */

import { ItemPropriedade, ContextoEditorPropriedade } from './tipos';
import {
  criarEditorReadonly,
  criarEditorBooleano,
  criarEditorSelecao,
  criarEditorAcao,
  criarEditorNumero,
  criarEditorTexto
} from './editores-basicos';
import {
  criarEditorLinetype,
  criarEditorLineweight,
  criarEditorCorCad,
  criarEditorCorSwatch
} from './editores-cad';

export * from './editores-basicos';
export * from './editores-cad';
export type { ContextoEditorPropriedade } from './tipos';

export function criarEditorValor(
  categoriaId: string,
  prop: ItemPropriedade,
  valorAtual: any,
  ctx: ContextoEditorPropriedade
): HTMLElement {
  // 1. Somente leitura ou tipo 'readonly'
  if (prop.somenteLeitura || prop.tipo === 'readonly') {
    return criarEditorReadonly(valorAtual);
  }

  // 2. Tipo Booleano (Checkbox compacto)
  if (prop.tipo === 'booleano') {
    return criarEditorBooleano(categoriaId, prop, valorAtual, ctx);
  }

  // 3. Tipo Tipo de Linha CAD (Linetype com preview SVG)
  if (prop.tipo === 'linha' || prop.tipo === 'linetype') {
    return criarEditorLinetype(categoriaId, prop, valorAtual, ctx);
  }

  // 4. Tipo Espessura de Linha CAD (Lineweight com espessura proporcional)
  if (prop.tipo === 'espessura' || prop.tipo === 'lineweight') {
    return criarEditorLineweight(categoriaId, prop, valorAtual, ctx);
  }

  // 5. Tipo Cor CAD Avançado (ByLayer, ByBlock, Cores Indexadas e Hex)
  if (prop.tipo === 'cor-cad') {
    return criarEditorCorCad(categoriaId, prop, valorAtual, ctx);
  }

  // 6. Tipo Seleção (Dropdown Select Tradicional)
  if (prop.tipo === 'selecao') {
    return criarEditorSelecao(categoriaId, prop, valorAtual, ctx);
  }

  // 7. Tipo Cor Padrão (Swatch com Color Picker Nativo)
  if (prop.tipo === 'cor') {
    return criarEditorCorSwatch(categoriaId, prop, valorAtual, ctx);
  }

  // 8. Tipo Ação (Botão "Editar...", "Executar...")
  if (prop.tipo === 'acao') {
    return criarEditorAcao(categoriaId, prop, ctx);
  }

  // 9. Tipo Número com Funções de Cálculo Inline (+, -, *, /, ^, %), Atalhos e Navegação
  if (prop.tipo === 'numero') {
    return criarEditorNumero(categoriaId, prop, valorAtual, ctx);
  }

  // 10. Tipo Texto padrão
  return criarEditorTexto(categoriaId, prop, valorAtual, ctx);
}
