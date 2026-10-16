import { describe, it, expect, afterEach, vi } from 'vitest';
import L from 'leaflet';
import {
  verificarEditavel, removerVertice, inserirVertice, moverVertice, minimoVertices, segmentosDe, pontoMedio,
  MAX_VERTICES_EDICAO, pontosDe, comPontos, removerPonto, pontoDaBordaDoCirculo, RAIO_MINIMO_EDICAO_CIRCULO_M
} from '../src/gerencigeo-canvas/feature_edicao_ops';
import { buscarSnap } from '../src/gerencigeo-canvas/feature_snap';
import { ControleSnap } from '../src/components/ui-canvas-cad/cad-snap';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { normalizarFeicaoEntrada } from '../src/gerencigeo-canvas/feature_adapters';
import type { Feicao, LatLonPar } from '../src/gerencigeo-canvas/feature_types';

afterEach(() => { document.body.innerHTML = ''; });

const F = (id: string, geometria: unknown, extra = {}) => normalizarFeicaoEntrada({ id, geometria, ...extra }, 'c')!;
const quadrado = (id = 'q'): Feicao =>
  F(id, { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59], [-23.51, -46.6]]] });
const linha = (id = 'l'): Feicao => F(id, { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]] });
const ponto = (id = 'p'): Feicao => F(id, { tipo: 'Point', coordenada: [-23.5, -46.6] });

describe('operações de vértices', () => {
  it('recusa bloqueada, tipos não editáveis, polígono com furos e geometrias gigantes', () => {
    expect(verificarEditavel(quadrado())).toBeNull();
    expect(verificarEditavel(linha())).toBeNull();
    expect(verificarEditavel(ponto())).toBeNull();
    expect(verificarEditavel({ ...quadrado(), bloqueada: true })).toBe('bloqueada');
    expect(verificarEditavel(quadrado(), true)).toBe('bloqueada');
    expect(verificarEditavel(F('c', { tipo: 'Circle', centro: [-23.5, -46.6], raioMetros: 10 }))).toBeNull();
    expect(verificarEditavel(F('t', { tipo: 'Text', coordenada: [-23.5, -46.6], texto: 'x' }))).toBe('tipo-nao-suportado');
    const comFuro = F('f', { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]], [[-23.505, -46.598], [-23.505, -46.595], [-23.507, -46.595]]] });
    expect(verificarEditavel(comFuro)).toBe('poligono-com-furos');
    const gigante: LatLonPar[] = Array.from({ length: MAX_VERTICES_EDICAO + 1 }, (_, i) => [-23.5 + i * 1e-6, -46.6 + (i % 2) * 1e-6]);
    expect(verificarEditavel(F('g', { tipo: 'LineString', coordenadas: gigante }))).toBe('muitos-vertices');
  });

  it('círculo: alças de centro e borda; a borda define o raio, o centro não o altera', () => {
    const g = F('c', { tipo: 'Circle', centro: [-23.5, -46.6], raioMetros: 500 }).geometria;
    const pts = pontosDe(g);
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual([-23.5, -46.6]);
    const ida = comPontos(g, pts) as { raioMetros: number };
    expect(ida.raioMetros).toBeCloseTo(500, 0);
    const maior = comPontos(g, [pts[0], pontoDaBordaDoCirculo(pts[0], 1200)]) as { raioMetros: number };
    expect(maior.raioMetros).toBeCloseTo(1200, 0);
    const movido = comPontos(g, [[-23.6, -46.5], [pts[1][0] - 0.1, pts[1][1] + 0.1]]) as { centro: LatLonPar; raioMetros: number };
    expect(movido.centro).toEqual([-23.6, -46.5]);
    expect(movido.raioMetros).toBeCloseTo(500, 0);
    expect(removerPonto(g, 0)).toBeNull();
    expect((comPontos(g, [pts[0], pts[0]]) as { raioMetros: number }).raioMetros).toBe(RAIO_MINIMO_EDICAO_CIRCULO_M);
  });

  it('mínimos: 3 no polígono, 2 na linha', () => {
    expect(minimoVertices(quadrado().geometria)).toBe(3);
    expect(minimoVertices(linha().geometria)).toBe(2);
    const tri = F('t', { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]]] }).geometria;
    expect(removerVertice(tri, 0)).toBeNull();
    const dois = F('d', { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.51, -46.59]] }).geometria;
    expect(removerVertice(dois, 0)).toBeNull();
    expect(removerVertice(quadrado().geometria, 1)).toMatchObject({ tipo: 'Polygon' });
  });

  it('inserir vai logo depois do vértice; no polígono o último fecha com o primeiro', () => {
    const g = quadrado().geometria;
    const r = inserirVertice(g, 3, [-23.505, -46.6]) as { aneis: LatLonPar[][] };
    expect(r.aneis[0]).toHaveLength(5);
    expect(r.aneis[0][4]).toEqual([-23.505, -46.6]);
    const l = inserirVertice(linha().geometria, 0, [1, 1]) as { coordenadas: LatLonPar[] };
    expect(l.coordenadas[1]).toEqual([1, 1]);
  });

  it('mover não altera a geometria original', () => {
    const g = linha().geometria;
    const copia = JSON.stringify(g);
    const m = moverVertice(g, 1, [9, 9]) as { coordenadas: LatLonPar[] };
    expect(m.coordenadas[1]).toEqual([9, 9]);
    expect(JSON.stringify(g)).toBe(copia);
  });

  it('segmentos do polígono incluem o que fecha', () => {
    expect(segmentosDe(quadrado().geometria)).toEqual([[0, 1], [1, 2], [2, 3], [3, 0]]);
    expect(segmentosDe(linha().geometria)).toEqual([[0, 1], [1, 2]]);
    expect(pontoMedio([0, 0], [2, 4])).toEqual([1, 2]);
  });
});

