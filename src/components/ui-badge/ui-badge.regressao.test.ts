/**
 * Regressão e robustez de <ui-badge> (Camada C do AGENTS.md).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-badge';
import type { UIBadge } from './ui-badge';

function montar(atributos: Record<string, string> = {}, texto = 'Etiqueta'): UIBadge {
  const el = document.createElement('ui-badge') as UIBadge;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  el.textContent = texto;
  document.body.appendChild(el);
  return el;
}
const fechar = (el: UIBadge) => el.shadowRoot!.querySelector('.ui-badge__close') as HTMLElement;
const base = (el: UIBadge) => el.shadowRoot!.querySelector('.ui-badge') as HTMLElement;

afterEach(() => { document.body.innerHTML = ''; });

describe('remoção', () => {
  it('clique no ✕ emite ui-remove com o valor e não propaga o clique', () => {
    const pai = document.createElement('div');
    const aoClicar = vi.fn();
    pai.addEventListener('click', aoClicar);
    const el = document.createElement('ui-badge') as UIBadge;
    el.setAttribute('removivel', '');
    el.setAttribute('value', 'v1');
    pai.appendChild(el);
    document.body.appendChild(pai);
    const remover = vi.fn();
    el.addEventListener('ui-remove', remover);
    fechar(el).click();
    expect(remover).toHaveBeenCalledTimes(1);
    expect((remover.mock.calls[0][0] as CustomEvent).detail).toEqual({ value: 'v1' });
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it.each(['Enter', ' '])('a tecla %s no ✕ também remove', (tecla) => {
    const el = montar({ removivel: '' });
    const remover = vi.fn();
    el.addEventListener('ui-remove', remover);
    fechar(el).dispatchEvent(new KeyboardEvent('keydown', { key: tecla, bubbles: true, cancelable: true }));
    expect(remover).toHaveBeenCalledTimes(1);
  });

  it('desabilitado não remove, sai da ordem de Tab e informa aria-disabled (falhava antes: disabled era ignorado)', () => {
    const el = montar({ removivel: '', disabled: '' });
    const remover = vi.fn();
    el.addEventListener('ui-remove', remover);
    fechar(el).click();
    fechar(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(remover).not.toHaveBeenCalled();
    expect(fechar(el).getAttribute('tabindex')).toBe('-1');
    expect(fechar(el).getAttribute('aria-disabled')).toBe('true');
  });

  it('reabilitar devolve o ✕ à ordem de Tab', () => {
    const el = montar({ removivel: '', disabled: '' });
    el.removeAttribute('disabled');
    expect(fechar(el).getAttribute('tabindex')).toBe('0');
    expect(fechar(el).hasAttribute('aria-disabled')).toBe(false);
  });

  it('o ✕ tem nome acessível que identifica o item removido (falhava antes: só "Remover")', () => {
    const el = montar({ removivel: '', label: 'Urgente' });
    expect(fechar(el).getAttribute('aria-label')).toBe('Remover Urgente');
    const semLabel = montar({ removivel: '', value: 'abc' });
    expect(fechar(semLabel).getAttribute('aria-label')).toBe('Remover abc');
  });

  it('só aparece quando removível', () => {
    const el = montar();
    expect(fechar(el).style.display).toBe('none');
    el.removivel = true;
    expect(fechar(el).style.display).toBe('inline-flex');
  });
});

describe('entradas hostis e ciclo de vida', () => {
  it('variante e estilo com espaços/aspas não injetam classes (falhava antes)', () => {
    const el = montar({ variante: 'erro x onclick=1', estilo: 'suave y' });
    const classes = base(el).className.split(/\s+/).sort();
    expect(classes).toEqual(['ui-badge', 'ui-badge--neutro', 'ui-badge--suave'].sort());
  });

  it('variantes conhecidas continuam funcionando', () => {
    const el = montar({ variante: 'sucesso', estilo: 'solido' });
    expect(base(el).classList.contains('ui-badge--sucesso')).toBe(true);
    expect(base(el).classList.contains('ui-badge--solido')).toBe(true);
  });

  it('label como atributo é texto', () => {
    const el = montar({ label: '<img src=x onerror=alert(1)>' });
    expect(el.shadowRoot!.querySelector('img')).toBeNull();
  });

  it('reconectar não duplica o ouvinte: um clique, um evento', () => {
    const el = montar({ removivel: '' });
    el.remove();
    document.body.appendChild(el);
    const remover = vi.fn();
    el.addEventListener('ui-remove', remover);
    fechar(el).click();
    expect(remover).toHaveBeenCalledTimes(1);
  });
});
