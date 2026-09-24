import { describe, it, expect, beforeEach, vi } from 'vitest';
import './ui-tabela-propriedades';
import { avaliarExpressaoMatematica } from './ui-tabela-propriedades';
import type { UITabelaPropriedades, CategoriaPropriedades, SeletorTipoItem } from './ui-tabela-propriedades';

describe('UITabelaPropriedades - Paleta CAD & Revit', () => {
  let tabela: UITabelaPropriedades;

  const mockCategorias: CategoriaPropriedades[] = [
    {
      id: 'geral',
      titulo: 'Geral',
      aberto: true,
      propriedades: [
        { id: 'cor', rotulo: 'Cor', tipo: 'cor', valor: '#ff0000' },
        { id: 'camada', rotulo: 'Camada', tipo: 'selecao', valor: '0', opcoes: [{ id: '0', rotulo: '0' }, { id: 'topo', rotulo: 'Topografia' }] },
        { id: 'espessura', rotulo: 'Espessura', tipo: 'numero', valor: 2.5, unidade: 'mm' }
      ]
    },
    {
      id: 'geometria',
      titulo: 'Geometria',
      aberto: true,
      propriedades: [
        { id: 'raio', rotulo: 'Raio', tipo: 'numero', valor: 266.5336, casasDecimais: 4, unidade: 'm' },
        { id: 'diametro', rotulo: 'Diâmetro', tipo: 'readonly', valor: 533.0673, unidade: 'm' },
        { id: 'visivel', rotulo: 'Visível', tipo: 'booleano', valor: true }
      ]
    }
  ];

  const mockTipos: SeletorTipoItem[] = [
    { id: 'circulo', rotulo: 'Círculo', subtipo: 'Geometria Vetorial 2D' },
    { id: 'poligono', rotulo: 'Polígono', subtipo: 'Perímetro do Imóvel' }
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
    tabela = document.createElement('ui-tabela-propriedades') as UITabelaPropriedades;
    document.body.appendChild(tabela);
  });

  it('deve inicializar com Shadow DOM e cabeçalho padrão', () => {
    const shadow = tabela.shadowRoot;
    expect(shadow).toBeTruthy();
    const titulo = shadow?.querySelector('#header-titulo-texto');
    expect(titulo?.textContent).toBe('Propriedades');
  });

  it('deve renderizar categorias e propriedades passadas via propriedade JavaScript', () => {
    tabela.categorias = mockCategorias;

    const shadow = tabela.shadowRoot!;
    const categoriasRenderizadas = shadow.querySelectorAll('.ui-prop__categoria');
    expect(categoriasRenderizadas.length).toBe(2);

    const linhas = shadow.querySelectorAll('.ui-prop__linha');
    expect(linhas.length).toBe(6);

    const linhaRaio = shadow.querySelector('[data-prop-id="raio"]');
    expect(linhaRaio).toBeTruthy();
    expect(linhaRaio?.querySelector('.ui-prop__col-rotulo')?.textContent).toContain('Raio');
    const inputRaio = linhaRaio?.querySelector('input') as HTMLInputElement;
    expect(inputRaio.value).toBe('266.5336');
  });

  it('deve emitir evento ui-propriedade-alterada no modo imediato (AutoCAD)', () => {
    tabela.categorias = mockCategorias;
    const spy = vi.fn();
    tabela.addEventListener('ui-propriedade-alterada', spy);

    const shadow = tabela.shadowRoot!;
    const inputRaio = shadow.querySelector('[data-prop-id="raio"] input') as HTMLInputElement;

    inputRaio.value = '300';
    inputRaio.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledTimes(1);
    const detail = spy.mock.calls[0][0].detail;
    expect(detail.id).toBe('raio');
    expect(detail.valor).toBe(300);
    expect(detail.valorAnterior).toBe(266.5336);
    expect(tabela.obterValor('raio')).toBe(300);
  });

  it('deve suportar modo manual (Revit) com dirty state, aplicar e desfazer', () => {
    tabela.setAttribute('modo-aplicar', 'manual');
    tabela.categorias = mockCategorias;

    expect(tabela.dirty).toBe(false);

    const shadow = tabela.shadowRoot!;
    const btnAplicar = shadow.querySelector('#btn-aplicar') as HTMLButtonElement;
    const btnDesfazer = shadow.querySelector('#btn-desfazer') as HTMLButtonElement;

    expect(btnAplicar.disabled).toBe(true);
    expect(btnDesfazer.disabled).toBe(true);

    // Altera um valor
    const inputEspessura = shadow.querySelector('[data-prop-id="espessura"] input') as HTMLInputElement;
    inputEspessura.value = '5.0';
    inputEspessura.dispatchEvent(new Event('change'));

    expect(tabela.dirty).toBe(true);
    expect(btnAplicar.disabled).toBe(false);
    expect(btnDesfazer.disabled).toBe(false);

    // Testa Desfazer
    const spyDesfazer = vi.fn();
    tabela.addEventListener('ui-desfazer', spyDesfazer);
    btnDesfazer.click();

    expect(tabela.dirty).toBe(false);
    expect(tabela.obterValor('espessura')).toBe(2.5);
    expect(spyDesfazer).toHaveBeenCalled();

    // Altera novamente e testa Aplicar
    inputEspessura.value = '4.0';
    inputEspessura.dispatchEvent(new Event('change'));

    const spyAplicar = vi.fn();
    tabela.addEventListener('ui-aplicar', spyAplicar);
    btnAplicar.click();

    expect(tabela.dirty).toBe(false);
    expect(tabela.obterValor('espessura')).toBe(4);
    expect(spyAplicar).toHaveBeenCalled();
  });

  it('deve filtrar propriedades em tempo real pelo campo de busca', () => {
    tabela.setAttribute('filtro', '');
    tabela.categorias = mockCategorias;

    const shadow = tabela.shadowRoot!;
    const inputFiltro = shadow.querySelector('#filtro-input') as HTMLInputElement;
    expect(inputFiltro).toBeTruthy();

    // Filtra por "raio"
    inputFiltro.value = 'raio';
    inputFiltro.dispatchEvent(new Event('input'));

    const linhasVisiveis = shadow.querySelectorAll('.ui-prop__linha');
    expect(linhasVisiveis.length).toBe(1);
    expect(linhasVisiveis[0].getAttribute('data-prop-id')).toBe('raio');

    // Categoria 'geral' deve ficar oculta
    const catGeral = shadow.querySelector('[data-cat-id="geral"]');
    expect(catGeral).toBeNull();
  });

  it('deve alternar e colapsar categorias corretamente', () => {
    tabela.categorias = mockCategorias;

    const shadow = tabela.shadowRoot!;
    const catGeral = shadow.querySelector('[data-cat-id="geral"]') as HTMLElement;
    expect(catGeral.classList.contains('ui-prop__categoria--aberta')).toBe(true);

    // Clica no header da categoria para recolher
    const headerGeral = catGeral.querySelector('.ui-prop__categoria-header') as HTMLElement;
    headerGeral.click();

    expect(catGeral.classList.contains('ui-prop__categoria--aberta')).toBe(false);

    // Testa métodos públicos expandirTudo / colapsarTudo
    tabela.expandirTudo();
    expect(catGeral.classList.contains('ui-prop__categoria--aberta')).toBe(true);

    tabela.colapsarTudo();
    expect(catGeral.classList.contains('ui-prop__categoria--aberta')).toBe(false);
  });

  it('deve renderizar seletor de tipos e emitir evento ui-tipo-alterado', () => {
    tabela.tipos = mockTipos;
    tabela.tipoSelecionado = 'circulo';

    const spy = vi.fn();
    tabela.addEventListener('ui-tipo-alterado', spy);

    const shadow = tabela.shadowRoot!;
    const select = shadow.querySelector('.ui-prop__tipo-select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe('circulo');

    select.value = 'poligono';
    select.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ id: 'poligono' })
      })
    );
  });

  it('deve suportar edição e alternância em editor booleano', () => {
    tabela.categorias = mockCategorias;

    const shadow = tabela.shadowRoot!;
    const linhaVisivel = shadow.querySelector('[data-prop-id="visivel"]')!;
    const editorBool = linhaVisivel.querySelector('.ui-prop__editor-booleano') as HTMLElement;

    expect(tabela.obterValor('visivel')).toBe(true);
    editorBool.click();
    expect(tabela.obterValor('visivel')).toBe(false);
  });

  it('deve renderizar e manipular editores especiais CAD (linetype e lineweight)', () => {
    tabela.categorias = [
      {
        id: 'estilos_cad',
        titulo: 'Estilos CAD',
        aberto: true,
        propriedades: [
          { id: 'tipo_linha', rotulo: 'Linetype', tipo: 'linetype', valor: 'ByLayer' },
          { id: 'esp_linha', rotulo: 'Lineweight', tipo: 'lineweight', valor: 'ByLayer' },
          { id: 'cor_cad', rotulo: 'Color CAD', tipo: 'cor-cad', valor: 'Red' }
        ]
      }
    ];

    const shadow = tabela.shadowRoot!;

    // 1. Linetype com SVG
    const linhaLinetype = shadow.querySelector('[data-prop-id="tipo_linha"]')!;
    const svgLinha = linhaLinetype.querySelector('.ui-prop__linha-amostra-svg line') as SVGLineElement;
    expect(svgLinha).toBeTruthy();

    const selectLinetype = linhaLinetype.querySelector('.ui-prop__linha-select') as HTMLSelectElement;
    expect(selectLinetype.value).toBe('ByLayer');

    selectLinetype.value = 'Dashed';
    selectLinetype.dispatchEvent(new Event('change'));
    expect(tabela.obterValor('tipo_linha')).toBe('Dashed');
    expect(svgLinha.getAttribute('stroke-dasharray')).toBe('6,3');

    // 2. Lineweight com espessura proporcional
    const linhaLineweight = shadow.querySelector('[data-prop-id="esp_linha"]')!;
    const svgEspessura = linhaLineweight.querySelector('.ui-prop__espessura-amostra-svg line') as SVGLineElement;
    expect(svgEspessura).toBeTruthy();

    const selectEspessura = linhaLineweight.querySelector('.ui-prop__espessura-select') as HTMLSelectElement;
    selectEspessura.value = '0.50 mm';
    selectEspessura.dispatchEvent(new Event('change'));
    expect(tabela.obterValor('esp_linha')).toBe('0.50 mm');
    expect(Number(svgEspessura.getAttribute('stroke-width'))).toBeGreaterThan(1.5);

    // 3. Cor CAD
    const linhaCorCad = shadow.querySelector('[data-prop-id="cor_cad"]')!;
    const amostraCor = linhaCorCad.querySelector('.ui-prop__cor-amostra') as HTMLElement;
    expect(['#ff0000', 'rgb(255, 0, 0)']).toContain(amostraCor.style.backgroundColor);
  });

  it('deve disparar eventos de ações rápidas do AutoCAD (Quick Select, Select Objects, QuickCalc)', () => {
    tabela.setAttribute('estilo-visual', 'autocad');
    tabela.tipos = mockTipos;

    const spyQuick = vi.fn();
    const spySelect = vi.fn();
    const spyCalc = vi.fn();

    tabela.addEventListener('ui-quick-select', spyQuick);
    tabela.addEventListener('ui-selecionar-objetos', spySelect);
    tabela.addEventListener('ui-calculadora', spyCalc);

    const shadow = tabela.shadowRoot!;
    const btns = shadow.querySelectorAll('.ui-prop__btn-autocad');
    expect(btns.length).toBe(3);

    (btns[0] as HTMLButtonElement).click();
    expect(spyQuick).toHaveBeenCalledTimes(1);

    (btns[1] as HTMLButtonElement).click();
    expect(spySelect).toHaveBeenCalledTimes(1);

    (btns[2] as HTMLButtonElement).click();
    expect(spyCalc).toHaveBeenCalledTimes(1);
  });

  it('deve disparar evento ui-ajuda ao clicar no link de ajuda do rodapé', () => {
    tabela.setAttribute('modo-aplicar', 'manual');
    const spyAjuda = vi.fn();
    tabela.addEventListener('ui-ajuda', spyAjuda);

    const shadow = tabela.shadowRoot!;
    const linkAjuda = shadow.querySelector('#link-ajuda') as HTMLElement;
    linkAjuda.click();

    expect(spyAjuda).toHaveBeenCalledTimes(1);
  });

  describe('Funções de Cálculo Matemático Inline & Interações de Arraste', () => {
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

      // Dispara duplo clique no splitter
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
});
