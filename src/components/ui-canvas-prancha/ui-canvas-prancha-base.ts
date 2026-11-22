import { SafeHTMLElement } from '../../core/ssr-safe';
import { ListenerBag } from '../../core/listener-bag';
import { UIBus } from '../../core/ui-bus';
import type { Par } from '../../gerencigeo-canvas/feature_types';
import { saneada, type Matriz2D } from '../../gerencigeo-canvas/espaco/espaco_matriz';
import { envelopeVisual } from '../../gerencigeo-canvas/prancha/envelope_visual';
import { caixaDoQuadro, gerarPredefinicao, ehPredefinicao, type Predefinicao } from '../../gerencigeo-canvas/prancha/elemento_predefinicoes';
import type { ContextoPranchaRelativo } from '../../gerencigeo-canvas/prancha/pintura_contexto';
import { desenharElementos, type ContextoPrancha2D, type EstatisticasPintura, type OpcoesPintura } from '../../gerencigeo-canvas/prancha/pintura_canvas';
import { exportarSvg, type OpcoesSvg } from '../../gerencigeo-canvas/prancha/exportar_svg';
import type { Guia } from '../../gerencigeo-canvas/prancha/elemento_snap';
import type { CaixaMm, ElementoGrafico, RaiosCantos } from '../../gerencigeo-canvas/prancha/tipos';
import { obterTemplatePrancha } from './prancha-template';
import { ControladorPrancha } from './prancha-controlador';
import { InteracaoPrancha } from './prancha-interacao';
import { FerramentasDesenho } from './prancha-ferramentas';
import { RenderizadorPrancha, fabricaPadrao, type FabricaContextoPrancha } from './prancha-render';
import { tratarTecla, soltarTecla, marcarTratadoPelaPrancha, instalarIsolamentoDeTeclas, instalarTecladoModal, lerModoTeclado, type ModoTecladoPrancha } from './prancha-teclado';
import { assinarComandos, ehComandoPrancha } from './prancha-bus';
import { ATRIBUTOS_PRANCHA, aplicarAtributoPrancha, lerAjusteAoAbrir, lerMargens } from './prancha-atributos-sync';
import { anunciar, textoZoom } from './prancha-acessibilidade';
import { resolverCores } from './prancha-cores';
import { PX_POR_MM_100 } from './prancha-vista';
import { garantirMedidorTexto } from './prancha-medidor-texto';
import * as cmd from './prancha-comandos';
import {
  ehFerramentaPrancha, type DetalheVistaPrancha, type FerramentaPrancha, type LotePrancha, type OpcoesAjustarElementos, type OpcoesDadosPrancha,
  type OpcoesFerramentasPrancha, type OpcoesInserirPredefinicao, type ResultadoLotePrancha
} from './tipos';

/**
 * Base do `<ui-canvas-prancha>`: ciclo de vida, atributos, dados, seleção, ferramentas, vista, guias, exportação e os
 * comandos da Fase 3. O elemento registrado (`UICanvasPrancha`, em `ui-canvas-prancha.ts`) estende esta classe com a
 * organização e as operações (Fase 4). Dividida só para manter os arquivos pequenos (Regra #4).
 */
export class UICanvasPranchaBase extends SafeHTMLElement {
  static get observedAttributes() {
    return ATRIBUTOS_PRANCHA;
  }

