import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import type { Feicao } from '../../gerencigeo-canvas/feature_types';
import { normalizarFeicaoEntrada, normalizarCoordenada } from '../../gerencigeo-canvas/feature_adapters';
import { RegraVersoes } from '../../gerencigeo-canvas/feature_versoes';
import { CursoresRemotos, type UsuarioRemoto } from '../../gerencigeo-canvas/feature_cursores';
import { LayerRendererFactory } from '../../gerencigeo-canvas/layer_renderer_factory';
import type { FeicoesLayerRenderer, DeltaFeicoes } from '../../gerencigeo-canvas/renderers/feicoes_renderer';
import { SelecaoFeicoes, type RefFeicao } from '../../gerencigeo-canvas/feature_selecao';
import { feicaoNaCaixa, feicaoNoLaco, type CaixaPx, type ModoCaixa } from '../../gerencigeo-canvas/feature_caixa';
import { FeicaoPopup, coordenadaDeReferencia, type AcaoFeicao, type MargensPopup } from '../../gerencigeo-canvas/feature_popup';
import L from 'leaflet';
import type { CaixaGeo } from '../../gerencigeo-canvas/feature_indice';
import { EditorVertices } from '../../gerencigeo-canvas/feature_editor_vertices';
import { verificarEditavel } from '../../gerencigeo-canvas/feature_edicao_ops';
import { buscarSnap, TOLERANCIA_SNAP_PX, type ExcluirSnap } from '../../gerencigeo-canvas/feature_snap';
import { ControleSnap } from './cad-snap';
import { OperacoesFeicoes } from './cad-feicoes-operacoes';
import { VersoesFeicoes } from './cad-feicoes-versoes';
import { CameraFeicoes } from './cad-feicoes-camera';
import { FerramentasDesenho } from './cad-feicoes-desenho';
import type { ControleDesenho } from '../../gerencigeo-canvas/feature_desenho_controle';
import type { Ferramenta } from '../../gerencigeo-canvas/feature_desenho';
import { feicaoNoPonto } from '../../gerencigeo-canvas/feature_amostra';
import type { EstiloFeicao, LatLonPar } from '../../gerencigeo-canvas/feature_types';
import { aplicarMargensHud, type MargensHud } from '../../gerencigeo-canvas/feature_hud';

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
}




export class GerenciadorFeicoes {
  private operacoes: OperacoesFeicoes;
  private selecao: SelecaoFeicoes;
  private popup: FeicaoPopup;
  private editor: EditorVertices | null = null;
  private snap: ControleSnap;
  private ferramentas: FerramentasDesenho;
  private versoes: VersoesFeicoes;
  private camera: CameraFeicoes;
  /** id -> posição na lista da camada (válido enquanto `lista` for a lista atual); evita varrer a camada a cada consulta. */
  private posicoes = new Map<string, { lista: Feicao[]; pos: Map<string, number> }>();
  private cursores: CursoresRemotos;
  private hoverId: string | null = null;
  private hoverAgendado = false;
  private margensHud: Partial<MargensHud> = {};
  /** Aceita a coordenada (0, 0) exata nas feições de entrada (atributo `aceitar-origem`). */
  public aceitarOrigem = false;
  private opcoesPopup: Required<OpcoesPopup> = { copiarParaAreaDeTransferencia: true };

