import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { LayerRendererFactory } from '../src/gerencigeo-canvas/layer_renderer_factory';
import { RegraVersoes } from '../src/gerencigeo-canvas/feature_versoes';
import { resolverCliqueCentral } from '../src/gerencigeo-canvas/layer_hit_test';
import { COR_SELECAO } from '../src/gerencigeo-canvas/motor/estilo';
import { DespachanteFeicoes } from '../src/gerencigeo-canvas/renderers/feicoes_despachante';
import { FeicoesCanvasRenderer } from '../src/gerencigeo-canvas/renderers/feicoes_canvas_renderer';
import { CanvasFormas, regioesExpostas } from '../src/gerencigeo-canvas/renderers/canvas_formas_leaflet';
import type { IRenderizadorFeicoes } from '../src/gerencigeo-canvas/renderers/renderizador_feicoes_tipos';
import type { CanvasLayerDef } from '../src/gerencigeo-canvas/types';

/*
 * Fase 3: o renderizador Canvas (`renderizador="canvas"`) pelo mesmo caminho do componente (gerenciador de feições
 * + LayerManager), no ambiente com Canvas 2D simulado. Camadas B/C: ciclo de vida, eventos, seleção e entrada hostil.
 */

afterEach(() => { document.body.innerHTML = ''; });

const quadro = () => new Promise<void>((res) => setTimeout(res, 60));
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((23.5 * Math.PI) / 180));

function novo(zoom = 16, modo: 'leaflet' | 'canvas' = 'canvas') {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom });
  const lm = new CanvasLayerManager([]);
  const eventos: Array<[string, any]> = [];
  const regra = new RegraVersoes();
  const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, regra, emitir: (e, d) => eventos.push([e, d]) });
  lm.attachMap(map, {
    config: {}, graphicScale: {}, regraVersoes: regra, renderizador: () => modo,
    onLayerAction: (a: string, d: any) => { const ev = g.tratarAcaoCamada(a, d); if (ev) eventos.push([ev, d]); }
  } as never);
  const grupo = (id = 'c') => lm.getLayerInstance(id) as L.LayerGroup;
  const renderer = () => LayerRendererFactory.get('feicoes') as IRenderizadorFeicoes;
  const defs = (): CanvasLayerDef[] => lm.getLayers();
  const clicar = (ll: L.LatLng, extra: MouseEventInit = {}) => {
    const cp = map.latLngToContainerPoint(ll);
    return resolverCliqueCentral(map, defs(), new MouseEvent('click', { clientX: cp.x, clientY: cp.y, ...extra }));
  };
  const ev = (nome: string) => eventos.filter(([e]) => e === nome).map(([, d]) => d);
  return { g, lm, map, grupo, renderer, defs, clicar, ev };
}

const quad = (id: string, lat: number, lon: number, lado: number, extra: Record<string, unknown> = {}) => ({
  id, ...extra,
  geometria: { tipo: 'Polygon', aneis: [[[lat, lon], [lat, lon + lado * mLon], [lat + lado * mLat, lon + lado * mLon], [lat + lado * mLat, lon]]] }
});
const pt = (id: string, lat = -23.5, lon = -46.6, extra: Record<string, unknown> = {}) => ({ id, geometria: { tipo: 'Point', coordenada: [lat, lon] }, ...extra });

/** Contexto 2D que grava as chamadas, para conferir a pintura pela ponte Leaflet real. */
function gravarCanvas() {
  const chamadas: Array<[string, ...unknown[]]> = [];
  const original = HTMLCanvasElement.prototype.getContext;
  const porCanvas = new WeakMap<HTMLCanvasElement, Array<[string, ...unknown[]]>>();
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    let reg = porCanvas.get(this);
    if (!reg) { reg = []; porCanvas.set(this, reg); }
    const r = reg;
    const estado: Record<string, unknown> = {};
    return new Proxy({ canvas: this }, {
      get(alvo, k: string) {
        if (k in estado) return estado[k];
        if (k === 'canvas') return alvo.canvas;
        return (...a: unknown[]) => { r.push([k, ...a]); chamadas.push([k, ...a]); };
      },
      set(_, k: string, v) { estado[k] = v; r.push([`set:${k}`, v]); return true; }
    });
  } as never;
  return {
    chamadas,
    doCanvas: (c: HTMLCanvasElement) => porCanvas.get(c) ?? [],
    restaurar: () => { HTMLCanvasElement.prototype.getContext = original; }
  };
}

