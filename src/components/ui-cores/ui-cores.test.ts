import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index';
import { normalizarCor, normalizarOpacidade, coresUnicas } from './cores-utils';
import { UISeletorCor, abrirSeletorCor, fecharSeletorCor } from './ui-seletor-cor';
import { UIControleCores } from './ui-controle-cores';
import type { DetalheControleCores, DetalheSeletorCor } from './tipos';

const ultimo = <T>(lista: T[]): T | undefined => lista[lista.length - 1];
const seletorNoDom = () => document.querySelector('ui-seletor-cor') as UISeletorCor | null;
const sr = (el: Element) => el.shadowRoot!;
const tecla = (key: string, extra: KeyboardEventInit = {}) =>
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }));
const pointerdownEm = (alvo: EventTarget) =>
  alvo.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));

afterEach(() => {
  fecharSeletorCor(false);
  document.body.innerHTML = '';
});

describe('cores-utils', () => {
  it('normaliza cores hexadecimais e "sem cor"', () => {
    expect(normalizarCor('#ABC')).toBe('#aabbcc');
    expect(normalizarCor(' #00E08A ')).toBe('#00e08a');
    expect(normalizarCor('transparent')).toBe('none');
    expect(normalizarCor('NONE')).toBe('none');
    expect(normalizarCor('red')).toBeNull();
    expect(normalizarCor('#12345')).toBeNull();
    expect(normalizarCor(undefined)).toBeNull();
  });

  it('limita a opacidade e descarta valores inválidos', () => {
    expect(normalizarOpacidade(1.4)).toBe(1);
    expect(normalizarOpacidade(-1)).toBe(0);
    expect(normalizarOpacidade('0.5')).toBe(0.5);
    expect(normalizarOpacidade('abc', 0.2)).toBe(0.2);
  });

  it('remove cores repetidas, inválidas e "sem cor"', () => {
    expect(coresUnicas(['#fff', '#FFFFFF', 'none', 'azul', '#000'])).toEqual(['#ffffff', '#000000']);
    expect(coresUnicas(null)).toEqual([]);
  });
});

