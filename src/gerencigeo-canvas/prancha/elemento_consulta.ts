import type { Feicao, Par } from '../feature_types';
import { pontoNoPoligono } from '../feature_algoritmos';
import { feicaoNaCaixa, feicaoNoLaco, type ModoCaixa, type PontoPx } from '../feature_caixa';
import { IndiceEspacial } from '../feature_indice';
import { distSegmentoPx } from '../motor/geometria-px';
import { ESPACO_PLANO } from '../espaco/espaco_plano';
import { contornoNaFolha, envelopeNaFolha, limitesNaFolha, type ContornoElemento } from './elemento_geometria';
import { ESPESSURA_TRACO_PADRAO_MM, aparenciaDe } from './aparencia_estilo';
import type { CaixaMm, CamadaPrancha, ElementoGrafico } from './tipos';
import { mapaDeCamadas, type MapaCamadas } from './camadas';

/*
 * Consultas espaciais na folha (L2, puras): hit-test, caixa Window/Crossing, laço e índice espacial. Caixa e laço
 * reaproveitam `feature_caixa` (o mesmo narrow-phase do mapa) com o contorno do elemento como feição; o índice é o
 * `IndiceEspacial` (R-tree) do kit no espaço plano. Unidades em mm.
 */

/** Espessura padrão do traço quando o elemento não define (mm): a mesma do pintor. */
export const ESPESSURA_PADRAO_MM = ESPESSURA_TRACO_PADRAO_MM;

export interface OpcoesConsulta {
  /** Tolerância em mm somada à meia espessura do traço (padrão 1 mm; a UI converte de px pela escala da vista). */
  tolerancia?: number;
  /** Inclui elementos bloqueados (padrão: não; bloqueado não se seleciona). */
  incluirBloqueados?: boolean;
  /** Camadas da prancha: ordem de empilhamento, camadas ocultas (fora) e bloqueadas (travadas). */
  camadas?: readonly CamadaPrancha[];
}

export interface AcertoElemento {
  elemento: ElementoGrafico;
  /** Distância (mm) ao traço; 0 quando o ponto cai no interior preenchido. */
  distancia: number;
}

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** O elemento tem preenchimento visível? Decide pela mesma aparência resolvida que o pintor usa. */
export function temPreenchimento(el: ElementoGrafico): boolean {
  const p = aparenciaDe(el).preenchimento;
  return !!p && (p.opacidade > 0 || !!p.gradiente);
}

/** Meia espessura do traço em mm (0 sem traço), pela aparência resolvida. */
export function meiaEspessura(el: ElementoGrafico): number {
  const t = aparenciaDe(el).traco;
  return t ? t.largura / 2 : 0;
}

/**
 * Elementos na ordem de pintura (de trás para a frente): pela camada (ordem da lista de camadas; sem camada = por cima),
 * depois `ordem` crescente, empate pela posição na lista.
 */
export function ordenarPorEmpilhamento(elementos: readonly ElementoGrafico[], camadas?: readonly CamadaPrancha[] | MapaCamadas | null): ElementoGrafico[] {
  const mapa = camadas && !Array.isArray(camadas) && typeof (camadas as MapaCamadas).indice === 'function'
    ? (camadas as MapaCamadas)
    : mapaDeCamadas(camadas as readonly CamadaPrancha[] | null | undefined);
  return elementos
    .map((el, i) => ({ el, c: el ? mapa.indice(el) : 0, chave: fin(el?.ordem) ? el.ordem : i, i }))
    .sort((a, b) => a.c - b.c || a.chave - b.chave || a.i - b.i)
    .map((x) => x.el);
}

function distanciaAoContorno(p: Par, c: ContornoElemento): number {
  let menor = Infinity;
  const trechos = c.tipo === 'Polygon' ? c.aneis.map((a) => ({ pts: a, fechado: true })) : (c.partes && c.partes.length > 1 ? c.partes : [c.coordenadas]).map((pts) => ({ pts, fechado: false }));
  for (const { pts, fechado } of trechos) {
    const n = pts.length;
    if (n === 1) menor = Math.min(menor, Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]));
    for (let i = 1; i < n; i++) menor = Math.min(menor, distSegmentoPx(p[0], p[1], pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
    if (fechado && n > 2) menor = Math.min(menor, distSegmentoPx(p[0], p[1], pts[n - 1][0], pts[n - 1][1], pts[0][0], pts[0][1]));
  }
  return menor;
}

