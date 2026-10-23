import { describe, it, expect, afterEach, vi } from 'vitest';
import L from 'leaflet';
import { FeicoesLayerRenderer, COR_SELECAO, LIMITE_CULLING } from '../src/gerencigeo-canvas/renderers/feicoes_renderer';
import { CamadaMarcasLOD } from '../src/gerencigeo-canvas/renderers/marcas_lod_layer';
import { resolverCliqueCentral, registrarFonteHit } from '../src/gerencigeo-canvas/layer_hit_test';
import type { Feicao } from '../src/gerencigeo-canvas/feature_types';
import type { CanvasLayerDef, CanvasRenderContext } from '../src/gerencigeo-canvas/types';

/*
 * Fase 1 do motor de formas: LOD por tamanho em pixels (marcas de 1–2 px em lote) e seleção incremental
 * (aplicarSelecao não reconcilia a camada inteira). Camadas B/C: ciclo de vida, equivalência e entrada hostil.
 */

afterEach(() => { document.body.innerHTML = ''; });

const acoes: Array<[string, any]> = [];
const ctx = { onLayerAction: (a: string, d: unknown) => acoes.push([a, d]), config: {}, graphicScale: {} } as unknown as CanvasRenderContext;

function mapa(zoom: number): L.Map {
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

const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((23.5 * Math.PI) / 180));

/** Quadrado de `lado` metros com o canto em [lat, lon]. */
const quadrado = (id: string, lat: number, lon: number, lado: number, extra: Partial<Feicao> = {}): Feicao => ({
  id, camadaId: 'c', propriedades: {},
  geometria: { tipo: 'Polygon', aneis: [[[lat, lon], [lat, lon + lado * mLon], [lat + lado * mLat, lon + lado * mLon], [lat + lado * mLat, lon]]] },
  ...extra
});
const ponto = (id: string, lat: number, lon: number): Feicao => ({ id, camadaId: 'c', propriedades: {}, geometria: { tipo: 'Point', coordenada: [lat, lon] } });
const esperar = (ms = 60) => new Promise((r) => setTimeout(r, ms));

