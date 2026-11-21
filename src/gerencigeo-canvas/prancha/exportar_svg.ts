import { corSegura } from '../motor/estilo';
import { escaparHtml } from '../../components/ui-cores/cores-utils';
import type { Matriz2D } from '../espaco/espaco_matriz';
import { planejarElementos, caminhoFinito, type Caminho, type ItemPintura, type SombraPlanejada, type TextoPlanejado } from './pintura_plano';
import type { CamadaPrancha, ElementoGrafico } from './tipos';

/*
 * Exportação SVG (L2, pura): uma string a partir do MESMO plano de pintura do pintor Canvas (`pintura_plano.ts`), em mm
 * (viewBox na folha). Saneada: cores só nos formatos aceitos (`corSegura`), fonte por lista de caracteres, textos e ids
 * escapados, ids de gradiente/recorte gerados (nunca vindos do dado). O SVG suporta tudo do plano (gradiente, hachura,
 * texto, mesclagem com `mix-blend-mode`, sombra com `feGaussianBlur`) sem degradação; a opacidade do elemento é de grupo
 * (`<g opacity>`), exata.
 */

export interface OpcoesSvg {
  /** Tamanho da folha em mm (largura e altura do viewBox). */
  largura: number;
  altura: number;
  /** Retângulo de fundo (ex.: `#ffffff`). */
  fundo?: string;
  /** Casas decimais das coordenadas (padrão 4; de 0 a 8). */
  casas?: number;
  /** Texto do `<title>` (escapado). */
  titulo?: string;
  /** Camadas da prancha (ordem, ocultas, opacidade), as mesmas da tela. */
  camadas?: readonly CamadaPrancha[];
}

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function formatador(casas: number): (n: number) => string {
  const k = 10 ** casas;
  return (n: number) => {
    const v = Math.round(n * k) / k;
    return Object.is(v, -0) || v === 0 ? '0' : String(v);
  };
}

const atr = (v: string): string => escaparHtml(v);

export function caminhoParaSvg(cam: Caminho, f: (n: number) => string): string {
  let d = '';
  for (const k of cam) {
    if (k.c === 'Z') d += 'Z';
    else if (k.c === 'C') d += `C${f(k.c1[0])} ${f(k.c1[1])} ${f(k.c2[0])} ${f(k.c2[1])} ${f(k.p[0])} ${f(k.p[1])}`;
    else d += `${k.c}${f(k.p[0])} ${f(k.p[1])}`;
  }
  return d;
}

const matrizSvg = (m: Matriz2D, f: (n: number) => string): string => `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map(f).join(' ')})`;

const opacidade = (nome: string, v: number, f: (n: number) => string): string => (v < 1 ? ` ${nome}="${f(Math.max(0, v))}"` : '');

function textoParaSvg(tx: TextoPlanejado, cor: string, opac: number, f: (n: number) => string): string {
  const ancora = tx.alinhamento === 'center' ? 'middle' : tx.alinhamento === 'right' ? 'end' : 'start';
  const linhas = tx.linhas
    .map((l, i) => `<tspan x="0" y="${f(i * tx.tamanho * tx.entrelinha)}">${escaparHtml(l)}</tspan>`)
    .join('');
  return `<text transform="${matrizSvg(tx.matriz, f)}" font-size="${f(tx.tamanho)}" font-family="${atr(tx.fonte)}" text-anchor="${ancora}" fill="${atr(corSegura(cor, '#000000'))}" xml:space="preserve"${opacidade('fill-opacity', opac, f)}>${linhas}</text>`;
}

/** Caixa dos pontos dos caminhos (para a região do filtro de desfoque). */
function caixaDosCaminhos(cams: readonly Caminho[]): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const cam of cams) for (const k of cam) {
    if (k.c === 'Z') continue;
    const pts = k.c === 'C' ? [k.c1, k.c2, k.p] : [k.p];
    for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : null;
}

