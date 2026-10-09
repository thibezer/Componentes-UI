/**
 * Higienização de ícones SVG vindos de dados (props, APIs, configuração do usuário).
 *
 * Lista de permissão de elementos: tudo fora dela é removido com o conteúdo — inclusive
 * `script`, `foreignObject`, `a`, `image`, `animate`/`set` (que podem reescrever `href`)
 * e `style`. Atributos `on*` são removidos; `href` só aceita referências locais (`#id`);
 * valores com `javascript:`/`data:`/`vbscript:` ou `url()` externo são descartados.
 */

const ELEMENTOS_PERMITIDOS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'title', 'desc', 'defs', 'symbol', 'use',
  'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask'
]);

const ESQUEMA_PERIGOSO = /^(javascript|data|vbscript):/i;
const URL_EXTERNA = /url\s*\(\s*['"]?\s*(?!#)/i;

function atributoSeguro(nome: string, valor: string): boolean {
  const n = nome.toLowerCase();
  if (n.startsWith('on')) return false;
  const compacto = valor.replace(/[\s\u0000-\u001f]+/g, '');
  if (ESQUEMA_PERIGOSO.test(compacto)) return false;
  if (n === 'href' || n === 'xlink:href') return compacto.startsWith('#');
  if (URL_EXTERNA.test(valor)) return false;
  return true;
}

function higienizarElemento(el: Element): void {
  Array.from(el.children).forEach((filho) => {
    if (!ELEMENTOS_PERMITIDOS.has(filho.localName.toLowerCase())) {
      filho.remove();
      return;
    }
    higienizarElemento(filho);
  });
  Array.from(el.attributes).forEach((attr) => {
    if (!atributoSeguro(attr.name, attr.value)) el.removeAttribute(attr.name);
  });
}

/** Retorna o `<svg>` higienizado (já pronto para inserir no DOM) ou null se não houver SVG. */
export function higienizarSvg(codigo: string): SVGSVGElement | null {
  if (!codigo || typeof codigo !== 'string' || typeof document === 'undefined') return null;
  const modelo = document.createElement('template');
  modelo.innerHTML = codigo.trim();
  const svg = modelo.content.querySelector('svg');
  if (!svg) return null;
  higienizarElemento(svg);
  return svg;
}
