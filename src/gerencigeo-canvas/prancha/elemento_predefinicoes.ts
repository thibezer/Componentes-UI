import type { Par } from '../feature_types';
import type { TipoLinha } from '../motor/tipos-linha';
import { translacao } from '../espaco/espaco_matriz';
import { caixaNormalizada, criarElipse, criarLinha, criarRetangulo } from './elemento_criacao';
import type { AparenciaElemento, CaixaMm, ElementoGrafico, PontaSeta, TracoElemento } from './tipos';

/*
 * Pré-definições (L2, puras): geradores de geometria + aparência equivalentes às molduras do app (retângulo, retângulo
 * arredondado, moldura dupla, elipse/círculo, triângulo, losango, linhas, setas), com traço contínuo, tracejado,
 * pontilhado ou traço-ponto. O resultado é um elemento comum, editável depois como qualquer outro. Uma pré-definição pode
 * gerar mais de um elemento (a moldura dupla gera dois, no mesmo `grupoId`).
 */

export const PREDEFINICOES = [
  'retangulo', 'retangulo-arredondado', 'moldura-dupla', 'elipse', 'circulo', 'triangulo', 'losango',
  'linha-horizontal', 'linha-vertical', 'linha-diagonal', 'seta', 'seta-dupla'
] as const;

export type Predefinicao = (typeof PREDEFINICOES)[number];

export const ESTILOS_TRACO = ['continuo', 'tracejado', 'pontilhado', 'traco-ponto'] as const;
export type EstiloTraco = (typeof ESTILOS_TRACO)[number];

/** Estilo de traço da pré-definição → tipo de linha CAD (`motor/tipos-linha.ts`). */
export const TIPO_LINHA_DO_ESTILO: Readonly<Record<EstiloTraco, TipoLinha>> = Object.freeze({
  continuo: 'continua',
  tracejado: 'tracejada',
  pontilhado: 'pontilhada',
  'traco-ponto': 'traco-ponto'
});

export function ehPredefinicao(v: unknown): v is Predefinicao {
  return typeof v === 'string' && (PREDEFINICOES as readonly string[]).includes(v);
}

/** Rótulos em português (pt-BR) das pré-definições, para menus e dicas. */
export const ROTULOS_PREDEFINICOES: Readonly<Record<Predefinicao, string>> = Object.freeze({
  retangulo: 'Retângulo',
  'retangulo-arredondado': 'Retângulo arredondado',
  'moldura-dupla': 'Moldura dupla (ABNT)',
  elipse: 'Elipse',
  circulo: 'Círculo',
  triangulo: 'Triângulo',
  losango: 'Losango',
  'linha-horizontal': 'Linha horizontal',
  'linha-vertical': 'Linha vertical',
  'linha-diagonal': 'Linha diagonal',
  seta: 'Seta',
  'seta-dupla': 'Seta dupla'
});

export type GrupoPredefinicao = 'molduras' | 'formas' | 'linhas' | 'setas';

export interface ItemPredefinicao {
  valor: Predefinicao;
  rotulo: string;
  grupo: GrupoPredefinicao;
  /** Costuma ocupar o quadro das margens da folha (aceita `quadro: 'margens'` em `inserirPredefinicao`). */
  usaQuadro: boolean;
}

const GRUPO_DA_PREDEFINICAO: Readonly<Record<Predefinicao, GrupoPredefinicao>> = {
  retangulo: 'molduras', 'moldura-dupla': 'molduras', 'retangulo-arredondado': 'formas', elipse: 'formas', circulo: 'formas',
  triangulo: 'formas', losango: 'formas', 'linha-horizontal': 'linhas', 'linha-vertical': 'linhas', 'linha-diagonal': 'linhas',
  seta: 'setas', 'seta-dupla': 'setas'
};

