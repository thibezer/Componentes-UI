import type { Feicao } from './feature_types';
import { limitesDaGeometria } from './feature_metricas';

/*
 * Índice espacial de feições: R-tree empacotada (STR) com inserção/atualização/remoção incrementais.
 *
 * A árvore principal é imutável e montada em lote (rápida de montar e de consultar). Mudanças pontuais
 * vão para um "delta" (itens novos + removidos) consultado junto; quando o delta cresce demais, a árvore
 * é remontada. Assim 100 mil feições se constroem em dezenas de ms e uma edição não custa uma remontagem.
 * Sem dependências externas (a biblioteca não tem dependências de runtime).
 */

/** Envelope em graus: [oeste, sul, leste, norte] (x = lon, y = lat). */
export interface CaixaGeo {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface ItemIndice extends CaixaGeo {
  id: string;
}

interface No extends CaixaGeo {
  folhas?: ItemIndice[];
  filhos?: No[];
}

const TAMANHO_NO = 16;
/** O delta só dispara remontagem acima disto (e de 10% do total). */
const LIMITE_DELTA_MIN = 256;

export function caixaDaFeicao(f: Feicao): CaixaGeo {
  const [[minLat, minLon], [maxLat, maxLon]] = limitesDaGeometria(f.geometria);
  return { minLon, minLat, maxLon, maxLat };
}

export function caixasSeTocam(a: CaixaGeo, b: CaixaGeo): boolean {
  return a.minLon <= b.maxLon && a.maxLon >= b.minLon && a.minLat <= b.maxLat && a.maxLat >= b.minLat;
}

function uniao(itens: CaixaGeo[]): CaixaGeo {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const i of itens) {
    if (i.minLon < minLon) minLon = i.minLon;
    if (i.minLat < minLat) minLat = i.minLat;
    if (i.maxLon > maxLon) maxLon = i.maxLon;
    if (i.maxLat > maxLat) maxLat = i.maxLat;
  }
  return { minLon, minLat, maxLon, maxLat };
}

/** Sort-Tile-Recursive: agrupa por fatias de longitude e, dentro delas, por latitude. */
function agrupar<T extends CaixaGeo>(itens: T[]): T[][] {
  const n = itens.length;
  const nos = Math.ceil(n / TAMANHO_NO);
  const fatias = Math.ceil(Math.sqrt(nos));
  const porFatia = fatias * TAMANHO_NO;
  const porLon = [...itens].sort((a, b) => a.minLon + a.maxLon - (b.minLon + b.maxLon));
  const grupos: T[][] = [];
  for (let i = 0; i < n; i += porFatia) {
    const fatia = porLon.slice(i, i + porFatia).sort((a, b) => a.minLat + a.maxLat - (b.minLat + b.maxLat));
    for (let j = 0; j < fatia.length; j += TAMANHO_NO) grupos.push(fatia.slice(j, j + TAMANHO_NO));
  }
  return grupos;
}

function montar(itens: ItemIndice[]): No | null {
  if (itens.length === 0) return null;
  let nivel: No[] = agrupar(itens).map((g) => ({ ...uniao(g), folhas: g }));
  while (nivel.length > 1) {
    nivel = agrupar(nivel).map((g) => ({ ...uniao(g), filhos: g }));
  }
  return nivel[0];
}

export class IndiceEspacial {
  private raiz: No | null = null;
  /** Itens vivos: a fonte da verdade (a árvore pode conter itens já removidos/atualizados). */
  private itens = new Map<string, ItemIndice>();
  /** Itens que entraram ou mudaram depois da última montagem. */
  private delta = new Map<string, ItemIndice>();
  /** Ids que estão na árvore mas foram removidos ou substituídos. */
  private obsoletos = new Set<string>();

  public get tamanho(): number {
    return this.itens.size;
  }

  public construir(feicoes: Feicao[]): void {
    this.itens.clear();
    for (const f of feicoes) {
      if (!f.excluida) this.itens.set(f.id, { id: f.id, ...caixaDaFeicao(f) });
    }
    this.remontar();
  }

  public inserir(f: Feicao): void {
    this.atualizar(f);
  }

  /** Insere ou substitui; feição `excluida` sai do índice. */
  public atualizar(f: Feicao): void {
    if (f.excluida) {
      this.remover(f.id);
      return;
    }
    const item: ItemIndice = { id: f.id, ...caixaDaFeicao(f) };
    if (this.itens.has(f.id)) this.obsoletos.add(f.id);
    this.itens.set(f.id, item);
    this.delta.set(f.id, item);
    this.compactarSeNecessario();
  }

  public remover(id: string): void {
    if (!this.itens.delete(id)) return;
    this.obsoletos.add(id);
    this.delta.delete(id);
    this.compactarSeNecessario();
  }

  public limpar(): void {
    this.itens.clear();
    this.remontar();
  }

  /** Ids das feições cujo envelope toca `caixa`. */
  public consultar(caixa: CaixaGeo): string[] {
    const achados: string[] = [];
    const pilha: No[] = this.raiz ? [this.raiz] : [];
    while (pilha.length > 0) {
      const no = pilha.pop()!;
      if (!caixasSeTocam(no, caixa)) continue;
      if (no.folhas) {
        for (const i of no.folhas) {
          if (!this.obsoletos.has(i.id) && caixasSeTocam(i, caixa)) achados.push(i.id);
        }
      } else if (no.filhos) {
        pilha.push(...no.filhos);
      }
    }
    for (const i of this.delta.values()) if (caixasSeTocam(i, caixa)) achados.push(i.id);
    return achados;
  }

  public intersecta(caixa: CaixaGeo): boolean {
    return this.consultar(caixa).length > 0;
  }

  /** Envelope da feição indexada, se houver. */
  public caixaDe(id: string): CaixaGeo | undefined {
    return this.itens.get(id);
  }

  private compactarSeNecessario(): void {
    const sujo = this.delta.size + this.obsoletos.size;
    if (sujo > Math.max(LIMITE_DELTA_MIN, this.itens.size * 0.1)) this.remontar();
  }

  private remontar(): void {
    this.raiz = montar([...this.itens.values()]);
    this.delta.clear();
    this.obsoletos.clear();
  }
}
