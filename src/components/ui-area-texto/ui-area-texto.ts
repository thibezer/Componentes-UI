import { criarTemplateAreaTexto, ATRIBUTOS_OBSERVADOS_AREA_TEXTO } from './area-texto-template';
import { calcularContador } from './area-texto-contador';
import { ajustarAlturaAutomatica, limparAlturaAutomatica } from './area-texto-altura';
import type {
  DetalheEnviarAreaTexto,
  DetalheValorAreaTexto,
  NivelContador,
  RedimensionamentoAreaTexto
} from './tipos';
import { sincronizarFeedbackErro } from '../ui-campo-texto/campo-texto-estados';
import { ListenerBag } from '../../core/listener-bag';
import { definirCustomElement } from '../../core/ssr-safe';
import { gerarIdUnico, obterRotuloExterno, cliqueVeioDeRotuloExterno } from '../../core/acessibilidade';
import { FormAssociatedElement } from '../../core/form-associated-element';
import { validarRestricoesCampoTexto, aplicarValidadeInternals } from '../../core/form-validacao';
import { renderizarRotulo } from '../../core/rotulo';
import { escolherInteiro, escolherOpcao, inteiroOuNulo } from '../../core/opcoes';

const REDIMENSIONAMENTOS: readonly RedimensionamentoAreaTexto[] = ['nenhum', 'vertical', 'horizontal', 'ambos'];
const RESIZE_CSS: Record<RedimensionamentoAreaTexto, string> = {
  nenhum: 'none',
  vertical: 'vertical',
  horizontal: 'horizontal',
  ambos: 'both'
};
const NIVEIS_CONTADOR: readonly NivelContador[] = ['normal', 'aviso', 'excedido'];

const LINHAS_PADRAO = 4;
const LINHAS_MAXIMO = 50;
const LINHAS_MAX_AUTO = 200;

/**
 * Área de texto de várias linhas (descrições, observações, laudos) com rótulo, ajuda/erro, contador de
 * caracteres e altura automática. Participa de `<form>` (FACE).
 *
 * @element ui-area-texto
 *
 * @attr {string} label - Rótulo visível (sempre texto puro).
 * @attr {string} placeholder - Texto de apoio quando vazio.
 * @attr {string} value - Valor inicial (também restaurado por `form.reset()`).
 * @attr {boolean} obrigatorio - Campo obrigatório (alias `required`).
 * @attr {number} minlength - Mínimo de caracteres.
 * @attr {number} maxlength - Máximo de caracteres; também é o limite do contador.
 * @attr {string} helper-text - Texto de ajuda abaixo do campo.
 * @attr {boolean} erro - Marca o campo como inválido.
 * @attr {string} mensagem-erro - Mensagem exibida junto com `erro`.
 * @attr {string} mensagem-validacao - Substitui as mensagens de validação nativas.
 * @attr {boolean} disabled - Desabilita o campo.
 * @attr {boolean} readonly - Somente leitura (continua focável e selecionável).
 * @attr {number} linhas - Linhas visíveis (1–50, padrão 4).
 * @attr {boolean} auto-altura - O campo cresce com o conteúdo.
 * @attr {number} linhas-max - Com `auto-altura`, limite de linhas antes de rolar.
 * @attr {string} redimensionar - `nenhum` | `vertical` (padrão) | `horizontal` | `ambos`.
 * @attr {boolean} contador - Exibe o contador de caracteres.
 *
 * @fires ui-input - A cada edição. `detail: { value }`.
 * @fires ui-change - Ao confirmar a edição (blur). `detail: { value }`.
 * @fires ui-enviar - Ctrl/Cmd + Enter. `detail: { value }`. Enter comum insere quebra de linha.
 * @fires input - Evento nativo, reemitido no host.
 * @fires change - Evento nativo, reemitido no host.
 *
 * @csspart rotulo - Rótulo.
 * @csspart campo - Invólucro com borda.
 * @csspart input - O `<textarea>` interno.
 * @csspart rodape - Linha de ajuda e contador.
 * @csspart ajuda - Texto de ajuda ou erro.
 * @csspart contador - Contador de caracteres.
 */
