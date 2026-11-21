// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESPACO_PLANO } from '../src/gerencigeo-canvas/espaco/espaco_plano';
import { aplicar, compor, escala, rotacao, translacao } from '../src/gerencigeo-canvas/espaco/espaco_matriz';
import {
  KAPPA, caixaDoTexto, contornoElipse, contornoEstrela, contornoLocal, contornoNaFolha, contornoPoligonoRegular, contornoRetangulo,
  limitesNaFolha, raiosCabiveis, type ContornoElemento
} from '../src/gerencigeo-canvas/prancha/elemento_geometria';
import {
  caixaDeCantos, criarCaminho, criarElipse, criarEstrela, criarLinha, criarPoligonoRegular, criarRetangulo, criarTexto
} from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import {
  caixaDaSelecao, caixaOrientada, espelharElementos, girarElementos, matrizDeCisalhamentoPorAlca, matrizDeEscalaPorAlca,
  moverElemento, pivoNaFolha, posicoesDasAlcas, rotacaoPorArrasto, transformarElemento
} from '../src/gerencigeo-canvas/prancha/elemento_transformacao';
import {
  DIMENSOES_FOLHA, PREDEFINICOES, TIPO_LINHA_DO_ESTILO, caixaDoQuadroAbnt, gerarPredefinicao, margensAbnt
} from '../src/gerencigeo-canvas/prancha/elemento_predefinicoes';
import type { ElementoGrafico } from '../src/gerencigeo-canvas/prancha/tipos';
import type { Par } from '../src/gerencigeo-canvas/feature_types';

/* Fase 1 da prancha, Camada A: formas paramétricas, transformações, alças e pré-definições (dados puros, em Node). */

const areaDe = (c: ContornoElemento | null) => (c && c.tipo === 'Polygon' ? ESPACO_PLANO.area(c.aneis) : NaN);
const perimetro = (c: ContornoElemento | null) => (c && c.tipo === 'Polygon' ? ESPACO_PLANO.comprimento(c.aneis[0], true) : NaN);
const perto = (a: Par, b: Par, casas = 9) => {
  expect(a[0]).toBeCloseTo(b[0], casas);
  expect(a[1]).toBeCloseTo(b[1], casas);
};
const base = { id: 'e' };

