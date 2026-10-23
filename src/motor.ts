/* ====================================================
   UI Components Kit - Entrypoint: motor das formas (headless)
   ====================================================
   Sem Leaflet, sem DOM e sem efeitos colaterais: importável em Node/SSR e rodável em Web Worker.
   O `check-layers` garante que nada que este arquivo alcança importa `leaflet`. */

export * from './gerencigeo-canvas/motor';
export * from './gerencigeo-canvas/feature_lod';
export * from './gerencigeo-canvas/feature_simplificacao';
export * from './gerencigeo-canvas/feature_indice';
export * from './gerencigeo-canvas/feature_cluster';
export * from './gerencigeo-canvas/feature_versoes';
export * from './gerencigeo-canvas/feature_types';
