/* ====================================================
   UI Components Kit - Entrypoint: Mesa CAD e GIS
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-canvas-cad';
export * from './gerencigeo-canvas';

import type { UICanvasCAD } from './components/ui-canvas-cad';

declare global {
  interface HTMLElementTagNameMap {
    'ui-canvas-cad': UICanvasCAD;
  }
}
