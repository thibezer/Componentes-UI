/* ====================================================
   UI Camadas - Contrato do Host
   Superfície mínima que os módulos de eventos e de
   sincronização de DOM precisam do componente <ui-camadas>
   ==================================================== */

import { UICamadasHost } from './camadas-drag-drop';

export interface CamadasHostCompleto extends UICamadasHost {
  expandedLayers: Set<string>;
  expandedFeatureLimits: Map<string, number>;
  selectedFeatureIds: Set<string>;
  lastClickedFeatureId: string | null;
  activeSettingsLayerId: string | null;
  searchQuery: string;
  readonly titulo: string;
  readonly mostrarBusca: boolean;
  salvarLembrancaEstado(): void;
  agendarSalvarLembranca(): void;
  colapsar(emitirEvento?: boolean): void;
  readonly camadaAtivaId: string | null;
  readonly mapaBaseAtivo: string;
  definirCamadaAtiva(camadaId: string, emitirEvento?: boolean): void;
  selecionarMapaBase(id: string, emitirEvento?: boolean): void;
  alternarMapasBaseRecolhido(emitirEvento?: boolean): void;
  selecionarFeicao(
    feicaoId: string,
    acumular?: boolean,
    intervalo?: boolean,
    emitirEvento?: boolean
  ): void;
  selecionarFeicoes(ids: string[], emitirEvento?: boolean): void;
  limparSelecao(emitirEvento?: boolean): void;
  notificarMudancaSelecao(): void;
  alternarVisibilidadeTodas(emitirEvento?: boolean): void;
  alternarExpansao(camadaId: string): void;
  incrementarLimiteFeicoes(camadaId: string): void;
  expandirTodas(): void;
  colapsarTodas(): void;
  removerCamada(camadaId: string): void;
  sincronizarSelecaoDOM(): void;
}
