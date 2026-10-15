import L from 'leaflet';
import { focoEmCampoDeTexto } from '../core/alvo-digitavel';
import type { GeometriaFeicao, LatLonPar } from './feature_types';
import { SessaoDesenho, type Ferramenta } from './feature_desenho';
import {
  areaDaGeometria, comprimentoMetros, extensaoDaGeometria, formatarArea, formatarExtensao, distanciaMetros
} from './feature_metricas';
import type { ResultadoSnap } from './feature_snap';
import { CSS_POSICAO_HUD } from './feature_hud';
import { criarCamadaCurva } from './curva_leaflet';
import { espelhoDaAlca } from './feature_curvas';

/*
 * Camada visual das ferramentas de desenho: traduz mouse e teclado em chamadas à `SessaoDesenho`,
 * desenha a prévia, o marcador de snap, o HUD (`#cm-draw-hud`) e o resultado das medições.
 * O que fazer com a geometria pronta (criar feição, dividir, amostrar cor) fica com quem chama.
 */

export const ID_HUD_DESENHO = 'cm-draw-hud';
export const CLASSE_FERRAMENTA_ATIVA = 'cad-ferramenta-ativa';
const PANE = 'cad-desenho';
const COR = '#22d3ee';
/** Cliques a menos que isto de distância (px) e de tempo (ms) do anterior são o 2º clique de um duplo clique. */
const REPETICAO_PX = 4;
const REPETICAO_MS = 450;
/** Distância (px) do clique ao primeiro vértice para fechar a figura. */
const FECHAR_PX = 10;

export interface InfoMedicao {
  tipo: 'distancia' | 'area';
  pontos: LatLonPar[];
  comprimentoM: number;
  areaM2?: number;
  perimetroM?: number;
}

export interface DependenciasDesenho {
  map: L.Map;
  buscarSnap: (coord: LatLonPar) => ResultadoSnap | null;
  snapAtivo: () => boolean;
  /** Geometria pronta de uma ferramenta de criação/divisão (`texto` vem do campo de entrada). */
  aoGeometria: (ferramenta: Ferramenta, geometria: GeometriaFeicao) => void;
  aoMedir: (info: InfoMedicao) => void;
  /** Clique do conta-gotas, na coordenada (já com snap, se ligado). */
  aoAmostrar: (coord: LatLonPar, evento: MouseEvent | undefined) => void;
  /** Ferramenta desativada (Esc sem nada em andamento, troca de ferramenta ou `desativar`). */
  aoDesativar: (ferramenta: Ferramenta) => void;
  /**
   * Clique da ferramenta texto, antes do campo inline. Devolver `true` significa que o consumidor assumiu a entrada
   * do texto (ex.: abriu um modal) e o campo inline não deve aparecer.
   */
  aoSolicitarTexto?: (coord: LatLonPar) => boolean;
}

const NOME: Record<Ferramenta, string> = {
  ponto: 'Ponto', linha: 'Linha', poligono: 'Polígono', retangulo: 'Retângulo', elipse: 'Elipse',
  'poligono-regular': 'Polígono regular (hexágono)', estrela: 'Estrela', circulo: 'Círculo',
  texto: 'Texto', caneta: 'Caneta (Bézier)', 'medir-distancia': 'Medir distância', 'medir-area': 'Medir área',
  dividir: 'Dividir polígono', 'selecao-laco': 'Seleção por laço', 'conta-gotas': 'Conta-gotas'
};