/** Selecionável: visível (ele e a camada), não é forma de máscara e, sem `incluirBloqueados`, não travado. */
const selecionavel = (el: ElementoGrafico, incluirBloqueados: boolean, mapa: MapaCamadas): boolean =>
  !!el && !el.mascara && mapa.visivel(el) && (incluirBloqueados || !mapa.travado(el));

/** Distância (mm) do ponto ao elemento se ele é atingido, senão `null`. */
export function testarElemento(el: ElementoGrafico, p: Par, tolerancia = 1): number | null {
  const caixa = limitesNaFolha(el);
  const c = contornoNaFolha(el);
  if (!caixa || !c) return null;
  const folga = (fin(tolerancia) && tolerancia >= 0 ? tolerancia : 1) + meiaEspessura(el);
  if (p[0] < caixa.x - folga || p[0] > caixa.x + caixa.largura + folga || p[1] < caixa.y - folga || p[1] > caixa.y + caixa.altura + folga) return null;
  const interior = c.tipo === 'Polygon' && (temPreenchimento(el) || el.geometria.tipo === 'texto');
  if (interior && pontoNoPoligono(p, c.aneis)) return 0;
  const d = distanciaAoContorno(p, c);
  return d <= folga ? d : null;
}

/** Todos os elementos sob o ponto (mm), do mais à frente para o mais atrás. */
export function elementosNoPonto(p: Par, elementos: readonly ElementoGrafico[], opcoes: OpcoesConsulta = {}): AcertoElemento[] {
  if (!fin(p?.[0]) || !fin(p?.[1])) return [];
  const inclui = opcoes.incluirBloqueados === true;
  const mapa = mapaDeCamadas(opcoes.camadas);
  const saida: AcertoElemento[] = [];
  const ordem = ordenarPorEmpilhamento(elementos, mapa);
  for (let i = ordem.length - 1; i >= 0; i--) {
    const el = ordem[i];
    if (!selecionavel(el, inclui, mapa)) continue;
    const d = testarElemento(el, p, opcoes.tolerancia);
    if (d !== null) saida.push({ elemento: el, distancia: d });
  }
  return saida;
}

/** O elemento mais à frente sob o ponto, ou `null`. */
export function elementoNoTopo(p: Par, elementos: readonly ElementoGrafico[], opcoes: OpcoesConsulta = {}): ElementoGrafico | null {
  return elementosNoPonto(p, elementos, opcoes)[0]?.elemento ?? null;
}

/** O elemento como feição do núcleo (contorno na folha), para reaproveitar caixa, laço, snap e índice. */
export function feicaoDoElemento(el: ElementoGrafico): Feicao | null {
  const c = contornoNaFolha(el);
  if (!c) return null;
  const f: Feicao = { id: el.id, camadaId: el.camadaId ?? '', geometria: c, propriedades: {} };
  if (el.oculto) f.oculta = true;
  if (el.bloqueado) f.bloqueada = true;
  return f;
}

const projetorIdentidade = (p: Par): PontoPx => ({ x: p[0], y: p[1] });

/** Seleção por caixa (mm): `window` exige o elemento inteiro dentro; `crossing`, que toque. */
export function elementosNaCaixa(caixa: CaixaMm, elementos: readonly ElementoGrafico[], modo: ModoCaixa, opcoes: OpcoesConsulta = {}): ElementoGrafico[] {
  if (!caixa || ![caixa.x, caixa.y, caixa.largura, caixa.altura].every(fin)) return [];
  const c = {
    x1: Math.min(caixa.x, caixa.x + caixa.largura), y1: Math.min(caixa.y, caixa.y + caixa.altura),
    x2: Math.max(caixa.x, caixa.x + caixa.largura), y2: Math.max(caixa.y, caixa.y + caixa.altura)
  };
  const inclui = opcoes.incluirBloqueados === true;
  const mapa = mapaDeCamadas(opcoes.camadas);
  return elementos.filter((el) => {
    if (!selecionavel(el, inclui, mapa)) return false;
    const f = feicaoDoElemento(el);
    return !!f && feicaoNaCaixa(f, c, projetorIdentidade, modo, ESPACO_PLANO);
  });
}

