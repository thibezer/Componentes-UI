import L from 'leaflet';
import { garantirSubPane, type TipoGeometriaPane } from '../layer_pane_ops';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext } from '../types';
import { partesDaLinha, type EstiloFeicao, type Feicao, type LatLonPar } from '../feature_types';
import { IndiceEspacial, caixasSeTocam, type CaixaGeo } from '../feature_indice';
import { MIN_VERTICES_SIMPLIFICAR, ZOOM_SEM_SIMPLIFICACAO, simplificarGeometria, vertices } from '../feature_simplificacao';
import { entidadeDe, statusDe } from '../feature_versoes';
import { LinhaCurva, PoligonoCurvo, atualizarCamadaCurva, criarCamadaCurva, nosDaGeometria } from '../curva_leaflet';
import { AgrupadorCluster, deveAgrupar, type PontoCluster } from '../feature_cluster';
import { textoRotulo } from '../feature_metricas';
import { escapeHtml } from '../utils';

/*
 * Renderiza feições genéricas (Point, LineString, Polygon, Circle, Text) de uma camada.
 * Nada é criado por padrão: a camada só existe se o consumidor a criar (definirFeicoes).
 *
 * Atualização incremental: cada feição guarda sua camada Leaflet e, ao mudar, é "remendada"
 * (setLatLngs/setStyle/setRadius) em vez de recriada. Só troca de tipo ou de ícone recria.
 */

export const ICONES_FEICAO: Record<string, string> = {
  tower: '<path d="M12 2 L8 22 M12 2 L16 22 M9.5 12 H14.5 M8.7 17 H15.3 M12 2 L9.5 12 L14.5 12 Z" />',
  tree: '<path d="M12 22 V14 M12 3 L5 14 H19 Z" />',
  warning: '<path d="M12 3 L22 20 H2 Z M12 9 V14 M12 17 V17.5" />',
  water: '<path d="M12 3 C12 3 5 11 5 15.5 A7 7 0 0 0 19 15.5 C19 11 12 3 12 3 Z" />',
  boundary: '<path d="M12 2 L22 12 L12 22 L2 12 Z" />'
};

const COR_PADRAO = '#38bdf8';
const COR_SEGURA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([0-9.,%\s\/-]+\)|[a-z]{3,20})$/i;

/** Cores vão para atributos style; só passam formatos conhecidos (hex, rgb/hsl, nome). */
export function corSegura(cor: string | undefined, padrao: string): string {
  return cor && COR_SEGURA.test(cor.trim()) ? cor.trim() : padrao;
}

interface Entrada {
  layer: L.Layer;
  /** Muda quando o tipo de camada Leaflet precisa ser recriado. */
  forma: string;
  /** Feição original (a camada Leaflet pode estar desenhando uma versão simplificada). */
  feicao: Feicao;
  /** Zoom usado na última simplificação desenhada. */
  zoomDesenho: number;
}

interface ClusterMaterializado {
  marker: L.Marker;
  assinatura: string;
}

/**
 * Mudança incremental enviada pelo gerenciador junto com os dados (`dados.delta`). Só vale se `base` for a lista que
 * este renderizador sincronizou por último; senão a camada é reconciliada por inteiro.
 */
export interface DeltaFeicoes {
  base: Feicao[];
  /** Feições novas ou trocadas (as `excluida` saem da camada). */
  mudadas: Feicao[];
  removidas: string[];
}

/** Tudo que o renderizador guarda por camada (grupo Leaflet). */
interface Estado {
  layerDef: CanvasLayerDef;
  interativo: boolean;
  map: L.Map;
  context: CanvasRenderContext;
  /** Todas as feições da camada (visíveis ou não). */
  loja: Map<string, Feicao>;
  indice: IndiceEspacial;
  /** Muda a cada alteração dos dados ou das versões. */
  revisao: number;
  /** Muda quando o agrupamento e a contagem de pontos precisam ser refeitos do zero (dados trocados, regra de versões). */
  revisaoBase: number;
  /** Última lista de dados sincronizada (referência para aceitar um delta). */
  listaSincronizada: Feicao[] | null;
  /** Entidades da camada com geometria oficial (para a regra de prévias) e quantas oficiais cada uma tem. */
  oficiais: Set<string>;
  contOficiais: Map<string, number>;
  /** Quantas prévias a camada tem (sem prévias, a entrada de uma entidade oficial não muda a visibilidade de ninguém). */
  nPrevias: number;
  /** Só as feições materializadas como camada Leaflet (as que estão na tela ou perto). */
  entradas: Map<string, Entrada>;
  clusters: Map<string, ClusterMaterializado>;
  /** Pontos visíveis (pela regra de versões); com 8 ou menos nunca há cluster. */
  nPontos: number;
  nPontosRev: number;
  /** Existe só enquanto o agrupamento está valendo (zoom abaixo de 17 e pontos suficientes). */
  agrupador: AgrupadorCluster | null;
  agrupadorRev: number;
  /** O último reconcile cortou por viewport (camada grande)? */
  culling: boolean;
  agendado: boolean;
  vivo: boolean;
  aoMover: () => void;
}

type Grupo = L.LayerGroup;

export const COR_SELECAO = '#38bdf8';
/** Acima deste número de mudanças, a seleção é aplicada em blocos para não travar o quadro. */
const LIMITE_LOTE_SELECAO = 150;
const TAMANHO_BLOCO_SELECAO = 100;
/** Até aqui mantém tudo carregado (sem pop-in); acima, só o que está perto da tela. */
export const LIMITE_CULLING = 300;
/** Folga ao redor da tela, como fração da viewport. */
const FOLGA_VIEWPORT = 0.75;
/** Mudança em mais que esta fração da camada: remonta o índice em vez de atualizar item a item. */
const FRACAO_REMONTAR_INDICE = 0.3;

