import estilos from './ui-controle-cores.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ListenerBag } from '../../core/listener-bag';
import { coresUnicas, normalizarCor, normalizarOpacidade, normalizarEspessura } from './cores-utils';
import { abrirSeletorCor, UISeletorCor } from './ui-seletor-cor';
import type {
  AlvoCor,
  AtalhosControleCores,
  DetalheControleCores,
  DetalheSeletorCor,
  SeletorCorAberto,
  ValorCor
} from './tipos';

type Alterado = DetalheControleCores['alterados'][number];
type Origem = DetalheControleCores['origem'];

/**
 * <ui-controle-cores> — par de cores de desenho no estilo Illustrator: preenchimento na frente,
 * traço atrás, espessura do traçado e botões de canto para inverter, "sem cor" e restaurar o padrão.
 *
 * - Clique na amostra de trás: ela vira o alvo ativo. Clique no alvo ativo (ou duplo clique,
 *   Enter, Espaço): abre o `<ui-seletor-cor>` ao lado.
 * - Mudanças feitas pelo usuário emitem `ui-cores-change`; `confirmado: false` é pré-visualização
 *   (seletor aberto), `confirmado: true` deve ser gravado. Métodos `definir*` não emitem eventos.
 * - O kit não registra atalhos de teclado; quem usa chama `alternarAlvo()`, `inverter()`,
 *   `semCor()` e `restaurarPadrao()` e pode exibir as teclas nas dicas via `atalhos`.
 *
 * Atributos: preenchimento, traco, opacidade, espessura-traco, alvo (preenchimento|traco), padrao-preenchimento,
 *            padrao-traco, titulo-seletor, so-traco, desabilitado
 * Propriedades: preenchimento, traco, opacidade, espessuraTraco, alvo, coresProjeto, atalhos, seletorAberto
 * Métodos: definirCores(), obterCores(), definirAlvo(), alternarAlvo(), definirMisto(), inverter(),
 *          semCor(), restaurarPadrao(), abrirSeletor(), fecharSeletor()
 * Eventos: ui-cores-change (DetalheControleCores), ui-alvo-change { alvo }
 */
export class UIControleCores extends SafeHTMLElement {
  static get observedAttributes() {
    return ['preenchimento', 'traco', 'opacidade', 'espessura-traco', 'alvo', 'padrao-preenchimento', 'padrao-traco', 'desabilitado'];
  }

  private raiz: ShadowRoot;
  private listeners = new ListenerBag();
  private renderizado = false;

  private _preenchimento: ValorCor = '#00e08a';
  private _traco: ValorCor = '#ffffff';
  private _opacidade = 0.35;
  private _espessuraTraco = 2.5;
  private _alvo: AlvoCor = 'preenchimento';
  private _misto = { preenchimento: false, traco: false };
  private _padrao = { preenchimento: '#00e08a' as ValorCor, traco: '#ffffff' as ValorCor };
  private _coresProjeto: string[] = [];
  private _atalhos: AtalhosControleCores = {};
  private seletor: SeletorCorAberto | null = null;
  private estadoAoAbrir: { preenchimento: ValorCor; traco: ValorCor; opacidade: number; espessuraTraco: number } | null = null;

  constructor() {
    super();
    this.raiz = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (!this.renderizado) this.renderizar();
    this.listeners.cleanup();
    this.vincularEventos();
    this.atualizar();
  }

  disconnectedCallback() {
    // Não perde uma edição em andamento se o controle sair do DOM com o seletor aberto
    this.fecharSeletor(true);
    this.listeners.cleanup();
  }

