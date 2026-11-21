// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESPACO_GEOGRAFICO } from '../src/gerencigeo-canvas/espaco/espaco_geografico';
import { ESPACO_PLANO, MM_POR_UNIDADE, areaComSinal, deMm, ehUnidadePrancha, paraMm } from '../src/gerencigeo-canvas/espaco/espaco_plano';
import {
  areaDaGeometria, extensaoDaGeometria, limitesDaGeometria
} from '../src/gerencigeo-canvas/feature_metricas';
import { gerarEstrela, gerarPoligonoRegular } from '../src/gerencigeo-canvas/feature_formas';
import {
  deslocarGeometria, distanciaEntre, dividirPoligonoComLinha, gerarBuffer, juntarLinhas, juntarPoligonos
} from '../src/gerencigeo-canvas/feature_algoritmos';
import { comPontos, pontoDaBordaDoCirculo, pontosDe } from '../src/gerencigeo-canvas/feature_edicao_ops';
import { feicaoNaCaixa, type Projetor } from '../src/gerencigeo-canvas/feature_caixa';
import { feicaoNoPonto } from '../src/gerencigeo-canvas/feature_amostra';
import { IndiceEspacial, caixaDaFeicao } from '../src/gerencigeo-canvas/feature_indice';
import { SessaoDesenho } from '../src/gerencigeo-canvas/feature_desenho';
import type { Feicao, GeometriaFeicao, LatLonPar, Par } from '../src/gerencigeo-canvas/feature_types';

/*
 * Fase 1 da prancha, Camada A: o espaço plano (mm) nos módulos generalizados, e a equivalência do padrão: chamar sem
 * espaço é exatamente o mesmo que passar `ESPACO_GEOGRAFICO` (o golden de tests/espaco-geografico.caracterizacao.test.ts
 * prova que esse padrão não mudou nem no último bit).
 */

const quadrado: Par[] = [[0, 0], [100, 0], [100, 50], [0, 50]];
const area = (aneis: Par[][]) => ESPACO_PLANO.area(aneis);

describe('ESPACO_PLANO: medidas euclidianas em mm', () => {
  it('distância, comprimento e área', () => {
    expect(ESPACO_PLANO.distancia([0, 0], [3, 4])).toBe(5);
    expect(ESPACO_PLANO.comprimento(quadrado)).toBe(250);
    expect(ESPACO_PLANO.comprimento(quadrado, true)).toBe(300);
    expect(area([quadrado])).toBe(5000);
    expect(area([quadrado, [[10, 10], [20, 10], [20, 20], [10, 20]]])).toBe(4900);
    expect(area([[[0, 0], [1, 1]]])).toBe(0);
    expect(area([])).toBe(0);
    expect(area([[[0, 0], [NaN, 1], [1, 1]]])).toBe(0);
  });

  it('a área não depende do sentido do anel; areaComSinal sim (y para baixo: horário na tela é positivo)', () => {
    expect(area([[...quadrado].reverse()])).toBe(5000);
    expect(areaComSinal(quadrado)).toBe(5000);
    expect(areaComSinal([...quadrado].reverse())).toBe(-5000);
  });

  it('plano local relativo à referência, deslocamento em +x/+y, círculo com raio em mm', () => {
    const pl = ESPACO_PLANO.planoLocal([10, 20]);
    expect(pl.paraXY([15, 25])).toEqual([5, 5]);
    expect(pl.deXY([5, 5])).toEqual([15, 25]);
    expect(ESPACO_PLANO.deslocar([1, 2], 3, -4)).toEqual([4, -2]);
    expect(ESPACO_PLANO.pontoDaBorda([10, 10], 5)).toEqual([15, 10]);
    expect(ESPACO_PLANO.extremosDoCirculo([10, 10], -5)).toEqual([[5, 5], [15, 15]]);
    expect(ESPACO_PLANO.fatorEixo([0, 60])).toBe(1);
  });

  it('unidades de exibição (o dado é sempre mm)', () => {
    expect(paraMm(1, 'pol')).toBe(25.4);
    expect(paraMm(72, 'pt')).toBeCloseTo(25.4, 12);
    expect(deMm(25.4, 'px')).toBeCloseTo(96, 12);
    expect(deMm(paraMm(12.5, 'cm'), 'cm')).toBeCloseTo(12.5, 12);
    expect(paraMm(NaN, 'mm')).toBeNaN();
    expect(paraMm(1, 'jarda' as never)).toBeNaN();
    expect(ehUnidadePrancha('mm')).toBe(true);
    expect(ehUnidadePrancha('__proto__')).toBe(false);
    expect(Object.isFrozen(MM_POR_UNIDADE)).toBe(true);
  });

  it('os dois espaços são imutáveis', () => {
    expect(Object.isFrozen(ESPACO_PLANO)).toBe(true);
    expect(Object.isFrozen(ESPACO_GEOGRAFICO)).toBe(true);
  });
});

