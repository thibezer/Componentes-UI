import { describe, it, expect, afterEach, vi } from 'vitest';
import L from 'leaflet';
import '../src/index';
import '../src/components/ui-canvas-cad';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { buscarSnap } from '../src/gerencigeo-canvas/feature_snap';
import { amostrarCurva } from '../src/gerencigeo-canvas/feature_curvas';
import { normalizarFeicaoEntrada } from '../src/gerencigeo-canvas/feature_adapters';
import type { Feicao, LatLonPar, NoCurva } from '../src/gerencigeo-canvas/feature_types';

/*
 * Regressões da revisão dos modos de edição do canvas: cada teste reproduz um defeito visto no navegador
 * (alça de Bézier, círculo sem botão de edição, duplo clique no fantasma, camada oculta/bloqueada em edição,
 * arraste da caneta preso e snap em curvas).
 */

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

function novo() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
  const lm = new CanvasLayerManager([]);
  const eventos: Array<[string, any]> = [];
  const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, emitir: (e, d) => eventos.push([e, d]) });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
  return { g, lm, map, eventos };
}

const quadrado = { id: 'q', geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59], [-23.51, -46.6]]] } };

type EditorInterno = { alcas: L.Marker[]; fantasmas: Array<{ marker: L.Marker }>; vertices(): LatLonPar[] };
const editorDe = (g: GerenciadorFeicoes) => (g as unknown as { editor: EditorInterno }).editor;
const geometria = (g: GerenciadorFeicoes, id: string) => g.obterFeicoes('c').find((f) => f.id === id)!.geometria as { curva?: NoCurva[]; aneis: LatLonPar[][] };
const cliqueDeMouse = (tipo: string) => ({ originalEvent: new MouseEvent(tipo) }) as unknown as L.LeafletEvent;

describe('alça de Bézier não inicia caixa de seleção', () => {
  async function canvas() {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 20));
    const mapContainer = el.shadowRoot!.getElementById('cad-map-container')!;
    const pane = el.getController().getMap()!.getPane('verticesPane')!;
    return { mapContainer, pane };
  }

  it.each(['cad-bezier-handle', 'cad-vertex-handle', 'cad-vertex-ghost'])('mousedown em .%s não liga a caixa', async (classe) => {
    const { mapContainer, pane } = await canvas();
    const alca = document.createElement('div');
    alca.className = classe;
    mapContainer.appendChild(alca);
    alca.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 50, clientY: 50, bubbles: true }));
    expect(pane.style.pointerEvents).not.toBe('none');
    expect(mapContainer.querySelector('.cad-selection-box')?.getAttribute('style')).toContain('display: none');
  });

  it('controle: mousedown no vazio do mapa liga a caixa', async () => {
    const { mapContainer, pane } = await canvas();
    mapContainer.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 50, clientY: 50, bubbles: true }));
    expect(pane.style.pointerEvents).toBe('none');
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0, clientX: 50, clientY: 50, bubbles: true }));
  });
});

describe('popup do círculo', () => {
  it('oferece o botão de edição e ele inicia a edição de centro e borda', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ id: 'r', geometria: { tipo: 'Circle', centro: [-23.505, -46.595], raioMetros: 80 } }]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'r' }]);
    const botao = document.querySelector('.cad-feicao-popup button[data-acao="vertices"]') as HTMLButtonElement;
    expect(botao).toBeTruthy();
    expect(botao.textContent).toBe('Editar');
    botao.click();
    expect(g.editando).toBe(true);
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(2);
  });

  it('o texto continua sem botão de edição', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ id: 't', geometria: { tipo: 'Text', coordenada: [-23.505, -46.595], texto: 'x' } }]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 't' }]);
    expect(document.querySelector('.cad-feicao-popup button[data-acao="vertices"]')).toBeNull();
  });
});

