import { describe, it, expect, beforeEach } from 'vitest';
import './ui-botao';
import { UIBotao } from './ui-botao';
import fs from 'fs';
import path from 'path';

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

  it('deve aplicar as classes corretas para a variante outline', () => {
    const botao = document.createElement('ui-botao') as UIBotao;
    botao.setAttribute('variante', 'outline');
    document.body.appendChild(botao);

    const btnInterno = botao.shadowRoot?.querySelector('button');
    expect(btnInterno?.classList.contains('ui-botao-primario--outline')).toBe(true);
  });

  it('deve aplicar classe ui-botao-primario--has-icon-start quando houver ícone no início com texto', () => {
    const botao = document.createElement('ui-botao') as UIBotao;
    botao.innerHTML = '<svg></svg> <span>Salvar</span>';
    document.body.appendChild(botao);

    const btnInterno = botao.shadowRoot?.querySelector('button');
    expect(btnInterno?.classList.contains('ui-botao-primario--has-icon-start')).toBe(true);
  });

  it('deve higienizar whitespace fantasma entre ícone e texto', () => {
    const botao = document.createElement('ui-botao') as UIBotao;
    botao.innerHTML = '<svg></svg>   Salvar  ';
    document.body.appendChild(botao);

    // O nó de texto após o SVG deve ter o espaço inicial removido
    const textNode = Array.from(botao.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
    expect(textNode?.textContent?.startsWith(' ')).toBe(false);
  });

  it('deve aplicar classe ui-botao-primario--icon-only quando houver apenas um ícone', () => {
    const botao = document.createElement('ui-botao') as UIBotao;
    botao.innerHTML = '<svg></svg>';
    document.body.appendChild(botao);

    const btnInterno = botao.shadowRoot?.querySelector('button');
    expect(btnInterno?.classList.contains('ui-botao-primario--icon-only')).toBe(true);
  });

  it('deve conter regras de precisão subpixel (line-height: 1 e shape-rendering: geometricPrecision)', () => {
    const css = fs.readFileSync(path.resolve(__dirname, './ui-botao.css'), 'utf-8');
    expect(css).toContain('line-height: 1;');
    expect(css).toContain('shape-rendering: geometricPrecision;');
  });
});