describe('<ui-seletor-cor>', () => {
  let ancora: HTMLButtonElement;

  beforeEach(() => {
    ancora = document.createElement('button');
    document.body.appendChild(ancora);
  });

  it('modo duplo: troca de alvo, cor e opacidade com eventos de pré-visualização', () => {
    const alteracoes: DetalheSeletorCor[] = [];
    const alvos: string[] = [];
    abrirSeletorCor({
      ancora,
      preenchimento: '#10b981',
      traco: '#ef4444',
      opacidade: 0.35,
      aoAlterar: (d) => alteracoes.push(d),
      aoTrocarAlvo: (a) => alvos.push(a)
    });
    const el = seletorNoDom()!;
    expect(el.alvo).toBe('preenchimento');
    expect(el.cor).toBe('#10b981');
    expect(sr(el).querySelectorAll('[data-alvo]').length).toBe(2);
    expect((sr(el).querySelector('.opacidade') as HTMLElement).hidden).toBe(false);

    el.trocarAlvo('traco');
    expect(alvos).toEqual(['traco']);
    expect(el.cor).toBe('#ef4444');
    expect((sr(el).querySelector('.opacidade') as HTMLElement).hidden).toBe(true);

    el.definirCor('#38BDF8');
    expect(ultimo(alteracoes)).toMatchObject({ alvo: 'traco', cor: '#38bdf8', traco: '#38bdf8', preenchimento: '#10b981' });

    el.trocarAlvo('preenchimento');
    el.definirOpacidade(0.75);
    expect(ultimo(alteracoes)).toMatchObject({ opacidade: 0.75, preenchimento: '#10b981', traco: '#38bdf8' });
  });

  it('ignora cores inválidas', () => {
    const alteracoes: DetalheSeletorCor[] = [];
    abrirSeletorCor({ ancora, preenchimento: '#10b981', traco: '#ffffff', aoAlterar: (d) => alteracoes.push(d) });
    seletorNoDom()!.definirCor('vermelho');
    expect(alteracoes).toHaveLength(0);
    expect(seletorNoDom()!.cor).toBe('#10b981');
  });

  it('Concluir confirma, remove o painel e devolve o estado final', () => {
    let confirmado: DetalheSeletorCor | null = null;
    const aberto = abrirSeletorCor({ ancora, preenchimento: '#10b981', traco: '#ffffff', aoConfirmar: (d) => (confirmado = d) });
    const el = seletorNoDom()!;
    el.definirCor('#000000');
    (sr(el).querySelector('[data-acao="concluir"]') as HTMLElement).click();
    expect(confirmado).toMatchObject({ preenchimento: '#000000', traco: '#ffffff' });
    expect(seletorNoDom()).toBeNull();
    expect(aberto.aberto).toBe(false);
  });

  it('Cancelar restaura as cores iniciais sem confirmar', () => {
    const alteracoes: DetalheSeletorCor[] = [];
    let confirmou = false;
    let cancelado: DetalheSeletorCor | null = null;
    abrirSeletorCor({
      ancora,
      preenchimento: '#10b981',
      traco: '#ffffff',
      opacidade: 0.35,
      aoAlterar: (d) => alteracoes.push(d),
      aoConfirmar: () => (confirmou = true),
      aoCancelar: (d) => (cancelado = d)
    });
    const el = seletorNoDom()!;
    el.definirCor('#000000');
    el.trocarAlvo('traco');
    el.definirCor('#ff0000');
    el.definirOpacidade(0.9);
    (sr(el).querySelector('[data-acao="cancelar"]') as HTMLElement).click();

    expect(confirmou).toBe(false);
    expect(cancelado).toMatchObject({ preenchimento: '#10b981', traco: '#ffffff', opacidade: 0.35 });
    expect(ultimo(alteracoes)).toMatchObject({ preenchimento: '#10b981', traco: '#ffffff', opacidade: 0.35 });
    expect(seletorNoDom()).toBeNull();
  });

  it('modo simples edita uma cor e respeita mostrarOpacidade', () => {
    let confirmado: DetalheSeletorCor | null = null;
    abrirSeletorCor({ ancora, cor: '#ABCDEF', mostrarOpacidade: false, aoConfirmar: (d) => (confirmado = d) });
    const el = seletorNoDom()!;
    expect(sr(el).querySelector('.abas')).toBeNull();
    expect((sr(el).querySelector('.opacidade') as HTMLElement).hidden).toBe(true);
    expect(el.cor).toBe('#abcdef');
    el.definirCor('none');
    el.confirmar();
    expect(confirmado).toMatchObject({ cor: 'none' });
  });

  it('amostras, "sem cor", cores do projeto e hexadecimal', () => {
    const alteracoes: DetalheSeletorCor[] = [];
    abrirSeletorCor({
      ancora,
      preenchimento: '#10b981',
      traco: '#ffffff',
      coresProjeto: ['#123456', '#123456', 'none'],
      aoAlterar: (d) => alteracoes.push(d)
    });
    const el = seletorNoDom()!;
    const raiz = sr(el);
    expect(raiz.querySelectorAll('.amostra[data-cor="#123456"]').length).toBe(1);

    (raiz.querySelector('.amostra[data-cor="#123456"]') as HTMLElement).click();
    expect(el.cor).toBe('#123456');
    expect(raiz.querySelector('.amostra[data-cor="#123456"]')!.classList.contains('ativo')).toBe(true);

    (raiz.querySelector('.sem-cor') as HTMLElement).click();
    expect(el.cor).toBe('none');
    expect(raiz.querySelector('.sem-cor')!.classList.contains('ativo')).toBe(true);

    const hex = raiz.querySelector('.hex-entrada') as HTMLInputElement;
    hex.value = 'fa0';
    hex.dispatchEvent(new Event('input'));
    expect(el.cor).toBe('none'); // 3 dígitos só valem ao confirmar o campo
    hex.dispatchEvent(new Event('change'));
    expect(el.cor).toBe('#ffaa00');
  });

  it('mostra MISTO até uma cor ser escolhida', () => {
    abrirSeletorCor({ ancora, preenchimento: '#10b981', traco: '#ffffff', misto: true });
    const el = seletorNoDom()!;
    const rotulo = () => sr(el).querySelector('.previa-rotulo-nova')!.textContent;
    expect(rotulo()).toBe('MISTO (?)');
    el.definirCor('#000000');
    expect(rotulo()).toBe('NOVA');
  });

  it('X alterna o alvo; com Ctrl ou Shift não', () => {
    abrirSeletorCor({ ancora, preenchimento: '#10b981', traco: '#ffffff' });
    const el = seletorNoDom()!;
    tecla('x');
    expect(el.alvo).toBe('traco');
    tecla('x', { ctrlKey: true });
    tecla('X', { shiftKey: true });
    expect(el.alvo).toBe('traco');
  });

  it('Esc e clique fora confirmam; clique na âncora não fecha', () => {
    let confirmacoes = 0;
    abrirSeletorCor({ ancora, preenchimento: '#10b981', traco: '#ffffff', aoConfirmar: () => confirmacoes++ });
    pointerdownEm(ancora);
    expect(seletorNoDom()).not.toBeNull();
    pointerdownEm(sr(seletorNoDom()!).querySelector('.amostra')!);
    expect(seletorNoDom()).not.toBeNull();
    tecla('Escape');
    expect(confirmacoes).toBe(1);
    expect(seletorNoDom()).toBeNull();

    abrirSeletorCor({ ancora, preenchimento: '#10b981', traco: '#ffffff', aoConfirmar: () => confirmacoes++ });
    pointerdownEm(document.body);
    expect(confirmacoes).toBe(2);
    expect(seletorNoDom()).toBeNull();
  });

  it('posiciona ao lado da âncora sem sair da janela (usa o tamanho de layout, não o da animação)', () => {
    const proto = UISeletorCor.prototype as any;
    Object.defineProperty(proto, 'offsetWidth', { configurable: true, get: () => 260 });
    Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => 480 });
    try {
      const rect = (left: number, top: number, w: number, h: number) =>
        ({ left, top, right: left + w, bottom: top + h, width: w, height: h, x: left, y: top, toJSON() {} }) as DOMRect;

      ancora.getBoundingClientRect = () => rect(40, 100, 20, 20);
      abrirSeletorCor({ ancora, cor: '#fff' });
      expect(seletorNoDom()!.style.left).toBe('70px');
      expect(seletorNoDom()!.style.top).toBe('100px');

      // Perto da borda de baixo: sobe até caber; perto da direita: vai para a esquerda da âncora
      ancora.getBoundingClientRect = () => rect(window.innerWidth - 30, window.innerHeight - 40, 20, 20);
      abrirSeletorCor({ ancora, cor: '#fff' });
      expect(seletorNoDom()!.style.top).toBe(`${window.innerHeight - 480 - 10}px`);
      expect(seletorNoDom()!.style.left).toBe(`${window.innerWidth - 30 - 260 - 10}px`);
    } finally {
      delete proto.offsetWidth;
      delete proto.offsetHeight;
    }
  });

  it('abrir outro seletor descarta o anterior sem confirmar', () => {
    let confirmacoes = 0;
    abrirSeletorCor({ ancora, preenchimento: '#10b981', traco: '#ffffff', aoConfirmar: () => confirmacoes++ });
    abrirSeletorCor({ ancora, cor: '#000000' });
    expect(document.querySelectorAll('ui-seletor-cor').length).toBe(1);
    expect(confirmacoes).toBe(0);
  });

  it('pode ser usado direto no DOM com configurar()', () => {
    const el = document.createElement('ui-seletor-cor') as UISeletorCor;
    el.configurar({ titulo: 'Cor <b>', cor: '#fff' });
    document.body.appendChild(el);
    expect(sr(el).querySelector('.titulo')!.textContent).toContain('Cor <b>');
    expect(sr(el).querySelector('.titulo b')).toBeNull();
    expect(el.cor).toBe('#ffffff');
  });
});