const agendarQuadro: (cb: () => void) => void =
  typeof requestAnimationFrame === 'function' ? (cb) => { requestAnimationFrame(cb); } : (cb) => { setTimeout(cb, 16); };

export class FeicoesLayerRenderer implements ILayerRenderer {
  private estados = new WeakMap<Grupo, Estado>();
  /** Por definição de camada (uma por componente), para a seleção sobreviver à recriação do grupo. */
  private selecionadas = new WeakMap<CanvasLayerDef, Set<string>>();
  private tokenLote = new WeakMap<Grupo, number>();

  public render(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext): L.LayerGroup {
    const group = L.layerGroup();
    this.sincronizar(layerDef, group, map, context, true);
    return group;
  }

  public update(
    layerDef: CanvasLayerDef,
    layerInstance: L.LayerGroup,
    changes: Partial<CanvasLayerDef>,
    context: CanvasRenderContext,
    map: L.Map
  ): void {
    // opacidade é aplicada no pane pelo LayerManager
    if (
      changes.dados === undefined && changes.estilo === undefined &&
      changes.interativo === undefined && changes.bloqueada === undefined
    ) return;
    const reestilizar = changes.estilo !== undefined || changes.interativo !== undefined || changes.bloqueada !== undefined;
    this.sincronizar(layerDef, layerInstance, map, context, reestilizar);
  }

  public destroy(layerInstance: L.LayerGroup, map: L.Map): void {
    const estado = this.estados.get(layerInstance);
    if (estado) {
      estado.vivo = false;
      map.off('moveend zoomend', estado.aoMover);
    }
    layerInstance.clearLayers();
    this.estados.delete(layerInstance);
    this.tokenLote.set(layerInstance, (this.tokenLote.get(layerInstance) ?? 0) + 1);
    if (map.hasLayer(layerInstance)) map.removeLayer(layerInstance);
  }

  /** A regra de versões mudou (prévias ligadas/desligadas): recalcula o que aparece. */
  public reavaliarVersoes(group: Grupo): void {
    const estado = this.estados.get(group);
    if (!estado) return;
    estado.revisao++;
    estado.revisaoBase++;
    this.reconciliar(group, estado, false, null);
  }

  /** A feição aparece segundo a regra de oficial × prévia? */
  public feicaoVisivel(group: Grupo, f: Feicao): boolean {
    const estado = this.estados.get(group);
    const regra = estado?.context.regraVersoes;
    return !estado || !regra || regra.visivel(f, estado.oficiais);
  }

  /** Feições da camada cujo envelope toca `caixa` (para snap e consultas espaciais). */
  public consultarProximas(group: Grupo, caixa: CaixaGeo): Feicao[] {
    const estado = this.estados.get(group);
    if (!estado) return [];
    const achadas: Feicao[] = [];
    for (const id of estado.indice.consultar(caixa)) {
      const f = estado.loja.get(id);
      if (f && !f.oculta) achadas.push(f);
    }
    return achadas;
  }

  /** Mostra uma geometria provisória (durante um arrasto) sem tocar nos dados nem no índice. */
  public previsualizar(group: Grupo, f: Feicao): void {
    const estado = this.estados.get(group);
    const entrada = estado?.entradas.get(f.id);
    if (!estado || !entrada) return;
    const zoom = (estado.map as unknown as { _loaded?: boolean })._loaded ? estado.map.getZoom() : 0;
    this.remendar(entrada.layer, this.paraDesenho(f, zoom), estado.layerDef, estado.interativo, !!this.selecionadas.get(estado.layerDef)?.has(f.id));
  }

  /** Para testes e diagnóstico: quantas feições estão materializadas e quantos clusters desenhados. */
  public estatisticas(group: Grupo): { total: number; materializadas: number; clusters: number } | null {
    const e = this.estados.get(group);
    return e ? { total: e.loja.size, materializadas: e.entradas.size, clusters: e.clusters.size } : null;
  }

  private feicoesDe(layerDef: CanvasLayerDef): Feicao[] {
    const d = layerDef.dados;
    const lista = Array.isArray(d) ? d : d?.feicoes;
    return Array.isArray(lista) ? (lista as Feicao[]) : [];
  }

  private obterEstado(group: Grupo, layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext): Estado {
    let estado = this.estados.get(group);
    if (!estado) {
      const novo: Estado = {
        layerDef, interativo: false, map, context,
        loja: new Map(), indice: new IndiceEspacial(), revisao: 0, revisaoBase: 0, listaSincronizada: null,
        oficiais: new Set(), contOficiais: new Map(), nPrevias: 0,
        entradas: new Map(), clusters: new Map(),
        nPontos: 0, nPontosRev: -1, agrupador: null, agrupadorRev: -1, culling: false,
        agendado: false, vivo: true,
        aoMover: () => {
          if (novo.agendado || !novo.vivo) return;
          novo.agendado = true;
          agendarQuadro(() => {
            novo.agendado = false;
            if (novo.vivo) this.reconciliar(group, novo, false, null);
          });
        }
      };
      map.on('moveend zoomend', novo.aoMover);
      this.estados.set(group, novo);
      estado = novo;
    }
    estado.layerDef = layerDef;
    estado.map = map;
    estado.context = context;
    estado.interativo = layerDef.interativo && !layerDef.bloqueada;
    return estado;
  }

