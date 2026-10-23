import { describe, it, expect, beforeEach } from 'vitest';
import './ui-tabela-propriedades';
import {
  VALOR_MISTO,
  isValorMisto,
  valorComum,
  combinarValores
} from './ui-tabela-propriedades';
import type { UITabelaPropriedades, CategoriaPropriedades } from './ui-tabela-propriedades';

describe('Estado misto - funções puras', () => {
  it('valorComum devolve o valor quando todos são iguais e VALOR_MISTO quando diferem', () => {
    expect(valorComum([2, 2, 2])).toBe(2);
    expect(valorComum(['a', 'b'])).toBe(VALOR_MISTO);
    expect(valorComum([null, undefined])).toBe(null);
    expect(valorComum([NaN, NaN])).toBeNaN();
  });

  it('valorComum de lista vazia ou inválida não quebra', () => {
    expect(valorComum([])).toBeUndefined();
    expect(valorComum(null as any)).toBeUndefined();
    expect(valorComum([VALOR_MISTO, 1])).toBe(VALOR_MISTO);
  });

  it('combinarValores junta os registros das formas selecionadas', () => {
    const r = combinarValores([
      { cor: '#ff0000', camada: '0', raio: 10 },
      { cor: '#ff0000', camada: 'topo', raio: 10 },
      { cor: '#ff0000', camada: '0' }
    ]);
    expect(r.cor).toBe('#ff0000');
    expect(isValorMisto(r.camada)).toBe(true);
    // Ausente numa das formas conta como diferente
    expect(isValorMisto(r.raio)).toBe(true);
  });

  it('combinarValores ignora entradas hostis', () => {
    expect(combinarValores([])).toEqual({});
    expect(combinarValores(null as any)).toEqual({});
    expect(combinarValores([null, { a: 1 }, 'x'] as any)).toEqual({ a: 1 });
  });

  it('VALOR_MISTO é estável entre cópias do pacote (Symbol.for)', () => {
    expect(VALOR_MISTO).toBe(Symbol.for('ui-tabela-propriedades:misto'));
    expect(isValorMisto('Varia')).toBe(false);
  });
});