describe('equivalência: sem espaço = ESPACO_GEOGRAFICO', () => {
  const SP: LatLonPar = [-23.5, -46.6];
  const quadSP: LatLonPar[] = [[-23.501, -46.601], [-23.501, -46.599], [-23.499, -46.599], [-23.499, -46.601]];
  const circulo: GeometriaFeicao = { tipo: 'Circle', centro: SP, raioMetros: 100 };
  const poligono: GeometriaFeicao = { tipo: 'Polygon', aneis: [quadSP] };
  const G = ESPACO_GEOGRAFICO;

  it('métricas, formas e algoritmos', () => {
    expect(limitesDaGeometria(circulo, G)).toStrictEqual(limitesDaGeometria(circulo));
    expect(areaDaGeometria(poligono, G)).toStrictEqual(areaDaGeometria(poligono));
    expect(extensaoDaGeometria(poligono, G)).toStrictEqual(extensaoDaGeometria(poligono));
    expect(gerarPoligonoRegular(SP, [-23.499, -46.599], 7, G)).toStrictEqual(gerarPoligonoRegular(SP, [-23.499, -46.599], 7));
    expect(gerarEstrela(SP, [-23.499, -46.6], 5, G)).toStrictEqual(gerarEstrela(SP, [-23.499, -46.6]));
    expect(gerarBuffer(poligono, 5, G)).toStrictEqual(gerarBuffer(poligono, 5));
    expect(deslocarGeometria(poligono, 3, 4, G)).toStrictEqual(deslocarGeometria(poligono, 3, 4));
    expect(dividirPoligonoComLinha(quadSP, [[-23.502, -46.6], [-23.498, -46.6]], G)).toStrictEqual(dividirPoligonoComLinha(quadSP, [[-23.502, -46.6], [-23.498, -46.6]]));
    expect(juntarLinhas([quadSP.slice(0, 2), quadSP.slice(1, 3)], 0, G)).toStrictEqual(juntarLinhas([quadSP.slice(0, 2), quadSP.slice(1, 3)]));
    expect(distanciaEntre(SP, quadSP[0], G)).toBe(distanciaEntre(SP, quadSP[0]));
    expect(pontoDaBordaDoCirculo(SP, 100, G)).toStrictEqual(pontoDaBordaDoCirculo(SP, 100));
    expect(comPontos(circulo, [SP, [-23.5, -46.599]], G)).toStrictEqual(comPontos(circulo, [SP, [-23.5, -46.599]]));
  });

  it('a proporção interna padrão da estrela é 0,45 e entrada fora de (0, 1] cai nela', () => {
    const padrao = gerarEstrela(SP, [-23.499, -46.6]);
    expect(gerarEstrela(SP, [-23.499, -46.6], 5, G, 0.45)).toStrictEqual(padrao);
    expect(gerarEstrela(SP, [-23.499, -46.6], 5, G, NaN)).toStrictEqual(padrao);
    expect(gerarEstrela(SP, [-23.499, -46.6], 5, G, 2)).toStrictEqual(padrao);
  });

  it('SessaoDesenho sem opções segue com as mensagens e o raio mínimo de sempre', () => {
    const s = new SessaoDesenho('circulo');
    s.clicar(SP);
    expect(s.clicar([-23.5, -46.60001]).aviso).toBe('Raio mínimo de 2 m: clique mais longe do centro.');
    const r = new SessaoDesenho('retangulo');
    r.clicar(SP);
    expect(r.clicar([-23.5, -46.59]).aviso).toBe('Os dois cantos precisam diferir em latitude e em longitude.');
  });
});

