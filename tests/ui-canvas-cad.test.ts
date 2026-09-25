import { describe, it, expect, vi } from 'vitest';
import L from 'leaflet';
import '../src/index';
import { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { CanvasLayerManager, DEFAULT_LAYERS } from '../src/gerencigeo-canvas/layer_manager';
import { LayerRendererFactory } from '../src/gerencigeo-canvas/layer_renderer_factory';
import { parseCoordenada } from '../src/gerencigeo-canvas/utils';

describe('Canvas CAD Engine & <ui-canvas-cad>', () => {
  it('deve ter todos os renderizadores padrão registrados na Factory', () => {
    const types = LayerRendererFactory.getRegisteredTypes();
    expect(types).toContain('tile');
    expect(types).toContain('wms');
    expect(types).toContain('vetorial-linhas');
    expect(types).toContain('vetorial-pontos');
    expect(types).toContain('vetorial-poligonos');
    expect(types).toContain('grid');
  });

  it('deve instanciar o CanvasLayerManager com camadas padrão', () => {
    const manager = new CanvasLayerManager();
    const layers = manager.getLayers();
    expect(layers.length).toBe(DEFAULT_LAYERS.length);
    expect(layers.some(l => l.id === 'satelite')).toBe(true);
    expect(layers.some(l => l.id === 'perimetro')).toBe(true);
    expect(layers.some(l => l.id === 'vertices')).toBe(true);
    expect(layers.some(l => l.id === 'sigef')).toBe(true);
  });

  it('deve alterar visibilidade e opacidade de camadas corretamente', () => {
    const manager = new CanvasLayerManager();
    manager.setLayerVisibility('satelite', false);
    let satLayer = manager.getLayers().find(l => l.id === 'satelite');
    expect(satLayer?.visivel).toBe(false);

    manager.setLayerOpacity('perimetro', 0.5);
    let perimLayer = manager.getLayers().find(l => l.id === 'perimetro');
    expect(perimLayer?.opacidade).toBe(0.5);
  });

  it('deve suportar bloqueio de camadas para seleção CAD filtrada', () => {
    const manager = new CanvasLayerManager();
    expect(manager.isLayerActiveAndSelectable('vertices')).toBe(true);

    manager.setLayerBlocked('vertices', true);
    expect(manager.isLayerActiveAndSelectable('vertices')).toBe(false);

    manager.setLayerBlocked('vertices', false);
    expect(manager.isLayerActiveAndSelectable('vertices')).toBe(true);

    manager.setLayerVisibility('vertices', false);
    expect(manager.isLayerActiveAndSelectable('vertices')).toBe(false);
  });

  it('deve exportar e importar estado JSON de camadas perfeitamente', () => {
    const manager = new CanvasLayerManager();
    manager.setLayerVisibility('sigef', false);
    manager.setLayerOpacity('satelite', 0.4);
    manager.setLayerBlocked('homologados', true);

    const exported = manager.exportState();
    expect(Array.isArray(exported)).toBe(true);
    expect(exported.find(s => s.id === 'sigef')?.visivel).toBe(false);
    expect(exported.find(s => s.id === 'satelite')?.opacidade).toBe(0.4);
    expect(exported.find(s => s.id === 'homologados')?.bloqueada).toBe(true);

    const newManager = new CanvasLayerManager();
    newManager.importState(exported);

    const newSigef = newManager.getLayers().find(l => l.id === 'sigef');
    const newSat = newManager.getLayers().find(l => l.id === 'satelite');
    const newHom = newManager.getLayers().find(l => l.id === 'homologados');

    expect(newSigef?.visivel).toBe(false);
    expect(newSat?.opacidade).toBe(0.4);
    expect(newHom?.bloqueada).toBe(true);
  });

  it('deve registrar e instanciar o Custom Element <ui-canvas-cad>', () => {
    expect(customElements.get('ui-canvas-cad')).toBeDefined();
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    expect(el).toBeInstanceOf(UICanvasCAD);
    expect(el.shadowRoot).toBeDefined();
  });

  it('deve aceitar pontos, segmentos e confrontantes via propriedades reativas', () => {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(el);

    const mockPontos = [
      { id: 1, nome_vertice: 'M-01', lat: -23.765, lon: -53.320, tipo_ponto: 'M' },
      { id: 2, nome_vertice: 'P-01', lat: -23.766, lon: -53.321, tipo_ponto: 'P' },
      { id: 3, nome_vertice: 'P-02', lat: -23.767, lon: -53.319, tipo_ponto: 'P' }
    ];

    const mockSegmentos = [
      { ponto_inicio_id: 1, ponto_fim_id: 2, tipo_limite_sigef: 'LA1' },
      { ponto_inicio_id: 2, ponto_fim_id: 3, tipo_limite_sigef: 'LN1' }
    ];

    el.pontos = mockPontos;
    el.segmentos = mockSegmentos;

    expect(el.pontos.length).toBe(3);
    expect(el.segmentos.length).toBe(2);

    document.body.removeChild(el);
  });

  it('deve limpar listeners anteriores com AbortController ao desconectar e reconectar', async () => {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 20));

    const spyToggle = vi.spyOn(el, 'toggleLayersPanel');
    const btnToggle = el.shadowRoot!.getElementById('btn-toggle-layers');

    // Desconecta e reconecta o elemento simulando troca de aba/re-render do pai
    document.body.removeChild(el);
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 20));

    // Clica no botão de toggle
    btnToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Deve ter sido chamado exatamente 1 vez, sem duplicação de handlers
    expect(spyToggle).toHaveBeenCalledTimes(1);

    document.body.removeChild(el);
  });

  it('deve validar coordenadas e tratar formato brasileiro e projeção UTM via parseCoordenada', () => {
    // 1. Vírgula decimal brasileira
    const coordBr = parseCoordenada('-23,766100', '-53,320400');
    expect(coordBr).not.toBeNull();
    expect(coordBr?.lat).toBeCloseTo(-23.7661);
    expect(coordBr?.lon).toBeCloseTo(-53.3204);

    // 2. Coordenadas planas UTM (acima de 90° de latitude) devem ser rejeitadas
    const coordUtm = parseCoordenada(7350000, 320000);
    expect(coordUtm).toBeNull();

    // 3. Null island (0, 0) deve ser rejeitado
    const coordZero = parseCoordenada(0, 0);
    expect(coordZero).toBeNull();

    // 4. Valores nulos ou inválidos
    expect(parseCoordenada(null, -53.3)).toBeNull();
    expect(parseCoordenada('invalido', -53.3)).toBeNull();
  });

  it('deve incluir a camada homologados-pontos em DEFAULT_LAYERS', () => {
    const manager = new CanvasLayerManager();
    const layers = manager.getLayers();
    expect(layers.some(l => l.id === 'homologados-pontos')).toBe(true);
    expect(layers.find(l => l.id === 'homologados-pontos')?.tipo).toBe('vetorial-pontos');
  });

  it('deve suportar touch events no Canvas CAD sem disparar erros', async () => {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 20));

    const mapContainer = el.shadowRoot!.getElementById('cad-map-container');
    expect(mapContainer).toBeDefined();

    // Simula touchstart e touchmove
    const touchStart = new Event('touchstart');
    (touchStart as any).touches = [{ clientX: 100, clientY: 100 }];
    mapContainer?.dispatchEvent(touchStart);

    const touchMove = new Event('touchmove');
    (touchMove as any).touches = [{ clientX: 110, clientY: 110 }];
    mapContainer?.dispatchEvent(touchMove);

    const touchEnd = new Event('touchend');
    mapContainer?.dispatchEvent(touchEnd);

    // Deve concluir o ciclo sem exceções
    expect(true).toBe(true);

    document.body.removeChild(el);
  });

  it('deve restaurar pointer-events em panes legados e modernos após drag de seleção ou Escape', async () => {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 20));

    const mapContainer = el.shadowRoot!.getElementById('cad-map-container');
    const controller = el.getController();
    const map = controller.getMap();
    expect(map).not.toBeNull();

    // Panes legados criados
    const verticesPane = map!.getPane('verticesPane');
    const perimetroPane = map!.getPane('perimetroPane');
    expect(verticesPane).toBeDefined();
    expect(perimetroPane).toBeDefined();

    // 1. Simula mousedown (início de seleção CAD botão esquerdo)
    const mouseDown = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100, bubbles: true });
    mapContainer?.dispatchEvent(mouseDown);

    expect(verticesPane!.style.pointerEvents).toBe('none');
    expect(perimetroPane!.style.pointerEvents).toBe('none');

    // 2. Simula mouseup (finalização de seleção)
    const mouseUp = new MouseEvent('mouseup', { button: 0, clientX: 200, clientY: 200, bubbles: true });
    window.dispatchEvent(mouseUp);

    // Aguarda o timeout de 80ms
    await new Promise(r => setTimeout(r, 120));

    expect(verticesPane!.style.pointerEvents).toBe('auto');
    expect(perimetroPane!.style.pointerEvents).toBe('auto');

    // 3. Simula mousedown e cancelamento via Escape
    mapContainer?.dispatchEvent(mouseDown);
    expect(verticesPane!.style.pointerEvents).toBe('none');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(verticesPane!.style.pointerEvents).toBe('auto');
    expect(perimetroPane!.style.pointerEvents).toBe('auto');

    document.body.removeChild(el);
  });

  describe('Fachada de Compatibilidade e Métodos Imperativos (Bloco 1)', () => {
    it('deve executar plotPontos com callback de clique e tratar listas nulas/vazias', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const mockPontos = [
        { id: 10, nome_vertice: 'M-10', lat: -23.765, lon: -53.320, tipo_ponto: 'M' },
        { id: 11, nome_vertice: 'P-11', lat: -23.766, lon: -53.321, tipo_ponto: 'P' }
      ];

      const clickSpy = vi.fn();
      const eventSpy = vi.fn();
      el.addEventListener('ui-ponto-selecionado', eventSpy);

      // 1. Chamada normal
      el.plotPontos(mockPontos, clickSpy);
      expect(el.pontos.length).toBe(2);
      expect(el.getController().context.pontos?.length).toBe(2);

      // Simula clique de marcador
      el.getController().context.onMarkerClick?.(10, false);
      expect(clickSpy).toHaveBeenCalledWith(10, false);
      expect(eventSpy).toHaveBeenCalledTimes(1);

      // 2. Salvaguarda com null / undefined
      expect(() => el.plotPontos(null)).not.toThrow();
      expect(el.pontos).toEqual([]);
      expect(el.getController().context.pontos).toEqual([]);

      expect(() => el.plotPontos(undefined)).not.toThrow();
      expect(el.pontos).toEqual([]);

      document.body.removeChild(el);
    });

    it('deve executar plotSegmentos e plotPolilinhaTemporaria sincronizando context e layerManager', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const mockPontos = [
        { id: 1, lat: -23.765, lon: -53.320 },
        { id: 2, lat: -23.766, lon: -53.321 }
      ];
      const mockSegmentos = [
        { ponto_inicio_id: 1, ponto_fim_id: 2, tipo_limite_sigef: 'LA1' }
      ];

      // plotSegmentos
      el.plotSegmentos(mockSegmentos, mockPontos);
      expect(el.segmentos.length).toBe(1);
      expect(el.pontos.length).toBe(2);
      expect(el.getController().context.segmentos?.length).toBe(1);
      expect(el.getController().context.pontos?.length).toBe(2);

      // Salvaguarda null
      expect(() => el.plotSegmentos(null, null)).not.toThrow();
      expect(el.segmentos).toEqual([]);

      // plotPolilinhaTemporaria (deve setar pontos e esvaziar segmentos)
      el.plotPolilinhaTemporaria(mockPontos);
      expect(el.pontos.length).toBe(2);
      expect(el.segmentos.length).toBe(0);
      expect(el.getController().context.segmentos?.length).toBe(0);
      expect(el.getController().context.pontos?.length).toBe(2);

      // Salvaguarda null
      expect(() => el.plotPolilinhaTemporaria(null)).not.toThrow();
      expect(el.pontos).toEqual([]);
      expect(el.segmentos).toEqual([]);

      document.body.removeChild(el);
    });

    it('deve alimentar camada de homologados via plotPoligonalHomologada', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const mockBanco = [
        { id: 101, codigo_completo: 'BR-101', lat: -23.765, lon: -53.320, este: 320000, norte: 7350000 }
      ];

      el.plotPoligonalHomologada(mockBanco);
      expect(el.bancoPontos.length).toBe(1);
      expect(el.getController().context.bancoPontos?.length).toBe(1);

      // Salvaguarda null
      expect(() => el.plotPoligonalHomologada(null)).not.toThrow();
      expect(el.bancoPontos).toEqual([]);
      expect(el.getController().context.bancoPontos).toEqual([]);

      document.body.removeChild(el);
    });

    it('deve alimentar confrontantes via plotPontosVizinhos e plotPoligonosVizinhos', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const mockPontosVizinhos = [
        { id: 201, nome_vertice: 'V-01', lat: -23.768, lon: -53.322, confrontante_id: 5, nome_confrontante: 'João Silva' }
      ];

      el.plotPontosVizinhos(mockPontosVizinhos);
      expect(el.confrontantes.length).toBe(1);
      expect(el.confrontantes[0].pontos?.length).toBe(1);
      expect(el.getController().context.confrontantes?.length).toBe(1);

      const mockPoligonos = [
        { id: 5, nome: 'João Silva', poligono_wkt: 'POLYGON ((-53.322 -23.768, -53.323 -23.769, -53.321 -23.769, -53.322 -23.768))' }
      ];

      // Mescla polígono preservando os pontos já inseridos
      el.plotPoligonosVizinhos(mockPoligonos);
      expect(el.confrontantes.length).toBe(1);
      expect(el.confrontantes[0].poligono_wkt).toBeDefined();
      expect(el.confrontantes[0].pontos?.length).toBe(1);

      // Salvaguardas
      expect(() => el.plotPontosVizinhos(null)).not.toThrow();
      expect(() => el.plotPoligonosVizinhos(null)).not.toThrow();

      document.body.removeChild(el);
    });

    it('deve resetar camadas com clearOverlays e respeitar o flag manterBanco', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      // Popula dados de trabalho e banco
      el.plotPontos([{ id: 1, lat: -23.765, lon: -53.320 }]);
      el.plotSegmentos([{ ponto_inicio_id: 1, ponto_fim_id: 2 }]);
      el.plotPontosVizinhos([{ id: 3, lat: -23.767, lon: -53.322 }]);
      el.plotPoligonalHomologada([{ id: 99, lat: -23.768, lon: -53.323 }]);

      expect(el.pontos.length).toBe(1);
      expect(el.segmentos.length).toBe(1);
      expect(el.confrontantes.length).toBe(1);
      expect(el.bancoPontos.length).toBe(1);

      // 1. Limpa preservando o banco (manterBanco = true)
      el.clearOverlays(true);
      expect(el.pontos).toEqual([]);
      expect(el.segmentos).toEqual([]);
      expect(el.confrontantes).toEqual([]);
      expect(el.bancoPontos.length).toBe(1);
      expect(el.getController().context.bancoPontos?.length).toBe(1);

      // 2. Limpa tudo (manterBanco = false)
      el.clearOverlays(false);
      expect(el.bancoPontos).toEqual([]);
      expect(el.getController().context.bancoPontos).toEqual([]);

      document.body.removeChild(el);
    });

    it('deve devolver arrays de marcadores instanciados via getMarkers e getVizinhosMarkers', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      el.plotPontos([
        { id: 1, nome_vertice: 'M-01', lat: -23.765, lon: -53.320, tipo_ponto: 'M' },
        { id: 2, nome_vertice: 'P-01', lat: -23.766, lon: -53.321, tipo_ponto: 'P' }
      ]);

      el.plotPontosVizinhos([
        { id: 3, nome_vertice: 'V-01', lat: -23.768, lon: -53.322, confrontante_id: 1 }
      ]);

      const markers = el.getMarkers();
      const vizinhos = el.getVizinhosMarkers();

      expect(Array.isArray(markers)).toBe(true);
      expect(Array.isArray(vizinhos)).toBe(true);
      expect(markers.length).toBeGreaterThanOrEqual(3);
      expect(vizinhos.length).toBeGreaterThanOrEqual(1);
      expect(vizinhos.every(m => (m as any).isVizinho)).toBe(true);

      document.body.removeChild(el);
    });
  });

  describe('Fachada Agnóstica de Entidades Vetoriais e Camadas (Prompt 1)', () => {
    it('deve plotar nós pontuais agnósticos via plotarPontos e disparar onClique', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const cliqueSpy = vi.fn();
      const pontos = [
        { id: 'no-1', lat: -23.765, lon: -53.320, estilo: 'circle', metadados: { categoria: 'estação' } },
        { id: 'no-2', lat: -23.766, lon: -53.321, estilo: 'square', metadados: { categoria: 'antena' } }
      ];

      // 1. Plotagem na camada padrão 'vertices'
      el.plotarPontos(pontos, 'vertices', cliqueSpy);
      const markers = el.obterMarcadores('vertices');
      expect(markers.length).toBe(2);

      // Simula clique no primeiro nó
      const m1 = markers.find(m => String((m as any).pontoId) === 'no-1');
      expect(m1).toBeDefined();
      m1?.fire('click');
      expect(cliqueSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'no-1' }));

      // 2. Plotagem em camada personalizada criada dinamicamente
      el.plotarPontos([{ id: 'custom-1', lat: -23.770, lon: -53.325 }], 'sensores');
      const sensorMarkers = el.obterMarcadores('sensores');
      expect(sensorMarkers.length).toBe(1);

      document.body.removeChild(el);
    });

    it('deve plotar conexões e polilinha sequencial sem acoplamento a domínio', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const pontos = [
        { id: 'p1', lat: -23.765, lon: -53.320 },
        { id: 'p2', lat: -23.766, lon: -53.321 },
        { id: 'p3', lat: -23.767, lon: -53.320 }
      ];

      el.plotarPontos(pontos, 'vertices');

      // 1. plotarConexoes
      const conexoes = [
        { origemId: 'p1', destinoId: 'p2', tipoLinha: 'continua' as const },
        { origemId: 'p2', destinoId: 'p3', tipoLinha: 'tracejada' as const, estilo: { cor: '#3b82f6' } }
      ];
      expect(() => el.plotarConexoes(conexoes, 'linhas')).not.toThrow();

      // 2. plotarPolilinhaSequencial
      expect(() => el.plotarPolilinhaSequencial(pontos, true, 'polilinha')).not.toThrow();

      // Salvaguarda contra listas nulas
      expect(() => el.plotarConexoes(null)).not.toThrow();
      expect(() => el.plotarPolilinhaSequencial(null)).not.toThrow();

      document.body.removeChild(el);
    });

    it('deve plotar polígonos por coordenadas ou WKT via plotarPoligonos', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const poligonos = [
        {
          id: 'poly-1',
          coordenadas: [
            [-23.765, -53.320],
            [-23.766, -53.321],
            [-23.767, -53.320],
            [-23.765, -53.320]
          ],
          estilo: { cor: '#ec4899', fillOpacity: 0.3 }
        },
        {
          id: 'poly-2',
          wkt: 'POLYGON ((-53.322 -23.768, -53.323 -23.769, -53.321 -23.769, -53.322 -23.768))'
        }
      ];

      expect(() => el.plotarPoligonos(poligonos, 'poligonos')).not.toThrow();

      // Salvaguarda
      expect(() => el.plotarPoligonos(null)).not.toThrow();

      document.body.removeChild(el);
    });

    it('deve limpar camadas seletivamente ou todas via limparCamadas', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      el.plotarPontos([{ id: 'a', lat: -23.765, lon: -53.320 }], 'vertices');
      el.plotarPontos([{ id: 'b', lat: -23.766, lon: -53.321 }], 'sensores');

      expect(el.obterMarcadores('vertices').length).toBe(1);
      expect(el.obterMarcadores('sensores').length).toBe(1);

      // 1. Limpa somente a camada 'sensores'
      el.limparCamadas(['sensores']);
      expect(el.obterMarcadores('sensores').length).toBe(0);
      expect(el.obterMarcadores('vertices').length).toBe(1);

      // 2. Limpa todas as camadas vetoriais
      el.limparCamadas();
      expect(el.obterMarcadores('vertices').length).toBe(0);

      document.body.removeChild(el);
    });
  });

  describe('Prompt 2: Modo de Interação Sequencial Ponto a Ponto', () => {
    it('deve alternar o estado via atributo HTML modo-sequencial e propriedade JS', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      expect(el.modoSequencial).toBe(false);
      expect(el.hasAttribute('modo-sequencial')).toBe(false);
      expect(el.getController().modoCliqueSequencialAtivo).toBe(false);

      // 1. Ativação via propriedade JS
      el.modoSequencial = true;
      expect(el.modoSequencial).toBe(true);
      expect(el.hasAttribute('modo-sequencial')).toBe(true);
      expect(el.getController().modoCliqueSequencialAtivo).toBe(true);
      expect(el.getController().context.modoSequencial).toBe(true);

      // 2. Desativação via propriedade JS
      el.modoSequencial = false;
      expect(el.modoSequencial).toBe(false);
      expect(el.hasAttribute('modo-sequencial')).toBe(false);
      expect(el.getController().modoCliqueSequencialAtivo).toBe(false);
      expect(el.getController().context.modoSequencial).toBe(false);

      // 3. Ativação via atributo HTML
      el.setAttribute('modo-sequencial', '');
      expect(el.modoSequencial).toBe(true);
      expect(el.getController().modoCliqueSequencialAtivo).toBe(true);

      // 4. Desativação via atributo HTML
      el.removeAttribute('modo-sequencial');
      expect(el.modoSequencial).toBe(false);
      expect(el.getController().modoCliqueSequencialAtivo).toBe(false);

      document.body.removeChild(el);
    });

    it('deve disparar evento customizado ui-clique-sequencial com detail correto e propagação pelo Shadow DOM', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      el.modoSequencial = true;

      const mockPonto = { id: 'P-101', lat: -23.765, lon: -53.320, nome_vertice: 'V101' };
      el.plotarPontos([mockPonto]);

      const eventosRecebidos: CustomEvent[] = [];
      const parentListener = (e: Event) => {
        eventosRecebidos.push(e as CustomEvent);
      };

      // Adiciona listener no document para validar composed: true e bubbles: true (através do Shadow DOM)
      document.addEventListener('ui-clique-sequencial', parentListener);

      const marcadores = el.obterMarcadores('vertices');
      expect(marcadores.length).toBe(1);

      // Simula clique no marcador Leaflet
      marcadores[0].fire('click');

      expect(eventosRecebidos.length).toBe(1);
      const ev = eventosRecebidos[0];
      expect(ev.type).toBe('ui-clique-sequencial');
      expect(ev.bubbles).toBe(true);
      expect(ev.composed).toBe(true);
      expect(ev.detail.id).toBe('P-101');
      expect(ev.detail.elemento).toBeDefined();
      expect(ev.detail.coordenadas).toBeDefined();
      expect(ev.detail.coordenadas.lat).toBeCloseTo(-23.765, 4);
      expect(ev.detail.coordenadas.lon).toBeCloseTo(-53.320, 4);

      document.removeEventListener('ui-clique-sequencial', parentListener);
      document.body.removeChild(el);
    });

    it('não deve desselecionar elementos previamente ativos ao clicar em modo sequencial', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const pontos = [
        { id: 1, lat: -23.765, lon: -53.320 },
        { id: 2, lat: -23.766, lon: -53.321 }
      ];
      el.plotPontos(pontos);

      // Define uma seleção prévia no canvas
      const ctrl = el.getController();
      ctrl.canvasInteracao.ctx.selectedPontoIds = [1];
      ctrl.canvasInteracao.ctx.lastSelectedPontoId = 1;

      // Ativa modo sequencial
      el.modoSequencial = true;

      let pontoSelecionadoDisparado = false;
      el.addEventListener('ui-ponto-selecionado', () => {
        pontoSelecionadoDisparado = true;
      });

      const marcadores = el.getMarkers();
      expect(marcadores.length).toBe(2);

      // Clica no ponto 2 enquanto em modo sequencial
      marcadores[1].fire('click');

      // A seleção original NÃO deve ter sido modificada e o evento ui-ponto-selecionado não deve ter sido emitido
      expect(ctrl.canvasInteracao.ctx.selectedPontoIds).toEqual([1]);
      expect(ctrl.canvasInteracao.ctx.lastSelectedPontoId).toBe(1);
      expect(pontoSelecionadoDisparado).toBe(false);

      document.body.removeChild(el);
    });

    it('deve restaurar o comportamento padrão (abrir popup e disparar eventos de seleção) quando modo-sequencial === false', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const pontos = [
        { id: 42, lat: -23.765, lon: -53.320, nome_vertice: 'M-42' }
      ];
      el.plotPontos(pontos);

      // Inicialmente com modo sequencial
      el.modoSequencial = true;
      expect(el.modoSequencial).toBe(true);

      // Restaura para false
      el.modoSequencial = false;
      expect(el.modoSequencial).toBe(false);

      let pontoSelecionado = false;
      let elementoSelecionado = false;
      el.addEventListener('ui-ponto-selecionado', () => {
        pontoSelecionado = true;
      });
      el.addEventListener('ui-elemento-selecionado', () => {
        elementoSelecionado = true;
      });

      const marcadores = el.getMarkers();
      marcadores[0].fire('click');

      expect(pontoSelecionado).toBe(true);
      expect(elementoSelecionado).toBe(true);

      // No modo normal, atualiza a seleção interna
      const ctrl = el.getController();
      expect(ctrl.canvasInteracao.ctx.selectedPontoIds).toEqual([42]);

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });
  });

  describe('Prompt 3: Ações Customizadas e Botões Desacoplados em Popups', () => {
    it('deve renderizar botões de ação customizados no rodapé do popup com classes de variante', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const mockPonto = {
        id: 'pto-actions',
        lat: -23.765,
        lon: -53.320,
        acoes: [
          { id: 'editar', rotulo: 'Editar Coordenada', variante: 'primary' as const },
          { id: 'conectar', rotulo: 'Conectar Linha', variante: 'secondary' as const },
          { id: 'excluir', rotulo: 'Excluir', variante: 'destrutivo' as const }
        ]
      };

      el.plotarPontos([mockPonto], 'vertices');
      const marcadores = el.obterMarcadores('vertices');
      expect(marcadores.length).toBe(1);

      const m = marcadores[0];
      const popup = m.getPopup();
      expect(popup).toBeDefined();

      const content = popup!.getContent() as string;
      expect(content).toContain('ui-popup-actions-footer');
      expect(content).toContain('data-acao-id="editar"');
      expect(content).toContain('ui-popup-btn-primary');
      expect(content).toContain('Editar Coordenada');
      expect(content).toContain('data-acao-id="conectar"');
      expect(content).toContain('ui-popup-btn-secondary');
      expect(content).toContain('Conectar Linha');
      expect(content).toContain('data-acao-id="excluir"');
      expect(content).toContain('ui-popup-btn-destrutivo');
      expect(content).toContain('Excluir');

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });

    it('deve disparar ui-acao-popup com detail correto e bubbles/composed ao clicar em uma ação', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const mockPonto = {
        id: 123,
        lat: -23.765,
        lon: -53.320,
        acoes: [
          { id: 'vincular-documento', rotulo: 'Vincular Doc', variante: 'primary' as const }
        ]
      };

      el.plotPontos([mockPonto]);

      const eventosAcao: CustomEvent[] = [];
      const documentListener = (e: Event) => {
        eventosAcao.push(e as CustomEvent);
      };

      document.addEventListener('ui-acao-popup', documentListener);

      // Dispara a ação via método público do componente ou evento
      el.dispararAcaoPopup('vincular-documento', 123, mockPonto);

      expect(eventosAcao.length).toBe(1);
      const ev = eventosAcao[0];
      expect(ev.type).toBe('ui-acao-popup');
      expect(ev.bubbles).toBe(true);
      expect(ev.composed).toBe(true);
      expect(ev.detail.acaoId).toBe('vincular-documento');
      expect(ev.detail.elementoId).toBe(123);
      expect(ev.detail.elemento).toBeDefined();
      expect(ev.detail.elemento.id).toBe(123);

      document.removeEventListener('ui-acao-popup', documentListener);
      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });

    it('deve fechar o popup após a emissão do evento de ação', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const mockPonto = {
        id: 99,
        lat: -23.765,
        lon: -53.320,
        acoes: [
          { id: 'fechar-teste', rotulo: 'Fechar', variante: 'secondary' as const }
        ]
      };

      el.plotarPontos([mockPonto]);
      const marcadores = el.obterMarcadores('vertices');
      const m = marcadores[0];

      // Abre o popup no mapa
      m.openPopup();
      expect(m.isPopupOpen()).toBe(true);

      // Dispara ação
      el.dispararAcaoPopup('fechar-teste', 99, mockPonto);

      // O popup deve estar fechado
      expect(m.isPopupOpen()).toBe(false);

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });

    it('deve permitir herança de ações definidas no nível da camada', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      // Define ações na camada 'vertices'
      const layerManager = el.getLayerManager();
      const layerVertices = layerManager.getLayers().find(l => l.id === 'vertices');
      expect(layerVertices).toBeDefined();
      layerVertices!.acoes = [
        { id: 'acao-camada', rotulo: 'Ação da Camada', variante: 'primary' as const }
      ];

      // Ponto sem ações próprias
      const mockPonto = {
        id: 'p-sem-acoes',
        lat: -23.765,
        lon: -53.320
      };

      el.plotarPontos([mockPonto], 'vertices');
      const marcadores = el.obterMarcadores('vertices');
      const popup = marcadores[0].getPopup();
      const content = popup!.getContent() as string;

      expect(content).toContain('data-acao-id="acao-camada"');
      expect(content).toContain('Ação da Camada');

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });
  });

  describe('Prompt 4: Evento de Clique Livre no Canvas e Consulta Espacial Externa', () => {
    it('deve disparar ui-canvas-clique com coordenadas, pixel e camadas ativas ao clicar em área livre', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const eventosRecebidos: CustomEvent[] = [];
      const documentListener = (e: Event) => {
        eventosRecebidos.push(e as CustomEvent);
      };

      document.addEventListener('ui-canvas-clique', documentListener);

      const map = el.getMap();
      expect(map).toBeDefined();

      const mockEvent = new MouseEvent('click', { clientX: 150, clientY: 200, bubbles: true });
      map!.fire('click', {
        latlng: L.latLng(-23.765432, -53.321098),
        containerPoint: L.point(150, 200),
        originalEvent: mockEvent
      });

      expect(eventosRecebidos.length).toBe(1);
      const ev = eventosRecebidos[0];
      expect(ev.type).toBe('ui-canvas-clique');
      expect(ev.bubbles).toBe(true);
      expect(ev.composed).toBe(true);
      expect(ev.detail.coordenadas).toBeDefined();
      expect(ev.detail.coordenadas.lat).toBeCloseTo(-23.765432, 5);
      expect(ev.detail.coordenadas.lng).toBeCloseTo(-53.321098, 5);
      expect(ev.detail.lat).toBeCloseTo(-23.765432, 5);
      expect(ev.detail.lon).toBeCloseTo(-53.321098, 5);
      expect(ev.detail.pontoPixel).toEqual({ x: 150, y: 200 });
      expect(Array.isArray(ev.detail.camadasAtivas)).toBe(true);
      expect(ev.detail.camadasAtivas).toContain('vertices');
      expect(ev.detail.camadasAtivas).toContain('satelite');
      expect(ev.detail.eventoOriginal).toBe(mockEvent);

      document.removeEventListener('ui-canvas-clique', documentListener);
      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });

    it('não deve disparar ui-canvas-clique quando modo-sequencial === true', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      // Ativa modo sequencial
      el.modoSequencial = true;

      let cliqueDisparado = false;
      el.addEventListener('ui-canvas-clique', () => {
        cliqueDisparado = true;
      });

      const map = el.getMap();
      map!.fire('click', {
        latlng: L.latLng(-23.765, -53.320),
        containerPoint: L.point(100, 100),
        originalEvent: new MouseEvent('click')
      });

      expect(cliqueDisparado).toBe(false);

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });

    it('não deve disparar ui-canvas-clique durante ou após arraste de seleção retangular (selectionHappened === true)', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      let cliqueDisparado = false;
      el.addEventListener('ui-canvas-clique', () => {
        cliqueDisparado = true;
      });

      // Simula estado de seleção retangular ativa (Window / Crossing)
      const ctrl = el.getController();
      ctrl.canvasInteracao.selectionHappened = true;

      const map = el.getMap();
      map!.fire('click', {
        latlng: L.latLng(-23.765, -53.320),
        containerPoint: L.point(100, 100),
        originalEvent: new MouseEvent('click')
      });

      expect(cliqueDisparado).toBe(false);

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });

    it('não deve disparar ui-canvas-clique durante ou após pan na tela (panHappened === true)', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      let cliqueDisparado = false;
      el.addEventListener('ui-canvas-clique', () => {
        cliqueDisparado = true;
      });

      // Simula estado de pan ocorrido
      const ctrl = el.getController();
      ctrl.canvasInteracao.panHappened = true;

      const map = el.getMap();
      map!.fire('click', {
        latlng: L.latLng(-23.765, -53.320),
        containerPoint: L.point(100, 100),
        originalEvent: new MouseEvent('click')
      });

      expect(cliqueDisparado).toBe(false);

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });

    it('não deve disparar ui-canvas-clique ao clicar sobre marcadores, vetores ou ferramentas', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      let cliqueDisparado = false;
      el.addEventListener('ui-canvas-clique', () => {
        cliqueDisparado = true;
      });

      const mockMarkerElement = document.createElement('div');
      mockMarkerElement.className = 'custom-leaflet-marker';

      const mockEvent = new MouseEvent('click');
      Object.defineProperty(mockEvent, 'target', { value: mockMarkerElement });

      const map = el.getMap();
      map!.fire('click', {
        latlng: L.latLng(-23.765, -53.320),
        containerPoint: L.point(100, 100),
        originalEvent: mockEvent
      });

      expect(cliqueDisparado).toBe(false);

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });
  });

  describe('Prompt 5: Agrupamento Lógico de Polilinhas e Multi-Geometrias', () => {
    it('deve aceitar a propriedade declarativa chave-grupo via atributo e refletir na propriedade JS', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      el.setAttribute('chave-grupo', 'talhao_id');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      expect(el.chaveGrupo).toBe('talhao_id');
      expect(el.getController().chaveGrupo).toBe('talhao_id');
      expect(el.getController().context.chaveGrupo).toBe('talhao_id');

      // Altera via JS
      el.chaveGrupo = 'gleba_num';
      expect(el.getAttribute('chave-grupo')).toBe('gleba_num');
      expect(el.getController().chaveGrupo).toBe('gleba_num');

      // Limpa chave
      el.chaveGrupo = undefined;
      expect(el.hasAttribute('chave-grupo')).toBe(false);

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });

    it('deve agrupar pontos por ponto.grupoId e ordenar por sequência sem cruzar linhas entre grupos distintos', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      // Pontos misturados e desordenados pertencentes a dois grupos independentes (Gleba A e Gleba B)
      const pontosEntrada = [
        { id: 'B2', lat: -24.10, lon: -54.20, grupoId: 'gleba-B', ordem: 2 },
        { id: 'A3', lat: -23.20, lon: -53.10, grupoId: 'gleba-A', ordem: 3 },
        { id: 'B1', lat: -24.10, lon: -54.10, grupoId: 'gleba-B', ordem: 1 },
        { id: 'A1', lat: -23.10, lon: -53.10, grupoId: 'gleba-A', ordem: 1 },
        { id: 'B3', lat: -24.20, lon: -54.20, grupoId: 'gleba-B', ordem: 3 },
        { id: 'A2', lat: -23.10, lon: -53.20, grupoId: 'gleba-A', ordem: 2 },
      ];

      // Plota polilinha com fechamento ativo
      el.plotarPolilinhaSequencial(pontosEntrada, true, 'polilinha');

      const lm = el.getLayerManager();
      const layerInstance = lm.getLayerInstance('polilinha') as L.LayerGroup;
      expect(layerInstance).toBeDefined();

      const polylines: L.Polyline[] = [];
      layerInstance.eachLayer(l => {
        if (l instanceof L.Polyline) polylines.push(l);
      });

      // Dois grupos com >= 3 pontos e fechamento ativo: devem gerar corpo + fechamento para cada grupo (total 4 polylines)
      expect(polylines.length).toBe(4);

      // Critério de Aceite: Pontos de grupos distintos NUNCA compartilham uma aresta!
      polylines.forEach(pl => {
        const latLngs = pl.getLatLngs() as L.LatLng[];
        const lats = latLngs.map(ll => ll.lat);

        const pertenceGlebaA = lats.every(lat => Math.abs(lat - (-23.0)) < 0.5);
        const pertenceGlebaB = lats.every(lat => Math.abs(lat - (-24.0)) < 0.5);

        // Cada polilinha gerada deve pertencer EXCLUSIVAMENTE a um dos grupos
        expect(pertenceGlebaA || pertenceGlebaB).toBe(true);
        expect(pertenceGlebaA && pertenceGlebaB).toBe(false);
      });

      // Valida que as polylines de fechamento usam linha tracejada ('4, 4')
      const polylinesFechamento = polylines.filter(pl => (pl.options as any).dashArray === '4, 4');
      expect(polylinesFechamento.length).toBe(2);

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });

    it('deve aceitar chave customizada declarada via atributo chave-grupo e ordenar por indice', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      el.setAttribute('chave-grupo', 'talhao');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const pontos = [
        { id: 10, lat: -25.0, lon: -50.0, talhao: 'T1', indice: 1 },
        { id: 20, lat: -25.1, lon: -50.1, talhao: 'T1', indice: 2 },
        { id: 30, lat: -26.0, lon: -51.0, talhao: 'T2', indice: 1 },
        { id: 40, lat: -26.1, lon: -51.1, talhao: 'T2', indice: 2 }
      ];

      el.plotarPolilinhaSequencial(pontos, false, 'polilinha');

      const lm = el.getLayerManager();
      const layerInstance = lm.getLayerInstance('polilinha') as L.LayerGroup;
      const polylines: L.Polyline[] = [];
      layerInstance.eachLayer(l => {
        if (l instanceof L.Polyline) polylines.push(l);
      });

      // Sem fechamento: 1 polyline para T1 e 1 polyline para T2
      expect(polylines.length).toBe(2);

      polylines.forEach(pl => {
        const latLngs = pl.getLatLngs() as L.LatLng[];
        const lats = latLngs.map(ll => ll.lat);
        const isT1 = lats.every(lat => lat >= -25.5 && lat <= -24.5);
        const isT2 = lats.every(lat => lat >= -26.5 && lat <= -25.5);
        expect(isT1 || isT2).toBe(true);
        expect(isT1 && isT2).toBe(false);
      });

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });

    it('não deve traçar polilinha para grupos com menos de 2 pontos válidos', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const pontos = [
        { id: 'sozinho', lat: -23.5, lon: -53.5, grupoId: 'solitario', ordem: 1 },
        { id: 'par1', lat: -23.6, lon: -53.6, grupoId: 'dupla', ordem: 1 },
        { id: 'par2', lat: -23.7, lon: -53.7, grupoId: 'dupla', ordem: 2 }
      ];

      el.plotarPolilinhaSequencial(pontos, false, 'polilinha');

      const lm = el.getLayerManager();
      const layerInstance = lm.getLayerInstance('polilinha') as L.LayerGroup;
      const polylines: L.Polyline[] = [];
      layerInstance.eachLayer(l => {
        if (l instanceof L.Polyline) polylines.push(l);
      });

      // Apenas o grupo 'dupla' deve gerar polyline (o solitário com 1 ponto não gera linha)
      expect(polylines.length).toBe(1);

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });

    it('permite conexão explícita entre pontos de grupos distintos via plotarConexoes', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const pontos = [
        { id: 'G1-1', lat: -23.1, lon: -53.1, grupoId: 'G1' },
        { id: 'G2-1', lat: -24.1, lon: -54.1, grupoId: 'G2' }
      ];

      el.plotarPontos(pontos, 'vertices');

      // Conexão explícita entre nós de grupos distintos
      el.plotarConexoes([
        { origemId: 'G1-1', destinoId: 'G2-1', tipoLinha: 'continua' }
      ], 'linhas');

      const lm = el.getLayerManager();
      const layerInstance = lm.getLayerInstance('linhas') as L.LayerGroup;
      const polylines: L.Polyline[] = [];
      layerInstance.eachLayer(l => {
        if (l instanceof L.Polyline) polylines.push(l);
      });

      expect(polylines.length).toBe(1);
      const coords = polylines[0].getLatLngs() as L.LatLng[];
      expect(coords[0].lat).toBeCloseTo(-23.1, 4);
      expect(coords[1].lat).toBeCloseTo(-24.1, 4);

      await new Promise(r => setTimeout(r, 20));
      document.body.removeChild(el);
    });
  });

  describe('Prompt 6: Método de Destaque Visual e Localização de Entidades (destacarElemento)', () => {
    it('deve expor métodos públicos destacarElemento e limparDestaque no elemento e no controller', () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      expect(typeof el.destacarElemento).toBe('function');
      expect(typeof el.limparDestaque).toBe('function');
      expect(typeof el.destaqueAtivo).toBe('boolean');
      expect(el.destaqueAtivo).toBe(false);

      const controller = el.getController();
      expect(typeof controller.destacarElemento).toBe('function');
      expect(typeof controller.limparDestaque).toBe('function');
      expect(typeof controller.localizarCoordenadasElemento).toBe('function');
    });

    it('deve localizar e destacar elemento por ID numérico ou string com coordenadas precisas', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 30));

      const pontos = [
        { id: 101, nome_vertice: 'M-101', lat: -23.765, lon: -53.320 },
        { id: 'V-200', nome_vertice: 'V-200', lat: -23.766, lon: -53.321 }
      ];
      el.plotPontos(pontos as any);

      // Destaca por ID numérico
      el.destacarElemento(101);
      expect(el.destaqueAtivo).toBe(true);

      const controller = el.getController();
      const coord101 = controller.localizarCoordenadasElemento(101);
      expect(coord101).toBeDefined();
      expect(coord101?.lat).toBeCloseTo(-23.765, 4);
      expect(coord101?.lng).toBeCloseTo(-53.320, 4);
      expect((coord101 as any)?.lon).toBeCloseTo(-53.320, 4);

      // Destaca por ID em string
      el.destacarElemento('V-200');
      expect(el.destaqueAtivo).toBe(true);
      const coord200 = controller.localizarCoordenadasElemento('V-200');
      expect(coord200?.lat).toBeCloseTo(-23.766, 4);
      expect(coord200?.lng).toBeCloseTo(-53.321, 4);
      expect((coord200 as any)?.lon).toBeCloseTo(-53.321, 4);

      el.limparDestaque();
      expect(el.destaqueAtivo).toBe(false);

      document.body.removeChild(el);
    });

    it('deve mover suavemente a câmera com panTo quando pan === true', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 30));

      const map = el.getMap()!;
      const panSpy = vi.spyOn(map, 'panTo');

      el.plotPontos([
        { id: 1, lat: -23.765, lon: -53.320 }
      ]);

      el.destacarElemento(1, { pan: true });

      expect(panSpy).toHaveBeenCalled();
      const panArg = panSpy.mock.calls[0][0] as L.LatLng;
      expect(panArg.lat).toBeCloseTo(-23.765, 4);
      expect(panArg.lng).toBeCloseTo(-53.320, 4);
      expect(panSpy.mock.calls[0][1]).toEqual({ animate: true });

      el.limparDestaque();
      document.body.removeChild(el);
    });

    it('deve aplicar nível de zoom quando especificado nas opções', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 30));

      const map = el.getMap()!;
      const flySpy = vi.spyOn(map, 'flyTo');
      const setViewSpy = vi.spyOn(map, 'setView');

      el.plotPontos([
        { id: 5, lat: -23.768, lon: -53.325 }
      ]);

      el.destacarElemento(5, { pan: true, zoom: 19 });

      const hasCalledZoom = flySpy.mock.calls.length > 0 || setViewSpy.mock.calls.length > 0;
      expect(hasCalledZoom).toBe(true);

      el.limparDestaque();
      document.body.removeChild(el);
    });

    it('deve criar anel de destaque pulsante no pane de sobreposição sem bloquear eventos de clique', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 30));

      const map = el.getMap()!;
      el.plotPontos([
        { id: 10, lat: -23.765, lon: -53.320 }
      ]);

      el.destacarElemento(10, { cor: '#38bdf8' });

      // O pane de sobreposição pane-destaque deve ter pointer-events = none
      const destaquePane = map.getPane('pane-destaque');
      expect(destaquePane).toBeDefined();
      expect(destaquePane?.style.pointerEvents).toBe('none');

      // Encontra o marcador de destaque criado
      let destaqueMarker: any = null;
      map.eachLayer((layer: any) => {
        if (layer.options?.icon?.options?.className?.includes('cad-destaque-marker-container')) {
          destaqueMarker = layer;
        }
      });

      expect(destaqueMarker).toBeDefined();
      // O marcador de destaque não é interativo
      expect(destaqueMarker.options.interactive).toBe(false);

      // O HTML interno contém a estrutura CSS Keyframe e a cor customizada
      const html = destaqueMarker.options.icon.options.html;
      expect(html).toContain('cad-pulse-highlight');
      expect(html).toContain('cad-pulse-core');
      expect(html).toContain('cad-pulse-ring');
      expect(html).toContain('--cad-pulse-cor: #38bdf8');

      // Os marcadores originais não foram corrompidos
      const markers = el.getMarkers();
      expect(markers.length).toBeGreaterThanOrEqual(1);
      const originalMarker = markers.find(m => (m as any).pontoId === 10);
      expect(originalMarker).toBeDefined();
      expect((originalMarker as any).options.interactive).toBe(true);

      el.limparDestaque();
      document.body.removeChild(el);
    });

    it('deve limpar instâncias anteriores antes de criar um novo anel de pulso', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 30));

      const map = el.getMap()!;
      el.plotPontos([
        { id: 1, lat: -23.765, lon: -53.320 },
        { id: 2, lat: -23.766, lon: -53.321 }
      ]);

      // Primeiro destaque
      el.destacarElemento(1);

      let countDestaques = 0;
      map.eachLayer((layer: any) => {
        if (layer.options?.icon?.options?.className?.includes('cad-destaque-marker-container')) {
          countDestaques++;
        }
      });
      expect(countDestaques).toBe(1);

      // Segundo destaque: deve limpar a anterior
      el.destacarElemento(2);

      countDestaques = 0;
      map.eachLayer((layer: any) => {
        if (layer.options?.icon?.options?.className?.includes('cad-destaque-marker-container')) {
          countDestaques++;
        }
      });
      // Permanece exatamente 1 anel de destaque
      expect(countDestaques).toBe(1);

      el.limparDestaque();
      document.body.removeChild(el);
    });

    it('deve remover o efeito automaticamente após duracaoMs se fornecido', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 30));

      el.plotPontos([
        { id: 99, lat: -23.765, lon: -53.320 }
      ]);

      el.destacarElemento(99, { duracaoMs: 50 });
      expect(el.destaqueAtivo).toBe(true);

      // Aguarda passar duracaoMs
      await new Promise(r => setTimeout(r, 70));
      expect(el.destaqueAtivo).toBe(false);

      document.body.removeChild(el);
    });

    it('deve localizar entidades poligonais e WKT de confrontantes', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 30));

      const confrontantes = [
        {
          id: 'vizinho-1',
          nome: 'Fazenda Santa Maria',
          poligono_wkt: 'POLYGON((-53.320 -23.760, -53.310 -23.760, -53.310 -23.750, -53.320 -23.750, -53.320 -23.760))'
        }
      ];
      el.confrontantes = confrontantes as any;

      el.destacarElemento('vizinho-1');
      expect(el.destaqueAtivo).toBe(true);

      const controller = el.getController();
      const coord = controller.localizarCoordenadasElemento('vizinho-1');
      expect(coord).toBeDefined();
      expect(coord?.lat).toBeCloseTo(-23.755, 2);
      expect(coord?.lng).toBeCloseTo(-53.315, 2);
      expect((coord as any)?.lon).toBeCloseTo(-53.315, 2);

      el.limparDestaque();
      document.body.removeChild(el);
    });

    it('deve limpar o destaque ao desconectar o componente do DOM', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 30));

      el.plotPontos([
        { id: 1, lat: -23.765, lon: -53.320 }
      ]);
      el.destacarElemento(1);
      expect(el.destaqueAtivo).toBe(true);

      // Desconecta do DOM
      document.body.removeChild(el);
      expect(el.destaqueAtivo).toBe(false);
    });
  });

  describe('Prompt 7: Auto-Ajuste Defensivo por Observador de Redimensionamento (ResizeObserver)', () => {
    it('deve instanciar ResizeObserver no connectedCallback monitorando o host (this)', async () => {
      let observedTarget: Element | null = null;
      const origObserve = ResizeObserver.prototype.observe;
      ResizeObserver.prototype.observe = vi.fn(function (this: any, target: Element) {
        observedTarget = target;
        return origObserve.call(this, target);
      });

      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      expect(observedTarget).toBe(el);

      ResizeObserver.prototype.observe = origObserve;
      document.body.removeChild(el);
    });

    it('deve acionar invalidação de dimensões do mapa com debounce (25ms) ao detectar variação > 0', async () => {
      let observerCallback: ResizeObserverCallback | null = null;
      const origRO = globalThis.ResizeObserver;

      globalThis.ResizeObserver = class MockResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          observerCallback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      } as any;

      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const invalidateSpy = vi.spyOn(el.getController(), 'invalidateSize');

      expect(observerCallback).toBeDefined();

      // Dispara redimensionamento para largura e altura > 0
      observerCallback!([
        {
          target: el,
          contentRect: { width: 900, height: 600, top: 0, left: 0, bottom: 600, right: 900, x: 0, y: 0, toJSON: () => ({}) }
        } as any
      ], {} as any);

      // Imediatamente após a chamada (antes de 25ms), não deve ter chamado ainda devido ao debounce
      expect(invalidateSpy).not.toHaveBeenCalled();

      // Aguarda o término da janela de debounce (35ms)
      await new Promise(r => setTimeout(r, 35));
      expect(invalidateSpy).toHaveBeenCalledTimes(1);

      // Simula arraste contínuo de splitter: múltiplos disparos rápidos
      observerCallback!([
        {
          target: el,
          contentRect: { width: 920, height: 600, top: 0, left: 0, bottom: 600, right: 920, x: 0, y: 0, toJSON: () => ({}) }
        } as any
      ], {} as any);
      observerCallback!([
        {
          target: el,
          contentRect: { width: 950, height: 600, top: 0, left: 0, bottom: 600, right: 950, x: 0, y: 0, toJSON: () => ({}) }
        } as any
      ], {} as any);

      await new Promise(r => setTimeout(r, 35));
      // Deve ter coalescido em apenas mais 1 chamada (total 2)
      expect(invalidateSpy).toHaveBeenCalledTimes(2);

      globalThis.ResizeObserver = origRO;
      document.body.removeChild(el);
    });

    it('não deve acionar redimensionamento caso largura ou altura sejam <= 0', async () => {
      let observerCallback: ResizeObserverCallback | null = null;
      const origRO = globalThis.ResizeObserver;

      globalThis.ResizeObserver = class MockResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          observerCallback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      } as any;

      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const invalidateSpy = vi.spyOn(el.getController(), 'invalidateSize');

      // Variação com largura ou altura 0 (ex: elemento colapsado em layout)
      observerCallback!([
        {
          target: el,
          contentRect: { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => ({}) }
        } as any
      ], {} as any);

      await new Promise(r => setTimeout(r, 35));
      expect(invalidateSpy).not.toHaveBeenCalled();

      globalThis.ResizeObserver = origRO;
      document.body.removeChild(el);
    });

    it('deve desconectar e anular o ResizeObserver no disconnectedCallback', async () => {
      let disconnectCalled = false;
      const origRO = globalThis.ResizeObserver;

      globalThis.ResizeObserver = class MockResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {
          disconnectCalled = true;
        }
      } as any;

      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      expect(disconnectCalled).toBe(false);

      document.body.removeChild(el);
      expect(disconnectCalled).toBe(true);

      globalThis.ResizeObserver = origRO;
    });

    it('deve absorver silenciosamente exceções do tipo undefined._leaflet_pos ou panes desanexados', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const map = el.getMap()!;
      vi.spyOn(map, 'invalidateSize').mockImplementation(() => {
        throw new TypeError("Cannot read properties of undefined (reading '_leaflet_pos')");
      });

      // Não deve lançar erro
      expect(() => {
        el.invalidateSizeSafely();
      }).not.toThrow();

      expect(() => {
        el.invalidateSize();
      }).not.toThrow();

      document.body.removeChild(el);
    });
  });

  describe('Prompt 8: Configuração Declarativa de Projeção / Zona Espacial', () => {
    it('deve ter valor padrão seguro de zona-projecao (22) no componente e controlador', () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      expect(el.zonaProjecao).toBe(22);
      expect(el.getController().zonaProjecao).toBe(22);
      expect(el.getController().context.zonaProjecao).toBe(22);
    });

    it('deve sincronizar atributo HTML zona-projecao com a propriedade JS e o controller', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      el.setAttribute('zona-projecao', '23');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      expect(el.zonaProjecao).toBe(23);
      expect(el.getController().zonaProjecao).toBe(23);
      expect(el.getController().context.zonaProjecao).toBe(23);

      // Atualiza via atributo fuso alternativo
      el.setAttribute('fuso', '24');
      expect(el.zonaProjecao).toBe(24);
      expect(el.getController().zonaProjecao).toBe(24);
      expect(el.getController().context.zonaProjecao).toBe(24);

      document.body.removeChild(el);
    });

    it('deve sincronizar propriedade JS com o atributo HTML zona-projecao', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      el.zonaProjecao = 21;
      expect(el.getAttribute('zona-projecao')).toBe('21');
      expect(el.getController().zonaProjecao).toBe(21);
      expect(el.getController().context.zonaProjecao).toBe(21);

      document.body.removeChild(el);
    });

    it('deve validar e rejeitar números inválidos, negativos ou menores/iguais a zero', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      el.zonaProjecao = 22;

      // Tentativas inválidas via propriedade
      el.zonaProjecao = -5;
      expect(el.zonaProjecao).toBe(22);

      el.zonaProjecao = 0;
      expect(el.zonaProjecao).toBe(22);

      el.zonaProjecao = NaN as any;
      expect(el.zonaProjecao).toBe(22);

      // Tentativas inválidas via atributo
      el.setAttribute('zona-projecao', 'invalido');
      expect(el.zonaProjecao).toBe(22);

      el.setAttribute('zona-projecao', '-10');
      expect(el.zonaProjecao).toBe(22);
    });
  });

  describe('Prompt 9: Barramento Global de Configuração em Tempo Real (canal-configuracao)', () => {
    it('deve aceitar atributo canal-configuracao e conectar-se ao canal especificado', async () => {
      const channelName = 'test_cad_broadcast_' + Date.now();
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      el.setAttribute('canal-configuracao', channelName);
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      expect(el.canalConfiguracao).toBe(channelName);

      // Emissor externo simulando outra janela ou barramento global
      const externalChannel = new BroadcastChannel(channelName);
      const configSpy = vi.fn();
      el.addEventListener('ui-config-aplicada', configSpy);

      // Emite evento de configuração externa
      externalChannel.postMessage({
        tipo: 'ESTILOS_ALTERADOS',
        configuracoes: {
          crosshair: true,
          opacidadeBase: 0.65
        }
      });

      await new Promise(r => setTimeout(r, 30));

      // Verifica disparo do evento com detail
      expect(configSpy).toHaveBeenCalledTimes(1);
      const detail = configSpy.mock.calls[0][0].detail;
      expect(detail.tipo).toBe('ESTILOS_ALTERADOS');
      expect(detail.configuracoes.crosshair).toBe(true);
      expect(detail.configuracoes.opacidadeBase).toBe(0.65);

      // Verifica reflexo nos estilos do mapa
      const satLayer = el.getLayerManager().getLayers().find(l => l.id === 'satelite');
      expect(satLayer?.opacidade).toBeCloseTo(0.65, 2);

      externalChannel.close();
      document.body.removeChild(el);
    });

    it('deve suportar atualização de opacidades múltiplas via barramento', async () => {
      const channelName = 'test_cad_opacidades_' + Date.now();
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      el.setAttribute('canal-configuracao', channelName);
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const externalChannel = new BroadcastChannel(channelName);

      externalChannel.postMessage({
        tipo: 'ESTILOS_ALTERADOS',
        configuracoes: {
          opacidades: {
            satelite: 0.4,
            perimetro: 0.75
          }
        }
      });

      await new Promise(r => setTimeout(r, 30));

      const lm = el.getLayerManager();
      const sat = lm.getLayers().find(l => l.id === 'satelite');
      const perim = lm.getLayers().find(l => l.id === 'perimetro');

      expect(sat?.opacidade).toBeCloseTo(0.4, 2);
      expect(perim?.opacidade).toBeCloseTo(0.75, 2);

      externalChannel.close();
      document.body.removeChild(el);
    });

    it('deve fechar canal anterior e conectar ao novo ao alterar canal-configuracao', async () => {
      const channel1 = 'cad_channel_1_' + Date.now();
      const channel2 = 'cad_channel_2_' + Date.now();

      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      el.setAttribute('canal-configuracao', channel1);
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const ext1 = new BroadcastChannel(channel1);
      const ext2 = new BroadcastChannel(channel2);
      const configSpy = vi.fn();
      el.addEventListener('ui-config-aplicada', configSpy);

      // Altera dinamicamente o canal
      el.canalConfiguracao = channel2;
      expect(el.getAttribute('canal-configuracao')).toBe(channel2);
      await new Promise(r => setTimeout(r, 20));

      // Mensagem no canal antigo não deve ter efeito
      ext1.postMessage({ tipo: 'TESTE_IGNORAR', configuracoes: { opacidadeBase: 0.1 } });
      await new Promise(r => setTimeout(r, 20));
      expect(configSpy).not.toHaveBeenCalled();

      // Mensagem no novo canal deve ser processada
      ext2.postMessage({ tipo: 'TESTE_NOVO_CANAL', configuracoes: { opacidadeBase: 0.85 } });
      await new Promise(r => setTimeout(r, 30));
      expect(configSpy).toHaveBeenCalledTimes(1);

      ext1.close();
      ext2.close();
      document.body.removeChild(el);
    });

    it('deve fechar e anular a conexão com o BroadcastChannel no disconnectedCallback', async () => {
      const channelName = 'cad_disconnect_channel_' + Date.now();
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      el.setAttribute('canal-configuracao', channelName);
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const ext = new BroadcastChannel(channelName);
      const configSpy = vi.fn();
      el.addEventListener('ui-config-aplicada', configSpy);

      // Desconecta elemento
      document.body.removeChild(el);

      // Mensagem após desconexão não deve disparar eventos
      ext.postMessage({ tipo: 'DEPOIS_DE_DESCONECTAR', configuracoes: { crosshair: true } });
      await new Promise(r => setTimeout(r, 30));
      expect(configSpy).not.toHaveBeenCalled();

      ext.close();
    });
  });

  describe('Proteções Defensivas no Ciclo de Vida do Mapa (SPA e Desmontagem)', () => {
    it('deve desregistrar eventos, remover o mapa com try/catch e limpar _leaflet_id no destroy e disconnectedCallback', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const map = el.getMap();
      expect(map).not.toBeNull();

      const container = (el as any).mapContainer as HTMLElement;
      expect((container as any)._leaflet_id).toBeDefined();

      // Espiona map.off e map.remove
      const spyOff = vi.spyOn(map!, 'off');
      const spyRemove = vi.spyOn(map!, 'remove');

      // Executa destroy diretamente
      el.destroy();

      expect(spyOff).toHaveBeenCalled();
      expect(spyRemove).toHaveBeenCalled();
      expect(el.getMap()).toBeNull();
      expect((container as any)._leaflet_id).toBeUndefined();

      // Executa disconnectedCallback (não deve lançar erro mesmo após destroy anterior)
      expect(() => {
        document.body.removeChild(el);
      }).not.toThrow();
    });

    it('deve absorver silenciosamente exceções lançadas durante map.remove() na desmontagem', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      const map = el.getMap();
      expect(map).not.toBeNull();

      // Simula erro de desanexação do DOM no Leaflet
      vi.spyOn(map!, 'remove').mockImplementationOnce(() => {
        throw new Error('Uncaught Error: Map container is being reused by another instance');
      });

      // Não deve vazar a exceção
      expect(() => {
        el.destroy();
      }).not.toThrow();

      expect(el.getMap()).toBeNull();
      document.body.removeChild(el);
    });

    it('deve limpar _leaflet_id preventivamente se o container for reutilizado por navegação SPA', async () => {
      const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 20));

      // Desmonta
      el.destroy();

      // Simula que o framework SPA reutilizou o mesmo container e manteve _leaflet_id
      const container = (el as any).mapContainer as HTMLElement;
      (container as any)._leaflet_id = 9999;

      // Chama initCAD novamente (simulando montagem da nova rota)
      expect(() => {
        (el as any).initCAD();
      }).not.toThrow();

      expect(el.getMap()).not.toBeNull();
      document.body.removeChild(el);
    });
  });
});


