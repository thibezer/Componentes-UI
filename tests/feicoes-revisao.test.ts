import { describe, it, expect, afterEach, vi } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { ControleSnap } from '../src/components/ui-canvas-cad/cad-snap';
import { focoEmCampoDeTexto } from '../src/core/alvo-digitavel';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import type { LatLonPar } from '../src/gerencigeo-canvas/feature_types';

afterEach(() => { document.body.innerHTML = ''; });

function mapaNovo(): L.Map {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  return L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
}

function novo() {
  let map = mapaNovo();
  const lm = new CanvasLayerManager([]);
  const eventos: Array<[string, any]> = [];
  const g = new GerenciadorFeicoes({
    obterLayerManager: () => lm, obterMapa: () => map,
    emitir: (e, d) => eventos.push([e, d])
  });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
  const ev = (nome: string) => eventos.filter(([e]) => e === nome).map(([, d]) => d);
  return { g, lm, ev, trocarMapa: () => { map = mapaNovo(); return map; }, mapa: () => map };
}

const quad = (id: string): Record<string, unknown> => ({
  id, geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59], [-23.51, -46.6]]] }
});
const linha = (id: string, a: LatLonPar, b: LatLonPar): Record<string, unknown> => ({
  id, geometria: { tipo: 'LineString', coordenadas: [a, b] }
});

describe('foco em campo de texto atravessa o shadow DOM', () => {
  function inputEmShadow(): HTMLInputElement {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const input = document.createElement('input');
    host.attachShadow({ mode: 'open' }).appendChild(input);
    input.focus();
    return input;
  }

  it('reconhece o input dentro do shadow pelo evento e pelo foco', () => {
    const input = inputEmShadow();
    const e = new KeyboardEvent('keydown', { key: 's', bubbles: true, composed: true });
    input.dispatchEvent(e);
    expect(focoEmCampoDeTexto(e)).toBe(true);
    expect(focoEmCampoDeTexto()).toBe(true);
  });

  it('a tecla S digitada num input em shadow não alterna o snap', () => {
    const input = inputEmShadow();
    const snap = new ControleSnap({ aoMudar: () => undefined });
    snap.conectar();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true, composed: true }));
    expect(snap.ligado).toBe(true);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
    expect(snap.ligado).toBe(false);
    snap.desconectar();
  });

  it('Backspace e Esc num input alheio não mexem na ferramenta de desenho', () => {
    const { g } = novo();
    g.ativarFerramenta('medir-distancia');
    const input = inputEmShadow();
    const bs = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, composed: true, cancelable: true });
    input.dispatchEvent(bs);
    expect(bs.defaultPrevented).toBe(false);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    expect(g.ferramentaAtiva).toBe('medir-distancia');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(g.ferramentaAtiva).toBeNull();
  });
});

describe('reconexão do componente', () => {
  it('depois de destruir, a ferramenta nasce ligada ao mapa novo', () => {
    const { g, trocarMapa } = novo();
    g.ativarFerramenta('medir-distancia');
    g.destruir();
    expect(g.ferramentaAtiva).toBeNull();
    const novoMapa = trocarMapa();
    g.ativarFerramenta('medir-distancia');
    const dep = (g as unknown as { desenho: { dep: { map: L.Map } } }).desenho.dep;
    expect(dep.map).toBe(novoMapa);
  });
});

describe('dividir e juntar não perdem dados', () => {
  it('dividir: parte recusada desfaz tudo e mantém o original', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [quad('q')]);
    const original = g.adicionarFeicao.bind(g);
    vi.spyOn(g, 'adicionarFeicao').mockImplementation((camada, bruta, op) =>
      (bruta as { id: string }).id.startsWith('q-') && (bruta as { id: string }).id.endsWith('2') ? null : original(camada, bruta, op));
    expect(g.dividirComLinha([[-23.49, -46.595], [-23.52, -46.595]])).toBe(false);
    expect(g.obterFeicoes('c').map((f) => f.id)).toEqual(['q']);
    expect(ev('cad-divisao-falhou')).toEqual([{ motivo: 'geometria-invalida' }]);
  });

  it('juntar: resultado recusado devolve as originais', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [linha('a', [-23.5, -46.6], [-23.5, -46.59]), linha('b', [-23.5, -46.58], [-23.5, -46.59])]);
    const original = g.adicionarFeicao.bind(g);
    vi.spyOn(g, 'adicionarFeicao').mockImplementation((camada, bruta, op) =>
      (bruta as { id: string }).id.endsWith('-uniao') ? null : original(camada, bruta, op));
    expect(g.juntarFeicoes('c', ['a', 'b'])).toBeNull();
    expect(g.obterFeicoes('c').map((f) => f.id).sort()).toEqual(['a', 'b']);
    expect(ev('cad-uniao-falhou')).toEqual([{ motivo: 'geometria-invalida' }]);
  });

  it('juntar respeita feição e camada bloqueadas e ids repetidos', () => {
    const { g, lm, ev } = novo();
    g.definirFeicoes('c', [
      { ...linha('a', [-23.5, -46.6], [-23.5, -46.59]), bloqueada: true },
      linha('b', [-23.5, -46.58], [-23.5, -46.59])
    ]);
    expect(g.juntarFeicoes('c', ['a', 'b'])).toBeNull();
    expect(ev('cad-uniao-falhou')[0]).toEqual({ motivo: 'bloqueada' });
    expect(g.juntarFeicoes('c', ['b', 'b'])).toBeNull();
    expect(ev('cad-uniao-falhou')[1]).toEqual({ motivo: 'feicoes-insuficientes' });

    g.atualizarFeicao('c', 'a', { bloqueada: false });
    lm.getLayerDef('c')!.bloqueada = true;
    expect(g.juntarFeicoes('c', ['a', 'b'])).toBeNull();
    expect(g.obterFeicoes('c')).toHaveLength(2);
  });
});

describe('renderizador: entradas vindas do consumidor', () => {
  it('tamanhoIcone não numérico não injeta HTML no ícone', () => {
    const { g, mapa } = novo();
    g.definirFeicoes('c', [{
      id: 'p',
      geometria: { tipo: 'Point', coordenada: [-23.505, -46.595] },
      estilo: { icone: 'tower', tamanhoIcone: '22" onload="window.__xss=1"><img src=x onerror="window.__xss=2">' }
    }]);
    const html = mapa().getContainer().innerHTML;
    expect(html).toContain('leaflet-marker-icon');
    expect(mapa().getContainer().querySelector('img')).toBeNull();
    expect(html).not.toContain('onerror');
  });

  it('texto criado bloqueado persiste o arraste depois de desbloqueado', () => {
    const { g, lm, mapa } = novo();
    lm.updateContext({ onLayerAction: (a: string, d: any) => { g.tratarAcaoCamada(a, d); } } as never);
    g.definirFeicoes('c', [{ id: 't', bloqueada: true, geometria: { tipo: 'Text', coordenada: [-23.505, -46.595], texto: 'oi' } }]);
    g.atualizarFeicao('c', 't', { bloqueada: false });
    const marcador = Object.values((mapa() as any)._layers).find((l: any) => l instanceof L.Marker && l.options.icon?.options?.className?.includes('cad-feicao-texto')) as L.Marker | undefined;
    expect(marcador).toBeDefined();
    expect(marcador!.dragging?.enabled()).toBe(true);
    marcador!.setLatLng([-23.506, -46.596]);
    marcador!.fire('dragend');
    expect(g.obterFeicoes('c')[0].geometria).toMatchObject({ coordenada: [-23.506, -46.596] });
  });
});
