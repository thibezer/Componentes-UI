import { TabelaColuna, UISortDetail } from './tipos';
import { alternarDirecaoOrdenacao, aplicarOrdenacaoTabela } from './tabela-ordenacao';

export class TabelaOrquestradorDados {
  private dadosOriginais: Record<string, any>[] = [];
  private dadosExibicao: Record<string, any>[] = [];
  private colunaOrdenada: string | null = null;
  private direcaoOrdenacao: 'asc' | 'desc' | 'original' = 'original';
  private ultimoFiltro: string = '';

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

  public aplicarOrdenacao(): void {
    this.dadosExibicao = aplicarOrdenacaoTabela(
      this.dadosOriginais,
      this.colunaOrdenada,
      this.direcaoOrdenacao
    );
  }

  public filtrar(termo: string): void {
    this.ultimoFiltro = (termo || '').trim().toLowerCase();
    if (!this.ultimoFiltro) {
      this.aplicarOrdenacao();
      return;
    }

    this.dadosExibicao = this.dadosOriginais.filter((item) => {
      return Object.values(item).some((valor) => {
        if (valor == null) return false;
        return String(valor).toLowerCase().includes(this.ultimoFiltro);
      });
    });
  }
}