/** Lista ordenada para montar um menu: molduras, formas, linhas e setas. */
export const ITENS_PREDEFINICOES: readonly ItemPredefinicao[] = Object.freeze(
  (['retangulo', 'moldura-dupla', 'retangulo-arredondado', 'elipse', 'circulo', 'triangulo', 'losango', 'linha-horizontal', 'linha-vertical', 'linha-diagonal', 'seta', 'seta-dupla'] as const)
    .map((valor) => Object.freeze({ valor, rotulo: ROTULOS_PREDEFINICOES[valor], grupo: GRUPO_DA_PREDEFINICAO[valor], usaQuadro: valor === 'retangulo' || valor === 'moldura-dupla' }))
);

export interface OpcoesPredefinicao {
  /** Id do (primeiro) elemento; os demais ganham `-2`, `-3`... Padrão `'predefinicao'`. */
  id?: string;
  estiloTraco?: EstiloTraco;
  /** mm (padrão 0,35). */
  espessura?: number;
  /** Padrão `#000000`. */
  corTraco?: string;
  /** Preenchimento das formas fechadas; ausente = sem preenchimento. */
  corPreenchimento?: string;
  /** Retângulo arredondado: raio dos cantos em mm (padrão 10% do menor lado). */
  raio?: number;
  /** Moldura dupla: distância entre as duas linhas em mm (padrão 1,5). */
  espacamento?: number;
  /** Moldura dupla: espessura da linha interna em mm (padrão 2× `espessura`). */
  espessuraInterna?: number;
  /** Setas: estilo da ponta (padrão triângulo cheio). */
  ponta?: PontaSeta;
  camadaId?: string;
  /** Opacidade do preenchimento (0 a 1), separada da cor (o painel edita os dois campos). Padrão 1. */
  opacidadePreenchimento?: number;
  /** Opacidade do traço (0 a 1). Padrão 1. */
  opacidadeTraco?: number;
  /** Sem traço (`traco: null`): `espessura` deixa de cair no padrão. */
  semTraco?: boolean;
  /** Moldura dupla: em qual das duas linhas vai o preenchimento. `'externa'` cobre também o espaço entre elas. Padrão `'interna'`. */
  preenchimentoNa?: 'externa' | 'interna';
  /** Onde o traço fica em relação ao contorno das formas fechadas (a borda externa encosta na caixa com `'dentro'`). Padrão `'centro'`. */
  alinhamentoTraco?: 'centro' | 'dentro' | 'fora';
  /**
   * Linhas e setas: recuo, em mm, de cada ponta em relação à borda da caixa. Recuo que não deixa comprimento (2 × recuo ≥
   * comprimento) é ignorado.
   */
  recuo?: number;
}

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const positivoOu = (v: unknown, padrao: number): number => (fin(v) && v > 0 ? v : padrao);

const entre01 = (v: unknown): number | undefined => (fin(v) ? Math.min(1, Math.max(0, v)) : undefined);

function aparencia(o: OpcoesPredefinicao, fechada: boolean, extra: Partial<TracoElemento> = {}): AparenciaElemento {
  const opTraco = entre01(o.opacidadeTraco);
  const opPreench = entre01(o.opacidadePreenchimento);
  const traco: TracoElemento | null = o.semTraco === true ? null : {
    cor: o.corTraco ?? '#000000',
    espessura: positivoOu(o.espessura, 0.35),
    tipoLinha: TIPO_LINHA_DO_ESTILO[o.estiloTraco ?? 'continuo'] ?? 'continua',
    ...(opTraco !== undefined ? { opacidade: opTraco } : {}),
    ...(fechada && (o.alinhamentoTraco === 'dentro' || o.alinhamentoTraco === 'fora') ? { alinhamento: o.alinhamentoTraco } : {}),
    ...extra
  };
  return { traco, preenchimento: fechada && o.corPreenchimento ? { cor: o.corPreenchimento, ...(opPreench !== undefined ? { opacidade: opPreench } : {}) } : null };
}

/** Recuo das pontas de uma linha de `a` até `b`; ignora recuo inválido ou que consumiria a linha. */
function recuar(a: Par, b: Par, recuo: unknown): [Par, Par] {
  const r = fin(recuo) && recuo > 0 ? recuo : 0;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (r === 0 || !(len > 2 * r)) return [a, b];
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  return [[a[0] + ux * r, a[1] + uy * r], [b[0] - ux * r, b[1] - uy * r]];
}

