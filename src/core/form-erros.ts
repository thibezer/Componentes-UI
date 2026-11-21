/**
 * Validação inline por campo: marca `erro` + `mensagem-erro` nos `ui-*` (que expõem `aria-invalid` e a mensagem
 * ao lado do campo), devolve a lista de erros para um resumo/banner e leva o foco ao primeiro campo inválido.
 * As regras são da aplicação (ex.: CPF/CNPJ); aqui fica só a mecânica, reutilizável.
 */
import { ListenerBag } from './listener-bag';
import { SELETOR_CAMPOS_PADRAO, listarCampos, localizarCampo, lerValorCampo } from './form-campos';

/** Devolve a mensagem de erro, ou `null`/`undefined`/`''` quando o valor é válido. */
export type RegraCampo = (valor: string, campo: Element) => string | null | undefined;

export interface ErroCampo {
  chave: string;
  mensagem: string;
  campo: Element;
}

export interface ResultadoValidacaoFormulario {
  valido: boolean;
  erros: ErroCampo[];
}

export interface OpcoesValidacaoFormulario {
  /** Leva o foco ao primeiro campo inválido (padrão: `true`). */
  focarPrimeiro?: boolean;
  /** Campos que não participam agora (ex.: ocultos por regra de negócio). */
  ignorar?: (campo: Element) => boolean;
}

const MENSAGEM_REGRA_FALHOU = 'Valor inválido.';

function marcar(campo: Element, mensagem: string | null): void {
  if (mensagem) {
    campo.setAttribute('erro', '');
    campo.setAttribute('mensagem-erro', mensagem);
  } else {
    campo.removeAttribute('erro');
    campo.removeAttribute('mensagem-erro');
  }
}

/**
 * Valida os campos de `raiz` identificados (por `name` ou `id`) nas chaves de `regras`.
 * Erros anteriores dos campos validados são substituídos; campos válidos ficam limpos.
 */
export function validarCampos(
  raiz: ParentNode | null | undefined,
  regras: Record<string, RegraCampo> | null | undefined,
  opcoes: OpcoesValidacaoFormulario = {}
): ResultadoValidacaoFormulario {
  const erros: ErroCampo[] = [];
  if (!raiz || !regras || typeof regras !== 'object') return { valido: true, erros };

  for (const chave of Object.keys(regras)) {
    const regra = regras[chave];
    const campo = localizarCampo(raiz, chave);
    if (!campo || typeof regra !== 'function') continue;
    if (opcoes.ignorar?.(campo)) {
      marcar(campo, null);
      continue;
    }
    let mensagem: string | null | undefined;
    try {
      mensagem = regra(lerValorCampo(campo), campo);
    } catch (erro) {
      console.error(`[form-erros] regra do campo "${chave}" lançou exceção:`, erro);
      mensagem = MENSAGEM_REGRA_FALHOU;
    }
    marcar(campo, mensagem || null);
    if (mensagem) erros.push({ chave, mensagem, campo });
  }

  // Ordem do DOM: o foco vai para o primeiro campo que o usuário vê, não o primeiro da tabela de regras.
  if (erros.length > 0) {
    const ordem = listarCampos(raiz);
    erros.sort((a, b) => ordem.indexOf(a.campo) - ordem.indexOf(b.campo));
    if (opcoes.focarPrimeiro !== false) {
      const primeiro = erros[0].campo as HTMLElement;
      try {
        primeiro.focus?.();
        primeiro.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      } catch {
        // Foco indisponível (campo desconectado): o erro continua visível.
      }
    }
  }

  return { valido: erros.length === 0, erros };
}

/** Remove os erros de todos os campos de `raiz`. */
export function limparErros(raiz: ParentNode | null | undefined): void {
  listarCampos(raiz).forEach((campo) => marcar(campo, null));
}

/**
 * Faz o erro de um campo sumir assim que o usuário volta a editá-lo (sem esperar nova validação).
 * Devolve a função que remove o ouvinte.
 */
export function observarLimpezaDeErros(raiz: Element | null | undefined, seletor: string = SELETOR_CAMPOS_PADRAO): () => void {
  const ouvintes = new ListenerBag();
  const limpar = (evento: Event) => {
    const alvo = evento.target;
    if (!(alvo instanceof Element)) return;
    const campo = alvo.closest(seletor);
    if (campo && (campo.hasAttribute('erro') || campo.hasAttribute('mensagem-erro'))) marcar(campo, null);
  };
  ['input', 'change', 'ui-input', 'ui-change', 'ui-selecionar'].forEach((tipo) => ouvintes.add(raiz, tipo, limpar));
  return () => ouvintes.cleanup();
}
