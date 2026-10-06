import { aplicarInertForaDoModal, removerInertForaDoModal } from './modal-acessibilidade';

/**
 * Pilha dos modais abertos, na ordem em que foram abertos.
 * Apenas o modal do topo fica interativo: o `inert` é recalculado a cada abertura/fechamento,
 * para que um segundo modal (irmão do primeiro no DOM) não herde o `inert` aplicado pelo anterior.
 */
const pilha: HTMLElement[] = [];
let elementosInertes = new Set<HTMLElement>();
let overflowAnterior = '';

function reaplicarInert(): void {
  removerInertForaDoModal(elementosInertes);
  const topo = pilha[pilha.length - 1];
  elementosInertes = topo ? aplicarInertForaDoModal(topo) : new Set();
}

export function empilharModal(modal: HTMLElement): void {
  const indice = pilha.indexOf(modal);
  if (indice >= 0) pilha.splice(indice, 1);

  if (pilha.length === 0) {
    overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  pilha.push(modal);
  reaplicarInert();
}

export function desempilharModal(modal: HTMLElement): void {
  const indice = pilha.indexOf(modal);
  if (indice < 0) return;

  pilha.splice(indice, 1);
  if (pilha.length === 0) {
    document.body.style.overflow = overflowAnterior;
  }
  reaplicarInert();
}

export function ehModalDoTopo(modal: HTMLElement): boolean {
  return pilha[pilha.length - 1] === modal;
}
