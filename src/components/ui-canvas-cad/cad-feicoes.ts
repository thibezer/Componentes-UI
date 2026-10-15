import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import type { LayerStyleDef } from '../../gerencigeo-canvas/types';
import type { Feicao } from '../../gerencigeo-canvas/feature_types';
import { normalizarFeicaoEntrada, normalizarCoordenada } from '../../gerencigeo-canvas/feature_adapters';
import { RegraVersoes, entidadeDe } from '../../gerencigeo-canvas/feature_versoes';
import { CursoresRemotos, type UsuarioRemoto } from '../../gerencigeo-canvas/feature_cursores';
import { LayerRendererFactory } from '../../gerencigeo-canvas/layer_renderer_factory';
import type { FeicoesLayerRenderer, DeltaFeicoes } from '../../gerencigeo-canvas/renderers/feicoes_renderer';
import { SelecaoFeicoes, type RefFeicao } from '../../gerencigeo-canvas/feature_selecao';
import { feicaoNaCaixa, feicaoNoLaco, type CaixaPx, type ModoCaixa } from '../../gerencigeo-canvas/feature_caixa';
import { FeicaoPopup, coordenadaDeReferencia, type AcaoFeicao, type MargensPopup } from '../../gerencigeo-canvas/feature_popup';
import { limitesDaGeometria } from '../../gerencigeo-canvas/feature_metricas';
import L from 'leaflet';
import type { CaixaGeo } from '../../gerencigeo-canvas/feature_indice';
import { EditorVertices } from '../../gerencigeo-canvas/feature_editor_vertices';
import { verificarEditavel, type MotivoRecusaEdicao } from '../../gerencigeo-canvas/feature_edicao_ops';
import { buscarSnap, TOLERANCIA_SNAP_PX, type ExcluirSnap } from '../../gerencigeo-canvas/feature_snap';
import { ControleSnap } from './cad-snap';
import { ControleDesenho } from '../../gerencigeo-canvas/feature_desenho_controle';
import { ehFerramenta, type Ferramenta } from '../../gerencigeo-canvas/feature_desenho';
import {
  clonarFeicao, deslocarGeometria, dividirPoligonoComLinha, gerarBuffer as gerarBufferGeo, juntarLinhas, juntarPoligonos
} from '../../gerencigeo-canvas/feature_algoritmos';
import { feicaoNoPonto } from '../../gerencigeo-canvas/feature_amostra';
import { criarLinha, ehMultilinha, type EstiloFeicao, type LatLonPar } from '../../gerencigeo-canvas/feature_types';
import { aplicarMargensHud, type MargensHud } from '../../gerencigeo-canvas/feature_hud';

/*
 * Camadas de feições genéricas. Nada é criado sozinho: a camada só passa a existir quando o
 * consumidor chama definirFeicoes/adicionarFeicao. Os dados ficam em `CanvasLayerDef.dados.feicoes`.
 */

export const TIPO_CAMADA_FEICOES = 'feicoes';

export interface OpcoesCamadaFeicoes {
  nome?: string;
  zIndex?: number;
  opacidade?: number;
  interativo?: boolean;
  estilo?: Partial<LayerStyleDef>;
}

/** Opções de `aplicarLote` / `atualizarFeicao`. */
export interface OpcoesLote extends OpcoesCamadaFeicoes {
  /**
   * Em atualizações, `propriedades` informadas SUBSTITUEM as atuais (o padrão é mesclar, e chaves apagadas
   * pelo consumidor ficam para trás). Sem `propriedades` no item, nada muda.
   */
  substituirPropriedades?: boolean;
}

/** Itens de atualização: `id` aponta a feição; o resto é mesclado como em `atualizarFeicao`. */
export type AtualizacaoFeicao = Record<string, any> & { id: string };

export interface LoteFeicoes {
  adicionar?: unknown[];
  atualizar?: AtualizacaoFeicao[];
  remover?: string[];
}

