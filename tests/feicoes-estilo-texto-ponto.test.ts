import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import type { EstiloFeicao } from '../src/gerencigeo-canvas/feature_types';

afterEach(() => { document.body.innerHTML = ''; });

function novo() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.5, -46.6], zoom: 17 });
  const lm = new CanvasLayerManager([]);
  const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, emitir: () => undefined });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
  const camada = () => (lm.getLayerInstance('c') as L.LayerGroup).getLayers()[0];
  const html = () => String(((camada() as L.Marker).options.icon as L.DivIcon).options.html);
  return { g, lm, camada, html };
}

const texto = (estilo: EstiloFeicao, t = 'Marco 1') => ({ id: 't', geometria: { tipo: 'Text', coordenada: [-23.5, -46.6], texto: t }, estilo });
const ponto = (estilo?: EstiloFeicao) => ({ id: 'p', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] }, estilo });

describe('texto: selo (fundo e borda)', () => {
  it('sem corFundo nada muda: o halo continua valendo', () => {
    const { g, html } = novo();
    g.definirFeicoes('c', [texto({ halo: true, corBorda: '#f00', raioBorda: 9 })]);
    expect(html()).toContain('text-shadow');
    expect(html()).not.toContain('background');
    expect(html()).not.toContain('border');
  });

  it('com corFundo vira selo: fundo, borda e raio; o halo é substituído', () => {
    const { g, html } = novo();
    g.definirFeicoes('c', [texto({ halo: true, corFundo: '#102030', corBorda: 'rgb(255, 0, 0)', opacidadeFundo: 0.5, raioBorda: 8, tamanhoFonte: 15 })]);
    const h = html();
    expect(h).toContain('background:#102030');
    expect(h).toContain('opacity:0.5');
    expect(h).toContain('border-radius:8px');
    expect(h).toContain('border:1px solid rgb(255, 0, 0)');
    expect(h).toContain('font-size:15px');
    expect(h).not.toContain('text-shadow');
  });

  it('padrões do selo: opacidade 0,85, raio 4 px, sem borda', () => {
    const { g, html } = novo();
    g.definirFeicoes('c', [texto({ corFundo: 'black' })]);
    expect(html()).toContain('opacity:0.85');
    expect(html()).toContain('border-radius:4px');
    expect(html()).toContain('border:none');
  });

  it('números fora da faixa são limitados e inválidos usam o padrão', () => {
    const { g, html } = novo();
    g.definirFeicoes('c', [texto({ corFundo: '#000', opacidadeFundo: 7, raioBorda: 9999 })]);
    expect(html()).toContain('opacity:1');
    expect(html()).toContain('border-radius:50px');
    g.atualizarFeicao('c', 't', { estilo: { opacidadeFundo: -3, raioBorda: -2 } });
    expect(html()).toContain('opacity:0');
    expect(html()).toContain('border-radius:0px');
    g.atualizarFeicao('c', 't', { estilo: { opacidadeFundo: Number.NaN, raioBorda: 'x' as unknown as number } });
    expect(html()).toContain('opacity:0.85');
    expect(html()).toContain('border-radius:4px');
  });

  it('não deixa injetar CSS/HTML por cor, número ou texto', () => {
    const { g, html } = novo();
    g.definirFeicoes('c', [texto({
      corFundo: 'red;background:url(//evil)',
      corBorda: '"><img src=x onerror=alert(1)>',
      opacidadeFundo: '1;x:y' as unknown as number,
      raioBorda: '4px;color:red' as unknown as number
    }, '<b onmouseover=x>oi</b>')]);
    const h = html();
    expect(h).not.toContain('evil');
    expect(h).not.toContain('<img');
    expect(h).not.toContain('onerror');
    expect(h).not.toContain('<b ');
    expect(h).toContain('&lt;b');
    expect(h).not.toContain('background:'); // corFundo inválida: nem selo
    // corFundo válida com os demais campos inválidos: tudo cai nos padrões
    g.atualizarFeicao('c', 't', { estilo: { corFundo: '#fff' } });
    const h2 = html();
    expect(h2).toContain('opacity:0.85');
    expect(h2).toContain('border-radius:4px');
    expect(h2).not.toContain('url(');
    expect(h2).not.toContain('onerror');
  });

  it('selecionado, o selo ganha a borda de seleção', () => {
    const { g, html, camada } = novo();
    g.definirFeicoes('c', [texto({ corFundo: '#000' })]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 't' }]);
    expect(html()).toContain('border:1px solid #38bdf8');
    expect(((camada() as L.Marker).options.icon as L.DivIcon).options.className).toContain('cad-feicao-selecionada');
  });

  it('o texto continua escapado dentro do selo', () => {
    const { g, html } = novo();
    g.definirFeicoes('c', [texto({ corFundo: '#000' }, 'a<b>&"')]);
    expect(html()).toContain('a&lt;b&gt;&amp;');
    expect(html()).not.toContain('a<b>');
  });
});

