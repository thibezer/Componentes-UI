// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  aplicarPathfinder, areaDosPoligonos, contornoNaFolha, criarElipse, criarEstrela, criarLinha, criarRetangulo, criarTexto,
  desenharElementos, exportarSvg, normalizarElemento, planejarElemento, regiaoDoElemento, resolverAparencia, resolverSombra,
  type ElementoGrafico
} from '../src/gerencigeo-canvas/prancha';
import { areaComSinal } from '../src/gerencigeo-canvas/espaco/espaco_plano';
import { CHAVES_CONTRATO, CAPACIDADES_SONDADAS, ContextoGravador, contextoMinimo } from './prancha-contextos';

/*
 * Prancha, Fase 5 (camadas A e C): Pathfinder sobre elementos (ordem de empilhamento, aparência do de referência, caminho
 * composto com furos) e efeitos (mesclagem e sombra) com paridade tela × SVG e degradação no contexto mínimo.
 */

const preenchido = { preenchimento: { cor: '#3366cc' }, traco: null };
const ret = (id: string, x: number, y: number, w: number, h: number, ap: ElementoGrafico['aparencia'] = preenchido): ElementoGrafico =>
  criarRetangulo({ id, aparencia: ap }, { x, y, largura: w, altura: h })!;

const areaDoElemento = (el: ElementoGrafico): number => {
  const c = contornoNaFolha(el);
  if (!c || c.tipo !== 'Polygon') return 0;
  return c.aneis.reduce((s, a) => s + areaComSinal(a), 0) * Math.sign(areaComSinal(c.aneis[0]));
};

describe('Pathfinder na prancha', () => {
  const tras = ret('tras', 0, 0, 20, 20, { preenchimento: { cor: '#ff0000' } });
  const frente = ret('frente', 10, 10, 20, 20, { preenchimento: { cor: '#00ff00' } });

  it('unir: id e aparência do mais à frente, área exata, todos usados', () => {
    const r = aplicarPathfinder([tras, frente], 'uniao');
    expect('ok' in r).toBe(true);
    if (!('ok' in r)) return;
    expect(r.ok.resultado.id).toBe('frente');
    expect(r.ok.resultado.aparencia?.preenchimento?.cor).toBe('#00ff00');
    expect(r.ok.usados).toEqual(['tras', 'frente']);
    expect(r.ok.resultado.geometria.tipo).toBe('caminho');
    expect(Math.abs(areaDoElemento(r.ok.resultado))).toBeCloseTo(700, 6);
  });

  it('subtrair ("menos frente"): o de trás menos o da frente, com o id e a aparência do de trás', () => {
    const r = aplicarPathfinder([tras, frente], 'subtracao');
    if (!('ok' in r)) throw new Error(r.motivo);
    expect(r.ok.resultado.id).toBe('tras');
    expect(r.ok.resultado.aparencia?.preenchimento?.cor).toBe('#ff0000');
    expect(Math.abs(areaDoElemento(r.ok.resultado))).toBeCloseTo(300, 6);
  });

  it('interseção e excluir', () => {
    const i = aplicarPathfinder([tras, frente], 'intersecao');
    const x = aplicarPathfinder([tras, frente], 'exclusao');
    if (!('ok' in i) || !('ok' in x)) throw new Error('falhou');
    expect(Math.abs(areaDoElemento(i.ok.resultado))).toBeCloseTo(100, 6);
    const c = contornoNaFolha(x.ok.resultado);
    expect(c?.tipo === 'Polygon' && c.aneis.length).toBe(2);
  });

  it('furo: o resultado é um caminho composto preenchido por par-ímpar', () => {
    const r = aplicarPathfinder([ret('a', 0, 0, 30, 30), ret('b', 10, 10, 10, 10)], 'subtracao');
    if (!('ok' in r)) throw new Error(r.motivo);
    const c = contornoNaFolha(r.ok.resultado);
    expect(c?.tipo === 'Polygon' && c.aneis.length).toBe(2);
    expect(r.ok.resultado.aparencia?.preenchimento?.regra).toBe('evenodd');
    expect(resolverAparencia(r.ok.resultado).preenchimento?.regra).toBe('evenodd');
  });

  it('formas giradas e curvas entram pela folha (a elipse pelos vértices amostrados)', () => {
    const el = criarElipse({ id: 'e', aparencia: preenchido }, { x: 0, y: 0, largura: 20, altura: 20 })!;
    const r = aplicarPathfinder([ret('q', 10, -5, 20, 30), el], 'intersecao');
    if (!('ok' in r)) throw new Error(r.motivo);
    expect(Math.abs(areaDoElemento(r.ok.resultado))).toBeCloseTo(Math.PI * 100 / 2, 0);
  });

  it('linha, texto e máscara não entram; ficam de fora de `usados`', () => {
    const linha = criarLinha({ id: 'l' }, [0, 0], [50, 50])!;
    const texto = criarTexto({ id: 't' }, [0, 0], 'Olá', 5)!;
    const r = aplicarPathfinder([tras, linha, texto, { ...ret('m', 0, 0, 5, 5), mascara: true }, frente], 'uniao');
    if (!('ok' in r)) throw new Error(r.motivo);
    expect(r.ok.usados).toEqual(['tras', 'frente']);
    expect(regiaoDoElemento(linha)).toBeNull();
    expect(regiaoDoElemento(texto)).toBeNull();
  });

  it('recusas: seleção insuficiente, interseção vazia, subtração que apaga tudo', () => {
    expect(aplicarPathfinder([tras], 'uniao')).toEqual({ motivo: 'selecao-insuficiente' });
    expect(aplicarPathfinder([tras, ret('longe', 100, 100, 5, 5)], 'intersecao')).toEqual({ motivo: 'sem-intersecao' });
    expect(aplicarPathfinder([ret('p', 5, 5, 5, 5), ret('g', 0, 0, 30, 30)], 'subtracao')).toEqual({ motivo: 'resultado-vazio' });
  });

  it('entrada hostil não lança', () => {
    const hostis = [null, undefined, 3, 'x', [null], [{}], [{ id: 'z', geometria: { tipo: 'retangulo', largura: NaN, altura: 1 } }]];
    for (const h of hostis) expect(() => aplicarPathfinder(h as never, 'uniao')).not.toThrow();
    expect(() => aplicarPathfinder([tras, frente], 'divisao' as never)).not.toThrow();
  });

  it('estrela e polígono: área da união bate com a inclusão-exclusão', () => {
    const e1 = criarEstrela({ id: 'e1', aparencia: preenchido }, [0, 0], 10, 4, 5)!;
    const e2 = criarEstrela({ id: 'e2', aparencia: preenchido }, [5, 0], 10, 4, 5)!;
    const [u, i] = (['uniao', 'intersecao'] as const).map((op) => {
      const r = aplicarPathfinder([e1, e2], op);
      if (!('ok' in r)) throw new Error(r.motivo);
      return Math.abs(areaDoElemento(r.ok.resultado));
    });
    const a = Math.abs(areaDoElemento(e1));
    expect(u + i).toBeCloseTo(2 * a, 6);
    expect(areaDosPoligonos([])).toBe(0);
  });
});

