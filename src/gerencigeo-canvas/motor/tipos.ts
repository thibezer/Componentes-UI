import type { CaixaGeo } from '../feature_indice';
import type { PontoMundo } from '../feature_lod';
import type { Feicao, LatLonPar } from '../feature_types';
import type { LayerStyleDef } from '../types';
import type { EstiloVetor } from './estilo';

/*
 * Contratos do motor das formas (headless: sem `window`, `document` nem Leaflet). O motor recebe uma `Vista` e
 * devolve uma `ListaDesenho`: o que desenhar, já com LOD, e nada além disso. Quem pinta (Canvas 2D, SVG, WebGL)
 * é outro módulo; quem dá o mapa (tiles, pan, zoom, eventos) é o Leaflet.
 */

export type { PontoMundo };

/**
 * Janela que o motor desenha. `caixa` é o que cabe no canvas (geográfica); `origemPx` são os pixels de mundo, no
 * zoom, do canto superior esquerdo do canvas: o pintor subtrai esse valor em dupla precisão (coordenadas de mundo em
 * zoom alto não cabem em float32 do canvas). Sem `origemPx` ela é derivada de `caixa`.
 */
export interface Vista {
  caixa: CaixaGeo;
  zoom: number;
  larguraPx: number;
  alturaPx: number;
  dpr: number;
  origemPx?: PontoMundo;
}

/**
 * Formas de desenho:
 * - pintadas no canvas: `marca` (LOD), `poligono`, `circulo`, `linha`, `ponto` (sem ícone);
 * - marcadores DOM (dependem de CSS e arraste, ficam no Leaflet): `icone`, `texto`, `cluster`, `rotulo`;
 * - `curva` (linha/polígono Bézier): caminho Leaflet legado dentro do mesmo renderizador (pendência explícita).
 */
export type FormaDesenho = 'marca' | 'poligono' | 'circulo' | 'linha' | 'ponto' | 'icone' | 'texto' | 'cluster' | 'rotulo' | 'curva';

export interface ItemDesenho {
  camadaId: string;
  /** Id da feição; no cluster, a chave da célula; no rótulo, `rotulo:<id>`. */
  id: string;
  forma: FormaDesenho;
  /**
   * Pixels de MUNDO no zoom da vista (subtraia `origem` ao pintar). Poligono/linha: um array `[x0, y0, x1, y1, ...]`
   * por anel/parte. Círculo, ponto e marca: um array `[x, y]` com o centro. Marcadores DOM e curva: vazio.
   */
  geometriaEmPx: Float64Array[];
  /** Círculo e ponto: raio em px (círculo em metros convertido por zoom e latitude). Marca: lado (1 ou 2). */
  raioPx: number;
  /** Estilo normal (sem seleção); o realce de seleção vem de `listaSelecao`. Interno: itens iguais compartilham o objeto. */
  estilo: EstiloVetor;
  /** A feição está selecionada? (marcadores DOM trocam de aparência; o canvas base não depende disto.) */
  selecionada: boolean;
  /** Realce temporário (hover/edição), pedido por `destacar`. */
  destaque?: boolean;
  /** Feição de origem (marcadores DOM, curva, clique). Ausente no cluster. */
  feicao?: Feicao;
  /** Icone, texto, rótulo e cluster: posição [lat, lon]. */
  coordenada?: LatLonPar;
  /** Cluster: quantos pontos há na célula e quantos aparecem no cluster (o resto está selecionado). */
  total?: number;
  restantes?: number;
  /** Rótulo: texto a exibir. */
  texto?: string;
}

export interface EstatisticasCamada {
  /** Feições na camada. */
  total: number;
  /** Itens no canvas ou em marcadores DOM nesta vista (sem contar as marcas de LOD). */
  desenhadas: number;
  /** Feições pequenas pintadas como marca de 1–2 px. */
  marcasLOD: number;
  clusters: number;
  /** Marcadores DOM pedidos (ícones, textos, clusters, rótulos). */
  marcadoresDom: number;
  /** Quantas vezes o LOD foi calculado (no pan puro não cresce). */
  avaliacoesLOD: number;
}

export interface CamadaDesenho {
  camadaId: string;
  zIndex: number;
  opacidade: number;
  /** Pintar primeiro as marcas, depois polígonos/círculos, linhas e pontos; DOM e curvas vêm separados. */
  itens: ItemDesenho[];
  estatisticas: EstatisticasCamada;
}

/** Camadas visíveis, na ordem de empilhamento (zIndex crescente = a última fica por cima). */
export interface ListaDesenho {
  vista: Vista;
  /** Pixels de mundo do canto superior esquerdo do canvas (a `origemPx` da vista, já resolvida). */
  origem: PontoMundo;
  camadas: CamadaDesenho[];
}

export interface DefCamadaMotor {
  id: string;
  zIndex: number;
  opacidade: number;
  visivel: boolean;
  interativo: boolean;
  bloqueada?: boolean;
  estilo: LayerStyleDef;
}

/** Regra de visibilidade por versão (oficial × prévia): `RegraVersoes.visivel` serve direto. */
export type RegraVisivel = (f: Feicao, comOficial: Set<string>) => boolean;

/** Mudança incremental (a mesma que o gerenciador manda ao renderizador Leaflet). */
export interface DeltaMotor {
  /** A lista que o motor sincronizou por último; se não bater, o motor refaz a camada por inteiro. */
  base: Feicao[];
  mudadas: Feicao[];
  removidas: string[];
}
