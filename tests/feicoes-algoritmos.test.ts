import { describe, it, expect } from 'vitest';
import {
  dividirPoligonoComLinha, juntarLinhas, juntarPoligonos, gerarBuffer, deslocarGeometria,
  converterComprimento, converterArea, ddParaDms, dmsParaDd, pontoNoPoligono
} from '../src/gerencigeo-canvas/feature_algoritmos';
import { areaMetros2, distanciaMetros, comprimentoMetros } from '../src/gerencigeo-canvas/feature_metricas';
import { SessaoDesenho, amostrarBezier, ehFerramenta, FERRAMENTAS } from '../src/gerencigeo-canvas/feature_desenho';
import { feicaoNoPonto } from '../src/gerencigeo-canvas/feature_amostra';
import { interpretarFerramentas } from '../src/components/ui-canvas-cad/cad-ferramentas-barra';
import type { Feicao, LatLonPar } from '../src/gerencigeo-canvas/feature_types';

// Quadrado de ~22 km de lado perto do equador: grande o bastante para tolerância de arredondamento não importar
const quad: LatLonPar[] = [[0.1, 0.1], [0.1, 0.3], [0.3, 0.3], [0.3, 0.1]];
const soma = (partes: LatLonPar[][]) => partes.reduce((s, p) => s + areaMetros2([p]), 0);

describe('dividirPoligonoComLinha', () => {
  it('uma linha reta atravessando divide em duas partes que somam a área original', () => {
    const partes = dividirPoligonoComLinha(quad, [[0, 0.2], [0.4, 0.2]])!;
    expect(partes).toHaveLength(2);
    expect(soma(partes)).toBeCloseTo(areaMetros2([quad]), -3);
    for (const p of partes) expect(areaMetros2([p]) / areaMetros2([quad])).toBeCloseTo(0.5, 2);
  });

  it('o sentido da linha não muda o resultado', () => {
    const a = dividirPoligonoComLinha(quad, [[0, 0.2], [0.4, 0.2]])!;
    const b = dividirPoligonoComLinha(quad, [[0.4, 0.2], [0, 0.2]])!;
    expect(b).toHaveLength(2);
    expect(soma(b)).toBeCloseTo(soma(a), -3);
  });

  it('linha com vértice no meio (cortes em ziguezague) também divide', () => {
    const partes = dividirPoligonoComLinha(quad, [[0, 0.15], [0.2, 0.25], [0.4, 0.15]])!;
    expect(partes).toHaveLength(2);
    expect(soma(partes)).toBeCloseTo(areaMetros2([quad]), -3);
  });

  it('linha que atravessa duas vezes gera três partes', () => {
    const partes = dividirPoligonoComLinha(quad, [[0, 0.15], [0.4, 0.15], [0.4, 0.25], [0, 0.25]])!;
    expect(partes).toHaveLength(3);
    expect(soma(partes)) .toBeCloseTo(areaMetros2([quad]), -3);
  });

  it('não divide quando a linha não corta a borda duas vezes', () => {
    expect(dividirPoligonoComLinha(quad, [[0.15, 0.15], [0.25, 0.25]])).toBeNull(); // toda dentro
    expect(dividirPoligonoComLinha(quad, [[0, 0.2], [0.2, 0.2]])).toBeNull(); // só entra
    expect(dividirPoligonoComLinha(quad, [[0.5, 0.5], [0.6, 0.6]])).toBeNull(); // fora
    expect(dividirPoligonoComLinha(quad, [[0, 0.2]])).toBeNull();
    expect(dividirPoligonoComLinha([[0.1, 0.1], [0.2, 0.2]], [[0, 0], [1, 1]])).toBeNull();
  });

  it('não altera as entradas', () => {
    const copia = JSON.stringify(quad);
    dividirPoligonoComLinha(quad, [[0, 0.2], [0.4, 0.2]]);
    expect(JSON.stringify(quad)).toBe(copia);
  });

  it('divide também polígono côncavo (em L)', () => {
    const L: LatLonPar[] = [[0.1, 0.1], [0.1, 0.3], [0.2, 0.3], [0.2, 0.2], [0.3, 0.2], [0.3, 0.1]];
    const partes = dividirPoligonoComLinha(L, [[0, 0.15], [0.4, 0.15]])!;
    expect(partes).toHaveLength(2);
    expect(soma(partes)).toBeCloseTo(areaMetros2([L]), -3);
  });
});

