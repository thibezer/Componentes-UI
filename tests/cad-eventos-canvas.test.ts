/**
 * Testes de caracterização de cad-eventos-canvas.ts (Fase 0 do plano de lapidação).
 * Congelam o comportamento atual dos despachantes de eventos antes de qualquer refatoração.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  processarCliqueLivreCanvas,
  processarAcaoPopup,
  tratarCliqueMarcador,
  tratarCliqueSegmento,
  type ContextoEventosCanvas
} from '../src/components/ui-canvas-cad/cad-eventos-canvas';

function criarCtx(sobrescrever: Partial<ContextoEventosCanvas> & { map?: any; camadas?: any[] } = {}) {
  const host = document.createElement('div');
  const mapContainer = document.createElement('div');
  const interacao = { selectionHappened: false, panHappened: false, ctx: { selectedPontoIds: [1], selectedVizinhoPontoIds: [2], lastSelectedPontoId: 1 } };
  const map = sobrescrever.map === undefined
    ? { containerPointToLatLng: vi.fn((p: { x: number; y: number }) => ({ lat: p.y / 10, lng: p.x / 10 })) }
    : sobrescrever.map;
  const controller: any = {
    canvasInteracao: interacao,
    getMap: () => map,
    layerManager: { getLayers: () => sobrescrever.camadas ?? [{ id: 'a', visivel: true }, { id: 'b', visivel: false }] },
    context: { selectedSegmentoId: null as any, selectedPontoIds: [1] },
    selectSegmento: vi.fn(),
    atualizarDestaqueMarcadores: vi.fn()
  };
  const eventos: CustomEvent[] = [];
  for (const nome of ['ui-canvas-clique', 'ui-acao-popup', 'ui-clique-sequencial', 'ui-ponto-selecionado', 'ui-elemento-selecionado', 'ui-segmento-selecionado']) {
    host.addEventListener(nome, (e) => eventos.push(e as CustomEvent));
  }
  const ctx: ContextoEventosCanvas = {
    host,
    controller,
    mapContainer,
    modoSequencial: false,
    mouseMovedSinceDown: false,
    obterElementoPorId: vi.fn(() => undefined),
    fecharPopup: vi.fn(),
    ...sobrescrever
  } as ContextoEventosCanvas;
  return { ctx, controller, eventos, host };
}

const nomes = (eventos: CustomEvent[]) => eventos.map((e) => e.type);

describe('processarCliqueLivreCanvas', () => {
  it('emite ui-canvas-clique com payload canônico usando latlng e containerPoint do evento Leaflet', () => {
    const { ctx, eventos } = criarCtx();
    const ok = processarCliqueLivreCanvas(ctx, { latlng: { lat: -10.5, lng: -50.25 }, containerPoint: { x: 10.4, y: 20.6 }, originalEvent: {} });
    expect(ok).toBe(true);
    expect(eventos).toHaveLength(1);
    const d = eventos[0].detail;
    expect(d.coordenadas).toEqual({ lat: -10.5, lng: -50.25 });
    expect(d.lat).toBe(-10.5);
    expect(d.lng).toBe(-50.25);
    expect(d.lon).toBe(-50.25);
    expect(d.pontoPixel).toEqual({ x: 10, y: 21 });
    expect(d.camadasAtivas).toEqual(['a']);
    expect(eventos[0].bubbles).toBe(true);
    expect(eventos[0].composed).toBe(true);
  });

  it('aceita "lon" no lugar de "lng" e prioriza os parâmetros explícitos', () => {
    const { ctx, eventos } = criarCtx();
    processarCliqueLivreCanvas(ctx, { latlng: { lat: 1, lng: 2 } }, { lat: 3, lon: 4 }, { x: 5, y: 6 });
    expect(eventos[0].detail.coordenadas).toEqual({ lat: 3, lng: 4 });
    expect(eventos[0].detail.pontoPixel).toEqual({ x: 5, y: 6 });
  });

  it('sem latlng, converte o ponto de pixel via map.containerPointToLatLng', () => {
    const { ctx, eventos } = criarCtx();
    processarCliqueLivreCanvas(ctx, { originalEvent: {} }, undefined, { x: 100, y: 50 });
    expect(eventos[0].detail.coordenadas).toEqual({ lat: 5, lng: 10 });
  });

  it('sem containerPoint, calcula o pixel a partir de clientX/clientY e do retângulo do container', () => {
    const { ctx, eventos } = criarCtx();
    ctx.mapContainer!.getBoundingClientRect = () => ({ left: 10, top: 20 } as DOMRect);
    processarCliqueLivreCanvas(ctx, { clientX: 110, clientY: 70 });
    expect(eventos[0].detail.pontoPixel).toEqual({ x: 100, y: 50 });
  });

  it.each([
    ['modo sequencial ligado', (c: any) => { c.ctx.modoSequencial = true; }],
    ['seleção por caixa ocorreu', (c: any) => { c.controller.canvasInteracao.selectionHappened = true; }],
    ['pan ocorreu', (c: any) => { c.controller.canvasInteracao.panHappened = true; }],
    ['mouse se moveu desde o mousedown', (c: any) => { c.ctx.mouseMovedSinceDown = true; }],
    ['sem mapa', (c: any) => { c.controller.getMap = () => null; }],
    ['sem container', (c: any) => { c.ctx.mapContainer = null; }]
  ])('não emite quando: %s', (_nome, preparar) => {
    const c = criarCtx();
    preparar(c);
    expect(processarCliqueLivreCanvas(c.ctx, { latlng: { lat: 1, lng: 1 } })).toBe(false);
    expect(c.eventos).toHaveLength(0);
  });

  it('ignora cliques em elementos interativos (marcador, popup, ferramenta, painel de camadas)', () => {
    for (const classe of ['leaflet-marker-icon', 'leaflet-interactive', 'ui-popup-btn', 'cad-btn-tool', 'qgis-layer-panel']) {
      const { ctx, eventos } = criarCtx();
      const alvo = document.createElement('span');
      alvo.className = classe;
      const filho = document.createElement('i');
      alvo.appendChild(filho);
      expect(processarCliqueLivreCanvas(ctx, { originalEvent: { target: filho }, latlng: { lat: 1, lng: 1 } })).toBe(false);
      expect(eventos).toHaveLength(0);
    }
  });

  it('usa composedPath()[0] como alvo quando disponível', () => {
    const { ctx, eventos } = criarCtx();
    const marcador = document.createElement('div');
    marcador.className = 'leaflet-marker-icon';
    const ev = { composedPath: () => [marcador], target: document.createElement('div'), latlng: { lat: 1, lng: 1 } };
    expect(processarCliqueLivreCanvas(ctx, ev)).toBe(false);
    expect(eventos).toHaveLength(0);
  });

  it('lista só camadas visíveis e tolera ausência do layerManager', () => {
    const { ctx, eventos, controller } = criarCtx();
    controller.layerManager = undefined;
    processarCliqueLivreCanvas(ctx, { latlng: { lat: 1, lng: 1 } });
    expect(eventos[0].detail.camadasAtivas).toEqual([]);
  });
});

describe('processarAcaoPopup', () => {
  it('emite ui-acao-popup com o elemento informado e fecha o popup', () => {
    const { ctx, eventos } = criarCtx();
    const elemento = { id: 7, nome: 'x' };
    processarAcaoPopup(ctx, 'editar', 7, elemento);
    expect(eventos[0].detail).toEqual({ acaoId: 'editar', elementoId: 7, elemento });
    expect(ctx.fecharPopup).toHaveBeenCalledTimes(1);
  });

  it('busca o elemento por id quando não informado e cai para { id } se não achar', () => {
    const a = criarCtx();
    (a.ctx.obterElementoPorId as any).mockReturnValue({ id: 'k', extra: 1 });
    processarAcaoPopup(a.ctx, 'ver', 'k');
    expect(a.eventos[0].detail.elemento).toEqual({ id: 'k', extra: 1 });

    const b = criarCtx();
    processarAcaoPopup(b.ctx, 'ver', 'z');
    expect(b.eventos[0].detail.elemento).toEqual({ id: 'z' });
  });
});

describe('tratarCliqueMarcador', () => {
  it('modo sequencial: fecha o popup, emite só ui-clique-sequencial e não chama callbacks', () => {
    const { ctx, eventos } = criarCtx({ modoSequencial: true });
    const cb = vi.fn();
    tratarCliqueMarcador(ctx, 5, false, { id: 5, lat: 1, lon: 2 }, undefined, cb, cb);
    expect(nomes(eventos)).toEqual(['ui-clique-sequencial']);
    expect(eventos[0].detail).toMatchObject({ id: 5, coordenadas: { lat: 1, lon: 2 } });
    expect(ctx.fecharPopup).toHaveBeenCalled();
    expect(cb).not.toHaveBeenCalled();
  });

  it('deriva coordenadas de lat/lng/latitude/longitude do elemento e cai para 0,0 sem elemento', () => {
    const a = criarCtx({ modoSequencial: true });
    tratarCliqueMarcador(a.ctx, 1, false, { latitude: '3', lng: '4' }, undefined);
    expect(a.eventos[0].detail.coordenadas).toEqual({ lat: 3, lon: 4 });

    const b = criarCtx({ modoSequencial: true });
    tratarCliqueMarcador(b.ctx, 2, false, undefined, undefined);
    expect(b.eventos[0].detail.coordenadas).toEqual({ lat: 0, lon: 0 });
    expect(b.eventos[0].detail.elemento).toEqual({ id: 2, lat: 0, lon: 0 });
  });

  it('modo normal: converte id numérico em número para o callback customizado e emite os dois eventos', () => {
    const { ctx, eventos } = criarCtx();
    const custom = vi.fn();
    const anterior = vi.fn();
    tratarCliqueMarcador(ctx, '12', true, { id: '12', lat: 1, lon: 2 }, undefined, anterior, custom);
    expect(custom).toHaveBeenCalledWith(12, true);
    expect(anterior).toHaveBeenCalledWith('12', true, { id: '12', lat: 1, lon: 2 }, { lat: 1, lon: 2 });
    expect(nomes(eventos)).toEqual(['ui-ponto-selecionado', 'ui-elemento-selecionado']);
    expect(eventos[0].detail).toEqual({ selectedIds: ['12'], lastSelectedId: '12', isVizinho: true });
    expect(eventos[1].detail.tipo).toBe('vizinho');
  });

  it('mantém id não numérico como string e usa tipo "vertice" para não vizinhos', () => {
    const { ctx, eventos } = criarCtx();
    const custom = vi.fn();
    tratarCliqueMarcador(ctx, 'abc', false, { id: 'abc' }, undefined, undefined, custom);
    expect(custom).toHaveBeenCalledWith('abc', false);
    expect(eventos[1].detail.tipo).toBe('vertice');
  });

  it('isola erros dos callbacks (console.error) e segue emitindo os eventos', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { ctx, eventos } = criarCtx();
    const falha = () => { throw new Error('boom'); };
    tratarCliqueMarcador(ctx, 1, false, {}, undefined, falha, falha);
    expect(erro).toHaveBeenCalledTimes(2);
    expect(nomes(eventos)).toEqual(['ui-ponto-selecionado', 'ui-elemento-selecionado']);
    erro.mockRestore();
  });

  it('desseleciona o segmento ativo ao clicar em um marcador', () => {
    const { ctx, controller } = criarCtx();
    controller.context.selectedSegmentoId = 'seg-1';
    tratarCliqueMarcador(ctx, 1, false, {}, undefined);
    expect(controller.selectSegmento).toHaveBeenCalledWith(null);
  });
});

describe('tratarCliqueSegmento', () => {
  it('modo sequencial: só fecha o popup, sem eventos nem seleção', () => {
    const { ctx, eventos, controller } = criarCtx({ modoSequencial: true });
    tratarCliqueSegmento(ctx, 's1', {});
    expect(ctx.fecharPopup).toHaveBeenCalled();
    expect(eventos).toHaveLength(0);
    expect(controller.selectSegmento).not.toHaveBeenCalled();
  });

  it('limpa a seleção de pontos, seleciona o segmento e emite os eventos', () => {
    const { ctx, eventos, controller } = criarCtx();
    const segmento = { ponto_inicio_id: 1, ponto_fim_id: 2 };
    const custom = vi.fn();
    tratarCliqueSegmento(ctx, 's1', segmento, { lat: 1, lon: 2 }, custom);

    const inter = controller.canvasInteracao.ctx;
    expect(inter.selectedPontoIds).toEqual([]);
    expect(inter.selectedVizinhoPontoIds).toEqual([]);
    expect(inter.lastSelectedPontoId).toBeNull();
    expect(controller.context.selectedPontoIds).toEqual([]);
    expect(controller.atualizarDestaqueMarcadores).toHaveBeenCalled();
    expect(controller.selectSegmento).toHaveBeenCalledWith('s1');
    expect(custom).toHaveBeenCalledWith('s1', segmento);

    expect(nomes(eventos)).toEqual(['ui-segmento-selecionado', 'ui-elemento-selecionado']);
    expect(eventos[0].detail).toMatchObject({ segmentoId: 's1', pontoInicioId: 1, pontoFimId: 2, coordenadas: { lat: 1, lon: 2 } });
    expect(eventos[1].detail).toMatchObject({ id: 's1', tipo: 'segmento' });
  });

  it('isola erro do callback customizado', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { ctx, eventos } = criarCtx();
    tratarCliqueSegmento(ctx, 's1', {}, undefined, () => { throw new Error('x'); });
    expect(erro).toHaveBeenCalled();
    expect(eventos).toHaveLength(2);
    erro.mockRestore();
  });
});
