import type { GeometriaFeicao, LatLonPar, NoCurva } from './feature_types';
import { controlesDoSegmento, pontoDaCubica, tipoDoNo, type TipoNo } from './feature_curvas';
import {
  alcaLatente, alternarSuavidade, comAlcaMovida, comNos, comPontos, deMetros, moverAlca, nosOuVertices, paraMetros, planoLocal,
  pontosDe, type PlanoLocal, type QualAlca
} from './feature_edicao_ops';

/*
 * Operações puras de edição fina de curvas (sem Leaflet, sem DOM): tipo do nó, alça por comprimento/azimute,
 * moldar um segmento arrastando o traçado, endireitar/curvar um segmento, arco por raio e concordância (fillet).
 * Toda entrada é tratada como hostil: índice fora da faixa, NaN e geometrias degeneradas devolvem a geometria
 * original (ou `null`, quando o pedido é uma operação que pode ser recusada).
 */

const finitoPar = (p: unknown): p is LatLonPar => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
const RAD = Math.PI / 180;

/** Raio mínimo aceito para arcos e concordâncias (metros). */
export const RAIO_MINIMO_ARCO_M = 0.01;

const plano = planoLocal;
type Plano = PlanoLocal;

// ---- tipo do nó ----

/** Tipo do nó `indice` de uma linha/polígono (`canto` se não tem alças), ou `null` se o índice não existe. */
export function tipoDoNoDaGeometria(g: GeometriaFeicao, indice: number): TipoNo | null {
  const no = nosOuVertices(g)?.[indice];
  return no ? tipoDoNo(no) : null;
}

/**
 * Muda o tipo do nó. `canto` tira as alças; `simetrico`, `suave` e `livre` partem das alças que o nó já tem
 * (se for de canto, nascem pela direção dos vizinhos, como o 2× clique). `simetrico` espelha a alça de saída;
 * `suave` alinha a de entrada com a de saída, mantendo o comprimento de cada uma; `livre` só libera o arraste independente.
 */
export function definirTipoDoNo(g: GeometriaFeicao, indice: number, tipo: TipoNo): GeometriaFeicao {
  let nos = nosOuVertices(g);
  if (!nos || indice < 0 || indice >= nos.length) return g;
  if (tipo === 'canto') {
    if (tipoDoNo(nos[indice]) === 'canto') return g;
    const lista = nos.slice();
    lista[indice] = { ponto: nos[indice].ponto };
    return comNos(g, lista);
  }
  let base = g;
  if (tipoDoNo(nos[indice]) === 'canto') {
    base = alternarSuavidade(g, indice);
    if (base === g) return g;
    nos = nosOuVertices(base);
    if (!nos) return g;
  }
  const no = nos[indice];
  const p = no.ponto;
  const novo: NoCurva = { ...no, modo: tipo };
  const saida = no.saida;
  const entrada = no.entrada;
  if (tipo === 'simetrico') {
    const fonte = saida ?? entrada!;
    const qual: QualAlca = saida ? 'saida' : 'entrada';
    novo[qual] = fonte;
    novo[qual === 'saida' ? 'entrada' : 'saida'] = [2 * p[0] - fonte[0], 2 * p[1] - fonte[1]];
  } else if (tipo === 'suave') {
    const fonte = saida ?? entrada!;
    const pl = plano(p);
    const [dx, dy] = paraMetros(pl, fonte);
    const tamanhoFonte = Math.hypot(dx, dy);
    const outra = saida ? entrada : saida;
    const tamanhoOutra = outra ? Math.hypot(...paraMetros(pl, outra)) : tamanhoFonte;
    if (tamanhoFonte > 0 && tamanhoOutra > 0) {
      // a alça de saída manda na direção (ou a de entrada, se for a única); a outra fica oposta, com o próprio comprimento (em metros)
      novo[saida ? 'entrada' : 'saida'] = deMetros(pl, -(dx / tamanhoFonte) * tamanhoOutra, -(dy / tamanhoFonte) * tamanhoOutra);
    }
  }
  const lista = nos.slice();
  lista[indice] = novo;
  return comNos(base, lista);
}

// ---- ângulo travado ----

/**
 * Leva `coord` ao ângulo múltiplo de `passoGraus` (a partir do leste, no plano em metros) em torno de `centro`,
 * mantendo a distância. Entrada inválida ou distância zero devolve `coord`.
 */
