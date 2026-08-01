import { describe, it, expect, beforeEach } from 'vitest';
import './ui-botao';
import { UIBotao } from './ui-botao';

describe('Web Component: <ui-botao>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve registrar e instanciar o elemento <ui-botao>', () => {
    const botao = document.createElement('ui-botao') as UIBotao;
    botao.textContent = 'Salvar';
    document.body.appendChild(botao);

    expect(botao).toBeInstanceOf(HTMLElement);
    expect(botao.tagName.toLowerCase()).toBe('ui-botao');
  });

  it('deve disparar o evento customizado ui-click ao ser clicado', () => {
    return new Promise<void>((resolve) => {
      const botao = document.createElement('ui-botao') as UIBotao;
      document.body.appendChild(botao);

      botao.addEventListener('ui-click', (e: Event) => {
        expect(e).toBeTruthy();
        resolve();
      });

      const btnInterno = botao.shadowRoot?.querySelector('button');
      btnInterno?.click();
    });
  });

  it('não deve disparar ui-click quando o botão estiver desabilitado', () => {
    let foiClicado = false;
    const botao = document.createElement('ui-botao') as UIBotao;
    botao.setAttribute('disabled', '');
    document.body.appendChild(botao);

    botao.addEventListener('ui-click', () => {
      foiClicado = true;
    });

    const btnInterno = botao.shadowRoot?.querySelector('button');
    btnInterno?.click();

    expect(foiClicado).toBe(false);
  });
});
