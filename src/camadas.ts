/* ====================================================
   UI Components Kit - Entrypoint: Painel de Camadas GIS/CAD
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-camadas';

import type { UICamadas, UIPainelCamadas, UILayerPanel } from './components/ui-camadas';

declare global {
  interface HTMLElementTagNameMap {
    'ui-camadas': UICamadas;
    'ui-painel-camadas': UIPainelCamadas;
    'ui-layer-panel': UILayerPanel;
  }
}
