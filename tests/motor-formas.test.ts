// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { MotorFormas } from '../src/gerencigeo-canvas/motor/motor-formas';
import { COR_SELECAO } from '../src/gerencigeo-canvas/motor/estilo';
import { metrosPorPixel, projetarVertices, raioCirculoPx, simplificarPx } from '../src/gerencigeo-canvas/motor/geometria-px';
import { RegraVersoes } from '../src/gerencigeo-canvas/feature_versoes';
import { caixasSeTocam, type CaixaGeo } from '../src/gerencigeo-canvas/feature_indice';
import { projetarMercator } from '../src/gerencigeo-canvas/feature_lod';
import type { Feicao, LatLonPar } from '../src/gerencigeo-canvas/feature_types';
import type { DefCamadaMotor, ItemDesenho, ListaDesenho, Vista } from '../src/gerencigeo-canvas/motor/tipos';

/*
 * Fase 2 do motor de formas: testado só com vitest, em Node, sem DOM e sem Leaflet (a diretiva acima prova que o
 * motor roda sem `window`). Camada A: dados puros, propriedade e equivalência.
 */

const mLat = 1 / 111320;
const mLon = (lat: number) => 1 / (111320 * Math.cos((Math.abs(lat) * Math.PI) / 180));

const def = (id = 'c', extra: Partial<DefCamadaMotor> = {}): DefCamadaMotor => ({
  id, zIndex: 600, opacidade: 1, visivel: true, interativo: true, estilo: { corPrimaria: '#ff0000' }, ...extra
});

const quadrado = (id: string, lat: number, lon: number, lado: number, extra: Partial<Feicao> = {}): Feicao => ({
  id, camadaId: 'c', propriedades: {},
  geometria: { tipo: 'Polygon', aneis: [[[lat, lon], [lat, lon + lado * mLon(lat)], [lat + lado * mLat, lon + lado * mLon(lat)], [lat + lado * mLat, lon]]] },
  ...extra
});
const ponto = (id: string, lat: number, lon: number, extra: Partial<Feicao> = {}): Feicao => ({
  id, camadaId: 'c', propriedades: {}, geometria: { tipo: 'Point', coordenada: [lat, lon] }, ...extra
});
const linha = (id: string, a: LatLonPar, b: LatLonPar): Feicao => ({
  id, camadaId: 'c', propriedades: {}, geometria: { tipo: 'LineString', coordenadas: [a, b] }
});

/** Vista de 800×600 px centrada em [-23.5, -46.6]. */
function vistaEm(zoom: number, centro: LatLonPar = [-23.5, -46.6], w = 800, h = 600): Vista {
  const c = projetarMercator(centro[0], centro[1], zoom);
  const esq = c.x - w / 2;
  const topo = c.y - h / 2;
  const escala = 256 * 2 ** zoom;
  const lon = (x: number) => (x / escala) * 360 - 180;
  const lat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / escala))) * 180) / Math.PI;
  return {
    zoom, larguraPx: w, alturaPx: h, dpr: 1, origemPx: { x: esq, y: topo },
    caixa: { minLon: lon(esq), maxLon: lon(esq + w), maxLat: lat(topo), minLat: lat(topo + h) }
  };
}

function motorCom(feicoes: Feicao[], d: DefCamadaMotor = def()): MotorFormas {
  const m = new MotorFormas();
  m.definirCamada(d);
  m.definirFeicoes(d.id, feicoes);
  return m;
}

const ids = (l: ListaDesenho, forma?: ItemDesenho['forma']): string[] =>
  l.camadas.flatMap((c) => c.itens).filter((i) => !forma || i.forma === forma).map((i) => i.id).sort();

