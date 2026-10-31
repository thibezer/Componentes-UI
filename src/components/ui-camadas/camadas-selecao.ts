/* ====================================================
   UI Camadas - Lógica de Seleção de Feições
   Funções puras: sem acesso a DOM nem ao componente
   ==================================================== */

import { CamadaItem, FeicaoItem } from './tipos';
import { construirHierarquiaCamadas, type CamadaNodoHierarquico } from './camadas-hierarquia';

export interface ResultadoSelecao {
  selecionados: Set<string>;
  ultimoClicadoId: string | null;
}

export const LIMITE_FEICOES_POR_CAMADA = 80;

/**
 * Filtra feições pelo termo de busca (nome, categoria ou tipo). Sem termo, retorna todas.
 */
export function filtrarFeicoesPorBusca(feicoes: FeicaoItem[], termo: string): FeicaoItem[] {
  const q = (termo || '').trim().toLowerCase();
  if (!q) return feicoes;
  return feicoes.filter(
    (f) =>
      (f.name || '').toLowerCase().includes(q) ||
      (f.category || '').toLowerCase().includes(q) ||
      (f.type || '').toLowerCase().includes(q)
  );
}

export interface ResultadoBuscaCamadas {
  /** Camadas que permanecem na árvore: as que casam, seus ancestrais e as subcamadas de quem casa pelo nome. */
  camadasVisiveis: Set<string>;
  /** Feições mostradas em cada camada visível (todas, se a camada casa pelo nome; senão, só as que casam). */
  feicoesPorCamada: Map<string, FeicaoItem[]>;
}

/**
 * Busca em toda a árvore: casa pelo nome da camada ou pelos dados das feições (ver `filtrarFeicoesPorBusca`).
 * Mantém os grupos ancestrais de cada resultado e, quando um grupo casa pelo nome, suas subcamadas.
 * Sem termo, retorna `null` (nada a filtrar). Tolera nomes ausentes e ciclos de `parentId`.
 */
export function filtrarCamadasPorBusca(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  termo: string
): ResultadoBuscaCamadas | null {
  const q = (termo || '').trim().toLowerCase();
  if (!q) return null;

  const camadaPorId = new Map<string, CamadaItem>();
  const filhasPorPai = new Map<string, string[]>();
  for (const l of camadas) {
    camadaPorId.set(l.id, l);
    if (l.parentId && l.parentId !== l.id) {
      if (!filhasPorPai.has(l.parentId)) filhasPorPai.set(l.parentId, []);
      filhasPorPai.get(l.parentId)!.push(l.id);
    }
  }

  const feicoesPorLayer = new Map<string, FeicaoItem[]>();
  for (const f of feicoes) {
    const lid = f.layerId || '';
    if (!feicoesPorLayer.has(lid)) feicoesPorLayer.set(lid, []);
    feicoesPorLayer.get(lid)!.push(f);
  }

  const casaPeloNome = new Set<string>();
  const casam = new Set<string>();
  for (const l of camadas) {
    const nome = typeof l.name === 'string' ? l.name.toLowerCase() : '';
    if (nome.includes(q)) {
      casaPeloNome.add(l.id);
      casam.add(l.id);
    } else if (filtrarFeicoesPorBusca(feicoesPorLayer.get(l.id) || [], q).length > 0) {
      casam.add(l.id);
    }
  }

  const camadasVisiveis = new Set<string>(casam);

  // Ancestrais: o grupo de um resultado precisa aparecer para o resultado ter onde ficar
  for (const id of casam) {
    const vistos = new Set<string>([id]);
    let pai = camadaPorId.get(id)?.parentId;
    while (pai && camadaPorId.has(pai) && !vistos.has(pai)) {
      vistos.add(pai);
      camadasVisiveis.add(pai);
      pai = camadaPorId.get(pai)?.parentId;
    }
  }

  // Descendentes: abrir um grupo pelo nome mostra o que há dentro dele
  const pilha = [...casaPeloNome];
  while (pilha.length > 0) {
    const id = pilha.pop()!;
    for (const filha of filhasPorPai.get(id) || []) {
      if (!camadasVisiveis.has(filha)) {
        camadasVisiveis.add(filha);
        pilha.push(filha);
      }
    }
  }

  const feicoesPorCamada = new Map<string, FeicaoItem[]>();
  for (const id of camadasVisiveis) {
    const daCamada = feicoesPorLayer.get(id) || [];
    feicoesPorCamada.set(id, casaPeloNome.has(id) ? daCamada : filtrarFeicoesPorBusca(daCamada, q));
  }

  return { camadasVisiveis, feicoesPorCamada };
}

