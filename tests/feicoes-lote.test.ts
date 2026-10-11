import { describe, it, expect, afterEach, vi } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import type { FeicoesLayerRenderer } from '../src/gerencigeo-canvas/renderers/feicoes_renderer';
import { LayerRendererFactory } from '../src/gerencigeo-canvas/layer_renderer_factory';
import { RegraVersoes } from '../src/gerencigeo-canvas/feature_versoes';

afterEach(() => { document.body.innerHTML = ''; });

function novo(zoom = 16) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom });
  const lm = new CanvasLayerManager([]);
  const eventos: Array<[string, any]> = [];
  const regra = new RegraVersoes();
  const g = new GerenciadorFeicoes({ obterLayerManager: () => lm, obterMapa: () => map, regra, emitir: (e, d) => eventos.push([e, d]) });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined, regraVersoes: regra } as never);
  const ev = (nome: string) => eventos.filter(([e]) => e === nome).map(([, d]) => d);
  return { g, lm, map, ev };
}

const pt = (id: string, lat = -23.5, lon = -46.6, extra: Record<string, unknown> = {}) =>
  ({ id, geometria: { tipo: 'Point', coordenada: [lat, lon] }, ...extra });
const ids = (g: GerenciadorFeicoes, camada = 'c') => g.obterFeicoes(camada).map((f) => f.id);

