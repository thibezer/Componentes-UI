import { describe, it, expect, afterEach, vi } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { RegraVersoes } from '../src/gerencigeo-canvas/feature_versoes';
import { normalizarFeicaoEntrada } from '../src/gerencigeo-canvas/feature_adapters';
import { buscarSnap } from '../src/gerencigeo-canvas/feature_snap';
import { feicaoNaCaixa, feicaoNoLaco } from '../src/gerencigeo-canvas/feature_caixa';
import { feicaoNoPonto } from '../src/gerencigeo-canvas/feature_amostra';
import { consultarFeicoesNoPonto } from '../src/gerencigeo-canvas/layer_hit_test';
import type { ControleDesenho } from '../src/gerencigeo-canvas/feature_desenho_controle';
import type { LatLonPar } from '../src/gerencigeo-canvas/feature_types';

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
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined, regraVersoes: regra } as never);
  const ev = (nome: string) => eventos.filter(([e]) => e === nome).map(([, d]) => d);
  const desenho = () => (g as unknown as { desenho: ControleDesenho }).desenho;
  const desenhadas = () => (lm.getLayerInstance('c') as L.LayerGroup | undefined)?.getLayers().length ?? 0;
  return { g, lm, map, ev, desenho, desenhadas };
}

const A: LatLonPar = [-23.5, -46.6];
const pt = (id: string, c: LatLonPar = A, extra: Record<string, unknown> = {}) => ({ id, geometria: { tipo: 'Point', coordenada: c }, ...extra });
const quad = (id: string, extra: Record<string, unknown> = {}) => ({
  id, geometria: { tipo: 'Polygon', aneis: [[[-23.499, -46.601], [-23.499, -46.599], [-23.501, -46.599], [-23.501, -46.601]]] }, ...extra
});

describe('modelo', () => {
  it('`oculta` é normalizada só quando vale e é independente de `excluida`', () => {
    expect(normalizarFeicaoEntrada({ ...pt('a'), oculta: true }, 'c')).toMatchObject({ oculta: true, excluida: false });
    expect(normalizarFeicaoEntrada(pt('a'), 'c')).not.toHaveProperty('oculta');
    expect(normalizarFeicaoEntrada({ ...pt('a'), oculta: false }, 'c')).not.toHaveProperty('oculta');
    expect(normalizarFeicaoEntrada({ ...pt('a'), excluida: true }, 'c')).not.toHaveProperty('oculta');
  });

  it('a feição oculta continua nos dados (obterFeicoes) e pode ser atualizada', () => {
    const { g } = novo();
    g.definirFeicoes('c', [pt('a', A, { oculta: true })]);
    expect(g.obterFeicoes('c')[0].oculta).toBe(true);
    const f = g.atualizarFeicao('c', 'a', { propriedades: { nome: 'x' } })!;
    expect(f.oculta).toBe(true);
    expect(f.propriedades).toEqual({ nome: 'x' });
    expect(g.atualizarFeicao('c', 'a', { oculta: false })!.oculta).toBeUndefined();
  });
});

describe('renderizador', () => {
  it('não desenha a oculta; ocultar/mostrar pelo lote tira e põe a camada Leaflet', () => {
    const { g, desenhadas } = novo();
    g.definirFeicoes('c', [pt('a'), pt('b', [-23.5001, -46.6001], { oculta: true })]);
    expect(desenhadas()).toBe(1);
    g.atualizarFeicao('c', 'a', { oculta: true });
    expect(desenhadas()).toBe(0);
    g.aplicarLote('c', { atualizar: [{ id: 'a', oculta: false }, { id: 'b', oculta: false }] });
    expect(desenhadas()).toBe(2);
  });

  it('pontos ocultos não entram nos clusters nem na contagem', () => {
    const { g, lm } = novo(13);
    const pts = Array.from({ length: 20 }, (_, i) => pt(`p${i}`, [-23.5 + i * 1e-6, -46.6], i < 5 ? { oculta: true } : {}));
    g.definirFeicoes('c', pts);
    const html = () => (lm.getLayerInstance('c') as L.LayerGroup).getLayers().map((l) => String(((l as L.Marker).options.icon as L.DivIcon).options.html)).join('');
    expect(html()).toContain('>15<');
    g.atualizarFeicao('c', 'p0', { oculta: false });
    expect(html()).toContain('>16<');
  });
});

