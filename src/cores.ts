/* ====================================================
   UI Components Kit - Entrypoint: Cores (controle de preenchimento/traço e seletor de cor)
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-cores';

import type { UIControleCores, UISeletorCor } from './components/ui-cores';

declare global {
  interface HTMLElementTagNameMap {
    'ui-controle-cores': UIControleCores;
    'ui-seletor-cor': UISeletorCor;
  }
}
