/**
 * Construção do DOM do <ui-ribbon>: botões de aba e grupos de ferramentas.
 * Responsabilidade única: funções que montam elementos a partir dos dados (abas, grupos); não guardam estado,
 * não ouvem eventos e não conhecem o componente.
 */
import type { FerramentaItem, RibbonAba, RibbonGrupo } from './tipos';

/** Botões pequenos consecutivos formam colunas de até 3 (padrão Office/CAD). */
export const MAX_BOTOES_POR_COLUNA = 3;

export interface OpcoesBotaoAba {
  aba: RibbonAba;
  ativa: boolean;
  /** `id` do botão (para `aria-labelledby` do painel). */
  idBotao: string;
  /** `id` do painel (para `aria-controls` da aba ativa). */
  idPainel: string;
}

export function criarBotaoAba({ aba, ativa, idBotao, idPainel }: OpcoesBotaoAba): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ui-ribbon__aba';
  btn.setAttribute('role', 'tab');
  btn.dataset.id = aba.id;
  btn.id = idBotao;
  if (ativa) btn.setAttribute('aria-controls', idPainel);
  btn.textContent = aba.rotulo;
  btn.tabIndex = ativa ? 0 : -1;
  btn.setAttribute('aria-selected', String(ativa));
  btn.classList.toggle('ui-ribbon__aba--ativa', ativa);
  btn.classList.toggle('ui-ribbon__aba--contextual', !!aba.contextual);
  return btn;
}

export type CriarBotaoFerramenta = (item: FerramentaItem, variante: 'grande' | 'pequeno', tamanhoIcone: number) => HTMLButtonElement;

export function criarGrupoRibbon(grupo: RibbonGrupo, criarBotao: CriarBotaoFerramenta): HTMLElement {
  const el = document.createElement('div');
  el.className = 'ui-ribbon__grupo';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', grupo.rotulo);
  el.dataset.id = grupo.id;

  const itens = document.createElement('div');
  itens.className = 'ui-ribbon__grupo-itens';

  let coluna: HTMLElement | null = null;
  let naColuna = 0;
  const fecharColuna = () => {
    if (coluna) itens.appendChild(coluna);
    coluna = null;
    naColuna = 0;
  };

  grupo.itens.forEach(item => {
    if (item.tipo === 'separador') {
      fecharColuna();
      const sep = document.createElement('div');
      sep.className = 'ui-ribbon__separador';
      sep.setAttribute('role', 'separator');
      itens.appendChild(sep);
    } else if (item.tamanho === 'grande') {
      fecharColuna();
      itens.appendChild(criarBotao(item, 'grande', 24));
    } else {
      if (!coluna) {
        coluna = document.createElement('div');
        coluna.className = 'ui-ribbon__coluna';
      }
      coluna.appendChild(criarBotao(item, 'pequeno', 16));
      if (++naColuna === MAX_BOTOES_POR_COLUNA) fecharColuna();
    }
  });
  fecharColuna();

  const rotulo = document.createElement('div');
  rotulo.className = 'ui-ribbon__grupo-rotulo';
  rotulo.textContent = grupo.rotulo;

  el.appendChild(itens);
  el.appendChild(rotulo);
  return el;
}
