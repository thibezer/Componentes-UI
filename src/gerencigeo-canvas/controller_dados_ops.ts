import L from 'leaflet';
import type { Ponto, Confrontante } from './types';
import { parseCoordenada } from './utils';

export function processarPontosVizinhos(
  pontos: Ponto[],
  confrontantesAtuais: Confrontante[]
): Confrontante[] {
  const grupos = new Map<string | number, Ponto[]>();

  pontos.forEach(p => {
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
  confrontantesAtuais.forEach(c => {
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

  return Array.from(confMap.values()).filter(c => (c.pontos && c.pontos.length > 0) || !!c.poligono_wkt);
}

export function processarPoligonosVizinhos(
  confrontantes: Confrontante[],
  confrontantesAtuais: Confrontante[]
): Confrontante[] {
  const pontosPorId = new Map<string | number, Ponto[]>();

  confrontantesAtuais.forEach(c => {
    if (c.id !== undefined && c.id !== null && c.pontos && c.pontos.length > 0) {
      pontosPorId.set(c.id, c.pontos);
    }
  });

  return confrontantes.map(c => {
    const cId = c.id !== undefined && c.id !== null ? c.id : undefined;
    if (cId !== undefined && (!c.pontos || c.pontos.length === 0) && pontosPorId.has(cId)) {
      return { ...c, pontos: pontosPorId.get(cId) };
    }
    return { ...c };
  });
}

export function calcularBoundsGeometrias(
  pontos: Ponto[],
  confrontantes?: Confrontante[],
  incluirVizinhos: boolean = false
): { single?: L.LatLng; bounds?: L.LatLngBounds } | null {
  let todosPontos = [...pontos];

  if (incluirVizinhos && confrontantes) {
    confrontantes.forEach(c => {
      if (c.pontos) todosPontos.push(...c.pontos);
    });
  }

  const validCoords = todosPontos
    .map(p => {
      const rawLat = p.lat ?? (p as any).latitude ?? (p as any).y;
      const rawLon = p.lon ?? (p as any).lng ?? (p as any).longitude ?? (p as any).x;
      const coord = parseCoordenada(rawLat, rawLon);
      return coord ? L.latLng(coord.lat, coord.lon) : null;
    })
    .filter((coord): coord is L.LatLng => coord !== null);

  if (validCoords.length === 1) {
    return { single: validCoords[0] };
  } else if (validCoords.length > 1) {
    return { bounds: L.latLngBounds(validCoords) };
  }
  return null;
}

export function coletarMarcadoresLeaflet(map: L.Map | null, layerManager: any): L.Marker[] {
  // O render das camadas é adiado para o fim do tick; o map.eachLayer abaixo precisa vê-lo aplicado.
  layerManager?.flushRender?.();
  const markers: L.Marker[] = [];
  const seen = new Set<L.Marker>();

  const collect = (l: any) => {
    if (l instanceof L.Marker && (l as any).pontoId !== undefined && !seen.has(l)) {
      seen.add(l);
      markers.push(l);
    }
  };

  if (map) {
    map.eachLayer(l => {
      collect(l);
      if (typeof (l as any).eachLayer === 'function') {
        (l as any).eachLayer(collect);
      }
    });
  }

  if (layerManager) {
    layerManager.getAllLayerInstances().forEach((inst: any) => {
      collect(inst);
      if (typeof inst.eachLayer === 'function') {
        inst.eachLayer(collect);
      }
    });
  }

  return markers;
}

export function executarPlotarPontos(controller: any, pontos?: any[] | null, camadaId: string = 'vertices', onClique?: (ponto: any) => void): void {
  const safePontos = pontos || [];
  controller.layerManager.getOrCreateLayer(camadaId, 'vetorial-pontos', 'Pontos / Vértices');

  if (camadaId === 'vertices') {
    controller.context.pontos = safePontos;
    controller.canvasInteracao.ctx.pontosList = safePontos;
    if (onClique) {
      controller.customMarkerClickCallback = (id: any) => {
        const pt = safePontos.find(p => String(p.id) === String(id)) || { id, lat: 0, lon: 0 };
        onClique(pt);
      };
    }
  }

  controller.layerManager.setLayerData(camadaId, { pontos: safePontos, onClique });
  controller.layerManager.setLayerVisibility(camadaId, true);
}

export function executarPlotarConexoes(controller: any, conexoes?: any[] | null, camadaId: string = 'linhas'): void {
  const safeConexoes = conexoes || [];
  controller.layerManager.getOrCreateLayer(camadaId, 'vetorial-linhas', 'Conexões / Linhas');

  if (camadaId === 'linhas' || camadaId === 'perimetro') {
    controller.context.segmentos = safeConexoes.map(c => ({
      ponto_inicio_id: Number(c.origemId) || 0,
      ponto_fim_id: Number(c.destinoId) || 0,
      tipo_limite_sigef: c.tipoLinha === 'tracejada' ? 'LN1' : 'LA1'
    }));
  }

  controller.layerManager.setLayerData(camadaId, { conexoes: safeConexoes });
  controller.layerManager.setLayerVisibility(camadaId, true);
}

export function executarPlotarPolilinha(controller: any, pontos?: any[] | null, fechar: boolean = true, camadaId: string = 'polilinha', chaveGrupo?: string): void {
  const safePontos = pontos || [];
  controller.layerManager.getOrCreateLayer(camadaId, 'vetorial-linhas', 'Polilinhas');

  if (camadaId === 'polilinha' || camadaId === 'perimetro') {
    controller.context.pontos = safePontos;
    controller.context.segmentos = [];
    controller.canvasInteracao.ctx.pontosList = safePontos;
  }

  const resolvedChaveGrupo = chaveGrupo || controller.chaveGrupo || controller.context.chaveGrupo;
  controller.layerManager.setLayerData(camadaId, {
    pontos: safePontos,
    fechar: fechar !== false,
    polilinhaSequencial: true,
    chaveGrupo: resolvedChaveGrupo
  });
  controller.layerManager.setLayerVisibility(camadaId, true);
}

export function executarPlotarPoligonos(controller: any, poligonos?: any[] | null, camadaId: string = 'poligonos'): void {
  const safePoligonos = poligonos || [];
  controller.layerManager.getOrCreateLayer(camadaId, 'vetorial-poligonos', 'Polígonos');
  controller.layerManager.setLayerData(camadaId, { poligonos: safePoligonos });
  controller.layerManager.setLayerVisibility(camadaId, true);
}

export function executarPlotSegmentos(controller: any, segmentos?: any[] | null, pontos?: any[] | null): void {
  const safeSegmentos = segmentos || [];
  if (pontos !== undefined && pontos !== null) {
    const safePontos = pontos || [];
    controller.context.pontos = safePontos;
    controller.canvasInteracao.ctx.pontosList = safePontos;
  }
  controller.context.segmentos = safeSegmentos;
  controller.layerManager.updateContext({
    segmentos: safeSegmentos,
    ...(pontos !== undefined && pontos !== null ? { pontos: controller.context.pontos } : {})
  });
}

export function executarClearOverlays(controller: any, manterBanco: boolean = false): void {
  controller.context.pontos = [];
  controller.context.segmentos = [];
  controller.context.confrontantes = [];
  controller.canvasInteracao.ctx.pontosList = [];
  controller.canvasInteracao.limparSelecao();

  const updatePayload: any = {
    pontos: [],
    segmentos: [],
    confrontantes: []
  };
  if (!manterBanco) {
    controller.context.bancoPontos = [];
    updatePayload.bancoPontos = [];
  }
  controller.layerManager.updateContext(updatePayload);
}