  constructor(private contexto: Contexto) {
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
      prepararDesenho: () => { this.editor?.parar(); this.popup.fechar(); this.aplicarMargensHud(); },
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
        this.editor?.atualizarSnapNoHud();
        this.contexto.aoSnapMudar?.(estado.ligado);
      }
    });
    this.popup = new FeicaoPopup({
      obterMapa: () => this.contexto.obterMapa(),
      obterCamada: (id) => this.contexto.obterLayerManager().getLayerDef(id),
      aoAcao: (acao, feicao) => this.tratarAcaoPopup(acao, feicao)
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
        if (this.editor?.ativo) {
          // sair da feição em edição encerra a edição; o popup volta conforme a seleção nova
          const ed = this.editor.feicao!;
          const mesma = feicoes.length === 1 && feicoes[0].id === ed.id && feicoes[0].camadaId === ed.camadaId;
          if (!mesma) this.editor.parar();
          return;
        }
        // popup só para exatamente uma feição; com mais (ou nenhuma) fecha
        if (feicoes.length === 1) this.popup.abrir(feicoes[0]);
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
    if (this.editor?.ativo) {
      const ed = this.editor.feicao!;
      const atualEd = this.buscar(ed.camadaId, ed.id);
      if (!atualEd || atualEd.excluida) this.editor.parar();
      else if (atualEd !== ed) this.editor.sincronizar(atualEd);
    }
    const aberta = this.popup.aberto;
    if (!aberta) return;
    const atual = this.buscar(aberta.camadaId, aberta.id);
    if (atual && !atual.excluida) this.popup.atualizar(atual);
    else this.popup.fechar();
  }

  private lista(camadaId: string): Feicao[] {
    const dados = this.contexto.obterLayerManager().getLayerDef(camadaId)?.dados;
    return Array.isArray(dados?.feicoes) ? dados.feicoes : [];
  }

  private posicaoDe(camadaId: string): Map<string, number> {
    const lista = this.lista(camadaId);
    const a = this.posicoes.get(camadaId);
    if (a && a.lista === lista) return a.pos;
    const pos = new Map<string, number>();
    for (let i = 0; i < lista.length; i++) pos.set(lista[i].id, i);
    this.posicoes.set(camadaId, { lista, pos });
    return pos;
  }

  /** Feição da camada pelo id (O(1)); `undefined` se não existe. */
  public buscar(camadaId: string, id: string): Feicao | undefined {
    const lista = this.lista(camadaId);
    const i = this.posicaoDe(camadaId).get(id);
    const f = i === undefined ? undefined : lista[i];
    if (f && f.id === id) return f;
    if (i === undefined) return undefined;
    // posição velha (lista trocada por fora): refaz o índice uma vez
    this.posicoes.delete(camadaId);
    const j = this.posicaoDe(camadaId).get(id);
    return j === undefined ? undefined : lista[j];
  }

  private garantirCamada(camadaId: string, opcoes?: OpcoesCamadaFeicoes): boolean {
    const lm = this.contexto.obterLayerManager();
    const existente = lm.getLayerDef(camadaId);
    if (existente && existente.tipo !== TIPO_CAMADA_FEICOES) return false;

    const camada = lm.getOrCreateLayer(camadaId, TIPO_CAMADA_FEICOES, opcoes?.nome ?? camadaId);
    if (opcoes?.nome) camada.nome = opcoes.nome;
    if (opcoes?.estilo) camada.estilo = { ...camada.estilo, ...opcoes.estilo };
    if (opcoes?.interativo !== undefined) camada.interativo = opcoes.interativo;
    if (opcoes?.zIndex !== undefined) lm.setLayerZIndex(camadaId, opcoes.zIndex);
    if (opcoes?.opacidade !== undefined) lm.setLayerOpacity(camadaId, opcoes.opacidade);
    lm.ensurePanes();
    return true;
  }

  private opcoesNormalizacao(): { aceitarOrigem: boolean } {
    return { aceitarOrigem: this.aceitarOrigem };
  }

  public definirFeicoes(camadaId: string, brutas: unknown[], opcoes?: OpcoesCamadaFeicoes): ResultadoFeicoes {
    if (!this.garantirCamada(camadaId, opcoes)) {
      return { aceitas: 0, recusadas: ['camada existente não é de feições'] };
    }
    const recusadas: string[] = [];
    const vistos = new Map<string, Feicao>();
    (Array.isArray(brutas) ? brutas : []).forEach((b, i) => {
      const f = normalizarFeicaoEntrada(b, camadaId, this.opcoesNormalizacao());
      if (f) vistos.set(f.id, f);
      else recusadas.push(String((b as { id?: unknown } | null)?.id ?? `#${i}`));
    });
    this.contexto.obterLayerManager().setLayerData(camadaId, { feicoes: [...vistos.values()] });
    this.aposDados();
    return { aceitas: vistos.size, recusadas };
  }

  public adicionarFeicao(camadaId: string, bruta: unknown, opcoes?: OpcoesCamadaFeicoes): Feicao | null {
    return this.aplicar(camadaId, { adicionar: [bruta] }, opcoes).adicionadas[0] ?? null;
  }

  /**
   * Mescla campos de primeiro nível; `estilo` e `propriedades` também são mesclados. Com `substituirPropriedades`,
   * `propriedades` informadas trocam as atuais por inteiro (atributos ausentes somem).
   */
  public atualizarFeicao(camadaId: string, id: string, parcial: Record<string, any>, opcoes?: Pick<OpcoesLote, 'substituirPropriedades'>): Feicao | null {
    return this.aplicar(camadaId, { atualizar: [{ ...parcial, id }] }, opcoes).atualizadas[0] ?? null;
  }

  /** Grava uma feição já normalizada (usado quando o próprio mapa a altera, como ao arrastar um texto). */
  public substituir(camadaId: string, feicao: Feicao): void {
    if (!this.contexto.obterLayerManager().getLayerDef(camadaId)) return;
    this.aplicar(camadaId, { adicionar: [feicao] });
  }

  public removerFeicao(camadaId: string, id: string): boolean {
    return this.aplicar(camadaId, { remover: [id] }).resultado.removidas > 0;
  }

  /**
   * Várias mudanças numa só regravação e num só `aposDados`: remove, depois atualiza, depois adiciona.
   * Adicionar um id que já existe substitui a feição mantendo a posição (a ordem de empilhamento não muda).
   */
  public aplicarLote(camadaId: string, lote: LoteFeicoes, opcoes?: OpcoesLote): ResultadoLote {
    return this.aplicar(camadaId, lote, opcoes).resultado;
  }

  private mesclar(atual: Feicao, parcial: Record<string, any>, camadaId: string, substituirPropriedades: boolean): Feicao | null {
    const propriedades = substituirPropriedades && parcial.propriedades && typeof parcial.propriedades === 'object'
      ? { ...parcial.propriedades }
      : { ...atual.propriedades, ...parcial.propriedades };
    return normalizarFeicaoEntrada({
      ...atual,
      ...parcial,
      id: atual.id,
      estilo: { ...atual.estilo, ...parcial.estilo },
      propriedades
    }, camadaId, this.opcoesNormalizacao());
  }

  private aplicar(camadaId: string, lote: LoteFeicoes, opcoes: OpcoesLote = {}): {
    resultado: ResultadoLote; adicionadas: Feicao[]; atualizadas: Feicao[];
  } {
    const resultado: ResultadoLote = { adicionadas: 0, atualizadas: 0, removidas: 0, recusadas: [] };
    const adicionadas: Feicao[] = [];
    const atualizadas: Feicao[] = [];
    const brutasAdicionar = Array.isArray(lote?.adicionar) ? lote.adicionar : [];
    const brutasAtualizar = Array.isArray(lote?.atualizar) ? lote.atualizar : [];
    const idsRemover = Array.isArray(lote?.remover) ? lote.remover : [];
    const idDe = (b: unknown, i: number): string => String((b as { id?: unknown } | null)?.id ?? `#${i}`);
    // recusadas pela ordem do lote: atualizações antes das adições
    const recusadasAdicao: string[] = [];
    const concluir = <T>(retorno: T): T => {
      resultado.recusadas.push(...recusadasAdicao);
      return retorno;
    };

    // 1. normaliza o que entra (a camada só é criada se algo válido vai entrar nela)
    const validas: Feicao[] = [];
    brutasAdicionar.forEach((b, i) => {
      const f = normalizarFeicaoEntrada(b, camadaId, this.opcoesNormalizacao());
      if (f) validas.push(f);
      else recusadasAdicao.push(idDe(b, i));
    });
    const lm = this.contexto.obterLayerManager();
    const existente = lm.getLayerDef(camadaId);
    const ehFeicoes = !existente || existente.tipo === TIPO_CAMADA_FEICOES;
    if (!ehFeicoes || (!existente && validas.length === 0)) {
      brutasAtualizar.forEach((b, i) => resultado.recusadas.push(idDe(b, i)));
      validas.forEach((f) => recusadasAdicao.push(f.id));
      return concluir({ resultado, adicionadas, atualizadas });
    }
    if (validas.length > 0 || existente) {
      if (!this.garantirCamada(camadaId, opcoes)) {
        validas.forEach((f) => recusadasAdicao.push(f.id));
        return concluir({ resultado, adicionadas, atualizadas });
      }
    }

    // 2. aplica sobre uma cópia da lista (O(N) só no `slice`); posições novas entram no índice
    const base = this.lista(camadaId);
    const pos = this.posicaoDe(camadaId);
    const nova: Array<Feicao | null> = base.slice();
    const removidasIds: string[] = [];
    const mudadas: Feicao[] = [];
    let tirouAlguma = false;

    for (const bruto of idsRemover) {
      const id = String(bruto);
      const i = pos.get(id);
      if (i === undefined || nova[i] === null) continue;
      nova[i] = null;
      removidasIds.push(id);
      resultado.removidas++;
      tirouAlguma = true;
    }
    brutasAtualizar.forEach((item, k) => {
      const id = item && typeof item === 'object' && item.id !== undefined && item.id !== null ? String(item.id) : '';
      const i = pos.get(id);
      const atual = i === undefined ? null : nova[i];
      const novo = atual ? this.mesclar(atual, item, camadaId, !!opcoes.substituirPropriedades) : null;
      if (!novo || i === undefined) {
        resultado.recusadas.push(id || idDe(item, k));
        return;
      }
      nova[i] = novo;
      mudadas.push(novo);
      atualizadas.push(novo);
      resultado.atualizadas++;
    });
    for (const f of validas) {
      const i = pos.get(f.id);
      if (i !== undefined && nova[i] !== null) {
        nova[i] = f; // id existente: substitui no lugar (mantém a ordem de empilhamento)
      } else {
        pos.set(f.id, nova.length);
        nova.push(f);
      }
      mudadas.push(f);
      adicionadas.push(f);
      resultado.adicionadas++;
    }

    if (mudadas.length === 0 && removidasIds.length === 0) return concluir({ resultado, adicionadas, atualizadas });

    // 3. uma regravação, um aposDados
    const final = tirouAlguma ? nova.filter((f): f is Feicao => f !== null) : (nova as Feicao[]);
    const delta: DeltaFeicoes = { base, mudadas, removidas: removidasIds };
    const dados: { feicoes: Feicao[]; delta?: DeltaFeicoes } = { feicoes: final, delta };
    lm.setLayerData(camadaId, dados);
    delete dados.delta; // só vale durante a sincronização (e solta a lista antiga)
    if (tirouAlguma) this.posicoes.delete(camadaId);
    else this.posicoes.set(camadaId, { lista: final, pos });
    this.aposDados();
    return concluir({ resultado, adicionadas, atualizadas });
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
    if (this.editor?.ativo) this.editor.parar();
    else this.selecao.limpar();
  }

  public obterFeicoesSelecionadas(): Feicao[] {
    return this.selecao.obter();
  }

  /** Laço: seleciona (substituindo) as feições de camadas selecionáveis tocadas pelo polígono; a ferramenta encerra. */
  private selecionarNoLaco(laco: LatLonPar[]): void {
    const refs: RefFeicao[] = [];
    for (const camada of this.contexto.obterLayerManager().getActiveSelectableLayers()) {
      if (camada.tipo !== TIPO_CAMADA_FEICOES) continue;
      for (const f of this.lista(camada.id)) {
        if (this.desenhada(f) && feicaoNoLaco(f, laco)) refs.push({ camadaId: camada.id, id: f.id });
      }
    }
    // encerra a ferramenta ANTES de selecionar: quem escuta `cad-selecao` já vê o mapa sem ferramenta ativa
    this.ferramentas.desativarFerramenta();
    this.selecao.selecionar(refs);
  }

  /** Caixa de seleção: só feições de camadas visíveis, interativas e desbloqueadas, com toque geométrico real. */
  public selecionarNaCaixa(caixa: CaixaPx, modo: ModoCaixa, aditivo: boolean): void {
    const map = this.contexto.obterMapa();
    if (!map) return;
    const projetar = (p: [number, number]) => map.latLngToContainerPoint(p);
    const refs: RefFeicao[] = [];
    for (const camada of this.contexto.obterLayerManager().getActiveSelectableLayers()) {
      if (camada.tipo !== TIPO_CAMADA_FEICOES) continue;
      for (const f of this.lista(camada.id)) {
        if (this.desenhada(f) && feicaoNaCaixa(f, caixa, projetar, modo)) refs.push({ camadaId: camada.id, id: f.id });
      }
    }
    if (aditivo) this.selecao.alternarVarias(refs);
    else this.selecao.selecionar(refs);
  }

  // ---- popup e câmera ----

  public definirMargensPopup(m: Partial<MargensPopup>): void {
    this.popup.definirMargens(m);
  }

  public fecharPopup(): void {
    this.popup.fechar();
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
    const ed = this.editor?.ativo ? this.editor.feicao : null;
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

  private feicaoSob(clientX: number, clientY: number): { feicao: Feicao | null; coordenada: LatLonPar } | null {
    const map = this.contexto.obterMapa();
    if (!map) return null;
    const r = map.getContainer().getBoundingClientRect();
    const px = L.point(clientX - r.left, clientY - r.top);
    const ll = map.containerPointToLatLng(px);
    const coordenada: LatLonPar = [ll.lat, ll.lng];
    const f = feicaoNoPonto({ x: px.x, y: px.y }, this.candidatasEm(coordenada, 8), (p) => map.latLngToContainerPoint(p));
    return { feicao: f, coordenada };
  }

  /** Emite `cad-feicao-hover` quando a feição sob o mouse muda (uma checagem por quadro). */
  public aoMoverMouse(e: MouseEvent): void {
    const parado = e.buttons !== 0 || !!this.ferramentas.ativo || !!this.editor?.ativo;
    if (parado) {
      if (this.hoverId !== null) {
        this.hoverId = null;
        this.contexto.emitir('cad-feicao-hover', { feicao: null });
      }
      return;
    }
    if (this.hoverAgendado) return;
    this.hoverAgendado = true;
    const { clientX, clientY } = e;
    // um quadro; se a aba/painel não desenha (rAF parado), um timer garante que o hover não trave
    let feito = false;
    const executar = (): void => {
      if (feito) return;
      feito = true;
      this.hoverAgendado = false;
      const r = this.feicaoSob(clientX, clientY);
      const id = r?.feicao ? `${r.feicao.camadaId}\u0000${r.feicao.id}` : null;
      if (id === this.hoverId) return;
      this.hoverId = id;
      this.contexto.emitir('cad-feicao-hover', { feicao: r?.feicao ?? null });
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(executar);
    setTimeout(executar, 100);
  }

  /** Botão direito: emite `cad-feicao-menu` com a feição sob o cursor (ou `null`), para o consumidor abrir o próprio menu. */
  public menuContexto(e: MouseEvent): void {
    // ferramenta ativa: o botão direito conclui, desfaz o último vértice ou sai (não abre menu)
    if (this.ferramentas.ativo) {
      this.ferramentas.botaoDireito();
      return;
    }
    const r = this.feicaoSob(e.clientX, e.clientY);
    if (!r) return;
    this.contexto.emitir('cad-feicao-menu', { feicao: r.feicao, coordenada: r.coordenada, x: e.clientX, y: e.clientY });
  }

  public destruir(): void {
    // o controle guarda o mapa; depois de reconectar o componente o mapa é outro
    this.ferramentas.destruir();
    this.cursores.limpar();
    this.hoverId = null;
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

  /** Feições visíveis das camadas de feições cujo envelope toca um quadrado de `tolPx` px em volta de `coord`. */
  private candidatasEm(coord: LatLonPar, tolPx: number): Feicao[] {
    const map = this.contexto.obterMapa();
    const lm = this.contexto.obterLayerManager();
    const renderer = LayerRendererFactory.get(TIPO_CAMADA_FEICOES) as FeicoesLayerRenderer | undefined;
    if (!map || !renderer) return [];
    const cursor = map.latLngToContainerPoint(coord);
    const a = map.containerPointToLatLng([cursor.x - tolPx, cursor.y + tolPx]);
    const b = map.containerPointToLatLng([cursor.x + tolPx, cursor.y - tolPx]);
    const caixa: CaixaGeo = {
      minLon: Math.min(a.lng, b.lng), maxLon: Math.max(a.lng, b.lng),
      minLat: Math.min(a.lat, b.lat), maxLat: Math.max(a.lat, b.lat)
    };
    const achadas: Feicao[] = [];
    for (const camada of lm.getLayers()) {
      if (camada.tipo !== TIPO_CAMADA_FEICOES || !camada.visivel) continue;
      const instancia = lm.getLayerInstance(camada.id);
      if (instancia) achadas.push(...renderer.consultarProximas(instancia as L.LayerGroup, caixa).filter((f) => this.desenhada(f)));
    }
    return achadas;
  }

  /** Snap de uma coordenada contra as feições visíveis de todas as camadas de feições (via índice espacial). */
  public buscarSnapEm(coord: [number, number], excluir?: ExcluirSnap) {
    const map = this.contexto.obterMapa();
    if (!map) return null;

    const cursor = map.latLngToContainerPoint(coord);
    const candidatas = this.candidatasEm(coord, TOLERANCIA_SNAP_PX);
    return buscarSnap({ x: cursor.x, y: cursor.y }, candidatas, (p) => map.latLngToContainerPoint(p), {}, excluir);
  }

  // ---- edição de vértices ----

  public get editando(): boolean {
    return !!this.editor?.ativo;
  }

  public iniciarEdicao(camadaId: string, id: string): ResultadoEdicao {
    const f = this.buscar(camadaId, id);
    if (!f || f.excluida) return { ok: false, motivo: 'inexistente' };
    const camada = this.contexto.obterLayerManager().getLayerDef(camadaId);
    const motivo = verificarEditavel(f, !!camada?.bloqueada);
    if (motivo) {
      this.contexto.emitir('cad-edicao-recusada', { motivo, feicao: f });
      return { ok: false, motivo };
    }
    const map = this.contexto.obterMapa();
    if (!map) return { ok: false, motivo: 'sem-mapa' };

    this.ferramentas.desativarFerramenta();
    this.editor?.parar();
    this.aplicarMargensHud();
    this.selecao.selecionar([{ camadaId, id }]);
    this.popup.fechar();

    const lm = this.contexto.obterLayerManager();
    const renderer = LayerRendererFactory.get(TIPO_CAMADA_FEICOES) as FeicoesLayerRenderer | undefined;
    const editor = new EditorVertices({
      map,
      snapLigado: () => this.snap.ativo,
      alternarSnap: () => this.snap.alternar(),
      buscarSnap: (coord, excluir) => this.buscarSnapEm(coord, excluir),
      previsualizar: (nova) => {
        const instancia = lm.getLayerInstance(nova.camadaId);
        if (instancia && renderer) renderer.previsualizar(instancia as L.LayerGroup, nova);
      },
      aoGesto: (nova) => {
        this.substituir(nova.camadaId, nova);
        this.contexto.emitir('cad-feicao-atualizada', { camadaId: nova.camadaId, feicao: nova });
      },
      aoEncerrar: (ultima) => {
        this.editor = null;
        const atual = this.buscar(ultima.camadaId, ultima.id) ?? ultima;
        this.contexto.emitir('cad-edicao-concluida', { feicao: atual });
        // restaura o popup da seleção (ele ficou fechado durante a edição)
        const selecionadas = this.selecao.obter();
        if (selecionadas.length === 1) this.popup.abrir(selecionadas[0]);
      }
    });
    this.editor = editor;
    editor.iniciar(f);
    this.contexto.emitir('cad-edicao-iniciada', { feicao: f });
    return { ok: true };
  }

  public pararEdicao(): void {
    this.editor?.parar();
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
