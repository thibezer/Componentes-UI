import type { Par } from '../feature_types';
import { aplicar, determinante, inverter } from '../espaco/espaco_matriz';
import { matrizDoElemento, raiosCabiveis } from './elemento_geometria';
import type { ElementoGrafico, RaiosCantos } from './tipos';

/*
 * Cantos arredondados "ao vivo" do retângulo (L2, puro): as marcas de canto que a tela mostra dentro de cada canto e o raio
 * que resulta de arrastá-las, como nos editores vetoriais. A marca fica a `max(raio, mínimo)` do canto, nos dois eixos
 * (no centro do arco); arrastar para dentro aumenta o raio, para fora diminui, até 0 e até metade do menor lado.
 * Índices dos cantos: 0 superior esquerdo, 1 superior direito, 2 inferior direito, 3 inferior esquerdo.
 */

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

type Retangulo = Extract<ElementoGrafico['geometria'], { tipo: 'retangulo' }>;

/** Canto local e direção para dentro (unitária em cada eixo) do canto `i`. */
function canto(g: Retangulo, i: number): { c: Par; d: Par } {
  const x = g.largura / 2;
  const y = g.altura / 2;
  const tabela: Array<{ c: Par; d: Par }> = [
    { c: [-x, -y], d: [1, 1] }, { c: [x, -y], d: [-1, 1] }, { c: [x, y], d: [-1, -1] }, { c: [-x, y], d: [1, -1] }
  ];
  return tabela[i];
}

const ehRetanguloValido = (el: ElementoGrafico | null | undefined): el is ElementoGrafico & { geometria: Retangulo } =>
  !!el && el.geometria?.tipo === 'retangulo' && fin(el.geometria.largura) && fin(el.geometria.altura) && el.geometria.largura > 0 && el.geometria.altura > 0;

/** Escala média da matriz (para converter o mínimo em mm da folha para unidades locais). */
function escalaMedia(el: ElementoGrafico): number {
  const s = Math.sqrt(Math.abs(determinante(matrizDoElemento(el))));
  return fin(s) && s > 1e-9 ? s : 1;
}

/** Raios efetivos (os que cabem) do retângulo. */
export function raiosEfetivos(el: ElementoGrafico): RaiosCantos | null {
  if (!ehRetanguloValido(el)) return null;
  return raiosCabiveis(el.geometria.largura, el.geometria.altura, el.geometria.raios);
}

/**
 * Posições na folha das quatro marcas de canto, ou `null` (não é retângulo, está bloqueado ou degenerado). `minimoMm` é a
 * distância mínima do canto na folha (a tela passa o equivalente a ~12 px), para a marca não encostar na alça de escala.
 */
export function marcasDosCantos(el: ElementoGrafico, minimoMm: number): [Par, Par, Par, Par] | null {
  if (!ehRetanguloValido(el) || el.bloqueado) return null;
  const r = raiosEfetivos(el)!;
  const g = el.geometria;
  const minimo = fin(minimoMm) && minimoMm > 0 ? Math.min(minimoMm / escalaMedia(el), Math.min(g.largura, g.altura) / 2) : 0;
  const m = matrizDoElemento(el);
  return [0, 1, 2, 3].map((i) => {
    const { c, d } = canto(g, i);
    const k = Math.max(r[i], minimo);
    return aplicar(m, [c[0] + d[0] * k, c[1] + d[1] * k]);
  }) as [Par, Par, Par, Par];
}

/** Quanto o ponto (folha) está "para dentro" do canto `i`, em unidades locais (média dos dois eixos). */
export function profundidadeNoCanto(el: ElementoGrafico, i: number, p: Par): number | null {
  if (!ehRetanguloValido(el) || !Number.isInteger(i) || i < 0 || i > 3 || !fin(p?.[0]) || !fin(p?.[1])) return null;
  const inv = inverter(matrizDoElemento(el));
  if (!inv) return null;
  const q = aplicar(inv, p);
  const { c, d } = canto(el.geometria, i);
  return ((q[0] - c[0]) * d[0] + (q[1] - c[1]) * d[1]) / 2;
}

/**
 * Elemento com os raios trocados: `indice` = só aquele canto, `null` = os quatro. O raio fica entre 0 e metade do menor lado.
 * `null` se não for retângulo válido, estiver bloqueado ou o raio não for finito.
 */
export function comRaioDeCanto(el: ElementoGrafico, indice: number | null, raio: number): ElementoGrafico | null {
  if (!ehRetanguloValido(el) || el.bloqueado || !fin(raio)) return null;
  const g = el.geometria;
  const r = Math.min(Math.max(0, raio), Math.min(g.largura, g.altura) / 2);
  const atuais = raiosEfetivos(el)!;
  const novos = (indice === null ? [r, r, r, r] : atuais.map((v, i) => (i === indice ? r : v))) as RaiosCantos;
  const geometria: Retangulo = novos.some((v) => v > 0)
    ? { tipo: 'retangulo', largura: g.largura, altura: g.altura, raios: novos }
    : { tipo: 'retangulo', largura: g.largura, altura: g.altura };
  return { ...el, geometria };
}

/** Raios definidos (número = os quatro iguais) para o retângulo; `null` se não se aplica. */
export function definirRaiosDoRetangulo(el: ElementoGrafico, raios: RaiosCantos | number): ElementoGrafico | null {
  if (typeof raios === 'number') return comRaioDeCanto(el, null, raios);
  if (!Array.isArray(raios) || raios.length !== 4 || !raios.every(fin)) return null;
  let atual: ElementoGrafico | null = el;
  for (let i = 0; i < 4 && atual; i++) atual = comRaioDeCanto(atual, i, raios[i]);
  return atual;
}
