/**
 * Regressão: popups e câmera só reagem a pedido explícito do usuário (como CAD/GIS).
 * Antes: clicar abria popup e o Leaflet movia o mapa (auto-pan); a roda pulava um nível inteiro por giro;
 * a pinça era tratada duas vezes; dois arrastes rápidos do botão do meio disparavam "zoom extents".
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import L from 'leaflet';
import {
  PortaoPopups, lerModoPopups, liberarPopups, MODO_POPUPS_PADRAO
} from '../src/gerencigeo-canvas/popup_gate';
import { OPCOES_ZOOM_FINO } from '../src/gerencigeo-canvas/zoom_opcoes';
import { MapaCore } from '../src/gerencigeo-canvas/mapa_core';
import { CanvasInteracao } from '../src/gerencigeo-canvas/canvas_interacao';
import { GerenciGeoMapaController } from '../src/gerencigeo-canvas/mapa_controller';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { PonteiroFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes-ponteiro';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import type { Feicao } from '../src/gerencigeo-canvas/feature_types';

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function criarMapa(): L.Map {
  const el = document.createElement('div');
  el.style.cssText = 'width:400px;height:300px';
  document.body.appendChild(el);
  return L.map(el, { center: [-23.5, -46.6], zoom: 15 });
}

function marcadorComPopup(map: L.Map): L.Marker {
  return L.marker([-23.5, -46.6]).addTo(map).bindPopup('olá');
}

/** Um clique real: o DOM chega ao contêiner do mapa e, no mesmo despacho, o Leaflet entrega o evento à camada. */
function clicarNoMapa(map: L.Map, m: L.Marker): void {
  map.getContainer().dispatchEvent(new MouseEvent('click', { bubbles: true }));
  m.fire('click', { latlng: m.getLatLng() });
}
const clicar = (m: L.Marker) => clicarNoMapa((m as unknown as { _map: L.Map })._map, m);
const duploClicar = (m: L.Marker) => m.fire('dblclick', { latlng: m.getLatLng() });

describe('lerModoPopups', () => {
  it('aceita os três modos e cai no padrão (sob demanda) com qualquer outra coisa', () => {
    expect(MODO_POPUPS_PADRAO).toBe('sob-demanda');
    expect(lerModoPopups('automatico')).toBe('automatico');
    expect(lerModoPopups(' DESLIGADO ')).toBe('desligado');
    expect(lerModoPopups('sob-demanda')).toBe('sob-demanda');
    for (const ruim of [null, undefined, '', 'sim', '1', 'true']) expect(lerModoPopups(ruim)).toBe('sob-demanda');
  });
});