describe('aplicarLote: resultado e uma só regravação', () => {
  it('conta adicionadas, atualizadas, removidas e recusadas', () => {
    const { g } = novo();
    g.definirFeicoes('c', [pt('a'), pt('b'), pt('c')]);
    const r = g.aplicarLote('c', {
      remover: ['a', 'nao-existe'],
      atualizar: [{ id: 'b', propriedades: { x: 1 } }, { id: 'fantasma', propriedades: { x: 1 } }],
      adicionar: [pt('d'), { id: 'ruim', geometria: { tipo: 'Point', coordenada: ['x', 'y'] } }, { sem: 'id' }]
    });
    expect(r).toEqual({ adicionadas: 1, atualizadas: 1, removidas: 1, recusadas: ['fantasma', 'ruim', '#2'] });
    expect(ids(g)).toEqual(['b', 'c', 'd']);
    expect(g.obterFeicoes('c')[0].propriedades).toEqual({ x: 1 });
  });

  it('regrava a camada uma única vez e roda o aposDados uma única vez', () => {
    const { g, lm } = novo();
    g.definirFeicoes('c', Array.from({ length: 50 }, (_, i) => pt(`p${i}`, -23.5 + i * 1e-4)));
    const spy = vi.spyOn(lm, 'setLayerData');
    const apos = vi.spyOn(g as unknown as { aposDados: () => void }, 'aposDados');
    g.aplicarLote('c', {
      remover: ['p0', 'p1'],
      atualizar: [{ id: 'p2', propriedades: { k: 1 } }, { id: 'p3', propriedades: { k: 2 } }],
      adicionar: [pt('n1'), pt('n2'), pt('n3')]
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(apos).toHaveBeenCalledTimes(1);
  });

  it('lote vazio ou só de itens inválidos não regrava nem cria camada', () => {
    const { g, lm } = novo();
    const spy = vi.spyOn(lm, 'setLayerData');
    expect(g.aplicarLote('nova', {})).toEqual({ adicionadas: 0, atualizadas: 0, removidas: 0, recusadas: [] });
    expect(g.aplicarLote('nova', { adicionar: [{ id: 'x', geometria: { tipo: 'Point', coordenada: [] } }] }).recusadas).toEqual(['x']);
    expect(lm.getLayerDef('nova')).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it('cria a camada quando entra algo válido; recusa camada que não é de feições', () => {
    const { g, lm } = novo();
    expect(g.aplicarLote('nova', { adicionar: [pt('a')] }, { nome: 'Nova' }).adicionadas).toBe(1);
    expect(lm.getLayerDef('nova')?.nome).toBe('Nova');
    const outro = new CanvasLayerManager();
    const g2 = new GerenciadorFeicoes({ obterLayerManager: () => outro, obterMapa: () => null, emitir: () => undefined });
    expect(g2.aplicarLote('perimetro', { adicionar: [pt('a')], atualizar: [{ id: 'z' }] }).recusadas).toEqual(['z', 'a']);
  });

  it('as operações unitárias seguem valendo (e passam pelo mesmo caminho)', () => {
    const { g } = novo();
    expect(g.adicionarFeicao('c', pt('a'))?.id).toBe('a');
    expect(g.adicionarFeicao('c', { id: 'ruim' })).toBeNull();
    expect(g.atualizarFeicao('c', 'a', { propriedades: { n: 1 } })?.propriedades).toEqual({ n: 1 });
    expect(g.atualizarFeicao('c', 'nada', {})).toBeNull();
    expect(g.removerFeicao('c', 'a')).toBe(true);
    expect(g.removerFeicao('c', 'a')).toBe(false);
  });
});

describe('ordem das feições', () => {
  it('adicionarFeicao com id existente substitui mantendo a posição', () => {
    const { g } = novo();
    g.definirFeicoes('c', [pt('a'), pt('b'), pt('c')]);
    g.adicionarFeicao('c', pt('a', -23.6, -46.7, { propriedades: { novo: true } }));
    expect(ids(g)).toEqual(['a', 'b', 'c']);
    const a = g.obterFeicoes('c')[0];
    expect(a.propriedades).toEqual({ novo: true });
    expect(a.geometria).toEqual({ tipo: 'Point', coordenada: [-23.6, -46.7] });
  });

  it('o lote também mantém a posição de quem é substituído e põe os novos no fim, em ordem', () => {
    const { g } = novo();
    g.definirFeicoes('c', [pt('a'), pt('b'), pt('c')]);
    g.aplicarLote('c', { adicionar: [pt('n1'), pt('b'), pt('n2')] });
    expect(ids(g)).toEqual(['a', 'b', 'c', 'n1', 'n2']);
  });

  it('remover e readicionar no mesmo lote manda a feição para o fim (é uma feição nova)', () => {
    const { g } = novo();
    g.definirFeicoes('c', [pt('a'), pt('b'), pt('c')]);
    g.aplicarLote('c', { remover: ['a'], adicionar: [pt('a')] });
    expect(ids(g)).toEqual(['b', 'c', 'a']);
  });

  it('atualizar não muda a posição', () => {
    const { g } = novo();
    g.definirFeicoes('c', [pt('a'), pt('b'), pt('c')]);
    g.atualizarFeicao('c', 'a', { propriedades: { x: 1 } });
    expect(ids(g)).toEqual(['a', 'b', 'c']);
  });

  it('a posição continua certa depois de remoções (índice refeito sob demanda)', () => {
    const { g } = novo();
    g.definirFeicoes('c', [pt('a'), pt('b'), pt('c'), pt('d')]);
    g.removerFeicao('c', 'a');
    g.atualizarFeicao('c', 'd', { propriedades: { x: 1 } });
    g.adicionarFeicao('c', pt('b', -23.7, -46.7));
    expect(ids(g)).toEqual(['b', 'c', 'd']);
    expect(g.obterFeicoes('c')[2].propriedades).toEqual({ x: 1 });
    expect(g.buscar('c', 'c')?.id).toBe('c');
    expect(g.buscar('c', 'a')).toBeUndefined();
  });
});

describe('substituirPropriedades', () => {
  const base = () => pt('a', -23.5, -46.6, { propriedades: { nome: 'A', cor: 'x', apagado: 1 } });

  it('por padrão mescla: chaves que o consumidor apagou ficam para trás', () => {
    const { g } = novo();
    g.definirFeicoes('c', [base()]);
    const f = g.atualizarFeicao('c', 'a', { propriedades: { nome: 'B' } })!;
    expect(f.propriedades).toEqual({ nome: 'B', cor: 'x', apagado: 1 });
  });

  it('com substituirPropriedades troca o conjunto inteiro', () => {
    const { g } = novo();
    g.definirFeicoes('c', [base()]);
    const f = g.atualizarFeicao('c', 'a', { propriedades: { nome: 'B' } }, { substituirPropriedades: true })!;
    expect(f.propriedades).toEqual({ nome: 'B' });
    expect(g.obterFeicoes('c')[0].propriedades).toEqual({ nome: 'B' });
  });

  it('sem `propriedades` no item, a opção não apaga nada; propriedades vazias apagam tudo', () => {
    const { g } = novo();
    g.definirFeicoes('c', [base()]);
    expect(g.atualizarFeicao('c', 'a', { estilo: { corTraco: 'red' } }, { substituirPropriedades: true })!.propriedades).toEqual({ nome: 'A', cor: 'x', apagado: 1 });
    expect(g.atualizarFeicao('c', 'a', { propriedades: {} }, { substituirPropriedades: true })!.propriedades).toEqual({});
  });

  it('vale também no lote', () => {
    const { g } = novo();
    g.definirFeicoes('c', [base()]);
    g.aplicarLote('c', { atualizar: [{ id: 'a', propriedades: { so: 1 } }] }, { substituirPropriedades: true });
    expect(g.obterFeicoes('c')[0].propriedades).toEqual({ so: 1 });
  });
});

describe('consistência com seleção, popup e edição', () => {
  it('remover no lote tira a feição da seleção; atualizar mantém e reabre o popup com os dados novos', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [pt('a', -23.505, -46.595), pt('b', -23.506, -46.596)]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'a' }, { camadaId: 'c', id: 'b' }]);
    g.aplicarLote('c', { remover: ['a'], atualizar: [{ id: 'b', propriedades: { name: 'Novo' } }] });
    expect(g.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['b']);
    expect(g.obterFeicoesSelecionadas()[0].propriedades).toEqual({ name: 'Novo' });
    expect(ev('cad-selecao')[ev('cad-selecao').length - 1].feicoes.map((f: { id: string }) => f.id)).toEqual(['b']);
  });

  it('remover a feição em edição encerra a edição', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ id: 'l', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.51, -46.59]] } }]);
    expect(g.iniciarEdicao('c', 'l').ok).toBe(true);
    g.aplicarLote('c', { remover: ['l'] });
    expect(g.editando).toBe(false);
  });
});

