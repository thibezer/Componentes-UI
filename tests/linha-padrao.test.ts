import { describe, it, expect } from 'vitest';
import '../src/index';
import { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { TIPOS_LINHA, dashTipoLinha, normalizarTipoLinha, escalaTipoLinhaSegura, juncaoCanvas, terminacaoCanvas } from '../src/gerencigeo-canvas/motor/tipos-linha';
import { InternadorEstilos, estiloVetorDe } from '../src/gerencigeo-canvas/motor/estilo';
import { opcoesPath } from '../src/gerencigeo-canvas/renderers/marcadores_feicoes';
import { PintorCanvas2D, parseDash, type ContextoFormas2D } from '../src/gerencigeo-canvas/renderers/renderizador_formas';
import { ATRIBUTOS_LINHA_PADRAO, lerLinhaPadrao, mesclarLinhaPadrao } from '../src/components/ui-canvas-cad/cad-linha-padrao';
import type { CamadaDesenho, ItemDesenho } from '../src/gerencigeo-canvas/motor/tipos';
import type { EstiloFeicao, Feicao } from '../src/gerencigeo-canvas/feature_types';

const linha = (estilo?: EstiloFeicao, extra: Partial<Feicao> = {}): Feicao => ({
  id: 'l', camadaId: 'c', propriedades: {}, estilo,
  geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.59]] },
  ...extra
});

describe('tipos de linha CAD (puro)', () => {
  it('todo tipo, menos a contínua, produz um tracejado válido e par', () => {
    for (const t of TIPOS_LINHA) {
      const d = dashTipoLinha(t, 1);
      if (t === 'continua') {
        expect(d).toBeUndefined();
        continue;
      }
      const seg = parseDash(d);
      expect(seg.length % 2).toBe(0);
      expect(seg.some((v) => v > 0)).toBe(true);
    }
  });

  it('a escala multiplica traços; vãos ganham a espessura nas pontas arredondadas', () => {
    expect(dashTipoLinha('tracejada', 1)).toBe('12 7');
    expect(dashTipoLinha('tracejada', 1, 2)).toBe('24 13');
    expect(dashTipoLinha('tracejada', 1, 1, 'butt')).toBe('12 6');
  });

  it('acima de 2 px o padrão cresce com a espessura', () => {
    expect(dashTipoLinha('tracejada', 4, 1, 'butt')).toBe('24 12');
    expect(dashTipoLinha('tracejada', 2, 1, 'butt')).toBe('12 6');
  });

  it('pontos têm comprimento zero com pontas arredondadas e a espessura com ponta reta', () => {
    expect(dashTipoLinha('pontilhada', 3, 1, 'round')).toBe('0 9');
    expect(dashTipoLinha('pontilhada', 3, 1, 'butt')).toBe('3 6');
  });

  it('aceita os nomes do AutoCAD (os do editor de tipo de linha), sem diferenciar maiúsculas', () => {
    expect(normalizarTipoLinha('Dashed')).toBe('tracejada');
    expect(normalizarTipoLinha('CENTER')).toBe('centro');
    expect(normalizarTipoLinha(' Hidden ')).toBe('oculta');
    expect(normalizarTipoLinha('Continuous')).toBe('continua');
    expect(normalizarTipoLinha('constructor')).toBeUndefined();
    expect(dashTipoLinha('Dotted', 1)).toBe(dashTipoLinha('pontilhada', 1));
    expect(estiloVetorDe(linha({ tipoLinha: 'Continuous' as never }, { status: 'previa' }), {}).dash).toBeUndefined();
    expect(mesclarLinhaPadrao({}, { tipo: 'Phantom' })).toEqual({ tipoLinha: 'fantasma' });
  });

  it('é idempotente', () => {
    expect(dashTipoLinha('centro', 2.5, 1.3)).toBe(dashTipoLinha('centro', 2.5, 1.3));
  });

  it('entrada hostil: tipo desconhecido, peso/escala inválidos não lançam nem produzem NaN', () => {
    expect(dashTipoLinha('xyz', 2)).toBeUndefined();
    expect(dashTipoLinha(null, 2)).toBeUndefined();
    expect(dashTipoLinha({}, 2)).toBeUndefined();
    for (const peso of [NaN, -1, 0, Infinity]) {
      const d = dashTipoLinha('traco-ponto', peso, 'x');
      expect(d).toBeDefined();
      expect(d).not.toMatch(/NaN|Infinity/);
    }
    expect(escalaTipoLinhaSegura(NaN)).toBe(1);
    expect(escalaTipoLinhaSegura(-3)).toBe(1);
    expect(escalaTipoLinhaSegura(1e9)).toBe(100);
    expect(escalaTipoLinhaSegura(1e-9)).toBe(0.05);
  });

  it('terminação e junção em português viram lineCap/lineJoin; desconhecidos não', () => {
    expect(terminacaoCanvas('reta')).toBe('butt');
    expect(terminacaoCanvas('quadrada')).toBe('square');
    expect(juncaoCanvas('chanfrada')).toBe('bevel');
    expect(juncaoCanvas('angular')).toBe('miter');
    expect(terminacaoCanvas('toString')).toBeUndefined();
    expect(juncaoCanvas(42)).toBeUndefined();
  });
});

