import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { tipoDoNo } from '../src/gerencigeo-canvas/feature_curvas';
import { distanciaMetros, metrosPorGrau } from '../src/gerencigeo-canvas/feature_metricas';
import type { Feicao, LatLonPar, NoCurva } from '../src/gerencigeo-canvas/feature_types';

/*
 * Editor de curvas: tipo do nó, painel numérico, arco/concordância, moldar o segmento e alças só do nó selecionado.
 * Os gestos passam pela API pública do editor (a mesma que o painel e o mouse usam).
 */

afterEach(() => { document.body.innerHTML = ''; });

const CENTRO: LatLonPar = [-23.505, -46.595];
/** Metros a leste/norte do centro do mapa de teste. */
const em = (leste: number, norte: number): LatLonPar => {
  const m = metrosPorGrau(CENTRO[0]);
  return [CENTRO[0] + norte / m.lat, CENTRO[1] + leste / m.lng];
};

interface Alca { marker: L.Marker; i: number; qual: 'entrada' | 'saida' }
interface Editor {
  ativo: boolean;
  totalAlcasBezier: number;
  noSelecionado: number | null;
  alcasBezier: Alca[];
  selecionarNo(i: number | null): void;
  definirTipoDoNoSelecionado(t: 'canto' | 'suave' | 'simetrico' | 'livre'): boolean;
  moverNoSelecionadoPara(c: LatLonPar): boolean;
  definirAlcaDoNoSelecionado(q: 'entrada' | 'saida', v: { comprimentoM: number; azimuteGraus: number }): boolean;
  endireitarSegmentoSeguinte(): boolean;
  curvarSegmentoSeguinte(): boolean;
  arcoNoSegmentoSeguinte(r: number, lado?: 'esquerda' | 'direita'): boolean;
  concordarNoSelecionado(r: number): boolean;
  moldarSegmentoPara(i: number, t: number, c: LatLonPar): boolean;
  segmentoMaisProximo(c: LatLonPar, tol?: number): { i: number; t: number } | null;
  desfazer(): boolean;
  refazer(): boolean;
  arrastarAlcaPara(i: number, q: 'entrada' | 'saida', c: LatLonPar, independente?: boolean): void;
  parar(): void;
}

function novo() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: CENTRO, zoom: 17 });
  const lm = new CanvasLayerManager([]);
  const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, emitir: () => undefined });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
  return { g, map, el };
}
const editorDe = (g: GerenciadorFeicoes) => (g as unknown as { editor: Editor }).editor;
const feicao = (g: GerenciadorFeicoes): Feicao => g.obterFeicoes('c')[0];
const nosDe = (g: GerenciadorFeicoes): NoCurva[] | undefined => (feicao(g).geometria as { curva?: NoCurva[] }).curva;