/**
 * IDs de feições efetivamente exibidas na árvore, na ordem da tela:
 * respeita hierarquia da árvore, camadas expandidas (e seus ancestrais), o filtro de busca e o limite de linhas.
 */
export function obterIdsVisiveisFeicoes(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  camadasExpandidas: Set<string>,
  termoBusca = '',
  limitePorCamada = LIMITE_FEICOES_POR_CAMADA,
  limitesCustomizados?: ReadonlyMap<string, number>
): string[] {
  const busca = filtrarCamadasPorBusca(camadas, feicoes, termoBusca);
  const ids: string[] = [];
  const featsByLayer = new Map<string, FeicaoItem[]>();
  for (let i = 0; i < feicoes.length; i++) {
    const f = feicoes[i];
    if (!f || !f.id) continue;
    const lid = f.layerId || '';
    if (!featsByLayer.has(lid)) featsByLayer.set(lid, []);
    featsByLayer.get(lid)!.push(f);
  }

  const hierarquia = construirHierarquiaCamadas(camadas);

  function visitarNodo(nodo: CamadaNodoHierarquico): void {
    const l = nodo.camada;
    if (busca && !busca.camadasVisiveis.has(l.id)) return;

    const expandida = busca ? true : camadasExpandidas.has(l.id);
    if (!expandida) return;

    // Na renderização do DOM (camadas-arvore-renderer.ts), subcamadas vêm primeiro, depois feições
    for (const sub of nodo.subcamadas) {
      visitarNodo(sub);
    }

    const lista = busca ? busca.feicoesPorCamada.get(l.id) || [] : featsByLayer.get(l.id) || [];
    const maxFeats = limitesCustomizados?.get(l.id) ?? limitePorCamada;
    const lf = lista.slice(0, maxFeats);
    for (let j = 0; j < lf.length; j++) {
      ids.push(lf[j].id);
    }
  }

  for (const raiz of hierarquia) {
    visitarNodo(raiz);
  }

  return ids;
}

/**
 * Calcula a nova seleção após clique (simples, Ctrl/Cmd acumulado ou Shift em intervalo).
 * Retorna null se a feição clicada não estiver visível.
 */
export function calcularSelecaoFeicao(
  idsVisiveis: string[],
  selecionadosAtuais: Set<string>,
  ultimoClicadoId: string | null,
  feicaoId: string,
  acumular: boolean,
  intervalo: boolean
): ResultadoSelecao | null {
  if (!idsVisiveis.includes(feicaoId)) return null;

  const selecionados = new Set(selecionadosAtuais);
  let ultimo = ultimoClicadoId;

  if (intervalo && ultimoClicadoId && idsVisiveis.includes(ultimoClicadoId)) {
    const idxA = idsVisiveis.indexOf(ultimoClicadoId);
    const idxB = idsVisiveis.indexOf(feicaoId);
    const start = Math.min(idxA, idxB);
    const end = Math.max(idxA, idxB);

    if (!acumular) selecionados.clear();
    for (let i = start; i <= end; i++) {
      selecionados.add(idsVisiveis[i]);
    }
  } else if (acumular) {
    if (selecionados.has(feicaoId)) {
      selecionados.delete(feicaoId);
    } else {
      selecionados.add(feicaoId);
    }
    ultimo = feicaoId;
  } else {
    selecionados.clear();
    selecionados.add(feicaoId);
    ultimo = feicaoId;
  }

  return { selecionados, ultimoClicadoId: ultimo };
}

/**
 * Remove da seleção IDs que não existem mais nas feições
 */
export function removerSelecoesInvalidas(selecionados: Set<string>, feicoes: FeicaoItem[]): void {
  if (selecionados.size === 0) return;
  const validos = new Set(feicoes.map((f) => f.id));
  for (const id of selecionados) {
    if (!validos.has(id)) selecionados.delete(id);
  }
}
