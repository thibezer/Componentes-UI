import type { Par } from '../feature_types';
import { RegistroVertices, acharCortes, quebrarEmPecas, type Segmento } from './segmentos';
import { IndiceFaixas, Voltas, dentroDoResultado } from './classificacao';
import { areaComSinal, encadear, montarPoligonos, type Borda } from './montagem';
import {
  OPERACOES_BOOLEANAS, type EstatisticasBooleana, type OperacaoBooleana, type OpcoesBooleana, type PoligonoBooleano,
  type RegiaoBooleana, type RegraPreenchimento, type ResultadoBooleana
} from './tipos';

/*
 * Operações booleanas de polígonos (Pathfinder), L2 puro e genérico: serve à prancha (mm) e a qualquer módulo plano.
 *
 * Algoritmo próprio, por divisão e classificação de arestas (robusto a toques, colinearidades, furos, anéis que se
 * cruzam e arestas repetidas, porque não depende do sentido dos anéis nem de casos especiais):
 *   1. todos os vértices passam por um registro que funde pontos a menos de `q` (relativo ao tamanho das entradas);
 *   2. as arestas de todos os operandos são quebradas umas nas outras (varredura em x), virando pedaços que só se
 *      encontram nas pontas; pedaços repetidos entram uma vez;
 *   3. para cada pedaço, testa-se um ponto logo à esquerda e outro logo à direita do meio dele: em cada operando, o
 *      número de voltas (índice por faixas) e a regra dizem se o ponto está dentro; a operação diz se está no resultado.
 *      Se só um lado está no resultado, o pedaço é borda, orientado com o resultado à esquerda;
 *   4. as bordas se encadeiam em anéis; os de área positiva são externos, os de área negativa são furos.
 * Nunca lança: entrada ruim (não finita, anéis com menos de 3 pontos, operação desconhecida) é ignorada ou dá vazio.
 */

export * from './tipos';
export { pontoNoAnel } from './montagem';

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

const vazio = (): ResultadoBooleana => ({
  poligonos: [],
  estatisticas: { segmentos: 0, cortes: 0, pecas: 0, bordas: 0, aneis: 0, descartados: 0 }
});

/** Pontos finitos do anel, sem o ponto de fechamento repetido. */
function pontosValidos(anel: unknown): Par[] {
  if (!Array.isArray(anel)) return [];
  const pts = anel.filter((p): p is Par => Array.isArray(p) && fin(p[0]) && fin(p[1]));
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  return pts;
}

/**
 * Aplica a operação às regiões, na ordem dada (na subtração, a PRIMEIRA menos as outras). Uma região só também vale:
 * a união dela consigo mesma desfaz cruzamentos e sobreposições, saindo com externos e furos limpos.
 */
export function operacaoBooleana(regioes: readonly RegiaoBooleana[], operacao: OperacaoBooleana, opcoes: OpcoesBooleana = {}): ResultadoBooleana {
  if (!Array.isArray(regioes) || !OPERACOES_BOOLEANAS.includes(operacao)) return vazio();
  const entradas = regioes.map((r) => ({
    aneis: ((Array.isArray(r?.aneis) ? r.aneis : []) as ReadonlyArray<unknown>).map(pontosValidos).filter((a) => a.length >= 3),
    regra: (r?.regra === 'evenodd' ? 'evenodd' : 'nonzero') as RegraPreenchimento
  }));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of entradas) for (const a of e.aneis) for (const [x, y] of a) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const tamanho = Math.max(x1 - x0, y1 - y0);
  if (!(tamanho > 0) || !Number.isFinite(tamanho)) return vazio();
  const rel = fin(opcoes.tolerancia) ? Math.min(1e-3, Math.max(1e-12, opcoes.tolerancia)) : 1e-9;
  const q = tamanho * rel;
  const eps = q * 2;
  const reg = new RegistroVertices(q, x0, y0);

  // 1. arestas de entrada (vértices canônicos)
  const segs: Segmento[] = [];
  entradas.forEach((e, operando) => {
    for (const anel of e.aneis) {
      const vs = anel.map(([x, y]) => reg.registrar(x, y)).filter((v, i, arr) => i === 0 || v.id !== arr[i - 1].id);
      if (vs.length > 1 && vs[0].id === vs[vs.length - 1].id) vs.pop();
      if (vs.length < 3) continue;
      for (let i = 0; i < vs.length; i++) segs.push({ a: vs[i], b: vs[(i + 1) % vs.length], operando, cortes: [] });
    }
  });
  const est: EstatisticasBooleana = { segmentos: segs.length, cortes: 0, pecas: 0, bordas: 0, aneis: 0, descartados: 0 };
  if (segs.length === 0) return { poligonos: [], estatisticas: est };

  // 2. cortes e pedaços
  est.cortes = acharCortes(segs, reg, eps);
  const pecas = quebrarEmPecas(segs);
  est.pecas = pecas.length;

  // 3. classificação pelo número de voltas dos dois lados de cada pedaço
  const indice = new IndiceFaixas(segs, y0, y1);
  const regras = entradas.map((e) => e.regra);
  const vEsq = new Voltas(entradas.length);
  const vDir = new Voltas(entradas.length);
  const afastamentoMax = tamanho * 1e-6;
  const bordas: Borda[] = [];
  for (const p of pecas) {
    const dx = p.b.p[0] - p.a.p[0], dy = p.b.p[1] - p.a.p[1];
    const len = Math.hypot(dx, dy);
    if (!(len > 0)) continue;
    const d = Math.min(afastamentoMax, len * 0.1);
    const mx = (p.a.p[0] + p.b.p[0]) / 2, my = (p.a.p[1] + p.b.p[1]) / 2;
    const nx = (-dy / len) * d, ny = (dx / len) * d; // normal à esquerda (matemática)
    indice.voltas(mx + nx, my + ny, vEsq);
    indice.voltas(mx - nx, my - ny, vDir);
    const esq = dentroDoResultado(operacao, vEsq, regras);
    const dir = dentroDoResultado(operacao, vDir, regras);
    if (esq === dir) continue;
    bordas.push(esq ? { a: p.a, b: p.b } : { a: p.b, b: p.a });
  }
  est.bordas = bordas.length;

  // 4. anéis e polígonos
  const { aneis, descartadas } = encadear(bordas);
  est.aneis = aneis.length;
  const { poligonos, descartados } = montarPoligonos(aneis, q * q, afastamentoMax);
  est.descartados = descartadas + descartados;
  return { poligonos: poligonos.map(copiar), estatisticas: est };
}

/** Cópia independente (os pares saem do registro de vértices). */
const copiar = (p: PoligonoBooleano): PoligonoBooleano => ({
  exterior: p.exterior.map(([x, y]): Par => [x, y]),
  furos: p.furos.map((f) => f.map(([x, y]): Par => [x, y]))
});

/** Área total do resultado (externos menos furos). */
export function areaDosPoligonos(poligonos: readonly PoligonoBooleano[]): number {
  let s = 0;
  for (const p of poligonos ?? []) {
    s += Math.abs(areaComSinal(p.exterior));
    for (const f of p.furos) s -= Math.abs(areaComSinal(f));
  }
  return s;
}
