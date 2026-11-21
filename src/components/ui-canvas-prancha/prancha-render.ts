import type { ContextoPrancha2D } from '../../gerencigeo-canvas/prancha/pintura_canvas';
import type { ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import type { ControladorPrancha } from './prancha-controlador';
import { caixaDoQuadro } from '../../gerencigeo-canvas/prancha/elemento_predefinicoes';
import { pintarBase, pintarSobreposicao } from './prancha-pintura';
import { pintarRegua } from './prancha-reguas';
import { marcasDeCantoDaSelecao } from './prancha-gestos';

/*
 * Renderizador do componente: mede os canvases, ajusta o tamanho em px do dispositivo (devicePixelRatio), agenda a
 * pintura num quadro (`requestAnimationFrame`, com `setTimeout` de reserva) e só repinta a BASE quando algo dela mudou
 * (documento, vista, folha, grade, cores; durante um gesto a base fica sem os elementos em movimento e não muda); a
 * sobreposição (com os elementos em gesto) e as réguas são repintadas a cada quadro.
 */

export type PapelCanvas = 'base' | 'sobreposicao' | 'regua-horizontal' | 'regua-vertical';

/** Dá o contexto 2D de cada canvas (padrão: `getContext('2d')`). Útil para pintar com um contexto de teste ou próprio. */
export type FabricaContextoPrancha = (canvas: HTMLCanvasElement, papel: PapelCanvas) => ContextoPrancha2D | null;

export const fabricaPadrao: FabricaContextoPrancha = (canvas) => {
  try {
    return (canvas.getContext?.('2d') as ContextoPrancha2D | null) ?? null;
  } catch {
    return null;
  }
};

export interface CanvasesPrancha {
  viewport: HTMLElement;
  base: HTMLCanvasElement;
  sobreposicao: HTMLCanvasElement;
  reguaH: HTMLCanvasElement;
  reguaV: HTMLCanvasElement;
}

interface ChaveBase {
  elementos: readonly ElementoGrafico[] | null;
  texto: string;
}

export class RenderizadorPrancha {
  private pedido: { tipo: 'raf' | 'timeout'; id: number } | null = null;
  private contextos = new Map<PapelCanvas, ContextoPrancha2D | null>();
  private ultimaBase: ChaveBase = { elementos: null, texto: '' };
  public quadros = 0;
  public pinturasBase = 0;

  constructor(private readonly c: ControladorPrancha, private readonly cv: CanvasesPrancha, private readonly fabrica: () => FabricaContextoPrancha) {}

  /** Esquece os contextos (a fábrica mudou) e força a próxima pintura da base. */
  public reiniciar(): void {
    this.contextos.clear();
    this.ultimaBase = { elementos: null, texto: '' };
  }

  private ctx(papel: PapelCanvas, canvas: HTMLCanvasElement): ContextoPrancha2D | null {
    if (!this.contextos.has(papel)) this.contextos.set(papel, this.fabrica()(canvas, papel));
    return this.contextos.get(papel) ?? null;
  }

  public agendar(): void {
    if (this.pedido) return;
    if (typeof requestAnimationFrame === 'function') {
      this.pedido = { tipo: 'raf', id: requestAnimationFrame(() => { this.pedido = null; this.pintar(); }) };
    } else if (typeof setTimeout === 'function') {
      this.pedido = { tipo: 'timeout', id: setTimeout(() => { this.pedido = null; this.pintar(); }, 16) as unknown as number };
    }
  }

  public cancelar(): void {
    if (!this.pedido) return;
    if (this.pedido.tipo === 'raf' && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.pedido.id);
    else clearTimeout(this.pedido.id);
    this.pedido = null;
  }

  private ajustar(canvas: HTMLCanvasElement, largura: number, altura: number, dpr: number): boolean {
    const w = Math.max(0, Math.round(largura * dpr));
    const h = Math.max(0, Math.round(altura * dpr));
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w;
    canvas.height = h;
    return true;
  }

  /** Mede a área de desenho; devolve se o tamanho mudou. */
  public medir(): boolean {
    const v = this.c.vista;
    const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
    const antes = `${v.largura}x${v.altura}@${v.dpr}`;
    v.redimensionar(this.cv.viewport.clientWidth || 0, this.cv.viewport.clientHeight || 0, dpr);
    const mudou = antes !== `${v.largura}x${v.altura}@${v.dpr}`;
    if (mudou) this.ultimaBase = { elementos: null, texto: '' };
    return mudou;
  }

  /** Pinta agora (o que estiver agendado é descartado). */
  public pintar(): void {
    this.cancelar();
    this.quadros++;
    const c = this.c;
    const v = c.vista;
    if (v.largura <= 0 || v.altura <= 0) return;
    const mudouBase = this.ajustar(this.cv.base, v.largura, v.altura, v.dpr);
    this.ajustar(this.cv.sobreposicao, v.largura, v.altura, v.dpr);
    const elementos = c.elementosVisiveis();
    const chave = [v.zoom, v.pan[0], v.pan[1], v.largura, v.altura, v.dpr, c.folha.largura, c.folha.altura, c.mostrarGrade ? c.grade : 0,
      Object.values(c.cores).join(), JSON.stringify(c.camadas), c.isolado ?? '', JSON.stringify(c.margens)].join('|');
    const base = this.ctx('base', this.cv.base);
    if (base && (mudouBase || elementos !== this.ultimaBase.elementos || chave !== this.ultimaBase.texto)) {
      try {
        const isolados = c.isolado ? elementos.filter((e) => e.grupoId === c.isolado) : null;
        pintarBase(base, { vista: v, folha: c.folha, cores: c.cores, elementos, grade: c.mostrarGrade ? c.grade : null, camadas: c.camadas, isolados, margens: c.margens ? caixaDoQuadro(c.folha.largura, c.folha.altura, c.margens) : null });
        this.pinturasBase++;
      } catch { /* contexto com defeito: a próxima pintura tenta de novo */ }
      this.ultimaBase = { elementos, texto: chave };
    }
    const sob = this.ctx('sobreposicao', this.cv.sobreposicao);
    if (sob) {
      try {
        const hover = c.ui.hoverId ? c.doc.obter(c.ui.hoverId) ?? null : null;
        const selecionados = c.doc.elementosSelecionados().map((e) => c.ui.substitutos.get(e.id) ?? e);
        pintarSobreposicao(sob, { vista: v, cores: c.cores, ui: c.ui, selecionados, emGesto: c.elementosEmGesto(), hover, guias: c.guias, caixaTransformacao: c.ferramenta === 'selecao', marcasCantos: marcasDeCantoDaSelecao(c) });
      } catch { /* idem */ }
    }
    this.pintarReguas();
  }

  private pintarReguas(): void {
    const c = this.c;
    for (const [papel, canvas, orientacao] of [['regua-horizontal', this.cv.reguaH, 'horizontal'], ['regua-vertical', this.cv.reguaV, 'vertical']] as const) {
      const comprimento = orientacao === 'horizontal' ? canvas.clientWidth : canvas.clientHeight;
      const espessura = orientacao === 'horizontal' ? canvas.clientHeight : canvas.clientWidth;
      if (!(comprimento > 0 && espessura > 0)) continue;
      this.ajustar(canvas, orientacao === 'horizontal' ? comprimento : espessura, orientacao === 'horizontal' ? espessura : comprimento, c.vista.dpr);
      const ctx = this.ctx(papel, canvas);
      if (!ctx) continue;
      try {
        pintarRegua(ctx, { orientacao, vista: c.vista, unidade: c.unidade, comprimento, espessura, cores: c.cores, ponteiro: c.ui.ponteiro, deslocamento: 0 });
      } catch { /* idem */ }
    }
  }
}
