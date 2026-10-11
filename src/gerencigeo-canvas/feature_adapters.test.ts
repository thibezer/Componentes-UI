import { describe, it, expect } from 'vitest';
import {
  normalizarCoordenada, normalizarAnel, normalizarLinha, normalizarPoligono,
  pontoParaFeicao, segmentoParaFeicao, confrontanteParaFeicao
} from './feature_adapters';

describe('normalização de coordenadas', () => {
  it('aceita array, {lat,lng} e {latitude,longitude}', () => {
    expect(normalizarCoordenada([-23.5, -46.6])).toEqual([-23.5, -46.6]);
    expect(normalizarCoordenada({ lat: -23.5, lng: -46.6 })).toEqual([-23.5, -46.6]);
    expect(normalizarCoordenada({ latitude: -23.5, longitude: -46.6 })).toEqual([-23.5, -46.6]);
  });
  it('descarta NaN, Infinity e valores inválidos', () => {
    expect(normalizarCoordenada([NaN, 1])).toBeNull();
    expect(normalizarCoordenada([Infinity, 1])).toBeNull();
    expect(normalizarCoordenada(null)).toBeNull();
  });
  it('abre anel fechado e exige ≥3 vértices', () => {
    const anel = normalizarAnel([[1, 1], [1, 2], [2, 2], [1, 1]]);
    expect(anel).toHaveLength(3);
    expect(normalizarAnel([[1, 1], [2, 2]])).toBeNull();
  });
  it('linha exige ≥2 vértices', () => {
    expect(normalizarLinha([[1, 1]])).toBeNull();
    expect(normalizarLinha([[1, 1], [2, 2]])).toHaveLength(2);
  });
  it('suporta multianel', () => {
    const aneis = normalizarPoligono([
      [[1, 1], [1, 5], [5, 5], [5, 1]],
      [[2, 2], [2, 3], [3, 3]]
    ]);
    expect(aneis).toHaveLength(2);
  });
});

describe('adaptadores', () => {
  it('ponto com coordenada inválida vira null', () => {
    expect(pontoParaFeicao({ id: 1, lat: undefined, lon: undefined }, 'c')).toBeNull();
    expect(pontoParaFeicao({ id: 1, lat: -23.5, lon: -46.6 }, 'c')?.geometria.tipo).toBe('Point');
  });
  it('segmento usa as pontas e marca LN1 como tracejado', () => {
    const pontos = new Map([
      ['1', { id: 1, lat: -23.5, lon: -46.6 }],
      ['2', { id: 2, lat: -23.6, lon: -46.7 }]
    ]);
    const f = segmentoParaFeicao({ ponto_inicio_id: 1, ponto_fim_id: 2, tipo_limite_sigef: 'LN1' }, pontos, 'c');
    expect(f?.estilo?.dashArray).toBeTruthy();
    expect(segmentoParaFeicao({ ponto_inicio_id: 1, ponto_fim_id: 9 }, pontos, 'c')).toBeNull();
  });
  it('confrontante converte WKT lon/lat para lat/lon', () => {
    const f = confrontanteParaFeicao(
      { id: 7, poligono_wkt: 'POLYGON((-46.6 -23.5, -46.7 -23.5, -46.7 -23.6, -46.6 -23.5))' }, 'c');
    expect(f?.geometria).toMatchObject({ tipo: 'Polygon' });
    const g = f!.geometria as { aneis: number[][][] };
    expect(g.aneis[0]).toHaveLength(3);
    expect(g.aneis[0][0]).toEqual([-23.5, -46.6]);
  });
});