describe('formas paramétricas (contorno local)', () => {
  it('retângulo sem cantos: 4 vértices, sem curva, centrado na origem', () => {
    const c = contornoRetangulo(40, 20)!;
    expect(c).toEqual({ tipo: 'Polygon', aneis: [[[-20, -10], [20, -10], [20, 10], [-20, 10]]] });
    expect(areaDe(c)).toBe(800);
  });

  it('cantos arredondados ao vivo: área = wh − (4 − π)r², Bézier com κ', () => {
    const r = 5;
    const c = contornoRetangulo(40, 20, [r, r, r, r])!;
    expect(c.curva).toHaveLength(8);
    expect(areaDe(c)).toBeCloseTo(800 - (4 - Math.PI) * r * r, 1);
    expect(c.curva![0]).toEqual({ ponto: [-15, -10], entrada: [-15 - r * KAPPA, -10] });
  });

  it('cantos independentes e raios grandes demais reduzidos na mesma proporção (regra do CSS)', () => {
    expect(raiosCabiveis(40, 20, [30, 30, 0, 0])).toEqual([20, 20, 0, 0]);
    expect(raiosCabiveis(40, 20, [NaN, -3, 2, Infinity])).toEqual([0, 0, 2, 0]);
    const c = contornoRetangulo(40, 20, [10, 0, 0, 0])!;
    expect(c.curva!.filter((n) => n.entrada || n.saida)).toHaveLength(2);
    // dois raios que somam o lado inteiro: os nós do meio se fundem num só
    const pilula = contornoRetangulo(40, 20, [10, 10, 10, 10])!;
    expect(pilula.curva).toHaveLength(6);
    expect(areaDe(pilula)).toBeCloseTo(20 * 20 + Math.PI * 100, 0);
  });

  it('elipse: 4 nós nos eixos, área ≈ π·rx·ry, perímetro ≈ Ramanujan', () => {
    const c = contornoElipse(30, 10)!;
    expect(c.curva!.map((n) => n.ponto)).toEqual([[30, 0], [0, 10], [-30, 0], [0, -10]]);
    expect(areaDe(c) / (Math.PI * 300)).toBeCloseTo(1, 2);
    const h = ((30 - 10) / (30 + 10)) ** 2;
    const ramanujan = Math.PI * 40 * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    expect(perimetro(c) / ramanujan).toBeCloseTo(1, 2);
  });

  it('arco: aberto (linha), corda e fatia (fechados); varredura que dá a volta', () => {
    const aberto = contornoElipse(10, 10, { inicio: 0, fim: Math.PI })!;
    expect(aberto.tipo).toBe('LineString');
    perto((aberto as Extract<ContornoElemento, { tipo: 'LineString' }>).coordenadas[0], [10, 0]);
    const coords = (aberto as Extract<ContornoElemento, { tipo: 'LineString' }>).coordenadas;
    const ultimo = coords[coords.length - 1];
    perto(ultimo, [-10, 0]);
    expect(areaDe(contornoElipse(10, 10, { inicio: 0, fim: Math.PI, fechamento: 'corda' }))).toBeCloseTo(Math.PI * 50, 0);
    expect(areaDe(contornoElipse(10, 10, { inicio: 0, fim: Math.PI / 2, fechamento: 'fatia' }))).toBeCloseTo(Math.PI * 25, 0);
    // de 3π/2 a π/2 passa por 0 (meio círculo do lado direito)
    expect(areaDe(contornoElipse(10, 10, { inicio: 1.5 * Math.PI, fim: 0.5 * Math.PI, fechamento: 'corda' }))).toBeCloseTo(Math.PI * 50, 0);
  });

  it('polígono regular e estrela com uma ponta para cima', () => {
    const hex = contornoPoligonoRegular(10, 6)!;
    expect(hex.tipo === 'Polygon' && hex.aneis[0]).toHaveLength(6);
    perto((hex as Extract<ContornoElemento, { tipo: 'Polygon' }>).aneis[0][0], [0, -10]);
    expect(areaDe(hex)).toBeCloseTo((3 * Math.sqrt(3) / 2) * 100, 9);
    const est = contornoEstrela(10, 4, 5)!;
    expect(est.tipo === 'Polygon' && est.aneis[0]).toHaveLength(10);
    perto((est as Extract<ContornoElemento, { tipo: 'Polygon' }>).aneis[0][0], [0, -10]);
    expect(Math.hypot(...(est as Extract<ContornoElemento, { tipo: 'Polygon' }>).aneis[0][1])).toBeCloseTo(4, 9);
  });

  it('texto: caixa aproximada pela linha de base, por linhas e pelo alinhamento', () => {
    expect(caixaDoTexto({ tipo: 'texto', texto: 'abcd', tamanho: 10 })).toEqual({ x: 0, y: -8, largura: 22, altura: 12 });
    expect(caixaDoTexto({ tipo: 'texto', texto: 'a\nb', tamanho: 10, largura: 50, alinhamento: 'centro' })).toEqual({ x: -25, y: -8, largura: 50, altura: 24 });
    expect(caixaDoTexto({ tipo: 'texto', texto: '', tamanho: 0 })).toBeNull();
  });

  it('degeneradas dão null (não desenham nem selecionam)', () => {
    expect(contornoRetangulo(0, 10)).toBeNull();
    expect(contornoElipse(10, -1)).toBeNull();
    expect(contornoElipse(10, 10, { inicio: NaN, fim: 1 })).toBeNull();
    expect(contornoPoligonoRegular(10, 2)).toBeNull();
    expect(contornoLocal({ tipo: 'linha', de: [0, 0], ate: [NaN, 1] })).toBeNull();
  });
});

