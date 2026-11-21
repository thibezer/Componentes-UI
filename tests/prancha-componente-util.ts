import '../src/components/ui-canvas-prancha';
import type { UICanvasPrancha } from '../src/components/ui-canvas-prancha';
import type { Par } from '../src/gerencigeo-canvas/feature_types';
import type { ContextoPrancha2D } from '../src/gerencigeo-canvas/prancha/pintura_canvas';
import { ContextoGravador } from './prancha-contextos';

/* Utilitários dos testes do <ui-canvas-prancha> (happy-dom, sem Canvas 2D real). */

export interface Montagem {
  el: UICanvasPrancha;
  viewport: HTMLElement;
  ctx: Map<string, ContextoGravador>;
  eventos: Array<[string, unknown]>;
  ev: (nome: string) => unknown[];
  tela: (p: Par) => Par;
  ponteiro: (tipo: string, p: Par, extra?: PointerEventInit) => void;
  arrastar: (de: Par, ate: Par, extra?: PointerEventInit, passos?: number) => void;
  clicar: (p: Par, extra?: PointerEventInit) => void;
  tecla: (key: string, extra?: KeyboardEventInit) => KeyboardEvent;
}

const NOMES = [
  'prancha-elemento-criado', 'prancha-elemento-atualizado', 'prancha-elemento-removido', 'prancha-selecao', 'prancha-ferramenta',
  'prancha-edicao-iniciada', 'prancha-edicao-concluida', 'prancha-recusa', 'prancha-vista', 'prancha-historico', 'prancha-guias',
  'prancha-texto-solicitado', 'prancha-ordem', 'prancha-camadas', 'prancha-isolamento', 'prancha-conta-gotas'
];

function definirTamanho(alvo: Element, w: number, h: number): void {
  Object.defineProperty(alvo, 'clientWidth', { configurable: true, value: w });
  Object.defineProperty(alvo, 'clientHeight', { configurable: true, value: h });
}

/** Cria a prancha 800×600 com contextos gravadores e já conectada; atributos opcionais. */
export function montar(atributos: Record<string, string> = {}, fabrica?: (papel: string) => ContextoPrancha2D | null): Montagem {
  const el = document.createElement('ui-canvas-prancha') as UICanvasPrancha;
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  const shadow = el.shadowRoot!;
  const viewport = shadow.getElementById('viewport')!;
  definirTamanho(viewport, 800, 600);
  definirTamanho(shadow.getElementById('regua-h')!, 800, 20);
  definirTamanho(shadow.getElementById('regua-v')!, 20, 600);
  const ctx = new Map<string, ContextoGravador>();
  el.fabricaContexto = (_canvas, papel) => {
    if (fabrica) return fabrica(papel);
    const g = new ContextoGravador();
    ctx.set(papel, g);
    return g;
  };
  const eventos: Array<[string, unknown]> = [];
  for (const n of NOMES) el.addEventListener(n, (e) => eventos.push([n, (e as CustomEvent).detail]));
  document.body.appendChild(el);
  el.renderizarAgora();
  const tela = (p: Par): Par => el.paraTela(p);
  const ponteiro = (tipo: string, p: Par, extra: PointerEventInit = {}) => {
    const [x, y] = tela(p);
    viewport.dispatchEvent(new PointerEvent(tipo, { clientX: x, clientY: y, button: 0, pointerId: 1, bubbles: true, composed: true, ...extra }));
  };
  const arrastar = (de: Par, ate: Par, extra: PointerEventInit = {}, passos = 4) => {
    ponteiro('pointerdown', de, extra);
    for (let i = 1; i <= passos; i++) ponteiro('pointermove', [de[0] + ((ate[0] - de[0]) * i) / passos, de[1] + ((ate[1] - de[1]) * i) / passos], extra);
    ponteiro('pointerup', ate, extra);
  };
  const clicar = (p: Par, extra: PointerEventInit = {}) => {
    ponteiro('pointerdown', p, extra);
    ponteiro('pointerup', p, extra);
  };
  const tecla = (key: string, extra: KeyboardEventInit = {}) => {
    viewport.focus();
    const e = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...extra });
    viewport.dispatchEvent(e);
    return e;
  };
  return { el, viewport, ctx, eventos, ev: (n) => eventos.filter(([x]) => x === n).map(([, d]) => d), tela, ponteiro, arrastar, clicar, tecla };
}
