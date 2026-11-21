import type { Par } from '../../gerencigeo-canvas/feature_types';
import { escala, ehMatrizFinita, rotacao, translacao, type Matriz2D } from '../../gerencigeo-canvas/espaco/espaco_matriz';
import { centroDaSelecao, espelharElementos, transformarElementos } from '../../gerencigeo-canvas/prancha/elemento_transformacao';
import { excluirAncora, moverAncoras } from '../../gerencigeo-canvas/prancha/elemento_edicao';
import { normalizarElemento } from '../../gerencigeo-canvas/prancha/elemento_validacao';
import type { ElementoGrafico, RaiosCantos } from '../../gerencigeo-canvas/prancha/tipos';
import { definirRaiosDoRetangulo } from '../../gerencigeo-canvas/prancha/cantos_vivos';
import type { ControladorPrancha } from './prancha-controlador';
import type { MotivoAlteracaoPrancha } from './tipos';

/*
 * Comandos sobre a seleção (sem DOM). Servem ao teclado, à API pública e ao `ui-bus`: a mesma ação por qualquer caminho
 * (Regra #5). Cada um devolve se fez algo; recusas saem em `prancha-recusa`.
 */

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function editavel(c: ControladorPrancha, acao: string): ElementoGrafico[] | null {
  if (c.somenteLeitura) { c.recusar(acao, 'somente-leitura'); return null; }
  const sel = c.doc.elementosSelecionados().filter((e) => !e.bloqueado);
  if (sel.length === 0) { c.recusar(acao, 'sem-selecao'); return null; }
  return sel;
}

export function transformarSelecao(c: ControladorPrancha, m: Matriz2D, motivo: MotivoAlteracaoPrancha = 'comando', chave?: string): boolean {
  if (!ehMatrizFinita(m)) return false;
  const sel = editavel(c, 'transformar');
  if (!sel) return false;
  c.aplicarSubstituicoes(transformarElementos(sel, m), motivo, chave);
  return true;
}

export const moverSelecao = (c: ControladorPrancha, dx: number, dy: number, motivo: MotivoAlteracaoPrancha = 'comando', chave?: string): boolean =>
  fin(dx) && fin(dy) && transformarSelecao(c, translacao(dx, dy), motivo, chave);

/** Pivô das transformações: o definido pelo usuário ou o centro da seleção. */
export function pivoDaSelecao(c: ControladorPrancha): Par | null {
  return c.ui.pivo ?? centroDaSelecao(c.doc.elementosSelecionados());
}

export function girarSelecao(c: ControladorPrancha, graus: number, pivo?: Par, motivo: MotivoAlteracaoPrancha = 'comando'): boolean {
  const p = pivo ?? pivoDaSelecao(c);
  return fin(graus) && !!p && transformarSelecao(c, rotacao((graus * Math.PI) / 180, p), motivo);
}

export function escalarSelecao(c: ControladorPrancha, sx: number, sy: number = sx, pivo?: Par, motivo: MotivoAlteracaoPrancha = 'comando'): boolean {
  const p = pivo ?? pivoDaSelecao(c);
  if (!fin(sx) || !fin(sy) || sx === 0 || sy === 0 || !p) return false;
  return transformarSelecao(c, escala(sx, sy, p), motivo);
}

export function espelharSelecao(c: ControladorPrancha, direcao: 'horizontal' | 'vertical', motivo: MotivoAlteracaoPrancha = 'comando'): boolean {
  if (direcao !== 'horizontal' && direcao !== 'vertical') return false;
  const sel = editavel(c, 'espelhar');
  if (!sel) return false;
  c.aplicarSubstituicoes(espelharElementos(sel, direcao, pivoDaSelecao(c) ?? undefined), motivo);
  return true;
}

export function removerSelecao(c: ControladorPrancha, motivo: MotivoAlteracaoPrancha = 'remover'): boolean {
  const sel = editavel(c, 'remover');
  if (!sel) return false;
  const fora = new Set(sel.map((e) => e.id));
  c.aplicar(c.doc.elementos.filter((e) => !fora.has(e.id)), motivo);
  return true;
}

export function selecionarTudo(c: ControladorPrancha): boolean {
  return c.selecionar(c.doc.elementos.filter((e) => !e.bloqueado && !e.oculto).map((e) => e.id));
}

