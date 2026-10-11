import { criarLinha, ehMultilinha, partesDaLinha, type Feicao, type GeometriaFeicao, type LatLonPar } from './feature_types';
import { distanciaMetros } from './feature_metricas';

/*
 * Algoritmos espaciais puros (sem Leaflet): divisão de polígono por linha, junção, buffer,
 * deslocamento, conversões de unidade e DD <-> DMS.
 *
 * As contas geométricas usam uma projeção equiretangular local (metros em torno de um ponto de
 * referência), suficiente para glebas e áreas urbanas; não servem para geometrias continentais.
 * Limitações de cada função estão no comentário dela.
 */

const RAIO_TERRA_M = 6371008.8;
const METROS_POR_GRAU_LAT = 111320;
const rad = (g: number): number => (g * Math.PI) / 180;

// ---------- projeção local ----------

interface PlanoLocal {
  lat0: number;
  lon0: number;
  cos0: number;
}

type XY = [number, number];

function planoEm(ref: LatLonPar): PlanoLocal {
  return { lat0: ref[0], lon0: ref[1], cos0: Math.cos(rad(ref[0])) };
}

function paraXY(p: LatLonPar, pl: PlanoLocal): XY {
  return [rad(p[1] - pl.lon0) * pl.cos0 * RAIO_TERRA_M, rad(p[0] - pl.lat0) * RAIO_TERRA_M];
}

function deXY(p: XY, pl: PlanoLocal): LatLonPar {
  return [pl.lat0 + (p[1] / RAIO_TERRA_M) * (180 / Math.PI), pl.lon0 + (p[0] / (RAIO_TERRA_M * pl.cos0)) * (180 / Math.PI)];
}

// ---------- ponto em polígono ----------