/** Caminho fechado com estes vértices relativos ao centro da caixa. */
function poligonoNaCaixa(id: string, c: CaixaMm, relativos: Par[], ap: AparenciaElemento, camadaId?: string): ElementoGrafico {
  const cx = c.x + c.largura / 2;
  const cy = c.y + c.altura / 2;
  const el: ElementoGrafico = {
    id,
    geometria: { tipo: 'caminho', geometria: { tipo: 'Polygon', aneis: [relativos] } },
    transformacao: translacao(cx, cy),
    aparencia: ap
  };
  if (camadaId) el.camadaId = camadaId;
  return el;
}

/**
 * Gera a pré-definição dentro de `caixa` (mm). Devolve `[]` para tipo desconhecido ou caixa inválida (largura e altura
 * precisam ser positivas, exceto nas linhas horizontal/vertical, em que um dos lados pode ser zero).
 */
export function gerarPredefinicao(tipo: Predefinicao, caixa: CaixaMm, opcoes: OpcoesPredefinicao = {}): ElementoGrafico[] {
  const c = caixaNormalizada(caixa);
  if (!c || !ehPredefinicao(tipo)) return [];
  const id = typeof opcoes.id === 'string' && opcoes.id ? opcoes.id : 'predefinicao';
  const base = { id, camadaId: opcoes.camadaId };
  const w = c.largura;
  const h = c.altura;
  const um = (el: ElementoGrafico | null): ElementoGrafico[] => (el ? [el] : []);
  const ponta = opcoes.ponta ?? { estilo: 'triangulo' };
  const area = w > 0 && h > 0;

  switch (tipo) {
    case 'retangulo':
      return area ? um(criarRetangulo({ ...base, aparencia: aparencia(opcoes, true) }, c)) : [];
    case 'retangulo-arredondado':
      return area ? um(criarRetangulo({ ...base, aparencia: aparencia(opcoes, true) }, c, positivoOu(opcoes.raio, Math.min(w, h) * 0.1))) : [];
    case 'moldura-dupla': {
      if (!area) return [];
      const d = positivoOu(opcoes.espacamento, 1.5);
      if (2 * d >= Math.min(w, h)) return [];
      const grupo = `${id}-grupo`;
      const naExterna = opcoes.preenchimentoNa === 'externa';
      const externa = criarRetangulo({ ...base, grupoId: grupo, aparencia: aparencia(opcoes, naExterna) }, c);
      const interna = criarRetangulo(
        { id: `${id}-2`, camadaId: opcoes.camadaId, grupoId: grupo, aparencia: aparencia({ ...opcoes, espessura: positivoOu(opcoes.espessuraInterna, positivoOu(opcoes.espessura, 0.35) * 2) }, !naExterna) },
        { x: c.x + d, y: c.y + d, largura: w - 2 * d, altura: h - 2 * d }
      );
      return externa && interna ? [externa, interna] : [];
    }
    case 'elipse':
      return area ? um(criarElipse({ ...base, aparencia: aparencia(opcoes, true) }, c)) : [];
    case 'circulo': {
      if (!area) return [];
      const lado = Math.min(w, h);
      return um(criarElipse({ ...base, aparencia: aparencia(opcoes, true) }, { x: c.x + (w - lado) / 2, y: c.y + (h - lado) / 2, largura: lado, altura: lado }));
    }
    case 'triangulo':
      return area ? [poligonoNaCaixa(id, c, [[0, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], aparencia(opcoes, true), opcoes.camadaId)] : [];
    case 'losango':
      return area ? [poligonoNaCaixa(id, c, [[0, -h / 2], [w / 2, 0], [0, h / 2], [-w / 2, 0]], aparencia(opcoes, true), opcoes.camadaId)] : [];
    case 'linha-horizontal': {
      const [a, b] = recuar([c.x, c.y + h / 2], [c.x + w, c.y + h / 2], opcoes.recuo);
      return w > 0 ? um(criarLinha({ ...base, aparencia: aparencia(opcoes, false) }, a, b)) : [];
    }
    case 'linha-vertical': {
      const [a, b] = recuar([c.x + w / 2, c.y], [c.x + w / 2, c.y + h], opcoes.recuo);
      return h > 0 ? um(criarLinha({ ...base, aparencia: aparencia(opcoes, false) }, a, b)) : [];
    }
    case 'linha-diagonal': {
      const [a, b] = recuar([c.x, c.y], [c.x + w, c.y + h], opcoes.recuo);
      return area ? um(criarLinha({ ...base, aparencia: aparencia(opcoes, false) }, a, b)) : [];
    }
    case 'seta': {
      const [a, b] = recuar([c.x, c.y + h / 2], [c.x + w, c.y + h / 2], opcoes.recuo);
      return w > 0 ? um(criarLinha({ ...base, aparencia: aparencia(opcoes, false, { pontaFim: ponta }) }, a, b)) : [];
    }
    case 'seta-dupla': {
      const [a, b] = recuar([c.x, c.y + h / 2], [c.x + w, c.y + h / 2], opcoes.recuo);
      return w > 0 ? um(criarLinha({ ...base, aparencia: aparencia(opcoes, false, { pontaInicio: ponta, pontaFim: ponta }) }, a, b)) : [];
    }
  }
}

// ---------- folha e quadro ABNT ----------

export const FORMATOS_ABNT = ['A0', 'A1', 'A2', 'A3', 'A4'] as const;
export type FormatoAbnt = (typeof FORMATOS_ABNT)[number];

/** Folhas da série A (NBR 10068 / ISO 216), em mm, na vertical (retrato): [largura, altura]. */
export const DIMENSOES_FOLHA: Readonly<Record<FormatoAbnt, readonly [number, number]>> = Object.freeze({
  A0: [841, 1189], A1: [594, 841], A2: [420, 594], A3: [297, 420], A4: [210, 297]
});

/**
 * Margens do quadro (NBR 10068), em mm: esquerda 25 (encadernação) e as demais 10 (A0, A1) ou 7 (A2, A3, A4). São o
 * padrão da função abaixo; confira com a revisão da norma usada pelo projeto e sobrescreva em `margens` se preciso.
 */
export function margensAbnt(formato: FormatoAbnt): { esquerda: number; direita: number; superior: number; inferior: number } {
  const outra = formato === 'A0' || formato === 'A1' ? 10 : 7;
  return { esquerda: 25, direita: outra, superior: outra, inferior: outra };
}

export interface MargensFolha { esquerda: number; direita: number; superior: number; inferior: number }

/**
 * Caixa do quadro de uma folha QUALQUER (mm) com margens quaisquer. `null` se algo não é finito, uma margem é negativa
 * ou as margens consomem a folha (sobra largura ou altura ≤ 0).
 */
export function caixaDoQuadro(largura: number, altura: number, margens: MargensFolha): CaixaMm | null {
  if (!margens || ![largura, altura, margens.esquerda, margens.direita, margens.superior, margens.inferior].every(fin)) return null;
  if ([margens.esquerda, margens.direita, margens.superior, margens.inferior].some((m) => m < 0)) return null;
  const w = largura - margens.esquerda - margens.direita;
  const h = altura - margens.superior - margens.inferior;
  return w > 0 && h > 0 ? { x: margens.esquerda, y: margens.superior, largura: w, altura: h } : null;
}

/** Caixa do quadro (área útil dentro das margens) da folha no formato e orientação; `null` se o formato é desconhecido. */
export function caixaDoQuadroAbnt(
  formato: FormatoAbnt,
  orientacao: 'retrato' | 'paisagem' = 'retrato',
  margens: Partial<MargensFolha> = {}
): CaixaMm | null {
  const dim = DIMENSOES_FOLHA[formato];
  if (!dim) return null;
  const [w, h] = orientacao === 'paisagem' ? [dim[1], dim[0]] : dim;
  const m = { ...margensAbnt(formato) };
  for (const k of ['esquerda', 'direita', 'superior', 'inferior'] as const) if (fin(margens[k]) && margens[k]! >= 0) m[k] = margens[k]!;
  return caixaDoQuadro(w, h, m);
}
