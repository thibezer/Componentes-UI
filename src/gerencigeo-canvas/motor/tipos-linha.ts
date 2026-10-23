/*
 * Tipos de linha no estilo CAD (o "linetype" do AutoCAD): nomes estáveis → padrão de traços em px, resolvido sem DOM.
 * Os padrões são da espessura 1 px com escala 1; crescem com `escalaTipoLinha` (o LTSCALE) e, acima de 2 px, com a
 * espessura, para o tracejado não virar borrão numa linha grossa. Pontos são segmentos de comprimento zero: com
 * terminação arredondada ou quadrada viram bolinhas/quadradinhos do tamanho da espessura; com terminação reta
 * (que não desenharia nada) ganham o comprimento da espessura.
 */

/** Tipos de linha conhecidos. `'continua'` é a linha cheia. */
export const TIPOS_LINHA = [
  'continua',
  'tracejada',
  'tracejada-curta',
  'tracejada-longa',
  'pontilhada',
  'traco-ponto',
  'traco-ponto-ponto',
  'oculta',
  'centro',
  'fantasma',
  'divisa'
] as const;

export type TipoLinha = (typeof TIPOS_LINHA)[number];

/** Terminação das pontas do traço (`lineCap`). */
export type TerminacaoTraco = 'arredondada' | 'reta' | 'quadrada';

/** Junção dos cantos do traço (`lineJoin`). */
export type JuncaoTraco = 'arredondada' | 'chanfrada' | 'angular';

/**
 * Padrões base (px, espessura 1, escala 1): pares traço/vão. `0` = ponto.
 * - oculta (HIDDEN): traços curtos e densos; centro (CENTER): longo-curto; fantasma (PHANTOM): longo-curto-curto;
 *   divisa (BORDER): traço-traço-ponto.
 */
const PADROES: Record<Exclude<TipoLinha, 'continua'>, readonly number[]> = {
  'tracejada': [12, 6],
  'tracejada-curta': [6, 4],
  'tracejada-longa': [24, 8],
  'pontilhada': [0, 4],
  'traco-ponto': [12, 4, 0, 4],
  'traco-ponto-ponto': [12, 4, 0, 4, 0, 4],
  'oculta': [6, 3],
  'centro': [24, 4, 6, 4],
  'fantasma': [24, 4, 6, 4, 6, 4],
  'divisa': [12, 4, 12, 4, 0, 4]
};

const TERMINACOES: Record<TerminacaoTraco, CanvasLineCap> = { arredondada: 'round', reta: 'butt', quadrada: 'square' };
const JUNCOES: Record<JuncaoTraco, CanvasLineJoin> = { arredondada: 'round', chanfrada: 'bevel', angular: 'miter' };

const ESCALA_MIN = 0.05;
const ESCALA_MAX = 100;

/** Nomes do AutoCAD (os do editor de tipo de linha do `<ui-tabela-propriedades>`), em minúsculas → tipo de linha. */
const APELIDOS_AUTOCAD: Record<string, TipoLinha> = {
  continuous: 'continua',
  dashed: 'tracejada',
  dashed2: 'tracejada-curta',
  dashedx2: 'tracejada-longa',
  dot: 'pontilhada',
  dotted: 'pontilhada',
  dashdot: 'traco-ponto',
  divide: 'traco-ponto-ponto',
  hidden: 'oculta',
  center: 'centro',
  phantom: 'fantasma',
  border: 'divisa'
};

export function ehTipoLinha(v: unknown): v is TipoLinha {
  return typeof v === 'string' && (TIPOS_LINHA as readonly string[]).includes(v);
}

/** Tipo de linha a partir do nome em português ou do AutoCAD (`'Dashed'`, `'CENTER'`); desconhecido = `undefined`. */
export function normalizarTipoLinha(v: unknown): TipoLinha | undefined {
  if (ehTipoLinha(v)) return v;
  if (typeof v !== 'string') return undefined;
  const k = v.trim().toLowerCase();
  if (ehTipoLinha(k)) return k;
  return Object.prototype.hasOwnProperty.call(APELIDOS_AUTOCAD, k) ? APELIDOS_AUTOCAD[k] : undefined;
}

/** `lineCap` do Canvas/SVG a partir do nome em português; desconhecido = `undefined` (quem chama decide o padrão). */
export function terminacaoCanvas(v: unknown): CanvasLineCap | undefined {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(TERMINACOES, v) ? TERMINACOES[v as TerminacaoTraco] : undefined;
}

/** `lineJoin` do Canvas/SVG a partir do nome em português; desconhecido = `undefined`. */
export function juncaoCanvas(v: unknown): CanvasLineJoin | undefined {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(JUNCOES, v) ? JUNCOES[v as JuncaoTraco] : undefined;
}

/** Escala do tipo de linha saneada: não finita ou ≤ 0 = 1; limitada a [0,05; 100]. */
export function escalaTipoLinhaSegura(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return 1;
  return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v));
}

/**
 * `dashArray` (SVG/Leaflet, "12 6") do tipo de linha (nome em português ou do AutoCAD); `'continua'` ou
 * desconhecido = `undefined` (linha cheia).
 * `peso` é a espessura em px; `terminacao` é o `lineCap` que será usado (pontos dependem dele).
 */
export function dashTipoLinha(tipo: unknown, peso: number, escala: unknown = 1, terminacao: CanvasLineCap = 'round'): string | undefined {
  const t = normalizarTipoLinha(tipo);
  if (!t || t === 'continua') return undefined;
  const p = Number.isFinite(peso) && peso > 0 ? peso : 1;
  const fator = escalaTipoLinhaSegura(escala) * Math.max(1, p / 2);
  // com ponta reta um segmento de comprimento zero não aparece: o ponto vira um quadradinho da espessura
  const ponto = terminacao === 'butt' ? p : 0;
  // pontas arredondadas/quadradas avançam meia espessura de cada lado sobre o vão: compensa para o vão não sumir
  const avanco = terminacao === 'butt' ? 0 : p;
  return PADROES[t]
    .map((v, i) => {
      const n = i % 2 === 0 ? (v === 0 ? ponto : v * fator) : v * fator + avanco;
      return Math.round(n * 100) / 100;
    })
    .join(' ');
}