describe('ponto sem ícone: contorno próprio', () => {
  it('padrão preservado: contorno = corTraco, espessura = espessuraTraco', () => {
    const { g, camada } = novo();
    g.definirFeicoes('c', [ponto({ corTraco: '#ff0000', corPreenchimento: '#00ff00', espessuraTraco: 3 })]);
    const o = (camada() as L.CircleMarker).options;
    expect(o.color).toBe('#ff0000');
    expect(o.fillColor).toBe('#00ff00');
    expect(o.weight).toBe(3);
  });

  it('corContorno e espessuraContorno valem só para o contorno', () => {
    const { g, camada } = novo();
    g.definirFeicoes('c', [ponto({ corTraco: '#ff0000', corPreenchimento: '#00ff00', espessuraTraco: 3, corContorno: '#ffffff', espessuraContorno: 2 })]);
    const o = (camada() as L.CircleMarker).options;
    expect(o.color).toBe('#ffffff');
    expect(o.weight).toBe(2);
    expect(o.fillColor).toBe('#00ff00');
  });

  it('sem corPreenchimento, o preenchimento segue a cor de traço e o contorno fica separado', () => {
    const { g, camada } = novo();
    g.definirFeicoes('c', [ponto({ corTraco: '#123456', corContorno: 'white', espessuraContorno: 1.5 })]);
    const o = (camada() as L.CircleMarker).options;
    expect(o.color).toBe('white');
    expect(o.fillColor).toBe('#123456');
    expect(o.stroke).toBe(true);
  });

  it('espessura 0 tira o contorno; valores inválidos são ignorados; cor inválida não injeta', () => {
    const { g, camada } = novo();
    g.definirFeicoes('c', [ponto({ corTraco: '#111111', espessuraTraco: 4, espessuraContorno: 0 })]);
    expect((camada() as L.CircleMarker).options.stroke).toBe(false);
    g.atualizarFeicao('c', 'p', { estilo: { espessuraContorno: Number.NaN, corContorno: 'red;x:y' } });
    const o = (camada() as L.CircleMarker).options;
    expect(o.weight).toBe(4);
    expect(o.color).toBe('#111111');
    expect(o.stroke).toBe(true);
    g.atualizarFeicao('c', 'p', { estilo: { espessuraContorno: -1 } });
    expect((camada() as L.CircleMarker).options.weight).toBe(4);
  });

  it('selecionado, o contorno ganha a cor de seleção e engrossa', () => {
    const { g, camada } = novo();
    g.definirFeicoes('c', [ponto({ corContorno: 'white', espessuraContorno: 2 })]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'p' }]);
    const o = (camada() as L.CircleMarker).options;
    expect(o.color).toBe('#38bdf8');
    expect(o.weight).toBe(4);
  });

  it('não afeta linhas, polígonos nem ponto com ícone', () => {
    const { g, camada } = novo();
    g.definirFeicoes('c', [{ id: 'l', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.51, -46.6]] }, estilo: { corTraco: '#abcdef', corContorno: '#000', espessuraContorno: 9 } }]);
    const o = (camada() as L.Polyline).options;
    expect(o.color).toBe('#abcdef');
    expect(o.weight).toBe(2);
  });
});
