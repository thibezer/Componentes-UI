/**
 * Utilitários auxiliares para o ecossistema Canvas/Mapa do GerenciGeo
 */

export const escapeHtml = (unsafe: string | null | undefined): string => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const formatUTM = (val: number | null | undefined, casas = 3): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
};