describe('renderizador canvas: nenhum objeto Leaflet por forma', () => {
  it('1 000 polígonos: o grupo guarda só o canvas da camada; as formas estão no motor', async () => {
    const { g, grupo, renderer, map } = novo(16);
    g.definirFeicoes('c', Array.from({ length: 1000 }, (_, i) => quad(`q${i}`, -23.5 + (i % 40) * 1e-4, -46.6 + Math.floor(i / 40) * 1e-4, 40)));
    await quadro();
    const camadas = grupo().getLayers();
    expect(camadas.some((l) => l instanceof L.Polygon || l instanceof L.Polyline || l instanceof L.CircleMarker)).toBe(false);
    expect(camadas.length).toBeLessThanOrEqual(2); // o canvas da camada (+ nenhum marcador)
    expect(renderer().estatisticas(grupo())).toMatchObject({ total: 1000, renderizador: 'canvas', canvases: 2 });
    expect(map.getPane('pane-c')!.querySelectorAll('canvas')).toHaveLength(1);
    expect(map.getPane('cad-formas-sobreposicao')!.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('o canvas tem pointer-events: none na camada e a sobreposição fica acima de todos os panes de feição', async () => {
    const { g, map } = novo(16);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 40)], { zIndex: 900 });
    await quadro();
    expect(Number(map.getPane('cad-formas-sobreposicao')!.style.zIndex)).toBeGreaterThan(900);
    expect(map.getPane('cad-formas-sobreposicao')!.style.pointerEvents).toBe('none');
  });

  it('o dispatcher escolhe o caminho pelo contexto e roteia as chamadas seguintes do mesmo grupo', () => {
    const a = novo(16, 'canvas');
    a.g.definirFeicoes('c', [quad('a', -23.5, -46.6, 40)]);
    const b = novo(16, 'leaflet');
    b.g.definirFeicoes('c', [quad('a', -23.5, -46.6, 40)]);
    const r = LayerRendererFactory.get('feicoes') as DespachanteFeicoes;
    expect(r).toBeInstanceOf(DespachanteFeicoes);
    expect(r.modoDe(a.grupo())).toBe('canvas');
    expect(r.modoDe(b.grupo())).toBe('leaflet');
    expect(r.estatisticas(a.grupo())!.renderizador).toBe('canvas');
    expect(r.estatisticas(b.grupo())!.renderizador).toBe('leaflet');
  });
});

describe('renderizador canvas: pintura pela ponte Leaflet', () => {
  it('pinta no canvas da camada: traço em lote, marcas de LOD como fillRect e nada de objetos por forma', async () => {
    const rec = gravarCanvas();
    try {
      const { g, grupo, renderer, map } = novo(12);
      g.definirFeicoes('c', [
        quad('grande', -23.5, -46.6, 800), quad('mini1', -23.5, -46.59, 30), quad('mini2', -23.5, -46.58, 30)
      ]);
      await quadro();
      const canvas = map.getPane('pane-c')!.querySelector('canvas')!;
      const c = rec.doCanvas(canvas);
      expect(c.filter(([k]) => k === 'fillRect')).toHaveLength(2); // as duas marcas
      expect(c.filter(([k]) => k === 'stroke')).toHaveLength(1); // o polígono grande
      expect(renderer().estatisticas(grupo())).toMatchObject({ desenhadas: 1, marcasLOD: 2 });
    } finally { rec.restaurar(); }
  });

  it('opacidade e visibilidade seguem o pane da camada (opacidade de grupo, sem composição fora da tela)', async () => {
    const { g, lm, map } = novo(16);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 40)]);
    lm.setLayerOpacity('c', 0.4);
    expect(map.getPane('pane-c')!.style.opacity).toBe('0.4');
    lm.setLayerVisibility('c', false);
    expect(map.getPane('pane-c')!.style.display).toBe('none');
    lm.setLayerVisibility('c', true);
    await quadro();
    expect(map.getPane('pane-c')!.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('pan: ao fim do movimento o canvas é repintado com a vista nova; durante, nada é repintado', async () => {
    const rec = gravarCanvas();
    try {
      const { g, map } = novo(15);
      g.definirFeicoes('c', Array.from({ length: 100 }, (_, i) => quad(`q${i}`, -23.5 + (i % 10) * 0.004, -46.6 + Math.floor(i / 10) * 0.004, 300)));
      await quadro();
      const canvas = map.getPane('pane-c')!.querySelector('canvas')!;
      const antes = rec.doCanvas(canvas).filter(([k]) => k === 'stroke').length;
      map.panBy([300, 0], { animate: false });
      await quadro();
      expect(rec.doCanvas(canvas).filter(([k]) => k === 'stroke').length).toBeGreaterThan(antes);
    } finally { rec.restaurar(); }
  });

  it('zoom: a lista é refeita no zoom novo (marcas viram formas ao aproximar)', async () => {
    const { g, grupo, renderer, map } = novo(12);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 40)]);
    await quadro();
    expect(renderer().idsDesenhados(grupo())).toEqual({ materializadas: [], marcas: ['a'] });
    map.setZoom(17, { animate: false });
    await quadro();
    expect(renderer().idsDesenhados(grupo())).toEqual({ materializadas: ['a'], marcas: [] });
  });
});

