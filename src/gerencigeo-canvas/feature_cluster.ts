import type { LatLonPar } from './feature_types';

/*
 * Agrupamento de pontos por grade em pixels de mundo (projeção do Leaflet naquele zoom).
 * Como a grade é absoluta, os grupos não "dançam" ao arrastar o mapa; só mudam com o zoom.
 */

/** Lado da célula da grade, em px. */
export const CELULA_CLUSTER_PX = 55;
/** A partir deste zoom os pontos se desmembram. */
export const ZOOM_DESMEMBRAR = 17;
/** Com no máximo isto de pontos na camada, nunca agrupa. */
export const MAX_PONTOS_SEM_CLUSTER = 8;

export interface PontoCluster {
  id: string;
  coordenada: LatLonPar;
}

export interface Cluster {
  chave: string;
  coordenada: LatLonPar;
  membros: PontoCluster[];
}

export interface ResultadoCluster {
  clusters: Cluster[];
  /** Pontos que ficaram sozinhos na célula (desenhados individualmente). */
  isolados: PontoCluster[];
}

/** `projetar` leva [lat, lon] a pixels de mundo no zoom em questão. */
export type ProjetorMundo = (p: LatLonPar) => { x: number; y: number };

export function deveAgrupar(totalPontos: number, zoom: number): boolean {
  return zoom < ZOOM_DESMEMBRAR && totalPontos > MAX_PONTOS_SEM_CLUSTER;
}

export function centroDe(membros: PontoCluster[]): LatLonPar {
  let lat = 0;
  let lon = 0;
  for (const m of membros) {
    lat += m.coordenada[0];
    lon += m.coordenada[1];
  }
  return [lat / membros.length, lon / membros.length];
}

export function agruparPontos(pontos: PontoCluster[], zoom: number, projetar: ProjetorMundo): ResultadoCluster {
  if (!deveAgrupar(pontos.length, zoom)) return { clusters: [], isolados: pontos };

  const celulas = new Map<string, PontoCluster[]>();
  for (const p of pontos) {
    const { x, y } = projetar(p.coordenada);
    const chave = `${zoom}:${Math.floor(x / CELULA_CLUSTER_PX)}:${Math.floor(y / CELULA_CLUSTER_PX)}`;
    const lista = celulas.get(chave);
    if (lista) lista.push(p);
    else celulas.set(chave, [p]);
  }

  const clusters: Cluster[] = [];
  const isolados: PontoCluster[] = [];
  for (const [chave, membros] of celulas) {
    if (membros.length === 1) isolados.push(membros[0]);
    else clusters.push({ chave, coordenada: centroDe(membros), membros });
  }
  return { clusters, isolados };
}

/** Uma célula da grade: seus membros e a soma das coordenadas (centro em O(1)). */
export interface CelulaCluster {
  membros: Map<string, PontoCluster>;
  somaLat: number;
  somaLon: number;
}

/**
 * Mesma grade de `agruparPontos`, porém mantida em memória: entrar, sair ou mover um ponto custa O(1)
 * e a célula afetada é reavaliada sozinha, sem reagrupar a camada inteira. Vale para um único zoom.
 */
export class AgrupadorCluster {
  private celulas = new Map<string, CelulaCluster>();
  private celulaDe = new Map<string, string>();
  /** Chaves das células com 2 ou mais pontos (as únicas que viram cluster). */
  private multiplas = new Set<string>();

  constructor(public readonly zoom: number, private projetar: ProjetorMundo) {}

  /** Pontos agrupáveis na grade. */
  public get total(): number {
    return this.celulaDe.size;
  }

  /** Chave da célula do ponto, ou `undefined` se ele não está na grade. */
  public chaveDoPonto(id: string): string | undefined {
    return this.celulaDe.get(id);
  }

  public celula(chave: string): CelulaCluster | undefined {
    return this.celulas.get(chave);
  }

  /** Só as células que viram cluster (2+ pontos). */
  public* celulasAgrupadas(): IterableIterator<[string, CelulaCluster]> {
    for (const chave of this.multiplas) {
      const cel = this.celulas.get(chave);
      if (cel) yield [chave, cel];
    }
  }

  /** Está numa célula com 2 ou mais pontos (ou seja, dentro de um cluster)? */
  public emCluster(id: string): boolean {
    const chave = this.celulaDe.get(id);
    return chave !== undefined && (this.celulas.get(chave)?.membros.size ?? 0) >= 2;
  }

  /** Insere (ou move) o ponto; devolve a chave da célula nova. */
  public inserir(p: PontoCluster): string {
    this.remover(p.id);
    const { x, y } = this.projetar(p.coordenada);
    const chave = `${this.zoom}:${Math.floor(x / CELULA_CLUSTER_PX)}:${Math.floor(y / CELULA_CLUSTER_PX)}`;
    let cel = this.celulas.get(chave);
    if (!cel) {
      cel = { membros: new Map(), somaLat: 0, somaLon: 0 };
      this.celulas.set(chave, cel);
    }
    cel.membros.set(p.id, p);
    cel.somaLat += p.coordenada[0];
    cel.somaLon += p.coordenada[1];
    if (cel.membros.size >= 2) this.multiplas.add(chave);
    this.celulaDe.set(p.id, chave);
    return chave;
  }

  /** Tira o ponto da grade; devolve a chave da célula de onde saiu. */
  public remover(id: string): string | undefined {
    const chave = this.celulaDe.get(id);
    if (chave === undefined) return undefined;
    this.celulaDe.delete(id);
    const cel = this.celulas.get(chave);
    const p = cel?.membros.get(id);
    if (cel && p) {
      cel.membros.delete(id);
      cel.somaLat -= p.coordenada[0];
      cel.somaLon -= p.coordenada[1];
      if (cel.membros.size < 2) this.multiplas.delete(chave);
      if (cel.membros.size === 0) this.celulas.delete(chave);
    }
    return chave;
  }
}
