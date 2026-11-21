import type { Par } from '../feature_types';
import { areaComSinal } from '../espaco/espaco_plano';
import { IndiceFaixas, Voltas, type ArestaIndexavel } from './classificacao';

export { areaComSinal };
import type { PoligonoBooleano } from './tipos';
import type { Vertice } from './segmentos';

/*
 * Montagem (L2 pura), última etapa das booleanas: as bordas orientadas (o resultado sempre à ESQUERDA de cada uma) são
 * encadeadas em anéis. Num vértice com mais de uma saída, vale a curva mais à esquerda (fica colada à face da esquerda,
 * e dois quadrados que se tocam numa quina saem como dois anéis). Anéis de área positiva são externos; os de área
 * negativa são furos e vão para o menor externo que os contém.
 */

export interface Borda {
  a: Vertice;
  b: Vertice;
}

/** Ponto dentro do anel (par-ímpar). */
export function pontoNoAnel(x: number, y: number, anel: readonly Par[]): boolean {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** Tira vértices colineares (continuação reta ou espinho de ida e volta). */
export function semColineares(anel: Par[]): Par[] {
  let pts = anel;
  for (let passada = 0; passada < 4; passada++) {
    const n = pts.length;
    if (n < 3) return pts;
    const saida: Par[] = [];
    for (let i = 0; i < n; i++) {
      const a = saida.length > 0 ? saida[saida.length - 1] : pts[(i - 1 + n) % n];
      const p = pts[i];
      const b = pts[(i + 1) % n];
      const ux = p[0] - a[0], uy = p[1] - a[1], vx = b[0] - p[0], vy = b[1] - p[1];
      const cruz = ux * vy - uy * vx;
      if (Math.abs(cruz) <= 1e-12 * Math.hypot(ux, uy) * Math.hypot(vx, vy)) continue;
      saida.push(p);
    }
    if (saida.length === n) return saida;
    pts = saida;
  }
  return pts;
}

/** Encadeia as bordas em anéis fechados; cadeias que não fecham são contadas em `descartadas`. */
export function encadear(bordas: readonly Borda[]): { aneis: Par[][]; descartadas: number } {
  const saidas = new Map<number, number[]>();
  bordas.forEach((e, i) => {
    const l = saidas.get(e.a.id);
    if (l) l.push(i);
    else saidas.set(e.a.id, [i]);
  });
  const usada = new Uint8Array(bordas.length);
  const aneis: Par[][] = [];
  let descartadas = 0;
  for (let i0 = 0; i0 < bordas.length; i0++) {
    if (usada[i0]) continue;
    const inicio = bordas[i0].a.id;
    const anel: Par[] = [bordas[i0].a.p];
    let atual = i0;
    let fechou = false;
    for (let guarda = 0; guarda <= bordas.length; guarda++) {
      usada[atual] = 1;
      const e = bordas[atual];
      if (e.b.id === inicio) { fechou = true; break; }
      anel.push(e.b.p);
      const livres = (saidas.get(e.b.id) ?? []).filter((k) => !usada[k]);
      if (livres.length === 0) break;
      atual = livres.length === 1 ? livres[0] : maisAEsquerda(e, livres, bordas);
    }
    if (fechou && anel.length >= 3) aneis.push(anel);
    else descartadas++;
  }
  return { aneis, descartadas };
}

function maisAEsquerda(entrada: Borda, candidatas: readonly number[], bordas: readonly Borda[]): number {
  const dx = entrada.b.p[0] - entrada.a.p[0], dy = entrada.b.p[1] - entrada.a.p[1];
  let melhor = candidatas[0];
  let angMelhor = -Infinity;
  for (const k of candidatas) {
    const s = bordas[k];
    const ex = s.b.p[0] - s.a.p[0], ey = s.b.p[1] - s.a.p[1];
    const ang = Math.atan2(dx * ey - dy * ex, dx * ex + dy * ey);
    if (ang > angMelhor) { angMelhor = ang; melhor = k; }
  }
  return melhor;
}

/** Separa externos e furos e põe cada furo no menor externo que o contém; furos sem externo são descartados. */
export function montarPoligonos(aneis: readonly Par[][], areaMinima: number, afastamento: number): { poligonos: PoligonoBooleano[]; descartados: number } {
  const externos: Array<{ anel: Par[]; area: number; poligono: PoligonoBooleano }> = [];
  const furos: Array<{ anel: Par[]; area: number }> = [];
  for (const bruto of aneis) {
    const anel = semColineares(bruto);
    if (anel.length < 3) continue;
    const area = areaComSinal(anel);
    if (Math.abs(area) <= areaMinima) continue;
    if (area > 0) externos.push({ anel, area, poligono: { exterior: anel, furos: [] } });
    else furos.push({ anel, area: -area });
  }
  externos.sort((a, b) => a.area - b.area);
  let descartados = 0;
  if (furos.length > 0) {
    // os anéis externos num índice por faixas (operando = posição do externo): uma consulta diz quais contêm o ponto
    let y0 = Infinity, y1 = -Infinity;
    const arestas: ArestaIndexavel[] = [];
    externos.forEach((e, k) => e.anel.forEach((p, i) => {
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
      arestas.push({ a: { p }, b: { p: e.anel[(i + 1) % e.anel.length] }, operando: k });
    }));
    const indice = new IndiceFaixas(arestas, y0, y1);
    const voltas = new Voltas(externos.length);
    for (const f of furos) {
      // um ponto logo à direita da primeira aresta do furo fica DENTRO do furo (o resultado está à esquerda)
      const [a, b] = [f.anel[0], f.anel[1]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const d = Math.min(afastamento, len * 0.1);
      indice.voltas((a[0] + b[0]) / 2 + ((b[1] - a[1]) / len) * d, (a[1] + b[1]) / 2 - ((b[0] - a[0]) / len) * d, voltas);
      let dono = -1;
      // externos em ordem crescente de área: o menor que contém o furo é o dono
      for (let t = 0; t < voltas.n; t++) {
        const k = voltas.tocados[t];
        if (voltas.voltas[k] !== 0 && externos[k].area > f.area && (dono < 0 || k < dono)) dono = k;
      }
      if (dono >= 0) externos[dono].poligono.furos.push(f.anel);
      else descartados++;
    }
  }
  return { poligonos: externos.map((e) => e.poligono), descartados };
}
