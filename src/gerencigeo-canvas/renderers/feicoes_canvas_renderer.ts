import L from 'leaflet';
import { garantirSubPane, nomePane } from '../layer_pane_ops';
import type { CanvasLayerDef, CanvasRenderContext } from '../types';
import type { Feicao, LatLonPar } from '../feature_types';
import type { CaixaGeo } from '../feature_indice';
import { feicaoNoPonto } from '../feature_amostra';
import { registrarFonteHit, removerFonteHit, type FonteHit } from '../layer_hit_test';
import { LinhaCurva, PoligonoCurvo, atualizarCamadaCurva, criarCamadaCurva, nosDaGeometria } from '../curva_leaflet';
import { MotorFormas } from '../motor/motor-formas';
import { latLonDoMundo } from '../motor/geometria-px';
import { estiloVetorDe } from '../motor/estilo';
import type { CamadaDesenho, DefCamadaMotor, ItemDesenho, ListaDesenho, Vista } from '../motor/tipos';
import { PintorCanvas2D, contarItensCanvas, type RegiaoPx } from './renderizador_formas';
import { CanvasFormas, type QuadroCanvas } from './canvas_formas_leaflet';
import { iconeCluster, iconeSvg, iconeTexto, opcoesPath } from './marcadores_feicoes';
import { selecaoVisual } from './selecao_visual';
import type { DeltaFeicoes } from './feicoes_renderer';
import type { EstatisticasFeicoes, IRenderizadorFeicoes } from './renderizador_feicoes_tipos';

/*
 * Renderizador de feições em Canvas 2D (`renderizador="canvas"`). Três camadas, de baixo para cima:
 *
 *   motor (headless)  →  renderizador (pinta)  →  ponte Leaflet (esta classe)
 *
 * O Leaflet continua dono do mapa (tiles, pan, zoom, eventos) e deixa de ter um objeto por forma: cada camada tem um
 * canvas no próprio pane (z-order, opacidade de grupo, visibilidade e bloqueio seguem o pane, como no caminho
 * `leaflet`), e UM canvas de sobreposição por mapa (seleção, destaque e edição), de modo que selecionar não repinta a
 * base. Pan: o canvas se move por CSS com o mapa e é repintado no fim do movimento.
 *
 * Seguem como marcadores DOM do Leaflet (dependem de CSS e de arraste), limitados à vista pelo motor: ponto com ícone
 * SVG, `Text` (selo/halo), cluster e rótulo permanente. Curvas Bézier seguem no caminho Leaflet legado (híbrido).
 * O clique nas formas vem do hit-test central do mapa (`layer_hit_test`, via `FonteHit`).
 */

const PANE_SOBREPOSICAO = 'cad-formas-sobreposicao';
const Z_SOBREPOSICAO = '7000';
/** Tolerância (px) de clique em formas pintadas no canvas. */
const TOLERANCIA_CLIQUE_PX = 8;
/** Folga (px) ao redor de uma faixa exposta no pan incremental: o traço de uma feição vizinha pode entrar na faixa. */
const MARGEM_FAIXA_PX = 8;
/** Quantas formas empilhadas no mesmo ponto o clique alterna. */
const LIMITE_EMPILHADAS = 20;

const agendarQuadro: (cb: () => void) => void =
  typeof requestAnimationFrame === 'function' ? (cb) => { requestAnimationFrame(cb); } : (cb) => { setTimeout(cb, 16); };

const FORMAS_DOM = new Set<ItemDesenho['forma']>(['icone', 'texto', 'cluster', 'rotulo', 'curva']);

interface MarcadorDom {
  layer: L.Layer;
  fonte: Feicao | null;
  selecionada: boolean;
  assinatura: string;
}

interface Estado {
  layerDef: CanvasLayerDef;
  map: L.Map;
  context: CanvasRenderContext;
  grupo: L.LayerGroup;
  motor: MotorFormas;
  base: CanvasFormas;
  pintor: PintorCanvas2D;
  quadro: QuadroCanvas | null;
  interativo: boolean;
  dom: Map<string, MarcadorDom>;
  fonteHit: FonteHit | null;
  agendado: boolean;
  agendadoDom: boolean;
  vivo: boolean;
  /** Última lista de desenho da camada (estatísticas e comparação com o caminho `leaflet`). */
  ultima: CamadaDesenho | null;
}

