/* ====================================================
   UI Camadas - Lógica de Seleção de Feições
   Funções puras: sem acesso a DOM nem ao componente
   ==================================================== */

import { CamadaItem, FeicaoItem } from './tipos';

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

/**
 * IDs de feições efetivamente exibidas na árvore, na ordem da tela:
 * respeita camadas expandidas (todas, durante uma busca), o filtro de busca e o limite de linhas.
 */
export function obterIdsVisiveisFeicoes(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  camadasExpandidas: Set<string>,
  termoBusca = '',
  limitePorCamada = LIMITE_FEICOES_POR_CAMADA
): string[] {
  const buscando = (termoBusca || '').trim() !== '';
  const ids: string[] = [];
  const featsByLayer = new Map<string, FeicaoItem[]>();
  for (let i = 0; i < feicoes.length; i++) {
    const f = feicoes[i];
    const lid = f.layerId || '';
    if (!featsByLayer.has(lid)) featsByLayer.set(lid, []);
    featsByLayer.get(lid)!.push(f);
  }

  for (let i = 0; i < camadas.length; i++) {
    const l = camadas[i];
    if (buscando || camadasExpandidas.has(l.id)) {
      const lf = filtrarFeicoesPorBusca(featsByLayer.get(l.id) || [], termoBusca).slice(0, limitePorCamada);
      for (let j = 0; j < lf.length; j++) {
        ids.push(lf[j].id);
      }
    }
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
