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
  let editor: HTMLElement;

  // 1. Somente leitura ou tipo 'readonly'
  if (prop.somenteLeitura || prop.tipo === 'readonly') {
    editor = criarEditorReadonly(valorAtual, ctx.obterTextoMisto, prop);
  } else if (prop.tipo === 'booleano') {
    // 2. Tipo Booleano (Checkbox compacto)
    editor = criarEditorBooleano(categoriaId, prop, valorAtual, ctx);
  } else if (prop.tipo === 'linha' || prop.tipo === 'linetype') {
    // 3. Tipo Tipo de Linha CAD (Linetype com preview SVG)
    editor = criarEditorLinetype(categoriaId, prop, valorAtual, ctx);
  } else if (prop.tipo === 'espessura' || prop.tipo === 'lineweight') {
    // 4. Tipo Espessura de Linha CAD (Lineweight com espessura proporcional)
    editor = criarEditorLineweight(categoriaId, prop, valorAtual, ctx);
  } else if (prop.tipo === 'cor-cad') {
    // 5. Tipo Cor CAD Avançado (ByLayer, ByBlock, Cores Indexadas e Hex)
    editor = criarEditorCorCad(categoriaId, prop, valorAtual, ctx);
  } else if (prop.tipo === 'selecao') {
    // 6. Tipo Seleção (Dropdown Select Tradicional)
    editor = criarEditorSelecao(categoriaId, prop, valorAtual, ctx);
  } else if (prop.tipo === 'cor') {
    // 7. Tipo Cor Padrão (Swatch com Color Picker Nativo)
    editor = criarEditorCorSwatch(categoriaId, prop, valorAtual, ctx);
  } else if (prop.tipo === 'acao') {
    // 8. Tipo Ação (Botão "Editar...", "Executar...")
    editor = criarEditorAcao(categoriaId, prop, ctx);
  } else if (prop.tipo === 'numero') {
    // 9. Tipo Número com Funções de Cálculo Inline (+, -, *, /, ^, %), Atalhos e Navegação
    editor = criarEditorNumero(categoriaId, prop, valorAtual, ctx);
  } else {
    // 10. Tipo Texto padrão
    editor = criarEditorTexto(categoriaId, prop, valorAtual, ctx);
  }

  editor.setAttribute('part', 'editor');
  if (prop.dica) {
    editor.setAttribute('aria-description', prop.dica);
  }
  return editor;
}