function semente(n: number) {
  let s = n;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

describe('geometria em pixels', () => {
  it('projeção igual à do Leaflet (EPSG:3857, tiles de 256) e em Float64Array plano', () => {
    const p = projetarVertices([[-23.5, -46.6], [10, 20]], 12);
    expect(p).toBeInstanceOf(Float64Array);
    const a = projetarMercator(-23.5, -46.6, 12);
    expect(p[0]).toBeCloseTo(a.x, 6);
    expect(p[1]).toBeCloseTo(a.y, 6);
    expect(p).toHaveLength(4);
  });

  it('círculo em metros: o raio em px dobra a cada zoom e cresce com a latitude', () => {
    const r12 = raioCirculoPx(-23.5, 1000, 12);
    expect(raioCirculoPx(-23.5, 1000, 13)).toBeCloseTo(r12 * 2, 6);
    expect(raioCirculoPx(-60, 1000, 12)).toBeGreaterThan(raioCirculoPx(0, 1000, 12));
    expect(r12 * metrosPorPixel(-23.5, 12)).toBeCloseTo(1000, 6);
    expect(raioCirculoPx(0, NaN, 12)).toBe(0);
    expect(raioCirculoPx(0, -5, 12)).toBe(0);
  });

  it('Douglas-Peucker em px: ruído abaixo da tolerância some; desvio maior fica; anel nunca tem menos de 3 vértices', () => {
    const reta = (desvio: number) => Float64Array.from(Array.from({ length: 21 }, (_, i) => [i * 5, i === 10 ? desvio : 0]).flat());
    expect(simplificarPx(reta(0.5), 1.2, false)).toHaveLength(4);
    expect(simplificarPx(reta(3), 1.2, false).length).toBeGreaterThan(4);
    const tri = Float64Array.from([0, 0, 10, 0, 5, 0.1]);
    expect(simplificarPx(tri, 100, true).length).toBeGreaterThanOrEqual(6);
    const entrada = reta(0.5);
    const copia = Array.from(entrada);
    simplificarPx(entrada, 1.2, false);
    expect(Array.from(entrada)).toEqual(copia); // não muta
    expect(simplificarPx(entrada, 0, false)).toBe(entrada);
    expect(simplificarPx(entrada, NaN, false)).toBe(entrada);
  });
});

describe('lista de desenho: o que cruza a vista e passa no LOD', () => {
  it('formas grandes viram forma, formas minúsculas viram marca, e cada feição aparece uma única vez', () => {
    const m = motorCom([quadrado('grande', -23.5, -46.6, 600), quadrado('pequena', -23.5, -46.59, 30)]);
    const l = m.listaDesenho(vistaEm(12));
    expect(ids(l, 'poligono')).toEqual(['grande']);
    expect(ids(l, 'marca')).toEqual(['pequena']);
    expect(ids(l)).toEqual(['grande', 'pequena']);
    expect(l.camadas[0].estatisticas).toMatchObject({ total: 2, desenhadas: 1, marcasLOD: 1 });
  });

  it('propriedade: a lista tem exatamente as feições que cruzam a caixa, com 6 px de folga de traço (aleatório, sem cache e com cache)', () => {
    const r = semente(5);
    const fs: Feicao[] = Array.from({ length: 600 }, (_, i) =>
      quadrado(`q${i}`, -23.5 + (r() - 0.5) * 0.3, -46.6 + (r() - 0.5) * 0.3, r() < 0.5 ? 30 : 400));
    const m = motorCom(fs);
    for (const zoom of [11, 13, 15]) {
      const v = vistaEm(zoom);
      const mLonPx = (360 / (256 * 2 ** zoom)) * 6; // folga de 6 px para o traço de quem está logo fora
      const mLatPx = mLonPx * Math.cos((((v.caixa.minLat + v.caixa.maxLat) / 2) * Math.PI) / 180);
      const comFolga: CaixaGeo = { minLat: v.caixa.minLat - mLatPx, maxLat: v.caixa.maxLat + mLatPx, minLon: v.caixa.minLon - mLonPx, maxLon: v.caixa.maxLon + mLonPx };
      const esperado = fs.filter((f) => caixasSeTocam(caixaDe(f), comFolga)).map((f) => f.id).sort();
      expect(ids(m.listaDesenho(v))).toEqual(esperado);
      expect(ids(m.listaDesenho(v))).toEqual(esperado); // segunda vez, com cache
    }
  });

  it('resultado igual com e sem cache (motor novo × motor já usado, mesma geometria projetada)', () => {
    const r = semente(9);
    const fs = Array.from({ length: 200 }, (_, i) => quadrado(`q${i}`, -23.5 + (r() - 0.5) * 0.1, -46.6 + (r() - 0.5) * 0.1, 100 + r() * 300));
    const usado = motorCom(fs);
    usado.listaDesenho(vistaEm(10));
    usado.listaDesenho(vistaEm(14, [-23.4, -46.5]));
    const v = vistaEm(13);
    const a = resumo(usado.listaDesenho(v));
    const b = resumo(motorCom(fs).listaDesenho(v));
    expect(a).toEqual(b);
  });

  it('pan puro não reprojeta: a mesma geometria projetada (mesmo array) volta no mesmo zoom', () => {
    const m = motorCom([quadrado('a', -23.5, -46.6, 600), quadrado('b', -23.501, -46.601, 600)]);
    const l1 = m.listaDesenho(vistaEm(14));
    const l2 = m.listaDesenho(vistaEm(14, [-23.5, -46.598]));
    const g1 = l1.camadas[0].itens.find((i) => i.id === 'a')!.geometriaEmPx[0];
    const g2 = l2.camadas[0].itens.find((i) => i.id === 'a')!.geometriaEmPx[0];
    expect(g2).toBe(g1);
    expect(l2.origem.x).not.toBe(l1.origem.x); // só a origem muda
  });

  it('o LOD é avaliado uma vez por (feição, zoom): no pan não cresce, ao trocar de zoom sim', () => {
    const fs = Array.from({ length: 100 }, (_, i) => quadrado(`q${i}`, -23.5 + i * 1e-4, -46.6, 30));
    const m = motorCom(fs);
    m.listaDesenho(vistaEm(12));
    const base = m.estatisticas('c')!.avaliacoesLOD;
    expect(base).toBe(100);
    m.listaDesenho(vistaEm(12, [-23.5, -46.599]));
    expect(m.estatisticas('c')!.avaliacoesLOD).toBe(base);
    m.listaDesenho(vistaEm(13));
    expect(m.estatisticas('c')!.avaliacoesLOD).toBeGreaterThan(base);
  });

  it('hit-test e consulta por caixa usam a geometria ORIGINAL: o LOD não esconde a feição de 1 px', () => {
    const m = motorCom([quadrado('p', -23.5, -46.6, 20)]);
    const caixa: CaixaGeo = { minLat: -23.51, maxLat: -23.49, minLon: -46.61, maxLon: -46.59 };
    const antes = m.consultarCaixa('c', caixa).map((f) => f.id);
    expect(ids(m.listaDesenho(vistaEm(10)), 'marca')).toEqual(['p']); // virou marca...
    expect(m.consultarCaixa('c', caixa).map((f) => f.id)).toEqual(antes); // ...mas segue achável
    expect(antes).toEqual(['p']);
    expect(ids(m.listaDesenho(vistaEm(18)), 'poligono')).toEqual(['p']);
    expect(m.consultarCaixa('c', caixa).map((f) => f.id)).toEqual(antes);
  });

  it('linha longa e fina continua visível; ponto e texto nunca viram marca', () => {
    const m = motorCom([
      linha('l', [-23.5, -46.6], [-23.5, -46.55]), ponto('p', -23.5, -46.6),
      { id: 't', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Text', coordenada: [-23.5, -46.6], texto: 'x' } }
    ]);
    const l = m.listaDesenho(vistaEm(12));
    expect(ids(l, 'linha')).toEqual(['l']);
    expect(ids(l, 'ponto')).toEqual(['p']);
    expect(ids(l, 'texto')).toEqual(['t']);
    expect(ids(l, 'marca')).toEqual([]);
  });

  it('ordem de empilhamento: camadas por zIndex; dentro da camada, marcas < áreas < linhas < pontos < DOM', () => {
    const m = new MotorFormas();
    m.definirCamada(def('topo', { zIndex: 900 }));
    m.definirCamada(def('base', { zIndex: 100 }));
    m.definirFeicoes('base', [quadrado('b', -23.5, -46.6, 500)]);
    m.definirFeicoes('topo', [
      ponto('pt', -23.5, -46.6), linha('ln', [-23.5, -46.6], [-23.5, -46.59]), quadrado('area', -23.5, -46.6, 500),
      quadrado('mini', -23.5, -46.6, 10),
      { id: 'tx', camadaId: 'topo', propriedades: {}, geometria: { tipo: 'Text', coordenada: [-23.5, -46.6], texto: 'x' } }
    ]);
    const l = m.listaDesenho(vistaEm(12));
    expect(l.camadas.map((c) => c.camadaId)).toEqual(['base', 'topo']);
    expect(l.camadas[1].itens.map((i) => i.forma)).toEqual(['marca', 'poligono', 'linha', 'ponto', 'texto']);
  });

  it('camada invisível não entra; filtro por camadas; opacidade e zIndex vão na lista', () => {
    const m = new MotorFormas();
    m.definirCamada(def('a', { opacidade: 0.4, zIndex: 700 }));
    m.definirCamada(def('b', { visivel: false }));
    m.definirFeicoes('a', [quadrado('x', -23.5, -46.6, 500)]);
    m.definirFeicoes('b', [quadrado('y', -23.5, -46.6, 500)]);
    const l = m.listaDesenho(vistaEm(14));
    expect(l.camadas).toHaveLength(1);
    expect(l.camadas[0]).toMatchObject({ camadaId: 'a', opacidade: 0.4, zIndex: 700 });
    expect(m.listaDesenho(vistaEm(14), { camadas: ['b'] }).camadas).toHaveLength(0);
  });

  it('círculo: raio em px por zoom e latitude', () => {
    const c: Feicao = { id: 'c1', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Circle', centro: [-23.5, -46.6], raioMetros: 500 } };
    const m = motorCom([c]);
    const it12 = m.listaDesenho(vistaEm(12)).camadas[0].itens[0];
    const it13 = m.listaDesenho(vistaEm(13)).camadas[0].itens[0];
    expect(it12.forma).toBe('circulo');
    expect(it13.raioPx).toBeCloseTo(it12.raioPx * 2, 6);
    expect(it12.raioPx).toBeCloseTo(500 / metrosPorPixel(-23.5, 12), 6);
  });

  it('simplifica só o desenho: abaixo do zoom 17 há menos vértices e a feição original fica intacta', () => {
    const coords: LatLonPar[] = Array.from({ length: 400 }, (_, i) => [-23.5 + i * 1e-4, -46.6 + (i % 2) * 1e-7]);
    const f: Feicao = { id: 'l', camadaId: 'c', propriedades: {}, geometria: { tipo: 'LineString', coordenadas: coords } };
    const m = motorCom([f]);
    const item = m.listaDesenho(vistaEm(10)).camadas[0].itens[0];
    expect(item.forma).toBe('linha');
    expect(item.geometriaEmPx[0].length / 2).toBeLessThan(10);
    expect(m.feicao('c', 'l')!.geometria).toBe(f.geometria);
    expect((f.geometria as { coordenadas: LatLonPar[] }).coordenadas).toHaveLength(400);
    const alto = m.listaDesenho(vistaEm(17, [-23.48, -46.6])).camadas[0].itens[0];
    expect(alto.geometriaEmPx[0].length / 2).toBeLessThanOrEqual(400);
    expect(alto.geometriaEmPx[0].length / 2).toBeGreaterThan(300);
  });
});

describe('parte da lista: canvas × marcadores DOM (pan incremental)', () => {
  const cena = (): Feicao[] => [
    quad_('forma', -23.5, -46.6, 500), quad_('mini', -23.5, -46.59, 20), ponto('p', -23.5, -46.58),
    ponto('ico', -23.5, -46.57, { estilo: { icone: 'tower' } }),
    { id: 'tx', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Text', coordenada: [-23.5, -46.56], texto: 'x' } },
    quad_('rot', -23.5, -46.55, 500, { estilo: { mostrarRotulo: true, campoRotulo: 'n' }, propriedades: { n: 'R' } })
  ];
  const quad_ = quadrado;

  it("'canvas' só traz marcas, formas e pontos sem ícone; 'dom' só ícone, texto, cluster e rótulo; 'tudo' traz os dois", () => {
    const m = motorCom(cena());
    const v = vistaEm(12, [-23.5, -46.575]);
    const canvas = m.listaDesenho(v, { parte: 'canvas' });
    const dom = m.listaDesenho(v, { parte: 'dom' });
    const tudo = m.listaDesenho(v);
    expect(ids(canvas)).toEqual(['forma', 'mini', 'p', 'rot']);
    expect(ids(dom)).toEqual(['ico', 'rotulo:rot', 'tx']);
    expect(ids(tudo)).toEqual([...ids(canvas), ...ids(dom)].sort());
  });

  it("'dom' não projeta nem simplifica formas (só o rótulo): o cache de geometria fica vazio", () => {
    const m = motorCom(cena());
    m.listaDesenho(vistaEm(14, [-23.5, -46.575]), { parte: 'dom' });
    expect(m.estatisticas('c')!.avaliacoesLOD).toBe(0);
  });

  it("clusters são DOM: 'canvas' não os traz e 'dom' sim; o ponto restante de uma célula continua respeitando a parte", () => {
    const m = motorCom(Array.from({ length: 30 }, (_, i) => ponto(`p${i}`, -23.5 + i * 1e-6, -46.6)));
    const v = vistaEm(13);
    expect(ids(m.listaDesenho(v, { parte: 'canvas' }), 'cluster')).toEqual([]);
    expect(ids(m.listaDesenho(v, { parte: 'dom' }), 'cluster')).toHaveLength(1);
  });

  it('as estatísticas guardadas vêm só da lista completa (faixas parciais não as sobrescrevem)', () => {
    const m = motorCom(cena());
    const v = vistaEm(12, [-23.5, -46.575]);
    m.listaDesenho(v);
    const completa = m.estatisticas('c')!;
    m.listaDesenho({ ...v, caixa: { ...v.caixa, maxLon: v.caixa.minLon + 1e-6 } }, { parte: 'canvas' });
    expect(m.estatisticas('c')).toEqual(completa);
  });

  it('faixa exposta: tudo o que a vista completa pinta dentro da faixa também está na lista da faixa (com a folga de traço)', () => {
    const r = semente(77);
    const fs: Feicao[] = Array.from({ length: 800 }, (_, i) => quadrado(`q${i}`, -23.5 + (r() - 0.5) * 0.06, -46.6 + (r() - 0.5) * 0.06, r() < 0.5 ? 25 : 300));
    const m = motorCom(fs);
    const zoom = 14;
    const v = vistaEm(zoom, [-23.5, -46.6], 800, 600);
    const completa = m.listaDesenho(v, { parte: 'canvas' }).camadas[0].itens;
    const o = v.origemPx!;
    // faixa direita de 120 px, e a mesma vista pedida só para ela (com 8 px de folga, como no renderizador)
    const faixa = { x: 680, y: 0, largura: 120, altura: 600 };
    const folga = 8;
    const e = 256 * 2 ** zoom;
    const lat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / e))) * 180) / Math.PI;
    const lon = (x: number) => (x / e) * 360 - 180;
    const vf: Vista = {
      ...v, larguraPx: faixa.largura, alturaPx: faixa.altura,
      caixa: { minLon: lon(o.x + faixa.x - folga), maxLon: lon(o.x + faixa.x + faixa.largura + folga), maxLat: lat(o.y - folga), minLat: lat(o.y + faixa.altura + folga) }
    };
    const dasFaixa = new Set(m.listaDesenho(vf, { parte: 'canvas' }).camadas[0].itens.map((i) => i.id));
    const intersectaFaixa = (i: ItemDesenho): boolean => {
      const xs = i.geometriaEmPx.flatMap((g) => Array.from(g).filter((_, k) => k % 2 === 0)).map((x) => x - o.x);
      return xs.length > 0 && Math.max(...xs) >= faixa.x && Math.min(...xs) <= faixa.x + faixa.largura;
    };
    const esperados = completa.filter(intersectaFaixa).map((i) => i.id);
    expect(esperados.length).toBeGreaterThan(5);
    for (const id of esperados) expect(dasFaixa.has(id)).toBe(true);
  });
});