  attributeChangedCallback(nome: string, antigo: string | null, valor: string | null) {
    if (antigo === valor) return;
    if (nome === 'desabilitado') {
      // Atributo booleano: remover também conta
      if (this.hasAttribute('desabilitado')) this.fecharSeletor(false);
      this.atualizar();
      return;
    }
    if (valor === null) return;
    if (nome === 'preenchimento') this.definirCores({ preenchimento: valor });
    else if (nome === 'traco') this.definirCores({ traco: valor });
    else if (nome === 'opacidade') this.definirCores({ opacidade: Number(valor) });
    // texto, não Number(): o atributo vazio daria 0 (o mínimo de 0,5 px) em vez do padrão
    else if (nome === 'espessura-traco') this.definirCores({ espessuraTraco: normalizarEspessura(valor) });
    else if (nome === 'alvo') this.definirAlvo(valor as AlvoCor);
    else if (nome === 'padrao-preenchimento' || nome === 'padrao-traco') {
      const cor = normalizarCor(valor);
      if (!cor) return;
      if (nome === 'padrao-preenchimento') this._padrao.preenchimento = cor;
      else this._padrao.traco = cor;
      this.atualizar();
    }
  }

  /* ---------- Propriedades ---------- */

  get preenchimento(): ValorCor { return this._preenchimento; }
  set preenchimento(v: ValorCor) { this.definirCores({ preenchimento: v }); }

  get traco(): ValorCor { return this._traco; }
  set traco(v: ValorCor) { this.definirCores({ traco: v }); }

  get opacidade(): number { return this._opacidade; }
  set opacidade(v: number) { this.definirCores({ opacidade: v }); }

  get espessuraTraco(): number { return this._espessuraTraco; }
  set espessuraTraco(v: number) { this.definirCores({ espessuraTraco: v }); }

  get alvo(): AlvoCor { return this._alvo; }
  set alvo(v: AlvoCor) { this.definirAlvo(v); }

  /** Cores oferecidas em "Cores do projeto" no seletor. */
  get coresProjeto(): string[] { return [...this._coresProjeto]; }
  set coresProjeto(v: string[]) { this._coresProjeto = coresUnicas(v); }

  /** Teclas exibidas nas dicas dos botões (ex.: `{ inverter: 'Shift+X' }`). */
  get atalhos(): AtalhosControleCores { return { ...this._atalhos }; }
  set atalhos(v: AtalhosControleCores) {
    this._atalhos = { ...(v || {}) };
    this.atualizar();
  }

  get seletorAberto(): boolean {
    return Boolean(this.seletor?.aberto);
  }

  /* ---------- Métodos (sem eventos) ---------- */

  /** Define cores, opacidade e/ou espessura sem emitir eventos. Valores inválidos são ignorados; uma cor definida deixa de ser "mista". */
  definirCores(cores: { preenchimento?: ValorCor; traco?: ValorCor; opacidade?: number; espessuraTraco?: number } = {}) {
    const p = normalizarCor(cores.preenchimento);
    const t = normalizarCor(cores.traco);
    if (p) {
      this._preenchimento = p;
      this._misto.preenchimento = false;
    }
    if (t) {
      this._traco = t;
      this._misto.traco = false;
    }
    if (cores.opacidade !== undefined) this._opacidade = normalizarOpacidade(cores.opacidade, this._opacidade);
    if (cores.espessuraTraco !== undefined) this._espessuraTraco = normalizarEspessura(cores.espessuraTraco, this._espessuraTraco);
    this.atualizar();
  }

  obterCores(): { preenchimento: ValorCor; traco: ValorCor; opacidade: number; espessuraTraco: number; alvo: AlvoCor } {
    return {
      preenchimento: this._preenchimento,
      traco: this._traco,
      opacidade: this._opacidade,
      espessuraTraco: this._espessuraTraco,
      alvo: this._alvo
    };
  }

  /** Marca a amostra como ativa sem emitir eventos. */
  definirAlvo(alvo: AlvoCor) {
    this._alvo = alvo === 'traco' ? 'traco' : 'preenchimento';
    this.atualizar();
    this.sincronizarSeletor();
  }

  /** Mostra "?" nas amostras cujas cores divergem na seleção atual. */
  definirMisto(misto: { preenchimento?: boolean; traco?: boolean } = {}) {
    this._misto = { preenchimento: Boolean(misto.preenchimento), traco: Boolean(misto.traco) };
    this.atualizar();
  }

  /* ---------- Ações (emitem eventos) ---------- */

