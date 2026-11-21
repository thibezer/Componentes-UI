import { Historico } from '../../gerencigeo-canvas/feature_historico';
import { IndicePrancha } from '../../gerencigeo-canvas/prancha/elemento_consulta';
import { analisarElemento, normalizarElementos } from '../../gerencigeo-canvas/prancha/elemento_validacao';
import type { ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import type { LotePrancha, ResultadoLotePrancha } from './tipos';

/*
 * Documento da prancha (sem DOM): a lista de elementos na ordem de empilhamento, o índice espacial, a seleção e o
 * histórico de desfazer/refazer (instantâneos da lista inteira, com partilha estrutural: elementos inalterados são os
 * mesmos objetos). Toda mudança passa por `substituir`, que mantém índice e seleção coerentes e devolve a diferença.
 */

export interface DiferencaDocumento {
  adicionados: ElementoGrafico[];
  atualizados: ElementoGrafico[];
  removidos: ElementoGrafico[];
}

export type ModoSelecao = 'substituir' | 'adicionar' | 'alternar' | 'remover';

export interface OpcoesSubstituir {
  /** Entra no histórico (padrão: sim). */
  registrar?: boolean;
  /** Rajada: mudanças seguidas com a mesma chave viram um passo. */
  chave?: string;
  agora?: number;
}

/** O que mudou de `antes` para `depois` (por id; mesma referência = inalterado). */
export function diferenca(antes: readonly ElementoGrafico[], depois: readonly ElementoGrafico[]): DiferencaDocumento {
  const a = new Map(antes.map((e) => [e.id, e]));
  const d = new Map(depois.map((e) => [e.id, e]));
  const r: DiferencaDocumento = { adicionados: [], atualizados: [], removidos: [] };
  for (const [id, el] of d) {
    const velho = a.get(id);
    if (!velho) r.adicionados.push(el);
    else if (velho !== el) r.atualizados.push(el);
  }
  for (const [id, el] of a) if (!d.has(id)) r.removidos.push(el);
  return r;
}

export const diferencaVazia = (d: DiferencaDocumento): boolean => d.adicionados.length + d.atualizados.length + d.removidos.length === 0;

export class DocumentoPrancha {
  private lista: readonly ElementoGrafico[] = [];
  private porId = new Map<string, ElementoGrafico>();
  private posicoes = new Map<string, number>();
  private _selecao: string[] = [];
  public readonly indice = new IndicePrancha();
  public readonly historico = new Historico<readonly ElementoGrafico[]>({ limite: 100, janelaRajadaMs: 1000 });
  /** Contador de mudanças do documento (carga, edição, desfazer/refazer, renomear): base do `modificado` do componente. */
  public revisao = 0;
  private ouvinteMudanca: (() => void) | null = null;

  /** Registra quem é avisado depois de cada mudança do documento (o componente avalia o `modificado`). */
  public ouvirMudancas(f: (() => void) | null): void {
    this.ouvinteMudanca = f;
  }

  private mudou(): void {
    this.revisao++;
    try { this.ouvinteMudanca?.(); } catch { /* o aviso não pode derrubar a edição */ }
  }

  public get elementos(): readonly ElementoGrafico[] {
    return this.lista;
  }

  public obter(id: string): ElementoGrafico | undefined {
    return this.porId.get(id);
  }

  public get selecao(): readonly string[] {
    return this._selecao;
  }

  public elementosSelecionados(): ElementoGrafico[] {
    return this._selecao.map((id) => this.porId.get(id)).filter((e): e is ElementoGrafico => !!e);
  }

  /** Troca tudo (carga de documento): normaliza, recomeça o histórico e limpa a seleção. */
  public definir(bruto: unknown): ReturnType<typeof normalizarElementos> {
    const r = normalizarElementos(bruto);
    this.aplicar(r.elementos);
    this.indice.definir(r.elementos);
    this.historico.limpar();
    this._selecao = [];
    this.mudou();
    return r;
  }

  private aplicar(nova: readonly ElementoGrafico[]): void {
    this.lista = nova;
    this.porId = new Map(nova.map((e) => [e.id, e]));
    this.posicoes = new Map(nova.map((e, i) => [e.id, i]));
  }

  /** Os elementos na ordem da lista do documento (o índice espacial devolve em outra ordem). */
  public naOrdemDoDocumento(els: readonly ElementoGrafico[]): ElementoGrafico[] {
    return [...els].sort((a, b) => (this.posicoes.get(a.id) ?? 0) - (this.posicoes.get(b.id) ?? 0));
  }

  /** Mudança central: grava o passo no histórico, atualiza índice e seleção e devolve a diferença. */
  public substituir(nova: readonly ElementoGrafico[], opcoes: OpcoesSubstituir = {}): DiferencaDocumento {
    const antes = this.lista;
    const dif = diferenca(antes, nova);
    if (diferencaVazia(dif) && antes.length === nova.length && antes.every((e, i) => e === nova[i])) return dif;
    if (opcoes.registrar !== false) this.historico.registrar(antes, { chave: opcoes.chave, agora: opcoes.agora });
    this.aplicar(nova);
    this.sincronizarIndice(dif);
    this._selecao = this._selecao.filter((id) => this.porId.has(id));
    this.mudou();
    return dif;
  }

  private sincronizarIndice(dif: DiferencaDocumento): void {
    for (const el of dif.removidos) this.indice.remover(el.id);
    const mudados = [...dif.adicionados, ...dif.atualizados];
    if (mudados.length > 0) this.indice.atualizarVarios(mudados);
  }

  /** Aplica o lote do app (normalizado; ids repetidos e inválidos recusados). */
  public aplicarLote(lote: LotePrancha, registrar = true): { resultado: ResultadoLotePrancha; diferenca: DiferencaDocumento } {
    const resultado: ResultadoLotePrancha = { adicionados: [], atualizados: [], removidos: [], recusados: [] };
    const mapa = new Map(this.lista.map((e) => [e.id, e]));
    const ordem = this.lista.map((e) => e.id);
    const remover = new Set((Array.isArray(lote?.remover) ? lote.remover : []).filter((id) => typeof id === 'string'));
    for (const id of remover) {
      if (mapa.delete(id)) resultado.removidos.push(id);
    }
    const tratar = (itens: unknown, modo: 'adicionar' | 'atualizar'): void => {
      if (!Array.isArray(itens)) return;
      itens.forEach((bruto, indice) => {
        const el = analisarElemento(bruto);
        if (typeof el === 'string') {
          resultado.recusados.push({ indice, motivo: el });
          return;
        }
        const existe = mapa.has(el.id);
        if (modo === 'adicionar' && existe) { resultado.recusados.push({ indice, id: el.id, motivo: 'id-duplicado' }); return; }
        if (modo === 'atualizar' && !existe) { resultado.recusados.push({ indice, id: el.id, motivo: 'id-invalido' }); return; }
        if (modo === 'adicionar') ordem.push(el.id);
        mapa.set(el.id, el);
        (modo === 'adicionar' ? resultado.adicionados : resultado.atualizados).push(el.id);
      });
    };
    tratar(lote?.adicionar, 'adicionar');
    tratar(lote?.atualizar, 'atualizar');
    const vistos = new Set<string>();
    const nova: ElementoGrafico[] = [];
    for (const id of ordem) {
      const el = mapa.get(id);
      if (el && !vistos.has(id)) { vistos.add(id); nova.push(el); }
    }
    return { resultado, diferenca: this.substituir(nova, { registrar }) };
  }

  public desfazer(): DiferencaDocumento | null {
    const anterior = this.historico.desfazer(this.lista);
    return anterior ? this.restaurar(anterior) : null;
  }

  public refazer(): DiferencaDocumento | null {
    const proximo = this.historico.refazer(this.lista);
    return proximo ? this.restaurar(proximo) : null;
  }

  private restaurar(estado: readonly ElementoGrafico[]): DiferencaDocumento {
    const dif = diferenca(this.lista, estado);
    this.aplicar(estado);
    this.sincronizarIndice(dif);
    this._selecao = this._selecao.filter((id) => this.porId.has(id));
    this.mudou();
    return dif;
  }

  /** Troca o id de um elemento em tudo (lista, índice, seleção e histórico). `false` se não existe ou o novo já existe. */
  public renomear(antigo: string, novo: string): boolean {
    if (typeof novo !== 'string' || !novo.trim() || !this.porId.has(antigo) || this.porId.has(novo)) return false;
    const trocar = (lista: readonly ElementoGrafico[]): readonly ElementoGrafico[] => lista.map((e) => (e.id === antigo ? { ...e, id: novo } : e));
    const nova = trocar(this.lista);
    this.indice.remover(antigo);
    this.aplicar(nova);
    this.indice.atualizar(this.porId.get(novo)!);
    this.historico.transformar(trocar);
    this._selecao = this._selecao.map((id) => (id === antigo ? novo : id));
    this.mudou();
    return true;
  }

  /** Muda a seleção; devolve se mudou. Só ids existentes, não bloqueados nem ocultos, sem repetição, na ordem dada. */
  public selecionar(ids: readonly string[], modo: ModoSelecao = 'substituir'): boolean {
    const validos = ids.filter((id, i) => {
      const el = this.porId.get(id);
      return !!el && !el.bloqueado && !el.oculto && ids.indexOf(id) === i;
    });
    const atual = this._selecao;
    let nova: string[];
    if (modo === 'substituir') nova = validos;
    else if (modo === 'adicionar') nova = [...atual, ...validos.filter((id) => !atual.includes(id))];
    else if (modo === 'remover') nova = atual.filter((id) => !validos.includes(id));
    else nova = [...atual.filter((id) => !validos.includes(id)), ...validos.filter((id) => !atual.includes(id))];
    const mudou = nova.length !== atual.length || nova.some((id, i) => id !== atual[i]);
    if (mudou) this._selecao = nova;
    return mudou;
  }
}
