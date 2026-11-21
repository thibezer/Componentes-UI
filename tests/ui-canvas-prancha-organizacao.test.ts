import { describe, it, expect, afterEach } from 'vitest';
import { UIBus } from '../src/core/ui-bus';
import { criarElipse, criarLinha, criarRetangulo } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { limitesNaFolha } from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import { ancorasDoElemento } from '../src/gerencigeo-canvas/prancha/elemento_edicao';
import { limparAreaDeTransferencia } from '../src/components/ui-canvas-prancha/prancha-comandos-organizacao';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import { montar } from './prancha-componente-util';

/* Fase 4 da prancha, Camada B (+ C): organização e operações no componente (ponteiro, teclado, API e ui-bus). */

afterEach(() => {
  document.body.innerHTML = '';
  limparAreaDeTransferencia();
});

const cor = (c: string) => ({ preenchimento: { cor: c } });
const ret = (id: string, x: number, y: number, w = 20, h = 20, extra: Partial<ElementoGrafico> = {}): ElementoGrafico =>
  ({ ...criarRetangulo({ id, aparencia: cor('#ff0000') }, { x, y, largura: w, altura: h })!, ...extra });
const ultimo = <T>(l: T[]): T => l[l.length - 1];

describe('camadas', () => {
  it('ordem, camada oculta (não pinta nem seleciona), bloqueada (não seleciona), camada ativa e mover para camada', () => {
    const { el, ctx, clicar, arrastar, ev } = montar({ 'sem-snap': '' });
    el.definirElementos([
      ret('a', 10, 10, 20, 20, { camadaId: 'frente', aparencia: cor('#00ff00') }),
      ret('b', 10, 10, 20, 20, { camadaId: 'fundo', aparencia: cor('#0000ff') }),
      ret('c', 100, 100, 20, 20, { camadaId: 'oculta', aparencia: cor('#ff00ff') }),
      ret('d', 150, 150, 20, 20, { camadaId: 'trava' })
    ]);
    el.definirCamadas([{ id: 'fundo' }, { id: 'frente' }, { id: 'oculta', visivel: false }, { id: 'trava', bloqueada: true }]);
    expect(ev('prancha-camadas')).toHaveLength(1);
    el.renderizarAgora();
    const fills = ctx.get('base')!.chamadas.filter(([n]) => n === 'fill').map(([, , c]) => c);
    expect(fills.indexOf('#0000ff')).toBeLessThan(fills.indexOf('#00ff00'));
    expect(fills).not.toContain('#ff00ff');
    clicar([15, 15]);
    expect(el.selecao).toEqual(['a']);
    clicar([110, 110]);
    clicar([160, 160]);
    expect(el.selecao).toEqual([]);
    el.definirCamadaAtiva('fundo');
    el.definirFerramenta('retangulo');
    arrastar([50, 50], [70, 70]);
    expect(el.obterElemento(el.selecao[0])!.camadaId).toBe('fundo');
    el.definirFerramenta('selecao');
    expect(el.moverSelecaoParaCamada('frente')).toBe(true);
    expect(el.obterElemento(el.selecao[0])!.camadaId).toBe('frente');
    expect(el.moverSelecaoParaCamada('nao-existe')).toBe(false);
  });

  it('o hit-test usa a ordem do documento, não a do índice espacial (300 sobrepostos: vence o último)', () => {
    const { el, clicar } = montar();
    el.definirElementos(Array.from({ length: 300 }, (_, i) => ret(`e${i}`, 10 + (i % 7) * 0.01, 10, 30, 30)));
    clicar([20, 20]);
    expect(el.selecao).toEqual(['e299']);
  });
});

