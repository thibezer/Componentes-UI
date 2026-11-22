import { describe, it, expect, afterEach } from 'vitest';
import './ui-calendario';
import type { UICalendario } from './ui-calendario';

function criar(attrs: Record<string, string> = {}): UICalendario {
  const el = document.createElement('ui-calendario') as UICalendario;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}

describe('UICalendario — robustez (entradas hostis)', () => {
  let el: UICalendario;
  afterEach(() => el?.remove());

  it('mes/valor inválidos não quebram e caem no mês atual', () => {
    el = criar({ mes: 'lixo', valor: '2026-02-30' });
    expect(el.shadowRoot!.querySelectorAll('.ui-calendario__dia')).toHaveLength(42);
  });

  it('inicio-semana, max-eventos, selecao e exibicao inválidos usam padrão', () => {
    el = criar({ mes: '2026-11', 'inicio-semana': 'x', 'max-eventos': '-5', selecao: 'bomba', exibicao: '<img>' });
    expect(el.shadowRoot!.querySelector<HTMLElement>('.ui-calendario')!.dataset.exibicao).toBe('completo');
    expect(el.shadowRoot!.querySelectorAll('.ui-calendario__dia')).toHaveLength(42);
  });

  it('eventos nulos, não-array ou malformados são ignorados', () => {
    el = criar({ mes: '2026-11' });
    expect(() => { el.eventos = null as unknown as []; }).not.toThrow();
    expect(() => { el.eventos = [null, 3, { data: 5 }, { titulo: 'sem data' }] as never; }).not.toThrow();
    expect(el.shadowRoot!.querySelectorAll('.ui-calendario__evento')).toHaveLength(0);
  });

  it('JSON inválido no atributo eventos é ignorado', () => {
    el = criar({ mes: '2026-11', eventos: '{quebrado' });
    expect(el.eventos).toEqual([]);
  });

  it('título do evento com HTML é renderizado como texto (XSS)', () => {
    el = criar({ mes: '2026-11' });
    el.eventos = [{ data: '2026-11-05', titulo: '<img src=x onerror="alert(1)">' }];
    const chip = el.shadowRoot!.querySelector('.ui-calendario__evento')!;
    expect(chip.querySelector('img')).toBeNull();
    expect(chip.textContent).toContain('<img');
  });

  it('cor maliciosa não vaza para o atributo style', () => {
    el = criar({ mes: '2026-11' });
    el.eventos = [{ data: '2026-11-05', titulo: 'x', cor: 'red; background:url(http://evil)' }];
    const chip = el.shadowRoot!.querySelector<HTMLElement>('.ui-calendario__evento')!;
    expect(chip.getAttribute('style') || '').not.toContain('evil');
  });

  it('cliques rápidos em próximo mês avançam exatamente N meses', () => {
    el = criar({ mes: '2026-11' });
    const btn = el.shadowRoot!.querySelector<HTMLElement>('[data-acao="proximo"]')!;
    for (let i = 0; i < 14; i++) btn.click();
    expect(el.mes).toBe('2028-01');
  });

  it('limites do calendário (ano 9999 / 0001) não estouram', () => {
    el = criar({ mes: '9999-12' });
    el.proximoMes();
    expect(el.mes).toBe('9999-12');
    el.setAttribute('mes', '0001-01');
    el.mesAnterior();
    expect(el.mes).toBe('0001-01');
  });

  it('trocar o mês de 31 para fevereiro limita o dia focado', () => {
    el = criar({ mes: '2026-01', valor: '2026-01-31' });
    el.proximoMes();
    expect(el.mes).toBe('2026-02');
    expect(el.shadowRoot!.querySelector('[data-data="2026-02-28"]')!.getAttribute('tabindex')).toBe('0');
  });
});