/** Ponto dentro do anel externo e fora dos furos. */
export function pontoNoPoligono(p: LatLonPar, aneis: LatLonPar[][]): boolean {
  const dentroDe = (anel: LatLonPar[]): boolean => {
    let dentro = false;
    for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      const [yi, xi] = anel[i];
      const [yj, xj] = anel[j];
      if (yi > p[0] !== yj > p[0] && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  };
  if (!aneis[0] || !dentroDe(aneis[0])) return false;
  return !aneis.slice(1).some(dentroDe);
}

// ---------- divisão de polígono por linha ----------

interface Cruzamento {
  /** Posição ao longo da linha de corte (segmento + fração). */
  tLinha: number;
  /** Posição ao longo do anel (aresta + fração). */
  tAnel: number;
  ponto: XY;
}

function cruzar(a: XY, b: XY, c: XY, d: XY): { t: number; u: number } | null {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const sx = d[0] - c[0];
  const sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  // meio-aberto no fim para um cruzamento exatamente num vértice não contar duas vezes
  if (t < 0 || t > 1 || u < 0 || u >= 1) return null;
  return { t, u };
}

function areaAbsXY(anel: XY[]): number {
  let s = 0;
  for (let i = 0; i < anel.length; i++) {
    const [x1, y1] = anel[i];
    const [x2, y2] = anel[(i + 1) % anel.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/**
 * Divide um polígono simples (um anel, sem furos) por uma linha de corte.
 * A linha pode atravessar o polígono várias vezes; cada travessia (entrada → saída) vira um corte.
 * Devolve os anéis resultantes (≥ 2), ou `null` se a linha não corta o polígono.
 * Limitações: não trata furos; cruzamentos exatamente sobre um vértice podem ser ignorados;
 * linhas que se cruzam entre si dentro do polígono dão resultado indefinido.
 */
export function dividirPoligonoComLinha(anel: LatLonPar[], linha: LatLonPar[]): LatLonPar[][] | null {
  if (anel.length < 3 || linha.length < 2) return null;
  const pl = planoEm(anel[0]);
  const poly = anel.map((p) => paraXY(p, pl));
  const corte = linha.map((p) => paraXY(p, pl));
  const partes = dividirXY(poly, corte, 0);
  return partes && partes.length >= 2 ? partes.map((r) => r.map((p) => deXY(p, pl))) : null;
}

function dividirXY(poly: XY[], corte: XY[], profundidade: number): XY[][] | null {
  if (profundidade > 8) return null;
  const n = poly.length;

  const cruzamentos: Cruzamento[] = [];
  for (let s = 0; s < corte.length - 1; s++) {
    for (let e = 0; e < n; e++) {
      const r = cruzar(corte[s], corte[s + 1], poly[e], poly[(e + 1) % n]);
      if (!r) continue;
      cruzamentos.push({
        tLinha: s + r.t,
        tAnel: e + r.u,
        ponto: [corte[s][0] + r.t * (corte[s + 1][0] - corte[s][0]), corte[s][1] + r.t * (corte[s + 1][1] - corte[s][1])]
      });
    }
  }
  cruzamentos.sort((a, b) => a.tLinha - b.tLinha);
  if (cruzamentos.length < 2) return null;

  // primeira travessia: dois cruzamentos consecutivos ao longo da linha
  const [c1, c2] = cruzamentos;
  const meio: XY[] = [];
  for (let k = Math.floor(c1.tLinha) + 1; k <= Math.floor(c2.tLinha); k++) {
    if (k > c1.tLinha && k < c2.tLinha) meio.push(corte[k]);
  }
  const caminho: XY[] = [c1.ponto, ...meio, c2.ponto];

  // ordena as pontas pela posição no anel
  let ini = c1;
  let fim = c2;
  let cam = caminho;
  if (c1.tAnel > c2.tAnel) {
    ini = c2;
    fim = c1;
    cam = [...caminho].reverse();
  }
  const i = Math.floor(ini.tAnel);
  const j = Math.floor(fim.tAnel);
  const interior = cam.slice(1, -1);

  // A: ponta inicial -> vértices (i, j] -> ponta final -> volta pelo corte
  const A: XY[] = [ini.ponto];
  for (let k = i + 1; k <= j; k++) A.push(poly[k % n]);
  A.push(fim.ponto, ...[...interior].reverse());
  // B: ponta final -> vértices (j, i + n] -> ponta inicial -> segue pelo corte
  const B: XY[] = [fim.ponto];
  for (let k = j + 1; k <= i + n; k++) B.push(poly[k % n]);
  B.push(ini.ponto, ...interior);

  const original = areaAbsXY(poly);
  const minimo = original * 1e-9;
  const validas = [A, B].filter((r) => r.length >= 3 && areaAbsXY(r) > minimo);
  if (validas.length < 2) return null;

  // o resto da linha (depois da saída) pode cortar de novo uma das partes
  const resto: XY[] = [c2.ponto, ...corte.slice(Math.floor(c2.tLinha) + 1)];
  if (cruzamentos.length > 2 && resto.length >= 2) {
    const refinadas: XY[][] = [];
    for (const parte of validas) {
      const sub = dividirXY(parte, resto, profundidade + 1);
      if (sub) refinadas.push(...sub);
      else refinadas.push(parte);
    }
    return refinadas;
  }
  return validas;
}

// ---------- junção ----------

function emXY(pts: LatLonPar[], pl: PlanoLocal): XY[] {
  return pts.map((p) => paraXY(p, pl));
}

const dXY = (a: XY, b: XY): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Encadeia linhas cujas pontas estejam a no máximo `toleranciaM` uma da outra, invertendo as que
 * precisarem. Lacunas dentro da tolerância viram uma "ponte" (segmento reto). Devolve `null` se
 * alguma linha não se liga à cadeia.
 */
export function juntarLinhas(linhas: LatLonPar[][], toleranciaM = 0): LatLonPar[] | null {
  if (linhas.length === 0 || linhas.some((l) => l.length < 2)) return null;
  const pl = planoEm(linhas[0][0]);
  const restantes = linhas.slice(1).map((l) => emXY(l, pl));
  let cadeia = emXY(linhas[0], pl);

  while (restantes.length > 0) {
    let melhor: { idx: number; inverter: boolean; noFim: boolean; d: number } | null = null;
    restantes.forEach((l, idx) => {
      const ini = cadeia[0];
      const fim = cadeia[cadeia.length - 1];
      const opcoes = [
        { inverter: false, noFim: true, d: dXY(fim, l[0]) },
        { inverter: true, noFim: true, d: dXY(fim, l[l.length - 1]) },
        { inverter: false, noFim: false, d: dXY(ini, l[l.length - 1]) },
        { inverter: true, noFim: false, d: dXY(ini, l[0]) }
      ];
      for (const o of opcoes) if (!melhor || o.d < melhor.d) melhor = { idx, ...o };
    });
    if (!melhor || (melhor as { d: number }).d > toleranciaM) return null;
    const { idx, inverter, noFim } = melhor as { idx: number; inverter: boolean; noFim: boolean; d: number };
    let l = restantes.splice(idx, 1)[0];
    if (inverter) l = [...l].reverse();
    // ponta com ponta exata: não repete o vértice; com lacuna: o segmento reto entre as pontas é a ponte
    cadeia = noFim
      ? [...cadeia, ...(dXY(cadeia[cadeia.length - 1], l[0]) > 0 ? l : l.slice(1))]
      : [...l, ...(dXY(l[l.length - 1], cadeia[0]) > 0 ? cadeia : cadeia.slice(1))];
  }
  return cadeia.map((p) => deXY(p, pl));
}

function segmentosSeCruzam(a: XY, b: XY, c: XY, d: XY): boolean {
  const r = cruzar(a, b, c, d);
  return !!r && r.t > 1e-9 && r.t < 1 - 1e-9 && r.u > 1e-9;
}

function aneisSeCruzam(a: XY[], b: XY[]): boolean {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (segmentosSeCruzam(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true;
    }
  }
  return false;
}

/**
 * Junta dois polígonos simples por uma "ponte": o anel é aberto nos vértices mais próximos de cada
 * um e os dois são costurados num anel só (a ponte tem largura zero). Serve para polígonos separados
 * por até `toleranciaM` ou que dividem uma divisa. Recusa polígonos cujas bordas se cruzam
 * (`null`): união booleana de áreas sobrepostas não é suportada.
 */
export function juntarPoligonos(a: LatLonPar[], b: LatLonPar[], toleranciaM = 0): LatLonPar[] | null {
  if (a.length < 3 || b.length < 3) return null;
  const pl = planoEm(a[0]);
  const A = emXY(a, pl);
  const B = emXY(b, pl);
  if (aneisSeCruzam(A, B)) return null;

  let melhor = { i: 0, j: 0, d: Infinity };
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B.length; j++) {
      const d = dXY(A[i], B[j]);
      if (d < melhor.d) melhor = { i, j, d };
    }
  }
  if (melhor.d > toleranciaM) return null;

  const { i, j } = melhor;
  const anel: XY[] = [];
  for (let k = 0; k <= A.length; k++) anel.push(A[(i + k) % A.length]); // volta ao ponto da ponte
  for (let k = 0; k <= B.length; k++) anel.push(B[(j + k) % B.length]);
  return anel.map((p) => deXY(p, pl));
}

// ---------- buffer ----------

const PASSOS_ARCO = 16;

function arco(c: XY, r: number, de: number, ate: number): XY[] {
  const pts: XY[] = [];
  for (let k = 0; k <= PASSOS_ARCO; k++) {
    const ang = de + ((ate - de) * k) / PASSOS_ARCO;
    pts.push([c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)]);
  }
  return pts;
}

function normal(a: XY, b: XY): XY {
  const len = dXY(a, b) || 1;
  return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
}

/** Offset de um caminho pela esquerda (distância > 0), com juntas em meia-esquadria (limitada a 2×). */
function deslocarCaminho(pts: XY[], dist: number, fechado: boolean): XY[] {
  const n = pts.length;
  const saida: XY[] = [];
  const total = fechado ? n : n;
  for (let i = 0; i < total; i++) {
    const prev = fechado ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
    const atual = pts[i];
    const prox = fechado ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)];
    const n1 = i === 0 && !fechado ? normal(atual, prox) : normal(prev, atual);
    const n2 = i === n - 1 && !fechado ? normal(prev, atual) : normal(atual, prox);
    let mx = n1[0] + n2[0];
    let my = n1[1] + n2[1];
    const lm = Math.hypot(mx, my);
    if (lm < 1e-9) {
      saida.push([atual[0] + n1[0] * dist, atual[1] + n1[1] * dist]);
      continue;
    }
    mx /= lm;
    my /= lm;
    const cosMeio = mx * n1[0] + my * n1[1];
    const escala = Math.min(1 / Math.max(cosMeio, 0.5), 2);
    saida.push([atual[0] + mx * dist * escala, atual[1] + my * dist * escala]);
  }
  return saida;
}

