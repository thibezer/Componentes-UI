// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  analisarElemento, normalizarAparencia, normalizarElemento, normalizarElementos, normalizarGeometriaElemento
} from '../src/gerencigeo-canvas/prancha/elemento_validacao';
import { contornoNaFolha, limitesNaFolha } from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import { IndicePrancha, elementosNaCaixa, elementosNoLaco, elementosNoPonto } from '../src/gerencigeo-canvas/prancha/elemento_consulta';
import { buscarSnapPrancha } from '../src/gerencigeo-canvas/prancha/elemento_snap';
import { caixaDaSelecao, caixaOrientada, espelharElementos, girarElementos } from '../src/gerencigeo-canvas/prancha/elemento_transformacao';
import { moverAncora } from '../src/gerencigeo-canvas/prancha/elemento_edicao';
import { criarCaminho, criarElipse, criarEstrela, criarLinha, criarPoligonoRegular, criarRetangulo, criarTexto } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { gerarPredefinicao } from '../src/gerencigeo-canvas/prancha/elemento_predefinicoes';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';

/*
 * Fase 1 da prancha, Camada C: robustez com entrada adversária (Regra #0). Nada lança; o que é inválido é recusado com o
 * motivo, o que é degenerado some das consultas sem derrubar as demais.
 */

const HOSTIS: unknown[] = [null, undefined, 0, NaN, '', 'x', [], {}, () => 1, Symbol('s'), { id: 1n }, { geometria: 'retangulo' }];
const GEOMETRIAS_HOSTIS: unknown[] = [
  { tipo: 'retangulo', largura: NaN, altura: 1 }, { tipo: 'retangulo', largura: Infinity, altura: 1 }, { tipo: 'retangulo', largura: -1, altura: 1 },
  { tipo: 'retangulo', largura: '10', altura: 1 }, { tipo: 'elipse', rx: 0, ry: 1 }, { tipo: 'elipse', rx: 1, ry: 1, arco: { inicio: 1, fim: 1 } },
  { tipo: 'elipse', rx: 1, ry: 1, arco: { inicio: NaN, fim: 1 } }, { tipo: 'poligono-regular', raio: 1, lados: NaN },
  { tipo: 'estrela', raioExterno: 1, raioInterno: 0, pontas: 5 }, { tipo: 'linha', de: [0, 0], ate: [NaN, 1] }, { tipo: 'linha', de: [0], ate: [1, 1] },
  { tipo: 'caminho', geometria: { tipo: 'Polygon', aneis: [[[0, 0], [1, 1]]] } }, { tipo: 'caminho', geometria: { tipo: 'LineString', coordenadas: [[0, 0], [Infinity, 0]] } },
  { tipo: 'caminho', geometria: { tipo: 'Point', coordenada: [0, 0] } }, { tipo: 'caminho', geometria: null }, { tipo: 'texto', texto: 'a', tamanho: 0 },
  { tipo: 'circulo', raio: 1 }, { tipo: '__proto__' }
];