/** Sobreposição compartilhada por mapa: seleção, destaque e edição de todas as camadas. */
interface Sobreposicao {
  canvas: CanvasFormas;
  estados: Set<Estado>;
  pintor: PintorCanvas2D;
  quadro: QuadroCanvas | null;
  agendado: boolean;
  noMapa: boolean;
}

const sobreposicoes = new WeakMap<L.Map, Sobreposicao>();

function vistaDe(q: QuadroCanvas): Vista {
  return { caixa: q.caixa, zoom: q.zoom, larguraPx: q.larguraPx, alturaPx: q.alturaPx, dpr: q.dpr, origemPx: q.origemPx };
}

const mapaCarregado = (map: L.Map): boolean => !!(map as unknown as { _loaded?: boolean })._loaded;

function sobreposicaoDe(map: L.Map): Sobreposicao {
  const existente = sobreposicoes.get(map);
  if (existente) return existente;
  const sob = { estados: new Set<Estado>(), quadro: null, agendado: false, noMapa: false } as unknown as Sobreposicao;
  sob.pintor = new PintorCanvas2D({
    camada: () => null,
    sobreposicao: () => (sob.quadro ? { ctx: sob.quadro.ctx, largura: sob.quadro.larguraPx, altura: sob.quadro.alturaPx, dpr: sob.quadro.dpr } : null)
  });
  sob.canvas = new CanvasFormas({ pane: PANE_SOBREPOSICAO, padding: 0.1 }, (q) => {
    sob.quadro = q;
    const vista = vistaDe(q);
    const camadas: CamadaDesenho[] = [];
    for (const e of [...sob.estados].sort((a, b) => a.layerDef.zIndex - b.layerDef.zIndex)) {
      if (!e.vivo || !e.layerDef.visivel) continue;
      const c = e.motor.listaSobreposicao(e.layerDef.id, vista);
      if (c && c.itens.length > 0) camadas.push(c);
    }
    if (q.branco && camadas.length === 0) return false; // sem seleção nem destaque: não toca no canvas
    sob.pintor.desenhar({ vista, origem: q.origemPx, camadas }, vista, { alvo: 'sobreposicao' });
    return camadas.length > 0;
  });
  sobreposicoes.set(map, sob);
  return sob;
}

function anexarSobreposicao(map: L.Map, sob: Sobreposicao): void {
  if (sob.noMapa) return;
  sob.noMapa = true;
  map.whenReady(() => {
    if (!map.getPane(PANE_SOBREPOSICAO)) {
      const p = map.createPane(PANE_SOBREPOSICAO);
      p.style.zIndex = Z_SOBREPOSICAO;
      p.style.pointerEvents = 'none';
    }
    if (sobreposicoes.get(map) === sob) map.addLayer(sob.canvas);
  });
}

function pedirSobreposicao(sob: Sobreposicao): void {
  if (sob.agendado) return;
  sob.agendado = true;
  agendarQuadro(() => {
    sob.agendado = false;
    if (sob.noMapa) sob.canvas.pintar();
  });
}

export class FeicoesCanvasRenderer implements IRenderizadorFeicoes {
  private estados = new WeakMap<L.LayerGroup, Estado>();
  /** Por definição de camada, para a seleção sobreviver à recriação do grupo (ocultar e exibir a camada). */
  private selecionadas = selecaoVisual;

  // ---------------------------------------------------------------- ILayerRenderer