describe('buscarSnap', () => {
  // projeção identidade: lat -> y, lon -> x (px)
  const proj = (p: LatLonPar) => ({ x: p[1], y: p[0] });
  const quad = F('q', { tipo: 'Polygon', aneis: [[[10, 10], [10, 60], [60, 60], [60, 10]]] });

  it('vértice vence ponto médio e aresta', () => {
    const r = buscarSnap({ x: 12, y: 10 }, [quad], proj);
    expect(r).toMatchObject({ tipo: 'vertice', coordenada: [10, 10], feicaoId: 'q' });
  });

  it('ponto médio vence aresta; aresta vale fora dos dois', () => {
    expect(buscarSnap({ x: 35, y: 12 }, [quad], proj)).toMatchObject({ tipo: 'meio', coordenada: [10, 35] });
    const r = buscarSnap({ x: 20, y: 13 }, [quad], proj)!;
    expect(r.tipo).toBe('aresta');
    expect(r.coordenada[0]).toBeCloseTo(10, 6);
    expect(r.coordenada[1]).toBeCloseTo(20, 6);
  });

  it('fora da tolerância não acerta; tipos podem ser desligados', () => {
    expect(buscarSnap({ x: 35, y: 35 }, [quad], proj)).toBeNull();
    expect(buscarSnap({ x: 12, y: 10 }, [quad], proj, { vertice: false, meio: false, aresta: false })).toBeNull();
    expect(buscarSnap({ x: 12, y: 10 }, [quad], proj, { vertice: false })?.tipo).toBe('aresta');
    expect(buscarSnap({ x: 24, y: 10 }, [quad], proj)?.tipo).toBe('aresta');
    expect(buscarSnap({ x: 24, y: 10 }, [quad], proj, { toleranciaPx: 15 })?.tipo).toBe('vertice');
  });

  it('o vértice em arrasto e os segmentos que o tocam não atraem; os outros da mesma feição sim', () => {
    // arrastando o vértice 0 ([10,10]): perto dele nada da própria feição atrai
    expect(buscarSnap({ x: 12, y: 10 }, [quad], proj, {}, { feicaoId: 'q', vertice: 0 })).toBeNull();
    // os outros vértices da mesma feição continuam disponíveis
    expect(buscarSnap({ x: 58, y: 10 }, [quad], proj, {}, { feicaoId: 'q', vertice: 0 })).toMatchObject({ tipo: 'vertice', coordenada: [10, 60] });
    expect(buscarSnap({ x: 60, y: 58 }, [quad], proj, {}, { feicaoId: 'q', vertice: 0 })).toMatchObject({ tipo: 'vertice', coordenada: [60, 60] });
    // e uma feição de fora atrai normalmente, mesmo com o mesmo id de exclusão apontando para outra
    expect(buscarSnap({ x: 12, y: 10 }, [quad], proj, {}, { feicaoId: 'outra', vertice: 0 })).toMatchObject({ coordenada: [10, 10] });
  });

  it('pontos e círculos atraem pelo centro; feição excluída é ignorada', () => {
    const p = F('p', { tipo: 'Point', coordenada: [50, 50] });
    expect(buscarSnap({ x: 53, y: 50 }, [p], proj)).toMatchObject({ tipo: 'vertice', feicaoId: 'p' });
    expect(buscarSnap({ x: 53, y: 50 }, [{ ...p, excluida: true }], proj)).toBeNull();
    const c = F('c', { tipo: 'Circle', centro: [70, 70], raioMetros: 5 });
    expect(buscarSnap({ x: 70, y: 73 }, [c], proj)).toMatchObject({ coordenada: [70, 70] });
  });

  it('entre vértices candidatos escolhe o mais perto', () => {
    const a = F('a', { tipo: 'Point', coordenada: [50, 50] });
    const b = F('b', { tipo: 'Point', coordenada: [50, 54] });
    expect(buscarSnap({ x: 53, y: 50 }, [a, b], proj)?.feicaoId).toBe('b');
  });
});

