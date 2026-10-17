/**
 * Rótulo e nome acessível dos controles de formulário com caixa interna (switch, checkbox, radio).
 * Responsabilidade única: decidir entre o rótulo por atributo (`label`, ligado por `aria-labelledby`) e o rótulo
 * externo (`aria-label` do host, `<label for>` ou `<label>` envolvente), sem que o consumidor gerencie IDs.
 */
import { obterRotuloExterno } from './acessibilidade';

export interface OpcoesRotuloControle {
  host: HTMLElement;
  internals?: { labels?: NodeList } | null;
  /** Elemento interno com o papel (switch/checkbox/radio) que recebe o nome acessível. */
  controle: HTMLElement;
  /** Elemento interno que exibe o texto do rótulo; precisa ter `id`. */
  rotulo: HTMLElement;
  /** Valor do atributo `label` (texto puro, nunca HTML). */
  texto: string | null;
}

export function sincronizarRotuloControle({ host, internals, controle, rotulo, texto }: OpcoesRotuloControle): void {
  if (texto) {
    rotulo.textContent = texto;
    rotulo.style.display = 'inline';
    controle.setAttribute('aria-labelledby', rotulo.id);
    controle.removeAttribute('aria-label');
    return;
  }

  rotulo.style.display = 'none';
  controle.removeAttribute('aria-labelledby');
  const externo = obterRotuloExterno(host, internals);
  if (externo) controle.setAttribute('aria-label', externo);
  else controle.removeAttribute('aria-label');
}