/** Seleção por laço (polígono em mm). */
export function elementosNoLaco(laco: readonly Par[], elementos: readonly ElementoGrafico[], opcoes: OpcoesConsulta = {}): ElementoGrafico[] {
  if (!Array.isArray(laco) || laco.length < 3) return [];
  const inclui = opcoes.incluirBloqueados === true;
  const mapa = mapaDeCamadas(opcoes.camadas);
  const l = laco.filter((p) => fin(p?.[0]) && fin(p?.[1])).map((p): Par => [p[0], p[1]]);
  return elementos.filter((el) => {
    if (!selecionavel(el, inclui, mapa)) return false;
    const f = feicaoDoElemento(el);
    return !!f && feicaoNoLaco(f, l);
  });
}

/** Feição-envelope (retângulo do `envelopeNaFolha`) para o índice: não calcula o contorno inteiro do elemento. */
function feicaoDoEnvelope(el: ElementoGrafico): Feicao | null {
  const e = envelopeNaFolha(el);
  if (!e) return null;
  const x1 = e.x + e.largura;
  const y1 = e.y + e.altura;
  return { id: el.id, camadaId: el.camadaId ?? '', geometria: { tipo: 'Polygon', aneis: [[[e.x, e.y], [x1, e.y], [x1, y1], [e.x, y1]]] }, propriedades: {} };
}

/**
 * Índice espacial dos elementos (R-tree do kit no espaço plano). Mantém o elemento atual de cada id; atualizações
 * incrementais. Indexa o envelope conservador (`envelopeNaFolha`, 4 cantos): arrastar milhares de elementos não recalcula
 * contornos; quem consulta faz o teste fino. Atenção aos rótulos herdados de `CaixaGeo`: lat ↔ x e lon ↔ y.
 */
export class IndicePrancha {
  private readonly indice = new IndiceEspacial(ESPACO_PLANO);
  private readonly elementos = new Map<string, ElementoGrafico>();

  public get tamanho(): number {
    return this.elementos.size;
  }

  public definir(elementos: readonly ElementoGrafico[]): void {
    this.elementos.clear();
    const feicoes: Feicao[] = [];
    for (const el of elementos) {
      const f = el ? feicaoDoEnvelope(el) : null;
      if (!f) continue;
      this.elementos.set(el.id, el);
      feicoes.push(f);
    }
    this.indice.construir(feicoes);
  }

  public atualizar(el: ElementoGrafico): void {
    const f = el ? feicaoDoEnvelope(el) : null;
    if (!f) {
      if (el?.id) this.remover(el.id);
      return;
    }
    this.elementos.set(el.id, el);
    this.indice.atualizar(f);
  }

  /**
   * Atualiza um lote (ex.: soltar uma seleção arrastada). Acima de 10% do índice remonta tudo de uma vez, que sai mais
   * barato que milhares de atualizações incrementais (cada compactação remontaria a árvore).
   */
  public atualizarVarios(lote: readonly ElementoGrafico[]): void {
    if (lote.length > Math.max(32, this.elementos.size * 0.1)) {
      const todos = new Map(this.elementos);
      for (const el of lote) if (el?.id) todos.set(el.id, el);
      this.definir([...todos.values()]);
      return;
    }
    for (const el of lote) this.atualizar(el);
  }

  public remover(id: string): void {
    this.elementos.delete(id);
    this.indice.remover(id);
  }

  public obter(id: string): ElementoGrafico | undefined {
    return this.elementos.get(id);
  }

  /** Elementos cujo envelope (conservador) toca a caixa (mm): candidatos para o teste fino. */
  public consultarCaixa(c: CaixaMm, folga = 0): ElementoGrafico[] {
    if (!c || ![c.x, c.y, c.largura, c.altura, folga].every(fin)) return [];
    const ids = this.indice.consultar({
      minLat: Math.min(c.x, c.x + c.largura) - folga, maxLat: Math.max(c.x, c.x + c.largura) + folga,
      minLon: Math.min(c.y, c.y + c.altura) - folga, maxLon: Math.max(c.y, c.y + c.altura) + folga
    });
    const saida: ElementoGrafico[] = [];
    for (const id of new Set(ids)) {
      const el = this.elementos.get(id);
      if (el) saida.push(el);
    }
    return saida;
  }

  /** Candidatos perto do ponto (mm), para o hit-test e o snap não percorrerem todos. */
  public consultarPonto(p: Par, raio: number): ElementoGrafico[] {
    return this.consultarCaixa({ x: p[0], y: p[1], largura: 0, altura: 0 }, fin(raio) && raio > 0 ? raio : 0);
  }
}
