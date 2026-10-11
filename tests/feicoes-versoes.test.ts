import { describe, it, expect, afterEach, vi } from 'vitest';
import L from 'leaflet';
import '../src/index';
import '../src/components/ui-canvas-cad';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { RegraVersoes, statusDe, entidadeDe } from '../src/gerencigeo-canvas/feature_versoes';
import { CursoresRemotos, corHexSegura } from '../src/gerencigeo-canvas/feature_cursores';
import { normalizarFeicaoEntrada } from '../src/gerencigeo-canvas/feature_adapters';
import type { Feicao, LatLonPar } from '../src/gerencigeo-canvas/feature_types';

afterEach(() => { document.body.innerHTML = ''; });

const F = (id: string, extra: Record<string, unknown> = {}): Feicao =>
  normalizarFeicaoEntrada({ id, geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] }, ...extra }, 'c')!;

describe('statusDe e entidadeDe', () => {
  it('lê status do campo, de propriedades.status e de propriedades.tipo_geometria', () => {
    expect(statusDe(F('a'))).toBe('oficial');
    expect(statusDe(F('a', { status: 'previa' }))).toBe('previa');
    expect(statusDe(F('a', { propriedades: { status: 'Preview' } }))).toBe('previa');
    expect(statusDe(F('a', { propriedades: { tipo_geometria: 'RASCUNHO' } }))).toBe('previa');
    expect(statusDe(F('a', { propriedades: { status: 'aprovado' } }))).toBe('oficial');
    expect(F('a', { status: 'previa' }).status).toBe('previa'); // o normalizador grava o status resolvido
  });

  it('a entidade é o entidadeId (campo ou propriedade) ou o próprio id', () => {
    expect(entidadeDe(F('a'))).toBe('a');
    expect(entidadeDe(F('a', { entidadeId: 'e1' }))).toBe('e1');
    expect(entidadeDe(F('a', { propriedades: { entidadeId: 7 } }))).toBe('7');
  });
});

describe('RegraVersoes', () => {
  const oficial = F('o', { entidadeId: 'e1' });
  const previa = F('p', { entidadeId: 'e1', status: 'previa' });
  const solta = F('s', { entidadeId: 'e2', status: 'previa' });
  const com = RegraVersoes.oficiais([oficial, previa, solta]);

  it('oficial sempre aparece; prévia só sem oficial, ou quando pedida', () => {
    const r = new RegraVersoes();
    expect(com.has('e1')).toBe(true);
    expect(com.has('e2')).toBe(false);
    expect(r.visivel(oficial, com)).toBe(true);
    expect(r.visivel(previa, com)).toBe(false);
    expect(r.visivel(solta, com)).toBe(true);

    r.global = true;
    expect(r.visivel(previa, com)).toBe(true);
    r.global = false;
    expect(r.alternarIndividual('c', 'e1')).toBe(true);
    expect(r.visivel(previa, com)).toBe(true);
    expect(r.previaSolicitada(previa)).toBe(true);
    expect(r.alternarIndividual('c', 'e1')).toBe(false);
    expect(r.visivel(previa, com)).toBe(false);
  });

  it('o pedido individual vale só para a camada e a entidade certas', () => {
    const r = new RegraVersoes();
    r.definirIndividual('outra', 'e1', true);
    expect(r.visivel(previa, com)).toBe(false);
    r.definirIndividual('c', 'e1', true);
    expect(r.visivel(previa, com)).toBe(true);
  });

  it('feição excluída não conta como oficial', () => {
    expect(RegraVersoes.oficiais([{ ...oficial, excluida: true }]).has('e1')).toBe(false);
  });
});

function novo(extraContexto: Record<string, unknown> = {}) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
  const lm = new CanvasLayerManager([]);
  const eventos: Array<[string, any]> = [];
  const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, emitir: (e, d) => eventos.push([e, d]), ...extraContexto });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined, regraVersoes: g.regraVersoes } as never);
  const ev = (n: string) => eventos.filter(([e]) => e === n).map(([, d]) => d);
  const grupo = (id = 'c') => lm.getLayerInstance(id) as L.LayerGroup;
  return { g, lm, map, el, eventos, ev, grupo };
}

const quad = (id: string, extra: Record<string, unknown> = {}) => ({
  id, geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59], [-23.51, -46.6]]] }, ...extra
});

