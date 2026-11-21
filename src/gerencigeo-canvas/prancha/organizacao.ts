import type { Par } from '../feature_types';
import { translacao } from '../espaco/espaco_matriz';
import { limitesNaFolha } from './elemento_geometria';
import { ordenarPorEmpilhamento } from './elemento_consulta';
import { mapaDeCamadas } from './camadas';
import { transformarElemento } from './elemento_transformacao';
import type { AparenciaElemento, CaixaMm, CamadaPrancha, ElementoGrafico } from './tipos';

/*
 * Organização (L2, pura): ordem de empilhamento, grupos, alinhar e distribuir, duplicar e aplicar aparência. Tudo devolve
 * listas/elementos NOVOS (os inalterados são os mesmos objetos). Grupos são de um nível (`grupoId`); um grupo conta como
 * uma unidade ao alinhar e distribuir.
 */

export type OperacaoOrdem = 'frente' | 'tras' | 'avancar' | 'recuar';
export type Alinhamento = 'esquerda' | 'centro-horizontal' | 'direita' | 'topo' | 'centro-vertical' | 'base';
export type ReferenciaAlinhamento =
  | { tipo: 'selecao' }
  /** Objeto-chave: não se move; os outros se alinham a ele. */
  | { tipo: 'chave'; id: string }
  /** Uma caixa fixa: a folha, as margens ou o quadro. */
  | { tipo: 'caixa'; caixa: CaixaMm };

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Os ids mais todos os membros dos grupos deles. */
export function expandirGrupos(lista: readonly ElementoGrafico[], ids: Iterable<string>): string[] {
  const alvo = new Set(ids);
  const grupos = new Set(lista.filter((e) => alvo.has(e.id) && e.grupoId).map((e) => e.grupoId!));
  return lista.filter((e) => alvo.has(e.id) || (e.grupoId !== undefined && grupos.has(e.grupoId))).map((e) => e.id);
}

const semOrdem = (e: ElementoGrafico): ElementoGrafico => {
  if (e.ordem === undefined) return e;
  const { ordem: _ordem, ...resto } = e;
  return resto;
};

/**
 * Reordena: `frente`/`tras` levam os selecionados ao topo/fundo da camada; `avancar`/`recuar`, um passo (passando o
 * próximo elemento não selecionado da mesma camada). A lista volta na nova ordem de empilhamento, com o campo `ordem`
 * removido de quem o tinha (a posição na lista passa a valer).
 */
export function reordenar(lista: readonly ElementoGrafico[], ids: Iterable<string>, op: OperacaoOrdem, camadas?: readonly CamadaPrancha[]): ElementoGrafico[] {
  const sel = new Set(ids);
  const mapa = mapaDeCamadas(camadas);
  const ordem = ordenarPorEmpilhamento(lista, mapa).map(semOrdem);
  if (op === 'frente' || op === 'tras') {
    // estável por camada: os selecionados vão para a ponta da própria camada
    const porCamada = new Map<number, ElementoGrafico[]>();
    for (const e of ordem) {
      const c = mapa.indice(e);
      if (!porCamada.has(c)) porCamada.set(c, []);
      porCamada.get(c)!.push(e);
    }
    const saida: ElementoGrafico[] = [];
    for (const c of [...porCamada.keys()].sort((a, b) => a - b)) {
      const itens = porCamada.get(c)!;
      const s = itens.filter((e) => sel.has(e.id));
      const n = itens.filter((e) => !sel.has(e.id));
      saida.push(...(op === 'frente' ? [...n, ...s] : [...s, ...n]));
    }
    return saida;
  }
  const arr = [...ordem];
  if (op === 'avancar') {
    for (let i = arr.length - 2; i >= 0; i--) {
      if (!sel.has(arr[i].id)) continue;
      const j = arr.findIndex((e, k) => k > i && !sel.has(e.id) && mapa.indice(e) === mapa.indice(arr[i]));
      if (j < 0) continue;
      const [e] = arr.splice(i, 1);
      arr.splice(j, 0, e);
    }
  } else {
    for (let i = 1; i < arr.length; i++) {
      if (!sel.has(arr[i].id)) continue;
      let j = -1;
      for (let k = i - 1; k >= 0; k--) if (!sel.has(arr[k].id) && mapa.indice(arr[k]) === mapa.indice(arr[i])) { j = k; break; }
      if (j < 0) continue;
      const [e] = arr.splice(i, 1);
      arr.splice(j, 0, e);
    }
  }
  return arr;
}

