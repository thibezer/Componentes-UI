import type { Feicao } from '../feature_types';
import { IndiceEspacial } from '../feature_indice';
import { entidadeDe, statusDe } from '../feature_versoes';
import type { DeltaMotor, RegraVisivel } from './tipos';

/*
 * Dados de UMA camada de feições no motor: loja por id, índice espacial, regra oficial × prévia e seleção.
 * Mesma contabilidade do renderizador Leaflet (que a faz embutida no estado dele), isolada e sem DOM:
 * mudar uma feição custa O(1) e a camada só é refeita quando o CONJUNTO desenhado muda.
 */

/** Mudança em mais que esta fração da camada: remonta o índice em vez de atualizar item a item. */
const FRACAO_REMONTAR_INDICE = 0.3;

/** Feição minimamente utilizável: id e tipo de geometria (o resto é validado a cada uso, sem lançar). */
const utilizavel = (f: Feicao | null | undefined): f is Feicao =>
  !!f && typeof f.id === 'string' && !!f.geometria && typeof f.geometria.tipo === 'string';

export interface ResultadoMudanca {
  mudadas: string[];
  removidas: string[];
  /** O conjunto de entidades com oficial mudou (com prévias na camada): a visibilidade de outras feições pode mudar. */
  oficiaisMudou: boolean;
}

export class DadosCamada {
  public readonly loja = new Map<string, Feicao>();
  public readonly indice = new IndiceEspacial();
  /** Muda a cada alteração dos dados (invalida cache de geometria por feição). */
  public revisao = 0;
  /** Muda quando o agrupamento e a contagem de pontos precisam ser refeitos do zero. */
  public revisaoBase = 0;
  public listaSincronizada: Feicao[] | null = null;
  /** Entidades com geometria oficial, e quantas oficiais cada uma tem. */
  public oficiais = new Set<string>();
  private contOficiais = new Map<string, number>();
  /** Entidade -> quantas prévias (entidade com oficial E prévia forma um par: sempre em detalhe completo). */
  public contPrevias = new Map<string, number>();
  public nPrevias = 0;
  public readonly selecionadas = new Set<string>();
  public regra: RegraVisivel | null = null;
  /** Revisão por feição (id → número crescente): chave do cache de geometria projetada. */
  private revisaoDe = new Map<string, number>();
  private contador = 0;

  public revisaoDaFeicao(id: string): number {
    return this.revisaoDe.get(id) ?? 0;
  }

  /** Aparece segundo a regra (não oculta e visível por versão)? */
  public desenhavel(f: Feicao): boolean {
    if (f.oculta) return false;
    return !this.regra || this.regra(f, this.oficiais);
  }

  /** Visível pela regra de versões (ignora `oculta`: o hit-test e a seleção seguem regras próprias). */
  public visivelPorVersao(f: Feicao): boolean {
    return !this.regra || this.regra(f, this.oficiais);
  }

  /** Troca total: diferencia contra a loja, mantém o índice e a contabilidade de versões. */
  public sincronizar(lista: Feicao[]): ResultadoMudanca {
    const novas = lista.filter((f) => utilizavel(f) && !f.excluida);
    const mudadas = new Set<string>();
    const vistos = new Set<string>();
    for (const f of novas) {
      vistos.add(f.id);
      if (this.loja.get(f.id) !== f) mudadas.add(f.id);
    }
    const removidas = [...this.loja.keys()].filter((id) => !vistos.has(id));

    if (mudadas.size > 0 || removidas.length > 0) {
      this.revisao++;
      this.revisaoBase++;
      if (this.loja.size === 0 || mudadas.size + removidas.length > novas.length * FRACAO_REMONTAR_INDICE) {
        this.indice.construir(novas);
      } else {
        for (const f of novas) if (mudadas.has(f.id)) this.indice.atualizar(f);
        for (const id of removidas) this.indice.remover(id);
      }
      this.loja.clear();
      for (const f of novas) this.loja.set(f.id, f); // id duplicado: vale a última
      for (const id of removidas) this.revisaoDe.delete(id);
      for (const id of mudadas) this.revisaoDe.set(id, ++this.contador);
      this.recontarOficiais();
    }
    this.listaSincronizada = lista;
    for (const id of [...this.selecionadas]) if (!vistos.has(id)) this.selecionadas.delete(id);
    return { mudadas: [...mudadas], removidas, oficiaisMudou: false };
  }

