import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import type { Feicao } from '../../gerencigeo-canvas/feature_types';
import { normalizarCoordenada } from '../../gerencigeo-canvas/feature_adapters';
import { RegraVersoes } from '../../gerencigeo-canvas/feature_versoes';
import { CursoresRemotos, type UsuarioRemoto } from '../../gerencigeo-canvas/feature_cursores';
import { LayerRendererFactory } from '../../gerencigeo-canvas/layer_renderer_factory';
import type { FeicoesLayerRenderer } from '../../gerencigeo-canvas/renderers/feicoes_renderer';
import { SelecaoFeicoes, type RefFeicao } from '../../gerencigeo-canvas/feature_selecao';
import type { CaixaPx, ModoCaixa } from '../../gerencigeo-canvas/feature_caixa';
import { FeicaoPopup, coordenadaDeReferencia, type AcaoFeicao, type MargensPopup } from '../../gerencigeo-canvas/feature_popup';
import L from 'leaflet';
import type { ExcluirSnap } from '../../gerencigeo-canvas/feature_snap';
import { ControleSnap } from './cad-snap';
import { OperacoesFeicoes } from './cad-feicoes-operacoes';
import { VersoesFeicoes } from './cad-feicoes-versoes';
import { CameraFeicoes } from './cad-feicoes-camera';
import { FerramentasDesenho } from './cad-feicoes-desenho';
import { RepositorioFeicoes } from './cad-feicoes-dados';
import { EdicaoFeicoes } from './cad-feicoes-edicao';
import { ConsultaEspacialFeicoes } from './cad-feicoes-consulta';
import { PonteiroFeicoes } from './cad-feicoes-ponteiro';
import { SelecaoPorRegiao } from './cad-feicoes-selecao-regiao';
import type { EditorVertices } from '../../gerencigeo-canvas/feature_editor_vertices';
import type { ControleDesenho } from '../../gerencigeo-canvas/feature_desenho_controle';
import type { Ferramenta } from '../../gerencigeo-canvas/feature_desenho';
import type { EstiloFeicao, LatLonPar } from '../../gerencigeo-canvas/feature_types';
import { aplicarMargensHud, type MargensHud } from '../../gerencigeo-canvas/feature_hud';
import type { ModoPopups } from '../../gerencigeo-canvas/popup_gate';

import {
  TIPO_CAMADA_FEICOES,
  type OpcoesCamadaFeicoes, type OpcoesLote, type AtualizacaoFeicao, type LoteFeicoes, type ResultadoLote,
  type ResultadoFeicoes, type OpcoesPopup, type ResultadoFerramenta, type ResultadoEdicao
} from './cad-feicoes-tipos';

export { TIPO_CAMADA_FEICOES };
export type { OpcoesCamadaFeicoes, OpcoesLote, AtualizacaoFeicao, LoteFeicoes, ResultadoLote, ResultadoFeicoes, OpcoesPopup, ResultadoFerramenta, ResultadoEdicao };

/*
 * Camadas de feições genéricas. Nada é criado sozinho: a camada só passa a existir quando o
 * consumidor chama definirFeicoes/adicionarFeicao. Os dados ficam em `CanvasLayerDef.dados.feicoes`.
 */








interface Contexto {
  obterLayerManager: () => CanvasLayerManager;
  obterMapa: () => L.Map | null;
  /** Dispara o evento do componente. Com `cancelavel`, devolve `true` se algum ouvinte chamou `preventDefault()`. */
  emitir: (evento: string, detalhe: unknown, cancelavel?: boolean) => unknown;
  /** O snap foi ligado/desligado (para refletir no botão da barra). */
  aoSnapMudar?: (ligado: boolean) => void;
  /** A ferramenta de desenho ativa mudou (`null` = nenhuma). */
  aoFerramenta?: (ferramenta: Ferramenta | null) => void;
  /** Regra de oficial × prévia compartilhada com o renderizador (o componente a põe no contexto de renderização). */
  regra?: RegraVersoes;
  /**
   * Quando o popup da feição abre: `sob-demanda` (padrão do componente) só por duplo clique ou `abrirPopupFeicao`;
   * `automatico` também ao selecionar uma feição. Sem esta função (uso direto do gerenciador), vale `automatico`.
   */
  modoPopups?: () => ModoPopups;
  /** Executa a abertura de um popup como pedido explícito, passando pelo portão de popups do mapa. */
  liberarPopups?: <T>(fn: () => T) => T;
}




