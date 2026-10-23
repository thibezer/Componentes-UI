import { describe, it, expect, afterEach, vi } from 'vitest';
import L from 'leaflet';
import '../src/index';
import '../src/components/ui-canvas-cad';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { ControleSnap } from '../src/components/ui-canvas-cad/cad-snap';
import { PonteiroFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes-ponteiro';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { SessaoDesenho } from '../src/gerencigeo-canvas/feature_desenho';
import { barraPedeEdicao } from '../src/components/ui-canvas-cad/cad-ferramentas-barra';
import type { ControleDesenho } from '../src/gerencigeo-canvas/feature_desenho_controle';
import type { Feicao, LatLonPar } from '../src/gerencigeo-canvas/feature_types';

/*
 * Edição de formas: histórico (desfazer/refazer/cancelar), nó selecionado + Delete, círculo, retângulo, fantasmas,
 * mudança externa durante o arraste, entradas de edição (duplo clique, Enter, botão da barra), atalhos com vários
 * canvases, avisos do desenho e toque nas alças.
 */

const criados: GerenciadorFeicoes[] = [];

afterEach(() => {
  vi.useRealTimers();
  // editores, ferramentas e teclado escutam a window: sem encerrar, um teste atrapalharia o seguinte
  for (const g of criados.splice(0)) {
    g.pararEdicao();
    g.desativarFerramenta();
    g.desconectarTeclado();
  }
  document.body.innerHTML = '';
});

interface Opcoes { emitir?: (e: string, d: unknown, cancelavel?: boolean) => unknown; atalhoValido?: () => boolean }

function novo(opcoes: Opcoes = {}) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
  const lm = new CanvasLayerManager([]);
  const eventos: Array<[string, any]> = [];
  const acoes: Array<[string, any]> = [];
  const g = new GerenciadorFeicoes({
    obterLayerManager: () => lm, obterMapa: () => map,
    emitir: (e, d, c) => { eventos.push([e, d]); return opcoes.emitir?.(e, d, c); },
    atalhoValido: opcoes.atalhoValido
  });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: (a: string, d: unknown) => { acoes.push([a, d]); g.tratarAcaoCamada(a, d as never); } } as never);
  criados.push(g);
  const ev = (nome: string) => eventos.filter(([e]) => e === nome).map(([, d]) => d);
  return { g, lm, map, el, eventos, ev, acoes };
}

const quadrado = { id: 'q', geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59], [-23.51, -46.6]]] } };
const triangulo = { id: 't', geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]]] } };
const linha = { id: 'l', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]] } };

type Editor = {
  alcas: L.Marker[]; fantasmas: unknown[]; vertices(): LatLonPar[]; podeDesfazer: boolean; podeRefazer: boolean;
  noSelecionado: number | null; selecionarNo(i: number | null): void; excluirSelecionado(): boolean;
  desfazer(): boolean; refazer(): boolean; cancelar(): void; arrastarPara(i: number, c: LatLonPar, livre?: boolean): void;
};
const editorDe = (g: GerenciadorFeicoes) => (g as unknown as { editor: Editor }).editor;
const geo = (g: GerenciadorFeicoes, id = 'q') => g.obterFeicoes('c').find((f) => f.id === id)!.geometria as unknown as { aneis: LatLonPar[][]; coordenadas: LatLonPar[] };
const tecla = (key: string, o: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...o });
  window.dispatchEvent(e);
  return e;
};
const hud = () => document.querySelector('#cm-vertex-edit-hud') as HTMLElement;
const botao = (acao: string) => hud().querySelector(`[data-acao="${acao}"]`) as HTMLButtonElement;

