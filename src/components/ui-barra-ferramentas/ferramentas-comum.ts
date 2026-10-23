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

  const temFilhos = !!item.filhos?.length;
  const mostrarRotulo = variante !== 'paleta' && !item.somenteIcone && !!item.rotulo;

  // Acessibilidade (M2): remove aria-label duplicado nos botões que já têm rótulo visível
  if (item.rotuloAcessivel) {
    btn.setAttribute('aria-label', item.rotuloAcessivel);
  } else if (!mostrarRotulo) {
    btn.setAttribute('aria-label', nomeAcessivel(item));
  } else {
    // Mantém fallback limpo quando não há rotulo visível renderizado
    btn.removeAttribute('aria-label');
  }

  if (item.atalho) btn.setAttribute('aria-keyshortcuts', item.atalho);

  // Guarda dados do tooltip estilizado (dispensa title nativo para evitar balão duplicado do browser)
  btn.dataset.tooltip = nomeAcessivel(item);
  if (item.atalho) btn.dataset.atalho = item.atalho;

  const icone = criarIcone(item.icone, tamanhoIcone);
  if (icone) {
    const span = document.createElement('span');
    span.className = 'ui-ferr-btn__icone';
    span.appendChild(icone);
    btn.appendChild(span);
  }

  if (variante !== 'paleta' && item.somenteIcone) btn.classList.add('ui-ferr-btn--so-icone');

  if (mostrarRotulo) {
    const rotulo = document.createElement('span');
    rotulo.className = 'ui-ferr-btn__rotulo';
    rotulo.textContent = item.rotulo!;
    btn.appendChild(rotulo);
  }

  if (temFilhos && !item.dividido) {
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

/** Cria um botão dividido (split button) com ação principal + seta dropdown separada. */
export function criarBotaoDividido(
  item: FerramentaItem,
  variante: VarianteBotaoFerramenta,
  tamanhoIcone: number
): HTMLElement {
  const container = document.createElement('div');
  container.className = `ui-ferr-split ui-ferr-split--${variante}`;
  container.dataset.id = item.id;

  const btnAcao = criarBotaoFerramenta({ ...item, filhos: undefined, dividido: false }, variante, tamanhoIcone);
  btnAcao.classList.add('ui-ferr-split__acao');
  btnAcao.dataset.split = 'acao';

  const btnGatilho = document.createElement('button');
  btnGatilho.type = 'button';
  btnGatilho.className = `ui-ferr-btn ui-ferr-split__gatilho ui-ferr-btn--${variante}`;
  btnGatilho.dataset.id = item.id;
  btnGatilho.dataset.split = 'gatilho';
  btnGatilho.tabIndex = -1;
  btnGatilho.disabled = !!item.disabled;
  btnGatilho.setAttribute('aria-haspopup', 'menu');
  btnGatilho.setAttribute('aria-expanded', 'false');
  btnGatilho.setAttribute('aria-label', `Opções de ${nomeAcessivel(item)}`);
  btnGatilho.dataset.tooltip = `Opções de ${nomeAcessivel(item)}`;

  const caret = document.createElement('span');
  caret.className = 'ui-ferr-btn__caret';
  btnGatilho.appendChild(caret);

  container.appendChild(btnAcao);
  container.appendChild(btnGatilho);
  return container;
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
   Atalhos de teclado (compostos e simples)
   ========================================== */

export function correspondeAtalho(e: KeyboardEvent, atalho: string | undefined): boolean {
  if (!atalho || !atalho.trim()) return false;
  const partes = atalho.split('+').map(p => p.trim());
  const chave = partes[partes.length - 1];

  const precisaCtrl = partes.some(p => /^(ctrl|control|cmd|meta)$/i.test(p));
  const precisaAlt = partes.some(p => /^alt$/i.test(p));
  const precisaShift = partes.some(p => /^shift$/i.test(p));

  const temCtrl = e.ctrlKey || e.metaKey;
  const temAlt = e.altKey;
  const temShift = e.shiftKey;

  if (precisaCtrl !== temCtrl) return false;
  if (precisaAlt !== temAlt) return false;
  if (precisaShift !== temShift) return false;

  const chaveNorm = chave.toLowerCase();
  const eKeyNorm = (e.key || '').toLowerCase();

  if (chaveNorm === 'esc' || chaveNorm === 'escape') return eKeyNorm === 'escape';
  if (chaveNorm === 'del' || chaveNorm === 'delete') return eKeyNorm === 'delete';
  if (chaveNorm === 'enter') return eKeyNorm === 'enter';
  if (chaveNorm === 'space' || chaveNorm === 'espaço') return eKeyNorm === ' ' || eKeyNorm === 'space';

  return eKeyNorm === chaveNorm;
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

/** Navegação em grade de 2 colunas para paletas verticais com colunas=2. */
export function navegarGrade2Colunas(
  e: KeyboardEvent,
  botoes: HTMLButtonElement[],
  rtl: boolean = false
): boolean {
  const habilitados = botoes.filter(b => !b.disabled);
  const total = habilitados.length;
  const atual = habilitados.findIndex(b => b === e.target);
  if (total === 0 || atual < 0) return false;

  let destino = atual;
  const col = atual % 2; // 0 = coluna esquerda, 1 = coluna direita

  if (e.key === 'ArrowRight') {
    if (rtl) {
      if (col === 1) destino = atual - 1;
    } else {
      if (col === 0 && atual + 1 < total) destino = atual + 1;
    }
  } else if (e.key === 'ArrowLeft') {
    if (rtl) {
      if (col === 0 && atual + 1 < total) destino = atual + 1;
    } else {
      if (col === 1) destino = atual - 1;
    }
  } else if (e.key === 'ArrowDown') {
    if (atual + 2 < total) destino = atual + 2;
    else if (atual + 1 < total && col === 0) destino = atual + 1;
  } else if (e.key === 'ArrowUp') {
    if (atual - 2 >= 0) destino = atual - 2;
    else if (atual - 1 >= 0 && col === 1) destino = atual - 1;
  } else if (e.key === 'Home') {
    destino = 0;
  } else if (e.key === 'End') {
    destino = total - 1;
  } else {
    return false;
  }

  e.preventDefault();
  botoes.forEach(b => (b.tabIndex = -1));
  habilitados[destino].tabIndex = 0;
  habilitados[destino].focus();
  return true;
}

/* ==========================================
   Gerenciador de Tooltip leve
   ========================================== */

let contadorTooltip = 0;

export class GerenciadorTooltip {
  private el: HTMLDivElement;
  private textoEl: HTMLSpanElement;
  private atalhoEl: HTMLElement;
  private timer: number | undefined;
  private alvoAtual: HTMLElement | null = null;
  private readonly id = `ui-ferr-tooltip-${++contadorTooltip}`;
  private listeners = new ListenerBag();

  constructor(private raiz: ShadowRoot, container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'ui-ferr-tooltip';
    this.el.id = this.id;
    this.el.setAttribute('role', 'tooltip');
    this.el.setAttribute('aria-hidden', 'true');

    this.textoEl = document.createElement('span');
    this.textoEl.className = 'ui-ferr-tooltip__texto';
    this.atalhoEl = document.createElement('kbd');
    this.atalhoEl.className = 'ui-ferr-tooltip__atalho';

    this.el.appendChild(this.textoEl);
    this.el.appendChild(this.atalhoEl);
    this.raiz.appendChild(this.el);

    this.listeners.add(container, 'pointerover', (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.ui-ferr-btn, .ui-ribbon__fixar, .ui-ribbon__lancador');
      if (btn && btn !== this.alvoAtual) {
        const texto = btn.dataset.tooltip || btn.getAttribute('aria-label') || '';
        const atalho = btn.dataset.atalho || btn.getAttribute('aria-keyshortcuts') || '';
        if (texto) this.agendar(btn, texto, atalho);
      }
    });

    this.listeners.add(container, 'pointerout', (e: Event) => {
      const pe = e as PointerEvent;
      const relacionado = pe.relatedTarget as Node | null;
      if (this.alvoAtual && (!relacionado || !this.alvoAtual.contains(relacionado))) {
        this.esconder();
      }
    });

    this.listeners.add(container, 'focusin', (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.ui-ferr-btn, .ui-ribbon__fixar, .ui-ribbon__lancador');
      if (btn) {
        const texto = btn.dataset.tooltip || btn.getAttribute('aria-label') || '';
        const atalho = btn.dataset.atalho || btn.getAttribute('aria-keyshortcuts') || '';
        if (texto) this.mostrar(btn, texto, atalho);
      }
    });

    this.listeners.add(container, 'focusout', () => this.esconder());
    this.listeners.add(container, 'pointerdown', () => this.esconder());
    this.listeners.add(container, 'click', () => this.esconder());
    this.listeners.add(window, 'scroll', () => this.esconder(), true);
    this.listeners.add(window, 'resize', () => this.esconder());
  }

  private agendar(btn: HTMLElement, texto: string, atalho?: string) {
    this.limparTimer();
    this.timer = window.setTimeout(() => this.mostrar(btn, texto, atalho), 140);
  }

  public mostrar(btn: HTMLElement, texto: string, atalho?: string) {
    this.limparTimer();
    if (!btn.isConnected || !texto) return;
    this.alvoAtual = btn;
    this.textoEl.textContent = texto;
    if (atalho) {
      this.atalhoEl.textContent = `(${atalho})`;
      this.atalhoEl.style.display = '';
    } else {
      this.atalhoEl.textContent = '';
      this.atalhoEl.style.display = 'none';
    }

    this.el.classList.add('ui-ferr-tooltip--visivel');
    this.el.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-describedby', this.id);

    const r = btn.getBoundingClientRect();
    const t = this.el.getBoundingClientRect();
    let top = r.bottom + 6;
    let left = r.left + (r.width - (t.width || 80)) / 2;

    if (top + (t.height || 24) > window.innerHeight - 6) {
      top = Math.max(6, r.top - (t.height || 24) - 6);
    }
    if (left < 6) left = 6;
    else if (left + (t.width || 80) > window.innerWidth - 6) {
      left = Math.max(6, window.innerWidth - (t.width || 80) - 6);
    }

    this.el.style.top = `${top}px`;
    this.el.style.left = `${left}px`;
  }

  public esconder() {
    this.limparTimer();
    if (this.alvoAtual) {
      this.alvoAtual.removeAttribute('aria-describedby');
      this.alvoAtual = null;
    }
    this.el.classList.remove('ui-ferr-tooltip--visivel');
    this.el.setAttribute('aria-hidden', 'true');
  }

  private limparTimer() {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  public destruir() {
    this.esconder();
    this.listeners.cleanup();
    this.el.remove();
  }
}

/* ==========================================
   Menu suspenso / flyout (com submenus)
   ========================================== */

export interface OpcoesMenu {
  lado?: 'baixo' | 'direita' | 'esquerda';
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
  let submenuAtivo: MenuHandle | null = null;

  const fecharSubmenu = () => {
    if (submenuAtivo) {
      submenuAtivo.fechar();
      submenuAtivo = null;
    }
  };

  const fechar = () => {
    if (fechado) return;
    fechado = true;
    fecharSubmenu();
    ancora.removeAttribute('aria-controls');
    listeners.cleanup();
    menu.remove();
    opcoes.onFechar?.();
  };

  const rtl = getComputedStyle(ancora).direction === 'rtl';

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

    // Suporte a submenu aninhado (filhos dentro de filhos)
    const temSubmenu = !!item.filhos?.length;
    if (temSubmenu) {
      b.classList.add('ui-ferr-menu__item--has-sub');
      b.setAttribute('aria-haspopup', 'menu');
      b.setAttribute('aria-expanded', 'false');

      const caretSub = document.createElement('span');
      caretSub.className = 'ui-ferr-menu__caret-sub';
      b.appendChild(caretSub);

      const abrirEsteSubmenu = (focarPrimeiro: boolean) => {
        if (submenuAtivo?.ancora === b) return;
        fecharSubmenu();
        b.setAttribute('aria-expanded', 'true');
        submenuAtivo = abrirMenu(raiz, b, item.filhos!, onEscolher, {
          lado: rtl ? 'esquerda' : 'direita',
          focar: focarPrimeiro,
          tipoPadrao: opcoes.tipoPadrao,
          onFechar: () => {
            b.setAttribute('aria-expanded', 'false');
            submenuAtivo = null;
          }
        });
      };

      b.addEventListener('pointerenter', () => abrirEsteSubmenu(false));
      b.addEventListener('click', e => {
        e.stopPropagation();
        abrirEsteSubmenu(true);
      });
    } else {
      b.addEventListener('pointerenter', fecharSubmenu);
      b.addEventListener('click', e => {
        e.stopPropagation();
        fechar();
        ancora.focus();
        onEscolher(item);
      });
    }

    botoes.push(b);
    menu.appendChild(b);
  });

  raiz.appendChild(menu);

  // Posicionamento (fixed → não é cortado por overflow do ribbon)
  const r = ancora.getBoundingClientRect();
  const m = menu.getBoundingClientRect();
  let top = lado === 'baixo' ? r.bottom + 2 : r.top;
  let left = lado === 'direita'
    ? r.right + 4
    : lado === 'esquerda'
      ? r.left - m.width - 4
      : rtl ? r.right - m.width : r.left;

  if (m.width && left + m.width > window.innerWidth - 4) left = Math.max(4, window.innerWidth - m.width - 4);
  if (left < 4) left = 4;
  if (m.height && top + m.height > window.innerHeight - 4) top = Math.max(4, window.innerHeight - m.height - 4);
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  const habilitados = () => botoes.filter(b => !b.disabled);

  listeners.add(menu, 'keydown', (e: KeyboardEvent) => {
    const lista = habilitados();
    const i = lista.findIndex(b => b === e.target);
    const teclaSubmenuAbrir = rtl ? 'ArrowLeft' : 'ArrowRight';
    const teclaSubmenuFechar = rtl ? 'ArrowRight' : 'ArrowLeft';

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      fechar();
      ancora.focus();
    } else if (e.key === 'Tab') {
      fechar();
    } else if (lista.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      fecharSubmenu();
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      lista[(i + passo + lista.length) % lista.length].focus();
    } else if (lista.length && e.key === teclaSubmenuAbrir) {
      const atualBtn = lista[i];
      if (atualBtn?.classList.contains('ui-ferr-menu__item--has-sub')) {
        e.preventDefault();
        atualBtn.click();
      }
    } else if (e.key === teclaSubmenuFechar && (lado === 'direita' || lado === 'esquerda')) {
      // Submenu sendo fechado com seta para a esquerda (ou direita em RTL)
      e.preventDefault();
      e.stopPropagation();
      fechar();
      ancora.focus();
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
    if (!caminho.includes(menu) && !caminho.includes(ancora) && !submenuAtivo?.elemento.contains(e.target as Node)) {
      fechar();
    }
  }, true);
  listeners.add(window, 'resize', fechar);
  listeners.add(window, 'scroll', (e: Event) => {
    if (e.target instanceof Node && menu.contains(e.target)) return;
    fechar();
  }, true);

  if (opcoes.focar) habilitados()[0]?.focus();

  return { elemento: menu, ancora, fechar, focarPrimeiro: () => habilitados()[0]?.focus() };
}

