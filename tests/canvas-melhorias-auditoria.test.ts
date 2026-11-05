import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import L from 'leaflet';
import { SelecaoFeicoes } from '../src/gerencigeo-canvas/feature_selecao';
import { latLonParaUtm, formatUTM } from '../src/gerencigeo-canvas/utils';
import { EditorVertices } from '../src/gerencigeo-canvas/feature_editor_vertices';
import type { Feicao } from '../src/gerencigeo-canvas/feature_types';
import { CanvasInteracao } from '../src/gerencigeo-canvas/canvas_interacao';

describe('Auditoria Canvas CAD: Melhorias de Seleção, Edição, Espaço e Coordenadas', () => {

  describe('1. SelecaoFeicoes: Adicionar e Subtrair (Shift / Ctrl)', () => {
    it('deve adicionar referências sem duplicar', () => {
      const banco = new Map<string, Feicao>([
        ['c1/1', { id: '1', camadaId: 'c1', propriedades: {}, geometria: { tipo: 'Point', coordenada: [-23, -46] } }],
        ['c1/2', { id: '2', camadaId: 'c1', propriedades: {}, geometria: { tipo: 'Point', coordenada: [-23.1, -46.1] } }],
        ['c1/3', { id: '3', camadaId: 'c1', propriedades: {}, geometria: { tipo: 'Point', coordenada: [-23.2, -46.2] } }],
      ]);

      const selecao = new SelecaoFeicoes({
        obterFeicao: (ref) => banco.get(`${ref.camadaId}/${ref.id}`),
        aplicarVisual: () => {},
        aoSelecionar: () => {},
        aoSelecionarUma: () => {},
      });

      selecao.selecionar([
        { id: '1', camadaId: 'c1' },
        { id: '2', camadaId: 'c1' },
      ]);

      expect(selecao.quantidade).toBe(2);
      expect(selecao.obter().map(f => f.id)).toEqual(['1', '2']);

      selecao.adicionar([
        { id: '2', camadaId: 'c1' }, // já existe
        { id: '3', camadaId: 'c1' },
      ]);

      expect(selecao.quantidade).toBe(3);
      expect(selecao.obter().map(f => f.id)).toEqual(['1', '2', '3']);
    });

    it('deve subtrair referências por id/camadaId', () => {
      const banco = new Map<string, Feicao>([
        ['c1/1', { id: '1', camadaId: 'c1', propriedades: {}, geometria: { tipo: 'Point', coordenada: [-23, -46] } }],
        ['c1/2', { id: '2', camadaId: 'c1', propriedades: {}, geometria: { tipo: 'Point', coordenada: [-23.1, -46.1] } }],
        ['c2/3', { id: '3', camadaId: 'c2', propriedades: {}, geometria: { tipo: 'Point', coordenada: [-23.2, -46.2] } }],
      ]);

      const selecao = new SelecaoFeicoes({
        obterFeicao: (ref) => banco.get(`${ref.camadaId}/${ref.id}`),
        aplicarVisual: () => {},
        aoSelecionar: () => {},
        aoSelecionarUma: () => {},
      });

      selecao.selecionar([
        { id: '1', camadaId: 'c1' },
        { id: '2', camadaId: 'c1' },
        { id: '3', camadaId: 'c2' },
      ]);

      selecao.subtrair([
        { id: '2', camadaId: 'c1' },
        { id: '4', camadaId: 'c1' }, // inexistente
      ]);

      expect(selecao.quantidade).toBe(2);
      expect(selecao.obter().map(f => f.id)).toEqual(['1', '3']);
    });

    it('deve disparar callbacks ao adicionar ou subtrair', () => {
      const banco = new Map<string, Feicao>([
        ['c1/1', { id: '1', camadaId: 'c1', propriedades: {}, geometria: { tipo: 'Point', coordenada: [-23, -46] } }],
      ]);

      const aoSelecionar = vi.fn();
      const selecao = new SelecaoFeicoes({
        obterFeicao: (ref) => banco.get(`${ref.camadaId}/${ref.id}`),
        aplicarVisual: () => {},
        aoSelecionar,
        aoSelecionarUma: () => {},
      });

      selecao.adicionar([{ id: '1', camadaId: 'c1' }]);
      expect(aoSelecionar).toHaveBeenCalledTimes(1);

      selecao.subtrair([{ id: '1', camadaId: 'c1' }]);
      expect(aoSelecionar).toHaveBeenCalledTimes(2);
      expect(selecao.quantidade).toBe(0);
    });
  });

  describe('2. EditorVertices: Comportamento do Escape', () => {
    let container: HTMLDivElement;
    let map: L.Map;

    beforeEach(() => {
      container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 800 });
      Object.defineProperty(container, 'clientHeight', { value: 600 });
      document.body.appendChild(container);
      map = L.map(container, { center: [-23.5, -46.6], zoom: 16 });
    });

    afterEach(() => {
      map.remove();
      document.body.removeChild(container);
    });

    it('Escape com nó selecionado apenas desmarca o nó e mantém a edição ativa', () => {
      let feicaoAtual: Feicao = {
        id: 'linha-1',
        camadaId: 'c1',
        propriedades: {},
        geometria: {
          tipo: 'LineString',
          coordenadas: [[-23.5, -46.6], [-23.51, -46.61], [-23.52, -46.62]],
        },
      };

      const editor = new EditorVertices({
        map,
        buscarSnap: () => null,
        snapLigado: () => false,
        alternarSnap: () => {},
        previsualizar: (f) => { feicaoAtual = f; },
        aoGesto: (f) => { feicaoAtual = f; },
        aoEncerrar: () => {},
      });

      editor.iniciar(feicaoAtual);
      expect(editor.ativo).toBe(true);

      // Simula seleção do nó 1
      (editor as any).selecionado = 1;
      expect(editor.noSelecionado).toBe(1);

      // Pressiona Escape
      const evt = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      (editor as any).aoTecla(evt);

      // Deve ter desmarcado o nó mas a edição permanece ativa
      expect(editor.noSelecionado).toBeNull();
      expect(editor.ativo).toBe(true);
    });

    it('Escape sem nó selecionado cancela a edição e restaura geometria original', () => {
      const geometriaInicial = {
        tipo: 'LineString' as const,
        coordenadas: [[-23.5, -46.6], [-23.51, -46.61], [-23.52, -46.62]] as [number, number][],
      };

      let feicaoAtual: Feicao = {
        id: 'linha-1',
        camadaId: 'c1',
        propriedades: {},
        geometria: JSON.parse(JSON.stringify(geometriaInicial)),
      };

      let encerrouCom: Feicao | null = null;

      const editor = new EditorVertices({
        map,
        buscarSnap: () => null,
        snapLigado: () => false,
        alternarSnap: () => {},
        previsualizar: (f) => { feicaoAtual = f; },
        aoGesto: (f) => { feicaoAtual = f; },
        aoEncerrar: (f) => { encerrouCom = f; },
      });

      editor.iniciar(feicaoAtual);

      // Simula alteração na feição atual
      (editor as any).feicaoAtual = {
        ...feicaoAtual,
        geometria: {
          tipo: 'LineString',
          coordenadas: [[-23.5, -46.6], [-23.99, -46.99], [-23.52, -46.62]],
        },
      };
      (editor as any).base = (editor as any).feicaoAtual;

      expect(editor.noSelecionado).toBeNull();

      // Pressiona Escape
      const evt = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      (editor as any).aoTecla(evt);

      // Deve cancelar, revertendo para inicial e encerrando
      expect(editor.ativo).toBe(false);
      expect(encerrouCom).not.toBeNull();
      expect(encerrouCom!.geometria).toEqual(geometriaInicial);
    });
  });

  describe('3. Geodésia e Conversão UTM (latLonParaUtm e formatUTM)', () => {
    it('deve converter coordenadas conhecidas de Brasília/DF (Fuso 23S)', () => {
      const utm = latLonParaUtm(-15.793889, -47.882778);
      expect(utm).not.toBeNull();
      expect(utm!.fuso).toBe(23);
      expect(utm!.hemisferio).toBe('S');
      expect(utm!.este).toBeGreaterThan(180000);
      expect(utm!.este).toBeLessThan(200000);
      expect(utm!.norte).toBeGreaterThan(8250000);
      expect(utm!.norte).toBeLessThan(8260000);
    });

    it('deve converter coordenadas do Paraná / Curitiba (Fuso 22S)', () => {
      const utm = latLonParaUtm(-25.4284, -49.2733);
      expect(utm).not.toBeNull();
      expect(utm!.fuso).toBe(22);
      expect(utm!.hemisferio).toBe('S');
      expect(utm!.este).toBeGreaterThan(670000);
      expect(utm!.este).toBeLessThan(680000);
      expect(utm!.norte).toBeGreaterThan(7180000);
      expect(utm!.norte).toBeLessThan(7190000);
    });

    it('deve formatar valores UTM corretamente com padrão brasileiro', () => {
      const esteStr = formatUTM(673892.45, 2);
      const norteStr = formatUTM(7186214.12, 2);
      expect(esteStr).toBe('673.892,45');
      expect(norteStr).toBe('7.186.214,12');
    });

    it('deve retornar null para coordenadas inválidas ou NaN sem estourar exceção', () => {
      expect(latLonParaUtm(NaN, NaN)).toBeNull();
      expect(latLonParaUtm(95, 0)).toBeNull(); // lat > 84
      expect(latLonParaUtm(0, 190)).toBeNull(); // lon > 180
    });
  });

  describe('4. CanvasInteracao: Suporte a Pan com Barra de Espaço (Hand Tool)', () => {
    let container: HTMLDivElement;
    let map: L.Map;
    let interacao: CanvasInteracao;

    beforeEach(() => {
      container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 800 });
      Object.defineProperty(container, 'clientHeight', { value: 600 });
      document.body.appendChild(container);
      map = L.map(container, { center: [-23.5, -46.6], zoom: 16 });

      const fakeMapaController = {
        getMap: () => map,
        getLeafletMap: () => map,
        setInteracaoAtiva: () => {},
        estaEmModoEdicao: () => false,
      };

      interacao = new CanvasInteracao();
      interacao.ativar(fakeMapaController, container);
    });

    afterEach(() => {
      interacao.desativar();
      map.remove();
      document.body.removeChild(container);
    });

    it('deve alternar o cursor para grab ao segurar espaço e grabbing ao arrastar', () => {
      // Pressiona Space
      const spaceDown = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
      window.dispatchEvent(spaceDown);

      expect(container.style.cursor).toBe('grab');

      // Inicia clique do mouse
      const mouseDown = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100, bubbles: true });
      container.dispatchEvent(mouseDown);

      expect(container.style.cursor).toBe('grabbing');

      // Solta clique do mouse
      const mouseUp = new MouseEvent('mouseup', { button: 0, clientX: 120, clientY: 110, bubbles: true });
      window.dispatchEvent(mouseUp);

      expect(container.style.cursor).toBe('grab');

      // Solta Space
      const spaceUp = new KeyboardEvent('keyup', { code: 'Space', bubbles: true });
      window.dispatchEvent(spaceUp);

      expect(container.style.cursor).toBe('');
    });

    it('não deve ativar Space Pan quando o foco estiver em campo de texto digitável', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const spaceDown = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
      Object.defineProperty(spaceDown, 'target', { value: input });
      window.dispatchEvent(spaceDown);

      expect(container.style.cursor).toBe('');

      document.body.removeChild(input);
    });

    it('deve resetar o cursor se a janela perder o foco (blur)', () => {
      const spaceDown = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
      window.dispatchEvent(spaceDown);
      expect(container.style.cursor).toBe('grab');

      window.dispatchEvent(new Event('blur'));
      expect(container.style.cursor).toBe('');
    });
  });

});
