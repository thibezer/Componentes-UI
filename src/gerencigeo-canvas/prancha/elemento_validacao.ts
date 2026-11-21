import type { GeometriaFeicao, Par } from '../feature_types';
import { normalizarNos } from '../feature_curvas';
import { normalizarTipoLinha } from '../motor/tipos-linha';
import { ehMatrizFinita, saneada } from '../espaco/espaco_matriz';
import { MODOS_MESCLAGEM } from './aparencia_estilo';
import type {
  AparenciaElemento, ElementoGrafico, EstiloPontaSeta, GeometriaElemento, GradienteElemento, HachuraElemento, ModoMesclagem,
  ParadaGradiente, PontaSeta, PreenchimentoElemento, RaiosCantos, TracoElemento
} from './tipos';

/*
 * Entrada hostil (Regra #0): elementos vindos do app/JSON podem chegar nulos, truncados, com `NaN`, `Infinity`, tipos
 * trocados, ids duplicados ou matriz singular. `normalizarElemento` devolve uma cópia limpa ou `null` (com o motivo em
 * `motivoRecusa`); nunca lança. Texto é dado, não HTML: segue como está e nunca vai para `innerHTML`.
 */

export type MotivoRecusaElemento = 'nao-objeto' | 'id-invalido' | 'geometria-invalida' | 'id-duplicado';

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const positivo = (n: unknown): n is number => fin(n) && n > 0;
const ehPar = (p: unknown): p is Par => Array.isArray(p) && p.length >= 2 && fin(p[0]) && fin(p[1]);
const par = (p: Par): Par => [p[0], p[1]];
const CHAVES_PROIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);
const ESTILOS_PONTA: readonly EstiloPontaSeta[] = ['triangulo', 'triangulo-aberto', 'aberta', 'circulo', 'quadrado', 'losango', 'barra'];
const MAX_LADOS = 360;
const MAX_VERTICES = 100000;

const entre01 = (v: unknown): number | undefined => (fin(v) ? Math.min(1, Math.max(0, v)) : undefined);
const inteiro = (v: unknown, min: number, max: number): number | null => (fin(v) ? Math.min(max, Math.max(min, Math.round(v))) : null);

function aneis(bruto: unknown, minimo: number): Par[][] | null {
  if (!Array.isArray(bruto) || bruto.length === 0) return null;
  const saida: Par[][] = [];
  for (const anel of bruto) {
    if (!Array.isArray(anel) || anel.length < minimo || anel.length > MAX_VERTICES || !anel.every(ehPar)) return null;
    saida.push(anel.map(par));
  }
  return saida;
}

function caminho(bruto: unknown): Extract<GeometriaFeicao, { tipo: 'LineString' | 'Polygon' }> | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const g = bruto as Record<string, unknown>;
  if (g.tipo === 'Polygon') {
    const a = aneis(g.aneis, 3);
    if (!a) return null;
    const curva = a.length === 1 ? normalizarNos(g.curva, 3) : null;
    return curva ? { tipo: 'Polygon', aneis: a, curva } : { tipo: 'Polygon', aneis: a };
  }
  if (g.tipo === 'LineString') {
    const pts = aneis([g.coordenadas], 2)?.[0];
    if (!pts) return null;
    const partes = Array.isArray(g.partes) && g.partes.length > 1 ? aneis(g.partes, 2) : null;
    const curva = !partes ? normalizarNos(g.curva, 2) : null;
    if (partes) return { tipo: 'LineString', coordenadas: partes[0], partes };
    return curva ? { tipo: 'LineString', coordenadas: pts, curva } : { tipo: 'LineString', coordenadas: pts };
  }
  return null;
}

