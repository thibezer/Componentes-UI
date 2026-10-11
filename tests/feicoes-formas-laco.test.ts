import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import type { ControleDesenho } from '../src/gerencigeo-canvas/feature_desenho_controle';
import { gerarElipse, gerarEstrela, gerarPoligonoRegular } from '../src/gerencigeo-canvas/feature_formas';
import { feicaoNoLaco } from '../src/gerencigeo-canvas/feature_caixa';
import { interpretarFerramentas } from '../src/components/ui-canvas-cad/cad-ferramentas-barra';
import type { Feicao, LatLonPar } from '../src/gerencigeo-canvas/feature_types';

afterEach(() => { document.body.innerHTML = ''; });

function novo() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
  const lm = new CanvasLayerManager([]);
  const eventos: Array<[string, any]> = [];
  const ferramentaNoEvento: Array<[string, string | null]> = [];
  const g: GerenciadorFeicoes = new GerenciadorFeicoes({
    obterLayerManager: () => lm, obterMapa: () => map,
    emitir: (e, d) => { eventos.push([e, d]); ferramentaNoEvento.push([e, g.ferramentaAtiva]); }
  });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
  const ev = (nome: string) => eventos.filter(([e]) => e === nome).map(([, d]) => d);
  const desenho = () => (g as unknown as { desenho: ControleDesenho }).desenho;
  const tecla = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  const direito = () => g.menuContexto(new MouseEvent('contextmenu', { clientX: 5, clientY: 5 }));
  return { g, lm, map, ev, desenho, tecla, direito, ferramentaNoEvento };
}

const quad = (id: string, [lat, lon]: LatLonPar, lado = 0.001): Feicao => ({
  id, camadaId: 'c', propriedades: {},
  geometria: { tipo: 'Polygon', aneis: [[[lat, lon], [lat, lon + lado], [lat - lado, lon + lado], [lat - lado, lon]]] }
});

const laco: LatLonPar[] = [[-23.499, -46.601], [-23.499, -46.589], [-23.511, -46.589], [-23.511, -46.601]];
const laco3: LatLonPar[] = [[-23.499, -46.601], [-23.499, -46.589], [-23.511, -46.595]];

describe('formas de dois cliques', () => {
  it('geradores: nº de vértices e casos degenerados', () => {
    const c: LatLonPar = [-23.5, -46.6];
    expect(gerarElipse(c, [-23.501, -46.598])).toHaveLength(36);
    expect(gerarPoligonoRegular(c, [-23.5, -46.599])).toHaveLength(6);
    expect(gerarEstrela(c, [-23.5, -46.599])).toHaveLength(10);
    expect(gerarElipse(c, c)).toBeNull();
    expect(gerarPoligonoRegular(c, c)).toBeNull();
    expect(gerarEstrela(c, c)).toBeNull();
  });

  it('estrela alterna raio externo e interno (45%)', () => {
    const c: LatLonPar = [0.5, 10];
    const e = gerarEstrela(c, [0.5, 10.01])!;
    const raio = (p: LatLonPar) => Math.hypot(p[0] - c[0], (p[1] - c[1]) * Math.cos((c[0] * Math.PI) / 180));
    expect(raio(e[0])).toBeCloseTo(0.01, 6);
    expect(raio(e[1])).toBeCloseTo(0.0045, 6);
  });

  it('elipse, hexágono e estrela criam polígonos na camada de desenho', () => {
    const { g, desenho, ev } = novo();
    g.definirCamadaDesenho('r');
    for (const [nome, vertices] of [['elipse', 36], ['poligono-regular', 6], ['estrela', 10]] as const) {
      expect(g.ativarFerramenta(nome).ok).toBe(true);
      desenho().clicarEm([-23.5, -46.6]);
      desenho().clicarEm([-23.502, -46.597]);
      const lista = g.obterFeicoes('r');
      const criada = lista[lista.length - 1];
      expect(criada.geometria.tipo).toBe('Polygon');
      expect((criada.geometria as { aneis: unknown[][] }).aneis[0]).toHaveLength(vertices);
    }
    expect(ev('cad-feicao-criada')).toHaveLength(3);
  });

  it('exigem camada de desenho, como as demais ferramentas de criação', () => {
    const { g, ev } = novo();
    expect(g.ativarFerramenta('estrela')).toEqual({ ok: false, motivo: 'sem-camada' });
    expect(ev('cad-desenho-recusado')[0]).toMatchObject({ ferramenta: 'estrela', motivo: 'sem-camada' });
  });

  it('dois cliques no mesmo ponto não criam forma degenerada', () => {
    const { g, desenho } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('elipse');
    desenho().clicarEm([-23.5, -46.6]);
    desenho().clicarEm([-23.5, -46.6]);
    expect(g.obterFeicoes('r')).toHaveLength(0);
  });

  it('o atributo `ferramentas` aceita os nomes novos, na ordem canônica', () => {
    expect(interpretarFerramentas('laco')).toEqual([]);
    expect(interpretarFerramentas('selecao-laco estrela elipse poligono')).toEqual(['poligono', 'elipse', 'estrela', 'selecao-laco']);
    expect(interpretarFerramentas('todas')).toContain('poligono-regular');
  });
});

