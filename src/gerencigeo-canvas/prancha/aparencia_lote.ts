import { contornoLocalEmCache } from './elemento_geometria';
import { aparenciaDe, ESPESSURA_TRACO_PADRAO_MM } from './aparencia_estilo';
import { ESTILOS_TRACO, TIPO_LINHA_DO_ESTILO, type EstiloTraco } from './elemento_predefinicoes';
import type { AparenciaElemento, ElementoGrafico, PreenchimentoElemento, TracoElemento } from './tipos';
import type { TipoLinha } from '../motor/tipos-linha';

/*
 * Aparência em lote e leitura resumida (L2, puras): o que o painel de propriedades de um item faz ao editar TODOS os
 * elementos de um desenho de uma vez, e o que ele lê para mostrar o valor (ou "misto").
 */

/** Inverso de `TIPO_LINHA_DO_ESTILO`: tipo de linha CAD → estilo da pré-definição. */
export const ESTILO_DO_TIPO_LINHA: Readonly<Partial<Record<TipoLinha, EstiloTraco>>> = Object.freeze(
  Object.fromEntries(ESTILOS_TRACO.map((e) => [TIPO_LINHA_DO_ESTILO[e], e])) as Partial<Record<TipoLinha, EstiloTraco>>
);

export interface AjusteAparencia {
  corTraco?: string;
  /** mm; absoluta ou proporcional (ver `OpcoesAparenciaLote`). */
  espessura?: number;
  estiloTraco?: EstiloTraco;
  opacidadeTraco?: number;
  corPreenchimento?: string;
  opacidadePreenchimento?: number;
  /** Remove o traço (`traco: null`); vence os demais campos de traço. */
  semTraco?: boolean;
  /** Remove o preenchimento (`preenchimento: null`); vence os demais campos de preenchimento. */
  semPreenchimento?: boolean;
}

export interface OpcoesAparenciaLote {
  /**
   * `'absoluta'` (padrão): todos os traços recebem `espessura`. `'proporcional'`: `espessura` é a do 1º traço do lote e os
   * demais mantêm a RAZÃO com ela (a moldura dupla conserva a proporção entre as linhas).
   */
  espessura?: 'absoluta' | 'proporcional';
}

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const entre01 = (n: unknown): number | null => (fin(n) ? Math.min(1, Math.max(0, n)) : null);
const ehTexto = (el: ElementoGrafico): boolean => el.geometria?.tipo === 'texto';
const ehFechada = (el: ElementoGrafico): boolean => !ehTexto(el) && contornoLocalEmCache(el.geometria)?.tipo === 'Polygon';

/** Primeiro traço (resolvido) do lote, fora texto e máscaras: a referência da espessura proporcional. */
function espessuraDeReferencia(lista: readonly ElementoGrafico[]): number | null {
  for (const el of lista) {
    if (el.mascara || ehTexto(el)) continue;
    const t = aparenciaDe(el).traco;
    if (t) return t.largura;
  }
  return null;
}

/**
 * Aplica o ajuste a todos os elementos e devolve a lista nova (o que não muda mantém a MESMA referência). Regras:
 * elementos `mascara` ficam intactos; só formas fechadas ganham preenchimento novo (texto só muda a cor/opacidade que já
 * tem); traço novo nasce onde não há quando o ajuste pede um traço; `semTraco` vira `traco: null`. Valores inválidos
 * (NaN, espessura ≤ 0) são ignorados. Nunca lança.
 */