describe('desfazer, refazer e cancelar', () => {
  it('cada gesto vira um passo: desfazer volta um a um, refazer reaplica', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    const original = JSON.stringify(geo(g));
    g.iniciarEdicao('c', 'q');
    const ed = editorDe(g);
    expect(ed.podeDesfazer).toBe(false);

    ed.arrastarPara(0, [-23.495, -46.605]);
    const depoisDoPrimeiro = JSON.stringify(geo(g));
    ed.arrastarPara(1, [-23.495, -46.585]);
    const depoisDoSegundo = JSON.stringify(geo(g));
    expect(ed.podeDesfazer).toBe(true);

    expect(ed.desfazer()).toBe(true);
    expect(JSON.stringify(geo(g))).toBe(depoisDoPrimeiro);
    expect(ed.vertices()).toEqual(JSON.parse(depoisDoPrimeiro).aneis[0]);
    expect(ed.desfazer()).toBe(true);
    expect(JSON.stringify(geo(g))).toBe(original);
    expect(ed.desfazer()).toBe(false);

    expect(ed.refazer()).toBe(true);
    expect(ed.refazer()).toBe(true);
    expect(JSON.stringify(geo(g))).toBe(depoisDoSegundo);
    expect(ed.refazer()).toBe(false);
  });

  it('um gesto novo descarta o que dava para refazer', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    const ed = editorDe(g);
    ed.arrastarPara(0, [-23.495, -46.605]);
    ed.desfazer();
    expect(ed.podeRefazer).toBe(true);
    ed.arrastarPara(2, [-23.52, -46.58]);
    expect(ed.podeRefazer).toBe(false);
  });

  it('inserir, excluir e curva ↔ canto também entram no histórico', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    const original = JSON.stringify(geo(g));
    g.iniciarEdicao('c', 'q');
    const ed = editorDe(g) as Editor & { inserirVerticeApos(i: number): void; excluirVertice(i: number): boolean; alternarSuavidadeDoNo(i: number): void };
    ed.inserirVerticeApos(0);
    expect(geo(g).aneis[0]).toHaveLength(5);
    ed.excluirVertice(3);
    expect(geo(g).aneis[0]).toHaveLength(4);
    ed.alternarSuavidadeDoNo(0);
    expect((g.obterFeicoes('c')[0].geometria as { curva?: unknown[] }).curva).toHaveLength(4);
    ed.desfazer();
    expect((g.obterFeicoes('c')[0].geometria as { curva?: unknown[] }).curva).toBeUndefined();
    ed.desfazer();
    expect(geo(g).aneis[0]).toHaveLength(5);
    ed.desfazer();
    expect(JSON.stringify(geo(g))).toBe(original);
  });

  it('Ctrl+Z, Ctrl+Shift+Z e Ctrl+Y no teclado; Ctrl+Z num campo de texto não mexe na geometria', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    const ed = editorDe(g);
    ed.arrastarPara(0, [-23.495, -46.605]);
    const campo = document.createElement('input');
    document.body.appendChild(campo);
    campo.focus();
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, composed: true }));
    expect(ed.podeDesfazer).toBe(true);
    campo.blur();
    campo.remove();

    expect(tecla('z', { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(ed.podeDesfazer).toBe(false);
    tecla('z', { ctrlKey: true, shiftKey: true });
    expect(ed.podeDesfazer).toBe(true);
    tecla('z', { metaKey: true });
    expect(ed.podeRefazer).toBe(true);
    tecla('y', { ctrlKey: true });
    expect(ed.podeRefazer).toBe(false);
  });

  it('o HUD tem Desfazer/Refazer que seguem o histórico (desabilitados quando não há o que fazer)', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    expect(botao('desfazer').disabled).toBe(true);
    expect(botao('refazer').disabled).toBe(true);
    editorDe(g).arrastarPara(0, [-23.495, -46.605]);
    expect(botao('desfazer').disabled).toBe(false);
    botao('desfazer').click();
    expect(botao('desfazer').disabled).toBe(true);
    expect(botao('refazer').disabled).toBe(false);
    botao('refazer').click();
    expect(geo(g).aneis[0][0]).toEqual([-23.495, -46.605]);
  });

  it('Cancelar volta à geometria de quando a edição começou e encerra, num gesto só', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [quadrado]);
    const original = JSON.stringify(geo(g));
    g.iniciarEdicao('c', 'q');
    const ed = editorDe(g);
    ed.arrastarPara(0, [-23.495, -46.605]);
    ed.arrastarPara(2, [-23.52, -46.58]);
    const antes = ev('cad-feicao-atualizada').length;
    botao('cancelar').click();
    expect(g.editando).toBe(false);
    expect(JSON.stringify(geo(g))).toBe(original);
    expect(ev('cad-feicao-atualizada').length - antes).toBe(1);
    expect(ev('cad-edicao-concluida')).toHaveLength(1);
  });

  it('Cancelar sem alterações não grava nada', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    botao('cancelar').click();
    expect(g.editando).toBe(false);
    expect(ev('cad-feicao-atualizada')).toHaveLength(0);
  });

  it('mudança de geometria vinda de fora zera o histórico; só estilo, não', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    const ed = editorDe(g);
    ed.arrastarPara(0, [-23.495, -46.605]);
    g.atualizarFeicao('c', 'q', { estilo: { corTraco: '#ff0000' } });
    expect(ed.podeDesfazer).toBe(true);
    g.atualizarFeicao('c', 'q', { geometria: { tipo: 'Polygon', aneis: [[[-23.4, -46.7], [-23.4, -46.6], [-23.5, -46.6]]] } });
    expect(ed.podeDesfazer).toBe(false);
    expect(ed.vertices()).toHaveLength(3);
  });

  it('Enter conclui a edição', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    tecla('Enter');
    expect(g.editando).toBe(false);
  });
});

