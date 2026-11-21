import type { Par } from '../../gerencigeo-canvas/feature_types';
import { buscarSnapPrancha, type Guia, type ResultadoSnapPrancha } from '../../gerencigeo-canvas/prancha/elemento_snap';
import type { CamadaPrancha, ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import { mapaDeCamadas, normalizarCamadas, type MapaCamadas } from '../../gerencigeo-canvas/prancha/camadas';
import { expandirGrupos } from '../../gerencigeo-canvas/prancha/organizacao';
import type { Matriz2D } from '../../gerencigeo-canvas/espaco/espaco_matriz';
import type { UnidadePrancha } from '../../gerencigeo-canvas/espaco/espaco_plano';
import { COR_PADRAO_PRANCHA, ESPESSURA_TRACO_PADRAO_MM } from '../../gerencigeo-canvas/prancha/aparencia_estilo';
import { DocumentoPrancha, diferencaVazia, type DiferencaDocumento, type ModoSelecao } from './prancha-documento';
import { VistaPrancha } from './prancha-vista';
import { criarEstadoInterface, encerrarGesto, type EstadoInterfacePrancha } from './prancha-estado-ui';
import { CORES_PADRAO_PRANCHA, type CoresInterfacePrancha } from './prancha-cores';
import { textoFerramenta, textoSelecao } from './prancha-acessibilidade';
import type {
  DetalheElementosPrancha, DetalheRemovidosPrancha, FerramentaPrancha, MotivoAlteracaoPrancha, MotivoRecusaPrancha,
  OpcoesFerramentasPrancha
} from './tipos';

/*
 * Controlador da prancha (sem listeners próprios): documento, vista, estado da interação, guias e opções. Toda mudança
 * feita pelo USUÁRIO (ou por um comando) passa por `aplicar`, que grava o histórico e emite `prancha-elemento-criado`,
 * `-atualizado` e `-removido` com a diferença. As chamadas de sincronização do app (`definirElementos`, `aplicarLote`...)
 * mudam o documento sem emitir esses eventos, como no `<ui-canvas-cad>`.
 */

export interface DependenciasControlador {
  emitir(nome: string, detalhe: unknown, cancelavel?: boolean): boolean;
  agendar(): void;
  anunciar(texto: string): void;
}

export class ControladorPrancha {
  public readonly doc = new DocumentoPrancha();
  public readonly vista = new VistaPrancha();
  public ui: EstadoInterfacePrancha = criarEstadoInterface();
  public cores: CoresInterfacePrancha = { ...CORES_PADRAO_PRANCHA };
  public guias: Guia[] = [];
  public ferramenta: FerramentaPrancha = 'selecao';
  public opcoesFerramentas: OpcoesFerramentasPrancha = {};
  public folha = { largura: 210, altura: 297 };
  public grade = 10;
  public mostrarGrade = false;
  public snapLigado = true;
  public guiasInteligentes = true;
  public unidade: UnidadePrancha = 'mm';
  public passoTeclado = 1;
  public somenteLeitura = false;
  /** Margens da folha em mm (guias automáticas e quadro das pré-definições de moldura); `null` = sem margens. */
  public margens: { esquerda: number; direita: number; superior: number; inferior: number } | null = null;
  /** Gera o id provisório de um elemento novo; o app pode trocar (`gerarId` do host) ou renomear depois. */
  public gerarId: (tipo: string) => string;
  private sequencia = 0;
  /** Camadas da prancha (ordem = empilhamento), a camada dos elementos novos e o grupo isolado (duplo clique). */
  public camadas: CamadaPrancha[] = [];
  public camadaAtiva: string | null = null;
  public isolado: string | null = null;
  /** Última transformação aplicada à seleção, para o Ctrl+D ("transformar de novo"). */
  public ultimaTransformacao: { matriz: Matriz2D; duplicar: boolean } | null = null;
  private cacheMapa: { camadas: readonly CamadaPrancha[]; mapa: MapaCamadas } | null = null;

  constructor(private readonly dep: DependenciasControlador) {
    this.gerarId = (tipo) => `${tipo}-${Date.now().toString(36)}-${(++this.sequencia).toString(36)}`;
  }

  public emitir(nome: string, detalhe: unknown, cancelavel = false): boolean {
    return this.dep.emitir(nome, detalhe, cancelavel);
  }

  public agendar(): void {
    this.dep.agendar();
  }

  public anunciar(texto: string): void {
    this.dep.anunciar(texto);
  }

  public recusar(acao: string, motivo: MotivoRecusaPrancha, id?: string): void {
    this.emitir('prancha-recusa', id === undefined ? { acao, motivo } : { acao, motivo, id });
  }

  /** Regras das camadas atuais (em cache pela lista). */
  public mapa(): MapaCamadas {
    if (!this.cacheMapa || this.cacheMapa.camadas !== this.camadas) this.cacheMapa = { camadas: this.camadas, mapa: mapaDeCamadas(this.camadas) };
    return this.cacheMapa.mapa;
  }

  /** Pode ser selecionado agora: visível, destravado (ele e a camada), não é máscara e está no grupo isolado, se houver. */
  public podeSelecionar(el: ElementoGrafico | undefined): boolean {
    const m = this.mapa();
    return !!el && !el.mascara && m.visivel(el) && !m.travado(el) && (this.isolado === null || el.grupoId === this.isolado);
  }

  /** Elementos perto do ponto (pelo índice), visíveis, na ordem do documento (para o desempate do empilhamento). */
  public candidatosEm(p: Par, raio: number): ElementoGrafico[] {
    const m = this.mapa();
    return this.doc.naOrdemDoDocumento(this.doc.indice.consultarPonto(p, raio).filter((e) => m.visivel(e)));
  }

  public definirCamadas(bruto: unknown): void {
    this.camadas = normalizarCamadas(bruto);
    if (this.camadaAtiva && !this.camadas.some((c) => c.id === this.camadaAtiva)) this.camadaAtiva = null;
    this.emitir('prancha-camadas', { camadas: this.camadas.map((c) => ({ ...c })) });
    this.podarSelecao();
    this.agendar();
  }

  /** Isola um grupo (só os membros se selecionam; o resto fica esmaecido) ou sai do isolamento (`null`). */
  public isolar(grupoId: string | null): void {
    const g = typeof grupoId === 'string' && this.doc.elementos.some((e) => e.grupoId === grupoId) ? grupoId : null;
    if (g === this.isolado) return;
    this.isolado = g;
    this.emitir('prancha-isolamento', { grupoId: g });
    this.anunciar(g ? 'Grupo isolado' : 'Saiu do grupo');
    this.podarSelecao();
    this.agendar();
  }

  /** Tira da seleção o que deixou de ser selecionável (camada oculta ou bloqueada, fora do grupo isolado). */
  public podarSelecao(): void {
    const manter = this.doc.selecao.filter((id) => this.podeSelecionar(this.doc.obter(id)));
    if (manter.length !== this.doc.selecao.length) this.selecionar(manter, 'substituir', false);
  }

  /** Elementos para a base: os do documento com os substitutos do gesto em andamento no lugar. */
  private cacheBase: { elementos: readonly ElementoGrafico[]; ids: string; base: readonly ElementoGrafico[] } | null = null;

  /**
   * Elementos da BASE: os do documento, sem os que estão num gesto (arrasto, alça, âncora). A lista fica a mesma durante o
   * gesto inteiro, então a base não é repintada a cada quadro; os elementos em gesto vão na sobreposição
   * (`elementosEmGesto`), por cima, como a prévia de arrasto dos editores vetoriais.
   */
  public elementosVisiveis(): readonly ElementoGrafico[] {
    const s = this.ui.substitutos;
    if (s.size === 0) return this.doc.elementos;
    const ids = [...s.keys()].join('\u0000');
    const c = this.cacheBase;
    if (c && c.elementos === this.doc.elementos && c.ids === ids) return c.base;
    const base = this.doc.elementos.filter((e) => !s.has(e.id));
    this.cacheBase = { elementos: this.doc.elementos, ids, base };
    return base;
  }

  /** Elementos transformados pelo gesto em andamento, na ordem de empilhamento. */
  public elementosEmGesto(): ElementoGrafico[] {
    const s = this.ui.substitutos;
    const movidos = s.size === 0 ? [] : this.doc.elementos.filter((e) => s.has(e.id)).map((e) => s.get(e.id)!);
    return this.ui.copiasEmGesto.length > 0 ? [...movidos, ...this.ui.copiasEmGesto] : movidos;
  }

  /** Emite os eventos da diferença (criados, atualizados, removidos) com o motivo. */
  public emitirDiferenca(dif: DiferencaDocumento, motivo: MotivoAlteracaoPrancha): void {
    if (dif.adicionados.length > 0) this.emitir('prancha-elemento-criado', { elementos: dif.adicionados, motivo } satisfies DetalheElementosPrancha);
    if (dif.atualizados.length > 0) this.emitir('prancha-elemento-atualizado', { elementos: dif.atualizados, motivo } satisfies DetalheElementosPrancha);
    if (dif.removidos.length > 0) {
      this.emitir('prancha-elemento-removido', { ids: dif.removidos.map((e) => e.id), elementos: dif.removidos, motivo } satisfies DetalheRemovidosPrancha);
    }
  }

  public emitirHistorico(): void {
    this.emitir('prancha-historico', { podeDesfazer: this.doc.historico.podeDesfazer, podeRefazer: this.doc.historico.podeRefazer });
  }

  /** Mudança do usuário: histórico + eventos + repintura. `chave` junta rajadas (setas, scrubber) num passo. */
  public aplicar(nova: readonly ElementoGrafico[], motivo: MotivoAlteracaoPrancha, chave?: string): DiferencaDocumento {
    const selecaoAntes = this.doc.selecao.join('\u0000');
    const ordemAntes = this.doc.elementos.map((e) => e.id).join('\u0000');
    const dif = this.doc.substituir(nova, { chave });
    const ordemDepois = this.doc.elementos.map((e) => e.id).join('\u0000');
    if (ordemDepois !== ordemAntes && dif.adicionados.length === 0 && dif.removidos.length === 0) {
      // a ordem de empilhamento mudou: o app persiste a nova ordem
      this.emitir('prancha-ordem', { ids: this.doc.elementos.map((e) => e.id), motivo });
      if (diferencaVazia(dif)) this.emitirHistorico();
    }
    if (!diferencaVazia(dif)) {
      this.emitirDiferenca(dif, motivo);
      this.emitirHistorico();
      if (this.ui.edicao && !this.doc.obter(this.ui.edicao.id)) this.ui.edicao = null;
      if (this.doc.selecao.join('\u0000') !== selecaoAntes) this.emitirSelecao();
    }
    this.agendar();
    return dif;
  }

  /** Substitui elementos pelo id (os demais ficam como estão). */
  public aplicarSubstituicoes(trocas: readonly ElementoGrafico[], motivo: MotivoAlteracaoPrancha, chave?: string): DiferencaDocumento {
    const m = new Map(trocas.map((e) => [e.id, e]));
    return this.aplicar(this.doc.elementos.map((e) => m.get(e.id) ?? e), motivo, chave);
  }

  public emitirSelecao(): void {
    const elementos = this.doc.elementosSelecionados();
    this.emitir('prancha-selecao', { ids: elementos.map((e) => e.id), elementos });
    this.anunciar(textoSelecao(elementos.length));
  }

  /**
   * Muda a seleção. Fora do isolamento, um membro de grupo seleciona o grupo inteiro (`expandir`). Só entra o que pode ser
   * selecionado (camadas, máscara, isolamento).
   */
  public selecionar(ids: readonly string[], modo: ModoSelecao = 'substituir', expandir = true): boolean {
    const base = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
    const alvo = (expandir && this.isolado === null ? expandirGrupos(this.doc.elementos, base) : base)
      .filter((id) => modo === 'remover' || this.podeSelecionar(this.doc.obter(id)));
    const mudou = this.doc.selecionar(alvo, modo);
    if (!mudou) return false;
    this.ui.pivo = null;
    if (this.ui.edicao && !this.doc.selecao.includes(this.ui.edicao.id)) this.encerrarEdicao();
    this.emitirSelecao();
    this.agendar();
    return true;
  }

  public definirFerramenta(f: FerramentaPrancha): void {
    if (f === this.ferramenta) return;
    encerrarGesto(this.ui);
    if (f !== 'selecao-direta' && this.ui.edicao) this.encerrarEdicao();
    this.ferramenta = f;
    this.emitir('prancha-ferramenta', { ferramenta: f });
    this.anunciar(textoFerramenta(f));
    this.agendar();
  }

  public iniciarEdicao(id: string): boolean {
    const el = this.doc.obter(id);
    if (!el) return false;
    if (el.bloqueado) { this.recusar('editar-ancoras', 'bloqueado', id); return false; }
    if (el.geometria.tipo === 'texto') { this.recusar('editar-ancoras', 'texto-sem-ancoras', id); return false; }
    if (this.ui.edicao?.id === id) return true;
    if (this.ui.edicao) this.encerrarEdicao();
    this.ui.edicao = { id, ancoras: [] };
    this.doc.selecionar([id]);
    this.emitirSelecao();
    this.emitir('prancha-edicao-iniciada', { elemento: el });
    this.agendar();
    return true;
  }

  public encerrarEdicao(): void {
    const e = this.ui.edicao;
    if (!e) return;
    this.ui.edicao = null;
    const el = this.doc.obter(e.id);
    if (el) this.emitir('prancha-edicao-concluida', { elemento: el });
    this.agendar();
  }

  public desfazer(): boolean {
    const dif = this.doc.desfazer();
    if (!dif) { this.recusar('desfazer', 'nada-a-desfazer'); return false; }
    this.posHistorico(dif, 'desfazer');
    return true;
  }

  public refazer(): boolean {
    const dif = this.doc.refazer();
    if (!dif) { this.recusar('refazer', 'nada-a-refazer'); return false; }
    this.posHistorico(dif, 'refazer');
    return true;
  }

  private posHistorico(dif: DiferencaDocumento, motivo: 'desfazer' | 'refazer'): void {
    encerrarGesto(this.ui);
    if (this.ui.edicao && !this.doc.obter(this.ui.edicao.id)) this.ui.edicao = null;
    this.emitirDiferenca(dif, motivo);
    this.emitirHistorico();
    this.anunciar(motivo === 'desfazer' ? 'Desfeito' : 'Refeito');
    this.agendar();
  }

  /** Tolerância de snap em px (toque precisa de mais). */
  public toleranciaPx(toque = false): number {
    return toque ? 16 : 8;
  }

  /**
   * Snap do ponto (mm) aos elementos perto (pelo índice), às guias e (opcional) à grade. Grava o resultado no estado
   * (para a sobreposição marcar). Snap desligado ou Alt: devolve o próprio ponto.
   */
  public snapPonto(p: Par, opcoes: { excluir?: Iterable<string>; grade?: boolean; toque?: boolean; desligado?: boolean } = {}): { ponto: Par; resultado: ResultadoSnapPrancha | null } {
    if (!this.snapLigado || opcoes.desligado) {
      this.ui.snap = null;
      return { ponto: p, resultado: null };
    }
    const tol = this.toleranciaPx(opcoes.toque);
    const raio = tol / this.vista.zoom + 1;
    const candidatos = this.candidatosEm(p, raio).filter((e) => !e.mascara);
    const r = buscarSnapPrancha(p, candidatos, this.vista.zoom, {
      toleranciaPx: tol, guias: this.guias, grade: opcoes.grade !== false && this.mostrarGrade ? { espacamento: this.grade } : null
    }, opcoes.excluir ?? []);
    this.ui.snap = r;
    return { ponto: r ? r.coordenada : p, resultado: r };
  }

  /** Emite a vista (zoom/pan) e repinta. */
  public emitirVista(): void {
    const v = this.vista;
    this.emitir('prancha-vista', { zoom: v.zoom, zoomPercentual: v.zoomPercentual, pan: [v.pan[0], v.pan[1]] });
    this.agendar();
  }

  public emitirGuias(): void {
    this.emitir('prancha-guias', { guias: this.guias.map((g) => ({ ...g })) });
    this.agendar();
  }

  /** Aparência dos elementos novos (cópia; padrão traço preto 0,25 mm sem preenchimento). */
  public aparenciaNova(): NonNullable<ElementoGrafico['aparencia']> {
    const a = this.opcoesFerramentas.aparencia;
    return a ? JSON.parse(JSON.stringify(a)) : { traco: { cor: COR_PADRAO_PRANCHA, espessura: ESPESSURA_TRACO_PADRAO_MM }, preenchimento: null };
  }
}
