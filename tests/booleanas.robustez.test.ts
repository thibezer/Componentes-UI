// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { areaDosPoligonos, operacaoBooleana, type OperacaoBooleana, type RegiaoBooleana } from '../src/gerencigeo-canvas/booleanas';
import type { Par } from '../src/gerencigeo-canvas/feature_types';

/*
 * Booleanas, camadas C e E: entrada hostil (null, NaN, Infinity, anéis degenerados, operação desconhecida), quase
 * coincidências numéricas, e o orçamento de desempenho (formas grandes e muitas formas).
 */

const OPS: OperacaoBooleana[] = ['uniao', 'subtracao', 'intersecao', 'exclusao'];
const ret = (x: number, y: number, w: number, h: number): Par[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const circulo = (cx: number, cy: number, r: number, n: number): Par[] =>
  Array.from({ length: n }, (_, i): Par => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);

describe('booleanas: entrada hostil nunca lança', () => {
  const hostis: unknown[] = [
    null, undefined, 42, 'x', [], [null], [{}], [{ aneis: null }], [{ aneis: [[]] }], [{ aneis: [[[0, 0], [1, 1]]] }],
    [{ aneis: [[[NaN, 0], [1, Infinity], [2, 2], [0, 3]]] }], [{ aneis: [[[0, 0], [0, 0], [0, 0], [0, 0]]] }],
    [{ aneis: [[[0, 0], [5, 0], [10, 0]]] }], [{ aneis: [['a', 'b', 'c']] }], [{ aneis: [ret(0, 0, 1, 1)], regra: '<script>' }]
  ];
  it.each(hostis.map((h, i) => [i, h]))('entrada %i', (_i, h) => {
    for (const op of OPS) {
      const r = operacaoBooleana(h as RegiaoBooleana[], op);
      expect(Array.isArray(r.poligonos)).toBe(true);
      for (const p of r.poligonos) for (const [x, y] of p.exterior) expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    }
  });

  it('operação desconhecida dá vazio', () => {
    expect(operacaoBooleana([{ aneis: [ret(0, 0, 1, 1)] }], 'divisao' as OperacaoBooleana).poligonos).toEqual([]);
  });

  it('pontos NaN no meio de um anel são ignorados, o resto vale', () => {
    const anel: Par[] = [[0, 0], [NaN, NaN], [10, 0], [10, 10], [0, 10]];
    expect(areaDosPoligonos(operacaoBooleana([{ aneis: [anel] }], 'uniao').poligonos)).toBeCloseTo(100, 9);
  });

  it('anel fechado com o ponto inicial repetido é igual ao aberto', () => {
    const fechado = [...ret(0, 0, 10, 10), [0, 0] as Par];
    expect(areaDosPoligonos(operacaoBooleana([{ aneis: [fechado] }], 'uniao').poligonos)).toBeCloseTo(100, 9);
  });
});

describe('booleanas: quase coincidências', () => {
  it('aresta deslocada 1e-12 da outra conta como comum (sem lasca)', () => {
    const r = operacaoBooleana([{ aneis: [ret(0, 0, 10, 10)] }, { aneis: [ret(10 + 1e-12, 0, 10, 10)] }], 'uniao');
    expect(r.poligonos).toHaveLength(1);
    expect(areaDosPoligonos(r.poligonos)).toBeCloseTo(200, 6);
  });

  it('vértice a 1e-13 de uma aresta (T quase exato)', () => {
    const r = operacaoBooleana([{ aneis: [ret(0, 0, 10, 10)] }, { aneis: [[[10 - 1e-13, 4], [15, 4], [15, 6], [10 - 1e-13, 6]]] }], 'uniao');
    expect(r.poligonos).toHaveLength(1);
    expect(areaDosPoligonos(r.poligonos)).toBeCloseTo(110, 6);
  });

  it('coordenadas grandes (UTM) e pequenas (µm) funcionam igual', () => {
    for (const k of [1e-4, 1, 1e6]) {
      const A = { aneis: [ret(500000 * (k > 1 ? 1 : 0), 0, 10 * k, 10 * k)] };
      const B = { aneis: [ret(500000 * (k > 1 ? 1 : 0) + 5 * k, 5 * k, 10 * k, 10 * k)] };
      expect(areaDosPoligonos(operacaoBooleana([A, B], 'intersecao').poligonos) / (k * k)).toBeCloseTo(25, 4);
    }
  });

  it('muitos quadrados em grade que se tocam: união é um só retângulo', () => {
    const rs = [];
    for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) rs.push({ aneis: [ret(i, j, 1, 1)] });
    const r = operacaoBooleana(rs, 'uniao');
    expect(r.poligonos).toHaveLength(1);
    expect(r.poligonos[0].exterior).toHaveLength(4);
    expect(areaDosPoligonos(r.poligonos)).toBeCloseTo(100, 9);
  });

  it('nenhuma cadeia descartada nos casos comuns', () => {
    const r = operacaoBooleana([{ aneis: [circulo(0, 0, 10, 200)] }, { aneis: [circulo(5, 1, 9, 200)] }], 'exclusao');
    expect(r.estatisticas.descartados).toBe(0);
  });
});

describe('booleanas: orçamento de desempenho (docs/desempenho-feicoes.md)', () => {
  const ORCAMENTO = 16 * 4; // a suíte paralela roda ~4× mais lenta que isolada (mesma margem dos outros testes de desempenho)

  const medir = (f: () => void): number => {
    f();
    const t0 = performance.now();
    f();
    return performance.now() - t0;
  };

  it('dois círculos de 1000 vértices: cada operação cabe no quadro', () => {
    const A = { aneis: [circulo(0, 0, 100, 1000)] };
    const B = { aneis: [circulo(60, 20, 90, 1000)] };
    for (const op of OPS) {
      const ms = medir(() => operacaoBooleana([A, B], op));
      expect(ms).toBeLessThan(ORCAMENTO);
    }
  });

  // operação única (um comando, não um gesto contínuo): orçamento de 50 ms, como "escalar centenas de elementos"
  it('união de 100 formas sobrepostas (estrelas de 10 pontas, 4680 cortes): operação única ≤ 50 ms', () => {
    const rs = Array.from({ length: 100 }, (_, k) => ({
      aneis: [Array.from({ length: 20 }, (_, i): Par => {
        const r = i % 2 === 0 ? 10 : 4;
        const a = (Math.PI * i) / 10;
        return [(k % 10) * 12 + r * Math.cos(a), Math.floor(k / 10) * 12 + r * Math.sin(a)];
      })]
    }));
    const ms = medir(() => operacaoBooleana(rs, 'uniao'));
    expect(ms).toBeLessThan(50 * 4);
  });
});
