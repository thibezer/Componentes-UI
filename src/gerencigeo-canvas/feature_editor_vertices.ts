import L from 'leaflet';
import type { Feicao, LatLonPar } from './feature_types';
import {
  alternarSuavidade, comPontos, inserirPonto, minimoVertices, moverAlca, nosDe, pontoMedioDoSegmento, pontosDe,
  removerPonto, segmentosDoEditor, type QualAlca
} from './feature_edicao_ops';
import {
  areaDaGeometria, extensaoDaGeometria, formatarArea, formatarExtensao
} from './feature_metricas';
import type { ResultadoSnap } from './feature_snap';
import { CSS_POSICAO_HUD } from './feature_hud';

/*
 * Editor visual de vértices (Leaflet): uma alça arrastável por vértice, alças-fantasma nos pontos
 * médios (clique insere), botão direito exclui, snap durante o arrasto e HUD com medidas ao vivo.
 * A geometria é recalculada pelas funções puras de feature_edicao_ops.ts.
 */

export const ID_HUD_EDICAO = 'cm-vertex-edit-hud';
const PANE_EDICAO = 'cad-edicao-vertices';
const COR = '#facc15';
const COR_ALCA = '#f472b6';

export interface DependenciasEditor {
  map: L.Map;
  /** Snap para a posição do cursor, ignorando o vértice em arrasto. Já considera se o snap está ligado. */
  buscarSnap: (coord: LatLonPar, excluir: { feicaoId: string; camadaId: string; vertice?: number }) => ResultadoSnap | null;
  snapLigado: () => boolean;
  alternarSnap: () => void;
  /** Mostra a geometria nova no mapa sem gravar (durante o arrasto). */
  previsualizar: (f: Feicao) => void;
  /** Fim de cada gesto (soltar alça, inserir, excluir): grava a feição. */
  aoGesto: (f: Feicao) => void;
  /** A edição terminou (Concluir, Esc, ou chamada de `parar`). */
  aoEncerrar: (f: Feicao) => void;
}

export class EditorVertices {
  private feicaoAtual: Feicao | null = null;
  private pts: LatLonPar[] = [];
  private alcas: L.Marker[] = [];
  private fantasmas: Array<{ marker: L.Marker; i: number; j: number }> = [];
  /** Alças de Bézier (só em feição com curva): marcador + haste até o nó. */
  private alcasBezier: Array<{ marker: L.Marker; haste: L.Polyline; i: number; qual: QualAlca }> = [];
  private marcadorSnap: L.Marker | null = null;
  private hud: HTMLElement | null = null;
  private grupo: L.LayerGroup | null = null;

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

  public iniciar(f: Feicao): void {
    this.parar();
    this.feicaoAtual = f;
    this.pts = pontosDe(f.geometria).map((p) => [p[0], p[1]] as LatLonPar);
    const map = this.dep.map;
    if (!map.getPane(PANE_EDICAO)) {
      const pane = map.createPane(PANE_EDICAO);
      pane.style.zIndex = '9000';
    }
    this.grupo = L.layerGroup().addTo(map);
    this.montarHud();
    this.reconstruir();
  }

  /** Encerra a edição (idempotente). */
  public parar(): void {
    const f = this.feicaoAtual;
    if (!f) return;
    this.feicaoAtual = null;
    this.alcas = [];
    this.fantasmas = [];
    this.alcasBezier = [];
    this.grupo?.remove();
    this.grupo = null;
    this.marcadorSnap = null;
    this.hud?.remove();
    this.hud = null;
    this.dep.aoEncerrar(f);
  }

  /** A feição foi alterada por fora (API): refaz as alças com a geometria nova. */
  public sincronizar(f: Feicao): void {
    if (!this.feicaoAtual || this.feicaoAtual.id !== f.id) return;
    this.feicaoAtual = f;
    this.pts = pontosDe(f.geometria).map((p) => [p[0], p[1]] as LatLonPar);
    this.reconstruir();
  }

  /** Atualiza o texto "Snap" do HUD quando o snap é ligado/desligado. */
  public atualizarSnapNoHud(): void {
    const el = this.hud?.querySelector('[data-campo="snap"]');
    if (el) el.textContent = `Snap: ${this.dep.snapLigado() ? 'ligado' : 'desligado'} (S)`;
  }

  // ---- construção ----

  private geometriaAtual() {
    return comPontos(this.feicaoAtual!.geometria, this.pts);
  }

  private feicaoComPontos(): Feicao {
    return { ...this.feicaoAtual!, geometria: this.geometriaAtual() };
  }

  private reconstruir(): void {
    this.grupo?.clearLayers();
    this.alcas = [];
    this.fantasmas = [];
    this.alcasBezier = [];
    if (!this.feicaoAtual || !this.grupo) return;

    const g = this.feicaoAtual.geometria;
    this.pts.forEach((p, i) => {
      const alca = this.criarAlca(p, i);
      this.alcas.push(alca);
      this.grupo!.addLayer(alca);
    });

    this.criarAlcasBezier();

    if (g.tipo !== 'Point') {
      for (const [i, j] of segmentosDoEditor(this.geometriaAtual())) {
        const f = this.criarFantasma(i, j);
        this.fantasmas.push(f);
        this.grupo.addLayer(f.marker);
      }
    }
    this.atualizarHud();
  }

