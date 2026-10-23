/**
 * Regra de versões (oficial × prévia) das feições do <ui-canvas-cad>.
 * Responsabilidade única: decidir o que aparece pela regra de versões, alternar prévias (global/individual)
 * e reavaliar as camadas desenhadas quando a regra muda.
 */
import type L from 'leaflet';
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import type { Feicao } from '../../gerencigeo-canvas/feature_types';
import { RegraVersoes, entidadeDe } from '../../gerencigeo-canvas/feature_versoes';
import { LayerRendererFactory } from '../../gerencigeo-canvas/layer_renderer_factory';
import type { IRenderizadorFeicoes } from '../../gerencigeo-canvas/renderers/renderizador_feicoes_tipos';
import { TIPO_CAMADA_FEICOES } from './cad-feicoes-tipos';

export interface PortasVersoes {
  obterLayerManager: () => CanvasLayerManager;
  emitir: (evento: string, detalhe: unknown) => unknown;
  buscar: (camadaId: string, id: string) => Feicao | undefined;
  lista: (camadaId: string) => Feicao[];
  /** Chamado depois que a regra muda, para reconciliar seleção, edição e popup. */
  aposDados: () => void;
}

export class VersoesFeicoes {
  private cacheOficiais = new WeakMap<Feicao[], Set<string>>();

  constructor(private p: PortasVersoes, public readonly regra: RegraVersoes) {}

  private oficiaisDe(camadaId: string): Set<string> {
    const lista = this.p.lista(camadaId);
    let s = this.cacheOficiais.get(lista);
    if (!s) {
      s = RegraVersoes.oficiais(lista);
      this.cacheOficiais.set(lista, s);
    }
    return s;
  }

  /** Aparece segundo a regra de oficial × prévia? */
  public visivelPorVersao(f: Feicao): boolean {
    // com a camada desenhada, o renderizador já mantém as entidades oficiais em dia (sem varrer a camada)
    const instancia = this.p.obterLayerManager().getLayerInstance(f.camadaId);
    const renderer = LayerRendererFactory.get(TIPO_CAMADA_FEICOES) as IRenderizadorFeicoes | undefined;
    if (instancia && renderer) return renderer.feicaoVisivel(instancia as L.LayerGroup, f);
    return this.regra.visivel(f, this.oficiaisDe(f.camadaId));
  }

  /** Vai para a tela e responde a clique, caixa, laço, snap e hover: não excluída, não oculta e visível pela regra de versões. */
  public desenhada(f: Feicao): boolean {
    return !f.excluida && !f.oculta && this.visivelPorVersao(f);
  }

  public aplicarVersoes(): void {
    const lm = this.p.obterLayerManager();
    const renderer = LayerRendererFactory.get(TIPO_CAMADA_FEICOES) as IRenderizadorFeicoes | undefined;
    for (const camada of lm.getLayers()) {
      if (camada.tipo !== TIPO_CAMADA_FEICOES) continue;
      const instancia = lm.getLayerInstance(camada.id);
      if (instancia && renderer) renderer.reavaliarVersoes(instancia as L.LayerGroup);
    }
    this.p.aposDados();
  }

  public get previasGlobais(): boolean {
    return this.regra.global;
  }

  /** Mostra (ou esconde) as prévias de todas as entidades. Prévias de entidades sem oficial aparecem sempre. */
  public definirPreviasGlobais(ligado: boolean): void {
    const v = !!ligado;
    if (this.regra.global === v) return;
    this.regra.global = v;
    this.aplicarVersoes();
    this.p.emitir('cad-previas', { global: v });
  }

  public alternarPreviasGlobais(): void {
    this.definirPreviasGlobais(!this.regra.global);
  }

  /** Liga/desliga a prévia da entidade a que a feição pertence. Devolve o novo estado, ou `null` se a feição não existe. */
  public alternarPrevia(camadaId: string, id: string): boolean | null {
    const f = this.p.buscar(camadaId, id);
    if (!f) return null;
    const entidade = entidadeDe(f);
    const ativa = this.regra.alternarIndividual(camadaId, entidade);
    this.aplicarVersoes();
    this.p.emitir('cad-previas', { camadaId, entidadeId: entidade, ativa });
    return ativa;
  }

  /** A prévia da feição está sendo mostrada por pedido (global ou individual)? */
  public previaSolicitada(camadaId: string, id: string): boolean {
    const f = this.p.buscar(camadaId, id);
    return !!f && this.regra.previaSolicitada(f);
  }

  /** Mostra o que estava escondido (camada oculta, prévia não solicitada) para a feição poder ser vista. */
  public garantirVisivel(f: Feicao): void {
    const lm = this.p.obterLayerManager();
    const camada = lm.getLayerDef(f.camadaId);
    if (camada && !camada.visivel) lm.setLayerVisibility(f.camadaId, true);
    if (!this.visivelPorVersao(f)) {
      const entidade = entidadeDe(f);
      this.regra.definirIndividual(f.camadaId, entidade, true);
      this.aplicarVersoes();
      this.p.emitir('cad-previas', { camadaId: f.camadaId, entidadeId: entidade, ativa: true });
    }
  }
}