describe('UITabelaPropriedades - estado misto ("Varia")', () => {
  let tabela: UITabelaPropriedades;
  const shadow = () => tabela.shadowRoot!;
  const linha = (id: string) => shadow().querySelector(`[data-prop-id="${id}"]`) as HTMLElement;

  const categorias = (): CategoriaPropriedades[] => [
    {
      id: 'geral',
      titulo: 'Geral',
      propriedades: [
        { id: 'nome', rotulo: 'Nome', tipo: 'texto', valor: VALOR_MISTO, placeholder: 'sem nome' },
        { id: 'raio', rotulo: 'Raio', tipo: 'numero', valor: VALOR_MISTO, casasDecimais: 2 },
        { id: 'camada', rotulo: 'Camada', tipo: 'selecao', valor: VALOR_MISTO, opcoes: [{ id: '0', rotulo: '0' }, { id: 'topo', rotulo: 'Topografia' }] },
        { id: 'visivel', rotulo: 'Visível', tipo: 'booleano', valor: VALOR_MISTO },
        { id: 'cor', rotulo: 'Cor', tipo: 'cor', valor: VALOR_MISTO },
        { id: 'corCad', rotulo: 'Cor CAD', tipo: 'cor-cad', valor: VALOR_MISTO },
        { id: 'tipoLinha', rotulo: 'Tipo de linha', tipo: 'linetype', valor: VALOR_MISTO },
        { id: 'peso', rotulo: 'Espessura', tipo: 'lineweight', valor: VALOR_MISTO },
        { id: 'area', rotulo: 'Área', tipo: 'readonly', valor: VALOR_MISTO },
        { id: 'comum', rotulo: 'Comum', tipo: 'texto', valor: 'igual' },
        { id: 'flag', rotulo: 'Flag', tipo: 'texto', valor: 'x', misto: true }
      ]
    }
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
    tabela = document.createElement('ui-tabela-propriedades') as UITabelaPropriedades;
    document.body.appendChild(tabela);
    tabela.categorias = categorias();
  });

  it('marca as linhas mistas e mantém as comuns com o valor', () => {
    expect(linha('nome').classList.contains('ui-prop__linha--misto')).toBe(true);
    expect(linha('comum').classList.contains('ui-prop__linha--misto')).toBe(false);
    expect((linha('comum').querySelector('input') as HTMLInputElement).value).toBe('igual');
  });

  it('cada tipo de editor exibe "Varia" sem quebrar', () => {
    const nome = linha('nome').querySelector('input') as HTMLInputElement;
    expect(nome.value).toBe('');
    expect(nome.placeholder).toBe('Varia');

    const raio = linha('raio').querySelector('input') as HTMLInputElement;
    expect(raio.value).toBe('');
    expect(raio.placeholder).toBe('Varia');

    const sel = linha('camada').querySelector('select') as HTMLSelectElement;
    expect(sel.selectedOptions[0].textContent).toBe('Varia');

    const bool = linha('visivel').querySelector('.ui-prop__editor-booleano') as HTMLElement;
    expect(bool.getAttribute('aria-checked')).toBe('mixed');
    expect(bool.textContent).toContain('Varia');

    expect(linha('cor').querySelector('.ui-prop__cor-texto')!.textContent).toBe('Varia');
    expect((linha('corCad').querySelector('select') as HTMLSelectElement).selectedOptions[0].textContent).toBe('Varia');
    expect((linha('tipoLinha').querySelector('select') as HTMLSelectElement).selectedOptions[0].textContent).toBe('Varia');
    expect((linha('peso').querySelector('select') as HTMLSelectElement).selectedOptions[0].textContent).toBe('Varia');
    expect(linha('area').textContent).toContain('Varia');
  });

  it('item com misto: true é tratado como misto', () => {
    expect(isValorMisto(tabela.obterValor('flag'))).toBe(true);
    expect((linha('flag').querySelector('input') as HTMLInputElement).placeholder).toBe('Varia');
  });

  it('a palavra é configurável pelo atributo texto-misto e pela propriedade textoMisto', () => {
    tabela.setAttribute('texto-misto', '*VARIES*');
    expect((linha('nome').querySelector('input') as HTMLInputElement).placeholder).toBe('*VARIES*');
    tabela.textoMisto = 'Diversos';
    expect(tabela.getAttribute('texto-misto')).toBe('Diversos');
    expect(linha('area').textContent).toContain('Diversos');
    tabela.textoMisto = '';
    expect(tabela.hasAttribute('texto-misto')).toBe(false);
    expect(linha('area').textContent).toContain('Varia');
  });

  it('não começa sujo e sair do campo sem digitar não altera o valor misto', () => {
    expect(tabela.isDirty).toBe(false);
    const raio = linha('raio').querySelector('input') as HTMLInputElement;
    raio.dispatchEvent(new Event('focus'));
    raio.dispatchEvent(new Event('blur'));
    raio.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    raio.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(isValorMisto(tabela.obterValor('raio'))).toBe(true);
    expect(tabela.isDirty).toBe(false);
  });

  it('digitar um valor aplica a todos e emite valorAnterior = VALOR_MISTO', () => {
    const eventos: any[] = [];
    tabela.addEventListener('ui-propriedade-alterada', (e: Event) => eventos.push((e as CustomEvent).detail));
    const raio = linha('raio').querySelector('input') as HTMLInputElement;
    raio.value = '10*2';
    raio.dispatchEvent(new Event('change'));
    expect(tabela.obterValor('raio')).toBe(20);
    expect(eventos[0].valorAnterior).toBe(VALOR_MISTO);
    expect(linha('raio').classList.contains('ui-prop__linha--misto')).toBe(false);
    expect(linha('raio').classList.contains('ui-prop__linha--modificada')).toBe(true);
  });

  it('booleano misto vira verdadeiro no primeiro clique', () => {
    const bool = linha('visivel').querySelector('.ui-prop__editor-booleano') as HTMLElement;
    bool.click();
    expect(tabela.obterValor('visivel')).toBe(true);
    expect(bool.getAttribute('aria-checked')).toBe('true');
  });

  it('texto apagado a partir do misto não vira string vazia', () => {
    const nome = linha('nome').querySelector('input') as HTMLInputElement;
    nome.value = '';
    nome.dispatchEvent(new Event('change'));
    expect(isValorMisto(tabela.obterValor('nome'))).toBe(true);
    nome.value = 'Lote 1';
    nome.dispatchEvent(new Event('change'));
    expect(tabela.obterValor('nome')).toBe('Lote 1');
    expect(nome.placeholder).toBe('sem nome');
  });

  it('desfazer volta ao estado misto', () => {
    tabela.definirValor('camada', 'topo');
    expect(tabela.isDirty).toBe(true);
    tabela.desfazer();
    expect(isValorMisto(tabela.obterValor('camada'))).toBe(true);
    expect((linha('camada').querySelector('select') as HTMLSelectElement).selectedOptions[0].textContent).toBe('Varia');
  });

  it('definirValor(VALOR_MISTO) atualiza o editor sem recriar a linha', () => {
    const antes = linha('comum');
    tabela.definirValor('comum', VALOR_MISTO, false);
    expect(linha('comum')).toBe(antes);
    expect(antes.classList.contains('ui-prop__linha--misto')).toBe(true);
    expect((antes.querySelector('input') as HTMLInputElement).placeholder).toBe('Varia');
  });

  it('valores = combinarValores(...) mostra comuns e mistos', () => {
    tabela.valores = combinarValores([{ comum: 'a', nome: 'P1' }, { comum: 'a', nome: 'P2' }]);
    expect((linha('comum').querySelector('input') as HTMLInputElement).value).toBe('a');
    expect(isValorMisto(tabela.obterValor('nome'))).toBe(true);
    expect(tabela.isDirty).toBe(false);
  });
});
