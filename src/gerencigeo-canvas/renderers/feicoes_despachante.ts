import type L from 'leaflet';
import type { CaixaGeo } from '../feature_indice';
import type { Feicao } from '../feature_types';
import type { CanvasLayerDef, CanvasRenderContext } from '../types';
import { FeicoesLayerRenderer } from './feicoes_renderer';
import { FeicoesCanvasRenderer } from './feicoes_canvas_renderer';
import type { EstatisticasFeicoes, IRenderizadorFeicoes } from './renderizador_feicoes_tipos';

/*
 * Renderizador registrado para o tipo de camada `feicoes`. Escolhe, a cada `render`, o caminho `leaflet` (um objeto
 * Leaflet por feição) ou `canvas` (motor + Canvas 2D) conforme o atributo `renderizador` do componente, lido pelo
 * contexto de renderização, e lembra qual escolheu para cada grupo. O resto do kit fala só com o contrato comum.
 */

export type ModoRenderizador = 'leaflet' | 'canvas';

/** `renderizador` inválido ou ausente cai em `leaflet` (padrão até a Fase 4 do motor de formas). */
export function lerModoRenderizador(valor: string | null | undefined): ModoRenderizador {
  return String(valor ?? '').trim().toLowerCase() === 'canvas' ? 'canvas' : 'leaflet';
}

export class DespachanteFeicoes implements IRenderizadorFeicoes {
  private roteamento = new WeakMap<object, IRenderizadorFeicoes>();

  constructor(
    public readonly leaflet: IRenderizadorFeicoes = new FeicoesLayerRenderer(),
    public readonly canvas: IRenderizadorFeicoes = new FeicoesCanvasRenderer()
  ) {}

  private modo(context: CanvasRenderContext): ModoRenderizador {
    try {
      return lerModoRenderizador(context.renderizador?.());
    } catch {
      return 'leaflet';
    }
  }

  private de(grupo: object): IRenderizadorFeicoes {
    return this.roteamento.get(grupo) ?? this.leaflet;
  }

  /** Qual caminho desenha este grupo? */
  public modoDe(grupo: object): ModoRenderizador {
    return this.roteamento.get(grupo) === this.canvas ? 'canvas' : 'leaflet';
  }

  public render(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext): L.Layer | L.LayerGroup | null {
    const impl = this.modo(context) === 'canvas' ? this.canvas : this.leaflet;
    const grupo = impl.render(layerDef, map, context);
    if (grupo) this.roteamento.set(grupo, impl);
    return grupo;
  }

  public update(layerDef: CanvasLayerDef, grupo: L.Layer | L.LayerGroup, changes: Partial<CanvasLayerDef>, context: CanvasRenderContext, map: L.Map): void {
    this.de(grupo).update(layerDef, grupo, changes, context, map);
  }

  public destroy(grupo: L.Layer | L.LayerGroup, map: L.Map): void {
    this.de(grupo).destroy(grupo, map);
    this.roteamento.delete(grupo);
  }

  public reavaliarVersoes(grupo: L.LayerGroup): void {
    this.de(grupo).reavaliarVersoes(grupo);
  }

  public feicaoVisivel(grupo: L.LayerGroup, f: Feicao): boolean {
    return this.de(grupo).feicaoVisivel(grupo, f);
  }

  public consultarProximas(grupo: L.LayerGroup, caixa: CaixaGeo): Feicao[] {
    return this.de(grupo).consultarProximas(grupo, caixa);
  }

  public previsualizar(grupo: L.LayerGroup, f: Feicao): void {
    this.de(grupo).previsualizar(grupo, f);
  }

  public estatisticas(grupo: L.LayerGroup): EstatisticasFeicoes | null {
    const e = this.de(grupo).estatisticas(grupo);
    return e ? { renderizador: this.modoDe(grupo), ...e } : null;
  }

  public idsDesenhados(grupo: L.LayerGroup): { materializadas: string[]; marcas: string[] } | null {
    return this.de(grupo).idsDesenhados(grupo);
  }

  public aplicarSelecao(grupo: L.LayerGroup, ids: Set<string>): void {
    this.de(grupo).aplicarSelecao(grupo, ids);
  }
}
