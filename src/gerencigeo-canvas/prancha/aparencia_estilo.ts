import { corSegura } from '../motor/estilo';
import { dashTipoLinha, escalaTipoLinhaSegura, juncaoCanvas, normalizarTipoLinha, terminacaoCanvas } from '../motor/tipos-linha';
import { parseDash } from '../renderers/renderizador_formas';
import { contornoLocalEmCache } from './elemento_geometria';
import type { ElementoGrafico, GradienteElemento, ModoMesclagem, ParadaGradiente, PontaSeta, SombraElemento } from './tipos';

/*
 * Resolução da aparência (L2, pura): padrões, saneamento e unidades, uma vez, num objeto simples que o pintor Canvas e a
 * exportação SVG usam do mesmo jeito. É a FONTE ÚNICA de estilo da prancha: nenhum dos dois decide cor, espessura,
 * tracejado ou ponta por conta própria.
 *
 * Padrões (de prancha de impressão): traço preto de 0,25 mm, ponta reta e junção angular com limite 4 (cantos vivos nas
 * molduras), sem preenchimento. Texto: preenchimento preto e sem traço.
 */

export const COR_PADRAO_PRANCHA = '#000000';
export const ESPESSURA_TRACO_PADRAO_MM = 0.25;
export const LIMITE_PONTA_PADRAO = 4;

/** mm por px CSS (96 dpi): os padrões dos tipos de linha (`motor/tipos-linha.ts`) são em px na espessura 1. */
export const MM_POR_PX = 25.4 / 96;

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const entre01 = (v: unknown, padrao: number): number => (fin(v) ? Math.min(1, Math.max(0, v)) : padrao);

/**
 * Padrão do tipo de linha em mm para um traço de `espessuraMm`. Reaproveita `dashTipoLinha` (o mesmo do mapa) convertendo a
 * espessura para px a 96 dpi e o resultado de volta para mm: a tracejada de um traço fino fica com 3,2 mm de traço e
 * 1,6 mm de vão (+ a espessura, com ponta arredondada/quadrada), e cresce com o traço grosso e com a escala (LTSCALE).
 */
export function padraoTipoLinhaMm(tipo: unknown, espessuraMm: number, escala: unknown = 1, cap: CanvasLineCap = 'butt'): number[] {
  const pesoPx = fin(espessuraMm) && espessuraMm > 0 ? espessuraMm / MM_POR_PX : 1;
  return parseDash(dashTipoLinha(tipo, pesoPx, escala, cap)).map((v) => Math.round(v * MM_POR_PX * 10000) / 10000);
}

export interface TracoResolvido {
  cor: string;
  /** mm (> 0). */
  largura: number;
  opacidade: number;
  /** Segmentos traço/vão em mm; vazio = contínuo. */
  tracejado: number[];
  terminacao: CanvasLineCap;
  juncao: CanvasLineJoin;
  limitePonta: number;
  alinhamento: 'centro' | 'dentro' | 'fora';
  pontaInicio?: PontaSeta;
  pontaFim?: PontaSeta;
}

export interface GradienteResolvido {
  def: GradienteElemento;
  /** Cor sólida usada onde o contexto não tem gradiente: a parada mais perto do meio (0,5). */
  corDegradacao: string;
  opacidadeDegradacao: number;
}

export interface PreenchimentoResolvido {
  cor: string;
  opacidade: number;
  regra: 'nonzero' | 'evenodd';
  gradiente?: GradienteResolvido;
}

export interface HachuraResolvida {
  /** Radianos, já somada à rotação do elemento. */
  angulo: number;
  espacamento: number;
  cor: string;
  largura: number;
  opacidade: number;
  cruzada: boolean;
}

/** Nome do modo no Canvas (`globalCompositeOperation`) e no CSS/SVG (`mix-blend-mode`): são os mesmos. */
export const MESCLAGEM_CSS: Readonly<Record<ModoMesclagem, string>> = {
  normal: 'source-over', multiplicar: 'multiply', tela: 'screen', sobrepor: 'overlay', escurecer: 'darken', clarear: 'lighten',
  'subexposicao-cor': 'color-dodge', 'superexposicao-cor': 'color-burn', 'luz-dura': 'hard-light', 'luz-suave': 'soft-light',
  diferenca: 'difference', exclusao: 'exclusion', matiz: 'hue', saturacao: 'saturation', cor: 'color', luminosidade: 'luminosity'
};