describe('PortaoPopups', () => {
  beforeEach(() => vi.useFakeTimers());

  it('sob demanda: o clique NÃO abre o popup (falhava antes: abria e movia o mapa)', () => {
    const map = criarMapa();
    new PortaoPopups(map, 'sob-demanda');
    const m = marcadorComPopup(map);
    clicar(m);
    expect(m.isPopupOpen()).toBe(false);
    expect(document.querySelector('.leaflet-popup')).toBeNull();
  });

  it('sob demanda: o duplo clique abre, sem auto-pan', () => {
    const map = criarMapa();
    new PortaoPopups(map, 'sob-demanda');
    const m = marcadorComPopup(map);
    clicar(m);
    clicar(m);
    duploClicar(m);
    expect(m.isPopupOpen()).toBe(true);
    expect(m.getPopup()!.options.autoPan).toBe(false);
  });

  it('sob demanda: duplo clique sem clique anterior, ou depois da janela, não abre', () => {
    const map = criarMapa();
    new PortaoPopups(map, 'sob-demanda');
    const m = marcadorComPopup(map);
    duploClicar(m);
    expect(m.isPopupOpen()).toBe(false);

    clicar(m);
    vi.advanceTimersByTime(2000);
    duploClicar(m);
    expect(m.isPopupOpen()).toBe(false);
  });

  it('sob demanda: cliques repetidos não acumulam ouvintes de duplo clique', () => {
    const map = criarMapa();
    new PortaoPopups(map, 'sob-demanda');
    const m = marcadorComPopup(map);
    const antes = (m as unknown as { _events: Record<string, unknown[]> })._events.dblclick?.length ?? 0;
    for (let i = 0; i < 20; i++) clicar(m);
    const depois = (m as unknown as { _events: Record<string, unknown[]> })._events.dblclick?.length ?? 0;
    expect(depois - antes).toBeLessThanOrEqual(1);
    vi.advanceTimersByTime(2000);
    expect((m as unknown as { _events: Record<string, unknown[]> })._events.dblclick?.length ?? 0).toBe(antes);
  });

  it('automático: comportamento antigo (o clique abre, auto-pan preservado)', () => {
    const map = criarMapa();
    new PortaoPopups(map, 'automatico');
    const m = marcadorComPopup(map);
    clicar(m);
    expect(m.isPopupOpen()).toBe(true);
    expect(m.getPopup()!.options.autoPan).not.toBe(false);
  });

  it('desligado: nem clique nem duplo clique abrem; só pedido explícito (liberarPopups)', () => {
    const map = criarMapa();
    new PortaoPopups(map, 'desligado');
    const m = marcadorComPopup(map);
    clicar(m); clicar(m); duploClicar(m);
    expect(m.isPopupOpen()).toBe(false);

    liberarPopups(map, () => m.openPopup());
    expect(m.isPopupOpen()).toBe(true);
    expect(m.getPopup()!.options.autoPan).toBe(false);
  });

  it('liberar é reentrante e sempre devolve o portão ao estado fechado, mesmo se a função lançar', () => {
    const map = criarMapa();
    const g = new PortaoPopups(map, 'desligado');
    expect(() => g.liberar(() => { throw new Error('x'); })).toThrow('x');
    const m = marcadorComPopup(map);
    clicar(m);
    expect(m.isPopupOpen()).toBe(false);
    g.liberar(() => g.liberar(() => m.openPopup()));
    expect(m.isPopupOpen()).toBe(true);
  });

  it('trocar o modo cancela pedidos de duplo clique pendentes', () => {
    const map = criarMapa();
    const g = new PortaoPopups(map, 'sob-demanda');
    const m = marcadorComPopup(map);
    clicar(m);
    g.definirModo('desligado');
    duploClicar(m);
    expect(m.isPopupOpen()).toBe(false);
  });

  it('popup aberto pelo código, fora de um clique, abre sem auto-pan (sob demanda e desligado)', () => {
    for (const modo of ['sob-demanda', 'desligado'] as const) {
      const map = criarMapa();
      new PortaoPopups(map, modo);
      const m = marcadorComPopup(map);
      m.openPopup();
      expect(m.isPopupOpen()).toBe(true);
      expect(m.getPopup()!.options.autoPan).toBe(false);
    }
  });

  it('o clique no mapa fecha o portão só durante o seu despacho', async () => {
    const map = criarMapa();
    new PortaoPopups(map, 'sob-demanda');
    const m = marcadorComPopup(map);
    clicar(m);
    expect(m.isPopupOpen()).toBe(false);
    await Promise.resolve();
    m.openPopup();
    expect(m.isPopupOpen()).toBe(true);
  });

  it('popup solto (sem camada de origem) aberto dentro de um clique é ignorado; argumentos hostis não lançam', () => {
    const map = criarMapa();
    new PortaoPopups(map, 'sob-demanda');
    map.getContainer().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(() => L.popup().setLatLng([-23.5, -46.6]).setContent('x').openOn(map)).not.toThrow();
    expect(document.querySelector('.leaflet-popup')).toBeNull();
    expect(() => (map as unknown as { openPopup: (p: unknown) => void }).openPopup(undefined)).not.toThrow();
    expect(() => (map as unknown as { openPopup: (p: unknown) => void }).openPopup(null)).not.toThrow();
  });

  it('destruir devolve o openPopup original do Leaflet', () => {
    const map = criarMapa();
    const g = new PortaoPopups(map, 'desligado');
    expect(Object.prototype.hasOwnProperty.call(map, 'addLayer')).toBe(true);
    g.destruir();
    expect(Object.prototype.hasOwnProperty.call(map, 'addLayer')).toBe(false);
    const m = marcadorComPopup(map);
    clicar(m);
    expect(m.isPopupOpen()).toBe(true);
  });

  it('liberarPopups sem portão (ou sem mapa) apenas executa a função', () => {
    expect(liberarPopups(null, () => 7)).toBe(7);
    expect(liberarPopups(criarMapa(), () => 8)).toBe(8);
  });
});