describe('efeitos: mesclagem e sombra', () => {
  const comSombra = ret('s', 10, 10, 20, 10, { preenchimento: { cor: '#3366cc' }, traco: { cor: '#000', espessura: 1 }, sombra: { deslocamento: [2, 3], desfoque: 1.5, cor: '#000', opacidade: 0.4 }, mesclagem: 'multiplicar' });

  it('resolução: padrões, faixas e modo desconhecido', () => {
    expect(resolverSombra({})).toEqual({ dx: 1.5, dy: 1.5, desfoque: 1, cor: '#000000', opacidade: 0.5 });
    expect(resolverSombra({ opacidade: 0 })).toBeNull();
    expect(resolverSombra(null)).toBeNull();
    expect(resolverSombra({ deslocamento: [NaN, 1] as never, desfoque: -1 })?.dx).toBe(1.5);
    expect(resolverAparencia(comSombra).mesclagem).toBe('multiply');
    expect(resolverAparencia({ ...comSombra, aparencia: { mesclagem: 'normal' } }).mesclagem).toBeNull();
    expect(resolverAparencia({ ...comSombra, aparencia: { mesclagem: 'veneno' as never } }).mesclagem).toBeNull();
  });

  it('validação: modo fora da lista e sombra com números ruins são limpos', () => {
    const el = normalizarElemento({ id: 'x', geometria: { tipo: 'retangulo', largura: 5, altura: 5 }, aparencia: { mesclagem: 'veneno', sombra: { deslocamento: [Infinity, 2], desfoque: 1e9, cor: 'javascript:alert(1)', opacidade: 7 } } });
    expect(el?.aparencia?.mesclagem).toBeUndefined();
    expect(el?.aparencia?.sombra).toMatchObject({ desfoque: 100, opacidade: 1 });
    expect(el?.aparencia?.sombra?.deslocamento).toBeUndefined();
    // a cor fica como texto (como nas outras cores do modelo); quem pinta só aceita os formatos seguros
    expect(resolverSombra(el?.aparencia?.sombra)?.cor).toBe('#000000');
    const ok = normalizarElemento({ id: 'y', geometria: { tipo: 'retangulo', largura: 5, altura: 5 }, aparencia: { mesclagem: 'tela', sombra: null } });
    expect(ok?.aparencia).toEqual({ mesclagem: 'tela', sombra: null });
  });

  it('a silhueta de forma com preenchimento e traço é UMA área (contorno alargado pelo meio traço)', () => {
    const plano = planejarElemento(comSombra)!;
    expect(plano.sombra?.partes).toHaveLength(1);
    expect(plano.sombra?.partes[0].modo).toBe('encher');
    const xs = plano.sombra!.partes[0].caminho.flatMap((k) => (k.c === 'Z' ? [] : [k.p[0]]));
    expect(Math.min(...xs)).toBeCloseTo(9.5, 6);
    expect(Math.max(...xs)).toBeCloseTo(30.5, 6);
  });

  it('linha aberta: a sombra é o traço; texto: o próprio texto', () => {
    const l = criarLinha({ id: 'l', aparencia: { sombra: {} } }, [0, 0], [10, 0])!;
    expect(planejarElemento(l)?.sombra?.partes[0].modo).toBe('tracar');
    const t = criarTexto({ id: 't', aparencia: { sombra: {} } }, [0, 10], 'Oi', 5)!;
    expect(planejarElemento(t)?.sombra?.texto?.linhas).toEqual(['Oi']);
  });

  it('Canvas: sombra antes do preenchimento, deslocada, com blur em px e mesclagem', () => {
    const ctx = new ContextoGravador() as ContextoGravador & { filter: string; globalCompositeOperation: string };
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    const filtros: string[] = [];
    let modo = '';
    const fillOriginal = ctx.fill.bind(ctx);
    ctx.fill = (r?: CanvasFillRule) => { filtros.push(ctx.filter); modo = ctx.globalCompositeOperation; fillOriginal(r); };
    const est = desenharElementos(ctx, [comSombra], { matriz: { a: 4, b: 0, c: 0, d: 4, e: 0, f: 0 } });
    expect(est.sombras).toBe(1);
    expect(filtros[0]).toBe('blur(6px)'); // 1,5 mm × 4 px/mm
    expect(filtros[1]).toBe('none');
    expect(modo).toBe('multiply');
    const transf = ctx.chamadas.filter(([n]) => n === 'setTransform');
    expect(transf.some((t) => t[5] === 8 && t[6] === 12)).toBe(true); // (2, 3) mm × 4
    expect(est.degradacoes).toEqual({ gradiente: 0, texto: 0 });
  });

  it('contexto mínimo (PDF): sombra vetorial nítida, mesclagem normal, nada fora do contrato', () => {
    const { ctx, lidas, escritas, chamadas } = contextoMinimo();
    const est = desenharElementos(ctx, [comSombra]);
    expect(est.sombras).toBe(1);
    expect(est.degradacoes).toEqual({ gradiente: 0, texto: 0, mesclagem: 1, desfoque: 1 });
    expect(chamadas.filter(([n]) => n === 'fill').length).toBe(2); // sombra + preenchimento
    const sondadas = new Set([...CAPACIDADES_SONDADAS, 'globalCompositeOperation', 'filter']);
    for (const k of lidas) expect(CHAVES_CONTRATO.has(k) || sondadas.has(k)).toBe(true);
    for (const k of escritas) expect(CHAVES_CONTRATO.has(k)).toBe(true);
  });

  it('SVG: filtro de desfoque em mm, deslocamento, opacidade e mix-blend-mode', () => {
    const svg = exportarSvg([comSombra], { largura: 100, altura: 100 });
    expect(svg).toContain('<feGaussianBlur stdDeviation="1.5"/>');
    expect(svg).toContain('transform="translate(2 3)" opacity="0.4"');
    expect(svg).toContain('style="mix-blend-mode:multiply"');
    expect(svg.indexOf('feGaussianBlur')).toBeLessThan(svg.indexOf('fill="#3366cc"'));
    expect(exportarSvg([ret('n', 0, 0, 5, 5, { sombra: { desfoque: 0 } })], { largura: 10, altura: 10 })).not.toContain('<filter');
  });

  it('paridade: a mesma silhueta na tela e no SVG', () => {
    const ctx = new ContextoGravador();
    desenharElementos(ctx, [comSombra]);
    const primeiros = ctx.geometria.slice(0, 3).map((c) => c.slice(1).map((v) => Math.round(Number(v) * 1e4) / 1e4));
    const svg = exportarSvg([comSombra], { largura: 100, altura: 100 });
    const d = /<g transform="translate\(2 3\)"[^>]*><g[^>]*><path d="M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/.exec(svg)!;
    expect([Number(d[1]), Number(d[2])]).toEqual(primeiros[0]);
    expect([Number(d[3]), Number(d[4])]).toEqual(primeiros[1]);
  });
});
