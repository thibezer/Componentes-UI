import { IDENTIDADE, multiplicar, saneada, translacao, type Matriz2D } from '../espaco/espaco_matriz';
import { corSegura } from '../motor/estilo';
import { corComOpacidade } from './aparencia_estilo';
import { adaptarContextoRelativo, avisarUmaVez, modoDeTransformacao, type ContextoPranchaRelativo, type ModoTransformacao } from './pintura_contexto';
import { faixasDoGradienteLinear, FAIXAS_PADRAO } from './pintura_gradiente_faixas';
import { caminhoFinito, planejarElementos, type Caminho, type ItemPintura, type SombraPlanejada, type TextoPlanejado } from './pintura_plano';
import type { CamadaPrancha, ElementoGrafico } from './tipos';

/*
 * Pintor da prancha (L2, puro): executa o plano de pintura num contexto 2D. O MESMO código pinta a tela (Canvas 2D) e a
 * exportação (o PDF vetorial do app, PNG): nunca dois desenhos para a mesma forma.
 *
 * O contrato `ContextoPrancha2D` é o mínimo que um contexto precisa ter (o que o PDF vetorial do app oferece). O resto é
 * CAPACIDADE OPCIONAL, detectada no contexto, com degradação definida:
 *   - gradiente (`createLinearGradient`/`createRadialGradient`) ausente → cor sólida (a parada mais perto do meio);
 *   - texto (`fillText`) ausente → o texto não é pintado (contado em `degradacoes.texto`; o app desenha o texto por conta
 *     própria no PDF);
 *   - hachura não depende de nada opcional: são linhas vetoriais com `clip`, funcionam em qualquer contexto;
 *   - mesclagem (`globalCompositeOperation`) ausente → normal (contado em `degradacoes.mesclagem`);
 *   - sombra: a silhueta é vetorial (contrato mínimo); o desfoque usa `filter` (`blur(px)`) e, sem ele, a sombra sai
 *     nítida (contado em `degradacoes.desfoque`).
 * Sem `Path2D` (não existe nos testes nem no PDF).
 */

/** Gradiente devolvido pelo contexto (o `CanvasGradient` do navegador tem exatamente esta forma). */
export interface GradienteDoContexto {
  addColorStop(posicao: number, cor: string): void;
}

/** O que o pintor exige do contexto 2D. */
export interface ContextoPrancha2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  globalAlpha: number;
  /** Opcional em contextos falsos; o Canvas 2D real sempre tem. */
  miterLimit?: number;
  save(): void;
  restore(): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
  fill(regra?: CanvasFillRule): void;
  stroke(): void;
  clip(regra?: CanvasFillRule): void;
  setLineDash(segmentos: number[]): void;
  fillRect(x: number, y: number, w: number, h: number): void;
}

/** Capacidades opcionais, detectadas com `typeof`. */
export interface CapacidadesPrancha2D {
  createLinearGradient?(x0: number, y0: number, x1: number, y1: number): GradienteDoContexto;
  createRadialGradient?(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): GradienteDoContexto;
  fillText?(texto: string, x: number, y: number): void;
  font?: string;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
  /** Fase 5: modo de mesclagem (`'multiply'`, `'screen'`...). */
  globalCompositeOperation?: string;
  /** Fase 5: filtro CSS (`'blur(2px)'`), para o desfoque da sombra. */
  filter?: string;
}

export interface OpcoesPintura {
  /** Folha (mm) → dispositivo. Tela: `compor(escala(zoom·dpr), translacao(pan))`; PDF em pontos: `escala(72 / 25,4)`. Padrão: identidade (mm). */
  matriz?: Matriz2D;
  /** Pinta um retângulo de fundo antes (ex.: a folha branca), em mm da folha. */
  fundo?: { cor: string; largura: number; altura: number };
  /** Camadas da prancha (ordem, ocultas, opacidade): a exportação respeita as mesmas da tela. */
  camadas?: readonly CamadaPrancha[];
  /**
   * Como posicionar a matriz: `'absoluta'` (`setTransform`) ou `'relativa'` (só `transform`, com `inverse(atual) · M`).
   * Padrão: detectado no contexto (o absoluto vence).
   */
  transformacao?: 'absoluta' | 'relativa';
  /**
   * Gradiente linear em N faixas sólidas (recortadas pela forma) quando o contexto não tem `createLinearGradient`
   * (o PDF vetorial): `true` = 24 faixas, ou o número (2 a 256). Desligado por padrão (o gradiente vira cor sólida).
   * Gradiente radial continua sólido. As estatísticas dizem quando usou (`gradientesEmFaixas`).
   */
  gradienteEmFaixas?: boolean | number;
}

