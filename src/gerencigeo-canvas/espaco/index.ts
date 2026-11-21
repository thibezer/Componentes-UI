/* Núcleo de espaço (L2, puro): geográfico (padrão do mapa) e plano (folha da prancha, mm), mais a matriz afim 2D. */
export type { Espaco, PlanoLocal, TipoEspaco, XY } from './espaco_tipos';
export { ESPACO_GEOGRAFICO } from './espaco_geografico';
export { ESPACO_PLANO, MM_POR_UNIDADE, areaComSinal, deMm, ehUnidadePrancha, paraMm, type UnidadePrancha } from './espaco_plano';
export * from './espaco_matriz';
