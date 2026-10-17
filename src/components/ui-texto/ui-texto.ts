import estilos from './ui-texto.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { escolherInteiro, escolherOpcao, escolherOpcaoOpcional } from '../../core/opcoes';

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

const VARIANTES: readonly VarianteTexto[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'corpo', 'corpo-sm', 'caption', 'codigo'];
const CORES: readonly CorTexto[] = ['primaria', 'secundaria', 'destaque', 'erro', 'sucesso', 'alerta'];
const PESOS: readonly PesoTexto[] = ['normal', 'medio', 'seminegrito', 'negrito'];
const ALINHAMENTOS: readonly AlinhamentoTexto[] = ['esquerda', 'centro', 'direita', 'justificado'];

const TAGS_PERMITIDAS = new Set([
  'p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'small', 'code', 'strong', 'em', 'label', 'blockquote', 'pre', 'b', 'i'
]);

const LINHAS_MAXIMO = 50;

/**
 * Tipografia semântica do kit. Texto longo: `linhas` limita o bloco a N linhas com reticências
 * e o conteúdo quebra palavras muito compridas em vez de estourar o contêiner.
 *
 * @element ui-texto
 *
 * @attr {string} variante - `h1`–`h6`, `corpo` (padrão), `corpo-sm`, `caption`, `codigo`.
 * @attr {string} tag - Tag semântica do elemento interno (somente tags de texto permitidas).
 * @attr {string} cor - `primaria`, `secundaria`, `destaque`, `erro`, `sucesso`, `alerta`.
 * @attr {string} peso - `normal`, `medio`, `seminegrito`, `negrito`.
 * @attr {string} alinhamento - `esquerda`, `centro`, `direita`, `justificado`.
 * @attr {boolean} truncar - Uma linha com reticências.
 * @attr {number} linhas - Limita a N linhas (1–50) com reticências; `truncar` tem prioridade.
 *
 * @csspart base - O elemento de texto interno.
 */
export class UITexto extends SafeHTMLElement {
  static get observedAttributes() {
    return ['variante', 'tag', 'cor', 'peso', 'alinhamento', 'truncar', 'linhas'];
  }

  private container: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;

  constructor() {
    super();
    // Em SSR/ambientes sem DOM o elemento fica inerte: nenhum método abaixo é executado
    if (typeof this.attachShadow === 'function' && typeof document !== 'undefined') {
      this.shadow = this.attachShadow({ mode: 'open' });
      const container = document.createElement('p');
      container.className = 'ui-texto ui-texto--corpo';
      container.setAttribute('part', 'base');
      container.appendChild(document.createElement('slot'));
      this.container = container;

      this.shadow.innerHTML = `<style>${estilos}</style>`;
      this.shadow.appendChild(container);
    }
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
      const normalizada = customTag.toLowerCase().trim();
      if (TAGS_PERMITIDAS.has(normalizada)) {
        return normalizada;
      }
      console.warn(`[ui-texto] Tag "${customTag}" não permitida ou inválida. Utilizando fallback semântico.`);
    }

    const variante = escolherOpcao(this.getAttribute('variante'), VARIANTES, 'corpo');
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
    const { container, shadow } = this;
    if (!container || !shadow) return;

    const tagName = this.resolveTag();
    const variante = escolherOpcao(this.getAttribute('variante'), VARIANTES, 'corpo');
    const cor = escolherOpcaoOpcional(this.getAttribute('cor'), CORES);
    const peso = escolherOpcaoOpcional(this.getAttribute('peso'), PESOS);
    const alinhamento = escolherOpcaoOpcional(this.getAttribute('alinhamento'), ALINHAMENTOS);
    const truncar = this.hasAttribute('truncar');
    const linhas = truncar ? 0 : escolherInteiro(this.getAttribute('linhas'), 1, LINHAS_MAXIMO, 0);

    // Re-criar o elemento semântico se a tag mudar
    let alvo = container;
    if (container.tagName.toLowerCase() !== tagName) {
      alvo = document.createElement(tagName);
      alvo.setAttribute('part', 'base');
      alvo.appendChild(document.createElement('slot'));
      shadow.replaceChild(alvo, container);
      this.container = alvo;
    }

    const classes = ['ui-texto', `ui-texto--${variante}`];

    if (cor) classes.push(`ui-texto--cor-${cor}`);
    if (peso) classes.push(`ui-texto--peso-${peso}`);
    if (alinhamento) classes.push(`ui-texto--alinhamento-${alinhamento}`);
    if (truncar) classes.push('ui-texto--truncar');
    if (linhas > 0) classes.push('ui-texto--linhas');

    alvo.className = classes.join(' ');
    if (linhas > 0) alvo.style.setProperty('--ui-texto-linhas', String(linhas));
    else alvo.style.removeProperty('--ui-texto-linhas');
  }
}

definirCustomElement('ui-texto', UITexto);
