/**
 * Gerenciador de redimensionamento responsivo e invalidação dimensional defensiva (<ui-canvas-cad>).
 * Responsabilidade única: encapsular ResizeObserver com debounce e salvaguarda contra exceções
 * causadas por panes Leaflet desanexados (undefined._leaflet_pos).
 */

import type { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';

export interface ControladorTamanhoCanvas {
  observe: () => void;
  disconnect: () => void;
  invalidateSizeSafely: () => void;
}

export function criarControladorTamanho(
  host: HTMLElement,
  controller: GerenciGeoMapaController
): ControladorTamanhoCanvas {
  let resizeObserver: ResizeObserver | null = null;
  let resizeDebounceTimer: number | null = null;
  let lastHostWidth: number = 0;
  let lastHostHeight: number = 0;

  function invalidateSizeSafely(): void {
    try {
      if (!host.isConnected) return;
      const map = controller.getMap();
      if (!map) return;

      const container = map.getContainer?.();
      if (!container || !container.parentNode) return;

      controller.invalidateSize();
    } catch {
      // Absorve tentativas de leitura com panes desanexados, eliminando exceções do tipo undefined._leaflet_pos
    }
  }

  function triggerDebouncedResize(delayMs: number = 25): void {
    if (resizeDebounceTimer !== null) {
      window.clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = null;
    }

    resizeDebounceTimer = window.setTimeout(() => {
      resizeDebounceTimer = null;
      invalidateSizeSafely();
    }, delayMs);
  }

  function observe(): void {
    disconnect();

    if (typeof ResizeObserver === 'undefined') return;

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        let w = 0;
        let h = 0;

        if (entry.contentRect) {
          w = entry.contentRect.width;
          h = entry.contentRect.height;
        } else if (entry.borderBoxSize && entry.borderBoxSize.length > 0) {
          w = entry.borderBoxSize[0].inlineSize;
          h = entry.borderBoxSize[0].blockSize;
        } else {
          w = host.clientWidth || host.offsetWidth;
          h = host.clientHeight || host.offsetHeight;
        }

        // Ao detectar variação de largura ou altura > 0
        if (w > 0 && h > 0) {
          if (Math.abs(w - lastHostWidth) >= 0.5 || Math.abs(h - lastHostHeight) >= 0.5) {
            lastHostWidth = w;
            lastHostHeight = h;
            triggerDebouncedResize(25);
          }
        }
      }
    });

    resizeObserver.observe(host);
  }

  function disconnect(): void {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (resizeDebounceTimer !== null) {
      window.clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = null;
    }
  }

  return {
    observe,
    disconnect,
    invalidateSizeSafely
  };
}