/** Geometria limpa ou `null`. Dimensões precisam ser finitas e positivas; contagens viram inteiros de 3 a 360. */
export function normalizarGeometriaElemento(bruto: unknown): GeometriaElemento | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const g = bruto as Record<string, unknown>;
  switch (g.tipo) {
    case 'retangulo': {
      if (!positivo(g.largura) || !positivo(g.altura)) return null;
      const r = Array.isArray(g.raios) && g.raios.length === 4
        ? (g.raios.map((v) => (fin(v) && v > 0 ? v : 0)) as RaiosCantos)
        : undefined;
      return r && r.some((v) => v > 0) ? { tipo: 'retangulo', largura: g.largura, altura: g.altura, raios: r } : { tipo: 'retangulo', largura: g.largura, altura: g.altura };
    }
    case 'elipse': {
      if (!positivo(g.rx) || !positivo(g.ry)) return null;
      const a = g.arco as Record<string, unknown> | undefined;
      if (a && typeof a === 'object') {
        if (!fin(a.inicio) || !fin(a.fim) || a.inicio === a.fim) return null;
        const fechamento = a.fechamento === 'corda' || a.fechamento === 'fatia' ? a.fechamento : 'aberto';
        return { tipo: 'elipse', rx: g.rx, ry: g.ry, arco: { inicio: a.inicio, fim: a.fim, fechamento } };
      }
      return { tipo: 'elipse', rx: g.rx, ry: g.ry };
    }
    case 'poligono-regular': {
      const lados = inteiro(g.lados, 3, MAX_LADOS);
      return positivo(g.raio) && lados !== null ? { tipo: 'poligono-regular', raio: g.raio, lados } : null;
    }
    case 'estrela': {
      const pontas = inteiro(g.pontas, 3, MAX_LADOS);
      if (!positivo(g.raioExterno) || !positivo(g.raioInterno) || pontas === null) return null;
      return { tipo: 'estrela', raioExterno: g.raioExterno, raioInterno: Math.min(g.raioInterno, g.raioExterno), pontas };
    }
    case 'linha':
      return ehPar(g.de) && ehPar(g.ate) ? { tipo: 'linha', de: par(g.de), ate: par(g.ate) } : null;
    case 'caminho': {
      const c = caminho(g.geometria);
      return c ? { tipo: 'caminho', geometria: c } : null;
    }
    case 'texto': {
      if (!positivo(g.tamanho)) return null;
      const texto = typeof g.texto === 'string' ? g.texto : g.texto === undefined || g.texto === null ? '' : String(g.texto);
      const t: Extract<GeometriaElemento, { tipo: 'texto' }> = { tipo: 'texto', texto, tamanho: g.tamanho };
      if (typeof g.fonte === 'string' && g.fonte.trim()) t.fonte = g.fonte;
      if (positivo(g.largura)) t.largura = g.largura;
      if (g.alinhamento === 'centro' || g.alinhamento === 'direita' || g.alinhamento === 'esquerda') t.alinhamento = g.alinhamento;
      return t;
    }
    default:
      return null;
  }
}

function ponta(bruto: unknown): PontaSeta | undefined {
  if (!bruto || typeof bruto !== 'object') return undefined;
  const p = bruto as Record<string, unknown>;
  if (!ESTILOS_PONTA.includes(p.estilo as EstiloPontaSeta)) return undefined;
  return positivo(p.escala) ? { estilo: p.estilo as EstiloPontaSeta, escala: Math.min(p.escala, 100) } : { estilo: p.estilo as EstiloPontaSeta };
}

const cor = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() && v.length <= 64 ? v.trim() : undefined);

const MAX_PARADAS = 64;

function paradas(bruto: unknown): ParadaGradiente[] | null {
  if (!Array.isArray(bruto)) return null;
  const saida: ParadaGradiente[] = [];
  for (const p of bruto.slice(0, MAX_PARADAS)) {
    if (!p || typeof p !== 'object') continue;
    const r = p as Record<string, unknown>;
    const c = cor(r.cor);
    if (!c || !fin(r.posicao)) continue;
    const parada: ParadaGradiente = { posicao: Math.min(1, Math.max(0, r.posicao)), cor: c };
    const op = entre01(r.opacidade);
    if (op !== undefined) parada.opacidade = op;
    saida.push(parada);
  }
  saida.sort((a, b) => a.posicao - b.posicao);
  return saida.length >= 1 ? saida : null;
}