describe('nó selecionado e exclusão', () => {
  it('clicar na alça seleciona o nó; Delete e Backspace o excluem', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    const ed = editorDe(g);
    expect(ed.noSelecionado).toBeNull();
    expect(botao('excluir-no').disabled).toBe(true);

    ed.alcas[1].fire('click', { originalEvent: new MouseEvent('click') } as never);
    expect(ed.noSelecionado).toBe(1);
    expect(botao('excluir-no').disabled).toBe(false);
    expect(ed.alcas[1].getElement()?.innerHTML ?? '').toContain('22d3ee'); // destaque

    expect(tecla('Delete').defaultPrevented).toBe(true);
    expect(geo(g).aneis[0]).toHaveLength(3);
    expect(ed.noSelecionado).toBeNull();

    // com o triângulo no mínimo, a tecla não exclui
    ed.selecionarNo(0);
    tecla('Backspace');
    expect(geo(g).aneis[0]).toHaveLength(3);
  });

  it('sem nó selecionado Delete/Backspace seguem o rumo normal', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    expect(tecla('Delete').defaultPrevented).toBe(false);
    expect(tecla('Backspace').defaultPrevented).toBe(false);
    expect(geo(g).aneis[0]).toHaveLength(4);
  });

  it('o botão Excluir nó exclui o selecionado; arrastar uma alça também a seleciona', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    const ed = editorDe(g);
    ed.arrastarPara(2, [-23.52, -46.58]);
    expect(ed.noSelecionado).toBe(2);
    botao('excluir-no').click();
    expect(geo(g).aneis[0]).toHaveLength(3);
  });

  it('excluir abaixo do mínimo avisa no HUD (botão direito, tecla e botão)', () => {
    vi.useFakeTimers();
    const { g } = novo();
    g.definirFeicoes('c', [triangulo, linha]);
    g.iniciarEdicao('c', 't');
    const ed = editorDe(g);
    const aviso = () => hud().querySelector('[data-campo="aviso"]')!.textContent;
    ed.alcas[0].fire('contextmenu', { originalEvent: new MouseEvent('contextmenu') } as never);
    expect(aviso()).toContain('Mínimo de 3');
    vi.advanceTimersByTime(3000);
    expect(aviso()).toBe('');

    ed.excluirSelecionado();
    expect(aviso()).toContain('Clique num nó');
    ed.selecionarNo(1);
    botao('excluir-no').click();
    expect(aviso()).toContain('Mínimo de 3');

    g.iniciarEdicao('c', 'l');
    editorDe(g).selecionarNo(0);
    tecla('Delete');
    expect(geo(g, 'l').coordenadas).toHaveLength(2);
    editorDe(g).selecionarNo(0);
    tecla('Delete');
    expect(hud().querySelector('[data-campo="aviso"]')!.textContent).toContain('Mínimo de 2');
  });

  it('ponto e círculo avisam que não há nós para excluir; só linha e polígono têm o botão Excluir nó', () => {
    const { g } = novo();
    g.definirFeicoes('c', [
      { id: 'p', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] } },
      { id: 'r', geometria: { tipo: 'Circle', centro: [-23.505, -46.595], raioMetros: 80 } }
    ]);
    g.iniciarEdicao('c', 'p');
    expect(hud().querySelector('[data-acao="excluir-no"]')).toBeNull();
    editorDe(g).alcas[0].fire('contextmenu', { originalEvent: new MouseEvent('contextmenu') } as never);
    expect(hud().querySelector('[data-campo="aviso"]')!.textContent).toContain('único nó');
    g.iniciarEdicao('c', 'r');
    editorDe(g).alcas[0].fire('contextmenu', { originalEvent: new MouseEvent('contextmenu') } as never);
    expect(hud().querySelector('[data-campo="aviso"]')!.textContent).toContain('Círculo');
  });

  it('inserir pelo fantasma deixa o nó novo selecionado', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    (editorDe(g) as unknown as { fantasmas: Array<{ marker: L.Marker }> }).fantasmas[1].marker.fire('click', { originalEvent: new MouseEvent('click') } as never);
    expect(editorDe(g).noSelecionado).toBe(2);
  });
});