describe('seleção, hit-test, hover e snap', () => {
  it('clique/hit-test não acham a oculta', () => {
    const { g, lm, map } = novo();
    g.definirFeicoes('c', [quad('q', { oculta: true })]);
    const def = lm.getLayerDef('c')!;
    expect(consultarFeicoesNoPonto(map, [def], map.latLngToLayerPoint(A))).toHaveLength(0);
    g.atualizarFeicao('c', 'q', { oculta: false });
    (lm.getLayerInstance('c') as L.LayerGroup).eachLayer((l) => (l as unknown as { _project: () => void })._project?.());
    expect(consultarFeicoesNoPonto(map, [def], map.latLngToLayerPoint(A))).toHaveLength(1);
  });

  it('seleção por referência é ignorada; ocultar uma feição selecionada a tira da seleção', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [pt('a'), pt('o', [-23.51, -46.61], { oculta: true })]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'o' }]);
    expect(g.obterFeicoesSelecionadas()).toHaveLength(0);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'a' }, { camadaId: 'c', id: 'o' }]);
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['a']);
    g.alternarSelecaoFeicao({ camadaId: 'c', id: 'o' });
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['a']);
    g.atualizarFeicao('c', 'a', { oculta: true });
    expect(g.obterFeicoesSelecionadas()).toHaveLength(0);
    expect(ev('cad-selecao').pop().feicoes).toEqual([]);
  });

  it('caixa Window/Crossing não pega a oculta', () => {
    const { g, map } = novo();
    g.definirFeicoes('c', [pt('a'), pt('o', A, { oculta: true })]);
    const c = map.latLngToContainerPoint(A);
    const caixa = { x1: c.x - 10, y1: c.y - 10, x2: c.x + 10, y2: c.y + 10 };
    g.selecionarNaCaixa(caixa, 'window', false);
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['a']);
    g.selecionarNaCaixa(caixa, 'crossing', false);
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['a']);
    const o = normalizarFeicaoEntrada(pt('o', A, { oculta: true }), 'c')!;
    expect(feicaoNaCaixa(o, caixa, (p) => map.latLngToContainerPoint(p), 'window')).toBe(false);
  });

  it('laço não pega a oculta', () => {
    const { g, desenho } = novo();
    g.definirFeicoes('c', [pt('a'), pt('o', [-23.5001, -46.6001], { oculta: true })]);
    const laco: LatLonPar[] = [[-23.49, -46.61], [-23.49, -46.59], [-23.51, -46.59], [-23.51, -46.61]];
    g.ativarFerramenta('selecao-laco');
    for (const p of laco) desenho().clicarEm(p);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['a']);
    expect(feicaoNoLaco(normalizarFeicaoEntrada(pt('o', A, { oculta: true }), 'c')!, laco)).toBe(false);
  });

  it('snap ignora a oculta (função pura e consulta do componente)', () => {
    const { g, map } = novo();
    g.definirFeicoes('c', [pt('o', A, { oculta: true })]);
    expect(g.buscarSnapEm(A)).toBeNull();
    g.atualizarFeicao('c', 'o', { oculta: false });
    expect(g.buscarSnapEm(A)).toMatchObject({ feicaoId: 'o', tipo: 'vertice' });
    const f = normalizarFeicaoEntrada(pt('o', A, { oculta: true }), 'c')!;
    const px = map.latLngToContainerPoint(A);
    expect(buscarSnap({ x: px.x, y: px.y }, [f], (p) => map.latLngToContainerPoint(p))).toBeNull();
  });

  it('hover/conta-gotas (feicaoNoPonto) ignoram a oculta', () => {
    const { map } = novo();
    const f = normalizarFeicaoEntrada(pt('o', A, { oculta: true }), 'c')!;
    const px = map.latLngToContainerPoint(A);
    expect(feicaoNoPonto({ x: px.x, y: px.y }, [f], (p) => map.latLngToContainerPoint(p))).toBeNull();
  });
});

