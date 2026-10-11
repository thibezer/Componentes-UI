import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { normalizarFeicaoEntrada } from '../src/gerencigeo-canvas/feature_adapters';
import { criarLinha, ehMultilinha, partesDaLinha, type Feicao, type LatLonPar } from '../src/gerencigeo-canvas/feature_types';
import { comprimentoMetros, extensaoDaGeometria, limitesDaGeometria, textoRotulo, formatarExtensao } from '../src/gerencigeo-canvas/feature_metricas';
import { feicaoNaCaixa, feicaoNoLaco } from '../src/gerencigeo-canvas/feature_caixa';
import { buscarSnap } from '../src/gerencigeo-canvas/feature_snap';
import { feicaoNoPonto } from '../src/gerencigeo-canvas/feature_amostra';
import { simplificarGeometria } from '../src/gerencigeo-canvas/feature_simplificacao';
import { verificarEditavel } from '../src/gerencigeo-canvas/feature_edicao_ops';
import { deslocarGeometria, gerarBuffer } from '../src/gerencigeo-canvas/feature_algoritmos';
import { consultarFeicoesNoPonto } from '../src/gerencigeo-canvas/layer_hit_test';
import { coordenadaDeReferencia } from '../src/gerencigeo-canvas/feature_popup';

afterEach(() => { document.body.innerHTML = ''; });

const A: LatLonPar[] = [[-23.5, -46.6], [-23.5, -46.59]];
const B: LatLonPar[] = [[-23.51, -46.6], [-23.51, -46.59], [-23.51, -46.58]];

const multi = (id = 'm', extra: Record<string, unknown> = {}) =>
  ({ id, geometria: { tipo: 'LineString', partes: [A, B] }, ...extra });
const F = (bruta: unknown): Feicao => normalizarFeicaoEntrada(bruta, 'c')!;

function novo() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
  const lm = new CanvasLayerManager([]);
  const eventos: Array<[string, any]> = [];
  const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, emitir: (e, d) => eventos.push([e, d]) });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
  const ev = (nome: string) => eventos.filter(([e]) => e === nome).map(([, d]) => d);
  return { g, lm, map, ev };
}

describe('normalização', () => {
  it('linha simples continua igual (sem `partes`)', () => {
    const f = F({ id: 'l', geometria: { tipo: 'LineString', coordenadas: A } });
    expect(f.geometria).toEqual({ tipo: 'LineString', coordenadas: A });
    expect(ehMultilinha(f.geometria)).toBe(false);
  });

  it('`partes` com 2+ partes vira multiparte e `coordenadas` repete a primeira', () => {
    const f = F(multi());
    expect(f.geometria).toEqual({ tipo: 'LineString', coordenadas: A, partes: [A, B] });
    expect(ehMultilinha(f.geometria)).toBe(true);
    if (f.geometria.tipo === 'LineString') expect(partesDaLinha(f.geometria)).toEqual([A, B]);
  });

  it('round-trip: normalizar o que já está normalizado não muda nada', () => {
    const f = F(multi());
    expect(F(f)).toEqual(f);
    expect(F(JSON.parse(JSON.stringify(f)))).toEqual(f);
  });

  it('aceita coordenadas em qualquer formato dentro das partes', () => {
    const f = F({ id: 'x', geometria: { tipo: 'LineString', partes: [[{ lat: -23.5, lng: -46.6 }, { latitude: -23.5, longitude: -46.59 }], B] } });
    expect(f.geometria).toMatchObject({ partes: [A, B] });
  });

  it('partes inválidas (menos de 2 vértices) são descartadas; sobrando uma, vira linha simples', () => {
    const f = F({ id: 'x', geometria: { tipo: 'LineString', partes: [A, [[-23.5, -46.6]], 'lixo'] } });
    expect(f.geometria).toEqual({ tipo: 'LineString', coordenadas: A });
  });

  it('nenhuma parte válida: cai nas `coordenadas`, se houver; senão a feição é recusada', () => {
    expect(F({ id: 'x', geometria: { tipo: 'LineString', partes: [[[1, 1]]], coordenadas: A } }).geometria).toEqual({ tipo: 'LineString', coordenadas: A });
    expect(normalizarFeicaoEntrada({ id: 'x', geometria: { tipo: 'LineString', partes: [[[-23.5, -46.6]]] } }, 'c')).toBeNull();
    expect(normalizarFeicaoEntrada({ id: 'x', geometria: { tipo: 'LineString', partes: [] } }, 'c')).toBeNull();
  });

  it('`partes` vence `coordenadas` quando ambas vêm', () => {
    const f = F({ id: 'x', geometria: { tipo: 'LineString', coordenadas: A, partes: [B, A] } });
    expect(f.geometria).toEqual({ tipo: 'LineString', coordenadas: B, partes: [B, A] });
  });

  it('definirFeicoes conta multilinha como aceita e guarda todas as partes', () => {
    const { g } = novo();
    const r = g.definirFeicoes('c', [multi(), { id: 'ruim', geometria: { tipo: 'LineString', partes: [] } }]);
    expect(r).toEqual({ aceitas: 1, recusadas: ['ruim'] });
    const g0 = g.obterFeicoes('c')[0].geometria;
    expect(g0.tipo === 'LineString' && g0.partes).toEqual([A, B]);
  });
});