describe('estilo, seleção e edição', () => {
  it('o canvas base não depende da seleção; a sobreposição traz as selecionadas em detalhe completo', () => {
    const m = motorCom([quadrado('a', -23.5, -46.6, 40), quadrado('b', -23.5, -46.59, 600)]);
    const v = vistaEm(12);
    const antes = resumo(m.listaDesenho(v), true);
    const r = m.selecionar('c', ['a', 'b']);
    expect(r.entrou.sort()).toEqual(['a', 'b']);
    expect(resumo(m.listaDesenho(v), true)).toEqual(antes); // a (marca) continua marca no base
    const sobre = m.listaSobreposicao('c', v)!;
    expect(sobre.itens.map((i) => [i.id, i.forma]).sort()).toEqual([['a', 'poligono'], ['b', 'poligono']]);
    expect(sobre.itens.every((i) => i.estilo.cor === COR_SELECAO && i.selecionada)).toBe(true);
    expect(m.selecionar('c', ['b'])).toEqual({ entrou: [], saiu: ['a'] });
    expect(m.listaSobreposicao('c', v)!.itens.map((i) => i.id)).toEqual(['b']);
  });

  it('estilo: tracejado de prévia, círculo, ponto com contorno próprio e cores inseguras caem no padrão', () => {
    const m = motorCom([
      quadrado('previa', -23.5, -46.6, 500, { status: 'previa' }),
      quadrado('cor', -23.5, -46.59, 500, { estilo: { corTraco: 'url(javascript:1)' } }),
      ponto('p', -23.5, -46.58, { estilo: { corContorno: '#00ff00', espessuraContorno: 0, corPreenchimento: '#0000ff' } })
    ], def('c', { estilo: { corPrimaria: '#ff0000', espessuraLinha: 3 } }));
    const itens = m.listaDesenho(vistaEm(14, [-23.5, -46.59])).camadas[0].itens;
    const por = (id: string) => itens.find((i) => i.id === id)!;
    expect(por('previa').estilo.dash).toBe('6 4');
    expect(por('previa').estilo.peso).toBe(3);
    expect(por('cor').estilo.cor).toBe('#38bdf8');
    expect(por('p').estilo.traco).toBe(false);
    expect(por('p').estilo.corPreenchimento).toBe('#0000ff');
  });

  it('itens iguais compartilham o objeto de estilo (o pintor agrupa por identidade)', () => {
    const m = motorCom(Array.from({ length: 50 }, (_, i) => quadrado(`q${i}`, -23.5 + i * 1e-3, -46.6, 400)));
    const itens = m.listaDesenho(vistaEm(13)).camadas[0].itens;
    expect(new Set(itens.map((i) => i.estilo)).size).toBe(1);
  });

  it('previsualizar tira a feição do base e a leva à sobreposição com a geometria nova; a feição real encerra a prévia', () => {
    const f = quadrado('a', -23.5, -46.6, 500);
    const m = motorCom([f]);
    const v = vistaEm(14);
    m.previsualizar('c', quadrado('a', -23.5, -46.6, 900));
    expect(ids(m.listaDesenho(v))).toEqual([]);
    expect(m.listaSobreposicao('c', v)!.itens.map((i) => i.id)).toEqual(['a']);
    const nova = quadrado('a', -23.5, -46.6, 700);
    m.aplicarDelta('c', [nova], { base: m.feicao('c', 'a') ? (m as unknown as { camadas: Map<string, { dados: { listaSincronizada: Feicao[] } }> }).camadas.get('c')!.dados.listaSincronizada : [], mudadas: [nova], removidas: [] });
    expect(ids(m.listaDesenho(v))).toEqual(['a']);
    expect(m.temPrevia('c', 'a')).toBe(false);
  });

  it('destacar leva a feição à sobreposição com destaque', () => {
    const m = motorCom([quadrado('a', -23.5, -46.6, 500)]);
    m.destacar('c', ['a']);
    expect(m.listaSobreposicao('c', vistaEm(14))!.itens[0].destaque).toBe(true);
    m.destacar('c', []);
    expect(m.listaSobreposicao('c', vistaEm(14))!.itens).toHaveLength(0);
  });
});

