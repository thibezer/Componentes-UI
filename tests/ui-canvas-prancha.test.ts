import { describe, it, expect, afterEach, vi } from 'vitest';
import { UIBus } from '../src/core/ui-bus';
import { limitesNaFolha } from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import { criarRetangulo } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { resolverCores, CORES_PADRAO_PRANCHA } from '../src/components/ui-canvas-prancha/prancha-cores';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import { montar } from './prancha-componente-util';

/* Fase 3 da prancha, Camada B (+ D: teclado, ARIA, parts, tokens): ciclo de vida, API, eventos e gestos do componente. */

afterEach(() => { document.body.innerHTML = ''; });

const ret = (id: string, x: number, y: number, w = 40, h = 20): ElementoGrafico =>
  criarRetangulo({ id, aparencia: { preenchimento: { cor: '#ff0000' } } }, { x, y, largura: w, altura: h })!;

describe('ciclo de vida', () => {
  it('conectar/desconectar/reconectar não acumula listeners (window e ui-bus)', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const rem = vi.spyOn(window, 'removeEventListener');
    const { el } = montar();
    const depoisDoPrimeiro = add.mock.calls.length;
    el.remove();
    document.body.appendChild(el);
    el.remove();
    expect(add.mock.calls.length).toBe(depoisDoPrimeiro * 2);
    expect(rem.mock.calls.length).toBe(add.mock.calls.length);
    const girar = vi.spyOn(el, 'girarSelecao');
    UIBus.emit('prancha:comando', { comando: 'girarSelecao', args: [10] });
    expect(girar).not.toHaveBeenCalled();
    add.mockRestore();
    rem.mockRestore();
  });

  it('enquadra a folha ao conectar e pinta mesa, papel e elementos com o pintor da exportação', () => {
    const { el, ctx } = montar();
    el.definirElementos([ret('a', 10, 10)]);
    el.renderizarAgora();
    const base = ctx.get('base')!;
    expect(base.chamadas.some(([n, , , w, h]) => n === 'fillRect' && w === 210 && h === 297)).toBe(true);
    expect(base.chamadas.some(([n, , cor]) => n === 'fill' && cor === '#ff0000')).toBe(true);
    const v = el.obterVista();
    expect(v.zoom).toBeGreaterThan(1);
    const [x0] = el.paraTela([0, 0]);
    const [x1] = el.paraTela([210, 0]);
    expect((x0 + x1) / 2).toBeCloseTo(400, 6);
  });

  it('a base não é repintada sem mudança (só sobreposição e réguas)', () => {
    const { el, ctx } = montar();
    el.renderizarAgora();
    const n = ctx.get('base')!.chamadas.length;
    el.renderizarAgora();
    expect(ctx.get('base')!.chamadas.length).toBe(n);
    el.definirElementos([ret('a', 0, 0)]);
    el.renderizarAgora();
    expect(ctx.get('base')!.chamadas.length).toBeGreaterThan(n);
  });
});

describe('API de dados (sincronização do app)', () => {
  it('definir, lote, obter; recusas com motivo; não emite prancha-elemento-*', () => {
    const { el, ev } = montar();
    const r = el.definirElementos([ret('a', 0, 0), { id: 'a' }, null] as unknown[]);
    expect(r.aceitos).toBe(1);
    expect(r.recusados.map((x) => x.motivo)).toEqual(['geometria-invalida', 'nao-objeto']);
    const lote = el.aplicarLote({ adicionar: [ret('b', 50, 50), ret('a', 0, 0)], atualizar: [{ ...ret('a', 5, 5) }], remover: ['zz'] });
    expect(lote).toMatchObject({ adicionados: ['b'], atualizados: ['a'], removidos: [] });
    expect(lote.recusados[0]).toMatchObject({ id: 'a', motivo: 'id-duplicado' });
    expect(el.obterElementos().map((e) => e.id)).toEqual(['a', 'b']);
    expect(limitesNaFolha(el.obterElemento('a')!)!.x).toBe(5);
    expect(ev('prancha-elemento-criado')).toEqual([]);
    expect(el.podeDesfazer).toBe(true);
    el.desfazer();
    expect(el.obterElementos().map((e) => e.id)).toEqual(['a']);
  });

  it('renomear o id provisório mantém o desfazer', () => {
    const { el } = montar({ 'sem-snap': '' });
    el.definirElementos([ret('tmp', 0, 0)]);
    el.selecionarElementos(['tmp']);
    el.moverSelecao(10, 0);
    expect(el.renomearElemento('tmp', 'definitivo')).toBe(true);
    expect(el.selecao).toEqual(['definitivo']);
    el.desfazer();
    expect(limitesNaFolha(el.obterElemento('definitivo')!)!.x).toBe(0);
    expect(el.renomearElemento('nao-existe', 'x')).toBe(false);
  });
});

