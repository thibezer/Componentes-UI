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

function agruparPorCamada(feicoes: FeicaoItem[]): Map<string, FeicaoItem[]> {
  const porCamada = new Map<string, FeicaoItem[]>();
  for (let i = 0; i < feicoes.length; i++) {
    const f = feicoes[i];
    const lid = f.layerId || '';
    if (!porCamada.has(lid)) porCamada.set(lid, []);
    porCamada.get(lid)!.push(f);
  }
  return porCamada;
}

/**
 * IDs de feições efetivamente exibidas na árvore, na ordem da tela: percorre a hierarquia como o
 * renderizador (subcamadas antes das feições da camada), pula o que está sob um grupo recolhido
 * (com busca, tudo fica aberto) e respeita o filtro de busca e o limite de linhas.
 */
export function obterIdsVisiveisFeicoes(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  camadasExpandidas: Set<string>,
  termoBusca = '',
  limitePorCamada = LIMITE_FEICOES_POR_CAMADA
): string[] {
  const busca = filtrarCamadasPorBusca(camadas, feicoes, termoBusca);
  const featsByLayer = busca ? null : agruparPorCamada(feicoes);
  const ids: string[] = [];

  const visitar = (nodo: CamadaNodoHierarquico): void => {
    const id = nodo.camada.id;
    if (busca && !busca.camadasVisiveis.has(id)) return;
    if (!busca && !camadasExpandidas.has(id)) return;
    nodo.subcamadas.forEach(visitar);
    const lista = (busca ? busca.feicoesPorCamada.get(id) : featsByLayer!.get(id)) || [];
    const lf = lista.slice(0, limitePorCamada);
    for (let j = 0; j < lf.length; j++) ids.push(lf[j].id);
  };
  construirHierarquiaCamadas(camadas).forEach(visitar);
  return ids;
}

/**
 * Feições de cada camada somadas às das suas subcamadas (o "ramo"), como a árvore as mostra:
 * com busca, só as que a busca exibe. É o que o alvo de seleção de um grupo marca e desmarca.
 */
export function feicoesPorRamo(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  termoBusca = ''
): Map<string, FeicaoItem[]> {
  const busca = filtrarCamadasPorBusca(camadas, feicoes, termoBusca);
  const diretas = busca ? busca.feicoesPorCamada : agruparPorCamada(feicoes);
  const ramos = new Map<string, FeicaoItem[]>();

  const somar = (nodo: CamadaNodoHierarquico): FeicaoItem[] => {
    const id = nodo.camada.id;
    if (busca && !busca.camadasVisiveis.has(id)) {
      ramos.set(id, []);
      return [];
    }
    const ramo = [...(diretas.get(id) || [])];
    for (const sub of nodo.subcamadas) ramo.push(...somar(sub));
    ramos.set(id, ramo);
    return ramo;
  };
  construirHierarquiaCamadas(camadas).forEach(somar);
  return ramos;
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