describe('LOD: feições menores que ~3 px viram marcas', () => {
  it('em zoom 12 um quadrado de 40 m é marca; um de 500 m continua sendo camada Leaflet', () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def([quadrado('pequeno', -23.5, -46.6, 40), quadrado('grande', -23.49, -46.59, 500)]), map, ctx);
    expect(r.idsDesenhados(g)).toEqual({ materializadas: ['grande'], marcas: ['pequeno'] });
    expect(r.estatisticas(g)).toMatchObject({ total: 2, materializadas: 1, marcasLOD: 1 });
    expect(g.getLayers()).toHaveLength(1);
  });

  it('a marca não é um objeto Leaflet do grupo: vai num canvas próprio, no pane da camada', () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def([quadrado('a', -23.5, -46.6, 40)]), map, ctx);
    expect(g.getLayers()).toHaveLength(0);
    const canvas = map.getPane('pane-c-poligono')!.querySelector('canvas.cad-marcas-lod');
    expect(canvas).not.toBeNull();
    expect((canvas as HTMLElement).style.pointerEvents).toBe('none');
  });

  it('ao aproximar o zoom a marca vira forma de verdade; ao afastar, volta a ser marca', async () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def([quadrado('a', -23.5, -46.6, 40)]), map, ctx);
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 0, marcasLOD: 1 });
    map.setZoom(16, { animate: false });
    await esperar();
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 1, marcasLOD: 0 });
    map.setZoom(12, { animate: false });
    await esperar();
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 0, marcasLOD: 1 });
  });

  it('sem marcas não sobra canvas: ele existe só enquanto há marcas (e some ao aproximar)', async () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def([quadrado('a', -23.5, -46.6, 40)]), map, ctx);
    const canvases = () => map.getPane('pane-c-poligono')!.querySelectorAll('canvas.cad-marcas-lod').length;
    expect(canvases()).toBe(1);
    map.setZoom(16, { animate: false });
    await esperar();
    expect(r.estatisticas(g)!.marcasLOD).toBe(0);
    expect(canvases()).toBe(0);
    map.setZoom(12, { animate: false });
    await esperar();
    expect(canvases()).toBe(1);
  });

  it('linha longa e fina (área ~0) nunca vira marca; ponto e texto também não', () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const linha: Feicao = { id: 'l', camadaId: 'c', propriedades: {}, geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.55]] } };
    const texto: Feicao = { id: 't', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Text', coordenada: [-23.5, -46.6], texto: 'x' } };
    const g = r.render(def([linha, ponto('p', -23.5, -46.6), texto]), map, ctx);
    expect(r.idsDesenhados(g)).toEqual({ materializadas: ['l', 'p', 't'], marcas: [] });
  });

  it('linha minúscula (diagonal < 3 px) vira marca, mas continua achável pelo índice (geometria original)', () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const curta: Feicao = { id: 'curta', camadaId: 'c', propriedades: {}, geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.6 + 30 * mLon]] } };
    const g = r.render(def([curta]), map, ctx);
    expect(r.estatisticas(g)!.marcasLOD).toBe(1);
    expect(r.consultarProximas(g, { minLat: -23.6, maxLat: -23.4, minLon: -46.7, maxLon: -46.5 }).map((f) => f.id)).toEqual(['curta']);
  });

  it('selecionada, com rótulo ou em par oficial × prévia: sempre em detalhe completo', () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const fs = [
      quadrado('sel', -23.5, -46.6, 40),
      quadrado('rot', -23.5, -46.59, 40, { estilo: { mostrarRotulo: true, campoRotulo: 'x' } }),
      quadrado('of', -23.5, -46.58, 40, { entidadeId: 'e' }),
      quadrado('pv', -23.5, -46.57, 40, { entidadeId: 'e', status: 'previa' }),
      quadrado('livre', -23.5, -46.56, 40)
    ];
    const regra = { visivel: () => true } as unknown as CanvasRenderContext['regraVersoes'];
    const g = r.render(def(fs), map, { ...ctx, regraVersoes: regra });
    r.aplicarSelecao(g, new Set(['sel']));
    const d = r.idsDesenhados(g)!;
    expect(d.materializadas).toEqual(['of', 'pv', 'rot', 'sel']);
    expect(d.marcas).toEqual(['livre']);
    r.aplicarSelecao(g, new Set());
    expect(r.idsDesenhados(g)!.marcas).toEqual(['livre', 'sel']);
  });

  it('opacidade e z-order não mudam: a marca fica no pane da camada (grupo), abaixo das linhas', () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    r.render(def([quadrado('a', -23.5, -46.6, 40)]), map, ctx);
    expect(map.getPane('pane-c-poligono')!.parentElement).toBe(map.getPane('pane-c'));
    expect(Number(map.getPane('pane-c-poligono')!.style.zIndex)).toBeLessThan(Number(map.getPane('pane-c-linha')?.style.zIndex ?? 999));
  });

  it('mapa sem vista (zoom desconhecido) não aplica LOD', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    Object.defineProperty(el, 'clientHeight', { value: 600 });
    document.body.appendChild(el);
    const map = L.map(el, { preferCanvas: true }); // sem setView
    const r = new FeicoesLayerRenderer();
    const g = r.render(def([quadrado('a', -23.5, -46.6, 40)]), map, ctx);
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 1, marcasLOD: 0 });
  });
});