export class GerenciadorFeicoes {
  private operacoes: OperacoesFeicoes;
  private selecao: SelecaoFeicoes;
  private popup: FeicaoPopup;
  private edicao: EdicaoFeicoes;
  private consulta: ConsultaEspacialFeicoes;
  private ponteiro: PonteiroFeicoes;
  private regiao: SelecaoPorRegiao;
  private snap: ControleSnap;
  private ferramentas: FerramentasDesenho;
  private versoes: VersoesFeicoes;
  private camera: CameraFeicoes;
  private repositorio: RepositorioFeicoes;
  private cursores: CursoresRemotos;
  private margensHud: Partial<MargensHud> = {};
  /** Aceita a coordenada (0, 0) exata nas feições de entrada (atributo `aceitar-origem`). */
  public aceitarOrigem = false;
  private opcoesPopup: Required<OpcoesPopup> = { copiarParaAreaDeTransferencia: true };

  constructor(private contexto: Contexto) {
    this.repositorio = new RepositorioFeicoes({
      obterLayerManager: () => this.contexto.obterLayerManager(),
      opcoesNormalizacao: () => this.opcoesNormalizacao(),
      aposDados: () => this.aposDados()
    });
    this.consulta = new ConsultaEspacialFeicoes({
      obterMapa: () => this.contexto.obterMapa(),
      obterLayerManager: () => this.contexto.obterLayerManager(),
      desenhada: (f) => this.desenhada(f)
    });
    this.ponteiro = new PonteiroFeicoes({
      emitir: (evento, detalhe) => this.contexto.emitir(evento, detalhe),
      feicaoSob: (x, y) => this.consulta.feicaoSob(x, y),
      interacaoAtiva: () => this.ferramentas.ativo || this.edicao.editando,
      botaoDireitoDaFerramenta: () => {
        if (!this.ferramentas.ativo) return false;
        this.ferramentas.botaoDireito();
        return true;
      },
      abrirPopup: (f) => this.popup.abrir(f)
    });
    this.regiao = new SelecaoPorRegiao({
      obterMapa: () => this.contexto.obterMapa(),
      obterLayerManager: () => this.contexto.obterLayerManager(),
      lista: (c) => this.lista(c),
      desenhada: (f) => this.desenhada(f),
      desativarFerramenta: () => this.ferramentas.desativarFerramenta(),
      selecionar: (refs) => this.selecao.selecionar(refs),
      alternarVarias: (refs) => this.selecao.alternarVarias(refs)
    });
    this.edicao = new EdicaoFeicoes({
      obterMapa: () => this.contexto.obterMapa(),
      obterLayerManager: () => this.contexto.obterLayerManager(),
      emitir: (evento, detalhe) => this.contexto.emitir(evento, detalhe),
      buscar: (c, i) => this.buscar(c, i),
      substituir: (c, f) => this.substituir(c, f),
      desativarFerramenta: () => this.ferramentas.desativarFerramenta(),
      aplicarMargensHud: () => this.aplicarMargensHud(),
      selecionarUma: (ref) => this.selecao.selecionar([ref]),
      fecharPopup: () => this.popup.fechar(),
      reabrirPopupDaSelecao: () => {
        // só o modo automático devolve o popup ao fim da edição; sob demanda, quem quiser o abre de novo
        if (this.modoPopups() !== 'automatico') return;
        const selecionadas = this.selecao.obter();
        if (selecionadas.length === 1) this.popup.abrir(selecionadas[0]);
      },
      snapAtivo: () => this.snap.ativo,
      alternarSnap: () => this.snap.alternar(),
      buscarSnapEm: (coord, excluir) => this.buscarSnapEm(coord, excluir)
    });
    this.versoes = new VersoesFeicoes({
      obterLayerManager: () => this.contexto.obterLayerManager(),
      emitir: (evento, detalhe) => this.contexto.emitir(evento, detalhe),
      buscar: (c, i) => this.buscar(c, i),
      lista: (c) => this.lista(c),
      aposDados: () => this.aposDados()
    }, contexto.regra ?? new RegraVersoes());
    this.ferramentas = new FerramentasDesenho({
      obterMapa: () => this.contexto.obterMapa(),
      obterLayerManager: () => this.contexto.obterLayerManager(),
      emitir: (evento, detalhe, cancelavel) => this.contexto.emitir(evento, detalhe, cancelavel),
      aoFerramenta: (f) => this.contexto.aoFerramenta?.(f),
      lista: (c) => this.lista(c),
      adicionarFeicao: (c, b) => this.adicionarFeicao(c, b),
      buscarSnapEm: (coord) => this.buscarSnapEm(coord),
      snapAtivo: () => this.snap.ativo,
      prepararDesenho: () => { this.edicao.parar(); this.popup.fechar(); this.aplicarMargensHud(); },
      normalizarCoordenada: (b) => normalizarCoordenada(b, this.opcoesNormalizacao()),
      dividirComLinha: (l) => this.dividirComLinha(l),
      selecionarNoLaco: (l) => this.selecionarNoLaco(l),
      candidatasEm: (c, t) => this.candidatasEm(c, t)
    });
    this.camera = new CameraFeicoes({
      obterMapa: () => this.contexto.obterMapa(),
      obterLayerManager: () => this.contexto.obterLayerManager(),
      buscar: (c, i) => this.buscar(c, i),
      lista: (c) => this.lista(c),
      desenhada: (f) => this.desenhada(f),
      garantirVisivel: (f) => this.versoes.garantirVisivel(f)
    });
    this.operacoes = new OperacoesFeicoes({
      emitir: (evento, detalhe) => this.contexto.emitir(evento, detalhe),
      obterLayerManager: () => this.contexto.obterLayerManager(),
      buscar: (c, i) => this.buscar(c, i),
      lista: (c) => this.lista(c),
      desenhada: (f) => this.desenhada(f),
      idLivre: (c, b) => this.idLivre(c, b),
      adicionarFeicao: (c, b) => this.adicionarFeicao(c, b),
      removerFeicao: (c, i) => this.removerFeicao(c, i),
      selecionadas: () => this.selecao.obter(),
      estaSelecionada: (r) => this.selecao.contem(r),
      divisaoAtiva: () => this.ferramentas.ferramentaAtiva === 'dividir',
      encerrarDesenho: () => this.ferramentas.desativarFerramenta()
    });
    this.cursores = new CursoresRemotos(() => this.contexto.obterMapa());
    this.snap = new ControleSnap({
      aoMudar: (estado) => {
        this.contexto.emitir('cad-snap', estado);
        this.edicao.atualizarSnapNoHud();
        this.contexto.aoSnapMudar?.(estado.ligado);
      }
    });
    this.popup = new FeicaoPopup({
      obterMapa: () => this.contexto.obterMapa(),
      obterCamada: (id) => this.contexto.obterLayerManager().getLayerDef(id),
      aoAcao: (acao, feicao) => this.tratarAcaoPopup(acao, feicao),
      liberar: (fn) => (this.contexto.liberarPopups ? this.contexto.liberarPopups(fn) : fn())
    });
    this.selecao = new SelecaoFeicoes({
      obterFeicao: (r) => this.buscar(r.camadaId, r.id),
      aplicarVisual: (camadaId, ids) => {
        const instancia = this.contexto.obterLayerManager().getLayerInstance(camadaId);
        const renderer = LayerRendererFactory.get(TIPO_CAMADA_FEICOES) as FeicoesLayerRenderer | undefined;
        if (instancia && renderer) renderer.aplicarSelecao(instancia as L.LayerGroup, ids);
      },
      aoSelecionar: (feicoes) => {
        this.contexto.emitir('cad-selecao', { feicoes });
        if (this.edicao.editando) {
          // sair da feição em edição encerra a edição; o popup volta conforme a seleção nova
          const ed = this.edicao.feicao!;
          const mesma = feicoes.length === 1 && feicoes[0].id === ed.id && feicoes[0].camadaId === ed.camadaId;
          if (!mesma) this.edicao.parar();
          return;
        }
        // popup automático só para exatamente uma feição; com mais (ou nenhuma) fecha. Sob demanda, selecionar não abre
        if (feicoes.length === 1 && this.modoPopups() === 'automatico') this.popup.abrir(feicoes[0]);
        else this.popup.fechar();
      },
      aoSelecionarUma: (feicao) => this.contexto.emitir('cad-feicao-selecionada', { feicao }),
      visivel: (f) => this.selecionavelAgora(f),
      selecionavel: (f) => !f.oculta
    });
  }