describe('círculo: a alça da borda fica onde foi solta', () => {
  it('depois do gesto a alça não volta para o leste do centro', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ id: 'r', geometria: { tipo: 'Circle', centro: [-23.505, -46.595], raioMetros: 80 } }]);
    g.iniciarEdicao('c', 'r');
    const ed = editorDe(g);
    const norte: LatLonPar = [-23.505 + 0.0006, -46.595];
    ed.arrastarPara(1, norte);
    expect(ed.vertices()[1]).toEqual(norte);
    const raio = (g.obterFeicoes('c')[0].geometria as { raioMetros: number }).raioMetros;
    expect(raio).toBeGreaterThan(60);
    expect(raio).toBeLessThan(75);
  });

  it('mover o centro continua levando a borda junto', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ id: 'r', geometria: { tipo: 'Circle', centro: [-23.505, -46.595], raioMetros: 80 } }]);
    g.iniciarEdicao('c', 'r');
    const ed = editorDe(g);
    const [antesC, antesB] = ed.vertices();
    ed.arrastarPara(0, [antesC[0] + 0.001, antesC[1] + 0.001]);
    const [c, b] = ed.vertices();
    expect(b[0] - c[0]).toBeCloseTo(antesB[0] - antesC[0], 9);
    expect(b[1] - c[1]).toBeCloseTo(antesB[1] - antesC[1], 9);
    expect((g.obterFeicoes('c')[0].geometria as { raioMetros: number }).raioMetros).toBeCloseTo(80, 0);
  });
});

describe('mudança externa durante o arraste', () => {
  it('não reconstrói as alças enquanto uma delas é arrastada; o gesto em curso vence ao soltar', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    const ed = editorDe(g);
    const alca = ed.alcas[0];
    alca.fire('dragstart');
    g.atualizarFeicao('c', 'q', { estilo: { corTraco: '#00ff00' } });
    g.atualizarFeicao('c', 'q', { geometria: { tipo: 'Polygon', aneis: [[[-23.4, -46.7], [-23.4, -46.6], [-23.5, -46.6]]] } });
    expect(ed.alcas[0]).toBe(alca); // a alça arrastada continua viva
    expect(ed.alcas).toHaveLength(4);

    alca.fire('dragend');
    expect(g.editando).toBe(true);
    expect(geo(g).aneis[0]).toHaveLength(4); // a geometria do gesto foi gravada por cima
  });
});

describe('fantasmas só onde cabem', () => {
  it('segmentos curtos na tela não ganham fantasma; ao aproximar eles aparecem', () => {
    const { g, map } = novo();
    const d = 0.00002; // ~2 m: cerca de 1 px no zoom 16
    g.definirFeicoes('c', [{ id: 'm', geometria: { tipo: 'Polygon', aneis: [[[-23.505, -46.595], [-23.505, -46.595 + d], [-23.505 - d, -46.595 + d], [-23.505 - d, -46.595]]] } }]);
    g.iniciarEdicao('c', 'm');
    expect(editorDe(g).fantasmas).toHaveLength(0);
    expect(editorDe(g).alcas).toHaveLength(4);
    map.setView([-23.505, -46.595], 22, { animate: false });
    expect(editorDe(g).fantasmas).toHaveLength(4);
    map.setView([-23.505, -46.595], 14, { animate: false });
    expect(editorDe(g).fantasmas).toHaveLength(0);
  });

  it('depois de encerrar a edição o zoom não mexe em nada', () => {
    const { g, map } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    g.pararEdicao();
    expect(() => map.setView([-23.505, -46.595], 18, { animate: false })).not.toThrow();
    expect(document.querySelectorAll('.cad-vertex-handle')).toHaveLength(0);
  });
});

