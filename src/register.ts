/* ====================================================
   UI Components Kit - Entrypoint de Registro Explícito (Browser-only)
   ==================================================== */

import { isBrowser } from './core/ssr-safe';
import { initZeroJSTriggers } from './core/zero-js-triggers';

// 1. Componentes Fundamentais e Formulários
import './components/ui-botao';
import './components/ui-lista-flutuante';
import './components/ui-texto';
import './components/ui-campo-texto';
import './components/ui-icone';
import './components/ui-checkbox';
import './components/ui-radio';
import './components/ui-switch';
import './components/ui-badge';
import './components/ui-avatar';
import './components/ui-segmented';

// 2. Overlays e Feedback
import './components/ui-card';
import './components/ui-modal';
import './components/ui-drawer';
import './components/ui-alerta';
import './components/ui-tooltip';
import './components/ui-skeleton';

// 3. Dados e Ferramentas
import './components/ui-tabela';
import './components/ui-stat';
import './components/ui-tabela-propriedades';
import './components/ui-barra-ferramentas';

export { isBrowser };

/**
 * Registra manualmente todos os componentes do kit caso ainda não estejam registrados.
 * Seguro para chamar múltiplas vezes ou no ciclo de montagem de frameworks client-side (Next.js 'use client', Vue onMounted, etc.).
 */
export function registrarTodosComponentes(): void {
  if (!isBrowser) return;
  initZeroJSTriggers();
}

// Inicialização automática caso carregado diretamente no navegador
if (isBrowser) {
  initZeroJSTriggers();
}