/** Estado desenhado da camada, comparável entre caminhos: ids materializados e rótulos dos clusters. */
function foto(lm: CanvasLayerManager, camada = 'c'): string[] {
  const grupo = lm.getLayerInstance(camada) as L.LayerGroup;
  const linhas: string[] = [];
  grupo.eachLayer((l) => {
    if (l instanceof L.CircleMarker) {
      const { lat, lng } = l.getLatLng();
      linhas.push(`ponto:${lat.toFixed(6)},${lng.toFixed(6)}:${l.options.color}`);
    } else if (l instanceof L.Marker) {
      const html = String((l.options.icon as L.DivIcon).options.html ?? '');
      const n = />(\d+)</.exec(html)?.[1];
      const { lat, lng } = l.getLatLng();
      linhas.push(`marcador:${n ?? html.slice(0, 20)}:${lat.toFixed(5)},${lng.toFixed(5)}`);
    } else if (l instanceof L.Polyline) {
      linhas.push(`linha:${JSON.stringify(l.getLatLngs())}`);
    }
  });
  return linhas.sort();
}

function semente(n: number) {
  let s = n;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

describe('renderizador incremental = renderizador completo', () => {
  /** Aplica a mesma sequência de operações por lote e depois reconstrói a camada do zero com o resultado. */
  function comparar(zoom: number, inicial: number, rodadas: number, tipo: 'Point' | 'LineString', selecionar = false) {
    const r = semente(11 + zoom + inicial);
    const gerar = (id: string) => {
      const lat = -23.5 + (r() - 0.5) * 0.02;
      const lon = -46.6 + (r() - 0.5) * 0.02;
      return tipo === 'Point'
        ? pt(id, lat, lon)
        : { id, geometria: { tipo: 'LineString', coordenadas: [[lat, lon], [lat + 0.001, lon + 0.001]] } };
    };
    const a = novo(zoom);
    a.g.definirFeicoes('c', Array.from({ length: inicial }, (_, i) => gerar(`p${i}`)));
    let proximo = inicial;
    for (let k = 0; k < rodadas; k++) {
      const atuais = ids(a.g);
      const remover = Array.from({ length: 3 }, () => atuais[Math.floor(r() * atuais.length)]);
      const atualizar = Array.from({ length: 4 }, () => ({ ...gerar('x'), id: atuais[Math.floor(r() * atuais.length)] }));
      const adicionar = Array.from({ length: 5 }, () => gerar(`p${proximo++}`));
      a.g.aplicarLote('c', { remover, atualizar: atualizar.filter((u) => !remover.includes(u.id)), adicionar });
      if (selecionar && k % 3 === 0) {
        const s = ids(a.g).filter(() => r() < 0.1).map((id) => ({ camadaId: 'c', id }));
        a.g.selecionarFeicoes(s);
      }
    }
    const b = novo(zoom);
    b.g.definirFeicoes('c', a.g.obterFeicoes('c'));
    if (selecionar) b.g.selecionarFeicoes(a.g.obterFeicoesSelecionadas().map((f) => ({ camadaId: 'c', id: f.id })));
    return { a, b };
  }

  it('pontos sem cluster (zoom alto)', () => {
    const { a, b } = comparar(17, 120, 10, 'Point');
    expect(foto(a.lm)).toEqual(foto(b.lm));
  });

  it('pontos agrupados (clusters mantidos célula a célula)', () => {
    const { a, b } = comparar(13, 150, 12, 'Point');
    expect(foto(a.lm).some((l) => l.startsWith('marcador'))).toBe(true);
    expect(foto(a.lm)).toEqual(foto(b.lm));
  });

  it('pontos agrupados com seleção no meio das mudanças', () => {
    const { a, b } = comparar(13, 150, 12, 'Point', true);
    expect(foto(a.lm)).toEqual(foto(b.lm));
  });

  it('linhas acima do limite de culling (só a viewport é materializada)', () => {
    const { a, b } = comparar(15, 400, 8, 'LineString');
    const fa = foto(a.lm);
    expect(fa.length).toBeGreaterThan(0);
    expect(fa).toEqual(foto(b.lm));
  });

  it('cruzar o limite de culling com o lote cai no reconcile completo e continua certo', () => {
    const a = novo(16);
    a.g.definirFeicoes('c', Array.from({ length: 290 }, (_, i) => ({ id: `l${i}`, geometria: { tipo: 'LineString', coordenadas: [[-23.5 + i * 0.01, -46.6], [-23.5 + i * 0.01 + 0.001, -46.6]] } })));
    a.g.aplicarLote('c', { adicionar: Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, geometria: { tipo: 'LineString', coordenadas: [[-23.5 + i * 0.01, -46.61], [-23.5 + i * 0.01 + 0.001, -46.61]] } })) });
    const b = novo(16);
    b.g.definirFeicoes('c', a.g.obterFeicoes('c'));
    expect(foto(a.lm)).toEqual(foto(b.lm));
  });

  it('oficial × prévia: a entrada de uma oficial esconde a prévia da entidade', () => {
    const a = novo(17);
    a.g.definirFeicoes('c', [
      pt('prev', -23.5, -46.6, { status: 'previa', entidadeId: 'E' }),
      pt('solta', -23.51, -46.61)
    ]);
    expect(foto(a.lm)).toHaveLength(2);
    a.g.aplicarLote('c', { adicionar: [pt('ofic', -23.5, -46.6, { entidadeId: 'E' })] });
    expect(foto(a.lm)).toHaveLength(2); // prévia escondida; oficial + solta
    a.g.aplicarLote('c', { remover: ['ofic'] });
    expect(foto(a.lm)).toHaveLength(2); // prévia volta
    const b = novo(17);
    b.g.definirFeicoes('c', a.g.obterFeicoes('c'));
    expect(foto(a.lm)).toEqual(foto(b.lm));
  });

  it('consultas espaciais (snap, hover) enxergam o que o lote mudou', () => {
    const { g, lm } = novo(17);
    g.definirFeicoes('c', [pt('a', -23.5, -46.6)]);
    g.aplicarLote('c', { adicionar: [pt('b', -23.5001, -46.6001)], atualizar: [{ id: 'a', geometria: { tipo: 'Point', coordenada: [-23.4, -46.5] } }] });
    const renderer = LayerRendererFactory.get('feicoes') as FeicoesLayerRenderer;
    const inst = lm.getLayerInstance('c') as L.LayerGroup;
    const perto = renderer.consultarProximas(inst, { minLat: -23.51, maxLat: -23.49, minLon: -46.61, maxLon: -46.59 }).map((f) => f.id);
    expect(perto).toEqual(['b']);
    const longe = renderer.consultarProximas(inst, { minLat: -23.41, maxLat: -23.39, minLon: -46.51, maxLon: -46.49 }).map((f) => f.id);
    expect(longe).toEqual(['a']);
  });
});

