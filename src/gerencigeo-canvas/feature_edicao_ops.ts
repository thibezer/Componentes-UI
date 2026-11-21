import { ehMultilinha, type Feicao, type GeometriaFeicao, type LatLonPar, type ModoNo, type NoCurva } from './feature_types';
import { amostrarCurva, controlesDoSegmento, espelhoDaAlca, pontoDaCubica, tipoDoNo } from './feature_curvas';
import { metrosPorGrau } from './feature_metricas';
import type { Espaco } from './espaco/espaco_tipos';
import { ESPACO_GEOGRAFICO } from './espaco/espaco_geografico';

/*
 * Operações puras sobre os vértices de uma feição editável (ponto, linha, polígono de um anel e círculo).
 * Sem Leaflet: o editor visual (`feature_editor_vertices.ts`) só desenha e chama estas funções.
 */

export type MotivoRecusaEdicao = 'bloqueada' | 'tipo-nao-suportado' | 'poligono-com-furos' | 'multiparte' | 'muitos-vertices';

/** Acima disto cada vértice seria uma alça no DOM: recusa em vez de travar a página. */
export const MAX_VERTICES_EDICAO = 5000;

/** Linha precisa de 2 vértices; polígono, de 3. */
export function minimoVertices(g: GeometriaFeicao): number {
  if (g.tipo === 'Polygon') return 3;
  if (g.tipo === 'LineString') return 2;
  return 1;
}

/** `null` quando pode editar; senão, o motivo da recusa. Polígono com furos/multipartes vai para a tabela de vértices. */
export function verificarEditavel(f: Feicao, camadaBloqueada = false): MotivoRecusaEdicao | null {
  if (f.bloqueada || camadaBloqueada) return 'bloqueada';
  const g = f.geometria;
  if (g.tipo !== 'Point' && g.tipo !== 'LineString' && g.tipo !== 'Polygon' && g.tipo !== 'Circle') return 'tipo-nao-suportado';
  if (g.tipo === 'Polygon' && g.aneis.length !== 1) return 'poligono-com-furos';
  if (ehMultilinha(g)) return 'multiparte';
  if (verticesDe(g).length > MAX_VERTICES_EDICAO) return 'muitos-vertices';
  return null;
}

export function verticesDe(g: GeometriaFeicao): LatLonPar[] {
  if (g.tipo === 'Point') return [g.coordenada];
  if (g.tipo === 'LineString') return g.coordenadas;
  if (g.tipo === 'Polygon') return g.aneis[0] ?? [];
  return [];
}

/** Nova geometria do mesmo tipo com estes vértices (não altera a original). */
export function comVertices(g: GeometriaFeicao, pts: LatLonPar[]): GeometriaFeicao {
  if (g.tipo === 'Point') return { tipo: 'Point', coordenada: pts[0] };
  if (g.tipo === 'LineString') return { tipo: 'LineString', coordenadas: pts };
  if (g.tipo === 'Polygon') return { tipo: 'Polygon', aneis: [pts] };
  return g;
}

export function moverVertice(g: GeometriaFeicao, indice: number, coord: LatLonPar): GeometriaFeicao {
  const pts = verticesDe(g).slice();
  if (indice < 0 || indice >= pts.length) return g;
  pts[indice] = coord;
  return comVertices(g, pts);
}

/** Insere `coord` logo depois do vértice `depoisDe` (no polígono, `depoisDe` = último vale entre o último e o primeiro). */
export function inserirVertice(g: GeometriaFeicao, depoisDe: number, coord: LatLonPar): GeometriaFeicao {
  if (g.tipo !== 'LineString' && g.tipo !== 'Polygon') return g;
  const pts = verticesDe(g).slice();
  if (depoisDe < 0 || depoisDe >= pts.length) return g;
  pts.splice(depoisDe + 1, 0, coord);
  return comVertices(g, pts);
}

