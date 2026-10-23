import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { COR_SELECAO, LIMITE_CULLING, type FeicoesLayerRenderer } from '../src/gerencigeo-canvas/renderers/feicoes_renderer';
import { LayerRendererFactory } from '../src/gerencigeo-canvas/layer_renderer_factory';
import { RegraVersoes } from '../src/gerencigeo-canvas/feature_versoes';
import { nomePane, nomeSubPane, ORDEM_GEOMETRIA } from '../src/gerencigeo-canvas/layer_pane_ops';
import type { LatLonPar } from '../src/gerencigeo-canvas/feature_types';

/*
 * Fase 0 do motor de formas: caracteriza o que o renderizador de feições (caminho Leaflet) faz hoje, para o
 * renderizador Canvas das fases seguintes ter uma régua. Nenhum teste aqui muda comportamento; se um falhar depois
 * de uma refatoração, a mudança de comportamento é real e precisa ser decidida (e entrar no CHANGELOG).
 */

afterEach(() => { document.body.innerHTML = ''; });

function novo(zoom = 17) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom });
  const lm = new CanvasLayerManager([]);
  const eventos: Array<[string, any]> = [];
  const regra = new RegraVersoes();
  const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, regra, emitir: (e, d) => eventos.push([e, d]) });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: (a: string, d: any) => g.tratarAcaoCamada(a, d), regraVersoes: regra } as never);
  const ev = (nome: string) => eventos.filter(([e]) => e === nome).map(([, d]) => d);
  const grupo = (id = 'c') => lm.getLayerInstance(id) as L.LayerGroup;
  const renderer = () => LayerRendererFactory.get('feicoes') as FeicoesLayerRenderer;
  return { g, lm, map, ev, grupo, renderer };
}

const A: LatLonPar = [-23.5, -46.6];
const pt = (id: string, c: LatLonPar = A, extra: Record<string, unknown> = {}) => ({ id, geometria: { tipo: 'Point', coordenada: c }, ...extra });
const quad = (id: string, extra: Record<string, unknown> = {}) => ({
  id, geometria: { tipo: 'Polygon', aneis: [[[-23.499, -46.601], [-23.499, -46.599], [-23.501, -46.599], [-23.501, -46.601]]] }, ...extra
});
const linha = (id: string, extra: Record<string, unknown> = {}) => ({
  id, geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.601], [-23.5, -46.599]] }, ...extra
});

describe('z-order e opacidade (panes)', () => {
  it('cada camada tem um pane com o seu zIndex; mudar o zIndex move o pane', () => {
    const { g, lm, map } = novo();
    g.definirFeicoes('a', [quad('q')], { zIndex: 700 });
    g.definirFeicoes('b', [quad('r')], { zIndex: 800 });
    expect(map.getPane(nomePane('a'))!.style.zIndex).toBe('700');
    expect(map.getPane(nomePane('b'))!.style.zIndex).toBe('800');
    lm.setLayerZIndex('a', 900);
    expect(map.getPane(nomePane('a'))!.style.zIndex).toBe('900');
  });

  it('dentro da camada: polígono < linha < ponto < texto (sub-panes)', () => {
    const { g, map } = novo();
    g.definirFeicoes('c', [
      quad('q'), linha('l'), pt('p'),
      { id: 't', geometria: { tipo: 'Text', coordenada: A, texto: 'x' } }
    ]);
    const z = ORDEM_GEOMETRIA.map((tipo) => Number(map.getPane(nomeSubPane('c', tipo))!.style.zIndex));
    expect(z).toEqual([100, 200, 300, 400]);
    expect([...z].sort((x, y) => x - y)).toEqual(z);
  });

  it('opacidade é do grupo (pane), não de cada forma: o estilo de cada forma não muda', () => {
    const { g, lm, map, grupo } = novo();
    g.definirFeicoes('c', [quad('q', { estilo: { opacidadePreenchimento: 0.5 } })]);
    const antes = (grupo().getLayers()[0] as L.Polygon).options.fillOpacity;
    lm.setLayerOpacity('c', 0.4);
    expect(map.getPane(nomePane('c'))!.style.opacity).toBe('0.4');
    expect((grupo().getLayers()[0] as L.Polygon).options.fillOpacity).toBe(antes);
  });

  it('camada oculta no mapa some pelo pane (display none) e volta desenhada', () => {
    const { g, lm, map, grupo } = novo();
    g.definirFeicoes('c', [quad('q')]);
    lm.setLayerVisibility('c', false);
    expect(map.getPane(nomePane('c'))!.style.display).toBe('none');
    lm.setLayerVisibility('c', true);
    expect(map.getPane(nomePane('c'))!.style.display).toBe('');
    // hoje o grupo Leaflet é recriado ao reexibir (o custo do `exibir camada` no benchmark); só a contagem é contrato
    expect(grupo().getLayers()).toHaveLength(1);
  });

  it('camada bloqueada não captura ponteiro (pointer-events none no pane)', () => {
    const { g, lm, map } = novo();
    g.definirFeicoes('c', [quad('q')]);
    expect(map.getPane(nomePane('c'))!.style.pointerEvents).toBe('auto');
    lm.setLayerBlocked('c', true);
    expect(map.getPane(nomePane('c'))!.style.pointerEvents).toBe('none');
  });
});

