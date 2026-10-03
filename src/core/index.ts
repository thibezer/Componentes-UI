/* ====================================================
   UI Components Kit - Entrypoint: Core & Barramento
   ==================================================== */

export * from './ui-bus';
export * from './zero-js-triggers';
export * from './listener-bag';
export * from './leaflet-loader';
export * from './ssr-safe';
export * from './form-validacao';
export * from './acessibilidade';

// Inicialização automática das ações declarativas Zero-JS
import { initZeroJSTriggers } from './zero-js-triggers';
if (typeof document !== 'undefined') {
  initZeroJSTriggers();
}
