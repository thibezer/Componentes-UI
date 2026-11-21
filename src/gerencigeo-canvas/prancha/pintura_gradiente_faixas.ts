import type { Par } from '../feature_types';
import type { GradienteElemento, ParadaGradiente } from './tipos';

/*
 * Gradiente linear em FAIXAS (L2, puro): num contexto sem `createLinearGradient` (o PDF vetorial), aproxima o gradiente
 * por N faixas de cor sólida recortadas pela forma. Opcional (`gradienteEmFaixas` em `desenharPlano`), desligado por padrão.
 * Aqui só a conta: as faixas no espaço da caixa unitária (o `quadro` do plano leva a caixa unitária para a folha, como no
 * gradiente nativo), cada uma com a cor interpolada no meio dela.
 */

export interface FaixaGradiente {
  /** Quadrilátero em coordenadas da caixa unitária (estende-se muito além dela: o recorte da forma o limita). */
  pontos: [Par, Par, Par, Par];
  /** `rgb(...)` da cor no meio da faixa, e a opacidade (0 a 1) da parada interpolada. */
  cor: string;
  opacidade: number;
}

export const FAIXAS_PADRAO = 24;
export const FAIXAS_MAXIMO = 256;

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function lerCor(cor: string): [number, number, number] | null {
  const t = cor.trim();
  const h = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(t);
  if (h) {
    let hex = h[1];
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  const r = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(t);
  return r ? [Number(r[1]), Number(r[2]), Number(r[3])] : null;
}

/** Cor e opacidade na posição `t` (0 a 1), interpolando entre as paradas; cor que não é hex/rgb usa a parada mais próxima. */
export function corNaPosicao(paradas: readonly ParadaGradiente[], t: number): { cor: string; opacidade: number } {
  const ps = paradas.filter((p) => p && fin(p.posicao)).map((p) => ({ ...p, posicao: Math.min(1, Math.max(0, p.posicao)) })).sort((a, b) => a.posicao - b.posicao);
  if (ps.length === 0) return { cor: '#000000', opacidade: 1 };
  const op = (p: ParadaGradiente): number => (fin(p.opacidade) ? Math.min(1, Math.max(0, p.opacidade)) : 1);
  if (t <= ps[0].posicao) return { cor: ps[0].cor, opacidade: op(ps[0]) };
  const ultimo = ps[ps.length - 1];
  if (t >= ultimo.posicao) return { cor: ultimo.cor, opacidade: op(ultimo) };
  for (let i = 0; i + 1 < ps.length; i++) {
    const a = ps[i], b = ps[i + 1];
    if (t < a.posicao || t > b.posicao) continue;
    const u = b.posicao > a.posicao ? (t - a.posicao) / (b.posicao - a.posicao) : 0;
    const ca = lerCor(a.cor), cb = lerCor(b.cor);
    const o = op(a) + (op(b) - op(a)) * u;
    if (!ca || !cb) return { cor: u < 0.5 ? a.cor : b.cor, opacidade: o };
    const m = (i0: number): number => Math.round(ca[i0] + (cb[i0] - ca[i0]) * u);
    return { cor: `rgb(${m(0)},${m(1)},${m(2)})`, opacidade: o };
  }
  return { cor: ultimo.cor, opacidade: op(ultimo) };
}

/**
 * Faixas de um gradiente LINEAR (radial devolve `null`: segue a cor sólida). `n` é limitado a 2…256 (padrão 24). `null`
 * se o gradiente é inválido (sem paradas, pontos não finitos ou `de == ate`).
 */
export function faixasDoGradienteLinear(def: GradienteElemento | null | undefined, n: number = FAIXAS_PADRAO): FaixaGradiente[] | null {
  if (!def || def.tipo !== 'linear' || !Array.isArray(def.paradas) || def.paradas.length === 0) return null;
  const [x0, y0] = def.de ?? [NaN, NaN], [x1, y1] = def.ate ?? [NaN, NaN];
  if (![x0, y0, x1, y1].every(fin)) return null;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (!(len > 1e-12)) return null;
  const k = fin(n) ? Math.min(FAIXAS_MAXIMO, Math.max(2, Math.round(n))) : FAIXAS_PADRAO;
  const px = -dy / len, py = dx / len; // perpendicular unitária
  const GRANDE = 1000;
  const faixas: FaixaGradiente[] = [];
  for (let i = 0; i < k; i++) {
    // as faixas das pontas se estendem para fora (antes de `de` e depois de `ate`), como o gradiente nativo (pad)
    const ta = i === 0 ? -GRANDE : i / k;
    const tb = i === k - 1 ? GRANDE : (i + 1) / k;
    const { cor, opacidade } = corNaPosicao(def.paradas, (i + 0.5) / k);
    const a: Par = [x0 + dx * ta, y0 + dy * ta];
    const b: Par = [x0 + dx * tb, y0 + dy * tb];
    faixas.push({
      pontos: [[a[0] + px * GRANDE, a[1] + py * GRANDE], [b[0] + px * GRANDE, b[1] + py * GRANDE], [b[0] - px * GRANDE, b[1] - py * GRANDE], [a[0] - px * GRANDE, a[1] - py * GRANDE]],
      cor, opacidade
    });
  }
  return faixas;
}
