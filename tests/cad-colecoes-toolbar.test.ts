/**
 * Testes de caracterização de cad-colecoes-dados.ts, cad-toolbar-painel.ts e cad-template.ts
 * (lacunas restantes da Fase 0 do plano de lapidação).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GerenciadorColecoesDados } from '../src/components/ui-canvas-cad/cad-colecoes-dados';
import { GerenciadorToolbarPainel } from '../src/components/ui-canvas-cad/cad-toolbar-painel';
import { obterTemplateCanvasCAD } from '../src/components/ui-canvas-cad/cad-template';

afterEach(() => { document.body.innerHTML = ''; });

function criarColecoes() {
  const ctrl: any = {
    setPontos: vi.fn(), setSegmentos: vi.fn(), setBancoPontos: vi.fn(), setConfrontantes: vi.fn(),
    plotarPontos: vi.fn(), plotarConexoes: vi.fn(), plotarPolilinhaSequencial: vi.fn(), plotarPoligonos: vi.fn(),
    limparCamadas: vi.fn(), obterMarcadores: vi.fn(() => ['m']), plotPontos: vi.fn(), plotSegmentos: vi.fn(),
    plotPolilinhaTemporaria: vi.fn(), plotPoligonalHomologada: vi.fn(), plotPontosVizinhos: vi.fn(),
    plotPoligonosVizinhos: vi.fn(), clearOverlays: vi.fn(), getMarkers: vi.fn(() => ['a']), getVizinhosMarkers: vi.fn(() => ['v']),
    context: { confrontantes: [{ id: 'c1' }] }
  };
  const setLayerVisibility = vi.fn();
  const g = new GerenciadorColecoesDados({
    obterController: () => ctrl,
    obterChaveGrupo: () => 'grupo-padrao',
    setLayerVisibility
  });
  return { g, ctrl, setLayerVisibility };
}

describe('GerenciadorColecoesDados', () => {
  it('os setters guardam a coleção (null vira []) e repassam ao controller', () => {
    const { g, ctrl } = criarColecoes();
    g.pontos = [{ id: 1 } as any];
    g.segmentos = null as any;
    g.bancoPontos = undefined as any;
    g.confrontantes = [{ id: 'c' } as any];
    expect(g.pontos).toHaveLength(1);
    expect(g.segmentos).toEqual([]);
    expect(g.bancoPontos).toEqual([]);
    expect(ctrl.setPontos).toHaveBeenCalledWith([{ id: 1 }]);
    expect(ctrl.setSegmentos).toHaveBeenCalledWith([]);
    expect(ctrl.setConfrontantes).toHaveBeenCalledTimes(1);
  });

  it('sincronizarInicial só envia as coleções que têm itens', () => {
    const { g, ctrl } = criarColecoes();
    (g as any)._pontos = [{ id: 1 }];
    g.sincronizarInicial();
    expect(ctrl.setPontos).toHaveBeenCalledTimes(1);
    expect(ctrl.setSegmentos).not.toHaveBeenCalled();
    expect(ctrl.setBancoPontos).not.toHaveBeenCalled();
    expect(ctrl.setConfrontantes).not.toHaveBeenCalled();
  });

  it('obterElementoPorId procura em pontos, banco e confrontantes comparando como texto', () => {
    const { g } = criarColecoes();
    (g as any)._pontos = [{ id: 1, n: 'p' }];
    (g as any)._bancoPontos = [{ id: 'b2', n: 'b' }];
    (g as any)._confrontantes = [{ id: 3, n: 'c' }];
    expect(g.obterElementoPorId('1')).toMatchObject({ n: 'p' });
    expect(g.obterElementoPorId('b2')).toMatchObject({ n: 'b' });
    expect(g.obterElementoPorId(3)).toMatchObject({ n: 'c' });
    expect(g.obterElementoPorId('nada')).toBeUndefined();
  });

  it('plotarPontos: só a camada "vertices" atualiza a coleção interna; lista nula vira []', () => {
    const { g, ctrl } = criarColecoes();
    g.plotarPontos([{ id: 1 } as any]);
    expect(g.pontos).toHaveLength(1);
    g.plotarPontos([{ id: 2 } as any, { id: 3 } as any], 'outra');
    expect(g.pontos).toHaveLength(1);
    g.plotarPontos(null, 'outra');
    expect(ctrl.plotarPontos).toHaveBeenLastCalledWith([], 'outra', undefined);
  });

  it('plotarPolilinhaSequencial usa a chave de grupo do componente quando não informada', () => {
    const { g, ctrl } = criarColecoes();
    g.plotarPolilinhaSequencial([{ id: 1 } as any]);
    expect(ctrl.plotarPolilinhaSequencial).toHaveBeenLastCalledWith([{ id: 1 }], true, 'polilinha', 'grupo-padrao');
    g.plotarPolilinhaSequencial([], false, 'perimetro', 'minha');
    expect(ctrl.plotarPolilinhaSequencial).toHaveBeenLastCalledWith([], false, 'perimetro', 'minha');
    expect(g.segmentos).toEqual([]);
  });

  it('plotPontos guarda o callback de clique para reaproveitar depois', () => {
    const { g } = criarColecoes();
    const cb = vi.fn();
    g.plotPontos([{ id: 1 } as any], cb);
    expect(g.customMarkerClickHandler).toBe(cb);
  });

  it('plotSegmentos só troca os pontos quando informados', () => {
    const { g } = criarColecoes();
    (g as any)._pontos = [{ id: 'antigo' }];
    g.plotSegmentos([{ id: 's' } as any]);
    expect(g.pontos).toEqual([{ id: 'antigo' }]);
    g.plotSegmentos([{ id: 's' } as any], [{ id: 'novo' } as any]);
    expect(g.pontos).toEqual([{ id: 'novo' }]);
  });

  it('plotPoligonalHomologada liga as duas camadas de homologados', () => {
    const { g, setLayerVisibility } = criarColecoes();
    g.plotPoligonalHomologada([{ id: 'h' } as any]);
    expect(setLayerVisibility).toHaveBeenCalledWith('homologados', true);
    expect(setLayerVisibility).toHaveBeenCalledWith('homologados-pontos', true);
  });

  it('plotPontosVizinhos / plotPoligonosVizinhos adotam os confrontantes resolvidos pelo controller', () => {
    const { g, ctrl } = criarColecoes();
    g.plotPontosVizinhos(null);
    expect(ctrl.plotPontosVizinhos).toHaveBeenCalledWith([]);
    expect(g.confrontantes).toEqual([{ id: 'c1' }]);
    ctrl.context.confrontantes = undefined;
    g.plotPoligonosVizinhos([]);
    expect(g.confrontantes).toEqual([]);
  });

  it('limparCamadas sem lista limpa tudo, menos o banco; com lista, só o que foi pedido', () => {
    const { g, ctrl } = criarColecoes();
    (g as any)._pontos = [1];
    (g as any)._segmentos = [1];
    (g as any)._confrontantes = [1];
    (g as any)._bancoPontos = [1];
    g.limparCamadas(['vertices']);
    expect(g.pontos).toEqual([]);
    expect(g.segmentos).toHaveLength(1);
    g.limparCamadas(['perimetro']);
    expect(g.segmentos).toEqual([]);
    expect(g.confrontantes).toHaveLength(1);
    g.limparCamadas(['vizinhos']);
    expect(g.confrontantes).toEqual([]);
    g.limparCamadas();
    expect(g.bancoPontos).toHaveLength(1);
    expect(ctrl.limparCamadas).toHaveBeenCalledTimes(4);
  });

  it('clearOverlays preserva o banco só com manterBanco', () => {
    const { g, ctrl } = criarColecoes();
    (g as any)._bancoPontos = [1];
    g.clearOverlays(true);
    expect(g.bancoPontos).toHaveLength(1);
    g.clearOverlays();
    expect(g.bancoPontos).toEqual([]);
    expect(ctrl.clearOverlays).toHaveBeenLastCalledWith(false);
  });

  it('delegações simples devolvem o que o controller devolve', () => {
    const { g } = criarColecoes();
    expect(g.obterMarcadores('x')).toEqual(['m']);
    expect(g.getMarkers()).toEqual(['a']);
    expect(g.getVizinhosMarkers()).toEqual(['v']);
  });
});

describe('cad-template', () => {
  it('contém o contêiner do mapa, o painel de camadas, a região viva e os cinco botões da barra rápida', () => {
    const host = document.createElement('div');
    host.attachShadow({ mode: 'open' }).innerHTML = obterTemplateCanvasCAD();
    const sr = host.shadowRoot!;
    for (const id of ['cad-root', 'cad-map-container', 'qgis-layer-panel', 'layers-list-container', 'cad-status',
      'btn-toggle-layers', 'btn-close-layers', 'btn-zoom-extents', 'btn-toggle-snap', 'btn-clear-selection']) {
      expect(sr.getElementById(id), id).not.toBeNull();
    }
    expect(sr.querySelector('style')).not.toBeNull();
  });
});

describe('GerenciadorToolbarPainel', () => {
  function montar(extra: Record<string, unknown> = {}) {
    const host = document.createElement('div');
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = obterTemplateCanvasCAD();
    document.body.appendChild(host);
    const mapContainer = sr.getElementById('cad-map-container') as HTMLDivElement;
    const layersPanel = sr.getElementById('qgis-layer-panel') as HTMLDivElement;
    const ganchos = {
      onZoomExtents: vi.fn(), onLimparSelecao: vi.fn(), onToggleSnap: vi.fn(),
      onTratarCliqueCanvas: vi.fn(), onDispararAcaoPopup: vi.fn()
    };
    const t = new GerenciadorToolbarPainel({ shadow: sr, mapContainer, layersPanel, ...ganchos, ...extra });
    t.vincularEventos();
    return { t, sr, mapContainer, layersPanel, ...ganchos };
  }
  const clique = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, button: 0 }));

  it('alterna o painel de camadas e reflete o estado no botão; fechar força o recolhimento', () => {
    const { t, sr, layersPanel } = montar();
    expect(layersPanel.classList.contains('collapsed')).toBe(true);
    clique(sr.getElementById('btn-toggle-layers')!);
    expect(t.estaPainelAberto).toBe(true);
    expect(layersPanel.classList.contains('collapsed')).toBe(false);
    expect(sr.getElementById('btn-toggle-layers')!.classList.contains('active')).toBe(true);
    clique(sr.getElementById('btn-close-layers')!);
    expect(t.estaPainelAberto).toBe(false);
    expect(layersPanel.classList.contains('collapsed')).toBe(true);
  });

  it('usa os ganchos do componente quando fornecidos (toggle/close)', () => {
    const onToggleCamadas = vi.fn();
    const onCloseCamadas = vi.fn();
    const { t, sr } = montar({ onToggleCamadas, onCloseCamadas });
    clique(sr.getElementById('btn-toggle-layers')!);
    clique(sr.getElementById('btn-close-layers')!);
    expect(onToggleCamadas).toHaveBeenCalledTimes(1);
    expect(onCloseCamadas).toHaveBeenCalledTimes(1);
    expect(t.estaPainelAberto).toBe(false);
  });

  it('os botões de zoom, limpar seleção e snap chamam os ganchos', () => {
    const { sr, onZoomExtents, onLimparSelecao, onToggleSnap } = montar();
    clique(sr.getElementById('btn-zoom-extents')!);
    clique(sr.getElementById('btn-clear-selection')!);
    clique(sr.getElementById('btn-toggle-snap')!);
    expect(onZoomExtents).toHaveBeenCalledTimes(1);
    expect(onLimparSelecao).toHaveBeenCalledTimes(1);
    expect(onToggleSnap).toHaveBeenCalledTimes(1);
  });

  it('distingue clique de arraste (pan): movimento >= 4 px desde o mousedown suprime o clique no mapa', () => {
    const { t, mapContainer, onTratarCliqueCanvas } = montar();
    mapContainer.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
    mapContainer.dispatchEvent(new MouseEvent('mousemove', { clientX: 12, clientY: 11, bubbles: true }));
    expect(t.houveMovimentoMouse).toBe(false);
    clique(mapContainer);
    expect(onTratarCliqueCanvas).toHaveBeenCalledTimes(1);

    mapContainer.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }));
    mapContainer.dispatchEvent(new MouseEvent('mousemove', { clientX: 40, clientY: 10, bubbles: true }));
    expect(t.houveMovimentoMouse).toBe(true);
    clique(mapContainer);
    expect(onTratarCliqueCanvas).toHaveBeenCalledTimes(1);
  });

  it('botões do mouse diferentes do principal não disparam o clique no mapa', () => {
    const { mapContainer, onTratarCliqueCanvas } = montar();
    mapContainer.dispatchEvent(new MouseEvent('click', { button: 2, bubbles: true }));
    expect(onTratarCliqueCanvas).not.toHaveBeenCalled();
  });

  it('clique em botão de ação do popup dispara a ação com ids e para a propagação; sem ids, ignora', () => {
    const { sr, onDispararAcaoPopup } = montar();
    const btn = document.createElement('button');
    btn.className = 'ui-popup-btn';
    btn.setAttribute('data-acao-id', 'editar');
    btn.setAttribute('data-elemento-id', '42');
    sr.appendChild(btn);
    const semId = document.createElement('button');
    semId.className = 'ui-popup-btn';
    sr.appendChild(semId);
    clique(btn);
    clique(semId);
    expect(onDispararAcaoPopup).toHaveBeenCalledTimes(1);
    expect(onDispararAcaoPopup).toHaveBeenCalledWith('editar', '42');
  });

  it('vincular de novo não duplica ouvintes e limpar() remove todos', () => {
    const { t, sr, onZoomExtents } = montar();
    t.vincularEventos();
    clique(sr.getElementById('btn-zoom-extents')!);
    expect(onZoomExtents).toHaveBeenCalledTimes(1);
    t.limpar();
    clique(sr.getElementById('btn-zoom-extents')!);
    expect(onZoomExtents).toHaveBeenCalledTimes(1);
  });

  it('funciona sem mapContainer e sem painel (degradação graciosa)', () => {
    const host = document.createElement('div');
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = obterTemplateCanvasCAD();
    const t = new GerenciadorToolbarPainel({ shadow: sr, mapContainer: null, layersPanel: null });
    expect(() => { t.vincularEventos(); t.toggleLayersPanel(); t.closeLayersPanel(); t.limpar(); }).not.toThrow();
  });
});
