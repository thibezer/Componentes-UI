/**
 * Renderizador e Gerenciador de Interações do Painel Lateral de Camadas (<ui-canvas-cad>).
 * Responsabilidade única: sincronização da lista de camadas no DOM, controles de visibilidade,
 * opacidade, bloqueio e modo de escala métrico/tela.
 */

import type { CanvasLayerDef, ScaleMode } from '../../gerencigeo-canvas/types';
import { ListenerBag } from '../../core/listener-bag';

export interface PainelCamadasCallbacks {
  setLayerVisibility: (id: string, visivel: boolean) => void;
  setLayerOpacity: (id: string, opacidade: number) => void;
  setLayerBlocked: (id: string, bloqueada: boolean) => void;
  setLayerScaleMode: (id: string, mode: ScaleMode) => void;
}

export function renderizarPainelCamadas(
  container: HTMLElement | null,
  layers: CanvasLayerDef[],
  layerItemListeners: ListenerBag,
  callbacks: PainelCamadasCallbacks
): void {
  if (!container) return;

  // Se já existem itens renderizados para as mesmas camadas, apenas sincroniza os valores
  const existingItems = container.querySelectorAll('.layer-item');
  if (existingItems.length === layers.length) {
    layers.forEach(layer => {
      const item = container.querySelector(`.layer-item[data-layer-id="${layer.id}"]`);
      if (item) {
        const chk = item.querySelector('.layer-chk-visibility') as HTMLInputElement | null;
        if (chk && chk.checked !== layer.visivel) chk.checked = layer.visivel;

        const slider = item.querySelector('.layer-opacity-slider') as HTMLInputElement | null;
        const percentLabel = item.querySelector('.opacity-percent-label') as HTMLSpanElement | null;
        const currentPct = Math.round(layer.opacidade * 100);
        if (slider && parseInt(slider.value, 10) !== currentPct) slider.value = String(currentPct);
        if (percentLabel) percentLabel.textContent = `${currentPct}%`;

        const lockBtn = item.querySelector('.btn-lock-layer') as HTMLButtonElement | null;
        if (lockBtn) {
          lockBtn.classList.toggle('active', !!layer.bloqueada);
          lockBtn.title = layer.bloqueada ? 'Desbloquear Camada' : 'Bloquear Camada';
        }

        const scalePill = item.querySelector('.btn-toggle-scale-mode') as HTMLSpanElement | null;
        if (scalePill && layer.estilo?.scaleMode) {
          scalePill.textContent = layer.estilo?.scaleMode === 'world' ? 'Métrico' : 'Tela';
        }
      }
    });
    return;
  }

  container.innerHTML = `
    ${layers.map(layer => `
      <div class="layer-item" data-layer-id="${layer.id}">
        <div class="layer-item-row">
          <label class="layer-item-label">
            <input type="checkbox" class="layer-chk-visibility" data-layer-id="${layer.id}" ${layer.visivel ? 'checked' : ''} />
            <span>${layer.nome}</span>
          </label>
          <div class="layer-item-actions">
            <button class="btn-layer-action btn-lock-layer ${layer.bloqueada ? 'active' : ''}" data-layer-id="${layer.id}" type="button" title="${layer.bloqueada ? 'Desbloquear Camada' : 'Bloquear Camada'}">
              ${layer.bloqueada 
                ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
                : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`}
            </button>
            ${layer.estilo?.scaleMode ? `
              <span class="scale-mode-pill btn-toggle-scale-mode" data-layer-id="${layer.id}" title="Alternar modo de escala">
                ${layer.estilo?.scaleMode === 'world' ? 'Métrico' : 'Tela'}
              </span>
            ` : ''}
          </div>
        </div>
        <div class="layer-controls-row">
          <span>Opacidade</span>
          <input type="range" min="0" max="100" value="${Math.round(layer.opacidade * 100)}" class="layer-opacity-slider" data-layer-id="${layer.id}" />
          <span class="opacity-percent-label" style="font-family:monospace; font-size:9px; width:28px; text-align:right;">${Math.round(layer.opacidade * 100)}%</span>
        </div>
      </div>
    `).join('')}
  `;

  layerItemListeners.cleanup();

  // Eventos de checkboxes de visibilidade
  container.querySelectorAll('.layer-chk-visibility').forEach(chk => {
    layerItemListeners.add(chk, 'change', (e: Event) => {
      const id = (e.target as HTMLElement).getAttribute('data-layer-id');
      const checked = (e.target as HTMLInputElement).checked;
      if (id) callbacks.setLayerVisibility(id, checked);
    });
  });

  // Eventos de slider de opacidade em tempo real
  container.querySelectorAll('.layer-opacity-slider').forEach(slider => {
    layerItemListeners.add(slider, 'input', (e: Event) => {
      const id = (e.target as HTMLElement).getAttribute('data-layer-id');
      const pct = parseInt((e.target as HTMLInputElement).value, 10);
      const val = pct / 100;
      const row = (e.target as HTMLElement).closest('.layer-item');
      const label = row?.querySelector('.opacity-percent-label');
      if (label) label.textContent = `${pct}%`;
      if (id) callbacks.setLayerOpacity(id, val);
    });
  });

  // Eventos de bloqueio de camada
  container.querySelectorAll('.btn-lock-layer').forEach(btn => {
    layerItemListeners.add(btn, 'click', (e: Event) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-layer-id');
      if (id) {
        const l = layers.find(item => item.id === id);
        if (l) callbacks.setLayerBlocked(id, !l.bloqueada);
      }
    });
  });

  // Eventos de alternância de modo de escala
  container.querySelectorAll('.btn-toggle-scale-mode').forEach(pill => {
    layerItemListeners.add(pill, 'click', (e: Event) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-layer-id');
      if (id) {
        const l = layers.find(item => item.id === id);
        if (l) {
          const nextMode = l.estilo?.scaleMode === 'world' ? 'screen' : 'world';
          callbacks.setLayerScaleMode(id, nextMode);
        }
      }
    });
  });
}
