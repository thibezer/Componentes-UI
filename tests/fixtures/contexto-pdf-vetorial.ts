import type { ContextoPranchaRelativo } from '../../src/gerencigeo-canvas/prancha/pintura_contexto';
import { IDENTIDADE, aplicar, multiplicar, type Matriz2D } from '../../src/gerencigeo-canvas/espaco/espaco_matriz';

/*
 * Contexto "estilo PDF vetorial" para testes: SÓ `translate/scale/rotate/transform` RELATIVOS (nada de `setTransform`),
 * sem gradiente, sombra (`filter`), mesclagem nem `Path2D`; com texto simples (`fillText`, `font`, `measureText`).
 * Mantém a matriz corrente (como um PDF faz) e grava, em coordenadas do espaço de exportação, cada ponto de caminho e cada texto.
 */
export class ContextoPdfVetorial {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  globalAlpha = 1;
  miterLimit = 10;
  font = '10px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  ctm: Matriz2D = IDENTIDADE;
  pilha: Matriz2D[] = [];
  /** Pontos de caminho já no espaço de exportação. */
  pontos: Array<[string, number, number]> = [];
  textos: Array<{ texto: string; x: number; y: number; font: string; ctm: Matriz2D }> = [];
  operacoes: string[] = [];

  save(): void { this.pilha.push(this.ctm); }
  restore(): void { this.ctm = this.pilha.pop() ?? this.ctm; }
  translate(x: number, y: number): void { this.transform(1, 0, 0, 1, x, y); }
  scale(x: number, y: number): void { this.transform(x, 0, 0, y, 0, 0); }
  rotate(r: number): void { this.transform(Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0); }
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void { this.ctm = multiplicar(this.ctm, { a, b, c, d, e, f }); }
  beginPath(): void { this.operacoes.push('beginPath'); }
  moveTo(x: number, y: number): void { const p = aplicar(this.ctm, [x, y]); this.pontos.push(['M', p[0], p[1]]); }
  lineTo(x: number, y: number): void { const p = aplicar(this.ctm, [x, y]); this.pontos.push(['L', p[0], p[1]]); }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    for (const q of [[c1x, c1y], [c2x, c2y], [x, y]] as const) { const p = aplicar(this.ctm, [q[0], q[1]]); this.pontos.push(['C', p[0], p[1]]); }
  }
  closePath(): void { this.operacoes.push('closePath'); }
  fill(): void { this.operacoes.push('fill'); }
  stroke(): void { this.operacoes.push('stroke'); }
  clip(): void { this.operacoes.push('clip'); }
  setLineDash(): void { this.operacoes.push('setLineDash'); }
  fillRect(x: number, y: number, w: number, h: number): void {
    for (const q of [[x, y], [x + w, y + h]] as const) { const p = aplicar(this.ctm, [q[0], q[1]]); this.pontos.push(['R', p[0], p[1]]); }
  }
  fillText(texto: string, x: number, y: number): void { this.textos.push({ texto, x, y, font: this.font, ctm: this.ctm }); }
  measureText(t: string): { width: number } { return { width: t.length * 5 }; }
}

export const comoRelativo = (c: ContextoPdfVetorial): ContextoPranchaRelativo => c as unknown as ContextoPranchaRelativo;
