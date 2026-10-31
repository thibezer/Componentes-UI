import { describe, it, expect } from 'vitest';
import {
  interpretarEntradaNumerica,
  limitarAoIntervalo,
  passoNumerico,
  formatarNumero
} from './propriedades-numero';
import { normalizarTermoBusca, filtrarPropriedades } from './propriedades-filtro';
import { normalizarCategorias, normalizarTipos } from './propriedades-normalizacao';
import { formatarValorExibicao } from './propriedades-exibicao';
import type { CategoriaPropriedades, ItemPropriedade } from './tipos';

const num = (extra: Partial<ItemPropriedade> = {}): ItemPropriedade =>
  ({ id: 'n', rotulo: 'N', tipo: 'numero', valor: 0, ...extra });

describe('propriedades-numero', () => {
  it('interpreta expressões, vírgula decimal e a unidade digitada', () => {
    expect(interpretarEntradaNumerica('10+5', num())).toBe(15);
    expect(interpretarEntradaNumerica('2,5', num())).toBe(2.5);
    expect(interpretarEntradaNumerica('10 mm', num({ unidade: 'mm' }))).toBe(10);
    expect(interpretarEntradaNumerica('10MM', num({ unidade: 'mm' }))).toBe(10);
    expect(interpretarEntradaNumerica('45°', num({ unidade: '°' }))).toBe(45);
    expect(interpretarEntradaNumerica('2*3 m²', num({ unidade: 'm²' }))).toBe(6);
  });

  it('remove o ruído de ponto flutuante sem perder coordenadas UTM', () => {
    expect(interpretarEntradaNumerica('0.1+0.2', num())).toBe(0.3);
    expect(interpretarEntradaNumerica('7000000.123456', num())).toBe(7000000.123456);
  });

  it('arredonda nas casas decimais e limita ao intervalo', () => {
    expect(interpretarEntradaNumerica('1.23456', num({ casasDecimais: 2 }))).toBe(1.23);
    expect(interpretarEntradaNumerica('500', num({ max: 100 }))).toBe(100);
    expect(interpretarEntradaNumerica('-5', num({ min: 0 }))).toBe(0);
  });

  it('entrada inválida ou hostil devolve null', () => {
    expect(interpretarEntradaNumerica('abc', num())).toBeNull();
    expect(interpretarEntradaNumerica('', num())).toBeNull();
    expect(interpretarEntradaNumerica('1/0', num())).toBeNull();
    expect(interpretarEntradaNumerica(null as unknown as string, num())).toBeNull();
    expect(interpretarEntradaNumerica('mm', num({ unidade: 'mm' }))).toBeNull();
  });

  it('limites inválidos são ignorados; min > max favorece o mínimo', () => {
    expect(limitarAoIntervalo(5, { min: NaN, max: undefined })).toBe(5);
    expect(limitarAoIntervalo(5, { min: '2' as unknown as number })).toBe(5);
    expect(limitarAoIntervalo(5, { min: 10, max: 0 })).toBe(10);
    expect(limitarAoIntervalo(-Infinity, { min: -1 })).toBe(-1);
  });

  it('passo: usa `passo`, depois as casas decimais; Shift ×10, Alt ×0,1 só sem passo/casas', () => {
    expect(passoNumerico(num())).toBe(1);
    expect(passoNumerico(num({ casasDecimais: 2 }))).toBe(0.01);
    expect(passoNumerico(num({ passo: 5 }))).toBe(5);
    expect(passoNumerico(num({ passo: 5 }), { shift: true })).toBe(50);
    expect(passoNumerico(num(), { alt: true })).toBe(0.1);
    expect(passoNumerico(num({ passo: -1 }))).toBe(1);
    expect(passoNumerico(num({ passo: NaN }))).toBe(1);
  });

  it('formatarNumero respeita as casas e tolera lixo', () => {
    expect(formatarNumero(1.5, 2)).toBe('1.50');
    expect(formatarNumero(3)).toBe('3');
    expect(formatarNumero('7')).toBe('7');
    expect(formatarNumero(null)).toBe('');
    expect(formatarNumero('xyz')).toBe('xyz');
  });
});

