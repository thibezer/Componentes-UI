/**
 * Adaptador dos detalhes internos do Leaflet usados pelo <ui-canvas-cad>.
 * Responsabilidade única: liberar o contêiner marcado por uma instância anterior do Leaflet.
 */
import type { ContainerLeaflet } from './tipos';

/**
 * O Leaflet recusa inicializar um contêiner já marcado com `_leaflet_id` ("Map container is already initialized").
 * Limpa a marca; devolve `true` se havia uma.
 */
export function liberarContainerLeaflet(container: HTMLElement | null | undefined): boolean {
  const alvo = container as ContainerLeaflet | null | undefined;
  if (!alvo || !alvo._leaflet_id) return false;
  try {
    delete alvo._leaflet_id;
  } catch {
    alvo._leaflet_id = undefined;
  }
  return true;
}
