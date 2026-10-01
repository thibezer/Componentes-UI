import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-ribbon';
import './ui-paleta-ferramentas';
import { UIRibbon } from './ui-ribbon';
import { UIPaletaFerramentas } from './ui-paleta-ferramentas';
import { ICONES_FERRAMENTAS } from './ferramentas-icones';
import type { RibbonAba, FerramentaItem } from './tipos';

const abasExemplo = (): RibbonAba[] => [
  {
    id: 'inicio',
    rotulo: 'Início',
    grupos: [
      {
        id: 'area',
        rotulo: 'Área de transferência',
        itens: [
          { id: 'colar', rotulo: 'Colar', tamanho: 'grande', icone: ICONES_FERRAMENTAS.colar },
          { id: 'copiar', rotulo: 'Copiar' },
          { id: 'recortar', rotulo: 'Recortar' },
          { id: 'formato', rotulo: 'Pincel' },
          { id: 'neg', rotulo: 'Negrito', tipo: 'toggle', somenteIcone: true }
        ]
      },
      {
        id: 'desenho',
        rotulo: 'Desenho',
        itens: [
          {
            id: 'linha-menu',
            rotulo: 'Linha',
            tamanho: 'grande',
            filhos: [
              { id: 'linha', rotulo: 'Linha', atalho: 'L' },
              { id: 'xlinha', rotulo: 'Linha de construção', disabled: true },
              { id: 'polilinha', rotulo: 'Polilinha' }
            ]
          }
        ]
      }
    ]
  },
  { id: 'inserir', rotulo: 'Inserir', grupos: [{ id: 'g', rotulo: 'Blocos', itens: [{ id: 'bloco', rotulo: 'Bloco' }] }] },
  { id: 'ctx', rotulo: 'Edição de Polilinha', contextual: true, oculta: true, grupos: [] }
];

const btn = (host: HTMLElement, id: string) =>
  host.shadowRoot!.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${id}"]`)!;

