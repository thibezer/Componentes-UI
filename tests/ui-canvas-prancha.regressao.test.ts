import { describe, it, expect, afterEach } from 'vitest';
import { criarRetangulo } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { limitesNaFolha } from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import { montar } from './prancha-componente-util';

/* Fase 3 da prancha, Camada C: o componente com entrada adversária e uso fora de ordem (Regra #0). */

afterEach(() => { document.body.innerHTML = ''; });

const ret = (id: string, x = 10, y = 10): ElementoGrafico =>
  criarRetangulo({ id, aparencia: { preenchimento: { cor: '#000' } } }, { x, y, largura: 20, altura: 20 })!;

describe('API com argumentos hostis', () => {
  it('nada lança e o documento continua íntegro', () => {
    const { el } = montar();
    const hostis: Array<() => unknown> = [
      () => el.definirElementos(null as never), () => el.definirElementos('x' as never), () => el.aplicarLote(null as never),
      () => el.aplicarLote({ adicionar: 'x', atualizar: [null], remover: [1, null] } as never),
      () => el.adicionarElemento({ id: '<img onerror=x>', geometria: { tipo: 'retangulo', largura: NaN, altura: 1 } }),
      () => el.atualizarElemento({ id: 'inexistente', geometria: { tipo: 'retangulo', largura: 1, altura: 1 } }),
      () => el.removerElemento(undefined as never), () => el.selecionarElementos(null as never), () => el.alternarSelecaoElemento(42 as never),
      () => el.moverSelecao(NaN, Infinity), () => el.girarSelecao(NaN), () => el.escalarSelecao(0), () => el.espelharSelecao('diagonal' as never),
      () => el.transformarSelecao({ a: NaN } as never), () => el.definirZoom(NaN), () => el.definirZoom(-5), () => el.deslocarVista(NaN, 1),
      () => el.definirGuias([{ orientacao: 'obliqua', posicao: 1 }, null, { orientacao: 'vertical', posicao: Infinity }] as never),
      () => el.removerGuia(99), () => el.definirFerramenta('pincel' as never), () => el.definirOpcoesFerramentas(null as never),
      () => el.inserirPredefinicao('nada' as never), () => el.inserirPredefinicao('retangulo', { x: NaN, y: 0, largura: 1, altura: 1 }),
      () => el.editarAncoras('nao-existe'), () => el.renomearElemento('a', ''), () => el.executarComando(null as never, null as never),
      () => el.executarComando('moverSelecao', 'x' as never), () => el.paraFolha(NaN, NaN), () => el.desfazer(), () => el.refazer()
    ];
    for (const f of hostis) expect(f).not.toThrow();
    expect(el.ferramenta).toBe('selecao');
    expect(el.obterGuias()).toEqual([]);
    expect(Number.isFinite(el.obterVista().zoom)).toBe(true);
    el.definirElementos([ret('a')]);
    expect(el.obterElementos()).toHaveLength(1);
  });

  it('atributos inválidos voltam ao padrão', () => {
    const { el } = montar({ largura: 'abc', altura: '-3', unidade: 'jarda', grade: 'NaN', ferramenta: 'pincel', 'passo-teclado': '0' });
    expect(el.ferramenta).toBe('selecao');
    expect(el.exportarSvg()).toContain('width="210mm" height="297mm"');
  });

  it('elemento bloqueado não é selecionado pelo clique nem movido por comando', () => {
    const { el, clicar } = montar();
    el.definirElementos([{ ...ret('a'), bloqueado: true }]);
    clicar([15, 15]);
    expect(el.selecao).toEqual([]);
    el.selecionarElementos(['a']);
    expect(el.selecao).toEqual([]);
    expect(el.moverSelecao(5, 5)).toBe(false);
  });

  it('texto com HTML nunca vira marcação no shadow DOM', () => {
    const { el } = montar();
    el.definirElementos([{ id: 't', geometria: { tipo: 'texto', texto: '<img src=x onerror=alert(1)>', tamanho: 5 } }]);
    el.renderizarAgora();
    expect(el.shadowRoot!.querySelector('img')).toBeNull();
    expect(el.exportarSvg()).not.toContain('<img');
  });
});

describe('ciclo de vida e uso fora de ordem', () => {
  it('desconectar no meio de um gesto não deixa o documento num estado intermediário', () => {
    const { el, ponteiro } = montar({ 'sem-snap': '' });
    el.definirElementos([ret('a')]);
    ponteiro('pointerdown', [15, 15]);
    ponteiro('pointermove', [60, 60]);
    el.remove();
    expect(limitesNaFolha(el.obterElemento('a')!)!.x).toBe(10);
    document.body.appendChild(el);
    el.renderizarAgora();
    expect(el.obterElementos()).toHaveLength(1);
  });

  it('pointercancel descarta o gesto; Esc durante o arrasto do desenho cancela', () => {
    const { el, ponteiro, viewport, ev, tecla } = montar({ 'sem-snap': '' });
    el.definirElementos([ret('a')]);
    ponteiro('pointerdown', [15, 15]);
    ponteiro('pointermove', [60, 60]);
    viewport.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }));
    ponteiro('pointerup', [60, 60]);
    expect(ev('prancha-elemento-atualizado')).toEqual([]);
    el.definirFerramenta('elipse');
    ponteiro('pointerdown', [100, 100]);
    ponteiro('pointermove', [150, 150]);
    tecla('Escape');
    ponteiro('pointerup', [150, 150]);
    expect(ev('prancha-elemento-criado')).toEqual([]);
  });

  it('conectar e desconectar muitas vezes seguidas é idempotente', () => {
    const { el } = montar();
    for (let i = 0; i < 20; i++) { el.remove(); document.body.appendChild(el); }
    el.definirElementos([ret('a')]);
    el.selecionarElementos(['a']);
    expect(el.selecao).toEqual(['a']);
  });

  it('contexto 2D que lança não derruba o componente; sem contexto, nada pinta e nada quebra', () => {
    const quebrado = montar({}, () => new Proxy({}, { get: () => () => { throw new Error('ctx'); } }) as never);
    quebrado.el.definirElementos([ret('a')]);
    expect(() => quebrado.el.renderizarAgora()).not.toThrow();
    const nulo = montar({}, () => null);
    expect(() => nulo.el.renderizarAgora()).not.toThrow();
  });

  it('cliques rápidos consecutivos não criam formas nem seleções inconsistentes', () => {
    const { el, clicar } = montar({ ferramenta: 'retangulo' });
    for (let i = 0; i < 30; i++) clicar([50, 50]);
    expect(el.obterElementos()).toEqual([]);
    el.definirFerramenta('selecao');
    el.definirElementos([ret('a')]);
    for (let i = 0; i < 30; i++) clicar([15, 15], { shiftKey: true });
    expect(el.selecao).toEqual([]);
  });
});
