// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  IDENTIDADE, aplicar, aplicarVetor, cisalhamento, compor, decompor, determinante, ehIdentidade, ehMatrizFinita, ehSingular,
  escala, espelhamento, iguais, inverter, matriz, multiplicar, recompor, rotacao, saneada, translacao, type Matriz2D
} from '../src/gerencigeo-canvas/espaco/espaco_matriz';
import type { Par } from '../src/gerencigeo-canvas/feature_types';

/* Fase 1 da prancha, Camada A: matriz afim 2D (propriedades algébricas, decomposição, entrada hostil). */

function semente(n: number) {
  let s = n;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}
const perto = (a: Par, b: Par, casas = 9) => {
  expect(a[0]).toBeCloseTo(b[0], casas);
  expect(a[1]).toBeCloseTo(b[1], casas);
};

describe('construtores e aplicação (convenção do Canvas 2D)', () => {
  it('translação, escala, rotação de 90° (horário na tela, y para baixo) e cisalhamento', () => {
    expect(aplicar(translacao(3, 4), [1, 1])).toEqual([4, 5]);
    expect(aplicar(escala(2, 3), [1, 1])).toEqual([2, 3]);
    perto(aplicar(rotacao(Math.PI / 2), [1, 0]), [0, 1]);
    expect(aplicar(cisalhamento(0.5), [0, 2])).toEqual([1, 2]);
    expect(aplicar(cisalhamento(0, 0.5), [2, 0])).toEqual([2, 1]);
    expect(aplicarVetor(translacao(9, 9), [1, 2])).toEqual([1, 2]);
  });

  it('operações em torno de um pivô deixam o pivô parado', () => {
    const pivo: Par = [10, 20];
    for (const m of [rotacao(1.234, pivo), escala(3, -2, pivo), cisalhamento(0.7, 0.2, pivo), espelhamento('horizontal', pivo)]) {
      perto(aplicar(m, pivo), pivo);
    }
    expect(aplicar(espelhamento('horizontal', [10, 0]), [12, 5])).toEqual([8, 5]);
    expect(aplicar(espelhamento('vertical', [0, 10]), [3, 12])).toEqual([3, 8]);
  });

  it('multiplicar(m1, m2) aplica m2 primeiro; compor aplica na ordem dos argumentos', () => {
    const t = translacao(10, 0);
    const r = rotacao(Math.PI / 2);
    perto(aplicar(multiplicar(t, r), [1, 0]), [10, 1]);
    perto(aplicar(compor(r, t), [1, 0]), [10, 1]);
    perto(aplicar(compor(t, r), [1, 0]), [0, 11]);
    expect(compor()).toEqual(IDENTIDADE);
  });
});

describe('propriedades', () => {
  const aleatorio = semente(42);
  const m = (): Matriz2D => matriz(aleatorio() * 4 - 2, aleatorio() * 4 - 2, aleatorio() * 4 - 2, aleatorio() * 4 - 2, aleatorio() * 100, aleatorio() * 100);

  it('inversa: m · m⁻¹ = identidade e (m⁻¹)⁻¹ = m', () => {
    for (let i = 0; i < 200; i++) {
      const a = m();
      const inv = inverter(a);
      if (!inv) continue;
      expect(iguais(multiplicar(a, inv), IDENTIDADE, 1e-7)).toBe(true);
      expect(iguais(inverter(inv)!, a, 1e-6)).toBe(true);
    }
  });

  it('associatividade e determinante do produto', () => {
    for (let i = 0; i < 100; i++) {
      const [a, b, c] = [m(), m(), m()];
      expect(iguais(multiplicar(multiplicar(a, b), c), multiplicar(a, multiplicar(b, c)), 1e-9)).toBe(true);
      expect(determinante(multiplicar(a, b))).toBeCloseTo(determinante(a) * determinante(b), 9);
    }
  });

  it('decompor e recompor dão a mesma matriz (inclusive com espelho e cisalhamento)', () => {
    for (let i = 0; i < 200; i++) {
      const a = m();
      if (ehSingular(a)) continue;
      expect(iguais(recompor(decompor(a)), a, 1e-9)).toBe(true);
    }
    const d = decompor(compor(escala(2, 3), cisalhamento(0.5), rotacao(0.3), translacao(5, 6)));
    expect(d.escalaX).toBeCloseTo(2, 12);
    expect(d.escalaY).toBeCloseTo(3, 12);
    expect(d.cisalhamento).toBeCloseTo(0.5, 12);
    expect(d.rotacao).toBeCloseTo(0.3, 12);
    expect([d.translacaoX, d.translacaoY]).toEqual([5, 6]);
    expect(decompor(espelhamento('vertical')).escalaY).toBeCloseTo(-1, 12);
  });
});

describe('entrada hostil (Regra #0)', () => {
  it('matriz singular não tem inversa', () => {
    expect(inverter(escala(0, 1))).toBeNull();
    expect(inverter(matriz(1, 2, 2, 4, 0, 0))).toBeNull();
    expect(inverter(matriz(1e-20, 0, 0, 1e-20, 0, 0))).toBeNull();
    expect(ehSingular(IDENTIDADE)).toBe(false);
  });

  it('NaN, Infinity, nulo e tipos trocados viram identidade em `saneada`', () => {
    for (const ruim of [null, undefined, 'x', 42, {}, { a: 1, b: 0, c: 0, d: 1, e: NaN, f: 0 }, { a: Infinity, b: 0, c: 0, d: 1, e: 0, f: 0 }, { a: '1', b: 0, c: 0, d: 1, e: 0, f: 0 }]) {
      expect(ehMatrizFinita(ruim)).toBe(false);
      expect(saneada(ruim)).toEqual(IDENTIDADE);
    }
    expect(inverter({ a: NaN, b: 0, c: 0, d: 1, e: 0, f: 0 })).toBeNull();
    const ok = translacao(1, 2);
    expect(saneada(ok)).toEqual(ok);
    expect(saneada(ok)).not.toBe(ok);
  });

  it('decompor matriz de escala x nula não gera NaN', () => {
    const d = decompor(matriz(0, 0, 0, 2, 1, 1));
    expect(Object.values(d).every(Number.isFinite)).toBe(true);
    expect(ehIdentidade(saneada(null))).toBe(true);
  });
});
