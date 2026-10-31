import { describe, it, expect, beforeEach, vi } from 'vitest';
import './ui-tabela-propriedades';
import { UITabelaPropriedades, CategoriaPropriedades } from './ui-tabela-propriedades';

function criarPainel(categorias: CategoriaPropriedades[], atributos: Record<string, string> = {}): UITabelaPropriedades {
  const painel = document.createElement('ui-tabela-propriedades') as UITabelaPropriedades;
  Object.entries(atributos).forEach(([k, v]) => painel.setAttribute(k, v));
  document.body.appendChild(painel);
  painel.categorias = categorias;
  return painel;
}

const geometria = (): CategoriaPropriedades[] => [{
  id: 'geo',
  titulo: 'Geometria',
  propriedades: [
    { id: 'largura', rotulo: 'Largura', tipo: 'numero', valor: 10, min: 0, max: 100, unidade: 'mm' },
    { id: 'angulo', rotulo: 'Ângulo', tipo: 'numero', valor: 0, passo: 15, unidade: '°' },
    { id: 'nome', rotulo: 'Nome', tipo: 'texto', valor: 'Parede' }
  ]
}, {
  id: 'estilo',
  titulo: 'Estilo',
  propriedades: [
    { id: 'cor', rotulo: 'Cor', tipo: 'cor-cad', valor: 'ByLayer' }
  ]
}];

const sr = (p: UITabelaPropriedades) => p.shadowRoot!;
const linha = (p: UITabelaPropriedades, id: string) => sr(p).querySelector(`[data-prop-id="${id}"]`) as HTMLElement;
const input = (p: UITabelaPropriedades, id: string) => linha(p, id).querySelector('input') as HTMLInputElement;
const digitar = (el: HTMLInputElement, texto: string) => {
  el.value = texto;
  el.dispatchEvent(new Event('input'));
  el.dispatchEvent(new Event('change'));
};
const tecla = (el: Element, key: string, extra: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, ...extra }));

describe('ui-tabela-propriedades — números: intervalo, passo e unidade', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('limita o valor digitado a min/max', () => {
    const painel = criarPainel(geometria());
    digitar(input(painel, 'largura'), '500');
    expect(painel.obterValor('largura')).toBe(100);
    expect(input(painel, 'largura').value).toBe('100');
    digitar(input(painel, 'largura'), '-3');
    expect(painel.obterValor('largura')).toBe(0);
  });

  it('as setas usam `passo` e respeitam o intervalo', () => {
    const painel = criarPainel(geometria());
    tecla(input(painel, 'angulo'), 'ArrowUp');
    expect(painel.obterValor('angulo')).toBe(15);
    tecla(input(painel, 'angulo'), 'ArrowUp', { shiftKey: true });
    expect(painel.obterValor('angulo')).toBe(165);
    tecla(input(painel, 'largura'), 'ArrowDown', { shiftKey: true });
    tecla(input(painel, 'largura'), 'ArrowDown', { shiftKey: true });
    expect(painel.obterValor('largura')).toBe(0);
    expect(input(painel, 'largura').value).toBe('0');
  });

  it('o scrubber respeita o intervalo', () => {
    const painel = criarPainel(geometria());
    const rotulo = linha(painel, 'largura').querySelector('.ui-prop__col-rotulo') as HTMLElement;
    rotulo.setPointerCapture = () => {};
    rotulo.hasPointerCapture = () => false;
    rotulo.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 100, pointerId: 1 }));
    rotulo.dispatchEvent(new PointerEvent('pointermove', { clientX: 100000, pointerId: 1, ctrlKey: true }));
    rotulo.dispatchEvent(new PointerEvent('pointerup', { clientX: 100000, pointerId: 1 }));
    expect(painel.obterValor('largura')).toBe(100);
  });

  it('aceita a unidade digitada junto do número', () => {
    const painel = criarPainel(geometria());
    digitar(input(painel, 'largura'), '25 mm');
    expect(painel.obterValor('largura')).toBe(25);
    digitar(input(painel, 'angulo'), '90°');
    expect(painel.obterValor('angulo')).toBe(90);
  });

  it('expressão inválida volta ao valor, sinaliza o campo e não emite evento', () => {
    const painel = criarPainel(geometria());
    const espiao = vi.fn();
    painel.addEventListener('ui-propriedade-alterada', espiao);
    const campo = input(painel, 'largura');
    digitar(campo, '10 + abc');
    expect(painel.obterValor('largura')).toBe(10);
    expect(campo.value).toBe('10');
    expect(campo.classList.contains('ui-prop__editor-input--invalido')).toBe(true);
    expect(espiao).not.toHaveBeenCalled();
    campo.value = '12';
    campo.dispatchEvent(new Event('input'));
    expect(campo.classList.contains('ui-prop__editor-input--invalido')).toBe(false);
  });

  it('mostra a prévia do resultado enquanto a expressão é digitada', () => {
    const painel = criarPainel(geometria());
    const campo = input(painel, 'largura');
    campo.value = '10+5';
    campo.dispatchEvent(new Event('input'));
    const previa = linha(painel, 'largura').querySelector('.ui-prop__previa-calculo') as HTMLElement;
    expect(previa.textContent).toBe('= 15');
    expect(previa.hidden).toBe(false);

    campo.value = '10+';
    campo.dispatchEvent(new Event('input'));
    expect(previa.textContent).toBe('= ?');

    campo.value = '10+5';
    campo.dispatchEvent(new Event('change'));
    expect(previa.hidden).toBe(true);
    expect(painel.obterValor('largura')).toBe(15);
  });
});