describe('oculta × excluida', () => {
  it('oculta: existe nos dados e não é desenhada; excluida: sai da camada', () => {
    const { g, grupo } = novo();
    g.definirFeicoes('c', [quad('a'), quad('b', { oculta: true }), quad('c', { excluida: true })]);
    expect(grupo().getLayers()).toHaveLength(1);
    expect(g.obterFeicoes('c').map((f) => f.id)).toContain('b');
    expect(g.desenhada(g.buscar('c', 'b')!)).toBe(false);
    expect(g.desenhada(g.buscar('c', 'a')!)).toBe(true);
  });

  it('oculta não entra na seleção por caixa nem na consulta de snap', () => {
    const { g, renderer, grupo } = novo();
    g.definirFeicoes('c', [pt('a'), pt('b', A, { oculta: true })]);
    expect(renderer().consultarProximas(grupo(), { minLat: -24, maxLat: -23, minLon: -47, maxLon: -46 }).map((f) => f.id)).toEqual(['a']);
  });
});

describe('oficial × prévia', () => {
  const oficial = quad('of', { entidadeId: 'e1' });
  const previa = quad('pv', { entidadeId: 'e1', status: 'previa' });

  it('com oficial na entidade, a prévia fica escondida até as prévias serem ligadas', () => {
    const { g, grupo } = novo();
    g.definirFeicoes('c', [oficial, previa]);
    expect(grupo().getLayers()).toHaveLength(1);
    g.definirPreviasGlobais(true);
    expect(grupo().getLayers()).toHaveLength(2);
    g.definirPreviasGlobais(false);
    expect(grupo().getLayers()).toHaveLength(1);
  });

  it('prévia sem oficial na entidade aparece sempre, tracejada', () => {
    const { g, grupo } = novo();
    g.definirFeicoes('c', [quad('so-previa', { entidadeId: 'e2', status: 'previa' })]);
    const l = grupo().getLayers() as L.Polygon[];
    expect(l).toHaveLength(1);
    expect(l[0].options.dashArray).toBe('6 4');
  });

  it('alternar a prévia de uma entidade a mostra sem ligar as globais', () => {
    const { g, grupo } = novo();
    g.definirFeicoes('c', [oficial, previa]);
    expect(g.alternarPrevia('c', 'pv')).toBe(true);
    expect(grupo().getLayers()).toHaveLength(2);
  });
});

