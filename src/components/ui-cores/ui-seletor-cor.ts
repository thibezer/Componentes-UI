import estilos from './ui-seletor-cor.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ListenerBag } from '../../core/listener-bag';
import { PALETA_CORES_PADRAO, coresUnicas, escaparHtml, normalizarCor, normalizarOpacidade } from './cores-utils';
import type { AlvoCor, DetalheSeletorCor, OpcoesSeletorCor, SeletorCorAberto, ValorCor } from './tipos';

const OPACIDADES_RAPIDAS = [0.25, 0.35, 0.5, 0.75, 1];

/** Configuração aceita por `UISeletorCor.configurar()` (as opções de `abrirSeletorCor` sem âncora e callbacks). */
export type ConfiguracaoSeletorCor = Omit<
  OpcoesSeletorCor,
  'ancora' | 'aoAlterar' | 'aoConfirmar' | 'aoCancelar' | 'aoTrocarAlvo'
>;

/**
 * <ui-seletor-cor> — painel de cor no estilo Illustrator: abas Preenchimento/Traço, prévia
 * antes × depois, hexadecimal, seletor do sistema, opacidade do preenchimento, cores do projeto,
 * paleta padrão e "sem cor".
 *
 * Normalmente aberto por `abrirSeletorCor()`, que posiciona o painel junto a uma âncora e cuida
 * de fechar com Esc ou clique fora. Pode também ser usado direto no DOM.
 *
 * Métodos: configurar(opcoes), trocarAlvo(alvo), definirCor(cor), definirOpacidade(v),
 *          confirmar(), cancelar(), obterEstado()
 * Eventos: ui-cor-input (pré-visualização), ui-cor-confirmar, ui-cor-cancelar — detail: DetalheSeletorCor;
 *          ui-alvo-change { alvo }
 */
export class UISeletorCor extends SafeHTMLElement {
  private raiz: ShadowRoot;
  private listeners = new ListenerBag();

  private _titulo = 'Seletor de cor';
  private _duplo = true;
  private _alvo: AlvoCor = 'preenchimento';
  private _preenchimento: ValorCor = '#00e08a';
  private _traco: ValorCor = '#ffffff';
  private _opacidade = 0.35;
  private _mostrarOpacidade: boolean | undefined;
  private _misto = false;
  private _coresProjeto: string[] = [];
  private _paleta: string[] = [...PALETA_CORES_PADRAO];

  private inicial = { preenchimento: '#00e08a' as ValorCor, traco: '#ffffff' as ValorCor, opacidade: 0.35 };

