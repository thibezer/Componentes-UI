/* ====================================================
   UI Components Kit - Entrypoint: Tabelas e Propriedades
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-tabela';
export * from './components/ui-tabela-propriedades';

import type { UITabela } from './components/ui-tabela';
import type { UITabelaPropriedades } from './components/ui-tabela-propriedades';

declare global {
  interface HTMLElementTagNameMap {
    'ui-tabela': UITabela;
    'ui-tabela-propriedades': UITabelaPropriedades;
    'ui-painel-propriedades': UITabelaPropriedades;
    'ui-propriedades': UITabelaPropriedades;
  }
}
