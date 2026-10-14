/* ====================================================
   UI Camadas - Renderizador da Árvore de Camadas
   Hierarquia Profissional de Camadas e Feições Vetoriais
   ==================================================== */

import { CamadaItem, FeicaoItem } from './tipos';
import { ICONES } from './camadas-icones';
import { escapeHtml, sanitizarCorCss, corParaHex } from './camadas-utils';
import { filtrarFeicoesPorBusca, LIMITE_FEICOES_POR_CAMADA } from './camadas-selecao';

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
  limiteFeicoesPorCamada?: number;
  mostrarBotaoColapsar?: boolean;
}

export { escapeHtml };

type ParLatLon = [number, number];

const THUMB_MAX_PONTOS = 64;

function ehPar(v: unknown): v is ParLatLon {
  return Array.isArray(v) && v.length >= 2 && Number.isFinite(v[0]) && Number.isFinite(v[1]);
}

/** Achata coordenadas (anel, polígono, multi*) em uma lista de partes, cada uma uma lista de pares. */
function extrairPartes(coords: unknown): ParLatLon[][] {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  if (ehPar(coords[0])) return [(coords as unknown[]).filter(ehPar)];
  return coords.flatMap(extrairPartes);
}

function decimar(pts: ParLatLon[]): ParLatLon[] {
  if (pts.length <= THUMB_MAX_PONTOS) return pts;
  const passo = pts.length / THUMB_MAX_PONTOS;
  const saida: ParLatLon[] = [];
  for (let i = 0; i < THUMB_MAX_PONTOS; i++) saida.push(pts[Math.floor(i * passo)]);
  saida.push(pts[pts.length - 1]);
  return saida;
}

/**
 * Miniatura fiel à geometria real (coordenadas [lat, lon]), enquadrada e com proporção preservada.
 * Retorna string vazia quando não há coordenadas utilizáveis (usa-se então o ícone genérico).
 */
