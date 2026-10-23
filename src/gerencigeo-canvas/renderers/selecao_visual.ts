import type { CanvasLayerDef } from '../types';

/**
 * Seleção visual por definição de camada, compartilhada pelos renderizadores de feições (`leaflet` e `canvas`): ela
 * sobrevive à recriação do grupo (ocultar e exibir a camada) e à troca de renderizador.
 */
export const selecaoVisual = new WeakMap<CanvasLayerDef, Set<string>>();
