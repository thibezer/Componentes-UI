/* ====================================================
   UI Camadas - Hierarquia de camadas
   Responsabilidade única: transformar a lista plana de camadas (parentId/children) em árvore de nós
   com profundidade e consultar subárvores sem risco de ciclos. Funções puras.
   ==================================================== */

import type { CamadaItem, FeicaoItem } from './tipos';

export interface CamadaNodoHierarquico {
  camada: CamadaItem;
  depth: number;
  subcamadas: CamadaNodoHierarquico[];
}

/**
 * Organiza a lista de camadas em uma árvore hierárquica de nós baseada em parentId ou children.
 * Quebra ciclos de `parentId` promovendo o primeiro elo do ciclo a raiz, para que nenhuma camada suma
 * nem cause estouro de pilha.
 */
export function construirHierarquiaCamadas(camadas: CamadaItem[]): CamadaNodoHierarquico[] {
  if (!Array.isArray(camadas) || camadas.length === 0) return [];

  const validas = camadas.filter((l): l is CamadaItem => Boolean(l && typeof l === 'object' && l.id));
  const mapaCamadas = new Map<string, CamadaItem>();
  const indicePorId = new Map<string, number>();
  validas.forEach((l, idx) => {
    mapaCamadas.set(l.id, l);
    indicePorId.set(l.id, idx);
  });

  // Identifica nós onde um ciclo deve ser quebrado (o de menor índice em cada ciclo de parentId)
  const quebrarPai = new Set<string>();
  const inspecionados = new Set<string>();

  for (const l of validas) {
    if (inspecionados.has(l.id)) continue;
    const trilha: string[] = [];
    const posNaTrilha = new Map<string, number>();
    let atual: CamadaItem | undefined = l;

    while (atual && atual.parentId && mapaCamadas.has(atual.parentId) && atual.parentId !== atual.id) {
      if (posNaTrilha.has(atual.id)) {
        const inicioCiclo = posNaTrilha.get(atual.id)!;
        const membrosCiclo = trilha.slice(inicioCiclo);
        let lider = membrosCiclo[0];
        for (const m of membrosCiclo) {
          if ((indicePorId.get(m) ?? Infinity) < (indicePorId.get(lider) ?? Infinity)) {
            lider = m;
          }
        }
        quebrarPai.add(lider);
        break;
      }
      if (inspecionados.has(atual.id)) break;
      posNaTrilha.set(atual.id, trilha.length);
      trilha.push(atual.id);
      atual = mapaCamadas.get(atual.parentId);
    }

    for (const id of trilha) inspecionados.add(id);
  }

  const filhasPorPai = new Map<string, CamadaItem[]>();
  const raizes: CamadaItem[] = [];

  validas.forEach((l) => {
    const paiValido =
      !quebrarPai.has(l.id) &&
      Boolean(l.parentId && mapaCamadas.has(l.parentId) && l.parentId !== l.id);

    if (paiValido && l.parentId) {
      if (!filhasPorPai.has(l.parentId)) filhasPorPai.set(l.parentId, []);
      filhasPorPai.get(l.parentId)!.push(l);
    } else {
      raizes.push(l);
    }
  });

  function montarNodo(camada: CamadaItem, depth: number, ancestrais: Set<string>): CamadaNodoHierarquico {
    const proximosAncestrais = new Set(ancestrais);
    proximosAncestrais.add(camada.id);

    const filhasBrutas =
      filhasPorPai.get(camada.id) || (Array.isArray(camada.children) ? camada.children : []);
    const filhasSeguras = filhasBrutas.filter(
      (f): f is CamadaItem => Boolean(f && typeof f === 'object' && f.id && !proximosAncestrais.has(f.id))
    );

    return {
      camada,
      depth,
      subcamadas: filhasSeguras.map((f) => montarNodo(f, depth + 1, proximosAncestrais))
    };
  }

  return raizes.map((r) => montarNodo(r, 0, new Set<string>()));
}

/**
 * Retorna o conjunto de IDs da camada informada e de todas as suas subcamadas descendentes.
 */
export function obterIdsSubarvoreCamada(camadas: CamadaItem[], camadaId: string): Set<string> {
  const resultado = new Set<string>();
  if (!camadaId || !Array.isArray(camadas)) return resultado;

  const filhasPorPai = new Map<string, string[]>();
  for (const l of camadas) {
    if (!l || typeof l !== 'object' || !l.id) continue;
    if (l.parentId && l.parentId !== l.id) {
      if (!filhasPorPai.has(l.parentId)) filhasPorPai.set(l.parentId, []);
      filhasPorPai.get(l.parentId)!.push(l.id);
    }
  }

  const pilha = [camadaId];
  while (pilha.length > 0) {
    const atual = pilha.pop()!;
    if (resultado.has(atual)) continue;
    resultado.add(atual);
    const filhas = filhasPorPai.get(atual);
    if (filhas) {
      for (const f of filhas) {
        if (!resultado.has(f)) pilha.push(f);
      }
    }
  }
  return resultado;
}

/**
 * Retorna todas as feições pertencentes à camada e às suas subcamadas descendentes.
 */
export function obterFeicoesDoEscopoCamada(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  camadaId: string
): FeicaoItem[] {
  if (!camadaId || !Array.isArray(feicoes) || feicoes.length === 0) return [];
  const idsSubarvore = obterIdsSubarvoreCamada(camadas, camadaId);
  return feicoes.filter((f) => Boolean(f && f.layerId && idsSubarvore.has(f.layerId)));
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
  camadas.forEach((l) => l && l.id && porId.set(l.id, l));
  const resultado = new Map<string, EstadoHerdadoCamada>();
  for (const l of porId.values()) {
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
    camadas
      .filter((l) => l && (l.locked === true || herdado.get(l.id)?.travadaPorAncestral === true))
      .map((l) => l.id)
  );
}
