import { describe, it, expect } from 'vitest';
import { normalizarNos, pontoDaCubica, tipoDoNo, moverNos } from '../src/gerencigeo-canvas/feature_curvas';
import { inserirPonto, moverAlca, nosDe } from '../src/gerencigeo-canvas/feature_edicao_ops';
import {
  alcaPolar, arcoNoSegmento, concordarNo, curvarSegmento, definirAlcaPolar, definirTipoDoNo, endireitarSegmento,
  moldarSegmento, moverNoPara, pontoMaisProximoNoSegmento, restringirAngulo, tipoDoNoDaGeometria
} from '../src/gerencigeo-canvas/feature_edicao_nos';
import { distanciaMetros, metrosPorGrau } from '../src/gerencigeo-canvas/feature_metricas';
import type { GeometriaFeicao, LatLonPar, NoCurva } from '../src/gerencigeo-canvas/feature_types';

const LAT = -23.5;
const LON = -46.6;
/** Metros a leste/norte da origem de teste. */
const em = (leste: number, norte: number): LatLonPar => {
  const m = metrosPorGrau(LAT);
  return [LAT + norte / m.lat, LON + leste / m.lng];
};
const linha = (...pts: LatLonPar[]): GeometriaFeicao => ({ tipo: 'LineString', coordenadas: pts });
const nosDa = (g: GeometriaFeicao | null): NoCurva[] => {
  const n = g && nosDe(g);
  if (!n) throw new Error('sem curva');
  return n;
};

describe('tipoDoNo', () => {
  it('sem alças é canto; uma alça é simétrico; modo gravado vence a dedução', () => {
    expect(tipoDoNo({ ponto: [0, 0] })).toBe('canto');
    expect(tipoDoNo({ ponto: [0, 0], saida: [0, 1] })).toBe('simetrico');
    expect(tipoDoNo({ ponto: [0, 0], saida: [0, 1], entrada: [0, -1], modo: 'livre' })).toBe('livre');
  });

  it('deduz simétrico, suave e livre pela geometria das alças', () => {
    expect(tipoDoNo({ ponto: [0, 0], entrada: [0, -1], saida: [0, 1] })).toBe('simetrico');
    expect(tipoDoNo({ ponto: [0, 0], entrada: [0, -1], saida: [0, 3] })).toBe('suave');
    expect(tipoDoNo({ ponto: [0, 0], entrada: [0, -1], saida: [1, 1] })).toBe('livre');
    // alças do mesmo lado (cúspide) não são suaves
    expect(tipoDoNo({ ponto: [0, 0], entrada: [0, 1], saida: [0, 2] })).toBe('livre');
    // alça de comprimento zero não tem direção
    expect(tipoDoNo({ ponto: [0, 0], entrada: [0, 0], saida: [0, 2] })).toBe('livre');
  });

  it('modo inválido vindo de fora é ignorado; modo em nó sem alças é descartado', () => {
    const nos = normalizarNos([
      { ponto: [0, 0], saida: [0, 1], modo: 'banana' },
      { ponto: [0, 2], modo: 'livre' },
      { ponto: [0, 3], entrada: [0, 2], modo: 'suave' }
    ])!;
    expect(nos[0].modo).toBeUndefined();
    expect(nos[1].modo).toBeUndefined();
    expect(nos[2].modo).toBe('suave');
  });

  it('o modo sobrevive a deslocar a feição', () => {
    const [n] = moverNos([{ ponto: [0, 0], saida: [0, 1], modo: 'livre' }], (p) => [p[0] + 1, p[1] + 1]);
    expect(n.modo).toBe('livre');
  });
});

