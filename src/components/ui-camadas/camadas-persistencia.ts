/* ====================================================
   UI Camadas - Gerenciador de Persistência / Lembrança
   Salva e restaura expansão, visibilidade, travas,
   cores, opacidade e estado de colapso do painel
   ==================================================== */

import { CamadaItem } from './tipos';

export interface CamadaOverridePersistido {
  name?: string;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  color?: string;
}

export interface EstadoPersistidoCamadas {
  versao: number;
  expandedLayerIds: string[];
  collapsedLayerIds: string[];
  camadaAtivaId?: string | null;
  painelColapsado?: boolean;
  ordemCamadasIds?: string[];
  mapaBaseAtivo?: string;
  densidade?: 'compacto' | 'normal';
  altura?: number | null;
  camadasOverrides?: Record<string, CamadaOverridePersistido>;
  ultimaAtualizacao?: number;
}

const PREFIXO_STORAGE = 'ui_camadas_estado_';

/**
 * Retorna a chave do localStorage para uma determinada instância
 */
export function gerarChaveStorage(chaveProp?: string | null, elementId?: string | null): string {
  const identificador = (chaveProp || elementId || 'default').trim();
  return `${PREFIXO_STORAGE}${identificador}`;
}

/**
 * Lê o estado persistido do localStorage com tolerância a falhas (SSR, restrições de sandbox)
 */
export function carregarEstadoPersistido(storageKey: string): EstadoPersistidoCamadas | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as EstadoPersistidoCamadas;
    }
  } catch (err) {
    console.warn(`[UI-Camadas] Não foi possível carregar o estado persistido (${storageKey}):`, err);
  }
  return null;
}

/**
 * Salva o estado atualizado no localStorage de forma segura
 */
export function salvarEstadoPersistido(storageKey: string, estado: EstadoPersistidoCamadas): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(estado));
  } catch (err) {
    console.warn(`[UI-Camadas] Não foi possível salvar o estado persistido (${storageKey}):`, err);
  }
}

/**
 * Remove o estado persistido no localStorage
 */
export function limparEstadoPersistido(storageKey: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Silencioso em caso de restrição de storage
  }
}

/**
 * Mescla o estado das camadas carregadas com os overrides persistidos pelo usuário
 */
export function reidratarCamadasComOverrides(
  camadas: CamadaItem[],
  estadoPersistido: EstadoPersistidoCamadas | null,
  expandedLayersSet: Set<string>
): void {
  if (!Array.isArray(camadas)) return;

  const overrides = estadoPersistido?.camadasOverrides || {};
  const persistExpanded = new Set(estadoPersistido?.expandedLayerIds || []);
  const persistCollapsed = new Set(estadoPersistido?.collapsedLayerIds || []);
  const temHistorico = persistExpanded.size > 0 || persistCollapsed.size > 0;

  for (let i = 0; i < camadas.length; i++) {
    const camada = camadas[i];
    const ov = overrides[camada.id];

    // Restaura propriedades visuais salvas
    if (ov) {
      if (typeof ov.name === 'string' && ov.name.trim()) camada.name = ov.name;
      if (typeof ov.visible === 'boolean') camada.visible = ov.visible;
      if (typeof ov.locked === 'boolean') camada.locked = ov.locked;
      if (typeof ov.opacity === 'number') camada.opacity = ov.opacity;
      if (typeof ov.color === 'string') camada.color = ov.color;
    }

    // Restaura estado de expansão:
    if (temHistorico) {
      if (persistExpanded.has(camada.id)) {
        expandedLayersSet.add(camada.id);
      } else if (persistCollapsed.has(camada.id)) {
        expandedLayersSet.delete(camada.id);
      } else {
        // Camada nova não registrada antes: expande por padrão
        expandedLayersSet.add(camada.id);
      }
    } else {
      // Primeira execução sem histórico: expande
      expandedLayersSet.add(camada.id);
    }
  }

  // Restaura a ordem das camadas persistida pelo usuário (arraste/drag-and-drop)
  if (Array.isArray(estadoPersistido?.ordemCamadasIds) && estadoPersistido!.ordemCamadasIds.length > 0) {
    const ordemMap = new Map<string, number>();
    estadoPersistido!.ordemCamadasIds.forEach((id, idx) => ordemMap.set(id, idx));
    camadas.sort((a, b) => {
      const posA = ordemMap.has(a.id) ? ordemMap.get(a.id)! : 9999;
      const posB = ordemMap.has(b.id) ? ordemMap.get(b.id)! : 9999;
      return posA - posB;
    });
  }
}

export interface EntradaMontagemEstado {
  estadoAnterior: EstadoPersistidoCamadas | null;
  camadas: CamadaItem[];
  expandedLayers: Set<string>;
  camadaAtivaId: string | null;
  painelColapsado: boolean;
  mapaBaseAtivo: string;
  densidade: 'compacto' | 'normal';
  altura: number | null;
}

/**
 * Monta o estado a persistir. Se ainda não há camadas na instância,
 * preserva listas e overrides do estado anterior.
 */
export function montarEstadoPersistido(entrada: EntradaMontagemEstado): EstadoPersistidoCamadas {
  const { estadoAnterior, camadas, expandedLayers } = entrada;

  let expandedList: string[] = estadoAnterior?.expandedLayerIds || [];
  let collapsedList: string[] = estadoAnterior?.collapsedLayerIds || [];
  let ordemList: string[] = estadoAnterior?.ordemCamadasIds || [];
  const overrides: Record<string, CamadaOverridePersistido> = {
    ...(estadoAnterior?.camadasOverrides || {})
  };

  if (camadas.length > 0) {
    expandedList = [];
    collapsedList = [];
    ordemList = camadas.map((l) => l.id);

    camadas.forEach((l) => {
      if (expandedLayers.has(l.id)) {
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

  return {
    versao: 1,
    expandedLayerIds: expandedList,
    collapsedLayerIds: collapsedList,
    camadaAtivaId: entrada.camadaAtivaId,
    painelColapsado: entrada.painelColapsado,
    ordemCamadasIds: ordemList,
    mapaBaseAtivo: entrada.mapaBaseAtivo,
    densidade: entrada.densidade,
    altura: entrada.altura,
    camadasOverrides: overrides,
    ultimaAtualizacao: Date.now()
  };
}
