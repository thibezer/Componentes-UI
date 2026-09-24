import estilos from './ui-stat.css?inline';

export type TendenciaStat = 'alta' | 'positivo' | 'baixa' | 'negativo' | 'neutro';

export class UIStat extends HTMLElement {
  static get observedAttributes() {
    return [
      'rotulo',
      'label',
      'valor',
      'value',
      'variacao',
      'trend',
      'tendencia',
      'direction',
      'descricao',
      'description',
      'elevacao',
      'elevation'
    ];
  }

  private statElement: HTMLDivElement;
  private rotuloElement: HTMLSpanElement;
  private valorElement: HTMLDivElement;
  private indicadorElement: HTMLDivElement;
  private setaElement: HTMLSpanElement;
  private variacaoElement: HTMLSpanElement;
  private descricaoElement: HTMLSpanElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-stat">
        <div class="ui-stat__cabecalho">
          <span class="ui-stat__rotulo"></span>
          <div class="ui-stat__icone-slot"><slot name="icone"></slot></div>
        </div>
        <div class="ui-stat__conteudo">
          <div class="ui-stat__valor"></div>
          <div class="ui-stat__indicador" style="display: none;">
            <span class="ui-stat__seta" aria-hidden="true"></span>
            <span class="ui-stat__variacao"></span>
          </div>
        </div>
        <div class="ui-stat__rodape">
          <span class="ui-stat__descricao" style="display: none;"></span>
          <slot name="grafico"></slot>
          <slot></slot>
        </div>
      </div>
    `;

    this.statElement = shadow.querySelector('.ui-stat')!;
    this.rotuloElement = shadow.querySelector('.ui-stat__rotulo')!;
    this.valorElement = shadow.querySelector('.ui-stat__valor')!;
    this.indicadorElement = shadow.querySelector('.ui-stat__indicador')!;
    this.setaElement = shadow.querySelector('.ui-stat__seta')!;
    this.variacaoElement = shadow.querySelector('.ui-stat__variacao')!;
    this.descricaoElement = shadow.querySelector('.ui-stat__descricao')!;
  }

  connectedCallback() {
    this.syncState();
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  get rotulo(): string {
    return this.getAttribute('rotulo') || this.getAttribute('label') || '';
  }

  set rotulo(val: string) {
    this.setAttribute('rotulo', val);
  }

  get valor(): string {
    return this.getAttribute('valor') || this.getAttribute('value') || '';
  }

  set valor(val: string) {
    this.setAttribute('valor', val);
  }

  get variacao(): string {
    return this.getAttribute('variacao') || this.getAttribute('trend') || '';
  }

  set variacao(val: string) {
    this.setAttribute('variacao', val);
  }

  get tendencia(): TendenciaStat {
    const t = (this.getAttribute('tendencia') || this.getAttribute('direction') || 'positivo').toLowerCase();
    if (t === 'baixa' || t === 'negativo' || t === 'down') return 'baixa';
    if (t === 'neutro' || t === 'neutral') return 'neutro';
    return 'alta';
  }

  set tendencia(val: TendenciaStat) {
    this.setAttribute('tendencia', val);
  }

  get descricao(): string {
    return this.getAttribute('descricao') || this.getAttribute('description') || '';
  }

  set descricao(val: string) {
    this.setAttribute('descricao', val);
  }

  private syncState() {
    const rotuloText = this.rotulo;
    const valorText = this.valor;
    const variacaoText = this.variacao;
    const tendenciaVal = this.tendencia;
    const descricaoText = this.descricao;
    const elevacao = this.getAttribute('elevacao') || this.getAttribute('elevation') || 'baixa';

    // Classes de elevação
    this.statElement.className = `ui-stat ui-stat--${elevacao}`;

    // Rótulo e Valor (seguro com textContent)
    this.rotuloElement.textContent = rotuloText;
    this.valorElement.textContent = valorText;

    // Indicador de Tendência e Variação
    if (variacaoText) {
      this.variacaoElement.textContent = variacaoText;
      this.indicadorElement.style.display = 'inline-flex';

      if (tendenciaVal === 'baixa') {
        this.indicadorElement.className = 'ui-stat__indicador ui-stat__indicador--negativo';
        this.setaElement.textContent = '↓';
        this.indicadorElement.setAttribute('aria-label', `Queda de ${variacaoText}`);
      } else if (tendenciaVal === 'neutro') {
        this.indicadorElement.className = 'ui-stat__indicador ui-stat__indicador--neutro';
        this.setaElement.textContent = '→';
        this.indicadorElement.setAttribute('aria-label', `Variação estável de ${variacaoText}`);
      } else {
        this.indicadorElement.className = 'ui-stat__indicador ui-stat__indicador--positivo';
        this.setaElement.textContent = '↑';
        this.indicadorElement.setAttribute('aria-label', `Aumento de ${variacaoText}`);
      }
    } else {
      this.indicadorElement.style.display = 'none';
    }

    // Descrição
    if (descricaoText) {
      this.descricaoElement.textContent = descricaoText;
      this.descricaoElement.style.display = 'block';
    } else {
      this.descricaoElement.style.display = 'none';
    }
  }
}

// Aliases W3C
export class UIKpi extends UIStat {}
export class UIMetrica extends UIStat {}

if (!customElements.get('ui-stat')) {
  customElements.define('ui-stat', UIStat);
}

if (!customElements.get('ui-kpi')) {
  customElements.define('ui-kpi', UIKpi);
}

if (!customElements.get('ui-metrica')) {
  customElements.define('ui-metrica', UIMetrica);
}
