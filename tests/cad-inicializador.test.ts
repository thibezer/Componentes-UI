/**
 * Testes de caracterização de cad-inicializador.ts (lacuna restante da Fase 0 do plano de lapidação).
 */
import { describe, it, expect, vi } from 'vitest';
import { inicializarCAD } from '../src/components/ui-canvas-cad/cad-inicializador';

function criarCtx(atributos: Record<string, string> = {}, mapaPresente = true) {
  const host: any = document.createElement('div');
  Object.entries(atributos).forEach(([k, v]) => host.setAttribute(k, v));
  host.zonaProjecao = 23;
  const mapContainer = document.createElement('div');
  (mapContainer as any)._leaflet_id = 99;

  const manipuladores: Record<string, (e: any) => void> = {};
  const mapa: any = { on: vi.fn((tipo: string, fn: (e: any) => void) => { manipuladores[tipo] = fn; }) };
  let aoMudarCamadas: (l: unknown[]) => void = () => {};
  const controller: any = {
    getMap: vi.fn(() => (mapaPresente ? mapa : null)),
    init: vi.fn(),
    modoCliqueSequencialAtivo: false,
    zonaProjecao: 22,
    context: { modoSequencial: false, zonaProjecao: 22, onMarkerClick: undefined as any, onSegmentoClick: undefined as any, onPopupAcao: undefined as any },
    core: { config: { crosshair: false } },
    layerManager: { onChange: vi.fn((fn: (l: unknown[]) => void) => { aoMudarCamadas = fn; }) }
  };
  const toolbarPainel: any = { vincularEventos: vi.fn(), houveMovimentoMouse: false };
  const colecoesDados: any = { sincronizarInicial: vi.fn(), customMarkerClickHandler: undefined };
  const ctx: any = {
    host,
    shadow: host.attachShadow({ mode: 'open' }),
    mapContainer,
    controller,
    toolbarPainel,
    colecoesDados,
    obterContextoEventos: vi.fn(() => ({ host, controller, mapContainer, modoSequencial: false, mouseMovedSinceDown: false, obterElementoPorId: () => undefined, fecharPopup: () => {} })),
    renderLayersUI: vi.fn(),
    invalidateSizeSafely: vi.fn(),
    tratarCliqueLivreCanvas: vi.fn(),
    dispararAcaoPopup: vi.fn()
  };
  return { ctx, host, mapContainer, controller, toolbarPainel, colecoesDados, mapa, manipuladores, disparaCamadas: (l: unknown[]) => aoMudarCamadas(l) };
}

