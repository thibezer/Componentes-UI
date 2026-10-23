import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { LayerRendererFactory } from '../src/gerencigeo-canvas/layer_renderer_factory';
import { RegraVersoes } from '../src/gerencigeo-canvas/feature_versoes';
import { COR_SELECAO, type FeicoesLayerRenderer } from '../src/gerencigeo-canvas/renderers/feicoes_renderer';

/*
 * Equivalência (padrão de feicoes-lote.test.ts): sequências aleatórias de lotes, seleção no meio, travessia do limite
 * de 300, oficial × prévia e oculta × excluida. O desenho incremental (deltas) tem que ser igual ao de uma camada
 * reconstruída do zero com o mesmo resultado, agora incluindo o que virou marca de LOD.
 */

afterEach(() => { document.body.innerHTML = ''; });

function novo(zoom: number) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom });
  const lm = new CanvasLayerManager([]);
  const regra = new RegraVersoes();
  const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, regra, emitir: () => undefined });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined, regraVersoes: regra } as never);
  const renderer = () => LayerRendererFactory.get('feicoes') as FeicoesLayerRenderer;
  const desenho = () => renderer().idsDesenhados(lm.getLayerInstance('c') as L.LayerGroup)!;
  const selecionadasNoDesenho = () =>
    (lm.getLayerInstance('c') as L.LayerGroup).getLayers().filter((l) => (l as L.Polygon).options?.color === COR_SELECAO).length;
  return { g, lm, map, desenho, selecionadasNoDesenho };
}

function semente(n: number) {
  let s = n;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((23.5 * Math.PI) / 180));