export class UIAreaTexto extends FormAssociatedElement {
  static get observedAttributes() {
    return ATRIBUTOS_OBSERVADOS_AREA_TEXTO;
  }

  private labelElement: HTMLLabelElement;
  private wrapperElement: HTMLDivElement;
  private textareaElement: HTMLTextAreaElement;
  private helperElement: HTMLDivElement;
  private contadorElement: HTMLSpanElement;
  private anuncioElement: HTMLSpanElement;

  private listeners = new ListenerBag();
  private _focado = false;
  private _textareaId: string;
  private _defaultValue = '';
  private _nivelAnunciado: NivelContador = 'normal';

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    shadow.innerHTML = criarTemplateAreaTexto();

    this.labelElement = shadow.querySelector('.ui-area-texto__label')!;
    this.wrapperElement = shadow.querySelector('.ui-area-texto__wrapper')!;
    this.textareaElement = shadow.querySelector('.ui-area-texto__input')!;
    this.helperElement = shadow.querySelector('.ui-area-texto__helper')!;
    this.contadorElement = shadow.querySelector('.ui-area-texto__contador')!;
    this.anuncioElement = shadow.querySelector('.ui-area-texto__anuncio')!;

    // Associação rótulo ↔ textarea gerada internamente: o consumidor não gerencia IDs
    this._textareaId = gerarIdUnico('ui-area');
    this.textareaElement.id = this._textareaId;
    this.labelElement.htmlFor = this._textareaId;
    this.helperElement.id = `${this._textareaId}-ajuda`;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.textareaElement, 'input', this.handleInput);
    this.listeners.add(this.textareaElement, 'change', this.handleChange);
    this.listeners.add(this.textareaElement, 'focus', this.handleFocus);
    this.listeners.add(this.textareaElement, 'blur', this.handleBlur);
    this.listeners.add(this.textareaElement, 'keydown', this.handleKeyDown);
    this.listeners.add(this, 'click', this.handleHostClick);
    this.listeners.add(typeof window !== 'undefined' ? window : null, 'resize', this.handleResize);

    this._defaultValue = this.getAttribute('value') ?? '';
    if (this.hasAttribute('value') && !this.textareaElement.value) {
      this.textareaElement.value = this._defaultValue;
    }
    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'value' && value !== this.textareaElement.value && !this._focado) {
      this.textareaElement.value = value ?? '';
    }
    this.syncState();
  }

  // === API pública ===
  public override focus(options?: FocusOptions) {
    this.textareaElement.focus(options);
  }

  public override blur() {
    this.textareaElement.blur();
  }

  /** Seleciona todo o texto. */
  public select(): void {
    this.textareaElement.select();
  }

  /** Define a seleção; índices inválidos são ignorados pelo navegador, nunca lançam. */
  public setSelectionRange(inicio: number, fim: number, direcao?: 'forward' | 'backward' | 'none'): void {
    try {
      this.textareaElement.setSelectionRange(inicio, fim, direcao);
    } catch {
      // Seleção indisponível (elemento desconectado ou implementação parcial)
    }
  }

  /** Apaga o texto programaticamente (sem disparar eventos de edição). */
  public limpar(): void {
    this.value = '';
  }

  get value(): string {
    return this.textareaElement ? this.textareaElement.value : (this.getAttribute('value') ?? '');
  }

  set value(val: string) {
    const texto = val === null || val === undefined ? '' : String(val);
    this.setAttribute('value', texto);
    try {
      this.textareaElement.value = texto;
    } catch {
      // Ignora valores que o navegador não aceite
    }
    this.syncState();
  }

  get name(): string {
    return this.getAttribute('name') || '';
  }

  set name(val: string) {
    this.setAttribute('name', val);
  }

  get type(): string {
    return 'textarea';
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  set disabled(val: boolean) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }

  set readOnly(val: boolean) {
    if (val) this.setAttribute('readonly', '');
    else this.removeAttribute('readonly');
  }

  get minLength(): number {
    return inteiroOuNulo(this.getAttribute('minlength') ?? this.getAttribute('min-length')) ?? -1;
  }

  set minLength(val: number) {
    if (val >= 0) this.setAttribute('minlength', String(val));
    else this.removeAttribute('minlength');
  }

  get maxLength(): number {
    return inteiroOuNulo(this.getAttribute('maxlength') ?? this.getAttribute('max-length')) ?? -1;
  }

  set maxLength(val: number) {
    if (val >= 0) this.setAttribute('maxlength', String(val));
    else this.removeAttribute('maxlength');
  }

  // === Ciclo de Vida Form-Associated Custom Elements (W3C FACE) ===
  public formResetCallback(): void {
    this.textareaElement.value = this._defaultValue;
    this.syncState();
  }

  public formStateRestoreCallback(state: unknown, _mode: 'restore' | 'autocomplete'): void {
    if (typeof state === 'string') this.value = state;
  }

  public atualizarValidade(): void {
    const valor = this.textareaElement ? this.textareaElement.value : '';
    const resultado = validarRestricoesCampoTexto({
      val: valor,
      rawVal: valor,
      disabled: this.disabled,
      required: this.required,
      tipo: 'text',
      minlength: inteiroOuNulo(this.getAttribute('minlength') ?? this.getAttribute('min-length')),
      maxlength: inteiroOuNulo(this.getAttribute('maxlength') ?? this.getAttribute('max-length')),
      customError: this._customErrorMessage,
      mensagemValidacao: this.getAttribute('mensagem-validacao')
    });
    aplicarValidadeInternals(this.internals, resultado, this.textareaElement);
  }

  protected syncState() {
    const ta = this.textareaElement;
    const autoAltura = this.hasAttribute('auto-altura');

    ta.setAttribute('rows', String(escolherInteiro(this.getAttribute('linhas'), 1, LINHAS_MAXIMO, LINHAS_PADRAO)));
    ta.placeholder = this.getAttribute('placeholder') ?? '';

    this.sincronizarRotulo();
    this.sincronizarLimites();
    this.sincronizarEstadoInterativo();
    this.sincronizarFeedback();
    this.sincronizarContador();
    this.sincronizarAltura(autoAltura);

    this.internals?.setFormValue?.(ta.value);
    this.atualizarValidade();
  }

  private sincronizarRotulo() {
    const texto = this.getAttribute('label');
    if (texto) {
      renderizarRotulo(this.labelElement, texto, this.required, 'ui-area-texto__asterisco');
      this.labelElement.style.display = 'flex';
      this.textareaElement.removeAttribute('aria-label');
      return;
    }
    this.labelElement.style.display = 'none';

    // Sem `label`, o nome acessível vem de fora do Shadow DOM (aria-label, <label for> ou <label> envolvente)
    const externo = obterRotuloExterno(this, this.internals);
    if (externo) this.textareaElement.setAttribute('aria-label', externo);
    else this.textareaElement.removeAttribute('aria-label');
  }

  private sincronizarLimites() {
    const ta = this.textareaElement;
    const min = inteiroOuNulo(this.getAttribute('minlength') ?? this.getAttribute('min-length'));
    const max = inteiroOuNulo(this.getAttribute('maxlength') ?? this.getAttribute('max-length'));
    if (min !== null) ta.minLength = min;
    else ta.removeAttribute('minlength');
    if (max !== null) ta.maxLength = max;
    else ta.removeAttribute('maxlength');
  }

  private sincronizarEstadoInterativo() {
    const ta = this.textareaElement;
    const desabilitado = this.disabled;
    ta.disabled = desabilitado;
    ta.readOnly = this.readOnly;
    this.wrapperElement.classList.toggle('ui-area-texto__wrapper--disabled', desabilitado);

    if (this.required) ta.setAttribute('aria-required', 'true');
    else ta.removeAttribute('aria-required');
  }

  private sincronizarFeedback() {
    const temErro = this.hasAttribute('erro') || this.hasAttribute('mensagem-erro');
    sincronizarFeedbackErro(
      this.wrapperElement,
      this.textareaElement,
      this.helperElement,
      temErro,
      this.getAttribute('mensagem-erro'),
      this.getAttribute('helper-text'),
      'ui-area-texto'
    );
    // Só referencia a ajuda quando ela está visível
    if (this.helperElement.style.display === 'none') this.textareaElement.removeAttribute('aria-describedby');
    else this.textareaElement.setAttribute('aria-describedby', this.helperElement.id);
  }

  private sincronizarContador() {
    if (!this.hasAttribute('contador')) {
      this.contadorElement.hidden = true;
      this.anuncioElement.textContent = '';
      this._nivelAnunciado = 'normal';
      return;
    }

    const limite = inteiroOuNulo(this.getAttribute('maxlength') ?? this.getAttribute('max-length'), 1);
    const estado = calcularContador(this.textareaElement.value.length, limite);
    this.contadorElement.hidden = false;
    this.contadorElement.textContent = estado.texto;
    for (const nivel of NIVEIS_CONTADOR) {
      this.contadorElement.classList.toggle(`ui-area-texto__contador--${nivel}`, nivel === estado.nivel);
    }

    // Leitores de tela são avisados só quando o nível muda, não a cada tecla
    if (estado.nivel !== this._nivelAnunciado) {
      this._nivelAnunciado = estado.nivel;
      this.anuncioElement.textContent = estado.anuncio;
    }
  }

  private sincronizarAltura(autoAltura: boolean) {
    const ta = this.textareaElement;
    const redimensionar = autoAltura
      ? 'nenhum'
      : escolherOpcao(this.getAttribute('redimensionar'), REDIMENSIONAMENTOS, 'vertical');
    ta.style.resize = RESIZE_CSS[redimensionar];

    const linhasMax = autoAltura ? inteiroOuNulo(this.getAttribute('linhas-max'), 1) : null;
    if (linhasMax !== null) this.style.setProperty('--ui-area-linhas-max', String(Math.min(linhasMax, LINHAS_MAX_AUTO)));
    else this.style.removeProperty('--ui-area-linhas-max');

    if (autoAltura) ajustarAlturaAutomatica(ta, this.wrapperElement);
    else limparAlturaAutomatica(ta, this.wrapperElement);
  }

  private emitirEdicao(nomeUi: 'ui-input' | 'ui-change', nomeNativo: 'input' | 'change', valor: string) {
    this.dispatchEvent(
      new CustomEvent<DetalheValorAreaTexto>(nomeUi, { detail: { value: valor }, bubbles: true, composed: true })
    );
    this.dispatchEvent(new Event(nomeNativo, { bubbles: true, composed: true }));
  }

  private handleInput = (e: Event) => {
    e.stopPropagation();
    this.syncState();
    this.emitirEdicao('ui-input', 'input', this.textareaElement.value);
  };

  private handleChange = (e: Event) => {
    e.stopPropagation();
    this.syncState();
    this.emitirEdicao('ui-change', 'change', this.textareaElement.value);
  };

  private handleFocus = () => {
    this._focado = true;
  };

  private handleBlur = () => {
    this._focado = false;
    this.syncState();
  };

  /** Ctrl/Cmd + Enter pede o envio sem submeter o `<form>`; Enter comum continua inserindo quebra de linha. */
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.isComposing || e.altKey || e.shiftKey || !(e.ctrlKey || e.metaKey)) return;
    if (this.disabled || this.readOnly) return;
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent<DetalheEnviarAreaTexto>('ui-enviar', {
        detail: { value: this.textareaElement.value },
        bubbles: true,
        composed: true
      })
    );
  };

  /** Clique em `<label>` externo associado ao host foca o textarea. */
  private handleHostClick = (e: MouseEvent) => {
    if (cliqueVeioDeRotuloExterno(this, e) && !this.disabled) this.textareaElement.focus();
  };

  private handleResize = () => {
    if (this.hasAttribute('auto-altura')) ajustarAlturaAutomatica(this.textareaElement, this.wrapperElement);
  };
}

/** Alias semântico: `<ui-textarea>` é idêntico a `<ui-area-texto>`. */
export class UITextarea extends UIAreaTexto {}

definirCustomElement('ui-area-texto', UIAreaTexto);
definirCustomElement('ui-textarea', UITextarea);
