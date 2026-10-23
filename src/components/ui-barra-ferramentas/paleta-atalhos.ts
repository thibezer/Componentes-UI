/**
 * Atalhos de teclado da <ui-paleta-ferramentas> (uma tecla ou combinação, como `Ctrl+Z`, ativa uma ferramenta).
 * Responsabilidade única: decidir se uma tecla deve ser tratada (e não sequestrar a digitação) e qual ferramenta
 * ela ativa. Funções puras sobre o evento e os dados; sem estado nem efeitos.
 */
import type { FerramentaItem } from './tipos';
import { correspondeAtalho, type TeclaAtalho } from './ferramentas-comum';

/**
 * Várias paletas com `atalhos` na mesma página: só a "dona" responde, a que contém o foco ou, sem foco em nenhuma, a
 * primeira na ordem do DOM. `temFoco` diz se uma paleta contém o foco.
 */
export function paletaDonaDosAtalhos<T>(paletas: T[], temFoco: (p: T) => boolean): T | undefined {
  return paletas.find(temFoco) ?? paletas[0];
}

/** Papéis ARIA de campos de entrada customizados: o atalho nunca é capturado dentro deles. */
const PAPEIS_DE_ENTRADA = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton']);

/**
 * `true` se o foco está num campo de digitação (nativo, editável ou customizado) ou dentro de um diálogo modal;
 * nesses lugares as letras pertencem ao usuário/ao diálogo.
 */
export function atalhoBloqueadoPeloContexto(caminho: EventTarget[]): boolean {
  const origem = caminho[0] as HTMLElement | undefined;
  if (origem && (/^(INPUT|TEXTAREA|SELECT)$/.test(origem.tagName) || origem.isContentEditable)) return true;
  return caminho.some((alvo) => {
    const el = alvo as HTMLElement;
    const papel = el.getAttribute?.('role');
    return el.getAttribute?.('aria-modal') === 'true' || (!!papel && PAPEIS_DE_ENTRADA.has(papel));
  });
}

export interface AtalhoResolvido {
  alvo: FerramentaItem;
  /** Grupo que contém o alvo, se houver. */
  pai?: FerramentaItem;
}

/**
 * Ferramenta ativada pela tecla. `tecla` é o evento de teclado (atalhos compostos: `Ctrl+Z`, `Shift+V`, `Esc`, via
 * `correspondeAtalho`) ou só o `key` (uma tecla sem modificadores). Sem diferenciar caixa. Com várias candidatas,
 * alterna entre elas a partir da ativa. `todas` é a lista plana (grupos expandidos); `grupos` serve para achar o pai.
 */
export function resolverAtalho(
  tecla: string | TeclaAtalho,
  todas: FerramentaItem[],
  grupos: FerramentaItem[],
  idAtivo: string
): AtalhoResolvido | null {
  const evento: TeclaAtalho = typeof tecla === 'string'
    ? { key: tecla, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }
    : tecla;
  if (!evento || !evento.key) return null;

  const candidatos = todas.filter((f) => !f.disabled && correspondeAtalho(evento, f.atalho));
  if (candidatos.length === 0) return null;

  let alvo = candidatos[0];
  if (candidatos.length > 1) {
    const i = candidatos.findIndex((c) => c.id === idAtivo);
    alvo = candidatos[(i + 1) % candidatos.length];
  }
  const pai = grupos.find((g) => g.filhos?.some((f) => f.id === alvo.id));
  return { alvo, pai };
}
