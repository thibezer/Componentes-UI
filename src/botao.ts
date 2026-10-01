/* ====================================================
   UI Components Kit - Entrypoint Granular: Botão
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-botao';

import type { UIBotao, UIBotaoPrimario } from './components/ui-botao';

declare global {
  interface HTMLElementTagNameMap {
    'ui-botao': UIBotao;
    'ui-botao-primario': UIBotaoPrimario;
  }
}
