/* ====================================================
   UI Components Kit - Entrypoint: núcleo puro da prancha (sem o componente)
   ====================================================
   Só o L2: espaço plano, matriz, elemento gráfico em mm, pré-definições, envelope, ajuste a caixa, aparência em lote,
   plano e pintor (`planejar`, `desenharPlano`, `desenharElementos`) e a exportação SVG. Sem Custom Element, sem CSS e sem
   DOM: roda em Node, SSR e Web Worker, e o app que só PINTA (tela e PDF) não paga o editor. O editor completo
   (`<ui-canvas-prancha>`, `<ui-editor-prancha>`) continua em `@thibezer/ui-components-kit/prancha`, que também re-exporta
   tudo isto. */

export * from './gerencigeo-canvas/espaco';
export * from './gerencigeo-canvas/prancha';
export type { Par, GeometriaFeicao, NoCurva } from './gerencigeo-canvas/feature_types';
