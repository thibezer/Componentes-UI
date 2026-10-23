/**
 * Edição de vértices das feições do <ui-canvas-cad>.
 * Responsabilidade única: validar e iniciar o `EditorVertices` (L2), gravar os gestos e encerrar a edição;
 * seleção, popup, snap e desenho entram pelas `PortasEdicao`.
 */
import type L from 'leaflet';
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import type { Feicao } from '../../gerencigeo-canvas/feature_types';
import type { RefFeicao } from '../../gerencigeo-canvas/feature_selecao';
import { EditorVertices } from '../../gerencigeo-canvas/feature_editor_vertices';
import { verificarEditavel } from '../../gerencigeo-canvas/feature_edicao_ops';
import { LayerRendererFactory } from '../../gerencigeo-canvas/layer_renderer_factory';
import type { IRenderizadorFeicoes } from '../../gerencigeo-canvas/renderers/renderizador_feicoes_tipos';
import type { ExcluirSnap } from '../../gerencigeo-canvas/feature_snap';
import { TIPO_CAMADA_FEICOES, type ResultadoEdicao } from './cad-feicoes-tipos';

export interface PortasEdicao {
  obterMapa: () => L.Map | null;
  obterLayerManager: () => CanvasLayerManager;
  emitir: (evento: string, detalhe: unknown) => unknown;
  buscar: (camadaId: string, id: string) => Feicao | undefined;
  substituir: (camadaId: string, feicao: Feicao) => void;
  desativarFerramenta: () => void;
  aplicarMargensHud: () => void;
  selecionarUma: (ref: RefFeicao) => void;
  fecharPopup: () => void;
  /** Depois da edição: o popup volta se a seleção tem exatamente uma feição. */
  reabrirPopupDaSelecao: () => void;
  snapAtivo: () => boolean;
  alternarSnap: () => void;
  buscarSnapEm: (coord: [number, number], excluir?: ExcluirSnap) => ReturnType<typeof import('../../gerencigeo-canvas/feature_snap').buscarSnap>;
}

export class EdicaoFeicoes {
  private editor: EditorVertices | null = null;

  constructor(private p: PortasEdicao) {}

  public get editando(): boolean {
    return !!this.editor?.ativo;
  }

  /** @internal Editor de vértices da camada L2 (`null` fora da edição). */
  public get editorAtual(): EditorVertices | null {
    return this.editor;
  }

  /** Feição em edição (`null` fora da edição). */
  public get feicao(): Feicao | null {
    return this.editor?.ativo ? this.editor.feicao : null;
  }

  public sincronizar(feicao: Feicao): void {
    this.editor?.sincronizar(feicao);
  }

  public atualizarSnapNoHud(): void {
    this.editor?.atualizarSnapNoHud();
  }

  public iniciarEdicao(camadaId: string, id: string): ResultadoEdicao {
    const f = this.p.buscar(camadaId, id);
    if (!f || f.excluida) return { ok: false, motivo: 'inexistente' };
    const camada = this.p.obterLayerManager().getLayerDef(camadaId);
    const motivo = verificarEditavel(f, !!camada?.bloqueada);
    if (motivo) {
      this.p.emitir('cad-edicao-recusada', { motivo, feicao: f });
      return { ok: false, motivo };
    }
    const map = this.p.obterMapa();
    if (!map) return { ok: false, motivo: 'sem-mapa' };

    this.p.desativarFerramenta();
    this.editor?.parar();
    this.p.aplicarMargensHud();
    this.p.selecionarUma({ camadaId, id });
    this.p.fecharPopup();

    const lm = this.p.obterLayerManager();
    const renderer = LayerRendererFactory.get(TIPO_CAMADA_FEICOES) as IRenderizadorFeicoes | undefined;
    const editor = new EditorVertices({
      map,
      snapLigado: () => this.p.snapAtivo(),
      alternarSnap: () => this.p.alternarSnap(),
      buscarSnap: (coord, excluir) => this.p.buscarSnapEm(coord, excluir),
      previsualizar: (nova) => {
        const instancia = lm.getLayerInstance(nova.camadaId);
        if (instancia && renderer) renderer.previsualizar(instancia as L.LayerGroup, nova);
      },
      aoGesto: (nova) => {
        this.p.substituir(nova.camadaId, nova);
        this.p.emitir('cad-feicao-atualizada', { camadaId: nova.camadaId, feicao: nova });
      },
      aoEncerrar: (ultima) => {
        this.editor = null;
        const atual = this.p.buscar(ultima.camadaId, ultima.id) ?? ultima;
        this.p.emitir('cad-edicao-concluida', { feicao: atual });
        // restaura o popup da seleção (ele ficou fechado durante a edição)
        this.p.reabrirPopupDaSelecao();
      }
    });
    this.editor = editor;
    editor.iniciar(f);
    this.p.emitir('cad-edicao-iniciada', { feicao: f });
    return { ok: true };
  }

  public parar(): void {
    this.editor?.parar();
  }
}