describe('criação e contorno na folha', () => {
  it('retângulo criado por dois cantos fica com o centro na translação', () => {
    const el = criarRetangulo(base, caixaDeCantos([50, 40], [10, 20]))!;
    expect(el.transformacao).toEqual(translacao(30, 30));
    expect(limitesNaFolha(el)).toEqual({ x: 10, y: 20, largura: 40, altura: 20 });
  });

  it('a área na folha não muda com rotação e translação; escala multiplica', () => {
    const el = criarElipse(base, { x: 0, y: 0, largura: 40, altura: 20 })!;
    const a0 = areaDe(contornoNaFolha(el));
    const girada = transformarElemento(el, rotacao(0.7, [3, 4]));
    expect(areaDe(contornoNaFolha(girada))).toBeCloseTo(a0, 6);
    expect(areaDe(contornoNaFolha(transformarElemento(el, escala(2, 3))))).toBeCloseTo(a0 * 6, 5);
  });

  it('o contorno fica em cache pelo objeto (imutável) e muda quando o objeto muda', () => {
    const el = criarRetangulo(base, { x: 0, y: 0, largura: 10, altura: 10 })!;
    expect(contornoNaFolha(el)).toBe(contornoNaFolha(el));
    const movido = moverElemento(el, 5, 0);
    expect(limitesNaFolha(movido)).toEqual({ x: 5, y: 0, largura: 10, altura: 10 });
    expect(limitesNaFolha(el)).toEqual({ x: 0, y: 0, largura: 10, altura: 10 });
  });

  it('linha, polígono, estrela, caminho e texto', () => {
    const l = criarLinha(base, [0, 0], [10, 10])!;
    expect(contornoNaFolha(l)).toEqual({ tipo: 'LineString', coordenadas: [[0, 0], [10, 10]] });
    expect(limitesNaFolha(criarPoligonoRegular(base, [50, 50], 10, 4)!)!.largura).toBeCloseTo(20, 9);
    expect(criarEstrela(base, [0, 0], 10, 20, 5)!.geometria).toEqual({ tipo: 'estrela', raioExterno: 10, raioInterno: 10, pontas: 5 });
    const cam = criarCaminho(base, { tipo: 'LineString', coordenadas: [[1, 1], [2, 2]] })!;
    expect(cam.transformacao).toBeUndefined();
    expect(limitesNaFolha(criarTexto(base, [10, 50], 'Olá', 5)!)).toEqual({ x: 10, y: 46, largura: 3 * 5 * 0.55, altura: 6 });
    expect(criarRetangulo(base, { x: 0, y: 0, largura: 0, altura: 5 })).toBeNull();
  });
});