  /** Depois de qualquer mudança nos dados: descarta seleção órfã e atualiza/fecha o popup aberto. */
  private aposDados(): void {
    this.selecao.reconciliar();
    if (this.edicao.editando) {
      const ed = this.edicao.feicao!;
      const atualEd = this.buscar(ed.camadaId, ed.id);
      if (!atualEd || atualEd.excluida) this.edicao.parar();
      else if (atualEd !== ed) this.edicao.sincronizar(atualEd);
    }
    const aberta = this.popup.aberto;
    if (!aberta) return;
    const atual = this.buscar(aberta.camadaId, aberta.id);
    if (atual && !atual.excluida) this.popup.atualizar(atual);
    else this.popup.fechar();
  }

  private lista(camadaId: string): Feicao[] {
    return this.repositorio.lista(camadaId);
  }

  /** Feição da camada pelo id (O(1)); `undefined` se não existe. */
  public buscar(camadaId: string, id: string): Feicao | undefined {
    return this.repositorio.buscar(camadaId, id);
  }

  private opcoesNormalizacao(): { aceitarOrigem: boolean } {
    return { aceitarOrigem: this.aceitarOrigem };
  }

  public definirFeicoes(camadaId: string, brutas: unknown[], opcoes?: OpcoesCamadaFeicoes): ResultadoFeicoes {
    return this.repositorio.definirFeicoes(camadaId, brutas, opcoes);
  }