describe('junção', () => {
  it('encadeia linhas, inverte as que precisam e liga lacunas com ponte dentro da tolerância', () => {
    const a: LatLonPar[] = [[0.1, 0.1], [0.1, 0.2]];
    const b: LatLonPar[] = [[0.1, 0.3], [0.1, 0.2]]; // invertida
    const r = juntarLinhas([a, b], 0)!;
    expect(r).toHaveLength(3);
    expect(r[0][1]).toBeCloseTo(0.1, 9);
    expect(r[1][1]).toBeCloseTo(0.2, 9);
    expect(r[2][1]).toBeCloseTo(0.3, 9);

    const c: LatLonPar[] = [[0.1, 0.20005], [0.1, 0.3]]; // ~5,5 m de lacuna
    expect(juntarLinhas([a, c], 1)).toBeNull();
    const ponte = juntarLinhas([a, c], 10)!;
    expect(ponte).toHaveLength(4);
    expect(comprimentoMetros(ponte)).toBeGreaterThan(comprimentoMetros([...a, ...c]) - 1);
  });

  it('liga pela ponta inicial também e recusa linha solta', () => {
    const a: LatLonPar[] = [[0.1, 0.2], [0.1, 0.3]];
    const b: LatLonPar[] = [[0.1, 0.1], [0.1, 0.2]];
    const r = juntarLinhas([a, b], 0)!;
    expect(r).toHaveLength(3);
    expect(r.map((p) => p[1])).toEqual([expect.closeTo(0.1, 9), expect.closeTo(0.2, 9), expect.closeTo(0.3, 9)]);
    expect(juntarLinhas([a, [[0.5, 0.5], [0.6, 0.6]]], 5)).toBeNull();
    expect(juntarLinhas([], 0)).toBeNull();
  });

  it('junta polígonos vizinhos por uma ponte; a área é a soma', () => {
    const a: LatLonPar[] = [[0.1, 0.1], [0.1, 0.2], [0.2, 0.2], [0.2, 0.1]];
    const b: LatLonPar[] = [[0.1, 0.2], [0.1, 0.3], [0.2, 0.3], [0.2, 0.2]]; // divide a borda lon=0.2
    const r = juntarPoligonos(a, b, 1)!;
    expect(r).not.toBeNull();
    expect(areaMetros2([r])).toBeCloseTo(areaMetros2([a]) + areaMetros2([b]), -3);
  });

  it('recusa polígonos longe demais ou com bordas que se cruzam', () => {
    const a: LatLonPar[] = [[0.1, 0.1], [0.1, 0.2], [0.2, 0.2], [0.2, 0.1]];
    const longe: LatLonPar[] = [[0.1, 0.5], [0.1, 0.6], [0.2, 0.6], [0.2, 0.5]];
    expect(juntarPoligonos(a, longe, 100)).toBeNull();
    const sobreposto: LatLonPar[] = [[0.15, 0.15], [0.15, 0.25], [0.25, 0.25], [0.25, 0.15]];
    expect(juntarPoligonos(a, sobreposto, 1e9)).toBeNull();
  });
});

describe('buffer', () => {
  const CENTRO: LatLonPar = [-23.5, -46.6];

  it('ponto: círculo de raio pedido', () => {
    const anel = gerarBuffer({ tipo: 'Point', coordenada: CENTRO }, 100)!;
    expect(anel).toHaveLength(64);
    expect(areaMetros2([anel])).toBeGreaterThan(Math.PI * 100 * 100 * 0.98);
    expect(areaMetros2([anel])).toBeLessThan(Math.PI * 100 * 100 * 1.02);
    expect(distanciaMetros(CENTRO, anel[10])).toBeCloseTo(100, 0);
  });

  it('círculo: soma o raio; distância negativa maior que o raio não existe', () => {
    const c = { tipo: 'Circle' as const, centro: CENTRO, raioMetros: 50 };
    const mais = gerarBuffer(c, 50)!;
    expect(areaMetros2([mais])).toBeGreaterThan(Math.PI * 95 * 95);
    expect(gerarBuffer(c, -60)).toBeNull();
  });

  it('linha: área ≈ 2·r·L + π·r²; negativo e zero não valem', () => {
    const linha: LatLonPar[] = [[-23.5, -46.6], [-23.5, -46.59]];
    const L = distanciaMetros(linha[0], linha[1]);
    const anel = gerarBuffer({ tipo: 'LineString', coordenadas: linha }, 20)!;
    const esperado = 2 * 20 * L + Math.PI * 20 * 20;
    expect(areaMetros2([anel]) / esperado).toBeGreaterThan(0.97);
    expect(areaMetros2([anel]) / esperado).toBeLessThan(1.03);
    expect(gerarBuffer({ tipo: 'LineString', coordenadas: linha }, -5)).toBeNull();
    expect(gerarBuffer({ tipo: 'LineString', coordenadas: linha }, 0)).toBeNull();
  });

  it('polígono: para fora aumenta, para dentro diminui, independente do sentido do anel', () => {
    const lado = 100 / 111320;
    const anti: LatLonPar[] = [[-23.5, -46.6], [-23.5, -46.6 + lado], [-23.5 + lado, -46.6 + lado], [-23.5 + lado, -46.6]];
    const horario = [...anti].reverse();
    for (const anel of [anti, horario]) {
      const original = areaMetros2([anel]);
      const fora = gerarBuffer({ tipo: 'Polygon', aneis: [anel] }, 10)!;
      const dentro = gerarBuffer({ tipo: 'Polygon', aneis: [anel] }, -10)!;
      expect(areaMetros2([fora])).toBeGreaterThan(original * 1.2);
      expect(areaMetros2([fora])).toBeLessThan(original * 1.5);
      expect(areaMetros2([dentro])).toBeLessThan(original * 0.9);
      expect(areaMetros2([dentro])).toBeGreaterThan(original * 0.6);
    }
  });
});

