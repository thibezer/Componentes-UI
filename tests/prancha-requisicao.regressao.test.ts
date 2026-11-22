import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/prancha';
import { criarRetangulo } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { limitesNaFolha } from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import { categoriasDePropriedades, categoriasSemSelecao, dadosParaPainelDeCamadas, eventoTratadoPelaPrancha, ligarPaineisPrancha, lerMargens } from '../src/components/ui-canvas-prancha';
import type { UIEditorPrancha } from '../src/components/ui-editor-prancha';
import { montar } from './prancha-componente-util';

/* Requisição do ConecteMapas ao kit (itens 3, 4, 9, 10, 13 a 15): componente, ciclo de vida e entrada adversária. */

afterEach(() => { document.body.innerHTML = ''; });

const ret = (id: string, x = 10, y = 10, l = 20, a = 20): ElementoGrafico =>
  criarRetangulo({ id, aparencia: { preenchimento: { cor: '#000' } } }, { x, y, largura: l, altura: a })!;

describe('modificado, revisao e marcarComoSalvo (item 9)', () => {
  it('só emite prancha-modificado nas transições', () => {
    const { el, eventos } = montar();
    const mod = (): unknown[] => eventos.filter(([n]) => n === 'prancha-modificado').map(([, d]) => d);
    el.addEventListener('prancha-modificado', (e) => eventos.push(['prancha-modificado', (e as CustomEvent).detail]));
    el.definirElementos([ret('a')]);
    expect(el.modificado).toBe(false);
    expect(mod()).toEqual([]);
    const r0 = el.revisao;
    el.selecionarElementos(['a']);
    el.moverSelecao(5, 0);
    el.moverSelecao(5, 0);
    expect(el.modificado).toBe(true);
    expect(el.revisao).toBeGreaterThan(r0);
    expect(mod()).toHaveLength(1);
    expect(mod()[0]).toMatchObject({ modificado: true });
    el.marcarComoSalvo();
    expect(el.modificado).toBe(false);
    expect(mod()).toHaveLength(2);
    el.marcarComoSalvo();
    expect(mod()).toHaveLength(2);
    el.desfazer();
    expect(el.modificado).toBe(true);
    el.definirElementos([ret('b')]); // carga nova = novo ponto salvo
    expect(el.modificado).toBe(false);
  });
});

