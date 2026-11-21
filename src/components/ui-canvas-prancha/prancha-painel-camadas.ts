import { contornoNaFolha } from '../../gerencigeo-canvas/prancha/elemento_geometria';
import { ordenarPorEmpilhamento } from '../../gerencigeo-canvas/prancha/elemento_consulta';
import { resolverAparencia } from '../../gerencigeo-canvas/prancha/aparencia_estilo';
import type { CamadaPrancha, ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import { rotuloDoTipo } from './prancha-painel-propriedades';

/*
 * Dados do painel de camadas (sem DOM): a lista de camadas e de elementos no formato do `<ui-camadas>` do kit (modo
 * enxuto), e o caminho de volta (eventos do painel → camadas da prancha). A prancha não importa o painel (outro L4): os
 * tipos daqui são o mesmo contrato, por estrutura.
 *
 * Ordem: o painel mostra de CIMA PARA BAIXO o que está na FRENTE primeiro (como os editores vetoriais); a prancha guarda as
 * camadas de trás para a frente. Os elementos sem camada (que ficam por cima de todas) entram numa camada sintética,
 * `CAMADA_SEM_CAMADA`, no topo.
 */

export const CAMADA_SEM_CAMADA = 'prancha:sem-camada';

export interface CamadaPainelPrancha {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
  count: number;
  [chave: string]: unknown;
}

export interface FeicaoPainelPrancha {
  id: string;
  name: string;
  layerId: string;
  type: 'Polygon' | 'LineString' | 'Text';
  geometryType: string;
  visible: boolean;
  locked: boolean;
  color?: string;
  [chave: string]: unknown;
}

/** Id de camada do painel → `camadaId` da prancha (`null` = sem camada). */
export const camadaDoPainel = (id: unknown): string | null => (typeof id === 'string' && id !== CAMADA_SEM_CAMADA ? id : null);

/** Camadas e feições para `painel.definirCamadas(camadas, feicoes)`. Nunca lança. */
export function dadosParaPainelDeCamadas(elementos: readonly ElementoGrafico[], camadas: readonly CamadaPrancha[] = []): { camadas: CamadaPainelPrancha[]; feicoes: FeicaoPainelPrancha[] } {
  const els = Array.isArray(elementos) ? elementos.filter((e) => e && typeof e === 'object' && e.geometria) : [];
  const ks = Array.isArray(camadas) ? camadas.filter((k) => k && typeof k.id === 'string') : [];
  const conhecidas = new Set(ks.map((k) => k.id));
  const layerDe = (e: ElementoGrafico): string => (e.camadaId && conhecidas.has(e.camadaId) ? e.camadaId : CAMADA_SEM_CAMADA);
  const contagem = new Map<string, number>();
  for (const e of els) contagem.set(layerDe(e), (contagem.get(layerDe(e)) ?? 0) + 1);

  const saida: CamadaPainelPrancha[] = [];
  if (contagem.has(CAMADA_SEM_CAMADA) || ks.length === 0) {
    saida.push({ id: CAMADA_SEM_CAMADA, name: 'Sem camada', visible: true, locked: false, opacity: 1, order: 0, count: contagem.get(CAMADA_SEM_CAMADA) ?? 0 });
  }
  for (const k of [...ks].reverse()) {
    saida.push({
      id: k.id, name: k.nome ?? k.id, visible: k.visivel !== false, locked: k.bloqueada === true,
      opacity: typeof k.opacidade === 'number' && Number.isFinite(k.opacidade) ? Math.min(1, Math.max(0, k.opacidade)) : 1,
      order: saida.length, count: contagem.get(k.id) ?? 0
    });
  }

  const porTipo = new Map<string, number>();
  const feicoes = [...ordenarPorEmpilhamento(els, ks)].reverse().map((e): FeicaoPainelPrancha => {
    const rot = rotuloDoTipo(e);
    let nome = e.nome;
    if (!nome) {
      const n = (porTipo.get(rot) ?? 0) + 1;
      porTipo.set(rot, n);
      nome = `${rot} ${n}`;
    }
    const texto = e.geometria.tipo === 'texto';
    const tipo = texto ? 'Text' : contornoNaFolha(e)?.tipo === 'Polygon' ? 'Polygon' : 'LineString';
    let cor: string | undefined;
    try {
      const ap = resolverAparencia(e);
      cor = ap.preenchimento?.cor ?? ap.traco?.cor;
    } catch { cor = undefined; }
    return { id: e.id, name: nome, layerId: layerDe(e), type: tipo, geometryType: tipo, visible: e.oculto !== true, locked: e.bloqueado === true, color: cor };
  });
  return { camadas: saida, feicoes };
}

export interface MudancaCamadaPrancha {
  visivel?: boolean;
  bloqueada?: boolean;
  opacidade?: number;
  nome?: string;
}

/** As camadas com a mudança vinda do painel (visibilidade, trava, opacidade, nome); id desconhecido não muda nada. */
export function camadasComMudanca(camadas: readonly CamadaPrancha[], camadaId: string, m: MudancaCamadaPrancha): CamadaPrancha[] {
  const lista = Array.isArray(camadas) ? camadas : [];
  if (!m || typeof m !== 'object') return [...lista];
  return lista.map((k) => {
    if (k.id !== camadaId) return k;
    const novo: CamadaPrancha = { ...k };
    if (typeof m.visivel === 'boolean') novo.visivel = m.visivel;
    if (typeof m.bloqueada === 'boolean') novo.bloqueada = m.bloqueada;
    if (typeof m.opacidade === 'number' && Number.isFinite(m.opacidade)) novo.opacidade = Math.min(1, Math.max(0, m.opacidade));
    if (typeof m.nome === 'string' && m.nome.trim() !== '') novo.nome = m.nome;
    return novo;
  });
}

/**
 * Reordena as camadas pela ordem do painel (`ui-camadas-reordenadas`, da frente para trás). Ids que o painel não trouxe
 * ficam atrás, na ordem em que estavam; a camada sintética e ids desconhecidos são ignorados.
 */
export function camadasNaOrdemDoPainel(camadas: readonly CamadaPrancha[], idsDoPainel: readonly unknown[]): CamadaPrancha[] {
  const lista = Array.isArray(camadas) ? camadas : [];
  const porId = new Map(lista.map((k) => [k.id, k]));
  const vistos = new Set<string>();
  const frenteParaTras: CamadaPrancha[] = [];
  for (const id of Array.isArray(idsDoPainel) ? idsDoPainel : []) {
    const k = typeof id === 'string' ? porId.get(id) : undefined;
    if (k && !vistos.has(k.id)) { vistos.add(k.id); frenteParaTras.push(k); }
  }
  const resto = lista.filter((k) => !vistos.has(k.id));
  return [...resto, ...frenteParaTras.reverse()];
}
