import { describe, it, expect, beforeEach } from 'vitest';
import '../src/register';
import fs from 'node:fs';
import path from 'node:path';

const ler = (...partes: string[]) => fs.readFileSync(path.resolve(__dirname, '..', 'src', ...partes), 'utf-8');
const botaoCss = ler('components', 'ui-botao', 'ui-botao.css');
const campoCss = ler('components', 'ui-campo-texto', 'ui-campo-texto.css');
const listaCss = ler('components', 'ui-lista-flutuante', 'ui-lista-flutuante.css');
const segmentedCss = ler('components', 'ui-segmented', 'ui-segmented.css');
const badgeCss = ler('components', 'ui-badge', 'ui-badge.css');
const tokensCss = ler('tokens', 'spacing.css');

/**
 * Contrato de "vários controles na mesma linha": o happy-dom não faz layout, então o contrato é verificado
 * (1) nos tokens e no CSS de cada controle, que devem ler a MESMA variável de altura, e
 * (2) no comportamento: o mesmo atributo produz o mesmo valor em todos os controles.
 * A medição real de pixels é feita no playground (index.html, seção "Controles na mesma linha").
 */
const ALTURA = '--ui-campo-altura';
const CONTROLES = ['ui-botao', 'ui-campo-texto', 'ui-lista-flutuante', 'ui-segmented'] as const;

describe('Contrato de altura dos controles na mesma linha', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('os tokens definem a escala sm/md/lg e o padrão md', () => {
    expect(tokensCss).toMatch(/--ui-altura-sm:\s*26px/);
    expect(tokensCss).toMatch(/--ui-altura-md:\s*34px/);
    expect(tokensCss).toMatch(/--ui-altura-lg:\s*42px/);
    expect(tokensCss).toMatch(/--ui-campo-altura:\s*var\(--ui-altura-minima\)/);
    expect(tokensCss).toMatch(/--ui-altura-minima:\s*var\(--ui-altura-md\)/);
  });

  it.each([
    ['ui-botao', botaoCss, '.ui-botao-primario {'],
    ['ui-campo-texto', campoCss, '.ui-campo-texto__wrapper {'],
    ['ui-lista-flutuante', listaCss, '.ui-lista-flutuante__gatilho {']
  ])('%s lê a altura de --ui-campo-altura (sem altura própria)', (_nome, css, seletor) => {
    const inicio = css.indexOf(seletor);
    expect(inicio).toBeGreaterThanOrEqual(0);
    const bloco = css.slice(inicio, css.indexOf('}', inicio));
    expect(bloco).toMatch(new RegExp(`\\sheight:\\s*var\\(${ALTURA}`));
    expect(bloco).toMatch(new RegExp(`min-height:\\s*var\\(${ALTURA}`));
  });

  it('ui-segmented não tem alturas fixas por tamanho: usa a mesma variável', () => {
    expect(segmentedCss).toMatch(new RegExp(`--_altura:\\s*var\\(${ALTURA}`));
    expect(segmentedCss).not.toMatch(/\bheight:\s*(28|36|42|22|32)px/);
    expect(segmentedCss).toContain('height: var(--_altura)');
  });

  it('ui-badge[controle] assume a altura dos controles', () => {
    expect(badgeCss).toMatch(new RegExp(`:host\\(\\[controle\\]\\) \\.ui-badge \\{[^}]*height:\\s*var\\(${ALTURA}`));
  });

  it('hosts de controle em linha não alinham pela linha de base (vertical-align)', () => {
    for (const css of [botaoCss, campoCss, listaCss]) {
      expect(css).toMatch(/:host\(\[inline\]\)\s*\{[^}]*vertical-align:\s*middle/);
    }
    expect(segmentedCss).toMatch(/:host\s*\{[^}]*display:\s*inline-flex[^}]*vertical-align:\s*middle/);
  });

  it.each(CONTROLES)('%s traduz tamanho/densidade/altura para a mesma variável', (tag) => {
    const casos: Array<[Record<string, string>, string]> = [
      [{ tamanho: 'sm' }, 'var(--ui-altura-sm, 26px)'],
      [{ size: 'md' }, 'var(--ui-altura-md, 34px)'],
      [{ densidade: 'relaxada' }, 'var(--ui-altura-lg, 42px)'],
      [{ altura: '40' }, '40px'],
      [{ height: '2.5rem' }, '2.5rem'],
      [{ altura: '40', tamanho: 'sm' }, '40px']
    ];
    for (const [attrs, esperado] of casos) {
      const el = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      document.body.appendChild(el);
      expect(el.style.getPropertyValue(ALTURA)).toBe(esperado);
      el.remove();
    }
  });

  it.each(CONTROLES)('%s: trocar e limpar o atributo atualiza a variável', (tag) => {
    const el = document.createElement(tag);
    document.body.appendChild(el);
    el.setAttribute('tamanho', 'lg');
    expect(el.style.getPropertyValue(ALTURA)).toBe('var(--ui-altura-lg, 42px)');
    el.setAttribute('tamanho', 'sm');
    expect(el.style.getPropertyValue(ALTURA)).toBe('var(--ui-altura-sm, 26px)');
    el.removeAttribute('tamanho');
    expect(el.style.getPropertyValue(ALTURA)).toBe('');
  });

  it.each(CONTROLES)('%s: valores hostis não escrevem a variável', (tag) => {
    const el = document.createElement(tag);
    el.setAttribute('altura', 'calc(1px);color:red');
    el.setAttribute('tamanho', '<b>x</b>');
    document.body.appendChild(el);
    expect(el.style.getPropertyValue(ALTURA)).toBe('');
  });

  it('uma ui-linha com vários controles: todos herdam o mesmo valor, nenhum declara o seu', () => {
    document.body.innerHTML = `
      <ui-linha tamanho="sm">
        <ui-segmented></ui-segmented>
        <ui-campo-texto></ui-campo-texto>
        <ui-botao>Ok</ui-botao>
        <ui-lista-flutuante></ui-lista-flutuante>
        <ui-badge controle>Ana</ui-badge>
      </ui-linha>`;
    const linha = document.querySelector('ui-linha') as HTMLElement;
    expect(linha.style.getPropertyValue(ALTURA)).toBe('var(--ui-altura-sm, 26px)');
    for (const filho of Array.from(linha.children) as HTMLElement[]) {
      expect(filho.style.getPropertyValue(ALTURA)).toBe('');
    }
  });
});