describe('pan incremental: desloca o bitmap e pinta só as faixas expostas', () => {
  // estes testes têm poucas formas: sem limite, o pan repintaria tudo em vez de deslocar (ver 'pan com poucos itens')
  const limite = CanvasFormas.limiteRepintar;
  beforeEach(() => { CanvasFormas.limiteRepintar = 0; });
  afterEach(() => { CanvasFormas.limiteRepintar = limite; });

  it('regioesExpostas: faixa vertical inteira + faixa horizontal sem a quina; nada para deslocamento zero', () => {
    expect(regioesExpostas(960, 720, 0, 0)).toEqual([]);
    expect(regioesExpostas(960, 720, 120, 0)).toEqual([{ x: 840, y: 0, largura: 120, altura: 720 }]);
    expect(regioesExpostas(960, 720, -120, 0)).toEqual([{ x: 0, y: 0, largura: 120, altura: 720 }]);
    expect(regioesExpostas(960, 720, 0, -50)).toEqual([{ x: 0, y: 0, largura: 960, altura: 50 }]);
    expect(regioesExpostas(960, 720, 100, 50)).toEqual([
      { x: 860, y: 0, largura: 100, altura: 720 }, { x: 0, y: 670, largura: 860, altura: 50 }
    ]);
    expect(regioesExpostas(960, 720, -100, -50)).toEqual([
      { x: 0, y: 0, largura: 100, altura: 720 }, { x: 100, y: 0, largura: 860, altura: 50 }
    ]);
    // as regiões nunca se sobrepõem e cobrem exatamente o que o deslocamento deixou vazio
    for (const [dx, dy] of [[100, 50], [-100, 50], [100, -50], [-100, -50], [30, 0], [0, 30]]) {
      const area = regioesExpostas(960, 720, dx, dy).reduce((t, r) => t + r.largura * r.altura, 0);
      expect(area).toBe(960 * 720 - (960 - Math.abs(dx)) * (720 - Math.abs(dy)));
    }
  });

  it('o pan não limpa o canvas: o bitmap é deslocado (drawImage) e só a faixa nova é pintada com recorte', async () => {
    const rec = gravarCanvas();
    try {
      const { g, map } = novo(15);
      g.definirFeicoes('c', Array.from({ length: 200 }, (_, i) => quad(`q${i}`, -23.5 + (i % 14) * 0.003, -46.6 + Math.floor(i / 14) * 0.003, 150)));
      await quadro();
      const canvas = map.getPane('pane-c')!.querySelector('canvas')!;
      const antes = rec.doCanvas(canvas);
      const limpezas = antes.filter(([k]) => k === 'clearRect').length;
      const n0 = antes.length;
      map.panBy([120, 0], { animate: false });
      await quadro();
      const novas = rec.doCanvas(canvas).slice(n0);
      expect(novas.filter(([k]) => k === 'clearRect')).toHaveLength(0); // sem limpeza total
      expect(novas.some(([k, ...a]) => k === 'drawImage' && Number(a[1]) === -120)).toBe(true); // deslocou 120 px (dpr 1)
      expect(novas.filter(([k]) => k === 'clip')).toHaveLength(1); // uma faixa (só dx)
      expect(rec.doCanvas(canvas).filter(([k]) => k === 'clearRect').length).toBe(limpezas);
    } finally { rec.restaurar(); }
  });

  it('pan em duas direções pinta duas faixas; zoom e dados novos repintam tudo', async () => {
    const rec = gravarCanvas();
    try {
      const { g, map } = novo(15);
      g.definirFeicoes('c', Array.from({ length: 200 }, (_, i) => quad(`q${i}`, -23.5 + (i % 14) * 0.003, -46.6 + Math.floor(i / 14) * 0.003, 150)));
      await quadro();
      const canvas = map.getPane('pane-c')!.querySelector('canvas')!;
      let n = rec.doCanvas(canvas).length;
      map.panBy([80, -60], { animate: false }); // leste e norte: as duas faixas expostas têm formas (a grade cresce para NE)
      await quadro();
      let novas = rec.doCanvas(canvas).slice(n);
      expect(novas.filter(([k]) => k === 'clip')).toHaveLength(2);
      n = rec.doCanvas(canvas).length;
      map.setZoom(16, { animate: false });
      await quadro();
      novas = rec.doCanvas(canvas).slice(n);
      expect(novas.filter(([k]) => k === 'clearRect').length).toBeGreaterThan(0);
      expect(novas.filter(([k]) => k === 'clip')).toHaveLength(0);
      n = rec.doCanvas(canvas).length;
      g.definirFeicoes('c', [quad('novo', -23.5, -46.6, 150)]);
      await quadro();
      expect(rec.doCanvas(canvas).slice(n).filter(([k]) => k === 'clearRect').length).toBeGreaterThan(0);
    } finally { rec.restaurar(); }
  });

  it('salto de vista no MESMO zoom (viewreset) repinta tudo: o conteúdo antigo não pode ser deslocado para o lugar errado', async () => {
    const rec = gravarCanvas();
    try {
      const { g, map } = novo(15);
      g.definirFeicoes('c', [
        ...Array.from({ length: 100 }, (_, i) => quad(`q${i}`, -23.5 + (i % 10) * 0.003, -46.6 + Math.floor(i / 10) * 0.003, 150)),
        quad('destino', -23.3, -46.4, 150) // algo a pintar no destino (destino vazio nem chama o pintor)
      ]);
      await quadro();
      const canvas = map.getPane('pane-c')!.querySelector('canvas')!;
      const n = rec.doCanvas(canvas).length;
      map.setView([-23.5 + 0.2, -46.6 + 0.2], 15, { animate: false }); // longe: o Leaflet refaz a referência dos pontos de camada
      await quadro();
      const novas = rec.doCanvas(canvas).slice(n);
      expect(novas.filter(([k]) => k === 'clearRect').length).toBeGreaterThan(0);
      expect(novas.filter(([k]) => k === 'drawImage')).toHaveLength(0);
      expect(novas.filter(([k]) => k === 'clip')).toHaveLength(0);
    } finally { rec.restaurar(); }
  });

  it('depois de vários pans a lista continua certa: as feições que entram pela faixa aparecem nos marcadores DOM e nos ids', async () => {
    const { g, map, grupo, renderer } = novo(15);
    const pts = Array.from({ length: 6 }, (_, i) => pt(`i${i}`, -23.5, -46.6 + i * 0.01, { estilo: { icone: 'tower' } }));
    g.definirFeicoes('c', pts);
    await quadro();
    const visiveis = () => renderer().idsDesenhados(grupo())!.materializadas;
    expect(visiveis()).toContain('i0');
    map.panBy([700, 0], { animate: false });
    await quadro();
    map.panBy([700, 0], { animate: false });
    await quadro();
    const doms = grupo().getLayers().filter((l): l is L.Marker => l instanceof L.Marker).length;
    expect(doms).toBe(visiveis().length);
    expect(visiveis().length).toBeGreaterThan(0);
  });
});

