import { describe, it, expect } from 'vitest';
import {
  LIMITE_MARCA_PX, OPACIDADE_MARCA, diagonalPx, ehMarca, ladoMarca, projetarMercator, agruparMarcasPorCor, pintarMarcas,
  type ContextoMarcas, type MarcaLOD
} from '../src/gerencigeo-canvas/feature_lod';
import type { CaixaGeo } from '../src/gerencigeo-canvas/feature_indice';

/** Camada A: LOD por tamanho em pixels, puro (sem DOM, sem Leaflet). */

const caixaMetros = (lat: number, lado: number): CaixaGeo => {
  const dLat = lado / 111320;
  const dLon = lado / (111320 * Math.cos((lat * Math.PI) / 180));
  return { minLat: lat, maxLat: lat + dLat, minLon: -46.6, maxLon: -46.6 + dLon };
};

describe('projetarMercator', () => {
  it('equador/meridiano zero cai no centro do mundo; dobra a cada zoom', () => {
    const p0 = projetarMercator(0, 0, 0);
    expect(p0.x).toBeCloseTo(128);
    expect(p0.y).toBeCloseTo(128);
    expect(projetarMercator(0, 0, 3).x).toBeCloseTo(1024);
  });

  it('coincide com a projeção do Leaflet (EPSG:3857, tiles de 256)', () => {
    const p = projetarMercator(-23.5, -46.6, 12);
    expect(p.x).toBeCloseTo(((-46.6 + 180) / 360) * 256 * 2 ** 12, 6);
    const sin = Math.sin((-23.5 * Math.PI) / 180);
    expect(p.y).toBeCloseTo((0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * 256 * 2 ** 12, 6);
  });

  it('latitude fora do Mercator é limitada, e NaN/Infinity não lançam', () => {
    expect(Number.isFinite(projetarMercator(90, 0, 5).y)).toBe(true);
    expect(Number.isFinite(projetarMercator(-90, 0, 5).y)).toBe(true);
    expect(() => projetarMercator(NaN, Infinity, 5)).not.toThrow();
  });
});

describe('diagonalPx / ehMarca', () => {
  it('90 m em zoom 12 (~35 m/px na latitude -23,5) tem ~2,5 px de diagonal; em zoom 15 passa de 20 px', () => {
    const c = caixaMetros(-23.5, 90);
    expect(diagonalPx(c, 12)).toBeGreaterThan(2);
    expect(diagonalPx(c, 12)).toBeLessThan(4);
    expect(diagonalPx(c, 15)).toBeGreaterThan(20);
  });

  it('abaixo de LIMITE_MARCA_PX vira marca; acima, não', () => {
    const c = caixaMetros(-23.5, 60);
    expect(diagonalPx(c, 12)).toBeLessThan(LIMITE_MARCA_PX);
    expect(ehMarca(c, 12)).toBe(true);
    expect(ehMarca(c, 14)).toBe(false);
  });

  it('usa a DIAGONAL, não a área: linha longa e fina (área ~0) continua visível', () => {
    const fina: CaixaGeo = { minLat: -23.5, maxLat: -23.5, minLon: -46.6, maxLon: -46.55 };
    expect(diagonalPx(fina, 12)).toBeGreaterThan(100);
    expect(ehMarca(fina, 12)).toBe(false);
  });

  it('a caixa de um ponto (diagonal 0) é marca por tamanho; quem decide poupar pontos é o renderizador', () => {
    const p: CaixaGeo = { minLat: -23.5, maxLat: -23.5, minLon: -46.6, maxLon: -46.6 };
    expect(diagonalPx(p, 12)).toBe(0);
    expect(ehMarca(p, 12)).toBe(true);
  });

  it('entrada hostil: caixa ausente, NaN, Infinity ou invertida nunca vira marca e não lança', () => {
    expect(ehMarca(undefined, 12)).toBe(false);
    expect(ehMarca({ minLat: NaN, maxLat: 0, minLon: 0, maxLon: 0 }, 12)).toBe(false);
    expect(ehMarca({ minLat: 0, maxLat: Infinity, minLon: 0, maxLon: 0 }, 12)).toBe(false);
    expect(ehMarca({ minLat: 1, maxLat: 0, minLon: 1, maxLon: 0 }, 12)).toBe(false);
    expect(ehMarca(caixaMetros(-23.5, 10), NaN)).toBe(false);
    expect(ehMarca(caixaMetros(-23.5, 10), -1)).toBe(false);
  });

  it('é monotônica no zoom: ao afastar, o que já era marca continua sendo', () => {
    const c = caixaMetros(-10, 200);
    let eraMarca = false;
    for (let z = 22; z >= 0; z--) {
      const m = ehMarca(c, z);
      if (eraMarca) expect(m).toBe(true);
      eraMarca = eraMarca || m;
    }
    // e de fato muda de estado em algum zoom
    expect(ehMarca(c, 0)).toBe(true);
    expect(ehMarca(c, 22)).toBe(false);
  });
});

describe('ladoMarca', () => {
  it('1 px para diagonais minúsculas, 2 px para as demais', () => {
    expect(ladoMarca(0)).toBe(1);
    expect(ladoMarca(1.4)).toBe(1);
    expect(ladoMarca(1.5)).toBe(2);
    expect(ladoMarca(2.9)).toBe(2);
    expect(ladoMarca(NaN)).toBe(2);
  });
});

describe('pintura em lote por cor', () => {
  const marca = (id: string, lat: number, lon: number, cor: string, lado: 1 | 2 = 2): MarcaLOD => ({ id, lat, lon, cor, lado, fonte: id });

  function ctxFalso() {
    const chamadas: Array<[string, ...unknown[]]> = [];
    const ctx: ContextoMarcas = {
      fillStyle: '', globalAlpha: 1,
      fillRect: (x, y, w, h) => chamadas.push(['fillRect', x, y, w, h, ctx.fillStyle, ctx.globalAlpha])
    };
    return { ctx, chamadas };
  }

  it('agrupa por cor sem perder nenhuma marca', () => {
    const g = agruparMarcasPorCor([marca('a', 0, 0, '#f00'), marca('b', 0, 0, '#0f0'), marca('c', 1, 1, '#f00')]);
    expect([...g.keys()].sort()).toEqual(['#0f0', '#f00']);
    expect(g.get('#f00')!.map((m) => m.id)).toEqual(['a', 'c']);
  });

  it('um fillRect por marca, na posição projetada menos a origem do canvas, com a cor e a opacidade da marca', () => {
    const { ctx, chamadas } = ctxFalso();
    const zoom = 12;
    const o = projetarMercator(-23.5, -46.6, zoom);
    const n = pintarMarcas(ctx, [marca('a', -23.5, -46.6, '#f00')], zoom, o.x - 100, o.y - 50, 400, 300);
    expect(n).toBe(1);
    expect(chamadas).toHaveLength(1);
    const [, x, y, w, h, cor, alfa] = chamadas[0];
    expect(Math.abs((x as number) - 99)).toBeLessThanOrEqual(1);
    expect(Math.abs((y as number) - 49)).toBeLessThanOrEqual(1);
    expect([w, h, cor, alfa]).toEqual([2, 2, '#f00', OPACIDADE_MARCA]);
  });

  it('pinta em lote: a cor é definida uma vez por grupo, não por marca', () => {
    let trocasDeCor = 0;
    let cor = '';
    const ctx: ContextoMarcas = {
      get fillStyle() { return cor; },
      set fillStyle(v: string) { trocasDeCor++; cor = v; },
      globalAlpha: 1,
      fillRect: () => undefined
    };
    const marcas = Array.from({ length: 500 }, (_, i) => marca(`m${i}`, -23.5 + i * 1e-5, -46.6, i % 2 ? '#f00' : '#00f'));
    const o = projetarMercator(-23.5, -46.6, 12);
    pintarMarcas(ctx, marcas, 12, o.x - 100, o.y - 100, 400, 400);
    expect(trocasDeCor).toBe(2);
  });

  it('marca fora do canvas não é pintada; NaN e cor vazia não lançam', () => {
    const { ctx, chamadas } = ctxFalso();
    const o = projetarMercator(-23.5, -46.6, 12);
    const n = pintarMarcas(ctx, [
      marca('longe', 10, 10, '#f00'), marca('nan', NaN, NaN, '#f00'), marca('ok', -23.5, -46.6, '')
    ], 12, o.x - 10, o.y - 10, 50, 50);
    expect(n).toBe(1);
    expect(chamadas).toHaveLength(1);
  });

  it('sem marcas, não toca no contexto', () => {
    const { ctx, chamadas } = ctxFalso();
    expect(pintarMarcas(ctx, [], 12, 0, 0, 100, 100)).toBe(0);
    expect(chamadas).toHaveLength(0);
  });
});
