/**
 * Regressão da usabilidade de desenho e edição no mapa (Camada C do AGENTS.md). Cada caso falhava antes da correção:
 *  1. Esc engolido pelo Leaflet depois do primeiro popup (a referência `map._popup` ficava presa);
 *  2. Enter sequestrado de botões focados enquanto uma ferramenta de desenho está ativa;
 *  3. ferramenta recusada (sem camada de desenho, edição bloqueada...) sem nenhum aviso ao usuário;
 *  4. ponto médio (fantasma) da edição de vértices só aceitava clique: arrastar não inseria nada.
 * Mais o toque que começa numa alça de edição, que movia o mapa junto.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import L from 'leaflet';
import '../src/index';
import '../src/components/ui-canvas-cad';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { TEMPO_AVISO_MS } from '../src/components/ui-canvas-cad/cad-acessibilidade';
import { textoDesenhoRecusado, textoEdicaoRecusada } from '../src/components/ui-canvas-cad/cad-recusas';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { descartarPopupResidual, liberarEscDoPopup } from '../src/gerencigeo-canvas/popup_residual';
import { focoEmControleAcionavel } from '../src/core/alvo-digitavel';
import type { LatLonPar } from '../src/gerencigeo-canvas/feature_types';

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const QUADRADO: LatLonPar[] = [[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59], [-23.51, -46.6]];

function montar(atributos: Record<string, string> = {}): UICanvasCAD {
  const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  document.body.appendChild(el);
  el.inicializarAgora();
  return el;
}

function teclaDeLeaflet(tipo: string, key: string, keyCode: number): KeyboardEvent {
  const ev = new KeyboardEvent(tipo, { key, bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(ev, 'keyCode', { value: keyCode });
  return ev;
}

/** Foco no mapa (o Leaflet só escuta o teclado enquanto o contêiner tem foco) e Esc de verdade, como o navegador o entrega. */
function apertarEscNoMapa(el: UICanvasCAD): void {
  const container = el.getMap()!.getContainer();
  container.dispatchEvent(new Event('focus'));
  container.dispatchEvent(teclaDeLeaflet('keydown', 'Escape', 27));
}

describe('Esc depois de um popup (Leaflet engolia a tecla)', () => {
  it('descartarPopupResidual só solta a referência do próprio popup e tolera entradas hostis', () => {
    const mapa = { _popup: null as unknown } as unknown as L.Map;
    const a = L.popup();
    const b = L.popup();
    (mapa as unknown as { _popup: L.Popup })._popup = a;
    expect(descartarPopupResidual(mapa, b)).toBe(false);
    expect((mapa as unknown as { _popup: unknown })._popup).toBe(a);
    expect(descartarPopupResidual(mapa, a)).toBe(true);
    expect((mapa as unknown as { _popup: unknown })._popup).toBeNull();
    for (const m of [null, undefined]) expect(() => descartarPopupResidual(m, a)).not.toThrow();
    expect(descartarPopupResidual(mapa, null)).toBe(false);
    expect(descartarPopupResidual(mapa, undefined)).toBe(false);
  });

  it('liberarEscDoPopup limpa `_popup` quando o popup fecha, e não toca no popup aberto', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const map = L.map(div, { center: [-23.5, -46.6], zoom: 14 });
    liberarEscDoPopup(map);
    const popup = L.popup().setLatLng([-23.5, -46.6]).setContent('x').openOn(map);
    expect((map as unknown as { _popup: unknown })._popup).toBe(popup);
    popup.close();
    expect((map as unknown as { _popup: unknown })._popup).toBeNull();
  });

  it('com a edição de vértices aberta depois de selecionar (popup), Esc encerra a edição', () => {
    const el = montar();
    el.definirFeicoes('c', [{ id: 'q', geometria: { tipo: 'Polygon', aneis: [QUADRADO] } }]);
    el.selecionarFeicao('c', 'q'); // abre o popup da feição
    expect(el.getMap()!.getContainer().ownerDocument.querySelector('.cad-feicao-popup') ?? el.shadowRoot!.querySelector('.cad-feicao-popup')).toBeTruthy();
    expect(el.editarVertices('c', 'q').ok).toBe(true); // fecha o popup (o Leaflet deixava `_popup` preso)
    expect(el.editandoVertices).toBe(true);

    apertarEscNoMapa(el);
    expect(el.editandoVertices).toBe(false);
  });

  it('com uma figura em desenho depois de selecionar, Esc reinicia a figura e depois sai da ferramenta', () => {
    const el = montar();
    el.definirFeicoes('c', [{ id: 'q', geometria: { tipo: 'Polygon', aneis: [QUADRADO] } }]);
    el.selecionarFeicao('c', 'q');
    el.limparSelecaoFeicoes(); // fecha o popup
    el.definirCamadaDesenho('d');
    expect(el.definirFerramenta('linha').ok).toBe(true);
    const controle = (el as unknown as { feicoes: { desenho: { clicarEm: (c: LatLonPar) => void } } }).feicoes.desenho;
    controle.clicarEm([-23.5, -46.6]);
    expect(el.nosDesenho).toBe(1);

    apertarEscNoMapa(el);
    expect(el.nosDesenho).toBe(0);
    expect(el.ferramentaAtiva).toBe('linha');
    apertarEscNoMapa(el);
    expect(el.ferramentaAtiva).toBeNull();
  });
});

