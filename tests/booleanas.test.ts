// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  areaDosPoligonos, operacaoBooleana, pontoNoAnel, type OperacaoBooleana, type RegiaoBooleana
} from '../src/gerencigeo-canvas/booleanas';
import { areaComSinal } from '../src/gerencigeo-canvas/espaco/espaco_plano';
import type { Par } from '../src/gerencigeo-canvas/feature_types';

/*
 * Booleanas de polígonos (Pathfinder), camada A: áreas exatas de casos conhecidos, furos, sentido dos anéis, regras de
 * preenchimento, toques e colinearidades, idempotência e propriedades (A∪B = A + B − A∩B; A⊕B = A∪B − A∩B).
 */

const ret = (x: number, y: number, w: number, h: number): Par[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const reg = (...aneis: Par[][]): RegiaoBooleana => ({ aneis });
const circulo = (cx: number, cy: number, r: number, n = 64): Par[] =>
  Array.from({ length: n }, (_, i): Par => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);

const area = (rs: RegiaoBooleana[], op: OperacaoBooleana): number => areaDosPoligonos(operacaoBooleana(rs, op).poligonos);

describe('booleanas: casos clássicos', () => {
  const A = reg(ret(0, 0, 10, 10));
  const B = reg(ret(5, 5, 10, 10));

  it('dois quadrados sobrepostos: união 175, interseção 25, subtração 75, exclusão 150', () => {
    expect(area([A, B], 'uniao')).toBeCloseTo(175, 9);
    expect(area([A, B], 'intersecao')).toBeCloseTo(25, 9);
    expect(area([A, B], 'subtracao')).toBeCloseTo(75, 9);
    expect(area([A, B], 'exclusao')).toBeCloseTo(150, 9);
  });

  it('a união sai como um anel só, com 8 vértices e área positiva (externo)', () => {
    const r = operacaoBooleana([A, B], 'uniao');
    expect(r.poligonos).toHaveLength(1);
    expect(r.poligonos[0].exterior).toHaveLength(8);
    expect(r.poligonos[0].furos).toHaveLength(0);
    expect(areaComSinal(r.poligonos[0].exterior)).toBeGreaterThan(0);
  });

  it('a exclusão de dois sobrepostos dá duas peças em L', () => {
    const r = operacaoBooleana([A, B], 'exclusao');
    expect(r.poligonos).toHaveLength(2);
  });

  it('subtrair um quadrado de dentro deixa um furo', () => {
    const r = operacaoBooleana([reg(ret(0, 0, 10, 10)), reg(ret(3, 3, 4, 4))], 'subtracao');
    expect(r.poligonos).toHaveLength(1);
    expect(r.poligonos[0].furos).toHaveLength(1);
    expect(areaComSinal(r.poligonos[0].furos[0])).toBeLessThan(0);
    expect(areaDosPoligonos(r.poligonos)).toBeCloseTo(84, 9);
  });

  it('formas separadas: união mantém as duas, interseção é vazia', () => {
    const C = reg(ret(20, 0, 5, 5));
    expect(operacaoBooleana([A, C], 'uniao').poligonos).toHaveLength(2);
    expect(operacaoBooleana([A, C], 'intersecao').poligonos).toHaveLength(0);
    expect(area([A, C], 'subtracao')).toBeCloseTo(100, 9);
  });

  it('círculos: as áreas batem com o polígono amostrado (propriedade da inclusão-exclusão)', () => {
    const c1 = reg(circulo(0, 0, 10));
    const c2 = reg(circulo(8, 0, 10));
    const u = area([c1, c2], 'uniao');
    const i = area([c1, c2], 'intersecao');
    const a1 = Math.abs(areaComSinal(circulo(0, 0, 10)));
    expect(u + i).toBeCloseTo(2 * a1, 6);
    expect(area([c1, c2], 'exclusao')).toBeCloseTo(u - i, 6);
    expect(area([c1, c2], 'subtracao')).toBeCloseTo(a1 - i, 6);
  });

  it('o sentido dos anéis de entrada não importa', () => {
    const Binv = reg([...ret(5, 5, 10, 10)].reverse());
    expect(area([A, Binv], 'uniao')).toBeCloseTo(175, 9);
    expect(area([A, Binv], 'intersecao')).toBeCloseTo(25, 9);
  });

  it('várias regiões: união de três e subtração da primeira por duas', () => {
    const rs = [reg(ret(0, 0, 30, 10)), reg(ret(2, 2, 4, 4)), reg(ret(20, 2, 4, 4))];
    expect(area(rs, 'uniao')).toBeCloseTo(300, 9);
    const s = operacaoBooleana(rs, 'subtracao');
    expect(s.poligonos[0].furos).toHaveLength(2);
    expect(areaDosPoligonos(s.poligonos)).toBeCloseTo(268, 9);
  });

  it('exclusão de três: a sobreposição tripla volta a contar (ímpar)', () => {
    const rs = [reg(ret(0, 0, 10, 10)), reg(ret(0, 0, 10, 10)), reg(ret(0, 0, 10, 10))];
    expect(area(rs, 'exclusao')).toBeCloseTo(100, 9);
    expect(area(rs.slice(0, 2), 'exclusao')).toBeCloseTo(0, 9);
  });
});

describe('booleanas: regras, furos e casos degenerados', () => {
  it('região com furo (anel interno no sentido oposto, nonzero) entra como furo', () => {
    const comFuro = reg(ret(0, 0, 10, 10), [...ret(2, 2, 6, 6)].reverse());
    expect(area([comFuro], 'uniao')).toBeCloseTo(64, 9);
    // o furo é coberto por outro quadrado na união
    expect(area([comFuro, reg(ret(2, 2, 6, 6))], 'uniao')).toBeCloseTo(100, 9);
  });

  it('evenodd: dois anéis no mesmo sentido viram externo + furo; nonzero não', () => {
    const aneis = [ret(0, 0, 10, 10), ret(2, 2, 6, 6)];
    expect(area([{ aneis, regra: 'evenodd' }], 'uniao')).toBeCloseTo(64, 9);
    expect(area([{ aneis, regra: 'nonzero' }], 'uniao')).toBeCloseTo(100, 9);
  });

  it('anel que se cruza (laço em 8) é resolvido em duas peças pela união de si mesmo', () => {
    const oito: Par[] = [[0, 0], [10, 10], [10, 0], [0, 10]];
    const r = operacaoBooleana([reg(oito)], 'uniao');
    expect(r.poligonos).toHaveLength(2);
    expect(areaDosPoligonos(r.poligonos)).toBeCloseTo(50, 9);
  });

  it('quadrados lado a lado (aresta comum) se fundem num retângulo de 4 vértices', () => {
    const r = operacaoBooleana([reg(ret(0, 0, 10, 10)), reg(ret(10, 0, 10, 10))], 'uniao');
    expect(r.poligonos).toHaveLength(1);
    expect(r.poligonos[0].exterior).toHaveLength(4);
    expect(areaDosPoligonos(r.poligonos)).toBeCloseTo(200, 9);
  });

  it('aresta comum parcial (T e colinear) e quadrados idênticos', () => {
    expect(area([reg(ret(0, 0, 10, 10)), reg(ret(10, 3, 5, 4))], 'uniao')).toBeCloseTo(120, 9);
    expect(area([reg(ret(0, 0, 10, 10)), reg(ret(0, 0, 10, 10))], 'uniao')).toBeCloseTo(100, 9);
    expect(area([reg(ret(0, 0, 10, 10)), reg(ret(0, 0, 10, 10))], 'subtracao')).toBeCloseTo(0, 9);
    expect(area([reg(ret(0, 0, 10, 10)), reg(ret(0, 0, 10, 10))], 'intersecao')).toBeCloseTo(100, 9);
  });

  it('quadrados que se tocam só numa quina: dois anéis, sem ponte', () => {
    const r = operacaoBooleana([reg(ret(0, 0, 10, 10)), reg(ret(10, 10, 10, 10))], 'uniao');
    expect(r.poligonos).toHaveLength(2);
    expect(areaDosPoligonos(r.poligonos)).toBeCloseTo(200, 9);
  });

  it('as coordenadas de entrada saem idênticas (sem arredondar)', () => {
    const r = operacaoBooleana([reg(ret(0.1, 0.2, 10.3, 10.7)), reg(ret(50, 50, 1, 1))], 'uniao');
    const xs = r.poligonos.flatMap((p) => p.exterior.map((q) => q[0]));
    expect(xs).toContain(0.1);
    expect(xs).toContain(0.1 + 10.3);
  });

  it('idempotência: aplicar a união ao resultado não muda a área nem a forma', () => {
    const r1 = operacaoBooleana([reg(circulo(0, 0, 10, 40)), reg(circulo(7, 3, 6, 40))], 'uniao');
    const r2 = operacaoBooleana([{ aneis: r1.poligonos.flatMap((p) => [p.exterior, ...p.furos]) }], 'uniao');
    expect(areaDosPoligonos(r2.poligonos)).toBeCloseTo(areaDosPoligonos(r1.poligonos), 9);
    expect(r2.poligonos[0].exterior.length).toBe(r1.poligonos[0].exterior.length);
  });

  it('pontoNoAnel e areaComSinal', () => {
    expect(pontoNoAnel(5, 5, ret(0, 0, 10, 10))).toBe(true);
    expect(pontoNoAnel(15, 5, ret(0, 0, 10, 10))).toBe(false);
    expect(areaComSinal(ret(0, 0, 2, 3))).toBeCloseTo(6, 12);
  });
});
