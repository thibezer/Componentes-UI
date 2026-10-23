import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import L from 'leaflet';
import { IndiceEspacial, caixaDaFeicao, type CaixaGeo } from '../src/gerencigeo-canvas/feature_indice';
import {
  toleranciaPorZoom, simplificarLinha, simplificarAnel, simplificarGeometria, MIN_VERTICES_SIMPLIFICAR, ZOOM_SEM_SIMPLIFICACAO
} from '../src/gerencigeo-canvas/feature_simplificacao';
import { agruparPontos, deveAgrupar, type PontoCluster } from '../src/gerencigeo-canvas/feature_cluster';
import { FeicoesLayerRenderer, COR_SELECAO } from '../src/gerencigeo-canvas/renderers/feicoes_renderer';
import type { Feicao, LatLonPar } from '../src/gerencigeo-canvas/feature_types';
import type { CanvasLayerDef, CanvasRenderContext } from '../src/gerencigeo-canvas/types';
import { MotorFormas } from '../src/gerencigeo-canvas/motor/motor-formas';
import { projetarMercator } from '../src/gerencigeo-canvas/feature_lod';
import type { ListaDesenho, Vista } from '../src/gerencigeo-canvas/motor/tipos';

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
    // limites folgados para não ficar frágil em máquina lenta/CI; na prática ficam bem abaixo (montagem < 1 s sozinho).
    // Com a suíte inteira em paralelo a montagem já chegou a 3,3 s e travou o `npm publish`: o teste pega regressão de
    // ordem de grandeza, não variação de carga.
    expect(montagem).toBeLessThan(10_000);
    expect(consultas).toBeLessThan(5000);
  }, 30_000);
});

