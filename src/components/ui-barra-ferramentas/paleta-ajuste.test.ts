import { describe, it, expect } from 'vitest';
import { calcularAjuste, medirComprimento, particionarItens, type EntradaAjuste } from './paleta-ajuste';

// botão 34, gap 2, moldura 10 (padding 4*2 + borda 1*2), separador 7
const base = (parcial: Partial<EntradaAjuste> = {}): EntradaAjuste => ({
  separadores: Array(10).fill(false),
  vertical: true,
  colunas: 1,
  limite: 1000,
  botao: 34,
  gap: 2,
  moldura: 10,
  separador: 7,
  excessoMenu: true,
  ...parcial
});

describe('paleta-ajuste — medirComprimento', () => {
  it('1 coluna: n botões + gaps + moldura', () => {
    expect(medirComprimento(base(), 3, false, 1)).toBe(3 * 34 + 2 * 2 + 10);
  });

  it('2 colunas: botões agrupados de dois em dois', () => {
    expect(medirComprimento(base(), 4, false, 2)).toBe(2 * 34 + 2 + 10);
    expect(medirComprimento(base(), 5, false, 2)).toBe(3 * 34 + 2 * 2 + 10);
  });

  it('2 colunas: separador quebra a linha e deixa célula vazia', () => {
    const e = base({ separadores: [false, true, false, false] });
    // linha 1 (1 botão), separador, linha 2 (2 botões)
    expect(medirComprimento(e, 4, false, 2)).toBe(34 + 2 + 7 + 2 + 34 + 10);
  });

  it('horizontal ignora colunas=2', () => {
    expect(medirComprimento(base({ vertical: false }), 4, false, 2)).toBe(4 * 34 + 3 * 2 + 10);
  });

  it('botão "mais" ocupa uma célula', () => {
    expect(medirComprimento(base(), 2, true, 1)).toBe(3 * 34 + 2 * 2 + 10);
  });
});

describe('paleta-ajuste — calcularAjuste', () => {
  it('cabendo tudo: nada muda', () => {
    expect(calcularAjuste(base())).toEqual({ colunas: 1, visiveis: 10 });
  });

  it('sem limite (0, NaN, Infinity, negativo): tudo visível, sem exceção', () => {
    for (const limite of [0, NaN, Infinity, -5]) {
      expect(calcularAjuste(base({ limite }))).toEqual({ colunas: 1, visiveis: 10 });
    }
  });

  it('colunas=auto: passa para 2 colunas antes de ocultar qualquer item', () => {
    // 10 botões: 1 col = 10*34+9*2+10 = 368; 2 col = 5*34+4*2+10 = 188
    expect(calcularAjuste(base({ colunas: 'auto', limite: 200 }))).toEqual({ colunas: 2, visiveis: 10 });
    expect(calcularAjuste(base({ colunas: 'auto', limite: 400 }))).toEqual({ colunas: 1, visiveis: 10 });
  });

  it('colunas fixas nunca mudam', () => {
    expect(calcularAjuste(base({ colunas: 1, limite: 100 })).colunas).toBe(1);
    expect(calcularAjuste(base({ colunas: 2, limite: 100 })).colunas).toBe(2);
  });

  it('excesso=menu: oculta o que não cabe reservando espaço para o botão "mais"', () => {
    // k botões + "mais" cabem se (k+1)*34 + k*2 + 10 <= limite: k=3 → 152, k=4 → 188
    expect(calcularAjuste(base({ limite: 160 }))).toEqual({ colunas: 1, visiveis: 3 });
    expect(calcularAjuste(base({ limite: 152 }))).toEqual({ colunas: 1, visiveis: 3 });
    expect(calcularAjuste(base({ limite: 151 }))).toEqual({ colunas: 1, visiveis: 2 });
  });

  it('excesso=rolar (excessoMenu=false): nunca oculta itens', () => {
    expect(calcularAjuste(base({ limite: 150, excessoMenu: false }))).toEqual({ colunas: 1, visiveis: 10 });
  });

  it('espaço mínimo: mantém ao menos 1 item visível', () => {
    expect(calcularAjuste(base({ limite: 20 }))).toEqual({ colunas: 1, visiveis: 1 });
  });

  it('auto + menu: usa 2 colunas e só então oculta', () => {
    // 2 col: (k+1) botões em ceil((k+1)/2) linhas; limite 120 → 3 linhas = 3*34+2*2+10 = 116 → k+1=6 → k=5
    expect(calcularAjuste(base({ colunas: 'auto', limite: 120 }))).toEqual({ colunas: 2, visiveis: 5 });
  });

  it('entradas hostis não lançam', () => {
    expect(() => calcularAjuste(base({ botao: NaN, gap: -1, moldura: Infinity, separador: NaN }))).not.toThrow();
    expect(calcularAjuste(base({ separadores: [] }))).toEqual({ colunas: 1, visiveis: 0 });
    expect(calcularAjuste({ ...base(), separadores: undefined as unknown as boolean[] })).toEqual({ colunas: 1, visiveis: 0 });
  });
});

describe('paleta-ajuste — particionarItens', () => {
  const ehSep = (s: string) => s === '|';

  it('divide no corte', () => {
    expect(particionarItens(['a', 'b', 'c', 'd'], 2, ehSep)).toEqual({ visiveis: ['a', 'b'], excesso: ['c', 'd'] });
  });

  it('descarta separadores soltos nas bordas do corte', () => {
    expect(particionarItens(['a', '|', 'b', 'c'], 2, ehSep)).toEqual({ visiveis: ['a'], excesso: ['b', 'c'] });
    expect(particionarItens(['a', 'b', '|', 'c', '|'], 3, ehSep)).toEqual({ visiveis: ['a', 'b'], excesso: ['c'] });
  });

  it('excedente só de separadores: não oculta nada', () => {
    expect(particionarItens(['a', 'b', '|'], 2, ehSep)).toEqual({ visiveis: ['a', 'b', '|'], excesso: [] });
  });

  it('corte fora do intervalo é limitado', () => {
    expect(particionarItens(['a', 'b'], 99, ehSep).excesso).toEqual([]);
    expect(particionarItens(['a', 'b'], -3, ehSep)).toEqual({ visiveis: [], excesso: ['a', 'b'] });
    expect(particionarItens(['a', 'b'], NaN, ehSep).visiveis).toEqual([]);
  });
});
