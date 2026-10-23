import type { CaixaGeo } from './feature_indice';

/*
 * LOD por tamanho em pixels (puro: sem DOM e sem Leaflet; importável em Node/SSR e rodável em Worker).
 *
 * Feição cuja DIAGONAL na tela fica abaixo de `LIMITE_MARCA_PX` não é descartada: vira uma marca de 1–2 px na cor
 * do contorno/preenchimento, pintada em lote por cor. O mapa não fica "furado" e o operador enxerga a densidade.
 * A diagonal (e não a área) é a medida porque uma linha longa e fina tem área ~0 e precisa continuar visível.
 *
 * Só o DESENHO usa isto. Hit-test, snap, caixa e laço seguem na geometria original (índice espacial), então uma
 * feição de 1 px continua clicável e selecionável.
 */

/** Abaixo desta diagonal (px) a feição é desenhada como marca. */
export const LIMITE_MARCA_PX = 3;
/** Opacidade da marca (preenchimentos de 0,2 sumiriam em 1–2 px). */
export const OPACIDADE_MARCA = 0.75;

const LATITUDE_MAX = 85.0511287798;
const TAMANHO_TILE = 256;

export interface PontoMundo {
  x: number;
  y: number;
}

/** Web Mercator (EPSG:3857, tiles de 256 px) em pixels do mundo no zoom. Não lança: entradas inválidas dão NaN. */
export function projetarMercator(lat: number, lon: number, zoom: number): PontoMundo {
  const escala = TAMANHO_TILE * 2 ** zoom;
  const la = Math.max(-LATITUDE_MAX, Math.min(LATITUDE_MAX, lat));
  const sen = Math.sin((la * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * escala,
    y: (0.5 - Math.log((1 + sen) / (1 - sen)) / (4 * Math.PI)) * escala
  };
}

const caixaValida = (c: CaixaGeo): boolean =>
  Number.isFinite(c.minLat) && Number.isFinite(c.maxLat) && Number.isFinite(c.minLon) && Number.isFinite(c.maxLon) &&
  c.minLat <= c.maxLat && c.minLon <= c.maxLon;

/** Diagonal da caixa em pixels no zoom; NaN se a caixa ou o zoom forem inválidos. */
export function diagonalPx(c: CaixaGeo, zoom: number): number {
  if (!Number.isFinite(zoom) || zoom < 0 || !caixaValida(c)) return NaN;
  const a = projetarMercator(c.minLat, c.minLon, zoom);
  const b = projetarMercator(c.maxLat, c.maxLon, zoom);
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Vira marca? Caixa ausente ou inválida nunca vira (a feição segue o caminho normal). */
export function ehMarca(c: CaixaGeo | undefined, zoom: number, limite: number = LIMITE_MARCA_PX): boolean {
  if (!c) return false;
  const d = diagonalPx(c, zoom);
  return Number.isFinite(d) && d < limite;
}

/** Lado da marca em px: 1 para diagonais minúsculas, 2 para as demais. */
export function ladoMarca(diagonal: number): 1 | 2 {
  return Number.isFinite(diagonal) && diagonal < 1.5 ? 1 : 2;
}

export interface MarcaLOD {
  id: string;
  lat: number;
  lon: number;
  cor: string;
  lado: 1 | 2;
  /** Quem gerou a marca (identidade da feição): o renderizador só a refaz quando a feição troca. */
  fonte: unknown;
}

/** Parte do Canvas 2D que a pintura usa (permite testar com um contexto falso). */
export interface ContextoMarcas {
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
}

export function agruparMarcasPorCor(marcas: Iterable<MarcaLOD>): Map<string, MarcaLOD[]> {
  const grupos = new Map<string, MarcaLOD[]>();
  for (const m of marcas) {
    const g = grupos.get(m.cor);
    if (g) g.push(m);
    else grupos.set(m.cor, [m]);
  }
  return grupos;
}

const COR_MARCA_PADRAO = '#38bdf8';

/**
 * Pinta as marcas em lote por cor (um `fillStyle` por grupo). `origemX/origemY` são os pixels do mundo, no zoom,
 * do canto superior esquerdo do canvas. Devolve quantas marcas caíram dentro do canvas.
 */
export function pintarMarcas(
  ctx: ContextoMarcas, marcas: Iterable<MarcaLOD>, zoom: number,
  origemX: number, origemY: number, largura: number, altura: number
): number {
  let pintadas = 0;
  const grupos = agruparMarcasPorCor(marcas);
  for (const [cor, lista] of grupos) {
    let definida = false;
    for (const m of lista) {
      const p = projetarMercator(m.lat, m.lon, zoom);
      const x = p.x - origemX;
      const y = p.y - origemY;
      if (!(x >= -2 && y >= -2 && x <= largura + 2 && y <= altura + 2)) continue; // também descarta NaN
      if (!definida) {
        ctx.fillStyle = cor || COR_MARCA_PADRAO;
        ctx.globalAlpha = OPACIDADE_MARCA;
        definida = true;
      }
      ctx.fillRect(Math.round(x - m.lado / 2), Math.round(y - m.lado / 2), m.lado, m.lado);
      pintadas++;
    }
  }
  return pintadas;
}