  public adicionarFeicao(camadaId: string, bruta: unknown, opcoes?: OpcoesCamadaFeicoes): Feicao | null {
    return this.repositorio.adicionarFeicao(camadaId, bruta, opcoes);
  }

  /** Mescla campos de primeiro nível; `estilo` e `propriedades` também são mesclados. Ver `RepositorioFeicoes`. */
  public atualizarFeicao(camadaId: string, id: string, parcial: Record<string, any>, opcoes?: Pick<OpcoesLote, 'substituirPropriedades'>): Feicao | null {
    return this.repositorio.atualizarFeicao(camadaId, id, parcial, opcoes);
  }

  /** Grava uma feição já normalizada (usado quando o próprio mapa a altera, como ao arrastar um texto). */
  public substituir(camadaId: string, feicao: Feicao): void {
    this.repositorio.substituir(camadaId, feicao);
  }

  public removerFeicao(camadaId: string, id: string): boolean {
    return this.repositorio.removerFeicao(camadaId, id);
  }

  /** Várias mudanças numa só regravação e num só `aposDados`: remove, depois atualiza, depois adiciona. */
  public aplicarLote(camadaId: string, lote: LoteFeicoes, opcoes?: OpcoesLote): ResultadoLote {
    return this.repositorio.aplicarLote(camadaId, lote, opcoes);
  }

  public obterFeicoes(camadaId: string): Feicao[] {
    return this.lista(camadaId).map((f) => ({ ...f }));
  }

  /** Traduz as ações vindas do renderizador no evento a disparar pelo componente. */
  public tratarAcaoCamada(acao: string, detalhe: { camadaId: string; feicao: Feicao; aditivo?: boolean }): string | null {
    if (acao === 'feicao-movida') {
      this.substituir(detalhe.camadaId, detalhe.feicao);
      return 'cad-feicao-atualizada';
    }
    if (acao === 'feicao-clique') {
      if (this.ferramentas.ativo) return null; // com uma ferramenta ativa, o clique é do desenho
      const ref = { camadaId: detalhe.camadaId, id: detalhe.feicao.id };
      if (detalhe.aditivo) this.selecao.alternar(ref);
      else this.selecao.selecionar([ref]);
      return 'cad-feicao-clique';
    }
    return null;
  }

  // ---- seleção ----

  public selecionarFeicoes(refs: RefFeicao[], aditivo = false): void {
    this.selecao.selecionar(Array.isArray(refs) ? refs : [], aditivo);
  }

  public alternarSelecaoFeicao(ref: RefFeicao): void {
    this.selecao.alternar(ref);
  }

  public limparSelecaoFeicoes(): void {
    this.selecao.limpar();
  }

  /** Esc ou clique no vazio: durante a edição só encerra a edição; fora dela, limpa a seleção. */
  public aoPedirLimpeza(): void {
    if (this.ferramentas.ativo) return; // Esc é tratado pela própria ferramenta
    if (this.edicao.editando) this.edicao.parar();
    else this.selecao.limpar();
  }