/** Agrupa: todos ganham `grupoId` e ficam contíguos na posição do mais à frente. */
export function agrupar(lista: readonly ElementoGrafico[], ids: Iterable<string>, grupoId: string, camadas?: readonly CamadaPrancha[]): ElementoGrafico[] {
  const sel = new Set(ids);
  if (sel.size < 2 || typeof grupoId !== 'string' || !grupoId) return [...lista];
  const ordem = ordenarPorEmpilhamento(lista, camadas).map(semOrdem);
  const membros = ordem.filter((e) => sel.has(e.id)).map((e) => ({ ...e, grupoId }));
  const ultimo = ordem.map((e) => sel.has(e.id)).lastIndexOf(true);
  const saida: ElementoGrafico[] = [];
  ordem.forEach((e, i) => {
    if (!sel.has(e.id)) saida.push(e);
    if (i === ultimo) saida.push(...membros);
  });
  return saida;
}

/** Desagrupa os grupos dos ids (todos os membros perdem o `grupoId`). */
export function desagrupar(lista: readonly ElementoGrafico[], ids: Iterable<string>): ElementoGrafico[] {
  const alvo = new Set(ids);
  const grupos = new Set(lista.filter((e) => alvo.has(e.id) && e.grupoId).map((e) => e.grupoId!));
  return lista.map((e) => {
    if (!e.grupoId || !grupos.has(e.grupoId)) return e;
    const { grupoId: _g, ...resto } = e;
    return resto;
  });
}

interface Unidade { membros: ElementoGrafico[]; caixa: CaixaMm }

function unir(caixas: CaixaMm[]): CaixaMm | null {
  if (caixas.length === 0) return null;
  const x0 = Math.min(...caixas.map((c) => c.x)), y0 = Math.min(...caixas.map((c) => c.y));
  const x1 = Math.max(...caixas.map((c) => c.x + c.largura)), y1 = Math.max(...caixas.map((c) => c.y + c.altura));
  return [x0, y0, x1, y1].every(fin) ? { x: x0, y: y0, largura: x1 - x0, altura: y1 - y0 } : null;
}

/** Elementos agrupados em unidades (um grupo = uma unidade), com a caixa de cada uma. */
function unidades(elementos: readonly ElementoGrafico[]): Unidade[] {
  const mapa = new Map<string, ElementoGrafico[]>();
  for (const e of elementos) {
    const chave = e.grupoId ? `g\u0000${e.grupoId}` : `e\u0000${e.id}`;
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave)!.push(e);
  }
  const saida: Unidade[] = [];
  for (const membros of mapa.values()) {
    const caixa = unir(membros.map(limitesNaFolha).filter((c): c is CaixaMm => !!c));
    if (caixa) saida.push({ membros, caixa });
  }
  return saida;
}

const mover = (u: Unidade, dx: number, dy: number): ElementoGrafico[] =>
  dx === 0 && dy === 0 ? [] : u.membros.filter((e) => !e.bloqueado).map((e) => transformarElemento(e, translacao(dx, dy)));

/**
 * Alinha os elementos (bordas ou centros) à seleção, a um objeto-chave ou a uma caixa (folha, margens). Devolve só os
 * elementos movidos. Menos de uma unidade para mover: `[]`.
 */
export function alinhar(elementos: readonly ElementoGrafico[], alinhamento: Alinhamento, referencia: ReferenciaAlinhamento = { tipo: 'selecao' }): ElementoGrafico[] {
  let us = unidades(elementos);
  let ref: CaixaMm | null = null;
  if (referencia?.tipo === 'caixa') {
    const c = referencia.caixa;
    ref = c && [c.x, c.y, c.largura, c.altura].every(fin) ? c : null;
  } else if (referencia?.tipo === 'chave') {
    const chave = us.find((u) => u.membros.some((e) => e.id === referencia.id));
    ref = chave?.caixa ?? null;
    us = us.filter((u) => u !== chave);
  } else {
    if (us.length < 2) return [];
    ref = unir(us.map((u) => u.caixa));
  }
  if (!ref) return [];
  const saida: ElementoGrafico[] = [];
  for (const u of us) {
    const c = u.caixa;
    let dx = 0, dy = 0;
    switch (alinhamento) {
      case 'esquerda': dx = ref.x - c.x; break;
      case 'direita': dx = ref.x + ref.largura - (c.x + c.largura); break;
      case 'centro-horizontal': dx = ref.x + ref.largura / 2 - (c.x + c.largura / 2); break;
      case 'topo': dy = ref.y - c.y; break;
      case 'base': dy = ref.y + ref.altura - (c.y + c.altura); break;
      case 'centro-vertical': dy = ref.y + ref.altura / 2 - (c.y + c.altura / 2); break;
      default: return [];
    }
    saida.push(...mover(u, dx, dy));
  }
  return saida;
}

