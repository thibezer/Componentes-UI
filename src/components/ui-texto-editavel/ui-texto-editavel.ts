/* ====================================================
   UI Texto Editável - Componente Botão/Campo Inline
   ==================================================== */

import estilos from './ui-texto-editavel.css?inline';
import { FormAssociatedElement } from '../../core/form-associated-element';
import { ListenerBag } from '../../core/listener-bag';
import { definirCustomElement } from '../../core/ssr-safe';
import {
  ATRIBUTOS_OBSERVADOS_TEXTO_EDITAVEL,
  criarTemplateTextoEditavel
} from './texto-editavel-template';
import {
  tratarTecladoLeitura,
  tratarTecladoEdicao
} from './texto-editavel-teclado';
import type {
  VarianteTextoEditavel,
  TamanhoTextoEditavel,
  ModoTextoEditavel,
  ComportamentoAoPerderFoco
} from './tipos';

/**
 * Componente de texto ou botão que se transforma em campo de edição com duplo clique (ou atalhos de teclado).
 *
 * @element ui-texto-editavel
 *
 * @attr {string} valor - Valor textual atual.
 * @attr {string} placeholder - Texto exibido quando o valor está vazio.
 * @attr {string} variante - Estilo visual ('secundario', 'primario', 'ghost', 'outline', 'texto', etc.).
 * @attr {string} tamanho - Tamanho do controle ('sm', 'md', 'lg').
 * @attr {boolean} disabled - Desabilita o componente e impede edição.
 * @attr {boolean} readonly - Permite focar e ler, mas impede entrar em edição.
 * @attr {string} ao-perder-foco - Ação ao sair do campo ('salvar', 'cancelar', 'ignorar'). Padrão: 'salvar'.
 * @attr {boolean} obrigatorio - Impede salvar com valor em branco.
 * @attr {number} maxlength - Quantidade máxima de caracteres permitida.
 *
 * @fires ui-salvar - Disparado ao confirmar a edição com `{ valor, valorAnterior }`. Cancelável via preventDefault().
 * @fires ui-cancelar - Disparado ao cancelar a edição com `{ valor }`.
 * @fires ui-modo-alterado - Disparado quando alterna entre leitura e edição com `{ modo }`.
 * @fires change - Disparado nativamente quando o valor é alterado e confirmado.
 *
 * @csspart base - O contêiner envolvente.
 * @csspart botao - O botão do modo leitura.
 * @csspart texto - O elemento de texto interno no modo leitura.
 * @csspart input - O campo de entrada de texto nativo no modo edição.
 */
export class UITextoEditavel extends FormAssociatedElement {
  static override formAssociated = true;

  static get observedAttributes() {
    return ATRIBUTOS_OBSERVADOS_TEXTO_EDITAVEL;
  }

  private container: HTMLDivElement;
  private botaoElement: HTMLButtonElement;
  private textoElement: HTMLSpanElement;
  private inputElement: HTMLInputElement;

  private _modo: ModoTextoEditavel = 'leitura';
  private _concluindo: boolean = false;
  private _valorInterno: string = '';
  private _valorOriginalAoEditar: string = '';
  private listeners = new ListenerBag();

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    shadow.innerHTML = criarTemplateTextoEditavel(estilos);

    this.container = shadow.querySelector('.ui-texto-editavel')!;
    this.botaoElement = shadow.querySelector('.ui-texto-editavel__botao')!;
    this.textoElement = shadow.querySelector('.ui-texto-editavel__texto')!;
    this.inputElement = shadow.querySelector('.ui-texto-editavel__input')!;