describe('LOD: avaliado ao mudar de zoom, não a cada pan', () => {
  it('pan puro reaproveita o cache; trocar o zoom reavalia', async () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const fs = Array.from({ length: 400 }, (_, i) => quadrado(`q${i}`, -23.5 + (i % 20) * 0.001, -46.6 + Math.floor(i / 20) * 0.001, 40));
    const g = r.render(def(fs), map, ctx);
    const base = r.estatisticas(g)!.avaliacoesLOD;
    expect(base).toBe(400);
    map.panBy([40, 10], { animate: false });
    await esperar();
    expect(r.estatisticas(g)!.avaliacoesLOD).toBe(base);
    map.setZoom(13, { animate: false });
    await esperar();
    expect(r.estatisticas(g)!.avaliacoesLOD).toBeGreaterThan(base);
  });

  it('feição trocada é reavaliada: de pequena a grande vira forma; remover tira a marca', () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const d = def([quadrado('a', -23.5, -46.6, 40)]);
    const g = r.render(d, map, ctx);
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 0, marcasLOD: 1 });
    d.dados = { feicoes: [quadrado('a', -23.5, -46.6, 800)] };
    r.update(d, g, { dados: d.dados }, ctx, map);
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 1, marcasLOD: 0 });
    d.dados = { feicoes: [] };
    r.update(d, g, { dados: d.dados }, ctx, map);
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 0, marcasLOD: 0 });
  });
});

describe('LOD: a feição de 1 px continua clicável (hit-test central, na geometria original)', () => {
  /** O que `CanvasInteracao.handleClick` faz num clique no mapa: resolve entre todas as camadas. */
  function clicar(map: L.Map, defs: CanvasLayerDef[], ll: L.LatLng, extra: MouseEventInit = {}): boolean {
    const cp = map.latLngToContainerPoint(ll);
    return resolverCliqueCentral(map, defs, new MouseEvent('click', { clientX: cp.x, clientY: cp.y, ...extra }));
  }
  const noCentro = (dx: number, dy: number) => L.latLng(-23.5 + dy * mLat, -46.6 + dx * mLon);

  it('clique sobre uma marca dispara UMA feicao-clique da camada; fora dela, nada', () => {
    acoes.length = 0;
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const d = def([quadrado('a', -23.5, -46.6, 40)]);
    r.render(d, map, ctx);
    expect(clicar(map, [d], noCentro(20, 20))).toBe(true);
    expect(acoes).toHaveLength(1);
    expect(acoes[0][0]).toBe('feicao-clique');
    expect(acoes[0][1]).toMatchObject({ camadaId: 'c', aditivo: false });
    expect(acoes[0][1].feicao.id).toBe('a');

    acoes.length = 0;
    expect(clicar(map, [d], L.latLng(-23.45, -46.55))).toBe(false);
    expect(acoes).toHaveLength(0);
  });

  it('Ctrl/Shift/Meta no clique é aditivo', () => {
    acoes.length = 0;
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const d = def([quadrado('a', -23.5, -46.6, 40)]);
    r.render(d, map, ctx);
    clicar(map, [d], noCentro(20, 20), { ctrlKey: true });
    expect(acoes[0][1].aditivo).toBe(true);
  });

  it('marcas de duas camadas no mesmo ponto: UMA ação por clique, da camada do topo (linha antes de área)', () => {
    acoes.length = 0;
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const embaixo = { ...def([quadrado('area-baixo', -23.5, -46.6, 40)]), id: 'baixo', zIndex: 600 };
    const topo = { ...def([quadrado('area-topo', -23.5, -46.6, 40)]), id: 'topo', zIndex: 700 };
    const linha: Feicao = { id: 'linha', camadaId: 'c', propriedades: {}, geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5 + 20 * mLat, -46.6 + 20 * mLon]] } };
    const linhas = { ...def([linha]), id: 'linhas', zIndex: 500 };
    r.render(embaixo, map, ctx);
    r.render(topo, map, ctx);
    clicar(map, [embaixo, topo], noCentro(20, 20));
    expect(acoes).toHaveLength(1);
    expect(acoes[0][1]).toMatchObject({ camadaId: 'topo' });
    expect(acoes[0][1].feicao.id).toBe('area-topo');

    acoes.length = 0;
    r.render(linhas, map, ctx);
    clicar(map, [embaixo, topo, linhas], noCentro(20, 20));
    expect(acoes).toHaveLength(1);
    expect(acoes[0][1].feicao.id).toBe('linha'); // linha tem prioridade sobre área, mesmo numa camada mais baixa
  });

  it('cliques repetidos no mesmo lugar alternam entre marcas empilhadas', () => {
    acoes.length = 0;
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const d = def([quadrado('a', -23.5, -46.6, 40), quadrado('b', -23.5, -46.6, 40)]);
    r.render(d, map, ctx);
    clicar(map, [d], noCentro(20, 20));
    clicar(map, [d], noCentro(20, 20));
    clicar(map, [d], noCentro(20, 20));
    const ids = acoes.map(([, det]) => det.feicao.id);
    expect(new Set(ids.slice(0, 2)).size).toBe(2);
    expect(ids[2]).toBe(ids[0]);
  });

  it('camada não interativa ou bloqueada não captura clique nas marcas', () => {
    acoes.length = 0;
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const d = def([quadrado('a', -23.5, -46.6, 40)]);
    d.interativo = false;
    r.render(d, map, ctx);
    expect(clicar(map, [d], noCentro(20, 20))).toBe(false);
    const b = { ...def([quadrado('b', -23.5, -46.6, 40)]), id: 'blq', bloqueada: true };
    r.render(b, map, ctx);
    expect(clicar(map, [b], noCentro(20, 20))).toBe(false);
    expect(acoes).toHaveLength(0);
  });

  it('uma fonte do hit-test que lança não derruba o clique das demais camadas (Regra #0)', () => {
    acoes.length = 0;
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const boa = def([quadrado('a', -23.5, -46.6, 40)]);
    const ruim = { ...def([]), id: 'ruim', zIndex: 900 };
    r.render(boa, map, ctx);
    registrarFonteHit(map, 'ruim', { alvo: new L.Layer(), consultar: () => { throw new Error('defeito'); } });
    expect(() => clicar(map, [boa, ruim], noCentro(20, 20))).not.toThrow();
    expect(acoes).toHaveLength(1);
    expect(acoes[0][1].feicao.id).toBe('a');
  });

  it('camada oculta (visivel: false) não responde ao clique', () => {
    acoes.length = 0;
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const d = def([quadrado('a', -23.5, -46.6, 40)]);
    r.render(d, map, ctx);
    d.visivel = false;
    expect(clicar(map, [d], noCentro(20, 20))).toBe(false);
  });

  it('um clique que acerta uma forma Leaflet E uma marca dispara só uma ação (a da forma; sem duplicar)', () => {
    acoes.length = 0;
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const grande = quadrado('grande', -23.502, -46.602, 600);
    const d = def([quadrado('pequena', -23.5, -46.6, 40), grande]);
    r.render(d, map, ctx);
    clicar(map, [d], noCentro(20, 20));
    expect(acoes).toHaveLength(1);
  });
});