export interface ResultadoLote {
  adicionadas: number;
  atualizadas: number;
  removidas: number;
  /** Ids (ou posições, quando não há id) recusados: geometria inválida, feição inexistente numa atualização, camada que não é de feições. */
  recusadas: string[];
}

export interface ResultadoFeicoes {
  /** Quantas feições entraram na camada. */
  aceitas: number;
  /** Ids (ou posições, quando não há id) das feições recusadas por geometria inválida. */
  recusadas: string[];
}

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

/** Opções do popup da feição. */
export interface OpcoesPopup {
  /** A ação "copiar" grava as coordenadas na área de transferência (padrão `true`); `cad-feicao-acao` sai de qualquer jeito. */
  copiarParaAreaDeTransferencia?: boolean;
}

export interface ResultadoFerramenta {
  ok: boolean;
  motivo?: 'ferramenta-invalida' | 'sem-mapa' | 'sem-camada' | 'camada-invalida' | 'camada-bloqueada';
}

/** Ferramentas que criam feições na camada de desenho. */
const FERRAMENTAS_DE_CRIACAO = new Set<Ferramenta>(['ponto', 'linha', 'poligono', 'retangulo', 'elipse', 'poligono-regular', 'estrela', 'circulo', 'texto', 'caneta']);

export interface ResultadoEdicao {
  ok: boolean;
  motivo?: MotivoRecusaEdicao | 'inexistente' | 'sem-mapa';
}

export class GerenciadorFeicoes {
  private selecao: SelecaoFeicoes;
  private popup: FeicaoPopup;
  private editor: EditorVertices | null = null;
  private vigiaCamadaEmEdicao: (() => void) | null = null;
  private snap: ControleSnap;
  private desenho: ControleDesenho | null = null;
  private camadaDesenho: string | null = null;
  private estiloDesenho: EstiloFeicao = {};
  private sequenciaId = 0;
  private regra: RegraVersoes;
  private cacheOficiais = new WeakMap<Feicao[], Set<string>>();
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
    this.regra = contexto.regra ?? new RegraVersoes();
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
      if (!atualEd || atualEd.excluida || atualEd.bloqueada) this.editor.parar();
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
      if (this.desenho?.ativo) return null; // com uma ferramenta ativa, o clique é do desenho
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
    if (this.desenho?.ativo) return; // Esc é tratado pela própria ferramenta
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
    this.desenho?.desativar();
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

  public get regraVersoes(): RegraVersoes {
    return this.regra;
  }

  private oficiaisDe(camadaId: string): Set<string> {
    const lista = this.lista(camadaId);
    let s = this.cacheOficiais.get(lista);
    if (!s) {
      s = RegraVersoes.oficiais(lista);
      this.cacheOficiais.set(lista, s);
    }
    return s;
  }

  /** Aparece segundo a regra de oficial × prévia? */
  public visivelPorVersao(f: Feicao): boolean {
    // com a camada desenhada, o renderizador já mantém as entidades oficiais em dia (sem varrer a camada)
    const instancia = this.contexto.obterLayerManager().getLayerInstance(f.camadaId);
    const renderer = LayerRendererFactory.get(TIPO_CAMADA_FEICOES) as FeicoesLayerRenderer | undefined;
    if (instancia && renderer) return renderer.feicaoVisivel(instancia as L.LayerGroup, f);
    return this.regra.visivel(f, this.oficiaisDe(f.camadaId));
  }

  /** Vai para a tela e responde a clique, caixa, laço, snap e hover: não excluída, não oculta e visível pela regra de versões. */
  public desenhada(f: Feicao): boolean {
    return !f.excluida && !f.oculta && this.visivelPorVersao(f);
  }

  /** Regra da seleção: a feição em edição continua selecionada mesmo se for ocultada no meio da edição. */
  private selecionavelAgora(f: Feicao): boolean {
    const ed = this.editor?.ativo ? this.editor.feicao : null;
    if (ed && ed.id === f.id && ed.camadaId === f.camadaId) return true;
    return !f.oculta && this.visivelPorVersao(f);
  }

