import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './ui-mapa';
import './ui-mapa-marcador';

describe('UIMapa e UIMapaMarcador', () => {
  let mapEl: any;

  beforeEach(() => {
    mapEl = document.createElement('ui-mapa');
    document.body.appendChild(mapEl);
  });

  afterEach(() => {
    if (document.body.contains(mapEl)) document.body.removeChild(mapEl);
  });

  it('should define ui-mapa and ui-mapa-marcador custom elements', () => {
    expect(customElements.get('ui-mapa')).toBeDefined();
    expect(customElements.get('ui-mapa-marcador')).toBeDefined();
  });

  it('should safely bind popup content without XSS vulnerability', () => {
    const markerEl = document.createElement('ui-mapa-marcador') as any;
    const xssPayload = '"><img src=x onerror="alert(1)">';
    markerEl.setAttribute('lat', '-23.55');
    markerEl.setAttribute('lng', '-46.63');
    markerEl.setAttribute('titulo', xssPayload);
    mapEl.appendChild(markerEl);

    const popupContent = (markerEl as any).createPopupContent(xssPayload);
    expect(popupContent).toBeInstanceOf(HTMLElement);
    expect(popupContent.textContent).toBe(xssPayload);
    expect(popupContent.querySelector('img')).toBeNull();
    expect(popupContent.querySelector('script')).toBeNull();
  });
});
