/**
 * Regressão e robustez de <ui-stat> (Camada C do AGENTS.md).
 */
import { describe, it, expect, afterEach } from 'vitest';
import './ui-stat';
import type { UIStat } from './ui-stat';

function montar(atributos: Record<string, string> = {}): UIStat {
  const el = document.createElement('ui-stat') as UIStat;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}
const q = (el: UIStat, s: string) => el.shadowRoot!.querySelector(s) as HTMLElement;

afterEach(() => { document.body.innerHTML = ''; });

describe('acessibilidade', () => {
  it('o conjunto é um grupo rotulado pelo próprio rótulo (falhava antes)', () => {
    const el = montar({ rotulo: 'Receita', valor: '1.200' });
    const grupo = q(el, '.ui-stat');
    expect(grupo.getAttribute('role')).toBe('group');
    const id = grupo.getAttribute('aria-labelledby')!;
    expect(id).toBeTruthy();
    expect(el.shadowRoot!.getElementById(id)!.textContent).toBe('Receita');
  });

  it('sem rótulo, o grupo não aponta para um elemento vazio', () => {
    const el = montar({ valor: '5' });
    expect(q(el, '.ui-stat').hasAttribute('aria-labelledby')).toBe(false);
  });

  it('o indicador é uma imagem nomeada com a direção e a variação (falhava antes: aria-label em div solta)', () => {
    const el = montar({ rotulo: 'R', valor: '1', variacao: '12%', tendencia: 'baixa' });
    const ind = q(el, '.ui-stat__indicador');
    expect(ind.getAttribute('role')).toBe('img');
    expect(ind.getAttribute('aria-label')).toBe('Queda de 12%');
  });

  it.each([
    ['alta', 'Aumento de 5%'], ['positivo', 'Aumento de 5%'], ['baixa', 'Queda de 5%'],
    ['negativo', 'Queda de 5%'], ['neutro', 'Variação estável de 5%'], ['qualquer', 'Aumento de 5%']
  ])('tendência %s', (t, esperado) => {
    const el = montar({ valor: '1', variacao: '5%', tendencia: t });
    expect(q(el, '.ui-stat__indicador').getAttribute('aria-label')).toBe(esperado);
  });
});

describe('entradas hostis', () => {
  it('rótulo, valor, variação e descrição são texto', () => {
    const html = '<img src=x onerror=alert(1)>';
    const el = montar({ rotulo: html, valor: html, variacao: html, descricao: html });
    expect(el.shadowRoot!.querySelector('img')).toBeNull();
    expect(q(el, '.ui-stat__valor').textContent).toBe(html);
  });

  it('elevação com espaços/aspas não injeta classes extras (falhava antes)', () => {
    const el = montar({ elevacao: 'alta x"y onclick=1' });
    expect(q(el, '.ui-stat').className.split(/\s+/).sort()).toEqual(['ui-stat', 'ui-stat--baixa'].sort());
  });

  it('esconde indicador e descrição quando vazios e os mostra ao preencher', () => {
    const el = montar({ valor: '1' });
    expect(q(el, '.ui-stat__indicador').style.display).toBe('none');
    expect(q(el, '.ui-stat__descricao').style.display).toBe('none');
    el.variacao = '3%';
    el.descricao = 'vs. mês anterior';
    expect(q(el, '.ui-stat__indicador').style.display).toBe('inline-flex');
    expect(q(el, '.ui-stat__descricao').style.display).toBe('block');
  });
});
