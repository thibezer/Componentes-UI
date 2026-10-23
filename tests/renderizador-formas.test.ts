// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PintorCanvas2D, parseDash, type ContextoFormas2D, type SuperficiePintura } from '../src/gerencigeo-canvas/renderers/renderizador_formas';
import { MotorFormas } from '../src/gerencigeo-canvas/motor/motor-formas';
import { projetarMercator } from '../src/gerencigeo-canvas/feature_lod';
import type { Feicao, LatLonPar } from '../src/gerencigeo-canvas/feature_types';
import type { CamadaDesenho, ItemDesenho, ListaDesenho, Vista } from '../src/gerencigeo-canvas/motor/tipos';
import type { EstiloVetor } from '../src/gerencigeo-canvas/motor/estilo';

/*
 * Fase 3: lógica de pintura testada com um contexto 2D FALSO que grava as chamadas (ordem, estilos, globalAlpha,
 * número de fill/stroke). O ambiente de teste não tem Canvas 2D real e não se promete comparação de pixels.
 */

type Chamada = [string, ...unknown[]];

function ctxFalso() {
  const chamadas: Chamada[] = [];
  const estado = { fillStyle: '', strokeStyle: '', lineWidth: 1, lineJoin: 'miter', lineCap: 'butt', globalAlpha: 1 };
  const reg = (nome: string) => (...a: unknown[]) => { chamadas.push([nome, ...a]); };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, k: string) {
      if (k in estado) return (estado as Record<string, unknown>)[k];
      return reg(k);
    },
    set(_, k: string, v) {
      (estado as Record<string, unknown>)[k] = v;
      chamadas.push([`set:${k}`, v]);
      return true;
    }
  }) as unknown as ContextoFormas2D;
  const n = (nome: string) => chamadas.filter(([c]) => c === nome).length;
  return { ctx, chamadas, n };
}

function alvos() {
  const porCamada = new Map<string, ReturnType<typeof ctxFalso>>();
  const sobre = ctxFalso();
  const sup = (f: ReturnType<typeof ctxFalso>, dpr = 1): SuperficiePintura => ({ ctx: f.ctx, largura: 800, altura: 600, dpr });
  return {
    porCamada, sobre,
    alvos: {
      camada: (id: string) => {
        if (!porCamada.has(id)) porCamada.set(id, ctxFalso());
        return sup(porCamada.get(id)!);
      },
      sobreposicao: () => sup(sobre)
    }
  };
}

const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((23.5 * Math.PI) / 180));
const quad = (id: string, lon: number, lado: number, extra: Partial<Feicao> = {}): Feicao => ({
  id, camadaId: 'c', propriedades: {},
  geometria: { tipo: 'Polygon', aneis: [[[-23.5, lon], [-23.5, lon + lado * mLon], [-23.5 + lado * mLat, lon + lado * mLon], [-23.5 + lado * mLat, lon]]] },
  ...extra
});

function vista(zoom: number, dpr = 1): Vista {
  const c = projetarMercator(-23.5, -46.6, zoom);
  const e = 256 * 2 ** zoom;
  const lon = (x: number) => (x / e) * 360 - 180;
  const lat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / e))) * 180) / Math.PI;
  return {
    zoom, larguraPx: 800, alturaPx: 600, dpr, origemPx: { x: c.x - 400, y: c.y - 300 },
    caixa: { minLon: lon(c.x - 400), maxLon: lon(c.x + 400), maxLat: lat(c.y - 300), minLat: lat(c.y + 300) }
  };
}

function lista(feicoes: Feicao[], zoom = 14, estilo = { corPrimaria: '#ff0000' }, dpr = 1) {
  const m = new MotorFormas();
  m.definirCamada({ id: 'c', zIndex: 1, opacidade: 1, visivel: true, interativo: true, estilo });
  m.definirFeicoes('c', feicoes);
  const v = vista(zoom, dpr);
  return { m, v, l: m.listaDesenho(v) };
}

