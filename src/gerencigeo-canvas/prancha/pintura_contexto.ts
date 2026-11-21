import { IDENTIDADE, inverter, multiplicar, saneada, type Matriz2D } from '../espaco/espaco_matriz';

/*
 * Contrato do contexto de pintura (L2, puro): diagnóstico do que um contexto 2D oferece e adaptador para contextos que só
 * têm `transform` RELATIVO (o PDF vetorial de muitos apps: `translate/scale/rotate/transform`, sem `setTransform`).
 *
 * O pintor da prancha trabalha com matrizes ABSOLUTAS (folha → espaço de exportação do contexto) e chama `setTransform`.
 * "Absoluto" é relativo ao espaço de exportação, isto é, ao estado do contexto quando a pintura COMEÇA (identidade num
 * canvas novo ou no PDF recém-aberto), nunca ao transform corrente no meio da pintura.
 */

/** Contexto sem `setTransform`, só com `transform` relativo (multiplica o transform corrente por `a..f`). */
export interface ContextoPranchaRelativo {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  globalAlpha: number;
  miterLimit?: number;
  save(): void;
  restore(): void;
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
  fill(regra?: CanvasFillRule): void;
  stroke(): void;
  clip(regra?: CanvasFillRule): void;
  setLineDash(segmentos: number[]): void;
  fillRect(x: number, y: number, w: number, h: number): void;
}

/** Como o pintor posiciona a matriz: `absoluta` (`setTransform`), `relativa` (só `transform`) ou `nenhuma` (não dá para pintar). */
export type ModoTransformacao = 'absoluta' | 'relativa' | 'nenhuma';

const METODOS_OBRIGATORIOS = ['save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'closePath', 'fill', 'stroke', 'clip', 'setLineDash', 'fillRect'] as const;
const PROPRIEDADES_OBRIGATORIAS = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'globalAlpha'] as const;

const ehFuncao = (ctx: unknown, nome: string): boolean => {
  try { return typeof (ctx as Record<string, unknown>)[nome] === 'function'; } catch { return false; }
};

/** Modo de posicionamento disponível no contexto: o absoluto vence; sem ele, o relativo; senão `nenhuma`. */
export function modoDeTransformacao(ctx: unknown): ModoTransformacao {
  if (!ctx || (typeof ctx !== 'object' && typeof ctx !== 'function')) return 'nenhuma';
  if (ehFuncao(ctx, 'setTransform')) return 'absoluta';
  if (ehFuncao(ctx, 'transform')) return 'relativa';
  return 'nenhuma';
}

export interface DiagnosticoContexto {
  /** O que FALTA do contrato (vazio = o contexto serve). `setTransform` só é listado se também não há `transform`. */
  obrigatorios: string[];
  /** Capacidades opcionais AUSENTES (cada uma degrada de forma definida; ver `pintura_canvas.ts`). */
  opcionais: string[];
  /** Como a matriz será aplicada. */
  transformacao: ModoTransformacao;
}

/**
 * Verifica se um contexto cumpre o contrato do pintor. Serve de teste no app ("o contexto do meu PDF está completo?").
 * Nunca lança: entrada que não é objeto devolve tudo como faltando.
 */
export function diagnosticarContexto(ctx: unknown): DiagnosticoContexto {
  const objeto = !!ctx && (typeof ctx === 'object' || typeof ctx === 'function');
  const transformacao = modoDeTransformacao(ctx);
  const obrigatorios: string[] = [];
  const opcionais: string[] = [];
  const tem = (nome: string): boolean => { try { return (ctx as Record<string, unknown>)[nome] !== undefined; } catch { return false; } };
  if (!objeto) return { obrigatorios: [...METODOS_OBRIGATORIOS, ...PROPRIEDADES_OBRIGATORIAS, 'setTransform'], opcionais: ['gradiente', 'texto', 'mesclagem', 'filtro', 'miterLimit'], transformacao };
  for (const m of METODOS_OBRIGATORIOS) if (!ehFuncao(ctx, m)) obrigatorios.push(m);
  for (const p of PROPRIEDADES_OBRIGATORIAS) if (!tem(p)) obrigatorios.push(p);
  if (transformacao === 'nenhuma') obrigatorios.push('setTransform');
  if (!ehFuncao(ctx, 'createLinearGradient') || !ehFuncao(ctx, 'createRadialGradient')) opcionais.push('gradiente');
  if (!ehFuncao(ctx, 'fillText') || !tem('font') || !tem('textAlign') || !tem('textBaseline')) opcionais.push('texto');
  if (!tem('globalCompositeOperation')) opcionais.push('mesclagem');
  if (!tem('filter')) opcionais.push('filtro');
  if (!tem('miterLimit')) opcionais.push('miterLimit');
  return { obrigatorios, opcionais, transformacao };
}

type ContextoComSetTransform = ContextoPranchaRelativo & { setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void };

/**
 * Embrulha um contexto que só tem `transform` relativo, dando-lhe um `setTransform` absoluto:
 * `setTransform(M) = transform(inverse(atual) · M)`, rastreando o transform corrente e a pilha de `save`/`restore`.
 * Parte do princípio de que, ao começar, o transform do contexto é o espaço de exportação (identidade lógica).
 * Todo o resto (propriedades e métodos) é repassado ao contexto original.
 */
export function adaptarContextoRelativo(alvo: ContextoPranchaRelativo): ContextoComSetTransform {
  let atual: Matriz2D = IDENTIDADE;
  const pilha: Matriz2D[] = [];
  const proprios: Record<string, unknown> = {
    save: () => { pilha.push(atual); alvo.save(); },
    restore: () => { atual = pilha.pop() ?? atual; alvo.restore(); },
    setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => {
      const m = saneada({ a, b, c, d, e, f });
      const inv = inverter(atual);
      if (!inv) throw new Error('transform corrente singular: não dá para posicionar a matriz de forma relativa');
      const r = multiplicar(inv, m);
      alvo.transform(r.a, r.b, r.c, r.d, r.e, r.f);
      atual = m;
    }
  };
  return new Proxy(alvo as object, {
    get(t, k) {
      if (typeof k === 'string' && k in proprios) return proprios[k];
      const v = Reflect.get(t, k, t);
      return typeof v === 'function' ? v.bind(t) : v;
    },
    set(t, k, v) { return Reflect.set(t, k, v, t); }
  }) as ContextoComSetTransform;
}

let avisou = false;
/** Aviso único por carga do módulo (SSR-safe: só toca em `console` se existir). `redefinirAvisoContexto` é para teste. */
export function avisarUmaVez(mensagem: string): void {
  if (avisou) return;
  avisou = true;
  try { if (typeof console !== 'undefined' && typeof console.warn === 'function') console.warn(`[ui-canvas-prancha] ${mensagem}`); } catch { /* sem console */ }
}
export function redefinirAvisoContexto(): void { avisou = false; }
