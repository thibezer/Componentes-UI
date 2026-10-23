import { partesDaLinha, type Feicao, type LatLonPar } from '../feature_types';
import type { CaixaGeo } from '../feature_indice';
import { caixasSeTocam } from '../feature_indice';
import { AgrupadorCluster, deveAgrupar } from '../feature_cluster';
import { OPACIDADE_MARCA, diagonalPx, ehMarca, ladoMarca } from '../feature_lod';
import { MIN_VERTICES_SIMPLIFICAR, ZOOM_SEM_SIMPLIFICACAO } from '../feature_simplificacao';
import { nosDaGeometria } from '../feature_curvas';
import { textoRotulo } from '../feature_metricas';
import { entidadeDe } from '../feature_versoes';
import { DadosCamada } from './dados-camada';
import { COR_PADRAO, InternadorEstilos, corSegura, estiloVetorDe, raioPontoPx, type EstiloVetor } from './estilo';
import { projetarCentro, projetarVertices, raioCirculoPx, simplificarPx } from './geometria-px';
import type {
  CamadaDesenho, DefCamadaMotor, DeltaMotor, EstatisticasCamada, ItemDesenho, ListaDesenho, PontoMundo, RegraVisivel, Vista
} from './tipos';

/*
 * Motor das formas: guarda as feições por camada (loja + índice espacial) e, dada uma `Vista`, devolve a lista do
 * que desenhar, com LOD aplicado. Sem `window`, `document` nem Leaflet: importável em Node/SSR e rodável em Worker.
 *
 * - Projeção própria (Web Mercator em Float64Array plano). No pan puro só muda a origem da vista: a geometria
 *   projetada e simplificada fica em cache por (feição, revisão, zoom) e não é reprojetada.
 * - LOD (ver `feature_lod.ts`): feição com diagonal < 3 px vira marca de 1–2 px; acima disso, Douglas-Peucker com
 *   tolerância em px (`MIN_VERTICES_SIMPLIFICAR` vértices ou mais, abaixo de `ZOOM_SEM_SIMPLIFICACAO`).
 * - Hit-test, snap, caixa e laço usam a geometria ORIGINAL (`consultarCaixa` + índice), nunca a lista de desenho.
 * - Entrada hostil (NaN, geometria degenerada, ids duplicados, camada inexistente) nunca lança.
 */

const TOLERANCIA_PX = 1.2;
const LIMITE_RECORTE_CAIXA = 1e-9;
/** Folga (px) na consulta por envelope para o traço de feições logo fora da vista. */
const FOLGA_TRACO_PX = 6;

interface EntradaGeom {
  rev: number;
  /** Polígono/linha: um array por anel/parte. Círculo e marca: `[x, y]` do centro. */
  partes: Float64Array[];
  raioPx: number;
  marca: boolean;
  /** Marca: o item pronto, reaproveitado no pan enquanto feição, estilo da camada, seleção e destaque não mudam. */
  item?: ItemDesenho;
  revEstilo?: number;
}

interface EstiloGuardado {
  rev: number;
  revEstilo: number;
  estilo: EstiloVetor;
}

interface EstadoCamada {
  def: DefCamadaMotor;
  dados: DadosCamada;
  zoomCache: number;
  geom: Map<string, EntradaGeom>;
  estilos: Map<string, EstiloGuardado>;
  /** Feição -> é marca neste zoom? (reavaliado ao mudar de zoom ou de geometria, não a cada pan). */
  lod: Map<string, boolean>;
  avaliacoesLOD: number;
  agrupador: AgrupadorCluster | null;
  agrupadorRev: number;
  nPontos: number;
  nPontosRev: number;
  /** Geometria provisória durante uma edição: o canvas base não desenha estas feições, a sobreposição sim. */
  previas: Map<string, Feicao>;
  destaques: Set<string>;
  revEstilo: number;
  internador: InternadorEstilos;
  ultima: EstatisticasCamada;
}

/** Que parte da lista o chamador quer: o que se pinta no canvas, os marcadores DOM, ou tudo. */
export type ParteLista = 'tudo' | 'canvas' | 'dom';

const ESTILO_VAZIO: EstiloVetor = {
  cor: COR_PADRAO, traco: false, peso: 0, dash: undefined, preencher: false, corPreenchimento: COR_PADRAO, opacidadePreenchimento: 0
};

const vistaValida = (v: Vista | null | undefined): v is Vista =>
  !!v && Number.isFinite(v.zoom) && v.zoom >= 0 && !!v.caixa &&
  Number.isFinite(v.caixa.minLat) && Number.isFinite(v.caixa.maxLat) && Number.isFinite(v.caixa.minLon) && Number.isFinite(v.caixa.maxLon);

