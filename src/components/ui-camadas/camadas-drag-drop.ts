/* ====================================================
   UI Camadas - Arrastar e soltar
   Responsabilidade única: ligar os eventos de arraste (mouse/HTML5 e toque/ponteiro) às regras puras de
   camadas-drop-ops.ts, emitir os eventos de reordenação e pedir a nova renderização.
   O renomear inline mora em camadas-renomear.ts.
   ==================================================== */

import { CamadaItem, FeicaoItem } from './tipos';
import { vincularRenomearInline } from './camadas-renomear';
import { idsCamadasTravadas } from './camadas-hierarquia';
import {
  zonaDeDropCamada,
  moverCamada,
  reordenarCamada,
  moverFeicaoParaCamada,
  reordenarFeicao
} from './camadas-drop-ops';

export interface UICamadasHost {
  camadas: CamadaItem[];
  feicoes: FeicaoItem[];
  editingLayerId: string | null;
  editingFeatureId: string | null;
  /** Camadas expandidas; ao aninhar uma camada, o pai se expande. */
  expandedLayers?: Set<string>;
  solicitarRenderizacao(): void;
  dispararEvento(nome: string, detalhe: unknown): void;
  salvarLembrancaEstado?(): void;
}

const CLASSES_DROP = ['dragging', 'drop-above', 'drop-below', 'drop-into'];

export class CamadasDragDropManager {
  private host: UICamadasHost;
  private shadow: ShadowRoot;
  /** Cancela um arraste por toque em andamento (remove os ouvintes de `window`). */
  private cancelarToque: (() => void) | null = null;

  constructor(host: UICamadasHost, shadow: ShadowRoot) {
    this.host = host;
    this.shadow = shadow;
  }

  public bindAll(): void {
    this.bindInlineRename();
    this.bindDragAndDrop();
    this.bindTouchDragAndDrop();
  }

  /** Solta o que ficou em `window` (arraste por toque interrompido pela desconexão do componente). */
  public destruir(): void {
    this.cancelarToque?.();
    this.cancelarToque = null;
  }

  public bindInlineRename(): void {
    vincularRenomearInline(this.host, this.shadow);
  }

  private limparClassesDeArraste(): void {
    this.shadow.querySelectorAll('.ui-layer-row, .ui-feat-row, .ui-layer-group').forEach((el) => {
      el.classList.remove(...CLASSES_DROP);
    });
  }

  /** Depois de qualquer mudança na ordem/hierarquia de camadas. */
  private aposReordenarCamadas(): void {
    this.host.salvarLembrancaEstado?.();
    this.host.dispararEvento('ui-camadas-reordenadas', { camadas: [...this.host.camadas] });
    this.host.solicitarRenderizacao();
  }

  private emitirFeicaoMovida(r: { feicao: FeicaoItem; camadaOrigemId: string | undefined; camadaDestinoId: string | undefined }): void {
    this.host.dispararEvento('ui-feicao-movida', {
      feicaoId: r.feicao.id,
      camadaOrigemId: r.camadaOrigemId,
      camadaDestinoId: r.camadaDestinoId,
      feicao: r.feicao
    });
  }

  /** Camada travada (ou sob grupo travado) não recebe nem perde feições pelo arraste. */
  private trocaEntreCamadasTravada(feicaoId: string, camadaDestinoId: string | null): boolean {
    const origemId = this.host.feicoes.find((f) => f.id === feicaoId)?.layerId;
    if (!camadaDestinoId || origemId === camadaDestinoId) return false;
    const travadas = idsCamadasTravadas(this.host.camadas);
    return travadas.has(camadaDestinoId) || (!!origemId && travadas.has(origemId));
  }

  private arrasteBloqueado(alvo: HTMLElement): boolean {
    return !!alvo.closest('input, button, select') || !!this.host.editingLayerId || !!this.host.editingFeatureId;
  }

