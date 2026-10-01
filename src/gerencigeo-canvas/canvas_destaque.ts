import L from 'leaflet';
import type { DestacarElementoOpcoes } from './types';
import { parseCoordenada, extrairCentroDeWkt, escapeHtml } from './utils';

export interface DestaqueState {
  destaqueMarker: L.Marker | null;
  destaqueTimeoutId: number | null;
}

/**
 * Localiza a coordenada geográfica central de qualquer elemento geométrico do canvas pelo identificador (ID).
 * Agnóstico a entidades pontuais, lineares e poligonais.
 */
export function localizarCoordenadasElemento(controller: any, id: string | number): L.LatLng | null {
  if (id === undefined || id === null) return null;
  const strId = String(id).trim();

  const wrapLatLng = (ll: L.LatLng | null): L.LatLng | null => {
    if (!ll) return null;
    (ll as any).lon = ll.lng;
    return ll;
  };

  // 1. Tenta encontrar entre os marcadores Leaflet ativos
  const markers = controller.getMarkers();
  const marker = markers.find((m: any) => {
    const pId = m.pontoId;
    const elId = m.elementoId ?? m.id ?? m.options?.pontoId ?? m.options?.id;
    const nomeVertice = m.elemento?.nome_vertice;
    const codCompleto = m.elemento?.codigo_completo;
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
  if (controller.layerManager) {
    for (const instance of controller.layerManager.getAllLayerInstances()) {
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
  if (controller.context.pontos && controller.context.pontos.length > 0) {
    const pt = controller.context.pontos.find((p: any) =>
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
  if (controller.context.bancoPontos && controller.context.bancoPontos.length > 0) {
    const bp = controller.context.bancoPontos.find((p: any) =>
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
  if (controller.context.confrontantes && controller.context.confrontantes.length > 0) {
    const conf = controller.context.confrontantes.find((c: any) =>
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
  if (controller.context.segmentos && controller.context.segmentos.length > 0) {
    const seg = controller.context.segmentos.find((s: any) =>
      String(s.id) === strId ||
      `${s.ponto_inicio_id}-${s.ponto_fim_id}` === strId
    );
    if (seg) {
      const p1 = controller.context.pontos?.find((p: any) => String(p.id) === String(seg.ponto_inicio_id));
      const p2 = controller.context.pontos?.find((p: any) => String(p.id) === String(seg.ponto_fim_id));
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
  if (controller.layerManager) {
    for (const layer of controller.layerManager.getLayers()) {
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

export function executarDestaqueElemento(
  controller: any,
  state: DestaqueState,
  id: string | number,
  opcoes?: DestacarElementoOpcoes
): void {
  limparDestaqueElemento(state, controller.getMap());

  const map = controller.getMap();
  if (!map) return;

  const coord = localizarCoordenadasElemento(controller, id);
  if (!coord) {
    console.warn(`[ui-canvas-cad] Elemento com identificador "${id}" não encontrado para destaque.`);
    return;
  }

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

  state.destaqueMarker = L.marker(coord, {
    icon: divIcon,
    pane: paneName,
    interactive: false,
    keyboard: false
  });

  state.destaqueMarker.addTo(map);

  const markerEl = state.destaqueMarker.getElement?.();
  if (markerEl) {
    markerEl.style.pointerEvents = 'none';
  }

  if (opcoes?.duracaoMs && opcoes.duracaoMs > 0) {
    state.destaqueTimeoutId = window.setTimeout(() => {
      limparDestaqueElemento(state, map);
    }, opcoes.duracaoMs);
  }
}

export function limparDestaqueElemento(state: DestaqueState, map: L.Map | null): void {
  if (state.destaqueTimeoutId !== null) {
    window.clearTimeout(state.destaqueTimeoutId);
    state.destaqueTimeoutId = null;
  }

  if (state.destaqueMarker) {
    if (map && map.hasLayer(state.destaqueMarker)) {
      map.removeLayer(state.destaqueMarker);
    } else if (typeof (state.destaqueMarker as any).remove === 'function') {
      (state.destaqueMarker as any).remove();
    }
    state.destaqueMarker = null;
  }
}