describe('métricas', () => {
  it('extensão é a soma das partes e vale no rótulo', () => {
    const f = F(multi());
    const soma = comprimentoMetros(A) + comprimentoMetros(B);
    expect(extensaoDaGeometria(f.geometria)).toBeCloseTo(soma, 6);
    expect(extensaoDaGeometria(f.geometria)!).toBeGreaterThan(comprimentoMetros(A));
    expect(textoRotulo(f, 'extensao')).toBe(formatarExtensao(soma));
  });

  it('o envelope cobre todas as partes', () => {
    const [[s, w], [n, e]] = limitesDaGeometria(F(multi()).geometria);
    expect([s, w, n, e]).toEqual([-23.51, -46.6, -23.5, -46.58]);
  });

  it('o ponto de referência (popup) é da primeira parte', () => {
    expect(coordenadaDeReferencia(F(multi()))).toEqual(A[Math.floor(A.length / 2)]);
  });
});

describe('seleção geométrica', () => {
  const proj = (p: LatLonPar) => ({ x: (p[1] + 46.6) * 10000, y: (-23.5 - p[0]) * 10000 });
  const f = F(multi());

  it('caixa Crossing: basta uma parte tocar (também só pela aresta)', () => {
    const soB = { x1: 40, y1: 90, x2: 60, y2: 110 }; // só atravessa a parte B (y ≈ 100)
    expect(feicaoNaCaixa(f, soB, proj, 'crossing')).toBe(true);
    const nenhuma = { x1: 40, y1: 40, x2: 60, y2: 60 };
    expect(feicaoNaCaixa(f, nenhuma, proj, 'crossing')).toBe(false);
  });

  it('caixa Window: todas as partes precisam estar dentro', () => {
    expect(feicaoNaCaixa(f, { x1: -5, y1: -5, x2: 205, y2: 110 }, proj, 'window')).toBe(true);
    expect(feicaoNaCaixa(f, { x1: -5, y1: -5, x2: 205, y2: 50 }, proj, 'window')).toBe(false); // B fica de fora
  });

  it('não há aresta fantasma entre a última e a primeira parte', () => {
    // a caixa fica na diagonal que ligaria o fim de A ao início de B, longe das duas partes
    const entre = { x1: 95, y1: 40, x2: 99, y2: 60 };
    expect(feicaoNaCaixa(f, entre, proj, 'crossing')).toBe(false);
  });

  it('laço: algum vértice de qualquer parte basta', () => {
    const lacoSoB: LatLonPar[] = [[-23.509, -46.581], [-23.511, -46.581], [-23.511, -46.579], [-23.509, -46.579]];
    expect(feicaoNoLaco(f, lacoSoB)).toBe(true);
    expect(feicaoNoLaco(f, [[-23.4, -46.4], [-23.41, -46.4], [-23.41, -46.41]])).toBe(false);
  });

  it('conta-gotas/hover (feicaoNoPonto) acerta em qualquer parte', () => {
    const cand = [f];
    expect(feicaoNoPonto({ x: 50, y: 0.5 }, cand, proj)?.id).toBe('m'); // parte A
    expect(feicaoNoPonto({ x: 50, y: 100.5 }, cand, proj)?.id).toBe('m'); // parte B
    expect(feicaoNoPonto({ x: 50, y: 50 }, cand, proj)).toBeNull();
  });
});

describe('snap', () => {
  const f = F(multi());
  const proj = (p: LatLonPar) => ({ x: (p[1] + 46.6) * 10000, y: (-23.5 - p[0]) * 10000 });

  it('vértices de todas as partes atraem', () => {
    expect(buscarSnap({ x: 100.5, y: 100.5 }, [f], proj)).toMatchObject({ tipo: 'vertice', coordenada: [-23.51, -46.59] });
    expect(buscarSnap({ x: 100.5, y: 0.5 }, [f], proj)).toMatchObject({ tipo: 'vertice', coordenada: [-23.5, -46.59] });
  });

  it('aresta/ponto médio só dentro de cada parte', () => {
    // meio da aresta da parte A
    expect(buscarSnap({ x: 50, y: 0 }, [f], proj)).toMatchObject({ tipo: 'meio' });
    // no meio do "vão" entre as partes não há nada
    expect(buscarSnap({ x: 100, y: 50 }, [f], proj)).toBeNull();
  });
});

describe('simplificação', () => {
  it('simplifica cada parte e preserva a estrutura multiparte', () => {
    const reta = (lat: number): LatLonPar[] => Array.from({ length: 60 }, (_, i) => [lat, -46.6 + i * 0.00001]);
    const geo = criarLinha([reta(-23.5), reta(-23.6)]);
    const s = simplificarGeometria(geo, 5);
    expect(s.tipo === 'LineString' && s.partes?.length).toBe(2);
    expect(s.tipo === 'LineString' && partesDaLinha(s).every((p) => p.length === 2)).toBe(true);
  });
});