describe('Enter com o foco num botão durante o desenho', () => {
  function novo() {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    Object.defineProperty(el, 'clientHeight', { value: 600 });
    document.body.appendChild(el);
    const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
    const lm = new CanvasLayerManager([]);
    const eventos: string[] = [];
    const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, emitir: (e) => { eventos.push(e); return false; } });
    lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
    g.definirCamadaDesenho('rascunho');
    return { g, eventos };
  }

  const enter = (alvo: Element): KeyboardEvent => {
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, composed: true });
    alvo.dispatchEvent(ev);
    return ev;
  };

  it('Enter num botão fica com o botão: não conclui a figura nem cancela o clique do botão', () => {
    const { g, eventos } = novo();
    const botao = document.createElement('button');
    document.body.appendChild(botao);
    g.ativarFerramenta('linha');
    g.desenho!.clicarEm([-23.5, -46.6]);
    g.desenho!.clicarEm([-23.5, -46.59]);
    expect(g.nosDesenho).toBe(2);

    const ev = enter(botao);
    expect(ev.defaultPrevented).toBe(false);
    expect(g.nosDesenho).toBe(2);
    expect(g.ferramentaAtiva).toBe('linha');
    expect(eventos).not.toContain('cad-feicao-criada');
  });

  it('Enter no corpo da página (foco no mapa) continua concluindo a figura', () => {
    const { g, eventos } = novo();
    g.ativarFerramenta('linha');
    g.desenho!.clicarEm([-23.5, -46.6]);
    g.desenho!.clicarEm([-23.5, -46.59]);

    const ev = enter(document.body);
    expect(ev.defaultPrevented).toBe(true);
    expect(eventos).toContain('cad-feicao-criada');
    expect(g.nosDesenho).toBe(0);
  });

  it('Enter dentro de um botão num shadow root também é reconhecido (alvo real do evento)', () => {
    const host = document.createElement('div');
    const sombra = host.attachShadow({ mode: 'open' });
    const botao = document.createElement('button');
    sombra.appendChild(botao);
    document.body.appendChild(host);
    let reconhecido: boolean | null = null;
    window.addEventListener('keydown', (e) => { reconhecido = focoEmControleAcionavel(e); }, { once: true });
    enter(botao);
    expect(reconhecido).toBe(true);
  });

  it.each([
    ['div comum', () => document.createElement('div')],
    ['input (já coberto por focoEmCampoDeTexto)', () => document.createElement('input')]
  ])('focoEmControleAcionavel não trata %s como botão', (_nome, criar) => {
    const alvo = criar();
    document.body.appendChild(alvo);
    let reconhecido: boolean | null = null;
    window.addEventListener('keydown', (e) => { reconhecido = focoEmControleAcionavel(e); }, { once: true });
    enter(alvo);
    expect(reconhecido).toBe(false);
  });

  it('role="button" e links também são controles acionáveis', () => {
    for (const criar of [
      () => { const d = document.createElement('div'); d.setAttribute('role', 'button'); return d; },
      () => { const a = document.createElement('a'); a.setAttribute('href', '#'); return a; }
    ]) {
      const alvo = criar();
      document.body.appendChild(alvo);
      let reconhecido: boolean | null = null;
      window.addEventListener('keydown', (e) => { reconhecido = focoEmControleAcionavel(e); }, { once: true });
      enter(alvo);
      expect(reconhecido).toBe(true);
    }
  });
});

