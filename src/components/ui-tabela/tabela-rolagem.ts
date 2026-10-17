/**
 * Rolagem e foco de linhas da <ui-tabela>, inclusive com a janela virtual.
 * Responsabilidade única: posicionar uma linha na área visível (abaixo do cabeçalho fixo) rolando só o container,
 * nunca a página, e focar a linha renderizando a janela virtual quando preciso.
 */

/** Acesso ao que a rolagem precisa da tabela; tudo é lido na hora (os elementos são recriados). */
export interface PortasRolagem {
  container: () => HTMLElement | null;
  tbody: () => HTMLElement | null;
  cabecalho: () => HTMLElement | null;
  alturaLinha: () => number;
  /** Renderiza a janela virtual (síncrono). */
  renderizarCorpo: () => void;
  /** A linha ativa (tabindex 0) mudou para `indice`. */
  aoLinhaAtiva: (indice: number) => void;
}

/** Tempo máximo esperando o `scrollend` da rolagem suave antes de forçar a chegada. */
export const TEMPO_LIMITE_ROLAGEM_SUAVE_MS = 800;

/**
 * Quanto o container precisa rolar para a linha ficar inteira na área útil: abaixo do cabeçalho
 * fixo e acima da barra de rolagem horizontal. 0 = já visível. Linha maior que a área alinha pelo topo.
 */
export function deslocamentoAteLinha(container: HTMLElement, tr: HTMLElement, alturaCabecalho: number): number {
  const caixa = container.getBoundingClientRect();
  const linha = tr.getBoundingClientRect();
  const topoUtil = caixa.top + container.clientTop + alturaCabecalho;
  const baseUtil = caixa.top + container.clientTop + container.clientHeight;
  if (linha.top < topoUtil) return linha.top - topoUtil;
  if (linha.bottom > baseUtil) return Math.min(linha.bottom - baseUtil, linha.top - topoUtil);
  return 0;
}

/** Rola só o container da tabela (nunca a página, ao contrário de `scrollIntoView`). */
export function rolarContainer(container: HTMLElement, topo: number, comportamento: 'smooth' | 'auto'): void {
  if (comportamento === 'smooth' && typeof container.scrollTo === 'function') {
    container.scrollTo({ top: topo, behavior: 'smooth' });
  } else {
    container.scrollTop = topo;
  }
}

export class RolagemLinhas {
  private cancelarCorrecao: (() => void) | null = null;

  constructor(private p: PortasRolagem) {}

  private alturaCabecalho(): number {
    return this.p.cabecalho()?.offsetHeight ?? 0;
  }

  /** Linhas inteiras que cabem na área visível (mínimo 1). */
  public linhasPorPagina(): number {
    const visivel = (this.p.container()?.clientHeight ?? 0) - this.alturaCabecalho();
    return Math.max(1, Math.floor(visivel / this.p.alturaLinha()));
  }

  /** Foca a linha, renderizando a janela virtual se necessário, e a mantém visível abaixo do cabeçalho fixo. */
  public focar(indice: number): void {
    const container = this.p.container();
    const tbody = this.p.tbody();
    if (!container || !tbody) return;

    this.p.aoLinhaAtiva(indice);
    const seletor = `tr[data-index="${indice}"]`;
    let tr = tbody.querySelector<HTMLElement>(seletor);
    if (!tr) {
      container.scrollTop = Math.max(0, indice * this.p.alturaLinha() - container.clientHeight / 2);
      this.p.renderizarCorpo();
      tr = tbody.querySelector<HTMLElement>(seletor);
    }
    if (!tr) return;

    tr.focus({ preventScroll: true });
    const delta = deslocamentoAteLinha(container, tr, this.alturaCabecalho());
    if (delta) container.scrollTop += delta;
  }

  /**
   * Posiciona a linha exibida `indice` na área visível.
   * Fora da janela virtual, rola até a posição estimada, renderiza a janela e corrige pela posição
   * real da linha. No modo suave a correção ocorre ao fim da animação (`scrollend`, com timeout de
   * segurança para navegadores sem o evento ou quando não há rolagem a fazer).
   */
  public posicionar(indice: number, comportamento: 'smooth' | 'auto'): boolean {
    const container = this.p.container();
    const tbody = this.p.tbody();
    if (!container || !tbody) return false;

    this.cancelar();
    const buscarLinha = () => tbody.querySelector<HTMLElement>(`tr[data-index="${indice}"]`);
    const corrigir = (modo: 'smooth' | 'auto') => {
      const tr = buscarLinha();
      if (!tr) return;
      const delta = deslocamentoAteLinha(container, tr, this.alturaCabecalho());
      if (delta) rolarContainer(container, container.scrollTop + delta, modo);
    };

    if (buscarLinha()) {
      corrigir(comportamento);
      return true;
    }

    const saltar = () => {
      container.scrollTop = Math.max(0, indice * this.p.alturaLinha());
      this.p.renderizarCorpo();
      corrigir('auto');
      this.p.renderizarCorpo();
    };
    if (comportamento === 'auto') {
      saltar();
      return true;
    }

    rolarContainer(container, Math.max(0, indice * this.p.alturaLinha()), 'smooth');
    let pendente = true;
    const finalizar = () => {
      if (!pendente) return;
      this.cancelar();
      this.p.renderizarCorpo();
      // Animação interrompida ou não executada (aba oculta, outro scroll): garante a chegada
      if (buscarLinha()) corrigir('smooth');
      else saltar();
    };
    const timer = window.setTimeout(finalizar, TEMPO_LIMITE_ROLAGEM_SUAVE_MS);
    container.addEventListener('scrollend', finalizar, { once: true });
    this.cancelarCorrecao = () => {
      pendente = false;
      window.clearTimeout(timer);
      container.removeEventListener('scrollend', finalizar);
      this.cancelarCorrecao = null;
    };
    return true;
  }

  /** Cancela a correção pendente de uma rolagem suave (nova rolagem, desconexão). */
  public cancelar(): void {
    this.cancelarCorrecao?.();
  }
}
