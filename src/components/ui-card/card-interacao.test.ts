import { describe, it, expect } from 'vitest';
import { ehControleInterno, teclaAtivaCard } from './card-interacao';

function arvore(html: string) {
  const base = document.createElement('div');
  base.innerHTML = html;
  document.body.appendChild(base);
  return base;
}

describe('ehControleInterno', () => {
  it('reconhece botão, link, campo e descendentes SVG', () => {
    const base = arvore('<button><svg><path id="p"/></svg></button><a href="#"><span id="s"></span></a><input id="i">');
    expect(ehControleInterno(base.querySelector('#p'), base)).toBe(true);
    expect(ehControleInterno(base.querySelector('#s'), base)).toBe(true);
    expect(ehControleInterno(base.querySelector('#i'), base)).toBe(true);
  });

  it('o próprio card (e texto comum) não é controle interno', () => {
    const base = arvore('<p id="t">x</p>');
    base.setAttribute('role', 'button');
    expect(ehControleInterno(base, base)).toBe(false);
    expect(ehControleInterno(base.querySelector('#t'), base)).toBe(false);
  });

  it('controle FORA da raiz não conta (card dentro de um link ou label continua clicável)', () => {
    const externo = arvore('<a href="#"><div id="raiz"><p id="t">x</p></div></a>');
    const raiz = externo.querySelector('#raiz') as Element;
    expect(ehControleInterno(externo.querySelector('#t'), raiz)).toBe(false);
  });

  it('alvo nulo ou que não é elemento não é controle', () => {
    const base = arvore('');
    expect(ehControleInterno(null, base)).toBe(false);
    expect(ehControleInterno(window, base)).toBe(false);
    expect(ehControleInterno(document.createTextNode('x'), base)).toBe(false);
  });

  it('conteúdo editável conta, mas contenteditable="false" não', () => {
    const base = arvore('<span id="e" contenteditable="true"></span><span id="n" contenteditable="false"></span>');
    expect(ehControleInterno(base.querySelector('#e'), base)).toBe(true);
    expect(ehControleInterno(base.querySelector('#n'), base)).toBe(false);
  });
});

describe('teclaAtivaCard', () => {
  const base = document.createElement('div');
  type Tecla = Pick<KeyboardEvent, 'key' | 'repeat' | 'ctrlKey' | 'altKey' | 'metaKey' | 'target'>;
  const ev = (init: Partial<Tecla>, alvo: EventTarget = base): Tecla => ({
    key: '', repeat: false, ctrlKey: false, altKey: false, metaKey: false, target: alvo, ...init
  });

  it('Enter e Espaço no próprio card ativam', () => {
    expect(teclaAtivaCard(ev({ key: 'Enter' }), base)).toBe(true);
    expect(teclaAtivaCard(ev({ key: ' ' }), base)).toBe(true);
  });

  it('outras teclas, repeat, modificadores e alvo interno não ativam', () => {
    expect(teclaAtivaCard(ev({ key: 'a' }), base)).toBe(false);
    expect(teclaAtivaCard(ev({ key: 'Enter', repeat: true }), base)).toBe(false);
    expect(teclaAtivaCard(ev({ key: 'Enter', ctrlKey: true }), base)).toBe(false);
    expect(teclaAtivaCard(ev({ key: 'Enter', altKey: true }), base)).toBe(false);
    expect(teclaAtivaCard(ev({ key: 'Enter', metaKey: true }), base)).toBe(false);
    expect(teclaAtivaCard(ev({ key: 'Enter' }, document.createElement('input')), base)).toBe(false);
  });
});
