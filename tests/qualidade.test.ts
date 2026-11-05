import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import '../src/index';
import '../src/components/ui-canvas-cad';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import {
  NIVEIS_QUALIDADE, aplicarPerfilAoMapa, lerNivelQualidade, modoRenderizadorEfetivo, perfilDe, perfilDoAtributo, type MapaAjustavel
} from '../src/gerencigeo-canvas/qualidade';
import { MotorFormas } from '../src/gerencigeo-canvas/motor/motor-formas';
import { PintorCanvas2D, type ContextoFormas2D, type SuperficiePintura } from '../src/gerencigeo-canvas/renderers/renderizador_formas';
import { CanvasFormas } from '../src/gerencigeo-canvas/renderers/canvas_formas_leaflet';
import { projetarMercator } from '../src/gerencigeo-canvas/feature_lod';
import type { Feicao } from '../src/gerencigeo-canvas/feature_types';
import type { Vista } from '../src/gerencigeo-canvas/motor/tipos';

/*
 * Atributo `qualidade` do <ui-canvas-cad>: perfis que trocam fidelidade visual por desempenho. Camadas A (perfil e
 * motor puros), B (componente) e C (entradas hostis).
 */

afterEach(() => { document.body.innerHTML = ''; });

const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((23.5 * Math.PI) / 180));
const quad = (id: string, lon: number, lado: number, extra: Partial<Feicao> = {}): Feicao => ({
  id, camadaId: 'c', propriedades: {},
  geometria: { tipo: 'Polygon', aneis: [[[-23.5, lon], [-23.5, lon + lado * mLon], [-23.5 + lado * mLat, lon + lado * mLon], [-23.5 + lado * mLat, lon]]] },
  ...extra
});

function vista(zoom: number): Vista {
  const c = projetarMercator(-23.5, -46.6, zoom);
  const e = 256 * 2 ** zoom;
  const lon = (x: number) => (x / e) * 360 - 180;
  const lat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / e))) * 180) / Math.PI;
  return {
    zoom, larguraPx: 800, alturaPx: 600, dpr: 1, origemPx: { x: c.x - 400, y: c.y - 300 },
    caixa: { minLon: lon(c.x - 400), maxLon: lon(c.x + 400), maxLat: lat(c.y - 300), minLat: lat(c.y + 300) }
  };
}

describe('perfis de qualidade (puro)', () => {
  it('lerNivelQualidade: só media/baixa mudam; ausente, vazio e lixo caem em alta', () => {
    expect(lerNivelQualidade('media')).toBe('media');
    expect(lerNivelQualidade(' MÉDIA ')).toBe('media');
    expect(lerNivelQualidade('baixa')).toBe('baixa');
    for (const v of ['alta', '', null, undefined, 'xpto', '0', 'true', '<script>']) expect(lerNivelQualidade(v as string)).toBe('alta');
  });

  it('os perfis ficam monotonicamente mais baratos: alta → media → baixa', () => {
    const [alta, media, baixa] = NIVEIS_QUALIDADE.map(perfilDe);
    expect(alta.limiteMarcaPx).toBeLessThan(media.limiteMarcaPx);
    expect(media.limiteMarcaPx).toBeLessThan(baixa.limiteMarcaPx);
    expect(alta.toleranciaPx).toBeLessThan(media.toleranciaPx);
    expect(media.toleranciaPx).toBeLessThan(baixa.toleranciaPx);
    expect(alta.zoomSnap).toBeLessThan(media.zoomSnap);
    expect(media.zoomSnap).toBeLessThan(baixa.zoomSnap);
    expect(alta.keepBuffer).toBeGreaterThan(media.keepBuffer);
    expect(media.keepBuffer).toBeGreaterThan(baixa.keepBuffer);
    expect([alta.dprMaximo, baixa.dprMaximo]).toEqual([2, 1]);
    expect([alta.tracejado, baixa.tracejado]).toEqual([true, false]);
    expect([alta.animacoes, baixa.animacoes]).toEqual([true, false]);
  });

  it('alta preserva os padrões de sempre (renderizador leaflet, LOD 3 px, tolerância 1,2 px, zoom fino)', () => {
    expect(perfilDoAtributo(null)).toMatchObject({ nivel: 'alta', renderizadorPadrao: 'leaflet', limiteMarcaPx: 3, toleranciaPx: 1.2, zoomSnap: 0.25, zoomDelta: 0.5 });
  });

  it('os perfis são imutáveis (um consumidor não altera o padrão dos demais)', () => {
    const p = perfilDe('baixa') as { limiteMarcaPx: number };
    expect(() => { p.limiteMarcaPx = 1; }).toThrow();
    expect(perfilDe('baixa').limiteMarcaPx).toBe(10);
  });

  it('modoRenderizadorEfetivo: o atributo renderizador manda; sem ele vale o padrão do perfil', () => {
    expect(modoRenderizadorEfetivo(null, perfilDe('alta'))).toBe('leaflet');
    expect(modoRenderizadorEfetivo(null, perfilDe('media'))).toBe('canvas');
    expect(modoRenderizadorEfetivo('leaflet', perfilDe('baixa'))).toBe('leaflet');
    expect(modoRenderizadorEfetivo('xpto', perfilDe('baixa'))).toBe('leaflet'); // inválido continua sendo leaflet, como sempre
    expect(modoRenderizadorEfetivo(' CANVAS ', perfilDe('alta'))).toBe('canvas');
  });
});