describe('ferramenta ou edição recusada avisa o usuário', () => {
  const aviso = (el: UICanvasCAD) => el.shadowRoot!.getElementById('cad-aviso') as HTMLElement;
  const status = (el: UICanvasCAD) => el.shadowRoot!.getElementById('cad-status') as HTMLElement;

  it('clicar numa ferramenta sem camada de desenho mostra o motivo e o anuncia', () => {
    const el = montar({ ferramentas: 'todas' });
    expect(aviso(el).hidden).toBe(true);
    (el.shadowRoot!.querySelector('[data-ferramenta="poligono"]') as HTMLButtonElement).click();

    expect(el.ferramentaAtiva).toBeNull();
    expect(aviso(el).hidden).toBe(false);
    expect(aviso(el).textContent).toBe(textoDesenhoRecusado('sem-camada'));
    expect(aviso(el).textContent).toMatch(/camada de desenho/i);
    expect(status(el).textContent).toBe(aviso(el).textContent);
  });

  it('o aviso some sozinho depois de um tempo', () => {
    vi.useFakeTimers();
    const el = montar({ ferramentas: 'todas' });
    el.definirFerramenta('linha');
    expect(aviso(el).hidden).toBe(false);
    vi.advanceTimersByTime(TEMPO_AVISO_MS - 1);
    expect(aviso(el).hidden).toBe(false);
    vi.advanceTimersByTime(2);
    expect(aviso(el).hidden).toBe(true);
    expect(aviso(el).textContent).toBe('');
  });

  it('recusas seguidas reiniciam o tempo em vez de empilhar temporizadores', () => {
    vi.useFakeTimers();
    const el = montar();
    el.definirFerramenta('linha');
    vi.advanceTimersByTime(TEMPO_AVISO_MS - 100);
    el.definirFerramenta('linha');
    vi.advanceTimersByTime(200);
    expect(aviso(el).hidden).toBe(false);
    vi.advanceTimersByTime(TEMPO_AVISO_MS);
    expect(aviso(el).hidden).toBe(true);
  });

  it('com a camada de desenho definida não há aviso', () => {
    const el = montar({ ferramentas: 'todas' });
    el.definirCamadaDesenho('d');
    expect(el.definirFerramenta('linha').ok).toBe(true);
    expect(aviso(el).hidden).toBe(true);
  });

  it('camada de desenho bloqueada e camada que não é de feições têm texto próprio', () => {
    const el = montar();
    el.definirFeicoes('c', [{ id: 'q', geometria: { tipo: 'Polygon', aneis: [QUADRADO] } }]);
    el.getLayerManager().setLayerBlocked('c', true);
    el.definirCamadaDesenho('c');
    el.definirFerramenta('ponto');
    expect(aviso(el).textContent).toBe(textoDesenhoRecusado('camada-bloqueada'));

    el.definirCamadaDesenho('perimetro');
    el.definirFerramenta('ponto');
    expect(aviso(el).textContent).toBe(textoDesenhoRecusado('camada-invalida'));
  });

  it('editar uma feição bloqueada ou com furos também avisa', () => {
    const el = montar();
    el.definirFeicoes('c', [
      { id: 'b', bloqueada: true, geometria: { tipo: 'Polygon', aneis: [QUADRADO] } },
      { id: 'f', geometria: { tipo: 'Polygon', aneis: [QUADRADO, [[-23.503, -46.598], [-23.503, -46.595], [-23.505, -46.595]]] } }
    ]);
    expect(el.editarVertices('c', 'b').ok).toBe(false);
    expect(aviso(el).textContent).toBe(textoEdicaoRecusada('bloqueada'));
    expect(el.editarVertices('c', 'f').ok).toBe(false);
    expect(aviso(el).textContent).toBe(textoEdicaoRecusada('poligono-com-furos'));
  });

  it('com o atributo sem-avisos o componente não mostra nem anuncia (o consumidor trata o evento)', () => {
    const el = montar({ 'sem-avisos': '' });
    const recusas: string[] = [];
    el.addEventListener('cad-desenho-recusado', (e) => recusas.push((e as CustomEvent).detail.motivo));
    el.definirFerramenta('linha');
    expect(recusas).toEqual(['sem-camada']);
    expect(aviso(el).hidden).toBe(true);
    expect(status(el).textContent).toBe('');
  });

  it('desconectar o componente cancela o temporizador e esconde o aviso', () => {
    vi.useFakeTimers();
    const el = montar();
    el.definirFerramenta('linha');
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    el.remove();
    expect(aviso(el).hidden).toBe(true);
    expect(() => vi.advanceTimersByTime(TEMPO_AVISO_MS * 2)).not.toThrow();
  });

  it('motivos desconhecidos ou hostis recebem texto genérico, sem lançar', () => {
    for (const motivo of [undefined, null, 42, {}, '', 'constructor', '__proto__', 'toString']) {
      expect(textoDesenhoRecusado(motivo)).toMatch(/ferramenta de desenho/);
      expect(textoEdicaoRecusada(motivo)).toMatch(/editar os vértices/);
    }
  });
});