describe('pintura em lote por estilo', () => {
  it('100 polígonos com o mesmo estilo: o estilo é definido UMA vez e cada forma é um caminho próprio (nada de caminho gigante)', () => {
    const { l, v } = lista(Array.from({ length: 100 }, (_, i) => quad(`q${i}`, -46.6 + i * 1e-4, 80)));
    const a = alvos();
    const p = new PintorCanvas2D(a.alvos);
    const est = p.desenhar(l, v);
    const c = a.porCamada.get('c')!;
    expect(est.tracos).toBe(100);
    expect(c.n('stroke')).toBe(100);
    expect(c.n('beginPath')).toBe(100); // um caminho por forma: milhares de subcaminhos num só são patológicos no Canvas 2D
    expect(c.chamadas.filter(([k]) => k === 'set:strokeStyle')).toHaveLength(1);
    expect(c.chamadas.filter(([k]) => k === 'set:lineWidth')).toHaveLength(1);
  });

  it('preenchimento: forma a forma, com o alfa do estilo (translúcido escurece nas sobreposições; opaco não precisa de alfa)', () => {
    const translucido = lista(Array.from({ length: 10 }, (_, i) => quad(`q${i}`, -46.6 + i * 1e-4, 80))).l;
    const a1 = alvos();
    new PintorCanvas2D(a1.alvos).desenhar(translucido, vista(14));
    expect(a1.porCamada.get('c')!.n('fill')).toBe(10);
    expect(a1.porCamada.get('c')!.chamadas.filter(([k]) => k === 'set:fillStyle')).toHaveLength(1);

    const opaco = lista(Array.from({ length: 10 }, (_, i) => quad(`q${i}`, -46.6 + i * 1e-4, 80, { estilo: { opacidadePreenchimento: 1 } }))).l;
    const a2 = alvos();
    new PintorCanvas2D(a2.alvos).desenhar(opaco, vista(14));
    expect(a2.porCamada.get('c')!.n('fill')).toBe(10);
  });

  it('o alfa do preenchimento sai do estilo (0,2 em área) e volta a 1 para o traço', () => {
    const { l, v } = lista([quad('a', -46.6, 80)]);
    const a = alvos();
    new PintorCanvas2D(a.alvos).desenhar(l, v);
    const seq = a.porCamada.get('c')!.chamadas.filter(([k]) => k === 'set:globalAlpha').map(([, v2]) => v2);
    expect(seq[0]).toBeCloseTo(0.2);
    expect(seq).toContain(1);
    expect(seq[seq.length - 1]).toBe(1);
  });

  it('estilos diferentes viram grupos diferentes, cada um com a sua cor e espessura', () => {
    const { l, v } = lista([
      quad('a', -46.6, 80, { estilo: { corTraco: '#00ff00', espessuraTraco: 4 } }),
      quad('b', -46.599, 80, { estilo: { corTraco: '#0000ff', espessuraTraco: 1 } })
    ]);
    const a = alvos();
    new PintorCanvas2D(a.alvos).desenhar(l, v);
    const c = a.porCamada.get('c')!;
    expect(c.chamadas.filter(([k]) => k === 'set:strokeStyle').map(([, x]) => x).sort()).toEqual(['#0000ff', '#00ff00']);
    expect(c.chamadas.filter(([k]) => k === 'set:lineWidth').map(([, x]) => x).sort()).toEqual([1, 4]);
  });

  it('traço tracejado (prévia) configura setLineDash; `espessuraContorno: 0` em ponto não traça', () => {
    const previa = lista([quad('p', -46.6, 80, { status: 'previa' })]);
    const a = alvos();
    new PintorCanvas2D(a.alvos).desenhar(previa.l, previa.v);
    expect(a.porCamada.get('c')!.chamadas.filter(([k]) => k === 'setLineDash').some(([, d]) => (d as number[]).join() === '6,4')).toBe(true);
    const pt = lista([{ id: 'p', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] as LatLonPar }, estilo: { espessuraContorno: 0 } }]);
    const b = alvos();
    new PintorCanvas2D(b.alvos).desenhar(pt.l, pt.v);
    expect(b.porCamada.get('c')!.n('stroke')).toBe(0);
    expect(b.porCamada.get('c')!.n('fill')).toBe(1);
  });

  it('parseDash: "6 4", "6,4", ímpar duplica, lixo vira linha contínua', () => {
    expect(parseDash('6 4')).toEqual([6, 4]);
    expect(parseDash('6,4')).toEqual([6, 4]);
    expect(parseDash('5')).toEqual([5, 5]);
    expect(parseDash('a b')).toEqual([]);
    expect(parseDash('0 0')).toEqual([]);
    expect(parseDash(undefined)).toEqual([]);
  });
});

