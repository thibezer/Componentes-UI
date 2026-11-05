/* ====================================================
   UI Camadas - Marcação da linha de feição e dos avisos da camada
   Responsabilidade única: gerar o HTML (strings seguras) da linha de feição, do chip de contagem, do aviso
   de truncamento e da linha "Camada vazia". Funções puras, compartilhadas pelo render completo
   (camadas-arvore-renderer.ts) e pela atualização incremental (camadas-atualizacao-incremental.ts).
   ==================================================== */

import type { CamadaItem, FeicaoItem } from './tipos';
import type { EstadoHerdadoCamada } from './camadas-hierarquia';
import { ICONES } from './camadas-icones';
import { escapeHtml, sanitizarCorCss } from './camadas-utils';
import { renderizarThumbGeometria } from './camadas-thumb';

/** O que a linha de uma feição herda da camada onde ela está. */
export interface ContextoLinhaFeicao {
  /** `id` da camada, já escapado para atributo HTML. */
  camadaIdSeguro: string;
  /** Cor da camada, sanitizada (fallback da cor da feição). */
  corCamada: string;
  /** Profundidade da camada na hierarquia (a feição fica um nível abaixo). */
  profundidade: number;
  /** Camada oculta ou sob grupo oculto: a linha fica esmaecida. */
  esmaecida: boolean;
  /** Camada travada ou sob grupo travado: o cadeado da feição não pode ser alterado. */
  travadaPelaCamada: boolean;
}

export function criarContextoLinhaFeicao(
  camada: CamadaItem,
  profundidade: number,
  heranca: EstadoHerdadoCamada | undefined
): ContextoLinhaFeicao {
  return {
    camadaIdSeguro: escapeHtml(camada.id),
    corCamada: sanitizarCorCss(camada.color, '#00E08A'),
    profundidade,
    esmaecida: camada.visible === false || heranca?.ocultaPorAncestral === true,
    travadaPelaCamada: camada.locked === true || heranca?.travadaPorAncestral === true
  };
}

const plural = (n: number, um: string, varios: string): string => `${n} ${n === 1 ? um : varios}`;

/** Título do chip de contagem: total do ramo e, num grupo, quanto é da própria camada. */
export function tituloContagem(totalRamo: number, proprias: number, subcamadas: number): string {
  if (subcamadas === 0) return plural(totalRamo, 'feição', 'feições');
  return `${plural(totalRamo, 'feição', 'feições')} no grupo (${proprias} nesta camada) · ${plural(subcamadas, 'subcamada', 'subcamadas')}`;
}

/** Chip com o total de feições do ramo; vazio num grupo sem feições. */
export function renderizarChipContagem(totalRamo: number, proprias: number, subcamadas: number, ehGrupo: boolean): string {
  if (totalRamo === 0 && ehGrupo) return '';
  return `<span class="ui-count-chip" title="${tituloContagem(totalRamo, proprias, subcamadas)}">${totalRamo}</span>`;
}

/** Textos do aviso "Exibindo X de Y", compartilhados pelo HTML e pela atualização no lugar. */
export function textosAvisoTruncamento(exibidas: number, total: number): { resumo: string; botao: string } {
  const restantes = total - exibidas;
  return {
    resumo: `Exibindo ${exibidas} de ${total} feições. Use a busca acima para filtrar.`,
    botao: `Mostrar mais (+${Math.min(80, restantes)})`
  };
}

export function renderizarAvisoTruncamento(camadaIdSeguro: string, exibidas: number, total: number): string {
  const textos = textosAvisoTruncamento(exibidas, total);
  return `<div class="ui-truncate-notice" role="note">
          <span>${textos.resumo}</span>
          <button type="button" class="ui-truncate-more-btn" data-layer-show-more="${camadaIdSeguro}">${textos.botao}</button>
        </div>`;
}

export function renderizarLinhaVazia(ehGrupo: boolean): string {
  return `<div class="ui-empty-row"><span>${ehGrupo ? 'Grupo vazio (adicione subcamadas ou feições)' : 'Camada vazia'}</span></div>`;
}

/** Campos da feição que aparecem na linha: se nenhum mudou, a linha desenhada continua válida. */
const CAMPOS_DA_LINHA = ['name', 'color', 'visible', 'locked', 'status', 'type', 'geometryType', 'coordinates', 'layerId'] as const;

export function mesmaLinhaFeicao(a: FeicaoItem, b: FeicaoItem): boolean {
  return CAMPOS_DA_LINHA.every((campo) => a[campo] === b[campo]);
}

export function renderizarLinhaFeicao(
  feat: FeicaoItem,
  ctx: ContextoLinhaFeicao,
  selecionada: boolean,
  editando: boolean
): string {
  const { camadaIdSeguro: safeId, corCamada, profundidade: depth } = ctx;
  const featId = escapeHtml(feat.id);
  const featName = escapeHtml(feat.name || 'Feição');
  const featColor = sanitizarCorCss(feat.color, corCamada);
  const isFeatVisible = feat.visible !== false;
  const featTravadaPelaCamada = ctx.travadaPelaCamada;
  const isFeatLocked = feat.locked === true || featTravadaPelaCamada;
  const tituloLockFeicao = featTravadaPelaCamada
    ? 'Bloqueada pela camada'
    : isFeatLocked
      ? 'Desbloquear Feição'
      : 'Bloquear Feição';

  // Estilo Adobe: o estado padrão (oficial) não ganha selo; só a exceção (prévia) é sinalizada
  const statusTag =
    feat.status === 'previa'
      ? `<span class="ui-previa-dot" title="Geometria prévia" aria-label="Geometria prévia"></span>`
      : '';

  return `
          <div class="ui-feat-row ${selecionada ? 'selected-row' : ''} ${
          !isFeatVisible ? 'hidden-row' : ''
        } ${ctx.esmaecida ? 'herdado-oculto' : ''}" data-feat-row="${featId}" data-feat-select="${featId}" data-feat-layer="${safeId}" role="treeitem" aria-level="${depth + 2}" aria-selected="${selecionada}" tabindex="-1" draggable="true" part="${
          selecionada ? 'feicao feicao-selecionada' : 'feicao'
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
                editando
                  ? `<input type="text" class="ui-inline-rename-input" data-inline-feat-input="${featId}" value="${featName}" />`
                  : `<span class="ui-name-text">${featName}</span>${statusTag}`
              }
            </div>

            <div class="ui-col ui-col-actions">
              <button class="ui-micro-btn" data-feat-fit="${featId}" title="Enquadrar no mapa" aria-label="Enquadrar feição no mapa">${ICONES.alvoEnquadrar}</button>
            </div>

            <div class="ui-col ui-col-target" data-feat-target="${featId}" role="button" tabindex="0" aria-label="Selecionar feição" title="Selecionar feição">
              <div class="ui-target-circle ${selecionada ? 'selected' : ''}"></div>
            </div>
          </div>
        `;
}
