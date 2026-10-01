import L from 'leaflet';
import type { Ponto } from './types';
import type { CanvasLayerManager } from './layer_manager';
import { CanvasSelecaoBox, CAD_INTERACTIVE_PANES } from './canvas_selecao_box';

export { CAD_INTERACTIVE_PANES };

export interface CanvasInteracaoContext {
  mapaController?: any;
  layerManager?: CanvasLayerManager;
  selectedPontoIds: number[];
  selectedVizinhoPontoIds: number[];
  lastSelectedPontoId: number | null;
  pontosList?: Ponto[];
  containerHost?: HTMLElement | ShadowRoot;
  atualizarDestaqueLinhasTabela?: () => void;
  onSelectionChange?: (selectedIds: number[], selectedVizinhoIds: number[]) => void;
}

/**
 * Controlador de Interações do Canvas AutoCAD-like para o Leaflet
 * 
 * Funcionalidades CAD:
 *  - Pan Dinâmico: Botão do Meio (Scroll Wheel Drag) com cursor grabbing
 *  - Zoom Extents: Duplo clique na rodinha do mouse (<300ms)
 *  - Janelas de Seleção:
 *      * Window Selection (Esquerda -> Direita, Azul #06b6d4): seleciona 100% contidos
 *      * Crossing Selection (Direita -> Esquerda, Verde #10b981): seleciona interceptados
 *  - Snapping e Seleção Filtrada: Apenas camadas ativas, visíveis e desbloqueadas
 *  - Teclado: Tecla ESC limpa a seleção; tecla Ctrl/Cmd ativa seleção aditiva múltipla
 */
export class CanvasInteracao {
  public ctx: CanvasInteracaoContext;
  private map: L.Map | null = null;
  private mapContainer: HTMLElement | null = null;
  private selecaoBox: CanvasSelecaoBox | null = null;

  // Estados de Pan (Rodinha)
  private isPanning: boolean = false;
  private lastMousePos = { x: 0, y: 0 };
  private lastMiddleClickTime: number = 0;

  // Estados de Toque (Mobile/Tablet)
  private touchStartPos = { x: 0, y: 0 };
  private touchStartDist = 0;
  private isTouchPanning: boolean = false;

  public selectionHappened: boolean = false;
  public panHappened: boolean = false;

  constructor(ctx?: Partial<CanvasInteracaoContext>) {
    this.ctx = {
      selectedPontoIds: [],
      selectedVizinhoPontoIds: [],
      lastSelectedPontoId: null,
      pontosList: [],
      ...ctx
    };
  }

  public ativar(mapaController: any, containerHost?: HTMLElement | ShadowRoot): void {
    this.ctx.mapaController = mapaController;
    if (containerHost) this.ctx.containerHost = containerHost;

    this.map = mapaController.getMap();
    if (!this.map) return;

    this.mapContainer = this.map.getContainer();
    if (!this.mapContainer) return;

    this.map.dragging.disable();
    this.map.doubleClickZoom.disable();

    this.selecaoBox = new CanvasSelecaoBox(this.map, this.mapContainer, this.ctx);

    this.mapContainer.addEventListener('mousedown', this.handleMouseDown);
    this.mapContainer.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.mapContainer.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('keydown', this.handleKeyDown);

    this.mapContainer.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.mapContainer.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.mapContainer.addEventListener('touchend', this.handleTouchEnd);
    this.mapContainer.addEventListener('touchcancel', this.handleTouchEnd);
  }

  public desativar(): void {
    if (this.mapContainer) {
      this.mapContainer.removeEventListener('mousedown', this.handleMouseDown);
      this.mapContainer.removeEventListener('mousemove', this.handleMouseMove);
      this.mapContainer.removeEventListener('contextmenu', this.handleContextMenu);
      this.mapContainer.removeEventListener('touchstart', this.handleTouchStart);
      this.mapContainer.removeEventListener('touchmove', this.handleTouchMove);
      this.mapContainer.removeEventListener('touchend', this.handleTouchEnd);
      this.mapContainer.removeEventListener('touchcancel', this.handleTouchEnd);
    }
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('keydown', this.handleKeyDown);

    if (this.selecaoBox) {
      this.selecaoBox.destruir();
      this.selecaoBox = null;
    }

    if (this.map) {
      this.map.dragging.enable();
      this.map.doubleClickZoom.enable();
    }
  }