describe('oculta ≠ excluída', () => {
  it('ocultar não encerra a edição; excluir encerra', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ id: 'l', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.51, -46.59]] } }]);
    expect(g.iniciarEdicao('c', 'l').ok).toBe(true);
    g.atualizarFeicao('c', 'l', { oculta: true });
    expect(g.editando).toBe(true);
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['l']); // a feição em edição segue selecionada
    g.atualizarFeicao('c', 'l', { excluida: true });
    expect(g.editando).toBe(false);
  });

  it('a oculta não é excluída: segue nos dados e o popup fecha ao ocultar', () => {
    const { g } = novo();
    g.definirFeicoes('c', [pt('a')]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'a' }]);
    const fechar = vi.spyOn(g, 'fecharPopup');
    g.atualizarFeicao('c', 'a', { oculta: true });
    expect(g.obterFeicoesSelecionadas()).toHaveLength(0);
    expect(g.obterFeicoes('c')[0].excluida).toBe(false);
    expect(fechar).not.toHaveBeenCalled(); // o fechamento vem da seleção, não de uma exclusão
  });
});

describe('oficial × prévia', () => {
  it('a oficial oculta continua escondendo a prévia da entidade', () => {
    const { g, desenhadas } = novo();
    g.definirFeicoes('c', [
      pt('ofic', A, { entidadeId: 'E', oculta: true }),
      pt('prev', [-23.5001, -46.6001], { entidadeId: 'E', status: 'previa' })
    ]);
    expect(desenhadas()).toBe(0); // oficial oculta (não desenha) e prévia escondida pela regra
    g.definirPreviasGlobais(true);
    expect(desenhadas()).toBe(1);
  });

  it('prévia oculta sem oficial não aparece; a mostrar, aparece', () => {
    const { g, desenhadas } = novo();
    g.definirFeicoes('c', [pt('prev', A, { entidadeId: 'E', status: 'previa', oculta: true })]);
    expect(desenhadas()).toBe(0);
    g.atualizarFeicao('c', 'prev', { oculta: false });
    expect(desenhadas()).toBe(1);
  });

  it('entrar uma oficial oculta (lote) esconde a prévia, como qualquer oficial', () => {
    const { g, desenhadas } = novo();
    g.definirFeicoes('c', [pt('prev', A, { entidadeId: 'E', status: 'previa' })]);
    expect(desenhadas()).toBe(1);
    g.aplicarLote('c', { adicionar: [pt('ofic', [-23.51, -46.61], { entidadeId: 'E', oculta: true })] });
    expect(desenhadas()).toBe(0);
    g.aplicarLote('c', { remover: ['ofic'] });
    expect(desenhadas()).toBe(1);
  });
});

describe('câmera', () => {
  it('ajustarTudo e ajustarCamada ignoram as ocultas; zoomParaFeicao ainda enquadra uma oculta', () => {
    const { g, map } = novo();
    const fit = vi.spyOn(map, 'fitBounds').mockImplementation(() => map);
    const voo = vi.spyOn(map, 'flyTo').mockImplementation(() => map);
    g.definirFeicoes('c', [pt('a', [-23.5, -46.6]), pt('longe', [10, 10], { oculta: true })]);
    expect(g.ajustarTudo()).toBe(true);
    expect(fit).not.toHaveBeenCalled(); // sobrou um ponto só: voa até ele
    expect((voo.mock.calls[0][0] as [number, number])[0]).toBeCloseTo(-23.5);

    g.atualizarFeicao('c', 'a', { oculta: true });
    expect(g.ajustarTudo()).toBe(false);
    expect(g.ajustarCamada('c')).toBe(false);

    voo.mockClear();
    expect(g.zoomParaFeicao('c', 'longe')).toBe(true);
    expect(voo).toHaveBeenCalled();
  });
});
