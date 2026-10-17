/**
 * Regressão e robustez de <ui-radio> e do registro de grupos (Camada C do AGENTS.md).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-radio';
import type { UIRadio } from './ui-radio';
import { RadioGrupoRegistry } from './radio-grupo-registry';

function radio(atributos: Record<string, string> = {}): UIRadio {
  const el = document.createElement('ui-radio') as UIRadio;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}
const caixa = (el: UIRadio) => el.containerElement;
const tecla = (el: UIRadio, key: string) =>
  caixa(el).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

afterEach(() => { document.body.innerHTML = ''; });

describe('registro de grupos', () => {
  it('definir o name depois de conectado (setAttribute) forma o grupo e a exclusão mútua funciona (falhava antes)', () => {
    const a = radio();
    const b = radio();
    document.body.append(a, b);
    a.setAttribute('name', 'g');
    b.setAttribute('name', 'g');
    a.selecionar();
    b.selecionar();
    expect(a.marcado).toBe(false);
    expect(b.marcado).toBe(true);
  });

  it('mudar o name move o radio de grupo (falhava antes: ficava no grupo antigo)', () => {
    const a = radio({ name: 'x' });
    const b = radio({ name: 'x' });
    document.body.append(a, b);
    a.selecionar();
    b.setAttribute('name', 'y');
    expect(RadioGrupoRegistry.obterRadiosDoGrupo(a)).toEqual([a]);
    expect(RadioGrupoRegistry.obterRadiosDoGrupo(b)).toEqual([b]);
    b.selecionar();
    expect(a.marcado).toBe(true);
    expect(b.marcado).toBe(true);
  });

  it('remover um radio de um form o tira do grupo (falhava antes: continuava registrado)', () => {
    const form = document.createElement('form');
    const [a, b, c] = [radio({ name: 'g' }), radio({ name: 'g' }), radio({ name: 'g' })];
    form.append(a, b, c);
    document.body.appendChild(form);
    expect(RadioGrupoRegistry.obterRadiosDoGrupo(a).length).toBe(3);
    b.remove();
    expect(RadioGrupoRegistry.obterRadiosDoGrupo(a)).toEqual([a, c]);
  });

  it('as setas não levam o foco a um radio que saiu do DOM (falhava antes)', () => {
    const form = document.createElement('form');
    const [a, b, c] = [radio({ name: 'g' }), radio({ name: 'g' }), radio({ name: 'g' })];
    form.append(a, b, c);
    document.body.appendChild(form);
    b.remove();
    caixa(a).focus();
    tecla(a, 'ArrowRight');
    expect(c.marcado).toBe(true);
    expect(b.marcado).toBe(false);
  });

  it('grupos de formulários diferentes são independentes', () => {
    const f1 = document.createElement('form');
    const f2 = document.createElement('form');
    const [a, b] = [radio({ name: 'g' }), radio({ name: 'g' })];
    f1.appendChild(a);
    f2.appendChild(b);
    document.body.append(f1, f2);
    a.selecionar();
    b.selecionar();
    expect(a.marcado && b.marcado).toBe(true);
  });
});

describe('teclado e roving tabindex', () => {
  it('as setas percorrem o grupo com volta circular, pulando desabilitados', () => {
    const [a, b, c] = [radio({ name: 'g' }), radio({ name: 'g', disabled: '' }), radio({ name: 'g' })];
    document.body.append(a, b, c);
    a.selecionar();
    caixa(a).focus();
    tecla(a, 'ArrowDown');
    expect(c.marcado).toBe(true);
    tecla(c, 'ArrowRight');
    expect(a.marcado).toBe(true);
    tecla(a, 'ArrowLeft');
    expect(c.marcado).toBe(true);
  });

  it('só o marcado fica na ordem de Tab; os demais têm tabindex -1', () => {
    const [a, b, c] = [radio({ name: 'g' }), radio({ name: 'g' }), radio({ name: 'g' })];
    document.body.append(a, b, c);
    b.selecionar();
    expect([a, b, c].map((r) => caixa(r).getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it('se o primeiro radio está desabilitado e nenhum está marcado, o primeiro habilitado entra na ordem de Tab (falhava antes: ninguém)', () => {
    const [a, b, c] = [radio({ name: 'g', disabled: '' }), radio({ name: 'g' }), radio({ name: 'g' })];
    document.body.append(a, b, c);
    expect([a, b, c].map((r) => caixa(r).getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it.each([' ', 'Enter'])('a tecla %s seleciona', (k) => {
    const a = radio({ name: 'g' });
    document.body.appendChild(a);
    tecla(a, k);
    expect(a.marcado).toBe(true);
  });
});

describe('formulário e eventos', () => {
  it('selecionar emite ui-change e change uma vez; selecionar de novo não emite', () => {
    const a = radio({ name: 'g', value: 'v' });
    document.body.appendChild(a);
    const ui = vi.fn();
    const nativo = vi.fn();
    a.addEventListener('ui-change', ui);
    a.addEventListener('change', nativo);
    a.selecionar();
    a.selecionar();
    expect(ui).toHaveBeenCalledTimes(1);
    expect((ui.mock.calls[0][0] as CustomEvent).detail).toEqual({ marcado: true, name: 'g', value: 'v' });
    expect(nativo).toHaveBeenCalledTimes(1);
  });

  it('desabilitado não seleciona', () => {
    const a = radio({ name: 'g', disabled: '' });
    document.body.appendChild(a);
    caixa(a).click();
    expect(a.marcado).toBe(false);
  });

  it('obrigatório sem seleção é inválido para todo o grupo; selecionar um valida todos', () => {
    const [a, b] = [radio({ name: 'g', obrigatorio: '' }), radio({ name: 'g' })];
    document.body.append(a, b);
    expect(a.checkValidity()).toBe(false);
    expect(b.checkValidity()).toBe(false);
    b.selecionar();
    expect(a.checkValidity()).toBe(true);
    expect(b.checkValidity()).toBe(true);
  });

  it('reconectar não duplica os ouvintes: um clique seleciona e emite uma vez', () => {
    const a = radio({ name: 'g' });
    document.body.appendChild(a);
    a.remove();
    document.body.appendChild(a);
    const ui = vi.fn();
    a.addEventListener('ui-change', ui);
    caixa(a).click();
    expect(ui).toHaveBeenCalledTimes(1);
  });

  it('o rótulo é texto, nunca HTML', () => {
    const a = radio({ name: 'g', label: '<img src=x onerror=alert(1)>' });
    document.body.appendChild(a);
    expect(a.shadowRoot!.querySelector('img')).toBeNull();
  });
});

describe('rótulo externo', () => {
  it('<label for> dá nome acessível e o clique no rótulo seleciona (falhava antes: sem suporte)', () => {
    const rotulo = document.createElement('label');
    rotulo.htmlFor = 'r1';
    rotulo.textContent = 'Opção A';
    const a = radio({ name: 'g', id: 'r1' });
    document.body.append(rotulo, a);
    (a as unknown as { syncState(): void }).syncState();
    expect(caixa(a).getAttribute('aria-label')).toBe('Opção A');
    rotulo.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(a.marcado).toBe(true);
  });

  it('aria-label do host é usado quando não há rótulo visível', () => {
    const a = radio({ name: 'g', 'aria-label': 'Sim' });
    document.body.appendChild(a);
    expect(caixa(a).getAttribute('aria-label')).toBe('Sim');
  });

  it('label por atributo tem prioridade e é referenciado por aria-labelledby', () => {
    const a = radio({ name: 'g', label: 'Visível' });
    document.body.appendChild(a);
    const id = caixa(a).getAttribute('aria-labelledby')!;
    expect(a.shadowRoot!.getElementById(id)!.textContent).toBe('Visível');
    expect(caixa(a).hasAttribute('aria-label')).toBe(false);
  });
});

describe('foco', () => {
  it('focus() no host foca o controle interno', () => {
    const a = radio({ name: 'g' });
    document.body.appendChild(a);
    a.focus();
    expect(a.shadowRoot!.activeElement).toBe(caixa(a));
  });
});