describe('aplicarPerfilAoMapa', () => {
  const mapaFalso = (): MapaAjustavel => ({
    options: { zoomSnap: 0.25, zoomDelta: 0.5, inertia: true, zoomAnimation: true, fadeAnimation: true, markerZoomAnimation: true },
    _zoomAnimated: true, _fadeAnimated: true
  });

  it('baixa desliga animações e inércia e usa zoom inteiro; voltar para alta restaura o que o Leaflet tinha', () => {
    const m = mapaFalso();
    aplicarPerfilAoMapa(m, perfilDe('baixa'));
    expect(m.options).toMatchObject({ zoomSnap: 1, zoomDelta: 1, inertia: false, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false });
    expect([m._zoomAnimated, m._fadeAnimated]).toEqual([false, false]);
    aplicarPerfilAoMapa(m, perfilDe('alta'));
    expect(m.options).toMatchObject({ zoomSnap: 0.25, zoomDelta: 0.5, inertia: true, zoomAnimation: true, fadeAnimation: true, markerZoomAnimation: true });
    expect([m._zoomAnimated, m._fadeAnimated]).toEqual([true, true]);
  });

  it('não liga uma animação que o Leaflet já tinha desligado (ex.: sem 3D)', () => {
    const m = mapaFalso();
    m._zoomAnimated = false;
    m.options.zoomAnimation = false;
    aplicarPerfilAoMapa(m, perfilDe('baixa'));
    aplicarPerfilAoMapa(m, perfilDe('media'));
    expect(m._zoomAnimated).toBe(false);
    expect(m.options.zoomAnimation).toBe(false);
  });

  it('entrada hostil: null, undefined, sem options e mapa que lança não estouram', () => {
    expect(() => aplicarPerfilAoMapa(null, perfilDe('baixa'))).not.toThrow();
    expect(() => aplicarPerfilAoMapa(undefined, perfilDe('baixa'))).not.toThrow();
    expect(() => aplicarPerfilAoMapa({} as MapaAjustavel, perfilDe('baixa'))).not.toThrow();
    const veneno = { get options(): never { throw new Error('boom'); } } as unknown as MapaAjustavel;
    expect(() => aplicarPerfilAoMapa(veneno, perfilDe('baixa'))).not.toThrow();
  });
});