describe('oculta × excluida e oficial × prévia', () => {
  it('oculta existe nos dados mas não é desenhada nem consultada; excluida sai de tudo', () => {
    const m = motorCom([quadrado('a', -23.5, -46.6, 500), quadrado('b', -23.5, -46.59, 500, { oculta: true }), quadrado('c', -23.5, -46.58, 500, { excluida: true })]);
    expect(ids(m.listaDesenho(vistaEm(13, [-23.5, -46.59])))).toEqual(['a']);
    const caixa: CaixaGeo = { minLat: -24, maxLat: -23, minLon: -47, maxLon: -46 };
    expect(m.consultarCaixa('c', caixa).map((f) => f.id)).toEqual(['a']);
    expect(m.feicao('c', 'b')?.oculta).toBe(true); // continua nos dados
    expect(m.feicao('c', 'c')).toBeUndefined();
  });

  it('com oficial na entidade a prévia fica escondida até a regra liberar; pares ficam em detalhe completo', () => {
    const regra = new RegraVersoes();
    const m = new MotorFormas();
    m.definirRegra((f, of) => regra.visivel(f, of));
    m.definirCamada(def());
    m.definirFeicoes('c', [quadrado('of', -23.5, -46.6, 30, { entidadeId: 'e' }), quadrado('pv', -23.5, -46.59, 30, { entidadeId: 'e', status: 'previa' }), quadrado('solta', -23.5, -46.58, 30)]);
    const v = vistaEm(12);
    let l = m.listaDesenho(v);
    expect(ids(l, 'poligono')).toEqual(['of']); // par: oficial em detalhe completo (apesar de minúscula)
    expect(ids(l, 'marca')).toEqual(['solta']);
    regra.global = true;
    m.reavaliarVersoes('c');
    l = m.listaDesenho(v);
    expect(ids(l, 'poligono')).toEqual(['of', 'pv']);
    regra.global = false;
    m.reavaliarVersoes('c');
    expect(ids(m.listaDesenho(v), 'poligono')).toEqual(['of']);
  });

  it('prévia sem oficial na entidade aparece sempre', () => {
    const regra = new RegraVersoes();
    const m = new MotorFormas();
    m.definirRegra((f, of) => regra.visivel(f, of));
    m.definirCamada(def());
    m.definirFeicoes('c', [quadrado('so', -23.5, -46.6, 500, { entidadeId: 'x', status: 'previa' })]);
    expect(ids(m.listaDesenho(vistaEm(14)))).toEqual(['so']);
  });
});