    // Inicialização segura de atributos
    this._valorInterno = this.getAttribute('valor') ?? this.getAttribute('value') ?? '';
  }

  connectedCallback() {
    this.listeners.cleanup();

    // Eventos do modo leitura
    this.listeners.add(this.botaoElement, 'dblclick', this.handleDuploClique);
    this.listeners.add(this.botaoElement, 'keydown', this.handleKeyDownBotao);

    // Eventos do modo edição
    this.listeners.add(this.inputElement, 'keydown', this.handleKeyDownInput);
    this.listeners.add(this.inputElement, 'blur', this.handleBlurInput);

    this.syncState();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
  }

  attributeChangedCallback(nome: string, _antigo: string | null, novo: string | null) {
    if ((nome === 'valor' || nome === 'value') && novo !== null) {
      if (this._modo === 'leitura') {
        this._valorInterno = novo;
      }
    }
    this.syncState();
  }

  // === Handlers de Eventos ===

  private handleDuploClique = (e: MouseEvent) => {
    e.stopPropagation();
    if (this.disabled || this.readOnly) return;
    this.editar();
  };

  private handleKeyDownBotao = (e: KeyboardEvent) => {
    if (this.disabled || this.readOnly) return;
    tratarTecladoLeitura(e, () => this.editar());
  };

  private handleKeyDownInput = (e: KeyboardEvent) => {
    tratarTecladoEdicao(
      e,
      () => this.salvar(),
      () => this.cancelar()
    );
  };

  private handleBlurInput = () => {
    if (this._concluindo || this._modo !== 'edicao') return;
    const acao = this.aoPerderFoco;
    if (acao === 'cancelar') {
      this.cancelar();
    } else if (acao === 'salvar') {
      this.salvar();
    }
  };

  // === API Pública Programática ===

  /** Entra no modo de edição se o componente não estiver desabilitado ou em somente leitura. */
  public editar(): void {
    if (this._modo === 'edicao' || this.disabled || this.readOnly) return;

    this._modo = 'edicao';
    this._valorOriginalAoEditar = this._valorInterno;
    this.inputElement.value = this._valorInterno;

    this.container.setAttribute('data-modo', 'edicao');

    // Foco imediato com seleção de texto
    requestAnimationFrame(() => {
      this.inputElement.focus();
      this.inputElement.select();
    });

    this.dispararEventoModo();
  }

  /**
   * Salva as alterações feitas no modo de edição e retorna ao modo leitura.
   * Dispara `ui-salvar` (cancelável com preventDefault()).
   */
  public salvar(): boolean {
    if (this._modo !== 'edicao' || this._concluindo) return false;

    this._concluindo = true;
    const novoValorBruto = this.inputElement.value;
    const novoValor = novoValorBruto.trim();

    // Validação de obrigatoriedade
    if (this.obrigatorio && novoValor === '') {
      this._concluindo = false;
      this.cancelar();
      return false;
    }

    const valorAnterior = this._valorOriginalAoEditar;

    if (novoValor !== valorAnterior) {
      const eventoSalvar = new CustomEvent('ui-salvar', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { valor: novoValor, valorAnterior }
      });

      const permitido = this.dispatchEvent(eventoSalvar);
      if (!permitido) {
        // Consumidor cancelou o salvamento
        this._concluindo = false;
        return false;
      }

      this._valorInterno = novoValor;
      this.setAttribute('valor', novoValor);

      // Emite change nativo
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }

    this._modo = 'leitura';
    this.container.setAttribute('data-modo', 'leitura');
    this.syncState();

    // Devolve o foco para o botão de leitura
    requestAnimationFrame(() => {
      this.botaoElement.focus();
    });

    this.dispararEventoModo();
    this._concluindo = false;
    return true;
  }

  /** Cancela as alterações e restaura o valor prévio à edição. */
  public cancelar(): void {
    if (this._modo !== 'edicao' || this._concluindo) return;

    this._concluindo = true;
    this.inputElement.value = this._valorOriginalAoEditar;

    this._modo = 'leitura';
    this.container.setAttribute('data-modo', 'leitura');
    this.syncState();

    this.dispatchEvent(
      new CustomEvent('ui-cancelar', {
        bubbles: true,
        composed: true,
        detail: { valor: this._valorInterno }
      })
    );

    // Devolve foco ao botão
    requestAnimationFrame(() => {
      this.botaoElement.focus();
    });

    this.dispararEventoModo();
    this._concluindo = false;
  }

  /** Informa se o componente está atualmente no modo de edição. */
  public estaEditando(): boolean {
    return this._modo === 'edicao';
  }

  private dispararEventoModo(): void {
    this.dispatchEvent(
      new CustomEvent('ui-modo-alterado', {
        bubbles: true,
        composed: true,
        detail: { modo: this._modo }
      })
    );
  }

  // === Sincronização do DOM & Form-Associated ===

  protected override syncState(): void {
    const valor = this._valorInterno;
    const placeholder = this.placeholder;

    if (valor.trim() !== '') {
      this.textoElement.textContent = valor;
      this.textoElement.classList.remove('ui-texto-editavel__texto--placeholder');
    } else {
      this.textoElement.textContent = placeholder;
      this.textoElement.classList.add('ui-texto-editavel__texto--placeholder');
    }

    // Variantes e classes CSS
    const variante = this.variante;
    const tamanho = this.tamanho;

    this.container.className = `ui-texto-editavel ui-texto-editavel--${variante} ui-texto-editavel--${tamanho}`;

    // Estado desabilitado
    const isDesabilitado = this.disabled;
    this.botaoElement.disabled = isDesabilitado;
    this.inputElement.disabled = isDesabilitado;

    // Atributos HTML do input
    const max = this.maxlength;
    if (max !== null && max > 0) {
      this.inputElement.maxLength = max;
    } else {
      this.inputElement.removeAttribute('maxlength');
    }

    this.atualizarValidade();
  }

  public override atualizarValidade(): void {
    if (this.internals && typeof this.internals.setFormValue === 'function') {
      this.internals.setFormValue(this._valorInterno);
    }
  }

  // === Getters e Setters ===

  get valor(): string {
    return this._valorInterno;
  }

  set valor(val: string) {
    this._valorInterno = val ?? '';
    this.setAttribute('valor', this._valorInterno);
    this.syncState();
  }

  get value(): string {
    return this.valor;
  }

  set value(val: string) {
    this.valor = val;
  }

  get placeholder(): string {
    return this.getAttribute('placeholder') || 'Clique duas vezes para editar';
  }

  set placeholder(val: string) {
    if (val) this.setAttribute('placeholder', val);
    else this.removeAttribute('placeholder');
    this.syncState();
  }

  get variante(): VarianteTextoEditavel {
    const v = this.getAttribute('variante');
    return (v as VarianteTextoEditavel) || 'secundario';
  }

  set variante(val: VarianteTextoEditavel) {
    if (val) this.setAttribute('variante', val);
    else this.removeAttribute('variante');
    this.syncState();
  }

  get tamanho(): TamanhoTextoEditavel {
    const t = this.getAttribute('tamanho');
    return (t as TamanhoTextoEditavel) || 'md';
  }

  set tamanho(val: TamanhoTextoEditavel) {
    if (val) this.setAttribute('tamanho', val);
    else this.removeAttribute('tamanho');
    this.syncState();
  }

  get disabled(): boolean {
    return this._formDisabled || this.hasAttribute('disabled') || this.hasAttribute('desabilitado');
  }

  set disabled(val: boolean) {
    if (val) this.setAttribute('disabled', '');
    else {
      this.removeAttribute('disabled');
      this.removeAttribute('desabilitado');
    }
    this.syncState();
  }

  get readOnly(): boolean {
    return this.hasAttribute('readonly') || this.hasAttribute('somente-leitura');
  }

  set readOnly(val: boolean) {
    if (val) this.setAttribute('readonly', '');
    else {
      this.removeAttribute('readonly');
      this.removeAttribute('somente-leitura');
    }
  }

  get obrigatorio(): boolean {
    return this.hasAttribute('obrigatorio') || this.hasAttribute('required');
  }

  set obrigatorio(val: boolean) {
    if (val) this.setAttribute('obrigatorio', '');
    else {
      this.removeAttribute('obrigatorio');
      this.removeAttribute('required');
    }
  }

  get aoPerderFoco(): ComportamentoAoPerderFoco {
    const val = this.getAttribute('ao-perder-foco');
    if (val === 'cancelar' || val === 'ignorar') return val;
    return 'salvar';
  }

  set aoPerderFoco(val: ComportamentoAoPerderFoco) {
    this.setAttribute('ao-perder-foco', val);
  }

  get maxlength(): number | null {
    const attr = this.getAttribute('maxlength') ?? this.getAttribute('limite-caracteres');
    if (!attr) return null;
    const n = parseInt(attr, 10);
    return isNaN(n) ? null : n;
  }

  set maxlength(val: number | null) {
    if (val !== null && val >= 0) this.setAttribute('maxlength', String(val));
    else {
      this.removeAttribute('maxlength');
      this.removeAttribute('limite-caracteres');
    }
    this.syncState();
  }
}

definirCustomElement('ui-texto-editavel', UITextoEditavel);
