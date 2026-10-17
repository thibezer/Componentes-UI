import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-ribbon';
import './ui-paleta-ferramentas';
import { UIRibbon } from './ui-ribbon';
import { UIPaletaFerramentas } from './ui-paleta-ferramentas';
import type { RibbonAba, FerramentaItem } from './tipos';

const abas = (): RibbonAba[] => [
  {
    id: 'inicio',
    rotulo: 'Início',
    grupos: [
      {
        id: 'g1',
        rotulo: 'Geral',
        itens: [
          { id: 'copiar', rotulo: 'Copiar' },
          { id: 'neg', rotulo: 'Negrito', tipo: 'toggle' },
          {
            id: 'menu',
            rotulo: 'Menu',
            filhos: [
              { id: 'm1', rotulo: 'Um' },
              { id: 'm2', rotulo: 'Dois', tipo: 'toggle' }
            ]
          }
        ]
      }
    ]
  },
  { id: 'inserir', rotulo: 'Inserir', grupos: [{ id: 'g2', rotulo: 'Blocos', itens: [{ id: 'bloco', rotulo: 'Bloco' }] }] },
  { id: 'ctx', rotulo: 'Contexto', contextual: true, oculta: true, grupos: [{ id: 'g3', rotulo: 'C', itens: [{ id: 'c1', rotulo: 'C1' }] }] }
];

const ferr = (): FerramentaItem[] => [
  { id: 'sel', rotulo: 'Selecionar', atalho: 'V' },
  { id: 'mao', rotulo: 'Mão', atalho: 'H' },
  {
    id: 'grp',
    filhos: [
      { id: 'a', rotulo: 'A', disabled: true },
      { id: 'b', rotulo: 'B' },
      { id: 'c', rotulo: 'C' }
    ]
  },
  { id: 'grade', rotulo: 'Grade', tipo: 'toggle' }
];

const btn = (host: HTMLElement, id: string) =>
  host.shadowRoot!.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${id}"]`)!;

