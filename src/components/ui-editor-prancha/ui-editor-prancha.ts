import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ListenerBag } from '../../core/listener-bag';
import { ITENS_PREDEFINICOES, type GrupoPredefinicao } from '../../gerencigeo-canvas/prancha/elemento_predefinicoes';
import type { CamadaPrancha, ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import { ligarPaineisPrancha, type CamadasLigavel, type PaletaLigavel, type PropriedadesLigavel } from '../ui-canvas-prancha/prancha-paineis';
import { instalarIsolamentoDeTeclas, lerModoTeclado } from '../ui-canvas-prancha/prancha-teclado';
import type { UICanvasPrancha } from '../ui-canvas-prancha/ui-canvas-prancha';
import type { DetalheEditorCancelarPrancha, DetalheEditorConcluirPrancha, LateralEditorPrancha, BarraFormasEditorPrancha } from './editor-tipos';
import { lerBarraFormas, lerLateral, LARGURA_ESTREITA_PX } from './editor-modos';
import estilos from './ui-editor-prancha.css?inline';

/** Atributos repassados à prancha interna (o resto é do editor). */
const REPASSADOS = ['largura', 'altura', 'unidade', 'grade', 'mostrar-grade', 'margens', 'ajustar-ao-abrir', 'somente-leitura', 'sem-snap', 'sem-reguas', 'rotulo'] as const;

const ROTULO_GRUPO: Readonly<Record<GrupoPredefinicao, string>> = { molduras: 'Molduras', formas: 'Formas', linhas: 'Linhas', setas: 'Setas' };

/**
 * Editor de prancha completo: a `<ui-canvas-prancha>` com a paleta de ferramentas, o painel de camadas, o painel de
 * propriedades e um menu de pré-definições, já ligados entre si. Pensado para um modal: **responsivo por container query**
 * (a largura do próprio editor, não da janela): abaixo de ~720 px a barra de formas vira um botão "Formas" com menu e a
 * coluna lateral vira uma gaveta (botão "Propriedades" ou Alt+P). O teclado é `isolado` por padrão (nenhuma tecla do editor
 * chega aos atalhos globais do hospedeiro, salvo as do navegador) e o Esc sem nada a cancelar vira `editor-cancelar`.
 * Não grava nada: devolve os dados em `editor-concluir`. Os componentes internos (`ui-paleta-ferramentas`, `ui-camadas`,
 * `ui-tabela-propriedades`) são registrados pelo entrypoint `@thibezer/ui-components-kit/prancha`.
 *
 * @attr {number} largura - Largura da folha em mm (padrão 210).
 * @attr {number} altura - Altura da folha em mm (padrão 297).
 * @attr {string} margens - Margens da folha em mm, `"e d s i"` (guias e quadro das pré-definições de moldura).
 * @attr {number} grade - Passo da grade em mm.
 * @attr {boolean} mostrar-grade - Mostra a grade.
 * @attr {string} ajustar-ao-abrir - `folha` (padrão), `conteudo` ou `nenhum`.
 * @attr {string} teclado - `isolado` (padrão), `exclusivo` ou `local` (ver `docs/canvas-prancha-eventos.md`).
 * @attr {string} barra-formas - `auto` (padrão: botões em editor largo, menu "Formas" em editor estreito), `botoes` ou `menu`.
 * @attr {string} lateral - `auto` (padrão: fixa em editor largo, gaveta em editor estreito), `fixa` ou `gaveta`.
 * @attr {boolean} somente-leitura - Sem edição.
 *
 * @fires editor-concluir - `{ elementos, camadas, modificado }`: o usuário confirmou.
 * @fires editor-cancelar - `{ modificado }`: o usuário cancelou (botão, ou Esc sem nada a cancelar na prancha).
 * @fires prancha-modificado - `{ modificado, revisao }`: sobe da prancha interna (só nas transições).
 *
 * @csspart base - Contêiner raiz.
 * @csspart barra - Barra de pré-definições e do botão da lateral.
 * @csspart menu-formas - O menu "Formas".
 * @csspart lateral - Coluna (ou gaveta) de camadas e propriedades.
 * @csspart acoes - Rodapé com Cancelar e Concluir.
 *
 * @cssprop --ui-editor-prancha-lateral - Largura da lateral (padrão 300px).
 */
export class UIEditorPrancha extends SafeHTMLElement {
  static get observedAttributes() {
    return [...REPASSADOS, 'teclado', 'barra-formas', 'lateral'];
  }

  private readonly shadow: ShadowRoot;
  private readonly bag = new ListenerBag();
  private desligarPaineis: (() => void) | null = null;
  private observador: ResizeObserver | null = null;
  private readonly _prancha: UICanvasPrancha;
  private readonly paleta: HTMLElement;
  private readonly painelCamadas: HTMLElement;
  private readonly painelPropriedades: HTMLElement;
  private readonly raiz: HTMLElement;
  private readonly botaoLateral: HTMLButtonElement;
  private readonly botaoFormas: HTMLButtonElement;
  private readonly menuFormas: HTMLElement;
  private _lateralAberta = false;
  private estreito = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="raiz" id="raiz" part="base" data-barra="auto" data-lateral="auto" data-lateral-aberta="false">
        <div class="barra" part="barra" id="barra" role="toolbar" aria-label="Formas e painéis">
          <div class="botoes-formas" id="botoes-formas" role="group" aria-label="Pré-definições"></div>
          <div class="formas-menu">
            <button type="button" id="btn-formas" class="btn-formas" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-formas">Formas ▾</button>
            <div id="menu-formas" class="menu-formas" part="menu-formas" role="menu" aria-label="Formas" hidden></div>
          </div>
          <button type="button" id="btn-lateral" class="btn-lateral" aria-expanded="false" aria-controls="lateral" aria-keyshortcuts="Alt+P" title="Propriedades e camadas (Alt+P)">Propriedades</button>
        </div>
        <div class="area">
          <ui-paleta-ferramentas id="paleta" orientacao="vertical" atalhos></ui-paleta-ferramentas>
          <ui-canvas-prancha id="prancha" part="prancha" teclado="isolado" ajustar-ao-abrir="folha"></ui-canvas-prancha>
          <div class="lateral" id="lateral" part="lateral" role="region" aria-label="Camadas e propriedades">
            <ui-camadas id="camadas" densidade="compacto" mostrar-mapas-base="false" mostrar-rodape="false" persistir="false" altura="260"></ui-camadas>
            <ui-tabela-propriedades id="propriedades" titulo="Aparência" modo-aplicar="imediato"></ui-tabela-propriedades>
          </div>
        </div>
        <div class="acoes" part="acoes">
          <button type="button" id="cancelar">Cancelar</button>
          <button type="button" id="concluir" class="primario">Concluir</button>
        </div>
      </div>`;
    const q = <T extends HTMLElement>(id: string): T => this.shadow.getElementById(id) as T;
    this._prancha = q<UICanvasPrancha>('prancha');
    this.paleta = q('paleta');
    this.painelCamadas = q('camadas');
    this.painelPropriedades = q('propriedades');
    this.raiz = q('raiz');
    this.botaoLateral = q<HTMLButtonElement>('btn-lateral');
    this.botaoFormas = q<HTMLButtonElement>('btn-formas');
    this.menuFormas = q('menu-formas');
    // menu e botões de pré-definições: rótulos pt-BR do kit, montados por nós de DOM (nada de HTML de fora)
    const botoes = q('botoes-formas');
    let grupoAtual: GrupoPredefinicao | null = null;
    let corpoGrupo: HTMLElement | null = null;
    for (const item of ITENS_PREDEFINICOES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.predefinicao = item.valor;
      b.textContent = item.rotulo;
      botoes.appendChild(b);
      if (item.grupo !== grupoAtual) {
        grupoAtual = item.grupo;
        corpoGrupo = document.createElement('div');
        corpoGrupo.setAttribute('role', 'group');
        corpoGrupo.setAttribute('aria-label', ROTULO_GRUPO[item.grupo]);
        const titulo = document.createElement('div');
        titulo.className = 'menu-grupo';
        titulo.setAttribute('aria-hidden', 'true');
        titulo.textContent = ROTULO_GRUPO[item.grupo];
        corpoGrupo.appendChild(titulo);
        this.menuFormas.appendChild(corpoGrupo);
      }
      const m = document.createElement('button');
      m.type = 'button';
      m.setAttribute('role', 'menuitem');
      m.tabIndex = -1;
      m.dataset.predefinicao = item.valor;
      m.textContent = item.rotulo;
      corpoGrupo?.appendChild(m);
    }
  }

  connectedCallback(): void {
    this.bag.cleanup();
    this.observador?.disconnect();
    this.observador = null;
    this.desligarPaineis?.();
    this.sincronizarAtributos();
    this.desligarPaineis = ligarPaineisPrancha({
      prancha: this._prancha,
      paleta: this.paleta as unknown as PaletaLigavel,
      camadas: this.painelCamadas as unknown as CamadasLigavel,
      propriedades: this.painelPropriedades as unknown as PropriedadesLigavel
    });
    // teclado isolado: nada do que acontece dentro do editor chega aos atalhos globais do hospedeiro
    instalarIsolamentoDeTeclas(this.bag, this, () => lerModoTeclado(this.getAttribute('teclado') ?? 'isolado') === 'isolado');
    this.bag.add(this.shadow.getElementById('concluir'), 'click', () => this.concluir());
    this.bag.add(this.shadow.getElementById('cancelar'), 'click', () => this.cancelar());
    // só os botões (o menu "Formas" também está na barra e tem o seu próprio ouvinte: senão a forma seria inserida duas vezes)
    this.bag.add(this.shadow.getElementById('botoes-formas'), 'click', (e: Event) => {
      const alvo = (e.target as HTMLElement | null)?.closest?.('button[data-predefinicao]') as HTMLButtonElement | null;
      if (alvo) this.inserir(alvo.dataset.predefinicao);
    });
    // menu "Formas"
    this.bag.add(this.botaoFormas, 'click', () => this.alternarMenuFormas());
    this.bag.add(this.botaoFormas, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.abrirMenuFormas(); }
    });
    this.bag.add(this.menuFormas, 'click', (e: Event) => {
      const alvo = (e.target as HTMLElement | null)?.closest?.('button[data-predefinicao]') as HTMLButtonElement | null;
      if (!alvo) return;
      this.fecharMenuFormas(false);
      this.inserir(alvo.dataset.predefinicao);
    });
    this.bag.add(this.menuFormas, 'keydown', (e: KeyboardEvent) => this.tecladoDoMenu(e));
    if (typeof document !== 'undefined') {
      this.bag.add(document, 'pointerdown', (e: Event) => {
        if (this.menuFormas.hidden) return;
        const caminho = typeof e.composedPath === 'function' ? e.composedPath() : [];
        if (!caminho.includes(this.menuFormas) && !caminho.includes(this.botaoFormas)) this.fecharMenuFormas(false);
      });
    }
    // lateral em gaveta
    this.bag.add(this.botaoLateral, 'click', () => { this.lateralAberta = !this.lateralAberta; });
    this.bag.add(this.shadow.getElementById('lateral'), 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.emGaveta() && this._lateralAberta) {
        e.preventDefault();
        e.stopPropagation();
        this.lateralAberta = false;
        this.botaoLateral.focus();
      }
    });
    // Alt+P abre/fecha a lateral (com o foco em qualquer parte do editor)
    // (em captura: a prancha interna isola o teclado na bolha e esta tecla nunca chegaria aqui vinda do canvas)
    this.bag.add(this, 'keydown', (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && typeof e.key === 'string' && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        this.lateralAberta = !this.lateralAberta;
        if (this._lateralAberta && this.emGaveta()) this.painelPropriedades.focus();
      }
    }, { capture: true });
    // Esc sem nada a cancelar na prancha: fecha o editor
    this.bag.add(this._prancha, 'prancha-esc-sem-efeito', () => this.cancelar());
    if (typeof ResizeObserver === 'function') {
      this.observador = new ResizeObserver((entradas) => {
        const largura = entradas[entradas.length - 1]?.contentRect?.width ?? 0;
        if (largura > 0) this.definirLargura(largura);
      });
      this.observador.observe(this.raiz);
    }
    this.atualizarLateral();
  }

  disconnectedCallback(): void {
    this.bag.cleanup();
    this.observador?.disconnect();
    this.observador = null;
    this.desligarPaineis?.();
    this.desligarPaineis = null;
    this.fecharMenuFormas(false);
  }

  attributeChangedCallback(nome: string, _antigo: string | null, valor: string | null): void {
    if (nome === 'barra-formas') { this.raiz.dataset.barra = lerBarraFormas(valor); return; }
    if (nome === 'lateral') { this.raiz.dataset.lateral = lerLateral(valor); this.atualizarLateral(); return; }
    this.repassar(nome, valor);
  }

  private repassar(nome: string, valor: string | null): void {
    if (nome === 'teclado') {
      const modo = lerModoTeclado(valor ?? 'isolado');
      if (modo === 'local') this._prancha.removeAttribute('teclado');
      else this._prancha.setAttribute('teclado', modo);
      return;
    }
    if (valor === null) this._prancha.removeAttribute(nome);
    else this._prancha.setAttribute(nome, valor);
  }

  private sincronizarAtributos(): void {
    for (const n of REPASSADOS) this.repassar(n, this.getAttribute(n));
    this.repassar('teclado', this.getAttribute('teclado'));
    this.raiz.dataset.barra = lerBarraFormas(this.getAttribute('barra-formas'));
    this.raiz.dataset.lateral = lerLateral(this.getAttribute('lateral'));
  }

  private inserir(valor: string | undefined): void {
    const item = ITENS_PREDEFINICOES.find((i) => i.valor === valor);
    if (item) this._prancha.inserirPredefinicao(item.valor, undefined, item.usaQuadro ? { quadro: 'margens' } : {});
  }

  // ---------- menu "Formas" ----------

  private itensDoMenu(): HTMLButtonElement[] {
    return Array.from(this.menuFormas.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'));
  }

  private abrirMenuFormas(): void {
    this.menuFormas.hidden = false;
    this.botaoFormas.setAttribute('aria-expanded', 'true');
    this.itensDoMenu()[0]?.focus();
  }

  private fecharMenuFormas(devolverFoco: boolean): void {
    if (this.menuFormas.hidden) return;
    this.menuFormas.hidden = true;
    this.botaoFormas.setAttribute('aria-expanded', 'false');
    if (devolverFoco) this.botaoFormas.focus();
  }

  private alternarMenuFormas(): void {
    if (this.menuFormas.hidden) this.abrirMenuFormas();
    else this.fecharMenuFormas(true);
  }

  private tecladoDoMenu(e: KeyboardEvent): void {
    const itens = this.itensDoMenu();
    const i = itens.indexOf(this.shadow.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.fecharMenuFormas(true); return; }
    if (e.key === 'Tab') { this.fecharMenuFormas(false); return; }
    const vai = (n: number): void => { e.preventDefault(); itens[(n + itens.length) % itens.length]?.focus(); };
    if (e.key === 'ArrowDown') vai(i + 1);
    else if (e.key === 'ArrowUp') vai(i - 1);
    else if (e.key === 'Home') vai(0);
    else if (e.key === 'End') vai(itens.length - 1);
  }

  // ---------- lateral ----------

  private emGaveta(): boolean {
    const modo = lerLateral(this.getAttribute('lateral'));
    return modo === 'gaveta' || (modo === 'auto' && this.estreito);
  }

  private definirLargura(largura: number): void {
    const estreito = largura < LARGURA_ESTREITA_PX;
    if (estreito === this.estreito) return;
    this.estreito = estreito;
    this.atualizarLateral();
  }

  private atualizarLateral(): void {
    const gaveta = this.emGaveta();
    if (!gaveta) this._lateralAberta = false;
    this.raiz.dataset.lateralAberta = String(this._lateralAberta);
    this.botaoLateral.setAttribute('aria-expanded', String(!gaveta || this._lateralAberta));
    this.botaoLateral.toggleAttribute('data-gaveta', gaveta);
  }

  /** A lateral (camadas e propriedades) está visível? Em modo fixo é sempre `true`; em gaveta, é o estado aberto/fechado. */
  get lateralAberta(): boolean { return !this.emGaveta() || this._lateralAberta; }
  set lateralAberta(v: boolean) {
    if (!this.emGaveta()) return;
    this._lateralAberta = !!v;
    this.atualizarLateral();
    if (this._lateralAberta) this.painelPropriedades.focus();
  }

  /** `auto`, `fixa` ou `gaveta`. */
  get lateral(): LateralEditorPrancha { return lerLateral(this.getAttribute('lateral')); }
  set lateral(v: LateralEditorPrancha) { this.setAttribute('lateral', lerLateral(v)); }

  /** `auto`, `botoes` ou `menu`. */
  get barraFormas(): BarraFormasEditorPrancha { return lerBarraFormas(this.getAttribute('barra-formas')); }
  set barraFormas(v: BarraFormasEditorPrancha) { this.setAttribute('barra-formas', lerBarraFormas(v)); }

  // ---------- API ----------

  /** A prancha interna (para usar a API completa: ferramentas, vista, exportação). */
  get prancha(): UICanvasPrancha { return this._prancha; }

  /** Elementos do desenho. Ao atribuir, carrega (normaliza) e marca como salvo. */
  get elementos(): ElementoGrafico[] { return this._prancha.obterElementos(); }
  set elementos(lista: ElementoGrafico[]) { this._prancha.definirElementos(Array.isArray(lista) ? lista : []); }

  get camadas(): CamadaPrancha[] { return this._prancha.obterCamadas(); }
  set camadas(lista: CamadaPrancha[]) { this._prancha.definirCamadas(Array.isArray(lista) ? lista : []); }

  get modificado(): boolean { return this._prancha.modificado; }
  marcarComoSalvo(): void { this._prancha.marcarComoSalvo(); }
  /** Resolve quando a prancha mediu o layout e consegue enquadrar. */
  get pronto(): Promise<void> { return this._prancha.pronto; }

  /** Confirma: emite `editor-concluir` com os dados atuais. */
  concluir(): void {
    const detail: DetalheEditorConcluirPrancha = { elementos: this._prancha.obterElementos(), camadas: this._prancha.obterCamadas(), modificado: this._prancha.modificado };
    this.dispatchEvent(new CustomEvent('editor-concluir', { detail, bubbles: true, composed: true }));
  }

  /** Cancela: emite `editor-cancelar`. */
  cancelar(): void {
    const detail: DetalheEditorCancelarPrancha = { modificado: this._prancha.modificado };
    this.dispatchEvent(new CustomEvent('editor-cancelar', { detail, bubbles: true, composed: true }));
  }

  focus(opcoes?: FocusOptions): void { this._prancha.focus(opcoes); }
}

definirCustomElement('ui-editor-prancha', UIEditorPrancha);
