/* ====================================================
   UI Components Kit - Entrypoint: Dados e Métricas
   ==================================================== */

import './tokens/index.css';
export * from './components/ui-tabela';
export * from './components/ui-tabela-propriedades';
export * from './components/ui-stat';
export * from './components/ui-badge';

import type { UITabela } from './components/ui-tabela';
import type { UITabelaPropriedades } from './components/ui-tabela-propriedades';
import type { UIStat, UIKpi, UIMetrica } from './components/ui-stat';
import type { UIBadge, UIChip, UITag } from './components/ui-badge';

declare global {
  interface HTMLElementTagNameMap {
    'ui-tabela': UITabela;
    'ui-tabela-propriedades': UITabelaPropriedades;
    'ui-painel-propriedades': UITabelaPropriedades;
    'ui-propriedades': UITabelaPropriedades;
    'ui-stat': UIStat;
    'ui-kpi': UIKpi;
    'ui-metrica': UIMetrica;
    'ui-badge': UIBadge;
    'ui-chip': UIChip;
    'ui-tag': UITag;
  }
}
