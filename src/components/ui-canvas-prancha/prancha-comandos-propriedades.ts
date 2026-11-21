import { escala, rotacao, translacao, type Matriz2D } from '../../gerencigeo-canvas/espaco/espaco_matriz';
import { limitesNaFolha } from '../../gerencigeo-canvas/prancha/elemento_geometria';
import { transformarElemento, transformarElementos } from '../../gerencigeo-canvas/prancha/elemento_transformacao';
import {
  comPropriedade, ehPropriedadeDeGeometria, ehPropriedadePrancha, rotacaoEmGraus
} from '../../gerencigeo-canvas/prancha/propriedades';
import type { ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import type { ControladorPrancha } from './prancha-controlador';
import { definirRaiosCantosSelecao } from './prancha-comandos';

/*
 * Comandos dos painéis (Fase 6), sem DOM: `aplicarPropriedade` (o painel de propriedades) e `alterarElementos` (o painel
 * de camadas: ocultar, travar, renomear, mudar de camada). São ações do USUÁRIO: entram no histórico (rajadas no mesmo
 * campo viram um passo) e saem em `prancha-elemento-atualizado` com motivo `propriedades`.
 */

const numero = (v: unknown): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

function caixaDe(sel: readonly ElementoGrafico[]): { x: number; y: number; largura: number; altura: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of sel) {
    const l = limitesNaFolha(e);
    if (!l) continue;
    x0 = Math.min(x0, l.x); y0 = Math.min(y0, l.y); x1 = Math.max(x1, l.x + l.largura); y1 = Math.max(y1, l.y + l.altura);
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, largura: x1 - x0, altura: y1 - y0 } : null;
}

/** Elementos novos para um campo de geometria, ou `null` se o valor não serve. */
function comGeometria(sel: readonly ElementoGrafico[], id: string, n: number): ElementoGrafico[] | null {
  const caixa = caixaDe(sel);
  if (!caixa) return null;
  let m: Matriz2D | null = null;
  if (id === 'geometria.x') m = translacao(n - caixa.x, 0);
  else if (id === 'geometria.y') m = translacao(0, n - caixa.y);
  else if (id === 'geometria.largura' && n > 0 && caixa.largura > 0) m = escala(n / caixa.largura, 1, [caixa.x, caixa.y]);
  else if (id === 'geometria.altura' && n > 0 && caixa.altura > 0) m = escala(1, n / caixa.altura, [caixa.x, caixa.y]);
  else if (id === 'geometria.rotacao') {
    // cada elemento gira em torno do próprio centro até o ângulo pedido
    return sel.map((e) => {
      const l = limitesNaFolha(e);
      if (!l) return e;
      const delta = ((n - rotacaoEmGraus(e)) * Math.PI) / 180;
      return transformarElemento(e, rotacao(delta, [l.x + l.largura / 2, l.y + l.altura / 2]));
    });
  }
  return m ? transformarElementos(sel, m) : null;
}

/** Aplica um campo do painel de propriedades à seleção (id de `IDS_PROPRIEDADES_PRANCHA`). */
export function aplicarPropriedade(c: ControladorPrancha, id: string, valor: unknown): boolean {
  if (c.somenteLeitura) { c.recusar('propriedade', 'somente-leitura'); return false; }
  if (!ehPropriedadePrancha(id)) { c.recusar('propriedade', 'comando-desconhecido'); return false; }
  const todos = c.doc.elementosSelecionados();
  if (todos.length === 0) { c.recusar('propriedade', 'sem-selecao'); return false; }
  // bloquear/ocultar valem também para os travados (é como se destrava pelo painel); o resto, só para os editáveis
  const sel = id === 'elemento.bloqueado' || id === 'elemento.oculto' ? todos : todos.filter((e) => !c.mapa().travado(e));
  if (sel.length === 0) { c.recusar('propriedade', 'bloqueado'); return false; }

  if (id === 'geometria.raio') {
    const n = numero(valor);
    if (n === null || n < 0) { c.recusar('propriedade', 'geometria-invalida'); return false; }
    return definirRaiosCantosSelecao(c, n);
  }
  let novos: ElementoGrafico[] | null;
  if (ehPropriedadeDeGeometria(id)) {
    const n = numero(valor);
    novos = n === null ? null : comGeometria(sel, id, n);
  } else {
    const trocas = sel.map((e) => comPropriedade(e, id, valor));
    novos = trocas.every((e): e is ElementoGrafico => e !== null) ? trocas : null;
  }
  if (!novos) { c.recusar('propriedade', 'geometria-invalida'); return false; }
  c.aplicarSubstituicoes(novos, 'propriedades', `propriedade:${id}`);
  return true;
}

export interface MudancaElementosPrancha {
  nome?: string | null;
  oculto?: boolean;
  bloqueado?: boolean;
  /** Camada de destino (`null` = sem camada); precisa existir em `definirCamadas`. */
  camadaId?: string | null;
}

/** Muda estado e organização de elementos pelo id (o painel de camadas), inclusive travados. */
export function alterarElementos(c: ControladorPrancha, ids: readonly string[], m: MudancaElementosPrancha): boolean {
  if (c.somenteLeitura) { c.recusar('alterar', 'somente-leitura'); return false; }
  if (!m || typeof m !== 'object' || !Array.isArray(ids)) { c.recusar('alterar', 'geometria-invalida'); return false; }
  const alvos = ids.map((id) => (typeof id === 'string' ? c.doc.obter(id) : undefined)).filter((e): e is ElementoGrafico => !!e);
  if (alvos.length === 0) { c.recusar('alterar', 'id-invalido'); return false; }
  if (m.camadaId !== undefined && m.camadaId !== null && !c.camadas.some((k) => k.id === m.camadaId)) {
    c.recusar('alterar', 'id-invalido');
    return false;
  }
  const novos = alvos.map((e) => {
    const n: ElementoGrafico = { ...e };
    if (m.nome !== undefined) {
      if (typeof m.nome === 'string' && m.nome.trim() !== '') n.nome = m.nome;
      else delete n.nome;
    }
    for (const k of ['oculto', 'bloqueado'] as const) {
      if (typeof m[k] !== 'boolean') continue;
      if (m[k]) n[k] = true;
      else delete n[k];
    }
    if (m.camadaId !== undefined) {
      if (m.camadaId) n.camadaId = m.camadaId;
      else delete n.camadaId;
    }
    return n;
  });
  c.aplicarSubstituicoes(novos, 'propriedades');
  return true;
}
