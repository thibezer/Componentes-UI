import { describe, it, expect, afterEach } from 'vitest';
import '../src/index';
import '../src/components/ui-canvas-cad';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { lerModoRenderizador } from '../src/gerencigeo-canvas/renderers/feicoes_despachante';

/*
 * Atributo/propriedade `renderizador` do <ui-canvas-cad>: escolhe o caminho de desenho das feições (`leaflet` padrão,
 * `canvas` opt-in) sem mudar API, eventos nem dados. Camada B: ciclo de vida do componente.
 */

afterEach(() => { document.body.innerHTML = ''; });

const quad = (id: string, lon = -46.6) => ({
  id, geometria: { tipo: 'Polygon', aneis: [[[-23.5, lon], [-23.5, lon + 0.001], [-23.499, lon + 0.001], [-23.499, lon]]] }
});
const esperar = () => new Promise<void>((r) => setTimeout(r, 60));

function criar(atributo?: string): UICanvasCAD {
  const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
  if (atributo !== undefined) el.setAttribute('renderizador', atributo);
  el.setAttribute('sem-camadas-padrao', '');
  document.body.appendChild(el);
  const map = el.inicializarAgora()!;
  map.setView([-23.5, -46.6], 16, { animate: false });
  return el;
}

describe('<ui-canvas-cad renderizador>', () => {
  it('lerModoRenderizador: só "canvas" liga o caminho novo; qualquer outro valor é leaflet', () => {
    expect(lerModoRenderizador('canvas')).toBe('canvas');
    expect(lerModoRenderizador(' CANVAS ')).toBe('canvas');
    for (const v of ['leaflet', 'webgl', '', null, undefined, '1', 'true']) expect(lerModoRenderizador(v as string)).toBe('leaflet');
  });

  it('padrão é leaflet; a propriedade lê e grava o atributo; valor inválido cai em leaflet', () => {
    const el = criar();
    expect(el.renderizador).toBe('leaflet');
    el.renderizador = 'canvas';
    expect(el.getAttribute('renderizador')).toBe('canvas');
    expect(el.renderizador).toBe('canvas');
    el.setAttribute('renderizador', 'xpto');
    expect(el.renderizador).toBe('leaflet');
  });

  it('com o atributo na criação a camada nasce no caminho canvas e estatisticasFeicoes diz qual desenha', async () => {
    const el = criar('canvas');
    el.definirFeicoes('g', [quad('a'), quad('b', -46.598)]);
    await esperar();
    expect(el.estatisticasFeicoes('g')).toMatchObject({ total: 2, renderizador: 'canvas', canvases: 2 });
    expect(el.estatisticasFeicoes('nao-existe')).toBeNull();
  });

  it('mudar o atributo em execução recria as camadas de feições no caminho novo e mantém dados e seleção', async () => {
    const el = criar();
    el.definirFeicoes('g', [quad('a'), quad('b', -46.598)]);
    el.selecionarFeicoes([{ camadaId: 'g', id: 'a' }]);
    expect(el.estatisticasFeicoes('g')!.renderizador).toBe('leaflet');
    el.setAttribute('renderizador', 'canvas');
    await esperar();
    expect(el.estatisticasFeicoes('g')).toMatchObject({ total: 2, renderizador: 'canvas' });
    expect(el.obterFeicoes('g').map((f) => f.id).sort()).toEqual(['a', 'b']);
    el.setAttribute('renderizador', 'leaflet');
    await esperar();
    expect(el.estatisticasFeicoes('g')).toMatchObject({ total: 2, renderizador: 'leaflet' });
  });

  it('a API de feições funciona igual no caminho canvas (lote, seleção, popup, snap, ajustar)', async () => {
    const el = criar('canvas');
    el.definirFeicoes('g', [quad('a')]);
    const r = el.aplicarLote('g', { adicionar: [quad('b', -46.598)], remover: ['a'] });
    expect(r).toMatchObject({ adicionadas: 1, removidas: 1 });
    el.selecionarFeicoes([{ camadaId: 'g', id: 'b' }]);
    el.alternarSelecaoFeicao('g', 'b');
    el.limparSelecaoFeicoes();
    expect(el.ajustarCamada('g')).toBe(true);
    await esperar();
    expect(el.abrirPopupFeicao('g', 'b')).toBeTypeOf('boolean');
    expect(() => el.destroy()).not.toThrow();
  });

  it('reconectar o componente não duplica canvases nem ouvintes', async () => {
    const el = criar('canvas');
    el.definirFeicoes('g', [quad('a')]);
    await esperar();
    const mapa = el.getMap()!;
    const contar = () => mapa.getPane('pane-g')?.querySelectorAll('canvas').length ?? 0;
    expect(contar()).toBe(1);
    el.definirFeicoes('g', [quad('a'), quad('b', -46.598)]);
    await esperar();
    expect(contar()).toBe(1);
  });
});
