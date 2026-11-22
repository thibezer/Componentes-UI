import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-calendario';
import type { UICalendario } from './ui-calendario';

function criar(attrs: Record<string, string> = {}): UICalendario {
  const el = document.createElement('ui-calendario') as UICalendario;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}

const celulas = (el: UICalendario) => Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.ui-calendario__dia'));
const celula = (el: UICalendario, iso: string) => el.shadowRoot!.querySelector<HTMLElement>(`[data-data="${iso}"]`)!;

describe('UICalendario', () => {
  let el: UICalendario;

  afterEach(() => {
    el?.remove();
  });

  it('registra o custom element', () => {
    expect(customElements.get('ui-calendario')).toBeDefined();
  });

  it('renderiza 42 células, 30 do mês, em novembro/2026', () => {
    el = criar({ mes: '2026-11' });
    const todas = celulas(el);
    expect(todas).toHaveLength(42);
    expect(todas.filter((c) => !c.classList.contains('ui-calendario__dia--fora'))).toHaveLength(30);
    expect(el.mes).toBe('2026-11');
  });

  it('respeita inicio-semana', () => {
    el = criar({ mes: '2026-11', 'inicio-semana': '1' });
    expect(celulas(el)[0].dataset.data).toBe('2026-10-26');
    el.setAttribute('inicio-semana', '0');
    expect(celulas(el)[0].dataset.data).toBe('2026-11-01');
  });

  it('seleciona o dia clicado e emite ui-change com os eventos do dia', () => {
    el = criar({ mes: '2026-11' });
    el.eventos = [{ data: '2026-11-10', titulo: 'Prova de Cálculo', cor: '#d95b43' }];
    const spy = vi.fn();
    el.addEventListener('ui-change', spy);

    celula(el, '2026-11-10').click();

    expect(el.valor).toBe('2026-11-10');
    expect(spy).toHaveBeenCalledTimes(1);
    expect((spy.mock.calls[0][0] as CustomEvent).detail.eventos).toHaveLength(1);
    expect(celula(el, '2026-11-10').getAttribute('aria-selected')).toBe('true');
  });

  it('selecao="nenhum" não seleciona nem emite', () => {
    el = criar({ mes: '2026-11', selecao: 'nenhum' });
    const spy = vi.fn();
    el.addEventListener('ui-change', spy);
    celula(el, '2026-11-10').click();
    expect(spy).not.toHaveBeenCalled();
    expect(el.valor).toBe('');
  });

  it('botões navegam entre meses e emitem ui-mes-change', () => {
    el = criar({ mes: '2026-11' });
    const spy = vi.fn();
    el.addEventListener('ui-mes-change', spy);

    el.shadowRoot!.querySelector<HTMLElement>('[data-acao="proximo"]')!.click();
    expect(el.mes).toBe('2026-12');
    el.shadowRoot!.querySelector<HTMLElement>('[data-acao="anterior"]')!.click();
    el.shadowRoot!.querySelector<HTMLElement>('[data-acao="anterior"]')!.click();
    expect(el.mes).toBe('2026-10');
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('clicar num dia de outro mês navega até ele', () => {
    el = criar({ mes: '2026-11', 'inicio-semana': '1' });
    celula(el, '2026-10-26').click();
    expect(el.mes).toBe('2026-10');
    expect(el.valor).toBe('2026-10-26');
  });

  it('teclado: setas movem o foco e PageDown troca de mês', () => {
    el = criar({ mes: '2026-11', valor: '2026-11-18' });
    const grade = el.shadowRoot!.querySelector('.ui-calendario__grade')!;
    grade.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(celula(el, '2026-11-19').tabIndex).toBe(0);
    grade.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
    expect(el.mes).toBe('2026-12');
    expect(celula(el, '2026-12-19').tabIndex).toBe(0);
    grade.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(el.valor).toBe('2026-12-19');
  });

  it('renderiza chips de evento, +N e emite ui-evento-click sem selecionar', () => {
    el = criar({ mes: '2026-11', 'max-eventos': '2' });
    el.eventos = [
      { data: '2026-11-05', titulo: 'A', id: 1 },
      { data: '2026-11-05', titulo: 'B', id: 2 },
      { data: '2026-11-05', titulo: 'C', id: 3 }
    ];
    const c = celula(el, '2026-11-05');
    expect(c.querySelectorAll('.ui-calendario__evento')).toHaveLength(2);
    expect(c.querySelector('.ui-calendario__mais')?.textContent).toBe('+1');
    expect(c.getAttribute('aria-label')).toContain('3 eventos');

    const spy = vi.fn();
    el.addEventListener('ui-evento-click', spy);
    c.querySelectorAll<HTMLElement>('.ui-calendario__evento')[1].click();
    expect((spy.mock.calls[0][0] as CustomEvent).detail.evento.id).toBe(2);
    expect(el.valor).toBe('');
  });

  it('marca o dia de hoje', () => {
    el = criar();
    const hoje = el.shadowRoot!.querySelector('.ui-calendario__dia--hoje');
    expect(hoje).not.toBeNull();
    expect(hoje!.getAttribute('aria-current')).toBe('date');
  });

  it('hoje() vai ao mês atual e seleciona', () => {
    el = criar({ mes: '2020-01' });
    el.hoje();
    expect(el.valor).not.toBe('');
    expect(el.shadowRoot!.querySelector('.ui-calendario__dia--selecionado')).not.toBeNull();
  });

  it('seletores de mês e ano mudam o mês exibido', () => {
    el = criar({ mes: '2026-11' });
    const sel = el.shadowRoot!.querySelector<HTMLSelectElement>('[data-seletor="mes"]')!;
    sel.value = '3';
    sel.dispatchEvent(new Event('change'));
    expect(el.mes).toBe('2026-03');
  });

  it('reconexão no DOM não duplica listeners', () => {
    el = criar({ mes: '2026-11' });
    const pai = el.parentElement!;
    el.remove();
    pai.appendChild(el);
    const spy = vi.fn();
    el.addEventListener('ui-mes-change', spy);
    el.shadowRoot!.querySelector<HTMLElement>('[data-acao="proximo"]')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
