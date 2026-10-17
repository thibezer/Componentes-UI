/* ====================================================
   UI Camadas - Operações de seleção de feições
   Responsabilidade única: aplicar seleção (clique, intervalo, lote, limpar) sobre o estado do painel e
   emitir `ui-feicoes-selecionadas` / `ui-feicao-selecionada`. O cálculo puro fica em camadas-selecao.ts.
   ==================================================== */

import type { CamadaItem, FeicaoItem } from './tipos';
import { obterIdsVisiveisFeicoes, calcularSelecaoFeicao } from './camadas-selecao';

/** Estado e ações do painel que a seleção usa. */
export interface HostSelecao {
  camadas: CamadaItem[];
  feicoes: FeicaoItem[];
  expandedLayers: Set<string>;
  selectedFeatureIds: Set<string>;
  lastClickedFeatureId: string | null;
  searchQuery: string;
  sincronizarSelecaoDOM(): void;
  notificarMudancaSelecao(): void;
  dispararEvento(nome: string, detalhe: unknown): void;
}

export function selecionarFeicaoNoHost(
  host: HostSelecao,
  feicaoId: string,
  acumular: boolean,
  intervalo: boolean,
  emitirEvento: boolean
): void {
  const idsVisiveis = obterIdsVisiveisFeicoes(host.camadas, host.feicoes, host.expandedLayers, host.searchQuery);
  // Feição existente mas fora da tela (camada recolhida, além do limite de linhas): a seleção
  // programática vale mesmo assim; o clique em intervalo continua ignorando o que ninguém vê
  const escondida = !intervalo && !idsVisiveis.includes(feicaoId) && host.feicoes.some((f) => f.id === feicaoId);
  const resultado = calcularSelecaoFeicao(
    escondida ? [...idsVisiveis, feicaoId] : idsVisiveis,
    host.selectedFeatureIds,
    host.lastClickedFeatureId,
    feicaoId,
    acumular,
    intervalo
  );
  if (!resultado) return;

  host.selectedFeatureIds = resultado.selecionados;
  host.lastClickedFeatureId = resultado.ultimoClicadoId;

  host.sincronizarSelecaoDOM();
  if (emitirEvento) host.notificarMudancaSelecao();
}

export function selecionarFeicoesNoHost(host: HostSelecao, ids: string[], emitirEvento: boolean): void {
  const novosIds = ids || [];
  const mesmoTamanho = novosIds.length === host.selectedFeatureIds.size;
  const iguais = mesmoTamanho && novosIds.every((id) => host.selectedFeatureIds.has(id));
  if (iguais) return;

  host.selectedFeatureIds.clear();
  novosIds.forEach((id) => host.selectedFeatureIds.add(id));
  // A âncora do Shift acompanha a seleção programática (última do lote), senão o intervalo parte de uma âncora velha
  host.lastClickedFeatureId = novosIds.length > 0 ? novosIds[novosIds.length - 1] : null;
  host.sincronizarSelecaoDOM();
  if (emitirEvento) host.notificarMudancaSelecao();
}

export function limparSelecaoNoHost(host: HostSelecao, emitirEvento: boolean): void {
  if (host.selectedFeatureIds.size === 0) return;
  host.selectedFeatureIds.clear();
  host.lastClickedFeatureId = null;
  host.sincronizarSelecaoDOM();
  if (emitirEvento) host.notificarMudancaSelecao();
}

export function emitirEventosSelecao(host: HostSelecao): void {
  const selecionadas = host.feicoes.filter((f) => host.selectedFeatureIds.has(f.id));
  host.dispararEvento('ui-feicoes-selecionadas', {
    feicoesIds: Array.from(host.selectedFeatureIds),
    feicoes: selecionadas
  });

  if (selecionadas.length === 1) {
    host.dispararEvento('ui-feicao-selecionada', { feicaoId: selecionadas[0].id, feicao: selecionadas[0] });
  } else if (selecionadas.length === 0) {
    host.dispararEvento('ui-feicao-selecionada', { feicaoId: null, feicao: null });
  }
}
