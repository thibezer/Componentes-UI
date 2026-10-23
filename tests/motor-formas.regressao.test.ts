// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { MotorFormas } from '../src/gerencigeo-canvas/motor/motor-formas';
import type { Feicao } from '../src/gerencigeo-canvas/feature_types';
import type { Vista } from '../src/gerencigeo-canvas/motor/tipos';

/* Regressões do motor de formas (Regra #0): cada teste falhava antes da correção. */

const vista: Vista = {
  zoom: 14, larguraPx: 800, alturaPx: 600, dpr: 1,
  caixa: { minLat: -23.6, maxLat: -23.4, minLon: -46.7, maxLon: -46.5 }
};
const ok = (id: string): Feicao => ({
  id, camadaId: 'c', propriedades: {},
  geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.599], [-23.501, -46.599], [-23.501, -46.6]]] }
});
const novo = () => {
  const m = new MotorFormas();
  m.definirCamada({ id: 'c', zIndex: 1, opacidade: 1, visivel: true, interativo: true, estilo: {} });
  return m;
};

describe('motor: feição sem geometria', () => {
  it('feição sem `geometria` (ou sem `tipo`) na lista não derruba a camada: é descartada e as válidas seguem', () => {
    const m = novo();
    const lixo = [{ id: 'sem-geo', camadaId: 'c', propriedades: {} }, { id: 'sem-tipo', camadaId: 'c', propriedades: {}, geometria: {} }, null, ok('boa')] as unknown as Feicao[];
    expect(() => m.definirFeicoes('c', lixo)).not.toThrow();
    expect(m.listaDesenho(vista).camadas[0].itens.map((i) => i.id)).toEqual(['boa']);
    expect(m.estatisticas('c')!.total).toBe(1);
  });

  it('o mesmo vale para o delta (mudadas com lixo)', () => {
    const m = novo();
    const base = [ok('a')];
    m.definirFeicoes('c', base);
    const mudadas = [{ id: 'x', camadaId: 'c', propriedades: {} }, null, ok('b')] as unknown as Feicao[];
    expect(() => m.aplicarDelta('c', [...base, ok('b')], { base, mudadas, removidas: ['nunca-existiu'] })).not.toThrow();
    expect(m.listaDesenho(vista).camadas[0].itens.map((i) => i.id).sort()).toEqual(['a', 'b']);
  });

  it('delta sem mudadas/removidas definidas não lança', () => {
    const m = novo();
    const base = [ok('a')];
    m.definirFeicoes('c', base);
    expect(() => m.aplicarDelta('c', base, { base } as never)).not.toThrow();
  });
});