  public render(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext): L.LayerGroup {
    const grupo = L.layerGroup();
    const motor = new MotorFormas();
    const regra = context.regraVersoes;
    if (regra) motor.definirRegra((f, comOficial) => regra.visivel(f, comOficial));
    motor.definirCamada(this.defMotor(layerDef));
    motor.definirFeicoes(layerDef.id, this.feicoesDe(layerDef));
    const sel = this.selecionadas.get(layerDef);
    if (sel) motor.selecionar(layerDef.id, sel);

    const estado = { layerDef, map, context, grupo, motor, interativo: layerDef.interativo && !layerDef.bloqueada, quadro: null, dom: new Map(), fonteHit: null, agendado: false, agendadoDom: false, vivo: true, ultima: null } as unknown as Estado;
    estado.pintor = new PintorCanvas2D({
      camada: () => (estado.quadro ? { ctx: estado.quadro.ctx, largura: estado.quadro.larguraPx, altura: estado.quadro.alturaPx, dpr: estado.quadro.dpr } : null),
      sobreposicao: () => null
    });
    if (!map.getPane(nomePane(layerDef.id))) map.createPane(nomePane(layerDef.id));
    estado.base = new CanvasFormas({ pane: nomePane(layerDef.id), padding: 0.1, incremental: true }, (q) => this.pintarBase(estado, q));
    this.estados.set(grupo, estado);

    // o canvas só entra com o mapa já com vista (o Leaflet exige centro e zoom para dimensionar o canvas)
    map.whenReady(() => {
      if (estado.vivo) grupo.addLayer(estado.base);
    });
    const sob = sobreposicaoDe(map);
    sob.estados.add(estado);
    anexarSobreposicao(map, sob);
    this.registrarHit(estado);
    return grupo;
  }

  public update(
    layerDef: CanvasLayerDef,
    grupo: L.Layer | L.LayerGroup,
    changes: Partial<CanvasLayerDef>,
    context: CanvasRenderContext,
    _map: L.Map
  ): void {
    const estado = this.estados.get(grupo as L.LayerGroup);
    if (!estado) return;
    estado.layerDef = layerDef;
    estado.context = context;
    estado.interativo = layerDef.interativo && !layerDef.bloqueada;
    // opacidade, zIndex, visibilidade e bloqueio são do pane da camada (o LayerManager os aplica)
    if (changes.dados === undefined && changes.estilo === undefined && changes.interativo === undefined && changes.bloqueada === undefined) return;
    estado.motor.definirCamada(this.defMotor(layerDef));
    if (changes.dados !== undefined) {
      const lista = this.feicoesDe(layerDef);
      const delta = (layerDef.dados as { delta?: DeltaFeicoes } | undefined)?.delta;
      if (delta) estado.motor.aplicarDelta(layerDef.id, lista, delta);
      else estado.motor.definirFeicoes(layerDef.id, lista);
      const sel = this.selecionadas.get(layerDef);
      if (sel) for (const id of [...sel]) if (!estado.motor.feicao(layerDef.id, id)) sel.delete(id);
    }
    if (changes.estilo !== undefined || changes.interativo !== undefined || changes.bloqueada !== undefined) {
      for (const m of estado.dom.values()) estado.grupo.removeLayer(m.layer); // reconstrói com o estilo e a interatividade novos
      estado.dom.clear();
    }
    this.pedirBase(estado);
  }

  public destroy(grupo: L.Layer | L.LayerGroup, map: L.Map): void {
    const g = grupo as L.LayerGroup;
    const estado = this.estados.get(g);
    if (estado) {
      estado.vivo = false;
      if (estado.fonteHit) removerFonteHit(estado.map, estado.layerDef.id, estado.fonteHit);
      estado.fonteHit = null;
      const sob = sobreposicoes.get(estado.map);
      if (sob) {
        sob.estados.delete(estado);
        pedirSobreposicao(sob);
      }
      estado.pintor.destruir();
      estado.dom.clear();
    }
    g.clearLayers();
    this.estados.delete(g);
    if (map.hasLayer(g)) map.removeLayer(g);
  }

  // ---------------------------------------------------------------- API usada pelo gerenciador de feições

  public reavaliarVersoes(grupo: L.LayerGroup): void {
    const estado = this.estados.get(grupo);
    if (!estado) return;
    estado.motor.reavaliarVersoes(estado.layerDef.id);
    this.pedirBase(estado);
  }

  public feicaoVisivel(grupo: L.LayerGroup, f: Feicao): boolean {
    const estado = this.estados.get(grupo);
    return !estado || estado.motor.feicaoVisivel(estado.layerDef.id, f);
  }

  public consultarProximas(grupo: L.LayerGroup, caixa: CaixaGeo): Feicao[] {
    const estado = this.estados.get(grupo);
    return estado ? estado.motor.consultarCaixa(estado.layerDef.id, caixa) : [];
  }

