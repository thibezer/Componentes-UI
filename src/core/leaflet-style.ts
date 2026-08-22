import leafletCss from 'leaflet/dist/leaflet.css?inline';

export { leafletCss };

let leafletStyleSheetInstance: CSSStyleSheet | null = null;

/**
 * Retorna uma instância única compartilhada de CSSStyleSheet para o Leaflet (Constructable Stylesheets).
 * Permite que múltiplos Web Components compartilhem a mesma folha de estilo em memória sem duplicação.
 */
export function getLeafletStyleSheet(): CSSStyleSheet | null {
  if (typeof CSSStyleSheet !== 'undefined' && 'adoptedStyleSheets' in Document.prototype) {
    try {
      if (!leafletStyleSheetInstance) {
        leafletStyleSheetInstance = new CSSStyleSheet();
        leafletStyleSheetInstance.replaceSync(leafletCss);
      }
      return leafletStyleSheetInstance;
    } catch {
      return null;
    }
  }
  return null;
}
