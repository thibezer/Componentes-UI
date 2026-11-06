/**
 * Foco dentro das células da <ui-tabela>.
 * Responsabilidade única: guardar qual controle de qual linha tinha o foco antes de recriar o corpo e
 * devolvê-lo ao controle equivalente depois (a linha é achada pelo objeto, pelo `data-id` ou pela posição).
 */

/** Controle focado dentro de uma célula (não a própria linha). */
export interface FocoCelula {
  item: Record<string, any> | undefined;
  dataId: string | null;
  indiceLinha: number;
  indiceColuna: number;
  /** Posição do elemento entre os descendentes da célula (a mesma estrutura é recriada pelo `render`). */
  ordinal: number;
  selecaoInicio: number | null;
  selecaoFim: number | null;
  /** Valor que o usuário digitou/marcou e ainda não foi gravado nos dados (undefined = sem edição pendente). */
  digitado?: string | boolean;
  /** Valor com que o controle foi renderizado: serve para saber se os dados mudaram por baixo da edição. */
  valorInicial?: string | boolean;
}

/** Quem renderizou cada linha: permite achar o item de uma `<tr>` depois que o corpo é reconstruído. */
export const itemDaLinha = new WeakMap<Element, Record<string, any>>();

type ControleEditavel = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Valor com que cada campo nativo saiu do `render` (comparado ao valor atual, revela edição ainda não gravada). */
const valorRenderizado = new WeakMap<Element, string | boolean>();

function ehControleEditavel(el: Element): el is ControleEditavel {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}

function valorDoControle(el: ControleEditavel): string | boolean {
  return el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
}

/** Guarda o valor inicial dos campos nativos da célula recém-renderizada. */
export function registrarValoresRenderizados(celula: Element): void {
  celula.querySelectorAll('input, textarea, select').forEach((el) => {
    if (ehControleEditavel(el)) valorRenderizado.set(el, valorDoControle(el));
  });
}

function leituraSelecao(el: Element): { inicio: number | null; fim: number | null } {
  try {
    const campo = el as HTMLInputElement;
    return { inicio: campo.selectionStart ?? null, fim: campo.selectionEnd ?? null };
  } catch {
    return { inicio: null, fim: null }; // input number/email não expõem a seleção
  }
}

/** Registra o controle focado dentro do corpo, ou `null` se o foco está fora das células. */
export function capturarFocoCelula(tbody: HTMLTableSectionElement): FocoCelula | null {
  const raiz = tbody.getRootNode() as Document | ShadowRoot;
  const focado = raiz.activeElement;
  if (!focado || focado === tbody || !tbody.contains(focado)) return null;
  const td = focado.closest('td');
  const tr = td?.closest('tr');
  if (!td || !tr || tr.parentElement !== tbody || !tr.hasAttribute('data-index')) return null;

  const { inicio, fim } = leituraSelecao(focado);
  const inicial = ehControleEditavel(focado) ? valorRenderizado.get(focado) : undefined;
  const atual = ehControleEditavel(focado) ? valorDoControle(focado) : undefined;
  const editado = inicial !== undefined && atual !== inicial;
  return {
    digitado: editado ? atual : undefined,
    valorInicial: editado ? inicial : undefined,
    item: itemDaLinha.get(tr),
    dataId: tr.getAttribute('data-id'),
    indiceLinha: Number(tr.getAttribute('data-index')),
    indiceColuna: Array.from(tr.children).indexOf(td),
    ordinal: Array.from(td.querySelectorAll('*')).indexOf(focado),
    selecaoInicio: inicio,
    selecaoFim: fim
  };
}

function acharLinha(tbody: HTMLTableSectionElement, foco: FocoCelula): HTMLElement | null {
  const linhas = Array.from(tbody.querySelectorAll<HTMLElement>('tr[data-index]'));
  if (foco.item) {
    const mesmoItem = linhas.find((tr) => itemDaLinha.get(tr) === foco.item);
    if (mesmoItem) return mesmoItem;
  }
  if (foco.dataId !== null) {
    const mesmoId = linhas.find((tr) => tr.getAttribute('data-id') === foco.dataId);
    if (mesmoId) return mesmoId;
  }
  return linhas.find((tr) => Number(tr.getAttribute('data-index')) === foco.indiceLinha) ?? null;
}

/** Devolve o foco ao controle equivalente após recriar o corpo. Sem equivalente, não faz nada. */
export function restaurarFocoCelula(tbody: HTMLTableSectionElement, foco: FocoCelula | null): void {
  if (!foco) return;
  const tr = acharLinha(tbody, foco);
  const td = tr?.children[foco.indiceColuna];
  const alvo = td?.querySelectorAll<HTMLElement>('*')[foco.ordinal];
  if (!alvo || typeof alvo.focus !== 'function') return;
  alvo.focus({ preventScroll: true });
  // Edição ainda não gravada: reaplica se os dados não mudaram por baixo dela (senão o dado novo prevalece)
  if (foco.digitado !== undefined && ehControleEditavel(alvo) && valorRenderizado.get(alvo) === foco.valorInicial) {
    if (typeof foco.digitado === 'boolean') (alvo as HTMLInputElement).checked = foco.digitado;
    else alvo.value = foco.digitado;
  }
  if (foco.selecaoInicio !== null && foco.selecaoFim !== null) {
    try { (alvo as HTMLInputElement).setSelectionRange(foco.selecaoInicio, foco.selecaoFim); } catch { /* tipo sem seleção */ }
  }
}
