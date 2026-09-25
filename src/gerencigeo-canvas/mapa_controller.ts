import L from 'leaflet';
import type {
  Ponto,
  Segmento,
  BancoPonto,
  Confrontante,
  CanvasRenderContext,
  CanvasGraphicScale,
  CanvasLayerState,
  CanvasLayerDef,
  PontoCAD,
  ConexaoCAD,
  PoligonoCAD,
  DestacarElementoOpcoes
} from './types';
import { MapaCore } from './mapa_core';
import { CanvasInteracao } from './canvas_interacao';
import { CanvasLayerManager } from './layer_manager';
import { parseCoordenada, extrairCentroDeWkt, escapeHtml } from './utils';

export class GerenciGeoMapaController {
  public core: MapaCore;
  public layerManager: CanvasLayerManager;
  public canvasInteracao: CanvasInteracao;

  public context: CanvasRenderContext;
  public modoCliqueSequencialAtivo: boolean = false;
  public chaveGrupo?: string;
  public levantamentoId: number | null = null;

  public customMarkerClickCallback?: (pId: number, isVizinho?: boolean) => void;
  public customPopupActionCallback?: (acaoId: string, elementoId: string | number, elemento: any) => void;

  private destaqueMarker: L.Marker | null = null;
  private destaqueTimeoutId: number | null = null;

  constructor(customLayers?: CanvasLayerDef[]) {
    this.core = new MapaCore(this);
    this.layerManager = new CanvasLayerManager(customLayers);
    this.canvasInteracao = new CanvasInteracao({
      mapaController: this,
      layerManager: this.layerManager
    });

    this.context = {
      pontos: [],
      segmentos: [],
      bancoPontos: [],
      confrontantes: [],
      config: this.core.config,
      graphicScale: {
        markerScaleMultiplier: 1.0,
        lineScaleMultiplier: 1.0,
        scaleModeGlobal: 'screen'
      },
      onMarkerClick: (pId: string | number, isVizinho?: boolean, _elemento?: any, _coords?: { lat: number; lon: number }) => {
        if (this.modoCliqueSequencialAtivo || this.context.modoSequencial) {
          // No modo sequencial, não desseleciona elementos previamente ativos e não dispara evento legado
          return;
        }
        if (this.customMarkerClickCallback) {
          try {
            this.customMarkerClickCallback(Number(pId), isVizinho);
          } catch (err) {
            console.error('Erro no customMarkerClickCallback:', err);
          }
        }
        const numId = Number(pId);
        if (isVizinho) {
          this.canvasInteracao.ctx.selectedVizinhoPontoIds = [numId];
        } else {
          this.canvasInteracao.ctx.selectedPontoIds = [numId];
          this.canvasInteracao.ctx.lastSelectedPontoId = numId;
        }
        window.dispatchEvent(new CustomEvent('gerencigeo:ponto-selecionado', {
          detail: { selectedPontoIds: [numId], lastSelectedPontoId: numId, isVizinho }
        }));
      },
      onPopupAcao: (acaoId: string, elementoId: string | number, elemento: any) => {
        if (this.customPopupActionCallback) {
          try {
            this.customPopupActionCallback(acaoId, elementoId, elemento);
          } catch (err) {
            console.error('Erro no customPopupActionCallback:', err);
          }
        }
      }
    };
  }

  public init(containerIdOrElement: string | HTMLElement, hostRoot?: HTMLElement | ShadowRoot): L.Map | null {
    const map = this.core.init(containerIdOrElement);
    if (map) {
      this.layerManager.attachMap(map, this.context);
      this.canvasInteracao.ativar(this, hostRoot);
    }
    return map;
  }

  public invalidateSize(): void {
    try {
      if (this.core) {
        if (typeof (this.core as any).invalidateSize === 'function') {
          (this.core as any).invalidateSize();
        } else if (this.core.map && typeof this.core.map.invalidateSize === 'function') {
          this.core.map.invalidateSize();
        }
      }
    } catch {
      // Absorve tentativas de leitura com panes desanexados, eliminando exceções do tipo undefined._leaflet_pos
    }
  }

  public setPontos(pontos?: Ponto[] | null): void {
    const safePontos = pontos || [];
    this.context.pontos = safePontos;
    this.canvasInteracao.ctx.pontosList = safePontos;
    this.layerManager.updateContext({ pontos: safePontos });
  }