  private sincronizar(
    layerDef: CanvasLayerDef,
    group: Grupo,
    map: L.Map,
    context: CanvasRenderContext,
    reestilizarTudo: boolean
  ): void {
    const estado = this.obterEstado(group, layerDef, map, context);
    const lista = this.feicoesDe(layerDef);

    // caminho incremental: o gerenciador diz exatamente o que mudou desde a lista que já sincronizamos
    const delta = (layerDef.dados as { delta?: DeltaFeicoes } | undefined)?.delta;
    if (!reestilizarTudo && this.aplicarDelta(group, estado, lista, delta)) return;

    // 1. dados: diferencia contra a loja e mantém o índice em dia
    const novas = lista.filter((f) => !f.excluida);
    const mudadas = new Set<string>();
    const vistos = new Set<string>();
    for (const f of novas) {
      vistos.add(f.id);
      if (estado.loja.get(f.id) !== f) mudadas.add(f.id);
    }
    const removidas = [...estado.loja.keys()].filter((id) => !vistos.has(id));

    if (mudadas.size > 0 || removidas.length > 0) {
      estado.revisao++;
      estado.revisaoBase++;
      if (estado.loja.size === 0 || mudadas.size + removidas.length > novas.length * FRACAO_REMONTAR_INDICE) {
        estado.indice.construir(novas);
      } else {
        for (const f of novas) if (mudadas.has(f.id)) estado.indice.atualizar(f);
        for (const id of removidas) estado.indice.remover(id);
      }
      estado.loja = new Map(novas.map((f) => [f.id, f]));
      this.recontarOficiais(estado, novas);
    }
    estado.listaSincronizada = lista;

    const sel = this.selecionadas.get(layerDef);
    if (sel) for (const id of [...sel]) if (!vistos.has(id)) sel.delete(id);

    // 2. o que está na tela
    this.reconciliar(group, estado, reestilizarTudo, mudadas);
  }

  private recontarOficiais(estado: Estado, feicoes: Iterable<Feicao>): void {
    estado.contOficiais = new Map();
    estado.nPrevias = 0;
    for (const f of feicoes) {
      if (f.excluida) continue;
      if (statusDe(f) !== 'oficial') {
        estado.nPrevias++;
        continue;
      }
      const e = entidadeDe(f);
      estado.contOficiais.set(e, (estado.contOficiais.get(e) ?? 0) + 1);
    }
    estado.oficiais = new Set(estado.contOficiais.keys());
  }

  /** Aplica só a diferença. Devolve `false` se o delta não parte da lista sincronizada (então o caminho completo roda). */
  private aplicarDelta(group: Grupo, estado: Estado, lista: Feicao[], delta: DeltaFeicoes | undefined): boolean {
    if (!delta || delta.base !== estado.listaSincronizada) return false;
    const { loja } = estado;
    const sel = this.selecionadas.get(estado.layerDef);
    const pontoVisivel = (f: Feicao): boolean => f.geometria.tipo === 'Point' && this.desenhavel(estado, f);
    // entidade -> tinha oficial antes do delta? (uma troca passa por 0 oficiais sem que o conjunto realmente mude)
    const tinhaOficial = new Map<string, boolean>();
    const contar = (f: Feicao | undefined, d: 1 | -1): void => {
      if (!f || f.excluida || statusDe(f) !== 'oficial') return;
      const e = entidadeDe(f);
      if (!tinhaOficial.has(e)) tinhaOficial.set(e, estado.oficiais.has(e));
      const n = (estado.contOficiais.get(e) ?? 0) + d;
      if (n <= 0) {
        estado.contOficiais.delete(e);
        estado.oficiais.delete(e);
      } else {
        estado.contOficiais.set(e, n);
        estado.oficiais.add(e);
      }
    };

    const idsMudados: string[] = [];
    const idsRemovidos: string[] = [];
    const tirar = (id: string): void => {
      const antiga = loja.get(id);
      if (!antiga) return;
      if (statusDe(antiga) === 'previa') estado.nPrevias--;
      contar(antiga, -1);
      if (pontoVisivel(antiga)) estado.nPontos--;
      loja.delete(id);
      estado.indice.remover(id);
      sel?.delete(id);
      idsRemovidos.push(id);
    };
    for (const id of delta.removidas) tirar(id);
    for (const f of delta.mudadas) {
      if (f.excluida) {
        tirar(f.id);
        continue;
      }
      const antiga = loja.get(f.id);
      if (statusDe(f) === 'previa') estado.nPrevias++;
      if (antiga) {
        if (statusDe(antiga) === 'previa') estado.nPrevias--;
        contar(antiga, -1);
        if (pontoVisivel(antiga)) estado.nPontos--;
      }
      loja.set(f.id, f);
      estado.indice.atualizar(f);
      contar(f, 1);
      if (pontoVisivel(f)) estado.nPontos++;
      idsMudados.push(f.id);
    }

    let oficiaisMudou = false;
    if (estado.nPrevias > 0) for (const [e, tinha] of tinhaOficial) if (tinha !== estado.oficiais.has(e)) oficiaisMudou = true;
    estado.listaSincronizada = lista;
    estado.revisao++;
    if (oficiaisMudou) estado.revisaoBase++;
    this.reconciliarParcial(group, estado, idsMudados, idsRemovidos, oficiaisMudou);
    return true;
  }

  /** Há geometria grande demais para o zoom atual? Só então vale redesenhar ao mudar de zoom. */
  private ressimplificar(entrada: Entrada, zoom: number): boolean {
    if (entrada.zoomDesenho === zoom) return false;
    if (vertices(entrada.feicao.geometria) < MIN_VERTICES_SIMPLIFICAR) return false;
    return zoom < ZOOM_SEM_SIMPLIFICACAO || entrada.zoomDesenho < ZOOM_SEM_SIMPLIFICACAO;
  }

