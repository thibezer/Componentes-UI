/* ====================================================
   UI Seletor de Mapa Base - Web Component Nativo W3C
   Controle flutuante/discreto para seleção de mapas base
   ==================================================== */

import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ListenerBag } from '../../core/listener-bag';
import estilos from './ui-seletor-mapa-base.css?inline';
import {
  MapaBaseItem,
  PosicaoSeletorMapaBase,
  DetalheEventoMapaBaseAlterado
} from './tipos';

export const MAPAS_BASE_PADRAO: MapaBaseItem[] = [
  {
    id: 'none',
    nome: 'Sem Mapa',
    descricao: 'Tela CAD neutra com grade quadriculada'
  },
  {
    id: 'google_satelite_puro',
    nome: 'Google Puro',
    descricao: 'Satélite limpo sem ruas ou rótulos',
    thumbnailUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'google_satelite',
    nome: 'Google Híbrido',
    descricao: 'Satélite com nomes de ruas e divisas',
    thumbnailUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'satelite',
    nome: 'Esri Satélite',
    descricao: 'Imagens orbitais de alta resolução',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'osm',
    nome: 'OpenStreetMap',
    descricao: 'Mapa viário e urbano colaborativo',
    thumbnailUrl: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'topografia',
    nome: 'Topografia',
    descricao: 'Curvas de nível e relevo sombreado',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'dark',
    nome: 'Dark Canvas',
    descricao: 'Mapa escuro de alto contraste para CAD',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=160&auto=format&fit=crop&q=80'
  }
];

const ICONE_GLOBO = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <line x1="2" y1="12" x2="22" y2="12"></line>
  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
</svg>
`;

const ICONE_CHEVRON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="6 9 12 15 18 9"></polyline>
</svg>
`;

const ICONE_CHECK = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>
`;

const ICONE_CAD = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
  <line x1="3" y1="9" x2="21" y2="9"></line>
  <line x1="3" y1="15" x2="21" y2="15"></line>
  <line x1="9" y1="3" x2="9" y2="21"></line>
  <line x1="15" y1="3" x2="15" y2="21"></line>
</svg>
`;

export class UISeletorMapaBase extends SafeHTMLElement {
  static get observedAttributes() {
    return [
      'mapa-base-ativo',
      'valor',
      'posicao',
      'aberto',
      'compacto',
      'desabilitado'
    ];
  }

  private shadow: ShadowRoot;
  private listeners = new ListenerBag();
  private _mapasBase: MapaBaseItem[] = [...MAPAS_BASE_PADRAO];
  private wrapperEl!: HTMLDivElement;
  private triggerBtn!: HTMLButtonElement;
  private popoverEl!: HTMLDivElement;
  private listEl!: HTMLDivElement;
  private thumbEl!: HTMLElement;
  private labelEl!: HTMLSpanElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-basemap-wrapper" id="basemap-wrapper">
        <button class="ui-basemap-trigger" id="basemap-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" title="Alternar Mapa Base">
          <span class="ui-basemap-thumb-container" id="thumb-container"></span>
          <span class="ui-basemap-label" id="basemap-label">Esri Satélite</span>
          <span class="ui-basemap-chevron">${ICONE_CHEVRON}</span>
        </button>

