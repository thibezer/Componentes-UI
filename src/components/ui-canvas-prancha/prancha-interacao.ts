import type { Par } from '../../gerencigeo-canvas/feature_types';
import { elementoNoTopo, elementosNaCaixa } from '../../gerencigeo-canvas/prancha/elemento_consulta';
import type { Guia } from '../../gerencigeo-canvas/prancha/elemento_snap';
import type { ListenerBag } from '../../core/listener-bag';
import type { ControladorPrancha } from './prancha-controlador';
import { FerramentasDesenho, ehFerramentaDeDesenho, type Modificadores } from './prancha-ferramentas';
import {
  alcaSobPonteiro, alvoDeEdicao, ancorasNaCaixa, iniciarGestoAlca, iniciarMover, moverGesto, soltarGesto, type GestoSelecao
} from './prancha-gestos';
import { encerrarGesto } from './prancha-estado-ui';
import { cliqueFerramentaDeEdicao, ehFerramentaDeEdicao } from './prancha-ferramentas-edicao';
import { textoZoom } from './prancha-acessibilidade';

/*
 * Interação por ponteiro da área de desenho e das réguas: decide o gesto pelo alvo e pela ferramenta e repassa para os
 * gestos de seleção (`prancha-gestos.ts`) ou de desenho (`prancha-ferramentas.ts`). Pan: ferramenta mão, espaço
 * segurado ou botão do meio. Zoom: roda (no ponto do cursor). Guias: arrastar de uma régua cria; arrastar uma guia de
 * volta para a régua remove. Todos os listeners entram no `ListenerBag` do componente.
 */

type Gesto =
  | { tipo: 'nenhum' }
  | { tipo: 'pan'; inicioPx: Par; panInicial: Par }
  | { tipo: 'caixa'; de: Par; dePx: Par; aditivo: boolean; moveu: boolean }
  | { tipo: 'selecao'; gesto: GestoSelecao; inicioPx: Par; moveu: boolean }
  | { tipo: 'guia'; indice: number | null }
  | { tipo: 'desenho' };

const TOLERANCIA_GUIA_PX = 4;
const ARRASTO_MINIMO_PX = 3;

export class InteracaoPrancha {
  private gesto: Gesto = { tipo: 'nenhum' };
  /** Espaço segurado (pan temporário). */
  public espaco = false;
  private ultimoClique: { t: number; x: number; y: number } | null = null;

  constructor(
    private readonly c: ControladorPrancha,
    private readonly viewport: HTMLElement,
    public readonly ferramentas: FerramentasDesenho
  ) {}

  public conectar(bag: ListenerBag, reguaH: HTMLElement | null, reguaV: HTMLElement | null): void {
    bag.add<PointerEvent>(this.viewport, 'pointerdown', (e: PointerEvent) => this.pressionar(e));
    bag.add<PointerEvent>(this.viewport, 'pointermove', (e: PointerEvent) => this.mover(e));
    bag.add<PointerEvent>(this.viewport, 'pointerup', (e: PointerEvent) => this.soltar(e));
    bag.add<PointerEvent>(this.viewport, 'pointercancel', () => this.cancelar());
    bag.add<PointerEvent>(this.viewport, 'pointerleave', () => this.sair());
    bag.add<WheelEvent>(this.viewport, 'wheel', (e: WheelEvent) => this.roda(e), { passive: false });
    bag.add<MouseEvent>(this.viewport, 'contextmenu', (e: MouseEvent) => { if (this.ferramentas.emAndamento) e.preventDefault(); });
    bag.add<PointerEvent>(reguaH, 'pointerdown', (e: PointerEvent) => this.puxarGuia(e, 'horizontal'));
    bag.add<PointerEvent>(reguaV, 'pointerdown', (e: PointerEvent) => this.puxarGuia(e, 'vertical'));
  }

  public get ocupado(): boolean {
    return this.gesto.tipo !== 'nenhum' || this.ferramentas.emAndamento;
  }

  private local(e: { clientX: number; clientY: number }): Par {
    const r = this.viewport.getBoundingClientRect?.();
    return [e.clientX - (r?.left ?? 0), e.clientY - (r?.top ?? 0)];
  }

  private mod(e: PointerEvent | MouseEvent): Modificadores & { ctrl: boolean } {
    return { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey, toque: (e as PointerEvent).pointerType === 'touch' };
  }

