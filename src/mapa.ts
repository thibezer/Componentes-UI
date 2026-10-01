/* ====================================================
   UI Components Kit - Entrypoint: Mapa Geográfico
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-mapa';

import type { UIMapa } from './components/ui-mapa';
import type { UIMapaMarcador } from './components/ui-mapa/ui-mapa-marcador';
import type { UIMapaLinha } from './components/ui-mapa/ui-mapa-linha';

declare global {
  interface HTMLElementTagNameMap {
    'ui-mapa': UIMapa;
    'ui-mapa-marcador': UIMapaMarcador;
    'ui-mapa-linha': UIMapaLinha;
  }
}
