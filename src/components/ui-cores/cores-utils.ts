import type { ValorCor } from './tipos';

/** Paleta técnica padrão (CAD/GIS) do seletor de cor. */
export const PALETA_CORES_PADRAO: readonly string[] = [
  '#00e08a', '#38bdf8', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#84cc16', '#14b8a6', '#ffffff', '#94a3b8', '#0f172a'
];

/**
 * Normaliza uma cor para `#rrggbb` minúsculo ou `'none'`.
 * Aceita `#rgb`, `#rrggbb`, `none` e `transparent` (sem cor); devolve `null` para qualquer outro valor.
 */
export function normalizarCor(cor: unknown): ValorCor | null {
  if (typeof cor !== 'string') return null;
  const c = cor.trim().toLowerCase();
  if (c === 'none' || c === 'transparent') return 'none';
  if (/^#[0-9a-f]{6}$/.test(c)) return c;
  const curta = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(c);
  return curta ? `#${curta[1]}${curta[1]}${curta[2]}${curta[2]}${curta[3]}${curta[3]}` : null;
}

/** Limita a opacidade a [0, 1]; valores inválidos viram `padrao`. */
export function normalizarOpacidade(valor: unknown, padrao = 0.35): number {
  const n = typeof valor === 'string' ? parseFloat(valor) : Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.max(0, Math.min(1, n));
}

/** Lista de cores válidas e sem repetição, na ordem recebida. */
export function coresUnicas(cores: unknown): string[] {
  if (!Array.isArray(cores)) return [];
  const vistas = new Set<string>();
  for (const c of cores) {
    const n = normalizarCor(c);
    if (n && n !== 'none') vistas.add(n);
  }
  return [...vistas];
}

export function escaparHtml(texto: unknown): string {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>
  )[c]);
}