  constructor() {
    super();
    this.raiz = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'dialog');
    this.renderizar();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
  }

  /* ---------- API pública ---------- */

  /** Define o estado inicial (também usado pelo "Cancelar" para restaurar). */
  configurar(opcoes: ConfiguracaoSeletorCor = {}) {
    this._titulo = opcoes.titulo || 'Seletor de cor';
    const temDuasCores = opcoes.preenchimento !== undefined && opcoes.traco !== undefined;
    this._duplo = opcoes.modo ? opcoes.modo === 'duplo' : temDuasCores;
    this._alvo = opcoes.alvo === 'traco' ? 'traco' : 'preenchimento';

    const corSimples = normalizarCor(opcoes.cor);
    this._preenchimento = normalizarCor(opcoes.preenchimento) ?? (this._alvo === 'preenchimento' ? corSimples : null) ?? '#00e08a';
    this._traco = normalizarCor(opcoes.traco) ?? (this._alvo === 'traco' ? corSimples : null) ?? '#ffffff';
    this._opacidade = normalizarOpacidade(opcoes.opacidade);
    this._mostrarOpacidade = opcoes.mostrarOpacidade;
    this._misto = opcoes.misto === true;
    this._coresProjeto = coresUnicas(opcoes.coresProjeto);
    this._paleta = opcoes.paleta ? coresUnicas(opcoes.paleta) : [...PALETA_CORES_PADRAO];

    this.inicial = { preenchimento: this._preenchimento, traco: this._traco, opacidade: this._opacidade };
    if (this.isConnected) this.renderizar();
  }

  get alvo(): AlvoCor {
    return this._alvo;
  }

  /** Cor do alvo em edição. */
  get cor(): ValorCor {
    return this._alvo === 'traco' ? this._traco : this._preenchimento;
  }

  get opacidade(): number {
    return this._opacidade;
  }

  obterEstado(): DetalheSeletorCor {
    return {
      alvo: this._alvo,
      cor: this.cor,
      preenchimento: this._preenchimento,
      traco: this._traco,
      opacidade: this._opacidade
    };
  }

  /** Alterna entre Preenchimento e Traço (só no modo duplo). */
  trocarAlvo(alvo: AlvoCor) {
    const novo: AlvoCor = alvo === 'traco' ? 'traco' : 'preenchimento';
    if (!this._duplo || novo === this._alvo) return;
    this._alvo = novo;
    this.atualizarVisual();
    this.emitir('ui-alvo-change', { alvo: novo });
  }

  /** Aplica uma cor ao alvo em edição e emite `ui-cor-input`. Cores inválidas são ignoradas. */
  definirCor(cor: ValorCor) {
    const n = normalizarCor(cor);
    if (!n) return;
    if (this._alvo === 'traco') this._traco = n;
    else this._preenchimento = n;
    this._misto = false;
    this.atualizarVisual();
    this.emitir('ui-cor-input', this.obterEstado());
  }

  /** Opacidade do preenchimento (0 a 1); emite `ui-cor-input`. */
  definirOpacidade(valor: number) {
    this._opacidade = normalizarOpacidade(valor, this._opacidade);
    this.atualizarVisual();
    this.emitir('ui-cor-input', this.obterEstado());
  }

  confirmar() {
    this.emitir('ui-cor-confirmar', this.obterEstado());
  }

  /** Restaura as cores iniciais (emitindo `ui-cor-input`) e emite `ui-cor-cancelar`. */
  cancelar() {
    this._preenchimento = this.inicial.preenchimento;
    this._traco = this.inicial.traco;
    this._opacidade = this.inicial.opacidade;
    this.atualizarVisual();
    this.emitir('ui-cor-input', this.obterEstado());
    this.emitir('ui-cor-cancelar', this.obterEstado());
  }

  /* ---------- Renderização ---------- */

  private get opacidadeVisivel(): boolean {
    return this._mostrarOpacidade ?? this._alvo === 'preenchimento';
  }

  private renderizar() {
    this.listeners.cleanup();
    const amostras = (cores: string[]) => cores.map((c) => `
      <button type="button" class="amostra" data-cor="${c}" style="background-color: ${c};" title="${c.toUpperCase()}" aria-label="Cor ${c.toUpperCase()}"></button>
    `).join('');

    this.raiz.innerHTML = `
      <style>${estilos}</style>
      <div class="cabecalho">
        <span class="titulo">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
          <span>${escaparHtml(this._titulo)}</span>
        </span>
        <button type="button" class="fechar" data-acao="fechar" title="Fechar (Esc)" aria-label="Fechar">✕</button>
      </div>

      ${this._duplo ? `
        <div class="abas" role="tablist" aria-label="Alvo da cor">
          <button type="button" class="aba" role="tab" data-alvo="preenchimento" title="Preenchimento">
            <span class="aba-amostra aba-amostra--preenchimento"></span>
            Preenchimento
          </button>
          <button type="button" class="aba" role="tab" data-alvo="traco" title="Traço / contorno">
            <span class="aba-amostra aba-amostra--traco"></span>
            Traço
          </button>
        </div>
      ` : ''}

      <div class="previa">
        <div class="previa-metade" title="Cor original">
          <div class="previa-cor previa-cor--original"></div>
          <span>ORIGINAL</span>
        </div>
        <div class="previa-metade" title="Nova cor">
          <div class="previa-cor previa-cor--nova"></div>
          <span class="previa-rotulo-nova">NOVA</span>
        </div>
      </div>

      <div class="linha-hex">
        <label class="hex">
          <span class="hex-prefixo">#</span>
          <input type="text" class="hex-entrada" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Cor em hexadecimal" />
        </label>
        <label class="nativo" title="Abrir o seletor de cor do sistema">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
          </svg>
          <input type="color" class="nativo-entrada" aria-label="Seletor de cor do sistema" />
        </label>
      </div>

      <div class="opacidade">
        <div class="opacidade-cabecalho">
          <span>Opacidade do preenchimento</span>
          <span class="opacidade-valor"></span>
        </div>
        <input type="range" class="opacidade-entrada" min="0" max="100" step="1" aria-label="Opacidade do preenchimento" />
        <div class="opacidade-atalhos">
          ${OPACIDADES_RAPIDAS.map((a) => `<button type="button" data-opacidade="${a}">${Math.round(a * 100)}%</button>`).join('')}
        </div>
      </div>

      ${this._coresProjeto.length ? `
        <div class="rotulo-secao">Cores do projeto</div>
        <div class="amostras">${amostras(this._coresProjeto)}</div>
      ` : ''}

      ${this._paleta.length ? `
        <div class="rotulo-secao">Paleta padrão</div>
        <div class="amostras">${amostras(this._paleta)}</div>
      ` : ''}

      <button type="button" class="sem-cor" data-cor="none" title="Sem cor (vazado / transparente)">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
          <line x1="5.5" y1="5.5" x2="18.5" y2="18.5"/>
        </svg>
        Sem cor (vazado / transparente)
      </button>

      <div class="rodape">
        <button type="button" class="botao-cancelar" data-acao="cancelar">Cancelar</button>
        <button type="button" class="botao-concluir" data-acao="concluir">Concluir</button>
      </div>
    `;

    this.vincularEventos();
    this.atualizarVisual();
  }

  private atualizarVisual() {
    const q = <T extends Element>(sel: string) => this.raiz.querySelector<T>(sel);
    const cor = this.cor;
    const semCor = cor === 'none';

    this.raiz.querySelectorAll<HTMLElement>('[data-alvo]').forEach((aba) => {
      aba.setAttribute('aria-selected', String(aba.dataset.alvo === this._alvo));
    });
    const amostraPreench = q<HTMLElement>('.aba-amostra--preenchimento');
    if (amostraPreench) amostraPreench.style.backgroundColor = this._preenchimento === 'none' ? 'transparent' : this._preenchimento;
    const amostraTraco = q<HTMLElement>('.aba-amostra--traco');
    if (amostraTraco) amostraTraco.style.borderColor = this._traco === 'none' ? '#ef4444' : this._traco;

    const opacidade = q<HTMLElement>('.opacidade');
    if (opacidade) opacidade.hidden = !this.opacidadeVisivel;

    const alfa = (alvoPreench: boolean, valor: number) => String(alvoPreench ? valor : 1);
    const pintar = (el: HTMLElement | null, valor: ValorCor, opac: string) => {
      if (!el) return;
      el.classList.toggle('previa-cor--sem-cor', valor === 'none');
      el.style.backgroundColor = valor === 'none' ? '' : valor;
      el.style.opacity = valor === 'none' ? '' : opac;
    };
    const ehPreench = this._alvo === 'preenchimento';
    const original = ehPreench ? this.inicial.preenchimento : this.inicial.traco;
    pintar(q('.previa-cor--original'), original, alfa(ehPreench, this.inicial.opacidade));
    pintar(q('.previa-cor--nova'), cor, alfa(ehPreench, this._opacidade));
    const rotuloNova = q<HTMLElement>('.previa-rotulo-nova');
    if (rotuloNova) rotuloNova.textContent = this._misto ? 'MISTO (?)' : 'NOVA';

    const hex = q<HTMLInputElement>('.hex-entrada');
    if (hex && this.raiz.activeElement !== hex) {
      hex.value = semCor ? '' : cor.slice(1).toUpperCase();
      hex.placeholder = semCor ? 'NENHUM' : '00E08A';
    }
    const nativo = q<HTMLInputElement>('.nativo-entrada');
    if (nativo) nativo.value = semCor ? '#00e08a' : cor;

    const pct = Math.round(this._opacidade * 100);
    const faixa = q<HTMLInputElement>('.opacidade-entrada');
    if (faixa) faixa.value = String(pct);
    const valor = q<HTMLElement>('.opacidade-valor');
    if (valor) valor.textContent = `${pct}%`;
    this.raiz.querySelectorAll<HTMLElement>('[data-opacidade]').forEach((b) => {
      b.classList.toggle('ativo', Math.abs(Number(b.dataset.opacidade) - this._opacidade) < 0.02);
    });

    this.raiz.querySelectorAll<HTMLElement>('.amostra').forEach((a) => {
      a.classList.toggle('ativo', a.dataset.cor === cor);
    });
    q<HTMLElement>('.sem-cor')?.classList.toggle('ativo', semCor);
  }

  private vincularEventos() {
    const r = this.raiz;

    r.querySelectorAll<HTMLElement>('[data-alvo]').forEach((aba) => {
      this.listeners.add(aba, 'click', () => this.trocarAlvo(aba.dataset.alvo as AlvoCor));
    });
    r.querySelectorAll<HTMLElement>('[data-cor]').forEach((el) => {
      this.listeners.add(el, 'click', () => this.definirCor(el.dataset.cor || ''));
    });
    r.querySelectorAll<HTMLElement>('[data-opacidade]').forEach((b) => {
      this.listeners.add(b, 'click', () => this.definirOpacidade(Number(b.dataset.opacidade)));
    });

    const faixa = r.querySelector<HTMLInputElement>('.opacidade-entrada');
    this.listeners.add(faixa, 'input', () => this.definirOpacidade(Number(faixa!.value) / 100));

    const hex = r.querySelector<HTMLInputElement>('.hex-entrada');
    const lerHex = (completo: boolean) => {
      const v = hex!.value.trim().replace(/^#/, '');
      if (/^[0-9a-f]{6}$/i.test(v) || (completo && /^[0-9a-f]{3}$/i.test(v))) this.definirCor(`#${v}`);
    };
    this.listeners.add(hex, 'input', () => lerHex(false));
    this.listeners.add(hex, 'change', () => {
      lerHex(true);
      this.atualizarVisual();
    });
    this.listeners.add<KeyboardEvent>(hex, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        lerHex(true);
        this.confirmar();
      }
    });

    const nativo = r.querySelector<HTMLInputElement>('.nativo-entrada');
    this.listeners.add(nativo, 'input', () => this.definirCor(nativo!.value));

    this.listeners.add(r.querySelector('[data-acao="fechar"]'), 'click', () => this.confirmar());
    this.listeners.add(r.querySelector('[data-acao="concluir"]'), 'click', () => this.confirmar());
    this.listeners.add(r.querySelector('[data-acao="cancelar"]'), 'click', () => this.cancelar());
  }

  private emitir(tipo: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(tipo, { detail, bubbles: true, composed: true }));
  }
}

