/* ====================================================
   UI Camadas - Renderizador da Árvore de Camadas
   Hierarquia Profissional de Camadas e Feições Vetoriais
   ==================================================== */

import { CamadaItem, FeicaoItem } from './tipos';
import { ICONES } from './camadas-icones';
import { escapeHtml, sanitizarCorCss, corParaHex } from './camadas-utils';
import { renderizarThumbGeometria } from './camadas-thumb';
import {
  construirHierarquiaCamadas,
  obterFeicoesDoEscopoCamada,
  type CamadaNodoHierarquico
} from './camadas-hierarquia';
import { filtrarCamadasPorBusca, LIMITE_FEICOES_POR_CAMADA } from './camadas-selecao';
import { ehDescendente } from './camadas-drop-ops';

export interface ParametrosRenderArvore {
  camadas: CamadaItem[];
  feicoes: FeicaoItem[];
  camadaAtivaId: string | null;
  expandedLayers: Set<string>;
  selectedFeatureIds: Set<string>;
  activeSettingsLayerId: string | null;
  editingLayerId: string | null;
  editingFeatureId: string | null;
  searchQuery: string;
  titulo?: string;
  mostrarBusca?: boolean;
  limitesPorCamada?: ReadonlyMap<string, number>;
  limiteFeicoesPorCamada?: number;
  mostrarBotaoColapsar?: boolean;
}

export { escapeHtml, renderizarThumbGeometria, construirHierarquiaCamadas };
export type { CamadaNodoHierarquico };

