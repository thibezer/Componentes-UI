/**
 * Testes de caracterização de cad-atributos-sync.ts e cad-tamanho-observer.ts (Fase 0 do plano de lapidação).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { sincronizarAtributoCAD } from '../src/components/ui-canvas-cad/cad-atributos-sync';
import { criarControladorTamanho } from '../src/components/ui-canvas-cad/cad-tamanho-observer';

function criarCtx() {
  const host: any = document.createElement('div');
  const mapContainer = document.createElement('div');
  const containerMapa = document.createElement('div');
  const controller: any = {
    zonaProjecao: 22,
    context: { zonaProjecao: 22 },
    core: { config: { crosshair: false } },
    getMap: () => ({ getContainer: () => containerMapa })
  };
  const ctx: any = {
    host, controller, mapContainer,
    broadcastConfig: { conectar: vi.fn() },
    setLayerOpacity: vi.fn(),
    setLayerScaleMode: vi.fn(),
    atualizarZonaProjecao: vi.fn()
  };
  return { ctx, host, controller, mapContainer, containerMapa };
}

describe('sincronizarAtributoCAD', () => {
  it('ignora quando o valor não mudou', () => {
    const { ctx } = criarCtx();
    sincronizarAtributoCAD(ctx, 'sat-opacity', '0.5', '0.5');
    expect(ctx.setLayerOpacity).not.toHaveBeenCalled();
  });

  it('sat-opacity aplica na camada "satelite" e ignora valor inválido', () => {
    const { ctx } = criarCtx();
    sincronizarAtributoCAD(ctx, 'sat-opacity', '1', '0.4');
    expect(ctx.setLayerOpacity).toHaveBeenCalledWith('satelite', 0.4);
    sincronizarAtributoCAD(ctx, 'sat-opacity', '0.4', 'abc');
    expect(ctx.setLayerOpacity).toHaveBeenCalledTimes(1);
  });

  it('scale-mode só aceita "world" e "screen" e afeta perímetro e vértices', () => {
    const { ctx } = criarCtx();
    sincronizarAtributoCAD(ctx, 'scale-mode', '', 'world');
    expect(ctx.setLayerScaleMode).toHaveBeenCalledWith('perimetro', 'world');
    expect(ctx.setLayerScaleMode).toHaveBeenCalledWith('vertices', 'world');
    sincronizarAtributoCAD(ctx, 'scale-mode', 'world', 'outro');
    expect(ctx.setLayerScaleMode).toHaveBeenCalledTimes(2);
  });

  it('modo-sequencial: presença liga, "false" e remoção desligam', () => {
    const { ctx, host } = criarCtx();
    sincronizarAtributoCAD(ctx, 'modo-sequencial', null as any, '');
    expect(host.modoSequencial).toBe(true);
    sincronizarAtributoCAD(ctx, 'modo-sequencial', '', 'false');
    expect(host.modoSequencial).toBe(false);
    sincronizarAtributoCAD(ctx, 'modo-sequencial', 'false', null as any);
    expect(host.modoSequencial).toBe(false);
  });

  it('chave-grupo: vazio vira undefined', () => {
    const { ctx, host } = criarCtx();
    sincronizarAtributoCAD(ctx, 'chave-grupo', null as any, 'g1');
    expect(host.chaveGrupo).toBe('g1');
    sincronizarAtributoCAD(ctx, 'chave-grupo', 'g1', '');
    expect(host.chaveGrupo).toBeUndefined();
  });

  it('zona-projecao atualiza controller e contexto; valores inválidos ou <= 0 são ignorados', () => {
    const { ctx, controller } = criarCtx();
    sincronizarAtributoCAD(ctx, 'zona-projecao', null as any, '23');
    expect(ctx.atualizarZonaProjecao).toHaveBeenCalledWith(23);
    expect(controller.zonaProjecao).toBe(23);
    expect(controller.context.zonaProjecao).toBe(23);
    sincronizarAtributoCAD(ctx, 'zona-projecao', '23', '0');
    sincronizarAtributoCAD(ctx, 'zona-projecao', '0', 'x');
    expect(ctx.atualizarZonaProjecao).toHaveBeenCalledTimes(1);
  });

  it('"fuso" espelha em zona-projecao, e zona-projecao espelha em fuso só se ele existir', () => {
    const a = criarCtx();
    sincronizarAtributoCAD(a.ctx, 'fuso', null as any, '24');
    expect(a.host.getAttribute('zona-projecao')).toBe('24');

    const b = criarCtx();
    sincronizarAtributoCAD(b.ctx, 'zona-projecao', null as any, '25');
    expect(b.host.hasAttribute('fuso')).toBe(false);

    const c = criarCtx();
    c.host.setAttribute('fuso', '22');
    sincronizarAtributoCAD(c.ctx, 'zona-projecao', '22', '26');
    expect(c.host.getAttribute('fuso')).toBe('26');
  });

  it('canal-configuracao reconecta o broadcast com o novo canal', () => {
    const { ctx } = criarCtx();
    sincronizarAtributoCAD(ctx, 'canal-configuracao', null as any, 'canal-x');
    expect(ctx.broadcastConfig.conectar).toHaveBeenCalledWith('canal-x');
  });

  it('crosshair altera cursor do container, do mapa e a config do core', () => {
    const { ctx, controller, mapContainer, containerMapa } = criarCtx();
    sincronizarAtributoCAD(ctx, 'crosshair', null as any, '');
    expect(mapContainer.style.cursor).toBe('crosshair');
    expect(containerMapa.style.cursor).toBe('crosshair');
    expect(controller.core.config.crosshair).toBe(true);
    sincronizarAtributoCAD(ctx, 'crosshair', '', 'false');
    expect(mapContainer.style.cursor).toBe('');
    expect(controller.core.config.crosshair).toBe(false);
  });
});

describe('criarControladorTamanho', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  function montar(mapa: any) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const controller: any = { getMap: () => mapa, invalidateSize: vi.fn() };
    return { host, controller, ctl: criarControladorTamanho(host, controller) };
  }

  it('invalidateSizeSafely chama o controller quando o mapa está montado', () => {
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    const { controller, ctl } = montar({ getContainer: () => cont });
    ctl.invalidateSizeSafely();
    expect(controller.invalidateSize).toHaveBeenCalledTimes(1);
  });

  it('não chama sem mapa, com host desconectado ou com container sem pai', () => {
    const a = montar(null);
    a.ctl.invalidateSizeSafely();
    expect(a.controller.invalidateSize).not.toHaveBeenCalled();

    const b = montar({ getContainer: () => document.createElement('div') });
    b.ctl.invalidateSizeSafely();
    expect(b.controller.invalidateSize).not.toHaveBeenCalled();

    const cont = document.createElement('div');
    document.body.appendChild(cont);
    const c = montar({ getContainer: () => cont });
    c.host.remove();
    c.ctl.invalidateSizeSafely();
    expect(c.controller.invalidateSize).not.toHaveBeenCalled();
  });

  it('absorve exceções do Leaflet (panes desanexados)', () => {
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    const { controller, ctl } = montar({ getContainer: () => cont });
    controller.invalidateSize.mockImplementation(() => { throw new TypeError('undefined._leaflet_pos'); });
    expect(() => ctl.invalidateSizeSafely()).not.toThrow();
  });

  it('observe: debounce de 25 ms e só reage a variações >= 0,5 px', () => {
    vi.useFakeTimers();
    let callback: (entries: any[]) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: any) { callback = cb; }
      observe() {}
      disconnect = disconnect;
    });
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    const { controller, ctl } = montar({ getContainer: () => cont });
    ctl.observe();

    const entrada = (w: number, h: number) => [{ contentRect: { width: w, height: h } }];
    callback(entrada(100, 100));
    callback(entrada(100.2, 100));
    callback(entrada(0, 0));
    expect(controller.invalidateSize).not.toHaveBeenCalled();
    vi.advanceTimersByTime(25);
    expect(controller.invalidateSize).toHaveBeenCalledTimes(1);

    callback(entrada(100.2, 100));
    vi.advanceTimersByTime(30);
    expect(controller.invalidateSize).toHaveBeenCalledTimes(1);
    callback(entrada(200, 100));
    vi.advanceTimersByTime(30);
    expect(controller.invalidateSize).toHaveBeenCalledTimes(2);

    ctl.disconnect();
    expect(disconnect).toHaveBeenCalled();
  });
});
