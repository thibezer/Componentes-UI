import type { GeometriaFeicao, NoCurva, Par } from '../feature_types';
import { amostrarCurva, moverNos } from '../feature_curvas';
import { gerarEstrela, gerarPoligonoRegular } from '../feature_formas';
import { limitesDaGeometria } from '../feature_metricas';
import { ESPACO_PLANO } from '../espaco/espaco_plano';
import { IDENTIDADE, aplicar, ehMatrizFinita, type Matriz2D } from '../espaco/espaco_matriz';
import type { ArcoElipse, CaixaMm, ElementoGrafico, GeometriaElemento, RaiosCantos } from './tipos';

/*
 * Geometria do elemento (L2, pura): o contorno LOCAL de cada forma paramétrica, como `GeometriaFeicao` (Polygon/LineString,
 * com `curva` Bézier quando há trechos curvos), e o contorno NA FOLHA (local × transformação). Hit-test, snap, índice,
 * caixa, laço, medidas, pintura e SVG partem daqui: uma fonte só para a mesma forma.
 *
 * Elipses e cantos arredondados são Bézier cúbicas exatas no desenho (constante κ do quarto de círculo); os vértices de
 * apoio amostrados (`PASSOS_CURVA` por trecho) servem às medidas e ao hit-test. Elementos são tratados como imutáveis:
 * o contorno é guardado em cache pelo objeto do elemento (`WeakMap`), então altere criando um objeto novo.
 */

/** Contorno de um elemento: linha ou polígono (com `curva` opcional). */
export type ContornoElemento = Extract<GeometriaFeicao, { tipo: 'LineString' | 'Polygon' }>;

/** κ: alça da Bézier cúbica que aproxima um quarto de círculo (erro radial < 0,03%). */
export const KAPPA = 0.5522847498307936;