describe('pontos, clusters e marcadores DOM', () => {
  const muitos = (n: number) => Array.from({ length: n }, (_, i) => ponto(`p${i}`, -23.5 + i * 1e-6, -46.6));

  it('até 8 pontos nunca agrupam; acima disso, zoom baixo vira cluster e zoom ≥ 17 desmembra', () => {
    expect(ids(motorCom(muitos(8)).listaDesenho(vistaEm(12)), 'cluster')).toEqual([]);
    expect(ids(motorCom(muitos(8)).listaDesenho(vistaEm(12)), 'ponto')).toHaveLength(8);
    const m = motorCom(muitos(50));
    const l = m.listaDesenho(vistaEm(14));
    expect(ids(l, 'ponto')).toEqual([]);
    const cluster = l.camadas[0].itens.find((i) => i.forma === 'cluster')!;
    expect(cluster.total).toBe(50);
    expect(l.camadas[0].estatisticas.clusters).toBe(1);
    expect(ids(m.listaDesenho(vistaEm(17)), 'ponto')).toHaveLength(50);
  });

  it('selecionar um ponto o separa do cluster (na sobreposição); o canvas base não muda; desmarcar agrupa de novo', () => {
    const m = motorCom(muitos(50));
    const v = vistaEm(14);
    const antes = resumo(m.listaDesenho(v, { parte: 'canvas' }), true);
    m.selecionar('c', ['p3']);
    expect(m.selecaoAfetaAgrupamento('c', ['p3'])).toBe(true);
    const l = m.listaDesenho(v);
    expect(ids(l, 'ponto')).toEqual([]); // o base nunca desenha ponto de cluster, selecionado ou não
    expect(resumo(m.listaDesenho(v, { parte: 'canvas' }), true)).toEqual(antes);
    expect(l.camadas[0].itens.find((i) => i.forma === 'cluster')).toMatchObject({ total: 50, restantes: 49 });
    expect(m.listaSobreposicao('c', v)!.itens.map((i) => i.id)).toEqual(['p3']);
    m.selecionar('c', []);
    expect(ids(m.listaDesenho(v), 'ponto')).toEqual([]);
    expect(m.listaSobreposicao('c', v)!.itens).toHaveLength(0);
  });

  it('com um único restante na célula ele volta a ser ponto individual: na sobreposição, junto com os selecionados', () => {
    const m = motorCom([...muitos(9)]);
    const v = vistaEm(14);
    const sel = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    m.selecionar('c', sel);
    m.listaDesenho(v); // constrói o agrupador
    const l = m.listaDesenho(v);
    expect(ids(l, 'cluster')).toEqual([]);
    expect(ids(l, 'ponto')).toEqual([]);
    expect(m.listaSobreposicao('c', v)!.itens.map((i) => i.id).sort()).toEqual([...sel, 'p8']);
    expect(m.listaSobreposicao('c', v)!.itens.find((i) => i.id === 'p8')).toMatchObject({ selecionada: false, forma: 'ponto' });
  });

  it('ícone, texto, rótulo e curva são marcadores DOM / caminho legado, com a feição de origem', () => {
    const icone = ponto('i', -23.5, -46.6, { estilo: { icone: 'tower' } });
    const rotulado = quadrado('r', -23.5, -46.59, 500, { estilo: { mostrarRotulo: true, campoRotulo: 'nome' }, propriedades: { nome: 'Gleba' } });
    const curva: Feicao = {
      id: 'cv', camadaId: 'c', propriedades: {},
      geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.59]], curva: [{ ponto: [-23.5, -46.6] }, { ponto: [-23.5, -46.59] }] }
    };
    const l = motorCom([icone, rotulado, curva]).listaDesenho(vistaEm(14, [-23.5, -46.595]));
    expect(ids(l, 'icone')).toEqual(['i']);
    expect(ids(l, 'rotulo')).toEqual(['rotulo:r']);
    expect(l.camadas[0].itens.find((i) => i.forma === 'rotulo')!.texto).toBe('Gleba');
    expect(ids(l, 'curva')).toEqual(['cv']);
    expect(ids(l, 'poligono')).toEqual(['r']); // com rótulo: detalhe completo mesmo pequena
    expect(l.camadas[0].estatisticas.marcadoresDom).toBe(3);
  });
});

