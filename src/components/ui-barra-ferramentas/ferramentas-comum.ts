import '../ui-icone';
import { ListenerBag } from '../../core/listener-bag';
import { higienizarSvg } from '../../core/svg-seguro';
import type { FerramentaItem } from './tipos';

export type VarianteBotaoFerramenta = 'grande' | 'pequeno' | 'paleta';

/* ==========================================
   Ícones
   ========================================== */

export function criarIcone(icone: string | undefined, tamanho: number): HTMLElement | null {
  if (!icone) return null;
  const el = document.createElement('ui-icone');
  el.setAttribute('tamanho', String(tamanho));

  if (icone.trimStart().startsWith('<')) {
    const svg = higienizarSvg(icone);
    if (!svg) return null;
    el.appendChild(svg);
  } else {
    el.setAttribute('nome', icone);
  }
  return el;
}

/**
 * Nome acessível do item: `rotuloAcessivel` -> `rotulo` -> nome do ícone -> `id` (último recurso,
 * com aviso no console, pois o id costuma ser um identificador técnico).
 */
const avisados = new Set<string>();
export function nomeAcessivel(item: FerramentaItem): string {
  if (item.rotuloAcessivel) return item.rotuloAcessivel;
  if (item.rotulo) return item.rotulo;
  if (item.icone && !item.icone.trimStart().startsWith('<')) return item.icone;
  if (!avisados.has(item.id)) {
    avisados.add(item.id);
    console.warn(`[ui-barra-ferramentas] O item "${item.id}" não tem "rotulo" nem "rotuloAcessivel": o id será usado como nome acessível.`);
  }
  return item.id;
}

export function textoTooltip(item: FerramentaItem): string {
  const base = nomeAcessivel(item);
  return item.atalho ? `${base} (${item.atalho})` : base;
}

/** Avisa (console.warn) sobre ids repetidos. */
export function avisarIdsDuplicados(ids: string[], contexto: string): void {
  const vistos = new Set<string>();
  const dup = new Set<string>();
  ids.forEach(id => (vistos.has(id) ? dup.add(id) : vistos.add(id)));
  if (dup.size) {
    console.warn(`[ui-barra-ferramentas] ${contexto}: ids duplicados (${[...dup].join(', ')}). Use ids únicos, senão atualizarItem() e os eventos podem atingir o item errado.`);
  }
}

export function coletarIds(itens: FerramentaItem[], saida: string[] = []): string[] {
  for (const it of itens) {
    if (it.tipo === 'separador') continue;
    saida.push(it.id);
    if (it.filhos) coletarIds(it.filhos, saida);
  }
  return saida;
}

/* ==========================================
   Botão de ferramenta
   ========================================== */

export function aplicarEstadoBotao(btn: HTMLButtonElement, item: FerramentaItem): void {
  btn.disabled = !!item.disabled;
  const tipo = item.tipo;
  const selecionavel = tipo === 'toggle' || tipo === 'ferramenta';
  if (selecionavel) {
    btn.setAttribute('aria-pressed', String(!!item.ativo));
  } else {
    btn.removeAttribute('aria-pressed');
  }
  btn.classList.toggle('ui-ferr-btn--ativo', selecionavel && !!item.ativo);
}

export function criarBotaoFerramenta(
  item: FerramentaItem,
  variante: VarianteBotaoFerramenta,
  tamanhoIcone: number
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `ui-ferr-btn ui-ferr-btn--${variante}`;
  btn.dataset.id = item.id;
  btn.tabIndex = -1;
  btn.setAttribute('aria-label', nomeAcessivel(item));
  if (item.atalho) btn.setAttribute('aria-keyshortcuts', item.atalho);
  btn.title = textoTooltip(item);

  const icone = criarIcone(item.icone, tamanhoIcone);
  if (icone) {
    const span = document.createElement('span');
    span.className = 'ui-ferr-btn__icone';
    span.appendChild(icone);
    btn.appendChild(span);
  }

  const temFilhos = !!item.filhos?.length;
  const mostrarRotulo = variante !== 'paleta' && !item.somenteIcone && !!item.rotulo;
  if (variante !== 'paleta' && item.somenteIcone) btn.classList.add('ui-ferr-btn--so-icone');

  if (mostrarRotulo) {
    const rotulo = document.createElement('span');
    rotulo.className = 'ui-ferr-btn__rotulo';
    rotulo.textContent = item.rotulo!;
    btn.appendChild(rotulo);
  }

  if (temFilhos) {
    if (variante === 'paleta') {
      btn.classList.add('ui-ferr-btn--grupo');
    } else {
      const caret = document.createElement('span');
      caret.className = 'ui-ferr-btn__caret';
      btn.appendChild(caret);
    }
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
  }

  aplicarEstadoBotao(btn, item);
  return btn;
}