  /** Alterna o alvo ativo entre preenchimento e traço; emite `ui-alvo-change`. */
  alternarAlvo() {
    this.mudarAlvo(this._alvo === 'traco' ? 'preenchimento' : 'traco');
  }

  /** Troca preenchimento e traço; emite `ui-cores-change` confirmado. */
  inverter() {
    const p = this._preenchimento;
    this._preenchimento = this._traco;
    this._traco = p;
    this._misto = { preenchimento: this._misto.traco, traco: this._misto.preenchimento };
    this.atualizar();
    this.emitirCores(true, ['preenchimento', 'traco'], 'inverter');
  }

  /** "Sem cor" no alvo indicado (padrão: o ativo); emite `ui-cores-change` confirmado. */
  semCor(alvo: AlvoCor = this._alvo) {
    const chave: AlvoCor = alvo === 'traco' ? 'traco' : 'preenchimento';
    if (chave === 'traco') this._traco = 'none';
    else this._preenchimento = 'none';
    this._misto[chave] = false;
    this.atualizar();
    this.emitirCores(true, [chave], 'sem-cor');
  }

  /** Volta às cores de `padrao-preenchimento` e `padrao-traco`; emite `ui-cores-change` confirmado. */
  restaurarPadrao() {
    this._preenchimento = this._padrao.preenchimento;
    this._traco = this._padrao.traco;
    this._misto = { preenchimento: false, traco: false };
    this.atualizar();
    this.emitirCores(true, ['preenchimento', 'traco'], 'padrao');
  }

  /** Abre o seletor de cor ancorado na amostra do alvo (que passa a ser o ativo). Com `focar`, leva o foco do teclado para o painel. */
  abrirSeletor(alvo: AlvoCor = this._alvo, focar = false) {
    if (this.hasAttribute('desabilitado')) return;
    this.mudarAlvo(alvo === 'traco' ? 'traco' : 'preenchimento');
    if (this.seletorAberto) return;
    const ancora = this.raiz.querySelector(`[data-alvo="${this._alvo}"]`) || this;
    this.estadoAoAbrir = this.obterCores();

    this.seletor = abrirSeletorCor({
      ancora,
      titulo: this.getAttribute('titulo-seletor') || 'Cores e estilo',
      modo: 'duplo',
      alvo: this._alvo,
      preenchimento: this._preenchimento,
      traco: this._traco,
      opacidade: this._opacidade,
      espessuraTraco: this._espessuraTraco,
      misto: this._misto[this._alvo],
      coresProjeto: this._coresProjeto,
      focar,
      aoAlterar: (d) => this.aplicarDoSeletor(d, false),
      aoConfirmar: (d) => {
        this.seletor = null;
        this.aplicarDoSeletor(d, true);
      },
      aoCancelar: () => {
        this.seletor = null;
        this.estadoAoAbrir = null;
      },
      aoTrocarAlvo: (novo) => this.mudarAlvo(novo)
    });
  }

  /**
   * Fecha o seletor aberto por este controle. Com `confirmar` (padrão), grava o que foi editado;
   * sem ele, cancela: as cores iniciais voltam (com um `ui-cores-change` não confirmado) e nada é confirmado.
   */
  fecharSeletor(confirmar = true) {
    const s = this.seletor;
    if (!s) return;
    if (confirmar) s.fechar(true);
    else (s.elemento as UISeletorCor).cancelar();
  }

  /* ---------- Interno ---------- */

  private mudarAlvo(alvo: AlvoCor) {
    if (alvo === this._alvo) return;
    this._alvo = alvo;
    this.atualizar();
    this.sincronizarSeletor();
    this.dispatchEvent(new CustomEvent('ui-alvo-change', { detail: { alvo }, bubbles: true, composed: true }));
  }

  /** Mantém a aba do seletor aberto igual ao alvo do controle. */
  private sincronizarSeletor() {
    (this.seletor?.elemento as UISeletorCor | undefined)?.trocarAlvo(this._alvo);
  }

