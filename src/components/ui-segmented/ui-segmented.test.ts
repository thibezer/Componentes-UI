import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import './ui-segmented';
import { UISegmented } from './ui-segmented';

describe('Web Component: <ui-segmented>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve registrar o elemento <ui-segmented> e o alias <ui-segmento>', () => {
    expect(customElements.get('ui-segmented')).toBeDefined();
    expect(customElements.get('ui-segmento')).toBeDefined();
  });

  it('deve renderizar opções passadas via propriedade JavaScript', () => {
    const segmented = document.createElement('ui-segmented') as UISegmented;
    segmented.opcoes = [
      { valor: 'mapa', rotulo: 'Mapa' },
      { valor: 'tabela', rotulo: 'Tabela' },
      { valor: 'cad', rotulo: 'CAD' }
    ];
    document.body.appendChild(segmented);

    const botoes = segmented.shadowRoot?.querySelectorAll('.ui-segmented__item');
    expect(botoes?.length).toBe(3);
    expect(segmented.valor).toBe('mapa'); // Primeira selecionada por padrão
  });

  it('deve alternar a seleção ao clicar em um botão e disparar eventos', () => {
    const segmented = document.createElement('ui-segmented') as UISegmented;
    segmented.opcoes = [
      { valor: 'dia', rotulo: 'Dia' },
      { valor: 'mes', rotulo: 'Mês' },
      { valor: 'ano', rotulo: 'Ano' }
    ];
    document.body.appendChild(segmented);

    const spyChange = vi.fn();
    const spySelecionar = vi.fn();
    segmented.addEventListener('ui-change', spyChange);
    segmented.addEventListener('ui-selecionar', spySelecionar);

    const botoes = segmented.shadowRoot?.querySelectorAll('.ui-segmented__item') as NodeListOf<HTMLButtonElement>;
    botoes[1].click(); // Clica em 'Mês'

    expect(segmented.valor).toBe('mes');
    expect(spyChange).toHaveBeenCalledTimes(1);
    expect(spySelecionar).toHaveBeenCalledTimes(1);
    expect(spyChange.mock.calls[0][0].detail.valor).toBe('mes');
  });

  it('deve navegar entre opções via teclado (ArrowRight e ArrowLeft)', () => {
    const segmented = document.createElement('ui-segmented') as UISegmented;
    segmented.opcoes = [
      { valor: 'a', rotulo: 'Opção A' },
      { valor: 'b', rotulo: 'Opção B' },
      { valor: 'c', rotulo: 'Opção C' }
    ];
    document.body.appendChild(segmented);

    expect(segmented.valor).toBe('a');

    const container = segmented.shadowRoot?.querySelector('.ui-segmented') as HTMLElement;

    // Pressiona ArrowRight -> vai para 'b'
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(segmented.valor).toBe('b');

    // Pressiona ArrowRight -> vai para 'c'
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(segmented.valor).toBe('c');

    // Pressiona ArrowLeft -> volta para 'b'
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(segmented.valor).toBe('b');

    // Pressiona Home -> vai para 'a'
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(segmented.valor).toBe('a');
  });

  it('deve integrar com formulários e restaurar valor padrão no formResetCallback', () => {
    const form = document.createElement('form');
    const segmented = document.createElement('ui-segmented') as UISegmented;
    segmented.setAttribute('name', 'modo');
    segmented.setAttribute('valor', 'tabela');
    segmented.opcoes = [
      { valor: 'mapa', rotulo: 'Mapa' },
      { valor: 'tabela', rotulo: 'Tabela' },
      { valor: 'cad', rotulo: 'CAD' }
    ];
    form.appendChild(segmented);
    document.body.appendChild(form);

    expect(segmented.valor).toBe('tabela');

    // Usuário altera para CAD
    segmented.selecionarIndice(2);
    expect(segmented.valor).toBe('cad');

    // Reset do formulário restaura o valor padrão inicial 'tabela'
    segmented.formResetCallback();
    expect(segmented.valor).toBe('tabela');
  });

  it('deve incluir box-sizing: border-box no indicador para manter concentricidade no item à direita', () => {
    const css = fs.readFileSync(path.resolve(__dirname, './ui-segmented.css'), 'utf-8');
    expect(css).toMatch(/\.ui-segmented__indicador\s*\{[^}]*box-sizing:\s*border-box/s);
  });

  it('deve posicionar o indicador de forma concêntrica tanto no item da esquerda quanto no da direita', async () => {
    const segmented = document.createElement('ui-segmented') as UISegmented;
    segmented.opcoes = [
      { valor: 'propostas', rotulo: 'Propostas' },
      { valor: 'reclamacoes', rotulo: 'Reclamações' }
    ];
    document.body.appendChild(segmented);

    const root = segmented.shadowRoot!.querySelector('.ui-segmented') as HTMLElement;
    const indicador = segmented.shadowRoot!.querySelector('.ui-segmented__indicador') as HTMLElement;
    const botoes = segmented.shadowRoot!.querySelectorAll('.ui-segmented__item') as NodeListOf<HTMLButtonElement>;

    // Simula geometria real (container de 200px, borda 1px, padding 3px -> área interna de 198px)
    Object.defineProperty(root, 'clientLeft', { value: 1, configurable: true });
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      left: 10, top: 10, width: 200, height: 36, right: 210, bottom: 46, x: 10, y: 10, toJSON: () => ({})
    });
    // Item 0 (esquerda): inicia após 1px de borda + 3px de padding (left = 14, largura = 85.5)
    vi.spyOn(botoes[0], 'getBoundingClientRect').mockReturnValue({
      left: 14, top: 14, width: 85.5, height: 28, right: 99.5, bottom: 42, x: 14, y: 14, toJSON: () => ({})
    });
    // Item 1 (direita): inicia após gap de 2px (left = 101.5, largura = 104.5 -> termina em 206, 3px antes da borda interna direita em 209)
    vi.spyOn(botoes[1], 'getBoundingClientRect').mockReturnValue({
      left: 101.5, top: 14, width: 104.5, height: 28, right: 206, bottom: 42, x: 101.5, y: 14, toJSON: () => ({})
    });

    // Verifica item da esquerda (margem esquerda = 3px)
    segmented.selecionarIndice(0);
    await new Promise((r) => requestAnimationFrame(r));
    expect(indicador.style.transform).toBe('translateX(3px)');
    expect(indicador.style.width).toBe('85.5px');

    // Verifica item da direita (offsetLeft = 90.5px, largura = 104.5px -> borda direita em 195px, deixando exatos 3px até 198px)
    segmented.selecionarIndice(1);
    await new Promise((r) => requestAnimationFrame(r));
    expect(indicador.style.transform).toBe('translateX(90.5px)');
    expect(indicador.style.width).toBe('104.5px');
  });
});

