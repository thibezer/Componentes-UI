import estilos from './ui-texto.css?inline';

export type VarianteTexto = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'h5' 
  | 'h6' 
  | 'corpo' 
  | 'corpo-sm' 
  | 'caption' 
  | 'codigo';

export type CorTexto = 'primaria' | 'secundaria' | 'destaque' | 'erro' | 'sucesso' | 'alerta';
export type PesoTexto = 'normal' | 'medio' | 'seminegrito' | 'negrito';
export type AlinhamentoTexto = 'esquerda' | 'centro' | 'direita' | 'justificado';

export class UITexto extends HTMLElement {
  static get observedAttributes() {
    return ['variante', 'tag', 'cor', 'peso', 'alinhamento', 'truncar'];
  }

  private container: HTMLElement;
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.container = document.createElement('p');
    this.container.className = 'ui-texto ui-texto--corpo';
    this.container.appendChild(document.createElement('slot'));

    this.shadow.innerHTML = `<style>${estilos}</style>`;
    this.shadow.appendChild(this.container);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.render();
  }

  private resolveTag(): string {
    const customTag = this.getAttribute('tag');
    if (customTag) {
      return customTag.toLowerCase();
    }

    const variante = (this.getAttribute('variante') || 'corpo').toLowerCase();
    switch (variante) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return variante;
      case 'caption':
        return 'small';
      case 'codigo':
        return 'code';
      case 'corpo-sm':
      case 'corpo':
      default:
        return 'p';
    }
  }

  private render() {
    const tagName = this.resolveTag();
    const variante = this.getAttribute('variante') || 'corpo';
    const cor = this.getAttribute('cor');
    const peso = this.getAttribute('peso');
    const alinhamento = this.getAttribute('alinhamento');
    const truncar = this.hasAttribute('truncar');

    // Re-criar o elemento semântico se a tag mudar
    if (this.container.tagName.toLowerCase() !== tagName) {
      const novoelemento = document.createElement(tagName);
      novoelemento.appendChild(document.createElement('slot'));
      this.shadow.replaceChild(novoelemento, this.container);
      this.container = novoelemento;
    }

    const classes = ['ui-texto', `ui-texto--${variante}`];

    if (cor) classes.push(`ui-texto--cor-${cor}`);
    if (peso) classes.push(`ui-texto--peso-${peso}`);
    if (alinhamento) classes.push(`ui-texto--alinhamento-${alinhamento}`);
    if (truncar) classes.push('ui-texto--truncar');

    this.container.className = classes.join(' ');
  }
}

if (!customElements.get('ui-texto')) {
  customElements.define('ui-texto', UITexto);
}
