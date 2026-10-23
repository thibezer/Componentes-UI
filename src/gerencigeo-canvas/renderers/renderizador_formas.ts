import type { CamadaDesenho, ItemDesenho, ListaDesenho, PontoMundo, Vista } from '../motor/tipos';
import type { EstiloVetor } from '../motor/estilo';

/*
 * Renderizador das formas: só pinta o que o motor decidiu desenhar (`ListaDesenho`), em Canvas 2D e sem Leaflet.
 *
 * - Itens iguais (o motor compartilha o objeto de estilo) são pintados juntos, com a cor, a espessura e o tracejado
 *   definidos UMA vez por grupo; cada forma é um caminho próprio. Caminhos gigantes com milhares de subcaminhos
 *   (um `stroke` por estilo) são patológicos no Canvas 2D: medido, 10 mil polígonos levam ~100 ms forma a forma e
 *   segundos num caminho só. As marcas de LOD saem num `fillRect` por marca, com a cor definida uma vez por grupo.
 * - Preenchimento translúcido é forma a forma, então sobreposições dentro da camada escurecem (como no Leaflet).
 * - Coordenadas de mundo menos a origem da lista, em dupla precisão, antes de chegar ao canvas (float32 do canvas não
 *   aguenta pixels de mundo em zoom alto).
 * - `devicePixelRatio` por `setTransform`; opacidade de grupo é do pane da camada (CSS), não daqui.
 * - `recorte` pinta só numa região (pan incremental: só as faixas expostas são pintadas, o resto é o bitmap deslocado).
 * - A seleção, o destaque e a edição vão num canvas à parte (`alvo: 'sobreposicao'`): selecionar não repinta a base.
 */

/** O que a pintura usa do Canvas 2D (permite testar com um contexto falso que grava as chamadas). */
export interface ContextoFormas2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineJoin: CanvasLineJoin;
  lineCap: CanvasLineCap;
  globalAlpha: number;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  save(): void;
  restore(): void;
  rect(x: number, y: number, w: number, h: number): void;
  clip(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  setLineDash(segmentos: number[]): void;
}

/** Superfície de pintura de uma camada (ou da sobreposição): o contexto e o tamanho do canvas em px CSS. */
export interface SuperficiePintura {
  ctx: ContextoFormas2D;
  largura: number;
  altura: number;
  dpr: number;
}

export interface AlvosPintura {
  camada(camadaId: string): SuperficiePintura | null;
  sobreposicao(): SuperficiePintura | null;
}

/** Região do canvas, em px CSS a partir do canto superior esquerdo. */
export interface RegiaoPx {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface OpcoesDesenho {
  /** `'base'` (padrão): um canvas por camada. `'sobreposicao'`: seleção, destaque e edição, todas as camadas no mesmo canvas. */
  alvo?: 'base' | 'sobreposicao';
  /** Limpa antes de pintar (padrão: sim). A sobreposição é limpa uma vez, antes de todas as camadas. */
  limpar?: boolean;
  /** Pinta só nesta região (nada fora dela é tocado). Use com `limpar: false` sobre um bitmap já deslocado. */
  recorte?: RegiaoPx;
}

export interface EstatisticasPintura {
  itens: number;
  marcas: number;
  preenchimentos: number;
  tracos: number;
  chamadas: number;
}

/** Contrato pequeno do renderizador das formas. */
export interface RenderizadorFormas {
  desenhar(lista: ListaDesenho, vista: Vista, opcoes?: OpcoesDesenho): EstatisticasPintura;
  destacar(ids: Iterable<string>): void;
  limpar(): void;
  destruir(): void;
}

const CORES_HALO = 'rgba(255,255,255,0.9)';

/** `dashArray` do SVG/Leaflet ("6 4", "6,4") em segmentos; inválido ou vazio = linha contínua. */
export function parseDash(dash: string | undefined): number[] {
  if (!dash) return [];
  const n = dash.split(/[\s,]+/).map(Number).filter((v) => Number.isFinite(v) && v >= 0);
  return n.length > 0 && n.some((v) => v > 0) ? (n.length % 2 === 1 ? [...n, ...n] : n) : [];
}

const finito = (v: number): boolean => Number.isFinite(v);

const FORMAS_CANVAS = new Set<ItemDesenho['forma']>(['marca', 'poligono', 'circulo', 'linha', 'ponto']);

/** Quantos itens da camada o pintor desenha no canvas (os demais são marcadores DOM e curvas). */
export function contarItensCanvas(camada: CamadaDesenho | null | undefined): number {
  let n = 0;
  if (camada) for (const it of camada.itens) if (FORMAS_CANVAS.has(it.forma)) n++;
  return n;
}

export class PintorCanvas2D implements RenderizadorFormas {
  private destaques = new Set<string>();
  private destruido = false;
  /** Estatística da última pintura (diagnóstico e testes). */
  public ultima: EstatisticasPintura = { itens: 0, marcas: 0, preenchimentos: 0, tracos: 0, chamadas: 0 };

