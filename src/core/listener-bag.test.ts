import { describe, it, expect, vi } from 'vitest';
import { ListenerBag } from './listener-bag';

describe('ListenerBag', () => {
  it('deve registrar e disparar eventos corretamente', () => {
    const bag = new ListenerBag();
    const btn = document.createElement('button');
    const callback = vi.fn();

    bag.add(btn, 'click', callback);
    expect(bag.size).toBe(1);

    btn.dispatchEvent(new MouseEvent('click'));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('deve remover todos os listeners ao chamar cleanup()', () => {
    const bag = new ListenerBag();
    const btn1 = document.createElement('button');
    const btn2 = document.createElement('button');
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    bag.add(btn1, 'click', cb1);
    bag.add(btn2, 'custom-event', cb2);
    expect(bag.size).toBe(2);

    bag.cleanup();
    expect(bag.size).toBe(0);

    btn1.dispatchEvent(new MouseEvent('click'));
    btn2.dispatchEvent(new CustomEvent('custom-event'));

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });

  it('deve ignorar elementos nulos ou indefinidos de forma segura', () => {
    const bag = new ListenerBag();
    const cb = vi.fn();

    expect(() => {
      bag.add(null, 'click', cb);
      bag.add(undefined, 'click', cb);
    }).not.toThrow();

    expect(bag.size).toBe(0);
  });
});