describe('deslocamento e utilitários', () => {
  it('desloca em metros para leste e norte', () => {
    const g = deslocarGeometria({ tipo: 'Point', coordenada: [-23.5, -46.6] }, 100, 0) as { coordenada: LatLonPar };
    expect(distanciaMetros([-23.5, -46.6], g.coordenada)).toBeCloseTo(100, 0);
    expect(g.coordenada[0]).toBeCloseTo(-23.5, 8);
    const n = deslocarGeometria({ tipo: 'Point', coordenada: [-23.5, -46.6] }, 0, 100) as { coordenada: LatLonPar };
    expect(distanciaMetros([-23.5, -46.6], n.coordenada)).toBeCloseTo(100, 0);
  });

  it('desloca todos os tipos sem alterar a original', () => {
    const poli = { tipo: 'Polygon' as const, aneis: [quad] };
    const copia = JSON.stringify(poli);
    const r = deslocarGeometria(poli, 10, 10) as typeof poli;
    expect(r.aneis[0][0]).not.toEqual(quad[0]);
    expect(JSON.stringify(poli)).toBe(copia);
    expect(deslocarGeometria({ tipo: 'Circle', centro: [1, 1], raioMetros: 5 }, 1, 1)).toMatchObject({ tipo: 'Circle', raioMetros: 5 });
    expect(deslocarGeometria({ tipo: 'Text', coordenada: [1, 1], texto: 'x' }, 1, 1)).toMatchObject({ texto: 'x' });
  });

  it('ponto em polígono respeita furos', () => {
    const furo: LatLonPar[] = [[0.18, 0.18], [0.18, 0.22], [0.22, 0.22], [0.22, 0.18]];
    expect(pontoNoPoligono([0.15, 0.15], [quad, furo])).toBe(true);
    expect(pontoNoPoligono([0.2, 0.2], [quad, furo])).toBe(false);
    expect(pontoNoPoligono([0.5, 0.5], [quad])).toBe(false);
  });
});

