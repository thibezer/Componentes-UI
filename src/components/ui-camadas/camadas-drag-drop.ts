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
  ehDescendente,
  zonaDeDropCamada,
  moverCamada,
  moverCamadaEmRelacaoAFeicao,
  moverFeicaoParaCamada,
  moverFeicaoEmRelacaoACamada,
  reordenarFeicao,
  sincronizarOrdemFilhosAposMoverCamada,
  sincronizarOrdemFilhosAposReordenarFeicao,
  sincronizarOrdemFilhosAposMoverFeicao,
  type ZonaDrop
} from './camadas-drop-ops';

export interface UICamadasHost {
  camadas: CamadaItem[];
  feicoes: FeicaoItem[];
  editingLayerId: string | null;
  editingFeatureId: string | null;
  /** Camadas expandidas; ao aninhar uma camada, o pai se expande. */
  expandedLayers?: Set<string>;
  /** Ordem mista (subcamadas + feições) por camada pai (`L:<id>` / `F:<id>`). */
  ordemFilhosPorPai?: Map<string, string[]>;
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
  /**
   * Arraste HTML5 em andamento. Fica no gerenciador (e não numa closure de `bindDragAndDrop`) para que linhas
   * ligadas depois, na atualização incremental, enxerguem o arraste iniciado numa linha mais antiga.
   */
  private arraste: { tipo: 'layer' | 'feature' | null; camadaId: string | null; feicaoId: string | null } = {
    tipo: null,
    camadaId: null,
    feicaoId: null
  };

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
      feicao: r.feicao,
      feicoes: [...this.host.feicoes]
    });
  }

  /** Camada travada (ou sob grupo travado) ou feição individualmente travada não pode ser movida entre camadas. */
  private trocaEntreCamadasTravada(feicaoId: string, camadaDestinoId: string | null): boolean {
    const feicao = this.host.feicoes.find((f) => f.id === feicaoId);
    const origemId = feicao?.layerId;
    if (!camadaDestinoId || origemId === camadaDestinoId) return false;
    if (feicao?.locked === true) return true;
    const travadas = idsCamadasTravadas(this.host.camadas);
    return travadas.has(camadaDestinoId) || (!!origemId && travadas.has(origemId));
  }

  private arrasteBloqueado(alvo: HTMLElement): boolean {
    return !!alvo.closest('input, button, select') || !!this.host.editingLayerId || !!this.host.editingFeatureId;
  }

  /** Render completo: zera o arraste e liga camadas e feições do painel todo. */
  public bindDragAndDrop(): void {
    this.arraste = { tipo: null, camadaId: null, feicaoId: null };
    this.vincularArrasteCamadas(this.shadow);
    this.vincularArrasteFeicoes(this.shadow);
  }

  /** Atualização incremental: liga renomear e arraste só nas linhas de feição novas dentro de `raiz`. */
  public bindLinhasFeicao(raiz: ParentNode): void {
    vincularRenomearInline(this.host, this.shadow, raiz);
    this.vincularArrasteFeicoes(raiz);
  }

  private vincularArrasteCamadas(raiz: ParentNode): void {
    // -------------------------------------------------------------
    // 1. Drag & Drop de Camadas (Reordenação de Z-Index e aninhamento)
    // -------------------------------------------------------------
    raiz.querySelectorAll('.ui-layer-row[draggable="true"]').forEach((linha) => {
      const camadaId = linha.getAttribute('data-layer-id');
      if (!camadaId) return;

      linha.addEventListener('dragstart', (e: Event) => {
        const de = e as DragEvent;
        if (this.arrasteBloqueado(de.target as HTMLElement)) {
          de.preventDefault();
          return;
        }
        this.arraste.tipo = 'layer';
        this.arraste.camadaId = camadaId;
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

        if (this.arraste.tipo === 'layer') {
          if (this.arraste.camadaId === camadaId) return;
          const rect = linha.getBoundingClientRect();
          const zona = zonaDeDropCamada((de.clientY - rect.top) / rect.height);
          linha.classList.toggle('drop-above', zona === 'acima');
          linha.classList.toggle('drop-below', zona === 'abaixo');
          // Zona central: soltar para dentro como subcamada
          linha.classList.toggle('drop-into', zona === 'dentro');
        } else if (this.arraste.tipo === 'feature') {
          const alvoCamada = this.host.camadas.find((c) => c.id === camadaId);
          if (alvoCamada?.parentId) {
            const rect = linha.getBoundingClientRect();
            const zona = rect.height > 0 ? zonaDeDropCamada((de.clientY - rect.top) / rect.height) : 'dentro';
            linha.classList.toggle('drop-above', zona === 'acima');
            linha.classList.toggle('drop-below', zona === 'abaixo');
            linha.classList.toggle('drop-into', zona === 'dentro');
          } else {
            linha.classList.remove('drop-above', 'drop-below');
            linha.classList.add('drop-into');
          }
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

        if (this.arraste.tipo === 'layer') {
          if (!this.arraste.camadaId || this.arraste.camadaId === camadaId) return;
          if (!this.host.camadas.some((l) => l.id === this.arraste.camadaId) || !this.host.camadas.some((l) => l.id === camadaId)) return;

          const resultado = moverCamada(this.host.camadas, this.arraste.camadaId, camadaId, zona);
          if (resultado && this.host.ordemFilhosPorPai) {
            sincronizarOrdemFilhosAposMoverCamada(
              this.host.camadas,
              this.host.feicoes,
              this.host.ordemFilhosPorPai,
              this.arraste.camadaId,
              camadaId,
              zona,
              resultado.parentAnteriorId,
              resultado.novoParentId
            );
          }
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
        } else if (this.arraste.tipo === 'feature') {
          if (!this.arraste.feicaoId) return;
          const alvoCamada = this.host.camadas.find((c) => c.id === camadaId);
          if (alvoCamada?.parentId && (zona === 'acima' || zona === 'abaixo')) {
            if (this.trocaEntreCamadasTravada(this.arraste.feicaoId, alvoCamada.parentId)) return;
            if (!this.host.ordemFilhosPorPai) return;
            const resultado = moverFeicaoEmRelacaoACamada(
              this.host.camadas,
              this.host.feicoes,
              this.host.ordemFilhosPorPai,
              this.arraste.feicaoId,
              camadaId,
              zona === 'acima'
            );
            if (!resultado) return;
            this.host.dispararEvento('ui-feicoes-reordenadas', { feicoes: [...this.host.feicoes] });
            if (resultado.mudouDeCamada) this.emitirFeicaoMovida(resultado);
            this.host.salvarLembrancaEstado?.();
            this.host.solicitarRenderizacao();
          } else {
            if (this.trocaEntreCamadasTravada(this.arraste.feicaoId, camadaId)) return;
            const movida = moverFeicaoParaCamada(this.host.feicoes, this.host.camadas, this.arraste.feicaoId, camadaId);
            if (movida) {
              if (this.host.ordemFilhosPorPai) {
                sincronizarOrdemFilhosAposMoverFeicao(
                  this.host.ordemFilhosPorPai,
                  movida.feicao.id,
                  movida.camadaOrigemId,
                  movida.camadaDestinoId
                );
              }
              this.emitirFeicaoMovida(movida);
              this.host.salvarLembrancaEstado?.();
              this.host.solicitarRenderizacao();
            }
          }
        }
      });

      linha.addEventListener('dragend', () => {
        this.arraste.tipo = null;
        this.arraste.camadaId = null;
        this.arraste.feicaoId = null;
        this.limparClassesDeArraste();
      });
    });
  }

  private vincularArrasteFeicoes(raiz: ParentNode): void {
    raiz.querySelectorAll('.ui-feat-row[draggable="true"]').forEach((linha) => {
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
        this.arraste.tipo = 'feature';
        this.arraste.feicaoId = feicaoId;
        this.arraste.camadaId = camadaDaFeicaoId;
        if (de.dataTransfer) {
          de.dataTransfer.setData('text/plain', JSON.stringify({ type: 'feature', id: feicaoId, layerId: camadaDaFeicaoId }));
          de.dataTransfer.effectAllowed = 'move';
        }
        linha.classList.add('dragging');
      });

      linha.addEventListener('dragover', (e: Event) => {
        const de = e as DragEvent;
        const ehFeicaoValida = this.arraste.tipo === 'feature' && this.arraste.feicaoId !== feicaoId;
        const ehCamadaValida =
          this.arraste.tipo === 'layer' &&
          !!this.arraste.camadaId &&
          !!camadaDaFeicaoId &&
          this.arraste.camadaId !== camadaDaFeicaoId &&
          !ehDescendente(this.host.camadas, camadaDaFeicaoId, this.arraste.camadaId);
        if (!ehFeicaoValida && !ehCamadaValida) return;

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
        const rect = linha.getBoundingClientRect();
        const acima = linha.classList.contains('drop-above')
          ? true
          : linha.classList.contains('drop-below')
            ? false
            : rect.height > 0 && de.clientY - rect.top < rect.height / 2;

        if (this.arraste.tipo === 'feature') {
          if (!this.arraste.feicaoId || this.arraste.feicaoId === feicaoId) return;
          de.preventDefault();
          de.stopPropagation();
          this.limparClassesDeArraste();

          if (this.trocaEntreCamadasTravada(this.arraste.feicaoId, camadaDaFeicaoId)) return;
          const resultado = reordenarFeicao(this.host.feicoes, this.arraste.feicaoId, feicaoId, acima);
          if (!resultado) return;
          if (this.host.ordemFilhosPorPai) {
            sincronizarOrdemFilhosAposReordenarFeicao(
              this.host.camadas,
              this.host.feicoes,
              this.host.ordemFilhosPorPai,
              this.arraste.feicaoId,
              feicaoId,
              acima,
              resultado.camadaOrigemId,
              resultado.camadaDestinoId
            );
          }
          // Emite reordenação antes da transferência para que ouvintes que sincronizam em ui-feicao-movida já tenham a posição
          this.host.dispararEvento('ui-feicoes-reordenadas', { feicoes: [...this.host.feicoes] });
          if (resultado.mudouDeCamada) this.emitirFeicaoMovida(resultado);
          this.host.salvarLembrancaEstado?.();
          this.host.solicitarRenderizacao();
        } else if (this.arraste.tipo === 'layer') {
          if (!this.arraste.camadaId || !camadaDaFeicaoId || !this.host.ordemFilhosPorPai) return;
          de.preventDefault();
          de.stopPropagation();
          this.limparClassesDeArraste();

          const resultado = moverCamadaEmRelacaoAFeicao(
            this.host.camadas,
            this.host.feicoes,
            this.host.ordemFilhosPorPai,
            this.arraste.camadaId,
            feicaoId,
            acima
          );
          if (!resultado) return;
          if (resultado.parentAnteriorId !== resultado.novoParentId && resultado.novoParentId) {
            this.host.expandedLayers?.add(resultado.novoParentId);
            this.host.dispararEvento('ui-camada-mover-hierarquia', {
              camadaId: resultado.camada.id,
              novoParentId: resultado.novoParentId,
              parentAnteriorId: resultado.parentAnteriorId,
              camada: resultado.camada
            });
          }
          this.aposReordenarCamadas();
        }
      });

      linha.addEventListener('dragend', (e: Event) => {
        e.stopPropagation();
        this.arraste.tipo = null;
        this.arraste.feicaoId = null;
        this.arraste.camadaId = null;
        this.limparClassesDeArraste();
      });
    });
  }

  /**
   * Suporte a arraste por toque e ponteiro no handle (.ui-col-drag) para tablets e mobile.
   * Suporta tanto reordenação (acima/abaixo) quanto aninhamento hierárquico (drop-into),
   * mantendo paridade total com o Drag & Drop HTML5.
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
        let zonaAtual: ZonaDrop = 'abaixo';

        const aoMover = (me: PointerEvent): void => {
          me.preventDefault();
          linhaOrigem.classList.add('dragging');

          const sob = this.shadow.elementFromPoint(me.clientX, me.clientY) as HTMLElement | null;
          const alvo = sob ? (sob.closest('.ui-layer-row, .ui-feat-row') as HTMLElement | null) : null;

          if (linhaAlvo && linhaAlvo !== alvo) {
            linhaAlvo.classList.remove('drop-above', 'drop-below', 'drop-into');
          }

          if (alvo && alvo !== linhaOrigem) {
            const ehFeicao = alvo.classList.contains('ui-feat-row');
            if (ehFeicao) {
              const camadaAlvo = alvo.getAttribute('data-feat-layer');
              if (!camadaAlvo || camadaAlvo === camadaId || ehDescendente(this.host.camadas, camadaAlvo, camadaId)) {
                linhaAlvo = null;
                return;
              }
              linhaAlvo = alvo;
              const rect = alvo.getBoundingClientRect();
              const acima = rect.height > 0 && me.clientY - rect.top < rect.height / 2;
              zonaAtual = acima ? 'acima' : 'abaixo';
              alvo.classList.toggle('drop-above', acima);
              alvo.classList.toggle('drop-below', !acima);
              alvo.classList.remove('drop-into');
            } else {
              linhaAlvo = alvo;
              const rect = alvo.getBoundingClientRect();
              zonaAtual = rect.height > 0 ? zonaDeDropCamada((me.clientY - rect.top) / rect.height) : 'abaixo';
              alvo.classList.toggle('drop-above', zonaAtual === 'acima');
              alvo.classList.toggle('drop-below', zonaAtual === 'abaixo');
              alvo.classList.toggle('drop-into', zonaAtual === 'dentro');
            }
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
          const alvoCamadaId = linhaAlvo?.getAttribute('data-layer-id');
          const alvoFeicaoId = linhaAlvo?.getAttribute('data-feat-row');
          this.limparClassesDeArraste();

          if (alvoFeicaoId && this.host.ordemFilhosPorPai) {
            const resultado = moverCamadaEmRelacaoAFeicao(
              this.host.camadas,
              this.host.feicoes,
              this.host.ordemFilhosPorPai,
              camadaId,
              alvoFeicaoId,
              zonaAtual === 'acima'
            );
            if (!resultado) return;
            if (resultado.parentAnteriorId !== resultado.novoParentId && resultado.novoParentId) {
              this.host.expandedLayers?.add(resultado.novoParentId);
              this.host.dispararEvento('ui-camada-mover-hierarquia', {
                camadaId: resultado.camada.id,
                novoParentId: resultado.novoParentId,
                parentAnteriorId: resultado.parentAnteriorId,
                camada: resultado.camada
              });
            }
            this.aposReordenarCamadas();
            return;
          }

          if (!alvoCamadaId || alvoCamadaId === camadaId) return;
          const resultado = moverCamada(this.host.camadas, camadaId, alvoCamadaId, zonaAtual);
          if (!resultado) return;
          if (this.host.ordemFilhosPorPai) {
            sincronizarOrdemFilhosAposMoverCamada(
              this.host.camadas,
              this.host.feicoes,
              this.host.ordemFilhosPorPai,
              camadaId,
              alvoCamadaId,
              zonaAtual,
              resultado.parentAnteriorId,
              resultado.novoParentId
            );
          }
          if (resultado.tipo === 'hierarquia') {
            this.host.expandedLayers?.add(resultado.novoParentId);
            this.host.dispararEvento('ui-camada-mover-hierarquia', {
              camadaId: resultado.camada.id,
              novoParentId: resultado.novoParentId,
              parentAnteriorId: resultado.parentAnteriorId,
              camada: resultado.camada
            });
          } else if (resultado.parentAnteriorId !== resultado.novoParentId) {
            this.host.dispararEvento('ui-camada-mover-hierarquia', {
              camadaId: resultado.camada.id,
              novoParentId: resultado.novoParentId,
              parentAnteriorId: resultado.parentAnteriorId,
              camada: resultado.camada
            });
          }
          this.aposReordenarCamadas();
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