describe('ordem, grupos, isolamento, bloquear e ocultar', () => {
  it('Ctrl+Shift+] traz para a frente (prancha-ordem) e Ctrl+Z desfaz a ordem', () => {
    const { el, tecla, ev } = montar();
    el.definirElementos([ret('a', 0, 0), ret('b', 0, 0), ret('c', 0, 0)]);
    el.selecionarElementos(['a']);
    tecla(']', { ctrlKey: true, shiftKey: true, code: 'BracketRight' });
    expect(el.obterElementos().map((e) => e.id)).toEqual(['b', 'c', 'a']);
    expect(ultimo(ev('prancha-ordem')) as { ids: string[] }).toMatchObject({ ids: ['b', 'c', 'a'], motivo: 'ordem' });
    tecla('[', { ctrlKey: true, code: 'BracketLeft' });
    expect(el.obterElementos().map((e) => e.id)).toEqual(['b', 'a', 'c']);
    el.desfazer();
    el.desfazer();
    expect(el.obterElementos().map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('Ctrl+G agrupa: clicar num membro seleciona o grupo; duplo clique isola; Esc sai; Ctrl+Shift+G desagrupa', () => {
    const { el, tecla, clicar, ev } = montar({ 'sem-snap': '' });
    el.definirElementos([ret('a', 10, 10), ret('b', 60, 10), ret('c', 120, 10)]);
    el.selecionarElementos(['a', 'b']);
    tecla('g', { ctrlKey: true });
    const g = el.obterElemento('a')!.grupoId;
    expect(g).toBeTruthy();
    expect(el.obterElemento('b')!.grupoId).toBe(g);
    clicar([130, 20]);
    clicar([20, 20]);
    expect(el.selecao.sort()).toEqual(['a', 'b']);
    clicar([20, 20]);
    expect(ultimo(ev('prancha-isolamento'))).toEqual({ grupoId: g });
    expect(el.selecao).toEqual(['a']);
    clicar([130, 20]);
    expect(el.selecao).toEqual([]);
    tecla('Escape');
    expect(ultimo(ev('prancha-isolamento'))).toEqual({ grupoId: null });
    el.selecionarElementos(['a']);
    tecla('g', { ctrlKey: true, shiftKey: true });
    expect(el.obterElementos().some((e) => e.grupoId)).toBe(false);
  });

  it('Ctrl+2 bloqueia (sai da seleção); Ctrl+Alt+2 desbloqueia e seleciona; Ctrl+3 / Ctrl+Alt+3 ocultam e mostram', () => {
    const { el, tecla, clicar } = montar();
    el.definirElementos([ret('a', 10, 10), ret('b', 60, 10)]);
    el.selecionarElementos(['a']);
    tecla('2', { ctrlKey: true, code: 'Digit2' });
    expect(el.obterElemento('a')!.bloqueado).toBe(true);
    expect(el.selecao).toEqual([]);
    clicar([20, 20]);
    expect(el.selecao).toEqual([]);
    tecla('2', { ctrlKey: true, altKey: true, code: 'Digit2' });
    expect(el.obterElemento('a')!.bloqueado).toBeUndefined();
    expect(el.selecao).toEqual(['a']);
    el.selecionarElementos(['b']);
    tecla('3', { ctrlKey: true, code: 'Digit3' });
    expect(el.obterElemento('b')!.oculto).toBe(true);
    tecla('3', { ctrlKey: true, altKey: true, code: 'Digit3' });
    expect(el.obterElemento('b')!.oculto).toBeUndefined();
  });
});

describe('alinhar, distribuir, duplicar e transformar de novo', () => {
  it('alinhar à seleção e à folha; distribuir; sem seleção é recusado', () => {
    const { el, ev } = montar();
    el.definirElementos([ret('a', 10, 10), ret('b', 50, 40), ret('c', 120, 25)]);
    expect(el.alinharSelecao('topo')).toBe(false);
    expect(ev('prancha-recusa')).toContainEqual({ acao: 'alinhar', motivo: 'sem-selecao' });
    el.selecionarElementos(['a', 'b', 'c']);
    el.alinharSelecao('topo');
    expect(el.obterElementos().map((e) => limitesNaFolha(e)!.y)).toEqual([10, 10, 10]);
    el.distribuirSelecao('horizontal', 'espacos');
    expect(limitesNaFolha(el.obterElemento('b')!)!.x).toBeCloseTo(65, 9);
    el.selecionarElementos(['a']);
    el.alinharSelecao('centro-horizontal', 'folha');
    expect(limitesNaFolha(el.obterElemento('a')!)!.x).toBeCloseTo(95, 9);
    expect((ultimo(ev('prancha-elemento-atualizado')) as { motivo: string }).motivo).toBe('alinhar');
  });

  it('Alt + arrastar duplica (originais ficam); Ctrl+D repete com o mesmo deslocamento', () => {
    const { el, arrastar, tecla, ev } = montar({ 'sem-snap': '', 'sem-guias-inteligentes': '' });
    el.definirElementos([ret('a', 10, 10)]);
    arrastar([20, 20], [50, 20], { altKey: true });
    expect(limitesNaFolha(el.obterElemento('a')!)!.x).toBe(10);
    const criados = ev('prancha-elemento-criado') as Array<{ elementos: ElementoGrafico[]; motivo: string }>;
    expect(criados[0].motivo).toBe('duplicar');
    expect(limitesNaFolha(criados[0].elementos[0])!.x).toBeCloseTo(40, 9);
    expect(el.selecao).toEqual([criados[0].elementos[0].id]);
    tecla('d', { ctrlKey: true });
    expect(el.obterElementos()).toHaveLength(3);
    expect(limitesNaFolha(el.obterElemento(el.selecao[0])!)!.x).toBeCloseTo(70, 9);
  });

  it('Ctrl+C / Ctrl+V (deslocado), Ctrl+Shift+V (no lugar), Ctrl+X; ids novos', () => {
    const { el, tecla, ev } = montar();
    el.definirElementos([ret('a', 10, 10)]);
    el.selecionarElementos(['a']);
    tecla('c', { ctrlKey: true });
    tecla('v', { ctrlKey: true });
    tecla('v', { ctrlKey: true, shiftKey: true });
    const colados = (ev('prancha-elemento-criado') as Array<{ elementos: ElementoGrafico[]; motivo: string }>).map((d) => d.elementos[0]);
    expect(colados.map((e) => limitesNaFolha(e)!.x)).toEqual([15, 10]);
    expect(new Set(el.obterElementos().map((e) => e.id)).size).toBe(3);
    el.selecionarElementos(['a']);
    tecla('x', { ctrlKey: true });
    expect(el.obterElemento('a')).toBeNull();
    tecla('v', { ctrlKey: true });
    expect(el.obterElementos()).toHaveLength(3);
  });
});

describe('conta-gotas e ferramentas de âncora', () => {
  it('I: aplica a aparência da origem na seleção; sem seleção guarda para as formas novas', () => {
    const { el, tecla, clicar, ev } = montar();
    el.definirElementos([ret('alvo', 10, 10), ret('fonte', 60, 10, 20, 20, { aparencia: { preenchimento: { cor: '#00ffaa' }, traco: { espessura: 1 } } })]);
    el.selecionarElementos(['alvo']);
    tecla('i');
    expect(el.ferramenta).toBe('conta-gotas');
    clicar([70, 20]);
    expect(el.obterElemento('alvo')!.aparencia).toEqual({ preenchimento: { cor: '#00ffaa' }, traco: { espessura: 1 } });
    expect(ev('prancha-conta-gotas')).toHaveLength(1);
    el.limparSelecao();
    clicar([70, 20]);
    expect(el.obterOpcoesFerramentas().aparencia).toEqual({ preenchimento: { cor: '#00ffaa' }, traco: { espessura: 1 } });
  });

  it('+ adiciona âncora no trecho; − exclui; Shift+C converte para suave', () => {
    const { el, tecla, clicar } = montar();
    el.definirElementos([ret('r', 10, 10, 40, 20)]);
    el.selecionarElementos(['r']);
    tecla('+');
    clicar([30, 10]);
    expect(ancorasDoElemento(el.obterElemento('r')!)).toHaveLength(5);
    tecla('-');
    clicar([30, 10]);
    expect(ancorasDoElemento(el.obterElemento('r')!)).toHaveLength(4);
    tecla('C', { shiftKey: true });
    expect(el.ferramenta).toBe('converter-ancora');
    clicar([50, 30]);
    const g = el.obterElemento('r')!.geometria as { geometria: { curva?: unknown[] } };
    expect(g.geometria.curva).toBeDefined();
  });
});

describe('máscara de recorte e operações de caminho', () => {
  it('Ctrl+7 cria a máscara (pintura com clip); Ctrl+Alt+7 libera', () => {
    const { el, tecla, ctx } = montar();
    el.definirElementos([ret('img', 10, 10, 60, 60), criarElipse({ id: 'circ' }, { x: 20, y: 20, largura: 40, altura: 40 })!]);
    el.selecionarElementos(['img', 'circ']);
    tecla('7', { ctrlKey: true, code: 'Digit7' });
    expect(el.obterElemento('circ')!.mascara).toBe(true);
    expect(el.obterElemento('img')!.recorteId).toBe('circ');
    el.renderizarAgora();
    expect(ctx.get('base')!.nomes()).toContain('clip');
    expect(el.exportarSvg()).toContain('clip-path');
    el.selecionarElementos(['img']);
    tecla('7', { ctrlKey: true, altKey: true, code: 'Digit7' });
    expect(el.obterElemento('circ')!.mascara).toBeUndefined();
  });

  it('unir (Ctrl+J), dividir, deslocar caminho, contorno do traço, simplificar e converter em caminho', () => {
    const { el, tecla } = montar();
    el.definirElementos([criarLinha({ id: 'l1' }, [10, 10], [50, 10])!, criarLinha({ id: 'l2' }, [50, 10], [50, 50])!]);
    el.selecionarElementos(['l1', 'l2']);
    tecla('j', { ctrlKey: true });
    expect(el.obterElementos().map((e) => e.id)).toEqual(['l1']);
    el.definirElementos([ret('q', 10, 10, 40, 20), criarLinha({ id: 'corte' }, [30, 0], [30, 40])!]);
    el.selecionarElementos(['q', 'corte']);
    expect(el.dividirSelecao()).toBe(true);
    expect(el.obterElementos()).toHaveLength(2);
    expect(el.obterElemento('corte')).toBeNull();
    el.definirElementos([ret('q', 10, 10, 40, 20, { aparencia: { traco: { espessura: 1 } } })]);
    el.selecionarElementos(['q']);
    expect(el.deslocarCaminho(3)).toBe(true);
    expect(el.obterElementos()).toHaveLength(2);
    el.selecionarElementos(['q']);
    expect(el.contornarTraco()).toBe(true);
    expect(el.obterElemento('q')!.aparencia?.traco).toBeNull();
    expect(el.simplificarSelecao(0.5)).toBe(true);
    el.definirElementos([criarElipse({ id: 'e' }, { x: 0, y: 0, largura: 10, altura: 10 })!]);
    el.selecionarElementos(['e']);
    expect(el.converterEmCaminho()).toBe(true);
    expect(el.obterElemento('e')!.geometria.tipo).toBe('caminho');
  });

  it('comandos da Fase 4 pelo ui-bus', () => {
    const { el } = montar();
    el.id = 'p4';
    el.definirElementos([ret('a', 10, 10), ret('b', 60, 10)]);
    el.selecionarElementos(['a', 'b']);
    UIBus.emit('prancha:comando', { alvo: 'p4', comando: 'alinharSelecao', args: ['esquerda'] });
    expect(limitesNaFolha(el.obterElemento('b')!)!.x).toBe(10);
    UIBus.emit('prancha:comando', { alvo: 'p4', comando: 'agruparSelecao' });
    expect(el.obterElemento('a')!.grupoId).toBeTruthy();
    // agrupados, viram uma unidade: alinhar entre si não tem o que mover
    expect(el.alinharSelecao('direita')).toBe(false);
  });
});

describe('robustez (Camada C)', () => {
  it('comandos sem seleção, somente-leitura e argumentos hostis não lançam nem mudam o documento', () => {
    const { el, ev } = montar({ 'somente-leitura': '' });
    el.definirElementos([ret('a', 10, 10)]);
    const antes = el.obterElementos();
    const chamadas: Array<() => unknown> = [
      () => el.trazerParaFrente(), () => el.agruparSelecao(), () => el.alinharSelecao('nada' as never), () => el.distribuirSelecao('x' as never),
      () => el.colar(), () => el.transformarDeNovo(), () => el.unirSelecao(NaN), () => el.deslocarCaminho(NaN),
      () => el.definirCamadas(null as never), () => el.definirCamadaAtiva(42 as never), () => el.isolarGrupo('nao-existe'),
      () => el.aplicarAparencia({ traco: { espessura: NaN } }), () => el.moverSelecaoParaCamada(null as never)
    ];
    for (const f of chamadas) expect(f).not.toThrow();
    el.selecionarElementos(['a']);
    for (const f of [() => el.duplicarSelecao([NaN, 1]), () => el.criarMascara(), () => el.recortar(), () => el.bloquearSelecao()]) expect(f).not.toThrow();
    expect(el.obterElementos()).toEqual(antes);
    expect(ev('prancha-recusa').some((r) => (r as { motivo: string }).motivo === 'somente-leitura')).toBe(true);
  });
});
