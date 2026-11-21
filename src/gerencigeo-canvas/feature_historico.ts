/*
 * Histórico de desfazer/refazer por instantâneos (L2, puro, genérico). Serve à prancha e a qualquer editor do kit: guarda
 * o estado ANTES de cada mudança e devolve estados inteiros, então desfazer e refazer são determinísticos (mesma sequência
 * de chamadas = mesmos estados). Os estados devem ser imutáveis (o histórico não copia: guarda a referência).
 *
 * Rajadas: mudanças seguidas com a mesma `chave` (ex.: arrastar o scrubber da espessura, digitar no mesmo campo, setas
 * movendo a seleção) dentro de `janelaRajadaMs` viram UM passo. O tempo é injetado (`agora`), para teste e reprodução.
 */

export interface OpcoesHistorico {
  /** Máximo de passos guardados (padrão 100; mínimo 1). Os mais antigos saem primeiro. */
  limite?: number;
  /** Intervalo máximo entre mudanças da mesma chave para juntá-las num passo (padrão 1000 ms). */
  janelaRajadaMs?: number;
}

export interface OpcoesRegistro {
  /** Mudanças seguidas com a mesma chave, dentro da janela, viram um passo só. */
  chave?: string;
  /** Instante da mudança em ms (padrão `Date.now()`). */
  agora?: number;
}

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export class Historico<T> {
  private desfazeres: T[] = [];
  private refazeres: T[] = [];
  private readonly limite: number;
  private readonly janela: number;
  private ultimaChave: string | null = null;
  private ultimoInstante = -Infinity;

  constructor(opcoes: OpcoesHistorico = {}) {
    this.limite = fin(opcoes.limite) && opcoes.limite >= 1 ? Math.floor(opcoes.limite) : 100;
    this.janela = fin(opcoes.janelaRajadaMs) && opcoes.janelaRajadaMs >= 0 ? opcoes.janelaRajadaMs : 1000;
  }

  public get podeDesfazer(): boolean {
    return this.desfazeres.length > 0;
  }

  public get podeRefazer(): boolean {
    return this.refazeres.length > 0;
  }

  public get passos(): number {
    return this.desfazeres.length;
  }

  /**
   * Registra uma mudança: `antes` é o estado anterior a ela. Devolve `true` se abriu um passo novo e `false` se a mudança
   * entrou na rajada do passo anterior. Qualquer registro apaga o que havia para refazer.
   */
  public registrar(antes: T, opcoes: OpcoesRegistro = {}): boolean {
    const agora = fin(opcoes.agora) ? opcoes.agora : Date.now();
    const chave = typeof opcoes.chave === 'string' && opcoes.chave ? opcoes.chave : null;
    const naRajada = chave !== null && chave === this.ultimaChave && agora - this.ultimoInstante <= this.janela
      && agora >= this.ultimoInstante && this.desfazeres.length > 0;
    this.refazeres = [];
    this.ultimaChave = chave;
    this.ultimoInstante = agora;
    if (naRajada) return false;
    this.desfazeres.push(antes);
    if (this.desfazeres.length > this.limite) this.desfazeres.splice(0, this.desfazeres.length - this.limite);
    return true;
  }

  /** Volta um passo: recebe o estado atual (que vai para o refazer) e devolve o anterior, ou `null` se não há. */
  public desfazer(atual: T): T | null {
    const anterior = this.desfazeres.pop();
    if (anterior === undefined) return null;
    this.refazeres.push(atual);
    this.encerrarRajada();
    return anterior;
  }

  /** Refaz um passo: recebe o estado atual (que volta para o desfazer) e devolve o seguinte, ou `null` se não há. */
  public refazer(atual: T): T | null {
    const proximo = this.refazeres.pop();
    if (proximo === undefined) return null;
    this.desfazeres.push(atual);
    this.encerrarRajada();
    return proximo;
  }

  /** Fecha a rajada em andamento: a próxima mudança, mesmo com a mesma chave, abre um passo novo. */
  public encerrarRajada(): void {
    this.ultimaChave = null;
    this.ultimoInstante = -Infinity;
  }

  /**
   * Reescreve todos os estados guardados (desfazer e refazer) com `fn`. Serve para trocar uma referência estável em todo o
   * histórico (ex.: o app troca o id provisório de um elemento) sem perder os passos.
   */
  public transformar(fn: (estado: T) => T): void {
    this.desfazeres = this.desfazeres.map(fn);
    this.refazeres = this.refazeres.map(fn);
  }

  public limpar(): void {
    this.desfazeres = [];
    this.refazeres = [];
    this.encerrarRajada();
  }
}
