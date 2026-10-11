import { describe, it, expect, afterEach } from 'vitest';
import './ui-lista-flutuante';
import type { UIListaFlutuante } from './ui-lista-flutuante';

afterEach(() => { document.body.innerHTML = ''; });

function criar(valor = ''): UIListaFlutuante {
  const el = document.createElement('ui-lista-flutuante') as UIListaFlutuante;
  if (valor) el.setAttribute('value', valor);
  el.itens = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];
  document.body.appendChild(el);
  return el;
}
const sr = (el: UIListaFlutuante) => el.shadowRoot!;
const itens = (el: UIListaFlutuante) => Array.from(sr(el).querySelectorAll<HTMLElement>('.ui-lista-flutuante__item'));
const tecla = (alvo: Element, key: string) => alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));

describe('ui-lista-flutuante: revisão', () => {
  it('formReset volta ao valor inicial mesmo depois de mover o elemento no DOM', () => {
    const el = criar('a');
    el.value = 'c';
    const outro = document.createElement('div');
    document.body.appendChild(outro);
    outro.appendChild(el); // desconecta e reconecta com value="c" no atributo
    el.formResetCallback();
    expect(el.value).toBe('a');
  });

  it('input dispara antes de change, como no <select> nativo', () => {
    const el = criar();
    const ordem: string[] = [];
    el.addEventListener('input', () => ordem.push('input'));
    el.addEventListener('change', () => ordem.push('change'));
    el.abrir();
    itens(el)[1].click();
    expect(ordem).toEqual(['input', 'change']);
    expect(el.value).toBe('b');
  });

  it('abrir com Enter e descer entra pelo item selecionado; Home/End percorrem a lista', () => {
    const el = criar('b');
    const gatilho = sr(el).querySelector('.ui-lista-flutuante__gatilho') as HTMLElement;
    tecla(gatilho, 'Enter');
    tecla(gatilho, 'ArrowDown');
    expect(sr(el).activeElement).toBe(itens(el)[1]);
    const conteudo = sr(el).querySelector('.ui-lista-flutuante__conteudo')!;
    tecla(conteudo, 'End');
    expect(sr(el).activeElement).toBe(itens(el)[2]);
    tecla(conteudo, 'Home');
    expect(sr(el).activeElement).toBe(itens(el)[0]);
  });

  it('Escape no gatilho fecha; Tab dentro da lista fecha', () => {
    const el = criar();
    const gatilho = sr(el).querySelector('.ui-lista-flutuante__gatilho') as HTMLElement;
    el.abrir();
    tecla(gatilho, 'Escape');
    expect(el.hasAttribute('aberta')).toBe(false);
    el.abrir();
    tecla(gatilho, 'ArrowDown');
    tecla(sr(el).querySelector('.ui-lista-flutuante__conteudo')!, 'Tab');
    expect(el.hasAttribute('aberta')).toBe(false);
  });

  it('escolher pelo teclado devolve o foco ao gatilho', () => {
    const el = criar();
    const gatilho = sr(el).querySelector('.ui-lista-flutuante__gatilho') as HTMLElement;
    tecla(gatilho, 'Enter');
    tecla(gatilho, 'ArrowDown');
    tecla(sr(el).querySelector('.ui-lista-flutuante__conteudo')!, 'Enter');
    expect(el.value).toBe('a');
    expect(sr(el).activeElement).toBe(gatilho);
  });
});
