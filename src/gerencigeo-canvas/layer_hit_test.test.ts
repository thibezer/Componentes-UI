import { describe, it, expect, vi } from 'vitest';
import { resolverCliqueCentral } from './layer_hit_test';

function camada(id: string, zIndex: number, extra = {}) {
  return { id, zIndex, visivel: true, interativo: true, bloqueada: false, ...extra } as any;
}

function rendererCom(layer: any) {
  return { _drawFirst: { layer, next: undefined } };
}

function feicao(acerta: boolean) {
  return { options: { interactive: true }, _containsPoint: () => acerta, fire: vi.fn() } as any;
}

function mapaCom(renderers: Record<string, any>) {
  return {
    _paneRenderers: renderers,
    mouseEventToLayerPoint: () => ({ x: 1, y: 1 }),
    mouseEventToLatLng: () => ({ lat: 0, lng: 0 }),
    mouseEventToContainerPoint: () => ({ x: 1, y: 1 })
  } as any;
}

describe('resolverCliqueCentral', () => {
  it('seleciona a camada de baixo quando a de cima não acerta o ponto', () => {
    const cima = feicao(false);
    const baixo = feicao(true);
    const map = mapaCom({ 'pane-a-poligono': rendererCom(cima), 'pane-b-poligono': rendererCom(baixo) });
    const ok = resolverCliqueCentral(map, [camada('b', 1), camada('a', 5)], new MouseEvent('click'));
    expect(ok).toBe(true);
    expect(baixo.fire).toHaveBeenCalledOnce();
    expect(cima.fire).not.toHaveBeenCalled();
  });

  it('a camada de maior zIndex vence quando ambas acertam', () => {
    const cima = feicao(true);
    const baixo = feicao(true);
    const map = mapaCom({ 'pane-a-poligono': rendererCom(cima), 'pane-b-poligono': rendererCom(baixo) });
    resolverCliqueCentral(map, [camada('b', 1), camada('a', 5)], new MouseEvent('click'));
    expect(cima.fire).toHaveBeenCalledOnce();
    expect(baixo.fire).not.toHaveBeenCalled();
  });

  it('ignora camadas ocultas, não interativas ou bloqueadas', () => {
    const f = feicao(true);
    const map = mapaCom({ 'pane-a-poligono': rendererCom(f) });
    for (const extra of [{ visivel: false }, { interativo: false }, { bloqueada: true }]) {
      expect(resolverCliqueCentral(map, [camada('a', 1, extra)], new MouseEvent('click'))).toBe(false);
    }
    expect(f.fire).not.toHaveBeenCalled();
  });

  it('dentro da mesma camada, linha vence polígono', () => {
    const poligono = feicao(true);
    const linha = feicao(true);
    const map = mapaCom({ 'pane-a-poligono': rendererCom(poligono), 'pane-a-linha': rendererCom(linha) });
    resolverCliqueCentral(map, [camada('a', 1)], new MouseEvent('click'));
    expect(linha.fire).toHaveBeenCalledOnce();
    expect(poligono.fire).not.toHaveBeenCalled();
  });
});