describe('estilo resolvido (motor)', () => {
  it('sem opções novas, a linha continua como sempre (arredondada, opaca, contínua)', () => {
    const e = estiloVetorDe(linha(), {});
    expect(e).toMatchObject({ dash: undefined, opacidadeTraco: 1, terminacao: 'round', juncao: 'round', deslocamentoDash: 0, peso: 2 });
  });

  it('aplica tipo, escala, opacidade, terminação, junção e deslocamento da feição', () => {
    const e = estiloVetorDe(linha({ tipoLinha: 'tracejada', escalaTipoLinha: 2, opacidadeTraco: 0.4, terminacaoTraco: 'reta', juncaoTraco: 'chanfrada', deslocamentoTracejado: 5 }), {});
    expect(e).toMatchObject({ dash: '24 12', opacidadeTraco: 0.4, terminacao: 'butt', juncao: 'bevel', deslocamentoDash: 5 });
  });

  it('dashArray explícito vence o tipo de linha; contínua vence o tracejado da prévia', () => {
    expect(estiloVetorDe(linha({ dashArray: '1 1', tipoLinha: 'centro' }), {}).dash).toBe('1 1');
    expect(estiloVetorDe(linha(undefined, { status: 'previa' }), {}).dash).toBe('6 4');
    expect(estiloVetorDe(linha({ tipoLinha: 'continua' }, { status: 'previa' }), {}).dash).toBeUndefined();
  });

  it('a camada dá o padrão: tipo, escala, opacidade, terminação e junção', () => {
    const camada = { tipoLinha: 'tracejada' as const, escalaTipoLinha: 2, opacidadeLinha: 0.5, terminacaoLinha: 'reta' as const, juncaoLinha: 'angular' as const };
    expect(estiloVetorDe(linha(), camada)).toMatchObject({ dash: '24 12', opacidadeTraco: 0.5, terminacao: 'butt', juncao: 'miter' });
    // a feição troca só o que define
    expect(estiloVetorDe(linha({ opacidadeTraco: 1 }), camada)).toMatchObject({ dash: '24 12', opacidadeTraco: 1 });
  });

  it('selecionada fica opaca mesmo com traço translúcido', () => {
    expect(estiloVetorDe(linha({ opacidadeTraco: 0.1 }), {}, true).opacidadeTraco).toBe(1);
  });

  it('entrada hostil: valores com tipo trocado caem no padrão', () => {
    const hostil = { tipoLinha: 'nada', escalaTipoLinha: 'x', opacidadeTraco: NaN, terminacaoTraco: 7, juncaoTraco: null, deslocamentoTracejado: Infinity } as unknown as EstiloFeicao;
    expect(estiloVetorDe(linha(hostil), {})).toMatchObject({ dash: undefined, opacidadeTraco: 1, terminacao: 'round', juncao: 'round', deslocamentoDash: 0 });
    expect(estiloVetorDe(linha({ opacidadeTraco: 7 }), {}).opacidadeTraco).toBe(1);
    expect(estiloVetorDe(linha({ opacidadeTraco: -2 }), {}).opacidadeTraco).toBe(0);
  });

  it('o internador separa estilos que só diferem nas opções novas', () => {
    const i = new InternadorEstilos();
    const a = i.interno(estiloVetorDe(linha({ terminacaoTraco: 'reta' }), {}));
    const b = i.interno(estiloVetorDe(linha({ terminacaoTraco: 'quadrada' }), {}));
    const c = i.interno(estiloVetorDe(linha({ terminacaoTraco: 'reta' }), {}));
    expect(a).not.toBe(b);
    expect(a).toBe(c);
  });
});