describe('renderizador canvas: seleção na sobreposição', () => {
  it('selecionar repinta só a sobreposição (com a cor de seleção); a base não é repintada', async () => {
    const rec = gravarCanvas();
    try {
      const { g, map } = novo(16);
      g.definirFeicoes('c', Array.from({ length: 200 }, (_, i) => quad(`q${i}`, -23.5 + (i % 20) * 1e-4, -46.6 + Math.floor(i / 20) * 1e-4, 40)));
      await quadro();
      const base = map.getPane('pane-c')!.querySelector('canvas')!;
      const sobre = map.getPane('cad-formas-sobreposicao')!.querySelector('canvas')!;
      const baseAntes = rec.doCanvas(base).length;
      g.selecionarFeicoes([{ camadaId: 'c', id: 'q3' }, { camadaId: 'c', id: 'q4' }]);
      await quadro();
      expect(rec.doCanvas(base).length).toBe(baseAntes);
      const s = rec.doCanvas(sobre);
      expect(s.filter(([k, v]) => k === 'set:strokeStyle' && v === COR_SELECAO).length).toBeGreaterThan(0);
      expect(s.filter(([k]) => k === 'fill').length).toBe(2);
    } finally { rec.restaurar(); }
  });

  it('aplicarSelecao é O(mudanças): não lista a camada (sem pintura síncrona) e não toca na base', () => {
    const { g, renderer, grupo } = novo(16);
    g.definirFeicoes('c', Array.from({ length: 500 }, (_, i) => quad(`q${i}`, -23.5 + (i % 20) * 1e-4, -46.6 + Math.floor(i / 20) * 1e-4, 40)));
    const est = (grupo() as unknown as { _map: L.Map })._map;
    expect(est).toBeTruthy();
    const t0 = performance.now();
    renderer().aplicarSelecao(grupo(), new Set(['q1']));
    expect(performance.now() - t0).toBeLessThan(20);
    expect(g.obterFeicoesSelecionadas()).toHaveLength(0); // o estado de seleção é do gerenciador; aqui só o visual
  });

  it('a seleção sobrevive à recriação do grupo (ocultar e exibir)', async () => {
    const { g, lm, grupo, renderer } = novo(16);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 300), quad('b', -23.5, -46.599, 300)]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'a' }]);
    lm.setLayerVisibility('c', false);
    lm.setLayerVisibility('c', true);
    await quadro();
    expect(renderer().idsDesenhados(grupo())!.materializadas).toEqual(['a', 'b']);
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['a']);
  });

  it('feição em edição: previsualizar tira do base e mostra na sobreposição com a geometria nova', async () => {
    const rec = gravarCanvas();
    try {
      const { g, grupo, renderer, map } = novo(16);
      g.definirFeicoes('c', [quad('a', -23.5, -46.6, 300)]);
      await quadro();
      const base = map.getPane('pane-c')!.querySelector('canvas')!;
      const sobre = map.getPane('cad-formas-sobreposicao')!.querySelector('canvas')!;
      const strokesBase = rec.doCanvas(base).filter(([k]) => k === 'stroke').length;
      renderer().previsualizar(grupo(), { ...(g.buscar('c', 'a')!), ...quad('a', -23.5, -46.6, 500), camadaId: 'c' } as never);
      await quadro();
      expect(rec.doCanvas(base).filter(([k]) => k === 'stroke').length).toBe(strokesBase); // base repintada sem a feição
      expect(rec.doCanvas(sobre).filter(([k]) => k === 'stroke').length).toBeGreaterThan(0);
    } finally { rec.restaurar(); }
  });
});