describe('PonteiroFeicoes: duplo clique', () => {
  const f = { id: 'a', camadaId: 'c' } as unknown as Feicao;
  const montar = (sob: Feicao | null, ativa = false) => {
    const abrirPopup = vi.fn();
    const p = new PonteiroFeicoes({
      emitir: vi.fn(),
      feicaoSob: () => (sob ? { feicao: sob, coordenada: [0, 0] } : { feicao: null, coordenada: [0, 0] }),
      interacaoAtiva: () => ativa,
      botaoDireitoDaFerramenta: () => false,
      abrirPopup
    });
    return { p, abrirPopup };
  };
  const dbl = () => new MouseEvent('dblclick', { clientX: 5, clientY: 5 });

  it('abre o popup da feição sob o cursor', () => {
    const { p, abrirPopup } = montar(f);
    p.duploClique(dbl());
    expect(abrirPopup).toHaveBeenCalledWith(f);
  });

  it('não abre sem feição sob o cursor nem durante desenho/edição', () => {
    const a = montar(null);
    a.p.duploClique(dbl());
    expect(a.abrirPopup).not.toHaveBeenCalled();
    const b = montar(f, true);
    b.p.duploClique(dbl());
    expect(b.abrirPopup).not.toHaveBeenCalled();
  });
});

describe('GerenciadorFeicoes: popup sob demanda', () => {
  const novo = (modo: 'sob-demanda' | 'automatico' | 'desligado', comPortao = true) => {
    const map = criarMapa();
    const lm = new CanvasLayerManager([]);
    const portao = comPortao ? new PortaoPopups(map, modo) : null;
    const g = new GerenciadorFeicoes({
      obterLayerManager: () => lm,
      obterMapa: () => map,
      emitir: () => undefined,
      modoPopups: () => modo,
      liberarPopups: (fn) => liberarPopups(map, fn)
    });
    lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
    g.definirFeicoes('c', [
      { id: 'a', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] }, propriedades: { name: 'Alfa' } },
      { id: 'b', geometria: { tipo: 'Point', coordenada: [-23.51, -46.6] } }
    ]);
    const clique = (id: string) =>
      g.tratarAcaoCamada('feicao-clique', { camadaId: 'c', feicao: g.obterFeicoes('c').find((x) => x.id === id)!, aditivo: false });
    return { g, map, portao, clique };
  };
  const popup = () => document.querySelector('.cad-feicao-popup');

  it('sob demanda: clicar seleciona mas NÃO abre popup (falhava antes)', () => {
    const { g, clique } = novo('sob-demanda');
    clique('a');
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['a']);
    expect(popup()).toBeNull();
  });

  it('sob demanda: abrirPopupFeicao abre mesmo com o portão fechado, sem auto-pan', () => {
    const { g, map } = novo('sob-demanda');
    const centro = map.getCenter();
    expect(g.abrirPopupFeicao('c', 'a')).toBe(true);
    expect(popup()?.textContent).toContain('Alfa');
    expect(map.getCenter().lat).toBeCloseTo(centro.lat, 10);
    expect(map.getCenter().lng).toBeCloseTo(centro.lng, 10);
  });

  it('abrirPopupFeicao recusa feição inexistente, excluída ou com argumentos hostis', () => {
    const { g } = novo('sob-demanda');
    expect(g.abrirPopupFeicao('c', 'nao-existe')).toBe(false);
    expect(g.abrirPopupFeicao('nao-existe', 'a')).toBe(false);
    expect(g.abrirPopupFeicao(undefined as never, null as never)).toBe(false);
    g.removerFeicao('c', 'a');
    expect(g.abrirPopupFeicao('c', 'a')).toBe(false);
    expect(popup()).toBeNull();
  });

  it('selecionar outra feição fecha o popup aberto sob demanda', () => {
    const { g, clique } = novo('sob-demanda');
    g.abrirPopupFeicao('c', 'a');
    expect(popup()).toBeTruthy();
    clique('b');
    expect(popup()).toBeNull();
  });

  it('desligado: o pedido explícito pela API ainda funciona', () => {
    const { g, clique } = novo('desligado');
    clique('a');
    expect(popup()).toBeNull();
    expect(g.abrirPopupFeicao('c', 'a')).toBe(true);
    expect(popup()).toBeTruthy();
  });

  it('automático: clicar abre o popup (modo antigo preservado)', () => {
    const { clique } = novo('automatico');
    clique('a');
    expect(popup()).toBeTruthy();
  });
});

