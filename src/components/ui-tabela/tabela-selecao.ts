import type { ModoSelecaoTabela, UIRowScrollOptions, UISelecaoAlteradaDetail, UISelecaoRemovidaDetail } from './tipos';
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
  private modo: ModoSelecaoTabela = 'unica';
  private itensSelecionadosLista: Record<string, any>[] = [];
  private indicesSelecionadosLista: (number | null)[] = [];
  private itensSelecionadosSet = new Set<Record<string, any>>();
  private indicesSelecionadosSet = new Set<number>();
  private chavesSelecionadasSet = new Set<string>();
  private linhasMarcadas = new Set<HTMLTableRowElement>();

  constructor(private ctx: ContextoTabelaSelecao) {}

  /** Reconstrói os índices de busca rápida O(1) a partir das listas atuais. */
  private reconstruirSets(): void {
    this.itensSelecionadosSet.clear();
    this.indicesSelecionadosSet.clear();
    this.chavesSelecionadasSet.clear();
    const chave = this.ctx.getChaveId();

    for (let i = 0; i < this.itensSelecionadosLista.length; i++) {
      const item = this.itensSelecionadosLista[i];
      this.itensSelecionadosSet.add(item);
      const valChave = item[chave] ?? item.id;
      if (valChave != null) this.chavesSelecionadasSet.add(String(valChave));
      const idx = this.indicesSelecionadosLista[i];
      if (idx !== null && idx !== undefined) this.indicesSelecionadosSet.add(idx);
    }
  }

  /** Mesmo objeto ou mesmo valor na chave configurada. */
  private indiceDoItem(dados: Record<string, any>[], item: Record<string, any>): number {
    const chave = this.ctx.getChaveId();
    const idx = dados.indexOf(item);
    if (idx >= 0) return idx; // identidade primeiro: chaves repetidas não desviam a seleção
    if (item[chave] == null) return -1; // sem chave (undefined/null) só vale a identidade
    return dados.findIndex((d) => d?.[chave] != null && String(d[chave]) === String(item[chave]));
  }

  private mesmoRegistro(a: Record<string, any>, b: Record<string, any>): boolean {
    if (a === b) return true;
    const chave = this.ctx.getChaveId();
    if (a[chave] != null && b[chave] != null) return String(a[chave]) === String(b[chave]);
    if (a.id != null && b.id != null) return String(a.id) === String(b.id);
    return false;
  }

  public getModo(): ModoSelecaoTabela {
    return this.modo;
  }

  public setModo(novoModo: ModoSelecaoTabela): void {
    const normalizado: ModoSelecaoTabela = novoModo === 'multipla' ? 'multipla' : 'unica';
    if (this.modo === normalizado) return;
    this.modo = normalizado;
    if (normalizado === 'unica' && this.itensSelecionadosLista.length > 1) {
      this.itensSelecionadosLista = [this.itensSelecionadosLista[0]];
      this.indicesSelecionadosLista = [this.indicesSelecionadosLista[0]];
      this.reconstruirSets();
      this.atualizarLinhasSelecionadas();
      this.emitirSelecaoAlterada();
    }
  }

  public getItemSelecionado(): Record<string, any> | null {
    return this.itensSelecionadosLista[0] ?? null;
  }

  public setItemSelecionado(item: Record<string, any> | null): void {
    if (!item) {
      this.itensSelecionadosLista = [];
      this.indicesSelecionadosLista = [];
    } else {
      const indice = this.indiceDoItem(this.ctx.getDadosExibicao(), item);
      this.itensSelecionadosLista = [item];
      this.indicesSelecionadosLista = [indice >= 0 ? indice : null];
    }
    this.reconstruirSets();
    this.atualizarLinhasSelecionadas();
  }

  public getIndiceSelecionado(): number | null {
    return this.indicesSelecionadosLista[0] ?? null;
  }

  public setIndiceSelecionado(idx: number | null): void {
    const dados = this.ctx.getDadosExibicao();
    const valido = idx !== null && idx >= 0 && idx < dados.length;
    if (valido) {
      this.itensSelecionadosLista = [dados[idx!]];
      this.indicesSelecionadosLista = [idx!];
    } else {
      this.itensSelecionadosLista = [];
      this.indicesSelecionadosLista = [];
    }
    this.reconstruirSets();
    this.atualizarLinhasSelecionadas();
  }

  public getItensSelecionados(): Record<string, any>[] {
    return [...this.itensSelecionadosLista];
  }

  public setItensSelecionados(itens: Record<string, any>[]): void {
    const lista = Array.isArray(itens) ? itens.filter((it) => it != null) : [];
    const limitada = this.modo === 'unica' ? lista.slice(0, 1) : lista;
    const exibidos = this.ctx.getDadosExibicao();
    this.itensSelecionadosLista = [];
    this.indicesSelecionadosLista = [];

    for (const item of limitada) {
      if (this.itensSelecionadosLista.some((existente) => this.mesmoRegistro(existente, item))) continue;
      const idx = this.indiceDoItem(exibidos, item);
      this.itensSelecionadosLista.push(item);
      this.indicesSelecionadosLista.push(idx >= 0 ? idx : null);
    }
    this.reconstruirSets();
    this.atualizarLinhasSelecionadas();
  }

  public getIndicesSelecionados(): number[] {
    return this.indicesSelecionadosLista.filter((i): i is number => i !== null);
  }

  public setIndicesSelecionados(indices: number[]): void {
    const dados = this.ctx.getDadosExibicao();
    const lista = Array.isArray(indices)
      ? indices.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < dados.length)
      : [];
    const limitada = this.modo === 'unica' ? lista.slice(0, 1) : lista;
    const vistos = new Set<number>();

    this.itensSelecionadosLista = [];
    this.indicesSelecionadosLista = [];
    for (const idx of limitada) {
      if (vistos.has(idx)) continue;
      vistos.add(idx);
      this.itensSelecionadosLista.push(dados[idx]);
      this.indicesSelecionadosLista.push(idx);
    }
    this.reconstruirSets();
    this.atualizarLinhasSelecionadas();
  }

  /**
   * Trata interação do usuário (clique ou Enter/Espaço na linha).
   * No modo `unica`, seleciona o item; no modo `multipla`, alterna (toggle) o item.
   */
  public interagirComLinha(item: Record<string, any>, indiceExibido: number): void {
    if (this.modo === 'unica') {
      const jaEraUnico = this.itensSelecionadosLista.length === 1 && this.mesmoRegistro(this.itensSelecionadosLista[0], item);
      this.itensSelecionadosLista = [item];
      this.indicesSelecionadosLista = [indiceExibido];
      this.reconstruirSets();
      this.atualizarLinhasSelecionadas();
      if (!jaEraUnico) this.emitirSelecaoAlterada();
      return;
    }

    const posExistente = this.itensSelecionadosLista.findIndex((it) => this.mesmoRegistro(it, item));
    if (posExistente >= 0) {
      this.itensSelecionadosLista.splice(posExistente, 1);
      this.indicesSelecionadosLista.splice(posExistente, 1);
    } else {
      this.itensSelecionadosLista.push(item);
      this.indicesSelecionadosLista.push(indiceExibido);
    }
    this.reconstruirSets();
    this.atualizarLinhasSelecionadas();
    this.emitirSelecaoAlterada();
  }

  public selecionarTodos(): void {
    if (this.modo !== 'multipla') return;
    const dados = this.ctx.getDadosExibicao();
    this.itensSelecionadosLista = [...dados];
    this.indicesSelecionadosLista = dados.map((_, i) => i);
    this.reconstruirSets();
    this.atualizarLinhasSelecionadas();
    this.emitirSelecaoAlterada();
  }

  public limparSelecao(): void {
    const tinhaSelecao = this.itensSelecionadosLista.length > 0;
    this.itensSelecionadosLista = [];
    this.indicesSelecionadosLista = [];
    this.reconstruirSets();
    this.atualizarLinhasSelecionadas();
    if (tinhaSelecao) this.emitirSelecaoAlterada();
  }

  /**
   * Reaplica a seleção após ordenar, filtrar ou trocar os dados.
   * - Item ainda exibido: atualiza o índice (e a referência, se veio um objeto novo com a mesma chave).
   * - Item só escondido pelo filtro: mantém a seleção (sem índice) para reaparecer ao limpar o filtro.
   * - Item removido dos dados: limpa a seleção e emite `ui-selecao-removida`.
   */
  public reconciliar(): void {
    if (this.itensSelecionadosLista.length === 0) {
      this.indicesSelecionadosLista = [];
      this.reconstruirSets();
      return;
    }

    const exibidos = this.ctx.getDadosExibicao();
    const originais = this.ctx.getDadosOriginais();
    const novosItens: Record<string, any>[] = [];
    const novosIndices: (number | null)[] = [];
    const removidos: Record<string, any>[] = [];

    for (const item of this.itensSelecionadosLista) {
      const indice = this.indiceDoItem(exibidos, item);
      if (indice >= 0) {
        const atualizado = exibidos[indice];
        this.notificarSubstituicaoReferencia(item, atualizado);
        novosItens.push(atualizado);
        novosIndices.push(indice);
        continue;
      }
      const indiceOriginal = this.indiceDoItem(originais, item);
      if (indiceOriginal >= 0) {
        const atualizado = originais[indiceOriginal];
        this.notificarSubstituicaoReferencia(item, atualizado);
        novosItens.push(atualizado);
        novosIndices.push(null);
        continue;
      }
      removidos.push(item);
    }

    this.itensSelecionadosLista = novosItens;
    this.indicesSelecionadosLista = novosIndices;
    this.reconstruirSets();

    for (const removido of removidos) {
      this.ctx.host.dispatchEvent(
        new CustomEvent<UISelecaoRemovidaDetail>('ui-selecao-removida', {
          bubbles: true,
          composed: true,
          detail: { item: removido }
        })
      );
    }
    if (removidos.length > 0) {
      this.emitirSelecaoAlterada();
    }
  }

  /** Mesmo registro com outro objeto (dados recarregados): avisa consumidores. */
  private notificarSubstituicaoReferencia(antigo: Record<string, any>, novo: Record<string, any>): void {
    if (antigo === novo) return;
    this.ctx.host.dispatchEvent(
      new CustomEvent('ui-selecao-atualizada', { bubbles: true, composed: true, detail: { item: novo, anterior: antigo } })
    );
  }

  private emitirSelecaoAlterada(): void {
    this.ctx.host.dispatchEvent(
      new CustomEvent<UISelecaoAlteradaDetail>('ui-selecao-alterada', {
        bubbles: true,
        composed: true,
        detail: {
          itens: this.getItensSelecionados(),
          indices: this.getIndicesSelecionados(),
          modo: this.modo
        }
      })
    );
  }

  public isItemSelecionado(item: Record<string, any>, index: number): boolean {
    if (this.itensSelecionadosLista.length === 0) return false;
    if (this.itensSelecionadosSet.has(item)) return true;
    const chave = this.ctx.getChaveId();
    const valChave = item[chave] ?? item.id;
    if (valChave != null && this.chavesSelecionadasSet.has(String(valChave))) return true;
    return this.indicesSelecionadosSet.has(index);
  }

  /** Registra linhas marcadas/desmarcadas durante a renderização do corpo para atualização cirúrgica posterior. */
  public registrarLinhaRenderizada(tr: HTMLTableRowElement, selecionada: boolean): void {
    if (selecionada) this.linhasMarcadas.add(tr);
    else this.linhasMarcadas.delete(tr);
  }

  private aplicarVisualLinha(tr: HTMLTableRowElement, selecionada: boolean): void {
    tr.classList.toggle('ui-tabela__tr--selecionada', selecionada);
    alternarPart(tr, 'linha-selecionada', selecionada);
    if (selecionada) {
      tr.setAttribute('data-selecionada', 'true');
      tr.setAttribute('aria-current', 'true');
      tr.setAttribute('aria-selected', 'true');
      this.linhasMarcadas.add(tr);
    } else {
      tr.removeAttribute('data-selecionada');
      tr.removeAttribute('aria-current');
      tr.setAttribute('aria-selected', 'false');
      this.linhasMarcadas.delete(tr);
    }
  }

  /**
   * Atualiza cirurgicamente apenas as linhas que perderam ou ganharam seleção no DOM,
   * sem varrer todas as `<tr>` do `tbody` com `querySelectorAll`.
   */
  public atualizarLinhasSelecionadas(): void {
    const tbody = this.ctx.getTbody();
    if (!tbody) return;
    const dados = this.ctx.getDadosExibicao();

    // 1. Desmarca apenas as linhas previamente marcadas que não estão mais selecionadas (ou desconectadas)
    for (const tr of Array.from(this.linhasMarcadas)) {
      if (!tr.isConnected || tr.parentElement !== tbody) {
        this.linhasMarcadas.delete(tr);
        continue;
      }
      const idxAttr = tr.getAttribute('data-index');
      const rowIndex = idxAttr !== null ? parseInt(idxAttr, 10) : -1;
      const item = rowIndex >= 0 ? dados[rowIndex] : null;
      const aindaSelecionada = item ? this.isItemSelecionado(item, rowIndex) : false;
      if (!aindaSelecionada) {
        this.aplicarVisualLinha(tr, false);
      }
    }

    if (this.indicesSelecionadosSet.size === 0) return;

    // 2. Determina a faixa de índices atualmente visível no tbody em O(1)
    let primeiroEl = tbody.firstElementChild;
    if (primeiroEl?.hasAttribute('data-espacador')) primeiroEl = primeiroEl.nextElementSibling;
    let ultimoEl = tbody.lastElementChild;
    if (ultimoEl?.hasAttribute('data-espacador')) ultimoEl = ultimoEl.previousElementSibling;

    const minAttr = primeiroEl?.getAttribute('data-index');
    const maxAttr = ultimoEl?.getAttribute('data-index');
    if (minAttr == null || maxAttr == null) return;
    const minIdx = parseInt(minAttr, 10);
    const maxIdx = parseInt(maxAttr, 10);
    if (!Number.isFinite(minIdx) || !Number.isFinite(maxIdx)) return;

    // 3. Marca apenas os índices selecionados que estão na janela renderizada e ainda não marcados
    for (const idx of this.indicesSelecionadosSet) {
      if (idx < minIdx || idx > maxIdx) continue;
      const tr = tbody.querySelector<HTMLTableRowElement>(`tr[data-index="${idx}"]`);
      if (tr && !this.linhasMarcadas.has(tr)) {
        this.aplicarVisualLinha(tr, true);
      }
    }
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
      if (this.modo === 'multipla') {
        if (!this.itensSelecionadosLista.some((it) => this.mesmoRegistro(it, item))) {
          this.itensSelecionadosLista.push(item);
          this.indicesSelecionadosLista.push(indice);
        }
      } else {
        this.itensSelecionadosLista = [item];
        this.indicesSelecionadosLista = [indice];
      }
      this.reconstruirSets();
      this.atualizarLinhasSelecionadas();
      this.ctx.onLinhaAtiva(indice);
      this.ctx.host.dispatchEvent(
        new CustomEvent('ui-linha-selecionada', {
          bubbles: true,
          composed: true,
          detail: { item, indice }
        })
      );
      this.emitirSelecaoAlterada();
    }

    return this.ctx.onRolarParaIndice(indice, opcoes?.comportamento || 'smooth');
  }
}
