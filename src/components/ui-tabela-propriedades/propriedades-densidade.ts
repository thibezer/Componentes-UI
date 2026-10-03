/* ====================================================
   UI Tabela de Propriedades - Densidade
   ==================================================== */

export type DensidadePropriedades = 'padrao' | 'compacta' | 'ultracompacta' | 'relaxada';

/**
 * Próxima densidade no ciclo do botão: padrao -> compacta -> ultracompacta -> padrao
 */
export function proximaDensidade(atual: string): DensidadePropriedades {
  if (atual === 'compacta') return 'ultracompacta';
  if (atual === 'ultracompacta') return 'padrao';
  return 'compacta';
}