const DICA: Record<Ferramenta, string> = {
  ponto: 'Clique para colocar', linha: 'Clique nos vértices · Enter ou duplo clique conclui', poligono: 'Clique nos vértices · Enter ou duplo clique conclui',
  retangulo: 'Clique nos dois cantos', elipse: 'Clique no centro e depois no canto da caixa',
  'poligono-regular': 'Clique no centro e depois num vértice', estrela: 'Clique no centro e depois numa ponta',
  circulo: 'Clique no centro e depois num ponto da borda', texto: 'Clique onde o texto vai',
  caneta: 'Clique e arraste para curvar · Enter conclui · 1º ponto fecha', 'medir-distancia': 'Clique nos pontos · Enter conclui',
  'medir-area': 'Clique nos vértices · Enter conclui', dividir: 'Desenhe a linha de corte · Enter aplica',
  'selecao-laco': 'Desenhe o laço · Enter ou 1º ponto fecha e seleciona',
  'conta-gotas': 'Clique numa feição para copiar o estilo'
};

export class ControleDesenho {
  private sessao: SessaoDesenho | null = null;
  private fechar = false;
  private grupo: L.LayerGroup | null = null;
  private previa: L.Layer | null = null;
  private marcas: L.LayerGroup | null = null;
  private medicao: L.LayerGroup | null = null;
  private marcadorSnap: L.Marker | null = null;
  private hud: HTMLElement | null = null;
  private campoTexto: HTMLInputElement | null = null;
  private arrastando = false;
  private ultimoClique: { x: number; y: number; t: number } | null = null;

  constructor(private dep: DependenciasDesenho) {}

  public get ferramenta(): Ferramenta | null {
    return this.sessao?.ferramenta ?? null;
  }

  public get ativo(): boolean {
    return this.sessao !== null;
  }

  /** Vértices/âncoras já colocados na figura em andamento. */
  public get nos(): number {
    return this.sessao?.nos ?? 0;
  }

  /** Desfaz o último vértice (mesmo que Backspace/Ctrl+Z). */
  public desfazerVertice(): boolean {
    if (!this.sessao?.desfazer()) return false;
    this.atualizar();
    return true;
  }

  /** Liga uma ferramenta (troca a anterior). `fechar` faz a caneta gerar polígono em vez de linha. */
  public ativar(ferramenta: Ferramenta, opcoes: { fechar?: boolean } = {}): void {
    const anterior = this.sessao?.ferramenta;
    this.desligar();
    if (anterior) this.dep.aoDesativar(anterior);
    this.limparMedicao();

    const map = this.dep.map;
    this.fechar = !!opcoes.fechar;
    this.sessao = new SessaoDesenho(ferramenta, this.fechar);
    if (!map.getPane(PANE)) map.createPane(PANE).style.zIndex = '8500';
    this.grupo = L.layerGroup().addTo(map);
    this.marcas = L.layerGroup().addTo(this.grupo);

    const c = map.getContainer();
    c.classList.add(CLASSE_FERRAMENTA_ATIVA);
    c.style.cursor = ferramenta === 'conta-gotas' ? 'copy' : 'crosshair';
    map.on('click', this.aoClicar);
    map.on('dblclick', this.aoDuploClique);
    map.on('mousemove', this.aoMover);
    map.on('mousedown', this.aoPressionar);
    // na window (e não no mapa): soltar o botão fora do mapa também termina o arraste da alça
    window.addEventListener('mouseup', this.aoSoltar);
    window.addEventListener('keydown', this.aoTecla);
    this.montarHud();
    this.atualizar();
  }

  /** Desliga a ferramenta ativa (idempotente). A medição pronta continua na tela. */
  public desativar(): void {
    const f = this.sessao?.ferramenta;
    if (!f) return;
    this.desligar();
    this.dep.aoDesativar(f);
  }

  public limparMedicao(): void {
    this.medicao?.remove();
    this.medicao = null;
  }

  private desligar(): void {
    const map = this.dep.map;
    map.off('click', this.aoClicar);
    map.off('dblclick', this.aoDuploClique);
    map.off('mousemove', this.aoMover);
    map.off('mousedown', this.aoPressionar);
    window.removeEventListener('mouseup', this.aoSoltar);
    window.removeEventListener('keydown', this.aoTecla);
    const c = map.getContainer();
    c.classList.remove(CLASSE_FERRAMENTA_ATIVA);
    c.style.cursor = '';
    this.grupo?.remove();
    this.grupo = null;
    this.previa = null;
    this.marcas = null;
    this.marcadorSnap = null;
    this.hud?.remove();
    this.hud = null;
    this.campoTexto = null;
    this.sessao = null;
    this.arrastando = false;
    this.ultimoClique = null;
  }