  /** Geometria provisória (arrasto de vértice): a feição sai do base e a sobreposição a mostra com a geometria nova. */
  public previsualizar(grupo: L.LayerGroup, f: Feicao): void {
    const estado = this.estados.get(grupo);
    if (!estado) return;
    const id = estado.layerDef.id;
    const primeira = !estado.motor.temPrevia(id, f.id);
    estado.motor.previsualizar(id, f);
    if (primeira) this.pedirBase(estado);
    const sob = sobreposicoes.get(estado.map);
    if (sob) pedirSobreposicao(sob);
  }

  /**
   * Marca como selecionadas as feições `ids` da camada. O custo é O(mudanças): a seleção só repinta a sobreposição e
   * atualiza os marcadores DOM afetados; a base só é refeita se um ponto sob cluster entrou ou saiu da seleção.
   */
  public aplicarSelecao(grupo: L.LayerGroup, ids: Set<string>): void {
    const estado = this.estados.get(grupo);
    if (!estado) return;
    const camadaId = estado.layerDef.id;
    this.selecionadas.set(estado.layerDef, new Set(ids));
    const { entrou, saiu } = estado.motor.selecionar(camadaId, ids);
    if (entrou.length === 0 && saiu.length === 0) return;
    const mudadas = [...entrou, ...saiu];
    for (const id of mudadas) this.atualizarSelecaoDom(estado, id);
    // ponto sob cluster: a contagem do cluster muda (DOM). O canvas base não depende da seleção: nunca é repintado por ela
    if (estado.motor.selecaoAfetaAgrupamento(camadaId, mudadas)) this.pedirDom(estado);
    const sob = sobreposicoes.get(estado.map);
    if (sob) pedirSobreposicao(sob);
  }

  public estatisticas(grupo: L.LayerGroup): EstatisticasFeicoes | null {
    const estado = this.estados.get(grupo);
    if (!estado) return null;
    const c = this.listaAtual(estado);
    const st = c?.estatisticas ?? estado.motor.estatisticas(estado.layerDef.id);
    if (!st) return null;
    return {
      total: st.total, materializadas: st.desenhadas + st.marcadoresDom, marcasLOD: st.marcasLOD, clusters: st.clusters,
      avaliacoesLOD: st.avaliacoesLOD, desenhadas: st.desenhadas, marcadoresDom: st.marcadoresDom, canvases: 2, renderizador: 'canvas'
    };
  }

  /** Detalhe completo = formas, marcadores DOM e as selecionadas (a sobreposição as desenha inteiras); marca = LOD. */
  public idsDesenhados(grupo: L.LayerGroup): { materializadas: string[]; marcas: string[] } | null {
    const estado = this.estados.get(grupo);
    if (!estado) return null;
    const c = this.listaAtual(estado);
    if (!c) return { materializadas: [], marcas: [] };
    const sel = estado.motor.selecionadas(estado.layerDef.id);
    const materializadas = new Set<string>();
    const marcas = new Set<string>();
    for (const it of c.itens) {
      if (it.forma === 'cluster' || it.forma === 'rotulo') continue;
      if (it.forma === 'marca') {
        if (sel.has(it.id)) materializadas.add(it.id);
        else marcas.add(it.id);
      } else materializadas.add(it.id);
    }
    // a sobreposição desenha em detalhe completo o que a seleção solta (inclui pontos de cluster)
    const q = estado.base.quadroAtual();
    const sobre = q ? estado.motor.listaSobreposicao(estado.layerDef.id, vistaDe(q)) : null;
    for (const it of sobre?.itens ?? []) materializadas.add(it.id);
    return { materializadas: [...materializadas].sort(), marcas: [...marcas].sort() };
  }

  /** Repinta já (testes e benchmark; no uso normal o repaint é agendado por quadro). */
  public redesenharAgora(grupo: L.LayerGroup): void {
    const estado = this.estados.get(grupo);
    if (!estado) return;
    estado.base.pintar();
    sobreposicoes.get(estado.map)?.canvas.pintar();
  }

  // ---------------------------------------------------------------- pintura

  private defMotor(layerDef: CanvasLayerDef): DefCamadaMotor {
    return {
      id: layerDef.id, zIndex: layerDef.zIndex, opacidade: layerDef.opacidade, visivel: layerDef.visivel,
      interativo: layerDef.interativo, bloqueada: layerDef.bloqueada, estilo: layerDef.estilo ?? {}
    };
  }

