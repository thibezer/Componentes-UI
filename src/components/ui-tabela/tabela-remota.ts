/**
 * Gerenciador de requisições remotas para <ui-tabela> (endpoint JSON)
 */
import type { TabelaFetcher, UIFetchErroDetail } from './tipos';

export interface ContextoTabelaRemota {
  host: HTMLElement;
  onCarregandoAlterado: (carregando: boolean) => void;
  onDadosRecebidos: (dados: Record<string, any>[]) => void;
  /** Opções do fetch (headers, credentials, method...); lidas a cada requisição. */
  getOpcoes?: () => RequestInit | null | undefined;
  /** Função de busca alternativa; padrão: `fetch` global. */
  getFetcher?: () => TabelaFetcher | null | undefined;
}

export class TabelaRemotaController {
  private autoFetchController: AbortController | null = null;
  private emVoo: { url: string; promessa: Promise<boolean> } | null = null;

  constructor(private ctx: ContextoTabelaRemota) {}

  /**
   * Busca os dados. Resolve `true` em sucesso e `false` em falha, cancelamento ou requisição
   * substituída (nunca rejeita; o motivo da falha vai no evento `ui-fetch-erro`).
   * Uma chamada com a mesma URL de uma requisição em andamento reaproveita essa requisição.
   */
  public carregar(endpoint: string): Promise<boolean> {
    if (!endpoint) return Promise.resolve(false);
    if (this.emVoo && this.emVoo.url === endpoint && this.autoFetchController) return this.emVoo.promessa;

    this.cancelarEmVoo();
    const controller = new AbortController();
    this.autoFetchController = controller;
    const promessa = this.executar(endpoint, controller);
    this.emVoo = { url: endpoint, promessa };
    return promessa;
  }

  private emitir<T>(nome: string, detail: T) {
    this.ctx.host.dispatchEvent(new CustomEvent<T>(nome, { bubbles: true, composed: true, detail }));
  }

  private erro(endpoint: string, erro: unknown, origem: UIFetchErroDetail['origem'], status?: number) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error('[ui-tabela] Erro ao carregar dados remotos:', erro);
    const detail: UIFetchErroDetail = { url: endpoint, erro: mensagem, origem };
    if (status !== undefined) detail.status = status;
    this.emitir('ui-fetch-erro', detail);
  }

  private async executar(endpoint: string, controller: AbortController): Promise<boolean> {
    const atual = () => this.autoFetchController === controller;
    const encerrar = () => {
      if (this.autoFetchController === controller) {
        this.autoFetchController = null;
        this.emVoo = null;
      }
    };

    this.ctx.onCarregandoAlterado(true);
    this.emitir('ui-fetch-start', { url: endpoint });

    let origem: UIFetchErroDetail['origem'] = 'rede';
    let status: number | undefined;
    try {
      const init: RequestInit = { ...(this.ctx.getOpcoes?.() ?? {}), signal: controller.signal };
      const buscar: TabelaFetcher = this.ctx.getFetcher?.() ?? ((u, i) => fetch(u, i));
      const resposta = await buscar(endpoint, init);
      if (!resposta.ok) {
        origem = 'http';
        status = resposta.status;
        throw new Error(`HTTP ${resposta.status}: ${resposta.statusText}`);
      }
      origem = 'json';
      const json = await resposta.json();
      const bruto = Array.isArray(json) ? json : (json?.dados || json?.items || json?.data || json?.rows || []);
      const listaDados: Record<string, any>[] = Array.isArray(bruto) ? bruto : [];

      if (!atual()) return false;
      origem = 'render';
      this.ctx.onDadosRecebidos(listaDados);
      encerrar();
      this.ctx.onCarregandoAlterado(false);
      this.emitir('ui-fetch-sucesso', { url: endpoint, total: listaDados.length, dados: listaDados });
      return true;
    } catch (erro: any) {
      if (erro?.name === 'AbortError') {
        if (atual()) {
          // abortado por fora (ex.: timeout do fetcher): não deixa o spinner preso
          encerrar();
          this.ctx.onCarregandoAlterado(false);
        }
        this.emitir('ui-fetch-cancelado', { url: endpoint });
        return false;
      }
      if (atual()) {
        encerrar();
        this.ctx.onCarregandoAlterado(false);
        this.erro(endpoint, erro, origem, status);
      }
      return false;
    }
  }

  /** Cancela a requisição em andamento (se houver) e libera o indicador de carregamento. */
  public abortar(): void {
    if (!this.autoFetchController) return;
    this.cancelarEmVoo();
    this.ctx.onCarregandoAlterado(false);
  }

  private cancelarEmVoo(): void {
    if (this.autoFetchController) {
      const controller = this.autoFetchController;
      this.autoFetchController = null;
      this.emVoo = null;
      controller.abort();
    }
  }
}