  public bindDragAndDrop(): void {
    let tipoArrastado: 'layer' | 'feature' | null = null;
    let camadaArrastadaId: string | null = null;
    let feicaoArrastadaId: string | null = null;

    // -------------------------------------------------------------
    // 1. Drag & Drop de Camadas (Reordenação de Z-Index e aninhamento)
    // -------------------------------------------------------------
    this.shadow.querySelectorAll('.ui-layer-row[draggable="true"]').forEach((linha) => {
      const camadaId = linha.getAttribute('data-layer-id');
      if (!camadaId) return;

      linha.addEventListener('dragstart', (e: Event) => {
        const de = e as DragEvent;
        if (this.arrasteBloqueado(de.target as HTMLElement)) {
          de.preventDefault();
          return;
        }
        tipoArrastado = 'layer';
        camadaArrastadaId = camadaId;
        if (de.dataTransfer) {
          de.dataTransfer.setData('text/plain', JSON.stringify({ type: 'layer', id: camadaId }));
          de.dataTransfer.effectAllowed = 'move';
        }
        linha.classList.add('dragging');
      });

      linha.addEventListener('dragover', (e: Event) => {
        const de = e as DragEvent;
        de.preventDefault();
        de.stopPropagation();
        if (de.dataTransfer) de.dataTransfer.dropEffect = 'move';

        if (tipoArrastado === 'layer') {
          if (camadaArrastadaId === camadaId) return;
          const rect = linha.getBoundingClientRect();
          const zona = zonaDeDropCamada((de.clientY - rect.top) / rect.height);
          linha.classList.toggle('drop-above', zona === 'acima');
          linha.classList.toggle('drop-below', zona === 'abaixo');
          // Zona central: soltar para dentro como subcamada
          linha.classList.toggle('drop-into', zona === 'dentro');
        } else if (tipoArrastado === 'feature') {
          linha.classList.add('drop-into');
        }
      });

      linha.addEventListener('dragleave', (e: Event) => {
        // Passar sobre um elemento filho dispara dragleave no pai: só limpa ao sair de fato da linha
        const destino = (e as DragEvent).relatedTarget as Node | null;
        if (destino && linha.contains(destino)) return;
        linha.classList.remove('drop-above', 'drop-below', 'drop-into');
      });

      linha.addEventListener('drop', (e: Event) => {
        const de = e as DragEvent;
        de.preventDefault();
        de.stopPropagation();
        const zona = linha.classList.contains('drop-into') ? 'dentro' : linha.classList.contains('drop-above') ? 'acima' : 'abaixo';
        this.limparClassesDeArraste();

        if (tipoArrastado === 'layer') {
          if (!camadaArrastadaId || camadaArrastadaId === camadaId) return;
          if (!this.host.camadas.some((l) => l.id === camadaArrastadaId) || !this.host.camadas.some((l) => l.id === camadaId)) return;

          const resultado = moverCamada(this.host.camadas, camadaArrastadaId, camadaId, zona);
          if (resultado?.tipo === 'hierarquia') {
            this.host.expandedLayers?.add(resultado.novoParentId);
            this.host.dispararEvento('ui-camada-mover-hierarquia', {
              camadaId: resultado.camada.id,
              novoParentId: resultado.novoParentId,
              parentAnteriorId: resultado.parentAnteriorId,
              camada: resultado.camada
            });
          } else if (resultado && resultado.parentAnteriorId !== resultado.novoParentId) {
            this.host.dispararEvento('ui-camada-mover-hierarquia', {
              camadaId: resultado.camada.id,
              novoParentId: resultado.novoParentId,
              parentAnteriorId: resultado.parentAnteriorId,
              camada: resultado.camada
            });
          }
          this.aposReordenarCamadas();
        } else if (tipoArrastado === 'feature') {
          if (!feicaoArrastadaId || this.trocaEntreCamadasTravada(feicaoArrastadaId, camadaId)) return;
          const movida = moverFeicaoParaCamada(this.host.feicoes, this.host.camadas, feicaoArrastadaId, camadaId);
          if (movida) {
            this.emitirFeicaoMovida(movida);
            this.host.solicitarRenderizacao();
          }
        }
      });

      linha.addEventListener('dragend', () => {
        tipoArrastado = null;
        camadaArrastadaId = null;
        feicaoArrastadaId = null;
        this.limparClassesDeArraste();
      });
    });

    // -------------------------------------------------------------
    // 2. Drag & Drop de Feições (Reordenação interna e entre camadas)
    // -------------------------------------------------------------
    this.shadow.querySelectorAll('.ui-feat-row[draggable="true"]').forEach((linha) => {
      const feicaoId = linha.getAttribute('data-feat-row');
      const camadaDaFeicaoId = linha.getAttribute('data-feat-layer');
      if (!feicaoId) return;

      linha.addEventListener('dragstart', (e: Event) => {
        const de = e as DragEvent;
        if (this.arrasteBloqueado(de.target as HTMLElement)) {
          de.preventDefault();
          return;
        }
        de.stopPropagation();
        tipoArrastado = 'feature';
        feicaoArrastadaId = feicaoId;
        camadaArrastadaId = camadaDaFeicaoId;
        if (de.dataTransfer) {
          de.dataTransfer.setData('text/plain', JSON.stringify({ type: 'feature', id: feicaoId, layerId: camadaDaFeicaoId }));
          de.dataTransfer.effectAllowed = 'move';
        }
        linha.classList.add('dragging');
      });

      linha.addEventListener('dragover', (e: Event) => {
        const de = e as DragEvent;
        if (tipoArrastado !== 'feature' || feicaoArrastadaId === feicaoId) return;
        de.preventDefault();
        de.stopPropagation();
        if (de.dataTransfer) de.dataTransfer.dropEffect = 'move';

        const rect = linha.getBoundingClientRect();
        const acima = de.clientY - rect.top < rect.height / 2;
        linha.classList.toggle('drop-above', acima);
        linha.classList.toggle('drop-below', !acima);
      });

      linha.addEventListener('dragleave', (e: Event) => {
        const destino = (e as DragEvent).relatedTarget as Node | null;
        if (destino && linha.contains(destino)) return;
        linha.classList.remove('drop-above', 'drop-below');
      });

      linha.addEventListener('drop', (e: Event) => {
        const de = e as DragEvent;
        if (tipoArrastado !== 'feature' || !feicaoArrastadaId || feicaoArrastadaId === feicaoId) return;
        de.preventDefault();
        de.stopPropagation();

        const acima = linha.classList.contains('drop-above');
        this.limparClassesDeArraste();

        if (this.trocaEntreCamadasTravada(feicaoArrastadaId, camadaDaFeicaoId)) return;
        const resultado = reordenarFeicao(this.host.feicoes, feicaoArrastadaId, feicaoId, acima);
        if (!resultado) return;
        if (resultado.mudouDeCamada) this.emitirFeicaoMovida(resultado);
        this.host.dispararEvento('ui-feicoes-reordenadas', { feicoes: [...this.host.feicoes] });
        this.host.solicitarRenderizacao();
      });

      linha.addEventListener('dragend', (e: Event) => {
        e.stopPropagation();
        tipoArrastado = null;
        feicaoArrastadaId = null;
        camadaArrastadaId = null;
        this.limparClassesDeArraste();
      });
    });
  }

