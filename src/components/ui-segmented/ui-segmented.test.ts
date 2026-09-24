import { describe, it, expect, beforeEach, vi } from 'vitest';
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
});
