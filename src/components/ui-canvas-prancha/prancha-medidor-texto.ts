import { definirMedidorTexto, temMedidorTexto, type MedidorTexto } from '../../gerencigeo-canvas/prancha/elemento_geometria';

/*
 * Medidor de texto do componente: `measureText` de um canvas fora da tela (o núcleo é puro e não toca no DOM). A largura é
 * medida num corpo de 100 px e escalada para o corpo em mm (a largura do avanço é linear no corpo), com cache por fonte e
 * texto. Sem Canvas 2D (SSR, testes), o medidor devolve `null` e o núcleo usa a estimativa.
 */

const CORPO_REFERENCIA = 100;
const LIMITE_CACHE = 4000;

interface ContextoMedida {
  font: string;
  measureText(texto: string): { width: number };
}

export function criarMedidorCanvas(criarCanvas: () => { getContext(tipo: '2d'): unknown } | null): MedidorTexto {
  let ctx: ContextoMedida | null | undefined;
  const cache = new Map<string, number | null>();
  return (texto, fonte, tamanho) => {
    if (ctx === undefined) {
      try {
        const c = criarCanvas()?.getContext('2d') as ContextoMedida | null | undefined;
        ctx = c && typeof c.measureText === 'function' ? c : null;
      } catch {
        ctx = null;
      }
    }
    if (!ctx) return null;
    const chave = `${fonte}\u0000${texto}`;
    let largura = cache.get(chave);
    if (largura === undefined) {
      try {
        ctx.font = `${CORPO_REFERENCIA}px ${fonte}`;
        const w = ctx.measureText(texto).width;
        largura = Number.isFinite(w) && w >= 0 ? w / CORPO_REFERENCIA : null;
      } catch {
        largura = null;
      }
      if (cache.size >= LIMITE_CACHE) cache.clear();
      cache.set(chave, largura);
    }
    return largura === null ? null : largura * tamanho;
  };
}

/** Registra o medidor do navegador, uma vez por página (todas as pranchas compartilham). Devolve se registrou agora. */
export function garantirMedidorTexto(): boolean {
  if (temMedidorTexto() || typeof document === 'undefined') return false;
  const medidor = criarMedidorCanvas(() => document.createElement('canvas'));
  // só registra se o navegador mede de fato (happy-dom e SSR não têm Canvas 2D): a estimativa continua valendo
  if (medidor('M', 'sans-serif', 1) === null) return false;
  definirMedidorTexto(medidor);
  return true;
}
