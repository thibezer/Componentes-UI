/* ====================================================
   UI Components Kit - Entrypoint: Barras de Ferramentas
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-barra-ferramentas';

import type { UIRibbon, UIPaletaFerramentas } from './components/ui-barra-ferramentas';

declare global {
  interface HTMLElementTagNameMap {
    'ui-ribbon': UIRibbon;
    'ui-paleta-ferramentas': UIPaletaFerramentas;
  }
}
