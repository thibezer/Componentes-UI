import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './index';
import type { UITextoEditavel } from './ui-texto-editavel';

describe('<ui-texto-editavel>', () => {
  let el: UITextoEditavel;

  beforeEach(() => {
    el = document.createElement('ui-texto-editavel') as UITextoEditavel;
    document.body.appendChild(el);
  });

  afterEach(() => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  it('deve renderizar inicialmente em modo de leitura com botão e texto', () => {
    el.valor = 'Minha Camada';
    const shadow = el.shadowRoot!;
    const botao = shadow.querySelector('.ui-texto-editavel__botao') as HTMLButtonElement;
    const texto = shadow.querySelector('.ui-texto-editavel__texto') as HTMLSpanElement;

    expect(botao).not.toBeNull();
    expect(texto.textContent).toBe('Minha Camada');
    expect(el.estaEditando()).toBe(false);
  });

  it('deve exibir o placeholder quando o valor for vazio', () => {
    el.valor = '';
    el.placeholder = 'Clique para renomear';
    const shadow = el.shadowRoot!;
    const texto = shadow.querySelector('.ui-texto-editavel__texto') as HTMLSpanElement;

    expect(texto.textContent).toBe('Clique para renomear');
    expect(texto.classList.contains('ui-texto-editavel__texto--placeholder')).toBe(true);
  });

  it('deve entrar em modo de edição ao receber duplo clique', () => {
    el.valor = 'Item 1';
    const shadow = el.shadowRoot!;
    const botao = shadow.querySelector('.ui-texto-editavel__botao') as HTMLButtonElement;
    const input = shadow.querySelector('.ui-texto-editavel__input') as HTMLInputElement;

    const spyModo = vi.fn();
    el.addEventListener('ui-modo-alterado', spyModo);

    botao.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(el.estaEditando()).toBe(true);
    expect(input.value).toBe('Item 1');
    expect(spyModo).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { modo: 'edicao' } })
    );
  });

  it('deve entrar em modo de edição via teclado (Enter e F2)', () => {
    el.valor = 'Item Teclado';
    const shadow = el.shadowRoot!;
    const botao = shadow.querySelector('.ui-texto-editavel__botao') as HTMLButtonElement;

    botao.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
    expect(el.estaEditando()).toBe(true);

    el.cancelar();
    expect(el.estaEditando()).toBe(false);

    botao.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(el.estaEditando()).toBe(true);
  });

  it('deve confirmar a edição ao pressionar Enter e emitir eventos com novo valor', () => {
    el.valor = 'Versão 1';
    el.editar();

    const shadow = el.shadowRoot!;
    const input = shadow.querySelector('.ui-texto-editavel__input') as HTMLInputElement;
    input.value = 'Versão 2 Final';

    const spySalvar = vi.fn();
    const spyChange = vi.fn();
    el.addEventListener('ui-salvar', spySalvar);
    el.addEventListener('change', spyChange);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(el.estaEditando()).toBe(false);
    expect(el.valor).toBe('Versão 2 Final');
    expect(spySalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { valor: 'Versão 2 Final', valorAnterior: 'Versão 1' }
      })
    );
    expect(spyChange).toHaveBeenCalledTimes(1);
  });

  it('deve cancelar a edição com Escape e restaurar o valor original', () => {
    el.valor = 'Texto Original';
    el.editar();

    const shadow = el.shadowRoot!;
    const input = shadow.querySelector('.ui-texto-editavel__input') as HTMLInputElement;
    input.value = 'Texto Modificado Incorreto';

    const spyCancelar = vi.fn();
    el.addEventListener('ui-cancelar', spyCancelar);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(el.estaEditando()).toBe(false);
    expect(el.valor).toBe('Texto Original');
    expect(spyCancelar).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { valor: 'Texto Original' } })
    );
  });

  it('deve salvar alterações na perda de foco (blur) por padrão', () => {
    el.valor = 'Antes do Blur';
    el.editar();

    const shadow = el.shadowRoot!;
    const input = shadow.querySelector('.ui-texto-editavel__input') as HTMLInputElement;
    input.value = 'Depois do Blur';

    const spySalvar = vi.fn();
    el.addEventListener('ui-salvar', spySalvar);

    input.dispatchEvent(new Event('blur'));

    expect(el.estaEditando()).toBe(false);
    expect(el.valor).toBe('Depois do Blur');
    expect(spySalvar).toHaveBeenCalled();
  });

  it('deve respeitar ao-perder-foco="cancelar"', () => {
    el.valor = 'Fixado';
    el.setAttribute('ao-perder-foco', 'cancelar');
    el.editar();

    const shadow = el.shadowRoot!;
    const input = shadow.querySelector('.ui-texto-editavel__input') as HTMLInputElement;
    input.value = 'Mudança Descartada';

    input.dispatchEvent(new Event('blur'));

    expect(el.estaEditando()).toBe(false);
    expect(el.valor).toBe('Fixado');
  });

  it('não deve iniciar edição quando estiver disabled ou readonly', () => {
    el.valor = 'Imutável';
    el.disabled = true;

    el.editar();
    expect(el.estaEditando()).toBe(false);

    el.disabled = false;
    el.readOnly = true;

    el.editar();
    expect(el.estaEditando()).toBe(false);
  });

  it('deve reverter para o original se for obrigatorio e tentar salvar vazio', () => {
    el.valor = 'Não pode ser vazio';
    el.obrigatorio = true;
    el.editar();

    const shadow = el.shadowRoot!;
    const input = shadow.querySelector('.ui-texto-editavel__input') as HTMLInputElement;
    input.value = '   ';

    const salvou = el.salvar();
    expect(salvou).toBe(false);
    expect(el.valor).toBe('Não pode ser vazio');
    expect(el.estaEditando()).toBe(false);
  });

  it('permite que o consumidor intercepte e cancele a confirmação via preventDefault()', () => {
    el.valor = 'Permitido';
    el.editar();

    const shadow = el.shadowRoot!;
    const input = shadow.querySelector('.ui-texto-editavel__input') as HTMLInputElement;
    input.value = 'Valor Inválido';

    el.addEventListener('ui-salvar', (e) => {
      e.preventDefault();
    });

    const sucesso = el.salvar();
    expect(sucesso).toBe(false);
    expect(el.estaEditando()).toBe(true); // Permanece em edição para correção
  });
});