describe('seleção por laço', () => {
  it('regras por tipo: ponto/texto/círculo pela referência, linha por vértice, polígono por vértice ou centróide', () => {
    const dentro: LatLonPar = [-23.505, -46.595];
    const fora: LatLonPar = [-23.6, -46.7];
    const f = (geometria: Feicao['geometria']): Feicao => ({ id: 'x', camadaId: 'c', propriedades: {}, geometria });
    expect(feicaoNoLaco(f({ tipo: 'Point', coordenada: dentro }), laco)).toBe(true);
    expect(feicaoNoLaco(f({ tipo: 'Point', coordenada: fora }), laco)).toBe(false);
    expect(feicaoNoLaco(f({ tipo: 'Text', coordenada: dentro, texto: 'a' }), laco)).toBe(true);
    expect(feicaoNoLaco(f({ tipo: 'Circle', centro: dentro, raioMetros: 5000 }), laco)).toBe(true);
    expect(feicaoNoLaco(f({ tipo: 'LineString', coordenadas: [fora, dentro] }), laco)).toBe(true);
    expect(feicaoNoLaco(f({ tipo: 'LineString', coordenadas: [fora, [-23.7, -46.7]] }), laco)).toBe(false);
    // polígono que envolve o laço: nenhum vértice dentro, mas o centróide (-23.5, -46.6) está
    expect(feicaoNoLaco(f({ tipo: 'Polygon', aneis: [[[-23.4, -46.7], [-23.4, -46.5], [-23.6, -46.5], [-23.6, -46.7]]] }), laco)).toBe(true);
    // polígono distante: nem vértice nem centróide
    expect(feicaoNoLaco(f({ tipo: 'Polygon', aneis: [[[-23.4, -46.9], [-23.4, -46.7], [-23.6, -46.7], [-23.6, -46.9]]] }), laco)).toBe(false);
    expect(feicaoNoLaco(f({ tipo: 'Point', coordenada: dentro }), laco.slice(0, 2))).toBe(false); // laço inválido
  });

  it('desenhar o laço seleciona (substituindo), emite a seleção e encerra a ferramenta', () => {
    const { g, desenho, tecla, ev, ferramentaNoEvento } = novo();
    g.definirFeicoes('c', [quad('dentro', [-23.503, -46.597]), quad('fora', [-23.7, -46.9])]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'fora' }]);
    expect(g.ativarFerramenta('selecao-laco').ok).toBe(true); // não exige camada de desenho
    for (const p of laco) desenho().clicarEm(p);
    tecla('Enter');
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['dentro']);
    const selecoes = ev('cad-selecao');
    expect(selecoes[selecoes.length - 1].feicoes.map((f: Feicao) => f.id)).toEqual(['dentro']);
    expect(g.ferramentaAtiva).toBeNull();
    // quem escuta a seleção já a vê sem ferramenta ativa (o app esconde o HUD de seleção enquanto desenha)
    const noEvento = ferramentaNoEvento.filter(([nome]) => nome === 'cad-selecao');
    expect(noEvento[noEvento.length - 1][1]).toBeNull();
    expect(g.obterFeicoes('c')).toHaveLength(2); // nada foi criado
  });

  it('camada oculta não entra no laço', () => {
    const { g, lm, desenho, tecla } = novo();
    g.definirFeicoes('c', [quad('dentro', [-23.503, -46.597])]);
    lm.setLayerVisibility('c', false);
    g.ativarFerramenta('selecao-laco');
    for (const p of laco) desenho().clicarEm(p);
    tecla('Enter');
    expect(g.obterFeicoesSelecionadas()).toHaveLength(0);
  });
});