function renderizarThumbReal(tipo: string, coords: unknown, cor: string): string {
  const partes = extrairPartes(coords).filter((p) => p.length > 0);
  if (partes.length === 0) return '';

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const parte of partes) {
    for (const [lat, lon] of parte) {
      if (lon < minX) minX = lon;
      if (lon > maxX) maxX = lon;
      if (-lat < minY) minY = -lat;
      if (-lat > maxY) maxY = -lat;
    }
  }

  const tam = 16;
  const margem = 2;
  const util = tam - margem * 2;
  const larg = maxX - minX;
  const alt = maxY - minY;
  const maior = Math.max(larg, alt);
  const escala = maior > 0 ? util / maior : 0;
  const offX = margem + (util - larg * escala) / 2;
  const offY = margem + (util - alt * escala) / 2;
  const f = (n: number) => Math.round(n * 100) / 100;
  const proj = ([lat, lon]: ParLatLon) => `${f(offX + (lon - minX) * escala)},${f(offY + (-lat - minY) * escala)}`;

  const ehPoligono = tipo === 'polygon' || tipo === 'multipolygon';
  const ehLinha = tipo === 'linestring' || tipo === 'multilinestring';
  const svg = (corpo: string) =>
    `<svg viewBox="0 0 ${tam} ${tam}" width="100%" height="100%" aria-hidden="true">${corpo}</svg>`;

  if (ehPoligono) {
    // Um único path com evenodd: furos (anéis internos) ficam vazados
    const d = partes
      .filter((p) => p.length >= 3)
      .map((p) => `M${decimar(p).map(proj).join('L')}Z`)
      .join('');
    if (!d) return '';
    return svg(
      `<path d="${d}" fill="${cor}" fill-opacity="0.45" fill-rule="evenodd" stroke="${cor}" stroke-width="1.2" stroke-linejoin="round"/>`
    );
  }
  if (ehLinha) {
    const d = partes
      .filter((p) => p.length >= 2)
      .map((p) => `M${decimar(p).map(proj).join('L')}`)
      .join('');
    if (!d) return '';
    return svg(
      `<path d="${d}" fill="none" stroke="${cor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }
  return '';
}

export function renderizarThumbGeometria(
  tipo: string | undefined,
  cor: string,
  coords?: unknown
): string {
  const safeColor = sanitizarCorCss(cor, '#00E08A');
  const t = (tipo || '').toLowerCase();

  const real = coords !== undefined ? renderizarThumbReal(t, coords, safeColor) : '';
  if (real) return real;

  if (t === 'polygon' || t === 'multipolygon') {
    return `<svg viewBox="0 0 16 16" width="11" height="11"><polygon points="2,14 14,14 12,2 4,4" fill="${safeColor}" fill-opacity="0.45" stroke="${safeColor}" stroke-width="1.5"/></svg>`;
  }
  if (t === 'linestring' || t === 'multilinestring') {
    return `<svg viewBox="0 0 16 16" width="11" height="11"><polyline points="2,13 8,3 14,10" fill="none" stroke="${safeColor}" stroke-width="2"/></svg>`;
  }
  if (t === 'text') {
    return `<svg viewBox="0 0 16 16" width="11" height="11"><text x="8" y="12" font-size="12" font-weight="bold" fill="${safeColor}" text-anchor="middle" font-family="sans-serif">T</text></svg>`;
  }
  return `<svg viewBox="0 0 16 16" width="11" height="11"><circle cx="8" cy="8" r="4.2" fill="${safeColor}" stroke="#ffffff" stroke-width="1.2"/></svg>`;
}

export interface CamadaNodoHierarquico {
  camada: CamadaItem;
  depth: number;
  subcamadas: CamadaNodoHierarquico[];
}

/**
 * Organiza a lista de camadas em uma árvore hierárquica de nós baseada em parentId ou children
 */
export function construirHierarquiaCamadas(camadas: CamadaItem[]): CamadaNodoHierarquico[] {
  const mapaCamadas = new Map<string, CamadaItem>();
  camadas.forEach((l) => mapaCamadas.set(l.id, l));

  const filhasPorPai = new Map<string, CamadaItem[]>();
  const raizes: CamadaItem[] = [];

  camadas.forEach((l) => {
    if (l.parentId && mapaCamadas.has(l.parentId) && l.parentId !== l.id) {
      if (!filhasPorPai.has(l.parentId)) filhasPorPai.set(l.parentId, []);
      filhasPorPai.get(l.parentId)!.push(l);
    } else {
      raizes.push(l);
    }
  });

  function montarNodo(camada: CamadaItem, depth: number): CamadaNodoHierarquico {
    const filhas = filhasPorPai.get(camada.id) || (Array.isArray(camada.children) ? camada.children : []);
    return {
      camada,
      depth,
      subcamadas: filhas.map((f) => montarNodo(f, depth + 1))
    };
  }

  return raizes.map((r) => montarNodo(r, 0));
}

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
    limiteFeicoesPorCamada = LIMITE_FEICOES_POR_CAMADA,
    mostrarBotaoColapsar = false
  } = params;

  const q = (searchQuery || '').trim().toLowerCase();

  // Indexação rápida de feições por camada
  const featsByLayer = new Map<string, FeicaoItem[]>();
  for (let i = 0; i < feicoes.length; i++) {
    const f = feicoes[i];
    const lid = f.layerId || '';
    if (!featsByLayer.has(lid)) featsByLayer.set(lid, []);
    featsByLayer.get(lid)!.push(f);
  }

  const allVisible = camadas.every((l) => l.visible !== false);
  const allExpanded = camadas.length > 0 && camadas.every((l) => expandedLayers.has(l.id));

  const toolbarHtml = `
    <div class="ui-tree-toolbar">
      <div class="ui-tree-title-group">
        <span class="ui-tree-section-title">CAMADAS</span>
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
        <button id="btn-add-group" class="ui-tree-btn-group" title="Criar grupo / pasta de camadas" aria-label="Criar grupo de camadas">
          ${ICONES.moverPasta} Grupo
        </button>
        <button id="btn-add-layer" class="ui-tree-btn-new" title="Adicionar nova camada vetorial">
          ${ICONES.mais} Camada
        </button>
        ${
          mostrarBotaoColapsar
            ? `<button id="btn-colapsar" class="ui-camadas-btn-colapsar" title="Recolher painel" aria-label="Recolher painel">${ICONES.recolherPainel}</button>`
            : ''
        }
      </div>
    </div>

    <div class="ui-tree-search-wrapper">
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
  `;

  // Função recursiva para renderizar um nó e todas as suas subcamadas
  const renderizarNodo = (nodo: CamadaNodoHierarquico): string => {
    const layer = nodo.camada;
    const depth = nodo.depth;
    const subcamadas = nodo.subcamadas;
    const isGroup = Boolean(layer.isGroup || subcamadas.length > 0);

    const safeId = escapeHtml(layer.id);
    const safeName = escapeHtml(layer.name || (isGroup ? 'Novo Grupo' : 'Camada'));
    const safeColor = sanitizarCorCss(layer.color, '#00E08A');
    const isVisible = layer.visible !== false;
    const isLocked = layer.locked === true;
    const isExpanded = q ? true : expandedLayers.has(layer.id);
    const isSettingsOpen = activeSettingsLayerId === layer.id;
    const isActiveLayer = camadaAtivaId === layer.id;

    const layerFeats = filtrarFeicoesPorBusca(featsByLayer.get(layer.id) || [], q);

    const allFeatsSelected =
      layerFeats.length > 0 && layerFeats.every((f) => selectedFeatureIds.has(f.id));
    const someFeatsSelected =
      !allFeatsSelected && layerFeats.some((f) => selectedFeatureIds.has(f.id));

    const visibleFeats = layerFeats.slice(0, limiteFeicoesPorCamada);
    const hasTruncated = layerFeats.length > limiteFeicoesPorCamada;

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

        const status = feat.status;
        let statusTag = '';
        if (status === 'oficial') {
          statusTag = `<span class="ui-geom-tag oficial" title="Geometria Oficial">OFICIAL</span>`;
        } else if (status === 'previa') {
          statusTag = `<span class="ui-geom-tag previa" title="Geometria Prévia">PRÉVIA</span>`;
        }

        return `
          <div class="ui-feat-row ${isFeatSelected ? 'selected-row' : ''} ${
          !isFeatVisible ? 'hidden-row' : ''
        }" data-feat-row="${featId}" data-feat-select="${featId}" data-feat-layer="${safeId}" role="treeitem" aria-selected="${isFeatSelected}" tabindex="-1" draggable="true" title="Clique para selecionar | Arraste para reordenar">
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
      ? `<div style="padding: 4px 10px; font-size: 10px; color: var(--ui-cor-texto-secundario, #888899); font-style: italic; background: rgba(0,0,0,0.2);">Exibindo ${limiteFeicoesPorCamada} de ${layerFeats.length} feições. Use a busca acima para filtrar.</div>`
      : '';

    const currentOpacity = layer.opacity !== undefined ? layer.opacity : 1;
    const currentOpacityPct = Math.round(currentOpacity * 100);

    // Opções de outras camadas para selecionar grupo pai no drawer
    const opcoesOutrosPais = camadas
      .filter((l) => l.id !== layer.id)
      .map(
        (l) =>
          `<option value="${escapeHtml(l.id)}" ${layer.parentId === l.id ? 'selected' : ''}>${
            l.isGroup ? '📁 ' : ''
          }${escapeHtml(l.name)}</option>`
      )
      .join('');

    const settingsDrawerHtml = isSettingsOpen
      ? `
      <div class="ui-layer-settings-drawer" id="settings-drawer-${safeId}" style="--drawer-cor-camada: ${safeColor};">
        <div class="ui-drawer-header">
          <div class="ui-drawer-header-left">
            <span class="ui-drawer-icon">${ICONES.engrenagem}</span>
            <span class="ui-drawer-title">Configurações da Camada</span>
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
    const subcamadasHtml = subcamadas.map((sub) => renderizarNodo(sub)).join('');

    return `
      <div class="ui-layer-group ${depth > 0 ? 'is-sublayer-group' : ''}" data-layer-id="${safeId}" data-layer-depth="${depth}" role="treeitem" aria-expanded="${isExpanded}">
        <div class="ui-layer-row ${!isVisible ? 'hidden-layer' : ''} ${
      isActiveLayer ? 'active-drawing-layer' : ''
    } ${depth > 0 ? 'is-sublayer' : ''} ${isGroup ? 'is-group-row' : ''}" data-layer-row="${safeId}" data-layer-id="${safeId}" tabindex="-1" draggable="true" style="--layer-depth: ${depth}; --layer-active-color: ${safeColor};">
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

          <div class="ui-col ui-col-colorbar" style="background: ${safeColor};"></div>

          <div class="ui-col ui-col-chevron" data-layer-expand="${safeId}" role="button" tabindex="0" aria-label="${isExpanded ? 'Recolher grupo' : 'Expandir grupo'}">
            <span class="ui-chevron-icon ${isExpanded ? 'open' : ''}">${ICONES.chevronDir}</span>
          </div>

          <div class="ui-col ui-col-name" data-layer-name-trigger="${safeId}" title="Clique para ativar camada de desenho | Duplo clique para renomear">
            ${
              editingLayerId === layer.id
                ? `<input type="text" class="ui-inline-rename-input" data-inline-layer-input="${safeId}" value="${safeName}" />`
                : `${isGroup ? `<span class="ui-group-folder-icon" title="Grupo/Pasta">${ICONES.moverPasta}</span>` : ''}
                   <span class="ui-name-text">${safeName}</span>
                   ${isActiveLayer ? `<span class="ui-active-badge" title="Camada ativa para novos desenhos">✓ Ativa</span>` : ''}
                   ${subcamadas.length > 0 ? `<span class="ui-group-badge" title="${subcamadas.length} subcamadas">${subcamadas.length} sub</span>` : ''}
                   ${layerFeats.length > 0 || !isGroup ? `<span class="ui-count-chip">${layerFeats.length}</span>` : ''}`
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
            subcamadas.length === 0 && layerFeats.length === 0
              ? `<div class="ui-empty-row"><span>${q ? 'Nenhum item correspondente' : isGroup ? 'Grupo vazio (adicione subcamadas ou feições)' : 'Nenhum elemento neste grupo'}</span></div>`
              : ''
          }
        </div>
      </div>
    `;
  };

  const hierarquia = construirHierarquiaCamadas(camadas);
  const camadasHtml = hierarquia.map((nodo) => renderizarNodo(nodo)).join('');

  return `
    ${toolbarHtml}
    <div class="ui-panel-box">
      <div class="ui-layer-tree" id="ui-layer-tree-mount" role="tree" aria-label="Camadas e feições" aria-multiselectable="true">
        ${camadasHtml}
      </div>
    </div>
  `;
}