describe('moverAlca respeita o tipo do nó', () => {
  const base = (modo?: NoCurva['modo']): GeometriaFeicao => {
    const g = moverAlca(linha(em(0, 0), em(100, 0), em(200, 0)), 1, 'saida', em(130, 40));
    return modo ? definirTipoDoNo(g, 1, modo) : g;
  };

  it('nó simétrico espelha; suave mantém o comprimento da outra; livre não mexe', () => {
    const sim = nosDa(moverAlca(base('simetrico'), 1, 'saida', em(110, 70)))[1];
    expect(sim.entrada![0]).toBeCloseTo(2 * sim.ponto[0] - sim.saida![0], 12);
    expect(sim.entrada![1]).toBeCloseTo(2 * sim.ponto[1] - sim.saida![1], 12);
    const suave = definirTipoDoNo(base(), 1, 'suave');
    const antes = nosDa(suave)[1];
    const compEntrada = distanciaMetros(antes.ponto, antes.entrada!);
    const depois = nosDa(moverAlca(suave, 1, 'saida', em(160, -90)))[1]; // direção e comprimento novos
    expect(distanciaMetros(depois.ponto, depois.entrada!)).toBeCloseTo(compEntrada, 3);
    expect(tipoDoNo(depois)).toBe('suave');
    const livre = definirTipoDoNo(base(), 1, 'livre');
    const entradaAntes = nosDa(livre)[1].entrada;
    const solto = nosDa(moverAlca(livre, 1, 'saida', em(150, 150)))[1];
    expect(solto.entrada).toEqual(entradaAntes);
    expect(solto.modo).toBe('livre');
  });

  it('Shift (simetrica=false) deixa o nó livre de vez', () => {
    const g = moverAlca(base('simetrico'), 1, 'entrada', [0.2, 0.7], false);
    expect(nosDa(g)[1].modo).toBe('livre');
    const g2 = moverAlca(g, 1, 'saida', [9, 9]);
    expect(nosDa(g2)[1].entrada).toEqual([0.2, 0.7]);
  });

  it('coordenada inválida não altera a geometria', () => {
    const g = base();
    expect(moverAlca(g, 1, 'saida', [Number.NaN, 1])).toBe(g);
    expect(moverAlca(g, 1, 'saida', [Infinity, 1])).toBe(g);
  });

  it('inserir nó numa curva: o novo é suave e o vizinho simétrico vira suave (alças já não têm o mesmo tamanho)', () => {
    const g = moverAlca(linha([0, 0], [0, 4]), 0, 'saida', [1, 1]);
    const inserida = nosDa(inserirPonto(g, 0, [0.5, 2]));
    expect(inserida[1].modo).toBe('suave');
    expect(tipoDoNo(inserida[1])).toBe('suave');
    expect(inserida[0].modo === undefined || tipoDoNo(inserida[0]) !== 'simetrico' || inserida[0].entrada === undefined).toBe(true);
  });
});

describe('definirTipoDoNo', () => {
  const quina = (): GeometriaFeicao => linha(em(0, 0), em(100, 0), em(100, 100));

  it('canto → suave/simétrico/livre cria alças; canto tira', () => {
    for (const tipo of ['simetrico', 'suave', 'livre'] as const) {
      const g = definirTipoDoNo(quina(), 1, tipo);
      const no = nosDa(g)[1];
      expect(no.entrada && no.saida).toBeTruthy();
      expect(tipoDoNoDaGeometria(g, 1)).toBe(tipo);
      const volta = definirTipoDoNo(g, 1, 'canto');
      expect(tipoDoNoDaGeometria(volta, 1)).toBe('canto');
    }
  });

  it('simétrico espelha a saída; suave alinha mantendo os comprimentos', () => {
    let g = definirTipoDoNo(quina(), 1, 'livre');
    g = moverAlca(g, 1, 'saida', em(100, 60));
    g = moverAlca(g, 1, 'entrada', em(40, 10), true); // livre: independentes
    const sim = nosDa(definirTipoDoNo(g, 1, 'simetrico'))[1];
    expect(sim.entrada![0]).toBeCloseTo(2 * sim.ponto[0] - sim.saida![0], 12);
    expect(sim.entrada![1]).toBeCloseTo(2 * sim.ponto[1] - sim.saida![1], 12);
    const original = nosDa(g)[1];
    const suave = nosDa(definirTipoDoNo(g, 1, 'suave'))[1];
    expect(suave.saida).toEqual(original.saida);
    expect(distanciaMetros(suave.ponto, suave.entrada!)).toBeCloseTo(distanciaMetros(original.ponto, original.entrada!), 3);
    expect(tipoDoNo(suave)).toBe('suave');
  });

  it('índice inválido, ponto e círculo não alteram nada', () => {
    const g = quina();
    expect(definirTipoDoNo(g, -1, 'suave')).toBe(g);
    expect(definirTipoDoNo(g, 9, 'suave')).toBe(g);
    expect(definirTipoDoNo(g, 1, 'canto')).toBe(g);
    const c: GeometriaFeicao = { tipo: 'Circle', centro: [0, 0], raioMetros: 5 };
    expect(definirTipoDoNo(c, 0, 'suave')).toBe(c);
    expect(tipoDoNoDaGeometria(c, 0)).toBeNull();
  });

  it('ponta de linha: suaviza só com o vizinho', () => {
    const g = definirTipoDoNo(quina(), 0, 'simetrico');
    expect(nosDa(g)[0].saida).toBeDefined();
  });
});