describe('desenho com o ponteiro', () => {
  it('retângulo por arrasto: cria, seleciona e emite na ordem criado → seleção', () => {
    const { el, arrastar, eventos } = montar({ 'sem-snap': '', ferramenta: 'retangulo' });
    arrastar([20, 30], [80, 70]);
    const criado = eventos.find(([n]) => n === 'prancha-elemento-criado')![1] as { elementos: ElementoGrafico[]; motivo: string };
    expect(criado.motivo).toBe('ferramenta');
    const l = limitesNaFolha(criado.elementos[0])!;
    expect(l.x).toBeCloseTo(20, 6);
    expect(l.largura).toBeCloseTo(60, 6);
    expect(l.altura).toBeCloseTo(40, 6);
    const nomes = eventos.map(([n]) => n);
    expect(nomes.indexOf('prancha-elemento-criado')).toBeLessThan(nomes.lastIndexOf('prancha-selecao'));
    expect(el.selecao).toEqual([criado.elementos[0].id]);
  });

  it('Shift faz quadrado, Alt desenha do centro; clique sem arrasto é recusado', () => {
    const { arrastar, clicar, ev } = montar({ 'sem-snap': '', ferramenta: 'retangulo' });
    arrastar([20, 20], [80, 40], { shiftKey: true });
    const q = limitesNaFolha((ev('prancha-elemento-criado')[0] as { elementos: ElementoGrafico[] }).elementos[0])!;
    expect(q.largura).toBeCloseTo(q.altura, 6);
    arrastar([100, 100], [110, 120], { altKey: true });
    const c = limitesNaFolha((ev('prancha-elemento-criado')[1] as { elementos: ElementoGrafico[] }).elementos[0])!;
    expect(c.x).toBeCloseTo(90, 6);
    expect(c.altura).toBeCloseTo(40, 6);
    clicar([150, 150]);
    expect(ev('prancha-recusa')).toContainEqual({ acao: 'desenhar', motivo: 'forma-pequena' });
  });

  it('polilinha clique a clique com Enter; Backspace desfaz o ponto; Esc cancela', () => {
    const { el, clicar, tecla, ev } = montar({ 'sem-snap': '', ferramenta: 'polilinha' });
    clicar([10, 10]);
    clicar([50, 10]);
    clicar([50, 50]);
    tecla('Backspace');
    tecla('Enter');
    const g = (ev('prancha-elemento-criado')[0] as { elementos: ElementoGrafico[] }).elementos[0].geometria;
    expect(g).toMatchObject({ tipo: 'caminho', geometria: { tipo: 'LineString', coordenadas: [[10, 10], [50, 10]].map(([x, y]) => [expect.closeTo(x, 6), expect.closeTo(y, 6)]) } });
    clicar([100, 100]);
    tecla('Escape');
    expect(ev('prancha-elemento-criado')).toHaveLength(1);
    expect(el.ferramenta).toBe('polilinha');
  });

  it('polígono fecha ao clicar no primeiro ponto; caneta puxa alça ao arrastar', () => {
    const { arrastar, clicar, ponteiro, tecla, ev, el } = montar({ 'sem-snap': '', ferramenta: 'poligono' });
    clicar([10, 10]);
    clicar([60, 10]);
    clicar([60, 60]);
    clicar([10, 10]);
    expect((ev('prancha-elemento-criado')[0] as { elementos: ElementoGrafico[] }).elementos[0].geometria).toMatchObject({ geometria: { tipo: 'Polygon' } });
    el.definirFerramenta('caneta');
    arrastar([100, 100], [120, 100]);
    ponteiro('pointermove', [140, 140]);
    clicar([160, 100]);
    tecla('Enter');
    const caneta = (ev('prancha-elemento-criado')[1] as { elementos: ElementoGrafico[] }).elementos[0].geometria;
    expect(caneta).toMatchObject({ tipo: 'caminho', geometria: { tipo: 'LineString' } });
    expect((caneta as { geometria: { curva?: unknown[] } }).geometria.curva).toHaveLength(2);
  });

  it('texto: prancha-texto-solicitado cancelável; o app conclui com o próprio texto', () => {
    const { el, clicar, ev } = montar({ 'sem-snap': '', ferramenta: 'texto' });
    el.addEventListener('prancha-texto-solicitado', (e) => {
      e.preventDefault();
      (e as CustomEvent).detail.concluir('Legenda <b>');
    }, { once: true });
    clicar([30, 40]);
    const t = (ev('prancha-elemento-criado')[0] as { elementos: ElementoGrafico[] }).elementos[0];
    expect(t.geometria).toMatchObject({ tipo: 'texto', texto: 'Legenda <b>' });
    clicar([30, 80]);
    expect((ev('prancha-elemento-criado')[1] as { elementos: ElementoGrafico[] }).elementos[0].geometria).toMatchObject({ texto: 'Texto' });
  });

  it('somente-leitura recusa desenhar', () => {
    const { arrastar, ev } = montar({ 'somente-leitura': '', ferramenta: 'retangulo' });
    arrastar([10, 10], [50, 50]);
    expect(ev('prancha-elemento-criado')).toEqual([]);
    expect(ev('prancha-recusa')).toContainEqual({ acao: 'desenhar', motivo: 'somente-leitura' });
  });
});