export const MODOS_MESCLAGEM = Object.keys(MESCLAGEM_CSS) as ModoMesclagem[];

export const SOMBRA_PADRAO = { deslocamento: [1.5, 1.5] as const, desfoque: 1, opacidade: 0.5 };

export interface SombraResolvida {
  /** mm na folha. */
  dx: number;
  dy: number;
  /** Desvio-padrão do desfoque em mm (0 = nítida). */
  desfoque: number;
  cor: string;
  opacidade: number;
}

/** Sombra pronta para pintar, ou `null` (sem sombra ou sem efeito visível). */
export function resolverSombra(s: SombraElemento | null | undefined): SombraResolvida | null {
  if (!s || typeof s !== 'object') return null;
  const d = Array.isArray(s.deslocamento) && fin(s.deslocamento[0]) && fin(s.deslocamento[1]) ? s.deslocamento : SOMBRA_PADRAO.deslocamento;
  const lim = (v: number): number => Math.max(-1000, Math.min(1000, v));
  const r: SombraResolvida = {
    dx: lim(d[0]),
    dy: lim(d[1]),
    desfoque: fin(s.desfoque) && s.desfoque >= 0 ? Math.min(100, s.desfoque) : SOMBRA_PADRAO.desfoque,
    cor: corSegura(s.cor, COR_PADRAO_PRANCHA),
    opacidade: entre01(s.opacidade, SOMBRA_PADRAO.opacidade)
  };
  return r.opacidade > 0 ? r : null;
}

export interface AparenciaResolvida {
  traco: TracoResolvido | null;
  preenchimento: PreenchimentoResolvido | null;
  hachura: HachuraResolvida | null;
  /** Opacidade do elemento inteiro. */
  opacidade: number;
  /** Nome Canvas/CSS do modo de mesclagem; `null` = normal. */
  mesclagem: string | null;
  sombra: SombraResolvida | null;
}

function paradasSeguras(ps: readonly ParadaGradiente[]): ParadaGradiente[] {
  return ps
    .filter((p) => p && fin(p.posicao))
    .map((p) => ({ posicao: Math.min(1, Math.max(0, p.posicao)), cor: corSegura(p.cor, COR_PADRAO_PRANCHA), opacidade: entre01(p.opacidade, 1) }))
    .sort((a, b) => a.posicao - b.posicao);
}

function resolverGradiente(g: GradienteElemento | undefined, corDaForma: string | undefined): GradienteResolvido | undefined {
  if (!g || !Array.isArray(g.paradas)) return undefined;
  const ps = paradasSeguras(g.paradas);
  if (ps.length === 0) return undefined;
  const meio = ps.reduce((m, p) => (Math.abs(p.posicao - 0.5) < Math.abs(m.posicao - 0.5) ? p : m), ps[0]);
  const def: GradienteElemento = g.tipo === 'radial'
    ? { ...g, paradas: ps }
    : { tipo: 'linear', de: g.de, ate: g.ate, paradas: ps };
  return {
    def,
    corDegradacao: corDaForma ? corSegura(corDaForma, meio.cor) : meio.cor,
    opacidadeDegradacao: meio.opacidade ?? 1
  };
}

/** Rotação da matriz do elemento (para a hachura girar junto). */
const rotacaoDe = (el: ElementoGrafico): number => {
  const m = el.transformacao;
  return m && fin(m.a) && fin(m.b) ? Math.atan2(m.b, m.a) : 0;
};

const cacheAparencia = new WeakMap<ElementoGrafico, AparenciaResolvida>();

/** `resolverAparencia` em cache pelo objeto do elemento (imutável). */
export function aparenciaDe(el: ElementoGrafico): AparenciaResolvida {
  if (!el || typeof el !== 'object') return resolverAparencia(el);
  let r = cacheAparencia.get(el);
  if (!r) {
    r = resolverAparencia(el);
    cacheAparencia.set(el, r);
  }
  return r;
}

