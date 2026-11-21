import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ListenerBag } from '../../core/listener-bag';
import { ITENS_PREDEFINICOES } from '../../gerencigeo-canvas/prancha/elemento_predefinicoes';
import type { CamadaPrancha, ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import { ligarPaineisPrancha, type CamadasLigavel, type PaletaLigavel, type PropriedadesLigavel } from '../ui-canvas-prancha/prancha-paineis';
import type { UICanvasPrancha } from '../ui-canvas-prancha/ui-canvas-prancha';
import type { DetalheEditorCancelarPrancha, DetalheEditorConcluirPrancha } from './editor-tipos';
import estilos from './ui-editor-prancha.css?inline';

/** Atributos repassados à prancha interna (o resto é do editor). */
const REPASSADOS = ['largura', 'altura', 'unidade', 'grade', 'mostrar-grade', 'margens', 'ajustar-ao-abrir', 'somente-leitura', 'sem-snap', 'sem-reguas', 'rotulo'] as const;

/**
 * Editor de prancha completo: a `<ui-canvas-prancha>` com a paleta de ferramentas, o painel de camadas, o painel de
 * propriedades e um menu de pré-definições, já ligados entre si. Pensado para um modal (o teclado da prancha é
 * `exclusivo` por padrão e o Esc sem nada a cancelar vira `editor-cancelar`). Não grava nada: devolve os dados em
 * `editor-concluir` e o app decide. Os componentes internos (`ui-paleta-ferramentas`, `ui-camadas`,
 * `ui-tabela-propriedades`) são registrados pelo entrypoint `@thibezer/ui-components-kit/prancha`.
 *
 * @attr {number} largura - Largura da folha em mm (padrão 210).
 * @attr {number} altura - Altura da folha em mm (padrão 297).
 * @attr {string} margens - Margens da folha em mm, `"e d s i"` (guias e quadro das pré-definições de moldura).
 * @attr {number} grade - Passo da grade em mm.
 * @attr {boolean} mostrar-grade - Mostra a grade.
 * @attr {string} ajustar-ao-abrir - `folha` (padrão), `conteudo` ou `nenhum`.
 * @attr {string} teclado - `exclusivo` (padrão: a prancha captura as teclas da página) ou `local`.
 * @attr {boolean} somente-leitura - Sem edição.
 *
 * @fires editor-concluir - `{ elementos, camadas, modificado }`: o usuário confirmou.
 * @fires editor-cancelar - `{ modificado }`: o usuário cancelou (botão, ou Esc sem nada a cancelar na prancha).
 * @fires prancha-modificado - `{ modificado, revisao }`: sobe da prancha interna (só nas transições).
 *
 * @csspart base - Contêiner raiz.
 * @csspart barra - Barra de pré-definições.
 * @csspart lateral - Coluna de camadas e propriedades.
 * @csspart acoes - Rodapé com Cancelar e Concluir.
 */
export class UIEditorPrancha extends SafeHTMLElement {
  static get observedAttributes() {
    return [...REPASSADOS, 'teclado'];
  }

  private readonly shadow: ShadowRoot;
  private readonly bag = new ListenerBag();
  private desligarPaineis: (() => void) | null = null;
  private readonly _prancha: UICanvasPrancha;
  private readonly paleta: HTMLElement;
  private readonly painelCamadas: HTMLElement;
  private readonly painelPropriedades: HTMLElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="raiz" part="base">
        <div class="barra" part="barra" id="barra" role="toolbar" aria-label="Pré-definições"></div>
        <div class="area">
          <ui-paleta-ferramentas id="paleta" orientacao="vertical" atalhos></ui-paleta-ferramentas>
          <ui-canvas-prancha id="prancha" part="prancha" teclado="exclusivo" ajustar-ao-abrir="folha"></ui-canvas-prancha>
          <div class="lateral" part="lateral">
            <ui-camadas id="camadas" densidade="compacto" mostrar-mapas-base="false" mostrar-rodape="false" persistir="false" altura="260"></ui-camadas>
            <ui-tabela-propriedades id="propriedades" titulo="Aparência" modo-aplicar="imediato"></ui-tabela-propriedades>
          </div>
        </div>
        <div class="acoes" part="acoes">
          <button type="button" id="cancelar">Cancelar</button>
          <button type="button" id="concluir" class="primario">Concluir</button>
        </div>
      </div>`;
    const q = <T extends HTMLElement>(id: string): T => this.shadow.getElementById(id) as T;
    this._prancha = q<UICanvasPrancha>('prancha');
    this.paleta = q('paleta');
    this.painelCamadas = q('camadas');
    this.painelPropriedades = q('propriedades');
    // menu de pré-definições: rótulos pt-BR do kit, montados por nós de DOM (nada de HTML de fora)
    const barra = q('barra');
    for (const item of ITENS_PREDEFINICOES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.predefinicao = item.valor;
      b.textContent = item.rotulo;
      barra.appendChild(b);
    }
  }

  connectedCallback(): void {
    this.bag.cleanup();
    this.desligarPaineis?.();
    this.sincronizarAtributos();
    this.desligarPaineis = ligarPaineisPrancha({
      prancha: this._prancha,
      paleta: this.paleta as unknown as PaletaLigavel,
      camadas: this.painelCamadas as unknown as CamadasLigavel,
      propriedades: this.painelPropriedades as unknown as PropriedadesLigavel
    });
    this.bag.add(this.shadow.getElementById('concluir'), 'click', () => this.concluir());
    this.bag.add(this.shadow.getElementById('cancelar'), 'click', () => this.cancelar());
    this.bag.add(this.shadow.getElementById('barra'), 'click', (e: Event) => {
      const alvo = (e.target as HTMLElement | null)?.closest?.('button[data-predefinicao]') as HTMLButtonElement | null;
      const item = ITENS_PREDEFINICOES.find((i) => i.valor === alvo?.dataset.predefinicao);
      if (item) this._prancha.inserirPredefinicao(item.valor, undefined, item.usaQuadro ? { quadro: 'margens' } : {});
    });
    // Esc sem nada a cancelar na prancha: fecha o editor
    this.bag.add(this._prancha, 'prancha-esc-sem-efeito', () => this.cancelar());
  }

  disconnectedCallback(): void {
    this.bag.cleanup();
    this.desligarPaineis?.();
    this.desligarPaineis = null;
  }

  attributeChangedCallback(nome: string, _antigo: string | null, valor: string | null): void {
    this.repassar(nome, valor);
  }

  private repassar(nome: string, valor: string | null): void {
    const alvo = nome === 'teclado' ? 'teclado' : nome;
    const v = nome === 'teclado' ? (valor === 'local' ? null : 'exclusivo') : valor;
    if (v === null) this._prancha.removeAttribute(alvo);
    else this._prancha.setAttribute(alvo, v);
  }

  private sincronizarAtributos(): void {
    for (const n of REPASSADOS) this.repassar(n, this.getAttribute(n));
    this.repassar('teclado', this.getAttribute('teclado'));
  }

  // ---------- API ----------

  /** A prancha interna (para usar a API completa: ferramentas, vista, exportação). */
  get prancha(): UICanvasPrancha { return this._prancha; }

  /** Elementos do desenho. Ao atribuir, carrega (normaliza) e marca como salvo. */
  get elementos(): ElementoGrafico[] { return this._prancha.obterElementos(); }
  set elementos(lista: ElementoGrafico[]) { this._prancha.definirElementos(Array.isArray(lista) ? lista : []); }

  get camadas(): CamadaPrancha[] { return this._prancha.obterCamadas(); }
  set camadas(lista: CamadaPrancha[]) { this._prancha.definirCamadas(Array.isArray(lista) ? lista : []); }

  get modificado(): boolean { return this._prancha.modificado; }
  marcarComoSalvo(): void { this._prancha.marcarComoSalvo(); }
  /** Resolve quando a prancha mediu o layout e consegue enquadrar. */
  get pronto(): Promise<void> { return this._prancha.pronto; }

  /** Confirma: emite `editor-concluir` com os dados atuais. */
  concluir(): void {
    const detail: DetalheEditorConcluirPrancha = { elementos: this._prancha.obterElementos(), camadas: this._prancha.obterCamadas(), modificado: this._prancha.modificado };
    this.dispatchEvent(new CustomEvent('editor-concluir', { detail, bubbles: true, composed: true }));
  }

  /** Cancela: emite `editor-cancelar`. */
  cancelar(): void {
    const detail: DetalheEditorCancelarPrancha = { modificado: this._prancha.modificado };
    this.dispatchEvent(new CustomEvent('editor-cancelar', { detail, bubbles: true, composed: true }));
  }

  focus(opcoes?: FocusOptions): void { this._prancha.focus(opcoes); }
}

definirCustomElement('ui-editor-prancha', UIEditorPrancha);
