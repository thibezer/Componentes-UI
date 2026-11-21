// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { rotacao } from '../src/gerencigeo-canvas/espaco/espaco_matriz';
import { contornoNaFolha, envelopeNaFolha, limitesNaFolha } from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import { criarCaminho, criarElipse, criarLinha, criarRetangulo, criarTexto } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { transformarElemento } from '../src/gerencigeo-canvas/prancha/elemento_transformacao';
import {
  IndicePrancha, elementoNoTopo, elementosNaCaixa, elementosNoLaco, elementosNoPonto, ordenarPorEmpilhamento
} from '../src/gerencigeo-canvas/prancha/elemento_consulta';
import { buscarSnapPrancha } from '../src/gerencigeo-canvas/prancha/elemento_snap';
import {
  adicionarAncora, alcasDoElemento, ancorasDoElemento, converterAncora, converterEmCaminho, excluirAncora, moverAlcaDaAncora,
  moverAncora, moverAncoras
} from '../src/gerencigeo-canvas/prancha/elemento_edicao';
import { Historico } from '../src/gerencigeo-canvas/feature_historico';
import { ESPACO_PLANO } from '../src/gerencigeo-canvas/espaco/espaco_plano';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import type { Par } from '../src/gerencigeo-canvas/feature_types';

/* Fase 1 da prancha, Camada A: hit-test, caixa, laço, índice, snap, edição de âncoras e histórico no espaço plano. */

const cheio = { preenchimento: { cor: '#f00' }, traco: { espessura: 0.5 } };
const vazio = { traco: { espessura: 0.5 } };
const ret = (id: string, x: number, y: number, w = 20, h = 10, ap: ElementoGrafico['aparencia'] = cheio, extra: Partial<ElementoGrafico> = {}) =>
  ({ ...criarRetangulo({ id, aparencia: ap }, { x, y, largura: w, altura: h })!, ...extra });