describe('restringirAngulo', () => {
  it('trava em múltiplos de 45° mantendo a distância', () => {
    const c = em(0, 0);
    const r = restringirAngulo(c, em(100, 20));
    expect(distanciaMetros(c, r)).toBeCloseTo(distanciaMetros(c, em(100, 20)), 3);
    const m = metrosPorGrau(LAT);
    expect((r[0] - c[0]) * m.lat).toBeCloseTo(0, 3); // 11,3° arredonda para 0°
    const diag = restringirAngulo(c, em(100, 80));
    expect((diag[0] - c[0]) * m.lat).toBeCloseTo((diag[1] - c[1]) * m.lng, 3);
  });

  it('entrada inválida ou distância zero devolve a coordenada', () => {
    const c = em(0, 0);
    expect(restringirAngulo(c, c)).toEqual(c);
    const ruim: LatLonPar = [Number.NaN, 1];
    expect(restringirAngulo(c, ruim)).toBe(ruim);
    expect(restringirAngulo(c, em(10, 10), 0)).toEqual(em(10, 10));
  });
});

describe('alça por comprimento e azimute', () => {
  const g = (): GeometriaFeicao => moverAlca(linha(em(0, 0), em(100, 0), em(200, 0)), 1, 'saida', em(130, 40));

  it('lê comprimento e azimute (0 = norte, horário)', () => {
    const p = alcaPolar(g(), 1, 'saida')!;
    expect(p.comprimentoM).toBeCloseTo(50, 3);
    expect(p.azimuteGraus).toBeCloseTo(36.87, 1);
    expect(alcaPolar(g(), 0, 'entrada')).toBeNull();
  });

  it('define e a oposta acompanha o modo', () => {
    const n = nosDa(definirAlcaPolar(g(), 1, 'saida', { comprimentoM: 30, azimuteGraus: 90 }))[1];
    expect(distanciaMetros(n.ponto, n.saida!)).toBeCloseTo(30, 3);
    expect(n.saida![0]).toBeCloseTo(n.ponto[0], 9);
    expect(n.saida![1]).toBeGreaterThan(n.ponto[1]); // leste
    expect(distanciaMetros(n.ponto, n.entrada!)).toBeCloseTo(30, 3); // simétrico
  });

  it('valores inválidos não alteram', () => {
    const base = g();
    expect(definirAlcaPolar(base, 1, 'saida', { comprimentoM: -1, azimuteGraus: 0 })).toBe(base);
    expect(definirAlcaPolar(base, 1, 'saida', { comprimentoM: Number.NaN, azimuteGraus: 0 })).toBe(base);
    expect(definirAlcaPolar(base, 1, 'saida', { comprimentoM: 1, azimuteGraus: Infinity })).toBe(base);
    expect(definirAlcaPolar(base, 7, 'saida', { comprimentoM: 1, azimuteGraus: 0 })).toBe(base);
  });
});

describe('moverNoPara', () => {
  it('leva as alças junto e recusa entrada inválida', () => {
    const g = moverAlca(linha([0, 0], [0, 1], [0, 2]), 1, 'saida', [0.5, 1.5]);
    const novo = nosDa(moverNoPara(g, 1, [3, 3]));
    expect(novo[1].ponto).toEqual([3, 3]);
    expect(novo[1].saida).toEqual([3.5, 3.5]);
    expect(moverNoPara(g, 1, [Number.NaN, 0])).toBe(g);
    expect(moverNoPara(g, 9, [0, 0])).toBe(g);
    const c: GeometriaFeicao = { tipo: 'Circle', centro: [0, 0], raioMetros: 5 };
    expect(moverNoPara(c, 0, [1, 1])).toBe(c);
  });
});