describe('normalização de elementos vindos de fora', () => {
  it('nunca lança e recusa o inválido com motivo', () => {
    for (const h of HOSTIS) expect(() => normalizarElemento(h)).not.toThrow();
    expect(analisarElemento(null)).toBe('nao-objeto');
    expect(analisarElemento([])).toBe('nao-objeto');
    expect(analisarElemento({ id: '  ', geometria: { tipo: 'retangulo', largura: 1, altura: 1 } })).toBe('id-invalido');
    expect(analisarElemento({ id: 'a', geometria: { tipo: 'retangulo', largura: 0, altura: 1 } })).toBe('geometria-invalida');
    for (const g of GEOMETRIAS_HOSTIS) expect(normalizarGeometriaElemento(g), JSON.stringify(g)).toBeNull();
  });

  it('id numérico vira texto; contagens viram inteiros de 3 a 360; raio interno limitado ao externo', () => {
    expect(normalizarElemento({ id: 7, geometria: { tipo: 'retangulo', largura: 1, altura: 1 } })?.id).toBe('7');
    expect(normalizarGeometriaElemento({ tipo: 'poligono-regular', raio: 1, lados: 2.4 })).toEqual({ tipo: 'poligono-regular', raio: 1, lados: 3 });
    expect(normalizarGeometriaElemento({ tipo: 'estrela', raioExterno: 2, raioInterno: 9, pontas: 1e6 })).toEqual({ tipo: 'estrela', raioExterno: 2, raioInterno: 2, pontas: 360 });
  });

  it('ids duplicados: fica o primeiro e o resto é informado', () => {
    const r = normalizarElementos([
      { id: 'a', geometria: { tipo: 'retangulo', largura: 1, altura: 1 } },
      { id: 'a', geometria: { tipo: 'elipse', rx: 1, ry: 1 } },
      null,
      { id: 'b', geometria: { tipo: 'nada' } }
    ]);
    expect(r.elementos.map((e) => e.geometria.tipo)).toEqual(['retangulo']);
    expect(r.recusados).toEqual([
      { indice: 1, id: 'a', motivo: 'id-duplicado' },
      { indice: 2, id: undefined, motivo: 'nao-objeto' },
      { indice: 3, id: 'b', motivo: 'geometria-invalida' }
    ]);
    expect(normalizarElementos('lixo')).toEqual({ elementos: [], recusados: [] });
  });

  it('matriz não finita vira identidade; singular é aceita mas o elemento some e não se edita', () => {
    const naoFinita = normalizarElemento({ id: 'a', geometria: { tipo: 'retangulo', largura: 10, altura: 10 }, transformacao: { a: NaN, b: 0, c: 0, d: 1, e: 0, f: 0 } })!;
    expect(naoFinita.transformacao).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    const singular = normalizarElemento({ id: 's', geometria: { tipo: 'retangulo', largura: 10, altura: 10 }, transformacao: { a: 0, b: 0, c: 0, d: 0, e: 5, f: 5 } })!;
    expect(limitesNaFolha(singular)).toEqual({ x: 5, y: 5, largura: 0, altura: 0 });
    expect(moverAncora(singular, 0, [1, 1])).toBeNull();
  });

  it('texto com HTML é guardado como dado, intacto (o kit nunca o injeta como HTML)', () => {
    const t = normalizarElemento({ id: 't', geometria: { tipo: 'texto', texto: '<img src=x onerror=alert(1)>', tamanho: 5 } })!;
    expect(t.geometria).toMatchObject({ texto: '<img src=x onerror=alert(1)>' });
    expect(normalizarElemento({ id: 't', geometria: { tipo: 'texto', texto: 42, tamanho: 5 } })!.geometria).toMatchObject({ texto: '42' });
  });

  it('aparência: números fora de faixa e cores que não são texto são descartados; propriedades sem chaves perigosas', () => {
    const a = normalizarAparencia({
      traco: { cor: 12, espessura: -1, opacidade: 7, tipoLinha: 'Dashed', terminacao: 'x', pontaFim: { estilo: 'triangulo', escala: Infinity }, pontaInicio: { estilo: 'foguete' } },
      preenchimento: { cor: '#0f0', opacidade: NaN, regra: 'evenodd' },
      opacidade: -3
    });
    expect(a).toEqual({ traco: { opacidade: 1, tipoLinha: 'tracejada', pontaFim: { estilo: 'triangulo' } }, preenchimento: { cor: '#0f0', regra: 'evenodd' }, opacidade: 0 });
    expect(normalizarAparencia({ traco: null, preenchimento: null })).toEqual({ traco: null, preenchimento: null });
    const props = JSON.parse('{"__proto__": {"poluido": true}, "constructor": 1, "ok": 2}');
    const el = normalizarElemento({ id: 'p', geometria: { tipo: 'retangulo', largura: 1, altura: 1 }, propriedades: props })!;
    expect(el.propriedades).toEqual({ ok: 2 });
    expect(({} as Record<string, unknown>).poluido).toBeUndefined();
  });
});

