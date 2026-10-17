/* ====================================================
   UI Camadas - Lembrança de estado do painel
   Responsabilidade única: guardar o que mudou desde a carga (origens e camadas removidas) e gravar/ler o
   estado persistido (localStorage) com debounce. O formato do storage fica em camadas-persistencia.ts.
   ==================================================== */

import type { CamadaItem } from './tipos';
import {
  gerarChaveStorage,
  carregarEstadoPersistido,
  snapshotCamada,
  salvarEstadoPersistido,
  montarEstadoPersistido,
  limparEstadoPersistido,
  reidratarCamadasComOverrides,
  type CamadaPropsPersistidas,
  type EstadoPersistidoCamadas as EstadoPersistido
} from './camadas-persistencia';
import { debounce } from './camadas-utils';

/** Leitura do estado atual do painel no momento de gravar. */
export interface InstantaneoPainel {
  persistir: boolean;
  conectado: boolean;
  storageKey: string | null;
  id: string;
  camadas: CamadaItem[];
  expandedLayers: Set<string>;
  camadaAtivaId: string | null;
  painelColapsado: boolean;
  mapaBaseAtivo: string;
  densidade: 'compacto' | 'normal';
  altura: number | null;
}

export class LembrancaCamadas {
  private origens = new Map<string, CamadaPropsPersistidas>();
  private removidas = new Set<string>();
  private salvarComDebounce = debounce(() => this.salvar(), 200);

  constructor(private instantaneo: () => InstantaneoPainel) {}

  public chaveAtual(): string {
    const i = this.instantaneo();
    return gerarChaveStorage(i.storageKey, i.id);
  }

  public carregar(): EstadoPersistido | null {
    return carregarEstadoPersistido(this.chaveAtual());
  }

  /** Versão com debounce, para interações contínuas (seletor de cor, slider de opacidade). */
  public agendar(): void {
    this.salvarComDebounce();
  }

  public salvar(): void {
    const i = this.instantaneo();
    // Antes de conectar, atributos como storage-key/id ainda podem não ter sido lidos
    if (!i.persistir || !i.conectado) return;

    const chave = this.chaveAtual();
    const estado = montarEstadoPersistido({
      estadoAnterior: carregarEstadoPersistido(chave),
      origensCamadas: this.origens,
      camadas: i.camadas,
      expandedLayers: i.expandedLayers,
      camadaAtivaId: i.camadaAtivaId,
      painelColapsado: i.painelColapsado,
      mapaBaseAtivo: i.mapaBaseAtivo,
      densidade: i.densidade,
      altura: i.altura,
      camadasRemovidas: this.removidas
    });
    this.removidas.clear();
    salvarEstadoPersistido(chave, estado);
  }

  public limpar(): void {
    limparEstadoPersistido(this.chaveAtual());
  }

  // --- Origens (como a camada chegou do consumidor) e remoções ---

  public limparOrigens(): void {
    this.origens.clear();
  }

  public registrarOrigem(camada: CamadaItem): void {
    this.origens.set(camada.id, snapshotCamada(camada));
  }

  public esquecerCamada(camadaId: string): void {
    this.origens.delete(camadaId);
    this.removidas.add(camadaId);
  }

  /** Aplica por cima de `camadas` o que foi lembrado (expansão, visibilidade, travas, opacidade, cor, ordem). */
  public reidratar(camadas: CamadaItem[], estado: EstadoPersistido | null, expandedLayers: Set<string>): void {
    reidratarCamadasComOverrides(camadas, estado, expandedLayers, this.origens);
  }
}
