import { describe, it, expect, afterEach } from 'vitest';
import { criarLinha, criarRetangulo, criarTexto } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { comPropriedade, valorDaPropriedade, IDS_PROPRIEDADES_PRANCHA } from '../src/gerencigeo-canvas/prancha/propriedades';
import { limitesNaFolha } from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import { categoriasDePropriedades } from '../src/components/ui-canvas-prancha/prancha-painel-propriedades';
import {
  CAMADA_SEM_CAMADA, camadasComMudanca, camadasNaOrdemDoPainel, dadosParaPainelDeCamadas
} from '../src/components/ui-canvas-prancha/prancha-painel-camadas';
import { FERRAMENTAS_PALETA_PRANCHA, ferramentaDaPaleta } from '../src/components/ui-canvas-prancha/prancha-paleta';
import { FERRAMENTAS_PRANCHA } from '../src/components/ui-canvas-prancha/tipos';
import type { CategoriaPropriedades } from '../src/components/ui-tabela-propriedades/tipos';
import type { CamadaItem, FeicaoItem } from '../src/components/ui-camadas/tipos';
import type { FerramentaItem } from '../src/components/ui-barra-ferramentas/tipos';
import { montar } from './prancha-componente-util';

/*
 * Fase 6 (camadas A, B e C): os adaptadores que ligam a prancha aos painéis do kit (`ui-tabela-propriedades`,
 * `ui-camadas`, `ui-paleta-ferramentas`) e os comandos de usuário que eles usam (`aplicarPropriedade`, `alterarElementos`).
 * Os adaptadores não importam os outros componentes L4: os tipos daqui provam que os dados cabem nos contratos deles.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

const ret = (id: string, x: number, y: number, w = 20, h = 10, extra: Partial<ElementoGrafico> = {}): ElementoGrafico =>
  ({ ...criarRetangulo({ id, aparencia: { preenchimento: { cor: '#ff0000' } } }, { x, y, largura: w, altura: h })!, ...extra });
const valorDe = (cats: ReturnType<typeof categoriasDePropriedades>, id: string) =>
  cats.flatMap((c) => c.propriedades).find((p) => p.id === id);

describe('propriedades (núcleo L2)', () => {
  const el = ret('a', 10, 20);

  it('lê os valores de exibição (padrões resolvidos, opacidade em %)', () => {
    expect(valorDaPropriedade(el, 'preenchimento.cor')).toBe('#ff0000');
    expect(valorDaPropriedade(el, 'traco.ativo')).toBe(true);
    expect(valorDaPropriedade(el, 'traco.espessura')).toBe(0.25);
    expect(valorDaPropriedade(el, 'traco.opacidade')).toBe(100);
    expect(valorDaPropriedade(el, 'traco.pontaFim')).toBe('nenhuma');
    expect(valorDaPropriedade(el, 'efeitos.mesclagem')).toBe('normal');
    expect(valorDaPropriedade(el, 'sombra.ativa')).toBe(false);
    expect(valorDaPropriedade(el, 'geometria.x')).toBeCloseTo(10, 9);
    expect(valorDaPropriedade(el, 'geometria.largura')).toBeCloseTo(20, 9);
    expect(valorDaPropriedade(el, 'geometria.raio')).toBe(0);
  });

  it('muda a aparência e passa pela validação (faixas, listas)', () => {
    const t = comPropriedade(el, 'traco.espessura', 2)!;
    expect(t.aparencia?.traco?.espessura).toBe(2);
    expect(comPropriedade(el, 'traco.opacidade', 50)!.aparencia?.traco?.opacidade).toBe(0.5);
    expect(comPropriedade(el, 'traco.ativo', false)!.aparencia?.traco).toBeNull();
    expect(comPropriedade(comPropriedade(el, 'traco.ativo', false)!, 'traco.cor', '#00ff00')!.aparencia?.traco?.cor).toBe('#00ff00');
    expect(comPropriedade(el, 'traco.pontaFim', 'triangulo')!.aparencia?.traco?.pontaFim).toEqual({ estilo: 'triangulo' });
    expect(comPropriedade(el, 'preenchimento.ativo', false)!.aparencia?.preenchimento).toBeNull();
    const semPreench = comPropriedade(el, 'preenchimento.ativo', false)!;
    expect(valorDaPropriedade(semPreench, 'preenchimento.cor')).toBe('#ffffff');
    expect(comPropriedade(semPreench, 'preenchimento.ativo', true)!.aparencia?.preenchimento?.cor).toBe('#ffffff');
    expect(comPropriedade(el, 'preenchimento.ativo', true)!.aparencia?.preenchimento?.cor).toBe('#ff0000');
    expect(comPropriedade(el, 'sombra.ativa', true)!.aparencia?.sombra).toEqual({});
    expect(comPropriedade(el, 'sombra.dx', 4)!.aparencia?.sombra?.deslocamento).toEqual([4, 1.5]);
    expect(comPropriedade(el, 'efeitos.mesclagem', 'tela')!.aparencia?.mesclagem).toBe('tela');
    expect(comPropriedade(el, 'elemento.nome', 'Moldura')!.nome).toBe('Moldura');
    expect(comPropriedade({ ...el, nome: 'x' }, 'elemento.nome', '')!.nome).toBeUndefined();
    expect(comPropriedade(el, 'elemento.oculto', true)!.oculto).toBe(true);
  });

  it('entrada hostil: valor ruim, id desconhecido ou de geometria devolvem null (nada muda)', () => {
    expect(comPropriedade(el, 'traco.espessura', 'abc')).toBeNull();
    expect(comPropriedade(el, 'traco.opacidade', NaN)).toBeNull();
    expect(comPropriedade(el, 'efeitos.mesclagem', 'veneno')).toBeNull();
    expect(comPropriedade(el, 'nao.existe' as never, 1)).toBeNull();
    expect(comPropriedade(el, 'geometria.x', 5)).toBeNull();
    expect(comPropriedade(null as never, 'traco.cor', '#000')).toBeNull();
    expect(valorDaPropriedade(null as never, 'traco.cor')).toBeUndefined();
    expect(IDS_PROPRIEDADES_PRANCHA).toContain('sombra.desfoque');
  });

  it('a cor com HTML não vira marcação (fica como texto e a pintura a recusa)', () => {
    const r = comPropriedade(el, 'preenchimento.cor', '<img src=x onerror=alert(1)>');
    expect(r === null || typeof r.aparencia?.preenchimento?.cor === 'string').toBe(true);
  });
});

describe('painel de propriedades (contrato do ui-tabela-propriedades)', () => {
  it('uma seleção: categorias, valores e tipos de editor; cabe em CategoriaPropriedades[]', () => {
    const cats = categoriasDePropriedades([ret('a', 10, 20)]);
    const contrato: CategoriaPropriedades[] = cats; // cabe no contrato do ui-tabela-propriedades (checado pelo tsc)
    expect(contrato).toBe(cats);
    expect(cats.map((c) => c.id)).toEqual(['elemento', 'geometria', 'traco', 'preenchimento', 'hachura', 'efeitos']);
    expect(valorDe(cats, 'geometria.x')).toMatchObject({ tipo: 'numero', unidade: 'mm', valor: 10 });
    expect(valorDe(cats, 'traco.tipoLinha')?.tipo).toBe('linha');
    expect(valorDe(cats, 'preenchimento.cor')).toMatchObject({ tipo: 'cor', valor: '#ff0000' });
    expect(valorDe(cats, 'efeitos.mesclagem')?.opcoes?.length).toBe(16);
  });

  it('várias: posição e tamanho da caixa da seleção; valores diferentes ficam mistos', () => {
    const cats = categoriasDePropriedades([ret('a', 10, 20), ret('b', 50, 40, 20, 10, { aparencia: { preenchimento: { cor: '#0000ff' } } })]);
    expect(valorDe(cats, 'geometria.x')?.valor).toBe(10);
    expect(valorDe(cats, 'geometria.largura')?.valor).toBe(60);
    expect(valorDe(cats, 'preenchimento.cor')).toMatchObject({ misto: true });
    expect(valorDe(cats, 'traco.espessura')).toMatchObject({ valor: 0.25 });
    expect(valorDe(cats, 'elemento.tipo')?.valor).toBe('2 elementos');
  });

  it('linha aberta não tem preenchimento nem hachura; texto não tem traço nem raio; vazio dá []', () => {
    const linha = criarLinha({ id: 'l' }, [0, 0], [10, 0])!;
    expect(categoriasDePropriedades([linha]).map((c) => c.id)).toEqual(['elemento', 'geometria', 'traco', 'efeitos']);
    const texto = criarTexto({ id: 't' }, [0, 10], 'Oi', 5)!;
    const ct = categoriasDePropriedades([texto]);
    expect(ct.map((c) => c.id)).not.toContain('traco');
    expect(valorDe(ct, 'geometria.raio')).toBeUndefined();
    expect(categoriasDePropriedades([])).toEqual([]);
    expect(categoriasDePropriedades(null as never)).toEqual([]);
  });
});

describe('painel de camadas (contrato do ui-camadas)', () => {
  const els = [ret('a', 0, 0, 10, 10, { camadaId: 'fundo', nome: 'Fundo' }), ret('b', 0, 0, 10, 10, { camadaId: 'frente', oculto: true }), ret('c', 0, 0)];
  const camadas = [{ id: 'fundo', nome: 'Fundo' }, { id: 'frente', nome: 'Frente', bloqueada: true, opacidade: 0.5 }];

  it('camadas da frente para trás (a sem camada primeiro); feições com nome, visibilidade e trava', () => {
    const d = dadosParaPainelDeCamadas(els, camadas);
    const cs: CamadaItem[] = d.camadas;
    const fs: FeicaoItem[] = d.feicoes;
    expect(cs.map((c) => c.id)).toEqual([CAMADA_SEM_CAMADA, 'frente', 'fundo']);
    expect(cs[1]).toMatchObject({ name: 'Frente', locked: true, opacity: 0.5, visible: true, count: 1 });
    expect(fs.map((f) => f.id)).toEqual(['c', 'b', 'a']);
    expect(fs.find((f) => f.id === 'a')).toMatchObject({ name: 'Fundo', layerId: 'fundo', type: 'Polygon', visible: true });
    expect(fs.find((f) => f.id === 'b')?.visible).toBe(false);
    expect(fs.find((f) => f.id === 'c')?.name).toBe('Retângulo 1');
    expect(dadosParaPainelDeCamadas(els, []).camadas.map((c) => c.id)).toEqual([CAMADA_SEM_CAMADA]);
  });

  it('mudanças de volta: visibilidade, trava, opacidade, nome e a ordem do painel (frente primeiro)', () => {
    expect(camadasComMudanca(camadas, 'fundo', { visivel: false })[0].visivel).toBe(false);
    expect(camadasComMudanca(camadas, 'fundo', { opacidade: 7 })[0].opacidade).toBe(1);
    expect(camadasComMudanca(camadas, 'nao', { visivel: false })).toEqual(camadas);
    expect(camadasNaOrdemDoPainel(camadas, ['fundo', CAMADA_SEM_CAMADA, 'frente']).map((c) => c.id)).toEqual(['frente', 'fundo']);
    expect(camadasNaOrdemDoPainel(camadas, ['fundo']).map((c) => c.id)).toEqual(['frente', 'fundo']);
  });
});

describe('paleta (contrato do ui-paleta-ferramentas)', () => {
  it('cobre todas as ferramentas uma vez, com atalho e ícone SVG; ids traduzem para a prancha', () => {
    const itens: FerramentaItem[] = [...FERRAMENTAS_PALETA_PRANCHA];
    const ids = itens.flatMap((i) => (i.filhos && i.filhos.length > 0 ? i.filhos : [i])).map((i) => i.id);
    expect([...ids].sort()).toEqual([...FERRAMENTAS_PRANCHA].sort());
    for (const i of itens.flatMap((x) => x.filhos ?? [x])) expect(i.icone?.startsWith('<svg')).toBe(true);
    expect(ferramentaDaPaleta('caneta')).toBe('caneta');
    expect(ferramentaDaPaleta('grupo-formas')).toBe(null);
    expect(ferramentaDaPaleta(42 as never)).toBe(null);
  });
});

describe('comandos de usuário do componente', () => {
  it('aplicarPropriedade: aparência com histórico (rajada no mesmo campo = um passo) e evento', () => {
    const { el, ev } = montar();
    el.definirElementos([ret('a', 10, 20), ret('b', 50, 20)]);
    el.selecionarElementos(['a', 'b']);
    expect(el.aplicarPropriedade('traco.espessura', 1)).toBe(true);
    expect(el.aplicarPropriedade('traco.espessura', 1.5)).toBe(true);
    expect(el.obterElementos().map((e) => e.aparencia?.traco?.espessura)).toEqual([1.5, 1.5]);
    const at = ev('prancha-elemento-atualizado') as Array<{ motivo: string }>;
    expect(at[at.length - 1].motivo).toBe('propriedades');
    el.desfazer();
    expect(el.obterElementos().map((e) => e.aparencia?.traco?.espessura)).toEqual([undefined, undefined]);
  });

  it('aplicarPropriedade: geometria da seleção (x, largura, rotação, raio)', () => {
    const { el } = montar();
    el.definirElementos([ret('a', 10, 20), ret('b', 50, 20)]);
    el.selecionarElementos(['a', 'b']);
    expect(el.aplicarPropriedade('geometria.x', 0)).toBe(true);
    expect(limitesNaFolha(el.obterElemento('a')!)!.x).toBeCloseTo(0, 9);
    expect(el.aplicarPropriedade('geometria.largura', 120)).toBe(true);
    expect(limitesNaFolha(el.obterElemento('b')!)!.x + limitesNaFolha(el.obterElemento('b')!)!.largura).toBeCloseTo(120, 9);
    el.selecionarElementos(['a']);
    expect(el.aplicarPropriedade('geometria.rotacao', 90)).toBe(true);
    expect(el.categoriasDePropriedades().flatMap((c) => c.propriedades).find((p) => p.id === 'geometria.rotacao')?.valor).toBeCloseTo(90, 6);
    expect(el.aplicarPropriedade('geometria.raio', 3)).toBe(true);
    const g = el.obterElemento('a')!.geometria;
    expect(g.tipo === 'retangulo' && g.raios).toEqual([3, 3, 3, 3]);
  });

  it('recusas: sem seleção, valor inválido, largura zero, somente-leitura; nada muda', () => {
    const { el, ev } = montar();
    el.definirElementos([ret('a', 10, 20)]);
    expect(el.aplicarPropriedade('traco.cor', '#000')).toBe(false);
    el.selecionarElementos(['a']);
    expect(el.aplicarPropriedade('traco.espessura', 'muito')).toBe(false);
    expect(el.aplicarPropriedade('geometria.largura', 0)).toBe(false);
    el.setAttribute('somente-leitura', '');
    expect(el.aplicarPropriedade('traco.cor', '#000')).toBe(false);
    const motivos = (ev('prancha-recusa') as Array<{ motivo: string }>).map((r) => r.motivo);
    expect(motivos).toEqual(['sem-selecao', 'geometria-invalida', 'geometria-invalida', 'somente-leitura']);
  });

  it('alterarElementos (o painel de camadas): ocultar, travar, renomear e mover de camada, com histórico', () => {
    const { el, ev } = montar();
    el.definirElementos([ret('a', 10, 20), ret('b', 50, 20, 20, 10, { bloqueado: true })]);
    el.definirCamadas([{ id: 'k' }]);
    expect(el.alterarElementos(['a'], { oculto: true, nome: 'Moldura' })).toBe(true);
    expect(el.obterElemento('a')).toMatchObject({ oculto: true, nome: 'Moldura' });
    expect(el.alterarElementos(['b'], { bloqueado: false, camadaId: 'k' })).toBe(true);
    expect(el.obterElemento('b')).toMatchObject({ camadaId: 'k' });
    expect(el.obterElemento('b')!.bloqueado).toBeUndefined();
    expect(el.alterarElementos(['b'], { camadaId: 'nao-existe' })).toBe(false);
    expect(el.alterarElementos(['zz'], { oculto: true })).toBe(false);
    expect(el.alterarElementos(['a'], null as never)).toBe(false);
    el.desfazer();
    expect(el.obterElemento('b')!.bloqueado).toBe(true);
    const at = ev('prancha-elemento-atualizado') as Array<{ motivo: string }>;
    expect(at.every((d) => d.motivo === 'propriedades' || d.motivo === 'desfazer')).toBe(true);
  });

  it('comandos pelo ui-bus estão na lista pública', async () => {
    const { COMANDOS_PRANCHA } = await import('../src/components/ui-canvas-prancha/prancha-bus');
    expect(COMANDOS_PRANCHA).toEqual(expect.arrayContaining(['aplicarPropriedade', 'alterarElementos']));
  });
});