/** Gradiente limpo ou `undefined` (sem paradas válidas, coordenadas não finitas, raio ≤ 0). */
export function normalizarGradiente(bruto: unknown): GradienteElemento | undefined {
  if (!bruto || typeof bruto !== 'object') return undefined;
  const g = bruto as Record<string, unknown>;
  const ps = paradas(g.paradas);
  if (!ps) return undefined;
  if (g.tipo === 'linear' && ehPar(g.de) && ehPar(g.ate)) return { tipo: 'linear', de: par(g.de), ate: par(g.ate), paradas: ps };
  if (g.tipo === 'radial' && ehPar(g.centro) && positivo(g.raio)) {
    const r: GradienteElemento = { tipo: 'radial', centro: par(g.centro), raio: Math.min(g.raio, 100), paradas: ps };
    if (ehPar(g.foco)) r.foco = par(g.foco);
    return r;
  }
  return undefined;
}

/** Hachura limpa (números fora de faixa descartados: vale o padrão na resolução). */
export function normalizarHachura(bruto: unknown): HachuraElemento | undefined {
  if (!bruto || typeof bruto !== 'object') return undefined;
  const h = bruto as Record<string, unknown>;
  return semIndefinidos({
    angulo: fin(h.angulo) ? h.angulo : undefined,
    espacamento: positivo(h.espacamento) ? Math.max(0.1, Math.min(h.espacamento, 1000)) : undefined,
    cor: cor(h.cor),
    espessura: fin(h.espessura) && h.espessura >= 0 ? Math.min(h.espessura, 100) : undefined,
    opacidade: entre01(h.opacidade),
    cruzada: h.cruzada === true ? true : undefined
  });
}

function semIndefinidos<T extends object>(o: T): T {
  for (const k of Object.keys(o) as Array<keyof T>) if (o[k] === undefined) delete o[k];
  return o;
}

/** Aparência limpa: números fora de faixa são descartados (vale o padrão), cores só como texto curto. */
export function normalizarAparencia(bruto: unknown): AparenciaElemento | undefined {
  if (!bruto || typeof bruto !== 'object') return undefined;
  const a = bruto as Record<string, unknown>;
  const saida: AparenciaElemento = {};
  if (a.traco === null) saida.traco = null;
  else if (a.traco && typeof a.traco === 'object') {
    const t = a.traco as Record<string, unknown>;
    const traco: TracoElemento = semIndefinidos({
      cor: cor(t.cor),
      espessura: fin(t.espessura) && t.espessura >= 0 ? Math.min(t.espessura, 1000) : undefined,
      opacidade: entre01(t.opacidade),
      tipoLinha: normalizarTipoLinha(t.tipoLinha),
      escalaTipoLinha: positivo(t.escalaTipoLinha) ? t.escalaTipoLinha : undefined,
      terminacao: t.terminacao === 'arredondada' || t.terminacao === 'reta' || t.terminacao === 'quadrada' ? t.terminacao : undefined,
      juncao: t.juncao === 'arredondada' || t.juncao === 'chanfrada' || t.juncao === 'angular' ? t.juncao : undefined,
      limitePonta: fin(t.limitePonta) && t.limitePonta >= 1 ? Math.min(t.limitePonta, 100) : undefined,
      alinhamento: t.alinhamento === 'dentro' || t.alinhamento === 'fora' || t.alinhamento === 'centro' ? t.alinhamento : undefined,
      pontaInicio: ponta(t.pontaInicio),
      pontaFim: ponta(t.pontaFim)
    });
    saida.traco = traco;
  }
  if (a.preenchimento === null) saida.preenchimento = null;
  else if (a.preenchimento && typeof a.preenchimento === 'object') {
    const p = a.preenchimento as Record<string, unknown>;
    const preenchimento: PreenchimentoElemento = semIndefinidos({
      cor: cor(p.cor),
      opacidade: entre01(p.opacidade),
      regra: p.regra === 'evenodd' || p.regra === 'nonzero' ? p.regra : undefined,
      gradiente: normalizarGradiente(p.gradiente)
    });
    saida.preenchimento = preenchimento;
  }
  if (a.hachura === null) saida.hachura = null;
  else {
    const h = normalizarHachura(a.hachura);
    if (h) saida.hachura = h;
  }
  const op = entre01(a.opacidade);
  if (op !== undefined) saida.opacidade = op;
  if (typeof a.mesclagem === 'string' && (MODOS_MESCLAGEM as string[]).includes(a.mesclagem)) saida.mesclagem = a.mesclagem as ModoMesclagem;
  if (a.sombra === null) saida.sombra = null;
  else if (a.sombra && typeof a.sombra === 'object') {
    const s = a.sombra as Record<string, unknown>;
    saida.sombra = semIndefinidos({
      deslocamento: ehPar(s.deslocamento) ? ([Math.max(-1000, Math.min(1000, s.deslocamento[0])), Math.max(-1000, Math.min(1000, s.deslocamento[1]))] as Par) : undefined,
      desfoque: fin(s.desfoque) && s.desfoque >= 0 ? Math.min(s.desfoque, 100) : undefined,
      cor: cor(s.cor),
      opacidade: entre01(s.opacidade)
    });
  }
  return saida;
}

