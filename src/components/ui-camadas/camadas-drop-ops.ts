/* ====================================================
   UI Camadas - Operações de soltar (drop)
   Responsabilidade única: regras puras de reordenar/aninhar camadas e mover feições, sobre as listas do
   painel. Nada aqui toca no DOM nem emite eventos; quem chama decide o que fazer com o resultado.
   ==================================================== */

import type { CamadaItem, FeicaoItem } from './tipos';

export type ZonaDrop = 'acima' | 'abaixo' | 'dentro';

/** Evita ciclos hierárquicos ao mover uma camada para dentro de outra. */
export function ehDescendente(camadas: CamadaItem[], possivelDescendenteId: string, ancestralId: string): boolean {
  const visitados = new Set<string>();
  let atual = camadas.find((c) => c.id === possivelDescendenteId);
  while (atual && atual.parentId) {
    // dados já corrompidos (ciclo existente) não podem travar o laço
    if (visitados.has(atual.id)) return true;
    visitados.add(atual.id);
    if (atual.parentId === ancestralId) return true;
    atual = camadas.find((c) => c.id === atual?.parentId);
  }
  return false;
}

/** Zona do alvo pela posição vertical relativa (0..1): 25% de cima, 25% de baixo e o meio (aninhar). */
export function zonaDeDropCamada(posicaoRelativa: number): ZonaDrop {
  if (!Number.isFinite(posicaoRelativa)) return 'dentro';
  if (posicaoRelativa < 0.25) return 'acima';
  if (posicaoRelativa > 0.75) return 'abaixo';
  return 'dentro';
}

export type ResultadoMoverCamada =
  | { tipo: 'hierarquia'; camada: CamadaItem; novoParentId: string; parentAnteriorId: string | null }
  | { tipo: 'ordem'; camada: CamadaItem; parentAnteriorId: string | null; novoParentId: string | null };

/**
 * Move `movidaId` em relação a `alvoId`. `dentro` torna-a subcamada (recusa ciclos); `acima`/`abaixo`
 * reordena e adota o pai do alvo. Muta `camadas`; devolve `null` se nada mudou.
 */
export function moverCamada(
  camadas: CamadaItem[],
  movidaId: string,
  alvoId: string,
  zona: ZonaDrop
): ResultadoMoverCamada | null {
  if (!movidaId || !alvoId || movidaId === alvoId) return null;
  const movida = camadas.find((l) => l.id === movidaId);
  const alvo = camadas.find((l) => l.id === alvoId);
  if (!movida || !alvo) return null;

  const parentAnteriorId = movida.parentId !== undefined ? movida.parentId : null;

  if (zona === 'dentro') {
    if (ehDescendente(camadas, alvo.id, movida.id)) return null;
    movida.parentId = alvo.id;
    return { tipo: 'hierarquia', camada: movida, novoParentId: alvo.id, parentAnteriorId };
  }

  // Adotar o pai de um descendente criaria ciclo (o grupo passaria a ser filho de si mesmo)
  if (ehDescendente(camadas, alvo.id, movida.id)) return null;

  const origem = camadas.findIndex((l) => l.id === movidaId);
  camadas.splice(origem, 1);
  const destino = camadas.findIndex((l) => l.id === alvoId);
  if (destino === -1) camadas.push(movida);
  else camadas.splice(zona === 'acima' ? destino : destino + 1, 0, movida);
  movida.parentId = alvo.parentId ?? null;
  return { tipo: 'ordem', camada: movida, parentAnteriorId, novoParentId: movida.parentId };
}

/** Reordena apenas (sem aninhar), como no arraste por toque. Muta `camadas`; `false` se nada mudou. */
export function reordenarCamada(camadas: CamadaItem[], movidaId: string, alvoId: string, acima: boolean): boolean {
  if (!movidaId || !alvoId || movidaId === alvoId) return false;
  const origem = camadas.findIndex((l) => l.id === movidaId);
  if (origem === -1) return false;
  const [movida] = camadas.splice(origem, 1);
  const destino = camadas.findIndex((l) => l.id === alvoId);
  if (destino === -1) camadas.push(movida);
  else camadas.splice(acima ? destino : destino + 1, 0, movida);
  return true;
}