/** Plano de pintura pronto (resultado de `planejar`): não depende da matriz do dispositivo, só dos elementos e das camadas. */
export type PlanoPintura = readonly ItemPintura[];

export interface OpcoesPlano {
  camadas?: readonly CamadaPrancha[];
  /** Guarda o plano por referência do array de elementos (e das camadas); trate o array como imutável (copie ao editar). */
  cache?: boolean;
}

export interface EstatisticasPintura {
  itens: number;
  preenchimentos: number;
  gradientes: number;
  hachuras: number;
  tracos: number;
  pontas: number;
  textos: number;
  /** Fase 5: sombras pintadas. */
  sombras: number;
  /** O que o contexto não suportou e foi degradado (ver o comentário do módulo); `mesclagem`/`desfoque` só aparecem quando houve. */
  degradacoes: { gradiente: number; texto: number; mesclagem?: number; desfoque?: number };
  /** Itens que falharam (exceção do contexto) ou que não puderam ser pintados por falta de `setTransform`/`transform`. */
  falhas: number;
  /** Mensagem da primeira falha (diagnóstico). */
  primeiraFalha?: string;
  /** Como a matriz foi aplicada (ver `diagnosticarContexto`). */
  transformacao: ModoTransformacao;
  /** Gradientes lineares pintados em faixas (`gradienteEmFaixas`). */
  gradientesEmFaixas?: number;
}

type Contexto = ContextoPrancha2D & CapacidadesPrancha2D;

const definir = (ctx: ContextoPrancha2D, m: Matriz2D): void => ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);

function tracar(ctx: ContextoPrancha2D, cam: Caminho): void {
  for (const k of cam) {
    if (k.c === 'M') ctx.moveTo(k.p[0], k.p[1]);
    else if (k.c === 'L') ctx.lineTo(k.p[0], k.p[1]);
    else if (k.c === 'C') ctx.bezierCurveTo(k.c1[0], k.c1[1], k.c2[0], k.c2[1], k.p[0], k.p[1]);
    else ctx.closePath();
  }
}

const preencher = (ctx: ContextoPrancha2D, regra: CanvasFillRule): void => (regra === 'evenodd' ? ctx.fill('evenodd') : ctx.fill());
const recortar = (ctx: ContextoPrancha2D, regra: CanvasFillRule): void => (regra === 'evenodd' ? ctx.clip('evenodd') : ctx.clip());

function criarGradiente(ctx: Contexto, p: NonNullable<ItemPintura['preenchimento']>): GradienteDoContexto | null {
  const g = p.gradiente;
  if (!g) return null;
  const d = g.def;
  let grad: GradienteDoContexto | null = null;
  if (d.tipo === 'linear' && typeof ctx.createLinearGradient === 'function') {
    grad = ctx.createLinearGradient(d.de[0], d.de[1], d.ate[0], d.ate[1]);
  } else if (d.tipo === 'radial' && typeof ctx.createRadialGradient === 'function') {
    const f = d.foco ?? d.centro;
    grad = ctx.createRadialGradient(f[0], f[1], 0, d.centro[0], d.centro[1], d.raio);
  }
  if (!grad) return null;
  for (const s of d.paradas) grad.addColorStop(s.posicao, corComOpacidade(s.cor, s.opacidade ?? 1));
  return grad;
}

/** Escala média da matriz (px por mm), para o desfoque em px. */
const escalaMedia = (m: Matriz2D): number => Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;