  // ---- entrada ----

  private coordenada(e: L.LeafletMouseEvent): LatLonPar {
    const bruta: LatLonPar = [e.latlng.lat, e.latlng.lng];
    if (!this.dep.snapAtivo()) {
      this.esconderSnap();
      return bruta;
    }
    const s = this.dep.buscarSnap(bruta);
    if (s) {
      this.mostrarSnap(s.coordenada);
      return s.coordenada;
    }
    this.esconderSnap();
    return bruta;
  }

  private repetido(e: L.LeafletMouseEvent): boolean {
    const u = this.ultimoClique;
    const agora = Date.now();
    const p = e.containerPoint;
    const igual = !!u && Math.hypot(u.x - p.x, u.y - p.y) <= REPETICAO_PX && agora - u.t <= REPETICAO_MS;
    this.ultimoClique = { x: p.x, y: p.y, t: agora };
    return igual;
  }

  private aoClicar = (e: L.LeafletMouseEvent): void => {
    const s = this.sessao;
    if (!s || s.ferramenta === 'caneta' || this.campoTexto) return;
    if (e.originalEvent?.button !== undefined && e.originalEvent.button !== 0) return;
    const coord = this.coordenada(e);

    if (s.ferramenta === 'conta-gotas') {
      this.dep.aoAmostrar(coord, e.originalEvent);
      return;
    }
    if (s.ehSequencial && this.repetido(e)) return;
    if (this.fechaNoPrimeiroVertice(e)) return;

    const r = s.clicar(coord);
    if (r.concluida) {
      if (r.concluida.tipo === 'Text') this.pedirTexto(coord);
      else this.finalizar(r.concluida);
      return;
    }
    this.atualizar();
  };

  /** Com 3+ vértices, um clique perto do primeiro fecha a figura em polígono. */
  private fechaNoPrimeiroVertice(e: L.LeafletMouseEvent): boolean {
    const s = this.sessao;
    const primeiro = s?.primeiro;
    if (!s || !primeiro || !s.fechaNoPrimeiro) return false;
    const a = this.dep.map.latLngToContainerPoint(primeiro);
    if (Math.hypot(a.x - e.containerPoint.x, a.y - e.containerPoint.y) > FECHAR_PX) return false;
    const g = s.concluirFechando();
    if (g) this.finalizar(g);
    return !!g;
  }

  private aoPressionar = (e: L.LeafletMouseEvent): void => {
    const s = this.sessao;
    if (!s || s.ferramenta !== 'caneta' || e.originalEvent?.button !== 0) return;
    if (this.repetido(e)) return; // 2º clique de um duplo clique: o dblclick conclui
    if (this.fechaNoPrimeiroVertice(e)) return;
    s.clicar(this.coordenada(e));
    this.arrastando = true;
    this.atualizar();
  };

  private aoSoltar = (): void => {
    this.arrastando = false;
  };

  private aoMover = (e: L.LeafletMouseEvent): void => {
    const s = this.sessao;
    if (!s) return;
    const coord = this.coordenada(e);
    s.mover(coord);
    if (this.arrastando) s.definirAlca(coord);
    this.atualizar();
  };

  private aoDuploClique = (): void => {
    this.concluir();
  };

  private aoTecla = (e: KeyboardEvent): void => {
    const s = this.sessao;
    if (!s) return;
    const digitando = focoEmCampoDeTexto(e);
    if (e.key === 'Escape') {
      if (digitando && !this.campoTexto) return;
      if (this.campoTexto) this.cancelarTexto();
      else if (s.nos > 0) this.reiniciar();
      else this.desativar();
      e.preventDefault();
      return;
    }
    if (digitando) return;
    if (e.key === 'Enter') {
      this.concluir();
      e.preventDefault();
    } else if (e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) {
      if (s.desfazer()) this.atualizar();
      e.preventDefault();
    }
  };

