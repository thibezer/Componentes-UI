// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { rotacao, translacao } from '../src/gerencigeo-canvas/espaco/espaco_matriz';
import { contornoNaFolha } from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import { criarElipse, criarEstrela, criarLinha, criarRetangulo } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { IndicePrancha, elementosNaCaixa, elementosNoPonto } from '../src/gerencigeo-canvas/prancha/elemento_consulta';
import { buscarSnapPrancha } from '../src/gerencigeo-canvas/prancha/elemento_snap';
import { matrizDeEscalaPorAlca, caixaDaSelecao, transformarElemento, transformarElementos } from '../src/gerencigeo-canvas/prancha/elemento_transformacao';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import type { Par } from '../src/gerencigeo-canvas/feature_types';

/*
 * Fase 1 da prancha, Camada E: orçamento de quadro (≤ 16 ms) nos caminhos quentes da interação com 2 mil elementos numa
 * folha A0 (hover/hit-test, snap, seleção por caixa, arrasto de seleção, zoom = nova consulta da vista). Mede a mediana de
 * várias rodadas, com o cache de contorno já quente (como na interação: o contorno é calculado uma vez por versão do
 * elemento). O teste é o benchmark verificável; os números ficam em docs/desempenho-feicoes.md.
 */

/**
 * Meta de produto: 16 ms (um quadro). A asserção usa 16 ms × 4 porque a suíte inteira roda em paralelo e,
 * numa máquina carregada, tudo fica ~4× mais lento (como os demais testes de desempenho do kit, que têm folga para CI
 * lenta). As medianas medidas com o arquivo sozinho estão em docs/desempenho-feicoes.md, todas abaixo de 16 ms.
 */
const ORCAMENTO_MS = 16 * 4;
const N = 2000;

