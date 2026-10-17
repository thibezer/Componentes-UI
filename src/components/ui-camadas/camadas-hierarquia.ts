/* ====================================================
   UI Camadas - Hierarquia de camadas
   Responsabilidade única: transformar a lista plana de camadas (parentId/children) em árvore de nós
   com profundidade. Função pura.
   ==================================================== */

import type { CamadaItem } from './tipos';

export interface CamadaNodoHierarquico {
  camada: CamadaItem;
  depth: number;
  subcamadas: CamadaNodoHierarquico[];
}

/**
 * Organiza a lista de camadas em uma árvore hierárquica de nós baseada em parentId ou children
 */
export function construirHierarquiaCamadas(camadas: CamadaItem[]): CamadaNodoHierarquico[] {
  const mapaCamadas = new Map<string, CamadaItem>();
  camadas.forEach((l) => mapaCamadas.set(l.id, l));

  const filhasPorPai = new Map<string, CamadaItem[]>();
  const raizes: CamadaItem[] = [];

  camadas.forEach((l) => {
    if (l.parentId && mapaCamadas.has(l.parentId) && l.parentId !== l.id) {
      if (!filhasPorPai.has(l.parentId)) filhasPorPai.set(l.parentId, []);
      filhasPorPai.get(l.parentId)!.push(l);
    } else {
      raizes.push(l);
    }
  });

  function montarNodo(camada: CamadaItem, depth: number): CamadaNodoHierarquico {
    const filhas = filhasPorPai.get(camada.id) || (Array.isArray(camada.children) ? camada.children : []);
    return {
      camada,
      depth,
      subcamadas: filhas.map((f) => montarNodo(f, depth + 1))
    };
  }

  return raizes.map((r) => montarNodo(r, 0));
}