describe('delta = completo (sequências aleatórias)', () => {
  function sequencia(zoom: number, inicial: number, rodadas: number, opcoes: { versoes?: boolean } = {}) {
    const r = semente(31 + zoom);
    const gerar = (id: string): Feicao => {
      const lat = -23.5 + (r() - 0.5) * 0.04;
      const lon = -46.6 + (r() - 0.5) * 0.04;
      const k = r();
      const extra: Partial<Feicao> = {};
      if (opcoes.versoes && r() < 0.15) { extra.entidadeId = `e${Math.floor(r() * 4)}`; extra.status = r() < 0.5 ? 'previa' : 'oficial'; }
      if (r() < 0.05) extra.oculta = true;
      if (k < 0.5) return quadrado(id, lat, lon, r() < 0.5 ? 30 : 300, extra);
      if (k < 0.75) return linha(id, [lat, lon], [lat + r() * 0.002, lon + r() * 0.002]);
      return ponto(id, lat, lon, extra);
    };
    const regra = new RegraVersoes();
    const novoMotor = () => { const m = new MotorFormas(); m.definirRegra((f, of) => regra.visivel(f, of)); m.definirCamada(def()); return m; };
    const a = novoMotor();
    let atual: Feicao[] = Array.from({ length: inicial }, (_, i) => gerar(`p${i}`));
    a.definirFeicoes('c', atual);
    let proximo = inicial;
    for (let k = 0; k < rodadas; k++) {
      const remover = Array.from({ length: 3 }, () => atual[Math.floor(r() * atual.length)].id);
      const mudadas = [
        ...Array.from({ length: 4 }, () => ({ ...gerar('x'), id: atual[Math.floor(r() * atual.length)].id })).filter((u) => !remover.includes(u.id)),
        ...Array.from({ length: 5 }, () => gerar(`p${proximo++}`))
      ];
      const idsMud = new Set(mudadas.map((m) => m.id));
      const nova = [...atual.filter((f) => !remover.includes(f.id) && !idsMud.has(f.id)), ...mudadas];
      a.aplicarDelta('c', nova, { base: atual, mudadas, removidas: remover });
      atual = nova;
      if (k % 3 === 0) a.selecionar('c', atual.filter(() => r() < 0.05).map((f) => f.id));
    }
    const b = novoMotor();
    b.definirFeicoes('c', atual);
    b.selecionar('c', a.selecionadas('c'));
    return { a, b };
  }

  const v = (zoom: number) => vistaEm(zoom);

  it.each([12, 14, 17])('zoom %i: incremental concorda com o completo (formas, marcas, clusters, pontos)', (zoom) => {
    const { a, b } = sequencia(zoom, 150, 12);
    expect(resumo(a.listaDesenho(v(zoom)))).toEqual(resumo(b.listaDesenho(v(zoom))));
  });

  it('com oficial × prévia e oculta', () => {
    const { a, b } = sequencia(12, 160, 12, { versoes: true });
    expect(resumo(a.listaDesenho(v(12)))).toEqual(resumo(b.listaDesenho(v(12))));
  });

  it('delta que não parte da lista sincronizada cai no caminho completo e continua certo', () => {
    const m = motorCom([quadrado('a', -23.5, -46.6, 500)]);
    const lista = [quadrado('a', -23.5, -46.6, 500), quadrado('b', -23.5, -46.59, 500)];
    m.aplicarDelta('c', lista, { base: [], mudadas: [lista[1]], removidas: [] });
    expect(ids(m.listaDesenho(vistaEm(13, [-23.5, -46.595])))).toEqual(['a', 'b']);
  });
});