describe('unidades e DMS', () => {
  it('converte comprimento e área (alqueire paulista = 24.200 m²)', () => {
    expect(converterComprimento(1, 'km', 'm')).toBe(1000);
    expect(converterComprimento(1, 'mi', 'km')).toBeCloseTo(1.609344, 6);
    expect(converterComprimento(100, 'ft', 'm')).toBeCloseTo(30.48, 6);
    expect(converterArea(1, 'ha', 'm2')).toBe(10000);
    expect(converterArea(1, 'alqueire', 'ha')).toBeCloseTo(2.42, 6);
    expect(converterArea(1, 'km2', 'ha')).toBe(100);
    expect(converterArea(1, 'ac', 'm2')).toBeCloseTo(4046.8564, 3);
  });

  it('DD -> DMS com hemisfério', () => {
    expect(ddParaDms(-23.5, 'lat')).toBe('23°30\'00.00"S');
    expect(ddParaDms(23.5, 'lat')).toBe('23°30\'00.00"N');
    expect(ddParaDms(-46.6333, 'lon')).toBe('46°37\'59.88"O');
    expect(ddParaDms(10.25, 'lon')).toBe('10°15\'00.00"L');
  });

  it('arredondamento de segundos não gera "60"', () => {
    expect(ddParaDms(10 + 59 / 60 + 59.999 / 3600, 'lat')).toBe('11°00\'00.00"N');
  });

  it('DMS -> DD aceita formatos comuns e recusa lixo', () => {
    expect(dmsParaDd('23°30\'00.00"S')).toBeCloseTo(-23.5, 10);
    expect(dmsParaDd('23 30 0 S')).toBeCloseTo(-23.5, 10);
    expect(dmsParaDd('-23°30\'')).toBeCloseTo(-23.5, 10);
    expect(dmsParaDd('46°37\'59,88"O')).toBeCloseTo(-46.6333, 4);
    expect(dmsParaDd('10°15\'00"L')).toBeCloseTo(10.25, 10);
    expect(dmsParaDd('abc')).toBeNull();
    expect(dmsParaDd('10°75\'00"N')).toBeNull();
    expect(dmsParaDd('1 2 3 4')).toBeNull();
    expect(dmsParaDd('')).toBeNull();
  });

  it('ida e volta mantém o valor', () => {
    for (const v of [-23.5, 0.0001, -46.633308, 89.9999, -179.5]) {
      expect(dmsParaDd(ddParaDms(v, 'lat', 6))).toBeCloseTo(v, 6);
    }
  });
});

describe('SessaoDesenho', () => {
  it('há exatamente 15 ferramentas e ehFerramenta valida', () => {
    expect(FERRAMENTAS).toHaveLength(15);
    expect(ehFerramenta('linha')).toBe(true);
    expect(ehFerramenta('x')).toBe(false);
    expect(ehFerramenta(null)).toBe(false);
  });

  it('ponto e texto concluem no primeiro clique', () => {
    expect(new SessaoDesenho('ponto').clicar([1, 2]).concluida).toEqual({ tipo: 'Point', coordenada: [1, 2] });
    expect(new SessaoDesenho('texto').clicar([1, 2]).concluida).toMatchObject({ tipo: 'Text', coordenada: [1, 2] });
  });

  it('linha: precisa de 2 vértices, ignora clique repetido, desfaz', () => {
    const s = new SessaoDesenho('linha');
    s.clicar([1, 1]);
    s.clicar([1, 1]);
    expect(s.nos).toBe(1);
    expect(s.concluir()).toBeNull();
    s.clicar([2, 2]);
    s.clicar([3, 3]);
    expect(s.desfazer()).toBe(true);
    expect(s.nos).toBe(2);
    expect(s.concluir()).toEqual({ tipo: 'LineString', coordenadas: [[1, 1], [2, 2]] });
    expect(new SessaoDesenho('linha').desfazer()).toBe(false);
  });

  it('polígono: mínimo 3; a prévia inclui o cursor', () => {
    const s = new SessaoDesenho('poligono');
    s.clicar([1, 1]);
    s.clicar([1, 2]);
    expect(s.concluir()).toBeNull();
    s.mover([2, 2]);
    expect(s.previa()).toMatchObject({ tipo: 'Polygon' });
    s.clicar([2, 2]);
    expect(s.concluir()).toEqual({ tipo: 'Polygon', aneis: [[[1, 1], [1, 2], [2, 2]]] });
  });

  it('retângulo: dois cantos formam quatro vértices; canto alinhado não forma área', () => {
    const s = new SessaoDesenho('retangulo');
    expect(s.clicar([1, 1]).concluida).toBeUndefined();
    s.mover([3, 4]);
    expect(s.previa()).toMatchObject({ tipo: 'Polygon' });
    expect(s.clicar([3, 4]).concluida).toEqual({ tipo: 'Polygon', aneis: [[[1, 1], [1, 4], [3, 4], [3, 1]]] });
    const degenerado = new SessaoDesenho('retangulo');
    degenerado.clicar([1, 1]);
    expect(degenerado.clicar([1, 5]).concluida).toBeUndefined();
  });

  it('círculo: centro e borda, raio em metros', () => {
    const s = new SessaoDesenho('circulo');
    s.clicar([-23.5, -46.6]);
    const g = s.clicar([-23.5, -46.599]).concluida;
    expect(g).toMatchObject({ tipo: 'Circle', centro: [-23.5, -46.6] });
    expect((g as { raioMetros: number }).raioMetros).toBeCloseTo(102, 0);
    const mesmo = new SessaoDesenho('circulo');
    mesmo.clicar([1, 1]);
    expect(mesmo.clicar([1, 1]).concluida).toBeUndefined();
  });

  it('caneta: curva passa pelas âncoras; alça muda o trajeto; polígono se pedido', () => {
    const reta = amostrarBezier([{ ponto: [0, 0] }, { ponto: [0, 1] }]);
    expect(reta[0]).toEqual([0, 0]);
    expect(reta[reta.length - 1]).toEqual([0, 1]);
    expect(reta.every((p) => p[0] === 0)).toBe(true);

    const curva = amostrarBezier([{ ponto: [0, 0], alca: [1, 0.3] }, { ponto: [0, 1] }]);
    expect(Math.max(...curva.map((p) => p[0]))).toBeGreaterThan(0.1);
    expect(curva[curva.length - 1]).toEqual([0, 1]);

    const s = new SessaoDesenho('caneta');
    s.clicar([0, 0]);
    s.definirAlca([1, 0.3]);
    s.clicar([0, 1]);
    const g = s.concluir()!;
    expect(g.tipo).toBe('LineString');
    expect((g as { coordenadas: LatLonPar[] }).coordenadas.length).toBeGreaterThan(10);

    const p = new SessaoDesenho('caneta', true);
    p.clicar([0, 0]);
    p.clicar([0, 1]);
    expect(p.concluir()).toBeNull(); // polígono precisa de 3 âncoras
    p.clicar([1, 1]);
    expect(p.concluir()!.tipo).toBe('Polygon');
  });

  it('ferramentas de medição e divisão são sequenciais; conta-gotas não cria geometria', () => {
    expect(new SessaoDesenho('medir-distancia').ehSequencial).toBe(true);
    expect(new SessaoDesenho('dividir').ehSequencial).toBe(true);
    const a = new SessaoDesenho('medir-area');
    a.clicar([1, 1]);
    a.clicar([1, 2]);
    a.clicar([2, 2]);
    expect(a.concluir()!.tipo).toBe('Polygon');
    const c = new SessaoDesenho('conta-gotas');
    expect(c.clicar([1, 1])).toEqual({});
    expect(c.previa()).toBeNull();
    expect(c.concluir()).toBeNull();
  });
});

