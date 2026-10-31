import { describe, it, expect, beforeEach, vi } from 'vitest';
import './ui-tabela-propriedades';
import {
  UITabelaPropriedades,
  UIPainelPropriedades,
  UIPropriedades,
  CategoriaPropriedades,
  SeletorTipoItem,
  avaliarExpressaoMatematica
} from './ui-tabela-propriedades';

function criarPainel(categorias: CategoriaPropriedades[]): UITabelaPropriedades {
  const painel = document.createElement('ui-tabela-propriedades') as UITabelaPropriedades;
  document.body.appendChild(painel);
  painel.categorias = categorias;
  return painel;
}

const categoriasBase = (): CategoriaPropriedades[] => [{
  id: 'geral',
  titulo: 'Geral',
  propriedades: [
    { id: 'largura', rotulo: 'Largura', tipo: 'numero', valor: 10 },
    { id: 'altura', rotulo: 'Altura', tipo: 'numero', valor: 5 },
    { id: 'modo', rotulo: 'Modo', tipo: 'selecao', valor: 'a', opcoes: [{ id: 'a', rotulo: 'A' }, { id: 'b', rotulo: 'B' }] },
    { id: 'ativo', rotulo: 'Ativo', tipo: 'booleano', valor: false },
    { id: 'cor', rotulo: 'Cor', tipo: 'cor-cad', valor: 'ByLayer' },
    { id: 'nome', rotulo: 'Nome', tipo: 'texto', valor: 'x' }
  ]
}];

const linha = (p: UITabelaPropriedades, id: string) => p.shadowRoot!.querySelector(`[data-prop-id="${id}"]`) as HTMLElement;