export class MotorFormas {
  private camadas = new Map<string, EstadoCamada>();
  private regra: RegraVisivel | null = null;

  // ---------------------------------------------------------------- camadas

  /** Cria a camada ou atualiza a definição (estilo, zIndex, opacidade, visibilidade). */
  public definirCamada(def: DefCamadaMotor): void {
    if (!def || typeof def.id !== 'string') return;
    let est = this.camadas.get(def.id);
    if (!est) {
      est = {
        def, dados: new DadosCamada(), zoomCache: -1, geom: new Map(), estilos: new Map(), lod: new Map(), avaliacoesLOD: 0,
        agrupador: null, agrupadorRev: -1, nPontos: 0, nPontosRev: -1, previas: new Map(), destaques: new Set(),
        revEstilo: 0, internador: new InternadorEstilos(),
        ultima: { total: 0, desenhadas: 0, marcasLOD: 0, clusters: 0, marcadoresDom: 0, avaliacoesLOD: 0 }
      };
      est.dados.regra = this.regra;
      this.camadas.set(def.id, est);
      return;
    }
    const estiloMudou = JSON.stringify(est.def.estilo) !== JSON.stringify(def.estilo);
    est.def = def;
    if (estiloMudou) {
      est.revEstilo++;
      est.estilos.clear();
      est.internador.limpar();
    }
  }

  public removerCamada(camadaId: string): void {
    this.camadas.delete(camadaId);
  }

  public temCamada(camadaId: string): boolean {
    return this.camadas.has(camadaId);
  }

  public definirRegra(regra: RegraVisivel | null): void {
    this.regra = regra;
    for (const est of this.camadas.values()) est.dados.regra = regra;
  }

  /** A regra de versões mudou (prévias ligadas/desligadas): o conjunto desenhado e o agrupamento precisam ser refeitos. */
  public reavaliarVersoes(camadaId: string): void {
    const est = this.camadas.get(camadaId);
    if (!est) return;
    est.dados.revisao++;
    est.dados.revisaoBase++;
  }

  // ---------------------------------------------------------------- dados

  /** Troca total dos dados da camada (diferencia contra o que já existe). */
  public definirFeicoes(camadaId: string, lista: Feicao[]): void {
    const est = this.camadas.get(camadaId);
    if (!est) return;
    const l = Array.isArray(lista) ? lista : [];
    const r = est.dados.sincronizar(l);
    this.aposMudanca(est, r.mudadas, r.removidas, true);
  }

  /**
   * Mudança incremental: só vale se `delta.base` for a lista sincronizada por último; senão a camada é refeita
   * por inteiro a partir de `lista`.
   */
  public aplicarDelta(camadaId: string, lista: Feicao[], delta: DeltaMotor): void {
    const est = this.camadas.get(camadaId);
    if (!est) return;
    const l = Array.isArray(lista) ? lista : [];
    const antes = new Map<string, boolean>();
    if (delta) {
      for (const id of delta.removidas ?? []) antes.set(id, this.pontoVisivel(est, est.dados.loja.get(id)));
      for (const f of delta.mudadas ?? []) if (f && typeof f.id === 'string') antes.set(f.id, this.pontoVisivel(est, est.dados.loja.get(f.id)));
    }
    const r = est.dados.aplicarDelta(l, delta);
    if (!r) {
      this.definirFeicoes(camadaId, l);
      return;
    }
    // contagem de pontos visíveis em O(mudanças)
    let nPontos = est.nPontos;
    for (const [id, eraVisivel] of antes) {
      const agora = this.pontoVisivel(est, est.dados.loja.get(id));
      nPontos += (agora ? 1 : 0) - (eraVisivel ? 1 : 0);
    }
    est.nPontos = Math.max(0, nPontos);
    this.aposMudanca(est, r.mudadas, r.removidas, r.oficiaisMudou);
    if (!r.oficiaisMudou) this.manterAgrupador(est, r.mudadas, r.removidas);
  }

  private pontoVisivel(est: EstadoCamada, f: Feicao | undefined): boolean {
    return !!f && f.geometria?.tipo === 'Point' && est.dados.desenhavel(f);
  }

  private aposMudanca(est: EstadoCamada, mudadas: string[], removidas: string[], conjuntoMudou: boolean): void {
    for (const id of mudadas) {
      est.lod.delete(id);
      est.geom.delete(id);
      est.estilos.delete(id);
      est.previas.delete(id); // a feição real chegou: a geometria provisória da edição acabou
    }
    for (const id of removidas) {
      est.lod.delete(id);
      est.geom.delete(id);
      est.estilos.delete(id);
      est.previas.delete(id);
      est.destaques.delete(id);
    }
    if (conjuntoMudou) est.agrupador = null;
  }