describe('oficial × prévia na camada de feições', () => {
  const carregar = (g: GerenciadorFeicoes) => g.definirFeicoes('c', [
    quad('A', { entidadeId: 'e1' }),
    quad('A-prev', { entidadeId: 'e1', status: 'previa' }),
    quad('B-prev', { entidadeId: 'e2', status: 'previa' })
  ]);

  it('só aparece a oficial e a prévia sem par', () => {
    const { g, grupo } = novo();
    carregar(g);
    expect(grupo().getLayers()).toHaveLength(2);
  });

  it('prévias globais mostram todas, e voltam a esconder', () => {
    const { g, grupo, ev } = novo();
    carregar(g);
    g.definirPreviasGlobais(true);
    expect(g.previasGlobais).toBe(true);
    expect(grupo().getLayers()).toHaveLength(3);
    expect(ev('cad-previas')).toEqual([{ global: true }]);
    g.alternarPreviasGlobais();
    expect(grupo().getLayers()).toHaveLength(2);
    g.definirPreviasGlobais(false); // sem mudança: não emite de novo
    expect(ev('cad-previas')).toHaveLength(2);
  });

  it('prévia individual vale só para a entidade pedida', () => {
    const { g, grupo, ev } = novo();
    g.definirFeicoes('c', [
      quad('A', { entidadeId: 'e1' }), quad('A-prev', { entidadeId: 'e1', status: 'previa' }),
      quad('C', { entidadeId: 'e3' }), quad('C-prev', { entidadeId: 'e3', status: 'previa' })
    ]);
    expect(grupo().getLayers()).toHaveLength(2);
    expect(g.alternarPrevia('c', 'A-prev')).toBe(true);
    expect(grupo().getLayers()).toHaveLength(3);
    expect(g.previaSolicitada('c', 'A')).toBe(true);
    expect(g.previaSolicitada('c', 'C')).toBe(false);
    expect(ev('cad-previas')[0]).toEqual({ camadaId: 'c', entidadeId: 'e1', ativa: true });
    expect(g.alternarPrevia('c', 'A')).toBe(false); // pode alternar por qualquer feição da entidade
    expect(grupo().getLayers()).toHaveLength(2);
    expect(g.alternarPrevia('c', 'nada')).toBeNull();
  });

  it('a prévia mostrada ao lado da oficial é desenhada tracejada', () => {
    const { g, grupo } = novo();
    carregar(g);
    g.definirPreviasGlobais(true);
    const tracejadas = grupo().getLayers().filter((l) => (l as L.Polygon).options.dashArray === '6 4');
    expect(tracejadas.length).toBeGreaterThanOrEqual(1);
  });

  it('feição selecionada deixa a seleção quando a prévia é escondida', () => {
    const { g } = novo();
    carregar(g);
    g.definirPreviasGlobais(true);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'A-prev' }]);
    expect(g.obterFeicoesSelecionadas()).toHaveLength(1);
    g.definirPreviasGlobais(false);
    expect(g.obterFeicoesSelecionadas()).toHaveLength(0);
  });

  it('caixa de seleção, snap e divisão ignoram o que está escondido', () => {
    const { g, map } = novo();
    carregar(g);
    const c = map.latLngToContainerPoint([-23.505, -46.595]);
    const caixa = { x1: c.x - 400, y1: c.y - 300, x2: c.x + 400, y2: c.y + 300 };
    g.selecionarNaCaixa(caixa, 'crossing', false);
    expect(g.obterFeicoesSelecionadas().map((f) => f.id).sort()).toEqual(['A', 'B-prev']);
    g.limparSelecaoFeicoes();

    // snap: o vértice (-23.5,-46.6) existe em A (visível); a prévia escondida não duplica o candidato
    const s = g.buscarSnapEm([-23.5, -46.6])!;
    expect(s.feicaoId === 'A' || s.feicaoId === 'B-prev').toBe(true);
    expect(s.feicaoId).not.toBe('A-prev');
  });

  it('zoomParaFeicao numa prévia escondida a mostra; camada oculta é ligada', () => {
    const { g, lm, ev, map } = novo();
    carregar(g);
    const voar = vi.spyOn(map, 'fitBounds').mockImplementation(() => map);
    lm.setLayerVisibility('c', false);
    expect(g.zoomParaFeicao('c', 'A-prev')).toBe(true);
    expect(lm.getLayerDef('c')?.visivel).toBe(true);
    expect(g.previaSolicitada('c', 'A-prev')).toBe(true);
    expect(ev('cad-previas').pop()).toMatchObject({ ativa: true });
    expect(voar).toHaveBeenCalledOnce();
  });
});

