/**
 * Linha padrão do <ui-canvas-cad>: as opções de traço que as feições desenhadas daqui para frente recebem.
 * Responsabilidade única: ler/sanear os atributos `linha-*` e as opções de `definirLinhaPadrao`, e mesclá-las no
 * estilo de desenho (que continua sendo o único estado; o conta-gotas e `definirEstiloDesenho` o alteram também).
 * Entradas são hostis: valor inválido não quebra nada, só não é aplicado (a opção volta ao padrão).
 */
import type { EstiloFeicao } from '../../gerencigeo-canvas/feature_types';
import { corSegura } from '../../gerencigeo-canvas/motor/estilo';
import { juncaoCanvas, normalizarTipoLinha, terminacaoCanvas } from '../../gerencigeo-canvas/motor/tipos-linha';
import type { OpcoesLinhaPadrao } from './tipos';

/** Atributo HTML → chave da linha padrão. */
export const ATRIBUTOS_LINHA_PADRAO = {
  'linha-cor': 'cor',
  'linha-espessura': 'espessura',
  'linha-tipo': 'tipo',
  'linha-escala': 'escala',
  'linha-tracejado': 'tracejado',
  'linha-deslocamento': 'deslocamento',
  'linha-opacidade': 'opacidade',
  'linha-terminacao': 'terminacao',
  'linha-juncao': 'juncao'
} as const satisfies Record<string, keyof OpcoesLinhaPadrao>;

export type AtributoLinhaPadrao = keyof typeof ATRIBUTOS_LINHA_PADRAO;

/** Chave da linha padrão → chave do `EstiloFeicao`. */
const PARA_ESTILO = {
  cor: 'corTraco',
  espessura: 'espessuraTraco',
  tipo: 'tipoLinha',
  escala: 'escalaTipoLinha',
  tracejado: 'dashArray',
  deslocamento: 'deslocamentoTracejado',
  opacidade: 'opacidadeTraco',
  terminacao: 'terminacaoTraco',
  juncao: 'juncaoTraco'
} as const satisfies Record<keyof OpcoesLinhaPadrao, keyof EstiloFeicao>;

const ESPESSURA_MAX = 100;
const TRACEJADO = /^\s*\d+(\.\d+)?([\s,]+\d+(\.\d+)?)*\s*$/;

export function ehAtributoLinhaPadrao(nome: string): nome is AtributoLinhaPadrao {
  return Object.prototype.hasOwnProperty.call(ATRIBUTOS_LINHA_PADRAO, nome);
}

const numero = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** Valor saneado de uma opção; `undefined` = inválido ou ausente (a opção sai do estilo de desenho). */
export function sanearOpcaoLinha(chave: keyof OpcoesLinhaPadrao, valor: unknown): EstiloFeicao[keyof EstiloFeicao] | undefined {
  if (valor === null || valor === undefined) return undefined;
  switch (chave) {
    case 'cor': {
      const c = typeof valor === 'string' ? corSegura(valor, '') : '';
      return c || undefined;
    }
    case 'espessura': {
      const n = numero(valor);
      return n !== undefined && n >= 0 ? Math.min(ESPESSURA_MAX, n) : undefined;
    }
    case 'escala': {
      const n = numero(valor);
      return n !== undefined && n > 0 ? n : undefined;
    }
    case 'deslocamento':
      return numero(valor);
    case 'opacidade': {
      const n = numero(valor);
      return n !== undefined ? Math.min(1, Math.max(0, n)) : undefined;
    }
    case 'tipo':
      return normalizarTipoLinha(valor);
    case 'tracejado':
      return typeof valor === 'string' && TRACEJADO.test(valor) ? valor.trim() : undefined;
    case 'terminacao':
      return terminacaoCanvas(valor) ? (valor as EstiloFeicao['terminacaoTraco']) : undefined;
    case 'juncao':
      return juncaoCanvas(valor) ? (valor as EstiloFeicao['juncaoTraco']) : undefined;
    default:
      return undefined;
  }
}

/**
 * Mescla `opcoes` no estilo de desenho e devolve o novo estilo (o original não é tocado). Chave presente com valor
 * `null`, `undefined` ou inválido remove a opção; chave ausente fica como está.
 */
export function mesclarLinhaPadrao(estilo: EstiloFeicao, opcoes: Partial<Record<keyof OpcoesLinhaPadrao, unknown>> | null | undefined): EstiloFeicao {
  const novo: Record<string, unknown> = { ...estilo };
  if (!opcoes || typeof opcoes !== 'object') return novo as EstiloFeicao;
  for (const chave of Object.keys(PARA_ESTILO) as Array<keyof OpcoesLinhaPadrao>) {
    if (!Object.prototype.hasOwnProperty.call(opcoes, chave)) continue;
    const v = sanearOpcaoLinha(chave, opcoes[chave]);
    if (v === undefined) delete novo[PARA_ESTILO[chave]];
    else novo[PARA_ESTILO[chave]] = v;
  }
  return novo as EstiloFeicao;
}

/** A linha padrão vista a partir do estilo de desenho (só as opções definidas). */
export function lerLinhaPadrao(estilo: EstiloFeicao): OpcoesLinhaPadrao {
  const r: Record<string, unknown> = {};
  for (const [chave, alvo] of Object.entries(PARA_ESTILO)) {
    const v = estilo[alvo];
    if (v !== undefined) r[chave] = v;
  }
  return r as OpcoesLinhaPadrao;
}

/** Atributo `linha-*` mudou: a opção correspondente, pronta para `mesclarLinhaPadrao`. */
export function opcaoDoAtributo(nome: AtributoLinhaPadrao, valor: string | null): Partial<Record<keyof OpcoesLinhaPadrao, unknown>> {
  return { [ATRIBUTOS_LINHA_PADRAO[nome]]: valor };
}
