/* ====================================================
   UI Components Kit - Ponto de Entrada Principal (Entrypoint)
   ==================================================== */

// 1. Importação dos Design Tokens Globais
import './tokens/index.css';

// 2. Camada 1: Componentes Fundamentais
export * from './components/ui-botao';
export * from './components/ui-lista-flutuante';
export * from './components/ui-texto';
export * from './components/ui-campo-texto';
export * from './components/ui-icone';

// 3. Camada 2: Controles e Seleção de Dados
export * from './components/ui-checkbox';
export * from './components/ui-radio';
export * from './components/ui-switch';
export * from './components/ui-badge';
export * from './components/ui-avatar';
export * from './components/ui-segmented';

// 4. Camada 3: Contêineres, Overlays e Feedback
export * from './components/ui-card';
export * from './components/ui-modal';
export * from './components/ui-drawer';
export * from './components/ui-alerta';
export * from './components/ui-tooltip';
export * from './components/ui-tabela';
export * from './components/ui-stat';
export * from './components/ui-skeleton';
export * from './components/ui-tabela-propriedades';
export * from './components/ui-barra-ferramentas';
export * from './components/ui-camadas';

// 5. Núcleo Inteligente, Orquestração e Barramento de Eventos
export * from './core/ui-bus';
export * from './core/zero-js-triggers';
export * from './core/listener-bag';
export * from './core/leaflet-loader';
export * from './core/ssr-safe';

// 6. Carregamento Sob Demanda (Lazy) para Componentes Geoespaciais (Leaflet Opcional)
export const carregarModuloMapa = () => import('./mapa');
export const carregarModuloCanvas = () => import('./canvas');

// Tipos exportados para IntelliSense sem custo de runtime
export type { UIMapa } from './components/ui-mapa';
export type { UIMapaMarcador } from './components/ui-mapa/ui-mapa-marcador';
export type { UIMapaLinha } from './components/ui-mapa/ui-mapa-linha';
export type { UICanvasCAD } from './components/ui-canvas-cad';

// Auto-carregamento declarativo caso as tags existam no DOM (Ambiente CDN / HTML)
if (typeof document !== 'undefined') {
  const verificarTagsGeo = () => {
    if (document.querySelector('ui-mapa, ui-mapa-marcador, ui-mapa-linha') && !customElements.get('ui-mapa')) {
      import('./mapa');
    }
    if (document.querySelector('ui-canvas-cad') && !customElements.get('ui-canvas-cad')) {
      import('./canvas');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarTagsGeo, { once: true });
  } else {
    verificarTagsGeo();
  }
}

// Inicialização automática das ações declarativas Zero-JS
import { initZeroJSTriggers } from './core/zero-js-triggers';
if (typeof document !== 'undefined') {
  initZeroJSTriggers();
}

// Declaração de Tipagem Global para Document.querySelector e Frameworks
import type { UIBotao, UIBotaoPrimario } from './components/ui-botao';
import type { UIListaFlutuante, UISelect } from './components/ui-lista-flutuante';
import type { UITexto } from './components/ui-texto';
import type { UICampoTexto } from './components/ui-campo-texto';
import type { UIIcone } from './components/ui-icone';
import type { UICheckbox } from './components/ui-checkbox';
import type { UIRadio } from './components/ui-radio';
import type { UISwitch, UIToggle } from './components/ui-switch';
import type { UIBadge, UIChip, UITag } from './components/ui-badge';
import type { UIAvatar } from './components/ui-avatar';
import type { UISegmented, UISegmento } from './components/ui-segmented';
import type { UICard } from './components/ui-card';
import type { UIModal, UIDialog } from './components/ui-modal';
import type { UIDrawer, UISheet, UIPainelLateral, UIGaveta } from './components/ui-drawer';
import type { UIAlerta, UIToast } from './components/ui-alerta';
import type { UITooltip, UIPopover } from './components/ui-tooltip';
import type { UITabela } from './components/ui-tabela';
import type { UIStat, UIKpi, UIMetrica } from './components/ui-stat';
import type { UIMapa } from './components/ui-mapa';
import type { UIMapaMarcador } from './components/ui-mapa/ui-mapa-marcador';
import type { UIMapaLinha } from './components/ui-mapa/ui-mapa-linha';
import type { UISkeleton, UIEsqueleto } from './components/ui-skeleton';
import type { UICanvasCAD } from './components/ui-canvas-cad';
import type { UITabelaPropriedades } from './components/ui-tabela-propriedades';
import type { UIRibbon, UIPaletaFerramentas } from './components/ui-barra-ferramentas';
import type { UICamadas, UIPainelCamadas, UILayerPanel } from './components/ui-camadas';

declare global {
  interface HTMLElementTagNameMap {
    'ui-botao': UIBotao;
    'ui-botao-primario': UIBotaoPrimario;
    'ui-lista-flutuante': UIListaFlutuante;
    'ui-select': UISelect;
    'ui-texto': UITexto;
    'ui-campo-texto': UICampoTexto;
    'ui-icone': UIIcone;
    'ui-checkbox': UICheckbox;
    'ui-radio': UIRadio;
    'ui-switch': UISwitch;
    'ui-toggle': UIToggle;
    'ui-badge': UIBadge;
    'ui-chip': UIChip;
    'ui-tag': UITag;
    'ui-avatar': UIAvatar;
    'ui-segmented': UISegmented;
    'ui-segmento': UISegmento;
    'ui-card': UICard;
    'ui-modal': UIModal;
    'ui-dialog': UIDialog;
    'ui-drawer': UIDrawer;
    'ui-sheet': UISheet;
    'ui-painel-lateral': UIPainelLateral;
    'ui-gaveta': UIGaveta;
    'ui-alerta': UIAlerta;
    'ui-toast': UIToast;
    'ui-tooltip': UITooltip;
    'ui-popover': UIPopover;
    'ui-tabela': UITabela;
    'ui-stat': UIStat;
    'ui-kpi': UIKpi;
    'ui-metrica': UIMetrica;
    'ui-mapa': UIMapa;
    'ui-mapa-marcador': UIMapaMarcador;
    'ui-mapa-linha': UIMapaLinha;
    'ui-skeleton': UISkeleton;
    'ui-esqueleto': UIEsqueleto;
    'ui-canvas-cad': UICanvasCAD;
    'ui-tabela-propriedades': UITabelaPropriedades;
    'ui-painel-propriedades': UITabelaPropriedades;
    'ui-propriedades': UITabelaPropriedades;
    'ui-ribbon': UIRibbon;
    'ui-paleta-ferramentas': UIPaletaFerramentas;
    'ui-camadas': UICamadas;
    'ui-painel-camadas': UIPainelCamadas;
    'ui-layer-panel': UILayerPanel;
  }
}