  public obterFeicoesSelecionadas(): Feicao[] {
    return this.selecao.obter();
  }

  /** Laço: seleciona (substituindo) as feições tocadas pelo polígono; a ferramenta encerra. */
  private selecionarNoLaco(laco: LatLonPar[]): void {
    this.regiao.selecionarNoLaco(laco);
  }

  /** Caixa de seleção: só feições de camadas visíveis, interativas e desbloqueadas, com toque geométrico real. */
  public selecionarNaCaixa(caixa: CaixaPx, modo: ModoCaixa, aditivo: boolean): void {
    this.regiao.selecionarNaCaixa(caixa, modo, aditivo);
  }

  // ---- popup e câmera ----

  public definirMargensPopup(m: Partial<MargensPopup>): void {
    this.popup.definirMargens(m);
  }

  public fecharPopup(): void {
    this.popup.fechar();
  }

  private modoPopups(): ModoPopups {
    return this.contexto.modoPopups?.() ?? 'automatico';
  }

  /** Pedido explícito: abre o popup da feição (vale em qualquer modo). `false` se não existe, foi excluída ou não está na tela. */
  public abrirPopupFeicao(camadaId: string, id: string): boolean {
    if (typeof camadaId !== 'string' || typeof id !== 'string') return false;
    const f = this.buscar(camadaId, id);
    if (!f || f.excluida || !this.desenhada(f)) return false;
    this.popup.abrir(f);
    return true;
  }

  /** Duplo clique no mapa: abre o popup da feição sob o cursor (a não ser que os popups estejam desligados). */
  public aoDuploClique(e: MouseEvent): void {
    if (this.modoPopups() === 'desligado') return;
    this.ponteiro.duploClique(e);
  }

  /** Opções do popup (hoje: se "copiar" escreve na área de transferência). Mescla com o que já foi definido. */
  public definirOpcoesPopup(opcoes: OpcoesPopup): void {
    this.opcoesPopup = { ...this.opcoesPopup, ...opcoes } as Required<OpcoesPopup>;
  }

  public obterOpcoesPopup(): Required<OpcoesPopup> {
    return { ...this.opcoesPopup };
  }

  /**
   * Margens (px) de barras e painéis que cobrem o mapa: os HUDs de desenho e de edição se centralizam na área
   * que sobra. Mescla com o que já foi definido; `undefined` numa chave volta ao padrão (ou ao CSS `--cad-hud-*` do host).
   */
  public definirMargensHud(m: Partial<MargensHud>): void {
    this.margensHud = { ...this.margensHud, ...m };
    this.aplicarMargensHud();
  }

  private aplicarMargensHud(): void {
    const map = this.contexto.obterMapa();
    if (map) aplicarMargensHud(map.getContainer(), this.margensHud);
  }

  // ---- versões (oficial × prévia) ----

  // ---- versões (oficial × prévia) ----

  public get regraVersoes(): RegraVersoes {
    return this.versoes.regra;
  }

  /** Aparece segundo a regra de oficial × prévia? */
  public visivelPorVersao(f: Feicao): boolean {
    return this.versoes.visivelPorVersao(f);
  }

  /** Vai para a tela e responde a clique, caixa, laço, snap e hover: não excluída, não oculta e visível pela regra de versões. */
  public desenhada(f: Feicao): boolean {
    return this.versoes.desenhada(f);
  }

  /** Regra da seleção: a feição em edição continua selecionada mesmo se for ocultada no meio da edição. */
  private selecionavelAgora(f: Feicao): boolean {
    const ed = this.edicao.feicao;
    if (ed && ed.id === f.id && ed.camadaId === f.camadaId) return true;
    return !f.oculta && this.visivelPorVersao(f);
  }

  public get previasGlobais(): boolean {
    return this.versoes.previasGlobais;
  }

  /** Mostra (ou esconde) as prévias de todas as entidades. Prévias de entidades sem oficial aparecem sempre. */
  public definirPreviasGlobais(ligado: boolean): void {
    this.versoes.definirPreviasGlobais(ligado);
  }

  public alternarPreviasGlobais(): void {
    this.versoes.alternarPreviasGlobais();
  }

