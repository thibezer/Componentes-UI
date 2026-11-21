/**
 * Acesso uniforme aos campos de um formulário (nativos e Custom Elements do kit).
 * Base de `form-rascunho`, `form-preenchimento` e `form-erros`: DOM puro, SSR-safe (nada roda no import)
 * e tolerante a entradas hostis (raiz nula, seletor inválido, getters que lançam).
 */

/** Campos que carregam valor do usuário: controles nativos e os `ui-*` de formulário do kit. */
export const SELETOR_CAMPOS_PADRAO =
  'input, select, textarea, ui-campo-texto, ui-input, ui-area-texto, ui-textarea, ui-lista-flutuante, ui-select, ui-checkbox, ui-radio, ui-switch, ui-toggle';

/** Nunca fazem parte do "rascunho": arquivos e campos ocultos não são digitados pelo usuário. */
const SELETOR_IGNORADOS = 'input[type="file"], input[type="hidden"], input[type="submit"], input[type="button"], input[type="reset"]';

const TAGS_MARCAVEIS = new Set(['ui-checkbox', 'ui-radio', 'ui-switch', 'ui-toggle']);

/** Valor de um campo `checkbox`/`radio`/`switch` é o booleano `checked`, não o texto `value`. */
export function ehCampoMarcavel(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (TAGS_MARCAVEIS.has(tag)) return true;
  if (tag !== 'input') return false;
  const tipo = (el.getAttribute('type') || '').toLowerCase();
  return tipo === 'checkbox' || tipo === 'radio';
}

/** Lista os campos de `raiz` na ordem do DOM, sem arquivos/ocultos. Seletor inválido devolve lista vazia. */
export function listarCampos(raiz: ParentNode | null | undefined, seletor: string = SELETOR_CAMPOS_PADRAO): Element[] {
  if (!raiz || typeof raiz.querySelectorAll !== 'function') return [];
  try {
    return Array.from(raiz.querySelectorAll(seletor)).filter((el) => !el.matches(SELETOR_IGNORADOS));
  } catch {
    return [];
  }
}

/** Identificador estável do campo: `name`, senão `id`, senão a posição (`#n`). */
export function chaveDoCampo(el: Element, indice: number): string {
  return el.getAttribute('name') || el.id || `#${indice}`;
}

/** Valor textual do campo (`'1'`/`'0'` para marcáveis). Nunca lança. */
export function lerValorCampo(el: Element): string {
  try {
    const campo = el as unknown as { checked?: unknown; value?: unknown };
    if (ehCampoMarcavel(el)) return campo.checked === true ? '1' : '0';
    const valor = campo.value;
    if (valor === null || valor === undefined) return '';
    return typeof valor === 'string' ? valor : String(valor);
  } catch {
    return '';
  }
}

/** Define o valor do campo (booleano para marcáveis). Valores incompatíveis com o campo são ignorados. */
export function definirValorCampo(el: Element, valor: string): void {
  try {
    const campo = el as unknown as { checked: boolean; value: string };
    if (ehCampoMarcavel(el)) {
      campo.checked = valor === '1' || valor === 'true';
    } else {
      campo.value = valor;
    }
  } catch {
    // O campo rejeitou o valor (ex.: type="number" com texto): mantém o anterior.
  }
}

/** Encontra o campo de `raiz` cuja chave (`name` ou `id`) é `chave`. */
export function localizarCampo(raiz: ParentNode | null | undefined, chave: string, seletor?: string): Element | null {
  const campos = listarCampos(raiz, seletor);
  return campos.find((el) => el.getAttribute('name') === chave || el.id === chave) ?? null;
}