  private aplicarVersoes(): void {
    const lm = this.contexto.obterLayerManager();
    const renderer = LayerRendererFactory.get(TIPO_CAMADA_FEICOES) as FeicoesLayerRenderer | undefined;
    for (const camada of lm.getLayers()) {
      if (camada.tipo !== TIPO_CAMADA_FEICOES) continue;
      const instancia = lm.getLayerInstance(camada.id);
      if (instancia && renderer) renderer.reavaliarVersoes(instancia as L.LayerGroup);
    }
    this.aposDados();
  }

  public get previasGlobais(): boolean {
    return this.regra.global;
  }

  /** Mostra (ou esconde) as prévias de todas as entidades. Prévias de entidades sem oficial aparecem sempre. */
  public definirPreviasGlobais(ligado: boolean): void {
    const v = !!ligado;
    if (this.regra.global === v) return;
    this.regra.global = v;
    this.aplicarVersoes();
    this.contexto.emitir('cad-previas', { global: v });
  }

  public alternarPreviasGlobais(): void {
    this.definirPreviasGlobais(!this.regra.global);
  }

  /** Liga/desliga a prévia da entidade a que a feição pertence. Devolve o novo estado, ou `null` se a feição não existe. */
  public alternarPrevia(camadaId: string, id: string): boolean | null {
    const f = this.buscar(camadaId, id);
    if (!f) return null;
    const entidade = entidadeDe(f);
    const ativa = this.regra.alternarIndividual(camadaId, entidade);
    this.aplicarVersoes();
    this.contexto.emitir('cad-previas', { camadaId, entidadeId: entidade, ativa });
    return ativa;
  }

