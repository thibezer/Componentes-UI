/**
 * Regressão e robustez de <ui-card> (Camada C do AGENTS.md).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-card';
import type { UICard } from './ui-card';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function montar(atributos: Record<string, string> = {}, conteudo = 'Corpo'): UICard {
  const el = document.createElement('ui-card') as UICard;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  el.innerHTML = conteudo;
  document.body.appendChild(el);
  return el;
}
const base = (el: UICard) => el.shadowRoot!.querySelector('.ui-card') as HTMLElement;

/**
 * O happy-dom não propaga eventos de nós do light DOM pelo <slot> até o shadow; num navegador real o caminho é
 * filho → slot → base. Para exercitar o tratamento de verdade, o evento é despachado na base com o alvo trocado.
 */
function deAlvo(el: UICard, alvo: Element, evento: Event): Event {
  Object.defineProperty(evento, 'target', { value: alvo, configurable: true });
  base(el).dispatchEvent(evento);
  return evento;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('acessibilidade do card clicável', () => {
  it('é um botão focável por teclado (falhava antes: tabindex sem role)', () => {
    const el = montar({ clicavel: '' });
    expect(base(el).getAttribute('role')).toBe('button');
    expect(base(el).getAttribute('tabindex')).toBe('0');
  });

  it('não clicável: sem role nem tabindex', () => {
    const el = montar();
    expect(base(el).hasAttribute('role')).toBe(false);
    expect(base(el).hasAttribute('tabindex')).toBe(false);
  });

  it('desabilitado: aria-disabled e fora da ordem de Tab (falhava antes)', () => {
    const el = montar({ clicavel: '', disabled: '' });
    expect(base(el).getAttribute('aria-disabled')).toBe('true');
    expect(base(el).getAttribute('tabindex')).toBe('-1');
  });

  it('reabilitar e remover clicável limpam os atributos', () => {
    const el = montar({ clicavel: '', disabled: '' });
    el.disabled = false;
    expect(base(el).hasAttribute('aria-disabled')).toBe(false);
    expect(base(el).getAttribute('tabindex')).toBe('0');
    el.clicavel = false;
    expect(base(el).hasAttribute('role')).toBe(false);
  });
});

describe('eventos', () => {
  it('clique emite ui-click e ui-clique com o id', () => {
    const el = montar({ clicavel: '', id: 'c1' });
    const a = vi.fn();
    const b = vi.fn();
    el.addEventListener('ui-click', a);
    el.addEventListener('ui-clique', b);
    base(el).click();
    expect(a).toHaveBeenCalledTimes(1);
    expect((b.mock.calls[0][0] as CustomEvent).detail).toEqual({ id: 'c1' });
  });

  it.each(['Enter', ' '])('a tecla %s ativa o card clicável', (tecla) => {
    const el = montar({ clicavel: '' });
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    base(el).dispatchEvent(new KeyboardEvent('keydown', { key: tecla, bubbles: true, cancelable: true }));
    expect(a).toHaveBeenCalledTimes(1);
  });

  it('desabilitado ou não clicável não emite', () => {
    const a = vi.fn();
    const off = montar({ clicavel: '', disabled: '' });
    off.addEventListener('ui-click', a);
    base(off).click();
    base(off).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const comum = montar();
    comum.addEventListener('ui-click', a);
    base(comum).click();
    expect(a).not.toHaveBeenCalled();
  });

  it('clique num controle interno não ativa o card', () => {
    const el = montar({ clicavel: '' }, '<button id="b">x</button>');
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    (el.querySelector('#b') as HTMLElement).click();
    expect(a).not.toHaveBeenCalled();
  });

  it('reconectar não duplica ouvintes', () => {
    const el = montar({ clicavel: '' });
    el.remove();
    document.body.appendChild(el);
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    base(el).click();
    expect(a).toHaveBeenCalledTimes(1);
  });
});

describe('entradas hostis', () => {
  it('elevação e variante com espaços/aspas não injetam classes (falhava antes)', () => {
    const el = montar({ elevacao: 'alta x"y', variante: 'destaque z onclick=1' });
    const classes = base(el).className.split(/\s+/).sort();
    expect(classes).toEqual(['ui-card', 'ui-card--plano'].sort());
  });

  it('valores válidos continuam aplicados', () => {
    const el = montar({ elevacao: 'elevado', variante: 'destaque' });
    expect(base(el).classList.contains('ui-card--elevado')).toBe(true);
    expect(base(el).classList.contains('ui-card--destaque')).toBe(true);
  });

  it('seções sem conteúdo ficam ocultas e aparecem ao receber slot', () => {
    const el = montar();
    const cab = el.shadowRoot!.querySelector('.ui-card__header') as HTMLElement;
    expect(cab.style.display).toBe('none');
    const h = document.createElement('h3');
    h.slot = 'cabecalho';
    h.textContent = 'T';
    el.appendChild(h);
    (el as unknown as { syncState(): void }).syncState();
    expect(cab.style.display).toBe('flex');
  });
});

describe('lapidação: teclado e cliques vindos de controles internos', () => {
  it('Enter/Espaço dentro de um campo interno não ativa o card nem é cancelado (falhava antes)', () => {
    const el = montar({ clicavel: '' }, '<input id="i">');
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    const campo = el.querySelector('#i') as HTMLElement;
    for (const key of ['Enter', ' ']) {
      const ev = deAlvo(el, campo, new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      expect(ev.defaultPrevented).toBe(false);
    }
    expect(a).not.toHaveBeenCalled();
  });

  it('Enter num botão interno deixa o botão agir sozinho (falhava antes)', () => {
    const el = montar({ clicavel: '' }, '<button id="b">x</button>');
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    const ev = deAlvo(el, el.querySelector('#b')!, new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(ev.defaultPrevented).toBe(false);
    expect(a).not.toHaveBeenCalled();
  });

  it('tecla mantida pressionada (repeat) ativa uma vez só', () => {
    const el = montar({ clicavel: '' });
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    base(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    base(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true }));
    expect(a).toHaveBeenCalledTimes(1);
  });

  it('atalhos com Ctrl não ativam o card', () => {
    const el = montar({ clicavel: '' });
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    base(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(a).not.toHaveBeenCalled();
  });

  it('clique num ícone SVG dentro de um botão não ativa o card (falhava antes: SVG não é HTMLElement)', () => {
    const el = montar({ clicavel: '' }, '<button><svg><path id="p" d="M0 0"/></svg></button>');
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    deAlvo(el, el.querySelector('#p')!, new MouseEvent('click', { bubbles: true }));
    expect(a).not.toHaveBeenCalled();
  });

  it.each([
    ['<label id="x">rótulo</label>'],
    ['<span id="x" contenteditable="true">editável</span>'],
    ['<summary id="x">detalhe</summary>'],
    ['<ui-campo-texto id="x"></ui-campo-texto>']
  ])('clique em %s não ativa o card', (html) => {
    const el = montar({ clicavel: '' }, html);
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    deAlvo(el, el.querySelector('#x')!, new MouseEvent('click', { bubbles: true }));
    expect(a).not.toHaveBeenCalled();
  });

  it('texto comum dentro do corpo ainda ativa o card', () => {
    const el = montar({ clicavel: '' }, '<p id="t">texto</p>');
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    deAlvo(el, el.querySelector('#t')!, new MouseEvent('click', { bubbles: true }));
    expect(a).toHaveBeenCalledTimes(1);
  });
});

describe('lapidação: foco, nome acessível e seções', () => {
  it('focus() no host foca o card clicável (falhava antes: não fazia nada)', () => {
    const el = montar({ clicavel: '' });
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(base(el));
  });

  it('focus() não foca um card desabilitado', () => {
    const el = montar({ clicavel: '', disabled: '' });
    el.focus();
    expect(el.shadowRoot!.activeElement).toBeNull();
  });

  it('aria-label do host dá nome ao card clicável e acompanha mudanças (falhava antes)', () => {
    const el = montar({ clicavel: '', 'aria-label': 'Abrir projeto Alfa' });
    expect(base(el).getAttribute('aria-label')).toBe('Abrir projeto Alfa');
    el.setAttribute('aria-label', 'Abrir Beta');
    expect(base(el).getAttribute('aria-label')).toBe('Abrir Beta');
    el.removeAttribute('aria-label');
    expect(base(el).hasAttribute('aria-label')).toBe(false);
  });

  it('aria-label não vai para um card não clicável (div sem papel ignora o rótulo)', () => {
    const el = montar({ 'aria-label': 'Resumo' });
    expect(base(el).hasAttribute('aria-label')).toBe(false);
  });

  it('[slot] aninhado em um descendente não revela a seção (falhava antes)', () => {
    const el = montar({}, '<div><span slot="cabecalho">de outro card</span></div>');
    const cab = el.shadowRoot!.querySelector('.ui-card__header') as HTMLElement;
    expect(cab.style.display).toBe('none');
  });

  it('[slot] filho direto revela a seção, também pelo alias em inglês', () => {
    const el = montar({}, '<span slot="footer">f</span>');
    const rod = el.shadowRoot!.querySelector('.ui-card__footer') as HTMLElement;
    expect(rod.style.display).toBe('flex');
  });

  it('seção volta a ficar oculta quando o conteúdo do slot é removido', () => {
    const el = montar({}, '<span slot="media">m</span>');
    const midia = el.shadowRoot!.querySelector('.ui-card__media') as HTMLElement;
    expect(midia.style.display).toBe('block');
    el.querySelector('[slot=media]')!.remove();
    (el as unknown as { syncState(): void }).syncState();
    expect(midia.style.display).toBe('none');
  });
});

describe('lapidação: estilos', () => {
  const css = readFileSync(join(process.cwd(), 'src/components/ui-card/ui-card.css'), 'utf-8');

  it('respeita o atributo hidden do host (display:block o anulava)', () => {
    expect(css).toMatch(/:host\(\[hidden\]\)\s*\{[^}]*display:\s*none/);
  });

  it('tem anel de foco visível para o card clicável', () => {
    expect(css).toMatch(/\.ui-card--clicavel:focus-visible\s*\{[^}]*outline/);
  });

  it('desliga a animação com prefers-reduced-motion', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('o realce de hover só vale em dispositivos com hover', () => {
    expect(css).toMatch(/@media \(hover: hover\)[\s\S]*\.ui-card--clicavel:hover/);
  });
});