  private icone(classe: string, tam: number, estilo: string): L.DivIcon {
    return L.divIcon({
      className: `custom-leaflet-marker ${classe}`,
      iconSize: [tam, tam],
      html: `<div style="width:${tam}px;height:${tam}px;box-sizing:border-box;${estilo}"></div>`
    });
  }

  private criarAlca(p: LatLonPar, indice: number): L.Marker {
    const marker = L.marker(p, {
      icon: this.icone('cad-vertex-handle', 12, `background:${COR};border:2px solid #111;border-radius:${this.ehCirculo && indice === 1 ? '50%' : '2px'};cursor:${this.ehCirculo && indice === 1 ? 'ew-resize' : 'move'}`),
      draggable: true,
      pane: PANE_EDICAO,
      keyboard: false
    });

    marker.on('drag', () => this.aoArrastar(marker, indice));
    marker.on('dragend', () => {
      this.esconderSnap();
      this.confirmar(this.feicaoComPontos());
    });
    marker.on('contextmenu', (ev: L.LeafletMouseEvent) => {
      L.DomEvent.preventDefault(ev.originalEvent);
      L.DomEvent.stopPropagation(ev.originalEvent);
      this.excluir(indice);
    });
    // duplo clique: canto ↔ suave (numa linha/polígono comum, é o que converte em curva)
    marker.on('dblclick', (ev: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(ev.originalEvent);
      this.alternarSuave(indice);
    });
    return marker;
  }

  // ---- alças de Bézier ----

  private criarAlcasBezier(): void {
    const nos = this.feicaoAtual && nosDe(this.feicaoAtual.geometria);
    if (!nos) return;
    nos.forEach((_, i) => this.completarAlcasDoNo(i));
  }

  /** Cria os marcadores das alças do nó que ainda não têm (ex.: a oposta que nasceu ao arrastar com simetria). */
  private completarAlcasDoNo(i: number): void {
    const no = this.feicaoAtual && nosDe(this.feicaoAtual.geometria)?.[i];
    if (!no || !this.grupo) return;
    for (const qual of ['entrada', 'saida'] as const) {
      const pos = no[qual];
      if (!pos || this.alcasBezier.some((a) => a.i === i && a.qual === qual)) continue;
      const haste = L.polyline([no.ponto, pos], { pane: PANE_EDICAO, color: COR_ALCA, weight: 1, opacity: 0.8, interactive: false });
      const marker = L.marker(pos, {
        icon: this.icone('cad-bezier-handle', 10, `background:#fff;border:2px solid ${COR_ALCA};border-radius:50%;cursor:move`),
        draggable: true,
        pane: PANE_EDICAO,
        keyboard: false
      });
      const entrada = { marker, haste, i, qual };
      marker.on('drag', (ev: L.LeafletEvent) => {
        const o = (ev as unknown as { originalEvent?: MouseEvent }).originalEvent;
        this.aoArrastarAlca(entrada, !o?.shiftKey);
      });
      marker.on('dragend', () => this.confirmar(this.feicaoAtual!));
      this.alcasBezier.push(entrada);
      this.grupo.addLayer(haste);
      this.grupo.addLayer(marker);
    }
  }

