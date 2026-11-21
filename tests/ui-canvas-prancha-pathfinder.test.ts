import { describe, it, expect, afterEach } from 'vitest';
import { UIBus } from '../src/core/ui-bus';
import { criarLinha, criarRetangulo } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { contornoNaFolha } from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import { areaComSinal } from '../src/gerencigeo-canvas/espaco/espaco_plano';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import { montar } from './prancha-componente-util';

/* Fase 5 da prancha, Camada B (+ C): Pathfinder e efeitos pelo componente (API, teclado, ui-bus, histórico, recusas). */

afterEach(() => {
  document.body.innerHTML = '';
});

const ret = (id: string, x: number, y: number, w = 20, h = 20, cor = '#ff0000'): ElementoGrafico =>
  criarRetangulo({ id, aparencia: { preenchimento: { cor } } }, { x, y, largura: w, altura: h })!;
const area = (el: ElementoGrafico | null): number => {
  const c = el ? contornoNaFolha(el) : null;
  return c && c.tipo === 'Polygon' ? Math.abs(c.aneis.reduce((s, a) => s + areaComSinal(a), 0)) : 0;
};

describe('Pathfinder no componente', () => {
  it('unir pela API: um elemento (id do da frente), outros removidos, eventos e desfazer em um passo', () => {
    const { el, ev } = montar();
    el.definirElementos([ret('a', 10, 10), ret('b', 20, 20, 20, 20, '#00ff00'), ret('c', 100, 100)]);
    el.selecionarElementos(['a', 'b']);
    expect(el.unirFormas()).toBe(true);
    expect(el.obterElementos().map((e) => e.id)).toEqual(['b', 'c']);
    expect(el.selecao).toEqual(['b']);
    expect(area(el.obterElemento('b'))).toBeCloseTo(700, 6);
    expect(el.obterElemento('b')!.aparencia?.preenchimento?.cor).toBe('#00ff00');
    const rem = ev('prancha-elemento-removido') as Array<{ ids: string[]; motivo: string }>;
    expect(rem[rem.length - 1]).toMatchObject({ ids: ['a'], motivo: 'pathfinder' });
    const at = ev('prancha-elemento-atualizado') as Array<{ elementos: ElementoGrafico[]; motivo: string }>;
    expect(at[at.length - 1].motivo).toBe('pathfinder');
    el.desfazer();
    expect(el.obterElementos().map((e) => e.id)).toEqual(['a', 'b', 'c']);
    el.refazer();
    expect(el.obterElementos().map((e) => e.id)).toEqual(['b', 'c']);
  });

  it('subtrair pelo teclado (Ctrl+Alt+Shift+2): fica o de trás menos o da frente', () => {
    const { el, tecla } = montar();
    el.definirElementos([ret('fundo', 0, 0, 40, 40), ret('furo', 10, 10, 10, 10)]);
    el.selecionarElementos(['fundo', 'furo']);
    const e = tecla('@', { ctrlKey: true, altKey: true, shiftKey: true, code: 'Digit2' });
    expect(e.defaultPrevented).toBe(true);
    expect(el.obterElementos().map((x) => x.id)).toEqual(['fundo']);
    expect(area(el.obterElemento('fundo'))).toBeCloseTo(1500, 6);
    // Ctrl+Alt+2 (sem Shift) continua desbloqueando tudo, não é Pathfinder
    el.definirElementos([ret('x', 0, 0), ret('y', 5, 5)]);
    el.selecionarElementos(['x', 'y']);
    tecla('2', { ctrlKey: true, altKey: true, code: 'Digit2' });
    expect(el.obterElementos()).toHaveLength(2);
  });

  it('interseção e exclusão pelo ui-bus; operação desconhecida é recusada', () => {
    const { el, ev } = montar();
    el.id = 'p5';
    el.definirElementos([ret('a', 0, 0), ret('b', 10, 10)]);
    el.selecionarElementos(['a', 'b']);
    UIBus.emit('prancha:comando', { alvo: 'p5', comando: 'pathfinder', args: ['intersecao'] });
    expect(area(el.obterElemento('b'))).toBeCloseTo(100, 6);
    el.definirElementos([ret('a', 0, 0), ret('b', 10, 10)]);
    el.selecionarElementos(['a', 'b']);
    UIBus.emit('prancha:comando', { alvo: 'p5', comando: 'excluirSobreposicao', args: [] });
    expect(area(el.obterElemento('b'))).toBeCloseTo(600, 6);
    expect(el.pathfinder('divisao' as never)).toBe(false);
    const rec = ev('prancha-recusa') as Array<{ acao: string; motivo: string }>;
    expect(rec[rec.length - 1]).toEqual({ acao: 'pathfinder', motivo: 'comando-desconhecido' });
  });

  it('recusas: sem seleção, resultado vazio, só linhas, somente-leitura; nada muda', () => {
    const { el, ev } = montar();
    el.definirElementos([ret('a', 0, 0), ret('b', 100, 100), criarLinha({ id: 'l' }, [0, 0], [10, 10])!, criarLinha({ id: 'm' }, [5, 0], [5, 10])!]);
    expect(el.unirFormas()).toBe(false);
    el.selecionarElementos(['a', 'b']);
    expect(el.intersectarFormas()).toBe(false);
    el.selecionarElementos(['l', 'm']);
    expect(el.unirFormas()).toBe(false);
    el.setAttribute('somente-leitura', '');
    el.selecionarElementos(['a', 'b']);
    expect(el.unirFormas()).toBe(false);
    const motivos = (ev('prancha-recusa') as Array<{ motivo: string }>).map((r) => r.motivo);
    expect(motivos).toEqual(['sem-selecao', 'resultado-vazio', 'tipo-nao-suportado', 'somente-leitura']);
    expect(el.obterElementos()).toHaveLength(4);
  });

  it('elemento bloqueado não entra; a linha da seleção fica intacta', () => {
    const { el } = montar();
    el.definirElementos([ret('a', 0, 0), ret('b', 10, 10), { ...ret('trava', 5, 5), bloqueado: true }, criarLinha({ id: 'l' }, [0, 0], [50, 50])!]);
    el.selecionarElementos(['a', 'b', 'l']);
    expect(el.unirFormas()).toBe(true);
    expect(el.obterElementos().map((e) => e.id)).toEqual(['b', 'trava', 'l']);
  });
});

describe('efeitos no componente', () => {
  it('aplicarAparencia com sombra e mesclagem: a base pinta a sombra e a mesclagem (contexto com as capacidades)', () => {
    const { el, ctx } = montar();
    el.definirElementos([ret('a', 10, 10)]);
    el.selecionarElementos(['a']);
    // aplicarAparencia troca a aparência inteira (como o conta-gotas)
    expect(el.aplicarAparencia({ preenchimento: { cor: '#ff0000' }, sombra: { deslocamento: [2, 2], desfoque: 0 }, mesclagem: 'multiplicar' })).toBe(true);
    expect(el.obterElemento('a')!.aparencia).toMatchObject({ sombra: { deslocamento: [2, 2], desfoque: 0 }, mesclagem: 'multiplicar' });
    el.renderizarAgora();
    const fills = ctx.get('base')!.chamadas.filter(([n]) => n === 'fill');
    expect(fills.map(([, , cor]) => cor)).toEqual(['#000000', '#ff0000']); // sombra antes do preenchimento (o papel é fillRect)
    expect(el.exportarSvg()).toContain('mix-blend-mode:multiply');
  });
});
