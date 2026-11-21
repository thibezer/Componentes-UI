import type { Par } from '../feature_types';
import { limitesNaFolha } from './elemento_geometria';
import { planoDe, type Caminho, type ItemPintura } from './pintura_plano';
import type { CaixaMm, CamadaPrancha, ElementoGrafico } from './tipos';

/*
 * Envelope visual (L2, puro): a caixa de TUDO o que o pintor desenha de um (ou vários) elemento(s): traço pelo
 * alinhamento, ponta da junção angular (limite de ponta), terminação quadrada, pontas de seta, preenchimento, hachura,
 * sombra deslocada e desfocada, e a caixa do texto. A FONTE É O PRÓPRIO PLANO DE PINTURA (`planoDe`): o que o pintor pinta
 * é, por construção, o que o envelope mede; não há uma segunda conta de geometria para divergir.
 */

export interface OpcoesEnvelopeVisual {
  /** Inclui a sombra projetada (deslocamento + desfoque). Padrão `true`. */
  sombra?: boolean;
  /** Camadas: o elemento de camada oculta não conta. */
  camadas?: readonly CamadaPrancha[];
}

/** O desfoque gaussiano visível se estende ~3 desvios-padrão. */
const SIGMAS_DO_DESFOQUE = 3;

interface Acumulador { x0: number; y0: number; x1: number; y1: number }
const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function incluir(acc: Acumulador, x: number, y: number, margem = 0, dx = 0, dy = 0): void {
  if (!fin(x) || !fin(y)) return;
  acc.x0 = Math.min(acc.x0, x + dx - margem);
  acc.y0 = Math.min(acc.y0, y + dy - margem);
  acc.x1 = Math.max(acc.x1, x + dx + margem);
  acc.y1 = Math.max(acc.y1, y + dy + margem);
}

/** Pontos de controle incluídos: a curva de Bézier fica dentro do fecho convexo deles (envelope conservador). */
function incluirCaminho(acc: Acumulador, cam: Caminho, margem = 0, dx = 0, dy = 0): void {
  for (const k of cam) {
    if (k.c === 'Z') continue;
    incluir(acc, k.p[0], k.p[1], margem, dx, dy);
    if (k.c === 'C') { incluir(acc, k.c1[0], k.c1[1], margem, dx, dy); incluir(acc, k.c2[0], k.c2[1], margem, dx, dy); }
  }
}

/** Direção unitária (não nula) de a para b, ou null. */
const dir = (a: Par, b: Par): Par | null => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const n = Math.hypot(dx, dy);
  return n > 1e-12 ? [dx / n, dy / n] : null;
};

interface Vertice { p: Par; entrada: Par | null; saida: Par | null }

/** Vértices internos de cada subcaminho (com a direção de chegada e de saída) e os extremos dos abertos. */
function analisar(cam: Caminho): { vertices: Vertice[]; extremos: Par[] } {
  const vertices: Vertice[] = [];
  const extremos: Par[] = [];
  interface Seg { de: Par; para: Par; ini: Par | null; fim: Par | null }
  let segs: Seg[] = [];
  let p: Par = [0, 0];
  let inicio: Par = [0, 0];
  let aberto = false;
  const fechar = (fechado: boolean): void => {
    for (let i = 0; i + 1 < segs.length; i++) vertices.push({ p: segs[i].para, entrada: segs[i].fim, saida: segs[i + 1].ini });
    if (fechado && segs.length > 1) vertices.push({ p: segs[0].de, entrada: segs[segs.length - 1].fim, saida: segs[0].ini });
    else if (!fechado && segs.length > 0) extremos.push(segs[0].de, segs[segs.length - 1].para);
    segs = [];
  };
  for (const k of cam) {
    if (k.c === 'M') { if (aberto) fechar(false); aberto = true; p = k.p; inicio = k.p; continue; }
    if (!aberto) continue;
    if (k.c === 'L') { const d = dir(p, k.p); segs.push({ de: p, para: k.p, ini: d, fim: d }); p = k.p; }
    else if (k.c === 'C') {
      segs.push({ de: p, para: k.p, ini: dir(p, k.c1) ?? dir(p, k.c2) ?? dir(p, k.p), fim: dir(k.c2, k.p) ?? dir(k.c1, k.p) ?? dir(p, k.p) });
      p = k.p;
    } else {
      const d = dir(p, inicio);
      if (d) segs.push({ de: p, para: inicio, ini: d, fim: d });
      fechar(true);
      aberto = false;
    }
  }
  if (aberto) fechar(false);
  return { vertices, extremos };
}

/**
 * Inclui o que um traço de `largura` mm desenha: cada ponto ± meia espessura (junção redonda/chanfrada e terminação
 * reta ficam dentro disso), a PONTA REAL da junção angular em cada vértice (até o limite; acima dele a junção vira chanfro) e
 * a terminação quadrada nos extremos abertos.
 */
