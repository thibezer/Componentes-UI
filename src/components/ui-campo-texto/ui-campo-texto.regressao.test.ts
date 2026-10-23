/**
 * Regressão e robustez de <ui-campo-texto> (Camada C do AGENTS.md).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-campo-texto';
import type { UICampoTexto } from './ui-campo-texto';

function montar(atributos: Record<string, string> = {}): UICampoTexto {
  const el = document.createElement('ui-campo-texto') as UICampoTexto;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}
const input = (el: UICampoTexto) => el.shadowRoot!.querySelector('input')!;

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('limites hostis', () => {
  it.each(['abc', '', 'NaN', '-1', 'Infinity'])('minlength/maxlength="%s" são ignorados no input interno e no validador', (valor) => {
    const el = montar({ minlength: valor, maxlength: valor });
    expect(input(el).hasAttribute('minlength')).toBe(false);
    expect(input(el).hasAttribute('maxlength')).toBe(false);
    el.value = 'qualquer coisa';
    expect(el.checkValidity()).toBe(true);
  });

  it('getters minLength/maxLength devolvem -1 para valores inválidos (antes devolviam NaN)', () => {
    const el = montar({ minlength: 'x', maxlength: 'y' });
    expect(el.minLength).toBe(-1);
    expect(el.maxLength).toBe(-1);
  });

  it('limites válidos continuam chegando ao input interno', () => {
    const el = montar({ minlength: '2', maxlength: '8' });
    expect(input(el).getAttribute('minlength')).toBe('2');
    expect(input(el).getAttribute('maxlength')).toBe('8');
  });
});

describe('acessibilidade do rodapé', () => {
  it('aria-describedby só referencia a ajuda quando ela está visível', () => {
    const el = montar();
    expect(input(el).hasAttribute('aria-describedby')).toBe(false);
    el.setAttribute('helper-text', 'Use o formato 000.000.000-00');
    const ajuda = el.shadowRoot!.querySelector('.ui-campo-texto__helper') as HTMLElement;
    expect(input(el).getAttribute('aria-describedby')).toBe(ajuda.id);
    el.removeAttribute('helper-text');
    expect(input(el).hasAttribute('aria-describedby')).toBe(false);
  });

  it('a ajuda é uma região viva educada para que o erro seja anunciado', () => {
    const el = montar();
    expect(el.shadowRoot!.querySelector('.ui-campo-texto__helper')?.getAttribute('aria-live')).toBe('polite');
  });

  it('campo obrigatório expõe aria-required no input interno', () => {
    const el = montar({ obrigatorio: '' });
    expect(input(el).getAttribute('aria-required')).toBe('true');
    el.removeAttribute('obrigatorio');
    expect(input(el).hasAttribute('aria-required')).toBe(false);
  });
});

describe('ciclo de vida', () => {
  it('reconectar não duplica ouvintes: ui-input é emitido uma vez por edição', () => {
    const el = montar();
    const spy = vi.fn();
    el.addEventListener('ui-input', spy);
    for (let i = 0; i < 3; i++) {
      el.remove();
      document.body.appendChild(el);
    }
    input(el).value = 'a';
    input(el).dispatchEvent(new Event('input', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('desconectado não reage a eventos do input', () => {
    const el = montar();
    const spy = vi.fn();
    el.addEventListener('ui-input', spy);
    el.remove();
    input(el).dispatchEvent(new Event('input', { bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });

  it('desconectar cancela a sincronização agendada no connectedCallback', () => {
    vi.useFakeTimers();
    const el = montar();
    const sync = vi.spyOn(el as unknown as { syncState: () => void }, 'syncState');
    el.remove();
    vi.advanceTimersByTime(500);
    expect(sync).not.toHaveBeenCalled();
  });

  it('reconexões rápidas deixam um único temporizador pendente', () => {
    vi.useFakeTimers();
    const el = montar();
    for (let i = 0; i < 5; i++) {
      el.remove();
      document.body.appendChild(el);
    }
    const sync = vi.spyOn(el as unknown as { syncState: () => void }, 'syncState');
    vi.advanceTimersByTime(500);
    expect(sync).toHaveBeenCalledTimes(1);
  });
});

describe('entradas hostis de texto', () => {
  it('label, helper e mensagem de erro com HTML permanecem texto', () => {
    const el = montar({ label: '<img src=x onerror=1>', 'helper-text': '<script>1</script>', 'mensagem-erro': '<b>x</b>' });
    expect(el.shadowRoot!.querySelector('img, script, b')).toBeNull();
  });
});