  private paraDesenho(f: Feicao, zoom: number): Feicao {
    const g = simplificarGeometria(f.geometria, zoom);
    return g === f.geometria ? f : { ...f, geometria: g };
  }

  /** Vai para a tela? Não oculta e visível pela regra oficial × prévia. */
  private desenhavel(estado: Estado, f: Feicao): boolean {
    if (f.oculta) return false;
    const regra = estado.context.regraVersoes;
    return !regra || regra.visivel(f, estado.oficiais);
  }

  private estaCarregado(map: L.Map): boolean {
    return !!(map as unknown as { _loaded?: boolean })._loaded;
  }

  private caixaDe(limites: L.LatLngBounds): CaixaGeo {
    return { minLon: limites.getWest(), minLat: limites.getSouth(), maxLon: limites.getEast(), maxLat: limites.getNorth() };
  }

  /** Cria a camada Leaflet da feição ou remenda a que existe (e só se algo mudou). */
  private materializar(group: Grupo, estado: Estado, f: Feicao, zoom: number, selecionada: boolean, repatch: boolean): void {
    const forma = this.formaDe(f);
    const atual = estado.entradas.get(f.id);
    const fDesenho = this.paraDesenho(f, zoom);

    if (atual && atual.forma === forma) {
      if (repatch || atual.feicao !== f || this.ressimplificar(atual, zoom)) {
        this.remendar(atual.layer, fDesenho, estado.layerDef, estado.interativo, selecionada);
        atual.feicao = f;
        atual.zoomDesenho = zoom;
      }
      return;
    }
    if (atual) group.removeLayer(atual.layer);

    const layer = this.criar(fDesenho, estado.layerDef, estado.map, estado.interativo, selecionada);
    this.ligarEventos(layer, f.id, estado.layerDef, estado.entradas, estado.context);
    this.aplicarRotulo(layer, f);
    group.addLayer(layer);
    estado.entradas.set(f.id, { layer, forma, feicao: f, zoomDesenho: zoom });
  }

  private tirarEntrada(group: Grupo, estado: Estado, id: string): void {
    const e = estado.entradas.get(id);
    if (!e) return;
    group.removeLayer(e.layer);
    estado.entradas.delete(id);
  }

  private colocarCluster(group: Grupo, estado: Estado, chave: string, c: { coordenada: LatLonPar; total: number; assinatura: string }): void {
    const atual = estado.clusters.get(chave);
    if (atual?.assinatura === c.assinatura) return;
    if (atual) group.removeLayer(atual.marker);
    const marker = this.criarMarcadorCluster(c.coordenada, c.total, () => Array.from(estado.agrupador?.celula(chave)?.membros.values() ?? []), estado);
    group.addLayer(marker);
    estado.clusters.set(chave, { marker, assinatura: c.assinatura });
  }

  private tirarCluster(group: Grupo, estado: Estado, chave: string): void {
    const atual = estado.clusters.get(chave);
    if (!atual) return;
    group.removeLayer(atual.marker);
    estado.clusters.delete(chave);
  }

  /** O agrupador do zoom atual (reconstruído se os dados-base ou o zoom mudaram) ou `null` se não há agrupamento. */
  private agrupadorAtivo(estado: Estado, zoom: number): AgrupadorCluster | null {
    const visivelV = (f: Feicao): boolean => this.desenhavel(estado, f);
    if (estado.nPontosRev !== estado.revisaoBase) {
      let n = 0;
      for (const f of estado.loja.values()) if (f.geometria.tipo === 'Point' && visivelV(f)) n++;
      estado.nPontos = n;
      estado.nPontosRev = estado.revisaoBase;
    }
    if (!deveAgrupar(estado.nPontos, zoom)) {
      estado.agrupador = null;
      return null;
    }
    const ag = estado.agrupador;
    if (ag && ag.zoom === zoom && estado.agrupadorRev === estado.revisaoBase) return ag;
    const novo = new AgrupadorCluster(zoom, (p) => estado.map.project(L.latLng(p[0], p[1]), zoom));
    for (const f of estado.loja.values()) {
      if (f.geometria.tipo === 'Point' && visivelV(f)) novo.inserir({ id: f.id, coordenada: f.geometria.coordenada });
    }
    estado.agrupador = novo;
    estado.agrupadorRev = estado.revisaoBase;
    return novo;
  }

