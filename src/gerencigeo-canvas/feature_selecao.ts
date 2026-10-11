import type { Feicao } from './feature_types';

/*
 * Estado de seleção de feições (única e múltipla), independente do Leaflet.
 * Regra de notificação:
 *  - `aoSelecionar(lista)` dispara sempre que a seleção muda;
 *  - `aoSelecionarUma(feicao | null)` só quando há no máximo uma feição, para a UI
 *    (HUD, painel) não colapsar para a primeira de uma seleção múltipla.
 */

export interface RefFeicao {
  camadaId: string;
  id: string;
}

interface Dependencias {
  obterFeicao: (ref: RefFeicao) => Feicao | undefined;
  /** Aplica o visual: `ids` são todas as feições selecionadas daquela camada (vazio = nenhuma). */
  aplicarVisual: (camadaId: string, ids: Set<string>) => void;
  aoSelecionar: (feicoes: Feicao[]) => void;
  aoSelecionarUma: (feicao: Feicao | null) => void;
  /** Feição escondida (ex.: prévia oculta) deixa de poder ficar selecionada. */
  visivel?: (feicao: Feicao) => boolean;
  /** Feição que nunca pode ser selecionada (ex.: oculta), nem por referência explícita. */
  selecionavel?: (feicao: Feicao) => boolean;
}

const chave = (r: RefFeicao): string => `${r.camadaId}\u0000${r.id}`;

export class SelecaoFeicoes {
  private itens = new Map<string, RefFeicao>();

  constructor(private dep: Dependencias) {}

  public get quantidade(): number {
    return this.itens.size;
  }

  public contem(ref: RefFeicao): boolean {
    return this.itens.has(chave(ref));
  }

  public obter(): Feicao[] {
    const lista: Feicao[] = [];
    for (const ref of this.itens.values()) {
      const f = this.dep.obterFeicao(ref);
      if (f) lista.push(f);
    }
    return lista;
  }

  /** Seleciona as feições; sem `aditivo`, substitui a seleção atual. */
  public selecionar(refs: RefFeicao[], aditivo = false): void {
    const antes = this.assinatura();
    const afetadas = new Set<string>();
    if (!aditivo) this.itens.forEach((r) => afetadas.add(r.camadaId));
    if (!aditivo) this.itens.clear();
    for (const r of refs) {
      if (!this.alcancavel(r)) continue;
      this.itens.set(chave(r), { camadaId: r.camadaId, id: r.id });
      afetadas.add(r.camadaId);
    }
    this.finalizar(antes, afetadas);
  }

  /** Alterna uma feição na seleção (Ctrl/Shift+clique). */
  public alternar(ref: RefFeicao): void {
    const antes = this.assinatura();
    const k = chave(ref);
    if (this.itens.has(k)) this.itens.delete(k);
    else if (this.alcancavel(ref)) this.itens.set(k, { camadaId: ref.camadaId, id: ref.id });
    this.finalizar(antes, new Set([ref.camadaId]));
  }

  /** Alterna várias de uma vez (caixa de seleção com Ctrl). */
  public alternarVarias(refs: RefFeicao[]): void {
    const antes = this.assinatura();
    const afetadas = new Set<string>();
    for (const r of refs) {
      const k = chave(r);
      if (this.itens.has(k)) this.itens.delete(k);
      else if (this.alcancavel(r)) this.itens.set(k, { camadaId: r.camadaId, id: r.id });
      afetadas.add(r.camadaId);
    }
    this.finalizar(antes, afetadas);
  }

  /** A feição existe e pode ser selecionada? */
  private alcancavel(ref: RefFeicao): boolean {
    const f = this.dep.obterFeicao(ref);
    return !!f && (!this.dep.selecionavel || this.dep.selecionavel(f));
  }

  public limpar(): void {
    if (this.itens.size === 0) return;
    const antes = this.assinatura();
    const afetadas = new Set([...this.itens.values()].map((r) => r.camadaId));
    this.itens.clear();
    this.finalizar(antes, afetadas);
  }

  /** Descarta da seleção o que deixou de existir (removida, excluída, camada sumiu). */
  public reconciliar(): void {
    const antes = this.assinatura();
    const afetadas = new Set<string>();
    for (const [k, r] of this.itens) {
      const f = this.dep.obterFeicao(r);
      if (!f || f.excluida || (this.dep.visivel && !this.dep.visivel(f))) {
        this.itens.delete(k);
        afetadas.add(r.camadaId);
      }
    }
    if (afetadas.size === 0) {
      // feição atualizada: o chamador pode querer reabrir o popup, então notifica mesmo sem mudar ids
      return;
    }
    this.finalizar(antes, afetadas);
  }

  private assinatura(): string {
    return [...this.itens.keys()].join('|');
  }

  private finalizar(antes: string, camadas: Set<string>): void {
    for (const camadaId of camadas) {
      const ids = new Set<string>();
      for (const r of this.itens.values()) if (r.camadaId === camadaId) ids.add(r.id);
      this.dep.aplicarVisual(camadaId, ids);
    }
    if (this.assinatura() === antes) return;

    const lista = this.obter();
    this.dep.aoSelecionar(lista);
    if (lista.length <= 1) this.dep.aoSelecionarUma(lista[0] ?? null);
  }
}
