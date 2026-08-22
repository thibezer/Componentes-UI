import { describe, it, expect, vi } from 'vitest';
import '../src/index';
import { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { CanvasLayerManager, DEFAULT_LAYERS } from '../src/gerencigeo-canvas/layer_manager';
import { LayerRendererFactory } from '../src/gerencigeo-canvas/layer_renderer_factory';

describe('Canvas CAD Engine & <ui-canvas-cad>', () => {
  it('deve ter todos os renderizadores padrão registrados na Factory', () => {
    const types = LayerRendererFactory.getRegisteredTypes();
    expect(types).toContain('tile');
    expect(types).toContain('wms');
    expect(types).toContain('vetorial-linhas');
    expect(types).toContain('vetorial-pontos');
    expect(types).toContain('vetorial-poligonos');
    expect(types).toContain('grid');
  });

  it('deve instanciar o CanvasLayerManager com camadas padrão', () => {
    const manager = new CanvasLayerManager();
    const layers = manager.getLayers();
    expect(layers.length).toBe(DEFAULT_LAYERS.length);
    expect(layers.some(l => l.id === 'satelite')).toBe(true);
    expect(layers.some(l => l.id === 'perimetro')).toBe(true);
    expect(layers.some(l => l.id === 'vertices')).toBe(true);
    expect(layers.some(l => l.id === 'sigef')).toBe(true);
  });

  it('deve alterar visibilidade e opacidade de camadas corretamente', () => {
    const manager = new CanvasLayerManager();
    manager.setLayerVisibility('satelite', false);
    let satLayer = manager.getLayers().find(l => l.id === 'satelite');
    expect(satLayer?.visivel).toBe(false);

    manager.setLayerOpacity('perimetro', 0.5);
    let perimLayer = manager.getLayers().find(l => l.id === 'perimetro');
    expect(perimLayer?.opacidade).toBe(0.5);
  });

  it('deve suportar bloqueio de camadas para seleção CAD filtrada', () => {
    const manager = new CanvasLayerManager();
    expect(manager.isLayerActiveAndSelectable('vertices')).toBe(true);

    manager.setLayerBlocked('vertices', true);
    expect(manager.isLayerActiveAndSelectable('vertices')).toBe(false);

    manager.setLayerBlocked('vertices', false);
    expect(manager.isLayerActiveAndSelectable('vertices')).toBe(true);

    manager.setLayerVisibility('vertices', false);
    expect(manager.isLayerActiveAndSelectable('vertices')).toBe(false);
  });

  it('deve exportar e importar estado JSON de camadas perfeitamente', () => {
    const manager = new CanvasLayerManager();
    manager.setLayerVisibility('sigef', false);
    manager.setLayerOpacity('satelite', 0.4);
    manager.setLayerBlocked('homologados', true);

    const exported = manager.exportState();
    expect(Array.isArray(exported)).toBe(true);
    expect(exported.find(s => s.id === 'sigef')?.visivel).toBe(false);
    expect(exported.find(s => s.id === 'satelite')?.opacidade).toBe(0.4);
    expect(exported.find(s => s.id === 'homologados')?.bloqueada).toBe(true);

    const newManager = new CanvasLayerManager();
    newManager.importState(exported);

    const newSigef = newManager.getLayers().find(l => l.id === 'sigef');
    const newSat = newManager.getLayers().find(l => l.id === 'satelite');
    const newHom = newManager.getLayers().find(l => l.id === 'homologados');

    expect(newSigef?.visivel).toBe(false);
    expect(newSat?.opacidade).toBe(0.4);
    expect(newHom?.bloqueada).toBe(true);
  });

  it('deve registrar e instanciar o Custom Element <ui-canvas-cad>', () => {
    expect(customElements.get('ui-canvas-cad')).toBeDefined();
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    expect(el).toBeInstanceOf(UICanvasCAD);
    expect(el.shadowRoot).toBeDefined();
  });

  it('deve aceitar pontos, segmentos e confrontantes via propriedades reativas', () => {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(el);

    const mockPontos = [
      { id: 1, nome_vertice: 'M-01', lat: -23.765, lon: -53.320, tipo_ponto: 'M' },
      { id: 2, nome_vertice: 'P-01', lat: -23.766, lon: -53.321, tipo_ponto: 'P' },
      { id: 3, nome_vertice: 'P-02', lat: -23.767, lon: -53.319, tipo_ponto: 'P' }
    ];

    const mockSegmentos = [
      { ponto_inicio_id: 1, ponto_fim_id: 2, tipo_limite_sigef: 'LA1' },
      { ponto_inicio_id: 2, ponto_fim_id: 3, tipo_limite_sigef: 'LN1' }
    ];

    el.pontos = mockPontos;
    el.segmentos = mockSegmentos;

    expect(el.pontos.length).toBe(3);
    expect(el.segmentos.length).toBe(2);

    document.body.removeChild(el);
  });

  it('deve limpar listeners anteriores com AbortController ao desconectar e reconectar', async () => {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 20));

    const spyToggle = vi.spyOn(el, 'toggleLayersPanel');
    const btnToggle = el.shadowRoot!.getElementById('btn-toggle-layers');

    // Desconecta e reconecta o elemento simulando troca de aba/re-render do pai
    document.body.removeChild(el);
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 20));

    // Clica no botão de toggle
    btnToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Deve ter sido chamado exatamente 1 vez, sem duplicação de handlers
    expect(spyToggle).toHaveBeenCalledTimes(1);

    document.body.removeChild(el);
  });
});
