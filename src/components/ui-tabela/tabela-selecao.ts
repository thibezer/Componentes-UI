import type { UIRowScrollOptions, UISelecaoRemovidaDetail } from './tipos';
import { localizarIndiceItem } from './tabela-localizador';
import { alternarPart } from '../../core/parts';

/**
 * Contexto lido sob demanda (getters): dados, chave e tbody sempre refletem o estado atual da tabela,
 * mesmo após ordenar, filtrar, trocar dados ou mudar `chave-id`.
 */
export interface ContextoTabelaSelecao {
  host: HTMLElement;
  getTbody: () => HTMLTableSectionElement | null;
  getDadosExibicao: () => Record<string, any>[];
  getDadosOriginais: () => Record<string, any>[];
  getChaveId: () => string;
  /** Posiciona a linha exibida `indice` na área visível; retorna false se a tabela ainda não foi montada. */
  onRolarParaIndice: (indice: number, comportamento: 'smooth' | 'auto') => boolean;
  /** Chamado quando uma seleção programática muda a linha ativa (foco móvel do teclado). */
  onLinhaAtiva: (indice: number) => void;
}

export class TabelaSelecaoController {
  private itemSelecionado: Record<string, any> | null = null;
  private indiceSelecionado: number | null = null;

  constructor(private ctx: ContextoTabelaSelecao) {}

  /** Mesmo objeto ou mesmo valor na chave configurada. */
  private indiceDoItem(dados: Record<string, any>[], item: Record<string, any>): number {
    const chave = this.ctx.getChaveId();
    return dados.findIndex(
      (d) => d === item || (item[chave] !== undefined && d?.[chave] !== undefined && String(d[chave]) === String(item[chave]))
    );
  }

  public getItemSelecionado(): Record<string, any> | null {
    return this.itemSelecionado;
  }

  public setItemSelecionado(item: Record<string, any> | null): void {
    this.itemSelecionado = item;
    const indice = item ? this.indiceDoItem(this.ctx.getDadosExibicao(), item) : -1;
    this.indiceSelecionado = indice >= 0 ? indice : null;
    this.atualizarLinhasSelecionadas();
  }

  public getIndiceSelecionado(): number | null {
    return this.indiceSelecionado;
  }

  public setIndiceSelecionado(idx: number | null): void {
    const dados = this.ctx.getDadosExibicao();
    const valido = idx !== null && idx >= 0 && idx < dados.length;
    this.indiceSelecionado = valido ? idx : null;
    this.itemSelecionado = valido ? dados[idx!] : null;
    this.atualizarLinhasSelecionadas();
  }

  /**
   * Reaplica a seleção após ordenar, filtrar ou trocar os dados.
   * - Item ainda exibido: atualiza o índice (e a referência, se veio um objeto novo com a mesma chave).
   * - Item só escondido pelo filtro: mantém a seleção (sem índice) para reaparecer ao limpar o filtro.
   * - Item removido dos dados: limpa a seleção e emite `ui-selecao-removida`.
   */
  public reconciliar(): void {
    const item = this.itemSelecionado;
    if (!item) {
      this.indiceSelecionado = null;
      return;
    }
    const exibidos = this.ctx.getDadosExibicao();
    const indice = this.indiceDoItem(exibidos, item);
    if (indice >= 0) {
      this.itemSelecionado = exibidos[indice];
      this.indiceSelecionado = indice;
      return;
    }
    this.indiceSelecionado = null;
    const originais = this.ctx.getDadosOriginais();
    const indiceOriginal = this.indiceDoItem(originais, item);
    if (indiceOriginal >= 0) {
      this.itemSelecionado = originais[indiceOriginal];
      return;
    }
    this.itemSelecionado = null;
    this.ctx.host.dispatchEvent(
      new CustomEvent<UISelecaoRemovidaDetail>('ui-selecao-removida', { bubbles: true, composed: true, detail: { item } })
    );
  }

  public limparSelecao(): void {
    this.itemSelecionado = null;
    this.indiceSelecionado = null;
    this.atualizarLinhasSelecionadas();
  }

  public isItemSelecionado(item: Record<string, any>, index: number): boolean {
    if (this.itemSelecionado) {
      if (this.itemSelecionado === item) return true;
      const chave = this.ctx.getChaveId();
      if (item[chave] !== undefined && this.itemSelecionado[chave] !== undefined) {
        return String(item[chave]) === String(this.itemSelecionado[chave]);
      }
      if (item.id !== undefined && this.itemSelecionado.id !== undefined) {
        return String(item.id) === String(this.itemSelecionado.id);
      }
    }
    if (this.indiceSelecionado !== null && this.indiceSelecionado === index) {
      return true;
    }
    return false;
  }

  public atualizarLinhasSelecionadas(): void {
    const tbody = this.ctx.getTbody();
    if (!tbody) return;
    const dados = this.ctx.getDadosExibicao();
    const rows = tbody.querySelectorAll('tr:not(.ui-tabela__virtual-spacer)');
    rows.forEach((tr) => {
      const idxAttr = tr.getAttribute('data-index');
      const rowIndex = idxAttr !== null ? parseInt(idxAttr, 10) : -1;
      const item = rowIndex >= 0 ? dados[rowIndex] : null;
      const isSelected = item ? this.isItemSelecionado(item, rowIndex) : false;

      tr.classList.toggle('ui-tabela__tr--selecionada', isSelected);
      alternarPart(tr, 'linha-selecionada', isSelected);
      if (isSelected) {
        tr.setAttribute('data-selecionada', 'true');
        tr.setAttribute('aria-current', 'true');
      } else {
        tr.removeAttribute('data-selecionada');
        tr.removeAttribute('aria-current');
      }
    });
  }

  public rolarPara(
    idOuIndice: string | number | ((item: any, index: number) => boolean),
    opcoes?: UIRowScrollOptions
  ): boolean {
    const dados = this.ctx.getDadosExibicao();
    const indice = localizarIndiceItem(dados, idOuIndice, this.ctx.getChaveId(), opcoes?.porIndice === true);
    if (indice === -1) {
      return false;
    }

    if (opcoes?.selecionar) {
      const item = dados[indice];
      this.itemSelecionado = item;
      this.indiceSelecionado = indice;
      this.atualizarLinhasSelecionadas();
      this.ctx.onLinhaAtiva(indice);
      this.ctx.host.dispatchEvent(
        new CustomEvent('ui-linha-selecionada', {
          bubbles: true,
          composed: true,
          detail: { item, indice }
        })
      );
    }

    return this.ctx.onRolarParaIndice(indice, opcoes?.comportamento || 'smooth');
  }
}
