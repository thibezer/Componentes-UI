import { CategoriaPropriedades } from './tipos';

export function focarProximoEditor(shadow: ShadowRoot, atual: HTMLElement): void {
  const editores = Array.from(
    shadow.querySelectorAll<HTMLElement>(
      '.ui-prop__linha input:not([disabled]):not([type="color"]):not(.ui-prop__cor-picker-oculto), ' +
      '.ui-prop__linha select:not([disabled]), ' +
      '.ui-prop__linha .ui-prop__btn-acao-inline:not([disabled])'
    )
  );
  const idx = editores.indexOf(atual);
  if (idx !== -1 && idx + 1 < editores.length) {
    const prox = editores[idx + 1];
    prox.focus();
    if (prox instanceof HTMLInputElement) {
      prox.select();
    }
  }
}

export function atualizarCampoVisual(shadow: ShadowRoot, propId: string, novoValor: any): void {
  const linha = shadow.querySelector(`[data-prop-id="${propId}"]`);
  if (!linha) return;

  const input = linha.querySelector('input:not([type="color"]):not(.ui-prop__cor-picker-oculto)') as HTMLInputElement | null;
  if (input) {
    input.value = String(novoValor ?? '');
  }
}

export function expandirTodasCategorias(shadow: ShadowRoot, categorias: CategoriaPropriedades[]): void {
  categorias.forEach(cat => cat.aberto = true);
  const catEls = shadow.querySelectorAll('.ui-prop__categoria');
  catEls.forEach(el => el.classList.add('ui-prop__categoria--aberta'));
}

export function colapsarTodasCategorias(shadow: ShadowRoot, categorias: CategoriaPropriedades[]): void {
  categorias.forEach(cat => cat.aberto = false);
  const catEls = shadow.querySelectorAll('.ui-prop__categoria');
  catEls.forEach(el => el.classList.remove('ui-prop__categoria--aberta'));
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
    const el = shadow.querySelector(`[data-cat-id="${idCategoria}"]`);
    if (el) {
      el.classList.toggle('ui-prop__categoria--aberta', Boolean(cat.aberto));
    }
    host.dispatchEvent(
      new CustomEvent('ui-categoria-toggle', {
        bubbles: true,
        composed: true,
        detail: { id: idCategoria, aberto: cat.aberto }
      })
    );
  }
}