/** `null` quando o vértice não pode sair (mínimo de 3 no polígono, 2 na linha, ponto não perde o único). */
export function removerVertice(g: GeometriaFeicao, indice: number): GeometriaFeicao | null {
  if (g.tipo !== 'LineString' && g.tipo !== 'Polygon') return null;
  const pts = verticesDe(g);
  if (indice < 0 || indice >= pts.length || pts.length <= minimoVertices(g)) return null;
  return comVertices(g, pts.filter((_, i) => i !== indice));
}

export function pontoMedio(a: LatLonPar, b: LatLonPar): LatLonPar {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** Pares de índices dos segmentos (o polígono inclui o que fecha o último no primeiro). */
export function segmentosDe(g: GeometriaFeicao): Array<[number, number]> {
  const n = verticesDe(g).length;
  const pares: Array<[number, number]> = [];
  if (g.tipo !== 'LineString' && g.tipo !== 'Polygon') return pares;
  for (let i = 0; i < n - 1; i++) pares.push([i, i + 1]);
  if (g.tipo === 'Polygon' && n > 2) pares.push([n - 1, 0]);
  return pares;
}

// ---- edição de curvas ----
// Numa feição com `curva` o editor trabalha com os nós (e não com os vértices de apoio amostrados): mover um nó leva
// as alças junto, inserir divide o segmento sem mudar o desenho (de Casteljau) e a geometria é refeita a partir dos nós.

/** Nós da curva da geometria (linha ou polígono de um anel), ou `null` se ela é uma poligonal comum. */
export function nosDe(g: GeometriaFeicao): NoCurva[] | null {
  if ((g.tipo === 'LineString' || g.tipo === 'Polygon') && g.curva && g.curva.length >= minimoVertices(g)) return g.curva;
  return null;
}

/** Menor raio que a alça de borda pode definir (evita círculo degenerado), na unidade do espaço (m no geográfico). */
export const RAIO_MINIMO_EDICAO_CIRCULO_M = 0.5;

/** Alça da borda do círculo: o ponto a leste do centro (à direita, no plano), a `raioMetros` de distância. */
export function pontoDaBordaDoCirculo(centro: LatLonPar, raioMetros: number, espaco: Espaco = ESPACO_GEOGRAFICO): LatLonPar {
  return espaco.pontoDaBorda(centro, raioMetros);
}

/** Pontos que o editor mostra como alças: os nós da curva ou, sem curva, os vértices. Círculo: centro e borda. */
export function pontosDe(g: GeometriaFeicao, espaco: Espaco = ESPACO_GEOGRAFICO): LatLonPar[] {
  if (g.tipo === 'Circle') return [g.centro, pontoDaBordaDoCirculo(g.centro, g.raioMetros, espaco)];
  return nosDe(g)?.map((n) => n.ponto) ?? verticesDe(g);
}

/** Geometria refeita a partir dos nós (vértices de apoio amostrados da curva). Só linha e polígono. */
export function comNos(g: GeometriaFeicao, nos: NoCurva[]): GeometriaFeicao {
  const fechada = g.tipo === 'Polygon';
  const apoio = amostrarCurva(nos, fechada);
  return fechada ? { tipo: 'Polygon', aneis: [apoio], curva: nos } : { tipo: 'LineString', coordenadas: apoio, curva: nos };
}

/** Nova geometria com estes pontos. Com o mesmo número de nós, as alças acompanham o nó; senão vira poligonal. */
export function comPontos(g: GeometriaFeicao, pts: LatLonPar[], espaco: Espaco = ESPACO_GEOGRAFICO): GeometriaFeicao {
  if (g.tipo === 'Circle') {
    if (pts.length < 2) return g;
    return { ...g, centro: pts[0], raioMetros: Math.max(RAIO_MINIMO_EDICAO_CIRCULO_M, espaco.distancia(pts[0], pts[1])) };
  }
  const nos = nosDe(g);
  if (!nos || nos.length !== pts.length) return comVertices(g, pts);
  const novos = nos.map((n, i) => {
    const dLat = pts[i][0] - n.ponto[0];
    const dLon = pts[i][1] - n.ponto[1];
    const desloca = (p: LatLonPar): LatLonPar => [p[0] + dLat, p[1] + dLon];
    const no: NoCurva = { ponto: pts[i] };
    if (n.entrada) no.entrada = desloca(n.entrada);
    if (n.saida) no.saida = desloca(n.saida);
    if (n.modo) no.modo = n.modo;
    return no;
  });
  return comNos(g, novos);
}

function lerp(a: LatLonPar, b: LatLonPar, t: number): LatLonPar {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Parâmetro `t` do segmento `a→b` cujo ponto fica mais perto de `coord`. */
function tMaisProximo(a: NoCurva, b: NoCurva, coord: LatLonPar): number {
  const [c1, c2] = controlesDoSegmento(a, b);
  let melhor = 0.5;
  let menor = Infinity;
  for (let k = 1; k < 64; k++) {
    const t = k / 64;
    const p = pontoDaCubica(a.ponto, c1, c2, b.ponto, t);
    const d = (p[0] - coord[0]) ** 2 + (p[1] - coord[1]) ** 2;
    if (d < menor) {
      menor = d;
      melhor = t;
    }
  }
  return melhor;
}

/** Ponto do segmento `i→j` que o editor oferece para inserir um nó (o meio da curva, não o da corda). */
export function pontoMedioDoSegmento(g: GeometriaFeicao, i: number, j: number): LatLonPar {
  const nos = nosDe(g);
  if (!nos) {
    const v = verticesDe(g);
    return pontoMedio(v[i], v[j]);
  }
  const [c1, c2] = controlesDoSegmento(nos[i], nos[j]);
  return pontoDaCubica(nos[i].ponto, c1, c2, nos[j].ponto, 0.5);
}

/** Pares de índices dos segmentos entre os pontos do editor. */
export function segmentosDoEditor(g: GeometriaFeicao): Array<[number, number]> {
  const nos = nosDe(g);
  if (!nos) return segmentosDe(g);
  const pares: Array<[number, number]> = [];
  for (let i = 0; i < nos.length - 1; i++) pares.push([i, i + 1]);
  if (g.tipo === 'Polygon' && nos.length > 2) pares.push([nos.length - 1, 0]);
  return pares;
}

/** Insere um ponto depois de `depoisDe`. Na curva, divide o segmento no ponto mais próximo de `coord` sem alterar o traçado. */
export function inserirPonto(g: GeometriaFeicao, depoisDe: number, coord: LatLonPar): GeometriaFeicao {
  const nos = nosDe(g);
  if (!nos) return inserirVertice(g, depoisDe, coord);
  if (depoisDe < 0 || depoisDe >= nos.length) return g;
  const iB = (depoisDe + 1) % nos.length;
  const a = nos[depoisDe];
  const b = nos[iB];
  const reto = a.saida === undefined && b.entrada === undefined;
  let novo: NoCurva;
  let a2 = a;
  let b2 = b;
  if (reto) {
    novo = { ponto: coord };
  } else {
    const t = tMaisProximo(a, b, coord);
    const [c1, c2] = controlesDoSegmento(a, b);
    const p01 = lerp(a.ponto, c1, t);
    const p12 = lerp(c1, c2, t);
    const p23 = lerp(c2, b.ponto, t);
    const p012 = lerp(p01, p12, t);
    const p123 = lerp(p12, p23, t);
    // as alças novas ficam sobre as antigas (mesma direção) mas com outro comprimento: o que era simétrico vira suave
    novo = { ponto: lerp(p012, p123, t), entrada: p012, saida: p123, modo: 'suave' };
    a2 = { ...a, saida: p01 };
    b2 = { ...b, entrada: p23 };
    if (tipoDoNo(a) === 'simetrico' && a.entrada) a2.modo = 'suave';
    if (tipoDoNo(b) === 'simetrico' && b.saida) b2.modo = 'suave';
  }
  const lista = nos.slice();
  lista[depoisDe] = a2;
  lista[iB] = b2;
  lista.splice(depoisDe + 1, 0, novo);
  return comNos(g, lista);
}

/** Remove um ponto (nó da curva ou vértice); `null` abaixo do mínimo. */
export function removerPonto(g: GeometriaFeicao, indice: number): GeometriaFeicao | null {
  const nos = nosDe(g);
  if (!nos) return removerVertice(g, indice);
  if (indice < 0 || indice >= nos.length || nos.length <= minimoVertices(g)) return null;
  return comNos(g, nos.filter((_, i) => i !== indice));
}

/** Qual alça de um nó. */
export type QualAlca = 'entrada' | 'saida';

/** Nós de uma linha ou polígono: os da curva ou, sem curva, um nó de canto por vértice. `null` para os demais tipos. */
export function nosOuVertices(g: GeometriaFeicao): NoCurva[] | null {
  if (g.tipo !== 'LineString' && g.tipo !== 'Polygon') return null;
  return nosDe(g) ?? verticesDe(g).map((p) => ({ ponto: [p[0], p[1]] as LatLonPar }));
}

/** Mais nós que isto e as alças latentes (das poligonais) não são oferecidas: seriam ruído na tela. */
export const MAX_NOS_COM_ALCA_LATENTE = 40;

/**
 * Onde a alça `qual` do nó `indice` fica por padrão (um terço do caminho até o vizinho): é a posição em que a alça
 * "espera" ser arrastada num nó de canto, deixando o trecho reto até ser mexida. `null` na ponta de uma linha sem vizinho.
 */
export function alcaLatente(g: GeometriaFeicao, indice: number, qual: QualAlca): LatLonPar | null {
  const nos = nosOuVertices(g);
  if (!nos || indice < 0 || indice >= nos.length) return null;
  const fechada = g.tipo === 'Polygon';
  const n = nos.length;
  const viz = qual === 'saida'
    ? (indice < n - 1 ? nos[indice + 1] : fechada ? nos[0] : null)
    : (indice > 0 ? nos[indice - 1] : fechada ? nos[n - 1] : null);
  if (!viz) return null;
  const p = nos[indice].ponto;
  return [p[0] + (viz.ponto[0] - p[0]) / 3, p[1] + (viz.ponto[1] - p[1]) / 3];
}

// ---- plano local em metros ----

/** Origem e escala (metros por grau) de um plano local: o suficiente para medir ângulos e comprimentos sem a distorção dos graus. */
export interface PlanoLocal {
  ref: LatLonPar;
  mLat: number;
  mLng: number;
}

export function planoLocal(ref: LatLonPar): PlanoLocal {
  const m = metrosPorGrau(ref[0]);
  return { ref, mLat: Math.max(m.lat, 1e-9), mLng: Math.max(m.lng, 1e-9) };
}

/** Coordenada → metros (x = leste, y = norte) a partir da origem do plano. */
export const paraMetros = (pl: PlanoLocal, p: LatLonPar): [number, number] => [(p[1] - pl.ref[1]) * pl.mLng, (p[0] - pl.ref[0]) * pl.mLat];
export const deMetros = (pl: PlanoLocal, x: number, y: number): LatLonPar => [pl.ref[0] + y / pl.mLat, pl.ref[1] + x / pl.mLng];

const finitoPar = (p: unknown): p is LatLonPar => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);

/**
 * Nó com a alça `qual` em `coord`; a oposta acompanha conforme o modo do nó: `simetrico` espelha, `suave` mantém o
 * comprimento próprio na direção oposta, `livre` não mexe. `modoDoCanto` é o modo que um nó sem alças ganha; `independente` (Shift) força `livre`.
 * O nó guarda o modo resultante.
 */
export function comAlcaMovida(no: NoCurva, qual: QualAlca, coord: LatLonPar, modoDoCanto: ModoNo, independente = false): NoCurva {
  const tipo = tipoDoNo(no);
  const modo: ModoNo = independente ? 'livre' : tipo === 'canto' ? modoDoCanto : tipo;
  const oposta: QualAlca = qual === 'saida' ? 'entrada' : 'saida';
  const novo: NoCurva = { ...no, [qual]: coord, modo };
  if (modo === 'simetrico') {
    novo[oposta] = espelhoDaAlca(no.ponto, coord);
  } else if (modo === 'suave') {
    // comprimento e direção medidos em metros: em graus, girar a alça mudaria o comprimento
    const pl = planoLocal(no.ponto);
    const [dx, dy] = paraMetros(pl, coord);
    const tamanhoNovo = Math.hypot(dx, dy);
    const ref = no[oposta];
    const [rx, ry] = ref ? paraMetros(pl, ref) : [dx, dy];
    const tamanho = Math.hypot(rx, ry);
    // alça sobre o próprio nó não tem direção: a oposta fica onde estava
    if (tamanhoNovo > 0 && tamanho > 0) novo[oposta] = deMetros(pl, -(dx / tamanhoNovo) * tamanho, -(dy / tamanhoNovo) * tamanho);
  }
  return novo;
}

/**
 * Move uma alça do nó `indice` para `coord`. A oposta acompanha conforme o modo do nó (`tipoDoNo`): espelho no simétrico,
 * alinhada no suave, parada no livre; a primeira alça arrastada de um nó de canto nasce com a oposta espelhada, como na caneta.
 * Com `simetrica = false` (Shift) as duas ficam independentes e o nó passa a `livre`. Numa linha/polígono comum, converte em curva.
 */
export function moverAlca(g: GeometriaFeicao, indice: number, qual: QualAlca, coord: LatLonPar, simetrica = true): GeometriaFeicao {
  const nos = nosOuVertices(g);
  if (!nos || indice < 0 || indice >= nos.length || !finitoPar(coord)) return g;
  const lista = nos.slice();
  lista[indice] = comAlcaMovida(nos[indice], qual, coord, 'simetrico', !simetrica);
  return comNos(g, lista);
}

/**
 * Alterna o nó entre canto (sem alças) e suave. Ao suavizar, as alças seguem a direção entre os vizinhos
 * (Catmull-Rom: um sexto da corda); nas pontas de uma linha, apontam para o único vizinho. Numa linha/polígono
 * comum, converte em curva.
 */
export function alternarSuavidade(g: GeometriaFeicao, indice: number): GeometriaFeicao {
  const nos = nosOuVertices(g);
  if (!nos || indice < 0 || indice >= nos.length) return g;
  const no = nos[indice];
  const lista = nos.slice();
  if (no.entrada || no.saida) {
    lista[indice] = { ponto: no.ponto };
    return comNos(g, lista);
  }
  const fechada = g.tipo === 'Polygon';
  const n = nos.length;
  const ant = indice > 0 ? nos[indice - 1] : fechada ? nos[n - 1] : null;
  const prox = indice < n - 1 ? nos[indice + 1] : fechada ? nos[0] : null;
  if (!ant && !prox) return g;
  const p = no.ponto;
  let dLat: number;
  let dLon: number;
  if (ant && prox) {
    dLat = (prox.ponto[0] - ant.ponto[0]) / 6;
    dLon = (prox.ponto[1] - ant.ponto[1]) / 6;
  } else {
    const v = (prox ?? ant)!.ponto;
    const sinal = prox ? 1 : -1; // a alça de saída aponta para frente; na ponta final, a de entrada aponta para trás
    dLat = ((v[0] - p[0]) / 3) * sinal;
    dLon = ((v[1] - p[1]) / 3) * sinal;
  }
  lista[indice] = { ponto: p, saida: [p[0] + dLat, p[1] + dLon], entrada: [p[0] - dLat, p[1] - dLon] };
  return comNos(g, lista);
}
