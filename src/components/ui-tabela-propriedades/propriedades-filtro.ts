/**
 * Busca rápida de propriedades: sem diferença de caixa nem de acentos ("angulo" acha "Ângulo").
 * O título da categoria também conta: "estilo" traz todas as propriedades de "Estilo". Sem DOM.
 */

import type { CategoriaPropriedades, ItemPropriedade } from './tipos';

export function normalizarTermoBusca(termo: unknown): string {
  if (termo === null || termo === undefined) return '';
  return String(termo).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

export function filtrarPropriedades(cat: CategoriaPropriedades, termo: string): ItemPropriedade[] {
  const props = Array.isArray(cat.propriedades) ? cat.propriedades : [];
  const t = normalizarTermoBusca(termo);
  if (!t || normalizarTermoBusca(cat.titulo).includes(t)) return props;
  return props.filter(p => normalizarTermoBusca(p.rotulo).includes(t) || normalizarTermoBusca(p.id).includes(t));
}