function propriedades(bruto: unknown): Record<string, unknown> | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const saida: Record<string, unknown> = {};
  for (const k of Object.keys(bruto)) if (!CHAVES_PROIBIDAS.has(k)) saida[k] = (bruto as Record<string, unknown>)[k];
  return saida;
}

/**
 * Cópia limpa do elemento ou o motivo da recusa. Matriz não finita vira identidade; singular é aceita (o elemento some no
 * desenho e não pode ser editado até ganhar uma matriz inversível).
 */
export function analisarElemento(bruto: unknown): ElementoGrafico | MotivoRecusaElemento {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return 'nao-objeto';
  const e = bruto as Record<string, unknown>;
  const id = typeof e.id === 'string' ? e.id.trim() : typeof e.id === 'number' && Number.isFinite(e.id) ? String(e.id) : '';
  if (!id) return 'id-invalido';
  const geometria = normalizarGeometriaElemento(e.geometria);
  if (!geometria) return 'geometria-invalida';
  const el: ElementoGrafico = { id, geometria };
  if (typeof e.nome === 'string') el.nome = e.nome;
  if (e.transformacao !== undefined && e.transformacao !== null) el.transformacao = ehMatrizFinita(e.transformacao) ? saneada(e.transformacao) : saneada(null);
  if (ehPar(e.pivo)) el.pivo = par(e.pivo);
  const aparencia = normalizarAparencia(e.aparencia);
  if (aparencia) el.aparencia = aparencia;
  if (e.bloqueado === true) el.bloqueado = true;
  if (e.oculto === true) el.oculto = true;
  if (typeof e.camadaId === 'string' && e.camadaId) el.camadaId = e.camadaId;
  if (typeof e.grupoId === 'string' && e.grupoId) el.grupoId = e.grupoId;
  if (fin(e.ordem)) el.ordem = e.ordem;
  if (e.mascara === true) el.mascara = true;
  if (typeof e.recorteId === 'string' && e.recorteId) el.recorteId = e.recorteId;
  const props = propriedades(e.propriedades);
  if (props) el.propriedades = props;
  return el;
}

/** Cópia limpa do elemento ou `null` (ver `analisarElemento` para saber o motivo). */
export function normalizarElemento(bruto: unknown): ElementoGrafico | null {
  const r = analisarElemento(bruto);
  return typeof r === 'string' ? null : r;
}

export interface ResultadoNormalizacao {
  elementos: ElementoGrafico[];
  recusados: Array<{ indice: number; id?: string; motivo: MotivoRecusaElemento }>;
}

/** Normaliza uma lista: descarta inválidos e ids repetidos (fica o primeiro), informando cada recusa. */
export function normalizarElementos(bruto: unknown): ResultadoNormalizacao {
  const res: ResultadoNormalizacao = { elementos: [], recusados: [] };
  if (!Array.isArray(bruto)) return res;
  const vistos = new Set<string>();
  bruto.forEach((item, indice) => {
    const el = analisarElemento(item);
    if (typeof el === 'string') {
      const id = item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string' ? (item as { id: string }).id : undefined;
      res.recusados.push({ indice, id, motivo: el });
      return;
    }
    if (vistos.has(el.id)) {
      res.recusados.push({ indice, id: el.id, motivo: 'id-duplicado' });
      return;
    }
    vistos.add(el.id);
    res.elementos.push(el);
  });
  return res;
}