  private aplicarDoSeletor(d: DetalheSeletorCor, confirmado: boolean) {
    const diferenca = (base: { preenchimento: ValorCor; traco: ValorCor; opacidade: number; espessuraTraco: number }) => {
      const lista: Alterado[] = [];
      if (d.preenchimento !== base.preenchimento) lista.push('preenchimento');
      if (d.traco !== base.traco) lista.push('traco');
      if (d.opacidade !== base.opacidade) lista.push('opacidade');
      if (d.espessuraTraco !== undefined && Math.abs(d.espessuraTraco - base.espessuraTraco) > 0.05) lista.push('espessuraTraco');
      return lista;
    };
    const desdeUltimo = diferenca(this.obterCores());
    this._preenchimento = d.preenchimento;
    this._traco = d.traco;
    this._opacidade = d.opacidade;
    if (d.espessuraTraco !== undefined) this._espessuraTraco = d.espessuraTraco;
    if (desdeUltimo.includes('preenchimento')) this._misto.preenchimento = false;
    if (desdeUltimo.includes('traco')) this._misto.traco = false;
    this.atualizar();

    if (!confirmado) {
      if (desdeUltimo.length) this.emitirCores(false, desdeUltimo, 'seletor');
      return;
    }
    // A confirmação sempre emite; `alterados` diz o que mudou desde que o seletor abriu
    this.emitirCores(true, this.estadoAoAbrir ? diferenca(this.estadoAoAbrir) : desdeUltimo, 'seletor');
    this.estadoAoAbrir = null;
  }

  private emitirCores(confirmado: boolean, alterados: Alterado[], origem: Origem) {
    const detail: DetalheControleCores = { ...this.obterCores(), confirmado, alterados, origem };
    this.dispatchEvent(new CustomEvent('ui-cores-change', { detail, bubbles: true, composed: true }));
  }

  private dica(texto: string, tecla?: string) {
    return tecla ? `${texto} [${tecla}]` : texto;
  }

  private renderizar() {
    this.raiz.innerHTML = `
      <style>${estilos}</style>
      <div class="pilha" part="pilha" role="group" aria-label="Cores de desenho">
        <div class="amostras" part="amostras">
          <button type="button" class="amostra amostra--traco" data-alvo="traco" part="amostra amostra-traco">
            <span class="face face--traco"></span>
          </button>
          <button type="button" class="amostra amostra--preenchimento" data-alvo="preenchimento" part="amostra amostra-preenchimento">
            <span class="face face--preenchimento"></span>
          </button>
        </div>
        <div class="acoes" part="acoes">
          <button type="button" class="acao acao--inverter" data-acao="inverter" part="acao acao-inverter" aria-label="Inverter preenchimento e traço">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>
            </svg>
          </button>
          <button type="button" class="acao acao--sem-cor" data-acao="sem-cor" part="acao acao-sem-cor" aria-label="Sem cor">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8" stroke="currentColor"/>
              <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" stroke="#ef4444"/>
            </svg>
          </button>
          <button type="button" class="acao acao--padrao" data-acao="padrao" part="acao acao-padrao" aria-label="Restaurar cores padrão">
            <span class="icone-padrao" aria-hidden="true">
              <span class="ponto ponto--preenchimento"></span>
              <span class="ponto ponto--traco"></span>
            </span>
          </button>
        </div>
      </div>
    `;
    this.renderizado = true;
  }

  private vincularEventos() {
    const r = this.raiz;
    r.querySelectorAll<HTMLElement>('[data-alvo]').forEach((amostra) => {
      const alvo = amostra.dataset.alvo as AlvoCor;
      this.listeners.add(amostra, 'click', (e: Event) => {
        e.stopPropagation();
        if (alvo !== this._alvo) this.mudarAlvo(alvo);
        else if (this.seletorAberto) this.fecharSeletor(true);
        else this.abrirSeletor(alvo);
      });
      this.listeners.add(amostra, 'dblclick', (e: Event) => {
        e.stopPropagation();
        this.abrirSeletor(alvo);
      });
      this.listeners.add<KeyboardEvent>(amostra, 'keydown', (e: KeyboardEvent) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        // Mesmo comportamento do clique no alvo ativo: abre, ou fecha se já estiver aberto
        if (alvo === this._alvo && this.seletorAberto) this.fecharSeletor(true);
        else this.abrirSeletor(alvo, true);
      });
      // Em alguns navegadores o Espaço só vira clique ao soltar a tecla; sem isto o clique fecharia o seletor recém-aberto
      this.listeners.add<KeyboardEvent>(amostra, 'keyup', (e: KeyboardEvent) => {
        if (e.key === ' ') e.preventDefault();
      });
    });