export function restringirAngulo(centro: LatLonPar, coord: LatLonPar, passoGraus = 45): LatLonPar {
  if (!finitoPar(centro) || !finitoPar(coord) || !(passoGraus > 0)) return coord;
  const pl = plano(centro);
  const [x, y] = paraMetros(pl, coord);
  const d = Math.hypot(x, y);
  if (d === 0) return coord;
  const passo = passoGraus * RAD;
  const ang = Math.round(Math.atan2(y, x) / passo) * passo;
  return deMetros(pl, Math.cos(ang) * d, Math.sin(ang) * d);
}

// ---- alça por comprimento e azimute ----

/** Comprimento (m) e azimute (graus, 0 = norte, horário) da alça em relação ao nó; `null` se não existe. */
export function alcaPolar(g: GeometriaFeicao, indice: number, qual: QualAlca): { comprimentoM: number; azimuteGraus: number } | null {
  const no = nosOuVertices(g)?.[indice];
  const alca = no?.[qual];
  if (!no || !alca) return null;
  const [x, y] = paraMetros(plano(no.ponto), alca);
  const az = (Math.atan2(x, y) / RAD + 360) % 360;
  return { comprimentoM: Math.hypot(x, y), azimuteGraus: az };
}

/**
 * Põe a alça a `comprimentoM` metros do nó, na direção `azimuteGraus` (0 = norte, horário). A oposta acompanha o modo do nó
 * (`simetrica = false` solta). Comprimento negativo ou valor não numérico não altera nada.
 */
export function definirAlcaPolar(
  g: GeometriaFeicao, indice: number, qual: QualAlca, valor: { comprimentoM: number; azimuteGraus: number }, simetrica = true
): GeometriaFeicao {
  const no = nosOuVertices(g)?.[indice];
  if (!no || !Number.isFinite(valor.comprimentoM) || !Number.isFinite(valor.azimuteGraus) || valor.comprimentoM < 0) return g;
  const pl = plano(no.ponto);
  const az = valor.azimuteGraus * RAD;
  const alvo = deMetros(pl, Math.sin(az) * valor.comprimentoM, Math.cos(az) * valor.comprimentoM);
  return moverAlca(g, indice, qual, alvo, simetrica);
}

/** Move o nó `indice` para `coord` levando as alças junto. Coordenada inválida ou índice fora da faixa não altera nada. */
export function moverNoPara(g: GeometriaFeicao, indice: number, coord: LatLonPar): GeometriaFeicao {
  if (!finitoPar(coord)) return g;
  const pts = pontosDe(g).map((p) => [p[0], p[1]] as LatLonPar);
  if (g.tipo === 'Circle' || g.tipo === 'Point' || indice < 0 || indice >= pts.length) return g;
  pts[indice] = [coord[0], coord[1]];
  return comPontos(g, pts);
}

// ---- segmentos ----

/** `j` (nó seguinte) do segmento que sai de `indice`, ou `null` se não há (última ponta de linha, índice inválido). */
function proximoDoSegmento(g: GeometriaFeicao, n: number, indice: number): number | null {
  if (indice < 0 || indice >= n) return null;
  if (indice < n - 1) return indice + 1;
  return g.tipo === 'Polygon' && n > 2 ? 0 : null;
}

/** Controles do segmento `i → j`: as alças reais ou, num trecho reto, as latentes (um terço do caminho). */
function controlesComLatentes(g: GeometriaFeicao, nos: NoCurva[], i: number, j: number): [LatLonPar, LatLonPar] | null {
  const [c1, c2] = controlesDoSegmento(nos[i], nos[j]);
  const l1 = nos[i].saida ?? alcaLatente(g, i, 'saida');
  const l2 = nos[j].entrada ?? alcaLatente(g, j, 'entrada');
  if (!l1 || !l2) return null;
  return [nos[i].saida ? c1 : l1, nos[j].entrada ? c2 : l2];
}

/**
 * Parâmetro `t` (0 a 1) do ponto do segmento `i → j` mais perto de `coord`, e o ponto da curva ali.
 * `null` se o segmento não existe.
 */
