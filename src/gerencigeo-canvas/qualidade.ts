/*
 * Perfis de qualidade do canvas (atributo `qualidade` do <ui-canvas-cad>): trocam fidelidade visual por desempenho.
 *
 * Puro: sem DOM e sem importar o Leaflet (o mapa entra por um contrato estrutural), então roda em Node/SSR.
 *
 *   alta  (padrão)  comportamento de sempre: renderizador `leaflet`, retina, animações e zoom em passos finos.
 *   media           renderizador `canvas`, retina, marcas e simplificação mais agressivas, zoom em meio nível.
 *   baixa           tudo da média + dpr 1, sem tracejado, sem animações/inércia, zoom em níveis inteiros.
 *
 * Os ganhos vêm de: menos pixels pintados (dpr 1 = 4× menos num monitor retina), menos objetos por quadro (LOD e
 * simplificação em px mais fortes), menos geometria recalculada (o cache do motor é por zoom: zoom em passos inteiros
 * reaproveita mais) e menos trabalho do Leaflet por gesto (sem animação de zoom nem inércia).
 */

export type NivelQualidade = 'alta' | 'media' | 'baixa';
export type ModoRenderizadorPadrao = 'leaflet' | 'canvas';

export interface PerfilQualidade {
  nivel: NivelQualidade;
  /** Renderizador das feições quando o atributo `renderizador` não foi dado. */
  renderizadorPadrao: ModoRenderizadorPadrao;
  /** Teto do `devicePixelRatio` dos canvases de feições (1 ou 2; `L.Browser.retina` continua sendo o limite superior). */
  dprMaximo: 1 | 2;
  /** Diagonal (px) abaixo da qual a feição é desenhada como marca de 1–2 px. */
  limiteMarcaPx: number;
  /** Tolerância (px) do Douglas-Peucker de formas projetadas. */
  toleranciaPx: number;
  /** Desenha `dashArray` (traço tracejado). Falso = linha contínua (mais barato no Canvas 2D). */
  tracejado: boolean;
  /** Animação de zoom, fade de tiles e animação de marcadores do Leaflet. */
  animacoes: boolean;
  /** Inércia ao soltar o arraste. */
  inercia: boolean;
  zoomSnap: number;
  zoomDelta: number;
  /** Quantas fileiras de tiles ficam em memória além da vista. */
  keepBuffer: number;
}

export const NIVEIS_QUALIDADE: readonly NivelQualidade[] = ['alta', 'media', 'baixa'];

const PERFIS: Record<NivelQualidade, PerfilQualidade> = Object.freeze({
  alta: Object.freeze({
    nivel: 'alta', renderizadorPadrao: 'leaflet', dprMaximo: 2, limiteMarcaPx: 3, toleranciaPx: 1.2,
    tracejado: true, animacoes: true, inercia: true, zoomSnap: 0.25, zoomDelta: 0.5, keepBuffer: 16
  } as const),
  media: Object.freeze({
    nivel: 'media', renderizadorPadrao: 'canvas', dprMaximo: 2, limiteMarcaPx: 6, toleranciaPx: 2,
    tracejado: true, animacoes: true, inercia: true, zoomSnap: 0.5, zoomDelta: 0.5, keepBuffer: 8
  } as const),
  baixa: Object.freeze({
    nivel: 'baixa', renderizadorPadrao: 'canvas', dprMaximo: 1, limiteMarcaPx: 10, toleranciaPx: 3,
    tracejado: false, animacoes: false, inercia: false, zoomSnap: 1, zoomDelta: 1, keepBuffer: 4
  } as const)
});

/** Valor do atributo -> nível. Ausente, vazio ou inválido cai em `alta` (o comportamento anterior ao atributo). */
export function lerNivelQualidade(valor: string | null | undefined): NivelQualidade {
  const v = String(valor ?? '').trim().toLowerCase();
  if (v === 'media' || v === 'média') return 'media';
  if (v === 'baixa') return 'baixa';
  return 'alta';
}

export function perfilDe(nivel: NivelQualidade): PerfilQualidade {
  return PERFIS[nivel] ?? PERFIS.alta;
}

/** Atalho: valor do atributo -> perfil. */
export function perfilDoAtributo(valor: string | null | undefined): PerfilQualidade {
  return perfilDe(lerNivelQualidade(valor));
}

/**
 * Renderizador efetivo: o atributo `renderizador`, quando dado, manda (inclusive valor inválido = `leaflet`, como
 * sempre foi); sem ele vale o padrão do perfil.
 */
export function modoRenderizadorEfetivo(atributo: string | null | undefined, perfil: PerfilQualidade): ModoRenderizadorPadrao {
  if (atributo === null || atributo === undefined) return perfil.renderizadorPadrao;
  return String(atributo).trim().toLowerCase() === 'canvas' ? 'canvas' : 'leaflet';
}

/** O que o perfil mexe no mapa do Leaflet (contrato estrutural: os internos `_zoomAnimated`/`_fadeAnimated` são opcionais). */
export interface MapaAjustavel {
  options: {
    zoomSnap?: number; zoomDelta?: number; inertia?: boolean;
    zoomAnimation?: boolean; fadeAnimation?: boolean; markerZoomAnimation?: boolean;
  };
  _zoomAnimated?: boolean;
  _fadeAnimated?: boolean;
}

interface OriginaisMapa { zoomAnimated: unknown; fadeAnimated: unknown; zoomAnimation?: boolean; fadeAnimation?: boolean; markerZoomAnimation?: boolean; inertia?: boolean }

const originais = new WeakMap<object, OriginaisMapa>();

/**
 * Aplica o perfil às opções do mapa já criado. Reversível: o que o Leaflet calculou na criação (`_zoomAnimated`,
 * `_fadeAnimated`) é guardado na primeira chamada e restaurado ao voltar para um perfil com `animacoes`. Nunca lança.
 */
export function aplicarPerfilAoMapa(mapa: MapaAjustavel | null | undefined, perfil: PerfilQualidade): void {
  try {
    if (!mapa || typeof mapa !== 'object' || !mapa.options) return;
    let orig = originais.get(mapa);
    if (!orig) {
      orig = {
        zoomAnimated: mapa._zoomAnimated, fadeAnimated: mapa._fadeAnimated, zoomAnimation: mapa.options.zoomAnimation,
        fadeAnimation: mapa.options.fadeAnimation, markerZoomAnimation: mapa.options.markerZoomAnimation, inertia: mapa.options.inertia
      };
      originais.set(mapa, orig);
    }
    const o = mapa.options;
    o.zoomSnap = perfil.zoomSnap;
    o.zoomDelta = perfil.zoomDelta;
    if (perfil.animacoes) {
      o.zoomAnimation = orig.zoomAnimation;
      o.fadeAnimation = orig.fadeAnimation;
      o.markerZoomAnimation = orig.markerZoomAnimation;
      mapa._zoomAnimated = orig.zoomAnimated as boolean | undefined;
      mapa._fadeAnimated = orig.fadeAnimated as boolean | undefined;
    } else {
      o.zoomAnimation = false;
      o.fadeAnimation = false;
      o.markerZoomAnimation = false;
      mapa._zoomAnimated = false;
      mapa._fadeAnimated = false;
    }
    o.inertia = perfil.inercia ? orig.inertia : false;
  } catch {
    // Regra #0: o mapa pode ser de outra versão do Leaflet; o perfil é só uma otimização
  }
}
