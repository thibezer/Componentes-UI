import type { Par } from '../../gerencigeo-canvas/feature_types';
import { aplicar } from '../../gerencigeo-canvas/espaco/espaco_matriz';
import { contornoNaFolha } from '../../gerencigeo-canvas/prancha/elemento_geometria';
import { caixaDaSelecao, caixaOrientada, posicoesDasAlcas, posicaoLocalDaAlca, type CaixaOrientada } from '../../gerencigeo-canvas/prancha/elemento_transformacao';
import { alcasDoElemento, ancorasDoElemento } from '../../gerencigeo-canvas/prancha/elemento_edicao';
import { desenharElementos, type ContextoPrancha2D } from '../../gerencigeo-canvas/prancha/pintura_canvas';
import type { Guia } from '../../gerencigeo-canvas/prancha/elemento_snap';
import type { CamadaPrancha, ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import type { CoresInterfacePrancha } from './prancha-cores';
import type { EstadoInterfacePrancha } from './prancha-estado-ui';
import type { VistaPrancha } from './prancha-vista';

/*
 * Pintura do componente. A BASE (mesa, folha, grade e elementos) usa o mesmo `desenharElementos` da exportação: o que a
 * tela mostra é o que o PDF e o SVG recebem. A SOBREPOSIÇÃO (seleção, alças, âncoras, guias, snap, caixa de seleção,
 * prévia) é só de tela, em px CSS, com as cores dos tokens.
 */

/** Tamanho visual das alças (px CSS); a área de toque é maior (ver `prancha-interacao.ts`). */
export const LADO_ALCA_PX = 7;
export const DISTANCIA_ALCA_ROTACAO_PX = 22;
const LADO_ANCORA_PX = 6;

type Ctx = ContextoPrancha2D & { clearRect?(x: number, y: number, w: number, h: number): void; fillText?(t: string, x: number, y: number): void; font?: string };

export interface CenaBase {
  vista: VistaPrancha;
  folha: { largura: number; altura: number };
  cores: CoresInterfacePrancha;
  elementos: readonly ElementoGrafico[];
  grade: number | null;
  /** Camadas (ordem, ocultas, opacidade): as mesmas da exportação. */
  camadas?: readonly CamadaPrancha[];
  /** Grupo isolado: o resto fica esmaecido e os membros são repintados por cima. */
  isolados?: readonly ElementoGrafico[] | null;
  /** Quadro das margens da folha (mm): guia automática tracejada, com estilo próprio. */
  margens?: { x: number; y: number; largura: number; altura: number } | null;
}

const px = (ctx: Ctx, dpr: number): void => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

function poligonoPx(ctx: Ctx, pts: readonly Par[], fechar = true): void {
  if (pts.length === 0) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (fechar) ctx.closePath();
}

function quadrado(ctx: Ctx, p: Par, lado: number, preencher: string, contorno: string): void {
  const h = lado / 2;
  ctx.beginPath();
  poligonoPx(ctx, [[p[0] - h, p[1] - h], [p[0] + h, p[1] - h], [p[0] + h, p[1] + h], [p[0] - h, p[1] + h]]);
  ctx.fillStyle = preencher;
  ctx.fill();
  ctx.strokeStyle = contorno;
  ctx.stroke();
}

function circulo(ctx: Ctx, c: Par, r: number): void {
  const pts: Par[] = [];
  for (let i = 0; i < 16; i++) pts.push([c[0] + r * Math.cos((i * Math.PI) / 8), c[1] + r * Math.sin((i * Math.PI) / 8)]);
  poligonoPx(ctx, pts);
}

/** Grade sobre a folha; o passo dobra até ficar ≥ 8 px na tela (não vira borrão no zoom afastado). */
function pintarGrade(ctx: Ctx, cena: CenaBase): void {
  const g = cena.grade;
  if (!g || !(g > 0)) return;
  const { vista, folha } = cena;
  let passo = g;
  while (passo * vista.zoom < 8) passo *= 2;
  const [x0, y0] = vista.paraTela([0, 0]);
  const [x1, y1] = vista.paraTela([folha.largura, folha.altura]);
  ctx.beginPath();
  for (let x = 0; x <= folha.largura + 1e-9; x += passo) {
    const sx = Math.round(vista.paraTela([x, 0])[0]) + 0.5;
    ctx.moveTo(sx, y0);
    ctx.lineTo(sx, y1);
  }
  for (let y = 0; y <= folha.altura + 1e-9; y += passo) {
    const sy = Math.round(vista.paraTela([0, y])[1]) + 0.5;
    ctx.moveTo(x0, sy);
    ctx.lineTo(x1, sy);
  }
  ctx.strokeStyle = cena.cores.grade;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.stroke();
}

/** Véu translúcido do papel sobre a folha (esmaece o que está fora do grupo isolado). */
function definirPapel(ctx: Ctx, vista: VistaPrancha, folha: { largura: number; altura: number }, papel: string): void {
  const m = vista.matrizDispositivo();
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = papel;
  ctx.fillRect(0, 0, folha.largura, folha.altura);
}

/** Mesa, folha (papel), grade (atrás dos elementos, como nos editores vetoriais), elementos e borda da folha. */
export function pintarBase(ctx: Ctx, cena: CenaBase): void {
  const { vista, folha, cores } = cena;
  ctx.save();
  px(ctx, vista.dpr);
  ctx.globalAlpha = 1;
  ctx.fillStyle = cores.mesa;
  ctx.fillRect(0, 0, vista.largura, vista.altura);
  ctx.restore();
  const matriz = vista.matrizDispositivo();
  desenharElementos(ctx, [], { matriz, fundo: { cor: cores.papel, largura: folha.largura, altura: folha.altura } });
  ctx.save();
  px(ctx, vista.dpr);
  pintarGrade(ctx, cena);
  ctx.restore();
  desenharElementos(ctx, cena.elementos, { matriz, camadas: cena.camadas });
  if (cena.isolados && cena.isolados.length > 0) {
    // isolamento de grupo: um véu do papel por cima de tudo e o grupo de novo, nítido
    ctx.save();
    definirPapel(ctx, vista, folha, cores.papel);
    ctx.restore();
    desenharElementos(ctx, cena.isolados, { matriz, camadas: cena.camadas });
  }
  ctx.save();
  px(ctx, vista.dpr);
  const [x0, y0] = vista.paraTela([0, 0]);
  const [x1, y1] = vista.paraTela([folha.largura, folha.altura]);
  ctx.beginPath();
  poligonoPx(ctx, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  ctx.strokeStyle = cores.bordaPapel;
  ctx.lineWidth = 1;
  ctx.stroke();
  const m = cena.margens;
  if (m && m.largura > 0 && m.altura > 0) {
    const [mx0, my0] = vista.paraTela([m.x, m.y]);
    const [mx1, my1] = vista.paraTela([m.x + m.largura, m.y + m.altura]);
    ctx.beginPath();
    poligonoPx(ctx, [[mx0, my0], [mx1, my0], [mx1, my1], [mx0, my1]]);
    ctx.strokeStyle = cores.guiaInteligente;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export interface CenaSobreposicao {
  vista: VistaPrancha;
  cores: CoresInterfacePrancha;
  ui: EstadoInterfacePrancha;
  selecionados: readonly ElementoGrafico[];
  /** Elementos em gesto (pintados aqui, por cima da base que ficou sem eles). */
  emGesto: readonly ElementoGrafico[];
  hover: ElementoGrafico | null;
  guias: readonly Guia[];
  /** Desenhar a caixa de transformação (só com a ferramenta de seleção). */
  caixaTransformacao: boolean;
  /** Marcas dos cantos arredondados ao vivo (retângulo único selecionado). */
  marcasCantos?: readonly Par[] | null;
}

function contornoPx(ctx: Ctx, el: ElementoGrafico, vista: VistaPrancha): void {
  const c = contornoNaFolha(el);
  if (!c) return;
  const trechos = c.tipo === 'Polygon' ? c.aneis : c.partes && c.partes.length > 1 ? c.partes : [c.coordenadas];
  for (const t of trechos) poligonoPx(ctx, t.map((p) => vista.paraTela(p)), c.tipo === 'Polygon');
}

function cantosPx(c: CaixaOrientada, vista: VistaPrancha): Par[] {
  return (['no', 'ne', 'se', 'so'] as const).map((a) => vista.paraTela(aplicar(c.quadro, posicaoLocalDaAlca(c, a))));
}

function linhaGuia(ctx: Ctx, g: Guia, vista: VistaPrancha): void {
  if (g.orientacao === 'horizontal') {
    const y = Math.round(vista.paraTela([0, g.posicao])[1]) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(vista.largura, y);
  } else {
    const x = Math.round(vista.paraTela([g.posicao, 0])[0]) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, vista.altura);
  }
}

function texto(ctx: Ctx, t: string, p: Par, cor: string): void {
  if (typeof ctx.fillText !== 'function') return;
  ctx.font = '11px sans-serif';
  ctx.fillStyle = cor;
  ctx.fillText(t, p[0], p[1]);
}

/** Seleção, alças, âncoras, guias, snap, caixa de seleção e prévia (px CSS). */
export function pintarSobreposicao(ctx: Ctx, cena: CenaSobreposicao): void {
  const { vista, cores, ui } = cena;
  ctx.save();
  px(ctx, vista.dpr);
  if (typeof ctx.clearRect === 'function') ctx.clearRect(0, 0, vista.largura, vista.altura);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  ctx.beginPath();
  for (const g of cena.guias) linhaGuia(ctx, g, vista);
  ctx.strokeStyle = cores.guia;
  ctx.stroke();
  if (ui.guiaArrastada) {
    ctx.beginPath();
    linhaGuia(ctx, ui.guiaArrastada.guia, vista);
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (cena.hover && !cena.selecionados.includes(cena.hover)) {
    ctx.beginPath();
    contornoPx(ctx, cena.hover, vista);
    ctx.strokeStyle = cores.selecao;
    ctx.stroke();
  }

  if (cena.emGesto.length > 0) {
    desenharElementos(ctx, cena.emGesto, { matriz: vista.matrizDispositivo() });
    px(ctx, vista.dpr);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
  }

  if (ui.previa) {
    desenharElementos(ctx, [ui.previa], { matriz: vista.matrizDispositivo() });
    px(ctx, vista.dpr);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
  }
  for (const p of ui.pontosPrevia) quadrado(ctx, vista.paraTela(p), LADO_ANCORA_PX, cores.alca, cores.selecao);

  const editado = ui.edicao ? cena.selecionados.find((e) => e.id === ui.edicao!.id) ?? null : null;
  for (const el of cena.selecionados) {
    const c = caixaOrientada(el);
    if (!c || el === editado) continue;
    ctx.beginPath();
    poligonoPx(ctx, cantosPx(c, vista));
    ctx.strokeStyle = cores.selecao;
    ctx.stroke();
  }

  if (editado && ui.edicao) {
    ctx.beginPath();
    contornoPx(ctx, editado, vista);
    ctx.strokeStyle = cores.selecao;
    ctx.stroke();
    const ancoras = ancorasDoElemento(editado);
    const alcas = alcasDoElemento(editado);
    ctx.beginPath();
    ui.edicao.ancoras.forEach((i) => {
      const a = ancoras[i];
      const h = alcas[i];
      if (!a || !h) return;
      for (const q of [h.entrada, h.saida]) if (q) poligonoPx(ctx, [vista.paraTela(a), vista.paraTela(q)], false);
    });
    ctx.stroke();
    ui.edicao.ancoras.forEach((i) => {
      const h = alcas[i];
      if (!h) return;
      for (const q of [h.entrada, h.saida]) {
        if (!q) continue;
        ctx.beginPath();
        circulo(ctx, vista.paraTela(q), 3);
        ctx.fillStyle = cores.selecao;
        ctx.fill();
      }
    });
    ancoras.forEach((a, i) => quadrado(ctx, vista.paraTela(a), LADO_ANCORA_PX, ui.edicao!.ancoras.includes(i) ? cores.selecao : cores.alca, cores.selecao));
  } else if (cena.caixaTransformacao && cena.selecionados.length > 0) {
    const c = caixaDaSelecao(cena.selecionados);
    if (c) {
      const pos = posicoesDasAlcas(c, DISTANCIA_ALCA_ROTACAO_PX / vista.zoom);
      ctx.beginPath();
      poligonoPx(ctx, cantosPx(c, vista));
      poligonoPx(ctx, [vista.paraTela(pos.alcas.n), vista.paraTela(pos.rotacao)], false);
      ctx.strokeStyle = cores.selecao;
      ctx.stroke();
      for (const a of Object.values(pos.alcas)) quadrado(ctx, vista.paraTela(a), LADO_ALCA_PX, cores.alca, cores.selecao);
      ctx.beginPath();
      circulo(ctx, vista.paraTela(pos.rotacao), 4);
      ctx.fillStyle = cores.alca;
      ctx.fill();
      ctx.stroke();
      for (const m of cena.marcasCantos ?? []) {
        ctx.beginPath();
        circulo(ctx, vista.paraTela(m), 3.5);
        ctx.fillStyle = cores.alca;
        ctx.fill();
        ctx.strokeStyle = cores.selecao;
        ctx.stroke();
      }
      const pv = vista.paraTela(ui.pivo ?? pos.centro);
      ctx.beginPath();
      circulo(ctx, pv, 4);
      poligonoPx(ctx, [[pv[0] - 7, pv[1]], [pv[0] + 7, pv[1]]], false);
      poligonoPx(ctx, [[pv[0], pv[1] - 7], [pv[0], pv[1] + 7]], false);
      ctx.stroke();
    }
  }

  if (ui.linhasInteligentes.length > 0) {
    ctx.beginPath();
    for (const l of ui.linhasInteligentes) {
      const a = vista.paraTela(l.orientacao === 'vertical' ? [l.posicao, l.de] : [l.de, l.posicao]);
      const b = vista.paraTela(l.orientacao === 'vertical' ? [l.posicao, l.ate] : [l.ate, l.posicao]);
      poligonoPx(ctx, [a, b], false);
    }
    ctx.strokeStyle = cores.guiaInteligente;
    ctx.stroke();
    for (const l of ui.linhasInteligentes) {
      if (l.distancia === undefined) continue;
      const meio = vista.paraTela(l.orientacao === 'vertical' ? [l.posicao, (l.de + l.ate) / 2] : [(l.de + l.ate) / 2, l.posicao]);
      texto(ctx, `${Math.round(l.distancia * 100) / 100} mm`, [meio[0] + 4, meio[1] - 4], cores.guiaInteligente);
    }
  }

  if (ui.caixaSelecao) {
    const a = vista.paraTela(ui.caixaSelecao.de);
    const b = vista.paraTela(ui.caixaSelecao.ate);
    ctx.beginPath();
    poligonoPx(ctx, [a, [b[0], a[1]], b, [a[0], b[1]]]);
    ctx.setLineDash(ui.caixaSelecao.crossing ? [5, 3] : []);
    ctx.strokeStyle = cores.selecao;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (ui.snap) {
    const p = vista.paraTela(ui.snap.coordenada);
    ctx.beginPath();
    poligonoPx(ctx, [[p[0] - 5, p[1] - 5], [p[0] + 5, p[1] - 5], [p[0] + 5, p[1] + 5], [p[0] - 5, p[1] + 5]]);
    ctx.strokeStyle = cores.snap;
    ctx.stroke();
    texto(ctx, ui.snap.tipo, [p[0] + 8, p[1] - 8], cores.snap);
  }
  if (ui.rotulo) {
    const p = vista.paraTela(ui.rotulo.em);
    texto(ctx, ui.rotulo.texto, [p[0] + 12, p[1] + 18], cores.selecao);
  }
  ctx.restore();
}
