import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  desenharElementos, desenharPlano, diagnosticarContexto, faixasDoGradienteLinear, corNaPosicao, planejar, criarRetangulo, criarTexto, escala, redefinirAvisoContexto, adaptarContextoRelativo,
  type ElementoGrafico
} from '../src/prancha';
import { ContextoGravador, contextoMinimo } from './prancha-contextos';
import { ContextoPdfVetorial, comoRelativo } from './fixtures/contexto-pdf-vetorial';

const ret = (id: string, x = 5, y = 5): ElementoGrafico => criarRetangulo({ id, aparencia: { traco: { cor: '#000', espessura: 0.5 }, preenchimento: { cor: '#f00' } } }, { x, y, largura: 40, altura: 20 })!;
const texto = (s: string, tamanho = 4, largura?: number): ElementoGrafico => {
  const t = criarTexto({ id: 't', aparencia: { preenchimento: { cor: '#000' } } }, [10, 20], s, tamanho)!;
  return largura && t.geometria.tipo === 'texto' ? { ...t, geometria: { ...t.geometria, largura } } : t;
};

/** Contexto absoluto que também aplica a CTM, para comparar com o PDF relativo no espaço de exportação. */
class Absoluto extends ContextoGravador {
  pontos: Array<[string, number, number]> = [];
  private m = [1, 0, 0, 1, 0, 0];
  private pilha2: number[][] = [];
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void { super.setTransform(a, b, c, d, e, f); this.m = [a, b, c, d, e, f]; }
  private p(x: number, y: number): [number, number] { const [a, b, c, d, e, f] = this.m; return [a * x + c * y + e, b * x + d * y + f]; }
  moveTo(x: number, y: number): void { super.moveTo(x, y); const q = this.p(x, y); this.pontos.push(['M', q[0], q[1]]); }
  lineTo(x: number, y: number): void { super.lineTo(x, y); const q = this.p(x, y); this.pontos.push(['L', q[0], q[1]]); }
  bezierCurveTo(a: number, b: number, c: number, d: number, e: number, f: number): void {
    super.bezierCurveTo(a, b, c, d, e, f);
    for (const q of [[a, b], [c, d], [e, f]] as const) { const r = this.p(q[0], q[1]); this.pontos.push(['C', r[0], r[1]]); }
  }
  fillRect(x: number, y: number, w: number, h: number): void { super.fillRect(x, y, w, h); for (const q of [[x, y], [x + w, y + h]] as const) { const r = this.p(q[0], q[1]); this.pontos.push(['R', r[0], r[1]]); } }
  save(): void { super.save(); this.pilha2.push(this.m); }
  restore(): void { super.restore(); this.m = this.pilha2.pop() ?? this.m; }
}