export interface ResultadoMoverFeicao {
  feicao: FeicaoItem;
  camadaOrigemId: string | undefined;
  camadaDestinoId: string | undefined;
  mudouDeCamada: boolean;
}

/** Move a feição para outra camada (sem reordenar). `null` se a feição/camada não existe ou já está lá. */
export function moverFeicaoParaCamada(
  feicoes: FeicaoItem[],
  camadas: CamadaItem[],
  feicaoId: string,
  camadaDestinoId: string
): ResultadoMoverFeicao | null {
  const feicao = feicoes.find((f) => f.id === feicaoId);
  const destino = camadas.find((l) => l.id === camadaDestinoId);
  if (!feicao || !destino || feicao.layerId === camadaDestinoId) return null;
  const camadaOrigemId = feicao.layerId;
  feicao.layerId = camadaDestinoId;
  return { feicao, camadaOrigemId, camadaDestinoId, mudouDeCamada: true };
}

/** Reordena a feição em relação a outra, adotando a camada do alvo. Muta `feicoes`; `null` se nada mudou. */
export function reordenarFeicao(
  feicoes: FeicaoItem[],
  movidaId: string,
  alvoId: string,
  acima: boolean
): ResultadoMoverFeicao | null {
  if (!movidaId || !alvoId || movidaId === alvoId) return null;
  const origem = feicoes.findIndex((f) => f.id === movidaId);
  if (origem === -1) return null;
  const alvo = feicoes.find((f) => f.id === alvoId);
  if (!alvo) return null;

  const [movida] = feicoes.splice(origem, 1);
  const camadaOrigemId = movida.layerId;
  const camadaDestinoId = alvo.layerId;
  const mudouDeCamada = camadaOrigemId !== camadaDestinoId;
  if (mudouDeCamada) movida.layerId = camadaDestinoId;

  const destino = feicoes.findIndex((f) => f.id === alvoId);
  if (destino === -1) feicoes.push(movida);
  else feicoes.splice(acima ? destino : destino + 1, 0, movida);
  return { feicao: movida, camadaOrigemId, camadaDestinoId, mudouDeCamada };
}

// --- Ordenação mista (subcamadas + feições) dentro de uma camada pai ---

export function chaveFilhoCamada(id: string): string {
  return `L:${id}`;
}

export function chaveFilhoFeicao(id: string): string {
  return `F:${id}`;
}

export type FilhoMisto<TNodo> =
  | { tipo: 'layer'; nodo: TNodo }
  | { tipo: 'feature'; feicao: FeicaoItem };

/**
 * Mescla subcamadas e feições de uma mesma camada pai respeitando `ordemSalva` (chaves `L:<id>` / `F:<id>`).
 * Sem `ordemSalva`, mantém o padrão clássico: subcamadas primeiro, feições depois.
 */