  /** O agrupador do zoom atual acompanha os pontos que mudaram (células afetadas, sem reagrupar a camada). */
  private manterAgrupador(est: EstadoCamada, mudadas: string[], removidas: string[]): void {
    const ag = est.agrupador;
    if (!ag) return;
    for (const id of removidas) ag.remover(id);
    for (const id of mudadas) {
      const f = est.dados.loja.get(id);
      if (f && f.geometria.tipo === 'Point' && est.dados.desenhavel(f)) ag.inserir({ id, coordenada: f.geometria.coordenada });
      else ag.remover(id);
    }
  }

  // ---------------------------------------------------------------- seleção e edição

  /** Define a seleção da camada. Devolve quem entrou e quem saiu (só o que mudou). */
  public selecionar(camadaId: string, ids: Iterable<string>): { entrou: string[]; saiu: string[] } {
    const est = this.camadas.get(camadaId);
    if (!est) return { entrou: [], saiu: [] };
    const novo = new Set<string>();
    for (const id of ids) if (est.dados.loja.has(id)) novo.add(id);
    const entrou: string[] = [];
    const saiu: string[] = [];
    for (const id of novo) if (!est.dados.selecionadas.has(id)) entrou.push(id);
    for (const id of est.dados.selecionadas) if (!novo.has(id)) saiu.push(id);
    est.dados.selecionadas.clear();
    for (const id of novo) est.dados.selecionadas.add(id);
    return { entrou, saiu };
  }

  public selecionadas(camadaId: string): ReadonlySet<string> {
    return this.camadas.get(camadaId)?.dados.selecionadas ?? new Set<string>();
  }

  /** Geometria provisória (arrasto de vértice): o canvas base deixa de desenhar a feição e a sobreposição a mostra. */
  public previsualizar(camadaId: string, f: Feicao): void {
    const est = this.camadas.get(camadaId);
    if (!est || !f || typeof f.id !== 'string' || !est.dados.loja.has(f.id)) return;
    est.previas.set(f.id, f);
  }

  public temPrevia(camadaId: string, id: string): boolean {
    return this.camadas.get(camadaId)?.previas.has(id) ?? false;
  }

  /** Realce temporário (hover): as feições entram na sobreposição com `destaque: true`. */
  public destacar(camadaId: string, ids: Iterable<string>): void {
    const est = this.camadas.get(camadaId);
    if (!est) return;
    est.destaques = new Set(ids);
  }

  // ---------------------------------------------------------------- consultas (geometria original)

  public feicao(camadaId: string, id: string): Feicao | undefined {
    return this.camadas.get(camadaId)?.dados.loja.get(id);
  }

  public caixaDe(camadaId: string, id: string): CaixaGeo | undefined {
    return this.camadas.get(camadaId)?.dados.indice.caixaDe(id);
  }

  /** Feições cujo envelope toca `caixa`, sem as ocultas (snap, hit-test, seleção por caixa). Não passa pelo LOD. */
  public consultarCaixa(camadaId: string, caixa: CaixaGeo): Feicao[] {
    const est = this.camadas.get(camadaId);
    if (!est) return [];
    const achadas: Feicao[] = [];
    for (const id of est.dados.indice.consultar(caixa)) {
      const f = est.dados.loja.get(id);
      if (f && !f.oculta) achadas.push(f);
    }
    return achadas;
  }

  public feicaoVisivel(camadaId: string, f: Feicao): boolean {
    const est = this.camadas.get(camadaId);
    return !est || est.dados.visivelPorVersao(f);
  }

  public estatisticas(camadaId: string): EstatisticasCamada | null {
    const est = this.camadas.get(camadaId);
    if (!est) return null;
    return { ...est.ultima, total: est.dados.loja.size, avaliacoesLOD: est.avaliacoesLOD };
  }

  /** Entidades da camada com prévia e com oficial (pares em detalhe completo): para testes e diagnóstico. */
  public ehPar(camadaId: string, f: Feicao): boolean {
    const est = this.camadas.get(camadaId);
    return !!est && this.emPar(est, f);
  }

  // ---------------------------------------------------------------- lista de desenho

