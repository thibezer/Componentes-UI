import type { EstadoContador } from './tipos';

/** Fração do limite a partir da qual o contador passa a avisar. */
const FRACAO_AVISO = 0.9;

/**
 * Estado do contador de caracteres. Função pura: tolera tamanho/limite inválidos (`NaN`, negativos, `Infinity`)
 * e só gera anúncio para leitores de tela perto do limite, evitando falar a cada tecla.
 */
export function calcularContador(tamanho: number, limite: number | null): EstadoContador {
  const n = Number.isFinite(tamanho) && tamanho > 0 ? Math.trunc(tamanho) : 0;
  const max = limite !== null && Number.isFinite(limite) && limite > 0 ? Math.trunc(limite) : null;

  if (max === null) return { texto: String(n), nivel: 'normal', anuncio: '' };

  const texto = `${n} / ${max}`;
  if (n > max) {
    return { texto, nivel: 'excedido', anuncio: `Limite de ${max} caracteres excedido em ${n - max}.` };
  }
  if (n >= max * FRACAO_AVISO) {
    const restantes = max - n;
    return {
      texto,
      nivel: 'aviso',
      anuncio: restantes === 0 ? `Limite de ${max} caracteres atingido.` : `Restam ${restantes} caracteres.`
    };
  }
  return { texto, nivel: 'normal', anuncio: '' };
}
