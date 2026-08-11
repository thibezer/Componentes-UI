var ma = Object.defineProperty;
var ga = (M, c, o) => c in M ? ma(M, c, { enumerable: !0, configurable: !0, writable: !0, value: o }) : M[c] = o;
var m = (M, c, o) => ga(M, typeof c != "symbol" ? c + "" : c, o);
const _a = ':host{display:inline-block;width:100%;height:100%;box-sizing:border-box}:host([inline]){width:auto;height:auto}.ui-botao-primario{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;height:100%;min-height:var(--ui-altura-minima, 20px);box-sizing:border-box;padding:0 clamp(6px,1.2vw,16px);border:1px solid transparent;border-radius:var(--ui-raio-borda, 6px);font-family:var(--ui-fonte-base, "Inter", sans-serif);font-size:clamp(11px,.8rem,14px);font-weight:600;line-height:1;cursor:pointer;transition:background-color .15s ease,border-color .15s ease,color .15s ease,filter .15s ease,transform .1s ease;text-align:center;-webkit-user-select:none;user-select:none}.ui-botao-primario,.ui-botao-primario--primary,.ui-botao-primario--primario{background:var(--ui-cor-primaria, #00E08A);color:var(--ui-cor-texto-sobre-primaria, #000000);border-color:transparent}.ui-botao-primario--primary:hover:not(:disabled),.ui-botao-primario--primario:hover:not(:disabled),.ui-botao-primario:hover:not(:disabled){filter:brightness(1.1)}.ui-botao-primario--destaque{background:var(--ui-cor-destaque, var(--ui-cor-primaria, #00E08A));color:var(--ui-cor-texto-sobre-primaria, #000000)}.ui-botao-primario--secondary,.ui-botao-primario--secundario{background:var(--ui-cor-botao-secundario-fundo, #1e1e24);color:var(--ui-cor-texto, #e1e1e6);border-color:var(--ui-cor-borda, rgba(255, 255, 255, .12))}.ui-botao-primario--secondary:hover:not(:disabled),.ui-botao-primario--secundario:hover:not(:disabled){background:var(--ui-cor-botao-secundario-hover, #2a2a34);border-color:#ffffff3d}.ui-botao-primario--ghost,.ui-botao-primario--terciario{background:transparent;color:var(--ui-cor-texto, #e1e1e6);border-color:transparent}.ui-botao-primario--ghost:hover:not(:disabled),.ui-botao-primario--terciario:hover:not(:disabled){background:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-botao-primario--destructive,.ui-botao-primario--destrutivo,.ui-botao-primario--erro{background:var(--ui-cor-botao-destrutivo-fundo, #ff4444);color:var(--ui-cor-botao-destrutivo-texto, #ffffff);border-color:transparent}.ui-botao-primario--destructive:hover:not(:disabled),.ui-botao-primario--destrutivo:hover:not(:disabled),.ui-botao-primario--erro:hover:not(:disabled){background:var(--ui-cor-botao-destrutivo-hover, #e03333)}.ui-botao-primario--icon-only,.ui-botao-primario--icone{padding:0;width:var(--ui-altura-minima, 20px);min-width:var(--ui-altura-minima, 20px);height:var(--ui-altura-minima, 20px);aspect-ratio:1;border-radius:var(--ui-raio-borda, 6px)}.ui-botao-primario--hover{filter:brightness(1.15)!important}.ui-botao-primario:active:not(:disabled),.ui-botao-primario--active{transform:scale(.97)!important;filter:brightness(.9)!important}.ui-botao-primario:disabled,.ui-botao-primario--disabled{opacity:.45;cursor:not-allowed;transform:none!important;filter:none!important}.ui-botao-primario--carregando,.ui-botao-primario--loading{cursor:wait;opacity:.85;pointer-events:none}.ui-botao-primario__spinner{width:1.1em;height:1.1em;animation:ui-spin .75s linear infinite;flex-shrink:0}@keyframes ui-spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}';
class No extends HTMLElement {
  constructor() {
    super();
    m(this, "button");
    m(this, "spinnerContainer");
    m(this, "handleClick", (o) => {
      if (this.hasAttribute("disabled") || this.carregando) {
        o.preventDefault(), o.stopPropagation();
        return;
      }
      if (this.dispatchEvent(new CustomEvent("ui-click", { detail: { originalEvent: o }, bubbles: !0, composed: !0 })), this.hasAttribute("tipo-submit") || this.getAttribute("type") === "submit") {
        const s = this.closest("form");
        s && s.requestSubmit();
      }
    });
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${_a}</style>
      <button class="ui-botao-primario" type="button">
        <span class="ui-botao-primario__spinner-container" style="display: none;">
          <svg class="ui-botao-primario__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2 a 10 10 0 0 1 10 10"></path>
          </svg>
        </span>
        <slot></slot>
      </button>
    `, this.button = o.querySelector("button"), this.spinnerContainer = o.querySelector(".ui-botao-primario__spinner-container");
  }
  static get observedAttributes() {
    return ["disabled", "variante", "carregando", "loading", "estado"];
  }
  connectedCallback() {
    this.button.addEventListener("click", this.handleClick), this.syncState();
  }
  disconnectedCallback() {
    this.button.removeEventListener("click", this.handleClick);
  }
  attributeChangedCallback(o, s, r) {
    this.syncState();
  }
  get carregando() {
    return this.hasAttribute("carregando") || this.hasAttribute("loading");
  }
  set carregando(o) {
    o ? this.setAttribute("carregando", "") : (this.removeAttribute("carregando"), this.removeAttribute("loading"));
  }
  syncState() {
    const o = this.carregando, s = this.hasAttribute("disabled") || o, r = this.getAttribute("variante") || "primario", d = this.getAttribute("estado");
    this.button.disabled = s, this.spinnerContainer.style.display = o ? "inline-flex" : "none";
    const h = ["ui-botao-primario", `ui-botao-primario--${r}`];
    s && !o && h.push("ui-botao-primario--disabled"), o && h.push("ui-botao-primario--carregando"), d && h.push(`ui-botao-primario--${d}`), this.button.className = h.join(" ");
  }
}
class va extends No {
}
customElements.get("ui-botao") || customElements.define("ui-botao", No);
customElements.get("ui-botao-primario") || customElements.define("ui-botao-primario", va);
const ba = ':host{display:inline-block;position:relative;width:100%;height:100%;box-sizing:border-box}.ui-lista-flutuante__gatilho{display:flex;align-items:center;justify-content:space-between;gap:4px;width:100%;height:100%;min-height:var(--ui-altura-minima, 15px);padding:0 clamp(4px,.8vw,8px);background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 6px);font-family:var(--ui-fonte-base, "Inter", sans-serif);font-size:clamp(11px,.8rem,14px);line-height:1;cursor:pointer;box-sizing:border-box;transition:border-color .15s ease,background-color .15s ease}.ui-lista-flutuante__gatilho:hover:not(:disabled){border-color:var(--ui-cor-primaria, #00E08A)}.ui-lista-flutuante__gatilho:disabled{opacity:.5;cursor:not-allowed}.ui-lista-flutuante__texto{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}.ui-lista-flutuante__seta{font-size:clamp(8px,.65rem,11px);transition:transform .2s ease;color:var(--ui-cor-texto-secundario, #888899);flex-shrink:0}:host([aberta]) .ui-lista-flutuante__seta{transform:rotate(180deg)}.ui-lista-flutuante__backdrop{display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background-color:#0009;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);z-index:9998;opacity:0;transition:opacity .2s ease}:host([aberta]) .ui-lista-flutuante__backdrop{display:block;opacity:1}.ui-lista-flutuante__conteudo{position:fixed;margin:0;padding:2px;list-style:none;background-color:var(--ui-cor-fundo-menu, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 6px);box-shadow:0 8px 24px #00000080;max-height:150px;overflow-y:auto;z-index:9999;box-sizing:border-box;inset:auto}.ui-lista-flutuante__handle{display:none;width:36px;height:4px;border-radius:2px;background-color:#ffffff40;margin:4px auto 10px}.ui-lista-flutuante__item{padding:4px 8px;font-family:var(--ui-fonte-base, "Inter", sans-serif);font-size:clamp(11px,.8rem,13px);line-height:1.2;color:var(--ui-cor-texto, #e1e1e6);border-radius:4px;cursor:pointer;transition:background-color .12s ease,color .12s ease}.ui-lista-flutuante__item:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-lista-flutuante__item--selecionado{background-color:#00e08a26;color:var(--ui-cor-primaria, #00E08A);font-weight:600}@media (max-width: 640px){.ui-lista-flutuante__conteudo{position:fixed!important;bottom:0!important;top:auto!important;left:0!important;width:100vw!important;max-width:100vw!important;min-width:100vw!important;max-height:60vh!important;border-radius:16px 16px 0 0!important;border-bottom:none!important;padding:10px 14px 24px!important;box-shadow:0 -8px 32px #000000b3!important;animation:ui-bottom-sheet-slide .25s cubic-bezier(.4,0,.2,1)}.ui-lista-flutuante__handle{display:block!important}.ui-lista-flutuante__item{padding:12px 16px!important;font-size:15px!important;margin-bottom:2px}}:host([bottom-sheet]) .ui-lista-flutuante__conteudo,:host([modo-mobile]) .ui-lista-flutuante__conteudo{position:fixed!important;bottom:0!important;top:auto!important;left:0!important;width:100vw!important;max-width:100vw!important;min-width:100vw!important;max-height:60vh!important;border-radius:16px 16px 0 0!important;border-bottom:none!important;padding:10px 14px 24px!important;box-shadow:0 -8px 32px #000000b3!important;animation:ui-bottom-sheet-slide .25s cubic-bezier(.4,0,.2,1)}:host([bottom-sheet]) .ui-lista-flutuante__handle,:host([modo-mobile]) .ui-lista-flutuante__handle{display:block!important}:host([bottom-sheet]) .ui-lista-flutuante__item,:host([modo-mobile]) .ui-lista-flutuante__item{padding:12px 16px!important;font-size:15px!important;margin-bottom:2px}@keyframes ui-bottom-sheet-slide{0%{transform:translateY(100%)}to{transform:translateY(0)}}';
class gi extends HTMLElement {
  constructor() {
    super();
    m(this, "internals");
    m(this, "button");
    m(this, "content");
    m(this, "textoElement");
    m(this, "backdropElement");
    m(this, "_itens", []);
    m(this, "_value", "");
    m(this, "observer");
    m(this, "focusedIndex", -1);
    m(this, "toggleLista", (o) => {
      o.stopPropagation(), !this.hasAttribute("disabled") && (this.hasAttribute("aberta") ? this.fechar() : this.abrir());
    });
    m(this, "handleKeyDown", (o) => {
      this.hasAttribute("disabled") || (o.key === "Enter" || o.key === " " || o.key === "ArrowDown") && (o.preventDefault(), this.hasAttribute("aberta") ? this.focarPrimeiroItem() : this.abrir());
    });
    m(this, "handleListKeyDown", (o) => {
      this.hasAttribute("aberta") && (o.key === "ArrowDown" ? (o.preventDefault(), this.moverFoco(1)) : o.key === "ArrowUp" ? (o.preventDefault(), this.moverFoco(-1)) : o.key === "Enter" || o.key === " " ? (o.preventDefault(), this.focusedIndex >= 0 && this.focusedIndex < this._itens.length && this.selecionarItem(this._itens[this.focusedIndex])) : o.key === "Escape" && (o.preventDefault(), this.fechar(), this.button.focus()));
    });
    m(this, "fechar", () => {
      if (this.removeAttribute("aberta"), window.removeEventListener("scroll", this.fechar, { capture: !0 }), window.removeEventListener("resize", this.posicionarConteudo), typeof this.content.hidePopover == "function")
        try {
          this.content.hidePopover();
        } catch {
        }
    });
    m(this, "posicionarConteudo", () => {
      if (this.isMobileOrBottomSheet()) {
        this.content.style.top = "", this.content.style.left = "", this.content.style.minWidth = "";
        return;
      }
      const o = this.button.getBoundingClientRect();
      this.content.style.top = `${o.bottom + 2}px`, this.content.style.left = `${o.left}px`, this.content.style.minWidth = `${Math.max(o.width, 110)}px`;
    });
    m(this, "handleClickFora", (o) => {
      const s = o.composedPath();
      !s.includes(this) && !s.includes(this.content) && this.fechar();
    });
    this.internals = this.attachInternals();
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${ba}</style>
      <div class="ui-lista-flutuante__backdrop"></div>
      <button class="ui-lista-flutuante__gatilho" aria-haspopup="listbox" aria-expanded="false" type="button">
        <span class="ui-lista-flutuante__texto"></span>
        <span class="ui-lista-flutuante__seta">▼</span>
      </button>
      <ul class="ui-lista-flutuante__conteudo" role="listbox" popover="manual">
        <div class="ui-lista-flutuante__handle"></div>
      </ul>
    `, this.button = o.querySelector(".ui-lista-flutuante__gatilho"), this.content = o.querySelector(".ui-lista-flutuante__conteudo"), this.textoElement = o.querySelector(".ui-lista-flutuante__texto"), this.backdropElement = o.querySelector(".ui-lista-flutuante__backdrop");
  }
  static get observedAttributes() {
    return ["aberta", "texto-padrao", "value", "disabled", "bottom-sheet", "modo-mobile"];
  }
  connectedCallback() {
    this.button.addEventListener("click", this.toggleLista), this.button.addEventListener("keydown", this.handleKeyDown), this.content.addEventListener("keydown", this.handleListKeyDown), this.backdropElement.addEventListener("click", this.fechar), document.addEventListener("click", this.handleClickFora), this.carregarItensFilhos(), this.syncState(), this.observer = new MutationObserver(() => this.carregarItensFilhos()), this.observer.observe(this, { childList: !0, subtree: !0 });
  }
  carregarItensFilhos() {
    const o = Array.from(this.querySelectorAll("option, ui-opcao, [value]"));
    o.length > 0 && (this._itens = o.map((s, r) => {
      var d;
      return {
        id: s.getAttribute("value") || String(r + 1),
        label: ((d = s.textContent) == null ? void 0 : d.trim()) || s.getAttribute("value") || `Opção ${r + 1}`
      };
    }), this.renderItens(), this.syncLabel());
  }
  disconnectedCallback() {
    this.button.removeEventListener("click", this.toggleLista), this.button.removeEventListener("keydown", this.handleKeyDown), this.content.removeEventListener("keydown", this.handleListKeyDown), this.backdropElement.removeEventListener("click", this.fechar), document.removeEventListener("click", this.handleClickFora), this.observer && this.observer.disconnect(), this.fechar();
  }
  attributeChangedCallback(o, s, r) {
    o === "aberta" && this.button.setAttribute("aria-expanded", String(r !== null)), o === "texto-padrao" && this.syncLabel(), o === "value" && r !== this._value && (this.value = r || ""), o === "disabled" && (this.button.disabled = r !== null);
  }
  get value() {
    return this._value;
  }
  set value(o) {
    this._value = o, this.setAttribute("value", o), this.internals.setFormValue(o), this.syncLabel(), this.updateSelectedState();
  }
  formResetCallback() {
    this.value = this.getAttribute("value") || "";
  }
  get itens() {
    return this._itens;
  }
  set itens(o) {
    this._itens = o || [], this.renderItens(), this.syncLabel();
  }
  focarPrimeiroItem() {
    const o = Array.from(this.content.querySelectorAll(".ui-lista-flutuante__item"));
    o.length > 0 && (this.focusedIndex = 0, o[0].focus());
  }
  moverFoco(o) {
    const s = Array.from(this.content.querySelectorAll(".ui-lista-flutuante__item"));
    s.length !== 0 && (this.focusedIndex += o, this.focusedIndex < 0 && (this.focusedIndex = s.length - 1), this.focusedIndex >= s.length && (this.focusedIndex = 0), s[this.focusedIndex].focus());
  }
  abrir() {
    if (this.setAttribute("aberta", ""), this.posicionarConteudo(), window.addEventListener("scroll", this.fechar, { capture: !0, passive: !0 }), window.addEventListener("resize", this.posicionarConteudo, { passive: !0 }), typeof this.content.showPopover == "function")
      try {
        this.content.showPopover();
      } catch {
      }
  }
  isMobileOrBottomSheet() {
    return window.innerWidth <= 640 || this.hasAttribute("bottom-sheet") || this.hasAttribute("modo-mobile");
  }
  syncLabel() {
    const o = this._itens.find((s) => String(s.id) === String(this._value));
    if (o)
      this.textoElement.textContent = o.label;
    else {
      const s = this.getAttribute("texto-padrao") || "Opções";
      this.textoElement.textContent = s;
    }
  }
  updateSelectedState() {
    this.content.querySelectorAll(".ui-lista-flutuante__item").forEach((s) => {
      s.getAttribute("data-id") === String(this._value) ? (s.classList.add("ui-lista-flutuante__item--selecionado"), s.setAttribute("aria-selected", "true")) : (s.classList.remove("ui-lista-flutuante__item--selecionado"), s.removeAttribute("aria-selected"));
    });
  }
  renderItens() {
    this.content.innerHTML = '<div class="ui-lista-flutuante__handle"></div>', this._itens.forEach((o) => {
      const s = document.createElement("li"), r = String(o.id) === String(this._value);
      s.className = `ui-lista-flutuante__item ${r ? "ui-lista-flutuante__item--selecionado" : ""}`, s.setAttribute("data-id", o.id), s.textContent = o.label, s.role = "option", s.tabIndex = -1, r && s.setAttribute("aria-selected", "true"), s.addEventListener("click", (d) => {
        d.stopPropagation(), this.selecionarItem(o);
      }), this.content.appendChild(s);
    });
  }
  syncState() {
    this.hasAttribute("value") && (this._value = this.getAttribute("value") || "", this.internals.setFormValue(this._value)), this.syncLabel();
  }
  selecionarItem(o) {
    this.value = o.id, this.fechar(), this.dispatchEvent(
      new CustomEvent("ui-selecionar", {
        detail: o,
        bubbles: !0,
        composed: !0
      })
    ), this.dispatchEvent(
      new Event("change", {
        bubbles: !0,
        composed: !0
      })
    );
  }
}
m(gi, "formAssociated", !0);
class xa extends gi {
}
customElements.get("ui-lista-flutuante") || customElements.define("ui-lista-flutuante", gi);
customElements.get("ui-select") || customElements.define("ui-select", xa);
const ya = ':host{display:block;box-sizing:border-box;margin:0;padding:0;color:var(--ui-cor-texto, #e1e1e6);font-family:var(--ui-fonte-base, "Inter", sans-serif)}:host([inline]){display:inline-block}.ui-texto{margin:0;padding:0;box-sizing:border-box;font-family:inherit;color:inherit;font-size:inherit;font-weight:inherit;line-height:inherit}.ui-texto--h1{font-size:var(--ui-tamanho-h1, clamp(24px, 4vw, 36px));font-weight:var(--ui-peso-negrito, 700);line-height:var(--ui-altura-linha-titulo, 1.25);letter-spacing:-.5px}.ui-texto--h2{font-size:var(--ui-tamanho-h2, clamp(20px, 3vw, 28px));font-weight:var(--ui-peso-seminegrito, 600);line-height:var(--ui-altura-linha-titulo, 1.25);letter-spacing:-.3px}.ui-texto--h3{font-size:var(--ui-tamanho-h3, clamp(18px, 2.4vw, 24px));font-weight:var(--ui-peso-seminegrito, 600);line-height:var(--ui-altura-linha-titulo, 1.25)}.ui-texto--h4{font-size:var(--ui-tamanho-h4, clamp(16px, 2vw, 20px));font-weight:var(--ui-peso-medio, 500);line-height:var(--ui-altura-linha-titulo, 1.25)}.ui-texto--h5{font-size:var(--ui-tamanho-h5, clamp(14px, 1.6vw, 18px));font-weight:var(--ui-peso-medio, 500);line-height:var(--ui-altura-linha-titulo, 1.25)}.ui-texto--h6{font-size:var(--ui-tamanho-h6, clamp(13px, 1.2vw, 16px));font-weight:var(--ui-peso-seminegrito, 600);line-height:var(--ui-altura-linha-titulo, 1.25);text-transform:uppercase;letter-spacing:.5px}.ui-texto--corpo{font-size:var(--ui-tamanho-corpo, 14px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-corpo, 1.5)}.ui-texto--corpo-sm{font-size:var(--ui-tamanho-corpo-sm, 13px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-corpo, 1.5)}.ui-texto--caption{font-size:var(--ui-tamanho-caption, 11px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-compacta, 1.2);color:var(--ui-cor-texto-secundario, #888899)}.ui-texto--codigo{font-family:var(--ui-fonte-codigo, monospace);font-size:var(--ui-tamanho-codigo, 12px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-corpo, 1.5);background:var(--ui-cor-fundo-elevado, #1a1a1e);padding:2px 6px;border-radius:4px;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12))}.ui-texto--cor-primaria{color:var(--ui-cor-primaria, #00E08A)}.ui-texto--cor-secundaria{color:var(--ui-cor-texto-secundario, #888899)}.ui-texto--cor-destaque{color:var(--ui-cor-destaque, #00E08A)}.ui-texto--cor-erro{color:var(--ui-cor-texto-erro, #ff5555)}.ui-texto--cor-sucesso{color:var(--ui-cor-texto-sucesso, #00E08A)}.ui-texto--cor-alerta{color:var(--ui-cor-texto-alerta, #ffb86c)}.ui-texto--peso-normal{font-weight:var(--ui-peso-normal, 400)!important}.ui-texto--peso-medio{font-weight:var(--ui-peso-medio, 500)!important}.ui-texto--peso-seminegrito{font-weight:var(--ui-peso-seminegrito, 600)!important}.ui-texto--peso-negrito{font-weight:var(--ui-peso-negrito, 700)!important}.ui-texto--alinhamento-esquerda{text-align:left}.ui-texto--alinhamento-centro{text-align:center}.ui-texto--alinhamento-direita{text-align:right}.ui-texto--alinhamento-justificado{text-align:justify}.ui-texto--truncar{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}';
class wa extends HTMLElement {
  constructor() {
    super();
    m(this, "container");
    m(this, "shadow");
    this.shadow = this.attachShadow({ mode: "open" }), this.container = document.createElement("p"), this.container.className = "ui-texto ui-texto--corpo", this.container.appendChild(document.createElement("slot")), this.shadow.innerHTML = `<style>${ya}</style>`, this.shadow.appendChild(this.container);
  }
  static get observedAttributes() {
    return ["variante", "tag", "cor", "peso", "alinhamento", "truncar"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback(o, s, r) {
    this.render();
  }
  resolveTag() {
    const o = this.getAttribute("tag");
    if (o)
      return o.toLowerCase();
    const s = (this.getAttribute("variante") || "corpo").toLowerCase();
    switch (s) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return s;
      case "caption":
        return "small";
      case "codigo":
        return "code";
      case "corpo-sm":
      case "corpo":
      default:
        return "p";
    }
  }
  render() {
    const o = this.resolveTag(), s = this.getAttribute("variante") || "corpo", r = this.getAttribute("cor"), d = this.getAttribute("peso"), h = this.getAttribute("alinhamento"), p = this.hasAttribute("truncar");
    if (this.container.tagName.toLowerCase() !== o) {
      const b = document.createElement(o);
      b.appendChild(document.createElement("slot")), this.shadow.replaceChild(b, this.container), this.container = b;
    }
    const f = ["ui-texto", `ui-texto--${s}`];
    r && f.push(`ui-texto--cor-${r}`), d && f.push(`ui-texto--peso-${d}`), h && f.push(`ui-texto--alinhamento-${h}`), p && f.push("ui-texto--truncar"), this.container.className = f.join(" ");
  }
}
customElements.get("ui-texto") || customElements.define("ui-texto", wa);
const ka = ':host{display:flex;flex-direction:column;gap:4px;width:100%;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-campo-texto__container{position:relative;width:100%;display:flex;flex-direction:column}:host([label-flutuante]) .ui-campo-texto__container{margin-top:10px}.ui-campo-texto__label{display:flex;align-items:center;justify-content:space-between;font-size:var(--ui-tamanho-corpo-sm, 13px);font-weight:var(--ui-peso-medio, 500);color:var(--ui-cor-texto, #e1e1e6);-webkit-user-select:none;user-select:none;margin-bottom:4px}.ui-campo-texto__wrapper{position:relative;display:flex;align-items:center;width:100%;min-height:var(--ui-altura-minima, 15px);background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 6px);padding:0 6px;gap:6px;box-sizing:border-box;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease}.ui-campo-texto__wrapper--foco{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a2e;background-color:var(--ui-cor-fundo-menu, #18181c)}.ui-campo-texto__wrapper--erro{border-color:var(--ui-cor-texto-erro, #ff5555)!important;box-shadow:0 0 0 2px #ff55552e!important}.ui-campo-texto__wrapper--disabled{opacity:.5;cursor:not-allowed;background-color:#ffffff08}.ui-campo-texto__input{flex:1;width:100%;height:100%;min-height:0;background:transparent;border:none;outline:none;color:var(--ui-cor-texto, #e1e1e6);font-family:inherit;font-size:clamp(11px,.8rem,14px);line-height:1;padding:0;margin:0;box-sizing:border-box}.ui-campo-texto__input::placeholder{color:var(--ui-cor-texto-secundario, #888899);opacity:.65}.ui-campo-texto__input:disabled{cursor:not-allowed}.ui-campo-texto__icone{display:inline-flex;align-items:center;justify-content:center;color:var(--ui-cor-texto-secundario, #888899);flex-shrink:0;font-size:14px}.ui-campo-texto__icone--clicavel{cursor:pointer;-webkit-user-select:none;user-select:none;transition:opacity .15s ease,transform .15s ease}.ui-campo-texto__icone--clicavel:hover{opacity:.85;transform:scale(1.1)}:host([label-flutuante]) .ui-campo-texto__label{position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--ui-cor-texto-secundario, #888899);pointer-events:none;z-index:3;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);padding:0 4px;border-radius:3px;margin-bottom:0;white-space:nowrap;max-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis;transition:top .15s cubic-bezier(.4,0,.2,1),transform .15s cubic-bezier(.4,0,.2,1),color .15s ease,font-size .15s ease}:host([label-flutuante][tem-icone-esquerda]) .ui-campo-texto__label{left:28px}:host([label-flutuante]) .ui-campo-texto__label--ativa{top:-10px;left:8px!important;transform:translateY(0) scale(.85);transform-origin:left top;font-weight:600;color:var(--ui-cor-primaria, #00E08A);background-color:var(--ui-cor-fundo-elevado, #1a1a1e)}:host([label-flutuante][erro]) .ui-campo-texto__label--ativa,:host([label-flutuante][mensagem-erro]) .ui-campo-texto__label--ativa{color:var(--ui-cor-texto-erro, #ff5555)}.ui-campo-texto__helper{font-size:var(--ui-tamanho-caption, 11px);color:var(--ui-cor-texto-secundario, #888899);line-height:var(--ui-altura-linha-compacta, 1.2);margin-top:2px}.ui-campo-texto__helper--erro{color:var(--ui-cor-texto-erro, #ff5555);font-weight:500;display:flex;align-items:center;gap:4px}';
class Zo extends HTMLElement {
  constructor() {
    super();
    m(this, "internals");
    m(this, "labelElement");
    m(this, "wrapperElement");
    m(this, "inputElement");
    m(this, "helperElement");
    m(this, "rightIconContainer");
    m(this, "leftSlotElement");
    m(this, "_senhaVisivel", !1);
    m(this, "_checkTimer", null);
    m(this, "_focado", !1);
    m(this, "_inputId");
    m(this, "handleSlotChange", () => {
      this.syncState();
    });
    m(this, "handleRightIconClick", (o) => {
      (this.getAttribute("tipo") === "password" || this.hasAttribute("alternar-senha")) && (o.stopPropagation(), this.alternarVisibilidadeSenha());
    });
    m(this, "handleFocus", () => {
      this._focado = !0, this.wrapperElement.classList.add("ui-campo-texto__wrapper--foco"), this.syncState();
    });
    m(this, "handleBlur", () => {
      this._focado = !1, this.wrapperElement.classList.remove("ui-campo-texto__wrapper--foco"), this.syncState();
    });
    m(this, "handleInput", (o) => {
      const s = o.target.value;
      this.internals.setFormValue(s), this.syncState(), this.dispatchEvent(
        new CustomEvent("ui-input", {
          detail: { value: s },
          bubbles: !0,
          composed: !0
        })
      );
    });
    m(this, "handleChange", (o) => {
      const s = o.target.value;
      this.internals.setFormValue(s), this.dispatchEvent(
        new CustomEvent("ui-change", {
          detail: { value: s },
          bubbles: !0,
          composed: !0
        })
      );
    });
    this.internals = this.attachInternals();
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${ka}</style>
      <div class="ui-campo-texto__container">
        <label class="ui-campo-texto__label" style="display: none;"></label>
        <div class="ui-campo-texto__wrapper">
          <span class="ui-campo-texto__icone ui-campo-texto__icone--esquerda">
            <slot name="icone-esquerda"></slot>
          </span>
          <input class="ui-campo-texto__input" type="text" />
          <span class="ui-campo-texto__icone ui-campo-texto__icone--direita">
            <slot name="icone-direita"></slot>
          </span>
        </div>
      </div>
      <div class="ui-campo-texto__helper" style="display: none;"></div>
    `, this.labelElement = o.querySelector(".ui-campo-texto__label"), this.wrapperElement = o.querySelector(".ui-campo-texto__wrapper"), this.inputElement = o.querySelector(".ui-campo-texto__input"), this.helperElement = o.querySelector(".ui-campo-texto__helper"), this.rightIconContainer = o.querySelector(".ui-campo-texto__icone--direita"), this.leftSlotElement = o.querySelector('slot[name="icone-esquerda"]'), this._inputId = `ui-input-${Math.random().toString(36).substring(2, 9)}`, this.inputElement.id = this._inputId, this.labelElement.htmlFor = this._inputId;
  }
  static get observedAttributes() {
    return [
      "label",
      "placeholder",
      "value",
      "tipo",
      "helper-text",
      "erro",
      "mensagem-erro",
      "disabled",
      "readonly",
      "label-flutuante",
      "alternar-senha"
    ];
  }
  connectedCallback() {
    this.inputElement.addEventListener("input", this.handleInput), this.inputElement.addEventListener("change", this.handleChange), this.inputElement.addEventListener("focus", this.handleFocus), this.inputElement.addEventListener("blur", this.handleBlur), this.inputElement.addEventListener("keyup", this.handleInput), this.rightIconContainer.addEventListener("click", this.handleRightIconClick), this.leftSlotElement.addEventListener("slotchange", this.handleSlotChange), this.hasAttribute("value") && !this.inputElement.value && (this.inputElement.value = this.getAttribute("value") || ""), this.syncState(), this._checkTimer = setTimeout(() => this.syncState(), 100);
  }
  disconnectedCallback() {
    this.inputElement.removeEventListener("input", this.handleInput), this.inputElement.removeEventListener("change", this.handleChange), this.inputElement.removeEventListener("focus", this.handleFocus), this.inputElement.removeEventListener("blur", this.handleBlur), this.inputElement.removeEventListener("keyup", this.handleInput), this.rightIconContainer.removeEventListener("click", this.handleRightIconClick), this.leftSlotElement.removeEventListener("slotchange", this.handleSlotChange), this._checkTimer && clearTimeout(this._checkTimer);
  }
  attributeChangedCallback(o, s, r) {
    const d = this._focado;
    o === "value" && r !== this.inputElement.value && !d && (this.inputElement.value = r || ""), this.syncState();
  }
  get value() {
    return this.inputElement.value;
  }
  set value(o) {
    this.inputElement.value = o, this.setAttribute("value", o), this.syncState();
  }
  alternarVisibilidadeSenha() {
    var r;
    if (!(this.getAttribute("tipo") === "password" || this._senhaVisivel)) return;
    this._senhaVisivel = !this._senhaVisivel, this.inputElement.type = this._senhaVisivel ? "text" : "password";
    const s = (r = this.shadowRoot) == null ? void 0 : r.querySelector('slot[name="icone-direita"]');
    s && s.assignedElements().forEach((h) => {
      var p, f;
      (((p = h.textContent) == null ? void 0 : p.trim()) === "👁️" || ((f = h.textContent) == null ? void 0 : f.trim()) === "🙈") && (h.textContent = this._senhaVisivel ? "🙈" : "👁️");
    }), this.dispatchEvent(
      new CustomEvent("ui-toggle-senha", {
        detail: { visivel: this._senhaVisivel },
        bubbles: !0,
        composed: !0
      })
    );
  }
  syncState() {
    this.leftSlotElement.assignedNodes().length > 0 || this.querySelector('[slot="icone-esquerda"]') !== null ? this.setAttribute("tem-icone-esquerda", "") : this.removeAttribute("tem-icone-esquerda");
    const s = this.getAttribute("label"), r = this.hasAttribute("label-flutuante"), d = this.inputElement.value.trim() !== "", h = this._focado, p = (() => {
      try {
        return this.inputElement.matches(":-webkit-autofill");
      } catch {
        return !1;
      }
    })();
    s ? (this.labelElement.textContent = s, this.labelElement.style.display = "flex", r ? h || d || p ? this.labelElement.classList.add("ui-campo-texto__label--ativa") : this.labelElement.classList.remove("ui-campo-texto__label--ativa") : this.labelElement.classList.remove("ui-campo-texto__label--ativa")) : this.labelElement.style.display = "none";
    const f = this.getAttribute("placeholder") || "";
    r && !h && !d && !p ? this.inputElement.placeholder = "" : this.inputElement.placeholder = f;
    const b = this.getAttribute("tipo") || "text";
    this._senhaVisivel || (this.inputElement.type = b), this.internals.setFormValue(this.inputElement.value);
    const y = this.hasAttribute("disabled"), v = this.hasAttribute("readonly");
    this.inputElement.disabled = y, this.inputElement.readOnly = v, y ? this.wrapperElement.classList.add("ui-campo-texto__wrapper--disabled") : this.wrapperElement.classList.remove("ui-campo-texto__wrapper--disabled"), b === "password" || this.hasAttribute("alternar-senha") ? this.rightIconContainer.classList.add("ui-campo-texto__icone--clicavel") : this.rightIconContainer.classList.remove("ui-campo-texto__icone--clicavel");
    const E = this.hasAttribute("erro") || this.hasAttribute("mensagem-erro"), z = this.getAttribute("mensagem-erro"), C = this.getAttribute("helper-text");
    E ? this.wrapperElement.classList.add("ui-campo-texto__wrapper--erro") : this.wrapperElement.classList.remove("ui-campo-texto__wrapper--erro"), E && z ? (this.helperElement.textContent = `⚠️ ${z}`, this.helperElement.className = "ui-campo-texto__helper ui-campo-texto__helper--erro", this.helperElement.style.display = "block") : C ? (this.helperElement.textContent = C, this.helperElement.className = "ui-campo-texto__helper", this.helperElement.style.display = "block") : this.helperElement.style.display = "none";
  }
  formResetCallback() {
    this.inputElement.value = "", this.removeAttribute("value"), this.syncState();
  }
}
m(Zo, "formAssociated", !0);
customElements.get("ui-campo-texto") || customElements.define("ui-campo-texto", Zo);
const Ea = ':host{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;line-height:1;color:inherit;flex-shrink:0;width:var(--ui-tamanho-icone, 20px);height:var(--ui-tamanho-icone, 20px);box-sizing:border-box}.ui-icone{display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;color:inherit;font-size:var(--ui-tamanho-icone, 20px)}::slotted(svg),.ui-icone svg{width:100%!important;height:100%!important;display:block}:host([cor="primaria"]),:host([color="primaria"]){color:var(--ui-cor-primaria, #00E08A)}:host([cor="secundaria"]),:host([color="secundaria"]){color:var(--ui-cor-texto-secundario, #888899)}:host([cor="erro"]),:host([color="erro"]){color:var(--ui-cor-texto-erro, #ff5555)}:host([cor="sucesso"]),:host([color="sucesso"]){color:var(--ui-cor-texto-sucesso, #00E08A)}:host([cor="alerta"]),:host([color="alerta"]){color:var(--ui-cor-texto-alerta, #ffb86c)}', Io = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
};
class La extends HTMLElement {
  constructor() {
    super();
    m(this, "iconContainer");
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Ea}</style>
      <span class="ui-icone">
        <slot></slot>
      </span>
    `, this.iconContainer = o.querySelector(".ui-icone");
  }
  static get observedAttributes() {
    return ["tamanho", "size", "cor", "color", "nome", "name"];
  }
  connectedCallback() {
    this.syncState();
  }
  attributeChangedCallback(o, s, r) {
    this.syncState();
  }
  resolveTamanhoPx() {
    const o = this.getAttribute("tamanho") || this.getAttribute("size") || "md";
    switch (o.toLowerCase()) {
      case "sm":
        return "16px";
      case "md":
        return "20px";
      case "lg":
        return "24px";
      case "xl":
        return "32px";
      default:
        return isNaN(Number(o)) ? o : `${o}px`;
    }
  }
  syncState() {
    var r;
    const o = this.resolveTamanhoPx();
    this.style.setProperty("--ui-tamanho-icone", o);
    const s = this.getAttribute("nome") || this.getAttribute("name");
    if (s && Io[s]) {
      const d = (r = this.shadowRoot) == null ? void 0 : r.querySelector("slot");
      d && d.assignedNodes().length === 0 && (this.iconContainer.innerHTML = Io[s]);
    }
  }
}
customElements.get("ui-icone") || customElements.define("ui-icone", La);
const Pa = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-checkbox{display:inline-flex;align-items:center;gap:8px;cursor:pointer;-webkit-user-select:none;user-select:none;line-height:1;outline:none}.ui-checkbox--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-checkbox__box{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;min-width:16px;min-height:16px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:4px;box-sizing:border-box;transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease;flex-shrink:0}.ui-checkbox:focus-visible .ui-checkbox__box,.ui-checkbox--foco .ui-checkbox__box{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a40}.ui-checkbox--checked .ui-checkbox__box,.ui-checkbox--indeterminate .ui-checkbox__box{background-color:var(--ui-cor-primaria, #00E08A);border-color:var(--ui-cor-primaria, #00E08A);color:var(--ui-cor-texto-sobre-primaria, #000000)}.ui-checkbox__mark{width:12px;height:12px;display:flex;align-items:center;justify-content:center;transition:transform .15s cubic-bezier(.4,0,.2,1),opacity .15s ease;transform:scale(0);opacity:0}.ui-checkbox--checked .ui-checkbox__mark,.ui-checkbox--indeterminate .ui-checkbox__mark{transform:scale(1);opacity:1}.ui-checkbox__mark svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.ui-checkbox__label{font-size:clamp(11px,.8rem,14px);color:var(--ui-cor-texto, #e1e1e6);line-height:1}.ui-checkbox--label-esquerda{flex-direction:row-reverse}';
class Ro extends HTMLElement {
  constructor() {
    super();
    m(this, "internals");
    m(this, "containerElement");
    m(this, "markElement");
    m(this, "labelElement");
    m(this, "handleClick", (o) => {
      o.preventDefault(), this.alternar();
    });
    m(this, "handleKeyDown", (o) => {
      (o.key === " " || o.key === "Enter") && (o.preventDefault(), this.alternar());
    });
    m(this, "handleFocus", () => {
      this.containerElement.classList.add("ui-checkbox--foco");
    });
    m(this, "handleBlur", () => {
      this.containerElement.classList.remove("ui-checkbox--foco");
    });
    this.internals = this.attachInternals();
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Pa}</style>
      <div class="ui-checkbox" tabindex="0" role="checkbox" aria-checked="false">
        <span class="ui-checkbox__box">
          <span class="ui-checkbox__mark"></span>
        </span>
        <span class="ui-checkbox__label" style="display: none;"></span>
      </div>
    `, this.containerElement = o.querySelector(".ui-checkbox"), this.markElement = o.querySelector(".ui-checkbox__mark"), this.labelElement = o.querySelector(".ui-checkbox__label");
  }
  static get observedAttributes() {
    return [
      "marcado",
      "checked",
      "indeterminado",
      "indeterminate",
      "disabled",
      "value",
      "label",
      "posicao-label",
      "name"
    ];
  }
  connectedCallback() {
    this.containerElement.addEventListener("click", this.handleClick), this.containerElement.addEventListener("keydown", this.handleKeyDown), this.containerElement.addEventListener("focus", this.handleFocus), this.containerElement.addEventListener("blur", this.handleBlur), this.syncState();
  }
  disconnectedCallback() {
    this.containerElement.removeEventListener("click", this.handleClick), this.containerElement.removeEventListener("keydown", this.handleKeyDown), this.containerElement.removeEventListener("focus", this.handleFocus), this.containerElement.removeEventListener("blur", this.handleBlur);
  }
  attributeChangedCallback(o, s, r) {
    this.syncState();
  }
  get marcado() {
    return this.hasAttribute("marcado") || this.hasAttribute("checked");
  }
  set marcado(o) {
    o ? this.setAttribute("marcado", "") : (this.removeAttribute("marcado"), this.removeAttribute("checked")), this.syncState();
  }
  get checked() {
    return this.marcado;
  }
  set checked(o) {
    this.marcado = o;
  }
  get value() {
    return this.getAttribute("value") || "on";
  }
  set value(o) {
    this.setAttribute("value", o), this.syncState();
  }
  get name() {
    return this.getAttribute("name") || "";
  }
  set name(o) {
    this.setAttribute("name", o), this.syncState();
  }
  get indeterminado() {
    return this.hasAttribute("indeterminado") || this.hasAttribute("indeterminate");
  }
  set indeterminado(o) {
    o ? this.setAttribute("indeterminado", "") : (this.removeAttribute("indeterminado"), this.removeAttribute("indeterminate")), this.syncState();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(o) {
    o ? this.setAttribute("disabled", "") : this.removeAttribute("disabled"), this.syncState();
  }
  alternar() {
    this.disabled || (this.indeterminado ? (this.indeterminado = !1, this.marcado = !0) : this.marcado = !this.marcado, this.dispatchEvent(
      new CustomEvent("ui-change", {
        detail: {
          marcado: this.marcado,
          indeterminado: this.indeterminado,
          value: this.getAttribute("value") || ""
        },
        bubbles: !0,
        composed: !0
      })
    ));
  }
  syncState() {
    const o = this.marcado, s = this.indeterminado, r = this.disabled, d = this.getAttribute("label"), h = this.getAttribute("posicao-label") || "direita";
    this.containerElement.setAttribute(
      "aria-checked",
      s ? "mixed" : String(o)
    ), r ? (this.containerElement.classList.add("ui-checkbox--disabled"), this.containerElement.setAttribute("tabindex", "-1"), this.containerElement.setAttribute("aria-disabled", "true")) : (this.containerElement.classList.remove("ui-checkbox--disabled"), this.containerElement.setAttribute("tabindex", "0"), this.containerElement.removeAttribute("aria-disabled")), o ? this.containerElement.classList.add("ui-checkbox--checked") : this.containerElement.classList.remove("ui-checkbox--checked"), s ? this.containerElement.classList.add("ui-checkbox--indeterminate") : this.containerElement.classList.remove("ui-checkbox--indeterminate"), h === "esquerda" ? this.containerElement.classList.add("ui-checkbox--label-esquerda") : this.containerElement.classList.remove("ui-checkbox--label-esquerda"), s ? this.markElement.innerHTML = `
        <svg viewBox="0 0 24 24">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      ` : o ? this.markElement.innerHTML = `
        <svg viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      ` : this.markElement.innerHTML = "", d ? (this.labelElement.textContent = d, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", o ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null);
  }
  formResetCallback() {
    this.marcado = this.hasAttribute("checked"), this.indeterminado = this.hasAttribute("indeterminate");
  }
}
m(Ro, "formAssociated", !0);
customElements.get("ui-checkbox") || customElements.define("ui-checkbox", Ro);
const Ca = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-radio{display:inline-flex;align-items:center;gap:8px;cursor:pointer;-webkit-user-select:none;user-select:none;line-height:1;outline:none}.ui-radio--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-radio__circle{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;min-width:16px;min-height:16px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:50%;box-sizing:border-box;transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease;flex-shrink:0}.ui-radio:focus-visible .ui-radio__circle,.ui-radio--foco .ui-radio__circle{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a40}.ui-radio--checked .ui-radio__circle{border-color:var(--ui-cor-primaria, #00E08A)}.ui-radio__dot{width:8px;height:8px;border-radius:50%;background-color:var(--ui-cor-primaria, #00E08A);transition:transform .15s cubic-bezier(.4,0,.2,1),opacity .15s ease;transform:scale(0);opacity:0}.ui-radio--checked .ui-radio__dot{transform:scale(1);opacity:1}.ui-radio__label{font-size:clamp(11px,.8rem,14px);color:var(--ui-cor-texto, #e1e1e6);line-height:1}.ui-radio--label-esquerda{flex-direction:row-reverse}', st = class st extends HTMLElement {
  constructor() {
    super();
    m(this, "internals");
    m(this, "containerElement");
    m(this, "labelElement");
    m(this, "handleClick", (o) => {
      o.preventDefault(), this.selecionar(), this.containerElement.focus();
    });
    m(this, "handleKeyDown", (o) => {
      if (o.key === " " || o.key === "Enter")
        o.preventDefault(), this.selecionar();
      else if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(o.key)) {
        o.preventDefault();
        const s = this.name;
        if (!s || !st._registry.has(s)) return;
        const r = Array.from(st._registry.get(s));
        if (r.length <= 1) return;
        const d = r.indexOf(this);
        let h = d;
        if (o.key === "ArrowDown" || o.key === "ArrowRight" ? h = (d + 1) % r.length : (o.key === "ArrowUp" || o.key === "ArrowLeft") && (h = (d - 1 + r.length) % r.length), h !== d) {
          const p = r[h];
          p.selecionar(), p.containerElement.focus();
        }
      }
    });
    m(this, "handleFocus", () => {
      this.containerElement.classList.add("ui-radio--foco");
    });
    m(this, "handleBlur", () => {
      this.containerElement.classList.remove("ui-radio--foco");
    });
    this.internals = this.attachInternals();
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Ca}</style>
      <div class="ui-radio" tabindex="0" role="radio" aria-checked="false">
        <span class="ui-radio__circle">
          <span class="ui-radio__dot"></span>
        </span>
        <span class="ui-radio__label" style="display: none;"></span>
      </div>
    `, this.containerElement = o.querySelector(".ui-radio"), this.labelElement = o.querySelector(".ui-radio__label");
  }
  static get observedAttributes() {
    return [
      "marcado",
      "checked",
      "name",
      "nome",
      "disabled",
      "value",
      "label",
      "posicao-label"
    ];
  }
  connectedCallback() {
    this.containerElement.addEventListener("click", this.handleClick), this.containerElement.addEventListener("keydown", this.handleKeyDown), this.containerElement.addEventListener("focus", this.handleFocus), this.containerElement.addEventListener("blur", this.handleBlur), this.register(), this.syncState();
  }
  disconnectedCallback() {
    this.containerElement.removeEventListener("click", this.handleClick), this.containerElement.removeEventListener("keydown", this.handleKeyDown), this.containerElement.removeEventListener("focus", this.handleFocus), this.containerElement.removeEventListener("blur", this.handleBlur), this.unregister();
  }
  register() {
    const o = this.name;
    o && (st._registry.has(o) || st._registry.set(o, /* @__PURE__ */ new Set()), st._registry.get(o).add(this));
  }
  unregister() {
    const o = this.name;
    o && st._registry.has(o) && st._registry.get(o).delete(this);
  }
  attributeChangedCallback(o, s, r) {
    this.syncState();
  }
  get marcado() {
    return this.hasAttribute("marcado") || this.hasAttribute("checked");
  }
  set marcado(o) {
    o ? this.setAttribute("marcado", "") : (this.removeAttribute("marcado"), this.removeAttribute("checked"));
  }
  get name() {
    return this.getAttribute("name") || this.getAttribute("nome") || "";
  }
  set name(o) {
    this.unregister(), this.setAttribute("name", o), this.register(), this.syncState();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(o) {
    o ? this.setAttribute("disabled", "") : this.removeAttribute("disabled"), this.syncState();
  }
  selecionar() {
    if (this.disabled || this.marcado) return;
    const o = this.name;
    o && st._registry.has(o) && st._registry.get(o).forEach((r) => {
      r !== this && (r.removeAttribute("marcado"), r.removeAttribute("checked"), r.syncState());
    }), this.marcado = !0, this.dispatchEvent(
      new CustomEvent("ui-change", {
        detail: {
          marcado: !0,
          name: this.name,
          value: this.getAttribute("value") || ""
        },
        bubbles: !0,
        composed: !0
      })
    );
  }
  syncState() {
    const o = this.marcado, s = this.disabled, r = this.getAttribute("label"), d = this.getAttribute("posicao-label") || "direita";
    if (this.containerElement.setAttribute("aria-checked", String(o)), s)
      this.containerElement.classList.add("ui-radio--disabled"), this.containerElement.setAttribute("tabindex", "-1"), this.containerElement.setAttribute("aria-disabled", "true");
    else {
      this.containerElement.classList.remove("ui-radio--disabled"), this.containerElement.removeAttribute("aria-disabled");
      const h = this.name;
      if (h && st._registry.has(h)) {
        const p = Array.from(st._registry.get(h));
        p.some((b) => b.marcado) ? this.containerElement.setAttribute("tabindex", o ? "0" : "-1") : this.containerElement.setAttribute("tabindex", p[0] === this ? "0" : "-1");
      } else
        this.containerElement.setAttribute("tabindex", "0");
    }
    o ? this.containerElement.classList.add("ui-radio--checked") : this.containerElement.classList.remove("ui-radio--checked"), d === "esquerda" ? this.containerElement.classList.add("ui-radio--label-esquerda") : this.containerElement.classList.remove("ui-radio--label-esquerda"), r ? (this.labelElement.textContent = r, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", o ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null);
  }
  formResetCallback() {
    const o = this.hasAttribute("checked");
    o ? this.setAttribute("marcado", "") : this.removeAttribute("marcado"), o ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null), this.syncState();
  }
};
m(st, "formAssociated", !0), // Registro global de grupos de rádio para exclusividade mutua fora do shadow root
m(st, "_registry", /* @__PURE__ */ new Map());
let ui = st;
customElements.get("ui-radio") || customElements.define("ui-radio", ui);
const Aa = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer;-webkit-user-select:none;user-select:none;line-height:1;outline:none}.ui-switch--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-switch__track{display:inline-flex;align-items:center;position:relative;width:36px;height:20px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:999px;box-sizing:border-box;padding:1px;transition:background-color .2s ease,border-color .2s ease,box-shadow .2s ease;flex-shrink:0}.ui-switch:focus-visible .ui-switch__track,.ui-switch--foco .ui-switch__track{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a40}.ui-switch--checked .ui-switch__track{background-color:var(--ui-cor-primaria, #00E08A);border-color:var(--ui-cor-primaria, #00E08A)}.ui-switch__thumb{display:block;width:16px;height:16px;background-color:#fff;border-radius:50%;box-shadow:0 1px 3px #0000004d;transition:transform .2s cubic-bezier(.4,0,.2,1),background-color .2s ease;transform:translate(0)}.ui-switch--checked .ui-switch__thumb{transform:translate(16px);background-color:var(--ui-cor-texto-sobre-primaria, #000000)}.ui-switch--sm .ui-switch__track{width:28px;height:16px;padding:1px}.ui-switch--sm .ui-switch__thumb{width:12px;height:12px}.ui-switch--sm.ui-switch--checked .ui-switch__thumb{transform:translate(12px)}.ui-switch--lg .ui-switch__track{width:44px;height:24px;padding:1px}.ui-switch--lg .ui-switch__thumb{width:20px;height:20px}.ui-switch--lg.ui-switch--checked .ui-switch__thumb{transform:translate(20px)}.ui-switch__label{font-size:clamp(11px,.8rem,14px);color:var(--ui-cor-texto, #e1e1e6);line-height:1}.ui-switch--label-esquerda{flex-direction:row-reverse}';
class _i extends HTMLElement {
  constructor() {
    super();
    m(this, "internals");
    m(this, "containerElement");
    m(this, "labelElement");
    m(this, "handleClick", (o) => {
      o.preventDefault(), this.alternar();
    });
    m(this, "handleKeyDown", (o) => {
      (o.key === " " || o.key === "Enter") && (o.preventDefault(), this.alternar());
    });
    m(this, "handleFocus", () => {
      this.containerElement.classList.add("ui-switch--foco");
    });
    m(this, "handleBlur", () => {
      this.containerElement.classList.remove("ui-switch--foco");
    });
    this.internals = this.attachInternals();
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Aa}</style>
      <div class="ui-switch" tabindex="0" role="switch" aria-checked="false">
        <span class="ui-switch__track">
          <span class="ui-switch__thumb"></span>
        </span>
        <span class="ui-switch__label" style="display: none;"></span>
      </div>
    `, this.containerElement = o.querySelector(".ui-switch"), this.labelElement = o.querySelector(".ui-switch__label");
  }
  static get observedAttributes() {
    return [
      "ativo",
      "ligado",
      "checked",
      "disabled",
      "tamanho",
      "size",
      "label",
      "posicao-label",
      "value"
    ];
  }
  connectedCallback() {
    this.containerElement.addEventListener("click", this.handleClick), this.containerElement.addEventListener("keydown", this.handleKeyDown), this.containerElement.addEventListener("focus", this.handleFocus), this.containerElement.addEventListener("blur", this.handleBlur), this.syncState();
  }
  disconnectedCallback() {
    this.containerElement.removeEventListener("click", this.handleClick), this.containerElement.removeEventListener("keydown", this.handleKeyDown), this.containerElement.removeEventListener("focus", this.handleFocus), this.containerElement.removeEventListener("blur", this.handleBlur);
  }
  attributeChangedCallback(o, s, r) {
    this.syncState();
  }
  get ativo() {
    return this.hasAttribute("ativo") || this.hasAttribute("ligado") || this.hasAttribute("checked");
  }
  set ativo(o) {
    o ? this.setAttribute("ativo", "") : (this.removeAttribute("ativo"), this.removeAttribute("ligado"), this.removeAttribute("checked")), this.syncState();
  }
  get checked() {
    return this.ativo;
  }
  set checked(o) {
    this.ativo = o;
  }
  get value() {
    return this.getAttribute("value") || "on";
  }
  set value(o) {
    this.setAttribute("value", o), this.syncState();
  }
  get name() {
    return this.getAttribute("name") || "";
  }
  set name(o) {
    this.setAttribute("name", o), this.syncState();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(o) {
    o ? this.setAttribute("disabled", "") : this.removeAttribute("disabled"), this.syncState();
  }
  alternar() {
    this.disabled || (this.ativo = !this.ativo, this.dispatchEvent(
      new CustomEvent("ui-change", {
        detail: {
          ativo: this.ativo,
          value: this.getAttribute("value") || ""
        },
        bubbles: !0,
        composed: !0
      })
    ));
  }
  syncState() {
    const o = this.ativo, s = this.disabled, r = this.getAttribute("tamanho") || this.getAttribute("size") || "md", d = this.getAttribute("label"), h = this.getAttribute("posicao-label") || "direita";
    this.containerElement.setAttribute("aria-checked", String(o)), s ? (this.containerElement.classList.add("ui-switch--disabled"), this.containerElement.setAttribute("tabindex", "-1"), this.containerElement.setAttribute("aria-disabled", "true")) : (this.containerElement.classList.remove("ui-switch--disabled"), this.containerElement.setAttribute("tabindex", "0"), this.containerElement.removeAttribute("aria-disabled")), o ? this.containerElement.classList.add("ui-switch--checked") : this.containerElement.classList.remove("ui-switch--checked"), this.containerElement.classList.remove("ui-switch--sm", "ui-switch--md", "ui-switch--lg"), ["sm", "md", "lg"].includes(r) ? this.containerElement.classList.add(`ui-switch--${r}`) : this.containerElement.classList.add("ui-switch--md"), h === "esquerda" ? this.containerElement.classList.add("ui-switch--label-esquerda") : this.containerElement.classList.remove("ui-switch--label-esquerda"), d ? (this.labelElement.textContent = d, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", o ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null);
  }
  formResetCallback() {
    this.ativo = this.hasAttribute("checked") || this.hasAttribute("ligado");
  }
}
m(_i, "formAssociated", !0);
class Ma extends _i {
}
customElements.get("ui-switch") || customElements.define("ui-switch", _i);
customElements.get("ui-toggle") || customElements.define("ui-toggle", Ma);
const Sa = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-badge{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600;line-height:1;-webkit-user-select:none;user-select:none;box-sizing:border-box;transition:background-color .15s ease,color .15s ease,border-color .15s ease;white-space:nowrap}.ui-badge--suave{background-color:var(--ui-cor-badge-fundo, rgba(255, 255, 255, .08));color:var(--ui-cor-badge-texto, #e1e1e6);border:1px solid transparent}.ui-badge--solido{background-color:var(--ui-cor-badge-solido, #888899);color:#000;border:1px solid transparent}.ui-badge--contornado{background-color:transparent;color:var(--ui-cor-badge-texto, #e1e1e6);border:1px solid var(--ui-cor-badge-borda, rgba(255, 255, 255, .2))}.ui-badge--sucesso.ui-badge--suave{background-color:#00e08a26;color:var(--ui-cor-primaria, #00E08A)}.ui-badge--sucesso.ui-badge--solido{background-color:var(--ui-cor-primaria, #00E08A);color:#000}.ui-badge--sucesso.ui-badge--contornado{color:var(--ui-cor-primaria, #00E08A);border-color:#00e08a66}.ui-badge--erro.ui-badge--suave{background-color:#ff555526;color:var(--ui-cor-texto-erro, #ff5555)}.ui-badge--erro.ui-badge--solido{background-color:var(--ui-cor-texto-erro, #ff5555);color:#fff}.ui-badge--erro.ui-badge--contornado{color:var(--ui-cor-texto-erro, #ff5555);border-color:#f556}.ui-badge--alerta.ui-badge--suave{background-color:#ffb86c26;color:var(--ui-cor-texto-alerta, #ffb86c)}.ui-badge--alerta.ui-badge--solido{background-color:var(--ui-cor-texto-alerta, #ffb86c);color:#000}.ui-badge--alerta.ui-badge--contornado{color:var(--ui-cor-texto-alerta, #ffb86c);border-color:#ffb86c66}.ui-badge--info.ui-badge--suave,.ui-badge--primaria.ui-badge--suave{background-color:#00aaff26;color:#0af}.ui-badge--info.ui-badge--solido,.ui-badge--primaria.ui-badge--solido{background-color:#0af;color:#fff}.ui-badge--info.ui-badge--contornado,.ui-badge--primaria.ui-badge--contornado{color:#0af;border-color:#0af6}.ui-badge--neutro.ui-badge--suave{background-color:#ffffff14;color:var(--ui-cor-texto-secundario, #888899)}.ui-badge__close{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;cursor:pointer;opacity:.7;transition:opacity .15s ease,background-color .15s ease;font-size:10px;line-height:1;margin-left:2px}.ui-badge__close:hover{opacity:1;background-color:#fff3}';
class vi extends HTMLElement {
  constructor() {
    super();
    m(this, "badgeElement");
    m(this, "labelElement");
    m(this, "closeElement");
    m(this, "handleRemove", (o) => {
      var s;
      o.stopPropagation(), this.dispatchEvent(
        new CustomEvent("ui-remove", {
          detail: {
            value: this.getAttribute("value") || ((s = this.textContent) == null ? void 0 : s.trim()) || ""
          },
          bubbles: !0,
          composed: !0
        })
      );
    });
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Sa}</style>
      <span class="ui-badge">
        <slot></slot>
        <span class="ui-badge__label" style="display: none;"></span>
        <span class="ui-badge__close" style="display: none;" title="Remover">✕</span>
      </span>
    `, this.badgeElement = o.querySelector(".ui-badge"), this.labelElement = o.querySelector(".ui-badge__label"), this.closeElement = o.querySelector(".ui-badge__close");
  }
  static get observedAttributes() {
    return [
      "variante",
      "variant",
      "estilo",
      "removivel",
      "removable",
      "disabled",
      "label",
      "value"
    ];
  }
  connectedCallback() {
    this.closeElement.addEventListener("click", this.handleRemove), this.syncState();
  }
  disconnectedCallback() {
    this.closeElement.removeEventListener("click", this.handleRemove);
  }
  attributeChangedCallback(o, s, r) {
    this.syncState();
  }
  get removivel() {
    return this.hasAttribute("removivel") || this.hasAttribute("removable");
  }
  set removivel(o) {
    o ? this.setAttribute("removivel", "") : (this.removeAttribute("removivel"), this.removeAttribute("removable")), this.syncState();
  }
  syncState() {
    const o = this.getAttribute("variante") || this.getAttribute("variant") || "neutro", s = this.getAttribute("estilo") || "suave", r = this.getAttribute("label"), d = this.removivel;
    this.badgeElement.className = "ui-badge", this.badgeElement.classList.add(`ui-badge--${o}`), this.badgeElement.classList.add(`ui-badge--${s}`), r ? (this.labelElement.textContent = r, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", d ? this.closeElement.style.display = "inline-flex" : this.closeElement.style.display = "none";
  }
}
class za extends vi {
}
class Ta extends vi {
}
customElements.get("ui-badge") || customElements.define("ui-badge", vi);
customElements.get("ui-chip") || customElements.define("ui-chip", za);
customElements.get("ui-tag") || customElements.define("ui-tag", Ta);
const Ia = ':host{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle;position:relative}.ui-avatar{position:relative;display:inline-flex;align-items:center;justify-content:center;width:var(--ui-tamanho-avatar, 36px);height:var(--ui-tamanho-avatar, 36px);min-width:var(--ui-tamanho-avatar, 36px);min-height:var(--ui-tamanho-avatar, 36px);border-radius:50%;background-color:var(--ui-cor-fundo-elevado, #22222a);color:var(--ui-cor-primaria, #00E08A);font-weight:600;font-size:clamp(10px,.4 * var(--ui-tamanho-avatar, 36px),24px);-webkit-user-select:none;user-select:none;box-sizing:border-box;overflow:hidden;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));line-height:1}.ui-avatar__img{width:100%;height:100%;object-fit:cover;display:block}.ui-avatar--quadrado{border-radius:8px}.ui-avatar__status{position:absolute;bottom:0;right:0;width:25%;height:25%;min-width:8px;min-height:8px;max-width:14px;max-height:14px;border-radius:50%;border:2px solid var(--ui-cor-fundo-card, #121214);box-sizing:border-box}.ui-avatar__status--online{background-color:var(--ui-cor-primaria, #00E08A)}.ui-avatar__status--offline{background-color:#889}.ui-avatar__status--ausente{background-color:#ffb86c}.ui-avatar__status--ocupado{background-color:#f55}.ui-avatar--xs{--ui-tamanho-avatar: 20px}.ui-avatar--sm{--ui-tamanho-avatar: 28px}.ui-avatar--md{--ui-tamanho-avatar: 36px}.ui-avatar--lg{--ui-tamanho-avatar: 48px}.ui-avatar--xl{--ui-tamanho-avatar: 64px}';
class Oa extends HTMLElement {
  constructor() {
    super();
    m(this, "avatarElement");
    m(this, "statusElement");
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Ia}</style>
      <div class="ui-avatar">
        <span class="ui-avatar__content"></span>
      </div>
      <span class="ui-avatar__status" style="display: none;"></span>
    `, this.avatarElement = o.querySelector(".ui-avatar"), this.statusElement = o.querySelector(".ui-avatar__status");
  }
  static get observedAttributes() {
    return [
      "src",
      "nome",
      "name",
      "tamanho",
      "size",
      "formato",
      "status"
    ];
  }
  connectedCallback() {
    this.syncState();
  }
  attributeChangedCallback(o, s, r) {
    this.syncState();
  }
  extrairIniciais(o) {
    const s = o.trim().split(/\s+/).filter(Boolean);
    if (s.length === 0) return "?";
    if (s.length === 1)
      return s[0].substring(0, 2).toUpperCase();
    const r = s[0][0], d = s[s.length - 1][0];
    return (r + d).toUpperCase();
  }
  syncState() {
    const o = this.getAttribute("src"), s = this.getAttribute("nome") || this.getAttribute("name") || "", r = this.getAttribute("tamanho") || this.getAttribute("size") || "md", d = this.getAttribute("formato") || "circulo", h = this.getAttribute("status");
    this.avatarElement.className = "ui-avatar", ["xs", "sm", "md", "lg", "xl"].includes(r) ? this.avatarElement.classList.add(`ui-avatar--${r}`) : isNaN(parseInt(r, 10)) || this.avatarElement.style.setProperty("--ui-tamanho-avatar", `${parseInt(r, 10)}px`), d === "quadrado" && this.avatarElement.classList.add("ui-avatar--quadrado");
    const p = this.avatarElement.querySelector(".ui-avatar__content");
    if (p)
      if (o) {
        p.innerHTML = `<img class="ui-avatar__img" src="${o}" alt="${s || "Avatar"}" />`;
        const f = p.querySelector("img");
        f && (f.onerror = () => {
          this.renderFallback(p, s);
        });
      } else
        this.renderFallback(p, s);
    h && ["online", "offline", "ausente", "ocupado"].includes(h) ? (this.statusElement.className = `ui-avatar__status ui-avatar__status--${h}`, this.statusElement.style.display = "block") : this.statusElement.style.display = "none";
  }
  renderFallback(o, s) {
    s ? o.textContent = this.extrairIniciais(s) : o.innerHTML = `
        <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      `;
  }
}
customElements.get("ui-avatar") || customElements.define("ui-avatar", Oa);
const Ba = ':host{display:block;width:100%;box-sizing:border-box}:host(.h-full),:host([style*="height: 100%"]){height:100%}.ui-card{display:flex;flex-direction:column;width:100%;height:100%;box-sizing:border-box;background-color:var(--ui-cor-fundo-card, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 8px);overflow:hidden;transition:transform .2s cubic-bezier(.4,0,.2,1),box-shadow .2s cubic-bezier(.4,0,.2,1),border-color .2s ease;color:var(--ui-cor-texto, #e1e1e6);font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-card--plano{background-color:var(--ui-cor-fundo-card, #18181c);box-shadow:none}.ui-card--elevado{background-color:var(--ui-cor-fundo-elevado, #1e1e24);box-shadow:0 8px 24px #0006;border-color:#ffffff14}.ui-card--destaque{border-color:var(--ui-cor-primaria, #00E08A);background-color:var(--ui-cor-fundo-card, #18181c);box-shadow:0 0 0 1px #00e08a40}.ui-card--clicavel{cursor:pointer;-webkit-user-select:none;user-select:none}.ui-card--clicavel:hover{transform:translateY(-3px);border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 10px 30px #00000080,0 0 15px #00e08a26}.ui-card--clicavel:active{transform:translateY(-1px)}.ui-card--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-card__media{width:100%;overflow:hidden;display:block;line-height:0}::slotted([slot="midia"]),::slotted([slot="media"]){width:100%;height:auto;display:block;object-fit:cover}.ui-card__header{padding:14px 16px 8px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box}.ui-card__body{padding:12px 16px;flex:1;box-sizing:border-box}.ui-card__footer{padding:10px 16px 14px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box}.ui-card--compacto .ui-card__header{padding:10px 12px 6px}.ui-card--compacto .ui-card__body{padding:8px 12px}.ui-card--compacto .ui-card__footer{padding:8px 12px 10px}';
class Na extends HTMLElement {
  constructor() {
    super();
    m(this, "cardElement");
    m(this, "handleClick", () => {
      this.disabled || this.clicavel && this.dispatchEvent(
        new CustomEvent("ui-click", {
          detail: {
            id: this.id || "sem-id"
          },
          bubbles: !0,
          composed: !0
        })
      );
    });
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Ba}</style>
      <div class="ui-card">
        <div class="ui-card__media">
          <slot name="midia"></slot>
          <slot name="media"></slot>
        </div>
        <div class="ui-card__header">
          <slot name="cabecalho"></slot>
          <slot name="header"></slot>
        </div>
        <div class="ui-card__body">
          <slot></slot>
        </div>
        <div class="ui-card__footer">
          <slot name="rodape"></slot>
          <slot name="footer"></slot>
        </div>
      </div>
    `, this.cardElement = o.querySelector(".ui-card");
  }
  static get observedAttributes() {
    return [
      "elevacao",
      "elevation",
      "variante",
      "variant",
      "clicavel",
      "clickable",
      "compacto",
      "compact",
      "disabled"
    ];
  }
  connectedCallback() {
    this.cardElement.addEventListener("click", this.handleClick), this.syncState();
  }
  disconnectedCallback() {
    this.cardElement.removeEventListener("click", this.handleClick);
  }
  attributeChangedCallback(o, s, r) {
    this.syncState();
  }
  get clicavel() {
    return this.hasAttribute("clicavel") || this.hasAttribute("clickable");
  }
  set clicavel(o) {
    o ? this.setAttribute("clicavel", "") : (this.removeAttribute("clicavel"), this.removeAttribute("clickable")), this.syncState();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(o) {
    o ? this.setAttribute("disabled", "") : this.removeAttribute("disabled"), this.syncState();
  }
  syncState() {
    var y, v, E;
    const o = this.getAttribute("elevacao") || this.getAttribute("elevation") || "plano", s = this.getAttribute("variante") || this.getAttribute("variant") || o, r = this.clicavel, d = this.hasAttribute("compacto") || this.hasAttribute("compact"), h = this.disabled;
    this.cardElement.className = "ui-card", this.cardElement.classList.add(`ui-card--${s}`), r ? (this.cardElement.classList.add("ui-card--clicavel"), this.cardElement.setAttribute("tabindex", "0")) : this.cardElement.removeAttribute("tabindex"), d && this.cardElement.classList.add("ui-card--compacto"), h && this.cardElement.classList.add("ui-card--disabled");
    const p = (y = this.shadowRoot) == null ? void 0 : y.querySelector(".ui-card__header"), f = (v = this.shadowRoot) == null ? void 0 : v.querySelector(".ui-card__footer"), b = (E = this.shadowRoot) == null ? void 0 : E.querySelector(".ui-card__media");
    if (b) {
      const z = this.querySelector('[slot="midia"], [slot="media"]');
      b.style.display = z ? "block" : "none";
    }
    if (p) {
      const z = this.querySelector('[slot="cabecalho"], [slot="header"]');
      p.style.display = z ? "flex" : "none";
    }
    if (f) {
      const z = this.querySelector('[slot="rodape"], [slot="footer"]');
      f.style.display = z ? "flex" : "none";
    }
  }
}
customElements.get("ui-card") || customElements.define("ui-card", Na);
const Za = ':host{display:block;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-modal__backdrop{display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background-color:#000000b3;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);z-index:9998;opacity:0;pointer-events:none;transition:opacity .25s ease}:host([aberto]) .ui-modal__backdrop,:host([open]) .ui-modal__backdrop{display:block;opacity:1;pointer-events:auto}.ui-modal__dialog{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.95);max-width:560px;width:90%;max-height:85vh;background-color:var(--ui-cor-fundo-card, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:var(--ui-raio-borda, 12px);box-shadow:0 12px 36px #0009;z-index:9999;display:flex;flex-direction:column;opacity:0;visibility:hidden;pointer-events:none;overflow:hidden;transition:transform .25s cubic-bezier(.4,0,.2,1),opacity .25s ease,visibility .25s ease;box-sizing:border-box;color:var(--ui-cor-texto, #e1e1e6)}:host([aberto]) .ui-modal__dialog,:host([open]) .ui-modal__dialog{opacity:1;visibility:visible;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}.ui-modal__handle{display:none;width:36px;height:4px;border-radius:2px;background-color:#ffffff40;margin:6px auto 12px;flex-shrink:0}.ui-modal__header{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);gap:12px}.ui-modal__titulo{font-size:1.1rem;font-weight:600;margin:0;color:var(--ui-cor-texto, #e1e1e6)}.ui-modal__close{background:transparent;border:none;color:var(--ui-cor-texto-secundario, #888899);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;line-height:1;transition:color .15s ease,background-color .15s ease}.ui-modal__close:hover{color:#fff;background-color:#ffffff1a}.ui-modal__body{padding:20px;overflow-y:auto;flex:1;box-sizing:border-box}.ui-modal__footer{padding:14px 20px;display:flex;align-items:center;justify-content:flex-end;gap:12px;border-top:1px solid rgba(255,255,255,.08);background-color:#00000026}@media (max-width: 640px){.ui-modal__dialog{top:auto!important;bottom:0!important;left:0!important;transform:translateY(100%)!important;width:100vw!important;max-width:100vw!important;border-radius:16px 16px 0 0!important;max-height:80vh!important;border-bottom:none!important;box-shadow:0 -8px 32px #000000b3!important}:host([aberto]) .ui-modal__dialog,:host([open]) .ui-modal__dialog{transform:translateY(0)!important}.ui-modal__handle{display:block!important}}:host([bottom-sheet]) .ui-modal__dialog{top:auto!important;bottom:0!important;left:0!important;transform:translateY(100%)!important;width:100vw!important;max-width:100vw!important;border-radius:16px 16px 0 0!important;max-height:80vh!important;border-bottom:none!important;box-shadow:0 -8px 32px #000000b3!important}:host([bottom-sheet][aberto]) .ui-modal__dialog,:host([bottom-sheet][open]) .ui-modal__dialog{transform:translateY(0)!important}:host([bottom-sheet]) .ui-modal__handle{display:block!important}', bt = class bt extends HTMLElement {
  constructor() {
    super();
    m(this, "backdropElement");
    m(this, "dialogElement");
    m(this, "tituloElement");
    m(this, "closeElement");
    m(this, "_elementoGatilho", null);
    m(this, "_focables", []);
    m(this, "handleBackdropClick", (o) => {
      o.stopPropagation(), this.fechar();
    });
    m(this, "handleCloseClick", (o) => {
      o.stopPropagation(), this.fechar();
    });
    m(this, "handleKeyDown", (o) => {
      var s, r;
      if (this.aberto && this._isTopMostModal()) {
        if (o.key === "Escape")
          this.fechar(), o.stopImmediatePropagation();
        else if (o.key === "Tab") {
          if (this._atualizarFocables(), this._focables.length === 0) {
            o.preventDefault();
            return;
          }
          const d = this._focables[0], h = this._focables[this._focables.length - 1], p = this.getRootNode().activeElement;
          o.shiftKey ? (p === d || !this.contains(p) && !((s = this.shadowRoot) != null && s.contains(p))) && (o.preventDefault(), h.focus()) : (p === h || !this.contains(p) && !((r = this.shadowRoot) != null && r.contains(p))) && (o.preventDefault(), d.focus());
        }
      }
    });
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Za}</style>
      <div class="ui-modal__backdrop"></div>
      <div class="ui-modal__dialog" role="dialog" aria-modal="true" tabindex="-1">
        <div class="ui-modal__handle"></div>
        <div class="ui-modal__header">
          <h3 class="ui-modal__titulo"></h3>
          <button class="ui-modal__close" title="Fechar (Esc)">✕</button>
        </div>
        <div class="ui-modal__body">
          <slot></slot>
        </div>
        <div class="ui-modal__footer">
          <slot name="rodape"></slot>
          <slot name="footer"></slot>
        </div>
      </div>
    `, this.backdropElement = o.querySelector(".ui-modal__backdrop"), this.dialogElement = o.querySelector(".ui-modal__dialog"), this.tituloElement = o.querySelector(".ui-modal__titulo"), this.closeElement = o.querySelector(".ui-modal__close");
  }
  static get observedAttributes() {
    return [
      "aberto",
      "open",
      "titulo",
      "title",
      "bottom-sheet",
      "bloquear-fechamento"
    ];
  }
  connectedCallback() {
    this.backdropElement.addEventListener("click", this.handleBackdropClick), this.closeElement.addEventListener("click", this.handleCloseClick), window.addEventListener("keydown", this.handleKeyDown), this.syncState();
  }
  disconnectedCallback() {
    this.backdropElement.removeEventListener("click", this.handleBackdropClick), this.closeElement.removeEventListener("click", this.handleCloseClick), window.removeEventListener("keydown", this.handleKeyDown), this.hasAttribute("data-scroll-locked") && (this.removeAttribute("data-scroll-locked"), bt._openCount = Math.max(0, bt._openCount - 1), bt._openCount === 0 && (document.body.style.overflow = ""));
  }
  attributeChangedCallback(o, s, r) {
    this.syncState();
  }
  get aberto() {
    return this.hasAttribute("aberto") || this.hasAttribute("open");
  }
  set aberto(o) {
    o ? this.setAttribute("aberto", "") : (this.removeAttribute("aberto"), this.removeAttribute("open")), this.syncState();
  }
  abrir() {
    this.aberto || (document.activeElement && document.activeElement !== document.body && (this._elementoGatilho = document.activeElement), this.aberto = !0, this.dispatchEvent(
      new CustomEvent("ui-abrir", {
        bubbles: !0,
        composed: !0
      })
    ), setTimeout(() => {
      this._atualizarFocables(), this._focables.length > 0 ? this._focables[0].focus() : this.dialogElement.focus();
    }, 0));
  }
  fechar() {
    this.hasAttribute("bloquear-fechamento") || this.aberto && (this.aberto = !1, this.dispatchEvent(
      new CustomEvent("ui-fechar", {
        bubbles: !0,
        composed: !0
      })
    ), this._elementoGatilho && (this._elementoGatilho.focus(), this._elementoGatilho = null));
  }
  syncState() {
    var d;
    const o = this.aberto, s = this.getAttribute("titulo") || this.getAttribute("title") || "", r = (d = this.shadowRoot) == null ? void 0 : d.querySelector(".ui-modal__footer");
    if (this.dialogElement.setAttribute("aria-hidden", String(!o)), s ? (this.tituloElement.textContent = s, this.tituloElement.style.display = "block") : this.tituloElement.style.display = "none", r) {
      const h = this.querySelector('[slot="rodape"], [slot="footer"]');
      r.style.display = h ? "flex" : "none";
    }
    o ? this.hasAttribute("data-scroll-locked") || (this.setAttribute("data-scroll-locked", "true"), bt._openCount++, bt._openCount === 1 && (document.body.style.overflow = "hidden")) : this.hasAttribute("data-scroll-locked") && (this.removeAttribute("data-scroll-locked"), bt._openCount = Math.max(0, bt._openCount - 1), bt._openCount === 0 && (document.body.style.overflow = ""));
  }
  _atualizarFocables() {
    const o = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
    let s = Array.from(this.shadowRoot.querySelectorAll(o));
    s = s.filter((h) => window.getComputedStyle(h).display !== "none");
    const r = this.shadowRoot.querySelectorAll("slot");
    let d = [];
    r.forEach((h) => {
      h.assignedElements({ flatten: !0 }).forEach((f) => {
        f instanceof HTMLElement && (f.matches(o) && d.push(f), d.push(...Array.from(f.querySelectorAll(o))));
      });
    }), this._focables = [...s, ...d].filter((h) => !h.hasAttribute("disabled") && h.getAttribute("aria-hidden") !== "true");
  }
  _isTopMostModal() {
    const o = Array.from(document.querySelectorAll("ui-modal[aberto], ui-modal[open], ui-dialog[aberto], ui-dialog[open]"));
    return o[o.length - 1] === this;
  }
};
m(bt, "_openCount", 0);
let Se = bt;
class Ra extends Se {
}
customElements.get("ui-modal") || customElements.define("ui-modal", Se);
customElements.get("ui-dialog") || customElements.define("ui-dialog", Ra);
const Da = ':host{display:block;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-alerta{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-radius:var(--ui-raio-borda, 8px);border:1px solid transparent;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);box-sizing:border-box;position:relative;transition:opacity .2s ease,transform .2s ease;line-height:1.4}.ui-alerta__icone{display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}.ui-alerta__conteudo{flex:1}.ui-alerta__titulo{font-size:.9rem;font-weight:600;margin:0 0 2px;line-height:1.2}.ui-alerta__mensagem{font-size:.825rem;margin:0;opacity:.9}.ui-alerta__close{background:transparent;border:none;color:currentColor;opacity:.7;font-size:14px;cursor:pointer;padding:2px 6px;border-radius:4px;line-height:1;flex-shrink:0;margin-top:-2px;margin-right:-4px;transition:opacity .15s ease,background-color .15s ease}.ui-alerta__close:hover{opacity:1;background-color:#ffffff26}.ui-alerta--sucesso{background-color:#00e08a1f;border-color:#00e08a4d;color:var(--ui-cor-texto-sucesso, #00E08A)}.ui-alerta--sucesso .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}.ui-alerta--erro{background-color:#ff55551f;border-color:#ff55554d;color:var(--ui-cor-texto-erro, #ff5555)}.ui-alerta--erro .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}.ui-alerta--alerta{background-color:#ffb86c1f;border-color:#ffb86c4d;color:var(--ui-cor-texto-alerta, #ffb86c)}.ui-alerta--alerta .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}.ui-alerta--info{background-color:#00aaff1f;border-color:#00aaff4d;color:#0af}.ui-alerta--info .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}:host(ui-toast){display:block;width:100%;box-sizing:border-box;pointer-events:auto;transition:transform .25s cubic-bezier(.4,0,.2,1),opacity .25s ease}.ui-toast__banner{box-shadow:0 8px 30px #0009;animation:ui-toast-slide .3s cubic-bezier(.4,0,.2,1)}@keyframes ui-toast-slide{0%{transform:translate(100%);opacity:0}to{transform:translate(0);opacity:1}}', Oo = {
  sucesso: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  erro: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  alerta: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  info: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
};
class Do extends HTMLElement {
  constructor() {
    super();
    m(this, "alertaElement");
    m(this, "iconeElement");
    m(this, "tituloElement");
    m(this, "mensagemElement");
    m(this, "closeElement");
    m(this, "fechar", () => {
      this.dispatchEvent(
        new CustomEvent("ui-fechar", {
          bubbles: !0,
          composed: !0
        })
      ), this.remove();
    });
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Da}</style>
      <div class="ui-alerta" role="alert">
        <span class="ui-alerta__icone"></span>
        <div class="ui-alerta__conteudo">
          <h4 class="ui-alerta__titulo" style="display: none;"></h4>
          <p class="ui-alerta__mensagem">
            <slot></slot>
          </p>
        </div>
        <button class="ui-alerta__close" style="display: none;" title="Fechar">✕</button>
      </div>
    `, this.alertaElement = o.querySelector(".ui-alerta"), this.iconeElement = o.querySelector(".ui-alerta__icone"), this.tituloElement = o.querySelector(".ui-alerta__titulo"), this.mensagemElement = o.querySelector(".ui-alerta__mensagem"), this.closeElement = o.querySelector(".ui-alerta__close");
  }
  static get observedAttributes() {
    return [
      "tipo",
      "variante",
      "variant",
      "titulo",
      "title",
      "mensagem",
      "fechavel",
      "dismissible"
    ];
  }
  connectedCallback() {
    this.closeElement.addEventListener("click", this.fechar), this.syncState();
  }
  disconnectedCallback() {
    this.closeElement.removeEventListener("click", this.fechar);
  }
  attributeChangedCallback(o, s, r) {
    this.syncState();
  }
  syncState() {
    const o = this.getAttribute("tipo") || this.getAttribute("variante") || this.getAttribute("variant") || "info", s = this.getAttribute("titulo") || this.getAttribute("title"), r = this.getAttribute("mensagem"), d = this.hasAttribute("fechavel") || this.hasAttribute("dismissible");
    this.alertaElement.className = "ui-alerta", this.alertaElement.classList.add(`ui-alerta--${o}`), this.iconeElement.innerHTML = Oo[o] || Oo.info, s ? (this.tituloElement.textContent = s, this.tituloElement.style.display = "block") : this.tituloElement.style.display = "none", r && (this.mensagemElement.textContent = r), d ? this.closeElement.style.display = "block" : this.closeElement.style.display = "none";
  }
}
class bi extends Do {
  constructor() {
    super(...arguments);
    m(this, "timerId", null);
  }
  connectedCallback() {
    super.connectedCallback(), this.alertaElement.classList.add("ui-toast__banner");
    const o = this.getAttribute("duracao") || this.getAttribute("duration") || "4000", s = parseInt(o, 10);
    !isNaN(s) && s > 0 && (this.timerId = setTimeout(() => {
      this.fechar();
    }, s));
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.timerId && clearTimeout(this.timerId);
  }
  static obterContainer(o) {
    const s = `ui-toast-container-${o}`;
    let r = document.getElementById(s);
    return r || (r = document.createElement("div"), r.id = s, r.style.position = "fixed", r.style.zIndex = "10000", r.style.display = "flex", r.style.gap = "10px", r.style.maxWidth = "380px", r.style.width = "calc(100vw - 32px)", r.style.pointerEvents = "none", r.style.boxSizing = "border-box", r.style.transition = "all 0.2s ease", o === "top-right" ? (r.style.top = "20px", r.style.right = "20px", r.style.flexDirection = "column") : (r.style.bottom = "20px", r.style.right = "20px", r.style.flexDirection = "column-reverse"), document.body.appendChild(r)), r;
  }
  // Utilitário estático para disparo imperativo de Toasts de qualquer lugar no código
  static notificar(o) {
    const s = o.posicao || "bottom-right", r = document.createElement("ui-toast");
    return o.tipo && r.setAttribute("tipo", o.tipo), o.titulo && r.setAttribute("titulo", o.titulo), o.mensagem && r.setAttribute("mensagem", o.mensagem), o.duracao && r.setAttribute("duracao", String(o.duracao)), r.setAttribute("posicao", s), r.setAttribute("fechavel", ""), bi.obterContainer(s).appendChild(r), r;
  }
}
customElements.get("ui-alerta") || customElements.define("ui-alerta", Do);
customElements.get("ui-toast") || customElements.define("ui-toast", bi);
const Ha = ":host{display:inline-flex;position:relative;align-items:center;justify-content:center;vertical-align:middle;box-sizing:border-box;--ui-tooltip-texto-distancia: 90px;--ui-tooltip-seta-espaco: 70px}.ui-tooltip__bubble{position:fixed;z-index:10001;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:500;background-color:var(--ui-cor-fundo-elevado, #1e1e24);color:var(--ui-cor-texto, #e1e1e6);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));box-shadow:0 4px 16px #00000080;white-space:nowrap;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s ease,visibility .15s ease;line-height:1.2;box-sizing:border-box;-webkit-user-select:none;user-select:none;margin:0}.ui-tooltip__bubble[popover]{margin:0;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));background-color:var(--ui-cor-fundo-elevado, #1e1e24);color:var(--ui-cor-texto, #e1e1e6);padding:6px 10px;overflow:visible}.ui-tooltip__texto{max-width:var(--ui-tooltip-texto-distancia, 90px)}.ui-tooltip__arrow{position:absolute;width:0;height:0;border-style:solid}.ui-tooltip--topo .ui-tooltip__arrow{bottom:-5px;left:50%;transform:translate(-50%);border-width:5px 5px 0 5px;border-color:var(--ui-cor-fundo-elevado, #1e1e24) transparent transparent transparent}.ui-tooltip--baixo .ui-tooltip__arrow{top:-5px;left:50%;transform:translate(-50%);border-width:0 5px 5px 5px;border-color:transparent transparent var(--ui-cor-fundo-elevado, #1e1e24) transparent}.ui-tooltip--esquerda .ui-tooltip__arrow{right:-5px;top:50%;transform:translateY(-50%);border-width:5px 0 5px 5px;border-color:transparent transparent transparent var(--ui-cor-fundo-elevado, #1e1e24)}.ui-tooltip--direita .ui-tooltip__arrow{left:-5px;top:50%;transform:translateY(-50%);border-width:5px 5px 5px 0;border-color:transparent var(--ui-cor-fundo-elevado, #1e1e24) transparent transparent}.ui-tooltip--visivel .ui-tooltip__bubble{opacity:1;visibility:visible;pointer-events:auto}";
class Ho extends HTMLElement {
  constructor() {
    super();
    m(this, "containerElement");
    m(this, "bubbleElement");
    m(this, "posicionarBubble", () => {
      if (!this.aberto) return;
      const o = this.getBoundingClientRect(), s = this.bubbleElement.getBoundingClientRect(), r = this.getAttribute("posicao") || this.getAttribute("position") || "topo";
      let d = "topo";
      ["topo", "top"].includes(r) ? d = "topo" : ["baixo", "bottom"].includes(r) ? d = "baixo" : ["esquerda", "left"].includes(r) ? d = "esquerda" : ["direita", "right"].includes(r) && (d = "direita");
      let h = 0, p = 0;
      const f = 8;
      d === "topo" ? (h = o.top - s.height - f, p = o.left + o.width / 2 - s.width / 2) : d === "baixo" ? (h = o.bottom + f, p = o.left + o.width / 2 - s.width / 2) : d === "esquerda" ? (h = o.top + o.height / 2 - s.height / 2, p = o.left - s.width - f) : d === "direita" && (h = o.top + o.height / 2 - s.height / 2, p = o.right + f), p = Math.max(8, Math.min(p, window.innerWidth - s.width - 8)), h = Math.max(8, Math.min(h, window.innerHeight - s.height - 8)), this.bubbleElement.style.top = `${h}px`, this.bubbleElement.style.left = `${p}px`;
    });
    m(this, "handleMouseEnter", () => {
      const o = this.getAttribute("gatilho") || this.getAttribute("trigger") || "hover";
      (o === "hover" || o === "passar-mouse") && this.mostrar();
    });
    m(this, "handleMouseLeave", () => {
      const o = this.getAttribute("gatilho") || this.getAttribute("trigger") || "hover";
      (o === "hover" || o === "passar-mouse") && this.ocultar();
    });
    m(this, "handleClick", (o) => {
      const s = this.getAttribute("gatilho") || this.getAttribute("trigger") || "hover", r = window.matchMedia("(pointer: coarse)").matches;
      (s === "clique" || s === "click" || r) && (o.stopPropagation(), this.aberto = !this.aberto);
    });
    m(this, "handleClickOutside", (o) => {
      o.composedPath().includes(this) || this.ocultar();
    });
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Ha}</style>
      <div class="ui-tooltip ui-tooltip--topo">
        <slot></slot>
        <div class="ui-tooltip__bubble" role="tooltip" popover="manual">
          <span class="ui-tooltip__texto"></span>
          <slot name="conteudo"></slot>
          <span class="ui-tooltip__arrow"></span>
        </div>
      </div>
    `, this.containerElement = o.querySelector(".ui-tooltip"), this.bubbleElement = o.querySelector(".ui-tooltip__bubble");
  }
  static get observedAttributes() {
    return [
      "texto",
      "text",
      "posicao",
      "position",
      "gatilho",
      "trigger",
      "aberto",
      "open",
      "disabled"
    ];
  }
  connectedCallback() {
    this.addEventListener("mouseenter", this.handleMouseEnter), this.addEventListener("mouseleave", this.handleMouseLeave), this.addEventListener("focusin", this.handleMouseEnter), this.addEventListener("focusout", this.handleMouseLeave), this.addEventListener("click", this.handleClick), document.addEventListener("click", this.handleClickOutside), this.syncState();
  }
  disconnectedCallback() {
    this.removeEventListener("mouseenter", this.handleMouseEnter), this.removeEventListener("mouseleave", this.handleMouseLeave), this.removeEventListener("focusin", this.handleMouseEnter), this.removeEventListener("focusout", this.handleMouseLeave), this.removeEventListener("click", this.handleClick), document.removeEventListener("click", this.handleClickOutside), this.ocultar();
  }
  attributeChangedCallback(o, s, r) {
    this.syncState();
  }
  get aberto() {
    return this.hasAttribute("aberto") || this.hasAttribute("open");
  }
  set aberto(o) {
    o ? this.setAttribute("aberto", "") : (this.removeAttribute("aberto"), this.removeAttribute("open")), this.syncState();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(o) {
    o ? this.setAttribute("disabled", "") : this.removeAttribute("disabled"), this.syncState();
  }
  mostrar() {
    this.disabled || (this.aberto = !0);
  }
  ocultar() {
    this.aberto = !1;
  }
  syncState() {
    var p;
    const o = this.aberto, s = this.getAttribute("posicao") || this.getAttribute("position") || "topo", r = this.getAttribute("texto") || this.getAttribute("text") || "", d = (p = this.shadowRoot) == null ? void 0 : p.querySelector(".ui-tooltip__texto");
    let h = "topo";
    if (["topo", "top"].includes(s) ? h = "topo" : ["baixo", "bottom"].includes(s) ? h = "baixo" : ["esquerda", "left"].includes(s) ? h = "esquerda" : ["direita", "right"].includes(s) && (h = "direita"), this.containerElement.className = `ui-tooltip ui-tooltip--${h}`, d && (r ? (d.textContent = r, d.style.display = "inline") : d.style.display = "none"), o) {
      if (typeof this.bubbleElement.showPopover == "function")
        try {
          this.bubbleElement.showPopover();
        } catch {
        }
      this.containerElement.classList.add("ui-tooltip--visivel"), requestAnimationFrame(() => {
        this.posicionarBubble();
      }), window.addEventListener("scroll", this.posicionarBubble, { capture: !0, passive: !0 }), window.addEventListener("resize", this.posicionarBubble, { passive: !0 });
    } else {
      if (typeof this.bubbleElement.hidePopover == "function")
        try {
          this.bubbleElement.hidePopover();
        } catch {
        }
      this.containerElement.classList.remove("ui-tooltip--visivel"), window.removeEventListener("scroll", this.posicionarBubble, { capture: !0 }), window.removeEventListener("resize", this.posicionarBubble);
    }
  }
}
class qa extends Ho {
}
customElements.get("ui-tooltip") || customElements.define("ui-tooltip", Ho);
customElements.get("ui-popover") || customElements.define("ui-popover", qa);
const Fa = ':host{display:block;width:100%;box-sizing:border-box;font-family:inherit;color:var(--ui-cor-texto, #e1e1e6);position:relative}.ui-tabela-container{width:100%;max-width:100%;max-height:var(--ui-tabela-max-height, 500px);overflow-x:auto;overflow-y:auto;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 6px);background-color:var(--ui-cor-superficie, #141417);box-sizing:border-box;position:relative}.ui-tabela{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:14px}.ui-tabela thead{position:sticky;top:0;z-index:10;background-color:var(--ui-cor-fundo-elevado, #1a1a1e)}.ui-tabela th{position:sticky;top:0;z-index:10;padding:10px 16px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);font-weight:600;border-bottom:2px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));white-space:nowrap;-webkit-user-select:none;user-select:none;box-sizing:border-box}.ui-tabela__resizer{position:absolute;top:0;right:0;width:6px;height:100%;cursor:col-resize;-webkit-user-select:none;user-select:none;z-index:20;transition:background-color .15s ease}.ui-tabela__resizer:hover,.ui-tabela__resizer--ativo{background-color:var(--ui-cor-primaria, #00E08A)}:host([densidade="compacta"]) th,:host([densidade="compacta"]) td,:host([density="compact"]) th,:host([density="compact"]) td{padding:4px 8px}:host([densidade="normal"]) th,:host([densidade="normal"]) td,:host([density="normal"]) th,:host([density="normal"]) td{padding:10px 16px}:host([densidade="relaxada"]) th,:host([densidade="relaxada"]) td,:host([density="relaxed"]) th,:host([density="relaxed"]) td{padding:16px 20px}.ui-tabela__header-content{display:inline-flex;align-items:center;vertical-align:middle;width:100%;box-sizing:border-box}.ui-tabela__header-text{margin-right:90px;display:inline-flex;align-items:center}.ui-tabela__sort-icon,.ui-tabela__header-icon{width:70px;min-width:70px;max-width:70px;display:inline-flex;justify-content:center;align-items:center;transition:transform .2s ease,opacity .2s ease}.ui-tabela th.ui-tabela__th--ordenavel{cursor:pointer}.ui-tabela th.ui-tabela__th--ordenavel:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-tabela__sort-arrow{display:inline-block;width:12px;height:12px;transition:transform .2s ease,fill .2s ease;fill:var(--ui-cor-primaria, #00E08A)}.ui-tabela__sort-arrow--desc{transform:rotate(180deg)}.ui-tabela__sort-arrow--inativo{opacity:.3;fill:var(--ui-cor-texto-secundario, #888899)}.ui-tabela td{padding:10px 16px;border-bottom:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .06));white-space:nowrap;vertical-align:middle;color:var(--ui-cor-texto, #e1e1e6);box-sizing:border-box}.ui-tabela__cell-content{display:inline-flex;align-items:center;vertical-align:middle}.ui-tabela__cell-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.ui-tabela--alinhar-esquerda{text-align:left}.ui-tabela--alinhar-esquerda .ui-tabela__header-content,.ui-tabela--alinhar-esquerda .ui-tabela__cell-content{justify-content:flex-start}.ui-tabela--alinhar-centro{text-align:center}.ui-tabela--alinhar-centro .ui-tabela__header-content,.ui-tabela--alinhar-centro .ui-tabela__cell-content{justify-content:center}.ui-tabela--alinhar-direita{text-align:right}.ui-tabela--alinhar-direita .ui-tabela__header-content,.ui-tabela--alinhar-direita .ui-tabela__cell-content{justify-content:flex-end}.ui-tabela tbody tr:nth-child(2n){background-color:var(--ui-cor-fundo-card, rgba(255, 255, 255, .02))}.ui-tabela tbody tr:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-tabela__virtual-spacer td{padding:0!important;border:none!important;height:inherit;background:transparent!important}.ui-tabela__empty{padding:48px 24px;text-align:center;border:2px dashed var(--ui-cor-borda, rgba(255, 255, 255, .2));border-radius:var(--ui-raio-borda, 6px);margin:16px;color:var(--ui-cor-texto-secundario, #888899);background-color:var(--ui-cor-fundo, #0b0b0d);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;box-sizing:border-box}.ui-tabela__empty-icon{width:32px;height:32px;opacity:.5;fill:currentColor}.ui-tabela__empty-text{font-size:14px;font-weight:500;color:var(--ui-cor-texto-secundario, #888899)}.ui-tabela__context-menu{position:absolute;z-index:100;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .2));border-radius:var(--ui-raio-borda, 6px);box-shadow:0 4px 20px #0009;padding:6px;display:flex;flex-direction:column;gap:4px;min-width:200px;font-size:13px;color:var(--ui-cor-texto, #e1e1e6)}.ui-tabela__context-item{padding:8px 12px;border-radius:4px;cursor:pointer;color:var(--ui-cor-texto, #e1e1e6);display:flex;align-items:center;justify-content:space-between;gap:8px;transition:background-color .15s ease}.ui-tabela__context-item:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08));color:var(--ui-cor-primaria, #00E08A)}.ui-tabela__prompt-dialog{border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .2));border-radius:var(--ui-raio-borda, 6px);background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);padding:12px;box-shadow:0 8px 32px #000c;font-family:inherit;font-size:14px}.ui-tabela__prompt-dialog::backdrop{background:#0000004d}.ui-tabela__prompt-title{margin-bottom:8px;font-weight:500}.ui-tabela__prompt-dialog input{width:100%;padding:6px 8px;border-radius:4px;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .2));background:var(--ui-cor-superficie, #141417);color:var(--ui-cor-texto, #e1e1e6);margin-bottom:12px;box-sizing:border-box}.ui-tabela__prompt-actions{display:flex;justify-content:flex-end;gap:8px}.ui-tabela__prompt-actions button{background:var(--ui-cor-borda, rgba(255, 255, 255, .12));color:var(--ui-cor-texto, #e1e1e6);border:none;padding:6px 12px;border-radius:4px;cursor:pointer}.ui-tabela__prompt-actions button:last-child{background:var(--ui-cor-primaria, #00E08A);color:#000;font-weight:600}';
class Wa extends HTMLElement {
  constructor() {
    super();
    m(this, "shadow");
    m(this, "_colunas", []);
    m(this, "_dadosOriginais", []);
    m(this, "_dadosExibicao", []);
    m(this, "_colunaOrdenada", null);
    m(this, "_direcaoOrdenacao", "original");
    m(this, "_textoVazio", "Nenhum registro encontrado");
    m(this, "_virtualizar", !0);
    m(this, "_isResizing", !1);
    // Gerenciamento de Ouvintes e Elementos DOM
    m(this, "_containerElement", null);
    m(this, "_tableElement", null);
    m(this, "_theadElement", null);
    m(this, "_tbodyElement", null);
    m(this, "_colgroupElement", null);
    m(this, "_emptyElement", null);
    m(this, "_scrollHandler", null);
    m(this, "_activeResizeCleanup", null);
    m(this, "_headerEventListeners", []);
    m(this, "_ticking", !1);
    this.shadow = this.attachShadow({ mode: "open" });
  }
  static get observedAttributes() {
    return ["texto-vazio", "empty-text", "max-height", "densidade", "density", "virtualizar", "virtualize"];
  }
  connectedCallback() {
    this.syncAttributes(), !this.hasAttribute("densidade") && !this.hasAttribute("density") && this.setAttribute("densidade", "normal"), this.renderTotal();
  }
  disconnectedCallback() {
    this.cleanupEventListeners();
  }
  attributeChangedCallback(o, s, r) {
    this.syncAttributes(), this.renderTotal();
  }
  syncAttributes() {
    const o = this.getAttribute("texto-vazio") || this.getAttribute("empty-text");
    o && (this._textoVazio = o);
    const s = this.getAttribute("virtualizar") || this.getAttribute("virtualize");
    s !== null && (this._virtualizar = s !== "false");
  }
  cleanupEventListeners() {
    this._containerElement && this._scrollHandler && (this._containerElement.removeEventListener("scroll", this._scrollHandler), this._scrollHandler = null), this._activeResizeCleanup && (this._activeResizeCleanup(), this._activeResizeCleanup = null), this._headerEventListeners.forEach(({ element: o, type: s, listener: r }) => {
      o.removeEventListener(s, r);
    }), this._headerEventListeners = [];
  }
  addHeaderListener(o, s, r) {
    o.addEventListener(s, r), this._headerEventListeners.push({ element: o, type: s, listener: r });
  }
  // Getters & Setters Reativos
  get colunas() {
    return this._colunas;
  }
  set colunas(o) {
    this._colunas = Array.isArray(o) ? o : [], this.renderTotal();
  }
  get dados() {
    return this._dadosOriginais;
  }
  set dados(o) {
    const s = Array.isArray(o) ? o : [];
    this._dadosOriginais = [...s], this.aplicarOrdenacao(), this.renderBody();
  }
  get densidade() {
    const o = this.getAttribute("densidade") || this.getAttribute("density");
    return o === "compacta" || o === "compact" ? "compacta" : o === "relaxada" || o === "relaxed" ? "relaxada" : "normal";
  }
  set densidade(o) {
    o ? this.setAttribute("densidade", o) : (this.removeAttribute("densidade"), this.removeAttribute("density")), this.renderBody();
  }
  get virtualizar() {
    return this._virtualizar;
  }
  set virtualizar(o) {
    this._virtualizar = !!o, this._virtualizar ? this.setAttribute("virtualizar", "true") : this.removeAttribute("virtualizar"), this.renderTotal();
  }
  get colunaOrdenada() {
    return this._colunaOrdenada;
  }
  set colunaOrdenada(o) {
    this._colunaOrdenada = o, o ? this._direcaoOrdenacao === "original" && (this._direcaoOrdenacao = "asc") : this._direcaoOrdenacao = "original", this.aplicarOrdenacao(), this.renderHeader(), this.renderBody();
  }
  get direcaoOrdenacao() {
    return this._direcaoOrdenacao;
  }
  set direcaoOrdenacao(o) {
    this._direcaoOrdenacao = o || "original", this._direcaoOrdenacao === "original" && (this._colunaOrdenada = null), this.aplicarOrdenacao(), this.renderHeader(), this.renderBody();
  }
  get textoVazio() {
    return this._textoVazio;
  }
  set textoVazio(o) {
    this._textoVazio = o || "Nenhum registro encontrado", this.renderTotal();
  }
  // Ordenação Local Client-Side de 3 Estados
  handleHeaderClick(o) {
    if (!o.ordenavel || this._isResizing) return;
    this._colunaOrdenada !== o.id ? (this._colunaOrdenada = o.id, this._direcaoOrdenacao = "asc") : this._direcaoOrdenacao === "asc" ? this._direcaoOrdenacao = "desc" : this._direcaoOrdenacao === "desc" ? (this._direcaoOrdenacao = "original", this._colunaOrdenada = null) : (this._direcaoOrdenacao = "asc", this._colunaOrdenada = o.id), this.aplicarOrdenacao(), this.renderHeader(), this.renderBody();
    const s = {
      idColuna: this._colunaOrdenada,
      direcao: this._direcaoOrdenacao
    };
    this.dispatchEvent(
      new CustomEvent("ui-sort", {
        detail: s,
        bubbles: !0,
        composed: !0
      })
    );
  }
  aplicarOrdenacao() {
    if (!this._colunaOrdenada || this._direcaoOrdenacao === "original") {
      this._dadosExibicao = [...this._dadosOriginais];
      return;
    }
    const o = this._colunaOrdenada, s = this._direcaoOrdenacao === "asc" ? 1 : -1;
    this._dadosExibicao = [...this._dadosOriginais].sort((r, d) => {
      const h = r[o], p = d[o];
      return h === p ? 0 : h == null ? 1 * s : p == null ? -1 * s : typeof h == "number" && typeof p == "number" ? (h - p) * s : String(h).localeCompare(String(p), "pt-BR", { numeric: !0, sensitivity: "base" }) * s;
    });
  }
  // Redimensionamento de Colunas (Drag-to-resize)
  initColumnResize(o, s, r, d, h) {
    var z;
    o.stopPropagation(), o.preventDefault(), this._isResizing = !0, h.classList.add("ui-tabela__resizer--ativo");
    const p = o.pageX, f = d.offsetWidth, b = (z = this._colgroupElement) == null ? void 0 : z.children[r], y = (C) => {
      const k = C.pageX - p;
      let w = f + k;
      if (s.larguraMinima !== void 0) {
        const A = typeof s.larguraMinima == "number" ? s.larguraMinima : parseInt(s.larguraMinima, 10);
        isNaN(A) || (w = Math.max(A, w));
      } else
        w = Math.max(60, w);
      if (s.larguraMaxima !== void 0) {
        const A = typeof s.larguraMaxima == "number" ? s.larguraMaxima : parseInt(s.larguraMaxima, 10);
        isNaN(A) || (w = Math.min(A, w));
      }
      s.largura = `${w}px`, d.style.width = `${w}px`, b && (b.style.width = `${w}px`);
    }, v = () => {
      h.classList.remove("ui-tabela__resizer--ativo"), window.removeEventListener("mousemove", y), window.removeEventListener("mouseup", E), this._activeResizeCleanup = null, setTimeout(() => {
        this._isResizing = !1;
      }, 50);
    }, E = () => {
      v(), this.dispatchEvent(
        new CustomEvent("ui-column-resize", {
          detail: {
            idColuna: s.id,
            largura: String(s.largura)
          },
          bubbles: !0,
          composed: !0
        })
      );
    };
    this._activeResizeCleanup = v, window.addEventListener("mousemove", y), window.addEventListener("mouseup", E);
  }
  // Mini-Popover de Redimensionamento Exato
  showPromptPopover(o, s, r, d) {
    const h = document.createElement("dialog");
    h.className = "ui-tabela__prompt-dialog", h.style.position = "fixed", h.style.left = `${o.clientX}px`, h.style.top = `${o.clientY}px`;
    const p = document.createElement("div");
    p.className = "ui-tabela__prompt-title", p.textContent = `Largura para "${s.rotulo}" (px ou auto):`;
    const f = document.createElement("input");
    f.type = "text";
    const b = s.largura ? String(s.largura).replace("px", "") : "auto";
    f.value = b;
    const y = document.createElement("div");
    y.className = "ui-tabela__prompt-actions";
    const v = document.createElement("button");
    v.textContent = "Aplicar";
    const E = document.createElement("button");
    E.textContent = "Cancelar", y.appendChild(E), y.appendChild(v), h.appendChild(p), h.appendChild(f), h.appendChild(y), this.shadow.appendChild(h), h.showModal();
    const z = () => {
      var w, A;
      const k = f.value.trim().toLowerCase();
      if (k === "" || k === "auto")
        s.largura = void 0, d.style.width = "", (w = this._colgroupElement) != null && w.children[r] && (this._colgroupElement.children[r].style.width = "");
      else {
        const H = parseInt(k, 10);
        !isNaN(H) && H > 20 && (s.largura = `${H}px`, d.style.width = `${H}px`, (A = this._colgroupElement) != null && A.children[r] && (this._colgroupElement.children[r].style.width = `${H}px`));
      }
      h.close(), h.remove(), this.dispatchEvent(
        new CustomEvent("ui-column-resize", {
          detail: {
            idColuna: s.id,
            largura: s.largura ? String(s.largura) : "auto"
          },
          bubbles: !0,
          composed: !0
        })
      );
    };
    v.addEventListener("click", z), E.addEventListener("click", () => {
      h.close(), h.remove();
    }), f.addEventListener("keydown", (C) => {
      C.key === "Enter" && z(), C.key === "Escape" && (h.close(), h.remove());
    }), f.focus(), f.select();
  }
  handleHeaderContextMenu(o, s, r, d) {
    o.preventDefault(), o.stopPropagation(), this.showPromptPopover(o, s, r, d);
  }
  formatWidth(o) {
    return o == null || o === "" ? "" : typeof o == "number" ? `${o}px` : o;
  }
  getAlignmentClass(o) {
    return o === "centro" || o === "center" ? "ui-tabela--alinhar-centro" : o === "direita" || o === "right" ? "ui-tabela--alinhar-direita" : "ui-tabela--alinhar-esquerda";
  }
  getTextAlign(o) {
    return o === "centro" || o === "center" ? "center" : o === "direita" || o === "right" ? "right" : "left";
  }
  getRowHeight() {
    const o = this.densidade;
    return o === "compacta" ? 30 : o === "relaxada" ? 56 : 42;
  }
  // Renderiza toda a estrutura (Container, Table, Thead)
  renderTotal() {
    if (!this.shadow) return;
    this.cleanupEventListeners(), this.shadow.innerHTML = `<style>${Fa}</style>`;
    const o = this.getAttribute("max-height"), s = document.createElement("div");
    s.className = "ui-tabela-container", o && (s.style.maxHeight = o), this._containerElement = s;
    const r = document.createElement("div");
    r.className = "ui-tabela__empty", r.style.display = "none";
    const d = document.createElement("div");
    d.innerHTML = `
      <svg class="ui-tabela__empty-icon" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
      </svg>`;
    const h = document.createElement("span");
    h.className = "ui-tabela__empty-text", h.textContent = this._textoVazio, r.appendChild(d), r.appendChild(h), this._emptyElement = r, this._tableElement = document.createElement("table"), this._tableElement.className = "ui-tabela", this._colgroupElement = document.createElement("colgroup"), this._theadElement = document.createElement("thead"), this._tbodyElement = document.createElement("tbody"), this._tableElement.appendChild(this._colgroupElement), this._tableElement.appendChild(this._theadElement), this._tableElement.appendChild(this._tbodyElement), s.appendChild(this._emptyElement), s.appendChild(this._tableElement), this.shadow.appendChild(s), this.renderHeader(), this.renderBody(), this._virtualizar && this._containerElement && (this._ticking = !1, this._scrollHandler = () => {
      this._ticking || (window.requestAnimationFrame(() => {
        this.renderBody(), this._ticking = !1;
      }), this._ticking = !0);
    }, this._containerElement.addEventListener("scroll", this._scrollHandler));
  }
  // Renderiza apenas os cabeçalhos (Thead e Colgroup)
  renderHeader() {
    if (!this._theadElement || !this._colgroupElement) return;
    this._headerEventListeners.forEach(({ element: s, type: r, listener: d }) => {
      s.removeEventListener(r, d);
    }), this._headerEventListeners = [], this._theadElement.innerHTML = "", this._colgroupElement.innerHTML = "";
    const o = document.createElement("tr");
    this._colunas.forEach((s, r) => {
      const d = document.createElement("col");
      s.largura !== void 0 && (d.style.width = this.formatWidth(s.largura)), this._colgroupElement.appendChild(d);
      const h = document.createElement("th"), p = this.getAlignmentClass(s.alinhamento);
      if (h.className = p, h.style.textAlign = this.getTextAlign(s.alinhamento), s.largura !== void 0 && (h.style.width = this.formatWidth(s.largura)), s.larguraMinima !== void 0 && (h.style.minWidth = this.formatWidth(s.larguraMinima)), s.larguraMaxima !== void 0) {
        const k = this.formatWidth(s.larguraMaxima);
        h.style.maxWidth = k, h.style.overflow = "hidden", h.style.textOverflow = "ellipsis", h.style.whiteSpace = "nowrap";
      }
      if (s.tooltip && (h.title = s.tooltip), s.ordenavel) {
        h.classList.add("ui-tabela__th--ordenavel");
        const k = () => this.handleHeaderClick(s);
        this.addHeaderListener(h, "click", k);
      }
      const f = (k) => this.handleHeaderContextMenu(k, s, r, h);
      this.addHeaderListener(h, "contextmenu", f);
      const b = document.createElement("div");
      b.className = "ui-tabela__header-content";
      const y = document.createElement("span");
      y.className = "ui-tabela__header-text", y.textContent = s.rotulo, b.appendChild(y);
      const v = document.createElement("span");
      if (v.className = "ui-tabela__sort-icon", s.ordenavel) {
        const k = this._colunaOrdenada === s.id && this._direcaoOrdenacao !== "original", w = k && this._direcaoOrdenacao === "desc", A = k ? "" : "ui-tabela__sort-arrow--inativo", H = w ? "ui-tabela__sort-arrow--desc" : "";
        v.innerHTML = `
          <svg class="ui-tabela__sort-arrow ${A} ${H}" viewBox="0 0 24 24">
            <path d="M7 14l5-5 5 5H7z"/>
          </svg>
        `;
      }
      b.appendChild(v), h.appendChild(b);
      const E = document.createElement("div");
      E.className = "ui-tabela__resizer", E.title = "Arrastar para redimensionar largura (duplo-clique para auto-ajuste)";
      const z = (k) => this.initColumnResize(k, s, r, h, E);
      this.addHeaderListener(E, "mousedown", z);
      const C = (k) => {
        k.stopPropagation(), s.largura = void 0, h.style.width = "", d.style.width = "", this.dispatchEvent(new CustomEvent("ui-column-resize", { bubbles: !0, composed: !0, detail: { idColuna: s.id, largura: "auto" } }));
      };
      this.addHeaderListener(E, "dblclick", C), h.appendChild(E), o.appendChild(h);
    }), this._theadElement.appendChild(o);
  }
  // Renderiza apenas o corpo, preservando o scroll
  renderBody() {
    if (!this._tbodyElement || !this._tableElement || !this._emptyElement || !this._containerElement) return;
    if (!this._dadosExibicao || this._dadosExibicao.length === 0) {
      this._emptyElement.style.display = "flex", this._tableElement.style.display = "none";
      return;
    }
    this._emptyElement.style.display = "none", this._tableElement.style.display = "table";
    const o = this._dadosExibicao.length, s = this.getRowHeight(), r = this._virtualizar && o > 30;
    let d = 0, h = o;
    if (r) {
      const f = this._containerElement.scrollTop, b = this._containerElement.clientHeight || 400, y = 5;
      d = Math.max(0, Math.floor(f / s) - y), h = Math.min(o, Math.ceil((f + b) / s) + y);
    }
    this._tbodyElement.innerHTML = "";
    const p = document.createDocumentFragment();
    if (r && d > 0) {
      const f = document.createElement("tr");
      f.className = "ui-tabela__virtual-spacer", f.style.height = `${d * s}px`;
      const b = document.createElement("td");
      b.colSpan = this._colunas.length || 1, f.appendChild(b), p.appendChild(f);
    }
    for (let f = d; f < h; f++) {
      const b = this._dadosExibicao[f], y = document.createElement("tr");
      this._colunas.forEach((v) => {
        const E = document.createElement("td"), z = this.getAlignmentClass(v.alinhamento);
        if (E.className = z, E.style.textAlign = this.getTextAlign(v.alinhamento), v.larguraMaxima !== void 0) {
          const w = this.formatWidth(v.larguraMaxima);
          E.style.maxWidth = w, E.style.overflow = "hidden", E.style.textOverflow = "ellipsis", E.style.whiteSpace = "nowrap";
        }
        const C = document.createElement("div");
        C.className = "ui-tabela__cell-content", v.larguraMaxima !== void 0 && C.classList.add("ui-tabela__cell-truncate");
        const k = b[v.id];
        if (typeof v.render == "function") {
          const w = v.render(k, b, f);
          w instanceof Node ? C.appendChild(w) : C.textContent = String(w ?? "");
        } else if (k instanceof Node)
          C.appendChild(k);
        else {
          const w = k != null ? String(k) : "";
          C.textContent = w, v.larguraMaxima !== void 0 && !v.tooltip && (E.title = w);
        }
        E.appendChild(C), y.appendChild(E);
      }), p.appendChild(y);
    }
    if (r && h < o) {
      const f = document.createElement("tr");
      f.className = "ui-tabela__virtual-spacer", f.style.height = `${(o - h) * s}px`;
      const b = document.createElement("td");
      b.colSpan = this._colunas.length || 1, f.appendChild(b), p.appendChild(f);
    }
    this._tbodyElement.appendChild(p);
  }
}
customElements.get("ui-tabela") || customElements.define("ui-tabela", Wa);
var $a = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Va(M) {
  return M && M.__esModule && Object.prototype.hasOwnProperty.call(M, "default") ? M.default : M;
}
var pi = { exports: {} };
/* @preserve
 * Leaflet 1.9.4, a JS library for interactive maps. https://leafletjs.com
 * (c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade
 */
(function(M, c) {
  (function(o, s) {
    s(c);
  })($a, function(o) {
    var s = "1.9.4";
    function r(t) {
      var e, i, n, a;
      for (i = 1, n = arguments.length; i < n; i++) {
        a = arguments[i];
        for (e in a)
          t[e] = a[e];
      }
      return t;
    }
    var d = Object.create || /* @__PURE__ */ function() {
      function t() {
      }
      return function(e) {
        return t.prototype = e, new t();
      };
    }();
    function h(t, e) {
      var i = Array.prototype.slice;
      if (t.bind)
        return t.bind.apply(t, i.call(arguments, 1));
      var n = i.call(arguments, 2);
      return function() {
        return t.apply(e, n.length ? n.concat(i.call(arguments)) : arguments);
      };
    }
    var p = 0;
    function f(t) {
      return "_leaflet_id" in t || (t._leaflet_id = ++p), t._leaflet_id;
    }
    function b(t, e, i) {
      var n, a, l, u;
      return u = function() {
        n = !1, a && (l.apply(i, a), a = !1);
      }, l = function() {
        n ? a = arguments : (t.apply(i, arguments), setTimeout(u, e), n = !0);
      }, l;
    }
    function y(t, e, i) {
      var n = e[1], a = e[0], l = n - a;
      return t === n && i ? t : ((t - a) % l + l) % l + a;
    }
    function v() {
      return !1;
    }
    function E(t, e) {
      if (e === !1)
        return t;
      var i = Math.pow(10, e === void 0 ? 6 : e);
      return Math.round(t * i) / i;
    }
    function z(t) {
      return t.trim ? t.trim() : t.replace(/^\s+|\s+$/g, "");
    }
    function C(t) {
      return z(t).split(/\s+/);
    }
    function k(t, e) {
      Object.prototype.hasOwnProperty.call(t, "options") || (t.options = t.options ? d(t.options) : {});
      for (var i in e)
        t.options[i] = e[i];
      return t.options;
    }
    function w(t, e, i) {
      var n = [];
      for (var a in t)
        n.push(encodeURIComponent(i ? a.toUpperCase() : a) + "=" + encodeURIComponent(t[a]));
      return (!e || e.indexOf("?") === -1 ? "?" : "&") + n.join("&");
    }
    var A = /\{ *([\w_ -]+) *\}/g;
    function H(t, e) {
      return t.replace(A, function(i, n) {
        var a = e[n];
        if (a === void 0)
          throw new Error("No value provided for variable " + i);
        return typeof a == "function" && (a = a(e)), a;
      });
    }
    var V = Array.isArray || function(t) {
      return Object.prototype.toString.call(t) === "[object Array]";
    };
    function U(t, e) {
      for (var i = 0; i < t.length; i++)
        if (t[i] === e)
          return i;
      return -1;
    }
    var T = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    function it(t) {
      return window["webkit" + t] || window["moz" + t] || window["ms" + t];
    }
    var J = 0;
    function Dt(t) {
      var e = +/* @__PURE__ */ new Date(), i = Math.max(0, 16 - (e - J));
      return J = e + i, window.setTimeout(t, i);
    }
    var ze = window.requestAnimationFrame || it("RequestAnimationFrame") || Dt, xi = window.cancelAnimationFrame || it("CancelAnimationFrame") || it("CancelRequestAnimationFrame") || function(t) {
      window.clearTimeout(t);
    };
    function rt(t, e, i) {
      if (i && ze === Dt)
        t.call(e);
      else
        return ze.call(window, h(t, e));
    }
    function pt(t) {
      t && xi.call(window, t);
    }
    var Fo = {
      __proto__: null,
      extend: r,
      create: d,
      bind: h,
      get lastId() {
        return p;
      },
      stamp: f,
      throttle: b,
      wrapNum: y,
      falseFn: v,
      formatNum: E,
      trim: z,
      splitWords: C,
      setOptions: k,
      getParamString: w,
      template: H,
      isArray: V,
      indexOf: U,
      emptyImageUrl: T,
      requestFn: ze,
      cancelFn: xi,
      requestAnimFrame: rt,
      cancelAnimFrame: pt
    };
    function Et() {
    }
    Et.extend = function(t) {
      var e = function() {
        k(this), this.initialize && this.initialize.apply(this, arguments), this.callInitHooks();
      }, i = e.__super__ = this.prototype, n = d(i);
      n.constructor = e, e.prototype = n;
      for (var a in this)
        Object.prototype.hasOwnProperty.call(this, a) && a !== "prototype" && a !== "__super__" && (e[a] = this[a]);
      return t.statics && r(e, t.statics), t.includes && (Wo(t.includes), r.apply(null, [n].concat(t.includes))), r(n, t), delete n.statics, delete n.includes, n.options && (n.options = i.options ? d(i.options) : {}, r(n.options, t.options)), n._initHooks = [], n.callInitHooks = function() {
        if (!this._initHooksCalled) {
          i.callInitHooks && i.callInitHooks.call(this), this._initHooksCalled = !0;
          for (var l = 0, u = n._initHooks.length; l < u; l++)
            n._initHooks[l].call(this);
        }
      }, e;
    }, Et.include = function(t) {
      var e = this.prototype.options;
      return r(this.prototype, t), t.options && (this.prototype.options = e, this.mergeOptions(t.options)), this;
    }, Et.mergeOptions = function(t) {
      return r(this.prototype.options, t), this;
    }, Et.addInitHook = function(t) {
      var e = Array.prototype.slice.call(arguments, 1), i = typeof t == "function" ? t : function() {
        this[t].apply(this, e);
      };
      return this.prototype._initHooks = this.prototype._initHooks || [], this.prototype._initHooks.push(i), this;
    };
    function Wo(t) {
      if (!(typeof L > "u" || !L || !L.Mixin)) {
        t = V(t) ? t : [t];
        for (var e = 0; e < t.length; e++)
          t[e] === L.Mixin.Events && console.warn("Deprecated include of L.Mixin.Events: this property will be removed in future releases, please inherit from L.Evented instead.", new Error().stack);
      }
    }
    var ut = {
      /* @method on(type: String, fn: Function, context?: Object): this
       * Adds a listener function (`fn`) to a particular event type of the object. You can optionally specify the context of the listener (object the this keyword will point to). You can also pass several space-separated types (e.g. `'click dblclick'`).
       *
       * @alternative
       * @method on(eventMap: Object): this
       * Adds a set of type/listener pairs, e.g. `{click: onClick, mousemove: onMouseMove}`
       */
      on: function(t, e, i) {
        if (typeof t == "object")
          for (var n in t)
            this._on(n, t[n], e);
        else {
          t = C(t);
          for (var a = 0, l = t.length; a < l; a++)
            this._on(t[a], e, i);
        }
        return this;
      },
      /* @method off(type: String, fn?: Function, context?: Object): this
       * Removes a previously added listener function. If no function is specified, it will remove all the listeners of that particular event from the object. Note that if you passed a custom context to `on`, you must pass the same context to `off` in order to remove the listener.
       *
       * @alternative
       * @method off(eventMap: Object): this
       * Removes a set of type/listener pairs.
       *
       * @alternative
       * @method off: this
       * Removes all listeners to all events on the object. This includes implicitly attached events.
       */
      off: function(t, e, i) {
        if (!arguments.length)
          delete this._events;
        else if (typeof t == "object")
          for (var n in t)
            this._off(n, t[n], e);
        else {
          t = C(t);
          for (var a = arguments.length === 1, l = 0, u = t.length; l < u; l++)
            a ? this._off(t[l]) : this._off(t[l], e, i);
        }
        return this;
      },
      // attach listener (without syntactic sugar now)
      _on: function(t, e, i, n) {
        if (typeof e != "function") {
          console.warn("wrong listener type: " + typeof e);
          return;
        }
        if (this._listens(t, e, i) === !1) {
          i === this && (i = void 0);
          var a = { fn: e, ctx: i };
          n && (a.once = !0), this._events = this._events || {}, this._events[t] = this._events[t] || [], this._events[t].push(a);
        }
      },
      _off: function(t, e, i) {
        var n, a, l;
        if (this._events && (n = this._events[t], !!n)) {
          if (arguments.length === 1) {
            if (this._firingCount)
              for (a = 0, l = n.length; a < l; a++)
                n[a].fn = v;
            delete this._events[t];
            return;
          }
          if (typeof e != "function") {
            console.warn("wrong listener type: " + typeof e);
            return;
          }
          var u = this._listens(t, e, i);
          if (u !== !1) {
            var g = n[u];
            this._firingCount && (g.fn = v, this._events[t] = n = n.slice()), n.splice(u, 1);
          }
        }
      },
      // @method fire(type: String, data?: Object, propagate?: Boolean): this
      // Fires an event of the specified type. You can optionally provide a data
      // object — the first argument of the listener function will contain its
      // properties. The event can optionally be propagated to event parents.
      fire: function(t, e, i) {
        if (!this.listens(t, i))
          return this;
        var n = r({}, e, {
          type: t,
          target: this,
          sourceTarget: e && e.sourceTarget || this
        });
        if (this._events) {
          var a = this._events[t];
          if (a) {
            this._firingCount = this._firingCount + 1 || 1;
            for (var l = 0, u = a.length; l < u; l++) {
              var g = a[l], _ = g.fn;
              g.once && this.off(t, _, g.ctx), _.call(g.ctx || this, n);
            }
            this._firingCount--;
          }
        }
        return i && this._propagateEvent(n), this;
      },
      // @method listens(type: String, propagate?: Boolean): Boolean
      // @method listens(type: String, fn: Function, context?: Object, propagate?: Boolean): Boolean
      // Returns `true` if a particular event type has any listeners attached to it.
      // The verification can optionally be propagated, it will return `true` if parents have the listener attached to it.
      listens: function(t, e, i, n) {
        typeof t != "string" && console.warn('"string" type argument expected');
        var a = e;
        typeof e != "function" && (n = !!e, a = void 0, i = void 0);
        var l = this._events && this._events[t];
        if (l && l.length && this._listens(t, a, i) !== !1)
          return !0;
        if (n) {
          for (var u in this._eventParents)
            if (this._eventParents[u].listens(t, e, i, n))
              return !0;
        }
        return !1;
      },
      // returns the index (number) or false
      _listens: function(t, e, i) {
        if (!this._events)
          return !1;
        var n = this._events[t] || [];
        if (!e)
          return !!n.length;
        i === this && (i = void 0);
        for (var a = 0, l = n.length; a < l; a++)
          if (n[a].fn === e && n[a].ctx === i)
            return a;
        return !1;
      },
      // @method once(…): this
      // Behaves as [`on(…)`](#evented-on), except the listener will only get fired once and then removed.
      once: function(t, e, i) {
        if (typeof t == "object")
          for (var n in t)
            this._on(n, t[n], e, !0);
        else {
          t = C(t);
          for (var a = 0, l = t.length; a < l; a++)
            this._on(t[a], e, i, !0);
        }
        return this;
      },
      // @method addEventParent(obj: Evented): this
      // Adds an event parent - an `Evented` that will receive propagated events
      addEventParent: function(t) {
        return this._eventParents = this._eventParents || {}, this._eventParents[f(t)] = t, this;
      },
      // @method removeEventParent(obj: Evented): this
      // Removes an event parent, so it will stop receiving propagated events
      removeEventParent: function(t) {
        return this._eventParents && delete this._eventParents[f(t)], this;
      },
      _propagateEvent: function(t) {
        for (var e in this._eventParents)
          this._eventParents[e].fire(t.type, r({
            layer: t.target,
            propagatedFrom: t.target
          }, t), !0);
      }
    };
    ut.addEventListener = ut.on, ut.removeEventListener = ut.clearAllEventListeners = ut.off, ut.addOneTimeEventListener = ut.once, ut.fireEvent = ut.fire, ut.hasEventListeners = ut.listens;
    var Yt = Et.extend(ut);
    function N(t, e, i) {
      this.x = i ? Math.round(t) : t, this.y = i ? Math.round(e) : e;
    }
    var yi = Math.trunc || function(t) {
      return t > 0 ? Math.floor(t) : Math.ceil(t);
    };
    N.prototype = {
      // @method clone(): Point
      // Returns a copy of the current point.
      clone: function() {
        return new N(this.x, this.y);
      },
      // @method add(otherPoint: Point): Point
      // Returns the result of addition of the current and the given points.
      add: function(t) {
        return this.clone()._add(B(t));
      },
      _add: function(t) {
        return this.x += t.x, this.y += t.y, this;
      },
      // @method subtract(otherPoint: Point): Point
      // Returns the result of subtraction of the given point from the current.
      subtract: function(t) {
        return this.clone()._subtract(B(t));
      },
      _subtract: function(t) {
        return this.x -= t.x, this.y -= t.y, this;
      },
      // @method divideBy(num: Number): Point
      // Returns the result of division of the current point by the given number.
      divideBy: function(t) {
        return this.clone()._divideBy(t);
      },
      _divideBy: function(t) {
        return this.x /= t, this.y /= t, this;
      },
      // @method multiplyBy(num: Number): Point
      // Returns the result of multiplication of the current point by the given number.
      multiplyBy: function(t) {
        return this.clone()._multiplyBy(t);
      },
      _multiplyBy: function(t) {
        return this.x *= t, this.y *= t, this;
      },
      // @method scaleBy(scale: Point): Point
      // Multiply each coordinate of the current point by each coordinate of
      // `scale`. In linear algebra terms, multiply the point by the
      // [scaling matrix](https://en.wikipedia.org/wiki/Scaling_%28geometry%29#Matrix_representation)
      // defined by `scale`.
      scaleBy: function(t) {
        return new N(this.x * t.x, this.y * t.y);
      },
      // @method unscaleBy(scale: Point): Point
      // Inverse of `scaleBy`. Divide each coordinate of the current point by
      // each coordinate of `scale`.
      unscaleBy: function(t) {
        return new N(this.x / t.x, this.y / t.y);
      },
      // @method round(): Point
      // Returns a copy of the current point with rounded coordinates.
      round: function() {
        return this.clone()._round();
      },
      _round: function() {
        return this.x = Math.round(this.x), this.y = Math.round(this.y), this;
      },
      // @method floor(): Point
      // Returns a copy of the current point with floored coordinates (rounded down).
      floor: function() {
        return this.clone()._floor();
      },
      _floor: function() {
        return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this;
      },
      // @method ceil(): Point
      // Returns a copy of the current point with ceiled coordinates (rounded up).
      ceil: function() {
        return this.clone()._ceil();
      },
      _ceil: function() {
        return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this;
      },
      // @method trunc(): Point
      // Returns a copy of the current point with truncated coordinates (rounded towards zero).
      trunc: function() {
        return this.clone()._trunc();
      },
      _trunc: function() {
        return this.x = yi(this.x), this.y = yi(this.y), this;
      },
      // @method distanceTo(otherPoint: Point): Number
      // Returns the cartesian distance between the current and the given points.
      distanceTo: function(t) {
        t = B(t);
        var e = t.x - this.x, i = t.y - this.y;
        return Math.sqrt(e * e + i * i);
      },
      // @method equals(otherPoint: Point): Boolean
      // Returns `true` if the given point has the same coordinates.
      equals: function(t) {
        return t = B(t), t.x === this.x && t.y === this.y;
      },
      // @method contains(otherPoint: Point): Boolean
      // Returns `true` if both coordinates of the given point are less than the corresponding current point coordinates (in absolute values).
      contains: function(t) {
        return t = B(t), Math.abs(t.x) <= Math.abs(this.x) && Math.abs(t.y) <= Math.abs(this.y);
      },
      // @method toString(): String
      // Returns a string representation of the point for debugging purposes.
      toString: function() {
        return "Point(" + E(this.x) + ", " + E(this.y) + ")";
      }
    };
    function B(t, e, i) {
      return t instanceof N ? t : V(t) ? new N(t[0], t[1]) : t == null ? t : typeof t == "object" && "x" in t && "y" in t ? new N(t.x, t.y) : new N(t, e, i);
    }
    function Y(t, e) {
      if (t)
        for (var i = e ? [t, e] : t, n = 0, a = i.length; n < a; n++)
          this.extend(i[n]);
    }
    Y.prototype = {
      // @method extend(point: Point): this
      // Extends the bounds to contain the given point.
      // @alternative
      // @method extend(otherBounds: Bounds): this
      // Extend the bounds to contain the given bounds
      extend: function(t) {
        var e, i;
        if (!t)
          return this;
        if (t instanceof N || typeof t[0] == "number" || "x" in t)
          e = i = B(t);
        else if (t = lt(t), e = t.min, i = t.max, !e || !i)
          return this;
        return !this.min && !this.max ? (this.min = e.clone(), this.max = i.clone()) : (this.min.x = Math.min(e.x, this.min.x), this.max.x = Math.max(i.x, this.max.x), this.min.y = Math.min(e.y, this.min.y), this.max.y = Math.max(i.y, this.max.y)), this;
      },
      // @method getCenter(round?: Boolean): Point
      // Returns the center point of the bounds.
      getCenter: function(t) {
        return B(
          (this.min.x + this.max.x) / 2,
          (this.min.y + this.max.y) / 2,
          t
        );
      },
      // @method getBottomLeft(): Point
      // Returns the bottom-left point of the bounds.
      getBottomLeft: function() {
        return B(this.min.x, this.max.y);
      },
      // @method getTopRight(): Point
      // Returns the top-right point of the bounds.
      getTopRight: function() {
        return B(this.max.x, this.min.y);
      },
      // @method getTopLeft(): Point
      // Returns the top-left point of the bounds (i.e. [`this.min`](#bounds-min)).
      getTopLeft: function() {
        return this.min;
      },
      // @method getBottomRight(): Point
      // Returns the bottom-right point of the bounds (i.e. [`this.max`](#bounds-max)).
      getBottomRight: function() {
        return this.max;
      },
      // @method getSize(): Point
      // Returns the size of the given bounds
      getSize: function() {
        return this.max.subtract(this.min);
      },
      // @method contains(otherBounds: Bounds): Boolean
      // Returns `true` if the rectangle contains the given one.
      // @alternative
      // @method contains(point: Point): Boolean
      // Returns `true` if the rectangle contains the given point.
      contains: function(t) {
        var e, i;
        return typeof t[0] == "number" || t instanceof N ? t = B(t) : t = lt(t), t instanceof Y ? (e = t.min, i = t.max) : e = i = t, e.x >= this.min.x && i.x <= this.max.x && e.y >= this.min.y && i.y <= this.max.y;
      },
      // @method intersects(otherBounds: Bounds): Boolean
      // Returns `true` if the rectangle intersects the given bounds. Two bounds
      // intersect if they have at least one point in common.
      intersects: function(t) {
        t = lt(t);
        var e = this.min, i = this.max, n = t.min, a = t.max, l = a.x >= e.x && n.x <= i.x, u = a.y >= e.y && n.y <= i.y;
        return l && u;
      },
      // @method overlaps(otherBounds: Bounds): Boolean
      // Returns `true` if the rectangle overlaps the given bounds. Two bounds
      // overlap if their intersection is an area.
      overlaps: function(t) {
        t = lt(t);
        var e = this.min, i = this.max, n = t.min, a = t.max, l = a.x > e.x && n.x < i.x, u = a.y > e.y && n.y < i.y;
        return l && u;
      },
      // @method isValid(): Boolean
      // Returns `true` if the bounds are properly initialized.
      isValid: function() {
        return !!(this.min && this.max);
      },
      // @method pad(bufferRatio: Number): Bounds
      // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
      // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
      // Negative values will retract the bounds.
      pad: function(t) {
        var e = this.min, i = this.max, n = Math.abs(e.x - i.x) * t, a = Math.abs(e.y - i.y) * t;
        return lt(
          B(e.x - n, e.y - a),
          B(i.x + n, i.y + a)
        );
      },
      // @method equals(otherBounds: Bounds): Boolean
      // Returns `true` if the rectangle is equivalent to the given bounds.
      equals: function(t) {
        return t ? (t = lt(t), this.min.equals(t.getTopLeft()) && this.max.equals(t.getBottomRight())) : !1;
      }
    };
    function lt(t, e) {
      return !t || t instanceof Y ? t : new Y(t, e);
    }
    function ct(t, e) {
      if (t)
        for (var i = e ? [t, e] : t, n = 0, a = i.length; n < a; n++)
          this.extend(i[n]);
    }
    ct.prototype = {
      // @method extend(latlng: LatLng): this
      // Extend the bounds to contain the given point
      // @alternative
      // @method extend(otherBounds: LatLngBounds): this
      // Extend the bounds to contain the given bounds
      extend: function(t) {
        var e = this._southWest, i = this._northEast, n, a;
        if (t instanceof G)
          n = t, a = t;
        else if (t instanceof ct) {
          if (n = t._southWest, a = t._northEast, !n || !a)
            return this;
        } else
          return t ? this.extend(q(t) || Q(t)) : this;
        return !e && !i ? (this._southWest = new G(n.lat, n.lng), this._northEast = new G(a.lat, a.lng)) : (e.lat = Math.min(n.lat, e.lat), e.lng = Math.min(n.lng, e.lng), i.lat = Math.max(a.lat, i.lat), i.lng = Math.max(a.lng, i.lng)), this;
      },
      // @method pad(bufferRatio: Number): LatLngBounds
      // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
      // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
      // Negative values will retract the bounds.
      pad: function(t) {
        var e = this._southWest, i = this._northEast, n = Math.abs(e.lat - i.lat) * t, a = Math.abs(e.lng - i.lng) * t;
        return new ct(
          new G(e.lat - n, e.lng - a),
          new G(i.lat + n, i.lng + a)
        );
      },
      // @method getCenter(): LatLng
      // Returns the center point of the bounds.
      getCenter: function() {
        return new G(
          (this._southWest.lat + this._northEast.lat) / 2,
          (this._southWest.lng + this._northEast.lng) / 2
        );
      },
      // @method getSouthWest(): LatLng
      // Returns the south-west point of the bounds.
      getSouthWest: function() {
        return this._southWest;
      },
      // @method getNorthEast(): LatLng
      // Returns the north-east point of the bounds.
      getNorthEast: function() {
        return this._northEast;
      },
      // @method getNorthWest(): LatLng
      // Returns the north-west point of the bounds.
      getNorthWest: function() {
        return new G(this.getNorth(), this.getWest());
      },
      // @method getSouthEast(): LatLng
      // Returns the south-east point of the bounds.
      getSouthEast: function() {
        return new G(this.getSouth(), this.getEast());
      },
      // @method getWest(): Number
      // Returns the west longitude of the bounds
      getWest: function() {
        return this._southWest.lng;
      },
      // @method getSouth(): Number
      // Returns the south latitude of the bounds
      getSouth: function() {
        return this._southWest.lat;
      },
      // @method getEast(): Number
      // Returns the east longitude of the bounds
      getEast: function() {
        return this._northEast.lng;
      },
      // @method getNorth(): Number
      // Returns the north latitude of the bounds
      getNorth: function() {
        return this._northEast.lat;
      },
      // @method contains(otherBounds: LatLngBounds): Boolean
      // Returns `true` if the rectangle contains the given one.
      // @alternative
      // @method contains (latlng: LatLng): Boolean
      // Returns `true` if the rectangle contains the given point.
      contains: function(t) {
        typeof t[0] == "number" || t instanceof G || "lat" in t ? t = q(t) : t = Q(t);
        var e = this._southWest, i = this._northEast, n, a;
        return t instanceof ct ? (n = t.getSouthWest(), a = t.getNorthEast()) : n = a = t, n.lat >= e.lat && a.lat <= i.lat && n.lng >= e.lng && a.lng <= i.lng;
      },
      // @method intersects(otherBounds: LatLngBounds): Boolean
      // Returns `true` if the rectangle intersects the given bounds. Two bounds intersect if they have at least one point in common.
      intersects: function(t) {
        t = Q(t);
        var e = this._southWest, i = this._northEast, n = t.getSouthWest(), a = t.getNorthEast(), l = a.lat >= e.lat && n.lat <= i.lat, u = a.lng >= e.lng && n.lng <= i.lng;
        return l && u;
      },
      // @method overlaps(otherBounds: LatLngBounds): Boolean
      // Returns `true` if the rectangle overlaps the given bounds. Two bounds overlap if their intersection is an area.
      overlaps: function(t) {
        t = Q(t);
        var e = this._southWest, i = this._northEast, n = t.getSouthWest(), a = t.getNorthEast(), l = a.lat > e.lat && n.lat < i.lat, u = a.lng > e.lng && n.lng < i.lng;
        return l && u;
      },
      // @method toBBoxString(): String
      // Returns a string with bounding box coordinates in a 'southwest_lng,southwest_lat,northeast_lng,northeast_lat' format. Useful for sending requests to web services that return geo data.
      toBBoxString: function() {
        return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(",");
      },
      // @method equals(otherBounds: LatLngBounds, maxMargin?: Number): Boolean
      // Returns `true` if the rectangle is equivalent (within a small margin of error) to the given bounds. The margin of error can be overridden by setting `maxMargin` to a small number.
      equals: function(t, e) {
        return t ? (t = Q(t), this._southWest.equals(t.getSouthWest(), e) && this._northEast.equals(t.getNorthEast(), e)) : !1;
      },
      // @method isValid(): Boolean
      // Returns `true` if the bounds are properly initialized.
      isValid: function() {
        return !!(this._southWest && this._northEast);
      }
    };
    function Q(t, e) {
      return t instanceof ct ? t : new ct(t, e);
    }
    function G(t, e, i) {
      if (isNaN(t) || isNaN(e))
        throw new Error("Invalid LatLng object: (" + t + ", " + e + ")");
      this.lat = +t, this.lng = +e, i !== void 0 && (this.alt = +i);
    }
    G.prototype = {
      // @method equals(otherLatLng: LatLng, maxMargin?: Number): Boolean
      // Returns `true` if the given `LatLng` point is at the same position (within a small margin of error). The margin of error can be overridden by setting `maxMargin` to a small number.
      equals: function(t, e) {
        if (!t)
          return !1;
        t = q(t);
        var i = Math.max(
          Math.abs(this.lat - t.lat),
          Math.abs(this.lng - t.lng)
        );
        return i <= (e === void 0 ? 1e-9 : e);
      },
      // @method toString(): String
      // Returns a string representation of the point (for debugging purposes).
      toString: function(t) {
        return "LatLng(" + E(this.lat, t) + ", " + E(this.lng, t) + ")";
      },
      // @method distanceTo(otherLatLng: LatLng): Number
      // Returns the distance (in meters) to the given `LatLng` calculated using the [Spherical Law of Cosines](https://en.wikipedia.org/wiki/Spherical_law_of_cosines).
      distanceTo: function(t) {
        return St.distance(this, q(t));
      },
      // @method wrap(): LatLng
      // Returns a new `LatLng` object with the longitude wrapped so it's always between -180 and +180 degrees.
      wrap: function() {
        return St.wrapLatLng(this);
      },
      // @method toBounds(sizeInMeters: Number): LatLngBounds
      // Returns a new `LatLngBounds` object in which each boundary is `sizeInMeters/2` meters apart from the `LatLng`.
      toBounds: function(t) {
        var e = 180 * t / 40075017, i = e / Math.cos(Math.PI / 180 * this.lat);
        return Q(
          [this.lat - e, this.lng - i],
          [this.lat + e, this.lng + i]
        );
      },
      clone: function() {
        return new G(this.lat, this.lng, this.alt);
      }
    };
    function q(t, e, i) {
      return t instanceof G ? t : V(t) && typeof t[0] != "object" ? t.length === 3 ? new G(t[0], t[1], t[2]) : t.length === 2 ? new G(t[0], t[1]) : null : t == null ? t : typeof t == "object" && "lat" in t ? new G(t.lat, "lng" in t ? t.lng : t.lon, t.alt) : e === void 0 ? null : new G(t, e, i);
    }
    var Lt = {
      // @method latLngToPoint(latlng: LatLng, zoom: Number): Point
      // Projects geographical coordinates into pixel coordinates for a given zoom.
      latLngToPoint: function(t, e) {
        var i = this.projection.project(t), n = this.scale(e);
        return this.transformation._transform(i, n);
      },
      // @method pointToLatLng(point: Point, zoom: Number): LatLng
      // The inverse of `latLngToPoint`. Projects pixel coordinates on a given
      // zoom into geographical coordinates.
      pointToLatLng: function(t, e) {
        var i = this.scale(e), n = this.transformation.untransform(t, i);
        return this.projection.unproject(n);
      },
      // @method project(latlng: LatLng): Point
      // Projects geographical coordinates into coordinates in units accepted for
      // this CRS (e.g. meters for EPSG:3857, for passing it to WMS services).
      project: function(t) {
        return this.projection.project(t);
      },
      // @method unproject(point: Point): LatLng
      // Given a projected coordinate returns the corresponding LatLng.
      // The inverse of `project`.
      unproject: function(t) {
        return this.projection.unproject(t);
      },
      // @method scale(zoom: Number): Number
      // Returns the scale used when transforming projected coordinates into
      // pixel coordinates for a particular zoom. For example, it returns
      // `256 * 2^zoom` for Mercator-based CRS.
      scale: function(t) {
        return 256 * Math.pow(2, t);
      },
      // @method zoom(scale: Number): Number
      // Inverse of `scale()`, returns the zoom level corresponding to a scale
      // factor of `scale`.
      zoom: function(t) {
        return Math.log(t / 256) / Math.LN2;
      },
      // @method getProjectedBounds(zoom: Number): Bounds
      // Returns the projection's bounds scaled and transformed for the provided `zoom`.
      getProjectedBounds: function(t) {
        if (this.infinite)
          return null;
        var e = this.projection.bounds, i = this.scale(t), n = this.transformation.transform(e.min, i), a = this.transformation.transform(e.max, i);
        return new Y(n, a);
      },
      // @method distance(latlng1: LatLng, latlng2: LatLng): Number
      // Returns the distance between two geographical coordinates.
      // @property code: String
      // Standard code name of the CRS passed into WMS services (e.g. `'EPSG:3857'`)
      //
      // @property wrapLng: Number[]
      // An array of two numbers defining whether the longitude (horizontal) coordinate
      // axis wraps around a given range and how. Defaults to `[-180, 180]` in most
      // geographical CRSs. If `undefined`, the longitude axis does not wrap around.
      //
      // @property wrapLat: Number[]
      // Like `wrapLng`, but for the latitude (vertical) axis.
      // wrapLng: [min, max],
      // wrapLat: [min, max],
      // @property infinite: Boolean
      // If true, the coordinate space will be unbounded (infinite in both axes)
      infinite: !1,
      // @method wrapLatLng(latlng: LatLng): LatLng
      // Returns a `LatLng` where lat and lng has been wrapped according to the
      // CRS's `wrapLat` and `wrapLng` properties, if they are outside the CRS's bounds.
      wrapLatLng: function(t) {
        var e = this.wrapLng ? y(t.lng, this.wrapLng, !0) : t.lng, i = this.wrapLat ? y(t.lat, this.wrapLat, !0) : t.lat, n = t.alt;
        return new G(i, e, n);
      },
      // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
      // Returns a `LatLngBounds` with the same size as the given one, ensuring
      // that its center is within the CRS's bounds.
      // Only accepts actual `L.LatLngBounds` instances, not arrays.
      wrapLatLngBounds: function(t) {
        var e = t.getCenter(), i = this.wrapLatLng(e), n = e.lat - i.lat, a = e.lng - i.lng;
        if (n === 0 && a === 0)
          return t;
        var l = t.getSouthWest(), u = t.getNorthEast(), g = new G(l.lat - n, l.lng - a), _ = new G(u.lat - n, u.lng - a);
        return new ct(g, _);
      }
    }, St = r({}, Lt, {
      wrapLng: [-180, 180],
      // Mean Earth Radius, as recommended for use by
      // the International Union of Geodesy and Geophysics,
      // see https://rosettacode.org/wiki/Haversine_formula
      R: 6371e3,
      // distance between two geographical points using spherical law of cosines approximation
      distance: function(t, e) {
        var i = Math.PI / 180, n = t.lat * i, a = e.lat * i, l = Math.sin((e.lat - t.lat) * i / 2), u = Math.sin((e.lng - t.lng) * i / 2), g = l * l + Math.cos(n) * Math.cos(a) * u * u, _ = 2 * Math.atan2(Math.sqrt(g), Math.sqrt(1 - g));
        return this.R * _;
      }
    }), wi = 6378137, Te = {
      R: wi,
      MAX_LATITUDE: 85.0511287798,
      project: function(t) {
        var e = Math.PI / 180, i = this.MAX_LATITUDE, n = Math.max(Math.min(i, t.lat), -i), a = Math.sin(n * e);
        return new N(
          this.R * t.lng * e,
          this.R * Math.log((1 + a) / (1 - a)) / 2
        );
      },
      unproject: function(t) {
        var e = 180 / Math.PI;
        return new G(
          (2 * Math.atan(Math.exp(t.y / this.R)) - Math.PI / 2) * e,
          t.x * e / this.R
        );
      },
      bounds: function() {
        var t = wi * Math.PI;
        return new Y([-t, -t], [t, t]);
      }()
    };
    function Ie(t, e, i, n) {
      if (V(t)) {
        this._a = t[0], this._b = t[1], this._c = t[2], this._d = t[3];
        return;
      }
      this._a = t, this._b = e, this._c = i, this._d = n;
    }
    Ie.prototype = {
      // @method transform(point: Point, scale?: Number): Point
      // Returns a transformed point, optionally multiplied by the given scale.
      // Only accepts actual `L.Point` instances, not arrays.
      transform: function(t, e) {
        return this._transform(t.clone(), e);
      },
      // destructive transform (faster)
      _transform: function(t, e) {
        return e = e || 1, t.x = e * (this._a * t.x + this._b), t.y = e * (this._c * t.y + this._d), t;
      },
      // @method untransform(point: Point, scale?: Number): Point
      // Returns the reverse transformation of the given point, optionally divided
      // by the given scale. Only accepts actual `L.Point` instances, not arrays.
      untransform: function(t, e) {
        return e = e || 1, new N(
          (t.x / e - this._b) / this._a,
          (t.y / e - this._d) / this._c
        );
      }
    };
    function Kt(t, e, i, n) {
      return new Ie(t, e, i, n);
    }
    var Oe = r({}, St, {
      code: "EPSG:3857",
      projection: Te,
      transformation: function() {
        var t = 0.5 / (Math.PI * Te.R);
        return Kt(t, 0.5, -t, 0.5);
      }()
    }), $o = r({}, Oe, {
      code: "EPSG:900913"
    });
    function ki(t) {
      return document.createElementNS("http://www.w3.org/2000/svg", t);
    }
    function Ei(t, e) {
      var i = "", n, a, l, u, g, _;
      for (n = 0, l = t.length; n < l; n++) {
        for (g = t[n], a = 0, u = g.length; a < u; a++)
          _ = g[a], i += (a ? "L" : "M") + _.x + " " + _.y;
        i += e ? S.svg ? "z" : "x" : "";
      }
      return i || "M0 0";
    }
    var Be = document.documentElement.style, de = "ActiveXObject" in window, Vo = de && !document.addEventListener, Li = "msLaunchUri" in navigator && !("documentMode" in document), Ne = xt("webkit"), Pi = xt("android"), Ci = xt("android 2") || xt("android 3"), Go = parseInt(/WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1], 10), Uo = Pi && xt("Google") && Go < 537 && !("AudioNode" in window), Ze = !!window.opera, Ai = !Li && xt("chrome"), Mi = xt("gecko") && !Ne && !Ze && !de, jo = !Ai && xt("safari"), Si = xt("phantom"), zi = "OTransition" in Be, Yo = navigator.platform.indexOf("Win") === 0, Ti = de && "transition" in Be, Re = "WebKitCSSMatrix" in window && "m11" in new window.WebKitCSSMatrix() && !Ci, Ii = "MozPerspective" in Be, Ko = !window.L_DISABLE_3D && (Ti || Re || Ii) && !zi && !Si, Xt = typeof orientation < "u" || xt("mobile"), Xo = Xt && Ne, Jo = Xt && Re, Oi = !window.PointerEvent && window.MSPointerEvent, Bi = !!(window.PointerEvent || Oi), Ni = "ontouchstart" in window || !!window.TouchEvent, Qo = !window.L_NO_TOUCH && (Ni || Bi), tn = Xt && Ze, en = Xt && Mi, on = (window.devicePixelRatio || window.screen.deviceXDPI / window.screen.logicalXDPI) > 1, nn = function() {
      var t = !1;
      try {
        var e = Object.defineProperty({}, "passive", {
          get: function() {
            t = !0;
          }
        });
        window.addEventListener("testPassiveEventSupport", v, e), window.removeEventListener("testPassiveEventSupport", v, e);
      } catch {
      }
      return t;
    }(), an = function() {
      return !!document.createElement("canvas").getContext;
    }(), De = !!(document.createElementNS && ki("svg").createSVGRect), sn = !!De && function() {
      var t = document.createElement("div");
      return t.innerHTML = "<svg/>", (t.firstChild && t.firstChild.namespaceURI) === "http://www.w3.org/2000/svg";
    }(), rn = !De && function() {
      try {
        var t = document.createElement("div");
        t.innerHTML = '<v:shape adj="1"/>';
        var e = t.firstChild;
        return e.style.behavior = "url(#default#VML)", e && typeof e.adj == "object";
      } catch {
        return !1;
      }
    }(), ln = navigator.platform.indexOf("Mac") === 0, cn = navigator.platform.indexOf("Linux") === 0;
    function xt(t) {
      return navigator.userAgent.toLowerCase().indexOf(t) >= 0;
    }
    var S = {
      ie: de,
      ielt9: Vo,
      edge: Li,
      webkit: Ne,
      android: Pi,
      android23: Ci,
      androidStock: Uo,
      opera: Ze,
      chrome: Ai,
      gecko: Mi,
      safari: jo,
      phantom: Si,
      opera12: zi,
      win: Yo,
      ie3d: Ti,
      webkit3d: Re,
      gecko3d: Ii,
      any3d: Ko,
      mobile: Xt,
      mobileWebkit: Xo,
      mobileWebkit3d: Jo,
      msPointer: Oi,
      pointer: Bi,
      touch: Qo,
      touchNative: Ni,
      mobileOpera: tn,
      mobileGecko: en,
      retina: on,
      passiveEvents: nn,
      canvas: an,
      svg: De,
      vml: rn,
      inlineSvg: sn,
      mac: ln,
      linux: cn
    }, Zi = S.msPointer ? "MSPointerDown" : "pointerdown", Ri = S.msPointer ? "MSPointerMove" : "pointermove", Di = S.msPointer ? "MSPointerUp" : "pointerup", Hi = S.msPointer ? "MSPointerCancel" : "pointercancel", He = {
      touchstart: Zi,
      touchmove: Ri,
      touchend: Di,
      touchcancel: Hi
    }, qi = {
      touchstart: mn,
      touchmove: ue,
      touchend: ue,
      touchcancel: ue
    }, Ht = {}, Fi = !1;
    function hn(t, e, i) {
      return e === "touchstart" && fn(), qi[e] ? (i = qi[e].bind(this, i), t.addEventListener(He[e], i, !1), i) : (console.warn("wrong event specified:", e), v);
    }
    function dn(t, e, i) {
      if (!He[e]) {
        console.warn("wrong event specified:", e);
        return;
      }
      t.removeEventListener(He[e], i, !1);
    }
    function un(t) {
      Ht[t.pointerId] = t;
    }
    function pn(t) {
      Ht[t.pointerId] && (Ht[t.pointerId] = t);
    }
    function Wi(t) {
      delete Ht[t.pointerId];
    }
    function fn() {
      Fi || (document.addEventListener(Zi, un, !0), document.addEventListener(Ri, pn, !0), document.addEventListener(Di, Wi, !0), document.addEventListener(Hi, Wi, !0), Fi = !0);
    }
    function ue(t, e) {
      if (e.pointerType !== (e.MSPOINTER_TYPE_MOUSE || "mouse")) {
        e.touches = [];
        for (var i in Ht)
          e.touches.push(Ht[i]);
        e.changedTouches = [e], t(e);
      }
    }
    function mn(t, e) {
      e.MSPOINTER_TYPE_TOUCH && e.pointerType === e.MSPOINTER_TYPE_TOUCH && nt(e), ue(t, e);
    }
    function gn(t) {
      var e = {}, i, n;
      for (n in t)
        i = t[n], e[n] = i && i.bind ? i.bind(t) : i;
      return t = e, e.type = "dblclick", e.detail = 2, e.isTrusted = !1, e._simulated = !0, e;
    }
    var _n = 200;
    function vn(t, e) {
      t.addEventListener("dblclick", e);
      var i = 0, n;
      function a(l) {
        if (l.detail !== 1) {
          n = l.detail;
          return;
        }
        if (!(l.pointerType === "mouse" || l.sourceCapabilities && !l.sourceCapabilities.firesTouchEvents)) {
          var u = ji(l);
          if (!(u.some(function(_) {
            return _ instanceof HTMLLabelElement && _.attributes.for;
          }) && !u.some(function(_) {
            return _ instanceof HTMLInputElement || _ instanceof HTMLSelectElement;
          }))) {
            var g = Date.now();
            g - i <= _n ? (n++, n === 2 && e(gn(l))) : n = 1, i = g;
          }
        }
      }
      return t.addEventListener("click", a), {
        dblclick: e,
        simDblclick: a
      };
    }
    function bn(t, e) {
      t.removeEventListener("dblclick", e.dblclick), t.removeEventListener("click", e.simDblclick);
    }
    var qe = me(
      ["transform", "webkitTransform", "OTransform", "MozTransform", "msTransform"]
    ), Jt = me(
      ["webkitTransition", "transition", "OTransition", "MozTransition", "msTransition"]
    ), $i = Jt === "webkitTransition" || Jt === "OTransition" ? Jt + "End" : "transitionend";
    function Vi(t) {
      return typeof t == "string" ? document.getElementById(t) : t;
    }
    function Qt(t, e) {
      var i = t.style[e] || t.currentStyle && t.currentStyle[e];
      if ((!i || i === "auto") && document.defaultView) {
        var n = document.defaultView.getComputedStyle(t, null);
        i = n ? n[e] : null;
      }
      return i === "auto" ? null : i;
    }
    function W(t, e, i) {
      var n = document.createElement(t);
      return n.className = e || "", i && i.appendChild(n), n;
    }
    function K(t) {
      var e = t.parentNode;
      e && e.removeChild(t);
    }
    function pe(t) {
      for (; t.firstChild; )
        t.removeChild(t.firstChild);
    }
    function qt(t) {
      var e = t.parentNode;
      e && e.lastChild !== t && e.appendChild(t);
    }
    function Ft(t) {
      var e = t.parentNode;
      e && e.firstChild !== t && e.insertBefore(t, e.firstChild);
    }
    function Fe(t, e) {
      if (t.classList !== void 0)
        return t.classList.contains(e);
      var i = fe(t);
      return i.length > 0 && new RegExp("(^|\\s)" + e + "(\\s|$)").test(i);
    }
    function R(t, e) {
      if (t.classList !== void 0)
        for (var i = C(e), n = 0, a = i.length; n < a; n++)
          t.classList.add(i[n]);
      else if (!Fe(t, e)) {
        var l = fe(t);
        We(t, (l ? l + " " : "") + e);
      }
    }
    function X(t, e) {
      t.classList !== void 0 ? t.classList.remove(e) : We(t, z((" " + fe(t) + " ").replace(" " + e + " ", " ")));
    }
    function We(t, e) {
      t.className.baseVal === void 0 ? t.className = e : t.className.baseVal = e;
    }
    function fe(t) {
      return t.correspondingElement && (t = t.correspondingElement), t.className.baseVal === void 0 ? t.className : t.className.baseVal;
    }
    function ft(t, e) {
      "opacity" in t.style ? t.style.opacity = e : "filter" in t.style && xn(t, e);
    }
    function xn(t, e) {
      var i = !1, n = "DXImageTransform.Microsoft.Alpha";
      try {
        i = t.filters.item(n);
      } catch {
        if (e === 1)
          return;
      }
      e = Math.round(e * 100), i ? (i.Enabled = e !== 100, i.Opacity = e) : t.style.filter += " progid:" + n + "(opacity=" + e + ")";
    }
    function me(t) {
      for (var e = document.documentElement.style, i = 0; i < t.length; i++)
        if (t[i] in e)
          return t[i];
      return !1;
    }
    function It(t, e, i) {
      var n = e || new N(0, 0);
      t.style[qe] = (S.ie3d ? "translate(" + n.x + "px," + n.y + "px)" : "translate3d(" + n.x + "px," + n.y + "px,0)") + (i ? " scale(" + i + ")" : "");
    }
    function tt(t, e) {
      t._leaflet_pos = e, S.any3d ? It(t, e) : (t.style.left = e.x + "px", t.style.top = e.y + "px");
    }
    function Ot(t) {
      return t._leaflet_pos || new N(0, 0);
    }
    var te, ee, $e;
    if ("onselectstart" in document)
      te = function() {
        Z(window, "selectstart", nt);
      }, ee = function() {
        j(window, "selectstart", nt);
      };
    else {
      var ie = me(
        ["userSelect", "WebkitUserSelect", "OUserSelect", "MozUserSelect", "msUserSelect"]
      );
      te = function() {
        if (ie) {
          var t = document.documentElement.style;
          $e = t[ie], t[ie] = "none";
        }
      }, ee = function() {
        ie && (document.documentElement.style[ie] = $e, $e = void 0);
      };
    }
    function Ve() {
      Z(window, "dragstart", nt);
    }
    function Ge() {
      j(window, "dragstart", nt);
    }
    var ge, Ue;
    function je(t) {
      for (; t.tabIndex === -1; )
        t = t.parentNode;
      t.style && (_e(), ge = t, Ue = t.style.outlineStyle, t.style.outlineStyle = "none", Z(window, "keydown", _e));
    }
    function _e() {
      ge && (ge.style.outlineStyle = Ue, ge = void 0, Ue = void 0, j(window, "keydown", _e));
    }
    function Gi(t) {
      do
        t = t.parentNode;
      while ((!t.offsetWidth || !t.offsetHeight) && t !== document.body);
      return t;
    }
    function Ye(t) {
      var e = t.getBoundingClientRect();
      return {
        x: e.width / t.offsetWidth || 1,
        y: e.height / t.offsetHeight || 1,
        boundingClientRect: e
      };
    }
    var yn = {
      __proto__: null,
      TRANSFORM: qe,
      TRANSITION: Jt,
      TRANSITION_END: $i,
      get: Vi,
      getStyle: Qt,
      create: W,
      remove: K,
      empty: pe,
      toFront: qt,
      toBack: Ft,
      hasClass: Fe,
      addClass: R,
      removeClass: X,
      setClass: We,
      getClass: fe,
      setOpacity: ft,
      testProp: me,
      setTransform: It,
      setPosition: tt,
      getPosition: Ot,
      get disableTextSelection() {
        return te;
      },
      get enableTextSelection() {
        return ee;
      },
      disableImageDrag: Ve,
      enableImageDrag: Ge,
      preventOutline: je,
      restoreOutline: _e,
      getSizedParentNode: Gi,
      getScale: Ye
    };
    function Z(t, e, i, n) {
      if (e && typeof e == "object")
        for (var a in e)
          Xe(t, a, e[a], i);
      else {
        e = C(e);
        for (var l = 0, u = e.length; l < u; l++)
          Xe(t, e[l], i, n);
      }
      return this;
    }
    var yt = "_leaflet_events";
    function j(t, e, i, n) {
      if (arguments.length === 1)
        Ui(t), delete t[yt];
      else if (e && typeof e == "object")
        for (var a in e)
          Je(t, a, e[a], i);
      else if (e = C(e), arguments.length === 2)
        Ui(t, function(g) {
          return U(e, g) !== -1;
        });
      else
        for (var l = 0, u = e.length; l < u; l++)
          Je(t, e[l], i, n);
      return this;
    }
    function Ui(t, e) {
      for (var i in t[yt]) {
        var n = i.split(/\d/)[0];
        (!e || e(n)) && Je(t, n, null, null, i);
      }
    }
    var Ke = {
      mouseenter: "mouseover",
      mouseleave: "mouseout",
      wheel: !("onwheel" in window) && "mousewheel"
    };
    function Xe(t, e, i, n) {
      var a = e + f(i) + (n ? "_" + f(n) : "");
      if (t[yt] && t[yt][a])
        return this;
      var l = function(g) {
        return i.call(n || t, g || window.event);
      }, u = l;
      !S.touchNative && S.pointer && e.indexOf("touch") === 0 ? l = hn(t, e, l) : S.touch && e === "dblclick" ? l = vn(t, l) : "addEventListener" in t ? e === "touchstart" || e === "touchmove" || e === "wheel" || e === "mousewheel" ? t.addEventListener(Ke[e] || e, l, S.passiveEvents ? { passive: !1 } : !1) : e === "mouseenter" || e === "mouseleave" ? (l = function(g) {
        g = g || window.event, ti(t, g) && u(g);
      }, t.addEventListener(Ke[e], l, !1)) : t.addEventListener(e, u, !1) : t.attachEvent("on" + e, l), t[yt] = t[yt] || {}, t[yt][a] = l;
    }
    function Je(t, e, i, n, a) {
      a = a || e + f(i) + (n ? "_" + f(n) : "");
      var l = t[yt] && t[yt][a];
      if (!l)
        return this;
      !S.touchNative && S.pointer && e.indexOf("touch") === 0 ? dn(t, e, l) : S.touch && e === "dblclick" ? bn(t, l) : "removeEventListener" in t ? t.removeEventListener(Ke[e] || e, l, !1) : t.detachEvent("on" + e, l), t[yt][a] = null;
    }
    function Bt(t) {
      return t.stopPropagation ? t.stopPropagation() : t.originalEvent ? t.originalEvent._stopped = !0 : t.cancelBubble = !0, this;
    }
    function Qe(t) {
      return Xe(t, "wheel", Bt), this;
    }
    function oe(t) {
      return Z(t, "mousedown touchstart dblclick contextmenu", Bt), t._leaflet_disable_click = !0, this;
    }
    function nt(t) {
      return t.preventDefault ? t.preventDefault() : t.returnValue = !1, this;
    }
    function Nt(t) {
      return nt(t), Bt(t), this;
    }
    function ji(t) {
      if (t.composedPath)
        return t.composedPath();
      for (var e = [], i = t.target; i; )
        e.push(i), i = i.parentNode;
      return e;
    }
    function Yi(t, e) {
      if (!e)
        return new N(t.clientX, t.clientY);
      var i = Ye(e), n = i.boundingClientRect;
      return new N(
        // offset.left/top values are in page scale (like clientX/Y),
        // whereas clientLeft/Top (border width) values are the original values (before CSS scale applies).
        (t.clientX - n.left) / i.x - e.clientLeft,
        (t.clientY - n.top) / i.y - e.clientTop
      );
    }
    var wn = S.linux && S.chrome ? window.devicePixelRatio : S.mac ? window.devicePixelRatio * 3 : window.devicePixelRatio > 0 ? 2 * window.devicePixelRatio : 1;
    function Ki(t) {
      return S.edge ? t.wheelDeltaY / 2 : (
        // Don't trust window-geometry-based delta
        t.deltaY && t.deltaMode === 0 ? -t.deltaY / wn : (
          // Pixels
          t.deltaY && t.deltaMode === 1 ? -t.deltaY * 20 : (
            // Lines
            t.deltaY && t.deltaMode === 2 ? -t.deltaY * 60 : (
              // Pages
              t.deltaX || t.deltaZ ? 0 : (
                // Skip horizontal/depth wheel events
                t.wheelDelta ? (t.wheelDeltaY || t.wheelDelta) / 2 : (
                  // Legacy IE pixels
                  t.detail && Math.abs(t.detail) < 32765 ? -t.detail * 20 : (
                    // Legacy Moz lines
                    t.detail ? t.detail / -32765 * 60 : (
                      // Legacy Moz pages
                      0
                    )
                  )
                )
              )
            )
          )
        )
      );
    }
    function ti(t, e) {
      var i = e.relatedTarget;
      if (!i)
        return !0;
      try {
        for (; i && i !== t; )
          i = i.parentNode;
      } catch {
        return !1;
      }
      return i !== t;
    }
    var kn = {
      __proto__: null,
      on: Z,
      off: j,
      stopPropagation: Bt,
      disableScrollPropagation: Qe,
      disableClickPropagation: oe,
      preventDefault: nt,
      stop: Nt,
      getPropagationPath: ji,
      getMousePosition: Yi,
      getWheelDelta: Ki,
      isExternalTarget: ti,
      addListener: Z,
      removeListener: j
    }, Xi = Yt.extend({
      // @method run(el: HTMLElement, newPos: Point, duration?: Number, easeLinearity?: Number)
      // Run an animation of a given element to a new position, optionally setting
      // duration in seconds (`0.25` by default) and easing linearity factor (3rd
      // argument of the [cubic bezier curve](https://cubic-bezier.com/#0,0,.5,1),
      // `0.5` by default).
      run: function(t, e, i, n) {
        this.stop(), this._el = t, this._inProgress = !0, this._duration = i || 0.25, this._easeOutPower = 1 / Math.max(n || 0.5, 0.2), this._startPos = Ot(t), this._offset = e.subtract(this._startPos), this._startTime = +/* @__PURE__ */ new Date(), this.fire("start"), this._animate();
      },
      // @method stop()
      // Stops the animation (if currently running).
      stop: function() {
        this._inProgress && (this._step(!0), this._complete());
      },
      _animate: function() {
        this._animId = rt(this._animate, this), this._step();
      },
      _step: function(t) {
        var e = +/* @__PURE__ */ new Date() - this._startTime, i = this._duration * 1e3;
        e < i ? this._runFrame(this._easeOut(e / i), t) : (this._runFrame(1), this._complete());
      },
      _runFrame: function(t, e) {
        var i = this._startPos.add(this._offset.multiplyBy(t));
        e && i._round(), tt(this._el, i), this.fire("step");
      },
      _complete: function() {
        pt(this._animId), this._inProgress = !1, this.fire("end");
      },
      _easeOut: function(t) {
        return 1 - Math.pow(1 - t, this._easeOutPower);
      }
    }), F = Yt.extend({
      options: {
        // @section Map State Options
        // @option crs: CRS = L.CRS.EPSG3857
        // The [Coordinate Reference System](#crs) to use. Don't change this if you're not
        // sure what it means.
        crs: Oe,
        // @option center: LatLng = undefined
        // Initial geographic center of the map
        center: void 0,
        // @option zoom: Number = undefined
        // Initial map zoom level
        zoom: void 0,
        // @option minZoom: Number = *
        // Minimum zoom level of the map.
        // If not specified and at least one `GridLayer` or `TileLayer` is in the map,
        // the lowest of their `minZoom` options will be used instead.
        minZoom: void 0,
        // @option maxZoom: Number = *
        // Maximum zoom level of the map.
        // If not specified and at least one `GridLayer` or `TileLayer` is in the map,
        // the highest of their `maxZoom` options will be used instead.
        maxZoom: void 0,
        // @option layers: Layer[] = []
        // Array of layers that will be added to the map initially
        layers: [],
        // @option maxBounds: LatLngBounds = null
        // When this option is set, the map restricts the view to the given
        // geographical bounds, bouncing the user back if the user tries to pan
        // outside the view. To set the restriction dynamically, use
        // [`setMaxBounds`](#map-setmaxbounds) method.
        maxBounds: void 0,
        // @option renderer: Renderer = *
        // The default method for drawing vector layers on the map. `L.SVG`
        // or `L.Canvas` by default depending on browser support.
        renderer: void 0,
        // @section Animation Options
        // @option zoomAnimation: Boolean = true
        // Whether the map zoom animation is enabled. By default it's enabled
        // in all browsers that support CSS3 Transitions except Android.
        zoomAnimation: !0,
        // @option zoomAnimationThreshold: Number = 4
        // Won't animate zoom if the zoom difference exceeds this value.
        zoomAnimationThreshold: 4,
        // @option fadeAnimation: Boolean = true
        // Whether the tile fade animation is enabled. By default it's enabled
        // in all browsers that support CSS3 Transitions except Android.
        fadeAnimation: !0,
        // @option markerZoomAnimation: Boolean = true
        // Whether markers animate their zoom with the zoom animation, if disabled
        // they will disappear for the length of the animation. By default it's
        // enabled in all browsers that support CSS3 Transitions except Android.
        markerZoomAnimation: !0,
        // @option transform3DLimit: Number = 2^23
        // Defines the maximum size of a CSS translation transform. The default
        // value should not be changed unless a web browser positions layers in
        // the wrong place after doing a large `panBy`.
        transform3DLimit: 8388608,
        // Precision limit of a 32-bit float
        // @section Interaction Options
        // @option zoomSnap: Number = 1
        // Forces the map's zoom level to always be a multiple of this, particularly
        // right after a [`fitBounds()`](#map-fitbounds) or a pinch-zoom.
        // By default, the zoom level snaps to the nearest integer; lower values
        // (e.g. `0.5` or `0.1`) allow for greater granularity. A value of `0`
        // means the zoom level will not be snapped after `fitBounds` or a pinch-zoom.
        zoomSnap: 1,
        // @option zoomDelta: Number = 1
        // Controls how much the map's zoom level will change after a
        // [`zoomIn()`](#map-zoomin), [`zoomOut()`](#map-zoomout), pressing `+`
        // or `-` on the keyboard, or using the [zoom controls](#control-zoom).
        // Values smaller than `1` (e.g. `0.5`) allow for greater granularity.
        zoomDelta: 1,
        // @option trackResize: Boolean = true
        // Whether the map automatically handles browser window resize to update itself.
        trackResize: !0
      },
      initialize: function(t, e) {
        e = k(this, e), this._handlers = [], this._layers = {}, this._zoomBoundLayers = {}, this._sizeChanged = !0, this._initContainer(t), this._initLayout(), this._onResize = h(this._onResize, this), this._initEvents(), e.maxBounds && this.setMaxBounds(e.maxBounds), e.zoom !== void 0 && (this._zoom = this._limitZoom(e.zoom)), e.center && e.zoom !== void 0 && this.setView(q(e.center), e.zoom, { reset: !0 }), this.callInitHooks(), this._zoomAnimated = Jt && S.any3d && !S.mobileOpera && this.options.zoomAnimation, this._zoomAnimated && (this._createAnimProxy(), Z(this._proxy, $i, this._catchTransitionEnd, this)), this._addLayers(this.options.layers);
      },
      // @section Methods for modifying map state
      // @method setView(center: LatLng, zoom: Number, options?: Zoom/pan options): this
      // Sets the view of the map (geographical center and zoom) with the given
      // animation options.
      setView: function(t, e, i) {
        if (e = e === void 0 ? this._zoom : this._limitZoom(e), t = this._limitCenter(q(t), e, this.options.maxBounds), i = i || {}, this._stop(), this._loaded && !i.reset && i !== !0) {
          i.animate !== void 0 && (i.zoom = r({ animate: i.animate }, i.zoom), i.pan = r({ animate: i.animate, duration: i.duration }, i.pan));
          var n = this._zoom !== e ? this._tryAnimatedZoom && this._tryAnimatedZoom(t, e, i.zoom) : this._tryAnimatedPan(t, i.pan);
          if (n)
            return clearTimeout(this._sizeTimer), this;
        }
        return this._resetView(t, e, i.pan && i.pan.noMoveStart), this;
      },
      // @method setZoom(zoom: Number, options?: Zoom/pan options): this
      // Sets the zoom of the map.
      setZoom: function(t, e) {
        return this._loaded ? this.setView(this.getCenter(), t, { zoom: e }) : (this._zoom = t, this);
      },
      // @method zoomIn(delta?: Number, options?: Zoom options): this
      // Increases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
      zoomIn: function(t, e) {
        return t = t || (S.any3d ? this.options.zoomDelta : 1), this.setZoom(this._zoom + t, e);
      },
      // @method zoomOut(delta?: Number, options?: Zoom options): this
      // Decreases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
      zoomOut: function(t, e) {
        return t = t || (S.any3d ? this.options.zoomDelta : 1), this.setZoom(this._zoom - t, e);
      },
      // @method setZoomAround(latlng: LatLng, zoom: Number, options: Zoom options): this
      // Zooms the map while keeping a specified geographical point on the map
      // stationary (e.g. used internally for scroll zoom and double-click zoom).
      // @alternative
      // @method setZoomAround(offset: Point, zoom: Number, options: Zoom options): this
      // Zooms the map while keeping a specified pixel on the map (relative to the top-left corner) stationary.
      setZoomAround: function(t, e, i) {
        var n = this.getZoomScale(e), a = this.getSize().divideBy(2), l = t instanceof N ? t : this.latLngToContainerPoint(t), u = l.subtract(a).multiplyBy(1 - 1 / n), g = this.containerPointToLatLng(a.add(u));
        return this.setView(g, e, { zoom: i });
      },
      _getBoundsCenterZoom: function(t, e) {
        e = e || {}, t = t.getBounds ? t.getBounds() : Q(t);
        var i = B(e.paddingTopLeft || e.padding || [0, 0]), n = B(e.paddingBottomRight || e.padding || [0, 0]), a = this.getBoundsZoom(t, !1, i.add(n));
        if (a = typeof e.maxZoom == "number" ? Math.min(e.maxZoom, a) : a, a === 1 / 0)
          return {
            center: t.getCenter(),
            zoom: a
          };
        var l = n.subtract(i).divideBy(2), u = this.project(t.getSouthWest(), a), g = this.project(t.getNorthEast(), a), _ = this.unproject(u.add(g).divideBy(2).add(l), a);
        return {
          center: _,
          zoom: a
        };
      },
      // @method fitBounds(bounds: LatLngBounds, options?: fitBounds options): this
      // Sets a map view that contains the given geographical bounds with the
      // maximum zoom level possible.
      fitBounds: function(t, e) {
        if (t = Q(t), !t.isValid())
          throw new Error("Bounds are not valid.");
        var i = this._getBoundsCenterZoom(t, e);
        return this.setView(i.center, i.zoom, e);
      },
      // @method fitWorld(options?: fitBounds options): this
      // Sets a map view that mostly contains the whole world with the maximum
      // zoom level possible.
      fitWorld: function(t) {
        return this.fitBounds([[-90, -180], [90, 180]], t);
      },
      // @method panTo(latlng: LatLng, options?: Pan options): this
      // Pans the map to a given center.
      panTo: function(t, e) {
        return this.setView(t, this._zoom, { pan: e });
      },
      // @method panBy(offset: Point, options?: Pan options): this
      // Pans the map by a given number of pixels (animated).
      panBy: function(t, e) {
        if (t = B(t).round(), e = e || {}, !t.x && !t.y)
          return this.fire("moveend");
        if (e.animate !== !0 && !this.getSize().contains(t))
          return this._resetView(this.unproject(this.project(this.getCenter()).add(t)), this.getZoom()), this;
        if (this._panAnim || (this._panAnim = new Xi(), this._panAnim.on({
          step: this._onPanTransitionStep,
          end: this._onPanTransitionEnd
        }, this)), e.noMoveStart || this.fire("movestart"), e.animate !== !1) {
          R(this._mapPane, "leaflet-pan-anim");
          var i = this._getMapPanePos().subtract(t).round();
          this._panAnim.run(this._mapPane, i, e.duration || 0.25, e.easeLinearity);
        } else
          this._rawPanBy(t), this.fire("move").fire("moveend");
        return this;
      },
      // @method flyTo(latlng: LatLng, zoom?: Number, options?: Zoom/pan options): this
      // Sets the view of the map (geographical center and zoom) performing a smooth
      // pan-zoom animation.
      flyTo: function(t, e, i) {
        if (i = i || {}, i.animate === !1 || !S.any3d)
          return this.setView(t, e, i);
        this._stop();
        var n = this.project(this.getCenter()), a = this.project(t), l = this.getSize(), u = this._zoom;
        t = q(t), e = e === void 0 ? u : e;
        var g = Math.max(l.x, l.y), _ = g * this.getZoomScale(u, e), x = a.distanceTo(n) || 1, P = 1.42, I = P * P;
        function D(et) {
          var Me = et ? -1 : 1, da = et ? _ : g, ua = _ * _ - g * g + Me * I * I * x * x, pa = 2 * da * I * x, di = ua / pa, To = Math.sqrt(di * di + 1) - di, fa = To < 1e-9 ? -18 : Math.log(To);
          return fa;
        }
        function at(et) {
          return (Math.exp(et) - Math.exp(-et)) / 2;
        }
        function ot(et) {
          return (Math.exp(et) + Math.exp(-et)) / 2;
        }
        function gt(et) {
          return at(et) / ot(et);
        }
        var ht = D(0);
        function jt(et) {
          return g * (ot(ht) / ot(ht + P * et));
        }
        function ra(et) {
          return g * (ot(ht) * gt(ht + P * et) - at(ht)) / I;
        }
        function la(et) {
          return 1 - Math.pow(1 - et, 1.5);
        }
        var ca = Date.now(), So = (D(1) - ht) / P, ha = i.duration ? 1e3 * i.duration : 1e3 * So * 0.8;
        function zo() {
          var et = (Date.now() - ca) / ha, Me = la(et) * So;
          et <= 1 ? (this._flyToFrame = rt(zo, this), this._move(
            this.unproject(n.add(a.subtract(n).multiplyBy(ra(Me) / x)), u),
            this.getScaleZoom(g / jt(Me), u),
            { flyTo: !0 }
          )) : this._move(t, e)._moveEnd(!0);
        }
        return this._moveStart(!0, i.noMoveStart), zo.call(this), this;
      },
      // @method flyToBounds(bounds: LatLngBounds, options?: fitBounds options): this
      // Sets the view of the map with a smooth animation like [`flyTo`](#map-flyto),
      // but takes a bounds parameter like [`fitBounds`](#map-fitbounds).
      flyToBounds: function(t, e) {
        var i = this._getBoundsCenterZoom(t, e);
        return this.flyTo(i.center, i.zoom, e);
      },
      // @method setMaxBounds(bounds: LatLngBounds): this
      // Restricts the map view to the given bounds (see the [maxBounds](#map-maxbounds) option).
      setMaxBounds: function(t) {
        return t = Q(t), this.listens("moveend", this._panInsideMaxBounds) && this.off("moveend", this._panInsideMaxBounds), t.isValid() ? (this.options.maxBounds = t, this._loaded && this._panInsideMaxBounds(), this.on("moveend", this._panInsideMaxBounds)) : (this.options.maxBounds = null, this);
      },
      // @method setMinZoom(zoom: Number): this
      // Sets the lower limit for the available zoom levels (see the [minZoom](#map-minzoom) option).
      setMinZoom: function(t) {
        var e = this.options.minZoom;
        return this.options.minZoom = t, this._loaded && e !== t && (this.fire("zoomlevelschange"), this.getZoom() < this.options.minZoom) ? this.setZoom(t) : this;
      },
      // @method setMaxZoom(zoom: Number): this
      // Sets the upper limit for the available zoom levels (see the [maxZoom](#map-maxzoom) option).
      setMaxZoom: function(t) {
        var e = this.options.maxZoom;
        return this.options.maxZoom = t, this._loaded && e !== t && (this.fire("zoomlevelschange"), this.getZoom() > this.options.maxZoom) ? this.setZoom(t) : this;
      },
      // @method panInsideBounds(bounds: LatLngBounds, options?: Pan options): this
      // Pans the map to the closest view that would lie inside the given bounds (if it's not already), controlling the animation using the options specific, if any.
      panInsideBounds: function(t, e) {
        this._enforcingBounds = !0;
        var i = this.getCenter(), n = this._limitCenter(i, this._zoom, Q(t));
        return i.equals(n) || this.panTo(n, e), this._enforcingBounds = !1, this;
      },
      // @method panInside(latlng: LatLng, options?: padding options): this
      // Pans the map the minimum amount to make the `latlng` visible. Use
      // padding options to fit the display to more restricted bounds.
      // If `latlng` is already within the (optionally padded) display bounds,
      // the map will not be panned.
      panInside: function(t, e) {
        e = e || {};
        var i = B(e.paddingTopLeft || e.padding || [0, 0]), n = B(e.paddingBottomRight || e.padding || [0, 0]), a = this.project(this.getCenter()), l = this.project(t), u = this.getPixelBounds(), g = lt([u.min.add(i), u.max.subtract(n)]), _ = g.getSize();
        if (!g.contains(l)) {
          this._enforcingBounds = !0;
          var x = l.subtract(g.getCenter()), P = g.extend(l).getSize().subtract(_);
          a.x += x.x < 0 ? -P.x : P.x, a.y += x.y < 0 ? -P.y : P.y, this.panTo(this.unproject(a), e), this._enforcingBounds = !1;
        }
        return this;
      },
      // @method invalidateSize(options: Zoom/pan options): this
      // Checks if the map container size changed and updates the map if so —
      // call it after you've changed the map size dynamically, also animating
      // pan by default. If `options.pan` is `false`, panning will not occur.
      // If `options.debounceMoveend` is `true`, it will delay `moveend` event so
      // that it doesn't happen often even if the method is called many
      // times in a row.
      // @alternative
      // @method invalidateSize(animate: Boolean): this
      // Checks if the map container size changed and updates the map if so —
      // call it after you've changed the map size dynamically, also animating
      // pan by default.
      invalidateSize: function(t) {
        if (!this._loaded)
          return this;
        t = r({
          animate: !1,
          pan: !0
        }, t === !0 ? { animate: !0 } : t);
        var e = this.getSize();
        this._sizeChanged = !0, this._lastCenter = null;
        var i = this.getSize(), n = e.divideBy(2).round(), a = i.divideBy(2).round(), l = n.subtract(a);
        return !l.x && !l.y ? this : (t.animate && t.pan ? this.panBy(l) : (t.pan && this._rawPanBy(l), this.fire("move"), t.debounceMoveend ? (clearTimeout(this._sizeTimer), this._sizeTimer = setTimeout(h(this.fire, this, "moveend"), 200)) : this.fire("moveend")), this.fire("resize", {
          oldSize: e,
          newSize: i
        }));
      },
      // @section Methods for modifying map state
      // @method stop(): this
      // Stops the currently running `panTo` or `flyTo` animation, if any.
      stop: function() {
        return this.setZoom(this._limitZoom(this._zoom)), this.options.zoomSnap || this.fire("viewreset"), this._stop();
      },
      // @section Geolocation methods
      // @method locate(options?: Locate options): this
      // Tries to locate the user using the Geolocation API, firing a [`locationfound`](#map-locationfound)
      // event with location data on success or a [`locationerror`](#map-locationerror) event on failure,
      // and optionally sets the map view to the user's location with respect to
      // detection accuracy (or to the world view if geolocation failed).
      // Note that, if your page doesn't use HTTPS, this method will fail in
      // modern browsers ([Chrome 50 and newer](https://sites.google.com/a/chromium.org/dev/Home/chromium-security/deprecating-powerful-features-on-insecure-origins))
      // See `Locate options` for more details.
      locate: function(t) {
        if (t = this._locateOptions = r({
          timeout: 1e4,
          watch: !1
          // setView: false
          // maxZoom: <Number>
          // maximumAge: 0
          // enableHighAccuracy: false
        }, t), !("geolocation" in navigator))
          return this._handleGeolocationError({
            code: 0,
            message: "Geolocation not supported."
          }), this;
        var e = h(this._handleGeolocationResponse, this), i = h(this._handleGeolocationError, this);
        return t.watch ? this._locationWatchId = navigator.geolocation.watchPosition(e, i, t) : navigator.geolocation.getCurrentPosition(e, i, t), this;
      },
      // @method stopLocate(): this
      // Stops watching location previously initiated by `map.locate({watch: true})`
      // and aborts resetting the map view if map.locate was called with
      // `{setView: true}`.
      stopLocate: function() {
        return navigator.geolocation && navigator.geolocation.clearWatch && navigator.geolocation.clearWatch(this._locationWatchId), this._locateOptions && (this._locateOptions.setView = !1), this;
      },
      _handleGeolocationError: function(t) {
        if (this._container._leaflet_id) {
          var e = t.code, i = t.message || (e === 1 ? "permission denied" : e === 2 ? "position unavailable" : "timeout");
          this._locateOptions.setView && !this._loaded && this.fitWorld(), this.fire("locationerror", {
            code: e,
            message: "Geolocation error: " + i + "."
          });
        }
      },
      _handleGeolocationResponse: function(t) {
        if (this._container._leaflet_id) {
          var e = t.coords.latitude, i = t.coords.longitude, n = new G(e, i), a = n.toBounds(t.coords.accuracy * 2), l = this._locateOptions;
          if (l.setView) {
            var u = this.getBoundsZoom(a);
            this.setView(n, l.maxZoom ? Math.min(u, l.maxZoom) : u);
          }
          var g = {
            latlng: n,
            bounds: a,
            timestamp: t.timestamp
          };
          for (var _ in t.coords)
            typeof t.coords[_] == "number" && (g[_] = t.coords[_]);
          this.fire("locationfound", g);
        }
      },
      // TODO Appropriate docs section?
      // @section Other Methods
      // @method addHandler(name: String, HandlerClass: Function): this
      // Adds a new `Handler` to the map, given its name and constructor function.
      addHandler: function(t, e) {
        if (!e)
          return this;
        var i = this[t] = new e(this);
        return this._handlers.push(i), this.options[t] && i.enable(), this;
      },
      // @method remove(): this
      // Destroys the map and clears all related event listeners.
      remove: function() {
        if (this._initEvents(!0), this.options.maxBounds && this.off("moveend", this._panInsideMaxBounds), this._containerId !== this._container._leaflet_id)
          throw new Error("Map container is being reused by another instance");
        try {
          delete this._container._leaflet_id, delete this._containerId;
        } catch {
          this._container._leaflet_id = void 0, this._containerId = void 0;
        }
        this._locationWatchId !== void 0 && this.stopLocate(), this._stop(), K(this._mapPane), this._clearControlPos && this._clearControlPos(), this._resizeRequest && (pt(this._resizeRequest), this._resizeRequest = null), this._clearHandlers(), this._loaded && this.fire("unload");
        var t;
        for (t in this._layers)
          this._layers[t].remove();
        for (t in this._panes)
          K(this._panes[t]);
        return this._layers = [], this._panes = [], delete this._mapPane, delete this._renderer, this;
      },
      // @section Other Methods
      // @method createPane(name: String, container?: HTMLElement): HTMLElement
      // Creates a new [map pane](#map-pane) with the given name if it doesn't exist already,
      // then returns it. The pane is created as a child of `container`, or
      // as a child of the main map pane if not set.
      createPane: function(t, e) {
        var i = "leaflet-pane" + (t ? " leaflet-" + t.replace("Pane", "") + "-pane" : ""), n = W("div", i, e || this._mapPane);
        return t && (this._panes[t] = n), n;
      },
      // @section Methods for Getting Map State
      // @method getCenter(): LatLng
      // Returns the geographical center of the map view
      getCenter: function() {
        return this._checkIfLoaded(), this._lastCenter && !this._moved() ? this._lastCenter.clone() : this.layerPointToLatLng(this._getCenterLayerPoint());
      },
      // @method getZoom(): Number
      // Returns the current zoom level of the map view
      getZoom: function() {
        return this._zoom;
      },
      // @method getBounds(): LatLngBounds
      // Returns the geographical bounds visible in the current map view
      getBounds: function() {
        var t = this.getPixelBounds(), e = this.unproject(t.getBottomLeft()), i = this.unproject(t.getTopRight());
        return new ct(e, i);
      },
      // @method getMinZoom(): Number
      // Returns the minimum zoom level of the map (if set in the `minZoom` option of the map or of any layers), or `0` by default.
      getMinZoom: function() {
        return this.options.minZoom === void 0 ? this._layersMinZoom || 0 : this.options.minZoom;
      },
      // @method getMaxZoom(): Number
      // Returns the maximum zoom level of the map (if set in the `maxZoom` option of the map or of any layers).
      getMaxZoom: function() {
        return this.options.maxZoom === void 0 ? this._layersMaxZoom === void 0 ? 1 / 0 : this._layersMaxZoom : this.options.maxZoom;
      },
      // @method getBoundsZoom(bounds: LatLngBounds, inside?: Boolean, padding?: Point): Number
      // Returns the maximum zoom level on which the given bounds fit to the map
      // view in its entirety. If `inside` (optional) is set to `true`, the method
      // instead returns the minimum zoom level on which the map view fits into
      // the given bounds in its entirety.
      getBoundsZoom: function(t, e, i) {
        t = Q(t), i = B(i || [0, 0]);
        var n = this.getZoom() || 0, a = this.getMinZoom(), l = this.getMaxZoom(), u = t.getNorthWest(), g = t.getSouthEast(), _ = this.getSize().subtract(i), x = lt(this.project(g, n), this.project(u, n)).getSize(), P = S.any3d ? this.options.zoomSnap : 1, I = _.x / x.x, D = _.y / x.y, at = e ? Math.max(I, D) : Math.min(I, D);
        return n = this.getScaleZoom(at, n), P && (n = Math.round(n / (P / 100)) * (P / 100), n = e ? Math.ceil(n / P) * P : Math.floor(n / P) * P), Math.max(a, Math.min(l, n));
      },
      // @method getSize(): Point
      // Returns the current size of the map container (in pixels).
      getSize: function() {
        return (!this._size || this._sizeChanged) && (this._size = new N(
          this._container.clientWidth || 0,
          this._container.clientHeight || 0
        ), this._sizeChanged = !1), this._size.clone();
      },
      // @method getPixelBounds(): Bounds
      // Returns the bounds of the current map view in projected pixel
      // coordinates (sometimes useful in layer and overlay implementations).
      getPixelBounds: function(t, e) {
        var i = this._getTopLeftPoint(t, e);
        return new Y(i, i.add(this.getSize()));
      },
      // TODO: Check semantics - isn't the pixel origin the 0,0 coord relative to
      // the map pane? "left point of the map layer" can be confusing, specially
      // since there can be negative offsets.
      // @method getPixelOrigin(): Point
      // Returns the projected pixel coordinates of the top left point of
      // the map layer (useful in custom layer and overlay implementations).
      getPixelOrigin: function() {
        return this._checkIfLoaded(), this._pixelOrigin;
      },
      // @method getPixelWorldBounds(zoom?: Number): Bounds
      // Returns the world's bounds in pixel coordinates for zoom level `zoom`.
      // If `zoom` is omitted, the map's current zoom level is used.
      getPixelWorldBounds: function(t) {
        return this.options.crs.getProjectedBounds(t === void 0 ? this.getZoom() : t);
      },
      // @section Other Methods
      // @method getPane(pane: String|HTMLElement): HTMLElement
      // Returns a [map pane](#map-pane), given its name or its HTML element (its identity).
      getPane: function(t) {
        return typeof t == "string" ? this._panes[t] : t;
      },
      // @method getPanes(): Object
      // Returns a plain object containing the names of all [panes](#map-pane) as keys and
      // the panes as values.
      getPanes: function() {
        return this._panes;
      },
      // @method getContainer: HTMLElement
      // Returns the HTML element that contains the map.
      getContainer: function() {
        return this._container;
      },
      // @section Conversion Methods
      // @method getZoomScale(toZoom: Number, fromZoom: Number): Number
      // Returns the scale factor to be applied to a map transition from zoom level
      // `fromZoom` to `toZoom`. Used internally to help with zoom animations.
      getZoomScale: function(t, e) {
        var i = this.options.crs;
        return e = e === void 0 ? this._zoom : e, i.scale(t) / i.scale(e);
      },
      // @method getScaleZoom(scale: Number, fromZoom: Number): Number
      // Returns the zoom level that the map would end up at, if it is at `fromZoom`
      // level and everything is scaled by a factor of `scale`. Inverse of
      // [`getZoomScale`](#map-getZoomScale).
      getScaleZoom: function(t, e) {
        var i = this.options.crs;
        e = e === void 0 ? this._zoom : e;
        var n = i.zoom(t * i.scale(e));
        return isNaN(n) ? 1 / 0 : n;
      },
      // @method project(latlng: LatLng, zoom: Number): Point
      // Projects a geographical coordinate `LatLng` according to the projection
      // of the map's CRS, then scales it according to `zoom` and the CRS's
      // `Transformation`. The result is pixel coordinate relative to
      // the CRS origin.
      project: function(t, e) {
        return e = e === void 0 ? this._zoom : e, this.options.crs.latLngToPoint(q(t), e);
      },
      // @method unproject(point: Point, zoom: Number): LatLng
      // Inverse of [`project`](#map-project).
      unproject: function(t, e) {
        return e = e === void 0 ? this._zoom : e, this.options.crs.pointToLatLng(B(t), e);
      },
      // @method layerPointToLatLng(point: Point): LatLng
      // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
      // returns the corresponding geographical coordinate (for the current zoom level).
      layerPointToLatLng: function(t) {
        var e = B(t).add(this.getPixelOrigin());
        return this.unproject(e);
      },
      // @method latLngToLayerPoint(latlng: LatLng): Point
      // Given a geographical coordinate, returns the corresponding pixel coordinate
      // relative to the [origin pixel](#map-getpixelorigin).
      latLngToLayerPoint: function(t) {
        var e = this.project(q(t))._round();
        return e._subtract(this.getPixelOrigin());
      },
      // @method wrapLatLng(latlng: LatLng): LatLng
      // Returns a `LatLng` where `lat` and `lng` has been wrapped according to the
      // map's CRS's `wrapLat` and `wrapLng` properties, if they are outside the
      // CRS's bounds.
      // By default this means longitude is wrapped around the dateline so its
      // value is between -180 and +180 degrees.
      wrapLatLng: function(t) {
        return this.options.crs.wrapLatLng(q(t));
      },
      // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
      // Returns a `LatLngBounds` with the same size as the given one, ensuring that
      // its center is within the CRS's bounds.
      // By default this means the center longitude is wrapped around the dateline so its
      // value is between -180 and +180 degrees, and the majority of the bounds
      // overlaps the CRS's bounds.
      wrapLatLngBounds: function(t) {
        return this.options.crs.wrapLatLngBounds(Q(t));
      },
      // @method distance(latlng1: LatLng, latlng2: LatLng): Number
      // Returns the distance between two geographical coordinates according to
      // the map's CRS. By default this measures distance in meters.
      distance: function(t, e) {
        return this.options.crs.distance(q(t), q(e));
      },
      // @method containerPointToLayerPoint(point: Point): Point
      // Given a pixel coordinate relative to the map container, returns the corresponding
      // pixel coordinate relative to the [origin pixel](#map-getpixelorigin).
      containerPointToLayerPoint: function(t) {
        return B(t).subtract(this._getMapPanePos());
      },
      // @method layerPointToContainerPoint(point: Point): Point
      // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
      // returns the corresponding pixel coordinate relative to the map container.
      layerPointToContainerPoint: function(t) {
        return B(t).add(this._getMapPanePos());
      },
      // @method containerPointToLatLng(point: Point): LatLng
      // Given a pixel coordinate relative to the map container, returns
      // the corresponding geographical coordinate (for the current zoom level).
      containerPointToLatLng: function(t) {
        var e = this.containerPointToLayerPoint(B(t));
        return this.layerPointToLatLng(e);
      },
      // @method latLngToContainerPoint(latlng: LatLng): Point
      // Given a geographical coordinate, returns the corresponding pixel coordinate
      // relative to the map container.
      latLngToContainerPoint: function(t) {
        return this.layerPointToContainerPoint(this.latLngToLayerPoint(q(t)));
      },
      // @method mouseEventToContainerPoint(ev: MouseEvent): Point
      // Given a MouseEvent object, returns the pixel coordinate relative to the
      // map container where the event took place.
      mouseEventToContainerPoint: function(t) {
        return Yi(t, this._container);
      },
      // @method mouseEventToLayerPoint(ev: MouseEvent): Point
      // Given a MouseEvent object, returns the pixel coordinate relative to
      // the [origin pixel](#map-getpixelorigin) where the event took place.
      mouseEventToLayerPoint: function(t) {
        return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(t));
      },
      // @method mouseEventToLatLng(ev: MouseEvent): LatLng
      // Given a MouseEvent object, returns geographical coordinate where the
      // event took place.
      mouseEventToLatLng: function(t) {
        return this.layerPointToLatLng(this.mouseEventToLayerPoint(t));
      },
      // map initialization methods
      _initContainer: function(t) {
        var e = this._container = Vi(t);
        if (e) {
          if (e._leaflet_id)
            throw new Error("Map container is already initialized.");
        } else throw new Error("Map container not found.");
        Z(e, "scroll", this._onScroll, this), this._containerId = f(e);
      },
      _initLayout: function() {
        var t = this._container;
        this._fadeAnimated = this.options.fadeAnimation && S.any3d, R(t, "leaflet-container" + (S.touch ? " leaflet-touch" : "") + (S.retina ? " leaflet-retina" : "") + (S.ielt9 ? " leaflet-oldie" : "") + (S.safari ? " leaflet-safari" : "") + (this._fadeAnimated ? " leaflet-fade-anim" : ""));
        var e = Qt(t, "position");
        e !== "absolute" && e !== "relative" && e !== "fixed" && e !== "sticky" && (t.style.position = "relative"), this._initPanes(), this._initControlPos && this._initControlPos();
      },
      _initPanes: function() {
        var t = this._panes = {};
        this._paneRenderers = {}, this._mapPane = this.createPane("mapPane", this._container), tt(this._mapPane, new N(0, 0)), this.createPane("tilePane"), this.createPane("overlayPane"), this.createPane("shadowPane"), this.createPane("markerPane"), this.createPane("tooltipPane"), this.createPane("popupPane"), this.options.markerZoomAnimation || (R(t.markerPane, "leaflet-zoom-hide"), R(t.shadowPane, "leaflet-zoom-hide"));
      },
      // private methods that modify map state
      // @section Map state change events
      _resetView: function(t, e, i) {
        tt(this._mapPane, new N(0, 0));
        var n = !this._loaded;
        this._loaded = !0, e = this._limitZoom(e), this.fire("viewprereset");
        var a = this._zoom !== e;
        this._moveStart(a, i)._move(t, e)._moveEnd(a), this.fire("viewreset"), n && this.fire("load");
      },
      _moveStart: function(t, e) {
        return t && this.fire("zoomstart"), e || this.fire("movestart"), this;
      },
      _move: function(t, e, i, n) {
        e === void 0 && (e = this._zoom);
        var a = this._zoom !== e;
        return this._zoom = e, this._lastCenter = t, this._pixelOrigin = this._getNewPixelOrigin(t), n ? i && i.pinch && this.fire("zoom", i) : ((a || i && i.pinch) && this.fire("zoom", i), this.fire("move", i)), this;
      },
      _moveEnd: function(t) {
        return t && this.fire("zoomend"), this.fire("moveend");
      },
      _stop: function() {
        return pt(this._flyToFrame), this._panAnim && this._panAnim.stop(), this;
      },
      _rawPanBy: function(t) {
        tt(this._mapPane, this._getMapPanePos().subtract(t));
      },
      _getZoomSpan: function() {
        return this.getMaxZoom() - this.getMinZoom();
      },
      _panInsideMaxBounds: function() {
        this._enforcingBounds || this.panInsideBounds(this.options.maxBounds);
      },
      _checkIfLoaded: function() {
        if (!this._loaded)
          throw new Error("Set map center and zoom first.");
      },
      // DOM event handling
      // @section Interaction events
      _initEvents: function(t) {
        this._targets = {}, this._targets[f(this._container)] = this;
        var e = t ? j : Z;
        e(this._container, "click dblclick mousedown mouseup mouseover mouseout mousemove contextmenu keypress keydown keyup", this._handleDOMEvent, this), this.options.trackResize && e(window, "resize", this._onResize, this), S.any3d && this.options.transform3DLimit && (t ? this.off : this.on).call(this, "moveend", this._onMoveEnd);
      },
      _onResize: function() {
        pt(this._resizeRequest), this._resizeRequest = rt(
          function() {
            this.invalidateSize({ debounceMoveend: !0 });
          },
          this
        );
      },
      _onScroll: function() {
        this._container.scrollTop = 0, this._container.scrollLeft = 0;
      },
      _onMoveEnd: function() {
        var t = this._getMapPanePos();
        Math.max(Math.abs(t.x), Math.abs(t.y)) >= this.options.transform3DLimit && this._resetView(this.getCenter(), this.getZoom());
      },
      _findEventTargets: function(t, e) {
        for (var i = [], n, a = e === "mouseout" || e === "mouseover", l = t.target || t.srcElement, u = !1; l; ) {
          if (n = this._targets[f(l)], n && (e === "click" || e === "preclick") && this._draggableMoved(n)) {
            u = !0;
            break;
          }
          if (n && n.listens(e, !0) && (a && !ti(l, t) || (i.push(n), a)) || l === this._container)
            break;
          l = l.parentNode;
        }
        return !i.length && !u && !a && this.listens(e, !0) && (i = [this]), i;
      },
      _isClickDisabled: function(t) {
        for (; t && t !== this._container; ) {
          if (t._leaflet_disable_click)
            return !0;
          t = t.parentNode;
        }
      },
      _handleDOMEvent: function(t) {
        var e = t.target || t.srcElement;
        if (!(!this._loaded || e._leaflet_disable_events || t.type === "click" && this._isClickDisabled(e))) {
          var i = t.type;
          i === "mousedown" && je(e), this._fireDOMEvent(t, i);
        }
      },
      _mouseEvents: ["click", "dblclick", "mouseover", "mouseout", "contextmenu"],
      _fireDOMEvent: function(t, e, i) {
        if (t.type === "click") {
          var n = r({}, t);
          n.type = "preclick", this._fireDOMEvent(n, n.type, i);
        }
        var a = this._findEventTargets(t, e);
        if (i) {
          for (var l = [], u = 0; u < i.length; u++)
            i[u].listens(e, !0) && l.push(i[u]);
          a = l.concat(a);
        }
        if (a.length) {
          e === "contextmenu" && nt(t);
          var g = a[0], _ = {
            originalEvent: t
          };
          if (t.type !== "keypress" && t.type !== "keydown" && t.type !== "keyup") {
            var x = g.getLatLng && (!g._radius || g._radius <= 10);
            _.containerPoint = x ? this.latLngToContainerPoint(g.getLatLng()) : this.mouseEventToContainerPoint(t), _.layerPoint = this.containerPointToLayerPoint(_.containerPoint), _.latlng = x ? g.getLatLng() : this.layerPointToLatLng(_.layerPoint);
          }
          for (u = 0; u < a.length; u++)
            if (a[u].fire(e, _, !0), _.originalEvent._stopped || a[u].options.bubblingMouseEvents === !1 && U(this._mouseEvents, e) !== -1)
              return;
        }
      },
      _draggableMoved: function(t) {
        return t = t.dragging && t.dragging.enabled() ? t : this, t.dragging && t.dragging.moved() || this.boxZoom && this.boxZoom.moved();
      },
      _clearHandlers: function() {
        for (var t = 0, e = this._handlers.length; t < e; t++)
          this._handlers[t].disable();
      },
      // @section Other Methods
      // @method whenReady(fn: Function, context?: Object): this
      // Runs the given function `fn` when the map gets initialized with
      // a view (center and zoom) and at least one layer, or immediately
      // if it's already initialized, optionally passing a function context.
      whenReady: function(t, e) {
        return this._loaded ? t.call(e || this, { target: this }) : this.on("load", t, e), this;
      },
      // private methods for getting map state
      _getMapPanePos: function() {
        return Ot(this._mapPane) || new N(0, 0);
      },
      _moved: function() {
        var t = this._getMapPanePos();
        return t && !t.equals([0, 0]);
      },
      _getTopLeftPoint: function(t, e) {
        var i = t && e !== void 0 ? this._getNewPixelOrigin(t, e) : this.getPixelOrigin();
        return i.subtract(this._getMapPanePos());
      },
      _getNewPixelOrigin: function(t, e) {
        var i = this.getSize()._divideBy(2);
        return this.project(t, e)._subtract(i)._add(this._getMapPanePos())._round();
      },
      _latLngToNewLayerPoint: function(t, e, i) {
        var n = this._getNewPixelOrigin(i, e);
        return this.project(t, e)._subtract(n);
      },
      _latLngBoundsToNewLayerBounds: function(t, e, i) {
        var n = this._getNewPixelOrigin(i, e);
        return lt([
          this.project(t.getSouthWest(), e)._subtract(n),
          this.project(t.getNorthWest(), e)._subtract(n),
          this.project(t.getSouthEast(), e)._subtract(n),
          this.project(t.getNorthEast(), e)._subtract(n)
        ]);
      },
      // layer point of the current center
      _getCenterLayerPoint: function() {
        return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
      },
      // offset of the specified place to the current center in pixels
      _getCenterOffset: function(t) {
        return this.latLngToLayerPoint(t).subtract(this._getCenterLayerPoint());
      },
      // adjust center for view to get inside bounds
      _limitCenter: function(t, e, i) {
        if (!i)
          return t;
        var n = this.project(t, e), a = this.getSize().divideBy(2), l = new Y(n.subtract(a), n.add(a)), u = this._getBoundsOffset(l, i, e);
        return Math.abs(u.x) <= 1 && Math.abs(u.y) <= 1 ? t : this.unproject(n.add(u), e);
      },
      // adjust offset for view to get inside bounds
      _limitOffset: function(t, e) {
        if (!e)
          return t;
        var i = this.getPixelBounds(), n = new Y(i.min.add(t), i.max.add(t));
        return t.add(this._getBoundsOffset(n, e));
      },
      // returns offset needed for pxBounds to get inside maxBounds at a specified zoom
      _getBoundsOffset: function(t, e, i) {
        var n = lt(
          this.project(e.getNorthEast(), i),
          this.project(e.getSouthWest(), i)
        ), a = n.min.subtract(t.min), l = n.max.subtract(t.max), u = this._rebound(a.x, -l.x), g = this._rebound(a.y, -l.y);
        return new N(u, g);
      },
      _rebound: function(t, e) {
        return t + e > 0 ? Math.round(t - e) / 2 : Math.max(0, Math.ceil(t)) - Math.max(0, Math.floor(e));
      },
      _limitZoom: function(t) {
        var e = this.getMinZoom(), i = this.getMaxZoom(), n = S.any3d ? this.options.zoomSnap : 1;
        return n && (t = Math.round(t / n) * n), Math.max(e, Math.min(i, t));
      },
      _onPanTransitionStep: function() {
        this.fire("move");
      },
      _onPanTransitionEnd: function() {
        X(this._mapPane, "leaflet-pan-anim"), this.fire("moveend");
      },
      _tryAnimatedPan: function(t, e) {
        var i = this._getCenterOffset(t)._trunc();
        return (e && e.animate) !== !0 && !this.getSize().contains(i) ? !1 : (this.panBy(i, e), !0);
      },
      _createAnimProxy: function() {
        var t = this._proxy = W("div", "leaflet-proxy leaflet-zoom-animated");
        this._panes.mapPane.appendChild(t), this.on("zoomanim", function(e) {
          var i = qe, n = this._proxy.style[i];
          It(this._proxy, this.project(e.center, e.zoom), this.getZoomScale(e.zoom, 1)), n === this._proxy.style[i] && this._animatingZoom && this._onZoomTransitionEnd();
        }, this), this.on("load moveend", this._animMoveEnd, this), this._on("unload", this._destroyAnimProxy, this);
      },
      _destroyAnimProxy: function() {
        K(this._proxy), this.off("load moveend", this._animMoveEnd, this), delete this._proxy;
      },
      _animMoveEnd: function() {
        var t = this.getCenter(), e = this.getZoom();
        It(this._proxy, this.project(t, e), this.getZoomScale(e, 1));
      },
      _catchTransitionEnd: function(t) {
        this._animatingZoom && t.propertyName.indexOf("transform") >= 0 && this._onZoomTransitionEnd();
      },
      _nothingToAnimate: function() {
        return !this._container.getElementsByClassName("leaflet-zoom-animated").length;
      },
      _tryAnimatedZoom: function(t, e, i) {
        if (this._animatingZoom)
          return !0;
        if (i = i || {}, !this._zoomAnimated || i.animate === !1 || this._nothingToAnimate() || Math.abs(e - this._zoom) > this.options.zoomAnimationThreshold)
          return !1;
        var n = this.getZoomScale(e), a = this._getCenterOffset(t)._divideBy(1 - 1 / n);
        return i.animate !== !0 && !this.getSize().contains(a) ? !1 : (rt(function() {
          this._moveStart(!0, i.noMoveStart || !1)._animateZoom(t, e, !0);
        }, this), !0);
      },
      _animateZoom: function(t, e, i, n) {
        this._mapPane && (i && (this._animatingZoom = !0, this._animateToCenter = t, this._animateToZoom = e, R(this._mapPane, "leaflet-zoom-anim")), this.fire("zoomanim", {
          center: t,
          zoom: e,
          noUpdate: n
        }), this._tempFireZoomEvent || (this._tempFireZoomEvent = this._zoom !== this._animateToZoom), this._move(this._animateToCenter, this._animateToZoom, void 0, !0), setTimeout(h(this._onZoomTransitionEnd, this), 250));
      },
      _onZoomTransitionEnd: function() {
        this._animatingZoom && (this._mapPane && X(this._mapPane, "leaflet-zoom-anim"), this._animatingZoom = !1, this._move(this._animateToCenter, this._animateToZoom, void 0, !0), this._tempFireZoomEvent && this.fire("zoom"), delete this._tempFireZoomEvent, this.fire("move"), this._moveEnd(!0));
      }
    });
    function En(t, e) {
      return new F(t, e);
    }
    var _t = Et.extend({
      // @section
      // @aka Control Options
      options: {
        // @option position: String = 'topright'
        // The position of the control (one of the map corners). Possible values are `'topleft'`,
        // `'topright'`, `'bottomleft'` or `'bottomright'`
        position: "topright"
      },
      initialize: function(t) {
        k(this, t);
      },
      /* @section
       * Classes extending L.Control will inherit the following methods:
       *
       * @method getPosition: string
       * Returns the position of the control.
       */
      getPosition: function() {
        return this.options.position;
      },
      // @method setPosition(position: string): this
      // Sets the position of the control.
      setPosition: function(t) {
        var e = this._map;
        return e && e.removeControl(this), this.options.position = t, e && e.addControl(this), this;
      },
      // @method getContainer: HTMLElement
      // Returns the HTMLElement that contains the control.
      getContainer: function() {
        return this._container;
      },
      // @method addTo(map: Map): this
      // Adds the control to the given map.
      addTo: function(t) {
        this.remove(), this._map = t;
        var e = this._container = this.onAdd(t), i = this.getPosition(), n = t._controlCorners[i];
        return R(e, "leaflet-control"), i.indexOf("bottom") !== -1 ? n.insertBefore(e, n.firstChild) : n.appendChild(e), this._map.on("unload", this.remove, this), this;
      },
      // @method remove: this
      // Removes the control from the map it is currently active on.
      remove: function() {
        return this._map ? (K(this._container), this.onRemove && this.onRemove(this._map), this._map.off("unload", this.remove, this), this._map = null, this) : this;
      },
      _refocusOnMap: function(t) {
        this._map && t && t.screenX > 0 && t.screenY > 0 && this._map.getContainer().focus();
      }
    }), ne = function(t) {
      return new _t(t);
    };
    F.include({
      // @method addControl(control: Control): this
      // Adds the given control to the map
      addControl: function(t) {
        return t.addTo(this), this;
      },
      // @method removeControl(control: Control): this
      // Removes the given control from the map
      removeControl: function(t) {
        return t.remove(), this;
      },
      _initControlPos: function() {
        var t = this._controlCorners = {}, e = "leaflet-", i = this._controlContainer = W("div", e + "control-container", this._container);
        function n(a, l) {
          var u = e + a + " " + e + l;
          t[a + l] = W("div", u, i);
        }
        n("top", "left"), n("top", "right"), n("bottom", "left"), n("bottom", "right");
      },
      _clearControlPos: function() {
        for (var t in this._controlCorners)
          K(this._controlCorners[t]);
        K(this._controlContainer), delete this._controlCorners, delete this._controlContainer;
      }
    });
    var Ji = _t.extend({
      // @section
      // @aka Control.Layers options
      options: {
        // @option collapsed: Boolean = true
        // If `true`, the control will be collapsed into an icon and expanded on mouse hover, touch, or keyboard activation.
        collapsed: !0,
        position: "topright",
        // @option autoZIndex: Boolean = true
        // If `true`, the control will assign zIndexes in increasing order to all of its layers so that the order is preserved when switching them on/off.
        autoZIndex: !0,
        // @option hideSingleBase: Boolean = false
        // If `true`, the base layers in the control will be hidden when there is only one.
        hideSingleBase: !1,
        // @option sortLayers: Boolean = false
        // Whether to sort the layers. When `false`, layers will keep the order
        // in which they were added to the control.
        sortLayers: !1,
        // @option sortFunction: Function = *
        // A [compare function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
        // that will be used for sorting the layers, when `sortLayers` is `true`.
        // The function receives both the `L.Layer` instances and their names, as in
        // `sortFunction(layerA, layerB, nameA, nameB)`.
        // By default, it sorts layers alphabetically by their name.
        sortFunction: function(t, e, i, n) {
          return i < n ? -1 : n < i ? 1 : 0;
        }
      },
      initialize: function(t, e, i) {
        k(this, i), this._layerControlInputs = [], this._layers = [], this._lastZIndex = 0, this._handlingClick = !1, this._preventClick = !1;
        for (var n in t)
          this._addLayer(t[n], n);
        for (n in e)
          this._addLayer(e[n], n, !0);
      },
      onAdd: function(t) {
        this._initLayout(), this._update(), this._map = t, t.on("zoomend", this._checkDisabledLayers, this);
        for (var e = 0; e < this._layers.length; e++)
          this._layers[e].layer.on("add remove", this._onLayerChange, this);
        return this._container;
      },
      addTo: function(t) {
        return _t.prototype.addTo.call(this, t), this._expandIfNotCollapsed();
      },
      onRemove: function() {
        this._map.off("zoomend", this._checkDisabledLayers, this);
        for (var t = 0; t < this._layers.length; t++)
          this._layers[t].layer.off("add remove", this._onLayerChange, this);
      },
      // @method addBaseLayer(layer: Layer, name: String): this
      // Adds a base layer (radio button entry) with the given name to the control.
      addBaseLayer: function(t, e) {
        return this._addLayer(t, e), this._map ? this._update() : this;
      },
      // @method addOverlay(layer: Layer, name: String): this
      // Adds an overlay (checkbox entry) with the given name to the control.
      addOverlay: function(t, e) {
        return this._addLayer(t, e, !0), this._map ? this._update() : this;
      },
      // @method removeLayer(layer: Layer): this
      // Remove the given layer from the control.
      removeLayer: function(t) {
        t.off("add remove", this._onLayerChange, this);
        var e = this._getLayer(f(t));
        return e && this._layers.splice(this._layers.indexOf(e), 1), this._map ? this._update() : this;
      },
      // @method expand(): this
      // Expand the control container if collapsed.
      expand: function() {
        R(this._container, "leaflet-control-layers-expanded"), this._section.style.height = null;
        var t = this._map.getSize().y - (this._container.offsetTop + 50);
        return t < this._section.clientHeight ? (R(this._section, "leaflet-control-layers-scrollbar"), this._section.style.height = t + "px") : X(this._section, "leaflet-control-layers-scrollbar"), this._checkDisabledLayers(), this;
      },
      // @method collapse(): this
      // Collapse the control container if expanded.
      collapse: function() {
        return X(this._container, "leaflet-control-layers-expanded"), this;
      },
      _initLayout: function() {
        var t = "leaflet-control-layers", e = this._container = W("div", t), i = this.options.collapsed;
        e.setAttribute("aria-haspopup", !0), oe(e), Qe(e);
        var n = this._section = W("section", t + "-list");
        i && (this._map.on("click", this.collapse, this), Z(e, {
          mouseenter: this._expandSafely,
          mouseleave: this.collapse
        }, this));
        var a = this._layersLink = W("a", t + "-toggle", e);
        a.href = "#", a.title = "Layers", a.setAttribute("role", "button"), Z(a, {
          keydown: function(l) {
            l.keyCode === 13 && this._expandSafely();
          },
          // Certain screen readers intercept the key event and instead send a click event
          click: function(l) {
            nt(l), this._expandSafely();
          }
        }, this), i || this.expand(), this._baseLayersList = W("div", t + "-base", n), this._separator = W("div", t + "-separator", n), this._overlaysList = W("div", t + "-overlays", n), e.appendChild(n);
      },
      _getLayer: function(t) {
        for (var e = 0; e < this._layers.length; e++)
          if (this._layers[e] && f(this._layers[e].layer) === t)
            return this._layers[e];
      },
      _addLayer: function(t, e, i) {
        this._map && t.on("add remove", this._onLayerChange, this), this._layers.push({
          layer: t,
          name: e,
          overlay: i
        }), this.options.sortLayers && this._layers.sort(h(function(n, a) {
          return this.options.sortFunction(n.layer, a.layer, n.name, a.name);
        }, this)), this.options.autoZIndex && t.setZIndex && (this._lastZIndex++, t.setZIndex(this._lastZIndex)), this._expandIfNotCollapsed();
      },
      _update: function() {
        if (!this._container)
          return this;
        pe(this._baseLayersList), pe(this._overlaysList), this._layerControlInputs = [];
        var t, e, i, n, a = 0;
        for (i = 0; i < this._layers.length; i++)
          n = this._layers[i], this._addItem(n), e = e || n.overlay, t = t || !n.overlay, a += n.overlay ? 0 : 1;
        return this.options.hideSingleBase && (t = t && a > 1, this._baseLayersList.style.display = t ? "" : "none"), this._separator.style.display = e && t ? "" : "none", this;
      },
      _onLayerChange: function(t) {
        this._handlingClick || this._update();
        var e = this._getLayer(f(t.target)), i = e.overlay ? t.type === "add" ? "overlayadd" : "overlayremove" : t.type === "add" ? "baselayerchange" : null;
        i && this._map.fire(i, e);
      },
      // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see https://stackoverflow.com/a/119079)
      _createRadioElement: function(t, e) {
        var i = '<input type="radio" class="leaflet-control-layers-selector" name="' + t + '"' + (e ? ' checked="checked"' : "") + "/>", n = document.createElement("div");
        return n.innerHTML = i, n.firstChild;
      },
      _addItem: function(t) {
        var e = document.createElement("label"), i = this._map.hasLayer(t.layer), n;
        t.overlay ? (n = document.createElement("input"), n.type = "checkbox", n.className = "leaflet-control-layers-selector", n.defaultChecked = i) : n = this._createRadioElement("leaflet-base-layers_" + f(this), i), this._layerControlInputs.push(n), n.layerId = f(t.layer), Z(n, "click", this._onInputClick, this);
        var a = document.createElement("span");
        a.innerHTML = " " + t.name;
        var l = document.createElement("span");
        e.appendChild(l), l.appendChild(n), l.appendChild(a);
        var u = t.overlay ? this._overlaysList : this._baseLayersList;
        return u.appendChild(e), this._checkDisabledLayers(), e;
      },
      _onInputClick: function() {
        if (!this._preventClick) {
          var t = this._layerControlInputs, e, i, n = [], a = [];
          this._handlingClick = !0;
          for (var l = t.length - 1; l >= 0; l--)
            e = t[l], i = this._getLayer(e.layerId).layer, e.checked ? n.push(i) : e.checked || a.push(i);
          for (l = 0; l < a.length; l++)
            this._map.hasLayer(a[l]) && this._map.removeLayer(a[l]);
          for (l = 0; l < n.length; l++)
            this._map.hasLayer(n[l]) || this._map.addLayer(n[l]);
          this._handlingClick = !1, this._refocusOnMap();
        }
      },
      _checkDisabledLayers: function() {
        for (var t = this._layerControlInputs, e, i, n = this._map.getZoom(), a = t.length - 1; a >= 0; a--)
          e = t[a], i = this._getLayer(e.layerId).layer, e.disabled = i.options.minZoom !== void 0 && n < i.options.minZoom || i.options.maxZoom !== void 0 && n > i.options.maxZoom;
      },
      _expandIfNotCollapsed: function() {
        return this._map && !this.options.collapsed && this.expand(), this;
      },
      _expandSafely: function() {
        var t = this._section;
        this._preventClick = !0, Z(t, "click", nt), this.expand();
        var e = this;
        setTimeout(function() {
          j(t, "click", nt), e._preventClick = !1;
        });
      }
    }), Ln = function(t, e, i) {
      return new Ji(t, e, i);
    }, ei = _t.extend({
      // @section
      // @aka Control.Zoom options
      options: {
        position: "topleft",
        // @option zoomInText: String = '<span aria-hidden="true">+</span>'
        // The text set on the 'zoom in' button.
        zoomInText: '<span aria-hidden="true">+</span>',
        // @option zoomInTitle: String = 'Zoom in'
        // The title set on the 'zoom in' button.
        zoomInTitle: "Zoom in",
        // @option zoomOutText: String = '<span aria-hidden="true">&#x2212;</span>'
        // The text set on the 'zoom out' button.
        zoomOutText: '<span aria-hidden="true">&#x2212;</span>',
        // @option zoomOutTitle: String = 'Zoom out'
        // The title set on the 'zoom out' button.
        zoomOutTitle: "Zoom out"
      },
      onAdd: function(t) {
        var e = "leaflet-control-zoom", i = W("div", e + " leaflet-bar"), n = this.options;
        return this._zoomInButton = this._createButton(
          n.zoomInText,
          n.zoomInTitle,
          e + "-in",
          i,
          this._zoomIn
        ), this._zoomOutButton = this._createButton(
          n.zoomOutText,
          n.zoomOutTitle,
          e + "-out",
          i,
          this._zoomOut
        ), this._updateDisabled(), t.on("zoomend zoomlevelschange", this._updateDisabled, this), i;
      },
      onRemove: function(t) {
        t.off("zoomend zoomlevelschange", this._updateDisabled, this);
      },
      disable: function() {
        return this._disabled = !0, this._updateDisabled(), this;
      },
      enable: function() {
        return this._disabled = !1, this._updateDisabled(), this;
      },
      _zoomIn: function(t) {
        !this._disabled && this._map._zoom < this._map.getMaxZoom() && this._map.zoomIn(this._map.options.zoomDelta * (t.shiftKey ? 3 : 1));
      },
      _zoomOut: function(t) {
        !this._disabled && this._map._zoom > this._map.getMinZoom() && this._map.zoomOut(this._map.options.zoomDelta * (t.shiftKey ? 3 : 1));
      },
      _createButton: function(t, e, i, n, a) {
        var l = W("a", i, n);
        return l.innerHTML = t, l.href = "#", l.title = e, l.setAttribute("role", "button"), l.setAttribute("aria-label", e), oe(l), Z(l, "click", Nt), Z(l, "click", a, this), Z(l, "click", this._refocusOnMap, this), l;
      },
      _updateDisabled: function() {
        var t = this._map, e = "leaflet-disabled";
        X(this._zoomInButton, e), X(this._zoomOutButton, e), this._zoomInButton.setAttribute("aria-disabled", "false"), this._zoomOutButton.setAttribute("aria-disabled", "false"), (this._disabled || t._zoom === t.getMinZoom()) && (R(this._zoomOutButton, e), this._zoomOutButton.setAttribute("aria-disabled", "true")), (this._disabled || t._zoom === t.getMaxZoom()) && (R(this._zoomInButton, e), this._zoomInButton.setAttribute("aria-disabled", "true"));
      }
    });
    F.mergeOptions({
      zoomControl: !0
    }), F.addInitHook(function() {
      this.options.zoomControl && (this.zoomControl = new ei(), this.addControl(this.zoomControl));
    });
    var Pn = function(t) {
      return new ei(t);
    }, Qi = _t.extend({
      // @section
      // @aka Control.Scale options
      options: {
        position: "bottomleft",
        // @option maxWidth: Number = 100
        // Maximum width of the control in pixels. The width is set dynamically to show round values (e.g. 100, 200, 500).
        maxWidth: 100,
        // @option metric: Boolean = True
        // Whether to show the metric scale line (m/km).
        metric: !0,
        // @option imperial: Boolean = True
        // Whether to show the imperial scale line (mi/ft).
        imperial: !0
        // @option updateWhenIdle: Boolean = false
        // If `true`, the control is updated on [`moveend`](#map-moveend), otherwise it's always up-to-date (updated on [`move`](#map-move)).
      },
      onAdd: function(t) {
        var e = "leaflet-control-scale", i = W("div", e), n = this.options;
        return this._addScales(n, e + "-line", i), t.on(n.updateWhenIdle ? "moveend" : "move", this._update, this), t.whenReady(this._update, this), i;
      },
      onRemove: function(t) {
        t.off(this.options.updateWhenIdle ? "moveend" : "move", this._update, this);
      },
      _addScales: function(t, e, i) {
        t.metric && (this._mScale = W("div", e, i)), t.imperial && (this._iScale = W("div", e, i));
      },
      _update: function() {
        var t = this._map, e = t.getSize().y / 2, i = t.distance(
          t.containerPointToLatLng([0, e]),
          t.containerPointToLatLng([this.options.maxWidth, e])
        );
        this._updateScales(i);
      },
      _updateScales: function(t) {
        this.options.metric && t && this._updateMetric(t), this.options.imperial && t && this._updateImperial(t);
      },
      _updateMetric: function(t) {
        var e = this._getRoundNum(t), i = e < 1e3 ? e + " m" : e / 1e3 + " km";
        this._updateScale(this._mScale, i, e / t);
      },
      _updateImperial: function(t) {
        var e = t * 3.2808399, i, n, a;
        e > 5280 ? (i = e / 5280, n = this._getRoundNum(i), this._updateScale(this._iScale, n + " mi", n / i)) : (a = this._getRoundNum(e), this._updateScale(this._iScale, a + " ft", a / e));
      },
      _updateScale: function(t, e, i) {
        t.style.width = Math.round(this.options.maxWidth * i) + "px", t.innerHTML = e;
      },
      _getRoundNum: function(t) {
        var e = Math.pow(10, (Math.floor(t) + "").length - 1), i = t / e;
        return i = i >= 10 ? 10 : i >= 5 ? 5 : i >= 3 ? 3 : i >= 2 ? 2 : 1, e * i;
      }
    }), Cn = function(t) {
      return new Qi(t);
    }, An = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="leaflet-attribution-flag"><path fill="#4C7BE1" d="M0 0h12v4H0z"/><path fill="#FFD500" d="M0 4h12v3H0z"/><path fill="#E0BC00" d="M0 7h12v1H0z"/></svg>', ii = _t.extend({
      // @section
      // @aka Control.Attribution options
      options: {
        position: "bottomright",
        // @option prefix: String|false = 'Leaflet'
        // The HTML text shown before the attributions. Pass `false` to disable.
        prefix: '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">' + (S.inlineSvg ? An + " " : "") + "Leaflet</a>"
      },
      initialize: function(t) {
        k(this, t), this._attributions = {};
      },
      onAdd: function(t) {
        t.attributionControl = this, this._container = W("div", "leaflet-control-attribution"), oe(this._container);
        for (var e in t._layers)
          t._layers[e].getAttribution && this.addAttribution(t._layers[e].getAttribution());
        return this._update(), t.on("layeradd", this._addAttribution, this), this._container;
      },
      onRemove: function(t) {
        t.off("layeradd", this._addAttribution, this);
      },
      _addAttribution: function(t) {
        t.layer.getAttribution && (this.addAttribution(t.layer.getAttribution()), t.layer.once("remove", function() {
          this.removeAttribution(t.layer.getAttribution());
        }, this));
      },
      // @method setPrefix(prefix: String|false): this
      // The HTML text shown before the attributions. Pass `false` to disable.
      setPrefix: function(t) {
        return this.options.prefix = t, this._update(), this;
      },
      // @method addAttribution(text: String): this
      // Adds an attribution text (e.g. `'&copy; OpenStreetMap contributors'`).
      addAttribution: function(t) {
        return t ? (this._attributions[t] || (this._attributions[t] = 0), this._attributions[t]++, this._update(), this) : this;
      },
      // @method removeAttribution(text: String): this
      // Removes an attribution text.
      removeAttribution: function(t) {
        return t ? (this._attributions[t] && (this._attributions[t]--, this._update()), this) : this;
      },
      _update: function() {
        if (this._map) {
          var t = [];
          for (var e in this._attributions)
            this._attributions[e] && t.push(e);
          var i = [];
          this.options.prefix && i.push(this.options.prefix), t.length && i.push(t.join(", ")), this._container.innerHTML = i.join(' <span aria-hidden="true">|</span> ');
        }
      }
    });
    F.mergeOptions({
      attributionControl: !0
    }), F.addInitHook(function() {
      this.options.attributionControl && new ii().addTo(this);
    });
    var Mn = function(t) {
      return new ii(t);
    };
    _t.Layers = Ji, _t.Zoom = ei, _t.Scale = Qi, _t.Attribution = ii, ne.layers = Ln, ne.zoom = Pn, ne.scale = Cn, ne.attribution = Mn;
    var wt = Et.extend({
      initialize: function(t) {
        this._map = t;
      },
      // @method enable(): this
      // Enables the handler
      enable: function() {
        return this._enabled ? this : (this._enabled = !0, this.addHooks(), this);
      },
      // @method disable(): this
      // Disables the handler
      disable: function() {
        return this._enabled ? (this._enabled = !1, this.removeHooks(), this) : this;
      },
      // @method enabled(): Boolean
      // Returns `true` if the handler is enabled
      enabled: function() {
        return !!this._enabled;
      }
      // @section Extension methods
      // Classes inheriting from `Handler` must implement the two following methods:
      // @method addHooks()
      // Called when the handler is enabled, should add event hooks.
      // @method removeHooks()
      // Called when the handler is disabled, should remove the event hooks added previously.
    });
    wt.addTo = function(t, e) {
      return t.addHandler(e, this), this;
    };
    var Sn = { Events: ut }, to = S.touch ? "touchstart mousedown" : "mousedown", zt = Yt.extend({
      options: {
        // @section
        // @aka Draggable options
        // @option clickTolerance: Number = 3
        // The max number of pixels a user can shift the mouse pointer during a click
        // for it to be considered a valid click (as opposed to a mouse drag).
        clickTolerance: 3
      },
      // @constructor L.Draggable(el: HTMLElement, dragHandle?: HTMLElement, preventOutline?: Boolean, options?: Draggable options)
      // Creates a `Draggable` object for moving `el` when you start dragging the `dragHandle` element (equals `el` itself by default).
      initialize: function(t, e, i, n) {
        k(this, n), this._element = t, this._dragStartTarget = e || t, this._preventOutline = i;
      },
      // @method enable()
      // Enables the dragging ability
      enable: function() {
        this._enabled || (Z(this._dragStartTarget, to, this._onDown, this), this._enabled = !0);
      },
      // @method disable()
      // Disables the dragging ability
      disable: function() {
        this._enabled && (zt._dragging === this && this.finishDrag(!0), j(this._dragStartTarget, to, this._onDown, this), this._enabled = !1, this._moved = !1);
      },
      _onDown: function(t) {
        if (this._enabled && (this._moved = !1, !Fe(this._element, "leaflet-zoom-anim"))) {
          if (t.touches && t.touches.length !== 1) {
            zt._dragging === this && this.finishDrag();
            return;
          }
          if (!(zt._dragging || t.shiftKey || t.which !== 1 && t.button !== 1 && !t.touches) && (zt._dragging = this, this._preventOutline && je(this._element), Ve(), te(), !this._moving)) {
            this.fire("down");
            var e = t.touches ? t.touches[0] : t, i = Gi(this._element);
            this._startPoint = new N(e.clientX, e.clientY), this._startPos = Ot(this._element), this._parentScale = Ye(i);
            var n = t.type === "mousedown";
            Z(document, n ? "mousemove" : "touchmove", this._onMove, this), Z(document, n ? "mouseup" : "touchend touchcancel", this._onUp, this);
          }
        }
      },
      _onMove: function(t) {
        if (this._enabled) {
          if (t.touches && t.touches.length > 1) {
            this._moved = !0;
            return;
          }
          var e = t.touches && t.touches.length === 1 ? t.touches[0] : t, i = new N(e.clientX, e.clientY)._subtract(this._startPoint);
          !i.x && !i.y || Math.abs(i.x) + Math.abs(i.y) < this.options.clickTolerance || (i.x /= this._parentScale.x, i.y /= this._parentScale.y, nt(t), this._moved || (this.fire("dragstart"), this._moved = !0, R(document.body, "leaflet-dragging"), this._lastTarget = t.target || t.srcElement, window.SVGElementInstance && this._lastTarget instanceof window.SVGElementInstance && (this._lastTarget = this._lastTarget.correspondingUseElement), R(this._lastTarget, "leaflet-drag-target")), this._newPos = this._startPos.add(i), this._moving = !0, this._lastEvent = t, this._updatePosition());
        }
      },
      _updatePosition: function() {
        var t = { originalEvent: this._lastEvent };
        this.fire("predrag", t), tt(this._element, this._newPos), this.fire("drag", t);
      },
      _onUp: function() {
        this._enabled && this.finishDrag();
      },
      finishDrag: function(t) {
        X(document.body, "leaflet-dragging"), this._lastTarget && (X(this._lastTarget, "leaflet-drag-target"), this._lastTarget = null), j(document, "mousemove touchmove", this._onMove, this), j(document, "mouseup touchend touchcancel", this._onUp, this), Ge(), ee();
        var e = this._moved && this._moving;
        this._moving = !1, zt._dragging = !1, e && this.fire("dragend", {
          noInertia: t,
          distance: this._newPos.distanceTo(this._startPos)
        });
      }
    });
    function eo(t, e, i) {
      var n, a = [1, 4, 2, 8], l, u, g, _, x, P, I, D;
      for (l = 0, P = t.length; l < P; l++)
        t[l]._code = Zt(t[l], e);
      for (g = 0; g < 4; g++) {
        for (I = a[g], n = [], l = 0, P = t.length, u = P - 1; l < P; u = l++)
          _ = t[l], x = t[u], _._code & I ? x._code & I || (D = ve(x, _, I, e, i), D._code = Zt(D, e), n.push(D)) : (x._code & I && (D = ve(x, _, I, e, i), D._code = Zt(D, e), n.push(D)), n.push(_));
        t = n;
      }
      return t;
    }
    function io(t, e) {
      var i, n, a, l, u, g, _, x, P;
      if (!t || t.length === 0)
        throw new Error("latlngs not passed");
      mt(t) || (console.warn("latlngs are not flat! Only the first ring will be used"), t = t[0]);
      var I = q([0, 0]), D = Q(t), at = D.getNorthWest().distanceTo(D.getSouthWest()) * D.getNorthEast().distanceTo(D.getNorthWest());
      at < 1700 && (I = oi(t));
      var ot = t.length, gt = [];
      for (i = 0; i < ot; i++) {
        var ht = q(t[i]);
        gt.push(e.project(q([ht.lat - I.lat, ht.lng - I.lng])));
      }
      for (g = _ = x = 0, i = 0, n = ot - 1; i < ot; n = i++)
        a = gt[i], l = gt[n], u = a.y * l.x - l.y * a.x, _ += (a.x + l.x) * u, x += (a.y + l.y) * u, g += u * 3;
      g === 0 ? P = gt[0] : P = [_ / g, x / g];
      var jt = e.unproject(B(P));
      return q([jt.lat + I.lat, jt.lng + I.lng]);
    }
    function oi(t) {
      for (var e = 0, i = 0, n = 0, a = 0; a < t.length; a++) {
        var l = q(t[a]);
        e += l.lat, i += l.lng, n++;
      }
      return q([e / n, i / n]);
    }
    var zn = {
      __proto__: null,
      clipPolygon: eo,
      polygonCenter: io,
      centroid: oi
    };
    function oo(t, e) {
      if (!e || !t.length)
        return t.slice();
      var i = e * e;
      return t = On(t, i), t = In(t, i), t;
    }
    function no(t, e, i) {
      return Math.sqrt(ae(t, e, i, !0));
    }
    function Tn(t, e, i) {
      return ae(t, e, i);
    }
    function In(t, e) {
      var i = t.length, n = typeof Uint8Array < "u" ? Uint8Array : Array, a = new n(i);
      a[0] = a[i - 1] = 1, ni(t, a, e, 0, i - 1);
      var l, u = [];
      for (l = 0; l < i; l++)
        a[l] && u.push(t[l]);
      return u;
    }
    function ni(t, e, i, n, a) {
      var l = 0, u, g, _;
      for (g = n + 1; g <= a - 1; g++)
        _ = ae(t[g], t[n], t[a], !0), _ > l && (u = g, l = _);
      l > i && (e[u] = 1, ni(t, e, i, n, u), ni(t, e, i, u, a));
    }
    function On(t, e) {
      for (var i = [t[0]], n = 1, a = 0, l = t.length; n < l; n++)
        Bn(t[n], t[a]) > e && (i.push(t[n]), a = n);
      return a < l - 1 && i.push(t[l - 1]), i;
    }
    var ao;
    function so(t, e, i, n, a) {
      var l = n ? ao : Zt(t, i), u = Zt(e, i), g, _, x;
      for (ao = u; ; ) {
        if (!(l | u))
          return [t, e];
        if (l & u)
          return !1;
        g = l || u, _ = ve(t, e, g, i, a), x = Zt(_, i), g === l ? (t = _, l = x) : (e = _, u = x);
      }
    }
    function ve(t, e, i, n, a) {
      var l = e.x - t.x, u = e.y - t.y, g = n.min, _ = n.max, x, P;
      return i & 8 ? (x = t.x + l * (_.y - t.y) / u, P = _.y) : i & 4 ? (x = t.x + l * (g.y - t.y) / u, P = g.y) : i & 2 ? (x = _.x, P = t.y + u * (_.x - t.x) / l) : i & 1 && (x = g.x, P = t.y + u * (g.x - t.x) / l), new N(x, P, a);
    }
    function Zt(t, e) {
      var i = 0;
      return t.x < e.min.x ? i |= 1 : t.x > e.max.x && (i |= 2), t.y < e.min.y ? i |= 4 : t.y > e.max.y && (i |= 8), i;
    }
    function Bn(t, e) {
      var i = e.x - t.x, n = e.y - t.y;
      return i * i + n * n;
    }
    function ae(t, e, i, n) {
      var a = e.x, l = e.y, u = i.x - a, g = i.y - l, _ = u * u + g * g, x;
      return _ > 0 && (x = ((t.x - a) * u + (t.y - l) * g) / _, x > 1 ? (a = i.x, l = i.y) : x > 0 && (a += u * x, l += g * x)), u = t.x - a, g = t.y - l, n ? u * u + g * g : new N(a, l);
    }
    function mt(t) {
      return !V(t[0]) || typeof t[0][0] != "object" && typeof t[0][0] < "u";
    }
    function ro(t) {
      return console.warn("Deprecated use of _flat, please use L.LineUtil.isFlat instead."), mt(t);
    }
    function lo(t, e) {
      var i, n, a, l, u, g, _, x;
      if (!t || t.length === 0)
        throw new Error("latlngs not passed");
      mt(t) || (console.warn("latlngs are not flat! Only the first ring will be used"), t = t[0]);
      var P = q([0, 0]), I = Q(t), D = I.getNorthWest().distanceTo(I.getSouthWest()) * I.getNorthEast().distanceTo(I.getNorthWest());
      D < 1700 && (P = oi(t));
      var at = t.length, ot = [];
      for (i = 0; i < at; i++) {
        var gt = q(t[i]);
        ot.push(e.project(q([gt.lat - P.lat, gt.lng - P.lng])));
      }
      for (i = 0, n = 0; i < at - 1; i++)
        n += ot[i].distanceTo(ot[i + 1]) / 2;
      if (n === 0)
        x = ot[0];
      else
        for (i = 0, l = 0; i < at - 1; i++)
          if (u = ot[i], g = ot[i + 1], a = u.distanceTo(g), l += a, l > n) {
            _ = (l - n) / a, x = [
              g.x - _ * (g.x - u.x),
              g.y - _ * (g.y - u.y)
            ];
            break;
          }
      var ht = e.unproject(B(x));
      return q([ht.lat + P.lat, ht.lng + P.lng]);
    }
    var Nn = {
      __proto__: null,
      simplify: oo,
      pointToSegmentDistance: no,
      closestPointOnSegment: Tn,
      clipSegment: so,
      _getEdgeIntersection: ve,
      _getBitCode: Zt,
      _sqClosestPointOnSegment: ae,
      isFlat: mt,
      _flat: ro,
      polylineCenter: lo
    }, ai = {
      project: function(t) {
        return new N(t.lng, t.lat);
      },
      unproject: function(t) {
        return new G(t.y, t.x);
      },
      bounds: new Y([-180, -90], [180, 90])
    }, si = {
      R: 6378137,
      R_MINOR: 6356752314245179e-9,
      bounds: new Y([-2003750834279e-5, -1549657073972e-5], [2003750834279e-5, 1876465623138e-5]),
      project: function(t) {
        var e = Math.PI / 180, i = this.R, n = t.lat * e, a = this.R_MINOR / i, l = Math.sqrt(1 - a * a), u = l * Math.sin(n), g = Math.tan(Math.PI / 4 - n / 2) / Math.pow((1 - u) / (1 + u), l / 2);
        return n = -i * Math.log(Math.max(g, 1e-10)), new N(t.lng * e * i, n);
      },
      unproject: function(t) {
        for (var e = 180 / Math.PI, i = this.R, n = this.R_MINOR / i, a = Math.sqrt(1 - n * n), l = Math.exp(-t.y / i), u = Math.PI / 2 - 2 * Math.atan(l), g = 0, _ = 0.1, x; g < 15 && Math.abs(_) > 1e-7; g++)
          x = a * Math.sin(u), x = Math.pow((1 - x) / (1 + x), a / 2), _ = Math.PI / 2 - 2 * Math.atan(l * x) - u, u += _;
        return new G(u * e, t.x * e / i);
      }
    }, Zn = {
      __proto__: null,
      LonLat: ai,
      Mercator: si,
      SphericalMercator: Te
    }, Rn = r({}, St, {
      code: "EPSG:3395",
      projection: si,
      transformation: function() {
        var t = 0.5 / (Math.PI * si.R);
        return Kt(t, 0.5, -t, 0.5);
      }()
    }), co = r({}, St, {
      code: "EPSG:4326",
      projection: ai,
      transformation: Kt(1 / 180, 1, -1 / 180, 0.5)
    }), Dn = r({}, Lt, {
      projection: ai,
      transformation: Kt(1, 0, -1, 0),
      scale: function(t) {
        return Math.pow(2, t);
      },
      zoom: function(t) {
        return Math.log(t) / Math.LN2;
      },
      distance: function(t, e) {
        var i = e.lng - t.lng, n = e.lat - t.lat;
        return Math.sqrt(i * i + n * n);
      },
      infinite: !0
    });
    Lt.Earth = St, Lt.EPSG3395 = Rn, Lt.EPSG3857 = Oe, Lt.EPSG900913 = $o, Lt.EPSG4326 = co, Lt.Simple = Dn;
    var vt = Yt.extend({
      // Classes extending `L.Layer` will inherit the following options:
      options: {
        // @option pane: String = 'overlayPane'
        // By default the layer will be added to the map's [overlay pane](#map-overlaypane). Overriding this option will cause the layer to be placed on another pane by default.
        pane: "overlayPane",
        // @option attribution: String = null
        // String to be shown in the attribution control, e.g. "© OpenStreetMap contributors". It describes the layer data and is often a legal obligation towards copyright holders and tile providers.
        attribution: null,
        bubblingMouseEvents: !0
      },
      /* @section
       * Classes extending `L.Layer` will inherit the following methods:
       *
       * @method addTo(map: Map|LayerGroup): this
       * Adds the layer to the given map or layer group.
       */
      addTo: function(t) {
        return t.addLayer(this), this;
      },
      // @method remove: this
      // Removes the layer from the map it is currently active on.
      remove: function() {
        return this.removeFrom(this._map || this._mapToAdd);
      },
      // @method removeFrom(map: Map): this
      // Removes the layer from the given map
      //
      // @alternative
      // @method removeFrom(group: LayerGroup): this
      // Removes the layer from the given `LayerGroup`
      removeFrom: function(t) {
        return t && t.removeLayer(this), this;
      },
      // @method getPane(name? : String): HTMLElement
      // Returns the `HTMLElement` representing the named pane on the map. If `name` is omitted, returns the pane for this layer.
      getPane: function(t) {
        return this._map.getPane(t ? this.options[t] || t : this.options.pane);
      },
      addInteractiveTarget: function(t) {
        return this._map._targets[f(t)] = this, this;
      },
      removeInteractiveTarget: function(t) {
        return delete this._map._targets[f(t)], this;
      },
      // @method getAttribution: String
      // Used by the `attribution control`, returns the [attribution option](#gridlayer-attribution).
      getAttribution: function() {
        return this.options.attribution;
      },
      _layerAdd: function(t) {
        var e = t.target;
        if (e.hasLayer(this)) {
          if (this._map = e, this._zoomAnimated = e._zoomAnimated, this.getEvents) {
            var i = this.getEvents();
            e.on(i, this), this.once("remove", function() {
              e.off(i, this);
            }, this);
          }
          this.onAdd(e), this.fire("add"), e.fire("layeradd", { layer: this });
        }
      }
    });
    F.include({
      // @method addLayer(layer: Layer): this
      // Adds the given layer to the map
      addLayer: function(t) {
        if (!t._layerAdd)
          throw new Error("The provided object is not a Layer.");
        var e = f(t);
        return this._layers[e] ? this : (this._layers[e] = t, t._mapToAdd = this, t.beforeAdd && t.beforeAdd(this), this.whenReady(t._layerAdd, t), this);
      },
      // @method removeLayer(layer: Layer): this
      // Removes the given layer from the map.
      removeLayer: function(t) {
        var e = f(t);
        return this._layers[e] ? (this._loaded && t.onRemove(this), delete this._layers[e], this._loaded && (this.fire("layerremove", { layer: t }), t.fire("remove")), t._map = t._mapToAdd = null, this) : this;
      },
      // @method hasLayer(layer: Layer): Boolean
      // Returns `true` if the given layer is currently added to the map
      hasLayer: function(t) {
        return f(t) in this._layers;
      },
      /* @method eachLayer(fn: Function, context?: Object): this
       * Iterates over the layers of the map, optionally specifying context of the iterator function.
       * ```
       * map.eachLayer(function(layer){
       *     layer.bindPopup('Hello');
       * });
       * ```
       */
      eachLayer: function(t, e) {
        for (var i in this._layers)
          t.call(e, this._layers[i]);
        return this;
      },
      _addLayers: function(t) {
        t = t ? V(t) ? t : [t] : [];
        for (var e = 0, i = t.length; e < i; e++)
          this.addLayer(t[e]);
      },
      _addZoomLimit: function(t) {
        (!isNaN(t.options.maxZoom) || !isNaN(t.options.minZoom)) && (this._zoomBoundLayers[f(t)] = t, this._updateZoomLevels());
      },
      _removeZoomLimit: function(t) {
        var e = f(t);
        this._zoomBoundLayers[e] && (delete this._zoomBoundLayers[e], this._updateZoomLevels());
      },
      _updateZoomLevels: function() {
        var t = 1 / 0, e = -1 / 0, i = this._getZoomSpan();
        for (var n in this._zoomBoundLayers) {
          var a = this._zoomBoundLayers[n].options;
          t = a.minZoom === void 0 ? t : Math.min(t, a.minZoom), e = a.maxZoom === void 0 ? e : Math.max(e, a.maxZoom);
        }
        this._layersMaxZoom = e === -1 / 0 ? void 0 : e, this._layersMinZoom = t === 1 / 0 ? void 0 : t, i !== this._getZoomSpan() && this.fire("zoomlevelschange"), this.options.maxZoom === void 0 && this._layersMaxZoom && this.getZoom() > this._layersMaxZoom && this.setZoom(this._layersMaxZoom), this.options.minZoom === void 0 && this._layersMinZoom && this.getZoom() < this._layersMinZoom && this.setZoom(this._layersMinZoom);
      }
    });
    var Wt = vt.extend({
      initialize: function(t, e) {
        k(this, e), this._layers = {};
        var i, n;
        if (t)
          for (i = 0, n = t.length; i < n; i++)
            this.addLayer(t[i]);
      },
      // @method addLayer(layer: Layer): this
      // Adds the given layer to the group.
      addLayer: function(t) {
        var e = this.getLayerId(t);
        return this._layers[e] = t, this._map && this._map.addLayer(t), this;
      },
      // @method removeLayer(layer: Layer): this
      // Removes the given layer from the group.
      // @alternative
      // @method removeLayer(id: Number): this
      // Removes the layer with the given internal ID from the group.
      removeLayer: function(t) {
        var e = t in this._layers ? t : this.getLayerId(t);
        return this._map && this._layers[e] && this._map.removeLayer(this._layers[e]), delete this._layers[e], this;
      },
      // @method hasLayer(layer: Layer): Boolean
      // Returns `true` if the given layer is currently added to the group.
      // @alternative
      // @method hasLayer(id: Number): Boolean
      // Returns `true` if the given internal ID is currently added to the group.
      hasLayer: function(t) {
        var e = typeof t == "number" ? t : this.getLayerId(t);
        return e in this._layers;
      },
      // @method clearLayers(): this
      // Removes all the layers from the group.
      clearLayers: function() {
        return this.eachLayer(this.removeLayer, this);
      },
      // @method invoke(methodName: String, …): this
      // Calls `methodName` on every layer contained in this group, passing any
      // additional parameters. Has no effect if the layers contained do not
      // implement `methodName`.
      invoke: function(t) {
        var e = Array.prototype.slice.call(arguments, 1), i, n;
        for (i in this._layers)
          n = this._layers[i], n[t] && n[t].apply(n, e);
        return this;
      },
      onAdd: function(t) {
        this.eachLayer(t.addLayer, t);
      },
      onRemove: function(t) {
        this.eachLayer(t.removeLayer, t);
      },
      // @method eachLayer(fn: Function, context?: Object): this
      // Iterates over the layers of the group, optionally specifying context of the iterator function.
      // ```js
      // group.eachLayer(function (layer) {
      // 	layer.bindPopup('Hello');
      // });
      // ```
      eachLayer: function(t, e) {
        for (var i in this._layers)
          t.call(e, this._layers[i]);
        return this;
      },
      // @method getLayer(id: Number): Layer
      // Returns the layer with the given internal ID.
      getLayer: function(t) {
        return this._layers[t];
      },
      // @method getLayers(): Layer[]
      // Returns an array of all the layers added to the group.
      getLayers: function() {
        var t = [];
        return this.eachLayer(t.push, t), t;
      },
      // @method setZIndex(zIndex: Number): this
      // Calls `setZIndex` on every layer contained in this group, passing the z-index.
      setZIndex: function(t) {
        return this.invoke("setZIndex", t);
      },
      // @method getLayerId(layer: Layer): Number
      // Returns the internal ID for a layer
      getLayerId: function(t) {
        return f(t);
      }
    }), Hn = function(t, e) {
      return new Wt(t, e);
    }, Pt = Wt.extend({
      addLayer: function(t) {
        return this.hasLayer(t) ? this : (t.addEventParent(this), Wt.prototype.addLayer.call(this, t), this.fire("layeradd", { layer: t }));
      },
      removeLayer: function(t) {
        return this.hasLayer(t) ? (t in this._layers && (t = this._layers[t]), t.removeEventParent(this), Wt.prototype.removeLayer.call(this, t), this.fire("layerremove", { layer: t })) : this;
      },
      // @method setStyle(style: Path options): this
      // Sets the given path options to each layer of the group that has a `setStyle` method.
      setStyle: function(t) {
        return this.invoke("setStyle", t);
      },
      // @method bringToFront(): this
      // Brings the layer group to the top of all other layers
      bringToFront: function() {
        return this.invoke("bringToFront");
      },
      // @method bringToBack(): this
      // Brings the layer group to the back of all other layers
      bringToBack: function() {
        return this.invoke("bringToBack");
      },
      // @method getBounds(): LatLngBounds
      // Returns the LatLngBounds of the Feature Group (created from bounds and coordinates of its children).
      getBounds: function() {
        var t = new ct();
        for (var e in this._layers) {
          var i = this._layers[e];
          t.extend(i.getBounds ? i.getBounds() : i.getLatLng());
        }
        return t;
      }
    }), qn = function(t, e) {
      return new Pt(t, e);
    }, $t = Et.extend({
      /* @section
       * @aka Icon options
       *
       * @option iconUrl: String = null
       * **(required)** The URL to the icon image (absolute or relative to your script path).
       *
       * @option iconRetinaUrl: String = null
       * The URL to a retina sized version of the icon image (absolute or relative to your
       * script path). Used for Retina screen devices.
       *
       * @option iconSize: Point = null
       * Size of the icon image in pixels.
       *
       * @option iconAnchor: Point = null
       * The coordinates of the "tip" of the icon (relative to its top left corner). The icon
       * will be aligned so that this point is at the marker's geographical location. Centered
       * by default if size is specified, also can be set in CSS with negative margins.
       *
       * @option popupAnchor: Point = [0, 0]
       * The coordinates of the point from which popups will "open", relative to the icon anchor.
       *
       * @option tooltipAnchor: Point = [0, 0]
       * The coordinates of the point from which tooltips will "open", relative to the icon anchor.
       *
       * @option shadowUrl: String = null
       * The URL to the icon shadow image. If not specified, no shadow image will be created.
       *
       * @option shadowRetinaUrl: String = null
       *
       * @option shadowSize: Point = null
       * Size of the shadow image in pixels.
       *
       * @option shadowAnchor: Point = null
       * The coordinates of the "tip" of the shadow (relative to its top left corner) (the same
       * as iconAnchor if not specified).
       *
       * @option className: String = ''
       * A custom class name to assign to both icon and shadow images. Empty by default.
       */
      options: {
        popupAnchor: [0, 0],
        tooltipAnchor: [0, 0],
        // @option crossOrigin: Boolean|String = false
        // Whether the crossOrigin attribute will be added to the tiles.
        // If a String is provided, all tiles will have their crossOrigin attribute set to the String provided. This is needed if you want to access tile pixel data.
        // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
        crossOrigin: !1
      },
      initialize: function(t) {
        k(this, t);
      },
      // @method createIcon(oldIcon?: HTMLElement): HTMLElement
      // Called internally when the icon has to be shown, returns a `<img>` HTML element
      // styled according to the options.
      createIcon: function(t) {
        return this._createIcon("icon", t);
      },
      // @method createShadow(oldIcon?: HTMLElement): HTMLElement
      // As `createIcon`, but for the shadow beneath it.
      createShadow: function(t) {
        return this._createIcon("shadow", t);
      },
      _createIcon: function(t, e) {
        var i = this._getIconUrl(t);
        if (!i) {
          if (t === "icon")
            throw new Error("iconUrl not set in Icon options (see the docs).");
          return null;
        }
        var n = this._createImg(i, e && e.tagName === "IMG" ? e : null);
        return this._setIconStyles(n, t), (this.options.crossOrigin || this.options.crossOrigin === "") && (n.crossOrigin = this.options.crossOrigin === !0 ? "" : this.options.crossOrigin), n;
      },
      _setIconStyles: function(t, e) {
        var i = this.options, n = i[e + "Size"];
        typeof n == "number" && (n = [n, n]);
        var a = B(n), l = B(e === "shadow" && i.shadowAnchor || i.iconAnchor || a && a.divideBy(2, !0));
        t.className = "leaflet-marker-" + e + " " + (i.className || ""), l && (t.style.marginLeft = -l.x + "px", t.style.marginTop = -l.y + "px"), a && (t.style.width = a.x + "px", t.style.height = a.y + "px");
      },
      _createImg: function(t, e) {
        return e = e || document.createElement("img"), e.src = t, e;
      },
      _getIconUrl: function(t) {
        return S.retina && this.options[t + "RetinaUrl"] || this.options[t + "Url"];
      }
    });
    function Fn(t) {
      return new $t(t);
    }
    var se = $t.extend({
      options: {
        iconUrl: "marker-icon.png",
        iconRetinaUrl: "marker-icon-2x.png",
        shadowUrl: "marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41]
      },
      _getIconUrl: function(t) {
        return typeof se.imagePath != "string" && (se.imagePath = this._detectIconPath()), (this.options.imagePath || se.imagePath) + $t.prototype._getIconUrl.call(this, t);
      },
      _stripUrl: function(t) {
        var e = function(i, n, a) {
          var l = n.exec(i);
          return l && l[a];
        };
        return t = e(t, /^url\((['"])?(.+)\1\)$/, 2), t && e(t, /^(.*)marker-icon\.png$/, 1);
      },
      _detectIconPath: function() {
        var t = W("div", "leaflet-default-icon-path", document.body), e = Qt(t, "background-image") || Qt(t, "backgroundImage");
        if (document.body.removeChild(t), e = this._stripUrl(e), e)
          return e;
        var i = document.querySelector('link[href$="leaflet.css"]');
        return i ? i.href.substring(0, i.href.length - 11 - 1) : "";
      }
    }), ho = wt.extend({
      initialize: function(t) {
        this._marker = t;
      },
      addHooks: function() {
        var t = this._marker._icon;
        this._draggable || (this._draggable = new zt(t, t, !0)), this._draggable.on({
          dragstart: this._onDragStart,
          predrag: this._onPreDrag,
          drag: this._onDrag,
          dragend: this._onDragEnd
        }, this).enable(), R(t, "leaflet-marker-draggable");
      },
      removeHooks: function() {
        this._draggable.off({
          dragstart: this._onDragStart,
          predrag: this._onPreDrag,
          drag: this._onDrag,
          dragend: this._onDragEnd
        }, this).disable(), this._marker._icon && X(this._marker._icon, "leaflet-marker-draggable");
      },
      moved: function() {
        return this._draggable && this._draggable._moved;
      },
      _adjustPan: function(t) {
        var e = this._marker, i = e._map, n = this._marker.options.autoPanSpeed, a = this._marker.options.autoPanPadding, l = Ot(e._icon), u = i.getPixelBounds(), g = i.getPixelOrigin(), _ = lt(
          u.min._subtract(g).add(a),
          u.max._subtract(g).subtract(a)
        );
        if (!_.contains(l)) {
          var x = B(
            (Math.max(_.max.x, l.x) - _.max.x) / (u.max.x - _.max.x) - (Math.min(_.min.x, l.x) - _.min.x) / (u.min.x - _.min.x),
            (Math.max(_.max.y, l.y) - _.max.y) / (u.max.y - _.max.y) - (Math.min(_.min.y, l.y) - _.min.y) / (u.min.y - _.min.y)
          ).multiplyBy(n);
          i.panBy(x, { animate: !1 }), this._draggable._newPos._add(x), this._draggable._startPos._add(x), tt(e._icon, this._draggable._newPos), this._onDrag(t), this._panRequest = rt(this._adjustPan.bind(this, t));
        }
      },
      _onDragStart: function() {
        this._oldLatLng = this._marker.getLatLng(), this._marker.closePopup && this._marker.closePopup(), this._marker.fire("movestart").fire("dragstart");
      },
      _onPreDrag: function(t) {
        this._marker.options.autoPan && (pt(this._panRequest), this._panRequest = rt(this._adjustPan.bind(this, t)));
      },
      _onDrag: function(t) {
        var e = this._marker, i = e._shadow, n = Ot(e._icon), a = e._map.layerPointToLatLng(n);
        i && tt(i, n), e._latlng = a, t.latlng = a, t.oldLatLng = this._oldLatLng, e.fire("move", t).fire("drag", t);
      },
      _onDragEnd: function(t) {
        pt(this._panRequest), delete this._oldLatLng, this._marker.fire("moveend").fire("dragend", t);
      }
    }), be = vt.extend({
      // @section
      // @aka Marker options
      options: {
        // @option icon: Icon = *
        // Icon instance to use for rendering the marker.
        // See [Icon documentation](#L.Icon) for details on how to customize the marker icon.
        // If not specified, a common instance of `L.Icon.Default` is used.
        icon: new se(),
        // Option inherited from "Interactive layer" abstract class
        interactive: !0,
        // @option keyboard: Boolean = true
        // Whether the marker can be tabbed to with a keyboard and clicked by pressing enter.
        keyboard: !0,
        // @option title: String = ''
        // Text for the browser tooltip that appear on marker hover (no tooltip by default).
        // [Useful for accessibility](https://leafletjs.com/examples/accessibility/#markers-must-be-labelled).
        title: "",
        // @option alt: String = 'Marker'
        // Text for the `alt` attribute of the icon image.
        // [Useful for accessibility](https://leafletjs.com/examples/accessibility/#markers-must-be-labelled).
        alt: "Marker",
        // @option zIndexOffset: Number = 0
        // By default, marker images zIndex is set automatically based on its latitude. Use this option if you want to put the marker on top of all others (or below), specifying a high value like `1000` (or high negative value, respectively).
        zIndexOffset: 0,
        // @option opacity: Number = 1.0
        // The opacity of the marker.
        opacity: 1,
        // @option riseOnHover: Boolean = false
        // If `true`, the marker will get on top of others when you hover the mouse over it.
        riseOnHover: !1,
        // @option riseOffset: Number = 250
        // The z-index offset used for the `riseOnHover` feature.
        riseOffset: 250,
        // @option pane: String = 'markerPane'
        // `Map pane` where the markers icon will be added.
        pane: "markerPane",
        // @option shadowPane: String = 'shadowPane'
        // `Map pane` where the markers shadow will be added.
        shadowPane: "shadowPane",
        // @option bubblingMouseEvents: Boolean = false
        // When `true`, a mouse event on this marker will trigger the same event on the map
        // (unless [`L.DomEvent.stopPropagation`](#domevent-stoppropagation) is used).
        bubblingMouseEvents: !1,
        // @option autoPanOnFocus: Boolean = true
        // When `true`, the map will pan whenever the marker is focused (via
        // e.g. pressing `tab` on the keyboard) to ensure the marker is
        // visible within the map's bounds
        autoPanOnFocus: !0,
        // @section Draggable marker options
        // @option draggable: Boolean = false
        // Whether the marker is draggable with mouse/touch or not.
        draggable: !1,
        // @option autoPan: Boolean = false
        // Whether to pan the map when dragging this marker near its edge or not.
        autoPan: !1,
        // @option autoPanPadding: Point = Point(50, 50)
        // Distance (in pixels to the left/right and to the top/bottom) of the
        // map edge to start panning the map.
        autoPanPadding: [50, 50],
        // @option autoPanSpeed: Number = 10
        // Number of pixels the map should pan by.
        autoPanSpeed: 10
      },
      /* @section
       *
       * In addition to [shared layer methods](#Layer) like `addTo()` and `remove()` and [popup methods](#Popup) like bindPopup() you can also use the following methods:
       */
      initialize: function(t, e) {
        k(this, e), this._latlng = q(t);
      },
      onAdd: function(t) {
        this._zoomAnimated = this._zoomAnimated && t.options.markerZoomAnimation, this._zoomAnimated && t.on("zoomanim", this._animateZoom, this), this._initIcon(), this.update();
      },
      onRemove: function(t) {
        this.dragging && this.dragging.enabled() && (this.options.draggable = !0, this.dragging.removeHooks()), delete this.dragging, this._zoomAnimated && t.off("zoomanim", this._animateZoom, this), this._removeIcon(), this._removeShadow();
      },
      getEvents: function() {
        return {
          zoom: this.update,
          viewreset: this.update
        };
      },
      // @method getLatLng: LatLng
      // Returns the current geographical position of the marker.
      getLatLng: function() {
        return this._latlng;
      },
      // @method setLatLng(latlng: LatLng): this
      // Changes the marker position to the given point.
      setLatLng: function(t) {
        var e = this._latlng;
        return this._latlng = q(t), this.update(), this.fire("move", { oldLatLng: e, latlng: this._latlng });
      },
      // @method setZIndexOffset(offset: Number): this
      // Changes the [zIndex offset](#marker-zindexoffset) of the marker.
      setZIndexOffset: function(t) {
        return this.options.zIndexOffset = t, this.update();
      },
      // @method getIcon: Icon
      // Returns the current icon used by the marker
      getIcon: function() {
        return this.options.icon;
      },
      // @method setIcon(icon: Icon): this
      // Changes the marker icon.
      setIcon: function(t) {
        return this.options.icon = t, this._map && (this._initIcon(), this.update()), this._popup && this.bindPopup(this._popup, this._popup.options), this;
      },
      getElement: function() {
        return this._icon;
      },
      update: function() {
        if (this._icon && this._map) {
          var t = this._map.latLngToLayerPoint(this._latlng).round();
          this._setPos(t);
        }
        return this;
      },
      _initIcon: function() {
        var t = this.options, e = "leaflet-zoom-" + (this._zoomAnimated ? "animated" : "hide"), i = t.icon.createIcon(this._icon), n = !1;
        i !== this._icon && (this._icon && this._removeIcon(), n = !0, t.title && (i.title = t.title), i.tagName === "IMG" && (i.alt = t.alt || "")), R(i, e), t.keyboard && (i.tabIndex = "0", i.setAttribute("role", "button")), this._icon = i, t.riseOnHover && this.on({
          mouseover: this._bringToFront,
          mouseout: this._resetZIndex
        }), this.options.autoPanOnFocus && Z(i, "focus", this._panOnFocus, this);
        var a = t.icon.createShadow(this._shadow), l = !1;
        a !== this._shadow && (this._removeShadow(), l = !0), a && (R(a, e), a.alt = ""), this._shadow = a, t.opacity < 1 && this._updateOpacity(), n && this.getPane().appendChild(this._icon), this._initInteraction(), a && l && this.getPane(t.shadowPane).appendChild(this._shadow);
      },
      _removeIcon: function() {
        this.options.riseOnHover && this.off({
          mouseover: this._bringToFront,
          mouseout: this._resetZIndex
        }), this.options.autoPanOnFocus && j(this._icon, "focus", this._panOnFocus, this), K(this._icon), this.removeInteractiveTarget(this._icon), this._icon = null;
      },
      _removeShadow: function() {
        this._shadow && K(this._shadow), this._shadow = null;
      },
      _setPos: function(t) {
        this._icon && tt(this._icon, t), this._shadow && tt(this._shadow, t), this._zIndex = t.y + this.options.zIndexOffset, this._resetZIndex();
      },
      _updateZIndex: function(t) {
        this._icon && (this._icon.style.zIndex = this._zIndex + t);
      },
      _animateZoom: function(t) {
        var e = this._map._latLngToNewLayerPoint(this._latlng, t.zoom, t.center).round();
        this._setPos(e);
      },
      _initInteraction: function() {
        if (this.options.interactive && (R(this._icon, "leaflet-interactive"), this.addInteractiveTarget(this._icon), ho)) {
          var t = this.options.draggable;
          this.dragging && (t = this.dragging.enabled(), this.dragging.disable()), this.dragging = new ho(this), t && this.dragging.enable();
        }
      },
      // @method setOpacity(opacity: Number): this
      // Changes the opacity of the marker.
      setOpacity: function(t) {
        return this.options.opacity = t, this._map && this._updateOpacity(), this;
      },
      _updateOpacity: function() {
        var t = this.options.opacity;
        this._icon && ft(this._icon, t), this._shadow && ft(this._shadow, t);
      },
      _bringToFront: function() {
        this._updateZIndex(this.options.riseOffset);
      },
      _resetZIndex: function() {
        this._updateZIndex(0);
      },
      _panOnFocus: function() {
        var t = this._map;
        if (t) {
          var e = this.options.icon.options, i = e.iconSize ? B(e.iconSize) : B(0, 0), n = e.iconAnchor ? B(e.iconAnchor) : B(0, 0);
          t.panInside(this._latlng, {
            paddingTopLeft: n,
            paddingBottomRight: i.subtract(n)
          });
        }
      },
      _getPopupAnchor: function() {
        return this.options.icon.options.popupAnchor;
      },
      _getTooltipAnchor: function() {
        return this.options.icon.options.tooltipAnchor;
      }
    });
    function Wn(t, e) {
      return new be(t, e);
    }
    var Tt = vt.extend({
      // @section
      // @aka Path options
      options: {
        // @option stroke: Boolean = true
        // Whether to draw stroke along the path. Set it to `false` to disable borders on polygons or circles.
        stroke: !0,
        // @option color: String = '#3388ff'
        // Stroke color
        color: "#3388ff",
        // @option weight: Number = 3
        // Stroke width in pixels
        weight: 3,
        // @option opacity: Number = 1.0
        // Stroke opacity
        opacity: 1,
        // @option lineCap: String= 'round'
        // A string that defines [shape to be used at the end](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linecap) of the stroke.
        lineCap: "round",
        // @option lineJoin: String = 'round'
        // A string that defines [shape to be used at the corners](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linejoin) of the stroke.
        lineJoin: "round",
        // @option dashArray: String = null
        // A string that defines the stroke [dash pattern](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dasharray). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
        dashArray: null,
        // @option dashOffset: String = null
        // A string that defines the [distance into the dash pattern to start the dash](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dashoffset). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
        dashOffset: null,
        // @option fill: Boolean = depends
        // Whether to fill the path with color. Set it to `false` to disable filling on polygons or circles.
        fill: !1,
        // @option fillColor: String = *
        // Fill color. Defaults to the value of the [`color`](#path-color) option
        fillColor: null,
        // @option fillOpacity: Number = 0.2
        // Fill opacity.
        fillOpacity: 0.2,
        // @option fillRule: String = 'evenodd'
        // A string that defines [how the inside of a shape](https://developer.mozilla.org/docs/Web/SVG/Attribute/fill-rule) is determined.
        fillRule: "evenodd",
        // className: '',
        // Option inherited from "Interactive layer" abstract class
        interactive: !0,
        // @option bubblingMouseEvents: Boolean = true
        // When `true`, a mouse event on this path will trigger the same event on the map
        // (unless [`L.DomEvent.stopPropagation`](#domevent-stoppropagation) is used).
        bubblingMouseEvents: !0
      },
      beforeAdd: function(t) {
        this._renderer = t.getRenderer(this);
      },
      onAdd: function() {
        this._renderer._initPath(this), this._reset(), this._renderer._addPath(this);
      },
      onRemove: function() {
        this._renderer._removePath(this);
      },
      // @method redraw(): this
      // Redraws the layer. Sometimes useful after you changed the coordinates that the path uses.
      redraw: function() {
        return this._map && this._renderer._updatePath(this), this;
      },
      // @method setStyle(style: Path options): this
      // Changes the appearance of a Path based on the options in the `Path options` object.
      setStyle: function(t) {
        return k(this, t), this._renderer && (this._renderer._updateStyle(this), this.options.stroke && t && Object.prototype.hasOwnProperty.call(t, "weight") && this._updateBounds()), this;
      },
      // @method bringToFront(): this
      // Brings the layer to the top of all path layers.
      bringToFront: function() {
        return this._renderer && this._renderer._bringToFront(this), this;
      },
      // @method bringToBack(): this
      // Brings the layer to the bottom of all path layers.
      bringToBack: function() {
        return this._renderer && this._renderer._bringToBack(this), this;
      },
      getElement: function() {
        return this._path;
      },
      _reset: function() {
        this._project(), this._update();
      },
      _clickTolerance: function() {
        return (this.options.stroke ? this.options.weight / 2 : 0) + (this._renderer.options.tolerance || 0);
      }
    }), xe = Tt.extend({
      // @section
      // @aka CircleMarker options
      options: {
        fill: !0,
        // @option radius: Number = 10
        // Radius of the circle marker, in pixels
        radius: 10
      },
      initialize: function(t, e) {
        k(this, e), this._latlng = q(t), this._radius = this.options.radius;
      },
      // @method setLatLng(latLng: LatLng): this
      // Sets the position of a circle marker to a new location.
      setLatLng: function(t) {
        var e = this._latlng;
        return this._latlng = q(t), this.redraw(), this.fire("move", { oldLatLng: e, latlng: this._latlng });
      },
      // @method getLatLng(): LatLng
      // Returns the current geographical position of the circle marker
      getLatLng: function() {
        return this._latlng;
      },
      // @method setRadius(radius: Number): this
      // Sets the radius of a circle marker. Units are in pixels.
      setRadius: function(t) {
        return this.options.radius = this._radius = t, this.redraw();
      },
      // @method getRadius(): Number
      // Returns the current radius of the circle
      getRadius: function() {
        return this._radius;
      },
      setStyle: function(t) {
        var e = t && t.radius || this._radius;
        return Tt.prototype.setStyle.call(this, t), this.setRadius(e), this;
      },
      _project: function() {
        this._point = this._map.latLngToLayerPoint(this._latlng), this._updateBounds();
      },
      _updateBounds: function() {
        var t = this._radius, e = this._radiusY || t, i = this._clickTolerance(), n = [t + i, e + i];
        this._pxBounds = new Y(this._point.subtract(n), this._point.add(n));
      },
      _update: function() {
        this._map && this._updatePath();
      },
      _updatePath: function() {
        this._renderer._updateCircle(this);
      },
      _empty: function() {
        return this._radius && !this._renderer._bounds.intersects(this._pxBounds);
      },
      // Needed by the `Canvas` renderer for interactivity
      _containsPoint: function(t) {
        return t.distanceTo(this._point) <= this._radius + this._clickTolerance();
      }
    });
    function $n(t, e) {
      return new xe(t, e);
    }
    var ri = xe.extend({
      initialize: function(t, e, i) {
        if (typeof e == "number" && (e = r({}, i, { radius: e })), k(this, e), this._latlng = q(t), isNaN(this.options.radius))
          throw new Error("Circle radius cannot be NaN");
        this._mRadius = this.options.radius;
      },
      // @method setRadius(radius: Number): this
      // Sets the radius of a circle. Units are in meters.
      setRadius: function(t) {
        return this._mRadius = t, this.redraw();
      },
      // @method getRadius(): Number
      // Returns the current radius of a circle. Units are in meters.
      getRadius: function() {
        return this._mRadius;
      },
      // @method getBounds(): LatLngBounds
      // Returns the `LatLngBounds` of the path.
      getBounds: function() {
        var t = [this._radius, this._radiusY || this._radius];
        return new ct(
          this._map.layerPointToLatLng(this._point.subtract(t)),
          this._map.layerPointToLatLng(this._point.add(t))
        );
      },
      setStyle: Tt.prototype.setStyle,
      _project: function() {
        var t = this._latlng.lng, e = this._latlng.lat, i = this._map, n = i.options.crs;
        if (n.distance === St.distance) {
          var a = Math.PI / 180, l = this._mRadius / St.R / a, u = i.project([e + l, t]), g = i.project([e - l, t]), _ = u.add(g).divideBy(2), x = i.unproject(_).lat, P = Math.acos((Math.cos(l * a) - Math.sin(e * a) * Math.sin(x * a)) / (Math.cos(e * a) * Math.cos(x * a))) / a;
          (isNaN(P) || P === 0) && (P = l / Math.cos(Math.PI / 180 * e)), this._point = _.subtract(i.getPixelOrigin()), this._radius = isNaN(P) ? 0 : _.x - i.project([x, t - P]).x, this._radiusY = _.y - u.y;
        } else {
          var I = n.unproject(n.project(this._latlng).subtract([this._mRadius, 0]));
          this._point = i.latLngToLayerPoint(this._latlng), this._radius = this._point.x - i.latLngToLayerPoint(I).x;
        }
        this._updateBounds();
      }
    });
    function Vn(t, e, i) {
      return new ri(t, e, i);
    }
    var Ct = Tt.extend({
      // @section
      // @aka Polyline options
      options: {
        // @option smoothFactor: Number = 1.0
        // How much to simplify the polyline on each zoom level. More means
        // better performance and smoother look, and less means more accurate representation.
        smoothFactor: 1,
        // @option noClip: Boolean = false
        // Disable polyline clipping.
        noClip: !1
      },
      initialize: function(t, e) {
        k(this, e), this._setLatLngs(t);
      },
      // @method getLatLngs(): LatLng[]
      // Returns an array of the points in the path, or nested arrays of points in case of multi-polyline.
      getLatLngs: function() {
        return this._latlngs;
      },
      // @method setLatLngs(latlngs: LatLng[]): this
      // Replaces all the points in the polyline with the given array of geographical points.
      setLatLngs: function(t) {
        return this._setLatLngs(t), this.redraw();
      },
      // @method isEmpty(): Boolean
      // Returns `true` if the Polyline has no LatLngs.
      isEmpty: function() {
        return !this._latlngs.length;
      },
      // @method closestLayerPoint(p: Point): Point
      // Returns the point closest to `p` on the Polyline.
      closestLayerPoint: function(t) {
        for (var e = 1 / 0, i = null, n = ae, a, l, u = 0, g = this._parts.length; u < g; u++)
          for (var _ = this._parts[u], x = 1, P = _.length; x < P; x++) {
            a = _[x - 1], l = _[x];
            var I = n(t, a, l, !0);
            I < e && (e = I, i = n(t, a, l));
          }
        return i && (i.distance = Math.sqrt(e)), i;
      },
      // @method getCenter(): LatLng
      // Returns the center ([centroid](https://en.wikipedia.org/wiki/Centroid)) of the polyline.
      getCenter: function() {
        if (!this._map)
          throw new Error("Must add layer to map before using getCenter()");
        return lo(this._defaultShape(), this._map.options.crs);
      },
      // @method getBounds(): LatLngBounds
      // Returns the `LatLngBounds` of the path.
      getBounds: function() {
        return this._bounds;
      },
      // @method addLatLng(latlng: LatLng, latlngs?: LatLng[]): this
      // Adds a given point to the polyline. By default, adds to the first ring of
      // the polyline in case of a multi-polyline, but can be overridden by passing
      // a specific ring as a LatLng array (that you can earlier access with [`getLatLngs`](#polyline-getlatlngs)).
      addLatLng: function(t, e) {
        return e = e || this._defaultShape(), t = q(t), e.push(t), this._bounds.extend(t), this.redraw();
      },
      _setLatLngs: function(t) {
        this._bounds = new ct(), this._latlngs = this._convertLatLngs(t);
      },
      _defaultShape: function() {
        return mt(this._latlngs) ? this._latlngs : this._latlngs[0];
      },
      // recursively convert latlngs input into actual LatLng instances; calculate bounds along the way
      _convertLatLngs: function(t) {
        for (var e = [], i = mt(t), n = 0, a = t.length; n < a; n++)
          i ? (e[n] = q(t[n]), this._bounds.extend(e[n])) : e[n] = this._convertLatLngs(t[n]);
        return e;
      },
      _project: function() {
        var t = new Y();
        this._rings = [], this._projectLatlngs(this._latlngs, this._rings, t), this._bounds.isValid() && t.isValid() && (this._rawPxBounds = t, this._updateBounds());
      },
      _updateBounds: function() {
        var t = this._clickTolerance(), e = new N(t, t);
        this._rawPxBounds && (this._pxBounds = new Y([
          this._rawPxBounds.min.subtract(e),
          this._rawPxBounds.max.add(e)
        ]));
      },
      // recursively turns latlngs into a set of rings with projected coordinates
      _projectLatlngs: function(t, e, i) {
        var n = t[0] instanceof G, a = t.length, l, u;
        if (n) {
          for (u = [], l = 0; l < a; l++)
            u[l] = this._map.latLngToLayerPoint(t[l]), i.extend(u[l]);
          e.push(u);
        } else
          for (l = 0; l < a; l++)
            this._projectLatlngs(t[l], e, i);
      },
      // clip polyline by renderer bounds so that we have less to render for performance
      _clipPoints: function() {
        var t = this._renderer._bounds;
        if (this._parts = [], !(!this._pxBounds || !this._pxBounds.intersects(t))) {
          if (this.options.noClip) {
            this._parts = this._rings;
            return;
          }
          var e = this._parts, i, n, a, l, u, g, _;
          for (i = 0, a = 0, l = this._rings.length; i < l; i++)
            for (_ = this._rings[i], n = 0, u = _.length; n < u - 1; n++)
              g = so(_[n], _[n + 1], t, n, !0), g && (e[a] = e[a] || [], e[a].push(g[0]), (g[1] !== _[n + 1] || n === u - 2) && (e[a].push(g[1]), a++));
        }
      },
      // simplify each clipped part of the polyline for performance
      _simplifyPoints: function() {
        for (var t = this._parts, e = this.options.smoothFactor, i = 0, n = t.length; i < n; i++)
          t[i] = oo(t[i], e);
      },
      _update: function() {
        this._map && (this._clipPoints(), this._simplifyPoints(), this._updatePath());
      },
      _updatePath: function() {
        this._renderer._updatePoly(this);
      },
      // Needed by the `Canvas` renderer for interactivity
      _containsPoint: function(t, e) {
        var i, n, a, l, u, g, _ = this._clickTolerance();
        if (!this._pxBounds || !this._pxBounds.contains(t))
          return !1;
        for (i = 0, l = this._parts.length; i < l; i++)
          for (g = this._parts[i], n = 0, u = g.length, a = u - 1; n < u; a = n++)
            if (!(!e && n === 0) && no(t, g[a], g[n]) <= _)
              return !0;
        return !1;
      }
    });
    function Gn(t, e) {
      return new Ct(t, e);
    }
    Ct._flat = ro;
    var Vt = Ct.extend({
      options: {
        fill: !0
      },
      isEmpty: function() {
        return !this._latlngs.length || !this._latlngs[0].length;
      },
      // @method getCenter(): LatLng
      // Returns the center ([centroid](http://en.wikipedia.org/wiki/Centroid)) of the Polygon.
      getCenter: function() {
        if (!this._map)
          throw new Error("Must add layer to map before using getCenter()");
        return io(this._defaultShape(), this._map.options.crs);
      },
      _convertLatLngs: function(t) {
        var e = Ct.prototype._convertLatLngs.call(this, t), i = e.length;
        return i >= 2 && e[0] instanceof G && e[0].equals(e[i - 1]) && e.pop(), e;
      },
      _setLatLngs: function(t) {
        Ct.prototype._setLatLngs.call(this, t), mt(this._latlngs) && (this._latlngs = [this._latlngs]);
      },
      _defaultShape: function() {
        return mt(this._latlngs[0]) ? this._latlngs[0] : this._latlngs[0][0];
      },
      _clipPoints: function() {
        var t = this._renderer._bounds, e = this.options.weight, i = new N(e, e);
        if (t = new Y(t.min.subtract(i), t.max.add(i)), this._parts = [], !(!this._pxBounds || !this._pxBounds.intersects(t))) {
          if (this.options.noClip) {
            this._parts = this._rings;
            return;
          }
          for (var n = 0, a = this._rings.length, l; n < a; n++)
            l = eo(this._rings[n], t, !0), l.length && this._parts.push(l);
        }
      },
      _updatePath: function() {
        this._renderer._updatePoly(this, !0);
      },
      // Needed by the `Canvas` renderer for interactivity
      _containsPoint: function(t) {
        var e = !1, i, n, a, l, u, g, _, x;
        if (!this._pxBounds || !this._pxBounds.contains(t))
          return !1;
        for (l = 0, _ = this._parts.length; l < _; l++)
          for (i = this._parts[l], u = 0, x = i.length, g = x - 1; u < x; g = u++)
            n = i[u], a = i[g], n.y > t.y != a.y > t.y && t.x < (a.x - n.x) * (t.y - n.y) / (a.y - n.y) + n.x && (e = !e);
        return e || Ct.prototype._containsPoint.call(this, t, !0);
      }
    });
    function Un(t, e) {
      return new Vt(t, e);
    }
    var At = Pt.extend({
      /* @section
       * @aka GeoJSON options
       *
       * @option pointToLayer: Function = *
       * A `Function` defining how GeoJSON points spawn Leaflet layers. It is internally
       * called when data is added, passing the GeoJSON point feature and its `LatLng`.
       * The default is to spawn a default `Marker`:
       * ```js
       * function(geoJsonPoint, latlng) {
       * 	return L.marker(latlng);
       * }
       * ```
       *
       * @option style: Function = *
       * A `Function` defining the `Path options` for styling GeoJSON lines and polygons,
       * called internally when data is added.
       * The default value is to not override any defaults:
       * ```js
       * function (geoJsonFeature) {
       * 	return {}
       * }
       * ```
       *
       * @option onEachFeature: Function = *
       * A `Function` that will be called once for each created `Feature`, after it has
       * been created and styled. Useful for attaching events and popups to features.
       * The default is to do nothing with the newly created layers:
       * ```js
       * function (feature, layer) {}
       * ```
       *
       * @option filter: Function = *
       * A `Function` that will be used to decide whether to include a feature or not.
       * The default is to include all features:
       * ```js
       * function (geoJsonFeature) {
       * 	return true;
       * }
       * ```
       * Note: dynamically changing the `filter` option will have effect only on newly
       * added data. It will _not_ re-evaluate already included features.
       *
       * @option coordsToLatLng: Function = *
       * A `Function` that will be used for converting GeoJSON coordinates to `LatLng`s.
       * The default is the `coordsToLatLng` static method.
       *
       * @option markersInheritOptions: Boolean = false
       * Whether default Markers for "Point" type Features inherit from group options.
       */
      initialize: function(t, e) {
        k(this, e), this._layers = {}, t && this.addData(t);
      },
      // @method addData( <GeoJSON> data ): this
      // Adds a GeoJSON object to the layer.
      addData: function(t) {
        var e = V(t) ? t : t.features, i, n, a;
        if (e) {
          for (i = 0, n = e.length; i < n; i++)
            a = e[i], (a.geometries || a.geometry || a.features || a.coordinates) && this.addData(a);
          return this;
        }
        var l = this.options;
        if (l.filter && !l.filter(t))
          return this;
        var u = ye(t, l);
        return u ? (u.feature = Ee(t), u.defaultOptions = u.options, this.resetStyle(u), l.onEachFeature && l.onEachFeature(t, u), this.addLayer(u)) : this;
      },
      // @method resetStyle( <Path> layer? ): this
      // Resets the given vector layer's style to the original GeoJSON style, useful for resetting style after hover events.
      // If `layer` is omitted, the style of all features in the current layer is reset.
      resetStyle: function(t) {
        return t === void 0 ? this.eachLayer(this.resetStyle, this) : (t.options = r({}, t.defaultOptions), this._setLayerStyle(t, this.options.style), this);
      },
      // @method setStyle( <Function> style ): this
      // Changes styles of GeoJSON vector layers with the given style function.
      setStyle: function(t) {
        return this.eachLayer(function(e) {
          this._setLayerStyle(e, t);
        }, this);
      },
      _setLayerStyle: function(t, e) {
        t.setStyle && (typeof e == "function" && (e = e(t.feature)), t.setStyle(e));
      }
    });
    function ye(t, e) {
      var i = t.type === "Feature" ? t.geometry : t, n = i ? i.coordinates : null, a = [], l = e && e.pointToLayer, u = e && e.coordsToLatLng || li, g, _, x, P;
      if (!n && !i)
        return null;
      switch (i.type) {
        case "Point":
          return g = u(n), uo(l, t, g, e);
        case "MultiPoint":
          for (x = 0, P = n.length; x < P; x++)
            g = u(n[x]), a.push(uo(l, t, g, e));
          return new Pt(a);
        case "LineString":
        case "MultiLineString":
          return _ = we(n, i.type === "LineString" ? 0 : 1, u), new Ct(_, e);
        case "Polygon":
        case "MultiPolygon":
          return _ = we(n, i.type === "Polygon" ? 1 : 2, u), new Vt(_, e);
        case "GeometryCollection":
          for (x = 0, P = i.geometries.length; x < P; x++) {
            var I = ye({
              geometry: i.geometries[x],
              type: "Feature",
              properties: t.properties
            }, e);
            I && a.push(I);
          }
          return new Pt(a);
        case "FeatureCollection":
          for (x = 0, P = i.features.length; x < P; x++) {
            var D = ye(i.features[x], e);
            D && a.push(D);
          }
          return new Pt(a);
        default:
          throw new Error("Invalid GeoJSON object.");
      }
    }
    function uo(t, e, i, n) {
      return t ? t(e, i) : new be(i, n && n.markersInheritOptions && n);
    }
    function li(t) {
      return new G(t[1], t[0], t[2]);
    }
    function we(t, e, i) {
      for (var n = [], a = 0, l = t.length, u; a < l; a++)
        u = e ? we(t[a], e - 1, i) : (i || li)(t[a]), n.push(u);
      return n;
    }
    function ci(t, e) {
      return t = q(t), t.alt !== void 0 ? [E(t.lng, e), E(t.lat, e), E(t.alt, e)] : [E(t.lng, e), E(t.lat, e)];
    }
    function ke(t, e, i, n) {
      for (var a = [], l = 0, u = t.length; l < u; l++)
        a.push(e ? ke(t[l], mt(t[l]) ? 0 : e - 1, i, n) : ci(t[l], n));
      return !e && i && a.length > 0 && a.push(a[0].slice()), a;
    }
    function Gt(t, e) {
      return t.feature ? r({}, t.feature, { geometry: e }) : Ee(e);
    }
    function Ee(t) {
      return t.type === "Feature" || t.type === "FeatureCollection" ? t : {
        type: "Feature",
        properties: {},
        geometry: t
      };
    }
    var hi = {
      toGeoJSON: function(t) {
        return Gt(this, {
          type: "Point",
          coordinates: ci(this.getLatLng(), t)
        });
      }
    };
    be.include(hi), ri.include(hi), xe.include(hi), Ct.include({
      toGeoJSON: function(t) {
        var e = !mt(this._latlngs), i = ke(this._latlngs, e ? 1 : 0, !1, t);
        return Gt(this, {
          type: (e ? "Multi" : "") + "LineString",
          coordinates: i
        });
      }
    }), Vt.include({
      toGeoJSON: function(t) {
        var e = !mt(this._latlngs), i = e && !mt(this._latlngs[0]), n = ke(this._latlngs, i ? 2 : e ? 1 : 0, !0, t);
        return e || (n = [n]), Gt(this, {
          type: (i ? "Multi" : "") + "Polygon",
          coordinates: n
        });
      }
    }), Wt.include({
      toMultiPoint: function(t) {
        var e = [];
        return this.eachLayer(function(i) {
          e.push(i.toGeoJSON(t).geometry.coordinates);
        }), Gt(this, {
          type: "MultiPoint",
          coordinates: e
        });
      },
      // @method toGeoJSON(precision?: Number|false): Object
      // Coordinates values are rounded with [`formatNum`](#util-formatnum) function with given `precision`.
      // Returns a [`GeoJSON`](https://en.wikipedia.org/wiki/GeoJSON) representation of the layer group (as a GeoJSON `FeatureCollection`, `GeometryCollection`, or `MultiPoint`).
      toGeoJSON: function(t) {
        var e = this.feature && this.feature.geometry && this.feature.geometry.type;
        if (e === "MultiPoint")
          return this.toMultiPoint(t);
        var i = e === "GeometryCollection", n = [];
        return this.eachLayer(function(a) {
          if (a.toGeoJSON) {
            var l = a.toGeoJSON(t);
            if (i)
              n.push(l.geometry);
            else {
              var u = Ee(l);
              u.type === "FeatureCollection" ? n.push.apply(n, u.features) : n.push(u);
            }
          }
        }), i ? Gt(this, {
          geometries: n,
          type: "GeometryCollection"
        }) : {
          type: "FeatureCollection",
          features: n
        };
      }
    });
    function po(t, e) {
      return new At(t, e);
    }
    var jn = po, Le = vt.extend({
      // @section
      // @aka ImageOverlay options
      options: {
        // @option opacity: Number = 1.0
        // The opacity of the image overlay.
        opacity: 1,
        // @option alt: String = ''
        // Text for the `alt` attribute of the image (useful for accessibility).
        alt: "",
        // @option interactive: Boolean = false
        // If `true`, the image overlay will emit [mouse events](#interactive-layer) when clicked or hovered.
        interactive: !1,
        // @option crossOrigin: Boolean|String = false
        // Whether the crossOrigin attribute will be added to the image.
        // If a String is provided, the image will have its crossOrigin attribute set to the String provided. This is needed if you want to access image pixel data.
        // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
        crossOrigin: !1,
        // @option errorOverlayUrl: String = ''
        // URL to the overlay image to show in place of the overlay that failed to load.
        errorOverlayUrl: "",
        // @option zIndex: Number = 1
        // The explicit [zIndex](https://developer.mozilla.org/docs/Web/CSS/CSS_Positioning/Understanding_z_index) of the overlay layer.
        zIndex: 1,
        // @option className: String = ''
        // A custom class name to assign to the image. Empty by default.
        className: ""
      },
      initialize: function(t, e, i) {
        this._url = t, this._bounds = Q(e), k(this, i);
      },
      onAdd: function() {
        this._image || (this._initImage(), this.options.opacity < 1 && this._updateOpacity()), this.options.interactive && (R(this._image, "leaflet-interactive"), this.addInteractiveTarget(this._image)), this.getPane().appendChild(this._image), this._reset();
      },
      onRemove: function() {
        K(this._image), this.options.interactive && this.removeInteractiveTarget(this._image);
      },
      // @method setOpacity(opacity: Number): this
      // Sets the opacity of the overlay.
      setOpacity: function(t) {
        return this.options.opacity = t, this._image && this._updateOpacity(), this;
      },
      setStyle: function(t) {
        return t.opacity && this.setOpacity(t.opacity), this;
      },
      // @method bringToFront(): this
      // Brings the layer to the top of all overlays.
      bringToFront: function() {
        return this._map && qt(this._image), this;
      },
      // @method bringToBack(): this
      // Brings the layer to the bottom of all overlays.
      bringToBack: function() {
        return this._map && Ft(this._image), this;
      },
      // @method setUrl(url: String): this
      // Changes the URL of the image.
      setUrl: function(t) {
        return this._url = t, this._image && (this._image.src = t), this;
      },
      // @method setBounds(bounds: LatLngBounds): this
      // Update the bounds that this ImageOverlay covers
      setBounds: function(t) {
        return this._bounds = Q(t), this._map && this._reset(), this;
      },
      getEvents: function() {
        var t = {
          zoom: this._reset,
          viewreset: this._reset
        };
        return this._zoomAnimated && (t.zoomanim = this._animateZoom), t;
      },
      // @method setZIndex(value: Number): this
      // Changes the [zIndex](#imageoverlay-zindex) of the image overlay.
      setZIndex: function(t) {
        return this.options.zIndex = t, this._updateZIndex(), this;
      },
      // @method getBounds(): LatLngBounds
      // Get the bounds that this ImageOverlay covers
      getBounds: function() {
        return this._bounds;
      },
      // @method getElement(): HTMLElement
      // Returns the instance of [`HTMLImageElement`](https://developer.mozilla.org/docs/Web/API/HTMLImageElement)
      // used by this overlay.
      getElement: function() {
        return this._image;
      },
      _initImage: function() {
        var t = this._url.tagName === "IMG", e = this._image = t ? this._url : W("img");
        if (R(e, "leaflet-image-layer"), this._zoomAnimated && R(e, "leaflet-zoom-animated"), this.options.className && R(e, this.options.className), e.onselectstart = v, e.onmousemove = v, e.onload = h(this.fire, this, "load"), e.onerror = h(this._overlayOnError, this, "error"), (this.options.crossOrigin || this.options.crossOrigin === "") && (e.crossOrigin = this.options.crossOrigin === !0 ? "" : this.options.crossOrigin), this.options.zIndex && this._updateZIndex(), t) {
          this._url = e.src;
          return;
        }
        e.src = this._url, e.alt = this.options.alt;
      },
      _animateZoom: function(t) {
        var e = this._map.getZoomScale(t.zoom), i = this._map._latLngBoundsToNewLayerBounds(this._bounds, t.zoom, t.center).min;
        It(this._image, i, e);
      },
      _reset: function() {
        var t = this._image, e = new Y(
          this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
          this._map.latLngToLayerPoint(this._bounds.getSouthEast())
        ), i = e.getSize();
        tt(t, e.min), t.style.width = i.x + "px", t.style.height = i.y + "px";
      },
      _updateOpacity: function() {
        ft(this._image, this.options.opacity);
      },
      _updateZIndex: function() {
        this._image && this.options.zIndex !== void 0 && this.options.zIndex !== null && (this._image.style.zIndex = this.options.zIndex);
      },
      _overlayOnError: function() {
        this.fire("error");
        var t = this.options.errorOverlayUrl;
        t && this._url !== t && (this._url = t, this._image.src = t);
      },
      // @method getCenter(): LatLng
      // Returns the center of the ImageOverlay.
      getCenter: function() {
        return this._bounds.getCenter();
      }
    }), Yn = function(t, e, i) {
      return new Le(t, e, i);
    }, fo = Le.extend({
      // @section
      // @aka VideoOverlay options
      options: {
        // @option autoplay: Boolean = true
        // Whether the video starts playing automatically when loaded.
        // On some browsers autoplay will only work with `muted: true`
        autoplay: !0,
        // @option loop: Boolean = true
        // Whether the video will loop back to the beginning when played.
        loop: !0,
        // @option keepAspectRatio: Boolean = true
        // Whether the video will save aspect ratio after the projection.
        // Relevant for supported browsers. See [browser compatibility](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit)
        keepAspectRatio: !0,
        // @option muted: Boolean = false
        // Whether the video starts on mute when loaded.
        muted: !1,
        // @option playsInline: Boolean = true
        // Mobile browsers will play the video right where it is instead of open it up in fullscreen mode.
        playsInline: !0
      },
      _initImage: function() {
        var t = this._url.tagName === "VIDEO", e = this._image = t ? this._url : W("video");
        if (R(e, "leaflet-image-layer"), this._zoomAnimated && R(e, "leaflet-zoom-animated"), this.options.className && R(e, this.options.className), e.onselectstart = v, e.onmousemove = v, e.onloadeddata = h(this.fire, this, "load"), t) {
          for (var i = e.getElementsByTagName("source"), n = [], a = 0; a < i.length; a++)
            n.push(i[a].src);
          this._url = i.length > 0 ? n : [e.src];
          return;
        }
        V(this._url) || (this._url = [this._url]), !this.options.keepAspectRatio && Object.prototype.hasOwnProperty.call(e.style, "objectFit") && (e.style.objectFit = "fill"), e.autoplay = !!this.options.autoplay, e.loop = !!this.options.loop, e.muted = !!this.options.muted, e.playsInline = !!this.options.playsInline;
        for (var l = 0; l < this._url.length; l++) {
          var u = W("source");
          u.src = this._url[l], e.appendChild(u);
        }
      }
      // @method getElement(): HTMLVideoElement
      // Returns the instance of [`HTMLVideoElement`](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement)
      // used by this overlay.
    });
    function Kn(t, e, i) {
      return new fo(t, e, i);
    }
    var mo = Le.extend({
      _initImage: function() {
        var t = this._image = this._url;
        R(t, "leaflet-image-layer"), this._zoomAnimated && R(t, "leaflet-zoom-animated"), this.options.className && R(t, this.options.className), t.onselectstart = v, t.onmousemove = v;
      }
      // @method getElement(): SVGElement
      // Returns the instance of [`SVGElement`](https://developer.mozilla.org/docs/Web/API/SVGElement)
      // used by this overlay.
    });
    function Xn(t, e, i) {
      return new mo(t, e, i);
    }
    var kt = vt.extend({
      // @section
      // @aka DivOverlay options
      options: {
        // @option interactive: Boolean = false
        // If true, the popup/tooltip will listen to the mouse events.
        interactive: !1,
        // @option offset: Point = Point(0, 0)
        // The offset of the overlay position.
        offset: [0, 0],
        // @option className: String = ''
        // A custom CSS class name to assign to the overlay.
        className: "",
        // @option pane: String = undefined
        // `Map pane` where the overlay will be added.
        pane: void 0,
        // @option content: String|HTMLElement|Function = ''
        // Sets the HTML content of the overlay while initializing. If a function is passed the source layer will be
        // passed to the function. The function should return a `String` or `HTMLElement` to be used in the overlay.
        content: ""
      },
      initialize: function(t, e) {
        t && (t instanceof G || V(t)) ? (this._latlng = q(t), k(this, e)) : (k(this, t), this._source = e), this.options.content && (this._content = this.options.content);
      },
      // @method openOn(map: Map): this
      // Adds the overlay to the map.
      // Alternative to `map.openPopup(popup)`/`.openTooltip(tooltip)`.
      openOn: function(t) {
        return t = arguments.length ? t : this._source._map, t.hasLayer(this) || t.addLayer(this), this;
      },
      // @method close(): this
      // Closes the overlay.
      // Alternative to `map.closePopup(popup)`/`.closeTooltip(tooltip)`
      // and `layer.closePopup()`/`.closeTooltip()`.
      close: function() {
        return this._map && this._map.removeLayer(this), this;
      },
      // @method toggle(layer?: Layer): this
      // Opens or closes the overlay bound to layer depending on its current state.
      // Argument may be omitted only for overlay bound to layer.
      // Alternative to `layer.togglePopup()`/`.toggleTooltip()`.
      toggle: function(t) {
        return this._map ? this.close() : (arguments.length ? this._source = t : t = this._source, this._prepareOpen(), this.openOn(t._map)), this;
      },
      onAdd: function(t) {
        this._zoomAnimated = t._zoomAnimated, this._container || this._initLayout(), t._fadeAnimated && ft(this._container, 0), clearTimeout(this._removeTimeout), this.getPane().appendChild(this._container), this.update(), t._fadeAnimated && ft(this._container, 1), this.bringToFront(), this.options.interactive && (R(this._container, "leaflet-interactive"), this.addInteractiveTarget(this._container));
      },
      onRemove: function(t) {
        t._fadeAnimated ? (ft(this._container, 0), this._removeTimeout = setTimeout(h(K, void 0, this._container), 200)) : K(this._container), this.options.interactive && (X(this._container, "leaflet-interactive"), this.removeInteractiveTarget(this._container));
      },
      // @namespace DivOverlay
      // @method getLatLng: LatLng
      // Returns the geographical point of the overlay.
      getLatLng: function() {
        return this._latlng;
      },
      // @method setLatLng(latlng: LatLng): this
      // Sets the geographical point where the overlay will open.
      setLatLng: function(t) {
        return this._latlng = q(t), this._map && (this._updatePosition(), this._adjustPan()), this;
      },
      // @method getContent: String|HTMLElement
      // Returns the content of the overlay.
      getContent: function() {
        return this._content;
      },
      // @method setContent(htmlContent: String|HTMLElement|Function): this
      // Sets the HTML content of the overlay. If a function is passed the source layer will be passed to the function.
      // The function should return a `String` or `HTMLElement` to be used in the overlay.
      setContent: function(t) {
        return this._content = t, this.update(), this;
      },
      // @method getElement: String|HTMLElement
      // Returns the HTML container of the overlay.
      getElement: function() {
        return this._container;
      },
      // @method update: null
      // Updates the overlay content, layout and position. Useful for updating the overlay after something inside changed, e.g. image loaded.
      update: function() {
        this._map && (this._container.style.visibility = "hidden", this._updateContent(), this._updateLayout(), this._updatePosition(), this._container.style.visibility = "", this._adjustPan());
      },
      getEvents: function() {
        var t = {
          zoom: this._updatePosition,
          viewreset: this._updatePosition
        };
        return this._zoomAnimated && (t.zoomanim = this._animateZoom), t;
      },
      // @method isOpen: Boolean
      // Returns `true` when the overlay is visible on the map.
      isOpen: function() {
        return !!this._map && this._map.hasLayer(this);
      },
      // @method bringToFront: this
      // Brings this overlay in front of other overlays (in the same map pane).
      bringToFront: function() {
        return this._map && qt(this._container), this;
      },
      // @method bringToBack: this
      // Brings this overlay to the back of other overlays (in the same map pane).
      bringToBack: function() {
        return this._map && Ft(this._container), this;
      },
      // prepare bound overlay to open: update latlng pos / content source (for FeatureGroup)
      _prepareOpen: function(t) {
        var e = this._source;
        if (!e._map)
          return !1;
        if (e instanceof Pt) {
          e = null;
          var i = this._source._layers;
          for (var n in i)
            if (i[n]._map) {
              e = i[n];
              break;
            }
          if (!e)
            return !1;
          this._source = e;
        }
        if (!t)
          if (e.getCenter)
            t = e.getCenter();
          else if (e.getLatLng)
            t = e.getLatLng();
          else if (e.getBounds)
            t = e.getBounds().getCenter();
          else
            throw new Error("Unable to get source layer LatLng.");
        return this.setLatLng(t), this._map && this.update(), !0;
      },
      _updateContent: function() {
        if (this._content) {
          var t = this._contentNode, e = typeof this._content == "function" ? this._content(this._source || this) : this._content;
          if (typeof e == "string")
            t.innerHTML = e;
          else {
            for (; t.hasChildNodes(); )
              t.removeChild(t.firstChild);
            t.appendChild(e);
          }
          this.fire("contentupdate");
        }
      },
      _updatePosition: function() {
        if (this._map) {
          var t = this._map.latLngToLayerPoint(this._latlng), e = B(this.options.offset), i = this._getAnchor();
          this._zoomAnimated ? tt(this._container, t.add(i)) : e = e.add(t).add(i);
          var n = this._containerBottom = -e.y, a = this._containerLeft = -Math.round(this._containerWidth / 2) + e.x;
          this._container.style.bottom = n + "px", this._container.style.left = a + "px";
        }
      },
      _getAnchor: function() {
        return [0, 0];
      }
    });
    F.include({
      _initOverlay: function(t, e, i, n) {
        var a = e;
        return a instanceof t || (a = new t(n).setContent(e)), i && a.setLatLng(i), a;
      }
    }), vt.include({
      _initOverlay: function(t, e, i, n) {
        var a = i;
        return a instanceof t ? (k(a, n), a._source = this) : (a = e && !n ? e : new t(n, this), a.setContent(i)), a;
      }
    });
    var Pe = kt.extend({
      // @section
      // @aka Popup options
      options: {
        // @option pane: String = 'popupPane'
        // `Map pane` where the popup will be added.
        pane: "popupPane",
        // @option offset: Point = Point(0, 7)
        // The offset of the popup position.
        offset: [0, 7],
        // @option maxWidth: Number = 300
        // Max width of the popup, in pixels.
        maxWidth: 300,
        // @option minWidth: Number = 50
        // Min width of the popup, in pixels.
        minWidth: 50,
        // @option maxHeight: Number = null
        // If set, creates a scrollable container of the given height
        // inside a popup if its content exceeds it.
        // The scrollable container can be styled using the
        // `leaflet-popup-scrolled` CSS class selector.
        maxHeight: null,
        // @option autoPan: Boolean = true
        // Set it to `false` if you don't want the map to do panning animation
        // to fit the opened popup.
        autoPan: !0,
        // @option autoPanPaddingTopLeft: Point = null
        // The margin between the popup and the top left corner of the map
        // view after autopanning was performed.
        autoPanPaddingTopLeft: null,
        // @option autoPanPaddingBottomRight: Point = null
        // The margin between the popup and the bottom right corner of the map
        // view after autopanning was performed.
        autoPanPaddingBottomRight: null,
        // @option autoPanPadding: Point = Point(5, 5)
        // Equivalent of setting both top left and bottom right autopan padding to the same value.
        autoPanPadding: [5, 5],
        // @option keepInView: Boolean = false
        // Set it to `true` if you want to prevent users from panning the popup
        // off of the screen while it is open.
        keepInView: !1,
        // @option closeButton: Boolean = true
        // Controls the presence of a close button in the popup.
        closeButton: !0,
        // @option autoClose: Boolean = true
        // Set it to `false` if you want to override the default behavior of
        // the popup closing when another popup is opened.
        autoClose: !0,
        // @option closeOnEscapeKey: Boolean = true
        // Set it to `false` if you want to override the default behavior of
        // the ESC key for closing of the popup.
        closeOnEscapeKey: !0,
        // @option closeOnClick: Boolean = *
        // Set it if you want to override the default behavior of the popup closing when user clicks
        // on the map. Defaults to the map's [`closePopupOnClick`](#map-closepopuponclick) option.
        // @option className: String = ''
        // A custom CSS class name to assign to the popup.
        className: ""
      },
      // @namespace Popup
      // @method openOn(map: Map): this
      // Alternative to `map.openPopup(popup)`.
      // Adds the popup to the map and closes the previous one.
      openOn: function(t) {
        return t = arguments.length ? t : this._source._map, !t.hasLayer(this) && t._popup && t._popup.options.autoClose && t.removeLayer(t._popup), t._popup = this, kt.prototype.openOn.call(this, t);
      },
      onAdd: function(t) {
        kt.prototype.onAdd.call(this, t), t.fire("popupopen", { popup: this }), this._source && (this._source.fire("popupopen", { popup: this }, !0), this._source instanceof Tt || this._source.on("preclick", Bt));
      },
      onRemove: function(t) {
        kt.prototype.onRemove.call(this, t), t.fire("popupclose", { popup: this }), this._source && (this._source.fire("popupclose", { popup: this }, !0), this._source instanceof Tt || this._source.off("preclick", Bt));
      },
      getEvents: function() {
        var t = kt.prototype.getEvents.call(this);
        return (this.options.closeOnClick !== void 0 ? this.options.closeOnClick : this._map.options.closePopupOnClick) && (t.preclick = this.close), this.options.keepInView && (t.moveend = this._adjustPan), t;
      },
      _initLayout: function() {
        var t = "leaflet-popup", e = this._container = W(
          "div",
          t + " " + (this.options.className || "") + " leaflet-zoom-animated"
        ), i = this._wrapper = W("div", t + "-content-wrapper", e);
        if (this._contentNode = W("div", t + "-content", i), oe(e), Qe(this._contentNode), Z(e, "contextmenu", Bt), this._tipContainer = W("div", t + "-tip-container", e), this._tip = W("div", t + "-tip", this._tipContainer), this.options.closeButton) {
          var n = this._closeButton = W("a", t + "-close-button", e);
          n.setAttribute("role", "button"), n.setAttribute("aria-label", "Close popup"), n.href = "#close", n.innerHTML = '<span aria-hidden="true">&#215;</span>', Z(n, "click", function(a) {
            nt(a), this.close();
          }, this);
        }
      },
      _updateLayout: function() {
        var t = this._contentNode, e = t.style;
        e.width = "", e.whiteSpace = "nowrap";
        var i = t.offsetWidth;
        i = Math.min(i, this.options.maxWidth), i = Math.max(i, this.options.minWidth), e.width = i + 1 + "px", e.whiteSpace = "", e.height = "";
        var n = t.offsetHeight, a = this.options.maxHeight, l = "leaflet-popup-scrolled";
        a && n > a ? (e.height = a + "px", R(t, l)) : X(t, l), this._containerWidth = this._container.offsetWidth;
      },
      _animateZoom: function(t) {
        var e = this._map._latLngToNewLayerPoint(this._latlng, t.zoom, t.center), i = this._getAnchor();
        tt(this._container, e.add(i));
      },
      _adjustPan: function() {
        if (this.options.autoPan) {
          if (this._map._panAnim && this._map._panAnim.stop(), this._autopanning) {
            this._autopanning = !1;
            return;
          }
          var t = this._map, e = parseInt(Qt(this._container, "marginBottom"), 10) || 0, i = this._container.offsetHeight + e, n = this._containerWidth, a = new N(this._containerLeft, -i - this._containerBottom);
          a._add(Ot(this._container));
          var l = t.layerPointToContainerPoint(a), u = B(this.options.autoPanPadding), g = B(this.options.autoPanPaddingTopLeft || u), _ = B(this.options.autoPanPaddingBottomRight || u), x = t.getSize(), P = 0, I = 0;
          l.x + n + _.x > x.x && (P = l.x + n - x.x + _.x), l.x - P - g.x < 0 && (P = l.x - g.x), l.y + i + _.y > x.y && (I = l.y + i - x.y + _.y), l.y - I - g.y < 0 && (I = l.y - g.y), (P || I) && (this.options.keepInView && (this._autopanning = !0), t.fire("autopanstart").panBy([P, I]));
        }
      },
      _getAnchor: function() {
        return B(this._source && this._source._getPopupAnchor ? this._source._getPopupAnchor() : [0, 0]);
      }
    }), Jn = function(t, e) {
      return new Pe(t, e);
    };
    F.mergeOptions({
      closePopupOnClick: !0
    }), F.include({
      // @method openPopup(popup: Popup): this
      // Opens the specified popup while closing the previously opened (to make sure only one is opened at one time for usability).
      // @alternative
      // @method openPopup(content: String|HTMLElement, latlng: LatLng, options?: Popup options): this
      // Creates a popup with the specified content and options and opens it in the given point on a map.
      openPopup: function(t, e, i) {
        return this._initOverlay(Pe, t, e, i).openOn(this), this;
      },
      // @method closePopup(popup?: Popup): this
      // Closes the popup previously opened with [openPopup](#map-openpopup) (or the given one).
      closePopup: function(t) {
        return t = arguments.length ? t : this._popup, t && t.close(), this;
      }
    }), vt.include({
      // @method bindPopup(content: String|HTMLElement|Function|Popup, options?: Popup options): this
      // Binds a popup to the layer with the passed `content` and sets up the
      // necessary event listeners. If a `Function` is passed it will receive
      // the layer as the first argument and should return a `String` or `HTMLElement`.
      bindPopup: function(t, e) {
        return this._popup = this._initOverlay(Pe, this._popup, t, e), this._popupHandlersAdded || (this.on({
          click: this._openPopup,
          keypress: this._onKeyPress,
          remove: this.closePopup,
          move: this._movePopup
        }), this._popupHandlersAdded = !0), this;
      },
      // @method unbindPopup(): this
      // Removes the popup previously bound with `bindPopup`.
      unbindPopup: function() {
        return this._popup && (this.off({
          click: this._openPopup,
          keypress: this._onKeyPress,
          remove: this.closePopup,
          move: this._movePopup
        }), this._popupHandlersAdded = !1, this._popup = null), this;
      },
      // @method openPopup(latlng?: LatLng): this
      // Opens the bound popup at the specified `latlng` or at the default popup anchor if no `latlng` is passed.
      openPopup: function(t) {
        return this._popup && (this instanceof Pt || (this._popup._source = this), this._popup._prepareOpen(t || this._latlng) && this._popup.openOn(this._map)), this;
      },
      // @method closePopup(): this
      // Closes the popup bound to this layer if it is open.
      closePopup: function() {
        return this._popup && this._popup.close(), this;
      },
      // @method togglePopup(): this
      // Opens or closes the popup bound to this layer depending on its current state.
      togglePopup: function() {
        return this._popup && this._popup.toggle(this), this;
      },
      // @method isPopupOpen(): boolean
      // Returns `true` if the popup bound to this layer is currently open.
      isPopupOpen: function() {
        return this._popup ? this._popup.isOpen() : !1;
      },
      // @method setPopupContent(content: String|HTMLElement|Popup): this
      // Sets the content of the popup bound to this layer.
      setPopupContent: function(t) {
        return this._popup && this._popup.setContent(t), this;
      },
      // @method getPopup(): Popup
      // Returns the popup bound to this layer.
      getPopup: function() {
        return this._popup;
      },
      _openPopup: function(t) {
        if (!(!this._popup || !this._map)) {
          Nt(t);
          var e = t.layer || t.target;
          if (this._popup._source === e && !(e instanceof Tt)) {
            this._map.hasLayer(this._popup) ? this.closePopup() : this.openPopup(t.latlng);
            return;
          }
          this._popup._source = e, this.openPopup(t.latlng);
        }
      },
      _movePopup: function(t) {
        this._popup.setLatLng(t.latlng);
      },
      _onKeyPress: function(t) {
        t.originalEvent.keyCode === 13 && this._openPopup(t);
      }
    });
    var Ce = kt.extend({
      // @section
      // @aka Tooltip options
      options: {
        // @option pane: String = 'tooltipPane'
        // `Map pane` where the tooltip will be added.
        pane: "tooltipPane",
        // @option offset: Point = Point(0, 0)
        // Optional offset of the tooltip position.
        offset: [0, 0],
        // @option direction: String = 'auto'
        // Direction where to open the tooltip. Possible values are: `right`, `left`,
        // `top`, `bottom`, `center`, `auto`.
        // `auto` will dynamically switch between `right` and `left` according to the tooltip
        // position on the map.
        direction: "auto",
        // @option permanent: Boolean = false
        // Whether to open the tooltip permanently or only on mouseover.
        permanent: !1,
        // @option sticky: Boolean = false
        // If true, the tooltip will follow the mouse instead of being fixed at the feature center.
        sticky: !1,
        // @option opacity: Number = 0.9
        // Tooltip container opacity.
        opacity: 0.9
      },
      onAdd: function(t) {
        kt.prototype.onAdd.call(this, t), this.setOpacity(this.options.opacity), t.fire("tooltipopen", { tooltip: this }), this._source && (this.addEventParent(this._source), this._source.fire("tooltipopen", { tooltip: this }, !0));
      },
      onRemove: function(t) {
        kt.prototype.onRemove.call(this, t), t.fire("tooltipclose", { tooltip: this }), this._source && (this.removeEventParent(this._source), this._source.fire("tooltipclose", { tooltip: this }, !0));
      },
      getEvents: function() {
        var t = kt.prototype.getEvents.call(this);
        return this.options.permanent || (t.preclick = this.close), t;
      },
      _initLayout: function() {
        var t = "leaflet-tooltip", e = t + " " + (this.options.className || "") + " leaflet-zoom-" + (this._zoomAnimated ? "animated" : "hide");
        this._contentNode = this._container = W("div", e), this._container.setAttribute("role", "tooltip"), this._container.setAttribute("id", "leaflet-tooltip-" + f(this));
      },
      _updateLayout: function() {
      },
      _adjustPan: function() {
      },
      _setPosition: function(t) {
        var e, i, n = this._map, a = this._container, l = n.latLngToContainerPoint(n.getCenter()), u = n.layerPointToContainerPoint(t), g = this.options.direction, _ = a.offsetWidth, x = a.offsetHeight, P = B(this.options.offset), I = this._getAnchor();
        g === "top" ? (e = _ / 2, i = x) : g === "bottom" ? (e = _ / 2, i = 0) : g === "center" ? (e = _ / 2, i = x / 2) : g === "right" ? (e = 0, i = x / 2) : g === "left" ? (e = _, i = x / 2) : u.x < l.x ? (g = "right", e = 0, i = x / 2) : (g = "left", e = _ + (P.x + I.x) * 2, i = x / 2), t = t.subtract(B(e, i, !0)).add(P).add(I), X(a, "leaflet-tooltip-right"), X(a, "leaflet-tooltip-left"), X(a, "leaflet-tooltip-top"), X(a, "leaflet-tooltip-bottom"), R(a, "leaflet-tooltip-" + g), tt(a, t);
      },
      _updatePosition: function() {
        var t = this._map.latLngToLayerPoint(this._latlng);
        this._setPosition(t);
      },
      setOpacity: function(t) {
        this.options.opacity = t, this._container && ft(this._container, t);
      },
      _animateZoom: function(t) {
        var e = this._map._latLngToNewLayerPoint(this._latlng, t.zoom, t.center);
        this._setPosition(e);
      },
      _getAnchor: function() {
        return B(this._source && this._source._getTooltipAnchor && !this.options.sticky ? this._source._getTooltipAnchor() : [0, 0]);
      }
    }), Qn = function(t, e) {
      return new Ce(t, e);
    };
    F.include({
      // @method openTooltip(tooltip: Tooltip): this
      // Opens the specified tooltip.
      // @alternative
      // @method openTooltip(content: String|HTMLElement, latlng: LatLng, options?: Tooltip options): this
      // Creates a tooltip with the specified content and options and open it.
      openTooltip: function(t, e, i) {
        return this._initOverlay(Ce, t, e, i).openOn(this), this;
      },
      // @method closeTooltip(tooltip: Tooltip): this
      // Closes the tooltip given as parameter.
      closeTooltip: function(t) {
        return t.close(), this;
      }
    }), vt.include({
      // @method bindTooltip(content: String|HTMLElement|Function|Tooltip, options?: Tooltip options): this
      // Binds a tooltip to the layer with the passed `content` and sets up the
      // necessary event listeners. If a `Function` is passed it will receive
      // the layer as the first argument and should return a `String` or `HTMLElement`.
      bindTooltip: function(t, e) {
        return this._tooltip && this.isTooltipOpen() && this.unbindTooltip(), this._tooltip = this._initOverlay(Ce, this._tooltip, t, e), this._initTooltipInteractions(), this._tooltip.options.permanent && this._map && this._map.hasLayer(this) && this.openTooltip(), this;
      },
      // @method unbindTooltip(): this
      // Removes the tooltip previously bound with `bindTooltip`.
      unbindTooltip: function() {
        return this._tooltip && (this._initTooltipInteractions(!0), this.closeTooltip(), this._tooltip = null), this;
      },
      _initTooltipInteractions: function(t) {
        if (!(!t && this._tooltipHandlersAdded)) {
          var e = t ? "off" : "on", i = {
            remove: this.closeTooltip,
            move: this._moveTooltip
          };
          this._tooltip.options.permanent ? i.add = this._openTooltip : (i.mouseover = this._openTooltip, i.mouseout = this.closeTooltip, i.click = this._openTooltip, this._map ? this._addFocusListeners() : i.add = this._addFocusListeners), this._tooltip.options.sticky && (i.mousemove = this._moveTooltip), this[e](i), this._tooltipHandlersAdded = !t;
        }
      },
      // @method openTooltip(latlng?: LatLng): this
      // Opens the bound tooltip at the specified `latlng` or at the default tooltip anchor if no `latlng` is passed.
      openTooltip: function(t) {
        return this._tooltip && (this instanceof Pt || (this._tooltip._source = this), this._tooltip._prepareOpen(t) && (this._tooltip.openOn(this._map), this.getElement ? this._setAriaDescribedByOnLayer(this) : this.eachLayer && this.eachLayer(this._setAriaDescribedByOnLayer, this))), this;
      },
      // @method closeTooltip(): this
      // Closes the tooltip bound to this layer if it is open.
      closeTooltip: function() {
        if (this._tooltip)
          return this._tooltip.close();
      },
      // @method toggleTooltip(): this
      // Opens or closes the tooltip bound to this layer depending on its current state.
      toggleTooltip: function() {
        return this._tooltip && this._tooltip.toggle(this), this;
      },
      // @method isTooltipOpen(): boolean
      // Returns `true` if the tooltip bound to this layer is currently open.
      isTooltipOpen: function() {
        return this._tooltip.isOpen();
      },
      // @method setTooltipContent(content: String|HTMLElement|Tooltip): this
      // Sets the content of the tooltip bound to this layer.
      setTooltipContent: function(t) {
        return this._tooltip && this._tooltip.setContent(t), this;
      },
      // @method getTooltip(): Tooltip
      // Returns the tooltip bound to this layer.
      getTooltip: function() {
        return this._tooltip;
      },
      _addFocusListeners: function() {
        this.getElement ? this._addFocusListenersOnLayer(this) : this.eachLayer && this.eachLayer(this._addFocusListenersOnLayer, this);
      },
      _addFocusListenersOnLayer: function(t) {
        var e = typeof t.getElement == "function" && t.getElement();
        e && (Z(e, "focus", function() {
          this._tooltip._source = t, this.openTooltip();
        }, this), Z(e, "blur", this.closeTooltip, this));
      },
      _setAriaDescribedByOnLayer: function(t) {
        var e = typeof t.getElement == "function" && t.getElement();
        e && e.setAttribute("aria-describedby", this._tooltip._container.id);
      },
      _openTooltip: function(t) {
        if (!(!this._tooltip || !this._map)) {
          if (this._map.dragging && this._map.dragging.moving() && !this._openOnceFlag) {
            this._openOnceFlag = !0;
            var e = this;
            this._map.once("moveend", function() {
              e._openOnceFlag = !1, e._openTooltip(t);
            });
            return;
          }
          this._tooltip._source = t.layer || t.target, this.openTooltip(this._tooltip.options.sticky ? t.latlng : void 0);
        }
      },
      _moveTooltip: function(t) {
        var e = t.latlng, i, n;
        this._tooltip.options.sticky && t.originalEvent && (i = this._map.mouseEventToContainerPoint(t.originalEvent), n = this._map.containerPointToLayerPoint(i), e = this._map.layerPointToLatLng(n)), this._tooltip.setLatLng(e);
      }
    });
    var go = $t.extend({
      options: {
        // @section
        // @aka DivIcon options
        iconSize: [12, 12],
        // also can be set through CSS
        // iconAnchor: (Point),
        // popupAnchor: (Point),
        // @option html: String|HTMLElement = ''
        // Custom HTML code to put inside the div element, empty by default. Alternatively,
        // an instance of `HTMLElement`.
        html: !1,
        // @option bgPos: Point = [0, 0]
        // Optional relative position of the background, in pixels
        bgPos: null,
        className: "leaflet-div-icon"
      },
      createIcon: function(t) {
        var e = t && t.tagName === "DIV" ? t : document.createElement("div"), i = this.options;
        if (i.html instanceof Element ? (pe(e), e.appendChild(i.html)) : e.innerHTML = i.html !== !1 ? i.html : "", i.bgPos) {
          var n = B(i.bgPos);
          e.style.backgroundPosition = -n.x + "px " + -n.y + "px";
        }
        return this._setIconStyles(e, "icon"), e;
      },
      createShadow: function() {
        return null;
      }
    });
    function ta(t) {
      return new go(t);
    }
    $t.Default = se;
    var re = vt.extend({
      // @section
      // @aka GridLayer options
      options: {
        // @option tileSize: Number|Point = 256
        // Width and height of tiles in the grid. Use a number if width and height are equal, or `L.point(width, height)` otherwise.
        tileSize: 256,
        // @option opacity: Number = 1.0
        // Opacity of the tiles. Can be used in the `createTile()` function.
        opacity: 1,
        // @option updateWhenIdle: Boolean = (depends)
        // Load new tiles only when panning ends.
        // `true` by default on mobile browsers, in order to avoid too many requests and keep smooth navigation.
        // `false` otherwise in order to display new tiles _during_ panning, since it is easy to pan outside the
        // [`keepBuffer`](#gridlayer-keepbuffer) option in desktop browsers.
        updateWhenIdle: S.mobile,
        // @option updateWhenZooming: Boolean = true
        // By default, a smooth zoom animation (during a [touch zoom](#map-touchzoom) or a [`flyTo()`](#map-flyto)) will update grid layers every integer zoom level. Setting this option to `false` will update the grid layer only when the smooth animation ends.
        updateWhenZooming: !0,
        // @option updateInterval: Number = 200
        // Tiles will not update more than once every `updateInterval` milliseconds when panning.
        updateInterval: 200,
        // @option zIndex: Number = 1
        // The explicit zIndex of the tile layer.
        zIndex: 1,
        // @option bounds: LatLngBounds = undefined
        // If set, tiles will only be loaded inside the set `LatLngBounds`.
        bounds: null,
        // @option minZoom: Number = 0
        // The minimum zoom level down to which this layer will be displayed (inclusive).
        minZoom: 0,
        // @option maxZoom: Number = undefined
        // The maximum zoom level up to which this layer will be displayed (inclusive).
        maxZoom: void 0,
        // @option maxNativeZoom: Number = undefined
        // Maximum zoom number the tile source has available. If it is specified,
        // the tiles on all zoom levels higher than `maxNativeZoom` will be loaded
        // from `maxNativeZoom` level and auto-scaled.
        maxNativeZoom: void 0,
        // @option minNativeZoom: Number = undefined
        // Minimum zoom number the tile source has available. If it is specified,
        // the tiles on all zoom levels lower than `minNativeZoom` will be loaded
        // from `minNativeZoom` level and auto-scaled.
        minNativeZoom: void 0,
        // @option noWrap: Boolean = false
        // Whether the layer is wrapped around the antimeridian. If `true`, the
        // GridLayer will only be displayed once at low zoom levels. Has no
        // effect when the [map CRS](#map-crs) doesn't wrap around. Can be used
        // in combination with [`bounds`](#gridlayer-bounds) to prevent requesting
        // tiles outside the CRS limits.
        noWrap: !1,
        // @option pane: String = 'tilePane'
        // `Map pane` where the grid layer will be added.
        pane: "tilePane",
        // @option className: String = ''
        // A custom class name to assign to the tile layer. Empty by default.
        className: "",
        // @option keepBuffer: Number = 2
        // When panning the map, keep this many rows and columns of tiles before unloading them.
        keepBuffer: 2
      },
      initialize: function(t) {
        k(this, t);
      },
      onAdd: function() {
        this._initContainer(), this._levels = {}, this._tiles = {}, this._resetView();
      },
      beforeAdd: function(t) {
        t._addZoomLimit(this);
      },
      onRemove: function(t) {
        this._removeAllTiles(), K(this._container), t._removeZoomLimit(this), this._container = null, this._tileZoom = void 0;
      },
      // @method bringToFront: this
      // Brings the tile layer to the top of all tile layers.
      bringToFront: function() {
        return this._map && (qt(this._container), this._setAutoZIndex(Math.max)), this;
      },
      // @method bringToBack: this
      // Brings the tile layer to the bottom of all tile layers.
      bringToBack: function() {
        return this._map && (Ft(this._container), this._setAutoZIndex(Math.min)), this;
      },
      // @method getContainer: HTMLElement
      // Returns the HTML element that contains the tiles for this layer.
      getContainer: function() {
        return this._container;
      },
      // @method setOpacity(opacity: Number): this
      // Changes the [opacity](#gridlayer-opacity) of the grid layer.
      setOpacity: function(t) {
        return this.options.opacity = t, this._updateOpacity(), this;
      },
      // @method setZIndex(zIndex: Number): this
      // Changes the [zIndex](#gridlayer-zindex) of the grid layer.
      setZIndex: function(t) {
        return this.options.zIndex = t, this._updateZIndex(), this;
      },
      // @method isLoading: Boolean
      // Returns `true` if any tile in the grid layer has not finished loading.
      isLoading: function() {
        return this._loading;
      },
      // @method redraw: this
      // Causes the layer to clear all the tiles and request them again.
      redraw: function() {
        if (this._map) {
          this._removeAllTiles();
          var t = this._clampZoom(this._map.getZoom());
          t !== this._tileZoom && (this._tileZoom = t, this._updateLevels()), this._update();
        }
        return this;
      },
      getEvents: function() {
        var t = {
          viewprereset: this._invalidateAll,
          viewreset: this._resetView,
          zoom: this._resetView,
          moveend: this._onMoveEnd
        };
        return this.options.updateWhenIdle || (this._onMove || (this._onMove = b(this._onMoveEnd, this.options.updateInterval, this)), t.move = this._onMove), this._zoomAnimated && (t.zoomanim = this._animateZoom), t;
      },
      // @section Extension methods
      // Layers extending `GridLayer` shall reimplement the following method.
      // @method createTile(coords: Object, done?: Function): HTMLElement
      // Called only internally, must be overridden by classes extending `GridLayer`.
      // Returns the `HTMLElement` corresponding to the given `coords`. If the `done` callback
      // is specified, it must be called when the tile has finished loading and drawing.
      createTile: function() {
        return document.createElement("div");
      },
      // @section
      // @method getTileSize: Point
      // Normalizes the [tileSize option](#gridlayer-tilesize) into a point. Used by the `createTile()` method.
      getTileSize: function() {
        var t = this.options.tileSize;
        return t instanceof N ? t : new N(t, t);
      },
      _updateZIndex: function() {
        this._container && this.options.zIndex !== void 0 && this.options.zIndex !== null && (this._container.style.zIndex = this.options.zIndex);
      },
      _setAutoZIndex: function(t) {
        for (var e = this.getPane().children, i = -t(-1 / 0, 1 / 0), n = 0, a = e.length, l; n < a; n++)
          l = e[n].style.zIndex, e[n] !== this._container && l && (i = t(i, +l));
        isFinite(i) && (this.options.zIndex = i + t(-1, 1), this._updateZIndex());
      },
      _updateOpacity: function() {
        if (this._map && !S.ielt9) {
          ft(this._container, this.options.opacity);
          var t = +/* @__PURE__ */ new Date(), e = !1, i = !1;
          for (var n in this._tiles) {
            var a = this._tiles[n];
            if (!(!a.current || !a.loaded)) {
              var l = Math.min(1, (t - a.loaded) / 200);
              ft(a.el, l), l < 1 ? e = !0 : (a.active ? i = !0 : this._onOpaqueTile(a), a.active = !0);
            }
          }
          i && !this._noPrune && this._pruneTiles(), e && (pt(this._fadeFrame), this._fadeFrame = rt(this._updateOpacity, this));
        }
      },
      _onOpaqueTile: v,
      _initContainer: function() {
        this._container || (this._container = W("div", "leaflet-layer " + (this.options.className || "")), this._updateZIndex(), this.options.opacity < 1 && this._updateOpacity(), this.getPane().appendChild(this._container));
      },
      _updateLevels: function() {
        var t = this._tileZoom, e = this.options.maxZoom;
        if (t !== void 0) {
          for (var i in this._levels)
            i = Number(i), this._levels[i].el.children.length || i === t ? (this._levels[i].el.style.zIndex = e - Math.abs(t - i), this._onUpdateLevel(i)) : (K(this._levels[i].el), this._removeTilesAtZoom(i), this._onRemoveLevel(i), delete this._levels[i]);
          var n = this._levels[t], a = this._map;
          return n || (n = this._levels[t] = {}, n.el = W("div", "leaflet-tile-container leaflet-zoom-animated", this._container), n.el.style.zIndex = e, n.origin = a.project(a.unproject(a.getPixelOrigin()), t).round(), n.zoom = t, this._setZoomTransform(n, a.getCenter(), a.getZoom()), v(n.el.offsetWidth), this._onCreateLevel(n)), this._level = n, n;
        }
      },
      _onUpdateLevel: v,
      _onRemoveLevel: v,
      _onCreateLevel: v,
      _pruneTiles: function() {
        if (this._map) {
          var t, e, i = this._map.getZoom();
          if (i > this.options.maxZoom || i < this.options.minZoom) {
            this._removeAllTiles();
            return;
          }
          for (t in this._tiles)
            e = this._tiles[t], e.retain = e.current;
          for (t in this._tiles)
            if (e = this._tiles[t], e.current && !e.active) {
              var n = e.coords;
              this._retainParent(n.x, n.y, n.z, n.z - 5) || this._retainChildren(n.x, n.y, n.z, n.z + 2);
            }
          for (t in this._tiles)
            this._tiles[t].retain || this._removeTile(t);
        }
      },
      _removeTilesAtZoom: function(t) {
        for (var e in this._tiles)
          this._tiles[e].coords.z === t && this._removeTile(e);
      },
      _removeAllTiles: function() {
        for (var t in this._tiles)
          this._removeTile(t);
      },
      _invalidateAll: function() {
        for (var t in this._levels)
          K(this._levels[t].el), this._onRemoveLevel(Number(t)), delete this._levels[t];
        this._removeAllTiles(), this._tileZoom = void 0;
      },
      _retainParent: function(t, e, i, n) {
        var a = Math.floor(t / 2), l = Math.floor(e / 2), u = i - 1, g = new N(+a, +l);
        g.z = +u;
        var _ = this._tileCoordsToKey(g), x = this._tiles[_];
        return x && x.active ? (x.retain = !0, !0) : (x && x.loaded && (x.retain = !0), u > n ? this._retainParent(a, l, u, n) : !1);
      },
      _retainChildren: function(t, e, i, n) {
        for (var a = 2 * t; a < 2 * t + 2; a++)
          for (var l = 2 * e; l < 2 * e + 2; l++) {
            var u = new N(a, l);
            u.z = i + 1;
            var g = this._tileCoordsToKey(u), _ = this._tiles[g];
            if (_ && _.active) {
              _.retain = !0;
              continue;
            } else _ && _.loaded && (_.retain = !0);
            i + 1 < n && this._retainChildren(a, l, i + 1, n);
          }
      },
      _resetView: function(t) {
        var e = t && (t.pinch || t.flyTo);
        this._setView(this._map.getCenter(), this._map.getZoom(), e, e);
      },
      _animateZoom: function(t) {
        this._setView(t.center, t.zoom, !0, t.noUpdate);
      },
      _clampZoom: function(t) {
        var e = this.options;
        return e.minNativeZoom !== void 0 && t < e.minNativeZoom ? e.minNativeZoom : e.maxNativeZoom !== void 0 && e.maxNativeZoom < t ? e.maxNativeZoom : t;
      },
      _setView: function(t, e, i, n) {
        var a = Math.round(e);
        this.options.maxZoom !== void 0 && a > this.options.maxZoom || this.options.minZoom !== void 0 && a < this.options.minZoom ? a = void 0 : a = this._clampZoom(a);
        var l = this.options.updateWhenZooming && a !== this._tileZoom;
        (!n || l) && (this._tileZoom = a, this._abortLoading && this._abortLoading(), this._updateLevels(), this._resetGrid(), a !== void 0 && this._update(t), i || this._pruneTiles(), this._noPrune = !!i), this._setZoomTransforms(t, e);
      },
      _setZoomTransforms: function(t, e) {
        for (var i in this._levels)
          this._setZoomTransform(this._levels[i], t, e);
      },
      _setZoomTransform: function(t, e, i) {
        var n = this._map.getZoomScale(i, t.zoom), a = t.origin.multiplyBy(n).subtract(this._map._getNewPixelOrigin(e, i)).round();
        S.any3d ? It(t.el, a, n) : tt(t.el, a);
      },
      _resetGrid: function() {
        var t = this._map, e = t.options.crs, i = this._tileSize = this.getTileSize(), n = this._tileZoom, a = this._map.getPixelWorldBounds(this._tileZoom);
        a && (this._globalTileRange = this._pxBoundsToTileRange(a)), this._wrapX = e.wrapLng && !this.options.noWrap && [
          Math.floor(t.project([0, e.wrapLng[0]], n).x / i.x),
          Math.ceil(t.project([0, e.wrapLng[1]], n).x / i.y)
        ], this._wrapY = e.wrapLat && !this.options.noWrap && [
          Math.floor(t.project([e.wrapLat[0], 0], n).y / i.x),
          Math.ceil(t.project([e.wrapLat[1], 0], n).y / i.y)
        ];
      },
      _onMoveEnd: function() {
        !this._map || this._map._animatingZoom || this._update();
      },
      _getTiledPixelBounds: function(t) {
        var e = this._map, i = e._animatingZoom ? Math.max(e._animateToZoom, e.getZoom()) : e.getZoom(), n = e.getZoomScale(i, this._tileZoom), a = e.project(t, this._tileZoom).floor(), l = e.getSize().divideBy(n * 2);
        return new Y(a.subtract(l), a.add(l));
      },
      // Private method to load tiles in the grid's active zoom level according to map bounds
      _update: function(t) {
        var e = this._map;
        if (e) {
          var i = this._clampZoom(e.getZoom());
          if (t === void 0 && (t = e.getCenter()), this._tileZoom !== void 0) {
            var n = this._getTiledPixelBounds(t), a = this._pxBoundsToTileRange(n), l = a.getCenter(), u = [], g = this.options.keepBuffer, _ = new Y(
              a.getBottomLeft().subtract([g, -g]),
              a.getTopRight().add([g, -g])
            );
            if (!(isFinite(a.min.x) && isFinite(a.min.y) && isFinite(a.max.x) && isFinite(a.max.y)))
              throw new Error("Attempted to load an infinite number of tiles");
            for (var x in this._tiles) {
              var P = this._tiles[x].coords;
              (P.z !== this._tileZoom || !_.contains(new N(P.x, P.y))) && (this._tiles[x].current = !1);
            }
            if (Math.abs(i - this._tileZoom) > 1) {
              this._setView(t, i);
              return;
            }
            for (var I = a.min.y; I <= a.max.y; I++)
              for (var D = a.min.x; D <= a.max.x; D++) {
                var at = new N(D, I);
                if (at.z = this._tileZoom, !!this._isValidTile(at)) {
                  var ot = this._tiles[this._tileCoordsToKey(at)];
                  ot ? ot.current = !0 : u.push(at);
                }
              }
            if (u.sort(function(ht, jt) {
              return ht.distanceTo(l) - jt.distanceTo(l);
            }), u.length !== 0) {
              this._loading || (this._loading = !0, this.fire("loading"));
              var gt = document.createDocumentFragment();
              for (D = 0; D < u.length; D++)
                this._addTile(u[D], gt);
              this._level.el.appendChild(gt);
            }
          }
        }
      },
      _isValidTile: function(t) {
        var e = this._map.options.crs;
        if (!e.infinite) {
          var i = this._globalTileRange;
          if (!e.wrapLng && (t.x < i.min.x || t.x > i.max.x) || !e.wrapLat && (t.y < i.min.y || t.y > i.max.y))
            return !1;
        }
        if (!this.options.bounds)
          return !0;
        var n = this._tileCoordsToBounds(t);
        return Q(this.options.bounds).overlaps(n);
      },
      _keyToBounds: function(t) {
        return this._tileCoordsToBounds(this._keyToTileCoords(t));
      },
      _tileCoordsToNwSe: function(t) {
        var e = this._map, i = this.getTileSize(), n = t.scaleBy(i), a = n.add(i), l = e.unproject(n, t.z), u = e.unproject(a, t.z);
        return [l, u];
      },
      // converts tile coordinates to its geographical bounds
      _tileCoordsToBounds: function(t) {
        var e = this._tileCoordsToNwSe(t), i = new ct(e[0], e[1]);
        return this.options.noWrap || (i = this._map.wrapLatLngBounds(i)), i;
      },
      // converts tile coordinates to key for the tile cache
      _tileCoordsToKey: function(t) {
        return t.x + ":" + t.y + ":" + t.z;
      },
      // converts tile cache key to coordinates
      _keyToTileCoords: function(t) {
        var e = t.split(":"), i = new N(+e[0], +e[1]);
        return i.z = +e[2], i;
      },
      _removeTile: function(t) {
        var e = this._tiles[t];
        e && (K(e.el), delete this._tiles[t], this.fire("tileunload", {
          tile: e.el,
          coords: this._keyToTileCoords(t)
        }));
      },
      _initTile: function(t) {
        R(t, "leaflet-tile");
        var e = this.getTileSize();
        t.style.width = e.x + "px", t.style.height = e.y + "px", t.onselectstart = v, t.onmousemove = v, S.ielt9 && this.options.opacity < 1 && ft(t, this.options.opacity);
      },
      _addTile: function(t, e) {
        var i = this._getTilePos(t), n = this._tileCoordsToKey(t), a = this.createTile(this._wrapCoords(t), h(this._tileReady, this, t));
        this._initTile(a), this.createTile.length < 2 && rt(h(this._tileReady, this, t, null, a)), tt(a, i), this._tiles[n] = {
          el: a,
          coords: t,
          current: !0
        }, e.appendChild(a), this.fire("tileloadstart", {
          tile: a,
          coords: t
        });
      },
      _tileReady: function(t, e, i) {
        e && this.fire("tileerror", {
          error: e,
          tile: i,
          coords: t
        });
        var n = this._tileCoordsToKey(t);
        i = this._tiles[n], i && (i.loaded = +/* @__PURE__ */ new Date(), this._map._fadeAnimated ? (ft(i.el, 0), pt(this._fadeFrame), this._fadeFrame = rt(this._updateOpacity, this)) : (i.active = !0, this._pruneTiles()), e || (R(i.el, "leaflet-tile-loaded"), this.fire("tileload", {
          tile: i.el,
          coords: t
        })), this._noTilesToLoad() && (this._loading = !1, this.fire("load"), S.ielt9 || !this._map._fadeAnimated ? rt(this._pruneTiles, this) : setTimeout(h(this._pruneTiles, this), 250)));
      },
      _getTilePos: function(t) {
        return t.scaleBy(this.getTileSize()).subtract(this._level.origin);
      },
      _wrapCoords: function(t) {
        var e = new N(
          this._wrapX ? y(t.x, this._wrapX) : t.x,
          this._wrapY ? y(t.y, this._wrapY) : t.y
        );
        return e.z = t.z, e;
      },
      _pxBoundsToTileRange: function(t) {
        var e = this.getTileSize();
        return new Y(
          t.min.unscaleBy(e).floor(),
          t.max.unscaleBy(e).ceil().subtract([1, 1])
        );
      },
      _noTilesToLoad: function() {
        for (var t in this._tiles)
          if (!this._tiles[t].loaded)
            return !1;
        return !0;
      }
    });
    function ea(t) {
      return new re(t);
    }
    var Ut = re.extend({
      // @section
      // @aka TileLayer options
      options: {
        // @option minZoom: Number = 0
        // The minimum zoom level down to which this layer will be displayed (inclusive).
        minZoom: 0,
        // @option maxZoom: Number = 18
        // The maximum zoom level up to which this layer will be displayed (inclusive).
        maxZoom: 18,
        // @option subdomains: String|String[] = 'abc'
        // Subdomains of the tile service. Can be passed in the form of one string (where each letter is a subdomain name) or an array of strings.
        subdomains: "abc",
        // @option errorTileUrl: String = ''
        // URL to the tile image to show in place of the tile that failed to load.
        errorTileUrl: "",
        // @option zoomOffset: Number = 0
        // The zoom number used in tile URLs will be offset with this value.
        zoomOffset: 0,
        // @option tms: Boolean = false
        // If `true`, inverses Y axis numbering for tiles (turn this on for [TMS](https://en.wikipedia.org/wiki/Tile_Map_Service) services).
        tms: !1,
        // @option zoomReverse: Boolean = false
        // If set to true, the zoom number used in tile URLs will be reversed (`maxZoom - zoom` instead of `zoom`)
        zoomReverse: !1,
        // @option detectRetina: Boolean = false
        // If `true` and user is on a retina display, it will request four tiles of half the specified size and a bigger zoom level in place of one to utilize the high resolution.
        detectRetina: !1,
        // @option crossOrigin: Boolean|String = false
        // Whether the crossOrigin attribute will be added to the tiles.
        // If a String is provided, all tiles will have their crossOrigin attribute set to the String provided. This is needed if you want to access tile pixel data.
        // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
        crossOrigin: !1,
        // @option referrerPolicy: Boolean|String = false
        // Whether the referrerPolicy attribute will be added to the tiles.
        // If a String is provided, all tiles will have their referrerPolicy attribute set to the String provided.
        // This may be needed if your map's rendering context has a strict default but your tile provider expects a valid referrer
        // (e.g. to validate an API token).
        // Refer to [HTMLImageElement.referrerPolicy](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/referrerPolicy) for valid String values.
        referrerPolicy: !1
      },
      initialize: function(t, e) {
        this._url = t, e = k(this, e), e.detectRetina && S.retina && e.maxZoom > 0 ? (e.tileSize = Math.floor(e.tileSize / 2), e.zoomReverse ? (e.zoomOffset--, e.minZoom = Math.min(e.maxZoom, e.minZoom + 1)) : (e.zoomOffset++, e.maxZoom = Math.max(e.minZoom, e.maxZoom - 1)), e.minZoom = Math.max(0, e.minZoom)) : e.zoomReverse ? e.minZoom = Math.min(e.maxZoom, e.minZoom) : e.maxZoom = Math.max(e.minZoom, e.maxZoom), typeof e.subdomains == "string" && (e.subdomains = e.subdomains.split("")), this.on("tileunload", this._onTileRemove);
      },
      // @method setUrl(url: String, noRedraw?: Boolean): this
      // Updates the layer's URL template and redraws it (unless `noRedraw` is set to `true`).
      // If the URL does not change, the layer will not be redrawn unless
      // the noRedraw parameter is set to false.
      setUrl: function(t, e) {
        return this._url === t && e === void 0 && (e = !0), this._url = t, e || this.redraw(), this;
      },
      // @method createTile(coords: Object, done?: Function): HTMLElement
      // Called only internally, overrides GridLayer's [`createTile()`](#gridlayer-createtile)
      // to return an `<img>` HTML element with the appropriate image URL given `coords`. The `done`
      // callback is called when the tile has been loaded.
      createTile: function(t, e) {
        var i = document.createElement("img");
        return Z(i, "load", h(this._tileOnLoad, this, e, i)), Z(i, "error", h(this._tileOnError, this, e, i)), (this.options.crossOrigin || this.options.crossOrigin === "") && (i.crossOrigin = this.options.crossOrigin === !0 ? "" : this.options.crossOrigin), typeof this.options.referrerPolicy == "string" && (i.referrerPolicy = this.options.referrerPolicy), i.alt = "", i.src = this.getTileUrl(t), i;
      },
      // @section Extension methods
      // @uninheritable
      // Layers extending `TileLayer` might reimplement the following method.
      // @method getTileUrl(coords: Object): String
      // Called only internally, returns the URL for a tile given its coordinates.
      // Classes extending `TileLayer` can override this function to provide custom tile URL naming schemes.
      getTileUrl: function(t) {
        var e = {
          r: S.retina ? "@2x" : "",
          s: this._getSubdomain(t),
          x: t.x,
          y: t.y,
          z: this._getZoomForUrl()
        };
        if (this._map && !this._map.options.crs.infinite) {
          var i = this._globalTileRange.max.y - t.y;
          this.options.tms && (e.y = i), e["-y"] = i;
        }
        return H(this._url, r(e, this.options));
      },
      _tileOnLoad: function(t, e) {
        S.ielt9 ? setTimeout(h(t, this, null, e), 0) : t(null, e);
      },
      _tileOnError: function(t, e, i) {
        var n = this.options.errorTileUrl;
        n && e.getAttribute("src") !== n && (e.src = n), t(i, e);
      },
      _onTileRemove: function(t) {
        t.tile.onload = null;
      },
      _getZoomForUrl: function() {
        var t = this._tileZoom, e = this.options.maxZoom, i = this.options.zoomReverse, n = this.options.zoomOffset;
        return i && (t = e - t), t + n;
      },
      _getSubdomain: function(t) {
        var e = Math.abs(t.x + t.y) % this.options.subdomains.length;
        return this.options.subdomains[e];
      },
      // stops loading all tiles in the background layer
      _abortLoading: function() {
        var t, e;
        for (t in this._tiles)
          if (this._tiles[t].coords.z !== this._tileZoom && (e = this._tiles[t].el, e.onload = v, e.onerror = v, !e.complete)) {
            e.src = T;
            var i = this._tiles[t].coords;
            K(e), delete this._tiles[t], this.fire("tileabort", {
              tile: e,
              coords: i
            });
          }
      },
      _removeTile: function(t) {
        var e = this._tiles[t];
        if (e)
          return e.el.setAttribute("src", T), re.prototype._removeTile.call(this, t);
      },
      _tileReady: function(t, e, i) {
        if (!(!this._map || i && i.getAttribute("src") === T))
          return re.prototype._tileReady.call(this, t, e, i);
      }
    });
    function _o(t, e) {
      return new Ut(t, e);
    }
    var vo = Ut.extend({
      // @section
      // @aka TileLayer.WMS options
      // If any custom options not documented here are used, they will be sent to the
      // WMS server as extra parameters in each request URL. This can be useful for
      // [non-standard vendor WMS parameters](https://docs.geoserver.org/stable/en/user/services/wms/vendor.html).
      defaultWmsParams: {
        service: "WMS",
        request: "GetMap",
        // @option layers: String = ''
        // **(required)** Comma-separated list of WMS layers to show.
        layers: "",
        // @option styles: String = ''
        // Comma-separated list of WMS styles.
        styles: "",
        // @option format: String = 'image/jpeg'
        // WMS image format (use `'image/png'` for layers with transparency).
        format: "image/jpeg",
        // @option transparent: Boolean = false
        // If `true`, the WMS service will return images with transparency.
        transparent: !1,
        // @option version: String = '1.1.1'
        // Version of the WMS service to use
        version: "1.1.1"
      },
      options: {
        // @option crs: CRS = null
        // Coordinate Reference System to use for the WMS requests, defaults to
        // map CRS. Don't change this if you're not sure what it means.
        crs: null,
        // @option uppercase: Boolean = false
        // If `true`, WMS request parameter keys will be uppercase.
        uppercase: !1
      },
      initialize: function(t, e) {
        this._url = t;
        var i = r({}, this.defaultWmsParams);
        for (var n in e)
          n in this.options || (i[n] = e[n]);
        e = k(this, e);
        var a = e.detectRetina && S.retina ? 2 : 1, l = this.getTileSize();
        i.width = l.x * a, i.height = l.y * a, this.wmsParams = i;
      },
      onAdd: function(t) {
        this._crs = this.options.crs || t.options.crs, this._wmsVersion = parseFloat(this.wmsParams.version);
        var e = this._wmsVersion >= 1.3 ? "crs" : "srs";
        this.wmsParams[e] = this._crs.code, Ut.prototype.onAdd.call(this, t);
      },
      getTileUrl: function(t) {
        var e = this._tileCoordsToNwSe(t), i = this._crs, n = lt(i.project(e[0]), i.project(e[1])), a = n.min, l = n.max, u = (this._wmsVersion >= 1.3 && this._crs === co ? [a.y, a.x, l.y, l.x] : [a.x, a.y, l.x, l.y]).join(","), g = Ut.prototype.getTileUrl.call(this, t);
        return g + w(this.wmsParams, g, this.options.uppercase) + (this.options.uppercase ? "&BBOX=" : "&bbox=") + u;
      },
      // @method setParams(params: Object, noRedraw?: Boolean): this
      // Merges an object with the new parameters and re-requests tiles on the current screen (unless `noRedraw` was set to true).
      setParams: function(t, e) {
        return r(this.wmsParams, t), e || this.redraw(), this;
      }
    });
    function ia(t, e) {
      return new vo(t, e);
    }
    Ut.WMS = vo, _o.wms = ia;
    var Mt = vt.extend({
      // @section
      // @aka Renderer options
      options: {
        // @option padding: Number = 0.1
        // How much to extend the clip area around the map view (relative to its size)
        // e.g. 0.1 would be 10% of map view in each direction
        padding: 0.1
      },
      initialize: function(t) {
        k(this, t), f(this), this._layers = this._layers || {};
      },
      onAdd: function() {
        this._container || (this._initContainer(), R(this._container, "leaflet-zoom-animated")), this.getPane().appendChild(this._container), this._update(), this.on("update", this._updatePaths, this);
      },
      onRemove: function() {
        this.off("update", this._updatePaths, this), this._destroyContainer();
      },
      getEvents: function() {
        var t = {
          viewreset: this._reset,
          zoom: this._onZoom,
          moveend: this._update,
          zoomend: this._onZoomEnd
        };
        return this._zoomAnimated && (t.zoomanim = this._onAnimZoom), t;
      },
      _onAnimZoom: function(t) {
        this._updateTransform(t.center, t.zoom);
      },
      _onZoom: function() {
        this._updateTransform(this._map.getCenter(), this._map.getZoom());
      },
      _updateTransform: function(t, e) {
        var i = this._map.getZoomScale(e, this._zoom), n = this._map.getSize().multiplyBy(0.5 + this.options.padding), a = this._map.project(this._center, e), l = n.multiplyBy(-i).add(a).subtract(this._map._getNewPixelOrigin(t, e));
        S.any3d ? It(this._container, l, i) : tt(this._container, l);
      },
      _reset: function() {
        this._update(), this._updateTransform(this._center, this._zoom);
        for (var t in this._layers)
          this._layers[t]._reset();
      },
      _onZoomEnd: function() {
        for (var t in this._layers)
          this._layers[t]._project();
      },
      _updatePaths: function() {
        for (var t in this._layers)
          this._layers[t]._update();
      },
      _update: function() {
        var t = this.options.padding, e = this._map.getSize(), i = this._map.containerPointToLayerPoint(e.multiplyBy(-t)).round();
        this._bounds = new Y(i, i.add(e.multiplyBy(1 + t * 2)).round()), this._center = this._map.getCenter(), this._zoom = this._map.getZoom();
      }
    }), bo = Mt.extend({
      // @section
      // @aka Canvas options
      options: {
        // @option tolerance: Number = 0
        // How much to extend the click tolerance around a path/object on the map.
        tolerance: 0
      },
      getEvents: function() {
        var t = Mt.prototype.getEvents.call(this);
        return t.viewprereset = this._onViewPreReset, t;
      },
      _onViewPreReset: function() {
        this._postponeUpdatePaths = !0;
      },
      onAdd: function() {
        Mt.prototype.onAdd.call(this), this._draw();
      },
      _initContainer: function() {
        var t = this._container = document.createElement("canvas");
        Z(t, "mousemove", this._onMouseMove, this), Z(t, "click dblclick mousedown mouseup contextmenu", this._onClick, this), Z(t, "mouseout", this._handleMouseOut, this), t._leaflet_disable_events = !0, this._ctx = t.getContext("2d");
      },
      _destroyContainer: function() {
        pt(this._redrawRequest), delete this._ctx, K(this._container), j(this._container), delete this._container;
      },
      _updatePaths: function() {
        if (!this._postponeUpdatePaths) {
          var t;
          this._redrawBounds = null;
          for (var e in this._layers)
            t = this._layers[e], t._update();
          this._redraw();
        }
      },
      _update: function() {
        if (!(this._map._animatingZoom && this._bounds)) {
          Mt.prototype._update.call(this);
          var t = this._bounds, e = this._container, i = t.getSize(), n = S.retina ? 2 : 1;
          tt(e, t.min), e.width = n * i.x, e.height = n * i.y, e.style.width = i.x + "px", e.style.height = i.y + "px", S.retina && this._ctx.scale(2, 2), this._ctx.translate(-t.min.x, -t.min.y), this.fire("update");
        }
      },
      _reset: function() {
        Mt.prototype._reset.call(this), this._postponeUpdatePaths && (this._postponeUpdatePaths = !1, this._updatePaths());
      },
      _initPath: function(t) {
        this._updateDashArray(t), this._layers[f(t)] = t;
        var e = t._order = {
          layer: t,
          prev: this._drawLast,
          next: null
        };
        this._drawLast && (this._drawLast.next = e), this._drawLast = e, this._drawFirst = this._drawFirst || this._drawLast;
      },
      _addPath: function(t) {
        this._requestRedraw(t);
      },
      _removePath: function(t) {
        var e = t._order, i = e.next, n = e.prev;
        i ? i.prev = n : this._drawLast = n, n ? n.next = i : this._drawFirst = i, delete t._order, delete this._layers[f(t)], this._requestRedraw(t);
      },
      _updatePath: function(t) {
        this._extendRedrawBounds(t), t._project(), t._update(), this._requestRedraw(t);
      },
      _updateStyle: function(t) {
        this._updateDashArray(t), this._requestRedraw(t);
      },
      _updateDashArray: function(t) {
        if (typeof t.options.dashArray == "string") {
          var e = t.options.dashArray.split(/[, ]+/), i = [], n, a;
          for (a = 0; a < e.length; a++) {
            if (n = Number(e[a]), isNaN(n))
              return;
            i.push(n);
          }
          t.options._dashArray = i;
        } else
          t.options._dashArray = t.options.dashArray;
      },
      _requestRedraw: function(t) {
        this._map && (this._extendRedrawBounds(t), this._redrawRequest = this._redrawRequest || rt(this._redraw, this));
      },
      _extendRedrawBounds: function(t) {
        if (t._pxBounds) {
          var e = (t.options.weight || 0) + 1;
          this._redrawBounds = this._redrawBounds || new Y(), this._redrawBounds.extend(t._pxBounds.min.subtract([e, e])), this._redrawBounds.extend(t._pxBounds.max.add([e, e]));
        }
      },
      _redraw: function() {
        this._redrawRequest = null, this._redrawBounds && (this._redrawBounds.min._floor(), this._redrawBounds.max._ceil()), this._clear(), this._draw(), this._redrawBounds = null;
      },
      _clear: function() {
        var t = this._redrawBounds;
        if (t) {
          var e = t.getSize();
          this._ctx.clearRect(t.min.x, t.min.y, e.x, e.y);
        } else
          this._ctx.save(), this._ctx.setTransform(1, 0, 0, 1, 0, 0), this._ctx.clearRect(0, 0, this._container.width, this._container.height), this._ctx.restore();
      },
      _draw: function() {
        var t, e = this._redrawBounds;
        if (this._ctx.save(), e) {
          var i = e.getSize();
          this._ctx.beginPath(), this._ctx.rect(e.min.x, e.min.y, i.x, i.y), this._ctx.clip();
        }
        this._drawing = !0;
        for (var n = this._drawFirst; n; n = n.next)
          t = n.layer, (!e || t._pxBounds && t._pxBounds.intersects(e)) && t._updatePath();
        this._drawing = !1, this._ctx.restore();
      },
      _updatePoly: function(t, e) {
        if (this._drawing) {
          var i, n, a, l, u = t._parts, g = u.length, _ = this._ctx;
          if (g) {
            for (_.beginPath(), i = 0; i < g; i++) {
              for (n = 0, a = u[i].length; n < a; n++)
                l = u[i][n], _[n ? "lineTo" : "moveTo"](l.x, l.y);
              e && _.closePath();
            }
            this._fillStroke(_, t);
          }
        }
      },
      _updateCircle: function(t) {
        if (!(!this._drawing || t._empty())) {
          var e = t._point, i = this._ctx, n = Math.max(Math.round(t._radius), 1), a = (Math.max(Math.round(t._radiusY), 1) || n) / n;
          a !== 1 && (i.save(), i.scale(1, a)), i.beginPath(), i.arc(e.x, e.y / a, n, 0, Math.PI * 2, !1), a !== 1 && i.restore(), this._fillStroke(i, t);
        }
      },
      _fillStroke: function(t, e) {
        var i = e.options;
        i.fill && (t.globalAlpha = i.fillOpacity, t.fillStyle = i.fillColor || i.color, t.fill(i.fillRule || "evenodd")), i.stroke && i.weight !== 0 && (t.setLineDash && t.setLineDash(e.options && e.options._dashArray || []), t.globalAlpha = i.opacity, t.lineWidth = i.weight, t.strokeStyle = i.color, t.lineCap = i.lineCap, t.lineJoin = i.lineJoin, t.stroke());
      },
      // Canvas obviously doesn't have mouse events for individual drawn objects,
      // so we emulate that by calculating what's under the mouse on mousemove/click manually
      _onClick: function(t) {
        for (var e = this._map.mouseEventToLayerPoint(t), i, n, a = this._drawFirst; a; a = a.next)
          i = a.layer, i.options.interactive && i._containsPoint(e) && (!(t.type === "click" || t.type === "preclick") || !this._map._draggableMoved(i)) && (n = i);
        this._fireEvent(n ? [n] : !1, t);
      },
      _onMouseMove: function(t) {
        if (!(!this._map || this._map.dragging.moving() || this._map._animatingZoom)) {
          var e = this._map.mouseEventToLayerPoint(t);
          this._handleMouseHover(t, e);
        }
      },
      _handleMouseOut: function(t) {
        var e = this._hoveredLayer;
        e && (X(this._container, "leaflet-interactive"), this._fireEvent([e], t, "mouseout"), this._hoveredLayer = null, this._mouseHoverThrottled = !1);
      },
      _handleMouseHover: function(t, e) {
        if (!this._mouseHoverThrottled) {
          for (var i, n, a = this._drawFirst; a; a = a.next)
            i = a.layer, i.options.interactive && i._containsPoint(e) && (n = i);
          n !== this._hoveredLayer && (this._handleMouseOut(t), n && (R(this._container, "leaflet-interactive"), this._fireEvent([n], t, "mouseover"), this._hoveredLayer = n)), this._fireEvent(this._hoveredLayer ? [this._hoveredLayer] : !1, t), this._mouseHoverThrottled = !0, setTimeout(h(function() {
            this._mouseHoverThrottled = !1;
          }, this), 32);
        }
      },
      _fireEvent: function(t, e, i) {
        this._map._fireDOMEvent(e, i || e.type, t);
      },
      _bringToFront: function(t) {
        var e = t._order;
        if (e) {
          var i = e.next, n = e.prev;
          if (i)
            i.prev = n;
          else
            return;
          n ? n.next = i : i && (this._drawFirst = i), e.prev = this._drawLast, this._drawLast.next = e, e.next = null, this._drawLast = e, this._requestRedraw(t);
        }
      },
      _bringToBack: function(t) {
        var e = t._order;
        if (e) {
          var i = e.next, n = e.prev;
          if (n)
            n.next = i;
          else
            return;
          i ? i.prev = n : n && (this._drawLast = n), e.prev = null, e.next = this._drawFirst, this._drawFirst.prev = e, this._drawFirst = e, this._requestRedraw(t);
        }
      }
    });
    function xo(t) {
      return S.canvas ? new bo(t) : null;
    }
    var le = function() {
      try {
        return document.namespaces.add("lvml", "urn:schemas-microsoft-com:vml"), function(t) {
          return document.createElement("<lvml:" + t + ' class="lvml">');
        };
      } catch {
      }
      return function(t) {
        return document.createElement("<" + t + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
      };
    }(), oa = {
      _initContainer: function() {
        this._container = W("div", "leaflet-vml-container");
      },
      _update: function() {
        this._map._animatingZoom || (Mt.prototype._update.call(this), this.fire("update"));
      },
      _initPath: function(t) {
        var e = t._container = le("shape");
        R(e, "leaflet-vml-shape " + (this.options.className || "")), e.coordsize = "1 1", t._path = le("path"), e.appendChild(t._path), this._updateStyle(t), this._layers[f(t)] = t;
      },
      _addPath: function(t) {
        var e = t._container;
        this._container.appendChild(e), t.options.interactive && t.addInteractiveTarget(e);
      },
      _removePath: function(t) {
        var e = t._container;
        K(e), t.removeInteractiveTarget(e), delete this._layers[f(t)];
      },
      _updateStyle: function(t) {
        var e = t._stroke, i = t._fill, n = t.options, a = t._container;
        a.stroked = !!n.stroke, a.filled = !!n.fill, n.stroke ? (e || (e = t._stroke = le("stroke")), a.appendChild(e), e.weight = n.weight + "px", e.color = n.color, e.opacity = n.opacity, n.dashArray ? e.dashStyle = V(n.dashArray) ? n.dashArray.join(" ") : n.dashArray.replace(/( *, *)/g, " ") : e.dashStyle = "", e.endcap = n.lineCap.replace("butt", "flat"), e.joinstyle = n.lineJoin) : e && (a.removeChild(e), t._stroke = null), n.fill ? (i || (i = t._fill = le("fill")), a.appendChild(i), i.color = n.fillColor || n.color, i.opacity = n.fillOpacity) : i && (a.removeChild(i), t._fill = null);
      },
      _updateCircle: function(t) {
        var e = t._point.round(), i = Math.round(t._radius), n = Math.round(t._radiusY || i);
        this._setPath(t, t._empty() ? "M0 0" : "AL " + e.x + "," + e.y + " " + i + "," + n + " 0," + 65535 * 360);
      },
      _setPath: function(t, e) {
        t._path.v = e;
      },
      _bringToFront: function(t) {
        qt(t._container);
      },
      _bringToBack: function(t) {
        Ft(t._container);
      }
    }, Ae = S.vml ? le : ki, ce = Mt.extend({
      _initContainer: function() {
        this._container = Ae("svg"), this._container.setAttribute("pointer-events", "none"), this._rootGroup = Ae("g"), this._container.appendChild(this._rootGroup);
      },
      _destroyContainer: function() {
        K(this._container), j(this._container), delete this._container, delete this._rootGroup, delete this._svgSize;
      },
      _update: function() {
        if (!(this._map._animatingZoom && this._bounds)) {
          Mt.prototype._update.call(this);
          var t = this._bounds, e = t.getSize(), i = this._container;
          (!this._svgSize || !this._svgSize.equals(e)) && (this._svgSize = e, i.setAttribute("width", e.x), i.setAttribute("height", e.y)), tt(i, t.min), i.setAttribute("viewBox", [t.min.x, t.min.y, e.x, e.y].join(" ")), this.fire("update");
        }
      },
      // methods below are called by vector layers implementations
      _initPath: function(t) {
        var e = t._path = Ae("path");
        t.options.className && R(e, t.options.className), t.options.interactive && R(e, "leaflet-interactive"), this._updateStyle(t), this._layers[f(t)] = t;
      },
      _addPath: function(t) {
        this._rootGroup || this._initContainer(), this._rootGroup.appendChild(t._path), t.addInteractiveTarget(t._path);
      },
      _removePath: function(t) {
        K(t._path), t.removeInteractiveTarget(t._path), delete this._layers[f(t)];
      },
      _updatePath: function(t) {
        t._project(), t._update();
      },
      _updateStyle: function(t) {
        var e = t._path, i = t.options;
        e && (i.stroke ? (e.setAttribute("stroke", i.color), e.setAttribute("stroke-opacity", i.opacity), e.setAttribute("stroke-width", i.weight), e.setAttribute("stroke-linecap", i.lineCap), e.setAttribute("stroke-linejoin", i.lineJoin), i.dashArray ? e.setAttribute("stroke-dasharray", i.dashArray) : e.removeAttribute("stroke-dasharray"), i.dashOffset ? e.setAttribute("stroke-dashoffset", i.dashOffset) : e.removeAttribute("stroke-dashoffset")) : e.setAttribute("stroke", "none"), i.fill ? (e.setAttribute("fill", i.fillColor || i.color), e.setAttribute("fill-opacity", i.fillOpacity), e.setAttribute("fill-rule", i.fillRule || "evenodd")) : e.setAttribute("fill", "none"));
      },
      _updatePoly: function(t, e) {
        this._setPath(t, Ei(t._parts, e));
      },
      _updateCircle: function(t) {
        var e = t._point, i = Math.max(Math.round(t._radius), 1), n = Math.max(Math.round(t._radiusY), 1) || i, a = "a" + i + "," + n + " 0 1,0 ", l = t._empty() ? "M0 0" : "M" + (e.x - i) + "," + e.y + a + i * 2 + ",0 " + a + -i * 2 + ",0 ";
        this._setPath(t, l);
      },
      _setPath: function(t, e) {
        t._path.setAttribute("d", e);
      },
      // SVG does not have the concept of zIndex so we resort to changing the DOM order of elements
      _bringToFront: function(t) {
        qt(t._path);
      },
      _bringToBack: function(t) {
        Ft(t._path);
      }
    });
    S.vml && ce.include(oa);
    function yo(t) {
      return S.svg || S.vml ? new ce(t) : null;
    }
    F.include({
      // @namespace Map; @method getRenderer(layer: Path): Renderer
      // Returns the instance of `Renderer` that should be used to render the given
      // `Path`. It will ensure that the `renderer` options of the map and paths
      // are respected, and that the renderers do exist on the map.
      getRenderer: function(t) {
        var e = t.options.renderer || this._getPaneRenderer(t.options.pane) || this.options.renderer || this._renderer;
        return e || (e = this._renderer = this._createRenderer()), this.hasLayer(e) || this.addLayer(e), e;
      },
      _getPaneRenderer: function(t) {
        if (t === "overlayPane" || t === void 0)
          return !1;
        var e = this._paneRenderers[t];
        return e === void 0 && (e = this._createRenderer({ pane: t }), this._paneRenderers[t] = e), e;
      },
      _createRenderer: function(t) {
        return this.options.preferCanvas && xo(t) || yo(t);
      }
    });
    var wo = Vt.extend({
      initialize: function(t, e) {
        Vt.prototype.initialize.call(this, this._boundsToLatLngs(t), e);
      },
      // @method setBounds(latLngBounds: LatLngBounds): this
      // Redraws the rectangle with the passed bounds.
      setBounds: function(t) {
        return this.setLatLngs(this._boundsToLatLngs(t));
      },
      _boundsToLatLngs: function(t) {
        return t = Q(t), [
          t.getSouthWest(),
          t.getNorthWest(),
          t.getNorthEast(),
          t.getSouthEast()
        ];
      }
    });
    function na(t, e) {
      return new wo(t, e);
    }
    ce.create = Ae, ce.pointsToPath = Ei, At.geometryToLayer = ye, At.coordsToLatLng = li, At.coordsToLatLngs = we, At.latLngToCoords = ci, At.latLngsToCoords = ke, At.getFeature = Gt, At.asFeature = Ee, F.mergeOptions({
      // @option boxZoom: Boolean = true
      // Whether the map can be zoomed to a rectangular area specified by
      // dragging the mouse while pressing the shift key.
      boxZoom: !0
    });
    var ko = wt.extend({
      initialize: function(t) {
        this._map = t, this._container = t._container, this._pane = t._panes.overlayPane, this._resetStateTimeout = 0, t.on("unload", this._destroy, this);
      },
      addHooks: function() {
        Z(this._container, "mousedown", this._onMouseDown, this);
      },
      removeHooks: function() {
        j(this._container, "mousedown", this._onMouseDown, this);
      },
      moved: function() {
        return this._moved;
      },
      _destroy: function() {
        K(this._pane), delete this._pane;
      },
      _resetState: function() {
        this._resetStateTimeout = 0, this._moved = !1;
      },
      _clearDeferredResetState: function() {
        this._resetStateTimeout !== 0 && (clearTimeout(this._resetStateTimeout), this._resetStateTimeout = 0);
      },
      _onMouseDown: function(t) {
        if (!t.shiftKey || t.which !== 1 && t.button !== 1)
          return !1;
        this._clearDeferredResetState(), this._resetState(), te(), Ve(), this._startPoint = this._map.mouseEventToContainerPoint(t), Z(document, {
          contextmenu: Nt,
          mousemove: this._onMouseMove,
          mouseup: this._onMouseUp,
          keydown: this._onKeyDown
        }, this);
      },
      _onMouseMove: function(t) {
        this._moved || (this._moved = !0, this._box = W("div", "leaflet-zoom-box", this._container), R(this._container, "leaflet-crosshair"), this._map.fire("boxzoomstart")), this._point = this._map.mouseEventToContainerPoint(t);
        var e = new Y(this._point, this._startPoint), i = e.getSize();
        tt(this._box, e.min), this._box.style.width = i.x + "px", this._box.style.height = i.y + "px";
      },
      _finish: function() {
        this._moved && (K(this._box), X(this._container, "leaflet-crosshair")), ee(), Ge(), j(document, {
          contextmenu: Nt,
          mousemove: this._onMouseMove,
          mouseup: this._onMouseUp,
          keydown: this._onKeyDown
        }, this);
      },
      _onMouseUp: function(t) {
        if (!(t.which !== 1 && t.button !== 1) && (this._finish(), !!this._moved)) {
          this._clearDeferredResetState(), this._resetStateTimeout = setTimeout(h(this._resetState, this), 0);
          var e = new ct(
            this._map.containerPointToLatLng(this._startPoint),
            this._map.containerPointToLatLng(this._point)
          );
          this._map.fitBounds(e).fire("boxzoomend", { boxZoomBounds: e });
        }
      },
      _onKeyDown: function(t) {
        t.keyCode === 27 && (this._finish(), this._clearDeferredResetState(), this._resetState());
      }
    });
    F.addInitHook("addHandler", "boxZoom", ko), F.mergeOptions({
      // @option doubleClickZoom: Boolean|String = true
      // Whether the map can be zoomed in by double clicking on it and
      // zoomed out by double clicking while holding shift. If passed
      // `'center'`, double-click zoom will zoom to the center of the
      //  view regardless of where the mouse was.
      doubleClickZoom: !0
    });
    var Eo = wt.extend({
      addHooks: function() {
        this._map.on("dblclick", this._onDoubleClick, this);
      },
      removeHooks: function() {
        this._map.off("dblclick", this._onDoubleClick, this);
      },
      _onDoubleClick: function(t) {
        var e = this._map, i = e.getZoom(), n = e.options.zoomDelta, a = t.originalEvent.shiftKey ? i - n : i + n;
        e.options.doubleClickZoom === "center" ? e.setZoom(a) : e.setZoomAround(t.containerPoint, a);
      }
    });
    F.addInitHook("addHandler", "doubleClickZoom", Eo), F.mergeOptions({
      // @option dragging: Boolean = true
      // Whether the map is draggable with mouse/touch or not.
      dragging: !0,
      // @section Panning Inertia Options
      // @option inertia: Boolean = *
      // If enabled, panning of the map will have an inertia effect where
      // the map builds momentum while dragging and continues moving in
      // the same direction for some time. Feels especially nice on touch
      // devices. Enabled by default.
      inertia: !0,
      // @option inertiaDeceleration: Number = 3000
      // The rate with which the inertial movement slows down, in pixels/second².
      inertiaDeceleration: 3400,
      // px/s^2
      // @option inertiaMaxSpeed: Number = Infinity
      // Max speed of the inertial movement, in pixels/second.
      inertiaMaxSpeed: 1 / 0,
      // px/s
      // @option easeLinearity: Number = 0.2
      easeLinearity: 0.2,
      // TODO refactor, move to CRS
      // @option worldCopyJump: Boolean = false
      // With this option enabled, the map tracks when you pan to another "copy"
      // of the world and seamlessly jumps to the original one so that all overlays
      // like markers and vector layers are still visible.
      worldCopyJump: !1,
      // @option maxBoundsViscosity: Number = 0.0
      // If `maxBounds` is set, this option will control how solid the bounds
      // are when dragging the map around. The default value of `0.0` allows the
      // user to drag outside the bounds at normal speed, higher values will
      // slow down map dragging outside bounds, and `1.0` makes the bounds fully
      // solid, preventing the user from dragging outside the bounds.
      maxBoundsViscosity: 0
    });
    var Lo = wt.extend({
      addHooks: function() {
        if (!this._draggable) {
          var t = this._map;
          this._draggable = new zt(t._mapPane, t._container), this._draggable.on({
            dragstart: this._onDragStart,
            drag: this._onDrag,
            dragend: this._onDragEnd
          }, this), this._draggable.on("predrag", this._onPreDragLimit, this), t.options.worldCopyJump && (this._draggable.on("predrag", this._onPreDragWrap, this), t.on("zoomend", this._onZoomEnd, this), t.whenReady(this._onZoomEnd, this));
        }
        R(this._map._container, "leaflet-grab leaflet-touch-drag"), this._draggable.enable(), this._positions = [], this._times = [];
      },
      removeHooks: function() {
        X(this._map._container, "leaflet-grab"), X(this._map._container, "leaflet-touch-drag"), this._draggable.disable();
      },
      moved: function() {
        return this._draggable && this._draggable._moved;
      },
      moving: function() {
        return this._draggable && this._draggable._moving;
      },
      _onDragStart: function() {
        var t = this._map;
        if (t._stop(), this._map.options.maxBounds && this._map.options.maxBoundsViscosity) {
          var e = Q(this._map.options.maxBounds);
          this._offsetLimit = lt(
            this._map.latLngToContainerPoint(e.getNorthWest()).multiplyBy(-1),
            this._map.latLngToContainerPoint(e.getSouthEast()).multiplyBy(-1).add(this._map.getSize())
          ), this._viscosity = Math.min(1, Math.max(0, this._map.options.maxBoundsViscosity));
        } else
          this._offsetLimit = null;
        t.fire("movestart").fire("dragstart"), t.options.inertia && (this._positions = [], this._times = []);
      },
      _onDrag: function(t) {
        if (this._map.options.inertia) {
          var e = this._lastTime = +/* @__PURE__ */ new Date(), i = this._lastPos = this._draggable._absPos || this._draggable._newPos;
          this._positions.push(i), this._times.push(e), this._prunePositions(e);
        }
        this._map.fire("move", t).fire("drag", t);
      },
      _prunePositions: function(t) {
        for (; this._positions.length > 1 && t - this._times[0] > 50; )
          this._positions.shift(), this._times.shift();
      },
      _onZoomEnd: function() {
        var t = this._map.getSize().divideBy(2), e = this._map.latLngToLayerPoint([0, 0]);
        this._initialWorldOffset = e.subtract(t).x, this._worldWidth = this._map.getPixelWorldBounds().getSize().x;
      },
      _viscousLimit: function(t, e) {
        return t - (t - e) * this._viscosity;
      },
      _onPreDragLimit: function() {
        if (!(!this._viscosity || !this._offsetLimit)) {
          var t = this._draggable._newPos.subtract(this._draggable._startPos), e = this._offsetLimit;
          t.x < e.min.x && (t.x = this._viscousLimit(t.x, e.min.x)), t.y < e.min.y && (t.y = this._viscousLimit(t.y, e.min.y)), t.x > e.max.x && (t.x = this._viscousLimit(t.x, e.max.x)), t.y > e.max.y && (t.y = this._viscousLimit(t.y, e.max.y)), this._draggable._newPos = this._draggable._startPos.add(t);
        }
      },
      _onPreDragWrap: function() {
        var t = this._worldWidth, e = Math.round(t / 2), i = this._initialWorldOffset, n = this._draggable._newPos.x, a = (n - e + i) % t + e - i, l = (n + e + i) % t - e - i, u = Math.abs(a + i) < Math.abs(l + i) ? a : l;
        this._draggable._absPos = this._draggable._newPos.clone(), this._draggable._newPos.x = u;
      },
      _onDragEnd: function(t) {
        var e = this._map, i = e.options, n = !i.inertia || t.noInertia || this._times.length < 2;
        if (e.fire("dragend", t), n)
          e.fire("moveend");
        else {
          this._prunePositions(+/* @__PURE__ */ new Date());
          var a = this._lastPos.subtract(this._positions[0]), l = (this._lastTime - this._times[0]) / 1e3, u = i.easeLinearity, g = a.multiplyBy(u / l), _ = g.distanceTo([0, 0]), x = Math.min(i.inertiaMaxSpeed, _), P = g.multiplyBy(x / _), I = x / (i.inertiaDeceleration * u), D = P.multiplyBy(-I / 2).round();
          !D.x && !D.y ? e.fire("moveend") : (D = e._limitOffset(D, e.options.maxBounds), rt(function() {
            e.panBy(D, {
              duration: I,
              easeLinearity: u,
              noMoveStart: !0,
              animate: !0
            });
          }));
        }
      }
    });
    F.addInitHook("addHandler", "dragging", Lo), F.mergeOptions({
      // @option keyboard: Boolean = true
      // Makes the map focusable and allows users to navigate the map with keyboard
      // arrows and `+`/`-` keys.
      keyboard: !0,
      // @option keyboardPanDelta: Number = 80
      // Amount of pixels to pan when pressing an arrow key.
      keyboardPanDelta: 80
    });
    var Po = wt.extend({
      keyCodes: {
        left: [37],
        right: [39],
        down: [40],
        up: [38],
        zoomIn: [187, 107, 61, 171],
        zoomOut: [189, 109, 54, 173]
      },
      initialize: function(t) {
        this._map = t, this._setPanDelta(t.options.keyboardPanDelta), this._setZoomDelta(t.options.zoomDelta);
      },
      addHooks: function() {
        var t = this._map._container;
        t.tabIndex <= 0 && (t.tabIndex = "0"), Z(t, {
          focus: this._onFocus,
          blur: this._onBlur,
          mousedown: this._onMouseDown
        }, this), this._map.on({
          focus: this._addHooks,
          blur: this._removeHooks
        }, this);
      },
      removeHooks: function() {
        this._removeHooks(), j(this._map._container, {
          focus: this._onFocus,
          blur: this._onBlur,
          mousedown: this._onMouseDown
        }, this), this._map.off({
          focus: this._addHooks,
          blur: this._removeHooks
        }, this);
      },
      _onMouseDown: function() {
        if (!this._focused) {
          var t = document.body, e = document.documentElement, i = t.scrollTop || e.scrollTop, n = t.scrollLeft || e.scrollLeft;
          this._map._container.focus(), window.scrollTo(n, i);
        }
      },
      _onFocus: function() {
        this._focused = !0, this._map.fire("focus");
      },
      _onBlur: function() {
        this._focused = !1, this._map.fire("blur");
      },
      _setPanDelta: function(t) {
        var e = this._panKeys = {}, i = this.keyCodes, n, a;
        for (n = 0, a = i.left.length; n < a; n++)
          e[i.left[n]] = [-1 * t, 0];
        for (n = 0, a = i.right.length; n < a; n++)
          e[i.right[n]] = [t, 0];
        for (n = 0, a = i.down.length; n < a; n++)
          e[i.down[n]] = [0, t];
        for (n = 0, a = i.up.length; n < a; n++)
          e[i.up[n]] = [0, -1 * t];
      },
      _setZoomDelta: function(t) {
        var e = this._zoomKeys = {}, i = this.keyCodes, n, a;
        for (n = 0, a = i.zoomIn.length; n < a; n++)
          e[i.zoomIn[n]] = t;
        for (n = 0, a = i.zoomOut.length; n < a; n++)
          e[i.zoomOut[n]] = -t;
      },
      _addHooks: function() {
        Z(document, "keydown", this._onKeyDown, this);
      },
      _removeHooks: function() {
        j(document, "keydown", this._onKeyDown, this);
      },
      _onKeyDown: function(t) {
        if (!(t.altKey || t.ctrlKey || t.metaKey)) {
          var e = t.keyCode, i = this._map, n;
          if (e in this._panKeys) {
            if (!i._panAnim || !i._panAnim._inProgress)
              if (n = this._panKeys[e], t.shiftKey && (n = B(n).multiplyBy(3)), i.options.maxBounds && (n = i._limitOffset(B(n), i.options.maxBounds)), i.options.worldCopyJump) {
                var a = i.wrapLatLng(i.unproject(i.project(i.getCenter()).add(n)));
                i.panTo(a);
              } else
                i.panBy(n);
          } else if (e in this._zoomKeys)
            i.setZoom(i.getZoom() + (t.shiftKey ? 3 : 1) * this._zoomKeys[e]);
          else if (e === 27 && i._popup && i._popup.options.closeOnEscapeKey)
            i.closePopup();
          else
            return;
          Nt(t);
        }
      }
    });
    F.addInitHook("addHandler", "keyboard", Po), F.mergeOptions({
      // @section Mouse wheel options
      // @option scrollWheelZoom: Boolean|String = true
      // Whether the map can be zoomed by using the mouse wheel. If passed `'center'`,
      // it will zoom to the center of the view regardless of where the mouse was.
      scrollWheelZoom: !0,
      // @option wheelDebounceTime: Number = 40
      // Limits the rate at which a wheel can fire (in milliseconds). By default
      // user can't zoom via wheel more often than once per 40 ms.
      wheelDebounceTime: 40,
      // @option wheelPxPerZoomLevel: Number = 60
      // How many scroll pixels (as reported by [L.DomEvent.getWheelDelta](#domevent-getwheeldelta))
      // mean a change of one full zoom level. Smaller values will make wheel-zooming
      // faster (and vice versa).
      wheelPxPerZoomLevel: 60
    });
    var Co = wt.extend({
      addHooks: function() {
        Z(this._map._container, "wheel", this._onWheelScroll, this), this._delta = 0;
      },
      removeHooks: function() {
        j(this._map._container, "wheel", this._onWheelScroll, this);
      },
      _onWheelScroll: function(t) {
        var e = Ki(t), i = this._map.options.wheelDebounceTime;
        this._delta += e, this._lastMousePos = this._map.mouseEventToContainerPoint(t), this._startTime || (this._startTime = +/* @__PURE__ */ new Date());
        var n = Math.max(i - (+/* @__PURE__ */ new Date() - this._startTime), 0);
        clearTimeout(this._timer), this._timer = setTimeout(h(this._performZoom, this), n), Nt(t);
      },
      _performZoom: function() {
        var t = this._map, e = t.getZoom(), i = this._map.options.zoomSnap || 0;
        t._stop();
        var n = this._delta / (this._map.options.wheelPxPerZoomLevel * 4), a = 4 * Math.log(2 / (1 + Math.exp(-Math.abs(n)))) / Math.LN2, l = i ? Math.ceil(a / i) * i : a, u = t._limitZoom(e + (this._delta > 0 ? l : -l)) - e;
        this._delta = 0, this._startTime = null, u && (t.options.scrollWheelZoom === "center" ? t.setZoom(e + u) : t.setZoomAround(this._lastMousePos, e + u));
      }
    });
    F.addInitHook("addHandler", "scrollWheelZoom", Co);
    var aa = 600;
    F.mergeOptions({
      // @section Touch interaction options
      // @option tapHold: Boolean
      // Enables simulation of `contextmenu` event, default is `true` for mobile Safari.
      tapHold: S.touchNative && S.safari && S.mobile,
      // @option tapTolerance: Number = 15
      // The max number of pixels a user can shift his finger during touch
      // for it to be considered a valid tap.
      tapTolerance: 15
    });
    var Ao = wt.extend({
      addHooks: function() {
        Z(this._map._container, "touchstart", this._onDown, this);
      },
      removeHooks: function() {
        j(this._map._container, "touchstart", this._onDown, this);
      },
      _onDown: function(t) {
        if (clearTimeout(this._holdTimeout), t.touches.length === 1) {
          var e = t.touches[0];
          this._startPos = this._newPos = new N(e.clientX, e.clientY), this._holdTimeout = setTimeout(h(function() {
            this._cancel(), this._isTapValid() && (Z(document, "touchend", nt), Z(document, "touchend touchcancel", this._cancelClickPrevent), this._simulateEvent("contextmenu", e));
          }, this), aa), Z(document, "touchend touchcancel contextmenu", this._cancel, this), Z(document, "touchmove", this._onMove, this);
        }
      },
      _cancelClickPrevent: function t() {
        j(document, "touchend", nt), j(document, "touchend touchcancel", t);
      },
      _cancel: function() {
        clearTimeout(this._holdTimeout), j(document, "touchend touchcancel contextmenu", this._cancel, this), j(document, "touchmove", this._onMove, this);
      },
      _onMove: function(t) {
        var e = t.touches[0];
        this._newPos = new N(e.clientX, e.clientY);
      },
      _isTapValid: function() {
        return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
      },
      _simulateEvent: function(t, e) {
        var i = new MouseEvent(t, {
          bubbles: !0,
          cancelable: !0,
          view: window,
          // detail: 1,
          screenX: e.screenX,
          screenY: e.screenY,
          clientX: e.clientX,
          clientY: e.clientY
          // button: 2,
          // buttons: 2
        });
        i._simulated = !0, e.target.dispatchEvent(i);
      }
    });
    F.addInitHook("addHandler", "tapHold", Ao), F.mergeOptions({
      // @section Touch interaction options
      // @option touchZoom: Boolean|String = *
      // Whether the map can be zoomed by touch-dragging with two fingers. If
      // passed `'center'`, it will zoom to the center of the view regardless of
      // where the touch events (fingers) were. Enabled for touch-capable web
      // browsers.
      touchZoom: S.touch,
      // @option bounceAtZoomLimits: Boolean = true
      // Set it to false if you don't want the map to zoom beyond min/max zoom
      // and then bounce back when pinch-zooming.
      bounceAtZoomLimits: !0
    });
    var Mo = wt.extend({
      addHooks: function() {
        R(this._map._container, "leaflet-touch-zoom"), Z(this._map._container, "touchstart", this._onTouchStart, this);
      },
      removeHooks: function() {
        X(this._map._container, "leaflet-touch-zoom"), j(this._map._container, "touchstart", this._onTouchStart, this);
      },
      _onTouchStart: function(t) {
        var e = this._map;
        if (!(!t.touches || t.touches.length !== 2 || e._animatingZoom || this._zooming)) {
          var i = e.mouseEventToContainerPoint(t.touches[0]), n = e.mouseEventToContainerPoint(t.touches[1]);
          this._centerPoint = e.getSize()._divideBy(2), this._startLatLng = e.containerPointToLatLng(this._centerPoint), e.options.touchZoom !== "center" && (this._pinchStartLatLng = e.containerPointToLatLng(i.add(n)._divideBy(2))), this._startDist = i.distanceTo(n), this._startZoom = e.getZoom(), this._moved = !1, this._zooming = !0, e._stop(), Z(document, "touchmove", this._onTouchMove, this), Z(document, "touchend touchcancel", this._onTouchEnd, this), nt(t);
        }
      },
      _onTouchMove: function(t) {
        if (!(!t.touches || t.touches.length !== 2 || !this._zooming)) {
          var e = this._map, i = e.mouseEventToContainerPoint(t.touches[0]), n = e.mouseEventToContainerPoint(t.touches[1]), a = i.distanceTo(n) / this._startDist;
          if (this._zoom = e.getScaleZoom(a, this._startZoom), !e.options.bounceAtZoomLimits && (this._zoom < e.getMinZoom() && a < 1 || this._zoom > e.getMaxZoom() && a > 1) && (this._zoom = e._limitZoom(this._zoom)), e.options.touchZoom === "center") {
            if (this._center = this._startLatLng, a === 1)
              return;
          } else {
            var l = i._add(n)._divideBy(2)._subtract(this._centerPoint);
            if (a === 1 && l.x === 0 && l.y === 0)
              return;
            this._center = e.unproject(e.project(this._pinchStartLatLng, this._zoom).subtract(l), this._zoom);
          }
          this._moved || (e._moveStart(!0, !1), this._moved = !0), pt(this._animRequest);
          var u = h(e._move, e, this._center, this._zoom, { pinch: !0, round: !1 }, void 0);
          this._animRequest = rt(u, this, !0), nt(t);
        }
      },
      _onTouchEnd: function() {
        if (!this._moved || !this._zooming) {
          this._zooming = !1;
          return;
        }
        this._zooming = !1, pt(this._animRequest), j(document, "touchmove", this._onTouchMove, this), j(document, "touchend touchcancel", this._onTouchEnd, this), this._map.options.zoomAnimation ? this._map._animateZoom(this._center, this._map._limitZoom(this._zoom), !0, this._map.options.zoomSnap) : this._map._resetView(this._center, this._map._limitZoom(this._zoom));
      }
    });
    F.addInitHook("addHandler", "touchZoom", Mo), F.BoxZoom = ko, F.DoubleClickZoom = Eo, F.Drag = Lo, F.Keyboard = Po, F.ScrollWheelZoom = Co, F.TapHold = Ao, F.TouchZoom = Mo, o.Bounds = Y, o.Browser = S, o.CRS = Lt, o.Canvas = bo, o.Circle = ri, o.CircleMarker = xe, o.Class = Et, o.Control = _t, o.DivIcon = go, o.DivOverlay = kt, o.DomEvent = kn, o.DomUtil = yn, o.Draggable = zt, o.Evented = Yt, o.FeatureGroup = Pt, o.GeoJSON = At, o.GridLayer = re, o.Handler = wt, o.Icon = $t, o.ImageOverlay = Le, o.LatLng = G, o.LatLngBounds = ct, o.Layer = vt, o.LayerGroup = Wt, o.LineUtil = Nn, o.Map = F, o.Marker = be, o.Mixin = Sn, o.Path = Tt, o.Point = N, o.PolyUtil = zn, o.Polygon = Vt, o.Polyline = Ct, o.Popup = Pe, o.PosAnimation = Xi, o.Projection = Zn, o.Rectangle = wo, o.Renderer = Mt, o.SVG = ce, o.SVGOverlay = mo, o.TileLayer = Ut, o.Tooltip = Ce, o.Transformation = Ie, o.Util = Fo, o.VideoOverlay = fo, o.bind = h, o.bounds = lt, o.canvas = xo, o.circle = Vn, o.circleMarker = $n, o.control = ne, o.divIcon = ta, o.extend = r, o.featureGroup = qn, o.geoJSON = po, o.geoJson = jn, o.gridLayer = ea, o.icon = Fn, o.imageOverlay = Yn, o.latLng = q, o.latLngBounds = Q, o.layerGroup = Hn, o.map = En, o.marker = Wn, o.point = B, o.polygon = Un, o.polyline = Gn, o.popup = Jn, o.rectangle = na, o.setOptions = k, o.stamp = f, o.svg = yo, o.svgOverlay = Xn, o.tileLayer = _o, o.tooltip = Qn, o.transformation = Kt, o.version = s, o.videoOverlay = Kn;
    var sa = window.L;
    o.noConflict = function() {
      return window.L = sa, this;
    }, window.L = o;
  });
})(pi, pi.exports);
var Ga = pi.exports;
const O = /* @__PURE__ */ Va(Ga), qo = '.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0}.leaflet-container{overflow:hidden}.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow{-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-user-drag:none}.leaflet-tile::selection{background:transparent}.leaflet-safari .leaflet-tile{image-rendering:-webkit-optimize-contrast}.leaflet-safari .leaflet-tile-container{width:1600px;height:1600px;-webkit-transform-origin:0 0}.leaflet-marker-icon,.leaflet-marker-shadow{display:block}.leaflet-container .leaflet-overlay-pane svg{max-width:none!important;max-height:none!important}.leaflet-container .leaflet-marker-pane img,.leaflet-container .leaflet-shadow-pane img,.leaflet-container .leaflet-tile-pane img,.leaflet-container img.leaflet-image-layer,.leaflet-container .leaflet-tile{max-width:none!important;max-height:none!important;width:auto;padding:0}.leaflet-container img.leaflet-tile{mix-blend-mode:plus-lighter}.leaflet-container.leaflet-touch-zoom{-ms-touch-action:pan-x pan-y;touch-action:pan-x pan-y}.leaflet-container.leaflet-touch-drag{-ms-touch-action:pinch-zoom;touch-action:none;touch-action:pinch-zoom}.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom{-ms-touch-action:none;touch-action:none}.leaflet-container{-webkit-tap-highlight-color:transparent}.leaflet-container a{-webkit-tap-highlight-color:rgba(51,181,229,.4)}.leaflet-tile{filter:inherit;visibility:hidden}.leaflet-tile-loaded{visibility:inherit}.leaflet-zoom-box{width:0;height:0;-moz-box-sizing:border-box;box-sizing:border-box;z-index:800}.leaflet-overlay-pane svg{-moz-user-select:none}.leaflet-pane{z-index:400}.leaflet-tile-pane{z-index:200}.leaflet-overlay-pane{z-index:400}.leaflet-shadow-pane{z-index:500}.leaflet-marker-pane{z-index:600}.leaflet-tooltip-pane{z-index:650}.leaflet-popup-pane{z-index:700}.leaflet-map-pane canvas{z-index:100}.leaflet-map-pane svg{z-index:200}.leaflet-vml-shape{width:1px;height:1px}.lvml{behavior:url(#default#VML);display:inline-block;position:absolute}.leaflet-control{position:relative;z-index:800;pointer-events:visiblePainted;pointer-events:auto}.leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none}.leaflet-top{top:0}.leaflet-right{right:0}.leaflet-bottom{bottom:0}.leaflet-left{left:0}.leaflet-control{float:left;clear:both}.leaflet-right .leaflet-control{float:right}.leaflet-top .leaflet-control{margin-top:10px}.leaflet-bottom .leaflet-control{margin-bottom:10px}.leaflet-left .leaflet-control{margin-left:10px}.leaflet-right .leaflet-control{margin-right:10px}.leaflet-fade-anim .leaflet-popup{opacity:0;-webkit-transition:opacity .2s linear;-moz-transition:opacity .2s linear;transition:opacity .2s linear}.leaflet-fade-anim .leaflet-map-pane .leaflet-popup{opacity:1}.leaflet-zoom-animated{-webkit-transform-origin:0 0;-ms-transform-origin:0 0;transform-origin:0 0}svg.leaflet-zoom-animated{will-change:transform}.leaflet-zoom-anim .leaflet-zoom-animated{-webkit-transition:-webkit-transform .25s cubic-bezier(0,0,.25,1);-moz-transition:-moz-transform .25s cubic-bezier(0,0,.25,1);transition:transform .25s cubic-bezier(0,0,.25,1)}.leaflet-zoom-anim .leaflet-tile,.leaflet-pan-anim .leaflet-tile{-webkit-transition:none;-moz-transition:none;transition:none}.leaflet-zoom-anim .leaflet-zoom-hide{visibility:hidden}.leaflet-interactive{cursor:pointer}.leaflet-grab{cursor:-webkit-grab;cursor:-moz-grab;cursor:grab}.leaflet-crosshair,.leaflet-crosshair .leaflet-interactive{cursor:crosshair}.leaflet-popup-pane,.leaflet-control{cursor:auto}.leaflet-dragging .leaflet-grab,.leaflet-dragging .leaflet-grab .leaflet-interactive,.leaflet-dragging .leaflet-marker-draggable{cursor:move;cursor:-webkit-grabbing;cursor:-moz-grabbing;cursor:grabbing}.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-image-layer,.leaflet-pane>svg path,.leaflet-tile-container{pointer-events:none}.leaflet-marker-icon.leaflet-interactive,.leaflet-image-layer.leaflet-interactive,.leaflet-pane>svg path.leaflet-interactive,svg.leaflet-image-layer.leaflet-interactive path{pointer-events:visiblePainted;pointer-events:auto}.leaflet-container{background:#ddd;outline-offset:1px}.leaflet-container a{color:#0078a8}.leaflet-zoom-box{border:2px dotted #38f;background:#ffffff80}.leaflet-container{font-family:Helvetica Neue,Arial,Helvetica,sans-serif;font-size:12px;font-size:.75rem;line-height:1.5}.leaflet-bar{box-shadow:0 1px 5px #000000a6;border-radius:4px}.leaflet-bar a{background-color:#fff;border-bottom:1px solid #ccc;width:26px;height:26px;line-height:26px;display:block;text-align:center;text-decoration:none;color:#000}.leaflet-bar a,.leaflet-control-layers-toggle{background-position:50% 50%;background-repeat:no-repeat;display:block}.leaflet-bar a:hover,.leaflet-bar a:focus{background-color:#f4f4f4}.leaflet-bar a:first-child{border-top-left-radius:4px;border-top-right-radius:4px}.leaflet-bar a:last-child{border-bottom-left-radius:4px;border-bottom-right-radius:4px;border-bottom:none}.leaflet-bar a.leaflet-disabled{cursor:default;background-color:#f4f4f4;color:#bbb}.leaflet-touch .leaflet-bar a{width:30px;height:30px;line-height:30px}.leaflet-touch .leaflet-bar a:first-child{border-top-left-radius:2px;border-top-right-radius:2px}.leaflet-touch .leaflet-bar a:last-child{border-bottom-left-radius:2px;border-bottom-right-radius:2px}.leaflet-control-zoom-in,.leaflet-control-zoom-out{font:700 18px Lucida Console,Monaco,monospace;text-indent:1px}.leaflet-touch .leaflet-control-zoom-in,.leaflet-touch .leaflet-control-zoom-out{font-size:22px}.leaflet-control-layers{box-shadow:0 1px 5px #0006;background:#fff;border-radius:5px}.leaflet-control-layers-toggle{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAQAAAADQ4RFAAACf0lEQVR4AY1UM3gkARTePdvdoTxXKc+qTl3aU5U6b2Kbkz3Gtq3Zw6ziLGNPzrYx7946Tr6/ee/XeCQ4D3ykPtL5tHno4n0d/h3+xfuWHGLX81cn7r0iTNzjr7LrlxCqPtkbTQEHeqOrTy4Yyt3VCi/IOB0v7rVC7q45Q3Gr5K6jt+3Gl5nCoDD4MtO+j96Wu8atmhGqcNGHObuf8OM/x3AMx38+4Z2sPqzCxRFK2aF2e5Jol56XTLyggAMTL56XOMoS1W4pOyjUcGGQdZxU6qRh7B9Zp+PfpOFlqt0zyDZckPi1ttmIp03jX8gyJ8a/PG2yutpS/Vol7peZIbZcKBAEEheEIAgFbDkz5H6Zrkm2hVWGiXKiF4Ycw0RWKdtC16Q7qe3X4iOMxruonzegJzWaXFrU9utOSsLUmrc0YjeWYjCW4PDMADElpJSSQ0vQvA1Tm6/JlKnqFs1EGyZiFCqnRZTEJJJiKRYzVYzJck2Rm6P4iH+cmSY0YzimYa8l0EtTODFWhcMIMVqdsI2uiTvKmTisIDHJ3od5GILVhBCarCfVRmo4uTjkhrhzkiBV7SsaqS+TzrzM1qpGGUFt28pIySQHR6h7F6KSwGWm97ay+Z+ZqMcEjEWebE7wxCSQwpkhJqoZA5ivCdZDjJepuJ9IQjGGUmuXJdBFUygxVqVsxFsLMbDe8ZbDYVCGKxs+W080max1hFCarCfV+C1KATwcnvE9gRRuMP2prdbWGowm1KB1y+zwMMENkM755cJ2yPDtqhTI6ED1M/82yIDtC/4j4BijjeObflpO9I9MwXTCsSX8jWAFeHr05WoLTJ5G8IQVS/7vwR6ohirYM7f6HzYpogfS3R2OAAAAAElFTkSuQmCC);width:36px;height:36px}.leaflet-retina .leaflet-control-layers-toggle{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAQAAABvcdNgAAAEsklEQVR4AWL4TydIhpZK1kpWOlg0w3ZXP6D2soBtG42jeI6ZmQTHzAxiTbSJsYLjO9HhP+WOmcuhciVnmHVQcJnp7DFvScowZorad/+V/fVzMdMT2g9Cv9guXGv/7pYOrXh2U+RRR3dSd9JRx6bIFc/ekqHI29JC6pJ5ZEh1yWkhkbcFeSjxgx3L2m1cb1C7bceyxA+CNjT/Ifff+/kDk2u/w/33/IeCMOSaWZ4glosqT3DNnNZQ7Cs58/3Ce5HL78iZH/vKVIaYlqzfdLu8Vi7dnvUbEza5Idt36tquZFldl6N5Z/POLof0XLK61mZCmJSWjVF9tEjUluu74IUXvgttuVIHE7YxSkaYhJZam7yiM9Pv82JYfl9nptxZaxMJE4YSPty+vF0+Y2up9d3wwijfjZbabqm/3bZ9ecKHsiGmRflnn1MW4pjHf9oLufyn2z3y1D6n8g8TZhxyzipLNPnAUpsOiuWimg52psrTZYnOWYNDTMuWBWa0tJb4rgq1UvmutpaYEbZlwU3CLJm/ayYjHW5/h7xWLn9Hh1vepDkyf7dE7MtT5LR4e7yYpHrkhOUpEfssBLq2pPhAqoSWKUkk7EDqkmK6RrCEzqDjhNDWNE+XSMvkJRDWlZTmCW0l0PHQGRZY5t1L83kT0Y3l2SItk5JAWHl2dCOBm+fPu3fo5/3v61RMCO9Jx2EEYYhb0rmNQMX/vm7gqOEJLcXTGw3CAuRNeyaPWwjR8PRqKQ1PDA/dpv+on9Shox52WFnx0KY8onHayrJzm87i5h9xGw/tfkev0jGsQizqezUKjk12hBMKJ4kbCqGPVNXudyyrShovGw5CgxsRICxF6aRmSjlBnHRzg7Gx8fKqEubI2rahQYdR1YgDIRQO7JvQyD52hoIQx0mxa0ODtW2Iozn1le2iIRdzwWewedyZzewidueOGqlsn1MvcnQpuVwLGG3/IR1hIKxCjelIDZ8ldqWz25jWAsnldEnK0Zxro19TGVb2ffIZEsIO89EIEDvKMPrzmBOQcKQ+rroye6NgRRxqR4U8EAkz0CL6uSGOm6KQCdWjvjRiSP1BPalCRS5iQYiEIvxuBMJEWgzSoHADcVMuN7IuqqTeyUPq22qFimFtxDyBBJEwNyt6TM88blFHao/6tWWhuuOM4SAK4EI4QmFHA+SEyWlp4EQoJ13cYGzMu7yszEIBOm2rVmHUNqwAIQabISNMRstmdhNWcFLsSm+0tjJH1MdRxO5Nx0WDMhCtgD6OKgZeljJqJKc9po8juskR9XN0Y1lZ3mWjLR9JCO1jRDMd0fpYC2VnvjBSEFg7wBENc0R9HFlb0xvF1+TBEpF68d+DHR6IOWVv2BECtxo46hOFUBd/APU57WIoEwJhIi2CdpyZX0m93BZicktMj1AS9dClteUFAUNUIEygRZCtik5zSxI9MubTBH1GOiHsiLJ3OCoSZkILa9PxiN0EbvhsAo8tdAf9Seepd36lGWHmtNANTv5Jd0z4QYyeo/UEJqxKRpg5LZx6btLPsOaEmdMyxYdlc8LMaJnikDlhclqmPiQnTEpLUIZEwkRagjYkEibQErwhkTAKCLQEbUgkzJQWc/0PstHHcfEdQ+UAAAAASUVORK5CYII=);background-size:26px 26px}.leaflet-touch .leaflet-control-layers-toggle{width:44px;height:44px}.leaflet-control-layers .leaflet-control-layers-list,.leaflet-control-layers-expanded .leaflet-control-layers-toggle{display:none}.leaflet-control-layers-expanded .leaflet-control-layers-list{display:block;position:relative}.leaflet-control-layers-expanded{padding:6px 10px 6px 6px;color:#333;background:#fff}.leaflet-control-layers-scrollbar{overflow-y:scroll;overflow-x:hidden;padding-right:5px}.leaflet-control-layers-selector{margin-top:2px;position:relative;top:1px}.leaflet-control-layers label{display:block;font-size:13px;font-size:1.08333em}.leaflet-control-layers-separator{height:0;border-top:1px solid #ddd;margin:5px -10px 5px -6px}.leaflet-default-icon-path{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=)}.leaflet-container .leaflet-control-attribution{background:#fff;background:#fffc;margin:0}.leaflet-control-attribution,.leaflet-control-scale-line{padding:0 5px;color:#333;line-height:1.4}.leaflet-control-attribution a{text-decoration:none}.leaflet-control-attribution a:hover,.leaflet-control-attribution a:focus{text-decoration:underline}.leaflet-attribution-flag{display:inline!important;vertical-align:baseline!important;width:1em;height:.6669em}.leaflet-left .leaflet-control-scale{margin-left:5px}.leaflet-bottom .leaflet-control-scale{margin-bottom:5px}.leaflet-control-scale-line{border:2px solid #777;border-top:none;line-height:1.1;padding:2px 5px 1px;white-space:nowrap;-moz-box-sizing:border-box;box-sizing:border-box;background:#fffc;text-shadow:1px 1px #fff}.leaflet-control-scale-line:not(:first-child){border-top:2px solid #777;border-bottom:none;margin-top:-2px}.leaflet-control-scale-line:not(:first-child):not(:last-child){border-bottom:2px solid #777}.leaflet-touch .leaflet-control-attribution,.leaflet-touch .leaflet-control-layers,.leaflet-touch .leaflet-bar{box-shadow:none}.leaflet-touch .leaflet-control-layers,.leaflet-touch .leaflet-bar{border:2px solid rgba(0,0,0,.2);background-clip:padding-box}.leaflet-popup{position:absolute;text-align:center;margin-bottom:20px}.leaflet-popup-content-wrapper{padding:1px;text-align:left;border-radius:12px}.leaflet-popup-content{margin:13px 24px 13px 20px;line-height:1.3;font-size:13px;font-size:1.08333em;min-height:1px}.leaflet-popup-content p{margin:1.3em 0}.leaflet-popup-tip-container{width:40px;height:20px;position:absolute;left:50%;margin-top:-1px;margin-left:-20px;overflow:hidden;pointer-events:none}.leaflet-popup-tip{width:17px;height:17px;padding:1px;margin:-10px auto 0;pointer-events:auto;-webkit-transform:rotate(45deg);-moz-transform:rotate(45deg);-ms-transform:rotate(45deg);transform:rotate(45deg)}.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#fff;color:#333;box-shadow:0 3px 14px #0006}.leaflet-container a.leaflet-popup-close-button{position:absolute;top:0;right:0;border:none;text-align:center;width:24px;height:24px;font:16px/24px Tahoma,Verdana,sans-serif;color:#757575;text-decoration:none;background:transparent}.leaflet-container a.leaflet-popup-close-button:hover,.leaflet-container a.leaflet-popup-close-button:focus{color:#585858}.leaflet-popup-scrolled{overflow:auto}.leaflet-oldie .leaflet-popup-content-wrapper{-ms-zoom:1}.leaflet-oldie .leaflet-popup-tip{width:24px;margin:0 auto;-ms-filter:"progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)";filter:progid:DXImageTransform.Microsoft.Matrix(M11=.70710678,M12=.70710678,M21=-.70710678,M22=.70710678)}.leaflet-oldie .leaflet-control-zoom,.leaflet-oldie .leaflet-control-layers,.leaflet-oldie .leaflet-popup-content-wrapper,.leaflet-oldie .leaflet-popup-tip{border:1px solid #999}.leaflet-div-icon{background:#fff;border:1px solid #666}.leaflet-tooltip{position:absolute;padding:6px;background-color:#fff;border:1px solid #fff;border-radius:3px;color:#222;white-space:nowrap;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none;box-shadow:0 1px 3px #0006}.leaflet-tooltip.leaflet-interactive{cursor:pointer;pointer-events:auto}.leaflet-tooltip-top:before,.leaflet-tooltip-bottom:before,.leaflet-tooltip-left:before,.leaflet-tooltip-right:before{position:absolute;pointer-events:none;border:6px solid transparent;background:transparent;content:""}.leaflet-tooltip-bottom{margin-top:6px}.leaflet-tooltip-top{margin-top:-6px}.leaflet-tooltip-bottom:before,.leaflet-tooltip-top:before{left:50%;margin-left:-6px}.leaflet-tooltip-top:before{bottom:0;margin-bottom:-12px;border-top-color:#fff}.leaflet-tooltip-bottom:before{top:0;margin-top:-12px;margin-left:-6px;border-bottom-color:#fff}.leaflet-tooltip-left{margin-left:-6px}.leaflet-tooltip-right{margin-left:6px}.leaflet-tooltip-left:before,.leaflet-tooltip-right:before{top:50%;margin-top:-6px}.leaflet-tooltip-left:before{right:0;margin-right:-12px;border-left-color:#fff}.leaflet-tooltip-right:before{left:0;margin-left:-12px;border-right-color:#fff}@media print{.leaflet-control{-webkit-print-color-adjust:exact;print-color-adjust:exact}}', Ua = ":host{display:block;width:100%;height:400px;position:relative;border-radius:var(--border-radius-md, 8px);overflow:hidden;box-shadow:var(--shadow-sm, 0 1px 3px rgba(0,0,0,.1))}.ui-mapa-container{width:100%;height:100%;z-index:1}.leaflet-pane{z-index:400}.leaflet-top,.leaflet-bottom{z-index:1000}", he = {
  osm: {
    nome: "OpenStreetMap",
    layer: () => O.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    })
  },
  satelite: {
    nome: "Satélite (Esri)",
    layer: () => O.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
    })
  },
  topografia: {
    nome: "Topografia",
    layer: () => O.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    })
  },
  ruas: {
    nome: "Ruas (Esri)",
    layer: () => O.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012"
    })
  }
};
class ja extends HTMLElement {
  constructor() {
    super();
    m(this, "mapContainer");
    m(this, "mapInstance", null);
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>
        ${qo}
        ${Ua}
      </style>
      <div class="ui-mapa-container" id="map-container"></div>
      <div style="display: none;"><slot></slot></div>
    `, this.mapContainer = o.getElementById("map-container");
  }
  connectedCallback() {
    setTimeout(() => {
      this.initMap();
    }, 0);
  }
  disconnectedCallback() {
    this.mapInstance && (this.mapInstance.remove(), this.mapInstance = null);
  }
  initMap() {
    if (this.mapInstance) return;
    const o = parseFloat(this.getAttribute("lat") || "-23.550520"), s = parseFloat(this.getAttribute("lng") || "-46.633308"), r = parseInt(this.getAttribute("zoom") || "13", 10);
    this.mapInstance = O.map(this.mapContainer).setView([o, s], r);
    const d = this.getAttribute("camadas");
    let h = ["osm"];
    d && (h = d.split(",").map((f) => f.trim().toLowerCase()).filter((f) => he[f]), h.length === 0 && (h = ["osm"]));
    const p = he[h[0]].layer();
    if (p.addTo(this.mapInstance), h.length > 1) {
      const f = {};
      f[he[h[0]].nome] = p;
      for (let b = 1; b < h.length; b++) {
        const y = h[b];
        f[he[y].nome] = he[y].layer();
      }
      O.control.layers(f, void 0, { position: "topright" }).addTo(this.mapInstance);
    }
    O.Icon.Default.imagePath = "https://unpkg.com/leaflet@1.9.4/dist/images/", setTimeout(() => {
      this.mapInstance && this.mapInstance.invalidateSize();
    }, 100);
  }
  getMap() {
    return this.mapInstance;
  }
}
customElements.get("ui-mapa") || customElements.define("ui-mapa", ja);
class Ya extends HTMLElement {
  constructor() {
    super(...arguments);
    m(this, "marker", null);
  }
  static get observedAttributes() {
    return ["lat", "lng", "titulo"];
  }
  connectedCallback() {
    setTimeout(() => this.initMarker(), 0);
  }
  disconnectedCallback() {
    this.marker && (this.marker.remove(), this.marker = null);
  }
  attributeChangedCallback(o, s, r) {
    if (s !== r && this.marker) {
      if (o === "lat" || o === "lng") {
        const d = parseFloat(this.getAttribute("lat") || "0"), h = parseFloat(this.getAttribute("lng") || "0");
        this.marker.setLatLng([d, h]);
      }
      o === "titulo" && (this.marker.unbindPopup(), r && this.marker.bindPopup(r));
    }
  }
  initMarker() {
    const o = this.closest("ui-mapa");
    if (!o) {
      console.warn("<ui-mapa-marcador> deve estar dentro de um elemento <ui-mapa>");
      return;
    }
    const s = o.getMap();
    if (!s) {
      setTimeout(() => this.initMarker(), 50);
      return;
    }
    const r = parseFloat(this.getAttribute("lat") || "0"), d = parseFloat(this.getAttribute("lng") || "0"), h = this.getAttribute("titulo");
    this.marker = O.marker([r, d]), h && this.marker.bindPopup(h), this.marker.addTo(s);
  }
}
customElements.get("ui-mapa-marcador") || customElements.define("ui-mapa-marcador", Ya);
class Ka extends HTMLElement {
  constructor() {
    super(...arguments);
    m(this, "polyline", null);
  }
  static get observedAttributes() {
    return ["pontos", "cor", "espessura"];
  }
  connectedCallback() {
    setTimeout(() => this.initLinha(), 0);
  }
  disconnectedCallback() {
    this.polyline && (this.polyline.remove(), this.polyline = null);
  }
  attributeChangedCallback(o, s, r) {
    s !== r && this.polyline && (o === "pontos" ? this.polyline.setLatLngs(this.getPontos()) : (o === "cor" || o === "espessura") && this.polyline.setStyle({
      color: this.getAttribute("cor") || "#3388ff",
      weight: parseInt(this.getAttribute("espessura") || "3", 10)
    }));
  }
  getPontos() {
    try {
      const o = this.getAttribute("pontos");
      if (o)
        return JSON.parse(o);
    } catch (o) {
      console.error('Formato inválido para atributo pontos no <ui-mapa-linha>. Deve ser um JSON array, ex: "[[lat, lng], ...]"', o);
    }
    return [];
  }
  initLinha() {
    const o = this.closest("ui-mapa");
    if (!o) {
      console.warn("<ui-mapa-linha> deve estar dentro de um elemento <ui-mapa>");
      return;
    }
    const s = o.getMap();
    if (!s) {
      setTimeout(() => this.initLinha(), 50);
      return;
    }
    const r = this.getAttribute("cor") || "#3388ff", d = parseInt(this.getAttribute("espessura") || "3", 10);
    this.polyline = O.polyline(this.getPontos(), {
      color: r,
      weight: d
    }), this.polyline.addTo(s);
  }
}
customElements.get("ui-mapa-linha") || customElements.define("ui-mapa-linha", Ka);
const Xa = ':host{display:block;width:100%;height:520px;position:relative;border-radius:var(--ui-radius-lg, 10px);overflow:hidden;box-shadow:0 10px 30px -5px #0009;border:1px solid rgba(255,255,255,.1);background:#080d0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,sans-serif;user-select:none;-webkit-user-select:none}*,*:before,*:after{box-sizing:border-box}.cad-root{position:relative;width:100%;height:100%;display:flex;overflow:hidden}.cad-map-container{width:100%;height:100%;background:#080d0a;z-index:1}.qgis-layer-panel{position:absolute;top:12px;left:12px;z-index:1000;width:290px;max-height:calc(100% - 24px);background:#0a120eeb;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.15);border-radius:8px;box-shadow:0 20px 40px #000000b3;display:flex;flex-direction:column;transition:transform .25s cubic-bezier(.16,1,.3,1),opacity .25s ease;overflow:hidden}.qgis-layer-panel.collapsed{transform:translate(-310px);opacity:0;pointer-events:none}.layer-panel-header{padding:10px 14px;background:#ffffff08;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between}.layer-panel-title{font-size:12px;font-weight:700;letter-spacing:.5px;color:#00f5a0;display:flex;align-items:center;gap:6px;text-transform:uppercase}.layer-panel-close{background:transparent;border:none;color:#ffffff80;cursor:pointer;padding:2px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:all .15s}.layer-panel-close:hover{color:#fff;background:#ffffff1a}.layer-panel-body{padding:10px 14px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;max-height:400px}.layer-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#ffffff73;margin-bottom:2px;padding:0 4px 4px;border-bottom:1px solid rgba(255,255,255,.12)}.layer-item{background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.08);border-radius:0;padding:10px 4px;display:flex;flex-direction:column;gap:7px;transition:background .15s ease}.layer-item:last-child{border-bottom:none}.layer-item:hover{background:#ffffff08;border-radius:4px}.layer-item-row{display:flex;align-items:center;justify-content:space-between}.layer-item-label{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:600;color:#ffffffe6;cursor:pointer;-webkit-user-select:none;user-select:none}.layer-chk-visibility{-moz-appearance:none;appearance:none;-webkit-appearance:none;width:16px;height:16px;border:1.5px solid rgba(255,255,255,.35);border-radius:4px;background:#0006;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;position:relative;transition:all .15s ease;flex-shrink:0;margin:0}.layer-chk-visibility:hover{border-color:#00f5a0}.layer-chk-visibility:checked{background:#00f5a0;border-color:#00f5a0}.layer-chk-visibility:checked:after{content:"";width:4px;height:8px;border:solid #04150c;border-width:0 2px 2px 0;transform:rotate(45deg) translate(-.5px,-1px);display:block}.layer-item-actions{display:flex;align-items:center;gap:6px}.btn-layer-action{background:transparent;border:none;color:#fff6;cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:all .15s}.btn-layer-action:hover{color:#00f5a0;background:#ffffff14}.btn-layer-action.active{color:#f43f5e;background:#f43f5e26}.layer-controls-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:10px;color:#ffffff80;padding-left:26px}.layer-opacity-slider{flex:1;height:4px;border-radius:2px;background:#ffffff26;accent-color:#00f5a0;cursor:pointer}.scale-mode-pill{font-size:9px;font-weight:600;padding:2px 7px;border-radius:10px;background:#ffffff0f;color:#ffffffb3;cursor:pointer;border:1px solid rgba(255,255,255,.1);transition:all .15s}.scale-mode-pill:hover{border-color:#00f5a0;color:#00f5a0;background:#00f5a01a}.cad-quick-toolbar{position:absolute;top:12px;right:12px;z-index:1000;display:flex;flex-direction:column;gap:6px;background:#0c1510eb;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:5px;box-shadow:0 10px 25px -5px #0009}.cad-btn-tool{background:transparent;border:none;color:#fff9;cursor:pointer;padding:7px;border-radius:5px;display:flex;align-items:center;justify-content:center;transition:all .15s}.cad-btn-tool:hover{background:#ffffff1a;color:#fff}.cad-btn-tool.active{background:#00f5a026;color:#00f5a0;border:1px solid rgba(0,245,160,.3)}.cad-selection-box{pointer-events:none;box-sizing:border-box}.custom-leaflet-marker{cursor:pointer}.custom-leaflet-marker:hover{filter:brightness(1.25);transform:scale(1.15);transition:transform .15s ease}.compact-popup .leaflet-popup-content-wrapper{background:#0a120ef2!important;-webkit-backdrop-filter:blur(16px)!important;backdrop-filter:blur(16px)!important;border:1px solid rgba(255,255,255,.15)!important;border-radius:8px!important;color:#fff!important;padding:0!important}.compact-popup .leaflet-popup-content{margin:10px 12px!important}.compact-popup .leaflet-popup-tip{background:#0a120ef2!important;border:1px solid rgba(255,255,255,.15)!important}', Bo = {
  perimetroWeight: 1,
  fechamentoWeight: 1,
  vizinhoWeight: 1,
  bancoWeight: 1,
  markerSizeBase: 10,
  markerStyleM: "circle-dot",
  markerSizeM: 14,
  markerStyleP: "circle",
  markerSizeP: 10,
  markerStyleV: "cross",
  markerSizeV: 8,
  enableAnimations: !1,
  preferCanvas: !0,
  crosshair: !1,
  satOpacity: 1,
  magnetSnap: !1
}, Rt = class Rt {
  constructor() {
    m(this, "config");
    this.config = this.loadConfig();
  }
  static getInstance() {
    return Rt.instance || (Rt.instance = new Rt()), Rt.instance;
  }
  loadConfig() {
    try {
      const c = typeof localStorage < "u" ? localStorage.getItem("gerencigeo_mapa_config") : null;
      if (c)
        return { ...Bo, ...JSON.parse(c) };
    } catch (c) {
      console.error("Erro ao carregar configurações do mapa", c);
    }
    return { ...Bo };
  }
  saveConfig(c) {
    this.config = { ...this.config, ...c }, typeof localStorage < "u" && localStorage.setItem("gerencigeo_mapa_config", JSON.stringify(this.config));
  }
  getConfig() {
    return this.config = this.loadConfig(), { ...this.config };
  }
};
m(Rt, "instance");
let fi = Rt;
const $ = (M) => M == null ? "" : String(M).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"), ds = (M, c = 3) => M == null || isNaN(M) ? "—" : M.toLocaleString("pt-BR", {
  minimumFractionDigits: c,
  maximumFractionDigits: c
});
class Ja {
  constructor(c) {
    m(this, "map", null);
    m(this, "configManager", fi.getInstance());
    m(this, "config", this.configManager.getConfig());
    m(this, "apiBaseUrl", "/api");
    m(this, "bancoPontosGroup", O.layerGroup());
    m(this, "pontosVizinhosGroup", O.layerGroup());
    m(this, "controller");
    m(this, "containerElement", null);
    this.controller = c;
  }
  init(c) {
    this.map && (this.map.remove(), this.map = null);
    const o = typeof c == "string" ? document.getElementById(c) : c;
    return o ? (this.containerElement = o, this.map = O.map(o, {
      maxZoom: 24,
      scrollWheelZoom: !0,
      preferCanvas: this.config.preferCanvas !== void 0 ? this.config.preferCanvas : !0,
      zoomControl: !1
      // O controle de zoom é gerenciado pelo CAD ou scroll
    }).setView([-23.7661, -53.3204], 14), this.listenConfigBroadcast(), this.applyMapStyles(), O.control.scale({
      metric: !0,
      imperial: !1,
      position: "bottomleft"
    }).addTo(this.map), this.map.on("click", (s) => {
      if (this.controller.modoCliqueSequencialAtivo)
        return;
      if (this.controller.canvasInteracao && this.controller.canvasInteracao.selectionHappened) {
        this.controller.canvasInteracao.selectionHappened = !1;
        return;
      }
      (this.controller.layerManager ? this.controller.layerManager.isLayerActiveAndSelectable("sigef") : !1) && this.consultarSigef(s);
    }), setTimeout(() => {
      this.invalidateSize();
    }, 250), this.map) : null;
  }
  invalidateSize() {
    if (this.map)
      try {
        this.map.invalidateSize();
      } catch {
      }
  }
  applyMapStyles() {
    const c = this.containerElement || document.getElementById("mapa-triagem");
    c && (this.config.crosshair ? c.style.cursor = "crosshair" : c.style.cursor = "");
  }
  listenConfigBroadcast() {
    if (!(typeof BroadcastChannel > "u"))
      try {
        const c = new BroadcastChannel("gerencigeo_map_config");
        c.onmessage = (o) => {
          o.data === "RELOAD_REQUIRED" && (this.config = this.configManager.getConfig(), this.applyMapStyles(), window.dispatchEvent(new CustomEvent("gerencigeo:map_config_changed", { detail: this.config })));
        };
      } catch {
      }
  }
  preCarregarTilesRegiao(c) {
    if (!this.map) return;
    const o = this.map.getZoom(), s = Math.max(Math.floor(o) - 2, 10), r = Math.min(Math.floor(o) + 3, 20), d = c.pad(0.5), h = ["mt0", "mt1", "mt2", "mt3"];
    let p = 0;
    const f = 300;
    for (let b = s; b <= r && p < f; b++) {
      const y = d.getNorthWest(), v = d.getSouthEast(), E = this.lonToTileX(y.lng, b), z = this.lonToTileX(v.lng, b), C = this.latToTileY(y.lat, b), k = this.latToTileY(v.lat, b);
      for (let w = E; w <= z && p < f; w++)
        for (let A = C; A <= k && p < f; A++) {
          const V = `https://${h[(w + A) % h.length]}.google.com/vt/lyrs=s,h&x=${w}&y=${A}&z=${b}`, U = new Image();
          U.src = V, p++;
        }
    }
  }
  lonToTileX(c, o) {
    return Math.floor((c + 180) / 360 * Math.pow(2, o));
  }
  latToTileY(c, o) {
    const s = c * Math.PI / 180;
    return Math.floor(
      (1 - Math.log(Math.tan(s) + 1 / Math.cos(s)) / Math.PI) / 2 * Math.pow(2, o)
    );
  }
  async consultarSigef(c) {
    if (!this.map) return;
    const o = this.map.getSize(), s = this.map.getBounds(), r = s.getSouthWest(), d = s.getNorthEast(), h = `${r.lng},${r.lat},${d.lng},${d.lat}`, p = Math.round(this.map.layerPointToContainerPoint(c.layerPoint).x), f = Math.round(this.map.layerPointToContainerPoint(c.layerPoint).y), b = `https://acervofundiario.incra.gov.br/i3geo/ogc.php?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FORMAT=image/png&TRANSPARENT=true&QUERY_LAYERS=certificada_sigef_particular_pr&LAYERS=certificada_sigef_particular_pr&INFO_FORMAT=application/json&X=${p}&Y=${f}&WIDTH=${o.x}&HEIGHT=${o.y}&SRS=EPSG:4326&BBOX=${h}`, y = this.map.getContainer();
    y.style.cursor = "wait";
    const v = O.popup({
      className: "compact-sigef-popup",
      maxWidth: 250
    }).setLatLng(c.latlng).setContent(`
        <div style="font-family:sans-serif; display:flex; align-items:center; gap:8px; color:#555; font-size:12px;">
          <svg style="animation:spin 1s linear infinite; width:14px; height:14px; flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="#ccc" stroke-width="4" fill="none"></circle>
            <path fill="#10b981" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Consultando SIGEF...
        </div>
      `).openOn(this.map);
    try {
      const z = typeof window < "u" && (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1") || window.location.origin.includes("[::1]")) ? `${this.apiBaseUrl}/proxy/sigef?url=${encodeURIComponent(b)}` : `${window.location.origin}/api.php?action=proxy_sigef&url=${encodeURIComponent(b)}`, C = await fetch(z);
      let k = null;
      if (C.ok) {
        const w = await C.text();
        try {
          k = JSON.parse(w);
        } catch {
          k = null;
        }
      }
      if (k && k.features && k.features.length > 0) {
        const w = k.features[0], A = w.properties, H = w.id || A.parcela_codigo || A.co_parcela || A.id_parcela;
        if (H) {
          const V = `https://sigef.incra.gov.br/geo/exportar/parcela/shp/${H}/`, U = `https://sigef.incra.gov.br/geo/parcela/detalhe/${H}/`, T = `
            <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.4; min-width:180px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; padding-bottom:5px; border-bottom:1px solid rgba(255, 255, 255, 0.1);">
                <span style="font-weight:700; font-size:11px; color:#10b981; text-transform:uppercase; letter-spacing:0.5px;">SIGEF</span>
                <span style="font-size:10px; color:rgba(255, 255, 255, 0.5);">${$(A.situacao_informada || A.status || "Certificada")}</span>
              </div>
              <div style="font-weight:700; font-size:12px; margin-bottom:4px; color:#ffffff; word-break:break-word;">${$(A.nome_area || A.nome_imovel || "Imóvel Sem Nome")}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.7); margin-bottom:2px;">Cód: <span style="font-family:monospace;">${$(A.codigo_imovel || "N/A")}</span></div>
              <div style="display:flex; gap:12px; font-size:11px; color:rgba(255, 255, 255, 0.7); margin-bottom:6px;">
                <span>Mat: <strong style="color:#ffffff;">${$(A.registro_matricula || A.matricula || "N/A")}</strong></span>
                <span>${$(A.data_submissao || "")}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:5px; padding-top:6px; border-top:1px solid rgba(255, 255, 255, 0.1);">
                <a href="${V}" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:5px; padding:5px 8px; background:rgba(16, 185, 129, 0.15); border:1px solid rgba(16, 185, 129, 0.3); color:#34d399; font-size:11px; font-weight:700; border-radius:5px; text-decoration:none; cursor:pointer;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Baixar Shapefile
                </a>
                <button onclick="window.dispatchEvent(new CustomEvent('gerencigeo:importar_vizinho_sigef', { detail: { uuid: '${H}', nome: '${(A.nome_area || A.nome_imovel || "Imóvel").replace(/'/g, "\\'")}' } }))" style="display:flex; align-items:center; justify-content:center; gap:5px; padding:5px 8px; background:rgba(14, 165, 233, 0.15); border:1px solid rgba(14, 165, 233, 0.3); color:#38bdf8; font-size:11px; font-weight:700; border-radius:5px; cursor:pointer; width:100%; text-align:center;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Importar Confrontante (CSV)
                </button>
                <a href="${U}" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:4px; padding:4px 6px; background:rgba(255, 255, 255, 0.05); border:1px solid rgba(255, 255, 255, 0.1); color:rgba(255, 255, 255, 0.7); font-size:10px; font-weight:600; border-radius:5px; text-decoration:none; cursor:pointer;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Abrir no SIGEF
                </a>
              </div>
            </div>
          `;
          v.setContent(T);
        } else
          v.setContent(`
            <div style="font-family:sans-serif; font-size:12px; color:#b45309; padding:2px 0;">
              Lote identificado, mas código da parcela indisponível.
            </div>
          `);
      } else
        v.setContent(`
          <div style="font-family:sans-serif; font-size:12px; color:rgba(255, 255, 255, 0.7); padding:2px 0;">
            Nenhum imóvel SIGEF certificado neste ponto.
          </div>
        `);
    } catch (E) {
      console.warn("Erro ao consultar SIGEF:", E), v.setContent(`
        <div style="font-family:sans-serif; font-size:12px; color:#f59e0b; padding:2px 0;">
          Serviço de consulta SIGEF indisponível nesta área.
        </div>
      `);
    } finally {
      y.style.cursor = "";
    }
  }
}
class Qa {
  constructor(c) {
    m(this, "ctx");
    m(this, "map", null);
    m(this, "mapContainer", null);
    // Estados de Pan (Rodinha)
    m(this, "isPanning", !1);
    m(this, "lastMousePos", { x: 0, y: 0 });
    // Estados de Seleção (Clique Esquerdo)
    m(this, "isSelecting", !1);
    m(this, "selectStartPos", { x: 0, y: 0 });
    m(this, "selectStartPoint", null);
    m(this, "selectionDiv", null);
    // Tempo do último clique do botão do meio
    m(this, "lastMiddleClickTime", 0);
    // Sinaliza que uma caixa de seleção foi arrastada
    m(this, "selectionHappened", !1);
    m(this, "handleContextMenu", (c) => {
      c.preventDefault();
    });
    m(this, "handleMouseDown", (c) => {
      if (!(!this.map || !this.mapContainer)) {
        if (c.button === 1) {
          c.preventDefault();
          const o = Date.now();
          if (o - this.lastMiddleClickTime < 300) {
            this.zoomExtents();
            return;
          }
          this.lastMiddleClickTime = o, this.isPanning = !0, this.lastMousePos = { x: c.clientX, y: c.clientY }, this.mapContainer.style.cursor = "grabbing";
          return;
        }
        if (c.button === 0) {
          if (this.ctx.mapaController && this.ctx.mapaController.modoCliqueSequencialAtivo)
            return;
          const o = this.mapContainer.getBoundingClientRect(), s = c.clientX - o.left, r = c.clientY - o.top;
          this.isSelecting = !0, this.selectStartPos = { x: s, y: r }, this.selectStartPoint = this.map.mouseEventToContainerPoint(c), this.selectionDiv && (this.selectionDiv.style.left = `${s}px`, this.selectionDiv.style.top = `${r}px`, this.selectionDiv.style.width = "0px", this.selectionDiv.style.height = "0px", this.selectionDiv.style.display = "block"), ["verticesPane", "perimetroPane", "overlayPane", "pane-vertices", "pane-perimetro", "pane-vizinhos"].forEach((h) => {
            var f;
            const p = (f = this.map) == null ? void 0 : f.getPane(h);
            p && (p.style.pointerEvents = "none");
          });
        }
      }
    });
    m(this, "handleMouseMove", (c) => {
      if (!(!this.map || !this.mapContainer)) {
        if (this.isPanning) {
          const o = this.lastMousePos.x - c.clientX, s = this.lastMousePos.y - c.clientY;
          this.map.panBy([o, s], { animate: !1 }), this.lastMousePos = { x: c.clientX, y: c.clientY };
          return;
        }
        if (this.isSelecting && this.selectionDiv) {
          const o = this.mapContainer.getBoundingClientRect(), s = c.clientX - o.left, r = c.clientY - o.top, d = Math.abs(s - this.selectStartPos.x), h = Math.abs(r - this.selectStartPos.y), p = Math.min(s, this.selectStartPos.x), f = Math.min(r, this.selectStartPos.y);
          this.selectionDiv.style.left = `${p}px`, this.selectionDiv.style.top = `${f}px`, this.selectionDiv.style.width = `${d}px`, this.selectionDiv.style.height = `${h}px`, s >= this.selectStartPos.x ? (this.selectionDiv.style.background = "rgba(14, 116, 144, 0.22)", this.selectionDiv.style.border = "1.5px solid #06b6d4") : (this.selectionDiv.style.background = "rgba(16, 185, 129, 0.22)", this.selectionDiv.style.border = "1.5px dashed #10b981");
        }
      }
    });
    m(this, "handleMouseUp", (c) => {
      var o, s, r, d, h, p;
      if (this.isPanning && (this.isPanning = !1, this.mapContainer && (this.mapContainer.style.cursor = "grab")), this.isSelecting) {
        if (this.isSelecting = !1, this.selectionDiv && (this.selectionDiv.style.display = "none"), !this.map || !this.mapContainer) return;
        this.map.closePopup(), setTimeout(() => {
          this.ctx.layerManager && this.ctx.layerManager.ensurePanes();
        }, 80);
        const f = this.mapContainer.getBoundingClientRect(), b = c.clientX - f.left, y = c.clientY - f.top, v = this.map.mouseEventToContainerPoint(c), E = Math.abs(b - this.selectStartPos.x), z = Math.abs(y - this.selectStartPos.y);
        if (E < 4 && z < 4) {
          const T = c.target;
          T && ((o = T.classList) != null && o.contains("leaflet-container") || T.id === "mapa-triagem" || (s = T.closest) != null && s.call(T, ".leaflet-pane")) && ((r = T.closest) != null && r.call(T, ".custom-leaflet-marker") || (d = T.closest) != null && d.call(T, ".custom-div-icon") || this.limparSelecao());
          return;
        }
        this.selectionHappened = !0;
        const C = {
          x1: Math.min(this.selectStartPoint.x, v.x),
          y1: Math.min(this.selectStartPoint.y, v.y),
          x2: Math.max(this.selectStartPoint.x, v.x),
          y2: Math.max(this.selectStartPoint.y, v.y)
        }, k = ((h = this.ctx.mapaController) == null ? void 0 : h.getMarkers()) || [], w = ((p = this.ctx.mapaController) == null ? void 0 : p.getVizinhosMarkers()) || [], A = [], H = [], V = !this.ctx.layerManager || this.ctx.layerManager.isLayerActiveAndSelectable("vertices"), U = !this.ctx.layerManager || this.ctx.layerManager.isLayerActiveAndSelectable("vizinhos");
        V && k.forEach((T) => {
          const it = T.pontoId;
          if (!it) return;
          const J = this.map.latLngToContainerPoint(T.getLatLng());
          J.x >= C.x1 && J.x <= C.x2 && J.y >= C.y1 && J.y <= C.y2 && A.push(it);
        }), U && w.forEach((T) => {
          const it = T.pontoId;
          if (!it) return;
          const J = this.map.latLngToContainerPoint(T.getLatLng());
          J.x >= C.x1 && J.x <= C.x2 && J.y >= C.y1 && J.y <= C.y2 && H.push(it);
        }), c.ctrlKey || c.metaKey ? (A.forEach((T) => {
          this.ctx.selectedPontoIds.includes(T) ? this.ctx.selectedPontoIds = this.ctx.selectedPontoIds.filter((it) => it !== T) : this.ctx.selectedPontoIds.push(T);
        }), H.forEach((T) => {
          this.ctx.selectedVizinhoPontoIds.includes(T) ? this.ctx.selectedVizinhoPontoIds = this.ctx.selectedVizinhoPontoIds.filter((it) => it !== T) : this.ctx.selectedVizinhoPontoIds.push(T);
        })) : (this.ctx.selectedPontoIds = A, this.ctx.selectedVizinhoPontoIds = H), this.ctx.selectedPontoIds.length > 0 && (this.ctx.lastSelectedPontoId = this.ctx.selectedPontoIds[this.ctx.selectedPontoIds.length - 1]), this.notificarSelecao();
      }
    });
    m(this, "handleKeyDown", (c) => {
      c.key === "Escape" && this.limparSelecao();
    });
    this.ctx = {
      selectedPontoIds: [],
      selectedVizinhoPontoIds: [],
      lastSelectedPontoId: null,
      pontosList: [],
      ...c
    };
  }
  ativar(c, o) {
    if (this.ctx.mapaController = c, o && (this.ctx.containerHost = o), this.map = c.getMap(), !!this.map && (this.mapContainer = this.map.getContainer(), !!this.mapContainer)) {
      if (this.map.dragging.disable(), this.map.doubleClickZoom.disable(), !this.selectionDiv) {
        this.selectionDiv = document.createElement("div"), this.selectionDiv.className = "cad-selection-box", this.selectionDiv.style.position = "absolute", this.selectionDiv.style.zIndex = "9999", this.selectionDiv.style.pointerEvents = "none", this.selectionDiv.style.display = "none", this.selectionDiv.style.borderRadius = "2px";
        const s = this.mapContainer;
        s.style.position = "relative", s.appendChild(this.selectionDiv);
      }
      this.mapContainer.addEventListener("mousedown", this.handleMouseDown), this.mapContainer.addEventListener("mousemove", this.handleMouseMove), window.addEventListener("mouseup", this.handleMouseUp), this.mapContainer.addEventListener("contextmenu", this.handleContextMenu), window.addEventListener("keydown", this.handleKeyDown);
    }
  }
  desativar() {
    this.mapContainer && (this.mapContainer.removeEventListener("mousedown", this.handleMouseDown), this.mapContainer.removeEventListener("mousemove", this.handleMouseMove), this.mapContainer.removeEventListener("contextmenu", this.handleContextMenu)), window.removeEventListener("mouseup", this.handleMouseUp), window.removeEventListener("keydown", this.handleKeyDown), this.selectionDiv && this.selectionDiv.parentNode && (this.selectionDiv.parentNode.removeChild(this.selectionDiv), this.selectionDiv = null), this.map && (this.map.dragging.enable(), this.map.doubleClickZoom.enable());
  }
  limparSelecao() {
    (this.ctx.selectedPontoIds.length > 0 || this.ctx.selectedVizinhoPontoIds.length > 0) && (this.ctx.selectedPontoIds = [], this.ctx.selectedVizinhoPontoIds = [], this.ctx.lastSelectedPontoId = null, this.notificarSelecao());
  }
  notificarSelecao() {
    this.ctx.atualizarDestaqueLinhasTabela && this.ctx.atualizarDestaqueLinhasTabela(), this.ctx.onSelectionChange && this.ctx.onSelectionChange(this.ctx.selectedPontoIds, this.ctx.selectedVizinhoPontoIds), window.dispatchEvent(new CustomEvent("gerencigeo:ponto-selecionado", {
      detail: {
        selectedPontoIds: this.ctx.selectedPontoIds,
        selectedVizinhoPontoIds: this.ctx.selectedVizinhoPontoIds,
        lastSelectedPontoId: this.ctx.lastSelectedPontoId
      }
    }));
  }
  zoomExtents() {
    if (!this.ctx.pontosList || this.ctx.pontosList.length === 0) return;
    const c = this.ctx.pontosList.filter((o) => o.tipo_ponto !== "B" && o.tipo !== "B");
    c.length > 0 && this.ctx.mapaController && this.ctx.mapaController.fitBounds(c);
  }
  destroy() {
    this.desativar();
  }
}
class dt {
  static register(c, o) {
    this.renderers.set(c.toLowerCase(), o);
  }
  static get(c) {
    return this.renderers.get(c.toLowerCase());
  }
  static has(c) {
    return this.renderers.has(c.toLowerCase());
  }
  static getRegisteredTypes() {
    return Array.from(this.renderers.keys());
  }
}
m(dt, "renderers", /* @__PURE__ */ new Map());
class ts {
  render(c, o, s) {
    var f, b, y;
    const r = ((f = c.dados) == null ? void 0 : f.url) || "https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}", d = ((b = c.dados) == null ? void 0 : b.subdomains) || ["mt0", "mt1", "mt2", "mt3"], h = ((y = c.dados) == null ? void 0 : y.attribution) || "Google Satélite";
    return O.tileLayer(r, {
      maxZoom: 24,
      maxNativeZoom: 20,
      subdomains: d,
      attribution: h,
      keepBuffer: 16,
      updateWhenZooming: !1,
      updateWhenIdle: !0,
      className: "smooth-zoom-layer",
      opacity: c.opacidade !== void 0 ? c.opacidade : 1,
      pane: `pane-${c.id}`
    });
  }
  update(c, o, s) {
    o instanceof O.TileLayer && s.opacidade !== void 0 && o.setOpacity(s.opacidade);
  }
  destroy(c, o) {
    o.hasLayer(c) && o.removeLayer(c);
  }
}
class es {
  render(c, o, s) {
    var b, y, v, E;
    const r = ((b = c.dados) == null ? void 0 : b.url) || "https://acervofundiario.incra.gov.br/i3geo/ogc.php", d = ((y = c.dados) == null ? void 0 : y.layers) || "certificada_sigef_particular_pr", h = ((v = c.dados) == null ? void 0 : v.format) || "image/png", p = ((E = c.dados) == null ? void 0 : E.attribution) || "INCRA/SIGEF";
    return O.tileLayer.wms(r, {
      layers: d,
      format: h,
      transparent: !0,
      version: "1.1.1",
      pane: `pane-${c.id}`,
      attribution: p,
      className: "sigef-wms-layer",
      keepBuffer: 8,
      updateWhenZooming: !1,
      updateWhenIdle: !0,
      opacity: c.opacidade !== void 0 ? c.opacidade : 0.85
    });
  }
  update(c, o, s) {
    o instanceof O.TileLayer.WMS && s.opacidade !== void 0 && o.setOpacity(s.opacidade);
  }
  destroy(c, o) {
    o.hasLayer(c) && o.removeLayer(c);
  }
}
class is {
  constructor() {
    m(this, "zoomListenerMap", /* @__PURE__ */ new WeakMap());
  }
  render(c, o, s) {
    const r = O.layerGroup(), d = `pane-${c.id}`;
    this.rebuildLines(c, r, o, s, d);
    const h = () => {
      c.estilo.scaleMode === "world" && (r.clearLayers(), this.rebuildLines(c, r, o, s, d));
    };
    return o.on("zoomend", h), this.zoomListenerMap.set(r, h), r;
  }
  calculateWeight(c, o, s) {
    const r = c.estilo.espessuraLinha || s.config.perimetroWeight || 2, d = s.graphicScale.lineScaleMultiplier || 1;
    if (c.estilo.scaleMode === "world") {
      const h = c.estilo.dimensaoMetros || 0.3, p = o.getCenter(), f = o.getZoom(), b = 40075016686e-3 * Math.abs(Math.cos(p.lat * Math.PI / 180)) / Math.pow(2, f + 8), y = h / (b > 0 ? b : 1);
      return Math.max(1, Math.round(y * d));
    }
    return Math.max(1, Math.round(r * d));
  }
  rebuildLines(c, o, s, r, d) {
    var v, E;
    const h = ((v = c.dados) == null ? void 0 : v.segmentos) || r.segmentos || [], p = ((E = c.dados) == null ? void 0 : E.pontos) || r.pontos || [], f = this.calculateWeight(c, s, r), b = c.opacidade !== void 0 ? c.opacidade : 1, y = c.interativo && !c.bloqueada;
    if (h && h.length > 0)
      h.forEach((z) => {
        const C = p.find((w) => String(w.id) === String(z.ponto_inicio_id)), k = p.find((w) => String(w.id) === String(z.ponto_fim_id));
        if (C && k && C.lat && C.lon && k.lat && k.lon) {
          const w = z.tipo_limite_sigef || z.tipo_limite || "", A = z.metodo_posicionamento_sigef || z.metodo_posicionamento || "", H = w === "LA1" ? "#10b981" : w === "LN1" ? "#3b82f6" : "#00f5a0", V = c.estilo.corPrimaria || H, U = O.polyline([[C.lat, C.lon], [k.lat, k.lon]], {
            color: V,
            weight: f,
            opacity: b,
            dashArray: w === "LN1" ? "6, 6" : c.estilo.dashArray,
            pane: d,
            interactive: y
          });
          y && U.bindPopup(`
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
                <div style="font-weight:700; font-size:12px; margin-bottom:3px; color:#ffffff;">${$(C.nome_vertice)} ↔ ${$(k.nome_vertice)}</div>
                <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Limite: ${$(w || "N/A")} · ${$(A || "N/A")}</div>
              </div>
            `, {
            className: "compact-popup",
            maxWidth: 220
          }), U.addTo(o);
        }
      });
    else if (p && p.length >= 2) {
      const z = p.filter(
        (w) => w.lat && w.lon && w.lat !== 0 && w.lon !== 0 && w.tipo_ponto !== "B" && w.tipo !== "B" && w.ignorar_poligono !== 1
      ), C = {};
      z.forEach((w) => {
        const A = w.matricula_id != null ? `mat_${w.matricula_id}` : w.planilha_origem || "default";
        C[A] || (C[A] = []), C[A].push(w);
      });
      const k = c.estilo.corPrimaria || "#10b981";
      Object.values(C).forEach((w) => {
        if (w.sort((U, T) => Number(U.ordem_caminhamento ?? 999999) - Number(T.ordem_caminhamento ?? 999999)), w.length < 2) return;
        for (let U = 0; U < w.length - 1; U++) {
          const T = w[U], it = w[U + 1];
          O.polyline([[T.lat, T.lon], [it.lat, it.lon]], {
            color: k,
            weight: f,
            opacity: b,
            pane: d,
            interactive: y
          }).addTo(o);
        }
        const A = w[w.length - 1], H = w[0];
        O.polyline([[A.lat, A.lon], [H.lat, H.lon]], {
          color: k,
          weight: f,
          opacity: b,
          dashArray: "4, 4",
          pane: d,
          interactive: y
        }).addTo(o);
      });
    }
  }
  update(c, o, s, r, d) {
    (s.opacidade !== void 0 || s.estilo !== void 0 || s.dados !== void 0) && (o.clearLayers(), this.rebuildLines(c, o, d, r, `pane-${c.id}`));
  }
  destroy(c, o) {
    const s = this.zoomListenerMap.get(c);
    s && (o.off("zoomend", s), this.zoomListenerMap.delete(c)), c.clearLayers(), o.hasLayer(c) && o.removeLayer(c);
  }
}
function mi(M, c, o, s = "", r = "") {
  const d = `width: ${c + 4}px; height: ${c + 4}px;`, h = c;
  switch (M) {
    case "square":
      return `<div id="${r}" class="${o} ${s} rounded-sm shadow-md" style="width:${h}px; height:${h}px;"></div>`;
    case "circle-dot":
      return `
        <div id="${r}" class="relative flex items-center justify-center ${s}" style="${d}">
          <div class="${o} rounded-full shadow-md" style="width:${h}px; height:${h}px;"></div>
          <div class="absolute bg-white rounded-full" style="width:${Math.max(3, Math.floor(h / 3))}px; height:${Math.max(3, Math.floor(h / 3))}px;"></div>
        </div>
      `;
    case "x":
    case "cross":
      return `
        <div id="${r}" class="relative flex items-center justify-center ${s}" style="${d}">
          <svg width="${c + 2}" height="${c + 2}" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">
            <path d="M 2,2 L 8,8 M 8,2 L 2,8" stroke="#000000" stroke-width="2.5" stroke-linecap="round" />
            <path d="M 2,2 L 8,8 M 8,2 L 2,8" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
          </svg>
        </div>
      `;
    case "triangle":
      return `
        <div id="${r}" class="${s}" style="width:0; height:0; border-left:${h / 2}px solid transparent; border-right:${h / 2}px solid transparent; border-bottom:${h}px solid currentColor;"></div>
      `;
    case "circle":
    default:
      return `<div id="${r}" class="${o} ${s} rounded-full shadow-md" style="width:${h}px; height:${h}px;"></div>`;
  }
}
class os {
  constructor() {
    m(this, "zoomListenerMap", /* @__PURE__ */ new WeakMap());
  }
  render(c, o, s) {
    const r = O.layerGroup(), d = `pane-${c.id}`;
    this.rebuildPoints(c, r, o, s, d);
    const h = () => {
      c.estilo.scaleMode === "world" && (r.clearLayers(), this.rebuildPoints(c, r, o, s, d));
    };
    return o.on("zoomend", h), this.zoomListenerMap.set(r, h), r;
  }
  calculateSize(c, o, s, r) {
    const d = s.graphicScale.markerScaleMultiplier || 1;
    if (c.estilo.scaleMode === "world") {
      const h = c.estilo.dimensaoMetros || 0.25, p = o.getCenter(), f = o.getZoom(), b = 40075016686e-3 * Math.abs(Math.cos(p.lat * Math.PI / 180)) / Math.pow(2, f + 8), y = h / (b > 0 ? b : 1);
      return Math.max(3, Math.round(y * d));
    }
    return Math.max(4, Math.round(r * d));
  }
  rebuildPoints(c, o, s, r, d) {
    var y;
    const h = ((y = c.dados) == null ? void 0 : y.pontos) || r.pontos || [], p = c.interativo && !c.bloqueada, f = c.id === "vizinhos", b = c.id === "homologados";
    h.forEach((v) => {
      const E = v.lat ?? v.latitude, z = v.lon ?? v.lng ?? v.longitude;
      if (E && z && E !== 0 && z !== 0) {
        const C = v.tipo_ponto === "B" || v.tipo === "B", k = v.tipo_ponto === "M" || v.tipo === "M";
        let w = c.estilo.estiloMarcador || "x", A = "bg-mint-vibrant", H = c.estilo.tamanhoMarcador || 7;
        b ? (w = "circle", A = "bg-amber-500", H = 8) : f ? (w = k ? "circle-dot" : "cross", A = "bg-[#a855f7]", H = k ? 10 : 8) : k ? (A = "bg-indigo-500", w = "circle-dot", H = 10) : C && (A = "bg-rose-500", w = "square", H = 9);
        const V = this.calculateSize(c, s, r, H), U = r.config.enableAnimations ? "transition-all duration-150" : "", T = mi(w, V, A, U, `map-marker-${c.id}-${v.id}`), it = O.divIcon({
          html: T,
          className: "custom-leaflet-marker flex items-center justify-center",
          iconSize: [V + 6, V + 6]
        }), J = O.marker([E, z], {
          icon: it,
          pane: d,
          interactive: p
        });
        if (J.pontoId = v.id, J.layerId = c.id, J.isVizinho = f, p) {
          const Dt = b ? "Vértice Homologado SIGEF" : f ? "Confrontante (Importado)" : k ? "Base Homologada PPP" : C ? "Base de Campo (Translação)" : "Vértice de Perímetro";
          J.bindPopup(`
            <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
              <div style="font-weight:700; font-size:13px; margin-bottom:4px; color:#ffffff;">${$(v.nome_vertice || String(v.id))}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">${$(Dt)} · ${$(v.tipo_ponto || v.tipo || "Vértice")}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.45); font-family:monospace; margin-top:4px;">Lat ${Number(E).toFixed(6)} &nbsp; Lon ${Number(z).toFixed(6)}</div>
            </div>
          `, {
            className: "compact-popup",
            maxWidth: 220
          }), J.on("click", () => {
            r.onMarkerClick && r.onMarkerClick(v.id, f);
          });
        }
        J.addTo(o);
      }
    });
  }
  update(c, o, s, r, d) {
    (s.opacidade !== void 0 || s.estilo !== void 0 || s.dados !== void 0 || s.interativo !== void 0 || s.bloqueada !== void 0) && (o.clearLayers(), this.rebuildPoints(c, o, d, r, `pane-${c.id}`));
  }
  destroy(c, o) {
    const s = this.zoomListenerMap.get(c);
    s && (o.off("zoomend", s), this.zoomListenerMap.delete(c)), c.clearLayers(), o.hasLayer(c) && o.removeLayer(c);
  }
}
class ns {
  render(c, o, s) {
    const r = O.layerGroup(), d = `pane-${c.id}`;
    return this.rebuildPolygons(c, r, s, d), r;
  }
  rebuildPolygons(c, o, s, r) {
    var y;
    const d = ((y = c.dados) == null ? void 0 : y.confrontantes) || s.confrontantes || [], h = c.interativo && !c.bloqueada, p = c.estilo.corPrimaria || "#a855f7", f = c.estilo.espessuraLinha || 1.5, b = c.opacidade !== void 0 ? c.opacidade : 0.8;
    d.forEach((v) => {
      if (!v || !v.poligono_wkt) return;
      const E = /POLYGON\s*\(\s*\(\s*(.*?)\s*\)\s*\)/i.exec(v.poligono_wkt);
      if (!E) return;
      const z = E[1].split(",").map((A) => {
        const H = A.trim().split(/\s+/), V = parseFloat(H[0]), U = parseFloat(H[1]);
        return !isNaN(U) && !isNaN(V) ? [U, V] : null;
      }).filter((A) => A !== null);
      if (z.length < 3) return;
      const C = $(v.nome_propriedade || "Propriedade Vizinha"), k = $(v.nome || "Desconhecido"), w = O.polygon(z, {
        color: p,
        weight: f,
        opacity: b,
        dashArray: c.estilo.dashArray || "4, 6",
        fillColor: p,
        fillOpacity: Math.min(0.2, b * 0.15),
        pane: r,
        interactive: h
      });
      h && w.bindPopup(`
          <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3; min-width:180px;">
            <div style="font-weight:700; font-size:12px; color:#c084fc; margin-bottom:3px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">Limite de Confrontante</div>
            <div style="font-size:11px; margin-bottom:2px;"><strong>Propriedade:</strong> ${C}</div>
            <div style="font-size:11px;"><strong>Proprietário:</strong> ${k}</div>
          </div>
        `, { className: "compact-popup", maxWidth: 220 }), w.addTo(o);
    });
  }
  update(c, o, s, r) {
    (s.opacidade !== void 0 || s.estilo !== void 0 || s.dados !== void 0 || s.interativo !== void 0 || s.bloqueada !== void 0) && (o.clearLayers(), this.rebuildPolygons(c, o, r, `pane-${c.id}`));
  }
  destroy(c, o) {
    c.clearLayers(), o.hasLayer(c) && o.removeLayer(c);
  }
}
class as {
  constructor() {
    m(this, "moveListenerMap", /* @__PURE__ */ new WeakMap());
  }
  render(c, o, s) {
    const r = O.layerGroup(), d = `pane-${c.id}`, h = () => {
      if (r.clearLayers(), !c.visivel) return;
      if (o.getZoom() > 20) {
        const f = o.getBounds(), b = f.getSouth(), y = f.getNorth(), v = f.getWest(), E = f.getEast(), z = o.getCenter(), C = 8999e-9, k = Math.cos(z.lat * Math.PI / 180), w = C / (k > 0.1 ? k : 1), A = Math.floor((y - b) / C), H = Math.floor((E - v) / w);
        if (A < 200 && H < 200) {
          const V = Math.ceil(b / C) * C;
          for (let T = V; T <= y; T += C)
            O.polyline([[T, v], [T, E]], {
              color: c.estilo.corPrimaria || "rgba(0, 245, 160, 0.18)",
              weight: c.estilo.espessuraLinha || 0.6,
              interactive: !1,
              pane: d
            }).addTo(r);
          const U = Math.ceil(v / w) * w;
          for (let T = U; T <= E; T += w)
            O.polyline([[b, T], [y, T]], {
              color: c.estilo.corPrimaria || "rgba(0, 245, 160, 0.18)",
              weight: c.estilo.espessuraLinha || 0.6,
              interactive: !1,
              pane: d
            }).addTo(r);
        }
      }
    };
    return h(), o.on("zoomend moveend", h), this.moveListenerMap.set(r, h), r;
  }
  update(c, o) {
    c.visivel || o.clearLayers();
  }
  destroy(c, o) {
    const s = this.moveListenerMap.get(c);
    s && (o.off("zoomend moveend", s), this.moveListenerMap.delete(c)), c.clearLayers(), o.hasLayer(c) && o.removeLayer(c);
  }
}
dt.register("tile", new ts());
dt.register("wms", new es());
dt.register("vetorial-linhas", new is());
dt.register("vetorial-pontos", new os());
dt.register("vetorial-poligonos", new ns());
dt.register("grid", new as());
const ss = [
  {
    id: "satelite",
    nome: "Satélite Google Híbrido",
    categoria: "base",
    tipo: "tile",
    visivel: !0,
    opacidade: 1,
    zIndex: 200,
    interativo: !1,
    bloqueada: !1,
    estilo: { scaleMode: "screen" }
  },
  {
    id: "sigef",
    nome: "Acervo Fundiário SIGEF (INCRA)",
    categoria: "wms",
    tipo: "wms",
    visivel: !0,
    opacidade: 0.85,
    zIndex: 390,
    interativo: !0,
    bloqueada: !1,
    estilo: { scaleMode: "screen" }
  },
  {
    id: "homologados",
    nome: "Poligonal Homologada (Banco)",
    categoria: "referencia",
    tipo: "vetorial-linhas",
    visivel: !0,
    opacidade: 0.9,
    zIndex: 420,
    interativo: !0,
    bloqueada: !1,
    estilo: {
      corPrimaria: "#f59e0b",
      espessuraLinha: 2,
      dashArray: "6, 8",
      scaleMode: "screen"
    }
  },
  {
    id: "perimetro",
    nome: "Divisas e Poligonal do Imóvel",
    categoria: "levantamento",
    tipo: "vetorial-linhas",
    visivel: !0,
    opacidade: 1,
    zIndex: 450,
    interativo: !0,
    bloqueada: !1,
    estilo: {
      corPrimaria: "#00f5a0",
      espessuraLinha: 2,
      scaleMode: "screen",
      dimensaoMetros: 0.3
    }
  },
  {
    id: "vizinhos",
    nome: "Imóveis Confrontantes (WKT/CSV)",
    categoria: "referencia",
    tipo: "vetorial-poligonos",
    visivel: !0,
    opacidade: 0.8,
    zIndex: 500,
    interativo: !0,
    bloqueada: !1,
    estilo: {
      corPrimaria: "#a855f7",
      espessuraLinha: 1.5,
      dashArray: "4, 6",
      scaleMode: "screen"
    }
  },
  {
    id: "vertices",
    nome: "Vértices e Marcos do Levantamento",
    categoria: "levantamento",
    tipo: "vetorial-pontos",
    visivel: !0,
    opacidade: 1,
    zIndex: 650,
    interativo: !0,
    bloqueada: !1,
    estilo: {
      tamanhoMarcador: 8,
      scaleMode: "screen",
      dimensaoMetros: 0.25
    }
  },
  {
    id: "grade",
    nome: "Grade de Coordenadas UTM",
    categoria: "referencia",
    tipo: "grid",
    visivel: !0,
    opacidade: 0.5,
    zIndex: 700,
    interativo: !1,
    bloqueada: !1,
    estilo: {
      corPrimaria: "rgba(0, 245, 160, 0.18)",
      espessuraLinha: 0.6,
      scaleMode: "screen"
    }
  }
];
class rs {
  constructor(c) {
    m(this, "layers", []);
    m(this, "layerInstances", /* @__PURE__ */ new Map());
    m(this, "map", null);
    m(this, "context", null);
    m(this, "listeners", []);
    this.layers = (c || ss).map((o) => ({ ...o, estilo: { ...o.estilo } }));
  }
  attachMap(c, o) {
    this.map = c, this.context = o, this.ensurePanes(), this.renderAllLayers();
  }
  ensurePanes() {
    this.map && this.layers.forEach((c) => {
      const o = `pane-${c.id}`;
      let s = this.map.getPane(o);
      s || (s = this.map.createPane(o)), s && (s.style.zIndex = String(c.zIndex), s.style.pointerEvents = c.interativo && !c.bloqueada && c.visivel ? "auto" : "none");
    });
  }
  renderAllLayers() {
    !this.map || !this.context || (this.layers.forEach((c) => {
      if (this.layerInstances.has(c.id)) {
        const o = this.layerInstances.get(c.id), s = dt.get(c.tipo);
        s && s.destroy(o, this.map), this.layerInstances.delete(c.id);
      }
      if (c.visivel) {
        const o = dt.get(c.tipo);
        if (o) {
          const s = o.render(c, this.map, this.context);
          s && (s.addTo(this.map), this.layerInstances.set(c.id, s));
        }
      }
    }), this.notifyChange());
  }
  setLayerVisibility(c, o) {
    const s = this.layers.find((h) => h.id === c);
    if (!s || s.visivel === o || (s.visivel = o, !this.map || !this.context)) return;
    const r = `pane-${s.id}`, d = this.map.getPane(r);
    if (d && (d.style.display = o ? "" : "none", d.style.pointerEvents = s.visivel && s.interativo && !s.bloqueada ? "auto" : "none"), o) {
      if (!this.layerInstances.has(c)) {
        const h = dt.get(s.tipo);
        if (h) {
          const p = h.render(s, this.map, this.context);
          p && (p.addTo(this.map), this.layerInstances.set(c, p));
        }
      }
    } else if (this.layerInstances.has(c)) {
      const h = this.layerInstances.get(c), p = dt.get(s.tipo);
      p && p.destroy(h, this.map), this.layerInstances.delete(c);
    }
    this.notifyChange();
  }
  setLayerOpacity(c, o) {
    const s = this.layers.find((d) => d.id === c);
    if (!s) return;
    if (s.opacidade = Math.max(0, Math.min(1, o)), this.map) {
      const d = this.map.getPane(`pane-${c}`);
      d && (d.style.opacity = String(s.opacidade));
    }
    const r = this.layerInstances.get(c);
    if (r && this.map && this.context) {
      const d = dt.get(s.tipo);
      d && d.update(s, r, { opacidade: s.opacidade }, this.context, this.map);
    }
    this.notifyChange();
  }
  setLayerZIndex(c, o) {
    const s = this.layers.find((r) => r.id === c);
    if (s) {
      if (s.zIndex = o, this.map) {
        const r = this.map.getPane(`pane-${c}`);
        r && (r.style.zIndex = String(o));
      }
      this.notifyChange();
    }
  }
  setLayerBlocked(c, o) {
    const s = this.layers.find((r) => r.id === c);
    if (s) {
      if (s.bloqueada = o, this.map) {
        const r = this.map.getPane(`pane-${c}`);
        r && (r.style.pointerEvents = s.visivel && s.interativo && !o ? "auto" : "none");
      }
      this.notifyChange();
    }
  }
  setLayerScaleMode(c, o) {
    const s = this.layers.find((d) => d.id === c);
    if (!s) return;
    s.estilo.scaleMode = o;
    const r = this.layerInstances.get(c);
    if (r && this.map && this.context) {
      const d = dt.get(s.tipo);
      d && d.update(s, r, { estilo: s.estilo }, this.context, this.map);
    }
    this.notifyChange();
  }
  setGraphicScale(c) {
    this.context && (this.context.graphicScale = { ...this.context.graphicScale, ...c }, this.renderAllLayers());
  }
  updateContext(c) {
    this.context && (this.context = { ...this.context, ...c }, this.renderAllLayers());
  }
  getLayers() {
    return [...this.layers];
  }
  getActiveSelectableLayers() {
    return this.layers.filter((c) => c.visivel && c.interativo && !c.bloqueada);
  }
  isLayerActiveAndSelectable(c) {
    const o = this.layers.find((s) => s.id === c);
    return !!(o && o.visivel && o.interativo && !o.bloqueada);
  }
  exportState() {
    return this.layers.map((c) => ({
      id: c.id,
      visivel: c.visivel,
      opacidade: c.opacidade,
      zIndex: c.zIndex,
      bloqueada: c.bloqueada,
      estilo: { ...c.estilo }
    }));
  }
  importState(c) {
    !c || !Array.isArray(c) || (c.forEach((o) => {
      const s = this.layers.find((r) => r.id === o.id);
      s && (o.visivel !== void 0 && (s.visivel = o.visivel), o.opacidade !== void 0 && (s.opacidade = o.opacidade), o.zIndex !== void 0 && (s.zIndex = o.zIndex), o.bloqueada !== void 0 && (s.bloqueada = o.bloqueada), o.estilo && (s.estilo = { ...s.estilo, ...o.estilo }));
    }), this.ensurePanes(), this.renderAllLayers());
  }
  onChange(c) {
    return this.listeners.push(c), () => {
      this.listeners = this.listeners.filter((o) => o !== c);
    };
  }
  notifyChange() {
    const c = this.getLayers();
    this.listeners.forEach((o) => {
      try {
        o(c);
      } catch (s) {
        console.error("Erro no listener de camadas:", s);
      }
    });
  }
  destroy() {
    this.map && (this.layerInstances.forEach((c, o) => {
      const s = this.layers.find((r) => r.id === o);
      if (s) {
        const r = dt.get(s.tipo);
        r && r.destroy(c, this.map);
      }
    }), this.layerInstances.clear()), this.listeners = [];
  }
}
class ls {
  constructor(c) {
    m(this, "core");
    m(this, "layerManager");
    m(this, "canvasInteracao");
    m(this, "context");
    m(this, "modoCliqueSequencialAtivo", !1);
    m(this, "levantamentoId", null);
    this.core = new Ja(this), this.layerManager = new rs(c), this.canvasInteracao = new Qa({
      mapaController: this,
      layerManager: this.layerManager
    }), this.context = {
      pontos: [],
      segmentos: [],
      bancoPontos: [],
      confrontantes: [],
      config: this.core.config,
      graphicScale: {
        markerScaleMultiplier: 1,
        lineScaleMultiplier: 1,
        scaleModeGlobal: "screen"
      },
      onMarkerClick: (o, s) => {
        s ? this.canvasInteracao.ctx.selectedVizinhoPontoIds = [o] : (this.canvasInteracao.ctx.selectedPontoIds = [o], this.canvasInteracao.ctx.lastSelectedPontoId = o), window.dispatchEvent(new CustomEvent("gerencigeo:ponto-selecionado", {
          detail: { selectedPontoIds: [o], lastSelectedPontoId: o, isVizinho: s }
        }));
      }
    };
  }
  init(c, o) {
    const s = this.core.init(c);
    return s && (this.layerManager.attachMap(s, this.context), this.canvasInteracao.ativar(this, o)), s;
  }
  invalidateSize() {
    var c;
    try {
      (c = this.core) == null || c.invalidateSize();
    } catch {
    }
  }
  setPontos(c) {
    this.context.pontos = c, this.canvasInteracao.ctx.pontosList = c, this.layerManager.updateContext({ pontos: c });
  }
  setSegmentos(c) {
    this.context.segmentos = c, this.layerManager.updateContext({ segmentos: c });
  }
  setBancoPontos(c) {
    this.context.bancoPontos = c, this.layerManager.updateContext({ bancoPontos: c });
  }
  setConfrontantes(c) {
    this.context.confrontantes = c, this.layerManager.updateContext({ confrontantes: c });
  }
  setGraphicScale(c) {
    this.layerManager.setGraphicScale(c);
  }
  exportState() {
    return this.layerManager.exportState();
  }
  importState(c) {
    this.layerManager.importState(c);
  }
  selectPonto(c, o) {
    if (!this.core.map) return;
    const r = this.getMarkers().find((d) => d.pontoId === c);
    if (r) {
      const d = o !== void 0 ? o : this.core.map.getZoom();
      this.core.map.setView(r.getLatLng(), d), r.openPopup();
    }
  }
  fitBounds(c, o = [40, 40], s = !1) {
    if (!this.core.map) return;
    let d = [...c || this.context.pontos || []];
    s && this.context.confrontantes && this.context.confrontantes.forEach((p) => {
      p.pontos && d.push(...p.pontos);
    });
    const h = d.map((p) => {
      const f = p.lat ?? p.latitude ?? p.y, b = p.lon ?? p.lng ?? p.longitude ?? p.x, y = typeof f == "string" ? parseFloat(f) : Number(f), v = typeof b == "string" ? parseFloat(b) : Number(b);
      return y !== void 0 && v !== void 0 && !isNaN(y) && !isNaN(v) && y !== 0 && v !== 0 ? O.latLng(y, v) : null;
    }).filter((p) => p !== null);
    if (h.length > 0) {
      const p = O.latLngBounds(h);
      this.core.map.fitBounds(p, { padding: o }), this.core.map.once("moveend", () => {
        this.core.preCarregarTilesRegiao(p);
      });
    }
    try {
      this.core.map.invalidateSize();
    } catch {
    }
  }
  getMarkers() {
    const c = [];
    return this.core.map && this.core.map.eachLayer((o) => {
      o instanceof O.Marker && o.pontoId && c.push(o);
    }), c;
  }
  getVizinhosMarkers() {
    return this.getMarkers().filter((c) => c.isVizinho);
  }
  destroy() {
    this.canvasInteracao.desativar(), this.layerManager.destroy(), this.core.map && (this.core.map.remove(), this.core.map = null);
  }
  getMap() {
    return this.core.map;
  }
}
class cs extends HTMLElement {
  constructor() {
    super();
    m(this, "shadow");
    m(this, "mapContainer", null);
    m(this, "layersPanel", null);
    m(this, "controller");
    m(this, "isLayersPanelOpen", !1);
    m(this, "_pontos", []);
    m(this, "_segmentos", []);
    m(this, "_bancoPontos", []);
    m(this, "_confrontantes", []);
    this.shadow = this.attachShadow({ mode: "open" }), this.controller = new ls(), this.shadow.innerHTML = `
      <style>
        ${qo}
        ${Xa}
      </style>
      <div class="cad-root" id="cad-root">
        <!-- Mapa Leaflet Canvas -->
        <div class="cad-map-container" id="cad-map-container"></div>

        <!-- Painel de Camadas estilo QGIS -->
        <div class="qgis-layer-panel collapsed" id="qgis-layer-panel">
          <div class="layer-panel-header">
            <div class="layer-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              Camadas (QGIS)
            </div>
            <button class="layer-panel-close" id="btn-close-layers" type="button" title="Fechar Painel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="layer-panel-body" id="layers-list-container">
            <!-- Camadas renderizadas dinamicamente -->
          </div>
        </div>

        <!-- Toolbar Rápida do Canvas -->
        <div class="cad-quick-toolbar">
          <button class="cad-btn-tool" id="btn-toggle-layers" type="button" title="Gerenciador de Camadas (QGIS)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </button>
          <button class="cad-btn-tool" id="btn-zoom-extents" type="button" title="Enquadrar Levantamento (Zoom Extents)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
          </button>
          <button class="cad-btn-tool" id="btn-clear-selection" type="button" title="Limpar Seleção (ESC)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
          </button>
        </div>
      </div>
    `, this.mapContainer = this.shadow.getElementById("cad-map-container"), this.layersPanel = this.shadow.getElementById("qgis-layer-panel");
  }
  static get observedAttributes() {
    return ["sat-opacity", "scale-mode", "crosshair"];
  }
  connectedCallback() {
    setTimeout(() => {
      this.initCAD();
    }, 0);
  }
  disconnectedCallback() {
    this.controller.destroy();
  }
  attributeChangedCallback(o, s, r) {
    if (s !== r)
      if (o === "sat-opacity") {
        const d = parseFloat(r);
        isNaN(d) || this.setLayerOpacity("satelite", d);
      } else o === "scale-mode" && (r === "world" || r === "screen") && (this.setLayerScaleMode("perimetro", r), this.setLayerScaleMode("vertices", r));
  }
  initCAD() {
    this.mapContainer && (this.controller.init(this.mapContainer, this.shadow), this.setupUIEvents(), this.renderLayersUI(), this._pontos.length > 0 && this.controller.setPontos(this._pontos), this._segmentos.length > 0 && this.controller.setSegmentos(this._segmentos), this._bancoPontos.length > 0 && this.controller.setBancoPontos(this._bancoPontos), this._confrontantes.length > 0 && this.controller.setConfrontantes(this._confrontantes), this.controller.layerManager.onChange((o) => {
      this.renderLayersUI(), this.dispatchEvent(new CustomEvent("ui-camadas-alteradas", {
        detail: { layers: o },
        bubbles: !0,
        composed: !0
      }));
    }), this.controller.context.onMarkerClick = (o, s) => {
      this.dispatchEvent(new CustomEvent("ui-ponto-selecionado", {
        detail: { selectedIds: [o], lastSelectedId: o, isVizinho: s },
        bubbles: !0,
        composed: !0
      }));
    }, setTimeout(() => {
      this.controller.invalidateSize();
    }, 150));
  }
  setupUIEvents() {
    const o = this.shadow.getElementById("btn-toggle-layers"), s = this.shadow.getElementById("btn-close-layers"), r = this.shadow.getElementById("btn-zoom-extents"), d = this.shadow.getElementById("btn-clear-selection");
    o == null || o.addEventListener("click", () => {
      this.toggleLayersPanel();
    }), s == null || s.addEventListener("click", () => {
      this.closeLayersPanel();
    }), r == null || r.addEventListener("click", () => {
      this.zoomExtents();
    }), d == null || d.addEventListener("click", () => {
      this.limparSelecao();
    });
  }
  toggleLayersPanel() {
    this.isLayersPanelOpen = !this.isLayersPanelOpen, this.layersPanel && (this.isLayersPanelOpen ? this.layersPanel.classList.remove("collapsed") : this.layersPanel.classList.add("collapsed"));
    const o = this.shadow.getElementById("btn-toggle-layers");
    o == null || o.classList.toggle("active", this.isLayersPanelOpen);
  }
  closeLayersPanel() {
    var s;
    this.isLayersPanelOpen = !1, (s = this.layersPanel) == null || s.classList.add("collapsed");
    const o = this.shadow.getElementById("btn-toggle-layers");
    o == null || o.classList.remove("active");
  }
  renderLayersUI() {
    const o = this.shadow.getElementById("layers-list-container");
    if (!o) return;
    const s = this.controller.layerManager.getLayers();
    if (o.querySelectorAll(".layer-item").length === s.length) {
      s.forEach((d) => {
        const h = o.querySelector(`.layer-item[data-layer-id="${d.id}"]`);
        if (h) {
          const p = h.querySelector(".layer-chk-visibility");
          p && p.checked !== d.visivel && (p.checked = d.visivel);
          const f = h.querySelector(".layer-opacity-slider"), b = h.querySelector(".opacity-percent-label"), y = Math.round(d.opacidade * 100);
          f && parseInt(f.value, 10) !== y && (f.value = String(y)), b && (b.textContent = `${y}%`);
          const v = h.querySelector(".btn-lock-layer");
          v && (v.classList.toggle("active", !!d.bloqueada), v.title = d.bloqueada ? "Desbloquear Camada" : "Bloquear Camada");
          const E = h.querySelector(".btn-toggle-scale-mode");
          E && d.estilo.scaleMode && (E.textContent = d.estilo.scaleMode === "world" ? "Métrico (m)" : "Tela (px)");
        }
      });
      return;
    }
    o.innerHTML = `
      <div class="layer-section-title">Camadas Ativas</div>
      ${s.map((d) => `
        <div class="layer-item" data-layer-id="${d.id}">
          <div class="layer-item-row">
            <label class="layer-item-label">
              <input type="checkbox" class="layer-chk-visibility" data-layer-id="${d.id}" ${d.visivel ? "checked" : ""} />
              <span>${d.nome}</span>
            </label>
            <div class="layer-item-actions">
              <button class="btn-layer-action btn-lock-layer ${d.bloqueada ? "active" : ""}" data-layer-id="${d.id}" type="button" title="${d.bloqueada ? "Desbloquear Camada" : "Bloquear Camada"}">
                ${d.bloqueada ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'}
              </button>
              ${d.estilo.scaleMode ? `
                <span class="scale-mode-pill btn-toggle-scale-mode" data-layer-id="${d.id}" title="Alternar Tela (px) / Métrico (m)">
                  ${d.estilo.scaleMode === "world" ? "Métrico (m)" : "Tela (px)"}
                </span>
              ` : ""}
            </div>
          </div>
          <div class="layer-controls-row">
            <span>Opacidade</span>
            <input type="range" min="0" max="100" value="${Math.round(d.opacidade * 100)}" class="layer-opacity-slider" data-layer-id="${d.id}" />
            <span class="opacity-percent-label" style="font-family:monospace; font-size:9px; width:28px; text-align:right;">${Math.round(d.opacidade * 100)}%</span>
          </div>
        </div>
      `).join("")}
    `, o.querySelectorAll(".layer-chk-visibility").forEach((d) => {
      d.addEventListener("change", (h) => {
        const p = h.target.getAttribute("data-layer-id"), f = h.target.checked;
        p && this.setLayerVisibility(p, f);
      });
    }), o.querySelectorAll(".layer-opacity-slider").forEach((d) => {
      d.addEventListener("input", (h) => {
        const p = h.target.getAttribute("data-layer-id"), f = parseInt(h.target.value, 10), b = f / 100, y = h.target.closest(".layer-item"), v = y == null ? void 0 : y.querySelector(".opacity-percent-label");
        v && (v.textContent = `${f}%`), p && this.setLayerOpacity(p, b);
      });
    }), o.querySelectorAll(".btn-lock-layer").forEach((d) => {
      d.addEventListener("click", (h) => {
        const p = h.currentTarget.getAttribute("data-layer-id");
        if (p) {
          const f = this.controller.layerManager.getLayers().find((b) => b.id === p);
          f && this.controller.layerManager.setLayerBlocked(p, !f.bloqueada);
        }
      });
    }), o.querySelectorAll(".btn-toggle-scale-mode").forEach((d) => {
      d.addEventListener("click", (h) => {
        const p = h.currentTarget.getAttribute("data-layer-id");
        if (p) {
          const f = this.controller.layerManager.getLayers().find((b) => b.id === p);
          if (f) {
            const b = f.estilo.scaleMode === "world" ? "screen" : "world";
            this.setLayerScaleMode(p, b);
          }
        }
      });
    });
  }
  // --- API de Propriedades Públicas ---
  get pontos() {
    return this._pontos;
  }
  set pontos(o) {
    this._pontos = o || [], this.controller.setPontos(this._pontos);
  }
  get segmentos() {
    return this._segmentos;
  }
  set segmentos(o) {
    this._segmentos = o || [], this.controller.setSegmentos(this._segmentos);
  }
  get bancoPontos() {
    return this._bancoPontos;
  }
  set bancoPontos(o) {
    this._bancoPontos = o || [], this.controller.setBancoPontos(this._bancoPontos);
  }
  get pontosHomologados() {
    return this.bancoPontos;
  }
  set pontosHomologados(o) {
    this.bancoPontos = o;
  }
  get confrontantes() {
    return this._confrontantes;
  }
  set confrontantes(o) {
    this._confrontantes = o || [], this.controller.setConfrontantes(this._confrontantes);
  }
  get vizinhos() {
    return this.confrontantes;
  }
  set vizinhos(o) {
    this.confrontantes = o;
  }
  // --- Métodos Públicos ---
  fitBounds(o, s = [40, 40], r = !1) {
    this.controller.fitBounds(o, s, r);
  }
  zoomExtents() {
    this.controller.canvasInteracao.zoomExtents();
  }
  selectPonto(o, s) {
    this.controller.selectPonto(o, s);
  }
  limparSelecao() {
    this.controller.canvasInteracao.limparSelecao();
  }
  setLayerVisibility(o, s) {
    this.controller.layerManager.setLayerVisibility(o, s);
  }
  setLayerOpacity(o, s) {
    this.controller.layerManager.setLayerOpacity(o, s);
  }
  setLayerScaleMode(o, s) {
    this.controller.layerManager.setLayerScaleMode(o, s);
  }
  setGraphicScale(o) {
    this.controller.setGraphicScale(o);
  }
  exportState() {
    return this.controller.exportState();
  }
  importState(o) {
    this.controller.importState(o);
  }
  invalidateSize() {
    this.controller.invalidateSize();
  }
  getMap() {
    return this.controller.getMap();
  }
  getController() {
    return this.controller;
  }
  getLayerManager() {
    return this.controller.layerManager;
  }
}
customElements.get("ui-canvas-cad") || customElements.define("ui-canvas-cad", cs);
class us {
  constructor(c, o) {
    m(this, "polylines", []);
    m(this, "bancoPontosAtivo", !1);
    m(this, "core");
    this.core = c;
  }
  setBancoPontosAtivo(c) {
    this.bancoPontosAtivo = c;
  }
  plotSegmentos(c, o) {
    this.core.map && c.forEach((s) => {
      const r = o.find((h) => String(h.id) === String(s.ponto_inicio_id)), d = o.find((h) => String(h.id) === String(s.ponto_fim_id));
      if (r && d && r.lat && r.lon && d.lat && d.lon) {
        const h = s.tipo_limite_sigef || s.tipo_limite || "", p = s.metodo_posicionamento_sigef || s.metodo_posicionamento || "", f = this.bancoPontosAtivo ? "#94a3b8" : h === "LA1" ? "#10b981" : "#3b82f6", b = this.core.config.perimetroWeight, y = this.bancoPontosAtivo ? 0.4 : 1, v = O.polyline([[r.lat, r.lon], [d.lat, d.lon]], {
          color: f,
          weight: b,
          opacity: y,
          dashArray: h === "LN1" ? "6, 6" : void 0,
          pane: "perimetroPane"
        }).bindPopup(`
          <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
            <div style="font-weight:700; font-size:12px; margin-bottom:3px; color:#ffffff;">${$(r.nome_vertice)} ↔ ${$(d.nome_vertice)}</div>
            <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Limite: ${$(h)} · ${$(p)}</div>
          </div>
        `, {
          className: "compact-popup",
          maxWidth: 220
        }).addTo(this.core.map);
        this.polylines.push(v);
      }
    });
  }
  plotPolilinhaTemporaria(c) {
    if (!this.core.map) return;
    const o = c.filter(
      (p) => p.lat && p.lon && p.lat !== 0 && p.lon !== 0 && p.tipo_ponto !== "B" && p.tipo !== "B" && p.ignorar_poligono !== 1
    );
    if (o.length < 2) return;
    const s = {};
    o.forEach((p) => {
      const f = p.matricula_id != null ? `mat_${p.matricula_id}` : p.planilha_origem || "default";
      s[f] || (s[f] = []), s[f].push(p);
    });
    const r = this.bancoPontosAtivo ? "#94a3b8" : "#10b981", d = this.core.config.fechamentoWeight || 2, h = this.bancoPontosAtivo ? 0.4 : 1;
    Object.values(s).forEach((p) => {
      if (p.sort((v, E) => Number(v.ordem_caminhamento ?? 999999) - Number(E.ordem_caminhamento ?? 999999)), p.length < 2) return;
      for (let v = 0; v < p.length - 1; v++) {
        const E = p[v], z = p[v + 1], C = O.polyline([[E.lat, E.lon], [z.lat, z.lon]], {
          color: r,
          weight: d,
          opacity: h,
          pane: "perimetroPane"
        }).addTo(this.core.map);
        this.polylines.push(C);
      }
      const f = p[p.length - 1], b = p[0], y = O.polyline([[f.lat, f.lon], [b.lat, b.lon]], {
        color: r,
        weight: d,
        opacity: h,
        dashArray: "4, 4",
        pane: "perimetroPane"
      }).addTo(this.core.map);
      this.polylines.push(y);
    });
  }
  plotPoligonalHomologada(c) {
    if (!this.core.map || !this.core.bancoPontosGroup) return;
    this.core.bancoPontosGroup.clearLayers();
    const o = c.filter((r) => r.lat && r.lon && r.lat !== 0 && r.lon !== 0);
    if (o.length === 0) return;
    this.bancoPontosAtivo = !0, o.forEach((r) => {
      const d = `
        <div class="w-4.5 h-4.5 bg-amber-500 text-slate-950 border-2 border-slate-900 rounded-full flex items-center justify-center text-[7px] font-black font-mono shadow-md hover:scale-125 transition-transform" id="banco-marker-${r.id}">
          H
        </div>
      `, h = O.divIcon({
        html: d,
        className: "banco-leaflet-marker",
        iconSize: [18, 18]
      }), p = `
        <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.35; min-width:180px;">
          <div style="font-weight:800; font-size:11px; color:#fbbf24; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid rgba(255, 255, 255, 0.1); padding-bottom:3px; margin-bottom:5px;">Vértice Homologado SIGEF</div>
          <div style="font-weight:700; font-size:13px; margin-bottom:3px; color:#ffffff;">${$(r.codigo_completo || r.nome_vertice)}</div>
          <div style="font-size:11px; color:rgba(255, 255, 255, 0.7); font-family:monospace;">Este (E): ${r.este ? r.este.toFixed(2) : "N/A"} m</div>
          <div style="font-size:11px; color:rgba(255, 255, 255, 0.7); font-family:monospace; margin-bottom:3px;">Norte (N): ${r.norte ? r.norte.toFixed(2) : "N/A"} m</div>
          <div style="font-size:11px; color:rgba(255, 255, 255, 0.7); margin-bottom:2px;">Alt (h): <strong>${r.altitude ? r.altitude.toFixed(2) : "N/A"} m</strong></div>
          <div style="font-size:10px; color:rgba(255, 255, 255, 0.45);">Método: ${$(r.metodo_posicionamento) || "N/A"} · Limite: ${$(r.tipo_limite) || "N/A"}</div>
          ${r.confrontante_descritivo ? `<div style="font-size:10px; color:rgba(255, 255, 255, 0.65); border-top:1px solid rgba(255, 255, 255, 0.1); padding-top:4px; margin-top:4px; word-break:break-word;"><strong>Conf:</strong> ${$(r.confrontante_descritivo)}</div>` : ""}
        </div>
      `;
      O.marker([r.lat, r.lon], {
        icon: h,
        pane: "verticesPane"
      }).bindPopup(p, { className: "compact-popup", maxWidth: 220 }).addTo(this.core.bancoPontosGroup);
    });
    const s = {};
    o.forEach((r) => {
      const d = r.matricula_id ? `mat_${r.matricula_id}` : r.planilha_origem || "default";
      s[d] || (s[d] = []), s[d].push(r);
    });
    for (const r in s) {
      const d = s[r];
      if (d.sort((h, p) => {
        const f = h.ordem_caminhamento !== void 0 && h.ordem_caminhamento !== null ? h.ordem_caminhamento : h.id, b = p.ordem_caminhamento !== void 0 && p.ordem_caminhamento !== null ? p.ordem_caminhamento : p.id;
        return f - b;
      }), d.length >= 2) {
        const h = d.map((p) => O.latLng(p.lat, p.lon));
        h.push(O.latLng(d[0].lat, d[0].lon)), O.polyline(h, {
          color: "#f59e0b",
          // Cor âmbar contrastante premium
          weight: this.core.config.bancoWeight,
          dashArray: "6, 8",
          pane: "perimetroPane"
        }).addTo(this.core.bancoPontosGroup);
      }
    }
  }
  clearLinhas() {
    this.core.map && this.polylines.forEach((c) => this.core.map.removeLayer(c)), this.core.bancoPontosGroup && this.core.bancoPontosGroup.clearLayers(), this.polylines = [];
  }
}
class ps {
  constructor(c, o) {
    m(this, "markers", []);
    m(this, "vizinhosMarkers", []);
    m(this, "vizinhosPoligonos", []);
    m(this, "core");
    m(this, "controller");
    this.core = c, this.controller = o;
  }
  plotPontos(c, o) {
    this.core.map && c.forEach((s) => {
      var r, d, h;
      if (s.lat && s.lon && s.lat !== 0 && s.lon !== 0) {
        const p = s.tipo_ponto === "B" || s.tipo === "B", f = s.tipo_ponto === "M" || s.tipo === "M";
        let b = "bg-mint-vibrant", y = "x", v = 7;
        f ? (b = "bg-indigo-500", v = 9) : p && (b = "bg-rose-500", v = 9);
        const E = this.core.config.enableAnimations ? "transition-all duration-150" : "", z = (d = (r = this.controller) == null ? void 0 : r.linhas) != null && d.bancoPontosAtivo ? "opacity-40 hover:opacity-100" : "", C = mi(y, v, b, `${E} ${z}`, `map-marker-${s.id}`), k = O.divIcon({
          html: C,
          className: "custom-leaflet-marker flex items-center justify-center",
          iconSize: [v + 6, v + 6]
        }), w = f ? "Base Homologada PPP" : p ? "Base de Campo (Translação)" : "Vértice de Perímetro", A = O.marker([s.lat, s.lon], {
          icon: k,
          pane: "verticesPane"
        });
        A.pontoId = s.id, (h = this.controller) != null && h.modoCliqueSequencialAtivo || A.bindPopup(`
            <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
              <div style="font-weight:700; font-size:13px; margin-bottom:4px; color:#ffffff;">${$(s.nome_vertice)}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">${$(w)} · ${$(s.tipo_ponto || s.tipo)}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.45); font-family:monospace; margin-top:4px;">Lat ${s.lat.toFixed(6)} &nbsp; Lon ${s.lon.toFixed(6)}</div>
            </div>
          `, {
          className: "compact-popup",
          maxWidth: 220
        }), A.addTo(this.core.map), A.setZIndexOffset(1e3), A.on("click", () => {
          o(s.id);
        }), this.markers.push(A);
      }
    });
  }
  plotPontosVizinhos(c) {
    if (!this.core.map || !this.core.pontosVizinhosGroup) return;
    this.core.map.hasLayer(this.core.pontosVizinhosGroup) || this.core.pontosVizinhosGroup.addTo(this.core.map), this.vizinhosMarkers && this.vizinhosMarkers.length > 0 && (this.vizinhosMarkers.forEach((s) => {
      s.off(), s.unbindPopup();
    }), this.vizinhosMarkers = []), this.core.pontosVizinhosGroup.clearLayers();
    const o = /* @__PURE__ */ new Map();
    (c || []).forEach((s) => {
      const r = s.lat ?? s.latitude ?? s.y, d = s.lon ?? s.lng ?? s.longitude ?? s.x, h = typeof r == "string" ? parseFloat(r.replace(",", ".")) : Number(r), p = typeof d == "string" ? parseFloat(d.replace(",", ".")) : Number(d);
      if (h !== void 0 && p !== void 0 && !isNaN(h) && !isNaN(p) && h !== 0 && p !== 0) {
        s.lat = h, s.lon = p;
        const f = s.confrontante_id !== void 0 && s.confrontante_id !== null ? String(s.confrontante_id) : "0";
        o.has(f) || o.set(f, []), o.get(f).push(s);
      }
    }), o.forEach((s) => {
      if (s.length >= 2) {
        s.sort((d, h) => d.id - h.id);
        const r = s.map((d) => O.latLng(d.lat, d.lon));
        s.length > 2 && r.push(O.latLng(s[0].lat, s[0].lon)), O.polyline(r, {
          color: "#a855f7",
          weight: this.core.config.vizinhoWeight,
          dashArray: "4, 6",
          pane: "overlayPane"
        }).addTo(this.core.pontosVizinhosGroup);
      }
      s.forEach((r) => {
        const d = $(String(r.id)), h = `
          <div class="p-2 font-sans text-xs bg-[#0c1510] text-white min-w-[200px] rounded">
            <div class="font-bold text-purple-400 mb-1 border-b border-white/10 pb-1">Confrontante (Importado)</div>
            <div class="mb-1"><strong>Vértice:</strong> <span class="font-mono">${$(r.nome_vertice || "")}</span></div>
            <div class="mb-1"><strong>Proprietário:</strong> ${$(r.nome_confrontante || "") || "Desconhecido"}</div>
            <div class="mb-1"><strong>Propriedade:</strong> ${$(r.nome_propriedade || "") || "Desconhecida"}</div>
            <div class="mb-1"><strong>Coordenadas:</strong> ${r.lat.toFixed(7)}, ${r.lon.toFixed(7)}</div>
            <div class="text-[10px] text-white/50 border-t border-white/5 pt-1 mt-1 font-mono uppercase tracking-wider mb-2">Pontos Imutáveis do Vizinho</div>
            <div style="display:flex; gap:6px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px;">
              <button onclick="window.dispatchEvent(new CustomEvent('gerencigeo:integrar_vizinho', { detail: { pontoId: ${d} } }))" style="padding:3px 8px; font-size:10px; font-weight:700; border-radius:4px; background:#00f5a0; color:#04150c; border:none; cursor:pointer;" type="button">
                Integrar
              </button>
              <button onclick="window.dispatchEvent(new CustomEvent('gerencigeo:ocultar_vizinho', { detail: { pontoId: ${d} } }))" style="padding:3px 8px; font-size:10px; font-weight:700; border-radius:4px; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.8); border:1px solid rgba(255,255,255,0.15); cursor:pointer;" type="button">
                Ocultar
              </button>
            </div>
          </div>
        `;
        let p = this.core.config.markerStyleV || "cross", f = this.core.config.markerSizeV || 8;
        r.tipo_ponto === "M" || r.tipo === "M" || r.tipo === "B" ? (p = this.core.config.markerStyleM || "circle-dot", f = this.core.config.markerSizeM || 14) : (r.tipo_ponto === "P" || r.tipo === "P" || r.tipo === "O") && (p = this.core.config.markerStyleP || "circle", f = this.core.config.markerSizeP || 10);
        const b = this.core.config.enableAnimations ? "transition-all duration-150" : "", y = mi(p, f, "bg-[#a855f7]", b, `map-marker-vizinho-${r.id}`), v = O.divIcon({
          html: y,
          className: "custom-leaflet-marker flex items-center justify-center",
          iconSize: [f + 4, f + 4]
        }), E = O.marker([r.lat, r.lon], {
          icon: v,
          pane: "overlayPane"
        }).bindPopup(h, { className: "custom-leaflet-popup" });
        E.pontoId = r.id, E.isVizinho = !0, E.addTo(this.core.pontosVizinhosGroup), this.vizinhosMarkers.push(E);
      });
    });
  }
  /**
   * Desenha o perímetro (limites) dos imóveis vizinhos importados via WKT POLYGON
   */
  plotPoligonosVizinhos(c) {
    !this.core.map || !this.core.pontosVizinhosGroup || (this.core.map.hasLayer(this.core.pontosVizinhosGroup) || this.core.pontosVizinhosGroup.addTo(this.core.map), this.vizinhosPoligonos.length > 0 && (this.vizinhosPoligonos.forEach((o) => o.off()), this.vizinhosPoligonos = []), (c || []).forEach((o) => {
      if (!o || !o.poligono_wkt) return;
      const s = /POLYGON\s*\(\s*\(\s*(.*?)\s*\)\s*\)/i.exec(o.poligono_wkt);
      if (!s) return;
      const r = s[1].split(",").map((f) => {
        const b = f.trim().split(/\s+/), y = parseFloat(b[0]), v = parseFloat(b[1]);
        return !isNaN(v) && !isNaN(y) ? [v, y] : null;
      }).filter((f) => f !== null);
      if (r.length < 3) return;
      const d = $(o.nome_propriedade || "Propriedade Vizinha"), h = $(o.nome || "Desconhecido"), p = O.polygon(r, {
        color: "#a855f7",
        weight: this.core.config.vizinhoWeight,
        dashArray: "4, 6",
        fillColor: "#a855f7",
        fillOpacity: 0.05,
        pane: "overlayPane"
      }).bindPopup(`
        <div class="p-2 font-sans text-xs bg-[#0c1510] text-white min-w-[200px] rounded">
          <div class="font-bold text-purple-400 mb-1 border-b border-white/10 pb-1">Limite do Vizinho (Importado)</div>
          <div class="mb-1"><strong>Propriedade:</strong> ${d}</div>
          <div class="mb-1"><strong>Proprietário:</strong> ${h}</div>
        </div>
      `, { className: "custom-leaflet-popup" });
      p.addTo(this.core.pontosVizinhosGroup), this.vizinhosPoligonos.push(p);
    }));
  }
  clearMarkers() {
    this.markers && (this.markers.forEach((c) => {
      c.off(), c.unbindPopup(), this.core.map && this.core.map.removeLayer(c);
    }), this.markers = []), this.vizinhosMarkers && (this.vizinhosMarkers.forEach((c) => {
      c.off(), c.unbindPopup();
    }), this.vizinhosMarkers = []), this.vizinhosPoligonos && (this.vizinhosPoligonos.forEach((c) => c.off()), this.vizinhosPoligonos = []), this.core.pontosVizinhosGroup && this.core.pontosVizinhosGroup.clearLayers();
  }
}
export {
  Qa as CanvasInteracao,
  rs as CanvasLayerManager,
  Bo as DEFAULT_CONFIG,
  ss as DEFAULT_LAYERS,
  ls as GerenciGeoMapaController,
  as as GridLayerRenderer,
  dt as LayerRendererFactory,
  fi as MapaConfigManager,
  Ja as MapaCore,
  us as MapaLinhas,
  ps as MapaMarcadores,
  ts as TileLayerRenderer,
  Do as UIAlerta,
  Oa as UIAvatar,
  vi as UIBadge,
  No as UIBotao,
  va as UIBotaoPrimario,
  Zo as UICampoTexto,
  cs as UICanvasCAD,
  Na as UICard,
  Ro as UICheckbox,
  za as UIChip,
  Ra as UIDialog,
  La as UIIcone,
  gi as UIListaFlutuante,
  ja as UIMapa,
  Ka as UIMapaLinha,
  Ya as UIMapaMarcador,
  Se as UIModal,
  qa as UIPopover,
  ui as UIRadio,
  xa as UISelect,
  _i as UISwitch,
  Wa as UITabela,
  Ta as UITag,
  wa as UITexto,
  bi as UIToast,
  Ma as UIToggle,
  Ho as UITooltip,
  is as VectorLinesLayerRenderer,
  os as VectorPointsLayerRenderer,
  ns as VectorPolygonsLayerRenderer,
  es as WmsLayerRenderer,
  $ as escapeHtml,
  ds as formatUTM,
  mi as getPointShapeHtml
};