function sombraParaSvg(s: SombraPlanejada, f: (n: number) => string, defs: string[], seq: { n: number }): string {
  const cor = atr(corSegura(s.cor, '#000000'));
  const corpo = s.partes.filter((p) => caminhoFinito(p.caminho)).map((p) => (p.modo === 'encher'
    ? `<path d="${caminhoParaSvg(p.caminho, f)}" fill="${cor}" fill-rule="${p.regra}" stroke="none"/>`
    : `<path d="${caminhoParaSvg(p.caminho, f)}" fill="none" stroke="${cor}" stroke-width="${f(p.largura)}" stroke-linecap="${p.terminacao}" stroke-linejoin="${p.juncao}"${p.tracejado.length > 0 ? ` stroke-dasharray="${p.tracejado.map(f).join(' ')}"` : ''}/>`));
  if (s.texto) corpo.push(textoParaSvg(s.texto, s.cor, 1, f));
  if (corpo.length === 0) return '';
  let filtro = '';
  const caixa = caixaDosCaminhos(s.partes.map((p) => p.caminho));
  if (s.desfoque > 0) {
    const id = `pr-s${seq.n++}`;
    const folga = s.desfoque * 3 + Math.max(0, ...s.partes.map((p) => p.largura));
    const regiao = caixa
      ? ` filterUnits="userSpaceOnUse" x="${f(caixa[0] - folga)}" y="${f(caixa[1] - folga)}" width="${f(caixa[2] - caixa[0] + 2 * folga)}" height="${f(caixa[3] - caixa[1] + 2 * folga)}"`
      : ' x="-50%" y="-50%" width="200%" height="200%"';
    defs.push(`<filter id="${id}"${regiao}><feGaussianBlur stdDeviation="${f(s.desfoque)}"/></filter>`);
    filtro = ` filter="url(#${id})"`;
  }
  return `<g transform="translate(${f(s.dx)} ${f(s.dy)})"${opacidade('opacity', s.opacidade, f)}><g${filtro}>${corpo.join('')}</g></g>`;
}

