import { ehCampoDeTexto, elementoFocadoReal, focoEmCampoDeTexto, focoEmControleAcionavel } from '../../core/alvo-digitavel';
import type { ListenerBag } from '../../core/listener-bag';
import type { ControladorPrancha } from './prancha-controlador';
import type { InteracaoPrancha } from './prancha-interacao';
import { ehFerramentaDeDesenho } from './prancha-ferramentas';
import {
  cicloSelecao, escalarSelecao, excluirAncorasSelecionadas, girarSelecao, moverAncorasSelecionadas, moverSelecao, removerSelecao,
  selecionarTudo
} from './prancha-comandos';
import { textoZoom } from './prancha-acessibilidade';
import * as org from './prancha-comandos-organizacao';
import { pathfinderSelecao } from './prancha-comandos-pathfinder';
import type { FerramentaPrancha } from './tipos';

/*
 * Atalhos de teclado (no estilo dos editores vetoriais). Valem com o foco dentro da prancha ou o ponteiro sobre ela, e
 * nunca quando o foco está num campo de texto (`alvo-digitavel.ts`). Toda ação aqui também existe na API pública.
 *
 *   V seleção · A seleção direta · H mão · M retângulo · L elipse · P caneta · \ linha · T texto
 *   Setas movem a seleção (ou as âncoras, na seleção direta) `passo-teclado` mm; Shift × 10
 *   Delete/Backspace exclui · Esc cancela/limpa · Enter conclui o desenho, cria a forma no centro ou edita as âncoras
 *   Ctrl+Z desfaz · Ctrl+Shift+Z / Ctrl+Y refaz · Ctrl+A seleciona tudo
 *   Ctrl+0 ajusta a folha · Ctrl+1 100% · Ctrl+= / Ctrl+- zoom · PageDown/PageUp percorre os elementos
 *   R / Shift+R gira 15° / −15° · Alt+= / Alt+- escala 110% / 90% · Espaço segurado = mão
 *   Fase 4: Ctrl+] / Ctrl+[ avança/recua · Ctrl+Shift+] / Ctrl+Shift+[ frente/trás · Ctrl+G / Ctrl+Shift+G agrupa/desagrupa
 *   Ctrl+2 / Ctrl+Alt+2 bloqueia/desbloqueia tudo · Ctrl+3 / Ctrl+Alt+3 oculta/mostra tudo · Ctrl+C / X / V copia, recorta,
 *   cola (Ctrl+Shift+V no lugar) · Ctrl+D transforma de novo · Ctrl+7 / Ctrl+Alt+7 cria/libera máscara · Ctrl+J une
 *   I conta-gotas · + / − adiciona/exclui âncora · Shift+C converte âncora · Esc sai do grupo isolado
 *   Fase 5 (Pathfinder): Ctrl+Alt+Shift+1 une · +2 subtrai (menos frente) · +3 interseção · +4 exclui
 */

/** Eventos de teclado que a prancha tratou (e consumiu): o hospedeiro pergunta com `eventoTratadoPelaPrancha`. */
const tratadosPelaPrancha = new WeakSet<Event>();

/**
 * A prancha tratou este `keydown`? Garantia: quando trata uma tecla, a prancha chama `preventDefault()` e
 * `stopPropagation()` e marca o evento; o atalho global do hospedeiro deve ignorar (`defaultPrevented` também vale).
 */
/** Esc já avisado (o mesmo `keydown` passa pelo viewport e pela janela: avisa uma vez só). */
const escEmitidos = new WeakSet<Event>();

export const eventoTratadoPelaPrancha = (e: Event): boolean => !!e && tratadosPelaPrancha.has(e);

export function marcarTratadoPelaPrancha(e: Event): void { tratadosPelaPrancha.add(e); }

export type ModoTecladoPrancha = 'local' | 'exclusivo' | 'isolado' | 'modal';

/** Valor do atributo `teclado`: desconhecido ou ausente = `local`. */
export const lerModoTeclado = (v: string | null | undefined): ModoTecladoPrancha =>
  (v === 'exclusivo' || v === 'isolado' || v === 'modal' ? v : 'local');

