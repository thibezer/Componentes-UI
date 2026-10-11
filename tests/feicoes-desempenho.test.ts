import { describe, it, expect, afterEach, vi } from 'vitest';
import L from 'leaflet';
import { IndiceEspacial, caixaDaFeicao, type CaixaGeo } from '../src/gerencigeo-canvas/feature_indice';
import {
  toleranciaPorZoom, simplificarLinha, simplificarAnel, simplificarGeometria, MIN_VERTICES_SIMPLIFICAR
} from '../src/gerencigeo-canvas/feature_simplificacao';
import { agruparPontos, deveAgrupar, type PontoCluster } from '../src/gerencigeo-canvas/feature_cluster';
import { FeicoesLayerRenderer, COR_SELECAO } from '../src/gerencigeo-canvas/renderers/feicoes_renderer';
import type { Feicao, LatLonPar } from '../src/gerencigeo-canvas/feature_types';
import type { CanvasLayerDef, CanvasRenderContext } from '../src/gerencigeo-canvas/types';

afterEach(() => { document.body.innerHTML = ''; });

const ponto = (id: string, lat: number, lon: number): Feicao => ({
  id, camadaId: 'c', geometria: { tipo: 'Point', coordenada: [lat, lon] }, propriedades: {}
});

/** Gerador pseudoaleatório determinístico. */
function semente(n: number) {
  let s = n;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

describe('IndiceEspacial', () => {
  const caixa = (minLat: number, minLon: number, maxLat: number, maxLon: number): CaixaGeo => ({ minLat, minLon, maxLat, maxLon });

  it('consulta igual à força bruta', () => {
    const r = semente(7);
    const fs = Array.from({ length: 2000 }, (_, i) => ponto(`p${i}`, -24 + r(), -47 + r()));
    const idx = new IndiceEspacial();
    idx.construir(fs);
    for (let q = 0; q < 50; q++) {
      const a = -24 + r();
      const b = -47 + r();
      const c = caixa(a, b, a + 0.2, b + 0.2);
      const bruto = fs.filter((f) => {
        const k = caixaDaFeicao(f);
        return k.minLon <= c.maxLon && k.maxLon >= c.minLon && k.minLat <= c.maxLat && k.maxLat >= c.minLat;
      }).map((f) => f.id).sort();
      expect(idx.consultar(c).sort()).toEqual(bruto);
    }
  });

  it('inserir, atualizar e remover valem na consulta, sem remontar tudo', () => {
    const idx = new IndiceEspacial();
    idx.construir([ponto('a', -23.5, -46.6), ponto('b', -23.6, -46.7)]);
    const tudo = caixa(-30, -50, -20, -40);
    expect(idx.consultar(tudo).sort()).toEqual(['a', 'b']);

    idx.inserir(ponto('c', -23.7, -46.8));
    expect(idx.consultar(tudo).sort()).toEqual(['a', 'b', 'c']);

    idx.atualizar(ponto('a', -10, -10)); // saiu da região
    expect(idx.consultar(tudo).sort()).toEqual(['b', 'c']);
    expect(idx.consultar(caixa(-11, -11, -9, -9))).toEqual(['a']);

    idx.remover('b');
    expect(idx.consultar(tudo)).toEqual(['c']);
    expect(idx.tamanho).toBe(2);
    expect(idx.intersecta(tudo)).toBe(true);
    expect(idx.intersecta(caixa(50, 50, 51, 51))).toBe(false);
  });

  it('feição excluída sai do índice; muitas mudanças compactam sem perder nada', () => {
    const idx = new IndiceEspacial();
    const fs = Array.from({ length: 1000 }, (_, i) => ponto(`p${i}`, -24 + i * 1e-3, -47));
    idx.construir(fs);
    for (let i = 0; i < 600; i++) idx.atualizar(ponto(`p${i}`, 10 + i * 1e-3, 10));
    idx.atualizar({ ...fs[999], excluida: true });
    expect(idx.tamanho).toBe(999);
    const antigos = idx.consultar(caixa(-25, -48, -22, -46));
    expect(antigos).toHaveLength(399);
    expect(idx.consultar(caixa(9, 9, 12, 11))).toHaveLength(600);
  });

  it('100 mil feições: monta e consulta rápido', () => {
    const r = semente(42);
    const fs = Array.from({ length: 100_000 }, (_, i) => ponto(`p${i}`, -30 + r() * 20, -60 + r() * 20));
    const idx = new IndiceEspacial();
    const t0 = performance.now();
    idx.construir(fs);
    const montagem = performance.now() - t0;

    const t1 = performance.now();
    let achados = 0;
    for (let q = 0; q < 1000; q++) {
      const a = -30 + r() * 19;
      const b = -60 + r() * 19;
      achados += idx.consultar(caixa(a, b, a + 0.5, b + 0.5)).length;
    }
    const consultas = performance.now() - t1;

    expect(idx.tamanho).toBe(100_000);
    expect(achados).toBeGreaterThan(0);
    // limites folgados para não ficar frágil em máquina lenta/CI; na prática ficam bem abaixo
    expect(montagem).toBeLessThan(3000);
    expect(consultas).toBeLessThan(2000);
  });
});

describe('simplificação por zoom', () => {
  const reta = (n: number): LatLonPar[] => Array.from({ length: n }, (_, i) => [i * 1e-4, 0.00001 * (i % 2)]);

  it('só simplifica abaixo do zoom 12', () => {
    expect(toleranciaPorZoom(12)).toBe(0);
    expect(toleranciaPorZoom(18)).toBe(0);
    expect(toleranciaPorZoom(11)).toBeGreaterThan(0);
    expect(toleranciaPorZoom(5)).toBeGreaterThan(toleranciaPorZoom(8));
  });

  it('Douglas-Peucker mantém extremos e remove ruído, sem mutar a entrada', () => {
    const pts = reta(200);
    const copia = JSON.stringify(pts);
    const s = simplificarLinha(pts, 0.001);
    expect(s[0]).toEqual(pts[0]);
    expect(s[s.length - 1]).toEqual(pts[199]);
    expect(s.length).toBeLessThan(10);
    expect(JSON.stringify(pts)).toBe(copia);
    expect(simplificarLinha(pts, 0)).toBe(pts);
  });

  it('preserva curvas reais e nunca deixa anel com menos de 3 vértices', () => {
    const circulo: LatLonPar[] = Array.from({ length: 360 }, (_, i) => [Math.sin((i * Math.PI) / 180), Math.cos((i * Math.PI) / 180)]);
    expect(simplificarAnel(circulo, 0.05).length).toBeGreaterThan(10);
    const tri: LatLonPar[] = [[0, 0], [0, 1], [1, 0.5], [0.5, 0.2]];
    expect(simplificarAnel(tri, 100).length).toBeGreaterThanOrEqual(3);
  });

  it('geometria pequena ou em zoom alto volta a mesma referência', () => {
    const g = { tipo: 'LineString' as const, coordenadas: reta(MIN_VERTICES_SIMPLIFICAR - 1) };
    expect(simplificarGeometria(g, 5)).toBe(g);
    const grande = { tipo: 'LineString' as const, coordenadas: reta(500) };
    expect(simplificarGeometria(grande, 14)).toBe(grande);
    const s = simplificarGeometria(grande, 5);
    expect(s).not.toBe(grande);
    expect((s as typeof grande).coordenadas.length).toBeLessThan(500);
  });
});

describe('agrupamento de pontos', () => {
  // projeção simples: 1 grau = 1000 px
  const proj = (p: LatLonPar) => ({ x: p[1] * 1000, y: p[0] * 1000 });
  const pts = (...c: Array<[string, number, number]>): PontoCluster[] => c.map(([id, lat, lon]) => ({ id, coordenada: [lat, lon] }));

  it('não agrupa em zoom ≥ 17 nem com até 8 pontos', () => {
    expect(deveAgrupar(100, 17)).toBe(false);
    expect(deveAgrupar(100, 16)).toBe(true);
    expect(deveAgrupar(8, 10)).toBe(false);
    expect(deveAgrupar(9, 10)).toBe(true);
  });

  it('junta pontos da mesma célula de 55 px e deixa os isolados', () => {
    const todos = pts(
      ['a', 0.001, 0.001], ['b', 0.002, 0.002], ['c', 0.003, 0.001], // mesma célula
      ['d', 0.2, 0.2], ['e', 0.4, 0.4], ['f', 0.6, 0.6], ['g', 0.8, 0.8], ['h', 1, 1], ['i', 1.2, 1.2] // isolados
    );
    const r = agruparPontos(todos, 10, proj);
    expect(r.clusters).toHaveLength(1);
    expect(r.clusters[0].membros.map((m) => m.id).sort()).toEqual(['a', 'b', 'c']);
    expect(r.clusters[0].coordenada[0]).toBeCloseTo(0.002, 6);
    expect(r.isolados).toHaveLength(6);
  });

  it('a grade é absoluta: o mesmo ponto cai na mesma célula', () => {
    const todos = pts(...Array.from({ length: 12 }, (_, i): [string, number, number] => [`p${i}`, 0.001 * i, 0.001 * i]));
    expect(agruparPontos(todos, 10, proj).clusters[0].chave).toBe(agruparPontos(todos, 10, proj).clusters[0].chave);
  });
});

describe('renderizador: culling, clusters e simplificação', () => {
  const ctx = { onLayerAction: vi.fn(), config: {}, graphicScale: {} } as unknown as CanvasRenderContext;

  /** happy-dom não faz layout; força um tamanho para a viewport existir. */
  function mapa(zoom = 15): L.Map {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    Object.defineProperty(el, 'clientHeight', { value: 600 });
    document.body.appendChild(el);
    return L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom });
  }

  const def = (feicoes: Feicao[]): CanvasLayerDef => ({
    id: 'c', nome: 'C', categoria: 'custom', tipo: 'feicoes', visivel: true, opacidade: 1,
    zIndex: 600, interativo: true, estilo: {}, dados: { feicoes }
  });

  it('até 300 feições: tudo carregado, mesmo fora da tela', () => {
    const map = mapa();
    const r = new FeicoesLayerRenderer();
    const fs = Array.from({ length: 100 }, (_, i) => ponto(`p${i}`, -23.5 + i * 0.5, -46.6 + i * 0.5));
    const g = r.render(def(fs), map, ctx);
    expect(r.estatisticas(g)).toMatchObject({ total: 100, materializadas: 100 });
  });

  it('acima de 300: só o que está perto da tela é materializado', () => {
    const map = mapa();
    const r = new FeicoesLayerRenderer();
    const fs: Feicao[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `l${i}`, camadaId: 'c', propriedades: {},
      geometria: { tipo: 'LineString', coordenadas: [[-23.5 + i * 0.1, -46.6], [-23.5 + i * 0.1 + 0.001, -46.6 + 0.001]] }
    }));
    const g = r.render(def(fs), map, ctx);
    const est = r.estatisticas(g)!;
    expect(est.total).toBe(1000);
    expect(est.materializadas).toBeGreaterThan(0);
    expect(est.materializadas).toBeLessThan(20);
  });

  it('ao mover o mapa, as feições novas entram e as que saíram são removidas', async () => {
    const map = mapa();
    const r = new FeicoesLayerRenderer();
    const fs: Feicao[] = Array.from({ length: 600 }, (_, i) => ({
      id: `l${i}`, camadaId: 'c', propriedades: {},
      geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6 + i * 0.05], [-23.501, -46.6 + i * 0.05]] }
    }));
    const g = r.render(def(fs), map, ctx);
    const antes = new Set(g.getLayers().map((l) => L.Util.stamp(l)));
    map.setView([-23.5, -46.6 + 20], 15, { animate: false });
    await new Promise((res) => setTimeout(res, 100));
    const depois = g.getLayers().map((l) => L.Util.stamp(l));
    expect(depois.length).toBeGreaterThan(0);
    expect(depois.some((id) => antes.has(id))).toBe(false);
  });

  it('pontos próximos viram cluster; selecionar um o separa; desmarcar agrupa de novo', () => {
    const map = mapa(15);
    const r = new FeicoesLayerRenderer();
    const fs = Array.from({ length: 50 }, (_, i) => ponto(`p${i}`, -23.5 + i * 1e-6, -46.6));
    const g = r.render(def(fs), map, ctx);
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 0, clusters: 1 });
    const marcador = g.getLayers()[0] as L.Marker;
    expect((marcador.options.icon as L.DivIcon).options.html).toContain('>50<');

    r.aplicarSelecao(g, new Set(['p3']));
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 1, clusters: 1 });
    const individual = g.getLayers().find((l) => l instanceof L.CircleMarker) as L.CircleMarker;
    expect(individual.options.color).toBe(COR_SELECAO);

    r.aplicarSelecao(g, new Set());
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 0, clusters: 1 });
  });

  it('em zoom ≥ 17 os pontos se desmembram', () => {
    const map = mapa(15);
    const r = new FeicoesLayerRenderer();
    const fs = Array.from({ length: 20 }, (_, i) => ponto(`p${i}`, -23.5 + i * 1e-6, -46.6));
    const g = r.render(def(fs), map, ctx);
    expect(r.estatisticas(g)!.clusters).toBe(1);
    map.setZoom(17, { animate: false });
    return new Promise<void>((res) => setTimeout(() => {
      expect(r.estatisticas(g)).toMatchObject({ materializadas: 20, clusters: 0 });
      res();
    }, 100));
  });

  it('até 8 pontos nunca agrupam', () => {
    const map = mapa(10);
    const r = new FeicoesLayerRenderer();
    const fs = Array.from({ length: 8 }, (_, i) => ponto(`p${i}`, -23.5 + i * 1e-6, -46.6));
    const g = r.render(def(fs), map, ctx);
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 8, clusters: 0 });
  });

  it('clique no cluster aproxima o mapa', () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const fs = Array.from({ length: 30 }, (_, i) => ponto(`p${i}`, -23.5 + i * 1e-4, -46.6 + i * 1e-4));
    const g = r.render(def(fs), map, ctx);
    const zoomAntes = map.getZoom();
    const cluster = g.getLayers().find((l) => l instanceof L.Marker) as L.Marker;
    cluster.fire('click');
    expect(map.getZoom()).toBeGreaterThanOrEqual(zoomAntes);
  });

  it('simplifica só o desenho: abaixo do zoom 12 a camada tem menos vértices, a feição original fica intacta', () => {
    const map = mapa(8);
    const r = new FeicoesLayerRenderer();
    const coords: LatLonPar[] = Array.from({ length: 400 }, (_, i) => [-23.5 + i * 1e-4, -46.6 + (i % 2) * 1e-7]);
    const linha: Feicao = { id: 'l', camadaId: 'c', propriedades: {}, geometria: { tipo: 'LineString', coordenadas: coords } };
    const g = r.render(def([linha]), map, ctx);
    const desenhada = g.getLayers()[0] as L.Polyline;
    expect((desenhada.getLatLngs() as L.LatLng[]).length).toBeLessThan(10);
    expect((linha.geometria as { coordenadas: LatLonPar[] }).coordenadas).toHaveLength(400);

    map.setZoom(14, { animate: false });
    return new Promise<void>((res) => setTimeout(() => {
      expect((desenhada.getLatLngs() as L.LatLng[]).length).toBe(400);
      res();
    }, 100));
  });

  it('atualização incremental: só a feição mudada é remendada; o resto mantém a camada Leaflet', () => {
    const map = mapa(17); // sem cluster
    const r = new FeicoesLayerRenderer();
    const d = def(Array.from({ length: 50 }, (_, i) => ponto(`p${i}`, -23.5 + i * 0.001, -46.6)));
    const g = r.render(d, map, ctx);
    const antes = g.getLayers().map((l) => L.Util.stamp(l));
    const lista = (d.dados as { feicoes: Feicao[] }).feicoes;
    d.dados = { feicoes: [{ ...lista[0], geometria: { tipo: 'Point', coordenada: [-23.4, -46.5] } }, ...lista.slice(1)] };
    r.update(d, g, { dados: d.dados }, ctx, map);
    expect(g.getLayers().map((l) => L.Util.stamp(l))).toEqual(antes);
    expect((g.getLayers()[0] as L.CircleMarker).getLatLng().lat).toBeCloseTo(-23.4);
  });
});