describe('desenho incremental = desenho completo (com LOD)', () => {
  function comparar(zoom: number, inicial: number, rodadas: number, opcoes: { selecionar?: boolean; versoes?: boolean; ocultar?: boolean } = {}) {
    const r = semente(7 + zoom + inicial);
    const gerar = (id: string) => {
      const lat = -23.5 + (r() - 0.5) * 0.04;
      const lon = -46.6 + (r() - 0.5) * 0.04;
      const lado = r() < 0.5 ? 30 + r() * 30 : 300 + r() * 300; // metade minúscula, metade grande
      const extra: Record<string, unknown> = {};
      if (opcoes.versoes && r() < 0.15) { extra.entidadeId = `e${Math.floor(r() * 5)}`; extra.status = r() < 0.5 ? 'previa' : 'oficial'; }
      if (opcoes.ocultar && r() < 0.1) extra.oculta = true;
      return {
        id, ...extra, estilo: { corTraco: '#ff0000' },
        geometria: { tipo: 'Polygon', aneis: [[[lat, lon], [lat, lon + lado * mLon], [lat + lado * mLat, lon + lado * mLon], [lat + lado * mLat, lon]]] }
      };
    };
    const a = novo(zoom);
    a.g.definirFeicoes('c', Array.from({ length: inicial }, (_, i) => gerar(`p${i}`)));
    let proximo = inicial;
    for (let k = 0; k < rodadas; k++) {
      const atuais = a.g.obterFeicoes('c').map((f) => f.id);
      const remover = Array.from({ length: 3 }, () => atuais[Math.floor(r() * atuais.length)]);
      const atualizar = Array.from({ length: 4 }, () => ({ ...gerar('x'), id: atuais[Math.floor(r() * atuais.length)] }));
      const adicionar = Array.from({ length: 5 }, () => gerar(`p${proximo++}`));
      a.g.aplicarLote('c', { remover, atualizar: atualizar.filter((u) => !remover.includes(u.id)), adicionar });
      if (opcoes.selecionar && k % 3 === 0) {
        const s = a.g.obterFeicoes('c').map((f) => f.id).filter(() => r() < 0.05).map((id) => ({ camadaId: 'c', id }));
        a.g.selecionarFeicoes(s);
      }
    }
    const b = novo(zoom);
    b.g.definirFeicoes('c', a.g.obterFeicoes('c'));
    if (opcoes.selecionar) b.g.selecionarFeicoes(a.g.obterFeicoesSelecionadas().map((f) => ({ camadaId: 'c', id: f.id })));
    return { a, b };
  }

  it('zoom 12: metade vira marca, e o incremental concorda com o completo', () => {
    const { a, b } = comparar(12, 150, 10);
    expect(a.desenho().marcas.length).toBeGreaterThan(10);
    expect(a.desenho()).toEqual(b.desenho());
  });

  it('com seleção no meio das mudanças', () => {
    const { a, b } = comparar(12, 150, 12, { selecionar: true });
    expect(a.g.obterFeicoesSelecionadas().length).toBeGreaterThan(0);
    expect(a.desenho()).toEqual(b.desenho());
    expect(a.selecionadasNoDesenho()).toBe(b.selecionadasNoDesenho());
  });

  it('com oficial × prévia (pares em detalhe completo) e oculta × excluida', () => {
    const { a, b } = comparar(12, 160, 12, { versoes: true, ocultar: true });
    expect(a.desenho()).toEqual(b.desenho());
  });

  it('acima do limite de culling (só a viewport) e travessia do limite', () => {
    const { a, b } = comparar(13, 320, 8, { selecionar: true });
    expect(a.desenho()).toEqual(b.desenho());
    const c = novo(13);
    c.g.definirFeicoes('c', Array.from({ length: 295 }, (_, i) => ({
      id: `n${i}`, geometria: { tipo: 'Polygon', aneis: [[[-23.5 + i * 1e-4, -46.6], [-23.5 + i * 1e-4, -46.6003], [-23.5003 + i * 1e-4, -46.6003]]] }
    })));
    c.g.aplicarLote('c', { adicionar: Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`, geometria: { tipo: 'Polygon', aneis: [[[-23.5 + i * 1e-4, -46.61], [-23.5 + i * 1e-4, -46.6103], [-23.5003 + i * 1e-4, -46.6103]]] }
    })) });
    const d = novo(13);
    d.g.definirFeicoes('c', c.g.obterFeicoes('c'));
    expect(c.desenho()).toEqual(d.desenho());
  });

  it('trocar o zoom e voltar não deixa lixo: o desenho final é o do zoom final', async () => {
    const { a, b } = comparar(12, 120, 6);
    a.map.setZoom(16, { animate: false });
    await new Promise((res) => setTimeout(res, 80));
    a.map.setZoom(12, { animate: false });
    await new Promise((res) => setTimeout(res, 80));
    expect(a.desenho()).toEqual(b.desenho());
  });
});

describe('regressão: marca de LOD que vira ponto agrupado', () => {
  it('a marca antiga some quando a feição vira um ponto dentro de um cluster (caminho incremental)', () => {
    const c = novo(12);
    const pontos = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, geometria: { tipo: 'Point', coordenada: [-23.5 + i * 1e-6, -46.6] } }));
    c.g.definirFeicoes('c', [...pontos, quad_('m', -23.5, -46.6, 30)]);
    expect(c.desenho().marcas).toEqual(['m']);
    c.g.aplicarLote('c', { atualizar: [{ id: 'm', geometria: { tipo: 'Point', coordenada: [-23.5 + 5e-7, -46.6] } }] });
    expect(c.desenho().marcas).toEqual([]);
    const completo = novo(12);
    completo.g.definirFeicoes('c', c.g.obterFeicoes('c'));
    expect(c.desenho()).toEqual(completo.desenho());
  });
});

const quad_ = (id: string, lat: number, lon: number, lado: number) => ({
  id, geometria: { tipo: 'Polygon', aneis: [[[lat, lon], [lat, lon + lado * mLon], [lat + lado * mLat, lon + lado * mLon], [lat + lado * mLat, lon]]] }
});
