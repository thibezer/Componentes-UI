/**
 * Acesso tipado à seleção de pontos, que vive em dois contextos (render e interação).
 * Responsabilidade única: manter os dois em sincronia por um único acessor.
 */
import type { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';

type IdPonto = string | number;
/** O contexto de renderização guarda a seleção, mas o campo não está no tipo exportado do motor. */
type ContextoRenderComSelecao = { selectedPontoIds?: IdPonto[] };

export function lerPontosSelecionados(controller: GerenciGeoMapaController): IdPonto[] {
  const render = (controller.context as unknown as ContextoRenderComSelecao).selectedPontoIds;
  return render || controller.canvasInteracao.ctx.selectedPontoIds || [];
}

export function gravarPontosSelecionados(controller: GerenciGeoMapaController, ids: IdPonto[]): void {
  controller.canvasInteracao.ctx.selectedPontoIds = [...ids] as number[];
  (controller.context as unknown as ContextoRenderComSelecao).selectedPontoIds = [...ids];
}
