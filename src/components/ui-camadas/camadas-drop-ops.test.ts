import { describe, it, expect } from 'vitest';
import {
  ehDescendente, zonaDeDropCamada, moverCamada, reordenarCamada, moverFeicaoParaCamada, reordenarFeicao
} from './camadas-drop-ops';
import type { CamadaItem, FeicaoItem } from './tipos';

const cam = (id: string, parentId: string | null = null): CamadaItem => ({ id, name: id, parentId } as CamadaItem);
const fei = (id: string, layerId: string): FeicaoItem => ({ id, name: id, layerId } as FeicaoItem);
const ids = (l: Array<{ id: string }>) => l.map((x) => x.id);

describe('ehDescendente', () => {
  it('detecta descendência direta e indireta', () => {
    const l = [cam('a'), cam('b', 'a'), cam('c', 'b')];
    expect(ehDescendente(l, 'c', 'a')).toBe(true);
    expect(ehDescendente(l, 'b', 'a')).toBe(true);
    expect(ehDescendente(l, 'a', 'c')).toBe(false);
  });

  it('não trava com ciclo já existente nos dados (falhava antes: laço infinito)', () => {
    const l = [cam('a', 'b'), cam('b', 'a'), cam('x')];
    expect(() => ehDescendente(l, 'a', 'x')).not.toThrow();
  });

  it('id inexistente é falso', () => {
    expect(ehDescendente([cam('a')], 'nada', 'a')).toBe(false);
  });
});

describe('zonaDeDropCamada', () => {
  it.each([[0, 'acima'], [0.24, 'acima'], [0.25, 'dentro'], [0.5, 'dentro'], [0.75, 'dentro'], [0.76, 'abaixo'], [1, 'abaixo']])('%s → %s', (y, zona) => {
    expect(zonaDeDropCamada(y as number)).toBe(zona);
  });

  it('NaN/Infinity (linha sem altura) cai em "dentro" sem lançar', () => {
    expect(zonaDeDropCamada(Number.NaN)).toBe('dentro');
    expect(zonaDeDropCamada(Infinity)).toBe('dentro');
  });
});

describe('moverCamada', () => {
  it('abaixo/acima reordena e adota o pai do alvo', () => {
    const l = [cam('a'), cam('b'), cam('c', 'b')];
    const r = moverCamada(l, 'a', 'c', 'abaixo');
    expect(r?.tipo).toBe('ordem');
    expect(ids(l)).toEqual(['b', 'c', 'a']);
    expect(l.find((x) => x.id === 'a')!.parentId).toBe('b');

    const l2 = [cam('a'), cam('b'), cam('c')];
    moverCamada(l2, 'c', 'a', 'acima');
    expect(ids(l2)).toEqual(['c', 'a', 'b']);
  });

  it('dentro aninha e recusa ciclo', () => {
    const l = [cam('a'), cam('b', 'a')];
    expect(moverCamada(l, 'a', 'b', 'dentro')).toBeNull();
    expect(l.find((x) => x.id === 'a')!.parentId).toBeNull();
    const r = moverCamada(l, 'b', 'a', 'dentro');
    expect(r).toMatchObject({ tipo: 'hierarquia', novoParentId: 'a' });
  });

  it('ignora mover para si mesma, ids vazios e inexistentes', () => {
    const l = [cam('a'), cam('b')];
    expect(moverCamada(l, 'a', 'a', 'dentro')).toBeNull();
    expect(moverCamada(l, '', 'b', 'acima')).toBeNull();
    expect(moverCamada(l, 'a', 'zzz', 'acima')).toBeNull();
    expect(moverCamada(l, 'zzz', 'b', 'acima')).toBeNull();
    expect(ids(l)).toEqual(['a', 'b']);
  });
});

describe('reordenarCamada', () => {
  it('move antes ou depois do alvo', () => {
    const l = [cam('a'), cam('b'), cam('c')];
    expect(reordenarCamada(l, 'a', 'c', false)).toBe(true);
    expect(ids(l)).toEqual(['b', 'c', 'a']);
    expect(reordenarCamada(l, 'a', 'b', true)).toBe(true);
    expect(ids(l)).toEqual(['a', 'b', 'c']);
  });

  it('não muda nada com ids inválidos', () => {
    const l = [cam('a'), cam('b')];
    expect(reordenarCamada(l, 'a', 'a', true)).toBe(false);
    expect(reordenarCamada(l, 'x', 'a', true)).toBe(false);
    expect(ids(l)).toEqual(['a', 'b']);
  });

  it('alvo inexistente manda a camada para o fim, sem perdê-la', () => {
    const l = [cam('a'), cam('b')];
    expect(reordenarCamada(l, 'a', 'x', true)).toBe(true);
    expect(ids(l)).toEqual(['b', 'a']);
  });
});

describe('moverFeicaoParaCamada', () => {
  it('troca a camada da feição e informa origem e destino', () => {
    const f = [fei('f1', 'a')];
    const r = moverFeicaoParaCamada(f, [cam('a'), cam('b')], 'f1', 'b');
    expect(r).toMatchObject({ camadaOrigemId: 'a', camadaDestinoId: 'b', mudouDeCamada: true });
    expect(f[0].layerId).toBe('b');
  });

  it('nulo se já está na camada, ou feição/camada não existe', () => {
    const f = [fei('f1', 'a')];
    expect(moverFeicaoParaCamada(f, [cam('a')], 'f1', 'a')).toBeNull();
    expect(moverFeicaoParaCamada(f, [cam('a')], 'f1', 'z')).toBeNull();
    expect(moverFeicaoParaCamada(f, [cam('a')], 'x', 'a')).toBeNull();
  });
});

describe('reordenarFeicao', () => {
  it('reordena dentro da camada sem sinalizar troca', () => {
    const f = [fei('1', 'a'), fei('2', 'a'), fei('3', 'a')];
    const r = reordenarFeicao(f, '1', '3', false);
    expect(r?.mudouDeCamada).toBe(false);
    expect(ids(f)).toEqual(['2', '3', '1']);
  });

  it('adota a camada do alvo e sinaliza a troca', () => {
    const f = [fei('1', 'a'), fei('2', 'b')];
    const r = reordenarFeicao(f, '1', '2', true);
    expect(r).toMatchObject({ mudouDeCamada: true, camadaOrigemId: 'a', camadaDestinoId: 'b' });
    expect(f.find((x) => x.id === '1')!.layerId).toBe('b');
    expect(ids(f)).toEqual(['1', '2']);
  });

  it('nulo com ids inválidos e a lista fica intacta', () => {
    const f = [fei('1', 'a'), fei('2', 'a')];
    expect(reordenarFeicao(f, '1', '1', true)).toBeNull();
    expect(reordenarFeicao(f, 'x', '1', true)).toBeNull();
    expect(reordenarFeicao(f, '1', 'x', true)).toBeNull();
    expect(ids(f)).toEqual(['1', '2']);
  });
});