function pintarTexto(ctx: Contexto, tx: TextoPlanejado, base: Matriz2D, cor: string, alfa: number): void {
  definir(ctx, multiplicar(base, tx.matriz));
  ctx.font = `${tx.tamanho}px ${tx.fonte}`;
  ctx.textAlign = tx.alinhamento;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = cor;
  ctx.globalAlpha = alfa;
  tx.linhas.forEach((linha, i) => ctx.fillText!(linha, 0, i * tx.tamanho * tx.entrelinha));
}

function pintarSombra(ctx: Contexto, s: SombraPlanejada, base: Matriz2D, op: number, est: EstatisticasPintura): void {
  const deslocada = multiplicar(base, translacao(s.dx, s.dy));
  const comFiltro = s.desfoque > 0 && typeof ctx.filter === 'string';
  if (s.desfoque > 0 && !comFiltro) est.degradacoes.desfoque = (est.degradacoes.desfoque ?? 0) + 1;
  ctx.save();
  if (comFiltro) ctx.filter = `blur(${s.desfoque * escalaMedia(base)}px)`;
  definir(ctx, deslocada);
  for (const p of s.partes) {
    if (!caminhoFinito(p.caminho)) continue;
    ctx.beginPath();
    tracar(ctx, p.caminho);
    ctx.globalAlpha = s.opacidade * op;
    if (p.modo === 'encher') {
      ctx.fillStyle = s.cor;
      preencher(ctx, p.regra);
    } else {
      ctx.strokeStyle = s.cor;
      ctx.lineWidth = p.largura;
      ctx.lineCap = p.terminacao;
      ctx.lineJoin = p.juncao;
      ctx.setLineDash(p.tracejado);
      ctx.stroke();
    }
  }
  if (s.texto && typeof ctx.fillText === 'function') pintarTexto(ctx, s.texto, deslocada, s.cor, s.opacidade * op);
  if (comFiltro) ctx.filter = 'none';
  ctx.restore();
  est.sombras++;
}

/**
 * Gradiente linear sem `createLinearGradient`: N faixas de cor sólida recortadas pela forma (o caminho já está traçado).
 * Devolve `false` (e não pinta) se não for linear/válido: o chamador usa a cor sólida.
 */