describe('simplificação por zoom', () => {
  const reta = (n: number): LatLonPar[] => Array.from({ length: n }, (_, i) => [i * 1e-4, 0.00001 * (i % 2)]);

  it('só simplifica abaixo de ZOOM_SEM_SIMPLIFICACAO (17)', () => {
    expect(toleranciaPorZoom(ZOOM_SEM_SIMPLIFICACAO)).toBe(0);
    expect(toleranciaPorZoom(18)).toBe(0);
    expect(toleranciaPorZoom(12)).toBeGreaterThan(0);
    expect(toleranciaPorZoom(ZOOM_SEM_SIMPLIFICACAO - 1)).toBeGreaterThan(0);
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
    expect(simplificarGeometria(grande, ZOOM_SEM_SIMPLIFICACAO)).toBe(grande);
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

  it('simplifica só o desenho: abaixo do zoom 17 a camada tem menos vértices, a feição original fica intacta', () => {
    const map = mapa(8);
    const r = new FeicoesLayerRenderer();
    const coords: LatLonPar[] = Array.from({ length: 400 }, (_, i) => [-23.5 + i * 1e-4, -46.6 + (i % 2) * 1e-7]);
    const linha: Feicao = { id: 'l', camadaId: 'c', propriedades: {}, geometria: { tipo: 'LineString', coordenadas: coords } };
    const g = r.render(def([linha]), map, ctx);
    const desenhada = g.getLayers()[0] as L.Polyline;
    expect((desenhada.getLatLngs() as L.LatLng[]).length).toBeLessThan(10);
    expect((linha.geometria as { coordenadas: LatLonPar[] }).coordenadas).toHaveLength(400);

    map.setZoom(ZOOM_SEM_SIMPLIFICACAO, { animate: false });
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

describe('Fase 1 do motor de formas: LOD em pixels e seleção incremental (orçamentos folgados para CI lenta)', () => {
  const ctx2 = { onLayerAction: vi.fn(), config: {}, graphicScale: {} } as unknown as CanvasRenderContext;
  const mLat = 1 / 111320;
  const mLon = 1 / (111320 * Math.cos((23.5 * Math.PI) / 180));

  function mapa2(zoom: number): L.Map {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    Object.defineProperty(el, 'clientHeight', { value: 600 });
    document.body.appendChild(el);
    return L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom });
  }

  /** `n` quadrados de `lado` metros espalhados num bloco de ~13 km (semente fixa). */
  function quadrados(n: number, lado: number): Feicao[] {
    const rnd = semente(99);
    return Array.from({ length: n }, (_, i) => {
      const lat = -23.5 + (rnd() - 0.5) * 0.12;
      const lon = -46.6 + (rnd() - 0.5) * 0.13;
      return {
        id: `q${i}`, camadaId: 'c', propriedades: {},
        geometria: { tipo: 'Polygon', aneis: [[[lat, lon], [lat, lon + lado * mLon], [lat + lado * mLat, lon + lado * mLon], [lat + lado * mLat, lon]]] }
      } as Feicao;
    });
  }
  const def2 = (feicoes: Feicao[]): CanvasLayerDef => ({
    id: 'c', nome: 'C', categoria: 'custom', tipo: 'feicoes', visivel: true, opacidade: 1,
    zIndex: 600, interativo: true, estilo: {}, dados: { feicoes }
  });

  it('20 mil polígonos de 40 m em zoom 12: todos viram marca (zero objetos Leaflet) e o desenho é rápido', () => {
    const map = mapa2(12);
    const r = new FeicoesLayerRenderer();
    const t0 = performance.now();
    const g = r.render(def2(quadrados(20000, 40)), map, ctx2);
    const ms = performance.now() - t0;
    expect(r.estatisticas(g)).toMatchObject({ total: 20000, materializadas: 0, marcasLOD: 20000 });
    expect(g.getLayers()).toHaveLength(0);
    expect(ms).toBeLessThan(5000);
  });

  it('LOD no hot path: mudança de vista com 20 mil marcas reaproveita o cache (zero reavaliações no pan)', async () => {
    const map = mapa2(12);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def2(quadrados(20000, 40)), map, ctx2);
    const avaliacoes = r.estatisticas(g)!.avaliacoesLOD;
    const t0 = performance.now();
    map.panBy([60, 20], { animate: false });
    await new Promise((res) => setTimeout(res, 50));
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(r.estatisticas(g)!.avaliacoesLOD).toBe(avaliacoes);
  });

  it('selecionar 1 feição entre milhares de formas na tela: sem reconciliar a camada e em poucos ms', () => {
    const map = mapa2(16);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def2(quadrados(2000, 40).map((f, i) => ({ ...f, geometria: deslocar(i) }))), map, ctx2);
    const reconciliar = vi.spyOn(r as unknown as { reconciliar: () => void }, 'reconciliar');
    const alvo = r.idsDesenhados(g)!.materializadas[0];
    expect(alvo).toBeDefined();
    const t0 = performance.now();
    r.aplicarSelecao(g, new Set([alvo]));
    const ms = performance.now() - t0;
    expect(reconciliar).not.toHaveBeenCalled();
    expect(ms).toBeLessThan(100); // meta de produto: ≤ 20 ms no navegador; aqui há folga para CI lenta
  });

  /** Reposiciona o quadrado `i` junto ao centro do mapa (dentro da tela em zoom 16). */
  function deslocar(i: number): Feicao['geometria'] {
    const lat = -23.5 + (i % 40) * 0.0001;
    const lon = -46.6 + Math.floor(i / 40) * 0.0001;
    return { tipo: 'Polygon', aneis: [[[lat, lon], [lat, lon + 40 * mLon], [lat + 40 * mLat, lon + 40 * mLon], [lat + 40 * mLat, lon]]] };
  }

  it('a seleção de 1 feição custa o mesmo com 2 mil ou com 20 mil na camada (O(mudanças))', () => {
    const tempo = (n: number): number => {
      document.body.innerHTML = '';
      const map = mapa2(12);
      const r = new FeicoesLayerRenderer();
      const g = r.render(def2(quadrados(n, 40)), map, ctx2);
      const t0 = performance.now();
      for (let i = 0; i < 20; i++) r.aplicarSelecao(g, new Set([`q${i}`]));
      return performance.now() - t0;
    };
    tempo(2000);
    const pequeno = tempo(2000);
    const grande = tempo(20000);
    expect(grande).toBeLessThan(Math.max(pequeno * 6, 50));
  });
});

describe('motor das formas (Fases 2–3): orçamentos do caminho canvas com 100 mil feições (folgados para CI lenta)', () => {
  const mLat = 1 / 111320;
  const mLon = 1 / (111320 * Math.cos((23.5 * Math.PI) / 180));
  const CENTRO: LatLonPar = [-23.5, -46.6];

  /** `n` quadrados de `lado` metros num bloco de ~13 km em volta de CENTRO (semente fixa). */
  function quadrados(n: number, lado: number): Feicao[] {
    const rnd = semente(2024);
    return Array.from({ length: n }, (_, i) => {
      const lat = CENTRO[0] + (rnd() - 0.5) * 0.12;
      const lon = CENTRO[1] + (rnd() - 0.5) * 0.13;
      return {
        id: `q${i}`, camadaId: 'c', propriedades: {},
        geometria: { tipo: 'Polygon', aneis: [[[lat, lon], [lat, lon + lado * mLon], [lat + lado * mLat, lon + lado * mLon], [lat + lado * mLat, lon]]] }
      } as Feicao;
    });
  }

  /**
   * Vista de `w`×`h` px com o canto superior esquerdo em `origem` (pixels de mundo). `sub` recorta uma faixa dela,
   * como o pan incremental faz: a origem continua a do canvas inteiro e só a caixa encolhe.
   */
  function vista(zoom: number, origem: { x: number; y: number }, w = 800, h = 600, sub?: { x: number; y: number; w: number; h: number }): Vista {
    const escala = 256 * 2 ** zoom;
    const lon = (x: number) => (x / escala) * 360 - 180;
    const lat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / escala))) * 180) / Math.PI;
    const r = sub ?? { x: 0, y: 0, w, h };
    return {
      zoom, larguraPx: r.w, alturaPx: r.h, dpr: 1, origemPx: origem,
      caixa: { minLon: lon(origem.x + r.x), maxLon: lon(origem.x + r.x + r.w), maxLat: lat(origem.y + r.y), minLat: lat(origem.y + r.y + r.h) }
    };
  }
  const origemEm = (zoom: number, w = 800, h = 600) => {
    const c = projetarMercator(CENTRO[0], CENTRO[1], zoom);
    return { x: c.x - w / 2, y: c.y - h / 2 };
  };
  const itens = (l: ListaDesenho) => l.camadas.reduce((t, c) => t + c.itens.length, 0);

  const motor = new MotorFormas();
  motor.definirCamada({ id: 'c', zIndex: 600, opacidade: 1, visivel: true, interativo: true, estilo: {} });
  beforeAll(() => { motor.definirFeicoes('c', quadrados(100_000, 40)); }, 60_000);

  it('listaDesenho em zoom 12 (tudo na tela, tudo vira marca): primeira vista e mudança de vista dentro do orçamento', () => {
    const o = origemEm(12);
    const t0 = performance.now();
    const primeira = motor.listaDesenho(vista(12, o));
    const fria = performance.now() - t0;
    expect(itens(primeira)).toBe(100_000);
    expect(primeira.camadas[0].itens.every((i) => i.forma === 'marca')).toBe(true);

    const t1 = performance.now();
    for (let k = 1; k <= 5; k++) motor.listaDesenho(vista(12, { x: o.x + k * 40, y: o.y + k * 15 }));
    const quente = (performance.now() - t1) / 5;
    // medido isolado: ~650 ms frio e ~140 ms por vista com o item da marca em cache (antes ~450 ms); folga para a suíte
    // em paralelo e CI lenta (docs/desempenho-feicoes.md)
    expect(fria).toBeLessThan(15000);
    expect(quente).toBeLessThan(6000);
  }, 60_000);

  it('pan incremental em zoom 15: a faixa exposta lista uma fração das formas e custa menos que a vista inteira', () => {
    const o = origemEm(15);
    const nInteira = itens(motor.listaDesenho(vista(15, o))); // aquece o cache de projeção desse zoom
    expect(nInteira).toBeGreaterThan(1000);

    const medir = (f: () => ListaDesenho): { ms: number; n: number } => {
      let n = 0;
      const t = performance.now();
      for (let k = 0; k < 10; k++) n = itens(f());
      return { ms: (performance.now() - t) / 10, n };
    };
    const cheia = medir(() => motor.listaDesenho(vista(15, o)));
    const faixa = medir(() => motor.listaDesenho(vista(15, o, 800, 600, { x: 680, y: 0, w: 120, h: 600 }), { parte: 'canvas' }));
    expect(faixa.n).toBeGreaterThan(0);
    expect(faixa.n).toBeLessThan(nInteira * 0.4);
    expect(faixa.ms).toBeLessThan(Math.max(cheia.ms, 5));
    expect(cheia.ms).toBeLessThan(3000);
  }, 30_000);

  it('hover: consultarCaixa de alguns px em 100 mil feições fica no orçamento de quadro (≤ 16 ms por consulta)', () => {
    const rnd = semente(5);
    const meio = (8 / (256 * 2 ** 15)) * 360; // ~8 px em zoom 15
    let achados = 0;
    let pior = 0;
    const t0 = performance.now();
    for (let q = 0; q < 1000; q++) {
      const lat = CENTRO[0] + (rnd() - 0.5) * 0.12;
      const lon = CENTRO[1] + (rnd() - 0.5) * 0.13;
      const t = performance.now();
      achados += motor.consultarCaixa('c', { minLat: lat - meio, maxLat: lat + meio, minLon: lon - meio, maxLon: lon + meio }).length;
      pior = Math.max(pior, performance.now() - t);
    }
    const media = (performance.now() - t0) / 1000;
    expect(achados).toBeGreaterThan(0);
    expect(media).toBeLessThan(16);
    expect(pior).toBeLessThan(500); // uma pausa isolada de GC não reprova; a meta é a média
  }, 30_000);
});