  /** Liga/desliga a prévia da entidade a que a feição pertence. Devolve o novo estado, ou `null` se a feição não existe. */
  public alternarPrevia(camadaId: string, id: string): boolean | null {
    return this.versoes.alternarPrevia(camadaId, id);
  }

  /** A prévia da feição está sendo mostrada por pedido (global ou individual)? */
  public previaSolicitada(camadaId: string, id: string): boolean {
    return this.versoes.previaSolicitada(camadaId, id);
  }

  // ---- cursores de outros operadores ----

  public atualizarCursorRemoto(usuario: UsuarioRemoto, posicao: unknown): boolean {
    const c = normalizarCoordenada(posicao, this.opcoesNormalizacao());
    return !!c && this.cursores.atualizar(usuario, c);
  }

  public removerCursorRemoto(id: string): boolean {
    return this.cursores.remover(id);
  }

  public limparCursoresRemotos(): void {
    this.cursores.limpar();
  }

  public get cursoresRemotos(): number {
    return this.cursores.quantidade;
  }

  // ---- câmera ----

  /** Aproxima da feição; liga a camada e a prévia, se estiverem escondidas. Ponto: voa até z ≥ 17. */
  public zoomParaFeicao(camadaId: string, id: string): boolean {
    return this.camera.zoomParaFeicao(camadaId, id);
  }

  public zoomParaFeicoes(refs: RefFeicao[]): boolean {
    return this.camera.zoomParaFeicoes(refs);
  }

  /** Enquadra todas as feições das camadas de feições visíveis (que aparecem pela regra de versões). */
  public ajustarTudo(): boolean {
    return this.camera.ajustarTudo();
  }

  /** Enquadra a camada inteira; se estava oculta, torna-a visível. */
  public ajustarCamada(camadaId: string): boolean {
    return this.camera.ajustarCamada(camadaId);
  }

  // ---- hover e menu de contexto ----

  /** Emite `cad-feicao-hover` quando a feição sob o mouse muda (uma checagem por quadro). */
  public aoMoverMouse(e: MouseEvent): void {
    this.ponteiro.aoMoverMouse(e);
  }

  /** Botão direito: emite `cad-feicao-menu` com a feição sob o cursor (ou `null`), para o consumidor abrir o próprio menu. */
  public menuContexto(e: MouseEvent): void {
    this.ponteiro.menuContexto(e);
  }

  public destruir(): void {
    // o controle guarda o mapa; depois de reconectar o componente o mapa é outro
    this.ferramentas.destruir();
    this.cursores.limpar();
    this.ponteiro.limpar();
  }

  private tratarAcaoPopup(acao: AcaoFeicao, feicao: Feicao): void {
    if (acao === 'zoom') this.zoomParaFeicao(feicao.camadaId, feicao.id);
    if (acao === 'vertices') this.iniciarEdicao(feicao.camadaId, feicao.id);
    if (acao === 'copiar' && this.opcoesPopup.copiarParaAreaDeTransferencia) {
      const [lat, lon] = coordenadaDeReferencia(feicao);
      void globalThis.navigator?.clipboard?.writeText(`${lat.toFixed(6)}, ${lon.toFixed(6)}`)?.catch(() => undefined);
    }
    this.contexto.emitir('cad-feicao-acao', { acao, feicao });
  }

  // ---- snap ----

  public get snapLigado(): boolean {
    return this.snap.ligado;
  }

  public get snapAtivo(): boolean {
    return this.snap.ativo;
  }

  public definirSnap(ligado: boolean): void {
    this.snap.definir(!!ligado);
  }

  public alternarSnap(): void {
    this.snap.alternar();
  }

  public conectarTeclado(): void {
    this.snap.conectar();
  }

  public desconectarTeclado(): void {
    this.snap.desconectar();
  }

  // ---- edição de vértices ----

  /** Feições visíveis cujo envelope toca um quadrado de `tolPx` px em volta de `coord`. */
  private candidatasEm(coord: LatLonPar, tolPx: number): Feicao[] {
    return this.consulta.candidatasEm(coord, tolPx);
  }

  /** Snap de uma coordenada contra as feições visíveis de todas as camadas de feições (via índice espacial). */
  public buscarSnapEm(coord: [number, number], excluir?: ExcluirSnap) {
    return this.consulta.buscarSnapEm(coord, excluir);
  }

  // ---- edição de vértices ----