/** PageDown/PageUp: seleciona o próximo/anterior elemento selecionável (acesso por teclado sem ponteiro). */
export function cicloSelecao(c: ControladorPrancha, passo: 1 | -1): boolean {
  const lista = c.doc.elementos.filter((e) => !e.bloqueado && !e.oculto);
  if (lista.length === 0) return false;
  const atual = c.doc.selecao[c.doc.selecao.length - 1];
  const i = lista.findIndex((e) => e.id === atual);
  const prox = lista[(i < 0 ? (passo > 0 ? 0 : lista.length - 1) : (i + passo + lista.length) % lista.length)];
  return c.selecionar([prox.id]);
}

/**
 * Insere elementos novos criados pelo usuário (ferramenta, pré-definição, texto): ganham id provisório (`gerarId`) se
 * vierem sem, entram no topo, são selecionados e saem em `prancha-elemento-criado`.
 */
export function inserirNovos(c: ControladorPrancha, novos: readonly ElementoGrafico[], motivo: MotivoAlteracaoPrancha): ElementoGrafico[] {
  if (c.somenteLeitura) { c.recusar('criar', 'somente-leitura'); return []; }
  const aceitos: ElementoGrafico[] = [];
  for (const bruto of novos) {
    const tipo = bruto?.geometria?.tipo ?? 'elemento';
    const id = bruto?.id && !c.doc.obter(bruto.id) && !aceitos.some((a) => a.id === bruto.id) ? bruto.id : c.gerarId(tipo);
    // sem camada, o elemento novo entra na camada ativa
    const camada = !bruto?.camadaId && c.camadaAtiva ? { camadaId: c.camadaAtiva } : {};
    const el = normalizarElemento({ ...bruto, id, ...camada });
    if (el) aceitos.push(el);
    else c.recusar('criar', 'geometria-invalida');
  }
  if (aceitos.length === 0) return [];
  c.aplicar([...c.doc.elementos, ...aceitos], motivo);
  c.selecionar(aceitos.map((e) => e.id));
  c.anunciar(aceitos.length === 1 ? 'Elemento criado' : `${aceitos.length} elementos criados`);
  return aceitos;
}

/** Seleção direta: move as âncoras selecionadas do elemento em edição. */
export function moverAncorasSelecionadas(c: ControladorPrancha, dx: number, dy: number, chave?: string): boolean {
  const e = c.ui.edicao;
  const el = e ? c.doc.obter(e.id) : undefined;
  if (!e || !el || e.ancoras.length === 0) return false;
  const novo = moverAncoras(el, e.ancoras, dx, dy);
  if (!novo) { c.recusar('editar-ancoras', 'matriz-singular', el.id); return false; }
  c.aplicarSubstituicoes([novo], 'editar-ancoras', chave);
  return true;
}

/** Seleção direta: exclui as âncoras selecionadas (da última para a primeira); para no mínimo de âncoras. */
export function excluirAncorasSelecionadas(c: ControladorPrancha): boolean {
  const e = c.ui.edicao;
  let el = e ? c.doc.obter(e.id) : undefined;
  if (!e || !el || e.ancoras.length === 0) return false;
  let mudou = false;
  for (const i of [...e.ancoras].sort((a, b) => b - a)) {
    const novo = excluirAncora(el, i);
    if (!novo) { c.recusar('excluir-ancora', 'minimo-de-ancoras', el.id); break; }
    el = novo;
    mudou = true;
  }
  if (!mudou) return false;
  e.ancoras = [];
  c.aplicarSubstituicoes([el], 'editar-ancoras');
  return true;
}

/** Raios dos cantos dos retângulos selecionados (número = os quatro iguais). Outros tipos são ignorados. */
export function definirRaiosCantosSelecao(c: ControladorPrancha, raios: RaiosCantos | number): boolean {
  const sel = editavel(c, 'definir-raios');
  if (!sel) return false;
  const trocas = sel.map((e) => definirRaiosDoRetangulo(e, raios)).filter((e): e is ElementoGrafico => !!e);
  if (trocas.length === 0) { c.recusar('definir-raios', 'tipo-nao-suportado'); return false; }
  c.aplicarSubstituicoes(trocas, 'cantos');
  return true;
}
