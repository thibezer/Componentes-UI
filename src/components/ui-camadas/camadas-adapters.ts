/* ====================================================
   UI Camadas - Adaptadores de Compatibilidade
   Converte modelos entre motores Canvas CAD e o
   componente nativo <ui-camadas>
   ==================================================== */

import { CamadaItem, FeicaoItem } from './tipos';
import type { CanvasLayerDef, CanvasLayerCategory, CanvasLayerType } from '../../gerencigeo-canvas/types';

/**
 * Converte uma definição de camada do Canvas CAD (CanvasLayerDef)
 * para o modelo de camada do painel <ui-camadas> (CamadaItem)
 */
export function converterCanvasLayerParaCamadaItem(layer: Partial<CanvasLayerDef> & { id: string }): CamadaItem {
  return {
    id: layer.id,
    name: layer.nome || layer.id,
    color: layer.estilo?.corPrimaria || '#00E08A',
    visible: layer.visivel !== false,
    locked: layer.bloqueada === true,
    opacity: typeof layer.opacidade === 'number' ? layer.opacidade : 1,
    order: layer.zIndex,
    description: layer.categoria ? `Categoria: ${layer.categoria}` : undefined,
    categoria: layer.categoria,
    tipo: layer.tipo,
    estilo: layer.estilo,
    dados: layer.dados
  };
}

/**
 * Converte um item de camada do painel <ui-camadas> (CamadaItem)
 * para o modelo interno de camada do Canvas CAD (CanvasLayerDef)
 */
export function converterCamadaItemParaCanvasLayer(
  item: CamadaItem,
  categoriaPadrao: CanvasLayerCategory = 'levantamento',
  tipoPadrao: CanvasLayerType = 'feicoes'
): CanvasLayerDef {
  return {
    id: item.id,
    nome: item.name,
    categoria: (item.categoria as CanvasLayerCategory) || categoriaPadrao,
    tipo: (item.tipo as CanvasLayerType) || tipoPadrao,
    visivel: item.visible !== false,
    opacidade: typeof item.opacity === 'number' ? item.opacity : 1,
    zIndex: typeof item.order === 'number' ? item.order : 500,
    bloqueada: item.locked === true,
    interativo: true,
    estilo: {
      corPrimaria: item.color || '#00E08A',
      scaleMode: 'screen',
      ...(typeof item.estilo === 'object' && item.estilo !== null ? (item.estilo as Record<string, unknown>) : {})
    },
    dados: typeof item.dados === 'object' && item.dados !== null ? (item.dados as Record<string, unknown>) : undefined
  };
}

/**
 * Converte uma feição genérica do Canvas/GeoJSON para FeicaoItem do <ui-camadas>
 */
export function converterFeicaoParaItem(
  feicao: {
    id: string;
    nome?: string;
    name?: string;
    layerId?: string;
    camadaId?: string;
    tipo?: string;
    type?: string;
    geometria?: { tipo?: string; type?: string; coordenadas?: unknown; coordinates?: unknown };
    coordinates?: unknown;
    cor?: string;
    color?: string;
    visivel?: boolean;
    visible?: boolean;
    bloqueada?: boolean;
    locked?: boolean;
    status?: string;
    categoria?: string;
    category?: string;
    propriedades?: Record<string, unknown>;
    properties?: Record<string, unknown>;
    [key: string]: unknown;
  },
  camadaIdFallback = ''
): FeicaoItem {
  const geomTipo = feicao.geometria?.tipo || feicao.geometria?.type || feicao.tipo || feicao.type || 'Polygon';
  const coords = feicao.geometria?.coordenadas || feicao.geometria?.coordinates || feicao.coordinates;
  const cor = feicao.cor || feicao.color;

  return {
    id: String(feicao.id),
    name: feicao.nome || feicao.name || `Feição ${feicao.id}`,
    layerId: feicao.layerId || feicao.camadaId || camadaIdFallback,
    type: geomTipo,
    geometryType: geomTipo,
    coordinates: coords,
    color: cor,
    visible: feicao.visivel !== undefined ? feicao.visivel : feicao.visible !== false,
    locked: feicao.bloqueada !== undefined ? feicao.bloqueada : feicao.locked === true,
    status: (feicao.status as 'oficial' | 'previa' | 'rascunho') || 'oficial',
    category: feicao.categoria || feicao.category,
    properties: feicao.propriedades || feicao.properties || {}
  };
}
