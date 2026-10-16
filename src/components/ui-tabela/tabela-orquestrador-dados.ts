import { TabelaColuna, UISortDetail } from './tipos';
import { alternarDirecaoOrdenacao, aplicarOrdenacaoTabela } from './tabela-ordenacao';

/** Minúsculas e sem acentos: "ipe" encontra "Ipê". */
export function normalizarTexto(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export class TabelaOrquestradorDados {
  private dadosOriginais: Record<string, any>[] = [];
  private dadosExibicao: Record<string, any>[] = [];
  private colunaOrdenada: string | null = null;
  private direcaoOrdenacao: 'asc' | 'desc' | 'original' = 'original';
  private ultimoFiltro: string = '';
  /** Colunas declaradas: o filtro olha só elas (vazio = todos os campos do registro). */
  private colunasFiltro: string[] = [];
  private colunas: TabelaColuna[] = [];
  /** Ordenação feita pelo servidor: a tabela guarda coluna/direção (indicador) mas não reordena os dados. */
  private ordenacaoRemota = false;

  public setColunas(colunas: TabelaColuna[]): void {
    this.colunas = colunas;
    if (this.colunaOrdenada) this.aplicarOrdenacao();
  }

  public setOrdenacaoRemota(remota: boolean): void {
    if (this.ordenacaoRemota === remota) return;
    this.ordenacaoRemota = remota;
    this.aplicarOrdenacao();
  }

  /** Restaura coluna/direção (ex.: `ui-sort` cancelado) e recalcula. */
  public restaurarOrdenacao(coluna: string | null, direcao: 'asc' | 'desc' | 'original'): void {
    this.colunaOrdenada = coluna;
    this.direcaoOrdenacao = direcao;
    this.aplicarOrdenacao();
  }

  public setColunasFiltro(ids: string[]): void {
    this.colunasFiltro = ids;
    if (this.ultimoFiltro) this.aplicarOrdenacao();
  }

  public getDadosOriginais(): Record<string, any>[] {
    return this.dadosOriginais;
  }

  public setDadosOriginais(dados: Record<string, any>[]): void {
    // entradas nulas/undefined são descartadas (quebrariam ordenação, filtro e render)
    this.dadosOriginais = Array.isArray(dados) ? dados.filter((d) => d != null) : [];
    this.aplicarOrdenacao();
  }

  public getDadosExibicao(): Record<string, any>[] {
    return this.dadosExibicao;
  }

  public getColunaOrdenada(): string | null {
    return this.colunaOrdenada;
  }

  public setColunaOrdenada(id: string | null): void {
    this.colunaOrdenada = id;
    if (!id) {
      this.direcaoOrdenacao = 'original';
    } else if (this.direcaoOrdenacao === 'original') {
      this.direcaoOrdenacao = 'asc';
    }
    this.aplicarOrdenacao();
  }

  public getDirecaoOrdenacao(): 'asc' | 'desc' | 'original' {
    return this.direcaoOrdenacao;
  }

  public setDirecaoOrdenacao(dir: 'asc' | 'desc' | 'original'): void {
    this.direcaoOrdenacao = dir || 'original';
    if (this.direcaoOrdenacao === 'original') {
      this.colunaOrdenada = null;
    }
    this.aplicarOrdenacao();
  }

  public alternarOrdenacaoColuna(coluna: TabelaColuna): UISortDetail | null {
    if (!coluna.ordenavel) return null;
    const proxima = alternarDirecaoOrdenacao(this.colunaOrdenada, this.direcaoOrdenacao, coluna.id);
    this.colunaOrdenada = proxima.idColuna;
    this.direcaoOrdenacao = proxima.direcao;
    this.aplicarOrdenacao();
    return proxima;
  }

  /** Recalcula a lista exibida: filtro vigente e, sobre o resultado, a ordenação da coluna (valem juntos). */
  public aplicarOrdenacao(): void {
    const termo = this.ultimoFiltro;
    const base = termo ? this.dadosOriginais.filter((item) => this.casaFiltro(item, termo)) : this.dadosOriginais;
    const coluna = this.colunaOrdenada ? this.colunas.find((c) => c.id === this.colunaOrdenada) : null;
    this.dadosExibicao = this.ordenacaoRemota
      ? [...base]
      : aplicarOrdenacaoTabela(base, this.colunaOrdenada, this.direcaoOrdenacao, coluna);
  }

  private casaFiltro(item: Record<string, any>, termo: string): boolean {
    const ids = this.colunasFiltro.length > 0 ? this.colunasFiltro : Object.keys(item);
    return ids.some((id) => {
      const v = item[id];
      const coluna = this.colunas.find((c) => c.id === id);
      if (coluna?.textoFiltro) {
        try { if (normalizarTexto(String(coluna.textoFiltro(v, item) ?? '')).includes(termo)) return true; } catch { /* ignora */ }
      }
      if (v == null) return false;
      // objetos (exceto datas) não têm texto próprio: "[object Object]" casaria buscas como "obj"
      if (typeof v === 'object' && !(v instanceof Date)) return false;
      const texto = v instanceof Date ? `${v.toISOString()} ${v.toLocaleDateString('pt-BR')}` : String(v);
      return normalizarTexto(texto).includes(termo);
    });
  }

  /** Há um filtro de texto aplicado (o vazio vira "sem resultados"). */
  public temFiltro(): boolean {
    return this.ultimoFiltro !== '';
  }

  public filtrar(termo: string): void {
    this.ultimoFiltro = normalizarTexto((termo || '').trim());
    this.aplicarOrdenacao();
  }
}
