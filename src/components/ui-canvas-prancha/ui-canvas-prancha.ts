import { definirCustomElement } from '../../core/ssr-safe';
import type { Par } from '../../gerencigeo-canvas/feature_types';
import type { Alinhamento, OperacaoOrdem } from '../../gerencigeo-canvas/prancha/organizacao';
import type { AparenciaElemento, CaixaMm, CamadaPrancha } from '../../gerencigeo-canvas/prancha/tipos';
import { UICanvasPranchaBase } from './ui-canvas-prancha-base';
import { ATRIBUTOS_PRANCHA } from './prancha-atributos-sync';
import * as org from './prancha-comandos-organizacao';
import { pathfinderSelecao } from './prancha-comandos-pathfinder';
import { aplicarPropriedade, alterarElementos, type MudancaElementosPrancha } from './prancha-comandos-propriedades';
import { categoriasDePropriedades, type CategoriaPainelPrancha } from './prancha-painel-propriedades';
import { dadosParaPainelDeCamadas, type CamadaPainelPrancha, type FeicaoPainelPrancha } from './prancha-painel-camadas';
import type { OperacaoPathfinder } from '../../gerencigeo-canvas/prancha/pathfinder';

/**
 * Prancha de desenho vetorial em mm (folha de impressão), sem Leaflet: seleção e seleção direta, caixa de transformação
 * com rotação, cantos arredondados ao vivo, formas, polilinha, caneta Bézier, texto, snap, guias, réguas, grade, zoom/pan,
 * camadas, ordem, grupos (com isolamento), alinhar e distribuir, duplicar, copiar e colar, conta-gotas, máscara de recorte,
 * operações de caminho, Pathfinder, mesclagem e sombra, teclado e histórico. O componente não grava nada: devolve as mudanças em eventos e o app decide id,
 * nome e persistência.
 *
 * @fires prancha-elemento-criado - `{ elementos, motivo }`: elementos criados pelo usuário (ferramenta, texto, predefinição, colar, duplicar).
 * @fires prancha-elemento-atualizado - `{ elementos, motivo }`: elementos alterados por um gesto ou comando.
 * @fires prancha-elemento-removido - `{ ids, elementos, motivo }`.
 * @fires prancha-ordem - `{ ids, motivo }`: a ordem de empilhamento mudou.
 * @fires prancha-selecao - `{ ids, elementos }` sempre que a seleção muda.
 * @fires prancha-ferramenta - `{ ferramenta }`.
 * @fires prancha-edicao-iniciada - `{ elemento }`: entrou na seleção direta (âncoras).
 * @fires prancha-edicao-concluida - `{ elemento }`.
 * @fires prancha-recusa - `{ acao, motivo, id? }`.
 * @fires prancha-vista - `{ zoom, zoomPercentual, pan }`.
 * @fires prancha-historico - `{ podeDesfazer, podeRefazer }`.
 * @fires prancha-guias - `{ guias }`.
 * @fires prancha-camadas - `{ camadas }`.
 * @fires prancha-isolamento - `{ grupoId }` (`null` ao sair do grupo isolado).
 * @fires prancha-conta-gotas - `{ elemento, aparencia }`.
 * @fires prancha-ponteiro - `{ coordenada }` (mm na folha, `null` ao sair).
 * @fires prancha-texto-solicitado - cancelável; `{ posicao, concluir(texto) }`.
 *
 * @csspart base - Contêiner raiz (réguas + área de desenho).
 * @csspart viewport - Área de desenho focável (`role="application"`).
 * @csspart canvas - Canvas da folha e dos elementos.
 * @csspart sobreposicao - Canvas da seleção, alças, guias e snap.
 * @csspart regua - As duas réguas (`regua-horizontal`, `regua-vertical`).
 * @csspart canto-reguas - Quadrado entre as réguas.
 * @csspart status - Região viva dos anúncios (visualmente oculta).
 */
export class UICanvasPrancha extends UICanvasPranchaBase {
  static get observedAttributes() {
    return ATRIBUTOS_PRANCHA;
  }

  // ---------- camadas e isolamento ----------

  /** Camadas da prancha (a primeira fica atrás). Elementos sem camada ficam por cima. */
  definirCamadas(camadas: CamadaPrancha[]): void { this.c.definirCamadas(camadas); }
  obterCamadas(): CamadaPrancha[] { return this.c.camadas.map((k) => ({ ...k })); }
  /** Camada que recebe os elementos novos (desenhados, colados, pré-definições); `null` = sem camada. */
  definirCamadaAtiva(id: string | null): void { this.c.camadaAtiva = typeof id === 'string' && this.c.camadas.some((k) => k.id === id) ? id : null; }
  moverSelecaoParaCamada(id: string): boolean { return org.moverSelecaoParaCamada(this.c, id); }
  /** Isola um grupo (só os membros se selecionam) ou sai do isolamento com `null`. */
  isolarGrupo(grupoId: string | null): void { this.c.isolar(grupoId); }

  // ---------- ordem, grupos, bloquear e ocultar ----------

