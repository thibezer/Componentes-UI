/* ====================================================
   UI Components Kit - Entrypoint: Seletor de Mapa Base GIS/CAD
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-seletor-mapa-base';

import type { UISeletorMapaBase } from './components/ui-seletor-mapa-base';

declare global {
  interface HTMLElementTagNameMap {
    'ui-seletor-mapa-base': UISeletorMapaBase;
    'ui-mapa-base': UISeletorMapaBase;
  }
}
