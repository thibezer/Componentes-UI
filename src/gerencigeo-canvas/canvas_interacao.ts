import L from 'leaflet';
import type { Ponto } from './types';
import type { CanvasLayerManager } from './layer_manager';

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
 * Lista unificada de panes interativos do CAD (cobre arquitetura legada e nova)
 */
export const CAD_INTERACTIVE_PANES = [
  'verticesPane',
  'perimetroPane',
  'overlayPane',
  'markerPane',
  'pane-vertices',
  'pane-perimetro',
  'pane-vizinhos',
  'pane-homologados',
  'pane-homologados-pontos'
];

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
  
  // Estados de Pan (Rodinha)
  private isPanning: boolean = false;
  private lastMousePos = { x: 0, y: 0 };
  
  // Estados de Seleção (Clique Esquerdo)
  private isSelecting: boolean = false;
  private selectStartPos = { x: 0, y: 0 };
  private selectStartPoint: L.Point | null = null;
  private selectionDiv: HTMLDivElement | null = null;
  
  // Tempo do último clique do botão do meio
  private lastMiddleClickTime: number = 0;

  // Estados de Toque (Mobile/Tablet)
  private touchStartPos = { x: 0, y: 0 };
  private touchStartDist = 0;
  private isTouchPanning: boolean = false;

  // Sinaliza que uma caixa de seleção foi arrastada
  public selectionHappened: boolean = false;
  // Sinaliza que uma operação de pan ocorreu
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

    // Desativa comportamentos padrão de arrasto com botão esquerdo para Pan
    this.map.dragging.disable();
    this.map.doubleClickZoom.disable();

    // Cria elemento da caixa de seleção relativo ao container
    if (!this.selectionDiv) {
      this.selectionDiv = document.createElement('div');
      this.selectionDiv.className = 'cad-selection-box';
      this.selectionDiv.style.position = 'absolute';
      this.selectionDiv.style.zIndex = '9999';
      this.selectionDiv.style.pointerEvents = 'none';
      this.selectionDiv.style.display = 'none';
      this.selectionDiv.style.borderRadius = '2px';
      
      const parent = this.mapContainer;
      parent.style.position = 'relative';
      parent.appendChild(this.selectionDiv);
    }

    // Registra listeners de eventos do mouse
    this.mapContainer.addEventListener('mousedown', this.handleMouseDown);
    this.mapContainer.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.mapContainer.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('keydown', this.handleKeyDown);

    // Registra listeners de touch para dispositivos móveis e tablets
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

    if (this.selectionDiv && this.selectionDiv.parentNode) {
      this.selectionDiv.parentNode.removeChild(this.selectionDiv);
      this.selectionDiv = null;
    }
    
    if (this.map) {
      this.map.dragging.enable();
      this.map.doubleClickZoom.enable();
    }

    this.setPanesPointerEvents('auto');
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

  private setPanesPointerEvents(value: 'auto' | 'none'): void {
    if (!this.map) return;
    CAD_INTERACTIVE_PANES.forEach(p => {
      const paneEl = this.map?.getPane(p);
      if (paneEl) {
        paneEl.style.pointerEvents = value;
      }
    });
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (!this.map || !this.mapContainer) return;

    // 1. Botão do Meio (Scroll Wheel Drag) -> Pan do AutoCAD
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

    // 2. Botão Esquerdo -> Janela de Seleção CAD
    if (e.button === 0) {
      this.selectionHappened = false;
      if (this.ctx.mapaController && this.ctx.mapaController.modoCliqueSequencialAtivo) {
        return;
      }

      const rect = this.mapContainer.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      this.isSelecting = true;
      this.selectStartPos = { x: localX, y: localY };
      this.selectStartPoint = this.map.mouseEventToContainerPoint(e);
      
      if (this.selectionDiv) {
        this.selectionDiv.style.left = `${localX}px`;
        this.selectionDiv.style.top = `${localY}px`;
        this.selectionDiv.style.width = '0px';
        this.selectionDiv.style.height = '0px';
        this.selectionDiv.style.display = 'block';
      }

      // Supressão de clicks em panes durante o arrasto
      this.setPanesPointerEvents('none');
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.map || !this.mapContainer) return;

    // Executa Pan
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

    // Atualiza retângulo de seleção
    if (this.isSelecting && this.selectionDiv) {
      const rect = this.mapContainer.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const width = Math.abs(currentX - this.selectStartPos.x);
      const height = Math.abs(currentY - this.selectStartPos.y);
      const left = Math.min(currentX, this.selectStartPos.x);
      const top = Math.min(currentY, this.selectStartPos.y);

      this.selectionDiv.style.left = `${Math.round(left)}px`;
      this.selectionDiv.style.top = `${Math.round(top)}px`;
      this.selectionDiv.style.width = `${Math.round(width)}px`;
      this.selectionDiv.style.height = `${Math.round(height)}px`;

      // Direção do arrasto:
      if (currentX >= this.selectStartPos.x) {
        // Window Selection (Esquerda -> Direita): Azul Sólida
        this.selectionDiv.style.background = 'rgba(14, 116, 144, 0.22)'; 
        this.selectionDiv.style.border = '1px solid #06b6d4'; 
      } else {
        // Crossing Selection (Direita -> Esquerda): Verde Tracejada
        this.selectionDiv.style.background = 'rgba(16, 185, 129, 0.22)'; 
        this.selectionDiv.style.border = '1px dashed #10b981'; 
      }
    }
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

    if (this.isSelecting) {
      this.isSelecting = false;
      if (this.selectionDiv) {
        this.selectionDiv.style.display = 'none';
      }

      if (!this.map || !this.mapContainer) return;

      this.map.closePopup();
      setTimeout(() => {
        try {
          this.setPanesPointerEvents('auto');
          if (this.ctx.layerManager) {
            this.ctx.layerManager.ensurePanes();
          }
        } catch (e) {}
      }, 80);

      const rectBounds = this.mapContainer.getBoundingClientRect();
      const currentX = e.clientX - rectBounds.left;
      const currentY = e.clientY - rectBounds.top;

      const endPoint = this.map.mouseEventToContainerPoint(e);
      const width = Math.abs(currentX - this.selectStartPos.x);
      const height = Math.abs(currentY - this.selectStartPos.y);

      // Clique curto no vazio -> limpa seleção
      if (width < 4 && height < 4) {
        this.selectionHappened = false;
        const target = e.target as HTMLElement;
        if (target && (target.classList?.contains('leaflet-container') || target.id === 'mapa-triagem' || target.closest?.('.leaflet-pane'))) {
          const clicouNoMarcador = target.closest?.('.custom-leaflet-marker') || target.closest?.('.custom-div-icon');
          if (!clicouNoMarcador) {
            this.limparSelecao();
          }
        }
        return;
      }

      if (!this.selectStartPoint) {
        return;
      }

      this.selectionHappened = true;
      setTimeout(() => {
        this.selectionHappened = false;
      }, 120);

      const rect = {
        x1: Math.min(this.selectStartPoint.x, endPoint.x),
        y1: Math.min(this.selectStartPoint.y, endPoint.y),
        x2: Math.max(this.selectStartPoint.x, endPoint.x),
        y2: Math.max(this.selectStartPoint.y, endPoint.y)
      };

      const markers = (this.ctx.mapaController?.getMarkers() || []) as L.Marker[];
      const vizinhosMarkers = (this.ctx.mapaController?.getVizinhosMarkers() || []) as L.Marker[];
      
      const selectedIds: number[] = [];
      const selectedVizinhoIds: number[] = [];

      // Filtra apenas camadas ativas e interativas
      const canSelectMain = !this.ctx.layerManager || this.ctx.layerManager.isLayerActiveAndSelectable('vertices');
      const canSelectVizinhos = !this.ctx.layerManager || this.ctx.layerManager.isLayerActiveAndSelectable('vizinhos');

      if (canSelectMain) {
        markers.forEach(m => {
          const pId = (m as any).pontoId;
          if (!pId) return;

          const mPos = this.map!.latLngToContainerPoint(m.getLatLng());
          const inside = mPos.x >= rect.x1 && mPos.x <= rect.x2 && mPos.y >= rect.y1 && mPos.y <= rect.y2;
          if (inside) selectedIds.push(pId);
        });
      }

      if (canSelectVizinhos) {
        vizinhosMarkers.forEach(m => {
          const pId = (m as any).pontoId;
          if (!pId) return;

          const mPos = this.map!.latLngToContainerPoint(m.getLatLng());
          const inside = mPos.x >= rect.x1 && mPos.x <= rect.x2 && mPos.y >= rect.y1 && mPos.y <= rect.y2;
          if (inside) selectedVizinhoIds.push(pId);
        });
      }

      // Aplica seleção (Ctrl/Cmd aditivo)
      if (e.ctrlKey || e.metaKey) {
        selectedIds.forEach(id => {
          if (this.ctx.selectedPontoIds.includes(id)) {
            this.ctx.selectedPontoIds = this.ctx.selectedPontoIds.filter((sid: number) => sid !== id);
          } else {
            this.ctx.selectedPontoIds.push(id);
          }
        });
        
        selectedVizinhoIds.forEach(id => {
          if (this.ctx.selectedVizinhoPontoIds.includes(id)) {
            this.ctx.selectedVizinhoPontoIds = this.ctx.selectedVizinhoPontoIds.filter((sid: number) => sid !== id);
          } else {
            this.ctx.selectedVizinhoPontoIds.push(id);
          }
        });
      } else {
        this.ctx.selectedPontoIds = selectedIds;
        this.ctx.selectedVizinhoPontoIds = selectedVizinhoIds;
      }

      if (this.ctx.selectedPontoIds.length > 0) {
        this.ctx.lastSelectedPontoId = this.ctx.selectedPontoIds[this.ctx.selectedPontoIds.length - 1];
      }

      this.notificarSelecao();
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || (activeEl as HTMLElement).isContentEditable)) {
        return; // Não interfere enquanto o usuário digita em campos de texto
      }
      if (this.isSelecting) {
        this.isSelecting = false;
        if (this.selectionDiv) {
          this.selectionDiv.style.display = 'none';
        }
        this.setPanesPointerEvents('auto');
        if (this.ctx.layerManager) {
          this.ctx.layerManager.ensurePanes();
        }
      }
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