/** Fator da altura do corpo do texto usado na caixa aproximada (ascendente) e na largura média de um caractere. */
const ASCENDENTE_TEXTO = 0.8;
const ENTRELINHA_TEXTO = 1.2;
const LARGURA_MEDIA_CARACTERE = 0.55;

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export const FONTE_PADRAO = 'sans-serif';
const FONTE_SEGURA = /^[\p{L}\p{N}\s,'"_-]{1,120}$/u;

/** Família de fonte só com letras, números, espaço, vírgula, aspas, hífen e sublinhado; senão `sans-serif`. */
export function fonteSegura(f: unknown): string {
  return typeof f === 'string' && FONTE_SEGURA.test(f.trim()) ? f.trim() : FONTE_PADRAO;
}

/**
 * Mede a largura (mm) de uma linha de texto na fonte e no corpo dados; `null` ou valor inválido = usar a estimativa.
 * O núcleo é puro: quem tem DOM (o componente) registra um medidor feito com `measureText` (`definirMedidorTexto`); sem
 * medidor (SSR, Worker, testes), a caixa do texto usa a média de 0,55 do corpo por caractere.
 */
export type MedidorTexto = (texto: string, fonte: string, tamanho: number) => number | null;

let medidorTexto: MedidorTexto | null = null;
/** Versão da geometria derivada: muda quando o medidor muda (os caches abaixo recalculam). */
let versaoGeometria = 0;

/** Registra (ou remove, com `null`) o medidor de texto. Invalida os caches de contorno e limites. */
export function definirMedidorTexto(m: MedidorTexto | null): void {
  medidorTexto = typeof m === 'function' ? m : null;
  versaoGeometria++;
}

export const temMedidorTexto = (): boolean => medidorTexto !== null;

function larguraDaLinha(linha: string, fonte: string, tamanho: number): number {
  const estimada = Math.max([...linha].length, 1) * tamanho * LARGURA_MEDIA_CARACTERE;
  if (!medidorTexto) return estimada;
  try {
    const w = medidorTexto(linha, fonte, tamanho);
    return fin(w) && w >= 0 ? Math.max(w, tamanho * 0.1) : estimada;
  } catch {
    return estimada;
  }
}

/** Cache por objeto (imutável) que se invalida quando a versão da geometria muda (novo medidor de texto). */
class CacheVersionado<K extends object, V> {
  private mapa = new WeakMap<K, { v: number; valor: V }>();
  public tem(k: K): boolean {
    return this.mapa.get(k)?.v === versaoGeometria;
  }
  public obter(k: K): V {
    return this.mapa.get(k)!.valor;
  }
  public gravar(k: K, valor: V): void {
    this.mapa.set(k, { v: versaoGeometria, valor });
  }
}
const iguais = (a: Par, b: Par): boolean => a[0] === b[0] && a[1] === b[1];

// ---------- retângulo com cantos independentes ----------

/** Raios saneados e reduzidos na mesma proporção quando dois vizinhos não cabem no lado (regra do CSS `border-radius`). */
export function raiosCabiveis(largura: number, altura: number, raios?: RaiosCantos): RaiosCantos {
  const r = (raios ?? [0, 0, 0, 0]).map((v) => (fin(v) && v > 0 ? v : 0)) as RaiosCantos;
  const fator = Math.min(
    1,
    r[0] + r[1] > 0 ? largura / (r[0] + r[1]) : 1,
    r[3] + r[2] > 0 ? largura / (r[3] + r[2]) : 1,
    r[0] + r[3] > 0 ? altura / (r[0] + r[3]) : 1,
    r[1] + r[2] > 0 ? altura / (r[1] + r[2]) : 1
  );
  return fator < 1 ? (r.map((v) => v * fator) as RaiosCantos) : r;
}

/** Junta nós vizinhos no mesmo ponto (canto cujo arco encosta no do vizinho): a entrada vem do primeiro e a saída do segundo. */
function fundirCoincidentes(nos: NoCurva[], fechada: boolean): NoCurva[] {
  const saida: NoCurva[] = [];
  for (const no of nos) {
    const ultimo = saida[saida.length - 1];
    if (ultimo && iguais(ultimo.ponto, no.ponto)) {
      const fundido: NoCurva = { ponto: ultimo.ponto };
      if (ultimo.entrada) fundido.entrada = ultimo.entrada;
      if (no.saida) fundido.saida = no.saida;
      saida[saida.length - 1] = fundido;
    } else {
      saida.push({ ...no });
    }
  }
  if (fechada && saida.length > 1 && iguais(saida[0].ponto, saida[saida.length - 1].ponto)) {
    const ultimo = saida.pop()!;
    const primeiro = saida[0];
    const fundido: NoCurva = { ponto: primeiro.ponto };
    if (ultimo.entrada) fundido.entrada = ultimo.entrada;
    if (primeiro.saida) fundido.saida = primeiro.saida;
    saida[0] = fundido;
  }
  return saida;
}

/** Contorno local do retângulo centrado na origem, no sentido horário da tela a partir do canto superior esquerdo. */
export function contornoRetangulo(largura: number, altura: number, raios?: RaiosCantos): ContornoElemento | null {
  if (!(fin(largura) && fin(altura) && largura > 0 && altura > 0)) return null;
  const x0 = -largura / 2, x1 = largura / 2, y0 = -altura / 2, y1 = altura / 2;
  const [r0, r1, r2, r3] = raiosCabiveis(largura, altura, raios);
  if (r0 === 0 && r1 === 0 && r2 === 0 && r3 === 0) {
    return { tipo: 'Polygon', aneis: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]] };
  }
  const k0 = r0 * KAPPA, k1 = r1 * KAPPA, k2 = r2 * KAPPA, k3 = r3 * KAPPA;
  const nos: NoCurva[] = [];
  // cada canto com raio vira dois nós (início e fim do arco); sem raio, um nó de canto
  if (r0 > 0) nos.push({ ponto: [x0 + r0, y0], entrada: [x0 + r0 - k0, y0] }); else nos.push({ ponto: [x0, y0] });
  if (r1 > 0) nos.push({ ponto: [x1 - r1, y0], saida: [x1 - r1 + k1, y0] }, { ponto: [x1, y0 + r1], entrada: [x1, y0 + r1 - k1] });
  else nos.push({ ponto: [x1, y0] });
  if (r2 > 0) nos.push({ ponto: [x1, y1 - r2], saida: [x1, y1 - r2 + k2] }, { ponto: [x1 - r2, y1], entrada: [x1 - r2 + k2, y1] });
  else nos.push({ ponto: [x1, y1] });
  if (r3 > 0) nos.push({ ponto: [x0 + r3, y1], saida: [x0 + r3 - k3, y1] }, { ponto: [x0, y1 - r3], entrada: [x0, y1 - r3 + k3] });
  else nos.push({ ponto: [x0, y1] });
  if (r0 > 0) nos.push({ ponto: [x0, y0 + r0], saida: [x0, y0 + r0 - k0] });
  const curva = fundirCoincidentes(nos, true);
  if (curva.length < 3) return null;
  return { tipo: 'Polygon', aneis: [amostrarCurva(curva, true)], curva };
}