  /**
   * O que desenhar nesta vista, camada a camada, na ordem de empilhamento (a última fica por cima).
   * `parte`: `'canvas'` só o que se pinta no canvas (marcas, formas, pontos sem ícone), `'dom'` só marcadores DOM e
   * curvas (clusters, ícones, textos, rótulos), `'tudo'` (padrão) os dois. O pan incremental pede o canvas só das faixas
   * expostas e o DOM da vista inteira (poucos itens, sem projetar nem simplificar formas).
   */
  public listaDesenho(vista: Vista, opcoes?: { camadas?: string[]; parte?: ParteLista }): ListaDesenho {
    const origem = this.origemDe(vista);
    const lista: ListaDesenho = { vista, origem, camadas: [] };
    if (!vistaValida(vista)) return lista;
    const filtro = opcoes?.camadas ? new Set(opcoes.camadas) : null;
    const ordenadas = [...this.camadas.values()].filter((e) => e.def.visivel && (!filtro || filtro.has(e.def.id)));
    ordenadas.sort((a, b) => a.def.zIndex - b.def.zIndex);
    for (const est of ordenadas) {
      try {
        lista.camadas.push(this.listarCamada(est, vista, opcoes?.parte ?? 'tudo'));
      } catch {
        lista.camadas.push(this.camadaVazia(est)); // Regra #0: uma camada com defeito não derruba as outras
      }
    }
    return lista;
  }

  private origemDe(vista: Vista): PontoMundo {
    if (vista?.origemPx && Number.isFinite(vista.origemPx.x) && Number.isFinite(vista.origemPx.y)) return vista.origemPx;
    if (!vistaValida(vista)) return { x: 0, y: 0 };
    const p = projetarCentro(vista.caixa.maxLat, vista.caixa.minLon, vista.zoom);
    return { x: p[0], y: p[1] };
  }

  private camadaVazia(est: EstadoCamada): CamadaDesenho {
    return {
      camadaId: est.def.id, zIndex: est.def.zIndex, opacidade: est.def.opacidade, itens: [],
      estatisticas: { total: est.dados.loja.size, desenhadas: 0, marcasLOD: 0, clusters: 0, marcadoresDom: 0, avaliacoesLOD: est.avaliacoesLOD }
    };
  }

  private prepararZoom(est: EstadoCamada, zoom: number): void {
    if (zoom !== est.zoomCache) {
      est.geom.clear();
      est.lod.clear();
      est.zoomCache = zoom;
    }
  }

  private estiloDe(est: EstadoCamada, f: Feicao): EstiloVetor {
    const rev = est.dados.revisaoDaFeicao(f.id);
    const g = est.estilos.get(f.id);
    if (g && g.rev === rev && g.revEstilo === est.revEstilo) return g.estilo;
    const estilo = est.internador.interno(estiloVetorDe(f, est.def.estilo, false));
    est.estilos.set(f.id, { rev, revEstilo: est.revEstilo, estilo });
    return estilo;
  }

  private emPar(est: EstadoCamada, f: Feicao): boolean {
    if (est.dados.contPrevias.size === 0) return false;
    const e = entidadeDe(f);
    return est.dados.contPrevias.has(e) && est.dados.oficiais.has(e);
  }

  /**
   * Vira marca? Sempre em detalhe completo: com rótulo e em par oficial × prévia; ponto e texto nunca. A seleção NÃO
   * entra aqui: o canvas base não depende dela (a sobreposição desenha a selecionada em detalhe completo por cima).
   */
  private comoMarca(est: EstadoCamada, f: Feicao, zoom: number): boolean {
    const tipo = f.geometria.tipo;
    if (tipo === 'Point' || tipo === 'Text') return false;
    if (f.estilo?.mostrarRotulo) return false;
    if (this.emPar(est, f)) return false;
    const guardado = est.lod.get(f.id);
    if (guardado !== undefined) return guardado;
    est.avaliacoesLOD++;
    const r = ehMarca(est.dados.indice.caixaDe(f.id), zoom);
    est.lod.set(f.id, r);
    return r;
  }

  /** Geometria projetada e simplificada em px, em cache por (feição, revisão, zoom). `null` se não há o que desenhar. */
  private geometriaProjetada(est: EstadoCamada, f: Feicao, zoom: number): EntradaGeom | null {
    const rev = est.dados.revisaoDaFeicao(f.id);
    const c = est.geom.get(f.id);
    if (c && c.rev === rev) return c;
    const g = this.construirGeometria(est, f, zoom, rev);
    if (g) est.geom.set(f.id, g);
    return g;
  }

