// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { desenharElementos } from '../src/gerencigeo-canvas/prancha/pintura_canvas';
import { exportarSvg } from '../src/gerencigeo-canvas/prancha/exportar_svg';
import { normalizarAparencia, normalizarGradiente, normalizarHachura } from '../src/gerencigeo-canvas/prancha/elemento_validacao';
import { resolverAparencia } from '../src/gerencigeo-canvas/prancha/aparencia_estilo';
import { criarLinha, criarRetangulo } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import { ContextoGravador } from './prancha-contextos';

/* Fase 2 da prancha, Camada C: pintura e SVG com entrada adversária (Regra #0). */

const bom = criarRetangulo({ id: 'bom', aparencia: { preenchimento: { cor: '#000' } } }, { x: 0, y: 0, largura: 10, altura: 10 })!;
const HOSTIS = [
  null, undefined, 42, 'x', {},
  { id: 'g', geometria: null },
  { id: 'd', geometria: { tipo: 'retangulo', largura: NaN, altura: 1 } },
  { id: 'm', geometria: { tipo: 'retangulo', largura: 5, altura: 5 }, transformacao: { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 } },
  { id: 'a', geometria: { tipo: 'retangulo', largura: 5, altura: 5 }, aparencia: { traco: { espessura: NaN, cor: 7, tipoLinha: {}, pontaFim: 'x' }, preenchimento: { cor: null, gradiente: { tipo: 'linear', de: [NaN, 0], ate: [1, 1], paradas: 'x' } }, hachura: { espacamento: -1, angulo: Infinity }, opacidade: NaN } },
  { id: 'h', geometria: { tipo: 'retangulo', largura: 1000, altura: 1000 }, aparencia: { hachura: { espacamento: 1e-9 } } }
] as unknown as ElementoGrafico[];

describe('pintura com entrada hostil', () => {
  it('nunca lança, pinta os bons e mantém save/restore equilibrados', () => {
    const ctx = new ContextoGravador();
    expect(() => desenharElementos(ctx, [...HOSTIS, bom])).not.toThrow();
    expect(ctx.profundidade).toBe(0);
    expect(ctx.chamadas.some(([n, , cor]) => n === 'fill' && cor === '#000')).toBe(true);
    for (const [n, ...args] of ctx.chamadas) {
      if (n === 'moveTo' || n === 'lineTo' || n === 'bezierCurveTo') expect(args.every(Number.isFinite), n).toBe(true);
    }
    expect(desenharElementos(null as never, [bom]).itens).toBe(0);
    expect(desenharElementos(ctx, 'lixo' as never).itens).toBe(0);
  });

  it('hachura com espaçamento minúsculo é limitada (não trava)', () => {
    const ctx = new ContextoGravador();
    const t0 = performance.now();
    desenharElementos(ctx, [HOSTIS[HOSTIS.length - 1]]);
    expect(performance.now() - t0).toBeLessThan(500);
    expect(ctx.chamadas.filter(([n]) => n === 'lineTo').length).toBeLessThan(10000);
  });

  it('um contexto que falha num elemento não derruba os outros', () => {
    const ctx = new ContextoGravador();
    let n = 0;
    const original = ctx.fill.bind(ctx);
    ctx.fill = (r?: CanvasFillRule) => {
      if (n++ === 0) throw new Error('falha do contexto');
      original(r);
    };
    const outro = criarRetangulo({ id: 'b2', aparencia: { preenchimento: { cor: '#123456' } } }, { x: 20, y: 0, largura: 5, altura: 5 })!;
    const est = desenharElementos(ctx, [bom, outro]);
    expect(est.itens).toBe(1);
    expect(ctx.chamadas.some(([nome, , cor]) => nome === 'fill' && cor === '#123456')).toBe(true);
    expect(ctx.profundidade).toBe(0);
  });

  it('matriz da vista não finita vira identidade; fundo com cor hostil vira branco', () => {
    const ctx = new ContextoGravador();
    desenharElementos(ctx, [bom], { matriz: { a: NaN, b: 0, c: 0, d: 1, e: 0, f: 0 }, fundo: { cor: 'x" onload="y', largura: 10, altura: 10 } });
    expect(ctx.chamadas.find(([n]) => n === 'setTransform')).toEqual(['setTransform', 1, 0, 0, 1, 0, 0]);
    expect(ctx.chamadas.find(([n]) => n === 'fillRect')![5]).toBe('#ffffff');
  });

  it('SVG com a mesma lista hostil: válido, sem NaN, só com os bons', () => {
    const svg = exportarSvg([...HOSTIS, bom], { largura: 100, altura: 100 });
    expect(svg).not.toMatch(/NaN|Infinity|undefined|null/);
    expect(svg).toContain('data-id="bom"');
  });
});

describe('aparência hostil', () => {
  it('normalização de gradiente e hachura', () => {
    expect(normalizarGradiente({ tipo: 'linear', de: [0, 0], ate: [1, 0], paradas: [] })).toBeUndefined();
    expect(normalizarGradiente({ tipo: 'radial', centro: [0.5, 0.5], raio: -1, paradas: [{ posicao: 0, cor: '#000' }] })).toBeUndefined();
    expect(normalizarGradiente({ tipo: 'linear', de: [0, 0], ate: [1, 0], paradas: [{ posicao: 2, cor: '#fff' }, { posicao: -1, cor: '#000' }, { posicao: NaN, cor: '#f00' }] }))
      .toEqual({ tipo: 'linear', de: [0, 0], ate: [1, 0], paradas: [{ posicao: 0, cor: '#000' }, { posicao: 1, cor: '#fff' }] });
    expect(normalizarHachura({ espacamento: 0.001, angulo: NaN, cruzada: 'sim' })).toEqual({ espacamento: 0.1 });
    expect(normalizarAparencia({ hachura: null })).toEqual({ hachura: null });
  });

  it('resolver nunca lança e dá valores finitos', () => {
    for (const el of HOSTIS) {
      expect(() => resolverAparencia(el)).not.toThrow();
      const r = resolverAparencia(el);
      expect(Number.isFinite(r.opacidade)).toBe(true);
      if (r.traco) expect(Number.isFinite(r.traco.largura) && r.traco.tracejado.every(Number.isFinite)).toBe(true);
    }
    expect(resolverAparencia(criarLinha({ id: 'l', aparencia: { traco: { espessura: 0 } } }, [0, 0], [1, 0])!).traco).toBeNull();
  });
});
