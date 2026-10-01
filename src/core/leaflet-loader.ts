/**
 * Utilitário centralizado para carregamento dinâmico e desacoplado do Leaflet.
 * Permite que a biblioteca funcione sem travar caso o Leaflet não esteja presente,
 * carregando sob demanda via dynamic import() ou acessando window.L no navegador.
 */

let leafletPromise: Promise<any> | null = null;
let leafletInstancia: any = null;

export async function carregarLeaflet(): Promise<any> {
  // 1. Já disponível no escopo global (ex: CDN com <script src="leaflet.js">)
  if (typeof window !== 'undefined' && (window as any).L) {
    leafletInstancia = (window as any).L;
    return leafletInstancia;
  }

  // 2. Se já tiver sido resolvido em cache local
  if (leafletInstancia) {
    return leafletInstancia;
  }

  // 3. Se uma promessa de carregamento já estiver em andamento
  if (leafletPromise) {
    return leafletPromise;
  }

  // 4. Carregar sob demanda via dynamic import()
  leafletPromise = (async () => {
    try {
      const modulo = await import('leaflet');
      leafletInstancia = (modulo as any).default || modulo;
      if (typeof window !== 'undefined' && !(window as any).L) {
        (window as any).L = leafletInstancia;
      }
      return leafletInstancia;
    } catch {
      leafletPromise = null;
      console.warn(
        '[UI Components Kit] O Leaflet não foi encontrado no ambiente.\n' +
        'Para utilizar componentes de mapa ou CAD (<ui-mapa>, <ui-canvas-cad>), ' +
        'instale o pacote "leaflet" (npm i leaflet) ou inclua o script no HTML: <script src=".../leaflet.js"></script>.'
      );
      return null;
    }
  })();

  return leafletPromise;
}

export function obterLeafletSincrono(): any | null {
  if (typeof window !== 'undefined' && (window as any).L) {
    return (window as any).L;
  }
  return leafletInstancia;
}
