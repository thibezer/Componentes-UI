import { ListenerBag } from '../../core/listener-bag';

export interface ContextoToolbarPainel {
  shadow: ShadowRoot;
  mapContainer: HTMLDivElement | null;
  layersPanel: HTMLDivElement | null;
  onToggleCamadas?: () => void;
  onCloseCamadas?: () => void;
  onZoomExtents?: () => void;
  onLimparSelecao?: () => void;
  onTratarCliqueCanvas?: (e: MouseEvent) => void;
  onDispararAcaoPopup?: (acaoId: string, elementoId: string | number) => void;
}

/**
 * Gerencia a interação da interface com a barra de ferramentas rápida,
 * painel retrátil de camadas e detecção de clique versus pan no container do mapa.
 */
export class GerenciadorToolbarPainel {
  private contexto: ContextoToolbarPainel;
  private uiListeners = new ListenerBag();
  private isLayersPanelOpen: boolean = false;
  private mouseMovedSinceDown: boolean = false;
  private mouseDownPos = { x: 0, y: 0 };

  constructor(contexto: ContextoToolbarPainel) {
    this.contexto = contexto;
  }

  public get estaPainelAberto(): boolean {
    return this.isLayersPanelOpen;
  }

  public get houveMovimentoMouse(): boolean {
    return this.mouseMovedSinceDown;
  }

  public toggleLayersPanel(): void {
    this.isLayersPanelOpen = !this.isLayersPanelOpen;
    if (this.contexto.layersPanel) {
      if (this.isLayersPanelOpen) {
        this.contexto.layersPanel.classList.remove('collapsed');
      } else {
        this.contexto.layersPanel.classList.add('collapsed');
      }
    }
    const btn = this.contexto.shadow.getElementById('btn-toggle-layers');
    btn?.classList.toggle('active', this.isLayersPanelOpen);
  }

  public closeLayersPanel(): void {
    this.isLayersPanelOpen = false;
    this.contexto.layersPanel?.classList.add('collapsed');
    const btn = this.contexto.shadow.getElementById('btn-toggle-layers');
    btn?.classList.remove('active');
  }

  public vincularEventos(): void {
    this.uiListeners.cleanup();

    const btnToggleLayers = this.contexto.shadow.getElementById('btn-toggle-layers');
    const btnCloseLayers = this.contexto.shadow.getElementById('btn-close-layers');
    const btnZoomExtents = this.contexto.shadow.getElementById('btn-zoom-extents');
    const btnClearSelection = this.contexto.shadow.getElementById('btn-clear-selection');

    this.uiListeners.add(btnToggleLayers, 'click', () => {
      if (this.contexto.onToggleCamadas) {
        this.contexto.onToggleCamadas();
      } else {
        this.toggleLayersPanel();
      }
    });

    this.uiListeners.add(btnCloseLayers, 'click', () => {
      if (this.contexto.onCloseCamadas) {
        this.contexto.onCloseCamadas();
      } else {
        this.closeLayersPanel();
      }
    });

    this.uiListeners.add(btnZoomExtents, 'click', () => {
      this.contexto.onZoomExtents?.();
    });

    this.uiListeners.add(btnClearSelection, 'click', () => {
      this.contexto.onLimparSelecao?.();
    });

    // Monitora mousedown/mousemove no mapContainer para filtrar arraste/pan vs clique
    if (this.contexto.mapContainer) {
      this.uiListeners.add(this.contexto.mapContainer, 'mousedown', (e: MouseEvent) => {
        if (e.button === 0) {
          this.mouseDownPos = { x: e.clientX, y: e.clientY };
          this.mouseMovedSinceDown = false;
        }
      });

      this.uiListeners.add(this.contexto.mapContainer, 'mousemove', (e: MouseEvent) => {
        if (Math.hypot(e.clientX - this.mouseDownPos.x, e.clientY - this.mouseDownPos.y) >= 4) {
          this.mouseMovedSinceDown = true;
        }
      });

      this.uiListeners.add(this.contexto.mapContainer, 'click', (e: MouseEvent) => {
        if (e.button !== 0) return;
        if (this.mouseMovedSinceDown) return;
        this.contexto.onTratarCliqueCanvas?.(e);
      });
    }

    // Intercepta cliques delegados nos botões de ação do popup
    this.uiListeners.add(this.contexto.shadow, 'click', (evt: Event) => {
      const target = (evt.composedPath ? evt.composedPath()[0] : evt.target) as HTMLElement | null;
      const btn = target?.closest?.('.ui-popup-btn') as HTMLElement | null;
      if (btn) {
        evt.preventDefault();
        evt.stopPropagation();
        const acaoId = btn.getAttribute('data-acao-id');
        const elementoId = btn.getAttribute('data-elemento-id');
        if (acaoId && elementoId !== null) {
          this.contexto.onDispararAcaoPopup?.(acaoId, elementoId);
        }
      }
    });
  }

  public limpar(): void {
    this.uiListeners.cleanup();
  }
}
