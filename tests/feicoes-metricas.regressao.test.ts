import { describe, expect, it } from 'vitest';
import { areaMetros2, comprimentoMetros, distanciaMetros, metrosPorGrau } from '../src/gerencigeo-canvas/feature_metricas';
import { deslocarGeometria } from '../src/gerencigeo-canvas/feature_algoritmos';
import type { LatLonPar } from '../src/gerencigeo-canvas/feature_types';

/* Medidas no elipsoide GRS80 (antes: esfera de 6371 km, com erro de até 0,5% na distância e 0,45% na área). */

const A = 6378137;
const E2 = (1 / 298.257222101) * (2 - 1 / 298.257222101);

/** Área exata de um quadrilátero entre paralelos e meridianos (latitude autálica). */
function areaExataEntreParalelos(lat: number, dLat: number, dLon: number): number {
  const e = Math.sqrt(E2);
  const q = (graus: number): number => {
    const s = Math.sin((graus * Math.PI) / 180);
    return (1 - E2) * (s / (1 - E2 * s * s) - (1 / (2 * e)) * Math.log((1 - e * s) / (1 + e * s)));
  };
  const qp = q(90);
  return ((A * A * qp) / 2) * ((dLon * Math.PI) / 180) * ((q(lat + dLat) - q(lat)) / qp);
}

describe('medidas elipsoidais', () => {
  it('distância: linha Flinders Peak–Buninyong (Geoscience Australia, GRS80) = 54 972,271 m', () => {
    const flinders: LatLonPar = [-(37 + 57 / 60 + 3.7203 / 3600), 144 + 25 / 60 + 29.5244 / 3600];
    const buninyong: LatLonPar = [-(37 + 39 / 60 + 10.1561 / 3600), 143 + 55 / 60 + 35.3839 / 3600];
    expect(distanciaMetros(flinders, buninyong)).toBeCloseTo(54972.271, 2);
  });

  it('distância curta: 0,01° de latitude e de longitude em -15,79°', () => {
    expect(distanciaMetros([-15.79, -47.88], [-15.78, -47.88])).toBeCloseTo(1106.565, 1);
    expect(distanciaMetros([-15.79, -47.88], [-15.79, -47.87])).toBeCloseTo(1071.455, 1);
    expect(distanciaMetros([-15.79, -47.88], [-15.79, -47.88])).toBe(0);
  });

  it('comprimento soma as distâncias, com e sem fechamento', () => {
    const q: LatLonPar[] = [[-15.79, -47.88], [-15.78, -47.88], [-15.78, -47.87], [-15.79, -47.87]];
    expect(comprimentoMetros(q, true)).toBeGreaterThan(comprimentoMetros(q, false));
  });

  it('área: erro < 0,01% de lote a município', () => {
    for (const [lat, lon, d] of [[-15.8, -47.9, 0.001], [-16.7, -49.3, 0.03], [-3, -60, 0.5]] as const) {
      const anel: LatLonPar[] = [[lat, lon], [lat + d, lon], [lat + d, lon + d], [lat, lon + d]];
      const exata = areaExataEntreParalelos(lat, d, d);
      expect(Math.abs(areaMetros2([anel]) - exata) / exata).toBeLessThan(1e-4);
    }
  });

  it('área com furo subtrai e anel degenerado vale zero', () => {
    const ext: LatLonPar[] = [[-15.8, -47.9], [-15.798, -47.9], [-15.798, -47.898], [-15.8, -47.898]];
    const furo: LatLonPar[] = [[-15.7995, -47.8995], [-15.7985, -47.8995], [-15.7985, -47.8985], [-15.7995, -47.8985]];
    expect(areaMetros2([ext, furo])).toBeLessThan(areaMetros2([ext]));
    expect(areaMetros2([[[-15, -47], [-15, -46]]])).toBe(0);
    expect(areaMetros2([])).toBe(0);
  });

  it('deslocarGeometria e metrosPorGrau usam a escala do elipsoide', () => {
    expect(metrosPorGrau(0).lng).toBeCloseTo(111319.49, 1);
    expect(metrosPorGrau(0).lat).toBeCloseTo(110574.28, 1);
    const p = deslocarGeometria({ tipo: 'Point', coordenada: [-15.79, -47.88] }, 100, 100) as { coordenada: LatLonPar };
    expect(distanciaMetros([-15.79, -47.88], p.coordenada)).toBeCloseTo(Math.hypot(100, 100), 1);
  });
});
