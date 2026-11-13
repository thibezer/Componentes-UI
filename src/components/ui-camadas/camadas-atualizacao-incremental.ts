/* ====================================================
   UI Camadas - Atualização incremental das feições
   Responsabilidade única: depois de adicionarFeicao / atualizarFeicao / removerFeicao / definirFeicoes,
   refazer só as linhas afetadas (e os resumos da camada e dos ancestrais) em vez de redesenhar o painel.
   - `decidirAtualizacao` é pura: diz se o caminho incremental garante o resultado do render completo.
   - `tentarAtualizacaoIncremental` lê o DOM, decide e aplica; devolve `false` quando o chamador deve
     redesenhar tudo (o DOM nunca é dado como válido se qualquer passo não puder ser garantido).
   ==================================================== */

import type {
  CamadaItem,
  DecisaoAtualizacao,
  EntradaDecisaoIncremental,
  FeicaoItem,
  MudancaFeicoes,
  SituacaoCamadaAfetada
} from './tipos';
import {
  calcularEstadoHerdado,
  construirHierarquiaCamadas,
  obterFeicoesDoEscopoCamada,
  type CamadaNodoHierarquico
} from './camadas-hierarquia';
import { LIMITE_FEICOES_POR_CAMADA } from './camadas-selecao';
import {
  criarContextoLinhaFeicao,
  renderizarAvisoTruncamento,
  renderizarChipContagem,
  renderizarLinhaFeicao,
  renderizarLinhaVazia,
  textosAvisoTruncamento,
  tituloContagem
} from './camadas-linha-feicao';
import { aplicarEstadoTarget, sincronizarRodapeDOM } from './camadas-sincronizacao-dom';
import { escapeHtml } from './camadas-utils';

/** O que a atualização incremental lê do painel. */
export interface HostIncremental {
  camadas: CamadaItem[];
  feicoes: FeicaoItem[];
  selectedFeatureIds: Set<string>;
  expandedFeatureLimits: ReadonlyMap<string, number>;
  editingLayerId: string | null;
  editingFeatureId: string | null;
  activeSettingsLayerId: string | null;
  searchQuery: string;
  ordemFilhosPorPai?: ReadonlyMap<string, readonly string[]>;
}

/** Liga os eventos dos elementos novos dentro de `raiz` (só deles: nunca religa linhas existentes). */
export type LigarElementos = (raiz: ParentNode) => void;

/**
 * Decide se a mutação pode ser aplicada só nas linhas afetadas. Função pura: qualquer dúvida sobre o que o
 * render completo produziria (busca, edição inline, drawer, camada fora da árvore, ids repetidos) vira fallback.
 */
export function decidirAtualizacao(entrada: EntradaDecisaoIncremental): DecisaoAtualizacao {
  if (!entrada.arvoreRenderizada) return { incremental: false, motivo: 'arvore-nao-renderizada' };
  if (entrada.buscaAtiva) return { incremental: false, motivo: 'busca-ativa' };
  if (entrada.editandoCamada || entrada.editandoFeicao) return { incremental: false, motivo: 'edicao-inline' };
  for (const camada of entrada.camadasAfetadas) {
    if (!camada.existeNoModelo) return { incremental: false, motivo: 'camada-orfa' };
    if (!camada.renderizadaNoDom) return { incremental: false, motivo: 'camada-fora-do-dom' };
    if (camada.drawerAberto) return { incremental: false, motivo: 'drawer-aberto' };
  }
  if (entrada.idsDuplicados) return { incremental: false, motivo: 'ids-duplicados' };
  return { incremental: true };
}

// --- Leitura do modelo e do DOM ---

function indexarHierarquia(nodos: CamadaNodoHierarquico[], mapa = new Map<string, CamadaNodoHierarquico>()) {
  for (const nodo of nodos) {
    mapa.set(nodo.camada.id, nodo);
    indexarHierarquia(nodo.subcamadas, mapa);
  }
  return mapa;
}

/** Mesma indexação do render completo: feições sem id são ignoradas e sem `layerId` ficam em `''`. */
function agruparPorCamada(feicoes: FeicaoItem[]): Map<string, FeicaoItem[]> {
  const porCamada = new Map<string, FeicaoItem[]>();
  for (let i = 0; i < feicoes.length; i++) {
    const f = feicoes[i];
    if (!f || !f.id) continue;
    const lid = f.layerId || '';
    const lista = porCamada.get(lid);
    if (lista) lista.push(f);
    else porCamada.set(lid, [f]);
  }
  return porCamada;
}

