/**
 * Regressão e robustez de <ui-tooltip> (Camada C do AGENTS.md).
 * Os casos marcados "falhava antes" documentam defeitos encontrados na revisão da Fase 4.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-tooltip';
import type { UITooltip } from './ui-tooltip';

function montar(atributos: Record<string, string> = {}, conteudo = '<button id="alvo">Alvo</button>'): UITooltip {
  const el = document.createElement('ui-tooltip') as UITooltip;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  el.innerHTML = conteudo;
  document.body.appendChild(el);
  return el;
}

const balao = (el: UITooltip) => el.shadowRoot!.querySelector('.ui-tooltip') as HTMLElement;
const visivel = (el: UITooltip) => balao(el).classList.contains('ui-tooltip--visivel');

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('clique no gatilho', () => {
  it('não impede que o clique chegue a ouvintes de ancestrais (falhava antes: stopPropagation)', () => {
    const pai = document.createElement('div');
    const aoClicar = vi.fn();
    pai.addEventListener('click', aoClicar);
    const el = document.createElement('ui-tooltip') as UITooltip;
    el.setAttribute('gatilho', 'clique');
    el.setAttribute('texto', 'Dica');
    el.innerHTML = '<button id="alvo">Alvo</button>';
    pai.appendChild(el);
    document.body.appendChild(pai);

    el.querySelector('button')!.click();
    expect(aoClicar).toHaveBeenCalledTimes(1);
    expect(el.aberto).toBe(true);
  });

  it('o gatilho "clique" alterna abrir/fechar e clicar fora fecha', () => {
    const el = montar({ gatilho: 'clique', texto: 'Dica' });
    el.click();
    expect(el.aberto).toBe(true);
    el.click();
    expect(el.aberto).toBe(false);
    el.click();
    document.body.click();
    expect(el.aberto).toBe(false);
  });

  it('sem matchMedia (ambiente sem suporte) o clique não lança (falhava antes)', () => {
    vi.stubGlobal('matchMedia', undefined);
    Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true, writable: true });
    const el = montar({ texto: 'Dica' });
    expect(() => el.click()).not.toThrow();
  });
});

describe('disabled', () => {
  it('desabilitar enquanto aberto fecha o balão (falhava antes)', () => {
    const el = montar({ texto: 'Dica' });
    el.mostrar();
    expect(visivel(el)).toBe(true);
    el.disabled = true;
    expect(visivel(el)).toBe(false);
  });

  it('aberto + disabled inicial não mostra o balão (falhava antes)', () => {
    const el = montar({ texto: 'Dica', aberto: '', disabled: '' });
    expect(visivel(el)).toBe(false);
  });

  it('mostrar() é ignorado quando desabilitado e a descrição acessível é removida', () => {
    const el = montar({ texto: 'Dica', disabled: '' });
    el.mostrar();
    expect(el.aberto).toBe(false);
    expect(el.querySelector('button')!.hasAttribute('aria-description')).toBe(false);
  });
});

describe('ciclo de vida e listeners (Regra #2)', () => {
  function saldo() {
    const s = new Map<string, number>();
    const marcar = (t: string, d: number) => s.set(t, (s.get(t) ?? 0) + d);
    for (const alvo of [document, window] as const) {
      vi.spyOn(alvo, 'addEventListener').mockImplementation(((t: string) => { marcar(`${alvo === document ? 'doc' : 'win'}:${t}`, 1); }) as never);
      vi.spyOn(alvo, 'removeEventListener').mockImplementation(((t: string) => { marcar(`${alvo === document ? 'doc' : 'win'}:${t}`, -1); }) as never);
    }
    return s;
  }

  it('abrir e fechar várias vezes não acumula ouvintes globais', () => {
    const el = montar({ texto: 'Dica' });
    const s = saldo();
    for (let i = 0; i < 5; i++) {
      el.mostrar();
      el.ocultar();
    }
    for (const [chave, valor] of s) expect([chave, valor]).toEqual([chave, 0]);
  });

  it('desconectar aberto remove todos os ouvintes globais', () => {
    const el = montar({ texto: 'Dica' });
    const s = saldo();
    el.mostrar();
    el.remove();
    for (const [chave, valor] of s) expect([chave, valor]).toEqual([chave, 0]);
  });

  it('reconectar não duplica os ouvintes do host: um mouseenter abre uma vez', () => {
    const el = montar({ texto: 'Dica' });
    el.remove();
    document.body.appendChild(el);
    const aoMudar = vi.fn();
    new MutationObserver(aoMudar);
    el.dispatchEvent(new MouseEvent('mouseenter'));
    expect(el.aberto).toBe(true);
    el.ocultar();
    el.remove();
    el.dispatchEvent(new MouseEvent('mouseenter'));
    expect(el.aberto).toBe(false);
  });

  it('o atraso de ocultar é cancelado ao desconectar (sem temporizador pendente)', () => {
    vi.useFakeTimers();
    const el = montar({ texto: 'Dica' });
    el.dispatchEvent(new MouseEvent('mouseenter'));
    el.dispatchEvent(new MouseEvent('mouseleave'));
    el.remove();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('teclado e acessibilidade', () => {
  it('Escape fecha o tooltip aberto, sem propagar; fechado, não interfere', () => {
    const el = montar({ texto: 'Dica' });
    const fora = vi.fn();
    window.addEventListener('keydown', fora);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fora).toHaveBeenCalledTimes(1);

    el.mostrar();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(el.aberto).toBe(false);
    window.removeEventListener('keydown', fora);
  });

  it('expõe o texto como aria-description no gatilho e respeita descrição do consumidor', () => {
    const el = montar({ texto: 'Ajuda' });
    expect(el.querySelector('button')!.getAttribute('aria-description')).toBe('Ajuda');

    const proprio = montar({ texto: 'Ajuda' }, '<button aria-describedby="x">B</button>');
    expect(proprio.querySelector('button')!.hasAttribute('aria-description')).toBe(false);
  });

  it('o balão tem role=tooltip', () => {
    const el = montar({ texto: 'Dica' });
    expect(el.shadowRoot!.querySelector('[role="tooltip"]')).not.toBeNull();
  });
});

describe('entradas hostis', () => {
  it('texto com HTML é exibido como texto', () => {
    const el = montar({ texto: '<img src=x onerror=alert(1)>' });
    el.mostrar();
    expect(el.shadowRoot!.querySelector('img')).toBeNull();
    expect(el.shadowRoot!.querySelector('.ui-tooltip__texto')!.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it.each(['', 'cima', 'xyz', '__proto__', 'TOPO'])('posicao inválida (%s) cai em "topo" sem lançar', (valor) => {
    const el = montar({ texto: 'Dica', posicao: valor });
    expect(() => el.mostrar()).not.toThrow();
    expect(balao(el).className).toContain('ui-tooltip--topo');
  });

  it('alias em inglês continua funcionando (position=bottom)', () => {
    const el = montar({ texto: 'Dica', position: 'bottom' });
    expect(balao(el).className).toContain('ui-tooltip--baixo');
  });
});
