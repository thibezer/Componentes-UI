import { describe, it, expect, afterEach } from 'vitest';
import './ui-lista-flutuante';

/** Contrato de <select> nativo nos filhos <option>: `value=""` vale vazio e `selected` define o valor inicial. */
describe('UIListaFlutuante: opções filhas como no <select> nativo', () => {
  let el: any;
  afterEach(() => el?.remove());

  const montar = (html: string, atributos = '') => {
    document.body.insertAdjacentHTML('beforeend', `<ui-select ${atributos}>${html}</ui-select>`);
    el = document.body.lastElementChild;
    el.carregarItensFilhos();
    return el;
  };

  it('option value="" mantém o id vazio (não vira o índice)', () => {
    montar('<option value="">Herdar</option><option value="a">A</option>');
    expect(el.itens.map((i: any) => i.id)).toEqual(['', 'a']);
  });

  it('option selected define o valor inicial, inclusive o vazio', () => {
    montar('<option value="">Herdar</option><option value="a" selected>A</option>');
    expect(el.value).toBe('a');
    el.remove();
    montar('<option value="" selected>Herdar</option><option value="a">A</option>');
    expect(el.value).toBe('');
    expect(el.shadowRoot.querySelector('li[aria-selected="true"]')?.textContent).toBe('Herdar');
  });

  it('o atributo value do host tem prioridade sobre selected', () => {
    montar('<option value="a" selected>A</option><option value="b">B</option>', 'value="b"');
    expect(el.value).toBe('b');
  });

  it('option sem value continua usando o índice (comportamento anterior)', () => {
    montar('<option>Um</option><option>Dois</option>');
    expect(el.itens.map((i: any) => i.id)).toEqual(['1', '2']);
  });
});