describe('retângulo continua retângulo', () => {
  const retangulo = (g: GerenciadorFeicoes) => {
    const [a, b, c, d] = geo(g).aneis[0];
    return (a[0] === b[0] && b[1] === c[1] && c[0] === d[0] && d[1] === a[1]) || (a[1] === b[1] && b[0] === c[0] && c[1] === d[1] && d[0] === a[0]);
  };

  it('arrastar um canto move os vizinhos e fixa o oposto', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    editorDe(g).arrastarPara(2, [-23.52, -46.58]);
    expect(geo(g).aneis[0]).toEqual([[-23.5, -46.6], [-23.5, -46.58], [-23.52, -46.58], [-23.52, -46.6]]);
    expect(retangulo(g)).toBe(true);
    editorDe(g).arrastarPara(0, [-23.49, -46.61]);
    expect(retangulo(g)).toBe(true);
    expect(geo(g).aneis[0][2]).toEqual([-23.52, -46.58]); // o oposto não se mexeu
  });

  it('com Shift (livre) só o canto arrastado se move e deixa de ser retângulo', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.iniciarEdicao('c', 'q');
    editorDe(g).arrastarPara(2, [-23.52, -46.58], true);
    expect(geo(g).aneis[0]).toEqual([[-23.5, -46.6], [-23.5, -46.59], [-23.52, -46.58], [-23.51, -46.6]]);
    expect(retangulo(g)).toBe(false);
    editorDe(g).arrastarPara(0, [-23.49, -46.61]); // já é polígono livre
    expect(geo(g).aneis[0]).toEqual([[-23.49, -46.61], [-23.5, -46.59], [-23.52, -46.58], [-23.51, -46.6]]);
  });

  it('polígono que não é retângulo e polígono com curva ficam livres', () => {
    const { g } = novo();
    g.definirFeicoes('c', [triangulo, { id: 'torto', geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.512, -46.588], [-23.51, -46.6]]] } }]);
    g.iniciarEdicao('c', 'torto');
    editorDe(g).arrastarPara(0, [-23.49, -46.61]);
    expect(geo(g, 'torto').aneis[0]).toEqual([[-23.49, -46.61], [-23.5, -46.59], [-23.512, -46.588], [-23.51, -46.6]]);
  });

  it('desfazer volta um canto arrastado do retângulo inteiro', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    const original = JSON.stringify(geo(g));
    g.iniciarEdicao('c', 'q');
    editorDe(g).arrastarPara(2, [-23.52, -46.58]);
    editorDe(g).desfazer();
    expect(JSON.stringify(geo(g))).toBe(original);
    editorDe(g).arrastarPara(1, [-23.49, -46.57]); // ainda retângulo depois do desfazer
    expect(retangulo(g)).toBe(true);
  });
});

