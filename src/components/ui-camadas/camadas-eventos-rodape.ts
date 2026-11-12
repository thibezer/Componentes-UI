/* ====================================================
   UI Camadas - Eventos do Rodapé
   Ações em massa sobre as feições selecionadas
   ==================================================== */

import { CamadasHostCompleto } from './camadas-host';
import { definirRotuloControle } from './camadas-utils';
import { idsCamadasTravadas } from './camadas-hierarquia';

export function conectarEventosRodape(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  // Mover para outra camada
  const selectFooterMove = shadow.getElementById('select-footer-move') as HTMLSelectElement | null;
  if (selectFooterMove) {
    selectFooterMove.addEventListener('change', (e) => {
      const targetLayerId = (e.target as HTMLSelectElement).value;
      if (!targetLayerId) return;
      // Camada travada não recebe feições; as que estão em camada travada não saem dela
      const travadas = idsCamadasTravadas(host.camadas);
      if (travadas.has(targetLayerId)) {
        selectFooterMove.value = '';
        return;
      }
      const selFeats = host.feicoes.filter(
        (f) => host.selectedFeatureIds.has(f.id) && !travadas.has(f.layerId) && f.locked !== true
      );
      if (selFeats.length === 0) {
        selectFooterMove.value = '';
        return;
      }
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
    const resetarConfirmacao = () => {
      if (confirmTimeout) {
        clearTimeout(confirmTimeout);
        confirmTimeout = null;
      }
      btnFooterDel.classList.remove('confirming');
      definirRotuloControle(btnFooterDel, rotuloPadrao);
    };
    btnFooterDel.addEventListener('ui-cancelar-confirmacao', resetarConfirmacao);

    btnFooterDel.addEventListener('click', () => {
      const travadas = idsCamadasTravadas(host.camadas);
      const excluiveis = host.feicoes.filter(
        (f) => host.selectedFeatureIds.has(f.id) && !travadas.has(f.layerId) && f.locked !== true
      );
      if (excluiveis.length === 0) return;
      const ids = excluiveis.map((f) => f.id);

      // Confirmação em 2 passos (mesma salvaguarda da exclusão de camada)
      if (!btnFooterDel.classList.contains('confirming')) {
        btnFooterDel.classList.add('confirming');
        definirRotuloControle(btnFooterDel, `Clique novamente para excluir ${ids.length} selecionado(s)`);
        confirmTimeout = setTimeout(resetarConfirmacao, 3500);
        return;
      }
      resetarConfirmacao();
      const idsExcluidosSet = new Set(ids);
      host.feicoes = host.feicoes.filter((f) => !idsExcluidosSet.has(f.id));
      ids.forEach((id) => host.selectedFeatureIds.delete(id));
      if (host.lastClickedFeatureId && idsExcluidosSet.has(host.lastClickedFeatureId)) {
        host.lastClickedFeatureId = null;
      }
      host.dispararEvento('ui-acao-massa', {
        acao: 'excluir',
        feicoesIds: ids,
        feicoes: excluiveis
      });
      host.notificarMudancaSelecao();
      host.solicitarRenderizacao();
    });
  }
}
