/**
 * Gerenciador de requisições remotas para <ui-tabela> (endpoint JSON)
 */
export interface ContextoTabelaRemota {
  host: HTMLElement;
  onCarregandoAlterado: (carregando: boolean) => void;
  onDadosRecebidos: (dados: Record<string, any>[]) => void;
}

export class TabelaRemotaController {
  private autoFetchController: AbortController | null = null;

  constructor(private ctx: ContextoTabelaRemota) {}

  public async carregar(endpoint: string): Promise<void> {
    if (!endpoint) return;

    if (this.autoFetchController) {
      this.autoFetchController.abort();
      this.autoFetchController = null;
    }

    const controller = new AbortController();
    this.autoFetchController = controller;

    this.ctx.onCarregandoAlterado(true);
    this.ctx.host.dispatchEvent(
      new CustomEvent('ui-fetch-start', {
        bubbles: true,
        composed: true,
        detail: { url: endpoint }
      })
    );

    try {
      const resposta = await fetch(endpoint, { signal: controller.signal });
      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}: ${resposta.statusText}`);
      }
      const json = await resposta.json();
      const listaDados = Array.isArray(json) ? json : (json.dados || json.items || json.data || json.rows || []);

      if (this.autoFetchController === controller) {
        this.ctx.onDadosRecebidos(listaDados);
        this.ctx.onCarregandoAlterado(false);
        this.autoFetchController = null;

        this.ctx.host.dispatchEvent(
          new CustomEvent('ui-fetch-sucesso', {
            bubbles: true,
            composed: true,
            detail: { url: endpoint, total: listaDados.length, dados: listaDados }
          })
        );
      }
    } catch (erro: any) {
      if (erro.name === 'AbortError') {
        return;
      }
      if (this.autoFetchController === controller) {
        this.ctx.onCarregandoAlterado(false);
        this.autoFetchController = null;
        console.error('[ui-tabela] Erro ao carregar dados remotos:', erro);
        this.ctx.host.dispatchEvent(
          new CustomEvent('ui-fetch-erro', {
            bubbles: true,
            composed: true,
            detail: { url: endpoint, erro: erro.message || String(erro) }
          })
        );
      }
    }
  }

  public abortar(): void {
    if (this.autoFetchController) {
      this.autoFetchController.abort();
      this.autoFetchController = null;
    }
  }
}