describe('contexto do pintor: PDF em branco silencioso (regressão)', () => {
  beforeEach(() => { redefinirAvisoContexto(); });

  it('contexto sem setTransform pinta pelo modo relativo e o resultado é o mesmo do absoluto', () => {
    const els = [ret('a'), ret('b', 60, 40)];
    const matriz = escala(72 / 25.4);
    const fundo = { cor: '#fff', largura: 210, altura: 297 };
    const abs = new Absoluto();
    const rel = new ContextoPdfVetorial();
    const e1 = desenharElementos(abs, els, { matriz, fundo });
    const e2 = desenharElementos(comoRelativo(rel), els, { matriz, fundo });
    expect(e1.transformacao).toBe('absoluta');
    expect(e2.transformacao).toBe('relativa');
    expect(e2.falhas).toBe(0);
    expect(e2.itens).toBe(2);
    expect(rel.pontos.length).toBeGreaterThan(0);
    expect(rel.pontos.length).toBe(abs.pontos.length);
    rel.pontos.forEach((p, i) => {
      expect(p[0]).toBe(abs.pontos[i][0]);
      expect(p[1]).toBeCloseTo(abs.pontos[i][1], 6);
      expect(p[2]).toBeCloseTo(abs.pontos[i][2], 6);
    });
    expect(rel.pilha).toEqual([]); // save/restore equilibrados
  });

  it('contexto sem setTransform nem transform: falhas > 0, aviso único e sem lançar', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { ctx } = contextoMinimo();
    (ctx as unknown as Record<string, unknown>).setTransform = undefined;
    const e = desenharElementos(ctx, [ret('a'), ret('b')]);
    expect(e.itens).toBe(0);
    expect(e.falhas).toBeGreaterThan(0);
    expect(e.primeiraFalha).toMatch(/setTransform/);
    expect(e.transformacao).toBe('nenhuma');
    desenharElementos(ctx, [ret('a')]);
    expect(aviso).toHaveBeenCalledTimes(1);
    aviso.mockRestore();
  });

  it('exceção do contexto num item conta em falhas e os demais seguem', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = new ContextoGravador();
    let n = 0;
    const orig = ctx.stroke.bind(ctx);
    ctx.stroke = () => { if (n++ === 0) throw new Error('boom'); orig(); };
    const e = desenharElementos(ctx, [ret('a'), ret('b')]);
    expect(e.falhas).toBe(1);
    expect(e.primeiraFalha).toBe('boom');
    expect(e.itens).toBe(1);
    aviso.mockRestore();
  });

  it('opção transformacao: "relativa" força o modo relativo mesmo havendo setTransform', () => {
    const c = new ContextoGravador() as unknown as Record<string, unknown>;
    c.transform = vi.fn();
    const e = desenharElementos(c as never, [ret('a')], { transformacao: 'relativa' });
    expect(e.transformacao).toBe('relativa');
    expect(c.transform).toHaveBeenCalled();
  });

  it('entradas hostis não lançam', () => {
    expect(() => desenharElementos(null as never, null as never)).not.toThrow();
    expect(() => desenharPlano(new ContextoGravador(), null as never)).not.toThrow();
    expect(planejar(undefined as never)).toEqual([]);
    const rel = new ContextoPdfVetorial();
    expect(desenharElementos(comoRelativo(rel), [ret('a')], { matriz: { a: NaN, b: 0, c: 0, d: 1, e: 0, f: 0 } }).falhas).toBe(0);
  });

  it('adaptador: setTransform absoluto = transform(inversa(atual) · M), com save/restore', () => {
    const rel = new ContextoPdfVetorial();
    const c = adaptarContextoRelativo(comoRelativo(rel));
    c.setTransform(2, 0, 0, 2, 10, 0);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    expect(rel.ctm).toMatchObject({ a: 1, d: 1, e: 0 });
    c.restore();
    c.setTransform(2, 0, 0, 2, 10, 0);
    expect(rel.ctm.a).toBeCloseTo(2);
    expect(rel.ctm.e).toBeCloseTo(10);
    expect(() => c.setTransform(0, 0, 0, 0, 0, 0)).not.toThrow(); // matriz inválida vira identidade
  });
});

describe('diagnosticarContexto', () => {
  it('contexto completo: nada falta; sem mesclagem/filtro aparecem como opcionais', () => {
    const d = diagnosticarContexto(new ContextoGravador());
    expect(d.obrigatorios).toEqual([]);
    expect(d.opcionais).toEqual(expect.arrayContaining(['mesclagem', 'filtro']));
    expect(d.opcionais).not.toContain('gradiente');
    expect(d.transformacao).toBe('absoluta');
  });
  it('PDF vetorial (só transform relativo): serve, em modo relativo, sem gradiente', () => {
    const d = diagnosticarContexto(new ContextoPdfVetorial());
    expect(d.obrigatorios).toEqual([]);
    expect(d.transformacao).toBe('relativa');
    expect(d.opcionais).toEqual(expect.arrayContaining(['gradiente', 'mesclagem', 'filtro']));
    expect(d.opcionais).not.toContain('texto');
  });
  it('incompleto e hostil', () => {
    expect(diagnosticarContexto({ save() {} }).obrigatorios).toEqual(expect.arrayContaining(['restore', 'setTransform', 'fillStyle']));
    expect(diagnosticarContexto(null).obrigatorios.length).toBeGreaterThan(10);
    expect(diagnosticarContexto(42 as never).obrigatorios).toContain('setTransform');
  });
});

describe('texto no pintor (paridade de contexto)', () => {
  it('escreve font como "<corpo em mm>px <fonte>", base alfabética e entrelinha 1,2; o corpo vale nas unidades do transform corrente', () => {
    const c = new ContextoGravador();
    desenharElementos(c, [texto('linha 1\nlinha 2')], { matriz: escala(3) });
    const textos = c.chamadas.filter(([n]) => n === 'fillText');
    expect(textos.map((x) => x[1])).toEqual(['linha 1', 'linha 2']);
    expect(textos[0][4]).toBe('4px sans-serif');
    expect(textos[0][5]).toBe('left');
    expect(textos[1][4]).toBe(textos[0][4]);
    expect(textos[1][3] as number).toBeCloseTo(4 * 1.2);
    expect(c.textBaseline).toBe('alphabetic');
  });
  it('PDF só com fillText simples: a matriz do elemento (rotação) vai no transform, não no texto', () => {
    const t = texto('oi');
    const rel = new ContextoPdfVetorial();
    const e = desenharElementos(comoRelativo(rel), [{ ...t, transformacao: { a: 0, b: 1, c: -1, d: 0, e: 10, f: 20 } }], { matriz: escala(2) });
    expect(e.textos).toBe(1);
    expect(rel.textos[0].texto).toBe('oi');
    expect(rel.textos[0].font).toBe('4px sans-serif');
    expect(rel.textos[0].ctm.b).toBeCloseTo(2); // girado 90° e escalado 2
  });
  it('`largura` não quebra linha: só dimensiona a caixa (sem measureText a pintura é a mesma)', () => {
    const c = new ContextoGravador();
    desenharElementos(c, [texto('uma linha bem comprida sem quebra', 4, 10)]);
    expect(c.chamadas.filter(([n]) => n === 'fillText')).toHaveLength(1);
  });
});