    const acao = (nome: string, fn: () => void) => {
      this.listeners.add(r.querySelector(`[data-acao="${nome}"]`), 'click', (e: Event) => {
        e.stopPropagation();
        fn();
      });
    };
    acao('inverter', () => this.inverter());
    acao('sem-cor', () => this.semCor());
    acao('padrao', () => this.restaurarPadrao());
  }

  private atualizar() {
    if (!this.renderizado) return;
    const r = this.raiz;
    const a = this._atalhos;
    const desabilitado = this.hasAttribute('desabilitado');
    const descrever = (cor: ValorCor, misto: boolean) => (misto ? 'Misto (?) [várias cores na seleção]' : cor === 'none' ? 'Sem cor' : cor);

    const pintar = (alvo: AlvoCor, cor: ValorCor, misto: boolean, rotulo: string, extra = '') => {
      const amostra = r.querySelector<HTMLButtonElement>(`[data-alvo="${alvo}"]`);
      const face = amostra?.querySelector<HTMLElement>('.face');
      if (!amostra || !face) return;
      const ativa = this._alvo === alvo;
      amostra.classList.toggle('amostra--ativa', ativa);
      amostra.setAttribute('aria-pressed', String(ativa));
      amostra.disabled = desabilitado;
      face.classList.toggle('face--misto', misto);
      face.classList.toggle('face--sem-cor', !misto && cor === 'none');
      const prop = alvo === 'traco' ? 'borderColor' : 'backgroundColor';
      face.style[prop] = misto || cor === 'none' ? '' : cor;
      if (alvo === 'traco' && cor !== 'none' && !misto) {
        face.style.borderWidth = `${Math.max(2, Math.min(4.5, this._espessuraTraco))}px`;
      }
      const descricao = `${rotulo}: ${descrever(cor, misto)}${extra}`;
      amostra.title = this.dica(`${descricao} — clique para ativar, clique de novo para editar`, a.alternar);
      amostra.setAttribute('aria-label', descricao);
    };

    const opacidade = this._preenchimento === 'none' || this._misto.preenchimento ? '' : `, opacidade ${Math.round(this._opacidade * 100)}%`;
    pintar('preenchimento', this._preenchimento, this._misto.preenchimento, 'Preenchimento', opacidade);
    const espessura = this._traco === 'none' || this._misto.traco ? '' : `, espessura ${this._espessuraTraco}px`;
    pintar('traco', this._traco, this._misto.traco, 'Traço / contorno', espessura);

    const titulo = (acao: string, texto: string) => {
      const b = r.querySelector<HTMLButtonElement>(`[data-acao="${acao}"]`);
      if (!b) return;
      b.title = texto;
      b.disabled = desabilitado;
    };
    titulo('inverter', this.dica('Inverter preenchimento e traço', a.inverter));
    titulo('sem-cor', this.dica('Sem cor no alvo ativo', a.semCor));
    titulo('padrao', this.dica('Restaurar cores padrão', a.padrao));

    const pontoP = r.querySelector<HTMLElement>('.ponto--preenchimento');
    if (pontoP) pontoP.style.backgroundColor = this._padrao.preenchimento === 'none' ? 'transparent' : this._padrao.preenchimento;
    const pontoT = r.querySelector<HTMLElement>('.ponto--traco');
    if (pontoT) pontoT.style.borderColor = this._padrao.traco === 'none' ? '#ef4444' : this._padrao.traco;
  }
}

definirCustomElement('ui-controle-cores', UIControleCores);
