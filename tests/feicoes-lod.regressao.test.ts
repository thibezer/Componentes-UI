import { describe, it, expect } from 'vitest';
import {
  MIN_VERTICES_SIMPLIFICAR, ZOOM_SEM_SIMPLIFICACAO, toleranciaPorZoom, simplificarGeometria, simplificarLinha
} from '../src/gerencigeo-canvas/feature_simplificacao';
import { feicaoNoPonto } from '../src/gerencigeo-canvas/feature_amostra';
import type { Feicao, GeometriaFeicao, LatLonPar } from '../src/gerencigeo-canvas/feature_types';

/*
 * Regressões da Fase 1 do motor de formas: simplificação em pixels (não em graus de longitude), proteção contra zoom
 * inválido e o hit-test em anéis enormes. Cada teste falhava antes da correção.
 */

const linhaZigzag = (lat: number, n: number, desvioLat: number): LatLonPar[] =>
  Array.from({ length: n }, (_, i): LatLonPar => [lat + (i === Math.floor(n / 2) ? desvioLat : 0), -46.6 + i * 1e-4]);

describe('simplificação por tolerância em pixels', () => {
  it('passa a valer para feições acima de ~8 vértices, em qualquer zoom abaixo de ZOOM_SEM_SIMPLIFICACAO', () => {
    expect(MIN_VERTICES_SIMPLIFICAR).toBe(9);
    expect(ZOOM_SEM_SIMPLIFICACAO).toBeGreaterThan(12);
    expect(toleranciaPorZoom(14)).toBeGreaterThan(0);
    expect(toleranciaPorZoom(ZOOM_SEM_SIMPLIFICACAO)).toBe(0);
    const g: GeometriaFeicao = { tipo: 'LineString', coordenadas: Array.from({ length: 20 }, (_, i): LatLonPar => [-23.5 + (i % 2) * 1e-7, -46.6 + i * 1e-5]) };
    const s = simplificarGeometria(g, 14) as Extract<GeometriaFeicao, { tipo: 'LineString' }>;
    expect(s.coordenadas.length).toBeLessThan(20);
  });

  it('abaixo do mínimo de vértices devolve a mesma referência', () => {
    const g: GeometriaFeicao = { tipo: 'LineString', coordenadas: linhaZigzag(-23.5, MIN_VERTICES_SIMPLIFICAR - 1, 0) };
    expect(simplificarGeometria(g, 5)).toBe(g);
  });

  it('a tolerância é em PIXELS também na vertical: em latitude alta um desvio de ~2 px não é apagado', () => {
    // a 60° de latitude, 1 px de altura vale metade do deslocamento em graus de latitude de 1 px de largura em lon
    const zoom = 14;
    const grauPorPx = 360 / (256 * 2 ** zoom);
    const lat = -60;
    const desvio = (1.1 * grauPorPx) * Math.cos((lat * Math.PI) / 180); // 1,1 px em lat: abaixo de 1,2 px, some
    const desvioMaior = (2.2 * grauPorPx) * Math.cos((lat * Math.PI) / 180); // 2,2 px: tem que ficar
    const pequeno: GeometriaFeicao = { tipo: 'LineString', coordenadas: linhaZigzag(lat, 11, desvio) };
    const grande: GeometriaFeicao = { tipo: 'LineString', coordenadas: linhaZigzag(lat, 11, desvioMaior) };
    const sp = simplificarGeometria(pequeno, zoom) as Extract<GeometriaFeicao, { tipo: 'LineString' }>;
    const sg = simplificarGeometria(grande, zoom) as Extract<GeometriaFeicao, { tipo: 'LineString' }>;
    expect(sp.coordenadas).toHaveLength(2);
    expect(sg.coordenadas.length).toBeGreaterThan(2);
  });

  it('com escala de latitude 1 o comportamento antigo de simplificarLinha é preservado', () => {
    const pts = linhaZigzag(0, 21, 0.5);
    expect(simplificarLinha(pts, 0.1)).toEqual(simplificarLinha(pts, 0.1, 1));
  });

  it('zoom NaN, Infinity ou negativo não colapsa a geometria para 2 pontos', () => {
    const g: GeometriaFeicao = { tipo: 'LineString', coordenadas: linhaZigzag(-23.5, 60, 1e-3) };
    expect(toleranciaPorZoom(NaN)).toBe(0);
    expect(simplificarGeometria(g, NaN)).toBe(g);
    expect(simplificarGeometria(g, Infinity)).toBe(g);
  });

  it('latitude NaN no primeiro vértice não lança nem corrompe a simplificação', () => {
    const coords = linhaZigzag(-23.5, 30, 1e-3);
    coords[0] = [NaN, NaN];
    const g: GeometriaFeicao = { tipo: 'LineString', coordenadas: coords };
    expect(() => simplificarGeometria(g, 12)).not.toThrow();
  });
});

describe('feicaoNoPonto em anel enorme', () => {
  it('um polígono com 300 mil vértices não estoura a pilha (Math.max(...xs))', () => {
    const n = 300000;
    const anel: LatLonPar[] = Array.from({ length: n }, (_, i): LatLonPar => {
      const a = (i / n) * Math.PI * 2;
      return [-23.5 + Math.sin(a) * 0.01, -46.6 + Math.cos(a) * 0.01];
    });
    const grande: Feicao = { id: 'g', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Polygon', aneis: [anel] } };
    const projetar = (p: LatLonPar) => ({ x: p[1] * 1000, y: p[0] * 1000 });
    expect(() => feicaoNoPonto({ x: -46600, y: -23500 }, [grande], projetar)).not.toThrow();
    expect(feicaoNoPonto({ x: -46600, y: -23500 }, [grande], projetar)?.id).toBe('g');
  });
});