  private construirGeometria(est: EstadoCamada, f: Feicao, zoom: number, rev: number): EntradaGeom | null {
    const g = f.geometria;
    const tol = zoom < ZOOM_SEM_SIMPLIFICACAO ? TOLERANCIA_PX : 0;
    if (g.tipo === 'Polygon') {
      const partes: Float64Array[] = [];
      for (const anel of g.aneis ?? []) {
        if (!Array.isArray(anel) || anel.length < 3) continue;
        let px = projetarVertices(anel, zoom);
        if (tol > 0 && anel.length >= MIN_VERTICES_SIMPLIFICAR) px = simplificarPx(px, tol, true);
        partes.push(px);
      }
      return partes.length > 0 ? { rev, partes, raioPx: 0, marca: false } : null;
    }
    if (g.tipo === 'LineString') {
      const partes: Float64Array[] = [];
      for (const parte of partesDaLinha(g)) {
        if (!Array.isArray(parte) || parte.length < 2) continue;
        let px = projetarVertices(parte, zoom);
        if (tol > 0 && parte.length >= MIN_VERTICES_SIMPLIFICAR) px = simplificarPx(px, tol, false);
        partes.push(px);
      }
      return partes.length > 0 ? { rev, partes, raioPx: 0, marca: false } : null;
    }
    if (g.tipo === 'Circle') {
      const c = g.centro;
      if (!Array.isArray(c)) return null;
      const centro = projetarCentro(c[0], c[1], zoom);
      return { rev, partes: [centro], raioPx: raioCirculoPx(c[0], g.raioMetros, zoom), marca: false };
    }
    if (g.tipo === 'Point' || g.tipo === 'Text') {
      return { rev, partes: [projetarCentro(g.coordenada[0], g.coordenada[1], zoom)], raioPx: g.tipo === 'Point' ? raioPontoPx(f, est.def.estilo) : 0, marca: false };
    }
    return null;
  }

  /** Marca de LOD: centro do envelope, lado de 1–2 px, cor do preenchimento/contorno. */
  private marcaDe(est: EstadoCamada, f: Feicao, zoom: number): EntradaGeom | null {
    const rev = est.dados.revisaoDaFeicao(f.id);
    const c = est.geom.get(f.id);
    if (c && c.rev === rev) return c;
    const caixa = est.dados.indice.caixaDe(f.id);
    if (!caixa) return null;
    const centro = projetarCentro((caixa.minLat + caixa.maxLat) / 2, (caixa.minLon + caixa.maxLon) / 2, zoom);
    if (!(Number.isFinite(centro[0]) && Number.isFinite(centro[1]))) return null;
    const entrada: EntradaGeom = { rev, partes: [centro], raioPx: ladoMarca(diagonalPx(caixa, zoom)), marca: true };
    est.geom.set(f.id, entrada);
    return entrada;
  }

  /**
   * Item da marca, em cache junto com a geometria por (feição, zoom). Com 100 mil marcas na tela, montar o item e internar
   * o estilo a cada vista custava a maior parte da lista; no pan agora só se confere se algo mudou, sem alocar.
   */
  private itemMarca(est: EstadoCamada, f: Feicao, zoom: number): ItemDesenho | null {
    const m = this.marcaDe(est, f, zoom);
    if (!m) return null;
    const it = m.item;
    if (it && it.feicao === f && m.revEstilo === est.revEstilo && it.selecionada === est.dados.selecionadas.has(f.id) &&
      (it.destaque === true) === est.destaques.has(f.id)) return it;
    const novo = this.itemBase(est, f, 'marca', m.partes, m.raioPx, this.estiloMarca(est, f));
    m.item = novo;
    m.revEstilo = est.revEstilo;
    return novo;
  }

  private estiloMarca(est: EstadoCamada, f: Feicao): EstiloVetor {
    const e = f.estilo ?? {};
    const cor = corSegura(e.corPreenchimento ?? e.corTraco ?? est.def.estilo.corPrimaria, COR_PADRAO);
    return est.internador.interno({ cor, traco: false, peso: 0, dash: undefined, preencher: true, corPreenchimento: cor, opacidadePreenchimento: OPACIDADE_MARCA });
  }

  private agrupadorAtivo(est: EstadoCamada, zoom: number): AgrupadorCluster | null {
    const { dados } = est;
    if (est.nPontosRev !== dados.revisaoBase) {
      let n = 0;
      for (const f of dados.loja.values()) if (f.geometria.tipo === 'Point' && dados.desenhavel(f)) n++;
      est.nPontos = n;
      est.nPontosRev = dados.revisaoBase;
    }
    if (!deveAgrupar(est.nPontos, zoom)) {
      est.agrupador = null;
      return null;
    }
    const ag = est.agrupador;
    if (ag && ag.zoom === zoom && est.agrupadorRev === dados.revisaoBase) return ag;
    const novo = new AgrupadorCluster(zoom, (p: LatLonPar) => {
      const c = projetarCentro(p[0], p[1], zoom);
      return { x: c[0], y: c[1] };
    });
    for (const f of dados.loja.values()) {
      if (f.geometria.tipo === 'Point' && dados.desenhavel(f)) novo.inserir({ id: f.id, coordenada: f.geometria.coordenada });
    }
    est.agrupador = novo;
    est.agrupadorRev = dados.revisaoBase;
    return novo;
  }

