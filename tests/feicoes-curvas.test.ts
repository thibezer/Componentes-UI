import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import {
  amostrarCurva, caminhoSvg, normalizarNos, passosDaCurva, pontoDaCubica, temAlcas
} from '../src/gerencigeo-canvas/feature_curvas';
import { SessaoDesenho, nosDeAncoras } from '../src/gerencigeo-canvas/feature_desenho';
import { normalizarFeicaoEntrada } from '../src/gerencigeo-canvas/feature_adapters';
import { deslocarGeometria } from '../src/gerencigeo-canvas/feature_algoritmos';
import { alternarSuavidade, comPontos, inserirPonto, moverAlca, pontosDe, removerPonto } from '../src/gerencigeo-canvas/feature_edicao_ops';
import { simplificarGeometria } from '../src/gerencigeo-canvas/feature_simplificacao';
import { FeicoesLayerRenderer } from '../src/gerencigeo-canvas/renderers/feicoes_renderer';
import { LinhaCurva, PoligonoCurvo } from '../src/gerencigeo-canvas/curva_leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import type { Feicao, GeometriaFeicao, LatLonPar, NoCurva } from '../src/gerencigeo-canvas/feature_types';
import type { CanvasLayerDef, CanvasRenderContext } from '../src/gerencigeo-canvas/types';

afterEach(() => { document.body.innerHTML = ''; });

const A: NoCurva = { ponto: [0, 0], saida: [1, 0.3] };
const B: NoCurva = { ponto: [0, 1], entrada: [1, 0.7] };