function pintarEmFaixas(ctx: Contexto, p: NonNullable<ItemPintura['preenchimento']>, base: Matriz2D, op: number, n: number): boolean {
  const g = p.gradiente;
  const lista = g ? faixasDoGradienteLinear(g.def, n) : null;
  if (!g || !lista) return false;
  ctx.save();
  recortar(ctx, p.regra);
  definir(ctx, multiplicar(base, g.quadro));
  for (const f of lista) {
    ctx.beginPath();
    ctx.moveTo(f.pontos[0][0], f.pontos[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(f.pontos[i][0], f.pontos[i][1]);
    ctx.closePath();
    ctx.fillStyle = f.cor;
    ctx.globalAlpha = p.opacidade * op * f.opacidade;
    ctx.fill();
  }
  ctx.restore();
  return true;
}

function pintarItem(ctx: Contexto, it: ItemPintura, base: Matriz2D, est: EstatisticasPintura, faixas = 0): void {
  const op = it.opacidade;
  ctx.save();
  definir(ctx, base);
  if (it.recorte && caminhoFinito(it.recorte.caminho)) {
    ctx.beginPath();
    tracar(ctx, it.recorte.caminho);
    recortar(ctx, it.recorte.regra);
  }
  if (it.mesclagem) {
    if (typeof ctx.globalCompositeOperation === 'string') ctx.globalCompositeOperation = it.mesclagem;
    else est.degradacoes.mesclagem = (est.degradacoes.mesclagem ?? 0) + 1;
  }
  if (it.sombra) {
    pintarSombra(ctx, it.sombra, base, op, est);
    definir(ctx, base);
  }

  const p = it.preenchimento;
  if (p && caminhoFinito(p.caminho)) {
    ctx.beginPath();
    tracar(ctx, p.caminho);
    const grad = p.gradiente ? criarGradiente(ctx, p) : null;
    if (grad && p.gradiente) {
      // o caminho já está traçado; o gradiente vale no espaço da caixa unitária, então troca a transformação só para encher
      definir(ctx, multiplicar(base, p.gradiente.quadro));
      ctx.fillStyle = grad as CanvasGradient;
      ctx.globalAlpha = p.opacidade * op;
      preencher(ctx, p.regra);
      definir(ctx, base);
      est.gradientes++;
    } else if (p.gradiente && faixas > 0 && pintarEmFaixas(ctx, p, base, it.opacidade, faixas)) {
      est.gradientesEmFaixas = (est.gradientesEmFaixas ?? 0) + 1;
    } else {
      if (p.gradiente) est.degradacoes.gradiente++;
      ctx.fillStyle = p.cor;
      ctx.globalAlpha = p.opacidade * op * (p.gradiente ? p.gradiente.opacidadeDegradacao : 1);
      preencher(ctx, p.regra);
    }
    est.preenchimentos++;
  }

  const h = it.hachura;
  if (h && caminhoFinito(h.recorte)) {
    ctx.save();
    ctx.beginPath();
    tracar(ctx, h.recorte);
    recortar(ctx, h.regra);
    ctx.beginPath();
    for (const [a, b] of h.linhas) {
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.strokeStyle = h.cor;
    ctx.lineWidth = h.largura;
    ctx.lineCap = 'butt';
    ctx.setLineDash([]);
    ctx.globalAlpha = h.opacidade * op;
    ctx.stroke();
    ctx.restore();
    est.hachuras++;
  }

  const t = it.traco;
  if (t && caminhoFinito(t.caminho)) {
    ctx.beginPath();
    tracar(ctx, t.caminho);
    ctx.strokeStyle = t.cor;
    ctx.lineWidth = t.largura;
    ctx.lineCap = t.terminacao;
    ctx.lineJoin = t.juncao;
    ctx.miterLimit = t.limitePonta;
    ctx.setLineDash(t.tracejado);
    ctx.globalAlpha = t.opacidade * op;
    ctx.stroke();
    est.tracos++;
  }

  for (const ponta of it.pontas) {
    if (!caminhoFinito(ponta.caminho)) continue;
    ctx.beginPath();
    tracar(ctx, ponta.caminho);
    ctx.globalAlpha = ponta.opacidade * op;
    if (ponta.preenchida) {
      ctx.fillStyle = ponta.cor;
      ctx.fill();
    } else {
      ctx.strokeStyle = ponta.cor;
      ctx.lineWidth = ponta.largura;
      ctx.lineJoin = 'miter';
      ctx.setLineDash([]);
      ctx.stroke();
    }
    est.pontas++;
  }

  const tx = it.texto;
  if (tx) {
    if (typeof ctx.fillText === 'function') {
      pintarTexto(ctx, tx, base, tx.cor, tx.opacidade * op);
      est.textos++;
    } else {
      est.degradacoes.texto++;
    }
  }
  ctx.restore();
}

const cachePlanos = new WeakMap<readonly ElementoGrafico[], { camadas: readonly CamadaPrancha[] | undefined; plano: PlanoPintura }>();

/**
 * Planeja uma vez (contornos, hachuras, pontas, texto: tudo em mm da folha). O plano só é invalidado por mudança nos
 * elementos ou nas camadas; trocar a matriz (zoom, resolução, exportação) NÃO invalida. Com `cache: true`, o plano é
 * guardado por referência do array (um array novo, ou outro `camadas`, replaneja).
 */
export function planejar(elementos: readonly ElementoGrafico[], opcoes: OpcoesPlano = {}): PlanoPintura {
  if (!Array.isArray(elementos)) return Object.freeze([]);
  if (opcoes.cache) {
    const g = cachePlanos.get(elementos);
    if (g && g.camadas === opcoes.camadas) return g.plano;
  }
  let plano: PlanoPintura;
  try { plano = Object.freeze(planejarElementos(elementos, opcoes.camadas)); } catch { plano = Object.freeze([]); }
  if (opcoes.cache) cachePlanos.set(elementos, { camadas: opcoes.camadas, plano });
  return plano;
}

function falhar(est: EstatisticasPintura, motivo: string): void {
  est.falhas++;
  if (est.primeiraFalha === undefined) est.primeiraFalha = motivo;
}

/**
 * Pinta um plano já pronto (`planejar`) no contexto, com a matriz folha → dispositivo. Não lança: um item com problema é
 * contado em `falhas` e os demais seguem. Sem `setTransform` usa o modo relativo (`transform`); sem nenhum dos dois não
 * pinta nada, devolve `falhas > 0` e avisa uma vez (em vez de um PDF em branco sem explicação).
 */
export function desenharPlano(ctx: ContextoPrancha2D | ContextoPranchaRelativo, plano: PlanoPintura, opcoes: Omit<OpcoesPintura, 'camadas'> = {}): EstatisticasPintura {
  const est: EstatisticasPintura = {
    itens: 0, preenchimentos: 0, gradientes: 0, hachuras: 0, tracos: 0, pontas: 0, textos: 0, sombras: 0,
    degradacoes: { gradiente: 0, texto: 0 }, falhas: 0, transformacao: 'nenhuma'
  };
  if (!ctx) return est;
  const detectado = modoDeTransformacao(ctx);
  const modo: ModoTransformacao = opcoes.transformacao === 'relativa' && typeof (ctx as ContextoPranchaRelativo).transform === 'function' ? 'relativa'
    : opcoes.transformacao === 'absoluta' ? (detectado === 'absoluta' ? 'absoluta' : 'nenhuma')
    : detectado;
  est.transformacao = modo;
  const itens: readonly ItemPintura[] = Array.isArray(plano) ? plano : [];
  const gf = opcoes.gradienteEmFaixas;
  const faixas = gf === true ? FAIXAS_PADRAO : typeof gf === 'number' && Number.isFinite(gf) && gf >= 2 ? Math.min(256, Math.round(gf)) : 0;
  if (modo === 'nenhuma') {
    est.falhas = Math.max(1, itens.length);
    est.primeiraFalha = 'o contexto não tem setTransform nem transform: nada foi pintado';
    avisarUmaVez(`${est.primeiraFalha}. Implemente setTransform (absoluto) ou transform; veja diagnosticarContexto().`);
    return est;
  }
  const alvo = (modo === 'relativa' ? adaptarContextoRelativo(ctx as ContextoPranchaRelativo) : ctx) as ContextoPrancha2D;
  const base = opcoes.matriz ? saneada(opcoes.matriz) : IDENTIDADE;
  const f = opcoes.fundo;
  if (f && [f.largura, f.altura].every((v) => Number.isFinite(v) && v > 0)) {
    try {
      alvo.save();
      definir(alvo, base);
      alvo.globalAlpha = 1;
      alvo.fillStyle = corSegura(f.cor, '#ffffff');
      alvo.fillRect(0, 0, f.largura, f.altura);
      alvo.restore();
    } catch (e) {
      falhar(est, e instanceof Error ? e.message : String(e));
      try { alvo.restore(); } catch { /* sem estado salvo */ }
    }
  }
  for (const it of itens) {
    try {
      pintarItem(alvo as Contexto, it, base, est, faixas);
      est.itens++;
    } catch (e) {
      // um elemento com defeito não derruba a pintura dos outros; conta a falha e tenta deixar o contexto equilibrado
      falhar(est, e instanceof Error ? e.message : String(e));
      try { alvo.restore(); } catch { /* contexto já sem estado salvo */ }
    }
  }
  if (est.falhas > 0) avisarUmaVez(`${est.falhas} falha(s) ao pintar; primeira: ${est.primeiraFalha}`);
  return est;
}

/**
 * Pinta os elementos (na ordem de empilhamento, sem os ocultos) no contexto: `desenharPlano(ctx, planejar(...))`. Não
 * lança. Devolve as estatísticas da pintura (para teste e diagnóstico), incluindo `falhas`.
 */
export function desenharElementos(ctx: ContextoPrancha2D | ContextoPranchaRelativo, elementos: readonly ElementoGrafico[], opcoes: OpcoesPintura = {}): EstatisticasPintura {
  return desenharPlano(ctx, planejar(elementos, { camadas: opcoes.camadas }), opcoes);
}
