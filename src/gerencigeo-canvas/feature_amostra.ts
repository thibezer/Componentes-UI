import { partesDaLinha, type Feicao } from './feature_types';
import type { PontoPx, Projetor } from './feature_caixa';
import { pontoNoPoligono } from './feature_algoritmos';
import { segmentosDe } from './feature_edicao_ops';

/*
 * Qual feição está sob um ponto da tela (conta-gotas, consultas). Puro: recebe as candidatas e um projetor.
 * Prioridade: ponto/texto > linha > área; entre áreas, a menor.
 */

export const TOLERANCIA_AMOSTRA_PX = 6;

const dist = (a: PontoPx, b: PontoPx): number => Math.hypot(a.x - b.x, a.y - b.y);

function distSegmento(p: PontoPx, a: PontoPx, b: PontoPx): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const c = dx * dx + dy * dy;
  const t = c === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / c));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function areaEnvelopePx(f: Feicao, projetar: Projetor): number {
  const g = f.geometria;
  if (g.tipo !== 'Polygon') return 0;
  const pts = g.aneis[0].map(projetar);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

export function feicaoNoPonto(
  cursor: PontoPx,
  candidatas: Feicao[],
  projetar: Projetor,
  tolerancia = TOLERANCIA_AMOSTRA_PX
): Feicao | null {
  let ponto: { f: Feicao; d: number } | null = null;
  let linha: { f: Feicao; d: number } | null = null;
  let area: { f: Feicao; a: number } | null = null;

  for (const f of candidatas) {
    if (f.excluida || f.oculta) continue;
    const g = f.geometria;
    if (g.tipo === 'Point' || g.tipo === 'Text') {
      const d = dist(cursor, projetar(g.coordenada));
      if (d <= tolerancia + 2 && (!ponto || d < ponto.d)) ponto = { f, d };
    } else if (g.tipo === 'LineString') {
      let d = Infinity;
      for (const parte of partesDaLinha(g)) {
        const px = parte.map(projetar);
        for (let i = 1; i < px.length; i++) d = Math.min(d, distSegmento(cursor, px[i - 1], px[i]));
      }
      if (d <= tolerancia && (!linha || d < linha.d)) linha = { f, d };
    } else if (g.tipo === 'Circle') {
      const c = projetar(g.centro);
      const borda = projetar([g.centro[0] + g.raioMetros / 111320, g.centro[1]]);
      const r = dist(c, borda);
      if (dist(cursor, c) <= r) {
        const a = Math.PI * r * r;
        if (!area || a < area.a) area = { f, a };
      }
    } else {
      // polígono: dentro (pelo desenho do cursor em lat/lon equivalente) ou perto da borda
      const px = g.aneis[0].map(projetar);
      let d = Infinity;
      for (const [i, j] of segmentosDe(g)) d = Math.min(d, distSegmento(cursor, px[i], px[j]));
      const dentro = pontoNoPoligono([cursor.y, cursor.x], [px.map((p) => [p.y, p.x] as [number, number]), ...g.aneis.slice(1).map((a) => a.map(projetar).map((p) => [p.y, p.x] as [number, number]))]);
      if (dentro || d <= tolerancia) {
        const a = areaEnvelopePx(f, projetar);
        if (!area || a < area.a) area = { f, a };
      }
    }
  }
  return ponto?.f ?? linha?.f ?? area?.f ?? null;
}
