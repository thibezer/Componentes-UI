import L from 'leaflet';
import type {
  Ponto,
  Segmento,
  BancoPonto,
  Confrontante,
  PontoCAD,
  ConexaoCAD,
  PoligonoCAD
} from '../../gerencigeo-canvas/types';
import type { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';

export interface ContextoColecoesDados {
  obterController: () => GerenciGeoMapaController;
  obterChaveGrupo: () => string | undefined;
  setLayerVisibility: (id: string, visivel: boolean) => void;
}

/**
 * Gerencia as coleções de entidades geométricas em memória (pontos, segmentos,
 * banco de pontos, confrontantes) e a sincronização com a engine de mapa.
 */
export class GerenciadorColecoesDados {
  private contexto: ContextoColecoesDados;
  private _pontos: Ponto[] = [];
  private _segmentos: Segmento[] = [];
  private _bancoPontos: BancoPonto[] = [];
  private _confrontantes: Confrontante[] = [];
  public customMarkerClickHandler?: (pontoId: number, isVizinho?: boolean) => void;

  constructor(contexto: ContextoColecoesDados) {
    this.contexto = contexto;
  }

  public get pontos(): Ponto[] {
    return this._pontos;
  }

  public set pontos(val: Ponto[]) {
    this._pontos = val || [];
    this.contexto.obterController().setPontos(this._pontos);
  }

  public get segmentos(): Segmento[] {
    return this._segmentos;
  }

  public set segmentos(val: Segmento[]) {
    this._segmentos = val || [];
    this.contexto.obterController().setSegmentos(this._segmentos);
  }

  public get bancoPontos(): BancoPonto[] {
    return this._bancoPontos;
  }

  public set bancoPontos(val: BancoPonto[]) {
    this._bancoPontos = val || [];
    this.contexto.obterController().setBancoPontos(this._bancoPontos);
  }

  public get confrontantes(): Confrontante[] {
    return this._confrontantes;
  }

  public set confrontantes(val: Confrontante[]) {
    this._confrontantes = val || [];
    this.contexto.obterController().setConfrontantes(this._confrontantes);
  }

  public sincronizarInicial(): void {
    const ctrl = this.contexto.obterController();
    if (this._pontos.length > 0) ctrl.setPontos(this._pontos);
    if (this._segmentos.length > 0) ctrl.setSegmentos(this._segmentos);
    if (this._bancoPontos.length > 0) ctrl.setBancoPontos(this._bancoPontos);
    if (this._confrontantes.length > 0) ctrl.setConfrontantes(this._confrontantes);
  }

  public obterElementoPorId(id: string | number): any {
    return this._pontos.find(p => String(p.id) === String(id))
      || this._bancoPontos.find(p => String(p.id) === String(id))
      || this._confrontantes.find(c => String(c.id) === String(id));
  }

  public plotarPontos(
    pontos?: PontoCAD[] | null,
    camadaId: string = 'vertices',
    onClique?: (ponto: PontoCAD) => void
  ): void {
    const safePontos = pontos || [];
    if (camadaId === 'vertices') {
      this._pontos = safePontos as any[];
    }
    this.contexto.obterController().plotarPontos(safePontos, camadaId, onClique);
  }

  public plotarConexoes(
    conexoes?: ConexaoCAD[] | null,
    camadaId: string = 'linhas'
  ): void {
    const safeConexoes = conexoes || [];
    this.contexto.obterController().plotarConexoes(safeConexoes, camadaId);
  }

  public plotarPolilinhaSequencial(
    pontos?: PontoCAD[] | null,
    fechar: boolean = true,
    camadaId: string = 'polilinha',
    chaveGrupo?: string
  ): void {
    const safePontos = pontos || [];
    if (camadaId === 'polilinha' || camadaId === 'perimetro') {
      this._pontos = safePontos as any[];
      this._segmentos = [];
    }
    const resolvedChave = chaveGrupo ?? this.contexto.obterChaveGrupo();
    this.contexto.obterController().plotarPolilinhaSequencial(safePontos, fechar, camadaId, resolvedChave);
  }

  public plotarPoligonos(
    poligonos?: PoligonoCAD[] | null,
    camadaId: string = 'poligonos'
  ): void {
    const safePoligonos = poligonos || [];
    this.contexto.obterController().plotarPoligonos(safePoligonos, camadaId);
  }

  public limparCamadas(idsCamadas?: string[]): void {
    if (!idsCamadas || idsCamadas.length === 0) {
      this._pontos = [];
      this._segmentos = [];
      this._confrontantes = [];
    } else {
      if (idsCamadas.includes('vertices')) this._pontos = [];
      if (idsCamadas.includes('linhas') || idsCamadas.includes('perimetro') || idsCamadas.includes('polilinha')) this._segmentos = [];
      if (idsCamadas.includes('poligonos') || idsCamadas.includes('vizinhos')) this._confrontantes = [];
    }
    this.contexto.obterController().limparCamadas(idsCamadas);
  }

  public obterMarcadores(camadaId?: string): L.Marker[] {
    return this.contexto.obterController().obterMarcadores(camadaId);
  }

  public plotPontos(
    pontos?: Ponto[] | null,
    onMarkerClick?: (pontoId: number, isVizinho?: boolean) => void
  ): void {
    if (onMarkerClick) {
      this.customMarkerClickHandler = onMarkerClick;
    }
    const safePontos = pontos || [];
    this._pontos = safePontos;
    this.contexto.obterController().plotPontos(safePontos, onMarkerClick);
  }

  public plotSegmentos(
    segmentos?: Segmento[] | null,
    pontos?: Ponto[] | null
  ): void {
    const safeSegmentos = segmentos || [];
    if (pontos !== undefined && pontos !== null) {
      this._pontos = pontos || [];
    }
    this._segmentos = safeSegmentos;
    this.contexto.obterController().plotSegmentos(safeSegmentos, pontos);
  }

  public plotPolilinhaTemporaria(pontos?: Ponto[] | null): void {
    const safePontos = pontos || [];
    this._pontos = safePontos;
    this._segmentos = [];
    this.contexto.obterController().plotPolilinhaTemporaria(safePontos);
  }

  public plotPoligonalHomologada(bancoPontos?: BancoPonto[] | null): void {
    const safeBanco = bancoPontos || [];
    this._bancoPontos = safeBanco;
    this.contexto.obterController().plotPoligonalHomologada(safeBanco);
    this.contexto.setLayerVisibility('homologados', true);
    this.contexto.setLayerVisibility('homologados-pontos', true);
  }

  public plotPontosVizinhos(pontos?: Ponto[] | null): void {
    const safePontos = pontos || [];
    const ctrl = this.contexto.obterController();
    ctrl.plotPontosVizinhos(safePontos);
    this._confrontantes = ctrl.context.confrontantes || [];
  }

  public plotPoligonosVizinhos(confrontantes?: Confrontante[] | null): void {
    const safeConfrontantes = confrontantes || [];
    const ctrl = this.contexto.obterController();
    ctrl.plotPoligonosVizinhos(safeConfrontantes);
    this._confrontantes = ctrl.context.confrontantes || [];
  }

  public clearOverlays(manterBanco: boolean = false): void {
    this._pontos = [];
    this._segmentos = [];
    this._confrontantes = [];
    if (!manterBanco) {
      this._bancoPontos = [];
    }
    this.contexto.obterController().clearOverlays(manterBanco);
  }

  public getMarkers(): L.Marker[] {
    return this.contexto.obterController().getMarkers();
  }

  public getVizinhosMarkers(): L.Marker[] {
    return this.contexto.obterController().getVizinhosMarkers();
  }
}
