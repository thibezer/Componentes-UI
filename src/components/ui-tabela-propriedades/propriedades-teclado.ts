/* ====================================================
   UI Tabela de Propriedades - Atalhos de teclado do painel
   ==================================================== */

import { ListenerBag } from '../../core/listener-bag';

export interface ContextoTecladoPainel {
  shadow: ShadowRoot;
  listeners: ListenerBag;
  isModoManual: () => boolean;
  onAplicar: () => void;
}

/**
 * Ctrl/⌘+Enter aplica as alterações no modo manual, mesmo com o foco num campo: é um atalho
 * com modificador, então não colide com a digitação. O editor trata o Enter antes (fase alvo),
 * de modo que o valor em edição entra no Aplicar.
 */
export function conectarTecladoPainel(ctx: ContextoTecladoPainel): void {
  ctx.listeners.add(ctx.shadow, 'keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return;
    if (!ctx.isModoManual()) return;
    e.preventDefault();
    ctx.onAplicar();
  });
}
