/* ====================================================
   UI Components Kit - Entrypoint: Painel de Camadas e Seletor de Mapa Base GIS/CAD
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-camadas';
export { UISeletorMapaBase, UIMapaBase } from './components/ui-seletor-mapa-base';
export type {
  PosicaoSeletorMapaBase,
  VarianteSeletorMapaBase,
  UISeletorMapaBaseOpcoes,
  DetalheEventoMapaBaseAlterado
} from './components/ui-seletor-mapa-base';

import type { UICamadas, UIPainelCamadas, UILayerPanel } from './components/ui-camadas';
import type { UISeletorMapaBase } from './components/ui-seletor-mapa-base';

declare global {
  interface HTMLElementTagNameMap {
    'ui-camadas': UICamadas;
    'ui-painel-camadas': UIPainelCamadas;
    'ui-layer-panel': UILayerPanel;
    'ui-seletor-mapa-base': UISeletorMapaBase;
    'ui-mapa-base': UISeletorMapaBase;
  }
}