export function mesclarFilhosOrdenados<TNodo extends { camada: CamadaItem }>(
  subcamadas: TNodo[],
  feicoes: FeicaoItem[],
  ordemSalva?: readonly string[]
): FilhoMisto<TNodo>[] {
  if (!ordemSalva || ordemSalva.length === 0) {
    return [
      ...subcamadas.map((nodo) => ({ tipo: 'layer' as const, nodo })),
      ...feicoes.map((feicao) => ({ tipo: 'feature' as const, feicao }))
    ];
  }

  const subPorId = new Map(subcamadas.map((s) => [s.camada.id, s]));
  const featPorId = new Map(feicoes.map((f) => [f.id, f]));
  const usados = new Set<string>();
  const resultado: FilhoMisto<TNodo>[] = [];

  for (const chave of ordemSalva) {
    if (usados.has(chave)) continue;
    if (chave.startsWith('L:')) {
      const id = chave.slice(2);
      const nodo = subPorId.get(id);
      if (nodo) {
        usados.add(chave);
        resultado.push({ tipo: 'layer', nodo });
      }
    } else if (chave.startsWith('F:')) {
      const id = chave.slice(2);
      const feicao = featPorId.get(id);
      if (feicao) {
        usados.add(chave);
        resultado.push({ tipo: 'feature', feicao });
      }
    }
  }

  for (const nodo of subcamadas) {
    const chave = chaveFilhoCamada(nodo.camada.id);
    if (!usados.has(chave)) {
      usados.add(chave);
      resultado.push({ tipo: 'layer', nodo });
    }
  }

  for (const feicao of feicoes) {
    const chave = chaveFilhoFeicao(feicao.id);
    if (!usados.has(chave)) {
      usados.add(chave);
      resultado.push({ tipo: 'feature', feicao });
    }
  }

  return resultado;
}

/** Constrói/sincroniza a lista de chaves (`L:<id>` / `F:<id>`) dos filhos diretos de `parentId`. */
function sincronizarListaFilhos(
  ordemFilhosPorPai: Map<string, string[]>,
  parentId: string,
  camadas: CamadaItem[],
  feicoes: FeicaoItem[]
): string[] {
  const subIds = camadas.filter((c) => c.parentId === parentId).map((c) => c.id);
  const featIds = feicoes.filter((f) => f.layerId === parentId).map((f) => f.id);
  const validos = new Set<string>([
    ...subIds.map(chaveFilhoCamada),
    ...featIds.map(chaveFilhoFeicao)
  ]);

  const atual = ordemFilhosPorPai.get(parentId);
  const lista: string[] = [];
  const vistos = new Set<string>();

  if (atual) {
    for (const chave of atual) {
      if (validos.has(chave) && !vistos.has(chave)) {
        vistos.add(chave);
        lista.push(chave);
      }
    }
  }
  for (const id of subIds) {
    const chave = chaveFilhoCamada(id);
    if (!vistos.has(chave)) {
      vistos.add(chave);
      lista.push(chave);
    }
  }
  for (const id of featIds) {
    const chave = chaveFilhoFeicao(id);
    if (!vistos.has(chave)) {
      vistos.add(chave);
      lista.push(chave);
    }
  }
  return lista;
}

function inserirNaLista(lista: string[], chaveMovida: string, chaveAlvo: string, acima: boolean): void {
  const semMovida = lista.filter((c) => c !== chaveMovida);
  const idx = semMovida.indexOf(chaveAlvo);
  if (idx === -1) semMovida.push(chaveMovida);
  else semMovida.splice(acima ? idx : idx + 1, 0, chaveMovida);
  lista.length = 0;
  lista.push(...semMovida);
}

/** Remove uma chave da lista do pai anterior caso exista. */
export function removerChaveDeOrdemFilhos(
  ordemFilhosPorPai: Map<string, string[]>,
  parentId: string | null | undefined,
  chave: string
): void {
  if (!parentId) return;
  const lista = ordemFilhosPorPai.get(parentId);
  if (!lista) return;
  const filtrada = lista.filter((c) => c !== chave);
  if (filtrada.length === 0) ordemFilhosPorPai.delete(parentId);
  else ordemFilhosPorPai.set(parentId, filtrada);
}