describe('MotorFormas.definirQualidade', () => {
  // 100 m de lado: diagonal ~141 m = ~4,6 px em zoom 14 (9,55 m/px a 23,5°S em 256·2^14)... medimos em vez de supor
  const feicoes = [quad('a', -46.6, 100)];
  const motor = () => {
    const m = new MotorFormas();
    m.definirCamada({ id: 'c', zIndex: 1, opacidade: 1, visivel: true, interativo: true, estilo: { corPrimaria: '#f00' } });
    m.definirFeicoes('c', feicoes);
    return m;
  };
  const formas = (m: MotorFormas, zoom: number) => m.listaDesenho(vista(zoom)).camadas.flatMap((c) => c.itens).map((i) => i.forma);

  it('limite de marca maior transforma em marca o que antes era polígono (e voltar desfaz)', () => {
    const m = motor();
    let z = 16;
    while (formas(m, z)[0] !== 'poligono' && z < 20) z++;
    // acha um zoom em que a forma de 100 m ainda é polígono com o limite padrão
    const zoomPoligono = z;
    expect(formas(m, zoomPoligono)).toEqual(['poligono']);
    // com limite enorme, a mesma forma vira marca
    m.definirQualidade({ limiteMarcaPx: 10_000 });
    expect(formas(m, zoomPoligono)).toEqual(['marca']);
    m.definirQualidade({ limiteMarcaPx: 3 });
    expect(formas(m, zoomPoligono)).toEqual(['poligono']);
  });

  it('valores inválidos (NaN, 0, negativo, undefined) mantêm o que já estava e não descartam os caches', () => {
    const m = motor();
    m.definirQualidade({ limiteMarcaPx: 6, toleranciaPx: 2 });
    const lista1 = formas(m, 15);
    for (const v of [NaN, 0, -5, Infinity, undefined]) m.definirQualidade({ limiteMarcaPx: v as number, toleranciaPx: v as number });
    expect(formas(m, 15)).toEqual(lista1);
    expect(() => m.definirQualidade(undefined as never)).not.toThrow();
    expect(() => m.definirQualidade(null as never)).not.toThrow();
  });

  it('tolerância maior simplifica mais vértices em px', () => {
    // zigue-zague de ±8 m a cada 20 m: ~1,8 px de amplitude em zoom 15, acima da tolerância padrão (1,2) e abaixo de 6
    const anel = Array.from({ length: 200 }, (_, i) => [-23.5 + (i % 2 ? 8 : -8) * mLat, -46.6 + i * 20 * mLon] as [number, number]);
    const f: Feicao = { id: 'l', camadaId: 'c', propriedades: {}, geometria: { tipo: 'LineString', coordenadas: anel } };
    const m = new MotorFormas();
    m.definirCamada({ id: 'c', zIndex: 1, opacidade: 1, visivel: true, interativo: true, estilo: {} });
    m.definirFeicoes('c', [f]);
    const vertices = () => m.listaDesenho(vista(15)).camadas[0].itens.reduce((s, i) => s + i.geometriaEmPx.reduce((t, p) => t + (p.length >> 1), 0), 0);
    const base = vertices();
    m.definirQualidade({ toleranciaPx: 6 });
    expect(vertices()).toBeLessThan(base);
  });
});

describe('PintorCanvas2D.definirTracejado', () => {
  function ctxFalso() {
    const chamadas: Array<[string, ...unknown[]]> = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_, k: string) => (...a: unknown[]) => { chamadas.push([k, ...a]); },
      set: () => true
    }) as unknown as ContextoFormas2D;
    return { ctx, chamadas };
  }
  const desenhar = (tracejado: boolean) => {
    const f = ctxFalso();
    const sup: SuperficiePintura = { ctx: f.ctx, largura: 800, altura: 600, dpr: 1 };
    const m = new MotorFormas();
    m.definirCamada({ id: 'c', zIndex: 1, opacidade: 1, visivel: true, interativo: true, estilo: {} });
    m.definirFeicoes('c', [quad('p', -46.6, 80, { status: 'previa' })]); // prévia = tracejada
    const p = new PintorCanvas2D({ camada: () => sup, sobreposicao: () => null });
    p.definirTracejado(tracejado);
    p.desenhar(m.listaDesenho(vista(14)), vista(14));
    return f.chamadas.filter(([k]) => k === 'setLineDash').map(([, d]) => (d as number[]).join());
  };

  it('ligado: a prévia é tracejada; desligado: linha contínua', () => {
    expect(desenhar(true)).toContain('6,4');
    expect(desenhar(false).every((d) => d === '')).toBe(true);
  });
});

describe('CanvasFormas.definirDprMaximo', () => {
  it('teto 1 limita o multiplicador mesmo com tela retina; teto 2 deixa o do Leaflet; entrada inválida vira 2', () => {
    const antes = L.Browser.retina;
    (L.Browser as { retina: boolean }).retina = true;
    try {
      const c = new CanvasFormas({ dprMaximo: 1 }, () => 0);
      const mult = () => (c as unknown as { multiplicador: number }).multiplicador;
      expect(mult()).toBe(1);
      c.definirDprMaximo(2);
      expect(mult()).toBe(2);
      c.definirDprMaximo(NaN);
      expect(mult()).toBe(2);
      c.definirDprMaximo(1);
      expect(mult()).toBe(1);
      expect(() => c.definirDprMaximo(1)).not.toThrow(); // sem mapa e sem mudança: não faz nada
    } finally {
      (L.Browser as { retina: boolean }).retina = antes;
    }
  });
});