function comLinha(pts: LatLonPar[], curva?: NoCurva[]) {
  const ctx = novo();
  ctx.g.definirFeicoes('c', [{ id: 'k', geometria: { tipo: 'LineString', coordenadas: pts, ...(curva ? { curva } : {}) } }]);
  expect(ctx.g.iniciarEdicao('c', 'k').ok).toBe(true);
  return { ...ctx, ed: editorDe(ctx.g) };
}
const hud = (): HTMLElement => document.getElementById('cm-vertex-edit-hud')!;
const campo = (nome: string): HTMLInputElement => hud().querySelector(`[data-campo="${nome}"]`) as HTMLInputElement;
const acao = (nome: string): HTMLButtonElement => hud().querySelector(`[data-acao="${nome}"]`) as HTMLButtonElement;
const digitar = (nome: string, valor: string): void => {
  const c = campo(nome);
  c.value = valor;
  c.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('alças só do nó selecionado', () => {
  const quatro = (): NoCurva[] => [
    { ponto: em(0, 0), saida: em(20, 20) },
    { ponto: em(100, 0), entrada: em(80, 20), saida: em(120, -20) },
    { ponto: em(200, 0), entrada: em(180, 20), saida: em(220, -20) },
    { ponto: em(300, 0), entrada: em(280, 20) }
  ];
  const pontos = (): LatLonPar[] => quatro().map((n) => n.ponto);

  it('sem seleção aparecem as alças reais; com seleção, as do nó e as dos vizinhos que o tocam', () => {
    const { ed } = comLinha(pontos(), quatro());
    expect(ed.totalAlcasBezier).toBe(6); // todas as reais
    ed.selecionarNo(1);
    // nó 1: entrada e saída; nó 0: saída (trecho 0→1); nó 2: entrada (trecho 1→2)
    expect(ed.alcasBezier.map((a) => `${a.i}${a.qual[0]}`).sort()).toEqual(['0s', '1e', '1s', '2e']);
    ed.selecionarNo(null);
    expect(ed.totalAlcasBezier).toBe(6);
  });

  it('vizinhos não mostram a alça que olha para o outro lado, nem alças latentes', () => {
    const { ed } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    expect(ed.totalAlcasBezier).toBe(0);
    ed.selecionarNo(1);
    expect(ed.alcasBezier.map((a) => a.i)).toEqual([1, 1]);
    ed.selecionarNo(2);
    expect(ed.alcasBezier.map((a) => `${a.i}${a.qual[0]}`)).toEqual(['2e']); // ponta final: só a que olha o vizinho
  });

  it('puxar uma alça seleciona o nó dela', () => {
    const { ed } = comLinha(pontos(), quatro());
    const alca = ed.alcasBezier.find((a) => a.i === 2 && a.qual === 'saida')!;
    alca.marker.fire('dragstart');
    alca.marker.setLatLng(em(230, -40));
    alca.marker.fire('drag', { originalEvent: {} });
    alca.marker.fire('dragend');
    expect(ed.noSelecionado).toBe(2);
    expect(ed.alcasBezier.some((a) => a.i === 3 && a.qual === 'entrada')).toBe(true);
  });

  it('Ctrl trava o ângulo da alça em múltiplos de 45° em relação ao nó', () => {
    const { ed, g } = comLinha(pontos(), quatro());
    ed.selecionarNo(1);
    const alca = ed.alcasBezier.find((a) => a.i === 1 && a.qual === 'saida')!;
    alca.marker.fire('dragstart');
    alca.marker.setLatLng(em(140, 11)); // ~15,7°
    alca.marker.fire('drag', { originalEvent: { ctrlKey: true } });
    alca.marker.fire('dragend');
    const no = nosDe(g)![1];
    const m = metrosPorGrau(CENTRO[0]);
    const dy = (no.saida![0] - no.ponto[0]) * m.lat;
    expect(Math.abs(dy)).toBeLessThan(1e-6); // 0°: horizontal
    expect(distanciaMetros(no.ponto, no.saida!)).toBeCloseTo(distanciaMetros(em(100, 0), em(140, 11)), 1);
  });
});

describe('tipo do nó e painel', () => {
  it('o painel só aparece com um nó selecionado e marca o tipo atual', () => {
    const { ed } = comLinha([em(0, 0), em(100, 0), em(200, 50)]);
    const painel = hud().querySelector('[data-painel-no]') as HTMLElement;
    expect(painel.style.display).toBe('none');
    ed.selecionarNo(1);
    expect(painel.style.display).toBe('flex');
    expect(acao('tipo-canto').getAttribute('aria-pressed')).toBe('true');
    expect(acao('tipo-suave').getAttribute('aria-pressed')).toBe('false');
  });

  it('botões trocam o tipo (um gesto de desfazer cada) e mantêm o nó selecionado', () => {
    const { ed, g } = comLinha([em(0, 0), em(100, 0), em(200, 50)]);
    ed.selecionarNo(1);
    acao('tipo-simetrico').click();
    expect(tipoDoNo(nosDe(g)![1])).toBe('simetrico');
    expect(ed.noSelecionado).toBe(1);
    expect(acao('tipo-simetrico').getAttribute('aria-pressed')).toBe('true');
    acao('tipo-suave').click();
    expect(nosDe(g)![1].modo).toBe('suave');
    expect(ed.desfazer()).toBe(true);
    expect(tipoDoNo(nosDe(g)![1])).toBe('simetrico');
    acao('tipo-canto').click();
    expect(nosDe(g)).toBeUndefined(); // sem nenhuma alça, volta a ser poligonal
  });

  it('sem nó selecionado a ação avisa e não altera nada', () => {
    const { ed, g } = comLinha([em(0, 0), em(100, 0), em(200, 50)]);
    expect(ed.definirTipoDoNoSelecionado('suave')).toBe(false);
    expect(nosDe(g)).toBeUndefined();
    expect(hud().querySelector('[data-campo="aviso"]')!.textContent).toContain('selecion');
  });

  it('digitar latitude/longitude move o nó levando as alças', () => {
    const { ed, g } = comLinha([em(0, 0), em(100, 0), em(200, 0)], [
      { ponto: em(0, 0), saida: em(30, 10) }, { ponto: em(100, 0), entrada: em(70, -10), saida: em(130, 10) }, { ponto: em(200, 0), entrada: em(170, -10) }
    ]);
    ed.selecionarNo(1);
    const alvo = em(100, 40);
    digitar('lat', alvo[0].toFixed(7).replace('.', ','));
    expect(campo('lat').value).not.toBe('');
    // lat+lon são lidos juntos; a vírgula decimal é aceita
    digitar('lon', alvo[1].toFixed(7));
    const no = nosDe(g)![1];
    expect(no.ponto[0]).toBeCloseTo(alvo[0], 6);
    expect(no.ponto[1]).toBeCloseTo(alvo[1], 6);
    expect(distanciaMetros(no.ponto, no.saida!)).toBeCloseTo(distanciaMetros(em(100, 0), em(130, 10)), 2);
  });

  it('comprimento e azimute da alça por número', () => {
    const { ed, g } = comLinha([em(0, 0), em(100, 0), em(200, 0)], [
      { ponto: em(0, 0), saida: em(30, 10) }, { ponto: em(100, 0), entrada: em(70, -10), saida: em(130, 10) }, { ponto: em(200, 0), entrada: em(170, -10) }
    ]);
    ed.selecionarNo(1);
    digitar('saida-comp', '40');
    digitar('saida-az', '90');
    const no = nosDe(g)![1];
    expect(distanciaMetros(no.ponto, no.saida!)).toBeCloseTo(40, 1);
    expect(no.saida![0]).toBeCloseTo(no.ponto[0], 8); // leste
    expect(no.saida![1]).toBeGreaterThan(no.ponto[1]);
    expect(campo('saida-comp').value).toBe('40.000');
  });

  it('entrada inválida (vazia, texto, NaN, fora de faixa) avisa e não altera', () => {
    const { ed, g } = comLinha([em(0, 0), em(100, 0), em(200, 0)], [
      { ponto: em(0, 0), saida: em(30, 10) }, { ponto: em(100, 0), entrada: em(70, -10), saida: em(130, 10) }, { ponto: em(200, 0), entrada: em(170, -10) }
    ]);
    ed.selecionarNo(1);
    const antes = JSON.stringify(nosDe(g));
    for (const valor of ['', 'abc', 'NaN', 'Infinity', '999']) digitar('lat', valor);
    for (const valor of ['', 'x', '-5']) digitar('saida-comp', valor);
    digitar('raio', '0');
    acao('arco-esq').click();
    expect(JSON.stringify(nosDe(g))).toBe(antes);
    expect(hud().querySelector('[data-campo="aviso"]')!.textContent).not.toBe('');
  });
});

describe('segmento reto/curvo, arco e concordância', () => {
  it('Curvo dá alças ao trecho seguinte e Reto as tira', () => {
    const { ed, g } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    ed.selecionarNo(0);
    expect(ed.curvarSegmentoSeguinte()).toBe(true);
    expect(nosDe(g)![0].saida).toBeDefined();
    expect(nosDe(g)![1].entrada).toBeDefined();
    expect(ed.endireitarSegmentoSeguinte()).toBe(true);
    expect(nosDe(g)).toBeUndefined();
  });

  it('o último nó de uma linha não tem trecho seguinte', () => {
    const { ed } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    ed.selecionarNo(2);
    expect(ed.curvarSegmentoSeguinte()).toBe(false);
    expect(acao('reto').disabled).toBe(true);
    expect(acao('arco-esq').disabled).toBe(true);
  });

  it('arco por raio entra como curva editável, em um gesto desfazível', () => {
    const { ed, g } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    ed.selecionarNo(0);
    digitar('raio', '50');
    acao('arco-dir').click();
    const nos = nosDe(g)!;
    expect(nos).toHaveLength(4); // semicírculo de 100 m: dois pedaços de 90°, um nó novo no meio
    expect(feicao(g).geometria.tipo).toBe('LineString');
    expect(ed.noSelecionado).toBe(0);
    expect(ed.desfazer()).toBe(true);
    expect(nosDe(g)).toBeUndefined();
    expect(ed.refazer()).toBe(true);
    expect(nosDe(g)!.length).toBe(nos.length);
  });

  it('concordar arredonda o canto selecionado; recusa nó com alças e pontas', () => {
    const { ed, g } = comLinha([em(0, 0), em(100, 0), em(100, 100)]);
    ed.selecionarNo(1);
    digitar('raio', '20');
    acao('concordar').click();
    const nos = nosDe(g)!;
    expect(nos).toHaveLength(4);
    expect(distanciaMetros(nos[1].ponto, em(80, 0))).toBeLessThan(0.05);
    expect(ed.noSelecionado).toBeNull();
    ed.selecionarNo(0);
    expect(ed.concordarNoSelecionado(5)).toBe(false); // ponta: sem dois trechos
    expect(hud().querySelector('[data-campo="aviso"]')!.textContent).toContain('Concordância');
    ed.selecionarNo(1);
    expect(acao('concordar').disabled).toBe(true); // o nó agora é um ponto de tangência com alça
  });
});

describe('moldar o segmento', () => {
  it('moldagem direta (API): o traçado passa pelo ponto pedido e vira um gesto', () => {
    const { ed, g } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    const alvo = em(50, 30);
    expect(ed.moldarSegmentoPara(0, 0.5, alvo)).toBe(true);
    expect(nosDe(g)).toBeDefined();
    expect(ed.desfazer()).toBe(true);
    expect(nosDe(g)).toBeUndefined();
  });

  it('segmentoMaisProximo respeita a tolerância em pixels', () => {
    const { ed } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    expect(ed.segmentoMaisProximo(em(50, 1))?.i).toBe(0);
    expect(ed.segmentoMaisProximo(em(150, 1))?.i).toBe(1);
    expect(ed.segmentoMaisProximo(em(50, 40))).toBeNull(); // ~40 m do traçado = muitos pixels
    expect(ed.segmentoMaisProximo([Number.NaN, 0])).toBeNull();
  });

  it('arrastar o traçado com o mouse molda; clique sem mover não altera; o mapa volta a arrastar', () => {
    const { ed, g, map } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    const pane = map.getPane('overlayPane')!;
    const p = map.latLngToContainerPoint(em(50, 0));
    const evento = (tipo: string, x: number, y: number, extra: MouseEventInit = {}) =>
      new MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, ...extra });

    // clique simples: nada muda
    pane.dispatchEvent(evento('mousedown', p.x, p.y + 1));
    window.dispatchEvent(evento('mouseup', p.x, p.y + 1));
    expect(nosDe(g)).toBeUndefined();
    expect(map.dragging.enabled()).toBe(true);

    // arrastar 40 px para cima
    const down = evento('mousedown', p.x, p.y + 1);
    pane.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(map.dragging.enabled()).toBe(false);
    window.dispatchEvent(evento('mousemove', p.x, p.y - 40));
    window.dispatchEvent(evento('mouseup', p.x, p.y - 40));
    expect(map.dragging.enabled()).toBe(true);
    const nos = nosDe(g)!;
    expect(nos).toBeDefined();
    expect(nos[0].saida).toBeDefined();
    expect(ed.noSelecionado).toBe(0);
    expect(ed.desfazer()).toBe(true);
    expect(nosDe(g)).toBeUndefined();
  });

  it('também agarra quando o alvo do evento é o próprio contêiner do mapa; HUD e controles não', () => {
    const { ed, g, map, el } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    const p = map.latLngToContainerPoint(em(50, 0));
    const ev = (extra: MouseEventInit = {}) => new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0, ...extra });
    const noHud = ev();
    hud().dispatchEvent(noHud);
    expect(noHud.defaultPrevented).toBe(false);
    const controle = document.createElement('div');
    controle.className = 'leaflet-control';
    el.appendChild(controle);
    const noControle = ev();
    controle.dispatchEvent(noControle);
    expect(noControle.defaultPrevented).toBe(false);
    const noContainer = ev();
    el.dispatchEvent(noContainer);
    expect(noContainer.defaultPrevented).toBe(true);
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: p.x, clientY: p.y - 40 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: p.x, clientY: p.y - 40 }));
    expect(nosDe(g)).toBeDefined();
    expect(ed.noSelecionado).toBe(0);
  });

  it('longe do traçado, com modificador ou em alça, o gesto não é do editor (o mapa segue arrastando)', () => {
    const { g, map } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    const pane = map.getPane('overlayPane')!;
    const longe = map.latLngToContainerPoint(em(50, 80));
    const perto = map.latLngToContainerPoint(em(50, 0));
    const down = (x: number, y: number, extra: MouseEventInit = {}) => {
      const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, ...extra });
      pane.dispatchEvent(e);
      return e;
    };
    expect(down(longe.x, longe.y).defaultPrevented).toBe(false);
    expect(down(perto.x, perto.y, { shiftKey: true }).defaultPrevented).toBe(false);
    expect(down(perto.x, perto.y, { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(down(perto.x, perto.y, { button: 2 }).defaultPrevented).toBe(false);
    expect(map.dragging.enabled()).toBe(true);
    expect(nosDe(g)).toBeUndefined();
  });

  it('encerrar a edição no meio do gesto devolve o arraste ao mapa e solta os ouvintes', () => {
    const { ed, g, map } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    const pane = map.getPane('overlayPane')!;
    const p = map.latLngToContainerPoint(em(50, 0));
    pane.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0 }));
    expect(map.dragging.enabled()).toBe(false);
    ed.parar();
    expect(map.dragging.enabled()).toBe(true);
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: p.x, clientY: p.y - 50 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: p.x, clientY: p.y - 50 }));
    expect(nosDe(g)).toBeUndefined();
    // depois de parar, o traçado não é mais agarrado
    const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0 });
    pane.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it('reiniciar a edição não duplica o ouvinte do mouse', () => {
    const { g, map } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    g.pararEdicao?.();
    expect(g.iniciarEdicao('c', 'k').ok).toBe(true);
    const pane = map.getPane('overlayPane')!;
    const p = map.latLngToContainerPoint(em(50, 0));
    pane.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0 }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: p.x, clientY: p.y - 40 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: p.x, clientY: p.y - 40 }));
    // um único gesto no histórico: um desfazer volta ao original
    expect(editorDe(g).desfazer()).toBe(true);
    expect(nosDe(g)).toBeUndefined();
    expect(editorDe(g).desfazer()).toBe(false);
  });
});