describe('entradas de edição', () => {
  const circulo = { id: 'r', geometria: { tipo: 'Circle', centro: [-23.505, -46.595], raioMetros: 80 } };
  const texto = { id: 'x', geometria: { tipo: 'Text', coordenada: [-23.505, -46.595], texto: 'oi' } };

  // duplo clique segue o contrato da 2.8.1 (pedido de informações: popup); a edição abre por Enter, pelo botão Editar ou pelo popup
  function ponteiro(o: { emitir?: (e: string, d: unknown, c?: boolean) => unknown; ocupado?: boolean; popup?: boolean } = {}) {
    const eventos: Array<[string, any]> = [];
    const abertos: string[] = [];
    const feicao = { id: 'q', camadaId: 'c', geometria: quadrado.geometria } as unknown as Feicao;
    const p = new PonteiroFeicoes({
      emitir: (e, d, c) => { eventos.push([e, d]); return o.emitir?.(e, d, c); },
      feicaoSob: () => ({ feicao, coordenada: [-23.505, -46.595] }),
      interacaoAtiva: () => !!o.ocupado,
      botaoDireitoDaFerramenta: () => false,
      abrirPopup: (f) => abertos.push(f.id),
      popupNoDuploClique: () => o.popup ?? true
    });
    return { p, eventos, abertos };
  }
  const duplo = () => new MouseEvent('dblclick', { clientX: 10, clientY: 10 });

  it('duplo clique sobre a feição emite cad-feicao-duplo-clique (cancelável) e abre o popup, sem editar', () => {
    const { p, eventos, abertos } = ponteiro();
    p.duploClique(duplo());
    expect(eventos.map(([e]) => e)).toEqual(['cad-feicao-duplo-clique']);
    expect(eventos[0][1]).toMatchObject({ camadaId: 'c', feicao: { id: 'q' } });
    expect(abertos).toEqual(['q']);
  });

  it('com preventDefault() no evento, o consumidor assume e o popup não abre', () => {
    const { p, abertos } = ponteiro({ emitir: (e, _d, c) => c === true && e === 'cad-feicao-duplo-clique' });
    p.duploClique(duplo());
    expect(abertos).toEqual([]);
  });

  it('popups desligados: o evento sai, o popup não; com desenho ou edição em curso nada acontece', () => {
    const desligado = ponteiro({ popup: false });
    desligado.p.duploClique(duplo());
    expect(desligado.eventos).toHaveLength(1);
    expect(desligado.abertos).toEqual([]);
    const ocupado = ponteiro({ ocupado: true });
    ocupado.p.duploClique(duplo());
    expect(ocupado.eventos).toHaveLength(0);
    expect(ocupado.abertos).toEqual([]);
  });

  it('Enter: texto, feição bloqueada e camada bloqueada não editam nem emitem recusa; círculo edita', () => {
    const { g, lm, ev } = novo();
    g.definirFeicoes('c', [texto, { ...quadrado, id: 'b', bloqueada: true }, circulo]);
    g.conectarTeclado();
    for (const id of ['x', 'b']) {
      g.selecionarFeicoes([{ camadaId: 'c', id }]);
      tecla('Enter');
    }
    expect(g.editando).toBe(false);
    expect(ev('cad-edicao-recusada')).toHaveLength(0);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'r' }]);
    tecla('Enter');
    expect(g.editando).toBe(true);
    g.pararEdicao();
    lm.setLayerBlocked('c', true);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'r' }]);
    tecla('Enter');
    expect(g.editando).toBe(false);
    g.desconectarTeclado();
  });

  it('com uma ferramenta de desenho ativa o Enter não abre a edição', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado]);
    g.conectarTeclado();
    g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]);
    g.ativarFerramenta('medir-distancia');
    tecla('Enter');
    expect(g.editando).toBe(false);
    g.desconectarTeclado();
  });

  it('Enter com uma feição editável selecionada abre a edição, uma vez só', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quadrado, triangulo]);
    g.conectarTeclado();
    g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]);
    const e = tecla('Enter');
    expect(g.editando).toBe(true); // e continua editando: o mesmo Enter não conclui o que acabou de abrir
    expect(e.defaultPrevented).toBe(true);
    g.pararEdicao();
    g.desconectarTeclado();
  });

  it('Enter não abre com várias selecionadas, sem seleção, texto, bloqueada, campo de texto, ferramenta ativa ou atalho inválido', () => {
    let valido = true;
    const { g } = novo({ atalhoValido: () => valido });
    g.definirFeicoes('c', [quadrado, triangulo, texto, { ...linha, id: 'bl', bloqueada: true }]);
    g.conectarTeclado();

    tecla('Enter');
    expect(g.editando).toBe(false); // nada selecionado
    g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }, { camadaId: 'c', id: 't' }]);
    tecla('Enter');
    expect(g.editando).toBe(false);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'x' }]);
    tecla('Enter');
    expect(g.editando).toBe(false);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'bl' }]);
    tecla('Enter');
    expect(g.editando).toBe(false);

    g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]);
    valido = false;
    tecla('Enter');
    expect(g.editando).toBe(false);
    valido = true;

    const campo = document.createElement('input');
    document.body.appendChild(campo);
    campo.focus();
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    expect(g.editando).toBe(false);
    campo.remove();

    const b = document.createElement('button');
    document.body.appendChild(b);
    b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    expect(g.editando).toBe(false);
    b.remove();

    g.definirCamadaDesenho('d');
    g.ativarFerramenta('linha');
    tecla('Enter');
    expect(g.editando).toBe(false);
    g.desativarFerramenta();
    g.desconectarTeclado();
  });

  it('o botão Editar da barra alterna a edição da seleção e recusa sem seleção', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [quadrado]);
    expect(g.alternarEdicaoDaSelecao()).toEqual({ ok: false, motivo: 'sem-selecao' });
    expect(ev('cad-edicao-recusada')[0]).toMatchObject({ motivo: 'sem-selecao' });
    g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]);
    expect(g.alternarEdicaoDaSelecao().ok).toBe(true);
    expect(g.editando).toBe(true);
    expect(g.alternarEdicaoDaSelecao().ok).toBe(true);
    expect(g.editando).toBe(false);
  });
});

