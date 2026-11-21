/**
 * Confirmação em modal acessível, no lugar de `window.confirm()`: foco preso, Esc/fundo cancelam,
 * botões com verbos explícitos ("Remover matrícula", não "OK") e variante destrutiva para ações irreversíveis.
 *
 * ```ts
 * if (await confirmarAcao({ titulo: 'Remover matrícula', mensagem: 'O anexo de Ana será apagado.',
 *                           rotuloConfirmar: 'Remover matrícula', destrutivo: true })) { ... }
 * ```
 */
import './ui-modal';
import '../ui-botao';
import type { UIModal } from './ui-modal';

export interface OpcoesConfirmacao {
  titulo: string;
  mensagem: string;
  /** Verbo da ação ("Remover matrícula"). Evite rótulos vagos como "OK". */
  rotuloConfirmar: string;
  rotuloCancelar?: string;
  /** Ação irreversível: o botão de confirmar usa a variante destrutiva. */
  destrutivo?: boolean;
}

export interface OpcoesDescarte {
  titulo?: string;
  mensagem?: string;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
}

/** Abre o modal e resolve `true` só se o usuário confirmar; qualquer outra saída (cancelar, Esc, fundo, X) resolve `false`. */
export function confirmarAcao(opcoes: OpcoesConfirmacao): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);

  return new Promise<boolean>((resolver) => {
    const modal = document.createElement('ui-modal') as UIModal;
    modal.setAttribute('titulo', opcoes.titulo);

    const corpo = document.createElement('p');
    corpo.style.margin = '0';
    corpo.textContent = opcoes.mensagem;
    modal.appendChild(corpo);

    const criarBotao = (papel: 'cancelar' | 'confirmar', rotulo: string, variante: string) => {
      const botao = document.createElement('ui-botao');
      botao.setAttribute('slot', 'rodape');
      botao.setAttribute('variante', variante);
      botao.dataset.confirmar = papel;
      botao.textContent = rotulo;
      return botao;
    };
    // Cancelar vem primeiro: é o foco inicial e a saída segura.
    const cancelar = criarBotao('cancelar', opcoes.rotuloCancelar || 'Cancelar', 'secundario');
    const confirmar = criarBotao('confirmar', opcoes.rotuloConfirmar, opcoes.destrutivo ? 'destrutivo' : 'primario');
    modal.append(cancelar, confirmar);

    let resolvido = false;
    const concluir = (resposta: boolean) => {
      if (resolvido) return;
      resolvido = true;
      resolver(resposta);
      modal.aberto = false;
      // Deixa o modal terminar a transição de saída (foco de volta ao gatilho) antes de sair do DOM.
      setTimeout(() => modal.remove(), 0);
    };

    confirmar.addEventListener('click', () => concluir(true));
    cancelar.addEventListener('click', () => concluir(false));
    modal.addEventListener('ui-fechar', () => concluir(false));

    document.body.appendChild(modal);
    modal.abrir();
  });
}

/** Só pergunta se `rascunho.avaliar()` indicar alterações não salvas; limpo resolve `true` sem abrir nada. */
export async function confirmarDescarteSeSujo(
  rascunho: { avaliar(): boolean },
  opcoes: OpcoesDescarte = {}
): Promise<boolean> {
  if (!rascunho.avaliar()) return true;
  return confirmarAcao({
    titulo: opcoes.titulo ?? 'Descartar alterações?',
    mensagem: opcoes.mensagem ?? 'Há alterações que ainda não foram salvas. Se continuar, elas serão perdidas.',
    rotuloConfirmar: opcoes.rotuloConfirmar ?? 'Descartar alterações',
    rotuloCancelar: opcoes.rotuloCancelar ?? 'Continuar editando',
    destrutivo: true
  });
}