describe('teclado', () => {
  it('Enter com o foco num botão do HUD não encerra a edição (o Enter é do botão)', () => {
    const { ed } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    const botao = acao('desfazer');
    botao.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    expect(ed.ativo).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(ed.ativo).toBe(false);
  });

  it('teclas digitadas nos campos do painel não excluem o nó nem desfazem', () => {
    const { ed, g } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    ed.selecionarNo(1);
    const c = campo('lat');
    c.focus();
    c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, composed: true }));
    c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, composed: true }));
    expect(ed.ativo).toBe(true);
    expect(feicao(g).geometria.tipo).toBe('LineString');
    expect((feicao(g).geometria as { coordenadas: LatLonPar[] }).coordenadas).toHaveLength(3);
  });
});

describe('entradas hostis na API do editor', () => {
  it('coordenadas NaN, raios inválidos e índices inexistentes são recusados sem estourar', () => {
    const { ed, g } = comLinha([em(0, 0), em(100, 0), em(200, 0)]);
    ed.selecionarNo(1);
    const antes = JSON.stringify(feicao(g).geometria);
    expect(ed.moverNoSelecionadoPara([Number.NaN, 1])).toBe(false);
    expect(ed.definirAlcaDoNoSelecionado('saida', { comprimentoM: Number.NaN, azimuteGraus: 0 })).toBe(false);
    expect(ed.arcoNoSegmentoSeguinte(Number.NaN)).toBe(false);
    expect(ed.arcoNoSegmentoSeguinte(-3)).toBe(false);
    expect(ed.concordarNoSelecionado(0)).toBe(false);
    expect(ed.moldarSegmentoPara(99, 0.5, em(1, 1))).toBe(false);
    expect(ed.moldarSegmentoPara(0, Number.NaN, em(1, 1))).toBe(false);
    expect(JSON.stringify(feicao(g).geometria)).toBe(antes);
    expect(ed.desfazer()).toBe(false); // nada entrou no histórico
  });

  it('círculo e ponto não têm painel nem quebram com as ações de nó', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ id: 'c1', geometria: { tipo: 'Circle', centro: em(0, 0), raioMetros: 30 } }]);
    expect(g.iniciarEdicao('c', 'c1').ok).toBe(true);
    const ed = editorDe(g);
    expect(hud().querySelector('[data-painel-no]')).toBeNull();
    ed.selecionarNo(0);
    expect(ed.definirTipoDoNoSelecionado('suave')).toBe(false);
    expect(ed.concordarNoSelecionado(5)).toBe(false);
    expect(ed.curvarSegmentoSeguinte()).toBe(false);
  });
});