  /** A prévia da feição está sendo mostrada por pedido (global ou individual)? */
  public previaSolicitada(camadaId: string, id: string): boolean {
    const f = this.buscar(camadaId, id);
    return !!f && this.regra.previaSolicitada(f);
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

  /** Mostra o que estava escondido (camada oculta, prévia não solicitada) para a feição poder ser vista. */
  private garantirVisivel(f: Feicao): void {
    const lm = this.contexto.obterLayerManager();
    const camada = lm.getLayerDef(f.camadaId);
    if (camada && !camada.visivel) lm.setLayerVisibility(f.camadaId, true);
    if (!this.visivelPorVersao(f)) {
      const entidade = entidadeDe(f);
      this.regra.definirIndividual(f.camadaId, entidade, true);
      this.aplicarVersoes();
      this.contexto.emitir('cad-previas', { camadaId: f.camadaId, entidadeId: entidade, ativa: true });
    }
  }

  private limitesDe(fs: Feicao[]): [[number, number], [number, number]] | null {
    let s = Infinity;
    let w = Infinity;
    let n = -Infinity;
    let e = -Infinity;
    for (const f of fs) {
      const [[a, b], [c, d]] = limitesDaGeometria(f.geometria);
      if (a < s) s = a;
      if (b < w) w = b;
      if (c > n) n = c;
      if (d > e) e = d;
    }
    return Number.isFinite(s) ? [[s, w], [n, e]] : null;
  }

  private enquadrar(fs: Feicao[]): boolean {
    const map = this.contexto.obterMapa();
    const lim = this.limitesDe(fs);
    if (!map || !lim) return false;
    const ponto = lim[0][0] === lim[1][0] && lim[0][1] === lim[1][1];
    if (ponto) map.flyTo([lim[0][0], lim[0][1]], Math.max(map.getZoom(), 17));
    else map.fitBounds(lim, { padding: [60, 60], maxZoom: 18 });
    return true;
  }

  /** Aproxima da feição; liga a camada e a prévia, se estiverem escondidas. Ponto: voa até z ≥ 17. */
  public zoomParaFeicao(camadaId: string, id: string): boolean {
    const f = this.buscar(camadaId, id);
    if (!f || f.excluida) return false;
    this.garantirVisivel(f);
    return this.enquadrar([f]);
  }

  public zoomParaFeicoes(refs: RefFeicao[]): boolean {
    const fs: Feicao[] = [];
    for (const r of Array.isArray(refs) ? refs : []) {
      const f = this.buscar(r.camadaId, r.id);
      if (f && !f.excluida) {
        this.garantirVisivel(f);
        fs.push(f);
      }
    }
    return fs.length > 0 && this.enquadrar(fs);
  }

  /** Enquadra todas as feições das camadas de feições visíveis (que aparecem pela regra de versões). */
  public ajustarTudo(): boolean {
    const fs: Feicao[] = [];
    for (const camada of this.contexto.obterLayerManager().getLayers()) {
      if (camada.tipo !== TIPO_CAMADA_FEICOES || !camada.visivel) continue;
      fs.push(...this.lista(camada.id).filter((f) => this.desenhada(f)));
    }
    return this.enquadrar(fs);
  }

  /** Enquadra a camada inteira; se estava oculta, torna-a visível. */
  public ajustarCamada(camadaId: string): boolean {
    const lm = this.contexto.obterLayerManager();
    const camada = lm.getLayerDef(camadaId);
    if (!camada || camada.tipo !== TIPO_CAMADA_FEICOES) return false;
    if (!camada.visivel) lm.setLayerVisibility(camadaId, true);
    return this.enquadrar(this.lista(camadaId).filter((f) => this.desenhada(f)));
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
    const parado = e.buttons !== 0 || !!this.desenho?.ativo || !!this.editor?.ativo;
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
    if (this.desenho?.ativo) {
      this.desenho.botaoDireito();
      return;
    }
    const r = this.feicaoSob(e.clientX, e.clientY);
    if (!r) return;
    this.contexto.emitir('cad-feicao-menu', { feicao: r.feicao, coordenada: r.coordenada, x: e.clientX, y: e.clientY });
  }

  public destruir(): void {
    // o controle guarda o mapa; depois de reconectar o componente o mapa é outro
    this.desenho?.desativar();
    this.desenho = null;
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

    this.desenho?.desativar();
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
        this.pararDeVigiarCamadaEmEdicao();
        const atual = this.buscar(ultima.camadaId, ultima.id) ?? ultima;
        this.contexto.emitir('cad-edicao-concluida', { feicao: atual });
        // restaura o popup da seleção (ele ficou fechado durante a edição)
        const selecionadas = this.selecao.obter();
        if (selecionadas.length === 1) this.popup.abrir(selecionadas[0]);
      }
    });
    this.editor = editor;
    editor.iniciar(f);
    // camada ocultada ou bloqueada no meio da edição: as alças ficariam soltas na tela, gravando numa camada que não aceita edição
    this.vigiaCamadaEmEdicao = lm.onChange(() => {
      const ed = this.editor?.feicao;
      if (!ed) return;
      const def = lm.getLayerDef(ed.camadaId);
      if (!def || !def.visivel || def.bloqueada) this.editor?.parar();
    });
    this.contexto.emitir('cad-edicao-iniciada', { feicao: f });
    return { ok: true };
  }

  private pararDeVigiarCamadaEmEdicao(): void {
    this.vigiaCamadaEmEdicao?.();
    this.vigiaCamadaEmEdicao = null;
  }

  public pararEdicao(): void {
    this.editor?.parar();
  }

  // ---- ferramentas de desenho ----

  public get ferramentaAtiva(): Ferramenta | null {
    return this.desenho?.ferramenta ?? null;
  }

  /** Camada que recebe o que for desenhado. Não existe camada padrão: o consumidor escolhe. */
  public definirCamadaDesenho(camadaId: string | null): void {
    this.camadaDesenho = camadaId || null;
  }

  public get camadaDeDesenho(): string | null {
    return this.camadaDesenho;
  }

  /** Estilo aplicado às feições desenhadas daqui para frente (o conta-gotas também o altera). */
  public definirEstiloDesenho(estilo: EstiloFeicao): void {
    this.estiloDesenho = { ...estilo };
  }

  public obterEstiloDesenho(): EstiloFeicao {
    return { ...this.estiloDesenho };
  }

  public alternarFerramenta(nome: string): ResultadoFerramenta {
    if (this.desenho?.ferramenta === nome) {
      this.desenho.desativar();
      return { ok: true };
    }
    return this.ativarFerramenta(nome);
  }

  public ativarFerramenta(nome: string, opcoes: { fechar?: boolean; iniciarEm?: LatLonPar } = {}): ResultadoFerramenta {
    if (!ehFerramenta(nome)) return { ok: false, motivo: 'ferramenta-invalida' };
    const map = this.contexto.obterMapa();
    if (!map) return { ok: false, motivo: 'sem-mapa' };

    if (FERRAMENTAS_DE_CRIACAO.has(nome)) {
      const motivo = this.motivoCamadaDesenhoInvalida();
      if (motivo) {
        this.contexto.emitir('cad-desenho-recusado', { ferramenta: nome, motivo });
        return { ok: false, motivo };
      }
    }

    this.editor?.parar();
    this.popup.fechar();
    this.aplicarMargensHud();
    if (!this.desenho) {
      this.desenho = new ControleDesenho({
        map,
        buscarSnap: (coord) => this.buscarSnapEm(coord),
        snapAtivo: () => this.snap.ativo,
        aoGeometria: (f, g) => this.concluirFerramenta(f, g),
        aoMedir: (info) => this.contexto.emitir('cad-medicao', info),
        aoAmostrar: (coord) => this.amostrarEstilo(coord),
        aoSolicitarTexto: (coord) => this.solicitarTexto(coord),
        aoDesativar: () => {
          this.contexto.emitir('cad-ferramenta', { ferramenta: null });
          this.contexto.aoFerramenta?.(null);
        }
      });
    }
    this.desenho.ativar(nome, opcoes);
    this.contexto.emitir('cad-ferramenta', { ferramenta: nome });
    this.contexto.aoFerramenta?.(nome);
    // "começar aqui": registra o primeiro clique na coordenada pedida (ex.: menu de contexto)
    const inicio = opcoes.iniciarEm ? normalizarCoordenada(opcoes.iniciarEm, this.opcoesNormalizacao()) : null;
    if (inicio) this.desenho.clicarEm(inicio);
    return { ok: true };
  }

  public desativarFerramenta(): void {
    this.desenho?.desativar();
  }

  public limparMedicao(): void {
    this.desenho?.limparMedicao();
  }

  /** Vértices já colocados na figura em andamento (0 sem ferramenta ou sem figura). */
  public get nosDesenho(): number {
    return this.desenho?.nos ?? 0;
  }

  public desfazerVerticeDesenho(): boolean {
    return this.desenho?.desfazerVertice() ?? false;
  }

  /** Liga/desliga a tecla S do snap (o botão e `definirSnap` continuam valendo). */
  public definirAtalhoSnap(ligado: boolean): void {
    this.snap.atalhoS = ligado;
  }

  private motivoCamadaDesenhoInvalida(): ResultadoFerramenta['motivo'] | null {
    if (!this.camadaDesenho) return 'sem-camada';
    const existente = this.contexto.obterLayerManager().getLayerDef(this.camadaDesenho);
    if (existente && existente.tipo !== TIPO_CAMADA_FEICOES) return 'camada-invalida';
    if (existente?.bloqueada) return 'camada-bloqueada';
    return null;
  }

  private novoId(prefixo: string, camadaId: string): string {
    const existentes = new Set(this.lista(camadaId).map((f) => f.id));
    let id: string;
    do {
      this.sequenciaId++;
      id = `${prefixo}-${Date.now().toString(36)}${this.sequenciaId.toString(36)}`;
    } while (existentes.has(id));
    return id;
  }

  private idLivre(camadaId: string, base: string): string {
    const existentes = new Set(this.lista(camadaId).map((f) => f.id));
    if (!existentes.has(base)) return base;
    let n = 2;
    while (existentes.has(`${base}_${n}`)) n++;
    return `${base}_${n}`;
  }

  /**
   * Clique da ferramenta texto: emite `cad-texto-solicitado` (cancelável). Com `preventDefault()` o consumidor assume a
   * entrada do texto e depois chama `detalhe.concluir(texto)` (cria na camada de desenho, com o estilo de desenho) ou
   * simplesmente não faz nada para cancelar. Sem `preventDefault()`, aparece o campo inline.
   */
  private solicitarTexto(coord: LatLonPar): boolean {
    const detalhe = {
      coordenada: coord,
      camadaId: this.camadaDesenho,
      concluir: (texto: string): Feicao | null => {
        const t = typeof texto === 'string' ? texto.trim() : '';
        if (!t) return null;
        return this.concluirFerramenta('texto', { tipo: 'Text', coordenada: coord, texto: t });
      }
    };
    return this.contexto.emitir('cad-texto-solicitado', detalhe, true) === true;
  }

  private concluirFerramenta(ferramenta: Ferramenta, g: import('../../gerencigeo-canvas/feature_types').GeometriaFeicao): Feicao | null {
    if (ferramenta === 'dividir') {
      if (g.tipo === 'LineString') this.dividirComLinha(g.coordenadas);
      return null;
    }
    if (ferramenta === 'medir-distancia' || ferramenta === 'medir-area') return null; // só mede; nada é criado
    if (ferramenta === 'selecao-laco') {
      if (g.tipo === 'Polygon') this.selecionarNoLaco(g.aneis[0]);
      return null;
    }
    const camadaId = this.camadaDesenho;
    if (!camadaId) return null;
    const tem = Object.keys(this.estiloDesenho).length > 0;
    const feicao = this.adicionarFeicao(camadaId, {
      id: this.novoId(ferramenta, camadaId),
      geometria: g,
      estilo: tem ? { ...this.estiloDesenho } : undefined,
      propriedades: {}
    });
    if (feicao) this.contexto.emitir('cad-feicao-criada', { camadaId, feicao });
    else this.contexto.emitir('cad-desenho-recusado', { ferramenta, motivo: 'geometria-invalida' });
    return feicao;
  }

  /** Conta-gotas: copia o estilo da feição sob o clique para o estilo de desenho. */
  private amostrarEstilo(coord: LatLonPar): void {
    const map = this.contexto.obterMapa();
    if (!map) return;
    const px = map.latLngToContainerPoint(coord);
    const candidatas = this.candidatasEm(coord, 8);
    const f = feicaoNoPonto({ x: px.x, y: px.y }, candidatas, (p) => map.latLngToContainerPoint(p));
    if (!f) {
      this.contexto.emitir('cad-conta-gotas', { cor: '', feicao: null, estilo: {} });
      return;
    }
    const camada = this.contexto.obterLayerManager().getLayerDef(f.camadaId);
    const e = f.estilo ?? {};
    const amostrado: EstiloFeicao = {};
    const traco = e.corTraco ?? camada?.estilo.corPrimaria;
    if (traco) amostrado.corTraco = traco;
    if (e.corPreenchimento) amostrado.corPreenchimento = e.corPreenchimento;
    if (e.espessuraTraco !== undefined) amostrado.espessuraTraco = e.espessuraTraco;
    if (e.opacidadePreenchimento !== undefined) amostrado.opacidadePreenchimento = e.opacidadePreenchimento;
    if (e.dashArray) amostrado.dashArray = e.dashArray;
    this.estiloDesenho = { ...this.estiloDesenho, ...amostrado };
    this.contexto.emitir('cad-conta-gotas', { cor: traco ?? e.corPreenchimento ?? '', feicao: f, estilo: amostrado });
  }

  /**
   * Divide polígonos pela linha de corte. Alvos: os polígonos selecionados; sem seleção, o primeiro
   * polígono (de camada visível, interativa e desbloqueada) que a linha corta.
   */
  public dividirComLinha(linha: LatLonPar[]): boolean {
    const lm = this.contexto.obterLayerManager();
    const falhar = (motivo: string): boolean => {
      this.contexto.emitir('cad-divisao-falhou', { motivo });
      return false;
    };

    const selecionados = this.selecao.obter().filter((f) => f.geometria.tipo === 'Polygon');
    let candidatos: Feicao[] = selecionados;
    if (candidatos.length === 0) {
      candidatos = [];
      for (const camada of lm.getActiveSelectableLayers()) {
        if (camada.tipo !== TIPO_CAMADA_FEICOES) continue;
        candidatos.push(...this.lista(camada.id).filter((f) => f.geometria.tipo === 'Polygon' && this.desenhada(f)));
      }
    }
    if (candidatos.length === 0) return falhar(selecionados.length === 0 && this.selecao.obter().some((f) => ehMultilinha(f.geometria)) ? 'multiparte' : 'nenhum-poligono');

    const bloqueada = (f: Feicao): boolean => !!f.bloqueada || !!lm.getLayerDef(f.camadaId)?.bloqueada;
    const livres = candidatos.filter((f) => !bloqueada(f) && f.geometria.tipo === 'Polygon' && f.geometria.aneis.length === 1);
    if (livres.length === 0) return falhar(candidatos.some(bloqueada) ? 'bloqueada' : 'poligono-com-furos');

    let dividiu = false;
    for (const f of livres) {
      if (f.geometria.tipo !== 'Polygon') continue;
      const partes = dividirPoligonoComLinha(f.geometria.aneis[0], linha);
      if (!partes) continue;

      // o corte vai mudar a seleção (a original sai): a ferramenta encerra ANTES, para `cad-selecao` já sair sem ferramenta ativa
      if (this.desenho?.ferramenta === 'dividir' && this.selecao.contem({ camadaId: f.camadaId, id: f.id })) this.desenho.desativar();
      this.removerFeicao(f.camadaId, f.id);
      const criadas: Feicao[] = [];
      partes.forEach((anel, i) => {
        const nova = clonarFeicao(f, this.idLivre(f.camadaId, `${f.id}-${i + 1}`), { tipo: 'Polygon', aneis: [anel] });
        const ok = this.adicionarFeicao(f.camadaId, nova);
        if (ok) criadas.push(ok);
      });
      if (criadas.length !== partes.length) {
        // parte recusada: desfaz tudo, a feição original não pode se perder
        for (const c of criadas) this.removerFeicao(c.camadaId, c.id);
        this.adicionarFeicao(f.camadaId, f);
        return falhar('geometria-invalida');
      }
      this.contexto.emitir('cad-feicao-dividida', { origem: f, partes: criadas });
      dividiu = true;
      if (selecionados.length === 0) break;
    }
    return dividiu || falhar('sem-intersecao');
  }

  // ---- utilitários geométricos ----

  /** Cria um polígono de buffer ao redor da feição (na camada dela, ou em `camadaDestino`). */
  public gerarBuffer(camadaId: string, id: string, metros: number, opcoes: { camadaDestino?: string; id?: string } = {}): Feicao | null {
    const f = this.buscar(camadaId, id);
    if (!f) return null;
    const anel = gerarBufferGeo(f.geometria, metros);
    if (!anel) return null;
    const destino = opcoes.camadaDestino ?? camadaId;
    const criada = this.adicionarFeicao(destino, {
      id: opcoes.id ?? this.idLivre(destino, `${id}-buffer`),
      geometria: { tipo: 'Polygon', aneis: [anel] },
      estilo: f.estilo ? { ...f.estilo } : undefined,
      propriedades: { ...f.propriedades, origem: id }
    });
    if (criada) this.contexto.emitir('cad-feicao-criada', { camadaId: destino, feicao: criada });
    return criada;
  }

  /** Copia a feição deslocada (em metros para leste/norte). */
  public duplicarFeicao(camadaId: string, id: string, deslocamento: { lesteM?: number; norteM?: number } = {}, opcoes: { id?: string } = {}): Feicao | null {
    const f = this.buscar(camadaId, id);
    if (!f) return null;
    const geometria = deslocarGeometria(f.geometria, deslocamento.lesteM ?? 0, deslocamento.norteM ?? 0);
    const criada = this.adicionarFeicao(camadaId, clonarFeicao(f, opcoes.id ?? this.idLivre(camadaId, `${id}-copia`), geometria));
    if (criada) this.contexto.emitir('cad-feicao-criada', { camadaId, feicao: criada });
    return criada;
  }

  /**
   * Junta linhas (encadeando pontas) ou dois polígonos (por uma ponte) numa feição só; as originais saem.
   * Linhas com pontas a até `toleranciaM` se ligam; polígonos precisam estar a até `toleranciaM` e
   * não podem ter bordas que se cruzam.
   */
  public juntarFeicoes(camadaId: string, ids: string[], opcoes: { toleranciaM?: number; id?: string } = {}): Feicao | null {
    const falhar = (motivo: string): null => {
      this.contexto.emitir('cad-uniao-falhou', { motivo });
      return null;
    };
    const fs = ids.map((i) => this.buscar(camadaId, i));
    if (fs.length < 2 || fs.some((f) => !f)) return falhar('feicoes-insuficientes');
    const origem = fs as Feicao[];
    if (new Set(origem.map((f) => f.id)).size !== origem.length) return falhar('feicoes-insuficientes');
    const lm = this.contexto.obterLayerManager();
    if (origem.some((f) => f.excluida || f.bloqueada || lm.getLayerDef(f.camadaId)?.bloqueada)) return falhar('bloqueada');
    const tol = opcoes.toleranciaM ?? 0;

    let geometria: import('../../gerencigeo-canvas/feature_types').GeometriaFeicao | null = null;
    if (origem.every((f) => f.geometria.tipo === 'LineString')) {
      if (origem.some((f) => ehMultilinha(f.geometria))) return falhar('multiparte');
      const linhas = origem.map((f) => (f.geometria as { coordenadas: LatLonPar[] }).coordenadas);
      const r = juntarLinhas(linhas, tol);
      if (r) geometria = criarLinha([r]);
    } else if (origem.every((f) => f.geometria.tipo === 'Polygon' && f.geometria.aneis.length === 1)) {
      let anel: LatLonPar[] | null = (origem[0].geometria as { aneis: LatLonPar[][] }).aneis[0];
      for (const f of origem.slice(1)) {
        anel = anel ? juntarPoligonos(anel, (f.geometria as { aneis: LatLonPar[][] }).aneis[0], tol) : null;
      }
      if (anel) geometria = { tipo: 'Polygon', aneis: [anel] };
    } else {
      return falhar('tipos-incompativeis');
    }
    if (!geometria) return falhar('sem-ligacao');

    for (const f of origem) this.removerFeicao(camadaId, f.id);
    const resultado = this.adicionarFeicao(camadaId, clonarFeicao(origem[0], opcoes.id ?? this.idLivre(camadaId, `${origem[0].id}-uniao`), geometria));
    if (!resultado) {
      // geometria recusada: devolve as originais em vez de perdê-las
      for (const f of origem) this.adicionarFeicao(camadaId, f);
      return falhar('geometria-invalida');
    }
    this.contexto.emitir('cad-feicao-unida', { origens: origem, resultado });
    return resultado;
  }
}
