/**
 * Repositório de feições do <ui-canvas-cad>: leitura indexada e escrita (definir, adicionar, atualizar, remover, lote).
 * Responsabilidade única: manter as feições de cada camada em `CanvasLayerDef.dados.feicoes`, com índice id → posição
 * e uma regravação por operação; seleção, popup, edição e eventos são reconciliados por quem o usa (`aposDados`).
 */
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import type { Feicao } from '../../gerencigeo-canvas/feature_types';
import { normalizarFeicaoEntrada } from '../../gerencigeo-canvas/feature_adapters';
import type { DeltaFeicoes } from '../../gerencigeo-canvas/renderers/feicoes_renderer';
import {
  TIPO_CAMADA_FEICOES,
  type OpcoesCamadaFeicoes, type OpcoesLote, type LoteFeicoes, type ResultadoLote, type ResultadoFeicoes
} from './cad-feicoes-tipos';

export interface PortasRepositorio {
  obterLayerManager: () => CanvasLayerManager;
  opcoesNormalizacao: () => { aceitarOrigem: boolean };
  /** Chamado depois de cada mudança nos dados, para reconciliar seleção, edição e popup. */
  aposDados: () => void;
}

export class RepositorioFeicoes {
  /** id -> posição na lista da camada (válido enquanto `lista` for a lista atual); evita varrer a camada a cada consulta. */
  private posicoes = new Map<string, { lista: Feicao[]; pos: Map<string, number> }>();

  constructor(private p: PortasRepositorio) {}

  public lista(camadaId: string): Feicao[] {
    const dados = this.p.obterLayerManager().getLayerDef(camadaId)?.dados;
    return Array.isArray(dados?.feicoes) ? dados.feicoes : [];
  }

  private posicaoDe(camadaId: string): Map<string, number> {
    const lista = this.lista(camadaId);
    const a = this.posicoes.get(camadaId);
    if (a && a.lista === lista) return a.pos;
    const pos = new Map<string, number>();
    for (let i = 0; i < lista.length; i++) pos.set(lista[i].id, i);
    this.posicoes.set(camadaId, { lista, pos });
    return pos;
  }

  /** Feição da camada pelo id (O(1)); `undefined` se não existe. */
  public buscar(camadaId: string, id: string): Feicao | undefined {
    const lista = this.lista(camadaId);
    const i = this.posicaoDe(camadaId).get(id);
    const f = i === undefined ? undefined : lista[i];
    if (f && f.id === id) return f;
    if (i === undefined) return undefined;
    // posição velha (lista trocada por fora): refaz o índice uma vez
    this.posicoes.delete(camadaId);
    const j = this.posicaoDe(camadaId).get(id);
    return j === undefined ? undefined : lista[j];
  }

  private garantirCamada(camadaId: string, opcoes?: OpcoesCamadaFeicoes): boolean {
    const lm = this.p.obterLayerManager();
    const existente = lm.getLayerDef(camadaId);
    if (existente && existente.tipo !== TIPO_CAMADA_FEICOES) return false;

    const camada = lm.getOrCreateLayer(camadaId, TIPO_CAMADA_FEICOES, opcoes?.nome ?? camadaId);
    if (opcoes?.nome) camada.nome = opcoes.nome;
    if (opcoes?.estilo) camada.estilo = { ...camada.estilo, ...opcoes.estilo };
    if (opcoes?.interativo !== undefined) camada.interativo = opcoes.interativo;
    if (opcoes?.zIndex !== undefined) lm.setLayerZIndex(camadaId, opcoes.zIndex);
    if (opcoes?.opacidade !== undefined) lm.setLayerOpacity(camadaId, opcoes.opacidade);
    lm.ensurePanes();
    return true;
  }