        <div class="ui-basemap-popover" id="basemap-popover" role="listbox" aria-label="Selecione o Mapa Base">
          <div class="ui-basemap-popover-header">
            <span class="ui-basemap-popover-titulo">Mapa Base</span>
            <span class="ui-basemap-popover-badge" id="popover-count">7 opções</span>
          </div>
          <div class="ui-basemap-list" id="basemap-list"></div>
        </div>
      </div>
    `;

    this.wrapperEl = this.shadow.getElementById('basemap-wrapper') as HTMLDivElement;
    this.triggerBtn = this.shadow.getElementById('basemap-trigger') as HTMLButtonElement;
    this.popoverEl = this.shadow.getElementById('basemap-popover') as HTMLDivElement;
    this.listEl = this.shadow.getElementById('basemap-list') as HTMLDivElement;
    this.thumbEl = this.shadow.getElementById('thumb-container') as HTMLElement;
    this.labelEl = this.shadow.getElementById('basemap-label') as HTMLSpanElement;
  }

  connectedCallback(): void {
    this.atualizarPosicaoClasses();
    this.renderizarOpcoes();
    this.atualizarGatilho();
    this.conectarEventos();
  }

  disconnectedCallback(): void {
    this.listeners.cleanup();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    if (oldVal === newVal) return;

    if (name === 'mapa-base-ativo' || name === 'valor') {
      this.atualizarSelecaoVisual();
      this.atualizarGatilho();
    } else if (name === 'posicao') {
      this.atualizarPosicaoClasses();
    } else if (name === 'aberto') {
      const estaAberto = newVal !== null && newVal !== 'false';
      this.aplicarEstadoAberto(estaAberto);
    } else if (name === 'compacto') {
      this.triggerBtn.classList.toggle('compacto', newVal !== null && newVal !== 'false');
    }
  }

  // --- Getters e Setters de Propriedades ---

  public get mapaBaseAtivo(): string {
    return this.getAttribute('mapa-base-ativo') || this.getAttribute('valor') || 'satelite';
  }

  public set mapaBaseAtivo(id: string) {
    this.setAttribute('mapa-base-ativo', id);
    this.setAttribute('valor', id);
  }

  public get valor(): string {
    return this.mapaBaseAtivo;
  }

  public set valor(id: string) {
    this.mapaBaseAtivo = id;
  }

  public get posicao(): PosicaoSeletorMapaBase {
    return (this.getAttribute('posicao') as PosicaoSeletorMapaBase) || 'inline';
  }

  public set posicao(pos: PosicaoSeletorMapaBase) {
    this.setAttribute('posicao', pos);
  }

  public get aberto(): boolean {
    return this.hasAttribute('aberto') && this.getAttribute('aberto') !== 'false';
  }

  public set aberto(valor: boolean) {
    if (valor) {
      this.setAttribute('aberto', '');
    } else {
      this.removeAttribute('aberto');
    }
  }

  public get compacto(): boolean {
    return this.hasAttribute('compacto') && this.getAttribute('compacto') !== 'false';
  }

  public set compacto(valor: boolean) {
    if (valor) {
      this.setAttribute('compacto', '');
    } else {
      this.removeAttribute('compacto');
    }
  }

  public get mapasBase(): MapaBaseItem[] {
    return this._mapasBase;
  }

  public definirMapasBase(novosMapas: MapaBaseItem[]): void {
    if (Array.isArray(novosMapas)) {
      this._mapasBase = [...novosMapas];
      this.renderizarOpcoes();
      this.atualizarGatilho();
    }
  }

  // --- Ações Públicas ---

  public abrir(): void {
    this.aberto = true;
  }

  public fechar(): void {
    this.aberto = false;
  }

  public alternar(): void {
    this.aberto = !this.aberto;
  }

  public selecionar(mapaBaseId: string): void {
    if (!mapaBaseId || this.mapaBaseAtivo === mapaBaseId) {
      this.fechar();
      return;
    }
    this.mapaBaseAtivo = mapaBaseId;
    const item = this._mapasBase.find(m => m.id === mapaBaseId);

    const detalhe: DetalheEventoMapaBaseAlterado = { mapaBaseId, item };
    this.dispatchEvent(new CustomEvent('ui-mapa-base-alterado', {
      detail: detalhe,
      bubbles: true,
      composed: true
    }));
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: mapaBaseId },
      bubbles: true,
      composed: true
    }));

    this.fechar();
  }

  // --- Renderização Interna ---

  private atualizarPosicaoClasses(): void {
    const pos = this.posicao;
    this.wrapperEl.className = `ui-basemap-wrapper pos-${pos}`;
  }

  private aplicarEstadoAberto(aberto: boolean): void {
    this.popoverEl.classList.toggle('aberto', aberto);
    this.triggerBtn.classList.toggle('active', aberto);
    this.triggerBtn.setAttribute('aria-expanded', String(aberto));
  }

  private atualizarGatilho(): void {
    const idAtual = this.mapaBaseAtivo;
    const ativo = this._mapasBase.find(m => m.id === idAtual) || this._mapasBase[0];

    if (ativo) {
      this.labelEl.textContent = ativo.nome;
      this.triggerBtn.title = `Mapa Base: ${ativo.nome} (${ativo.descricao || ''})`;

      if (ativo.thumbnailUrl) {
        this.thumbEl.innerHTML = `<img class="ui-basemap-thumb-mini" src="${escapeHtml(ativo.thumbnailUrl)}" alt="${escapeHtml(ativo.nome)}" />`;
      } else {
        this.thumbEl.innerHTML = `<span class="ui-basemap-thumb-mini fallback">${ICONE_CAD}</span>`;
      }
    } else {
      this.labelEl.textContent = 'Mapa Base';
      this.thumbEl.innerHTML = `<span class="ui-basemap-thumb-mini fallback">${ICONE_GLOBO}</span>`;
    }
  }

  private renderizarOpcoes(): void {
    const countBadge = this.shadow.getElementById('popover-count');
    if (countBadge) {
      countBadge.textContent = `${this._mapasBase.length} opções`;
    }

    const idAtivo = this.mapaBaseAtivo;

    this.listEl.innerHTML = this._mapasBase.map((item) => {
      const isAtivo = item.id === idAtivo;
      const previewHtml = item.thumbnailUrl
        ? `<img class="ui-basemap-item-preview" src="${escapeHtml(item.thumbnailUrl)}" alt="${escapeHtml(item.nome)}" loading="lazy" />`
        : `<div class="ui-basemap-item-preview-none">${ICONE_CAD}</div>`;

      return `
        <div class="ui-basemap-item ${isAtivo ? 'active' : ''}" 
             data-id="${escapeHtml(item.id)}" 
             role="option" 
             aria-selected="${isAtivo}"
             tabindex="0">
          ${previewHtml}
          <div class="ui-basemap-item-info">
            <span class="ui-basemap-item-nome">${escapeHtml(item.nome)}</span>
            ${item.descricao ? `<span class="ui-basemap-item-desc">${escapeHtml(item.descricao)}</span>` : ''}
          </div>
          <span class="ui-basemap-item-check">${ICONE_CHECK}</span>
        </div>
      `;
    }).join('');
  }

  private atualizarSelecaoVisual(): void {
    const idAtivo = this.mapaBaseAtivo;
    const items = this.listEl.querySelectorAll('.ui-basemap-item');
    items.forEach((item) => {
      const id = item.getAttribute('data-id');
      const isAtivo = id === idAtivo;
      item.classList.toggle('active', isAtivo);
      item.setAttribute('aria-selected', String(isAtivo));
    });
  }

  private conectarEventos(): void {
    // 1. Clique no botão de gatilho
    this.listeners.add(this.triggerBtn, 'click', (e: MouseEvent) => {
      e.stopPropagation();
      this.alternar();
    });

    // 2. Clique em um item do mapa base
    this.listeners.add(this.listEl, 'click', (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.ui-basemap-item');
      if (!target) return;
      const id = target.getAttribute('data-id');
      if (id) {
        this.selecionar(id);
      }
    });

    // 3. Suporte a tecla Enter nos itens
    this.listeners.add(this.listEl, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = (e.target as HTMLElement).closest('.ui-basemap-item');
        if (target) {
          e.preventDefault();
          const id = target.getAttribute('data-id');
          if (id) this.selecionar(id);
        }
      }
    });

    // 4. Click outside para fechar
    const handleClickOutside = (e: MouseEvent) => {
      if (!this.aberto) return;
      const path = e.composedPath();
      if (!path.includes(this)) {
        this.fechar();
      }
    };
    this.listeners.add(document, 'click', handleClickOutside);

    // 5. Tecla Escape para fechar
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.aberto) {
        this.fechar();
        this.triggerBtn.focus();
      }
    };
    this.listeners.add(document, 'keydown', handleKeyDown);
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class UIMapaBase extends UISeletorMapaBase {}

// Registro W3C
definirCustomElement('ui-seletor-mapa-base', UISeletorMapaBase);
definirCustomElement('ui-mapa-base', UIMapaBase);
