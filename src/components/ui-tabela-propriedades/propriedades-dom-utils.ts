import { CategoriaPropriedades, ContextoEditorPropriedade } from './tipos';

/** Editores focáveis pela navegação Enter → próximo campo (inclui booleano e amostra de cor). */
const SELETOR_EDITORES =
  '.ui-prop__linha input:not([disabled]):not([type="color"]):not(.ui-prop__cor-picker-oculto), ' +
  '.ui-prop__linha select:not([disabled]), ' +
  '.ui-prop__linha .ui-prop__btn-acao-inline:not([disabled]), ' +
  '.ui-prop__linha .ui-prop__editor-booleano, ' +
  '.ui-prop__linha .ui-prop__editor-cor-container';

/**
 * Linha de uma propriedade. Compara o atributo em vez de montar um seletor CSS com o id:
 * ids com aspas, colchetes ou barras não quebram a consulta.
 */
export function buscarLinhaPropriedade(raiz: ParentNode | null | undefined, propId: string): HTMLElement | null {
  if (!raiz) return null;
  const alvo = String(propId);
  return Array.from(raiz.querySelectorAll<HTMLElement>('[data-prop-id]'))
    .find(el => el.getAttribute('data-prop-id') === alvo) ?? null;
}

/* ---------- Atualização de editores sem recriar a linha ---------- */

const atualizadores = new WeakMap<Element, (valor: any) => void>();

/** Cada editor registra como refletir um novo valor (usado por `definirValor` e pelo scrubber). */
export function registrarAtualizadorEditor(editor: Element, atualizar: (valor: any) => void): void {
  atualizadores.set(editor, atualizar);
}

/**
 * Atualiza o editor na tela para o novo valor, qualquer que seja o tipo (texto, número, seleção,
 * booleano, cores, linha). Não recria a linha: preserva foco e arrastos em andamento.
 */
export function atualizarCampoVisual(shadow: ShadowRoot, propId: string, novoValor: any): void {
  const linha = buscarLinhaPropriedade(shadow, propId);
  const editor = linha?.querySelector('.ui-prop__col-valor')?.firstElementChild;
  if (editor) atualizadores.get(editor)?.(novoValor);
}

/* ---------- Opções de <select> com valores fora da lista ---------- */

/**
 * Seleciona a opção correspondente ao valor. Valor fora da lista ganha uma opção própria
 * (`data-externa`) em vez de o select exibir a primeira opção como se fosse o valor real.
 */
export function sincronizarSelect(
  select: HTMLSelectElement,
  valor: any,
  corresponde: (opcao: string, valor: any) => boolean = (o, v) => o === String(v),
  rotuloExterno: (valor: any) => string = (v) => (v == null || v === '' ? '—' : String(v))
): void {
  select.querySelector('option[data-externa]')?.remove();
  const opcao = Array.from(select.options).find(o => !o.hasAttribute('data-acao') && corresponde(o.value, valor));
  if (opcao) {
    opcao.selected = true;
    return;
  }
  const externa = document.createElement('option');
  externa.value = valor == null ? '' : String(valor);
  externa.textContent = rotuloExterno(valor);
  externa.setAttribute('data-externa', '');
  externa.hidden = true;
  select.insertBefore(externa, select.firstChild);
  externa.selected = true;
}

/**
 * Exibe o estado misto ("Varia") no select: opção oculta e desabilitada, que o usuário não
 * consegue escolher; qualquer outra opção vira o valor de todos os objetos.
 */
export function marcarSelectMisto(select: HTMLSelectElement, texto: string): void {
  select.querySelector('option[data-externa]')?.remove();
  const misto = document.createElement('option');
  misto.value = '';
  misto.textContent = texto;
  misto.setAttribute('data-externa', '');
  misto.setAttribute('data-misto', '');
  misto.hidden = true;
  misto.disabled = true;
  select.insertBefore(misto, select.firstChild);
  misto.selected = true;
}

/* ---------- Navegação e categorias ---------- */

/** Editores navegáveis: os de categorias recolhidas (display: none) não recebem foco e são pulados. */
function editoresVisiveis(shadow: ShadowRoot): HTMLElement[] {
  return Array.from(shadow.querySelectorAll<HTMLElement>(SELETOR_EDITORES)).filter(el => {
    const cat = el.closest('.ui-prop__categoria');
    return !cat || cat.classList.contains('ui-prop__categoria--aberta');
  });
}

function focarEditorRelativo(shadow: ShadowRoot, atual: HTMLElement, delta: 1 | -1): void {
  const editores = editoresVisiveis(shadow);
  const idx = editores.indexOf(atual);
  const prox = idx === -1 ? undefined : editores[idx + delta];
  if (prox) {
    prox.focus();
    if (prox instanceof HTMLInputElement) {
      prox.select();
    }
  }
}

export function focarProximoEditor(shadow: ShadowRoot, atual: HTMLElement): void {
  focarEditorRelativo(shadow, atual, 1);
}

export function focarEditorAnterior(shadow: ShadowRoot, atual: HTMLElement): void {
  focarEditorRelativo(shadow, atual, -1);
}

/** Enter vai ao próximo campo; Shift+Enter volta ao anterior (como numa planilha). */
export function navegarAposEnter(ctx: ContextoEditorPropriedade, el: HTMLElement, evento: KeyboardEvent): void {
  if (evento.shiftKey && ctx.focarEditorAnterior) ctx.focarEditorAnterior(el);
  else ctx.focarProximoEditor(el);
}

function marcarCategoria(el: Element, aberta: boolean): void {
  el.classList.toggle('ui-prop__categoria--aberta', aberta);
  el.querySelector('.ui-prop__categoria-header')?.setAttribute('aria-expanded', String(aberta));
}

export function expandirTodasCategorias(shadow: ShadowRoot, categorias: CategoriaPropriedades[]): void {
  categorias.forEach(cat => cat.aberto = true);
  shadow.querySelectorAll('.ui-prop__categoria').forEach(el => marcarCategoria(el, true));
}

export function colapsarTodasCategorias(shadow: ShadowRoot, categorias: CategoriaPropriedades[]): void {
  categorias.forEach(cat => cat.aberto = false);
  shadow.querySelectorAll('.ui-prop__categoria').forEach(el => marcarCategoria(el, false));
}

export function alternarCategoria(
  shadow: ShadowRoot,
  host: HTMLElement,
  categorias: CategoriaPropriedades[],
  idCategoria: string
): void {
  const cat = categorias.find(c => c.id === idCategoria);
  if (cat) {
    cat.aberto = cat.aberto === false ? true : false;
    const el = Array.from(shadow.querySelectorAll('[data-cat-id]'))
      .find(c => c.getAttribute('data-cat-id') === idCategoria);
    if (el) marcarCategoria(el, Boolean(cat.aberto));
    host.dispatchEvent(
      new CustomEvent('ui-categoria-toggle', {
        bubbles: true,
        composed: true,
        detail: { id: idCategoria, aberto: cat.aberto }
      })
    );
  }
}
