/**
 * Botão "Mais ferramentas" da <ui-paleta-ferramentas>: reúne o que não coube no espaço disponível.
 * Quando a ferramenta ativa está oculta, o botão assume o ícone dela e o estado "ativo" (não se perde
 * a referência visual de qual ferramenta está em uso).
 */
import type { FerramentaItem } from './tipos';
import { criarBotaoFerramenta, nomeAcessivel } from './ferramentas-comum';

export const ICONE_MAIS =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';

export const ROTULO_MAIS = 'Mais ferramentas';

/** Procura a ferramenta ativa dentro dos itens ocultos (inclusive filhos de grupos). */
export function acharAtivoOculto(excesso: FerramentaItem[], ativoId: string): FerramentaItem | undefined {
  if (!ativoId) return undefined;
  for (const item of excesso) {
    if (item.id === ativoId) return item;
    const filho = item.filhos?.find(f => f.id === ativoId);
    if (filho) return filho;
  }
  return undefined;
}

/** Ids dos itens de topo ocultos (sem separadores). */
export function idsOcultos(excesso: FerramentaItem[]): string[] {
  return excesso.filter(i => i.tipo !== 'separador').map(i => i.id);
}

export function criarBotaoMais(excesso: FerramentaItem[], ativoId: string, tamanhoIcone: number, rotulo: string = ROTULO_MAIS): HTMLButtonElement {
  const ativoOculto = acharAtivoOculto(excesso, ativoId);
  const habilitado = excesso.some(i => i.tipo !== 'separador' && !i.disabled);
  const btn = criarBotaoFerramenta(
    {
      id: '__mais',
      rotulo,
      rotuloAcessivel: ativoOculto ? `${rotulo}: ${nomeAcessivel(ativoOculto)} ativa` : rotulo,
      icone: ativoOculto?.icone ?? ICONE_MAIS,
      tipo: 'botao',
      disabled: !habilitado
    },
    'paleta',
    tamanhoIcone
  );
  btn.removeAttribute('data-id');
  btn.dataset.mais = '';
  btn.dataset.tooltip = ativoOculto ? `${rotulo} — ${nomeAcessivel(ativoOculto)}` : rotulo;
  btn.classList.add('ui-ferr-btn--mais', 'ui-ferr-btn--grupo');
  btn.classList.toggle('ui-ferr-btn--ativo', !!ativoOculto);
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');
  return btn;
}
