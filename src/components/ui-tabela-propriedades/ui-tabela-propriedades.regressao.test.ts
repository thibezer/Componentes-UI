import { describe, it, expect, beforeEach, vi } from 'vitest';
import './ui-tabela-propriedades';
import { UITabelaPropriedades, CategoriaPropriedades, avaliarExpressaoMatematica } from './ui-tabela-propriedades';

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
});