// ---------- elipse e arco ----------

const pontoElipse = (rx: number, ry: number, t: number): Par => [rx * Math.cos(t), ry * Math.sin(t)];
const derivadaElipse = (rx: number, ry: number, t: number): Par => [-rx * Math.sin(t), ry * Math.cos(t)];

/** Nós Bézier do arco de `t0` a `t0 + varredura` em `n` trechos iguais (cada um ≤ 90°: erro < 0,03%). */
function nosArco(rx: number, ry: number, t0: number, varredura: number, n: number): NoCurva[] {
  const passo = varredura / n;
  const k = (4 / 3) * Math.tan(passo / 4);
  const nos: NoCurva[] = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + i * passo;
    const p = pontoElipse(rx, ry, t);
    const d = derivadaElipse(rx, ry, t);
    const no: NoCurva = { ponto: p };
    if (i > 0) no.entrada = [p[0] - k * d[0], p[1] - k * d[1]];
    if (i < n) no.saida = [p[0] + k * d[0], p[1] + k * d[1]];
    nos.push(no);
  }
  return nos;
}

/** Varredura do arco normalizada em (0, 2π]; `null` se os ângulos não são finitos. */
export function varreduraDoArco(arco: ArcoElipse): number | null {
  if (!fin(arco.inicio) || !fin(arco.fim)) return null;
  const dois = 2 * Math.PI;
  let v = (arco.fim - arco.inicio) % dois;
  if (v <= 0) v += dois;
  return v;
}

export function contornoElipse(rx: number, ry: number, arco?: ArcoElipse): ContornoElemento | null {
  if (!(fin(rx) && fin(ry) && rx > 0 && ry > 0)) return null;
  const varredura = arco ? varreduraDoArco(arco) : 2 * Math.PI;
  if (varredura === null) return null;
  if (!arco || varredura >= 2 * Math.PI - 1e-12) {
    // elipse completa: 4 nós nos eixos, horário na tela a partir de +x
    const kx = rx * KAPPA, ky = ry * KAPPA;
    const curva: NoCurva[] = [
      { ponto: [rx, 0], entrada: [rx, -ky], saida: [rx, ky] },
      { ponto: [0, ry], entrada: [kx, ry], saida: [-kx, ry] },
      { ponto: [-rx, 0], entrada: [-rx, ky], saida: [-rx, -ky] },
      { ponto: [0, -ry], entrada: [-kx, -ry], saida: [kx, -ry] }
    ];
    return { tipo: 'Polygon', aneis: [amostrarCurva(curva, true)], curva };
  }
  const fechamento = arco.fechamento ?? 'aberto';
  const n = Math.max(fechamento === 'corda' ? 2 : 1, Math.ceil(varredura / (Math.PI / 2) - 1e-9));
  const nos = nosArco(rx, ry, arco.inicio, varredura, n);
  if (fechamento === 'aberto') return { tipo: 'LineString', coordenadas: amostrarCurva(nos, false), curva: nos };
  // corda: o último nó volta reto ao primeiro; fatia: passa pelo centro
  const curva = fechamento === 'fatia' ? [...nos, { ponto: [0, 0] as Par }] : nos;
  return { tipo: 'Polygon', aneis: [amostrarCurva(curva, true)], curva };
}

// ---------- polígono regular, estrela, linha, texto ----------

