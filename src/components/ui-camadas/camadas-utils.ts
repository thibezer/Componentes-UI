/* ====================================================
   UI Camadas - Utilitários de Segurança e Sanitização
   Anti-XSS, Validação de Cores CSS e Tipos de Coordenadas
   ==================================================== */

/**
 * Escapa caracteres HTML perigosos para prevenir ataques XSS
 */
export function escapeHtml(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Padrão seguro para cores CSS:
 * - Hexadecimal: #rgb, #rgba, #rrggbb, #rrggbbaa
 * - rgb/rgba/hsl/hsla (sintaxe com vírgula ou espaço, números, % e unidades de ângulo)
 * - Nomes de cor (apenas letras): red, transparent, currentColor...
 * Nenhuma alternativa aceita `;`, aspas ou parênteses aninhados, então não há como
 * escapar do contexto de um inline style.
 */
const REGEX_COR_SEGURA = /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|hsl)a?\(\s*[\w.%\s,/+-]+\)|[a-z]{3,30})$/i;

/**
 * Sanitiza e valida cor para interpolação segura em inline styles e variáveis CSS
 */
export function sanitizarCorCss(cor: string | null | undefined, fallback = '#00E08A'): string {
  if (!cor || typeof cor !== 'string') return fallback;
  const corTrim = cor.trim();
  if (REGEX_COR_SEGURA.test(corTrim)) {
    return corTrim;
  }
  return fallback;
}

function paraHex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

function hslParaRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/**
 * Converte uma cor CSS para `#rrggbb`, único formato aceito por <input type="color">.
 * Suporta hex (3/4/6/8 dígitos), rgb()/rgba() e hsl()/hsla(); demais valores retornam o fallback.
 */
export function corParaHex(cor: string | null | undefined, fallback = '#000000'): string {
  if (!cor || typeof cor !== 'string') return fallback;
  const c = cor.trim().toLowerCase();

  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(c);
  if (hex) {
    const h = hex[1];
    if (h.length <= 4) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    return `#${h.slice(0, 6)}`;
  }

  const fn = /^(rgb|hsl)a?\(([^)]+)\)$/.exec(c);
  if (fn) {
    const partes = fn[2].split(/[\s,/]+/).filter(Boolean).map((p) => parseFloat(p));
    if (partes.length >= 3 && partes.slice(0, 3).every((n) => !isNaN(n))) {
      const [x, y, z] = partes;
      const [r, g, b] = fn[1] === 'rgb' ? [x, y, z] : hslParaRgb(x, y, z);
      return `#${paraHex2(r)}${paraHex2(g)}${paraHex2(b)}`;
    }
  }

  return fallback;
}

/**
 * Localiza um elemento pelo valor exato de um atributo, sem montar seletor CSS.
 * IDs arbitrários (aspas, colchetes, barras) quebram `[attr="valor"]`; comparar o valor evita escape.
 */
export function buscarPorAtributo(
  raiz: ParentNode,
  atributo: string,
  valor: string
): HTMLElement | null {
  const candidatos = raiz.querySelectorAll<HTMLElement>(`[${atributo}]`);
  for (let i = 0; i < candidatos.length; i++) {
    if (candidatos[i].getAttribute(atributo) === valor) return candidatos[i];
  }
  return null;
}

/**
 * Cria uma função com debounce para limitar disparos de alta frequência (ex: busca rápida)
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs = 80): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delayMs);
  };
}

/**
 * Atualiza título e aria-label de um controle-ícone de uma só vez
 */
export function definirRotuloControle(el: Element, texto: string): void {
  el.setAttribute('title', texto);
  el.setAttribute('aria-label', texto);
}
