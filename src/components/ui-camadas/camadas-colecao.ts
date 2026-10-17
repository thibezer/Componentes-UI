/* ====================================================
   UI Camadas - Coleções de camadas e feições
   Responsabilidade única: operações sobre as listas do painel (definir, adicionar, atualizar, remover),
   mantendo seleção, expansão, camada ativa e lembrança coerentes. Renderizar fica por conta do host.
   ==================================================== */

import type { CamadaItem, FeicaoItem } from './tipos';
import type { LembrancaCamadas } from './camadas-lembranca';
import { removerSelecoesInvalidas } from './camadas-selecao';

/** Estado e ações do painel que as coleções usam. */
export interface HostColecao {
  camadas: CamadaItem[];
  feicoes: FeicaoItem[];
  expandedLayers: Set<string>;
  selectedFeatureIds: Set<string>;
  lastClickedFeatureId: string | null;
  activeSettingsLayerId: string | null;
  camadaAtivaId: string | null;
  readonly persistir: boolean;
  /** @internal Guarda de origens/remoções e acesso ao storage. */
  readonly lembranca: LembrancaCamadas;
  getAttribute(nome: string): string | null;
  salvarLembrancaEstado(): void;
  solicitarRenderizacao(): void;
}

/** Transforma a árvore (`children`) em lista plana, herdando `parentId` do pai quando não informado. */
export function achatarCamadas(camadas: CamadaItem[], parentId: string | null = null): CamadaItem[] {
  const resultado: CamadaItem[] = [];
  for (const c of camadas) {
    const item = { ...c };
    if (parentId && item.parentId === undefined) {
      item.parentId = parentId;
    }
    resultado.push(item);
    if (Array.isArray(c.children) && c.children.length > 0) {
      resultado.push(...achatarCamadas(c.children, c.id));
    }
  }
  return resultado;
}

export function definirCamadasNoHost(host: HostColecao, camadas: CamadaItem[], feicoes?: FeicaoItem[]): void {
  host.camadas = Array.isArray(camadas) ? achatarCamadas(camadas) : [];
  host.lembranca.limparOrigens();

  // Reidratação inteligente com suporte à lembrança de estado (expansão, visibilidade, travas, opacidade, cor, ordem)
  if (host.persistir) {
    const estado = host.lembranca.carregar();
    host.lembranca.reidratar(host.camadas, estado, host.expandedLayers);
    if (estado?.camadaAtivaId && host.camadas.some((l) => l.id === estado.camadaAtivaId)) {
      host.camadaAtivaId = estado.camadaAtivaId;
    }
  } else {
    host.camadas.forEach((l) => {
      host.lembranca.registrarOrigem(l);
      if (!host.expandedLayers.has(l.id)) {
        host.expandedLayers.add(l.id);
      }
    });
  }

  if (Array.isArray(feicoes)) {
    host.feicoes = feicoes.map((f) => ({ ...f }));
    const layerIdsExistentes = new Set(host.camadas.map((l) => l.id));
    const orfas = host.feicoes.filter((f) => f.layerId && !layerIdsExistentes.has(f.layerId));
    if (orfas.length > 0) {
      console.warn(
        `[UI-Camadas] ${orfas.length} feição(ões) possuem 'layerId' não cadastrado nas camadas:`,
        orfas.map((f) => ({ id: f.id, nome: f.name, layerId: f.layerId }))
      );
    }
    removerSelecoesInvalidas(host.selectedFeatureIds, host.feicoes);
  }

  // Sem camada ativa, ou com uma que a nova lista não tem mais: a primeira assume
  const ativa = host.getAttribute('camada-ativa');
  if (host.camadas.length > 0 && (!ativa || !host.camadas.some((l) => l.id === ativa))) {
    host.camadaAtivaId = host.camadas[0].id;
  }

  host.salvarLembrancaEstado();
  host.solicitarRenderizacao();
}

export function definirFeicoesNoHost(host: HostColecao, feicoes: FeicaoItem[]): void {
  host.feicoes = Array.isArray(feicoes) ? feicoes.map((f) => ({ ...f })) : [];
  removerSelecoesInvalidas(host.selectedFeatureIds, host.feicoes);
  host.solicitarRenderizacao();
}

export function adicionarCamadaNoHost(host: HostColecao, camada: CamadaItem): void {
  if (!camada || !camada.id) return;
  if (host.camadas.some((l) => l.id === camada.id)) {
    console.warn(`[UI-Camadas] adicionarCamada ignorado: já existe uma camada com id '${camada.id}'.`);
    return;
  }
  const nova = { ...camada };
  host.camadas.push(nova);
  host.lembranca.registrarOrigem(nova);
  host.expandedLayers.add(nova.id);
  if (nova.parentId) {
    host.expandedLayers.add(nova.parentId);
  }
  host.salvarLembrancaEstado();
  host.solicitarRenderizacao();
}

export function removerCamadaNoHost(host: HostColecao, camadaId: string): void {
  // Promover subcamadas para raiz para evitar perda acidental de dados
  host.camadas.forEach((l) => {
    if (l.parentId === camadaId) l.parentId = null;
  });
  host.camadas = host.camadas.filter((l) => l.id !== camadaId);
  host.feicoes = host.feicoes.filter((f) => f.layerId !== camadaId);
  host.lembranca.esquecerCamada(camadaId);
  host.expandedLayers.delete(camadaId);
  if (host.activeSettingsLayerId === camadaId) host.activeSettingsLayerId = null;
  // Remove da seleção as feições que deixaram de existir junto com a camada
  removerSelecoesInvalidas(host.selectedFeatureIds, host.feicoes);
  if (host.selectedFeatureIds.size === 0) host.lastClickedFeatureId = null;
  if (host.camadaAtivaId === camadaId) {
    host.camadaAtivaId = host.camadas[0]?.id ?? null;
  }
  host.salvarLembrancaEstado();
  host.solicitarRenderizacao();
}

export function adicionarFeicaoNoHost(host: HostColecao, feicao: FeicaoItem): void {
  if (!feicao || !feicao.id) return;
  if (host.feicoes.some((f) => f.id === feicao.id)) {
    console.warn(`[UI-Camadas] adicionarFeicao ignorado: já existe uma feição com id '${feicao.id}'.`);
    return;
  }
  host.feicoes.push({ ...feicao });
  host.solicitarRenderizacao();
}

export function atualizarFeicaoNoHost(host: HostColecao, feicaoAtualizada: FeicaoItem): void {
  const idx = host.feicoes.findIndex((f) => f.id === feicaoAtualizada.id);
  if (idx !== -1) {
    host.feicoes[idx] = { ...host.feicoes[idx], ...feicaoAtualizada };
    host.solicitarRenderizacao();
  }
}

export function removerFeicaoNoHost(host: HostColecao, feicaoId: string): void {
  host.feicoes = host.feicoes.filter((f) => f.id !== feicaoId);
  host.selectedFeatureIds.delete(feicaoId);
  host.solicitarRenderizacao();
}