describe('moldar segmento', () => {
  const reta = (): GeometriaFeicao => linha(em(0, 0), em(100, 0), em(200, 0));

  it('o ponto agarrado vai até o alvo e o segmento reto vira curva', () => {
    const g0 = reta();
    const alvo = em(50, 30);
    const achado = pontoMaisProximoNoSegmento(g0, 0, em(50, 2))!;
    expect(achado.distanciaM).toBeLessThan(3);
    const g = moldarSegmento(g0, 0, achado.t, alvo)!;
    const nos = nosDa(g);
    const [c1, c2] = [nos[0].saida!, nos[1].entrada!];
    const p = pontoDaCubica(nos[0].ponto, c1, c2, nos[1].ponto, achado.t);
    expect(distanciaMetros(p, alvo)).toBeLessThan(0.01);
    expect(nos[0].modo).toBe('livre'); // nó de canto: só a alça do segmento mexe
    expect(nos[2].saida).toBeUndefined();
    expect(nos[1].saida).toBeUndefined(); // o segmento seguinte continua reto
  });

  it('nó suave leva a alça oposta junto', () => {
    let g = definirTipoDoNo(reta(), 1, 'simetrico');
    g = moldarSegmento(g, 0, 0.5, em(50, 40))!;
    const n = nosDa(g)[1];
    expect(tipoDoNo(n)).toBe('simetrico');
    expect(n.saida![0]).toBeCloseTo(2 * n.ponto[0] - n.entrada![0], 12);
  });

  it('t perto das pontas é limitado; segmentos inexistentes e entradas ruins devolvem null', () => {
    const g0 = reta();
    expect(moldarSegmento(g0, 0, 0, em(10, 10))).not.toBeNull();
    expect(moldarSegmento(g0, 0, 0.5, [Number.NaN, 0])).toBeNull();
    expect(moldarSegmento(g0, 0, Number.NaN, em(1, 1))).toBeNull();
    expect(moldarSegmento(g0, 2, 0.5, em(1, 1))).toBeNull(); // última ponta de linha não tem segmento
    expect(moldarSegmento(g0, -1, 0.5, em(1, 1))).toBeNull();
    const ponto: GeometriaFeicao = { tipo: 'Point', coordenada: [0, 0] };
    expect(moldarSegmento(ponto, 0, 0.5, em(1, 1))).toBeNull();
  });

  it('no polígono o último nó tem segmento de volta ao primeiro', () => {
    const quad: GeometriaFeicao = { tipo: 'Polygon', aneis: [[em(0, 0), em(100, 0), em(100, 100), em(0, 100)]] };
    const g = moldarSegmento(quad, 3, 0.5, em(-30, 50))!;
    const nos = nosDa(g);
    expect(nos).toHaveLength(4);
    expect(nos[3].saida).toBeDefined();
    expect(nos[0].entrada).toBeDefined();
  });

  it('endireitar tira as alças do segmento; curvar põe de volta', () => {
    let g = moldarSegmento(reta(), 0, 0.5, em(50, 30))!;
    g = endireitarSegmento(g, 0);
    const nos = nosDa(g);
    expect(nos[0].saida).toBeUndefined();
    expect(nos[1].entrada).toBeUndefined();
    expect(nos[0].modo).toBeUndefined();
    const curvo = nosDa(curvarSegmento(reta(), 1));
    expect(curvo[1].saida).toBeDefined();
    expect(curvo[2].entrada).toBeDefined();
    expect(curvo[1].modo).toBe('livre');
    expect(curvarSegmento(curvarSegmento(reta(), 1), 1)).toBeDefined();
    const ja = curvarSegmento(reta(), 1);
    expect(curvarSegmento(ja, 1)).toBe(ja);
    expect(endireitarSegmento(reta(), 0)).toEqual(reta());
    expect(curvarSegmento(reta(), 2)).toEqual(reta());
  });

  it('endireitar deixa o nó com uma alça só como livre', () => {
    let g = definirTipoDoNo(reta(), 1, 'simetrico');
    g = endireitarSegmento(g, 1);
    const n = nosDa(g)[1];
    expect(n.saida).toBeUndefined();
    expect(n.entrada).toBeDefined();
    expect(n.modo).toBe('livre');
  });
});

