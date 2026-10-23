/**
 * Teclado da edição de vértices do <ui-canvas-cad>: Enter com uma só feição selecionada abre a edição.
 * Responsabilidade única: decidir se o Enter é do canvas e pedir a edição pelas `PortasTecladoEdicao`.
 */
import { focoEmCampoDeTexto, focoEmControleAcionavel } from '../../core/alvo-digitavel';
import { ListenerBag } from '../../core/listener-bag';

export interface PortasTecladoEdicao {
  /** Edição de vértices ou ferramenta de desenho em andamento: elas tratam o próprio Enter. */
  ocupado: () => boolean;
  /** Os atalhos do canvas valem agora (mouse sobre ele, foco dentro dele ou canvas único na página)? */
  atalhosValem: () => boolean;
  /** Edita a única feição selecionada, se houver uma editável. Devolve se a edição começou. */
  editarSelecionada: () => boolean;
}

/** Enter "limpo": sem modificadores, não tratado antes, fora de campos de texto e de botões/links em foco. */
export function enterLivre(e: KeyboardEvent): boolean {
  if (e.key !== 'Enter' || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return false;
  return !focoEmCampoDeTexto(e) && !focoEmControleAcionavel(e);
}

export class TecladoEdicao {
  private ouvintes = new ListenerBag();

  constructor(private p: PortasTecladoEdicao) {}

  /** Idempotente: reconectar não duplica o ouvinte. */
  public conectar(alvo: EventTarget = window): void {
    this.ouvintes.cleanup();
    this.ouvintes.add<KeyboardEvent>(alvo, 'keydown', this.aoTecla);
  }

  public desconectar(): void {
    this.ouvintes.cleanup();
  }

  private aoTecla = (e: KeyboardEvent): void => {
    try {
      if (!enterLivre(e) || this.p.ocupado() || !this.p.atalhosValem()) return;
      if (this.p.editarSelecionada()) e.preventDefault();
    } catch (erro) {
      console.error('[ui-canvas-cad] falha no atalho Enter da edição', erro);
    }
  };
}