describe('propriedades-filtro', () => {
  const cat: CategoriaPropriedades = {
    id: 'geo',
    titulo: 'Geometria',
    propriedades: [
      { id: 'rot', rotulo: 'Rotação', tipo: 'numero', valor: 0 },
      { id: 'esp', rotulo: 'Espessura', tipo: 'numero', valor: 1 }
    ]
  };

  it('normaliza caixa, espaços e acentos', () => {
    expect(normalizarTermoBusca('  ROTAÇÃO ')).toBe('rotacao');
    expect(normalizarTermoBusca(undefined)).toBe('');
    expect(normalizarTermoBusca(42)).toBe('42');
  });

  it('acha sem acento e pelo id; título da categoria traz todas as propriedades', () => {
    expect(filtrarPropriedades(cat, 'rotacao').map(p => p.id)).toEqual(['rot']);
    expect(filtrarPropriedades(cat, 'esp').map(p => p.id)).toEqual(['esp']);
    expect(filtrarPropriedades(cat, 'geometria').map(p => p.id)).toEqual(['rot', 'esp']);
    expect(filtrarPropriedades(cat, '').length).toBe(2);
    expect(filtrarPropriedades(cat, 'zzz')).toEqual([]);
  });
});

describe('propriedades-normalizacao', () => {
  it('preserva a identidade de categorias válidas (estado aberto continua do usuário)', () => {
    const cats: CategoriaPropriedades[] = [{ id: 'a', titulo: 'A', propriedades: [num()] }];
    expect(normalizarCategorias(cats)[0]).toBe(cats[0]);
  });

  it('descarta e corrige entradas hostis sem lançar', () => {
    const hostil = [
      null,
      42,
      { id: 'semProps', titulo: 'X', propriedades: null },
      { titulo: 'Sem id', propriedades: [{ id: 'p1', tipo: 'texto', valor: 'a' }] },
      {
        id: 'mista',
        titulo: 'M',
        propriedades: [null, 'x', { rotulo: 'sem id' }, { id: 7, tipo: 'selecao', valor: 1, opcoes: { a: 1 } },
          { id: 's', rotulo: 'S', tipo: 'selecao', valor: 1, opcoes: [null, { id: 1, rotulo: 'Um' }, { rotulo: 'sem id' }] }]
      }
    ];
    const r = normalizarCategorias(hostil);
    expect(r.map(c => c.id)).toEqual(['semProps', 'categoria-3', 'mista']);
    expect(r[0].propriedades).toEqual([]);
    expect(r[1].propriedades[0].rotulo).toBe('p1');
    expect(r[2].propriedades.map(p => p.id)).toEqual(['7', 's']);
    expect(r[2].propriedades[0].opcoes).toBeUndefined();
    expect(r[2].propriedades[1].opcoes).toEqual([{ id: 1, rotulo: 'Um' }]);
    expect(normalizarCategorias('lixo')).toEqual([]);
  });

  it('normaliza a lista de tipos do seletor', () => {
    const r = normalizarTipos([null, { id: 'a' }, { rotulo: 'sem id' }, { id: 2, rotulo: 'Dois' }]);
    expect(r).toEqual([{ id: 'a', rotulo: 'a' }, { id: '2', rotulo: 'Dois' }]);
    expect(normalizarTipos(undefined)).toEqual([]);
  });
});

describe('propriedades-exibicao (somente leitura)', () => {
  it('mostra o rótulo da opção, Sim/Não e as casas decimais', () => {
    const opcoes = [{ id: 'a', rotulo: 'Alfa' }, { id: 2, rotulo: 'Dois' }];
    expect(formatarValorExibicao({ ...num(), tipo: 'selecao', opcoes }, 'a')).toBe('Alfa');
    expect(formatarValorExibicao({ ...num(), tipo: 'selecao', opcoes }, '2')).toBe('Dois');
    expect(formatarValorExibicao({ ...num(), tipo: 'booleano' }, true)).toBe('Sim');
    expect(formatarValorExibicao({ ...num(), tipo: 'readonly' }, false)).toBe('Não');
    expect(formatarValorExibicao(num({ casasDecimais: 3 }), 2)).toBe('2.000');
    expect(formatarValorExibicao(num(), null)).toBe('—');
    expect(formatarValorExibicao(num(), '')).toBe('—');
    expect(formatarValorExibicao({ ...num(), tipo: 'texto' }, { a: 1 })).toBe('[object Object]');
  });
});
