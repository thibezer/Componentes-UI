/* ====================================================
   UI Camadas - Sincronização Cirúrgica de DOM
   Atualiza camada ativa, seleção, rodapé e filtro de busca
   in-place, sem redesenhar a árvore inteira
   ==================================================== */

import { CamadasHostCompleto } from './camadas-host';
import { ICONES } from './camadas-icones';
import { formatarMetricaFeicoes } from './camadas-metricas';

export function sincronizarCamadaAtivaDOM(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  const rows = shadow.querySelectorAll('[data-layer-row]');
  rows.forEach((row) => {
    const lid = row.getAttribute('data-layer-row');
    const isAtiva = lid === host.camadaAtivaId;
    row.classList.toggle('active-drawing-layer', isAtiva);

    const nameCol = row.querySelector('.ui-col-name');
    if (nameCol) {
      let badge = nameCol.querySelector('.ui-active-badge');
      if (isAtiva && !badge) {
        badge = document.createElement('span');
        badge.className = 'ui-active-badge';
        badge.textContent = '✓ Ativa';
        const chip = nameCol.querySelector('.ui-count-chip');
        if (chip) nameCol.insertBefore(badge, chip);
        else nameCol.appendChild(badge);
      } else if (!isAtiva && badge) {
        badge.remove();
      }
    }
  });
}

export function sincronizarSelecaoDOM(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  // 1. Atualizar linhas e targets de feições
  shadow.querySelectorAll('.ui-feat-row').forEach((row) => {
    const featId = row.getAttribute('data-feat-row');
    const isSelected = featId ? host.selectedFeatureIds.has(featId) : false;
    row.classList.toggle('selected-row', isSelected);
    row.setAttribute('aria-selected', String(isSelected));
    const circle = row.querySelector('.ui-target-circle');
    if (circle) circle.classList.toggle('selected', isSelected);
  });

  // 2. Atualizar targets de camadas (selected / partial / vazio)
  shadow.querySelectorAll('.ui-layer-group').forEach((group) => {
    const lid = group.getAttribute('data-layer-id');
    const feats = host.feicoes.filter((f) => f.layerId === lid);
    const circle = group.querySelector('.ui-layer-row .ui-target-circle');
    if (circle && feats.length > 0) {
      const allSel = feats.every((f) => host.selectedFeatureIds.has(f.id));
      const someSel = !allSel && feats.some((f) => host.selectedFeatureIds.has(f.id));
      circle.classList.toggle('selected', allSel);
      circle.classList.toggle('partial', someSel);
    } else if (circle) {
      circle.classList.remove('selected', 'partial');
    }
  });

  // 3. Atualizar rodapé de ações
  const feicoesSel = host.feicoes.filter((f) => host.selectedFeatureIds.has(f.id));
  const temSel = feicoesSel.length > 0;
  const countEl = shadow.getElementById('footer-count');
  const labelEl = shadow.getElementById('footer-label');

  if (countEl) {
    countEl.textContent = String(temSel ? feicoesSel.length : host.camadas.length);
  }
  if (labelEl) {
    labelEl.textContent = temSel
      ? feicoesSel.length > 1
        ? 'selecionados'
        : 'selecionado'
      : host.camadas.length > 1
      ? 'camadas'
      : 'camada';
  }

  const metricEl = shadow.querySelector('.ui-footer-metric');
  const metricaCalculada = formatarMetricaFeicoes(feicoesSel);
  if (metricEl) {
    if (metricaCalculada) {
      metricEl.innerHTML = `${ICONES.reguaMetrica} ${metricaCalculada}`;
      (metricEl as HTMLElement).style.display = 'inline-flex';
    } else {
      (metricEl as HTMLElement).style.display = 'none';
    }
  }

  // Habilitar/desabilitar botões do rodapé
  ['btn-footer-vis', 'btn-footer-lock', 'btn-footer-del'].forEach((id) => {
    const btn = shadow.getElementById(id) as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = !temSel;
      btn.classList.toggle('disabled', !temSel);
    }
  });

  const moveWrap = shadow.querySelector('.ui-footer-move-wrapper');
  if (moveWrap) moveWrap.classList.toggle('disabled', !temSel);

  const selMove = shadow.getElementById('select-footer-move') as HTMLSelectElement | null;
  if (selMove) selMove.disabled = !temSel;

  const colorWrap = shadow.querySelector('.ui-footer-color-wrapper');
  if (colorWrap) colorWrap.classList.toggle('disabled', !temSel);

  const inputColor = shadow.getElementById('input-footer-color') as HTMLInputElement | null;
  if (inputColor) inputColor.disabled = !temSel;

  let clearBtn = shadow.getElementById('btn-footer-clear');
  const rightFooter = shadow.querySelector('.ui-footer-right');
  if (temSel && !clearBtn && rightFooter) {
    clearBtn = document.createElement('button');
    clearBtn.id = 'btn-footer-clear';
    clearBtn.className = 'ui-footer-btn';
    clearBtn.title = 'Limpar seleção';
    clearBtn.innerHTML = ICONES.fechar;
    clearBtn.addEventListener('click', () => host.limparSelecao(true));
    rightFooter.appendChild(clearBtn);
  } else if (!temSel && clearBtn) {
    clearBtn.remove();
  }
}
