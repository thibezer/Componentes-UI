/* ====================================================
   UI Camadas - Rodapé de Ações em Massa
   Contadores, métricas em tempo real e ações coletivas
   ==================================================== */

import { CamadaItem, FeicaoItem } from './tipos';
import { formatarMetricaFeicoes } from './camadas-metricas';
import { ICONES } from './camadas-icones';
import { escapeHtml } from './camadas-utils';

/**
 * Formata opções de camadas para o select de mover, preservando
 * a hierarquia visual com recuo e ícones de pasta
 */
export function formatarOpcoesCamadasHierarquicas(camadas: CamadaItem[]): string {
  const mapaCamadas = new Map<string, CamadaItem>();
  camadas.forEach((l) => mapaCamadas.set(l.id, l));

  const filhasPorPai = new Map<string, CamadaItem[]>();
  const raizes: CamadaItem[] = [];

  camadas.forEach((l) => {
    if (l.parentId && mapaCamadas.has(l.parentId)) {
      if (!filhasPorPai.has(l.parentId)) filhasPorPai.set(l.parentId, []);
      filhasPorPai.get(l.parentId)!.push(l);
    } else {
      raizes.push(l);
    }
  });

  const renderOpcao = (l: CamadaItem, depth: number): string => {
    const filhas = filhasPorPai.get(l.id) || (Array.isArray(l.children) ? l.children : []);
    const prefixo =
      depth > 0
        ? '&nbsp;&nbsp;'.repeat(depth) + '↳ '
        : filhas.length > 0 || l.isGroup
        ? '📁 '
        : '';
    const optionHtml = `<option value="${escapeHtml(l.id)}">${prefixo}${escapeHtml(l.name)}</option>`;
    const filhasHtml = filhas.map((f) => renderOpcao(f, depth + 1)).join('');
    return optionHtml + filhasHtml;
  };

  return raizes.map((r) => renderOpcao(r, 0)).join('');
}

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

  const opcoesCamadas = formatarOpcoesCamadasHierarquicas(camadas);

  return `
    <div class="ui-tree-footer ${temSelecao ? 'tem-selecao' : 'sem-selecao'}">
      <div class="ui-footer-left">
        <span class="ui-footer-count" id="footer-count">${totalCount}</span>
        <span class="ui-footer-label" id="footer-label">${rotulo}</span>
        <span class="ui-footer-metric" id="footer-metric" style="display: ${metricaStr ? 'inline-flex' : 'none'};">${
          metricaStr ? `${ICONES.reguaMetrica} ${metricaStr}` : ''
        }</span>
      </div>

      <!-- Ações de topo/gerais quando não há nada selecionado -->
      <div class="ui-footer-actions-gerais" style="display: ${temSelecao ? 'none' : 'flex'};">
        <button class="ui-footer-chip-btn" id="btn-footer-new-group" title="Criar Nova Pasta/Grupo de Camadas" aria-label="Criar Grupo de Camadas">
          ${ICONES.moverPasta}
          <span>+ Grupo</span>
        </button>
        <button class="ui-footer-chip-btn primario" id="btn-footer-new-layer" title="Criar Nova Camada Vetorial" aria-label="Criar Nova Camada">
          ${ICONES.mais}
          <span>+ Camada</span>
        </button>
      </div>

      <!-- Ações em massa ativadas quando há seleção -->
      <div class="ui-footer-right ui-footer-bulk-actions" style="display: ${temSelecao ? 'flex' : 'none'};">
        <button class="ui-footer-btn ${!temSelecao ? 'disabled' : ''}" id="btn-footer-vis" title="Alternar visibilidade coletiva" aria-label="Alternar visibilidade coletiva" ${!temSelecao ? 'disabled' : ''}>
          ${ICONES.olhoAberto}
        </button>

        <button class="ui-footer-btn ${!temSelecao ? 'disabled' : ''}" id="btn-footer-lock" title="Alternar bloqueio coletivo" aria-label="Alternar bloqueio coletivo" ${!temSelecao ? 'disabled' : ''}>
          ${ICONES.cadeadoTrancado}
        </button>

        <div class="ui-footer-color-wrapper ${!temSelecao ? 'disabled' : ''}" title="Alterar cor dos selecionados">
          <span class="ui-footer-color-preview" id="preview-footer-color" style="background-color: #00E08A;"></span>
          <input type="color" id="input-footer-color" aria-label="Cor dos selecionados" value="#00E08A" class="ui-footer-color" ${!temSelecao ? 'disabled' : ''} />
        </div>

        <div class="ui-footer-move-wrapper ${!temSelecao ? 'disabled' : ''}" title="Mover selecionados para outra camada">
          <select id="select-footer-move" aria-label="Mover selecionados para outra camada" class="ui-footer-select" ${!temSelecao ? 'disabled' : ''}>
            <option value="" disabled selected>📂 Mover para...</option>
            ${opcoesCamadas}
          </select>
        </div>

        <button class="ui-footer-btn btn-danger-footer ${!temSelecao ? 'disabled' : ''}" id="btn-footer-del" title="Excluir selecionados" aria-label="Excluir selecionados" ${!temSelecao ? 'disabled' : ''}>
          ${ICONES.lixeira}
        </button>

        ${
          temSelecao
            ? `<button class="ui-footer-btn btn-clear-footer" id="btn-footer-clear" title="Limpar seleção" aria-label="Limpar seleção">${ICONES.fechar}</button>`
            : ''
        }
      </div>
    </div>
  `;
}