describe('LOD: ciclo de vida (Regra #2) e entrada hostil (Regra #0)', () => {
  it('destroy remove o canvas e a fonte do hit-test; reconstruir não duplica', () => {
    acoes.length = 0;
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const d = def([quadrado('a', -23.5, -46.6, 40)]);
    const g1 = r.render(d, map, ctx);
    r.destroy(g1, map);
    expect(map.getPane('pane-c-poligono')?.querySelector('canvas.cad-marcas-lod') ?? null).toBeNull();
    const g2 = r.render(d, map, ctx);
    expect(map.getPane('pane-c-poligono')!.querySelectorAll('canvas.cad-marcas-lod')).toHaveLength(1);
    const alvo = L.latLng(-23.5 + 20 * mLat, -46.6 + 20 * mLon);
    const cp = map.latLngToContainerPoint(alvo);
    const clique = () => resolverCliqueCentral(map, [d], new MouseEvent('click', { clientX: cp.x, clientY: cp.y }));
    expect(clique()).toBe(true);
    expect(acoes).toHaveLength(1);
    r.destroy(g2, map);
    acoes.length = 0;
    expect(clique()).toBe(false); // sem a fonte no hit-test central, nada responde
    expect(acoes).toHaveLength(0);
  });

  it('a camada de marcas pinta com um Canvas 2D falso: cor, alfa e lote por cor', () => {
    const map = mapa(12);
    const gravado: Array<[string, unknown]> = [];
    const ctx2d = {
      set fillStyle(v: string) { gravado.push(['fillStyle', v]); },
      set globalAlpha(v: number) { gravado.push(['globalAlpha', v]); },
      fillRect: (...a: number[]) => gravado.push(['fillRect', a]),
      setTransform: vi.fn(), clearRect: vi.fn()
    };
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => ctx2d) as never;
    try {
      const marcas = [
        { id: 'a', lat: -23.5, lon: -46.6, cor: '#ff0000', lado: 2 as const, fonte: 1 },
        { id: 'b', lat: -23.5001, lon: -46.6001, cor: '#ff0000', lado: 1 as const, fonte: 2 },
        { id: 'c', lat: -23.5002, lon: -46.6002, cor: '#00ff00', lado: 2 as const, fonte: 3 }
      ];
      map.createPane('p');
      const camada = new CamadaMarcasLOD('p', () => marcas);
      camada.addTo(map);
      camada.redesenhar();
      expect(gravado.filter(([k]) => k === 'fillStyle').map(([, v]) => v)).toEqual(['#ff0000', '#00ff00']);
      expect(gravado.filter(([k]) => k === 'fillRect')).toHaveLength(3);
      expect(camada.ultimaPintura).toBe(3);
      map.removeLayer(camada);
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
    }
  });

  it('geometrias degeneradas, NaN, ids duplicados e camada vazia não lançam', () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const ruins: Feicao[] = [
      quadrado('nan', NaN, NaN, 40),
      { id: 'vazio', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Polygon', aneis: [[]] } },
      { id: 'dup', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.6], [-23.5, -46.6]]] } },
      { id: 'dup', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.6], [-23.5, -46.6]]] } },
      { id: 'inf', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Circle', centro: [-23.5, -46.6], raioMetros: Infinity } }
    ];
    expect(() => {
      const g = r.render(def(ruins), map, ctx);
      r.aplicarSelecao(g, new Set(['nan', 'dup', 'fantasma']));
      r.aplicarSelecao(g, new Set());
      map.setZoom(15, { animate: false });
      map.setZoom(10, { animate: false });
    }).not.toThrow();
    expect(() => r.render(def([]), map, ctx)).not.toThrow();
  });

  it('1 000 feições minúsculas em zoom 12 não criam objetos Leaflet (só um canvas por camada)', () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const fs = Array.from({ length: 1000 }, (_, i) => quadrado(`q${i}`, -23.5 + (i % 40) * 0.0008, -46.6 + Math.floor(i / 40) * 0.0008, 40));
    const g = r.render(def(fs), map, ctx);
    expect(g.getLayers()).toHaveLength(0);
    expect(r.estatisticas(g)!.marcasLOD).toBe(1000);
  });
});

