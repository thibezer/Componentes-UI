/**
 * Regressão e robustez de <ui-texto> (Camada C do AGENTS.md).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-texto';
import type { UITexto } from './ui-texto';

function montar(atributos: Record<string, string> = {}): UITexto {
  const el = document.createElement('ui-texto') as UITexto;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  el.textContent = 'Olá';
  document.body.appendChild(el);
  return el;
}
const alvo = (el: UITexto) => el.shadowRoot!.querySelector('.ui-texto') as HTMLElement;

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('semântica', () => {
  it.each([
    ['h1', 'H1'], ['h4', 'H4'], ['caption', 'SMALL'], ['codigo', 'CODE'], ['corpo', 'P'], ['corpo-sm', 'P'], ['desconhecida', 'P']
  ])('variante %s usa a tag %s', (variante, tag) => {
    expect(alvo(montar({ variante })).tagName).toBe(tag);
  });

  it('tag explícita permitida tem prioridade; trocar a tag recria o elemento mantendo o slot', () => {
    const el = montar({ variante: 'h2' });
    el.setAttribute('tag', 'blockquote');
    expect(alvo(el).tagName).toBe('BLOCKQUOTE');
    expect(alvo(el).querySelector('slot')).not.toBeNull();
  });
});

describe('entradas hostis', () => {
  it.each(['script', 'img onerror=alert(1)', 'iframe', 'a href=x', '<p>', '__proto__'])('tag %s é recusada com aviso e cai no padrão semântico', (tag) => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = montar({ tag });
    expect(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SMALL', 'CODE']).toContain(alvo(el).tagName);
    expect(aviso).toHaveBeenCalled();
    expect(el.shadowRoot!.querySelector('script, img, iframe, a')).toBeNull();
  });

  it('variante, cor, peso e alinhamento com espaços/aspas não injetam classes (falhava antes)', () => {
    const el = montar({ variante: 'h1 x', cor: 'erro y', peso: 'negrito z', alinhamento: 'centro w' });
    const classes = alvo(el).className.split(/\s+/);
    for (const intruso of ['x', 'y', 'z', 'w']) expect(classes).not.toContain(intruso);
    expect(classes[0]).toBe('ui-texto');
  });

  it('valores válidos geram as classes esperadas', () => {
    const el = montar({ variante: 'h2', cor: 'erro', peso: 'negrito', alinhamento: 'centro', truncar: '' });
    const c = alvo(el).classList;
    for (const esperado of ['ui-texto--h2', 'ui-texto--cor-erro', 'ui-texto--peso-negrito', 'ui-texto--alinhamento-centro', 'ui-texto--truncar']) {
      expect(c.contains(esperado)).toBe(true);
    }
  });

  it('o conteúdo projetado não é interpretado como HTML pelo componente', () => {
    const el = document.createElement('ui-texto');
    el.textContent = '<img src=x onerror=alert(1)>';
    document.body.appendChild(el);
    expect(el.shadowRoot!.querySelector('img')).toBeNull();
  });
});

describe('texto longo: atributo linhas', () => {
  it('linhas válido aplica a classe e publica a variável CSS no elemento interno', () => {
    const el = montar({ linhas: '3' });
    expect(alvo(el).classList.contains('ui-texto--linhas')).toBe(true);
    expect(alvo(el).style.getPropertyValue('--ui-texto-linhas')).toBe('3');
  });

  it.each(['abc', '', '0', '-2', 'NaN', 'Infinity', '3; color: red'])('linhas="%s" é ignorado sem lançar', (linhas) => {
    const el = montar({ linhas });
    // "0" e negativos são limitados a 1; o restante cai em "sem limite"
    const limitado = alvo(el).classList.contains('ui-texto--linhas');
    if (['0', '-2'].includes(linhas)) {
      expect(limitado).toBe(true);
      expect(alvo(el).style.getPropertyValue('--ui-texto-linhas')).toBe('1');
    } else {
      expect(limitado).toBe(false);
      expect(alvo(el).style.getPropertyValue('--ui-texto-linhas')).toBe('');
    }
  });

  it('valores enormes são limitados a 50', () => {
    expect(alvo(montar({ linhas: '99999' })).style.getPropertyValue('--ui-texto-linhas')).toBe('50');
  });

  it('truncar tem prioridade sobre linhas', () => {
    const el = montar({ truncar: '', linhas: '4' });
    expect(alvo(el).classList.contains('ui-texto--truncar')).toBe(true);
    expect(alvo(el).classList.contains('ui-texto--linhas')).toBe(false);
  });

  it('remover linhas limpa a classe e a variável; trocar a tag mantém o limite', () => {
    const el = montar({ linhas: '2' });
    el.setAttribute('tag', 'blockquote');
    expect(alvo(el).tagName).toBe('BLOCKQUOTE');
    expect(alvo(el).style.getPropertyValue('--ui-texto-linhas')).toBe('2');
    el.removeAttribute('linhas');
    expect(alvo(el).classList.contains('ui-texto--linhas')).toBe(false);
    expect(alvo(el).style.getPropertyValue('--ui-texto-linhas')).toBe('');
  });
});

describe('estrutura', () => {
  it('o elemento interno expõe part="base", inclusive depois de trocar a tag', () => {
    const el = montar();
    expect(alvo(el).getAttribute('part')).toBe('base');
    el.setAttribute('variante', 'h3');
    expect(alvo(el).getAttribute('part')).toBe('base');
  });

  it('reconectar não duplica o conteúdo interno', () => {
    const el = montar({ variante: 'h2' });
    el.remove();
    document.body.appendChild(el);
    expect(el.shadowRoot!.querySelectorAll('.ui-texto').length).toBe(1);
    expect(el.shadowRoot!.querySelectorAll('slot').length).toBe(1);
  });
});
