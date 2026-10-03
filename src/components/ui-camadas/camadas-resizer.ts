/* ====================================================
   UI Camadas - Controlador de Redimensionamento Vertical
   Gerencia a barra de arraste (splitter/resizer handle)
   para ajuste de altura do componente sem que ele colapse
   ==================================================== */

import { ListenerBag } from '../../core/listener-bag';

export interface ContextoResizerCamadas {
  hostElement: HTMLElement;
  resizerElement: HTMLElement | null;
  listeners: ListenerBag;
  getMinAltura?: () => number;
  getMaxAltura?: () => number;
  onAlturaAlterada?: (alturaPx: number | null) => void;
  onRedimensionando?: (alturaPx: number) => void;
}

export interface ControladorResizerCamadas {
  init: () => void;
  definirAltura: (alturaPx: number | string | null, dispararEvento?: boolean) => void;
  destruir: () => void;
}

export function criarControladorRedimensionamentoAltura(
  ctx: ContextoResizerCamadas
): ControladorResizerCamadas {
  const minPadrao = 140;
  const maxPadrao = 1600;

  function obterMin(): number {
    return ctx.getMinAltura ? ctx.getMinAltura() : minPadrao;
  }

  function obterMax(): number {
    return ctx.getMaxAltura ? ctx.getMaxAltura() : maxPadrao;
  }

  function definirAltura(alturaPx: number | string | null, dispararEvento = false): void {
    if (alturaPx === null || alturaPx === undefined || alturaPx === '') {
      ctx.hostElement.style.removeProperty('height');
      ctx.hostElement.style.removeProperty('--ui-camadas-altura');
      if (dispararEvento) {
        ctx.hostElement.dispatchEvent(
          new CustomEvent('ui-redimensionar-altura', {
            bubbles: true,
            composed: true,
            detail: { altura: null }
          })
        );
      }
      return;
    }

    const valorNumerico = typeof alturaPx === 'number' ? alturaPx : parseFloat(String(alturaPx));
    if (isNaN(valorNumerico)) return;

    const clamped = Math.max(obterMin(), Math.min(obterMax(), Math.round(valorNumerico)));
    ctx.hostElement.style.height = `${clamped}px`;
    ctx.hostElement.style.setProperty('--ui-camadas-altura', `${clamped}px`);

    if (dispararEvento) {
      ctx.hostElement.dispatchEvent(
        new CustomEvent('ui-redimensionar-altura', {
          bubbles: true,
          composed: true,
          detail: { altura: clamped }
        })
      );
    }
  }

  function init(): void {
    if (!ctx.resizerElement) return;

    let isDragging = false;
    let startY = 0;
    let startHeight = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Apenas botão principal
      e.preventDefault();
      e.stopPropagation();

      isDragging = true;
      startY = e.clientY;
      startHeight = ctx.hostElement.getBoundingClientRect().height;

      ctx.resizerElement!.classList.add('ui-camadas-resizer--ativo');
      ctx.hostElement.classList.add('ui-camadas--redimensionando');

      try {
        ctx.resizerElement!.setPointerCapture(e.pointerId);
      } catch (_err) {}

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!isDragging) return;
        moveEvent.preventDefault();

        const deltaY = moveEvent.clientY - startY;
        const novaAltura = Math.max(obterMin(), Math.min(obterMax(), Math.round(startHeight + deltaY)));

        ctx.hostElement.style.height = `${novaAltura}px`;
        ctx.hostElement.style.setProperty('--ui-camadas-altura', `${novaAltura}px`);

        if (ctx.onRedimensionando) {
          ctx.onRedimensionando(novaAltura);
        }

        ctx.hostElement.dispatchEvent(
          new CustomEvent('ui-redimensionando-altura', {
            bubbles: true,
            composed: true,
            detail: { altura: novaAltura }
          })
        );
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        if (!isDragging) return;
        isDragging = false;

        ctx.resizerElement!.classList.remove('ui-camadas-resizer--ativo');
        ctx.hostElement.classList.remove('ui-camadas--redimensionando');

        try {
          if (ctx.resizerElement!.hasPointerCapture(upEvent.pointerId)) {
            ctx.resizerElement!.releasePointerCapture(upEvent.pointerId);
          }
        } catch (_err) {}

        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        const alturaFinal = ctx.hostElement.getBoundingClientRect().height;
        const alturaArredondada = Math.round(alturaFinal);

        if (ctx.onAlturaAlterada) {
          ctx.onAlturaAlterada(alturaArredondada);
        }

        ctx.hostElement.dispatchEvent(
          new CustomEvent('ui-redimensionar-altura', {
            bubbles: true,
            composed: true,
            detail: { altura: alturaArredondada }
          })
        );
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    };

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      definirAltura(null, true);
      if (ctx.onAlturaAlterada) {
        ctx.onAlturaAlterada(null);
      }
    };

    ctx.listeners.add(ctx.resizerElement, 'pointerdown', onPointerDown);
    ctx.listeners.add(ctx.resizerElement, 'dblclick', onDblClick);
  }

  function destruir(): void {
    ctx.listeners.cleanup();
  }

  return {
    init,
    definirAltura,
    destruir
  };
}