describe('ui-tabela-propriedades — restaurar valor original', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('linha alterada ganha botão que restaura o valor e emite o evento', () => {
    const painel = criarPainel(geometria());
    digitar(input(painel, 'nome'), 'Muro');
    const linhaNome = linha(painel, 'nome');
    expect(linhaNome.classList.contains('ui-prop__linha--modificada')).toBe(true);

    const espiao = vi.fn();
    painel.addEventListener('ui-propriedade-alterada', espiao);
    const btn = linhaNome.querySelector('.ui-prop__btn-reverter') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toContain('Nome');
    btn.click();

    expect(painel.obterValor('nome')).toBe('Parede');
    expect(input(painel, 'nome').value).toBe('Parede');
    expect(linhaNome.classList.contains('ui-prop__linha--modificada')).toBe(false);
    expect(espiao).toHaveBeenCalledTimes(1);
    expect(espiao.mock.calls[0][0].detail).toMatchObject({ id: 'nome', valor: 'Parede', valorAnterior: 'Muro', categoriaId: 'geo' });
  });

  it('reverterPropriedade() devolve se havia o que restaurar e respeita o modo manual', () => {
    const painel = criarPainel(geometria(), { 'modo-aplicar': 'manual' });
    expect(painel.reverterPropriedade('nome')).toBe(false);
    expect(painel.reverterPropriedade('inexistente')).toBe(false);
    digitar(input(painel, 'nome'), 'Muro');
    expect(painel.dirty).toBe(true);

    const espiao = vi.fn();
    painel.addEventListener('ui-propriedade-alterada', espiao);
    expect(painel.reverterPropriedade('nome')).toBe(true);
    expect(painel.dirty).toBe(false);
    expect(espiao).not.toHaveBeenCalled();
    expect((sr(painel).getElementById('btn-aplicar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('o botão de restaurar não inicia o scrubber do rótulo numérico', () => {
    const painel = criarPainel(geometria());
    digitar(input(painel, 'largura'), '20');
    const rotulo = linha(painel, 'largura').querySelector('.ui-prop__col-rotulo') as HTMLElement;
    const btn = rotulo.querySelector('.ui-prop__btn-reverter') as HTMLButtonElement;
    btn.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 100, pointerId: 1, bubbles: true }));
    expect(rotulo.classList.contains('ui-prop__col-rotulo--arrastando')).toBe(false);
  });

  it('somente leitura não ganha botão de restaurar', () => {
    const painel = criarPainel([{ id: 'g', titulo: 'G', propriedades: [
      { id: 'area', rotulo: 'Área', tipo: 'readonly', valor: 3 }
    ] }]);
    expect(linha(painel, 'area').querySelector('.ui-prop__btn-reverter')).toBeNull();
  });
});

