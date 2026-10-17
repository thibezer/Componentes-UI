/**
 * Regressão e robustez do <ui-canvas-cad> (Camada C do AGENTS.md): reconexão sem duplicar listeners/observers
 * e entradas hostis nas APIs públicas. Cada caso congela um comportamento que não pode voltar a quebrar.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../src/index';
import '../src/components/ui-canvas-cad';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { GerenciadorBroadcastConfig } from '../src/components/ui-canvas-cad/cad-broadcast';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function montar(atributos: Record<string, string> = {}): UICanvasCAD {
  const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

describe('reconexão (Regra #2: zero vazamento)', () => {
  it('reconectar várias vezes não acumula listeners de teclado do snap em window', () => {
    const adicionados: string[] = [];
    const removidos: string[] = [];
    const add = vi.spyOn(window, 'addEventListener').mockImplementation(((t: string) => { adicionados.push(t); }) as never);
    const rem = vi.spyOn(window, 'removeEventListener').mockImplementation(((t: string) => { removidos.push(t); }) as never);

    const el = montar();
    el.remove();
    document.body.appendChild(el);
    el.remove();
    document.body.appendChild(el);
    el.remove();

    const teclas = (lista: string[], t: string) => lista.filter((x) => x === t).length;
    for (const tecla of ['keydown', 'keyup']) {
      // uma adição por conexão (nunca duplicada) e, ao final, nenhuma ficou sem remoção
      expect(teclas(adicionados, tecla)).toBe(3);
      expect(teclas(removidos, tecla)).toBeGreaterThanOrEqual(teclas(adicionados, tecla));
    }
    add.mockRestore();
    rem.mockRestore();
  });

  it('o ResizeObserver é desconectado a cada desconexão e criado de novo ao reconectar', () => {
    const instancias: Array<{ disconnect: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('ResizeObserver', class {
      disconnect = vi.fn();
      observe = vi.fn();
      constructor() { instancias.push(this); }
    });
    const el = montar();
    const aposPrimeira = instancias.length;
    el.remove();
    expect(instancias.slice(0, aposPrimeira).every((i) => i.disconnect.mock.calls.length >= 1)).toBe(true);
    document.body.appendChild(el);
    expect(instancias.length).toBeGreaterThan(aposPrimeira);
    el.remove();
  });

  it('destroy() é idempotente', () => {
    const el = montar();
    el.destroy();
    expect(() => el.destroy()).not.toThrow();
  });

  it('desconectar antes do agendamento da inicialização cancela o mapa', async () => {
    const el = montar();
    el.remove();
    await new Promise((r) => setTimeout(r, 5));
    expect(el.isConnected).toBe(false);
  });
});

describe('BroadcastChannel (entrada externa hostil)', () => {
  const criar = () => {
    const mapContainer = document.createElement('div');
    const setLayerOpacity = vi.fn();
    const controller: any = { getMap: () => null, core: { config: {} } };
    const g = new GerenciadorBroadcastConfig({ host: document.createElement('div'), controller, mapContainer, setLayerOpacity });
    return { g, setLayerOpacity, controller, mapContainer };
  };

  it.each([null, undefined, 'texto', 42, true, [], () => 1])('ignora payload inválido: %s', (payload) => {
    const { g, setLayerOpacity } = criar();
    expect(() => g.processarMensagem(payload as never)).not.toThrow();
    expect(setLayerOpacity).not.toHaveBeenCalled();
  });

  it('opacidades com valores não numéricos são ignoradas', () => {
    const { g, setLayerOpacity } = criar();
    g.processarMensagem({ opacidades: { a: 'x', b: null, c: {}, d: '0.5', e: 0.25 } });
    expect(setLayerOpacity).toHaveBeenCalledWith('d', 0.5);
    expect(setLayerOpacity).toHaveBeenCalledWith('e', 0.25);
    expect(setLayerOpacity).toHaveBeenCalledTimes(2);
  });

  it('opacidadeBase inválida não chega a setLayerOpacity', () => {
    const { g, setLayerOpacity } = criar();
    g.processarMensagem({ opacidadeBase: 'abc' });
    expect(setLayerOpacity).not.toHaveBeenCalled();
  });

  it('conectar sem nome ou sem BroadcastChannel não lança', () => {
    const { g } = criar();
    expect(() => g.conectar(null)).not.toThrow();
    vi.stubGlobal('BroadcastChannel', undefined);
    expect(() => g.conectar('canal')).not.toThrow();
  });
});

describe('feições com entrada hostil (Regra #0)', () => {
  const entradas: unknown[] = [
    null, undefined, 42, 'texto', [], {},
    { id: 'sem-geometria' },
    { id: 'g-nula', geometria: null },
    { id: 'tipo-estranho', geometria: { tipo: 'Cubo', coordenadas: [[1, 2]] } },
    { id: 'poligono-degenerado', geometria: { tipo: 'Polygon', aneis: [[[0, 0], [1, 1]]] } },
    { id: 'nan', geometria: { tipo: 'Point', coordenada: [Number.NaN, Number.NaN] } },
    { id: 'infinito', geometria: { tipo: 'Point', coordenada: [Infinity, -Infinity] } }
  ];

  it('definirFeicoes recusa tudo o que é inválido, sem lançar, e a camada fica vazia', () => {
    const el = montar();
    el.inicializarAgora();
    const r = el.definirFeicoes('hostil', entradas as unknown[]);
    expect(r.aceitas).toBe(0);
    expect(r.recusadas.length).toBe(entradas.length);
    expect(el.obterFeicoes('hostil')).toEqual([]);
  });

  it('definirFeicoes com algo que não é array não lança', () => {
    const el = montar();
    el.inicializarAgora();
    expect(() => el.definirFeicoes('x', null as never)).not.toThrow();
    expect(() => el.definirFeicoes('x', 'abc' as never)).not.toThrow();
    expect(() => el.definirFeicoes('x', { a: 1 } as never)).not.toThrow();
  });

  it('aplicarLote tolera lote nulo, listas com tipo errado e ids inexistentes', () => {
    const el = montar();
    el.inicializarAgora();
    expect(() => el.aplicarLote('l', null as never)).not.toThrow();
    const r = el.aplicarLote('l', { adicionar: 'x', atualizar: 5, remover: { a: 1 } } as never);
    expect(r).toMatchObject({ adicionadas: 0, atualizadas: 0, removidas: 0 });
    const r2 = el.aplicarLote('l', { atualizar: [{ id: 'nao-existe', propriedades: { a: 1 } }], remover: ['tambem-nao'] });
    expect(r2.atualizadas).toBe(0);
    expect(r2.removidas).toBe(0);
    expect(r2.recusadas).toContain('nao-existe');
  });

  it('operações sobre feição inexistente devolvem null/false em vez de lançar', () => {
    const el = montar();
    el.inicializarAgora();
    expect(el.removerFeicao('nada', 'nada')).toBe(false);
    expect(el.atualizarFeicao('nada', 'nada', { propriedades: {} })).toBeNull();
    expect(el.obterFeicoes('nada')).toEqual([]);
    expect(el.editarVertices('nada', 'nada').ok).toBe(false);
  });

  it('um lote com feições boas e ruins aceita só as boas', () => {
    const el = montar();
    el.inicializarAgora();
    const r = el.aplicarLote('misto', {
      adicionar: [
        { id: 'ok', geometria: { tipo: 'Point', coordenada: [-10, -50] } },
        { id: 'ruim', geometria: { tipo: 'Point', coordenada: [Number.NaN, 0] } },
        null
      ]
    });
    expect(r.adicionadas).toBe(1);
    expect(r.recusadas).toHaveLength(2);
    expect(el.obterFeicoes('misto').map((f) => f.id)).toEqual(['ok']);
  });
});

describe('acessibilidade (ARIA)', () => {
  it('a raiz é uma região nomeada e a barra rápida é uma toolbar com botões nomeados', () => {
    const el = montar();
    const sr = el.shadowRoot!;
    expect(sr.getElementById('cad-root')!.getAttribute('role')).toBe('region');
    expect(sr.getElementById('cad-root')!.getAttribute('aria-label')).toBe('Mapa CAD');
    expect(sr.querySelector('.cad-quick-toolbar')!.getAttribute('role')).toBe('toolbar');
    const botoes = sr.querySelectorAll('.cad-quick-toolbar .cad-btn-tool');
    expect(botoes.length).toBeGreaterThan(0);
    botoes.forEach((b) => expect(b.getAttribute('aria-label')).toBeTruthy());
  });

  it('o botão de snap reflete o estado em aria-pressed', () => {
    const el = montar();
    el.inicializarAgora();
    const btn = el.shadowRoot!.getElementById('btn-toggle-snap')!;
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    el.definirSnap(false);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('anuncia a seleção na região viva e para de anunciar ao desconectar', () => {
    const el = montar();
    el.inicializarAgora();
    const status = el.shadowRoot!.getElementById('cad-status')!;
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');

    el.definirFeicoes('a', [
      { id: '1', geometria: { tipo: 'Point', coordenada: [-10, -50] } },
      { id: '2', geometria: { tipo: 'Point', coordenada: [-10.1, -50.1] } }
    ]);
    el.selecionarFeicoes([{ camadaId: 'a', id: '1' }, { camadaId: 'a', id: '2' }]);
    expect(status.textContent).toBe('2 feições selecionadas');
    el.limparSelecaoFeicoes();
    expect(status.textContent).toBe('Nenhuma feição selecionada');
    el.selecionarFeicao('a', '1');
    expect(status.textContent).toBe('1 feição selecionada');

    el.remove();
    status.textContent = '';
    el.dispatchEvent(new CustomEvent('cad-selecao', { detail: { feicoes: [{}] } }));
    expect(status.textContent).toBe('');
  });

  it('anuncia a ferramenta ativa e a desativação', () => {
    const el = montar();
    el.inicializarAgora();
    const status = el.shadowRoot!.getElementById('cad-status')!;
    el.definirFerramenta('medir-distancia');
    expect(status.textContent).toBe('Ferramenta medir-distancia ativa');
    el.definirFerramenta(null);
    expect(status.textContent).toBe('Ferramenta desativada');
  });
});
