import { describe, it, expect } from 'vitest';
import { alvoDoEvento, eventoOriginalDe, latLngDe, pontoPixelDe } from '../src/components/ui-canvas-cad/cad-evento-coordenadas';

const rect = { left: 10, top: 20 };

describe('cad-evento-coordenadas', () => {
  it('eventoOriginalDe prefere originalEvent e tolera null/undefined', () => {
    const interno = { clientX: 1 };
    expect(eventoOriginalDe({ originalEvent: interno })).toBe(interno);
    expect(eventoOriginalDe(null)).toEqual({});
    expect(eventoOriginalDe(undefined)).toEqual({});
  });

  it('alvoDoEvento usa composedPath()[0], depois target do original, depois target do evento', () => {
    const a = document.createElement('a');
    const b = document.createElement('b');
    const c = document.createElement('i');
    expect(alvoDoEvento({ composedPath: () => [a], target: b })).toBe(a);
    expect(alvoDoEvento({ originalEvent: { target: b }, target: c })).toBe(b);
    expect(alvoDoEvento({ target: c })).toBe(c);
    expect(alvoDoEvento(null)).toBeNull();
  });

  it('pontoPixelDe segue a ordem: explícito, containerPoint, layerPoint, client - rect', () => {
    expect(pontoPixelDe({}, { x: 1.4, y: 2.6 }, rect)).toEqual({ x: 1, y: 3 });
    expect(pontoPixelDe({ containerPoint: { x: 5, y: 6 }, layerPoint: { x: 9, y: 9 } }, undefined, rect)).toEqual({ x: 5, y: 6 });
    expect(pontoPixelDe({ layerPoint: { x: 7.5, y: 8 } }, undefined, rect)).toEqual({ x: 8, y: 8 });
    expect(pontoPixelDe({ clientX: 110, clientY: 70 }, undefined, rect)).toEqual({ x: 100, y: 50 });
    expect(pontoPixelDe({ originalEvent: { clientX: 30, clientY: 40 } }, undefined, rect)).toEqual({ x: 20, y: 20 });
  });

  it('pontoPixelDe tolera evento vazio ou nulo (usa 0 - rect)', () => {
    expect(pontoPixelDe(null, undefined, rect)).toEqual({ x: -10, y: -20 });
    expect(pontoPixelDe({ containerPoint: {} }, undefined, rect)).toEqual({ x: 0, y: 0 });
  });

  it('latLngDe aceita lng ou lon, prioriza o explícito e devolve null sem lat numérica', () => {
    expect(latLngDe({ latlng: { lat: 1, lng: 2 } })).toEqual({ lat: 1, lng: 2 });
    expect(latLngDe({ latlng: { lat: 1, lon: 3 } })).toEqual({ lat: 1, lng: 3 });
    expect(latLngDe({ latlng: { lat: 1 } })).toEqual({ lat: 1, lng: 0 });
    expect(latLngDe({ latlng: { lat: 1, lng: 2 } }, { lat: 8, lng: 9 })).toEqual({ lat: 8, lng: 9 });
    expect(latLngDe({ latlng: { lat: '1' as unknown as number } })).toBeNull();
    expect(latLngDe(null)).toBeNull();
  });
});
