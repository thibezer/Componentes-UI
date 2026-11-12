/* ====================================================
   UI Camadas - Coleções de camadas e feições
   Responsabilidade única: operações sobre as listas do painel (definir, adicionar, atualizar, remover),
   mantendo seleção, expansão, camada ativa e lembrança coerentes. Renderizar fica por conta do host.
   ==================================================== */

import type { CamadaItem, FeicaoItem, MudancaFeicoes } from './tipos';
import { mesmaLinhaFeicao } from './camadas-linha-feicao';
import type { LembrancaCamadas } from './camadas-lembranca';
import { removerSelecoesInvalidas } from './camadas-selecao';

/** Estado e ações do painel que as coleções usam. */
export interface HostColecao {
  camadas: CamadaItem[];
  feicoes: FeicaoItem[];
  expandedLayers: Set<string>;
  expandedFeatureLimits?: Map<string, number>;
  selectedFeatureIds: Set<string>;
  lastClickedFeatureId: string | null;
  activeSettingsLayerId: string | null;
  editingLayerId?: string | null;
  editingFeatureId?: string | null;
  camadaAtivaId: string | null;
  readonly persistir: boolean;
  /** @internal Guarda de origens/remoções e acesso ao storage. */
  readonly lembranca: LembrancaCamadas;
  getAttribute(nome: string): string | null;
  salvarLembrancaEstado(): void;
  solicitarRenderizacao(): void;
  /** Mutação de feição: atualiza só as linhas afetadas quando possível (ver `UICamadas`). */
  solicitarAtualizacaoFeicoes(mudanca: MudancaFeicoes): void;
}

/** Transforma a árvore (`children`) em lista plana, herdando `parentId` do pai quando não informado. */
export function achatarCamadas(
  camadas: CamadaItem[],
  parentId: string | null = null,
  visitados = new Set<string>()
): CamadaItem[] {
  const resultado: CamadaItem[] = [];
  if (!Array.isArray(camadas)) return resultado;

  for (const c of camadas) {
    if (!c || typeof c !== 'object' || !c.id) continue;
    const idStr = String(c.id);
    if (visitados.has(idStr)) continue;
    visitados.add(idStr);

    const item: CamadaItem = { ...c, id: idStr };
    delete item.children;
    if (parentId && item.parentId === undefined) {
      item.parentId = parentId;
    }
    resultado.push(item);
    if (Array.isArray(c.children) && c.children.length > 0) {
      resultado.push(...achatarCamadas(c.children, idStr, visitados));
    }
  }
  return resultado;
}

/** A âncora do Shift não pode apontar para uma feição que saiu da lista. */
function soltarAncoraInvalida(host: HostColecao): void {
  const ancora = host.lastClickedFeatureId;
  if (ancora && !host.feicoes.some((f) => f.id === ancora)) host.lastClickedFeatureId = null;
}

function sanitizarListaFeicoes(feicoes: FeicaoItem[]): FeicaoItem[] {
  if (!Array.isArray(feicoes)) return [];
  const vistas = new Set<string>();
  const validas: FeicaoItem[] = [];
  for (const f of feicoes) {
    if (!f || typeof f !== 'object' || !f.id) continue;
    const idStr = String(f.id);
    if (vistas.has(idStr)) continue;
    vistas.add(idStr);
    validas.push({ ...f, id: idStr });
  }
  return validas;
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
    host.feicoes = sanitizarListaFeicoes(feicoes);
    const layerIdsExistentes = new Set(host.camadas.map((l) => l.id));
    const orfas = host.feicoes.filter((f) => f.layerId && !layerIdsExistentes.has(f.layerId));
    if (orfas.length > 0) {
      console.warn(
        `[UI-Camadas] ${orfas.length} feição(ões) possuem 'layerId' não cadastrado nas camadas:`,
        orfas.map((f) => ({ id: f.id, nome: f.name, layerId: f.layerId }))
      );
    }
    removerSelecoesInvalidas(host.selectedFeatureIds, host.feicoes);
    soltarAncoraInvalida(host);
  }

  const idsCamadasAtuais = new Set(host.camadas.map((l) => l.id));
  if (host.activeSettingsLayerId && !idsCamadasAtuais.has(host.activeSettingsLayerId)) {
    host.activeSettingsLayerId = null;
  }
  if (host.editingLayerId && !idsCamadasAtuais.has(host.editingLayerId)) {
    host.editingLayerId = null;
  }
  if (host.expandedFeatureLimits) {
    for (const id of host.expandedFeatureLimits.keys()) {
      if (!idsCamadasAtuais.has(id)) host.expandedFeatureLimits.delete(id);
    }
  }

  // Sem camada ativa, ou com uma que a nova lista não tem mais: a primeira assume
  const ativa = host.getAttribute('camada-ativa');
  if (host.camadas.length > 0 && (!ativa || !idsCamadasAtuais.has(ativa))) {
    host.camadaAtivaId = host.camadas[0].id;
  }

  host.salvarLembrancaEstado();
  host.solicitarRenderizacao();
}

