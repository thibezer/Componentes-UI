import estilos from './ui-avatar.css?inline';

export class UIAvatar extends HTMLElement {
  static get observedAttributes() {
    return [
      'src',
      'nome',
      'name',
      'tamanho',
      'size',
      'formato',
      'status'
    ];
  }

  private avatarElement: HTMLDivElement;
  private statusElement: HTMLSpanElement;

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
    this.syncState();
  }

  private extrairIniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) {
      return partes[0].substring(0, 2).toUpperCase();
    }
    const pri = partes[0][0];
    const ult = partes[partes.length - 1][0];
    return (pri + ult).toUpperCase();
  }

  private syncState() {
    const src = this.getAttribute('src');
    const nome = this.getAttribute('nome') || this.getAttribute('name') || '';
    const tamanho = this.getAttribute('tamanho') || this.getAttribute('size') || 'md';
    const formato = this.getAttribute('formato') || 'circulo';
    const status = this.getAttribute('status');

    // Classes do avatar container
    this.avatarElement.className = 'ui-avatar';

    if (['xs', 'sm', 'md', 'lg', 'xl'].includes(tamanho)) {
      this.avatarElement.classList.add(`ui-avatar--${tamanho}`);
    } else if (tamanho && !isNaN(parseInt(tamanho, 10))) {
      this.avatarElement.style.setProperty('--ui-tamanho-avatar', `${parseInt(tamanho, 10)}px`);
    }

    if (formato === 'quadrado') {
      this.avatarElement.classList.add('ui-avatar--quadrado');
    }

    // Renderização do Conteúdo (Foto vs Iniciais vs Ícone Fallback)
    const contentSlot = this.avatarElement.querySelector('.ui-avatar__content');
    if (contentSlot) {
      if (src) {
        contentSlot.innerHTML = `<img class="ui-avatar__img" src="${src}" alt="${nome || 'Avatar'}" />`;
        const img = contentSlot.querySelector('img');
        if (img) {
          img.onerror = () => {
            // Fallback se a imagem falhar ao carregar
            this.renderFallback(contentSlot, nome);
          };
        }
      } else {
        this.renderFallback(contentSlot, nome);
      }
    }

    // Indicador de Status
    if (status && ['online', 'offline', 'ausente', 'ocupado'].includes(status)) {
      this.statusElement.className = `ui-avatar__status ui-avatar__status--${status}`;
      this.statusElement.style.display = 'block';
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

if (!customElements.get('ui-avatar')) {
  customElements.define('ui-avatar', UIAvatar);
}
