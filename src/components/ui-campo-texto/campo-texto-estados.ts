export interface ContextoLabelPlaceholder {
  labelElement: HTMLLabelElement;
  inputElement: HTMLInputElement;
  labelText: string | null;
  placeholderText: string;
  isFlutuante: boolean;
  estaFocado: boolean;
}

export function sincronizarLabelEPlaceholder(ctx: ContextoLabelPlaceholder): void {
  const { labelElement, inputElement, labelText, placeholderText, isFlutuante, estaFocado } = ctx;
  const temValor = inputElement.value.trim() !== '';

  let temAutofill = false;
  try {
    temAutofill = inputElement.matches(':-webkit-autofill');
  } catch {
    temAutofill = false;
  }

  if (labelText) {
    labelElement.textContent = labelText;
    labelElement.style.display = 'flex';

    if (isFlutuante) {
      if (estaFocado || temValor || temAutofill) {
        labelElement.classList.add('ui-campo-texto__label--ativa');
      } else {
        labelElement.classList.remove('ui-campo-texto__label--ativa');
      }
    } else {
      labelElement.classList.remove('ui-campo-texto__label--ativa');
    }
  } else {
    labelElement.style.display = 'none';
  }

  if (isFlutuante && !estaFocado && !temValor && !temAutofill) {
    inputElement.placeholder = '';
  } else {
    inputElement.placeholder = placeholderText;
  }
}

export function sincronizarIconeSenha(
  container: HTMLSpanElement,
  ehSenhaOuAlternar: boolean,
  senhaVisivel: boolean
): void {
  if (ehSenhaOuAlternar) {
    container.classList.add('ui-campo-texto__icone--clicavel');
    container.setAttribute('role', 'button');
    container.setAttribute('tabindex', '0');
    container.setAttribute('aria-label', senhaVisivel ? 'Ocultar senha' : 'Exibir senha');
  } else {
    container.classList.remove('ui-campo-texto__icone--clicavel');
    container.removeAttribute('role');
    container.removeAttribute('tabindex');
    container.removeAttribute('aria-label');
  }
}

export function sincronizarFeedbackErro(
  wrapper: HTMLDivElement,
  input: HTMLInputElement,
  helper: HTMLDivElement,
  temErro: boolean,
  mensagemErro: string | null,
  helperText: string | null
): void {
  if (temErro) {
    wrapper.classList.add('ui-campo-texto__wrapper--erro');
    input.setAttribute('aria-invalid', 'true');
  } else {
    wrapper.classList.remove('ui-campo-texto__wrapper--erro');
    input.removeAttribute('aria-invalid');
  }

  if (temErro && mensagemErro) {
    helper.textContent = `⚠️ ${mensagemErro}`;
    helper.className = 'ui-campo-texto__helper ui-campo-texto__helper--erro';
    helper.style.display = 'block';
  } else if (helperText) {
    helper.textContent = helperText;
    helper.className = 'ui-campo-texto__helper';
    helper.style.display = 'block';
  } else {
    helper.style.display = 'none';
  }
}