  public setSegmentos(segmentos?: Segmento[] | null): void {
    const safeSegmentos = segmentos || [];
    this.context.segmentos = safeSegmentos;
    this.layerManager.updateContext({ segmentos: safeSegmentos });
  }

  public setBancoPontos(bancoPontos?: BancoPonto[] | null): void {
    const safeBanco = bancoPontos || [];
    this.context.bancoPontos = safeBanco;
    this.layerManager.updateContext({ bancoPontos: safeBanco });
  }

  public setConfrontantes(confrontantes?: Confrontante[] | null): void {
    const safeConfrontantes = confrontantes || [];
    this.context.confrontantes = safeConfrontantes;
    this.layerManager.updateContext({ confrontantes: safeConfrontantes });
  }

  // --- API Pública Agnóstica de Entidades Vetoriais e Camadas ---

  /**
   * Ingestão de nós pontuais na camada indicada (padrão: 'vertices').
   */
  public plotarPontos(
    pontos?: PontoCAD[] | null,
    camadaId: string = 'vertices',
    onClique?: (ponto: PontoCAD) => void
  ): void {
    const safePontos = pontos || [];
    this.layerManager.getOrCreateLayer(camadaId, 'vetorial-pontos', 'Pontos / Vértices');

    if (camadaId === 'vertices') {
      this.context.pontos = safePontos;
      this.canvasInteracao.ctx.pontosList = safePontos;
      if (onClique) {
        this.customMarkerClickCallback = (id) => {
          const pt = safePontos.find(p => String(p.id) === String(id)) || { id, lat: 0, lon: 0 };
          onClique(pt);
        };
      }
    }

    this.layerManager.setLayerData(camadaId, { pontos: safePontos, onClique });
    this.layerManager.setLayerVisibility(camadaId, true);
  }

  /**
   * Plota linhas vinculando pares de IDs (origemId -> destinoId).
   */
  public plotarConexoes(
    conexoes?: ConexaoCAD[] | null,
    camadaId: string = 'linhas'
  ): void {
    const safeConexoes = conexoes || [];
    this.layerManager.getOrCreateLayer(camadaId, 'vetorial-linhas', 'Conexões / Linhas');

    if (camadaId === 'linhas' || camadaId === 'perimetro') {
      this.context.segmentos = safeConexoes.map(c => ({
        ponto_inicio_id: Number(c.origemId) || 0,
        ponto_fim_id: Number(c.destinoId) || 0,
        tipo_limite_sigef: c.tipoLinha === 'tracejada' ? 'LN1' : 'LA1'
      }));
    }

    this.layerManager.setLayerData(camadaId, { conexoes: safeConexoes });
    this.layerManager.setLayerVisibility(camadaId, true);
  }

  /**
   * Conecta a lista ordenada de pontos em sequência (P1 -> P2 -> ... -> Pn) com fechamento opcional (Pn -> P1).
   */
  public plotarPolilinhaSequencial(
    pontos?: PontoCAD[] | null,
    fechar: boolean = true,
    camadaId: string = 'polilinha',
    chaveGrupo?: string
  ): void {
    const safePontos = pontos || [];
    this.layerManager.getOrCreateLayer(camadaId, 'vetorial-linhas', 'Polilinhas');

    if (camadaId === 'polilinha' || camadaId === 'perimetro') {
      this.context.pontos = safePontos;
      this.context.segmentos = [];
      this.canvasInteracao.ctx.pontosList = safePontos;
    }

    const resolvedChaveGrupo = chaveGrupo || this.chaveGrupo || this.context.chaveGrupo;

    this.layerManager.setLayerData(camadaId, {
      pontos: safePontos,
      fechar: fechar !== false,
      polilinhaSequencial: true,
      chaveGrupo: resolvedChaveGrupo
    });
    this.layerManager.setLayerVisibility(camadaId, true);
  }

  /**
   * Plota áreas a partir de anéis de coordenadas ou strings WKT.
   */
  public plotarPoligonos(
    poligonos?: PoligonoCAD[] | null,
    camadaId: string = 'poligonos'
  ): void {
    const safePoligonos = poligonos || [];
    this.layerManager.getOrCreateLayer(camadaId, 'vetorial-poligonos', 'Polígonos');
    this.layerManager.setLayerData(camadaId, { poligonos: safePoligonos });
    this.layerManager.setLayerVisibility(camadaId, true);
  }