function incluirTraco(acc: Acumulador, cam: Caminho, largura: number, juncao: CanvasLineJoin, limite: number, terminacao: CanvasLineCap, dx = 0, dy = 0, folga = 0): void {
  const m = largura / 2;
  incluirCaminho(acc, cam, m + folga, dx, dy);
  if (!(m > 0)) return;
  const { vertices, extremos } = analisar(cam);
  if (juncao === 'miter') {
    const lim = limite >= 1 ? limite : 4;
    for (const v of vertices) {
      if (!v.entrada || !v.saida) continue;
      const cos = Math.max(-1, Math.min(1, v.entrada[0] * v.saida[0] + v.entrada[1] * v.saida[1]));
      const meio = Math.sqrt((1 + cos) / 2); // cos(φ/2), φ = giro no vértice
      if (!(meio > 1e-9)) continue;
      const razao = 1 / meio;
      if (razao > lim) continue; // vira chanfro
      const bx = v.entrada[0] - v.saida[0], by = v.entrada[1] - v.saida[1];
      const n = Math.hypot(bx, by);
      if (!(n > 1e-12)) continue;
      incluir(acc, v.p[0] + (bx / n) * m * razao, v.p[1] + (by / n) * m * razao, folga, dx, dy);
    }
  }
  if (terminacao === 'square') for (const e of extremos) incluir(acc, e[0], e[1], m * Math.SQRT2 + folga, dx, dy);
}

function envelopeDoItem(acc: Acumulador, it: ItemPintura, comSombra: boolean): void {
  if (it.preenchimento) incluirCaminho(acc, it.preenchimento.caminho);
  if (it.hachura) incluirCaminho(acc, it.hachura.recorte); // as linhas são recortadas pela forma
  const t = it.traco;
  if (t) incluirTraco(acc, t.caminho, t.largura, t.juncao, t.limitePonta, t.terminacao);
  for (const ponta of it.pontas) {
    if (ponta.preenchida) incluirCaminho(acc, ponta.caminho);
    else incluirTraco(acc, ponta.caminho, ponta.largura, 'miter', t?.limitePonta ?? 4, 'butt');
  }
  const s = it.sombra;
  if (comSombra && s) {
    const folga = s.desfoque > 0 ? s.desfoque * SIGMAS_DO_DESFOQUE : 0;
    for (const parte of s.partes) {
      if (parte.modo === 'tracar') incluirTraco(acc, parte.caminho, parte.largura, parte.juncao, 4, parte.terminacao, s.dx, s.dy, folga);
      else incluirCaminho(acc, parte.caminho, folga, s.dx, s.dy);
    }
  }
}

/**
 * Caixa (mm da folha) de tudo o que o pintor desenha dos elementos, ou `null` se não há nada visível (vazio, ocultos,
 * degenerados, entrada inválida). Nunca lança.
 */
export function envelopeVisual(alvo: ElementoGrafico | readonly ElementoGrafico[] | null | undefined, opcoes: OpcoesEnvelopeVisual = {}): CaixaMm | null {
  const lista: readonly unknown[] = Array.isArray(alvo) ? alvo : alvo ? [alvo] : [];
  const comSombra = opcoes.sombra !== false;
  const ocultas = new Set((opcoes.camadas ?? []).filter((c) => c && c.visivel === false).map((c) => c.id));
  const acc: Acumulador = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const e of lista) {
    const el = e as ElementoGrafico;
    if (!el || typeof el !== 'object' || el.oculto || el.mascara) continue;
    if (el.camadaId !== undefined && ocultas.has(el.camadaId)) continue;
    try {
      const it = planoDe(el);
      if (!it) continue;
      envelopeDoItem(acc, it, comSombra);
      if (el.geometria?.tipo === 'texto') {
        const l = limitesNaFolha(el);
        if (l) {
          incluir(acc, l.x, l.y);
          incluir(acc, l.x + l.largura, l.y + l.altura);
          const s = it.sombra;
          if (comSombra && s) {
            const folga = s.desfoque > 0 ? s.desfoque * SIGMAS_DO_DESFOQUE : 0;
            incluir(acc, l.x, l.y, folga, s.dx, s.dy);
            incluir(acc, l.x + l.largura, l.y + l.altura, folga, s.dx, s.dy);
          }
        }
      }
    } catch { /* elemento hostil: ignora */ }
  }
  if (!(acc.x0 <= acc.x1 && acc.y0 <= acc.y1) || ![acc.x0, acc.y0, acc.x1, acc.y1].every(fin)) return null;
  return { x: acc.x0, y: acc.y0, largura: acc.x1 - acc.x0, altura: acc.y1 - acc.y0 };
}
