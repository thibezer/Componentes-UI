export interface ContextoAtributosTabela {
  host: HTMLElement;
  containerElement: HTMLDivElement | null;
  emptyElement: HTMLDivElement | null;
  loadingElement: HTMLDivElement | null;
  onTextoVazioAlterado: (texto: string) => void;
  onVirtualizarAlterado: (virtualizar: boolean) => void;
  onCarregarSrc: (src: string) => void;
  onCarregandoAlterado: (carregando: boolean) => void;
  onRenderBody: () => void;
  onRenderTotal: () => void;
}

export function sincronizarAtributosTabela(ctx: ContextoAtributosTabela): void {
  const textoVazioAttr = ctx.host.getAttribute('texto-vazio') || ctx.host.getAttribute('empty-text');
  if (textoVazioAttr) ctx.onTextoVazioAlterado(textoVazioAttr);

  const virtAttr = ctx.host.getAttribute('virtualizar') || ctx.host.getAttribute('virtualize');
  if (virtAttr !== null) ctx.onVirtualizarAlterado(virtAttr !== 'false');

  const srcAttr = ctx.host.getAttribute('src');
  if (srcAttr && ctx.host.isConnected) {
    ctx.onCarregarSrc(srcAttr);
  }

  const carregando = ctx.host.hasAttribute('carregando') || ctx.host.hasAttribute('loading');
  ctx.onCarregandoAlterado(carregando);
  if (ctx.loadingElement) {
    ctx.loadingElement.style.display = carregando ? 'flex' : 'none';
  }
}

export function tratarMudancaAtributoTabela(
  name: string,
  newVal: string | null,
  ctx: ContextoAtributosTabela
): void {
  sincronizarAtributosTabela(ctx);

  if (name === 'max-height' && ctx.containerElement) {
    ctx.containerElement.style.maxHeight = newVal || '';
    return;
  }
  if ((name === 'texto-vazio' || name === 'empty-text') && ctx.emptyElement) {
    const textSpan = ctx.emptyElement.querySelector('.ui-tabela__empty-text');
    if (textSpan && newVal) textSpan.textContent = newVal;
    ctx.onRenderBody();
    return;
  }
  if (name === 'carregando' || name === 'loading') {
    if (ctx.loadingElement) {
      ctx.loadingElement.style.display = (newVal !== null) ? 'flex' : 'none';
    }
    return;
  }
  if (name === 'densidade' || name === 'density') {
    ctx.onRenderBody();
    return;
  }
  ctx.onRenderTotal();
}
