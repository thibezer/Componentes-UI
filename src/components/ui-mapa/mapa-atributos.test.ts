import { describe, it, expect, vi } from 'vitest';
import { corSegura, lerCamadas, lerInteiroPositivo, lerPontos, lerVista, VISTA_PADRAO } from './mapa-atributos';

describe('lerVista', () => {
  it('lê valores válidos', () => {
    expect(lerVista('-10.5', '-50.25', '8')).toEqual({ lat: -10.5, lng: -50.25, zoom: 8 });
  });

  it('cada campo inválido cai no padrão, sem afetar os outros', () => {
    expect(lerVista('abc', '-50', '8')).toEqual({ lat: VISTA_PADRAO.lat, lng: -50, zoom: 8 });
    expect(lerVista('-10', null, 'x')).toEqual({ lat: -10, lng: VISTA_PADRAO.lng, zoom: VISTA_PADRAO.zoom });
    expect(lerVista(null, null, null)).toEqual(VISTA_PADRAO);
  });

  it('rejeita fora do domínio (lat > 90, lng > 180, zoom < 0 ou > 22) e Infinity', () => {
    expect(lerVista('91', '181', '23')).toEqual(VISTA_PADRAO);
    expect(lerVista('-91', '-181', '-1')).toEqual(VISTA_PADRAO);
    expect(lerVista('Infinity', 'NaN', '1e9')).toEqual({ ...VISTA_PADRAO, zoom: 1 });
  });
});

describe('lerInteiroPositivo', () => {
  it('aceita inteiros positivos e usa o padrão para o resto', () => {
    expect(lerInteiroPositivo('5', 3)).toBe(5);
    expect(lerInteiroPositivo('0', 3)).toBe(3);
    expect(lerInteiroPositivo('-2', 3)).toBe(3);
    expect(lerInteiroPositivo('abc', 3)).toBe(3);
    expect(lerInteiroPositivo(null, 3)).toBe(3);
  });
});

describe('corSegura', () => {
  it.each(['#fff', '#ffff', '#ff00aa', '#ff00aa80', 'rgb(1, 2, 3)', 'rgba(1,2,3,0.5)', 'hsl(120, 50%, 50%)', 'red', 'RebeccaPurple'])('aceita %s', (cor) => {
    expect(corSegura(cor, '#000')).toBe(cor);
  });

  it.each([
    'red;" onmouseover="alert(1)',
    'red"><img src=x onerror=alert(1)>',
    'url(javascript:alert(1))',
    'expression(alert(1))',
    '#ggg',
    'rgb(1,2,3);color:red',
    '',
    'a',
    '1234'
  ])('rejeita %s', (cor) => {
    expect(corSegura(cor, '#000')).toBe('#000');
  });

  it('null e undefined usam o padrão', () => {
    expect(corSegura(null, '#123')).toBe('#123');
    expect(corSegura(undefined, '#123')).toBe('#123');
  });
});

describe('lerCamadas', () => {
  const conhecidas = ['osm', 'satelite', 'ruas'];

  it('filtra pelas conhecidas, ignora caixa e espaços', () => {
    expect(lerCamadas(' Satelite , x, RUAS ', conhecidas)).toEqual(['satelite', 'ruas']);
  });

  it('sem nenhuma válida (ou nulo) volta para osm', () => {
    expect(lerCamadas('x,y', conhecidas)).toEqual(['osm']);
    expect(lerCamadas(null, conhecidas)).toEqual(['osm']);
    expect(lerCamadas('', conhecidas)).toEqual(['osm']);
  });
});

describe('lerPontos', () => {
  it('lê pares válidos', () => {
    expect(lerPontos('[[1,2],[3,4]]')).toEqual([[1, 2], [3, 4]]);
  });

  it('descarta pares inválidos mas mantém os válidos', () => {
    expect(lerPontos('[[1,2],["a","b"],[1],null,[91,0],[0,181],[5,6,7]]')).toEqual([[1, 2], [5, 6]]);
  });

  it('JSON malformado devolve [] e registra o erro; não-array devolve [] em silêncio', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(lerPontos('{nao-json')).toEqual([]);
    expect(erro).toHaveBeenCalledTimes(1);
    expect(lerPontos('{"a":1}')).toEqual([]);
    expect(lerPontos('42')).toEqual([]);
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  it('nulo e vazio devolvem []', () => {
    expect(lerPontos(null)).toEqual([]);
    expect(lerPontos('')).toEqual([]);
  });
});