describe('desempenho', () => {
  it('lote de 5 mil mudanças numa camada de 5 mil feições em menos de 1 s', () => {
    const { g } = novo(17);
    const r = semente(5);
    g.definirFeicoes('c', Array.from({ length: 5000 }, (_, i) => pt(`p${i}`, -23.5 + r() * 0.01, -46.6 + r() * 0.01)));
    const t0 = performance.now();
    const res = g.aplicarLote('c', {
      remover: Array.from({ length: 1000 }, (_, i) => `p${i}`),
      atualizar: Array.from({ length: 2000 }, (_, i) => ({ id: `p${1000 + i}`, propriedades: { v: i } })),
      adicionar: Array.from({ length: 2000 }, (_, i) => pt(`n${i}`, -23.5 + r() * 0.01, -46.6 + r() * 0.01))
    });
    const ms = performance.now() - t0;
    expect(res).toMatchObject({ adicionadas: 2000, atualizadas: 2000, removidas: 1000, recusadas: [] });
    expect(ids(g)).toHaveLength(6000);
    expect(ms).toBeLessThan(1000);
  });

  it('100 mil feições: uma edição custa pouco (não varre a camada)', () => {
    const { g } = novo(15);
    const r = semente(9);
    g.definirFeicoes('c', Array.from({ length: 100_000 }, (_, i) => ({
      id: `l${i}`,
      geometria: { tipo: 'LineString', coordenadas: [[-30 + r() * 20, -60 + r() * 20], [-30 + r() * 20, -60 + r() * 20]] }
    })));
    g.atualizarFeicao('c', 'l500', { propriedades: { aquecer: 1 } }); // primeira chamada monta o índice de posições
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) g.atualizarFeicao('c', 'l500', { propriedades: { i } });
    const porEdicao = (performance.now() - t0) / 20;
    // medido em ~1 ms; o limite é folgado para máquina lenta/CI (a varredura completa levava ~60-250 ms)
    expect(porEdicao).toBeLessThan(40);
    const t1 = performance.now();
    g.adicionarFeicao('c', { id: 'novo', geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] } });
    g.removerFeicao('c', 'novo');
    expect(performance.now() - t1).toBeLessThan(400);
  }, 60000);
});
