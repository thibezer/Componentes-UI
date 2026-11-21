import type { Feicao, Par } from '../feature_types';
import { buscarSnap, TOLERANCIA_SNAP_PX, type ResultadoSnap } from '../feature_snap';
import type { PontoPx, Projetor } from '../feature_caixa';
import { aplicar } from '../espaco/espaco_matriz';
import { feicaoDoElemento } from './elemento_consulta';
import { caixaOrientada, posicaoLocalDaAlca } from './elemento_transformacao';
import type { ElementoGrafico } from './tipos';

/*
 * Snap na folha (L2, puro). Reaproveita `buscarSnap` do mapa (vértice > meio > aresta, com o contorno do elemento como
 * feição) e acrescenta o que a prancha precisa: cantos e centro dos elementos (da caixa orientada), guias e grade.
 * Prioridade: vértice > canto > centro > meio > guia > aresta > grade (em cada nível, o mais perto dentro da tolerância).
 * A tolerância é em px de tela: a UI passa a escala da vista (px por mm).
 */

export type TipoSnapPrancha = 'vertice' | 'canto' | 'centro' | 'meio' | 'guia' | 'aresta' | 'grade';

export const PRIORIDADE_SNAP_PRANCHA: readonly TipoSnapPrancha[] = ['vertice', 'canto', 'centro', 'meio', 'guia', 'aresta', 'grade'];

/** Guia horizontal (`posicao` = y em mm) ou vertical (`posicao` = x em mm). */
export interface Guia {
  orientacao: 'horizontal' | 'vertical';
  posicao: number;
  id?: string;
}

export interface GradePrancha {
  /** Espaçamento em mm (> 0). */
  espacamento: number;
  /** Origem da grade em mm (padrão [0, 0]). */
  origem?: Par;
}

export interface OpcoesSnapPrancha {
  toleranciaPx?: number;
  vertice?: boolean;
  canto?: boolean;
  centro?: boolean;
  meio?: boolean;
  aresta?: boolean;
  guias?: readonly Guia[];
  grade?: GradePrancha | null;
}

export interface ResultadoSnapPrancha {
  tipo: TipoSnapPrancha;
  /** Ponto de snap na folha (mm). */
  coordenada: Par;
  distanciaPx: number;
  elementoId?: string;
  guia?: Guia;
}

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * Melhor ponto de snap para o cursor (mm). `escalaPxPorMm` é o zoom da vista; `excluir` tira elementos (os que estão
 * sendo arrastados) da busca. Ocultos nunca atraem. `null` se nada estiver dentro da tolerância.
 */
export function buscarSnapPrancha(
  cursor: Par,
  candidatos: readonly ElementoGrafico[],
  escalaPxPorMm: number,
  opcoes: OpcoesSnapPrancha = {},
  excluir: Iterable<string> = []
): ResultadoSnapPrancha | null {
  if (!fin(cursor?.[0]) || !fin(cursor?.[1]) || !fin(escalaPxPorMm) || escalaPxPorMm <= 0) return null;
  const tol = fin(opcoes.toleranciaPx) && opcoes.toleranciaPx >= 0 ? opcoes.toleranciaPx : TOLERANCIA_SNAP_PX;
  const fora = new Set(excluir);
  const k = escalaPxPorMm;
  const projetar: Projetor = (p) => ({ x: p[0] * k, y: p[1] * k });
  const cur: PontoPx = { x: cursor[0] * k, y: cursor[1] * k };
  const distPx = (p: Par): number => Math.hypot(p[0] * k - cur.x, p[1] * k - cur.y);

  const ativos = candidatos.filter((el) => el && !el.oculto && !fora.has(el.id));
  const feicoes: Feicao[] = [];
  for (const el of ativos) {
    const f = feicaoDoElemento(el);
    if (f) feicoes.push({ ...f, bloqueada: false });
  }

  const melhores = new Map<TipoSnapPrancha, ResultadoSnapPrancha>();
  const propor = (r: ResultadoSnapPrancha): void => {
    const atual = melhores.get(r.tipo);
    if (r.distanciaPx <= tol && (!atual || r.distanciaPx < atual.distanciaPx)) melhores.set(r.tipo, r);
  };
  const doNucleo = (r: ResultadoSnap | null): void => {
    if (r) propor({ tipo: r.tipo, coordenada: [r.coordenada[0], r.coordenada[1]], distanciaPx: r.distanciaPx, elementoId: r.feicaoId });
  };

  // o núcleo devolve só o de maior prioridade: uma busca por nível mantém a ordem da prancha
  if (opcoes.vertice !== false) doNucleo(buscarSnap(cur, feicoes, projetar, { toleranciaPx: tol, vertice: true, meio: false, aresta: false }));
  if (opcoes.meio !== false) doNucleo(buscarSnap(cur, feicoes, projetar, { toleranciaPx: tol, vertice: false, meio: true, aresta: false }));
  if (opcoes.aresta !== false) doNucleo(buscarSnap(cur, feicoes, projetar, { toleranciaPx: tol, vertice: false, meio: false, aresta: true }));

  if (opcoes.canto !== false || opcoes.centro !== false) {
    for (const el of ativos) {
      const c = caixaOrientada(el);
      if (!c) continue;
      if (opcoes.canto !== false) {
        for (const a of ['no', 'ne', 'se', 'so'] as const) {
          const p = aplicar(c.quadro, posicaoLocalDaAlca(c, a));
          propor({ tipo: 'canto', coordenada: p, distanciaPx: distPx(p), elementoId: el.id });
        }
      }
      if (opcoes.centro !== false) {
        const p = aplicar(c.quadro, posicaoLocalDaAlca(c, 'centro'));
        propor({ tipo: 'centro', coordenada: p, distanciaPx: distPx(p), elementoId: el.id });
      }
    }
  }

  for (const g of opcoes.guias ?? []) {
    if (!g || !fin(g.posicao)) continue;
    const p: Par = g.orientacao === 'horizontal' ? [cursor[0], g.posicao] : [g.posicao, cursor[1]];
    propor({ tipo: 'guia', coordenada: p, distanciaPx: distPx(p), guia: g });
  }

  const grade = opcoes.grade;
  if (grade && fin(grade.espacamento) && grade.espacamento > 0) {
    const o = grade.origem && fin(grade.origem[0]) && fin(grade.origem[1]) ? grade.origem : [0, 0];
    const e = grade.espacamento;
    const p: Par = [o[0] + Math.round((cursor[0] - o[0]) / e) * e, o[1] + Math.round((cursor[1] - o[1]) / e) * e];
    propor({ tipo: 'grade', coordenada: p, distanciaPx: distPx(p) });
  }

  for (const t of PRIORIDADE_SNAP_PRANCHA) {
    const r = melhores.get(t);
    if (r) return r;
  }
  return null;
}
