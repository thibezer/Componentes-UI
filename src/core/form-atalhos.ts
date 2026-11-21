/**
 * Atalhos de teclado de um formulário de cadastro: `Ctrl/Cmd+S` salva e `Esc` cancela.
 * Ambos usam tecla de modificador ou são contextuais, então valem mesmo com o foco num campo de texto
 * (WCAG 2.1.4: nenhum atalho de tecla única). O `Esc` só age se nenhum filho o tratou antes
 * (ex.: lista flutuante aberta fechando) e nunca durante composição de texto (IME).
 */
import { ListenerBag } from './listener-bag';

export interface OpcoesAtalhosFormulario {
  /** `Ctrl+S` / `Cmd+S`. Sem esta opção a tecla continua com o navegador. */
  salvar?: () => void;
  /** `Esc`. Sem esta opção a tecla não é tocada. */
  cancelar?: () => void;
}

/** Liga os atalhos em `raiz` e devolve a função que os remove (idempotente). */
export function ligarAtalhosFormulario(raiz: Element | null | undefined, opcoes: OpcoesAtalhosFormulario): () => void {
  const ouvintes = new ListenerBag();

  const executar = (acao: () => void) => {
    try {
      acao();
    } catch (erro) {
      console.error('[form-atalhos] ação do atalho lançou exceção:', erro);
    }
  };

  const aoTeclar = (evento: KeyboardEvent) => {
    if (evento.isComposing) return;

    const ctrlOuCmd = evento.ctrlKey || evento.metaKey;
    if (opcoes.salvar && ctrlOuCmd && !evento.altKey && !evento.shiftKey && evento.key.toLowerCase() === 's') {
      evento.preventDefault();
      executar(opcoes.salvar);
      return;
    }

    if (
      opcoes.cancelar &&
      evento.key === 'Escape' &&
      !evento.defaultPrevented &&
      !ctrlOuCmd && !evento.altKey && !evento.shiftKey
    ) {
      evento.preventDefault();
      executar(opcoes.cancelar);
    }
  };

  ouvintes.add(raiz, 'keydown', aoTeclar as EventListener);
  return () => ouvintes.cleanup();
}