  /** Calcula o que deve estar desenhado e ajusta as camadas Leaflet (cria, remenda, remove). */
  private reconciliar(group: Grupo, estado: Estado, repatchTudo: boolean, mudadas: Set<string> | null): void {
    const { map, layerDef, loja } = estado;
    const sel = this.selecionadas.get(layerDef);
    const carregado = this.estaCarregado(map);
    const zoom = carregado ? map.getZoom() : 0;
    const limites = carregado && loja.size > LIMITE_CULLING ? map.getBounds().pad(FOLGA_VIEWPORT) : null;
    const caixaTela = limites ? this.caixaDe(limites) : null;
    estado.culling = limites !== null;

    // --- candidatas por viewport ---
    const candidatas: Iterable<string> = caixaTela ? estado.indice.consultar(caixaTela) : loja.keys();
    const desejadas = new Set<string>(candidatas);
    if (sel) for (const id of sel) if (loja.has(id)) desejadas.add(id);
    for (const id of [...desejadas]) { const f = loja.get(id); if (f && !this.desenhavel(estado, f)) desejadas.delete(id); }

    // --- clusters de pontos ---
    const clustersDesejados = new Map<string, { coordenada: LatLonPar; total: number; assinatura: string }>();
    const ag = carregado ? this.agrupadorAtivo(estado, zoom) : null;
    if (!ag) estado.agrupador = null;
    if (ag) {
      // ponto agrupado sai da lista individual (a menos que esteja selecionado)
      for (const id of [...desejadas]) if (ag.emCluster(id)) desejadas.delete(id);
      const selPorCelula = new Map<string, PontoCluster[]>();
      if (sel) {
        for (const id of sel) {
          const chave = ag.chaveDoPonto(id);
          const m = chave === undefined ? undefined : ag.celula(chave)?.membros.get(id);
          if (chave !== undefined && m) {
            const l = selPorCelula.get(chave);
            if (l) l.push(m);
            else selPorCelula.set(chave, [m]);
          }
        }
      }
      for (const [chave, cel] of ag.celulasAgrupadas()) {
        const selecionados = selPorCelula.get(chave);
        // selecionados nunca entram em cluster, nem fora da tela
        if (selecionados) for (const m of selecionados) desejadas.add(m.id);
        const total = cel.membros.size;
        const nRest = total - (selecionados?.length ?? 0);
        if (nRest === 1) {
          for (const m of cel.membros.values()) {
            if (sel?.has(m.id)) continue;
            const caixa = estado.indice.caixaDe(m.id);
            if (!caixaTela || (caixa && caixasSeTocam(caixa, caixaTela))) desejadas.add(m.id);
            break;
          }
        }
        if (limites && !limites.contains([cel.somaLat / total, cel.somaLon / total])) continue;
        if (nRest >= 2) {
          let lat = cel.somaLat;
          let lon = cel.somaLon;
          if (selecionados) for (const m of selecionados) { lat -= m.coordenada[0]; lon -= m.coordenada[1]; }
          const centro: LatLonPar = [lat / nRest, lon / nRest];
          clustersDesejados.set(chave, {
            coordenada: centro, total,
            assinatura: `${chave}:${total}:${nRest}:${centro[0].toFixed(7)}:${centro[1].toFixed(7)}`
          });
        }
      }
    }

    // --- materializa feições ---
    for (const id of desejadas) {
      const f = loja.get(id);
      if (f) this.materializar(group, estado, f, zoom, !!sel?.has(id), repatchTudo || !!mudadas?.has(id));
    }
    for (const id of [...estado.entradas.keys()]) {
      if (desejadas.has(id) && loja.has(id)) continue;
      this.tirarEntrada(group, estado, id);
    }

    // --- materializa clusters ---
    for (const [chave, c] of clustersDesejados) this.colocarCluster(group, estado, chave, c);
    for (const chave of [...estado.clusters.keys()]) {
      if (!clustersDesejados.has(chave)) this.tirarCluster(group, estado, chave);
    }
  }

  /**
   * Reconcilia só o que o delta tocou (o custo não depende do tamanho da camada). Cai no reconcile completo quando
   * o estado de conjunto muda: regra oficial × prévia, entrada/saída do corte por viewport ou do agrupamento.
   */
  private reconciliarParcial(group: Grupo, estado: Estado, mudadas: string[], removidas: string[], oficiaisMudou: boolean): void {
    const { map, layerDef, loja } = estado;
    const carregado = this.estaCarregado(map);
    const zoom = carregado ? map.getZoom() : 0;
    const culling = carregado && loja.size > LIMITE_CULLING;
    const clusterAtivo = carregado && deveAgrupar(estado.nPontos, zoom);
    const ag = estado.agrupador;
    if (
      oficiaisMudou || culling !== estado.culling || clusterAtivo !== (ag !== null) ||
      (ag !== null && (ag.zoom !== zoom || estado.agrupadorRev !== estado.revisaoBase))
    ) {
      this.reconciliar(group, estado, false, new Set(mudadas));
      return;
    }

    const sel = this.selecionadas.get(layerDef);
    const visivelV = (f: Feicao): boolean => this.desenhavel(estado, f);
    const limites = culling ? map.getBounds().pad(FOLGA_VIEWPORT) : null;
    const caixaTela = limites ? this.caixaDe(limites) : null;

    const individual = (id: string, repatch: boolean): void => {
      const f = loja.get(id);
      if (!f || !visivelV(f)) {
        this.tirarEntrada(group, estado, id);
        return;
      }
      const selecionada = !!sel?.has(id);
      if (!selecionada && caixaTela) {
        const c = estado.indice.caixaDe(id);
        if (!c || !caixasSeTocam(c, caixaTela)) {
          this.tirarEntrada(group, estado, id);
          return;
        }
      }
      this.materializar(group, estado, f, zoom, selecionada, repatch);
    };

    const tocadas = new Set<string>();
    const individuais: string[] = [];
    for (const id of removidas) {
      this.tirarEntrada(group, estado, id);
      const c = ag?.remover(id);
      if (c !== undefined) tocadas.add(c);
    }
    for (const id of mudadas) {
      const f = loja.get(id);
      if (!f) continue;
      const antiga = ag?.remover(id);
      if (antiga !== undefined) tocadas.add(antiga);
      if (ag && f.geometria.tipo === 'Point' && visivelV(f)) tocadas.add(ag.inserir({ id, coordenada: f.geometria.coordenada }));
      else individuais.push(id);
    }
    for (const id of individuais) individual(id, true);

    if (!ag) return;
    const trocadas = new Set(mudadas);
    for (const chave of tocadas) {
      const cel = ag.celula(chave);
      if (!cel || cel.membros.size < 2) {
        this.tirarCluster(group, estado, chave);
        if (cel) for (const id of cel.membros.keys()) individual(id, trocadas.has(id));
        continue;
      }
      const total = cel.membros.size;
      let lat = cel.somaLat;
      let lon = cel.somaLon;
      let nSel = 0;
      for (const m of cel.membros.values()) {
        if (sel?.has(m.id)) {
          nSel++;
          lat -= m.coordenada[0];
          lon -= m.coordenada[1];
        }
      }
      const nRest = total - nSel;
      for (const m of cel.membros.values()) {
        if (sel?.has(m.id) || nRest === 1) individual(m.id, trocadas.has(m.id));
        else this.tirarEntrada(group, estado, m.id);
      }
      const centroTotal: LatLonPar = [cel.somaLat / total, cel.somaLon / total];
      if ((limites && !limites.contains(centroTotal)) || nRest < 2) {
        this.tirarCluster(group, estado, chave);
        continue;
      }
      const centro: LatLonPar = [lat / nRest, lon / nRest];
      this.colocarCluster(group, estado, chave, {
        coordenada: centro, total,
        assinatura: `${chave}:${total}:${nRest}:${centro[0].toFixed(7)}:${centro[1].toFixed(7)}`
      });
    }
  }