describe('pronto e ajustarElementos (item 9)', () => {
  it('pronto resolve e emite prancha-pronta uma vez', async () => {
    const el = document.createElement('ui-canvas-prancha');
    const aviso = vi.fn();
    el.addEventListener('prancha-pronta', aviso);
    document.body.appendChild(el);
    await el.pronto;
    expect(aviso).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
    document.body.appendChild(el);
    await el.pronto;
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('ajustarElementos não altera a seleção e respeita o teto de zoom', () => {
    const { el } = montar();
    el.definirElementos([ret('a', 100, 100, 2, 2), ret('b', 110, 110, 2, 2)]);
    el.selecionarElementos(['a']);
    expect(el.ajustarElementos(undefined, { zoomMaximo: 100 })).toBe(true);
    expect(el.selecao).toEqual(['a']);
    expect(el.obterVista().zoomPercentual).toBeLessThanOrEqual(100.0001);
    // sem teto explícito o padrão (800%) também limita o enquadramento de um elemento minúsculo
    el.ajustarElementos(['a']);
    expect(el.obterVista().zoomPercentual).toBeLessThanOrEqual(800.0001);
    // o centro do elemento fica no centro da vista
    const c = el.paraTela([101, 101]);
    expect(c[0]).toBeCloseTo(400, 0);
    expect(c[1]).toBeCloseTo(300, 0);
  });

  it('entradas hostis: ids inexistentes, vazio, NaN', () => {
    const { el } = montar();
    expect(el.ajustarElementos()).toBe(false);
    el.definirElementos([ret('a')]);
    expect(el.ajustarElementos(['nao-existe'])).toBe(false);
    expect(el.ajustarElementos(null as never, { margem: NaN, zoomMaximo: -1 })).toBe(true);
    expect(Number.isFinite(el.obterVista().zoom)).toBe(true);
  });

  it('ajustar-ao-abrir: nenhum não enquadra; conteudo enquadra os elementos', () => {
    const a = montar({ 'ajustar-ao-abrir': 'nenhum' });
    expect(a.el.obterVista().zoomPercentual).toBeCloseTo(100, 0);
    const b = montar({ 'ajustar-ao-abrir': 'conteudo' });
    b.el.definirElementos([ret('x', 100, 100, 5, 5)]);
    const c = b.el.paraTela([102.5, 102.5]);
    expect(c[0]).toBeCloseTo(400, 0);
  });

  it('focus() do host entrega o foco ao viewport', () => {
    const { el, viewport } = montar();
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(viewport);
  });
});

describe('inserirPredefinicao sem caixa (item 4) e margens (item 13)', () => {
  it('nasce no centro da área visível, mesmo com a vista deslocada, selecionada', () => {
    const { el } = montar();
    el.definirZoom(200);
    el.deslocarVista(-150, -100); // vista deslocada: o centro não é o da folha
    const v = el.obterVista();
    const centro = el.paraFolha(400, 300);
    const [novo] = el.inserirPredefinicao('retangulo');
    const c = limitesNaFolha(novo)!;
    expect(c.x + c.largura / 2).toBeCloseTo(centro[0], 1);
    expect(c.y + c.altura / 2).toBeCloseTo(centro[1], 1);
    const [x0] = el.paraFolha(0, 0);
    const [x1, y1] = el.paraFolha(800, 600);
    expect(c.x).toBeGreaterThanOrEqual(Math.max(0, x0) - 1e-6);
    expect(c.x + c.largura).toBeLessThanOrEqual(x1 + 1e-6);
    expect(c.y + c.altura).toBeLessThanOrEqual(y1 + 1e-6);
    expect(el.selecao).toEqual([novo.id]);
    expect(v.zoom).toBeGreaterThan(0);
  });

  it('o tamanho acompanha o zoom (mais zoom, forma menor em mm)', () => {
    const { el } = montar();
    el.definirZoom(100);
    const a = limitesNaFolha(el.inserirPredefinicao('elipse')[0])!;
    el.definirZoom(800);
    const b = limitesNaFolha(el.inserirPredefinicao('elipse')[0])!;
    expect(b.largura).toBeLessThan(a.largura);
  });

  it('quadro: "margens" usa o quadro das margens; sem o atributo, cai na vista', () => {
    const { el } = montar({ largura: '420', altura: '297', margens: '25 10 10 10' });
    const [m] = el.inserirPredefinicao('retangulo', undefined, { quadro: 'margens' });
    const c = limitesNaFolha(m)!;
    expect([c.x, c.y, c.largura, c.altura]).toEqual([25, 10, 385, 277]);
    const sem = montar();
    const [n] = sem.el.inserirPredefinicao('retangulo', undefined, { quadro: 'margens' });
    expect(limitesNaFolha(n)!.largura).toBeLessThan(150);
  });

  it('margens: atributo inválido é ignorado; formato aceito é 1 ou 4 valores', () => {
    expect(lerMargens('25 10 10 10')).toEqual({ esquerda: 25, direita: 10, superior: 10, inferior: 10 });
    expect(lerMargens('7')).toEqual({ esquerda: 7, direita: 7, superior: 7, inferior: 7 });
    for (const ruim of [null, '', '1 2', 'a b c d', '-1 0 0 0', '1 2 3 NaN']) expect(lerMargens(ruim as never)).toBeNull();
    const { el } = montar({ margens: 'lixo' });
    expect(() => el.renderizarAgora()).not.toThrow();
    expect(() => el.setAttribute('margens', '1000 1000 1000 1000')).not.toThrow();
    expect(() => el.renderizarAgora()).not.toThrow();
  });

  it('margens no canvas: a base é repintada ao mudar o atributo', () => {
    const { el, ctx } = montar();
    el.renderizarAgora();
    const antes = ctx.get('base')!.chamadas.filter(([n]) => n === 'setLineDash').length;
    el.setAttribute('margens', '10 10 10 10');
    el.renderizarAgora();
    const depois = ctx.get('base')!.chamadas.filter(([n]) => n === 'setLineDash').length;
    expect(depois).toBeGreaterThan(antes);
  });
});

describe('teclado em hospedeiro com atalhos globais (item 10)', () => {
  it('tecla tratada pela prancha não chega ao keydown global (registrado antes) e é marcada', () => {
    const global = vi.fn();
    document.addEventListener('keydown', global);
    const { el, tecla } = montar();
    el.definirElementos([ret('a')]);
    el.selecionarElementos(['a']);
    const e = tecla('Delete');
    expect(el.obterElementos()).toHaveLength(0);
    expect(global).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(true);
    expect(eventoTratadoPelaPrancha(e)).toBe(true);
    // tecla que a prancha não trata segue para o hospedeiro
    const e2 = tecla('F7');
    expect(eventoTratadoPelaPrancha(e2)).toBe(false);
    expect(global).toHaveBeenCalledTimes(1);
    document.removeEventListener('keydown', global);
  });

  it('teclado="exclusivo": captura a página inteira, mesmo com o foco fora', () => {
    const global = vi.fn();
    window.addEventListener('keydown', global);
    const { el } = montar({ teclado: 'exclusivo' });
    el.definirElementos([ret('a')]);
    el.selecionarElementos(['a']);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(el.obterElementos()).toHaveLength(0);
    expect(global).not.toHaveBeenCalled();
    window.removeEventListener('keydown', global);
  });

  it('sem exclusivo, tecla fora da prancha não faz nada nela', () => {
    const { el } = montar();
    el.definirElementos([ret('a')]);
    el.selecionarElementos(['a']);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(el.obterElementos()).toHaveLength(1);
  });

  it('exclusivo não rouba teclas de um campo de texto da página', () => {
    const { el } = montar({ teclado: 'exclusivo' });
    el.definirElementos([ret('a')]);
    el.selecionarElementos(['a']);
    const campo = document.createElement('input');
    document.body.appendChild(campo);
    campo.focus();
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(el.obterElementos()).toHaveLength(1);
  });

  it('Esc em cadeia: gesto → seleção → prancha-esc-sem-efeito', () => {
    const { el, tecla } = montar();
    const sem = vi.fn();
    el.addEventListener('prancha-esc-sem-efeito', sem);
    el.definirElementos([ret('a')]);
    el.selecionarElementos(['a']);
    tecla('Escape');
    expect(el.selecao).toEqual([]);
    expect(sem).not.toHaveBeenCalled();
    tecla('Escape');
    expect(sem).toHaveBeenCalledTimes(1);
    tecla('Escape');
    expect(sem).toHaveBeenCalledTimes(2);
  });

  it('Esc cancela primeiro o gesto em andamento', () => {
    const { el, tecla, ponteiro } = montar();
    const sem = vi.fn();
    el.addEventListener('prancha-esc-sem-efeito', sem);
    el.definirFerramenta('retangulo');
    ponteiro('pointerdown', [20, 20]);
    ponteiro('pointermove', [60, 60]);
    tecla('Escape');
    ponteiro('pointerup', [60, 60]);
    expect(el.obterElementos()).toHaveLength(0);
    expect(sem).not.toHaveBeenCalled();
  });
});

describe('painéis sem seleção e camadas planas (itens 14 e 15)', () => {
  it('categoriasDePropriedades() do componente mostra a folha e a dica sem seleção; a função pura segue []', () => {
    const { el } = montar({ largura: '420', altura: '297', margens: '25 10 10 10' });
    const cats = el.categoriasDePropriedades();
    expect(cats).toHaveLength(1);
    const itens = cats[0].propriedades;
    expect(itens.find((i) => i.id === 'dica')!.valor).toBe('Nada selecionado');
    expect(itens.find((i) => i.id === 'dica')!.dica).toMatch(/Selecione um elemento/);
    expect(itens.find((i) => i.id === 'folha.tamanho')!.valor).toBe('420 × 297 mm');
    expect(itens.find((i) => i.id === 'folha.margens')!.valor).toContain('25');
    expect(categoriasDePropriedades([])).toEqual([]);
    el.definirElementos([ret('a')]);
    el.selecionarElementos(['a']);
    expect(el.categoriasDePropriedades().map((c) => c.id)).toContain('geometria');
    expect(categoriasSemSelecao(null as never)[0].propriedades).toHaveLength(1);
    expect(categoriasSemSelecao({ largura: NaN, altura: 1 })[0].propriedades).toHaveLength(1);
  });

  it('dadosParaPainelDeCamadas: ocultarSemCamada lista na raiz, sem pseudo-camada; com camadas definidas é ignorado', () => {
    const els = [ret('a'), ret('b')];
    const padrao = dadosParaPainelDeCamadas(els, []);
    expect(padrao.camadas.map((c) => c.id)).toEqual(['prancha:sem-camada']);
    const plano = dadosParaPainelDeCamadas(els, [], { ocultarSemCamada: true });
    expect(plano.camadas).toEqual([]);
    expect(plano.feicoes.map((f) => f.layerId)).toEqual(['', '']);
    expect(dadosParaPainelDeCamadas(els, [], { modo: 'simples' }).camadas).toEqual([]);
    const comCamadas = dadosParaPainelDeCamadas(els, [{ id: 'k' }], { ocultarSemCamada: true });
    expect(comCamadas.camadas.map((c) => c.id)).toContain('prancha:sem-camada');
    expect(dadosParaPainelDeCamadas(null as never, null as never, null as never)).toBeTruthy();
  });

  it('<ui-camadas> lista as feições da raiz sem inventar cabeçalho', () => {
    const painel = document.createElement('ui-camadas') as HTMLElement & { definirCamadas(c: unknown[], f: unknown[]): void };
    document.body.appendChild(painel);
    const d = dadosParaPainelDeCamadas([ret('a'), ret('b')], [], { ocultarSemCamada: true });
    painel.definirCamadas(d.camadas, d.feicoes);
    const arvore = painel.shadowRoot!.querySelector('#ui-layer-tree-mount')!;
    expect(arvore.querySelectorAll('.ui-layer-group')).toHaveLength(0);
    expect(arvore.textContent).not.toContain('Sem camada');
    expect(painel.shadowRoot!.innerHTML).toContain('a');
  });
});

describe('ligarPaineisPrancha e <ui-editor-prancha> (item 3, Regra #2)', () => {
  function paineis() {
    const paleta = document.createElement('div') as HTMLElement & { ferramentas?: unknown; valor?: unknown };
    const camadas = Object.assign(document.createElement('div'), { definirCamadas: vi.fn(), selecionarFeicoes: vi.fn() });
    const propriedades = document.createElement('div') as HTMLElement & { categorias?: unknown };
    return { paleta, camadas, propriedades };
  }

  it('liga, reage, desliga e religa sem duplicar ouvintes', () => {
    const { el } = montar();
    const p = paineis();
    const desligar = ligarPaineisPrancha({ prancha: el, ...p });
    expect(Array.isArray(p.paleta.ferramentas)).toBe(true);
    const n0 = p.camadas.definirCamadas.mock.calls.length;
    el.definirElementos([ret('a')]);
    el.selecionarElementos(['a']);
    expect(p.camadas.selecionarFeicoes).toHaveBeenLastCalledWith(['a']);
    expect((p.propriedades.categorias as unknown[]).length).toBeGreaterThan(1);
    p.paleta.dispatchEvent(new CustomEvent('ui-change', { detail: { valor: 'retangulo' } }));
    expect(el.ferramenta).toBe('retangulo');
    p.propriedades.dispatchEvent(new CustomEvent('ui-propriedade-alterada', { detail: { id: 'elemento.nome', valor: 'X' } }));
    expect(el.obterElemento('a')!.nome).toBe('X');
    desligar();
    desligar(); // idempotente
    const chamadas = p.camadas.definirCamadas.mock.calls.length;
    el.moverSelecao(1, 1);
    expect(p.camadas.definirCamadas.mock.calls.length).toBe(chamadas);
    expect(chamadas).toBeGreaterThanOrEqual(n0);
    // religa: um evento da prancha atualiza o painel UMA vez
    const d2 = ligarPaineisPrancha({ prancha: el, ...p });
    const base = p.camadas.definirCamadas.mock.calls.length;
    el.moverSelecao(1, 1);
    expect(p.camadas.definirCamadas.mock.calls.length - base).toBe(1);
    d2();
  });

  it('camada: eventos do painel mudam as camadas da prancha; ids e payloads hostis não lançam', () => {
    const { el } = montar();
    el.definirCamadas([{ id: 'k', nome: 'K' }]);
    const p = paineis();
    const d = ligarPaineisPrancha({ prancha: el, ...p });
    p.camadas.dispatchEvent(new CustomEvent('ui-camada-visibilidade', { detail: { camadaId: 'k', visivel: false } }));
    expect(el.obterCamadas()[0].visivel).toBe(false);
    for (const nome of ['ui-camada-visibilidade', 'ui-camada-renomeada', 'ui-feicao-movida', 'ui-camadas-reordenadas', 'ui-feicoes-selecionadas', 'ui-camada-adicionar']) {
      expect(() => p.camadas.dispatchEvent(new CustomEvent(nome, { detail: null }))).not.toThrow();
      expect(() => p.camadas.dispatchEvent(new CustomEvent(nome, { detail: { camadaId: {}, feicoesIds: 5, camadas: 'x' } }))).not.toThrow();
    }
    expect(el.obterCamadas().length).toBeGreaterThanOrEqual(2); // ui-camada-adicionar
    d();
    expect(ligarPaineisPrancha(null as never)).toBeTypeOf('function');
    expect(() => ligarPaineisPrancha({ prancha: el })()).not.toThrow();
  });

  it('<ui-editor-prancha>: conecta, desconecta e reconecta sem duplicar; concluir e Esc emitem os eventos', async () => {
    const ed = document.createElement('ui-editor-prancha') as UIEditorPrancha;
    ed.setAttribute('largura', '297');
    ed.setAttribute('altura', '210');
    ed.setAttribute('margens', '10 10 10 10');
    document.body.appendChild(ed);
    expect(ed.prancha.getAttribute('largura')).toBe('297');
    expect(ed.prancha.getAttribute('teclado')).toBe('isolado');
    ed.elementos = [ret('a')];
    const concluir = vi.fn();
    const cancelar = vi.fn();
    ed.addEventListener('editor-concluir', (e) => concluir((e as CustomEvent).detail));
    ed.addEventListener('editor-cancelar', (e) => cancelar((e as CustomEvent).detail));
    document.body.removeChild(ed);
    document.body.appendChild(ed);
    document.body.removeChild(ed);
    document.body.appendChild(ed);
    ed.shadowRoot!.getElementById('concluir')!.click();
    expect(concluir).toHaveBeenCalledTimes(1);
    expect(concluir.mock.calls[0][0]).toMatchObject({ modificado: false });
    expect(concluir.mock.calls[0][0].elementos).toHaveLength(1);
    ed.shadowRoot!.getElementById('cancelar')!.click();
    expect(cancelar).toHaveBeenCalledTimes(1);
    // Esc sem nada a cancelar na prancha → editor-cancelar (uma vez, não duplicado pela reconexão)
    ed.prancha.dispatchEvent(new CustomEvent('prancha-esc-sem-efeito'));
    expect(cancelar).toHaveBeenCalledTimes(2);
    // pré-definição do menu com o quadro das margens
    (ed.shadowRoot!.querySelector('button[data-predefinicao="moldura-dupla"]') as HTMLButtonElement).click();
    expect(ed.elementos.length).toBe(3);
    await ed.pronto;
  });

  it('<ui-editor-prancha> com entradas hostis não lança', () => {
    const ed = document.createElement('ui-editor-prancha') as UIEditorPrancha;
    document.body.appendChild(ed);
    expect(() => { ed.elementos = null as never; ed.camadas = 'x' as never; ed.setAttribute('margens', '<img>'); ed.setAttribute('largura', 'NaN'); }).not.toThrow();
    ed.elementos = [null, 5, { id: 'x' }] as never;
    expect(ed.elementos).toEqual([]);
  });
});