  public definirFeicoes(camadaId: string, brutas: unknown[], opcoes?: OpcoesCamadaFeicoes): ResultadoFeicoes {
    if (!this.garantirCamada(camadaId, opcoes)) {
      return { aceitas: 0, recusadas: ['camada existente não é de feições'] };
    }
    const recusadas: string[] = [];
    const vistos = new Map<string, Feicao>();
    (Array.isArray(brutas) ? brutas : []).forEach((b, i) => {
      const f = normalizarFeicaoEntrada(b, camadaId, this.p.opcoesNormalizacao());
      if (f) vistos.set(f.id, f);
      else recusadas.push(String((b as { id?: unknown } | null)?.id ?? `#${i}`));
    });
    this.p.obterLayerManager().setLayerData(camadaId, { feicoes: [...vistos.values()] });
    this.p.aposDados();
    return { aceitas: vistos.size, recusadas };
  }

  public adicionarFeicao(camadaId: string, bruta: unknown, opcoes?: OpcoesCamadaFeicoes): Feicao | null {
    return this.aplicar(camadaId, { adicionar: [bruta] }, opcoes).adicionadas[0] ?? null;
  }

  /**
   * Mescla campos de primeiro nível; `estilo` e `propriedades` também são mesclados. Com `substituirPropriedades`,
   * `propriedades` informadas trocam as atuais por inteiro (atributos ausentes somem).
   */
  public atualizarFeicao(camadaId: string, id: string, parcial: Record<string, any>, opcoes?: Pick<OpcoesLote, 'substituirPropriedades'>): Feicao | null {
    return this.aplicar(camadaId, { atualizar: [{ ...parcial, id }] }, opcoes).atualizadas[0] ?? null;
  }

  /** Grava uma feição já normalizada (usado quando o próprio mapa a altera, como ao arrastar um texto). */
  public substituir(camadaId: string, feicao: Feicao): void {
    if (!this.p.obterLayerManager().getLayerDef(camadaId)) return;
    this.aplicar(camadaId, { adicionar: [feicao] });
  }

  public removerFeicao(camadaId: string, id: string): boolean {
    return this.aplicar(camadaId, { remover: [id] }).resultado.removidas > 0;
  }

  /**
   * Várias mudanças numa só regravação e num só `aposDados`: remove, depois atualiza, depois adiciona.
   * Adicionar um id que já existe substitui a feição mantendo a posição (a ordem de empilhamento não muda).
   */
  public aplicarLote(camadaId: string, lote: LoteFeicoes, opcoes?: OpcoesLote): ResultadoLote {
    return this.aplicar(camadaId, lote, opcoes).resultado;
  }

  private mesclar(atual: Feicao, parcial: Record<string, any>, camadaId: string, substituirPropriedades: boolean): Feicao | null {
    const propriedades = substituirPropriedades && parcial.propriedades && typeof parcial.propriedades === 'object'
      ? { ...parcial.propriedades }
      : { ...atual.propriedades, ...parcial.propriedades };
    return normalizarFeicaoEntrada({
      ...atual,
      ...parcial,
      id: atual.id,
      estilo: { ...atual.estilo, ...parcial.estilo },
      propriedades
    }, camadaId, this.p.opcoesNormalizacao());
  }