describe('barra de ferramentas: botão Editar', () => {
  it('o atributo pede a edição por "todas" ou "editar"', () => {
    expect(barraPedeEdicao('todas')).toBe(true);
    expect(barraPedeEdicao('linha, editar')).toBe(true);
    expect(barraPedeEdicao('linha poligono')).toBe(false);
    expect(barraPedeEdicao(null)).toBe(false);
  });

  async function montar(ferramentas: string) {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    el.setAttribute('ferramentas', ferramentas);
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 20));
    el.inicializarAgora();
    return el;
  }
  const botaoEditar = (el: UICanvasCAD) => el.shadowRoot!.querySelector('[data-acao="editar"]') as HTMLButtonElement | null;

  it('só com `editar` já aparece a barra, e o botão acompanha o estado da edição', async () => {
    const el = await montar('editar');
    el.definirFeicoes('c', [quadrado]);
    const b = botaoEditar(el)!;
    expect(b).toBeTruthy();
    expect(b.getAttribute('aria-pressed')).toBe('false');
    const recusas: unknown[] = [];
    el.addEventListener('cad-edicao-recusada', (e) => recusas.push((e as CustomEvent).detail));
    b.click();
    expect(recusas).toHaveLength(1);

    el.selecionarFeicao('c', 'q');
    b.click();
    expect(el.editandoVertices).toBe(true);
    expect(botaoEditar(el)!.getAttribute('aria-pressed')).toBe('true');
    botaoEditar(el)!.click();
    expect(el.editandoVertices).toBe(false);
    expect(botaoEditar(el)!.getAttribute('aria-pressed')).toBe('false');
  });

  it('sem `editar` (e sem `todas`) não há botão; trocar o atributo remonta a barra', async () => {
    const el = await montar('linha');
    expect(botaoEditar(el)).toBeNull();
    el.setAttribute('ferramentas', 'todas');
    expect(botaoEditar(el)).toBeTruthy();
    el.setAttribute('ferramentas', 'linha');
    expect(botaoEditar(el)).toBeNull();
  });
});

describe('S e Enter com vários canvases', () => {
  async function dois() {
    const a = document.createElement('ui-canvas-cad') as UICanvasCAD;
    const b = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.append(a, b);
    await new Promise((r) => setTimeout(r, 20));
    return { a, b };
  }

  it('com um canvas só, S vale em qualquer lugar da página (como sempre)', async () => {
    const a = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(a);
    await new Promise((r) => setTimeout(r, 20));
    tecla('s');
    expect(a.snapLigado).toBe(false);
  });

  it('com dois, S alterna só o que está sob o mouse', async () => {
    const { a, b } = await dois();
    tecla('s');
    expect(a.snapLigado).toBe(true);
    expect(b.snapLigado).toBe(true);

    b.dispatchEvent(new MouseEvent('mouseenter'));
    tecla('s');
    expect(a.snapLigado).toBe(true);
    expect(b.snapLigado).toBe(false);

    b.dispatchEvent(new MouseEvent('mouseleave'));
    a.dispatchEvent(new MouseEvent('mouseenter'));
    tecla('s');
    expect(a.snapLigado).toBe(false);
    expect(b.snapLigado).toBe(false);
  });

  it('ControleSnap: `aplica` falso ignora a tecla; verdadeiro (ou ausente) deixa passar', () => {
    let aplica = false;
    const ouvintes = new Map<string, EventListener>();
    const alvo = {
      addEventListener: (t: string, f: EventListener) => { ouvintes.set(t, f); },
      removeEventListener: () => undefined
    };
    const s = new ControleSnap({ aoMudar: vi.fn(), alvo: alvo as never, aplica: () => aplica });
    s.conectar();
    ouvintes.get('keydown')!({ key: 's' } as unknown as Event);
    expect(s.ligado).toBe(true);
    aplica = true;
    ouvintes.get('keydown')!({ key: 's' } as unknown as Event);
    expect(s.ligado).toBe(false);
  });
});

