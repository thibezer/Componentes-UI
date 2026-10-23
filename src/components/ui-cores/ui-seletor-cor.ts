import estilos from './ui-seletor-cor.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ListenerBag } from '../../core/listener-bag';
import { PALETA_CORES_PADRAO, coresUnicas, escaparHtml, normalizarCor, normalizarOpacidade, normalizarEspessura } from './cores-utils';
import type { AlvoCor, DetalheSeletorCor, OpcoesSeletorCor, SeletorCorAberto, ValorCor } from './tipos';

const OPACIDADES_RAPIDAS = [0.25, 0.35, 0.5, 0.75, 1];
const ESPESSURAS_RAPIDAS = [1, 2, 2.5, 4, 6, 8];

/** Configuração aceita por `UISeletorCor.configurar()` (as opções de `abrirSeletorCor` sem âncora e callbacks). */
export type ConfiguracaoSeletorCor = Omit<
  OpcoesSeletorCor,
  'ancora' | 'focar' | 'aoAlterar' | 'aoConfirmar' | 'aoCancelar' | 'aoTrocarAlvo'
>;

/**
 * <ui-seletor-cor> — painel de cor e estilo CAD: abas Preenchimento/Traço, prévia
 * antes × depois com espessura real, hexadecimal, seletor do sistema, espessura do traçado (px),
 * opacidade do preenchimento, cores do projeto, paleta padrão e "sem cor".
 *
 * Métodos: configurar(opcoes), trocarAlvo(alvo), definirCor(cor), definirOpacidade(v), definirEspessura(v),
 *          confirmar(), cancelar(), obterEstado()
 * Eventos: ui-cor-input (pré-visualização), ui-cor-confirmar, ui-cor-cancelar — detail: DetalheSeletorCor;
 *          ui-alvo-change { alvo }
 */
export class UISeletorCor extends SafeHTMLElement {
  private raiz: ShadowRoot;
  private listeners = new ListenerBag();

  private _titulo = 'Cores & Estilo CAD';
  private _duplo = true;
  private _alvo: AlvoCor = 'preenchimento';
  private _preenchimento: ValorCor = '#00e08a';
  private _traco: ValorCor = '#ffffff';
  private _opacidade = 0.35;
  private _mostrarOpacidade: boolean | undefined;
  private _espessura = 2.5;
  private _mostrarEspessura: boolean | undefined;
  private _misto = false;
  private _coresProjeto: string[] = [];
  private _paleta: string[] = [...PALETA_CORES_PADRAO];

  private inicial = {
    preenchimento: '#00e08a' as ValorCor,
    traco: '#ffffff' as ValorCor,
    opacidade: 0.35,
    espessuraTraco: 2.5
  };

