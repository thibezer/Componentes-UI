import type { LatLonPar } from '../feature_types';
import { areaMetros2, comprimentoMetros, distanciaMetros, extremosDoCirculoGeografico, metrosPorGrau } from '../feature_metricas';
import type { Espaco, PlanoLocal, XY } from './espaco_tipos';

/*
 * Espaço geográfico: `[lat, lon]` em graus, medidas em metros no elipsoide GRS80 (SIRGAS 2000 / WGS-84). É o padrão de
 * todo o núcleo e reproduz BIT A BIT o que cada módulo fazia antes da generalização, inclusive as aproximações que diferem
 * entre si (o envelope e a medida do raio em px são esféricos; a alça da borda e o plano local são elipsoidais). Corrigir
 * essas diferenças seria mudança de comportamento: ver `docs/canvas-prancha.md` e o teste golden
 * `tests/espaco-geografico.caracterizacao.test.ts`.
 */

const METROS_POR_GRAU_ESFERICO = 111320;

/** Plano equiretangular local em metros (escala do elipsoide na latitude de referência), x = leste, y = norte. */
function planoLocalGeografico(ref: LatLonPar): PlanoLocal {
  const { lat, lng } = metrosPorGrau(ref[0]);
  const lat0 = ref[0];
  const lon0 = ref[1];
  const mLat = lat;
  const mLng = Math.max(lng, 1);
  return {
    paraXY: (p: LatLonPar): XY => [(p[1] - lon0) * mLng, (p[0] - lat0) * mLat],
    deXY: (p: XY): LatLonPar => [lat0 + p[1] / mLat, lon0 + p[0] / mLng]
  };
}

export const ESPACO_GEOGRAFICO: Espaco = Object.freeze({
  tipo: 'geografico',
  unidade: 'm',
  distancia: (a: LatLonPar, b: LatLonPar): number => distanciaMetros(a, b),
  comprimento: (pts: LatLonPar[], fechado = false): number => comprimentoMetros(pts, fechado),
  area: (aneis: LatLonPar[][]): number => areaMetros2(aneis),
  planoLocal: planoLocalGeografico,
  deslocar(p: LatLonPar, lesteM: number, norteM: number): LatLonPar {
    const escala = metrosPorGrau(p[0]);
    const dLat = norteM / escala.lat;
    const dLon = lesteM / Math.max(escala.lng, 1);
    return [p[0] + dLat, p[1] + dLon];
  },
  pontoDaBorda(centro: LatLonPar, raioMetros: number): LatLonPar {
    // mesma escala de distanciaMetros (mesma latitude), para a alça de borda reproduzir exatamente o raio
    return [centro[0], centro[1] + raioMetros / Math.max(metrosPorGrau(centro[0]).lng, 1)];
  },
  pontoDeMedidaDoRaio: (centro: LatLonPar, raioMetros: number): LatLonPar => [centro[0] + raioMetros / METROS_POR_GRAU_ESFERICO, centro[1]],
  extremosDoCirculo: extremosDoCirculoGeografico,
  fatorEixo: (ref: LatLonPar): number => Math.cos((ref[0] * Math.PI) / 180) || 1
}) as Espaco;