describe('ui-tabela-propriedades — modo manual e teclado', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('ui-aplicar traz só as propriedades alteradas em `alterados`', () => {
    const painel = criarPainel(geometria(), { 'modo-aplicar': 'manual' });
    digitar(input(painel, 'nome'), 'Muro');
    const espiao = vi.fn();
    painel.addEventListener('ui-aplicar', espiao);
    painel.aplicar();
    expect(espiao.mock.calls[0][0].detail.alterados).toEqual({ nome: 'Muro' });
    expect(espiao.mock.calls[0][0].detail.valores.largura).toBe(10);
  });

  it('Ctrl+Enter aplica no modo manual (o valor em edição entra junto)', () => {
    const painel = criarPainel(geometria(), { 'modo-aplicar': 'manual' });
    const espiao = vi.fn();
    painel.addEventListener('ui-aplicar', espiao);
    const campo = input(painel, 'nome');
    campo.value = 'Muro';
    tecla(campo, 'Enter', { ctrlKey: true });
    expect(espiao).toHaveBeenCalledTimes(1);
    expect(espiao.mock.calls[0][0].detail.alterados).toEqual({ nome: 'Muro' });
    expect(painel.dirty).toBe(false);
  });

  it('Ctrl+Enter não faz nada no modo imediato', () => {
    const painel = criarPainel(geometria());
    const espiao = vi.fn();
    painel.addEventListener('ui-aplicar', espiao);
    tecla(input(painel, 'nome'), 'Enter', { ctrlKey: true });
    expect(espiao).not.toHaveBeenCalled();
  });

  it('Shift+Enter volta ao campo anterior', () => {
    const painel = criarPainel(geometria());
    const campo = input(painel, 'nome');
    campo.focus();
    tecla(campo, 'Enter', { shiftKey: true });
    expect(sr(painel).activeElement).toBe(input(painel, 'angulo'));
  });

  it('o teclado do painel é limpo ao desconectar e não duplica ao reconectar', () => {
    const painel = criarPainel(geometria(), { 'modo-aplicar': 'manual' });
    const espiao = vi.fn();
    painel.addEventListener('ui-aplicar', espiao);
    painel.remove();
    document.body.appendChild(painel);
    digitar(input(painel, 'nome'), 'Muro');
    tecla(input(painel, 'nome'), 'Enter', { ctrlKey: true });
    expect(espiao).toHaveBeenCalledTimes(1);
  });
});

describe('ui-tabela-propriedades — filtro', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  const filtrar = (p: UITabelaPropriedades, termo: string) => {
    const f = sr(p).getElementById('filtro-input') as HTMLInputElement;
    f.value = termo;
    f.dispatchEvent(new Event('input'));
    return f;
  };
  const ids = (p: UITabelaPropriedades) =>
    Array.from(sr(p).querySelectorAll('.ui-prop__linha')).map(l => l.getAttribute('data-prop-id'));

  it('ignora acentos e acha pelo título da categoria', () => {
    const painel = criarPainel(geometria(), { filtro: '' });
    filtrar(painel, 'angulo');
    expect(ids(painel)).toEqual(['angulo']);
    filtrar(painel, 'ESTILO');
    expect(ids(painel)).toEqual(['cor']);
  });

  it('Esc limpa a busca', () => {
    const painel = criarPainel(geometria(), { filtro: '' });
    const f = filtrar(painel, 'cor');
    tecla(f, 'Escape');
    expect(f.value).toBe('');
    expect(ids(painel).length).toBe(4);
  });
});

describe('ui-tabela-propriedades — splitter acessível pelo teclado', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('é um separador focável com valor atual e muda com as setas', () => {
    const painel = criarPainel(geometria());
    const splitter = sr(painel).getElementById('splitter')!;
    expect(splitter.getAttribute('role')).toBe('separator');
    expect(splitter.tabIndex).toBe(0);
    expect(splitter.getAttribute('aria-valuenow')).toBe('45');

    const espiao = vi.fn();
    painel.addEventListener('ui-splitter-resize', espiao);
    tecla(splitter, 'ArrowRight');
    expect(painel.larguraRotuloPorcentagem).toBe(46);
    tecla(splitter, 'ArrowLeft', { shiftKey: true });
    expect(painel.larguraRotuloPorcentagem).toBe(41);
    expect(splitter.getAttribute('aria-valuenow')).toBe('41');
    tecla(splitter, 'End');
    expect(painel.larguraRotuloPorcentagem).toBe(65);
    tecla(splitter, 'Home');
    expect(painel.larguraRotuloPorcentagem).toBe(20);
    tecla(splitter, 'Enter');
    expect(painel.larguraRotuloPorcentagem).toBe(45);
    expect(espiao).toHaveBeenCalledTimes(5);
    expect(espiao.mock.calls[4][0].detail.larguraPorcentagem).toBe(45);
  });
});
