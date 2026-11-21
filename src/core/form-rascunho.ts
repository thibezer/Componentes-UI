/**
 * Rascunho de formulário: sabe se o usuário alterou algo desde a última "linha de base"
 * (formulário aberto/preenchido ou salvo). Serve para pedir confirmação antes de descartar
 * alterações (Cancelar, fechar, trocar de registro) e para exibir "Alterações não salvas".
 *
 * Fluxo típico:
 * ```ts
 * const rascunho = criarRascunhoFormulario(form, { estadoExterno: () => listaCoproprietarios });
 * abrirRegistro(); rascunho.marcarLimpo();          // depois de preencher os campos
 * if (rascunho.sujo) { ...confirmar descarte... }
 * salvar(); rascunho.marcarLimpo();
 * ```
 */
import { ListenerBag } from './listener-bag';
import { SELETOR_CAMPOS_PADRAO, listarCampos, chaveDoCampo, lerValorCampo } from './form-campos';

export interface OpcoesRascunho {
  /** Seletor dos campos monitorados (padrão: controles nativos e `ui-*` de formulário). */
  seletor?: string;
  /**
   * Estado que mora fora dos campos (ex.: lista dinâmica de cards). Deve ser serializável em JSON;
   * erros ao lê-lo são tratados como "sem estado externo".
   */
  estadoExterno?: () => unknown;
  /** Chamado só quando `sujo` muda de valor. */
  aoMudar?: (sujo: boolean) => void;
}

export interface RascunhoFormulario {
  /** Último valor avaliado. Para ler o estado atual com certeza (ex.: depois de mudar `estadoExterno`), use `avaliar()`. */
  readonly sujo: boolean;
  /** Recalcula comparando com a linha de base, notifica `aoMudar` se mudou e devolve `sujo`. */
  avaliar(): boolean;
  /** Adota o estado atual como linha de base (depois de preencher ou de salvar). */
  marcarLimpo(): void;
  /** Remove os ouvintes. Idempotente. */
  destruir(): void;
}

const EVENTOS_DE_ALTERACAO = ['input', 'change', 'ui-input', 'ui-change', 'ui-selecionar', 'ui-campos-preenchidos'];

function fotografar(raiz: Element | null | undefined, seletor: string, estadoExterno?: () => unknown): string {
  const campos = listarCampos(raiz, seletor).map((el, i) => [chaveDoCampo(el, i), lerValorCampo(el)] as const);
  let externo: unknown = null;
  if (estadoExterno) {
    try {
      externo = estadoExterno() ?? null;
    } catch {
      externo = null;
    }
  }
  try {
    return JSON.stringify([campos, externo]);
  } catch {
    return JSON.stringify([campos, null]);
  }
}

export function criarRascunhoFormulario(raiz: Element | null | undefined, opcoes: OpcoesRascunho = {}): RascunhoFormulario {
  const seletor = opcoes.seletor ?? SELETOR_CAMPOS_PADRAO;
  const ouvintes = new ListenerBag();
  let linhaDeBase = fotografar(raiz, seletor, opcoes.estadoExterno);
  let sujo = false;

  const avaliar = (): boolean => {
    const agora = fotografar(raiz, seletor, opcoes.estadoExterno) !== linhaDeBase;
    if (agora !== sujo) {
      sujo = agora;
      try {
        opcoes.aoMudar?.(sujo);
      } catch (erro) {
        console.error('[form-rascunho] aoMudar lançou exceção:', erro);
      }
    }
    return sujo;
  };

  EVENTOS_DE_ALTERACAO.forEach((tipo) => ouvintes.add(raiz, tipo, avaliar));

  return {
    get sujo() {
      return sujo;
    },
    avaliar,
    marcarLimpo() {
      linhaDeBase = fotografar(raiz, seletor, opcoes.estadoExterno);
      avaliar();
    },
    destruir() {
      ouvintes.cleanup();
    }
  };
}
