/**
 * Utilitários para Form-Associated Custom Elements e validação nativa de restrições (HTML5 / W3C FACE).
 */

export interface RegrasValidacaoCampoTexto {
  val: string;
  rawVal?: string;
  badInput?: boolean;
  disabled: boolean;
  required: boolean;
  tipo?: string;
  minlength?: number | null;
  maxlength?: number | null;
  pattern?: string | null;
  min?: number | null;
  max?: number | null;
  step?: string | null;
  customError?: string;
  mensagemValidacao?: string | null;
}

export interface ResultadoValidacao {
  valido: boolean;
  flags: ValidityStateFlags;
  mensagem: string;
}

/**
 * Valida o valor e restrições de um campo de texto conforme a especificação W3C / HTML5.
 */
export function validarRestricoesCampoTexto(regras: RegrasValidacaoCampoTexto): ResultadoValidacao {
  if (regras.disabled) {
    return { valido: true, flags: {}, mensagem: '' };
  }

  // 1. Erro customizado via setCustomValidity
  if (regras.customError && regras.customError.trim() !== '') {
    return {
      valido: false,
      flags: { customError: true },
      mensagem: regras.customError
    };
  }

  const { val, rawVal, badInput, required, tipo = 'text', mensagemValidacao } = regras;

  // 2. Bad input nativo do input interno ou atributo não-numérico
  if (badInput || (tipo === 'number' && rawVal && isNaN(Number(rawVal)))) {
    return {
      valido: false,
      flags: { badInput: true },
      mensagem: mensagemValidacao || 'Insira um número válido.'
    };
  }

  // 2. Obrigatório / valueMissing
  if (required && val.trim() === '') {
    return {
      valido: false,
      flags: { valueMissing: true },
      mensagem: mensagemValidacao || 'Preencha este campo.'
    };
  }

  // Se o campo estiver vazio e não for obrigatório, não viola as demais restrições
  if (val === '') {
    return { valido: true, flags: {}, mensagem: '' };
  }

  // 3. Minlength (tooShort)
  if (regras.minlength !== null && regras.minlength !== undefined && !isNaN(regras.minlength)) {
    if (val.length < regras.minlength) {
      return {
        valido: false,
        flags: { tooShort: true },
        mensagem: mensagemValidacao || `Use pelo menos ${regras.minlength} caracteres (atualmente você está usando ${val.length}).`
      };
    }
  }

  // 4. Maxlength (tooLong)
  if (regras.maxlength !== null && regras.maxlength !== undefined && !isNaN(regras.maxlength)) {
    if (val.length > regras.maxlength) {
      return {
        valido: false,
        flags: { tooLong: true },
        mensagem: mensagemValidacao || `Reduza o texto para no máximo ${regras.maxlength} caracteres (atualmente você está usando ${val.length}).`
      };
    }
  }

  // 5. Pattern (patternMismatch)
  if (regras.pattern) {
    try {
      const regex = new RegExp(`^(?:${regras.pattern})$`);
      if (!regex.test(val)) {
        return {
          valido: false,
          flags: { patternMismatch: true },
          mensagem: mensagemValidacao || 'O valor não corresponde ao padrão solicitado.'
        };
      }
    } catch {
      // Ignora se for expressão regular com erro de sintaxe
    }
  }

  // 6. Tipo Email (typeMismatch)
  if (tipo === 'email') {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(val)) {
      return {
        valido: false,
        flags: { typeMismatch: true },
        mensagem: mensagemValidacao || 'Insira um endereço de e-mail válido.'
      };
    }
  }

  // 7. Tipo URL (typeMismatch)
  if (tipo === 'url') {
    try {
      new URL(val);
    } catch {
      return {
        valido: false,
        flags: { typeMismatch: true },
        mensagem: mensagemValidacao || 'Insira uma URL válida.'
      };
    }
  }

  // 8. Tipo Number (badInput, rangeUnderflow, rangeOverflow, stepMismatch)
  if (tipo === 'number') {
    const num = Number(val);
    if (isNaN(num)) {
      return {
        valido: false,
        flags: { badInput: true },
        mensagem: mensagemValidacao || 'Insira um número válido.'
      };
    }

    if (regras.min !== null && regras.min !== undefined && !isNaN(regras.min)) {
      if (num < regras.min) {
        return {
          valido: false,
          flags: { rangeUnderflow: true },
          mensagem: mensagemValidacao || `O valor deve ser maior ou igual a ${regras.min}.`
        };
      }
    }

    if (regras.max !== null && regras.max !== undefined && !isNaN(regras.max)) {
      if (num > regras.max) {
        return {
          valido: false,
          flags: { rangeOverflow: true },
          mensagem: mensagemValidacao || `O valor deve ser menor ou igual a ${regras.max}.`
        };
      }
    }

    if (regras.step && regras.step !== 'any') {
      const stepVal = parseFloat(regras.step);
      if (!isNaN(stepVal) && stepVal > 0) {
        const base = (regras.min !== null && regras.min !== undefined && !isNaN(regras.min)) ? regras.min : 0;
        const remainder = Math.abs((num - base) % stepVal);
        if (remainder > 0.000001 && Math.abs(remainder - stepVal) > 0.000001) {
          return {
            valido: false,
            flags: { stepMismatch: true },
            mensagem: mensagemValidacao || 'Insira um valor válido de acordo com o intervalo.'
          };
        }
      }
    }
  }

  return { valido: true, flags: {}, mensagem: '' };
}

/**
 * Aplica o resultado da validação na instância de ElementInternals
 */
export function aplicarValidadeInternals(
  internals: { setValidity?: (flags?: any, message?: string, anchor?: HTMLElement) => void } | any,
  resultado: ResultadoValidacao,
  anchor?: HTMLElement
): void {
  if (!internals || typeof internals.setValidity !== 'function') return;

  if (resultado.valido) {
    internals.setValidity({});
  } else {
    internals.setValidity(resultado.flags, resultado.mensagem || 'Valor inválido.', anchor);
  }
}
