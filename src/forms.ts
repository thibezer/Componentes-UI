/* ====================================================
   UI Components Kit - Entrypoint: Formulários e Seleção
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-campo-texto';
export * from './components/ui-lista-flutuante';
export * from './components/ui-checkbox';
export * from './components/ui-radio';
export * from './components/ui-switch';

import type { UICampoTexto } from './components/ui-campo-texto';
import type { UIListaFlutuante, UISelect } from './components/ui-lista-flutuante';
import type { UICheckbox } from './components/ui-checkbox';
import type { UIRadio } from './components/ui-radio';
import type { UISwitch, UIToggle } from './components/ui-switch';

declare global {
  interface HTMLElementTagNameMap {
    'ui-campo-texto': UICampoTexto;
    'ui-lista-flutuante': UIListaFlutuante;
    'ui-select': UISelect;
    'ui-checkbox': UICheckbox;
    'ui-radio': UIRadio;
    'ui-switch': UISwitch;
    'ui-toggle': UIToggle;
  }
}