describe('renderizador canvas: marcadores DOM e curvas (híbrido)', () => {
  it('ponto com ícone, texto e cluster são marcadores Leaflet; o ponto sem ícone é pintado no canvas', async () => {
    const { g, grupo } = novo(16);
    g.definirFeicoes('c', [
      pt('icone', -23.5, -46.6, { estilo: { icone: 'tower' } }),
      pt('simples', -23.5, -46.601),
      { id: 'texto', geometria: { tipo: 'Text', coordenada: [-23.5, -46.602], texto: 'Gleba' } }
    ]);
    await quadro();
    const marcadores = grupo().getLayers().filter((l): l is L.Marker => l instanceof L.Marker);
    expect(marcadores).toHaveLength(2);
    expect(grupo().getLayers().some((l) => l instanceof L.CircleMarker)).toBe(false);
  });

  it('clique no marcador DOM seleciona a feição (aditivo com Ctrl) e arrastar o texto emite feicao-movida', async () => {
    const { g, grupo, ev } = novo(16);
    g.definirFeicoes('c', [
      pt('icone', -23.5, -46.6, { estilo: { icone: 'tower' } }),
      { id: 'texto', geometria: { tipo: 'Text', coordenada: [-23.5, -46.602], texto: 'Gleba' } }
    ]);
    await quadro();
    const marcadores = grupo().getLayers().filter((l): l is L.Marker => l instanceof L.Marker);
    const texto = marcadores.find((m) => m.options.draggable)!;
    const icone = marcadores.find((m) => !m.options.draggable)!;
    icone.fire('click', { originalEvent: {} });
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['icone']);
    texto.fire('click', { originalEvent: { ctrlKey: true } });
    expect(g.obterFeicoesSelecionadas().map((f) => f.id).sort()).toEqual(['icone', 'texto']);
    texto.setLatLng([-23.5, -46.61]);
    texto.fire('dragend');
    expect(ev('cad-feicao-atualizada').length).toBeGreaterThan(0);
  });

  it('selecionar troca o ícone do marcador (variante selecionada) sem repintar a camada', async () => {
    const { g, grupo } = novo(16);
    g.definirFeicoes('c', [pt('icone', -23.5, -46.6, { estilo: { icone: 'tower' } })]);
    await quadro();
    const m = grupo().getLayers().find((l): l is L.Marker => l instanceof L.Marker)!;
    expect((m.options.icon as L.DivIcon).options.className).not.toContain('cad-feicao-selecionada');
    g.selecionarFeicoes([{ camadaId: 'c', id: 'icone' }]);
    expect((m.options.icon as L.DivIcon).options.className).toContain('cad-feicao-selecionada');
  });

  it('pontos próximos viram cluster (marcador DOM); selecionar um o separa; clique no cluster enquadra', async () => {
    const { g, grupo, renderer, map } = novo(15);
    g.definirFeicoes('c', Array.from({ length: 50 }, (_, i) => pt(`p${i}`, -23.5 + i * 1e-6, -46.6)));
    await quadro();
    expect(renderer().estatisticas(grupo())).toMatchObject({ clusters: 1 });
    const cluster = grupo().getLayers().find((l): l is L.Marker => l instanceof L.Marker)!;
    expect((cluster.options.icon as L.DivIcon).options.html).toContain('>50<');
    g.selecionarFeicoes([{ camadaId: 'c', id: 'p3' }]);
    await quadro();
    expect(renderer().idsDesenhados(grupo())!.materializadas).toContain('p3');
    const zoom = map.getZoom();
    cluster.fire('click');
    expect(map.getZoom()).toBeGreaterThanOrEqual(zoom);
  });

  it('selecionar pontos sob cluster atualiza só os marcadores DOM e a sobreposição: o canvas base nunca é repintado pela seleção', async () => {
    const rec = gravarCanvas();
    try {
      const { g, grupo, renderer, map } = novo(15);
      g.definirFeicoes('c', Array.from({ length: 50 }, (_, i) => pt(`p${i}`, -23.5 + i * 1e-6, -46.6)));
      await quadro();
      const base = map.getPane('pane-c')!.querySelector('canvas')!;
      const limpezas = () => rec.doCanvas(base).filter(([k]) => k === 'clearRect').length;
      const antes = limpezas();
      g.selecionarFeicoes([{ camadaId: 'c', id: 'p3' }]);
      await quadro();
      expect(renderer().idsDesenhados(grupo())!.materializadas).toContain('p3');
      expect(renderer().estatisticas(grupo())).toMatchObject({ clusters: 1 });
      g.selecionarFeicoes(Array.from({ length: 49 }, (_, i) => ({ camadaId: 'c', id: `p${i}` })));
      await quadro();
      expect(renderer().idsDesenhados(grupo())!.materializadas).toContain('p49'); // o único restante sai do cluster
      expect(renderer().estatisticas(grupo())!.clusters).toBe(0);
      g.limparSelecaoFeicoes();
      await quadro();
      expect(renderer().estatisticas(grupo())!.clusters).toBe(1);
      expect(limpezas()).toBe(antes); // nenhuma dessas seleções repintou o base
    } finally { rec.restaurar(); }
  });

  it('rótulo permanente é um tooltip em marcador DOM; curva segue no caminho Leaflet legado', async () => {
    const { g, grupo } = novo(16);
    g.definirFeicoes('c', [
      quad('r', -23.5, -46.6, 300, { estilo: { mostrarRotulo: true, campoRotulo: 'nome' }, propriedades: { nome: 'Gleba 7' } }),
      { id: 'cv', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.599]], curva: [{ ponto: [-23.5, -46.6], saida: [-23.4995, -46.6] }, { ponto: [-23.5, -46.599] }] } }
    ]);
    await quadro();
    const camadas = grupo().getLayers();
    expect(camadas.some((l) => l instanceof L.Marker && (l as L.Marker).getTooltip())).toBe(true);
    expect(camadas.some((l) => l instanceof L.Polyline)).toBe(true); // a curva
  });
});

