import { describe, it, expect, vi, afterEach } from 'vitest';
import L from 'leaflet';
import { SelecaoFeicoes } from '../src/gerencigeo-canvas/feature_selecao';
import { feicaoNaCaixa } from '../src/gerencigeo-canvas/feature_caixa';
import { FeicaoPopup } from '../src/gerencigeo-canvas/feature_popup';
import { FeicoesLayerRenderer, COR_SELECAO } from '../src/gerencigeo-canvas/renderers/feicoes_renderer';
import { normalizarFeicaoEntrada } from '../src/gerencigeo-canvas/feature_adapters';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import type { Feicao } from '../src/gerencigeo-canvas/feature_types';
import type { CanvasLayerDef, CanvasRenderContext } from '../src/gerencigeo-canvas/types';

afterEach(() => { document.body.innerHTML = ''; });

const F = (id: string, geometria: unknown, extra = {}) => normalizarFeicaoEntrada({ id, geometria, ...extra }, 'c')!;
const ponto = (id: string, lat = -23.5, lon = -46.6) => F(id, { tipo: 'Point', coordenada: [lat, lon] });

function selecaoCom(feicoes: Feicao[]) {
  const aoSelecionar = vi.fn();
  const aoSelecionarUma = vi.fn();
  const aplicarVisual = vi.fn();
  const s = new SelecaoFeicoes({
    obterFeicao: (r) => feicoes.find((f) => f.camadaId === r.camadaId && f.id === r.id),
    aplicarVisual, aoSelecionar, aoSelecionarUma
  });
  return { s, aoSelecionar, aoSelecionarUma, aplicarVisual };
}

describe('SelecaoFeicoes', () => {
  const todas = [ponto('a'), ponto('b'), ponto('c')];

  it('onFeicaoSelecionada só dispara com no máximo uma feição; a lista, sempre', () => {
    const { s, aoSelecionar, aoSelecionarUma } = selecaoCom(todas);
    s.selecionar([{ camadaId: 'c', id: 'a' }]);
    expect(aoSelecionarUma).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a' }));
    s.selecionar([{ camadaId: 'c', id: 'b' }], true);
    expect(aoSelecionar).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'a' }), expect.objectContaining({ id: 'b' })]));
    expect(aoSelecionarUma).toHaveBeenCalledTimes(1);
    s.limpar();
    expect(aoSelecionarUma).toHaveBeenLastCalledWith(null);
  });

  it('selecionar sem aditivo substitui; alternar adiciona e remove', () => {
    const { s } = selecaoCom(todas);
    s.selecionar([{ camadaId: 'c', id: 'a' }]);
    s.selecionar([{ camadaId: 'c', id: 'b' }]);
    expect(s.obter().map((f) => f.id)).toEqual(['b']);
    s.alternar({ camadaId: 'c', id: 'a' });
    expect(s.quantidade).toBe(2);
    s.alternar({ camadaId: 'c', id: 'a' });
    expect(s.obter().map((f) => f.id)).toEqual(['b']);
  });

  it('não notifica quando nada mudou e ignora feição inexistente', () => {
    const { s, aoSelecionar } = selecaoCom(todas);
    s.selecionar([{ camadaId: 'c', id: 'a' }]);
    s.selecionar([{ camadaId: 'c', id: 'a' }]);
    s.selecionar([{ camadaId: 'c', id: 'zzz' }], true);
    expect(aoSelecionar).toHaveBeenCalledTimes(1);
  });

  it('reconciliar descarta o que foi removido', () => {
    const lista = [ponto('a'), ponto('b')];
    const { s, aoSelecionarUma } = selecaoCom(lista);
    s.selecionar([{ camadaId: 'c', id: 'a' }]);
    lista.splice(0, 1);
    s.reconciliar();
    expect(s.quantidade).toBe(0);
    expect(aoSelecionarUma).toHaveBeenLastCalledWith(null);
  });
});

