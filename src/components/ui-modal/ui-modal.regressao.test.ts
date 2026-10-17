/**
 * Regressão e robustez de <ui-modal> (Camada C do AGENTS.md).
 * Os casos marcados "falhava antes" documentam defeitos encontrados na revisão da Fase 4.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-modal';
import type { UIModal } from './ui-modal';

const esperar = (ms = 5) => new Promise((r) => setTimeout(r, ms));

function montar(atributos: Record<string, string> = {}, conteudo = '<button id="a">A</button><button id="b">B</button>'): UIModal {
  const el = document.createElement('ui-modal') as UIModal;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  el.innerHTML = conteudo;
  document.body.appendChild(el);
  return el;
}

const tab = (shift = false) => {
  const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true });
  window.dispatchEvent(e);
  return e;
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

describe('armadilha de foco (focus trap)', () => {
  it('Shift+Tab no botão de fechar (shadow DOM) leva ao último controle do conteúdo (falhava antes)', async () => {
    const m = montar({ titulo: 'T' });
    m.abrir();
    await esperar();
    const fechar = m.shadowRoot!.querySelector('.ui-modal__close') as HTMLButtonElement;
    fechar.focus();
    const e = tab(true);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(m.querySelector('#b'));
  });

  it('Tab no último controle volta ao botão de fechar (primeiro do modal)', async () => {
    const m = montar({ titulo: 'T' });
    m.abrir();
    await esperar();
    (m.querySelector('#b') as HTMLElement).focus();
    const e = tab(false);
    expect(e.defaultPrevented).toBe(true);
    const fechar = m.shadowRoot!.querySelector('.ui-modal__close');
    expect(m.shadowRoot!.activeElement).toBe(fechar);
  });

  it('Tab no meio não é interceptado', async () => {
    const m = montar({ titulo: 'T' });
    m.abrir();
    await esperar();
    (m.querySelector('#a') as HTMLElement).focus();
    expect(tab(false).defaultPrevented).toBe(false);
  });

  it('sem nenhum controle focável, Tab não escapa do modal', async () => {
    const m = montar({ 'aria-label': 'Vazio', 'bloquear-fechamento': '' }, '<p>texto</p>');
    m.abrir();
    await esperar();
    // o botão de fechar existe no shadow: remove-o do cálculo ocultando
    (m.shadowRoot!.querySelector('.ui-modal__close') as HTMLElement).style.display = 'none';
    expect(tab(false).defaultPrevented).toBe(true);
  });

  it('só o modal do topo da pilha responde ao teclado', async () => {
    const a = montar({ titulo: 'A' });
    const b = montar({ titulo: 'B' });
    a.abrir();
    b.abrir();
    await esperar();
    const fechadoA = vi.fn();
    a.addEventListener('ui-fechar', fechadoA);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(b.aberto).toBe(false);
    expect(a.aberto).toBe(true);
    expect(fechadoA).not.toHaveBeenCalled();
  });
});

describe('fechamento', () => {
  it('bloquear-fechamento ignora Escape, fundo e botão, mas aberto=false força o fechamento', async () => {
    const m = montar({ titulo: 'T', 'bloquear-fechamento': '' });
    m.abrir();
    await esperar();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    (m.shadowRoot!.querySelector('.ui-modal__backdrop') as HTMLElement).click();
    (m.shadowRoot!.querySelector('.ui-modal__close') as HTMLElement).click();
    expect(m.aberto).toBe(true);
    m.aberto = false;
    expect(m.aberto).toBe(false);
  });

  it('emite ui-abrir e ui-fechar uma vez por transição, também via atributo', async () => {
    const m = montar({ titulo: 'T' });
    const abrir = vi.fn();
    const fechar = vi.fn();
    m.addEventListener('ui-abrir', abrir);
    m.addEventListener('ui-fechar', fechar);
    m.setAttribute('open', '');
    m.setAttribute('aberto', '');
    expect(abrir).toHaveBeenCalledTimes(1);
    m.removeAttribute('open');
    m.removeAttribute('aberto');
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  it('restaura o overflow anterior do body (não o zera) ao fechar', () => {
    document.body.style.overflow = 'scroll';
    const m = montar({ titulo: 'T' });
    m.abrir();
    expect(document.body.style.overflow).toBe('hidden');
    m.fechar();
    expect(document.body.style.overflow).toBe('scroll');
  });
});

describe('inert e desconexão', () => {
  it('o conteúdo da página fica inert enquanto aberto e volta ao normal ao fechar; inert prévio é preservado', () => {
    const fora = document.createElement('div');
    const jaInerte = document.createElement('div');
    jaInerte.setAttribute('inert', '');
    document.body.append(fora, jaInerte);
    const m = montar({ titulo: 'T' });
    m.abrir();
    expect(fora.hasAttribute('inert')).toBe(true);
    m.fechar();
    expect(fora.hasAttribute('inert')).toBe(false);
    expect(jaInerte.hasAttribute('inert')).toBe(true);
  });

  it('desconectar aberto desfaz inert e overflow', () => {
    const fora = document.createElement('div');
    document.body.appendChild(fora);
    const m = montar({ titulo: 'T' });
    m.abrir();
    m.remove();
    expect(fora.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('reconectar não duplica o ouvinte de teclado: Escape fecha uma única vez', async () => {
    const m = montar({ titulo: 'T' });
    m.remove();
    document.body.appendChild(m);
    m.abrir();
    await esperar();
    const fechar = vi.fn();
    m.addEventListener('ui-fechar', fechar);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  it('saldo de ouvintes em window é zero após conectar/desconectar várias vezes', () => {
    const s = new Map<string, number>();
    vi.spyOn(window, 'addEventListener').mockImplementation(((t: string) => { s.set(t, (s.get(t) ?? 0) + 1); }) as never);
    vi.spyOn(window, 'removeEventListener').mockImplementation(((t: string) => { s.set(t, (s.get(t) ?? 0) - 1); }) as never);
    const m = document.createElement('ui-modal');
    for (let i = 0; i < 4; i++) {
      document.body.appendChild(m);
      m.remove();
    }
    expect(s.get('keydown') ?? 0).toBe(0);
  });
});

describe('rótulo acessível', () => {
  it('prioridade: aria-label > aria-labelledby > titulo > rótulo padrão', () => {
    const d = (m: UIModal) => m.shadowRoot!.querySelector('[role="dialog"]') as HTMLElement;
    const a = montar({ 'aria-label': 'Rotulado', titulo: 'T' });
    expect(d(a).getAttribute('aria-label')).toBe('Rotulado');
    const b = montar({ 'aria-labelledby': 'ext', titulo: 'T' });
    expect(d(b).getAttribute('aria-labelledby')).toBe('ext');
    const c = montar({ titulo: 'Título' });
    expect(d(c).getAttribute('aria-labelledby')).toBeTruthy();
    const e = montar();
    expect(d(e).getAttribute('aria-label')).toBe('Diálogo modal');
  });

  it('título com HTML é exibido como texto', () => {
    const m = montar({ titulo: '<img src=x onerror=alert(1)>' });
    expect(m.shadowRoot!.querySelector('img')).toBeNull();
    expect(m.shadowRoot!.querySelector('.ui-modal__titulo')!.textContent).toBe('<img src=x onerror=alert(1)>');
  });
});
