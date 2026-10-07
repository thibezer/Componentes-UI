/**
 * Helper para renderizar marcadores (SVG inline, sem dependência de Tailwind) no Leaflet.
 *
 * Princípios visuais:
 *  - Formas nítidas: preenchimento levemente translúcido + contorno escuro fino + aro claro interno,
 *    legíveis tanto sobre satélite quanto sobre fundo escuro. Traços com `non-scaling-stroke`
 *    (espessura constante em px, independente do tamanho do marcador).
 *  - Sem blur/glow: `drop-shadow` e `box-shadow` borrados eram caros em alta densidade e passavam
 *    aparência "esfumaçada". O destaque de seleção, como no CAD, escurece o símbolo (cor da camada
 *    misturada com preto) e o recorta com contorno claro, sem anéis ao redor.
 *  - Alta densidade: modo `compacta` reduz contorno e opacidade, de modo que sobreposições
 *    fiquem legíveis (a cor "acumula") em vez de virar uma mancha de contornos escuros.
 */

export type DensidadeMarcador = 'normal' | 'compacta';

export interface OpcoesPontoShape {
  densidade?: DensidadeMarcador;
}

/** Acima deste total de pontos na camada, os marcadores passam a usar o modo compacto. */
export const LIMIAR_DENSIDADE_ALTA = 300;

export function modoDensidade(total: number): DensidadeMarcador {
  return total > LIMIAR_DENSIDADE_ALTA ? 'compacta' : 'normal';
}

/**
 * Fator de escala (0.6–1) aplicado ao tamanho dos marcadores em camadas densas.
 * Diminui com o nº de pontos (log) e com o afastamento do zoom, onde os pontos mais se sobrepõem.
 */
export function fatorDensidade(total: number, zoom: number): number {
  if (total <= LIMIAR_DENSIDADE_ALTA) return 1;
  const porQuantidade = Math.max(0.7, 1 - 0.3 * Math.log10(total / LIMIAR_DENSIDADE_ALTA));
  const porZoom = zoom >= 18 ? 1 : zoom >= 16 ? 0.92 : zoom >= 14 ? 0.82 : 0.72;
  return Math.max(0.6, porQuantidade * porZoom);
}

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

/** Escapa o valor de cor para uso seguro em atributos SVG. */
function attr(valor: string): string {
  return valor.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/** Geometria (viewBox 0..12) das formas fechadas. */
const POLIGONOS: Record<string, string> = {
  diamond: '6,0.8 11.2,6 6,11.2 0.8,6',
  triangle: '6,1 11.4,10.6 0.6,10.6'
};

/** Geometria (viewBox 0..12) das formas de traço. */
const TRACOS: Record<string, string[]> = {
  cross: ['M6 1.2V10.8', 'M1.2 6H10.8'],
  x: ['M2 2L10 10', 'M10 2L2 10']
};

export function getPointShapeHtml(
  shapeStyle: string,
  size: number,
  bgClass: string,
  extraClasses: string = '',
  id: string = '',
  selecionado: boolean = false,
  opcoes: OpcoesPontoShape = {}
): string {
  const isSelected = selecionado || extraClasses.includes('ponto-selecionado') || extraClasses.includes('cad-marker-selected');
  const compacta = opcoes.densidade === 'compacta';
  const cor = attr(extrairCorPonto(bgClass));
  const container = size + 6;

  // Selecionado: símbolo escurecido (padrão CAD) e opaco, com contorno claro para destacar do fundo
  const corFill = isSelected ? `color-mix(in srgb, ${cor} 38%, #000000)` : cor;
  const fillOpacity = isSelected ? 1 : compacta ? 0.72 : 0.9;
  const contorno = isSelected ? 'rgba(255,255,255,0.95)' : compacta ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.7)';
  const larguraContorno = isSelected ? 1.3 : compacta ? 0.8 : 1;
  const haloTraco = isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)';
  const stroke = (cls: string, c: string, w: number, extra = '') =>
    `class="${cls}" stroke="${c}" stroke-width="${w}" vector-effect="non-scaling-stroke" ${extra}`;

  const nucleo = shapeStyle in POLIGONOS
    ? `<polygon points="${POLIGONOS[shapeStyle]}" style="fill:${corFill}" fill-opacity="${fillOpacity}" stroke-linejoin="round" ${stroke('cad-pt-contorno', contorno, larguraContorno)} />`
    : shapeStyle in TRACOS
      ? TRACOS[shapeStyle].map(d =>
          // Traço = halo escuro (contraste sobre satélite) + traço colorido por cima
          `<path d="${d}" fill="none" stroke-linecap="round" ${stroke('cad-pt-halo', haloTraco, compacta ? 2.6 : 3.4)} />` +
          `<path d="${d}" fill="none" stroke-linecap="round" ${stroke('cad-pt-traco', isSelected ? corFill : cor, compacta ? 1.3 : 1.8, `stroke-opacity="${isSelected ? 1 : compacta ? 0.9 : 1}"`)} />`
        ).join('')
      : shapeStyle === 'square'
        ? `<rect x="1.2" y="1.2" width="9.6" height="9.6" rx="1.4" style="fill:${corFill}" fill-opacity="${fillOpacity}" ${stroke('cad-pt-contorno', contorno, larguraContorno)} />`
        : `<circle cx="6" cy="6" r="5.2" style="fill:${corFill}" fill-opacity="${fillOpacity}" ${stroke('cad-pt-contorno', contorno, larguraContorno)} />`;

  // Aro claro interno: separa a forma do fundo sem borrar (omitido em modo compacto)
  const aro = !compacta && !isSelected && !(shapeStyle in TRACOS)
    ? shapeStyle in POLIGONOS
      ? ''
      : shapeStyle === 'square'
        ? `<rect x="2.2" y="2.2" width="7.6" height="7.6" rx="0.9" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="0.8" vector-effect="non-scaling-stroke" />`
        : `<circle cx="6" cy="6" r="4.3" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="0.8" vector-effect="non-scaling-stroke" />`
    : '';

  const miolo = shapeStyle === 'circle-dot'
    ? `<circle cx="6" cy="6" r="1.7" fill="#ffffff" stroke="rgba(0,0,0,0.45)" stroke-width="0.6" vector-effect="non-scaling-stroke" />`
    : '';

  const classes = `cad-pt ${compacta ? 'cad-pt-compacto' : ''} ${bgClass} ${extraClasses} ${isSelected ? 'ponto-selecionado' : ''}`.replace(/\s+/g, ' ').trim();
  const dim = size;
  const idAttr = id ? `id="${attr(id)}"` : '';

  return `
    <div ${idAttr} class="${classes}" style="display:flex; align-items:center; justify-content:center; width:${container}px; height:${container}px; position:relative; pointer-events:auto; background:none !important;">
      <svg width="${dim}" height="${dim}" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style="overflow:visible; display:block;">
        ${nucleo}${aro}${miolo}
      </svg>
    </div>
  `;
}
