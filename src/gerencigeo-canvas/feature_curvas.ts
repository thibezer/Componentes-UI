import type { LatLonPar, NoCurva } from './feature_types';

export type { NoCurva };

/*
 * Curvas de Bézier cúbicas (puras, sem Leaflet). Uma curva é uma lista de nós; entre dois nós vizinhos há um
 * segmento cúbico `ponto → saida` / `entrada → ponto`. Nó sem alça é canto (a alça cai sobre o próprio ponto).
 * A curva é a fonte do desenho (comandos `C` do SVG / `bezierCurveTo` do canvas, calculados no zoom atual);
 * `amostrarCurva` gera os vértices que as métricas, o snap e a seleção usam.
 */

/** Subdivisões por segmento ao gerar os vértices de apoio (métricas, snap, seleção). */
export const PASSOS_CURVA = 24;

/** Menor número de nós que forma uma curva. */
export const MIN_NOS_CURVA = 2;

const finito = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const ehPar = (p: unknown): p is LatLonPar => Array.isArray(p) && p.length === 2 && finito(p[0]) && finito(p[1]);

/** Alça oposta, com o mesmo comprimento (alças simétricas, como a caneta). */
export function espelhoDaAlca(ponto: LatLonPar, alca: LatLonPar): LatLonPar {
  return [2 * ponto[0] - alca[0], 2 * ponto[1] - alca[1]];
}

/** Algum nó tem alça? Sem alças a "curva" é só uma poligonal. */
export function temAlcas(nos: readonly NoCurva[]): boolean {
  return nos.some((n) => n.entrada !== undefined || n.saida !== undefined);
}

/** Pontos de controle do segmento de `a` até `b`. */
export function controlesDoSegmento(a: NoCurva, b: NoCurva): [LatLonPar, LatLonPar] {
  return [a.saida ?? a.ponto, b.entrada ?? b.ponto];
}

/** Segmentos da curva como pares de índices (o último liga ao primeiro se `fechada`). */
function pares(n: number, fechada: boolean): Array<[number, number]> {
  const lista: Array<[number, number]> = [];
  for (let i = 0; i < n - 1; i++) lista.push([i, i + 1]);
  if (fechada && n > 2) lista.push([n - 1, 0]);
  return lista;
}

/** Ponto da cúbica no parâmetro `t` (0 a 1). */
export function pontoDaCubica(p0: LatLonPar, c1: LatLonPar, c2: LatLonPar, p1: LatLonPar, t: number): LatLonPar {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1]];
}

/**
 * Vértices que acompanham a curva. Aberta: começa no primeiro nó e termina no último. Fechada: anel aberto
 * (sem repetir o primeiro), incluindo o segmento que volta ao primeiro nó. Segmento sem alças vira reta (só as pontas).
 */
export function amostrarCurva(nos: readonly NoCurva[], fechada = false, passos = PASSOS_CURVA): LatLonPar[] {
  if (nos.length === 0) return [];
  const saida: LatLonPar[] = [[nos[0].ponto[0], nos[0].ponto[1]]];
  for (const [i, j] of pares(nos.length, fechada)) {
    const a = nos[i];
    const b = nos[j];
    const reto = a.saida === undefined && b.entrada === undefined;
    if (!reto) {
      const [c1, c2] = controlesDoSegmento(a, b);
      for (let s = 1; s < passos; s++) saida.push(pontoDaCubica(a.ponto, c1, c2, b.ponto, s / passos));
    }
    // no fechamento o ponto final é o primeiro nó, que já está na lista
    if (j !== 0) saida.push([b.ponto[0], b.ponto[1]]);
  }
  return saida;
}

/** Um passo do traçado: `M` move, `L` reta até o ponto, `C` cúbica com dois controles e o ponto final. */
export type PassoCurva =
  | { cmd: 'M' | 'L'; pts: [LatLonPar] }
  | { cmd: 'C'; pts: [LatLonPar, LatLonPar, LatLonPar] };

/** Traçado da curva em passos; o canvas e o SVG desenham exatamente o mesmo caminho a partir dele. */
export function passosDaCurva(nos: readonly NoCurva[], fechada: boolean): PassoCurva[] {
  if (nos.length === 0) return [];
  const passos: PassoCurva[] = [{ cmd: 'M', pts: [nos[0].ponto] }];
  for (const [i, j] of pares(nos.length, fechada)) {
    const a = nos[i];
    const b = nos[j];
    if (a.saida === undefined && b.entrada === undefined) {
      passos.push({ cmd: 'L', pts: [b.ponto] });
    } else {
      const [c1, c2] = controlesDoSegmento(a, b);
      passos.push({ cmd: 'C', pts: [c1, c2, b.ponto] });
    }
  }
  return passos;
}

/**
 * Caminho no formato `d` do SVG, com `projetar` levando cada coordenada ao espaço de desenho (pixels do zoom atual).
 */
export function caminhoSvg(nos: readonly NoCurva[], fechada: boolean, projetar: (p: LatLonPar) => { x: number; y: number }): string {
  const f = (n: number): string => String(Math.round(n * 100) / 100);
  const d = passosDaCurva(nos, fechada)
    .map((passo) => passo.cmd + (passo.pts as LatLonPar[]).map((p) => { const q = projetar(p); return `${f(q.x)} ${f(q.y)}`; }).join(' '))
    .join('');
  return d && fechada ? `${d}Z` : d;
}

/**
 * Valida nós vindos de fora (JSON do consumidor). Devolve cópias limpas ou `null` se algum nó é inválido,
 * se há nós de menos ou se não há alça alguma (então não é curva). Alças inválidas são descartadas.
 */
export function normalizarNos(bruto: unknown, minimo = MIN_NOS_CURVA): NoCurva[] | null {
  if (!Array.isArray(bruto) || bruto.length < minimo) return null;
  const nos: NoCurva[] = [];
  for (const n of bruto) {
    if (!n || typeof n !== 'object' || !ehPar((n as NoCurva).ponto)) return null;
    const r = n as NoCurva;
    const no: NoCurva = { ponto: [r.ponto[0], r.ponto[1]] };
    if (ehPar(r.entrada)) no.entrada = [r.entrada[0], r.entrada[1]];
    if (ehPar(r.saida)) no.saida = [r.saida[0], r.saida[1]];
    nos.push(no);
  }
  return temAlcas(nos) ? nos : null;
}

/** Cópia dos nós com todos os pontos deslocados (usado ao mover/copiar a feição). */
export function moverNos(nos: readonly NoCurva[], mover: (p: LatLonPar) => LatLonPar): NoCurva[] {
  return nos.map((n) => {
    const novo: NoCurva = { ponto: mover(n.ponto) };
    if (n.entrada) novo.entrada = mover(n.entrada);
    if (n.saida) novo.saida = mover(n.saida);
    return novo;
  });
}