describe('duplo clique no fantasma', () => {
  it('insere o vértice sem convertê-lo em curva; um duplo clique depois do prazo converte', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000_000);
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');

    editorDe(g).fantasmas[0].marker.fire('click', cliqueDeMouse('click'));
    expect(editorDe(g).vertices()).toHaveLength(5);
    // o 2º clique do duplo clique cai na alça nova, que já nasceu no meio do segmento
    editorDe(g).alcas[1].fire('dblclick', cliqueDeMouse('dblclick'));
    expect(geometria(g, 'q').curva).toBeUndefined();
    expect(geometria(g, 'q').aneis[0]).toHaveLength(5);

    vi.setSystemTime(1_000_000 + 2000);
    editorDe(g).alcas[1].fire('dblclick', cliqueDeMouse('dblclick'));
    expect(geometria(g, 'q').curva).toHaveLength(5);
  });

  it('duplo clique numa alça que não acabou de nascer continua alternando canto e curva', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    editorDe(g).alcas[0].fire('dblclick', cliqueDeMouse('dblclick'));
    expect(geometria(g, 'q').curva).toHaveLength(4);
  });
});

describe('camada ou feição fechada para edição no meio do gesto', () => {
  it('ocultar a camada encerra a edição e tira alças e HUD', () => {
    const { g, lm, eventos } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    expect(g.editando).toBe(true);
    lm.setLayerVisibility('c', false);
    expect(g.editando).toBe(false);
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(0);
    expect(document.querySelector('#cm-vertex-edit-hud')).toBeNull();
    expect(eventos.map(([e]) => e)).toContain('cad-edicao-concluida');
  });

  it('bloquear a camada encerra a edição', () => {
    const { g, lm } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    lm.setLayerBlocked('c', true);
    expect(g.editando).toBe(false);
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(0);
  });

  it('bloquear a feição pela API encerra a edição', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    g.atualizarFeicao('c', 'q', { bloqueada: true });
    expect(g.editando).toBe(false);
  });

  it('mudanças em outra camada não interrompem a edição, e a vigilância some ao encerrar', () => {
    const { g, lm } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.definirFeicoes('outra', [{ id: 'o', geometria: { tipo: 'Point', coordenada: [-23.52, -46.58] } }]);
    g.iniciarEdicao('c', 'q');
    lm.setLayerVisibility('outra', false);
    lm.setLayerBlocked('outra', true);
    expect(g.editando).toBe(true);
    g.pararEdicao();
    // depois de encerrar, ocultar a camada não reabre nem quebra nada
    expect(() => lm.setLayerVisibility('c', false)).not.toThrow();
    expect(g.editando).toBe(false);
  });
});

describe('caneta: arraste da alça termina ao soltar fora do mapa', () => {
  it('mouseup na window encerra o arraste; mover depois não mexe mais na alça', () => {
    const { g, map } = novo();
    g.definirCamadaDesenho('d');
    expect(g.ativarFerramenta('caneta').ok).toBe(true);
    const sessao = () => (g as unknown as { desenho: { sessao: { ancoras: Array<{ alca?: LatLonPar }> } } }).desenho.sessao;
    const em = (lat: number, lng: number, extra: object = {}) => {
      const latlng = L.latLng(lat, lng);
      return { latlng, containerPoint: map.latLngToContainerPoint(latlng), originalEvent: { button: 0 }, ...extra } as never;
    };

    map.fire('mousedown', em(-23.505, -46.595));
    map.fire('mousemove', em(-23.504, -46.594));
    const durante = sessao().ancoras[0].alca;
    expect(durante).toEqual([-23.504, -46.594]); // enquanto o botão está apertado a alça segue o cursor

    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 })); // soltou fora do mapa
    map.fire('mousemove', em(-23.5, -46.58));
    expect(sessao().ancoras[0].alca).toEqual(durante);
  });

  it('ao desativar a ferramenta o ouvinte da window sai', () => {
    const { g } = novo();
    g.definirCamadaDesenho('d');
    const adicionar = vi.spyOn(window, 'addEventListener');
    const remover = vi.spyOn(window, 'removeEventListener');
    g.ativarFerramenta('caneta');
    g.desativarFerramenta();
    const registrados = adicionar.mock.calls.filter(([t]) => t === 'mouseup').map(([, f]) => f);
    expect(registrados.length).toBeGreaterThan(0);
    // todo ouvinte de mouseup posto na window ao ligar a ferramenta é retirado ao desligá-la
    for (const f of registrados) expect(remover.mock.calls.some(([t, h]) => t === 'mouseup' && h === f)).toBe(true);
    adicionar.mockRestore();
    remover.mockRestore();
  });
});