describe('os dois renderizadores concordam', () => {
  it('Leaflet: opacity, dashOffset, lineCap e lineJoin saem do estilo resolvido', () => {
    const e = estiloVetorDe(linha({ opacidadeTraco: 0.3, terminacaoTraco: 'quadrada', juncaoTraco: 'angular', deslocamentoTracejado: 3, tipoLinha: 'oculta' }), {});
    expect(opcoesPath(e, false)).toMatchObject({ opacity: 0.3, lineCap: 'square', lineJoin: 'miter', dashOffset: '3', dashArray: e.dash });
  });

  it('Canvas: o grupo recebe lineCap, lineJoin, lineDashOffset e globalAlpha do traço', () => {
    const sets: Array<[string, unknown]> = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_, k: string) => (k === 'lineDashOffset' ? 0 : () => undefined),
      set: (_, k: string, v) => { sets.push([k, v]); return true; }
    }) as unknown as ContextoFormas2D;
    const estilo = estiloVetorDe(linha({ opacidadeTraco: 0.25, terminacaoTraco: 'reta', juncaoTraco: 'chanfrada', deslocamentoTracejado: 4 }), {});
    const item: ItemDesenho = { camadaId: 'c', id: 'l', forma: 'linha', geometriaEmPx: [Float64Array.from([0, 0, 10, 10])], raioPx: 0, estilo, selecionada: false };
    const camada: CamadaDesenho = {
      camadaId: 'c', zIndex: 1, opacidade: 1, itens: [item],
      estatisticas: { total: 1, desenhadas: 1, marcasLOD: 0, clusters: 0, marcadoresDom: 0, avaliacoesLOD: 0 }
    };
    const sup = { ctx, largura: 100, altura: 100, dpr: 1 };
    new PintorCanvas2D({ camada: () => sup, sobreposicao: () => sup }).desenhar({ origem: { x: 0, y: 0 }, camadas: [camada] } as never, { dpr: 1 } as never);
    const ultimoAntesDoFim = (k: string) => sets.filter(([n]) => n === k).map(([, v]) => v);
    expect(ultimoAntesDoFim('lineCap')).toContain('butt');
    expect(ultimoAntesDoFim('lineJoin')).toContain('bevel');
    expect(ultimoAntesDoFim('lineDashOffset')).toContain(4);
    expect(ultimoAntesDoFim('globalAlpha')).toContain(0.25);
    // e o contexto é devolvido ao normal no fim da camada
    expect(ultimoAntesDoFim('lineDashOffset').slice(-1)[0]).toBe(0);
  });
});

describe('linha padrão do <ui-canvas-cad>', () => {
  const novo = () => document.createElement('ui-canvas-cad') as UICanvasCAD;

  it('mescla: null/inválido removem, chave ausente fica', () => {
    const base: EstiloFeicao = { corPreenchimento: '#fff', corTraco: '#000', tipoLinha: 'centro' };
    const r = mesclarLinhaPadrao(base, { cor: null, tipo: 'nada', espessura: '3.5', opacidade: 2 });
    expect(r).toEqual({ corPreenchimento: '#fff', espessuraTraco: 3.5, opacidadeTraco: 1 });
    expect(base).toEqual({ corPreenchimento: '#fff', corTraco: '#000', tipoLinha: 'centro' });
    expect(mesclarLinhaPadrao(base, null)).toEqual(base);
  });

  it('saneia cor e tracejado (nada de CSS arbitrário)', () => {
    expect(mesclarLinhaPadrao({}, { cor: 'red;background:url(x)', tracejado: '4 2; x' })).toEqual({});
    expect(mesclarLinhaPadrao({}, { cor: ' #ff0000 ', tracejado: '8, 4 2 4' })).toEqual({ corTraco: '#ff0000', dashArray: '8, 4 2 4' });
  });

  it('definirLinhaPadrao / obterLinhaPadrao, e as feições novas recebem pelo estilo de desenho', () => {
    const el = novo();
    el.definirEstiloDesenho({ corPreenchimento: '#00ff00' });
    el.definirLinhaPadrao({ cor: '#ff0000', espessura: 3, tipo: 'traco-ponto', escala: 1.5, opacidade: 0.8, terminacao: 'quadrada', juncao: 'chanfrada', deslocamento: 2 });
    expect(el.obterLinhaPadrao()).toEqual({ cor: '#ff0000', espessura: 3, tipo: 'traco-ponto', escala: 1.5, opacidade: 0.8, terminacao: 'quadrada', juncao: 'chanfrada', deslocamento: 2 });
    expect(el.obterEstiloDesenho()).toMatchObject({ corPreenchimento: '#00ff00', corTraco: '#ff0000', tipoLinha: 'traco-ponto', juncaoTraco: 'chanfrada' });
    el.definirLinhaPadrao({ tipo: null });
    expect(el.obterLinhaPadrao().tipo).toBeUndefined();
  });

  it('atributos linha-* são observados e aplicados; remover o atributo remove a opção', () => {
    const el = novo();
    for (const a of Object.keys(ATRIBUTOS_LINHA_PADRAO)) expect(UICanvasCAD.observedAttributes).toContain(a);
    el.setAttribute('linha-tipo', 'fantasma');
    el.setAttribute('linha-espessura', '4');
    el.setAttribute('linha-terminacao', 'reta');
    expect(el.obterLinhaPadrao()).toEqual({ tipo: 'fantasma', espessura: 4, terminacao: 'reta' });
    el.removeAttribute('linha-tipo');
    el.setAttribute('linha-espessura', 'abc');
    expect(el.obterLinhaPadrao()).toEqual({ terminacao: 'reta' });
  });

  it('lerLinhaPadrao ignora o que não é traço', () => {
    expect(lerLinhaPadrao({ corPreenchimento: '#fff', icone: 'x' })).toEqual({});
  });
});
