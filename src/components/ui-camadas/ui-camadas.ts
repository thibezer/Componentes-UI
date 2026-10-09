/* ====================================================
   UI Camadas - Web Component Nativo W3C
   Painel de Camadas GIS/CAD de Alto Desempenho
   Inspirado no ConecteMapas e Adobe Illustrator
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
import { renderizarArvoreCamadas } from './camadas-arvore-renderer';
import { renderizarRodapeAcoes } from './camadas-rodape';
import { renderizarGridMapasBase, MAPAS_BASE_PADRAO } from './camadas-mapas-base';
import { CamadasDragDropManager } from './camadas-drag-drop';
import { CamadasHostCompleto } from './camadas-host';
import { conectarEventosArvore } from './camadas-eventos-arvore';
import { conectarTecladoEAcessibilidade } from './camadas-teclado';
import {
  sincronizarCamadaAtivaDOM,
  sincronizarSelecaoDOM
} from './camadas-sincronizacao-dom';
import {
  obterIdsVisiveisFeicoes,
  calcularSelecaoFeicao,
  removerSelecoesInvalidas
} from './camadas-selecao';
import { ICONES } from './camadas-icones';
import { debounce } from './camadas-utils';
import {
  gerarChaveStorage,
  carregarEstadoPersistido,
  CamadaPropsPersistidas,
  snapshotCamada,
  salvarEstadoPersistido,
  montarEstadoPersistido,
  limparEstadoPersistido,
  reidratarCamadasComOverrides
} from './camadas-persistencia';
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
  private origensCamadas = new Map<string, CamadaPropsPersistidas>();
  private salvarLembrancaDebounced = debounce(() => this.salvarLembrancaEstado(), 200);

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
    this.resizerController?.destruir();
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
    return gerarChaveStorage(this.storageKey, this.id);
  }

  /** Versão com debounce, para interações contínuas (seletor de cor, slider de opacidade). */
  public agendarSalvarLembranca(): void {
    this.salvarLembrancaDebounced();
  }

  public salvarLembrancaEstado(): void {
    // Antes de conectar, atributos como storage-key/id ainda podem não ter sido lidos
    if (!this.persistir || !this.conectado) return;

    const chave = this.obterChaveStorageAtual();
    const estado = montarEstadoPersistido({
      estadoAnterior: carregarEstadoPersistido(chave),
      origensCamadas: this.origensCamadas,
      camadas: this.camadas,
      expandedLayers: this.expandedLayers,
      camadaAtivaId: this.camadaAtivaId,
      painelColapsado: this.colapsado,
      mapaBaseAtivo: this.mapaBaseAtivo,
      densidade: this.densidade,
      altura: this.alturaCustomizada
    });

    salvarEstadoPersistido(chave, estado);
  }


  public limparLembranca(): void {
    limparEstadoPersistido(this.obterChaveStorageAtual());
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
    this.camadas = Array.isArray(camadas) ? camadas.map((c) => ({ ...c })) : [];
    this.origensCamadas.clear();

    // Reidratação inteligente com suporte à lembrança de estado (expansão, visibilidade, travas, opacidade, cor, ordem)
    if (this.persistir) {
      const estado = carregarEstadoPersistido(this.obterChaveStorageAtual());
      reidratarCamadasComOverrides(this.camadas, estado, this.expandedLayers, this.origensCamadas);
      if (estado?.camadaAtivaId && this.camadas.some((l) => l.id === estado.camadaAtivaId)) {
        this.camadaAtivaId = estado.camadaAtivaId;
      }
    } else {
      this.camadas.forEach((l) => {
        this.origensCamadas.set(l.id, snapshotCamada(l));
        if (!this.expandedLayers.has(l.id)) {
          this.expandedLayers.add(l.id);
        }
      });
    }

    if (Array.isArray(feicoes)) {
      this.feicoes = feicoes.map((f) => ({ ...f }));
      const layerIdsExistentes = new Set(this.camadas.map((l) => l.id));
      const orfas = this.feicoes.filter((f) => f.layerId && !layerIdsExistentes.has(f.layerId));
      if (orfas.length > 0) {
        console.warn(
          `[UI-Camadas] ${orfas.length} feição(ões) possuem 'layerId' não cadastrado nas camadas:`,
          orfas.map((f) => ({ id: f.id, nome: f.name, layerId: f.layerId }))
        );
      }
      this.sincronizarSelecoesComFeicoesValidas();
    }

    if (!this.getAttribute('camada-ativa') && this.camadas.length > 0) {
      this.camadaAtivaId = this.camadas[0].id;
    }

    this.salvarLembrancaEstado();
    this.solicitarRenderizacao();
  }

  public definirFeicoes(feicoes: FeicaoItem[]): void {
    this.feicoes = Array.isArray(feicoes) ? feicoes.map((f) => ({ ...f })) : [];
    this.sincronizarSelecoesComFeicoesValidas();
    this.solicitarRenderizacao();
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
    if (!camada || !camada.id) return;
    if (this.camadas.some((l) => l.id === camada.id)) {
      console.warn(`[UI-Camadas] adicionarCamada ignorado: já existe uma camada com id '${camada.id}'.`);
      return;
    }
    const nova = { ...camada };
    this.camadas.push(nova);
    this.origensCamadas.set(nova.id, snapshotCamada(nova));
    this.expandedLayers.add(nova.id);
    this.salvarLembrancaEstado();
    this.solicitarRenderizacao();
  }

  public removerCamada(camadaId: string): void {
    this.camadas = this.camadas.filter((l) => l.id !== camadaId);
    this.feicoes = this.feicoes.filter((f) => f.layerId !== camadaId);
    this.origensCamadas.delete(camadaId);
    this.expandedLayers.delete(camadaId);
    if (this.activeSettingsLayerId === camadaId) this.activeSettingsLayerId = null;
    // Remove da seleção as feições que deixaram de existir junto com a camada
    this.sincronizarSelecoesComFeicoesValidas();
    if (this.selectedFeatureIds.size === 0) this.lastClickedFeatureId = null;
    if (this.camadaAtivaId === camadaId) {
      this.camadaAtivaId = this.camadas[0]?.id ?? null;
    }
    this.salvarLembrancaEstado();
    this.solicitarRenderizacao();
  }

  public adicionarFeicao(feicao: FeicaoItem): void {
    if (!feicao || !feicao.id) return;
    if (this.feicoes.some((f) => f.id === feicao.id)) {
      console.warn(`[UI-Camadas] adicionarFeicao ignorado: já existe uma feição com id '${feicao.id}'.`);
      return;
    }
    this.feicoes.push({ ...feicao });
    this.solicitarRenderizacao();
  }

  public atualizarFeicao(feicaoAtualizada: FeicaoItem): void {
    const idx = this.feicoes.findIndex((f) => f.id === feicaoAtualizada.id);
    if (idx !== -1) {
      this.feicoes[idx] = { ...this.feicoes[idx], ...feicaoAtualizada };
      this.solicitarRenderizacao();
    }
  }

  public removerFeicao(feicaoId: string): void {
    this.feicoes = this.feicoes.filter((f) => f.id !== feicaoId);
    this.selectedFeatureIds.delete(feicaoId);
    this.solicitarRenderizacao();
  }

  public selecionarFeicao(
    feicaoId: string,
    acumular = false,
    intervalo = false,
    emitirEvento = false
  ): void {
    const resultado = calcularSelecaoFeicao(
      obterIdsVisiveisFeicoes(this.camadas, this.feicoes, this.expandedLayers, this.searchQuery),
      this.selectedFeatureIds,
      this.lastClickedFeatureId,
      feicaoId,
      acumular,
      intervalo
    );
    if (!resultado) return;

    this.selectedFeatureIds = resultado.selecionados;
    this.lastClickedFeatureId = resultado.ultimoClicadoId;

    this.sincronizarSelecaoDOM();
    if (emitirEvento) {
      this.notificarMudancaSelecao();
    }
  }

  public selecionarFeicoes(ids: string[], emitirEvento = false): void {
    const novosIds = ids || [];
    const mesmoTamanho = novosIds.length === this.selectedFeatureIds.size;
    const iguais = mesmoTamanho && novosIds.every((id) => this.selectedFeatureIds.has(id));
    if (iguais) return;

    this.selectedFeatureIds.clear();
    novosIds.forEach((id) => this.selectedFeatureIds.add(id));
    // A âncora do Shift acompanha a seleção programática (última do lote), senão o intervalo parte de uma âncora velha
    this.lastClickedFeatureId = novosIds.length > 0 ? novosIds[novosIds.length - 1] : null;
    this.sincronizarSelecaoDOM();
    if (emitirEvento) {
      this.notificarMudancaSelecao();
    }
  }

  public limparSelecao(emitirEvento = false): void {
    if (this.selectedFeatureIds.size === 0) return;
    this.selectedFeatureIds.clear();
    this.lastClickedFeatureId = null;
    this.sincronizarSelecaoDOM();
    if (emitirEvento) {
      this.notificarMudancaSelecao();
    }
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
    this.render();
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

    // Renderiza a árvore de camadas e feições
    const arvoreHtml = renderizarArvoreCamadas({
      camadas: this.camadas,
      feicoes: this.feicoes,
      camadaAtivaId: this.camadaAtivaId,
      expandedLayers: this.expandedLayers,
      selectedFeatureIds: this.selectedFeatureIds,
      activeSettingsLayerId: this.activeSettingsLayerId,
      editingLayerId: this.editingLayerId,
      editingFeatureId: this.editingFeatureId,
      searchQuery: this.searchQuery,
      mostrarBotaoColapsar: this.flutuante && this.getAttribute('colapsavel') !== 'false'
    });

    const mapasBaseHtml = this.mostrarMapasBase
      ? renderizarGridMapasBase(this.mapasBase, this.mapaBaseAtivo)
      : '';

    const rodapeHtml = this.mostrarRodape
      ? renderizarRodapeAcoes(this.camadas, this.feicoes, this.selectedFeatureIds)
      : '';

    // O innerHTML recria a árvore inteira: guarda scroll e foco para devolvê-los depois
    const treeAntes = this.shadow.getElementById('ui-layer-tree-mount');
    const scrollCorpo = this.corpoElement.scrollTop;
    const scrollArvore = treeAntes ? treeAntes.scrollTop : 0;
    const focado = this.shadow.activeElement as HTMLInputElement | HTMLElement | null;
    const focoId = focado && this.corpoElement.contains(focado) ? focado.id : '';
    const caret =
      focado && 'selectionStart' in focado ? (focado as HTMLInputElement).selectionStart : null;

    this.corpoElement.innerHTML = `
      ${arvoreHtml}
      ${rodapeHtml}
      ${mapasBaseHtml}
    `;

    this.corpoElement.scrollTop = scrollCorpo;
    const treeDepois = this.shadow.getElementById('ui-layer-tree-mount');
    if (treeDepois) treeDepois.scrollTop = scrollArvore;

    if (focoId) {
      const novo = this.shadow.getElementById(focoId) as HTMLInputElement | null;
      if (novo) {
        novo.focus({ preventScroll: true });
        if (caret !== null && typeof novo.setSelectionRange === 'function') {
          try {
            novo.setSelectionRange(caret, caret);
          } catch {
            // Tipos de input sem suporte a seleção (ex.: color) são ignorados
          }
        }
      }
    }

    // Roving tabindex: apenas a primeira linha entra na ordem de Tab; as demais usam setas
    this.shadow.querySelector<HTMLElement>('[data-layer-row], [data-feat-row]')?.setAttribute('tabindex', '0');

    conectarEventosArvore(this, this.shadow);
    this.dragDropManager.bindAll();
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

  private sincronizarSelecoesComFeicoesValidas(): void {
    removerSelecoesInvalidas(this.selectedFeatureIds, this.feicoes);
  }

  public notificarMudancaSelecao(): void {
    const selecionadas = this.feicoes.filter((f) => this.selectedFeatureIds.has(f.id));
    this.dispararEvento('ui-feicoes-selecionadas', {
      feicoesIds: Array.from(this.selectedFeatureIds),
      feicoes: selecionadas
    });

    if (selecionadas.length === 1) {
      this.dispararEvento('ui-feicao-selecionada', {
        feicaoId: selecionadas[0].id,
        feicao: selecionadas[0]
      });
    } else if (selecionadas.length === 0) {
      this.dispararEvento('ui-feicao-selecionada', {
        feicaoId: null,
        feicao: null
      });
    }
  }
}

export class UIPainelCamadas extends UICamadas {}
export class UILayerPanel extends UICamadas {}

// Registro oficial no CustomElementRegistry e aliases compatíveis
definirCustomElement('ui-camadas', UICamadas);
definirCustomElement('ui-painel-camadas', UIPainelCamadas);
definirCustomElement('ui-layer-panel', UILayerPanel);


