import { describe, it, expect, beforeEach, vi } from 'vitest';
import './ui-tabela-propriedades';
import { UITabelaPropriedades } from './ui-tabela-propriedades';
import { avaliarExpressaoMatematica } from './avaliador-expressao';

const mockCategorias: any[] = [
  {
    id: 'geometria',
    titulo: 'Geometria',
    icone: 'polyline',
    aberta: true,
    propriedades: [
      { id: 'raio', rotulo: 'Raio', tipo: 'numero', valor: 266.5336, precisao: 4 },
      { id: 'espessura', rotulo: 'Espessura', tipo: 'numero', valor: 2.5, step: 1 }
    ]
  }
];

describe('UITabelaPropriedades - Funções de Cálculo Matemático Inline & Splitter', () => {
  let tabela: UITabelaPropriedades;

  beforeEach(() => {
    tabela = document.createElement('ui-tabela-propriedades') as UITabelaPropriedades;
    document.body.appendChild(tabela);
  });

  it('deve avaliar expressões matemáticas corretamente através de avaliarExpressaoMatematica', () => {
    // 1. Operações básicas
    expect(avaliarExpressaoMatematica('100 + 50')).toBe(150);
    expect(avaliarExpressaoMatematica('200 - 35.5')).toBe(164.5);
    expect(avaliarExpressaoMatematica('12 * 8')).toBe(96);
    expect(avaliarExpressaoMatematica('100 / 4')).toBe(25);

    // 2. Vírgula decimal brasileira
    expect(avaliarExpressaoMatematica('10,5 + 2,5')).toBe(13);

    // 3. Parênteses e precedência
    expect(avaliarExpressaoMatematica('(10 + 20) * 2')).toBe(60);

    // 4. Potências e porcentagens
    expect(avaliarExpressaoMatematica('2 ^ 3')).toBe(8);
    expect(avaliarExpressaoMatematica('100 + 10%')).toBe(110);
    expect(avaliarExpressaoMatematica('50 * 20%')).toBe(10);

    // 5. Funções matemáticas
    expect(avaliarExpressaoMatematica('sqrt(64)')).toBe(8);

    // 6. Expressão inválida
    expect(avaliarExpressaoMatematica('texto_invalido')).toBeNull();
  });

  it('deve calcular expressão matemática digitada diretamente no campo numérico', () => {
    tabela.categorias = mockCategorias;
    const shadow = tabela.shadowRoot!;

    const linhaRaio = shadow.querySelector('[data-prop-id="raio"]')!;
    const inputRaio = linhaRaio.querySelector('input') as HTMLInputElement;

    // Digita expressão matemática "266.5336 + 10"
    inputRaio.value = '266.5336 + 10';
    inputRaio.dispatchEvent(new Event('change'));

    expect(tabela.obterValor('raio')).toBe(276.5336);
    expect(inputRaio.value).toBe('276.5336');
  });

  it('deve incrementar e decrementar valor numérico com as teclas ArrowUp e ArrowDown', () => {
    tabela.categorias = mockCategorias;
    const shadow = tabela.shadowRoot!;

    const linhaEsp = shadow.querySelector('[data-prop-id="espessura"]')!;
    const inputEsp = linhaEsp.querySelector('input') as HTMLInputElement;
    expect(tabela.obterValor('espessura')).toBe(2.5);

    // Pressiona ArrowUp (passo padrão 1)
    inputEsp.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(tabela.obterValor('espessura')).toBe(3.5);

    // Pressiona ArrowDown
    inputEsp.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(tabela.obterValor('espessura')).toBe(2.5);
  });

  it('deve suportar ajuste contínuo de valor por arraste (scrubbing) no rótulo da propriedade', () => {
    tabela.categorias = mockCategorias;
    const shadow = tabela.shadowRoot!;

    const linhaEsp = shadow.querySelector('[data-prop-id="espessura"]')!;
    const rotuloEsp = linhaEsp.querySelector('.ui-prop__col-rotulo--scrub') as HTMLElement;
    expect(rotuloEsp).toBeTruthy();

    const valorAntes = tabela.obterValor('espessura');

    // Simula arraste para a direita (deltaX = +30px)
    rotuloEsp.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, button: 0, bubbles: true }));
    rotuloEsp.dispatchEvent(new PointerEvent('pointermove', { clientX: 130, bubbles: true }));
    rotuloEsp.dispatchEvent(new PointerEvent('pointerup', { clientX: 130, bubbles: true }));

    const valorDepois = tabela.obterValor('espessura');
    expect(valorDepois).toBeGreaterThan(valorAntes);
  });

  it('deve resetar a largura do splitter para o padrão (45%) ao receber duplo-clique', () => {
    tabela.categorias = mockCategorias;
    const shadow = tabela.shadowRoot!;

    const splitter = shadow.querySelector('#splitter') as HTMLElement;
    expect(splitter).toBeTruthy();

    const spy = vi.fn();
    tabela.addEventListener('ui-splitter-resize', spy);

    splitter.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ larguraPorcentagem: 45 })
      })
    );
  });
});