describe('ponto médio da edição de vértices arrastável', () => {
  function novo() {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    Object.defineProperty(el, 'clientHeight', { value: 600 });
    document.body.appendChild(el);
    const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
    const lm = new CanvasLayerManager([]);
    const eventos: Array<[string, unknown]> = [];
    const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, emitir: (e, d) => { eventos.push([e, d]); return false; } });
    lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
    return { g, eventos, el };
  }

  interface EditorTeste { fantasmas: Array<{ marker: L.Marker; i: number }>; vertices: () => LatLonPar[] }
  const editor = (g: GerenciadorFeicoes) => g.editor as unknown as EditorTeste;
  const vertices = (g: GerenciadorFeicoes, id = 'q') =>
    (g.obterFeicoes('c').find((f) => f.id === id)!.geometria as { aneis: LatLonPar[][] }).aneis[0];
  const atualizacoes = (eventos: Array<[string, unknown]>) => eventos.filter(([e]) => e === 'cad-feicao-atualizada').length;

  function carregarQuadrado() {
    const ctx = novo();
    ctx.g.definirFeicoes('c', [{ id: 'q', geometria: { tipo: 'Polygon', aneis: [QUADRADO] } }]);
    ctx.g.definirSnap(false);
    expect(ctx.g.iniciarEdicao('c', 'q').ok).toBe(true);
    return ctx;
  }

  it('os fantasmas aceitam arraste (antes só o clique funcionava)', () => {
    const { g } = carregarQuadrado();
    expect(editor(g).fantasmas).toHaveLength(4);
    for (const f of editor(g).fantasmas) expect(f.marker.dragging?.enabled()).toBe(true);
  });

  it('arrastar o ponto médio insere o nó já na posição solta, num gesto só', () => {
    const { g, eventos } = carregarQuadrado();
    const alvo: LatLonPar = [-23.495, -46.595];
    const { marker } = editor(g).fantasmas[0]; // aresta 0 → 1

    marker.setLatLng(alvo);
    marker.fire('drag');
    expect(vertices(g)).toHaveLength(4); // durante o arrasto nada é gravado
    expect(atualizacoes(eventos)).toBe(0);

    marker.fire('dragend');
    expect(vertices(g)).toHaveLength(5);
    expect(vertices(g)[1]).toEqual(alvo);
    expect(vertices(g)[0]).toEqual(QUADRADO[0]);
    expect(vertices(g)[2]).toEqual(QUADRADO[1]);
    expect(atualizacoes(eventos)).toBe(1);
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(5);
    expect(document.querySelectorAll('.cad-vertex-ghost')).toHaveLength(5);
  });

  it('o HUD acompanha o arrasto do ponto médio antes de gravar', () => {
    const { g, el } = carregarQuadrado();
    const antes = el.querySelector('#cm-vertex-edit-hud [data-campo="medida"]')!.textContent;
    const { marker } = editor(g).fantasmas[0];
    marker.setLatLng([-23.45, -46.595]);
    marker.fire('drag');
    expect(el.querySelector('#cm-vertex-edit-hud [data-campo="medida"]')!.textContent).not.toBe(antes);
  });

  it('o ponto médio do segmento que fecha o polígono insere no fim da lista', () => {
    const { g } = carregarQuadrado();
    const fechamento = editor(g).fantasmas.find((f) => f.i === 3)!;
    fechamento.marker.setLatLng([-23.512, -46.605]);
    fechamento.marker.fire('dragend');
    expect(vertices(g)).toHaveLength(5);
    expect(vertices(g)[4]).toEqual([-23.512, -46.605]);
  });

  it('o clique no ponto médio continua inserindo no meio da aresta (sem arrastar)', () => {
    const { g, eventos } = carregarQuadrado();
    editor(g).fantasmas[0].marker.fire('click', { originalEvent: new MouseEvent('click') });
    expect(vertices(g)).toHaveLength(5);
    expect(vertices(g)[1][0]).toBeCloseTo(-23.5, 9);
    expect(vertices(g)[1][1]).toBeCloseTo(-46.595, 9);
    expect(atualizacoes(eventos)).toBe(1);
  });

  it('com snap ligado, o nó arrastado cola no vértice de outra feição', () => {
    const { g } = novo();
    g.definirFeicoes('c', [
      { id: 'q', geometria: { tipo: 'Polygon', aneis: [QUADRADO] } },
      { id: 'alvo', geometria: { tipo: 'Point', coordenada: [-23.52, -46.58] } }
    ]);
    g.iniciarEdicao('c', 'q');
    const { marker } = editor(g).fantasmas[0];
    marker.setLatLng([-23.52 + 0.00001, -46.58 + 0.00001]);
    marker.fire('dragend');
    expect(vertices(g)[1]).toEqual([-23.52, -46.58]);
  });

  it('na linha só existem fantasmas entre vértices e inserir mantém o tipo', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ id: 'l', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]] } }]);
    g.definirSnap(false);
    g.iniciarEdicao('c', 'l');
    expect(editor(g).fantasmas).toHaveLength(2);
    editor(g).fantasmas[1].marker.setLatLng([-23.52, -46.58]);
    editor(g).fantasmas[1].marker.fire('dragend');
    const geo = g.obterFeicoes('c')[0].geometria as { tipo: string; coordenadas: LatLonPar[] };
    expect(geo.tipo).toBe('LineString');
    expect(geo.coordenadas).toHaveLength(4);
    expect(geo.coordenadas[2]).toEqual([-23.52, -46.58]);
  });

  it('feição com curva continua curva: o nó novo nasce na curva e vai para a posição solta', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{
      id: 'cv',
      geometria: {
        tipo: 'Polygon', aneis: [QUADRADO],
        curva: [
          { ponto: QUADRADO[0], saida: [-23.499, -46.598] }, { ponto: QUADRADO[1] }, { ponto: QUADRADO[2] }, { ponto: QUADRADO[3] }
        ]
      }
    }]);
    g.definirSnap(false);
    expect(g.iniciarEdicao('c', 'cv').ok).toBe(true);
    const { marker } = editor(g).fantasmas[0];
    marker.setLatLng([-23.49, -46.595]);
    marker.fire('dragend');
    const geo = g.obterFeicoes('c')[0].geometria as { curva?: Array<{ ponto: LatLonPar }> };
    expect(geo.curva).toHaveLength(5);
    expect(geo.curva![1].ponto).toEqual([-23.49, -46.595]);
  });

  it('clicar no ponto médio de uma curva também mantém a curva (antes virava poligonal)', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{
      id: 'cv',
      geometria: {
        tipo: 'Polygon', aneis: [QUADRADO],
        curva: [{ ponto: QUADRADO[0], saida: [-23.499, -46.598] }, { ponto: QUADRADO[1] }, { ponto: QUADRADO[2] }, { ponto: QUADRADO[3] }]
      }
    }]);
    g.iniciarEdicao('c', 'cv');
    editor(g).fantasmas[0].marker.fire('click', { originalEvent: new MouseEvent('click') });
    const geo = g.obterFeicoes('c')[0].geometria as { curva?: unknown[] };
    expect(geo.curva).toHaveLength(5);
  });

  it('destino com coordenada inválida (NaN/Infinity) é ignorado: o nó nasce no meio da aresta', () => {
    const { g } = carregarQuadrado();
    const inserir = (editor(g) as unknown as { inserir: (i: number, destino?: LatLonPar) => void }).inserir.bind(editor(g));
    expect(() => inserir(0, [NaN, Infinity])).not.toThrow();
    expect(vertices(g)).toHaveLength(5);
    for (const v of vertices(g)) expect(Number.isFinite(v[0]) && Number.isFinite(v[1])).toBe(true);
    expect(vertices(g)[1][1]).toBeCloseTo(-46.595, 9);
  });

  it('arrastar e soltar depois que a edição terminou não lança nem grava nada', () => {
    const { g } = carregarQuadrado();
    const { marker } = editor(g).fantasmas[0];
    g.pararEdicao();
    expect(() => marker.fire('dragend')).not.toThrow();
    expect(vertices(g)).toHaveLength(4);
  });

  it('a dica do HUD ensina os gestos de inserir e excluir', () => {
    const { el } = carregarQuadrado();
    const dica = el.querySelector('#cm-vertex-edit-hud [data-campo="dica"]')!.textContent!;
    expect(dica).toMatch(/ponto do meio/i);
    expect(dica).toMatch(/botão direito/i);
  });
});