export function ajustarAparenciaEmLote(elementos: readonly ElementoGrafico[], ajuste: AjusteAparencia, opcoes: OpcoesAparenciaLote = {}): ElementoGrafico[] {
  const lista = Array.isArray(elementos) ? elementos.filter((e) => e && typeof e === 'object') : [];
  if (!ajuste || typeof ajuste !== 'object') return [...lista];
  const espessuraNova = fin(ajuste.espessura) && ajuste.espessura > 0 ? ajuste.espessura : null;
  const ref = opcoes.espessura === 'proporcional' && espessuraNova !== null ? espessuraDeReferencia(lista) : null;
  const fator = ref !== null && ref > 0 && espessuraNova !== null ? espessuraNova / ref : null;
  const estilo = ajuste.estiloTraco && ESTILOS_TRACO.includes(ajuste.estiloTraco) ? ajuste.estiloTraco : null;
  const opTraco = entre01(ajuste.opacidadeTraco);
  const opPreench = entre01(ajuste.opacidadePreenchimento);
  const pedeTraco = !!(ajuste.corTraco || espessuraNova !== null || estilo || opTraco !== null);
  const pedePreench = !!(ajuste.corPreenchimento || opPreench !== null);

  return lista.map((el) => {
    if (el.mascara) return el;
    const texto = ehTexto(el);
    const ap: AparenciaElemento = { ...(el.aparencia ?? {}) };
    let mudou = false;

    // traço (texto não tem)
    if (!texto) {
      if (ajuste.semTraco) {
        if (ap.traco !== null) { ap.traco = null; mudou = true; }
      } else if (pedeTraco) {
        const existente = ap.traco === null ? null : aparenciaDe(el).traco;
        const base: TracoElemento = ap.traco ? { ...ap.traco } : {};
        if (ajuste.corTraco) base.cor = ajuste.corTraco;
        if (espessuraNova !== null) {
          const atual = existente ? existente.largura : null;
          base.espessura = fator !== null && atual !== null ? atual * fator : espessuraNova;
        } else if (!existente) base.espessura = ESPESSURA_TRACO_PADRAO_MM;
        if (estilo) base.tipoLinha = TIPO_LINHA_DO_ESTILO[estilo];
        if (opTraco !== null) base.opacidade = opTraco;
        ap.traco = base;
        mudou = true;
      }
    }

    // preenchimento
    if (ajuste.semPreenchimento) {
      if (!texto && ap.preenchimento !== null) { ap.preenchimento = null; mudou = true; }
    } else if (pedePreench) {
      const tem = ap.preenchimento !== null && ap.preenchimento !== undefined ? true : (texto && ap.preenchimento === undefined);
      if (tem || (!texto && ehFechada(el) && ajuste.corPreenchimento)) {
        const base: PreenchimentoElemento = { ...(ap.preenchimento ?? {}) };
        if (ajuste.corPreenchimento) { base.cor = ajuste.corPreenchimento; if (!texto) delete base.gradiente; }
        if (opPreench !== null) base.opacidade = opPreench;
        ap.preenchimento = base;
        mudou = true;
      }
    }
    return mudou ? { ...el, aparencia: ap } : el;
  });
}

export interface ResumoAparencia {
  traco: { cor: string; espessura: number; estilo: EstiloTraco } | 'misto' | null;
  preenchimento: { cor: string; opacidade: number } | 'misto' | null;
}

const igual = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

/**
 * Lê a aparência do conjunto: o valor único, `'misto'` quando há diferença (ou quando só parte tem traço/preenchimento),
 * ou `null` quando ninguém tem. Considera a aparência RESOLVIDA (os padrões entram); ignora máscaras, e o traço também
 * ignora texto. O preenchimento só olha formas fechadas e texto.
 */
export function resumirAparencia(elementos: readonly ElementoGrafico[]): ResumoAparencia {
  const lista = (Array.isArray(elementos) ? elementos : []).filter((e) => e && typeof e === 'object' && !e.mascara);
  let traco: ResumoAparencia['traco'] = null;
  let tracoSeen = 0, tracoTotal = 0;
  let preench: ResumoAparencia['preenchimento'] = null;
  let preenchSeen = 0, preenchTotal = 0;
  for (const el of lista) {
    const ap = aparenciaDe(el);
    if (!ehTexto(el)) {
      tracoTotal++;
      if (ap.traco) {
        tracoSeen++;
        const v = { cor: ap.traco.cor, espessura: ap.traco.largura, estilo: ESTILO_DO_TIPO_LINHA[(el.aparencia?.traco?.tipoLinha ?? 'continua') as TipoLinha] ?? 'continuo' as EstiloTraco };
        if (traco === null) traco = v;
        else if (traco !== 'misto' && (traco.cor !== v.cor || !igual(traco.espessura, v.espessura) || traco.estilo !== v.estilo)) traco = 'misto';
      }
    }
    if (ehTexto(el) || ehFechada(el)) {
      preenchTotal++;
      if (ap.preenchimento) {
        preenchSeen++;
        const v = { cor: ap.preenchimento.cor, opacidade: ap.preenchimento.opacidade };
        if (preench === null) preench = v;
        else if (preench !== 'misto' && (preench.cor !== v.cor || !igual(preench.opacidade, v.opacidade))) preench = 'misto';
      }
    }
  }
  if (tracoSeen > 0 && tracoSeen < tracoTotal) traco = 'misto';
  if (preenchSeen > 0 && preenchSeen < preenchTotal) preench = 'misto';
  return { traco, preenchimento: preench };
}
