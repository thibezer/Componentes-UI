import L from 'leaflet';
import { focoEmCampoDeTexto } from '../core/alvo-digitavel';
import type { Feicao, GeometriaFeicao, LatLonPar } from './feature_types';
import {
  alcaLatente, alternarSuavidade, comPontos, MAX_NOS_COM_ALCA_LATENTE, inserirPonto, minimoVertices, moverAlca, nosDe, nosOuVertices, pontoMedioDoSegmento, pontosDe,
  removerPonto, segmentosDoEditor, type QualAlca
} from './feature_edicao_ops';
import {
  areaDaGeometria, distanciaMetros, extensaoDaGeometria, formatarArea, formatarExtensao
} from './feature_metricas';
import type { ResultadoSnap } from './feature_snap';
import { CSS_POSICAO_HUD } from './feature_hud';

/*
 * Editor visual de vértices (Leaflet): uma alça arrastável por vértice, alças-fantasma nos pontos
 * médios (clique insere), botão direito ou Delete exclui, snap durante o arrasto e HUD com medidas ao vivo.
 * Cada gesto (soltar alça, inserir, excluir, curva ↔ canto) entra num histórico: Ctrl+Z desfaz, Ctrl+Shift+Z / Ctrl+Y
 * refaz e "Cancelar" volta à geometria de quando a edição começou.
 * A geometria é recalculada pelas funções puras de feature_edicao_ops.ts.
 */

export const ID_HUD_EDICAO = 'cm-vertex-edit-hud';
const PANE_EDICAO = 'cad-edicao-vertices';
const COR = '#facc15';
const COR_ALCA = '#f472b6';
const COR_SELECIONADA = '#22d3ee';
/** Um duplo clique que começou inserindo um vértice (no fantasma) não converte o nó novo em curva dentro deste prazo. */
const JANELA_DUPLO_CLIQUE_MS = 600;
/** Gestos guardados para desfazer. */
const LIMITE_HISTORICO = 100;
/** Segmentos menores que isto na tela não ganham fantasma (ele cobriria as alças das pontas). */
const FANTASMA_MIN_PX = 24;
const AVISO_MS = 2500;

export interface DependenciasEditor {
  map: L.Map;
  /** Snap para a posição do cursor, ignorando o vértice em arrasto. Já considera se o snap está ligado. */
  buscarSnap: (coord: LatLonPar, excluir: { feicaoId: string; camadaId: string; vertice?: number }) => ResultadoSnap | null;
  snapLigado: () => boolean;
  alternarSnap: () => void;
  /** Mostra a geometria nova no mapa sem gravar (durante o arrasto). */
  previsualizar: (f: Feicao) => void;
  /** Fim de cada gesto (soltar alça, inserir, excluir, desfazer): grava a feição. */
  aoGesto: (f: Feicao) => void;
  /** A edição terminou (Concluir, Esc, ou chamada de `parar`). */
  aoEncerrar: (f: Feicao) => void;
}

const mesmaGeometria = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