describe('seleção e transformação', () => {
  it('clique seleciona, Shift alterna, clique no vazio limpa', () => {
    const { el, clicar } = montar({ 'sem-snap': '' });
    el.definirElementos([ret('a', 10, 10), ret('b', 100, 100)]);
    clicar([20, 20]);
    expect(el.selecao).toEqual(['a']);
    clicar([110, 110], { shiftKey: true });
    expect(el.selecao).toEqual(['a', 'b']);
    clicar([20, 20], { shiftKey: true });
    expect(el.selecao).toEqual(['b']);
    clicar([190, 280]);
    expect(el.selecao).toEqual([]);
  });

  it('caixa da esquerda para a direita = window; da direita para a esquerda = crossing', () => {
    const { el, arrastar } = montar({ 'sem-snap': '' });
    el.definirElementos([ret('a', 10, 10), ret('b', 60, 10)]);
    arrastar([5, 5], [70, 40]);
    expect(el.selecao).toEqual(['a']);
    arrastar([70, 40], [5, 5]);
    expect(el.selecao.sort()).toEqual(['a', 'b']);
  });

  it('arrastar move: um passo no histórico, evento ao soltar, Ctrl+Z volta', () => {
    const { el, arrastar, tecla, ev } = montar({ 'sem-snap': '', 'sem-guias-inteligentes': '' });
    el.definirElementos([ret('a', 10, 10)]);
    arrastar([20, 20], [50, 40]);
    const at = ev('prancha-elemento-atualizado') as Array<{ elementos: ElementoGrafico[]; motivo: string }>;
    expect(at).toHaveLength(1);
    expect(at[0].motivo).toBe('mover');
    expect(limitesNaFolha(at[0].elementos[0])!.x).toBeCloseTo(40, 6);
    tecla('z', { ctrlKey: true });
    expect(limitesNaFolha(el.obterElemento('a')!)!.x).toBeCloseTo(10, 6);
    const todos = ev('prancha-elemento-atualizado');
    expect(todos[todos.length - 1]).toMatchObject({ motivo: 'desfazer' });
  });

  it('alça de canto escala, alça de rotação gira com passo de 45° no Shift', () => {
    const { el, arrastar, tela } = montar({ 'sem-snap': '' });
    el.definirElementos([ret('a', 10, 10, 40, 20)]);
    el.selecionarElementos(['a']);
    arrastar([50, 30], [90, 30]);
    expect(limitesNaFolha(el.obterElemento('a')!)!.largura).toBeCloseTo(80, 6);
    const v = el.obterVista();
    const [nx, ny] = tela([50, 10]);
    const alcaRot = el.paraFolha(nx, ny - 22);
    expect(alcaRot[1]).toBeLessThan(10);
    void v;
    arrastar(alcaRot, [120, 20], { shiftKey: true });
    const l = limitesNaFolha(el.obterElemento('a')!)!;
    expect(l.largura).toBeCloseTo(20, 4);
    expect(l.altura).toBeCloseTo(80, 4);
  });

  it('duplo clique entra na seleção direta; arrastar uma âncora edita; Esc conclui', () => {
    const { el, clicar, arrastar, tecla, ev } = montar({ 'sem-snap': '' });
    el.definirElementos([ret('a', 10, 10, 40, 20)]);
    clicar([20, 20]);
    clicar([20, 20]);
    expect(el.ferramenta).toBe('selecao-direta');
    expect(ev('prancha-edicao-iniciada')).toHaveLength(1);
    arrastar([10, 10], [0, 0]);
    const at = ev('prancha-elemento-atualizado') as Array<{ elementos: ElementoGrafico[]; motivo: string }>;
    expect(at[0].motivo).toBe('editar-ancoras');
    expect(at[0].elementos[0].geometria.tipo).toBe('caminho');
    expect(limitesNaFolha(el.obterElemento('a')!)!.x).toBeCloseTo(0, 6);
    tecla('Escape');
    expect(ev('prancha-edicao-concluida')).toHaveLength(1);
  });

  it('snap ao vértice de outro elemento ao mover (o ponto agarrado encaixa)', () => {
    const { el, arrastar } = montar({ 'sem-guias-inteligentes': '' });
    el.definirElementos([ret('a', 10, 10, 20, 20), ret('b', 100, 100, 20, 20)]);
    // sem seleção prévia: o clique seleciona e já arrasta (com a seleção, perto do canto estaria a alça de escala)
    arrastar([10.5, 10.5], [100.6, 100.4]);
    const l = limitesNaFolha(el.obterElemento('a')!)!;
    expect(l.x).toBeCloseTo(100, 4);
    expect(l.y).toBeCloseTo(100, 4);
  });

  it('guias inteligentes alinham a borda com a de outro elemento', () => {
    const { el, arrastar } = montar();
    el.definirElementos([ret('a', 10, 10, 20, 20), ret('b', 100, 60, 20, 20)]);
    el.selecionarElementos(['a']);
    arrastar([15, 15], [65.4, 65]);
    expect(limitesNaFolha(el.obterElemento('a')!)!.y).toBeCloseTo(60, 4);
  });
});