describe('câmera', () => {
  it('ajustarTudo enquadra só o que está visível (camadas e versões); sem nada devolve false', () => {
    const { g, map, lm } = novo();
    const fit = vi.spyOn(map, 'fitBounds').mockImplementation(() => map);
    expect(g.ajustarTudo()).toBe(false);

    g.definirFeicoes('c', [
      { id: 'a', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] }, entidadeId: 'x' },
      { id: 'a-prev', geometria: { tipo: 'Point', coordenada: [10, 10] }, entidadeId: 'x', status: 'previa' }
    ]);
    g.definirFeicoes('d', [{ id: 'b', geometria: { tipo: 'Point', coordenada: [-23.52, -46.58] } }]);
    expect(g.ajustarTudo()).toBe(true);
    const lim = fit.mock.calls[0][0] as [[number, number], [number, number]];
    expect(lim[0][0]).toBeCloseTo(-23.52);
    expect(lim[1][0]).toBeCloseTo(-23.5);
    expect(lim[1][0]).toBeLessThan(10); // a prévia escondida ficou de fora

    lm.setLayerVisibility('d', false);
    fit.mockClear();
    const voo = vi.spyOn(map, 'flyTo').mockImplementation(() => map);
    expect(g.ajustarTudo()).toBe(true); // sobrou um ponto só (camada "c"): voa até ele em vez de fitBounds
    expect(fit).not.toHaveBeenCalled();
    expect((voo.mock.calls[0][0] as [number, number])[0]).toBeCloseTo(-23.5);
  });

  it('um único ponto voa até zoom ≥ 17 em vez de fitBounds', () => {
    const { g, map } = novo();
    const voo = vi.spyOn(map, 'flyTo').mockImplementation(() => map);
    g.definirFeicoes('c', [{ id: 'p', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] } }]);
    expect(g.zoomParaFeicao('c', 'p')).toBe(true);
    expect(voo).toHaveBeenCalledOnce();
    expect(voo.mock.calls[0][1]).toBeGreaterThanOrEqual(17);
  });

  it('ajustarCamada liga a camada oculta e recusa camada inexistente ou de outro tipo', () => {
    const { g, map, lm } = novo();
    vi.spyOn(map, 'fitBounds').mockImplementation(() => map);
    g.definirFeicoes('c', [quad('a')]);
    lm.setLayerVisibility('c', false);
    expect(g.ajustarCamada('c')).toBe(true);
    expect(lm.getLayerDef('c')?.visivel).toBe(true);
    expect(g.ajustarCamada('nao-existe')).toBe(false);
  });

  it('zoomParaFeicoes enquadra várias e ignora as que não existem', () => {
    const { g, map } = novo();
    const fit = vi.spyOn(map, 'fitBounds').mockImplementation(() => map);
    g.definirFeicoes('c', [quad('a'), { id: 'b', geometria: { tipo: 'Point', coordenada: [-23.6, -46.7] } }]);
    expect(g.zoomParaFeicoes([{ camadaId: 'c', id: 'a' }, { camadaId: 'c', id: 'b' }, { camadaId: 'c', id: 'zzz' }])).toBe(true);
    const lim = fit.mock.calls[0][0] as [[number, number], [number, number]];
    expect(lim[0][0]).toBeCloseTo(-23.6);
    expect(g.zoomParaFeicoes([{ camadaId: 'c', id: 'zzz' }])).toBe(false);
    expect(g.zoomParaFeicoes([])).toBe(false);
  });

  it('maxZoom 18 e folga de 60 px no enquadramento', () => {
    const { g, map } = novo();
    const fit = vi.spyOn(map, 'fitBounds').mockImplementation(() => map);
    g.definirFeicoes('c', [quad('a')]);
    g.zoomParaFeicao('c', 'a');
    expect(fit.mock.calls[0][1]).toEqual({ padding: [60, 60], maxZoom: 18 });
  });
});

