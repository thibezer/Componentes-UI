/**
 * Saneamento das entradas externas (`categorias`, `tipos`). Entradas válidas mantêm a
 * identidade (o estado `aberto` continua no objeto do usuário); só as inválidas são copiadas
 * e corrigidas ou descartadas. Sem DOM.
 */

import type { CategoriaPropriedades, ItemPropriedade, OpcaoPropriedade, SeletorTipoItem } from './tipos';

const ehObjeto = (v: unknown): v is Record<string, any> => v !== null && typeof v === 'object' && !Array.isArray(v);
const temId = (v: Record<string, any>) => v.id !== null && v.id !== undefined && String(v.id) !== '';

function normalizarOpcoes(opcoes: unknown): OpcaoPropriedade[] | undefined {
  if (!Array.isArray(opcoes)) return undefined;
  const validas = opcoes.filter((o): o is OpcaoPropriedade => ehObjeto(o) && temId(o));
  if (validas.length === opcoes.length && validas.every(o => typeof o.rotulo === 'string')) return opcoes;
  return validas.map(o => (typeof o.rotulo === 'string' ? o : { ...o, rotulo: String(o.id) }));
}

function normalizarPropriedade(p: Record<string, any>): ItemPropriedade {
  const opcoes = normalizarOpcoes(p.opcoes);
  const ok = typeof p.id === 'string' && typeof p.rotulo === 'string' && (p.opcoes === undefined || opcoes === p.opcoes);
  if (ok) return p as ItemPropriedade;
  const copia: Record<string, any> = { ...p, id: String(p.id), rotulo: typeof p.rotulo === 'string' ? p.rotulo : String(p.id) };
  if (opcoes) copia.opcoes = opcoes;
  else delete copia.opcoes;
  return copia as ItemPropriedade;
}

export function normalizarCategorias(entrada: unknown): CategoriaPropriedades[] {
  if (!Array.isArray(entrada)) return [];
  const resultado: CategoriaPropriedades[] = [];
  entrada.forEach((cat, i) => {
    if (!ehObjeto(cat)) return;
    const brutas: unknown[] = Array.isArray(cat.propriedades) ? cat.propriedades : [];
    const props = brutas.filter((p): p is Record<string, any> => ehObjeto(p) && temId(p)).map(normalizarPropriedade);
    const intacta = temId(cat) && typeof cat.id === 'string' && Array.isArray(cat.propriedades)
      && props.length === brutas.length && props.every((p, j) => p === brutas[j]);
    if (intacta) {
      resultado.push(cat as CategoriaPropriedades);
      return;
    }
    resultado.push({
      ...cat,
      id: temId(cat) ? String(cat.id) : `categoria-${i}`,
      titulo: typeof cat.titulo === 'string' ? cat.titulo : '',
      propriedades: props
    } as CategoriaPropriedades);
  });
  return resultado;
}

export function normalizarTipos(entrada: unknown): SeletorTipoItem[] {
  if (!Array.isArray(entrada)) return [];
  return entrada
    .filter((t): t is Record<string, any> => ehObjeto(t) && temId(t))
    .map(t => (typeof t.id === 'string' && typeof t.rotulo === 'string'
      ? (t as SeletorTipoItem)
      : { ...t, id: String(t.id), rotulo: typeof t.rotulo === 'string' ? t.rotulo : String(t.id) } as SeletorTipoItem));
}
