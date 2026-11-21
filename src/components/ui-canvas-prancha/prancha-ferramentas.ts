import type { GeometriaFeicao, Par } from '../../gerencigeo-canvas/feature_types';
import { SessaoDesenho, type Ferramenta } from '../../gerencigeo-canvas/feature_desenho';
import { ESPACO_PLANO, paraMm } from '../../gerencigeo-canvas/espaco/espaco_plano';
import { rotacao } from '../../gerencigeo-canvas/espaco/espaco_matriz';
import {
  caixaDeCantos, criarCaminho, criarElipse, criarEstrela, criarLinha, criarPoligonoRegular, criarRetangulo, criarTexto, type BaseNovoElemento
} from '../../gerencigeo-canvas/prancha/elemento_criacao';
import { transformarElemento } from '../../gerencigeo-canvas/prancha/elemento_transformacao';
import type { CaixaMm, ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import type { ControladorPrancha } from './prancha-controlador';
import { inserirNovos } from './prancha-comandos';
import { encerrarGesto } from './prancha-estado-ui';
import type { DetalheTextoSolicitadoPrancha, FerramentaPrancha } from './tipos';

/*
 * Ferramentas de desenho (sem listeners próprios: a interação chama `pressionar`/`mover`/`soltar`/`tecla`).
 *  - Arrasto (retângulo, elipse, polígono regular, estrela, linha, seta): Shift = proporcional/45°, Alt = do centro.
 *  - Clique a clique (polilinha, polígono, caneta Bézier): reaproveita a `SessaoDesenho` do mapa no espaço plano. Enter ou
 *    duplo clique conclui, clique no primeiro ponto fecha, Esc cancela, Backspace desfaz o último ponto. Na caneta,
 *    arrastar ao colocar a âncora puxa a alça.
 *  - Texto: clique emite `prancha-texto-solicitado` (cancelável); sem `preventDefault`, cria o texto padrão.
 */

export interface Modificadores {
  shift: boolean;
  alt: boolean;
  toque: boolean;
}

const POR_ARRASTO: readonly FerramentaPrancha[] = ['retangulo', 'elipse', 'poligono-regular', 'estrela', 'linha', 'seta'];
const POR_CLIQUE: Partial<Record<FerramentaPrancha, Ferramenta>> = { polilinha: 'linha', poligono: 'poligono', caneta: 'caneta' };
const ID_PREVIA = '__previa__';
const MINIMO_PX = 3;
const FECHAR_PX = 8;
const DUPLO_MS = 400;
const DUPLO_PX = 4;

export const ehFerramentaDeDesenho = (f: FerramentaPrancha): boolean => POR_ARRASTO.includes(f) || f in POR_CLIQUE || f === 'texto';

/** Caixa do arrasto com Shift (quadrada) e Alt (centrada no início). */
export function caixaDoArrasto(inicio: Par, atual: Par, shift: boolean, alt: boolean): CaixaMm {
  let dx = atual[0] - inicio[0];
  let dy = atual[1] - inicio[1];
  if (shift) {
    const s = Math.max(Math.abs(dx), Math.abs(dy));
    dx = (dx < 0 ? -1 : 1) * s;
    dy = (dy < 0 ? -1 : 1) * s;
  }
  if (alt) return { x: inicio[0] - Math.abs(dx), y: inicio[1] - Math.abs(dy), largura: 2 * Math.abs(dx), altura: 2 * Math.abs(dy) };
  return caixaDeCantos(inicio, [inicio[0] + dx, inicio[1] + dy]);
}

/** Ponto final restrito a múltiplos de 45° a partir do início (Shift na linha e na seta). */
export function restringir45(inicio: Par, atual: Par): Par {
  const dx = atual[0] - inicio[0];
  const dy = atual[1] - inicio[1];
  const r = Math.hypot(dx, dy);
  const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return [inicio[0] + r * Math.cos(a), inicio[1] + r * Math.sin(a)];
}

export class FerramentasDesenho {
  private arrasto: { inicio: Par; atual: Par; inicioPx: Par } | null = null;
  private sessao: SessaoDesenho | null = null;
  private puxandoAlca = false;
  private ultimoClique: { t: number; x: number; y: number } | null = null;

  constructor(private readonly c: ControladorPrancha) {}

  public get emAndamento(): boolean {
    return !!this.arrasto || (!!this.sessao && this.sessao.nos > 0);
  }

  private base(extra: Partial<BaseNovoElemento> = {}): BaseNovoElemento {
    return { id: ID_PREVIA, aparencia: this.c.aparenciaNova(), ...extra };
  }

  /** Elemento da forma de arrasto entre `inicio` e `atual` (null se degenerado). */
  public construir(f: FerramentaPrancha, inicio: Par, atual: Par, mod: Pick<Modificadores, 'shift' | 'alt'>): ElementoGrafico | null {
    const o = this.c.opcoesFerramentas;
    if (f === 'retangulo' || f === 'elipse') {
      const caixa = caixaDoArrasto(inicio, atual, mod.shift, mod.alt);
      return f === 'retangulo' ? criarRetangulo(this.base(), caixa, o.raioCantos) : criarElipse(this.base(), caixa);
    }
    if (f === 'poligono-regular' || f === 'estrela') {
      const raio = Math.hypot(atual[0] - inicio[0], atual[1] - inicio[1]);
      const el = f === 'poligono-regular'
        ? criarPoligonoRegular(this.base(), inicio, raio, o.lados ?? 6)
        : criarEstrela(this.base(), inicio, raio, raio * (o.proporcaoInterna ?? 0.45), o.pontas ?? 5);
      if (!el || mod.shift) return el;
      const giro = Math.atan2(atual[1] - inicio[1], atual[0] - inicio[0]) + Math.PI / 2;
      return transformarElemento(el, rotacao(giro, inicio));
    }
    if (f === 'linha' || f === 'seta') {
      const ate = mod.shift ? restringir45(inicio, atual) : atual;
      const ap = this.c.aparenciaNova();
      if (f === 'seta') ap.traco = { ...(ap.traco ?? {}), pontaFim: o.ponta ?? { estilo: 'triangulo' } };
      return criarLinha(this.base({ aparencia: ap }), inicio, ate);
    }
    return null;
  }

  public pressionar(p: Par, px: Par, mod: Modificadores): void {
    const f = this.c.ferramenta;
    const { ponto } = this.c.snapPonto(p, { toque: mod.toque, desligado: mod.alt && !POR_ARRASTO.includes(f) });
    if (POR_ARRASTO.includes(f)) {
      this.arrasto = { inicio: ponto, atual: ponto, inicioPx: px };
      return;
    }
    if (f === 'texto') {
      this.solicitarTexto(ponto);
      return;
    }
    const tipo = POR_CLIQUE[f];
    if (!tipo) return;
    if (!this.sessao) this.sessao = new SessaoDesenho(tipo, false, { espaco: ESPACO_PLANO });
    const s = this.sessao;
    const agora = Date.now();
    const duplo = !!this.ultimoClique && agora - this.ultimoClique.t <= DUPLO_MS && Math.hypot(px[0] - this.ultimoClique.x, px[1] - this.ultimoClique.y) <= DUPLO_PX;
    this.ultimoClique = { t: agora, x: px[0], y: px[1] };
    const primeiro = s.primeiro;
    if (primeiro && s.fechaNoPrimeiro) {
      const tp = this.c.vista.paraTela(primeiro);
      if (Math.hypot(tp[0] - px[0], tp[1] - px[1]) <= FECHAR_PX) {
        this.finalizar(s.concluirFechando());
        return;
      }
    }
    if (duplo && tipo !== 'caneta') {
      this.concluir();
      return;
    }
    s.clicar(ponto);
    if (tipo === 'caneta') this.puxandoAlca = true;
    this.atualizarPrevia();
  }

  public mover(p: Par, _px: Par, mod: Modificadores): void {
    const f = this.c.ferramenta;
    if (this.arrasto) {
      // nas formas de arrasto o Alt é "a partir do centro", não desliga o snap
      const { ponto } = this.c.snapPonto(p, { toque: mod.toque });
      this.arrasto.atual = ponto;
      this.c.ui.previa = this.construir(f, this.arrasto.inicio, ponto, mod);
      const caixa = caixaDoArrasto(this.arrasto.inicio, ponto, mod.shift, mod.alt);
      const r = (n: number) => Math.round(n * 10) / 10;
      this.c.ui.rotulo = { texto: `${r(caixa.largura)} × ${r(caixa.altura)} mm`, em: ponto };
      this.c.agendar();
      return;
    }
    if (this.sessao) {
      const { ponto } = this.c.snapPonto(p, { toque: mod.toque, desligado: mod.alt });
      if (this.puxandoAlca) this.sessao.definirAlca(ponto);
      else this.sessao.mover(ponto);
      this.atualizarPrevia();
    } else if (ehFerramentaDeDesenho(f)) {
      this.c.snapPonto(p, { toque: mod.toque, desligado: mod.alt });
      this.c.agendar();
    }
  }

  public soltar(_p: Par, px: Par, _mod: Modificadores): void {
    this.puxandoAlca = false;
    const a = this.arrasto;
    if (!a) return;
    this.arrasto = null;
    const el = this.c.ui.previa;
    encerrarGesto(this.c.ui);
    if (!el || Math.hypot(px[0] - a.inicioPx[0], px[1] - a.inicioPx[1]) < MINIMO_PX) {
      this.c.recusar('desenhar', 'forma-pequena');
      this.c.agendar();
      return;
    }
    inserirNovos(this.c, [{ ...el, id: '' }], 'ferramenta');
  }

  private atualizarPrevia(): void {
    const s = this.sessao;
    if (!s) return;
    const g = s.previa();
    this.c.ui.previa = g && (g.tipo === 'LineString' || g.tipo === 'Polygon') ? criarCaminho(this.base(), g) : null;
    this.c.ui.pontosPrevia = s.ferramenta === 'caneta' ? s.ancoras.map((a) => a.ponto) : [...s.pontos];
    this.c.agendar();
  }

  private finalizar(g: GeometriaFeicao | null): void {
    this.sessao = null;
    this.ultimoClique = null;
    encerrarGesto(this.c.ui);
    if (g && (g.tipo === 'LineString' || g.tipo === 'Polygon')) {
      const el = criarCaminho({ id: '', aparencia: this.c.aparenciaNova() }, g);
      if (el) inserirNovos(this.c, [el], 'ferramenta');
    } else {
      this.c.recusar('desenhar', 'geometria-invalida');
    }
    this.c.agendar();
  }

  public concluir(): boolean {
    const s = this.sessao;
    if (!s || !s.podeConcluir) return false;
    this.finalizar(s.concluir());
    return true;
  }

  public cancelar(): void {
    this.arrasto = null;
    this.sessao = null;
    this.puxandoAlca = false;
    this.ultimoClique = null;
    encerrarGesto(this.c.ui);
    this.c.agendar();
  }

  /** Enter, Esc e Backspace durante o desenho; devolve se tratou. */
  public tecla(chave: string): boolean {
    if (chave === 'Enter' && this.sessao) return this.concluir() || true;
    if (chave === 'Escape' && this.emAndamento) { this.cancelar(); return true; }
    if (chave === 'Backspace' && this.sessao && this.sessao.nos > 0) {
      this.sessao.desfazer();
      if (this.sessao.nos === 0) this.cancelar();
      else this.atualizarPrevia();
      return true;
    }
    return false;
  }

  /** Teclado: Enter com a ferramenta ativa e nada em andamento cria a forma padrão (40 × 30 mm) no centro da vista. */
  public criarNoCentro(): boolean {
    const f = this.c.ferramenta;
    const v = this.c.vista;
    const centro = v.largura > 0 ? v.paraFolha(v.largura / 2, v.altura / 2) : [this.c.folha.largura / 2, this.c.folha.altura / 2] as Par;
    if (f === 'texto') { this.solicitarTexto(centro); return true; }
    if (!POR_ARRASTO.includes(f)) return false;
    const el = this.construir(f, [centro[0] - 20, centro[1] - 15], [centro[0] + 20, centro[1] + 15], { shift: false, alt: false });
    return !!el && inserirNovos(this.c, [{ ...el, id: '' }], 'ferramenta').length > 0;
  }

  private solicitarTexto(posicao: Par): void {
    const o = this.c.opcoesFerramentas;
    const tamanho = o.tamanhoTexto && o.tamanhoTexto > 0 ? o.tamanhoTexto : paraMm(12, 'pt');
    const criar = (texto: string): ElementoGrafico | null => {
      const el = criarTexto({ id: '', aparencia: { preenchimento: { cor: this.c.aparenciaNova().traco?.cor ?? undefined } } }, posicao, texto, tamanho);
      return el ? inserirNovos(this.c, [el], 'texto')[0] ?? null : null;
    };
    const detalhe: DetalheTextoSolicitadoPrancha = { posicao, concluir: (texto) => criar(typeof texto === 'string' ? texto : String(texto ?? '')) };
    const cancelado = this.c.emitir('prancha-texto-solicitado', detalhe, true);
    if (!cancelado) criar(o.textoPadrao ?? 'Texto');
  }
}