export function renderizarArvoreCamadas(params: ParametrosRenderArvore): string {
  const {
    camadas,
    feicoes,
    camadaAtivaId,
    expandedLayers,
    selectedFeatureIds,
    activeSettingsLayerId,
    editingLayerId,
    editingFeatureId,
    searchQuery,
    titulo = 'CAMADAS',
    mostrarBusca = true,
    limitesPorCamada,
    limiteFeicoesPorCamada = LIMITE_FEICOES_POR_CAMADA,
    mostrarBotaoColapsar = false
  } = params;

  const q = (searchQuery || '').trim().toLowerCase();
  // Com busca, só entram na árvore as camadas que casam (ou levam a um resultado)
  const busca = filtrarCamadasPorBusca(camadas, feicoes, q);

  // Indexação rápida de feições por camada
  const featsByLayer = new Map<string, FeicaoItem[]>();
  for (let i = 0; i < feicoes.length; i++) {
    const f = feicoes[i];
    if (!f || !f.id) continue;
    const lid = f.layerId || '';
    if (!featsByLayer.has(lid)) featsByLayer.set(lid, []);
    featsByLayer.get(lid)!.push(f);
  }

  const allVisible = camadas.every((l) => l.visible !== false);
  const allExpanded = camadas.length > 0 && camadas.every((l) => expandedLayers.has(l.id));

  const buscaHtml = mostrarBusca
    ? `
    <div class="ui-tree-search-wrapper" part="busca">
      <span class="ui-tree-search-icon">${ICONES.busca}</span>
      <input type="text" class="ui-tree-search-input" id="input-layer-search" aria-label="Buscar camada ou feição" placeholder="Buscar camada ou feição..." value="${escapeHtml(
        searchQuery
      )}" />
      ${
        searchQuery
          ? `<button class="ui-tree-search-clear" id="btn-clear-layer-search" title="Limpar busca" aria-label="Limpar busca">${ICONES.fechar}</button>`
          : ''
      }
    </div>
  `
    : '';

  const toolbarHtml = `
    <div class="ui-tree-toolbar" part="toolbar">
      <div class="ui-tree-title-group">
        <span class="ui-tree-section-title">${escapeHtml(titulo || 'CAMADAS')}</span>
        <span class="ui-tree-count-badge">${camadas.length}</span>
      </div>
      <div class="ui-tree-actions">
        <button id="btn-toggle-all-vis" class="ui-tree-action-btn" title="${
          allVisible ? 'Ocultar Todas as Camadas' : 'Exibir Todas as Camadas'
        }" aria-label="${allVisible ? 'Ocultar Todas as Camadas' : 'Exibir Todas as Camadas'}">
          ${allVisible ? ICONES.olhoAberto : ICONES.olhoFechado}
        </button>
        <button id="btn-toggle-all-expand" class="ui-tree-action-btn" aria-label="${
          allExpanded ? 'Recolher Todos os Grupos' : 'Expandir Todos os Grupos'
        }" title="${
          allExpanded ? 'Recolher Todos os Grupos' : 'Expandir Todos os Grupos'
        }">
          <span class="ui-chevron-icon ${allExpanded ? 'open' : ''}">${ICONES.chevronDir}</span>
        </button>
        ${
          mostrarBotaoColapsar
            ? `<button id="btn-colapsar" class="ui-camadas-btn-colapsar" title="Recolher painel" aria-label="Recolher painel">${ICONES.recolherPainel}</button>`
            : ''
        }
      </div>
    </div>
    ${buscaHtml}
  `;

  // Função recursiva para renderizar um nó e todas as suas subcamadas
  const renderizarNodo = (nodo: CamadaNodoHierarquico): string => {
    const layer = nodo.camada;
    if (busca && !busca.camadasVisiveis.has(layer.id)) return '';
    const depth = nodo.depth;
    const subcamadas = nodo.subcamadas;
    const subcamadasExibidas = busca
      ? subcamadas.filter((s) => busca.camadasVisiveis.has(s.camada.id))
      : subcamadas;
    const isGroup = Boolean(layer.isGroup || subcamadas.length > 0);

    const safeId = escapeHtml(layer.id);
    const safeName = escapeHtml(layer.name || (isGroup ? 'Novo Grupo' : 'Camada'));
    const safeColor = sanitizarCorCss(layer.color, '#00E08A');
    const isVisible = layer.visible !== false;
    const isLocked = layer.locked === true;
    const isExpanded = q ? true : expandedLayers.has(layer.id);
    const isSettingsOpen = activeSettingsLayerId === layer.id;
    const isActiveLayer = camadaAtivaId === layer.id;

    const layerFeats = busca ? busca.feicoesPorCamada.get(layer.id) || [] : featsByLayer.get(layer.id) || [];
    const escopoFeats = busca ? layerFeats : obterFeicoesDoEscopoCamada(camadas, feicoes, layer.id);

    const allFeatsSelected =
      escopoFeats.length > 0 && escopoFeats.every((f) => selectedFeatureIds.has(f.id));
    const someFeatsSelected =
      !allFeatsSelected && escopoFeats.some((f) => selectedFeatureIds.has(f.id));

    const maxFeats = limitesPorCamada?.get(layer.id) ?? limiteFeicoesPorCamada;
    const visibleFeats = layerFeats.slice(0, maxFeats);
    const hasTruncated = layerFeats.length > maxFeats;
    const restantes = layerFeats.length - maxFeats;

    const feicoesHtml = visibleFeats
      .map((feat) => {
        const featId = escapeHtml(feat.id);
        const featName = escapeHtml(feat.name || 'Feição');
        const featColor = sanitizarCorCss(feat.color, safeColor);
        const isFeatVisible = feat.visible !== false;
        const featTravadaPelaCamada = isLocked;
        const isFeatLocked = feat.locked === true || featTravadaPelaCamada;
        const tituloLockFeicao = featTravadaPelaCamada
          ? 'Bloqueada pela camada'
          : isFeatLocked
            ? 'Desbloquear Feição'
            : 'Bloquear Feição';
        const isFeatSelected = selectedFeatureIds.has(feat.id);

        // Estilo Adobe: o estado padrão (oficial) não ganha selo; só a exceção (prévia) é sinalizada
        const statusTag =
          feat.status === 'previa'
            ? `<span class="ui-previa-dot" title="Geometria prévia" aria-label="Geometria prévia"></span>`
            : '';

        return `
          <div class="ui-feat-row ${isFeatSelected ? 'selected-row' : ''} ${
          !isFeatVisible ? 'hidden-row' : ''
        }" data-feat-row="${featId}" data-feat-select="${featId}" data-feat-layer="${safeId}" role="treeitem" aria-selected="${isFeatSelected}" tabindex="-1" draggable="true" part="${
          isFeatSelected ? 'feicao feicao-selecionada' : 'feicao'
        }" style="--layer-depth: ${depth + 1};" title="Clique para selecionar | Arraste para reordenar">
            <div class="ui-col ui-col-eye" data-feat-eye="${featId}" role="button" tabindex="0" aria-label="${
          isFeatVisible ? 'Ocultar Feição' : 'Exibir Feição'
        }" title="${
          isFeatVisible ? 'Ocultar Feição' : 'Exibir Feição'
        }">
              ${isFeatVisible ? ICONES.olhoAberto : ICONES.olhoFechado}
            </div>

            <div class="ui-col ui-col-lock ${!isFeatLocked ? 'ui-lock-open' : ''}" data-feat-lock="${featId}" ${
          featTravadaPelaCamada ? 'data-locked-by-layer="true"' : ''
        } role="button" tabindex="0" aria-label="${tituloLockFeicao}" title="${tituloLockFeicao}">
              ${isFeatLocked ? ICONES.cadeadoTrancado : ICONES.cadeadoAberto}
            </div>

            <div class="ui-col ui-col-colorbar" style="background: ${featColor};"></div>
            <div class="ui-col ui-col-branch"><span style="opacity: 0.35;">└─</span></div>
            <div class="ui-col ui-col-thumb">
              <div class="ui-thumb-box">${renderizarThumbGeometria(feat.type || feat.geometryType, featColor, feat.coordinates)}</div>
            </div>

            <div class="ui-col ui-col-name" data-feat-name-trigger="${featId}" title="Duplo clique para renomear">
              ${
                editingFeatureId === feat.id
                  ? `<input type="text" class="ui-inline-rename-input" data-inline-feat-input="${featId}" value="${featName}" />`
                  : `<span class="ui-name-text">${featName}</span>${statusTag}`
              }
            </div>

            <div class="ui-col ui-col-actions">
              <button class="ui-micro-btn" data-feat-fit="${featId}" title="Enquadrar no mapa" aria-label="Enquadrar feição no mapa">${ICONES.alvoEnquadrar}</button>
            </div>

            <div class="ui-col ui-col-target" data-feat-target="${featId}" role="button" tabindex="0" aria-label="Selecionar feição" title="Selecionar feição">
              <div class="ui-target-circle ${isFeatSelected ? 'selected' : ''}"></div>
            </div>
          </div>
        `;
      })
      .join('');

    const truncateNotice = hasTruncated
      ? `<div class="ui-truncate-notice" style="display: flex; align-items: center; justify-content: space-between; padding: 4px 10px; font-size: 10px; color: var(--ui-cor-texto-secundario, #888899); font-style: italic; background: var(--ui-cor-fundo-recuado, rgba(0,0,0,0.15));">
          <span>Exibindo ${maxFeats} de ${layerFeats.length} feições. Use a busca acima para filtrar.</span>
          <button type="button" class="ui-truncate-more-btn" data-layer-show-more="${safeId}" style="background: transparent; border: 1px solid var(--ui-cor-borda, rgba(255,255,255,0.15)); color: var(--ui-cor-primaria, #00E08A); border-radius: 3px; font-size: 9.5px; font-style: normal; padding: 1px 6px; cursor: pointer; white-space: nowrap;">Mostrar mais (+${Math.min(80, restantes)})</button>
        </div>`
      : '';

    const currentOpacity = layer.opacity !== undefined ? layer.opacity : 1;
    const currentOpacityPct = Math.round(currentOpacity * 100);

    // Opções de outras camadas para selecionar grupo pai no drawer (exclui a si mesma e seus descendentes)
    const opcoesOutrosPais = camadas
      .filter((l) => l.id !== layer.id && !ehDescendente(camadas, l.id, layer.id))
      .map(
        (l) =>
          `<option value="${escapeHtml(l.id)}" ${layer.parentId === l.id ? 'selected' : ''}>${
            l.isGroup ? '📁 ' : ''
          }${escapeHtml(l.name)}</option>`
      )
      .join('');

    const settingsDrawerHtml = isSettingsOpen
      ? `
      <div class="ui-layer-settings-drawer" id="settings-drawer-${safeId}" part="drawer" style="--drawer-cor-camada: ${safeColor};">
        <div class="ui-drawer-header">
          <div class="ui-drawer-header-left">
            <span class="ui-drawer-icon">${ICONES.engrenagem}</span>
            <span class="ui-drawer-title">Configurações da Camada</span>
            <span class="ui-drawer-layer-chip" title="${safeName}">${safeName}</span>
          </div>
          <button type="button" class="ui-drawer-btn-fechar" data-layer-settings-close="${safeId}" title="Fechar configurações (Esc)" aria-label="Fechar configurações">
            ${ICONES.fechar}
          </button>
        </div>

        <div class="ui-drawer-body">
          <!-- Cor da Camada -->
          <div class="ui-drawer-row">
            <div class="ui-drawer-row-label">
              <span>Cor do Vetor</span>
            </div>
            <div class="ui-drawer-color-group">
              <label class="ui-drawer-color-pill" title="Clique para alterar a cor da camada">
                <span class="ui-drawer-color-sample" id="sample-color-${safeId}" style="background-color: ${safeColor};"></span>
                <span class="ui-drawer-color-hex" id="hex-color-${safeId}">${safeColor.toUpperCase()}</span>
                <input type="color" aria-label="Cor da camada" data-layer-color-picker="${safeId}" value="${corParaHex(safeColor, '#00e08a')}" class="ui-drawer-color-native" />
              </label>
            </div>
          </div>

          <!-- Opacidade da Camada -->
          <div class="ui-drawer-row">
            <div class="ui-drawer-row-label">
              <span>Opacidade</span>
              <span class="ui-drawer-badge" id="badge-op-${safeId}">${currentOpacityPct}%</span>
            </div>
            <div class="ui-drawer-slider-container">
              <input type="range" aria-label="Opacidade da camada" min="0.05" max="1" step="0.05" value="${Number(currentOpacity) || 0}" data-layer-opacity-slider="${safeId}" class="ui-drawer-slider" />
            </div>
          </div>

          <!-- Hierarquia / Grupo Pai -->
          <div class="ui-drawer-row">
            <div class="ui-drawer-row-label">
              <span>Pertence ao Grupo</span>
            </div>
            <div class="ui-drawer-select-wrapper">
              <select class="ui-drawer-select" data-layer-parent-select="${safeId}" aria-label="Grupo pai da camada">
                <option value="" ${!layer.parentId ? 'selected' : ''}>(Nenhum - Nível Principal)</option>
                ${opcoesOutrosPais}
              </select>
            </div>
          </div>
        </div>

        <div class="ui-drawer-footer">
          <div class="ui-drawer-meta-info">
            <span>${subcamadas.length > 0 ? `${subcamadas.length} subcamadas · ` : ''}${layerFeats.length} ${layerFeats.length === 1 ? 'feição' : 'feições'}</span>
          </div>
          <div class="ui-drawer-actions">
            <button type="button" class="ui-drawer-btn-sublayer" data-add-sublayer="${safeId}" title="Adicionar nova camada dentro desta">
              ${ICONES.mais} Subcamada
            </button>
            <button type="button" class="ui-drawer-btn-danger" data-delete-layer="${safeId}" title="Excluir esta camada e suas feições">
              ${ICONES.lixeira}
              <span class="ui-btn-label">Excluir</span>
            </button>
          </div>
        </div>
      </div>
    `
      : '';

    // Renderiza subcamadas recursivamente
    const subcamadasHtml = subcamadasExibidas.map((sub) => renderizarNodo(sub)).join('');

    return `
      <div class="ui-layer-group ${depth > 0 ? 'is-sublayer-group' : ''}" data-layer-id="${safeId}" data-layer-depth="${depth}" role="treeitem" aria-expanded="${isExpanded}" part="grupo" style="--layer-active-color: ${safeColor};">
        <div class="ui-layer-row ${!isVisible ? 'hidden-layer' : ''} ${
      isActiveLayer ? 'active-drawing-layer' : ''
    } ${depth > 0 ? 'is-sublayer' : ''} ${isGroup ? 'is-group-row' : ''}" data-layer-row="${safeId}" data-layer-id="${safeId}" tabindex="-1" draggable="true" part="${
      isActiveLayer ? 'camada camada-ativa' : 'camada'
    }" ${isActiveLayer ? 'aria-current="true"' : ''} style="--layer-depth: ${depth};">
          <div class="ui-col ui-col-drag" title="Arrastar para reordenar Z-Index">${ICONES.dragHandle}</div>

          <div class="ui-col ui-col-eye" data-layer-eye="${safeId}" role="button" tabindex="0" aria-label="${
      isVisible ? 'Ocultar Camada' : 'Exibir Camada'
    }" title="${
      isVisible ? 'Ocultar Camada' : 'Exibir Camada'
    }">
            ${isVisible ? ICONES.olhoAberto : ICONES.olhoFechado}
          </div>

          <div class="ui-col ui-col-lock ${!isLocked ? 'ui-lock-open' : ''}" data-layer-lock="${safeId}" role="button" tabindex="0" aria-label="${
      isLocked ? 'Desbloquear Camada' : 'Bloquear Camada'
    }" title="${
      isLocked ? 'Desbloquear Camada' : 'Bloquear Camada'
    }">
            ${isLocked ? ICONES.cadeadoTrancado : ICONES.cadeadoAberto}
          </div>

          <div class="ui-col ui-col-colorbar ui-col-colorbar-editavel" data-layer-color="${safeId}" role="button" tabindex="0" style="background: ${safeColor};" aria-label="Alterar cor da camada" title="Alterar cor da camada (usada no destaque de seleção)"></div>

          <div class="ui-col ui-col-chevron" data-layer-expand="${safeId}" role="button" tabindex="0" aria-label="${isExpanded ? 'Recolher grupo' : 'Expandir grupo'}">
            <span class="ui-chevron-icon ${isExpanded ? 'open' : ''}">${ICONES.chevronDir}</span>
          </div>

          <div class="ui-col ui-col-name" data-layer-name-trigger="${safeId}" title="Clique para ativar camada de desenho | Duplo clique para renomear">
            ${
              editingLayerId === layer.id
                ? `<input type="text" class="ui-inline-rename-input" data-inline-layer-input="${safeId}" value="${safeName}" />`
                : `${isGroup ? `<span class="ui-group-folder-icon" title="Grupo/Pasta">${ICONES.moverPasta}</span>` : ''}
                   <span class="ui-name-text">${safeName}</span>
                   ${layerFeats.length > 0 || !isGroup ? `<span class="ui-count-chip" title="${layerFeats.length} ${layerFeats.length === 1 ? 'feição' : 'feições'}${subcamadas.length > 0 ? ` · ${subcamadas.length} subcamadas` : ''}">${layerFeats.length}</span>` : ''}`
            }
          </div>

          <div class="ui-col ui-col-actions">
            <button class="ui-micro-btn" data-layer-fit="${safeId}" title="Enquadrar camada no mapa" aria-label="Enquadrar camada no mapa">${ICONES.alvoEnquadrar}</button>
            <button class="ui-micro-btn ${isSettingsOpen ? 'active' : ''}" data-layer-settings="${safeId}" title="Ajustar cor, hierarquia, opacidade e excluir" aria-label="Configurações da camada" aria-expanded="${isSettingsOpen}">${ICONES.engrenagem}</button>
          </div>

          <div class="ui-col ui-col-target" data-layer-target="${safeId}" role="button" tabindex="0" aria-label="Selecionar todas as feições deste grupo" title="Selecionar todas as feições deste grupo">
            <div class="ui-target-circle ${
              allFeatsSelected ? 'selected' : someFeatsSelected ? 'partial' : ''
            }"></div>
          </div>
        </div>

        ${settingsDrawerHtml}

        <div class="ui-children-container ${depth > 0 ? 'is-subchildren' : ''}" role="group" style="display: ${isExpanded ? 'block' : 'none'};">
          ${subcamadasHtml}
          ${feicoesHtml}
          ${truncateNotice}
          ${
            subcamadasExibidas.length === 0 && layerFeats.length === 0
              ? `<div class="ui-empty-row"><span>${isGroup ? 'Grupo vazio (adicione subcamadas ou feições)' : 'Nenhum elemento neste grupo'}</span></div>`
              : ''
          }
        </div>
      </div>
    `;
  };

  const hierarquia = construirHierarquiaCamadas(camadas);
  const camadasHtml =
    busca && busca.camadasVisiveis.size === 0
      ? `<div class="ui-search-empty" role="status">Nenhum resultado para “${escapeHtml((searchQuery || '').trim())}”</div>`
      : hierarquia.map((nodo) => renderizarNodo(nodo)).join('');

  return `
    ${toolbarHtml}
    <div class="ui-panel-box">
      <div class="ui-layer-tree" id="ui-layer-tree-mount" role="tree" aria-label="Camadas e feições" aria-multiselectable="true" part="arvore">
        ${camadasHtml}
      </div>
    </div>
  `;
}
