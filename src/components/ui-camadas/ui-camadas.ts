/* ====================================================
   UI Camadas - Web Component Nativo W3C
   Painel de Camadas GIS/CAD de Alto Desempenho
   Hierarquia Vetorial e Edição Profissional
   ==================================================== */

import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ListenerBag } from '../../core/listener-bag';
import estilos from './ui-camadas.css?inline';
import {
  CamadaItem,
  FeicaoItem,
  MapaBaseItem,
  AbaPainelCamadas
} from './tipos';
import { renderizarPainel } from './camadas-render';
import { MAPAS_BASE_PADRAO } from './camadas-mapas-base';
import { CamadasDragDropManager } from './camadas-drag-drop';
import { CamadasHostCompleto } from './camadas-host';
import { cancelarArrasteControles } from './camadas-arraste-controles';
import { conectarTecladoEAcessibilidade } from './camadas-teclado';
import {
  sincronizarCamadaAtivaDOM,
  sincronizarSelecaoDOM
} from './camadas-sincronizacao-dom';
import {
  selecionarFeicaoNoHost,
  selecionarFeicoesNoHost,
  limparSelecaoNoHost,
  emitirEventosSelecao
} from './camadas-selecao-api';
import { ICONES } from './camadas-icones';
import { carregarEstadoPersistido } from './camadas-persistencia';
import { LembrancaCamadas } from './camadas-lembranca';
import {
  definirCamadasNoHost,
  definirFeicoesNoHost,
  adicionarCamadaNoHost,
  removerCamadaNoHost,
  adicionarFeicaoNoHost,
  atualizarFeicaoNoHost,
  removerFeicaoNoHost
} from './camadas-colecao';
import {
  criarControladorRedimensionamentoAltura,
  ControladorResizerCamadas
} from './camadas-resizer';

export class UICamadas extends SafeHTMLElement implements CamadasHostCompleto {
  static get observedAttributes() {
    return [
      'titulo',
      'mapa-base-ativo',
      'camada-ativa',
      'aba-ativa',
      'colapsavel',
      'colapsado',
      'flutuante',
      'mostrar-mapas-base',
      'mostrar-rodape',
      'mostrar-busca',
      'densidade',
      'persistir',
      'storage-key',
      'redimensionavel',
      'redimensionavel-altura',
      'altura',
      'min-altura',
      'max-altura'
    ];
  }

  private shadow: ShadowRoot;
  private listeners = new ListenerBag();
  private dragDropManager!: CamadasDragDropManager;
  private resizerController!: ControladorResizerCamadas;
  private alturaCustomizada: number | null = null;
  private conectado = false;
  private profundidadeLote = 0;
  private renderPendente = false;
  /** Painéis conectados sem `id` nem `storage-key`: dividem a mesma chave de persistência. */
  private static instanciasChavePadrao = new Set<UICamadas>();
  /** @internal */
  public readonly lembranca = new LembrancaCamadas(() => ({
    persistir: this.persistir,
    conectado: this.conectado,
    storageKey: this.storageKey,
    id: this.id,
    camadas: this.camadas,
    expandedLayers: this.expandedLayers,
    camadaAtivaId: this.camadaAtivaId,
    painelColapsado: this.colapsado,
    mapaBaseAtivo: this.mapaBaseAtivo,
    densidade: this.densidade,
    altura: this.alturaCustomizada
  }));

  // Estado interno
  public camadas: CamadaItem[] = [];
  public feicoes: FeicaoItem[] = [];
  public mapasBase: MapaBaseItem[] = [...MAPAS_BASE_PADRAO];

  public expandedLayers = new Set<string>();
  public selectedFeatureIds = new Set<string>();
  public lastClickedFeatureId: string | null = null;
  public activeSettingsLayerId: string | null = null;
  public editingLayerId: string | null = null;
  public editingFeatureId: string | null = null;
  public searchQuery: string = '';

