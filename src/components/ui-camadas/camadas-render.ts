/* ====================================================
   UI Camadas - Renderização do painel
   Responsabilidade única: montar o HTML do corpo (árvore, rodapé e mapas base),
   preservando scroll e foco, e religar eventos e arraste depois do innerHTML.
   ==================================================== */

import type { MapaBaseItem } from './tipos';
import { renderizarArvoreCamadas } from './camadas-arvore-renderer';
import { renderizarRodapeAcoes } from './camadas-rodape';
import { renderizarGridMapasBase } from './camadas-mapas-base';
import { conectarEventosArvore } from './camadas-eventos-arvore';
import { buscarPorAtributo } from './camadas-utils';
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

    conectarEventosArvore(host, shadow);
    dragDrop.bindAll();
}
