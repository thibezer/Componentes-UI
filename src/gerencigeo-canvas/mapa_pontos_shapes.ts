/**
 * Helper para renderizar elementos HTML/SVG de marcadores no Leaflet Canvas/DOM.
 * Estilos inline 100% autônomos (independentes de Tailwind) e suporte completo a
 * formas geométricas topográficas (circle, circle-dot, square, diamond, cross, x, triangle)
 * com suporte nativo a seleção e destaque visual.
 */

export function extrairCorPonto(bgClassOuCor: string): string {
  if (!bgClassOuCor) return '#00f5a0';
  const limpa = bgClassOuCor.trim();

  // 1. Cor direta em formato Hex, RGB, HSL ou CSS Variable
  if (limpa.startsWith('#') || limpa.startsWith('rgb') || limpa.startsWith('hsl') || limpa.startsWith('var(')) {
    return limpa;
  }

  // 2. Extração de sintaxe Tailwind arbitrária (ex: 'bg-[#a855f7]')
  if (limpa.includes('bg-[#') && limpa.includes(']')) {
    const match = limpa.match(/bg-\[(#[a-fA-F0-9]+)\]/);
    if (match) return match[1];
  }

  // 3. Mapeamento de classes de cores canônicas do sistema
  const mapaClasses: Record<string, string> = {
    'bg-mint-vibrant': '#00f5a0',
    'bg-indigo-500': '#6366f1',
    'bg-rose-500': '#f43f5e',
    'bg-amber-500': '#f59e0b',
    'bg-forest-deep': '#06130b',
    'bg-purple-500': '#a855f7',
    'bg-blue-500': '#3b82f6',
    'bg-emerald-500': '#10b981'
  };

  for (const [classe, cor] of Object.entries(mapaClasses)) {
    if (limpa.includes(classe)) return cor;
  }

  return '#00f5a0';
}

export function getPointShapeHtml(
  shapeStyle: string,
  size: number,
  bgClass: string,
  extraClasses: string = '',
  id: string = '',
  selecionado: boolean = false
): string {
  const isSelected = selecionado || extraClasses.includes('ponto-selecionado') || extraClasses.includes('cad-marker-selected');
  const cor = extrairCorPonto(bgClass);
  const containerSize = size + 6;
  const innerSize = size;

  // Estilos de Destaque / Seleção Ativa
  const sombraBase = isSelected
    ? `box-shadow: 0 0 0 2px #ffffff, 0 0 0 4.5px ${cor}, 0 0 16px ${cor}; filter: drop-shadow(0 0 4px ${cor});`
    : `box-shadow: 0 1px 4px rgba(0, 0, 0, 0.65), 0 0 1px rgba(0, 0, 0, 0.9);`;

  const animTransform = isSelected
    ? 'transform: scale(1.35); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);'
    : 'transition: transform 0.15s ease, filter 0.15s ease;';

  const containerStyle = `display:flex; align-items:center; justify-content:center; width:${containerSize}px; height:${containerSize}px; position:relative; pointer-events:auto; ${animTransform}`;
  const classesCompletas = `${bgClass} ${extraClasses} ${isSelected ? 'ponto-selecionado' : ''}`.trim();

  switch (shapeStyle) {
    case 'square':
      return `
        <div id="${id}" class="${classesCompletas}" style="${containerStyle}">
          <div style="width:${innerSize}px; height:${innerSize}px; background-color:${cor}; border-radius:2px; border:1px solid rgba(0,0,0,0.4); box-sizing:border-box; ${sombraBase}"></div>
        </div>
      `;

    case 'circle-dot': {
      const dotSize = Math.max(3, Math.floor(innerSize / 3));
      return `
        <div id="${id}" class="${classesCompletas}" style="${containerStyle}">
          <div style="width:${innerSize}px; height:${innerSize}px; background-color:${cor}; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid rgba(0,0,0,0.3); box-sizing:border-box; ${sombraBase}">
            <div style="width:${dotSize}px; height:${dotSize}px; background-color:#ffffff; border-radius:50%; box-shadow:0 0 2px rgba(0,0,0,0.8);"></div>
          </div>
        </div>
      `;
    }

    case 'diamond':
      return `
        <div id="${id}" class="${classesCompletas}" style="${containerStyle}">
          <svg width="${innerSize + 2}" height="${innerSize + 2}" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible; ${isSelected ? `filter: drop-shadow(0 0 3px #ffffff) drop-shadow(0 0 6px ${cor});` : 'filter: drop-shadow(0 1px 2px rgba(0,0,0,0.7));'}">
            <polygon points="6,1 11,6 6,11 1,6" fill="${cor}" stroke="#000000" stroke-width="1.2" stroke-linejoin="round" />
            ${isSelected ? `<polygon points="6,2.5 9.5,6 6,9.5 2.5,6" fill="none" stroke="#ffffff" stroke-width="1" />` : ''}
          </svg>
        </div>
      `;

    case 'cross':
      // Cruz Ortogonal '+' (AutoCAD PDMODE 2 / Mira topográfica)
      return `
        <div id="${id}" class="${classesCompletas}" style="${containerStyle}">
          <svg width="${innerSize + 4}" height="${innerSize + 4}" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible; ${isSelected ? `filter: drop-shadow(0 0 3px #ffffff) drop-shadow(0 0 6px ${cor});` : 'filter: drop-shadow(0 1px 2px rgba(0,0,0,0.7));'}">
            ${isSelected ? `<circle cx="6" cy="6" r="5.5" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="2 2" fill="none" />` : ''}
            <!-- Halo escuro de contraste para satélite -->
            <line x1="6" y1="1" x2="6" y2="11" stroke="#000000" stroke-width="3" stroke-linecap="round" />
            <line x1="1" y1="6" x2="11" y2="6" stroke="#000000" stroke-width="3" stroke-linecap="round" />
            <!-- Traço colorido do marcador -->
            <line x1="6" y1="1" x2="6" y2="11" stroke="${cor}" stroke-width="${isSelected ? '2.2' : '1.6'}" stroke-linecap="round" />
            <line x1="1" y1="6" x2="11" y2="6" stroke="${cor}" stroke-width="${isSelected ? '2.2' : '1.6'}" stroke-linecap="round" />
          </svg>
        </div>
      `;

    case 'x':
      // Cruz Diagonal '×' (AutoCAD PDMODE 3 / Vértice de Perímetro)
      return `
        <div id="${id}" class="${classesCompletas}" style="${containerStyle}">
          <svg width="${innerSize + 4}" height="${innerSize + 4}" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible; ${isSelected ? `filter: drop-shadow(0 0 3px #ffffff) drop-shadow(0 0 6px ${cor});` : 'filter: drop-shadow(0 1px 2px rgba(0,0,0,0.7));'}">
            ${isSelected ? `<circle cx="6" cy="6" r="5.5" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="2 2" fill="none" />` : ''}
            <!-- Halo escuro de contraste para satélite -->
            <line x1="2" y1="2" x2="10" y2="10" stroke="#000000" stroke-width="3" stroke-linecap="round" />
            <line x1="10" y1="2" x2="2" y2="10" stroke="#000000" stroke-width="3" stroke-linecap="round" />
            <!-- Traço colorido do marcador -->
            <line x1="2" y1="2" x2="10" y2="10" stroke="${cor}" stroke-width="${isSelected ? '2.2' : '1.6'}" stroke-linecap="round" />
            <line x1="10" y1="2" x2="2" y2="10" stroke="${cor}" stroke-width="${isSelected ? '2.2' : '1.6'}" stroke-linecap="round" />
          </svg>
        </div>
      `;

    case 'triangle':
      // Triângulo Equilátero SVG com centro perfeitamente balanceado
      return `
        <div id="${id}" class="${classesCompletas}" style="${containerStyle}">
          <svg width="${innerSize + 2}" height="${innerSize + 2}" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible; ${isSelected ? `filter: drop-shadow(0 0 3px #ffffff) drop-shadow(0 0 6px ${cor});` : 'filter: drop-shadow(0 1px 2px rgba(0,0,0,0.7));'}">
            <polygon points="6,1.5 11,10.5 1,10.5" fill="${cor}" stroke="#000000" stroke-width="1.2" stroke-linejoin="round" />
            ${isSelected ? `<polygon points="6,3.5 9.5,9.5 2.5,9.5" fill="none" stroke="#ffffff" stroke-width="1" />` : ''}
          </svg>
        </div>
      `;

    case 'circle':
    default:
      return `
        <div id="${id}" class="${classesCompletas}" style="${containerStyle}">
          <div style="width:${innerSize}px; height:${innerSize}px; background-color:${cor}; border-radius:50%; border:1px solid rgba(0,0,0,0.35); box-sizing:border-box; ${sombraBase}"></div>
        </div>
      `;
  }
}