describe('módulos generalizados no espaço plano', () => {
  const P = ESPACO_PLANO;

  it('polígono regular e estrela não saem achatados (fator 1) e passam pela borda', () => {
    const hex = gerarPoligonoRegular([50, 60], [50, 40], 6, P)!;
    expect(hex).toHaveLength(6);
    for (const v of hex) expect(Math.hypot(v[0] - 50, v[1] - 60)).toBeCloseTo(20, 9);
    expect(hex[0][0]).toBeCloseTo(50, 9);
    expect(hex[0][1]).toBeCloseTo(40, 9);
    const estrela = gerarEstrela([0, 0], [0, -10], 5, P, 0.5)!;
    expect(estrela).toHaveLength(10);
    expect(Math.hypot(...estrela[1])).toBeCloseTo(5, 9);
  });

  it('buffer do quadrado em mm: cresce para fora nos dois sentidos de anel', () => {
    const g: GeometriaFeicao = { tipo: 'Polygon', aneis: [quadrado] };
    const fora = gerarBuffer(g, 2, P)!;
    const dentro = gerarBuffer(g, -2, P)!;
    expect(area([fora])).toBeCloseTo(104 * 54, 6);
    expect(area([dentro])).toBeCloseTo(96 * 46, 6);
    expect(area([gerarBuffer({ tipo: 'Polygon', aneis: [[...quadrado].reverse()] }, 2, P)!])).toBeCloseTo(104 * 54, 6);
    const circ = gerarBuffer({ tipo: 'Point', coordenada: [10, 10] }, 5, P)!;
    for (const v of circ) expect(Math.hypot(v[0] - 10, v[1] - 10)).toBeCloseTo(5, 9);
  });

  it('dividir, juntar e deslocar em mm', () => {
    const partes = dividirPoligonoComLinha(quadrado, [[40, -10], [40, 60]], P)!;
    expect(partes).toHaveLength(2);
    expect(partes.map((p) => area([p])).sort((a, b) => a - b)).toEqual([2000, 3000].map((v) => expect.closeTo(v, 6)));
    expect(juntarLinhas([[[0, 0], [10, 0]], [[10.5, 0], [20, 0]]], 1, P)).toEqual([[0, 0], [10, 0], [10.5, 0], [20, 0]]);
    expect(juntarLinhas([[[0, 0], [10, 0]], [[12, 0], [20, 0]]], 1, P)).toBeNull();
    expect(juntarPoligonos(quadrado, [[100, 0], [150, 0], [150, 50], [100, 50]], 0, P)!.length).toBeGreaterThan(8);
    expect(deslocarGeometria({ tipo: 'Point', coordenada: [1, 1] }, 10, 5, P)).toEqual({ tipo: 'Point', coordenada: [11, 6] });
  });

  it('círculo em mm: borda, edição, envelope, índice, caixa e hit-test', () => {
    const c: GeometriaFeicao = { tipo: 'Circle', centro: [50, 50], raioMetros: 10 };
    expect(pontosDe(c, P)).toEqual([[50, 50], [60, 50]]);
    expect(comPontos(c, [[50, 50], [50, 80]], P)).toEqual({ tipo: 'Circle', centro: [50, 50], raioMetros: 30 });
    expect(limitesDaGeometria(c, P)).toEqual([[40, 40], [60, 60]]);
    const f: Feicao = { id: 'c', camadaId: 'x', geometria: c, propriedades: {} };
    expect(caixaDaFeicao(f, P)).toEqual({ minLat: 40, minLon: 40, maxLat: 60, maxLon: 60 });
    const indice = new IndiceEspacial(P);
    indice.construir([f]);
    expect(indice.consultar({ minLat: 59, minLon: 59, maxLat: 59.5, maxLon: 59.5 })).toEqual(['c']);
    const projetar: Projetor = (p) => ({ x: p[0] * 2, y: p[1] * 2 }); // 2 px por mm
    expect(feicaoNaCaixa(f, { x1: 79, y1: 79, x2: 121, y2: 121 }, projetar, 'window', P)).toBe(true);
    expect(feicaoNaCaixa(f, { x1: 81, y1: 81, x2: 119, y2: 119 }, projetar, 'window', P)).toBe(false);
    expect(feicaoNoPonto({ x: 118, y: 100 }, [f], projetar, 6, P)?.id).toBe('c');
    expect(feicaoNoPonto({ x: 125, y: 100 }, [f], projetar, 6, P)).toBeNull();
  });

  it('SessaoDesenho na folha: medidas em mm, lados/pontas ajustáveis e mensagens do plano', () => {
    const op = { espaco: P, raioMinimoCirculo: 0.5, ladosPoligono: 8, pontasEstrela: 7, proporcaoInternaEstrela: 0.3 };
    const circ = new SessaoDesenho('circulo', false, op);
    circ.clicar([0, 0]);
    expect(circ.clicar([3, 4]).concluida).toEqual({ tipo: 'Circle', centro: [0, 0], raioMetros: 5 });
    const curto = new SessaoDesenho('circulo', false, op);
    curto.clicar([0, 0]);
    expect(curto.clicar([0.1, 0]).aviso).toBe('Raio mínimo de 0.5 mm: clique mais longe do centro.');
    const ret = new SessaoDesenho('retangulo', false, op);
    ret.clicar([0, 0]);
    expect(ret.clicar([0, 10]).aviso).toBe('Os dois cantos precisam diferir na horizontal e na vertical.');
    const pol = new SessaoDesenho('poligono-regular', false, op);
    pol.clicar([0, 0]);
    expect((pol.clicar([0, -10]).concluida as Extract<GeometriaFeicao, { tipo: 'Polygon' }>).aneis[0]).toHaveLength(8);
    const est = new SessaoDesenho('estrela', false, op);
    est.clicar([0, 0]);
    const anel = (est.clicar([0, -10]).concluida as Extract<GeometriaFeicao, { tipo: 'Polygon' }>).aneis[0];
    expect(anel).toHaveLength(14);
    expect(Math.hypot(...anel[1])).toBeCloseTo(3, 9);
    const linha = new SessaoDesenho('linha', false, op);
    linha.clicar([0, 0]);
    linha.clicar([30, 40]);
    expect(linha.comprimentoMetros()).toBe(50);
  });

  it('opções hostis da sessão caem nos padrões', () => {
    const s = new SessaoDesenho('poligono-regular', false, { ladosPoligono: NaN, raioMinimoCirculo: -1 });
    s.clicar([-23.5, -46.6]);
    expect((s.clicar([-23.499, -46.599]).concluida as Extract<GeometriaFeicao, { tipo: 'Polygon' }>).aneis[0]).toHaveLength(6);
    const t = new SessaoDesenho('estrela', false, { pontasEstrela: 1e9 });
    t.clicar([0, 0]);
    expect((t.clicar([0.001, 0]).concluida as Extract<GeometriaFeicao, { tipo: 'Polygon' }>).aneis[0]).toHaveLength(720);
  });
});