  private itemBase(est: EstadoCamada, f: Feicao, forma: ItemDesenho['forma'], geometriaEmPx: Float64Array[], raioPx: number, estilo: EstiloVetor): ItemDesenho {
    return {
      camadaId: est.def.id, id: f.id, forma, geometriaEmPx, raioPx, estilo,
      selecionada: est.dados.selecionadas.has(f.id), feicao: f,
      ...(est.destaques.has(f.id) ? { destaque: true } : {})
    };
  }

  /**
   * A caixa da vista com uma folga de poucos px: o traço de uma feição com o envelope logo fora da vista ainda entra nela
   * (o índice é por envelope). Sem isto, o pan incremental e o quadro completo divergem na borda do canvas.
   */
  private caixaComFolga(vista: Vista): CaixaGeo {
    const c = vista.caixa;
    const lonPorPx = 360 / (256 * 2 ** vista.zoom);
    const mLon = lonPorPx * FOLGA_TRACO_PX;
    const mLat = mLon * Math.cos((((c.minLat + c.maxLat) / 2) * Math.PI) / 180);
    return { minLat: c.minLat - mLat, maxLat: c.maxLat + mLat, minLon: c.minLon - mLon, maxLon: c.maxLon + mLon };
  }

  private listarCamada(est: EstadoCamada, vista: Vista, parte: ParteLista): CamadaDesenho {
    const { dados, def } = est;
    const querCanvas = parte !== 'dom';
    const querDom = parte !== 'canvas';
    const zoom = vista.zoom;
    this.prepararZoom(est, zoom);
    const ids = dados.indice.consultar(this.caixaComFolga(vista));
    const ag = this.agrupadorAtivo(est, zoom);

    const marcas: ItemDesenho[] = [];
    const areas: ItemDesenho[] = [];
    const linhas: ItemDesenho[] = [];
    const pontos: ItemDesenho[] = [];
    const dom: ItemDesenho[] = [];
    const st: EstatisticasCamada = { total: dados.loja.size, desenhadas: 0, marcasLOD: 0, clusters: 0, marcadoresDom: 0, avaliacoesLOD: 0 };

    const adicionarRotulo = (f: Feicao): void => {
      if (!querDom || !f.estilo?.mostrarRotulo || f.geometria.tipo === 'Text') return;
      const texto = textoRotulo(f, f.estilo.campoRotulo);
      const caixa = dados.indice.caixaDe(f.id);
      if (!texto || !caixa) return;
      dom.push({
        camadaId: def.id, id: `rotulo:${f.id}`, forma: 'rotulo', geometriaEmPx: [], raioPx: 0, estilo: ESTILO_VAZIO,
        selecionada: false, feicao: f, texto, coordenada: [(caixa.minLat + caixa.maxLat) / 2, (caixa.minLon + caixa.maxLon) / 2]
      });
      st.marcadoresDom++;
    };

    const pontoIndividual = (f: Feicao): void => {
      const g = f.geometria;
      if (g.tipo !== 'Point') return;
      if (f.estilo?.icone) {
        if (!querDom) return;
        dom.push({ ...this.itemBase(est, f, 'icone', [], 0, ESTILO_VAZIO), coordenada: g.coordenada });
        st.marcadoresDom++;
        return;
      }
      if (!querCanvas) return;
      const geo = this.geometriaProjetada(est, f, zoom);
      if (!geo) return;
      pontos.push(this.itemBase(est, f, 'ponto', geo.partes, geo.raioPx, this.estiloDe(est, f)));
      st.desenhadas++;
    };

    for (const id of ids) { // o índice devolve cada id uma vez (o item atualizado fica obsoleto na árvore e só vale no delta)
      const f = dados.loja.get(id);
      if (!f || !dados.desenhavel(f)) continue;
      if (est.previas.has(id)) continue; // em edição: a sobreposição desenha
      const g = f.geometria;
      if (g.tipo === 'Point') {
        if (ag && ag.emCluster(id)) {
          // em cluster: o canvas base não depende da seleção (a sobreposição desenha o ponto solto). Só o marcador DOM de ícone
          // (selecionado ou único restante da célula) precisa existir aqui, porque a sobreposição não desenha ícones.
          if (!f.estilo?.icone || !querDom || !this.soltoDoCluster(est, ag, id)) continue;
        }
        pontoIndividual(f);
        adicionarRotulo(f);
        continue;
      }
      if (g.tipo === 'Text') {
        if (!querDom) continue;
        dom.push({ ...this.itemBase(est, f, 'texto', [], 0, ESTILO_VAZIO), coordenada: g.coordenada });
        st.marcadoresDom++;
        continue;
      }
      if (nosDaGeometria(g)) {
        if (!querDom) continue;
        dom.push(this.itemBase(est, f, 'curva', [], 0, this.estiloDe(est, f)));
        st.marcadoresDom++;
        adicionarRotulo(f);
        continue;
      }
      if (!querCanvas) {
        adicionarRotulo(f); // só o rótulo: não projeta nem simplifica a forma
        continue;
      }
      // caminho quente do pan em zoom baixo: a marca já montada neste zoom. A entrada sai do cache quando a feição muda
      // (`aposMudanca`), então o mesmo objeto `f` dispensa conferir LOD e revisão de novo.
      const pronta = est.geom.get(id);
      const item = pronta?.item;
      if (item && item.feicao === f && pronta.revEstilo === est.revEstilo && !this.emPar(est, f) &&
        item.selecionada === dados.selecionadas.has(id) && (item.destaque === true) === est.destaques.has(id)) {
        marcas.push(item);
        st.marcasLOD++;
        continue;
      }
      if (this.comoMarca(est, f, zoom)) {
        const item = this.itemMarca(est, f, zoom);
        if (item) {
          marcas.push(item);
          st.marcasLOD++;
        }
        continue;
      }
      const geo = this.geometriaProjetada(est, f, zoom);
      if (!geo) continue;
      const estilo = this.estiloDe(est, f);
      if (g.tipo === 'LineString') linhas.push(this.itemBase(est, f, 'linha', geo.partes, 0, estilo));
      else if (g.tipo === 'Circle') areas.push(this.itemBase(est, f, 'circulo', geo.partes, geo.raioPx, estilo));
      else areas.push(this.itemBase(est, f, 'poligono', geo.partes, 0, estilo));
      st.desenhadas++;
      adicionarRotulo(f);
    }

    if (ag && querDom) this.listarClusters(est, vista, ag, dom, st, querDom);

    st.avaliacoesLOD = est.avaliacoesLOD;
    if (parte === 'tudo') est.ultima = st;
    // as marcas (até 100 mil) ficam no próprio array; só os grupos menores são copiados atrás delas
    const itens = marcas;
    for (const grupo of [areas, linhas, pontos, dom]) for (const it of grupo) itens.push(it);
    return { camadaId: def.id, zIndex: def.zIndex, opacidade: def.opacidade, itens, estatisticas: st };
  }

