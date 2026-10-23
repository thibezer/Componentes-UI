/**
 * Ferramentas de desenho do <ui-canvas-cad>: ativar/desativar, camada e estilo de desenho, criação de feições,
 * texto e conta-gotas.
 * Responsabilidade única: coordenar o `ControleDesenho` (L2) e transformar a geometria concluída em feição;
 * seleção, edição, snap e popup entram pelas `PortasDesenho`.
 */
import type L from 'leaflet';
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import type { Feicao, EstiloFeicao, LatLonPar, GeometriaFeicao } from '../../gerencigeo-canvas/feature_types';
import { ControleDesenho } from '../../gerencigeo-canvas/feature_desenho_controle';
import { ehFerramenta, type Ferramenta } from '../../gerencigeo-canvas/feature_desenho';
import { feicaoNoPonto } from '../../gerencigeo-canvas/feature_amostra';
import type { buscarSnap } from '../../gerencigeo-canvas/feature_snap';
import { TIPO_CAMADA_FEICOES, type ResultadoFerramenta } from './cad-feicoes-tipos';

/** Opções de linha que o conta-gotas copia junto com cor, espessura e tracejado. */
const CHAVES_LINHA_AMOSTRADAS = ['tipoLinha', 'escalaTipoLinha', 'deslocamentoTracejado', 'opacidadeTraco', 'terminacaoTraco', 'juncaoTraco'] as const;

/** Ferramentas que criam feições na camada de desenho. */
const FERRAMENTAS_DE_CRIACAO = new Set<Ferramenta>(['ponto', 'linha', 'poligono', 'retangulo', 'elipse', 'poligono-regular', 'estrela', 'circulo', 'texto', 'caneta']);

export interface PortasDesenho {
  obterMapa: () => L.Map | null;
  obterLayerManager: () => CanvasLayerManager;
  emitir: (evento: string, detalhe: unknown, cancelavel?: boolean) => unknown;
  /** A ferramenta ativa mudou (`null` = nenhuma). */
  aoFerramenta?: (ferramenta: Ferramenta | null) => void;
  lista: (camadaId: string) => Feicao[];
  adicionarFeicao: (camadaId: string, bruta: unknown) => Feicao | null;
  buscarSnapEm: (coord: [number, number]) => ReturnType<typeof buscarSnap>;
  snapAtivo: () => boolean;
  /** Antes de ativar uma ferramenta: encerra a edição de vértices, fecha o popup e ajusta as margens do HUD. */
  prepararDesenho: () => void;
  normalizarCoordenada: (bruta: unknown) => LatLonPar | null;
  dividirComLinha: (linha: LatLonPar[]) => boolean;
  selecionarNoLaco: (laco: LatLonPar[]) => void;
  candidatasEm: (coord: LatLonPar, tolPx: number) => Feicao[];
}

export class FerramentasDesenho {
  private desenho: ControleDesenho | null = null;
  private camadaDesenho: string | null = null;
  private estiloDesenho: EstiloFeicao = {};
  private sequenciaId = 0;

  constructor(private p: PortasDesenho) {}

  /** Controle de desenho da camada L2 (nasce na primeira ativação; `null` antes ou após `destruir`). */
  public get controle(): ControleDesenho | null {
    return this.desenho;
  }

  /** Há uma ferramenta ativa? (o clique e o botão direito são dela) */
  public get ativo(): boolean {
    return !!this.desenho?.ativo;
  }

  /** Botão direito com ferramenta ativa: conclui, desfaz o último vértice ou sai. */
  public botaoDireito(): void {
    this.desenho?.botaoDireito();
  }

  /** Encerra a ferramenta e solta o controle (que guarda o mapa; após reconectar o mapa é outro). */
  public destruir(): void {
    this.desenho?.desativar();
    this.desenho = null;
  }

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
    const map = this.p.obterMapa();
    if (!map) return { ok: false, motivo: 'sem-mapa' };

    if (FERRAMENTAS_DE_CRIACAO.has(nome)) {
      const motivo = this.motivoCamadaDesenhoInvalida();
      if (motivo) {
        this.p.emitir('cad-desenho-recusado', { ferramenta: nome, motivo });
        return { ok: false, motivo };
      }
    }