describe('recorte (pan incremental)', () => {
  it('com `recorte` pinta só dentro da região (save, rect, clip, restore) e não limpa o canvas', () => {
    const { l, v } = lista([quad('a', -46.6, 600)]);
    const a = alvos();
    new PintorCanvas2D(a.alvos).desenhar(l, v, { limpar: false, recorte: { x: 700, y: 0, largura: 100, altura: 600 } });
    const c = a.porCamada.get('c')!;
    expect(c.n('clearRect')).toBe(0);
    const nomes = c.chamadas.map(([k]) => k).filter((k) => ['save', 'rect', 'clip', 'restore', 'stroke'].includes(k));
    expect(nomes.slice(0, 3)).toEqual(['save', 'rect', 'clip']);
    expect(nomes[nomes.length - 1]).toBe('restore');
    expect(c.chamadas.find(([k]) => k === 'rect')).toEqual(['rect', 700, 0, 100, 600]);
  });

  it('o recorte é desfeito mesmo se a pintura lançar', () => {
    const { l, v } = lista([quad('a', -46.6, 600)]);
    const a = alvos();
    const ctx = a.porCamada.get('c') ?? (a.alvos.camada('c'), a.porCamada.get('c')!);
    const original = ctx.ctx.stroke;
    (ctx.ctx as unknown as { stroke: () => void }).stroke = () => { throw new Error('boom'); };
    expect(() => new PintorCanvas2D(a.alvos).desenhar(l, v, { limpar: false, recorte: { x: 0, y: 0, largura: 10, altura: 10 } })).toThrow('boom');
    expect(ctx.n('restore')).toBe(1);
    (ctx.ctx as unknown as { stroke: unknown }).stroke = original;
  });
});

describe('marcas de LOD', () => {
  it('um fillRect por marca e a cor definida UMA vez por grupo (lote por cor)', () => {
    const { l, v } = lista(Array.from({ length: 200 }, (_, i) => quad(`q${i}`, -46.6 + i * 1e-4, 30, { estilo: { corTraco: i % 2 ? '#ff0000' : '#00ff00' } })), 12);
    const a = alvos();
    const est = new PintorCanvas2D(a.alvos).desenhar(l, v);
    const c = a.porCamada.get('c')!;
    expect(est.marcas).toBe(200);
    expect(c.n('fillRect')).toBe(200);
    expect(c.chamadas.filter(([k]) => k === 'set:fillStyle')).toHaveLength(2);
    expect(c.n('stroke')).toBe(0);
  });

  it('o fillRect cai na posição projetada menos a origem, com lado de 1–2 px', () => {
    const { l, v } = lista([quad('a', -46.6, 30)], 12);
    const a = alvos();
    new PintorCanvas2D(a.alvos).desenhar(l, v);
    const [, x, y, w, h] = a.porCamada.get('c')!.chamadas.find(([k]) => k === 'fillRect')!;
    expect(Number(x)).toBeGreaterThan(300);
    expect(Number(x)).toBeLessThan(500);
    expect(Number(y)).toBeGreaterThan(200);
    expect([1, 2]).toContain(w);
    expect(w).toBe(h);
  });
});

