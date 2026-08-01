import estilos from './ui-lista-flutuante.css?inline';

export interface ItemLista {
  id: string;
  label: string;
}

export class UIListaFlutuante extends HTMLElement {
  static get observedAttributes() {
    return ['aberta', 'texto-padrao', 'value', 'disabled', 'bottom-sheet', 'modo-mobile'];
  }

  private button: HTMLButtonElement;
  private content: HTMLUListElement;
  private textoElement: HTMLSpanElement;
  private backdropElement: HTMLDivElement;
  private _itens: ItemLista[] = [];
  private _value: string = '';

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-lista-flutuante__backdrop"></div>
      <button class="ui-lista-flutuante__gatilho" aria-haspopup="listbox" aria-expanded="false" type="button">
        <span class="ui-lista-flutuante__texto"></span>
        <span class="ui-lista-flutuante__seta">▼</span>
      </button>
      <ul class="ui-lista-flutuante__conteudo" role="listbox" popover="manual">
        <div class="ui-lista-flutuante__handle"></div>
      </ul>
    `;
    this.button = shadow.querySelector('.ui-lista-flutuante__gatilho')!;
    this.content = shadow.querySelector('.ui-lista-flutuante__conteudo')!;
    this.textoElement = shadow.querySelector('.ui-lista-flutuante__texto')!;
    this.backdropElement = shadow.querySelector('.ui-lista-flutuante__backdrop')!;
  }

  connectedCallback() {
    this.button.addEventListener('click', this.toggleLista);
    this.backdropElement.addEventListener('click', this.fechar);
    document.addEventListener('click', this.handleClickFora);
    this.carregarItensFilhos();
    this.syncState();
  }

  private carregarItensFilhos() {
    if (this._itens.length === 0) {
      const options = Array.from(this.querySelectorAll('option, ui-opcao, [value]'));
      if (options.length > 0) {
        this._itens = options.map((opt, idx) => ({
          id: opt.getAttribute('value') || String(idx + 1),
          label: opt.textContent?.trim() || opt.getAttribute('value') || `Opção ${idx + 1}`
        }));
        this.renderItens();
        this.syncLabel();
      }
    }
  }

  disconnectedCallback() {
    this.button.removeEventListener('click', this.toggleLista);
    this.backdropElement.removeEventListener('click', this.fechar);
    document.removeEventListener('click', this.handleClickFora);
    this.fechar();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'aberta') {
      this.button.setAttribute('aria-expanded', String(value !== null));
    }
    if (name === 'texto-padrao') {
      this.syncLabel();
    }
    if (name === 'value' && value !== this._value) {
      this.value = value || '';
    }
    if (name === 'disabled') {
      this.button.disabled = value !== null;
    }
  }

  get value(): string {
    return this._value;
  }

  set value(val: string) {
    this._value = val;
    this.setAttribute('value', val);
    this.syncLabel();
    this.updateSelectedState();
  }

  get itens(): ItemLista[] {
    return this._itens;
  }

  set itens(value: ItemLista[]) {
    this._itens = value || [];
    this.renderItens();
    this.syncLabel();
  }

  private toggleLista = (e: MouseEvent) => {
    e.stopPropagation();
    if (this.hasAttribute('disabled')) return;
    if (this.hasAttribute('aberta')) {
      this.fechar();
    } else {
      this.abrir();
    }
  };

  private abrir() {
    this.setAttribute('aberta', '');
    this.posicionarConteudo();
    window.addEventListener('scroll', this.fechar, { capture: true, passive: true });
    window.addEventListener('resize', this.posicionarConteudo, { passive: true });
    if (typeof (this.content as any).showPopover === 'function') {
      try {
        (this.content as any).showPopover();
      } catch (_e) {
        // Fallback
      }
    }
  }

  private fechar = () => {
    this.removeAttribute('aberta');
    window.removeEventListener('scroll', this.fechar, { capture: true });
    window.removeEventListener('resize', this.posicionarConteudo);
    if (typeof (this.content as any).hidePopover === 'function') {
      try {
        (this.content as any).hidePopover();
      } catch (_e) {
        // Fallback
      }
    }
  };

  private isMobileOrBottomSheet(): boolean {
    return window.innerWidth <= 640 || this.hasAttribute('bottom-sheet') || this.hasAttribute('modo-mobile');
  }

  private posicionarConteudo = () => {
    if (this.isMobileOrBottomSheet()) {
      this.content.style.top = '';
      this.content.style.left = '';
      this.content.style.minWidth = '';
      return;
    }

    const rect = this.button.getBoundingClientRect();
    this.content.style.top = `${rect.bottom + 2}px`;
    this.content.style.left = `${rect.left}px`;
    this.content.style.minWidth = `${Math.max(rect.width, 110)}px`;
  };

  private handleClickFora = (event: MouseEvent) => {
    const composedPath = event.composedPath();
    if (!composedPath.includes(this) && !composedPath.includes(this.content)) {
      this.fechar();
    }
  };

  private syncLabel() {
    const itemEncontrado = this._itens.find(i => String(i.id) === String(this._value));
    if (itemEncontrado) {
      this.textoElement.textContent = itemEncontrado.label;
    } else {
      const textoPadrao = this.getAttribute('texto-padrao') || 'Opções';
      this.textoElement.textContent = textoPadrao;
    }
  }

  private updateSelectedState() {
    const liElements = this.content.querySelectorAll('.ui-lista-flutuante__item');
    liElements.forEach(li => {
      const itemId = li.getAttribute('data-id');
      if (itemId === String(this._value)) {
        li.classList.add('ui-lista-flutuante__item--selecionado');
        li.setAttribute('aria-selected', 'true');
      } else {
        li.classList.remove('ui-lista-flutuante__item--selecionado');
        li.removeAttribute('aria-selected');
      }
    });
  }

  private renderItens() {
    this.content.innerHTML = '<div class="ui-lista-flutuante__handle"></div>';
    this._itens.forEach(item => {
      const li = document.createElement('li');
      const isSelected = String(item.id) === String(this._value);
      li.className = `ui-lista-flutuante__item ${isSelected ? 'ui-lista-flutuante__item--selecionado' : ''}`;
      li.setAttribute('data-id', item.id);
      li.textContent = item.label;
      li.role = 'option';
      if (isSelected) li.setAttribute('aria-selected', 'true');
      li.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        this.selecionarItem(item);
      });
      this.content.appendChild(li);
    });
  }

  private syncState() {
    if (this.hasAttribute('value')) {
      this._value = this.getAttribute('value') || '';
    }
    this.syncLabel();
  }

  private selecionarItem(item: ItemLista) {
    this._value = item.id;
    this.setAttribute('value', item.id);
    this.textoElement.textContent = item.label;
    this.fechar();
    this.updateSelectedState();

    this.dispatchEvent(
      new CustomEvent('ui-selecionar', {
        detail: item,
        bubbles: true,
        composed: true,
      })
    );

    this.dispatchEvent(
      new Event('change', {
        bubbles: true,
        composed: true,
      })
    );
  }
}

export class UISelect extends UIListaFlutuante {}

if (!customElements.get('ui-lista-flutuante')) {
  customElements.define('ui-lista-flutuante', UIListaFlutuante);
}

if (!customElements.get('ui-select')) {
  customElements.define('ui-select', UISelect);
}
