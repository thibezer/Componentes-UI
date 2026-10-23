import { focoEmCampoDeTexto } from '../core/alvo-digitavel';
import L from 'leaflet';
import type { Ponto } from './types';
import type { CanvasLayerManager } from './layer_manager';
import { CanvasSelecaoBox, CAD_INTERACTIVE_PANES } from './canvas_selecao_box';
import { garantirCanvasSemEventos, resolverCliqueCentral } from './layer_hit_test';

export { CAD_INTERACTIVE_PANES };

/** Alças do editor de vértices e HUDs: o mouse e o toque que começam neles não iniciam seleção por caixa nem pan. */
const SELETOR_TOQUE_PROPRIO = '.cad-vertex-handle, .cad-vertex-ghost, .cad-bezier-handle, #cm-vertex-edit-hud, #cm-draw-hud';

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
  /** Chamado ao limpar a seleção (Esc, clique no vazio) para limpar também as feições genéricas. */
  aoLimparSelecao?: () => void;
  /** Há uma ferramenta de desenho ativa: cliques e arrastos do mouse são dela, não da seleção. */
  ferramentaAtiva?: () => boolean;
  /** Há uma feição em edição de vértices: clique e caixa de seleção não mexem na seleção (só Esc/Concluir saem). */
  edicaoAtiva?: () => boolean;
  /** Botão direito sobre o mapa (o menu nativo é sempre suprimido). */
  aoMenuContexto?: (e: MouseEvent) => void;
  /** Seleção por caixa sobre feições genéricas; `aditivo` = Ctrl/Cmd. */
  selecionarFeicoesNaCaixa?: (caixa: { x1: number; y1: number; x2: number; y2: number }, modo: 'window' | 'crossing', aditivo: boolean) => void;
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
  private isTouchPanning: boolean = false;

  private removerSupressao: (() => void) | null = null;
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
    // Shift+arrasto é do CAD (alça livre, seleção aditiva): nunca pode virar zoom em caixa do Leaflet
    this.map.boxZoom.disable();

    this.selecaoBox = new CanvasSelecaoBox(this.map, this.mapContainer, this.ctx);

    garantirCanvasSemEventos(this.mapContainer);
    this.mapContainer.addEventListener('click', this.handleClick);
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
      this.mapContainer.removeEventListener('click', this.handleClick);
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
    this.cancelarSupressaoClique();

    if (this.selecaoBox) {
      this.selecaoBox.destruir();
      this.selecaoBox = null;
    }

    if (this.map) {
      this.map.dragging.enable();
      this.map.doubleClickZoom.enable();
      this.map.boxZoom.enable();
    }
  }

  private handleTouchStart = (e: TouchEvent): void => {
    if (!this.map || !this.mapContainer) return;
    if (e.touches.length === 1) {
      // alças de edição e HUDs tratam o próprio toque: arrastar um nó (ou o ponto médio) não move o mapa junto
      if ((e.target as HTMLElement | null)?.closest?.(SELETOR_TOQUE_PROPRIO)) {
        this.isTouchPanning = false;
        return;
      }
      this.isTouchPanning = true;
      this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      // pinça e pan de dois dedos são do `touchZoom` do Leaflet (suave, em torno do centro dos dedos)
      this.isTouchPanning = false;
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
    } else if (e.touches.length === 2) {
      // sem preventDefault e sem zoom próprio: antes o tratador daqui e o do Leaflet davam zoom os dois, e em passos de 1 nível
      this.panHappened = true;
    }
  };

  private handleTouchEnd = (): void => {
    this.isTouchPanning = false;
    setTimeout(() => {
      this.panHappened = false;
    }, 120);
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    this.ctx.aoMenuContexto?.(e);
  };

  private handleClick = (e: MouseEvent): void => {
    if (!this.map || !this.ctx.layerManager) return;
    if (this.ctx.ferramentaAtiva?.() || this.ctx.edicaoAtiva?.()) return;
    // marcador DOM (ícone/texto): o Leaflet já entregou o clique a ele; não repassa às feições do canvas por baixo
    if ((e.target as HTMLElement | null)?.closest?.('.leaflet-marker-icon')) return;
    resolverCliqueCentral(this.map, this.ctx.layerManager.getLayers(), e);
  };

  /** Engole o `click` que o navegador dispara logo após soltar o botão de uma seleção por caixa. */
  private suprimirProximoClique(): void {
    this.cancelarSupressaoClique();
    this.removerSupressao = () => window.removeEventListener('click', engolir, true);
    const engolir = (ev: Event): void => {
      ev.stopImmediatePropagation();
      ev.preventDefault();
      this.cancelarSupressaoClique();
    };
    window.addEventListener('click', engolir, true);
  }

  private cancelarSupressaoClique(): void {
    this.removerSupressao?.();
    this.removerSupressao = null;
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (!this.map || !this.mapContainer) return;
    // se o click da seleção anterior nunca chegou (soltou fora da janela), não engole o próximo
    this.cancelarSupressaoClique();

    if (e.button === 1) {
      e.preventDefault();
      // Só um clique limpo anterior (sem arraste, registrado ao soltar) forma o duplo clique;
      // dois arrastes seguidos são pan, não um pedido de "zoom extents"
      if (Date.now() - this.lastMiddleClickTime < 300) {
        this.lastMiddleClickTime = 0;
        this.zoomExtents();
        return;
      }

      this.isPanning = true;
      this.panHappened = false;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.mapContainer.style.cursor = 'grabbing';
      return;
    }

    if (e.button === 0) {
      // alças de edição de vértices e o HUD da edição tratam o próprio mouse: não iniciam caixa de seleção
      if ((e.target as HTMLElement | null)?.closest?.(SELETOR_TOQUE_PROPRIO)) return;
      if (this.ctx.ferramentaAtiva?.() || this.ctx.edicaoAtiva?.()) return;
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
      if (e.button === 1 && !this.panHappened) this.lastMiddleClickTime = Date.now();
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
        this.suprimirProximoClique();
      }
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      if (focoEmCampoDeTexto(e)) return;
      this.selecaoBox?.cancelarSelecao();
      this.limparSelecao();
    }
  };

  public limparSelecao(): void {
    this.ctx.aoLimparSelecao?.();
    if (this.ctx.mapaController && this.ctx.mapaController.context.selectedSegmentoId) {
      this.ctx.mapaController.selectSegmento(null);
    }
    if (this.ctx.selectedPontoIds.length > 0 || this.ctx.selectedVizinhoPontoIds.length > 0) {
      this.ctx.selectedPontoIds = [];
      this.ctx.selectedVizinhoPontoIds = [];
      this.ctx.lastSelectedPontoId = null;
      if (this.ctx.mapaController) {
        (this.ctx.mapaController.context as any).selectedPontoIds = [];
        this.ctx.mapaController.atualizarDestaqueMarcadores?.();
      }
      this.notificarSelecao();
    }
  }

  private notificarSelecao(): void {
    if (this.ctx.mapaController) {
      (this.ctx.mapaController.context as any).selectedPontoIds = [...this.ctx.selectedPontoIds];
      this.ctx.mapaController.atualizarDestaqueMarcadores?.();
    }
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
