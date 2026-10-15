/* ====================================================
   UI Camadas - Arraste sobre controles (olho, cadeado, seleção)
   Clicar e arrastar sobre uma coluna de controles aplica
   a todos os controles percorridos o estado resultante do
   primeiro, em vez de reordenar a camada
   ==================================================== */

import { CamadasHostCompleto } from './camadas-host';
import { filtrarFeicoesPorBusca } from './camadas-selecao';

type TipoControle = 'olho' | 'cadeado' | 'selecao';

interface DefinicaoControle {
  tipo: TipoControle;
  /** Atributo que identifica o item controlado (valor = id) */
  atributo: string;
  entidade: 'camada' | 'feicao';
}

const DEFINICOES: DefinicaoControle[] = [
  { tipo: 'olho', atributo: 'data-layer-eye', entidade: 'camada' },
  { tipo: 'olho', atributo: 'data-feat-eye', entidade: 'feicao' },
  { tipo: 'cadeado', atributo: 'data-layer-lock', entidade: 'camada' },
  { tipo: 'cadeado', atributo: 'data-feat-lock', entidade: 'feicao' },
  { tipo: 'selecao', atributo: 'data-layer-target', entidade: 'camada' },
  { tipo: 'selecao', atributo: 'data-feat-target', entidade: 'feicao' }
];

const SELETOR_POR_TIPO: Record<TipoControle, string> = {
  olho: '[data-layer-eye], [data-feat-eye]',
  cadeado: '[data-layer-lock], [data-feat-lock]',
  selecao: '[data-layer-target], [data-feat-target]'
};

/** Distância mínima (px) antes de considerar que o gesto é um arraste e não um clique */
const LIMIAR_ARRASTE = 3;

function definicaoDe(el: Element): DefinicaoControle | null {
  return DEFINICOES.find((d) => el.hasAttribute(d.atributo)) ?? null;
}

/** Estado atual (ligado/desligado) do controle, lido do modelo e não do DOM */
function estadoDoControle(host: CamadasHostCompleto, el: Element): boolean | null {
  const def = definicaoDe(el);
  if (!def) return null;
  const id = el.getAttribute(def.atributo);
  if (!id) return null;

  if (def.tipo === 'olho') {
    const item =
      def.entidade === 'camada'
        ? host.camadas.find((l) => l.id === id)
        : host.feicoes.find((f) => f.id === id);
    return item ? item.visible !== false : null;
  }

  if (def.tipo === 'cadeado') {
    // Feição travada pela camada não pode ser alterada individualmente
    if (el.hasAttribute('data-locked-by-layer')) return null;
    const item =
      def.entidade === 'camada'
        ? host.camadas.find((l) => l.id === id)
        : host.feicoes.find((f) => f.id === id);
    return item ? item.locked === true : null;
  }

  if (def.entidade === 'feicao') return host.selectedFeatureIds.has(id);

  const feicoes = filtrarFeicoesPorBusca(
    host.feicoes.filter((f) => f.layerId === id),
    host.searchQuery
  );
  if (feicoes.length === 0) return null;
  return feicoes.every((f) => host.selectedFeatureIds.has(f.id));
}

function acionar(el: Element, acumular: boolean, intervalo = false): void {
  el.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: acumular,
      shiftKey: intervalo
    })
  );
}

export function conectarArrasteControles(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  (Object.keys(SELETOR_POR_TIPO) as TipoControle[]).forEach((tipo) => {
    shadow.querySelectorAll(SELETOR_POR_TIPO[tipo]).forEach((origem) => {
      origem.addEventListener('pointerdown', (e: Event) => iniciarGesto(host, shadow, tipo, origem, e as PointerEvent));
    });
  });
}

function iniciarGesto(
  host: CamadasHostCompleto,
  shadow: ShadowRoot,
  tipo: TipoControle,
  origem: Element,
  inicio: PointerEvent
): void {
  if (inicio.pointerType === 'mouse' && inicio.button !== 0) return;
  if (host.editingLayerId || host.editingFeatureId) return;
  if (estadoDoControle(host, origem) === null) return;

  const seletor = SELETOR_POR_TIPO[tipo];
  const acumularInicial = inicio.ctrlKey || inicio.metaKey;
  const intervaloInicial = inicio.shiftKey;
  let pintando = false;
  let estadoAlvo = false;
  let ultimoY = inicio.clientY;
  const visitados = new Set<Element>([origem]);

  // A linha é arrastável: sem isto o navegador iniciaria o arraste de reordenação
  const bloquearDragStart = (ev: Event) => {
    ev.preventDefault();
    ev.stopImmediatePropagation();
  };
  // Um clique que termina no mesmo controle depois de pintar seria um segundo toggle
  const engolirClique = (ev: Event) => {
    ev.stopPropagation();
    ev.preventDefault();
  };
  const bloquearSelecao = (ev: Event) => ev.preventDefault();

  const aplicar = (el: Element) => {
    if (visitados.has(el)) return;
    visitados.add(el);
    if (estadoDoControle(host, el) !== estadoAlvo) {
      // Seleção em arraste é sempre aditiva para não descartar o que já foi marcado
      acionar(el, tipo === 'selecao');
    }
  };

  const comecarPintura = () => {
    pintando = true;
    // Aplica o toggle na origem agora, com os modificadores originais, e propaga o resultado
    acionar(origem, acumularInicial, intervaloInicial);
    estadoAlvo = estadoDoControle(host, origem) === true;
    shadow.addEventListener('selectstart', bloquearSelecao);
    document.body.style.userSelect = 'none';
  };

  const onMove = (me: PointerEvent) => {
    if (!pintando) {
      if (Math.hypot(me.clientX - inicio.clientX, me.clientY - inicio.clientY) < LIMIAR_ARRASTE) return;
      const sob = (shadow.elementFromPoint(me.clientX, me.clientY) as HTMLElement | null)?.closest(seletor);
      // Só vira "pintura" ao alcançar outro controle do mesmo tipo
      if (!sob || sob === origem) return;
      comecarPintura();
    }
    me.preventDefault();

    // Percorre todos os controles entre a posição anterior e a atual (movimento rápido não pula linhas)
    const minY = Math.min(ultimoY, me.clientY);
    const maxY = Math.max(ultimoY, me.clientY);
    shadow.querySelectorAll(seletor).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height === 0) return;
      const centro = r.top + r.height / 2;
      if (centro >= minY && centro <= maxY) aplicar(el);
    });
    const sob = (shadow.elementFromPoint(me.clientX, me.clientY) as HTMLElement | null)?.closest(seletor);
    if (sob) aplicar(sob);
    ultimoY = me.clientY;
  };

  const encerrar = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', encerrar);
    window.removeEventListener('pointercancel', encerrar);
    window.removeEventListener('dragstart', bloquearDragStart, true);
    shadow.removeEventListener('selectstart', bloquearSelecao);
    if (pintando) {
      document.body.style.userSelect = '';
      // Remove o bloqueio do clique logo após o evento de clique (se houver) ser entregue
      window.addEventListener('click', engolirClique, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', engolirClique, true), 0);
    }
  };

  window.addEventListener('dragstart', bloquearDragStart, true);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', encerrar);
  window.addEventListener('pointercancel', encerrar);
}