  constructor() {
    super();
    this.raiz = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'dialog');
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
    this.renderizar();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
  }

  /* ---------- API pública ---------- */

  /** Define o estado inicial (também usado pelo "Cancelar" para restaurar). */
  configurar(opcoes: ConfiguracaoSeletorCor = {}) {
    this._titulo = opcoes.titulo || 'Cores & Estilo CAD';
    const temDuasCores = opcoes.preenchimento !== undefined && opcoes.traco !== undefined;
    this._duplo = opcoes.modo ? opcoes.modo === 'duplo' : temDuasCores;
    this._alvo = opcoes.alvo === 'traco' ? 'traco' : 'preenchimento';

    const corSimples = normalizarCor(opcoes.cor);
    this._preenchimento = normalizarCor(opcoes.preenchimento) ?? (this._alvo === 'preenchimento' ? corSimples : null) ?? '#00e08a';
    this._traco = normalizarCor(opcoes.traco) ?? (this._alvo === 'traco' ? corSimples : null) ?? '#ffffff';
    this._opacidade = normalizarOpacidade(opcoes.opacidade);
    this._mostrarOpacidade = opcoes.mostrarOpacidade;
    this._espessura = normalizarEspessura(opcoes.espessuraTraco, 2.5);
    this._mostrarEspessura = opcoes.mostrarEspessura;
    this._misto = opcoes.misto === true;
    this._coresProjeto = coresUnicas(opcoes.coresProjeto);
    this._paleta = opcoes.paleta ? coresUnicas(opcoes.paleta) : [...PALETA_CORES_PADRAO];

    this.inicial = {
      preenchimento: this._preenchimento,
      traco: this._traco,
      opacidade: this._opacidade,
      espessuraTraco: this._espessura
    };
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

  get espessura(): number {
    return this._espessura;
  }

  obterEstado(): DetalheSeletorCor {
    return {
      alvo: this._alvo,
      cor: this.cor,
      preenchimento: this._preenchimento,
      traco: this._traco,
      opacidade: this._opacidade,
      espessuraTraco: this._espessura
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

  /** Espessura do traço em pixels (0.5 a 50); emite `ui-cor-input`. */
  definirEspessura(valor: number) {
    this._espessura = normalizarEspessura(valor, this._espessura);
    this.atualizarVisual();
    this.emitir('ui-cor-input', this.obterEstado());
  }

  confirmar() {
    this.emitir('ui-cor-confirmar', this.obterEstado());
  }

  /** Restaura os valores iniciais (emitindo `ui-cor-input`) e emite `ui-cor-cancelar`. */
  cancelar() {
    this._preenchimento = this.inicial.preenchimento;
    this._traco = this.inicial.traco;
    this._opacidade = this.inicial.opacidade;
    this._espessura = this.inicial.espessuraTraco;
    this.atualizarVisual();
    this.emitir('ui-cor-input', this.obterEstado());
    this.emitir('ui-cor-cancelar', this.obterEstado());
  }

  /* ---------- Renderização ---------- */

  private get opacidadeVisivel(): boolean {
    return this._mostrarOpacidade ?? this._alvo === 'preenchimento';
  }

  private get espessuraVisivel(): boolean {
    return this._mostrarEspessura ?? this._alvo === 'traco';
  }

  private renderizar() {
    this.listeners.cleanup();
    this.setAttribute('aria-label', this._titulo);
    const amostras = (cores: string[]) => cores.map((c) => `
      <button type="button" class="amostra" data-cor="${c}" style="background-color: ${c};" title="${c.toUpperCase()}" aria-label="Cor ${c.toUpperCase()}" aria-pressed="false"></button>
    `).join('');

    this.raiz.innerHTML = `
      <style>${estilos}</style>
      <div class="cabecalho">
        <span class="titulo">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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

      <div class="previa" aria-label="Comparativo de cor antes e depois">
        <div class="previa-metade" title="Cor original">
          <div class="previa-cor previa-cor--original">
            <div class="previa-linha-traco previa-linha-traco--original"></div>
          </div>
          <span class="previa-badge">ORIGINAL</span>
        </div>
        <div class="previa-metade" title="Nova cor">
          <div class="previa-cor previa-cor--nova">
            <div class="previa-linha-traco previa-linha-traco--nova"></div>
          </div>
          <span class="previa-badge previa-rotulo-nova">NOVA</span>
        </div>
      </div>

      <div class="linha-hex">
        <label class="hex">
          <span class="hex-prefixo">#</span>
          <input type="text" class="hex-entrada" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Cor em hexadecimal" />
        </label>
        <label class="nativo" title="Abrir o seletor de cor do sistema">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
          </svg>
          <input type="color" class="nativo-entrada" aria-label="Seletor de cor do sistema" />
        </label>
      </div>

      <!-- Seção de Espessura do Traçado (CAD) -->
      <div class="espessura">
        <div class="espessura-cabecalho">
          <span class="espessura-titulo">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" stroke-width="3" />
              <line x1="3" y1="6" x2="21" y2="6" stroke-width="1.5" />
              <line x1="3" y1="18" x2="21" y2="18" stroke-width="4.5" />
            </svg>
            <span>Espessura do traçado</span>
          </span>
          <span class="espessura-valor"></span>
        </div>
        <input type="range" class="espessura-entrada" min="0.5" max="15" step="0.5" aria-label="Espessura do traçado em pixels" />
        <div class="espessura-atalhos">
          ${ESPESSURAS_RAPIDAS.map((e) => `<button type="button" data-espessura="${e}">${e}px</button>`).join('')}
        </div>
      </div>

      <!-- Seção de Opacidade do Preenchimento -->
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

      <button type="button" class="sem-cor" data-cor="none" aria-pressed="false" title="Sem cor (vazado / transparente)">
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
    const ehTraco = this._alvo === 'traco';

    this.raiz.querySelectorAll<HTMLElement>('[data-alvo]').forEach((aba) => {
      aba.setAttribute('aria-selected', String(aba.dataset.alvo === this._alvo));
    });

    const amostraPreench = q<HTMLElement>('.aba-amostra--preenchimento');
    if (amostraPreench) {
      amostraPreench.classList.toggle('aba-amostra--sem-cor', this._preenchimento === 'none');
      amostraPreench.style.backgroundColor = this._preenchimento === 'none' ? '' : this._preenchimento;
    }
    const amostraTraco = q<HTMLElement>('.aba-amostra--traco');
    if (amostraTraco) {
      amostraTraco.style.borderColor = this._traco === 'none' ? '#ef4444' : this._traco;
      amostraTraco.style.borderWidth = `${Math.max(1.5, Math.min(3.5, this._espessura))}px`;
    }

    // Visibilidade dos painéis de ajuste fino
    const opacidade = q<HTMLElement>('.opacidade');
    if (opacidade) opacidade.hidden = !this.opacidadeVisivel;

    const espessura = q<HTMLElement>('.espessura');
    if (espessura) espessura.hidden = !this.espessuraVisivel;

    // Pré-visualização antes x depois
    const originalCor = ehTraco ? this.inicial.traco : this.inicial.preenchimento;
    const originalSemCor = originalCor === 'none';

    const previaOriginal = q<HTMLElement>('.previa-cor--original');
    const previaNova = q<HTMLElement>('.previa-cor--nova');
    const linhaOriginal = q<HTMLElement>('.previa-linha-traco--original');
    const linhaNova = q<HTMLElement>('.previa-linha-traco--nova');

    if (ehTraco) {
      // Modo traço: mostra a linha com espessura real e cor centralizada
      if (previaOriginal) {
        previaOriginal.style.backgroundColor = 'transparent';
        previaOriginal.classList.remove('previa-cor--sem-cor');
      }
      if (previaNova) {
        previaNova.style.backgroundColor = 'transparent';
        previaNova.classList.remove('previa-cor--sem-cor');
      }

      if (linhaOriginal) {
        linhaOriginal.style.display = 'block';
        linhaOriginal.classList.toggle('previa-linha-traco--sem-cor', originalSemCor);
        linhaOriginal.style.setProperty('--traco-px', `${Math.max(1, this.inicial.espessuraTraco)}px`);
        linhaOriginal.style.setProperty('--traco-cor', originalSemCor ? '' : originalCor);
      }
      if (linhaNova) {
        linhaNova.style.display = 'block';
        linhaNova.classList.toggle('previa-linha-traco--sem-cor', semCor);
        linhaNova.style.setProperty('--traco-px', `${Math.max(1, this._espessura)}px`);
        linhaNova.style.setProperty('--traco-cor', semCor ? '' : cor);
      }
    } else {
      // Modo preenchimento: preenchimento da área com opacidade
      if (linhaOriginal) linhaOriginal.style.display = 'none';
      if (linhaNova) linhaNova.style.display = 'none';

      if (previaOriginal) {
        previaOriginal.classList.toggle('previa-cor--sem-cor', originalSemCor);
        previaOriginal.style.backgroundColor = originalSemCor ? '' : originalCor;
        previaOriginal.style.opacity = originalSemCor ? '' : String(this.inicial.opacidade);
      }
      if (previaNova) {
        previaNova.classList.toggle('previa-cor--sem-cor', semCor);
        previaNova.style.backgroundColor = semCor ? '' : cor;
        previaNova.style.opacity = semCor ? '' : String(this._opacidade);
      }
    }

    const rotuloNova = q<HTMLElement>('.previa-rotulo-nova');
    if (rotuloNova) rotuloNova.textContent = this._misto ? 'MISTO (?)' : 'NOVA';

    // Campo Hexadecimal
    const hex = q<HTMLInputElement>('.hex-entrada');
    if (hex && !this.campoEmFoco(hex)) {
      hex.value = semCor ? '' : cor.slice(1).toUpperCase();
      hex.placeholder = semCor ? 'NENHUM' : '00E08A';
    }
    const nativo = q<HTMLInputElement>('.nativo-entrada');
    if (nativo) nativo.value = semCor ? '#00e08a' : cor;

    // Valores e sliders
    if (this.espessuraVisivel) {
      const faixaEspessura = q<HTMLInputElement>('.espessura-entrada');
      const pctEsp = Math.round(((this._espessura - 0.5) / (15 - 0.5)) * 100);
      if (faixaEspessura) {
        faixaEspessura.value = String(this._espessura);
        faixaEspessura.style.setProperty('--pct-espessura', `${Math.max(0, Math.min(100, pctEsp))}%`);
        faixaEspessura.setAttribute('aria-valuetext', `${this._espessura}px`);
      }
      const valorEsp = q<HTMLElement>('.espessura-valor');
      if (valorEsp) valorEsp.textContent = `${this._espessura} px`;
      this.raiz.querySelectorAll<HTMLElement>('[data-espessura]').forEach((b) => {
        b.classList.toggle('ativo', Math.abs(Number(b.dataset.espessura) - this._espessura) < 0.1);
      });
    }

    if (this.opacidadeVisivel) {
      const pct = Math.round(this._opacidade * 100);
      const faixaOpacidade = q<HTMLInputElement>('.opacidade-entrada');
      if (faixaOpacidade) {
        faixaOpacidade.value = String(pct);
        faixaOpacidade.style.setProperty('--pct', `${pct}%`);
        faixaOpacidade.setAttribute('aria-valuetext', `${pct}%`);
      }
      const valorOpac = q<HTMLElement>('.opacidade-valor');
      if (valorOpac) valorOpac.textContent = `${pct}%`;
      this.raiz.querySelectorAll<HTMLElement>('[data-opacidade]').forEach((b) => {
        b.classList.toggle('ativo', Math.abs(Number(b.dataset.opacidade) - this._opacidade) < 0.02);
      });
    }

    // Amostras de cores
    this.raiz.querySelectorAll<HTMLElement>('.amostra').forEach((a) => {
      const ativa = a.dataset.cor === cor;
      a.classList.toggle('ativo', ativa);
      a.setAttribute('aria-pressed', String(ativa));
    });
    const botaoSemCor = q<HTMLElement>('.sem-cor');
    botaoSemCor?.classList.toggle('ativo', semCor);
    botaoSemCor?.setAttribute('aria-pressed', String(semCor));
  }

  /** `activeElement` lança em alguns DOMs simulados quando o foco está em outra árvore de sombra. */
  private campoEmFoco(campo: Element): boolean {
    try {
      return this.raiz.activeElement === campo;
    } catch {
      return false;
    }
  }

  private vincularEventos() {
    const r = this.raiz;

    r.querySelectorAll<HTMLElement>('[data-alvo]').forEach((aba) => {
      this.listeners.add(aba, 'click', () => this.trocarAlvo(aba.dataset.alvo as AlvoCor));
    });
    r.querySelectorAll<HTMLElement>('[data-cor]').forEach((el) => {
      this.listeners.add(el, 'click', () => this.definirCor(el.dataset.cor || ''));
    });

    // Eventos de espessura
    r.querySelectorAll<HTMLElement>('[data-espessura]').forEach((b) => {
      this.listeners.add(b, 'click', () => this.definirEspessura(Number(b.dataset.espessura)));
    });
    const faixaEsp = r.querySelector<HTMLInputElement>('.espessura-entrada');
    if (faixaEsp) {
      this.listeners.add(faixaEsp, 'input', () => this.definirEspessura(Number(faixaEsp.value)));
    }

    // Eventos de opacidade
    r.querySelectorAll<HTMLElement>('[data-opacidade]').forEach((b) => {
      this.listeners.add(b, 'click', () => this.definirOpacidade(Number(b.dataset.opacidade)));
    });
    const faixaOpac = r.querySelector<HTMLInputElement>('.opacidade-entrada');
    if (faixaOpac) {
      this.listeners.add(faixaOpac, 'input', () => this.definirOpacidade(Number(faixaOpac.value) / 100));
    }

    // Hexadecimal
    const hex = r.querySelector<HTMLInputElement>('.hex-entrada');
    const lerHex = (completo: boolean) => {
      const v = hex!.value.trim().replace(/^#/, '');
      if (/^[0-9a-f]{6}$/i.test(v) || (completo && /^[0-9a-f]{3}$/i.test(v))) this.definirCor(`#${v}`);
    };
    if (hex) {
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
    }

    const nativo = r.querySelector<HTMLInputElement>('.nativo-entrada');
    if (nativo) {
      this.listeners.add(nativo, 'input', () => this.definirCor(nativo.value));
    }

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
 * restaura as cores e espessura iniciais. `X` alterna Preenchimento/Traço enquanto ele está aberto.
 */
export function abrirSeletorCor(opcoes: OpcoesSeletorCor): SeletorCorAberto {
  seletorAtivo?.descartar();

  const el = document.createElement('ui-seletor-cor') as UISeletorCor;
  const { ancora, focar, aoAlterar, aoConfirmar, aoCancelar, aoTrocarAlvo, ...config } = opcoes;
  el.configurar(config);

  const bag = new ListenerBag();
  let aberto = true;

  const encerrar = () => {
    if (!aberto) return false;
    aberto = false;
    bag.cleanup();
    const tinhaFoco = document.activeElement === el;
    el.remove();
    if (tinhaFoco && ancora instanceof HTMLElement && ancora.isConnected) ancora.focus({ preventScroll: true });
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
  bag.add<CustomEvent<{ alvo: AlvoCor }>>(el, 'ui-alvo-change', (e: CustomEvent<{ alvo: AlvoCor }>) => {
    e.stopPropagation();
    aoTrocarAlvo?.(e.detail.alvo);
  });

  bag.add(el, 'pointerdown', (e: Event) => e.stopPropagation());
  bag.add(el, 'click', (e: Event) => e.stopPropagation());

  document.body.appendChild(el);
  posicionar(el, ancora);
  seletorAtivo = controle;
  if (focar) el.focus({ preventScroll: true });

  bag.add(window, 'resize', () => posicionar(el, ancora));

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
  const largura = el.offsetWidth;
  const altura = el.offsetHeight;
  let left = a.right + margem;
  if (left + largura > window.innerWidth - margem) left = Math.max(margem, a.left - largura - margem);
  let top = a.top;
  if (top + altura > window.innerHeight - margem) top = Math.max(margem, window.innerHeight - altura - margem);
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}