  private capturar(e: PointerEvent): void {
    try { this.viewport.setPointerCapture?.(e.pointerId); } catch { /* ponteiro já liberado */ }
  }

  private cursor(nome: string): void {
    if (this.viewport.dataset.cursor !== nome) this.viewport.dataset.cursor = nome;
  }

  private guiaSob(px: Par): number | null {
    const v = this.c.vista;
    for (let i = this.c.guias.length - 1; i >= 0; i--) {
      const g = this.c.guias[i];
      const d = g.orientacao === 'horizontal' ? Math.abs(v.paraTela([0, g.posicao])[1] - px[1]) : Math.abs(v.paraTela([g.posicao, 0])[0] - px[0]);
      if (d <= TOLERANCIA_GUIA_PX) return i;
    }
    return null;
  }

  private pressionar(e: PointerEvent): void {
    if (e.button === 2) return;
    try { this.viewport.focus({ preventScroll: true }); } catch { /* foco indisponível */ }
    const px = this.local(e);
    const p = this.c.vista.paraFolha(px[0], px[1]);
    const mod = this.mod(e);
    const f = this.c.ferramenta;
    this.capturar(e);

    if (e.button === 1 || this.espaco || f === 'mao') {
      this.gesto = { tipo: 'pan', inicioPx: px, panInicial: [...this.c.vista.pan] as Par };
      this.cursor('arrastando');
      return;
    }
    if (ehFerramentaDeEdicao(f)) {
      cliqueFerramentaDeEdicao(this.c, p, mod.toque);
      return;
    }
    if (ehFerramentaDeDesenho(f)) {
      if (this.c.somenteLeitura) { this.c.recusar('desenhar', 'somente-leitura'); return; }
      this.gesto = { tipo: 'desenho' };
      this.ferramentas.pressionar(p, px, mod);
      return;
    }

    const agora = Date.now();
    // duplo clique: sem Shift (Shift + cliques rápidos alternam a seleção) e sem encadear um terceiro clique
    const duplo = !mod.shift && !!this.ultimoClique && agora - this.ultimoClique.t <= 400 && Math.hypot(px[0] - this.ultimoClique.x, px[1] - this.ultimoClique.y) <= 4;
    this.ultimoClique = duplo ? null : { t: agora, x: px[0], y: px[1] };

    if (f === 'selecao-direta' && this.c.ui.edicao) {
      const alvo = alvoDeEdicao(this.c, px, mod.toque);
      const el = this.c.doc.obter(this.c.ui.edicao.id);
      if (alvo && el && !this.c.somenteLeitura) {
        const ed = this.c.ui.edicao;
        if (alvo.tipo === 'alca') {
          this.gesto = { tipo: 'selecao', gesto: { tipo: 'alca-bezier', original: el, indice: alvo.indice, qual: alvo.qual }, inicioPx: px, moveu: false };
        } else {
          if (mod.shift) ed.ancoras = ed.ancoras.includes(alvo.indice) ? ed.ancoras.filter((i) => i !== alvo.indice) : [...ed.ancoras, alvo.indice];
          else if (!ed.ancoras.includes(alvo.indice)) ed.ancoras = [alvo.indice];
          this.gesto = { tipo: 'selecao', gesto: { tipo: 'ancora', original: el, indice: alvo.indice, inicio: p }, inicioPx: px, moveu: false };
        }
        this.c.agendar();
        return;
      }
    }

    if (f === 'selecao' && !this.c.somenteLeitura) {
      const alca = alcaSobPonteiro(this.c, px, mod.toque);
      if (alca) {
        const g = iniciarGestoAlca(this.c, alca, p, mod);
        if (g) { this.gesto = { tipo: 'selecao', gesto: g, inicioPx: px, moveu: false }; return; }
      }
    }

    const tol = (mod.toque ? 12 : 4) / this.c.vista.zoom;
    const candidatos = this.c.candidatosEm(p, tol + 2).filter((e) => this.c.podeSelecionar(e));
    const alvo = elementoNoTopo(p, candidatos, { tolerancia: tol, camadas: this.c.camadas });
    if (alvo) {
      if (duplo && f === 'selecao') {
        // duplo clique num grupo isola o grupo; num elemento solto (ou já dentro do grupo isolado), edita as âncoras
        if (alvo.grupoId && this.c.isolado !== alvo.grupoId) {
          this.c.isolar(alvo.grupoId);
          this.c.selecionar([alvo.id], 'substituir', false);
          return;
        }
        this.c.definirFerramenta('selecao-direta');
        this.c.iniciarEdicao(alvo.id);
        return;
      }
      if (f === 'selecao-direta') this.c.iniciarEdicao(alvo.id);
      else if (mod.shift) this.c.selecionar([alvo.id], 'alternar');
      else if (!this.c.doc.selecao.includes(alvo.id)) this.c.selecionar([alvo.id]);
      if (this.c.somenteLeitura || !this.c.doc.selecao.includes(alvo.id)) return;
      const g = iniciarMover(this.c, p, mod.toque, mod.alt && f === 'selecao');
      if (g) this.gesto = { tipo: 'selecao', gesto: g, inicioPx: px, moveu: false };
      return;
    }

    if (duplo && this.c.isolado) {
      this.c.isolar(null);
      return;
    }
    const guia = f === 'selecao' && !this.c.somenteLeitura ? this.guiaSob(px) : null;
    if (guia !== null) {
      this.gesto = { tipo: 'guia', indice: guia };
      this.c.ui.guiaArrastada = { guia: { ...this.c.guias[guia] }, indice: guia };
      return;
    }

    this.gesto = { tipo: 'caixa', de: p, dePx: px, aditivo: mod.shift, moveu: false };
  }

