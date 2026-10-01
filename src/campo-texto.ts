/* ====================================================
   UI Components Kit - Entrypoint Granular: Campo de Texto
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-campo-texto';

import type { UICampoTexto } from './components/ui-campo-texto';

declare global {
  interface HTMLElementTagNameMap {
    'ui-campo-texto': UICampoTexto;
  }
}