describe('<ui-controle-cores>', () => {
  let el: UIControleCores;
  let eventos: DetalheControleCores[];
  let alvos: string[];

  const amostra = (alvo: string) => sr(el).querySelector(`[data-alvo="${alvo}"]`) as HTMLElement;
  const face = (alvo: string) => amostra(alvo).querySelector('.face') as HTMLElement;
  const botao = (acao: string) => sr(el).querySelector(`[data-acao="${acao}"]`) as HTMLElement;

  beforeEach(() => {
    el = document.createElement('ui-controle-cores') as UIControleCores;
    el.setAttribute('preenchimento', '#10b981');
    el.setAttribute('traco', '#3b82f6');
    el.setAttribute('padrao-preenchimento', '#10b981');
    el.setAttribute('padrao-traco', '#ffffff');
    document.body.appendChild(el);
    eventos = [];
    alvos = [];
    el.addEventListener('ui-cores-change', (e) => eventos.push((e as CustomEvent).detail));
    el.addEventListener('ui-alvo-change', (e) => alvos.push((e as CustomEvent).detail.alvo));
  });

  it('lê os atributos iniciais e pinta as amostras', () => {
    expect(el.obterCores()).toEqual({ preenchimento: '#10b981', traco: '#3b82f6', opacidade: 0.35, alvo: 'preenchimento' });
    expect(face('preenchimento').style.backgroundColor).not.toBe('');
    expect(face('traco').style.borderColor).not.toBe('');
    expect(amostra('preenchimento').classList.contains('amostra--ativa')).toBe(true);
  });

  it('definirCores, definirAlvo e definirMisto não emitem eventos', () => {
    el.definirCores({ preenchimento: '#000', traco: 'none', opacidade: 0.5 });
    el.definirAlvo('traco');
    el.definirMisto({ preenchimento: true });
    expect(eventos).toHaveLength(0);
    expect(alvos).toHaveLength(0);
    expect(el.obterCores()).toEqual({ preenchimento: '#000000', traco: 'none', opacidade: 0.5, alvo: 'traco' });
    expect(face('preenchimento').classList.contains('face--misto')).toBe(true);
    expect(face('traco').classList.contains('face--sem-cor')).toBe(true);
  });

  it('definirCores ignora valores inválidos e limpa o estado misto da cor definida', () => {
    el.definirMisto({ preenchimento: true, traco: true });
    el.definirCores({ preenchimento: 'xyz', traco: '#fff' });
    expect(el.preenchimento).toBe('#10b981');
    expect(face('preenchimento').classList.contains('face--misto')).toBe(true);
    expect(face('traco').classList.contains('face--misto')).toBe(false);
  });

  it('alternarAlvo emite ui-alvo-change', () => {
    el.alternarAlvo();
    expect(el.alvo).toBe('traco');
    expect(alvos).toEqual(['traco']);
    expect(amostra('traco').classList.contains('amostra--ativa')).toBe(true);
  });

  it('inverter, sem cor e padrão emitem ui-cores-change confirmado', () => {
    botao('inverter').click();
    expect(ultimo(eventos)).toMatchObject({ preenchimento: '#3b82f6', traco: '#10b981', confirmado: true, alterados: ['preenchimento', 'traco'], origem: 'inverter' });

    el.definirAlvo('traco');
    botao('sem-cor').click();
    expect(ultimo(eventos)).toMatchObject({ traco: 'none', confirmado: true, alterados: ['traco'], origem: 'sem-cor' });

    botao('padrao').click();
    expect(ultimo(eventos)).toMatchObject({ preenchimento: '#10b981', traco: '#ffffff', confirmado: true, origem: 'padrao' });
  });

  it('semCor aceita o alvo explícito', () => {
    el.semCor('preenchimento');
    expect(el.preenchimento).toBe('none');
    expect(ultimo(eventos)!.alterados).toEqual(['preenchimento']);
  });

  it('inverter leva o estado misto junto', () => {
    el.definirMisto({ preenchimento: true });
    el.inverter();
    expect(face('traco').classList.contains('face--misto')).toBe(true);
    expect(face('preenchimento').classList.contains('face--misto')).toBe(false);
  });

  it('padrao-preenchimento atualiza o ícone e a cor restaurada', () => {
    el.setAttribute('padrao-preenchimento', '#abcdef');
    expect((sr(el).querySelector('.ponto--preenchimento') as HTMLElement).style.backgroundColor).not.toBe('');
    el.restaurarPadrao();
    expect(el.preenchimento).toBe('#abcdef');
  });

  it('clique na amostra inativa ativa; no alvo ativo abre e fecha o seletor', () => {
    amostra('traco').click();
    expect(el.alvo).toBe('traco');
    expect(alvos).toEqual(['traco']);
    expect(seletorNoDom()).toBeNull();

    amostra('traco').click();
    expect(el.seletorAberto).toBe(true);
    expect(seletorNoDom()!.alvo).toBe('traco');

    amostra('traco').click();
    expect(el.seletorAberto).toBe(false);
    expect(seletorNoDom()).toBeNull();
  });

  it('Enter abre o seletor no alvo da amostra', () => {
    amostra('traco').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(el.alvo).toBe('traco');
    expect(seletorNoDom()!.alvo).toBe('traco');
  });

  it('o seletor pré-visualiza (confirmado false) e confirma só o que mudou', () => {
    el.abrirSeletor('preenchimento');
    const seletor = seletorNoDom()!;
    seletor.definirCor('#000000');
    expect(ultimo(eventos)).toMatchObject({ preenchimento: '#000000', confirmado: false, alterados: ['preenchimento'], origem: 'seletor' });
    expect(el.preenchimento).toBe('#000000');

    seletor.trocarAlvo('traco');
    expect(el.alvo).toBe('traco');
    expect(alvos).toEqual(['traco']);

    seletor.confirmar();
    expect(ultimo(eventos)).toMatchObject({ preenchimento: '#000000', traco: '#3b82f6', confirmado: true, alterados: ['preenchimento'], origem: 'seletor' });
    expect(el.seletorAberto).toBe(false);
  });

  it('confirmar sem mudanças ainda emite, com alterados vazio', () => {
    el.abrirSeletor();
    seletorNoDom()!.confirmar();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ confirmado: true, alterados: [] });
  });

  it('cancelar no seletor restaura as cores e não confirma', () => {
    el.abrirSeletor();
    const seletor = seletorNoDom()!;
    seletor.definirCor('#000000');
    seletor.definirOpacidade(0.9);
    seletor.cancelar();
    expect(el.obterCores()).toMatchObject({ preenchimento: '#10b981', opacidade: 0.35 });
    expect(eventos.every((e) => e.confirmado === false)).toBe(true);
    expect(ultimo(eventos)).toMatchObject({ preenchimento: '#10b981', opacidade: 0.35 });
    expect(el.seletorAberto).toBe(false);
  });

  it('passa misto e cores do projeto ao seletor', () => {
    el.coresProjeto = ['#111111', '#111111', '#222222'];
    el.definirMisto({ preenchimento: true });
    el.abrirSeletor('preenchimento');
    const raiz = sr(seletorNoDom()!);
    expect(raiz.querySelector('.previa-rotulo-nova')!.textContent).toBe('MISTO (?)');
    expect(raiz.querySelectorAll('.amostra[data-cor="#111111"]').length).toBe(1);
    expect(raiz.querySelector('.amostra[data-cor="#222222"]')).not.toBeNull();
  });

  it('desabilitado não abre o seletor', () => {
    el.setAttribute('desabilitado', '');
    el.abrirSeletor();
    expect(seletorNoDom()).toBeNull();
  });

  it('sair do DOM com o seletor aberto confirma a edição', () => {
    el.abrirSeletor();
    seletorNoDom()!.definirCor('#000000');
    el.remove();
    expect(seletorNoDom()).toBeNull();
    expect(ultimo(eventos)).toMatchObject({ preenchimento: '#000000', confirmado: true });
  });

  it('atalhos aparecem nas dicas', () => {
    el.atalhos = { inverter: 'Shift+X', semCor: '/', padrao: 'D', alternar: 'X' };
    expect(botao('inverter').title).toBe('Inverter preenchimento e traço [Shift+X]');
    expect(botao('sem-cor').title).toBe('Sem cor no alvo ativo [/]');
    expect(botao('padrao').title).toBe('Restaurar cores padrão [D]');
    expect(amostra('traco').title).toContain('[X]');
  });
});
