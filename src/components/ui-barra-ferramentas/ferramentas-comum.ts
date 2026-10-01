import '../ui-icone';
import { ListenerBag } from '../../core/listener-bag';
import type { FerramentaItem } from './tipos';

export type VarianteBotaoFerramenta = 'grande' | 'pequeno' | 'paleta';

/* ==========================================
   Ícones
   ========================================== */

/** Remove script, foreignObject e atributos de evento (onclick etc.) ou javascript: de um trecho SVG. */
function sanitizarSvg(codigo: string): SVGElement | null {
  const modelo = document.createElement('template');
  modelo.innerHTML = codigo.trim();
  const svg = modelo.content.querySelector('svg');
  if (!svg) return null;

  svg.querySelectorAll('script, foreignObject').forEach(n => n.remove());
  [svg, ...Array.from(svg.querySelectorAll('*'))].forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (/^on/i.test(attr.name) || /^\s*javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return svg;
}

export function criarIcone(icone: string | undefined, tamanho: number): HTMLElement | null {
  if (!icone) return null;
  const el = document.createElement('ui-icone');
  el.setAttribute('tamanho', String(tamanho));

  if (icone.trimStart().startsWith('<')) {
    const svg = sanitizarSvg(icone);
    if (!svg) return null;
    el.appendChild(svg);
  } else {
    el.setAttribute('nome', icone);
  }
  return el;
}

export function textoTooltip(item: FerramentaItem): string {
  const base = item.rotulo || item.id;
  return item.atalho ? `${base} (${item.atalho})` : base;
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
  btn.setAttribute('aria-label', item.rotulo || item.id);
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
  onFechar?: () => void;
}

export interface MenuHandle {
  elemento: HTMLElement;
  ancora: HTMLElement;
  fechar(): void;
}

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

  const botoes: HTMLButtonElement[] = [];
  let fechado = false;

  const fechar = () => {
    if (fechado) return;
    fechado = true;
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
    b.setAttribute('role', 'menuitem');
    b.dataset.id = item.id;
    b.disabled = !!item.disabled;
    if (item.ativo) b.classList.add('ui-ferr-menu__item--ativo');

    const slotIcone = document.createElement('span');
    slotIcone.className = 'ui-ferr-menu__icone';
    const icone = criarIcone(item.icone, 14);
    if (icone) slotIcone.appendChild(icone);
    b.appendChild(slotIcone);

    const rotulo = document.createElement('span');
    rotulo.className = 'ui-ferr-menu__rotulo';
    rotulo.textContent = item.rotulo || item.id;
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
      onEscolher(item);
    });

    botoes.push(b);
    menu.appendChild(b);
  });

  raiz.appendChild(menu);

  // Posicionamento (fixed → não é cortado por overflow do ribbon)
  const r = ancora.getBoundingClientRect();
  let top = lado === 'direita' ? r.top : r.bottom + 2;
  let left = lado === 'direita' ? r.right + 4 : r.left;
  const m = menu.getBoundingClientRect();
  if (m.width && left + m.width > window.innerWidth - 4) left = Math.max(4, window.innerWidth - m.width - 4);
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
  listeners.add(window, 'blur', fechar);

  if (opcoes.focar) habilitados()[0]?.focus();

  return { elemento: menu, ancora, fechar };
}
