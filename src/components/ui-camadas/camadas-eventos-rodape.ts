/* ====================================================
   UI Camadas - Eventos do Rodapé
   Ações em massa sobre as feições selecionadas
   ==================================================== */

import { CamadasHostCompleto } from './camadas-host';
import { definirRotuloControle } from './camadas-utils';

export function conectarEventosRodape(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  // Visibilidade coletiva
  const btnFooterVis = shadow.getElementById('btn-footer-vis');
  if (btnFooterVis) {
    btnFooterVis.addEventListener('click', () => {
      const selFeats = host.feicoes.filter((f) => host.selectedFeatureIds.has(f.id));
      if (selFeats.length === 0) return;
      const someVis = selFeats.some((f) => f.visible !== false);
      const novoVis = !someVis;
      selFeats.forEach((f) => (f.visible = novoVis));
      host.dispararEvento('ui-acao-massa', {
        acao: 'visibilidade',
        feicoesIds: selFeats.map((f) => f.id),
        feicoes: selFeats,
        valor: novoVis
      });
      host.solicitarRenderizacao();
    });
  }

  // Trava coletiva
  const btnFooterLock = shadow.getElementById('btn-footer-lock');
  if (btnFooterLock) {
    btnFooterLock.addEventListener('click', () => {
      const selFeats = host.feicoes.filter((f) => host.selectedFeatureIds.has(f.id));
      if (selFeats.length === 0) return;
      const someLock = selFeats.some((f) => f.locked === true);
      const novoLock = !someLock;
      selFeats.forEach((f) => (f.locked = novoLock));
      host.dispararEvento('ui-acao-massa', {
        acao: 'bloqueio',
        feicoesIds: selFeats.map((f) => f.id),
        feicoes: selFeats,
        valor: novoLock
      });
      host.solicitarRenderizacao();
    });
  }

  // Cor coletiva
  const inputFooterColor = shadow.getElementById('input-footer-color') as HTMLInputElement | null;
  if (inputFooterColor) {
    inputFooterColor.addEventListener('change', (e) => {
      const cor = (e.target as HTMLInputElement).value;
      const selFeats = host.feicoes.filter((f) => host.selectedFeatureIds.has(f.id));
      if (selFeats.length === 0) return;
      selFeats.forEach((f) => {
        f.color = cor;
        f.style = { ...(f.style || {}), fillColor: cor, strokeColor: cor };
      });
      host.dispararEvento('ui-acao-massa', {
        acao: 'cor',
        feicoesIds: selFeats.map((f) => f.id),
        feicoes: selFeats,
        valor: cor
      });
      host.solicitarRenderizacao();
    });
  }

  // Mover para outra camada
  const selectFooterMove = shadow.getElementById('select-footer-move') as HTMLSelectElement | null;
  if (selectFooterMove) {
    selectFooterMove.addEventListener('change', (e) => {
      const targetLayerId = (e.target as HTMLSelectElement).value;
      if (!targetLayerId) return;
      const selFeats = host.feicoes.filter((f) => host.selectedFeatureIds.has(f.id));
      if (selFeats.length === 0) return;
      const origens = new Map(selFeats.map((f) => [f.id, f.layerId]));
      selFeats.forEach((f) => (f.layerId = targetLayerId));
      selFeats.forEach((f) => {
        if (origens.get(f.id) !== targetLayerId) {
          host.dispararEvento('ui-feicao-movida', {
            feicaoId: f.id,
            camadaOrigemId: origens.get(f.id),
            camadaDestinoId: targetLayerId,
            feicao: f
          });
        }
      });
      host.dispararEvento('ui-acao-massa', {
        acao: 'mover',
        feicoesIds: selFeats.map((f) => f.id),
        feicoes: selFeats,
        valor: targetLayerId
      });
      host.solicitarRenderizacao();
    });
  }

  // Nova camada
  const btnFooterNewLayer = shadow.getElementById('btn-footer-new-layer');
  if (btnFooterNewLayer) {
    btnFooterNewLayer.addEventListener('click', () => {
      host.dispararEvento('ui-camada-adicionar', {});
    });
  }

  // Excluir selecionados
  const btnFooterDel = shadow.getElementById('btn-footer-del');
  if (btnFooterDel) {
    let confirmTimeout: ReturnType<typeof setTimeout> | null = null;
    const rotuloPadrao = 'Excluir selecionados';

    btnFooterDel.addEventListener('click', () => {
      const ids = Array.from(host.selectedFeatureIds);
      if (ids.length === 0) return;

      // Confirmação em 2 passos (mesma salvaguarda da exclusão de camada)
      if (!btnFooterDel.classList.contains('confirming')) {
        btnFooterDel.classList.add('confirming');
        definirRotuloControle(btnFooterDel, `Clique novamente para excluir ${ids.length} selecionado(s)`);
        confirmTimeout = setTimeout(() => {
          btnFooterDel.classList.remove('confirming');
          definirRotuloControle(btnFooterDel, rotuloPadrao);
        }, 3500);
        return;
      }
      if (confirmTimeout) clearTimeout(confirmTimeout);
      const excluidas = host.feicoes.filter((f) => host.selectedFeatureIds.has(f.id));
      host.feicoes = host.feicoes.filter((f) => !host.selectedFeatureIds.has(f.id));
      host.selectedFeatureIds.clear();
      host.lastClickedFeatureId = null;
      host.dispararEvento('ui-acao-massa', {
        acao: 'excluir',
        feicoesIds: ids,
        feicoes: excluidas
      });
      host.notificarMudancaSelecao();
      host.solicitarRenderizacao();
    });
  }

  // Limpar seleção
  const btnFooterClear = shadow.getElementById('btn-footer-clear');
  if (btnFooterClear) {
    btnFooterClear.addEventListener('click', () => host.limparSelecao(true));
  }
}
