/* ====================================================
   UI Camadas - Rodapé de Ações em Massa
   Contadores, métricas em tempo real e ações coletivas
   ==================================================== */

import { CamadaItem, FeicaoItem } from './tipos';
import { ICONES } from './camadas-icones';
import { escapeHtml } from './camadas-utils';
import { construirHierarquiaCamadas, idsCamadasTravadas, type CamadaNodoHierarquico } from './camadas-hierarquia';

/**
 * Formata opções de camadas para o select de mover, preservando
 * a hierarquia visual com recuo e ícones de pasta
 */
export function formatarOpcoesCamadasHierarquicas(camadas: CamadaItem[]): string {
  const hierarquia = construirHierarquiaCamadas(camadas);
  // Camada travada (ou sob grupo travado) não recebe feições: aparece desabilitada
  const travadas = idsCamadasTravadas(camadas);

  const renderOpcao = (nodo: CamadaNodoHierarquico): string => {
    const l = nodo.camada;
    const depth = nodo.depth;
    const filhas = nodo.subcamadas;
    const prefixo =
      depth > 0
        ? '&nbsp;&nbsp;'.repeat(depth) + '↳ '
        : filhas.length > 0 || l.isGroup
        ? '📁 '
        : '';
    const travada = travadas.has(l.id);
    const optionHtml = `<option value="${escapeHtml(l.id)}"${travada ? ' disabled' : ''}>${prefixo}${escapeHtml(l.name)}${
      travada ? ' 🔒' : ''
    }</option>`;
    const filhasHtml = filhas.map((f) => renderOpcao(f)).join('');
    return optionHtml + filhasHtml;
  };

  return hierarquia.map((r) => renderOpcao(r)).join('');
}

/** Ícone + texto acessível do contador do rodapé (camadas ou feições selecionadas). */
export function rotuloRodape(
  totalCamadas: number,
  totalSelecionadas: number
): { icone: string; texto: string } {
  if (totalSelecionadas > 0) {
    return {
      icone: ICONES.alvoEnquadrar,
      texto: `${totalSelecionadas} ${totalSelecionadas > 1 ? 'selecionados' : 'selecionado'}`
    };
  }
  return {
    icone: ICONES.camadas,
    texto: `${totalCamadas} ${totalCamadas > 1 ? 'camadas' : 'camada'}`
  };
}

export function renderizarRodapeAcoes(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  selecionadasIds: Set<string>
): string {
  const feicoesSelecionadas = feicoes.filter((f) => selecionadasIds.has(f.id));
  const temSelecao = feicoesSelecionadas.length > 0;

  const totalCount = temSelecao ? feicoesSelecionadas.length : camadas.length;
  const rotulo = rotuloRodape(camadas.length, feicoesSelecionadas.length);

  const opcoesCamadas = formatarOpcoesCamadasHierarquicas(camadas);

  return `
    <div class="ui-tree-footer ${temSelecao ? 'tem-selecao' : 'sem-selecao'}" part="rodape">
      <div class="ui-footer-left">
        <span class="ui-footer-count" id="footer-count">${totalCount}</span>
        <span class="ui-footer-label" id="footer-label" role="img" title="${rotulo.texto}" aria-label="${rotulo.texto}">${rotulo.icone}</span>
      </div>

      <!-- Criação de camadas/grupos quando não há nada selecionado -->
      <div class="ui-footer-actions-gerais" style="display: ${temSelecao ? 'none' : 'flex'};">
        <button class="ui-footer-chip-btn" id="btn-footer-new-group" title="Criar Nova Pasta/Grupo de Camadas" aria-label="Criar Grupo de Camadas">
          ${ICONES.moverPasta}
          <span>Grupo</span>
        </button>
        <button class="ui-footer-chip-btn primario" id="btn-footer-new-layer" title="Criar Nova Camada Vetorial" aria-label="Criar Nova Camada">
          ${ICONES.mais}
          <span>Camada</span>
        </button>
      </div>

      <!-- Ações em massa ativadas quando há seleção -->
      <div class="ui-footer-right ui-footer-bulk-actions" style="display: ${temSelecao ? 'flex' : 'none'};">
        <div class="ui-footer-move-wrapper ${!temSelecao ? 'disabled' : ''}" title="Mover selecionados para outra camada">
          <select id="select-footer-move" aria-label="Mover selecionados para outra camada" class="ui-footer-select" ${!temSelecao ? 'disabled' : ''}>
            <option value="" disabled selected>Mover para...</option>
            ${opcoesCamadas}
          </select>
        </div>

        <button class="ui-footer-btn btn-danger-footer ${!temSelecao ? 'disabled' : ''}" id="btn-footer-del" title="Excluir selecionados" aria-label="Excluir selecionados" ${!temSelecao ? 'disabled' : ''}>
          ${ICONES.lixeira}
        </button>
      </div>
    </div>
  `;
}