  private criarMarcadorCluster(coordenada: LatLonPar, n: number, obterMembros: () => PontoCluster[], estado: Estado): L.Marker {
    const tam = n < 10 ? 30 : n < 100 ? 38 : 46;
    const cor = corSegura(estado.layerDef.estilo.corPrimaria, COR_PADRAO);
    const icone = L.divIcon({
      className: 'custom-leaflet-marker cad-feicao-cluster',
      iconSize: [tam, tam],
      html:
        `<div style="width:${tam}px;height:${tam}px;border-radius:50%;background:${cor};opacity:.9;` +
        `border:2px solid rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;` +
        `color:#fff;font:700 12px sans-serif;text-shadow:0 0 2px #000">${n}</div>`
    });
    const marker = L.marker(coordenada, {
      icon: icone, pane: garantirSubPane(estado.map, estado.layerDef.id, 'ponto'), keyboard: false
    });
    marker.bindTooltip(`${n} feições agrupadas`, { direction: 'top' });
    marker.on('click', () => {
      const membros = obterMembros();
      if (membros.length > 0) estado.map.fitBounds(L.latLngBounds(membros.map((m) => m.coordenada)), { padding: [60, 60], maxZoom: 18 });
    });
    return marker;
  }

  /**
   * Marca como selecionadas as feições `ids` deste grupo (as demais voltam ao estilo normal).
   * Só as que mudaram são tocadas; mudanças grandes são aplicadas em blocos, as visíveis primeiro.
   * Pontos selecionados saem dos clusters; ao desmarcar, voltam a ser agrupados.
   */
  public aplicarSelecao(group: Grupo, ids: Set<string>): void {
    const estado = this.estados.get(group);
    if (!estado) return;
    const anterior = this.selecionadas.get(estado.layerDef) ?? new Set<string>();
    const novo = new Set(ids);
    this.selecionadas.set(estado.layerDef, novo);

    const mudadas: string[] = [];
    for (const id of novo) if (!anterior.has(id)) mudadas.push(id);
    for (const id of anterior) if (!novo.has(id)) mudadas.push(id);
    if (mudadas.length === 0) return;

    const mapa = estado.entradas;
    const aplicar = (id: string): void => {
      const e = mapa.get(id);
      if (!e) return;
      const sel = novo.has(id);
      this.remendar(e.layer, this.paraDesenho(e.feicao, e.zoomDesenho), estado.layerDef, estado.interativo, sel);
      if (sel && 'bringToFront' in e.layer) (e.layer as L.Path).bringToFront();
    };

    const token = (this.tokenLote.get(group) ?? 0) + 1;
    this.tokenLote.set(group, token);

    if (mudadas.length <= LIMITE_LOTE_SELECAO) {
      mudadas.forEach(aplicar);
    } else {
      const carregado = !!(estado.map as unknown as { _loaded?: boolean })._loaded;
      const limites = carregado ? estado.map.getBounds() : null;
      const visivel = (id: string): boolean => {
        const l = mapa.get(id)?.layer as any;
        if (!limites) return true;
        if (l?.getBounds) return limites.intersects(l.getBounds());
        if (l?.getLatLng) return limites.contains(l.getLatLng());
        return true;
      };
      const naTela = mudadas.filter(visivel);
      const resto = mudadas.filter((id) => !visivel(id));
      naTela.forEach(aplicar);

      const passo = (): void => {
        if (this.tokenLote.get(group) !== token) return;
        resto.splice(0, TAMANHO_BLOCO_SELECAO).forEach(aplicar);
        if (resto.length > 0) agendarQuadro(passo);
      };
      if (resto.length > 0) agendarQuadro(passo);
    }

    // pontos que entram/saem de cluster por causa da seleção
    this.reconciliar(group, estado, false, null);
  }

  private formaDe(f: Feicao): string {
    const g = f.geometria;
    if (g.tipo === 'Point') return `Point:${f.estilo?.icone && ICONES_FEICAO[f.estilo.icone] ? f.estilo.icone : ''}`;
    // a camada Leaflet de uma curva é de outra classe: trocar entre curva e poligonal recria
    return nosDaGeometria(g) ? `${g.tipo}:curva` : g.tipo;
  }

