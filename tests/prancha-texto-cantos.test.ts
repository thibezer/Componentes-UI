import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  caixaDoTexto, definirMedidorTexto, limitesNaFolha, temMedidorTexto
} from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import { comRaioDeCanto, definirRaiosDoRetangulo, marcasDosCantos, profundidadeNoCanto, raiosEfetivos } from '../src/gerencigeo-canvas/prancha/cantos_vivos';
import { criarElipse, criarRetangulo, criarTexto } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { transformarElemento } from '../src/gerencigeo-canvas/prancha/elemento_transformacao';
import { rotacao } from '../src/gerencigeo-canvas/espaco/espaco_matriz';
import { criarMedidorCanvas } from '../src/components/ui-canvas-prancha/prancha-medidor-texto';
import { montar } from './prancha-componente-util';

/* Pendências da Fase 3 resolvidas: medida real do texto e cantos arredondados ao vivo (núcleo e componente). */

afterEach(() => {
  definirMedidorTexto(null);
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('medida real do texto', () => {
  const geo = { tipo: 'texto' as const, texto: 'ab\ncdef', tamanho: 10, fonte: 'Arial' };

  it('sem medidor, a estimativa de sempre (0,55 do corpo por caractere)', () => {
    expect(temMedidorTexto()).toBe(false);
    expect(caixaDoTexto(geo)!.largura).toBeCloseTo(4 * 10 * 0.55, 9);
  });

  it('com medidor, a linha mais larga medida; os caches (contorno, limites) se invalidam', () => {
    const el = criarTexto({ id: 't' }, [0, 0], 'ab\ncdef', 10)!;
    const antes = limitesNaFolha(el)!.largura;
    const medidor = vi.fn((texto: string, fonte: string, tamanho: number) => (fonte === 'sans-serif' ? texto.length * 0.3 * tamanho : null));
    definirMedidorTexto(medidor);
    expect(caixaDoTexto(geo)!.largura).toBeCloseTo(4 * 10 * 0.55, 9); // Arial devolve null: estimativa
    expect(limitesNaFolha(el)!.largura).toBeCloseTo(4 * 0.3 * 10, 9);
    expect(limitesNaFolha(el)!.largura).not.toBeCloseTo(antes, 3);
    expect(medidor).toHaveBeenCalledWith('cdef', 'sans-serif', 10);
  });

  it('largura no dado vence; medidor que lança ou devolve lixo cai na estimativa; fonte hostil vira sans-serif', () => {
    definirMedidorTexto(() => { throw new Error('x'); });
    expect(caixaDoTexto(geo)!.largura).toBeCloseTo(22, 9);
    definirMedidorTexto(() => NaN);
    expect(caixaDoTexto({ ...geo, largura: 50 })!.largura).toBe(50);
    const chamadas: string[] = [];
    definirMedidorTexto((_t, fonte) => { chamadas.push(fonte); return 1; });
    caixaDoTexto({ ...geo, fonte: 'x"; onload="y' });
    expect(chamadas[0]).toBe('sans-serif');
  });

  it('medidor de canvas: corpo de referência de 100 px, cache e sem Canvas 2D devolve null', () => {
    const measureText = vi.fn((t: string) => ({ width: t.length * 50 }));
    const ctx = { font: '', measureText };
    const m = criarMedidorCanvas(() => ({ getContext: () => ctx }));
    expect(m('abcd', 'Arial', 3)).toBeCloseTo(4 * 0.5 * 3, 9);
    expect(m('abcd', 'Arial', 6)).toBeCloseTo(12, 9);
    expect(measureText).toHaveBeenCalledTimes(1);
    expect(ctx.font).toBe('100px Arial');
    expect(criarMedidorCanvas(() => ({ getContext: () => null }))('a', 'Arial', 1)).toBeNull();
    expect(criarMedidorCanvas(() => { throw new Error('sem canvas'); })('a', 'Arial', 1)).toBeNull();
  });

  it('o componente registra o medidor do navegador (measureText) e refaz o índice', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({ font: '', measureText: (t: string) => ({ width: t.length * 80 }) })) as never);
    const { el } = montar();
    el.definirElementos([criarTexto({ id: 't' }, [10, 50], 'Planta', 5)!]);
    expect(temMedidorTexto()).toBe(true);
    expect(limitesNaFolha(el.obterElemento('t')!)!.largura).toBeCloseTo(6 * 0.8 * 5, 9);
  });
});