/** Alinha a ordem das subcamadas em `camadas` com a ordem relativa em `ordem`. */
function alinharSubcamadasEmCamadas(camadas: CamadaItem[], ordem: readonly string[]): void {
  const subOrdem = ordem.filter((c) => c.startsWith('L:')).map((c) => c.slice(2));
  if (subOrdem.length < 2) return;
  const subSet = new Set(subOrdem);
  const indices: number[] = [];
  const porId = new Map<string, CamadaItem>();
  for (let i = 0; i < camadas.length; i++) {
    if (subSet.has(camadas[i].id)) {
      indices.push(i);
      porId.set(camadas[i].id, camadas[i]);
    }
  }
  if (indices.length !== subOrdem.length) return;
  for (let i = 0; i < indices.length; i++) {
    const item = porId.get(subOrdem[i]);
    if (item) camadas[indices[i]] = item;
  }
}

/** Alinha a ordem das feições em `feicoes` com a ordem relativa em `ordem`. */
function alinharFeicoesEmLista(feicoes: FeicaoItem[], ordem: readonly string[]): void {
  const featOrdem = ordem.filter((c) => c.startsWith('F:')).map((c) => c.slice(2));
  if (featOrdem.length < 2) return;
  const featSet = new Set(featOrdem);
  const indices: number[] = [];
  const porId = new Map<string, FeicaoItem>();
  for (let i = 0; i < feicoes.length; i++) {
    if (featSet.has(feicoes[i].id)) {
      indices.push(i);
      porId.set(feicoes[i].id, feicoes[i]);
    }
  }
  if (indices.length !== featOrdem.length) return;
  for (let i = 0; i < indices.length; i++) {
    const item = porId.get(featOrdem[i]);
    if (item) feicoes[indices[i]] = item;
  }
}

/**
 * Move uma camada/subcamada para ficar imediatamente acima ou abaixo de uma feição (`alvoFeicaoId`),
 * adotando o `layerId` da feição alvo como seu `parentId` e registrando a posição mista.
 */
export function moverCamadaEmRelacaoAFeicao(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  ordemFilhosPorPai: Map<string, string[]>,
  movidaId: string,
  alvoFeicaoId: string,
  acima: boolean
): ResultadoMoverCamada | null {
  if (!movidaId || !alvoFeicaoId) return null;
  const movida = camadas.find((c) => c.id === movidaId);
  const alvoFeicao = feicoes.find((f) => f.id === alvoFeicaoId);
  if (!movida || !alvoFeicao || !alvoFeicao.layerId) return null;

  const novoParentId = alvoFeicao.layerId;
  if (novoParentId === movidaId || ehDescendente(camadas, novoParentId, movidaId)) return null;

  const parentAnteriorId = movida.parentId !== undefined ? movida.parentId : null;
  if (parentAnteriorId && parentAnteriorId !== novoParentId) {
    removerChaveDeOrdemFilhos(ordemFilhosPorPai, parentAnteriorId, chaveFilhoCamada(movidaId));
  }

  movida.parentId = novoParentId;
  const lista = sincronizarListaFilhos(ordemFilhosPorPai, novoParentId, camadas, feicoes);
  inserirNaLista(lista, chaveFilhoCamada(movidaId), chaveFilhoFeicao(alvoFeicaoId), acima);
  ordemFilhosPorPai.set(novoParentId, lista);
  alinharSubcamadasEmCamadas(camadas, lista);

  return {
    tipo: parentAnteriorId !== novoParentId ? 'hierarquia' : 'ordem',
    camada: movida,
    parentAnteriorId,
    novoParentId
  };
}

/**
 * Move uma feição para ficar imediatamente acima ou abaixo de uma subcamada (`alvoCamadaId`),
 * adotando o `parentId` da subcamada alvo. Retorna `null` se a camada alvo for raiz (sem pai).
 */
