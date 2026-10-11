import type { Feicao, StatusGeometria } from './feature_types';

/*
 * Versões de geometria: oficial × prévia.
 *
 * Uma "entidade" pode ter uma geometria oficial e uma ou mais prévias (rascunhos, propostas). A prévia
 * só aparece quando a entidade não tem oficial, ou quando foi pedida (para todas, ou só para uma).
 * A oficial sempre aparece. Feições sem `entidadeId` são a sua própria entidade (sem par, sempre visíveis).
 */

const STATUS_PREVIA = new Set(['previa', 'prévia', 'preview', 'rascunho', 'draft', 'proposta']);

/** Status da feição: o campo `status`; senão `propriedades.status` ou `propriedades.tipo_geometria`; senão oficial. */
export function statusDe(f: Feicao): StatusGeometria {
  const candidatos = [f.status, f.propriedades?.status, f.propriedades?.tipo_geometria];
  for (const c of candidatos) {
    if (typeof c === 'string' && STATUS_PREVIA.has(c.trim().toLowerCase())) return 'previa';
  }
  return 'oficial';
}

/** Identificador da entidade a que a geometria pertence. */
export function entidadeDe(f: Feicao): string {
  const e = f.entidadeId ?? f.propriedades?.entidadeId;
  return typeof e === 'string' || typeof e === 'number' ? String(e) : f.id;
}

const chave = (camadaId: string, entidade: string): string => `${camadaId}\u0000${entidade}`;

export class RegraVersoes {
  /** Mostra as prévias de todas as entidades. */
  public global = false;
  private individuais = new Set<string>();

  public alternarIndividual(camadaId: string, entidade: string): boolean {
    const k = chave(camadaId, entidade);
    if (this.individuais.has(k)) this.individuais.delete(k);
    else this.individuais.add(k);
    return this.individuais.has(k);
  }

  public definirIndividual(camadaId: string, entidade: string, ativa: boolean): void {
    const k = chave(camadaId, entidade);
    if (ativa) this.individuais.add(k);
    else this.individuais.delete(k);
  }

  public individualAtiva(camadaId: string, entidade: string): boolean {
    return this.individuais.has(chave(camadaId, entidade));
  }

  /** Entidades da camada que têm geometria oficial. */
  public static oficiais(feicoes: Iterable<Feicao>): Set<string> {
    const s = new Set<string>();
    for (const f of feicoes) if (!f.excluida && statusDe(f) === 'oficial') s.add(entidadeDe(f));
    return s;
  }

  /** A feição aparece? `comOficial` = entidades da camada com geometria oficial (ver `oficiais`). */
  public visivel(f: Feicao, comOficial: Set<string>): boolean {
    if (statusDe(f) === 'oficial') return true;
    const entidade = entidadeDe(f);
    return this.global || !comOficial.has(entidade) || this.individualAtiva(f.camadaId, entidade);
  }

  /** A prévia está sendo mostrada por pedido (global ou individual), e não só por falta de oficial? */
  public previaSolicitada(f: Feicao): boolean {
    return this.global || this.individualAtiva(f.camadaId, entidadeDe(f));
  }
}
