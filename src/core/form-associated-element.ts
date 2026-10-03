import { SafeHTMLElement } from './ssr-safe';

/**
 * Base para Form-Associated Custom Elements (W3C FACE).
 * Concentra o que é idêntico em todos os campos de formulário da biblioteca:
 * ElementInternals, estado desabilitado pelo <form>, erro customizado,
 * atributo obrigatório e a API de validação nativa (validity, checkValidity, etc.).
 *
 * Cada componente fornece apenas o que é específico: a regra de validação
 * (`atualizarValidade`), a sincronização visual (`syncState`) e o valor do formulário.
 */
export abstract class FormAssociatedElement extends SafeHTMLElement {
  static formAssociated = true;

  protected internals: ReturnType<HTMLElement['attachInternals']>;
  protected _formDisabled: boolean = false;
  protected _customErrorMessage: string = '';

  constructor() {
    super();
    this.internals = typeof this.attachInternals === 'function' ? this.attachInternals() : ({} as any);
  }

  /** Sincroniza o DOM interno com atributos e estado atuais. */
  protected abstract syncState(): void;

  /** Aplica as regras de validação do componente em `internals.setValidity`. */
  public abstract atualizarValidade(): void;

  // === Ciclo de Vida Form-Associated Custom Elements ===
  public formDisabledCallback(disabled: boolean): void {
    this._formDisabled = disabled;
    this.syncState();
  }

  get form(): HTMLFormElement | null {
    return this.closest('form') ?? this.internals?.form ?? null;
  }

  get required(): boolean {
    return this.hasAttribute('obrigatorio') || this.hasAttribute('required');
  }

  set required(val: boolean) {
    if (val) this.setAttribute('obrigatorio', '');
    else {
      this.removeAttribute('obrigatorio');
      this.removeAttribute('required');
    }
    this.syncState();
  }

  get obrigatorio(): boolean {
    return this.required;
  }

  set obrigatorio(val: boolean) {
    this.required = val;
  }

  // === API de Validação Nativa ===
  get validity(): ValidityState | undefined {
    this.atualizarValidade();
    return this.internals?.validity;
  }

  get validationMessage(): string {
    this.atualizarValidade();
    return this.internals?.validationMessage ?? '';
  }

  get willValidate(): boolean {
    return this.internals?.willValidate ?? false;
  }

  public checkValidity(): boolean {
    this.atualizarValidade();
    return this.internals?.checkValidity?.() ?? true;
  }

  public reportValidity(): boolean {
    this.atualizarValidade();
    return this.internals?.reportValidity?.() ?? true;
  }

  public setCustomValidity(error: string): void {
    this._customErrorMessage = error || '';
    this.atualizarValidade();
  }
}