  private readonly shadow: ShadowRoot;
  private readonly bag = new ListenerBag();
  protected readonly c: ControladorPrancha;
  protected readonly interacao: InteracaoPrancha;
  protected readonly render: RenderizadorPrancha;
  private readonly viewport: HTMLElement;
  private readonly status: HTMLElement | null;
  private observador: ResizeObserver | null = null;
  private desligarBus: Array<() => void> = [];
  private ponteiroSobre = false;
  private focoDentro = false;
  private enquadrou = false;
  private _fabrica: FabricaContextoPrancha = fabricaPadrao;
  private revisaoSalva = 0;
  private _modificado = false;
  private conteudoEnquadrado = false;
  private _pronto!: Promise<void>;
  private resolverPronto: (() => void) | null = null;
  private fimPronto = 0;
  private carregando = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = obterTemplatePrancha();
    const q = <T extends HTMLElement>(id: string) => this.shadow.getElementById(id) as T;
    this.viewport = q<HTMLElement>('viewport');
    this.status = q<HTMLElement>('status');
    this.c = new ControladorPrancha({
      emitir: (nome, detalhe, cancelavel) => {
        const ev = new CustomEvent(nome, { detail: detalhe, bubbles: true, composed: true, cancelable: !!cancelavel });
        this.dispatchEvent(ev);
        return ev.defaultPrevented;
      },
      agendar: () => this.render?.agendar(),
      anunciar: (texto) => anunciar(this.status, texto)
    });
    this._pronto = new Promise<void>((res) => { this.resolverPronto = res; });
    this.c.doc.ouvirMudancas(() => this.avaliarModificado());
    this.interacao = new InteracaoPrancha(this.c, this.viewport, new FerramentasDesenho(this.c));
    this.render = new RenderizadorPrancha(this.c, {
      viewport: this.viewport, base: q('camada-base'), sobreposicao: q('camada-sobreposicao'), reguaH: q('regua-h'), reguaV: q('regua-v')
    }, () => this._fabrica);
  }

  connectedCallback(): void {
    this.bag.cleanup();
    this.interacao.conectar(this.bag, this.shadow.getElementById('regua-h'), this.shadow.getElementById('regua-v'));
    instalarIsolamentoDeTeclas(this.bag, this, () => {
      const modo = this.modoTeclado();
      return modo === 'isolado' || modo === 'modal';
    });
    instalarTecladoModal(this.bag, this, () => this.modoTeclado() === 'modal' && !this.hospedadaNoEditor());
    this.bag.add(this, 'pointerenter', () => { this.ponteiroSobre = true; });
    this.bag.add(this, 'pointerleave', () => { this.ponteiroSobre = false; });
    this.bag.add(this, 'focusin', () => { this.focoDentro = true; });
    this.bag.add(this, 'focusout', () => { this.focoDentro = false; });
    // com o foco na área de desenho a prancha trata a tecla antes dos atalhos globais da página (paletas, ribbons)
    this.bag.add<KeyboardEvent>(this.viewport, 'keydown', (e: KeyboardEvent) => this.tecla(e, true));
    if (typeof window !== 'undefined') {
      // `teclado="exclusivo"` (modal): captura as teclas da página inteira antes dos atalhos globais do hospedeiro
      // `isolado`: o mesmo, mas só para as teclas cujo caminho passa por esta prancha ou pelo editor que a contém
      this.bag.add<KeyboardEvent>(window, 'keydown', (e: KeyboardEvent) => {
        const modo = this.modoTeclado();
        // exclusivo: a página inteira; isolado: o que vem de dentro do editor, com a mesma regra do modo local (foco ou ponteiro
        // na prancha), para o zoom do navegador e as teclas dos painéis do editor não serem tratados como da prancha
        if (modo === 'exclusivo') this.tecla(e, true, true);
        else if ((modo === 'isolado' || modo === 'modal') && this.noEscopoDoTeclado(e)) this.tecla(e, false, true);
      }, { capture: true });
      this.bag.add<KeyboardEvent>(window, 'keydown', (e: KeyboardEvent) => this.tecla(e));
      // em captura: com o isolamento a tecla solta não chega à janela, e o espaço (mão temporária) não pode ficar preso
      this.bag.add<KeyboardEvent>(window, 'keyup', (e: KeyboardEvent) => soltarTecla(this.c, this.interacao, e), { capture: true });
      this.bag.add(window, 'blur', () => { this.interacao.espaco = false; });
    }
    if (typeof ResizeObserver === 'function') {
      this.observador?.disconnect();
      this.observador = new ResizeObserver(() => this.redimensionar());
      this.observador.observe(this.viewport);
    }
    this.desligarBus.forEach((f) => f());
    this.desligarBus = [
      assinarComandos(this, (comando, args) => this.executarComando(comando, args)),
      UIBus.on('tema:alterado', () => this.atualizarCores())
    ];
    if (garantirMedidorTexto()) {
      // as caixas de texto mudaram (medida real): o índice guarda envelopes e precisa ser refeito
      this.c.doc.indice.definir(this.c.doc.elementos);
    }
    this.atualizarCores();
    this.atualizarRotulo();
    this.c.margens = lerMargens(this.getAttribute('margens'));
    this.redimensionar();
    this.prepararPronto();
  }

  disconnectedCallback(): void {
    if (this.fimPronto && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.fimPronto);
    this.fimPronto = 0;
    this.bag.cleanup();
    this.observador?.disconnect();
    this.observador = null;
    this.desligarBus.forEach((f) => f());
    this.desligarBus = [];
    this.interacao.cancelar();
    this.render.cancelar();
  }

  attributeChangedCallback(nome: string, _antigo: string | null, valor: string | null): void {
    if (nome === 'rotulo') { this.atualizarRotulo(); return; }
    if (nome === 'teclado') return;
    const folhaMudou = aplicarAtributoPrancha(this.c, nome, valor);
    if (folhaMudou && !this.enquadrou) this.ajustarFolha();
  }

  /** Resolve `pronto` quando a área de desenho foi medida; sem layout (teste, aba oculta), dois quadros depois. */
  private prepararPronto(): void {
    if (!this.resolverPronto) return;
    if (this.c.vista.largura > 0) { this.concluirPronto(); return; }
    if (typeof requestAnimationFrame === 'function' && !this.fimPronto) {
      this.fimPronto = requestAnimationFrame(() => { this.fimPronto = requestAnimationFrame(() => { this.fimPronto = 0; this.concluirPronto(); }); });
    } else if (typeof requestAnimationFrame !== 'function') this.concluirPronto();
  }

  private concluirPronto(): void {
    const r = this.resolverPronto;
    if (!r) return;
    this.resolverPronto = null;
    r();
    this.dispatchEvent(new CustomEvent('prancha-pronta', { bubbles: true, composed: true, detail: {} }));
  }

  private atualizarRotulo(): void {
    this.viewport.setAttribute('aria-label', this.getAttribute('rotulo') || 'Prancha');
  }

  private atualizarCores(): void {
    this.c.cores = resolverCores(this);
    this.render.reiniciar();
    this.c.agendar();
  }

  private redimensionar(): void {
    this.render.medir();
    if (!this.enquadrou && this.c.vista.largura > 0) {
      const modo = lerAjusteAoAbrir(this.getAttribute('ajustar-ao-abrir'));
      if (modo === 'conteudo' && this.c.doc.elementos.length > 0) { this.ajustarElementos(); this.conteudoEnquadrado = true; }
      else if (modo !== 'nenhum') this.c.vista.enquadrar({ x: 0, y: 0, largura: this.c.folha.largura, altura: this.c.folha.altura });
      this.enquadrou = true;
    }
    this.render.pintar();
    this.prepararPronto();
  }

  /** Modo do atributo `teclado`: `local` (padrão), `exclusivo`, `isolado` ou `modal`. */
  private modoTeclado(): ModoTecladoPrancha {
    return lerModoTeclado(this.getAttribute('teclado'));
  }

  private hospedadaNoEditor(): boolean {
    const root = this.getRootNode();
    const host = (root as { host?: Element } | null)?.host;
    return !!host && host.localName === 'ui-editor-prancha';
  }

  private tecladoExclusivo(): boolean {
    return this.modoTeclado() === 'exclusivo';
  }

  /** O evento veio de dentro desta prancha ou do editor (outro componente) que a contém? */
  private noEscopoDoTeclado(e: Event): boolean {
    const dono = (this.getRootNode() as { host?: Element }).host;
    const caminho = typeof e.composedPath === 'function' ? e.composedPath() : [];
    return caminho.includes(this) || (!!dono && caminho.includes(dono));
  }

  private tecla(e: KeyboardEvent, naAreaDeDesenho = false, capturando = false): void {
    if (!naAreaDeDesenho && !this.focoDentro && !this.ponteiroSobre) return;
    if (!capturando && e.defaultPrevented && this.tecladoExclusivo()) return;
    if (tratarTecla(this.c, this.interacao, { ajustarFolha: () => this.ajustarFolha(), definirZoomPercentual: (p) => this.definirZoom(p) }, e)) {
      e.preventDefault();
      e.stopPropagation();
      if (capturando) e.stopImmediatePropagation();
      marcarTratadoPelaPrancha(e);
    }
  }

  // ---------- modificado, revisão e ciclo de vida ----------

  /** O documento mudou desde a carga (`definirElementos`) ou desde `marcarComoSalvo()`. */
  get modificado(): boolean { return this._modificado; }
  /** Contador de mudanças do documento (carga, edição, desfazer/refazer, renomear). */
  get revisao(): number { return this.c.doc.revisao; }
  /** Registra o estado atual como o salvo: `modificado` volta a `false` (e `prancha-modificado` só emite na transição). */
  marcarComoSalvo(): void { this.revisaoSalva = this.c.doc.revisao; this.avaliarModificado(); }

  private avaliarModificado(): void {
    if (this.carregando) return; // a carga é o novo ponto salvo, não uma modificação
    const m = this.c.doc.revisao !== this.revisaoSalva;
    if (m === this._modificado) return;
    this._modificado = m;
    this.c.emitir('prancha-modificado', { modificado: m, revisao: this.c.doc.revisao });
  }

  /**
   * Resolve quando a área de desenho foi medida e a prancha consegue enquadrar (ou, sem layout, dois quadros depois da
   * conexão). Também emite `prancha-pronta` uma vez.
   */
  get pronto(): Promise<void> { return this._pronto; }

  /** Dá o foco à área de desenho (o `focus()` do host entrega o foco ao viewport, onde o teclado da prancha escuta). */
  focus(opcoes?: FocusOptions): void { this.viewport.focus(opcoes); }

  // ---------- propriedades ----------

  /** Modo do teclado: `local` (padrão), `exclusivo`, `isolado` ou `modal`. */
  get teclado(): ModoTecladoPrancha { return this.modoTeclado(); }
  set teclado(v: ModoTecladoPrancha) { this.setAttribute('teclado', lerModoTeclado(v)); }

  /** Ferramenta ativa. */
  get ferramenta(): FerramentaPrancha { return this.c.ferramenta; }
  set ferramenta(f: FerramentaPrancha) { this.definirFerramenta(f); }

  /** Elementos do documento (na ordem de empilhamento). */
  get elementos(): ElementoGrafico[] { return [...this.c.doc.elementos]; }

  /** Ids selecionados. */
  get selecao(): string[] { return [...this.c.doc.selecao]; }

  get podeDesfazer(): boolean { return this.c.doc.historico.podeDesfazer; }
  get podeRefazer(): boolean { return this.c.doc.historico.podeRefazer; }

  /** Id provisório dos elementos criados pelo usuário (o app pode trocar por um gerador próprio). */
  get gerarId(): (tipo: string) => string { return this.c.gerarId; }
  set gerarId(fn: (tipo: string) => string) { if (typeof fn === 'function') this.c.gerarId = fn; }

  /** Fábrica do contexto 2D de cada canvas (padrão `getContext('2d')`); serve para pintar com um contexto próprio ou de teste. */
  get fabricaContexto(): FabricaContextoPrancha { return this._fabrica; }
  set fabricaContexto(f: FabricaContextoPrancha) {
    this._fabrica = typeof f === 'function' ? f : fabricaPadrao;
    this.render.reiniciar();
    this.c.agendar();
  }

  // ---------- dados (sincronização do app: não emite prancha-elemento-*) ----------

  /** Carrega o documento (normaliza; recomeça o histórico e a seleção). Devolve os recusados. */
  definirElementos(lista: unknown[]): { aceitos: number; recusados: Array<{ indice: number; id?: string; motivo: string }> } {
    this.carregando = true;
    const r = (() => { try { return this.c.doc.definir(lista); } finally { this.carregando = false; } })();
    this.c.ui.edicao = null;
    this.c.emitirHistorico();
    this.marcarComoSalvo();
    if (!this.conteudoEnquadrado && this.enquadrou && lerAjusteAoAbrir(this.getAttribute('ajustar-ao-abrir')) === 'conteudo' && r.elementos.length > 0) {
      this.conteudoEnquadrado = true;
      this.ajustarElementos();
    }
    this.c.agendar();
    return { aceitos: r.elementos.length, recusados: r.recusados };
  }

  /** Lote de mudanças do app (adicionar, atualizar, remover) de uma vez. */
  aplicarLote(lote: LotePrancha, opcoes: OpcoesDadosPrancha = {}): ResultadoLotePrancha {
    const { resultado } = this.c.doc.aplicarLote(lote, opcoes.historico !== false);
    this.c.emitirHistorico();
    this.c.agendar();
    return resultado;
  }

  adicionarElemento(el: unknown, opcoes?: OpcoesDadosPrancha): boolean { return this.aplicarLote({ adicionar: [el] }, opcoes).adicionados.length === 1; }
  atualizarElemento(el: unknown, opcoes?: OpcoesDadosPrancha): boolean { return this.aplicarLote({ atualizar: [el] }, opcoes).atualizados.length === 1; }
  removerElemento(id: string, opcoes?: OpcoesDadosPrancha): boolean { return this.aplicarLote({ remover: [id] }, opcoes).removidos.length === 1; }
  obterElementos(): ElementoGrafico[] { return this.elementos; }
  obterElemento(id: string): ElementoGrafico | null { return this.c.doc.obter(id) ?? null; }

  /** Troca o id provisório pelo definitivo em tudo (documento, seleção e histórico). */
  renomearElemento(antigo: string, novo: string): boolean {
    const ok = this.c.doc.renomear(antigo, novo);
    if (ok && this.c.ui.edicao?.id === antigo) this.c.ui.edicao.id = novo;
    return ok;
  }

  // ---------- seleção e ferramentas ----------

  selecionarElementos(ids: string[]): boolean { return this.c.selecionar(Array.isArray(ids) ? ids : []); }
  alternarSelecaoElemento(id: string): boolean { return this.c.selecionar([id], 'alternar'); }
  limparSelecao(): boolean { return this.c.selecionar([]); }
  selecionarTudo(): boolean { return cmd.selecionarTudo(this.c); }
  obterSelecao(): ElementoGrafico[] { return this.c.doc.elementosSelecionados(); }

  definirFerramenta(f: FerramentaPrancha): void {
    this.interacao.cancelar();
    this.c.definirFerramenta(ehFerramentaPrancha(f) ? f : 'selecao');
  }

  definirOpcoesFerramentas(o: OpcoesFerramentasPrancha): void { this.c.opcoesFerramentas = o && typeof o === 'object' ? { ...o } : {}; }
  obterOpcoesFerramentas(): OpcoesFerramentasPrancha { return { ...this.c.opcoesFerramentas }; }

  /** Entra na seleção direta (âncoras) do elemento. */
  editarAncoras(id: string): boolean {
    const el = typeof id === 'string' ? this.c.doc.obter(id) : undefined;
    if (!el) { this.c.recusar('editar-ancoras', 'id-invalido', typeof id === 'string' ? id : undefined); return false; }
    if (el.bloqueado || el.geometria.tipo === 'texto') return this.c.iniciarEdicao(id);
    this.c.definirFerramenta('selecao-direta');
    return this.c.iniciarEdicao(id);
  }
  concluirEdicao(): void { this.c.encerrarEdicao(); }

  // ---------- histórico e comandos sobre a seleção (emitem prancha-elemento-*) ----------

  desfazer(): boolean { return this.c.desfazer(); }
  refazer(): boolean { return this.c.refazer(); }
  moverSelecao(dx: number, dy: number): boolean { return cmd.moverSelecao(this.c, dx, dy); }
  girarSelecao(graus: number, pivo?: Par): boolean { return cmd.girarSelecao(this.c, graus, pivo); }
  escalarSelecao(sx: number, sy?: number, pivo?: Par): boolean { return cmd.escalarSelecao(this.c, sx, sy ?? sx, pivo); }
  espelharSelecao(direcao: 'horizontal' | 'vertical'): boolean { return cmd.espelharSelecao(this.c, direcao); }
  transformarSelecao(m: Matriz2D): boolean { return cmd.transformarSelecao(this.c, saneada(m)); }
  removerSelecao(): boolean { return cmd.removerSelecao(this.c); }

  /** Raios dos cantos dos retângulos selecionados, em mm (número = os quatro; ou [sup. esq., sup. dir., inf. dir., inf. esq.]). */
  definirRaiosCantos(raios: RaiosCantos | number): boolean { return cmd.definirRaiosCantosSelecao(this.c, raios); }

  /**
   * Insere uma pré-definição (moldura, seta...) e a deixa selecionada. Sem `caixa`: com `opcoes.quadro: 'margens'` (e o
   * atributo `margens`), o quadro das margens; senão, uma caixa no CENTRO DA ÁREA VISÍVEL, de tamanho proporcional ao zoom
   * (cerca de 35% da largura e 25% da altura visíveis, limitada à folha), para a forma nascer à vista.
   */
  inserirPredefinicao(tipo: Predefinicao, caixa?: CaixaMm, opcoes: OpcoesInserirPredefinicao = {}): ElementoGrafico[] {
    if (!ehPredefinicao(tipo)) { this.c.recusar('inserir-predefinicao', 'geometria-invalida'); return []; }
    const { quadro, ...opcoesForma } = opcoes ?? {};
    const alvo = caixa ?? (quadro === 'margens' && this.c.margens ? caixaDoQuadro(this.c.folha.largura, this.c.folha.altura, this.c.margens) : null) ?? this.caixaNaVista();
    const els = gerarPredefinicao(tipo, alvo, { ...opcoesForma, id: opcoesForma.id ?? this.c.gerarId(tipo) });
    return cmd.inserirNovos(this.c, els, 'predefinicao');
  }

  /** Caixa (mm) no centro da área visível, proporcional ao zoom e dentro da folha; sem vista medida, 60 × 40 mm no centro da folha. */
  private caixaNaVista(): CaixaMm {
    const f = this.c.folha;
    const v = this.c.vista;
    let x0 = 0, y0 = 0, x1 = f.largura, y1 = f.altura;
    if (v.largura > 0 && v.altura > 0) {
      const a = v.paraFolha(0, 0);
      const b = v.paraFolha(v.largura, v.altura);
      const vx0 = Math.max(0, a[0]), vy0 = Math.max(0, a[1]), vx1 = Math.min(f.largura, b[0]), vy1 = Math.min(f.altura, b[1]);
      if (vx1 > vx0 && vy1 > vy0) { x0 = vx0; y0 = vy0; x1 = vx1; y1 = vy1; }
    }
    const larg = (x1 - x0) * (v.largura > 0 ? 0.35 : 0.3);
    const alt = (y1 - y0) * (v.largura > 0 ? 0.25 : 0.15);
    const w = Math.max(1, Math.min(larg, f.largura)), h = Math.max(1, Math.min(alt, f.altura));
    // centro da vista (o centro da área de desenho); se cair fora da folha, o ponto mais perto dela
    const c = v.largura > 0 && v.altura > 0 ? v.paraFolha(v.largura / 2, v.altura / 2) : [(x0 + x1) / 2, (y0 + y1) / 2];
    const cx = Math.min(f.largura, Math.max(0, c[0])), cy = Math.min(f.altura, Math.max(0, c[1]));
    return { x: cx - w / 2, y: cy - h / 2, largura: w, altura: h };
  }

  // ---------- vista ----------

  ajustarFolha(): void {
    this.render.medir();
    if (this.c.vista.enquadrar({ x: 0, y: 0, largura: this.c.folha.largura, altura: this.c.folha.altura })) this.enquadrou = true;
    this.c.emitirVista();
  }

  ajustarSelecao(): void {
    const sel = this.c.doc.elementosSelecionados();
    if (sel.length === 0) { this.c.recusar('ajustar-selecao', 'sem-selecao'); return; }
    const caixa = envelopeVisual(sel);
    if (caixa && this.c.vista.enquadrar(caixa, 48)) this.c.emitirVista();
  }

  /**
   * Enquadra os elementos (os `ids`, ou todos) SEM mexer na seleção, com teto de zoom (`zoomMaximo`, em %: um elemento
   * pequeno não é ampliado absurdamente). Devolve se enquadrou.
   */
  ajustarElementos(ids?: string[], opcoes: OpcoesAjustarElementos = {}): boolean {
    const alvo = Array.isArray(ids) ? ids.map((id) => this.c.doc.obter(id)).filter((e): e is ElementoGrafico => !!e) : [...this.c.doc.elementos];
    const caixa = envelopeVisual(alvo);
    if (!caixa) return false;
    const margem = Number.isFinite(opcoes?.margem) && (opcoes.margem as number) >= 0 ? (opcoes.margem as number) : 48;
    const teto = Number.isFinite(opcoes?.zoomMaximo) && (opcoes.zoomMaximo as number) > 0 ? (opcoes.zoomMaximo as number) : 800;
    if (!this.c.vista.enquadrar(caixa, margem)) return false;
    const maximo = (teto / 100) * PX_POR_MM_100;
    if (this.c.vista.zoom > maximo) this.c.vista.definirZoomCentrado(maximo, caixa);
    this.c.emitirVista();
    return true;
  }

  /** Zoom em % (100% = tamanho real a 96 dpi), no centro da vista. */
  definirZoom(percentual: number): void {
    if (this.c.vista.definirZoom((percentual / 100) * PX_POR_MM_100)) { this.c.emitirVista(); this.c.anunciar(textoZoom(this.c.vista.zoomPercentual)); }
  }

  aproximar(): void { this.definirZoom(this.c.vista.zoomPercentual * 1.25); }
  afastar(): void { this.definirZoom(this.c.vista.zoomPercentual * 0.8); }
  deslocarVista(dx: number, dy: number): void { if (this.c.vista.deslocar(dx, dy)) this.c.emitirVista(); }

  obterVista(): DetalheVistaPrancha {
    const v = this.c.vista;
    return { zoom: v.zoom, zoomPercentual: v.zoomPercentual, pan: [v.pan[0], v.pan[1]] };
  }

  /** Ponto da área de desenho (px CSS) → folha (mm), e o inverso. */
  paraFolha(x: number, y: number): Par { return this.c.vista.paraFolha(x, y); }
  paraTela(p: Par): Par { return this.c.vista.paraTela(p); }

  // ---------- guias e snap ----------

  definirGuias(guias: Guia[]): void {
    this.c.guias = (Array.isArray(guias) ? guias : []).filter((g) => g && (g.orientacao === 'horizontal' || g.orientacao === 'vertical') && Number.isFinite(g.posicao)).map((g) => ({ ...g }));
    this.c.emitirGuias();
  }

  adicionarGuia(g: Guia): void { this.definirGuias([...this.c.guias, g]); }
  removerGuia(indice: number): void { this.definirGuias(this.c.guias.filter((_, i) => i !== indice)); }
  obterGuias(): Guia[] { return this.c.guias.map((g) => ({ ...g })); }
  definirSnap(ligado: boolean): void { this.toggleAttribute('sem-snap', !ligado); }

  // ---------- exportação ----------

  /** SVG da folha com os elementos (o mesmo plano de pintura da tela). */
  exportarSvg(opcoes: Partial<OpcoesSvg> = {}): string {
    return exportarSvg(this.c.doc.elementos, { largura: this.c.folha.largura, altura: this.c.folha.altura, fundo: '#ffffff', ...opcoes });
  }

  /** Pinta os elementos num contexto próprio (ex.: o PDF vetorial do app) com o mesmo código da tela. */
  desenharEm(ctx: ContextoPrancha2D | ContextoPranchaRelativo, opcoes: OpcoesPintura = {}): EstatisticasPintura {
    return desenharElementos(ctx, this.c.doc.elementos, opcoes);
  }

  /** Mede e pinta agora (sem esperar o próximo quadro). */
  renderizarAgora(): void { this.render.medir(); this.render.pintar(); }

  /** Executa um comando público pelo nome (o mesmo que o `ui-bus` usa). Comando desconhecido emite `prancha-recusa`. */
  executarComando(comando: string, args: unknown[] = []): unknown {
    if (!ehComandoPrancha(comando)) { this.c.recusar('executar-comando', 'comando-desconhecido'); return undefined; }
    const fn = (this as unknown as Record<string, (...a: unknown[]) => unknown>)[comando];
    try {
      return fn.apply(this, Array.isArray(args) ? args : []);
    } catch {
      this.c.recusar(comando, 'geometria-invalida');
      return undefined;
    }
  }
}

