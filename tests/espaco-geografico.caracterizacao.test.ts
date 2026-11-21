// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  areaDaGeometria, areaMetros2, comprimentoMetros, distanciaMetros, extensaoDaGeometria, formatarArea, formatarExtensao,
  limitesDaGeometria, metrosPorGrau, textoRotulo
} from '../src/gerencigeo-canvas/feature_metricas';
import { gerarElipse, gerarEstrela, gerarPoligonoRegular } from '../src/gerencigeo-canvas/feature_formas';
import {
  deslocarGeometria, dividirPoligonoComLinha, gerarBuffer, juntarLinhas, juntarPoligonos, pontoNoPoligono
} from '../src/gerencigeo-canvas/feature_algoritmos';
import {
  alcaLatente, alternarSuavidade, comPontos, inserirPonto, moverAlca, pontoDaBordaDoCirculo, pontoMedioDoSegmento, pontosDe,
  removerPonto
} from '../src/gerencigeo-canvas/feature_edicao_ops';
import { amostrarCurva, caminhoSvg, normalizarNos, passosDaCurva } from '../src/gerencigeo-canvas/feature_curvas';
import { feicaoNaCaixa, feicaoNoLaco, type Projetor } from '../src/gerencigeo-canvas/feature_caixa';
import { buscarSnap } from '../src/gerencigeo-canvas/feature_snap';
import { feicaoNoPonto } from '../src/gerencigeo-canvas/feature_amostra';
import { SessaoDesenho, type Ferramenta } from '../src/gerencigeo-canvas/feature_desenho';
import { IndiceEspacial, caixaDaFeicao } from '../src/gerencigeo-canvas/feature_indice';
import { escalaLatitude, simplificarGeometria } from '../src/gerencigeo-canvas/feature_simplificacao';
import { diagonalPx, projetarMercator } from '../src/gerencigeo-canvas/feature_lod';
import { latLonDoMundo, metrosPorPixel, projetarVertices, raioCirculoPx, simplificarPx } from '../src/gerencigeo-canvas/motor/geometria-px';
import { TIPOS_LINHA, dashTipoLinha } from '../src/gerencigeo-canvas/motor/tipos-linha';
import type { Feicao, GeometriaFeicao, LatLonPar, NoCurva } from '../src/gerencigeo-canvas/feature_types';

/*
 * Prancha, Fase 0: caracterização "golden" do espaço geográfico de hoje.
 *
 * Cada caso grava a saída EXATA (bit a bit: doubles em JSON fazem ida e volta sem perda) das funções que a Fase 1 vai
 * generalizar para o conceito de `Espaco` (geográfico | plano). O padrão continua geográfico, então estas saídas não podem
 * mudar nem no último bit. Se um caso falhar depois de uma refatoração, o comportamento geográfico mudou: decida e registre
 * no CHANGELOG antes de regravar.
 *
 * Roda em Node (diretiva acima): também prova que todos estes módulos importam sem DOM e sem Leaflet.
 *
 * Regravar (só quando a mudança for intencional):  ATUALIZAR_GOLDEN=1 npx vitest run tests/espaco-geografico.caracterizacao.test.ts
 */

const ARQUIVO_GOLDEN = path.resolve(__dirname, 'fixtures', 'espaco-geografico.golden.json');

/** JSON sem perda: NaN, ±Infinity e -0 viram marcadores; Float64Array vira array. */
function normalizar(v: unknown): unknown {
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return { $n: 'NaN' };
    if (v === Infinity) return { $n: 'Infinity' };
    if (v === -Infinity) return { $n: '-Infinity' };
    if (Object.is(v, -0)) return { $n: '-0' };
    return v;
  }
  if (v === undefined) return { $u: true };
  if (v === null || typeof v !== 'object') return v;
  if (ArrayBuffer.isView(v)) return Array.from(v as unknown as ArrayLike<number>, normalizar);
  if (Array.isArray(v)) return v.map(normalizar);
  if (v instanceof Set) return { $set: [...v].map(normalizar) };
  const saida: Record<string, unknown> = {};
  for (const k of Object.keys(v as Record<string, unknown>).sort()) saida[k] = normalizar((v as Record<string, unknown>)[k]);
  return saida;
}

