// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { dashTipoLinha } from '../src/gerencigeo-canvas/motor/tipos-linha';
import { parseDash } from '../src/gerencigeo-canvas/renderers/renderizador_formas';
import { compor, escala, rotacao, translacao } from '../src/gerencigeo-canvas/espaco/espaco_matriz';
import {
  MM_POR_PX, corComOpacidade, padraoTipoLinhaMm, resolverAparencia
} from '../src/gerencigeo-canvas/prancha/aparencia_estilo';
import { MAX_LINHAS_HACHURA, comprimentoDaPonta, direcaoNaPonta, geometriaDaPonta, linhasDeHachura } from '../src/gerencigeo-canvas/prancha/pintura_formas';
import { caminhoDoContorno, fonteSegura, planejarElemento, planejarElementos } from '../src/gerencigeo-canvas/prancha/pintura_plano';
import { desenharElementos, type ContextoPrancha2D } from '../src/gerencigeo-canvas/prancha/pintura_canvas';
import { caminhoParaSvg, exportarSvg } from '../src/gerencigeo-canvas/prancha/exportar_svg';
import { criarCaminho, criarElipse, criarLinha, criarRetangulo, criarTexto } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { gerarPredefinicao } from '../src/gerencigeo-canvas/prancha/elemento_predefinicoes';
import { transformarElemento } from '../src/gerencigeo-canvas/prancha/elemento_transformacao';
import { contornoNaFolha } from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import type { Par } from '../src/gerencigeo-canvas/feature_types';
import { CAPACIDADES_SONDADAS, CHAVES_CONTRATO, ContextoGravador, contextoMinimo, type Chamada } from './prancha-contextos';

/*
 * Fase 2 da prancha: aparência, pintor e SVG. Camada A (dados e chamadas gravadas), D (contrato do contexto, tipos) e
 * paridade tela × exportação: o mesmo plano dá os mesmos caminhos no contexto completo, no mínimo (PDF) e no SVG.
 */

// o Canvas 2D real tem de servir como ContextoPrancha2D (checado pelo tsc)
export const canvasRealServe = (c: CanvasRenderingContext2D): ContextoPrancha2D => c;

const amostra = (): ElementoGrafico[] => [
  criarRetangulo({ id: 'ret', aparencia: { preenchimento: { cor: '#ff0000' }, traco: { espessura: 0.5, cor: '#000080' } } }, { x: 10, y: 10, largura: 40, altura: 20 }, 3)!,
  criarElipse({ id: 'eli', aparencia: { preenchimento: { cor: '#00ff00', gradiente: { tipo: 'linear', de: [0, 0], ate: [1, 0], paradas: [{ posicao: 0, cor: '#ffffff' }, { posicao: 1, cor: '#0000ff', opacidade: 0.5 }] } } } }, { x: 60, y: 10, largura: 30, altura: 20 })!,
  { ...criarRetangulo({ id: 'hac', aparencia: { hachura: { angulo: 45, espacamento: 2 } } }, { x: 10, y: 40, largura: 30, altura: 30 })!, ordem: 5 },
  ...gerarPredefinicao('seta-dupla', { x: 50, y: 50, largura: 40, altura: 0 }, { id: 'seta', estiloTraco: 'tracejado' }),
  criarTexto({ id: 'txt' }, [10, 90], 'Planta\nEscala 1:100', 4)!
];