describe('caixa orientada, alças e transformações', () => {
  const ret = criarRetangulo(base, { x: 10, y: 10, largura: 40, altura: 20 })!;

  it('alças e rotação na folha', () => {
    const p = posicoesDasAlcas(caixaOrientada(ret)!, 6);
    expect(p.cantos).toEqual([[10, 10], [50, 10], [50, 30], [10, 30]]);
    expect(p.alcas.e).toEqual([50, 20]);
    expect(p.centro).toEqual([30, 20]);
    expect(p.rotacao).toEqual([30, 4]);
    const girado = transformarElemento(ret, rotacao(Math.PI / 2, [30, 20]));
    perto(posicoesDasAlcas(caixaOrientada(girado)!, 6).rotacao, [46, 20]);
  });

  it('alça de canto: dobra a largura com o canto oposto parado; Shift proporcional; Alt do centro', () => {
    const c = caixaOrientada(ret)!;
    const m = matrizDeEscalaPorAlca(c, 'se', [90, 30])!;
    const el = transformarElemento(ret, m);
    expect(limitesNaFolha(el)).toEqual({ x: 10, y: 10, largura: 80, altura: 20 });
    const prop = transformarElemento(ret, matrizDeEscalaPorAlca(c, 'se', [90, 31], { proporcional: true })!);
    const lp = limitesNaFolha(prop)!;
    expect(lp.largura).toBeCloseTo(80, 9);
    expect(lp.altura).toBeCloseTo(40, 9);
    const centro = transformarElemento(ret, matrizDeEscalaPorAlca(c, 'e', [70, 20], { doCentro: true })!);
    expect(limitesNaFolha(centro)).toEqual({ x: -10, y: 10, largura: 80, altura: 20 });
  });

  it('alça lateral só mexe um eixo; atravessar a oposta espelha; na caixa girada segue o referencial dela', () => {
    const c = caixaOrientada(ret)!;
    expect(limitesNaFolha(transformarElemento(ret, matrizDeEscalaPorAlca(c, 's', [999, 40])!))).toEqual({ x: 10, y: 10, largura: 40, altura: 30 });
    const esp = transformarElemento(ret, matrizDeEscalaPorAlca(c, 'e', [0, 20])!);
    expect(limitesNaFolha(esp)).toEqual({ x: 0, y: 10, largura: 10, altura: 20 });
    const girado = transformarElemento(ret, rotacao(Math.PI / 2, [30, 20]));
    const cg = caixaOrientada(girado)!;
    const alcaE = posicoesDasAlcas(cg).alcas.e;
    const m = matrizDeEscalaPorAlca(cg, 'e', [alcaE[0], alcaE[1] + 40])!;
    const l = limitesNaFolha(transformarElemento(girado, m))!;
    expect(l.largura).toBeCloseTo(20, 9);
    expect(l.altura).toBeCloseTo(80, 9);
  });

  it('rotação por arrasto, com passo de 45° (Shift)', () => {
    const r = rotacaoPorArrasto([0, 0], [10, 0], [0, 10]);
    expect(r.angulo).toBeCloseTo(Math.PI / 2, 12);
    expect(rotacaoPorArrasto([0, 0], [10, 0], [10, 3], Math.PI / 4).angulo).toBe(0);
    expect(rotacaoPorArrasto([0, 0], [10, 0], [10, 6], Math.PI / 4).angulo).toBeCloseTo(Math.PI / 4, 12);
    expect(rotacaoPorArrasto([0, 0], [0, 0], [1, 1]).angulo).toBe(0);
  });

  it('cisalhamento pela alça de cima, com a base parada', () => {
    const m = matrizDeCisalhamentoPorAlca(caixaOrientada(ret)!, 'n', [40, 10])!;
    perto(aplicar(m, [10, 30]), [10, 30]);
    perto(aplicar(m, [10, 10]), [20, 10]);
  });

  it('espelhar e girar a seleção em torno do centro dela; bloqueados ficam', () => {
    const a = criarRetangulo({ id: 'a' }, { x: 0, y: 0, largura: 10, altura: 10 })!;
    const b = { ...criarRetangulo({ id: 'b' }, { x: 90, y: 0, largura: 10, altura: 10 })!, bloqueado: true };
    const [ea, eb] = espelharElementos([a, b], 'horizontal');
    expect(limitesNaFolha(ea)).toEqual({ x: 90, y: 0, largura: 10, altura: 10 });
    expect(eb).toBe(b);
    const [ga] = girarElementos([a], Math.PI);
    const lg = limitesNaFolha(ga)!;
    expect(lg.x).toBeCloseTo(0, 9);
    expect(caixaDaSelecao([a, criarRetangulo({ id: 'c' }, { x: 90, y: 0, largura: 10, altura: 10 })!])).toEqual({
      quadro: expect.any(Object), min: [0, 0], max: [100, 10]
    });
  });

  it('pivô: o local do elemento ou o centro da caixa', () => {
    expect(pivoNaFolha(ret)).toEqual([30, 20]);
    expect(pivoNaFolha({ ...ret, pivo: [-20, -10] })).toEqual([10, 10]);
  });

  it('matrizes nunca saem não finitas', () => {
    const c = caixaOrientada(ret)!;
    expect(matrizDeEscalaPorAlca(c, 'se', [NaN, 1])).toBeNull();
    expect(matrizDeEscalaPorAlca(c, 'x' as never, [1, 1])).toBeNull();
    expect(matrizDeEscalaPorAlca({ ...c, quadro: escala(0, 0) }, 'se', [1, 1])).toBeNull();
    const achatado = transformarElemento(ret, matrizDeEscalaPorAlca(c, 'e', [10, 20])!);
    expect(limitesNaFolha(achatado)!.largura).toBeGreaterThan(0);
    expect(transformarElemento(ret, { a: NaN, b: 0, c: 0, d: 1, e: 0, f: 0 })).toBe(ret);
    expect(moverElemento(ret, Infinity, 0)).toBe(ret);
  });
});

