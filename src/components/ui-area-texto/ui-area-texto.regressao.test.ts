/**
 * Regressão e robustez de <ui-area-texto> (Camada C do AGENTS.md).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-area-texto';
import type { UIAreaTexto } from './ui-area-texto';

function montar(atributos: Record<string, string> = {}): UIAreaTexto {
  const el = document.createElement('ui-area-texto') as UIAreaTexto;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}
const ta = (el: UIAreaTexto) => el.shadowRoot!.querySelector('textarea')!;

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('entradas hostis', () => {
  it('label com HTML é escrito como texto, nunca interpretado', () => {
    const el = montar({ label: '<img src=x onerror=alert(1)><b>negrito</b>' });
    const label = el.shadowRoot!.querySelector('label')!;
    expect(label.querySelector('img, b')).toBeNull();
    expect(label.textContent).toContain('<img');
  });

  it('mensagem-erro e helper-text com HTML não criam nós', () => {
    const el = montar({ 'helper-text': '<script>x</script>', 'mensagem-erro': '<img src=x>' });
    expect(el.shadowRoot!.querySelector('script, img')).toBeNull();
  });

  it('placeholder e value com HTML permanecem texto', () => {
    const el = montar({ placeholder: '<i>oi</i>', value: '</textarea><script>1</script>' });
    expect(ta(el).placeholder).toBe('<i>oi</i>');
    expect(ta(el).value).toBe('</textarea><script>1</script>');
    expect(el.shadowRoot!.querySelector('script')).toBeNull();
  });

  it.each(['abc', '', 'NaN', 'Infinity', '-5', '1e999', '3; x'])('linhas="%s" não lança e cai em valor válido', (valor) => {
    const el = montar({ linhas: valor });
    const linhas = Number(ta(el).getAttribute('rows'));
    expect(linhas).toBeGreaterThanOrEqual(1);
    expect(linhas).toBeLessThanOrEqual(50);
  });

  it.each(['abc', '', 'NaN', '-1', 'Infinity'])('maxlength/minlength="%s" são ignorados sem lançar', (valor) => {
    const el = montar({ maxlength: valor, minlength: valor, contador: '' });
    expect(ta(el).hasAttribute('maxlength')).toBe(false);
    expect(ta(el).hasAttribute('minlength')).toBe(false);
    expect(el.maxLength).toBe(-1);
    el.value = 'qualquer texto';
    expect(el.checkValidity()).toBe(true);
  });

  it('linhas-max hostil não injeta CSS na variável', () => {
    const el = montar({ 'auto-altura': '', 'linhas-max': '5px; background: red' });
    expect(el.style.getPropertyValue('--ui-area-linhas-max')).toBe('');
    expect(el.style.background).toBe('');
  });

  it('value setado com null/undefined/número vira texto sem lançar', () => {
    const el = montar();
    expect(() => { el.value = null as unknown as string; }).not.toThrow();
    expect(el.value).toBe('');
    el.value = 42 as unknown as string;
    expect(el.value).toBe('42');
  });

  it('volume extremo: 200 mil caracteres mantêm contador e validação consistentes', () => {
    const el = montar({ contador: '', maxlength: '1000' });
    ta(el).value = 'x'.repeat(200_000);
    ta(el).dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.shadowRoot!.querySelector('.ui-area-texto__contador')!.textContent).toBe('200000 / 1000');
    expect(el.validity?.tooLong).toBe(true);
  });
});

describe('ciclo de vida e vazamentos', () => {
  it('reconectar o elemento não duplica ouvintes (ui-input uma vez por edição)', () => {
    const el = montar();
    const spy = vi.fn();
    el.addEventListener('ui-input', spy);
    for (let i = 0; i < 3; i++) {
      el.remove();
      document.body.appendChild(el);
    }
    ta(el).value = 'a';
    ta(el).dispatchEvent(new Event('input', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('desconectado não reage a eventos do textarea nem a resize da janela', () => {
    const el = montar({ 'auto-altura': '' });
    const spy = vi.fn();
    el.addEventListener('ui-input', spy);
    el.remove();
    ta(el).dispatchEvent(new Event('input', { bubbles: true }));
    expect(spy).not.toHaveBeenCalled();

    const altura = vi.fn(() => 0);
    Object.defineProperty(ta(el), 'scrollHeight', { configurable: true, get: altura });
    window.dispatchEvent(new Event('resize'));
    expect(altura).not.toHaveBeenCalled();
  });

  it('resize da janela reajusta a altura automática enquanto conectado', () => {
    const el = montar({ 'auto-altura': '' });
    const leitura = vi.fn(() => 120);
    Object.defineProperty(ta(el), 'scrollHeight', { configurable: true, get: leitura });
    window.dispatchEvent(new Event('resize'));
    expect(leitura).toHaveBeenCalled();
  });

  it('digitar rápido várias vezes mantém o estado coerente', () => {
    const el = montar({ contador: '', maxlength: '20' });
    for (let i = 1; i <= 50; i++) {
      ta(el).value = 'a'.repeat(i % 25);
      ta(el).dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(el.shadowRoot!.querySelector('.ui-area-texto__contador')!.textContent).toBe(`${50 % 25} / 20`);
  });
});

describe('acessibilidade', () => {
  it('clique em <label for> externo foca o textarea', () => {
    document.body.innerHTML = '<label for="obs">Observações</label><ui-area-texto id="obs"></ui-area-texto>';
    const el = document.querySelector('ui-area-texto') as UIAreaTexto;
    const foco = vi.spyOn(ta(el), 'focus');
    document.querySelector('label')!.click();
    expect(foco).toHaveBeenCalled();
  });

  it('o anúncio do contador é uma região viva escondida visualmente e o contador visual é aria-hidden', () => {
    const el = montar({ contador: '' });
    expect(el.shadowRoot!.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
    expect(el.shadowRoot!.querySelector('.ui-area-texto__contador')?.getAttribute('aria-hidden')).toBe('true');
  });
});
