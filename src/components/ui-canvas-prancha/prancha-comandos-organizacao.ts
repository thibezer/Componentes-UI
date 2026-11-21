import type { Par } from '../../gerencigeo-canvas/feature_types';
import { compor, ehMatrizFinita, translacao, type Matriz2D } from '../../gerencigeo-canvas/espaco/espaco_matriz';
import { transformarElementos } from '../../gerencigeo-canvas/prancha/elemento_transformacao';
import { converterEmCaminho } from '../../gerencigeo-canvas/prancha/elemento_edicao';
import {
  agrupar, alinhar, aplicarAparencia, desagrupar, distribuir, duplicarElementos, reordenar, type Alinhamento, type OperacaoOrdem,
  type ReferenciaAlinhamento
} from '../../gerencigeo-canvas/prancha/organizacao';
import {
  contornoDoTraco, criarMascara, deslocarCaminho, dividirComLinha, liberarMascara, simplificarCaminho, unirCaminhos,
  type ResultadoOperacao
} from '../../gerencigeo-canvas/prancha/operacoes_caminho';
import { ordenarPorEmpilhamento } from '../../gerencigeo-canvas/prancha/elemento_consulta';
import type { AparenciaElemento, CaixaMm, ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import type { ControladorPrancha } from './prancha-controlador';
import { inserirNovos, transformarSelecao } from './prancha-comandos';
import type { MotivoAlteracaoPrancha } from './tipos';

/*
 * Comandos de organização e operações (Fase 4), sem DOM: ordem, grupos, isolamento, bloquear/ocultar, alinhar e
 * distribuir, duplicar e "transformar de novo", área de transferência, conta-gotas, máscara de recorte, camadas e as
 * operações de caminho. Servem ao teclado, à API e ao `ui-bus`. Cada um devolve se fez algo; recusas em `prancha-recusa`.
 */

/** Deslocamento padrão de duplicar e colar (mm). */
export const DESLOCAMENTO_COPIA_MM = 5;

/** Área de transferência compartilhada entre as pranchas da página (cópias profundas, na ordem de empilhamento). */
const area: { elementos: ElementoGrafico[]; colagens: number } = { elementos: [], colagens: 0 };

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Seleção que pode ser editada (sem travados), ou `null` com a recusa já emitida. */
export function selecaoEditavel(c: ControladorPrancha, acao: string, minimo = 1): ElementoGrafico[] | null {
  if (c.somenteLeitura) { c.recusar(acao, 'somente-leitura'); return null; }
  const sel = c.doc.elementosSelecionados().filter((e) => !c.mapa().travado(e));
  if (sel.length < minimo) { c.recusar(acao, 'sem-selecao'); return null; }
  return sel;
}

function aplicarResultado<T>(c: ControladorPrancha, acao: string, r: ResultadoOperacao<T>): T | null {
  if ('ok' in r) return r.ok;
  c.recusar(acao, r.motivo === 'texto' ? 'texto-sem-ancoras' : r.motivo === 'tipos-incompativeis' || r.motivo === 'sem-forma-fechada' ? 'tipo-nao-suportado' : 'geometria-invalida');
  return null;
}

// ---------- ordem e grupos ----------

export function ordenarSelecao(c: ControladorPrancha, op: OperacaoOrdem): boolean {
  const sel = selecaoEditavel(c, 'ordem');
  if (!sel || !['frente', 'tras', 'avancar', 'recuar'].includes(op)) return false;
  c.aplicar(reordenar(c.doc.elementos, sel.map((e) => e.id), op, c.camadas), 'ordem');
  return true;
}

export function agruparSelecao(c: ControladorPrancha): boolean {
  const sel = selecaoEditavel(c, 'agrupar', 2);
  if (!sel) return false;
  c.aplicar(agrupar(c.doc.elementos, sel.map((e) => e.id), c.gerarId('grupo'), c.camadas), 'agrupar');
  return true;
}

export function desagruparSelecao(c: ControladorPrancha): boolean {
  const sel = selecaoEditavel(c, 'desagrupar');
  if (!sel) return false;
  const ids = sel.map((e) => e.id);
  if (c.isolado && sel.some((e) => e.grupoId === c.isolado)) c.isolar(null);
  c.aplicar(desagrupar(c.doc.elementos, ids), 'desagrupar');
  return true;
}

// ---------- bloquear e ocultar ----------

export function marcarSelecao(c: ControladorPrancha, campo: 'bloqueado' | 'oculto'): boolean {
  const sel = selecaoEditavel(c, campo === 'bloqueado' ? 'bloquear' : 'ocultar');
  if (!sel) return false;
  const ids = new Set(sel.map((e) => e.id));
  c.selecionar([]);
  c.aplicar(c.doc.elementos.map((e) => (ids.has(e.id) ? { ...e, [campo]: true } : e)), campo === 'bloqueado' ? 'bloquear' : 'ocultar');
  return true;
}

/** Desbloqueia (ou mostra) todos e seleciona os que mudaram, como nos editores vetoriais. */
export function liberarTodos(c: ControladorPrancha, campo: 'bloqueado' | 'oculto'): boolean {
  if (c.somenteLeitura) { c.recusar('liberar', 'somente-leitura'); return false; }
  const mudados: string[] = [];
  const nova = c.doc.elementos.map((e) => {
    if (!e[campo]) return e;
    mudados.push(e.id);
    const copia = { ...e };
    delete copia[campo];
    return copia;
  });
  if (mudados.length === 0) return false;
  c.aplicar(nova, campo === 'bloqueado' ? 'bloquear' : 'ocultar');
  c.selecionar(mudados);
  return true;
}

// ---------- alinhar e distribuir ----------

/** Referência por nome: `selecao`, `folha`, `margens` (a caixa dada), ou o primeiro selecionado como chave (`chave`). */
export function alinharSelecao(c: ControladorPrancha, alinhamento: Alinhamento, referencia: 'selecao' | 'folha' | 'chave' | CaixaMm = 'selecao'): boolean {
  const sel = selecaoEditavel(c, 'alinhar');
  if (!sel) return false;
  let ref: ReferenciaAlinhamento = { tipo: 'selecao' };
  if (referencia === 'folha') ref = { tipo: 'caixa', caixa: { x: 0, y: 0, largura: c.folha.largura, altura: c.folha.altura } };
  else if (referencia === 'chave') ref = { tipo: 'chave', id: c.doc.selecao[0] };
  else if (referencia && typeof referencia === 'object') ref = { tipo: 'caixa', caixa: referencia };
  const movidos = alinhar(sel, alinhamento, ref);
  if (movidos.length === 0) return false;
  c.aplicarSubstituicoes(movidos, 'alinhar');
  return true;
}

export function distribuirSelecao(c: ControladorPrancha, eixo: 'horizontal' | 'vertical', modo: 'centros' | 'espacos' = 'espacos', espacamento?: number): boolean {
  const sel = selecaoEditavel(c, 'distribuir', 2);
  if (!sel) return false;
  const movidos = distribuir(sel, eixo === 'vertical' ? 'vertical' : 'horizontal', modo === 'centros' ? 'centros' : 'espacos', fin(espacamento) ? espacamento : undefined);
  if (movidos.length === 0) return false;
  c.aplicarSubstituicoes(movidos, 'distribuir');
  return true;
}

// ---------- duplicar, transformar de novo, área de transferência ----------

function inserirCopias(c: ControladorPrancha, originais: readonly ElementoGrafico[], deslocamento: Par, motivo: MotivoAlteracaoPrancha): ElementoGrafico[] {
  const copias = duplicarElementos(ordenarPorEmpilhamento(originais, c.camadas), c.gerarId, deslocamento);
  return inserirNovos(c, copias, motivo);
}

export function duplicarSelecao(c: ControladorPrancha, deslocamento: Par = [DESLOCAMENTO_COPIA_MM, DESLOCAMENTO_COPIA_MM]): boolean {
  const sel = selecaoEditavel(c, 'duplicar');
  if (!sel) return false;
  const d: Par = fin(deslocamento?.[0]) && fin(deslocamento?.[1]) ? deslocamento : [DESLOCAMENTO_COPIA_MM, DESLOCAMENTO_COPIA_MM];
  const novos = inserirCopias(c, sel, d, 'duplicar');
  c.ultimaTransformacao = { matriz: translacao(d[0], d[1]), duplicar: true };
  return novos.length > 0;
}

/** Guarda a transformação para o Ctrl+D. */
export function lembrarTransformacao(c: ControladorPrancha, m: Matriz2D, duplicar = false): void {
  if (ehMatrizFinita(m)) c.ultimaTransformacao = { matriz: m, duplicar };
}

/** Ctrl+D: repete a última transformação (duplicando antes, se ela foi uma cópia). */
export function transformarDeNovo(c: ControladorPrancha): boolean {
  const u = c.ultimaTransformacao;
  if (!u) { c.recusar('transformar-de-novo', 'nada-a-refazer'); return false; }
  const sel = selecaoEditavel(c, 'transformar-de-novo');
  if (!sel) return false;
  if (u.duplicar) {
    const novos = inserirCopias(c, sel, [0, 0], 'duplicar');
    if (novos.length === 0) return false;
    c.aplicarSubstituicoes(transformarElementos(novos, u.matriz), 'transformar');
    c.ultimaTransformacao = u;
    return true;
  }
  const ok = transformarSelecao(c, u.matriz, 'transformar');
  c.ultimaTransformacao = u;
  return ok;
}

export function copiar(c: ControladorPrancha): boolean {
  const sel = c.doc.elementosSelecionados();
  if (sel.length === 0) { c.recusar('copiar', 'sem-selecao'); return false; }
  area.elementos = JSON.parse(JSON.stringify(ordenarPorEmpilhamento(sel, c.camadas)));
  area.colagens = 0;
  try {
    // melhor esforço: o JSON também vai para a área de transferência do sistema (pode ser negado sem gesto do usuário)
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    void nav?.clipboard?.writeText?.(JSON.stringify({ tipo: 'ui-canvas-prancha', elementos: area.elementos }))?.catch?.(() => undefined);
  } catch { /* sem área de transferência do sistema */ }
  c.anunciar(sel.length === 1 ? 'Elemento copiado' : `${sel.length} elementos copiados`);
  return true;
}

export function recortar(c: ControladorPrancha): boolean {
  const sel = selecaoEditavel(c, 'recortar');
  if (!sel || !copiar(c)) return false;
  const fora = new Set(sel.map((e) => e.id));
  c.aplicar(c.doc.elementos.filter((e) => !fora.has(e.id)), 'recortar');
  return true;
}

/** Cola a área de transferência: deslocada a cada colagem, ou no mesmo lugar (`noLugar`, Ctrl+Shift+V). */
export function colar(c: ControladorPrancha, noLugar = false): boolean {
  if (area.elementos.length === 0) { c.recusar('colar', 'sem-selecao'); return false; }
  if (c.somenteLeitura) { c.recusar('colar', 'somente-leitura'); return false; }
  area.colagens++;
  const d = noLugar ? 0 : DESLOCAMENTO_COPIA_MM * area.colagens;
  return inserirCopias(c, area.elementos, [d, d], 'colar').length > 0;
}

/** Para testes: esvazia a área de transferência compartilhada. */
export function limparAreaDeTransferencia(): void {
  area.elementos = [];
  area.colagens = 0;
}

// ---------- conta-gotas e camadas ----------

/** Conta-gotas: a aparência de `origem` nos selecionados; sem seleção, vira a aparência das formas novas. */
export function contaGotas(c: ControladorPrancha, origem: ElementoGrafico): boolean {
  const aparencia: AparenciaElemento | undefined = origem.aparencia ? JSON.parse(JSON.stringify(origem.aparencia)) : undefined;
  c.emitir('prancha-conta-gotas', { elemento: origem, aparencia });
  const destinos = c.doc.elementosSelecionados().filter((e) => e.id !== origem.id && !c.mapa().travado(e));
  if (destinos.length === 0) {
    c.opcoesFerramentas = { ...c.opcoesFerramentas, aparencia };
    c.anunciar('Aparência guardada para as formas novas');
    return true;
  }
  if (c.somenteLeitura) { c.recusar('conta-gotas', 'somente-leitura'); return false; }
  c.aplicarSubstituicoes(aplicarAparencia(destinos, aparencia), 'conta-gotas');
  return true;
}

export function aplicarAparenciaNaSelecao(c: ControladorPrancha, aparencia: AparenciaElemento | null): boolean {
  const sel = selecaoEditavel(c, 'aparencia');
  if (!sel) return false;
  c.aplicarSubstituicoes(aplicarAparencia(sel, aparencia ?? undefined), 'aparencia');
  return true;
}

export function moverSelecaoParaCamada(c: ControladorPrancha, camadaId: string): boolean {
  const sel = selecaoEditavel(c, 'mover-camada');
  if (!sel || typeof camadaId !== 'string' || !c.camadas.some((k) => k.id === camadaId)) {
    if (sel) c.recusar('mover-camada', 'id-invalido', typeof camadaId === 'string' ? camadaId : undefined);
    return false;
  }
  c.aplicarSubstituicoes(sel.map((e) => ({ ...e, camadaId })), 'camada');
  return true;
}

// ---------- máscara e operações de caminho ----------

export function criarMascaraDaSelecao(c: ControladorPrancha): boolean {
  const sel = selecaoEditavel(c, 'mascara', 2);
  if (!sel) return false;
  const nova = aplicarResultado(c, 'mascara', criarMascara(c.doc.elementos, sel.map((e) => e.id), c.gerarId('grupo'), c.camadas));
  if (!nova) return false;
  c.aplicar(nova, 'mascara');
  return true;
}

export function liberarMascaraDaSelecao(c: ControladorPrancha): boolean {
  const sel = selecaoEditavel(c, 'liberar-mascara');
  if (!sel) return false;
  const nova = liberarMascara(c.doc.elementos, sel.map((e) => e.id));
  if (nova.every((e, i) => e === c.doc.elementos[i])) { c.recusar('liberar-mascara', 'tipo-nao-suportado'); return false; }
  c.aplicar(nova, 'mascara');
  return true;
}

/** Une os selecionados num caminho (o primeiro dá a aparência e a posição na pilha). */
export function unirSelecao(c: ControladorPrancha, tolerancia = 0.01): boolean {
  const sel = selecaoEditavel(c, 'unir', 2);
  if (!sel) return false;
  const ordem = ordenarPorEmpilhamento(sel, c.camadas);
  const unido = aplicarResultado(c, 'unir', unirCaminhos(ordem, tolerancia));
  if (!unido) return false;
  const fora = new Set(ordem.slice(1).map((e) => e.id));
  c.aplicar(c.doc.elementos.filter((e) => !fora.has(e.id)).map((e) => (e.id === unido.id ? unido : e)), 'unir');
  return true;
}

/** Divide a forma selecionada pela linha selecionada (a linha mais à frente corta; ela é consumida). */
export function dividirSelecao(c: ControladorPrancha): boolean {
  const sel = selecaoEditavel(c, 'dividir', 2);
  if (!sel) return false;
  const ordem = ordenarPorEmpilhamento(sel, c.camadas);
  const corte = [...ordem].reverse().find((e) => e.geometria.tipo === 'linha' || (e.geometria.tipo === 'caminho' && e.geometria.geometria.tipo === 'LineString'));
  const forma = ordem.find((e) => e !== corte);
  if (!corte || !forma) { c.recusar('dividir', 'tipo-nao-suportado'); return false; }
  const partes = aplicarResultado(c, 'dividir', dividirComLinha(forma, corte, c.gerarId));
  if (!partes) return false;
  const nova: ElementoGrafico[] = [];
  for (const e of c.doc.elementos) {
    if (e.id === corte.id) continue;
    if (e.id === forma.id) nova.push(...partes);
    else nova.push(e);
  }
  c.aplicar(nova, 'dividir');
  c.selecionar(partes.map((p) => p.id));
  return true;
}

export function deslocarCaminhoDaSelecao(c: ControladorPrancha, distancia: number): boolean {
  const sel = selecaoEditavel(c, 'deslocar-caminho');
  if (!sel) return false;
  const novos = sel.map((e) => aplicarResultado(c, 'deslocar-caminho', deslocarCaminho(e, distancia, c.gerarId('caminho')))).filter((e): e is ElementoGrafico => !!e);
  return novos.length > 0 && inserirNovos(c, novos, 'deslocar-caminho').length > 0;
}

function trocarCada(c: ControladorPrancha, acao: string, motivo: MotivoAlteracaoPrancha, op: (e: ElementoGrafico) => ResultadoOperacao<ElementoGrafico> | ElementoGrafico | null): boolean {
  const sel = selecaoEditavel(c, acao);
  if (!sel) return false;
  const trocas: ElementoGrafico[] = [];
  for (const e of sel) {
    const r = op(e);
    const el = r && typeof r === 'object' && ('ok' in r || 'motivo' in r) ? aplicarResultado(c, acao, r as ResultadoOperacao<ElementoGrafico>) : (r as ElementoGrafico | null);
    if (el) trocas.push(el);
  }
  if (trocas.length === 0) return false;
  c.aplicarSubstituicoes(trocas, motivo);
  return true;
}

export const simplificarSelecao = (c: ControladorPrancha, tolerancia = 0.2): boolean =>
  trocarCada(c, 'simplificar', 'simplificar', (e) => simplificarCaminho(e, tolerancia));

export const contornarTracoDaSelecao = (c: ControladorPrancha): boolean =>
  trocarCada(c, 'contorno-traco', 'contorno-traco', (e) => contornoDoTraco(e));

export const converterSelecaoEmCaminho = (c: ControladorPrancha): boolean =>
  trocarCada(c, 'converter-caminho', 'converter-caminho', (e) => (e.geometria.tipo === 'caminho' ? null : converterEmCaminho(e)));

/** Transformação composta aplicada (para quem precisa compor antes de lembrar, como o gesto de mover com Alt). */
export const comporTransformacoes = compor;