describe('<ui-ribbon> — revisão', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('aba-ativa definido antes de abas fica pendente e é aplicado depois', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.setAttribute('aba-ativa', 'inserir');
    document.body.appendChild(r);
    r.abas = abas();
    expect(r.abaAtiva).toBe('inserir');
    expect(btn(r, 'bloco')).toBeTruthy();
  });

  it('aba-ativa de aba oculta é aplicado quando ela é exibida', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.setAttribute('aba-ativa', 'ctx');
    r.abas = abas();
    document.body.appendChild(r);
    expect(r.abaAtiva).toBe('inicio');
    r.definirAbaVisivel('ctx', true);
    expect(r.abaAtiva).toBe('ctx');
  });

  it('definirAbaVisivel(false) na aba ativa emite ui-aba-change e atualiza o atributo', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = abas();
    document.body.appendChild(r);
    const spy = vi.fn();
    r.addEventListener('ui-aba-change', spy);
    r.definirAbaVisivel('inicio', false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.id).toBe('inserir');
    expect(r.getAttribute('aba-ativa')).toBe('inserir');
  });

  it('ui-ferramenta é cancelável e preventDefault reverte o toggle', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = abas();
    document.body.appendChild(r);
    r.addEventListener('ui-ferramenta', e => e.preventDefault());
    btn(r, 'neg').click();
    expect(btn(r, 'neg').getAttribute('aria-pressed')).toBe('false');
    expect(r.abas[0].grupos[0].itens[1].ativo).toBeFalsy();
  });

  it('emite ui-recolhido-change ao alternar recolhido', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = abas();
    document.body.appendChild(r);
    const spy = vi.fn();
    r.addEventListener('ui-recolhido-change', spy);
    r.recolhido = true;
    r.recolhido = false;
    expect(spy.mock.calls.map(c => c[0].detail.recolhido)).toEqual([true, false]);
  });

  it('não emite ui-recolhido-change para o atributo inicial', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    const spy = vi.fn();
    r.addEventListener('ui-recolhido-change', spy);
    r.setAttribute('recolhido', '');
    document.body.appendChild(r);
    expect(spy).not.toHaveBeenCalled();
  });

  it('expõe compacto como propriedade', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.compacto = true;
    expect(r.hasAttribute('compacto')).toBe(true);
    r.compacto = false;
    expect(r.hasAttribute('compacto')).toBe(false);
  });

  it('liga abas e painel por aria-controls / aria-labelledby e aceita aria-label', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.setAttribute('aria-label', 'Comandos');
    r.setAttribute('rotulo-abas', 'Seções');
    r.abas = abas();
    document.body.appendChild(r);
    const raiz = r.shadowRoot!;
    const aba = raiz.querySelector<HTMLElement>('.ui-ribbon__aba[aria-selected="true"]')!;
    const painel = raiz.querySelector<HTMLElement>('[role="tabpanel"]')!;
    expect(aba.getAttribute('aria-controls')).toBe(painel.id);
    expect(painel.getAttribute('aria-labelledby')).toBe(aba.id);
    expect(raiz.querySelector('[role="toolbar"]')!.getAttribute('aria-label')).toBe('Comandos');
    expect(raiz.querySelector('[role="tablist"]')!.getAttribute('aria-label')).toBe('Seções');
  });

  it('usa rotuloAcessivel, depois o nome do ícone, como nome acessível (não o id)', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = [
      {
        id: 'a',
        rotulo: 'A',
        grupos: [
          {
            id: 'g',
            rotulo: 'G',
            itens: [
              { id: 'btn_x1', icone: 'copiar', somenteIcone: true, rotuloAcessivel: 'Copiar seleção' },
              { id: 'btn_x2', icone: 'colar' }
            ]
          }
        ]
      }
    ];
    document.body.appendChild(r);
    expect(btn(r, 'btn_x1').getAttribute('aria-label')).toBe('Copiar seleção');
    expect(btn(r, 'btn_x2').getAttribute('aria-label')).toBe('colar');
  });

  it('menu: roles menuitemcheckbox, aria-controls e devolve o foco ao botão ao escolher', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = abas();
    document.body.appendChild(r);
    const botao = btn(r, 'menu');
    botao.click();
    const menu = r.shadowRoot!.querySelector('.ui-ferr-menu')!;
    expect(botao.getAttribute('aria-controls')).toBe(menu.id);
    const itens = menu.querySelectorAll<HTMLElement>('.ui-ferr-menu__item');
    expect(itens[0].getAttribute('role')).toBe('menuitem');
    expect(itens[1].getAttribute('role')).toBe('menuitemcheckbox');
    expect(itens[1].getAttribute('aria-checked')).toBe('false');
    itens[0].click();
    expect(botao.hasAttribute('aria-controls')).toBe(false);
    expect(r.shadowRoot!.activeElement).toBe(botao);
  });

  it('ArrowDown com o menu aberto foca o primeiro item em vez de fechar', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = abas();
    document.body.appendChild(r);
    const botao = btn(r, 'menu');
    botao.click(); // detail 0 em jsdom → abre com foco no primeiro item
    botao.focus();
    botao.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(r.shadowRoot!.querySelector('.ui-ferr-menu')).toBeTruthy();
    expect(r.shadowRoot!.activeElement?.classList.contains('ui-ferr-menu__item')).toBe(true);
  });

  it('rolar a página fecha o menu aberto', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = abas();
    document.body.appendChild(r);
    btn(r, 'menu').click();
    window.dispatchEvent(new Event('scroll'));
    expect(r.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();
  });

  it('atualizarItem de outra aba não re-renderiza nem fecha o menu', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = abas();
    document.body.appendChild(r);
    btn(r, 'menu').click();
    r.atualizarItem('bloco', { rotulo: 'Novo' });
    expect(r.shadowRoot!.querySelector('.ui-ferr-menu')).toBeTruthy();
    r.selecionarAba('inserir');
    expect(btn(r, 'bloco').getAttribute('aria-label')).toBe('Novo');
  });

  it('atualizarItem só de estado preserva o foco e o roving tabindex', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = abas();
    document.body.appendChild(r);
    btn(r, 'copiar').focus();
    r.atualizarItem('copiar', { disabled: true });
    const botoes = Array.from(r.shadowRoot!.querySelectorAll<HTMLButtonElement>('.ui-ferr-btn'));
    expect(botoes.filter(b => b.tabIndex === 0)).toHaveLength(1);
    expect(btn(r, 'copiar').tabIndex).toBe(-1);
  });

  it('re-render por atualizarItem (rótulo) mantém o foco no mesmo botão', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = abas();
    document.body.appendChild(r);
    btn(r, 'neg').focus();
    r.atualizarItem('neg', { rotulo: 'Bold' });
    expect(r.shadowRoot!.activeElement).toBe(btn(r, 'neg'));
    expect(btn(r, 'neg').tabIndex).toBe(0);
  });

  it('o roving tabindex acompanha o botão que recebe foco', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = abas();
    document.body.appendChild(r);
    btn(r, 'neg').focus();
    expect(btn(r, 'neg').tabIndex).toBe(0);
    expect(btn(r, 'copiar').tabIndex).toBe(-1);
  });

  it('avisa sobre ids duplicados', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = document.createElement('ui-ribbon') as UIRibbon;
    const a = abas();
    a[1].grupos[0].itens.push({ id: 'copiar', rotulo: 'Outro' });
    r.abas = a;
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('duplicados'));
    aviso.mockRestore();
  });

  it('reconectar o elemento não duplica listeners (um clique = um evento)', () => {
    const r = document.createElement('ui-ribbon') as UIRibbon;
    r.abas = abas();
    document.body.appendChild(r);
    r.remove();
    document.body.appendChild(r);
    const spy = vi.fn();
    r.addEventListener('ui-ferramenta', spy);
    btn(r, 'copiar').click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('<ui-paleta-ferramentas> — revisão', () => {
  let paleta: UIPaletaFerramentas;
  const montar = (attrs: Record<string, string> = {}) => {
    paleta = document.createElement('ui-paleta-ferramentas') as UIPaletaFerramentas;
    Object.entries(attrs).forEach(([k, v]) => paleta.setAttribute(k, v));
    return paleta;
  };

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('valor definido antes de ferramentas (atributo) fica pendente e é aplicado', () => {
    montar({ valor: 'mao' });
    document.body.appendChild(paleta);
    expect(paleta.valor).toBe('');
    paleta.ferramentas = ferr();
    expect(paleta.valor).toBe('mao');
    expect(btn(paleta, 'mao').getAttribute('aria-pressed')).toBe('true');
  });

  it('valor pendente dentro de um grupo torna o filho o exibido', () => {
    montar({ valor: 'c' });
    document.body.appendChild(paleta);
    paleta.ferramentas = ferr();
    expect(paleta.shadowRoot!.querySelector('[data-grupo="grp"]')!.getAttribute('data-id')).toBe('c');
  });

  it('valor = "" limpa a seleção, emite ui-change e remove o atributo', () => {
    montar({ valor: 'sel' });
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    const spy = vi.fn();
    paleta.addEventListener('ui-change', spy);
    paleta.valor = '';
    expect(paleta.valor).toBe('');
    expect(paleta.hasAttribute('valor')).toBe(false);
    expect(spy.mock.calls[0][0].detail).toMatchObject({ valor: '', item: null, anterior: 'sel' });
    expect(btn(paleta, 'sel').getAttribute('aria-pressed')).toBe('false');
  });

  it('removeAttribute("valor") também limpa a seleção', () => {
    montar({ valor: 'sel' });
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    paleta.removeAttribute('valor');
    expect(paleta.valor).toBe('');
  });

  it('reflete no atributo "value" quando é ele que o consumidor usa', () => {
    montar({ value: 'sel' });
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    paleta.valor = 'mao';
    expect(paleta.getAttribute('value')).toBe('mao');
    expect(paleta.hasAttribute('valor')).toBe(false);
  });

  it('avisa ao ativar id inexistente, desabilitado ou de outro tipo', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    montar();
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    paleta.valor = 'nao-existe';
    paleta.valor = 'a';
    paleta.valor = 'grade';
    expect(aviso).toHaveBeenCalledTimes(3);
    expect(paleta.valor).toBe('');
    aviso.mockRestore();
  });

  it('avisa sobre ids duplicados', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    montar();
    paleta.ferramentas = [...ferr(), { id: 'sel', rotulo: 'Repetido' }];
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('duplicados'));
    aviso.mockRestore();
  });

  it('o grupo exibe o primeiro filho habilitado (pula desabilitado)', () => {
    montar();
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    expect(paleta.shadowRoot!.querySelector('[data-grupo="grp"]')!.getAttribute('data-id')).toBe('b');
  });

  it('o grupo nunca exibe um separador como representante', () => {
    montar();
    paleta.ferramentas = [{ id: 'g', filhos: [{ id: 'sp', tipo: 'separador' }, { id: 'x', rotulo: 'X' }] }];
    document.body.appendChild(paleta);
    expect(paleta.shadowRoot!.querySelector('[data-grupo="g"]')!.getAttribute('data-id')).toBe('x');
  });

  it('ui-ferramenta é cancelável: preventDefault reverte a ferramenta ativa', () => {
    montar({ valor: 'sel' });
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    paleta.addEventListener('ui-ferramenta', e => e.preventDefault());
    btn(paleta, 'mao').click();
    expect(paleta.valor).toBe('sel');
  });

  it('preventDefault reverte o toggle', () => {
    montar();
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    paleta.addEventListener('ui-ferramenta', e => e.preventDefault());
    btn(paleta, 'grade').click();
    expect(btn(paleta, 'grade').getAttribute('aria-pressed')).toBe('false');
  });

  it('toggle não recria os botões (foco preservado)', () => {
    montar();
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    const antes = btn(paleta, 'grade');
    antes.focus();
    antes.click();
    expect(btn(paleta, 'grade')).toBe(antes);
    expect(paleta.shadowRoot!.activeElement).toBe(antes);
  });

  it('atualizarItem só de estado atualiza o botão sem recriá-lo', () => {
    montar();
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    const antes = btn(paleta, 'grade');
    paleta.atualizarItem('grade', { ativo: true });
    expect(btn(paleta, 'grade')).toBe(antes);
    expect(antes.getAttribute('aria-pressed')).toBe('true');
  });

  it('re-render mantém o foco no botão do grupo', () => {
    montar();
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    paleta.shadowRoot!.querySelector<HTMLButtonElement>('[data-grupo="grp"]')!.focus();
    paleta.ativar('c');
    const g = paleta.shadowRoot!.querySelector('[data-grupo="grp"]')!;
    expect(paleta.shadowRoot!.activeElement).toBe(g);
  });

  it('flyout usa menuitemradio com aria-checked e devolve o foco ao botão do grupo', () => {
    montar({ valor: 'b' });
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    const g = paleta.shadowRoot!.querySelector<HTMLButtonElement>('[data-grupo="grp"]')!;
    g.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    const menu = paleta.shadowRoot!.querySelector('.ui-ferr-menu')!;
    expect(g.getAttribute('aria-controls')).toBe(menu.id);
    const itens = menu.querySelectorAll<HTMLElement>('.ui-ferr-menu__item');
    expect(itens[1].getAttribute('role')).toBe('menuitemradio');
    expect(itens[1].getAttribute('aria-checked')).toBe('true');
    itens[2].click();
    expect(paleta.valor).toBe('c');
    expect(paleta.shadowRoot!.activeElement).toBe(paleta.shadowRoot!.querySelector('[data-grupo="grp"]'));
  });

  it('suprimirClique não fica preso quando o gesto termina sem click', () => {
    vi.useFakeTimers();
    montar();
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    const g = paleta.shadowRoot!.querySelector<HTMLButtonElement>('[data-grupo="grp"]')!;
    g.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    vi.advanceTimersByTime(500);
    g.dispatchEvent(new Event('pointerup', { bubbles: true })); // soltou sem click
    vi.advanceTimersByTime(100);
    btn(paleta, 'sel').click();
    expect(paleta.valor).toBe('sel');
  });

  it('mover o ponteiro além do limite cancela o clique longo', () => {
    vi.useFakeTimers();
    montar();
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    const g = paleta.shadowRoot!.querySelector<HTMLButtonElement>('[data-grupo="grp"]')!;
    g.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
    g.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 0, clientY: 40 }));
    vi.advanceTimersByTime(500);
    expect(paleta.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();
  });

  it('atalhos: ignora campos customizados (role=textbox) e diálogos modais', () => {
    montar({ atalhos: '' });
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    const campo = document.createElement('div');
    campo.setAttribute('role', 'textbox');
    document.body.appendChild(campo);
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true, composed: true }));
    expect(paleta.valor).toBe('');

    const modal = document.createElement('div');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
    modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true, composed: true }));
    expect(paleta.valor).toBe('');

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true, cancelable: true }));
    expect(paleta.valor).toBe('mao');
  });

  it('com várias paletas "atalhos", só a primeira trata a tecla', () => {
    const p1 = montar({ atalhos: '' });
    p1.ferramentas = ferr();
    document.body.appendChild(p1);
    const p2 = document.createElement('ui-paleta-ferramentas') as UIPaletaFerramentas;
    p2.setAttribute('atalhos', '');
    p2.ferramentas = ferr();
    document.body.appendChild(p2);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true, cancelable: true }));
    expect(p1.valor).toBe('sel');
    expect(p2.valor).toBe('');
  });

  it('expõe orientacao, colunas e tamanho como propriedades', () => {
    montar();
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    paleta.orientacao = 'horizontal';
    paleta.tamanho = 'lg';
    paleta.colunas = 2;
    const raiz = paleta.shadowRoot!.querySelector('.ui-paleta')!;
    expect(raiz.classList.contains('ui-paleta--horizontal')).toBe(true);
    expect(raiz.classList.contains('ui-paleta--lg')).toBe(true);
    expect(paleta.colunas).toBe(2);
    paleta.setAttribute('tamanho', 'xl');
    expect(paleta.tamanho).toBe('md');
    expect(raiz.classList.contains('ui-paleta--md')).toBe(true);
  });

  it('aria-label do host é repassado à toolbar', () => {
    montar({ 'aria-label': 'Desenho' });
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    expect(paleta.shadowRoot!.querySelector('[role="toolbar"]')!.getAttribute('aria-label')).toBe('Desenho');
  });

  it('reconectar a paleta não duplica o atalho', () => {
    montar({ atalhos: '' });
    paleta.ferramentas = ferr();
    document.body.appendChild(paleta);
    paleta.remove();
    document.body.appendChild(paleta);
    const spy = vi.fn();
    paleta.addEventListener('ui-ferramenta', spy);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true, cancelable: true }));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