describe('toque que começa numa alça de edição não move o mapa', () => {
  /** Entrega o toque direto ao tratador do canvas (o Draggable do Leaflet não roda no happy-dom). */
  function toque(el: UICanvasCAD, metodo: 'handleTouchStart' | 'handleTouchMove' | 'handleTouchEnd', alvo: Element, x: number, y: number): void {
    const interacao = el.getController().canvasInteracao as unknown as Record<string, (e: unknown) => void>;
    const t = [{ clientX: x, clientY: y }];
    interacao[metodo]({ target: alvo, touches: metodo === 'handleTouchEnd' ? [] : t, preventDefault: () => undefined });
  }

  function arrastar(el: UICanvasCAD, alvo: Element): void {
    toque(el, 'handleTouchStart', alvo, 100, 100);
    toque(el, 'handleTouchMove', alvo, 140, 130);
    toque(el, 'handleTouchEnd', alvo, 140, 130);
  }

  it('arrastar uma alça ou um ponto médio por toque não faz pan; arrastar o fundo continua fazendo', () => {
    const el = montar();
    el.definirFeicoes('c', [{ id: 'q', geometria: { tipo: 'Polygon', aneis: [QUADRADO] } }]);
    el.editarVertices('c', 'q');
    const map = el.getMap()!;
    const panBy = vi.spyOn(map, 'panBy');
    const container = map.getContainer();

    arrastar(el, container.querySelector('.cad-vertex-handle')!);
    arrastar(el, container.querySelector('.cad-vertex-ghost')!);
    arrastar(el, container.querySelector('#cm-vertex-edit-hud')!);
    expect(panBy).not.toHaveBeenCalled();

    arrastar(el, container);
    expect(panBy).toHaveBeenCalled();
  });
});
