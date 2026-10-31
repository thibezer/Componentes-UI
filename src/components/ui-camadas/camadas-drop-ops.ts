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
  | { tipo: 'ordem'; camada: CamadaItem; parentAnteriorId: string | null };

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
  const parentAnteriorId = movida.parentId ?? null;

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
  return { tipo: 'ordem', camada: movida, parentAnteriorId };
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