describe('ui-tabela-propriedades — regressões', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('re-renderizar (filtro) destaca só as linhas realmente modificadas', () => {
    const painel = criarPainel(categoriasBase());
    painel.setAttribute('filtro', '');
    const input = linha(painel, 'largura').querySelector('input')!;
    input.value = '20';
    input.dispatchEvent(new Event('change'));

    const filtro = painel.shadowRoot!.getElementById('filtro-input') as HTMLInputElement;
    filtro.value = 'a';
    filtro.dispatchEvent(new Event('input'));
    filtro.value = '';
    filtro.dispatchEvent(new Event('input'));

    const modificadas = Array.from(painel.shadowRoot!.querySelectorAll('.ui-prop__linha--modificada'))
      .map(el => el.getAttribute('data-prop-id'));
    expect(modificadas).toEqual(['largura']);
  });

  it('scrubber continua do valor atual a cada arrasto', () => {
    const painel = criarPainel(categoriasBase());
    const rotulo = linha(painel, 'altura').querySelector('.ui-prop__col-rotulo') as HTMLElement;
    rotulo.setPointerCapture = () => {};
    rotulo.hasPointerCapture = () => false;
    const arrastar = (dx: number) => {
      rotulo.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 100, pointerId: 1 }));
      rotulo.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 + dx, pointerId: 1 }));
      rotulo.dispatchEvent(new PointerEvent('pointerup', { clientX: 100 + dx, pointerId: 1 }));
    };
    arrastar(100);
    expect(painel.obterValor('altura')).toBe(6);
    arrastar(100);
    expect(painel.obterValor('altura')).toBe(7);
    expect(linha(painel, 'altura').querySelector('input')!.value).toBe('7');
  });

  it('definirValor atualiza a tela de seleção, booleano e cor CAD', () => {
    const painel = criarPainel(categoriasBase());
    painel.definirValor('modo', 'b');
    painel.definirValor('ativo', true);
    painel.definirValor('cor', 'Red');

    expect((linha(painel, 'modo').querySelector('select') as HTMLSelectElement).value).toBe('b');
    expect(linha(painel, 'ativo').querySelector('.ui-prop__booleano-rotulo')!.textContent).toBe('Sim');
    expect(linha(painel, 'ativo').querySelector('[role="checkbox"]')!.getAttribute('aria-checked')).toBe('true');
    expect((linha(painel, 'cor').querySelector('select') as HTMLSelectElement).value).toBe('Red');
  });

  it('valores fora da lista aparecem como são (hex, ACI numérico, opção inexistente)', () => {
    const painel = criarPainel([{
      id: 'c', titulo: 'C', propriedades: [
        { id: 'hex', rotulo: 'Hex', tipo: 'cor-cad', valor: '#ff8800' },
        { id: 'aci', rotulo: 'ACI', tipo: 'cor-cad', valor: 1 },
        { id: 'sel', rotulo: 'Sel', tipo: 'selecao', valor: 'zzz', opcoes: [{ id: 'a', rotulo: 'A' }] }
      ]
    }]);
    const selHex = linha(painel, 'hex').querySelector('select') as HTMLSelectElement;
    expect(selHex.value).toBe('#ff8800');
    expect(selHex.selectedOptions[0].textContent).toBe('#ff8800');
    expect((linha(painel, 'aci').querySelector('select') as HTMLSelectElement).value).toBe('Red');
    const sel = linha(painel, 'sel').querySelector('select') as HTMLSelectElement;
    expect(sel.value).toBe('zzz');
    expect(painel.obterValor('aci')).toBe(1); // exibir não altera o dado
  });

  it('"Selecionar cor..." nunca fica selecionada e o seletor pode ser reaberto', () => {
    const painel = criarPainel(categoriasBase());
    const select = linha(painel, 'cor').querySelector('select') as HTMLSelectElement;
    const picker = linha(painel, 'cor').querySelector('input[type="color"]') as HTMLInputElement;
    const abrir = vi.fn();
    picker.click = abrir;

    select.value = '__escolher';
    select.dispatchEvent(new Event('change'));
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(select.value).toBe('ByLayer'); // cancelar não deixa o select num estado falso

    picker.value = '#123456';
    picker.dispatchEvent(new Event('change'));
    expect(painel.obterValor('cor')).toBe('#123456');

    select.value = '__escolher';
    select.dispatchEvent(new Event('change'));
    expect(abrir).toHaveBeenCalledTimes(2);
    expect(select.value).toBe('#123456');
  });

  it('voltar ao valor original limpa o estado alterado', () => {
    const painel = criarPainel(categoriasBase());
    painel.setAttribute('modo-aplicar', 'manual');
    const input = linha(painel, 'nome').querySelector('input')!;
    input.value = 'y';
    input.dispatchEvent(new Event('change'));
    expect(painel.isDirty).toBe(true);
    input.value = 'x';
    input.dispatchEvent(new Event('change'));
    expect(painel.isDirty).toBe(false);
    expect(linha(painel, 'nome').classList.contains('ui-prop__linha--modificada')).toBe(false);
    expect((painel.shadowRoot!.getElementById('btn-aplicar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('definirValor com o mesmo valor não emite evento nem marca alteração', () => {
    const painel = criarPainel(categoriasBase());
    const espiao = vi.fn();
    painel.addEventListener('ui-propriedade-alterada', espiao);
    painel.definirValor('largura', 10);
    expect(espiao).not.toHaveBeenCalled();
    expect(painel.isDirty).toBe(false);
  });

  it('acoplar devolve o tamanho original e flutuar de novo volta à última posição', () => {
    const painel = criarPainel(categoriasBase());
    painel.style.width = '250px';
    painel.flutuante = true;
    expect(painel.style.width).toBe('300px');
    painel.style.left = '40px';
    painel.style.top = '50px';
    painel.style.width = '410px';

    painel.flutuante = false;
    expect(painel.style.width).toBe('250px');
    expect(painel.style.height).toBe('');
    expect(painel.style.left).toBe('');

    painel.flutuante = true;
    expect([painel.style.left, painel.style.top, painel.style.width]).toEqual(['40px', '50px', '410px']);
  });

  it('duplo clique no cabeçalho da categoria não gera alternância extra', () => {
    const painel = criarPainel(categoriasBase());
    const espiao = vi.fn();
    painel.addEventListener('ui-categoria-toggle', espiao);
    const header = painel.shadowRoot!.querySelector('.ui-prop__categoria-header') as HTMLElement;
    header.click();
    header.click();
    header.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(espiao).toHaveBeenCalledTimes(2);
    expect(header.getAttribute('aria-expanded')).toBe('true');
  });

  it('cabeçalho de categoria e booleano funcionam pelo teclado', () => {
    const painel = criarPainel(categoriasBase());
    const header = painel.shadowRoot!.querySelector('.ui-prop__categoria-header') as HTMLElement;
    expect(header.getAttribute('role')).toBe('button');
    expect(header.tabIndex).toBe(0);
    header.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(header.getAttribute('aria-expanded')).toBe('false');

    const booleano = linha(painel, 'ativo').querySelector('[role="checkbox"]') as HTMLElement;
    expect(booleano.tabIndex).toBe(0);
    booleano.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(painel.obterValor('ativo')).toBe(true);
  });

  it('busca mostra resultados de categorias recolhidas', () => {
    const cats = categoriasBase();
    cats[0].aberto = false;
    const painel = criarPainel(cats);
    painel.setAttribute('filtro', '');
    const filtro = painel.shadowRoot!.getElementById('filtro-input') as HTMLInputElement;
    filtro.value = 'larg';
    filtro.dispatchEvent(new Event('input'));
    const cat = painel.shadowRoot!.querySelector('[data-cat-id="geral"]')!;
    expect(cat.classList.contains('ui-prop__categoria--aberta')).toBe(true);
    expect(cats[0].aberto).toBe(false); // estado do usuário preservado

    painel.removeAttribute('filtro'); // esconder o filtro limpa a busca
    expect(filtro.value).toBe('');
    expect(painel.shadowRoot!.querySelectorAll('.ui-prop__linha').length).toBe(6);
  });

  it('mudar o título não recria as linhas (preserva o campo em edição)', () => {
    const painel = criarPainel(categoriasBase());
    const antes = linha(painel, 'nome');
    painel.setAttribute('titulo', 'Outro');
    expect(linha(painel, 'nome')).toBe(antes);
    expect(painel.shadowRoot!.getElementById('header-titulo-texto')!.textContent).toBe('Outro');
  });

  it('ids com aspas não quebram os seletores', () => {
    const painel = criarPainel([{ id: 'c', titulo: 'C', propriedades: [{ id: 'a"b', rotulo: 'AB', tipo: 'texto', valor: '1' }] }]);
    expect(() => painel.definirValor('a"b', '2')).not.toThrow();
    expect((painel.shadowRoot!.querySelector('.ui-prop__linha input') as HTMLInputElement).value).toBe('2');
  });

  it('ícone SVG do tipo é higienizado', () => {
    const painel = criarPainel(categoriasBase());
    painel.setAttribute('estilo-visual', 'revit');
    painel.tipos = [{
      id: 't1', rotulo: 'Parede',
      // <script> por último: o parser do happy-dom engole o que vem depois dele dentro de <svg>
      iconeSvg: '<svg onload="alert(1)"><a href="javascript:alert(3)"><rect/></a><use href="https://x.test/a.svg#i"/><path d="M0 0" onclick="x()"/><script>alert(2)</script></svg>'
    }];
    const mini = painel.shadowRoot!.querySelector('.ui-prop__tipo-miniatura')!;
    const html = mini.innerHTML;
    expect(mini.querySelector('svg')).toBeTruthy();
    expect(mini.querySelector('path')).toBeTruthy();
    expect(html).not.toMatch(/script|onload|onclick|javascript:|https:/i);
    expect(mini.querySelector('a')).toBeNull();
  });

  /* ---------- Novas melhorias de robustez e experiência do usuário ---------- */

  it('trata entradas hostis graciosamente sem lançar exceção (Regra #0)', () => {
    const painel = document.createElement('ui-tabela-propriedades') as UITabelaPropriedades;
    document.body.appendChild(painel);

    // Array com null, objetos sem campos obrigatórios
    expect(() => {
      painel.categorias = [
        null as any,
        undefined as any,
        { id: 'invalida', titulo: null as any, propriedades: [null as any, { id: 'p_sem_rotulo', tipo: 'numero', valor: 42 } as any] }
      ];
    }).not.toThrow();

    expect(() => {
      painel.tipos = [null as any, { id: 't_ok', rotulo: 'Tipo OK' }];
    }).not.toThrow();

    expect(painel.obterValor('p_sem_rotulo')).toBe(42);
  });

  it('redefinirValor restaura o valor original de uma propriedade individual', () => {
    const painel = criarPainel(categoriasBase());
    painel.definirValor('largura', 99);
    expect(painel.obterValor('largura')).toBe(99);
    expect(painel.isDirty).toBe(true);

    painel.redefinirValor('largura');
    expect(painel.obterValor('largura')).toBe(10);
    expect(painel.isDirty).toBe(false);
    expect(linha(painel, 'largura').classList.contains('ui-prop__linha--modificada')).toBe(false);
  });

  it('aplica limites min e max em campos numéricos', () => {
    const painel = criarPainel([{
      id: 'limites',
      titulo: 'Limites',
      propriedades: [
        { id: 'opacidade', rotulo: 'Opacidade', tipo: 'numero', valor: 50, min: 0, max: 100 }
      ]
    }]);

    const input = linha(painel, 'opacidade').querySelector('input')!;
    input.value = '150';
    input.dispatchEvent(new Event('change'));
    expect(painel.obterValor('opacidade')).toBe(100);

    input.value = '-20';
    input.dispatchEvent(new Event('change'));
    expect(painel.obterValor('opacidade')).toBe(0);
  });

  it('suporta botão de limpar filtro e atalho Escape no campo de busca', () => {
    const painel = criarPainel(categoriasBase());
    painel.filtro = true;
    const shadow = painel.shadowRoot!;
    const filtroInput = shadow.getElementById('filtro-input') as HTMLInputElement;
    const btnLimpar = shadow.getElementById('btn-limpar-filtro') as HTMLButtonElement;

    filtroInput.value = 'larg';
    filtroInput.dispatchEvent(new Event('input'));
    expect(btnLimpar.style.display).toBe('inline-flex');

    btnLimpar.click();
    expect(filtroInput.value).toBe('');
    expect(btnLimpar.style.display).toBe('none');

    // Tecla Escape com texto
    filtroInput.value = 'alt';
    filtroInput.dispatchEvent(new Event('input'));
    expect(shadow.querySelectorAll('.ui-prop__linha').length).toBe(1);

    const ev = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    filtroInput.dispatchEvent(ev);
    expect(filtroInput.value).toBe('');
    expect(shadow.querySelectorAll('.ui-prop__linha').length).toBe(6);
  });

  it('busca encontra propriedades pelo título da categoria e exibe estado vazio se nada coincidir', () => {
    const painel = criarPainel(categoriasBase());
    painel.termoBusca = 'geral';
    // Categoria 'Geral' casou: todas as suas 6 propriedades são exibidas
    expect(painel.shadowRoot!.querySelectorAll('.ui-prop__linha').length).toBe(6);

    painel.termoBusca = 'termo_inexistente_xyz';
    const vazio = painel.shadowRoot!.querySelector('.ui-prop__vazio');
    expect(vazio).not.toBeNull();
    expect(vazio?.textContent).toContain('Nenhuma propriedade encontrada');
  });

  it('divisor splitter responde às setas do teclado para acessibilidade (WAI-ARIA)', () => {
    const painel = criarPainel(categoriasBase());
    const shadow = painel.shadowRoot!;
    const splitter = shadow.getElementById('splitter') as HTMLElement;
    expect(splitter.getAttribute('role')).toBe('separator');
    expect(splitter.getAttribute('aria-orientation')).toBe('vertical');

    const antes = painel.larguraRotulo;
    splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(painel.larguraRotulo).toBe(antes + 2);

    splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(painel.larguraRotulo).toBe(antes);

    splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(painel.larguraRotulo).toBe(20);

    splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(painel.larguraRotulo).toBe(45);
  });

  it('registra classes e Custom Elements aliases com sucesso', () => {
    expect(customElements.get('ui-painel-propriedades')).toBeDefined();
    expect(customElements.get('ui-propriedades')).toBeDefined();

    const elAlias = document.createElement('ui-painel-propriedades');
    expect(elAlias).toBeInstanceOf(UIPainelPropriedades);
    expect(elAlias).toBeInstanceOf(UITabelaPropriedades);

    const elProp = document.createElement('ui-propriedades');
    expect(elProp).toBeInstanceOf(UIPropriedades);
    expect(elProp).toBeInstanceOf(UITabelaPropriedades);
  });
});

describe('avaliarExpressaoMatematica — regressões', () => {
  it('trigonometria em graus', () => {
    expect(avaliarExpressaoMatematica('sin(30)')).toBe(0.5);
    expect(avaliarExpressaoMatematica('cos(90)')).toBe(0);
    expect(avaliarExpressaoMatematica('tan(45)')).toBe(1);
    expect(avaliarExpressaoMatematica('atan(1)')).toBe(45);
    expect(avaliarExpressaoMatematica('asin(0.5)')).toBe(30);
  });

  it('rejeita função desconhecida e parêntese sem fechamento', () => {
    expect(avaliarExpressaoMatematica('foo(3)')).toBeNull();
    expect(avaliarExpressaoMatematica('(2+3')).toBeNull();
    expect(avaliarExpressaoMatematica('sqrt(16')).toBeNull();
    expect(avaliarExpressaoMatematica('sqrt(16)')).toBe(4);
  });

  it('aceita prefixo de fórmula igual (=) estilo CAD / Revit', () => {
    expect(avaliarExpressaoMatematica('=10.5 * 2 + (4 / 2)')).toBe(23);
    expect(avaliarExpressaoMatematica('= 100 - 25')).toBe(75);
    expect(avaliarExpressaoMatematica('=sqrt(144)')).toBe(12);
  });

  it('avalia notação científica corretamente', () => {
    expect(avaliarExpressaoMatematica('1e3')).toBe(1000);
    expect(avaliarExpressaoMatematica('2.5e2 + 50')).toBe(300);
    expect(avaliarExpressaoMatematica('1e-2')).toBe(0.01);
  });

  it('calcula porcentagens contextuais e compostas com precisão', () => {
    expect(avaliarExpressaoMatematica('100 + 10%')).toBe(110);
    expect(avaliarExpressaoMatematica('100 - 20%')).toBe(80);
    expect(avaliarExpressaoMatematica('100 + 50 * 10%')).toBe(105);
    expect(avaliarExpressaoMatematica('50 * 20%')).toBe(10);
  });

  it('suporta funções matemáticas avançadas (min, max, pow, hypot, atan2, mod, trunc)', () => {
    expect(avaliarExpressaoMatematica('min(10; 20; 5)')).toBe(5);
    expect(avaliarExpressaoMatematica('max(10; 25; 15)')).toBe(25);
    expect(avaliarExpressaoMatematica('pow(2; 4)')).toBe(16);
    expect(avaliarExpressaoMatematica('hypot(3; 4)')).toBe(5);
    expect(avaliarExpressaoMatematica('atan2(1; 1)')).toBe(45);
    expect(avaliarExpressaoMatematica('mod(17; 5)')).toBe(2);
    expect(avaliarExpressaoMatematica('trunc(12.75)')).toBe(12);
  });
});

describe('ui-tabela-propriedades — regressões da revisão profunda', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  const sair = (input: HTMLInputElement) => {
    input.dispatchEvent(new Event('focus'));
    input.dispatchEvent(new Event('change'));
    input.dispatchEvent(new Event('blur'));
  };

  it('focar e sair de um número com mais casas que casasDecimais não altera o valor', () => {
    const painel = criarPainel([{ id: 'g', titulo: 'G', propriedades: [
      { id: 'x', rotulo: 'X', tipo: 'numero', valor: 1.23456, casasDecimais: 2 }
    ] }]);
    const espiao = vi.fn();
    painel.addEventListener('ui-propriedade-alterada', espiao);
    sair(linha(painel, 'x').querySelector('input')!);
    expect(painel.obterValor('x')).toBe(1.23456);
    expect(painel.dirty).toBe(false);
    expect(espiao).not.toHaveBeenCalled();
  });

  it('número guardado como texto ("10") não vira alteração só por passar pelo campo', () => {
    const painel = criarPainel([{ id: 'g', titulo: 'G', propriedades: [
      { id: 'x', rotulo: 'X', tipo: 'numero', valor: '10' }
    ] }]);
    sair(linha(painel, 'x').querySelector('input')!);
    expect(painel.obterValor('x')).toBe('10');
    expect(painel.dirty).toBe(false);
  });

  it('Enter pula os campos de categorias recolhidas', () => {
    const painel = criarPainel([
      { id: 'a', titulo: 'A', propriedades: [{ id: 'a1', rotulo: 'A1', tipo: 'texto', valor: '' }] },
      { id: 'b', titulo: 'B', aberto: false, propriedades: [{ id: 'b1', rotulo: 'B1', tipo: 'texto', valor: '' }] },
      { id: 'c', titulo: 'C', propriedades: [{ id: 'c1', rotulo: 'C1', tipo: 'texto', valor: '' }] }
    ]);
    const a1 = linha(painel, 'a1').querySelector('input')!;
    a1.focus();
    a1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(painel.shadowRoot!.activeElement).toBe(linha(painel, 'c1').querySelector('input'));
  });

  it('categorias, propriedades e opções hostis não derrubam o painel nem o filtro', () => {
    const painel = document.createElement('ui-tabela-propriedades') as UITabelaPropriedades;
    document.body.appendChild(painel);
    painel.setAttribute('filtro', '');
    expect(() => {
      painel.categorias = [
        null,
        { id: 'x', titulo: 'X', propriedades: null },
        { id: 'y', titulo: 'Y', propriedades: [null, { id: 'semRotulo', tipo: 'selecao', valor: 1, opcoes: 'lixo' }] }
      ] as unknown as CategoriaPropriedades[];
      const filtro = painel.shadowRoot!.getElementById('filtro-input') as HTMLInputElement;
      filtro.value = 'sem';
      filtro.dispatchEvent(new Event('input'));
    }).not.toThrow();
    expect(linha(painel, 'semRotulo')).toBeTruthy();
  });

  it('busca sem resultado mostra uma mensagem em vez de um painel em branco', () => {
    const painel = criarPainel(categoriasBase());
    painel.setAttribute('filtro', '');
    const filtro = painel.shadowRoot!.getElementById('filtro-input') as HTMLInputElement;
    filtro.value = 'inexistente';
    filtro.dispatchEvent(new Event('input'));
    const vazio = painel.shadowRoot!.querySelector('.ui-prop__vazio');
    expect(vazio?.textContent).toContain('inexistente');
  });

  it('somente leitura mostra o rótulo da opção e Sim/Não, não o id cru', () => {
    const painel = criarPainel([{ id: 'g', titulo: 'G', propriedades: [
      { id: 'm', rotulo: 'Modo', tipo: 'selecao', valor: 'a', somenteLeitura: true, opcoes: [{ id: 'a', rotulo: 'Alfa' }] },
      { id: 'b', rotulo: 'Bloq', tipo: 'booleano', valor: true, somenteLeitura: true }
    ] }]);
    expect(linha(painel, 'm').querySelector('.ui-prop__valor-readonly')!.textContent).toBe('Alfa');
    expect(linha(painel, 'b').querySelector('.ui-prop__valor-readonly')!.textContent).toBe('Sim');
  });

  it('tipo de linha com ids numéricos devolve o número, não o texto', () => {
    const painel = criarPainel([{ id: 'g', titulo: 'G', propriedades: [
      { id: 'lt', rotulo: 'Linha', tipo: 'linetype', valor: 1, opcoes: [{ id: 1, rotulo: 'Contínua' }, { id: 2, rotulo: 'Tracejada' }] },
      { id: 'lw', rotulo: 'Espessura', tipo: 'lineweight', valor: 1, opcoes: [{ id: 1, rotulo: 'Fina' }, { id: 2, rotulo: 'Grossa' }] }
    ] }]);
    for (const id of ['lt', 'lw']) {
      const select = linha(painel, id).querySelector('select') as HTMLSelectElement;
      select.value = '2';
      select.dispatchEvent(new Event('change'));
      expect(painel.obterValor(id)).toBe(2);
    }
  });

  it('seletor de tipos: rótulo acessível, entradas nulas ignoradas e tipo exibido refletido', () => {
    const painel = criarPainel(categoriasBase());
    expect(() => {
      painel.tipos = [null, { id: 'p', rotulo: 'Parede' }, { id: 'j', rotulo: 'Janela' }] as unknown as SeletorTipoItem[];
    }).not.toThrow();
    const select = painel.shadowRoot!.querySelector('.ui-prop__tipo-select') as HTMLSelectElement;
    expect(select.getAttribute('aria-label')).toBeTruthy();
    expect(select.options.length).toBe(2);
    expect(painel.tipoSelecionado).toBe('p');
  });
});
