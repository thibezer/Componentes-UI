import type { ContextoPrancha2D, GradienteDoContexto } from '../src/gerencigeo-canvas/prancha/pintura_canvas';

/*
 * Contextos 2D de teste da prancha (o ambiente não tem Canvas 2D real; não se promete comparação de pixels):
 *  - `ContextoGravador`: todas as capacidades (gradiente, texto), grava cada chamada e cada propriedade atribuída;
 *  - `contextoMinimo()`: só o contrato `ContextoPrancha2D`, como o PDF vetorial do app; um Proxy anota toda propriedade
 *    lida ou escrita, para provar que o pintor não usa nada além do contrato (e das capacidades que ele só sonda).
 */

export type Chamada = [string, ...unknown[]];

export class GradienteGravado implements GradienteDoContexto {
  public paradas: Array<[number, string]> = [];
  constructor(public readonly tipo: string, public readonly args: number[]) {}
  addColorStop(posicao: number, cor: string): void {
    this.paradas.push([posicao, cor]);
  }
}

const METODOS = [
  'save', 'restore', 'setTransform', 'beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'closePath', 'fill', 'stroke', 'clip',
  'setLineDash', 'fillRect'
] as const;

export const PROPRIEDADES_CONTRATO = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'globalAlpha', 'miterLimit'] as const;
export const CHAVES_CONTRATO: ReadonlySet<string> = new Set<string>([...METODOS, ...PROPRIEDADES_CONTRATO]);
/** Capacidades opcionais que o pintor só pode SONDAR (typeof) num contexto que não as tem. */
export const CAPACIDADES_SONDADAS: ReadonlySet<string> = new Set(['createLinearGradient', 'createRadialGradient', 'fillText']);

export class ContextoGravador implements ContextoPrancha2D {
  public chamadas: Chamada[] = [];
  public fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  public strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  public lineWidth = 1;
  public lineCap: CanvasLineCap = 'butt';
  public lineJoin: CanvasLineJoin = 'miter';
  public globalAlpha = 1;
  public miterLimit = 10;
  public font = '10px sans-serif';
  public textAlign: CanvasTextAlign = 'start';
  public textBaseline: CanvasTextBaseline = 'alphabetic';
  public gradientes: GradienteGravado[] = [];
  public profundidade = 0;
  public profundidadeMaxima = 0;

  private g(nome: string, ...args: unknown[]): void {
    this.chamadas.push([nome, ...args]);
  }
  save(): void { this.profundidade++; this.profundidadeMaxima = Math.max(this.profundidadeMaxima, this.profundidade); this.g('save'); }
  restore(): void { this.profundidade--; this.g('restore'); }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void { this.g('setTransform', a, b, c, d, e, f); }
  beginPath(): void { this.g('beginPath'); }
  moveTo(x: number, y: number): void { this.g('moveTo', x, y); }
  lineTo(x: number, y: number): void { this.g('lineTo', x, y); }
  bezierCurveTo(a: number, b: number, c: number, d: number, e: number, f: number): void { this.g('bezierCurveTo', a, b, c, d, e, f); }
  closePath(): void { this.g('closePath'); }
  fill(regra?: CanvasFillRule): void { this.g('fill', regra, this.fillStyle, this.globalAlpha); }
  stroke(): void { this.g('stroke', this.strokeStyle, this.lineWidth, this.globalAlpha); }
  clip(regra?: CanvasFillRule): void { this.g('clip', regra); }
  setLineDash(s: number[]): void { this.g('setLineDash', [...s]); }
  fillRect(x: number, y: number, w: number, h: number): void { this.g('fillRect', x, y, w, h, this.fillStyle); }
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): GradienteDoContexto {
    const g = new GradienteGravado('linear', [x0, y0, x1, y1]);
    this.gradientes.push(g);
    return g;
  }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): GradienteDoContexto {
    const g = new GradienteGravado('radial', [x0, y0, r0, x1, y1, r1]);
    this.gradientes.push(g);
    return g;
  }
  fillText(t: string, x: number, y: number): void { this.g('fillText', t, x, y, this.font, this.textAlign); }

  /** Só os comandos de caminho (o que define a geometria pintada). */
  get geometria(): Chamada[] {
    return this.chamadas.filter(([n]) => n === 'moveTo' || n === 'lineTo' || n === 'bezierCurveTo' || n === 'closePath');
  }
  nomes(): string[] {
    return this.chamadas.map(([n]) => n);
  }
}

export interface Vigiado {
  ctx: ContextoPrancha2D;
  lidas: Set<string>;
  escritas: Set<string>;
  chamadas: Chamada[];
}

/** Contexto com SÓ o contrato (estilo PDF vetorial: sem gradiente, sem texto, sem Path2D), vigiado por Proxy. */
export function contextoMinimo(): Vigiado {
  const chamadas: Chamada[] = [];
  const alvo: Record<string, unknown> = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', globalAlpha: 1, miterLimit: 10 };
  for (const m of METODOS) alvo[m] = (...args: unknown[]) => { chamadas.push([m, ...args]); };
  const lidas = new Set<string>();
  const escritas = new Set<string>();
  const ctx = new Proxy(alvo, {
    get(t, k) {
      if (typeof k === 'string') lidas.add(k);
      return t[k as string];
    },
    set(t, k, v) {
      if (typeof k === 'string') escritas.add(k);
      t[k as string] = v;
      return true;
    }
  }) as unknown as ContextoPrancha2D;
  return { ctx, lidas, escritas, chamadas };
}
