/* ====================================================
   UI Camadas - Sincronização Cirúrgica de DOM
   Atualiza camada ativa, seleção, rodapé e filtro de busca
   in-place, sem redesenhar a árvore inteira
   ==================================================== */

import { CamadasHostCompleto } from './camadas-host';
import { ICONES } from './camadas-icones';
import { formatarMetricaFeicoes } from './camadas-metricas';
import { feicoesPorRamo } from './camadas-selecao';
import { calcularEstadoHerdado } from './camadas-hierarquia';
import { definirRotuloControle } from './camadas-utils';

export function sincronizarCamadaAtivaDOM(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  const rows = shadow.querySelectorAll('[data-layer-row]');
  rows.forEach((row) => {
    const lid = row.getAttribute('data-layer-row');
    const isAtiva = lid === host.camadaAtivaId;
    row.classList.toggle('active-drawing-layer', isAtiva);
    if (isAtiva) row.setAttribute('aria-current', 'true');
    else row.removeAttribute('aria-current');
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

  // 2. Atualizar targets de camadas (selected / partial / vazio), considerando o ramo inteiro
  const ramos = feicoesPorRamo(host.camadas, host.feicoes, host.searchQuery);
  shadow.querySelectorAll('.ui-layer-group').forEach((group) => {
    const lid = group.getAttribute('data-layer-id');
    const feats = (lid && ramos.get(lid)) || [];
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

  // Alternar modos do rodapé: modo resumo vs modo ações em massa
  const treeFooter = shadow.querySelector('.ui-tree-footer');
  if (treeFooter) {
    treeFooter.classList.toggle('tem-selecao', temSel);
    treeFooter.classList.toggle('sem-selecao', !temSel);
  }

  const actionsGerais = shadow.querySelector('.ui-footer-actions-gerais') as HTMLElement | null;
  if (actionsGerais) {
    actionsGerais.style.display = temSel ? 'none' : 'flex';
  }

  const bulkActions = shadow.querySelector('.ui-footer-bulk-actions') as HTMLElement | null;
  if (bulkActions) {
    bulkActions.style.display = temSel ? 'flex' : 'none';
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
    clearBtn.className = 'ui-footer-btn btn-clear-footer';
    definirRotuloControle(clearBtn, 'Limpar seleção');
    clearBtn.innerHTML = ICONES.fechar;
    clearBtn.addEventListener('click', () => host.limparSelecao(true));
    rightFooter.appendChild(clearBtn);
  } else if (!temSel && clearBtn) {
    clearBtn.remove();
  }
}

/**
 * Reflete no DOM o estado herdado dos grupos (sem redesenhar a árvore): esmaece o que está sob um
 * grupo oculto e trava os cadeados das feições cuja camada, ou um grupo acima dela, está travada.
 */
export function sincronizarHerancaDOM(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  const herdado = calcularEstadoHerdado(host.camadas);
  const camadaPorId = new Map(host.camadas.map((l) => [l.id, l]));

  shadow.querySelectorAll('.ui-layer-row').forEach((row) => {
    const estado = herdado.get(row.getAttribute('data-layer-row') || '');
    row.classList.toggle('herdado-oculto', estado?.ocultaPorAncestral === true);
    row.classList.toggle('herdado-travado', estado?.travadaPorAncestral === true);
  });

  const feicaoPorId = new Map(host.feicoes.map((f) => [f.id, f]));
  shadow.querySelectorAll('.ui-feat-row').forEach((row) => {
    const lid = row.getAttribute('data-feat-layer') || '';
    const camada = camadaPorId.get(lid);
    const estado = herdado.get(lid);
    row.classList.toggle('herdado-oculto', camada?.visible === false || estado?.ocultaPorAncestral === true);

    const cadeado = row.querySelector('[data-feat-lock]');
    const feicao = feicaoPorId.get(row.getAttribute('data-feat-row') || '');
    if (!cadeado || !feicao) return;
    const travadaPelaCamada = camada?.locked === true || estado?.travadaPorAncestral === true;
    const travada = feicao.locked === true || travadaPelaCamada;
    cadeado.innerHTML = travada ? ICONES.cadeadoTrancado : ICONES.cadeadoAberto;
    cadeado.classList.toggle('ui-lock-open', !travada);
    if (travadaPelaCamada) cadeado.setAttribute('data-locked-by-layer', 'true');
    else cadeado.removeAttribute('data-locked-by-layer');
    definirRotuloControle(
      cadeado,
      travadaPelaCamada ? 'Bloqueada pela camada' : travada ? 'Desbloquear Feição' : 'Bloquear Feição'
    );
  });
}
