/* ====================================================
   UI Camadas - Sincronização Cirúrgica de DOM
   Atualiza camada ativa, seleção, rodapé e filtro de busca
   in-place, sem redesenhar a árvore inteira
   ==================================================== */

import { alternarPart } from '../../core/parts';
import { CamadasHostCompleto } from './camadas-host';
import { obterFeicoesDoEscopoCamada } from './camadas-hierarquia';
import { rotuloRodape } from './camadas-rodape';

export function sincronizarCamadaAtivaDOM(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  const rows = shadow.querySelectorAll('[data-layer-row]');
  rows.forEach((row) => {
    const lid = row.getAttribute('data-layer-row');
    const isAtiva = lid === host.camadaAtivaId;
    row.classList.toggle('active-drawing-layer', isAtiva);
    alternarPart(row, 'camada-ativa', isAtiva);
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
    alternarPart(row, 'feicao-selecionada', isSelected);
    row.setAttribute('aria-selected', String(isSelected));
    const circle = row.querySelector('.ui-target-circle');
    if (circle) circle.classList.toggle('selected', isSelected);
  });

  // 2. Atualizar targets de camadas (selected / partial / vazio) considerando subárvore
  shadow.querySelectorAll('.ui-layer-group').forEach((group) => {
    const lid = group.getAttribute('data-layer-id');
    const feats = obterFeicoesDoEscopoCamada(host.camadas, host.feicoes, lid ?? '');
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
    const rotulo = rotuloRodape(host.camadas.length, feicoesSel.length);
    labelEl.innerHTML = rotulo.icone;
    labelEl.title = rotulo.texto;
    labelEl.setAttribute('aria-label', rotulo.texto);
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
  ['btn-footer-del'].forEach((id) => {
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
}
