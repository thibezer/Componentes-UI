import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './ui-modal';

describe('UIModal', () => {
  let modal1: any;
  let modal2: any;

  beforeEach(() => {
    modal1 = document.createElement('ui-modal');
    modal2 = document.createElement('ui-modal');
    document.body.appendChild(modal1);
    document.body.appendChild(modal2);
  });

  afterEach(() => {
    if (document.body.contains(modal1)) document.body.removeChild(modal1);
    if (document.body.contains(modal2)) document.body.removeChild(modal2);
    document.body.style.overflow = '';
  });

  it('should prevent body scroll when open and restore when closed', () => {
    modal1.abrir();
    expect(document.body.style.overflow).toBe('hidden');

    modal1.fechar();
    expect(document.body.style.overflow).toBe('');
  });

  it('should restore body scroll if modal is destroyed while open', () => {
    modal1.abrir();
    expect(document.body.style.overflow).toBe('hidden');

    document.body.removeChild(modal1);
    expect(document.body.style.overflow).toBe('');
  });

  it('should restore focus to the trigger element when closed', async () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    expect(document.activeElement).toBe(button);

    modal1.abrir();

    // allow async focus logic to resolve
    await new Promise(r => setTimeout(r, 10));

    // After closing, focus should return to button
    modal1.fechar();
    expect(document.activeElement).toBe(button);

    document.body.removeChild(button);
  });

  it('should trap focus within the modal when Tab is pressed', async () => {
    modal1.innerHTML = `
      <button id="btn1">1</button>
      <button id="btn2">2</button>
    `;
    modal1.abrir();

    await new Promise(r => setTimeout(r, 10));

    const btn1 = modal1.querySelector('#btn1');
    const btn2 = modal1.querySelector('#btn2');

    // In unit testing, true focus cycling requires manual simulation
    // We'll test that the handler traps the tab key

    btn2.focus(); // Simulate reaching the end of the focusables

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    modal1.dispatchEvent(event);

    // Event was captured by handleKeyDown and default was prevented
    expect(event.defaultPrevented).toBe(true);

    // In Happy DOM we can't fully simulate the native Tab focus shift,
    // but we can check if it focused the first element as trapped
    expect(document.activeElement).toBe(modal1);

    // The first focable in our modal is the close button in the shadow DOM
    const closeBtn = modal1.shadowRoot.querySelector('.ui-modal__close');
    expect(modal1.shadowRoot.activeElement).toBe(closeBtn);
  });

  it('should close only the topmost modal when Escape is pressed', () => {
    modal1.abrir();
    modal2.abrir();

    expect(modal1.aberto).toBe(true);
    expect(modal2.aberto).toBe(true);

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    // Dispatch the event globally
    window.dispatchEvent(event);

    // With the _isTopMostModal logic, only modal2 (the last one appended and opened)
    // should process the Escape key. Modal1 will ignore it.

    expect(modal1.aberto).toBe(true); // Modal 1 stays open
    expect(modal2.aberto).toBe(false); // Modal 2 (topmost) closes
  });
});
