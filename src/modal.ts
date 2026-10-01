/* ====================================================
   UI Components Kit - Entrypoint Granular: Modal & Diálogo
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-modal';

import type { UIModal, UIDialog } from './components/ui-modal';

declare global {
  interface HTMLElementTagNameMap {
    'ui-modal': UIModal;
    'ui-dialog': UIDialog;
  }
}
