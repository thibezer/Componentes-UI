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
 * - Hexadecimal: #fff, #ffffff, #ffffff80
 * - rgb/rgba: rgb(0, 224, 138), rgba(0, 224, 138, 0.5)
 * - hsl/hsla: hsl(150, 100%, 45%), hsla(150, 100%, 45%, 0.5)
 * - Nomes seguros: transparent, currentColor
 */
const REGEX_COR_SEGURA = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*[\d.]+\s*)?\)|hsla?\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?(\s*,\s*[\d.]+\s*)?\)|transparent|currentColor)$/i;

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