/** Percorre os filhos por `nextElementSibling` (O(1) por passo em qualquer DOM, ao contrário de `children[i]`). */
function filhoDireto(pai: Element, classe: string): Element | null {
  for (let el = pai.firstElementChild; el; el = el.nextElementSibling) {
    if (el.classList.contains(classe)) return el;
  }
  return null;
}

/**
 * Grupos (`.ui-layer-group`) por id. No container de uma camada as subcamadas vêm antes das feições, então a
 * varredura para na primeira linha que não é grupo: o custo é o número de camadas, não o de linhas.
 */
function mapearGrupos(arvore: Element): Map<string, Element> {
  const grupos = new Map<string, Element>();
  const visitar = (pai: Element): void => {
    for (let filho = pai.firstElementChild; filho; filho = filho.nextElementSibling) {
      if (!filho.classList.contains('ui-layer-group')) continue;
      const id = filho.getAttribute('data-layer-id');
      if (id !== null) grupos.set(id, filho);
      const container = filhoDireto(filho, 'ui-children-container');
      if (container) visitar(container);
    }
  };
  visitar(arvore);
  return grupos;
}

function temIdsRepetidos(lista: FeicaoItem[] | undefined): boolean {
  if (!lista || lista.length < 2) return false;
  const vistos = new Set<string>();
  for (const f of lista) {
    if (vistos.has(f.id)) return true;
    vistos.add(f.id);
  }
  return false;
}

/** A camada e todos os ancestrais pelo `parentId` (os mesmos grupos cujo "escopo" contém as feições dela). */
function comAncestrais(ids: Iterable<string>, camadas: CamadaItem[]): Set<string> {
  const porId = new Map(camadas.map((c) => [c.id, c]));
  const resultado = new Set<string>();
  for (const id of ids) {
    let atual: string | null | undefined = id;
    while (atual && porId.has(atual) && !resultado.has(atual)) {
      resultado.add(atual);
      atual = porId.get(atual)?.parentId;
    }
  }
  return resultado;
}

// --- Aplicação no DOM ---

function paraElementos(html: string): { modelo: HTMLTemplateElement; elementos: Element[] } {
  const modelo = document.createElement('template');
  modelo.innerHTML = html;
  return { modelo, elementos: Array.from(modelo.content.children) };
}

/** Remove o elemento e o nó de texto só com espaço que o segue (resto da formatação do render completo). */
function removerComEspaco(el: Element): void {
  const proximo = el.nextSibling;
  if (proximo && proximo.nodeType === 3 && !(proximo.textContent ?? '').trim()) proximo.parentNode?.removeChild(proximo);
  el.remove();
}

/** Primeiro atributo `data-*` com valor: identifica o controle focado para devolver o foco (como o render completo). */
function chaveDeFoco(el: Element | null, dentroDe: Element): { nome: string; valor: string } | null {
  if (!el || !dentroDe.contains(el)) return null;
  const attr = Array.from(el.attributes).find((a) => a.name.startsWith('data-') && a.value !== '');
  return attr ? { nome: attr.name, valor: attr.value } : null;
}

interface ContextoAplicacao {
  host: HostIncremental;
  shadow: ShadowRoot;
  mudanca: MudancaFeicoes;
  porCamada: Map<string, FeicaoItem[]>;
  nodos: Map<string, CamadaNodoHierarquico>;
  grupos: Map<string, Element>;
  herdado: ReturnType<typeof calcularEstadoHerdado>;
  ligar: LigarElementos;
}