export function pontoMaisProximoNoSegmento(g: GeometriaFeicao, i: number, coord: LatLonPar): { t: number; ponto: LatLonPar; distanciaM: number } | null {
  const nos = nosOuVertices(g);
  if (!nos || !finitoPar(coord)) return null;
  const j = proximoDoSegmento(g, nos.length, i);
  if (j === null) return null;
  const ctl = controlesComLatentes(g, nos, i, j);
  if (!ctl) return null;
  const pl = plano(nos[i].ponto);
  const alvo = paraMetros(pl, coord);
  const amostra = (t: number): LatLonPar => pontoDaCubica(nos[i].ponto, ctl[0], ctl[1], nos[j].ponto, t);
  const dist = (p: LatLonPar): number => { const [x, y] = paraMetros(pl, p); return Math.hypot(x - alvo[0], y - alvo[1]); };
  let melhorT = 0;
  let menor = Infinity;
  const passos = 64;
  for (let k = 0; k <= passos; k++) {
    const d = dist(amostra(k / passos));
    if (d < menor) { menor = d; melhorT = k / passos; }
  }
  // refino local: a amostragem grossa erra por até 1/64 do parâmetro
  let passo = 1 / passos;
  for (let r = 0; r < 12; r++) {
    for (const t of [melhorT - passo, melhorT + passo]) {
      if (t < 0 || t > 1) continue;
      const d = dist(amostra(t));
      if (d < menor) { menor = d; melhorT = t; }
    }
    passo /= 2;
  }
  return { t: melhorT, ponto: amostra(melhorT), distanciaM: menor };
}

/** Parâmetro mínimo/máximo em que se pode agarrar o segmento (perto demais das pontas a alça dispararia). */
export const T_MOLDE_MIN = 0.1;
export const T_MOLDE_MAX = 0.9;

/**
 * Molda o segmento `i → j`: o ponto do traçado em `t` passa a ser `alvo`, ajustando as duas alças (a mais próxima do
 * ponto agarrado mexe mais). Alças de nós `simetrico`/`suave` levam a oposta junto; nó de canto mexe só a alça do segmento.
 * Segmento reto vira curva (parte das alças latentes). `null` se o segmento não existe.
 */
export function moldarSegmento(g: GeometriaFeicao, indice: number, t: number, alvo: LatLonPar): GeometriaFeicao | null {
  const nos = nosOuVertices(g);
  if (!nos || !finitoPar(alvo) || !Number.isFinite(t)) return null;
  const j = proximoDoSegmento(g, nos.length, indice);
  if (j === null) return null;
  const ctl = controlesComLatentes(g, nos, indice, j);
  if (!ctl) return null;
  const tt = Math.min(T_MOLDE_MAX, Math.max(T_MOLDE_MIN, t));
  const u = 1 - tt;
  const atual = pontoDaCubica(nos[indice].ponto, ctl[0], ctl[1], nos[j].ponto, tt);
  const dLat = alvo[0] - atual[0];
  const dLon = alvo[1] - atual[1];
  const norma = u * u + tt * tt;
  const k1 = 1 / (3 * tt * norma);
  const k2 = 1 / (3 * u * norma);
  const c1: LatLonPar = [ctl[0][0] + dLat * k1, ctl[0][1] + dLon * k1];
  const c2: LatLonPar = [ctl[1][0] + dLat * k2, ctl[1][1] + dLon * k2];
  const lista = nos.slice();
  lista[indice] = comAlcaMovida(nos[indice], 'saida', c1, 'livre');
  lista[j] = comAlcaMovida(j === indice ? lista[indice] : nos[j], 'entrada', c2, 'livre');
  return comNos(g, lista);
}

/** Tira as alças do segmento `i → j` (vira reta). Os nós que ficam com uma só alça passam a `livre` (a outra não nasce sozinha). */
export function endireitarSegmento(g: GeometriaFeicao, indice: number): GeometriaFeicao {
  const nos = nosOuVertices(g);
  if (!nos) return g;
  const j = proximoDoSegmento(g, nos.length, indice);
  if (j === null) return g;
  if (!nos[indice].saida && !nos[j].entrada) return g;
  const lista = nos.slice();
  const a: NoCurva = { ...nos[indice] };
  delete a.saida;
  lista[indice] = limparModo(a);
  const b: NoCurva = { ...(j === indice ? lista[indice] : nos[j]) };
  delete b.entrada;
  lista[j] = limparModo(b);
  return comNos(g, lista);
}

/** Nó que perdeu uma alça: sem nenhuma volta a ser canto; com uma, fica `livre`. */
function limparModo(no: NoCurva): NoCurva {
  if (!no.entrada && !no.saida) { delete no.modo; return no; }
  return { ...no, modo: 'livre' };
}

