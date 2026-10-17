import { describe, it, expect } from 'vitest';
import { liberarContainerLeaflet } from '../src/components/ui-canvas-cad/cad-leaflet-adaptador';
import { lerPontosSelecionados, gravarPontosSelecionados } from '../src/components/ui-canvas-cad/cad-selecao-pontos';

describe('liberarContainerLeaflet', () => {
  it('remove a marca _leaflet_id e informa que havia uma', () => {
    const el = document.createElement('div') as HTMLElement & { _leaflet_id?: number };
    el._leaflet_id = 7;
    expect(liberarContainerLeaflet(el)).toBe(true);
    expect(el._leaflet_id).toBeUndefined();
  });

  it('é no-op sem marca, com null ou undefined', () => {
    expect(liberarContainerLeaflet(document.createElement('div'))).toBe(false);
    expect(liberarContainerLeaflet(null)).toBe(false);
    expect(liberarContainerLeaflet(undefined)).toBe(false);
  });

  it('cai para atribuir undefined quando delete falha (propriedade não configurável)', () => {
    const el = document.createElement('div');
    let valor: number | undefined = 3;
    Object.defineProperty(el, '_leaflet_id', { get: () => valor, set: (v) => { valor = v; }, configurable: false });
    expect(liberarContainerLeaflet(el)).toBe(true);
    expect(valor).toBeUndefined();
  });
});

describe('seleção de pontos nos dois contextos', () => {
  const criar = () => ({ context: {} as Record<string, unknown>, canvasInteracao: { ctx: { selectedPontoIds: [] as number[] } } }) as any;

  it('grava nos dois contextos com cópias independentes', () => {
    const c = criar();
    const ids = [1, 2];
    gravarPontosSelecionados(c, ids);
    ids.push(3);
    expect(c.context.selectedPontoIds).toEqual([1, 2]);
    expect(c.canvasInteracao.ctx.selectedPontoIds).toEqual([1, 2]);
    expect(c.context.selectedPontoIds).not.toBe(c.canvasInteracao.ctx.selectedPontoIds);
  });

  it('lê o contexto de render e cai para o de interação, ou para []', () => {
    const c = criar();
    expect(lerPontosSelecionados(c)).toEqual([]);
    c.canvasInteracao.ctx.selectedPontoIds = [5];
    expect(lerPontosSelecionados(c)).toEqual([5]);
    c.context.selectedPontoIds = [9];
    expect(lerPontosSelecionados(c)).toEqual([9]);
  });
});