definirCustomElement('ui-seletor-cor', UISeletorCor);

/* ---------- Abertura como popover ---------- */

let seletorAtivo: (SeletorCorAberto & { descartar(): void }) | null = null;

/**
 * Abre um `<ui-seletor-cor>` flutuante ao lado de `ancora` (à direita; à esquerda se não couber).
 * Só um seletor fica aberto por vez: abrir outro descarta o anterior sem confirmar.
 * Fecha confirmando com Concluir, ✕, Enter no hexadecimal, Esc ou clique fora; "Cancelar"
 * restaura as cores iniciais. `X` alterna Preenchimento/Traço enquanto ele está aberto.
 */
export function abrirSeletorCor(opcoes: OpcoesSeletorCor): SeletorCorAberto {
  seletorAtivo?.descartar();

  const el = document.createElement('ui-seletor-cor') as UISeletorCor;
  const { ancora, aoAlterar, aoConfirmar, aoCancelar, aoTrocarAlvo, ...config } = opcoes;
  el.configurar(config);

  const bag = new ListenerBag();
  let aberto = true;

  const encerrar = () => {
    if (!aberto) return false;
    aberto = false;
    bag.cleanup();
    el.remove();
    if (seletorAtivo === controle) seletorAtivo = null;
    return true;
  };

  const controle = {
    elemento: el as HTMLElement,
    get aberto() { return aberto; },
    fechar(confirmar = true) {
      if (confirmar) el.confirmar();
      else encerrar();
    },
    descartar() { encerrar(); }
  };

  bag.add<CustomEvent<DetalheSeletorCor>>(el, 'ui-cor-input', (e: CustomEvent<DetalheSeletorCor>) => aoAlterar?.(e.detail));
  bag.add<CustomEvent<DetalheSeletorCor>>(el, 'ui-cor-confirmar', (e: CustomEvent<DetalheSeletorCor>) => {
    if (encerrar()) aoConfirmar?.(e.detail);
  });
  bag.add<CustomEvent<DetalheSeletorCor>>(el, 'ui-cor-cancelar', (e: CustomEvent<DetalheSeletorCor>) => {
    if (encerrar()) aoCancelar?.(e.detail);
  });
  bag.add<CustomEvent<{ alvo: AlvoCor }>>(el, 'ui-alvo-change', (e: CustomEvent<{ alvo: AlvoCor }>) => aoTrocarAlvo?.(e.detail.alvo));

  // Cliques dentro do painel não vazam para o mapa/documento
  bag.add(el, 'pointerdown', (e: Event) => e.stopPropagation());
  bag.add(el, 'click', (e: Event) => e.stopPropagation());

  document.body.appendChild(el);
  posicionar(el, ancora);
  seletorAtivo = controle;

  // Registrado depois do clique que abriu o seletor, para ele não se fechar na mesma interação
  bag.add<PointerEvent>(window, 'pointerdown', (e: PointerEvent) => {
    const caminho = e.composedPath();
    if (!caminho.includes(el) && !caminho.includes(ancora)) controle.fechar(true);
  }, true);
  bag.add<KeyboardEvent>(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      controle.fechar(true);
      return;
    }
    const naEntradaTexto = (e.composedPath()[0] as HTMLElement | undefined)?.matches?.('input[type="text"]');
    if ((e.key === 'x' || e.key === 'X') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !naEntradaTexto) {
      e.preventDefault();
      e.stopPropagation();
      el.trocarAlvo(el.alvo === 'preenchimento' ? 'traco' : 'preenchimento');
    }
  }, true);

  return controle;
}

/** Fecha o seletor aberto por `abrirSeletorCor()`, se houver. */
export function fecharSeletorCor(confirmar = true) {
  seletorAtivo?.fechar(confirmar);
}

function posicionar(el: HTMLElement, ancora: Element) {
  const margem = 10;
  const a = ancora.getBoundingClientRect();
  // Tamanho de layout: getBoundingClientRect() pegaria a escala da animação de entrada
  const largura = el.offsetWidth;
  const altura = el.offsetHeight;
  let left = a.right + margem;
  if (left + largura > window.innerWidth - margem) left = Math.max(margem, a.left - largura - margem);
  let top = a.top;
  if (top + altura > window.innerHeight - margem) top = Math.max(margem, window.innerHeight - altura - margem);
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}