  private handleTouchStart = (e: TouchEvent): void => {
    if (!this.map || !this.mapContainer) return;
    if (e.touches.length === 1) {
      this.isTouchPanning = true;
      this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.isTouchPanning = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchStartDist = Math.hypot(dx, dy);
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.map || !this.mapContainer) return;
    if (e.touches.length === 1 && this.isTouchPanning) {
      e.preventDefault();
      this.panHappened = true;
      const dx = this.touchStartPos.x - e.touches[0].clientX;
      const dy = this.touchStartPos.y - e.touches[0].clientY;
      this.map.panBy([dx, dy], { animate: false });
      this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && this.touchStartDist > 0) {
      e.preventDefault();
      this.panHappened = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dist - this.touchStartDist) > 25) {
        if (dist > this.touchStartDist) {
          this.map.zoomIn(1);
        } else {
          this.map.zoomOut(1);
        }
        this.touchStartDist = dist;
      }
    }
  };

  private handleTouchEnd = (): void => {
    this.isTouchPanning = false;
    this.touchStartDist = 0;
    setTimeout(() => {
      this.panHappened = false;
    }, 120);
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (!this.map || !this.mapContainer) return;

    if (e.button === 1) {
      e.preventDefault();
      const agora = Date.now();
      if (agora - this.lastMiddleClickTime < 300) {
        this.zoomExtents();
        return;
      }
      this.lastMiddleClickTime = agora;

      this.isPanning = true;
      this.panHappened = false;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.mapContainer.style.cursor = 'grabbing';
      return;
    }

    if (e.button === 0) {
      this.selectionHappened = false;
      if (this.ctx.mapaController && this.ctx.mapaController.modoCliqueSequencialAtivo) {
        return;
      }
      this.selecaoBox?.iniciarSelecao(e);
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.map || !this.mapContainer) return;

    if (this.isPanning) {
      const dx = this.lastMousePos.x - e.clientX;
      const dy = this.lastMousePos.y - e.clientY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        this.panHappened = true;
      }
      this.map.panBy([dx, dy], { animate: false });
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      return;
    }

    this.selecaoBox?.atualizarSelecao(e);
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (this.isPanning) {
      this.isPanning = false;
      if (this.mapContainer) {
        this.mapContainer.style.cursor = 'grab';
      }
      setTimeout(() => {
        this.panHappened = false;
      }, 120);
    }

    if (this.selecaoBox && this.selecaoBox.isSelecting) {
      const selecionou = this.selecaoBox.finalizarSelecao(
        e,
        () => this.notificarSelecao(),
        () => this.limparSelecao()
      );
      if (selecionou) {
        this.selectionHappened = true;
        setTimeout(() => {
          this.selectionHappened = false;
        }, 120);
      }
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || (activeEl as HTMLElement).isContentEditable)) {
        return;
      }
      this.selecaoBox?.cancelarSelecao();
      this.limparSelecao();
    }
  };

  public limparSelecao(): void {
    if (this.ctx.selectedPontoIds.length > 0 || this.ctx.selectedVizinhoPontoIds.length > 0) {
      this.ctx.selectedPontoIds = [];
      this.ctx.selectedVizinhoPontoIds = [];
      this.ctx.lastSelectedPontoId = null;
      this.notificarSelecao();
    }
  }

  private notificarSelecao(): void {
    if (this.ctx.atualizarDestaqueLinhasTabela) {
      this.ctx.atualizarDestaqueLinhasTabela();
    }
    if (this.ctx.onSelectionChange) {
      this.ctx.onSelectionChange(this.ctx.selectedPontoIds, this.ctx.selectedVizinhoPontoIds);
    }
    window.dispatchEvent(new CustomEvent('gerencigeo:ponto-selecionado', {
      detail: {
        selectedPontoIds: this.ctx.selectedPontoIds,
        selectedVizinhoPontoIds: this.ctx.selectedVizinhoPontoIds,
        lastSelectedPontoId: this.ctx.lastSelectedPontoId
      }
    }));
  }

  public zoomExtents(): void {
    if (!this.ctx.pontosList || this.ctx.pontosList.length === 0) return;
    const pontosMat = this.ctx.pontosList.filter((p: any) => p.tipo_ponto !== 'B' && p.tipo !== 'B');
    if (pontosMat.length > 0 && this.ctx.mapaController) {
      this.ctx.mapaController.fitBounds(pontosMat);
    }
  }

  public destroy(): void {
    this.desativar();
  }
}