describe('cantos arredondados ao vivo (núcleo)', () => {
  const r = criarRetangulo({ id: 'r' }, { x: 0, y: 0, largura: 40, altura: 20 })!;

  it('marcas ficam no mínimo sem raio e no centro do arco com raio; seguem a rotação', () => {
    expect(marcasDosCantos(r, 3)).toEqual([[3, 3], [37, 3], [37, 17], [3, 17]]);
    const comR = comRaioDeCanto(r, null, 5)!;
    expect(marcasDosCantos(comR, 3)![0]).toEqual([5, 5]);
    const girado = transformarElemento(comR, rotacao(Math.PI / 2, [20, 10]));
    const m = marcasDosCantos(girado, 3)![0];
    expect(m[0]).toBeCloseTo(25, 9);
    expect(m[1]).toBeCloseTo(-5, 9);
    expect(marcasDosCantos(criarElipse({ id: 'e' }, { x: 0, y: 0, largura: 1, altura: 1 })!, 3)).toBeNull();
    expect(marcasDosCantos({ ...r, bloqueado: true }, 3)).toBeNull();
  });

  it('profundidade no canto e raio limitado a metade do menor lado; um canto só ou os quatro', () => {
    expect(profundidadeNoCanto(r, 0, [4, 6])).toBeCloseTo(5, 9);
    expect(profundidadeNoCanto(r, 2, [36, 16])).toBeCloseTo(4, 9);
    expect(raiosEfetivos(comRaioDeCanto(r, null, 99)!)).toEqual([10, 10, 10, 10]);
    expect(raiosEfetivos(comRaioDeCanto(r, 1, 4)!)).toEqual([0, 4, 0, 0]);
    expect(comRaioDeCanto(r, null, -3)!.geometria).toEqual({ tipo: 'retangulo', largura: 40, altura: 20 });
    expect(raiosEfetivos(definirRaiosDoRetangulo(r, [1, 2, 3, 4])!)).toEqual([1, 2, 3, 4]);
    expect(comRaioDeCanto(r, null, NaN)).toBeNull();
    expect(profundidadeNoCanto(r, 7, [0, 0])).toBeNull();
  });
});

describe('cantos arredondados ao vivo (componente)', () => {
  it('arrastar a marca para dentro arredonda os quatro cantos; Alt, só aquele; um passo no histórico', () => {
    const { el, arrastar, ev } = montar({ 'sem-snap': '' });
    el.definirElementos([criarRetangulo({ id: 'r' }, { x: 20, y: 20, largura: 80, altura: 40 })!]);
    el.selecionarElementos(['r']);
    const m = marcasDosCantos(el.obterElemento('r')!, 14 / el.obterVista().zoom)!;
    arrastar(m[0], [m[0][0] + 6, m[0][1] + 6]);
    const r = el.obterElemento('r')!.geometria as { raios?: number[] };
    expect(r.raios).toEqual([6, 6, 6, 6].map((v) => expect.closeTo(v, 6)));
    expect((ev('prancha-elemento-atualizado')[0] as { motivo: string }).motivo).toBe('cantos');
    const m2 = marcasDosCantos(el.obterElemento('r')!, 14 / el.obterVista().zoom)!;
    arrastar(m2[2], [m2[2][0] + 3, m2[2][1] + 3], { altKey: true });
    const r2 = el.obterElemento('r')!.geometria as { raios?: number[] };
    expect(r2.raios![2]).toBeCloseTo(3, 6);
    expect(r2.raios![0]).toBeCloseTo(6, 6);
    el.desfazer();
    expect((el.obterElemento('r')!.geometria as { raios?: number[] }).raios![2]).toBeCloseTo(6, 6);
  });

  it('API e ui-bus: definirRaiosCantos na seleção; tipo errado é recusado', () => {
    const { el, ev } = montar();
    el.definirElementos([criarRetangulo({ id: 'r' }, { x: 0, y: 0, largura: 30, altura: 30 })!, criarElipse({ id: 'e' }, { x: 50, y: 0, largura: 10, altura: 10 })!]);
    el.selecionarElementos(['r', 'e']);
    expect(el.definirRaiosCantos(4)).toBe(true);
    expect(raiosEfetivos(el.obterElemento('r')!)).toEqual([4, 4, 4, 4]);
    el.selecionarElementos(['e']);
    expect(el.definirRaiosCantos(2)).toBe(false);
    expect(ev('prancha-recusa')).toContainEqual({ acao: 'definir-raios', motivo: 'tipo-nao-suportado' });
    el.selecionarElementos(['r']);
    el.executarComando('definirRaiosCantos', [[1, 2, 3, 4]]);
    expect(raiosEfetivos(el.obterElemento('r')!)).toEqual([1, 2, 3, 4]);
  });
});