export function moverFeicaoEmRelacaoACamada(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  ordemFilhosPorPai: Map<string, string[]>,
  movidaFeicaoId: string,
  alvoCamadaId: string,
  acima: boolean
): ResultadoMoverFeicao | null {
  if (!movidaFeicaoId || !alvoCamadaId) return null;
  const movida = feicoes.find((f) => f.id === movidaFeicaoId);
  const alvoCamada = camadas.find((c) => c.id === alvoCamadaId);
  if (!movida || !alvoCamada || !alvoCamada.parentId) return null;

  const parentId = alvoCamada.parentId;
  const camadaOrigemId = movida.layerId;
  const mudouDeCamada = camadaOrigemId !== parentId;

  if (mudouDeCamada) {
    removerChaveDeOrdemFilhos(ordemFilhosPorPai, camadaOrigemId, chaveFilhoFeicao(movidaFeicaoId));
    movida.layerId = parentId;
  }

  const lista = sincronizarListaFilhos(ordemFilhosPorPai, parentId, camadas, feicoes);
  inserirNaLista(lista, chaveFilhoFeicao(movidaFeicaoId), chaveFilhoCamada(alvoCamadaId), acima);
  ordemFilhosPorPai.set(parentId, lista);
  alinharFeicoesEmLista(feicoes, lista);

  return { feicao: movida, camadaOrigemId, camadaDestinoId: parentId, mudouDeCamada };
}

/** Mantém `ordemFilhosPorPai` coerente após `moverCamada`. */
export function sincronizarOrdemFilhosAposMoverCamada(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  ordemFilhosPorPai: Map<string, string[]>,
  movidaId: string,
  alvoId: string,
  zona: ZonaDrop,
  parentAnteriorId: string | null,
  novoParentId: string | null
): void {
  const chave = chaveFilhoCamada(movidaId);
  if (parentAnteriorId && (parentAnteriorId !== novoParentId || zona === 'dentro')) {
    removerChaveDeOrdemFilhos(ordemFilhosPorPai, parentAnteriorId, chave);
  }
  if (zona !== 'dentro' && novoParentId && ordemFilhosPorPai.has(novoParentId)) {
    const lista = sincronizarListaFilhos(ordemFilhosPorPai, novoParentId, camadas, feicoes);
    inserirNaLista(lista, chave, chaveFilhoCamada(alvoId), zona === 'acima');
    ordemFilhosPorPai.set(novoParentId, lista);
  }
}

/** Mantém `ordemFilhosPorPai` coerente após `reordenarFeicao`. */
export function sincronizarOrdemFilhosAposReordenarFeicao(
  camadas: CamadaItem[],
  feicoes: FeicaoItem[],
  ordemFilhosPorPai: Map<string, string[]>,
  movidaId: string,
  alvoId: string,
  acima: boolean,
  camadaOrigemId: string | undefined,
  camadaDestinoId: string | undefined
): void {
  const chave = chaveFilhoFeicao(movidaId);
  if (camadaOrigemId && camadaOrigemId !== camadaDestinoId) {
    removerChaveDeOrdemFilhos(ordemFilhosPorPai, camadaOrigemId, chave);
  }
  if (camadaDestinoId && ordemFilhosPorPai.has(camadaDestinoId)) {
    const lista = sincronizarListaFilhos(ordemFilhosPorPai, camadaDestinoId, camadas, feicoes);
    inserirNaLista(lista, chave, chaveFilhoFeicao(alvoId), acima);
    ordemFilhosPorPai.set(camadaDestinoId, lista);
  }
}

/** Mantém `ordemFilhosPorPai` coerente após `moverFeicaoParaCamada`. */
export function sincronizarOrdemFilhosAposMoverFeicao(
  ordemFilhosPorPai: Map<string, string[]>,
  feicaoId: string,
  camadaOrigemId: string | undefined,
  camadaDestinoId: string | undefined
): void {
  const chave = chaveFilhoFeicao(feicaoId);
  removerChaveDeOrdemFilhos(ordemFilhosPorPai, camadaOrigemId, chave);
  if (camadaDestinoId && ordemFilhosPorPai.has(camadaDestinoId)) {
    const lista = ordemFilhosPorPai.get(camadaDestinoId)!;
    if (!lista.includes(chave)) lista.push(chave);
  }
}