  private recontarOficiais(): void {
    this.contOficiais = new Map();
    this.contPrevias = new Map();
    this.nPrevias = 0;
    for (const f of this.loja.values()) {
      if (statusDe(f) !== 'oficial') {
        this.nPrevias++;
        const e = entidadeDe(f);
        this.contPrevias.set(e, (this.contPrevias.get(e) ?? 0) + 1);
        continue;
      }
      const e = entidadeDe(f);
      this.contOficiais.set(e, (this.contOficiais.get(e) ?? 0) + 1);
    }
    this.oficiais = new Set(this.contOficiais.keys());
  }

  /** Aplica só a diferença. Devolve `null` se o delta não parte da lista sincronizada (então use `sincronizar`). */
  public aplicarDelta(lista: Feicao[], delta: DeltaMotor): ResultadoMudanca | null {
    if (!delta || delta.base !== this.listaSincronizada) return null;
    // entidade -> tinha oficial antes do delta? (uma troca passa por 0 oficiais sem que o conjunto realmente mude)
    const tinhaOficial = new Map<string, boolean>();
    const contar = (f: Feicao | undefined, d: 1 | -1): void => {
      if (!f || f.excluida || statusDe(f) !== 'oficial') return;
      const e = entidadeDe(f);
      if (!tinhaOficial.has(e)) tinhaOficial.set(e, this.oficiais.has(e));
      const n = (this.contOficiais.get(e) ?? 0) + d;
      if (n <= 0) {
        this.contOficiais.delete(e);
        this.oficiais.delete(e);
      } else {
        this.contOficiais.set(e, n);
        this.oficiais.add(e);
      }
    };
    const contarPrevia = (f: Feicao, d: 1 | -1): void => {
      const e = entidadeDe(f);
      const n = (this.contPrevias.get(e) ?? 0) + d;
      if (n <= 0) this.contPrevias.delete(e);
      else this.contPrevias.set(e, n);
    };

    const idsMudados: string[] = [];
    const idsRemovidos: string[] = [];
    const tirar = (id: string): void => {
      const antiga = this.loja.get(id);
      if (!antiga) return;
      if (statusDe(antiga) === 'previa') {
        this.nPrevias--;
        contarPrevia(antiga, -1);
      }
      contar(antiga, -1);
      this.loja.delete(id);
      this.indice.remover(id);
      this.selecionadas.delete(id);
      this.revisaoDe.delete(id);
      idsRemovidos.push(id);
    };
    for (const id of delta.removidas ?? []) tirar(id);
    for (const f of delta.mudadas ?? []) {
      if (!utilizavel(f)) continue;
      if (f.excluida) {
        tirar(f.id);
        continue;
      }
      const antiga = this.loja.get(f.id);
      if (statusDe(f) === 'previa') {
        this.nPrevias++;
        contarPrevia(f, 1);
      }
      if (antiga) {
        if (statusDe(antiga) === 'previa') {
          this.nPrevias--;
          contarPrevia(antiga, -1);
        }
        contar(antiga, -1);
      }
      this.loja.set(f.id, f);
      this.indice.atualizar(f);
      contar(f, 1);
      this.revisaoDe.set(f.id, ++this.contador);
      idsMudados.push(f.id);
    }

    let oficiaisMudou = false;
    if (this.nPrevias > 0) for (const [e, tinha] of tinhaOficial) if (tinha !== this.oficiais.has(e)) oficiaisMudou = true;
    this.listaSincronizada = lista;
    this.revisao++;
    if (oficiaisMudou) this.revisaoBase++;
    return { mudadas: idsMudados, removidas: idsRemovidos, oficiaisMudou };
  }
}
