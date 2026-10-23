/**
 * Construção do DOM do <ui-ribbon>: botões de aba e grupos de ferramentas.
 * Responsabilidade única: funções que montam elementos a partir dos dados (abas, grupos); não guardam estado,
 * não ouvem eventos e não conhecem o componente.
 */
import type { FerramentaItem, RibbonAba, RibbonGrupo } from './tipos';
import { criarIcone } from './ferramentas-comum';

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

export type CriarBotaoFerramenta = (item: FerramentaItem, variante: 'grande' | 'pequeno', tamanhoIcone: number) => HTMLElement;

export interface OpcoesGrupoRibbon {
  /** Sem espaço: o grupo vira um botão único com flyout (o clique é tratado por quem delega os cliques do painel). */
  colapsado?: boolean;
  /** Item `dividido` com `filhos`: ação principal + gatilho de menu (`criarBotaoDividido`). */
  criarDividido?: CriarBotaoFerramenta;
}

/** Ícone padrão do grupo colapsado sem `icone` próprio. */
const ICONE_GRUPO_COLAPSADO = '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
const ICONE_LANCADOR = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12h8V4M12 12l-7-7"/></svg>';

/** Rótulo acessível do lançador de diálogo do grupo. */
export const rotuloLancador = (grupo: RibbonGrupo): string => grupo.rotuloLancador || `Mais opções de ${grupo.rotulo || 'ferramentas'}`;

/** Botão único de um grupo colapsado: `data-grupo-colapsado` leva o id do grupo. */
function criarGrupoColapsado(grupo: RibbonGrupo, el: HTMLElement): HTMLElement {
  el.classList.add('ui-ribbon__grupo--colapsado');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ui-ferr-btn ui-ferr-btn--grande ui-ribbon__btn-colapsado';
  btn.dataset.grupoColapsado = grupo.id;
  btn.dataset.tooltip = grupo.rotulo;
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');

  const icone = criarIcone(grupo.icone, 24) || criarIcone(ICONE_GRUPO_COLAPSADO, 24);
  if (icone) {
    const span = document.createElement('span');
    span.className = 'ui-ferr-btn__icone';
    span.appendChild(icone);
    btn.appendChild(span);
  }
  const rotulo = document.createElement('span');
  rotulo.className = 'ui-ferr-btn__rotulo';
  rotulo.textContent = grupo.rotulo;
  btn.appendChild(rotulo);
  const caret = document.createElement('span');
  caret.className = 'ui-ferr-btn__caret';
  btn.appendChild(caret);

  el.appendChild(btn);
  return el;
}

export function criarGrupoRibbon(grupo: RibbonGrupo, criarBotao: CriarBotaoFerramenta, opcoes: OpcoesGrupoRibbon = {}): HTMLElement {
  const el = document.createElement('div');
  el.className = 'ui-ribbon__grupo';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', grupo.rotulo);
  el.dataset.id = grupo.id;
  if (opcoes.colapsado) return criarGrupoColapsado(grupo, el);

  const criarItem: CriarBotaoFerramenta = (item, variante, icone) =>
    item.dividido && item.filhos?.length && opcoes.criarDividido ? opcoes.criarDividido(item, variante, icone) : criarBotao(item, variante, icone);

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
      itens.appendChild(criarItem(item, 'grande', 24));
    } else {
      if (!coluna) {
        coluna = document.createElement('div');
        coluna.className = 'ui-ribbon__coluna';
      }
      coluna.appendChild(criarItem(item, 'pequeno', 16));
      if (++naColuna === MAX_BOTOES_POR_COLUNA) fecharColuna();
    }
  });
  fecharColuna();

  // grupo sem rótulo nem lançador não gera nó vazio (sem espaço fantasma embaixo)
  if (grupo.rotulo || grupo.lancadorDialogo) {
    const rotulo = document.createElement('div');
    rotulo.className = 'ui-ribbon__grupo-rotulo';
    if (grupo.rotulo) rotulo.textContent = grupo.rotulo;
    if (grupo.lancadorDialogo) {
      // `data-lancador` leva o id do grupo: o clique é tratado por quem delega os cliques do painel
      const lancador = document.createElement('button');
      lancador.type = 'button';
      lancador.className = 'ui-ribbon__lancador';
      lancador.dataset.lancador = grupo.id;
      const label = rotuloLancador(grupo);
      lancador.setAttribute('aria-label', label);
      lancador.dataset.tooltip = label;
      const icone = criarIcone(ICONE_LANCADOR, 10);
      if (icone) lancador.appendChild(icone);
      rotulo.appendChild(lancador);
    }
    el.appendChild(itens);
    el.appendChild(rotulo);
    return el;
  }

  el.appendChild(itens);
  return el;
}
