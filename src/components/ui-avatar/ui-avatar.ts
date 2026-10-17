import estilos from './ui-avatar.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { escolherOpcao, escolherOpcaoOpcional } from '../../core/opcoes';

const TAMANHOS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const STATUS = ['online', 'offline', 'ausente', 'ocupado'] as const;
/** Faixa aceita para tamanhos numéricos (px). */
const TAMANHO_MIN_PX = 8;
const TAMANHO_MAX_PX = 512;

export class UIAvatar extends SafeHTMLElement {
  static get observedAttributes() {
    return [
      'src',
      'nome',
      'name',
      'tamanho',
      'size',
      'formato',
      'status',
      'aria-label'
    ];
  }

  private avatarElement: HTMLDivElement;
  private statusElement: HTMLSpanElement;
  /** O que este componente escreveu em aria-label / aria-hidden (para distinguir do que o consumidor definiu). */
  private _rotuloAuto: string | null = null;
  private _ocultoAuto = false;
  private _sincronizando = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-avatar">
        <span class="ui-avatar__content"></span>
      </div>
      <span class="ui-avatar__status" style="display: none;"></span>
    `;

    this.avatarElement = shadow.querySelector('.ui-avatar')!;
    this.statusElement = shadow.querySelector('.ui-avatar__status')!;
  }

  connectedCallback() {
    this.syncState();
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    if (this._sincronizando) return;
    this.syncState();
  }

  /** Iniciais por ponto de código (emoji e caracteres fora do BMP não são cortados ao meio). */
  private extrairIniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) {
      return Array.from(partes[0]).slice(0, 2).join('').toUpperCase();
    }
    const pri = Array.from(partes[0])[0];
    const ult = Array.from(partes[partes.length - 1])[0];
    return (pri + ult).toUpperCase();
  }

  private lerNome(): string {
    return this.getAttribute('nome') || this.getAttribute('name') || '';
  }

  /**
   * Nome acessível: com nome, o host é uma imagem nomeada ("Ana, online"); sem nome, é decorativo.
   * Um `aria-label`/`aria-hidden` definido pelo consumidor nunca é sobrescrito.
   */
  private sincronizarAcessibilidade(nome: string, status: string | null) {
    const rotuloAtual = this.getAttribute('aria-label');
    const rotuloDoConsumidor = rotuloAtual !== null && rotuloAtual !== this._rotuloAuto;
    const ocultoDoConsumidor = this.hasAttribute('aria-hidden') && !this._ocultoAuto;
    if (rotuloDoConsumidor || ocultoDoConsumidor) return;

    this._sincronizando = true;
    if (nome) {
      const rotulo = status ? `${nome}, ${status}` : nome;
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', rotulo);
      this._rotuloAuto = rotulo;
      this.removeAttribute('aria-hidden');
      this._ocultoAuto = false;
    } else {
      if (this._rotuloAuto !== null) this.removeAttribute('aria-label');
      this._rotuloAuto = null;
      this.removeAttribute('role');
      this.setAttribute('aria-hidden', 'true');
      this._ocultoAuto = true;
    }
    this._sincronizando = false;
  }

  private syncState() {
    const src = this.getAttribute('src');
    const nome = this.lerNome();
    const tamanhoBruto = (this.getAttribute('tamanho') || this.getAttribute('size') || 'md').trim().toLowerCase();
    const formato = this.getAttribute('formato');
    const status = escolherOpcaoOpcional(this.getAttribute('status'), STATUS);

    // Classes do avatar container
    this.avatarElement.className = 'ui-avatar';

    const nomeado = escolherOpcaoOpcional(tamanhoBruto, TAMANHOS);
    const numerico = parseInt(tamanhoBruto, 10);
    if (nomeado) {
      this.avatarElement.classList.add(`ui-avatar--${nomeado}`);
      this.avatarElement.style.removeProperty('--ui-tamanho-avatar');
    } else if (Number.isFinite(numerico) && numerico >= TAMANHO_MIN_PX && numerico <= TAMANHO_MAX_PX) {
      this.avatarElement.style.setProperty('--ui-tamanho-avatar', `${numerico}px`);
    } else {
      // inválido (negativo, zero, enorme, texto): usa o tamanho padrão
      this.avatarElement.classList.add(`ui-avatar--${escolherOpcao(null, TAMANHOS, 'md')}`);
      this.avatarElement.style.removeProperty('--ui-tamanho-avatar');
    }

    if (formato === 'quadrado') {
      this.avatarElement.classList.add('ui-avatar--quadrado');
    }

    // Renderização do Conteúdo (Foto vs Iniciais vs Ícone Fallback)
    const contentSlot = this.avatarElement.querySelector('.ui-avatar__content');
    if (contentSlot) {
      if (src) {
        const existingImg = contentSlot.querySelector('img');
        if (existingImg && existingImg.getAttribute('src') === src) {
          existingImg.alt = '';
        } else {
          contentSlot.textContent = '';
          const img = document.createElement('img');
          img.className = 'ui-avatar__img';
          img.src = src;
          // decorativa: o nome acessível está no host (role=img)
          img.alt = '';
          img.onerror = () => {
            this.renderFallback(contentSlot, this.lerNome());
          };
          contentSlot.appendChild(img);
        }
      } else {
        contentSlot.textContent = '';
        this.renderFallback(contentSlot, nome);
      }
    }

    this.sincronizarAcessibilidade(nome, status);

    // Indicador de Status (decorativo: o estado vai no nome acessível do host)
    if (status) {
      this.statusElement.className = `ui-avatar__status ui-avatar__status--${status}`;
      this.statusElement.style.display = 'block';
      this.statusElement.setAttribute('aria-hidden', 'true');
    } else {
      this.statusElement.style.display = 'none';
    }
  }

  private renderFallback(container: Element, nome: string) {
    if (nome) {
      container.textContent = this.extrairIniciais(nome);
    } else {
      // Ícone Fallback de Usuário SVG
      container.innerHTML = `
        <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      `;
    }
  }
}

definirCustomElement('ui-avatar', UIAvatar);
