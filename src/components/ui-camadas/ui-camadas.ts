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
import { CamadasDragDropManager, UICamadasHost } from './camadas-drag-drop';
import { ICONES } from './camadas-icones';
import { formatarMetricaFeicoes } from './camadas-metricas';
import { sanitizarCorCss, debounce } from './camadas-utils';
import {
  gerarChaveStorage,
  carregarEstadoPersistido,
  salvarEstadoPersistido,
  limparEstadoPersistido,
  reidratarCamadasComOverrides,
  EstadoPersistidoCamadas,
  CamadaOverridePersistido
} from './camadas-persistencia';

export class UICamadas extends SafeHTMLElement implements UICamadasHost {
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
      'storage-key'
    ];
  }

  private shadow: ShadowRoot;
  private listeners = new ListenerBag();
  private dragDropManager!: CamadasDragDropManager;

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
      </div>
      <button class="ui-camadas-toggle-flutuante" id="btn-expandir-flutuante" title="Expandir Painel de Camadas" aria-label="Expandir Painel de Camadas">
        ${ICONES.camadas}
      </button>
    `;

    this.corpoElement = this.shadow.getElementById('painel-corpo') as HTMLDivElement;
    this.btnExpandirFlutuante = this.shadow.getElementById('btn-expandir-flutuante') as HTMLButtonElement;
    this.dragDropManager = new CamadasDragDropManager(this, this.shadow);
  }

  connectedCallback() {
    // Reidratação de estado preliminar (colapso do painel, mapa base, densidade)
    if (this.persistir) {
      const estado = carregarEstadoPersistido(this.obterChaveStorageAtual());
      if (estado) {
        if (typeof estado.painelColapsado === 'boolean') {
          this.colapsado = estado.painelColapsado;
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
      }
    }

    this.render();
    this.conectarEventosGerais();
    this.conectarTecladoAcessibilidade();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;

    if (name === 'colapsado') {
      const isColapsado = newVal !== null;
      this.dispararEvento('ui-colapso-alterado', { colapsado: isColapsado });
      this.salvarLembrancaEstado();
    } else if (name === 'camada-ativa') {
      this.sincronizarCamadaAtivaDOM();
      this.salvarLembrancaEstado();
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

  // --- Gerenciamento de Persistência / Lembrança ---

  public obterChaveStorageAtual(): string {
    return gerarChaveStorage(this.storageKey, this.id);
  }

  public salvarLembrancaEstado(): void {
    if (!this.persistir) return;

    const chave = this.obterChaveStorageAtual();
    const estadoAnterior = carregarEstadoPersistido(chave);

    // Se ainda não foram definidas camadas nesta instância, preserva as listas e overrides do storage
    let expandedList: string[] = estadoAnterior?.expandedLayerIds || [];
    let collapsedList: string[] = estadoAnterior?.collapsedLayerIds || [];
    let ordemList: string[] = estadoAnterior?.ordemCamadasIds || [];
    const overrides: Record<string, CamadaOverridePersistido> = {
      ...(estadoAnterior?.camadasOverrides || {})
    };

    if (this.camadas.length > 0) {
      expandedList = [];
      collapsedList = [];
      ordemList = this.camadas.map((l) => l.id);

      this.camadas.forEach((l) => {
        if (this.expandedLayers.has(l.id)) {
          expandedList.push(l.id);
        } else {
          collapsedList.push(l.id);
        }

        overrides[l.id] = {
          name: l.name,
          visible: l.visible !== false,
          locked: !!l.locked,
          opacity: typeof l.opacity === 'number' ? l.opacity : 1,
          color: l.color || '#00E08A'
        };
      });
    }

    const estado: EstadoPersistidoCamadas = {
      versao: 1,
      expandedLayerIds: expandedList,
      collapsedLayerIds: collapsedList,
      camadaAtivaId: this.camadaAtivaId,
      painelColapsado: this.colapsado,
      ordemCamadasIds: ordemList,
      mapaBaseAtivo: this.mapaBaseAtivo,
      densidade: this.densidade,
      camadasOverrides: overrides,
      ultimaAtualizacao: Date.now()
    };

    salvarEstadoPersistido(chave, estado);
  }

  public limparLembranca(): void {
    limparEstadoPersistido(this.obterChaveStorageAtual());
  }

  // --- API Pública de Alta Ergonomia ---

  public definirCamadas(camadas: CamadaItem[], feicoes?: FeicaoItem[]): void {
    this.camadas = Array.isArray(camadas) ? camadas.map((c) => ({ ...c })) : [];

    // Reidratação inteligente com suporte à lembrança de estado (expansão, visibilidade, travas, opacidade, cor, ordem)
    if (this.persistir) {
      const estado = carregarEstadoPersistido(this.obterChaveStorageAtual());
      reidratarCamadasComOverrides(this.camadas, estado, this.expandedLayers);
      if (estado?.camadaAtivaId && this.camadas.some((l) => l.id === estado.camadaAtivaId)) {
        this.camadaAtivaId = estado.camadaAtivaId;
      }
    } else {
      this.camadas.forEach((l) => {
        if (!this.expandedLayers.has(l.id)) {
          this.expandedLayers.add(l.id);
        }
      });
    }

    if (Array.isArray(feicoes)) {
      this.feicoes = [...feicoes];
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
    this.feicoes = Array.isArray(feicoes) ? [...feicoes] : [];
    this.sincronizarSelecoesComFeicoesValidas();
    this.solicitarRenderizacao();
  }

  public definirMapasBase(mapas: MapaBaseItem[]): void {
    this.mapasBase = Array.isArray(mapas) ? [...mapas] : [];
    this.solicitarRenderizacao();
  }

  public definirCamadaAtiva(camadaId: string, emitirEvento = true): void {
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
    this.camadas.push(camada);
    this.expandedLayers.add(camada.id);
    this.salvarLembrancaEstado();
    this.solicitarRenderizacao();
  }

  public removerCamada(camadaId: string): void {
    this.camadas = this.camadas.filter((l) => l.id !== camadaId);
    this.feicoes = this.feicoes.filter((f) => f.layerId !== camadaId);
    if (this.camadaAtivaId === camadaId) {
      this.camadaAtivaId = this.camadas[0]?.id ?? null;
    }
    this.salvarLembrancaEstado();
    this.solicitarRenderizacao();
  }

  public adicionarFeicao(feicao: FeicaoItem): void {
    if (!feicao || !feicao.id) return;
    this.feicoes.push(feicao);
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
    this.notificarMudancaSelecao();
    this.solicitarRenderizacao();
  }

  public selecionarFeicao(feicaoId: string, acumular = false, intervalo = false): void {
    const todosIds = this.obterIdsVisiveisFeicoes();
    if (!todosIds.includes(feicaoId)) return;

    if (intervalo && this.lastClickedFeatureId && todosIds.includes(this.lastClickedFeatureId)) {
      const idxA = todosIds.indexOf(this.lastClickedFeatureId);
      const idxB = todosIds.indexOf(feicaoId);
      const start = Math.min(idxA, idxB);
      const end = Math.max(idxA, idxB);

      if (!acumular) this.selectedFeatureIds.clear();
      for (let i = start; i <= end; i++) {
        this.selectedFeatureIds.add(todosIds[i]);
      }
    } else if (acumular) {
      if (this.selectedFeatureIds.has(feicaoId)) {
        this.selectedFeatureIds.delete(feicaoId);
      } else {
        this.selectedFeatureIds.add(feicaoId);
      }
      this.lastClickedFeatureId = feicaoId;
    } else {
      this.selectedFeatureIds.clear();
      this.selectedFeatureIds.add(feicaoId);
      this.lastClickedFeatureId = feicaoId;
    }

    this.sincronizarSelecaoDOM();
    this.notificarMudancaSelecao();
  }

  public selecionarFeicoes(ids: string[], emitirEvento = false): void {
    const novosIds = ids || [];
    const mesmoTamanho = novosIds.length === this.selectedFeatureIds.size;
    const iguais = mesmoTamanho && novosIds.every((id) => this.selectedFeatureIds.has(id));
    if (iguais) return;

    this.selectedFeatureIds.clear();
    novosIds.forEach((id) => this.selectedFeatureIds.add(id));
    this.sincronizarSelecaoDOM();
    if (emitirEvento) {
      this.notificarMudancaSelecao();
    }
  }

  public limparSelecao(emitirEvento = true): void {
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

  public alternarVisibilidadeTodas(): void {
    const algumaVisivel = this.camadas.some((l) => l.visible !== false);
    const novoVis = !algumaVisivel;
    this.camadas.forEach((l) => {
      l.visible = novoVis;
      this.dispararEvento('ui-camada-visibilidade', { camadaId: l.id, visivel: novoVis });
    });
    this.salvarLembrancaEstado();
    this.solicitarRenderizacao();
  }

  public colapsar(): void {
    this.colapsado = true;
  }

  public expandir(): void {
    this.colapsado = false;
  }

  public alternarColapso(): void {
    this.colapsado = !this.colapsado;
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
      searchQuery: this.searchQuery
    });

    const mapasBaseHtml = this.mostrarMapasBase
      ? renderizarGridMapasBase(this.mapasBase, this.mapaBaseAtivo)
      : '';

    const rodapeHtml = this.mostrarRodape
      ? renderizarRodapeAcoes(this.camadas, this.feicoes, this.selectedFeatureIds)
      : '';

    this.corpoElement.innerHTML = `
      ${arvoreHtml}
      ${rodapeHtml}
      ${mapasBaseHtml}
    `;

    this.conectarEventosArvore();
    this.dragDropManager.bindAll();
  }

  // --- Conexão de Eventos ---

  private conectarEventosGerais(): void {
    // 1. Botão colapsar painel
    const btnColapsar = this.shadow.getElementById('btn-colapsar');
    if (btnColapsar) {
      btnColapsar.addEventListener('click', () => this.colapsar());
    }

    // 2. Botão flutuante expandir
    if (this.btnExpandirFlutuante) {
      this.btnExpandirFlutuante.addEventListener('click', () => this.expandir());
    }
  }

  private conectarEventosArvore(): void {
    // 1. Visibilidade de todas as camadas
    const btnToggleAllVis = this.shadow.getElementById('btn-toggle-all-vis');
    if (btnToggleAllVis) {
      btnToggleAllVis.addEventListener('click', () => this.alternarVisibilidadeTodas());
    }

    // 2. Expandir/recolher todas
    const btnToggleAllExp = this.shadow.getElementById('btn-toggle-all-expand');
    if (btnToggleAllExp) {
      btnToggleAllExp.addEventListener('click', (e) => {
        e.stopPropagation();
        const allExp =
          this.camadas.length > 0 && this.camadas.every((l) => this.expandedLayers.has(l.id));
        if (allExp) {
          this.colapsarTodas();
        } else {
          this.expandirTodas();
        }
      });
    }

    // 3. Botão + Camada
    const btnAddLayer = this.shadow.getElementById('btn-add-layer');
    if (btnAddLayer) {
      btnAddLayer.addEventListener('click', () => {
        this.dispararEvento('ui-camada-adicionar', {});
      });
    }

    // 4. Busca rápida
    const inputSearch = this.shadow.getElementById('input-layer-search') as HTMLInputElement | null;
    const btnClearSearch = this.shadow.getElementById('btn-clear-layer-search');

    if (inputSearch) {
      const executarBuscaDebounced = debounce((q: string) => {
        this.aplicarFiltroBuscaDOM(q);
      }, 75);

      inputSearch.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        executarBuscaDebounced(this.searchQuery);
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        this.searchQuery = '';
        if (inputSearch) inputSearch.value = '';
        this.aplicarFiltroBuscaDOM('');
        if (inputSearch) inputSearch.focus();
      });
    }

    // 5. Linhas de Camadas
    this.shadow.querySelectorAll('[data-layer-row]').forEach((row) => {
      row.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest(
            '[data-layer-eye], [data-layer-lock], [data-layer-expand], [data-layer-target], [data-layer-fit], [data-layer-settings], input, button'
          )
        ) {
          return;
        }
        const layerId = row.getAttribute('data-layer-row');
        if (layerId) {
          this.definirCamadaAtiva(layerId);
        }
      });
    });

    // Expandir individual da camada (in-place sem redesenhar o DOM)
    this.shadow.querySelectorAll('[data-layer-expand]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = btn.getAttribute('data-layer-expand');
        if (!layerId) return;

        if (this.expandedLayers.has(layerId)) {
          this.expandedLayers.delete(layerId);
        } else {
          this.expandedLayers.add(layerId);
        }

        const group = btn.closest('.ui-layer-group');
        const chevron = btn.querySelector('.ui-chevron-icon');
        const isExp = this.expandedLayers.has(layerId);
        if (chevron) chevron.classList.toggle('open', isExp);
        if (group) {
          const children = group.querySelector('.ui-children-container') as HTMLElement | null;
          if (children) children.style.display = isExp ? 'block' : 'none';
        }

        this.salvarLembrancaEstado();
      });
    });

    // Olho (visibilidade) da camada (cirúrgico in-place 0ms)
    this.shadow.querySelectorAll('[data-layer-eye]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = btn.getAttribute('data-layer-eye');
        const layer = this.camadas.find((l) => l.id === layerId);
        if (layer) {
          layer.visible = layer.visible === false;
          const isVis = layer.visible !== false;
          btn.innerHTML = isVis ? ICONES.olhoAberto : ICONES.olhoFechado;
          btn.setAttribute('title', isVis ? 'Ocultar Camada' : 'Exibir Camada');
          const row = btn.closest('.ui-layer-row');
          if (row) row.classList.toggle('hidden-layer', !isVis);

          this.salvarLembrancaEstado();
          this.dispararEvento('ui-camada-visibilidade', {
            camadaId: layer.id,
            visivel: isVis
          });
        }
      });
    });

    // Bloqueio (trava) da camada
    this.shadow.querySelectorAll('[data-layer-lock]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = btn.getAttribute('data-layer-lock');
        const layer = this.camadas.find((l) => l.id === layerId);
        if (layer) {
          layer.locked = !layer.locked;
          btn.innerHTML = layer.locked ? ICONES.cadeadoTrancado : '';
          btn.setAttribute('title', layer.locked ? 'Desbloquear Camada' : 'Bloquear Camada');
          this.salvarLembrancaEstado();
          this.dispararEvento('ui-camada-bloqueio', {
            camadaId: layer.id,
            bloqueado: layer.locked
          });
        }
      });
    });

    // Enquadrar (fit) camada
    this.shadow.querySelectorAll('[data-layer-fit]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = btn.getAttribute('data-layer-fit');
        if (layerId) {
          this.dispararEvento('ui-camada-enquadrar', { camadaId: layerId });
        }
      });
    });

    // Drawer de configurações da camada: Alternar abertura/fechamento
    this.shadow.querySelectorAll('[data-layer-settings]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = btn.getAttribute('data-layer-settings');
        this.activeSettingsLayerId = this.activeSettingsLayerId === layerId ? null : layerId;
        this.solicitarRenderizacao();
      });
    });

    // Fechar drawer de configurações pelo botão X
    this.shadow.querySelectorAll('[data-layer-settings-close]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeSettingsLayerId = null;
        this.solicitarRenderizacao();
      });
    });

    // Seletor de cor no drawer da camada (atualização cirúrgica em tempo real)
    const atualizarCorCamadaNoDOM = (layerId: string, novaCor: string) => {
      const layer = this.camadas.find((l) => l.id === layerId);
      if (!layer) return;
      const corSegura = sanitizarCorCss(novaCor, layer.color || '#00E08A');
      layer.color = corSegura;

      const sample = this.shadow.getElementById(`sample-color-${layerId}`);
      if (sample) sample.style.backgroundColor = corSegura;

      const hexEl = this.shadow.getElementById(`hex-color-${layerId}`);
      if (hexEl) hexEl.textContent = corSegura.toUpperCase();

      const drawer = this.shadow.getElementById(`settings-drawer-${layerId}`);
      if (drawer) drawer.style.setProperty('--drawer-cor-camada', corSegura);

      const row = this.shadow.querySelector(`[data-layer-row="${layerId}"]`) as HTMLElement;
      if (row) {
        row.style.setProperty('--layer-active-color', corSegura);
        const bar = row.querySelector('.ui-col-colorbar') as HTMLElement;
        if (bar) bar.style.backgroundColor = corSegura;
      }

      this.salvarLembrancaEstado();
      this.dispararEvento('ui-camada-cor', { camadaId: layer.id, cor: corSegura });
    };

    this.shadow.querySelectorAll('[data-layer-color-picker]').forEach((picker) => {
      const p = picker as HTMLInputElement;
      const onColorChange = (e: Event) => {
        const layerId = p.getAttribute('data-layer-color-picker');
        if (!layerId) return;
        const color = (e.target as HTMLInputElement).value;
        atualizarCorCamadaNoDOM(layerId, color);
      };
      p.addEventListener('input', onColorChange);
      p.addEventListener('change', onColorChange);
    });

    // Slider de opacidade no drawer da camada (atualização cirúrgica em tempo real)
    const atualizarOpacidadeNoDOM = (layerId: string, val: number) => {
      const layer = this.camadas.find((l) => l.id === layerId);
      if (!layer) return;
      layer.opacity = val;

      const badge = this.shadow.getElementById(`badge-op-${layerId}`);
      if (badge) badge.textContent = `${Math.round(val * 100)}%`;

      const slider = this.shadow.querySelector(`[data-layer-opacity-slider="${layerId}"]`) as HTMLInputElement;
      if (slider && parseFloat(slider.value) !== val) slider.value = String(val);

      this.salvarLembrancaEstado();
      this.dispararEvento('ui-camada-opacidade', { camadaId: layer.id, opacidade: val });
    };

    this.shadow.querySelectorAll('[data-layer-opacity-slider]').forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const layerId = slider.getAttribute('data-layer-opacity-slider');
        if (!layerId) return;
        const val = parseFloat((e.target as HTMLInputElement).value);
        atualizarOpacidadeNoDOM(layerId, val);
      });
    });

    // Botão excluir camada no drawer (com salvaguarda de confirmação em 2 passos)
    this.shadow.querySelectorAll('[data-delete-layer]').forEach((btn) => {
      let confirmTimeout: ReturnType<typeof setTimeout> | null = null;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = btn.getAttribute('data-delete-layer');
        if (!layerId) return;

        const isConfirming = btn.classList.contains('confirming');
        if (!isConfirming) {
          btn.classList.add('confirming');
          const label = btn.querySelector('.ui-btn-label');
          if (label) label.textContent = 'Confirmar Exclusão?';

          confirmTimeout = setTimeout(() => {
            btn.classList.remove('confirming');
            if (label) label.textContent = 'Excluir Camada';
          }, 3500);
        } else {
          if (confirmTimeout) clearTimeout(confirmTimeout);
          this.dispararEvento('ui-camada-excluida', { camadaId: layerId });
          this.removerCamada(layerId);
        }
      });
    });

    // Target circle da camada (seleção em lote das feições da camada)
    this.shadow.querySelectorAll('[data-layer-target]').forEach((target) => {
      target.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const me = e as MouseEvent;
        const layerId = target.getAttribute('data-layer-target');
        const layerFeats = this.feicoes.filter((f) => f.layerId === layerId);
        if (layerFeats.length === 0) return;

        const allSelected = layerFeats.every((f) => this.selectedFeatureIds.has(f.id));
        if (allSelected) {
          layerFeats.forEach((f) => this.selectedFeatureIds.delete(f.id));
        } else {
          if (!me.ctrlKey && !me.metaKey) this.selectedFeatureIds.clear();
          layerFeats.forEach((f) => this.selectedFeatureIds.add(f.id));
        }
        this.lastClickedFeatureId = layerFeats[layerFeats.length - 1].id;
        this.sincronizarSelecaoDOM();
        this.notificarMudancaSelecao();
      });
    });

    // 6. Linhas de Feições
    this.shadow.querySelectorAll('[data-feat-select]').forEach((node) => {
      node.addEventListener('click', (e: Event) => {
        if (this.editingFeatureId) return;
        const me = e as MouseEvent;
        const target = me.target as HTMLElement;
        if (
          target.closest(
            '[data-feat-eye], [data-feat-lock], [data-feat-fit], [data-feat-target], input, button'
          )
        ) {
          return;
        }
        const featId = node.getAttribute('data-feat-select');
        if (!featId) return;

        this.selecionarFeicao(featId, me.ctrlKey || me.metaKey, me.shiftKey);
      });
    });

    // Target circle da feição
    this.shadow.querySelectorAll('[data-feat-target]').forEach((target) => {
      target.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const me = e as MouseEvent;
        const featId = target.getAttribute('data-feat-target');
        if (featId) {
          this.selecionarFeicao(featId, me.ctrlKey || me.metaKey, me.shiftKey);
        }
      });
    });

    // Olho (visibilidade) da feição (cirúrgico in-place 0ms)
    this.shadow.querySelectorAll('[data-feat-eye]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const featId = btn.getAttribute('data-feat-eye');
        const feat = this.feicoes.find((f) => f.id === featId);
        if (feat) {
          feat.visible = feat.visible === false;
          const isVis = feat.visible !== false;
          btn.innerHTML = isVis ? ICONES.olhoAberto : ICONES.olhoFechado;
          btn.setAttribute('title', isVis ? 'Ocultar Feição' : 'Exibir Feição');
          const row = btn.closest('.ui-feat-row');
          if (row) row.classList.toggle('hidden-row', !isVis);

          this.dispararEvento('ui-feicao-visibilidade', {
            feicaoId: feat.id,
            visivel: isVis
          });
        }
      });
    });

    // Bloqueio da feição
    this.shadow.querySelectorAll('[data-feat-lock]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const featId = btn.getAttribute('data-feat-lock');
        const feat = this.feicoes.find((f) => f.id === featId);
        if (feat) {
          feat.locked = !feat.locked;
          btn.innerHTML = feat.locked ? ICONES.cadeadoTrancado : '';
          btn.setAttribute('title', feat.locked ? 'Desbloquear Feição' : 'Bloquear Feição');
          this.dispararEvento('ui-feicao-bloqueio', {
            feicaoId: feat.id,
            bloqueado: feat.locked
          });
        }
      });
    });

    // Enquadrar feição
    this.shadow.querySelectorAll('[data-feat-fit]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const featId = btn.getAttribute('data-feat-fit');
        if (featId) {
          this.dispararEvento('ui-feicao-enquadrar', { feicaoId: featId });
        }
      });
    });

    // 7. Eventos dos Cards de Mapa Base
    this.shadow.querySelectorAll('[data-basemap-id]').forEach((card) => {
      card.addEventListener('click', () => {
        const basemapId = card.getAttribute('data-basemap-id');
        if (!basemapId || this.mapaBaseAtivo === basemapId) return;
        this.mapaBaseAtivo = basemapId;
        this.shadow.querySelectorAll('[data-basemap-id]').forEach((c) => {
          c.classList.toggle('active', c.getAttribute('data-basemap-id') === basemapId);
        });
        this.salvarLembrancaEstado();
        this.dispararEvento('ui-mapa-base-alterado', { mapaBaseId: basemapId });
      });
    });

    // 8. Ações do Rodapé Illustrator
    this.conectarEventosRodape();
  }

  private conectarEventosRodape(): void {
    // Visibilidade coletiva
    const btnFooterVis = this.shadow.getElementById('btn-footer-vis');
    if (btnFooterVis) {
      btnFooterVis.addEventListener('click', () => {
        const selFeats = this.feicoes.filter((f) => this.selectedFeatureIds.has(f.id));
        if (selFeats.length === 0) return;
        const someVis = selFeats.some((f) => f.visible !== false);
        const novoVis = !someVis;
        selFeats.forEach((f) => (f.visible = novoVis));
        this.dispararEvento('ui-acao-massa', {
          acao: 'visibilidade',
          feicoesIds: selFeats.map((f) => f.id),
          feicoes: selFeats,
          valor: novoVis
        });
        this.solicitarRenderizacao();
      });
    }

    // Trava coletiva
    const btnFooterLock = this.shadow.getElementById('btn-footer-lock');
    if (btnFooterLock) {
      btnFooterLock.addEventListener('click', () => {
        const selFeats = this.feicoes.filter((f) => this.selectedFeatureIds.has(f.id));
        if (selFeats.length === 0) return;
        const someLock = selFeats.some((f) => f.locked === true);
        const novoLock = !someLock;
        selFeats.forEach((f) => (f.locked = novoLock));
        this.dispararEvento('ui-acao-massa', {
          acao: 'bloqueio',
          feicoesIds: selFeats.map((f) => f.id),
          feicoes: selFeats,
          valor: novoLock
        });
        this.solicitarRenderizacao();
      });
    }

    // Cor coletiva
    const inputFooterColor = this.shadow.getElementById('input-footer-color') as HTMLInputElement | null;
    if (inputFooterColor) {
      inputFooterColor.addEventListener('change', (e) => {
        const cor = (e.target as HTMLInputElement).value;
        const selFeats = this.feicoes.filter((f) => this.selectedFeatureIds.has(f.id));
        if (selFeats.length === 0) return;
        selFeats.forEach((f) => {
          f.color = cor;
          f.style = { ...(f.style || {}), fillColor: cor, strokeColor: cor };
        });
        this.dispararEvento('ui-acao-massa', {
          acao: 'cor',
          feicoesIds: selFeats.map((f) => f.id),
          feicoes: selFeats,
          valor: cor
        });
        this.solicitarRenderizacao();
      });
    }

    // Mover para outra camada
    const selectFooterMove = this.shadow.getElementById('select-footer-move') as HTMLSelectElement | null;
    if (selectFooterMove) {
      selectFooterMove.addEventListener('change', (e) => {
        const targetLayerId = (e.target as HTMLSelectElement).value;
        if (!targetLayerId) return;
        const selFeats = this.feicoes.filter((f) => this.selectedFeatureIds.has(f.id));
        if (selFeats.length === 0) return;
        selFeats.forEach((f) => (f.layerId = targetLayerId));
        this.dispararEvento('ui-acao-massa', {
          acao: 'mover',
          feicoesIds: selFeats.map((f) => f.id),
          feicoes: selFeats,
          valor: targetLayerId
        });
        this.solicitarRenderizacao();
      });
    }

    // Nova camada
    const btnFooterNewLayer = this.shadow.getElementById('btn-footer-new-layer');
    if (btnFooterNewLayer) {
      btnFooterNewLayer.addEventListener('click', () => {
        this.dispararEvento('ui-camada-adicionar', {});
      });
    }

    // Excluir selecionados
    const btnFooterDel = this.shadow.getElementById('btn-footer-del');
    if (btnFooterDel) {
      btnFooterDel.addEventListener('click', () => {
        const ids = Array.from(this.selectedFeatureIds);
        if (ids.length === 0) return;
        const excluidas = this.feicoes.filter((f) => this.selectedFeatureIds.has(f.id));
        this.feicoes = this.feicoes.filter((f) => !this.selectedFeatureIds.has(f.id));
        this.selectedFeatureIds.clear();
        this.lastClickedFeatureId = null;
        this.dispararEvento('ui-acao-massa', {
          acao: 'excluir',
          feicoesIds: ids,
          feicoes: excluidas
        });
        this.notificarMudancaSelecao();
        this.solicitarRenderizacao();
      });
    }

    // Limpar seleção
    const btnFooterClear = this.shadow.getElementById('btn-footer-clear');
    if (btnFooterClear) {
      btnFooterClear.addEventListener('click', () => this.limparSelecao());
    }
  }

  private conectarTecladoAcessibilidade(): void {
    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === 'Escape') {
        if (this.selectedFeatureIds.size > 0) {
          e.preventDefault();
          this.limparSelecao();
        }
      }
    });
  }

  // --- Sincronização Cirúrgica de DOM (0ms lag) ---

  private sincronizarCamadaAtivaDOM(): void {
    const rows = this.shadow.querySelectorAll('[data-layer-row]');
    rows.forEach((row) => {
      const lid = row.getAttribute('data-layer-row');
      const isAtiva = lid === this.camadaAtivaId;
      row.classList.toggle('active-drawing-layer', isAtiva);

      const nameCol = row.querySelector('.ui-col-name');
      if (nameCol) {
        let badge = nameCol.querySelector('.ui-active-badge');
        if (isAtiva && !badge) {
          badge = document.createElement('span');
          badge.className = 'ui-active-badge';
          badge.textContent = '✓ Ativa';
          const chip = nameCol.querySelector('.ui-count-chip');
          if (chip) nameCol.insertBefore(badge, chip);
          else nameCol.appendChild(badge);
        } else if (!isAtiva && badge) {
          badge.remove();
        }
      }
    });
  }

  private sincronizarSelecaoDOM(): void {
    // 1. Atualizar linhas e targets de feições
    this.shadow.querySelectorAll('.ui-feat-row').forEach((row) => {
      const featId = row.getAttribute('data-feat-row');
      const isSelected = featId ? this.selectedFeatureIds.has(featId) : false;
      row.classList.toggle('selected-row', isSelected);
      const circle = row.querySelector('.ui-target-circle');
      if (circle) circle.classList.toggle('selected', isSelected);
    });

    // 2. Atualizar targets de camadas (selected / partial / vazio)
    this.shadow.querySelectorAll('.ui-layer-group').forEach((group) => {
      const lid = group.getAttribute('data-layer-id');
      const feats = this.feicoes.filter((f) => f.layerId === lid);
      const circle = group.querySelector('.ui-layer-row .ui-target-circle');
      if (circle && feats.length > 0) {
        const allSel = feats.every((f) => this.selectedFeatureIds.has(f.id));
        const someSel = !allSel && feats.some((f) => this.selectedFeatureIds.has(f.id));
        circle.classList.toggle('selected', allSel);
        circle.classList.toggle('partial', someSel);
      } else if (circle) {
        circle.classList.remove('selected', 'partial');
      }
    });

    // 3. Atualizar rodapé de ações
    const feicoesSel = this.feicoes.filter((f) => this.selectedFeatureIds.has(f.id));
    const temSel = feicoesSel.length > 0;
    const countEl = this.shadow.getElementById('footer-count');
    const labelEl = this.shadow.getElementById('footer-label');

    if (countEl) {
      countEl.textContent = String(temSel ? feicoesSel.length : this.camadas.length);
    }
    if (labelEl) {
      labelEl.textContent = temSel
        ? feicoesSel.length > 1
          ? 'selecionados'
          : 'selecionado'
        : this.camadas.length > 1
        ? 'camadas'
        : 'camada';
    }

    const metricEl = this.shadow.querySelector('.ui-footer-metric');
    const metricaCalculada = formatarMetricaFeicoes(feicoesSel);
    if (metricEl) {
      if (metricaCalculada) {
        metricEl.innerHTML = `${ICONES.reguaMetrica} ${metricaCalculada}`;
        (metricEl as HTMLElement).style.display = 'inline-flex';
      } else {
        (metricEl as HTMLElement).style.display = 'none';
      }
    }

    // Habilitar/desabilitar botões do rodapé
    ['btn-footer-vis', 'btn-footer-lock', 'btn-footer-del'].forEach((id) => {
      const btn = this.shadow.getElementById(id) as HTMLButtonElement | null;
      if (btn) {
        btn.disabled = !temSel;
        btn.classList.toggle('disabled', !temSel);
      }
    });

    const moveWrap = this.shadow.querySelector('.ui-footer-move-wrapper');
    if (moveWrap) moveWrap.classList.toggle('disabled', !temSel);

    const selMove = this.shadow.getElementById('select-footer-move') as HTMLSelectElement | null;
    if (selMove) selMove.disabled = !temSel;

    const colorWrap = this.shadow.querySelector('.ui-footer-color-wrapper');
    if (colorWrap) colorWrap.classList.toggle('disabled', !temSel);

    const inputColor = this.shadow.getElementById('input-footer-color') as HTMLInputElement | null;
    if (inputColor) inputColor.disabled = !temSel;

    let clearBtn = this.shadow.getElementById('btn-footer-clear');
    const rightFooter = this.shadow.querySelector('.ui-footer-right');
    if (temSel && !clearBtn && rightFooter) {
      clearBtn = document.createElement('button');
      clearBtn.id = 'btn-footer-clear';
      clearBtn.className = 'ui-footer-btn';
      clearBtn.title = 'Limpar seleção';
      clearBtn.innerHTML = ICONES.fechar;
      clearBtn.addEventListener('click', () => this.limparSelecao());
      rightFooter.appendChild(clearBtn);
    } else if (!temSel && clearBtn) {
      clearBtn.remove();
    }
  }

  // --- Auxiliares Internos ---

  private aplicarFiltroBuscaDOM(query: string): void {
    const q = (query || '').trim().toLowerCase();
    const treeMount = this.shadow.getElementById('ui-layer-tree-mount');
    if (!treeMount) return;

    const btnClearSearch = this.shadow.getElementById('btn-clear-layer-search');
    if (btnClearSearch) {
      btnClearSearch.style.display = q ? 'flex' : 'none';
    }

    const groups = treeMount.querySelectorAll('.ui-layer-group');
    groups.forEach((group) => {
      const layerId = group.getAttribute('data-layer-id');
      const layer = this.camadas.find((l) => l.id === layerId);
      const layerName = (layer?.name || '').toLowerCase();
      const featRows = group.querySelectorAll('.ui-feat-row');

      if (!q) {
        group.classList.remove('ui-search-hidden');
        featRows.forEach((row) => row.classList.remove('ui-search-hidden'));
        return;
      }

      let hasMatch = false;
      featRows.forEach((row) => {
        const featId = row.getAttribute('data-feat-row');
        const feat = this.feicoes.find((f) => f.id === featId);
        const featName = (feat?.name || '').toLowerCase();
        const featCat = (feat?.category || '').toLowerCase();
        const featType = (feat?.type || '').toLowerCase();

        const matches = featName.includes(q) || featCat.includes(q) || featType.includes(q);
        if (matches) {
          row.classList.remove('ui-search-hidden');
          hasMatch = true;
        } else {
          row.classList.add('ui-search-hidden');
        }
      });

      const layerMatches = layerName.includes(q);
      if (layerMatches || hasMatch) {
        group.classList.remove('ui-search-hidden');
        if (layerMatches && !hasMatch) {
          featRows.forEach((row) => row.classList.remove('ui-search-hidden'));
        }
      } else {
        group.classList.add('ui-search-hidden');
      }
    });
  }

  private obterIdsVisiveisFeicoes(): string[] {
    const ids: string[] = [];
    const featsByLayer = new Map<string, FeicaoItem[]>();
    for (let i = 0; i < this.feicoes.length; i++) {
      const f = this.feicoes[i];
      if (!featsByLayer.has(f.layerId)) featsByLayer.set(f.layerId, []);
      featsByLayer.get(f.layerId)!.push(f);
    }

    for (let i = 0; i < this.camadas.length; i++) {
      const l = this.camadas[i];
      if (this.expandedLayers.has(l.id)) {
        const lf = featsByLayer.get(l.id) || [];
        for (let j = 0; j < lf.length; j++) {
          ids.push(lf[j].id);
        }
      }
    }
    return ids;
  }

  private sincronizarSelecoesComFeicoesValidas(): void {
    if (this.selectedFeatureIds.size === 0) return;
    const validos = new Set(this.feicoes.map((f) => f.id));
    for (const id of this.selectedFeatureIds) {
      if (!validos.has(id)) this.selectedFeatureIds.delete(id);
    }
  }

  private notificarMudancaSelecao(): void {
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