  /**
   * Remove entidades das camadas especificadas ou de todas as camadas vetoriais se omitido.
   */
  public limparCamadas(idsCamadas?: string[]): void {
    this.layerManager.clearLayers(idsCamadas);
    if (!idsCamadas || idsCamadas.length === 0) {
      this.canvasInteracao.limparSelecao();
    }
  }

  /**
   * Retorna as instâncias gráficas ativas no canvas (de uma camada específica ou de todas).
   */
  public obterMarcadores(camadaId?: string): L.Marker[] {
    if (camadaId) {
      const markers: L.Marker[] = [];
      const instance = this.layerManager.getLayerInstance(camadaId);
      if (instance) {
        const collect = (l: any) => {
          if (l instanceof L.Marker) markers.push(l);
        };
        collect(instance);
        if (typeof (instance as any).eachLayer === 'function') {
          (instance as any).eachLayer(collect);
        }
      }
      return markers;
    }
    return this.getMarkers();
  }

  /**
   * Plota os pontos do levantamento e opcionalmente associa callback de clique.
   */
  public plotPontos(
    pontos?: Ponto[] | null,
    onMarkerClick?: (pontoId: number, isVizinho?: boolean) => void
  ): void {
    if (onMarkerClick) {
      this.customMarkerClickCallback = onMarkerClick;
    }
    this.setPontos(pontos || []);
  }

  /**
   * Plota os segmentos cadastrados conectando os pontos correspondentes.
   */
  public plotSegmentos(
    segmentos?: Segmento[] | null,
    pontos?: Ponto[] | null
  ): void {
    const safeSegmentos = segmentos || [];
    if (pontos !== undefined && pontos !== null) {
      const safePontos = pontos || [];
      this.context.pontos = safePontos;
      this.canvasInteracao.ctx.pontosList = safePontos;
    }
    this.context.segmentos = safeSegmentos;
    this.layerManager.updateContext({
      segmentos: safeSegmentos,
      ...(pontos !== undefined && pontos !== null ? { pontos: this.context.pontos } : {})
    });
  }

  /**
   * Define os pontos e limpa os segmentos para forçar o fechamento automático da poligonal pelo caminhamento (Pn -> P1).
   */
  public plotPolilinhaTemporaria(pontos?: Ponto[] | null): void {
    const safePontos = pontos || [];
    this.context.pontos = safePontos;
    this.context.segmentos = [];
    this.canvasInteracao.ctx.pontosList = safePontos;
    this.layerManager.updateContext({
      pontos: safePontos,
      segmentos: []
    });
  }

  /**
   * Alimenta a camada de vértices homologados do SIGEF.
   */
  public plotPoligonalHomologada(bancoPontos?: BancoPonto[] | null): void {
    const safeBanco = bancoPontos || [];
    this.setBancoPontos(safeBanco);
    this.layerManager.setLayerVisibility('homologados', true);
    this.layerManager.setLayerVisibility('homologados-pontos', true);
  }

  /**
   * Alimenta a camada de vértices confrontantes com marcadores e polilinhas.
   */
  public plotPontosVizinhos(pontos?: Ponto[] | null): void {
    const safePontos = pontos || [];
    const grupos = new Map<string | number, Ponto[]>();

    safePontos.forEach(p => {
      const rawLat = p.lat ?? (p as any).latitude ?? (p as any).y;
      const rawLon = p.lon ?? (p as any).lng ?? (p as any).longitude ?? (p as any).x;
      const coord = parseCoordenada(rawLat, rawLon);
      if (coord) {
        p.lat = coord.lat;
        p.lon = coord.lon;
      }
      const cId = p.confrontante_id ?? (p as any).id_confrontante ?? 0;
      if (!grupos.has(cId)) grupos.set(cId, []);
      grupos.get(cId)!.push(p);
    });

    const confMap = new Map<string | number, Confrontante>();
    (this.context.confrontantes || []).forEach(c => {
      const key = c.id !== undefined && c.id !== null ? c.id : 0;
      confMap.set(key, { ...c, pontos: [] });
    });

    grupos.forEach((pts, cId) => {
      if (confMap.has(cId)) {
        const existing = confMap.get(cId)!;
        existing.pontos = pts;
      } else {
        confMap.set(cId, {
          id: cId,
          nome: pts[0]?.nome_confrontante || 'Confrontante',
          nome_propriedade: pts[0]?.nome_propriedade || '',
          pontos: pts
        });
      }
    });

    const novosConfrontantes = Array.from(confMap.values()).filter(c => (c.pontos && c.pontos.length > 0) || !!c.poligono_wkt);
    this.setConfrontantes(novosConfrontantes);
    this.layerManager.setLayerVisibility('vizinhos', true);
  }