  private mover(e: PointerEvent): void {
    const px = this.local(e);
    const p = this.c.vista.paraFolha(px[0], px[1]);
    const mod = this.mod(e);
    this.c.ui.ponteiro = p;
    this.c.emitir('prancha-ponteiro', { coordenada: p });
    const g = this.gesto;
    switch (g.tipo) {
      case 'pan':
        this.c.vista.pan = [g.panInicial[0] + px[0] - g.inicioPx[0], g.panInicial[1] + px[1] - g.inicioPx[1]];
        this.c.emitirVista();
        return;
      case 'desenho':
        this.ferramentas.mover(p, px, mod);
        return;
      case 'selecao':
        if (!g.moveu && Math.hypot(px[0] - g.inicioPx[0], px[1] - g.inicioPx[1]) < ARRASTO_MINIMO_PX) return;
        g.moveu = true;
        moverGesto(this.c, g.gesto, p, mod);
        return;
      case 'guia': {
        const ga = this.c.ui.guiaArrastada;
        if (ga) ga.guia = { ...ga.guia, posicao: ga.guia.orientacao === 'horizontal' ? p[1] : p[0] };
        this.c.agendar();
        return;
      }
      case 'caixa':
        if (!g.moveu && Math.hypot(px[0] - g.dePx[0], px[1] - g.dePx[1]) < ARRASTO_MINIMO_PX) return;
        g.moveu = true;
        this.c.ui.caixaSelecao = { de: g.de, ate: p, crossing: p[0] < g.de[0] };
        this.c.agendar();
        return;
      default:
        break;
    }
    if (ehFerramentaDeDesenho(this.c.ferramenta)) {
      this.ferramentas.mover(p, px, mod);
      this.cursor('mira');
      return;
    }
    this.atualizarHover(p, px, mod.toque);
  }

  private atualizarHover(p: Par, px: Par, toque: boolean): void {
    const f = this.c.ferramenta;
    if (f === 'mao' || this.espaco) { this.cursor('mao'); return; }
    const alca = f === 'selecao' ? alcaSobPonteiro(this.c, px, toque) : null;
    const tol = 4 / this.c.vista.zoom;
    const hover = elementoNoTopo(p, this.c.candidatosEm(p, tol + 2).filter((e) => this.c.podeSelecionar(e)), { tolerancia: tol, camadas: this.c.camadas });
    const id = hover?.id ?? null;
    this.cursor(alca ? (alca.tipo === 'rotacao' ? 'girar' : 'mover') : f === 'selecao-direta' && alvoDeEdicao(this.c, px, toque) ? 'ancora' : hover ? 'mover' : 'padrao');
    if (id !== this.c.ui.hoverId) {
      this.c.ui.hoverId = id;
      this.c.agendar();
    } else if (this.c.ui.ponteiro) {
      this.c.agendar();
    }
  }

