import { describe, it, expect, beforeEach, vi } from 'vitest';
import './ui-tabela-propriedades';
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

  it('deve alternar a compressão vertical (densidade) ao clicar no botão de densidade ou chamar alternarDensidade()', () => {
    const shadow = tabela.shadowRoot!;
    const btnDensidade = shadow.querySelector('#btn-densidade') as HTMLButtonElement;
    expect(btnDensidade).toBeTruthy();

    const spyDensidade = vi.fn();
    tabela.addEventListener('ui-densidade-alterada', spyDensidade);

    // 1. Padrão -> Compacta
    btnDensidade.click();
    expect(tabela.getAttribute('densidade')).toBe('compacta');
    expect(tabela.densidade).toBe('compacta');
    expect(spyDensidade).toHaveBeenCalledWith(expect.objectContaining({ detail: { densidade: 'compacta' } }));

    // 2. Compacta -> Ultracompacta
    btnDensidade.click();
    expect(tabela.getAttribute('densidade')).toBe('ultracompacta');
    expect(tabela.densidade).toBe('ultracompacta');
    expect(spyDensidade).toHaveBeenCalledWith(expect.objectContaining({ detail: { densidade: 'ultracompacta' } }));

    // 3. Ultracompacta -> Padrão
    btnDensidade.click();
    expect(tabela.hasAttribute('densidade')).toBe(false);
    expect(tabela.densidade).toBe('padrao');
    expect(spyDensidade).toHaveBeenCalledWith(expect.objectContaining({ detail: { densidade: 'padrao' } }));
  });
});