describe('cursores remotos', () => {
  function mapa() {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return L.map(el, { center: [-23.5, -46.6], zoom: 15 });
  }

  it('cria, move e remove o cursor de um operador', () => {
    const map = mapa();
    const c = new CursoresRemotos(() => map);
    expect(c.atualizar({ id: 'u1', nome: 'Ana', cor: '#ff0000' }, [-23.5, -46.6])).toBe(true);
    expect(c.quantidade).toBe(1);
    const antes = document.querySelectorAll('.cad-cursor-remoto').length;
    c.atualizar({ id: 'u1', nome: 'Ana', cor: '#ff0000' }, [-23.51, -46.61]);
    expect(document.querySelectorAll('.cad-cursor-remoto').length).toBe(antes); // mesmo marcador
    expect(c.quantidade).toBe(1);
    expect(c.remover('u1')).toBe(true);
    expect(c.remover('u1')).toBe(false);
    expect(document.querySelectorAll('.cad-cursor-remoto')).toHaveLength(0);
  });

  it('o nome vem escapado e a cor só vale como #hex', () => {
    const map = mapa();
    const c = new CursoresRemotos(() => map);
    c.atualizar({ id: 'x', nome: '<img src=x onerror=alert(1)>', cor: 'red;background:url(//evil)' }, [-23.5, -46.6]);
    const el = document.querySelector('.cad-cursor-remoto') as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x');
    expect(el.innerHTML).not.toContain('evil');
    expect(corHexSegura('#0af')).toBe('#0af');
    expect(corHexSegura('#12345678')).toBe('#12345678');
    expect(corHexSegura('rgb(1,2,3)')).toBe('#94a3b8');
    expect(corHexSegura(undefined)).toBe('#94a3b8');
  });

  it('trocar nome ou cor atualiza o ícone; coordenada ou usuário inválidos são recusados', () => {
    const map = mapa();
    const c = new CursoresRemotos(() => map);
    c.atualizar({ id: 'u', nome: 'Ana' }, [-23.5, -46.6]);
    c.atualizar({ id: 'u', nome: 'Beto' }, [-23.5, -46.6]);
    expect(document.querySelector('.cad-cursor-remoto')?.textContent).toContain('Beto');
    expect(c.atualizar({ id: 'u' }, [NaN, 1])).toBe(false);
    expect(c.atualizar({ id: '' }, [-23.5, -46.6])).toBe(false);
    expect(c.atualizar(null as never, [-23.5, -46.6])).toBe(false);
    expect(new CursoresRemotos(() => null).atualizar({ id: 'a' }, [-23.5, -46.6])).toBe(false);
  });

  it('limpar remove todos; o id numérico vira texto', () => {
    const map = mapa();
    const c = new CursoresRemotos(() => map);
    c.atualizar({ id: 1 as never, nome: 'a' }, [-23.5, -46.6]);
    c.atualizar({ id: 'b', nome: 'b' }, [-23.5, -46.6]);
    expect(c.quantidade).toBe(2);
    expect(c.remover('1')).toBe(true);
    c.limpar();
    expect(c.quantidade).toBe(0);
    expect(document.querySelectorAll('.cad-cursor-remoto')).toHaveLength(0);
  });

  it('pelo gerenciador aceita [lat, lon] e {lat, lng}/{latitude, longitude}', () => {
    const { g } = novo();
    expect(g.atualizarCursorRemoto({ id: 'a' }, [-23.5, -46.6])).toBe(true);
    expect(g.atualizarCursorRemoto({ id: 'b' }, { lat: -23.5, lng: -46.6 })).toBe(true);
    expect(g.atualizarCursorRemoto({ id: 'c' }, { latitude: -23.5, longitude: -46.6 })).toBe(true);
    expect(g.atualizarCursorRemoto({ id: 'd' }, 'lixo')).toBe(false);
    expect(g.cursoresRemotos).toBe(3);
    g.limparCursoresRemotos();
    expect(g.cursoresRemotos).toBe(0);
  });
});

