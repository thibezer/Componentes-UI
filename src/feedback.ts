/* ====================================================
   UI Components Kit - Entrypoint: Overlays, Modais e Feedback
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-modal';
export * from './components/ui-drawer';
export * from './components/ui-alerta';
export * from './components/ui-tooltip';
export * from './components/ui-skeleton';

import type { UIModal, UIDialog } from './components/ui-modal';
import type { UIDrawer, UISheet, UIPainelLateral, UIGaveta } from './components/ui-drawer';
import type { UIAlerta, UIToast } from './components/ui-alerta';
import type { UITooltip, UIPopover } from './components/ui-tooltip';
import type { UISkeleton, UIEsqueleto } from './components/ui-skeleton';

declare global {
  interface HTMLElementTagNameMap {
    'ui-modal': UIModal;
    'ui-dialog': UIDialog;
    'ui-drawer': UIDrawer;
    'ui-sheet': UISheet;
    'ui-painel-lateral': UIPainelLateral;
    'ui-gaveta': UIGaveta;
    'ui-alerta': UIAlerta;
    'ui-toast': UIToast;
    'ui-tooltip': UITooltip;
    'ui-popover': UIPopover;
    'ui-skeleton': UISkeleton;
    'ui-esqueleto': UIEsqueleto;
  }
}