describe('consultas com elementos degenerados ou malformados no meio', () => {
  const bom = criarRetangulo({ id: 'bom', aparencia: { preenchimento: { cor: '#000' } } }, { x: 0, y: 0, largura: 10, altura: 10 })!;
  const ruins = [
    { id: 'r1', geometria: { tipo: 'retangulo', largura: 0, altura: 0 } },
    { id: 'r2', geometria: { tipo: 'elipse', rx: NaN, ry: 1 } },
    { id: 'r3', geometria: null },
    { id: 'r4', geometria: { tipo: 'retangulo', largura: 5, altura: 5 }, transformacao: { a: Infinity, b: 0, c: 0, d: 1, e: 0, f: 0 } },
    null
  ] as unknown as ElementoGrafico[];
  const todos = [...ruins, bom];

  it('hit-test, caixa, laço, índice, snap e caixa da seleção seguem funcionando para os bons', () => {
    expect(elementosNoPonto([5, 5], todos).map((a) => a.elemento.id)).toEqual(['bom']);
    expect(elementosNaCaixa({ x: -1, y: -1, largura: 20, altura: 20 }, todos, 'window').map((e) => e.id)).toContain('bom');
    expect(elementosNoLaco([[-1, -1], [20, -1], [20, 20], [-1, 20]], todos).map((e) => e.id)).toContain('bom');
    const ind = new IndicePrancha();
    ind.definir(todos);
    expect(ind.consultarPonto([5, 5], 1).map((e) => e.id)).toContain('bom');
    expect(buscarSnapPrancha([0.2, 0.2], todos, 4)?.elementoId).toBe('bom');
    expect(caixaDaSelecao(todos.filter(Boolean))).not.toBeNull();
    expect(() => espelharElementos(todos.filter(Boolean), 'vertical')).not.toThrow();
    expect(() => girarElementos(todos.filter(Boolean), NaN)).not.toThrow();
    for (const r of ruins.filter(Boolean)) {
      expect(() => contornoNaFolha(r)).not.toThrow();
      expect(() => caixaOrientada(r)).not.toThrow();
    }
  });

  it('construtores recusam entradas hostis em vez de criar lixo', () => {
    expect(criarRetangulo({ id: 'x' }, { x: NaN, y: 0, largura: 1, altura: 1 })).toBeNull();
    expect(criarElipse({ id: 'x' }, null as never)).toBeNull();
    expect(criarPoligonoRegular({ id: 'x' }, [0, 0], 1, 2)).toBeNull();
    expect(criarEstrela({ id: 'x' }, [0, Infinity], 1, 1)).toBeNull();
    expect(criarLinha({ id: 'x' }, [0, 0], [undefined, 1] as never)).toBeNull();
    expect(criarCaminho({ id: 'x' }, { tipo: 'Point' } as never)).toBeNull();
    expect(criarTexto({ id: 'x' }, [0, 0], 'a', -1)).toBeNull();
    expect(gerarPredefinicao('retangulo', { x: 0, y: 0, largura: Infinity, altura: 1 })).toEqual([]);
  });

  it('caixa invertida vira positiva (arrastar da direita para a esquerda)', () => {
    expect(limitesNaFolha(criarRetangulo({ id: 'x' }, { x: 10, y: 10, largura: -10, altura: -5 })!)).toEqual({ x: 0, y: 5, largura: 10, altura: 5 });
  });

  it('cliques rápidos consecutivos no mesmo ponto devolvem sempre o mesmo resultado (cache estável)', () => {
    const r = Array.from({ length: 50 }, () => elementosNoPonto([5, 5], todos).map((a) => a.elemento.id).join());
    expect(new Set(r).size).toBe(1);
  });
});