function orientacaoHoraria(anel: XY[]): boolean {
  let s = 0;
  for (let i = 0; i < anel.length; i++) {
    const [x1, y1] = anel[i];
    const [x2, y2] = anel[(i + 1) % anel.length];
    s += (x2 - x1) * (y2 + y1);
  }
  return s > 0;
}

/**
 * Buffer de uma feição como polígono. Ponto/círculo: círculo de 64 lados. Linha: contorno com pontas
 * arredondadas. Polígono: offset do anel externo (distância negativa encolhe). Aproximação por
 * meia-esquadria: boa para distâncias pequenas frente ao tamanho da feição; pode se auto-intersectar
 * em polígonos côncavos com distâncias grandes.
 */
export function gerarBuffer(g: GeometriaFeicao, distanciaM: number): LatLonPar[] | null {
  if (!Number.isFinite(distanciaM) || distanciaM === 0) return null;

  if (g.tipo === 'Point' || g.tipo === 'Text' || g.tipo === 'Circle') {
    const c = g.tipo === 'Circle' ? g.centro : g.coordenada;
    const r = g.tipo === 'Circle' ? g.raioMetros + distanciaM : distanciaM;
    if (r <= 0) return null;
    const pl = planoEm(c);
    const n = 64;
    return Array.from({ length: n }, (_, k): XY => [r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n)]).map((p) => deXY(p, pl));
  }

  if (g.tipo === 'LineString') {
    if (distanciaM < 0 || g.coordenadas.length < 2 || ehMultilinha(g)) return null; // buffer de multilinha exigiria união de polígonos
    const pl = planoEm(g.coordenadas[0]);
    const pts = emXY(g.coordenadas, pl);
    const esq = deslocarCaminho(pts, distanciaM, false);
    const dir = deslocarCaminho([...pts].reverse(), distanciaM, false);
    const fim = pts[pts.length - 1];
    const ini = pts[0];
    const angFim = Math.atan2(fim[1] - pts[pts.length - 2][1], fim[0] - pts[pts.length - 2][0]);
    const angIni = Math.atan2(ini[1] - pts[1][1], ini[0] - pts[1][0]);
    const capaFim = arco(fim, distanciaM, angFim + Math.PI / 2, angFim - Math.PI / 2);
    const capaIni = arco(ini, distanciaM, angIni + Math.PI / 2, angIni - Math.PI / 2);
    return [...esq, ...capaFim, ...dir, ...capaIni].map((p) => deXY(p, pl));
  }

  if (g.tipo === 'Polygon') {
    const anel = g.aneis[0];
    if (!anel || anel.length < 3) return null;
    const pl = planoEm(anel[0]);
    let pts = emXY(anel, pl);
    // o offset "pela esquerda" é para fora em anel anti-horário; ajusta o sinal pelo sentido
    const horario = orientacaoHoraria(pts);
    if (horario) pts = [...pts].reverse();
    const r = deslocarCaminho(pts, -distanciaM, true);
    if (r.length < 3 || (distanciaM < 0 && areaAbsXY(r) >= areaAbsXY(pts))) return null;
    return r.map((p) => deXY(p, pl));
  }
  return null;
}

