/* ====================================================
   UI Camadas - Eventos do Rodapé
   Ações em massa sobre as feições selecionadas
   ==================================================== */

import { CamadasHostCompleto } from './camadas-host';
import { definirRotuloControle } from './camadas-utils';

export function conectarEventosRodape(host: CamadasHostCompleto, shadow: ShadowRoot): void {
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

  // Novo grupo de camadas
  const btnFooterNewGroup = shadow.getElementById('btn-footer-new-group');
  if (btnFooterNewGroup) {
    btnFooterNewGroup.addEventListener('click', () => {
      host.dispararEvento('ui-camada-grupo-adicionar', { isGroup: true });
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
}
