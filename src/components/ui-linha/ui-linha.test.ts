import { describe, it, expect, beforeEach } from 'vitest';
import './ui-linha';
import { UILinha } from './ui-linha';
import '../ui-botao';
import '../ui-campo-texto';

const ALTURA = '--ui-campo-altura';

describe('Web Component: <ui-linha>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('registra o elemento e expõe um <slot> no Shadow DOM', () => {
    expect(customElements.get('ui-linha')).toBeDefined();
    const linha = document.createElement('ui-linha') as UILinha;
    document.body.appendChild(linha);
    expect(linha.shadowRoot?.querySelector('slot')).not.toBeNull();
  });

  it('tamanho define --ui-campo-altura para os filhos', () => {
    const linha = document.createElement('ui-linha') as UILinha;
    linha.setAttribute('tamanho', 'sm');
    document.body.appendChild(linha);
    expect(linha.style.getPropertyValue(ALTURA)).toBe('var(--ui-altura-sm, 26px)');
  });

  it('densidade e altura funcionam; altura vence', () => {
    const linha = document.createElement('ui-linha') as UILinha;
    linha.setAttribute('densidade', 'relaxada');
    document.body.appendChild(linha);
    expect(linha.style.getPropertyValue(ALTURA)).toBe('var(--ui-altura-lg, 42px)');
    linha.setAttribute('altura', '40');
    expect(linha.style.getPropertyValue(ALTURA)).toBe('40px');
    linha.removeAttribute('altura');
    expect(linha.style.getPropertyValue(ALTURA)).toBe('var(--ui-altura-lg, 42px)');
  });

  it('reage a mudanças por propriedade (API programática)', () => {
    const linha = document.createElement('ui-linha') as UILinha;
    document.body.appendChild(linha);
    linha.tamanho = 'lg';
    expect(linha.getAttribute('tamanho')).toBe('lg');
    expect(linha.style.getPropertyValue(ALTURA)).toBe('var(--ui-altura-lg, 42px)');
    linha.tamanho = null;
    expect(linha.hasAttribute('tamanho')).toBe(false);
    expect(linha.style.getPropertyValue(ALTURA)).toBe('');

    linha.alinhar = 'fim';
    linha.justificar = 'entre';
    linha.espaco = 'md';
    linha.semQuebra = true;
    expect(linha.getAttribute('alinhar')).toBe('fim');
    expect(linha.getAttribute('justificar')).toBe('entre');
    expect(linha.getAttribute('espaco')).toBe('md');
    expect(linha.hasAttribute('sem-quebra')).toBe(true);
    linha.semQuebra = false;
    expect(linha.hasAttribute('sem-quebra')).toBe(false);
  });

  it('o filho com tamanho próprio vence só ele; os demais herdam da linha', () => {
    document.body.innerHTML = `
      <ui-linha tamanho="sm">
        <ui-botao>A</ui-botao>
        <ui-botao tamanho="lg">B</ui-botao>
        <ui-campo-texto></ui-campo-texto>
      </ui-linha>`;
    const [a, b, campo] = Array.from(document.querySelectorAll('ui-botao, ui-campo-texto')) as HTMLElement[];
    expect(a.style.getPropertyValue(ALTURA)).toBe(''); // herda da ui-linha
    expect(b.style.getPropertyValue(ALTURA)).toBe('var(--ui-altura-lg, 42px)');
    expect(campo.style.getPropertyValue(ALTURA)).toBe('');
  });

  it('reconectar no DOM é idempotente', () => {
    const linha = document.createElement('ui-linha') as UILinha;
    linha.setAttribute('tamanho', 'md');
    for (let i = 0; i < 3; i++) {
      document.body.appendChild(linha);
      linha.remove();
    }
    document.body.appendChild(linha);
    expect(linha.style.getPropertyValue(ALTURA)).toBe('var(--ui-altura-md, 34px)');
    expect(linha.shadowRoot?.querySelectorAll('slot').length).toBe(1);
  });
});
