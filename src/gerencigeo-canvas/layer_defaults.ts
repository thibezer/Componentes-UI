import type { CanvasLayerDef } from './types';
import { LayerRendererFactory } from './layer_renderer_factory';
import { TileLayerRenderer } from './renderers/tile_renderer';
import { WmsLayerRenderer } from './renderers/wms_renderer';
import { VectorLinesLayerRenderer } from './renderers/vector_lines_renderer';
import { VectorPointsLayerRenderer } from './renderers/vector_points_renderer';
import { VectorPolygonsLayerRenderer } from './renderers/vector_polygons_renderer';
import { GridLayerRenderer } from './renderers/grid_renderer';

// Registra os renderizadores padrão no Factory
export function registrarRenderizadoresPadrao(): void {
  LayerRendererFactory.register('tile', new TileLayerRenderer());
  LayerRendererFactory.register('wms', new WmsLayerRenderer());
  LayerRendererFactory.register('vetorial-linhas', new VectorLinesLayerRenderer());
  LayerRendererFactory.register('vetorial-pontos', new VectorPointsLayerRenderer());
  LayerRendererFactory.register('vetorial-poligonos', new VectorPolygonsLayerRenderer());
  LayerRendererFactory.register('grid', new GridLayerRenderer());
}

// Execução imediata no carregamento do módulo
registrarRenderizadoresPadrao();

export const DEFAULT_LAYERS: CanvasLayerDef[] = [
  {
    id: 'satelite',
    nome: 'Satélite Google Híbrido',
    categoria: 'base',
    tipo: 'tile',
    visivel: true,
    opacidade: 1.0,
    zIndex: 200,
    interativo: false,
    bloqueada: false,
    estilo: { scaleMode: 'screen' }
  },
  {
    id: 'sigef',
    nome: 'Acervo Fundiário SIGEF (INCRA)',
    categoria: 'wms',
    tipo: 'wms',
    visivel: true,
    opacidade: 0.85,
    zIndex: 390,
    interativo: true,
    bloqueada: false,
    estilo: { scaleMode: 'screen' }
  },
  {
    id: 'homologados',
    nome: 'Poligonal Homologada (Banco)',
    categoria: 'referencia',
    tipo: 'vetorial-linhas',
    visivel: true,
    opacidade: 0.9,
    zIndex: 420,
    interativo: true,
    bloqueada: false,
    estilo: {
      corPrimaria: '#f59e0b',
      espessuraLinha: 2,
      dashArray: '6, 8',
      scaleMode: 'screen'
    }
  },
  {
    id: 'homologados-pontos',
    nome: 'Marcos Homologados (SIGEF)',
    categoria: 'referencia',
    tipo: 'vetorial-pontos',
    visivel: true,
    opacidade: 1.0,
    zIndex: 660,
    interativo: true,
    bloqueada: false,
    estilo: {
      tamanhoMarcador: 8,
      corPrimaria: '#f59e0b',
      estiloMarcador: 'circle',
      scaleMode: 'screen'
    }
  },
  {
    id: 'perimetro',
    nome: 'Divisas e Poligonal do Imóvel',
    categoria: 'levantamento',
    tipo: 'vetorial-linhas',
    visivel: true,
    opacidade: 1.0,
    zIndex: 450,
    interativo: true,
    bloqueada: false,
    estilo: {
      corPrimaria: '#00f5a0',
      espessuraLinha: 2,
      scaleMode: 'screen',
      dimensaoMetros: 0.3
    }
  },
  {
    id: 'vizinhos',
    nome: 'Imóveis Confrontantes (WKT/CSV)',
    categoria: 'referencia',
    tipo: 'vetorial-poligonos',
    visivel: true,
    opacidade: 0.8,
    zIndex: 500,
    interativo: true,
    bloqueada: false,
    estilo: {
      corPrimaria: '#a855f7',
      espessuraLinha: 1.5,
      dashArray: '4, 6',
      scaleMode: 'screen'
    }
  },
  {
    id: 'vertices',
    nome: 'Vértices e Marcos do Levantamento',
    categoria: 'levantamento',
    tipo: 'vetorial-pontos',
    visivel: true,
    opacidade: 1.0,
    zIndex: 650,
    interativo: true,
    bloqueada: false,
    estilo: {
      tamanhoMarcador: 8,
      scaleMode: 'screen',
      dimensaoMetros: 0.25
    }
  },
  {
    id: 'grade',
    nome: 'Grade de Coordenadas UTM',
    categoria: 'referencia',
    tipo: 'grid',
    visivel: true,
    opacidade: 0.5,
    zIndex: 700,
    interativo: false,
    bloqueada: false,
    estilo: {
      corPrimaria: 'rgba(0, 245, 160, 0.18)',
      espessuraLinha: 0.6,
      scaleMode: 'screen'
    }
  }
];