describe('origem, DPR e ordem', () => {
  it('subtrai a origem em dupla precisão: nenhuma coordenada vai ao canvas em pixels de mundo', () => {
    const { l, v } = lista([quad('a', -46.6, 600)], 20);
    const a = alvos();
    new PintorCanvas2D(a.alvos).desenhar(l, v);
    const coords = a.porCamada.get('c')!.chamadas.filter(([k]) => k === 'moveTo' || k === 'lineTo').flatMap(([, x, y]) => [Number(x), Number(y)]);
    expect(coords.length).toBeGreaterThan(0);
    expect(Math.max(...coords.map(Math.abs))).toBeLessThan(5000); // a 2^28 px de mundo, sem subtrair daria ~3e8
  });

  it('DPR por setTransform e limpeza do canvas inteiro em px de dispositivo', () => {
    const { l, v } = lista([quad('a', -46.6, 80)], 14, { corPrimaria: '#f00' }, 2);
    const a = alvos();
    new PintorCanvas2D(a.alvos).desenhar(l, v);
    const c = a.porCamada.get('c')!.chamadas;
    expect(c.find(([k]) => k === 'clearRect')).toEqual(['clearRect', 0, 0, 1600, 1200]);
    expect(c.filter(([k]) => k === 'setTransform').pop()).toEqual(['setTransform', 2, 0, 0, 2, 0, 0]);
  });

  it('marcas < áreas < linhas < pontos; DOM e curvas não vão ao canvas', () => {
    const itens: Feicao[] = [
      { id: 'pt', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Point', coordenada: [-23.5, -46.6] as LatLonPar } },
      { id: 'ln', camadaId: 'c', propriedades: {}, geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.59]] as LatLonPar[] } },
      quad('mini', -46.6, 10), quad('area', -46.6, 600),
      { id: 'tx', camadaId: 'c', propriedades: {}, geometria: { tipo: 'Text', coordenada: [-23.5, -46.6] as LatLonPar, texto: 'x' } }
    ];
    const { l, v } = lista(itens, 12);
    const a = alvos();
    new PintorCanvas2D(a.alvos).desenhar(l, v);
    const ordem = a.porCamada.get('c')!.chamadas.map(([k]) => k).filter((k) => ['fillRect', 'fill', 'stroke', 'arc'].includes(k));
    expect(ordem[0]).toBe('fillRect'); // marca primeiro
    expect(ordem.indexOf('arc')).toBeGreaterThan(ordem.lastIndexOf('fillRect')); // ponto depois
  });

  it('uma camada tem o seu canvas: cada camada da lista pinta na própria superfície', () => {
    const m = new MotorFormas();
    for (const id of ['a', 'b']) {
      m.definirCamada({ id, zIndex: id === 'a' ? 1 : 2, opacidade: 1, visivel: true, interativo: true, estilo: {} });
      m.definirFeicoes(id, [{ ...quad('x', -46.6, 600), camadaId: id }]);
    }
    const v = vista(14);
    const a = alvos();
    new PintorCanvas2D(a.alvos).desenhar(m.listaDesenho(v), v);
    expect([...a.porCamada.keys()].sort()).toEqual(['a', 'b']);
    expect(a.porCamada.get('a')!.n('stroke')).toBe(1);
    expect(a.porCamada.get('b')!.n('stroke')).toBe(1);
  });
});

