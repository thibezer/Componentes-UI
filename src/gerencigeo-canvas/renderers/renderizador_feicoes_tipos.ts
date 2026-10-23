import type L from 'leaflet';
import type { CaixaGeo } from '../feature_indice';
import type { Feicao } from '../feature_types';
import type { ILayerRenderer } from '../layer_renderer_factory';

/**
 * Contrato comum dos renderizadores de camadas de feições (`leaflet` e `canvas`): o gerenciador de feições fala só
 * com isto e não sabe qual dos dois está desenhando.
 */
export interface EstatisticasFeicoes {
  /** Feições na camada. */
  total: number;
  /** Desenhadas com detalhe completo: objetos Leaflet (caminho `leaflet`) ou formas no canvas e marcadores DOM (`canvas`). */
  materializadas: number;
  /** Feições pequenas pintadas como marca de 1–2 px (LOD). */
  marcasLOD: number;
  clusters: number;
  /** Quantas vezes o LOD foi calculado (no pan puro não cresce). */
  avaliacoesLOD: number;
  /** Caminho `canvas`: itens pintados no canvas (sem as marcas). */
  desenhadas?: number;
  /** Caminho `canvas`: marcadores DOM (ícones, textos, clusters, rótulos). */
  marcadoresDom?: number;
  /** Canvases usados pela camada (o canvas dela + a sobreposição compartilhada, no caminho `canvas`). */
  canvases?: number;
  renderizador?: 'leaflet' | 'canvas';
}

export interface IRenderizadorFeicoes extends ILayerRenderer {
  /** A regra de versões mudou (prévias ligadas/desligadas): recalcula o que aparece. */
  reavaliarVersoes(grupo: L.LayerGroup): void;
  /** A feição aparece segundo a regra de oficial × prévia? */
  feicaoVisivel(grupo: L.LayerGroup, f: Feicao): boolean;
  /** Feições da camada cujo envelope toca `caixa` (snap e consultas espaciais), sem as ocultas. */
  consultarProximas(grupo: L.LayerGroup, caixa: CaixaGeo): Feicao[];
  /** Mostra uma geometria provisória (arrasto de vértice) sem tocar nos dados nem no índice. */
  previsualizar(grupo: L.LayerGroup, f: Feicao): void;
  estatisticas(grupo: L.LayerGroup): EstatisticasFeicoes | null;
  /** Ids desenhados em detalhe completo e ids desenhados como marca de LOD (comparação entre renderizadores). */
  idsDesenhados(grupo: L.LayerGroup): { materializadas: string[]; marcas: string[] } | null;
  /** Marca como selecionadas as feições `ids` da camada (as demais voltam ao estilo normal). */
  aplicarSelecao(grupo: L.LayerGroup, ids: Set<string>): void;
}