/* ==========================================
   Busca de itens
   ========================================== */

export function acharItem(itens: FerramentaItem[], id: string): FerramentaItem | undefined {
  for (const item of itens) {
    if (item.id === id) return item;
    if (item.filhos) {
      const achado = acharItem(item.filhos, id);
      if (achado) return achado;
    }
  }
  return undefined;
}

/* ==========================================
   Navegação por teclado (roving tabindex)
   ========================================== */

export function definirRoving(botoes: HTMLButtonElement[]): void {
  const habilitados = botoes.filter(b => !b.disabled);
  botoes.forEach(b => (b.tabIndex = -1));
  if (habilitados.length) habilitados[0].tabIndex = 0;
}

/** Garante um único botão com tabindex 0, preservando o atual se ainda estiver habilitado. */
export function atualizarRoving(botoes: HTMLButtonElement[]): void {
  const atual = botoes.find(b => b.tabIndex === 0 && !b.disabled);
  if (atual) {
    botoes.forEach(b => {
      if (b !== atual) b.tabIndex = -1;
    });
  } else {
    definirRoving(botoes);
  }
}

/** O roving tabindex acompanha o botão que recebeu foco (clique, Tab ou programático). */
export function seguirFoco(botoes: HTMLButtonElement[], alvo: EventTarget | null): void {
  const btn = botoes.find(b => b === alvo || b.contains(alvo as Node));
  if (!btn || btn.disabled) return;
  botoes.forEach(b => (b.tabIndex = b === btn ? 0 : -1));
}

/** Move o foco entre botões com as setas informadas. Retorna true se tratou a tecla. */
export function navegarRoving(
  e: KeyboardEvent,
  botoes: HTMLButtonElement[],
  teclasAnterior: string[],
  teclasProximo: string[]
): boolean {
  const habilitados = botoes.filter(b => !b.disabled);
  const total = habilitados.length;
  const atual = habilitados.findIndex(b => b === e.target);
  if (total === 0 || atual < 0) return false;

  let destino = atual;
  if (teclasAnterior.includes(e.key)) destino = (atual - 1 + total) % total;
  else if (teclasProximo.includes(e.key)) destino = (atual + 1) % total;
  else if (e.key === 'Home') destino = 0;
  else if (e.key === 'End') destino = total - 1;
  else return false;

  e.preventDefault();
  botoes.forEach(b => (b.tabIndex = -1));
  habilitados[destino].tabIndex = 0;
  habilitados[destino].focus();
  return true;
}

/* ==========================================
   Menu suspenso / flyout
   ========================================== */

export interface OpcoesMenu {
  lado?: 'baixo' | 'direita';
  /** Foca o primeiro item ao abrir (abertura por teclado). */
  focar?: boolean;
  /** Papel dos itens sem `tipo`: ribbon = botao (menuitem), paleta = ferramenta (menuitemradio). */
  tipoPadrao?: 'botao' | 'ferramenta';
  onFechar?: () => void;
}

export interface MenuHandle {
  elemento: HTMLElement;
  ancora: HTMLElement;
  fechar(): void;
  /** Move o foco para o primeiro item habilitado. */
  focarPrimeiro(): void;
}

let contadorMenu = 0;