describe('motor: ponto com ícone numa célula de cluster', () => {
  const icone = (i: number): Feicao => ({
    id: `i${i}`, camadaId: 'c', propriedades: {}, estilo: { icone: 'tower' }, geometria: { tipo: 'Point', coordenada: [-23.5 + i * 1e-6, -46.6] }
  });

  it('o selecionado (e o único restante da célula) continuam como marcador DOM: a sobreposição não desenha ícones', () => {
    const m = novo();
    m.definirFeicoes('c', Array.from({ length: 12 }, (_, i) => icone(i)));
    const doms = (): string[] => m.listaDesenho(vista, { parte: 'dom' }).camadas[0].itens.filter((i) => i.forma === 'icone').map((i) => i.id).sort();
    expect(doms()).toEqual([]); // todos dentro do cluster
    m.selecionar('c', ['i3']);
    expect(doms()).toEqual(['i3']); // selecionado nunca entra em cluster
    m.selecionar('c', Array.from({ length: 11 }, (_, i) => `i${i}`));
    expect(doms()).toEqual(['i0', 'i1', 'i10', 'i11', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8', 'i9']); // 11 selecionados + o único restante
    m.selecionar('c', []);
    expect(doms()).toEqual([]);
  });
});


describe('motor: item de marca em cache no pan (zoom baixo)', () => {
  // zoom 8: o quadrado de ~100 m tem bem menos de 3 px de diagonal e vira marca
  const baixa = (dx = 0): Vista => ({
    zoom: 8, larguraPx: 800, alturaPx: 600, dpr: 1,
    caixa: { minLat: -24.5, maxLat: -22.5, minLon: -47.6 + dx, maxLon: -45.6 + dx }
  });
  const marca = (m: MotorFormas, v = baixa()) => m.listaDesenho(v).camadas[0].itens.find((i) => i.id === 'a');

  it('o pan reaproveita o mesmo item (sem alocar) e não reavalia o LOD', () => {
    const m = novo();
    m.definirFeicoes('c', [ok('a'), ok('b')]);
    const primeiro = marca(m)!;
    expect(primeiro.forma).toBe('marca');
    const avaliacoes = m.estatisticas('c')!.avaliacoesLOD;
    expect(marca(m, baixa(0.01))).toBe(primeiro);
    expect(m.estatisticas('c')!.avaliacoesLOD).toBe(avaliacoes);
  });

  it('seleção e destaque mudam o item na vista seguinte, e voltam ao desfazer', () => {
    const m = novo();
    m.definirFeicoes('c', [ok('a')]);
    expect(marca(m)!.selecionada).toBe(false);
    m.selecionar('c', ['a']);
    expect(marca(m)!.selecionada).toBe(true);
    m.selecionar('c', []);
    expect(marca(m)!.selecionada).toBe(false);
    m.destacar('c', ['a']);
    expect(marca(m)!.destaque).toBe(true);
    m.destacar('c', []);
    expect(marca(m)!.destaque).toBeUndefined();
  });

  it('feição nova (cor) e estilo novo da camada trocam a cor da marca; feição removida sai', () => {
    const m = novo();
    const a = ok('a');
    m.definirFeicoes('c', [a]);
    const cor0 = marca(m)!.estilo.corPreenchimento;
    const vermelha: Feicao = { ...a, estilo: { corPreenchimento: '#ff0000' } };
    m.aplicarDelta('c', [vermelha], { base: [a], mudadas: [vermelha], removidas: [] });
    expect(marca(m)!.estilo.corPreenchimento).toBe('#ff0000');
    expect(marca(m)!.feicao).toBe(vermelha);

    m.definirFeicoes('c', [a]);
    expect(marca(m)!.estilo.corPreenchimento).toBe(cor0); // a marca volta ao cache antes de o estilo da camada mudar
    m.definirCamada({ id: 'c', zIndex: 1, opacidade: 1, visivel: true, interativo: true, estilo: { corPrimaria: '#00ff00' } });
    expect(marca(m)!.estilo.corPreenchimento).not.toBe(cor0);
    expect(marca(m)!.estilo.corPreenchimento).toBe('#00ff00');

    m.aplicarDelta('c', [], { base: [a], mudadas: [], removidas: ['a'] });
    expect(marca(m)).toBeUndefined();
  });

  it('prévia, regra de visibilidade e `oculta` valem mesmo com a marca em cache', () => {
    const m = novo();
    const a = ok('a');
    const b = ok('b');
    m.definirFeicoes('c', [a, b]);
    expect(marca(m)).toBeDefined();
    m.previsualizar('c', a);
    expect(marca(m)).toBeUndefined(); // em edição: só a sobreposição desenha
    const editada: Feicao = { ...a };
    m.aplicarDelta('c', [editada, b], { base: [a, b], mudadas: [editada], removidas: [] }); // a feição real chegou
    expect(marca(m)).toBeDefined();
    m.definirRegra((f) => f.id !== 'a');
    expect(marca(m)).toBeUndefined();
    m.definirRegra(null);
    expect(marca(m)).toBeDefined();
    const oculta: Feicao = { ...editada, oculta: true };
    m.aplicarDelta('c', [oculta, b], { base: [editada, b], mudadas: [oculta], removidas: [] });
    expect(marca(m)).toBeUndefined();
  });
});