  private corpoElement!: HTMLDivElement;
  private btnExpandirFlutuante!: HTMLButtonElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-camadas-container" id="panel-container" role="region" aria-label="Painel de Camadas">
        <div class="ui-camadas-corpo" id="painel-corpo"></div>
        <div class="ui-camadas-resizer-altura" id="resizer-altura" title="Arraste para redimensionar a altura (duplo-clique para resetar)" aria-label="Redimensionar altura">
          <span class="ui-camadas-resizer-grip"></span>
        </div>
      </div>
      <button class="ui-camadas-toggle-flutuante" id="btn-expandir-flutuante" title="Expandir Painel de Camadas" aria-label="Expandir Painel de Camadas">
        ${ICONES.camadas}
      </button>
    `;

    this.corpoElement = this.shadow.getElementById('painel-corpo') as HTMLDivElement;
    this.btnExpandirFlutuante = this.shadow.getElementById('btn-expandir-flutuante') as HTMLButtonElement;
    this.dragDropManager = new CamadasDragDropManager(this, this.shadow);

    const resizerEl = this.shadow.getElementById('resizer-altura');
    this.resizerController = criarControladorRedimensionamentoAltura({
      hostElement: this,
      resizerElement: resizerEl,
      listeners: this.listeners,
      getMinAltura: () => {
        const minAttr = this.getAttribute('min-altura');
        return minAttr ? parseFloat(minAttr) || 140 : 140;
      },
      getMaxAltura: () => {
        const maxAttr = this.getAttribute('max-altura');
        return maxAttr ? parseFloat(maxAttr) || 1600 : 1600;
      },
      onAlturaAlterada: (novaAltura) => {
        this.alturaCustomizada = novaAltura;
        this.salvarLembrancaEstado();
      }
    });
  }

  connectedCallback() {
    // Reidratação de estado preliminar (colapso do painel, mapa base, densidade, altura)
    if (this.persistir) {
      const estado = carregarEstadoPersistido(this.obterChaveStorageAtual());
      if (estado) {
        // O atributo declarado pelo autor vence o estado salvo (mesma regra dos demais campos)
        if (estado.painelColapsado === true && !this.hasAttribute('colapsado')) {
          this.colapsado = true;
        }
        if (estado.camadaAtivaId && !this.getAttribute('camada-ativa')) {
          this.camadaAtivaId = estado.camadaAtivaId;
        }
        if (estado.mapaBaseAtivo && !this.getAttribute('mapa-base-ativo')) {
          this.mapaBaseAtivo = estado.mapaBaseAtivo;
        }
        if (estado.densidade && !this.getAttribute('densidade')) {
          this.densidade = estado.densidade;
        }
        if (typeof estado.altura === 'number' && !this.getAttribute('altura') && !this.style.height) {
          this.resizerController.definirAltura(estado.altura, false);
          this.alturaCustomizada = estado.altura;
        }
      }
    }

    if (this.hasAttribute('altura')) {
      this.resizerController.definirAltura(this.getAttribute('altura'), false);
    }

    if (this.persistir && !this.storageKey && !this.id) {
      if (UICamadas.instanciasChavePadrao.size > 0) {
        console.warn(
          "[UI-Camadas] Mais de um painel sem 'id' nem 'storage-key' divide a mesma chave de persistência e um sobrescreve o estado do outro. Defina 'storage-key' (ou 'id') em cada um."
        );
      }
      UICamadas.instanciasChavePadrao.add(this);
    }

    this.resizerController.init();
    this.render();
    this.conectarEventosGerais();
    conectarTecladoEAcessibilidade(this, this, this.shadow, this.corpoElement, this.listeners);

    // A partir daqui os atributos já foram lidos: é seguro gravar no storage com a chave correta
    this.conectado = true;
    if (this.camadas.length > 0) this.salvarLembrancaEstado();
  }

  disconnectedCallback() {
    this.conectado = false;
    UICamadas.instanciasChavePadrao.delete(this);
    this.resizerController?.destruir();
    this.dragDropManager?.destruir();
    cancelarArrasteControles(this);
    this.listeners.cleanup();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;

    // Mudanças de atributo vêm do aplicativo consumidor (mutação programática):
    // apenas sincronizam o DOM interno, sem redisparar eventos para fora.
    if (name === 'colapsado') {
      this.salvarLembrancaEstado();
    } else if (name === 'camada-ativa') {
      this.sincronizarCamadaAtivaDOM();
      this.salvarLembrancaEstado();
    } else if (name === 'mapa-base-ativo') {
      if (newVal) this.marcarMapaBaseAtivoNoDOM(newVal);
    } else if (
      name === 'mostrar-mapas-base' ||
      name === 'mostrar-rodape' ||
      name === 'mostrar-busca' ||
      name === 'colapsavel' ||
      name === 'flutuante'
    ) {
      this.solicitarRenderizacao();
    } else if (name === 'altura') {
      this.resizerController?.definirAltura(newVal, false);
    }
  }

  // --- Getters e Setters de Propriedades Reativas ---

  public get titulo(): string {
    return this.getAttribute('titulo') || 'Camadas';
  }
  public set titulo(valor: string) {
    this.setAttribute('titulo', valor);
  }

  public get camadaAtivaId(): string | null {
    return this.getAttribute('camada-ativa') || (this.camadas[0]?.id ?? null);
  }
  public set camadaAtivaId(id: string | null) {
    if (id) {
      this.setAttribute('camada-ativa', id);
    } else {
      this.removeAttribute('camada-ativa');
    }
  }

  public get mapaBaseAtivo(): string {
    return this.getAttribute('mapa-base-ativo') || 'satelite';
  }
  public set mapaBaseAtivo(valor: string) {
    this.setAttribute('mapa-base-ativo', valor);
  }

  public selecionarMapaBase(id: string, emitirEvento = false): void {
    if (!id || this.mapaBaseAtivo === id) return;
    this.mapaBaseAtivo = id;
    this.marcarMapaBaseAtivoNoDOM(id);
    this.salvarLembrancaEstado();
    if (emitirEvento) {
      this.dispararEvento('ui-mapa-base-alterado', { mapaBaseId: id });
    }
  }

  private marcarMapaBaseAtivoNoDOM(id: string): void {
    this.shadow.querySelectorAll('[data-basemap-id]').forEach((c) => {
      const ativo = c.getAttribute('data-basemap-id') === id;
      c.classList.toggle('active', ativo);
      c.setAttribute('aria-pressed', String(ativo));
    });
  }

  public get abaAtiva(): AbaPainelCamadas {
    return (this.getAttribute('aba-ativa') as AbaPainelCamadas) || 'camadas';
  }
  public set abaAtiva(aba: AbaPainelCamadas) {
    this.setAttribute('aba-ativa', aba);
  }

  public get colapsado(): boolean {
    return this.hasAttribute('colapsado');
  }
  public set colapsado(valor: boolean) {
    if (valor) {
      this.setAttribute('colapsado', '');
    } else {
      this.removeAttribute('colapsado');
    }
  }

  public get colapsavel(): boolean {
    return this.getAttribute('colapsavel') !== 'false';
  }
  public set colapsavel(valor: boolean) {
    this.setAttribute('colapsavel', String(valor));
  }

  public get flutuante(): boolean {
    return this.hasAttribute('flutuante');
  }
  public set flutuante(valor: boolean) {
    if (valor) {
      this.setAttribute('flutuante', '');
    } else {
      this.removeAttribute('flutuante');
    }
  }

  public get densidade(): 'compacto' | 'normal' {
    return (this.getAttribute('densidade') as 'compacto' | 'normal') || 'normal';
  }
  public set densidade(valor: 'compacto' | 'normal') {
    this.setAttribute('densidade', valor);
  }

  public get mostrarMapasBase(): boolean {
    return this.getAttribute('mostrar-mapas-base') !== 'false';
  }
  public set mostrarMapasBase(valor: boolean) {
    this.setAttribute('mostrar-mapas-base', String(valor));
  }

  public get mostrarRodape(): boolean {
    return this.getAttribute('mostrar-rodape') !== 'false';
  }
  public set mostrarRodape(valor: boolean) {
    this.setAttribute('mostrar-rodape', String(valor));
  }

  public get mostrarBusca(): boolean {
    return this.getAttribute('mostrar-busca') !== 'false';
  }
  public set mostrarBusca(valor: boolean) {
    this.setAttribute('mostrar-busca', String(valor));
  }

  public get persistir(): boolean {
    return this.getAttribute('persistir') !== 'false';
  }
  public set persistir(valor: boolean) {
    this.setAttribute('persistir', String(valor));
  }

  public get storageKey(): string | null {
    return this.getAttribute('storage-key');
  }
  public set storageKey(valor: string | null) {
    if (valor) {
      this.setAttribute('storage-key', valor);
    } else {
      this.removeAttribute('storage-key');
    }
  }

  public get redimensionavel(): boolean {
    return this.hasAttribute('redimensionavel') || this.hasAttribute('redimensionavel-altura');
  }
  public set redimensionavel(valor: boolean) {
    if (valor) {
      this.setAttribute('redimensionavel', '');
    } else {
      this.removeAttribute('redimensionavel');
      this.removeAttribute('redimensionavel-altura');
    }
  }

  public get altura(): string | null {
    return this.getAttribute('altura') || this.style.height || null;
  }
  public set altura(valor: string | number | null) {
    if (valor !== null && valor !== undefined) {
      this.setAttribute('altura', String(valor));
      this.definirAltura(valor);
    } else {
      this.removeAttribute('altura');
      this.definirAltura(null);
    }
  }

  public definirAltura(alturaPx: number | string | null, persistir = true): void {
    // Chamada programática: 'ui-redimensionar-altura' é exclusivo do arraste/duplo-clique no resizer
    this.resizerController?.definirAltura(alturaPx, false);
    const num = alturaPx !== null ? parseFloat(String(alturaPx)) : null;
    this.alturaCustomizada = isNaN(num as number) ? null : num;
    if (persistir) {
      this.salvarLembrancaEstado();
    }
  }

  // --- Gerenciamento de Persistência / Lembrança ---

  public obterChaveStorageAtual(): string {
    return this.lembranca.chaveAtual();
  }

  /** Versão com debounce, para interações contínuas (seletor de cor, slider de opacidade). */
  public agendarSalvarLembranca(): void {
    this.lembranca.agendar();
  }

  public salvarLembrancaEstado(): void {
    this.lembranca.salvar();
  }

  public limparLembranca(): void {
    this.lembranca.limpar();
  }

  // --- API Pública de Alta Ergonomia ---
  //
  // Contrato de eventos: toda mutação feita pelo aplicativo consumidor (propriedades,
  // atributos e métodos públicos) atualiza apenas o DOM interno, sem disparar eventos.
  // Eventos saem do componente somente em resposta a uma interação física do usuário
  // (clique, drag-and-drop, teclado). Métodos que aceitam `emitirEvento` permitem
  // optar explicitamente pela emissão quando necessário.

  /** Atalho reativo para `definirCamadas()` — não dispara eventos. */
  public get layers(): CamadaItem[] {
    return this.camadas;
  }
  public set layers(camadas: CamadaItem[]) {
    this.definirCamadas(camadas);
  }

  /** Atalho reativo para `definirFeicoes()` — não dispara eventos. */
  public get features(): FeicaoItem[] {
    return this.feicoes;
  }
  public set features(feicoes: FeicaoItem[]) {
    this.definirFeicoes(feicoes);
  }

  /** Atalho reativo para `definirMapasBase()` — não dispara eventos. */
  public get basemaps(): MapaBaseItem[] {
    return this.mapasBase;
  }
  public set basemaps(mapas: MapaBaseItem[]) {
    this.definirMapasBase(mapas);
  }

  public definirCamadas(camadas: CamadaItem[], feicoes?: FeicaoItem[]): void {
    definirCamadasNoHost(this, camadas, feicoes);
  }

  public definirFeicoes(feicoes: FeicaoItem[]): void {
    definirFeicoesNoHost(this, feicoes);
  }

  public definirMapasBase(mapas: MapaBaseItem[]): void {
    this.mapasBase = Array.isArray(mapas) ? [...mapas] : [];
    this.solicitarRenderizacao();
  }

  public definirCamadaAtiva(camadaId: string, emitirEvento = false): void {
    if (!camadaId || this.camadaAtivaId === camadaId) return;
    this.camadaAtivaId = camadaId;
    this.sincronizarCamadaAtivaDOM();
    this.salvarLembrancaEstado();
    if (emitirEvento) {
      this.dispararEvento('ui-camada-selecionada', {
        camadaId,
        camada: this.camadas.find((l) => l.id === camadaId)
      });
    }
  }

  public obterCamada(id: string): CamadaItem | undefined {
    return this.camadas.find((l) => l.id === id);
  }

  public obterCamadaAtiva(): CamadaItem | undefined {
    return this.camadas.find((l) => l.id === this.camadaAtivaId);
  }

  public obterFeicao(id: string): FeicaoItem | undefined {
    return this.feicoes.find((f) => f.id === id);
  }

  public obterFeicoesSelecionadas(): FeicaoItem[] {
    return this.feicoes.filter((f) => this.selectedFeatureIds.has(f.id));
  }

  public adicionarCamada(camada: CamadaItem): void {
    adicionarCamadaNoHost(this, camada);
  }

  public removerCamada(camadaId: string): void {
    removerCamadaNoHost(this, camadaId);
  }

  public adicionarFeicao(feicao: FeicaoItem): void {
    adicionarFeicaoNoHost(this, feicao);
  }

  public atualizarFeicao(feicaoAtualizada: FeicaoItem): void {
    atualizarFeicaoNoHost(this, feicaoAtualizada);
  }

  public removerFeicao(feicaoId: string): void {
    removerFeicaoNoHost(this, feicaoId);
  }

  public selecionarFeicao(
    feicaoId: string,
    acumular = false,
    intervalo = false,
    emitirEvento = false
  ): void {
    selecionarFeicaoNoHost(this, feicaoId, acumular, intervalo, emitirEvento);
  }

  public selecionarFeicoes(ids: string[], emitirEvento = false): void {
    selecionarFeicoesNoHost(this, ids, emitirEvento);
  }

  public limparSelecao(emitirEvento = false): void {
    limparSelecaoNoHost(this, emitirEvento);
  }

  public expandirTodas(): void {
    this.expandedLayers = new Set(this.camadas.map((l) => l.id));
    this.salvarLembrancaEstado();
    this.solicitarRenderizacao();
  }

  public colapsarTodas(): void {
    this.expandedLayers.clear();
    this.salvarLembrancaEstado();
    this.solicitarRenderizacao();
  }

  public alternarVisibilidadeTodas(emitirEvento = false): void {
    const algumaVisivel = this.camadas.some((l) => l.visible !== false);
    const novoVis = !algumaVisivel;
    this.camadas.forEach((l) => {
      l.visible = novoVis;
      if (emitirEvento) {
        this.dispararEvento('ui-camada-visibilidade', { camadaId: l.id, visivel: novoVis });
      }
    });
    this.salvarLembrancaEstado();
    this.solicitarRenderizacao();
  }

  public colapsar(emitirEvento = false): void {
    this.definirColapso(true, emitirEvento);
  }

  public expandir(emitirEvento = false): void {
    this.definirColapso(false, emitirEvento);
  }

  public alternarColapso(emitirEvento = false): void {
    this.definirColapso(!this.colapsado, emitirEvento);
  }

  private definirColapso(valor: boolean, emitirEvento: boolean): void {
    if (this.colapsado === valor) return;
    this.colapsado = valor;
    if (emitirEvento) {
      this.dispararEvento('ui-colapso-alterado', { colapsado: valor });
    }
  }

  // --- Renderização e Ciclo de Vida ---

  public solicitarRenderizacao(): void {
    if (this.profundidadeLote > 0) {
      this.renderPendente = true;
      return;
    }
    this.render();
  }

  /**
   * Agrupa várias mutações (`adicionarFeicao` em laço, por exemplo) em uma só renderização, ao fim de `fn`.
   * Sem isto, cada chamada redesenha a árvore inteira.
   */
  public emLote(fn: () => void): void {
    this.profundidadeLote++;
    try {
      fn();
    } finally {
      this.profundidadeLote--;
      if (this.profundidadeLote === 0 && this.renderPendente) {
        this.renderPendente = false;
        this.render();
      }
    }
  }

  public dispararEvento(nome: string, detalhe: unknown): void {
    this.dispatchEvent(
      new CustomEvent(nome, {
        detail: detalhe,
        bubbles: true,
        composed: true
      })
    );
  }

  private render(): void {
    if (!this.corpoElement) return;
    renderizarPainel(this, this.shadow, this.corpoElement, this.dragDropManager);
  }

  // --- Conexão de Eventos ---

  private conectarEventosGerais(): void {
    // Botão flutuante de expansão (persiste entre renders; o listener é limpo ao desconectar)
    this.listeners.add(this.btnExpandirFlutuante, 'click', () => this.expandir(true));
  }

  // --- Sincronização de DOM (delegada) ---

  private sincronizarCamadaAtivaDOM(): void {
    sincronizarCamadaAtivaDOM(this, this.shadow);
  }

  public sincronizarSelecaoDOM(): void {
    sincronizarSelecaoDOM(this, this.shadow);
  }

  // --- Auxiliares Internos ---

  public notificarMudancaSelecao(): void {
    emitirEventosSelecao(this);
  }
}

export class UIPainelCamadas extends UICamadas {}
export class UILayerPanel extends UICamadas {}

// Registro oficial no CustomElementRegistry e aliases compatíveis
definirCustomElement('ui-camadas', UICamadas);
definirCustomElement('ui-painel-camadas', UIPainelCamadas);
definirCustomElement('ui-layer-panel', UILayerPanel);