/** Ids cuja linha precisa ser refeita ao trocar a lista: feições novas ou com algum campo exibido diferente. */
function idsAlterados(antigas: FeicaoItem[], novas: FeicaoItem[]): Set<string> {
  const porId = new Map(antigas.map((f) => [f.id, f]));
  const alterados = new Set<string>();
  for (const f of novas) {
    const antiga = porId.get(f.id);
    if (!antiga || !mesmaLinhaFeicao(antiga, f)) alterados.add(f.id);
  }
  return alterados;
}

export function definirFeicoesNoHost(host: HostColecao, feicoes: FeicaoItem[]): void {
  const antigas = host.feicoes;
  host.feicoes = sanitizarListaFeicoes(feicoes);
  const selecaoAntes = host.selectedFeatureIds.size;
  removerSelecoesInvalidas(host.selectedFeatureIds, host.feicoes);
  soltarAncoraInvalida(host);
  if (host.editingFeatureId && !host.feicoes.some((f) => f.id === host.editingFeatureId)) {
    host.editingFeatureId = null;
  }
  host.solicitarAtualizacaoFeicoes({
    camadas: 'todas',
    idsAlterados: idsAlterados(antigas, host.feicoes),
    selecaoAfetada: host.selectedFeatureIds.size !== selecaoAntes
  });
}

export function adicionarCamadaNoHost(host: HostColecao, camada: CamadaItem): void {
  if (!camada || !camada.id) return;
  if (host.camadas.some((l) => l.id === camada.id)) {
    console.warn(`[UI-Camadas] adicionarCamada ignorado: já existe uma camada com id '${camada.id}'.`);
    return;
  }
  // `children` entra achatado, como em definirCamadas: senão as subcamadas apareceriam sem existir na lista
  const idsExistentes = new Set(host.camadas.map((l) => l.id));
  for (const nova of achatarCamadas([camada])) {
    if (idsExistentes.has(nova.id)) {
      console.warn(`[UI-Camadas] adicionarCamada: subcamada '${nova.id}' ignorada, o id já existe.`);
      continue;
    }
    idsExistentes.add(nova.id);
    host.camadas.push(nova);
    host.lembranca.registrarOrigem(nova);
    host.expandedLayers.add(nova.id);
    if (nova.parentId) {
      host.expandedLayers.add(nova.parentId);
    }
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
  host.expandedFeatureLimits?.delete(camadaId);
  if (host.activeSettingsLayerId === camadaId) host.activeSettingsLayerId = null;
  if (host.editingLayerId === camadaId) host.editingLayerId = null;
  if (host.editingFeatureId && !host.feicoes.some((f) => f.id === host.editingFeatureId)) {
    host.editingFeatureId = null;
  }
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
  host.solicitarAtualizacaoFeicoes({
    camadas: new Set([feicao.layerId || '']),
    idsAlterados: new Set(),
    selecaoAfetada: host.selectedFeatureIds.has(feicao.id)
  });
}

export function atualizarFeicaoNoHost(host: HostColecao, feicaoAtualizada: FeicaoItem): void {
  if (!feicaoAtualizada || typeof feicaoAtualizada !== 'object' || !feicaoAtualizada.id) return;
  const idx = host.feicoes.findIndex((f) => f.id === feicaoAtualizada.id);
  if (idx !== -1) {
    const camadaAntes = host.feicoes[idx].layerId || '';
    host.feicoes[idx] = { ...host.feicoes[idx], ...feicaoAtualizada };
    host.solicitarAtualizacaoFeicoes({
      camadas: new Set([camadaAntes, host.feicoes[idx].layerId || '']),
      idsAlterados: new Set([feicaoAtualizada.id]),
      selecaoAfetada: false
    });
  }
}

export function removerFeicaoNoHost(host: HostColecao, feicaoId: string): void {
  const removida = host.feicoes.find((f) => f.id === feicaoId);
  host.feicoes = host.feicoes.filter((f) => f.id !== feicaoId);
  const estavaSelecionada = host.selectedFeatureIds.delete(feicaoId);
  if (host.lastClickedFeatureId === feicaoId) host.lastClickedFeatureId = null;
  if (host.editingFeatureId === feicaoId) host.editingFeatureId = null;
  host.solicitarAtualizacaoFeicoes({
    camadas: new Set(removida ? [removida.layerId || ''] : []),
    idsAlterados: new Set(),
    selecaoAfetada: estavaSelecionada
  });
}
