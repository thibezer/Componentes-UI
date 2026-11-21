import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { criarElipse, criarRetangulo } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import type { Par } from '../src/gerencigeo-canvas/feature_types';
import { montar, type Montagem } from './prancha-componente-util';

/*
 * Fase 3 da prancha, Camada E: orçamento de quadro (≤ 16 ms) dos gestos do componente com 2 mil elementos, contando o
 * evento de ponteiro, o gesto (snap, guias inteligentes, substitutos) E a pintura do quadro (base + sobreposição + réguas)
 * num contexto 2D que não faz nada (o custo do Canvas real não é medido aqui: é do navegador).
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

const nulo = () => new Proxy({} as Record<string, unknown>, {
  get: (_t, k) => (typeof k === 'string' && ['createLinearGradient', 'createRadialGradient', 'fillText', 'clearRect'].includes(k) ? undefined : () => undefined),
  set: () => true
}) as never;

function mediana(fn: () => void, rodadas = 9): number {
  fn();
  const t: number[] = [];
  for (let i = 0; i < rodadas; i++) {
    const t0 = performance.now();
    fn();
    t.push(performance.now() - t0);
  }
  return t.sort((a, b) => a - b)[Math.floor(t.length / 2)];
}

let m: Montagem;
let alvo: Par;

beforeAll(() => {
  m = montar({ largura: '841', altura: '1189' }, nulo);
  const r = semente(99);
  const els: ElementoGrafico[] = [];
  for (let i = 0; i < N; i++) {
    const caixa = { x: r() * 800, y: r() * 1150, largura: 2 + r() * 30, altura: 2 + r() * 30 };
    els.push((i % 2 ? criarElipse : criarRetangulo)({ id: `e${i}`, aparencia: { preenchimento: { cor: '#88f' } } }, caixa)!);
  }
  m.el.definirElementos(els);
  m.el.ajustarFolha();
  m.el.renderizarAgora();
  const l = els[0].transformacao!;
  alvo = [l.e, l.f];
});

afterAll(() => { document.body.innerHTML = ''; });

describe(`orçamento por quadro com ${N} elementos (evento + gesto + pintura)`, () => {
  it('hover (mover o ponteiro sem botão)', () => {
    let k = 0;
    const ms = mediana(() => { m.ponteiro('pointermove', [100 + (k++ % 50), 300]); m.el.renderizarAgora(); });
    expect(ms).toBeLessThan(ORCAMENTO_MS);
  });

  it('arrastar um elemento (snap + guias inteligentes + repintura da base)', () => {
    m.ponteiro('pointerdown', alvo);
    let k = 0;
    const ms = mediana(() => { m.ponteiro('pointermove', [alvo[0] + 5 + (k++ % 20), alvo[1] + 3]); m.el.renderizarAgora(); });
    m.ponteiro('pointerup', [alvo[0] + 5, alvo[1] + 3]);
    expect(ms).toBeLessThan(ORCAMENTO_MS);
  });

  it('caixa de seleção (arrasto no vazio, a seleção sai ao soltar)', () => {
    m.ponteiro('pointerdown', [-30, -30]);
    let k = 0;
    const ms = mediana(() => { m.ponteiro('pointermove', [200 + (k++ % 30), 300]); m.el.renderizarAgora(); });
    const t0 = performance.now();
    m.ponteiro('pointerup', [230, 300]);
    const soltar = performance.now() - t0;
    expect(ms).toBeLessThan(ORCAMENTO_MS);
    expect(soltar).toBeLessThan(ORCAMENTO_MS * 2);
    expect(m.el.selecao.length).toBeGreaterThan(10);
  });

  it('zoom pela roda', () => {
    let k = 0;
    const ms = mediana(() => {
      m.viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: k++ % 2 ? 100 : -100, clientX: 400, clientY: 300, bubbles: true, cancelable: true }));
      m.el.renderizarAgora();
    });
    expect(ms).toBeLessThan(ORCAMENTO_MS);
  });

  it('transformar a seleção grande pela alça (escala de centenas de elementos)', () => {
    const sel = m.el.selecao.length;
    expect(sel).toBeGreaterThan(10);
    const ms = mediana(() => { m.el.escalarSelecao(1.01); m.el.renderizarAgora(); }, 5);
    expect(ms).toBeLessThan(ORCAMENTO_MS * 2);
  });
});