  /**
   * Suporte a arraste por toque e ponteiro no handle (.ui-col-drag) para tablets e mobile.
   * Os ouvintes de `window` existem só durante o gesto e são soltos em `destruir()`.
   */
  public bindTouchDragAndDrop(): void {
    this.shadow.querySelectorAll('.ui-layer-row .ui-col-drag').forEach((handle) => {
      const linhaOrigem = handle.closest('.ui-layer-row') as HTMLElement | null;
      if (!linhaOrigem) return;
      const camadaId = linhaOrigem.getAttribute('data-layer-id');
      if (!camadaId) return;

      handle.addEventListener('pointerdown', (e: Event) => {
        const pe = e as PointerEvent;
        // Ignora botão secundário do mouse
        if (pe.pointerType === 'mouse' && pe.button !== 0) return;
        if (this.host.editingLayerId || this.host.editingFeatureId) return;

        this.cancelarToque?.();
        let linhaAlvo: HTMLElement | null = null;
        let acima = false;

        const aoMover = (me: PointerEvent): void => {
          me.preventDefault();
          linhaOrigem.classList.add('dragging');

          const sob = this.shadow.elementFromPoint(me.clientX, me.clientY) as HTMLElement | null;
          const alvo = sob ? (sob.closest('.ui-layer-row') as HTMLElement | null) : null;

          if (linhaAlvo && linhaAlvo !== alvo) linhaAlvo.classList.remove('drop-above', 'drop-below');

          if (alvo && alvo !== linhaOrigem) {
            linhaAlvo = alvo;
            const rect = alvo.getBoundingClientRect();
            acima = me.clientY - rect.top < rect.height / 2;
            alvo.classList.toggle('drop-above', acima);
            alvo.classList.toggle('drop-below', !acima);
          } else {
            linhaAlvo = null;
          }
        };

        const encerrar = (): void => {
          window.removeEventListener('pointermove', aoMover);
          window.removeEventListener('pointerup', aoSoltar);
          window.removeEventListener('pointercancel', aoSoltar);
          this.cancelarToque = null;
        };

        const aoSoltar = (): void => {
          encerrar();
          const alvoId = linhaAlvo?.getAttribute('data-layer-id');
          this.limparClassesDeArraste();
          if (alvoId && reordenarCamada(this.host.camadas, camadaId, alvoId, acima)) {
            this.aposReordenarCamadas();
          }
        };

        this.cancelarToque = () => {
          encerrar();
          this.limparClassesDeArraste();
        };
        window.addEventListener('pointermove', aoMover, { passive: false });
        window.addEventListener('pointerup', aoSoltar);
        window.addEventListener('pointercancel', aoSoltar);
      });
    });
  }
}
