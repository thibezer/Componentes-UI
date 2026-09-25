import estilos from './ui-radio.css?inline';

export class UIRadio extends HTMLElement {
  static formAssociated = true;
  private internals: ReturnType<HTMLElement['attachInternals']>;

  // Registro estruturado com WeakMap para prevenir vazamentos de memória (Memory Leaks)
  static _registry = new WeakMap<Node, Map<string, Set<UIRadio>>>();

  static get observedAttributes() {
    return [
      'marcado',
      'checked',
      'name',
      'nome',
      'disabled',
      'value',
      'label',
      'posicao-label'
    ];
  }

  private containerElement: HTMLDivElement;
  private labelElement: HTMLSpanElement;
  private _defaultChecked: boolean = false;

  constructor() {
    super();
    this.internals = this.attachInternals();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${estilos}</style>
      <div class="ui-radio" tabindex="0" role="radio" aria-checked="false">
        <span class="ui-radio__circle">
          <span class="ui-radio__dot"></span>
        </span>
        <span class="ui-radio__label" style="display: none;"></span>
      </div>
    `;

    this.containerElement = shadow.querySelector('.ui-radio')!;
    this.labelElement = shadow.querySelector('.ui-radio__label')!;
  }

  connectedCallback() {
    this.containerElement.addEventListener('click', this.handleClick);
    this.containerElement.addEventListener('keydown', this.handleKeyDown);
    this.containerElement.addEventListener('focus', this.handleFocus);
    this.containerElement.addEventListener('blur', this.handleBlur);
    this._defaultChecked = this.hasAttribute('marcado') || this.hasAttribute('checked');
    this.register();
    this.syncState();
  }

  disconnectedCallback() {
    this.containerElement.removeEventListener('click', this.handleClick);
    this.containerElement.removeEventListener('keydown', this.handleKeyDown);
    this.containerElement.removeEventListener('focus', this.handleFocus);
    this.containerElement.removeEventListener('blur', this.handleBlur);
    this.unregister();
  }

  private getScopeNode(): Node {
    return this.closest('form') || this.getRootNode() || document;
  }

  private register() {
    const nome = this.name;
    if (nome) {
      const scope = this.getScopeNode();
      if (!UIRadio._registry.has(scope)) {
        UIRadio._registry.set(scope, new Map());
      }
      const scopeMap = UIRadio._registry.get(scope)!;
      if (!scopeMap.has(nome)) {
        scopeMap.set(nome, new Set());
      }
      scopeMap.get(nome)!.add(this);
    }
  }

  private unregister() {
    const nome = this.name;
    if (nome) {
      const scope = this.getScopeNode();
      const scopeMap = UIRadio._registry.get(scope);
      if (scopeMap && scopeMap.has(nome)) {
        const group = scopeMap.get(nome)!;
        group.delete(this);
        if (group.size === 0) {
          scopeMap.delete(nome);
        }
        if (scopeMap.size === 0) {
          UIRadio._registry.delete(scope);
        }
      }
    }
  }

  private getGroupRadios(): UIRadio[] {
    const nome = this.name;
    if (!nome) return [];
    const scope = this.getScopeNode();
    const scopeMap = UIRadio._registry.get(scope);
    if (!scopeMap || !scopeMap.has(nome)) return [];
    return Array.from(scopeMap.get(nome)!);
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null) {
    this.syncState();
  }

  get marcado(): boolean {
    return this.hasAttribute('marcado') || this.hasAttribute('checked');
  }

  set marcado(val: boolean) {
    if (val) {
      this.setAttribute('marcado', '');
    } else {
      this.removeAttribute('marcado');
      this.removeAttribute('checked');
    }
  }

  get name(): string {
    return this.getAttribute('name') || this.getAttribute('nome') || '';
  }

  set name(val: string) {
    this.unregister();
    this.setAttribute('name', val);
    this.register();
    this.syncState();
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(val: boolean) {
    if (val) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
    this.syncState();
  }

  public selecionar() {
    if (this.disabled || this.marcado) return;

    // Desmarcar todos os outros rádios no mesmo grupo e escopo
    const radiosDoGrupo = this.getGroupRadios();
    radiosDoGrupo.forEach(el => {
      if (el !== this) {
        el.removeAttribute('marcado');
        el.removeAttribute('checked');
        el.syncState();
      }
    });

    this.marcado = true;

    this.dispatchEvent(
      new CustomEvent('ui-change', {
        detail: {
          marcado: true,
          name: this.name,
          value: this.getAttribute('value') || ''
        },
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

  public syncState() {
    const isChecked = this.marcado;
    const isDisabled = this.disabled;
    const labelText = this.getAttribute('label');
    const posicaoLabel = this.getAttribute('posicao-label') || 'direita';

    // Acessibilidade
    this.containerElement.setAttribute('aria-checked', String(isChecked));

    if (isDisabled) {
      this.containerElement.classList.add('ui-radio--disabled');
      this.containerElement.setAttribute('tabindex', '-1');
      this.containerElement.setAttribute('aria-disabled', 'true');
    } else {
      this.containerElement.classList.remove('ui-radio--disabled');
      this.containerElement.removeAttribute('aria-disabled');

      // Roving tabindex: apenas 1 elemento tabulável por grupo
      const radios = this.getGroupRadios();
      if (radios.length > 0) {
        const hasChecked = radios.some(r => r.marcado);

        if (hasChecked) {
          this.containerElement.setAttribute('tabindex', isChecked ? '0' : '-1');
        } else {
          // Se nenhum estiver checado, o primeiro do registro fica com tabindex 0
          this.containerElement.setAttribute('tabindex', radios[0] === this ? '0' : '-1');
        }
      } else {
        this.containerElement.setAttribute('tabindex', '0');
      }
    }

    // Classes de estado
    if (isChecked) {
      this.containerElement.classList.add('ui-radio--checked');
    } else {
      this.containerElement.classList.remove('ui-radio--checked');
    }

    if (posicaoLabel === 'esquerda') {
      this.containerElement.classList.add('ui-radio--label-esquerda');
    } else {
      this.containerElement.classList.remove('ui-radio--label-esquerda');
    }

    // Rótulo
    if (labelText) {
      this.labelElement.textContent = labelText;
      this.labelElement.style.display = 'inline';
    } else {
      this.labelElement.style.display = 'none';
    }

    if (isChecked) {
      this.internals.setFormValue(this.getAttribute('value') || 'on');
    } else {
      this.internals.setFormValue(null);
    }
  }

  formResetCallback() {
    this.marcado = this._defaultChecked;
    if (this._defaultChecked) {
      this.internals.setFormValue(this.getAttribute('value') || 'on');
    } else {
      this.internals.setFormValue(null);
    }
    this.syncState();
  }

  private handleClick = (e: MouseEvent) => {
    e.preventDefault();
    this.selecionar();
    this.containerElement.focus();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.selecionar();
    } else if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      const radios = this.getGroupRadios();
      const enabledRadios = radios.filter(r => !r.disabled);
      if (enabledRadios.length <= 1) return;

      const currentIndex = enabledRadios.indexOf(this);
      let nextIndex = currentIndex;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % enabledRadios.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + enabledRadios.length) % enabledRadios.length;
      }

      if (nextIndex !== currentIndex && nextIndex >= 0 && nextIndex < enabledRadios.length) {
        const nextRadio = enabledRadios[nextIndex];
        nextRadio.selecionar();
        nextRadio.containerElement.focus();
      }
    }
  };

  private handleFocus = () => {
    this.containerElement.classList.add('ui-radio--foco');
  };

  private handleBlur = () => {
    this.containerElement.classList.remove('ui-radio--foco');
  };
}

if (!customElements.get('ui-radio')) {
  customElements.define('ui-radio', UIRadio);
}