/** Polígono regular centrado na origem com um vértice para cima (reaproveita `gerarPoligonoRegular` no espaço plano). */
export function contornoPoligonoRegular(raio: number, lados: number): ContornoElemento | null {
  if (!(fin(raio) && raio > 0 && fin(lados))) return null;
  const anel = gerarPoligonoRegular([0, 0], [0, -raio], Math.round(lados), ESPACO_PLANO);
  return anel ? { tipo: 'Polygon', aneis: [anel] } : null;
}

/** Estrela centrada na origem com uma ponta para cima (reaproveita `gerarEstrela` no espaço plano). */
export function contornoEstrela(raioExterno: number, raioInterno: number, pontas: number): ContornoElemento | null {
  if (!(fin(raioExterno) && fin(raioInterno) && raioExterno > 0 && raioInterno > 0 && fin(pontas))) return null;
  const anel = gerarEstrela([0, 0], [0, -raioExterno], Math.round(pontas), ESPACO_PLANO, Math.min(1, raioInterno / raioExterno));
  return anel ? { tipo: 'Polygon', aneis: [anel] } : null;
}

/**
 * Caixa do texto: a largura é a da linha mais larga, medida pelo medidor registrado (`measureText` no componente) ou, sem
 * ele, estimada (0,55 do corpo por caractere); `largura` no dado vence as duas.
 */
export function caixaDoTexto(g: Extract<GeometriaElemento, { tipo: 'texto' }>): CaixaMm | null {
  if (!(fin(g.tamanho) && g.tamanho > 0)) return null;
  const linhas = String(g.texto ?? '').split('\n');
  const fonte = fonteSegura(g.fonte);
  const largura = fin(g.largura) && g.largura > 0 ? g.largura : linhas.reduce((m, l) => Math.max(m, larguraDaLinha(l, fonte, g.tamanho)), 0);
  const altura = linhas.length * g.tamanho * ENTRELINHA_TEXTO;
  const x = g.alinhamento === 'centro' ? -largura / 2 : g.alinhamento === 'direita' ? -largura : 0;
  return { x, y: -g.tamanho * ASCENDENTE_TEXTO, largura, altura };
}

/** Contorno local de qualquer geometria de elemento; `null` se for degenerada ou inválida. */
export function contornoLocal(g: GeometriaElemento): ContornoElemento | null {
  switch (g.tipo) {
    case 'retangulo': return contornoRetangulo(g.largura, g.altura, g.raios);
    case 'elipse': return contornoElipse(g.rx, g.ry, g.arco);
    case 'poligono-regular': return contornoPoligonoRegular(g.raio, g.lados);
    case 'estrela': return contornoEstrela(g.raioExterno, g.raioInterno, g.pontas);
    case 'linha':
      return fin(g.de?.[0]) && fin(g.de?.[1]) && fin(g.ate?.[0]) && fin(g.ate?.[1])
        ? { tipo: 'LineString', coordenadas: [[g.de[0], g.de[1]], [g.ate[0], g.ate[1]]] }
        : null;
    case 'caminho': return g.geometria && (g.geometria.tipo === 'LineString' || g.geometria.tipo === 'Polygon') ? g.geometria : null;
    case 'texto': {
      const c = caixaDoTexto(g);
      if (!c) return null;
      const x1 = c.x + c.largura, y1 = c.y + c.altura;
      return { tipo: 'Polygon', aneis: [[[c.x, c.y], [x1, c.y], [x1, y1], [c.x, y1]]] };
    }
    default: return null;
  }
}

// ---------- na folha ----------

/** Matriz local → folha do elemento (identidade se ausente ou não finita). */
export function matrizDoElemento(el: ElementoGrafico): Matriz2D {
  return el.transformacao && ehMatrizFinita(el.transformacao) ? el.transformacao : IDENTIDADE;
}

/** Contorno transformado por `m` (as alças Bézier são afins: transformar nós e apoio é exato). */
export function transformarContorno(c: ContornoElemento, m: Matriz2D): ContornoElemento {
  const t = (p: Par): Par => aplicar(m, p);
  if (c.tipo === 'Polygon') {
    const p: ContornoElemento = { tipo: 'Polygon', aneis: c.aneis.map((a) => a.map(t)) };
    return c.curva ? { ...p, curva: moverNos(c.curva, t) } : p;
  }
  const base: ContornoElemento = c.partes && c.partes.length > 1
    ? { tipo: 'LineString', coordenadas: c.coordenadas.map(t), partes: c.partes.map((pt) => pt.map(t)) }
    : { tipo: 'LineString', coordenadas: c.coordenadas.map(t) };
  return c.curva ? { ...base, curva: moverNos(c.curva, t) } : base;
}

