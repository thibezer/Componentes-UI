import estilos from './ui-ribbon.css?inline';
import estilosComuns from './ferramentas-comum.css?inline';
import { ListenerBag } from '../../core/listener-bag';
import type { FerramentaItem, RibbonAba, RibbonGrupo } from './tipos';
import {
  abrirMenu,
  acharItem,
  aplicarEstadoBotao,
  atualizarRoving,
  avisarIdsDuplicados,
  coletarIds,
  correspondeAtalho,
  criarBotaoDividido,
  criarBotaoFerramenta,
  definirRoving,
  GerenciadorTooltip,
  navegarRoving,
  seguirFoco,
  type MenuHandle
} from './ferramentas-comum';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ATRIBUTOS_DEGRADE, aplicarDegradeNoElemento, ehAtributoDegrade } from '../../core/degrade';
import { criarBotaoAba, criarGrupoRibbon } from './ribbon-render';
import { acaoDaTeclaAba } from './ribbon-teclado';
import {
  NIVEL_COLAPSADO,
  NIVEL_COMPLETO,
  NIVEL_REDUZIDO,
  decidirNiveisGrupos,
  decidirRecolhimentoAuto,
  rolagemParaVisivel,
  type GrupoMedido
} from './ribbon-colapso';

/**
 * <ui-ribbon> — barra de ferramentas em abas com grupos (estilo AutoCAD / Word / Excel).
 *
 * Atributos: aba-ativa, recolhido, compacto, ativacao-manual, copiar-dados, modo-controlado, atalhos, keytips,
 *            recolher-abaixo (largura em px abaixo da qual a faixa se recolhe sozinha),
 *            aria-label (rótulo da toolbar), rotulo-abas (rótulo do tablist)
 * Propriedades: abas, abaAtiva, recolhido, compacto, ativacaoManual, modoControlado, copiarDados, recolherAbaixo
 *
 * Responsividade (mede o espaço real do painel, não a janela): quando os grupos não cabem, degradam em rodadas,
 * dos de menor `prioridade` para os de maior (empate: da direita para a esquerda): 1) botões pequenos ficam só com
 * ícone; 2) o grupo vira um botão único com flyout. Ao ganhar espaço tudo volta. A aba ativa é mantida visível na
 * lista de abas e, com `recolher-abaixo`, a faixa se recolhe em telas estreitas (e é restaurada ao alargar, mas
 * só se foi recolhida automaticamente).
 * Métodos: atualizarItem(id, parcial), definirAbaVisivel(id, visivel), selecionarAba(id)
 * Eventos: ui-ferramenta { id, item, pai?, ativo?, origem, aba } (cancelável: preventDefault reverte o toggle),
 *          ui-aba-change { id, aba }, ui-recolhido-change { recolhido }, ui-grupo-dialogo { id, grupo }
 *
 * `aba-ativa` pode ser definido antes de `abas`: o valor fica pendente até a aba existir/ficar visível.
 *
 * @csspart base - Contêiner raiz da faixa de opções (ribbon).
 * @csspart cabecalho - Barra superior contendo as abas e o botão de fixar.
 * @csspart abas - Lista rolável de abas (`role="tablist"`).
 * @csspart mais-abas - Botão que lista todas as abas (aparece só quando a lista de abas transborda).
 * @csspart fixar - Botão de fixar ou recolher a faixa de opções.
 * @csspart painel - Painel da aba ativa (`role="tabpanel"`).
 * @csspart grupos - Grade dos grupos de ferramentas (`role="toolbar"`).
 */
let contadorRibbon = 0;

export class UIRibbon extends SafeHTMLElement {
  static get observedAttributes() {
    return [
      'aba-ativa',
      'recolhido',
      'compacto',
      'ativacao-manual',
      'copiar-dados',
      'modo-controlado',
      'atalhos',
      'keytips',
      'recolher-abaixo',
      'aria-label',
      'rotulo-abas',
      'rotulo-mais-abas',
      'rotulo-fixar',
      'rotulo-expandir',
      ...ATRIBUTOS_DEGRADE
    ];
  }

  private rootElement: HTMLDivElement;
  private abasElement: HTMLDivElement;
  private gruposElement: HTMLDivElement;
  private painelElement: HTMLDivElement;
  private fixarElement: HTMLButtonElement;
  private maisAbasElement: HTMLButtonElement;
  private menuAbas: MenuHandle | null = null;
  private readonly uid = `ui-ribbon-${++contadorRibbon}`;
  private _abaPendente = '';
  private _pronto = false;
  private _modoControlado = false;

