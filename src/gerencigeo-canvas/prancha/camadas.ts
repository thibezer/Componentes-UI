import type { CamadaPrancha, ElementoGrafico } from './tipos';

/*
 * Camadas da prancha (L2, puras): a camada é dado, não UI, então a mesma regra vale na tela, na exportação (PDF/SVG) e nas
 * consultas. A ordem da lista é a ordem de empilhamento (a primeira fica atrás); elementos sem camada ou com camada
 * desconhecida ficam por cima de todas, na ordem em que estão.
 */

export interface MapaCamadas {
  /** Posição da camada do elemento (as desconhecidas = depois da última). */
  indice(el: ElementoGrafico): number;
  /** O elemento aparece (ele e a camada visíveis). */
  visivel(el: ElementoGrafico): boolean;
  /** O elemento está travado (ele ou a camada bloqueados). */
  travado(el: ElementoGrafico): boolean;
  /** Opacidade da camada do elemento (1 sem camada). */
  opacidade(el: ElementoGrafico): number;
}

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export function mapaDeCamadas(camadas?: readonly CamadaPrancha[] | null): MapaCamadas {
  const lista = Array.isArray(camadas) ? camadas : [];
  const porId = new Map<string, { i: number; c: CamadaPrancha }>();
  lista.forEach((c, i) => { if (c && typeof c.id === 'string' && !porId.has(c.id)) porId.set(c.id, { i, c }); });
  const de = (el: ElementoGrafico) => (el && typeof el.camadaId === 'string' ? porId.get(el.camadaId) : undefined);
  return {
    indice: (el) => de(el)?.i ?? lista.length,
    visivel: (el) => !!el && !el.oculto && de(el)?.c.visivel !== false,
    travado: (el) => !!el && (!!el.bloqueado || de(el)?.c.bloqueada === true),
    opacidade: (el) => {
      const op = de(el)?.c.opacidade;
      return fin(op) ? Math.min(1, Math.max(0, op)) : 1;
    }
  };
}

/** Camadas limpas: ids de texto não vazios e únicos (fica a primeira), campos com tipo certo. */
export function normalizarCamadas(bruto: unknown): CamadaPrancha[] {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set<string>();
  const saida: CamadaPrancha[] = [];
  for (const b of bruto) {
    if (!b || typeof b !== 'object') continue;
    const r = b as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id.trim() : '';
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    const c: CamadaPrancha = { id };
    if (typeof r.nome === 'string') c.nome = r.nome;
    if (r.visivel === false) c.visivel = false;
    if (r.bloqueada === true) c.bloqueada = true;
    if (fin(r.opacidade)) c.opacidade = Math.min(1, Math.max(0, r.opacidade));
    saida.push(c);
  }
  return saida;
}
