import { describe, it, expect, vi } from 'vitest';
import L from 'leaflet';
import { resolverCliqueCentral, consultarFeicoesNoPonto } from './layer_hit_test';

function camada(id: string, zIndex: number) {
  return { id, zIndex, visivel: true, interativo: true, bloqueada: false } as any;
}

function rendererCom(layer: any) {
  return { _drawFirst: { layer, next: undefined } };
}

function mapaCom(renderers: Record<string, any>) {
  return {
    _paneRenderers: renderers,
    mouseEventToLayerPoint: () => new L.Point(1, 1),
    mouseEventToLatLng: () => ({ lat: 0, lng: 0 }),
    mouseEventToContainerPoint: () => new L.Point(1, 1)
  } as any;
}

function linhaReal(partes: Array<[number, number]>, weight = 2) {
  const l: any = new L.Polyline([[0.1, 0.1], [0.2, 0.2]], { interactive: true, weight });
  l._parts = [partes.map(([x, y]) => new L.Point(x, y))];
  l.fire = vi.fn();
  return l;
}

function poligonoReal(anel: Array<[number, number]>, contem: boolean) {
  const p: any = new L.Polygon([[0.1, 0.1], [0.2, 0.2], [0.1, 0.3]], { interactive: true, weight: 2 });
  p._parts = [anel.map(([x, y]) => new L.Point(x, y))];
  p._pxBounds = new L.Bounds(new L.Point(anel[0][0], anel[0][1]), new L.Point(anel[2][0], anel[2][1]));
  p._containsPoint = () => contem;
  p.fire = vi.fn();
  return p;
}

const clique = () => new MouseEvent('click');

describe('hit-test com tolerância e prioridade', () => {
  it('linha a poucos pixels do clique ainda acerta; longe, não', () => {
    const longe = linhaReal([[0, 12], [100, 12]]); // a 11 px do clique em (1,1): fora de 6 + 1
    const map1 = mapaCom({ 'pane-a-linha': rendererCom(longe) });
    expect(resolverCliqueCentral(map1, [camada('a', 1)], clique())).toBe(false);

    const perto = linhaReal([[0, 5], [100, 5]]); // 4 px: dentro
    const map2 = mapaCom({ 'pane-a-linha': rendererCom(perto) });
    expect(resolverCliqueCentral(map2, [camada('a', 1)], clique())).toBe(true);
    expect(perto.fire).toHaveBeenCalledOnce();
  });

  it('linha vence área mesmo em camada de zIndex menor', () => {
    const area = poligonoReal([[0, 0], [50, 0], [50, 50], [0, 50]], true);
    const linha = linhaReal([[0, 2], [100, 2]]);
    const map = mapaCom({ 'pane-cima-poligono': rendererCom(area), 'pane-baixo-linha': rendererCom(linha) });
    resolverCliqueCentral(map, [camada('cima', 9), camada('baixo', 1)], clique());
    expect(linha.fire).toHaveBeenCalledOnce();
    expect(area.fire).not.toHaveBeenCalled();
  });

  it('entre áreas empilhadas, a menor vence', () => {
    const grande = poligonoReal([[0, 0], [200, 0], [200, 200], [0, 200]], true);
    const pequena = poligonoReal([[0, 0], [20, 0], [20, 20], [0, 20]], true);
    const map = mapaCom({ 'pane-a-poligono': { _drawFirst: { layer: pequena, next: { layer: grande } } } });
    const cands = consultarFeicoesNoPonto(map, [camada('a', 1)], new L.Point(1, 1));
    expect(cands[0].alvo).toBe(pequena);
    expect(cands[1].alvo).toBe(grande);
  });

  it('cliques repetidos no mesmo lugar alternam entre as feições empilhadas', () => {
    const grande = poligonoReal([[0, 0], [200, 0], [200, 200], [0, 200]], true);
    const pequena = poligonoReal([[0, 0], [20, 0], [20, 20], [0, 20]], true);
    const map = mapaCom({ 'pane-a-poligono': { _drawFirst: { layer: pequena, next: { layer: grande } } } });
    const camadas = [camada('a', 1)];
    resolverCliqueCentral(map, camadas, clique());
    resolverCliqueCentral(map, camadas, clique());
    resolverCliqueCentral(map, camadas, clique());
    expect(pequena.fire).toHaveBeenCalledTimes(2);
    expect(grande.fire).toHaveBeenCalledOnce();
  });

  it('círculo preenchido acerta por dentro; sem preenchimento só perto da borda', () => {
    const preenchido: any = new L.Circle([0.1, 0.1], { radius: 50, interactive: true, fill: true });
    preenchido._point = new L.Point(1, 1);
    preenchido._radius = 30;
    preenchido._radiusY = 30;
    const map = mapaCom({ 'pane-a-poligono': rendererCom(preenchido) });
    expect(consultarFeicoesNoPonto(map, [camada('a', 1)], new L.Point(1, 1))).toHaveLength(1);

    const vazio: any = new L.Circle([0.1, 0.1], { radius: 50, interactive: true, fill: false, weight: 2 });
    vazio._point = new L.Point(1, 1);
    vazio._radius = 30;
    vazio._radiusY = 30;
    const map2 = mapaCom({ 'pane-a-poligono': rendererCom(vazio) });
    expect(consultarFeicoesNoPonto(map2, [camada('a', 1)], new L.Point(1, 1))).toHaveLength(0);
  });
});
