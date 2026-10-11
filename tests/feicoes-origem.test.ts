import { describe, it, expect, afterEach } from 'vitest';
import '../src/index';
import '../src/components/ui-canvas-cad';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { normalizarCoordenada, normalizarFeicaoEntrada } from '../src/gerencigeo-canvas/feature_adapters';
import { parseCoordenada } from '../src/gerencigeo-canvas/utils';

afterEach(() => { document.body.innerHTML = ''; });

const origem = { aceitarOrigem: true };

describe('coordenada (0, 0): funções puras', () => {
  it('padrão: rejeitada (Null Island)', () => {
    expect(parseCoordenada(0, 0)).toBeNull();
    expect(normalizarCoordenada([0, 0])).toBeNull();
    expect(normalizarCoordenada({ lat: 0, lng: 0 })).toBeNull();
    expect(normalizarFeicaoEntrada({ id: 'a', geometria: { tipo: 'Point', coordenada: [0, 0] } }, 'c')).toBeNull();
  });

  it('com aceitarOrigem: aceita, em qualquer formato', () => {
    expect(parseCoordenada(0, 0, origem)).toEqual({ lat: 0, lon: 0 });
    expect(parseCoordenada('0', '0,0', origem)).toEqual({ lat: 0, lon: 0 });
    expect(normalizarCoordenada([0, 0], origem)).toEqual([0, 0]);
    expect(normalizarCoordenada({ latitude: 0, longitude: 0 }, origem)).toEqual([0, 0]);
  });

  it('uma coordenada só zero em um eixo nunca foi rejeitada', () => {
    expect(normalizarCoordenada([0, -46.6])).toEqual([0, -46.6]);
    expect(normalizarCoordenada([-23.5, 0])).toEqual([-23.5, 0]);
  });

  it('aceitarOrigem não afasta as outras validações', () => {
    expect(parseCoordenada(NaN, 0, origem)).toBeNull();
    expect(parseCoordenada(7_000_000, 300_000, origem)).toBeNull(); // UTM plana
    expect(parseCoordenada(null, 0, origem)).toBeNull();
    expect(normalizarCoordenada(['x', 0], origem)).toBeNull();
  });

  it('vale para todos os tipos de geometria', () => {
    const f = (geometria: unknown, opcoes?: { aceitarOrigem?: boolean }) => normalizarFeicaoEntrada({ id: 'a', geometria }, 'c', opcoes);
    const casos: unknown[] = [
      { tipo: 'Point', coordenada: [0, 0] },
      { tipo: 'Text', coordenada: [0, 0], texto: 'zero' },
      { tipo: 'Circle', centro: [0, 0], raioMetros: 10 },
      { tipo: 'LineString', coordenadas: [[0, 0], [0.001, 0.001]] },
      { tipo: 'Polygon', aneis: [[[0, 0], [0, 0.001], [0.001, 0.001]]] }
    ];
    for (const g of casos) {
      expect(f(g), JSON.stringify(g)).toBeNull();
      expect(f(g, origem), JSON.stringify(g)).not.toBeNull();
    }
  });

  it('multilinha: a parte que perde o vértice (0, 0) é descartada no padrão; com a opção todas ficam', () => {
    const geometria = { tipo: 'LineString', partes: [[[0, 0], [0.001, 0.001]], [[0.002, 0.002], [0.003, 0.003]]] };
    const padrao = normalizarFeicaoEntrada({ id: 'm', geometria }, 'c')!;
    expect(padrao.geometria).toEqual({ tipo: 'LineString', coordenadas: [[0.002, 0.002], [0.003, 0.003]] });
    const comOrigem = normalizarFeicaoEntrada({ id: 'm', geometria }, 'c', origem)!;
    expect(comOrigem.geometria.tipo === 'LineString' && comOrigem.geometria.partes).toHaveLength(2);
  });

  it('linha com o vértice (0, 0) perde o vértice no padrão e fica sem os 2 mínimos', () => {
    const f = normalizarFeicaoEntrada({ id: 'l', geometria: { tipo: 'LineString', coordenadas: [[0, 0], [0.001, 0.001]] } }, 'c');
    expect(f).toBeNull();
  });
});

describe('componente: atributo aceitar-origem', () => {
  const montar = (attrs: Record<string, string> = {}): UICanvasCAD => {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    return el;
  };
  const ponto = { id: 'zero', geometria: { tipo: 'Point', coordenada: [0, 0] } };

  it('padrão: a feição em (0, 0) é recusada pelas quatro portas de entrada', () => {
    const el = montar();
    expect(el.aceitarOrigem).toBe(false);
    expect(el.definirFeicoes('c', [ponto])).toEqual({ aceitas: 0, recusadas: ['zero'] });
    expect(el.adicionarFeicao('c', ponto)).toBeNull();
    expect(el.aplicarLote('c', { adicionar: [ponto] })).toMatchObject({ adicionadas: 0, recusadas: ['zero'] });
    el.definirFeicoes('c', [{ id: 'a', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] } }]);
    expect(el.atualizarFeicao('c', 'a', { geometria: ponto.geometria })).toBeNull();
    expect(el.obterFeicoes('c')).toHaveLength(1);
  });

  it('com o atributo: aceita e desenha', () => {
    const el = montar({ 'aceitar-origem': '' });
    expect(el.aceitarOrigem).toBe(true);
    expect(el.definirFeicoes('c', [ponto])).toEqual({ aceitas: 1, recusadas: [] });
    expect(el.obterFeicoes('c')[0].geometria).toEqual({ tipo: 'Point', coordenada: [0, 0] });
    expect(el.adicionarFeicao('c', { ...ponto, id: 'outro' })).not.toBeNull();
    expect(el.atualizarFeicao('c', 'zero', { propriedades: { x: 1 } })).not.toBeNull();
    expect(el.aplicarLote('c', { adicionar: [{ ...ponto, id: 'lote' }] }).adicionadas).toBe(1);
  });

  it('liga e desliga em tempo de execução (atributo e propriedade)', () => {
    const el = montar();
    el.aceitarOrigem = true;
    expect(el.getAttribute('aceitar-origem')).toBe('');
    expect(el.definirFeicoes('c', [ponto]).aceitas).toBe(1);
    el.aceitarOrigem = false;
    expect(el.hasAttribute('aceitar-origem')).toBe(false);
    expect(el.definirFeicoes('c', [ponto]).aceitas).toBe(0);
    el.setAttribute('aceitar-origem', 'false'); // "false" explícito desliga, como em `crosshair`
    expect(el.aceitarOrigem).toBe(false);
    expect(el.definirFeicoes('c', [ponto]).aceitas).toBe(0);
  });

  it('o cursor remoto também respeita a opção', () => {
    const el = montar();
    el.inicializarAgora();
    expect(el.atualizarCursorRemoto({ id: 'u', nome: 'U', cor: '#ff0000' }, [0, 0])).toBe(false);
    el.aceitarOrigem = true;
    expect(el.atualizarCursorRemoto({ id: 'u', nome: 'U', cor: '#ff0000' }, [0, 0])).toBe(true);
  });
});
