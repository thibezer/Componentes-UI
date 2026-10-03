/* ====================================================
   UI Tabela de Propriedades - Modo Flutuante
   Arrasto pelo cabeçalho, redimensionamento pelo canto e
   alternância de posicionamento flutuante / ancorado
   ==================================================== */

import { ListenerBag } from '../../core/listener-bag';

const LARGURA_FLUTUANTE_PADRAO = 300;
const ALTURA_FLUTUANTE_PADRAO = 480;

/**
 * Aplica ao host o posicionamento flutuante (fixed) ou o restaura ao fluxo normal.
 * Retorna o novo estado (true = flutuante).
 */
export function alternarPosicionamentoFlutuante(host: HTMLElement): boolean {
  const isFlutuante = host.hasAttribute('flutuante');
  if (isFlutuante) {
    host.removeAttribute('flutuante');
    host.style.left = '';
    host.style.top = '';
    host.style.right = '';
    host.style.bottom = '';
    host.style.position = '';
    host.style.zIndex = '';
  } else {
    host.setAttribute('flutuante', '');
    host.style.position = 'fixed';
    if (!host.style.left && !host.style.top) {
      const left = Math.max(
        20,
        (typeof window !== 'undefined' ? window.innerWidth : 1024) - LARGURA_FLUTUANTE_PADRAO - 30
      );
      host.style.left = `${left}px`;
      host.style.top = `70px`;
      host.style.width = `${LARGURA_FLUTUANTE_PADRAO}px`;
      host.style.height = `${ALTURA_FLUTUANTE_PADRAO}px`;
    }
  }
  return !isFlutuante;
}

export function conectarArrastoFlutuante(
  host: HTMLElement,
  shadow: ShadowRoot,
  listeners: ListenerBag
): void {
  const headerEl = shadow.getElementById('header');
  if (headerEl) {
    let dragId: number | null = null;
    let startX = 0;
    let startY = 0;
    let initLeft = 0;
    let initTop = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (dragId === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let nLeft = initLeft + dx;
      let nTop = initTop + dy;

      const maxL = Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 1024) - host.offsetWidth);
      const maxT = Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 768) - 30);
      nLeft = Math.max(0, Math.min(maxL, nLeft));
      nTop = Math.max(0, Math.min(maxT, nTop));

      host.style.left = `${nLeft}px`;
      host.style.top = `${nTop}px`;
      host.style.right = 'auto';
      host.style.bottom = 'auto';
    };

    const onPointerUp = (e: PointerEvent) => {
      if (dragId === null) return;
      try {
        headerEl.releasePointerCapture(e.pointerId);
      } catch (_err) {}
      headerEl.removeEventListener('pointermove', onPointerMove);
      headerEl.removeEventListener('pointerup', onPointerUp);
      headerEl.removeEventListener('pointercancel', onPointerUp);
      dragId = null;
      host.classList.remove('arrastando');

      host.dispatchEvent(new CustomEvent('ui-mover', {
        bubbles: true,
        composed: true,
        detail: { left: host.style.left, top: host.style.top }
      }));
    };

    listeners.add(headerEl, 'pointerdown', (e: PointerEvent) => {
      if (!host.hasAttribute('flutuante')) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, a')) return;
      if (e.button !== 0) return;

      e.preventDefault();
      dragId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;

      const rect = host.getBoundingClientRect();
      initLeft = rect.left;
      initTop = rect.top;

      host.classList.add('arrastando');
      try {
        headerEl.setPointerCapture(e.pointerId);
      } catch (_err) {}

      headerEl.addEventListener('pointermove', onPointerMove);
      headerEl.addEventListener('pointerup', onPointerUp);
      headerEl.addEventListener('pointercancel', onPointerUp);
    });
  }

  const resizerCanto = shadow.getElementById('resizer-canto');
  if (resizerCanto) {
    let resizeId: number | null = null;
    let startW = 0;
    let startH = 0;
    let startX = 0;
    let startY = 0;

    const onResizeMove = (e: PointerEvent) => {
      if (resizeId === null) return;
      const nw = Math.max(200, startW + (e.clientX - startX));
      const nh = Math.max(180, startH + (e.clientY - startY));
      host.style.width = `${nw}px`;
      host.style.height = `${nh}px`;
    };

    const onResizeUp = (e: PointerEvent) => {
      if (resizeId === null) return;
      try {
        resizerCanto.releasePointerCapture(e.pointerId);
      } catch (_err) {}
      resizerCanto.removeEventListener('pointermove', onResizeMove);
      resizerCanto.removeEventListener('pointerup', onResizeUp);
      resizerCanto.removeEventListener('pointercancel', onResizeUp);
      resizeId = null;

      host.dispatchEvent(new CustomEvent('ui-redimensionar', {
        bubbles: true,
        composed: true,
        detail: { width: host.style.width, height: host.style.height }
      }));
    };

    listeners.add(resizerCanto, 'pointerdown', (e: PointerEvent) => {
      if (!host.hasAttribute('flutuante')) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      resizeId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      const rect = host.getBoundingClientRect();
      startW = rect.width;
      startH = rect.height;

      try {
        resizerCanto.setPointerCapture(e.pointerId);
      } catch (_err) {}

      resizerCanto.addEventListener('pointermove', onResizeMove);
      resizerCanto.addEventListener('pointerup', onResizeUp);
      resizerCanto.addEventListener('pointercancel', onResizeUp);
    });
  }
}
