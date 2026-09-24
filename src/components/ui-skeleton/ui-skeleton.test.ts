import { describe, it, expect, beforeEach } from 'vitest';
import './ui-skeleton';
import { UISkeleton } from './ui-skeleton';

describe('Web Component: <ui-skeleton>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve registrar o elemento <ui-skeleton> e o alias <ui-esqueleto>', () => {
    expect(customElements.get('ui-skeleton')).toBeDefined();
    expect(customElements.get('ui-esqueleto')).toBeDefined();
  });

  it('deve renderizar variante texto como padrão', () => {
    const skeleton = document.createElement('ui-skeleton') as UISkeleton;
    document.body.appendChild(skeleton);

    const el = skeleton.shadowRoot?.querySelector('.ui-skeleton--texto');
    expect(el).not.toBeNull();
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
  });

  it('deve renderizar variante circular para avatar', () => {
    const skeleton = document.createElement('ui-skeleton') as UISkeleton;
    skeleton.setAttribute('variante', 'circular');
    skeleton.setAttribute('largura', '48px');
    skeleton.setAttribute('altura', '48px');
    document.body.appendChild(skeleton);

    const el = skeleton.shadowRoot?.querySelector('.ui-skeleton--circular') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.width).toBe('48px');
    expect(el.style.height).toBe('48px');
  });

  it('deve renderizar múltiplas linhas de texto quando linhas > 1', () => {
    const skeleton = document.createElement('ui-skeleton') as UISkeleton;
    skeleton.setAttribute('linhas', '3');
    document.body.appendChild(skeleton);

    const linhasContainer = skeleton.shadowRoot?.querySelector('.ui-skeleton__linhas');
    expect(linhasContainer).not.toBeNull();

    const linhas = linhasContainer?.querySelectorAll('.ui-skeleton--texto');
    expect(linhas?.length).toBe(3);
  });

  it('deve renderizar o template de card composto', () => {
    const skeleton = document.createElement('ui-skeleton') as UISkeleton;
    skeleton.setAttribute('variante', 'card');
    document.body.appendChild(skeleton);

    const card = skeleton.shadowRoot?.querySelector('.ui-skeleton--card');
    const media = skeleton.shadowRoot?.querySelector('.ui-skeleton__card-media');
    const avatar = skeleton.shadowRoot?.querySelector('.ui-skeleton__card-avatar');

    expect(card).not.toBeNull();
    expect(media).not.toBeNull();
    expect(avatar).not.toBeNull();
  });
});