  private paneDe(f: Feicao): TipoGeometriaPane {
    switch (f.geometria.tipo) {
      case 'Polygon':
      case 'Circle': return 'poligono';
      case 'LineString': return 'linha';
      case 'Point': return 'ponto';
      default: return 'texto';
    }
  }

  private estiloVetor(f: Feicao, layerDef: CanvasLayerDef, interativo: boolean, selecionada = false): L.PathOptions {
    const e: EstiloFeicao = f.estilo ?? {};
    const cor = corSegura(e.corTraco ?? layerDef.estilo.corPrimaria, COR_PADRAO);
    const area = f.geometria.tipo === 'Polygon' || f.geometria.tipo === 'Circle';
    const ponto = f.geometria.tipo === 'Point';
    // ponto sem ícone: o contorno pode ter cor e espessura próprias
    const corContorno = ponto ? corSegura(e.corContorno, '') || cor : cor;
    const pesoContorno = ponto && typeof e.espessuraContorno === 'number' && Number.isFinite(e.espessuraContorno) && e.espessuraContorno >= 0
      ? e.espessuraContorno
      : undefined;
    const peso = pesoContorno ?? e.espessuraTraco ?? layerDef.estilo.espessuraLinha ?? 2;
    const opacidadeFill = e.opacidadePreenchimento ?? (area ? 0.2 : 0.85);
    return {
      color: selecionada ? COR_SELECAO : corContorno,
      stroke: !(pesoContorno === 0 && !selecionada),
      weight: selecionada ? peso + 2 : peso,
      dashArray: e.dashArray ?? (statusDe(f) === 'previa' ? '6 4' : layerDef.estilo.dashArray),
      fill: area || f.geometria.tipo === 'Point',
      fillColor: corSegura(e.corPreenchimento, cor),
      fillOpacity: selecionada ? Math.min(1, opacidadeFill + 0.18) : opacidadeFill,
      lineJoin: 'round',
      interactive: interativo
    };
  }

  private criar(f: Feicao, layerDef: CanvasLayerDef, map: L.Map, interativo: boolean, selecionada: boolean): L.Layer {
    const pane = garantirSubPane(map, layerDef.id, this.paneDe(f));
    const g = f.geometria;
    const estilo = this.estiloVetor(f, layerDef, interativo, selecionada);

    const curva = criarCamadaCurva(g, { ...estilo, pane });
    if (curva) return curva;

    switch (g.tipo) {
      case 'Polygon':
        return L.polygon(g.aneis.length === 1 ? g.aneis[0] : g.aneis, { ...estilo, pane });
      case 'Circle':
        return L.circle(g.centro, { ...estilo, radius: g.raioMetros, pane });
      case 'LineString':
        return L.polyline(g.partes && g.partes.length > 1 ? partesDaLinha(g) : g.coordenadas, { ...estilo, pane });
      case 'Point': {
        const nomeIcone = f.estilo?.icone;
        if (nomeIcone && ICONES_FEICAO[nomeIcone]) {
          return L.marker(g.coordenada, { icon: this.iconeSvg(f, layerDef, selecionada), pane, interactive: interativo });
        }
        return L.circleMarker(g.coordenada, {
          ...estilo,
          radius: (f.estilo?.tamanhoIcone ?? layerDef.estilo.tamanhoMarcador ?? 8) / 2,
          pane
        });
      }
      default:
        return L.marker(g.coordenada, {
          icon: this.iconeTexto(f, layerDef, selecionada),
          pane,
          interactive: interativo,
          draggable: interativo && !f.bloqueada
        });
    }
  }

  private remendar(layer: L.Layer, f: Feicao, layerDef: CanvasLayerDef, interativo: boolean, selecionada: boolean): void {
    const g = f.geometria;
    const estilo = this.estiloVetor(f, layerDef, interativo, selecionada);

    if ((layer instanceof LinhaCurva || layer instanceof PoligonoCurvo) && nosDaGeometria(g)) {
      atualizarCamadaCurva(layer, g);
      layer.setStyle(estilo);
    } else if (g.tipo === 'Polygon') {
      (layer as L.Polygon).setLatLngs(g.aneis.length === 1 ? g.aneis[0] : g.aneis);
      (layer as L.Polygon).setStyle(estilo);
    } else if (g.tipo === 'LineString') {
      (layer as L.Polyline).setLatLngs(g.partes && g.partes.length > 1 ? partesDaLinha(g) : g.coordenadas);
      (layer as L.Polyline).setStyle(estilo);
    } else if (g.tipo === 'Circle') {
      (layer as L.Circle).setLatLng(g.centro);
      (layer as L.Circle).setRadius(g.raioMetros);
      (layer as L.Circle).setStyle(estilo);
    } else if (g.tipo === 'Point' && layer instanceof L.CircleMarker) {
      layer.setLatLng(g.coordenada);
      layer.setRadius((f.estilo?.tamanhoIcone ?? layerDef.estilo.tamanhoMarcador ?? 8) / 2);
      layer.setStyle(estilo);
    } else if (layer instanceof L.Marker) {
      layer.setLatLng(g.tipo === 'Point' || g.tipo === 'Text' ? g.coordenada : layer.getLatLng());
      layer.setIcon(g.tipo === 'Text' ? this.iconeTexto(f, layerDef, selecionada) : this.iconeSvg(f, layerDef, selecionada));
      if (g.tipo === 'Text') {
        const pode = interativo && !f.bloqueada;
        if (pode) layer.dragging?.enable();
        else layer.dragging?.disable();
      }
    }
    this.aplicarRotulo(layer, f);
  }