describe('ControleSnap', () => {
  const alvo = () => {
    const ouvintes = new Map<string, Set<EventListener>>();
    return {
      addEventListener: (t: string, f: EventListener) => { (ouvintes.get(t) ?? ouvintes.set(t, new Set()).get(t)!).add(f); },
      removeEventListener: (t: string, f: EventListener) => { ouvintes.get(t)?.delete(f); },
      disparar: (t: string, e: Partial<KeyboardEvent> = {}) => ouvintes.get(t)?.forEach((f) => f(e as Event)),
      total: () => [...ouvintes.values()].reduce((s, o) => s + o.size, 0)
    };
  };

  it('S alterna; Alt desliga só enquanto segurado; botão/API alternam', () => {
    const a = alvo();
    const aoMudar = vi.fn();
    const s = new ControleSnap({ aoMudar, alvo: a as never });
    s.conectar();
    expect(s.ativo).toBe(true);

    a.disparar('keydown', { key: 'Alt' });
    expect(s.ativo).toBe(false);
    expect(s.ligado).toBe(true);
    expect(aoMudar).toHaveBeenLastCalledWith({ ativo: false, ligado: true, temporario: true });
    a.disparar('keyup', { key: 'Alt' });
    expect(s.ativo).toBe(true);

    a.disparar('keydown', { key: 's' });
    expect(s.ligado).toBe(false);
    a.disparar('keydown', { key: 'S' });
    expect(s.ligado).toBe(true);

    s.alternar();
    expect(s.ligado).toBe(false);
    s.definir(true);
    expect(s.ligado).toBe(true);
  });

  it('ignora S com Ctrl/Meta, repetição de Alt e Alt "preso" ao perder o foco; desconectar limpa tudo', () => {
    const a = alvo();
    const aoMudar = vi.fn();
    const s = new ControleSnap({ aoMudar, alvo: a as never });
    s.conectar();
    a.disparar('keydown', { key: 's', ctrlKey: true });
    a.disparar('keydown', { key: 's', metaKey: true });
    expect(s.ligado).toBe(true);

    a.disparar('keydown', { key: 'Alt' });
    a.disparar('keydown', { key: 'Alt' });
    expect(aoMudar).toHaveBeenCalledTimes(1);
    a.disparar('blur');
    expect(s.ativo).toBe(true);

    s.desconectar();
    expect(a.total()).toBe(0);
  });

  it('S digitando num campo não alterna', () => {
    const a = alvo();
    const s = new ControleSnap({ aoMudar: vi.fn(), alvo: a as never });
    s.conectar();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    a.disparar('keydown', { key: 's' });
    expect(s.ligado).toBe(true);
  });
});