describe('entrada hostil (Regra #0): nunca lança', () => {
  it('camada inexistente, vista inválida e listas nulas', () => {
    const m = new MotorFormas();
    expect(() => {
      m.definirFeicoes('nao-existe', [quadrado('a', 0, 0, 10)]);
      m.aplicarDelta('nao-existe', [], { base: [], mudadas: [], removidas: [] });
      m.selecionar('nao-existe', ['a']);
      m.previsualizar('nao-existe', quadrado('a', 0, 0, 10));
      m.destacar('nao-existe', ['a']);
      m.consultarCaixa('nao-existe', { minLat: 0, maxLat: 1, minLon: 0, maxLon: 1 });
      m.reavaliarVersoes('nao-existe');
      m.definirCamada(null as unknown as DefCamadaMotor);
    }).not.toThrow();
    expect(m.listaDesenho(vistaEm(12)).camadas).toEqual([]);
    const c = motorCom([quadrado('a', -23.5, -46.6, 500)]);
    for (const zoom of [NaN, -3, Infinity]) expect(c.listaDesenho({ ...vistaEm(12), zoom }).camadas).toEqual([]);
    expect(c.listaDesenho({ ...vistaEm(12), caixa: { minLat: NaN, maxLat: 1, minLon: 0, maxLon: 1 } }).camadas).toEqual([]);
    expect(c.listaDesenho(null as unknown as Vista).camadas).toEqual([]);
    expect(() => c.definirFeicoes('c', null as unknown as Feicao[])).not.toThrow();
  });

  it('geometria degenerada, NaN, ids duplicados e círculo infinito não derrubam a lista', () => {
    const ruins: Feicao[] = [
      quadrado('nan', NaN, NaN, 40),
      { id: 'vazio', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Polygon', aneis: [[]] } },
      { id: 'dois', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Polygon', aneis: [[[0, 0], [1, 1]]] } },
      { id: 'dup', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.6], [-23.5, -46.6]]] } },
      { id: 'dup', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.6], [-23.5, -46.6]]] } },
      { id: 'inf', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Circle', centro: [-23.5, -46.6], raioMetros: Infinity } },
      { id: 'sem-geo', camadaId: 'c', propriedades: {} } as unknown as Feicao,
      linha('curta', [-23.5, -46.6], [-23.5, -46.6]),
      ponto('pnan', NaN, NaN)
    ];
    const m = new MotorFormas();
    m.definirCamada(def());
    expect(() => {
      m.definirFeicoes('c', ruins);
      for (const z of [3, 12, 18]) m.listaDesenho(vistaEm(z));
      m.selecionar('c', ['nan', 'dup', 'fantasma']);
      m.listaSobreposicao('c', vistaEm(14));
      m.selecionar('c', []);
    }).not.toThrow();
  });

  it('10 mil feições em vista distante e zoom extremo não lançam e respondem', () => {
    const r = semente(2);
    const fs = Array.from({ length: 10000 }, (_, i) => quadrado(`q${i}`, -23.5 + (r() - 0.5) * 2, -46.6 + (r() - 0.5) * 2, 50));
    const m = motorCom(fs);
    expect(() => { for (const z of [0, 5, 22]) m.listaDesenho(vistaEm(z)); }).not.toThrow();
  });
});

// ---------------------------------------------------------------- helpers de comparação

function caixaDe(f: Feicao): CaixaGeo {
  const pts = (f.geometria as { aneis: LatLonPar[][] }).aneis[0];
  return {
    minLat: Math.min(...pts.map((p) => p[0])), maxLat: Math.max(...pts.map((p) => p[0])),
    minLon: Math.min(...pts.map((p) => p[1])), maxLon: Math.max(...pts.map((p) => p[1]))
  };
}

/** Forma comparável de uma lista: por camada, itens ordenados com forma, selecionada e geometria arredondada. */
function resumo(l: ListaDesenho, ignorarSelecao = false) {
  return l.camadas.map((c) => ({
    camada: c.camadaId,
    itens: c.itens
      .map((i) => `${i.forma}|${i.id}|${ignorarSelecao ? '' : i.selecionada ? 1 : 0}|${i.total ?? ''}|${i.geometriaEmPx.map((g) => Array.from(g, (n) => Math.round(n * 1000) / 1000).join(',')).join(';')}`)
      .sort(),
    est: { ...c.estatisticas, avaliacoesLOD: 0 }
  }));
}