  private feicoesDe(layerDef: CanvasLayerDef): Feicao[] {
    const d = layerDef.dados;
    const lista = Array.isArray(d) ? d : d?.feicoes;
    return Array.isArray(lista) ? (lista as Feicao[]) : [];
  }

  private pedirBase(estado: Estado): void {
    if (estado.agendado || !estado.vivo) return;
    estado.agendado = true;
    agendarQuadro(() => {
      estado.agendado = false;
      if (estado.vivo) estado.base.pintar();
    });
  }

  /** Sincroniza só os marcadores DOM com a vista atual (clusters, ícones, textos, rótulos), sem repintar o canvas. */
  private pedirDom(estado: Estado): void {
    if (estado.agendadoDom || !estado.vivo) return;
    estado.agendadoDom = true;
    agendarQuadro(() => {
      estado.agendadoDom = false;
      if (!estado.vivo) return;
      const q = estado.base.quadroAtual();
      if (!q) return;
      const dom = estado.motor.listaDesenho(vistaDe(q), { camadas: [estado.layerDef.id], parte: 'dom' }).camadas[0];
      if (dom) this.sincronizarDom(estado, dom);
    });
  }

  /** Lista do quadro atual da camada (sem pintar). */
  private listaAtual(estado: Estado): CamadaDesenho | null {
    const q = estado.base.quadroAtual();
    if (!q) return estado.ultima;
    return estado.motor.listaDesenho(vistaDe(q), { camadas: [estado.layerDef.id] }).camadas[0] ?? null;
  }

  /** A vista de uma faixa exposta no pan incremental (a origem continua sendo a do canvas inteiro). */
  private vistaDaFaixa(q: QuadroCanvas, r: RegiaoPx): Vista {
    const m = MARGEM_FAIXA_PX;
    const [latSup, lonEsq] = latLonDoMundo(q.origemPx.x + r.x - m, q.origemPx.y + r.y - m, q.zoom);
    const [latInf, lonDir] = latLonDoMundo(q.origemPx.x + r.x + r.largura + m, q.origemPx.y + r.y + r.altura + m, q.zoom);
    return {
      ...vistaDe(q), larguraPx: r.largura, alturaPx: r.altura,
      caixa: { minLat: latInf, maxLat: latSup, minLon: lonEsq, maxLon: lonDir }
    };
  }

  /**
   * Pinta um quadro. Quadro completo: lista e pintura da vista inteira. Pan incremental (o bitmap já foi deslocado pelo
   * host): só as faixas expostas são listadas e pintadas, recortadas na faixa; os marcadores DOM acompanham a vista
   * inteira (são poucos e não custam projeção nem simplificação).
   */
  private pintarBase(estado: Estado, q: QuadroCanvas): number | boolean {
    if (!estado.vivo) return !q.branco;
    estado.quadro = q;
    const id = estado.layerDef.id;
    // Devolve quantos itens ficaram no bitmap (numa faixa, quantos entraram): o host usa a contagem para decidir, no
    // próximo pan, entre deslocar o bitmap e repintar tudo. Canvas em branco e nada a desenhar: o pintor nem é chamado
    // (até o `clearRect` faria o navegador reenviar o canvas ao compositor).
    let pintados: number | boolean;
    if (!q.regioes) {
      const vista = vistaDe(q);
      const lista: ListaDesenho = estado.motor.listaDesenho(vista, { camadas: [id] });
      const camada = lista.camadas[0] ?? null;
      const n = contarItensCanvas(camada);
      if (!camada) pintados = !q.branco; // camada fora da lista: o pintor não limparia nada
      else if (n === 0 && q.branco) pintados = 0;
      else {
        estado.pintor.desenhar(lista, vista);
        pintados = n;
      }
      estado.ultima = camada;
      if (camada) this.sincronizarDom(estado, camada);
    } else {
      // o host já deslocou o bitmap (ou não, se estava em branco): as faixas expostas estão vazias
      pintados = 0;
      for (const r of q.regioes) {
        const vista = this.vistaDaFaixa(q, r);
        const lista = estado.motor.listaDesenho(vista, { camadas: [id], parte: 'canvas' });
        const n = contarItensCanvas(lista.camadas[0]);
        if (n === 0) continue;
        estado.pintor.desenhar(lista, vista, { limpar: false, recorte: r });
        pintados += n;
      }
      const dom = estado.motor.listaDesenho(vistaDe(q), { camadas: [id], parte: 'dom' }).camadas[0];
      if (dom) this.sincronizarDom(estado, dom);
    }
    const sob = sobreposicoes.get(estado.map);
    if (sob) pedirSobreposicao(sob); // a geometria selecionada pode ter mudado junto com os dados
    return pintados;
  }