  // ---- conclusão ----

  /** Fecha a ferramenta sequencial em andamento (Enter, duplo clique ou botão Concluir). */
  public concluir(): void {
    const s = this.sessao;
    if (!s) return;
    const g = s.concluir();
    if (g) this.finalizar(g);
  }

  /**
   * Botão direito com a ferramenta ativa: conclui se já dá figura; senão desfaz o último vértice;
   * sem nada em andamento, desliga a ferramenta (mesmo roteiro do antigo MapEngine).
   */
  public botaoDireito(): void {
    const s = this.sessao;
    if (!s) return;
    if (this.campoTexto) {
      this.cancelarTexto();
      return;
    }
    if (s.podeConcluir) this.concluir();
    else if (s.nos > 0 && s.desfazer()) this.atualizar();
    else this.desativar();
  }

  private reiniciar(): void {
    const f = this.sessao?.ferramenta;
    if (!f) return;
    this.sessao = new SessaoDesenho(f, this.fechar);
    this.ultimoClique = null;
    this.arrastando = false;
    this.atualizar();
  }

  private finalizar(g: GeometriaFeicao): void {
    const f = this.sessao!.ferramenta;
    const medicao = f === 'medir-distancia' || f === 'medir-area' ? this.mostrarMedicao(g, f) : null;
    // começa outra sessão da mesma ferramenta ANTES de avisar: quem escuta pode desativar ou trocar de ferramenta,
    // e nada do que roda depois pode ressuscitar a sessão
    this.sessao = new SessaoDesenho(f, this.fechar);
    this.ultimoClique = null;
    this.atualizar();
    if (medicao) this.dep.aoMedir(medicao);
    this.dep.aoGeometria(f, g);
  }

  // ---- texto ----

