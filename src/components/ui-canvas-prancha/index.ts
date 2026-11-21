export * from './ui-canvas-prancha';
export { UICanvasPranchaBase } from './ui-canvas-prancha-base';
export { eventoTratadoPelaPrancha } from './prancha-teclado';
export * from './prancha-paineis';
export * from './tipos';
export { COMANDOS_PRANCHA, type ComandoPublicoPrancha } from './prancha-bus';
export { ATRIBUTOS_PRANCHA, lerMargens, type ModoAjusteAoAbrir } from './prancha-atributos-sync';
export type { FabricaContextoPrancha, PapelCanvas } from './prancha-render';
export { PX_POR_MM_100 } from './prancha-vista';
// Fase 6: dados para os painéis do kit (propriedades, camadas, paleta)
export * from './prancha-painel-propriedades';
export * from './prancha-painel-camadas';
export * from './prancha-paleta';
export type { MudancaElementosPrancha } from './prancha-comandos-propriedades';
