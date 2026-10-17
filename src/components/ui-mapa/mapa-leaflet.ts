/**
 * Adaptador do Leaflet para o <ui-mapa> e filhos.
 * Responsabilidade única: entregar o `L` já carregado com tipo, num único ponto de acesso.
 */
import { carregarLeaflet, obterLeafletSincrono } from '../../core/leaflet-loader';
import type { LeafletModulo } from './tipos';

/** `L` se o Leaflet já estiver carregado (global ou importado), senão `null`. */
export function obterLeaflet(): LeafletModulo | null {
  return (obterLeafletSincrono() as LeafletModulo | null) ?? null;
}

/** Carrega o Leaflet sob demanda; `null` se não estiver instalado. */
export async function carregarLeafletTipado(): Promise<LeafletModulo | null> {
  return ((await carregarLeaflet()) as LeafletModulo | null) ?? null;
}