  constructor(private readonly alvos: AlvosPintura) {}

  public destacar(ids: Iterable<string>): void {
    this.destaques = new Set(ids);
  }

  public limpar(): void {
    const s = this.alvos.sobreposicao();
    if (s) this.limparSuperficie(s);
  }

  public destruir(): void {
    this.destruido = true;
    this.destaques.clear();
  }

  public desenhar(lista: ListaDesenho, vista: Vista, opcoes: OpcoesDesenho = {}): EstatisticasPintura {
    const est: EstatisticasPintura = { itens: 0, marcas: 0, preenchimentos: 0, tracos: 0, chamadas: 0 };
    if (this.destruido || !lista) return est;
    const sobre = opcoes.alvo === 'sobreposicao';
    const dpr = vista && finito(vista.dpr) && vista.dpr > 0 ? vista.dpr : 1;
    if (sobre) {
      const s = this.alvos.sobreposicao();
      if (s && opcoes.limpar !== false) this.limparSuperficie(s, dpr);
    }
    for (const camada of lista.camadas) {
      const sup = sobre ? this.alvos.sobreposicao() : this.alvos.camada(camada.camadaId);
      if (!sup) continue;
      if (!sobre && opcoes.limpar !== false) this.limparSuperficie(sup, dpr);
      else sup.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = opcoes.recorte;
      if (r) {
        sup.ctx.save();
        sup.ctx.beginPath();
        sup.ctx.rect(r.x, r.y, r.largura, r.altura);
        sup.ctx.clip();
      }
      try {
        this.pintarCamada(sup, camada, lista.origem, sobre, est);
      } finally {
        if (r) sup.ctx.restore();
      }
    }
    this.ultima = est;
    return est;
  }