/** Deixa as linhas de feição da camada iguais às do render completo: remove, refaz e insere só o que difere. */
function reconciliarLinhas(ctx: ContextoAplicacao, camadaId: string): boolean {
  const { host, shadow, mudanca } = ctx;
  // Camada com ordem mista (subcamadas intercaladas com feições) cai no render completo para preservar posições
  if (host.ordemFilhosPorPai?.get(camadaId)?.length) return false;
  const grupo = ctx.grupos.get(camadaId);
  const nodo = ctx.nodos.get(camadaId);
  const container = grupo ? filhoDireto(grupo, 'ui-children-container') : null;
  if (!grupo || !nodo || !container) return false;

  const camada = nodo.camada;
  const todas = ctx.porCamada.get(camadaId) ?? [];
  const limite = host.expandedFeatureLimits.get(camadaId) ?? LIMITE_FEICOES_POR_CAMADA;
  const visiveis = todas.slice(0, limite);
  const desejados = new Set(visiveis.map((f) => f.id));

  // 1. Linhas que sobraram (ou que precisam ser refeitas) saem; as demais são reaproveitadas
  const atuais = new Map<string, Element>();
  const refeitas = new Map<string, { tabindex: string | null; foco: { nome: string; valor: string } | null }>();
  const ativo = shadow.activeElement;
  let primeiroNaoGrupo: Element | null = null;
  for (let filho = container.firstElementChild, proximo: Element | null; filho; filho = proximo) {
    proximo = filho.nextElementSibling;
    const fid = filho.getAttribute('data-feat-row');
    if (fid === null) {
      if (!primeiroNaoGrupo && !filho.classList.contains('ui-layer-group')) primeiroNaoGrupo = filho;
      continue;
    }
    const refazer = mudanca.idsAlterados.has(fid) && desejados.has(fid) && !atuais.has(fid);
    if (!desejados.has(fid) || atuais.has(fid) || refazer) {
      if (refazer) refeitas.set(fid, { tabindex: filho.getAttribute('tabindex'), foco: chaveDeFoco(ativo, filho) });
      removerComEspaco(filho);
    } else {
      atuais.set(fid, filho);
      if (!primeiroNaoGrupo) primeiroNaoGrupo = filho;
    }
  }

  // 2. Linhas que faltam são montadas de uma vez e ligadas ainda fora do DOM
  const ctxLinha = criarContextoLinhaFeicao(camada, nodo.depth, ctx.herdado.get(camadaId));
  const faltantes = visiveis.filter((f) => !atuais.has(f.id));
  let novas: Element[] = [];
  if (faltantes.length > 0) {
    const html = faltantes
      .map((f) =>
        renderizarLinhaFeicao(f, ctxLinha, host.selectedFeatureIds.has(f.id), host.editingFeatureId === f.id)
      )
      .join('');
    const { modelo, elementos } = paraElementos(html);
    if (elementos.length !== faltantes.length) return false;
    ctx.ligar(modelo.content);
    novas = elementos;
  }

  // 3. Inserção na ordem de `host.feicoes`, antes do aviso e da linha vazia (que ficam sempre no fim)
  let cursor: Element | null = primeiroNaoGrupo;
  let proxima = 0;
  const inseridas = new Map<string, Element>();
  for (const f of visiveis) {
    const existente = atuais.get(f.id);
    if (existente) {
      if (existente === cursor) cursor = existente.nextElementSibling;
      else container.insertBefore(existente, cursor);
    } else {
      const nova = novas[proxima++];
      container.insertBefore(nova, cursor);
      inseridas.set(f.id, nova);
    }
  }

  // 4. Linhas refeitas herdam o tabindex (roving) e o foco da linha que substituíram
  refeitas.forEach((antes, fid) => {
    const nova = inseridas.get(fid) as HTMLElement | undefined;
    if (!nova) return;
    if (antes.tabindex !== null) nova.setAttribute('tabindex', antes.tabindex);
    if (!antes.foco) return;
    const alvo =
      nova.getAttribute(antes.foco.nome) === antes.foco.valor
        ? nova
        : Array.from(nova.querySelectorAll<HTMLElement>(`[${antes.foco.nome}]`)).find(
            (n) => n.getAttribute(antes.foco!.nome) === antes.foco!.valor
          );
    (alvo as HTMLElement | undefined)?.focus({ preventScroll: true });
  });

  return atualizarAvisoELinhaVazia(ctx, container, nodo, limite, todas.length);
}

/** Aviso "Exibindo X de Y" e linha "Camada vazia": existem conforme o total de feições da camada. */
function atualizarAvisoELinhaVazia(
  ctx: ContextoAplicacao,
  container: Element,
  nodo: CamadaNodoHierarquico,
  limite: number,
  total: number
): boolean {
  const camadaIdSeguro = escapeHtml(nodo.camada.id);
  const ehGrupo = Boolean(nodo.camada.isGroup || nodo.subcamadas.length > 0);
  const precisaAviso = total > limite;
  const precisaVazia = nodo.subcamadas.length === 0 && total === 0;
  const aviso = filhoDireto(container, 'ui-truncate-notice');
  const vazia = filhoDireto(container, 'ui-empty-row');

  if (vazia && !precisaVazia) removerComEspaco(vazia);
  if (aviso && !precisaAviso) removerComEspaco(aviso);

  if (precisaAviso) {
    if (aviso) {
      const textos = textosAvisoTruncamento(limite, total);
      const resumo = aviso.querySelector('span');
      const botao = aviso.querySelector('.ui-truncate-more-btn');
      if (!resumo || !botao) return false;
      if (resumo.textContent !== textos.resumo) resumo.textContent = textos.resumo;
      if (botao.textContent !== textos.botao) botao.textContent = textos.botao;
    } else {
      const { modelo, elementos } = paraElementos(renderizarAvisoTruncamento(camadaIdSeguro, limite, total));
      if (elementos.length !== 1) return false;
      ctx.ligar(modelo.content);
      container.appendChild(elementos[0]);
    }
  }

  if (precisaVazia && !vazia) {
    const { elementos } = paraElementos(renderizarLinhaVazia(ehGrupo));
    if (elementos.length !== 1) return false;
    container.appendChild(elementos[0]);
  }
  return true;
}