  /**
   * Alimenta a camada de limites em polígonos WKT.
   */
  public plotPoligonosVizinhos(confrontantes?: Confrontante[] | null): void {
    const safeConfrontantes = confrontantes || [];
    const pontosPorId = new Map<string | number, Ponto[]>();

    (this.context.confrontantes || []).forEach(c => {
      if (c.id !== undefined && c.id !== null && c.pontos && c.pontos.length > 0) {
        pontosPorId.set(c.id, c.pontos);
      }
    });

    const novos = safeConfrontantes.map(c => {
      const cId = c.id !== undefined && c.id !== null ? c.id : undefined;
      if (cId !== undefined && (!c.pontos || c.pontos.length === 0) && pontosPorId.has(cId)) {
        return { ...c, pontos: pontosPorId.get(cId) };
      }
      return { ...c };
    });

    this.setConfrontantes(novos);
    this.layerManager.setLayerVisibility('vizinhos', true);
  }

  /**
   * Reseta as camadas vetoriais de trabalho, permitindo preservar opcionalmente o banco de pontos homologados.
   */
  public clearOverlays(manterBanco: boolean = false): void {
    this.context.pontos = [];
    this.context.segmentos = [];
    this.context.confrontantes = [];
    this.canvasInteracao.ctx.pontosList = [];
    this.canvasInteracao.limparSelecao();

    const updatePayload: Partial<CanvasRenderContext> = {
      pontos: [],
      segmentos: [],
      confrontantes: []
    };

    if (!manterBanco) {
      this.context.bancoPontos = [];
      updatePayload.bancoPontos = [];
    }

    this.layerManager.updateContext(updatePayload);
  }

  public setGraphicScale(scale: Partial<CanvasGraphicScale>): void {
    this.layerManager.setGraphicScale(scale);
  }

  public exportState(): CanvasLayerState[] {
    return this.layerManager.exportState();
  }

  public importState(state: CanvasLayerState[]): void {
    this.layerManager.importState(state);
  }

  public selectPonto(pId: number, zoomLevel?: number): void {
    if (!this.core.map) return;
    const markers = this.getMarkers();
    const marker = markers.find(m => (m as any).pontoId === pId);
    if (marker) {
      const targetZoom = zoomLevel !== undefined ? zoomLevel : this.core.map.getZoom();
      this.core.map.setView(marker.getLatLng(), targetZoom);
      marker.openPopup();
    }
  }

  public fitBounds(
    pontos?: Ponto[],
    padding: [number, number] = [40, 40],
    incluirVizinhos: boolean = false
  ): void {
    if (!this.core.map) return;

    const sourcePontos = pontos || this.context.pontos || [];
    let todosPontos = [...sourcePontos];

    if (incluirVizinhos && this.context.confrontantes) {
      this.context.confrontantes.forEach(c => {
        if (c.pontos) todosPontos.push(...c.pontos);
      });
    }

    const validCoords = todosPontos
      .map(p => {
        const rawLat = p.lat ?? (p as any).latitude ?? (p as any).y;
        const rawLon = p.lon ?? (p as any).lng ?? (p as any).longitude ?? (p as any).x;
        const coord = parseCoordenada(rawLat, rawLon);
        if (coord) {
          return L.latLng(coord.lat, coord.lon);
        }
        return null;
      })
      .filter((coord): coord is L.LatLng => coord !== null);

    if (validCoords.length === 1) {
      this.core.map.setView(validCoords[0], 18);
    } else if (validCoords.length > 1) {
      const bounds = L.latLngBounds(validCoords);
      this.core.map.fitBounds(bounds, { padding });
      this.core.map.once('moveend', () => {
        this.core.preCarregarTilesRegiao(bounds);
      });
    }

    try {
      this.core.map.invalidateSize();
    } catch {
      // Ignora exceções de desmontagem DOM
    }
  }