describe('inicializarCAD', () => {
  it('sem contêiner de mapa não faz nada', () => {
    const { ctx, controller } = criarCtx();
    ctx.mapContainer = null;
    expect(() => inicializarCAD(ctx)).not.toThrow();
    expect(controller.init).not.toHaveBeenCalled();
  });

  it('inicia o controller, vincula a barra, desenha as camadas e sincroniza as coleções', () => {
    const { ctx, controller, toolbarPainel, colecoesDados, mapContainer } = criarCtx();
    inicializarCAD(ctx);
    expect(controller.init).toHaveBeenCalledWith(mapContainer, ctx.shadow);
    expect(toolbarPainel.vincularEventos).toHaveBeenCalledTimes(1);
    expect(ctx.renderLayersUI).toHaveBeenCalled();
    expect(colecoesDados.sincronizarInicial).toHaveBeenCalledTimes(1);
  });

  it('libera a marca _leaflet_id do contêiner quando não há mapa vivo; com mapa vivo, preserva', () => {
    const a = criarCtx({}, false);
    inicializarCAD(a.ctx);
    expect((a.mapContainer as any)._leaflet_id).toBeUndefined();
    const b = criarCtx({}, true);
    inicializarCAD(b.ctx);
    expect((b.mapContainer as any)._leaflet_id).toBe(99);
  });

  it('aplica os atributos declarados: modo-sequencial, chave-grupo, zona-projecao e crosshair', () => {
    const { ctx, controller, host, mapContainer } = criarCtx({ 'modo-sequencial': '', 'chave-grupo': 'g1', 'zona-projecao': '23', crosshair: '' });
    inicializarCAD(ctx);
    expect(controller.modoCliqueSequencialAtivo).toBe(true);
    expect(controller.context.modoSequencial).toBe(true);
    expect(host.chaveGrupo).toBe('g1');
    expect(controller.zonaProjecao).toBe(23);
    expect(controller.context.zonaProjecao).toBe(23);
    expect(controller.core.config.crosshair).toBe(true);
    expect(mapContainer.style.cursor).toBe('crosshair');
  });

  it('crosshair="false" desliga a mira', () => {
    const { ctx, controller, mapContainer } = criarCtx({ crosshair: 'false' });
    inicializarCAD(ctx);
    expect(controller.core.config.crosshair).toBe(false);
    expect(mapContainer.style.cursor).toBe('');
  });

  it('sem atributos, não altera modo sequencial, zona nem mira', () => {
    const { ctx, controller } = criarCtx();
    inicializarCAD(ctx);
    expect(controller.modoCliqueSequencialAtivo).toBe(false);
    expect(controller.zonaProjecao).toBe(22);
    expect(controller.core.config.crosshair).toBe(false);
  });

  it('mudanças nas camadas redesenham a lista e emitem ui-camadas-alteradas com bubbles/composed', () => {
    const { ctx, host, disparaCamadas } = criarCtx();
    inicializarCAD(ctx);
    const ouvinte = vi.fn();
    host.addEventListener('ui-camadas-alteradas', ouvinte);
    const antes = ctx.renderLayersUI.mock.calls.length;
    disparaCamadas([{ id: 'a' }]);
    expect(ctx.renderLayersUI.mock.calls.length).toBe(antes + 1);
    const ev = ouvinte.mock.calls[0][0] as CustomEvent;
    expect(ev.detail).toEqual({ layers: [{ id: 'a' }] });
    expect(ev.bubbles && ev.composed).toBe(true);
  });

  it('liga os ganchos do controller: clique de marcador, de segmento e de ação do popup', () => {
    const { ctx, controller, host } = criarCtx();
    const anterior = vi.fn();
    controller.context.onMarkerClick = anterior;
    inicializarCAD(ctx);
    expect(controller.context.onMarkerClick).not.toBe(anterior);

    const selecionado = vi.fn();
    host.addEventListener('ui-elemento-selecionado', selecionado);
    controller.context.onMarkerClick(7, false, { id: 7 }, { lat: 1, lon: 2 });
    expect(anterior).toHaveBeenCalledWith(7, false, { id: 7 }, { lat: 1, lon: 2 });
    expect(selecionado).toHaveBeenCalledTimes(1);

    controller.context.onPopupAcao('editar', 7, { id: 7 });
    expect(ctx.dispararAcaoPopup).toHaveBeenCalledWith('editar', 7, { id: 7 });
    expect(typeof controller.context.onSegmentoClick).toBe('function');
  });

  it('clique no mapa vira clique livre, exceto logo após um arraste (pan)', () => {
    const { ctx, manipuladores, toolbarPainel } = criarCtx();
    inicializarCAD(ctx);
    const e = { latlng: { lat: 1, lng: 2 }, containerPoint: { x: 3, y: 4 } };
    manipuladores.click(e);
    expect(ctx.tratarCliqueLivreCanvas).toHaveBeenCalledWith(e, e.latlng, e.containerPoint);
    toolbarPainel.houveMovimentoMouse = true;
    manipuladores.click(e);
    expect(ctx.tratarCliqueLivreCanvas).toHaveBeenCalledTimes(1);
  });

  it('sem mapa criado não registra clique e não lança', () => {
    const { ctx, mapa } = criarCtx({}, false);
    expect(() => inicializarCAD(ctx)).not.toThrow();
    expect(mapa.on).not.toHaveBeenCalled();
  });

  it('reavalia o tamanho depois de 150 ms (layout assentado)', () => {
    vi.useFakeTimers();
    const { ctx } = criarCtx();
    inicializarCAD(ctx);
    expect(ctx.invalidateSizeSafely).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(ctx.invalidateSizeSafely).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
