/* ====================================================
   UI Camadas - Lógica de Seleção de Feições
   Funções puras: sem acesso a DOM nem ao componente
   ==================================================== */

import { CamadaItem, FeicaoItem } from './tipos';

export interface ResultadoSelecao {
  selecionados: Set<string>;
  ultimoClicadoId: string | null;
}

/**
 * IDs de feições visíveis na ordem da árvore (apenas camadas expandidas)
 */
export function obterIdsVisiveisFeicoes(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  camadasExpandidas: Set<string>
): string[] {
  const ids: string[] = [];
  const featsByLayer = new Map<string, FeicaoItem[]>();
  for (let i = 0; i < feicoes.length; i++) {
    const f = feicoes[i];
    if (!featsByLayer.has(f.layerId)) featsByLayer.set(f.layerId, []);
    featsByLayer.get(f.layerId)!.push(f);
  }

  for (let i = 0; i < camadas.length; i++) {
    const l = camadas[i];
    if (camadasExpandidas.has(l.id)) {
      const lf = featsByLayer.get(l.id) || [];
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