describe('pré-definições (o que o app usa hoje)', () => {
  const caixa = { x: 10, y: 20, largura: 100, altura: 60 };

  it('todas geram elementos válidos e editáveis, com o estilo de traço pedido', () => {
    for (const tipo of PREDEFINICOES) {
      for (const estilo of ['continuo', 'tracejado', 'pontilhado', 'traco-ponto'] as const) {
        const els = gerarPredefinicao(tipo, caixa, { estiloTraco: estilo, id: 'p' });
        expect(els.length, tipo).toBeGreaterThan(0);
        for (const el of els) {
          expect(contornoNaFolha(el), tipo).not.toBeNull();
          expect(el.aparencia?.traco?.tipoLinha).toBe(TIPO_LINHA_DO_ESTILO[estilo]);
          const l = limitesNaFolha(el)!;
          expect(l.x).toBeGreaterThanOrEqual(10 - 1e-9);
          expect(l.x + l.largura).toBeLessThanOrEqual(110 + 1e-9);
        }
      }
    }
  });

  it('moldura dupla: dois retângulos no mesmo grupo, a interna mais grossa e afastada', () => {
    const [ext, int] = gerarPredefinicao('moldura-dupla', caixa, { id: 'm', espessura: 0.25, espacamento: 2 });
    expect(ext.grupoId).toBe(int.grupoId);
    expect(int.id).toBe('m-2');
    expect(limitesNaFolha(int)).toEqual({ x: 12, y: 22, largura: 96, altura: 56 });
    expect(int.aparencia!.traco!.espessura).toBe(0.5);
    expect(gerarPredefinicao('moldura-dupla', { x: 0, y: 0, largura: 3, altura: 3 }, { espacamento: 2 })).toEqual([]);
  });

  it('setas: ponta no fim (simples) ou nas duas (dupla); círculo inscrito; linhas finas aceitam altura zero', () => {
    const [s] = gerarPredefinicao('seta', caixa);
    expect(s.aparencia!.traco!.pontaFim).toEqual({ estilo: 'triangulo' });
    expect(s.aparencia!.traco!.pontaInicio).toBeUndefined();
    const [d] = gerarPredefinicao('seta-dupla', caixa, { ponta: { estilo: 'aberta', escala: 2 } });
    expect(d.aparencia!.traco!.pontaInicio).toEqual({ estilo: 'aberta', escala: 2 });
    expect(limitesNaFolha(gerarPredefinicao('circulo', caixa)[0])!.largura).toBeCloseTo(60, 9);
    expect(gerarPredefinicao('linha-horizontal', { x: 0, y: 5, largura: 50, altura: 0 })).toHaveLength(1);
    expect(gerarPredefinicao('retangulo', { x: 0, y: 5, largura: 50, altura: 0 })).toEqual([]);
    expect(gerarPredefinicao('nada' as never, caixa)).toEqual([]);
  });

  it('quadro ABNT (NBR 10068): margem esquerda 25 mm e as demais 7 mm no A4', () => {
    expect(DIMENSOES_FOLHA.A4).toEqual([210, 297]);
    expect(margensAbnt('A1').direita).toBe(10);
    expect(caixaDoQuadroAbnt('A4')).toEqual({ x: 25, y: 7, largura: 178, altura: 283 });
    expect(caixaDoQuadroAbnt('A3', 'paisagem')).toEqual({ x: 25, y: 7, largura: 388, altura: 283 });
    expect(caixaDoQuadroAbnt('A4', 'retrato', { esquerda: 10, superior: -1 })).toEqual({ x: 10, y: 7, largura: 193, altura: 283 });
    expect(caixaDoQuadroAbnt('A9' as never)).toBeNull();
  });

  it('é idempotente (mesma entrada, mesma saída) e não muta a caixa', () => {
    const c = { ...caixa };
    expect(gerarPredefinicao('losango', c)).toStrictEqual(gerarPredefinicao('losango', c));
    expect(c).toEqual(caixa);
  });
});

describe('composição com o espaço plano', () => {
  it('escala proporcional a partir do centro equivale a escala em torno do centro', () => {
    const el: ElementoGrafico = criarRetangulo(base, { x: 0, y: 0, largura: 20, altura: 10 })!;
    const c = caixaOrientada(el)!;
    const m = matrizDeEscalaPorAlca(c, 'se', [30, 15], { proporcional: true, doCentro: true })!;
    const esperado = compor(translacao(-10, -5), escala(2), translacao(10, 5));
    perto(aplicar(m, [0, 0]), aplicar(esperado, [0, 0]));
    perto(aplicar(m, [20, 10]), aplicar(esperado, [20, 10]));
  });
});
