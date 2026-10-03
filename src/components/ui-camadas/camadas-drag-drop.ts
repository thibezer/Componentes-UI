/* ====================================================
   UI Camadas - Drag & Drop e Edição Inline
   Reordenação de Camadas / Feições e Renomeação Rápida
   ==================================================== */

import { CamadaItem, FeicaoItem } from './tipos';
import { buscarPorAtributo } from './camadas-utils';

export interface UICamadasHost {
  camadas: CamadaItem[];
  feicoes: FeicaoItem[];
  editingLayerId: string | null;
  editingFeatureId: string | null;
  solicitarRenderizacao(): void;
  dispararEvento(nome: string, detalhe: unknown): void;
  salvarLembrancaEstado?(): void;
}

export class CamadasDragDropManager {
  private host: UICamadasHost;
  private shadow: ShadowRoot;

  constructor(host: UICamadasHost, shadow: ShadowRoot) {
    this.host = host;
    this.shadow = shadow;
  }

  public bindAll(): void {
    this.bindInlineRename();
    this.bindDragAndDrop();
  }

  public bindInlineRename(): void {
    // 1. Edição inline do nome da camada
    this.shadow.querySelectorAll('[data-layer-name-trigger]').forEach((nameElem) => {
      nameElem.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const layerId = nameElem.getAttribute('data-layer-name-trigger');
        if (!layerId) return;

        this.host.editingLayerId = layerId;
        this.host.solicitarRenderizacao();

        const input = buscarPorAtributo(
          this.shadow,
          'data-inline-layer-input',
          layerId
        ) as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
          let committed = false;

          const finishEdit = (save: boolean) => {
            if (committed) return;
            committed = true;
            this.host.editingLayerId = null;
            if (save) {
              const newName = input.value.trim();
              const layer = this.host.camadas.find((l) => l.id === layerId);
              if (newName && layer && layer.name !== newName) {
                layer.name = newName;
                this.host.salvarLembrancaEstado?.();
                this.host.dispararEvento('ui-camada-renomeada', {
                  camadaId: layerId,
                  novoNome: newName,
                  camada: layer
                });
              }
            }
            this.host.solicitarRenderizacao();
          };

          input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') {
              ke.preventDefault();
              finishEdit(true);
            } else if (ke.key === 'Escape') {
              ke.preventDefault();
              finishEdit(false);
            }
          });
          input.addEventListener('blur', () => finishEdit(true));
        }
      });
    });

    // 2. Edição inline do nome da feição
    this.shadow.querySelectorAll('[data-feat-name-trigger]').forEach((nameElem) => {
      nameElem.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const featId = nameElem.getAttribute('data-feat-name-trigger');
        if (!featId) return;

        this.host.editingFeatureId = featId;
        this.host.solicitarRenderizacao();

        const input = buscarPorAtributo(
          this.shadow,
          'data-inline-feat-input',
          featId
        ) as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
          let committed = false;

          const finishEdit = (save: boolean) => {
            if (committed) return;
            committed = true;
            this.host.editingFeatureId = null;
            if (save) {
              const newName = input.value.trim();
              const feat = this.host.feicoes.find((f) => f.id === featId);
              if (newName && feat && feat.name !== newName) {
                feat.name = newName;
                this.host.dispararEvento('ui-feicao-renomeada', {
                  feicaoId: featId,
                  novoNome: newName,
                  feicao: feat
                });
              }
            }
            this.host.solicitarRenderizacao();
          };

          input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') {
              ke.preventDefault();
              finishEdit(true);
            } else if (ke.key === 'Escape') {
              ke.preventDefault();
              finishEdit(false);
            }
          });
          input.addEventListener('blur', () => finishEdit(true));
        }
      });
    });
  }

  public bindDragAndDrop(): void {
    let draggedType: 'layer' | 'feature' | null = null;
    let draggedLayerId: string | null = null;
    let draggedFeatId: string | null = null;

    const clearAllDragClasses = () => {
      this.shadow
        .querySelectorAll('.ui-layer-row, .ui-feat-row, .ui-layer-group')
        .forEach((el) => {
          el.classList.remove('dragging', 'drop-above', 'drop-below', 'drop-into');
        });
    };

    // -------------------------------------------------------------
    // 1. Drag & Drop de Camadas (Reordenação de Z-Index)
    // -------------------------------------------------------------
    this.shadow.querySelectorAll('.ui-layer-row[draggable="true"]').forEach((layerRow) => {
      const layerId = layerRow.getAttribute('data-layer-id');
      if (!layerId) return;

      layerRow.addEventListener('dragstart', (e: Event) => {
        const de = e as DragEvent;
        const target = de.target as HTMLElement;
        if (
          target.closest('input, button, select') ||
          this.host.editingLayerId ||
          this.host.editingFeatureId
        ) {
          de.preventDefault();
          return;
        }
        draggedType = 'layer';
        draggedLayerId = layerId;
        if (de.dataTransfer) {
          de.dataTransfer.setData('text/plain', JSON.stringify({ type: 'layer', id: layerId }));
          de.dataTransfer.effectAllowed = 'move';
        }
        layerRow.classList.add('dragging');
      });

      layerRow.addEventListener('dragover', (e: Event) => {
        const de = e as DragEvent;
        de.preventDefault();
        de.stopPropagation();
        if (de.dataTransfer) de.dataTransfer.dropEffect = 'move';

        if (draggedType === 'layer') {
          if (draggedLayerId === layerId) return;
          const rect = layerRow.getBoundingClientRect();
          const isTop = de.clientY - rect.top < rect.height / 2;
          layerRow.classList.toggle('drop-above', isTop);
          layerRow.classList.toggle('drop-below', !isTop);
        } else if (draggedType === 'feature') {
          layerRow.classList.add('drop-into');
        }
      });

      layerRow.addEventListener('dragleave', (e: Event) => {
        // Passar sobre um elemento filho dispara dragleave no pai: só limpa ao sair de fato da linha
        const destino = (e as DragEvent).relatedTarget as Node | null;
        if (destino && layerRow.contains(destino)) return;
        layerRow.classList.remove('drop-above', 'drop-below', 'drop-into');
      });

      layerRow.addEventListener('drop', (e: Event) => {
        const de = e as DragEvent;
        de.preventDefault();
        de.stopPropagation();
        const dropAbove = layerRow.classList.contains('drop-above');
        clearAllDragClasses();

        if (draggedType === 'layer') {
          if (!draggedLayerId || draggedLayerId === layerId) return;
          const srcIdx = this.host.camadas.findIndex((l) => l.id === draggedLayerId);
          if (srcIdx === -1) return;

          const [movedLayer] = this.host.camadas.splice(srcIdx, 1);
          const tgtIdx = this.host.camadas.findIndex((l) => l.id === layerId);
          if (tgtIdx === -1) {
            this.host.camadas.push(movedLayer);
          } else {
            this.host.camadas.splice(dropAbove ? tgtIdx : tgtIdx + 1, 0, movedLayer);
          }

          this.host.salvarLembrancaEstado?.();
          this.host.dispararEvento('ui-camadas-reordenadas', {
            camadas: [...this.host.camadas]
          });
          this.host.solicitarRenderizacao();
        } else if (draggedType === 'feature') {
          if (!draggedFeatId) return;
          const feat = this.host.feicoes.find((f) => f.id === draggedFeatId);
          const targetLayer = this.host.camadas.find((l) => l.id === layerId);
          if (feat && targetLayer && feat.layerId !== layerId) {
            const origemId = feat.layerId;
            feat.layerId = layerId;
            this.host.dispararEvento('ui-feicao-movida', {
              feicaoId: feat.id,
              camadaOrigemId: origemId,
              camadaDestinoId: layerId,
              feicao: feat
            });
            this.host.solicitarRenderizacao();
          }
        }
      });

      layerRow.addEventListener('dragend', () => {
        draggedType = null;
        draggedLayerId = null;
        draggedFeatId = null;
        clearAllDragClasses();
      });
    });

    // -------------------------------------------------------------
    // 2. Drag & Drop de Feições (Reordenação interna e entre camadas)
    // -------------------------------------------------------------
    this.shadow.querySelectorAll('.ui-feat-row[draggable="true"]').forEach((featRow) => {
      const featId = featRow.getAttribute('data-feat-row');
      const featLayerId = featRow.getAttribute('data-feat-layer');
      if (!featId) return;

      featRow.addEventListener('dragstart', (e: Event) => {
        const de = e as DragEvent;
        const target = de.target as HTMLElement;
        if (
          target.closest('input, button, select') ||
          this.host.editingLayerId ||
          this.host.editingFeatureId
        ) {
          de.preventDefault();
          return;
        }
        de.stopPropagation();
        draggedType = 'feature';
        draggedFeatId = featId;
        draggedLayerId = featLayerId;
        if (de.dataTransfer) {
          de.dataTransfer.setData(
            'text/plain',
            JSON.stringify({ type: 'feature', id: featId, layerId: featLayerId })
          );
          de.dataTransfer.effectAllowed = 'move';
        }
        featRow.classList.add('dragging');
      });

      featRow.addEventListener('dragover', (e: Event) => {
        const de = e as DragEvent;
        if (draggedType !== 'feature' || draggedFeatId === featId) return;
        de.preventDefault();
        de.stopPropagation();
        if (de.dataTransfer) de.dataTransfer.dropEffect = 'move';

        const rect = featRow.getBoundingClientRect();
        const isTop = de.clientY - rect.top < rect.height / 2;
        featRow.classList.toggle('drop-above', isTop);
        featRow.classList.toggle('drop-below', !isTop);
      });

      featRow.addEventListener('dragleave', (e: Event) => {
        const destino = (e as DragEvent).relatedTarget as Node | null;
        if (destino && featRow.contains(destino)) return;
        featRow.classList.remove('drop-above', 'drop-below');
      });

      featRow.addEventListener('drop', (e: Event) => {
        const de = e as DragEvent;
        if (draggedType !== 'feature' || !draggedFeatId || draggedFeatId === featId) return;
        de.preventDefault();
        de.stopPropagation();

        const dropAbove = featRow.classList.contains('drop-above');
        clearAllDragClasses();

        const srcIdx = this.host.feicoes.findIndex((f) => f.id === draggedFeatId);
        if (srcIdx === -1) return;

        const targetFeat = this.host.feicoes.find((f) => f.id === featId);
        if (!targetFeat) return;

        const [movedFeat] = this.host.feicoes.splice(srcIdx, 1);
        const originalLayerId = movedFeat.layerId;
        const targetLayerId = targetFeat.layerId;
        const layerChanged = originalLayerId !== targetLayerId;

        if (layerChanged) {
          movedFeat.layerId = targetLayerId;
        }

        const targetIdx = this.host.feicoes.findIndex((f) => f.id === featId);
        if (targetIdx === -1) {
          this.host.feicoes.push(movedFeat);
        } else {
          this.host.feicoes.splice(dropAbove ? targetIdx : targetIdx + 1, 0, movedFeat);
        }

        if (layerChanged) {
          this.host.dispararEvento('ui-feicao-movida', {
            feicaoId: movedFeat.id,
            camadaOrigemId: originalLayerId,
            camadaDestinoId: targetLayerId,
            feicao: movedFeat
          });
        }

        this.host.dispararEvento('ui-feicoes-reordenadas', {
          feicoes: [...this.host.feicoes]
        });

        this.host.solicitarRenderizacao();
      });

      featRow.addEventListener('dragend', (e: Event) => {
        e.stopPropagation();
        draggedType = null;
        draggedFeatId = null;
        draggedLayerId = null;
        clearAllDragClasses();
      });
    });
  }
}