describe('MapaCore: zoom fino e portão de popups', () => {
  const iniciar = () => {
    const el = document.createElement('div');
    el.style.cssText = 'width:400px;height:300px';
    document.body.appendChild(el);
    const core = new MapaCore({});
    const map = core.init(el)!;
    return { core, map };
  };

  it('a roda e o teclado dão passos finos, não um nível inteiro por giro (falhava antes: zoomSnap 1)', () => {
    const { map, core } = iniciar();
    expect(map.options.zoomSnap).toBe(OPCOES_ZOOM_FINO.zoomSnap);
    expect(map.options.zoomDelta).toBe(OPCOES_ZOOM_FINO.zoomDelta);
    expect(map.options.wheelPxPerZoomLevel).toBe(OPCOES_ZOOM_FINO.wheelPxPerZoomLevel);
    expect(map.options.zoomSnap!).toBeLessThan(1);
    expect(map.options.zoomDelta!).toBeLessThan(1);
    core.destroy();
  });

  it('popups nascem sob demanda e o modo definido antes do mapa existir é aplicado depois', () => {
    vi.useFakeTimers();
    const a = iniciar();
    const m = L.marker([-23.5, -46.6]).addTo(a.map).bindPopup('x');
    clicarNoMapa(a.map, m);
    expect(m.isPopupOpen()).toBe(false);
    a.core.destroy();

    const el = document.createElement('div');
    el.style.cssText = 'width:400px;height:300px';
    document.body.appendChild(el);
    const core = new MapaCore({});
    core.definirModoPopups('automatico');
    const map = core.init(el)!;
    const m2 = L.marker([-23.5, -46.6]).addTo(map).bindPopup('x');
    clicarNoMapa(map, m2);
    expect(m2.isPopupOpen()).toBe(true);
    core.destroy();
  });

  it('definirModoPopups depois do mapa criado vale na hora', () => {
    vi.useFakeTimers();
    const { core, map } = iniciar();
    const m = L.marker([-23.5, -46.6]).addTo(map).bindPopup('x');
    core.definirModoPopups('automatico');
    clicarNoMapa(map, m);
    expect(m.isPopupOpen()).toBe(true);
    core.destroy();
  });
});

describe('GerenciGeoMapaController.selectPonto: só move a câmera se pedido', () => {
  const montar = () => {
    const el = document.createElement('div');
    el.style.cssText = 'width:400px;height:300px';
    document.body.appendChild(el);
    const c = new GerenciGeoMapaController();
    const map = c.core.init(el)!;
    map.setView([-23.5, -46.6], 14, { animate: false });
    const marker = L.marker([-23.55, -46.65]).addTo(map).bindPopup('v');
    (marker as unknown as { pontoId: number }).pontoId = 7;
    vi.spyOn(c, 'getMarkers').mockReturnValue([marker]);
    const setView = vi.spyOn(map, 'setView');
    return { c, map, marker, setView };
  };

  it('sem zoomLevel não recentraliza nem abre popup (falhava antes: setView sempre)', () => {
    vi.useFakeTimers();
    const { c, marker, setView } = montar();
    c.selectPonto(7);
    expect(setView).not.toHaveBeenCalled();
    expect(marker.isPopupOpen()).toBe(false);
    expect(c.canvasInteracao.ctx.selectedPontoIds).toEqual([7]);
  });

  it('com zoomLevel é um pedido de "ir até": centraliza no zoom pedido e abre o popup', () => {
    vi.useFakeTimers();
    const { c, marker, setView } = montar();
    c.selectPonto(7, 18);
    expect(setView).toHaveBeenCalledTimes(1);
    expect(setView.mock.calls[0][1]).toBe(18);
    expect(marker.isPopupOpen()).toBe(true);
  });
});