  /**
   * Clusters da vista (marcadores DOM). Selecionado nunca entra em cluster; o cluster só aparece com o centro dentro da
   * vista e com 2 ou mais restantes. Os pontos individuais que a seleção solta (o selecionado e o único restante de uma
   * célula) são da sobreposição: o canvas base não depende da seleção.
   */
  private listarClusters(
    est: EstadoCamada, vista: Vista, ag: AgrupadorCluster, dom: ItemDesenho[], st: EstatisticasCamada, querDom: boolean
  ): void {
    const { dados, def } = est;
    for (const [chave, cel] of ag.celulasAgrupadas()) {
      const total = cel.membros.size;
      let nSel = 0;
      let lat = cel.somaLat;
      let lon = cel.somaLon;
      for (const m of cel.membros.values()) {
        if (dados.selecionadas.has(m.id)) {
          nSel++;
          lat -= m.coordenada[0];
          lon -= m.coordenada[1];
        }
      }
      const nRest = total - nSel;
      const centroTotal: LatLonPar = [cel.somaLat / total, cel.somaLon / total];
      if (!(centroTotal[0] >= vista.caixa.minLat - LIMITE_RECORTE_CAIXA && centroTotal[0] <= vista.caixa.maxLat + LIMITE_RECORTE_CAIXA &&
        centroTotal[1] >= vista.caixa.minLon - LIMITE_RECORTE_CAIXA && centroTotal[1] <= vista.caixa.maxLon + LIMITE_RECORTE_CAIXA)) continue;
      if (nRest < 2 || !querDom) continue;
      dom.push({
        camadaId: def.id, id: chave, forma: 'cluster', geometriaEmPx: [], raioPx: 0, estilo: ESTILO_VAZIO, selecionada: false,
        coordenada: [lat / nRest, lon / nRest], total, restantes: nRest
      });
      st.clusters++;
      st.marcadoresDom++;
    }
  }

  /** O ponto está dentro de um cluster neste zoom (não é desenhado nem clicável individualmente)? */
  public pontoAgrupado(camadaId: string, id: string): boolean {
    const est = this.camadas.get(camadaId);
    return !!est?.agrupador && est.agrupador.emCluster(id) && !est.dados.selecionadas.has(id);
  }

