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