  /** @internal Editor de vértices (usado pelos testes de caracterização). */
  public get editor(): EditorVertices | null {
    return this.edicao.editorAtual;
  }

  public get editando(): boolean {
    return this.edicao.editando;
  }

  public iniciarEdicao(camadaId: string, id: string): ResultadoEdicao {
    return this.edicao.iniciarEdicao(camadaId, id);
  }

  public pararEdicao(): void {
    this.edicao.parar();
  }

  // ---- ferramentas de desenho ----

  /** @internal Controle de desenho (usado pelos testes de caracterização). */
  public get desenho(): ControleDesenho | null {
    return this.ferramentas.controle;
  }

  /** @internal Conta-gotas (usado pelos testes de caracterização). */
  public amostrarEstilo(coord: LatLonPar): void {
    this.ferramentas.amostrarEstilo(coord);
  }

  public get ferramentaAtiva(): Ferramenta | null {
    return this.ferramentas.ferramentaAtiva;
  }

  /** Camada que recebe o que for desenhado. Não existe camada padrão: o consumidor escolhe. */
  public definirCamadaDesenho(camadaId: string | null): void {
    this.ferramentas.definirCamadaDesenho(camadaId);
  }

  public get camadaDeDesenho(): string | null {
    return this.ferramentas.camadaDeDesenho;
  }

  /** Estilo aplicado às feições desenhadas daqui para frente (o conta-gotas também o altera). */
  public definirEstiloDesenho(estilo: EstiloFeicao): void {
    this.ferramentas.definirEstiloDesenho(estilo);
  }

  public obterEstiloDesenho(): EstiloFeicao {
    return this.ferramentas.obterEstiloDesenho();
  }

  public alternarFerramenta(nome: string): ResultadoFerramenta {
    return this.ferramentas.alternarFerramenta(nome);
  }

  public ativarFerramenta(nome: string, opcoes: { fechar?: boolean; iniciarEm?: LatLonPar } = {}): ResultadoFerramenta {
    return this.ferramentas.ativarFerramenta(nome, opcoes);
  }

  public desativarFerramenta(): void {
    this.ferramentas.desativarFerramenta();
  }

  public limparMedicao(): void {
    this.ferramentas.limparMedicao();
  }

  /** Vértices já colocados na figura em andamento (0 sem ferramenta ou sem figura). */
  public get nosDesenho(): number {
    return this.ferramentas.nosDesenho;
  }

  public desfazerVerticeDesenho(): boolean {
    return this.ferramentas.desfazerVerticeDesenho();
  }

  /** Liga/desliga a tecla S do snap (o botão e `definirSnap` continuam valendo). */
  public definirAtalhoSnap(ligado: boolean): void {
    this.snap.atalhoS = ligado;
  }

  private idLivre(camadaId: string, base: string): string {
    const existentes = new Set(this.lista(camadaId).map((f) => f.id));
    if (!existentes.has(base)) return base;
    let n = 2;
    while (existentes.has(`${base}_${n}`)) n++;
    return `${base}_${n}`;
  }

  /** Divide polígonos pela linha de corte (selecionados; sem seleção, o primeiro cortado). Ver `OperacoesFeicoes`. */
  public dividirComLinha(linha: LatLonPar[]): boolean {
    return this.operacoes.dividirComLinha(linha);
  }

  /** Cria um polígono de buffer ao redor da feição (na camada dela, ou em `camadaDestino`). */
  public gerarBuffer(camadaId: string, id: string, metros: number, opcoes: { camadaDestino?: string; id?: string } = {}): Feicao | null {
    return this.operacoes.gerarBuffer(camadaId, id, metros, opcoes);
  }

  /** Copia a feição deslocada (em metros para leste/norte). */
  public duplicarFeicao(camadaId: string, id: string, deslocamento: { lesteM?: number; norteM?: number } = {}, opcoes: { id?: string } = {}): Feicao | null {
    return this.operacoes.duplicarFeicao(camadaId, id, deslocamento, opcoes);
  }

  /** Junta linhas (encadeando pontas) ou dois polígonos numa feição só; as originais saem. Ver `OperacoesFeicoes`. */
  public juntarFeicoes(camadaId: string, ids: string[], opcoes: { toleranciaM?: number; id?: string } = {}): Feicao | null {
    return this.operacoes.juntarFeicoes(camadaId, ids, opcoes);
  }
}
