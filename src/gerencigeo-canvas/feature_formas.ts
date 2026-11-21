import type { LatLonPar } from './feature_types';
import type { Espaco } from './espaco/espaco_tipos';
import { ESPACO_GEOGRAFICO } from './espaco/espaco_geografico';

/*
 * Formas geradas a partir de dois cliques (centro + ponto da borda): elipse, polígono regular e estrela.
 * Puras e sem Leaflet. A elipse usa os raios de cada eixo (em graus no geográfico, como o desenho por caixa); o polígono
 * regular e a estrela corrigem o eixo 1 pelo `fatorEixo` do espaço (o cos(lat) do geográfico, padrão; 1 no plano) para
 * não saírem achatados.
 */

const PASSOS_ELIPSE = 36;
const PROPORCAO_INTERNA_ESTRELA = 0.45;

/** Elipse inscrita na caixa definida pelo centro e pelo canto; vazia se os dois raios são zero. */
export function gerarElipse(centro: LatLonPar, borda: LatLonPar): LatLonPar[] | null {
  const rLat = Math.abs(borda[0] - centro[0]);
  const rLon = Math.abs(borda[1] - centro[1]);
  if (rLat === 0 && rLon === 0) return null;
  const pontos: LatLonPar[] = [];
  for (let i = 0; i < PASSOS_ELIPSE; i++) {
    const t = (i * 2 * Math.PI) / PASSOS_ELIPSE;
    pontos.push([centro[0] + rLat * Math.sin(t), centro[1] + rLon * Math.cos(t)]);
  }
  return pontos;
}

function raioEAngulo(centro: LatLonPar, borda: LatLonPar, espaco: Espaco): { raio: number; inicio: number; cosLat: number } | null {
  const cosLat = espaco.fatorEixo(centro);
  const dLat = borda[0] - centro[0];
  const dLon = (borda[1] - centro[1]) * cosLat;
  const raio = Math.hypot(dLat, dLon);
  if (raio === 0) return null;
  return { raio, inicio: Math.atan2(dLat, dLon), cosLat };
}

/** Polígono regular (padrão: hexágono) com um vértice em `borda`. */
export function gerarPoligonoRegular(centro: LatLonPar, borda: LatLonPar, lados = 6, espaco: Espaco = ESPACO_GEOGRAFICO): LatLonPar[] | null {
  const base = raioEAngulo(centro, borda, espaco);
  if (!base || lados < 3) return null;
  const pontos: LatLonPar[] = [];
  for (let i = 0; i < lados; i++) {
    const a = base.inicio + (i * 2 * Math.PI) / lados;
    pontos.push([centro[0] + base.raio * Math.sin(a), centro[1] + (base.raio * Math.cos(a)) / base.cosLat]);
  }
  return pontos;
}

/**
 * Estrela (padrão: 5 pontas); `borda` define o raio externo e a rotação. `proporcaoInterna` é o raio interno sobre o externo
 * (padrão 0,45); fora de (0, 1] ou não finita, vale o padrão.
 */
export function gerarEstrela(
  centro: LatLonPar,
  borda: LatLonPar,
  pontas = 5,
  espaco: Espaco = ESPACO_GEOGRAFICO,
  proporcaoInterna = PROPORCAO_INTERNA_ESTRELA
): LatLonPar[] | null {
  const base = raioEAngulo(centro, borda, espaco);
  if (!base || pontas < 3) return null;
  const k = Number.isFinite(proporcaoInterna) && proporcaoInterna > 0 && proporcaoInterna <= 1 ? proporcaoInterna : PROPORCAO_INTERNA_ESTRELA;
  const total = pontas * 2;
  const pontos: LatLonPar[] = [];
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? base.raio : base.raio * k;
    const a = base.inicio + (i * 2 * Math.PI) / total;
    pontos.push([centro[0] + r * Math.sin(a), centro[1] + (r * Math.cos(a)) / base.cosLat]);
  }
  return pontos;
}