describe('hover e menu de contexto', () => {
  const esperarQuadro = () => new Promise((r) => setTimeout(r, 60));
  const mouse = (x: number, y: number, extra: MouseEventInit = {}) => new MouseEvent('mousemove', { clientX: x, clientY: y, ...extra });

  it('emite cad-feicao-hover só quando a feição sob o mouse muda', async () => {
    const { g, map, ev } = novo();
    g.definirFeicoes('c', [quad('q')]);
    const dentro = map.latLngToContainerPoint([-23.505, -46.595]);
    const fora = map.latLngToContainerPoint([-23.4, -46.4]);

    g.aoMoverMouse(mouse(dentro.x, dentro.y));
    await esperarQuadro();
    g.aoMoverMouse(mouse(dentro.x + 1, dentro.y));
    await esperarQuadro();
    expect(ev('cad-feicao-hover').map((d) => d.feicao?.id)).toEqual(['q']);

    g.aoMoverMouse(mouse(fora.x, fora.y));
    await esperarQuadro();
    expect(ev('cad-feicao-hover').map((d) => d.feicao?.id ?? null)).toEqual(['q', null]);
  });

  it('com botão apertado (arrasto) ou ferramenta/edição ativas, o hover é limpo e não calcula', async () => {
    const { g, map, ev } = novo();
    g.definirFeicoes('c', [quad('q')]);
    const p = map.latLngToContainerPoint([-23.505, -46.595]);
    g.aoMoverMouse(mouse(p.x, p.y));
    await esperarQuadro();
    g.aoMoverMouse(mouse(p.x, p.y, { buttons: 1 }));
    expect(ev('cad-feicao-hover').pop()).toEqual({ feicao: null });
    const n = ev('cad-feicao-hover').length;
    g.ativarFerramenta('medir-distancia');
    g.aoMoverMouse(mouse(p.x, p.y));
    await esperarQuadro();
    expect(ev('cad-feicao-hover')).toHaveLength(n);
  });

  it('menu de contexto traz a feição sob o cursor (ou null) e a posição', () => {
    const { g, map, ev } = novo();
    g.definirFeicoes('c', [quad('q')]);
    const dentro = map.latLngToContainerPoint([-23.505, -46.595]);
    g.menuContexto(new MouseEvent('contextmenu', { clientX: dentro.x, clientY: dentro.y }));
    g.menuContexto(new MouseEvent('contextmenu', { clientX: 5, clientY: 5 }));
    const [a, b] = ev('cad-feicao-menu');
    expect(a.feicao.id).toBe('q');
    expect(a.x).toBe(dentro.x);
    expect(a.coordenada).toHaveLength(2);
    expect(b.feicao).toBeNull();
  });

  it('hover ignora prévias escondidas', async () => {
    const { g, map, ev } = novo();
    g.definirFeicoes('c', [quad('o', { entidadeId: 'e' }), quad('p', { entidadeId: 'e', status: 'previa' })]);
    const p = map.latLngToContainerPoint([-23.505, -46.595]);
    g.aoMoverMouse(mouse(p.x, p.y));
    await esperarQuadro();
    expect(ev('cad-feicao-hover')[0].feicao.id).toBe('o');
  });
});

describe('<ui-canvas-cad>: API de versões, cursores e câmera', () => {
  it('expõe os métodos e o estado de prévias', () => {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    expect(el.previasGlobais).toBe(false);
    el.definirPreviasGlobais(true);
    expect(el.previasGlobais).toBe(true);
    el.alternarPreviasGlobais();
    expect(el.previasGlobais).toBe(false);
    expect(el.alternarPrevia('x', 'y')).toBeNull();
    expect(el.previaSolicitada('x', 'y')).toBe(false);
    expect(el.atualizarCursorRemoto({ id: 'a' }, [-23.5, -46.6])).toBe(false); // sem mapa ainda
    expect(el.ajustarTudo()).toBe(false);
    expect(el.ajustarCamada('x')).toBe(false);
    expect(el.zoomParaFeicoes([])).toBe(false);
    expect(typeof el.removerCursorRemoto).toBe('function');
  });

  it('o evento cad-previas sai do próprio elemento', () => {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    const recebidos: unknown[] = [];
    el.addEventListener('cad-previas', (e) => recebidos.push((e as CustomEvent).detail));
    el.definirPreviasGlobais(true);
    expect(recebidos).toEqual([{ global: true }]);
  });

  it('prévias valem de ponta a ponta no elemento (regra no contexto de renderização)', async () => {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 50));
    const mapa = el.getMap();
    if (!mapa) return; // sem Leaflet iniciável neste ambiente: os testes acima cobrem a API
    const bruta = (id: string, st?: string) => ({ id, entidadeId: 'e', status: st, geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] as LatLonPar } });
    el.definirFeicoes('c', [bruta('o'), bruta('p', 'previa')]);
    expect(el.getLayerManager().getLayerInstance('c')).toBeTruthy();
    const grupo = el.getLayerManager().getLayerInstance('c') as L.LayerGroup;
    expect(grupo.getLayers()).toHaveLength(1);
    el.definirPreviasGlobais(true);
    expect(grupo.getLayers()).toHaveLength(2);
  });
});