describe('teclado, vista, guias e comandos', () => {
  it('atalhos de ferramenta, setas (Shift ×10), Delete, Ctrl+A e Enter cria no centro', () => {
    const { el, tecla, ev } = montar({ 'sem-snap': '' });
    tecla('m');
    expect(el.ferramenta).toBe('retangulo');
    tecla('Enter');
    expect(ev('prancha-elemento-criado')).toHaveLength(1);
    tecla('v');
    const id = el.selecao[0];
    const x0 = limitesNaFolha(el.obterElemento(id)!)!.x;
    tecla('ArrowRight');
    tecla('ArrowRight', { shiftKey: true });
    expect(limitesNaFolha(el.obterElemento(id)!)!.x).toBeCloseTo(x0 + 11, 6);
    // setas seguidas viram um passo só no histórico
    el.desfazer();
    expect(limitesNaFolha(el.obterElemento(id)!)!.x).toBeCloseTo(x0, 6);
    tecla('a', { ctrlKey: true });
    tecla('Delete');
    expect(el.obterElementos()).toEqual([]);
    expect(ev('prancha-elemento-removido')).toHaveLength(1);
  });

  it('teclas não valem com o foco num campo de texto', () => {
    const { el } = montar();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    el.dispatchEvent(new PointerEvent('pointerenter'));
    const e = new KeyboardEvent('keydown', { key: 'm', bubbles: true, composed: true, cancelable: true });
    input.dispatchEvent(e);
    expect(el.ferramenta).toBe('selecao');
    expect(e.defaultPrevented).toBe(false);
  });

  it('roda dá zoom no ponto do cursor; Ctrl+0 ajusta a folha; definirZoom em %', () => {
    const { el, viewport, tecla, ev } = montar();
    const antes = el.obterVista().zoom;
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, clientX: 400, clientY: 300, bubbles: true, cancelable: true }));
    expect(el.obterVista().zoom).toBeGreaterThan(antes);
    tecla('0', { ctrlKey: true });
    expect(el.obterVista().zoom).toBeCloseTo(antes, 9);
    el.definirZoom(100);
    expect(el.obterVista().zoomPercentual).toBeCloseTo(100, 6);
    expect(ev('prancha-vista').length).toBeGreaterThanOrEqual(3);
  });

  it('guia puxada da régua vira guia e atrai o snap; arrastar de volta para a régua remove', () => {
    const { el, viewport, ev, ponteiro } = montar();
    const regua = el.shadowRoot!.getElementById('regua-h')!;
    const [, y] = el.paraTela([0, 50]);
    regua.dispatchEvent(new PointerEvent('pointerdown', { clientX: 200, clientY: -5, button: 0, pointerId: 2, bubbles: true }));
    viewport.dispatchEvent(new PointerEvent('pointermove', { clientX: 200, clientY: y, pointerId: 2, bubbles: true }));
    viewport.dispatchEvent(new PointerEvent('pointerup', { clientX: 200, clientY: y, pointerId: 2, bubbles: true }));
    expect(el.obterGuias()).toEqual([{ orientacao: 'horizontal', posicao: expect.closeTo(50, 6) }]);
    expect(ev('prancha-guias')).toHaveLength(1);
    ponteiro('pointerdown', [100, 50]);
    ponteiro('pointerup', [100, -20]);
    expect(el.obterGuias()).toEqual([]);
  });

  it('comandos pelo ui-bus (com alvo) e executarComando; desconhecido é recusado', () => {
    const { el, ev } = montar({ 'sem-snap': '' });
    el.id = 'p1';
    el.definirElementos([ret('a', 10, 10, 40, 20)]);
    el.selecionarElementos(['a']);
    UIBus.emit('prancha:comando', { alvo: 'outra', comando: 'girarSelecao', args: [90] });
    expect(ev('prancha-elemento-atualizado')).toHaveLength(0);
    UIBus.emit('prancha:comando', { alvo: 'p1', comando: 'girarSelecao', args: [90] });
    expect(limitesNaFolha(el.obterElemento('a')!)!.altura).toBeCloseTo(40, 6);
    el.executarComando('alert', ['x']);
    el.executarComando('definirElementos', [[]]);
    expect(ev('prancha-recusa').filter((r) => (r as { motivo: string }).motivo === 'comando-desconhecido')).toHaveLength(2);
    expect(el.obterElementos()).toHaveLength(1);
  });

  it('pré-definição e exportação (SVG e contexto próprio, o mesmo pintor)', () => {
    const { el, ev } = montar();
    const els = el.inserirPredefinicao('moldura-dupla');
    expect(els).toHaveLength(2);
    expect((ev('prancha-elemento-criado')[0] as { motivo: string }).motivo).toBe('predefinicao');
    expect(el.exportarSvg()).toContain('width="210mm"');
    const est = el.desenharEm(new (class { fillStyle = ''; strokeStyle = ''; lineWidth = 1; lineCap = 'butt' as CanvasLineCap; lineJoin = 'miter' as CanvasLineJoin; globalAlpha = 1; save() {} restore() {} setTransform() {} beginPath() {} moveTo() {} lineTo() {} bezierCurveTo() {} closePath() {} fill() {} stroke() {} clip() {} setLineDash() {} fillRect() {} })());
    expect(est.tracos).toBe(2);
  });
});