// ---------- deslocamento ----------

/** Copia a geometria deslocada `leste` m para leste e `norte` m para norte. */
export function deslocarGeometria(g: GeometriaFeicao, lesteM: number, norteM: number): GeometriaFeicao {
  const mover = (p: LatLonPar): LatLonPar => {
    const dLat = norteM / METROS_POR_GRAU_LAT;
    const dLon = lesteM / (METROS_POR_GRAU_LAT * Math.max(0.01, Math.cos(rad(p[0]))));
    return [p[0] + dLat, p[1] + dLon];
  };
  switch (g.tipo) {
    case 'Point': return { tipo: 'Point', coordenada: mover(g.coordenada) };
    case 'Text': return { ...g, coordenada: mover(g.coordenada) };
    case 'Circle': return { ...g, centro: mover(g.centro) };
    case 'LineString': return criarLinha(partesDaLinha(g).map((p) => p.map(mover)));
    case 'Polygon': return { tipo: 'Polygon', aneis: g.aneis.map((a) => a.map(mover)) };
  }
}

// ---------- unidades ----------

export type UnidadeComprimento = 'm' | 'km' | 'ft' | 'mi';
export type UnidadeArea = 'm2' | 'ha' | 'km2' | 'ac' | 'alqueire';

const M_POR: Record<UnidadeComprimento, number> = { m: 1, km: 1000, ft: 0.3048, mi: 1609.344 };
/** `alqueire` = alqueire paulista (24.200 m²). */
const M2_POR: Record<UnidadeArea, number> = { m2: 1, ha: 10000, km2: 1e6, ac: 4046.8564224, alqueire: 24200 };