describe('CanvasInteracao: botão do meio e pinça', () => {
  const montar = () => {
    const el = document.createElement('div');
    el.style.cssText = 'width:400px;height:300px';
    document.body.appendChild(el);
    const map = L.map(el, { center: [-23.5, -46.6], zoom: 15 });
    const fitBounds = vi.fn();
    const ci = new CanvasInteracao({});
    ci.ctx.pontosList = [{ id: 1, lat: -23.5, lon: -46.6, tipo_ponto: 'P', tipo: 'P' } as never];
    ci.ativar({ getMap: () => map, fitBounds, modoCliqueSequencialAtivo: false, context: {} }, undefined);
    return { ci, map, el, fitBounds };
  };
  const meio = (tipo: string, x = 10) => new MouseEvent(tipo, { button: 1, clientX: x, clientY: 10, bubbles: true, cancelable: true });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(1_000_000);
  });

  it('dois cliques limpos em menos de 300 ms enquadram', () => {
    const { el, fitBounds } = montar();
    el.dispatchEvent(meio('mousedown'));
    window.dispatchEvent(meio('mouseup'));
    vi.setSystemTime(1_000_150);
    el.dispatchEvent(meio('mousedown'));
    expect(fitBounds).toHaveBeenCalledTimes(1);
  });

  it('dois arrastes seguidos (pan) NÃO enquadram (falhava antes)', () => {
    const { el, fitBounds } = montar();
    el.dispatchEvent(meio('mousedown'));
    el.dispatchEvent(meio('mousemove', 60));
    window.dispatchEvent(meio('mouseup', 60));
    vi.setSystemTime(1_000_100);
    el.dispatchEvent(meio('mousedown', 60));
    el.dispatchEvent(meio('mousemove', 20));
    window.dispatchEvent(meio('mouseup', 20));
    vi.setSystemTime(1_000_200);
    el.dispatchEvent(meio('mousedown', 20));
    expect(fitBounds).not.toHaveBeenCalled();
  });

  it('segundo clique depois de 300 ms não enquadra', () => {
    const { el, fitBounds } = montar();
    el.dispatchEvent(meio('mousedown'));
    window.dispatchEvent(meio('mouseup'));
    vi.setSystemTime(1_000_500);
    el.dispatchEvent(meio('mousedown'));
    expect(fitBounds).not.toHaveBeenCalled();
  });

  it('terceiro clique rápido depois de um enquadramento começa de novo (não enquadra em sequência)', () => {
    const { el, fitBounds } = montar();
    el.dispatchEvent(meio('mousedown'));
    window.dispatchEvent(meio('mouseup'));
    vi.setSystemTime(1_000_100);
    el.dispatchEvent(meio('mousedown'));
    window.dispatchEvent(meio('mouseup'));
    vi.setSystemTime(1_000_200);
    el.dispatchEvent(meio('mousedown'));
    expect(fitBounds).toHaveBeenCalledTimes(1);
  });

  const toque = (tipo: string, pontos: Array<[number, number]>) => {
    const e = new Event(tipo, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'touches', { value: pontos.map(([clientX, clientY]) => ({ clientX, clientY })) });
    return e;
  };

  it('pinça é do Leaflet: o tratador próprio não dá zoom nem cancela o gesto (falhava antes: zoom duplo)', () => {
    const { map, el } = montar();
    // sem o touchZoom do Leaflet (que também cancela o gesto), só sobra o tratador do canvas
    map.touchZoom.disable();
    const zoomIn = vi.spyOn(map, 'zoomIn');
    const zoomOut = vi.spyOn(map, 'zoomOut');
    el.dispatchEvent(toque('touchstart', [[0, 0], [100, 0]]));
    const mover = toque('touchmove', [[0, 0], [200, 0]]);
    el.dispatchEvent(mover);
    expect(zoomIn).not.toHaveBeenCalled();
    expect(zoomOut).not.toHaveBeenCalled();
    expect(mover.defaultPrevented).toBe(false);
  });

  it('arrastar com um dedo continua movendo o mapa', () => {
    const { map, el } = montar();
    const panBy = vi.spyOn(map, 'panBy');
    el.dispatchEvent(toque('touchstart', [[50, 50]]));
    const mover = toque('touchmove', [[20, 50]]);
    el.dispatchEvent(mover);
    expect(panBy).toHaveBeenCalled();
    expect(mover.defaultPrevented).toBe(true);
  });
});
