import type { Feicao } from '../feature_types';
import type { LayerStyleDef } from '../types';
import { statusDe } from '../feature_versoes';

/*
 * Estilo visual de uma feição, resolvido em valores simples (sem Leaflet). O renderizador Leaflet monta as opções de
 * `L.Path` a partir disto e o renderizador Canvas pinta direto: os dois caminhos concordam por construção.
 */

export const COR_PADRAO = '#38bdf8';
export const COR_SELECAO = '#38bdf8';
const COR_SEGURA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([0-9.,%\s\/-]+\)|[a-z]{3,20})$/i;

/** Cores vão para atributos style/canvas; só passam formatos conhecidos (hex, rgb/hsl, nome). */
export function corSegura(cor: string | undefined, padrao: string): string {
  return typeof cor === 'string' && COR_SEGURA.test(cor.trim()) ? cor.trim() : padrao;
}

const numeroFinito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export interface EstiloVetor {
  /** Cor do traço (contorno). */
  cor: string;
  /** Desenha o traço? (`espessuraContorno: 0` em ponto o desliga). */
  traco: boolean;
  peso: number;
  /** `dashArray` do Leaflet/SVG ("6 4"), ou `undefined` para linha contínua. */
  dash: string | undefined;
  preencher: boolean;
  corPreenchimento: string;
  opacidadePreenchimento: number;
}

/** Estilo de uma feição vetorial (polígono, círculo, linha ou ponto sem ícone). */
export function estiloVetorDe(f: Feicao, camada: LayerStyleDef, selecionada = false): EstiloVetor {
  const e = f.estilo ?? {};
  const cor = corSegura(e.corTraco ?? camada.corPrimaria, COR_PADRAO);
  const tipo = f.geometria.tipo;
  const area = tipo === 'Polygon' || tipo === 'Circle';
  const ponto = tipo === 'Point';
  // ponto sem ícone: o contorno pode ter cor e espessura próprias
  const corContorno = ponto ? corSegura(e.corContorno, '') || cor : cor;
  const pesoContorno = ponto && numeroFinito(e.espessuraContorno) && e.espessuraContorno >= 0 ? e.espessuraContorno : undefined;
  const pesoBase = pesoContorno ?? (numeroFinito(e.espessuraTraco) ? e.espessuraTraco : undefined) ?? (numeroFinito(camada.espessuraLinha) ? camada.espessuraLinha : 2);
  const opacidade = numeroFinito(e.opacidadePreenchimento) ? e.opacidadePreenchimento : area ? 0.2 : 0.85;
  return {
    cor: selecionada ? COR_SELECAO : corContorno,
    traco: !(pesoContorno === 0 && !selecionada),
    peso: selecionada ? pesoBase + 2 : pesoBase,
    dash: e.dashArray ?? (statusDe(f) === 'previa' ? '6 4' : camada.dashArray),
    preencher: area || ponto,
    corPreenchimento: corSegura(e.corPreenchimento, cor),
    opacidadePreenchimento: selecionada ? Math.min(1, opacidade + 0.18) : opacidade
  };
}

/** Raio, em px, do círculo de um ponto sem ícone. */
export function raioPontoPx(f: Feicao, camada: LayerStyleDef): number {
  const bruto = f.estilo?.tamanhoIcone ?? camada.tamanhoMarcador ?? 8;
  return (numeroFinito(bruto) && bruto > 0 ? bruto : 8) / 2;
}

/** Interna estilos iguais: o renderizador agrupa por identidade do objeto (um fill/stroke por estilo). */
export class InternadorEstilos {
  private porChave = new Map<string, EstiloVetor>();

  public interno(e: EstiloVetor): EstiloVetor {
    const k = `${e.cor}|${e.traco ? 1 : 0}|${e.peso}|${e.dash ?? ''}|${e.preencher ? 1 : 0}|${e.corPreenchimento}|${e.opacidadePreenchimento}`;
    const atual = this.porChave.get(k);
    if (atual) return atual;
    this.porChave.set(k, e);
    return e;
  }

  public limpar(): void {
    this.porChave.clear();
  }
}