export class EditorVertices {
  private feicaoAtual: Feicao | null = null;
  /** Feição como foi gravada pela última vez (base do histórico). */
  private base: Feicao | null = null;
  /** Feição de quando a edição começou (ou da última mudança externa): destino do "Cancelar". */
  private inicial: Feicao | null = null;
  private historico: Feicao[] = [];
  private refeitos: Feicao[] = [];
  private pts: LatLonPar[] = [];
  private alcas: L.Marker[] = [];
  private fantasmas: Array<{ marker: L.Marker; i: number; j: number }> = [];
  /** Alças de Bézier (só em feição com curva): marcador + haste até o nó. */
  private alcasBezier: Array<{ marker: L.Marker; haste: L.Polyline; i: number; qual: QualAlca; latente: boolean }> = [];
  private marcadorSnap: L.Marker | null = null;
  private hud: HTMLElement | null = null;
  private grupo: L.LayerGroup | null = null;
  private ultimaInsercao = 0;
  private selecionado: number | null = null;
  /** Alças sendo arrastadas agora (a feição não é refeita por fora enquanto houver arraste). */
  private arrastando = 0;
  /** A gravação do gesto está em andamento: o eco vindo dos dados é nosso, não uma mudança externa. */
  private gravando = false;
  /** Polígono de 4 cantos alinhado aos eixos: arrastar um canto mantém o retângulo (Shift solta). */
  private retangulo = false;
  private avisoTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private dep: DependenciasEditor) {}

  public get ativo(): boolean {
    return this.feicaoAtual !== null;
  }

  private get ehCirculo(): boolean {
    return this.feicaoAtual?.geometria.tipo === 'Circle';
  }

  public get feicao(): Feicao | null {
    return this.feicaoAtual;
  }

  /** Nó selecionado (clique na alça), ou `null`. */
  public get noSelecionado(): number | null {
    return this.selecionado;
  }

  public get podeDesfazer(): boolean {
    return this.historico.length > 0;
  }

  public get podeRefazer(): boolean {
    return this.refeitos.length > 0;
  }

  public iniciar(f: Feicao): void {
    this.parar();
    this.feicaoAtual = f;
    this.base = f;
    this.inicial = f;
    this.historico = [];
    this.refeitos = [];
    this.selecionado = null;
    this.pts = pontosDe(f.geometria).map((p) => [p[0], p[1]] as LatLonPar);
    this.retangulo = this.detectarRetangulo();
    const map = this.dep.map;
    if (!map.getPane(PANE_EDICAO)) {
      const pane = map.createPane(PANE_EDICAO);
      pane.style.zIndex = '9000';
    }
    this.grupo = L.layerGroup().addTo(map);
    map.on('zoomend', this.aoZoom);
    window.addEventListener('keydown', this.aoTecla);
    this.montarHud();
    this.reconstruir();
  }

  /** Encerra a edição (idempotente). */
  public parar(): void {
    const f = this.feicaoAtual;
    if (!f) return;
    this.feicaoAtual = null;
    this.base = null;
    this.inicial = null;
    this.historico = [];
    this.refeitos = [];
    this.selecionado = null;
    this.arrastando = 0;
    this.alcas = [];
    this.fantasmas = [];
    this.alcasBezier = [];
    this.dep.map.off('zoomend', this.aoZoom);
    window.removeEventListener('keydown', this.aoTecla);
    if (this.avisoTimer) clearTimeout(this.avisoTimer);
    this.avisoTimer = null;
    this.grupo?.remove();
    this.grupo = null;
    this.marcadorSnap = null;
    this.hud?.remove();
    this.hud = null;
    this.dep.aoEncerrar(f);
  }

  /** Descarta tudo o que foi feito desde o começo da edição (um gesto só: o histórico não é percorrido) e encerra. */
  public cancelar(): void {
    const f = this.feicaoAtual;
    const inicial = this.inicial;
    if (!f || !inicial) return;
    if (!mesmaGeometria(inicial.geometria, f.geometria)) {
      const volta = { ...f, geometria: inicial.geometria };
      this.dep.previsualizar(volta);
      this.gravar(volta);
    }
    this.parar();
  }

  /** A feição foi alterada por fora (API, outro operador): refaz as alças com a geometria nova. */
  public sincronizar(f: Feicao): void {
    if (!this.feicaoAtual || this.feicaoAtual.id !== f.id) return;

    if (this.gravando) {
      // eco da nossa própria gravação (já normalizado): mantém o histórico
      this.feicaoAtual = f;
      this.base = f;
      if (!(this.ehCirculo && this.circuloCompativel(f))) {
        this.pts = pontosDe(f.geometria).map((p) => [p[0], p[1]] as LatLonPar);
      }
      this.retangulo = this.detectarRetangulo();
      this.reconstruir();
      return;
    }

    if (this.arrastando > 0) {
      // não destrói a alça em arrasto: o resto da feição vem de fora e a geometria do gesto em curso vence ao soltar
      this.feicaoAtual = { ...f, geometria: this.feicaoAtual.geometria };
      return;
    }

    if (this.base && mesmaGeometria(f.geometria, this.base.geometria)) {
      // só estilo/propriedades mudaram: nada a refazer nem a esquecer
      this.feicaoAtual = f;
      this.base = f;
      return;
    }

    // outra geometria vinda de fora: desfazer passaria por cima dela, então o histórico recomeça daqui
    this.feicaoAtual = f;
    this.base = f;
    this.inicial = f;
    this.historico = [];
    this.refeitos = [];
    this.selecionado = null;
    this.pts = pontosDe(f.geometria).map((p) => [p[0], p[1]] as LatLonPar);
    this.retangulo = this.detectarRetangulo();
    this.reconstruir();
  }

  /** O círculo da feição bate com as alças atuais (centro e raio): a alça da borda fica onde o usuário a soltou. */
  private circuloCompativel(f: Feicao): boolean {
    const g = f.geometria;
    if (g.tipo !== 'Circle' || this.pts.length < 2) return false;
    return g.centro[0] === this.pts[0][0] && g.centro[1] === this.pts[0][1]
      && Math.abs(distanciaMetros(this.pts[0], this.pts[1]) - g.raioMetros) < 0.01;
  }

  /** Atualiza o texto "Snap" do HUD quando o snap é ligado/desligado. */
  public atualizarSnapNoHud(): void {
    const el = this.hud?.querySelector('[data-campo="snap"]');
    if (el) el.textContent = `Snap ${this.dep.snapLigado() ? 'on' : 'off'} (S)`;
  }

  // ---- construção ----

  private geometriaAtual() {
    return comPontos(this.feicaoAtual!.geometria, this.pts);
  }

  private feicaoComPontos(): Feicao {
    return { ...this.feicaoAtual!, geometria: this.geometriaAtual() };
  }

  private detectarRetangulo(): boolean {
    const g = this.feicaoAtual?.geometria;
    if (!g || g.tipo !== 'Polygon' || g.curva || this.pts.length !== 4) return false;
    const [a, b, c, d] = this.pts;
    const horizontalPrimeiro = a[0] === b[0] && b[1] === c[1] && c[0] === d[0] && d[1] === a[1];
    const verticalPrimeiro = a[1] === b[1] && b[0] === c[0] && c[1] === d[1] && d[0] === a[0];
    return horizontalPrimeiro || verticalPrimeiro;
  }

  private reconstruir(): void {
    this.grupo?.clearLayers();
    this.alcas = [];
    this.fantasmas = [];
    this.alcasBezier = [];
    if (!this.feicaoAtual || !this.grupo) return;
    if (this.selecionado !== null && this.selecionado >= this.pts.length) this.selecionado = null;

    const g = this.feicaoAtual.geometria;
    this.pts.forEach((p, i) => {
      const alca = this.criarAlca(p, i);
      this.alcas.push(alca);
      this.grupo!.addLayer(alca);
    });

    this.criarAlcasBezier();

    if (g.tipo !== 'Point') {
      for (const [i, j] of segmentosDoEditor(this.geometriaAtual())) {
        if (!this.segmentoLongoNaTela(i, j)) continue;
        const f = this.criarFantasma(i, j);
        this.fantasmas.push(f);
        this.grupo.addLayer(f.marker);
      }
    }
    this.atualizarHud();
  }

  /** Segmento curto demais na tela não ganha fantasma: ele ficaria por cima das alças das pontas. */
  private segmentoLongoNaTela(i: number, j: number): boolean {
    const a = this.pts[i];
    const b = this.pts[j];
    if (!a || !b) return false;
    const pa = this.dep.map.latLngToContainerPoint(a);
    const pb = this.dep.map.latLngToContainerPoint(b);
    return Math.hypot(pa.x - pb.x, pa.y - pb.y) >= FANTASMA_MIN_PX;
  }

  private aoZoom = (): void => {
    if (this.feicaoAtual && this.arrastando === 0) this.reconstruir();
  };

  private icone(classe: string, tam: number, estilo: string): L.DivIcon {
    return L.divIcon({
      className: `custom-leaflet-marker ${classe}`,
      iconSize: [tam, tam],
      html: `<div style="width:${tam}px;height:${tam}px;box-sizing:border-box;${estilo}"></div>`
    });
  }

  private iconeAlca(indice: number): L.DivIcon {
    const borda = this.ehCirculo && indice === 1;
    const selecionada = this.selecionado === indice;
    const fundo = selecionada ? COR_SELECIONADA : COR;
    const contorno = selecionada ? '2px solid #fff;box-shadow:0 0 0 2px #0e7490' : '2px solid #111';
    return this.icone('cad-vertex-handle', 12, `background:${fundo};border:${contorno};border-radius:${borda ? '50%' : '2px'};cursor:${borda ? 'ew-resize' : 'move'}`);
  }

  private criarAlca(p: LatLonPar, indice: number): L.Marker {
    const marker = L.marker(p, {
      icon: this.iconeAlca(indice),
      draggable: true,
      pane: PANE_EDICAO,
      keyboard: false
    });

    marker.on('dragstart', () => { this.arrastando++; });
    marker.on('drag', (ev: L.LeafletEvent) => {
      const o = (ev as unknown as { originalEvent?: MouseEvent }).originalEvent;
      this.aoArrastar(marker, indice, !!o?.shiftKey);
    });
    marker.on('dragend', () => {
      this.arrastando = Math.max(0, this.arrastando - 1);
      this.esconderSnap();
      this.selecionado = indice;
      this.retangulo = this.detectarRetanguloDe(this.pts);
      this.confirmar(this.feicaoComPontos());
      this.atualizarSelecaoVisual();
    });
    // clique (sem arrasto) seleciona o nó: Delete ou o botão do HUD o exclui
    marker.on('click', (ev: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(ev.originalEvent);
      this.selecionarNo(indice);
    });
    marker.on('contextmenu', (ev: L.LeafletMouseEvent) => {
      L.DomEvent.preventDefault(ev.originalEvent);
      L.DomEvent.stopPropagation(ev.originalEvent);
      this.excluir(indice);
    });
    // duplo clique: canto ↔ suave (numa linha/polígono comum, é o que converte em curva)
    marker.on('dblclick', (ev: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(ev.originalEvent);
      // duplo clique num fantasma: o 1º clique inseriu o vértice e o 2º caiu na alça nova; não é pedido de curva
      if (Date.now() - this.ultimaInsercao < JANELA_DUPLO_CLIQUE_MS) return;
      this.alternarSuave(indice);
    });
    return marker;
  }

  private detectarRetanguloDe(pts: LatLonPar[]): boolean {
    const antes = this.pts;
    this.pts = pts;
    try {
      return this.detectarRetangulo();
    } finally {
      this.pts = antes;
    }
  }

  // ---- seleção de nó ----

  /** Seleciona o nó `indice` (destacado na tela); `null` limpa. */
  public selecionarNo(indice: number | null): void {
    this.selecionado = indice !== null && indice >= 0 && indice < this.pts.length ? indice : null;
    this.atualizarSelecaoVisual();
    this.atualizarBotoes();
  }

  private atualizarSelecaoVisual(): void {
    this.alcas.forEach((a, i) => a.setIcon(this.iconeAlca(i)));
    this.atualizarBotoes();
  }

  // ---- alças de Bézier ----

  private criarAlcasBezier(): void {
    const g = this.feicaoAtual?.geometria;
    if (!g || (g.tipo !== 'LineString' && g.tipo !== 'Polygon')) return;
    this.pts.forEach((_, i) => this.completarAlcasDoNo(i));
  }

  /** Posição da alça: a real do nó ou, se o nó é de canto, a latente (sempre à mão para curvar). */
  private posicaoDaAlca(g: GeometriaFeicao, i: number, qual: QualAlca): { pos: LatLonPar; latente: boolean } | null {
    const real = nosDe(g)?.[i]?.[qual];
    if (real) return { pos: real, latente: false };
    if (this.pts.length > MAX_NOS_COM_ALCA_LATENTE) return null;
    const pos = alcaLatente(g, i, qual);
    return pos ? { pos, latente: true } : null;
  }

  private iconeDaAlca(latente: boolean): L.DivIcon {
    return this.icone(
      'cad-bezier-handle', 10,
      latente
        ? `background:transparent;border:2px dashed ${COR_ALCA};opacity:.6;border-radius:50%;cursor:move`
        : `background:#fff;border:2px solid ${COR_ALCA};border-radius:50%;cursor:move`
    );
  }

  /** Cria os marcadores das alças do nó que ainda não têm (reais, ou latentes nos nós de canto e nas poligonais). */
  private completarAlcasDoNo(i: number): void {
    const g = this.feicaoAtual && this.geometriaAtual();
    const no = g && nosOuVertices(g)?.[i];
    if (!g || !no || !this.grupo) return;
    for (const qual of ['entrada', 'saida'] as const) {
      const p = this.posicaoDaAlca(g, i, qual);
      if (!p || this.alcasBezier.some((a) => a.i === i && a.qual === qual)) continue;
      const haste = L.polyline([no.ponto, p.pos], {
        pane: PANE_EDICAO, color: COR_ALCA, weight: 1, opacity: p.latente ? 0.35 : 0.8, dashArray: p.latente ? '3 3' : undefined, interactive: false
      });
      const marker = L.marker(p.pos, { icon: this.iconeDaAlca(p.latente), draggable: true, pane: PANE_EDICAO, keyboard: false });
      const entrada = { marker, haste, i, qual, latente: p.latente };
      marker.on('dragstart', () => { this.arrastando++; });
      marker.on('drag', (ev: L.LeafletEvent) => {
        const o = (ev as unknown as { originalEvent?: MouseEvent }).originalEvent;
        this.aoArrastarAlca(entrada, !o?.shiftKey);
      });
      marker.on('dragend', () => {
        this.arrastando = Math.max(0, this.arrastando - 1);
        this.confirmar(this.feicaoAtual!);
      });
      this.alcasBezier.push(entrada);
      this.grupo.addLayer(haste);
      this.grupo.addLayer(marker);
    }
  }

  /** Reposiciona marcadores e hastes de todas as alças conforme a geometria atual. */
  private sincronizarAlcasBezier(): void {
    const g = this.feicaoAtual && this.geometriaAtual();
    const nos = g && nosOuVertices(g);
    if (!g || !nos) return;
    for (const a of this.alcasBezier) {
      const p = this.posicaoDaAlca(g, a.i, a.qual);
      if (!p || !nos[a.i]) continue;
      const { lat, lng } = a.marker.getLatLng();
      if (lat !== p.pos[0] || lng !== p.pos[1]) a.marker.setLatLng(p.pos);
      a.haste.setLatLngs([nos[a.i].ponto, p.pos]);
      if (a.latente !== p.latente) {
        a.latente = p.latente;
        a.marker.setIcon(this.iconeDaAlca(p.latente));
        a.haste.setStyle({ opacity: p.latente ? 0.35 : 0.8, dashArray: p.latente ? '3 3' : undefined });
      }
    }
  }

  private aoArrastarAlca(a: { marker: L.Marker; i: number; qual: QualAlca }, simetrica: boolean): void {
    const f = this.feicaoAtual;
    if (!f) return;
    const { lat, lng } = a.marker.getLatLng();
    const nova = moverAlca(f.geometria, a.i, a.qual, [lat, lng], simetrica);
    this.feicaoAtual = { ...f, geometria: nova };
    this.completarAlcasDoNo(a.i);
    this.sincronizarAlcasBezier();
    this.dep.previsualizar(this.feicaoAtual);
    this.atualizarHud();
  }

  private alternarSuave(indice: number): void {
    const f = this.feicaoAtual;
    if (!f) return;
    const nova = alternarSuavidade(f.geometria, indice);
    if (nova === f.geometria) return;
    this.feicaoAtual = { ...f, geometria: nova };
    this.reconstruir();
    this.dep.previsualizar(this.feicaoAtual);
    this.confirmar(this.feicaoAtual);
  }

  private criarFantasma(i: number, j: number): { marker: L.Marker; i: number; j: number } {
    const marker = L.marker(pontoMedioDoSegmento(this.geometriaAtual(), i, j), {
      icon: this.icone('cad-vertex-ghost', 9, `background:${COR};opacity:.45;border:1px solid #111;border-radius:50%;cursor:copy`),
      draggable: true,
      pane: PANE_EDICAO,
      keyboard: false
    });
    // o editor reconstrói tudo a cada inserção/exclusão, então `i` nunca fica desatualizado
    // clique: insere no ponto médio; arraste: insere o nó já na posição solta (um gesto só, como o arraste de uma alça)
    marker.on('click', (ev: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(ev.originalEvent);
      this.ultimaInsercao = Date.now();
      this.inserir(i);
    });
    marker.on('drag', () => this.aoArrastarFantasma(marker, i));
    marker.on('dragend', () => {
      this.esconderSnap();
      this.ultimaInsercao = Date.now();
      this.inserir(i, this.posicaoDoFantasma(marker));
    });
    return { marker, i, j };
  }

  /** Posição do fantasma em arrasto, com snap (ignorando o vértice que ainda não existe). */
  private posicaoDoFantasma(marker: L.Marker): LatLonPar {
    const f = this.feicaoAtual;
    const pos: LatLonPar = [marker.getLatLng().lat, marker.getLatLng().lng];
    if (!f || !this.dep.snapLigado()) return pos;
    return this.dep.buscarSnap(pos, { feicaoId: f.id, camadaId: f.camadaId })?.coordenada ?? pos;
  }

  private aoArrastarFantasma(marker: L.Marker, depoisDe: number): void {
    const pos = this.posicaoDoFantasma(marker);
    if (pos[0] !== marker.getLatLng().lat || pos[1] !== marker.getLatLng().lng) {
      marker.setLatLng(pos);
      this.mostrarSnap(pos);
    } else {
      this.esconderSnap();
    }
    const previa = this.comInsercao(depoisDe, pos);
    if (!previa) return;
    this.dep.previsualizar(previa.feicao);
    this.atualizarHud(previa.feicao.geometria);
  }

  // ---- gestos ----

  private aoArrastar(alca: L.Marker, indice: number, livre = false): void {
    const f = this.feicaoAtual;
    if (!f) return;
    let pos: LatLonPar = [alca.getLatLng().lat, alca.getLatLng().lng];

    const snap = this.dep.snapLigado()
      ? this.dep.buscarSnap(pos, { feicaoId: f.id, camadaId: f.camadaId, vertice: indice })
      : null;
    if (snap) {
      pos = snap.coordenada;
      alca.setLatLng(pos);
      this.mostrarSnap(pos);
    } else {
      this.esconderSnap();
    }

    if (f.geometria.tipo === 'Circle' && indice === 0) {
      // mover o centro leva a alça da borda junto: o raio não muda
      const dLat = pos[0] - this.pts[0][0];
      const dLon = pos[1] - this.pts[0][1];
      this.pts[1] = [this.pts[1][0] + dLat, this.pts[1][1] + dLon];
      this.alcas[1]?.setLatLng(this.pts[1]);
    }
    if (this.retangulo && !livre) this.moverCantoDoRetangulo(indice, pos);
    else this.pts[indice] = pos;
    // fantasmas vizinhos acompanham o vértice
    for (const fan of this.fantasmas) {
      if (this.retangulo && !livre) fan.marker.setLatLng(pontoMedioDoSegmento(this.geometriaAtual(), fan.i, fan.j));
      else if (fan.i === indice || fan.j === indice) fan.marker.setLatLng(pontoMedioDoSegmento(this.geometriaAtual(), fan.i, fan.j));
    }
    this.dep.previsualizar(this.feicaoComPontos());
    this.atualizarAlcasDoNo(indice);
    this.atualizarHud();
  }

  /** Move o canto `i` para `pos` e arrasta os dois vizinhos para o retângulo continuar alinhado, com o canto oposto fixo. */
  private moverCantoDoRetangulo(i: number, pos: LatLonPar): void {
    const oposto = this.pts[(i + 2) % 4];
    const n1 = (i + 1) % 4;
    const n3 = (i + 3) % 4;
    const n1CompartilhaLat = this.pts[n1][0] === this.pts[i][0];
    this.pts[i] = pos;
    this.pts[n1] = n1CompartilhaLat ? [pos[0], oposto[1]] : [oposto[0], pos[1]];
    this.pts[n3] = n1CompartilhaLat ? [oposto[0], pos[1]] : [pos[0], oposto[1]];
    this.alcas[n1]?.setLatLng(this.pts[n1]);
    this.alcas[n3]?.setLatLng(this.pts[n3]);
  }

  /** Durante o arrasto de um nó, as alças dele (e as latentes dos vizinhos) acompanham; a geometria só é gravada no fim. */
  private atualizarAlcasDoNo(_indice: number): void {
    this.sincronizarAlcasBezier();
  }

  /**
   * Feição com um nó novo logo depois de `depoisDe`, já em `destino` (padrão: o meio do segmento). Não grava nada.
   * Na curva o nó nasce sobre o traçado (sem mudar o desenho) e só depois vai para `destino`.
   */
  private comInsercao(depoisDe: number, destino?: LatLonPar): { feicao: Feicao; pts: LatLonPar[] } | null {
    const f = this.feicaoAtual;
    if (!f || this.pts.length === 0) return null;
    const g = this.geometriaAtual();
    const meio = pontoMedioDoSegmento(g, depoisDe, (depoisDe + 1) % this.pts.length);
    const nova = inserirPonto(g, depoisDe, meio);
    if (nova === g) return null;
    const pts = pontosDe(nova).map((p) => [p[0], p[1]] as LatLonPar);
    if (destino && Number.isFinite(destino[0]) && Number.isFinite(destino[1])) pts[depoisDe + 1] = destino;
    return { feicao: { ...f, geometria: comPontos(nova, pts) }, pts };
  }

  private inserir(depoisDe: number, destino?: LatLonPar): void {
    const r = this.comInsercao(depoisDe, destino);
    if (!r) {
      // nada a inserir: refaz as alças (o fantasma arrastado volta ao ponto médio) e a prévia da geometria gravada
      this.reconstruir();
      if (this.feicaoAtual) this.dep.previsualizar(this.feicaoComPontos());
      return;
    }
    this.pts = r.pts;
    this.feicaoAtual = r.feicao;
    this.retangulo = false;
    this.selecionado = depoisDe + 1;
    this.reconstruir();
    this.dep.previsualizar(r.feicao);
    this.confirmar(r.feicao);
  }

  /** Grava o gesto: guarda a geometria anterior no histórico (se mudou) e avisa quem escuta. */
  private confirmar(f: Feicao): void {
    const antes = this.base;
    if (antes && !mesmaGeometria(antes.geometria, f.geometria)) {
      this.historico.push(antes);
      if (this.historico.length > LIMITE_HISTORICO) this.historico.shift();
      this.refeitos = [];
    }
    this.feicaoAtual = f;
    this.base = f;
    this.gravar(f);
    this.atualizarBotoes();
  }

  private gravar(f: Feicao): void {
    this.gravando = true;
    try {
      this.dep.aoGesto(f);
    } finally {
      this.gravando = false;
    }
  }

  private excluir(indice: number): boolean {
    const f = this.feicaoAtual;
    if (!f) return false;
    const g = this.geometriaAtual();
    const nova = removerPonto(g, indice);
    if (!nova) {
      if (g.tipo === 'Circle') this.avisar('Círculo: mova o centro ou a borda (não há nós para excluir).');
      else if (g.tipo === 'Point') this.avisar('Um ponto tem um único nó.');
      else this.avisar(`Mínimo de ${minimoVertices(g)} nós: não dá para excluir mais.`);
      return false;
    }
    this.pts = pontosDe(nova).map((p) => [p[0], p[1]] as LatLonPar);
    this.retangulo = false;
    this.selecionado = null;
    this.reconstruir();
    const atualizada = this.feicaoComPontos();
    this.dep.previsualizar(atualizada);
    this.confirmar(atualizada);
    return true;
  }

  /** Exclui o nó selecionado (Delete/Backspace ou botão do HUD). */
  public excluirSelecionado(): boolean {
    if (this.selecionado === null) {
      this.avisar('Clique num nó para selecioná-lo e então exclua.');
      return false;
    }
    return this.excluir(this.selecionado);
  }

  /** Atalho para testes/API: mesma operação do botão direito. */
  public excluirVertice(indice: number): boolean {
    const antes = this.pts.length;
    this.excluir(indice);
    return this.pts.length < antes;
  }

  public inserirVerticeApos(indice: number): void {
    if (indice < 0 || indice >= this.pts.length) return;
    this.inserir(indice);
  }

  // ---- histórico ----

  /** Desfaz o último gesto. Devolve se havia algo a desfazer. */
  public desfazer(): boolean {
    const anterior = this.historico.pop();
    if (!anterior || !this.base) {
      this.avisar('Nada a desfazer.');
      return false;
    }
    this.refeitos.push(this.base);
    this.aplicarEstado(anterior);
    return true;
  }

  /** Refaz o último gesto desfeito. */
  public refazer(): boolean {
    const proximo = this.refeitos.pop();
    if (!proximo || !this.base) {
      this.avisar('Nada a refazer.');
      return false;
    }
    this.historico.push(this.base);
    this.aplicarEstado(proximo);
    return true;
  }

  private aplicarEstado(alvo: Feicao): void {
    if (!this.feicaoAtual) return;
    const nova = { ...this.feicaoAtual, geometria: alvo.geometria };
    this.feicaoAtual = nova;
    this.base = nova;
    this.pts = pontosDe(nova.geometria).map((p) => [p[0], p[1]] as LatLonPar);
    this.retangulo = this.detectarRetangulo();
    this.reconstruir();
    this.dep.previsualizar(nova);
    this.gravar(nova);
    this.atualizarBotoes();
  }

  private aoTecla = (e: KeyboardEvent): void => {
    if (!this.feicaoAtual || e.defaultPrevented || focoEmCampoDeTexto(e)) return;
    const mod = e.ctrlKey || e.metaKey;
    const tecla = e.key.toLowerCase();
    if (mod && !e.altKey && tecla === 'z') {
      if (e.shiftKey) this.refazer();
      else this.desfazer();
    } else if (mod && !e.altKey && tecla === 'y') {
      this.refazer();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selecionado === null) return; // sem nó selecionado, a tecla segue o rumo normal
      this.excluir(this.selecionado);
    } else if (e.key === 'Enter') {
      this.parar();
    } else {
      return;
    }
    e.preventDefault();
  };

  // ---- snap visual ----

  private mostrarSnap(coord: LatLonPar): void {
    if (!this.grupo) return;
    if (!this.marcadorSnap) {
      this.marcadorSnap = L.marker(coord, {
        icon: L.divIcon({
          className: 'custom-leaflet-marker cm-snap',
          iconSize: [18, 18],
          html: '<div style="width:18px;height:18px;box-sizing:border-box;border:2px solid #22d3ee;transform:rotate(45deg);border-radius:2px"></div>'
        }),
        interactive: false,
        pane: PANE_EDICAO,
        keyboard: false
      }).addTo(this.grupo);
    } else {
      this.marcadorSnap.setLatLng(coord);
    }
  }

  private esconderSnap(): void {
    if (this.marcadorSnap) {
      this.grupo?.removeLayer(this.marcadorSnap);
      this.marcadorSnap = null;
    }
  }

  // ---- HUD ----

  private montarHud(): void {
    const container = this.dep.map.getContainer();
    const hud = document.createElement('div');
    hud.id = ID_HUD_EDICAO;
    hud.style.cssText =
      CSS_POSICAO_HUD + 'gap:8px;align-items:center;' +
      'padding:4px 10px;border-radius:8px;background:rgba(15,23,42,.92);color:#fff;font:11px var(--ui-fonte-base,sans-serif);' +
      'border:1px solid rgba(255,255,255,.2);pointer-events:auto';
    const campo = (nome: string): HTMLElement => {
      const s = document.createElement('span');
      s.dataset.campo = nome;
      return s;
    };
    const botao = (acao: string, rotulo: string, titulo: string, aoClicar: () => void, destaque = false): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.acao = acao;
      b.textContent = rotulo;
      b.title = titulo;
      b.style.cssText = `padding:2px 8px;font-size:11px;border-radius:4px;border:1px solid ${destaque ? COR : 'rgba(255,255,255,.3)'};background:${destaque ? COR : 'transparent'};color:${destaque ? '#111' : '#fff'};font-weight:600;cursor:pointer`;
      b.addEventListener('click', aoClicar);
      return b;
    };
    const geom = this.feicaoAtual?.geometria.tipo;
    const titulo = document.createElement('strong');
    titulo.textContent = this.ehCirculo ? 'Círculo' : 'Editando';
    const snap = campo('snap');
    snap.style.cursor = 'pointer';
    snap.style.whiteSpace = 'nowrap';
    snap.title = 'Alternar snap (S). Alt desliga temporariamente.';
    snap.style.opacity = '.85';
    snap.addEventListener('click', () => this.dep.alternarSnap());
    const dica = campo('dica');
    dica.style.opacity = '.7';
    dica.textContent = geom === 'Circle'
      ? 'Ctrl+Z desfaz · Enter conclui'
      : geom === 'Point'
        ? 'Arraste para mover · Ctrl+Z desfaz · Enter conclui'
        : 'Arraste ○ p/ curvar · ponto do meio: novo nó · botão direito ou Delete no nó: excluir · 2× clique: curva/canto · Shift: alça livre · Ctrl+Z desfaz';
    dica.title = 'Alças pontilhadas ainda são retas. Shift vale durante o arraste. Enter, Esc ou Concluir sai; clicar fora não sai.';
    dica.style.fontSize = '10px';
    const aviso = campo('aviso');
    aviso.style.color = '#fbbf24';
    aviso.setAttribute('role', 'status');

    hud.append(titulo, campo('nos'), campo('medida'), snap, dica, aviso);
    hud.append(botao('desfazer', 'Desfazer', 'Desfazer o último gesto (Ctrl+Z)', () => this.desfazer()));
    hud.append(botao('refazer', 'Refazer', 'Refazer (Ctrl+Shift+Z ou Ctrl+Y)', () => this.refazer()));
    if (geom === 'LineString' || geom === 'Polygon') {
      hud.append(botao('excluir-no', 'Excluir nó', 'Exclui o nó selecionado (Delete); clique num nó para selecioná-lo', () => this.excluirSelecionado()));
    }
    hud.append(botao('cancelar', 'Cancelar', 'Descartar tudo o que foi alterado nesta edição', () => this.cancelar()));
    hud.append(botao('concluir', 'Concluir', 'Concluir a edição (Enter ou Esc)', () => this.parar(), true));
    // não deixa o HUD iniciar caixa de seleção nem pan
    L.DomEvent.disableClickPropagation(hud);
    L.DomEvent.disableScrollPropagation(hud);
    container.appendChild(hud);
    this.hud = hud;
    this.atualizarSnapNoHud();
    this.atualizarBotoes();
  }

  private atualizarBotoes(): void {
    if (!this.hud) return;
    const estado: Record<string, boolean> = {
      desfazer: this.historico.length > 0,
      refazer: this.refeitos.length > 0,
      'excluir-no': this.selecionado !== null
    };
    for (const [acao, ligado] of Object.entries(estado)) {
      const b = this.hud.querySelector<HTMLButtonElement>(`[data-acao="${acao}"]`);
      if (!b) continue;
      b.disabled = !ligado;
      b.style.opacity = ligado ? '1' : '.4';
      b.style.cursor = ligado ? 'pointer' : 'default';
    }
  }

  /** Mensagem curta no HUD (recusas, nada a desfazer), que some sozinha. */
  private avisar(texto: string): void {
    const el = this.hud?.querySelector('[data-campo="aviso"]');
    if (!el) return;
    el.textContent = texto;
    if (this.avisoTimer) clearTimeout(this.avisoTimer);
    this.avisoTimer = setTimeout(() => {
      el.textContent = '';
      this.avisoTimer = null;
    }, AVISO_MS);
  }

  private atualizarHud(geometria?: GeometriaFeicao): void {
    if (!this.hud || !this.feicaoAtual) return;
    const g = geometria ?? this.geometriaAtual();
    const nos = this.hud.querySelector('[data-campo="nos"]');
    const medida = this.hud.querySelector('[data-campo="medida"]');
    if (nos) nos.textContent = g.tipo === 'Circle' ? 'Centro move · borda = raio' : `${this.pts.length} nós`;
    if (!medida) return;
    if (g.tipo === 'Polygon') {
      medida.textContent = `Área ${formatarArea(areaDaGeometria(g) ?? 0)} · perím. ${formatarExtensao(extensaoDaGeometria(g) ?? 0)}`;
    } else if (g.tipo === 'LineString') {
      medida.textContent = formatarExtensao(extensaoDaGeometria(g) ?? 0);
    } else if (g.tipo === 'Point') {
      medida.textContent = `${g.coordenada[0].toFixed(6)}, ${g.coordenada[1].toFixed(6)}`;
    } else if (g.tipo === 'Circle') {
      medida.textContent = `Raio: ${formatarExtensao(g.raioMetros)} · Área: ${formatarArea(areaDaGeometria(g) ?? 0)}`;
    }
  }

  /** Para os testes: posição atual dos vértices. */
  public vertices(): LatLonPar[] {
    return this.pts.map((p) => [p[0], p[1]] as LatLonPar);
  }

  /** Para os testes: quantas alças de Bézier estão na tela. */
  public get totalAlcasBezier(): number {
    return this.alcasBezier.length;
  }

  /** Para os testes/API: arrasta uma alça do nó `indice` até `coord` (`independente` = Shift). */
  public arrastarAlcaPara(indice: number, qual: QualAlca, coord: LatLonPar, independente = false): void {
    const a = this.alcasBezier.find((x) => x.i === indice && x.qual === qual);
    if (!a) return;
    a.marker.setLatLng(coord);
    this.aoArrastarAlca(a, !independente);
    this.confirmar(this.feicaoAtual!);
  }

  /** Para os testes/API: mesma operação do duplo clique no nó. */
  public alternarSuavidadeDoNo(indice: number): void {
    this.alternarSuave(indice);
  }

  /** Para os testes: move um vértice como se a alça tivesse sido arrastada até `coord` (`livre` = Shift). */
  public arrastarPara(indice: number, coord: LatLonPar, livre = false): void {
    const alca = this.alcas[indice];
    if (!alca) return;
    alca.setLatLng(coord);
    this.aoArrastar(alca, indice, livre);
    alca.fire('dragend');
  }
}