describe('feature_curvas', () => {
  it('amostra passa pelas pontas e a cúbica é calculada, não aproximada por retas fixas', () => {
    const v = amostrarCurva([A, B]);
    expect(v[0]).toEqual([0, 0]);
    expect(v[v.length - 1]).toEqual([0, 1]);
    const meio = pontoDaCubica([0, 0], [1, 0.3], [1, 0.7], [0, 1], 0.5);
    expect(meio[0]).toBeCloseTo(0.75);
    expect(v.some((p) => Math.abs(p[0] - meio[0]) < 1e-9 && Math.abs(p[1] - meio[1]) < 1e-9)).toBe(true);
  });

  it('segmento sem alças vira reta; fechada não repete o primeiro nó', () => {
    expect(amostrarCurva([{ ponto: [0, 0] }, { ponto: [0, 1] }])).toEqual([[0, 0], [0, 1]]);
    const fechada = amostrarCurva([A, B, { ponto: [-1, 0.5] }], true);
    expect(fechada[0]).toEqual([0, 0]);
    expect(fechada.filter((p) => p[0] === 0 && p[1] === 0)).toHaveLength(1);
  });

  it('caminho SVG usa comandos C (e L nos trechos retos) e Z ao fechar', () => {
    const proj = (p: LatLonPar) => ({ x: p[1] * 100, y: p[0] * 100 });
    expect(caminhoSvg([A, B], false, proj)).toBe('M0 0C30 100 70 100 100 0');
    const d = caminhoSvg([A, B, { ponto: [-1, 0.5] }], true, proj);
    expect(d.startsWith('M0 0C')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(1); // só A→B tem alças; B→C e C→A são retas
    expect(d.match(/L/g)).toHaveLength(2);
    expect(passosDaCurva([{ ponto: [0, 0] }, { ponto: [1, 1] }], false).map((p) => p.cmd)).toEqual(['M', 'L']);
  });

  it('normalizarNos valida e exige ao menos uma alça', () => {
    expect(normalizarNos([A, B])).toEqual([A, B]);
    expect(normalizarNos([{ ponto: [0, 0] }, { ponto: [0, 1] }])).toBeNull();
    expect(normalizarNos([A])).toBeNull();
    expect(normalizarNos([A, { ponto: [NaN, 1] }])).toBeNull();
    expect(normalizarNos([{ ponto: [0, 0] }, { ponto: [0, 1], entrada: [Infinity, 1] }])).toBeNull(); // alça inválida é descartada: sem alças, não é curva
    expect(temAlcas([A, B])).toBe(true);
  });
});

describe('caneta: ajustar alças já colocadas', () => {
  it('puxa a alça de uma âncora anterior (simétrica) e solta a simetria com Shift', () => {
    const s = new SessaoDesenho('caneta');
    s.clicar([0, 0]);
    s.clicar([0, 1]);
    s.moverAlcaDaAncora(0, 'saida', [1, 0.3]);
    expect(nosDeAncoras(s.ancoras)[0].entrada).toEqual([-1, -0.3]);
    s.moverAlcaDaAncora(0, 'entrada', [-2, 0], false);
    const n = nosDeAncoras(s.ancoras)[0];
    expect(n.entrada).toEqual([-2, 0]);
    expect(n.saida).toEqual([1, 0.3]);
    s.moverAlcaDaAncora(0, 'entrada', [-0.5, -0.5]);
    expect(nosDeAncoras(s.ancoras)[0].saida).toEqual([0.5, 0.5]);
  });
});

describe('caneta guarda a curva', () => {
  it('com alça, a linha leva os nós; sem alça, é poligonal comum', () => {
    const s = new SessaoDesenho('caneta');
    s.clicar([0, 0]);
    s.definirAlca([1, 0.3]);
    s.clicar([0, 1]);
    const g = s.concluir()!;
    expect(g.tipo).toBe('LineString');
    const curva = (g as { curva?: NoCurva[] }).curva!;
    expect(curva).toHaveLength(2);
    expect(curva[0].saida).toEqual([1, 0.3]);
    expect(curva[0].entrada).toEqual([-1, -0.3]); // espelho
    expect(curva[1].saida).toBeUndefined();

    const reta = new SessaoDesenho('caneta');
    reta.clicar([0, 0]);
    reta.clicar([0, 1]);
    const r = reta.concluir() as { coordenadas: LatLonPar[]; curva?: NoCurva[] };
    expect(r.curva).toBeUndefined();
    expect(r.coordenadas).toEqual([[0, 0], [0, 1]]);
  });

  it('polígono fecha com segmento curvo e leva os nós', () => {
    const s = new SessaoDesenho('caneta', true);
    s.clicar([0, 0]);
    s.definirAlca([0.5, 0.5]);
    s.clicar([0, 1]);
    s.clicar([1, 1]);
    const g = s.concluir()! as { tipo: string; curva?: NoCurva[]; aneis: LatLonPar[][] };
    expect(g.tipo).toBe('Polygon');
    expect(g.curva).toHaveLength(3);
    expect(g.aneis[0].length).toBeGreaterThan(10);
    const fechando = new SessaoDesenho('caneta');
    fechando.clicar([0, 0]);
    fechando.definirAlca([0.5, 0.5]);
    fechando.clicar([0, 1]);
    fechando.clicar([1, 1]);
    expect((fechando.concluirFechando() as { curva?: NoCurva[] }).curva).toHaveLength(3);
  });
});

describe('curva na entrada, no deslocamento e na simplificação', () => {
  const bruta = (curva: unknown) => ({
    id: 'c1', geometria: { tipo: 'LineString', coordenadas: [[0.5, 0.5], [0.5, 0.6]], curva }
  });

  it('normalizarFeicaoEntrada mantém a curva e refaz os vértices de apoio a partir dela', () => {
    const f = normalizarFeicaoEntrada(bruta([A, B]), 'cam', { aceitarOrigem: true })!;
    const g = f.geometria as { coordenadas: LatLonPar[]; curva?: NoCurva[] };
    expect(g.curva).toEqual([A, B]);
    expect(g.coordenadas).toEqual(amostrarCurva([A, B], false));
  });

  it('curva inválida é ignorada e a linha segue como poligonal', () => {
    const f = normalizarFeicaoEntrada(bruta([{ ponto: [0, 0] }]), 'cam', { aceitarOrigem: true })!;
    expect((f.geometria as { curva?: unknown }).curva).toBeUndefined();
    expect((f.geometria as { coordenadas: LatLonPar[] }).coordenadas).toHaveLength(2);
  });

  it('deslocar move nós e alças; simplificar não mexe na curva', () => {
    const g: GeometriaFeicao = { tipo: 'LineString', coordenadas: amostrarCurva([A, B]), curva: [A, B] };
    const d = deslocarGeometria(g, 100, 100) as { curva: NoCurva[]; coordenadas: LatLonPar[] };
    expect(d.curva[0].saida![0]).toBeGreaterThan(A.saida![0]);
    expect(d.curva[0].ponto).toEqual(d.coordenadas[0]);
    expect(simplificarGeometria(g, 3)).toBe(g);
  });
});

describe('edição de curva', () => {
  const poligono = (): GeometriaFeicao => {
    const nos: NoCurva[] = [
      { ponto: [0, 0], saida: [0.4, 0.2], entrada: [-0.4, -0.2] },
      { ponto: [0, 2], saida: [0.4, 2.2], entrada: [-0.4, 1.8] },
      { ponto: [2, 1] }
    ];
    return { tipo: 'Polygon', aneis: [amostrarCurva(nos, true)], curva: nos };
  };

  it('os pontos do editor são os nós; mover um nó leva as alças junto', () => {
    const g = poligono();
    expect(pontosDe(g)).toHaveLength(3);
    const pts = pontosDe(g).map((p) => [...p] as LatLonPar);
    pts[1] = [pts[1][0] + 1, pts[1][1] + 1];
    const m = comPontos(g, pts) as { curva: NoCurva[] };
    expect(m.curva[1].ponto).toEqual([1, 3]);
    expect(m.curva[1].saida).toEqual([1.4, 3.2]);
    expect(m.curva[0]).toEqual((g as { curva: NoCurva[] }).curva[0]);
  });

  it('inserir divide o segmento sem mudar o traçado', () => {
    const g = poligono() as { curva: NoCurva[] };
    const n = inserirPonto(g as GeometriaFeicao, 0, pontoDaCubica([0, 0], [0.4, 0.2], [-0.4, 1.8], [0, 2], 0.5)) as { curva: NoCurva[] };
    expect(n.curva).toHaveLength(4);
    // o novo nó fica sobre a curva original
    const original = (t: number) => pontoDaCubica([0, 0], [0.4, 0.2], [-0.4, 1.8], [0, 2], t);
    const novo = n.curva[1].ponto;
    let menor = Infinity;
    for (let t = 0; t <= 1; t += 0.001) menor = Math.min(menor, Math.hypot(original(t)[0] - novo[0], original(t)[1] - novo[1]));
    expect(menor).toBeLessThan(1e-3);
    // e o traçado das duas metades coincide com o original
    const metade1 = pontoDaCubica(n.curva[0].ponto, n.curva[0].saida!, n.curva[1].entrada!, n.curva[1].ponto, 0.5);
    const o = original(0.25);
    expect(Math.hypot(metade1[0] - o[0], metade1[1] - o[1])).toBeLessThan(2e-2);
  });

  it('remover respeita o mínimo de nós', () => {
    expect(removerPonto(poligono(), 0)).toBeNull();
    const nova = removerPonto({ ...(poligono() as object), curva: [...(poligono() as { curva: NoCurva[] }).curva, { ponto: [3, 3] }] } as GeometriaFeicao, 3) as { curva: NoCurva[] };
    expect(nova.curva).toHaveLength(3);
  });
});

describe('desenho no Leaflet', () => {
  const camadaDef = { id: 'c', tipo: 'feicoes', interativo: false, estilo: {}, dados: [] } as unknown as CanvasLayerDef;
  const contexto = {} as CanvasRenderContext;

  function montar(preferCanvas: boolean) {
    const div = document.createElement('div');
    div.style.width = '400px';
    div.style.height = '300px';
    document.body.appendChild(div);
    const map = L.map(div, { preferCanvas, zoomAnimation: false });
    // happy-dom não mede o layout: sem tamanho, o Leaflet recorta tudo para fora da tela
    (map as unknown as { _size: L.Point; _sizeChanged: boolean })._size = L.point(400, 300);
    (map as unknown as { _sizeChanged: boolean })._sizeChanged = false;
    map.setView([0.5, 0.5], 8);
    const r = new FeicoesLayerRenderer();
    const def = { ...camadaDef, dados: [] as Feicao[] } as CanvasLayerDef;
    const grupo = r.render(def, map, contexto);
    grupo.addTo(map);
    return { map, r, def, grupo };
  }

  const feicao = (g: GeometriaFeicao, id = 'x'): Feicao => ({ id, camadaId: 'c', geometria: g, propriedades: {} });

  it('usa a camada de curva (SVG): o path tem comandos C', () => {
    const { r, def, grupo, map } = montar(false);
    const g: GeometriaFeicao = { tipo: 'Polygon', aneis: [amostrarCurva([A, B, { ponto: [-1, 0.5] }], true)], curva: [A, B, { ponto: [-1, 0.5] }] };
    def.dados = [feicao(g)] as never;
    r.update(def, grupo, { dados: def.dados }, contexto, map);
    const camadas = grupo.getLayers();
    expect(camadas).toHaveLength(1);
    expect(camadas[0]).toBeInstanceOf(PoligonoCurvo);
    const d = ((camadas[0] as L.Path).getElement() as SVGPathElement).getAttribute('d')!;
    expect(d).toMatch(/C/);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('no canvas chama bezierCurveTo com a curva', () => {
    const { r, def, grupo, map } = montar(true);
    const chamadas: string[] = [];
    const g: GeometriaFeicao = { tipo: 'LineString', coordenadas: amostrarCurva([A, B]), curva: [A, B] };
    def.dados = [feicao(g)] as never;
    r.update(def, grupo, { dados: def.dados }, contexto, map);
    const renderer = (grupo.getLayers()[0] as unknown as { _renderer: { _ctx: Record<string, unknown>; _redraw(): void } })._renderer;
    renderer._ctx.bezierCurveTo = () => { chamadas.push('C'); };
    renderer._redraw();
    expect(grupo.getLayers()[0]).toBeInstanceOf(LinhaCurva);
    expect(chamadas.length).toBeGreaterThan(0);
  });

  it('trocar de curva para poligonal recria a camada com a classe certa', () => {
    const { r, def, grupo, map } = montar(false);
    const curva: GeometriaFeicao = { tipo: 'LineString', coordenadas: amostrarCurva([A, B]), curva: [A, B] };
    def.dados = [feicao(curva)] as never;
    r.update(def, grupo, { dados: def.dados }, contexto, map);
    expect(grupo.getLayers()[0]).toBeInstanceOf(LinhaCurva);
    def.dados = [feicao({ tipo: 'LineString', coordenadas: [[0, 0], [0, 1]] })] as never;
    r.update(def, grupo, { dados: def.dados }, contexto, map);
    expect(grupo.getLayers()[0]).not.toBeInstanceOf(LinhaCurva);
    expect(grupo.getLayers()[0]).toBeInstanceOf(L.Polyline);
  });
});

describe('alças: operações', () => {
  const linha = (): GeometriaFeicao => ({ tipo: 'LineString', coordenadas: [[0, 0], [0, 1], [0, 2]] });

  it('moverAlca espelha a oposta; sem simetria deixa independente; converte poligonal em curva', () => {
    const g = moverAlca(linha(), 1, 'saida', [0.5, 1.5]) as { curva: NoCurva[] };
    expect(g.curva[1].saida).toEqual([0.5, 1.5]);
    expect(g.curva[1].entrada).toEqual([-0.5, 0.5]);
    expect(g.curva[0].saida).toBeUndefined();
    const livre = moverAlca(g as unknown as GeometriaFeicao, 1, 'entrada', [0.2, 0.7], false) as { curva: NoCurva[] };
    expect(livre.curva[1].entrada).toEqual([0.2, 0.7]);
    expect(livre.curva[1].saida).toEqual([0.5, 1.5]);
  });

  it('alternarSuavidade cria alças pela direção dos vizinhos e remove ao repetir', () => {
    const suave = alternarSuavidade(linha(), 1) as { curva: NoCurva[]; coordenadas: LatLonPar[] };
    expect(suave.curva[1].saida![1]).toBeCloseTo(1 + 2 / 6);
    expect(suave.curva[1].entrada![1]).toBeCloseTo(1 - 2 / 6);
    expect(suave.coordenadas.length).toBeGreaterThan(3);
    const ponta = alternarSuavidade(linha(), 0) as { curva: NoCurva[] };
    expect(ponta.curva[0].saida![1]).toBeCloseTo(1 / 3);
    const canto = alternarSuavidade(suave as unknown as GeometriaFeicao, 1) as { curva: NoCurva[] };
    expect(canto.curva[1].saida).toBeUndefined();
    expect(canto.curva[1].entrada).toBeUndefined();
  });

  it('no polígono o primeiro nó suaviza usando o último como vizinho', () => {
    const quad: GeometriaFeicao = { tipo: 'Polygon', aneis: [[[0, 0], [0, 1], [1, 1], [1, 0]]] };
    const r = alternarSuavidade(quad, 0) as { curva: NoCurva[] };
    expect(r.curva[0].saida![0]).toBeCloseTo(-1 / 6); // (vizinho seguinte − anterior) / 6
    expect(r.curva[0].saida![1]).toBeCloseTo(1 / 6);
  });
});

describe('alças: editor', () => {
  function novo() {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    Object.defineProperty(el, 'clientHeight', { value: 600 });
    document.body.appendChild(el);
    const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
    const lm = new CanvasLayerManager([]);
    const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, emitir: () => undefined });
    lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
    return g;
  }
  type Editor = {
    totalAlcasBezier: number;
    arrastarAlcaPara(i: number, q: 'entrada' | 'saida', c: LatLonPar, independente?: boolean): void;
    alternarSuavidadeDoNo(i: number): void;
  };
  const editor = (g: GerenciadorFeicoes) => (g as unknown as { editor: Editor }).editor;
  const nosDe = (g: GerenciadorFeicoes) => (g.obterFeicoes('c')[0].geometria as { curva?: NoCurva[] }).curva;

  it('mostra uma alça por alça existente e arrastar grava a curva (com espelho)', () => {
    const g = novo();
    g.definirFeicoes('c', [{
      id: 'k',
      geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.59]], curva: [
        { ponto: [-23.5, -46.6], saida: [-23.49, -46.597] }, { ponto: [-23.5, -46.59], entrada: [-23.51, -46.593] }
      ] }
    }]);
    expect(g.iniciarEdicao('c', 'k').ok).toBe(true);
    expect(editor(g).totalAlcasBezier).toBe(2);
    editor(g).arrastarAlcaPara(0, 'saida', [-23.48, -46.596]);
    const n0 = nosDe(g)![0];
    expect(n0.saida).toEqual([-23.48, -46.596]);
    expect(n0.entrada![0]).toBeCloseTo(-23.52);
    expect(editor(g).totalAlcasBezier).toBe(3); // a alça oposta, que nasceu com a simetria, ganha marcador na hora
  });

  it('duplo clique num vértice de poligonal converte em curva e mostra as alças', () => {
    const g = novo();
    g.definirFeicoes('c', [{ id: 'k', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.595], [-23.5, -46.59]] } }]);
    g.iniciarEdicao('c', 'k');
    expect(editor(g).totalAlcasBezier).toBe(4); // latentes: sempre à mão (pontas só têm a alça que olha o vizinho)
    editor(g).alternarSuavidadeDoNo(1);
    expect(nosDe(g)).toHaveLength(3);
    expect(editor(g).totalAlcasBezier).toBe(4);
    editor(g).alternarSuavidadeDoNo(1);
    expect(nosDe(g)).toBeUndefined();
    expect(editor(g).totalAlcasBezier).toBe(4);
  });

  it('alça latente de uma poligonal pode ser arrastada e vira curva', () => {
    const g = novo();
    g.definirFeicoes('c', [{ id: 'k', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.59]] } }]);
    g.iniciarEdicao('c', 'k');
    expect(editor(g).totalAlcasBezier).toBe(2);
    expect(nosDe(g)).toBeUndefined();
    editor(g).arrastarAlcaPara(0, 'saida', [-23.49, -46.597]);
    expect(nosDe(g)![0].saida).toEqual([-23.49, -46.597]);
    expect(editor(g).totalAlcasBezier).toBe(3);
  });
});