describe('desenho: avisos de recusa', () => {
  function comFerramenta(nome: string) {
    const c = novo();
    c.g.definirCamadaDesenho('d');
    expect(c.g.ativarFerramenta(nome).ok).toBe(true);
    const desenho = (c.g as unknown as { desenho: ControleDesenho }).desenho;
    const aviso = () => c.el.querySelector('#cm-draw-hud [data-campo="aviso"]')!.textContent;
    return { ...c, desenho, aviso };
  }

  it('a sessão devolve o motivo da recusa', () => {
    const c: LatLonPar = [-23.5, -46.6];
    const circulo = new SessaoDesenho('circulo');
    circulo.clicar(c);
    expect(circulo.clicar(c).aviso).toContain('Raio mínimo');
    const retangulo = new SessaoDesenho('retangulo');
    retangulo.clicar(c);
    expect(retangulo.clicar([-23.5, -46.59]).aviso).toContain('diferir');
    const elipse = new SessaoDesenho('elipse');
    elipse.clicar(c);
    expect(elipse.clicar(c).aviso).toContain('diferente do centro');
    expect(new SessaoDesenho('ponto').clicar(c).aviso).toBeUndefined();
  });

  it('círculo curto demais, retângulo alinhado e elipse sem raio avisam no HUD', () => {
    const circulo = comFerramenta('circulo');
    circulo.desenho.clicarEm([-23.5, -46.6]);
    expect(circulo.aviso()).toBe('');
    circulo.desenho.clicarEm([-23.5, -46.6]);
    expect(circulo.aviso()).toContain('Raio mínimo');

    const retangulo = comFerramenta('retangulo');
    retangulo.desenho.clicarEm([-23.5, -46.6]);
    retangulo.desenho.clicarEm([-23.5, -46.59]);
    expect(retangulo.aviso()).toContain('diferir');
  });

  it('Enter/duplo clique com pontos de menos avisa quantos faltam e mantém a figura', () => {
    const { desenho, aviso } = comFerramenta('poligono');
    desenho.clicarEm([-23.5, -46.6]);
    desenho.concluir();
    expect(aviso()).toContain('Faltam 2');
    desenho.clicarEm([-23.5, -46.59]);
    desenho.concluir();
    expect(aviso()).toContain('Faltam 1');
    expect(desenho.nos).toBe(2);
  });

  it('sem nenhum ponto, concluir não avisa; linha com 1 ponto pede mais 1', () => {
    const { desenho, aviso } = comFerramenta('linha');
    desenho.concluir();
    expect(aviso()).toBe('');
    desenho.clicarEm([-23.5, -46.6]);
    desenho.concluir();
    expect(aviso()).toContain('Faltam 1');
  });

  it('o aviso some sozinho e ao sair da ferramenta o HUD vai embora sem pendências', () => {
    vi.useFakeTimers();
    const { desenho, aviso, g } = comFerramenta('linha');
    desenho.clicarEm([-23.5, -46.6]);
    desenho.concluir();
    expect(aviso()).not.toBe('');
    vi.advanceTimersByTime(3000);
    expect(aviso()).toBe('');
    desenho.concluir();
    g.desativarFerramenta();
    expect(() => vi.advanceTimersByTime(3000)).not.toThrow();
    expect(document.querySelector('#cm-draw-hud')).toBeNull();
  });
});

describe('toque: alças de edição não movem o mapa', () => {
  async function canvas() {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 20));
    const mapa = el.getMap()!;
    const painel = el.shadowRoot!.getElementById('cad-map-container')!;
    return { el, mapa, painel };
  }
  const toque = (tipo: string, x: number, y: number) => {
    const e = new Event(tipo, { bubbles: true, cancelable: true, composed: true });
    Object.defineProperty(e, 'touches', { value: tipo === 'touchend' ? [] : [{ clientX: x, clientY: y }] });
    return e;
  };

  it.each(['cad-vertex-handle', 'cad-bezier-handle', 'cad-vertex-ghost'])('arrastar .%s não faz pan', async (classe) => {
    const { mapa, painel } = await canvas();
    const pan = vi.spyOn(mapa, 'panBy');
    const alca = document.createElement('div');
    alca.className = classe;
    painel.appendChild(alca);
    alca.dispatchEvent(toque('touchstart', 10, 10));
    const mover = toque('touchmove', 40, 40);
    alca.dispatchEvent(mover);
    expect(pan).not.toHaveBeenCalled();
    expect(mover.defaultPrevented).toBe(false);
    alca.dispatchEvent(toque('touchend', 40, 40));
  });

  it('controle: arrastar o vazio do mapa continua fazendo pan', async () => {
    const { mapa, painel } = await canvas();
    const pan = vi.spyOn(mapa, 'panBy');
    painel.dispatchEvent(toque('touchstart', 10, 10));
    const mover = toque('touchmove', 40, 40);
    painel.dispatchEvent(mover);
    expect(pan).toHaveBeenCalledTimes(1);
    expect(mover.defaultPrevented).toBe(true);
    painel.dispatchEvent(toque('touchend', 40, 40));
  });
});