const perto = (a: Par, b: Par, casas = 9) => {
  expect(a[0]).toBeCloseTo(b[0], casas);
  expect(a[1]).toBeCloseTo(b[1], casas);
};
function semente(n: number) {
  let s = n;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

describe('hit-test na folha', () => {
  it('preenchido acerta no interior; sem preenchimento só perto do traço (tolerância + meia espessura)', () => {
    const a = ret('a', 0, 0, 20, 10, cheio);
    const b = ret('b', 0, 0, 20, 10, vazio);
    expect(elementosNoPonto([10, 5], [a]).map((x) => x.distancia)).toEqual([0]);
    expect(elementosNoPonto([10, 5], [b])).toEqual([]);
    expect(elementosNoPonto([10, 1.2], [b], { tolerancia: 1 })[0].distancia).toBeCloseTo(1.2, 9);
    expect(elementosNoPonto([10, 1.3], [b], { tolerancia: 1 })).toEqual([]);
    expect(elementosNoPonto([10, -1.2], [b], { tolerancia: 1 })).toHaveLength(1);
  });

  it('o mais à frente primeiro: ordem explícita, depois posição na lista', () => {
    const a = ret('a', 0, 0);
    const b = ret('b', 5, 0);
    const c = { ...ret('c', 5, 2), ordem: -1 };
    expect(ordenarPorEmpilhamento([a, b, c]).map((e) => e.id)).toEqual(['c', 'a', 'b']);
    expect(elementosNoPonto([8, 5], [a, b, c]).map((x) => x.elemento.id)).toEqual(['b', 'a', 'c']);
    expect(elementoNoTopo([8, 5], [a, b, c])?.id).toBe('b');
  });

  it('oculto nunca; bloqueado só com incluirBloqueados', () => {
    const a = ret('a', 0, 0, 20, 10, cheio, { oculto: true });
    const b = ret('b', 0, 0, 20, 10, cheio, { bloqueado: true });
    expect(elementosNoPonto([5, 5], [a, b])).toEqual([]);
    expect(elementosNoPonto([5, 5], [a, b], { incluirBloqueados: true }).map((x) => x.elemento.id)).toEqual(['b']);
  });

  it('elemento girado, elipse, linha e texto', () => {
    const girado = transformarElemento(ret('g', 0, 0, 40, 2), rotacao(Math.PI / 2, [20, 1]));
    expect(elementoNoTopo([20, 15], [girado])?.id).toBe('g');
    expect(elementoNoTopo([35, 1], [girado])).toBeNull();
    const elipse = criarElipse({ id: 'e', aparencia: cheio }, { x: 0, y: 0, largura: 40, altura: 20 })!;
    expect(elementoNoTopo([20, 10], [elipse])?.id).toBe('e');
    expect(elementoNoTopo([1, 1], [elipse])).toBeNull();
    const linha = criarLinha({ id: 'l' }, [0, 0], [100, 0])!;
    expect(elementoNoTopo([50, 0.5], [linha])?.id).toBe('l');
    const texto = criarTexto({ id: 't' }, [10, 10], 'Legenda', 5)!;
    expect(elementoNoTopo([12, 8], [texto])?.id).toBe('t');
  });
});

describe('seleção por caixa (Window/Crossing) e laço', () => {
  const a = ret('a', 0, 0);
  const b = ret('b', 30, 0);
  const caixa = { x: -1, y: -1, largura: 35, altura: 12 };

  it('window exige inteiro dentro; crossing basta tocar; a caixa pode ser arrastada para trás', () => {
    expect(elementosNaCaixa(caixa, [a, b], 'window').map((e) => e.id)).toEqual(['a']);
    expect(elementosNaCaixa(caixa, [a, b], 'crossing').map((e) => e.id)).toEqual(['a', 'b']);
    expect(elementosNaCaixa({ x: 34, y: 11, largura: -35, altura: -12 }, [a, b], 'crossing')).toHaveLength(2);
    expect(elementosNaCaixa({ x: NaN, y: 0, largura: 1, altura: 1 }, [a], 'crossing')).toEqual([]);
  });

  it('laço', () => {
    const laco: Par[] = [[-5, -5], [25, -5], [25, 15], [-5, 15]];
    expect(elementosNoLaco(laco, [a, b]).map((e) => e.id)).toEqual(['a']);
    expect(elementosNoLaco(laco.slice(0, 2), [a, b])).toEqual([]);
  });
});

describe('índice da prancha', () => {
  it('as consultas batem com a varredura linear (propriedade, 500 elementos, atualizações e remoções)', () => {
    const r = semente(7);
    const els = Array.from({ length: 500 }, (_, i) => ret(`e${i}`, r() * 400, r() * 300, 1 + r() * 30, 1 + r() * 30));
    const ind = new IndicePrancha();
    ind.definir(els);
    const vivos = new Map(els.map((e) => [e.id, e]));
    for (let i = 0; i < 100; i++) {
      const el = vivos.get(`e${i}`)!;
      const novo = transformarElemento(el, rotacao(r(), [r() * 400, r() * 300]));
      vivos.set(el.id, novo);
      ind.atualizar(novo);
    }
    for (let i = 100; i < 150; i++) { vivos.delete(`e${i}`); ind.remover(`e${i}`); }
    expect(ind.tamanho).toBe(450);
    for (let k = 0; k < 50; k++) {
      const c = { x: r() * 400, y: r() * 300, largura: r() * 80, altura: r() * 80 };
      const toca = (l: { x: number; y: number; largura: number; altura: number }) =>
        l.x <= c.x + c.largura && l.x + l.largura >= c.x && l.y <= c.y + c.altura && l.y + l.altura >= c.y;
      const achados = ind.consultarCaixa(c).map((e) => e.id).sort();
      // o índice usa o envelope conservador (4 cantos da caixa local): igual à varredura por ele...
      expect(achados).toEqual([...vivos.values()].filter((e) => toca(envelopeNaFolha(e)!)).map((e) => e.id).sort());
      // ...e nunca perde um elemento cujo envelope exato toca a caixa
      for (const e of vivos.values()) if (toca(limitesNaFolha(e)!)) expect(achados).toContain(e.id);
    }
  });

  it('atualizar em lote dá o mesmo resultado que um a um', () => {
    const r = semente(3);
    const els = Array.from({ length: 300 }, (_, i) => ret(`e${i}`, r() * 400, r() * 300));
    const movidos = els.map((e) => transformarElemento(e, rotacao(0.3, [200, 150])));
    const a = new IndicePrancha();
    const b = new IndicePrancha();
    a.definir(els);
    b.definir(els);
    a.atualizarVarios(movidos);
    for (const m of movidos) b.atualizar(m);
    const c = { x: 50, y: 50, largura: 200, altura: 150 };
    expect(a.consultarCaixa(c).map((e) => e.id).sort()).toEqual(b.consultarCaixa(c).map((e) => e.id).sort());
    expect(a.obter('e0')).toBe(movidos[0]);
  });

  it('elemento degenerado sai do índice; entrada inválida devolve vazio', () => {
    const ind = new IndicePrancha();
    ind.definir([ret('a', 0, 0)]);
    ind.atualizar({ id: 'a', geometria: { tipo: 'retangulo', largura: 0, altura: 1 } });
    expect(ind.tamanho).toBe(0);
    expect(ind.consultarCaixa({ x: NaN, y: 0, largura: 1, altura: 1 })).toEqual([]);
  });
});

describe('snap na folha', () => {
  const a = ret('a', 0, 0, 20, 10);
  const circ = criarElipse({ id: 'c' }, { x: 100, y: 100, largura: 20, altura: 20 })!;

  it('prioridade: vértice > canto > centro > meio > guia > aresta > grade', () => {
    // escala 4 px/mm, tolerância 10 px = 2,5 mm
    expect(buscarSnapPrancha([0.5, 0.5], [a], 4)?.tipo).toBe('vertice');
    expect(buscarSnapPrancha([10.5, 5], [a], 4)).toMatchObject({ tipo: 'centro', coordenada: [10, 5], elementoId: 'a' });
    expect(buscarSnapPrancha([10.5, 0.4], [a], 4)).toMatchObject({ tipo: 'meio', coordenada: [10, 0] });
    expect(buscarSnapPrancha([15, 0.4], [a], 4)).toMatchObject({ tipo: 'aresta' });
    expect(buscarSnapPrancha([15, 0.4], [a], 4, { guias: [{ orientacao: 'horizontal', posicao: 1 }] })).toMatchObject({ tipo: 'guia', coordenada: [15, 1] });
    expect(buscarSnapPrancha([51.2, 49.1], [a], 4, { grade: { espacamento: 5 } })).toMatchObject({ tipo: 'grade', coordenada: [50, 50] });
    expect(buscarSnapPrancha([52.2, 47.9], [a], 4, { grade: { espacamento: 5 } })).toBeNull();
    expect(buscarSnapPrancha([51.2, 49.1], [a], 4)).toBeNull();
  });

  it('cantos e centro vêm da caixa orientada (a elipse não tem vértice no canto da caixa)', () => {
    expect(buscarSnapPrancha([100.5, 100.5], [circ], 4)).toMatchObject({ tipo: 'canto', coordenada: [100, 100] });
    expect(buscarSnapPrancha([110.3, 110.2], [circ], 4)).toMatchObject({ tipo: 'centro' });
    expect(buscarSnapPrancha([100.5, 100.5], [circ], 4, { canto: false })).toBeNull();
  });

  it('a tolerância é em px de tela (depende do zoom); excluídos e ocultos não atraem', () => {
    expect(buscarSnapPrancha([3, 0], [a], 4)).toMatchObject({ tipo: 'aresta' });
    expect(buscarSnapPrancha([3, 0.8], [a], 20)).toBeNull();
    expect(buscarSnapPrancha([0.5, 0.5], [a], 4, {}, ['a'])).toBeNull();
    expect(buscarSnapPrancha([0.5, 0.5], [{ ...a, oculto: true }], 4)).toBeNull();
    expect(buscarSnapPrancha([NaN, 0], [a], 4)).toBeNull();
    expect(buscarSnapPrancha([0, 0], [a], 0)).toBeNull();
  });
});

describe('edição de âncoras (seleção direta)', () => {
  const girado = transformarElemento(ret('r', 0, 0, 20, 10), rotacao(0.4, [10, 5]));

  it('mover uma âncora converte a forma em caminho e a âncora vai exatamente ao destino (na folha)', () => {
    const novo = moverAncora(girado, 2, [40, 40])!;
    expect(novo.geometria.tipo).toBe('caminho');
    perto(ancorasDoElemento(novo)[2], [40, 40]);
    perto(ancorasDoElemento(novo)[0], ancorasDoElemento(girado)[0]);
    expect(novo.transformacao).toEqual(girado.transformacao);
  });

  it('mover várias âncoras pelo mesmo deslocamento', () => {
    const novo = moverAncoras(girado, [0, 1, 1, 99], 5, -2)!;
    const [a0, a1] = ancorasDoElemento(girado);
    perto(ancorasDoElemento(novo)[0], [a0[0] + 5, a0[1] - 2]);
    perto(ancorasDoElemento(novo)[1], [a1[0] + 5, a1[1] - 2]);
  });

  it('adicionar âncora numa curva não muda o desenho; excluir respeita o mínimo', () => {
    const elipse = criarElipse({ id: 'e' }, { x: 0, y: 0, largura: 40, altura: 20 })!;
    const area0 = ESPACO_PLANO.area((contornoNaFolha(elipse) as { aneis: Par[][] }).aneis);
    const mais = adicionarAncora(elipse, 0, [35, 8])!;
    expect(ancorasDoElemento(mais)).toHaveLength(5);
    expect(ESPACO_PLANO.area((contornoNaFolha(mais) as { aneis: Par[][] }).aneis)).toBeCloseTo(area0, 0);
    const tri = criarCaminho({ id: 't' }, { tipo: 'Polygon', aneis: [[[0, 0], [10, 0], [5, 8]]] })!;
    expect(excluirAncora(tri, 0)).toBeNull();
    expect(ancorasDoElemento(excluirAncora(ret('q', 0, 0), 0)!)).toHaveLength(3);
  });

  it('converter âncora canto ↔ suave e mover alça (simétrica ou livre)', () => {
    const q = ret('q', 0, 0);
    const suave = converterAncora(q, 1)!;
    const alca = alcasDoElemento(suave)[1];
    expect(alca.entrada && alca.saida).toBeTruthy();
    expect(alcasDoElemento(converterAncora(suave, 1)!)[1]).toEqual({});
    const movida = moverAlcaDaAncora(suave, 1, 'saida', [30, 5])!;
    const [ax, ay] = ancorasDoElemento(movida)[1];
    perto(alcasDoElemento(movida)[1].entrada!, [2 * ax - 30, 2 * ay - 5]);
    const livre = moverAlcaDaAncora(suave, 1, 'saida', [30, 5], false)!;
    perto(alcasDoElemento(livre)[1].entrada!, alca.entrada!);
  });

  it('recusas: texto, bloqueado, índice fora, matriz singular, coordenada inválida', () => {
    const texto = criarTexto({ id: 't' }, [0, 0], 'x', 3)!;
    expect(converterEmCaminho(texto)).toBeNull();
    expect(ancorasDoElemento(texto)).toEqual([]);
    expect(moverAncora({ ...ret('b', 0, 0), bloqueado: true }, 0, [1, 1])).toBeNull();
    expect(moverAncora(ret('b', 0, 0), 9, [1, 1])).toBeNull();
    expect(moverAncora(ret('b', 0, 0), 0, [NaN, 1])).toBeNull();
    expect(moverAncora({ ...ret('b', 0, 0), transformacao: { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 } }, 0, [1, 1])).toBeNull();
    expect(converterAncora(ret('b', 0, 0), -1)).toBeNull();
    expect(adicionarAncora(criarLinha({ id: 'l' }, [0, 0], [10, 0])!, 1, [5, 0])).toBeNull();
  });
});

describe('histórico (desfazer/refazer determinístico com rajadas)', () => {
  it('desfaz e refaz estados inteiros; registrar apaga o refazer', () => {
    const h = new Historico<number>();
    let estado = 0;
    const mudar = (v: number, chave?: string, agora = 0) => { h.registrar(estado, { chave, agora }); estado = v; };
    mudar(1, undefined, 0);
    mudar(2, undefined, 10);
    expect(estado = h.desfazer(estado)!).toBe(1);
    expect(estado = h.desfazer(estado)!).toBe(0);
    expect(h.desfazer(estado)).toBeNull();
    expect(estado = h.refazer(estado)!).toBe(1);
    mudar(5, undefined, 20);
    expect(h.podeRefazer).toBe(false);
    expect(h.refazer(estado)).toBeNull();
  });

  it('mudanças seguidas no mesmo campo (dentro da janela) viram um passo; fora da janela ou outra chave, não', () => {
    const h = new Historico<string>({ janelaRajadaMs: 500 });
    expect(h.registrar('a', { chave: 'espessura', agora: 0 })).toBe(true);
    expect(h.registrar('b', { chave: 'espessura', agora: 200 })).toBe(false);
    expect(h.registrar('c', { chave: 'espessura', agora: 650 })).toBe(false);
    expect(h.registrar('d', { chave: 'espessura', agora: 2000 })).toBe(true);
    expect(h.registrar('e', { chave: 'cor', agora: 2001 })).toBe(true);
    expect(h.passos).toBe(3);
    expect(h.desfazer('f')).toBe('e');
    expect(h.desfazer('e')).toBe('d');
    expect(h.desfazer('d')).toBe('a');
    // depois de desfazer, a mesma chave abre passo novo
    const h2 = new Historico<string>();
    h2.registrar('x', { chave: 'k', agora: 0 });
    h2.desfazer('y');
    expect(h2.registrar('x', { chave: 'k', agora: 1 })).toBe(true);
  });

  it('limite descarta os mais antigos; opções hostis caem nos padrões; mesma sequência dá os mesmos estados', () => {
    const h = new Historico<number>({ limite: 3 });
    for (let i = 0; i < 10; i++) h.registrar(i, { agora: i });
    expect(h.passos).toBe(3);
    expect([h.desfazer(10), h.desfazer(9), h.desfazer(8), h.desfazer(7)]).toEqual([9, 8, 7, null]);
    const hostil = new Historico<number>({ limite: NaN, janelaRajadaMs: -1 });
    for (let i = 0; i < 150; i++) hostil.registrar(i, { agora: NaN });
    expect(hostil.passos).toBe(100);
    const rodar = () => {
      const x = new Historico<number>();
      const saida: Array<number | null> = [];
      let s = 0;
      for (let i = 1; i <= 20; i++) { x.registrar(s, { chave: i % 3 === 0 ? 'k' : undefined, agora: i * 100 }); s = i; }
      for (let i = 0; i < 5; i++) { const r = x.desfazer(s); saida.push(r); if (r !== null) s = r; }
      return saida;
    };
    expect(rodar()).toEqual(rodar());
  });
});
