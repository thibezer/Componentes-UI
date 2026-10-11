import { TabelaColuna, UISortDetail } from './tipos';
import { alternarDirecaoOrdenacao, aplicarOrdenacaoTabela } from './tabela-ordenacao';

export class TabelaOrquestradorDados {
  private dadosOriginais: Record<string, any>[] = [];
  private dadosExibicao: Record<string, any>[] = [];
  private colunaOrdenada: string | null = null;
  private direcaoOrdenacao: 'asc' | 'desc' | 'original' = 'original';
  private ultimoFiltro: string = '';
  /** Colunas declaradas: o filtro olha só elas (vazio = todos os campos do registro). */
  private colunasFiltro: string[] = [];

  public setColunasFiltro(ids: string[]): void {
    this.colunasFiltro = ids;
    if (this.ultimoFiltro) this.aplicarOrdenacao();
  }

  public getDadosOriginais(): Record<string, any>[] {
    return this.dadosOriginais;
  }

  public setDadosOriginais(dados: Record<string, any>[]): void {
    this.dadosOriginais = Array.isArray(dados) ? [...dados] : [];
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

  /** Recalcula a lista exibida: ordenação da coluna e, por cima, o filtro vigente (os dois valem juntos). */
  public aplicarOrdenacao(): void {
    const ordenados = aplicarOrdenacaoTabela(
      this.dadosOriginais,
      this.colunaOrdenada,
      this.direcaoOrdenacao
    );
    const termo = this.ultimoFiltro;
    this.dadosExibicao = termo
      ? ordenados.filter((item) => {
          const valores = this.colunasFiltro.length > 0 ? this.colunasFiltro.map((id) => item[id]) : Object.values(item);
          // objetos (exceto datas) não têm texto próprio: "[object Object]" casaria buscas como "obj"
          return valores.some((v) => v != null && (typeof v !== 'object' || v instanceof Date) && String(v).toLowerCase().includes(termo));
        })
      : ordenados;
  }

  public filtrar(termo: string): void {
    this.ultimoFiltro = (termo || '').trim().toLowerCase();
    this.aplicarOrdenacao();
  }
}
