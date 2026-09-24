import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './ui-avatar';

describe('UIAvatar', () => {
  let element: any;

  beforeEach(() => {
    element = document.createElement('ui-avatar');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (document.body.contains(element)) document.body.removeChild(element);
  });

  it('should render initials safely when name is provided without src', () => {
    element.setAttribute('nome', 'Thiago Bezerra');
    const content = element.shadowRoot.querySelector('.ui-avatar__content');
    expect(content.textContent).toBe('TB');
  });

  it('should prevent XSS injection via nome or src attributes', () => {
    const xssPayload = '"><img src=x onerror="alert(1)">';
    element.setAttribute('src', 'https://example.com/avatar.jpg');
    element.setAttribute('nome', xssPayload);

    const img = element.shadowRoot.querySelector('img');
    expect(img).not.toBeNull();
    // The alt attribute must safely equal the raw payload string without spawning rogue elements
    expect(img.alt).toBe(xssPayload);
    // Check that no extra img elements or rogue script tags exist in shadow DOM
    const allImages = element.shadowRoot.querySelectorAll('img');
    expect(allImages.length).toBe(1);
    expect(element.shadowRoot.querySelector('script')).toBeNull();
  });
});