  private _abas: RibbonAba[] = [];
  private _abaAtiva = '';
  private menu: MenuHandle | null = null;
  private listeners = new ListenerBag();
  private tooltip: GerenciadorTooltip | null = null;
  private observerResize: ResizeObserver | null = null;
  /** Grupos no nível 2 (botão único com flyout). */
  private gruposColapsados = new Set<string>();
  /** Grupos no nível 1 (botões pequenos só com ícone). */
  private gruposReduzidos = new Set<string>();
  /** Larguras medidas por nível da aba ativa; `chave` invalida quando o layout pode ter mudado. */
  private medidas: { chave: string; grupos: GrupoMedido[] } | null = null;
  private revisaoLayout = 0;
  private keytipsAtivas = false;
  /** Lado do `recolher-abaixo` na última medição (`null` = ainda não medido). */
  private estreito: boolean | null = null;
  private aplicandoRecolhimentoAuto = false;
  private recolhidoPorAuto = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilosComuns}${estilos}</style>
      <div class="ui-ribbon" part="base">
        <div class="ui-ribbon__cabecalho" part="cabecalho">
          <div class="ui-ribbon__abas" part="abas" role="tablist"></div>
          <button type="button" class="ui-ribbon__mais-abas" part="mais-abas" aria-haspopup="menu" aria-expanded="false" hidden></button>
          <button type="button" class="ui-ribbon__fixar" part="fixar"></button>
        </div>
        <div class="ui-ribbon__painel" part="painel" role="tabpanel">
          <div class="ui-ribbon__grupos" part="grupos" role="toolbar" aria-label="Ferramentas"></div>
        </div>
      </div>
    `;
    this.rootElement = shadow.querySelector('.ui-ribbon')!;
    this.abasElement = shadow.querySelector('.ui-ribbon__abas')!;
    this.gruposElement = shadow.querySelector('.ui-ribbon__grupos')!;
    this.painelElement = shadow.querySelector('.ui-ribbon__painel')!;
    this.fixarElement = shadow.querySelector('.ui-ribbon__fixar')!;
    this.maisAbasElement = shadow.querySelector('.ui-ribbon__mais-abas')!;
    this.painelElement.id = `${this.uid}-painel`;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.tooltip?.destruir();
    this.tooltip = new GerenciadorTooltip(this.shadowRoot!, this.rootElement);

    this.listeners.add(this.abasElement, 'click', this.handleClickAbas);
    this.listeners.add(this.fixarElement, 'click', this.handleClickFixar);
    this.listeners.add(this.maisAbasElement, 'click', this.handleClickMaisAbas);
    this.listeners.add(this.maisAbasElement, 'keydown', this.handleKeyDownMaisAbas);
    this.listeners.add(this.abasElement, 'dblclick', this.handleDblClickAbas);
    this.listeners.add(this.abasElement, 'keydown', this.handleKeyDownAbas);
    this.listeners.add(this.gruposElement, 'click', this.handleClickGrupos);
    this.listeners.add(this.gruposElement, 'keydown', this.handleKeyDownGrupos);
    this.listeners.add(document, 'pointerdown', this.handlePointerDownFora, true);
    this.listeners.add(this.rootElement, 'keydown', this.handleEscape);
    this.listeners.add(this.gruposElement, 'focusin', this.handleFocusInGrupos);
    this.listeners.add(document, 'keydown', this.handleAtalho);

    this.iniciarResizeObserver();

    const inicial = this.getAttribute('aba-ativa');
    if (inicial && !this._abaAtiva) this._abaPendente = inicial;
    aplicarDegradeNoElemento(this, this.rootElement);
    this.aplicarRotulos();
    this.estreito = null;
    this.invalidarMedidas();
    this.renderizar();
    this._pronto = true;
    this.avaliarRecolhimentoAuto();
  }

  disconnectedCallback() {
    this._pronto = false;
    this.fecharMenu();
    this.fecharMenuAbas();
    this.observerResize?.disconnect();
    this.observerResize = null;
    this.tooltip?.destruir();
    this.tooltip = null;
    this.listeners.cleanup();
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (old === value) return;
    if (ehAtributoDegrade(name)) {
      aplicarDegradeNoElemento(this, this.rootElement);
      return;
    }
    if (name === 'aba-ativa') {
      if (!value || value === this._abaAtiva) return;
      if (this._abas.some(a => a.id === value && !a.oculta)) {
        this._abaPendente = '';
        this.selecionarAba(value, false);
      } else {
        // abas ainda não carregadas (ou aba oculta): aplica quando existir
        this._abaPendente = value;
        if (this.abasVisiveis().length) this.renderizar();
      }
    } else if (name === 'compacto') {
      // altera a largura dos grupos: mede de novo
      this.invalidarMedidas();
      this.ajustarResponsivo();
    } else if (name === 'recolher-abaixo') {
      this.estreito = null;
      this.avaliarRecolhimentoAuto();
    } else if (name === 'recolhido') {
      // escolha do usuário/consumidor (não da automação) passa a mandar: nada de restaurar por conta própria
      if (!this.aplicandoRecolhimentoAuto) this.recolhidoPorAuto = false;
      this.rootElement.classList.remove('ui-ribbon--aberto');
      this.aplicarRotulos();
      if (this._pronto && (old === null) !== (value === null)) {
        this.dispatchEvent(
          new CustomEvent('ui-recolhido-change', {
            detail: { recolhido: value !== null },
            bubbles: true,
            composed: true
          })
        );
      }
    } else if (name === 'aria-label' || name === 'rotulo-abas' || name === 'rotulo-mais-abas' || name === 'rotulo-fixar' || name === 'rotulo-expandir') {
      this.aplicarRotulos();
    }
  }

  private aplicarRotulos() {
    this.gruposElement.setAttribute('aria-label', this.getAttribute('aria-label') || 'Ferramentas');
    this.abasElement.setAttribute('aria-label', this.getAttribute('rotulo-abas') || 'Abas');
    const maisAbas = this.getAttribute('rotulo-mais-abas') || 'Todas as abas';
    this.maisAbasElement.setAttribute('aria-label', maisAbas);
    this.maisAbasElement.title = maisAbas;
    // Botão fixar/recolher: o rótulo descreve a ação e aria-expanded o estado da faixa
    const recolhido = this.hasAttribute('recolhido');
    const rotulo = recolhido
      ? this.getAttribute('rotulo-expandir') || 'Fixar faixa de opções'
      : this.getAttribute('rotulo-fixar') || 'Recolher faixa de opções';
    this.fixarElement.setAttribute('aria-label', rotulo);
    this.fixarElement.title = rotulo;
    this.fixarElement.setAttribute('aria-expanded', String(!recolhido));
    this.fixarElement.setAttribute('aria-controls', this.painelElement.id);
  }

  /* ---------- API pública ---------- */

  get modoControlado(): boolean {
    return this._modoControlado || this.hasAttribute('modo-controlado') || this.hasAttribute('copiar-dados');
  }

  set modoControlado(val: boolean) {
    this._modoControlado = !!val;
  }

  get copiarDados(): boolean {
    return this.modoControlado;
  }

  set copiarDados(val: boolean) {
    this.modoControlado = val;
  }

  get ativacaoManual(): boolean {
    return this.hasAttribute('ativacao-manual');
  }

  set ativacaoManual(val: boolean) {
    if (val) this.setAttribute('ativacao-manual', '');
    else this.removeAttribute('ativacao-manual');
  }

  get abas(): RibbonAba[] {
    return this._abas;
  }

  set abas(val: RibbonAba[]) {
    const lista = Array.isArray(val) ? val : [];
    this._abas = this.modoControlado
      ? lista.map(a => ({
          ...a,
          grupos: a.grupos.map(g => ({
            ...g,
            itens: g.itens.map(i => ({
              ...i,
              filhos: i.filhos?.map(c => ({ ...c }))
            }))
          }))
        }))
      : lista;

    avisarIdsDuplicados(this._abas.map(a => a.id), '<ui-ribbon> abas');
    avisarIdsDuplicados(
      this._abas.flatMap(a => a.grupos.flatMap(g => coletarIds(g.itens))),
      '<ui-ribbon> itens'
    );
    this.gruposColapsados.clear();
    this.gruposReduzidos.clear();
    this.invalidarMedidas();
    this.renderizar();
  }

  get abaAtiva(): string {
    return this._abaAtiva;
  }

  set abaAtiva(id: string) {
    this.selecionarAba(id);
  }

  get recolhido(): boolean {
    return this.hasAttribute('recolhido');
  }

  set recolhido(val: boolean) {
    if (val) this.setAttribute('recolhido', '');
    else this.removeAttribute('recolhido');
  }

  get compacto(): boolean {
    return this.hasAttribute('compacto');
  }

  set compacto(val: boolean) {
    if (val) this.setAttribute('compacto', '');
    else this.removeAttribute('compacto');
  }

  /** Largura (px) abaixo da qual a faixa se recolhe sozinha. `0` desliga. */
  get recolherAbaixo(): number {
    const n = Number(this.getAttribute('recolher-abaixo'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  set recolherAbaixo(val: number) {
    if (Number.isFinite(val) && val > 0) this.setAttribute('recolher-abaixo', String(val));
    else this.removeAttribute('recolher-abaixo');
  }

  public selecionarAba(id: string, emitir: boolean = true) {
    const aba = this._abas.find(a => a.id === id && !a.oculta);
    if (!aba) {
      if (id && this._abas.length) console.warn(`[ui-ribbon] selecionarAba("${id}"): aba inexistente ou oculta.`);
      return;
    }
    if (aba.id === this._abaAtiva) return;
    this._abaPendente = '';

    this.fecharMenu();
    this.gruposColapsados.clear();
    this.gruposReduzidos.clear();
    this._abaAtiva = aba.id;
    if (this.getAttribute('aba-ativa') !== aba.id) this.setAttribute('aba-ativa', aba.id);
    this.renderizar();

    if (emitir) {
      this.dispatchEvent(
        new CustomEvent('ui-aba-change', {
          detail: { id: aba.id, aba },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  public definirAbaVisivel(id: string, visivel: boolean) {
    const aba = this._abas.find(a => a.id === id);
    if (!aba) return;
    const antes = this._abaAtiva;
    aba.oculta = !visivel;
    if (!visivel && antes === id) this._abaAtiva = '';
    this.renderizar();

    // A aba ativa foi ocultada e outra assumiu: avisa o consumidor
    const nova = this._abas.find(a => a.id === this._abaAtiva);
    if (!visivel && antes === id && nova) {
      this.dispatchEvent(
        new CustomEvent('ui-aba-change', { detail: { id: nova.id, aba: nova }, bubbles: true, composed: true })
      );
    }
  }

  /** Atualiza um item (estado ou aparência) sem precisar recriar as abas. */
  public atualizarItem(id: string, parcial: Partial<FerramentaItem>) {
    const todos = this._abas.flatMap(a => a.grupos.flatMap(g => g.itens));
    const item = acharItem(todos, id);
    if (!item) {
      console.warn(`[ui-ribbon] atualizarItem("${id}"): item não encontrado.`);
      return;
    }
    Object.assign(item, parcial);

    // Item de outra aba: nada visível muda; a aba será montada com o estado novo ao ser aberta
    const aba = this._abas.find(a => a.id === this._abaAtiva);
    if (!aba || !acharItem(aba.grupos.flatMap(g => g.itens), id)) return;

    const soEstado = Object.keys(parcial).every(k => k === 'ativo' || k === 'disabled');
    const btn = this.gruposElement.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${CSS.escape(id)}"]`);
    if (soEstado) {
      // filho de menu não tem botão no painel: o estado aparece quando o menu for aberto
      if (btn) {
        aplicarEstadoBotao(btn, this.efetivo(item));
        atualizarRoving(this.botoesPainel());
      }
    } else {
      // rótulo/ícone/tamanho podem mudar a largura dos grupos: mede de novo
      this.invalidarMedidas();
      this.comFoco(() => this.renderizarPainel());
      this.ajustarResponsivo();
    }
  }

  private efetivo(item: FerramentaItem): FerramentaItem {
    return item.filhos?.length ? { ...item, tipo: 'menu' } : item;
  }

  /* ---------- Foco preservado em re-renderizações ---------- */

  private capturarFoco(): { seletor: string; id: string } | null {
    const ativo = this.shadowRoot?.activeElement as HTMLElement | null;
    if (!ativo?.dataset?.id) return null;
    if (ativo.classList.contains('ui-ribbon__aba')) return { seletor: '.ui-ribbon__aba', id: ativo.dataset.id };
    if (ativo.classList.contains('ui-ferr-btn')) return { seletor: '.ui-ferr-btn', id: ativo.dataset.id };
    return null;
  }

  private comFoco(fn: () => void) {
    const foco = this.capturarFoco();
    fn();
    if (!foco) return;
    const alvo = this.shadowRoot!.querySelector<HTMLButtonElement>(`${foco.seletor}[data-id="${CSS.escape(foco.id)}"]`);
    if (alvo && !alvo.disabled) alvo.focus();
  }

  private handleFocusInGrupos = (e: Event) => seguirFoco(this.botoesPainel(), e.target);

  /* ---------- Renderização ---------- */

  private abasVisiveis(): RibbonAba[] {
    return this._abas.filter(a => !a.oculta);
  }

  private renderizar() {
    const visiveis = this.abasVisiveis();
    if (this._abaPendente && visiveis.length) {
      if (visiveis.some(a => a.id === this._abaPendente)) {
        this._abaAtiva = this._abaPendente;
        this._abaPendente = '';
      } else if (!this._abas.some(a => a.id === this._abaPendente)) {
        console.warn(`[ui-ribbon] aba-ativa="${this._abaPendente}" não existe em "abas".`);
        this._abaPendente = '';
      }
      // aba existente porém oculta: continua pendente até definirAbaVisivel(id, true)
    }
    if (!visiveis.some(a => a.id === this._abaAtiva)) {
      this._abaAtiva = visiveis[0]?.id ?? '';
    }
    if (this._abaAtiva && !this._abaPendente && this.getAttribute('aba-ativa') !== this._abaAtiva) {
      this.setAttribute('aba-ativa', this._abaAtiva);
    }
    this.comFoco(() => {
      this.renderizarAbas();
      this.renderizarPainel();
    });
    this.ajustarResponsivo();
    this.rolarAbaAtivaParaVisivel();
    this.atualizarMaisAbas();
  }

  private renderizarAbas() {
    this.abasElement.innerHTML = '';
    this.abasVisiveis().forEach(aba => {
      this.abasElement.appendChild(criarBotaoAba({
        aba,
        ativa: aba.id === this._abaAtiva,
        idBotao: this.idAba(aba.id),
        idPainel: this.painelElement.id
      }));
    });
  }

  /* ---------- Menu "mais abas" (lista transborda) ---------- */

  /** Mostra o botão só quando as abas não cabem; fecha o menu se ele deixar de ser necessário. */
  private atualizarMaisAbas() {
    const lista = this.abasElement;
    const transborda = lista.scrollWidth > lista.clientWidth + 1 && this.abasVisiveis().length > 1;
    this.maisAbasElement.hidden = !transborda;
    if (!transborda) this.fecharMenuAbas();
  }

  private fecharMenuAbas() {
    this.menuAbas?.fechar();
    this.menuAbas = null;
  }

  private handleClickMaisAbas = (e: Event) => {
    // detail === 0: ativação por teclado (Enter/Espaço) → foca o primeiro item
    this.alternarMenuAbas((e as MouseEvent).detail === 0);
  };

  private handleKeyDownMaisAbas = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown') return;
    e.preventDefault();
    if (this.menuAbas) this.menuAbas.focarPrimeiro();
    else this.alternarMenuAbas(true);
  };

  private alternarMenuAbas(focar: boolean) {
    const jaAberto = !!this.menuAbas;
    this.fecharMenuAbas();
    if (jaAberto) return;

    const btn = this.maisAbasElement;
    btn.setAttribute('aria-expanded', 'true');
    const itens: FerramentaItem[] = this.abasVisiveis().map(a => ({
      id: a.id,
      rotulo: a.rotulo,
      tipo: 'ferramenta',
      ativo: a.id === this._abaAtiva
    }));
    this.menuAbas = abrirMenu(
      this.shadowRoot!,
      btn,
      itens,
      item => {
        this.selecionarAba(item.id);
        this.abasElement.querySelector<HTMLButtonElement>(`.ui-ribbon__aba[data-id="${CSS.escape(item.id)}"]`)?.focus();
      },
      {
        lado: 'baixo',
        focar,
        onFechar: () => {
          btn.setAttribute('aria-expanded', 'false');
          this.menuAbas = null;
        }
      }
    );
  }

  /** Mantém a aba ativa dentro da área visível da lista de abas (sem rolar a página, só a lista). */
  private rolarAbaAtivaParaVisivel() {
    const lista = this.abasElement;
    const ativa = lista.querySelector<HTMLElement>('.ui-ribbon__aba--ativa');
    if (!ativa || !(lista.scrollWidth > lista.clientWidth)) return;
    const a = ativa.getBoundingClientRect();
    const nova = rolagemParaVisivel({
      inicio: a.left - lista.getBoundingClientRect().left + lista.scrollLeft,
      tamanho: a.width,
      rolagem: lista.scrollLeft,
      visivel: lista.clientWidth
    });
    if (nova !== lista.scrollLeft) lista.scrollLeft = nova;
  }

  private idAba(id: string): string {
    return `${this.uid}-aba-${id.replace(/\s+/g, '_')}`;
  }

  private renderizarPainel() {
    this.fecharMenu();
    this.gruposElement.innerHTML = '';
    const aba = this._abas.find(a => a.id === this._abaAtiva);
    if (!aba) {
      this.painelElement.removeAttribute('aria-labelledby');
      return;
    }
    this.painelElement.setAttribute('aria-labelledby', this.idAba(aba.id));

    aba.grupos.forEach(grupo => this.gruposElement.appendChild(criarGrupoRibbon(
      grupo,
      (item, variante, icone) => this.criarBotao(item, variante, icone),
      {
        colapsado: this.gruposColapsados.has(grupo.id),
        reduzido: this.gruposReduzidos.has(grupo.id),
        criarDividido: (item, variante, icone) => criarBotaoDividido(this.efetivo(item), variante, icone)
      }
    )));
    definirRoving(this.botoesPainel());
  }

  private iniciarResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    this.observerResize = new ResizeObserver(() => {
      this.avaliarRecolhimentoAuto();
      this.ajustarResponsivo();
      this.atualizarMaisAbas();
    });
    // painel: espaço dos grupos; host: largura total (recolher-abaixo)
    this.observerResize.observe(this.painelElement);
    this.observerResize.observe(this.abasElement);
    this.observerResize.observe(this);
  }

  /* ---------- Responsividade: degradê dos grupos por falta de espaço ---------- */

  private invalidarMedidas() {
    this.revisaoLayout++;
    this.medidas = null;
  }

  /** Largura fixa do contêiner dos grupos fora dos próprios grupos (padding) + 1px de tolerância de arredondamento. */
  private larguraFixaGrupos(): number {
    try {
      const css = getComputedStyle(this.gruposElement);
      return (parseFloat(css.paddingLeft) || 0) + (parseFloat(css.paddingRight) || 0) + 1;
    } catch {
      return 1;
    }
  }

  private larguraDoGrupo(id: string): number {
    return this.gruposElement.querySelector<HTMLElement>(`.ui-ribbon__grupo[data-id="${CSS.escape(id)}"]`)?.offsetWidth ?? 0;
  }

  private definirNiveis(reduzidos: Iterable<string>, colapsados: Iterable<string>) {
    this.gruposReduzidos = new Set(reduzidos);
    this.gruposColapsados = new Set(colapsados);
  }

  /**
   * Mede a largura de cada grupo da aba nos três níveis (renderiza os três estados de forma síncrona, sem pintura
   * entre eles) e guarda em cache até o layout poder mudar (outra aba, `compacto`, itens alterados).
   * Deixa o DOM no último estado medido: quem chama deve renderizar o resultado final.
   */
  private medirGrupos(aba: RibbonAba): { grupos: GrupoMedido[]; mediu: boolean } {
    const chave = `${aba.id}|${this.compacto}|${this.revisaoLayout}`;
    if (this.medidas?.chave === chave) return { grupos: this.medidas.grupos, mediu: false };

    const ids = aba.grupos.map(g => g.id);
    const larguras: number[][] = ids.map(() => []);
    for (const nivel of [NIVEL_COMPLETO, NIVEL_REDUZIDO, NIVEL_COLAPSADO]) {
      this.definirNiveis(nivel === NIVEL_REDUZIDO ? ids : [], nivel === NIVEL_COLAPSADO ? ids : []);
      this.renderizarPainel();
      ids.forEach((id, i) => larguras[i].push(this.larguraDoGrupo(id)));
    }
    const grupos = aba.grupos.map((g, i) => ({ id: g.id, prioridade: g.prioridade, larguras: larguras[i] }));
    this.medidas = { chave, grupos };
    return { grupos, mediu: true };
  }

  /**
   * Ajusta o nível de cada grupo ao espaço real do painel. Só re-renderiza quando o resultado muda, então
   * notificações repetidas do ResizeObserver (inclusive as causadas por esta própria renderização) não fazem laço.
   * Painel oculto (faixa recolhida) ou sem layout: não decide nada.
   */
  private ajustarResponsivo() {
    if (!this.isConnected) return;
    const aba = this._abas.find(a => a.id === this._abaAtiva);
    if (!aba?.grupos.length) return;
    const disponivel = this.painelElement.clientWidth;
    if (!(disponivel > 0)) return;

    this.comFoco(() => {
      const reduzidosAntes = new Set(this.gruposReduzidos);
      const colapsadosAntes = new Set(this.gruposColapsados);
      const { grupos, mediu } = this.medirGrupos(aba);
      const { niveis } = decidirNiveisGrupos(grupos, disponivel, this.larguraFixaGrupos());

      const ids = (n: number) => [...niveis].filter(([, nivel]) => nivel === n).map(([id]) => id);
      const reduzidos = ids(NIVEL_REDUZIDO);
      const colapsados = ids(NIVEL_COLAPSADO);
      const igual = (a: Set<string>, b: string[]) => a.size === b.length && b.every(id => a.has(id));

      if (!mediu && igual(reduzidosAntes, reduzidos) && igual(colapsadosAntes, colapsados)) return;
      this.definirNiveis(reduzidos, colapsados);
      this.renderizarPainel();
    });
  }

  /** `recolher-abaixo`: recolhe a faixa ao cruzar para estreito e restaura (só se foi automático) ao alargar. */
  private avaliarRecolhimentoAuto() {
    const limite = this.recolherAbaixo;
    if (!limite) {
      this.estreito = null;
      return;
    }
    const d = decidirRecolhimentoAuto(this.estreito, this.offsetWidth, limite, this.recolhido, this.recolhidoPorAuto);
    this.estreito = d.estreito;
    if (!d.acao) return;

    this.aplicandoRecolhimentoAuto = true;
    try {
      this.recolhido = d.acao === 'recolher';
    } finally {
      this.aplicandoRecolhimentoAuto = false;
    }
    this.recolhidoPorAuto = d.acao === 'recolher';
  }

  private alternarMenuGrupoColapsado(btn: HTMLButtonElement, grupo: RibbonGrupo) {
    const jaAberto = this.menu?.ancora === btn;
    this.fecharMenu();
    if (jaAberto) return;

    btn.setAttribute('aria-expanded', 'true');
    this.menu = abrirMenu(
      this.shadowRoot!,
      btn,
      grupo.itens,
      item => {
        const btnReal = this.gruposElement.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${CSS.escape(item.id)}"]`);
        if (btnReal) this.acionar(btnReal, false);
        else {
          const antes = item.ativo;
          if (item.tipo === 'toggle') item.ativo = !antes;
          else if (item.tipo === 'ferramenta') item.ativo = true;
          if (!this.emitir(item)) item.ativo = antes;
        }
        this.rootElement.classList.remove('ui-ribbon--aberto');
      },
      {
        lado: 'baixo',
        onFechar: () => {
          btn.setAttribute('aria-expanded', 'false');
          this.menu = null;
        }
      }
    );
  }

  private criarBotao(item: FerramentaItem, variante: 'grande' | 'pequeno', icone: number): HTMLButtonElement {
    return criarBotaoFerramenta(this.efetivo(item), variante, icone);
  }

  private botoesPainel(): HTMLButtonElement[] {
    return Array.from(this.gruposElement.querySelectorAll<HTMLButtonElement>('.ui-ferr-btn'));
  }

  /* ---------- Interação ---------- */

  private handleClickAbas = (e: Event) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>('.ui-ribbon__aba');
    if (!tab?.dataset.id) return;
    this.selecionarAba(tab.dataset.id);
    if (this.recolhido) this.rootElement.classList.toggle('ui-ribbon--aberto');
  };

  private handleClickFixar = () => {
    this.recolhido = !this.recolhido;
  };

  private get rtl(): boolean {
    return getComputedStyle(this).direction === 'rtl';
  }

  private handleDblClickAbas = (e: Event) => {
    if (!(e.target as HTMLElement).closest('.ui-ribbon__aba')) return;
    this.recolhido = !this.recolhido;
  };

  private handleKeyDownAbas = (e: KeyboardEvent) => {
    const tabs = Array.from(this.abasElement.querySelectorAll<HTMLButtonElement>('.ui-ribbon__aba'));
    const acao = acaoDaTeclaAba(e.key, tabs.findIndex(t => t === e.target), tabs.length, this.rtl, this.ativacaoManual);
    if (!acao) return;

    e.preventDefault();
    if (acao.tipo === 'descer') {
      // faixa recolhida: abre o painel flutuante antes de focar o primeiro botão
      if (this.recolhido) this.rootElement.classList.add('ui-ribbon--aberto');
      this.botoesPainel().find(b => !b.disabled)?.focus();
      return;
    }

    if (acao.tipo === 'ativar') {
      const id = tabs[acao.indice].dataset.id;
      if (id) this.selecionarAba(id);
      return;
    }

    const id = tabs[acao.indice].dataset.id;
    if (this.ativacaoManual) {
      // ativacao manual: as setas so movem o foco (roving); Enter/Espaco ativam
      tabs.forEach(t => (t.tabIndex = -1));
      tabs[acao.indice].tabIndex = 0;
      tabs[acao.indice].focus();
      return;
    }
    if (id) this.selecionarAba(id);
    this.abasElement.querySelector<HTMLButtonElement>(`.ui-ribbon__aba[data-id="${CSS.escape(id ?? '')}"]`)?.focus();
  };

  private handleClickGrupos = (e: Event) => {
    const alvo = e.target as HTMLElement;
    const aba = this._abas.find(a => a.id === this._abaAtiva);

    // grupo colapsado (sem espaço): o botão único abre o flyout com os itens do grupo
    const colapsado = alvo.closest<HTMLButtonElement>('.ui-ribbon__btn-colapsado');
    if (colapsado) {
      const grupo = aba?.grupos.find(g => g.id === colapsado.dataset.grupoColapsado);
      if (grupo) this.alternarMenuGrupoColapsado(colapsado, grupo);
      return;
    }

    // lançador de diálogo do grupo
    const lancador = alvo.closest<HTMLButtonElement>('.ui-ribbon__lancador');
    if (lancador) {
      const grupo = aba?.grupos.find(g => g.id === lancador.dataset.lancador);
      if (grupo) {
        this.dispatchEvent(new CustomEvent('ui-grupo-dialogo', {
          detail: { id: typeof grupo.lancadorDialogo === 'string' ? grupo.lancadorDialogo : grupo.id, grupo },
          bubbles: true,
          composed: true
        }));
      }
      return;
    }

    const splitGatilho = alvo.closest<HTMLButtonElement>('.ui-ferr-split__gatilho');
    if (splitGatilho) {
      const split = splitGatilho.closest<HTMLElement>('.ui-ferr-split');
      const id = split?.dataset.id;
      const item = aba && acharItem(aba.grupos.flatMap(g => g.itens), id ?? '');
      if (item && item.filhos?.length) {
        this.alternarMenu(splitGatilho, item, false);
      }
      return;
    }

    const btn = alvo.closest<HTMLButtonElement>('.ui-ferr-btn');
    if (!btn?.dataset.id) return;
    // detail === 0: ativação por teclado (Enter/Espaço) → foca o primeiro item do menu
    this.acionar(btn, (e as MouseEvent).detail === 0);
  };

  private handleKeyDownGrupos = (e: KeyboardEvent) => {
    const botoes = this.botoesPainel();
    if (this.rtl ? navegarRoving(e, botoes, ['ArrowRight'], ['ArrowLeft']) : navegarRoving(e, botoes, ['ArrowLeft'], ['ArrowRight'])) return;

    const btn = e.target instanceof HTMLButtonElement ? e.target : null;
    if (btn?.getAttribute('aria-haspopup') === 'menu' && e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.menu?.ancora === btn) this.menu.focarPrimeiro();
      else this.acionar(btn, true);
    }
  };

  private handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !this.menu) this.rootElement.classList.remove('ui-ribbon--aberto');
  };

  private handlePointerDownFora = (e: Event) => {
    if (!this.recolhido || !this.rootElement.classList.contains('ui-ribbon--aberto')) return;
    if (!e.composedPath().includes(this)) this.rootElement.classList.remove('ui-ribbon--aberto');
  };

  private handleAtalho = (e: KeyboardEvent) => {
    if (!this.hasAttribute('atalhos') && !this.hasAttribute('keytips')) return;
    if (e.defaultPrevented) return;

    const caminho = e.composedPath() as HTMLElement[];
    const origem = caminho[0];
    if (origem && (/^(INPUT|TEXTAREA|SELECT)$/.test(origem.tagName) || origem.isContentEditable)) return;
    const bloqueia = caminho.some(el => {
      const role = el.getAttribute?.('role');
      return (
        el.getAttribute?.('aria-modal') === 'true' ||
        role === 'textbox' || role === 'searchbox' || role === 'combobox' || role === 'spinbutton'
      );
    });
    if (bloqueia) return;

    if (this.hasAttribute('keytips') && (e.key === 'Alt' || e.key === 'F10') && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
      e.preventDefault();
      this.alternarKeyTips();
      return;
    }

    if (!this.hasAttribute('atalhos')) return;

    const aba = this._abas.find(a => a.id === this._abaAtiva);
    if (!aba) return;
    const itens = aba.grupos.flatMap(g => g.itens);
    const item = itens.find(i => !i.disabled && correspondeAtalho(e, i.atalho));
    if (!item) return;

    e.preventDefault();
    const btn = this.gruposElement.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${CSS.escape(item.id)}"]`);
    if (btn) this.acionar(btn, false);
    else this.emitir(item);
  };

  private alternarKeyTips() {
    this.keytipsAtivas = !this.keytipsAtivas;
    this.shadowRoot!.querySelectorAll('.ui-ribbon__keytip').forEach(el => el.remove());
    if (!this.keytipsAtivas) return;

    const tabs = Array.from(this.abasElement.querySelectorAll<HTMLButtonElement>('.ui-ribbon__aba'));
    tabs.forEach((tab, idx) => {
      const badge = document.createElement('span');
      badge.className = 'ui-ribbon__keytip';
      badge.textContent = String(idx + 1);
      badge.style.top = '2px';
      badge.style.left = '4px';
      tab.style.position = 'relative';
      tab.appendChild(badge);
    });
  }

  private acionar(btn: HTMLButtonElement, focarMenu: boolean) {
    const aba = this._abas.find(a => a.id === this._abaAtiva);
    const grupo = aba?.grupos.find(g => acharItem(g.itens, btn.dataset.id!));
    const item = grupo && acharItem(grupo.itens, btn.dataset.id!);
    if (!item || item.disabled) return;

    if (item.filhos?.length && !item.dividido) {
      this.alternarMenu(btn, item, focarMenu);
      return;
    }

    if (item.tipo === 'toggle') {
      const antes = item.ativo;
      item.ativo = !antes;
      aplicarEstadoBotao(btn, item);
      if (!this.emitir(item)) {
        item.ativo = antes;
        aplicarEstadoBotao(btn, item);
      }
    } else if (item.tipo === 'ferramenta') {
      const antesAtivo = item.ativo;
      const exclusivo = grupo ? grupo.exclusivo !== false : true;
      const irmaos = (exclusivo && grupo)
        ? grupo.itens.filter(i => i.tipo === 'ferramenta' && i.id !== item.id && i.ativo)
        : [];

      item.ativo = true;
      aplicarEstadoBotao(btn, item);
      if (exclusivo) {
        irmaos.forEach(i => {
          i.ativo = false;
          const b = this.gruposElement.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${CSS.escape(i.id)}"]`);
          if (b) aplicarEstadoBotao(b, i);
        });
      }

      if (!this.emitir(item)) {
        item.ativo = antesAtivo;
        aplicarEstadoBotao(btn, item);
        if (exclusivo) {
          irmaos.forEach(i => {
            i.ativo = true;
            const b = this.gruposElement.querySelector<HTMLButtonElement>(`.ui-ferr-btn[data-id="${CSS.escape(i.id)}"]`);
            if (b) aplicarEstadoBotao(b, i);
          });
        }
      }
    } else {
      this.emitir(item);
    }
    this.rootElement.classList.remove('ui-ribbon--aberto');
  }

  private alternarMenu(btn: HTMLButtonElement, item: FerramentaItem, focar: boolean) {
    const jaAberto = this.menu?.ancora === btn;
    this.fecharMenu();
    if (jaAberto) return;

    btn.setAttribute('aria-expanded', 'true');
    this.menu = abrirMenu(
      this.shadowRoot!,
      btn,
      item.filhos!,
      filho => {
        if (filho.tipo === 'toggle') {
          const antes = filho.ativo;
          filho.ativo = !antes;
          if (!this.emitir(filho, item)) filho.ativo = antes;
        } else {
          this.emitir(filho, item);
        }
        this.rootElement.classList.remove('ui-ribbon--aberto');
      },
      {
        lado: 'baixo',
        focar,
        onFechar: () => {
          btn.setAttribute('aria-expanded', 'false');
          this.menu = null;
        }
      }
    );
  }

  private fecharMenu() {
    this.menu?.fechar();
    this.menu = null;
  }

  /** Retorna false se o consumidor cancelou o evento (preventDefault). */
  private emitir(item: FerramentaItem, pai?: FerramentaItem): boolean {
    return this.dispatchEvent(
      new CustomEvent('ui-ferramenta', {
        detail: { id: item.id, item, pai, ativo: item.ativo, origem: 'ribbon', aba: this._abaAtiva },
        bubbles: true,
        composed: true,
        cancelable: true
      })
    );
  }
}

definirCustomElement('ui-ribbon', UIRibbon);
