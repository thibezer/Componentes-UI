import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { LayerRendererFactory } from '../src/gerencigeo-canvas/layer_renderer_factory';
import { RegraVersoes } from '../src/gerencigeo-canvas/feature_versoes';
import { resolverCliqueCentral } from '../src/gerencigeo-canvas/layer_hit_test';
import { caixaDaFeicao, caixasSeTocam } from '../src/gerencigeo-canvas/feature_indice';
import type { IRenderizadorFeicoes } from '../src/gerencigeo-canvas/renderers/renderizador_feicoes_tipos';

/*
 * Equivalência entre os dois renderizadores (`leaflet` e `canvas`): a mesma suíte de comportamento passa nos dois e,
 * depois de sequências aleatórias de lotes (com seleção no meio, travessia do limite de 300, oficial × prévia,
 * `oculta` × `excluida`), os dois desenham as mesmas feições e as mesmas marcas de LOD dentro do canvas.
 */

afterEach(() => { document.body.innerHTML = ''; });

type Modo = 'leaflet' | 'canvas';
const quadro = () => new Promise<void>((res) => setTimeout(res, 70));
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((23.5 * Math.PI) / 180));

function novo(zoom: number, modo: Modo) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom });
  const lm = new CanvasLayerManager([]);
  const regra = new RegraVersoes();
  const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, regra, emitir: () => undefined });
  lm.attachMap(map, {
    config: {}, graphicScale: {}, regraVersoes: regra, renderizador: () => modo,
    onLayerAction: (a: string, d: any) => { g.tratarAcaoCamada(a, d); }
  } as never);
  const grupo = () => lm.getLayerInstance('c') as L.LayerGroup;
  const renderer = () => LayerRendererFactory.get('feicoes') as IRenderizadorFeicoes;
  const clicar = (ll: L.LatLng, extra: MouseEventInit = {}) => {
    const cp = map.latLngToContainerPoint(ll);
    return resolverCliqueCentral(map, lm.getLayers(), new MouseEvent('click', { clientX: cp.x, clientY: cp.y, ...extra }));
  };
  return { g, lm, map, grupo, renderer, clicar, regra };
}

const quad = (id: string, lat: number, lon: number, lado: number, extra: Record<string, unknown> = {}) => ({
  id, ...extra,
  geometria: { tipo: 'Polygon', aneis: [[[lat, lon], [lat, lon + lado * mLon], [lat + lado * mLat, lon + lado * mLon], [lat + lado * mLat, lon]]] }
});
const pt = (id: string, lat: number, lon: number, extra: Record<string, unknown> = {}) => ({ id, geometria: { tipo: 'Point', coordenada: [lat, lon] }, ...extra });

describe.each<Modo>(['leaflet', 'canvas'])('suíte de comportamento — renderizador %s', (modo) => {
  it('oculta existe e não é desenhada; excluida sai; oficial × prévia; seleção aditiva', async () => {
    const { g, renderer, grupo } = novo(16, modo);
    g.definirFeicoes('c', [
      quad('a', -23.5, -46.6, 100), quad('o', -23.5, -46.599, 100, { oculta: true }), quad('x', -23.5, -46.598, 100, { excluida: true }),
      quad('of', -23.5, -46.597, 100, { entidadeId: 'e' }), quad('pv', -23.5, -46.596, 100, { entidadeId: 'e', status: 'previa' })
    ]);
    await quadro();
    expect(g.obterFeicoes('c').map((f) => f.id)).toContain('o');
    expect(g.desenhada(g.buscar('c', 'x')!)).toBe(false); // excluída: fora do desenho, de clique e de consulta
    expect(renderer().idsDesenhados(grupo())!.materializadas).toEqual(['a', 'of']);
    g.definirPreviasGlobais(true);
    await quadro();
    expect(renderer().idsDesenhados(grupo())!.materializadas).toEqual(['a', 'of', 'pv']);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'a' }]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'of' }], true);
    expect(g.obterFeicoesSelecionadas().map((f) => f.id).sort()).toEqual(['a', 'of']);
    g.alternarSelecaoFeicao({ camadaId: 'c', id: 'a' });
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['of']);
  });

  it('clique central: seleciona a feição sob o cursor, prioriza linha sobre área e respeita camada bloqueada', async () => {
    const { g, lm, clicar } = novo(16, modo);
    g.definirFeicoes('c', [
      quad('area', -23.5, -46.6, 200),
      { id: 'linha', geometria: { tipo: 'LineString', coordenadas: [[-23.5 + 100 * mLat, -46.6], [-23.5 + 100 * mLat, -46.6 + 200 * mLon]] } }
    ]);
    await quadro();
    clicar(L.latLng(-23.5 + 100 * mLat, -46.6 + 100 * mLon));
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['linha']);
    clicar(L.latLng(-23.5 + 30 * mLat, -46.6 + 100 * mLon));
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['area']);
    lm.setLayerBlocked('c', true);
    expect(clicar(L.latLng(-23.5 + 30 * mLat, -46.6 + 100 * mLon))).toBe(false);
  });

  it('consultarProximas, feicaoVisivel e estatísticas respondem pelos dois caminhos', async () => {
    const { g, renderer, grupo } = novo(16, modo);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 100), quad('o', -23.5, -46.6, 100, { oculta: true })]);
    await quadro();
    expect(renderer().consultarProximas(grupo(), { minLat: -24, maxLat: -23, minLon: -47, maxLon: -46 }).map((f) => f.id)).toEqual(['a']);
    expect(renderer().feicaoVisivel(grupo(), g.buscar('c', 'a')!)).toBe(true);
    expect(renderer().estatisticas(grupo())).toMatchObject({ total: 2, renderizador: modo });
  });

  it('lote: adicionar, atualizar e remover refletem no desenho', async () => {
    const { g, renderer, grupo } = novo(16, modo);
    g.definirFeicoes('c', [quad('a', -23.5, -46.6, 100), quad('b', -23.5, -46.599, 100)]);
    await quadro();
    g.aplicarLote('c', { remover: ['a'], adicionar: [quad('n', -23.5, -46.598, 100)], atualizar: [{ id: 'b', geometria: quad('b', -23.5, -46.5995, 50).geometria }] });
    await quadro();
    expect(renderer().idsDesenhados(grupo())!.materializadas).toEqual(['b', 'n']);
  });
});

