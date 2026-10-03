/* ====================================================
   UI Camadas - Rodapé de Ações em Massa (Estilo Illustrator)
   Contadores, métricas em tempo real e ações coletivas
   ==================================================== */

import { CamadaItem, FeicaoItem } from './tipos';
import { formatarMetricaFeicoes } from './camadas-metricas';
import { ICONES } from './camadas-icones';
import { escapeHtml } from './camadas-utils';

export function renderizarRodapeAcoes(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  selecionadasIds: Set<string>
): string {
  const feicoesSelecionadas = feicoes.filter((f) => selecionadasIds.has(f.id));
  const temSelecao = feicoesSelecionadas.length > 0;
  const metricaStr = formatarMetricaFeicoes(feicoesSelecionadas);

  const totalCount = temSelecao ? feicoesSelecionadas.length : camadas.length;
  const rotulo = temSelecao
    ? feicoesSelecionadas.length > 1
      ? 'selecionados'
      : 'selecionado'
    : camadas.length > 1
    ? 'camadas'
    : 'camada';

  const opcoesCamadas = camadas
    .map((l) => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`)
    .join('');

  return `
    <div class="ui-tree-footer">
      <div class="ui-footer-left">
        <span class="ui-footer-count" id="footer-count">${totalCount}</span>
        <span class="ui-footer-label" id="footer-label">${rotulo}</span>
        <span class="ui-footer-metric" style="display: ${metricaStr ? 'inline-flex' : 'none'};">${
          metricaStr ? `${ICONES.reguaMetrica} ${metricaStr}` : ''
        }</span>
      </div>
      <div class="ui-footer-right">
        <button class="ui-footer-btn ${!temSelecao ? 'disabled' : ''}" id="btn-footer-vis" title="Alternar visibilidade coletiva" aria-label="Alternar visibilidade coletiva" ${!temSelecao ? 'disabled' : ''}>
          ${ICONES.olhoAberto}
        </button>

        <button class="ui-footer-btn ${!temSelecao ? 'disabled' : ''}" id="btn-footer-lock" title="Alternar bloqueio coletivo" aria-label="Alternar bloqueio coletivo" ${!temSelecao ? 'disabled' : ''}>
          ${ICONES.cadeadoTrancado}
        </button>

        <div class="ui-footer-color-wrapper ${!temSelecao ? 'disabled' : ''}" title="Alterar cor dos selecionados">
          <input type="color" id="input-footer-color" aria-label="Cor dos selecionados" value="#00E08A" class="ui-footer-color" ${!temSelecao ? 'disabled' : ''} />
        </div>

        <div class="ui-footer-move-wrapper ${!temSelecao ? 'disabled' : ''}" title="Mover selecionados para outra camada">
          <select id="select-footer-move" aria-label="Mover selecionados para outra camada" class="ui-footer-select" ${!temSelecao ? 'disabled' : ''}>
            <option value="" disabled selected>📂</option>
            ${opcoesCamadas}
          </select>
        </div>

        <button class="ui-footer-btn" id="btn-footer-new-layer" title="Criar Nova Camada" aria-label="Criar Nova Camada">
          ${ICONES.mais}
        </button>

        <button class="ui-footer-btn ${!temSelecao ? 'disabled' : ''}" id="btn-footer-del" title="Excluir selecionados" aria-label="Excluir selecionados" ${!temSelecao ? 'disabled' : ''}>
          ${ICONES.lixeira}
        </button>

        ${
          temSelecao
            ? `<button class="ui-footer-btn" id="btn-footer-clear" title="Limpar seleção" aria-label="Limpar seleção">${ICONES.fechar}</button>`
            : ''
        }
      </div>
    </div>
  `;
}