export function converterComprimento(valor: number, de: UnidadeComprimento, para: UnidadeComprimento): number {
  return (valor * M_POR[de]) / M_POR[para];
}

export function converterArea(valor: number, de: UnidadeArea, para: UnidadeArea): number {
  return (valor * M2_POR[de]) / M2_POR[para];
}

// ---------- DD <-> DMS ----------

/** `-23.5` -> `23°30'00.00"S`. `eixo` escolhe N/S ou L/O (leste/oeste). */
export function ddParaDms(valor: number, eixo: 'lat' | 'lon', casas = 2): string {
  const hemisferio = eixo === 'lat' ? (valor < 0 ? 'S' : 'N') : valor < 0 ? 'O' : 'L';
  const abs = Math.abs(valor);
  let graus = Math.floor(abs);
  let minutos = Math.floor((abs - graus) * 60);
  let segundos = Number(((abs - graus - minutos / 60) * 3600).toFixed(casas));
  if (segundos >= 60) {
    segundos = 0;
    minutos += 1;
  }
  if (minutos >= 60) {
    minutos = 0;
    graus += 1;
  }
  const seg = segundos.toFixed(casas).padStart(casas ? casas + 3 : 2, '0');
  return `${graus}°${String(minutos).padStart(2, '0')}'${seg}"${hemisferio}`;
}

/** Aceita `23°30'00.00"S`, `23 30 0 S`, `-23°30'`, vírgula decimal. Devolve `null` se não entender. */
export function dmsParaDd(texto: string): number | null {
  if (typeof texto !== 'string') return null;
  const t = texto.trim().toUpperCase().replace(',', '.');
  const hem = /[NSLEOW]$/.exec(t)?.[0];
  const corpo = t.replace(/[NSLEOW]$/, '').trim();
  const partes = corpo.match(/-?\d+(?:\.\d+)?/g);
  if (!partes || partes.length === 0 || partes.length > 3) return null;
  if (!/^[-\d\s°'"′″.]+$/.test(corpo)) return null;
  const [g, m = '0', s = '0'] = partes;
  const graus = Math.abs(Number(g));
  const minutos = Number(m);
  const segundos = Number(s);
  if (minutos < 0 || minutos >= 60 || segundos < 0 || segundos >= 60) return null;
  let dd = graus + minutos / 60 + segundos / 3600;
  if (g.startsWith('-') || hem === 'S' || hem === 'O' || hem === 'W') dd = -dd;
  return dd;
}

// ---------- utilitários de feição ----------

/** Distância em metros de um ponto até o vértice/segmento mais próximo; útil para testes e ferramentas. */
export function distanciaEntre(a: LatLonPar, b: LatLonPar): number {
  return distanciaMetros(a, b);
}

/** Cópia profunda de uma feição com novo id (para duplicar/dividir). */
export function clonarFeicao(f: Feicao, novoId: string, geometria?: GeometriaFeicao): Feicao {
  return {
    ...f,
    id: novoId,
    geometria: geometria ?? JSON.parse(JSON.stringify(f.geometria)),
    estilo: f.estilo ? { ...f.estilo } : undefined,
    propriedades: { ...f.propriedades }
  };
}