function semente(n: number) {
  let s = n;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

function mediana(fn: () => void, rodadas = 9): number {
  const t: number[] = [];
  fn(); // aquece o JIT
  for (let i = 0; i < rodadas; i++) {
    const t0 = performance.now();
    fn();
    t.push(performance.now() - t0);
  }
  return t.sort((a, b) => a - b)[Math.floor(t.length / 2)];
}

let elementos: ElementoGrafico[] = [];
let indice: IndicePrancha;
const pontos: Par[] = [];

beforeAll(() => {
  const r = semente(2026);
  const ap = { preenchimento: { cor: '#88f' }, traco: { espessura: 0.35 } };
  for (let i = 0; i < N; i++) {
    const x = r() * 800, y = r() * 1150, w = 2 + r() * 40, h = 2 + r() * 40;
    const tipo = i % 4;
    const base = { id: `e${i}`, aparencia: ap };
    let el = tipo === 0 ? criarRetangulo(base, { x, y, largura: w, altura: h }, r() < 0.5 ? 2 : undefined)
      : tipo === 1 ? criarElipse(base, { x, y, largura: w, altura: h })
        : tipo === 2 ? criarEstrela(base, [x, y], w / 2, w / 4, 5)
          : criarLinha(base, [x, y], [x + w, y + h]);
    if (el && r() < 0.3) el = transformarElemento(el, rotacao(r() * Math.PI, [x, y]));
    elementos.push(el!);
  }
  for (const el of elementos) contornoNaFolha(el); // cache quente
  indice = new IndicePrancha();
  indice.definir(elementos);
  for (let i = 0; i < 100; i++) pontos.push([r() * 800, r() * 1150]);
});

describe(`orçamento de quadro (≤ ${ORCAMENTO_MS} ms) com ${N} elementos`, () => {
  it('montar o índice de 2 mil elementos (uma vez por carga)', () => {
    const ms = mediana(() => new IndicePrancha().definir(elementos), 3);
    expect(ms).toBeLessThan(ORCAMENTO_MS * 10);
  });

  it('hover: hit-test pelo índice (100 movimentos do ponteiro por quadro medido)', () => {
    const ms = mediana(() => {
      for (const p of pontos) elementosNoPonto(p, indice.consultarPonto(p, 2), { tolerancia: 1 });
    });
    expect(ms / pontos.length).toBeLessThan(ORCAMENTO_MS);
    expect(ms).toBeLessThan(ORCAMENTO_MS * 4);
  });

  it('hover sem índice (varredura linear dos 2 mil) ainda cabe num quadro', () => {
    const ms = mediana(() => elementosNoPonto(pontos[0], elementos, { tolerancia: 1 }));
    expect(ms).toBeLessThan(ORCAMENTO_MS);
  });

  it('snap durante o arrasto (candidatos do índice, escala de zoom 4 px/mm)', () => {
    const ms = mediana(() => {
      for (const p of pontos.slice(0, 20)) buscarSnapPrancha(p, indice.consultarPonto(p, 3), 4, { grade: { espacamento: 5 }, guias: [{ orientacao: 'vertical', posicao: 100 }] });
    });
    expect(ms / 20).toBeLessThan(ORCAMENTO_MS);
  });

  it('seleção por caixa (crossing e window) sobre os candidatos do índice', () => {
    const caixa = { x: 100, y: 100, largura: 400, altura: 500 };
    const ms = mediana(() => {
      const cand = indice.consultarCaixa(caixa);
      elementosNaCaixa(caixa, cand, 'crossing');
      elementosNaCaixa(caixa, cand, 'window');
    });
    expect(ms).toBeLessThan(ORCAMENTO_MS);
  });

  it('zoom/pan: consultar a vista inteira e a caixa da seleção de todos', () => {
    const ms = mediana(() => {
      indice.consultarCaixa({ x: 0, y: 0, largura: 841, altura: 1189 });
      caixaDaSelecao(elementos);
    });
    expect(ms).toBeLessThan(ORCAMENTO_MS);
  });

  it('arrasto: mover 200 selecionados e atualizar o índice; escalar 2 mil pela alça (só a matriz)', () => {
    const sel = elementos.slice(0, 200);
    const msMover = mediana(() => {
      for (const el of transformarElementos(sel, translacao(1, 1))) indice.atualizar(el);
    }, 5);
    indice.definir(elementos);
    expect(msMover).toBeLessThan(ORCAMENTO_MS);
    const caixa = caixaDaSelecao(elementos)!;
    const msEscala = mediana(() => {
      const m = matrizDeEscalaPorAlca(caixa, 'se', [900, 1200], { proporcional: true })!;
      transformarElementos(elementos, m);
    });
    expect(msEscala).toBeLessThan(ORCAMENTO_MS);
  });

  it('arrasto de TODOS: mover 2 mil e atualizar o índice em lote (envelope por 4 cantos, sem recalcular contornos)', () => {
    let k = 0;
    const ms = mediana(() => {
      indice.atualizarVarios(transformarElementos(elementos, translacao(++k, 0)));
    }, 5);
    indice.definir(elementos);
    expect(ms).toBeLessThan(ORCAMENTO_MS);
  });

  it('contorno de um elemento movido reaproveita o local: recalcular 2 mil movidos cabe em poucos quadros', () => {
    let k = 0;
    const ms = mediana(() => {
      for (const el of transformarElementos(elementos, translacao(0, ++k))) contornoNaFolha(el);
    }, 5);
    expect(ms).toBeLessThan(ORCAMENTO_MS * 3);
  });
});

describe('orçamento da pintura (Fase 2)', () => {
  it('pintar os 2 mil (plano em cache) num contexto 2D cabe num quadro', async () => {
    const { desenharElementos } = await import('../src/gerencigeo-canvas/prancha/pintura_canvas');
    const nulo = new Proxy({} as Record<string, unknown>, { get: (_t, k) => (typeof k === 'string' && ['createLinearGradient', 'createRadialGradient', 'fillText'].includes(k) ? undefined : () => undefined), set: () => true });
    desenharElementos(nulo as never, elementos); // planeja (frio)
    const ms = mediana(() => desenharElementos(nulo as never, elementos));
    expect(ms).toBeLessThan(ORCAMENTO_MS);
  });

  it('planejar 2 mil elementos novos (frio) e exportar o SVG da folha', async () => {
    const { planejarElementos } = await import('../src/gerencigeo-canvas/prancha/pintura_plano');
    const { exportarSvg } = await import('../src/gerencigeo-canvas/prancha/exportar_svg');
    let k = 0;
    const msFrio = mediana(() => planejarElementos(elementos.map((e) => ({ ...e, nome: String(++k) }))), 3);
    expect(msFrio).toBeLessThan(ORCAMENTO_MS * 10);
    const msSvg = mediana(() => exportarSvg(elementos, { largura: 841, altura: 1189 }), 3);
    expect(msSvg).toBeLessThan(1000);
  });
});

describe('orçamento das operações de organização (Fase 4)', () => {
  it('reordenar, agrupar, alinhar e distribuir 500 de 2 mil; duplicar 200; pintura com camadas', async () => {
    const org = await import('../src/gerencigeo-canvas/prancha/organizacao');
    const { planejarElementos } = await import('../src/gerencigeo-canvas/prancha/pintura_plano');
    const sel = elementos.slice(0, 500).map((e) => e.id);
    const selEls = elementos.slice(0, 500);
    const camadas = [{ id: 'a' }, { id: 'b', opacidade: 0.5 }, { id: 'c', visivel: false }];
    const comCamadas = elementos.map((e, i) => ({ ...e, camadaId: ['a', 'b', 'c'][i % 3] }));
    let n = 0;
    const tempos = {
      reordenar: mediana(() => org.reordenar(elementos, sel, 'frente'), 5),
      agrupar: mediana(() => org.agrupar(elementos, sel, 'g'), 5),
      alinhar: mediana(() => org.alinhar(selEls, 'esquerda'), 5),
      distribuir: mediana(() => org.distribuir(selEls, 'horizontal', 'espacos'), 5),
      duplicar: mediana(() => org.duplicarElementos(elementos.slice(0, 200), (t) => `${t}-${++n}`, [5, 5]), 5),
      planejarComCamadas: mediana(() => planejarElementos(comCamadas, camadas), 5)
    };
    // operações de comando (uma vez por clique), não de quadro: orçamento de alguns quadros
    for (const [nome, ms] of Object.entries(tempos)) expect(ms, nome).toBeLessThan(ORCAMENTO_MS * 4);
  });
});

describe('orçamento do Pathfinder e dos efeitos (Fase 5)', () => {
  it('unir 50 retângulos sobrepostos, subtrair uma elipse de um retângulo, pintar 2 mil com sombra e mesclagem', async () => {
    const { aplicarPathfinder } = await import('../src/gerencigeo-canvas/prancha/pathfinder');
    const { criarRetangulo, criarElipse } = await import('../src/gerencigeo-canvas/prancha/elemento_criacao');
    const { planejarElementos } = await import('../src/gerencigeo-canvas/prancha/pintura_plano');
    const sobrepostos = Array.from({ length: 50 }, (_, i) => criarRetangulo({ id: `r${i}`, aparencia: { preenchimento: { cor: '#000' } } }, { x: i * 3, y: (i % 5) * 3, largura: 10, altura: 10 })!);
    const fundo = criarRetangulo({ id: 'f', aparencia: { preenchimento: { cor: '#000' } } }, { x: 0, y: 0, largura: 100, altura: 60 })!;
    const furo = criarElipse({ id: 'e' }, { x: 20, y: 10, largura: 40, altura: 30 })!;
    const comEfeitos = elementos.map((e) => ({ ...e, aparencia: { ...(e.aparencia ?? {}), sombra: {}, mesclagem: 'multiplicar' as const } }));
    let k = 0;
    const tempos = {
      unir50: mediana(() => aplicarPathfinder(sobrepostos, 'uniao'), 5),
      subtrairElipse: mediana(() => aplicarPathfinder([fundo, furo], 'subtracao'), 5),
      planejarComEfeitos: mediana(() => planejarElementos(comEfeitos.map((e) => ({ ...e, nome: String(++k) }))), 3)
    };
    expect(tempos.unir50, 'unir50').toBeLessThan(ORCAMENTO_MS * 4);
    expect(tempos.subtrairElipse, 'subtrairElipse').toBeLessThan(ORCAMENTO_MS * 4);
    // planejamento frio de 2 mil com a silhueta da sombra (buffer): mesmo orçamento do planejamento frio sem efeitos
    expect(tempos.planejarComEfeitos, 'planejarComEfeitos').toBeLessThan(ORCAMENTO_MS * 10);
  });
});


// ---------- requisição do ConecteMapas, item 12: planejar uma vez, pintar várias ----------
import { desenharElementos, desenharPlano, planejar } from '../src/gerencigeo-canvas/prancha/pintura_canvas';
import { escala } from '../src/gerencigeo-canvas/espaco/espaco_matriz';
import { ContextoGravador } from './prancha-contextos';

describe('plano de pintura reutilizável (planejar + desenharPlano)', () => {
  const els = (n: number): ElementoGrafico[] => {
    const r = semente(7);
    return Array.from({ length: n }, (_, i) => criarRetangulo({
      id: `e${i}`, aparencia: { traco: { espessura: 0.35 }, preenchimento: { cor: '#88c' }, hachura: { espacamento: 1.5 } }
    }, { x: r() * 400, y: r() * 280, largura: 10 + r() * 30, altura: 10 + r() * 30 })!);
  };

  it('equivalente: desenharElementos = desenharPlano(planejar(...)) (as mesmas chamadas gravadas)', () => {
    const lista = els(20);
    const a = new ContextoGravador();
    const b = new ContextoGravador();
    const m = escala(3.5);
    desenharElementos(a, lista, { matriz: m });
    desenharPlano(b, planejar(lista), { matriz: m });
    expect(b.chamadas).toEqual(a.chamadas);
  });

  it('o plano é congelado e não depende da matriz: o mesmo plano serve para várias matrizes', () => {
    const plano = planejar(els(5));
    expect(Object.isFrozen(plano)).toBe(true);
    const a = new ContextoGravador();
    const b = new ContextoGravador();
    desenharPlano(a, plano, { matriz: escala(2) });
    desenharPlano(b, plano, { matriz: escala(4) });
    expect(a.geometria).toEqual(b.geometria);
    expect(a.chamadas.filter(([n]) => n === 'setTransform')[0]).not.toEqual(b.chamadas.filter(([n]) => n === 'setTransform')[0]);
  });

  it('cache por referência do array: mesma referência reaproveita; array novo ou outras camadas replaneja', () => {
    const lista = els(3);
    expect(planejar(lista, { cache: true })).toBe(planejar(lista, { cache: true }));
    expect(planejar(lista)).not.toBe(planejar(lista)); // sem cache: sempre novo
    expect(planejar([...lista], { cache: true })).not.toBe(planejar(lista, { cache: true }));
    const camadas = [{ id: 'k' }];
    expect(planejar(lista, { cache: true, camadas })).not.toBe(planejar(lista, { cache: true }));
    expect(planejar(null as never, { cache: true })).toEqual([]);
  });

  it('repintar 200 elementos com 20 matrizes é ≥ 2× mais rápido que replanejar a cada vez (medido 2,5 a 4×)', () => {
    const lista = els(200);
    const matrizes = Array.from({ length: 20 }, (_, i) => escala(2 + i * 0.1));
    // contexto que não grava nada: o que se compara é o PLANEJAMENTO (contornos, hachuras, pontas), não o custo de registrar chamadas
    const nulo = (): ContextoGravador => Object.assign(new ContextoGravador(), { chamadas: { push: () => 0 } as never });
    const replanejando = mediana(() => { for (const m of matrizes) desenharElementos(nulo(), lista.map((e) => ({ ...e })), { matriz: m }); }, 5);
    const plano = planejar(lista.map((e) => ({ ...e })));
    const reaproveitando = mediana(() => { for (const m of matrizes) desenharPlano(nulo(), plano, { matriz: m }); }, 5);
    // medido entre ~2,5× e ~4× conforme a carga da máquina; o piso de 2× não oscila
    expect(replanejando / reaproveitando).toBeGreaterThanOrEqual(2);
  });
});