describe('renderizador e clique', () => {
  it('desenha todas as partes (polilinha multiparte) e o clique acerta em qualquer uma', () => {
    const { g, map, lm } = novo();
    g.definirFeicoes('c', [multi()]);
    const instancia = lm.getLayerInstance('c') as L.LayerGroup;
    const camadas: L.Polyline[] = [];
    instancia.eachLayer((l) => camadas.push(l as L.Polyline));
    expect(camadas).toHaveLength(1);
    const latlngs = camadas[0].getLatLngs() as L.LatLng[][];
    expect(latlngs).toHaveLength(2);
    expect(latlngs[0]).toHaveLength(2);
    expect(latlngs[1]).toHaveLength(3);

    // partes projetadas (o Leaflet só calcula quando o renderer atualiza; força aqui)
    (camadas[0] as unknown as { _project: () => void })._project();
    const parts = (camadas[0] as unknown as { _parts: L.Point[][] })._parts;
    expect(parts.length).toBe(2);

    const def = lm.getLayerDef('c')!;
    const renderers = (map as unknown as { _paneRenderers?: Record<string, unknown> })._paneRenderers;
    expect(renderers).toBeTruthy();
    {
      const sobA = map.latLngToLayerPoint(A[0]);
      const sobB = map.latLngToLayerPoint(B[1]);
      const longe = map.latLngToLayerPoint([-23.505, -46.595]);
      expect(consultarFeicoesNoPonto(map, [def], sobA).length).toBe(1);
      expect(consultarFeicoesNoPonto(map, [def], sobB).length).toBe(1);
      expect(consultarFeicoesNoPonto(map, [def], longe).length).toBe(0);
    }
  });

  it('atualizar de multi para simples (e de volta) remenda a mesma camada', () => {
    const { g, lm } = novo();
    g.definirFeicoes('c', [multi()]);
    g.atualizarFeicao('c', 'm', { geometria: { tipo: 'LineString', coordenadas: A } });
    const inst = lm.getLayerInstance('c') as L.LayerGroup;
    let poli: L.Polyline | undefined;
    inst.eachLayer((l) => { poli = l as L.Polyline; });
    expect((poli!.getLatLngs() as L.LatLng[]).length).toBe(2); // 2 vértices, plano
    expect((poli!.getLatLngs() as L.LatLng[])[0]).toBeInstanceOf(L.LatLng);
    g.atualizarFeicao('c', 'm', { geometria: { tipo: 'LineString', partes: [A, B] } });
    expect((poli!.getLatLngs() as L.LatLng[][]).length).toBe(2);
  });
});

describe('operações com multilinha', () => {
  it('editarVertices recusa com `multiparte` e emite cad-edicao-recusada', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [multi()]);
    expect(verificarEditavel(F(multi()))).toBe('multiparte');
    expect(g.iniciarEdicao('c', 'm')).toEqual({ ok: false, motivo: 'multiparte' });
    expect(ev('cad-edicao-recusada')[0].motivo).toBe('multiparte');
    expect(g.editando).toBe(false);
  });

  it('linha simples continua editável', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ id: 's', geometria: { tipo: 'LineString', coordenadas: A } }]);
    expect(g.iniciarEdicao('c', 's').ok).toBe(true);
  });

  it('juntar recusa multilinha com motivo `multiparte` e não mexe nas feições', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [multi(), { id: 's', geometria: { tipo: 'LineString', coordenadas: [[-23.51, -46.58], [-23.52, -46.58]] } }]);
    expect(g.juntarFeicoes('c', ['m', 's'])).toBeNull();
    expect(ev('cad-uniao-falhou')).toEqual([{ motivo: 'multiparte' }]);
    expect(g.obterFeicoes('c')).toHaveLength(2);
  });

  it('dividir com multilinha selecionada (sem polígonos) recusa com `multiparte`', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [multi()]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'm' }]);
    expect(g.dividirComLinha([[-23.505, -46.61], [-23.505, -46.57]])).toBe(false);
    expect(ev('cad-divisao-falhou')).toEqual([{ motivo: 'multiparte' }]);
  });

  it('duplicar desloca todas as partes; buffer de multilinha não é suportado (null)', () => {
    const { g } = novo();
    g.definirFeicoes('c', [multi()]);
    const copia = g.duplicarFeicao('c', 'm', { norteM: 100 }, { id: 'copia' })!;
    expect(copia.geometria.tipo === 'LineString' && copia.geometria.partes?.length).toBe(2);
    const original = F(multi()).geometria;
    const deslocada = deslocarGeometria(original, 0, 100);
    expect(deslocada).toEqual(copia.geometria);
    expect(gerarBuffer(original, 10)).toBeNull();
    expect(g.gerarBuffer('c', 'm', 10)).toBeNull();
  });

  it('obterFeicoes devolve a multilinha inteira', () => {
    const { g } = novo();
    g.definirFeicoes('c', [multi()]);
    const f = g.obterFeicoes('c')[0];
    expect(f.geometria).toEqual({ tipo: 'LineString', coordenadas: A, partes: [A, B] });
  });
});