/**
 * Teclas que o isolamento NUNCA retém (atalhos do navegador/sistema): F5, F11, F12, Ctrl/Cmd+R, L, W, T, Ctrl/Cmd+Shift+I e J,
 * o zoom do navegador (Ctrl/Cmd com +, =, -, 0) e o Tab (foco). Conflito do zoom: a prancha usa Ctrl+=, Ctrl+- e Ctrl+0 no
 * canvas; quando ela trata a tecla o evento já vem com `defaultPrevented` e NÃO é reservado (a prancha vence dentro do
 * canvas); quando não trata (foco num campo, por exemplo), é o zoom do navegador e passa.
 */
export function teclaReservadaDoNavegador(e: KeyboardEvent): boolean {
  if (!e || typeof e !== 'object') return false;
  const k = typeof e.key === 'string' ? e.key : '';
  if (k === 'F5' || k === 'F11' || k === 'F12' || k === 'Tab') return true;
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl || e.altKey) return false;
  const kl = k.length === 1 ? k.toLowerCase() : k;
  if (e.shiftKey && (kl === 'i' || kl === 'j')) return true;
  if (kl === 'r' || kl === 'l' || kl === 'w' || kl === 't') return true;
  if ((kl === '+' || kl === '=' || kl === '-' || kl === '0') && !e.defaultPrevented) return true;
  return false;
}

const TIPOS_TECLA_ISOLADA = ['keydown', 'keyup', 'keypress'] as const;

function alvoPassaPor(e: Event, alvo: EventTarget): boolean {
  const caminho = typeof e.composedPath === 'function' ? e.composedPath() : [];
  if (caminho.includes(alvo)) return true;
  return caminho.length === 0 && typeof Node !== 'undefined' && alvo instanceof Node && e.target instanceof Node && alvo.contains(e.target);
}

function contemNoAtravesDeShadow(raiz: EventTarget, no: Node): boolean {
  if (typeof Node === 'undefined' || !(raiz instanceof Node)) return false;
  let atual: Node | null = no;
  while (atual) {
    if (atual === raiz) return true;
    atual = atual.parentNode ?? (typeof ShadowRoot !== 'undefined' && atual instanceof ShadowRoot ? atual.host : null);
  }
  return false;
}

function focoEmCampoForaDe(e: KeyboardEvent, alvo: EventTarget): boolean {
  if (focoEmCampoDeTexto(e)) return true;
  const focado = elementoFocadoReal();
  return !!focado && ehCampoDeTexto(focado) && !contemNoAtravesDeShadow(alvo, focado);
}

/**
 * Isolamento do teclado (`teclado="isolado"` e `teclado="modal"`): todo `keydown`/`keyup`/`keypress` que chega ao `alvo`
 * (o editor ou a prancha, ou seja, com o foco dentro dele) leva `stopPropagation()` na fase de BOLHA, então os ouvintes de
 * `window`/`document` do hospedeiro não o veem, tratado ou não. As teclas reservadas do navegador passam. Fora do alvo, no
 * modo `isolado` nada muda (no `modal`, `instalarTecladoModal` bloqueia na captura da janela). Os ouvintes vão no `ListenerBag`
 * (Regra #2).
 */
export function instalarIsolamentoDeTeclas(bag: ListenerBag, alvo: EventTarget, ativo: () => boolean): void {
  if (!bag || !alvo || typeof ativo !== 'function') return;
  for (const tipo of TIPOS_TECLA_ISOLADA) {
    bag.add<KeyboardEvent>(alvo, tipo, (e: KeyboardEvent) => { if (ativo() && !teclaReservadaDoNavegador(e)) e.stopPropagation(); });
  }
}

/**
 * Bloqueio modal (`teclado="modal"`): enquanto o componente está montado e ativo, todo `keydown`/`keyup`/`keypress` da página
 * cujo alvo não passe por `alvo` recebe `stopPropagation()` na fase de captura em `window`. Continuam passando as teclas
 * reservadas do navegador (`teclaReservadaDoNavegador`) e as teclas de campos de texto fora de `alvo` quando o foco está num
 * deles. Os ouvintes vão no `ListenerBag` (Regra #2) e respeitam SSR (Regra #1).
 */