  private limparSuperficie(sup: SuperficiePintura, dprPedido?: number): void {
    const dpr = dprPedido ?? sup.dpr;
    sup.ctx.setTransform(1, 0, 0, 1, 0, 0);
    sup.ctx.clearRect(0, 0, Math.ceil(sup.largura * dpr), Math.ceil(sup.altura * dpr));
    sup.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private pintarCamada(sup: SuperficiePintura, camada: CamadaDesenho, origem: PontoMundo, sobreposicao: boolean, est: EstatisticasPintura): void {
    const ctx = sup.ctx;
    const marcas: ItemDesenho[] = [];
    const formas: ItemDesenho[] = [];
    const linhas: ItemDesenho[] = [];
    const pontos: ItemDesenho[] = [];
    for (const it of camada.itens) {
      switch (it.forma) {
        case 'marca': marcas.push(it); break;
        case 'poligono': case 'circulo': formas.push(it); break;
        case 'linha': linhas.push(it); break;
        case 'ponto': pontos.push(it); break;
        default: break; // marcadores DOM e curvas não são do canvas
      }
    }
    est.itens += marcas.length + formas.length + linhas.length + pontos.length;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (sobreposicao) {
      // destaque primeiro (halo por baixo), depois o desenho normal da seleção
      for (const it of [...formas, ...linhas, ...pontos]) if (it.destaque || this.destaques.has(it.id)) this.halo(ctx, it, origem, est);
    }
    this.pintarMarcas(ctx, marcas, origem, est);
    this.pintarGrupos(ctx, formas, origem, est, true);
    this.pintarGrupos(ctx, linhas, origem, est, false);
    this.pintarGrupos(ctx, pontos, origem, est, true);
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  private agrupar(itens: ItemDesenho[]): Map<EstiloVetor, ItemDesenho[]> {
    const g = new Map<EstiloVetor, ItemDesenho[]>();
    for (const it of itens) {
      const l = g.get(it.estilo);
      if (l) l.push(it);
      else g.set(it.estilo, [it]);
    }
    return g;
  }

  /** Marcas de LOD: `fillRect` por marca, a cor definida uma vez por grupo. */
  private pintarMarcas(ctx: ContextoFormas2D, marcas: ItemDesenho[], o: PontoMundo, est: EstatisticasPintura): void {
    for (const [estilo, lista] of this.agrupar(marcas)) {
      ctx.fillStyle = estilo.corPreenchimento;
      ctx.globalAlpha = estilo.opacidadePreenchimento;
      est.chamadas += 2;
      for (const m of lista) {
        const c = m.geometriaEmPx[0];
        if (!c) continue;
        const x = c[0] - o.x;
        const y = c[1] - o.y;
        if (!(finito(x) && finito(y))) continue;
        const lado = m.raioPx >= 2 ? 2 : 1;
        ctx.fillRect(Math.round(x - lado / 2), Math.round(y - lado / 2), lado, lado);
        est.marcas++;
        est.chamadas++;
      }
    }
  }

  /** Caminho de um item: anéis/partes (polígono e linha), círculo ou ponto. */
  private caminho(ctx: ContextoFormas2D, it: ItemDesenho, o: PontoMundo): void {
    if (it.forma === 'circulo' || it.forma === 'ponto') {
      const c = it.geometriaEmPx[0];
      if (!c) return;
      const x = c[0] - o.x;
      const y = c[1] - o.y;
      if (finito(x) && finito(y) && finito(it.raioPx)) {
        ctx.moveTo(x + it.raioPx, y);
        ctx.arc(x, y, it.raioPx, 0, Math.PI * 2);
      }
      return;
    }
    const fechar = it.forma === 'poligono';
    for (const p of it.geometriaEmPx) {
      const n = p.length >> 1;
      if (n < 2) continue;
      let ok = false;
      for (let i = 0; i < n; i++) {
        const x = p[i * 2] - o.x;
        const y = p[i * 2 + 1] - o.y;
        if (!(finito(x) && finito(y))) continue;
        if (!ok) {
          ctx.moveTo(x, y);
          ok = true;
        } else ctx.lineTo(x, y);
      }
      if (ok && fechar) ctx.closePath();
    }
  }

  /**
   * Polígonos, círculos, linhas e pontos: o estilo do grupo é definido uma vez; cada forma é um caminho próprio com
   * preenchimento (se o estilo preenche) e traço. `areas` = tipos que podem ser preenchidos.
   */
  private pintarGrupos(ctx: ContextoFormas2D, itens: ItemDesenho[], o: PontoMundo, est: EstatisticasPintura, areas: boolean): void {
    for (const [e, lista] of this.agrupar(itens)) {
      const preencher = areas && e.preencher && e.opacidadePreenchimento > 0;
      const tracar = e.traco && e.peso > 0;
      if (!preencher && !tracar) continue;
      if (preencher) ctx.fillStyle = e.corPreenchimento;
      if (tracar) {
        ctx.strokeStyle = e.cor;
        ctx.lineWidth = e.peso;
        ctx.setLineDash(parseDash(e.dash));
      }
      est.chamadas += 3;
      for (const it of lista) {
        ctx.beginPath();
        this.caminho(ctx, it, o);
        if (preencher) {
          ctx.globalAlpha = e.opacidadePreenchimento;
          ctx.fill();
          est.preenchimentos++;
          est.chamadas++;
        }
        if (tracar) {
          ctx.globalAlpha = 1;
          ctx.stroke();
          est.tracos++;
          est.chamadas++;
        }
      }
    }
  }

  /** Halo de destaque (hover): traço claro, mais grosso, por baixo do desenho normal. */
  private halo(ctx: ContextoFormas2D, it: ItemDesenho, o: PontoMundo, est: EstatisticasPintura): void {
    ctx.strokeStyle = CORES_HALO;
    ctx.lineWidth = Math.max(it.estilo.peso, 1) + 4;
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([]);
    ctx.beginPath();
    this.caminho(ctx, it, o);
    ctx.stroke();
    est.tracos++;
    est.chamadas += 4;
  }
}