/** Chip de contagem e círculo de seleção da linha da camada (a própria e as ancestrais). */
function atualizarResumoCamada(ctx: ContextoAplicacao, camadaId: string): boolean {
  const grupo = ctx.grupos.get(camadaId);
  const nodo = ctx.nodos.get(camadaId);
  const linha = grupo ? filhoDireto(grupo, 'ui-layer-row') : null;
  const nome = linha?.querySelector('.ui-col-name');
  if (!grupo || !nodo || !linha || !nome) return false;

  const { host } = ctx;
  const escopo = obterFeicoesDoEscopoCamada(host.camadas, host.feicoes, camadaId);
  const proprias = (ctx.porCamada.get(camadaId) ?? []).length;
  const subcamadas = nodo.subcamadas.length;
  const ehGrupo = Boolean(nodo.camada.isGroup || subcamadas > 0);

  const chip = nome.querySelector('.ui-count-chip');
  if (chip) {
    if (escopo.length === 0 && ehGrupo) {
      removerComEspaco(chip);
    } else {
      const texto = String(escopo.length);
      const titulo = tituloContagem(escopo.length, proprias, subcamadas);
      if (chip.textContent !== texto) chip.textContent = texto;
      if (chip.getAttribute('title') !== titulo) chip.setAttribute('title', titulo);
    }
  } else {
    const html = renderizarChipContagem(escopo.length, proprias, subcamadas, ehGrupo);
    if (html) {
      const { elementos } = paraElementos(html);
      if (elementos.length !== 1) return false;
      nome.appendChild(elementos[0]);
    }
  }

  aplicarEstadoTarget(linha.querySelector('.ui-target-circle'), escopo, host.selectedFeatureIds);
  return true;
}

/**
 * Aplica a mudança de feições só nas linhas afetadas. Devolve `false` quando não pôde garantir o mesmo
 * resultado do render completo (o chamador então redesenha o painel inteiro, o que também corrige o DOM).
 */
export function tentarAtualizacaoIncremental(
  host: HostIncremental,
  shadow: ShadowRoot,
  mudanca: MudancaFeicoes,
  ligar: LigarElementos
): boolean {
  const arvore = shadow.getElementById('ui-layer-tree-mount');
  const nodos = indexarHierarquia(construirHierarquiaCamadas(host.camadas));
  const grupos = arvore ? mapearGrupos(arvore) : new Map<string, Element>();
  const porCamada = agruparPorCamada(host.feicoes);
  const afetadas = mudanca.camadas === 'todas' ? Array.from(nodos.keys()) : Array.from(mudanca.camadas);

  const situacoes: SituacaoCamadaAfetada[] = afetadas.map((id) => ({
    existeNoModelo: nodos.has(id),
    renderizadaNoDom: grupos.has(id),
    drawerAberto: host.activeSettingsLayerId === id
  }));
  const decisao = decidirAtualizacao({
    arvoreRenderizada: arvore !== null,
    buscaAtiva: (host.searchQuery || '').trim() !== '',
    editandoCamada: host.editingLayerId !== null,
    editandoFeicao: host.editingFeatureId !== null,
    idsDuplicados: afetadas.some((id) => temIdsRepetidos(porCamada.get(id))),
    camadasAfetadas: situacoes
  });
  if (!decisao.incremental) return false;

  const ctx: ContextoAplicacao = {
    host,
    shadow,
    mudanca,
    porCamada,
    nodos,
    grupos,
    herdado: calcularEstadoHerdado(host.camadas),
    ligar
  };
  for (const id of afetadas) {
    if (!reconciliarLinhas(ctx, id)) return false;
  }
  for (const id of comAncestrais(afetadas, host.camadas)) {
    if (!atualizarResumoCamada(ctx, id)) return false;
  }
  if (mudanca.selecaoAfetada || host.selectedFeatureIds.size > 0) sincronizarRodapeDOM(host, shadow);
  return true;
}