describe('acessibilidade, parts e tokens', () => {
  it('área de desenho focável com role application, rótulo e região viva', () => {
    const { el, viewport } = montar({ rotulo: 'Prancha A4' });
    expect(viewport.getAttribute('role')).toBe('application');
    expect(viewport.getAttribute('tabindex')).toBe('0');
    expect(viewport.getAttribute('aria-label')).toBe('Prancha A4');
    el.definirElementos([ret('a', 0, 0)]);
    el.selecionarElementos(['a']);
    expect(el.shadowRoot!.getElementById('status')!.textContent).toBe('1 elemento selecionado');
    el.definirFerramenta('caneta');
    expect(el.shadowRoot!.getElementById('status')!.textContent).toBe('Ferramenta Caneta');
  });

  it('expõe as parts documentadas', () => {
    const { el } = montar();
    const parts = [...el.shadowRoot!.querySelectorAll('[part]')].flatMap((n) => n.getAttribute('part')!.split(' '));
    for (const p of ['base', 'viewport', 'canvas', 'sobreposicao', 'regua', 'regua-horizontal', 'regua-vertical', 'canto-reguas', 'status']) expect(parts).toContain(p);
  });

  it('cores da interface vêm das variáveis --ui-prancha-* (com padrão seguro)', () => {
    const host = document.createElement('div');
    host.style.setProperty('--ui-prancha-selecao', '#123456');
    host.style.setProperty('--ui-prancha-guia', 'url(javascript:alert(1))');
    document.body.appendChild(host);
    const cores = resolverCores(host);
    expect(cores.selecao).toBe('#123456');
    expect(cores.guia).toBe(CORES_PADRAO_PRANCHA.guia);
    expect(resolverCores(null)).toEqual(CORES_PADRAO_PRANCHA);
  });
});

