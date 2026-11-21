import { describe, expect, it } from 'vitest';
import {
  limitesNaFolha, ajustarAparenciaEmLote, ajustarElementosACaixa, caixaDoQuadro, caixaDoQuadroAbnt, criarLinha, criarRetangulo, criarTexto, envelopeVisual,
  ESTILO_DO_TIPO_LINHA, gerarPredefinicao, ITENS_PREDEFINICOES, normalizarParaOrigem, planejarElementos, PREDEFINICOES, resumirAparencia,
  ROTULOS_PREDEFINICOES, TIPO_LINHA_DO_ESTILO, transformarElementos, translacao, aparenciaDe,
  type CaixaMm, type Caminho, type ElementoGrafico
} from '../src/prancha';

const ret = (id: string, ap: ElementoGrafico['aparencia'] = {}, caixa: CaixaMm = { x: 10, y: 10, largura: 40, altura: 20 }): ElementoGrafico =>
  criarRetangulo({ id, aparencia: ap }, caixa)!;

/** Todos os pontos que o pintor usa para os elementos (incluindo controles de Bézier e a sombra deslocada). */
function pontosPlanejados(els: ElementoGrafico[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const cam = (c: Caminho, dx = 0, dy = 0): void => {
    for (const k of c) {
      if (k.c === 'Z') continue;
      out.push([k.p[0] + dx, k.p[1] + dy]);
      if (k.c === 'C') { out.push([k.c1[0] + dx, k.c1[1] + dy], [k.c2[0] + dx, k.c2[1] + dy]); }
    }
  };
  for (const it of planejarElementos(els)) {
    if (it.preenchimento) cam(it.preenchimento.caminho);
    if (it.traco) cam(it.traco.caminho);
    for (const p of it.pontas) cam(p.caminho);
    if (it.sombra) for (const p of it.sombra.partes) cam(p.caminho, it.sombra.dx, it.sombra.dy);
  }
  return out;
}

function dentro(env: CaixaMm, p: [number, number], eps = 1e-9): boolean {
  return p[0] >= env.x - eps && p[0] <= env.x + env.largura + eps && p[1] >= env.y - eps && p[1] <= env.y + env.altura + eps;
}

describe('envelopeVisual', () => {
  it('contém todo ponto planejado e é maior que a geometria quando há traço grosso', () => {
    const el = ret('a', { traco: { cor: '#000', espessura: 4 } });
    const env = envelopeVisual(el)!;
    pontosPlanejados([el]).forEach((p) => expect(dentro(env, p)).toBe(true));
    expect(env.x).toBeCloseTo(8); // 10 - 2 (meia espessura; cantos retos, ratio √2 só nos vértices)
    expect(env.largura).toBeGreaterThanOrEqual(44);
  });

  it('seta dupla grossa: as pontas não ultrapassam o envelope', () => {
    const [seta] = gerarPredefinicao('seta-dupla', { x: 10, y: 10, largura: 60, altura: 0 }, { espessura: 2, ponta: { estilo: 'triangulo', escala: 3 } });
    const env = envelopeVisual(seta)!;
    pontosPlanejados([seta]).forEach((p) => expect(dentro(env, p)).toBe(true));
    // a ponta é mais alta que a linha: o envelope é mais alto que a espessura
    expect(env.altura).toBeGreaterThan(2);
  });

  it('junção angular em ângulo agudo projeta além da meia espessura (até o limite)', () => {
    const agudo = criarRetangulo({ id: 'x' }, { x: 0, y: 0, largura: 10, altura: 10 })!;
    const el: ElementoGrafico = {
      ...agudo,
      geometria: { tipo: 'caminho', geometria: { tipo: 'Polygon', aneis: [[[-20, 0], [20, -2], [20, 2]]] } },
      transformacao: translacao(30, 30),
      aparencia: { traco: { espessura: 2, juncao: 'angular', limitePonta: 30 }, preenchimento: null }
    };
    const env = envelopeVisual(el)!;
    const geometriaX0 = 10; // vértice mais à esquerda na folha
    expect(geometriaX0 - env.x).toBeGreaterThan(5); // bem mais que a meia espessura (1)
    pontosPlanejados([el]).forEach((p) => expect(dentro(env, p)).toBe(true));
    const chanfrado = envelopeVisual({ ...el, aparencia: { traco: { espessura: 2, juncao: 'chanfrada' }, preenchimento: null } })!;
    expect(chanfrado.x).toBeGreaterThan(env.x);
  });

  it('sombra com desfoque entra no envelope; sem sombra (opção) sai', () => {
    const el = ret('s', { traco: { espessura: 0.5 }, sombra: { deslocamento: [3, 4], desfoque: 2, opacidade: 0.5 } });
    const com = envelopeVisual(el)!;
    const sem = envelopeVisual(el, { sombra: false })!;
    expect(com.x + com.largura).toBeGreaterThan(sem.x + sem.largura + 3);
    expect(com.y + com.altura).toBeGreaterThan(sem.y + sem.altura + 4);
    pontosPlanejados([el]).forEach((p) => expect(dentro(com, p)).toBe(true));
  });

  it('traço "fora" estende o envelope pela espessura inteira; "dentro" não passa da forma', () => {
    const fora = envelopeVisual(ret('f', { traco: { espessura: 4, alinhamento: 'fora' } }))!;
    const dentroEnv = envelopeVisual(ret('d', { traco: { espessura: 4, alinhamento: 'dentro' } }))!;
    expect(10 - fora.x).toBeGreaterThanOrEqual(4 - 1e-6);
    expect(dentroEnv.x).toBeGreaterThanOrEqual(10 - 1e-6 - 2 * 1.5); // não passa de meia espessura × alcance da junção
    pontosPlanejados([ret('f', { traco: { espessura: 4, alinhamento: 'fora' } })]).forEach((p) => expect(dentro(fora, p)).toBe(true));
  });

  it('texto girado: o envelope cobre a caixa girada do texto', () => {
    const t = criarTexto({ id: 't', aparencia: { preenchimento: { cor: '#000' } } }, [50, 50], 'Planta baixa', 5)!;
    const girado: ElementoGrafico = { ...t, transformacao: { a: 0, b: 1, c: -1, d: 0, e: 50, f: 50 } };
    const env = envelopeVisual(girado)!;
    const reto = envelopeVisual(t)!;
    expect(env.altura).toBeGreaterThan(env.largura); // girado 90°: mais alto que largo
    expect(reto.largura).toBeGreaterThan(reto.altura);
  });

  it('vários elementos: união; ocultos, máscaras e camadas ocultas não contam', () => {
    const a = ret('a', {}, { x: 0, y: 0, largura: 10, altura: 10 });
    const b = ret('b', {}, { x: 100, y: 100, largura: 10, altura: 10 });
    const env = envelopeVisual([a, b])!;
    expect(env.x + env.largura).toBeGreaterThan(110);
    expect(envelopeVisual([a, { ...b, oculto: true }])!.x + envelopeVisual([a, { ...b, oculto: true }])!.largura).toBeLessThan(20);
    expect(envelopeVisual([{ ...b, mascara: true }])).toBeNull();
    expect(envelopeVisual([{ ...b, camadaId: 'k' }], { camadas: [{ id: 'k', visivel: false }] })).toBeNull();
  });

  it('entrada hostil devolve null sem lançar', () => {
    expect(envelopeVisual(null)).toBeNull();
    expect(envelopeVisual(undefined)).toBeNull();
    expect(envelopeVisual([])).toBeNull();
    expect(envelopeVisual([null, 3, 'x'] as never)).toBeNull();
    expect(envelopeVisual({ id: 'z', geometria: { tipo: 'retangulo', largura: NaN, altura: 1 } } as never)).toBeNull();
    expect(envelopeVisual({ id: 'y' } as never)).toBeNull();
  });
});

describe('ajustarElementosACaixa e normalizarParaOrigem', () => {
  const orig: CaixaMm = { x: 0, y: 0, largura: 40, altura: 20 };

  it('traço (espessura, tracejado, pontas) não muda com escala não uniforme', () => {
    const el = ret('a', { traco: { espessura: 1.2, tipoLinha: 'tracejada' } }, orig);
    const [out] = ajustarElementosACaixa([el], orig, { x: 5, y: 5, largura: 160, altura: 10 });
    const antes = planejarElementos([el])[0].traco!;
    const depois = planejarElementos([out])[0].traco!;
    expect(depois.largura).toBe(antes.largura);
    expect(depois.tracejado).toEqual(antes.tracejado);
    const env = envelopeVisual(out)!;
    expect(env.largura).toBeGreaterThan(160);
    const [seta] = gerarPredefinicao('seta', { x: 0, y: 0, largura: 40, altura: 0 });
    const [s2] = ajustarElementosACaixa([seta], { x: 0, y: 0, largura: 40, altura: 1 }, { x: 0, y: 0, largura: 400, altura: 1 });
    expect(planejarElementos([s2])[0].traco!.largura).toBe(planejarElementos([seta])[0].traco!.largura);
    expect(aparenciaDe(s2).traco!.pontaFim).toEqual(aparenciaDe(seta).traco!.pontaFim);
  });

  it('bloqueados: ajustados por padrão; respeitados com incluirBloqueados: false (ao contrário de transformarElementos)', () => {
    const b = { ...ret('b', {}, orig), bloqueado: true };
    const dest: CaixaMm = { x: 0, y: 0, largura: 80, altura: 40 };
    expect(ajustarElementosACaixa([b], orig, dest)[0]).not.toBe(b);
    expect(ajustarElementosACaixa([b], orig, dest, { incluirBloqueados: false })[0]).toBe(b);
    expect(transformarElementos([b], translacao(5, 5))[0]).toBe(b);
  });

  it('manterProporcao centraliza e usa a menor escala', () => {
    const el = ret('a', {}, orig);
    const [o] = ajustarElementosACaixa([el], orig, { x: 0, y: 0, largura: 100, altura: 20 }, { manterProporcao: true });
    const l = o.transformacao!;
    expect(l.a).toBeCloseTo(1);
    expect(l.d).toBeCloseTo(1);
    expect(l.e).toBeCloseTo(20 + 30); // centro x: 50 (100/2); a geometria é centrada na origem local → centro original 20, deslocado 30
  });

  it('texto: distorcer (padrão) estica; tamanho não distorce; nao só muda de lugar', () => {
    const t = criarTexto({ id: 't', aparencia: { preenchimento: { cor: '#000' } } }, [20, 10], 'abc', 4)!;
    const dest: CaixaMm = { x: 0, y: 0, largura: 80, altura: 20 };
    const d = ajustarElementosACaixa([t], orig, dest)[0].transformacao!;
    expect(d.a).toBeCloseTo(2);
    const tam = ajustarElementosACaixa([t], orig, dest, { escalarTexto: 'tamanho' })[0].transformacao!;
    expect(tam.a).toBeCloseTo(tam.d);
    expect(tam.a).toBeCloseTo(Math.sqrt(2));
    const nao = ajustarElementosACaixa([t], orig, dest, { escalarTexto: 'nao' })[0].transformacao!;
    expect(nao.a).toBeCloseTo(1);
    expect(nao.d).toBeCloseTo(1);
  });

  it('ida e volta é aproximadamente idempotente', () => {
    const el = ret('a', { traco: { espessura: 0.5 } }, orig);
    const dest: CaixaMm = { x: 7, y: 3, largura: 123, altura: 11 };
    const volta = ajustarElementosACaixa(ajustarElementosACaixa([el], orig, dest), dest, orig)[0].transformacao!;
    const base = el.transformacao!;
    (['a', 'b', 'c', 'd', 'e', 'f'] as const).forEach((k) => expect(volta[k]).toBeCloseTo(base[k], 9));
  });

  it('caixa inválida ou degenerada recusa (cópia sem alteração) e não lança', () => {
    const el = ret('a', {}, orig);
    for (const ruim of [{ x: 0, y: 0, largura: 0, altura: 10 }, { x: NaN, y: 0, largura: 1, altura: 1 }, null as never]) {
      expect(ajustarElementosACaixa([el], ruim, orig)[0]).toBe(el);
      expect(ajustarElementosACaixa([el], orig, ruim)[0]).toBe(el);
    }
    expect(ajustarElementosACaixa(null as never, orig, orig)).toEqual([]);
  });

  it('normalizarParaOrigem leva o envelope visual a (0, 0); com minimo centra', () => {
    const el = ret('a', { traco: { espessura: 2 } }, { x: 30, y: 40, largura: 10, altura: 10 });
    const { elementos, caixa } = normalizarParaOrigem([el]);
    const env = envelopeVisual(elementos)!;
    expect(env.x).toBeCloseTo(0);
    expect(env.y).toBeCloseTo(0);
    expect(caixa.largura).toBeCloseTo(env.largura, 9);
    expect(caixa.altura).toBeCloseTo(env.altura, 9);
    const m = normalizarParaOrigem([{ ...el, bloqueado: true }], { minimo: 50 });
    expect(m.caixa.largura).toBe(50);
    const e2 = envelopeVisual(m.elementos)!;
    expect(e2.x + e2.largura / 2).toBeCloseTo(25);
    expect(normalizarParaOrigem([], { minimo: 5 }).caixa).toEqual({ x: 0, y: 0, largura: 5, altura: 5 });
    expect(normalizarParaOrigem(null as never).elementos).toEqual([]);
  });
});

describe('aparência em lote e resumo', () => {
  const dupla = (): ElementoGrafico[] => gerarPredefinicao('moldura-dupla', { x: 0, y: 0, largura: 100, altura: 60 }, { espessura: 0.5, espessuraInterna: 1 });

  it('proporcional mantém a razão entre as linhas da moldura dupla', () => {
    const [e, i] = ajustarAparenciaEmLote(dupla(), { espessura: 2 }, { espessura: 'proporcional' });
    const a = aparenciaDe(e).traco!.largura;
    const b = aparenciaDe(i).traco!.largura;
    expect(a).toBeCloseTo(2);
    expect(b / a).toBeCloseTo(2); // razão original 1 / 0,5
    const [x, y] = ajustarAparenciaEmLote(dupla(), { espessura: 2 });
    expect(aparenciaDe(x).traco!.largura).toBe(2);
    expect(aparenciaDe(y).traco!.largura).toBe(2);
  });

  it('semTraco vira traco null; sem traço → com traço cria; só formas fechadas ganham preenchimento', () => {
    const sem = ajustarAparenciaEmLote([ret('a')], { semTraco: true })[0];
    expect(sem.aparencia!.traco).toBeNull();
    const com = ajustarAparenciaEmLote([sem], { corTraco: '#f00', espessura: 1 })[0];
    expect(com.aparencia!.traco).toMatchObject({ cor: '#f00', espessura: 1 });
    const linha = criarLinha({ id: 'l' }, [0, 0], [10, 0])!;
    const [l2, r2] = ajustarAparenciaEmLote([linha, ret('r')], { corPreenchimento: '#0f0', opacidadePreenchimento: 0.4 });
    expect(l2.aparencia?.preenchimento ?? null).toBeNull();
    expect(r2.aparencia!.preenchimento).toEqual({ cor: '#0f0', opacidade: 0.4 });
    const nenhum = ajustarAparenciaEmLote([r2], { semPreenchimento: true, corPreenchimento: '#fff' })[0];
    expect(nenhum.aparencia!.preenchimento).toBeNull();
  });

  it('máscaras ficam intactas; elementos sem mudança mantêm a referência; estilo vira tipoLinha', () => {
    const m = { ...ret('m'), mascara: true };
    expect(ajustarAparenciaEmLote([m], { corTraco: '#f00' })[0]).toBe(m);
    const r = ret('r');
    expect(ajustarAparenciaEmLote([r], {})[0]).toBe(r);
    expect(ajustarAparenciaEmLote([r], { estiloTraco: 'tracejado' })[0].aparencia!.traco!.tipoLinha).toBe('tracejada');
  });

  it('entrada hostil não lança e ignora valores inválidos', () => {
    expect(ajustarAparenciaEmLote(null as never, { corTraco: '#fff' })).toEqual([]);
    const r = ret('r', { traco: { espessura: 1 } });
    expect(ajustarAparenciaEmLote([r], { espessura: NaN, opacidadePreenchimento: NaN })[0]).toBe(r);
    expect(ajustarAparenciaEmLote([r, null as never], null as never)).toEqual([r]);
    expect(aparenciaDe(ajustarAparenciaEmLote([r], { espessura: -3, corTraco: '<b>x</b>' })[0]).traco!.largura).toBe(1);
  });

  it('resumirAparencia: valor único, misto e nulo', () => {
    const iguais = [ret('a', { traco: { cor: '#f00', espessura: 1 }, preenchimento: { cor: '#0f0', opacidade: 0.5 } }), ret('b', { traco: { cor: '#f00', espessura: 1 }, preenchimento: { cor: '#0f0', opacidade: 0.5 } })];
    expect(resumirAparencia(iguais)).toEqual({ traco: { cor: '#f00', espessura: 1, estilo: 'continuo' }, preenchimento: { cor: '#0f0', opacidade: 0.5 } });
    expect(resumirAparencia([iguais[0], ret('c', { traco: { cor: '#00f', espessura: 1 }, preenchimento: null })])).toEqual({ traco: 'misto', preenchimento: 'misto' });
    expect(resumirAparencia(dupla()).traco).toBe('misto'); // espessuras diferentes
    expect(resumirAparencia([ret('x', { traco: null, preenchimento: null })])).toEqual({ traco: null, preenchimento: null });
    expect(resumirAparencia(null as never)).toEqual({ traco: null, preenchimento: null });
    expect(resumirAparencia([{ ...ret('m'), mascara: true }])).toEqual({ traco: null, preenchimento: null });
  });

  it('ESTILO_DO_TIPO_LINHA é o inverso de TIPO_LINHA_DO_ESTILO', () => {
    for (const [estilo, tipo] of Object.entries(TIPO_LINHA_DO_ESTILO)) expect(ESTILO_DO_TIPO_LINHA[tipo]).toBe(estilo);
  });
});

describe('pré-definições: opções novas', () => {
  const caixa: CaixaMm = { x: 0, y: 0, largura: 100, altura: 60 };

  it('sem as opções novas o resultado é idêntico ao anterior', () => {
    for (const tipo of PREDEFINICOES) {
      const [a] = gerarPredefinicao(tipo, caixa, { id: 'k' });
      const [b] = gerarPredefinicao(tipo, caixa, { id: 'k', semTraco: undefined, recuo: undefined, preenchimentoNa: undefined });
      expect(b).toEqual(a);
    }
  });

  it('opacidades, semTraco, alinhamento do traço', () => {
    const [r] = gerarPredefinicao('retangulo', caixa, { corPreenchimento: '#f00', opacidadePreenchimento: 0.3, opacidadeTraco: 0.8, alinhamentoTraco: 'dentro' });
    expect(r.aparencia!.preenchimento).toEqual({ cor: '#f00', opacidade: 0.3 });
    expect(r.aparencia!.traco).toMatchObject({ opacidade: 0.8, alinhamento: 'dentro' });
    expect(aparenciaDe(r).traco!.alinhamento).toBe('dentro');
    const [s] = gerarPredefinicao('retangulo', caixa, { semTraco: true, espessura: -1, corPreenchimento: '#fff' });
    expect(s.aparencia!.traco).toBeNull();
    // o traço por dentro mantém o envelope da folha na caixa (a borda externa encosta)
    const env = envelopeVisual(r)!;
    const [c] = gerarPredefinicao('retangulo', caixa, { alinhamentoTraco: 'centro' });
    expect(env.x).toBeGreaterThan(envelopeVisual(c)!.x);
    expect(env.x).toBeGreaterThanOrEqual(-1e-6);
  });

  it('moldura dupla: preenchimento na externa cobre o espaço entre as linhas', () => {
    const [e, i] = gerarPredefinicao('moldura-dupla', caixa, { corPreenchimento: '#eee', preenchimentoNa: 'externa' });
    expect(e.aparencia!.preenchimento).toEqual({ cor: '#eee' });
    expect(i.aparencia!.preenchimento).toBeNull();
    const [e2, i2] = gerarPredefinicao('moldura-dupla', caixa, { corPreenchimento: '#eee' });
    expect(e2.aparencia!.preenchimento).toBeNull();
    expect(i2.aparencia!.preenchimento).toEqual({ cor: '#eee' });
  });

  it('recuo afasta as pontas das bordas e é ignorado quando consumiria a linha', () => {
    const caixaDe = (el: ElementoGrafico): number[] => { const l = limitesNaFolha(el)!; return [l.x, l.y, l.x + l.largura, l.y + l.altura]; };
    const [l] = gerarPredefinicao('linha-horizontal', caixa, { recuo: 2 });
    expect(caixaDe(l)).toEqual([2, 30, 98, 30]);
    const [seta] = gerarPredefinicao('seta', caixa, { recuo: 5 });
    expect(caixaDe(seta)).toEqual([5, 30, 95, 30]);
    const [d] = gerarPredefinicao('linha-diagonal', { x: 0, y: 0, largura: 30, altura: 40 }, { recuo: 5 });
    expect(caixaDe(d).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([3, 4, 27, 36]);
    const [x] = gerarPredefinicao('linha-vertical', caixa, { recuo: 500 });
    expect(caixaDe(x)).toEqual([50, 0, 50, 60]);
    expect(gerarPredefinicao('linha-horizontal', caixa, { recuo: NaN })).toHaveLength(1);
  });

  it('ROTULOS_PREDEFINICOES e ITENS_PREDEFINICOES cobrem todas, em pt-BR, ordenadas', () => {
    expect(Object.keys(ROTULOS_PREDEFINICOES).sort()).toEqual([...PREDEFINICOES].sort());
    expect(ITENS_PREDEFINICOES.map((i) => i.valor).sort()).toEqual([...PREDEFINICOES].sort());
    expect(ROTULOS_PREDEFINICOES['moldura-dupla']).toBe('Moldura dupla (ABNT)');
    expect(ITENS_PREDEFINICOES.filter((i) => i.usaQuadro).map((i) => i.valor)).toEqual(['retangulo', 'moldura-dupla']);
  });
});

describe('caixaDoQuadro', () => {
  it('folha A3 paisagem com margem 25/10/10/10', () => {
    expect(caixaDoQuadro(420, 297, { esquerda: 25, direita: 10, superior: 10, inferior: 10 })).toEqual({ x: 25, y: 10, largura: 385, altura: 277 });
  });
  it('margens que somam ≥ folha, negativas ou não finitas devolvem null', () => {
    expect(caixaDoQuadro(100, 100, { esquerda: 50, direita: 50, superior: 0, inferior: 0 })).toBeNull();
    expect(caixaDoQuadro(100, 100, { esquerda: 0, direita: 0, superior: 60, inferior: 60 })).toBeNull();
    expect(caixaDoQuadro(100, 100, { esquerda: -1, direita: 0, superior: 0, inferior: 0 })).toBeNull();
    expect(caixaDoQuadro(NaN, 100, { esquerda: 0, direita: 0, superior: 0, inferior: 0 })).toBeNull();
    expect(caixaDoQuadro(100, 100, null as never)).toBeNull();
  });
  it('caixaDoQuadroAbnt continua igual (chama a genérica)', () => {
    expect(caixaDoQuadroAbnt('A4')).toEqual({ x: 25, y: 7, largura: 178, altura: 283 });
    expect(caixaDoQuadroAbnt('A3', 'paisagem', { esquerda: 25, direita: 10, superior: 10, inferior: 10 })).toEqual(caixaDoQuadro(420, 297, { esquerda: 25, direita: 10, superior: 10, inferior: 10 }));
    expect(caixaDoQuadroAbnt('A9' as never)).toBeNull();
  });
});