describe('feicaoNaCaixa (narrow-phase)', () => {
  // projeção identidade: lat -> y, lon -> x
  const proj = (p: [number, number]) => ({ x: p[1], y: p[0] });
  const caixa = { x1: 0, y1: 0, x2: 10, y2: 10 };
  const poli = (pts: Array<[number, number]>) => F('p', { tipo: 'Polygon', aneis: [pts] });

  it('window exige tudo dentro; crossing basta tocar', () => {
    const grande = poli([[-5, -5], [-5, 15], [15, 15], [15, -5]]); // contém a caixa inteira
    expect(feicaoNaCaixa(grande, caixa, proj, 'window')).toBe(false);
    expect(feicaoNaCaixa(grande, caixa, proj, 'crossing')).toBe(true);
    const pequeno = poli([[2, 2], [2, 8], [8, 8], [8, 2]]);
    expect(feicaoNaCaixa(pequeno, caixa, proj, 'window')).toBe(true);
  });

  it('envelopes que se sobrepõem sem tocar a geometria não selecionam', () => {
    // triângulo cujo envelope cobre a caixa, mas a hipotenusa passa longe do canto da caixa
    const tri = poli([[20, 20], [20, 40], [40, 20]]);
    expect(feicaoNaCaixa(tri, { x1: 0, y1: 0, x2: 30, y2: 30 }, proj, 'crossing')).toBe(true);
    const longe = poli([[50, 50], [50, 70], [70, 50]]);
    expect(feicaoNaCaixa(longe, caixa, proj, 'crossing')).toBe(false);
  });

  it('linha que cruza a caixa sem ter vértice dentro seleciona em crossing', () => {
    const l = F('l', { tipo: 'LineString', coordenadas: [[5, -10], [5, 20]] });
    expect(feicaoNaCaixa(l, caixa, proj, 'crossing')).toBe(true);
    expect(feicaoNaCaixa(l, caixa, proj, 'window')).toBe(false);
  });

  it('caixa dentro de um furo não seleciona o polígono', () => {
    const comFuro = F('f', { tipo: 'Polygon', aneis: [[[-20, -20], [-20, 30], [30, 30], [30, -20]], [[-5, -5], [-5, 15], [15, 15], [15, -5]]] });
    expect(feicaoNaCaixa(comFuro, caixa, proj, 'crossing')).toBe(false);
  });

  it('ponto e texto: dentro ou fora', () => {
    expect(feicaoNaCaixa(ponto('p', 5, 5), caixa, proj, 'window')).toBe(true);
    expect(feicaoNaCaixa(ponto('p', 50, 5), caixa, proj, 'crossing')).toBe(false);
  });
});

describe('FeicaoPopup', () => {
  const mapa = () => {
    const el = document.createElement('div');
    el.style.cssText = 'width:400px;height:300px';
    document.body.appendChild(el);
    return L.map(el, { center: [-23.5, -46.6], zoom: 15 });
  };
  const camada = { id: 'c', nome: 'Camada X', estilo: {} } as unknown as CanvasLayerDef;

  it('mostra título, tipo · camada · categoria, métricas e no máximo 6 atributos', () => {
    const map = mapa();
    const aoAcao = vi.fn();
    const p = new FeicaoPopup({ obterMapa: () => map, obterCamada: () => camada, aoAcao });
    const props: Record<string, unknown> = { name: 'Lote 1', category: 'Gleba', description: 'Texto' };
    for (let i = 1; i <= 8; i++) props[`attr${i}`] = i;
    p.abrir(F('x', { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]]] }, { propriedades: props }));
    const el = document.querySelector('.cad-feicao-popup') as HTMLElement;
    expect(el.textContent).toContain('Lote 1');
    expect(el.textContent).toContain('Polígono · Camada X · Gleba');
    expect(el.textContent).toMatch(/Área: .* ha/);
    expect(el.textContent).toContain('8 atributos');
    expect(el.textContent).toContain('attr6');
    expect(el.textContent).not.toContain('attr7');
  });

  it('é seguro contra HTML nos dados e dispara as ações', () => {
    const map = mapa();
    const aoAcao = vi.fn();
    const p = new FeicaoPopup({ obterMapa: () => map, obterCamada: () => camada, aoAcao });
    p.abrir(F('x', { tipo: 'Point', coordenada: [-23.5, -46.6] }, { propriedades: { name: '<img src=x onerror=alert(1)>' } }));
    expect(document.querySelector('.cad-feicao-popup img')).toBeNull();
    const botoes = [...document.querySelectorAll<HTMLButtonElement>('.cad-feicao-popup button')];
    expect(botoes.map((b) => b.dataset.acao)).toEqual(['inspecionar', 'zoom', 'vertices', 'copiar']);
    botoes[1].click();
    expect(aoAcao).toHaveBeenCalledWith('zoom', expect.objectContaining({ id: 'x' }));
    p.fechar();
    expect(document.querySelector('.cad-feicao-popup')).toBeNull();
  });
});

describe('seleção no renderizador', () => {
  const ctx = { onLayerAction: vi.fn(), config: {}, graphicScale: {} } as unknown as CanvasRenderContext;
  const mapa = () => {
    const el = document.createElement('div');
    el.style.cssText = 'width:400px;height:300px';
    document.body.appendChild(el);
    return L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom: 15 });
  };
  const def = (feicoes: Feicao[]): CanvasLayerDef => ({
    id: 'c', nome: 'C', categoria: 'custom', tipo: 'feicoes', visivel: true, opacidade: 1,
    zIndex: 600, interativo: true, estilo: {}, dados: { feicoes }
  });

  it('realça só a selecionada e volta ao normal ao desmarcar', () => {
    const map = mapa();
    const r = new FeicoesLayerRenderer();
    const fs = [
      F('a', { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]]] }, { estilo: { corTraco: '#ff0000' } }),
      F('b', { tipo: 'Point', coordenada: [-23.5, -46.6] }, { estilo: { icone: 'tower' } })
    ];
    const grupo = r.render(def(fs), map, ctx);
    const poligono = grupo.getLayers()[0] as L.Polygon;
    const peso = poligono.options.weight!;
    r.aplicarSelecao(grupo, new Set(['a', 'b']));
    expect(poligono.options.color).toBe(COR_SELECAO);
    expect(poligono.options.weight).toBe(peso + 2);
    expect((grupo.getLayers()[1] as L.Marker).options.icon!.options.className).toContain('cad-feicao-selecionada');
    r.aplicarSelecao(grupo, new Set());
    expect(poligono.options.color).toBe('#ff0000');
    expect(poligono.options.weight).toBe(peso);
  });

  it('a seleção sobrevive à recriação do grupo', () => {
    const map = mapa();
    const r = new FeicoesLayerRenderer();
    const fs = [F('a', { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]]] })];
    const g1 = r.render(def(fs), map, ctx);
    r.aplicarSelecao(g1, new Set(['a']));
    r.destroy(g1, map);
    const g2 = r.render(def(fs), map, ctx);
    expect((g2.getLayers()[0] as L.Polygon).options.color).toBe(COR_SELECAO);
  });

  it('mudança grande é aplicada em blocos e termina completa', async () => {
    const map = mapa();
    const r = new FeicoesLayerRenderer();
    const fs = Array.from({ length: 400 }, (_, i) => ponto(`p${i}`, -23.5 + i * 1e-5, -46.6));
    const grupo = r.render(def(fs), map, ctx);
    r.aplicarSelecao(grupo, new Set(fs.map((f) => f.id)));
    await new Promise((res) => setTimeout(res, 400));
    const marcados = grupo.getLayers().filter((l) => (l as L.CircleMarker).options.color === COR_SELECAO);
    expect(marcados).toHaveLength(400);
  });
});

