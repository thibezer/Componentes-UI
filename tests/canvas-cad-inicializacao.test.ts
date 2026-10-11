import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../src/index';
import '../src/components/ui-canvas-cad';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';

afterEach(() => { document.body.innerHTML = ''; });

function montar(atributos: Record<string, string> = {}): UICanvasCAD {
  const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

const IDS_PADRAO = ['satelite', 'sigef', 'homologados', 'homologados-pontos', 'perimetro', 'vizinhos', 'vertices', 'grade'];

describe('inicializarAgora', () => {
  it('cria o mapa de forma síncrona, é idempotente e cancela o agendamento do connectedCallback', async () => {
    const el = montar();
    expect(el.getMap()).toBeNull();
    const mapa = el.inicializarAgora();
    expect(mapa).not.toBeNull();
    expect(el.getMap()).toBe(mapa);
    expect(el.inicializarAgora()).toBe(mapa);
    await new Promise((r) => setTimeout(r, 30));
    expect(el.getMap()).toBe(mapa); // o timer do connectedCallback não criou um 2º mapa
  });

  it('sem chamar, o mapa nasce no agendamento normal', async () => {
    const el = montar();
    await new Promise((r) => setTimeout(r, 30));
    expect(el.getMap()).not.toBeNull();
  });

  it('depois de destroy/reconexão cria um mapa novo', async () => {
    const el = montar();
    const a = el.inicializarAgora();
    document.body.removeChild(el);
    expect(el.getMap()).toBeNull();
    document.body.appendChild(el);
    const b = el.inicializarAgora();
    expect(b).not.toBeNull();
    expect(b).not.toBe(a);
  });

  it('destacarElemento não precisa de membros privados para iniciar o mapa', () => {
    const el = montar();
    el.destacarElemento('x');
    expect(el.getMap()).not.toBeNull();
  });
});

describe('sem-camadas-padrao', () => {
  it('não cria nenhuma das camadas de fábrica, mas mantém as do consumidor', () => {
    const el = montar({ 'sem-camadas-padrao': '' });
    el.definirFeicoes('minhas', [{ id: 'p', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] } }]);
    el.inicializarAgora();
    const ids = el.getLayerManager().getLayers().map((l) => l.id);
    expect(ids).toEqual(['minhas']);
  });

  it('sem o atributo, as camadas de fábrica continuam existindo', () => {
    const el = montar();
    el.inicializarAgora();
    const ids = el.getLayerManager().getLayers().map((l) => l.id);
    for (const id of IDS_PADRAO) expect(ids).toContain(id);
  });

  it('nenhum tile/WMS é adicionado ao mapa e o clique nunca consulta o INCRA', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(new Response('{}')));
    vi.stubGlobal('fetch', fetchSpy);
    try {
      const el = montar({ 'sem-camadas-padrao': '' });
      const mapa = el.inicializarAgora()!;
      let tiles = 0;
      mapa.eachLayer((l) => { if ((l as { getTileUrl?: unknown }).getTileUrl) tiles++; });
      expect(tiles).toBe(0);
      mapa.fire('click', { latlng: mapa.getCenter(), containerPoint: mapa.latLngToContainerPoint(mapa.getCenter()) });
      await new Promise((r) => setTimeout(r, 20));
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('sem-painel-camadas e sem-barra-rapida', () => {
  it('toggleLayersPanel não abre o painel escondido', () => {
    const el = montar({ 'sem-painel-camadas': '' });
    el.toggleLayersPanel();
    const painel = el.shadowRoot!.getElementById('qgis-layer-panel')!;
    expect(painel.classList.contains('collapsed')).toBe(true);
  });

  it('ligar o atributo com o painel aberto fecha o painel; os atributos entram na lista observada', () => {
    const el = montar();
    el.toggleLayersPanel();
    const painel = el.shadowRoot!.getElementById('qgis-layer-panel')!;
    expect(painel.classList.contains('collapsed')).toBe(false);
    el.setAttribute('sem-painel-camadas', '');
    expect(painel.classList.contains('collapsed')).toBe(true);
    const observados = (customElements.get('ui-canvas-cad') as unknown as { observedAttributes: string[] }).observedAttributes;
    for (const a of ['sem-camadas-padrao', 'sem-painel-camadas', 'sem-barra-rapida', 'sem-atalho-snap', 'aceitar-origem']) expect(observados).toContain(a);
  });

  it('a folha do componente traz as regras que escondem painel, botão de camadas e barra', () => {
    // o vitest não processa `?inline`; lê a folha-fonte
    const css = readFileSync(resolve(__dirname, '../src/components/ui-canvas-cad/ui-canvas-cad.css'), 'utf8');
    expect(css).toContain(':host([sem-painel-camadas]) .qgis-layer-panel');
    expect(css).toContain(':host([sem-painel-camadas]) #btn-toggle-layers');
    expect(css).toContain(':host([sem-barra-rapida]) .cad-quick-toolbar');
  });
});

describe('sem-atalho-snap', () => {
  const tecla = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

  it('a tecla S não alterna o snap desde o primeiro instante', () => {
    const el = montar({ 'sem-atalho-snap': '' });
    expect(el.snapLigado).toBe(true);
    tecla('s');
    expect(el.snapLigado).toBe(true);
  });

  it('sem o atributo a tecla S alterna; remover o atributo religa o atalho', () => {
    const el = montar();
    tecla('s');
    expect(el.snapLigado).toBe(false);
    tecla('s');
    expect(el.snapLigado).toBe(true);
    el.setAttribute('sem-atalho-snap', '');
    tecla('s');
    expect(el.snapLigado).toBe(true);
    el.removeAttribute('sem-atalho-snap');
    tecla('s');
    expect(el.snapLigado).toBe(false);
  });

  it('o botão e definirSnap continuam funcionando', () => {
    const el = montar({ 'sem-atalho-snap': '' });
    el.definirSnap(false);
    expect(el.snapLigado).toBe(false);
  });
});

describe('definirEstilosExternos', () => {
  const textoAdotado = (el: UICanvasCAD) =>
    ((el.shadowRoot as unknown as { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets ?? [])
      .map((f) => Array.from(f.cssRules, (r) => r.cssText).join('')).join('');
  const total = (el: UICanvasCAD) => ((el.shadowRoot as unknown as { adoptedStyleSheets?: unknown[] }).adoptedStyleSheets ?? []).length;
  const fallback = (el: UICanvasCAD) => el.shadowRoot!.querySelector('style[data-cad-estilos-externos]');

  it('aplica texto, substitui na chamada seguinte e remove com null', () => {
    const el = montar();
    el.definirEstilosExternos('.a { color: red; }');
    expect(textoAdotado(el) + (fallback(el)?.textContent ?? '')).toContain('.a');
    el.definirEstilosExternos('.b { color: blue; }');
    const t = textoAdotado(el) + (fallback(el)?.textContent ?? '');
    expect(t).toContain('.b');
    expect(t).not.toContain('.a');
    el.definirEstilosExternos(null);
    expect(total(el)).toBe(0);
    expect(fallback(el)).toBeNull();
  });

  it('usa adoptedStyleSheets quando o ambiente suporta, sem tocar nas folhas de outros', () => {
    const el = montar();
    const raiz = el.shadowRoot as unknown as { adoptedStyleSheets?: CSSStyleSheet[] };
    if (!Array.isArray(raiz.adoptedStyleSheets)) return; // ambiente sem suporte: coberto pelo fallback
    const alheia = new CSSStyleSheet();
    alheia.replaceSync('.x { top: 0; }');
    raiz.adoptedStyleSheets = [alheia];
    el.definirEstilosExternos('.a { color: red; }');
    expect(raiz.adoptedStyleSheets).toContain(alheia);
    expect(raiz.adoptedStyleSheets.length).toBe(2);
    el.definirEstilosExternos([]);
    expect(raiz.adoptedStyleSheets).toEqual([alheia]);
  });

  it('copia folhas de document.styleSheets (CSSStyleSheet[])', () => {
    const el = montar();
    const style = document.createElement('style');
    style.textContent = '.do-doc { margin: 1px; }';
    document.head.appendChild(style);
    try {
      el.definirEstilosExternos(Array.from(document.styleSheets));
      const t = textoAdotado(el) + (fallback(el)?.textContent ?? '');
      expect(t).toContain('.do-doc');
    } finally {
      style.remove();
    }
  });

  it('destroy() limpa o shadow root e a reconexão recoloca o pedido', () => {
    const el = montar();
    el.definirEstilosExternos('.a { color: red; }');
    el.destroy();
    expect(total(el)).toBe(0);
    expect(fallback(el)).toBeNull();
    document.body.removeChild(el);
    document.body.appendChild(el);
    expect(textoAdotado(el) + (fallback(el)?.textContent ?? '')).toContain('.a');
  });
});