  private pedirTexto(coord: LatLonPar): void {
    if (!this.hud) return;
    if (this.dep.aoSolicitarTexto?.(coord)) return; // o consumidor cuida da entrada (modal próprio)
    if (!this.hud) return; // ... e pode ter desativado a ferramenta no evento
    const campo = document.createElement('input');
    campo.type = 'text';
    campo.placeholder = 'Texto…';
    campo.style.cssText = 'padding:3px 6px;border-radius:4px;border:1px solid #475569;background:#0f172a;color:#fff;min-width:160px';
    campo.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') {
        const texto = campo.value.trim();
        this.cancelarTexto();
        if (texto) this.finalizar({ tipo: 'Text', coordenada: coord, texto });
      } else if (ev.key === 'Escape') {
        this.cancelarTexto();
      }
    });
    this.campoTexto = campo;
    this.hud.insertBefore(campo, this.hud.querySelector('[data-campo="dica"]'));
    campo.focus();
  }

  private cancelarTexto(): void {
    this.campoTexto?.remove();
    this.campoTexto = null;
  }

  // ---- desenho ----

  private atualizar(): void {
    const s = this.sessao;
    if (!s || !this.grupo || !this.marcas) return;

    if (this.previa) {
      this.grupo.removeLayer(this.previa);
      this.previa = null;
    }
    const g = s.previa();
    if (g) {
      this.previa = this.desenharGeometria(g, true);
      this.grupo.addLayer(this.previa);
    }
    this.marcas.clearLayers();
    const marcados = s.ferramenta === 'caneta' ? s.ancoras.map((a) => a.ponto) : s.pontos;
    // caneta: mostra as alças (linha entre a de entrada e a de saída) para o usuário ver o que está curvando
    if (s.ferramenta === 'caneta') {
      for (const a of s.ancoras) {
        if (!a.alca) continue;
        const entrada = espelhoDaAlca(a.ponto, a.alca);
        this.marcas.addLayer(L.polyline([entrada, a.alca], { pane: PANE, color: COR, weight: 1, opacity: 0.8, interactive: false }));
        for (const alca of [entrada, a.alca]) {
          this.marcas.addLayer(L.circleMarker(alca, { pane: PANE, radius: 3, color: COR, weight: 1, fillColor: '#fff', fillOpacity: 1, interactive: false }));
        }
      }
    }
    for (const p of marcados) {
      this.marcas.addLayer(L.circleMarker(p, { pane: PANE, radius: 4, color: '#111', weight: 1, fillColor: COR, fillOpacity: 1, interactive: false }));
    }
    this.atualizarHud(g);
  }

  private desenharGeometria(g: GeometriaFeicao, provisoria: boolean): L.Layer {
    const estilo: L.PathOptions = {
      pane: PANE, color: COR, weight: 2, dashArray: provisoria ? '6 4' : undefined,
      fillColor: COR, fillOpacity: 0.15, interactive: false
    };
    const curva = criarCamadaCurva(g, estilo);
    if (curva) return curva;
    if (g.tipo === 'Polygon') return L.polygon(g.aneis, estilo);
    if (g.tipo === 'Circle') return L.circle(g.centro, { ...estilo, radius: g.raioMetros });
    if (g.tipo === 'LineString') return L.polyline(g.coordenadas, estilo);
    const c = g.tipo === 'Point' ? g.coordenada : (g as { coordenada: LatLonPar }).coordenada;
    return L.circleMarker(c, { ...estilo, radius: 5 });
  }

  // ---- medição ----

  /** Desenha a medição pronta e devolve o resumo; quem chama avisa o consumidor (depois de a sessão estar estável). */
  private mostrarMedicao(g: GeometriaFeicao, f: Ferramenta): InfoMedicao {
    this.limparMedicao();
    const grupo = L.layerGroup().addTo(this.dep.map);
    this.medicao = grupo;
    grupo.addLayer(this.desenharGeometria(g, false));

    const pts = g.tipo === 'Polygon' ? g.aneis[0] : g.tipo === 'LineString' ? g.coordenadas : [];
    const fechado = g.tipo === 'Polygon';
    const rotulo = (pos: LatLonPar, texto: string): void => {
      const div = document.createElement('div');
      div.textContent = texto;
      div.style.cssText = 'white-space:nowrap;font:600 11px sans-serif;color:#fff;background:rgba(15,23,42,.85);padding:1px 5px;border-radius:3px;transform:translate(-50%,-50%)';
      grupo.addLayer(L.marker(pos, {
        pane: PANE, interactive: false, keyboard: false,
        icon: L.divIcon({ className: 'custom-leaflet-marker', iconSize: undefined, html: div })
      }));
    };
    const total = fechado ? pts.length : pts.length - 1;
    for (let i = 0; i < total; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      rotulo([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], formatarExtensao(distanciaMetros(a, b)));
    }

    const info: InfoMedicao = {
      tipo: f === 'medir-area' ? 'area' : 'distancia',
      pontos: pts,
      comprimentoM: comprimentoMetros(pts, false)
    };
    if (g.tipo === 'Polygon') {
      info.areaM2 = areaDaGeometria(g) ?? 0;
      info.perimetroM = extensaoDaGeometria(g) ?? 0;
    } else if (f === 'medir-distancia' && pts.length >= 3) {
      // régua com 3+ pontos: também a área e o perímetro do contorno fechado (sem criar feição)
      const contorno: GeometriaFeicao = { tipo: 'Polygon', aneis: [pts] };
      info.areaM2 = areaDaGeometria(contorno) ?? 0;
      info.perimetroM = extensaoDaGeometria(contorno) ?? 0;
    }
    return info;
  }

  // ---- snap visual ----

  private mostrarSnap(coord: LatLonPar): void {
    if (!this.grupo) return;
    if (!this.marcadorSnap) {
      this.marcadorSnap = L.marker(coord, {
        pane: PANE, interactive: false, keyboard: false,
        icon: L.divIcon({
          className: 'custom-leaflet-marker cm-snap', iconSize: [18, 18],
          html: '<div style="width:18px;height:18px;box-sizing:border-box;border:2px solid #22d3ee;transform:rotate(45deg);border-radius:2px"></div>'
        })
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
    const s = this.sessao;
    if (!s) return;
    const hud = document.createElement('div');
    hud.id = ID_HUD_DESENHO;
    hud.style.cssText =
      CSS_POSICAO_HUD + 'gap:10px;align-items:center;' +
      'padding:6px 12px;border-radius:8px;background:rgba(15,23,42,.92);color:#fff;font:12px var(--ui-fonte-base,sans-serif);' +
      'border:1px solid rgba(255,255,255,.2);pointer-events:auto';
    const campo = (n: string): HTMLElement => {
      const e = document.createElement('span');
      e.dataset.campo = n;
      return e;
    };
    const titulo = document.createElement('strong');
    titulo.textContent = NOME[s.ferramenta];
    const dica = campo('dica');
    dica.style.opacity = '.7';
    dica.textContent = DICA[s.ferramenta];
    const botao = (rotulo: string, acao: () => void, destaque = false): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = rotulo;
      b.style.cssText = `padding:3px 10px;border-radius:4px;border:1px solid ${destaque ? COR : 'rgba(255,255,255,.3)'};background:${destaque ? COR : 'transparent'};color:${destaque ? '#111' : '#fff'};cursor:pointer;font-weight:600`;
      b.addEventListener('click', acao);
      return b;
    };
    hud.append(titulo, campo('nos'), campo('medida'), dica);
    if (s.ehSequencial) hud.append(botao('Concluir', () => this.concluir(), true));
    hud.append(botao('Sair', () => this.desativar()));
    L.DomEvent.disableClickPropagation(hud);
    L.DomEvent.disableScrollPropagation(hud);
    this.dep.map.getContainer().appendChild(hud);
    this.hud = hud;
  }

  private atualizarHud(previa: GeometriaFeicao | null): void {
    const s = this.sessao;
    if (!this.hud || !s) return;
    const nos = this.hud.querySelector('[data-campo="nos"]');
    const medida = this.hud.querySelector('[data-campo="medida"]');
    if (nos) nos.textContent = s.nos > 0 ? `Nós: ${s.nos}` : '';
    if (!medida) return;
    let t = '';
    if (previa?.tipo === 'Polygon') t = `Área: ${formatarArea(areaDaGeometria(previa) ?? 0)} · Perímetro: ${formatarExtensao(extensaoDaGeometria(previa) ?? 0)}`;
    else if (previa?.tipo === 'LineString') {
      t = `Extensão: ${formatarExtensao(s.comprimentoMetros())}`;
      // régua com 3+ pontos: mostra também a área e o perímetro do contorno fechado (nada é criado)
      if (s.ferramenta === 'medir-distancia' && s.nos >= 3 && previa.coordenadas.length >= 3) {
        const contorno: GeometriaFeicao = { tipo: 'Polygon', aneis: [previa.coordenadas] };
        t += ` · Área: ${formatarArea(areaDaGeometria(contorno) ?? 0)} · Perímetro: ${formatarExtensao(extensaoDaGeometria(contorno) ?? 0)}`;
      }
    }
    else if (previa?.tipo === 'Circle') t = `Raio: ${formatarExtensao(previa.raioMetros)}`;
    medida.textContent = t;
  }

  /** Para os testes: simula um clique na coordenada, sem passar pelo mapa. */
  public clicarEm(coord: LatLonPar): void {
    const s = this.sessao;
    if (!s) return;
    const r = s.clicar(coord);
    if (r.concluida) {
      if (r.concluida.tipo === 'Text') this.pedirTexto(coord);
      else this.finalizar(r.concluida);
    } else {
      this.atualizar();
    }
  }

  public moverPara(coord: LatLonPar): void {
    this.sessao?.mover(coord);
    this.atualizar();
  }
}