  public getMarkers(): L.Marker[] {
    const markers: L.Marker[] = [];
    const seen = new Set<L.Marker>();

    const collect = (l: any) => {
      if (l instanceof L.Marker && (l as any).pontoId !== undefined && !seen.has(l)) {
        seen.add(l);
        markers.push(l);
      }
    };

    if (this.core.map) {
      this.core.map.eachLayer(l => {
        collect(l);
        if (typeof (l as any).eachLayer === 'function') {
          (l as any).eachLayer(collect);
        }
      });
    }

    if (this.layerManager) {
      this.layerManager.getAllLayerInstances().forEach(inst => {
        collect(inst);
        if (typeof (inst as any).eachLayer === 'function') {
          (inst as any).eachLayer(collect);
        }
      });
    }

    return markers;
  }

  public getVizinhosMarkers(): L.Marker[] {
    return this.getMarkers().filter(m => !!(m as any).isVizinho);
  }

  public get destaqueAtivo(): boolean {
    return this.destaqueMarker !== null;
  }

  /**
   * Localiza a coordenada geográfica central de qualquer elemento geométrico do canvas pelo identificador (ID).
   * Agnóstico a entidades pontuais, lineares e poligonais.
   */
  public localizarCoordenadasElemento(id: string | number): L.LatLng | null {
    if (id === undefined || id === null) return null;
    const strId = String(id).trim();

    const wrapLatLng = (ll: L.LatLng | null): L.LatLng | null => {
      if (!ll) return null;
      (ll as any).lon = ll.lng;
      return ll;
    };

    // 1. Tenta encontrar entre os marcadores Leaflet ativos
    const markers = this.getMarkers();
    const marker = markers.find(m => {
      const pId = (m as any).pontoId;
      const elId = (m as any).elementoId ?? (m as any).id ?? (m as any).options?.pontoId ?? (m as any).options?.id;
      const nomeVertice = (m as any).elemento?.nome_vertice;
      const codCompleto = (m as any).elemento?.codigo_completo;
      return (
        String(pId) === strId ||
        String(elId) === strId ||
        (nomeVertice && String(nomeVertice).toLowerCase() === strId.toLowerCase()) ||
        (codCompleto && String(codCompleto).toLowerCase() === strId.toLowerCase())
      );
    });

    if (marker && typeof marker.getLatLng === 'function') {
      return wrapLatLng(marker.getLatLng());
    }

    // 2. Tenta encontrar entre as demais instâncias de camadas Leaflet (polilinhas, polígonos, grupos)
    if (this.layerManager) {
      for (const instance of this.layerManager.getAllLayerInstances()) {
        let foundLatLng: L.LatLng | null = null;
        const checkLayer = (l: any) => {
          if (foundLatLng) return;
          const lId = l.pontoId ?? l.elementoId ?? l.id ?? l.options?.id ?? l.options?.pontoId;
          const nome = l.elemento?.nome ?? l.elemento?.nome_vertice ?? l.options?.nome;
          if (String(lId) === strId || (nome && String(nome).toLowerCase() === strId.toLowerCase())) {
            if (typeof l.getLatLng === 'function') {
              foundLatLng = l.getLatLng();
            } else if (typeof l.getBounds === 'function') {
              foundLatLng = l.getBounds().getCenter();
            }
          }
        };

        checkLayer(instance);
        if (typeof (instance as any).eachLayer === 'function') {
          (instance as any).eachLayer(checkLayer);
        }
        if (foundLatLng) return wrapLatLng(foundLatLng);
      }
    }

    // 3. Tenta encontrar na lista de pontos de levantamento
    if (this.context.pontos && this.context.pontos.length > 0) {
      const pt = this.context.pontos.find(p =>
        String(p.id) === strId ||
        (p.nome_vertice && String(p.nome_vertice).toLowerCase() === strId.toLowerCase())
      );
      if (pt) {
        const rawLat = pt.lat ?? (pt as any).latitude ?? (pt as any).y;
        const rawLon = pt.lon ?? (pt as any).lng ?? (pt as any).longitude ?? (pt as any).x;
        const coord = parseCoordenada(rawLat, rawLon);
        if (coord) return wrapLatLng(L.latLng(coord.lat, coord.lon));
      }
    }

    // 4. Tenta encontrar no banco de pontos homologados (SIGEF)
    if (this.context.bancoPontos && this.context.bancoPontos.length > 0) {
      const bp = this.context.bancoPontos.find(p =>
        String(p.id) === strId ||
        (p.codigo_completo && String(p.codigo_completo).toLowerCase() === strId.toLowerCase()) ||
        (p.nome_vertice && String(p.nome_vertice).toLowerCase() === strId.toLowerCase())
      );
      if (bp) {
        const rawLat = bp.lat ?? (bp as any).latitude ?? (bp as any).y;
        const rawLon = bp.lon ?? (bp as any).lng ?? (bp as any).longitude ?? (bp as any).x;
        const coord = parseCoordenada(rawLat, rawLon);
        if (coord) return wrapLatLng(L.latLng(coord.lat, coord.lon));
      }
    }

    // 5. Tenta encontrar entre os confrontantes (WKT ou coleção de pontos)
    if (this.context.confrontantes && this.context.confrontantes.length > 0) {
      const conf = this.context.confrontantes.find(c =>
        String(c.id) === strId ||
        (c.nome && String(c.nome).toLowerCase() === strId.toLowerCase()) ||
        (c.nome_propriedade && String(c.nome_propriedade).toLowerCase() === strId.toLowerCase())
      );
      if (conf) {
        if (conf.pontos && conf.pontos.length > 0) {
          let sumLat = 0;
          let sumLon = 0;
          let count = 0;
          for (const p of conf.pontos) {
            const rawLat = p.lat ?? (p as any).latitude ?? (p as any).y;
            const rawLon = p.lon ?? (p as any).lng ?? (p as any).longitude ?? (p as any).x;
            const coord = parseCoordenada(rawLat, rawLon);
            if (coord) {
              sumLat += coord.lat;
              sumLon += coord.lon;
              count++;
            }
          }
          if (count > 0) {
            return wrapLatLng(L.latLng(sumLat / count, sumLon / count));
          }
        }
        if (conf.poligono_wkt) {
          const wktCenter = extrairCentroDeWkt(conf.poligono_wkt);
          if (wktCenter) return wrapLatLng(L.latLng(wktCenter.lat, wktCenter.lon));
        }
      }
    }

    // 6. Tenta encontrar entre os segmentos cadastrados
    if (this.context.segmentos && this.context.segmentos.length > 0) {
      const seg = this.context.segmentos.find(s =>
        String((s as any).id) === strId ||
        `${s.ponto_inicio_id}-${s.ponto_fim_id}` === strId
      );
      if (seg) {
        const p1 = this.context.pontos?.find(p => String(p.id) === String(seg.ponto_inicio_id));
        const p2 = this.context.pontos?.find(p => String(p.id) === String(seg.ponto_fim_id));
        if (p1 && p2) {
          const c1 = parseCoordenada(p1.lat ?? (p1 as any).latitude, p1.lon ?? (p1 as any).longitude);
          const c2 = parseCoordenada(p2.lat ?? (p2 as any).latitude, p2.lon ?? (p2 as any).longitude);
          if (c1 && c2) {
            return wrapLatLng(L.latLng((c1.lat + c2.lat) / 2, (c1.lon + c2.lon) / 2));
          }
        }
      }
    }

    // 7. Tenta nas camadas dinâmicas do LayerManager com propriedade `dados`
    if (this.layerManager) {
      for (const layer of this.layerManager.getLayers()) {
        if (!layer.dados) continue;
        if (Array.isArray(layer.dados.pontos)) {
          const pt = layer.dados.pontos.find((p: any) => String(p.id) === strId || (p.nome_vertice && String(p.nome_vertice) === strId));
          if (pt) {
            const coord = parseCoordenada(pt.lat, pt.lon);
            if (coord) return wrapLatLng(L.latLng(coord.lat, coord.lon));
          }
        }
        if (Array.isArray(layer.dados.poligonos)) {
          const poly = layer.dados.poligonos.find((p: any) => String(p.id) === strId);
          if (poly) {
            if (poly.wkt) {
              const c = extrairCentroDeWkt(poly.wkt);
              if (c) return wrapLatLng(L.latLng(c.lat, c.lon));
            }
            if (Array.isArray(poly.coordenadas) && poly.coordenadas.length > 0) {
              let sLat = 0, sLon = 0, cCount = 0;
              for (const item of poly.coordenadas) {
                const c = parseCoordenada(item[0], item[1]) || parseCoordenada(item[1], item[0]);
                if (c) { sLat += c.lat; sLon += c.lon; cCount++; }
              }
              if (cCount > 0) return wrapLatLng(L.latLng(sLat / cCount, sLon / cCount));
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Localiza, enquadra e pulsa visualmente qualquer elemento geométrico do canvas pelo identificador.
   * Não interfere no estado dos marcadores originais e limpa instâncias anteriores.
   *
   * @param id Identificador do elemento (número ou string)
   * @param opcoes Configurações de câmera, duração e cor de destaque
   */
  public destacarElemento(
    id: string | number,
    opcoes?: DestacarElementoOpcoes
  ): void {
    // 1. Limpa qualquer destaque pulsante anterior
    this.limparDestaque();

    const map = this.getMap();
    if (!map) return;

    // 2. Localiza as coordenadas do elemento
    const coord = this.localizarCoordenadasElemento(id);
    if (!coord) {
      console.warn(`[ui-canvas-cad] Elemento com identificador "${id}" não encontrado para destaque.`);
      return;
    }

    // 3. Comportamento de Câmera (Pan / Zoom suave)
    const pan = opcoes?.pan === true;
    const zoom = opcoes?.zoom;

    if (pan) {
      if (zoom !== undefined) {
        if (typeof (map as any).flyTo === 'function') {
          (map as any).flyTo(coord, zoom, { animate: true });
        } else {
          map.setView(coord, zoom, { animate: true });
        }
      } else {
        if (typeof map.panTo === 'function') {
          map.panTo(coord, { animate: true });
        } else {
          map.setView(coord, map.getZoom(), { animate: true });
        }
      }
    } else if (zoom !== undefined) {
      map.setZoom(zoom, { animate: true });
    }

    // 4. Cria o anel de destaque pulsante no pane de sobreposição
    const cor = opcoes?.cor || '#00f5a0';
    const paneName = 'pane-destaque';
    let pane = map.getPane(paneName);
    if (!pane) {
      pane = map.createPane(paneName);
    }
    if (pane) {
      pane.style.zIndex = '850';
      pane.style.pointerEvents = 'none';
    }

    const divIcon = L.divIcon({
      className: 'cad-destaque-marker-container',
      html: `
        <div class="cad-pulse-highlight" style="--cad-pulse-cor: ${escapeHtml(cor)};">
          <div class="cad-pulse-core"></div>
          <div class="cad-pulse-ring ring-1"></div>
          <div class="cad-pulse-ring ring-2"></div>
        </div>
      `,
      iconSize: [52, 52],
      iconAnchor: [26, 26]
    });

    this.destaqueMarker = L.marker(coord, {
      icon: divIcon,
      pane: paneName,
      interactive: false,
      keyboard: false
    });

    this.destaqueMarker.addTo(map);

    // Garante que o elemento DOM não intercepte nem bloqueie cliques
    const markerEl = this.destaqueMarker.getElement?.();
    if (markerEl) {
      markerEl.style.pointerEvents = 'none';
    }

    // 5. Agendamento de remoção automática caso duracaoMs tenha sido fornecido
    if (opcoes?.duracaoMs && opcoes.duracaoMs > 0) {
      this.destaqueTimeoutId = window.setTimeout(() => {
        this.limparDestaque();
      }, opcoes.duracaoMs);
    }
  }

  /**
   * Remove o anel de destaque pulsante ativo e cancela temporizadores pendentes.
   */
  public limparDestaque(): void {
    if (this.destaqueTimeoutId !== null) {
      window.clearTimeout(this.destaqueTimeoutId);
      this.destaqueTimeoutId = null;
    }

    if (this.destaqueMarker) {
      const map = this.getMap();
      if (map && map.hasLayer(this.destaqueMarker)) {
        map.removeLayer(this.destaqueMarker);
      } else if (typeof (this.destaqueMarker as any).remove === 'function') {
        (this.destaqueMarker as any).remove();
      }
      this.destaqueMarker = null;
    }
  }

  public destroy(): void {
    this.limparDestaque();
    this.canvasInteracao.desativar();
    this.layerManager.destroy();
    this.core.destroy();
    if (this.core.map) {
      this.core.map.remove();
      this.core.map = null;
    }
  }

  public getMap(): L.Map | null {
    return this.core.map;
  }
}

export { GerenciGeoMapaController as CanvasCADController, GerenciGeoMapaController as CADMapaController };