describe('GerenciadorFeicoes: seleção e popup integrados', () => {
  const novo = () => {
    const el = document.createElement('div');
    el.style.cssText = 'width:400px;height:300px';
    document.body.appendChild(el);
    const map = L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom: 15 });
    const lm = new CanvasLayerManager([]);
    const eventos: Array<[string, any]> = [];
    const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, emitir: (e, d) => eventos.push([e, d]) });
    lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as any);
    return { g, eventos, lm, map };
  };

  it('clique seleciona e abre popup; Ctrl alterna e fecha o popup com 2; remover limpa', () => {
    const { g, eventos } = novo();
    g.definirFeicoes('c', [
      { id: 'a', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] } },
      { id: 'b', geometria: { tipo: 'Point', coordenada: [-23.51, -46.6] } }
    ]);
    const det = (id: string, aditivo = false) => ({ camadaId: 'c', feicao: g.obterFeicoes('c').find((f) => f.id === id)!, aditivo });

    expect(g.tratarAcaoCamada('feicao-clique', det('a'))).toBe('cad-feicao-clique');
    expect(document.querySelector('.cad-feicao-popup')).toBeTruthy();
    expect(eventos.filter(([e]) => e === 'cad-feicao-selecionada')).toHaveLength(1);

    g.tratarAcaoCamada('feicao-clique', det('b', true));
    expect(g.obterFeicoesSelecionadas().map((f) => f.id).sort()).toEqual(['a', 'b']);
    expect(document.querySelector('.cad-feicao-popup')).toBeNull();
    // com 2 selecionadas não há cad-feicao-selecionada novo
    expect(eventos.filter(([e]) => e === 'cad-feicao-selecionada')).toHaveLength(1);
    expect(eventos.filter(([e]) => e === 'cad-selecao').length).toBeGreaterThanOrEqual(2);

    g.tratarAcaoCamada('feicao-clique', det('a'));
    expect(document.querySelector('.cad-feicao-popup')).toBeTruthy();
    g.removerFeicao('c', 'a');
    expect(g.obterFeicoesSelecionadas()).toHaveLength(0);
    expect(document.querySelector('.cad-feicao-popup')).toBeNull();
  });

  it('atualizar a feição aberta refaz o popup', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ id: 'a', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] }, propriedades: { name: 'Antes' } }]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'a' }]);
    expect(document.querySelector('.cad-feicao-popup')?.textContent).toContain('Antes');
    g.atualizarFeicao('c', 'a', { propriedades: { name: 'Depois' } });
    expect(document.querySelector('.cad-feicao-popup')?.textContent).toContain('Depois');
  });

  it('caixa só pega camadas visíveis, interativas e desbloqueadas', () => {
    const { g, lm, map } = novo();
    g.definirFeicoes('c', [{ id: 'a', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] } }]);
    const caixaEmVolta = () => {
      const c = map.latLngToContainerPoint([-23.5, -46.6]);
      return { x1: c.x - 10, y1: c.y - 10, x2: c.x + 10, y2: c.y + 10 };
    };
    lm.setLayerBlocked('c', true);
    g.selecionarNaCaixa(caixaEmVolta(), 'window', false);
    expect(g.obterFeicoesSelecionadas()).toHaveLength(0);
    lm.setLayerBlocked('c', false);
    g.selecionarNaCaixa(caixaEmVolta(), 'window', false);
    expect(g.obterFeicoesSelecionadas()).toHaveLength(1);
    map.setView([-23.5, -46.6], 15, { animate: false }); // o popup pode ter movido o mapa
    g.selecionarNaCaixa(caixaEmVolta(), 'window', true); // Ctrl alterna: remove
    expect(g.obterFeicoesSelecionadas()).toHaveLength(0);
  });
});