describe('ordem da base', () => {
  it('papel, depois grade, depois elementos (a grade fica atrás do desenho)', () => {
    const { el, ctx } = montar({ 'mostrar-grade': '' });
    el.definirElementos([ret('a', 10, 10)]);
    el.renderizarAgora();
    // a grade é o primeiro traço de 1 px (o traço do elemento tem 0,25 mm; a borda da folha vem no fim)
    const chamadas = ctx.get('base')!.chamadas;
    const grade = chamadas.findIndex(([n, , largura]) => n === 'stroke' && largura === 1);
    const elemento = chamadas.findIndex(([n, , cor]) => n === 'fill' && cor === '#ff0000');
    expect(grade).toBeGreaterThan(-1);
    expect(elemento).toBeGreaterThan(grade);
  });
});

describe('pintura durante o gesto', () => {
  it('a base não é repintada a cada quadro do arrasto: os elementos em movimento vão na sobreposição', () => {
    const { el, ctx, ponteiro } = montar({ 'sem-snap': '' });
    el.definirElementos([ret('a', 10, 10), ret('b', 100, 100)]);
    ponteiro('pointerdown', [20, 20]);
    ponteiro('pointermove', [30, 30]);
    el.renderizarAgora();
    const n = ctx.get('base')!.chamadas.length;
    ponteiro('pointermove', [40, 40]);
    el.renderizarAgora();
    ponteiro('pointermove', [50, 50]);
    el.renderizarAgora();
    expect(ctx.get('base')!.chamadas.length).toBe(n);
    expect(ctx.get('sobreposicao')!.chamadas.some(([nome, , cor]) => nome === 'fill' && cor === '#ff0000')).toBe(true);
    ponteiro('pointerup', [50, 50]);
    el.renderizarAgora();
    expect(ctx.get('base')!.chamadas.length).toBeGreaterThan(n);
  });
});