function itemParaSvg(it: ItemPintura, f: (n: number) => string, defs: string[], seq: { n: number }): string {
  const partes: string[] = [];
  if (it.sombra) partes.push(sombraParaSvg(it.sombra, f, defs, seq));
  const p = it.preenchimento;
  if (p && caminhoFinito(p.caminho)) {
    let fill = atr(corSegura(p.cor, '#000000'));
    if (p.gradiente) {
      const id = `pr-g${seq.n++}`;
      const d = p.gradiente.def;
      const stops = d.paradas
        .map((s) => `<stop offset="${f(s.posicao)}" stop-color="${atr(corSegura(s.cor, '#000000'))}"${opacidade('stop-opacity', s.opacidade ?? 1, f)}/>`)
        .join('');
      const comum = `id="${id}" gradientUnits="userSpaceOnUse" gradientTransform="${matrizSvg(p.gradiente.quadro, f)}"`;
      defs.push(d.tipo === 'linear'
        ? `<linearGradient ${comum} x1="${f(d.de[0])}" y1="${f(d.de[1])}" x2="${f(d.ate[0])}" y2="${f(d.ate[1])}">${stops}</linearGradient>`
        : `<radialGradient ${comum} cx="${f(d.centro[0])}" cy="${f(d.centro[1])}" r="${f(d.raio)}" fx="${f((d.foco ?? d.centro)[0])}" fy="${f((d.foco ?? d.centro)[1])}">${stops}</radialGradient>`);
      fill = `url(#${id})`;
    }
    partes.push(`<path d="${caminhoParaSvg(p.caminho, f)}" fill="${fill}" fill-rule="${p.regra}" stroke="none"${opacidade('fill-opacity', p.opacidade, f)}/>`);
  }

  const h = it.hachura;
  if (h && caminhoFinito(h.recorte)) {
    const id = `pr-c${seq.n++}`;
    defs.push(`<clipPath id="${id}"><path d="${caminhoParaSvg(h.recorte, f)}" clip-rule="${h.regra}"/></clipPath>`);
    const d = h.linhas.map(([a, b]) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`).join('');
    partes.push(`<path d="${d}" clip-path="url(#${id})" fill="none" stroke="${atr(corSegura(h.cor, '#000000'))}" stroke-width="${f(h.largura)}" stroke-linecap="butt"${opacidade('stroke-opacity', h.opacidade, f)}/>`);
  }

  const t = it.traco;
  if (t && caminhoFinito(t.caminho)) {
    const dash = t.tracejado.length > 0 ? ` stroke-dasharray="${t.tracejado.map(f).join(' ')}"` : '';
    partes.push(`<path d="${caminhoParaSvg(t.caminho, f)}" fill="none" stroke="${atr(corSegura(t.cor, '#000000'))}" stroke-width="${f(t.largura)}" stroke-linecap="${t.terminacao}" stroke-linejoin="${t.juncao}" stroke-miterlimit="${f(t.limitePonta)}"${dash}${opacidade('stroke-opacity', t.opacidade, f)}/>`);
  }

  for (const pt of it.pontas) {
    if (!caminhoFinito(pt.caminho)) continue;
    const cor = atr(corSegura(pt.cor, '#000000'));
    partes.push(pt.preenchida
      ? `<path d="${caminhoParaSvg(pt.caminho, f)}" fill="${cor}" stroke="none"${opacidade('fill-opacity', pt.opacidade, f)}/>`
      : `<path d="${caminhoParaSvg(pt.caminho, f)}" fill="none" stroke="${cor}" stroke-width="${f(pt.largura)}" stroke-linejoin="miter"${opacidade('stroke-opacity', pt.opacidade, f)}/>`);
  }

  const tx = it.texto;
  if (tx) partes.push(textoParaSvg(tx, tx.cor, tx.opacidade, f));

  if (partes.every((p) => p === '')) return '';
  let recorte = '';
  if (it.recorte && caminhoFinito(it.recorte.caminho)) {
    const id = `pr-m${seq.n++}`;
    defs.push(`<clipPath id="${id}"><path d="${caminhoParaSvg(it.recorte.caminho, f)}" clip-rule="${it.recorte.regra}"/></clipPath>`);
    recorte = ` clip-path="url(#${id})"`;
  }
  const mescla = it.mesclagem && /^[a-z-]+$/.test(it.mesclagem) ? ` style="mix-blend-mode:${it.mesclagem}"` : '';
  return `<g data-id="${atr(it.id)}"${opacidade('opacity', it.opacidade, f)}${recorte}${mescla}>${partes.join('')}</g>`;
}

/** SVG da folha com os elementos (mesma ordem e estilo do pintor Canvas). Não lança: largura/altura inválidas viram 1 mm. */
export function exportarSvg(elementos: readonly ElementoGrafico[], opcoes: OpcoesSvg): string {
  const casas = fin(opcoes?.casas) ? Math.min(8, Math.max(0, Math.round(opcoes.casas))) : 4;
  const f = formatador(casas);
  const w = fin(opcoes?.largura) && opcoes.largura > 0 ? opcoes.largura : 1;
  const h = fin(opcoes?.altura) && opcoes.altura > 0 ? opcoes.altura : 1;
  const defs: string[] = [];
  const seq = { n: 0 };
  const corpo: string[] = [];
  for (const it of planejarElementos(elementos, opcoes?.camadas)) {
    try {
      corpo.push(itemParaSvg(it, f, defs, seq));
    } catch {
      // um item com defeito não derruba a exportação dos outros
    }
  }
  const titulo = opcoes?.titulo ? `<title>${escaparHtml(opcoes.titulo)}</title>` : '';
  const fundo = opcoes?.fundo ? `<rect x="0" y="0" width="${f(w)}" height="${f(h)}" fill="${atr(corSegura(opcoes.fundo, '#ffffff'))}"/>` : '';
  const defsSvg = defs.length > 0 ? `<defs>${defs.join('')}</defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="0 0 ${f(w)} ${f(h)}">${titulo}${defsSvg}${fundo}${corpo.join('')}</svg>`;
}