  // ---------------------------------------------------------------- marcadores DOM e curvas

  private acao(estado: Estado, feicao: Feicao | undefined, ev?: L.LeafletMouseEvent): void {
    if (!feicao) return;
    const o = ev?.originalEvent;
    estado.context.onLayerAction?.('feicao-clique', {
      camadaId: estado.layerDef.id,
      feicao: estado.motor.feicao(estado.layerDef.id, feicao.id) ?? feicao,
      aditivo: !!(o && (o.ctrlKey || o.metaKey || o.shiftKey))
    });
  }

  private sincronizarDom(estado: Estado, camada: CamadaDesenho): void {
    const vivos = new Set<string>();
    for (const it of camada.itens) {
      if (!FORMAS_DOM.has(it.forma)) continue;
      const chave = `${it.forma}:${it.id}`;
      vivos.add(chave);
      try {
        this.colocarDom(estado, chave, it);
      } catch {
        // Regra #0: um marcador que o Leaflet recusa não derruba os demais
        const m = estado.dom.get(chave);
        if (m) estado.grupo.removeLayer(m.layer);
        estado.dom.delete(chave);
      }
    }
    for (const [chave, m] of estado.dom) {
      if (vivos.has(chave)) continue;
      estado.grupo.removeLayer(m.layer);
      estado.dom.delete(chave);
    }
  }

