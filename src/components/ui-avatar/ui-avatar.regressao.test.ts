/**
 * Regressão e robustez de <ui-avatar> (Camada C do AGENTS.md).
 * Casos "falhava antes" documentam defeitos encontrados na revisão da Fase 5.
 */
import { describe, it, expect, afterEach } from 'vitest';
import './ui-avatar';
import type { UIAvatar } from './ui-avatar';

function montar(atributos: Record<string, string> = {}): UIAvatar {
  const el = document.createElement('ui-avatar') as UIAvatar;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}
const conteudo = (el: UIAvatar) => el.shadowRoot!.querySelector('.ui-avatar__content') as HTMLElement;
const raiz = (el: UIAvatar) => el.shadowRoot!.querySelector('.ui-avatar') as HTMLElement;

afterEach(() => { document.body.innerHTML = ''; });

describe('acessibilidade', () => {
  it('com nome, o host é uma imagem nomeada (as iniciais não são lidas como texto) (falhava antes)', () => {
    const el = montar({ nome: 'Maria Souza' });
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Maria Souza');
  });

  it('sem nome, é decorativo (aria-hidden) em vez de anunciar "Avatar" genérico (falhava antes)', () => {
    const el = montar({ src: 'x.png' });
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.shadowRoot!.querySelector('img')!.getAttribute('alt')).toBe('');
  });

  it('o status entra no nome acessível', () => {
    const el = montar({ nome: 'Ana', status: 'online' });
    expect(el.getAttribute('aria-label')).toBe('Ana, online');
  });

  it('respeita aria-label do consumidor e atualiza quando o nome muda', () => {
    const proprio = montar({ nome: 'Ana', 'aria-label': 'Responsável' });
    expect(proprio.getAttribute('aria-label')).toBe('Responsável');
    const el = montar({ nome: 'Ana' });
    el.setAttribute('nome', 'Bia');
    expect(el.getAttribute('aria-label')).toBe('Bia');
    el.removeAttribute('nome');
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('iniciais', () => {
  it.each([
    ['Maria Souza', 'MS'],
    ['  joão   da   silva  ', 'JS'],
    ['ana', 'AN'],
    ['X', 'X']
  ])('%s → %s', (nome, esperado) => {
    expect(conteudo(montar({ nome })).textContent).toBe(esperado);
  });

  it('não corta pares substitutos (emoji / caracteres fora do BMP) ao meio (falhava antes)', () => {
    const el = montar({ nome: '😀 Zé' });
    expect(conteudo(el).textContent).toBe('😀Z');
    const unico = montar({ nome: '𝒜𝒷' });
    expect(conteudo(unico).textContent).toBe('𝒜𝒷'.toUpperCase());
  });

  it('nome com HTML é texto', () => {
    const el = montar({ nome: '<img src=x onerror=alert(1)>' });
    expect(el.shadowRoot!.querySelector('img')).toBeNull();
  });
});

describe('tamanho e formato', () => {
  it.each(['xs', 'sm', 'md', 'lg', 'xl'])('tamanho nomeado %s vira classe', (t) => {
    expect(raiz(montar({ tamanho: t })).classList.contains(`ui-avatar--${t}`)).toBe(true);
  });

  it('tamanho numérico válido define a variável CSS', () => {
    expect(raiz(montar({ tamanho: '48' })).style.getPropertyValue('--ui-tamanho-avatar')).toBe('48px');
  });

  it.each(['-10', '0', '999999', 'abc', ''])('tamanho inválido (%s) não define a variável (falhava antes para negativos/enormes)', (t) => {
    expect(raiz(montar({ tamanho: t })).style.getPropertyValue('--ui-tamanho-avatar')).toBe('');
  });
});

describe('imagem', () => {
  it('se a imagem falha, cai nas iniciais usando o nome ATUAL (falhava antes: nome desatualizado no fechamento)', () => {
    const el = montar({ src: 'quebrada.png', nome: 'Ana Lima' });
    el.setAttribute('nome', 'Bia Costa');
    el.shadowRoot!.querySelector('img')?.dispatchEvent(new Event('error'));
    expect(conteudo(el).textContent).toBe('BC');
  });

  it('sem src e sem nome mostra o ícone SVG padrão', () => {
    expect(conteudo(montar()).querySelector('svg')).not.toBeNull();
  });

  it('status inválido não mostra o indicador', () => {
    const el = montar({ nome: 'A', status: 'qualquer' });
    expect((el.shadowRoot!.querySelector('.ui-avatar__status') as HTMLElement).style.display).toBe('none');
  });
});
