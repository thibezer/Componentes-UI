import { describe, it, expect, vi } from 'vitest';
import L from 'leaflet';
import { FeicoesLayerRenderer, corSegura } from '../src/gerencigeo-canvas/renderers/feicoes_renderer';
import { normalizarFeicaoEntrada } from '../src/gerencigeo-canvas/feature_adapters';
import { areaMetros2, textoRotulo, formatarArea, formatarExtensao, comprimentoMetros } from '../src/gerencigeo-canvas/feature_metricas';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import type { CanvasLayerDef, CanvasRenderContext } from '../src/gerencigeo-canvas/types';

function mapa(): L.Map {
  const el = document.createElement('div');
  el.style.cssText = 'width:400px;height:300px';
  document.body.appendChild(el);
  return L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom: 15 });
}

const ctx = { onLayerAction: vi.fn(), config: {}, graphicScale: {} } as unknown as CanvasRenderContext;

function def(feicoes: unknown[], extra: Partial<CanvasLayerDef> = {}): CanvasLayerDef {
  return {
    id: 'f', nome: 'F', categoria: 'custom', tipo: 'feicoes', visivel: true, opacidade: 1,
    zIndex: 600, interativo: true, estilo: {}, dados: { feicoes }, ...extra
  };
}

const F = (id: string, geometria: unknown, extra = {}) => normalizarFeicaoEntrada({ id, geometria, ...extra }, 'f')!;
const poligono = (id: string) => F(id, { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]]] });

describe('normalizarFeicaoEntrada', () => {
  it('recusa tipo desconhecido, id ausente, círculo sem raio e texto vazio', () => {
    expect(normalizarFeicaoEntrada({ id: 1, geometria: { tipo: 'Foo' } }, 'c')).toBeNull();
    expect(normalizarFeicaoEntrada({ geometria: { tipo: 'Point', coordenada: [1, 1] } }, 'c')).toBeNull();
    expect(normalizarFeicaoEntrada({ id: 1, geometria: { tipo: 'Circle', centro: [1, 1], raioMetros: 0 } }, 'c')).toBeNull();
    expect(normalizarFeicaoEntrada({ id: 1, geometria: { tipo: 'Text', coordenada: [1, 1], texto: '' } }, 'c')).toBeNull();
  });
  it('aceita {lat,lng} e {latitude,longitude} na entrada', () => {
    const f = normalizarFeicaoEntrada({ id: 1, geometria: { tipo: 'Point', coordenada: { latitude: -23.5, longitude: -46.6 } } }, 'c');
    expect(f?.geometria).toEqual({ tipo: 'Point', coordenada: [-23.5, -46.6] });
  });
  it('(0, 0) exato é descartado (regra herdada de parseCoordenada)', () => {
    expect(normalizarFeicaoEntrada({ id: 1, geometria: { tipo: 'Point', coordenada: [0, 0] } }, 'c')).toBeNull();
  });
});

describe('métricas', () => {
  it('área e extensão de um quadrado de ~100 m', () => {
    const lado = 100 / 111320;
    const quadrado: [number, number][] = [[0.5, 0.5], [0.5 + lado, 0.5], [0.5 + lado, 0.5 + lado], [0.5, 0.5 + lado]];
    expect(areaMetros2([quadrado])).toBeGreaterThan(9900);
    expect(areaMetros2([quadrado])).toBeLessThan(10100);
    expect(comprimentoMetros(quadrado, true)).toBeGreaterThan(395);
  });
  it('formata em pt-BR', () => {
    expect(formatarArea(10000)).toBe('1,0000 ha');
    expect(formatarExtensao(1500)).toBe('1,50 km');
    expect(formatarExtensao(12.5)).toBe('12,50 m');
  });
  it('textoRotulo usa propriedades, id e medidas', () => {
    const f = F('p1', { tipo: 'Point', coordenada: [-23.5, -46.6] }, { propriedades: { name: 'Torre A' } });
    expect(textoRotulo(f)).toBe('Torre A');
    expect(textoRotulo(f, 'id')).toBe('p1');
    expect(textoRotulo(f, 'inexistente')).toBe('');
    expect(textoRotulo(poligono('x'), 'area')).toMatch(/ha$/);
  });
  it('corSegura barra injeção em style', () => {
    expect(corSegura('#fff', 'x')).toBe('#fff');
    expect(corSegura('red;background:url(x)', 'padrao')).toBe('padrao');
  });
});