function executar(fn: () => unknown): unknown {
  try {
    return normalizar(fn());
  } catch (e) {
    return { $erro: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

// ---------- dados de entrada (fixos) ----------

const SP: LatLonPar = [-23.5, -46.6];
const EQ: LatLonPar = [0, 0];
const NORTE: LatLonPar = [60, 10];
const RJ: LatLonPar = [-22.9, -43.2];

/** Quadrado de ~220 m em SP, anti-horário em (lon, lat). */
const quadSP: LatLonPar[] = [[-23.501, -46.601], [-23.501, -46.599], [-23.499, -46.599], [-23.499, -46.601]];
const furoSP: LatLonPar[] = [[-23.5005, -46.6005], [-23.4995, -46.6005], [-23.4995, -46.5995], [-23.5005, -46.5995]];
const vizinhoSP: LatLonPar[] = [[-23.501, -46.599], [-23.501, -46.597], [-23.499, -46.597], [-23.499, -46.599]];
const linhaSP: LatLonPar[] = [[-23.5, -46.601], [-23.5, -46.6], [-23.499, -46.599]];

const nosCurva: NoCurva[] = [
  { ponto: [-23.5, -46.601], saida: [-23.4995, -46.6005] },
  { ponto: [-23.5, -46.599], entrada: [-23.4995, -46.5995], saida: [-23.5005, -46.5985] },
  { ponto: [-23.501, -46.598] }
];
const nosCurvaFechada: NoCurva[] = [
  { ponto: [-23.501, -46.601], saida: [-23.5012, -46.6] },
  { ponto: [-23.501, -46.599] },
  { ponto: [-23.499, -46.599], entrada: [-23.4988, -46.6] },
  { ponto: [-23.499, -46.601] }
];

const gPonto: GeometriaFeicao = { tipo: 'Point', coordenada: SP };
const gTexto: GeometriaFeicao = { tipo: 'Text', coordenada: SP, texto: 'Rótulo <b>x</b>' };
const gLinha: GeometriaFeicao = { tipo: 'LineString', coordenadas: linhaSP };
const gMulti: GeometriaFeicao = { tipo: 'LineString', coordenadas: linhaSP, partes: [linhaSP, [[-23.502, -46.601], [-23.502, -46.598]]] };
const gPoligono: GeometriaFeicao = { tipo: 'Polygon', aneis: [quadSP] };
const gPoligonoFuro: GeometriaFeicao = { tipo: 'Polygon', aneis: [quadSP, furoSP] };
const gCirculo: GeometriaFeicao = { tipo: 'Circle', centro: SP, raioMetros: 100 };
const gCirculoNorte: GeometriaFeicao = { tipo: 'Circle', centro: NORTE, raioMetros: 250 };
const gCirculoPolo: GeometriaFeicao = { tipo: 'Circle', centro: [89.9999, 0], raioMetros: 50 };
const gLinhaCurva: GeometriaFeicao = { tipo: 'LineString', coordenadas: amostrarCurva(nosCurva, false), curva: nosCurva };
const gPoligonoCurvo: GeometriaFeicao = { tipo: 'Polygon', aneis: [amostrarCurva(nosCurvaFechada, true)], curva: nosCurvaFechada };

const TODAS: Record<string, GeometriaFeicao> = {
  ponto: gPonto, texto: gTexto, linha: gLinha, multilinha: gMulti, poligono: gPoligono, poligonoFuro: gPoligonoFuro,
  circulo: gCirculo, circuloNorte: gCirculoNorte, circuloPolo: gCirculoPolo, linhaCurva: gLinhaCurva, poligonoCurvo: gPoligonoCurvo
};

const feicao = (id: string, g: GeometriaFeicao, extra: Partial<Feicao> = {}): Feicao => ({ id, camadaId: 'c', geometria: g, propriedades: { name: `nome-${id}` }, ...extra });
const FEICOES: Feicao[] = Object.entries(TODAS).map(([id, g]) => feicao(id, g));

/** Projetor linear de teste: 1 px = 0,00001° (≈ 1,1 m), y para baixo, origem em SP. */
const projetar: Projetor = (p) => ({ x: (p[1] - SP[1]) * 1e5, y: -(p[0] - SP[0]) * 1e5 });

// ---------- casos ----------

const CASOS: Record<string, () => unknown> = {
  // feature_metricas
  'metricas/metrosPorGrau': () => [0, -23.5, 45, 60, 89.9, -90].map((lat) => metrosPorGrau(lat)),
  'metricas/distanciaMetros': () => [
    distanciaMetros(SP, [-23.501, -46.598]),
    distanciaMetros(SP, RJ),
    distanciaMetros(SP, SP),
    distanciaMetros([0, 179.95], [0, -179.95]),
    distanciaMetros(EQ, [0.05, 0.05]),
    distanciaMetros(NORTE, [60.2, 10.3])
  ],
  'metricas/comprimentoMetros': () => [comprimentoMetros(quadSP), comprimentoMetros(quadSP, true), comprimentoMetros([SP]), comprimentoMetros([])],
  'metricas/areaMetros2': () => [areaMetros2([quadSP]), areaMetros2([quadSP, furoSP]), areaMetros2([[SP, RJ]]), areaMetros2([])],
  'metricas/areaDaGeometria': () => Object.fromEntries(Object.entries(TODAS).map(([k, g]) => [k, areaDaGeometria(g)])),
  'metricas/extensaoDaGeometria': () => Object.fromEntries(Object.entries(TODAS).map(([k, g]) => [k, extensaoDaGeometria(g)])),
  'metricas/limitesDaGeometria': () => Object.fromEntries(Object.entries(TODAS).map(([k, g]) => [k, limitesDaGeometria(g)])),
  'metricas/textoRotulo': () => FEICOES.map((f) => [textoRotulo(f), textoRotulo(f, 'area'), textoRotulo(f, 'extensao'), textoRotulo(f, 'id')]),
  'metricas/formatar': () => [formatarArea(12345.678), formatarArea(0), formatarExtensao(999.994), formatarExtensao(1234.5)],

  // feature_formas (correções de cos(lat))
  'formas/gerarElipse': () => [gerarElipse(SP, [-23.499, -46.598]), gerarElipse(NORTE, [60.001, 10.004]), gerarElipse(SP, SP), gerarElipse(SP, [-23.5, -46.599])],
  'formas/gerarPoligonoRegular': () => [
    gerarPoligonoRegular(SP, [-23.499, -46.599]),
    gerarPoligonoRegular(NORTE, [60.001, 10.001], 5),
    gerarPoligonoRegular(EQ, [0.001, 0], 3),
    gerarPoligonoRegular(SP, [-23.499, -46.599], 2),
    gerarPoligonoRegular(SP, SP)
  ],
  'formas/gerarEstrela': () => [gerarEstrela(SP, [-23.499, -46.6]), gerarEstrela(NORTE, [60.001, 10.002], 7), gerarEstrela(SP, [-23.499, -46.6], 2)],

  // feature_algoritmos (projeção local, buffer, deslocamento)
  'algoritmos/pontoNoPoligono': () => [
    pontoNoPoligono(SP, [quadSP]), pontoNoPoligono(SP, [quadSP, furoSP]), pontoNoPoligono([-23.5008, -46.6008], [quadSP, furoSP]),
    pontoNoPoligono([-23.6, -46.6], [quadSP]), pontoNoPoligono(SP, [])
  ],
  'algoritmos/dividirPoligonoComLinha': () => [
    dividirPoligonoComLinha(quadSP, [[-23.502, -46.6], [-23.498, -46.6]]),
    dividirPoligonoComLinha(quadSP, [[-23.502, -46.6005], [-23.498, -46.6005], [-23.498, -46.5995], [-23.502, -46.5995]]),
    dividirPoligonoComLinha(quadSP, [[-23.6, -46.6], [-23.7, -46.6]])
  ],
  'algoritmos/juntarLinhas': () => [
    juntarLinhas([linhaSP, [[-23.499, -46.599], [-23.498, -46.599]]]),
    juntarLinhas([linhaSP, [[-23.4989, -46.599], [-23.498, -46.599]]], 20),
    juntarLinhas([linhaSP, [[-23.4989, -46.599], [-23.498, -46.599]]], 1),
    juntarLinhas([[[-23.498, -46.599], [-23.499, -46.599]], linhaSP])
  ],
  'algoritmos/juntarPoligonos': () => [juntarPoligonos(quadSP, vizinhoSP), juntarPoligonos(quadSP, furoSP), juntarPoligonos(quadSP, vizinhoSP.map(([a, b]) => [a, b + 0.0001] as LatLonPar), 5)],
  'algoritmos/gerarBuffer': () => [
    gerarBuffer(gPonto, 10), gerarBuffer(gTexto, 3), gerarBuffer(gCirculo, 5), gerarBuffer(gCirculo, -200), gerarBuffer(gCirculoNorte, 1),
    gerarBuffer(gLinha, 5), gerarBuffer(gLinha, -5), gerarBuffer(gMulti, 5),
    gerarBuffer(gPoligono, 5), gerarBuffer(gPoligono, -5), gerarBuffer({ tipo: 'Polygon', aneis: [[...quadSP].reverse()] }, 5),
    gerarBuffer(gPoligono, 0), gerarBuffer(gPoligono, NaN)
  ],
  'algoritmos/deslocarGeometria': () => Object.fromEntries(Object.entries(TODAS).map(([k, g]) => [k, deslocarGeometria(g, 12.5, -7.25)])),

  // feature_curvas (aritmética de pares, sem métrica)
  'curvas/amostrarCurva': () => [amostrarCurva(nosCurva, false), amostrarCurva(nosCurvaFechada, true), amostrarCurva(nosCurva, false, 4), amostrarCurva([], false)],
  'curvas/passosDaCurva': () => [passosDaCurva(nosCurva, false), passosDaCurva(nosCurvaFechada, true)],
  'curvas/caminhoSvg': () => [caminhoSvg(nosCurva, false, projetar), caminhoSvg(nosCurvaFechada, true, projetar)],
  'curvas/normalizarNos': () => [normalizarNos(nosCurva), normalizarNos([{ ponto: [1, 2] }, { ponto: [3, 4] }]), normalizarNos([{ ponto: [NaN, 1], saida: [0, 0] }, { ponto: [1, 1] }])],

  // feature_edicao_ops (círculo em metros, alças)
  'edicao/pontoDaBordaDoCirculo': () => [pontoDaBordaDoCirculo(SP, 100), pontoDaBordaDoCirculo(NORTE, 250), pontoDaBordaDoCirculo([89.9999, 0], 50), pontoDaBordaDoCirculo(EQ, 0)],
  'edicao/pontosDe': () => Object.fromEntries(Object.entries(TODAS).map(([k, g]) => [k, pontosDe(g)])),
  'edicao/comPontos': () => [
    comPontos(gCirculo, [SP, [-23.5, -46.599]]),
    comPontos(gCirculo, [SP, SP]),
    comPontos(gCirculo, [SP]),
    comPontos(gLinhaCurva, [[-23.5, -46.6015], [-23.5, -46.599], [-23.501, -46.598]]),
    comPontos(gPoligono, [quadSP[0], quadSP[1], quadSP[2]])
  ],
  'edicao/inserirRemoverPonto': () => [
    inserirPonto(gLinhaCurva, 0, [-23.4997, -46.6]), inserirPonto(gPoligonoCurvo, 3, [-23.5, -46.6012]), inserirPonto(gLinha, 1, [-23.4995, -46.5995]),
    removerPonto(gLinhaCurva, 1), removerPonto(gPoligono, 0), removerPonto({ tipo: 'Polygon', aneis: [quadSP.slice(0, 3)] }, 0)
  ],
  'edicao/pontoMedioDoSegmento': () => [pontoMedioDoSegmento(gLinhaCurva, 0, 1), pontoMedioDoSegmento(gLinhaCurva, 1, 2), pontoMedioDoSegmento(gPoligono, 3, 0)],
  'edicao/alcas': () => [
    alcaLatente(gPoligono, 0, 'saida'), alcaLatente(gPoligono, 0, 'entrada'), alcaLatente(gLinha, 0, 'entrada'),
    moverAlca(gPoligono, 1, 'saida', [-23.5012, -46.5985]), moverAlca(gLinhaCurva, 1, 'entrada', [-23.4993, -46.5996], false),
    alternarSuavidade(gPoligono, 2), alternarSuavidade(gLinha, 0), alternarSuavidade(gLinhaCurva, 1)
  ],

  // feature_caixa (raio do círculo em px por 111320 m/grau)
  'caixa/feicaoNaCaixa': () => {
    const caixas = [
      { x1: -150, y1: -150, x2: 150, y2: 150 }, { x1: -50, y1: -50, x2: 50, y2: 50 }, { x1: 5, y1: 5, x2: 30, y2: 30 },
      { x1: 1000, y1: 1000, x2: 1100, y2: 1100 }
    ];
    return FEICOES.map((f) => caixas.map((c) => [feicaoNaCaixa(f, c, projetar, 'window'), feicaoNaCaixa(f, c, projetar, 'crossing')]));
  },
  'caixa/feicaoNoLaco': () => {
    const laco: LatLonPar[] = [[-23.5015, -46.6015], [-23.5015, -46.5995], [-23.4995, -46.5995], [-23.4995, -46.6015]];
    return FEICOES.map((f) => [feicaoNoLaco(f, laco), feicaoNoLaco(f, laco.slice(0, 2))]);
  },

  // feature_snap e feature_amostra (projetor injetado)
  'snap/buscarSnap': () => {
    const cands = [feicao('q', gPoligono), feicao('l', gLinha), feicao('lc', gLinhaCurva), feicao('c', gCirculo)];
    const cursores = [{ x: 0, y: 0 }, { x: 99, y: 101 }, { x: 0, y: 99 }, { x: -100, y: 30 }, { x: 103, y: -98 }, { x: 500, y: 500 }];
    return [
      ...cursores.map((cur) => buscarSnap(cur, cands, projetar)),
      buscarSnap({ x: 99, y: 101 }, cands, projetar, { vertice: false }),
      buscarSnap({ x: 99, y: 101 }, cands, projetar, { toleranciaPx: 2 }),
      buscarSnap({ x: 100, y: 100 }, cands, projetar, {}, { feicaoId: 'q', vertice: 2 })
    ];
  },
  'amostra/feicaoNoPonto': () => {
    const cursores = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: -60, y: 2 }, { x: 0, y: 200 }, { x: 0, y: 95 }];
    return cursores.map((cur) => feicaoNoPonto(cur, FEICOES, projetar)?.id ?? null);
  },

  // feature_desenho (raio do círculo em metros, comprimento geodésico)
  'desenho/SessaoDesenho': () => {
    const rodar = (ferramenta: Ferramenta, cliques: LatLonPar[], cursor?: LatLonPar, fechar = false) => {
      const s = new SessaoDesenho(ferramenta, fechar);
      const res = cliques.map((c) => s.clicar(c));
      if (cursor) s.mover(cursor);
      return { res, previa: s.previa(), concluir: s.concluir(), comprimento: s.comprimentoMetros() };
    };
    return {
      circulo: rodar('circulo', [SP, [-23.5, -46.599]]),
      circuloCurto: rodar('circulo', [SP, [-23.5, -46.60001]]),
      previaCirculo: rodar('circulo', [SP], [-23.499, -46.6]),
      retangulo: rodar('retangulo', [SP, [-23.499, -46.598]]),
      retanguloAlinhado: rodar('retangulo', [SP, [-23.5, -46.598]]),
      elipse: rodar('elipse', [SP, [-23.499, -46.598]]),
      poligonoRegular: rodar('poligono-regular', [SP, [-23.499, -46.598]]),
      estrela: rodar('estrela', [NORTE, [60.001, 10.002]]),
      linha: rodar('linha', [SP, [-23.499, -46.599], [-23.499, -46.599], [-23.498, -46.6]], [-23.4975, -46.601]),
      poligono: rodar('poligono', quadSP, [-23.5, -46.6]),
      medir: rodar('medir-distancia', [SP, RJ])
    };
  },
  'desenho/caneta': () => {
    const s = new SessaoDesenho('caneta');
    s.clicar(SP);
    s.definirAlca([-23.4995, -46.5995]);
    s.clicar([-23.5, -46.598]);
    s.clicar([-23.501, -46.597]);
    s.definirAlca([-23.5015, -46.5965]);
    s.moverAlcaDaAncora(1, 'entrada', [-23.4992, -46.5983], false);
    s.mover([-23.502, -46.596]);
    return { previa: s.previa(), concluir: s.concluir(), fechando: s.concluirFechando(), comprimento: s.comprimentoMetros() };
  },

  // feature_indice (envelope em graus; círculo por 111320 e cos(lat))
  'indice/caixaDaFeicao': () => FEICOES.map((f) => caixaDaFeicao(f)),
  'indice/consultar': () => {
    const ind = new IndiceEspacial();
    ind.construir(FEICOES);
    return [
      ind.consultar({ minLon: -46.6, minLat: -23.5, maxLon: -46.6, maxLat: -23.5 }).sort(),
      ind.consultar({ minLon: -46.5995, minLat: -23.5005, maxLon: -46.5985, maxLat: -23.4995 }).sort(),
      ind.consultar({ minLon: 9, minLat: 59, maxLon: 11, maxLat: 61 }).sort()
    ];
  },

  // feature_simplificacao (tolerância em graus, escala por latitude)
  'simplificacao/simplificarGeometria': () => {
    const ruido: LatLonPar[] = Array.from({ length: 60 }, (_, i) => [-23.5 + Math.sin(i * 1.7) * 0.00002, -46.6 + i * 0.0001]);
    const anel: LatLonPar[] = Array.from({ length: 40 }, (_, i) => [-23.5 + 0.001 * Math.sin((i * Math.PI) / 20) + Math.cos(i * 3.1) * 0.000005, -46.6 + 0.001 * Math.cos((i * Math.PI) / 20)]);
    return [
      simplificarGeometria({ tipo: 'LineString', coordenadas: ruido }, 12),
      simplificarGeometria({ tipo: 'LineString', coordenadas: ruido }, 16),
      simplificarGeometria({ tipo: 'Polygon', aneis: [anel] }, 13),
      simplificarGeometria({ tipo: 'LineString', coordenadas: ruido.map(([a, b]) => [a + 83.5, b] as LatLonPar) }, 12),
      [0, -23.5, 60, 85, 89, NaN].map(escalaLatitude)
    ];
  },

  // motor/geometria-px e feature_lod (Web Mercator)
  'mercator/projecoes': () => [
    projetarVertices([SP, EQ, NORTE, [90, 180], [-90, -180]], 17),
    metrosPorPixel(-23.5, 17), metrosPorPixel(60, 3), metrosPorPixel(90, 10),
    raioCirculoPx(-23.5, 100, 17), raioCirculoPx(0, -5, 10), raioCirculoPx(NaN, 5, 10),
    latLonDoMundo(12345.6, 23456.7, 8),
    projetarMercator(-23.5, -46.6, 17), diagonalPx({ minLat: -23.501, minLon: -46.601, maxLat: -23.499, maxLon: -46.599 }, 15),
    simplificarPx(projetarVertices(Array.from({ length: 30 }, (_, i) => [-23.5 + Math.sin(i) * 0.00001, -46.6 + i * 0.0001] as LatLonPar), 15), 1.2, false)
  ],

  // motor/tipos-linha (padrões em px, crescem com a espessura)
  'tiposLinha/dashTipoLinha': () => TIPOS_LINHA.map((t) => [
    t, dashTipoLinha(t, 1), dashTipoLinha(t, 3), dashTipoLinha(t, 0.25), dashTipoLinha(t, 3, 2, 'butt'), dashTipoLinha(t, 2, 0.5, 'square')
  ])
};

// ---------- execução ----------

const atual = Object.fromEntries(Object.entries(CASOS).map(([k, fn]) => [k, executar(fn)]));

if (process.env.ATUALIZAR_GOLDEN === '1') {
  fs.mkdirSync(path.dirname(ARQUIVO_GOLDEN), { recursive: true });
  fs.writeFileSync(ARQUIVO_GOLDEN, `${JSON.stringify(atual, null, 1)}\n`, 'utf-8');
}

const golden: Record<string, unknown> = fs.existsSync(ARQUIVO_GOLDEN) ? JSON.parse(fs.readFileSync(ARQUIVO_GOLDEN, 'utf-8')) : {};

describe('espaço geográfico: caracterização bit a bit (golden)', () => {
  it('o arquivo golden existe e cobre exatamente os casos', () => {
    expect(fs.existsSync(ARQUIVO_GOLDEN)).toBe(true);
    expect(Object.keys(golden).sort()).toEqual(Object.keys(CASOS).sort());
  });

  for (const nome of Object.keys(CASOS)) {
    it(nome, () => {
      expect(atual[nome]).toStrictEqual(golden[nome]);
    });
  }

  it('é determinístico: rodar de novo dá o mesmo resultado (idempotência)', () => {
    for (const [nome, fn] of Object.entries(CASOS)) expect(executar(fn), nome).toStrictEqual(atual[nome]);
  });

  it('as entradas não foram mutadas pelos casos', () => {
    expect(quadSP).toEqual([[-23.501, -46.601], [-23.501, -46.599], [-23.499, -46.599], [-23.499, -46.601]]);
    expect(nosCurva[1]).toEqual({ ponto: [-23.5, -46.599], entrada: [-23.4995, -46.5995], saida: [-23.5005, -46.5985] });
    expect(gCirculo).toEqual({ tipo: 'Circle', centro: SP, raioMetros: 100 });
  });
});