describe('seleção incremental: aplicarSelecao não reconcilia a camada inteira', () => {
  // a cor padrão da camada é a mesma da seleção: com cor própria dá para distinguir quem está selecionado
  const muitas = (n: number): Feicao[] =>
    Array.from({ length: n }, (_, i) =>
      quadrado(`q${i}`, -23.5 + (i % 50) * 0.0006, -46.6 + Math.floor(i / 50) * 0.0006, 40, { estilo: { corTraco: '#ff0000' } }));

  it('selecionar e limpar uma feição de polígono não chama reconciliar', () => {
    const map = mapa(16);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def(muitas(LIMITE_CULLING + 100)), map, ctx);
    const reconciliar = vi.spyOn(r as unknown as { reconciliar: () => void }, 'reconciliar');
    r.aplicarSelecao(g, new Set(['q10']));
    r.aplicarSelecao(g, new Set());
    expect(reconciliar).not.toHaveBeenCalled();
  });

  it('só a feição que mudou é tocada: as outras mantêm a mesma camada Leaflet e o mesmo estilo', () => {
    const map = mapa(16);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def(muitas(200)), map, ctx);
    const antes = g.getLayers().map((l) => L.Util.stamp(l));
    r.aplicarSelecao(g, new Set(['q3']));
    expect(g.getLayers().map((l) => L.Util.stamp(l))).toEqual(antes);
    const sel = g.getLayers().filter((l) => (l as L.Polygon).options.color === COR_SELECAO);
    expect(sel).toHaveLength(1);
  });

  it('selecionar só troca o estilo: a geometria da camada Leaflet não é recalculada', () => {
    const map = mapa(16);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def(muitas(50)), map, ctx);
    const poly = g.getLayers()[0] as L.Polygon;
    const setLatLngs = vi.spyOn(poly, 'setLatLngs');
    const setStyle = vi.spyOn(poly, 'setStyle');
    r.aplicarSelecao(g, new Set(['q0']));
    expect(setLatLngs).not.toHaveBeenCalled();
    expect(setStyle).toHaveBeenCalled();
  });

  it('selecionada fora da tela (camada acima do limite de culling) é criada; ao desmarcar, sai', () => {
    const map = mapa(15);
    const r = new FeicoesLayerRenderer();
    const longe: Feicao[] = Array.from({ length: LIMITE_CULLING + 50 }, (_, i) => quadrado(`q${i}`, -23.5 + i * 0.02, -46.6, 200));
    const g = r.render(def(longe), map, ctx);
    const alvo = `q${LIMITE_CULLING + 40}`;
    expect(r.idsDesenhados(g)!.materializadas).not.toContain(alvo);
    r.aplicarSelecao(g, new Set([alvo]));
    expect(r.idsDesenhados(g)!.materializadas).toContain(alvo);
    r.aplicarSelecao(g, new Set());
    expect(r.idsDesenhados(g)!.materializadas).not.toContain(alvo);
  });

  it('ponto sob agrupamento: continua reconciliando (selecionado sai do cluster; desmarcado volta)', () => {
    const map = mapa(15);
    const r = new FeicoesLayerRenderer();
    const fs = Array.from({ length: 50 }, (_, i) => ponto(`p${i}`, -23.5 + i * 1e-6, -46.6));
    const g = r.render(def(fs), map, ctx);
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 0, clusters: 1 });
    r.aplicarSelecao(g, new Set(['p3']));
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 1, clusters: 1 });
    r.aplicarSelecao(g, new Set());
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 0, clusters: 1 });
  });

  it('selecionar uma marca a promove a forma (detalhe completo); limpar a devolve a marca', () => {
    const map = mapa(12);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def(muitas(5)), map, ctx);
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 0, marcasLOD: 5 });
    r.aplicarSelecao(g, new Set(['q1']));
    expect(r.idsDesenhados(g)).toEqual({ materializadas: ['q1'], marcas: ['q0', 'q2', 'q3', 'q4'] });
    r.aplicarSelecao(g, new Set());
    expect(r.estatisticas(g)).toMatchObject({ materializadas: 0, marcasLOD: 5 });
  });

  it('lote grande (> 150 mudanças) termina consistente e uma seleção nova cancela o lote anterior', async () => {
    const map = mapa(16);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def(muitas(600)), map, ctx);
    const todas = Array.from({ length: 500 }, (_, i) => `q${i}`);
    r.aplicarSelecao(g, new Set(todas));
    r.aplicarSelecao(g, new Set(['q0']));
    await esperar(120);
    const sel = g.getLayers().filter((l) => (l as L.Polygon).options.color === COR_SELECAO);
    expect(sel).toHaveLength(1);
  });

  it('seleção de um id inexistente ou excluído não lança e não deixa rastro', () => {
    const map = mapa(16);
    const r = new FeicoesLayerRenderer();
    const g = r.render(def(muitas(10)), map, ctx);
    expect(() => r.aplicarSelecao(g, new Set(['nao-existe']))).not.toThrow();
    expect(r.estatisticas(g)!.materializadas).toBe(10);
  });
});