describe('renderizador canvas: clique e consultas pela geometria original', () => {
  const noCentro = (dx: number, dy: number) => L.latLng(-23.5 + dy * mLat, -46.6 + dx * mLon);

  it('clique numa forma pintada no canvas seleciona UMA feição (hit-test central); fora, nada', async () => {
    const { g, clicar } = novo(16);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 100), quad('b', -23.5, -46.59, 100)]);
    await quadro();
    expect(clicar(noCentro(50, 50))).toBe(true);
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['a']);
    expect(clicar(L.latLng(-23.45, -46.5))).toBe(false);
  });

  it('a feição de 1 px (marca de LOD) continua clicável', async () => {
    const { g, clicar, grupo, renderer } = novo(12);
    g.definirFeicoes('c', [quad('mini', -23.5, -46.6, 25)]);
    await quadro();
    expect(renderer().idsDesenhados(grupo())!.marcas).toEqual(['mini']);
    clicar(noCentro(12, 12));
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['mini']);
  });

  it('formas empilhadas: o menor polígono vence e cliques repetidos alternam; Ctrl é aditivo', async () => {
    const { g, clicar } = novo(16);
    g.definirFeicoes('c', [quad('grande', -23.5, -46.6, 200), quad('pequeno', -23.5 + 50 * mLat, -46.6 + 50 * mLon, 60)]);
    await quadro();
    clicar(noCentro(80, 80));
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['pequeno']);
    clicar(noCentro(80, 80));
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['grande']);
    clicar(noCentro(80, 80), { ctrlKey: true });
    expect(g.obterFeicoesSelecionadas().map((f) => f.id).sort()).toEqual(['grande', 'pequeno']);
  });

  it('camada bloqueada, não interativa ou oculta não captura clique; feição oculta não é clicável', async () => {
    const { g, lm, clicar } = novo(16);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 100), quad('o', -23.5, -46.59, 100, { oculta: true })]);
    await quadro();
    expect(clicar(noCentro(50, 50))).toBe(true);
    expect(clicar(L.latLng(-23.5 + 50 * mLat, -46.59 + 50 * mLon))).toBe(false); // oculta
    lm.setLayerBlocked('c', true);
    expect(clicar(noCentro(50, 50))).toBe(false);
    lm.setLayerBlocked('c', false);
    expect(clicar(noCentro(50, 50))).toBe(true);
  });

  it('consultarProximas (snap, hover) usa o índice: acha a feição e ignora a oculta', async () => {
    const { g, renderer, grupo } = novo(16);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 100), quad('o', -23.5, -46.6, 100, { oculta: true })]);
    const achadas = renderer().consultarProximas(grupo(), { minLat: -24, maxLat: -23, minLon: -47, maxLon: -46 });
    expect(achadas.map((f) => f.id)).toEqual(['a']);
  });

  it('ferramenta de desenho ativa tem prioridade sobre a seleção (o clique não seleciona)', async () => {
    const { g, clicar } = novo(16);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 100)]);
    await quadro();
    g.definirCamadaDesenho('desenhos');
    expect(g.alternarFerramenta('ponto').ok).toBe(true);
    clicar(noCentro(50, 50));
    expect(g.obterFeicoesSelecionadas()).toHaveLength(0);
  });
});

