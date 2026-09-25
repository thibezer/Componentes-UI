/**
 * Controlador de Redimensionamento do Divisor Vertical (Splitter) (<ui-tabela-propriedades>).
 * Responsabilidade única: gerenciar o arraste com mouse/toque, restrições mínimas de largura
 * (80px rótulo / 130px valor), teto de proporção (20% a 65%) e reset para 45% com duplo-clique.
 */

import { ListenerBag } from '../../core/listener-bag';

export interface ContextoSplitterPropriedades {
  splitterElement: HTMLElement | null;
  corpoElement: HTMLElement | null;
  hostElement: HTMLElement;
  splitterListeners: ListenerBag;
  onLarguraAlterada: (larguraPorcentagem: number) => void;
}

export interface ControladorSplitterPropriedades {
  init: () => void;
  definirLarguraRotulo: (porcentagem: number) => number;
}

export function criarControladorSplitter(ctx: ContextoSplitterPropriedades): ControladorSplitterPropriedades {
  let larguraRotuloPorcentagem: number = 45;

  function definirLarguraRotulo(porcentagem: number): number {
    const clamped = Math.max(20, Math.min(65, porcentagem));
    larguraRotuloPorcentagem = clamped;
    ctx.hostElement.style.setProperty('--ui-prop-rotulo-largura', `${clamped}%`);
    if (ctx.splitterElement) {
      ctx.splitterElement.style.left = `calc(${clamped}% - 4px)`;
    }
    return clamped;
  }

  function init(): void {
    if (!ctx.splitterElement || !ctx.corpoElement) return;

    ctx.splitterListeners.cleanup();

    let isDragging = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      ctx.splitterElement!.classList.add('ui-prop__splitter--ativo');
      try {
        ctx.splitterElement!.setPointerCapture(e.pointerId);
      } catch (_err) {}

      const corpoRect = ctx.corpoElement!.getBoundingClientRect();

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!isDragging) return;
        const totalLargura = corpoRect.width;
        if (totalLargura <= 0) return;
        const offset = moveEvent.clientX - corpoRect.left;

        // Limite mínimo em pixels: rótulo mínimo 80px e valor restante mínimo 130px
        const minRotuloPx = 80;
        const minValorPx = 130;
        const offsetLimitado = Math.max(minRotuloPx, Math.min(totalLargura - minValorPx, offset));

        let pct = (offsetLimitado / totalLargura) * 100;
        pct = Math.max(20, Math.min(65, pct)); // Teto de 65% impede estrangulamento da coluna de valores
        definirLarguraRotulo(pct);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        if (!isDragging) return;
        isDragging = false;
        ctx.splitterElement!.classList.remove('ui-prop__splitter--ativo');
        try {
          if (ctx.splitterElement!.hasPointerCapture(upEvent.pointerId)) {
            ctx.splitterElement!.releasePointerCapture(upEvent.pointerId);
          }
        } catch (_err) {}

        ctx.splitterElement!.removeEventListener('pointermove', onPointerMove);
        ctx.splitterElement!.removeEventListener('pointerup', onPointerUp);
        ctx.splitterElement!.removeEventListener('pointercancel', onPointerUp);

        ctx.onLarguraAlterada(larguraRotuloPorcentagem);
        ctx.hostElement.dispatchEvent(
          new CustomEvent('ui-splitter-resize', {
            bubbles: true,
            composed: true,
            detail: { larguraPorcentagem: larguraRotuloPorcentagem }
          })
        );
      };

      ctx.splitterElement!.addEventListener('pointermove', onPointerMove);
      ctx.splitterElement!.addEventListener('pointerup', onPointerUp);
      ctx.splitterElement!.addEventListener('pointercancel', onPointerUp);
    };

    ctx.splitterListeners.add(ctx.splitterElement, 'pointerdown', onPointerDown);

    // Duplo-clique no splitter reseta para 45% (posição padrão de equilíbrio CAD)
    ctx.splitterListeners.add(ctx.splitterElement, 'dblclick', () => {
      definirLarguraRotulo(45);
      ctx.onLarguraAlterada(45);
      ctx.hostElement.dispatchEvent(
        new CustomEvent('ui-splitter-resize', {
          bubbles: true,
          composed: true,
          detail: { larguraPorcentagem: 45 }
        })
      );
    });
  }

  return {
    init,
    definirLarguraRotulo
  };
}