export function abrirMenu(
  raiz: ShadowRoot,
  ancora: HTMLElement,
  itens: FerramentaItem[],
  onEscolher: (item: FerramentaItem) => void,
  opcoes: OpcoesMenu = {}
): MenuHandle {
  const lado = opcoes.lado ?? 'baixo';
  const listeners = new ListenerBag();
  const menu = document.createElement('div');
  menu.className = 'ui-ferr-menu';
  menu.setAttribute('role', 'menu');
  menu.id = `ui-ferr-menu-${++contadorMenu}`;
  menu.setAttribute('aria-label', ancora.getAttribute('aria-label') || 'Menu');
  ancora.setAttribute('aria-controls', menu.id);

  const botoes: HTMLButtonElement[] = [];
  let fechado = false;

  const fechar = () => {
    if (fechado) return;
    fechado = true;
    ancora.removeAttribute('aria-controls');
    listeners.cleanup();
    menu.remove();
    opcoes.onFechar?.();
  };

  itens.forEach(item => {
    if (item.tipo === 'separador') {
      const sep = document.createElement('div');
      sep.className = 'ui-ferr-menu__sep';
      sep.setAttribute('role', 'separator');
      menu.appendChild(sep);
      return;
    }

    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ui-ferr-menu__item';
    const tipoItem = item.tipo ?? opcoes.tipoPadrao ?? 'botao';
    if (tipoItem === 'toggle') {
      b.setAttribute('role', 'menuitemcheckbox');
      b.setAttribute('aria-checked', String(!!item.ativo));
    } else if (tipoItem === 'ferramenta') {
      b.setAttribute('role', 'menuitemradio');
      b.setAttribute('aria-checked', String(!!item.ativo));
    } else {
      b.setAttribute('role', 'menuitem');
    }
    b.dataset.id = item.id;
    b.disabled = !!item.disabled;
    if (item.atalho) b.setAttribute('aria-keyshortcuts', item.atalho);
    if (item.ativo) b.classList.add('ui-ferr-menu__item--ativo');

    const slotIcone = document.createElement('span');
    slotIcone.className = 'ui-ferr-menu__icone';
    const icone = criarIcone(item.icone, 14);
    if (icone) slotIcone.appendChild(icone);
    b.appendChild(slotIcone);

    const rotulo = document.createElement('span');
    rotulo.className = 'ui-ferr-menu__rotulo';
    rotulo.textContent = nomeAcessivel(item);
    b.appendChild(rotulo);

    if (item.atalho) {
      const atalho = document.createElement('span');
      atalho.className = 'ui-ferr-menu__atalho';
      atalho.textContent = item.atalho;
      b.appendChild(atalho);
    }

    b.addEventListener('click', e => {
      e.stopPropagation();
      fechar();
      ancora.focus();
      onEscolher(item);
    });

    botoes.push(b);
    menu.appendChild(b);
  });

  raiz.appendChild(menu);

  // Posicionamento (fixed → não é cortado por overflow do ribbon)
  const r = ancora.getBoundingClientRect();
  const rtl = getComputedStyle(ancora).direction === 'rtl';
  const m = menu.getBoundingClientRect();
  let top = lado === 'direita' ? r.top : r.bottom + 2;
  // RTL: o flyout lateral abre para a esquerda e o menu suspenso alinha à borda direita da âncora
  let left = lado === 'direita' ? (rtl ? r.left - m.width - 4 : r.right + 4) : rtl ? r.right - m.width : r.left;
  if (m.width && left + m.width > window.innerWidth - 4) left = Math.max(4, window.innerWidth - m.width - 4);
  if (left < 4) left = 4;
  if (m.height && top + m.height > window.innerHeight - 4) top = Math.max(4, window.innerHeight - m.height - 4);
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  const habilitados = () => botoes.filter(b => !b.disabled);

  listeners.add(menu, 'keydown', (e: KeyboardEvent) => {
    const lista = habilitados();
    const i = lista.findIndex(b => b === e.target);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      fechar();
      ancora.focus();
    } else if (e.key === 'Tab') {
      fechar();
    } else if (lista.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      lista[(i + passo + lista.length) % lista.length].focus();
    } else if (lista.length && e.key === 'Home') {
      e.preventDefault();
      lista[0].focus();
    } else if (lista.length && e.key === 'End') {
      e.preventDefault();
      lista[lista.length - 1].focus();
    }
  });

  listeners.add(document, 'pointerdown', (e: PointerEvent) => {
    const caminho = e.composedPath();
    if (!caminho.includes(menu) && !caminho.includes(ancora)) fechar();
  }, true);
  listeners.add(window, 'resize', fechar);
  // Rolagem de um ancestral desalinha o menu (position: fixed): fecha, exceto a rolagem do próprio menu
  listeners.add(window, 'scroll', (e: Event) => {
    if (e.target instanceof Node && menu.contains(e.target)) return;
    fechar();
  }, true);
  listeners.add(window, 'blur', fechar);

  if (opcoes.focar) habilitados()[0]?.focus();

  return { elemento: menu, ancora, fechar, focarPrimeiro: () => habilitados()[0]?.focus() };
}