/** Faz do segmento `i → j` uma curva: as alças latentes viram reais (o desenho continua reto até serem puxadas). */
export function curvarSegmento(g: GeometriaFeicao, indice: number): GeometriaFeicao {
  const nos = nosOuVertices(g);
  if (!nos) return g;
  const j = proximoDoSegmento(g, nos.length, indice);
  if (j === null) return g;
  const ctl = controlesComLatentes(g, nos, indice, j);
  if (!ctl) return g;
  if (nos[indice].saida && nos[j].entrada) return g;
  const lista = nos.slice();
  if (!nos[indice].saida) lista[indice] = { ...nos[indice], saida: ctl[0], modo: tipoDoNo(nos[indice]) === 'canto' ? 'livre' : nos[indice].modo };
  if (!nos[j].entrada) lista[j] = { ...(j === indice ? lista[indice] : nos[j]), entrada: ctl[1], modo: tipoDoNo(nos[j]) === 'canto' ? 'livre' : nos[j].modo };
  return comNos(g, lista);
}

// ---- arcos ----

/**
 * Cúbicas que aproximam o arco de centro `c`, raio `r`, a partir de `fase0` varrendo `varredura` (radianos, com sinal),
 * em pedaços de no máximo 90° (erro de raio abaixo de 0,03%). Devolve os controles e o ponto final de cada pedaço.
 */
function arcoEmCubicas(c: [number, number], r: number, fase0: number, varredura: number): Array<{ c1: [number, number]; c2: [number, number]; fim: [number, number] }> {
  const n = Math.max(1, Math.ceil(Math.abs(varredura) / (Math.PI / 2) - 1e-9));
  const passo = varredura / n;
  const k = (4 / 3) * Math.tan(passo / 4);
  const saida: Array<{ c1: [number, number]; c2: [number, number]; fim: [number, number] }> = [];
  for (let s = 0; s < n; s++) {
    const p = fase0 + s * passo;
    const q = p + passo;
    const p0: [number, number] = [c[0] + r * Math.cos(p), c[1] + r * Math.sin(p)];
    const p1: [number, number] = [c[0] + r * Math.cos(q), c[1] + r * Math.sin(q)];
    saida.push({
      c1: [p0[0] - k * r * Math.sin(p), p0[1] + k * r * Math.cos(p)],
      c2: [p1[0] + k * r * Math.sin(q), p1[1] - k * r * Math.cos(q)],
      fim: p1
    });
  }
  return saida;
}

/** Nós que desenham o arco entre `a` e `b` (inclui só os intermediários; as pontas ganham alças e são devolvidas à parte). */
function nosDoArco(
  pl: Plano, a: NoCurva, b: NoCurva, c: [number, number], r: number, fase0: number, varredura: number
): { a: NoCurva; meio: NoCurva[]; b: NoCurva } {
  const pedacos = arcoEmCubicas(c, r, fase0, varredura);
  const ll = (p: [number, number]): LatLonPar => deMetros(pl, p[0], p[1]);
  const novoA: NoCurva = { ...a, saida: ll(pedacos[0].c1), modo: 'livre' };
  const meio: NoCurva[] = [];
  for (let s = 0; s < pedacos.length - 1; s++) {
    meio.push({ ponto: ll(pedacos[s].fim), entrada: ll(pedacos[s].c2), saida: ll(pedacos[s + 1].c1), modo: 'simetrico' });
  }
  const novoB: NoCurva = { ...b, entrada: ll(pedacos[pedacos.length - 1].c2), modo: 'livre' };
  return { a: novoA, meio, b: novoB };
}

/**
 * Troca o segmento `i → j` por um arco circular de raio `raioM` (metros) entre os mesmos dois nós, abaulado para o
 * `lado` ('esquerda' ou 'direita' de quem anda de `i` para `j`). Raio menor que meia corda vira semicírculo. O arco entra
 * como cúbicas de Bézier (nós intermediários a cada 90°), então segue editável como qualquer curva.
 * `null` se o segmento não existe, os nós coincidem ou o raio é inválido.
 */