  private iconeSvg(f: Feicao, layerDef: CanvasLayerDef, selecionada = false): L.DivIcon {
    const e = f.estilo ?? {};
    // o tamanho entra em atributos HTML: só número finito (o dado vem do consumidor, sem garantia de tipo)
    const bruto = e.tamanhoIcone ?? layerDef.estilo.tamanhoMarcador;
    const tam = typeof bruto === 'number' && Number.isFinite(bruto) && bruto > 0 ? bruto : 22;
    const cor = selecionada ? COR_SELECAO : corSegura(e.corTraco ?? e.corPreenchimento ?? layerDef.estilo.corPrimaria, COR_PADRAO);
    const rot = Number.isFinite(e.rotacaoIcone) ? e.rotacaoIcone : 0;
    const caminho = ICONES_FEICAO[e.icone ?? ''] ?? '';
    return L.divIcon({
      className: `custom-leaflet-marker${selecionada ? ' cad-feicao-selecionada' : ''}`,
      iconSize: [tam, tam],
      html:
        `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="${cor}" fill-opacity="0.25" ` +
        `stroke="${cor}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" ` +
        `style="transform:rotate(${rot}deg);overflow:visible;display:block${selecionada ? `;filter:drop-shadow(0 0 3px ${COR_SELECAO})` : ''}">${caminho}</svg>`
    });
  }

  private iconeTexto(f: Feicao, layerDef: CanvasLayerDef, selecionada = false): L.DivIcon {
    const e = f.estilo ?? {};
    const texto = f.geometria.tipo === 'Text' ? f.geometria.texto : '';
    const cor = selecionada ? COR_SELECAO : corSegura(e.corTraco ?? layerDef.estilo.corPrimaria, '#ffffff');
    const tam = Number.isFinite(e.tamanhoFonte) ? e.tamanhoFonte : 13;
    const rot = Number.isFinite(e.rotacaoIcone) ? e.rotacaoIcone : 0;
    const base = `display:inline-block;white-space:nowrap;transform:translate(-50%,-50%) rotate(${rot}deg);color:${cor};font-size:${tam}px;font-weight:600;`;

    // selo (fundo + borda): substitui o halo. Cores só passam por `corSegura`; números só se finitos
    const fundo = corSegura(e.corFundo, '');
    if (fundo) {
      const borda = corSegura(e.corBorda, '');
      const opacidade = typeof e.opacidadeFundo === 'number' && Number.isFinite(e.opacidadeFundo) ? Math.min(1, Math.max(0, e.opacidadeFundo)) : 0.85;
      const raio = typeof e.raioBorda === 'number' && Number.isFinite(e.raioBorda) ? Math.min(50, Math.max(0, e.raioBorda)) : 4;
      const bordaCss = selecionada ? `1px solid ${COR_SELECAO}` : borda ? `1px solid ${borda}` : 'none';
      return L.divIcon({
        className: `custom-leaflet-marker cad-feicao-texto cad-feicao-selo${selecionada ? ' cad-feicao-selecionada' : ''}`,
        iconSize: undefined,
        html:
          `<span style="${base}position:relative;padding:2px 6px;border-radius:${raio}px;border:${bordaCss}">` +
          `<span style="position:absolute;top:0;right:0;bottom:0;left:0;border-radius:inherit;background:${fundo};opacity:${opacidade}"></span>` +
          `<span style="position:relative">${escapeHtml(texto)}</span></span>`
      });
    }

    const halo = e.halo
      ? 'text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;'
      : '';
    return L.divIcon({
      className: `custom-leaflet-marker cad-feicao-texto${selecionada ? ' cad-feicao-selecionada' : ''}`,
      iconSize: undefined,
      html: `<span style="${base}${halo}">${escapeHtml(texto)}</span>`
    });
  }

  private aplicarRotulo(layer: L.Layer, f: Feicao): void {
    const e = f.estilo;
    if (!e?.mostrarRotulo || f.geometria.tipo === 'Text') {
      layer.unbindTooltip();
      return;
    }
    const texto = textoRotulo(f, e.campoRotulo);
    if (!texto) {
      layer.unbindTooltip();
      return;
    }
    const no = document.createElement('span');
    no.textContent = texto;
    if (layer.getTooltip()) {
      layer.setTooltipContent(no);
    } else {
      layer.bindTooltip(no, { permanent: true, direction: 'center', className: 'cad-feicao-rotulo', interactive: false });
    }
  }

  private ligarEventos(
    layer: L.Layer,
    id: string,
    layerDef: CanvasLayerDef,
    mapa: Map<string, Entrada>,
    context: CanvasRenderContext
  ): void {
    layer.on('click', (ev: L.LeafletMouseEvent) => {
      const entrada = mapa.get(id);
      if (!entrada) return;
      const o = ev?.originalEvent;
      context.onLayerAction?.('feicao-clique', {
        camadaId: layerDef.id,
        feicao: entrada.feicao,
        aditivo: !!(o && (o.ctrlKey || o.metaKey || o.shiftKey))
      });
    });

    // sem checar `draggable` aqui: o texto pode nascer bloqueado e ser liberado depois (remendar liga o arraste)
    if (layer instanceof L.Marker) {
      layer.on('dragend', () => {
        const entrada = mapa.get(id);
        if (!entrada || entrada.feicao.geometria.tipo !== 'Text') return;
        const { lat, lng } = (layer as L.Marker).getLatLng();
        entrada.feicao = {
          ...entrada.feicao,
          geometria: { ...entrada.feicao.geometria, coordenada: [lat, lng] }
        };
        context.onLayerAction?.('feicao-movida', { camadaId: layerDef.id, feicao: entrada.feicao });
      });
    }
  }
}
