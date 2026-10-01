import { leafletCss } from '../../core/leaflet-style';
import estilos from './ui-canvas-cad.css?inline';

export function obterTemplateCanvasCAD(): string {
  return `
    <style>
      ${leafletCss}
      ${estilos}
    </style>
    <div class="cad-root" id="cad-root">
      <div class="cad-map-container" id="cad-map-container"></div>
      <div class="qgis-layer-panel collapsed" id="qgis-layer-panel">
        <div class="layer-panel-header">
          <div class="layer-panel-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            Camadas
          </div>
          <button class="layer-panel-close" id="btn-close-layers" type="button" title="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="layer-panel-body" id="layers-list-container"></div>
      </div>
      <div class="cad-quick-toolbar">
        <button class="cad-btn-tool" id="btn-toggle-layers" type="button" title="Camadas">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        </button>
        <button class="cad-btn-tool" id="btn-zoom-extents" type="button" title="Enquadrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
        </button>
        <button class="cad-btn-tool" id="btn-clear-selection" type="button" title="Limpar seleção">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
        </button>
      </div>
    </div>
  `;
}
