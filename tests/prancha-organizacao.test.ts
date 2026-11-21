// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { criarCaminho, criarElipse, criarLinha, criarRetangulo } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { limitesNaFolha } from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import { elementoNoTopo, elementosNaCaixa, ordenarPorEmpilhamento } from '../src/gerencigeo-canvas/prancha/elemento_consulta';
import { mapaDeCamadas, normalizarCamadas } from '../src/gerencigeo-canvas/prancha/camadas';
import {
  agrupar, alinhar, aplicarAparencia, desagrupar, distribuir, duplicarElementos, expandirGrupos, reordenar
} from '../src/gerencigeo-canvas/prancha/organizacao';
import {
  ancoraMaisProxima, contornoDoTraco, criarMascara, deslocarCaminho, dividirComLinha, liberarMascara, simplificarCaminho,
  trechoMaisProximo, unirCaminhos
} from '../src/gerencigeo-canvas/prancha/operacoes_caminho';
import { planejarElementos } from '../src/gerencigeo-canvas/prancha/pintura_plano';
import { desenharElementos } from '../src/gerencigeo-canvas/prancha/pintura_canvas';
import { exportarSvg } from '../src/gerencigeo-canvas/prancha/exportar_svg';
import { ESPACO_PLANO } from '../src/gerencigeo-canvas/espaco/espaco_plano';
import type { CamadaPrancha, ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import type { Par } from '../src/gerencigeo-canvas/feature_types';
import { ContextoGravador } from './prancha-contextos';

/* Fase 4 da prancha, Camada A (+ C): camadas, ordem, grupos, alinhar/distribuir, duplicar e operações de caminho. */

const cheio = { preenchimento: { cor: '#f00' } };
const ret = (id: string, x: number, y: number, w = 10, h = 10, extra: Partial<ElementoGrafico> = {}): ElementoGrafico =>
  ({ ...criarRetangulo({ id, aparencia: cheio }, { x, y, largura: w, altura: h })!, ...extra });
const ids = (l: readonly { id: string }[]) => l.map((e) => e.id);
let n = 0;
const gerarId = (tipo: string) => `${tipo}-${++n}`;

describe('camadas (dado, não UI)', () => {
  const camadas: CamadaPrancha[] = [{ id: 'fundo' }, { id: 'meio', opacidade: 0.5 }, { id: 'oculta', visivel: false }, { id: 'trava', bloqueada: true }];
  const a = ret('a', 0, 0, 10, 10, { camadaId: 'meio' });
  const b = ret('b', 0, 0, 10, 10, { camadaId: 'fundo' });
  const c = ret('c', 0, 0, 10, 10);
  const d = ret('d', 0, 0, 10, 10, { camadaId: 'oculta' });
  const e = ret('e', 0, 0, 10, 10, { camadaId: 'trava' });

  it('ordem por camada (sem camada fica por cima); ocultas e bloqueadas fora da seleção', () => {
    expect(ids(ordenarPorEmpilhamento([c, a, b], camadas))).toEqual(['b', 'a', 'c']);
    expect(elementoNoTopo([5, 5], [a, b], { camadas })?.id).toBe('a');
    expect(elementoNoTopo([5, 5], [d, e, b], { camadas })?.id).toBe('b');
    expect(ids(elementosNaCaixa({ x: -1, y: -1, largura: 20, altura: 20 }, [a, d, e], 'window', { camadas }))).toEqual(['a']);
    const m = mapaDeCamadas(camadas);
    expect([m.visivel(d), m.travado(e), m.opacidade(a)]).toEqual([false, true, 0.5]);
  });

  it('pintura e SVG: camada oculta fora, opacidade da camada multiplicada', () => {
    const planos = planejarElementos([a, b, c, d], camadas);
    expect(ids(planos)).toEqual(['b', 'a', 'c']);
    expect(planos[1].opacidade).toBe(0.5);
    const svg = exportarSvg([a, d], { largura: 50, altura: 50, camadas });
    expect(svg).toContain('data-id="a" opacity="0.5"');
    expect(svg).not.toContain('data-id="d"');
  });

  it('normalização: ids únicos, tipos certos', () => {
    expect(normalizarCamadas([{ id: 'x', visivel: false, opacidade: 7 }, { id: 'x' }, { id: '' }, null, { id: 'y', bloqueada: 'sim' }]))
      .toEqual([{ id: 'x', visivel: false, opacidade: 1 }, { id: 'y' }]);
    expect(normalizarCamadas('x')).toEqual([]);
  });
});

describe('ordem de empilhamento', () => {
  const l = [ret('a', 0, 0), ret('b', 0, 0), ret('c', 0, 0), ret('d', 0, 0)];
  it('frente, trás, avançar e recuar', () => {
    expect(ids(reordenar(l, ['a'], 'frente'))).toEqual(['b', 'c', 'd', 'a']);
    expect(ids(reordenar(l, ['d', 'c'], 'tras'))).toEqual(['c', 'd', 'a', 'b']);
    expect(ids(reordenar(l, ['a'], 'avancar'))).toEqual(['b', 'a', 'c', 'd']);
    expect(ids(reordenar(l, ['a', 'b'], 'avancar'))).toEqual(['c', 'a', 'b', 'd']);
    expect(ids(reordenar(l, ['d'], 'recuar'))).toEqual(['a', 'b', 'd', 'c']);
    expect(ids(reordenar(l, ['a'], 'recuar'))).toEqual(['a', 'b', 'c', 'd']);
  });
  it('respeita a camada e remove o campo ordem', () => {
    const cam: CamadaPrancha[] = [{ id: 'k1' }, { id: 'k2' }];
    const m = [ret('x', 0, 0, 10, 10, { camadaId: 'k2' }), ret('y', 0, 0, 10, 10, { camadaId: 'k1', ordem: 9 }), ret('z', 0, 0, 10, 10, { camadaId: 'k1' })];
    const r = reordenar(m, ['z'], 'frente', cam);
    expect(ids(r)).toEqual(['y', 'z', 'x']);
    expect(r.every((e) => e.ordem === undefined)).toBe(true);
  });
});

describe('grupos', () => {
  it('agrupar deixa os membros contíguos no topo deles; expandir e desagrupar', () => {
    const l = [ret('a', 0, 0), ret('b', 0, 0), ret('c', 0, 0)];
    const g = agrupar(l, ['a', 'c'], 'g1');
    expect(ids(g)).toEqual(['b', 'a', 'c']);
    expect(g.filter((e) => e.grupoId === 'g1').length).toBe(2);
    expect(expandirGrupos(g, ['a']).sort()).toEqual(['a', 'c']);
    expect(desagrupar(g, ['c']).some((e) => e.grupoId)).toBe(false);
    expect(agrupar(l, ['a'], 'g2')).toEqual(l);
  });
});

describe('alinhar e distribuir', () => {
  const a = ret('a', 0, 0, 10, 10);
  const b = ret('b', 30, 20, 20, 10);
  const c = ret('c', 80, 5, 10, 30);

  it('à seleção, ao objeto-chave e a uma caixa (folha); grupo é uma unidade', () => {
    const esq = alinhar([a, b, c], 'esquerda');
    expect(esq.map((e) => limitesNaFolha(e)!.x)).toEqual([0, 0]);
    const base = alinhar([a, b, c], 'base', { tipo: 'chave', id: 'c' });
    expect(base.map((e) => limitesNaFolha(e)!.y + limitesNaFolha(e)!.altura)).toEqual([35, 35]);
    const centro = alinhar([a], 'centro-horizontal', { tipo: 'caixa', caixa: { x: 0, y: 0, largura: 210, altura: 297 } });
    expect(limitesNaFolha(centro[0])!.x).toBeCloseTo(100, 9);
    const grupo = [{ ...a, grupoId: 'g' }, { ...b, grupoId: 'g' }, c];
    const topo = alinhar(grupo, 'topo');
    expect(ids(topo)).toEqual(['c']);
    expect(alinhar([a], 'esquerda')).toEqual([]);
    expect(alinhar([a, b], 'diagonal' as never)).toEqual([]);
  });

  it('distribuir centros e espaços (iguais ou fixos)', () => {
    const cs = distribuir([a, b, c], 'horizontal', 'centros');
    expect(cs).toHaveLength(1);
    // centros 5, 40, 85 → passo 40: o do meio vai para 45
    expect(limitesNaFolha(cs[0])!.x + 10).toBeCloseTo(45, 9);
    const es = distribuir([a, b, c], 'horizontal', 'espacos');
    expect(limitesNaFolha(es[0])!.x).toBeCloseTo(35, 9);
    const fixo = distribuir([a, b], 'horizontal', 'espacos', 5);
    expect(limitesNaFolha(fixo[0])!.x).toBeCloseTo(15, 9);
    expect(distribuir([a, b], 'vertical', 'centros')).toEqual([]);
  });
});

describe('duplicar e conta-gotas', () => {
  it('cópias com ids novos, grupos e máscaras remapeados, deslocadas', () => {
    const l = [ret('m', 0, 0, 10, 10, { mascara: true, grupoId: 'g' }), ret('x', 0, 0, 20, 20, { recorteId: 'm', grupoId: 'g' }), ret('y', 0, 0, 5, 5, { recorteId: 'fora' })];
    const d = duplicarElementos(l, gerarId, [5, 5]);
    expect(new Set(ids(d)).size).toBe(3);
    expect(ids(d).some((id) => ['m', 'x', 'y'].includes(id))).toBe(false);
    expect(d[0].grupoId).toBe(d[1].grupoId);
    expect(d[0].grupoId).not.toBe('g');
    expect(d[1].recorteId).toBe(d[0].id);
    expect(d[2].recorteId).toBeUndefined();
    expect(limitesNaFolha(d[1])!.x).toBe(5);
    expect(l[0].id).toBe('m');
  });

  it('aplicar aparência copia fundo (sem compartilhar o objeto)', () => {
    const ap = { traco: { cor: '#00f', espessura: 1 } };
    const [r] = aplicarAparencia([ret('a', 0, 0)], ap);
    expect(r.aparencia).toEqual(ap);
    expect(r.aparencia).not.toBe(ap);
    expect(aplicarAparencia([ret('a', 0, 0)], undefined)[0].aparencia).toBeUndefined();
  });
});

describe('operações de caminho', () => {
  it('unir duas linhas que se tocam; dois polígonos vizinhos; tipos misturados recusados', () => {
    const l1 = criarLinha({ id: 'l1' }, [0, 0], [10, 0])!;
    const l2 = criarLinha({ id: 'l2' }, [10, 0], [10, 10])!;
    const r = unirCaminhos([l1, l2]);
    expect('ok' in r && r.ok.geometria).toMatchObject({ tipo: 'caminho', geometria: { tipo: 'LineString', coordenadas: [[0, 0], [10, 0], [10, 10]] } });
    const p = unirCaminhos([ret('a', 0, 0), ret('b', 10, 0)]);
    expect('ok' in p).toBe(true);
    expect(unirCaminhos([l1, ret('a', 0, 0)])).toEqual({ motivo: 'tipos-incompativeis' });
    expect(unirCaminhos([l1, criarLinha({ id: 'l3' }, [50, 50], [60, 60])!])).toEqual({ motivo: 'sem-ligacao' });
    expect(unirCaminhos([l1])).toEqual({ motivo: 'selecao-insuficiente' });
  });

  it('dividir com uma linha; sem cruzar é recusado', () => {
    const r = dividirComLinha(ret('q', 0, 0, 20, 10), criarLinha({ id: 'c' }, [10, -5], [10, 15])!, gerarId);
    expect('ok' in r && r.ok.length).toBe(2);
    if ('ok' in r) expect(r.ok.map((e) => ESPACO_PLANO.area([(e.geometria as { geometria: { aneis: Par[][] } }).geometria.aneis[0]])).sort()).toEqual([100, 100].map((v) => expect.closeTo(v, 6)));
    expect(dividirComLinha(ret('q', 0, 0, 20, 10), criarLinha({ id: 'c' }, [50, 50], [60, 60])!, gerarId)).toEqual({ motivo: 'sem-intersecao' });
  });

  it('deslocar caminho cria elemento novo maior; simplificar reduz vértices; contorno do traço vira preenchimento', () => {
    const q = ret('q', 0, 0, 20, 10);
    const d = deslocarCaminho(q, 2, 'novo');
    expect('ok' in d && limitesNaFolha(d.ok)).toEqual({ x: -2, y: -2, largura: 24, altura: 14 });
    const ruido = criarCaminho({ id: 'r' }, { tipo: 'LineString', coordenadas: Array.from({ length: 50 }, (_, i) => [i, Math.sin(i) * 0.01] as Par) })!;
    const s = simplificarCaminho(ruido, 0.1);
    expect('ok' in s && (s.ok.geometria as { geometria: { coordenadas: Par[] } }).geometria.coordenadas.length).toBe(2);
    const tr = contornoDoTraco(criarLinha({ id: 'l', aparencia: { traco: { espessura: 2, cor: '#123456' } } }, [0, 0], [10, 0])!);
    expect('ok' in tr && tr.ok.aparencia).toMatchObject({ traco: null, preenchimento: { cor: '#123456' } });
    const anel = contornoDoTraco(ret('a', 0, 0, 20, 20, { aparencia: { traco: { espessura: 2 } } }));
    expect('ok' in anel && (anel.ok.geometria as { geometria: { aneis: Par[][] } }).geometria.aneis).toHaveLength(2);
    expect(contornoDoTraco(ret('s', 0, 0, 5, 5, { aparencia: { traco: null } }))).toEqual({ motivo: 'degenerado' });
  });

  it('máscara de recorte: a forma da frente recorta; pintura com clip, SVG com clipPath; liberar volta ao normal', () => {
    const l = [ret('img', 0, 0, 40, 40), criarElipse({ id: 'circ' }, { x: 5, y: 5, largura: 30, altura: 30 })!];
    const r = criarMascara(l, ['img', 'circ'], 'g');
    expect('ok' in r).toBe(true);
    if (!('ok' in r)) return;
    const [img, circ] = r.ok;
    expect(circ).toMatchObject({ mascara: true, grupoId: 'g' });
    expect(img).toMatchObject({ recorteId: 'circ', grupoId: 'g' });
    expect(ids(planejarElementos(r.ok))).toEqual(['img']);
    const ctx = new ContextoGravador();
    desenharElementos(ctx, r.ok);
    expect(ctx.nomes()).toContain('clip');
    expect(exportarSvg(r.ok, { largura: 50, altura: 50 })).toMatch(/clip-path="url\(#pr-m\d+\)"/);
    expect(elementoNoTopo([20, 20], r.ok)?.id).toBe('img');
    const solto = liberarMascara(r.ok, ['img']);
    expect(solto.some((e) => e.mascara || e.recorteId)).toBe(false);
    expect(criarMascara([criarLinha({ id: 'a' }, [0, 0], [1, 1])!, criarLinha({ id: 'b' }, [0, 0], [1, 2])!], ['a', 'b'], 'g')).toEqual({ motivo: 'sem-forma-fechada' });
  });

  it('âncora e trecho mais perto (ferramentas +, −, Shift+C)', () => {
    const q = ret('q', 0, 0, 20, 10);
    expect(ancoraMaisProxima(q, [20.3, 0.2], 1)).toBe(1);
    expect(ancoraMaisProxima(q, [10, 5], 1)).toBeNull();
    expect(trechoMaisProximo(q, [10, 10.2], 1)).toBe(2);
    expect(trechoMaisProximo(criarElipse({ id: 'e' }, { x: 0, y: 0, largura: 20, altura: 20 })!, [20, 10.1], 1)).not.toBeNull();
    expect(ancoraMaisProxima(q, [NaN, 0], 1)).toBeNull();
  });
});