describe('edição de vértices integrada', () => {
  function novo() {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    Object.defineProperty(el, 'clientHeight', { value: 600 });
    document.body.appendChild(el);
    const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
    const lm = new CanvasLayerManager([]);
    const eventos: Array<[string, any]> = [];
    const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, emitir: (e, d) => eventos.push([e, d]) });
    lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
    const nomes = () => eventos.map(([e]) => e);
    return { g, lm, map, el, eventos, nomes };
  }

  const carregar = (g: GerenciadorFeicoes, fs: Feicao[]) =>
    g.definirFeicoes('c', fs.map((f) => ({ id: f.id, geometria: f.geometria, bloqueada: f.bloqueada })));

  it('recusa feição inexistente, bloqueada e polígono com furos, avisando por evento', () => {
    const { g, eventos } = novo();
    const comFuro = F('f', { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]], [[-23.505, -46.598], [-23.505, -46.595], [-23.507, -46.595]]] });
    carregar(g, [{ ...quadrado('b'), bloqueada: true }, comFuro]);
    expect(g.iniciarEdicao('c', 'zzz')).toEqual({ ok: false, motivo: 'inexistente' });
    expect(g.iniciarEdicao('c', 'b')).toEqual({ ok: false, motivo: 'bloqueada' });
    expect(g.iniciarEdicao('c', 'f')).toEqual({ ok: false, motivo: 'poligono-com-furos' });
    expect(g.editando).toBe(false);
    expect(eventos.filter(([e]) => e === 'cad-edicao-recusada').map(([, d]) => d.motivo)).toEqual(['bloqueada', 'poligono-com-furos']);
  });

  it('camada bloqueada também recusa', () => {
    const { g, lm } = novo();
    carregar(g, [quadrado()]);
    lm.setLayerBlocked('c', true);
    expect(g.iniciarEdicao('c', 'q').motivo).toBe('bloqueada');
  });

  it('cria uma alça por vértice, fantasmas nos pontos médios, HUD e esconde o popup', () => {
    const { g, el, nomes } = novo();
    carregar(g, [quadrado()]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]);
    expect(document.querySelector('.cad-feicao-popup')).toBeTruthy();

    expect(g.iniciarEdicao('c', 'q').ok).toBe(true);
    expect(g.editando).toBe(true);
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(4);
    expect(document.querySelectorAll('.cad-vertex-ghost')).toHaveLength(4);
    const hud = el.querySelector('#cm-vertex-edit-hud') as HTMLElement;
    expect(hud.textContent).toContain('Nós: 4');
    expect(hud.textContent).toMatch(/Área: .* ha/);
    expect(hud.textContent).toContain('Snap: ligado');
    expect(hud.querySelector('[data-acao="concluir"]')?.textContent).toBe('Concluir');
    expect(document.querySelector('.cad-feicao-popup')).toBeNull();
    expect(nomes()).toContain('cad-edicao-iniciada');
  });

  it('arrastar uma alça atualiza a feição no fim do gesto e o HUD ao vivo', () => {
    const { g, eventos, el } = novo();
    carregar(g, [quadrado()]);
    g.iniciarEdicao('c', 'q');
    const editor = (g as unknown as { editor: { arrastarPara: (i: number, c: LatLonPar) => void } }).editor;
    editor.arrastarPara(0, [-23.495, -46.605]);
    const geo = g.obterFeicoes('c')[0].geometria as { aneis: LatLonPar[][] };
    expect(geo.aneis[0][0]).toEqual([-23.495, -46.605]);
    expect(eventos.filter(([e]) => e === 'cad-feicao-atualizada')).toHaveLength(1);
    expect(el.querySelector('#cm-vertex-edit-hud')?.textContent).toContain('Nós: 4');
  });

  it('snap durante o arrasto cola no vértice de outra feição', () => {
    const { g } = novo();
    carregar(g, [quadrado('q'), F('alvo', { tipo: 'Point', coordenada: [-23.5, -46.6] })]);
    // move o ponto-alvo para longe do quadrado, para provar que o snap vem dele
    g.atualizarFeicao('c', 'alvo', { geometria: { tipo: 'Point', coordenada: [-23.52, -46.58] } });
    g.iniciarEdicao('c', 'q');
    const editor = (g as unknown as { editor: { arrastarPara: (i: number, c: LatLonPar) => void } }).editor;
    // um pouquinho ao lado do ponto-alvo (alguns metros = poucos px em zoom 16)
    editor.arrastarPara(0, [-23.52 + 0.00001, -46.58 + 0.00001]);
    const geo = g.obterFeicoes('c').find((f) => f.id === 'q')!.geometria as { aneis: LatLonPar[][] };
    expect(geo.aneis[0][0]).toEqual([-23.52, -46.58]);
  });

  it('sem snap (desligado) a posição fica como o cursor deixou', () => {
    const { g } = novo();
    carregar(g, [quadrado('q'), F('alvo', { tipo: 'Point', coordenada: [-23.52, -46.58] })]);
    g.definirSnap(false);
    g.iniciarEdicao('c', 'q');
    const editor = (g as unknown as { editor: { arrastarPara: (i: number, c: LatLonPar) => void } }).editor;
    editor.arrastarPara(0, [-23.52 + 0.00001, -46.58 + 0.00001]);
    const geo = g.obterFeicoes('c').find((f) => f.id === 'q')!.geometria as { aneis: LatLonPar[][] };
    expect(geo.aneis[0][0]).toEqual([-23.52 + 0.00001, -46.58 + 0.00001]);
  });

  it('excluir respeita o mínimo; inserir cria mais um vértice com alça', () => {
    const { g } = novo();
    carregar(g, [quadrado()]);
    g.iniciarEdicao('c', 'q');
    const editor = (g as unknown as { editor: { excluirVertice: (i: number) => boolean; inserirVerticeApos: (i: number) => void; vertices: () => LatLonPar[] } }).editor;
    expect(editor.excluirVertice(1)).toBe(true);
    expect(g.obterFeicoes('c')[0].geometria).toMatchObject({ tipo: 'Polygon' });
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(3);
    expect(editor.excluirVertice(0)).toBe(false); // triângulo: não desce de 3
    expect(editor.vertices()).toHaveLength(3);

    editor.inserirVerticeApos(0);
    expect(editor.vertices()).toHaveLength(4);
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(4);
    expect((g.obterFeicoes('c')[0].geometria as { aneis: LatLonPar[][] }).aneis[0]).toHaveLength(4);
  });

  it('botão direito na alça exclui o vértice', () => {
    const { g } = novo();
    carregar(g, [quadrado()]);
    g.iniciarEdicao('c', 'q');
    const editor = (g as unknown as { editor: { alcas: L.Marker[] } }).editor;
    editor.alcas[2].fire('contextmenu', { originalEvent: new MouseEvent('contextmenu') });
    expect((g.obterFeicoes('c')[0].geometria as { aneis: LatLonPar[][] }).aneis[0]).toHaveLength(3);
  });

  it('linha: mínimo 2 e sem fantasma extra de fechamento; ponto: uma alça só', () => {
    const { g } = novo();
    carregar(g, [linha('l'), ponto('p')]);
    g.iniciarEdicao('c', 'l');
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(3);
    expect(document.querySelectorAll('.cad-vertex-ghost')).toHaveLength(2);
    g.iniciarEdicao('c', 'p');
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(1);
    expect(document.querySelectorAll('.cad-vertex-ghost')).toHaveLength(0);
    expect(document.querySelector('#cm-vertex-edit-hud')?.textContent).toMatch(/-23\.500000, -46\.600000/);
  });

  it('Concluir/Esc encerram, remove HUD e alças, restaura o popup e emite cad-edicao-concluida', () => {
    const { g, el, nomes } = novo();
    carregar(g, [quadrado()]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]);
    g.iniciarEdicao('c', 'q');
    (el.querySelector('#cm-vertex-edit-hud [data-acao="concluir"]') as HTMLButtonElement).click();
    expect(g.editando).toBe(false);
    expect(el.querySelector('#cm-vertex-edit-hud')).toBeNull();
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(0);
    expect(document.querySelector('.cad-feicao-popup')).toBeTruthy();
    expect(nomes()).toContain('cad-edicao-concluida');

    g.iniciarEdicao('c', 'q');
    g.aoPedirLimpeza(); // Esc / clique no vazio: só encerra a edição
    expect(g.editando).toBe(false);
    expect(g.obterFeicoesSelecionadas()).toHaveLength(1);
    g.aoPedirLimpeza(); // segundo Esc limpa a seleção
    expect(g.obterFeicoesSelecionadas()).toHaveLength(0);
  });

  it('selecionar outra feição encerra a edição; a mesma não', () => {
    const { g } = novo();
    carregar(g, [quadrado('q'), ponto('p')]);
    g.iniciarEdicao('c', 'q');
    g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]);
    expect(g.editando).toBe(true);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'p' }]);
    expect(g.editando).toBe(false);
  });

  it('remover a feição em edição encerra; alterá-la por fora refaz as alças', () => {
    const { g } = novo();
    carregar(g, [quadrado('q')]);
    g.iniciarEdicao('c', 'q');
    g.atualizarFeicao('c', 'q', { geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]]] } });
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(3);
    g.removerFeicao('c', 'q');
    expect(g.editando).toBe(false);
  });

  it('o botão Vértices do popup inicia a edição', () => {
    const { g } = novo();
    carregar(g, [quadrado()]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]);
    (document.querySelector('.cad-feicao-popup button[data-acao="vertices"]') as HTMLButtonElement).click();
    expect(g.editando).toBe(true);
  });

  it('alternar o snap com a edição aberta atualiza o HUD e emite cad-snap', () => {
    const { g, el, nomes } = novo();
    carregar(g, [quadrado()]);
    g.iniciarEdicao('c', 'q');
    g.alternarSnap();
    expect(el.querySelector('#cm-vertex-edit-hud')?.textContent).toContain('Snap: desligado');
    expect(nomes()).toContain('cad-snap');
  });
});
