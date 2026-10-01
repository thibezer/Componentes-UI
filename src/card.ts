/* ====================================================
   UI Components Kit - Entrypoint Granular: Card
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-card';

import type { UICard } from './components/ui-card';

declare global {
  interface HTMLElementTagNameMap {
    'ui-card': UICard;
  }
}