describe('fechar no primeiro vértice', () => {
  const clicarNo = (map: L.Map, p: LatLonPar) =>
    map.fire('click', { latlng: L.latLng(p[0], p[1]), containerPoint: map.latLngToContainerPoint(p), originalEvent: { button: 0 } as MouseEvent });

  it('polígono com 3+ vértices fecha ao clicar no primeiro', () => {
    const { g, map, desenho } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('poligono');
    const pts: LatLonPar[] = [[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]];
    for (const p of pts) desenho().clicarEm(p);
    clicarNo(map, pts[0]);
    const [f] = g.obterFeicoes('r');
    expect(f.geometria).toMatchObject({ tipo: 'Polygon' });
    expect((f.geometria as { aneis: unknown[][] }).aneis[0]).toHaveLength(3);
  });

  it('com 2 vértices o clique no primeiro não fecha', () => {
    const { g, map, desenho } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('poligono');
    desenho().clicarEm([-23.5, -46.6]);
    desenho().clicarEm([-23.5, -46.59]);
    clicarNo(map, [-23.5, -46.6]);
    expect(g.obterFeicoes('r')).toHaveLength(0);
  });

  it('laço fecha e seleciona pelo primeiro vértice', () => {
    const { g, map, desenho } = novo();
    g.definirFeicoes('c', [quad('dentro', [-23.503, -46.597])]);
    g.ativarFerramenta('selecao-laco');
    for (const p of laco3) desenho().clicarEm(p);
    clicarNo(map, laco3[0]);
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['dentro']);
  });

  it('linha não fecha pelo primeiro vértice (só polígono, laço, área e caneta)', () => {
    const { g, map, desenho } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('linha');
    const pts: LatLonPar[] = [[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]];
    for (const p of pts) desenho().clicarEm(p);
    clicarNo(map, pts[0]);
    expect(g.obterFeicoes('r')).toHaveLength(0);
  });
});

describe('botão direito com ferramenta ativa', () => {
  it('conclui quando já dá figura', () => {
    const { g, desenho, direito, ev } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('linha');
    desenho().clicarEm([-23.5, -46.6]);
    desenho().clicarEm([-23.5, -46.59]);
    direito();
    expect(g.obterFeicoes('r')).toHaveLength(1);
    expect(ev('cad-feicao-menu')).toHaveLength(0);
  });

  it('desfaz o último vértice quando falta figura e sai quando não há nada', () => {
    const { g, desenho, direito } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('poligono');
    desenho().clicarEm([-23.5, -46.6]);
    desenho().clicarEm([-23.5, -46.59]); // 2 de 3: não conclui
    direito(); // desfaz → 1 vértice
    expect(desenho().ferramenta).toBe('poligono');
    expect(g.obterFeicoes('r')).toHaveLength(0);
    direito(); // desfaz → 0
    direito(); // nada em andamento → sai
    expect(g.ferramentaAtiva).toBeNull();
  });

  it('sem ferramenta, continua emitindo o menu (inclusive no vazio)', () => {
    const { g, ev } = novo();
    g.menuContexto(new MouseEvent('contextmenu', { clientX: 5, clientY: 5 }));
    expect(ev('cad-feicao-menu')).toHaveLength(1);
    expect(ev('cad-feicao-menu')[0].feicao).toBeNull();
  });
});

describe('iniciarEm', () => {
  it('registra o primeiro clique na coordenada e segue desenhando', () => {
    const { g, desenho, tecla } = novo();
    g.definirCamadaDesenho('r');
    expect(g.ativarFerramenta('linha', { iniciarEm: [-23.5, -46.6] }).ok).toBe(true);
    desenho().clicarEm([-23.5, -46.59]);
    tecla('Enter');
    expect(g.obterFeicoes('r')[0].geometria).toEqual({ tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.59]] });
  });

  it('coordenada inválida é ignorada', () => {
    const { g, desenho } = novo();
    expect(g.ativarFerramenta('medir-distancia', { iniciarEm: [NaN, 0] }).ok).toBe(true);
    expect(desenho().ferramenta).toBe('medir-distancia');
  });
});

describe('apoio a quem hospeda o componente', () => {
  it('nosDesenho conta os vértices e desfazerVerticeDesenho remove o último', () => {
    const { g, desenho } = novo();
    g.definirCamadaDesenho('r');
    expect(g.nosDesenho).toBe(0);
    expect(g.desfazerVerticeDesenho()).toBe(false);
    g.ativarFerramenta('linha');
    desenho().clicarEm([-23.5, -46.6]);
    desenho().clicarEm([-23.5, -46.59]);
    expect(g.nosDesenho).toBe(2);
    expect(g.desfazerVerticeDesenho()).toBe(true);
    expect(g.nosDesenho).toBe(1);
    g.desativarFerramenta();
    expect(g.nosDesenho).toBe(0);
  });

  it('definirAtalhoSnap(false) ignora a tecla S, mas o botão (alternarSnap) continua', () => {
    const { g } = novo();
    g.conectarTeclado();
    g.definirAtalhoSnap(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
    expect(g.snapLigado).toBe(true);
    g.alternarSnap();
    expect(g.snapLigado).toBe(false);
    g.alternarSnap();
    g.definirAtalhoSnap(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
    expect(g.snapLigado).toBe(false);
    g.desconectarTeclado();
  });
});