describe('aparência resolvida (fonte única de estilo)', () => {
  it('padrões de prancha: traço preto 0,25 mm, ponta reta, junção angular, limite 4; sem preenchimento', () => {
    const r = resolverAparencia(criarRetangulo({ id: 'a' }, { x: 0, y: 0, largura: 1, altura: 1 })!);
    expect(r.traco).toMatchObject({ cor: '#000000', largura: 0.25, terminacao: 'butt', juncao: 'miter', limitePonta: 4, tracejado: [], alinhamento: 'centro' });
    expect(r.preenchimento).toBeNull();
    expect(r.opacidade).toBe(1);
  });

  it('texto: preenchido de preto e sem traço por padrão', () => {
    const r = resolverAparencia(criarTexto({ id: 't' }, [0, 0], 'x', 3)!);
    expect(r.traco).toBeNull();
    expect(r.preenchimento?.cor).toBe('#000000');
  });

  it('tracejado em mm reaproveita o padrão CAD do mapa (px a 96 dpi → mm)', () => {
    const esperado = parseDash(dashTipoLinha('tracejada', 0.35 / MM_POR_PX, 1, 'butt')).map((v) => v * MM_POR_PX);
    padraoTipoLinhaMm('tracejada', 0.35).forEach((v, i) => expect(v).toBeCloseTo(esperado[i], 3));
    expect(padraoTipoLinhaMm('tracejada', 0.35)[0]).toBeCloseTo(12 * MM_POR_PX, 3);
    expect(padraoTipoLinhaMm('continua', 0.35)).toEqual([]);
    const r = resolverAparencia(criarLinha({ id: 'l', aparencia: { traco: { tipoLinha: 'traco-ponto', espessura: 0.5 } } }, [0, 0], [10, 0])!);
    expect(r.traco!.tracejado).toEqual(padraoTipoLinhaMm('traco-ponto', 0.5));
  });

  it('pontas de seta só em formas abertas; alinhamento dentro/fora só em fechadas; hachura gira com o elemento', () => {
    const fechado = resolverAparencia(criarRetangulo({ id: 'r', aparencia: { traco: { pontaFim: { estilo: 'triangulo' }, alinhamento: 'dentro' } } }, { x: 0, y: 0, largura: 1, altura: 1 })!);
    expect(fechado.traco!.pontaFim).toBeUndefined();
    expect(fechado.traco!.alinhamento).toBe('dentro');
    const aberto = resolverAparencia(criarLinha({ id: 'l', aparencia: { traco: { pontaFim: { estilo: 'triangulo' }, alinhamento: 'fora' } } }, [0, 0], [1, 0])!);
    expect(aberto.traco!.pontaFim).toEqual({ estilo: 'triangulo' });
    expect(aberto.traco!.alinhamento).toBe('centro');
    const girado = transformarElemento(criarRetangulo({ id: 'h', aparencia: { hachura: { angulo: 0 } } }, { x: 0, y: 0, largura: 1, altura: 1 })!, rotacao(Math.PI / 6));
    expect(resolverAparencia(girado).hachura!.angulo).toBeCloseTo(Math.PI / 6, 12);
  });

  it('gradiente: degradação para a parada mais perto do meio (ou a cor da forma, se houver)', () => {
    const sem = resolverAparencia(criarRetangulo({ id: 'g', aparencia: { preenchimento: { gradiente: { tipo: 'linear', de: [0, 0], ate: [1, 0], paradas: [{ posicao: 0, cor: '#111111' }, { posicao: 0.6, cor: '#222222' }, { posicao: 1, cor: '#333333' }] } } } }, { x: 0, y: 0, largura: 1, altura: 1 })!);
    expect(sem.preenchimento!.cor).toBe('#222222');
    const com = resolverAparencia(criarRetangulo({ id: 'g', aparencia: { preenchimento: { cor: '#abcdef', gradiente: { tipo: 'radial', centro: [0.5, 0.5], raio: 0.5, paradas: [{ posicao: 0, cor: '#000' }] } } } }, { x: 0, y: 0, largura: 1, altura: 1 })!);
    expect(com.preenchimento!.cor).toBe('#abcdef');
  });

  it('cor com opacidade para as paradas do Canvas', () => {
    expect(corComOpacidade('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)');
    expect(corComOpacidade('#f00', 1)).toBe('#f00');
    expect(corComOpacidade('#ff000080', 0.5)).toBe('rgba(255,0,0,0.251)');
    expect(corComOpacidade('red', 0.5)).toBe('red');
  });
});

describe('pontas de seta e hachura', () => {
  it('comprimento: 5× a espessura com mínimo de 2 mm, vezes a escala', () => {
    expect(comprimentoDaPonta(0.25)).toBe(2);
    expect(comprimentoDaPonta(1)).toBe(5);
    expect(comprimentoDaPonta(1, 2)).toBe(10);
    expect(comprimentoDaPonta(NaN, NaN)).toBe(2);
  });

  it('cada estilo tem bico no ponto, direção certa e recuo', () => {
    const t = geometriaDaPonta({ estilo: 'triangulo' }, [10, 0], [1, 0], 0.25)!;
    expect(t.pontos).toEqual([[10, 0], [8, 0.8], [8, -0.8]]);
    expect(t).toMatchObject({ fechada: true, preenchida: true, recuo: 1 });
    for (const estilo of ['triangulo-aberto', 'aberta', 'circulo', 'quadrado', 'losango', 'barra'] as const) {
      const g = geometriaDaPonta({ estilo }, [0, 0], [0, 5], 0.5);
      expect(g, estilo).not.toBeNull();
      expect(g!.pontos.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    }
    expect(geometriaDaPonta({ estilo: 'triangulo' }, [0, 0], [0, 0], 1)).toBeNull();
    expect(geometriaDaPonta({ estilo: 'foguete' as never }, [0, 0], [1, 0], 1)).toBeNull();
  });

  it('direção na ponta ignora vértices repetidos', () => {
    expect(direcaoNaPonta([[0, 0], [5, 0], [5, 0]], true)).toEqual([5, 0]);
    expect(direcaoNaPonta([[1, 1], [1, 1]], false)).toBeNull();
  });

  it('hachura cobre a caixa com o espaçamento pedido e é limitada contra espaçamento minúsculo', () => {
    const l = linhasDeHachura(0, 0, 10, 10, 0, 2);
    expect(l.map(([a]) => a[1])).toEqual([0, 2, 4, 6, 8, 10]);
    expect(linhasDeHachura(0, 0, 1000, 1000, 0.3, 1e-6).length).toBeLessThanOrEqual(MAX_LINHAS_HACHURA + 1);
    expect(linhasDeHachura(0, 0, NaN, 1, 0, 1)).toEqual([]);
  });
});

describe('pintor Canvas (contexto falso que grava as chamadas)', () => {
  it('retângulo arredondado: caminho Bézier, preenchimento e traço com o estilo resolvido', () => {
    const ctx = new ContextoGravador();
    const est = desenharElementos(ctx, [amostra()[0]]);
    expect(est).toMatchObject({ itens: 1, preenchimentos: 1, tracos: 1 });
    const nomes = ctx.nomes();
    expect(nomes.filter((n) => n === 'bezierCurveTo')).toHaveLength(8); // 4 cantos × (preenchimento + traço)
    expect(ctx.chamadas.find(([n]) => n === 'fill')).toEqual(['fill', undefined, '#ff0000', 1]);
    expect(ctx.chamadas.find(([n]) => n === 'stroke')).toEqual(['stroke', '#000080', 0.5, 1]);
    expect(ctx.profundidade).toBe(0);
  });

  it('ordem de pintura = empilhamento; ocultos não pintam; matriz da vista vai no setTransform', () => {
    const els = amostra();
    const ctx = new ContextoGravador();
    const v = compor(escala(4), translacao(100, 50));
    desenharElementos(ctx, [...els, { ...els[0], id: 'oculto', oculto: true }], { matriz: v });
    const ordem = planejarElementos(els).map((p) => p.id);
    expect(ordem[ordem.length - 1]).toBe('hac');
    expect(ordem).not.toContain('oculto');
    expect(ctx.chamadas.find(([n]) => n === 'setTransform')).toEqual(['setTransform', 4, 0, 0, 4, 100, 50]);
  });

  it('gradiente: definido na caixa unitária e pintado com setTransform(vista · quadro)', () => {
    const ctx = new ContextoGravador();
    const est = desenharElementos(ctx, [amostra()[1]]);
    expect(est.gradientes).toBe(1);
    expect(ctx.gradientes[0]).toMatchObject({ tipo: 'linear', args: [0, 0, 1, 0], paradas: [[0, '#ffffff'], [1, 'rgba(0,0,255,0.5)']] });
    const i = ctx.chamadas.findIndex(([n]) => n === 'fill');
    expect(ctx.chamadas[i - 1]).toEqual(['setTransform', 30, 0, 0, 20, 60, 10]);
  });

  it('hachura: recorte pela forma, linhas vetoriais, contexto restaurado', () => {
    const ctx = new ContextoGravador();
    const est = desenharElementos(ctx, [amostra()[2]]);
    expect(est.hachuras).toBe(1);
    expect(ctx.nomes()).toContain('clip');
    expect(ctx.nomes().filter((n) => n === 'save')).toHaveLength(ctx.nomes().filter((n) => n === 'restore').length);
  });

  it('seta dupla tracejada: linha recuada, duas pontas cheias, tracejado em mm', () => {
    const ctx = new ContextoGravador();
    const est = desenharElementos(ctx, gerarPredefinicao('seta-dupla', { x: 0, y: 0, largura: 40, altura: 0 }, { estiloTraco: 'tracejado', espessura: 0.35 }));
    expect(est.pontas).toBe(2);
    const [m, l] = ctx.geometria;
    expect(m[1]).toBeCloseTo(1, 9); // recuo = metade de 2 mm
    expect(l[1]).toBeCloseTo(39, 9);
    expect(ctx.chamadas.find(([n]) => n === 'setLineDash')![1]).toEqual(padraoTipoLinhaMm('tracejada', 0.35));
  });

  it('texto: fillText por linha, fonte em mm locais, transformação do elemento', () => {
    const ctx = new ContextoGravador();
    desenharElementos(ctx, [transformarElemento(amostra()[4], rotacao(Math.PI / 2, [10, 90]))]);
    const textos = ctx.chamadas.filter(([n]) => n === 'fillText');
    expect(textos.map((t) => t[1])).toEqual(['Planta', 'Escala 1:100']);
    expect(textos[1][3]).toBeCloseTo(4.8, 9);
    expect(textos[0][4]).toBe('4px sans-serif');
  });

  it('traço dentro/fora: contorno deslocado meia espessura (reaproveita o buffer do kit)', () => {
    const base = { x: 0, y: 0, largura: 20, altura: 10 };
    const ctxD = new ContextoGravador();
    desenharElementos(ctxD, [criarRetangulo({ id: 'd', aparencia: { traco: { espessura: 2, alinhamento: 'dentro' } } }, base)!]);
    const xs = ctxD.geometria.filter(([n]) => n !== 'closePath').map((c) => c[1] as number);
    expect(Math.min(...xs)).toBeCloseTo(1, 6);
    const ctxF = new ContextoGravador();
    desenharElementos(ctxF, [criarRetangulo({ id: 'f', aparencia: { traco: { espessura: 2, alinhamento: 'fora' } } }, base)!]);
    expect(Math.min(...ctxF.geometria.filter(([n]) => n !== 'closePath').map((c) => c[1] as number))).toBeCloseTo(-1, 6);
  });

  it('fundo da folha e regra evenodd em caminho com furo', () => {
    const ctx = new ContextoGravador();
    const furado = criarCaminho({ id: 'f', aparencia: { preenchimento: { cor: '#000' } } }, { tipo: 'Polygon', aneis: [[[0, 0], [10, 0], [10, 10], [0, 10]], [[3, 3], [6, 3], [6, 6], [3, 6]]] })!;
    desenharElementos(ctx, [furado], { fundo: { cor: '#fff', largura: 210, altura: 297 } });
    expect(ctx.chamadas.find(([n]) => n === 'fillRect')).toEqual(['fillRect', 0, 0, 210, 297, '#fff']);
    expect(ctx.chamadas.find(([n]) => n === 'fill')![1]).toBe('evenodd');
  });
});

describe('contrato mínimo (estilo PDF vetorial) e paridade', () => {
  it('o pintor só usa o contrato; gradiente e texto degradam sem erro', () => {
    const { ctx, lidas, escritas } = contextoMinimo();
    const est = desenharElementos(ctx, amostra());
    expect(est.degradacoes).toEqual({ gradiente: 1, texto: 1 });
    for (const k of lidas) expect(CHAVES_CONTRATO.has(k) || CAPACIDADES_SONDADAS.has(k), `leu ${k}`).toBe(true);
    for (const k of escritas) expect(CHAVES_CONTRATO.has(k), `escreveu ${k}`).toBe(true);
  });

  it('a mesma geometria no contexto completo e no mínimo (tela × PDF)', () => {
    const els = amostra().filter((e) => e.geometria.tipo !== 'texto');
    const cheio = new ContextoGravador();
    desenharElementos(cheio, els);
    const minimo = contextoMinimo();
    desenharElementos(minimo.ctx, els);
    const geo = (cs: Chamada[]) => cs.filter(([n]) => ['moveTo', 'lineTo', 'bezierCurveTo', 'closePath'].includes(n));
    expect(geo(minimo.chamadas)).toEqual(cheio.geometria);
  });

  it('o SVG tem exatamente os caminhos do plano (mesma fonte)', () => {
    const els = amostra();
    const svg = exportarSvg(els, { largura: 210, altura: 297 });
    const f = (n: number) => { const v = Math.round(n * 1e4) / 1e4; return v === 0 ? '0' : String(v); };
    for (const it of planejarElementos(els)) {
      if (it.traco) expect(svg).toContain(`d="${caminhoParaSvg(it.traco.caminho, f)}"`);
      if (it.preenchimento) expect(svg).toContain(`d="${caminhoParaSvg(it.preenchimento.caminho, f)}"`);
    }
  });
});

describe('exportação SVG', () => {
  it('folha em mm, defs de gradiente e recorte, texto em tspans, opacidade de grupo', () => {
    const els = [...amostra(), criarRetangulo({ id: 'meio', aparencia: { opacidade: 0.5 } }, { x: 0, y: 0, largura: 5, altura: 5 })!];
    const svg = exportarSvg(els, { largura: 210, altura: 297, fundo: '#ffffff', titulo: 'Prancha 1' });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">')).toBe(true);
    expect(svg).toContain('<title>Prancha 1</title>');
    expect(svg).toMatch(/<linearGradient id="pr-g\d+" gradientUnits="userSpaceOnUse" gradientTransform="matrix\(30 0 0 20 60 10\)"/);
    expect(svg).toContain('stop-opacity="0.5"');
    expect(svg).toMatch(/<clipPath id="pr-c\d+">/);
    expect(svg).toContain('<tspan x="0" y="4.8">Escala 1:100</tspan>');
    expect(svg).toContain('<g data-id="meio" opacity="0.5">');
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('saneado: texto, cor, fonte e id hostis não injetam marcação', () => {
    const hostil: ElementoGrafico[] = [
      { ...criarTexto({ id: '"><script>alert(1)</script>' }, [0, 10], '</text><script>x()</script>', 5)!, aparencia: { preenchimento: { cor: 'red" onload="alert(1)' } } },
      { ...criarTexto({ id: 't2' }, [0, 20], 'ok', 5)!, geometria: { tipo: 'texto', texto: 'ok', tamanho: 5, fonte: 'Arial"; onload="x' } },
      criarRetangulo({ id: 'r', aparencia: { traco: { cor: 'url(javascript:alert(1))' } } }, { x: 0, y: 0, largura: 1, altura: 1 })!
    ];
    const svg = exportarSvg(hostil, { largura: 10, altura: 10, titulo: '<b>x</b>' });
    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('onload=');
    expect(svg).not.toContain('javascript:');
    expect(svg).toContain('&lt;/text&gt;&lt;script&gt;');
    expect(svg).toContain('font-family="sans-serif"');
    expect(fonteSegura('Times New Roman, serif')).toBe('Times New Roman, serif');
  });

  it('determinístico e com opções inválidas tratadas', () => {
    const els = amostra();
    expect(exportarSvg(els, { largura: 100, altura: 100 })).toBe(exportarSvg(els, { largura: 100, altura: 100 }));
    expect(exportarSvg([], { largura: NaN, altura: -1, casas: 99 })).toBe('<svg xmlns="http://www.w3.org/2000/svg" width="1mm" height="1mm" viewBox="0 0 1 1"></svg>');
  });
});

describe('plano de pintura', () => {
  it('caminho do contorno: Bézier quando há curva, poligonal com Z por anel', () => {
    const el = criarElipse({ id: 'e' }, { x: 0, y: 0, largura: 2, altura: 2 })!;
    const cam = caminhoDoContorno(contornoNaFolha(el)!);
    expect(cam.map((k) => k.c)).toEqual(['M', 'C', 'C', 'C', 'C', 'Z']);
    const linha = caminhoDoContorno(contornoNaFolha(criarLinha({ id: 'l' }, [0, 0], [1, 1])!)!);
    expect(linha).toEqual([{ c: 'M', p: [0, 0] }, { c: 'L', p: [1, 1] }]);
  });

  it('elemento degenerado ou oculto não gera plano; o plano fica em cache pelo objeto', () => {
    expect(planejarElemento({ id: 'x', geometria: { tipo: 'retangulo', largura: 0, altura: 1 } })).toBeNull();
    expect(planejarElemento({ ...criarRetangulo({ id: 'o' }, { x: 0, y: 0, largura: 1, altura: 1 })!, oculto: true })).toBeNull();
    const el = amostra()[0];
    expect(planejarElementos([el])[0]).toBe(planejarElementos([el])[0]);
    const p: Par[] = [];
    expect(p).toEqual([]);
  });
});