describe('arco por raio', () => {
  it('semicírculo: raio menor que meia corda é ajustado e o arco passa pelo topo', () => {
    const g = arcoNoSegmento(linha(em(0, 0), em(100, 0)), 0, 10, 'esquerda')!;
    const nos = nosDa(g);
    expect(nos).toHaveLength(3); // dois pedaços de 90°
    expect(distanciaMetros(nos[1].ponto, em(50, 50))).toBeLessThan(0.05);
    const d = distanciaMetros(nos[1].ponto, em(50, 0));
    expect(d).toBeCloseTo(50, 1);
  });

  it('o lado muda o abaulamento', () => {
    const esq = nosDa(arcoNoSegmento(linha(em(0, 0), em(100, 0)), 0, 50, 'esquerda'))[1];
    const dir = nosDa(arcoNoSegmento(linha(em(0, 0), em(100, 0)), 0, 50, 'direita'))[1];
    expect(esq.ponto[0]).toBeGreaterThan(LAT);
    expect(dir.ponto[0]).toBeLessThan(LAT);
  });

  it('arco menor que semicírculo: todos os pontos amostrados ficam a R do centro', () => {
    const R = 80;
    const g = arcoNoSegmento(linha(em(0, 0), em(100, 0)), 0, R, 'esquerda')!;
    const nos = nosDa(g);
    const h = Math.sqrt(R * R - 50 * 50);
    const centro = em(50, -h);
    expect(nos).toHaveLength(2);
    for (let t = 0; t <= 1; t += 0.1) {
      const p = pontoDaCubica(nos[0].ponto, nos[0].saida!, nos[1].entrada!, nos[1].ponto, t);
      expect(Math.abs(distanciaMetros(p, centro) - R)).toBeLessThan(0.05);
    }
  });

  it('polígono: o arco do último nó para o primeiro entra no fim da lista', () => {
    const tri: GeometriaFeicao = { tipo: 'Polygon', aneis: [[em(0, 0), em(100, 0), em(50, 80)]] };
    const g = arcoNoSegmento(tri, 2, 60, 'direita')!;
    const nos = nosDa(g);
    expect(nos.length).toBeGreaterThanOrEqual(4);
    expect(nos[0].entrada).toBeDefined();
    expect(nos[2].saida).toBeDefined();
  });

  it('pedidos inválidos devolvem null', () => {
    const g = linha(em(0, 0), em(100, 0));
    expect(arcoNoSegmento(g, 0, 0)).toBeNull();
    expect(arcoNoSegmento(g, 0, -5)).toBeNull();
    expect(arcoNoSegmento(g, 0, Number.NaN)).toBeNull();
    expect(arcoNoSegmento(g, 1, 10)).toBeNull();
    expect(arcoNoSegmento(linha(em(0, 0), em(0, 0)), 0, 10)).toBeNull(); // nós coincidentes
  });
});

describe('concordância (fillet)', () => {
  it('canto de 90°: tangentes a R do vértice e arco a R do centro', () => {
    const R = 20;
    const g = concordarNo(linha(em(0, 0), em(100, 0), em(100, 100)), 1, R)!;
    const nos = nosDa(g);
    expect(nos).toHaveLength(4);
    expect(distanciaMetros(nos[1].ponto, em(80, 0))).toBeLessThan(0.01);
    expect(distanciaMetros(nos[2].ponto, em(100, 20))).toBeLessThan(0.01);
    const centro = em(80, 20);
    expect(nos[1].entrada).toBeUndefined(); // o trecho que chega continua reto
    expect(nos[2].saida).toBeUndefined();
    for (let t = 0; t <= 1; t += 0.1) {
      const p = pontoDaCubica(nos[1].ponto, nos[1].saida!, nos[2].entrada!, nos[2].ponto, t);
      expect(Math.abs(distanciaMetros(p, centro) - R)).toBeLessThan(0.05);
    }
  });

  it('ângulo agudo exige mais de um pedaço de arco? não: continua sendo um arco tangente', () => {
    const g = concordarNo(linha(em(0, 0), em(100, 0), em(0, 20)), 1, 5)!;
    expect(nosDa(g).length).toBeGreaterThanOrEqual(4);
  });

  it('raio grande demais é reduzido ao que cabe nos vizinhos', () => {
    const g = concordarNo(linha(em(0, 0), em(100, 0), em(100, 30)), 1, 500)!;
    const nos = nosDa(g);
    expect(distanciaMetros(nos[2].ponto, em(100, 30))).toBeLessThan(0.05); // a tangente chega até o vizinho
  });

  it('polígono: serve em qualquer nó, inclusive o primeiro', () => {
    const quad: GeometriaFeicao = { tipo: 'Polygon', aneis: [[em(0, 0), em(100, 0), em(100, 100), em(0, 100)]] };
    const g = concordarNo(quad, 0, 10)!;
    expect(nosDa(g)).toHaveLength(5);
  });

  it('recusas: pontas da linha, nó com alças, trechos alinhados, raio inválido, índice fora', () => {
    const g = linha(em(0, 0), em(100, 0), em(100, 100));
    expect(concordarNo(g, 0, 10)).toBeNull();
    expect(concordarNo(g, 2, 10)).toBeNull();
    expect(concordarNo(g, 9, 10)).toBeNull();
    expect(concordarNo(g, 1, 0)).toBeNull();
    expect(concordarNo(g, 1, Number.NaN)).toBeNull();
    expect(concordarNo(linha(em(0, 0), em(50, 0), em(100, 0)), 1, 10)).toBeNull();
    expect(concordarNo(linha(em(0, 0), em(100, 0), em(0, 0)), 1, 10)).toBeNull(); // volta sobre si
    expect(concordarNo(linha(em(0, 0), em(0, 0), em(100, 0)), 1, 10)).toBeNull(); // vértice repetido
    const suave = definirTipoDoNo(g, 1, 'simetrico');
    expect(concordarNo(suave, 1, 10)).toBeNull();
  });
});