  private colocarDom(estado: Estado, chave: string, it: ItemDesenho): void {
    const { map, layerDef, grupo } = estado;
    const f = it.feicao ?? null;
    const atual = estado.dom.get(chave);
    const estiloCamada = layerDef.estilo ?? {};

    if (it.forma === 'icone' && f && it.coordenada) {
      if (atual) {
        if (atual.fonte !== f) {
          (atual.layer as L.Marker).setLatLng(it.coordenada);
          (atual.layer as L.Marker).setIcon(iconeSvg(f, estiloCamada, it.selecionada));
          atual.fonte = f;
          atual.selecionada = it.selecionada;
        } else if (atual.selecionada !== it.selecionada) this.trocarIcone(atual, f, estiloCamada, it.selecionada);
        return;
      }
      const marker = L.marker(it.coordenada, { icon: iconeSvg(f, estiloCamada, it.selecionada), pane: garantirSubPane(map, layerDef.id, 'ponto'), interactive: estado.interativo, keyboard: false });
      marker.on('click', (ev: L.LeafletMouseEvent) => this.acao(estado, f, ev));
      grupo.addLayer(marker);
      estado.dom.set(chave, { layer: marker, fonte: f, selecionada: it.selecionada, assinatura: '' });
      return;
    }

    if (it.forma === 'texto' && f && it.coordenada) {
      if (atual) {
        if (atual.fonte !== f) {
          const m = atual.layer as L.Marker;
          m.setLatLng(it.coordenada);
          m.setIcon(iconeTexto(f, estiloCamada, it.selecionada));
          if (estado.interativo && !f.bloqueada) m.dragging?.enable();
          else m.dragging?.disable();
          atual.fonte = f;
          atual.selecionada = it.selecionada;
        } else if (atual.selecionada !== it.selecionada) this.trocarIcone(atual, f, estiloCamada, it.selecionada);
        return;
      }
      const marker = L.marker(it.coordenada, {
        icon: iconeTexto(f, estiloCamada, it.selecionada), pane: garantirSubPane(map, layerDef.id, 'texto'),
        interactive: estado.interativo, draggable: estado.interativo && !f.bloqueada, keyboard: false
      });
      marker.on('click', (ev: L.LeafletMouseEvent) => this.acao(estado, f, ev));
      marker.on('dragend', () => {
        const atualF = estado.motor.feicao(layerDef.id, f.id) ?? f;
        if (atualF.geometria.tipo !== 'Text') return;
        const { lat, lng } = marker.getLatLng();
        const movida: Feicao = { ...atualF, geometria: { ...atualF.geometria, coordenada: [lat, lng] } };
        estado.context.onLayerAction?.('feicao-movida', { camadaId: layerDef.id, feicao: movida });
      });
      grupo.addLayer(marker);
      estado.dom.set(chave, { layer: marker, fonte: f, selecionada: it.selecionada, assinatura: '' });
      return;
    }

    if (it.forma === 'cluster' && it.coordenada) {
      const total = it.total ?? 0;
      const assinatura = `${it.id}:${total}:${it.restantes ?? 0}:${it.coordenada[0].toFixed(7)}:${it.coordenada[1].toFixed(7)}`;
      if (atual?.assinatura === assinatura) return;
      if (atual) grupo.removeLayer(atual.layer);
      const marker = L.marker(it.coordenada, { icon: iconeCluster(total, estiloCamada), pane: garantirSubPane(map, layerDef.id, 'ponto'), keyboard: false });
      marker.bindTooltip(`${total} feições agrupadas`, { direction: 'top' });
      marker.on('click', () => {
        const membros = estado.motor.membrosDoCluster(layerDef.id, it.id);
        if (membros.length > 0) map.fitBounds(L.latLngBounds(membros.map((m) => m.coordenada)), { padding: [60, 60], maxZoom: 18 });
      });
      grupo.addLayer(marker);
      estado.dom.set(chave, { layer: marker, fonte: null, selecionada: false, assinatura });
      return;
    }

    if (it.forma === 'rotulo' && it.coordenada && it.texto) {
      const assinatura = `${it.texto}:${it.coordenada[0]}:${it.coordenada[1]}`;
      if (atual?.assinatura === assinatura) return;
      if (atual) grupo.removeLayer(atual.layer);
      const no = document.createElement('span');
      no.textContent = it.texto;
      const marker = L.marker(it.coordenada, {
        icon: L.divIcon({ className: 'cad-feicao-rotulo-ancora', iconSize: [0, 0] }),
        pane: garantirSubPane(map, layerDef.id, 'texto'), interactive: false, keyboard: false
      });
      marker.bindTooltip(no, { permanent: true, direction: 'center', className: 'cad-feicao-rotulo', interactive: false });
      grupo.addLayer(marker);
      estado.dom.set(chave, { layer: marker, fonte: null, selecionada: false, assinatura });
      return;
    }

    if (it.forma === 'curva' && f) {
      const g = f.geometria;
      const estilo = (sel: boolean): L.PathOptions => opcoesPath(estiloVetorDe(f, estiloCamada, sel), estado.interativo);
      if (atual) {
        const camada = atual.layer as LinhaCurva | PoligonoCurvo;
        if (atual.fonte !== f) {
          atualizarCamadaCurva(camada, g);
          camada.setStyle(estilo(it.selecionada));
          atual.fonte = f;
          atual.selecionada = it.selecionada;
        } else if (atual.selecionada !== it.selecionada) {
          camada.setStyle(estilo(it.selecionada));
          atual.selecionada = it.selecionada;
        }
        return;
      }
      const camada = criarCamadaCurva(g, { ...estilo(it.selecionada), pane: garantirSubPane(map, layerDef.id, g.tipo === 'Polygon' ? 'poligono' : 'linha') });
      if (!camada || !nosDaGeometria(g)) return;
      camada.on('click', (ev: L.LeafletMouseEvent) => this.acao(estado, f, ev));
      grupo.addLayer(camada);
      estado.dom.set(chave, { layer: camada, fonte: f, selecionada: it.selecionada, assinatura: '' });
    }
  }

  private trocarIcone(m: MarcadorDom, f: Feicao, estiloCamada: CanvasLayerDef['estilo'], selecionada: boolean): void {
    const marker = m.layer as L.Marker;
    marker.setIcon(f.geometria.tipo === 'Text' ? iconeTexto(f, estiloCamada, selecionada) : iconeSvg(f, estiloCamada, selecionada));
    m.selecionada = selecionada;
  }