describe('<ui-canvas-cad qualidade>', () => {
  const esperar = () => new Promise<void>((r) => setTimeout(r, 60));
  const quadro = (id: string, lon = -46.6): Feicao => ({
    id, camadaId: 'g', propriedades: {}, geometria: { tipo: 'Polygon', aneis: [[[-23.5, lon], [-23.5, lon + 0.001], [-23.499, lon + 0.001], [-23.499, lon]]] }
  });
  function criar(atributos: Record<string, string> = {}): UICanvasCAD {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
    el.setAttribute('sem-camadas-padrao', '');
    document.body.appendChild(el);
    const map = el.inicializarAgora()!;
    map.setView([-23.5, -46.6], 16, { animate: false });
    return el;
  }

  it('padrão é alta, com renderizador leaflet; a propriedade lê e grava o atributo; valor inválido cai em alta', () => {
    const el = criar();
    expect(el.qualidade).toBe('alta');
    expect(el.renderizador).toBe('leaflet');
    el.qualidade = 'baixa';
    expect(el.getAttribute('qualidade')).toBe('baixa');
    el.setAttribute('qualidade', 'xpto');
    expect(el.qualidade).toBe('alta');
  });

  it('média e baixa escolhem o renderizador canvas quando o atributo renderizador não foi dado; o atributo vence', async () => {
    const el = criar({ qualidade: 'baixa' });
    expect(el.renderizador).toBe('canvas');
    el.definirFeicoes('g', [quadro('a'), quadro('b', -46.598)]);
    await esperar();
    expect(el.estatisticasFeicoes('g')).toMatchObject({ total: 2, renderizador: 'canvas' });
    el.setAttribute('renderizador', 'leaflet');
    expect(el.renderizador).toBe('leaflet');
  });

  it('na criação, o perfil ajusta o mapa (zoom inteiro, sem inércia nem animação de zoom)', () => {
    const el = criar({ qualidade: 'baixa' });
    const map = el.inicializarAgora()!;
    expect(map.options).toMatchObject({ zoomSnap: 1, zoomDelta: 1, inertia: false, zoomAnimation: false });
  });

  it('mudar em execução recria as camadas no perfil novo, mantém os dados e restaura o mapa ao voltar para alta', async () => {
    const el = criar();
    el.definirFeicoes('g', [quadro('a'), quadro('b', -46.598)]);
    el.selecionarFeicoes([{ camadaId: 'g', id: 'a' }]);
    expect(el.estatisticasFeicoes('g')!.renderizador).toBe('leaflet');
    el.setAttribute('qualidade', 'media');
    await esperar();
    expect(el.estatisticasFeicoes('g')).toMatchObject({ total: 2, renderizador: 'canvas' });
    expect(el.obterFeicoes('g').map((f) => f.id).sort()).toEqual(['a', 'b']);
    expect(el.inicializarAgora()!.options.zoomSnap).toBe(0.5);
    el.setAttribute('qualidade', 'alta');
    await esperar();
    expect(el.estatisticasFeicoes('g')).toMatchObject({ total: 2, renderizador: 'leaflet' });
    expect(el.inicializarAgora()!.options.zoomSnap).toBe(0.25);
  });

  it('LOD mais agressivo: a mesma camada tem mais marcas em baixa do que em alta', async () => {
    const el = criar({ renderizador: 'canvas' });
    const map = el.inicializarAgora()!;
    Object.defineProperty(map.getContainer(), 'clientWidth', { value: 800 });
    Object.defineProperty(map.getContainer(), 'clientHeight', { value: 600 });
    map.invalidateSize({ animate: false });
    map.setView([-23.5, -46.6], 16, { animate: false });
    // 20 formas de 8 m: em zoom 16 a diagonal é ~5 px, acima do limite de alta (3 px) e abaixo do de baixa (10 px)
    const lista = Array.from({ length: 20 }, (_, i) => quad(`q${i}`, -46.6 + i * 3e-4, 8, { camadaId: 'g' }));
    el.definirFeicoes('g', lista);
    await esperar();
    const marcasAlta = el.estatisticasFeicoes('g')!.marcasLOD;
    el.setAttribute('qualidade', 'baixa');
    await esperar();
    const marcasBaixa = el.estatisticasFeicoes('g')!.marcasLOD;
    expect(marcasBaixa).toBeGreaterThan(marcasAlta);
  });

  it('reconexão e destruição com qualidade baixa não estouram nem deixam o mapa para trás', async () => {
    const el = criar({ qualidade: 'baixa' });
    el.definirFeicoes('g', [quadro('a')]);
    await esperar();
    expect(() => el.destroy()).not.toThrow();
    expect(() => el.setAttribute('qualidade', 'media')).not.toThrow();
  });
});