describe('FeicoesLayerRenderer', () => {
  it('cria cada tipo no sub-pane certo', () => {
    const map = mapa();
    const r = new FeicoesLayerRenderer();
    const fs = [
      poligono('a'),
      F('b', { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.51, -46.61]] }),
      F('c', { tipo: 'Circle', centro: [-23.5, -46.6], raioMetros: 100 }),
      F('d', { tipo: 'Point', coordenada: [-23.5, -46.6] }),
      F('e', { tipo: 'Point', coordenada: [-23.5, -46.6] }, { estilo: { icone: 'tower' } }),
      F('f', { tipo: 'Text', coordenada: [-23.5, -46.6], texto: 'olá' })
    ];
    const grupo = r.render(def(fs), map, ctx);
    grupo.addTo(map);
    expect(grupo.getLayers()).toHaveLength(6);
    for (const t of ['poligono', 'linha', 'ponto', 'texto']) {
      expect(map.getPane(`pane-f-${t}`)).toBeTruthy();
    }
    const circulo = grupo.getLayers().find((l) => l instanceof L.Circle) as L.Circle;
    expect(circulo.getRadius()).toBe(100);
  });

  it('atualiza em lugar: mesma camada Leaflet, novos vértices e estilo', () => {
    const map = mapa();
    const r = new FeicoesLayerRenderer();
    const d = def([poligono('a')]);
    const grupo = r.render(d, map, ctx);
    const antes = grupo.getLayers()[0] as L.Polygon;
    d.dados = { feicoes: [F('a', { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.58], [-23.52, -46.58], [-23.52, -46.6]]] }, { estilo: { corTraco: '#ff0000' } })] };
    r.update(d, grupo, { dados: d.dados }, ctx, map);
    const depois = grupo.getLayers()[0] as L.Polygon;
    expect(depois).toBe(antes);
    expect((depois.getLatLngs()[0] as L.LatLng[]).length).toBe(4);
    expect(depois.options.color).toBe('#ff0000');
  });

  it('trocar o ícone recria; remover feição tira do grupo', () => {
    const map = mapa();
    const r = new FeicoesLayerRenderer();
    const d = def([F('p', { tipo: 'Point', coordenada: [-23.5, -46.6] })]);
    const grupo = r.render(d, map, ctx);
    expect(grupo.getLayers()[0]).toBeInstanceOf(L.CircleMarker);
    d.dados = { feicoes: [F('p', { tipo: 'Point', coordenada: [-23.5, -46.6] }, { estilo: { icone: 'tree' } })] };
    r.update(d, grupo, { dados: d.dados }, ctx, map);
    expect(grupo.getLayers()[0]).toBeInstanceOf(L.Marker);
    d.dados = { feicoes: [] };
    r.update(d, grupo, { dados: d.dados }, ctx, map);
    expect(grupo.getLayers()).toHaveLength(0);
  });

  it('texto é escapado e feição excluída não aparece', () => {
    const map = mapa();
    const r = new FeicoesLayerRenderer();
    const grupo = r.render(def([
      F('t', { tipo: 'Text', coordenada: [-23.5, -46.6], texto: '<img src=x onerror=alert(1)>' }),
      F('x', { tipo: 'Point', coordenada: [-23.5, -46.6] }, { excluida: true })
    ]), map, ctx);
    expect(grupo.getLayers()).toHaveLength(1);
    const html = ((grupo.getLayers()[0] as L.Marker).options.icon as L.DivIcon).options.html as string;
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('rótulo permanente com área', () => {
    const map = mapa();
    const r = new FeicoesLayerRenderer();
    const grupo = r.render(def([
      F('a', { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]]] }, { estilo: { mostrarRotulo: true, campoRotulo: 'area' } })
    ]), map, ctx);
    expect((grupo.getLayers()[0] as L.Layer).getTooltip()).toBeTruthy();
  });
});

describe('GerenciadorFeicoes (API do componente)', () => {
  const novo = () => {
    const lm = new CanvasLayerManager([]);
    return { lm, g: new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => null, emitir: () => undefined }) };
  };

  it('nenhuma camada de feições existe até o consumidor criar', () => {
    const { lm } = novo();
    expect(lm.getLayers().filter((l) => l.tipo === 'feicoes')).toHaveLength(0);
    expect(new CanvasLayerManager().getLayers().filter((l) => l.tipo === 'feicoes')).toHaveLength(0);
  });

  it('definir, adicionar, atualizar e remover', () => {
    const { lm, g } = novo();
    const r = g.definirFeicoes('minha', [
      { id: 'a', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] } },
      { id: 'ruim', geometria: { tipo: 'Polygon', aneis: [[[1, 1]]] } }
    ], { nome: 'Minha camada', zIndex: 700 });
    expect(r).toEqual({ aceitas: 1, recusadas: ['ruim'] });
    expect(lm.getLayerDef('minha')?.zIndex).toBe(700);
    expect(g.adicionarFeicao('minha', { id: 'b', geometria: { tipo: 'Point', coordenada: [-23.6, -46.6] } })).toBeTruthy();
    expect(g.obterFeicoes('minha')).toHaveLength(2);
    expect(g.atualizarFeicao('minha', 'a', { estilo: { icone: 'water' }, propriedades: { name: 'X' } })?.estilo?.icone).toBe('water');
    expect(g.removerFeicao('minha', 'b')).toBe(true);
    expect(g.removerFeicao('minha', 'b')).toBe(false);
    expect(g.obterFeicoes('minha').map((f) => f.id)).toEqual(['a']);
  });

  it('não sobrescreve camada de outro tipo', () => {
    const lm = new CanvasLayerManager();
    const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => null, emitir: () => undefined });
    expect(g.definirFeicoes('perimetro', []).aceitas).toBe(0);
    expect(lm.getLayerDef('perimetro')?.tipo).toBe('vetorial-linhas');
  });

  it('arrastar texto grava a nova posição e pede o evento', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ id: 't', geometria: { tipo: 'Text', coordenada: [-23.5, -46.6], texto: 'a' } }]);
    const movida = { ...g.obterFeicoes('c')[0], geometria: { tipo: 'Text' as const, coordenada: [-23.6, -46.7] as [number, number], texto: 'a' } };
    expect(g.tratarAcaoCamada('feicao-movida', { camadaId: 'c', feicao: movida })).toBe('cad-feicao-atualizada');
    expect((g.obterFeicoes('c')[0].geometria as any).coordenada).toEqual([-23.6, -46.7]);
    expect(g.tratarAcaoCamada('qualquer', { camadaId: 'c', feicao: movida })).toBeNull();
  });
});
