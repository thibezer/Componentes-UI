import type { BarraFormasEditorPrancha, LateralEditorPrancha } from './editor-tipos';

/**
 * Largura (px do próprio editor) abaixo da qual o modo `auto` usa o menu "Formas" e a gaveta. É a mesma do
 * `@container editor (max-width: 719.98px)` do CSS (o CSS não lê variáveis em condições de container).
 */
export const LARGURA_ESTREITA_PX = 720;

/** `barra-formas`: desconhecido ou ausente = `auto`. */
export const lerBarraFormas = (v: unknown): BarraFormasEditorPrancha => (v === 'botoes' || v === 'menu' ? v : 'auto');

/** `lateral`: desconhecido ou ausente = `auto`. */
export const lerLateral = (v: unknown): LateralEditorPrancha => (v === 'fixa' || v === 'gaveta' ? v : 'auto');
