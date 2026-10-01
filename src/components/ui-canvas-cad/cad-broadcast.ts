import type { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';

export interface ContextoBroadcastCAD {
  host: HTMLElement;
  controller: GerenciGeoMapaController;
  mapContainer: HTMLDivElement | null;
  setLayerOpacity: (camadaId: string, opacidade: number) => void;
}

/**
 * Gerencia a comunicação assíncrona desacoplada via BroadcastChannel
 * para aplicar parâmetros de tema, cursor e opacidade em tempo real.
 */
export class GerenciadorBroadcastConfig {
  private canal: BroadcastChannel | null = null;
  private contexto: ContextoBroadcastCAD;

  constructor(contexto: ContextoBroadcastCAD) {
    this.contexto = contexto;
  }

  public conectar(canalNome?: string | null): void {
    this.desconectar();

    const nome = canalNome !== undefined ? canalNome : this.contexto.host.getAttribute('canal-configuracao');
    if (!nome || typeof BroadcastChannel === 'undefined') return;

    try {
      this.canal = new BroadcastChannel(nome);
      this.canal.onmessage = (event: MessageEvent) => {
        this.processarMensagem(event.data);
      };
    } catch (err) {
      console.warn(`[ui-canvas-cad] Erro ao conectar ao BroadcastChannel "${nome}":`, err);
    }
  }

  public processarMensagem(data: any): void {
    if (!data || typeof data !== 'object') return;

    const tipo = data.tipo || 'ESTILOS_ALTERADOS';
    const config = data.configuracoes || data;

    // 1. Atualizar estilo de mira/cursor (crosshair vs default)
    if (config.crosshair !== undefined) {
      const isCrosshair = Boolean(config.crosshair);
      if (this.contexto.mapContainer) {
        this.contexto.mapContainer.style.cursor = isCrosshair ? 'crosshair' : '';
      }
      const map = this.contexto.controller.getMap();
      if (map) {
        const c = map.getContainer();
        if (c) c.style.cursor = isCrosshair ? 'crosshair' : '';
      }
      this.contexto.controller.core.config.crosshair = isCrosshair;
    }

    // 2. Atualizar opacidade base (ex: satélite)
    if (config.opacidadeBase !== undefined) {
      const op = parseFloat(config.opacidadeBase);
      if (!isNaN(op)) {
        this.contexto.setLayerOpacity('satelite', op);
      }
    }
    if (config.satOpacity !== undefined) {
      const op = parseFloat(config.satOpacity);
      if (!isNaN(op)) {
        this.contexto.setLayerOpacity('satelite', op);
      }
    }

    // 3. Atualizar opacidades de outras camadas se fornecidas
    if (config.opacidades && typeof config.opacidades === 'object') {
      Object.entries(config.opacidades).forEach(([camadaId, opVal]) => {
        const op = parseFloat(opVal as any);
        if (!isNaN(op)) {
          this.contexto.setLayerOpacity(camadaId, op);
        }
      });
    }

    // 4. Disparar evento customizado 'ui-config-aplicada'
    this.contexto.host.dispatchEvent(new CustomEvent('ui-config-aplicada', {
      detail: {
        tipo,
        configuracoes: config
      },
      bubbles: true,
      composed: true
    }));
  }

  public desconectar(): void {
    if (this.canal) {
      try {
        this.canal.close();
      } catch {}
      this.canal = null;
    }
  }
}