describe('renderizador canvas: ciclo de vida (Regra #2) e entrada hostil (Regra #0)', () => {
  it('destroy tira o canvas, a fonte do hit-test e a feição da sobreposição; reexibir não duplica', async () => {
    const { g, lm, map, clicar } = novo(16);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 100)]);
    await quadro();
    lm.setLayerVisibility('c', false);
    expect(map.getPane('pane-c')!.querySelectorAll('canvas')).toHaveLength(0);
    expect(clicar(L.latLng(-23.5 + 50 * mLat, -46.6 + 50 * mLon))).toBe(false);
    lm.setLayerVisibility('c', true);
    await quadro();
    expect(map.getPane('pane-c')!.querySelectorAll('canvas')).toHaveLength(1);
    expect(map.getPane('cad-formas-sobreposicao')!.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('geometrias degeneradas, NaN, ids duplicados e camada vazia não lançam nem derrubam os quadros', async () => {
    const { g, renderer, grupo } = novo(16);
    expect(() => {
      g.definirFeicoes('c', [
        quad('nan', NaN, NaN, 40), quad('ok', -23.5, -46.6, 100),
        { id: 'vazio', geometria: { tipo: 'Polygon', aneis: [[]] } },
        { id: 'inf', geometria: { tipo: 'Circle', centro: [-23.5, -46.6], raioMetros: Infinity } }
      ]);
    }).not.toThrow();
    await quadro();
    expect(() => {
      g.selecionarFeicoes([{ camadaId: 'c', id: 'nan' }, { camadaId: 'c', id: 'ok' }]);
      g.limparSelecaoFeicoes();
      renderer().aplicarSelecao(grupo(), new Set(['fantasma']));
    }).not.toThrow();
    await quadro();
    expect(renderer().idsDesenhados(grupo())!.materializadas).toContain('ok');
  });

  it('um contexto 2D que lança durante a pintura não quebra o mapa nem o ciclo de eventos', async () => {
    const original = HTMLCanvasElement.prototype.getContext;
    const quebra = () => { throw new Error('canvas quebrado'); };
    HTMLCanvasElement.prototype.getContext = (() => ({
      translate() {}, scale() {}, rotate() {}, save() {}, restore() {}, clearRect() {}, setTransform() {}, setLineDash() {}, beginPath() {},
      moveTo() {}, lineTo() {}, closePath() {}, arc() {}, rect() {}, clip() {},
      stroke: quebra, fill: quebra, fillRect: quebra // a pintura das formas falha; o resto do Leaflet segue
    })) as never;
    try {
      const { g, map } = novo(16);
      expect(() => g.definirFeicoes('c', [quad('a', -23.5, -46.6, 100)])).not.toThrow();
      await quadro();
      expect(() => { map.panBy([50, 0], { animate: false }); map.setZoom(15, { animate: false }); }).not.toThrow();
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
    }
  });

  it('mapa sem vista: o renderizador não lança e pinta quando a vista chega', async () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    Object.defineProperty(el, 'clientHeight', { value: 600 });
    document.body.appendChild(el);
    const map = L.map(el, { preferCanvas: true });
    const lm = new CanvasLayerManager([]);
    const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, regra: new RegraVersoes(), emitir: () => undefined });
    expect(() => {
      lm.attachMap(map, { config: {}, graphicScale: {}, renderizador: () => 'canvas' } as never);
      g.definirFeicoes('c', [quad('a', -23.5, -46.6, 100)]);
    }).not.toThrow();
    map.setView([-23.5, -46.6], 16, { animate: false });
    await quadro();
    expect(map.getPane('pane-c')!.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('troca de renderizador em execução: lm.recriarCamadasDoTipo refaz o desenho e mantém dados e seleção', async () => {
    let modo: 'leaflet' | 'canvas' = 'leaflet';
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    Object.defineProperty(el, 'clientHeight', { value: 600 });
    document.body.appendChild(el);
    const map = L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom: 16 });
    const lm = new CanvasLayerManager([]);
    const regra = new RegraVersoes();
    const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, regra, emitir: () => undefined });
    lm.attachMap(map, { config: {}, graphicScale: {}, regraVersoes: regra, renderizador: () => modo } as never);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 100), quad('b', -23.5, -46.599, 100)]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'a' }]);
    const r = LayerRendererFactory.get('feicoes') as DespachanteFeicoes;
    expect(r.modoDe(lm.getLayerInstance('c')!)).toBe('leaflet');
    modo = 'canvas';
    lm.recriarCamadasDoTipo('feicoes');
    await quadro();
    expect(r.modoDe(lm.getLayerInstance('c')!)).toBe('canvas');
    expect(g.obterFeicoes('c').map((f) => f.id)).toEqual(['a', 'b']);
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['a']);
    expect(r.idsDesenhados(lm.getLayerInstance('c') as L.LayerGroup)!.materializadas).toEqual(['a', 'b']);
  });

  it('o renderizador canvas é independente do despachante (instância direta, sem contexto de renderização)', () => {
    const r = new FeicoesCanvasRenderer();
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    Object.defineProperty(el, 'clientHeight', { value: 600 });
    document.body.appendChild(el);
    const map = L.map(el, { center: [-23.5, -46.6], zoom: 16 });
    const def: CanvasLayerDef = { id: 'solo', nome: 's', categoria: 'custom', tipo: 'feicoes', visivel: true, opacidade: 1, zIndex: 600, interativo: true, estilo: {}, dados: { feicoes: [{ ...quad('a', -23.5, -46.6, 100), camadaId: 'solo', propriedades: {} }] } };
    const grupo = r.render(def, map, { config: {}, graphicScale: {} } as never);
    grupo.addTo(map);
    expect(r.estatisticas(grupo)).toMatchObject({ total: 1, renderizador: 'canvas' });
    r.destroy(grupo, map);
    expect(r.estatisticas(grupo)).toBeNull();
    vi.useRealTimers();
  });
});

