import { describe, it, expect, beforeEach } from 'vitest';
import './ui-segmented';
import { UISegmented } from './ui-segmented';

const opcoes = [
  { valor: 'a', rotulo: 'A' },
  { valor: 'b', rotulo: 'B' }
];

function criar(attrs: Record<string, string> = {}): UISegmented {
  const el = document.createElement('ui-segmented') as UISegmented;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.opcoes = opcoes;
  document.body.appendChild(el);
  return el;
}

describe('<ui-segmented> - regressões de dimensionamento', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('tamanho hostil nunca vira classe CSS arbitrária (cai em md)', () => {
    const el = criar({ tamanho: 'x" onclick="alert(1) injetada' });
    const base = el.shadowRoot!.querySelector('.ui-segmented')!;
    expect(base.className).toBe('ui-segmented ui-segmented--md');
  });

  it('densidade e sinônimos escolhem o tamanho visual', () => {
    expect(criar({ densidade: 'compacta' }).shadowRoot!.querySelector('.ui-segmented')!.classList.contains('ui-segmented--sm')).toBe(true);
    document.body.innerHTML = '';
    expect(criar({ size: 'lg' }).shadowRoot!.querySelector('.ui-segmented')!.classList.contains('ui-segmented--lg')).toBe(true);
  });

  it('segue o contrato --ui-campo-altura: tamanho e altura escrevem a variável no host', () => {
    const el = criar({ tamanho: 'lg' });
    expect(el.style.getPropertyValue('--ui-campo-altura')).toBe('var(--ui-altura-lg, 42px)');
    el.setAttribute('altura', '40');
    expect(el.style.getPropertyValue('--ui-campo-altura')).toBe('40px');
    el.removeAttribute('altura');
    el.removeAttribute('tamanho');
    expect(el.style.getPropertyValue('--ui-campo-altura')).toBe('');
  });

  it('sem atributo de tamanho não escreve a variável (herda da ui-linha / token)', () => {
    const el = criar();
    expect(el.style.getPropertyValue('--ui-campo-altura')).toBe('');
  });

  it('reconectar não duplica opções nem perde o tamanho', () => {
    const el = criar({ tamanho: 'sm' });
    el.remove();
    document.body.appendChild(el);
    expect(el.shadowRoot!.querySelectorAll('.ui-segmented__item').length).toBe(2);
    expect(el.style.getPropertyValue('--ui-campo-altura')).toBe('var(--ui-altura-sm, 26px)');
  });
});
