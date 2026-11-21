import type { Par } from '../feature_types';
import {
  alternarSuavidade, comPontos, inserirPonto, minimoVertices, moverAlca, nosOuVertices, pontosDe, removerPonto, type QualAlca
} from '../feature_edicao_ops';
import { ESPACO_PLANO } from '../espaco/espaco_plano';
import { aplicar, inverter } from '../espaco/espaco_matriz';
import { contornoLocal, matrizDoElemento, type ContornoElemento } from './elemento_geometria';
import type { ElementoGrafico } from './tipos';

/*
 * Edição de âncoras e alças (seleção direta, tecla A) no espaço plano (L2, pura). Reaproveita as operações do editor de
 * vértices do mapa (`feature_edicao_ops.ts`) sobre o contorno LOCAL; as coordenadas de entrada e saída estão na folha e
 * passam pela inversa da matriz do elemento. Editar âncoras de uma forma paramétrica (retângulo, elipse, polígono, estrela,
 * linha) a converte em caminho, como num editor vetorial. Texto não tem âncoras. Toda função devolve um elemento NOVO ou
 * `null` quando a edição é recusada (índice inválido, abaixo do mínimo de vértices, matriz singular, texto, bloqueado).
 */

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const ehPar = (p: unknown): p is Par => Array.isArray(p) && fin(p[0]) && fin(p[1]);

function contornoEditavel(el: ElementoGrafico): ContornoElemento | null {
  if (!el || el.bloqueado || !el.geometria || el.geometria.tipo === 'texto') return null;
  return contornoLocal(el.geometria);
}

/** Converte a forma paramétrica em caminho com o mesmo desenho (a matriz e a aparência continuam). Texto: `null`. */
export function converterEmCaminho(el: ElementoGrafico): ElementoGrafico | null {
  if (!el?.geometria || el.geometria.tipo === 'texto') return null;
  if (el.geometria.tipo === 'caminho') return el;
  const c = contornoLocal(el.geometria);
  return c ? { ...el, geometria: { tipo: 'caminho', geometria: c } } : null;
}

const comContorno = (el: ElementoGrafico, c: ContornoElemento): ElementoGrafico => ({ ...el, geometria: { tipo: 'caminho', geometria: c } });

function paraLocal(el: ElementoGrafico, p: Par): Par | null {
  if (!ehPar(p)) return null;
  const inv = inverter(matrizDoElemento(el));
  return inv ? aplicar(inv, p) : null;
}

/** Âncoras editáveis na folha (os nós da curva ou os vértices). Vazio para texto, bloqueado ou degenerado. */
export function ancorasDoElemento(el: ElementoGrafico): Par[] {
  const c = contornoEditavel(el);
  if (!c) return [];
  const m = matrizDoElemento(el);
  return pontosDe(c, ESPACO_PLANO).map((p) => aplicar(m, p));
}

/** Alças Bézier de cada âncora na folha (`undefined` onde a âncora é de canto). */
export function alcasDoElemento(el: ElementoGrafico): Array<{ entrada?: Par; saida?: Par }> {
  const c = contornoEditavel(el);
  if (!c) return [];
  const m = matrizDoElemento(el);
  return (nosOuVertices(c) ?? []).map((n) => ({
    ...(n.entrada ? { entrada: aplicar(m, n.entrada) } : {}),
    ...(n.saida ? { saida: aplicar(m, n.saida) } : {})
  }));
}

/** Move a âncora `indice` para `destino` (folha); as alças acompanham. */
export function moverAncora(el: ElementoGrafico, indice: number, destino: Par): ElementoGrafico | null {
  const c = contornoEditavel(el);
  const q = c ? paraLocal(el, destino) : null;
  if (!c || !q) return null;
  const pts = pontosDe(c, ESPACO_PLANO).slice();
  if (!Number.isInteger(indice) || indice < 0 || indice >= pts.length) return null;
  pts[indice] = q;
  return comContorno(el, comPontos(c, pts, ESPACO_PLANO) as ContornoElemento);
}

/** Move várias âncoras pelo mesmo deslocamento (folha), mantendo o desenho entre elas. */
export function moverAncoras(el: ElementoGrafico, indices: readonly number[], dx: number, dy: number): ElementoGrafico | null {
  const c = contornoEditavel(el);
  const m = matrizDoElemento(el);
  const inv = inverter(m);
  if (!c || !inv || !fin(dx) || !fin(dy)) return null;
  const pts = pontosDe(c, ESPACO_PLANO).slice();
  const validos = indices.filter((i) => Number.isInteger(i) && i >= 0 && i < pts.length);
  if (validos.length === 0) return null;
  for (const i of new Set(validos)) {
    const f = aplicar(m, pts[i]);
    pts[i] = aplicar(inv, [f[0] + dx, f[1] + dy]);
  }
  return comContorno(el, comPontos(c, pts, ESPACO_PLANO) as ContornoElemento);
}

/** Adiciona uma âncora depois de `depoisDe`, no ponto do trecho mais perto de `coord` (folha), sem mudar o desenho. */
export function adicionarAncora(el: ElementoGrafico, depoisDe: number, coord: Par): ElementoGrafico | null {
  const c = contornoEditavel(el);
  const q = c ? paraLocal(el, coord) : null;
  if (!c || !q) return null;
  const n = pontosDe(c, ESPACO_PLANO).length;
  if (!Number.isInteger(depoisDe) || depoisDe < 0 || depoisDe >= n || (c.tipo === 'LineString' && depoisDe >= n - 1)) return null;
  return comContorno(el, inserirPonto(c, depoisDe, q) as ContornoElemento);
}

/** Exclui a âncora; `null` abaixo do mínimo (3 no fechado, 2 no aberto). */
export function excluirAncora(el: ElementoGrafico, indice: number): ElementoGrafico | null {
  const c = contornoEditavel(el);
  if (!c || !Number.isInteger(indice)) return null;
  if (pontosDe(c, ESPACO_PLANO).length <= minimoVertices(c)) return null;
  const novo = removerPonto(c, indice);
  return novo ? comContorno(el, novo as ContornoElemento) : null;
}

/** Converte a âncora canto ↔ suave (alças Catmull-Rom ao suavizar). */
export function converterAncora(el: ElementoGrafico, indice: number): ElementoGrafico | null {
  const c = contornoEditavel(el);
  const n = c ? pontosDe(c, ESPACO_PLANO).length : 0;
  if (!c || !Number.isInteger(indice) || indice < 0 || indice >= n) return null;
  const novo = alternarSuavidade(c, indice);
  return novo === c ? null : comContorno(el, novo as ContornoElemento);
}

/** Move uma alça (folha). Com `simetrica` (padrão) a oposta espelha; sem ela (Alt), as duas ficam independentes. */
export function moverAlcaDaAncora(el: ElementoGrafico, indice: number, qual: QualAlca, destino: Par, simetrica = true): ElementoGrafico | null {
  const c = contornoEditavel(el);
  const q = c ? paraLocal(el, destino) : null;
  const n = c ? pontosDe(c, ESPACO_PLANO).length : 0;
  if (!c || !q || (qual !== 'entrada' && qual !== 'saida') || !Number.isInteger(indice) || indice < 0 || indice >= n) return null;
  return comContorno(el, moverAlca(c, indice, qual, q, simetrica) as ContornoElemento);
}
