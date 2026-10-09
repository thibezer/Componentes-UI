import L from 'leaflet';
import type { CanvasInteracaoContext } from './canvas_interacao';

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

export class CanvasSelecaoBox {
  private map: L.Map;
  private mapContainer: HTMLElement;
  private ctx: CanvasInteracaoContext;
  private selectionDiv: HTMLDivElement | null = null;
  public isSelecting: boolean = false;
  public selectStartPos = { x: 0, y: 0 };
  public selectStartPoint: L.Point | null = null;

  constructor(map: L.Map, mapContainer: HTMLElement, ctx: CanvasInteracaoContext) {
    this.map = map;
    this.mapContainer = mapContainer;
    this.ctx = ctx;
    this.criarDivSelecao();
  }

  private criarDivSelecao(): void {
    if (!this.selectionDiv) {
      this.selectionDiv = document.createElement('div');
      this.selectionDiv.className = 'cad-selection-box';
      this.selectionDiv.style.position = 'absolute';
      this.selectionDiv.style.zIndex = '9999';
      this.selectionDiv.style.pointerEvents = 'none';
      this.selectionDiv.style.display = 'none';
      this.selectionDiv.style.borderRadius = '2px';

      this.mapContainer.style.position = 'relative';
      this.mapContainer.appendChild(this.selectionDiv);
    }
  }

  public setPanesPointerEvents(value: 'auto' | 'none'): void {
    CAD_INTERACTIVE_PANES.forEach(p => {
      const paneEl = this.map.getPane(p);
      if (paneEl) {
        paneEl.style.pointerEvents = value;
      }
    });
  }

  public iniciarSelecao(e: MouseEvent): void {
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

    this.setPanesPointerEvents('none');
  }

  public atualizarSelecao(e: MouseEvent): void {
    if (!this.isSelecting || !this.selectionDiv) return;

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

  public finalizarSelecao(e: MouseEvent, onNotificar: () => void, onLimpar: () => void): boolean {
    if (!this.isSelecting) return false;
    this.isSelecting = false;

    if (this.selectionDiv) {
      this.selectionDiv.style.display = 'none';
    }

    this.map.closePopup();
    // O click pós-arrasto é engolido por CanvasInteracao (listener de captura), então os panes
    // podem voltar a receber eventos já aqui, sem timer.
    try {
      this.setPanesPointerEvents('auto');
      this.ctx.layerManager?.ensurePanes();
    } catch {}

    const rectBounds = this.mapContainer.getBoundingClientRect();
    const currentX = e.clientX - rectBounds.left;
    const currentY = e.clientY - rectBounds.top;

    const endPoint = this.map.mouseEventToContainerPoint(e);
    const width = Math.abs(currentX - this.selectStartPos.x);
    const height = Math.abs(currentY - this.selectStartPos.y);

    // Clique curto no vazio -> limpa seleção
    if (width < 4 && height < 4) {
      const target = e.target as HTMLElement;
      if (target && (target.classList?.contains('leaflet-container') || target.id === 'mapa-triagem' || target.closest?.('.leaflet-pane'))) {
        const clicouNoMarcador = target.closest?.('.custom-leaflet-marker') || target.closest?.('.custom-div-icon');
        if (!clicouNoMarcador) {
          onLimpar();
        }
      }
      return false;
    }

    if (!this.selectStartPoint) return false;

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

    const canSelectMain = !this.ctx.layerManager || this.ctx.layerManager.isLayerActiveAndSelectable('vertices');
    const canSelectVizinhos = !this.ctx.layerManager || this.ctx.layerManager.isLayerActiveAndSelectable('vizinhos');

    if (canSelectMain) {
      markers.forEach(m => {
        const pId = (m as any).pontoId;
        if (!pId) return;

        const mPos = this.map.latLngToContainerPoint(m.getLatLng());
        const inside = mPos.x >= rect.x1 && mPos.x <= rect.x2 && mPos.y >= rect.y1 && mPos.y <= rect.y2;
        if (inside) selectedIds.push(pId);
      });
    }

    if (canSelectVizinhos) {
      vizinhosMarkers.forEach(m => {
        const pId = (m as any).pontoId;
        if (!pId) return;

        const mPos = this.map.latLngToContainerPoint(m.getLatLng());
        const inside = mPos.x >= rect.x1 && mPos.x <= rect.x2 && mPos.y >= rect.y1 && mPos.y <= rect.y2;
        if (inside) selectedVizinhoIds.push(pId);
      });
    }

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

    onNotificar();
    return true;
  }

  public cancelarSelecao(): void {
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
  }

  public destruir(): void {
    if (this.selectionDiv && this.selectionDiv.parentNode) {
      this.selectionDiv.parentNode.removeChild(this.selectionDiv);
      this.selectionDiv = null;
    }
    this.setPanesPointerEvents('auto');
  }
}