describe('equivalência: leaflet × canvas (desenho incremental, mesmas feições e mesmas marcas)', () => {
  function semente(n: number) {
    let s = n;
    return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  }

  async function rodar(zoom: number, inicial: number, rodadas: number, opcoes: { selecionar?: boolean; versoes?: boolean; ocultar?: boolean }) {
    const resultados: Record<Modo, { materializadas: string[]; marcas: string[]; clusters: number }> = {} as never;
    let canvasFinal: ReturnType<typeof novo> | null = null;
    let finais: string[] = [];
    for (const modo of ['leaflet', 'canvas'] as Modo[]) {
      const r = semente(100 + zoom + inicial);
      const gerar = (id: string) => {
        const lat = -23.5 + (r() - 0.5) * 0.02;
        const lon = -46.6 + (r() - 0.5) * 0.02;
        const k = r();
        const extra: Record<string, unknown> = {};
        if (opcoes.versoes && r() < 0.15) { extra.entidadeId = `e${Math.floor(r() * 4)}`; extra.status = r() < 0.5 ? 'previa' : 'oficial'; }
        if (opcoes.ocultar && r() < 0.08) extra.oculta = true;
        if (k < 0.4) return quad(id, lat, lon, r() < 0.5 ? 30 : 250, extra);
        if (k < 0.6) return { id, ...extra, geometria: { tipo: 'LineString', coordenadas: [[lat, lon], [lat + r() * 0.001, lon + r() * 0.001]] } };
        if (k < 0.65) return { id, ...extra, geometria: { tipo: 'Circle', centro: [lat, lon], raioMetros: r() < 0.5 ? 10 : 200 } };
        if (k < 0.7) return { id, ...extra, geometria: { tipo: 'Text', coordenada: [lat, lon], texto: 't' } };
        return pt(id, lat, lon, k < 0.76 ? { ...extra, estilo: { icone: 'tower' } } : extra);
      };
      const c = novo(zoom, modo);
      c.g.definirFeicoes('c', Array.from({ length: inicial }, (_, i) => gerar(`p${i}`)));
      let proximo = inicial;
      for (let k = 0; k < rodadas; k++) {
        const atuais = c.g.obterFeicoes('c').map((f) => f.id);
        const remover = Array.from({ length: 3 }, () => atuais[Math.floor(r() * atuais.length)]);
        const atualizar = Array.from({ length: 4 }, () => ({ ...gerar('x'), id: atuais[Math.floor(r() * atuais.length)] }));
        const adicionar = Array.from({ length: 5 }, () => gerar(`p${proximo++}`));
        c.g.aplicarLote('c', { remover, atualizar: atualizar.filter((u) => !remover.includes(u.id)), adicionar });
        if (opcoes.selecionar && k % 3 === 0) c.g.selecionarFeicoes(c.g.obterFeicoes('c').filter(() => r() < 0.06).map((f) => ({ camadaId: 'c', id: f.id })));
      }
      await quadro();
      const d = c.renderer().idsDesenhados(c.grupo())!;
      resultados[modo] = { ...d, clusters: c.renderer().estatisticas(c.grupo())!.clusters };
      if (modo === 'canvas') {
        canvasFinal = c;
        finais = c.g.obterFeicoes('c').map((f) => f.id);
      }
    }
    // só dentro do canvas (vista + 10% do Leaflet): o caminho leaflet também materializa uma folga maior fora dele
    const c = canvasFinal!;
    const vista = c.map.getBounds().pad(0.1);
    const caixaVista = { minLat: vista.getSouth(), maxLat: vista.getNorth(), minLon: vista.getWest(), maxLon: vista.getEast() };
    const dentro = new Set(c.g.obterFeicoes('c').filter((f) => caixasSeTocam(caixaDaFeicao(f), caixaVista)).map((f) => f.id));
    const filtrar = (ids: string[]) => ids.filter((id) => dentro.has(id));
    void finais;
    const tipoDe = new Map(c.g.obterFeicoes('c').map((f) => [f.id, f.geometria.tipo + (f.estilo?.icone ? '+icone' : '')]));
    (globalThis as { __tipos?: Map<string, string> }).__tipos = tipoDe;
    return {
      leaflet: { materializadas: filtrar(resultados.leaflet.materializadas), marcas: filtrar(resultados.leaflet.marcas), clusters: resultados.leaflet.clusters },
      canvas: { materializadas: filtrar(resultados.canvas.materializadas), marcas: filtrar(resultados.canvas.marcas), clusters: resultados.canvas.clusters }
    };
  }

  type Resultado = Awaited<ReturnType<typeof rodar>>;
  const igual = (r: Resultado): void => {
    const t = (globalThis as { __tipos?: Map<string, string> }).__tipos!;
    const dif = (a: string[], b: string[]) => a.filter((x) => !b.includes(x)).map((x) => `${x}:${t.get(x)}`);
    expect({
      soLeafletMat: dif(r.leaflet.materializadas, r.canvas.materializadas), soCanvasMat: dif(r.canvas.materializadas, r.leaflet.materializadas),
      soLeafletMarca: dif(r.leaflet.marcas, r.canvas.marcas), soCanvasMarca: dif(r.canvas.marcas, r.leaflet.marcas)
    }).toEqual({ soLeafletMat: [], soCanvasMat: [], soLeafletMarca: [], soCanvasMarca: [] });
    expect(r.canvas.clusters).toBe(r.leaflet.clusters);
  };

  it('zoom 12: metade das formas vira marca; os dois desenham o mesmo', async () => {
    const r = await rodar(12, 150, 10, {});
    expect(r.canvas.marcas.length).toBeGreaterThan(5);
    const t = (globalThis as { __tipos?: Map<string, string> }).__tipos!;
    const dif = (a: string[], b: string[]) => a.filter((x) => !b.includes(x)).map((x) => `${x}:${t.get(x)}`);
    expect({ soLeafletMat: dif(r.leaflet.materializadas, r.canvas.materializadas), soCanvasMat: dif(r.canvas.materializadas, r.leaflet.materializadas), soLeafletMarca: dif(r.leaflet.marcas, r.canvas.marcas), soCanvasMarca: dif(r.canvas.marcas, r.leaflet.marcas) }).toEqual({ soLeafletMat: [], soCanvasMat: [], soLeafletMarca: [], soCanvasMarca: [] });
    expect(r.canvas).toEqual(r.leaflet);
  });

  it('zoom 14, com seleção no meio das mudanças', async () => {
    const r = await rodar(14, 150, 12, { selecionar: true });
    expect(r.canvas).toEqual(r.leaflet);
  });

  it('com oficial × prévia e oculta', async () => {
    const r = await rodar(13, 160, 12, { versoes: true, ocultar: true });
    expect(r.canvas).toEqual(r.leaflet);
  });

  it('acima do limite de 300 feições (culling do caminho leaflet) e travessia do limite', async () => {
    const r = await rodar(13, 330, 8, { selecionar: true, ocultar: true });
    igual(r);
  });

  it('pontos agrupados em zoom baixo: mesmo número de clusters e mesmos pontos individuais', async () => {
    const r = await rodar(11, 200, 8, {});
    expect(r.canvas.clusters).toBe(r.leaflet.clusters);
    expect(r.canvas.materializadas).toEqual(r.leaflet.materializadas);
  });
});