describe('seleção no renderizador', () => {
  it('selecionar pinta de COR_SELECAO; limpar volta ao estilo normal', () => {
    const { g, grupo } = novo();
    g.definirFeicoes('c', [quad('q', { estilo: { corTraco: '#ff0000' } })]);
    const poly = grupo().getLayers()[0] as L.Polygon;
    expect(poly.options.color).toBe('#ff0000');
    g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]);
    expect(poly.options.color).toBe(COR_SELECAO);
    g.limparSelecaoFeicoes();
    expect(poly.options.color).toBe('#ff0000');
  });

  it('seleção aditiva soma; não aditiva substitui; alternar inverte', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quad('a'), quad('b'), quad('d')]);
    const sel = () => g.obterFeicoesSelecionadas().map((f) => f.id).sort();
    g.selecionarFeicoes([{ camadaId: 'c', id: 'a' }]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'b' }], true);
    expect(sel()).toEqual(['a', 'b']);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'd' }]);
    expect(sel()).toEqual(['d']);
    g.alternarSelecaoFeicao({ camadaId: 'c', id: 'd' });
    expect(sel()).toEqual([]);
  });

  it('clique na forma passa pela camada Leaflet: com Ctrl/Shift/Meta é aditivo', () => {
    const { g, grupo, ev } = novo();
    g.definirFeicoes('c', [quad('a'), quad('b')]);
    const [a, b] = grupo().getLayers() as L.Polygon[];
    a.fire('click', { originalEvent: { ctrlKey: false } });
    b.fire('click', { originalEvent: { shiftKey: true } });
    expect(g.obterFeicoesSelecionadas().map((f) => f.id).sort()).toEqual(['a', 'b']);
    expect(ev('cad-selecao').length).toBeGreaterThan(0);
  });

  it('camada não interativa não recebe clique de seleção (interactive: false na forma)', () => {
    const { g, grupo } = novo();
    g.definirFeicoes('c', [quad('a')], { interativo: false });
    expect((grupo().getLayers()[0] as L.Polygon).options.interactive).toBe(false);
  });

  it('com a camada acima do limite de culling, a selecionada fora da tela continua desenhada', () => {
    const { g, renderer, grupo } = novo(15);
    const muitas = Array.from({ length: LIMITE_CULLING + 100 }, (_, i) =>
      pt(`p${i}`, [-23.5 + i * 0.02, -46.6], { estilo: { corTraco: '#ff0000' } }));
    g.definirFeicoes('c', muitas);
    const longe = `p${LIMITE_CULLING + 90}`;
    expect(renderer().estatisticas(grupo())!.materializadas).toBeLessThan(40);
    g.selecionarFeicoes([{ camadaId: 'c', id: longe }]);
    const sel = grupo().getLayers().filter((l) => (l as L.CircleMarker).options?.color === COR_SELECAO);
    expect(sel).toHaveLength(1);
  });
});

describe('culling: limite de 300 feições', () => {
  const espalhadas = (n: number) => Array.from({ length: n }, (_, i) => pt(`p${i}`, [-23.5 + i * 0.05, -46.6]));

  it('até o limite materializa tudo; um acima disso passa a cortar pela viewport', () => {
    const a = novo(15);
    a.g.definirFeicoes('c', espalhadas(LIMITE_CULLING));
    expect(a.renderer().estatisticas(a.grupo())!.materializadas).toBe(LIMITE_CULLING);
    document.body.innerHTML = '';
    const b = novo(15);
    b.g.definirFeicoes('c', espalhadas(LIMITE_CULLING + 1));
    expect(b.renderer().estatisticas(b.grupo())!.materializadas).toBeLessThan(LIMITE_CULLING);
  });
});

describe('DPR', () => {
  it('o DPR do canvas é de responsabilidade do Leaflet (L.Browser.retina): o kit não toca nele', () => {
    // happy-dom não tem Canvas 2D real; o que dá para garantir é que o kit não define escala própria.
    const { g, map } = novo();
    g.definirFeicoes('c', [quad('q')]);
    expect(typeof L.Browser.retina).toBe('boolean');
    expect(map.options.preferCanvas).toBe(true);
  });
});
