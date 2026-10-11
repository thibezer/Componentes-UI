import { partesDaLinha, type Feicao, type LatLonPar } from './feature_types';
import { pontoNoPoligono } from './feature_algoritmos';

/*
 * Narrow-phase da caixa de seleção: exige toque geométrico real, não só sobreposição de envelopes.
 *  - window   (esquerda → direita): a feição inteira precisa estar dentro da caixa;
 *  - crossing (direita → esquerda): basta a feição tocar a caixa.
 * Tudo em pixels de contêiner; `projetar` converte [lat, lon] para esse espaço.
 */

export interface CaixaPx {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PontoPx {
  x: number;
  y: number;
}

export type Projetor = (p: LatLonPar) => PontoPx;
export type ModoCaixa = 'window' | 'crossing';

const METROS_POR_GRAU = 111320;

function dentro(p: PontoPx, c: CaixaPx): boolean {
  return p.x >= c.x1 && p.x <= c.x2 && p.y >= c.y1 && p.y <= c.y2;
}

/** Liang–Barsky: o segmento a-b toca o retângulo? */
function segmentoToca(a: PontoPx, b: PontoPx, c: CaixaPx): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - c.x1, c.x2 - a.x, a.y - c.y1, c.y2 - a.y];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
}

function pontoNoAnel(p: PontoPx, anel: PontoPx[]): boolean {
  let dentroAnel = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const a = anel[i];
    const b = anel[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      dentroAnel = !dentroAnel;
    }
  }
  return dentroAnel;
}

function arestasTocam(pts: PontoPx[], c: CaixaPx, fechado: boolean): boolean {
  for (let i = 1; i < pts.length; i++) if (segmentoToca(pts[i - 1], pts[i], c)) return true;
  return fechado && pts.length > 2 && segmentoToca(pts[pts.length - 1], pts[0], c);
}

function raioEmPx(centro: LatLonPar, raioMetros: number, projetar: Projetor): number {
  const a = projetar(centro);
  const b = projetar([centro[0] + raioMetros / METROS_POR_GRAU, centro[1]]);
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function feicaoNaCaixa(f: Feicao, caixa: CaixaPx, projetar: Projetor, modo: ModoCaixa): boolean {
  if (f.oculta) return false;
  const g = f.geometria;
  const window = modo === 'window';

  switch (g.tipo) {
    case 'Point':
    case 'Text':
      return dentro(projetar(g.coordenada), caixa);

    case 'LineString': {
      // multiparte: Window exige todas as partes dentro; Crossing, que alguma parte toque (partes não se ligam entre si)
      const partes = partesDaLinha(g).map((parte) => parte.map(projetar));
      return window
        ? partes.every((pts) => pts.every((p) => dentro(p, caixa)))
        : partes.some((pts) => pts.some((p) => dentro(p, caixa)) || arestasTocam(pts, caixa, false));
    }

    case 'Polygon': {
      const aneis = g.aneis.map((a) => a.map(projetar));
      const externo = aneis[0];
      if (!externo) return false;
      if (window) return externo.every((p) => dentro(p, caixa));
      if (aneis.some((a) => a.some((p) => dentro(p, caixa)) || arestasTocam(a, caixa, true))) return true;
      // caixa inteira dentro da área (e fora dos furos): nenhuma aresta a toca
      const canto = { x: caixa.x1, y: caixa.y1 };
      return pontoNoAnel(canto, externo) && !aneis.slice(1).some((furo) => pontoNoAnel(canto, furo));
    }

    case 'Circle': {
      const centro = projetar(g.centro);
      const r = raioEmPx(g.centro, g.raioMetros, projetar);
      if (window) {
        return centro.x - r >= caixa.x1 && centro.x + r <= caixa.x2 && centro.y - r >= caixa.y1 && centro.y + r <= caixa.y2;
      }
      const nx = Math.max(caixa.x1, Math.min(centro.x, caixa.x2));
      const ny = Math.max(caixa.y1, Math.min(centro.y, caixa.y2));
      return Math.hypot(centro.x - nx, centro.y - ny) <= r;
    }
  }
}

/**
 * Seleção por laço (polígono em coordenadas geográficas). Ponto, texto e círculo entram se o ponto de
 * referência está dentro; linha, se algum vértice está; polígono, se algum vértice ou o centróide está.
 */
export function feicaoNoLaco(f: Feicao, laco: LatLonPar[]): boolean {
  if (laco.length < 3 || f.oculta) return false;
  const dentroDoLaco = (p: LatLonPar): boolean => pontoNoPoligono(p, [laco]);
  const g = f.geometria;
  switch (g.tipo) {
    case 'Point':
    case 'Text':
      return dentroDoLaco(g.coordenada);
    case 'Circle':
      return dentroDoLaco(g.centro);
    case 'LineString':
      return partesDaLinha(g).some((parte) => parte.some(dentroDoLaco));
    case 'Polygon': {
      const externo = g.aneis[0] ?? [];
      if (externo.some(dentroDoLaco)) return true;
      if (externo.length < 3) return false;
      const soma = externo.reduce<LatLonPar>((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
      return dentroDoLaco([soma[0] / externo.length, soma[1] / externo.length]);
    }
  }
}