/** Aparência pronta para pintar. Nunca lança; valores ruins viram o padrão. */
export function resolverAparencia(el: ElementoGrafico): AparenciaResolvida {
  const ap = el?.aparencia ?? {};
  const texto = el?.geometria?.tipo === 'texto';
  const fechado = !texto && contornoLocalEmCache(el?.geometria)?.tipo === 'Polygon';

  let traco: TracoResolvido | null = null;
  const t = ap.traco;
  if (t !== null && !(texto && t === undefined)) {
    const tt = t ?? {};
    const largura = fin(tt.espessura) && tt.espessura > 0 ? tt.espessura : tt.espessura === 0 ? 0 : ESPESSURA_TRACO_PADRAO_MM;
    if (largura > 0) {
      const terminacao = terminacaoCanvas(tt.terminacao) ?? 'butt';
      const tipo = normalizarTipoLinha(tt.tipoLinha);
      traco = {
        cor: corSegura(tt.cor, COR_PADRAO_PRANCHA),
        largura,
        opacidade: entre01(tt.opacidade, 1),
        tracejado: tipo && tipo !== 'continua' ? padraoTipoLinhaMm(tipo, largura, escalaTipoLinhaSegura(tt.escalaTipoLinha), terminacao) : [],
        terminacao,
        juncao: juncaoCanvas(tt.juncao) ?? 'miter',
        limitePonta: fin(tt.limitePonta) && tt.limitePonta >= 1 ? tt.limitePonta : LIMITE_PONTA_PADRAO,
        alinhamento: fechado && (tt.alinhamento === 'dentro' || tt.alinhamento === 'fora') ? tt.alinhamento : 'centro'
      };
      if (!fechado && tt.pontaInicio) traco.pontaInicio = tt.pontaInicio;
      if (!fechado && tt.pontaFim) traco.pontaFim = tt.pontaFim;
    }
  }

  let preenchimento: PreenchimentoResolvido | null = null;
  const p = ap.preenchimento === undefined && texto ? {} : ap.preenchimento;
  if (p && (fechado || texto)) {
    const cor = (p.cor ?? '').trim().toLowerCase();
    const semCor = cor === 'none' || cor === 'transparent';
    const gradiente = texto ? undefined : resolverGradiente(p.gradiente, p.cor);
    if (!semCor || gradiente) {
      const multiplosAneis = el.geometria.tipo === 'caminho' && el.geometria.geometria?.tipo === 'Polygon' && el.geometria.geometria.aneis.length > 1;
      preenchimento = {
        cor: corSegura(p.cor, gradiente?.corDegradacao ?? COR_PADRAO_PRANCHA),
        opacidade: entre01(p.opacidade, 1),
        regra: p.regra ?? (multiplosAneis ? 'evenodd' : 'nonzero')
      };
      if (gradiente) preenchimento.gradiente = gradiente;
    }
  }

  let hachura: HachuraResolvida | null = null;
  const h = ap.hachura;
  if (h && fechado && !texto) {
    hachura = {
      angulo: ((fin(h.angulo) ? h.angulo : 45) * Math.PI) / 180 + rotacaoDe(el),
      espacamento: fin(h.espacamento) && h.espacamento > 0 ? Math.max(0.1, h.espacamento) : 2,
      cor: corSegura(h.cor, traco?.cor ?? COR_PADRAO_PRANCHA),
      largura: fin(h.espessura) && h.espessura > 0 ? h.espessura : 0.18,
      opacidade: entre01(h.opacidade, 1),
      cruzada: h.cruzada === true
    };
  }

  const modo = typeof ap.mesclagem === 'string' && Object.prototype.hasOwnProperty.call(MESCLAGEM_CSS, ap.mesclagem) ? ap.mesclagem : 'normal';
  return {
    traco, preenchimento, hachura, opacidade: entre01(ap.opacidade, 1),
    mesclagem: modo === 'normal' ? null : MESCLAGEM_CSS[modo], sombra: resolverSombra(ap.sombra)
  };
}

/**
 * Cor com a opacidade embutida, para as paradas de gradiente do Canvas (que não têm opacidade própria). Hex (#rgb, #rrggbb,
 * #rrggbbaa) vira `rgba(...)`; outros formatos seguem como estão (a opacidade da parada é ignorada no Canvas; o SVG usa
 * `stop-opacity` e respeita sempre).
 */
export function corComOpacidade(cor: string, opacidade: number): string {
  const op = fin(opacidade) ? Math.min(1, Math.max(0, opacidade)) : 1;
  if (op >= 1) return cor;
  const h = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(cor.trim());
  if (!h) return cor;
  let hex = h[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return `rgba(${r},${g},${b},${Math.round(a * op * 1000) / 1000})`;
}