  ordenarSelecao(op: OperacaoOrdem): boolean { return org.ordenarSelecao(this.c, op); }
  trazerParaFrente(): boolean { return org.ordenarSelecao(this.c, 'frente'); }
  enviarParaTras(): boolean { return org.ordenarSelecao(this.c, 'tras'); }
  avancar(): boolean { return org.ordenarSelecao(this.c, 'avancar'); }
  recuar(): boolean { return org.ordenarSelecao(this.c, 'recuar'); }
  agruparSelecao(): boolean { return org.agruparSelecao(this.c); }
  desagruparSelecao(): boolean { return org.desagruparSelecao(this.c); }
  bloquearSelecao(): boolean { return org.marcarSelecao(this.c, 'bloqueado'); }
  ocultarSelecao(): boolean { return org.marcarSelecao(this.c, 'oculto'); }
  desbloquearTudo(): boolean { return org.liberarTodos(this.c, 'bloqueado'); }
  mostrarTudo(): boolean { return org.liberarTodos(this.c, 'oculto'); }

  // ---------- alinhar, distribuir, duplicar ----------

  /** Alinha à seleção, à folha, ao primeiro selecionado (`'chave'`) ou a uma caixa em mm (as margens, o quadro). */
  alinharSelecao(alinhamento: Alinhamento, referencia: 'selecao' | 'folha' | 'chave' | CaixaMm = 'selecao'): boolean {
    return org.alinharSelecao(this.c, alinhamento, referencia);
  }

  /** Distribui centros ou espaços (iguais, ou `espacamento` fixo em mm). */
  distribuirSelecao(eixo: 'horizontal' | 'vertical', modo: 'centros' | 'espacos' = 'espacos', espacamento?: number): boolean {
    return org.distribuirSelecao(this.c, eixo, modo, espacamento);
  }

  duplicarSelecao(deslocamento?: Par): boolean { return org.duplicarSelecao(this.c, deslocamento); }
  /** Ctrl+D: repete a última transformação (duplicando, se ela foi uma cópia). */
  transformarDeNovo(): boolean { return org.transformarDeNovo(this.c); }

  // ---------- área de transferência e aparência ----------

  copiar(): boolean { return org.copiar(this.c); }
  recortar(): boolean { return org.recortar(this.c); }
  /** Cola deslocado a cada colagem, ou no mesmo lugar (`noLugar`). */
  colar(noLugar = false): boolean { return org.colar(this.c, noLugar); }
  aplicarAparencia(aparencia: AparenciaElemento | null): boolean { return org.aplicarAparenciaNaSelecao(this.c, aparencia); }

  // ---------- máscara e operações de caminho ----------

  criarMascara(): boolean { return org.criarMascaraDaSelecao(this.c); }
  liberarMascara(): boolean { return org.liberarMascaraDaSelecao(this.c); }
  unirSelecao(tolerancia?: number): boolean { return org.unirSelecao(this.c, tolerancia); }
  dividirSelecao(): boolean { return org.dividirSelecao(this.c); }
  /** Deslocar caminho (offset): cria um contorno novo a `distancia` mm (negativo = para dentro). */
  deslocarCaminho(distancia: number): boolean { return org.deslocarCaminhoDaSelecao(this.c, distancia); }
  simplificarSelecao(tolerancia?: number): boolean { return org.simplificarSelecao(this.c, tolerancia); }
  contornarTraco(): boolean { return org.contornarTracoDaSelecao(this.c); }
  converterEmCaminho(): boolean { return org.converterSelecaoEmCaminho(this.c); }

  // ---------- Pathfinder (Fase 5) ----------

  /**
   * Operação booleana sobre a seleção: `'uniao'`, `'subtracao'` (o mais atrás menos os outros), `'intersecao'` ou
   * `'exclusao'`. O resultado é um caminho composto com o id e a aparência do mais à frente (na subtração, do mais atrás).
   */
  pathfinder(operacao: OperacaoPathfinder): boolean { return pathfinderSelecao(this.c, operacao); }
  /** Ctrl+Alt+Shift+1. */
  unirFormas(): boolean { return pathfinderSelecao(this.c, 'uniao'); }
  /** Ctrl+Alt+Shift+2 ("menos frente"). */
  subtrairFrente(): boolean { return pathfinderSelecao(this.c, 'subtracao'); }
  /** Ctrl+Alt+Shift+3. */
  intersectarFormas(): boolean { return pathfinderSelecao(this.c, 'intersecao'); }
  /** Ctrl+Alt+Shift+4. */
  excluirSobreposicao(): boolean { return pathfinderSelecao(this.c, 'exclusao'); }

  // ---------- painéis (Fase 6) ----------

  /** Categorias para o `<ui-tabela-propriedades>` com a seleção atual (`[]` sem seleção). */
  categoriasDePropriedades(): CategoriaPainelPrancha[] { return categoriasDePropriedades(this.c.doc.elementosSelecionados()); }

  /**
   * Aplica um campo do painel de propriedades à seleção (o `id` e o `valor` do `ui-propriedade-alterada`). Ação do usuário:
   * histórico (rajada no mesmo campo = um passo) e `prancha-elemento-atualizado` com motivo `propriedades`.
   */
  aplicarPropriedade(id: string, valor: unknown): boolean { return aplicarPropriedade(this.c, id, valor); }

  /** Dados para o `<ui-camadas>` (`painel.definirCamadas(d.camadas, d.feicoes)`), da frente para trás. */
  dadosParaPainelDeCamadas(): { camadas: CamadaPainelPrancha[]; feicoes: FeicaoPainelPrancha[] } {
    return dadosParaPainelDeCamadas(this.c.doc.elementos, this.c.camadas);
  }

  /** Oculta, trava, renomeia ou muda de camada elementos pelo id (o painel de camadas), inclusive travados. */
  alterarElementos(ids: string[], mudanca: MudancaElementosPrancha): boolean { return alterarElementos(this.c, ids, mudanca); }
}

definirCustomElement('ui-canvas-prancha', UICanvasPrancha);