describe('Web Component: <ui-ribbon>', () => {
  let ribbon: UIRibbon;

  beforeEach(() => {
    document.body.innerHTML = '';
    ribbon = document.createElement('ui-ribbon') as UIRibbon;
    ribbon.abas = abasExemplo();
    document.body.appendChild(ribbon);
  });

  it('registra o elemento e ativa a primeira aba visível', () => {
    expect(customElements.get('ui-ribbon')).toBeDefined();
    const tabs = ribbon.shadowRoot!.querySelectorAll('.ui-ribbon__aba');
    expect(tabs.length).toBe(2); // aba contextual oculta não aparece
    expect(ribbon.abaAtiva).toBe('inicio');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  it('agrupa botões pequenos em colunas de até 3 e mantém botões grandes separados', () => {
    const colunas = ribbon.shadowRoot!.querySelectorAll('.ui-ribbon__grupo[data-id="area"] .ui-ribbon__coluna');
    expect(colunas.length).toBe(2); // 4 pequenos → 3 + 1
    expect(colunas[0].querySelectorAll('.ui-ferr-btn').length).toBe(3);
    expect(btn(ribbon, 'colar').classList.contains('ui-ferr-btn--grande')).toBe(true);
  });

  it('troca de aba ao clicar e dispara ui-aba-change', () => {
    const spy = vi.fn();
    ribbon.addEventListener('ui-aba-change', spy);
    ribbon.shadowRoot!.querySelectorAll<HTMLButtonElement>('.ui-ribbon__aba')[1].click();
    expect(ribbon.abaAtiva).toBe('inserir');
    expect(ribbon.getAttribute('aba-ativa')).toBe('inserir');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.id).toBe('inserir');
    expect(btn(ribbon, 'bloco')).toBeTruthy();
  });

  it('dispara ui-ferramenta ao clicar em um botão de ação', () => {
    const spy = vi.fn();
    ribbon.addEventListener('ui-ferramenta', spy);
    btn(ribbon, 'copiar').click();
    const d = spy.mock.calls[0][0].detail;
    expect(d.id).toBe('copiar');
    expect(d.origem).toBe('ribbon');
    expect(d.aba).toBe('inicio');
  });

  it('alterna o estado de itens toggle', () => {
    btn(ribbon, 'neg').click();
    expect(btn(ribbon, 'neg').getAttribute('aria-pressed')).toBe('true');
    expect(btn(ribbon, 'neg').classList.contains('ui-ferr-btn--ativo')).toBe(true);
    btn(ribbon, 'neg').click();
    expect(btn(ribbon, 'neg').getAttribute('aria-pressed')).toBe('false');
  });

  it('abre menu, ignora item desabilitado e dispara o filho escolhido com o pai', () => {
    const spy = vi.fn();
    ribbon.addEventListener('ui-ferramenta', spy);

    btn(ribbon, 'linha-menu').click();
    const menu = ribbon.shadowRoot!.querySelector('.ui-ferr-menu')!;
    expect(menu).toBeTruthy();
    expect(btn(ribbon, 'linha-menu').getAttribute('aria-expanded')).toBe('true');

    const itens = menu.querySelectorAll<HTMLButtonElement>('.ui-ferr-menu__item');
    expect(itens.length).toBe(3);
    expect(itens[1].disabled).toBe(true);

    itens[2].click();
    expect(ribbon.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();
    const d = spy.mock.calls[0][0].detail;
    expect(d.id).toBe('polilinha');
    expect(d.pai.id).toBe('linha-menu');
  });

  it('fecha o menu com Escape e ao clicar de novo no botão', () => {
    btn(ribbon, 'linha-menu').click();
    expect(ribbon.shadowRoot!.querySelector('.ui-ferr-menu')).toBeTruthy();
    btn(ribbon, 'linha-menu').click();
    expect(ribbon.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();

    btn(ribbon, 'linha-menu').click();
    ribbon.shadowRoot!.querySelector('.ui-ferr-menu')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(ribbon.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();
  });

  it('navega entre abas com as setas', () => {
    const tab0 = ribbon.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ribbon__aba')!;
    tab0.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(ribbon.abaAtiva).toBe('inserir');
  });

  it('usa roving tabindex e move o foco com ArrowRight no painel', () => {
    const botoes = Array.from(ribbon.shadowRoot!.querySelectorAll<HTMLButtonElement>('.ui-ferr-btn'));
    expect(botoes.filter(b => b.tabIndex === 0).length).toBe(1);
    botoes[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(botoes[0].tabIndex).toBe(-1);
    expect(botoes[1].tabIndex).toBe(0);
  });

  it('mostra aba contextual via definirAbaVisivel', () => {
    ribbon.definirAbaVisivel('ctx', true);
    const tabs = ribbon.shadowRoot!.querySelectorAll('.ui-ribbon__aba');
    expect(tabs.length).toBe(3);
    expect(tabs[2].classList.contains('ui-ribbon__aba--contextual')).toBe(true);
  });

  it('atualizarItem altera estado sem recriar o botão', () => {
    const antes = btn(ribbon, 'copiar');
    ribbon.atualizarItem('copiar', { disabled: true });
    expect(btn(ribbon, 'copiar')).toBe(antes);
    expect(antes.disabled).toBe(true);
  });

  it('alterna recolhido com duplo clique na aba', () => {
    const tab = ribbon.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ribbon__aba')!;
    tab.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(ribbon.recolhido).toBe(true);
    tab.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(ribbon.recolhido).toBe(false);
  });

  it('remove atributos perigosos de ícones SVG', () => {
    ribbon.atualizarItem('copiar', {
      icone: '<svg viewBox="0 0 24 24" onload="alert(1)"><script>alert(1)</script><path d="M0 0" onclick="x()"/></svg>'
    });
    const html = btn(ribbon, 'copiar').innerHTML;
    expect(html).not.toContain('onload');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<script');
  });
});

const ferramentasExemplo = (): FerramentaItem[] => [
  { id: 'selecionar', rotulo: 'Selecionar', atalho: 'V', icone: ICONES_FERRAMENTAS.selecionar },
  { id: 'mao', rotulo: 'Mão', atalho: 'H', icone: ICONES_FERRAMENTAS.mao },
  { id: 'sep', tipo: 'separador' },
  {
    id: 'g-forma',
    filhos: [
      { id: 'retangulo', rotulo: 'Retângulo', atalho: 'M', icone: ICONES_FERRAMENTAS.retangulo },
      { id: 'circulo', rotulo: 'Círculo', atalho: 'M', icone: ICONES_FERRAMENTAS.circulo },
      { id: 'linha', rotulo: 'Linha', atalho: 'L', icone: ICONES_FERRAMENTAS.linha }
    ]
  },
  { id: 'grade', rotulo: 'Grade', tipo: 'toggle', icone: ICONES_FERRAMENTAS.grade },
  { id: 'desfazer', rotulo: 'Desfazer', tipo: 'botao', icone: ICONES_FERRAMENTAS.desfazer }
];

describe('Web Component: <ui-paleta-ferramentas>', () => {
  let paleta: UIPaletaFerramentas;

  beforeEach(() => {
    document.body.innerHTML = '';
    paleta = document.createElement('ui-paleta-ferramentas') as UIPaletaFerramentas;
    paleta.ferramentas = ferramentasExemplo();
    document.body.appendChild(paleta);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registra o elemento e exibe a primeira ferramenta de cada grupo', () => {
    expect(customElements.get('ui-paleta-ferramentas')).toBeDefined();
    expect(btn(paleta, 'retangulo')).toBeTruthy();
    expect(btn(paleta, 'circulo')).toBeNull();
    expect(btn(paleta, 'retangulo').classList.contains('ui-ferr-btn--grupo')).toBe(true);
    expect(paleta.shadowRoot!.querySelectorAll('.ui-paleta__sep').length).toBe(1);
  });

  it('ativa ferramentas de forma exclusiva e dispara ui-change', () => {
    const spy = vi.fn();
    paleta.addEventListener('ui-change', spy);

    btn(paleta, 'selecionar').click();
    expect(paleta.valor).toBe('selecionar');
    btn(paleta, 'mao').click();
    expect(paleta.valor).toBe('mao');
    expect(btn(paleta, 'selecionar').getAttribute('aria-pressed')).toBe('false');
    expect(btn(paleta, 'mao').getAttribute('aria-pressed')).toBe('true');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1][0].detail.anterior).toBe('selecionar');
  });

  it('abre flyout com botão direito e troca a ferramenta exibida no grupo', () => {
    btn(paleta, 'retangulo').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    const menu = paleta.shadowRoot!.querySelector('.ui-ferr-menu')!;
    expect(menu).toBeTruthy();

    menu.querySelectorAll<HTMLButtonElement>('.ui-ferr-menu__item')[1].click(); // Círculo
    expect(paleta.valor).toBe('circulo');
    expect(btn(paleta, 'circulo')).toBeTruthy();
    expect(btn(paleta, 'retangulo')).toBeNull();
    expect(btn(paleta, 'circulo').classList.contains('ui-ferr-btn--ativo')).toBe(true);
  });

  it('abre flyout com clique longo e suprime o clique seguinte', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    paleta.addEventListener('ui-ferramenta', spy);

    const b = btn(paleta, 'retangulo');
    b.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(paleta.shadowRoot!.querySelector('.ui-ferr-menu')).toBeTruthy();

    b.click(); // click gerado após soltar o ponteiro
    expect(spy).not.toHaveBeenCalled();
    expect(paleta.valor).toBe('');
  });

  it('cancela o clique longo se o ponteiro for solto antes', () => {
    vi.useFakeTimers();
    const b = btn(paleta, 'retangulo');
    b.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    b.dispatchEvent(new Event('pointerup', { bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(paleta.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();
  });

  it('abre flyout por teclado com ArrowRight (vertical)', () => {
    const b = btn(paleta, 'retangulo');
    b.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(paleta.shadowRoot!.querySelector('.ui-ferr-menu')).toBeTruthy();
  });

  it('itens toggle e botao não alteram a ferramenta ativa', () => {
    btn(paleta, 'selecionar').click();
    const spy = vi.fn();
    paleta.addEventListener('ui-ferramenta', spy);

    btn(paleta, 'grade').click();
    expect(btn(paleta, 'grade').getAttribute('aria-pressed')).toBe('true');
    btn(paleta, 'desfazer').click();

    expect(paleta.valor).toBe('selecionar');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(btn(paleta, 'desfazer').hasAttribute('aria-pressed')).toBe(false);
  });

  it('ativa por atalho apenas quando o atributo atalhos está presente', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
    expect(paleta.valor).toBe('');

    paleta.setAttribute('atalhos', '');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
    expect(paleta.valor).toBe('mao');
  });

  it('percorre o grupo quando várias ferramentas compartilham a mesma tecla', () => {
    paleta.setAttribute('atalhos', '');
    const tecla = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    tecla();
    expect(paleta.valor).toBe('retangulo');
    tecla();
    expect(paleta.valor).toBe('circulo');
    tecla();
    expect(paleta.valor).toBe('retangulo');
  });

  it('ignora atalhos ao digitar em campos de texto', () => {
    paleta.setAttribute('atalhos', '');
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true, composed: true }));
    expect(paleta.valor).toBe('');
  });

  it('não ativa ferramentas desabilitadas', () => {
    paleta.atualizarItem('mao', { disabled: true });
    paleta.ativar('mao');
    expect(paleta.valor).toBe('');
  });

  it('aplica orientação, colunas e tamanho', () => {
    paleta.setAttribute('colunas', '2');
    paleta.setAttribute('tamanho', 'sm');
    const raiz = paleta.shadowRoot!.querySelector('.ui-paleta')!;
    expect(raiz.classList.contains('ui-paleta--cols-2')).toBe(true);
    expect(raiz.classList.contains('ui-paleta--sm')).toBe(true);

    paleta.setAttribute('orientacao', 'horizontal');
    expect(paleta.shadowRoot!.querySelector('.ui-paleta')!.classList.contains('ui-paleta--horizontal')).toBe(true);
    expect(paleta.shadowRoot!.querySelector('.ui-paleta')!.classList.contains('ui-paleta--cols-2')).toBe(false);
  });

  it('respeita o atributo valor inicial dentro de um grupo', () => {
    document.body.innerHTML = '';
    const p = document.createElement('ui-paleta-ferramentas') as UIPaletaFerramentas;
    p.setAttribute('valor', 'linha');
    p.ferramentas = ferramentasExemplo();
    document.body.appendChild(p);
    expect(p.valor).toBe('linha');
    expect(btn(p, 'linha').classList.contains('ui-ferr-btn--ativo')).toBe(true);
  });
});
