import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { CSS_POSICAO_HUD, MARGEM_HUD_PADRAO, posicaoHud, aplicarMargensHud } from '../src/gerencigeo-canvas/feature_hud';

afterEach(() => { document.body.innerHTML = ''; });

function novo() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
  const lm = new CanvasLayerManager([]);
  const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, emitir: () => undefined });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
  return { g, map, el };
}

const linha = { id: 'l', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.51, -46.59]] } };

describe('posicaoHud (a mesma conta do CSS)', () => {
  it('padrões = comportamento antigo: centro do mapa, 16 px da base, até 92% da largura', () => {
    expect(MARGEM_HUD_PADRAO).toEqual({ topo: 0, base: 16, esquerda: 0, direita: 0 });
    const p = posicaoHud(800, 600);
    expect(p.centroX).toBe(400);
    expect(p.base).toBe(16);
    expect(p.larguraMax).toBe(736);
  });

  it('centraliza na área visível descontando as margens', () => {
    const p = posicaoHud(1000, 600, { esquerda: 100, direita: 300, base: 56 });
    expect(p.centroX).toBe(100 + 300); // área visível: 600 px, começando em 100
    expect(p.base).toBe(56);
    expect(p.larguraMax).toBe(584); // 600 - folga de 16
  });

  it('não passa dos limites com margens enormes', () => {
    const p = posicaoHud(400, 300, { esquerda: 300, direita: 300, topo: 250, base: 100 });
    expect(p.larguraMax).toBe(0);
    expect(p.alturaMax).toBe(0);
    expect(p.centroX).toBe(300);
  });
});

describe('HUD de desenho e de edição seguem a mesma regra', () => {
  it('ambos carregam o mesmo bloco de posicionamento (custom properties, max-width, quebra de linha)', () => {
    const { g } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('linha');
    const desenho = document.getElementById('cm-draw-hud')!;
    expect(desenho).toBeTruthy();
    g.desativarFerramenta();

    g.definirFeicoes('r', [linha]);
    expect(g.iniciarEdicao('r', 'l').ok).toBe(true);
    const edicao = document.getElementById('cm-vertex-edit-hud')!;
    expect(edicao).toBeTruthy();

    for (const hud of [desenho, edicao]) {
      const css = hud.getAttribute('style') ?? '';
      expect(css).toContain('--cad-hud-esquerda');
      expect(css).toContain('--cad-hud-direita');
      expect(css).toContain('--cad-hud-base');
      expect(css).toContain('max-width');
      expect(css).toContain('flex-wrap');
      expect(css).toContain('max-height');
    }
    // o bloco comum é a fonte única da regra
    expect(CSS_POSICAO_HUD).toContain('left:calc(var(--cad-hud-esquerda,0px)');
    expect(CSS_POSICAO_HUD).toContain('bottom:var(--cad-hud-base,16px)');
  });

  it('definirMargensHud grava as custom properties no contêiner do mapa, que os dois HUDs herdam', () => {
    const { g, map } = novo();
    g.definirMargensHud({ base: 56, direita: 320 });
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('linha');
    const c = map.getContainer();
    expect(c.style.getPropertyValue('--cad-hud-base')).toBe('56px');
    expect(c.style.getPropertyValue('--cad-hud-direita')).toBe('320px');
    expect(c.style.getPropertyValue('--cad-hud-esquerda')).toBe('');
    expect(c.contains(document.getElementById('cm-draw-hud'))).toBe(true);
    g.desativarFerramenta();

    g.definirFeicoes('r', [linha]);
    g.iniciarEdicao('r', 'l');
    expect(c.contains(document.getElementById('cm-vertex-edit-hud'))).toBe(true);
    expect(c.style.getPropertyValue('--cad-hud-base')).toBe('56px');
  });

  it('as margens mesclam; undefined volta ao padrão; valor inválido é ignorado', () => {
    const { g, map } = novo();
    const c = map.getContainer();
    g.definirMargensHud({ base: 56 });
    g.definirMargensHud({ esquerda: 10 });
    expect(c.style.getPropertyValue('--cad-hud-base')).toBe('56px');
    expect(c.style.getPropertyValue('--cad-hud-esquerda')).toBe('10px');
    g.definirMargensHud({ base: undefined });
    expect(c.style.getPropertyValue('--cad-hud-base')).toBe('');
    g.definirMargensHud({ esquerda: -5 });
    expect(c.style.getPropertyValue('--cad-hud-esquerda')).toBe('');
    g.definirMargensHud({ direita: Number.NaN });
    expect(c.style.getPropertyValue('--cad-hud-direita')).toBe('');
  });

  it('margens definidas antes do mapa existir valem quando a ferramenta é ativada', () => {
    const { g, map } = novo();
    g.definirMargensHud({ topo: 40 });
    aplicarMargensHud(map.getContainer(), {}); // simula contêiner "limpo"
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('ponto');
    expect(map.getContainer().style.getPropertyValue('--cad-hud-topo')).toBe('40px');
  });
});