export function arcoNoSegmento(g: GeometriaFeicao, indice: number, raioM: number, lado: 'esquerda' | 'direita' = 'esquerda'): GeometriaFeicao | null {
  const nos = nosOuVertices(g);
  if (!nos || !Number.isFinite(raioM) || raioM < RAIO_MINIMO_ARCO_M) return null;
  const j = proximoDoSegmento(g, nos.length, indice);
  if (j === null) return null;
  const pl = plano(nos[indice].ponto);
  const pa = paraMetros(pl, nos[indice].ponto);
  const pb = paraMetros(pl, nos[j].ponto);
  const corda = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
  if (!(corda > 0)) return null;
  const r = Math.max(raioM, corda / 2);
  const h = Math.sqrt(Math.max(0, r * r - (corda / 2) ** 2));
  const dx = (pb[0] - pa[0]) / corda;
  const dy = (pb[1] - pa[1]) / corda;
  const esquerda: [number, number] = [-dy, dx];
  // o arco abaulado para a esquerda tem o centro à direita (e o percurso é horário, varredura negativa)
  const sinal = lado === 'esquerda' ? -1 : 1;
  const m: [number, number] = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
  const centro: [number, number] = [m[0] + esquerda[0] * h * sinal, m[1] + esquerda[1] * h * sinal];
  const fase0 = Math.atan2(pa[1] - centro[1], pa[0] - centro[0]);
  const meiaVarredura = Math.asin(Math.min(1, corda / (2 * r)));
  const arco = nosDoArco(pl, nos[indice], nos[j], centro, r, fase0, sinal * 2 * meiaVarredura);
  const lista = nos.slice();
  lista[indice] = arco.a;
  lista[j] = j === indice ? arco.a : arco.b;
  // os intermediários entram logo depois de `i`; se `j` é o primeiro nó (polígono), vão para o fim da lista
  lista.splice(indice + 1, 0, ...arco.meio);
  return comNos(g, lista);
}

/**
 * Concordância (fillet): arredonda o canto do nó `indice` com um arco tangente aos dois trechos vizinhos, de raio `raioM`.
 * O raio é reduzido se os trechos vizinhos forem curtos demais para ele. Só vale em nó de canto (sem alças), no interior
 * de uma linha ou em qualquer nó de um polígono. `null` se não dá (nó com alças, vizinhos alinhados, raio inválido).
 */
export function concordarNo(g: GeometriaFeicao, indice: number, raioM: number): GeometriaFeicao | null {
  const nos = nosOuVertices(g);
  if (!nos || !Number.isFinite(raioM) || raioM < RAIO_MINIMO_ARCO_M || indice < 0 || indice >= nos.length) return null;
  if (tipoDoNo(nos[indice]) !== 'canto') return null;
  const n = nos.length;
  const fechada = g.tipo === 'Polygon';
  const ant = indice > 0 ? nos[indice - 1] : fechada ? nos[n - 1] : null;
  const prox = indice < n - 1 ? nos[indice + 1] : fechada ? nos[0] : null;
  if (!ant || !prox) return null;
  const pl = plano(nos[indice].ponto);
  const p = paraMetros(pl, nos[indice].ponto);
  const va = paraMetros(pl, ant.ponto);
  const vb = paraMetros(pl, prox.ponto);
  const l1 = Math.hypot(va[0] - p[0], va[1] - p[1]);
  const l2 = Math.hypot(vb[0] - p[0], vb[1] - p[1]);
  if (!(l1 > 0) || !(l2 > 0)) return null;
  const u1: [number, number] = [(va[0] - p[0]) / l1, (va[1] - p[1]) / l1];
  const u2: [number, number] = [(vb[0] - p[0]) / l2, (vb[1] - p[1]) / l2];
  const cosGama = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]));
  const gama = Math.acos(cosGama);
  // trechos alinhados (reto ou voltando sobre si): não há canto a arredondar
  if (gama < 1e-3 || Math.PI - gama < 1e-3) return null;
  const tanMeio = Math.tan(gama / 2);
  const r = Math.min(raioM, Math.min(l1, l2) * tanMeio);
  if (!(r >= RAIO_MINIMO_ARCO_M)) return null;
  const d = r / tanMeio;
  const t1: [number, number] = [p[0] + u1[0] * d, p[1] + u1[1] * d];
  const t2: [number, number] = [p[0] + u2[0] * d, p[1] + u2[1] * d];
  const bx = u1[0] + u2[0];
  const by = u1[1] + u2[1];
  const bn = Math.hypot(bx, by);
  const dist = r / Math.sin(gama / 2);
  const centro: [number, number] = [p[0] + (bx / bn) * dist, p[1] + (by / bn) * dist];
  const f1 = Math.atan2(t1[1] - centro[1], t1[0] - centro[0]);
  const f2 = Math.atan2(t2[1] - centro[1], t2[0] - centro[0]);
  let varredura = f2 - f1;
  while (varredura > Math.PI) varredura -= 2 * Math.PI;
  while (varredura < -Math.PI) varredura += 2 * Math.PI;
  const ponta1: NoCurva = { ponto: deMetros(pl, t1[0], t1[1]) };
  const ponta2: NoCurva = { ponto: deMetros(pl, t2[0], t2[1]) };
  const arco = nosDoArco(pl, ponta1, ponta2, centro, r, f1, varredura);
  const lista = nos.slice();
  lista.splice(indice, 1, arco.a, ...arco.meio, arco.b);
  return comNos(g, lista);
}