export function instalarTecladoModal(bag: ListenerBag, alvo: EventTarget, ativo: () => boolean): void {
  if (typeof window === 'undefined' || !bag || !alvo || typeof ativo !== 'function') return;
  for (const tipo of TIPOS_TECLA_ISOLADA) {
    bag.add<KeyboardEvent>(window, tipo, (e: KeyboardEvent) => {
      if (!e || !ativo()) return;
      if (alvoPassaPor(e, alvo)) return;
      if (teclaReservadaDoNavegador(e)) return;
      if (focoEmCampoForaDe(e, alvo)) return;
      e.stopPropagation?.();
    }, { capture: true });
  }
}

const PATHFINDER_DO_DIGITO = { Digit1: 'uniao', Digit2: 'subtracao', Digit3: 'intersecao', Digit4: 'exclusao' } as const;

const FERRAMENTA_DA_TECLA: Record<string, FerramentaPrancha> = {
  v: 'selecao', a: 'selecao-direta', h: 'mao', m: 'retangulo', l: 'elipse', p: 'caneta', '\\': 'linha', t: 'texto'
};

export interface AcoesDeVista {
  ajustarFolha(): void;
  definirZoomPercentual(p: number): void;
}

/** Trata a tecla; devolve se consumiu (o chamador faz `preventDefault`). */
export function tratarTecla(c: ControladorPrancha, it: InteracaoPrancha, vista: AcoesDeVista, e: KeyboardEvent): boolean {
  if (e.defaultPrevented || focoEmCampoDeTexto(e)) return false;
  const k = e.key;
  const ctrl = e.ctrlKey || e.metaKey;
  const kl = k.length === 1 ? k.toLowerCase() : k;

  if (k === ' ' && !ctrl) {
    if (focoEmControleAcionavel(e)) return false;
    if (!it.espaco) { it.espaco = true; c.agendar(); }
    return true;
  }
  if (it.ferramentas.tecla(k)) return true;

  if (ctrl) {
    // Ctrl+Shift+I/J são as ferramentas do desenvolvedor do navegador (Ctrl+J é "unir" da prancha, sem Shift)
    if (e.shiftKey && !e.altKey && (kl === 'i' || kl === 'j')) return false;
    const codigo = e.code ?? '';
    if (e.altKey && e.shiftKey && codigo in PATHFINDER_DO_DIGITO) {
      return pathfinderSelecao(c, PATHFINDER_DO_DIGITO[codigo as keyof typeof PATHFINDER_DO_DIGITO]) || true;
    }
    if (codigo === 'BracketRight' || k === ']' || k === '}') return org.ordenarSelecao(c, e.shiftKey ? 'frente' : 'avancar') || true;
    if (codigo === 'BracketLeft' || k === '[' || k === '{') return org.ordenarSelecao(c, e.shiftKey ? 'tras' : 'recuar') || true;
    if (kl === 'g') return (e.shiftKey ? org.desagruparSelecao(c) : org.agruparSelecao(c)) || true;
    if (codigo === 'Digit2' || k === '2') return (e.altKey ? org.liberarTodos(c, 'bloqueado') : org.marcarSelecao(c, 'bloqueado')) || true;
    if (codigo === 'Digit3' || k === '3') return (e.altKey ? org.liberarTodos(c, 'oculto') : org.marcarSelecao(c, 'oculto')) || true;
    if (codigo === 'Digit7' || k === '7') return (e.altKey ? org.liberarMascaraDaSelecao(c) : org.criarMascaraDaSelecao(c)) || true;
    if (kl === 'c' && !e.shiftKey) return org.copiar(c) || true;
    if (kl === 'x') return org.recortar(c) || true;
    if (kl === 'v') return org.colar(c, e.shiftKey) || true;
    if (kl === 'd') return org.transformarDeNovo(c) || true;
    if (kl === 'j') return org.unirSelecao(c) || true;
    if (kl === 'z' && !e.shiftKey) { c.desfazer(); return true; }
    if ((kl === 'z' && e.shiftKey) || kl === 'y') { c.refazer(); return true; }
    if (kl === 'a') { selecionarTudo(c); return true; }
    if (k === '0') { vista.ajustarFolha(); return true; }
    if (k === '1') { vista.definirZoomPercentual(100); return true; }
    if (k === '=' || k === '+') { c.vista.zoomRelativo(1.25); c.emitirVista(); c.anunciar(textoZoom(c.vista.zoomPercentual)); return true; }
    if (k === '-') { c.vista.zoomRelativo(0.8); c.emitirVista(); c.anunciar(textoZoom(c.vista.zoomPercentual)); return true; }
    return false;
  }

  if (e.altKey && (k === '=' || k === '+')) return escalarSelecao(c, 1.1, 1.1, undefined, 'teclado') || true;
  if (e.altKey && k === '-') return escalarSelecao(c, 0.9, 0.9, undefined, 'teclado') || true;

  if (k.startsWith('Arrow')) {
    if (it.ocupado) return true;
    const passo = c.passoTeclado * (e.shiftKey ? 10 : 1);
    const dx = k === 'ArrowLeft' ? -passo : k === 'ArrowRight' ? passo : 0;
    const dy = k === 'ArrowUp' ? -passo : k === 'ArrowDown' ? passo : 0;
    if (c.ui.edicao && c.ui.edicao.ancoras.length > 0) moverAncorasSelecionadas(c, dx, dy, 'teclado-ancoras');
    else if (c.doc.selecao.length > 0) moverSelecao(c, dx, dy, 'teclado', 'teclado-mover');
    else return false;
    return true;
  }
  if (k === 'Delete' || k === 'Backspace') {
    if (c.ui.edicao && c.ui.edicao.ancoras.length > 0) excluirAncorasSelecionadas(c);
    else if (c.doc.selecao.length > 0) removerSelecao(c);
    else return false;
    return true;
  }
  if (k === 'Escape') {
    if (it.ocupado) { it.cancelar(); return true; }
    if (c.ui.edicao) { c.encerrarEdicao(); return true; }
    if (c.isolado) { c.isolar(null); return true; }
    if (c.doc.selecao.length > 0) { c.selecionar([]); return true; }
    // nada a cancelar: o hospedeiro (um modal, por exemplo) decide o que fazer com o Esc
    if (!escEmitidos.has(e)) { escEmitidos.add(e); c.emitir('prancha-esc-sem-efeito', {}); }
    return false;
  }
  if (k === 'Enter') {
    if (focoEmControleAcionavel(e)) return false;
    if (ehFerramentaDeDesenho(c.ferramenta)) return it.ferramentas.criarNoCentro() || true;
    if (c.doc.selecao.length === 1 && !c.ui.edicao) {
      c.definirFerramenta('selecao-direta');
      return c.iniciarEdicao(c.doc.selecao[0]) || true;
    }
    return false;
  }
  if (k === 'PageDown' || k === 'PageUp') return cicloSelecao(c, k === 'PageDown' ? 1 : -1) || true;
  if (kl === 'r' && !e.altKey) return girarSelecao(c, e.shiftKey ? -15 : 15, undefined, 'teclado') || true;
  const ferramentaDaTecla: FerramentaPrancha | null = !e.altKey
    ? (kl === 'i' && !e.shiftKey ? 'conta-gotas' : (k === '+' || k === '=') ? 'adicionar-ancora' : k === '-' ? 'excluir-ancora' : kl === 'c' && e.shiftKey ? 'converter-ancora' : null)
    : null;
  if (ferramentaDaTecla) {
    if (it.ocupado) it.cancelar();
    c.definirFerramenta(ferramentaDaTecla);
    return true;
  }
  if (!e.altKey && !e.shiftKey && FERRAMENTA_DA_TECLA[kl]) {
    if (it.ocupado) it.cancelar();
    c.definirFerramenta(FERRAMENTA_DA_TECLA[kl]);
    return true;
  }
  return false;
}

/** Soltar o espaço volta da mão temporária. */
export function soltarTecla(c: ControladorPrancha, it: InteracaoPrancha, e: KeyboardEvent): void {
  if (e.key === ' ' && it.espaco) {
    it.espaco = false;
    c.agendar();
  }
}