  /** A seleção de UMA feição mudou: só o marcador DOM (ícone, texto) ou a curva dela precisa de aparência nova. */
  private atualizarSelecaoDom(estado: Estado, id: string): void {
    const f = estado.motor.feicao(estado.layerDef.id, id);
    if (!f) return;
    const sel = estado.motor.selecionadas(estado.layerDef.id).has(id);
    const estiloCamada = estado.layerDef.estilo ?? {};
    for (const chave of [`icone:${id}`, `texto:${id}`]) {
      const m = estado.dom.get(chave);
      if (m && m.selecionada !== sel) this.trocarIcone(m, f, estiloCamada, sel);
    }
    const c = estado.dom.get(`curva:${id}`);
    if (c && c.selecionada !== sel) {
      (c.layer as LinhaCurva | PoligonoCurvo).setStyle(opcoesPath(estiloVetorDe(f, estiloCamada, sel), estado.interativo));
      c.selecionada = sel;
    }
  }

  // ---------------------------------------------------------------- hit-test central

  /**
   * Formas pintadas no canvas respondem ao clique pelo hit-test central do mapa, na geometria ORIGINAL (índice +
   * `feicaoNoPonto`). Ícones, textos e curvas têm objetos Leaflet próprios e não entram aqui; pontos dentro de um
   * cluster também não (o cluster é que responde).
   */
  private registrarHit(estado: Estado): void {
    const fonte: FonteHit = {
      alvo: estado.base,
      consultar: (ponto) => {
        const { map, layerDef, motor } = estado;
        if (!estado.vivo || !estado.interativo || !layerDef.visivel || !mapaCarregado(map)) return [];
        const cp = map.layerPointToContainerPoint(ponto);
        const a = map.containerPointToLatLng([cp.x - TOLERANCIA_CLIQUE_PX, cp.y + TOLERANCIA_CLIQUE_PX]);
        const b = map.containerPointToLatLng([cp.x + TOLERANCIA_CLIQUE_PX, cp.y - TOLERANCIA_CLIQUE_PX]);
        const caixa: CaixaGeo = {
          minLat: Math.min(a.lat, b.lat), maxLat: Math.max(a.lat, b.lat), minLon: Math.min(a.lng, b.lng), maxLon: Math.max(a.lng, b.lng)
        };
        const restantes = motor.consultarCaixa(layerDef.id, caixa).filter((f) => {
          if (!motor.feicaoVisivel(layerDef.id, f)) return false;
          const g = f.geometria;
          if (g.tipo === 'Text' || nosDaGeometria(g)) return false;
          if (g.tipo === 'Point') return !f.estilo?.icone && !motor.pontoAgrupado(layerDef.id, f.id);
          return true;
        });
        const projetar = (p: LatLonPar): { x: number; y: number } => {
          const c = map.latLngToContainerPoint(p);
          return { x: c.x, y: c.y };
        };
        const achadas: ReturnType<FonteHit['consultar']> = [];
        for (let n = 0; n < LIMITE_EMPILHADAS && restantes.length > 0; n++) {
          const f = feicaoNoPonto({ x: cp.x, y: cp.y }, restantes, projetar);
          if (!f) break;
          restantes.splice(restantes.indexOf(f), 1);
          const c = motor.caixaDe(layerDef.id, f.id);
          const area = c ? (() => {
            const p0 = map.latLngToContainerPoint([c.minLat, c.minLon]);
            const p1 = map.latLngToContainerPoint([c.maxLat, c.maxLon]);
            return Math.abs(p1.x - p0.x) * Math.abs(p1.y - p0.y);
          })() : 0;
          achadas.push({
            feicao: f, chave: f.id, distancia: 0, area: Number.isFinite(area) ? area : 0,
            tipo: f.geometria.tipo === 'Point' ? 'ponto' : f.geometria.tipo === 'LineString' ? 'linha' : 'poligono'
          });
        }
        return achadas;
      }
    };
    estado.fonteHit = fonte;
    registrarFonteHit(estado.map, estado.layerDef.id, fonte);
    estado.base.on('click', (ev: L.LeafletEvent) => {
      const { feicaoHit, originalEvent } = ev as unknown as { feicaoHit?: Feicao; originalEvent?: MouseEvent };
      if (!feicaoHit || !estado.vivo) return;
      const o = originalEvent;
      estado.context.onLayerAction?.('feicao-clique', {
        camadaId: estado.layerDef.id,
        feicao: feicaoHit,
        aditivo: !!(o && (o.ctrlKey || o.metaKey || o.shiftKey))
      });
    });
  }
}