/**
 * Distribui no eixo. `centros`: centros igualmente espaçados entre o primeiro e o último. `espacos`: o mesmo vão entre as
 * caixas (ou o `espacamento` dado, em mm, a partir da primeira). Precisa de 3 unidades (2 com `espacamento`).
 */
export function distribuir(elementos: readonly ElementoGrafico[], eixo: 'horizontal' | 'vertical', modo: 'centros' | 'espacos' = 'espacos', espacamento?: number): ElementoGrafico[] {
  const h = eixo === 'horizontal';
  const us = unidades(elementos);
  const fixo = fin(espacamento) && modo === 'espacos';
  if (us.length < (fixo ? 2 : 3)) return [];
  const ini = (c: CaixaMm) => (h ? c.x : c.y);
  const tam = (c: CaixaMm) => (h ? c.largura : c.altura);
  us.sort((a, b) => ini(a.caixa) + tam(a.caixa) / 2 - (ini(b.caixa) + tam(b.caixa) / 2));
  const primeiro = us[0].caixa;
  const ultimo = us[us.length - 1].caixa;
  const saida: ElementoGrafico[] = [];
  if (modo === 'centros') {
    const c0 = ini(primeiro) + tam(primeiro) / 2;
    const passo = (ini(ultimo) + tam(ultimo) / 2 - c0) / (us.length - 1);
    us.forEach((u, i) => {
      const d = c0 + passo * i - (ini(u.caixa) + tam(u.caixa) / 2);
      saida.push(...mover(u, h ? d : 0, h ? 0 : d));
    });
    return saida;
  }
  const total = us.reduce((s, u) => s + tam(u.caixa), 0);
  const vao = fixo ? espacamento! : (ini(ultimo) + tam(ultimo) - ini(primeiro) - total) / (us.length - 1);
  let pos = ini(primeiro);
  for (const u of us) {
    const d = pos - ini(u.caixa);
    saida.push(...mover(u, h ? d : 0, h ? 0 : d));
    pos += tam(u.caixa) + vao;
  }
  return saida;
}

/**
 * Cópias com ids novos (`gerarId`), deslocadas. Grupos e máscaras copiados ganham ids novos também (a cópia não se liga ao
 * original); `recorteId` aponta para a cópia da máscara quando ela foi copiada junto.
 */
export function duplicarElementos(elementos: readonly ElementoGrafico[], gerarId: (tipo: string) => string, deslocamento: Par = [0, 0]): ElementoGrafico[] {
  const ids = new Map<string, string>();
  const grupos = new Map<string, string>();
  for (const e of elementos) ids.set(e.id, gerarId(e.geometria?.tipo ?? 'elemento'));
  const [dx, dy] = fin(deslocamento?.[0]) && fin(deslocamento?.[1]) ? deslocamento : [0, 0];
  return elementos.map((e) => {
    const copia: ElementoGrafico = JSON.parse(JSON.stringify(e));
    copia.id = ids.get(e.id)!;
    if (e.grupoId) {
      if (!grupos.has(e.grupoId)) grupos.set(e.grupoId, gerarId('grupo'));
      copia.grupoId = grupos.get(e.grupoId);
    }
    if (e.recorteId) {
      if (ids.has(e.recorteId)) copia.recorteId = ids.get(e.recorteId);
      else delete copia.recorteId;
    }
    delete copia.ordem;
    return dx === 0 && dy === 0 ? copia : transformarElemento(copia, translacao(dx, dy));
  });
}

/** Conta-gotas: a aparência (cópia profunda) de `origem` em cada destino. */
export function aplicarAparencia(destinos: readonly ElementoGrafico[], aparencia: AparenciaElemento | undefined): ElementoGrafico[] {
  return destinos.map((e) => {
    if (!aparencia) {
      const { aparencia: _a, ...resto } = e;
      return resto;
    }
    return { ...e, aparencia: JSON.parse(JSON.stringify(aparencia)) as AparenciaElemento };
  });
}