describe('snap em feição com curva', () => {
  // projeção identidade: lat -> y, lon -> x (px); coordenadas longe de (0, 0), que a normalização recusa
  const proj = (p: LatLonPar) => ({ x: p[1], y: p[0] });
  const nos: NoCurva[] = [
    { ponto: [10, 10], saida: [10, 30] },
    { ponto: [10, 60], entrada: [10, 40] }
  ];
  const apoio = amostrarCurva(nos, false);
  const F = (curva: NoCurva[] | undefined): Feicao =>
    normalizarFeicaoEntrada({ id: 'k', geometria: { tipo: 'LineString', coordenadas: apoio, curva } }, 'c')!;

  it('o nó atrai como vértice', () => {
    expect(buscarSnap({ x: 12, y: 11 }, [F(nos)], proj)).toMatchObject({ tipo: 'vertice', coordenada: [10, 10] });
    expect(buscarSnap({ x: 58, y: 11 }, [F(nos)], proj)).toMatchObject({ tipo: 'vertice', coordenada: [10, 60] });
  });

  it('vértice de apoio amostrado não atrai como vértice (cai na aresta)', () => {
    const intermediario = apoio[5];
    expect(Math.abs(intermediario[1] - 10)).toBeGreaterThan(10); // fora do alcance do nó
    const r = buscarSnap({ x: intermediario[1], y: 11 }, [F(nos)], proj)!;
    expect(r.tipo).toBe('aresta');
    expect(r.coordenada[1]).toBeCloseTo(intermediario[1], 5);
  });

  it('o meio é o do trecho curvo, não o de um par de pontos de apoio', () => {
    const r = buscarSnap({ x: 35, y: 11 }, [F(nos)], proj)!;
    expect(r.tipo).toBe('meio');
    expect(r.coordenada[1]).toBeCloseTo(35, 5);
  });

  it('a própria curva em edição continua sem atrair, e poligonal comum segue igual', () => {
    expect(buscarSnap({ x: 12, y: 11 }, [F(nos)], proj, {}, { feicaoId: 'k', vertice: 0 })).toBeNull();
    const ponto = apoio[5];
    expect(buscarSnap({ x: ponto[1], y: 11 }, [F(undefined)], proj)).toMatchObject({ tipo: 'vertice', coordenada: ponto });
  });

  it('polígono com curva também atrai pelos nós e fecha a aresta no primeiro', () => {
    const quad: NoCurva[] = [
      { ponto: [10, 10], saida: [10, 20] }, { ponto: [10, 60] }, { ponto: [60, 60] }, { ponto: [60, 10] }
    ];
    const poligono = normalizarFeicaoEntrada({ id: 'p', geometria: { tipo: 'Polygon', aneis: [amostrarCurva(quad, true)], curva: quad } }, 'c')!;
    expect(buscarSnap({ x: 59, y: 59 }, [poligono], proj)).toMatchObject({ tipo: 'vertice', coordenada: [60, 60] });
    // aresta que fecha (último nó → primeiro): x = 10, entre y = 60 e y = 10; longe do meio (35) e dos nós
    const r = buscarSnap({ x: 13, y: 47 }, [poligono], proj)!;
    expect(r.tipo).toBe('aresta');
    expect(r.coordenada[0]).toBeCloseTo(47, 5);
  });
});
