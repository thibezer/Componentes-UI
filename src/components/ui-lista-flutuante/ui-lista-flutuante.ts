import estilos from './ui-lista-flutuante.css?inline';
import { ListenerBag } from '../../core/listener-bag';

export interface ItemLista {
  id: string;
  label: string;
}

export class UIListaFlutuante extends HTMLElement {
  static formAssociated = true;
  private internals: ReturnType<HTMLElement['attachInternals']>;

  static get observedAttributes() {
    return [
      'aberta',
      'texto-padrao',
      'value',
      'disabled',
      'bottom-sheet',
      'modo-mobile',
      'label',
      'rotulo',
      'placeholder',
      'tamanho',
      'size',
      'altura',
      'height',
      'densidade'
    ];
  }

  private labelElement: HTMLLabelElement;
  private button: HTMLButtonElement;
  private content: HTMLDivElement;
  private listElement: HTMLUListElement;
  private textoElement: HTMLSpanElement;
  private backdropElement: HTMLDivElement;
  private sheetTituloElement: HTMLSpanElement;
  private sheetCloseButton: HTMLButtonElement;
  private listeners = new ListenerBag();
  private _itens: ItemLista[] = [];
  private _value: string = '';
  private _defaultValue: string = '';
  private observer!: MutationObserver;
  private focusedIndex: number = -1;

