import type L from 'leaflet';

/*
 * Portão de popups do mapa (L2, sem DOM próprio).
 *
 * O Leaflet abre o popup de qualquer camada com `bindPopup` ao simples clique e, por padrão, desloca o mapa para ele
 * caber (auto-pan). Em CAD/GIS isso atrapalha: o clique é para selecionar, e a vista só se move quando o usuário pede.
 * Todo popup entra no mapa por `map.addLayer` (via `popup.openOn`, que `Layer.openPopup` e `Map.openPopup` usam). O portão
 * intercepta esse ponto, só para popups, e aplica um dos modos:
 *
 *  - `sob-demanda` (padrão): o clique não abre; o duplo clique sobre a camada abre. Sem auto-pan.
 *  - `automatico`: comportamento original do Leaflet.
 *  - `desligado`: o clique e o duplo clique não abrem.
 *
 * Nos dois primeiros, um popup aberto pelo código (`marcador.openPopup()` fora de um clique) abre, também sem auto-pan:
 * é um pedido explícito. O que o portão barra é a abertura causada pelo clique do mouse no mapa. Dentro de um clique, o
 * código que quer abrir de propósito usa `liberarPopups`.
 */

export type ModoPopups = 'sob-demanda' | 'automatico' | 'desligado';

export const MODO_POPUPS_PADRAO: ModoPopups = 'sob-demanda';

/** Tempo (ms) em que um clique bloqueado ainda pode virar abertura por duplo clique. */
const JANELA_DUPLO_CLIQUE_MS = 700;

export function lerModoPopups(valor: string | null | undefined): ModoPopups {
  const v = typeof valor === 'string' ? valor.trim().toLowerCase() : '';
  return v === 'automatico' || v === 'desligado' || v === 'sob-demanda' ? v : MODO_POPUPS_PADRAO;
}

interface CamadaOrigem {
  on: (evento: string, fn: (e?: { latlng?: unknown }) => void) => unknown;
  off: (evento: string, fn: (e?: { latlng?: unknown }) => void) => unknown;
  openPopup?: (latlng?: unknown) => unknown;
  getLatLng?: () => unknown;
}

interface PopupLike {
  options?: { autoPan?: boolean; closeButton?: boolean };
  _source?: CamadaOrigem | null;
}

const portoes = new WeakMap<object, PortaoPopups>();

/**
 * Popups têm `closeButton` e `autoPan` nas opções (herdados do protótipo). Só `autoPan` não basta: o marcador também o
 * tem (arrastar perto da borda), e tooltips e demais camadas não têm `closeButton`.
 */
function ehPopup(layer: unknown): layer is PopupLike {
  const opcoes = layer && typeof layer === 'object' ? (layer as PopupLike).options : undefined;
  return !!opcoes && opcoes.closeButton !== undefined && opcoes.autoPan !== undefined;
}

/** Executa `fn` com os popups do mapa liberados (pedido explícito do usuário). Sem portão, só executa. */
export function liberarPopups<T>(map: object | null | undefined, fn: () => T): T {
  const portao = map ? portoes.get(map) : undefined;
  return portao ? portao.liberar(fn) : fn();
}

export function obterPortaoPopups(map: object | null | undefined): PortaoPopups | undefined {
  return map ? portoes.get(map) : undefined;
}

export class PortaoPopups {
  private liberados = 0;
  /** Verdadeiro durante o despacho síncrono de um clique no mapa (o Leaflet abre popups dentro dele). */
  private emClique = false;
  private pendentes = new Map<CamadaOrigem, () => void>();
  private instalado = true;
  private readonly original: (layer: unknown) => L.Map;

  constructor(private map: L.Map, private modoAtual: ModoPopups = MODO_POPUPS_PADRAO) {
    this.original = (map.addLayer as unknown as (layer: unknown) => L.Map);
    const portao = this;
    (map as unknown as { addLayer: unknown }).addLayer = function (this: L.Map, layer: unknown): L.Map {
      // caminho quente (milhares de feições): só popups passam pela decisão
      return ehPopup(layer) ? portao.aoAbrir(this, layer) : portao.original.call(this, layer);
    };
    this.container = typeof map.getContainer === 'function' ? map.getContainer() : null;
    this.container?.addEventListener('click', this.marcarClique, true);
    portoes.set(map, this);
  }

  private container: HTMLElement | null = null;

  /** Fase de captura: roda antes dos tratadores do Leaflet, que abrem o popup dentro do mesmo clique. */
  private marcarClique = (): void => {
    this.emClique = true;
    queueMicrotask(() => { this.emClique = false; });
  };

  public get modo(): ModoPopups {
    return this.modoAtual;
  }

  public definirModo(modo: ModoPopups): void {
    this.modoAtual = lerModoPopups(modo);
    if (this.modoAtual !== 'sob-demanda') this.cancelarPendentes();
  }

  /** Abre o que `fn` abrir, independentemente do modo. Reentrante e sempre devolve o portão ao estado anterior. */
  public liberar<T>(fn: () => T): T {
    this.liberados++;
    try {
      return fn();
    } finally {
      this.liberados--;
    }
  }

  public destruir(): void {
    if (!this.instalado) return;
    this.instalado = false;
    this.cancelarPendentes();
    this.container?.removeEventListener('click', this.marcarClique, true);
    delete (this.map as unknown as { addLayer?: unknown }).addLayer;
    if (portoes.get(this.map) === this) portoes.delete(this.map);
  }

  private aoAbrir(map: L.Map, popup: PopupLike): L.Map {
    if (this.modoAtual === 'automatico') return this.original.call(map, popup);
    if (this.emClique && this.liberados === 0) {
      // aberto pelo clique do mouse: barrado (sob demanda, o duplo clique em seguida abre)
      if (this.modoAtual === 'sob-demanda') this.aguardarDuploClique(popup);
      return map;
    }
    // aberto a pedido (código ou duplo clique): o mapa não se move para acomodar o popup
    if (popup.options) popup.options.autoPan = false;
    return this.original.call(map, popup);
  }

  /** O clique foi barrado: se vier um duplo clique na mesma camada logo em seguida, abre. */
  private aguardarDuploClique(popup: PopupLike | null | undefined): void {
    const fonte = popup && typeof popup === 'object' ? popup._source : null;
    if (!fonte || typeof fonte.on !== 'function' || typeof fonte.off !== 'function' || this.pendentes.has(fonte)) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const limpar = (): void => {
      fonte.off('dblclick', abrir);
      if (timer !== undefined) clearTimeout(timer);
      this.pendentes.delete(fonte);
    };
    const abrir = (e?: { latlng?: unknown }): void => {
      limpar();
      this.liberar(() => fonte.openPopup?.(typeof fonte.getLatLng === 'function' ? undefined : e?.latlng));
    };
    timer = setTimeout(limpar, JANELA_DUPLO_CLIQUE_MS);
    fonte.on('dblclick', abrir);
    this.pendentes.set(fonte, limpar);
  }

  private cancelarPendentes(): void {
    for (const limpar of [...this.pendentes.values()]) limpar();
    this.pendentes.clear();
  }
}
