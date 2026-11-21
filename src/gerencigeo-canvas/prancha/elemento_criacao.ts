import type { GeometriaFeicao, Par } from '../feature_types';
import { translacao } from '../espaco/espaco_matriz';
import type { AparenciaElemento, CaixaMm, ElementoGrafico, RaiosCantos } from './tipos';

/*
 * Construtores de elementos (L2, puros). A geometria é local e centrada na origem; a matriz leva o centro à posição na
 * folha. Nada aqui grava: o app decide id, nome e persistência (o mesmo contrato do `<ui-canvas-cad>`).
 */

export interface BaseNovoElemento {
  id: string;
  nome?: string;
  aparencia?: AparenciaElemento;
  camadaId?: string;
  grupoId?: string;
  propriedades?: Record<string, unknown>;
}

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function comBase(base: BaseNovoElemento, el: Omit<ElementoGrafico, 'id'>): ElementoGrafico {
  const saida: ElementoGrafico = { ...el, id: base.id };
  if (base.nome !== undefined) saida.nome = base.nome;
  if (base.aparencia !== undefined) saida.aparencia = base.aparencia;
  if (base.camadaId !== undefined) saida.camadaId = base.camadaId;
  if (base.grupoId !== undefined) saida.grupoId = base.grupoId;
  if (base.propriedades !== undefined) saida.propriedades = base.propriedades;
  return saida;
}

/** Caixa normalizada (largura/altura positivas, mesmo se arrastada para trás); `null` se não finita. */
export function caixaNormalizada(c: CaixaMm): CaixaMm | null {
  if (!c || ![c.x, c.y, c.largura, c.altura].every(fin)) return null;
  const x = c.largura < 0 ? c.x + c.largura : c.x;
  const y = c.altura < 0 ? c.y + c.altura : c.y;
  return { x, y, largura: Math.abs(c.largura), altura: Math.abs(c.altura) };
}

/** Caixa a partir de dois cantos quaisquer. */
export const caixaDeCantos = (a: Par, b: Par): CaixaMm => ({
  x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), largura: Math.abs(b[0] - a[0]), altura: Math.abs(b[1] - a[1])
});

const centroDe = (c: CaixaMm): Par => [c.x + c.largura / 2, c.y + c.altura / 2];

export function criarRetangulo(base: BaseNovoElemento, caixa: CaixaMm, raios?: RaiosCantos | number): ElementoGrafico | null {
  const c = caixaNormalizada(caixa);
  if (!c || c.largura <= 0 || c.altura <= 0) return null;
  const r: RaiosCantos | undefined = typeof raios === 'number' ? [raios, raios, raios, raios] : raios;
  const geometria = r && r.some((v) => fin(v) && v > 0)
    ? { tipo: 'retangulo' as const, largura: c.largura, altura: c.altura, raios: r.map((v) => (fin(v) && v > 0 ? v : 0)) as RaiosCantos }
    : { tipo: 'retangulo' as const, largura: c.largura, altura: c.altura };
  const [cx, cy] = centroDe(c);
  return comBase(base, { geometria, transformacao: translacao(cx, cy) });
}

/** Elipse inscrita na caixa. */
export function criarElipse(base: BaseNovoElemento, caixa: CaixaMm): ElementoGrafico | null {
  const c = caixaNormalizada(caixa);
  if (!c || c.largura <= 0 || c.altura <= 0) return null;
  const [cx, cy] = centroDe(c);
  return comBase(base, { geometria: { tipo: 'elipse', rx: c.largura / 2, ry: c.altura / 2 }, transformacao: translacao(cx, cy) });
}

export function criarPoligonoRegular(base: BaseNovoElemento, centro: Par, raio: number, lados = 6): ElementoGrafico | null {
  if (!fin(centro?.[0]) || !fin(centro?.[1]) || !fin(raio) || raio <= 0 || !fin(lados) || lados < 3) return null;
  return comBase(base, { geometria: { tipo: 'poligono-regular', raio, lados: Math.min(360, Math.round(lados)) }, transformacao: translacao(centro[0], centro[1]) });
}

export function criarEstrela(base: BaseNovoElemento, centro: Par, raioExterno: number, raioInterno: number, pontas = 5): ElementoGrafico | null {
  if (!fin(centro?.[0]) || !fin(centro?.[1]) || !fin(raioExterno) || !fin(raioInterno) || raioExterno <= 0 || raioInterno <= 0 || !fin(pontas) || pontas < 3) return null;
  return comBase(base, {
    geometria: { tipo: 'estrela', raioExterno, raioInterno: Math.min(raioInterno, raioExterno), pontas: Math.min(360, Math.round(pontas)) },
    transformacao: translacao(centro[0], centro[1])
  });
}

/** Linha da folha `de` → `ate`; a geometria fica centrada no meio do segmento. */
export function criarLinha(base: BaseNovoElemento, de: Par, ate: Par): ElementoGrafico | null {
  if (![de?.[0], de?.[1], ate?.[0], ate?.[1]].every(fin)) return null;
  const mx = (de[0] + ate[0]) / 2;
  const my = (de[1] + ate[1]) / 2;
  return comBase(base, {
    geometria: { tipo: 'linha', de: [de[0] - mx, de[1] - my], ate: [ate[0] - mx, ate[1] - my] },
    transformacao: translacao(mx, my)
  });
}

/** Caminho (polígono, polilinha ou Bézier) já em coordenadas da folha: matriz identidade. */
export function criarCaminho(base: BaseNovoElemento, geometria: Extract<GeometriaFeicao, { tipo: 'LineString' | 'Polygon' }>): ElementoGrafico | null {
  if (!geometria || (geometria.tipo !== 'LineString' && geometria.tipo !== 'Polygon')) return null;
  return comBase(base, { geometria: { tipo: 'caminho', geometria } });
}

/** Texto com a linha de base em `posicao`. `tamanho` é o corpo em mm (use `paraMm(pt, 'pt')` para converter de pontos). */
export function criarTexto(base: BaseNovoElemento, posicao: Par, texto: string, tamanho: number): ElementoGrafico | null {
  if (!fin(posicao?.[0]) || !fin(posicao?.[1]) || !fin(tamanho) || tamanho <= 0) return null;
  return comBase(base, { geometria: { tipo: 'texto', texto: typeof texto === 'string' ? texto : String(texto ?? ''), tamanho }, transformacao: translacao(posicao[0], posicao[1]) });
}