const cacheContorno = new CacheVersionado<ElementoGrafico, ContornoElemento | null>();
const cacheLimites = new CacheVersionado<ElementoGrafico, CaixaMm | null>();
/** Por objeto de GEOMETRIA: mover, girar ou escalar (só a matriz muda) reaproveita o contorno local e os limites. */
const cacheLocal = new CacheVersionado<object, ContornoElemento | null>();
const cacheLimitesLocais = new CacheVersionado<object, CaixaMm | null>();

/** Contorno local em cache pelo objeto da geometria (que é imutável, como o elemento). */
export function contornoLocalEmCache(g: GeometriaElemento): ContornoElemento | null {
  if (!g || typeof g !== 'object') return null;
  if (cacheLocal.tem(g)) return cacheLocal.obter(g);
  let c: ContornoElemento | null = null;
  try {
    c = contornoLocal(g);
  } catch {
    c = null;
  }
  cacheLocal.gravar(g, c);
  return c;
}

/** Contorno do elemento na folha (mm), em cache por objeto. `null` = geometria degenerada (não desenha nem seleciona). */
export function contornoNaFolha(el: ElementoGrafico): ContornoElemento | null {
  if (!el || typeof el !== 'object') return null;
  if (cacheContorno.tem(el)) return cacheContorno.obter(el);
  let c: ContornoElemento | null = null;
  try {
    const local = contornoLocalEmCache(el.geometria);
    c = local ? transformarContorno(local, matrizDoElemento(el)) : null;
  } catch {
    c = null;
  }
  cacheContorno.gravar(el, c);
  return c;
}

const caixaDeLimites = ([[x0, y0], [x1, y1]]: [Par, Par]): CaixaMm | null =>
  [x0, y0, x1, y1].every(fin) ? { x: x0, y: y0, largura: x1 - x0, altura: y1 - y0 } : null;

/** Envelope local (antes da transformação), em cache pelo objeto da geometria. */
export function limitesLocais(el: ElementoGrafico): CaixaMm | null {
  const g = el?.geometria;
  if (!g || typeof g !== 'object') return null;
  if (cacheLimitesLocais.tem(g)) return cacheLimitesLocais.obter(g);
  const c = contornoLocalEmCache(g);
  const caixa = c ? caixaDeLimites(limitesDaGeometria(c, ESPACO_PLANO)) : null;
  cacheLimitesLocais.gravar(g, caixa);
  return caixa;
}

/**
 * Envelope CONSERVADOR na folha: os 4 cantos da caixa local transformados (contém o elemento; folgado se girado). Custa
 * 4 pontos em vez do contorno inteiro: é o que o índice usa, e o teste fino (hit-test, caixa) usa o contorno.
 */
export function envelopeNaFolha(el: ElementoGrafico): CaixaMm | null {
  const l = limitesLocais(el);
  if (!l) return null;
  const m = matrizDoElemento(el);
  const cantos: Par[] = [[l.x, l.y], [l.x + l.largura, l.y], [l.x + l.largura, l.y + l.altura], [l.x, l.y + l.altura]].map((p) => aplicar(m, p as Par));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of cantos) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return caixaDeLimites([[x0, y0], [x1, y1]]);
}

/** Envelope na folha alinhado aos eixos, em cache por objeto. */
export function limitesNaFolha(el: ElementoGrafico): CaixaMm | null {
  if (cacheLimites.tem(el)) return cacheLimites.obter(el);
  const c = contornoNaFolha(el);
  const caixa = c ? caixaDeLimites(limitesDaGeometria(c, ESPACO_PLANO)) : null;
  if (el && typeof el === 'object') cacheLimites.gravar(el, caixa);
  return caixa;
}

/** O contorno é fechado (tem interior)? */
export const ehFechado = (c: ContornoElemento | null): boolean => !!c && c.tipo === 'Polygon';