  /** Reposiciona marcadores e hastes de todas as alças conforme a geometria atual. */
  private sincronizarAlcasBezier(): void {
    const nos = this.feicaoAtual && nosDe(this.feicaoAtual.geometria);
    if (!nos) return;
    for (const a of this.alcasBezier) {
      const pos = nos[a.i]?.[a.qual];
      if (!pos) continue;
      if (a.marker.getLatLng().lat !== pos[0] || a.marker.getLatLng().lng !== pos[1]) a.marker.setLatLng(pos);
      a.haste.setLatLngs([nos[a.i].ponto, pos]);
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
      pane: PANE_EDICAO,
      keyboard: false
    });
    // o editor reconstrói tudo a cada inserção/exclusão, então `i` nunca fica desatualizado
    marker.on('click', (ev: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(ev.originalEvent);
      this.inserir(i, marker.getLatLng());
    });
    return { marker, i, j };
  }

  // ---- gestos ----

  private aoArrastar(alca: L.Marker, indice: number): void {
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
    this.pts[indice] = pos;
    // fantasmas vizinhos acompanham o vértice
    for (const fan of this.fantasmas) {
      if (fan.i === indice || fan.j === indice) fan.marker.setLatLng(pontoMedioDoSegmento(this.geometriaAtual(), fan.i, fan.j));
    }
    this.dep.previsualizar(this.feicaoComPontos());
    this.atualizarAlcasDoNo(indice);
    this.atualizarHud();
  }

  /** Durante o arrasto de um nó, as alças dele acompanham (a geometria só é gravada no fim do gesto). */
  private atualizarAlcasDoNo(indice: number): void {
    const nos = nosDe(this.geometriaAtual());
    if (!nos) return;
    for (const a of this.alcasBezier) {
      if (a.i !== indice) continue;
      const pos = nos[indice][a.qual];
      if (!pos) continue;
      a.marker.setLatLng(pos);
      a.haste.setLatLngs([nos[indice].ponto, pos]);
    }
  }

  private inserir(depoisDe: number, coord: L.LatLng): void {
    const f = this.feicaoAtual;
    if (!f) return;
    const nova = inserirPonto(this.geometriaAtual(), depoisDe, [coord.lat, coord.lng]);
    this.pts = pontosDe(nova).map((p) => [p[0], p[1]] as LatLonPar);
    this.reconstruir();
    const atualizada = this.feicaoComPontos();
    this.dep.previsualizar(atualizada);
    this.confirmar(atualizada);
  }

  private confirmar(f: Feicao): void {
    this.feicaoAtual = f;
    this.dep.aoGesto(f);
  }

  private excluir(indice: number): void {
    const f = this.feicaoAtual;
    if (!f) return;
    const nova = removerPonto(this.geometriaAtual(), indice);
    if (!nova) return; // abaixo do mínimo (3 no polígono, 2 na linha)
    this.pts = pontosDe(nova).map((p) => [p[0], p[1]] as LatLonPar);
    this.reconstruir();
    const atualizada = this.feicaoComPontos();
    this.dep.previsualizar(atualizada);
    this.confirmar(atualizada);
  }

  /** Atalho para testes/API: mesma operação do botão direito. */
  public excluirVertice(indice: number): boolean {
    const antes = this.pts.length;
    this.excluir(indice);
    return this.pts.length < antes;
  }

  public inserirVerticeApos(indice: number): void {
    if (indice < 0 || indice >= this.pts.length) return;
    const proximo = (indice + 1) % this.pts.length;
    const m = pontoMedioDoSegmento(this.geometriaAtual(), indice, proximo);
    this.inserir(indice, L.latLng(m[0], m[1]));
  }

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
      CSS_POSICAO_HUD + 'gap:12px;align-items:center;' +
      'padding:6px 12px;border-radius:8px;background:rgba(15,23,42,.92);color:#fff;font:12px var(--ui-fonte-base,sans-serif);' +
      'border:1px solid rgba(255,255,255,.2);pointer-events:auto';
    const campo = (nome: string): HTMLElement => {
      const s = document.createElement('span');
      s.dataset.campo = nome;
      return s;
    };
    const titulo = document.createElement('strong');
    titulo.textContent = this.ehCirculo ? 'Editando círculo' : 'Editando vértices';
    const snap = campo('snap');
    snap.style.cursor = 'pointer';
    snap.title = 'Alternar snap (S). Alt desliga temporariamente.';
    snap.addEventListener('click', () => this.dep.alternarSnap());
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = 'Concluir';
    botao.style.cssText = 'padding:3px 10px;border-radius:4px;border:1px solid #facc15;background:#facc15;color:#111;font-weight:600;cursor:pointer';
    botao.addEventListener('click', () => this.parar());
    const dica = campo('dica');
    dica.style.opacity = '.7';
    dica.textContent = 'Duplo clique no nó: curva ↔ canto · Alças: Shift solta a simetria';
    hud.append(titulo, campo('nos'), campo('medida'), snap, dica, botao);
    // não deixa o HUD iniciar caixa de seleção nem pan
    L.DomEvent.disableClickPropagation(hud);
    L.DomEvent.disableScrollPropagation(hud);
    container.appendChild(hud);
    this.hud = hud;
    this.atualizarSnapNoHud();
  }

  private atualizarHud(): void {
    if (!this.hud || !this.feicaoAtual) return;
    const g = this.geometriaAtual();
    const nos = this.hud.querySelector('[data-campo="nos"]');
    const medida = this.hud.querySelector('[data-campo="medida"]');
    if (nos) nos.textContent = g.tipo === 'Circle' ? 'Centro move · borda muda o raio' : `Nós: ${this.pts.length} (mín. ${minimoVertices(g)})`;
    if (!medida) return;
    if (g.tipo === 'Polygon') {
      medida.textContent = `Área: ${formatarArea(areaDaGeometria(g) ?? 0)} · Perímetro: ${formatarExtensao(extensaoDaGeometria(g) ?? 0)}`;
    } else if (g.tipo === 'LineString') {
      medida.textContent = `Extensão: ${formatarExtensao(extensaoDaGeometria(g) ?? 0)}`;
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

  /** Para os testes: move um vértice como se a alça tivesse sido arrastada até `coord`. */
  public arrastarPara(indice: number, coord: LatLonPar): void {
    const alca = this.alcas[indice];
    if (!alca) return;
    alca.setLatLng(coord);
    this.aoArrastar(alca, indice);
    alca.fire('dragend');
  }
}