describe('sobreposição: seleção, destaque e edição', () => {
  it('limpa uma vez e pinta as selecionadas com o estilo de seleção; destacar põe um halo por baixo', () => {
    const { m, v } = lista([quad('a', -46.6, 600), quad('b', -46.598, 600)]);
    m.selecionar('c', ['a', 'b']);
    const sobre = m.listaSobreposicao('c', v)!;
    const l: ListaDesenho = { vista: v, origem: v.origemPx!, camadas: [sobre] };
    const a = alvos();
    const p = new PintorCanvas2D(a.alvos);
    p.desenhar(l, v, { alvo: 'sobreposicao' });
    const c = a.sobre;
    expect(c.n('clearRect')).toBe(1);
    expect(c.chamadas.filter(([k]) => k === 'set:strokeStyle').map(([, x]) => x)).toEqual(['#38bdf8']); // um grupo, cor de seleção
    const antesHalo = c.n('stroke');
    p.destacar(['a']);
    const b = alvos();
    new PintorCanvas2D(b.alvos);
    const p2 = new PintorCanvas2D(b.alvos);
    p2.destacar(['a']);
    p2.desenhar(l, v, { alvo: 'sobreposicao' });
    expect(b.sobre.n('stroke')).toBe(antesHalo + 1);
    expect(b.sobre.chamadas.some(([k, x]) => k === 'set:strokeStyle' && String(x).startsWith('rgba(255,255,255'))).toBe(true);
  });

  it('limpar() esvazia a sobreposição; depois de destruir não pinta mais nada', () => {
    const { l, v } = lista([quad('a', -46.6, 600)]);
    const a = alvos();
    const p = new PintorCanvas2D(a.alvos);
    p.limpar();
    expect(a.sobre.n('clearRect')).toBe(1);
    p.destruir();
    const est = p.desenhar(l, v);
    expect(est.itens).toBe(0);
    expect(a.porCamada.size).toBe(0);
  });
});

describe('entrada hostil (Regra #0)', () => {
  const estilo: EstiloVetor = { cor: '#f00', traco: true, peso: 2, dash: undefined, preencher: true, corPreenchimento: '#f00', opacidadePreenchimento: 0.2 };
  const item = (forma: ItemDesenho['forma'], g: number[][], raioPx = 5): ItemDesenho => ({
    camadaId: 'c', id: forma, forma, geometriaEmPx: g.map((x) => Float64Array.from(x)), raioPx, estilo, selecionada: false
  });

  it('NaN, Infinity, anéis vazios, raio inválido e lista vazia não lançam', () => {
    const camada: CamadaDesenho = {
      camadaId: 'c', zIndex: 1, opacidade: 1,
      estatisticas: { total: 0, desenhadas: 0, marcasLOD: 0, clusters: 0, marcadoresDom: 0, avaliacoesLOD: 0 },
      itens: [
        item('poligono', [[NaN, NaN, Infinity, 1, 2, 3]]), item('poligono', [[]]), item('poligono', []), item('linha', [[1, 2]]),
        item('circulo', [[1, 2]], NaN), item('circulo', [[NaN, 2]], 5), item('ponto', [[Infinity, 1]], 3), item('marca', [[NaN, NaN]], 2),
        item('marca', []), item('ponto', [[1, 2]], Infinity)
      ]
    };
    const v = vista(14);
    const a = alvos();
    expect(() => new PintorCanvas2D(a.alvos).desenhar({ vista: v, origem: { x: 0, y: 0 }, camadas: [camada] }, v)).not.toThrow();
    expect(() => new PintorCanvas2D(a.alvos).desenhar({ vista: v, origem: { x: 0, y: 0 }, camadas: [] }, v)).not.toThrow();
    expect(() => new PintorCanvas2D(a.alvos).desenhar(null as unknown as ListaDesenho, v)).not.toThrow();
    expect(() => new PintorCanvas2D({ camada: () => null, sobreposicao: () => null }).desenhar({ vista: v, origem: { x: 0, y: 0 }, camadas: [camada] }, v, { alvo: 'sobreposicao' })).not.toThrow();
  });

  it('DPR inválido cai em 1', () => {
    const { l, v } = lista([quad('a', -46.6, 80)]);
    const a = alvos();
    new PintorCanvas2D(a.alvos).desenhar(l, { ...v, dpr: NaN });
    expect(a.porCamada.get('c')!.chamadas.filter(([k]) => k === 'setTransform').pop()).toEqual(['setTransform', 1, 0, 0, 1, 0, 0]);
  });
});
