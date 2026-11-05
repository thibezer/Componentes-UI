import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';

afterEach(() => { document.body.innerHTML = ''; });

function mapa() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  return L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom: 16 });
}
const def = (id: string, tipo: string, opacidade: number) => ({
  id, nome: id, categoria: 'custom', tipo, visivel: true, opacidade, zIndex: 500, interativo: true, bloqueada: false,
  estilo: { scaleMode: 'screen' as const }
});
const ctx = { config: {}, graphicScale: {} } as never;

describe('LayerManager: opacidade é do pane', () => {
  it('aplica a opacidade inicial ao pane no attachMap', () => {
    const map = mapa();
    const lm = new CanvasLayerManager([def('a', 'vetorial-poligonos', 0.5), def('b', 'feicoes', 0.25)] as never);
    lm.attachMap(map, ctx);
    expect(map.getPane('pane-a')!.style.opacity).toBe('0.5');
    expect(map.getPane('pane-b')!.style.opacity).toBe('0.25');
  });

  it('não aplica a opacidade de novo nos objetos (sem opacidade dupla)', () => {
    const map = mapa();
    const lm = new CanvasLayerManager([{
      ...def('v', 'vetorial-poligonos', 0.5),
      dados: { poligonos: [{ coordenadas: [[-23.5, -46.6], [-23.5, -46.59], [-23.49, -46.59]] }] }
    }] as never);
    lm.attachMap(map, ctx);
    const grupo = lm.getLayerInstance('v') as L.LayerGroup;
    const opacidades: number[] = [];
    grupo.eachLayer((l) => { const o = (l as L.Path).options?.opacity; if (o !== undefined) opacidades.push(o); });
    expect(opacidades.length).toBeGreaterThan(0);
    expect(opacidades.every((o) => o === 1)).toBe(true);
  });

  it('importState reaplica a opacidade no pane e rejeita valores hostis', () => {
    const map = mapa();
    const lm = new CanvasLayerManager([def('a', 'vetorial-poligonos', 0.5), def('b', 'feicoes', 0.5)] as never);
    lm.attachMap(map, ctx);
    lm.importState([
      { id: 'a', opacidade: 0.3 } as never,
      { id: 'b', opacidade: Number.NaN, zIndex: Number.NaN } as never,
      null as never
    ]);
    expect(map.getPane('pane-a')!.style.opacity).toBe('0.3');
    expect(lm.getLayer('b')!.opacidade).toBe(0.5);
    expect(lm.getLayer('b')!.zIndex).toBe(500);
    expect(map.getPane('pane-b')!.style.zIndex).toBe('500');
  });

  it('importState limita opacidade fora da faixa e setLayer* ignora NaN', () => {
    const map = mapa();
    const lm = new CanvasLayerManager([def('a', 'vetorial-poligonos', 0.5)] as never);
    lm.attachMap(map, ctx);
    lm.importState([{ id: 'a', opacidade: 7 } as never]);
    expect(lm.getLayer('a')!.opacidade).toBe(1);
    lm.setLayerOpacity('a', Number.NaN);
    expect(lm.getLayer('a')!.opacidade).toBe(1);
    lm.setLayerZIndex('a', Number.NaN);
    expect(lm.getLayer('a')!.zIndex).toBe(500);
  });
});

describe('LayerManager.destroy e MapaCore/CanvasInteracao: ciclo de vida', () => {
  it('updateContext depois de destroy não re-renderiza num mapa removido', async () => {
    const map = mapa();
    const lm = new CanvasLayerManager([def('a', 'vetorial-poligonos', 1)] as never);
    lm.attachMap(map, ctx);
    lm.destroy();
    lm.updateContext({ pontos: [] } as never);
    await Promise.resolve();
    expect(lm.getLayerInstance('a')).toBeUndefined();
  });

  it('MapaCore.init repetido fecha o BroadcastChannel anterior', async () => {
    const { MapaCore } = await import('../src/gerencigeo-canvas/mapa_core');
    const fechados: number[] = [];
    const Original = globalThis.BroadcastChannel;
    let n = 0;
    class Falso { id = ++n; onmessage: unknown = null; close() { fechados.push(this.id); } postMessage() {} }
    (globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = Falso;
    try {
      const core = new MapaCore({});
      const el = document.createElement('div');
      Object.defineProperty(el, 'clientWidth', { value: 800 });
      Object.defineProperty(el, 'clientHeight', { value: 600 });
      document.body.appendChild(el);
      core.init(el);
      core.init(el);
      expect(fechados).toEqual([1]);
      core.destroy();
      expect(fechados).toEqual([1, 2]);
    } finally {
      (globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = Original;
    }
  });

  it('CanvasInteracao.ativar duas vezes destrói a caixa de seleção anterior', async () => {
    const { CanvasInteracao } = await import('../src/gerencigeo-canvas/canvas_interacao');
    const map = mapa();
    const ci = new CanvasInteracao();
    const ctl = { getMap: () => map, context: {} };
    ci.ativar(ctl);
    const primeira = (ci as unknown as { selecaoBox: unknown }).selecaoBox;
    ci.ativar(ctl);
    const segunda = (ci as unknown as { selecaoBox: unknown }).selecaoBox;
    expect(segunda).not.toBe(primeira);
    expect(map.dragging.enabled()).toBe(false);
    ci.desativar();
    expect(map.dragging.enabled()).toBe(true);
  });
});