    this.p.prepararDesenho();
    if (!this.desenho) {
      this.desenho = new ControleDesenho({
        map,
        buscarSnap: (coord) => this.p.buscarSnapEm(coord),
        snapAtivo: () => this.p.snapAtivo(),
        aoGeometria: (f, g) => this.concluirFerramenta(f, g),
        aoMedir: (info) => this.p.emitir('cad-medicao', info),
        aoAmostrar: (coord) => this.amostrarEstilo(coord),
        aoSolicitarTexto: (coord) => this.solicitarTexto(coord),
        aoDesativar: () => {
          this.p.emitir('cad-ferramenta', { ferramenta: null });
          this.p.aoFerramenta?.(null);
        }
      });
    }
    this.desenho.ativar(nome, opcoes);
    this.p.emitir('cad-ferramenta', { ferramenta: nome });
    this.p.aoFerramenta?.(nome);
    // "começar aqui": registra o primeiro clique na coordenada pedida (ex.: menu de contexto)
    const inicio = opcoes.iniciarEm ? this.p.normalizarCoordenada(opcoes.iniciarEm) : null;
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

  private motivoCamadaDesenhoInvalida(): ResultadoFerramenta['motivo'] | null {
    if (!this.camadaDesenho) return 'sem-camada';
    const existente = this.p.obterLayerManager().getLayerDef(this.camadaDesenho);
    if (existente && existente.tipo !== TIPO_CAMADA_FEICOES) return 'camada-invalida';
    if (existente?.bloqueada) return 'camada-bloqueada';
    return null;
  }

  private novoId(prefixo: string, camadaId: string): string {
    const existentes = new Set(this.p.lista(camadaId).map((f) => f.id));
    let id: string;
    do {
      this.sequenciaId++;
      id = `${prefixo}-${Date.now().toString(36)}${this.sequenciaId.toString(36)}`;
    } while (existentes.has(id));
    return id;
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
    return this.p.emitir('cad-texto-solicitado', detalhe, true) === true;
  }

  private concluirFerramenta(ferramenta: Ferramenta, g: GeometriaFeicao): Feicao | null {
    if (ferramenta === 'dividir') {
      if (g.tipo === 'LineString') this.p.dividirComLinha(g.coordenadas);
      return null;
    }
    if (ferramenta === 'medir-distancia' || ferramenta === 'medir-area') return null; // só mede; nada é criado
    if (ferramenta === 'selecao-laco') {
      if (g.tipo === 'Polygon') this.p.selecionarNoLaco(g.aneis[0]);
      return null;
    }
    const camadaId = this.camadaDesenho;
    if (!camadaId) return null;
    const tem = Object.keys(this.estiloDesenho).length > 0;
    const feicao = this.p.adicionarFeicao(camadaId, {
      id: this.novoId(ferramenta, camadaId),
      geometria: g,
      estilo: tem ? { ...this.estiloDesenho } : undefined,
      propriedades: {}
    });
    if (feicao) this.p.emitir('cad-feicao-criada', { camadaId, feicao });
    else this.p.emitir('cad-desenho-recusado', { ferramenta, motivo: 'geometria-invalida' });
    return feicao;
  }

  /** Conta-gotas: copia o estilo da feição sob o clique para o estilo de desenho. */
  public amostrarEstilo(coord: LatLonPar): void {
    const map = this.p.obterMapa();
    if (!map) return;
    const px = map.latLngToContainerPoint(coord);
    const candidatas = this.p.candidatasEm(coord, 8);
    const f = feicaoNoPonto({ x: px.x, y: px.y }, candidatas, (p) => map.latLngToContainerPoint(p));
    if (!f) {
      this.p.emitir('cad-conta-gotas', { cor: '', feicao: null, estilo: {} });
      return;
    }
    const camada = this.p.obterLayerManager().getLayerDef(f.camadaId);
    const e = f.estilo ?? {};
    const amostrado: EstiloFeicao = {};
    const traco = e.corTraco ?? camada?.estilo.corPrimaria;
    if (traco) amostrado.corTraco = traco;
    if (e.corPreenchimento) amostrado.corPreenchimento = e.corPreenchimento;
    if (e.espessuraTraco !== undefined) amostrado.espessuraTraco = e.espessuraTraco;
    if (e.opacidadePreenchimento !== undefined) amostrado.opacidadePreenchimento = e.opacidadePreenchimento;
    if (e.dashArray) amostrado.dashArray = e.dashArray;
    for (const k of CHAVES_LINHA_AMOSTRADAS) if (e[k] !== undefined) (amostrado as Record<string, unknown>)[k] = e[k];
    this.estiloDesenho = { ...this.estiloDesenho, ...amostrado };
    this.p.emitir('cad-conta-gotas', { cor: traco ?? e.corPreenchimento ?? '', feicao: f, estilo: amostrado });
  }
}