  private soltar(e: PointerEvent): void {
    const px = this.local(e);
    const p = this.c.vista.paraFolha(px[0], px[1]);
    const g = this.gesto;
    this.gesto = { tipo: 'nenhum' };
    try { this.viewport.releasePointerCapture?.(e.pointerId); } catch { /* já liberado */ }
    switch (g.tipo) {
      case 'pan':
        this.cursor(this.espaco || this.c.ferramenta === 'mao' ? 'mao' : 'padrao');
        return;
      case 'desenho':
        this.ferramentas.soltar(p, px, this.mod(e));
        return;
      case 'selecao':
        if (g.moveu) soltarGesto(this.c, g.gesto);
        else this.c.agendar();
        return;
      case 'guia':
        this.soltarGuia(g.indice, px);
        return;
      case 'caixa':
        this.soltarCaixa(g, p);
        return;
      default:
        return;
    }
  }

  private soltarCaixa(g: Extract<Gesto, { tipo: 'caixa' }>, p: Par): void {
    this.c.ui.caixaSelecao = null;
    if (!g.moveu) {
      if (this.c.ui.edicao && this.c.ferramenta === 'selecao-direta') this.c.encerrarEdicao();
      if (!g.aditivo) this.c.selecionar([]);
      this.c.agendar();
      return;
    }
    if (this.c.ferramenta === 'selecao-direta' && this.c.ui.edicao) {
      this.c.ui.edicao.ancoras = ancorasNaCaixa(this.c, g.de, p);
      this.c.agendar();
      return;
    }
    const caixa = { x: Math.min(g.de[0], p[0]), y: Math.min(g.de[1], p[1]), largura: Math.abs(p[0] - g.de[0]), altura: Math.abs(p[1] - g.de[1]) };
    const modo = p[0] < g.de[0] ? 'crossing' : 'window';
    const candidatos = this.c.doc.indice.consultarCaixa(caixa).filter((e) => this.c.podeSelecionar(e));
    const ids = elementosNaCaixa(caixa, candidatos, modo, { camadas: this.c.camadas }).map((e) => e.id);
    if (!this.c.selecionar(ids, g.aditivo ? 'adicionar' : 'substituir')) this.c.agendar();
  }

  private puxarGuia(e: PointerEvent, orientacao: Guia['orientacao']): void {
    if (e.button !== 0 || this.c.somenteLeitura) return;
    const px = this.local(e);
    const p = this.c.vista.paraFolha(px[0], px[1]);
    this.capturar(e);
    this.gesto = { tipo: 'guia', indice: null };
    this.c.ui.guiaArrastada = { guia: { orientacao, posicao: orientacao === 'horizontal' ? p[1] : p[0] }, indice: null };
    this.c.agendar();
  }

  private soltarGuia(indice: number | null, px: Par): void {
    const ga = this.c.ui.guiaArrastada;
    this.c.ui.guiaArrastada = null;
    if (!ga) return;
    const sobreRegua = ga.guia.orientacao === 'horizontal' ? px[1] < 0 : px[0] < 0;
    if (indice === null) {
      if (!sobreRegua) this.c.guias = [...this.c.guias, ga.guia];
    } else if (sobreRegua) {
      this.c.guias = this.c.guias.filter((_, i) => i !== indice);
    } else {
      this.c.guias = this.c.guias.map((g, i) => (i === indice ? ga.guia : g));
    }
    this.c.emitirGuias();
  }

  private roda(e: WheelEvent): void {
    e.preventDefault();
    const px = this.local(e);
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (e.shiftKey && !e.ctrlKey) {
      this.c.vista.deslocar(-delta, 0);
      this.c.emitirVista();
      return;
    }
    if (this.c.vista.zoomRelativo(Math.exp(-delta * 0.0015), px)) {
      this.c.emitirVista();
      this.c.anunciar(textoZoom(this.c.vista.zoomPercentual));
    }
  }

  private sair(): void {
    if (this.gesto.tipo !== 'nenhum') return;
    this.c.ui.ponteiro = null;
    this.c.ui.hoverId = null;
    this.c.ui.snap = null;
    this.c.emitir('prancha-ponteiro', { coordenada: null });
    this.c.agendar();
  }

  /** Cancela qualquer gesto (Esc, perda de ponteiro): nada muda no documento. */
  public cancelar(): void {
    this.gesto = { tipo: 'nenhum' };
    this.ferramentas.cancelar();
    encerrarGesto(this.c.ui);
    this.c.agendar();
  }
}
