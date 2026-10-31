/* ====================================================
   UI Camadas - Hierarquia de camadas
   Responsabilidade única: transformar a lista plana de camadas (parentId/children) em árvore de nós
   com profundidade, e derivar dela descendência e estado herdado (oculta/travada por um grupo acima).
   Funções puras.
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

  // Cada camada entra uma única vez: um ciclo de parentId (A→B→A) ou um `children` que se repete
  // não pode esconder camadas nem recursar sem fim
  const visitadas = new Set<string>();
  function montarNodo(camada: CamadaItem, depth: number): CamadaNodoHierarquico {
    visitadas.add(camada.id);
    const filhas = filhasPorPai.get(camada.id) || (Array.isArray(camada.children) ? camada.children : []);
    return {
      camada,
      depth,
      subcamadas: filhas
        .filter((f) => f && typeof f.id === 'string' && !visitadas.has(f.id))
        .map((f) => montarNodo(f, depth + 1))
    };
  }

  const arvore = raizes.map((r) => montarNodo(r, 0));
  // Camadas presas num ciclo não descendem de nenhuma raiz: sobem para a raiz em vez de sumirem
  for (const l of camadas) {
    if (!visitadas.has(l.id)) arvore.push(montarNodo(l, 0));
  }
  return arvore;
}

/** Ids de todos os descendentes de `camadaId` (filhas, netas...), sem incluir a própria. Tolera ciclos. */
export function idsDescendentes(camadas: CamadaItem[], camadaId: string): Set<string> {
  const filhasPorPai = new Map<string, string[]>();
  for (const l of camadas) {
    if (l.parentId && l.parentId !== l.id) {
      if (!filhasPorPai.has(l.parentId)) filhasPorPai.set(l.parentId, []);
      filhasPorPai.get(l.parentId)!.push(l.id);
    }
  }
  const resultado = new Set<string>();
  const pilha = [camadaId];
  while (pilha.length > 0) {
    for (const filha of filhasPorPai.get(pilha.pop()!) || []) {
      if (filha !== camadaId && !resultado.has(filha)) {
        resultado.add(filha);
        pilha.push(filha);
      }
    }
  }
  return resultado;
}

export interface EstadoHerdadoCamada {
  /** Algum grupo acima está oculto: a camada não aparece no mapa, mesmo com o próprio olho aberto. */
  ocultaPorAncestral: boolean;
  /** Algum grupo acima está travado: a camada e as suas feições não podem ser editadas. */
  travadaPorAncestral: boolean;
}

/** Estado que cada camada herda dos ancestrais. Tolera ciclos e pais inexistentes. */
export function calcularEstadoHerdado(camadas: CamadaItem[]): Map<string, EstadoHerdadoCamada> {
  const porId = new Map<string, CamadaItem>();
  camadas.forEach((l) => porId.set(l.id, l));
  const resultado = new Map<string, EstadoHerdadoCamada>();
  for (const l of camadas) {
    let ocultaPorAncestral = false;
    let travadaPorAncestral = false;
    const vistos = new Set<string>([l.id]);
    let pai = l.parentId ? porId.get(l.parentId) : undefined;
    while (pai && !vistos.has(pai.id)) {
      vistos.add(pai.id);
      if (pai.visible === false) ocultaPorAncestral = true;
      if (pai.locked === true) travadaPorAncestral = true;
      pai = pai.parentId ? porId.get(pai.parentId) : undefined;
    }
    resultado.set(l.id, { ocultaPorAncestral, travadaPorAncestral });
  }
  return resultado;
}

/** Ids das camadas travadas por si mesmas ou por um grupo acima delas. */
export function idsCamadasTravadas(camadas: CamadaItem[]): Set<string> {
  const herdado = calcularEstadoHerdado(camadas);
  return new Set(
    camadas.filter((l) => l.locked === true || herdado.get(l.id)?.travadaPorAncestral === true).map((l) => l.id)
  );
}

/** A camada está travada por si mesma ou por um grupo acima dela. */
export function camadaTravadaEfetiva(camadas: CamadaItem[], camadaId: string | null | undefined): boolean {
  return !!camadaId && idsCamadasTravadas(camadas).has(camadaId);
}
