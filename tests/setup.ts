import 'element-internals-polyfill';

// Mock abrangente de Canvas 2D Context para testes headless/HappyDOM com Leaflet Canvas
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    if (contextType === '2d') {
      const mockCtx: any = {
        canvas: this,
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        clearRect: () => {},
        beginPath: () => {},
        arc: () => {},
        rect: () => {},
        fill: () => {},
        stroke: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        clip: () => {},
        save: () => {},
        restore: () => {},
        setTransform: () => {},
        resetTransform: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        drawImage: () => {},
        bezierCurveTo: () => {},
        quadraticCurveTo: () => {},
        isPointInPath: () => false,
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createPattern: () => null,
        getImageData: () => ({ data: [] }),
        putImageData: () => {},
        measureText: () => ({ width: 0 }),
        fillText: () => {},
        strokeText: () => {}
      };
      return mockCtx;
    }
    return null;
  };
}

import L from 'leaflet';

if (L && L.Canvas) {
  const origClear = (L.Canvas.prototype as any)._clear;
  (L.Canvas.prototype as any)._clear = function () {
    if (!this._ctx) return;
    return origClear.call(this);
  };

  const origDraw = (L.Canvas.prototype as any)._draw;
  (L.Canvas.prototype as any)._draw = function () {
    if (!this._ctx) return;
    return origDraw.call(this);
  };
}