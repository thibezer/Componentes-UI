/* ====================================================
   UI Camadas - Renderização do painel
   Responsabilidade única: montar o HTML do corpo (árvore, rodapé e mapas base),
   preservando scroll e foco, e religar eventos e arraste depois do innerHTML.
   ==================================================== */

import type { MapaBaseItem, MudancaFeicoes } from './tipos';
import { renderizarArvoreCamadas } from './camadas-arvore-renderer';
import { renderizarRodapeAcoes } from './camadas-rodape';
import { renderizarGridMapasBase } from './camadas-mapas-base';
import { conectarEventosArvore, conectarEventosFeicoes } from './camadas-eventos-arvore';
import { conectarMostrarMais } from './camadas-eventos-camadas';
import { conectarArrasteControles } from './camadas-arraste-controles';
import { tentarAtualizacaoIncremental } from './camadas-atualizacao-incremental';
import { buscarPorAtributo } from './camadas-utils';
import { ICONES } from './camadas-icones';
import type { CamadasHostCompleto } from './camadas-host';
import type { CamadasDragDropManager } from './camadas-drag-drop';

/** O que a renderização lê do componente (além do contrato de eventos). */
export interface HostRenderizavel extends CamadasHostCompleto {
  mapasBase: MapaBaseItem[];
  editingLayerId: string | null;
  editingFeatureId: string | null;
  readonly flutuante: boolean;
  readonly mostrarMapasBase: boolean;
  readonly mapasBaseRecolhido: boolean;
  readonly mostrarRodape: boolean;
  getAttribute(nome: string): string | null;
}

/** Troca uma <img> de miniatura que não carregou pelo mesmo placeholder usado por "Sem Mapa". */
export function substituirMiniaturaQuebrada(img: HTMLImageElement): void {
  if (!img.isConnected) return;
  const placeholder = document.createElement('div');
  placeholder.className = 'ui-basemap-preview-none';
  placeholder.innerHTML = ICONES.gradeCad;
  img.replaceWith(placeholder);
}

export function renderizarPainel(
  host: HostRenderizavel,
  shadow: ShadowRoot,
  corpo: HTMLElement,
  dragDrop: CamadasDragDropManager
): void {
    // Renderiza a árvore de camadas e feições
    const arvoreHtml = renderizarArvoreCamadas({
      camadas: host.camadas,
      feicoes: host.feicoes,
      camadaAtivaId: host.camadaAtivaId,
      expandedLayers: host.expandedLayers,
      selectedFeatureIds: host.selectedFeatureIds,
      activeSettingsLayerId: host.activeSettingsLayerId,
      editingLayerId: host.editingLayerId,
      editingFeatureId: host.editingFeatureId,
      searchQuery: host.searchQuery,
      titulo: host.titulo,
      mostrarBusca: host.mostrarBusca,
      limitesPorCamada: host.expandedFeatureLimits,
      mostrarBotaoColapsar: host.flutuante && host.getAttribute('colapsavel') !== 'false'
    });

    const mapasBaseHtml = host.mostrarMapasBase
      ? renderizarGridMapasBase(host.mapasBase, host.mapaBaseAtivo, host.mapasBaseRecolhido)
      : '';

    const rodapeHtml = host.mostrarRodape
      ? renderizarRodapeAcoes(host.camadas, host.feicoes, host.selectedFeatureIds)
      : '';

    // O innerHTML recria a árvore inteira: guarda scroll e foco para devolvê-los depois
    const treeAntes = shadow.getElementById('ui-layer-tree-mount');
    const scrollCorpo = corpo.scrollTop;
    const scrollArvore = treeAntes ? treeAntes.scrollTop : 0;
    const focado = shadow.activeElement as HTMLInputElement | HTMLElement | null;
    const focoId = focado && corpo.contains(focado) ? focado.id : '';
    // Sem id (linhas, botões de ícone), o foco volta pelo primeiro atributo data-* que identifica o controle
    const focoChave =
      focado && !focoId && corpo.contains(focado)
        ? Array.from(focado.attributes).find((at) => at.name.startsWith('data-') && at.value !== '')
        : undefined;
    const caret =
      focado && 'selectionStart' in focado ? (focado as HTMLInputElement).selectionStart : null;

    corpo.innerHTML = `
      ${arvoreHtml}
      ${rodapeHtml}
      ${mapasBaseHtml}
    `;

    corpo.scrollTop = scrollCorpo;
    const treeDepois = shadow.getElementById('ui-layer-tree-mount');
    if (treeDepois) treeDepois.scrollTop = scrollArvore;

    if (focoId) {
      const novo = shadow.getElementById(focoId) as HTMLInputElement | null;
      if (novo) {
        novo.focus({ preventScroll: true });
        if (caret !== null && typeof novo.setSelectionRange === 'function') {
          try {
            novo.setSelectionRange(caret, caret);
          } catch {
            // Tipos de input sem suporte a seleção (ex.: color) são ignorados
          }
        }
      }
    }

    if (!focoId && focoChave) {
      buscarPorAtributo(corpo, focoChave.name, focoChave.value)?.focus({ preventScroll: true });
    }

    // Roving tabindex: apenas a primeira linha entra na ordem de Tab; as demais usam setas
    shadow.querySelector<HTMLElement>('[data-layer-row], [data-feat-row]')?.setAttribute('tabindex', '0');

    // Miniaturas remotas podem falhar (offline, CSP, link quebrado): troca pelo placeholder neutro
    corpo.querySelectorAll<HTMLImageElement>('img[data-basemap-thumb]').forEach((img) => {
      const trocarPorPlaceholder = (): void => substituirMiniaturaQuebrada(img);
      img.addEventListener('error', trocarPorPlaceholder, { once: true });
      // O erro pode ter ocorrido antes de o ouvinte existir
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) trocarPorPlaceholder();
    });

    conectarEventosArvore(host, shadow);
    dragDrop.bindAll();
}

/**
 * Tenta atualizar só as linhas de feição afetadas pela `mudanca`, sem tocar no resto do painel (foco, scroll e
 * listeners das linhas existentes ficam como estão). Devolve `false` quando o chamador deve redesenhar tudo.
 */
export function renderizarFeicoesIncremental(
  host: HostRenderizavel,
  shadow: ShadowRoot,
  dragDrop: CamadasDragDropManager,
  mudanca: MudancaFeicoes
): boolean {
  try {
    return tentarAtualizacaoIncremental(host, shadow, mudanca, (raiz) => {
      conectarEventosFeicoes(host, raiz);
      conectarMostrarMais(host, raiz);
      conectarArrasteControles(host, shadow, raiz);
      dragDrop.bindLinhasFeicao(raiz);
    });
  } catch (erro) {
    // Entrada hostil ou DOM inesperado: o render completo reconstrói tudo a partir do modelo
    console.warn('[UI-Camadas] atualização incremental falhou; redesenhando o painel.', erro);
    return false;
  }
}