  private aplicar(camadaId: string, lote: LoteFeicoes, opcoes: OpcoesLote = {}): {
    resultado: ResultadoLote; adicionadas: Feicao[]; atualizadas: Feicao[];
  } {
    const resultado: ResultadoLote = { adicionadas: 0, atualizadas: 0, removidas: 0, recusadas: [] };
    const adicionadas: Feicao[] = [];
    const atualizadas: Feicao[] = [];
    const brutasAdicionar = Array.isArray(lote?.adicionar) ? lote.adicionar : [];
    const brutasAtualizar = Array.isArray(lote?.atualizar) ? lote.atualizar : [];
    const idsRemover = Array.isArray(lote?.remover) ? lote.remover : [];
    const idDe = (b: unknown, i: number): string => String((b as { id?: unknown } | null)?.id ?? `#${i}`);
    // recusadas pela ordem do lote: atualizações antes das adições
    const recusadasAdicao: string[] = [];
    const concluir = <T>(retorno: T): T => {
      resultado.recusadas.push(...recusadasAdicao);
      return retorno;
    };

    // 1. normaliza o que entra (a camada só é criada se algo válido vai entrar nela)
    const validas: Feicao[] = [];
    brutasAdicionar.forEach((b, i) => {
      const f = normalizarFeicaoEntrada(b, camadaId, this.p.opcoesNormalizacao());
      if (f) validas.push(f);
      else recusadasAdicao.push(idDe(b, i));
    });
    const lm = this.p.obterLayerManager();
    const existente = lm.getLayerDef(camadaId);
    const ehFeicoes = !existente || existente.tipo === TIPO_CAMADA_FEICOES;
    if (!ehFeicoes || (!existente && validas.length === 0)) {
      brutasAtualizar.forEach((b, i) => resultado.recusadas.push(idDe(b, i)));
      validas.forEach((f) => recusadasAdicao.push(f.id));
      return concluir({ resultado, adicionadas, atualizadas });
    }
    if (validas.length > 0 || existente) {
      if (!this.garantirCamada(camadaId, opcoes)) {
        validas.forEach((f) => recusadasAdicao.push(f.id));
        return concluir({ resultado, adicionadas, atualizadas });
      }
    }

    // 2. aplica sobre uma cópia da lista (O(N) só no `slice`); posições novas entram no índice
    const base = this.lista(camadaId);
    const pos = this.posicaoDe(camadaId);
    const nova: Array<Feicao | null> = base.slice();
    const removidasIds: string[] = [];
    const mudadas: Feicao[] = [];
    let tirouAlguma = false;

    for (const bruto of idsRemover) {
      const id = String(bruto);
      const i = pos.get(id);
      if (i === undefined || nova[i] === null) continue;
      nova[i] = null;
      removidasIds.push(id);
      resultado.removidas++;
      tirouAlguma = true;
    }
    brutasAtualizar.forEach((item, k) => {
      const id = item && typeof item === 'object' && item.id !== undefined && item.id !== null ? String(item.id) : '';
      const i = pos.get(id);
      const atual = i === undefined ? null : nova[i];
      const novo = atual ? this.mesclar(atual, item, camadaId, !!opcoes.substituirPropriedades) : null;
      if (!novo || i === undefined) {
        resultado.recusadas.push(id || idDe(item, k));
        return;
      }
      nova[i] = novo;
      mudadas.push(novo);
      atualizadas.push(novo);
      resultado.atualizadas++;
    });
    for (const f of validas) {
      const i = pos.get(f.id);
      if (i !== undefined && nova[i] !== null) {
        nova[i] = f; // id existente: substitui no lugar (mantém a ordem de empilhamento)
      } else {
        pos.set(f.id, nova.length);
        nova.push(f);
      }
      mudadas.push(f);
      adicionadas.push(f);
      resultado.adicionadas++;
    }

    if (mudadas.length === 0 && removidasIds.length === 0) return concluir({ resultado, adicionadas, atualizadas });

    // 3. uma regravação, um aposDados
    const final = tirouAlguma ? nova.filter((f): f is Feicao => f !== null) : (nova as Feicao[]);
    const delta: DeltaFeicoes = { base, mudadas, removidas: removidasIds };
    const dados: { feicoes: Feicao[]; delta?: DeltaFeicoes } = { feicoes: final, delta };
    lm.setLayerData(camadaId, dados);
    delete dados.delta; // só vale durante a sincronização (e solta a lista antiga)
    if (tirouAlguma) this.posicoes.delete(camadaId);
    else this.posicoes.set(camadaId, { lista: final, pos });
    this.p.aposDados();
    return concluir({ resultado, adicionadas, atualizadas });
  }
}