  /** O ponto de uma célula de cluster aparece solto: está selecionado ou é o único restante não selecionado? */
  private soltoDoCluster(est: EstadoCamada, ag: AgrupadorCluster, id: string): boolean {
    if (est.dados.selecionadas.has(id)) return true;
    const chave = ag.chaveDoPonto(id);
    const cel = chave === undefined ? undefined : ag.celula(chave);
    if (!cel) return false;
    let restantes = 0;
    for (const m of cel.membros.keys()) if (!est.dados.selecionadas.has(m)) restantes++;
    return restantes === 1;
  }

  /** Membros (id e coordenada) da célula de cluster: o clique no cluster enquadra o grupo. */
  public membrosDoCluster(camadaId: string, chave: string): Array<{ id: string; coordenada: LatLonPar }> {
    const est = this.camadas.get(camadaId);
    const cel = est?.agrupador?.celula(chave);
    return cel ? [...cel.membros.values()].map((m) => ({ id: m.id, coordenada: m.coordenada })) : [];
  }

  // ---------------------------------------------------------------- sobreposição (seleção, destaque, edição)

  /**
   * Itens da sobreposição: feições selecionadas, em edição ou destacadas, sempre em detalhe completo e com o estilo
   * de seleção. Custo O(selecionadas): selecionar não repinta o canvas base.
   */
  public listaSobreposicao(camadaId: string, vista: Vista): CamadaDesenho | null {
    const est = this.camadas.get(camadaId);
    if (!est || !vistaValida(vista)) return null;
    this.prepararZoom(est, vista.zoom);
    const itens: ItemDesenho[] = [];
    const ids = new Set<string>([...est.dados.selecionadas, ...est.previas.keys(), ...est.destaques]);
    // o único restante (não selecionado) de uma célula de cluster vira ponto individual: pertence à sobreposição
    const ag = est.agrupador;
    if (ag && est.dados.selecionadas.size > 0) {
      const celulas = new Set<string>();
      for (const id of est.dados.selecionadas) {
        const chave = ag.chaveDoPonto(id);
        if (chave !== undefined) celulas.add(chave);
      }
      for (const chave of celulas) {
        const cel = ag.celula(chave);
        if (!cel || cel.membros.size < 2) continue;
        const restantes = [...cel.membros.keys()].filter((m) => !est.dados.selecionadas.has(m));
        if (restantes.length === 1) ids.add(restantes[0]);
      }
    }
    for (const id of ids) {
      const original = est.dados.loja.get(id);
      if (!original || !est.dados.desenhavel(original)) continue;
      const previa = est.previas.get(id);
      const f = previa ?? original;
      const g = f.geometria;
      if (g.tipo === 'Text' || nosDaGeometria(g)) continue; // marcadores DOM e curvas se atualizam pela própria camada
      if (g.tipo === 'Point' && f.estilo?.icone) continue;
      const caixa = previa ? null : est.dados.indice.caixaDe(id);
      if (caixa && !caixasSeTocam(caixa, vista.caixa)) continue;
      const sel = est.dados.selecionadas.has(id) || !!previa;
      if (!sel && !est.destaques.has(id) && !(g.tipo === 'Point' && ag?.emCluster(id))) continue; // só o restante único entra sem estar selecionado
      const geo = previa ? this.construirGeometria(est, f, vista.zoom, -1) : this.geometriaProjetada(est, f, vista.zoom);
      if (!geo) continue;
      const estilo = est.internador.interno(estiloVetorDe(f, est.def.estilo, sel));
      const forma = g.tipo === 'LineString' ? 'linha' : g.tipo === 'Circle' ? 'circulo' : g.tipo === 'Point' ? 'ponto' : 'poligono';
      itens.push({
        camadaId, id, forma, geometriaEmPx: geo.partes, raioPx: geo.raioPx, estilo, selecionada: sel, feicao: f,
        ...(est.destaques.has(id) ? { destaque: true } : {})
      });
    }
    return {
      camadaId, zIndex: est.def.zIndex, opacidade: est.def.opacidade, itens,
      estatisticas: { total: est.dados.loja.size, desenhadas: itens.length, marcasLOD: 0, clusters: 0, marcadoresDom: 0, avaliacoesLOD: est.avaliacoesLOD }
    };
  }

  /** A seleção da camada toca pontos sob agrupamento ativo? (então o conjunto de clusters muda e o base precisa refazer) */
  public selecaoAfetaAgrupamento(camadaId: string, ids: Iterable<string>): boolean {
    const est = this.camadas.get(camadaId);
    if (!est || !est.agrupador) return false;
    for (const id of ids) if (est.dados.loja.get(id)?.geometria.tipo === 'Point') return true;
    return false;
  }
}