describe('gradiente em faixas no contexto sem gradiente (item 17)', () => {
  const comGradiente = (): ElementoGrafico => criarRetangulo({
    id: 'g', aparencia: { traco: null, preenchimento: { cor: '#888', gradiente: { tipo: 'linear', de: [0, 0], ate: [1, 0], paradas: [{ posicao: 0, cor: '#000000' }, { posicao: 1, cor: '#ffffff' }] } } }
  }, { x: 0, y: 0, largura: 40, altura: 20 })!;

  it('desligado (padrão): cor sólida e contado em degradacoes', () => {
    const rel = new ContextoPdfVetorial();
    const e = desenharElementos(comoRelativo(rel), [comGradiente()]);
    expect(e.degradacoes.gradiente).toBe(1);
    expect(e.gradientesEmFaixas).toBeUndefined();
  });

  it('ligado: N faixas recortadas pela forma, cores do escuro ao claro, estatística diz que usou', () => {
    const c = new ContextoGravador();
    (c as unknown as Record<string, unknown>).createLinearGradient = undefined;
    const e = desenharElementos(c, [comGradiente()], { gradienteEmFaixas: 8 });
    expect(e.gradientesEmFaixas).toBe(1);
    expect(e.degradacoes.gradiente).toBe(0);
    const fills = c.chamadas.filter(([n]) => n === 'fill');
    expect(fills).toHaveLength(8);
    const cores = fills.map((f) => String(f[2]));
    expect(cores[0]).not.toBe(cores[7]);
    expect(c.nomes()).toContain('clip');
    expect(c.profundidade).toBe(0);
    expect(desenharElementos(new ContextoPdfVetorial() as never, [comGradiente()], { gradienteEmFaixas: true }).gradientesEmFaixas).toBe(1);
  });

  it('com gradiente nativo disponível o nativo vence; radial e entradas hostis seguem sólidos', () => {
    const nativo = new ContextoGravador();
    expect(desenharElementos(nativo, [comGradiente()], { gradienteEmFaixas: 8 }).gradientes).toBe(1);
    const radial = criarRetangulo({ id: 'r', aparencia: { traco: null, preenchimento: { cor: '#888', gradiente: { tipo: 'radial', centro: [0.5, 0.5], raio: 0.5, paradas: [{ posicao: 0, cor: '#000' }, { posicao: 1, cor: '#fff' }] } } } }, { x: 0, y: 0, largura: 10, altura: 10 })!;
    const e = desenharElementos(new ContextoPdfVetorial() as never, [radial], { gradienteEmFaixas: 8 });
    expect(e.gradientesEmFaixas).toBeUndefined();
    expect(e.degradacoes.gradiente).toBe(1);
    expect(faixasDoGradienteLinear(null)).toBeNull();
    expect(faixasDoGradienteLinear({ tipo: 'linear', de: [0, 0], ate: [0, 0], paradas: [{ posicao: 0, cor: '#000' }] })).toBeNull();
    expect(faixasDoGradienteLinear({ tipo: 'linear', de: [NaN, 0], ate: [1, 0], paradas: [{ posicao: 0, cor: '#000' }] })).toBeNull();
    expect(faixasDoGradienteLinear({ tipo: 'linear', de: [0, 0], ate: [1, 0], paradas: [{ posicao: 0, cor: '#000' }] }, 99999)!).toHaveLength(256);
    expect(faixasDoGradienteLinear({ tipo: 'linear', de: [0, 0], ate: [1, 0], paradas: [{ posicao: 0, cor: '#000' }] }, NaN)!).toHaveLength(24);
    expect(corNaPosicao([], 0.5).cor).toBe('#000000');
    expect(corNaPosicao([{ posicao: 0, cor: 'red' }, { posicao: 1, cor: 'blue' }], 0.2).cor).toBe('red');
    expect(corNaPosicao([{ posicao: 0, cor: '#000000' }, { posicao: 1, cor: '#ffffff' }], 0.5).cor).toBe('rgb(128,128,128)');
  });
});
