/* ====================================================
   UI Components Kit - Entrypoint: prancha de desenho em mm (<ui-canvas-prancha>)
   ====================================================
   Sem Leaflet: o `check-layers` garante que nada que este arquivo alcança importa `leaflet`.
   Exporta o componente e o núcleo puro (espaço plano, elemento gráfico, pintor, SVG), que também roda em Node/Worker. */

import './tokens/index.css';
// o `<ui-editor-prancha>` compõe estes painéis por tag: o entrypoint os registra
import './components/ui-barra-ferramentas';
import './components/ui-camadas';
import './components/ui-tabela-propriedades';
export * from './components/ui-canvas-prancha';
export * from './components/ui-editor-prancha';
export * from './gerencigeo-canvas/espaco';
export * from './gerencigeo-canvas/prancha';
export type { Par, GeometriaFeicao, NoCurva } from './gerencigeo-canvas/feature_types';

import type { UICanvasPrancha } from './components/ui-canvas-prancha';
import type { UIEditorPrancha } from './components/ui-editor-prancha';

declare global {
  interface HTMLElementTagNameMap {
    'ui-canvas-prancha': UICanvasPrancha;
    'ui-editor-prancha': UIEditorPrancha;
  }
}
