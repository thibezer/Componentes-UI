/* ====================================================
   UI Camadas - Contrato do Host
   Superfície mínima que os módulos de eventos e de
   sincronização de DOM precisam do componente <ui-camadas>
   ==================================================== */

import { UICamadasHost } from './camadas-drag-drop';

export interface CamadasHostCompleto extends UICamadasHost {
  expandedLayers: Set<string>;
  selectedFeatureIds: Set<string>;
  lastClickedFeatureId: string | null;
  activeSettingsLayerId: string | null;
  searchQuery: string;
  salvarLembrancaEstado(): void;
  readonly camadaAtivaId: string | null;
  readonly mapaBaseAtivo: string;
  definirCamadaAtiva(camadaId: string, emitirEvento?: boolean): void;
  selecionarMapaBase(id: string): void;
  selecionarFeicao(feicaoId: string, acumular?: boolean, intervalo?: boolean): void;
  limparSelecao(emitirEvento?: boolean): void;
  notificarMudancaSelecao(): void;
  alternarVisibilidadeTodas(): void;
  expandirTodas(): void;
  colapsarTodas(): void;
  removerCamada(camadaId: string): void;
  sincronizarSelecaoDOM(): void;
  aplicarFiltroBuscaDOM(query: string): void;
}