describe('canvas em branco não é tocado (cada chamada de desenho faz o navegador reenviar o canvas ao compositor)', () => {
  const longe = () => Array.from({ length: 50 }, (_, i) => quad(`l${i}`, -22 + i * 0.001, -45, 150)); // ~200 km da vista
  const sobreposicao = (map: L.Map) => map.getPane('cad-formas-sobreposicao')!.querySelector('canvas')!;
  /** Só o que muda pixels: estado do contexto (`setTransform`, `save`...) não faz o canvas ser reenviado. */
  const PIXELS = new Set(['drawImage', 'clearRect', 'fillRect', 'fill', 'stroke', 'putImageData']);
  const desenho = (chamadas: Array<[string, ...unknown[]]>) => chamadas.filter(([k]) => PIXELS.has(k));

  it('camada sem nada na vista: o pan não desloca, não limpa e não pinta o canvas dela', async () => {
    const rec = gravarCanvas();
    try {
      const { g, map } = novo(15);
      g.definirFeicoes('c', longe());
      await quadro();
      const canvas = map.getPane('pane-c')!.querySelector('canvas')!;
      const n = rec.doCanvas(canvas).length;
      for (const d of [[120, 0], [-60, 40], [0, -90]] as Array<[number, number]>) {
        map.panBy(d, { animate: false });
        await quadro();
      }
      expect(desenho(rec.doCanvas(canvas).slice(n))).toEqual([]);
    } finally { rec.restaurar(); }
  });

  it('camada que esvazia é limpa uma vez, fica intocada no pan e volta a pintar quando há o que desenhar', async () => {
    const rec = gravarCanvas();
    try {
      const { g, map } = novo(15);
      g.definirFeicoes('c', [quad('a', -23.5, -46.6, 150)]);
      await quadro();
      const canvas = map.getPane('pane-c')!.querySelector('canvas')!;
      let n = rec.doCanvas(canvas).length;
      g.definirFeicoes('c', longe());
      await quadro();
      expect(rec.doCanvas(canvas).slice(n).filter(([k]) => k === 'clearRect')).toHaveLength(1); // o desenho antigo sai
      n = rec.doCanvas(canvas).length;
      map.panBy([100, 0], { animate: false });
      await quadro();
      expect(desenho(rec.doCanvas(canvas).slice(n))).toEqual([]);
      g.definirFeicoes('c', [quad('a', -23.5, -46.6, 150)]);
      await quadro();
      expect(rec.doCanvas(canvas).slice(n).some(([k]) => k === 'fill')).toBe(true);
      n = rec.doCanvas(canvas).length;
      map.panBy([60, 0], { animate: false }); // com conteúdo (1 item, abaixo do limite) o pan volta a tocar no canvas
      await quadro();
      expect(rec.doCanvas(canvas).slice(n).some(([k]) => k === 'clearRect')).toBe(true);
      expect(rec.doCanvas(canvas).slice(n).some(([k]) => k === 'fill')).toBe(true);
    } finally { rec.restaurar(); }
  });

  it('sobreposição: sem seleção o pan não a toca; com seleção é repintada; ao limpar a seleção é apagada uma vez', async () => {
    const rec = gravarCanvas();
    try {
      const { g, map } = novo(15);
      g.definirFeicoes('c', [quad('a', -23.5, -46.6, 150)]);
      await quadro();
      const sob = sobreposicao(map);
      let n = rec.doCanvas(sob).length;
      map.panBy([80, 0], { animate: false });
      await quadro();
      expect(desenho(rec.doCanvas(sob).slice(n))).toEqual([]);

      g.selecionarFeicoes([{ camadaId: 'c', id: 'a' }]);
      await quadro();
      expect(rec.doCanvas(sob).slice(n).some(([k]) => k === 'stroke')).toBe(true);
      n = rec.doCanvas(sob).length;
      map.panBy([-80, 0], { animate: false });
      await quadro();
      expect(rec.doCanvas(sob).slice(n).some(([k]) => k === 'stroke')).toBe(true);

      g.limparSelecaoFeicoes();
      await quadro();
      n = rec.doCanvas(sob).length;
      map.panBy([40, 0], { animate: false });
      await quadro();
      expect(desenho(rec.doCanvas(sob).slice(n))).toEqual([]);
    } finally { rec.restaurar(); }
  });
});

describe('pan com poucos itens: repinta a vista inteira em vez de deslocar o bitmap', () => {
  const limite = CanvasFormas.limiteRepintar;
  afterEach(() => { CanvasFormas.limiteRepintar = limite; });
  const grade = () => Array.from({ length: 200 }, (_, i) => quad(`q${i}`, -23.5 + (i % 14) * 0.003, -46.6 + Math.floor(i / 14) * 0.003, 150));

  async function panGravado(limiteRepintar: number) {
    CanvasFormas.limiteRepintar = limiteRepintar;
    const rec = gravarCanvas();
    try {
      const { g, map } = novo(15);
      g.definirFeicoes('c', grade());
      await quadro();
      const canvas = map.getPane('pane-c')!.querySelector('canvas')!;
      const n = rec.doCanvas(canvas).length;
      map.panBy([120, 0], { animate: false });
      await quadro();
      return rec.doCanvas(canvas).slice(n).map(([k]) => k);
    } finally { rec.restaurar(); }
  }

  it(`até o limite (padrão ${CanvasFormas.limiteRepintar}): sem drawImage nem recorte, limpa e repinta tudo`, async () => {
    const k = await panGravado(CanvasFormas.limiteRepintar);
    expect(k).not.toContain('drawImage');
    expect(k).not.toContain('clip');
    expect(k.filter((x) => x === 'clearRect')).toHaveLength(1);
    expect(k).toContain('fill');
  });

  it('acima do limite: desloca o bitmap e pinta só a faixa exposta', async () => {
    const k = await panGravado(5);
    expect(k).toContain('drawImage');
    expect(k.filter((x) => x === 'clip')).toHaveLength(1);
    expect(k).not.toContain('clearRect');
  });

  it('limite hostil (NaN, negativo, Infinity) não lança; NaN e negativo valem 0 (sempre desloca)', async () => {
    for (const l of [Number.NaN, -10]) expect(await panGravado(l)).toContain('drawImage');
    expect(await panGravado(Number.POSITIVE_INFINITY)).not.toContain('drawImage');
  });
});