describe('feicaoNoPonto (conta-gotas)', () => {
  const proj = (p: LatLonPar) => ({ x: p[1], y: p[0] });
  const F = (id: string, geometria: Feicao['geometria']): Feicao => ({ id, camadaId: 'c', geometria, propriedades: {} });

  it('ponto vence linha vence área; entre áreas, a menor', () => {
    const grande = F('grande', { tipo: 'Polygon', aneis: [[[0, 0], [0, 100], [100, 100], [100, 0]]] });
    const pequena = F('pequena', { tipo: 'Polygon', aneis: [[[40, 40], [40, 60], [60, 60], [60, 40]]] });
    const linha = F('linha', { tipo: 'LineString', coordenadas: [[50, 0], [50, 100]] });
    const ponto = F('ponto', { tipo: 'Point', coordenada: [50, 50] });
    const cursor = { x: 50, y: 50 };
    expect(feicaoNoPonto(cursor, [grande, pequena, linha, ponto], proj)?.id).toBe('ponto');
    expect(feicaoNoPonto(cursor, [grande, pequena, linha], proj)?.id).toBe('linha');
    expect(feicaoNoPonto(cursor, [grande, pequena], proj)?.id).toBe('pequena');
    expect(feicaoNoPonto({ x: 500, y: 500 }, [grande, pequena, linha, ponto], proj)).toBeNull();
    expect(feicaoNoPonto(cursor, [{ ...ponto, excluida: true }], proj)).toBeNull();
  });

  it('círculo acerta por dentro', () => {
    const c = F('c', { tipo: 'Circle', centro: [50, 50], raioMetros: 5_560_000 }); // ≈ 50° de latitude ≈ 50 px na projeção identidade
    expect(feicaoNoPonto({ x: 52, y: 50 }, [c], proj)?.id).toBe('c');
  });
});

describe('barra de ferramentas (atributo)', () => {
  it('sem atributo não mostra nada; "todas" mostra as 15; lista respeita a ordem canônica e ignora nomes inválidos', () => {
    expect(interpretarFerramentas(null)).toEqual([]);
    expect(interpretarFerramentas('')).toEqual([]);
    expect(interpretarFerramentas('todas')).toHaveLength(15);
    expect(interpretarFerramentas('poligono, linha  xyz')).toEqual(['linha', 'poligono']);
  });
});