  constructor() {
    super();
    this.internals = this.attachInternals();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-lista-flutuante__container">
        <label class="ui-lista-flutuante__label" style="display: none;"></label>
        <div class="ui-lista-flutuante__backdrop"></div>
        <button class="ui-lista-flutuante__gatilho" aria-haspopup="listbox" aria-expanded="false" type="button">
          <span class="ui-lista-flutuante__texto"></span>
          <span class="ui-lista-flutuante__seta">▼</span>
        </button>
        <div class="ui-lista-flutuante__conteudo" role="listbox" popover="manual">
          <div class="ui-lista-flutuante__sheet-header">
            <div class="ui-lista-flutuante__handle"></div>
            <div class="ui-lista-flutuante__sheet-title-bar">
              <span class="ui-lista-flutuante__sheet-titulo">Selecione uma opção</span>
              <button class="ui-lista-flutuante__sheet-close" type="button" aria-label="Fechar">✕</button>
            </div>
          </div>
          <ul class="ui-lista-flutuante__lista" style="margin: 0; padding: 0; list-style: none;"></ul>
        </div>
      </div>
    `;
    this.labelElement = shadow.querySelector('.ui-lista-flutuante__label')!;
    this.button = shadow.querySelector('.ui-lista-flutuante__gatilho')!;
    this.content = shadow.querySelector('.ui-lista-flutuante__conteudo')!;
    this.listElement = shadow.querySelector('.ui-lista-flutuante__lista')!;
    this.textoElement = shadow.querySelector('.ui-lista-flutuante__texto')!;
    this.backdropElement = shadow.querySelector('.ui-lista-flutuante__backdrop')!;
    this.sheetTituloElement = shadow.querySelector('.ui-lista-flutuante__sheet-titulo')!;
    this.sheetCloseButton = shadow.querySelector('.ui-lista-flutuante__sheet-close')!;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.button, 'click', this.toggleLista);
    this.listeners.add(this.button, 'keydown', this.handleKeyDown);
    this.listeners.add(this.content, 'keydown', this.handleListKeyDown);
    this.listeners.add(this.backdropElement, 'click', this.fechar);
    this.listeners.add(this.listElement, 'click', this.handleListClick);
    this.listeners.add(this.sheetCloseButton, 'click', (e: Event) => {
      e.stopPropagation();
      this.fechar();
    });
    this.listeners.add(document, 'click', this.handleClickFora);
    this._defaultValue = this.getAttribute('value') || '';
    this.carregarItensFilhos();
    this.syncState();

    this.observer = new MutationObserver(() => this.carregarItensFilhos());
    this.observer.observe(this, { childList: true, subtree: true });
  }

  public carregarItensFilhos() {
    const options = Array.from(this.querySelectorAll('option, ui-opcao, [role="option"], [data-opcao], [data-value]:not(input):not(select)'));
    if (options.length > 0) {
      this._itens = options.map((opt, idx) => {
        const idVal = opt.getAttribute('value') || opt.getAttribute('data-value') || String(idx + 1);
        return {
          id: idVal,
          label: opt.textContent?.trim() || idVal || `Opção ${idx + 1}`
        };
      });
      this.renderItens();
      this.syncLabel();
    }
  }

  disconnectedCallback() {
    this.listeners.cleanup();
    if (this.observer) {
      this.observer.disconnect();
    }
    this.fechar();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'aberta') {
      this.button.setAttribute('aria-expanded', String(value !== null));
    }
    if (name === 'texto-padrao' || name === 'placeholder' || name === 'label' || name === 'rotulo') {
      this.syncLabel();
    }
    if (name === 'value' && value !== this._value) {
      this.value = value || '';
    }
    if (name === 'disabled') {
      this.button.disabled = value !== null;
    }
    if (name === 'altura' || name === 'height') {
      if (value) {
        this.style.setProperty('--ui-campo-altura', isNaN(Number(value)) ? value : `${value}px`);
      } else {
        this.style.removeProperty('--ui-campo-altura');
      }
    }
  }

  get value(): string {
    return this._value;
  }

  set value(val: string) {
    this._value = val;
    this.setAttribute('value', val);
    this.internals.setFormValue(val);
    this.syncLabel();
    this.updateSelectedState();
  }

  get label(): string {
    return this.getAttribute('label') || this.getAttribute('rotulo') || '';
  }

  set label(val: string) {
    if (val) {
      this.setAttribute('label', val);
    } else {
      this.removeAttribute('label');
      this.removeAttribute('rotulo');
    }
    this.syncLabel();
  }

  formResetCallback() {
    this.value = this._defaultValue;
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

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.hasAttribute('disabled')) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this.hasAttribute('aberta')) {
        this.abrir();
      } else {
        this.focarPrimeiroItem();
      }
    }
  };

  private handleListKeyDown = (e: KeyboardEvent) => {
    if (!this.hasAttribute('aberta')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.moverFoco(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.moverFoco(-1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.focusedIndex >= 0 && this.focusedIndex < this._itens.length) {
        this.selecionarItem(this._itens[this.focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.fechar();
      this.button.focus();
    }
  };

  private focarPrimeiroItem() {
    const liElements = Array.from(this.listElement.querySelectorAll('.ui-lista-flutuante__item')) as HTMLLIElement[];
    if (liElements.length > 0) {
      this.focusedIndex = 0;
      liElements[0].focus();
    }
  }

  private moverFoco(direcao: number) {
    const liElements = Array.from(this.listElement.querySelectorAll('.ui-lista-flutuante__item')) as HTMLLIElement[];
    if (liElements.length === 0) return;

    this.focusedIndex += direcao;
    if (this.focusedIndex < 0) this.focusedIndex = liElements.length - 1;
    if (this.focusedIndex >= liElements.length) this.focusedIndex = 0;

    liElements[this.focusedIndex].focus();
  }

  public abrir() {
    if (this.hasAttribute('aberta')) return;
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

  public fechar = () => {
    if (!this.hasAttribute('aberta')) return;
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
    this.content.style.top = `${Math.round(rect.bottom + 2)}px`;
    this.content.style.left = `${Math.round(rect.left)}px`;
    this.content.style.minWidth = `${Math.round(Math.max(rect.width, 120))}px`;
  };

  private handleClickFora = (event: MouseEvent) => {
    if (!this.hasAttribute('aberta')) return;
    const composedPath = event.composedPath();
    if (!composedPath.includes(this) && !composedPath.includes(this.content)) {
      this.fechar();
    }
  };

  private syncLabel() {
    const labelAttr = this.getAttribute('label') || this.getAttribute('rotulo');
    if (labelAttr) {
      this.labelElement.textContent = labelAttr;
      this.labelElement.style.display = 'block';
      this.sheetTituloElement.textContent = labelAttr;
    } else {
      this.labelElement.style.display = 'none';
      const textoPadrao = this.getAttribute('texto-padrao') || this.getAttribute('placeholder') || 'Opções';
      this.sheetTituloElement.textContent = textoPadrao;
    }

    const itemEncontrado = this._itens.find((i) => String(i.id) === String(this._value));
    if (itemEncontrado) {
      this.textoElement.textContent = itemEncontrado.label;
    } else {
      const textoPadrao = this.getAttribute('texto-padrao') || this.getAttribute('placeholder') || 'Opções';
      this.textoElement.textContent = textoPadrao;
    }
  }

  private updateSelectedState() {
    const liElements = this.listElement.querySelectorAll('.ui-lista-flutuante__item');
    liElements.forEach((li) => {
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
    this.listElement.innerHTML = '';
    this._itens.forEach((item) => {
      const li = document.createElement('li');
      const isSelected = String(item.id) === String(this._value);
      li.className = `ui-lista-flutuante__item ${isSelected ? 'ui-lista-flutuante__item--selecionado' : ''}`;
      li.setAttribute('data-id', item.id);
      li.textContent = item.label;
      li.role = 'option';
      li.tabIndex = -1;
      if (isSelected) li.setAttribute('aria-selected', 'true');
      this.listElement.appendChild(li);
    });
  }

  private handleListClick = (e: MouseEvent) => {
    e.stopPropagation();
    const target = (e.target as HTMLElement)?.closest('li[data-id]');
    if (!target) return;
    const id = target.getAttribute('data-id');
    const item = this._itens.find((i) => String(i.id) === String(id));
    if (item) {
      this.selecionarItem(item);
    }
  };

  private syncState() {
    const altura = this.getAttribute('altura') || this.getAttribute('height');
    if (altura) {
      this.style.setProperty('--ui-campo-altura', isNaN(Number(altura)) ? altura : `${altura}px`);
    }
    if (this.hasAttribute('value')) {
      this._value = this.getAttribute('value') || '';
      this.internals.setFormValue(this._value);
    }
    this.syncLabel();
  }

  private selecionarItem(item: ItemLista) {
    this.value = item.id;
    this.fechar();

    this.dispatchEvent(
      new CustomEvent('ui-selecionar', {
        detail: item,
        bubbles: true,
        composed: true
      })
    );

    this.dispatchEvent(
      new Event('change', {
        bubbles: true,
        composed: true
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
