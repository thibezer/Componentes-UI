var la = Object.defineProperty;
var ha = (S, Z, o) => Z in S ? la(S, Z, { enumerable: !0, configurable: !0, writable: !0, value: o }) : S[Z] = o;
var f = (S, Z, o) => ha(S, typeof Z != "symbol" ? Z + "" : Z, o);
const ua = ':host{display:inline-block;width:100%;height:100%;box-sizing:border-box}:host([inline]){width:auto;height:auto}.ui-botao-primario{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;height:100%;min-height:var(--ui-altura-minima, 20px);box-sizing:border-box;padding:0 clamp(6px,1.2vw,16px);border:1px solid transparent;border-radius:var(--ui-raio-borda, 6px);font-family:var(--ui-fonte-base, "Inter", sans-serif);font-size:clamp(11px,.8rem,14px);font-weight:600;line-height:1;cursor:pointer;transition:background-color .15s ease,border-color .15s ease,color .15s ease,filter .15s ease,transform .1s ease;text-align:center;-webkit-user-select:none;user-select:none}.ui-botao-primario,.ui-botao-primario--primary,.ui-botao-primario--primario{background:var(--ui-cor-primaria, #00E08A);color:var(--ui-cor-texto-sobre-primaria, #000000);border-color:transparent}.ui-botao-primario--primary:hover:not(:disabled),.ui-botao-primario--primario:hover:not(:disabled),.ui-botao-primario:hover:not(:disabled){filter:brightness(1.1)}.ui-botao-primario--destaque{background:var(--ui-cor-destaque, var(--ui-cor-primaria, #00E08A));color:var(--ui-cor-texto-sobre-primaria, #000000)}.ui-botao-primario--secondary,.ui-botao-primario--secundario{background:var(--ui-cor-botao-secundario-fundo, #1e1e24);color:var(--ui-cor-texto, #e1e1e6);border-color:var(--ui-cor-borda, rgba(255, 255, 255, .12))}.ui-botao-primario--secondary:hover:not(:disabled),.ui-botao-primario--secundario:hover:not(:disabled){background:var(--ui-cor-botao-secundario-hover, #2a2a34);border-color:#ffffff3d}.ui-botao-primario--ghost,.ui-botao-primario--terciario{background:transparent;color:var(--ui-cor-texto, #e1e1e6);border-color:transparent}.ui-botao-primario--ghost:hover:not(:disabled),.ui-botao-primario--terciario:hover:not(:disabled){background:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-botao-primario--destructive,.ui-botao-primario--destrutivo,.ui-botao-primario--erro{background:var(--ui-cor-botao-destrutivo-fundo, #ff4444);color:var(--ui-cor-botao-destrutivo-texto, #ffffff);border-color:transparent}.ui-botao-primario--destructive:hover:not(:disabled),.ui-botao-primario--destrutivo:hover:not(:disabled),.ui-botao-primario--erro:hover:not(:disabled){background:var(--ui-cor-botao-destrutivo-hover, #e03333)}.ui-botao-primario--icon-only,.ui-botao-primario--icone{padding:0;width:var(--ui-altura-minima, 20px);min-width:var(--ui-altura-minima, 20px);height:var(--ui-altura-minima, 20px);aspect-ratio:1;border-radius:var(--ui-raio-borda, 6px)}.ui-botao-primario--hover{filter:brightness(1.15)!important}.ui-botao-primario:active:not(:disabled),.ui-botao-primario--active{transform:scale(.97)!important;filter:brightness(.9)!important}.ui-botao-primario:disabled,.ui-botao-primario--disabled{opacity:.45;cursor:not-allowed;transform:none!important;filter:none!important}.ui-botao-primario--carregando,.ui-botao-primario--loading{cursor:wait;opacity:.85;pointer-events:none}.ui-botao-primario__spinner{width:1.1em;height:1.1em;animation:ui-spin .75s linear infinite;flex-shrink:0}@keyframes ui-spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}';
class zn extends HTMLElement {
  constructor() {
    super();
    f(this, "button");
    f(this, "spinnerContainer");
    f(this, "handleClick", (o) => {
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
      <style>${ua}</style>
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
  attributeChangedCallback(o, s, h) {
    this.syncState();
  }
  get carregando() {
    return this.hasAttribute("carregando") || this.hasAttribute("loading");
  }
  set carregando(o) {
    o ? this.setAttribute("carregando", "") : (this.removeAttribute("carregando"), this.removeAttribute("loading"));
  }
  syncState() {
    const o = this.carregando, s = this.hasAttribute("disabled") || o, h = this.getAttribute("variante") || "primario", p = this.getAttribute("estado");
    this.button.disabled = s, this.spinnerContainer.style.display = o ? "inline-flex" : "none";
    const c = ["ui-botao-primario", `ui-botao-primario--${h}`];
    s && !o && c.push("ui-botao-primario--disabled"), o && c.push("ui-botao-primario--carregando"), p && c.push(`ui-botao-primario--${p}`), this.button.className = c.join(" ");
  }
}
class ca extends zn {
}
customElements.get("ui-botao") || customElements.define("ui-botao", zn);
customElements.get("ui-botao-primario") || customElements.define("ui-botao-primario", ca);
const da = ':host{display:inline-block;position:relative;width:100%;height:100%;box-sizing:border-box}.ui-lista-flutuante__gatilho{display:flex;align-items:center;justify-content:space-between;gap:4px;width:100%;height:100%;min-height:var(--ui-altura-minima, 15px);padding:0 clamp(4px,.8vw,8px);background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 6px);font-family:var(--ui-fonte-base, "Inter", sans-serif);font-size:clamp(11px,.8rem,14px);line-height:1;cursor:pointer;box-sizing:border-box;transition:border-color .15s ease,background-color .15s ease}.ui-lista-flutuante__gatilho:hover:not(:disabled){border-color:var(--ui-cor-primaria, #00E08A)}.ui-lista-flutuante__gatilho:disabled{opacity:.5;cursor:not-allowed}.ui-lista-flutuante__texto{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}.ui-lista-flutuante__seta{font-size:clamp(8px,.65rem,11px);transition:transform .2s ease;color:var(--ui-cor-texto-secundario, #888899);flex-shrink:0}:host([aberta]) .ui-lista-flutuante__seta{transform:rotate(180deg)}.ui-lista-flutuante__backdrop{display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background-color:#0009;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);z-index:9998;opacity:0;transition:opacity .2s ease}:host([aberta]) .ui-lista-flutuante__backdrop{display:block;opacity:1}.ui-lista-flutuante__conteudo{position:fixed;margin:0;padding:2px;list-style:none;background-color:var(--ui-cor-fundo-menu, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 6px);box-shadow:0 8px 24px #00000080;max-height:150px;overflow-y:auto;z-index:9999;box-sizing:border-box;inset:auto}.ui-lista-flutuante__handle{display:none;width:36px;height:4px;border-radius:2px;background-color:#ffffff40;margin:4px auto 10px}.ui-lista-flutuante__item{padding:4px 8px;font-family:var(--ui-fonte-base, "Inter", sans-serif);font-size:clamp(11px,.8rem,13px);line-height:1.2;color:var(--ui-cor-texto, #e1e1e6);border-radius:4px;cursor:pointer;transition:background-color .12s ease,color .12s ease}.ui-lista-flutuante__item:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-lista-flutuante__item--selecionado{background-color:#00e08a26;color:var(--ui-cor-primaria, #00E08A);font-weight:600}@media (max-width: 640px){.ui-lista-flutuante__conteudo{position:fixed!important;bottom:0!important;top:auto!important;left:0!important;width:100vw!important;max-width:100vw!important;min-width:100vw!important;max-height:60vh!important;border-radius:16px 16px 0 0!important;border-bottom:none!important;padding:10px 14px 24px!important;box-shadow:0 -8px 32px #000000b3!important;animation:ui-bottom-sheet-slide .25s cubic-bezier(.4,0,.2,1)}.ui-lista-flutuante__handle{display:block!important}.ui-lista-flutuante__item{padding:12px 16px!important;font-size:15px!important;margin-bottom:2px}}:host([bottom-sheet]) .ui-lista-flutuante__conteudo,:host([modo-mobile]) .ui-lista-flutuante__conteudo{position:fixed!important;bottom:0!important;top:auto!important;left:0!important;width:100vw!important;max-width:100vw!important;min-width:100vw!important;max-height:60vh!important;border-radius:16px 16px 0 0!important;border-bottom:none!important;padding:10px 14px 24px!important;box-shadow:0 -8px 32px #000000b3!important;animation:ui-bottom-sheet-slide .25s cubic-bezier(.4,0,.2,1)}:host([bottom-sheet]) .ui-lista-flutuante__handle,:host([modo-mobile]) .ui-lista-flutuante__handle{display:block!important}:host([bottom-sheet]) .ui-lista-flutuante__item,:host([modo-mobile]) .ui-lista-flutuante__item{padding:12px 16px!important;font-size:15px!important;margin-bottom:2px}@keyframes ui-bottom-sheet-slide{0%{transform:translateY(100%)}to{transform:translateY(0)}}';
class hi extends HTMLElement {
  constructor() {
    super();
    f(this, "internals");
    f(this, "button");
    f(this, "content");
    f(this, "textoElement");
    f(this, "backdropElement");
    f(this, "_itens", []);
    f(this, "_value", "");
    f(this, "observer");
    f(this, "focusedIndex", -1);
    f(this, "toggleLista", (o) => {
      o.stopPropagation(), !this.hasAttribute("disabled") && (this.hasAttribute("aberta") ? this.fechar() : this.abrir());
    });
    f(this, "handleKeyDown", (o) => {
      this.hasAttribute("disabled") || (o.key === "Enter" || o.key === " " || o.key === "ArrowDown") && (o.preventDefault(), this.hasAttribute("aberta") ? this.focarPrimeiroItem() : this.abrir());
    });
    f(this, "handleListKeyDown", (o) => {
      this.hasAttribute("aberta") && (o.key === "ArrowDown" ? (o.preventDefault(), this.moverFoco(1)) : o.key === "ArrowUp" ? (o.preventDefault(), this.moverFoco(-1)) : o.key === "Enter" || o.key === " " ? (o.preventDefault(), this.focusedIndex >= 0 && this.focusedIndex < this._itens.length && this.selecionarItem(this._itens[this.focusedIndex])) : o.key === "Escape" && (o.preventDefault(), this.fechar(), this.button.focus()));
    });
    f(this, "fechar", () => {
      if (this.removeAttribute("aberta"), window.removeEventListener("scroll", this.fechar, { capture: !0 }), window.removeEventListener("resize", this.posicionarConteudo), typeof this.content.hidePopover == "function")
        try {
          this.content.hidePopover();
        } catch {
        }
    });
    f(this, "posicionarConteudo", () => {
      if (this.isMobileOrBottomSheet()) {
        this.content.style.top = "", this.content.style.left = "", this.content.style.minWidth = "";
        return;
      }
      const o = this.button.getBoundingClientRect();
      this.content.style.top = `${o.bottom + 2}px`, this.content.style.left = `${o.left}px`, this.content.style.minWidth = `${Math.max(o.width, 110)}px`;
    });
    f(this, "handleClickFora", (o) => {
      const s = o.composedPath();
      !s.includes(this) && !s.includes(this.content) && this.fechar();
    });
    this.internals = this.attachInternals();
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${da}</style>
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
    o.length > 0 && (this._itens = o.map((s, h) => {
      var p;
      return {
        id: s.getAttribute("value") || String(h + 1),
        label: ((p = s.textContent) == null ? void 0 : p.trim()) || s.getAttribute("value") || `Opção ${h + 1}`
      };
    }), this.renderItens(), this.syncLabel());
  }
  disconnectedCallback() {
    this.button.removeEventListener("click", this.toggleLista), this.button.removeEventListener("keydown", this.handleKeyDown), this.content.removeEventListener("keydown", this.handleListKeyDown), this.backdropElement.removeEventListener("click", this.fechar), document.removeEventListener("click", this.handleClickFora), this.observer && this.observer.disconnect(), this.fechar();
  }
  attributeChangedCallback(o, s, h) {
    o === "aberta" && this.button.setAttribute("aria-expanded", String(h !== null)), o === "texto-padrao" && this.syncLabel(), o === "value" && h !== this._value && (this.value = h || ""), o === "disabled" && (this.button.disabled = h !== null);
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
      const s = document.createElement("li"), h = String(o.id) === String(this._value);
      s.className = `ui-lista-flutuante__item ${h ? "ui-lista-flutuante__item--selecionado" : ""}`, s.setAttribute("data-id", o.id), s.textContent = o.label, s.role = "option", s.tabIndex = -1, h && s.setAttribute("aria-selected", "true"), s.addEventListener("click", (p) => {
        p.stopPropagation(), this.selecionarItem(o);
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
f(hi, "formAssociated", !0);
class fa extends hi {
}
customElements.get("ui-lista-flutuante") || customElements.define("ui-lista-flutuante", hi);
customElements.get("ui-select") || customElements.define("ui-select", fa);
const pa = ':host{display:block;box-sizing:border-box;margin:0;padding:0;color:var(--ui-cor-texto, #e1e1e6);font-family:var(--ui-fonte-base, "Inter", sans-serif)}:host([inline]){display:inline-block}.ui-texto{margin:0;padding:0;box-sizing:border-box;font-family:inherit;color:inherit;font-size:inherit;font-weight:inherit;line-height:inherit}.ui-texto--h1{font-size:var(--ui-tamanho-h1, clamp(24px, 4vw, 36px));font-weight:var(--ui-peso-negrito, 700);line-height:var(--ui-altura-linha-titulo, 1.25);letter-spacing:-.5px}.ui-texto--h2{font-size:var(--ui-tamanho-h2, clamp(20px, 3vw, 28px));font-weight:var(--ui-peso-seminegrito, 600);line-height:var(--ui-altura-linha-titulo, 1.25);letter-spacing:-.3px}.ui-texto--h3{font-size:var(--ui-tamanho-h3, clamp(18px, 2.4vw, 24px));font-weight:var(--ui-peso-seminegrito, 600);line-height:var(--ui-altura-linha-titulo, 1.25)}.ui-texto--h4{font-size:var(--ui-tamanho-h4, clamp(16px, 2vw, 20px));font-weight:var(--ui-peso-medio, 500);line-height:var(--ui-altura-linha-titulo, 1.25)}.ui-texto--h5{font-size:var(--ui-tamanho-h5, clamp(14px, 1.6vw, 18px));font-weight:var(--ui-peso-medio, 500);line-height:var(--ui-altura-linha-titulo, 1.25)}.ui-texto--h6{font-size:var(--ui-tamanho-h6, clamp(13px, 1.2vw, 16px));font-weight:var(--ui-peso-seminegrito, 600);line-height:var(--ui-altura-linha-titulo, 1.25);text-transform:uppercase;letter-spacing:.5px}.ui-texto--corpo{font-size:var(--ui-tamanho-corpo, 14px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-corpo, 1.5)}.ui-texto--corpo-sm{font-size:var(--ui-tamanho-corpo-sm, 13px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-corpo, 1.5)}.ui-texto--caption{font-size:var(--ui-tamanho-caption, 11px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-compacta, 1.2);color:var(--ui-cor-texto-secundario, #888899)}.ui-texto--codigo{font-family:var(--ui-fonte-codigo, monospace);font-size:var(--ui-tamanho-codigo, 12px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-corpo, 1.5);background:var(--ui-cor-fundo-elevado, #1a1a1e);padding:2px 6px;border-radius:4px;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12))}.ui-texto--cor-primaria{color:var(--ui-cor-primaria, #00E08A)}.ui-texto--cor-secundaria{color:var(--ui-cor-texto-secundario, #888899)}.ui-texto--cor-destaque{color:var(--ui-cor-destaque, #00E08A)}.ui-texto--cor-erro{color:var(--ui-cor-texto-erro, #ff5555)}.ui-texto--cor-sucesso{color:var(--ui-cor-texto-sucesso, #00E08A)}.ui-texto--cor-alerta{color:var(--ui-cor-texto-alerta, #ffb86c)}.ui-texto--peso-normal{font-weight:var(--ui-peso-normal, 400)!important}.ui-texto--peso-medio{font-weight:var(--ui-peso-medio, 500)!important}.ui-texto--peso-seminegrito{font-weight:var(--ui-peso-seminegrito, 600)!important}.ui-texto--peso-negrito{font-weight:var(--ui-peso-negrito, 700)!important}.ui-texto--alinhamento-esquerda{text-align:left}.ui-texto--alinhamento-centro{text-align:center}.ui-texto--alinhamento-direita{text-align:right}.ui-texto--alinhamento-justificado{text-align:justify}.ui-texto--truncar{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}';
class ma extends HTMLElement {
  constructor() {
    super();
    f(this, "container");
    f(this, "shadow");
    this.shadow = this.attachShadow({ mode: "open" }), this.container = document.createElement("p"), this.container.className = "ui-texto ui-texto--corpo", this.container.appendChild(document.createElement("slot")), this.shadow.innerHTML = `<style>${pa}</style>`, this.shadow.appendChild(this.container);
  }
  static get observedAttributes() {
    return ["variante", "tag", "cor", "peso", "alinhamento", "truncar"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback(o, s, h) {
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
    const o = this.resolveTag(), s = this.getAttribute("variante") || "corpo", h = this.getAttribute("cor"), p = this.getAttribute("peso"), c = this.getAttribute("alinhamento"), v = this.hasAttribute("truncar");
    if (this.container.tagName.toLowerCase() !== o) {
      const T = document.createElement(o);
      T.appendChild(document.createElement("slot")), this.shadow.replaceChild(T, this.container), this.container = T;
    }
    const _ = ["ui-texto", `ui-texto--${s}`];
    h && _.push(`ui-texto--cor-${h}`), p && _.push(`ui-texto--peso-${p}`), c && _.push(`ui-texto--alinhamento-${c}`), v && _.push("ui-texto--truncar"), this.container.className = _.join(" ");
  }
}
customElements.get("ui-texto") || customElements.define("ui-texto", ma);
const _a = ':host{display:flex;flex-direction:column;gap:4px;width:100%;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-campo-texto__container{position:relative;width:100%;display:flex;flex-direction:column}:host([label-flutuante]) .ui-campo-texto__container{margin-top:10px}.ui-campo-texto__label{display:flex;align-items:center;justify-content:space-between;font-size:var(--ui-tamanho-corpo-sm, 13px);font-weight:var(--ui-peso-medio, 500);color:var(--ui-cor-texto, #e1e1e6);-webkit-user-select:none;user-select:none;margin-bottom:4px}.ui-campo-texto__wrapper{position:relative;display:flex;align-items:center;width:100%;min-height:var(--ui-altura-minima, 15px);background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 6px);padding:0 6px;gap:6px;box-sizing:border-box;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease}.ui-campo-texto__wrapper--foco{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a2e;background-color:var(--ui-cor-fundo-menu, #18181c)}.ui-campo-texto__wrapper--erro{border-color:var(--ui-cor-texto-erro, #ff5555)!important;box-shadow:0 0 0 2px #ff55552e!important}.ui-campo-texto__wrapper--disabled{opacity:.5;cursor:not-allowed;background-color:#ffffff08}.ui-campo-texto__input{flex:1;width:100%;height:100%;min-height:0;background:transparent;border:none;outline:none;color:var(--ui-cor-texto, #e1e1e6);font-family:inherit;font-size:clamp(11px,.8rem,14px);line-height:1;padding:0;margin:0;box-sizing:border-box}.ui-campo-texto__input::placeholder{color:var(--ui-cor-texto-secundario, #888899);opacity:.65}.ui-campo-texto__input:disabled{cursor:not-allowed}.ui-campo-texto__icone{display:inline-flex;align-items:center;justify-content:center;color:var(--ui-cor-texto-secundario, #888899);flex-shrink:0;font-size:14px}.ui-campo-texto__icone--clicavel{cursor:pointer;-webkit-user-select:none;user-select:none;transition:opacity .15s ease,transform .15s ease}.ui-campo-texto__icone--clicavel:hover{opacity:.85;transform:scale(1.1)}:host([label-flutuante]) .ui-campo-texto__label{position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--ui-cor-texto-secundario, #888899);pointer-events:none;z-index:3;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);padding:0 4px;border-radius:3px;margin-bottom:0;white-space:nowrap;max-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis;transition:top .15s cubic-bezier(.4,0,.2,1),transform .15s cubic-bezier(.4,0,.2,1),color .15s ease,font-size .15s ease}:host([label-flutuante][tem-icone-esquerda]) .ui-campo-texto__label{left:28px}:host([label-flutuante]) .ui-campo-texto__label--ativa{top:-10px;left:8px!important;transform:translateY(0) scale(.85);transform-origin:left top;font-weight:600;color:var(--ui-cor-primaria, #00E08A);background-color:var(--ui-cor-fundo-elevado, #1a1a1e)}:host([label-flutuante][erro]) .ui-campo-texto__label--ativa,:host([label-flutuante][mensagem-erro]) .ui-campo-texto__label--ativa{color:var(--ui-cor-texto-erro, #ff5555)}.ui-campo-texto__helper{font-size:var(--ui-tamanho-caption, 11px);color:var(--ui-cor-texto-secundario, #888899);line-height:var(--ui-altura-linha-compacta, 1.2);margin-top:2px}.ui-campo-texto__helper--erro{color:var(--ui-cor-texto-erro, #ff5555);font-weight:500;display:flex;align-items:center;gap:4px}';
class Sn extends HTMLElement {
  constructor() {
    super();
    f(this, "internals");
    f(this, "labelElement");
    f(this, "wrapperElement");
    f(this, "inputElement");
    f(this, "helperElement");
    f(this, "rightIconContainer");
    f(this, "leftSlotElement");
    f(this, "_senhaVisivel", !1);
    f(this, "_checkTimer", null);
    f(this, "_focado", !1);
    f(this, "_inputId");
    f(this, "handleSlotChange", () => {
      this.syncState();
    });
    f(this, "handleRightIconClick", (o) => {
      (this.getAttribute("tipo") === "password" || this.hasAttribute("alternar-senha")) && (o.stopPropagation(), this.alternarVisibilidadeSenha());
    });
    f(this, "handleFocus", () => {
      this._focado = !0, this.wrapperElement.classList.add("ui-campo-texto__wrapper--foco"), this.syncState();
    });
    f(this, "handleBlur", () => {
      this._focado = !1, this.wrapperElement.classList.remove("ui-campo-texto__wrapper--foco"), this.syncState();
    });
    f(this, "handleInput", (o) => {
      const s = o.target.value;
      this.internals.setFormValue(s), this.syncState(), this.dispatchEvent(
        new CustomEvent("ui-input", {
          detail: { value: s },
          bubbles: !0,
          composed: !0
        })
      );
    });
    f(this, "handleChange", (o) => {
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
      <style>${_a}</style>
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
  attributeChangedCallback(o, s, h) {
    const p = this._focado;
    o === "value" && h !== this.inputElement.value && !p && (this.inputElement.value = h || ""), this.syncState();
  }
  get value() {
    return this.inputElement.value;
  }
  set value(o) {
    this.inputElement.value = o, this.setAttribute("value", o), this.syncState();
  }
  alternarVisibilidadeSenha() {
    var h;
    if (!(this.getAttribute("tipo") === "password" || this._senhaVisivel)) return;
    this._senhaVisivel = !this._senhaVisivel, this.inputElement.type = this._senhaVisivel ? "text" : "password";
    const s = (h = this.shadowRoot) == null ? void 0 : h.querySelector('slot[name="icone-direita"]');
    s && s.assignedElements().forEach((c) => {
      var v, _;
      (((v = c.textContent) == null ? void 0 : v.trim()) === "👁️" || ((_ = c.textContent) == null ? void 0 : _.trim()) === "🙈") && (c.textContent = this._senhaVisivel ? "🙈" : "👁️");
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
    const s = this.getAttribute("label"), h = this.hasAttribute("label-flutuante"), p = this.inputElement.value.trim() !== "", c = this._focado, v = (() => {
      try {
        return this.inputElement.matches(":-webkit-autofill");
      } catch {
        return !1;
      }
    })();
    s ? (this.labelElement.textContent = s, this.labelElement.style.display = "flex", h ? c || p || v ? this.labelElement.classList.add("ui-campo-texto__label--ativa") : this.labelElement.classList.remove("ui-campo-texto__label--ativa") : this.labelElement.classList.remove("ui-campo-texto__label--ativa")) : this.labelElement.style.display = "none";
    const _ = this.getAttribute("placeholder") || "";
    h && !c && !p && !v ? this.inputElement.placeholder = "" : this.inputElement.placeholder = _;
    const T = this.getAttribute("tipo") || "text";
    this._senhaVisivel || (this.inputElement.type = T), this.internals.setFormValue(this.inputElement.value);
    const O = this.hasAttribute("disabled"), w = this.hasAttribute("readonly");
    this.inputElement.disabled = O, this.inputElement.readOnly = w, O ? this.wrapperElement.classList.add("ui-campo-texto__wrapper--disabled") : this.wrapperElement.classList.remove("ui-campo-texto__wrapper--disabled"), T === "password" || this.hasAttribute("alternar-senha") ? this.rightIconContainer.classList.add("ui-campo-texto__icone--clicavel") : this.rightIconContainer.classList.remove("ui-campo-texto__icone--clicavel");
    const C = this.hasAttribute("erro") || this.hasAttribute("mensagem-erro"), W = this.getAttribute("mensagem-erro"), N = this.getAttribute("helper-text");
    C ? this.wrapperElement.classList.add("ui-campo-texto__wrapper--erro") : this.wrapperElement.classList.remove("ui-campo-texto__wrapper--erro"), C && W ? (this.helperElement.textContent = `⚠️ ${W}`, this.helperElement.className = "ui-campo-texto__helper ui-campo-texto__helper--erro", this.helperElement.style.display = "block") : N ? (this.helperElement.textContent = N, this.helperElement.className = "ui-campo-texto__helper", this.helperElement.style.display = "block") : this.helperElement.style.display = "none";
  }
  formResetCallback() {
    this.inputElement.value = "", this.removeAttribute("value"), this.syncState();
  }
}
f(Sn, "formAssociated", !0);
customElements.get("ui-campo-texto") || customElements.define("ui-campo-texto", Sn);
const ga = ':host{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;line-height:1;color:inherit;flex-shrink:0;width:var(--ui-tamanho-icone, 20px);height:var(--ui-tamanho-icone, 20px);box-sizing:border-box}.ui-icone{display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;color:inherit;font-size:var(--ui-tamanho-icone, 20px)}::slotted(svg),.ui-icone svg{width:100%!important;height:100%!important;display:block}:host([cor="primaria"]),:host([color="primaria"]){color:var(--ui-cor-primaria, #00E08A)}:host([cor="secundaria"]),:host([color="secundaria"]){color:var(--ui-cor-texto-secundario, #888899)}:host([cor="erro"]),:host([color="erro"]){color:var(--ui-cor-texto-erro, #ff5555)}:host([cor="sucesso"]),:host([color="sucesso"]){color:var(--ui-cor-texto-sucesso, #00E08A)}:host([cor="alerta"]),:host([color="alerta"]){color:var(--ui-cor-texto-alerta, #ffb86c)}', Pn = {
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
class va extends HTMLElement {
  constructor() {
    super();
    f(this, "iconContainer");
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${ga}</style>
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
  attributeChangedCallback(o, s, h) {
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
    var h;
    const o = this.resolveTamanhoPx();
    this.style.setProperty("--ui-tamanho-icone", o);
    const s = this.getAttribute("nome") || this.getAttribute("name");
    if (s && Pn[s]) {
      const p = (h = this.shadowRoot) == null ? void 0 : h.querySelector("slot");
      p && p.assignedNodes().length === 0 && (this.iconContainer.innerHTML = Pn[s]);
    }
  }
}
customElements.get("ui-icone") || customElements.define("ui-icone", va);
const ba = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-checkbox{display:inline-flex;align-items:center;gap:8px;cursor:pointer;-webkit-user-select:none;user-select:none;line-height:1;outline:none}.ui-checkbox--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-checkbox__box{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;min-width:16px;min-height:16px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:4px;box-sizing:border-box;transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease;flex-shrink:0}.ui-checkbox:focus-visible .ui-checkbox__box,.ui-checkbox--foco .ui-checkbox__box{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a40}.ui-checkbox--checked .ui-checkbox__box,.ui-checkbox--indeterminate .ui-checkbox__box{background-color:var(--ui-cor-primaria, #00E08A);border-color:var(--ui-cor-primaria, #00E08A);color:var(--ui-cor-texto-sobre-primaria, #000000)}.ui-checkbox__mark{width:12px;height:12px;display:flex;align-items:center;justify-content:center;transition:transform .15s cubic-bezier(.4,0,.2,1),opacity .15s ease;transform:scale(0);opacity:0}.ui-checkbox--checked .ui-checkbox__mark,.ui-checkbox--indeterminate .ui-checkbox__mark{transform:scale(1);opacity:1}.ui-checkbox__mark svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.ui-checkbox__label{font-size:clamp(11px,.8rem,14px);color:var(--ui-cor-texto, #e1e1e6);line-height:1}.ui-checkbox--label-esquerda{flex-direction:row-reverse}';
class Mn extends HTMLElement {
  constructor() {
    super();
    f(this, "internals");
    f(this, "containerElement");
    f(this, "markElement");
    f(this, "labelElement");
    f(this, "handleClick", (o) => {
      o.preventDefault(), this.alternar();
    });
    f(this, "handleKeyDown", (o) => {
      (o.key === " " || o.key === "Enter") && (o.preventDefault(), this.alternar());
    });
    f(this, "handleFocus", () => {
      this.containerElement.classList.add("ui-checkbox--foco");
    });
    f(this, "handleBlur", () => {
      this.containerElement.classList.remove("ui-checkbox--foco");
    });
    this.internals = this.attachInternals();
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${ba}</style>
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
  attributeChangedCallback(o, s, h) {
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
    const o = this.marcado, s = this.indeterminado, h = this.disabled, p = this.getAttribute("label"), c = this.getAttribute("posicao-label") || "direita";
    this.containerElement.setAttribute(
      "aria-checked",
      s ? "mixed" : String(o)
    ), h ? (this.containerElement.classList.add("ui-checkbox--disabled"), this.containerElement.setAttribute("tabindex", "-1"), this.containerElement.setAttribute("aria-disabled", "true")) : (this.containerElement.classList.remove("ui-checkbox--disabled"), this.containerElement.setAttribute("tabindex", "0"), this.containerElement.removeAttribute("aria-disabled")), o ? this.containerElement.classList.add("ui-checkbox--checked") : this.containerElement.classList.remove("ui-checkbox--checked"), s ? this.containerElement.classList.add("ui-checkbox--indeterminate") : this.containerElement.classList.remove("ui-checkbox--indeterminate"), c === "esquerda" ? this.containerElement.classList.add("ui-checkbox--label-esquerda") : this.containerElement.classList.remove("ui-checkbox--label-esquerda"), s ? this.markElement.innerHTML = `
        <svg viewBox="0 0 24 24">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      ` : o ? this.markElement.innerHTML = `
        <svg viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      ` : this.markElement.innerHTML = "", p ? (this.labelElement.textContent = p, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", o ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null);
  }
  formResetCallback() {
    this.marcado = this.hasAttribute("checked"), this.indeterminado = this.hasAttribute("indeterminate");
  }
}
f(Mn, "formAssociated", !0);
customElements.get("ui-checkbox") || customElements.define("ui-checkbox", Mn);
const xa = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-radio{display:inline-flex;align-items:center;gap:8px;cursor:pointer;-webkit-user-select:none;user-select:none;line-height:1;outline:none}.ui-radio--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-radio__circle{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;min-width:16px;min-height:16px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:50%;box-sizing:border-box;transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease;flex-shrink:0}.ui-radio:focus-visible .ui-radio__circle,.ui-radio--foco .ui-radio__circle{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a40}.ui-radio--checked .ui-radio__circle{border-color:var(--ui-cor-primaria, #00E08A)}.ui-radio__dot{width:8px;height:8px;border-radius:50%;background-color:var(--ui-cor-primaria, #00E08A);transition:transform .15s cubic-bezier(.4,0,.2,1),opacity .15s ease;transform:scale(0);opacity:0}.ui-radio--checked .ui-radio__dot{transform:scale(1);opacity:1}.ui-radio__label{font-size:clamp(11px,.8rem,14px);color:var(--ui-cor-texto, #e1e1e6);line-height:1}.ui-radio--label-esquerda{flex-direction:row-reverse}', X = class X extends HTMLElement {
  constructor() {
    super();
    f(this, "internals");
    f(this, "containerElement");
    f(this, "labelElement");
    f(this, "handleClick", (o) => {
      o.preventDefault(), this.selecionar(), this.containerElement.focus();
    });
    f(this, "handleKeyDown", (o) => {
      if (o.key === " " || o.key === "Enter")
        o.preventDefault(), this.selecionar();
      else if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(o.key)) {
        o.preventDefault();
        const s = this.name;
        if (!s || !X._registry.has(s)) return;
        const h = Array.from(X._registry.get(s));
        if (h.length <= 1) return;
        const p = h.indexOf(this);
        let c = p;
        if (o.key === "ArrowDown" || o.key === "ArrowRight" ? c = (p + 1) % h.length : (o.key === "ArrowUp" || o.key === "ArrowLeft") && (c = (p - 1 + h.length) % h.length), c !== p) {
          const v = h[c];
          v.selecionar(), v.containerElement.focus();
        }
      }
    });
    f(this, "handleFocus", () => {
      this.containerElement.classList.add("ui-radio--foco");
    });
    f(this, "handleBlur", () => {
      this.containerElement.classList.remove("ui-radio--foco");
    });
    this.internals = this.attachInternals();
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${xa}</style>
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
    o && (X._registry.has(o) || X._registry.set(o, /* @__PURE__ */ new Set()), X._registry.get(o).add(this));
  }
  unregister() {
    const o = this.name;
    o && X._registry.has(o) && X._registry.get(o).delete(this);
  }
  attributeChangedCallback(o, s, h) {
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
    o && X._registry.has(o) && X._registry.get(o).forEach((h) => {
      h !== this && (h.removeAttribute("marcado"), h.removeAttribute("checked"), h.syncState());
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
    const o = this.marcado, s = this.disabled, h = this.getAttribute("label"), p = this.getAttribute("posicao-label") || "direita";
    if (this.containerElement.setAttribute("aria-checked", String(o)), s)
      this.containerElement.classList.add("ui-radio--disabled"), this.containerElement.setAttribute("tabindex", "-1"), this.containerElement.setAttribute("aria-disabled", "true");
    else {
      this.containerElement.classList.remove("ui-radio--disabled"), this.containerElement.removeAttribute("aria-disabled");
      const c = this.name;
      if (c && X._registry.has(c)) {
        const v = Array.from(X._registry.get(c));
        v.some((T) => T.marcado) ? this.containerElement.setAttribute("tabindex", o ? "0" : "-1") : this.containerElement.setAttribute("tabindex", v[0] === this ? "0" : "-1");
      } else
        this.containerElement.setAttribute("tabindex", "0");
    }
    o ? this.containerElement.classList.add("ui-radio--checked") : this.containerElement.classList.remove("ui-radio--checked"), p === "esquerda" ? this.containerElement.classList.add("ui-radio--label-esquerda") : this.containerElement.classList.remove("ui-radio--label-esquerda"), h ? (this.labelElement.textContent = h, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", o ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null);
  }
  formResetCallback() {
    const o = this.hasAttribute("checked");
    o ? this.setAttribute("marcado", "") : this.removeAttribute("marcado"), o ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null), this.syncState();
  }
};
f(X, "formAssociated", !0), // Registro global de grupos de rádio para exclusividade mutua fora do shadow root
f(X, "_registry", /* @__PURE__ */ new Map());
let si = X;
customElements.get("ui-radio") || customElements.define("ui-radio", si);
const ya = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer;-webkit-user-select:none;user-select:none;line-height:1;outline:none}.ui-switch--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-switch__track{display:inline-flex;align-items:center;position:relative;width:36px;height:20px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:999px;box-sizing:border-box;padding:1px;transition:background-color .2s ease,border-color .2s ease,box-shadow .2s ease;flex-shrink:0}.ui-switch:focus-visible .ui-switch__track,.ui-switch--foco .ui-switch__track{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a40}.ui-switch--checked .ui-switch__track{background-color:var(--ui-cor-primaria, #00E08A);border-color:var(--ui-cor-primaria, #00E08A)}.ui-switch__thumb{display:block;width:16px;height:16px;background-color:#fff;border-radius:50%;box-shadow:0 1px 3px #0000004d;transition:transform .2s cubic-bezier(.4,0,.2,1),background-color .2s ease;transform:translate(0)}.ui-switch--checked .ui-switch__thumb{transform:translate(16px);background-color:var(--ui-cor-texto-sobre-primaria, #000000)}.ui-switch--sm .ui-switch__track{width:28px;height:16px;padding:1px}.ui-switch--sm .ui-switch__thumb{width:12px;height:12px}.ui-switch--sm.ui-switch--checked .ui-switch__thumb{transform:translate(12px)}.ui-switch--lg .ui-switch__track{width:44px;height:24px;padding:1px}.ui-switch--lg .ui-switch__thumb{width:20px;height:20px}.ui-switch--lg.ui-switch--checked .ui-switch__thumb{transform:translate(20px)}.ui-switch__label{font-size:clamp(11px,.8rem,14px);color:var(--ui-cor-texto, #e1e1e6);line-height:1}.ui-switch--label-esquerda{flex-direction:row-reverse}';
class ui extends HTMLElement {
  constructor() {
    super();
    f(this, "internals");
    f(this, "containerElement");
    f(this, "labelElement");
    f(this, "handleClick", (o) => {
      o.preventDefault(), this.alternar();
    });
    f(this, "handleKeyDown", (o) => {
      (o.key === " " || o.key === "Enter") && (o.preventDefault(), this.alternar());
    });
    f(this, "handleFocus", () => {
      this.containerElement.classList.add("ui-switch--foco");
    });
    f(this, "handleBlur", () => {
      this.containerElement.classList.remove("ui-switch--foco");
    });
    this.internals = this.attachInternals();
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${ya}</style>
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
  attributeChangedCallback(o, s, h) {
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
    const o = this.ativo, s = this.disabled, h = this.getAttribute("tamanho") || this.getAttribute("size") || "md", p = this.getAttribute("label"), c = this.getAttribute("posicao-label") || "direita";
    this.containerElement.setAttribute("aria-checked", String(o)), s ? (this.containerElement.classList.add("ui-switch--disabled"), this.containerElement.setAttribute("tabindex", "-1"), this.containerElement.setAttribute("aria-disabled", "true")) : (this.containerElement.classList.remove("ui-switch--disabled"), this.containerElement.setAttribute("tabindex", "0"), this.containerElement.removeAttribute("aria-disabled")), o ? this.containerElement.classList.add("ui-switch--checked") : this.containerElement.classList.remove("ui-switch--checked"), this.containerElement.classList.remove("ui-switch--sm", "ui-switch--md", "ui-switch--lg"), ["sm", "md", "lg"].includes(h) ? this.containerElement.classList.add(`ui-switch--${h}`) : this.containerElement.classList.add("ui-switch--md"), c === "esquerda" ? this.containerElement.classList.add("ui-switch--label-esquerda") : this.containerElement.classList.remove("ui-switch--label-esquerda"), p ? (this.labelElement.textContent = p, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", o ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null);
  }
  formResetCallback() {
    this.ativo = this.hasAttribute("checked") || this.hasAttribute("ligado");
  }
}
f(ui, "formAssociated", !0);
class wa extends ui {
}
customElements.get("ui-switch") || customElements.define("ui-switch", ui);
customElements.get("ui-toggle") || customElements.define("ui-toggle", wa);
const Ea = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-badge{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600;line-height:1;-webkit-user-select:none;user-select:none;box-sizing:border-box;transition:background-color .15s ease,color .15s ease,border-color .15s ease;white-space:nowrap}.ui-badge--suave{background-color:var(--ui-cor-badge-fundo, rgba(255, 255, 255, .08));color:var(--ui-cor-badge-texto, #e1e1e6);border:1px solid transparent}.ui-badge--solido{background-color:var(--ui-cor-badge-solido, #888899);color:#000;border:1px solid transparent}.ui-badge--contornado{background-color:transparent;color:var(--ui-cor-badge-texto, #e1e1e6);border:1px solid var(--ui-cor-badge-borda, rgba(255, 255, 255, .2))}.ui-badge--sucesso.ui-badge--suave{background-color:#00e08a26;color:var(--ui-cor-primaria, #00E08A)}.ui-badge--sucesso.ui-badge--solido{background-color:var(--ui-cor-primaria, #00E08A);color:#000}.ui-badge--sucesso.ui-badge--contornado{color:var(--ui-cor-primaria, #00E08A);border-color:#00e08a66}.ui-badge--erro.ui-badge--suave{background-color:#ff555526;color:var(--ui-cor-texto-erro, #ff5555)}.ui-badge--erro.ui-badge--solido{background-color:var(--ui-cor-texto-erro, #ff5555);color:#fff}.ui-badge--erro.ui-badge--contornado{color:var(--ui-cor-texto-erro, #ff5555);border-color:#f556}.ui-badge--alerta.ui-badge--suave{background-color:#ffb86c26;color:var(--ui-cor-texto-alerta, #ffb86c)}.ui-badge--alerta.ui-badge--solido{background-color:var(--ui-cor-texto-alerta, #ffb86c);color:#000}.ui-badge--alerta.ui-badge--contornado{color:var(--ui-cor-texto-alerta, #ffb86c);border-color:#ffb86c66}.ui-badge--info.ui-badge--suave,.ui-badge--primaria.ui-badge--suave{background-color:#00aaff26;color:#0af}.ui-badge--info.ui-badge--solido,.ui-badge--primaria.ui-badge--solido{background-color:#0af;color:#fff}.ui-badge--info.ui-badge--contornado,.ui-badge--primaria.ui-badge--contornado{color:#0af;border-color:#0af6}.ui-badge--neutro.ui-badge--suave{background-color:#ffffff14;color:var(--ui-cor-texto-secundario, #888899)}.ui-badge__close{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;cursor:pointer;opacity:.7;transition:opacity .15s ease,background-color .15s ease;font-size:10px;line-height:1;margin-left:2px}.ui-badge__close:hover{opacity:1;background-color:#fff3}';
class ci extends HTMLElement {
  constructor() {
    super();
    f(this, "badgeElement");
    f(this, "labelElement");
    f(this, "closeElement");
    f(this, "handleRemove", (o) => {
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
      <style>${Ea}</style>
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
  attributeChangedCallback(o, s, h) {
    this.syncState();
  }
  get removivel() {
    return this.hasAttribute("removivel") || this.hasAttribute("removable");
  }
  set removivel(o) {
    o ? this.setAttribute("removivel", "") : (this.removeAttribute("removivel"), this.removeAttribute("removable")), this.syncState();
  }
  syncState() {
    const o = this.getAttribute("variante") || this.getAttribute("variant") || "neutro", s = this.getAttribute("estilo") || "suave", h = this.getAttribute("label"), p = this.removivel;
    this.badgeElement.className = "ui-badge", this.badgeElement.classList.add(`ui-badge--${o}`), this.badgeElement.classList.add(`ui-badge--${s}`), h ? (this.labelElement.textContent = h, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", p ? this.closeElement.style.display = "inline-flex" : this.closeElement.style.display = "none";
  }
}
class ka extends ci {
}
class La extends ci {
}
customElements.get("ui-badge") || customElements.define("ui-badge", ci);
customElements.get("ui-chip") || customElements.define("ui-chip", ka);
customElements.get("ui-tag") || customElements.define("ui-tag", La);
const Aa = ':host{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle;position:relative}.ui-avatar{position:relative;display:inline-flex;align-items:center;justify-content:center;width:var(--ui-tamanho-avatar, 36px);height:var(--ui-tamanho-avatar, 36px);min-width:var(--ui-tamanho-avatar, 36px);min-height:var(--ui-tamanho-avatar, 36px);border-radius:50%;background-color:var(--ui-cor-fundo-elevado, #22222a);color:var(--ui-cor-primaria, #00E08A);font-weight:600;font-size:clamp(10px,.4 * var(--ui-tamanho-avatar, 36px),24px);-webkit-user-select:none;user-select:none;box-sizing:border-box;overflow:hidden;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));line-height:1}.ui-avatar__img{width:100%;height:100%;object-fit:cover;display:block}.ui-avatar--quadrado{border-radius:8px}.ui-avatar__status{position:absolute;bottom:0;right:0;width:25%;height:25%;min-width:8px;min-height:8px;max-width:14px;max-height:14px;border-radius:50%;border:2px solid var(--ui-cor-fundo-card, #121214);box-sizing:border-box}.ui-avatar__status--online{background-color:var(--ui-cor-primaria, #00E08A)}.ui-avatar__status--offline{background-color:#889}.ui-avatar__status--ausente{background-color:#ffb86c}.ui-avatar__status--ocupado{background-color:#f55}.ui-avatar--xs{--ui-tamanho-avatar: 20px}.ui-avatar--sm{--ui-tamanho-avatar: 28px}.ui-avatar--md{--ui-tamanho-avatar: 36px}.ui-avatar--lg{--ui-tamanho-avatar: 48px}.ui-avatar--xl{--ui-tamanho-avatar: 64px}';
class Ca extends HTMLElement {
  constructor() {
    super();
    f(this, "avatarElement");
    f(this, "statusElement");
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Aa}</style>
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
  attributeChangedCallback(o, s, h) {
    this.syncState();
  }
  extrairIniciais(o) {
    const s = o.trim().split(/\s+/).filter(Boolean);
    if (s.length === 0) return "?";
    if (s.length === 1)
      return s[0].substring(0, 2).toUpperCase();
    const h = s[0][0], p = s[s.length - 1][0];
    return (h + p).toUpperCase();
  }
  syncState() {
    const o = this.getAttribute("src"), s = this.getAttribute("nome") || this.getAttribute("name") || "", h = this.getAttribute("tamanho") || this.getAttribute("size") || "md", p = this.getAttribute("formato") || "circulo", c = this.getAttribute("status");
    this.avatarElement.className = "ui-avatar", ["xs", "sm", "md", "lg", "xl"].includes(h) ? this.avatarElement.classList.add(`ui-avatar--${h}`) : isNaN(parseInt(h, 10)) || this.avatarElement.style.setProperty("--ui-tamanho-avatar", `${parseInt(h, 10)}px`), p === "quadrado" && this.avatarElement.classList.add("ui-avatar--quadrado");
    const v = this.avatarElement.querySelector(".ui-avatar__content");
    if (v)
      if (o) {
        v.innerHTML = `<img class="ui-avatar__img" src="${o}" alt="${s || "Avatar"}" />`;
        const _ = v.querySelector("img");
        _ && (_.onerror = () => {
          this.renderFallback(v, s);
        });
      } else
        this.renderFallback(v, s);
    c && ["online", "offline", "ausente", "ocupado"].includes(c) ? (this.statusElement.className = `ui-avatar__status ui-avatar__status--${c}`, this.statusElement.style.display = "block") : this.statusElement.style.display = "none";
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
customElements.get("ui-avatar") || customElements.define("ui-avatar", Ca);
const Pa = ':host{display:block;width:100%;box-sizing:border-box}:host(.h-full),:host([style*="height: 100%"]){height:100%}.ui-card{display:flex;flex-direction:column;width:100%;height:100%;box-sizing:border-box;background-color:var(--ui-cor-fundo-card, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 8px);overflow:hidden;transition:transform .2s cubic-bezier(.4,0,.2,1),box-shadow .2s cubic-bezier(.4,0,.2,1),border-color .2s ease;color:var(--ui-cor-texto, #e1e1e6);font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-card--plano{background-color:var(--ui-cor-fundo-card, #18181c);box-shadow:none}.ui-card--elevado{background-color:var(--ui-cor-fundo-elevado, #1e1e24);box-shadow:0 8px 24px #0006;border-color:#ffffff14}.ui-card--destaque{border-color:var(--ui-cor-primaria, #00E08A);background-color:var(--ui-cor-fundo-card, #18181c);box-shadow:0 0 0 1px #00e08a40}.ui-card--clicavel{cursor:pointer;-webkit-user-select:none;user-select:none}.ui-card--clicavel:hover{transform:translateY(-3px);border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 10px 30px #00000080,0 0 15px #00e08a26}.ui-card--clicavel:active{transform:translateY(-1px)}.ui-card--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-card__media{width:100%;overflow:hidden;display:block;line-height:0}::slotted([slot="midia"]),::slotted([slot="media"]){width:100%;height:auto;display:block;object-fit:cover}.ui-card__header{padding:14px 16px 8px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box}.ui-card__body{padding:12px 16px;flex:1;box-sizing:border-box}.ui-card__footer{padding:10px 16px 14px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box}.ui-card--compacto .ui-card__header{padding:10px 12px 6px}.ui-card--compacto .ui-card__body{padding:8px 12px}.ui-card--compacto .ui-card__footer{padding:8px 12px 10px}';
class Ta extends HTMLElement {
  constructor() {
    super();
    f(this, "cardElement");
    f(this, "handleClick", () => {
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
      <style>${Pa}</style>
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
  attributeChangedCallback(o, s, h) {
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
    var O, w, C;
    const o = this.getAttribute("elevacao") || this.getAttribute("elevation") || "plano", s = this.getAttribute("variante") || this.getAttribute("variant") || o, h = this.clicavel, p = this.hasAttribute("compacto") || this.hasAttribute("compact"), c = this.disabled;
    this.cardElement.className = "ui-card", this.cardElement.classList.add(`ui-card--${s}`), h ? (this.cardElement.classList.add("ui-card--clicavel"), this.cardElement.setAttribute("tabindex", "0")) : this.cardElement.removeAttribute("tabindex"), p && this.cardElement.classList.add("ui-card--compacto"), c && this.cardElement.classList.add("ui-card--disabled");
    const v = (O = this.shadowRoot) == null ? void 0 : O.querySelector(".ui-card__header"), _ = (w = this.shadowRoot) == null ? void 0 : w.querySelector(".ui-card__footer"), T = (C = this.shadowRoot) == null ? void 0 : C.querySelector(".ui-card__media");
    if (T) {
      const W = this.querySelector('[slot="midia"], [slot="media"]');
      T.style.display = W ? "block" : "none";
    }
    if (v) {
      const W = this.querySelector('[slot="cabecalho"], [slot="header"]');
      v.style.display = W ? "flex" : "none";
    }
    if (_) {
      const W = this.querySelector('[slot="rodape"], [slot="footer"]');
      _.style.display = W ? "flex" : "none";
    }
  }
}
customElements.get("ui-card") || customElements.define("ui-card", Ta);
const za = ':host{display:block;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-modal__backdrop{display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background-color:#000000b3;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);z-index:9998;opacity:0;pointer-events:none;transition:opacity .25s ease}:host([aberto]) .ui-modal__backdrop,:host([open]) .ui-modal__backdrop{display:block;opacity:1;pointer-events:auto}.ui-modal__dialog{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.95);max-width:560px;width:90%;max-height:85vh;background-color:var(--ui-cor-fundo-card, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:var(--ui-raio-borda, 12px);box-shadow:0 12px 36px #0009;z-index:9999;display:flex;flex-direction:column;opacity:0;visibility:hidden;pointer-events:none;overflow:hidden;transition:transform .25s cubic-bezier(.4,0,.2,1),opacity .25s ease,visibility .25s ease;box-sizing:border-box;color:var(--ui-cor-texto, #e1e1e6)}:host([aberto]) .ui-modal__dialog,:host([open]) .ui-modal__dialog{opacity:1;visibility:visible;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}.ui-modal__handle{display:none;width:36px;height:4px;border-radius:2px;background-color:#ffffff40;margin:6px auto 12px;flex-shrink:0}.ui-modal__header{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);gap:12px}.ui-modal__titulo{font-size:1.1rem;font-weight:600;margin:0;color:var(--ui-cor-texto, #e1e1e6)}.ui-modal__close{background:transparent;border:none;color:var(--ui-cor-texto-secundario, #888899);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;line-height:1;transition:color .15s ease,background-color .15s ease}.ui-modal__close:hover{color:#fff;background-color:#ffffff1a}.ui-modal__body{padding:20px;overflow-y:auto;flex:1;box-sizing:border-box}.ui-modal__footer{padding:14px 20px;display:flex;align-items:center;justify-content:flex-end;gap:12px;border-top:1px solid rgba(255,255,255,.08);background-color:#00000026}@media (max-width: 640px){.ui-modal__dialog{top:auto!important;bottom:0!important;left:0!important;transform:translateY(100%)!important;width:100vw!important;max-width:100vw!important;border-radius:16px 16px 0 0!important;max-height:80vh!important;border-bottom:none!important;box-shadow:0 -8px 32px #000000b3!important}:host([aberto]) .ui-modal__dialog,:host([open]) .ui-modal__dialog{transform:translateY(0)!important}.ui-modal__handle{display:block!important}}:host([bottom-sheet]) .ui-modal__dialog{top:auto!important;bottom:0!important;left:0!important;transform:translateY(100%)!important;width:100vw!important;max-width:100vw!important;border-radius:16px 16px 0 0!important;max-height:80vh!important;border-bottom:none!important;box-shadow:0 -8px 32px #000000b3!important}:host([bottom-sheet][aberto]) .ui-modal__dialog,:host([bottom-sheet][open]) .ui-modal__dialog{transform:translateY(0)!important}:host([bottom-sheet]) .ui-modal__handle{display:block!important}', ct = class ct extends HTMLElement {
  constructor() {
    super();
    f(this, "backdropElement");
    f(this, "dialogElement");
    f(this, "tituloElement");
    f(this, "closeElement");
    f(this, "_elementoGatilho", null);
    f(this, "_focables", []);
    f(this, "handleBackdropClick", (o) => {
      o.stopPropagation(), this.fechar();
    });
    f(this, "handleCloseClick", (o) => {
      o.stopPropagation(), this.fechar();
    });
    f(this, "handleKeyDown", (o) => {
      var s, h;
      if (this.aberto && this._isTopMostModal()) {
        if (o.key === "Escape")
          this.fechar(), o.stopImmediatePropagation();
        else if (o.key === "Tab") {
          if (this._atualizarFocables(), this._focables.length === 0) {
            o.preventDefault();
            return;
          }
          const p = this._focables[0], c = this._focables[this._focables.length - 1], v = this.getRootNode().activeElement;
          o.shiftKey ? (v === p || !this.contains(v) && !((s = this.shadowRoot) != null && s.contains(v))) && (o.preventDefault(), c.focus()) : (v === c || !this.contains(v) && !((h = this.shadowRoot) != null && h.contains(v))) && (o.preventDefault(), p.focus());
        }
      }
    });
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${za}</style>
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
    this.backdropElement.removeEventListener("click", this.handleBackdropClick), this.closeElement.removeEventListener("click", this.handleCloseClick), window.removeEventListener("keydown", this.handleKeyDown), this.hasAttribute("data-scroll-locked") && (this.removeAttribute("data-scroll-locked"), ct._openCount = Math.max(0, ct._openCount - 1), ct._openCount === 0 && (document.body.style.overflow = ""));
  }
  attributeChangedCallback(o, s, h) {
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
    var p;
    const o = this.aberto, s = this.getAttribute("titulo") || this.getAttribute("title") || "", h = (p = this.shadowRoot) == null ? void 0 : p.querySelector(".ui-modal__footer");
    if (this.dialogElement.setAttribute("aria-hidden", String(!o)), s ? (this.tituloElement.textContent = s, this.tituloElement.style.display = "block") : this.tituloElement.style.display = "none", h) {
      const c = this.querySelector('[slot="rodape"], [slot="footer"]');
      h.style.display = c ? "flex" : "none";
    }
    o ? this.hasAttribute("data-scroll-locked") || (this.setAttribute("data-scroll-locked", "true"), ct._openCount++, ct._openCount === 1 && (document.body.style.overflow = "hidden")) : this.hasAttribute("data-scroll-locked") && (this.removeAttribute("data-scroll-locked"), ct._openCount = Math.max(0, ct._openCount - 1), ct._openCount === 0 && (document.body.style.overflow = ""));
  }
  _atualizarFocables() {
    const o = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
    let s = Array.from(this.shadowRoot.querySelectorAll(o));
    s = s.filter((c) => window.getComputedStyle(c).display !== "none");
    const h = this.shadowRoot.querySelectorAll("slot");
    let p = [];
    h.forEach((c) => {
      c.assignedElements({ flatten: !0 }).forEach((_) => {
        _ instanceof HTMLElement && (_.matches(o) && p.push(_), p.push(...Array.from(_.querySelectorAll(o))));
      });
    }), this._focables = [...s, ...p].filter((c) => !c.hasAttribute("disabled") && c.getAttribute("aria-hidden") !== "true");
  }
  _isTopMostModal() {
    const o = Array.from(document.querySelectorAll("ui-modal[aberto], ui-modal[open], ui-dialog[aberto], ui-dialog[open]"));
    return o[o.length - 1] === this;
  }
};
f(ct, "_openCount", 0);
let Ee = ct;
class Sa extends Ee {
}
customElements.get("ui-modal") || customElements.define("ui-modal", Ee);
customElements.get("ui-dialog") || customElements.define("ui-dialog", Sa);
const Ma = ':host{display:block;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-alerta{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-radius:var(--ui-raio-borda, 8px);border:1px solid transparent;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);box-sizing:border-box;position:relative;transition:opacity .2s ease,transform .2s ease;line-height:1.4}.ui-alerta__icone{display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}.ui-alerta__conteudo{flex:1}.ui-alerta__titulo{font-size:.9rem;font-weight:600;margin:0 0 2px;line-height:1.2}.ui-alerta__mensagem{font-size:.825rem;margin:0;opacity:.9}.ui-alerta__close{background:transparent;border:none;color:currentColor;opacity:.7;font-size:14px;cursor:pointer;padding:2px 6px;border-radius:4px;line-height:1;flex-shrink:0;margin-top:-2px;margin-right:-4px;transition:opacity .15s ease,background-color .15s ease}.ui-alerta__close:hover{opacity:1;background-color:#ffffff26}.ui-alerta--sucesso{background-color:#00e08a1f;border-color:#00e08a4d;color:var(--ui-cor-texto-sucesso, #00E08A)}.ui-alerta--sucesso .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}.ui-alerta--erro{background-color:#ff55551f;border-color:#ff55554d;color:var(--ui-cor-texto-erro, #ff5555)}.ui-alerta--erro .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}.ui-alerta--alerta{background-color:#ffb86c1f;border-color:#ffb86c4d;color:var(--ui-cor-texto-alerta, #ffb86c)}.ui-alerta--alerta .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}.ui-alerta--info{background-color:#00aaff1f;border-color:#00aaff4d;color:#0af}.ui-alerta--info .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}:host(ui-toast){display:block;width:100%;box-sizing:border-box;pointer-events:auto;transition:transform .25s cubic-bezier(.4,0,.2,1),opacity .25s ease}.ui-toast__banner{box-shadow:0 8px 30px #0009;animation:ui-toast-slide .3s cubic-bezier(.4,0,.2,1)}@keyframes ui-toast-slide{0%{transform:translate(100%);opacity:0}to{transform:translate(0);opacity:1}}', Tn = {
  sucesso: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  erro: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  alerta: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  info: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
};
class In extends HTMLElement {
  constructor() {
    super();
    f(this, "alertaElement");
    f(this, "iconeElement");
    f(this, "tituloElement");
    f(this, "mensagemElement");
    f(this, "closeElement");
    f(this, "fechar", () => {
      this.dispatchEvent(
        new CustomEvent("ui-fechar", {
          bubbles: !0,
          composed: !0
        })
      ), this.remove();
    });
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Ma}</style>
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
  attributeChangedCallback(o, s, h) {
    this.syncState();
  }
  syncState() {
    const o = this.getAttribute("tipo") || this.getAttribute("variante") || this.getAttribute("variant") || "info", s = this.getAttribute("titulo") || this.getAttribute("title"), h = this.getAttribute("mensagem"), p = this.hasAttribute("fechavel") || this.hasAttribute("dismissible");
    this.alertaElement.className = "ui-alerta", this.alertaElement.classList.add(`ui-alerta--${o}`), this.iconeElement.innerHTML = Tn[o] || Tn.info, s ? (this.tituloElement.textContent = s, this.tituloElement.style.display = "block") : this.tituloElement.style.display = "none", h && (this.mensagemElement.textContent = h), p ? this.closeElement.style.display = "block" : this.closeElement.style.display = "none";
  }
}
class di extends In {
  constructor() {
    super(...arguments);
    f(this, "timerId", null);
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
    let h = document.getElementById(s);
    return h || (h = document.createElement("div"), h.id = s, h.style.position = "fixed", h.style.zIndex = "10000", h.style.display = "flex", h.style.gap = "10px", h.style.maxWidth = "380px", h.style.width = "calc(100vw - 32px)", h.style.pointerEvents = "none", h.style.boxSizing = "border-box", h.style.transition = "all 0.2s ease", o === "top-right" ? (h.style.top = "20px", h.style.right = "20px", h.style.flexDirection = "column") : (h.style.bottom = "20px", h.style.right = "20px", h.style.flexDirection = "column-reverse"), document.body.appendChild(h)), h;
  }
  // Utilitário estático para disparo imperativo de Toasts de qualquer lugar no código
  static notificar(o) {
    const s = o.posicao || "bottom-right", h = document.createElement("ui-toast");
    return o.tipo && h.setAttribute("tipo", o.tipo), o.titulo && h.setAttribute("titulo", o.titulo), o.mensagem && h.setAttribute("mensagem", o.mensagem), o.duracao && h.setAttribute("duracao", String(o.duracao)), h.setAttribute("posicao", s), h.setAttribute("fechavel", ""), di.obterContainer(s).appendChild(h), h;
  }
}
customElements.get("ui-alerta") || customElements.define("ui-alerta", In);
customElements.get("ui-toast") || customElements.define("ui-toast", di);
const Ia = ":host{display:inline-flex;position:relative;align-items:center;justify-content:center;vertical-align:middle;box-sizing:border-box;--ui-tooltip-texto-distancia: 90px;--ui-tooltip-seta-espaco: 70px}.ui-tooltip__bubble{position:fixed;z-index:10001;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:500;background-color:var(--ui-cor-fundo-elevado, #1e1e24);color:var(--ui-cor-texto, #e1e1e6);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));box-shadow:0 4px 16px #00000080;white-space:nowrap;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s ease,visibility .15s ease;line-height:1.2;box-sizing:border-box;-webkit-user-select:none;user-select:none;margin:0}.ui-tooltip__bubble[popover]{margin:0;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));background-color:var(--ui-cor-fundo-elevado, #1e1e24);color:var(--ui-cor-texto, #e1e1e6);padding:6px 10px;overflow:visible}.ui-tooltip__texto{max-width:var(--ui-tooltip-texto-distancia, 90px)}.ui-tooltip__arrow{position:absolute;width:0;height:0;border-style:solid}.ui-tooltip--topo .ui-tooltip__arrow{bottom:-5px;left:50%;transform:translate(-50%);border-width:5px 5px 0 5px;border-color:var(--ui-cor-fundo-elevado, #1e1e24) transparent transparent transparent}.ui-tooltip--baixo .ui-tooltip__arrow{top:-5px;left:50%;transform:translate(-50%);border-width:0 5px 5px 5px;border-color:transparent transparent var(--ui-cor-fundo-elevado, #1e1e24) transparent}.ui-tooltip--esquerda .ui-tooltip__arrow{right:-5px;top:50%;transform:translateY(-50%);border-width:5px 0 5px 5px;border-color:transparent transparent transparent var(--ui-cor-fundo-elevado, #1e1e24)}.ui-tooltip--direita .ui-tooltip__arrow{left:-5px;top:50%;transform:translateY(-50%);border-width:5px 5px 5px 0;border-color:transparent var(--ui-cor-fundo-elevado, #1e1e24) transparent transparent}.ui-tooltip--visivel .ui-tooltip__bubble{opacity:1;visibility:visible;pointer-events:auto}";
class On extends HTMLElement {
  constructor() {
    super();
    f(this, "containerElement");
    f(this, "bubbleElement");
    f(this, "posicionarBubble", () => {
      if (!this.aberto) return;
      const o = this.getBoundingClientRect(), s = this.bubbleElement.getBoundingClientRect(), h = this.getAttribute("posicao") || this.getAttribute("position") || "topo";
      let p = "topo";
      ["topo", "top"].includes(h) ? p = "topo" : ["baixo", "bottom"].includes(h) ? p = "baixo" : ["esquerda", "left"].includes(h) ? p = "esquerda" : ["direita", "right"].includes(h) && (p = "direita");
      let c = 0, v = 0;
      const _ = 8;
      p === "topo" ? (c = o.top - s.height - _, v = o.left + o.width / 2 - s.width / 2) : p === "baixo" ? (c = o.bottom + _, v = o.left + o.width / 2 - s.width / 2) : p === "esquerda" ? (c = o.top + o.height / 2 - s.height / 2, v = o.left - s.width - _) : p === "direita" && (c = o.top + o.height / 2 - s.height / 2, v = o.right + _), v = Math.max(8, Math.min(v, window.innerWidth - s.width - 8)), c = Math.max(8, Math.min(c, window.innerHeight - s.height - 8)), this.bubbleElement.style.top = `${c}px`, this.bubbleElement.style.left = `${v}px`;
    });
    f(this, "handleMouseEnter", () => {
      const o = this.getAttribute("gatilho") || this.getAttribute("trigger") || "hover";
      (o === "hover" || o === "passar-mouse") && this.mostrar();
    });
    f(this, "handleMouseLeave", () => {
      const o = this.getAttribute("gatilho") || this.getAttribute("trigger") || "hover";
      (o === "hover" || o === "passar-mouse") && this.ocultar();
    });
    f(this, "handleClick", (o) => {
      const s = this.getAttribute("gatilho") || this.getAttribute("trigger") || "hover", h = window.matchMedia("(pointer: coarse)").matches;
      (s === "clique" || s === "click" || h) && (o.stopPropagation(), this.aberto = !this.aberto);
    });
    f(this, "handleClickOutside", (o) => {
      o.composedPath().includes(this) || this.ocultar();
    });
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>${Ia}</style>
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
  attributeChangedCallback(o, s, h) {
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
    var v;
    const o = this.aberto, s = this.getAttribute("posicao") || this.getAttribute("position") || "topo", h = this.getAttribute("texto") || this.getAttribute("text") || "", p = (v = this.shadowRoot) == null ? void 0 : v.querySelector(".ui-tooltip__texto");
    let c = "topo";
    if (["topo", "top"].includes(s) ? c = "topo" : ["baixo", "bottom"].includes(s) ? c = "baixo" : ["esquerda", "left"].includes(s) ? c = "esquerda" : ["direita", "right"].includes(s) && (c = "direita"), this.containerElement.className = `ui-tooltip ui-tooltip--${c}`, p && (h ? (p.textContent = h, p.style.display = "inline") : p.style.display = "none"), o) {
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
class Oa extends On {
}
customElements.get("ui-tooltip") || customElements.define("ui-tooltip", On);
customElements.get("ui-popover") || customElements.define("ui-popover", Oa);
const Ba = ':host{display:block;width:100%;box-sizing:border-box;font-family:inherit;color:var(--ui-cor-texto, #e1e1e6);position:relative}.ui-tabela-container{width:100%;max-width:100%;max-height:var(--ui-tabela-max-height, 500px);overflow-x:auto;overflow-y:auto;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 6px);background-color:var(--ui-cor-superficie, #141417);box-sizing:border-box;position:relative}.ui-tabela{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:14px}.ui-tabela thead{position:sticky;top:0;z-index:10;background-color:var(--ui-cor-fundo-elevado, #1a1a1e)}.ui-tabela th{position:sticky;top:0;z-index:10;padding:10px 16px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);font-weight:600;border-bottom:2px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));white-space:nowrap;-webkit-user-select:none;user-select:none;box-sizing:border-box}.ui-tabela__resizer{position:absolute;top:0;right:0;width:6px;height:100%;cursor:col-resize;-webkit-user-select:none;user-select:none;z-index:20;transition:background-color .15s ease}.ui-tabela__resizer:hover,.ui-tabela__resizer--ativo{background-color:var(--ui-cor-primaria, #00E08A)}:host([densidade="compacta"]) th,:host([densidade="compacta"]) td,:host([density="compact"]) th,:host([density="compact"]) td{padding:4px 8px}:host([densidade="normal"]) th,:host([densidade="normal"]) td,:host([density="normal"]) th,:host([density="normal"]) td{padding:10px 16px}:host([densidade="relaxada"]) th,:host([densidade="relaxada"]) td,:host([density="relaxed"]) th,:host([density="relaxed"]) td{padding:16px 20px}.ui-tabela__header-content{display:inline-flex;align-items:center;vertical-align:middle;width:100%;box-sizing:border-box}.ui-tabela__header-text{margin-right:90px;display:inline-flex;align-items:center}.ui-tabela__sort-icon,.ui-tabela__header-icon{width:70px;min-width:70px;max-width:70px;display:inline-flex;justify-content:center;align-items:center;transition:transform .2s ease,opacity .2s ease}.ui-tabela th.ui-tabela__th--ordenavel{cursor:pointer}.ui-tabela th.ui-tabela__th--ordenavel:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-tabela__sort-arrow{display:inline-block;width:12px;height:12px;transition:transform .2s ease,fill .2s ease;fill:var(--ui-cor-primaria, #00E08A)}.ui-tabela__sort-arrow--desc{transform:rotate(180deg)}.ui-tabela__sort-arrow--inativo{opacity:.3;fill:var(--ui-cor-texto-secundario, #888899)}.ui-tabela td{padding:10px 16px;border-bottom:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .06));white-space:nowrap;vertical-align:middle;color:var(--ui-cor-texto, #e1e1e6);box-sizing:border-box}.ui-tabela__cell-content{display:inline-flex;align-items:center;vertical-align:middle}.ui-tabela__cell-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.ui-tabela--alinhar-esquerda{text-align:left}.ui-tabela--alinhar-esquerda .ui-tabela__header-content,.ui-tabela--alinhar-esquerda .ui-tabela__cell-content{justify-content:flex-start}.ui-tabela--alinhar-centro{text-align:center}.ui-tabela--alinhar-centro .ui-tabela__header-content,.ui-tabela--alinhar-centro .ui-tabela__cell-content{justify-content:center}.ui-tabela--alinhar-direita{text-align:right}.ui-tabela--alinhar-direita .ui-tabela__header-content,.ui-tabela--alinhar-direita .ui-tabela__cell-content{justify-content:flex-end}.ui-tabela tbody tr:nth-child(2n){background-color:var(--ui-cor-fundo-card, rgba(255, 255, 255, .02))}.ui-tabela tbody tr:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-tabela__virtual-spacer td{padding:0!important;border:none!important;height:inherit;background:transparent!important}.ui-tabela__empty{padding:48px 24px;text-align:center;border:2px dashed var(--ui-cor-borda, rgba(255, 255, 255, .2));border-radius:var(--ui-raio-borda, 6px);margin:16px;color:var(--ui-cor-texto-secundario, #888899);background-color:var(--ui-cor-fundo, #0b0b0d);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;box-sizing:border-box}.ui-tabela__empty-icon{width:32px;height:32px;opacity:.5;fill:currentColor}.ui-tabela__empty-text{font-size:14px;font-weight:500;color:var(--ui-cor-texto-secundario, #888899)}.ui-tabela__context-menu{position:absolute;z-index:100;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .2));border-radius:var(--ui-raio-borda, 6px);box-shadow:0 4px 20px #0009;padding:6px;display:flex;flex-direction:column;gap:4px;min-width:200px;font-size:13px;color:var(--ui-cor-texto, #e1e1e6)}.ui-tabela__context-item{padding:8px 12px;border-radius:4px;cursor:pointer;color:var(--ui-cor-texto, #e1e1e6);display:flex;align-items:center;justify-content:space-between;gap:8px;transition:background-color .15s ease}.ui-tabela__context-item:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08));color:var(--ui-cor-primaria, #00E08A)}.ui-tabela__prompt-dialog{border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .2));border-radius:var(--ui-raio-borda, 6px);background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);padding:12px;box-shadow:0 8px 32px #000c;font-family:inherit;font-size:14px}.ui-tabela__prompt-dialog::backdrop{background:#0000004d}.ui-tabela__prompt-title{margin-bottom:8px;font-weight:500}.ui-tabela__prompt-dialog input{width:100%;padding:6px 8px;border-radius:4px;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .2));background:var(--ui-cor-superficie, #141417);color:var(--ui-cor-texto, #e1e1e6);margin-bottom:12px;box-sizing:border-box}.ui-tabela__prompt-actions{display:flex;justify-content:flex-end;gap:8px}.ui-tabela__prompt-actions button{background:var(--ui-cor-borda, rgba(255, 255, 255, .12));color:var(--ui-cor-texto, #e1e1e6);border:none;padding:6px 12px;border-radius:4px;cursor:pointer}.ui-tabela__prompt-actions button:last-child{background:var(--ui-cor-primaria, #00E08A);color:#000;font-weight:600}';
class Za extends HTMLElement {
  constructor() {
    super();
    f(this, "shadow");
    f(this, "_colunas", []);
    f(this, "_dadosOriginais", []);
    f(this, "_dadosExibicao", []);
    f(this, "_colunaOrdenada", null);
    f(this, "_direcaoOrdenacao", "original");
    f(this, "_textoVazio", "Nenhum registro encontrado");
    f(this, "_virtualizar", !0);
    f(this, "_isResizing", !1);
    // Gerenciamento de Ouvintes e Elementos DOM
    f(this, "_containerElement", null);
    f(this, "_tableElement", null);
    f(this, "_theadElement", null);
    f(this, "_tbodyElement", null);
    f(this, "_colgroupElement", null);
    f(this, "_emptyElement", null);
    f(this, "_scrollHandler", null);
    f(this, "_activeResizeCleanup", null);
    f(this, "_headerEventListeners", []);
    f(this, "_ticking", !1);
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
  attributeChangedCallback(o, s, h) {
    this.syncAttributes(), this.renderTotal();
  }
  syncAttributes() {
    const o = this.getAttribute("texto-vazio") || this.getAttribute("empty-text");
    o && (this._textoVazio = o);
    const s = this.getAttribute("virtualizar") || this.getAttribute("virtualize");
    s !== null && (this._virtualizar = s !== "false");
  }
  cleanupEventListeners() {
    this._containerElement && this._scrollHandler && (this._containerElement.removeEventListener("scroll", this._scrollHandler), this._scrollHandler = null), this._activeResizeCleanup && (this._activeResizeCleanup(), this._activeResizeCleanup = null), this._headerEventListeners.forEach(({ element: o, type: s, listener: h }) => {
      o.removeEventListener(s, h);
    }), this._headerEventListeners = [];
  }
  addHeaderListener(o, s, h) {
    o.addEventListener(s, h), this._headerEventListeners.push({ element: o, type: s, listener: h });
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
    this._dadosExibicao = [...this._dadosOriginais].sort((h, p) => {
      const c = h[o], v = p[o];
      return c === v ? 0 : c == null ? 1 * s : v == null ? -1 * s : typeof c == "number" && typeof v == "number" ? (c - v) * s : String(c).localeCompare(String(v), "pt-BR", { numeric: !0, sensitivity: "base" }) * s;
    });
  }
  // Redimensionamento de Colunas (Drag-to-resize)
  initColumnResize(o, s, h, p, c) {
    var W;
    o.stopPropagation(), o.preventDefault(), this._isResizing = !0, c.classList.add("ui-tabela__resizer--ativo");
    const v = o.pageX, _ = p.offsetWidth, T = (W = this._colgroupElement) == null ? void 0 : W.children[h], O = (N) => {
      const x = N.pageX - v;
      let D = _ + x;
      if (s.larguraMinima !== void 0) {
        const nt = typeof s.larguraMinima == "number" ? s.larguraMinima : parseInt(s.larguraMinima, 10);
        isNaN(nt) || (D = Math.max(nt, D));
      } else
        D = Math.max(60, D);
      if (s.larguraMaxima !== void 0) {
        const nt = typeof s.larguraMaxima == "number" ? s.larguraMaxima : parseInt(s.larguraMaxima, 10);
        isNaN(nt) || (D = Math.min(nt, D));
      }
      s.largura = `${D}px`, p.style.width = `${D}px`, T && (T.style.width = `${D}px`);
    }, w = () => {
      c.classList.remove("ui-tabela__resizer--ativo"), window.removeEventListener("mousemove", O), window.removeEventListener("mouseup", C), this._activeResizeCleanup = null, setTimeout(() => {
        this._isResizing = !1;
      }, 50);
    }, C = () => {
      w(), this.dispatchEvent(
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
    this._activeResizeCleanup = w, window.addEventListener("mousemove", O), window.addEventListener("mouseup", C);
  }
  // Mini-Popover de Redimensionamento Exato
  showPromptPopover(o, s, h, p) {
    const c = document.createElement("dialog");
    c.className = "ui-tabela__prompt-dialog", c.style.position = "fixed", c.style.left = `${o.clientX}px`, c.style.top = `${o.clientY}px`;
    const v = document.createElement("div");
    v.className = "ui-tabela__prompt-title", v.textContent = `Largura para "${s.rotulo}" (px ou auto):`;
    const _ = document.createElement("input");
    _.type = "text";
    const T = s.largura ? String(s.largura).replace("px", "") : "auto";
    _.value = T;
    const O = document.createElement("div");
    O.className = "ui-tabela__prompt-actions";
    const w = document.createElement("button");
    w.textContent = "Aplicar";
    const C = document.createElement("button");
    C.textContent = "Cancelar", O.appendChild(C), O.appendChild(w), c.appendChild(v), c.appendChild(_), c.appendChild(O), this.shadow.appendChild(c), c.showModal();
    const W = () => {
      var D, nt;
      const x = _.value.trim().toLowerCase();
      if (x === "" || x === "auto")
        s.largura = void 0, p.style.width = "", (D = this._colgroupElement) != null && D.children[h] && (this._colgroupElement.children[h].style.width = "");
      else {
        const dt = parseInt(x, 10);
        !isNaN(dt) && dt > 20 && (s.largura = `${dt}px`, p.style.width = `${dt}px`, (nt = this._colgroupElement) != null && nt.children[h] && (this._colgroupElement.children[h].style.width = `${dt}px`));
      }
      c.close(), c.remove(), this.dispatchEvent(
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
    w.addEventListener("click", W), C.addEventListener("click", () => {
      c.close(), c.remove();
    }), _.addEventListener("keydown", (N) => {
      N.key === "Enter" && W(), N.key === "Escape" && (c.close(), c.remove());
    }), _.focus(), _.select();
  }
  handleHeaderContextMenu(o, s, h, p) {
    o.preventDefault(), o.stopPropagation(), this.showPromptPopover(o, s, h, p);
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
    this.cleanupEventListeners(), this.shadow.innerHTML = `<style>${Ba}</style>`;
    const o = this.getAttribute("max-height"), s = document.createElement("div");
    s.className = "ui-tabela-container", o && (s.style.maxHeight = o), this._containerElement = s;
    const h = document.createElement("div");
    h.className = "ui-tabela__empty", h.style.display = "none";
    const p = document.createElement("div");
    p.innerHTML = `
      <svg class="ui-tabela__empty-icon" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
      </svg>`;
    const c = document.createElement("span");
    c.className = "ui-tabela__empty-text", c.textContent = this._textoVazio, h.appendChild(p), h.appendChild(c), this._emptyElement = h, this._tableElement = document.createElement("table"), this._tableElement.className = "ui-tabela", this._colgroupElement = document.createElement("colgroup"), this._theadElement = document.createElement("thead"), this._tbodyElement = document.createElement("tbody"), this._tableElement.appendChild(this._colgroupElement), this._tableElement.appendChild(this._theadElement), this._tableElement.appendChild(this._tbodyElement), s.appendChild(this._emptyElement), s.appendChild(this._tableElement), this.shadow.appendChild(s), this.renderHeader(), this.renderBody(), this._virtualizar && this._containerElement && (this._ticking = !1, this._scrollHandler = () => {
      this._ticking || (window.requestAnimationFrame(() => {
        this.renderBody(), this._ticking = !1;
      }), this._ticking = !0);
    }, this._containerElement.addEventListener("scroll", this._scrollHandler));
  }
  // Renderiza apenas os cabeçalhos (Thead e Colgroup)
  renderHeader() {
    if (!this._theadElement || !this._colgroupElement) return;
    this._headerEventListeners.forEach(({ element: s, type: h, listener: p }) => {
      s.removeEventListener(h, p);
    }), this._headerEventListeners = [], this._theadElement.innerHTML = "", this._colgroupElement.innerHTML = "";
    const o = document.createElement("tr");
    this._colunas.forEach((s, h) => {
      const p = document.createElement("col");
      s.largura !== void 0 && (p.style.width = this.formatWidth(s.largura)), this._colgroupElement.appendChild(p);
      const c = document.createElement("th"), v = this.getAlignmentClass(s.alinhamento);
      if (c.className = v, c.style.textAlign = this.getTextAlign(s.alinhamento), s.largura !== void 0 && (c.style.width = this.formatWidth(s.largura)), s.larguraMinima !== void 0 && (c.style.minWidth = this.formatWidth(s.larguraMinima)), s.larguraMaxima !== void 0) {
        const x = this.formatWidth(s.larguraMaxima);
        c.style.maxWidth = x, c.style.overflow = "hidden", c.style.textOverflow = "ellipsis", c.style.whiteSpace = "nowrap";
      }
      if (s.tooltip && (c.title = s.tooltip), s.ordenavel) {
        c.classList.add("ui-tabela__th--ordenavel");
        const x = () => this.handleHeaderClick(s);
        this.addHeaderListener(c, "click", x);
      }
      const _ = (x) => this.handleHeaderContextMenu(x, s, h, c);
      this.addHeaderListener(c, "contextmenu", _);
      const T = document.createElement("div");
      T.className = "ui-tabela__header-content";
      const O = document.createElement("span");
      O.className = "ui-tabela__header-text", O.textContent = s.rotulo, T.appendChild(O);
      const w = document.createElement("span");
      if (w.className = "ui-tabela__sort-icon", s.ordenavel) {
        const x = this._colunaOrdenada === s.id && this._direcaoOrdenacao !== "original", D = x && this._direcaoOrdenacao === "desc", nt = x ? "" : "ui-tabela__sort-arrow--inativo", dt = D ? "ui-tabela__sort-arrow--desc" : "";
        w.innerHTML = `
          <svg class="ui-tabela__sort-arrow ${nt} ${dt}" viewBox="0 0 24 24">
            <path d="M7 14l5-5 5 5H7z"/>
          </svg>
        `;
      }
      T.appendChild(w), c.appendChild(T);
      const C = document.createElement("div");
      C.className = "ui-tabela__resizer", C.title = "Arrastar para redimensionar largura (duplo-clique para auto-ajuste)";
      const W = (x) => this.initColumnResize(x, s, h, c, C);
      this.addHeaderListener(C, "mousedown", W);
      const N = (x) => {
        x.stopPropagation(), s.largura = void 0, c.style.width = "", p.style.width = "", this.dispatchEvent(new CustomEvent("ui-column-resize", { bubbles: !0, composed: !0, detail: { idColuna: s.id, largura: "auto" } }));
      };
      this.addHeaderListener(C, "dblclick", N), c.appendChild(C), o.appendChild(c);
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
    const o = this._dadosExibicao.length, s = this.getRowHeight(), h = this._virtualizar && o > 30;
    let p = 0, c = o;
    if (h) {
      const _ = this._containerElement.scrollTop, T = this._containerElement.clientHeight || 400, O = 5;
      p = Math.max(0, Math.floor(_ / s) - O), c = Math.min(o, Math.ceil((_ + T) / s) + O);
    }
    this._tbodyElement.innerHTML = "";
    const v = document.createDocumentFragment();
    if (h && p > 0) {
      const _ = document.createElement("tr");
      _.className = "ui-tabela__virtual-spacer", _.style.height = `${p * s}px`;
      const T = document.createElement("td");
      T.colSpan = this._colunas.length || 1, _.appendChild(T), v.appendChild(_);
    }
    for (let _ = p; _ < c; _++) {
      const T = this._dadosExibicao[_], O = document.createElement("tr");
      this._colunas.forEach((w) => {
        const C = document.createElement("td"), W = this.getAlignmentClass(w.alinhamento);
        if (C.className = W, C.style.textAlign = this.getTextAlign(w.alinhamento), w.larguraMaxima !== void 0) {
          const D = this.formatWidth(w.larguraMaxima);
          C.style.maxWidth = D, C.style.overflow = "hidden", C.style.textOverflow = "ellipsis", C.style.whiteSpace = "nowrap";
        }
        const N = document.createElement("div");
        N.className = "ui-tabela__cell-content", w.larguraMaxima !== void 0 && N.classList.add("ui-tabela__cell-truncate");
        const x = T[w.id];
        if (typeof w.render == "function") {
          const D = w.render(x, T, _);
          D instanceof Node ? N.appendChild(D) : N.textContent = String(D ?? "");
        } else if (x instanceof Node)
          N.appendChild(x);
        else {
          const D = x != null ? String(x) : "";
          N.textContent = D, w.larguraMaxima !== void 0 && !w.tooltip && (C.title = D);
        }
        C.appendChild(N), O.appendChild(C);
      }), v.appendChild(O);
    }
    if (h && c < o) {
      const _ = document.createElement("tr");
      _.className = "ui-tabela__virtual-spacer", _.style.height = `${(o - c) * s}px`;
      const T = document.createElement("td");
      T.colSpan = this._colunas.length || 1, _.appendChild(T), v.appendChild(_);
    }
    this._tbodyElement.appendChild(v);
  }
}
customElements.get("ui-tabela") || customElements.define("ui-tabela", Za);
var Ra = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Na(S) {
  return S && S.__esModule && Object.prototype.hasOwnProperty.call(S, "default") ? S.default : S;
}
var li = { exports: {} };
/* @preserve
 * Leaflet 1.9.4, a JS library for interactive maps. https://leafletjs.com
 * (c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade
 */
(function(S, Z) {
  (function(o, s) {
    s(Z);
  })(Ra, function(o) {
    var s = "1.9.4";
    function h(t) {
      var e, i, n, a;
      for (i = 1, n = arguments.length; i < n; i++) {
        a = arguments[i];
        for (e in a)
          t[e] = a[e];
      }
      return t;
    }
    var p = Object.create || /* @__PURE__ */ function() {
      function t() {
      }
      return function(e) {
        return t.prototype = e, new t();
      };
    }();
    function c(t, e) {
      var i = Array.prototype.slice;
      if (t.bind)
        return t.bind.apply(t, i.call(arguments, 1));
      var n = i.call(arguments, 2);
      return function() {
        return t.apply(e, n.length ? n.concat(i.call(arguments)) : arguments);
      };
    }
    var v = 0;
    function _(t) {
      return "_leaflet_id" in t || (t._leaflet_id = ++v), t._leaflet_id;
    }
    function T(t, e, i) {
      var n, a, r, l;
      return l = function() {
        n = !1, a && (r.apply(i, a), a = !1);
      }, r = function() {
        n ? a = arguments : (t.apply(i, arguments), setTimeout(l, e), n = !0);
      }, r;
    }
    function O(t, e, i) {
      var n = e[1], a = e[0], r = n - a;
      return t === n && i ? t : ((t - a) % r + r) % r + a;
    }
    function w() {
      return !1;
    }
    function C(t, e) {
      if (e === !1)
        return t;
      var i = Math.pow(10, e === void 0 ? 6 : e);
      return Math.round(t * i) / i;
    }
    function W(t) {
      return t.trim ? t.trim() : t.replace(/^\s+|\s+$/g, "");
    }
    function N(t) {
      return W(t).split(/\s+/);
    }
    function x(t, e) {
      Object.prototype.hasOwnProperty.call(t, "options") || (t.options = t.options ? p(t.options) : {});
      for (var i in e)
        t.options[i] = e[i];
      return t.options;
    }
    function D(t, e, i) {
      var n = [];
      for (var a in t)
        n.push(encodeURIComponent(i ? a.toUpperCase() : a) + "=" + encodeURIComponent(t[a]));
      return (!e || e.indexOf("?") === -1 ? "?" : "&") + n.join("&");
    }
    var nt = /\{ *([\w_ -]+) *\}/g;
    function dt(t, e) {
      return t.replace(nt, function(i, n) {
        var a = e[n];
        if (a === void 0)
          throw new Error("No value provided for variable " + i);
        return typeof a == "function" && (a = a(e)), a;
      });
    }
    var lt = Array.isArray || function(t) {
      return Object.prototype.toString.call(t) === "[object Array]";
    };
    function ke(t, e) {
      for (var i = 0; i < t.length; i++)
        if (t[i] === e)
          return i;
      return -1;
    }
    var ne = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    function Le(t) {
      return window["webkit" + t] || window["moz" + t] || window["ms" + t];
    }
    var fi = 0;
    function pi(t) {
      var e = +/* @__PURE__ */ new Date(), i = Math.max(0, 16 - (e - fi));
      return fi = e + i, window.setTimeout(t, i);
    }
    var Ae = window.requestAnimationFrame || Le("RequestAnimationFrame") || pi, mi = window.cancelAnimationFrame || Le("CancelAnimationFrame") || Le("CancelRequestAnimationFrame") || function(t) {
      window.clearTimeout(t);
    };
    function $(t, e, i) {
      if (i && Ae === pi)
        t.call(e);
      else
        return Ae.call(window, c(t, e));
    }
    function ot(t) {
      t && mi.call(window, t);
    }
    var Bn = {
      __proto__: null,
      extend: h,
      create: p,
      bind: c,
      get lastId() {
        return v;
      },
      stamp: _,
      throttle: T,
      wrapNum: O,
      falseFn: w,
      formatNum: C,
      trim: W,
      splitWords: N,
      setOptions: x,
      getParamString: D,
      template: dt,
      isArray: lt,
      indexOf: ke,
      emptyImageUrl: ne,
      requestFn: Ae,
      cancelFn: mi,
      requestAnimFrame: $,
      cancelAnimFrame: ot
    };
    function gt() {
    }
    gt.extend = function(t) {
      var e = function() {
        x(this), this.initialize && this.initialize.apply(this, arguments), this.callInitHooks();
      }, i = e.__super__ = this.prototype, n = p(i);
      n.constructor = e, e.prototype = n;
      for (var a in this)
        Object.prototype.hasOwnProperty.call(this, a) && a !== "prototype" && a !== "__super__" && (e[a] = this[a]);
      return t.statics && h(e, t.statics), t.includes && (Zn(t.includes), h.apply(null, [n].concat(t.includes))), h(n, t), delete n.statics, delete n.includes, n.options && (n.options = i.options ? p(i.options) : {}, h(n.options, t.options)), n._initHooks = [], n.callInitHooks = function() {
        if (!this._initHooksCalled) {
          i.callInitHooks && i.callInitHooks.call(this), this._initHooksCalled = !0;
          for (var r = 0, l = n._initHooks.length; r < l; r++)
            n._initHooks[r].call(this);
        }
      }, e;
    }, gt.include = function(t) {
      var e = this.prototype.options;
      return h(this.prototype, t), t.options && (this.prototype.options = e, this.mergeOptions(t.options)), this;
    }, gt.mergeOptions = function(t) {
      return h(this.prototype.options, t), this;
    }, gt.addInitHook = function(t) {
      var e = Array.prototype.slice.call(arguments, 1), i = typeof t == "function" ? t : function() {
        this[t].apply(this, e);
      };
      return this.prototype._initHooks = this.prototype._initHooks || [], this.prototype._initHooks.push(i), this;
    };
    function Zn(t) {
      if (!(typeof L > "u" || !L || !L.Mixin)) {
        t = lt(t) ? t : [t];
        for (var e = 0; e < t.length; e++)
          t[e] === L.Mixin.Events && console.warn("Deprecated include of L.Mixin.Events: this property will be removed in future releases, please inherit from L.Evented instead.", new Error().stack);
      }
    }
    var it = {
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
          t = N(t);
          for (var a = 0, r = t.length; a < r; a++)
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
          t = N(t);
          for (var a = arguments.length === 1, r = 0, l = t.length; r < l; r++)
            a ? this._off(t[r]) : this._off(t[r], e, i);
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
        var n, a, r;
        if (this._events && (n = this._events[t], !!n)) {
          if (arguments.length === 1) {
            if (this._firingCount)
              for (a = 0, r = n.length; a < r; a++)
                n[a].fn = w;
            delete this._events[t];
            return;
          }
          if (typeof e != "function") {
            console.warn("wrong listener type: " + typeof e);
            return;
          }
          var l = this._listens(t, e, i);
          if (l !== !1) {
            var u = n[l];
            this._firingCount && (u.fn = w, this._events[t] = n = n.slice()), n.splice(l, 1);
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
        var n = h({}, e, {
          type: t,
          target: this,
          sourceTarget: e && e.sourceTarget || this
        });
        if (this._events) {
          var a = this._events[t];
          if (a) {
            this._firingCount = this._firingCount + 1 || 1;
            for (var r = 0, l = a.length; r < l; r++) {
              var u = a[r], d = u.fn;
              u.once && this.off(t, d, u.ctx), d.call(u.ctx || this, n);
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
        var r = this._events && this._events[t];
        if (r && r.length && this._listens(t, a, i) !== !1)
          return !0;
        if (n) {
          for (var l in this._eventParents)
            if (this._eventParents[l].listens(t, e, i, n))
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
        for (var a = 0, r = n.length; a < r; a++)
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
          t = N(t);
          for (var a = 0, r = t.length; a < r; a++)
            this._on(t[a], e, i, !0);
        }
        return this;
      },
      // @method addEventParent(obj: Evented): this
      // Adds an event parent - an `Evented` that will receive propagated events
      addEventParent: function(t) {
        return this._eventParents = this._eventParents || {}, this._eventParents[_(t)] = t, this;
      },
      // @method removeEventParent(obj: Evented): this
      // Removes an event parent, so it will stop receiving propagated events
      removeEventParent: function(t) {
        return this._eventParents && delete this._eventParents[_(t)], this;
      },
      _propagateEvent: function(t) {
        for (var e in this._eventParents)
          this._eventParents[e].fire(t.type, h({
            layer: t.target,
            propagatedFrom: t.target
          }, t), !0);
      }
    };
    it.addEventListener = it.on, it.removeEventListener = it.clearAllEventListeners = it.off, it.addOneTimeEventListener = it.once, it.fireEvent = it.fire, it.hasEventListeners = it.listens;
    var Ft = gt.extend(it);
    function k(t, e, i) {
      this.x = i ? Math.round(t) : t, this.y = i ? Math.round(e) : e;
    }
    var _i = Math.trunc || function(t) {
      return t > 0 ? Math.floor(t) : Math.ceil(t);
    };
    k.prototype = {
      // @method clone(): Point
      // Returns a copy of the current point.
      clone: function() {
        return new k(this.x, this.y);
      },
      // @method add(otherPoint: Point): Point
      // Returns the result of addition of the current and the given points.
      add: function(t) {
        return this.clone()._add(E(t));
      },
      _add: function(t) {
        return this.x += t.x, this.y += t.y, this;
      },
      // @method subtract(otherPoint: Point): Point
      // Returns the result of subtraction of the given point from the current.
      subtract: function(t) {
        return this.clone()._subtract(E(t));
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
        return new k(this.x * t.x, this.y * t.y);
      },
      // @method unscaleBy(scale: Point): Point
      // Inverse of `scaleBy`. Divide each coordinate of the current point by
      // each coordinate of `scale`.
      unscaleBy: function(t) {
        return new k(this.x / t.x, this.y / t.y);
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
        return this.x = _i(this.x), this.y = _i(this.y), this;
      },
      // @method distanceTo(otherPoint: Point): Number
      // Returns the cartesian distance between the current and the given points.
      distanceTo: function(t) {
        t = E(t);
        var e = t.x - this.x, i = t.y - this.y;
        return Math.sqrt(e * e + i * i);
      },
      // @method equals(otherPoint: Point): Boolean
      // Returns `true` if the given point has the same coordinates.
      equals: function(t) {
        return t = E(t), t.x === this.x && t.y === this.y;
      },
      // @method contains(otherPoint: Point): Boolean
      // Returns `true` if both coordinates of the given point are less than the corresponding current point coordinates (in absolute values).
      contains: function(t) {
        return t = E(t), Math.abs(t.x) <= Math.abs(this.x) && Math.abs(t.y) <= Math.abs(this.y);
      },
      // @method toString(): String
      // Returns a string representation of the point for debugging purposes.
      toString: function() {
        return "Point(" + C(this.x) + ", " + C(this.y) + ")";
      }
    };
    function E(t, e, i) {
      return t instanceof k ? t : lt(t) ? new k(t[0], t[1]) : t == null ? t : typeof t == "object" && "x" in t && "y" in t ? new k(t.x, t.y) : new k(t, e, i);
    }
    function F(t, e) {
      if (t)
        for (var i = e ? [t, e] : t, n = 0, a = i.length; n < a; n++)
          this.extend(i[n]);
    }
    F.prototype = {
      // @method extend(point: Point): this
      // Extends the bounds to contain the given point.
      // @alternative
      // @method extend(otherBounds: Bounds): this
      // Extend the bounds to contain the given bounds
      extend: function(t) {
        var e, i;
        if (!t)
          return this;
        if (t instanceof k || typeof t[0] == "number" || "x" in t)
          e = i = E(t);
        else if (t = Q(t), e = t.min, i = t.max, !e || !i)
          return this;
        return !this.min && !this.max ? (this.min = e.clone(), this.max = i.clone()) : (this.min.x = Math.min(e.x, this.min.x), this.max.x = Math.max(i.x, this.max.x), this.min.y = Math.min(e.y, this.min.y), this.max.y = Math.max(i.y, this.max.y)), this;
      },
      // @method getCenter(round?: Boolean): Point
      // Returns the center point of the bounds.
      getCenter: function(t) {
        return E(
          (this.min.x + this.max.x) / 2,
          (this.min.y + this.max.y) / 2,
          t
        );
      },
      // @method getBottomLeft(): Point
      // Returns the bottom-left point of the bounds.
      getBottomLeft: function() {
        return E(this.min.x, this.max.y);
      },
      // @method getTopRight(): Point
      // Returns the top-right point of the bounds.
      getTopRight: function() {
        return E(this.max.x, this.min.y);
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
        return typeof t[0] == "number" || t instanceof k ? t = E(t) : t = Q(t), t instanceof F ? (e = t.min, i = t.max) : e = i = t, e.x >= this.min.x && i.x <= this.max.x && e.y >= this.min.y && i.y <= this.max.y;
      },
      // @method intersects(otherBounds: Bounds): Boolean
      // Returns `true` if the rectangle intersects the given bounds. Two bounds
      // intersect if they have at least one point in common.
      intersects: function(t) {
        t = Q(t);
        var e = this.min, i = this.max, n = t.min, a = t.max, r = a.x >= e.x && n.x <= i.x, l = a.y >= e.y && n.y <= i.y;
        return r && l;
      },
      // @method overlaps(otherBounds: Bounds): Boolean
      // Returns `true` if the rectangle overlaps the given bounds. Two bounds
      // overlap if their intersection is an area.
      overlaps: function(t) {
        t = Q(t);
        var e = this.min, i = this.max, n = t.min, a = t.max, r = a.x > e.x && n.x < i.x, l = a.y > e.y && n.y < i.y;
        return r && l;
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
        return Q(
          E(e.x - n, e.y - a),
          E(i.x + n, i.y + a)
        );
      },
      // @method equals(otherBounds: Bounds): Boolean
      // Returns `true` if the rectangle is equivalent to the given bounds.
      equals: function(t) {
        return t ? (t = Q(t), this.min.equals(t.getTopLeft()) && this.max.equals(t.getBottomRight())) : !1;
      }
    };
    function Q(t, e) {
      return !t || t instanceof F ? t : new F(t, e);
    }
    function tt(t, e) {
      if (t)
        for (var i = e ? [t, e] : t, n = 0, a = i.length; n < a; n++)
          this.extend(i[n]);
    }
    tt.prototype = {
      // @method extend(latlng: LatLng): this
      // Extend the bounds to contain the given point
      // @alternative
      // @method extend(otherBounds: LatLngBounds): this
      // Extend the bounds to contain the given bounds
      extend: function(t) {
        var e = this._southWest, i = this._northEast, n, a;
        if (t instanceof R)
          n = t, a = t;
        else if (t instanceof tt) {
          if (n = t._southWest, a = t._northEast, !n || !a)
            return this;
        } else
          return t ? this.extend(M(t) || V(t)) : this;
        return !e && !i ? (this._southWest = new R(n.lat, n.lng), this._northEast = new R(a.lat, a.lng)) : (e.lat = Math.min(n.lat, e.lat), e.lng = Math.min(n.lng, e.lng), i.lat = Math.max(a.lat, i.lat), i.lng = Math.max(a.lng, i.lng)), this;
      },
      // @method pad(bufferRatio: Number): LatLngBounds
      // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
      // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
      // Negative values will retract the bounds.
      pad: function(t) {
        var e = this._southWest, i = this._northEast, n = Math.abs(e.lat - i.lat) * t, a = Math.abs(e.lng - i.lng) * t;
        return new tt(
          new R(e.lat - n, e.lng - a),
          new R(i.lat + n, i.lng + a)
        );
      },
      // @method getCenter(): LatLng
      // Returns the center point of the bounds.
      getCenter: function() {
        return new R(
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
        return new R(this.getNorth(), this.getWest());
      },
      // @method getSouthEast(): LatLng
      // Returns the south-east point of the bounds.
      getSouthEast: function() {
        return new R(this.getSouth(), this.getEast());
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
        typeof t[0] == "number" || t instanceof R || "lat" in t ? t = M(t) : t = V(t);
        var e = this._southWest, i = this._northEast, n, a;
        return t instanceof tt ? (n = t.getSouthWest(), a = t.getNorthEast()) : n = a = t, n.lat >= e.lat && a.lat <= i.lat && n.lng >= e.lng && a.lng <= i.lng;
      },
      // @method intersects(otherBounds: LatLngBounds): Boolean
      // Returns `true` if the rectangle intersects the given bounds. Two bounds intersect if they have at least one point in common.
      intersects: function(t) {
        t = V(t);
        var e = this._southWest, i = this._northEast, n = t.getSouthWest(), a = t.getNorthEast(), r = a.lat >= e.lat && n.lat <= i.lat, l = a.lng >= e.lng && n.lng <= i.lng;
        return r && l;
      },
      // @method overlaps(otherBounds: LatLngBounds): Boolean
      // Returns `true` if the rectangle overlaps the given bounds. Two bounds overlap if their intersection is an area.
      overlaps: function(t) {
        t = V(t);
        var e = this._southWest, i = this._northEast, n = t.getSouthWest(), a = t.getNorthEast(), r = a.lat > e.lat && n.lat < i.lat, l = a.lng > e.lng && n.lng < i.lng;
        return r && l;
      },
      // @method toBBoxString(): String
      // Returns a string with bounding box coordinates in a 'southwest_lng,southwest_lat,northeast_lng,northeast_lat' format. Useful for sending requests to web services that return geo data.
      toBBoxString: function() {
        return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(",");
      },
      // @method equals(otherBounds: LatLngBounds, maxMargin?: Number): Boolean
      // Returns `true` if the rectangle is equivalent (within a small margin of error) to the given bounds. The margin of error can be overridden by setting `maxMargin` to a small number.
      equals: function(t, e) {
        return t ? (t = V(t), this._southWest.equals(t.getSouthWest(), e) && this._northEast.equals(t.getNorthEast(), e)) : !1;
      },
      // @method isValid(): Boolean
      // Returns `true` if the bounds are properly initialized.
      isValid: function() {
        return !!(this._southWest && this._northEast);
      }
    };
    function V(t, e) {
      return t instanceof tt ? t : new tt(t, e);
    }
    function R(t, e, i) {
      if (isNaN(t) || isNaN(e))
        throw new Error("Invalid LatLng object: (" + t + ", " + e + ")");
      this.lat = +t, this.lng = +e, i !== void 0 && (this.alt = +i);
    }
    R.prototype = {
      // @method equals(otherLatLng: LatLng, maxMargin?: Number): Boolean
      // Returns `true` if the given `LatLng` point is at the same position (within a small margin of error). The margin of error can be overridden by setting `maxMargin` to a small number.
      equals: function(t, e) {
        if (!t)
          return !1;
        t = M(t);
        var i = Math.max(
          Math.abs(this.lat - t.lat),
          Math.abs(this.lng - t.lng)
        );
        return i <= (e === void 0 ? 1e-9 : e);
      },
      // @method toString(): String
      // Returns a string representation of the point (for debugging purposes).
      toString: function(t) {
        return "LatLng(" + C(this.lat, t) + ", " + C(this.lng, t) + ")";
      },
      // @method distanceTo(otherLatLng: LatLng): Number
      // Returns the distance (in meters) to the given `LatLng` calculated using the [Spherical Law of Cosines](https://en.wikipedia.org/wiki/Spherical_law_of_cosines).
      distanceTo: function(t) {
        return kt.distance(this, M(t));
      },
      // @method wrap(): LatLng
      // Returns a new `LatLng` object with the longitude wrapped so it's always between -180 and +180 degrees.
      wrap: function() {
        return kt.wrapLatLng(this);
      },
      // @method toBounds(sizeInMeters: Number): LatLngBounds
      // Returns a new `LatLngBounds` object in which each boundary is `sizeInMeters/2` meters apart from the `LatLng`.
      toBounds: function(t) {
        var e = 180 * t / 40075017, i = e / Math.cos(Math.PI / 180 * this.lat);
        return V(
          [this.lat - e, this.lng - i],
          [this.lat + e, this.lng + i]
        );
      },
      clone: function() {
        return new R(this.lat, this.lng, this.alt);
      }
    };
    function M(t, e, i) {
      return t instanceof R ? t : lt(t) && typeof t[0] != "object" ? t.length === 3 ? new R(t[0], t[1], t[2]) : t.length === 2 ? new R(t[0], t[1]) : null : t == null ? t : typeof t == "object" && "lat" in t ? new R(t.lat, "lng" in t ? t.lng : t.lon, t.alt) : e === void 0 ? null : new R(t, e, i);
    }
    var vt = {
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
        return new F(n, a);
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
        var e = this.wrapLng ? O(t.lng, this.wrapLng, !0) : t.lng, i = this.wrapLat ? O(t.lat, this.wrapLat, !0) : t.lat, n = t.alt;
        return new R(i, e, n);
      },
      // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
      // Returns a `LatLngBounds` with the same size as the given one, ensuring
      // that its center is within the CRS's bounds.
      // Only accepts actual `L.LatLngBounds` instances, not arrays.
      wrapLatLngBounds: function(t) {
        var e = t.getCenter(), i = this.wrapLatLng(e), n = e.lat - i.lat, a = e.lng - i.lng;
        if (n === 0 && a === 0)
          return t;
        var r = t.getSouthWest(), l = t.getNorthEast(), u = new R(r.lat - n, r.lng - a), d = new R(l.lat - n, l.lng - a);
        return new tt(u, d);
      }
    }, kt = h({}, vt, {
      wrapLng: [-180, 180],
      // Mean Earth Radius, as recommended for use by
      // the International Union of Geodesy and Geophysics,
      // see https://rosettacode.org/wiki/Haversine_formula
      R: 6371e3,
      // distance between two geographical points using spherical law of cosines approximation
      distance: function(t, e) {
        var i = Math.PI / 180, n = t.lat * i, a = e.lat * i, r = Math.sin((e.lat - t.lat) * i / 2), l = Math.sin((e.lng - t.lng) * i / 2), u = r * r + Math.cos(n) * Math.cos(a) * l * l, d = 2 * Math.atan2(Math.sqrt(u), Math.sqrt(1 - u));
        return this.R * d;
      }
    }), gi = 6378137, Ce = {
      R: gi,
      MAX_LATITUDE: 85.0511287798,
      project: function(t) {
        var e = Math.PI / 180, i = this.MAX_LATITUDE, n = Math.max(Math.min(i, t.lat), -i), a = Math.sin(n * e);
        return new k(
          this.R * t.lng * e,
          this.R * Math.log((1 + a) / (1 - a)) / 2
        );
      },
      unproject: function(t) {
        var e = 180 / Math.PI;
        return new R(
          (2 * Math.atan(Math.exp(t.y / this.R)) - Math.PI / 2) * e,
          t.x * e / this.R
        );
      },
      bounds: function() {
        var t = gi * Math.PI;
        return new F([-t, -t], [t, t]);
      }()
    };
    function Pe(t, e, i, n) {
      if (lt(t)) {
        this._a = t[0], this._b = t[1], this._c = t[2], this._d = t[3];
        return;
      }
      this._a = t, this._b = e, this._c = i, this._d = n;
    }
    Pe.prototype = {
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
        return e = e || 1, new k(
          (t.x / e - this._b) / this._a,
          (t.y / e - this._d) / this._c
        );
      }
    };
    function qt(t, e, i, n) {
      return new Pe(t, e, i, n);
    }
    var Te = h({}, kt, {
      code: "EPSG:3857",
      projection: Ce,
      transformation: function() {
        var t = 0.5 / (Math.PI * Ce.R);
        return qt(t, 0.5, -t, 0.5);
      }()
    }), Rn = h({}, Te, {
      code: "EPSG:900913"
    });
    function vi(t) {
      return document.createElementNS("http://www.w3.org/2000/svg", t);
    }
    function bi(t, e) {
      var i = "", n, a, r, l, u, d;
      for (n = 0, r = t.length; n < r; n++) {
        for (u = t[n], a = 0, l = u.length; a < l; a++)
          d = u[a], i += (a ? "L" : "M") + d.x + " " + d.y;
        i += e ? b.svg ? "z" : "x" : "";
      }
      return i || "M0 0";
    }
    var ze = document.documentElement.style, oe = "ActiveXObject" in window, Nn = oe && !document.addEventListener, xi = "msLaunchUri" in navigator && !("documentMode" in document), Se = ft("webkit"), yi = ft("android"), wi = ft("android 2") || ft("android 3"), Dn = parseInt(/WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1], 10), Hn = yi && ft("Google") && Dn < 537 && !("AudioNode" in window), Me = !!window.opera, Ei = !xi && ft("chrome"), ki = ft("gecko") && !Se && !Me && !oe, Fn = !Ei && ft("safari"), Li = ft("phantom"), Ai = "OTransition" in ze, qn = navigator.platform.indexOf("Win") === 0, Ci = oe && "transition" in ze, Ie = "WebKitCSSMatrix" in window && "m11" in new window.WebKitCSSMatrix() && !wi, Pi = "MozPerspective" in ze, Wn = !window.L_DISABLE_3D && (Ci || Ie || Pi) && !Ai && !Li, Wt = typeof orientation < "u" || ft("mobile"), Un = Wt && Se, Vn = Wt && Ie, Ti = !window.PointerEvent && window.MSPointerEvent, zi = !!(window.PointerEvent || Ti), Si = "ontouchstart" in window || !!window.TouchEvent, jn = !window.L_NO_TOUCH && (Si || zi), Gn = Wt && Me, Kn = Wt && ki, Yn = (window.devicePixelRatio || window.screen.deviceXDPI / window.screen.logicalXDPI) > 1, Jn = function() {
      var t = !1;
      try {
        var e = Object.defineProperty({}, "passive", {
          get: function() {
            t = !0;
          }
        });
        window.addEventListener("testPassiveEventSupport", w, e), window.removeEventListener("testPassiveEventSupport", w, e);
      } catch {
      }
      return t;
    }(), Xn = function() {
      return !!document.createElement("canvas").getContext;
    }(), Oe = !!(document.createElementNS && vi("svg").createSVGRect), $n = !!Oe && function() {
      var t = document.createElement("div");
      return t.innerHTML = "<svg/>", (t.firstChild && t.firstChild.namespaceURI) === "http://www.w3.org/2000/svg";
    }(), Qn = !Oe && function() {
      try {
        var t = document.createElement("div");
        t.innerHTML = '<v:shape adj="1"/>';
        var e = t.firstChild;
        return e.style.behavior = "url(#default#VML)", e && typeof e.adj == "object";
      } catch {
        return !1;
      }
    }(), to = navigator.platform.indexOf("Mac") === 0, eo = navigator.platform.indexOf("Linux") === 0;
    function ft(t) {
      return navigator.userAgent.toLowerCase().indexOf(t) >= 0;
    }
    var b = {
      ie: oe,
      ielt9: Nn,
      edge: xi,
      webkit: Se,
      android: yi,
      android23: wi,
      androidStock: Hn,
      opera: Me,
      chrome: Ei,
      gecko: ki,
      safari: Fn,
      phantom: Li,
      opera12: Ai,
      win: qn,
      ie3d: Ci,
      webkit3d: Ie,
      gecko3d: Pi,
      any3d: Wn,
      mobile: Wt,
      mobileWebkit: Un,
      mobileWebkit3d: Vn,
      msPointer: Ti,
      pointer: zi,
      touch: jn,
      touchNative: Si,
      mobileOpera: Gn,
      mobileGecko: Kn,
      retina: Yn,
      passiveEvents: Jn,
      canvas: Xn,
      svg: Oe,
      vml: Qn,
      inlineSvg: $n,
      mac: to,
      linux: eo
    }, Mi = b.msPointer ? "MSPointerDown" : "pointerdown", Ii = b.msPointer ? "MSPointerMove" : "pointermove", Oi = b.msPointer ? "MSPointerUp" : "pointerup", Bi = b.msPointer ? "MSPointerCancel" : "pointercancel", Be = {
      touchstart: Mi,
      touchmove: Ii,
      touchend: Oi,
      touchcancel: Bi
    }, Zi = {
      touchstart: so,
      touchmove: ae,
      touchend: ae,
      touchcancel: ae
    }, Mt = {}, Ri = !1;
    function io(t, e, i) {
      return e === "touchstart" && ro(), Zi[e] ? (i = Zi[e].bind(this, i), t.addEventListener(Be[e], i, !1), i) : (console.warn("wrong event specified:", e), w);
    }
    function no(t, e, i) {
      if (!Be[e]) {
        console.warn("wrong event specified:", e);
        return;
      }
      t.removeEventListener(Be[e], i, !1);
    }
    function oo(t) {
      Mt[t.pointerId] = t;
    }
    function ao(t) {
      Mt[t.pointerId] && (Mt[t.pointerId] = t);
    }
    function Ni(t) {
      delete Mt[t.pointerId];
    }
    function ro() {
      Ri || (document.addEventListener(Mi, oo, !0), document.addEventListener(Ii, ao, !0), document.addEventListener(Oi, Ni, !0), document.addEventListener(Bi, Ni, !0), Ri = !0);
    }
    function ae(t, e) {
      if (e.pointerType !== (e.MSPOINTER_TYPE_MOUSE || "mouse")) {
        e.touches = [];
        for (var i in Mt)
          e.touches.push(Mt[i]);
        e.changedTouches = [e], t(e);
      }
    }
    function so(t, e) {
      e.MSPOINTER_TYPE_TOUCH && e.pointerType === e.MSPOINTER_TYPE_TOUCH && Y(e), ae(t, e);
    }
    function lo(t) {
      var e = {}, i, n;
      for (n in t)
        i = t[n], e[n] = i && i.bind ? i.bind(t) : i;
      return t = e, e.type = "dblclick", e.detail = 2, e.isTrusted = !1, e._simulated = !0, e;
    }
    var ho = 200;
    function uo(t, e) {
      t.addEventListener("dblclick", e);
      var i = 0, n;
      function a(r) {
        if (r.detail !== 1) {
          n = r.detail;
          return;
        }
        if (!(r.pointerType === "mouse" || r.sourceCapabilities && !r.sourceCapabilities.firesTouchEvents)) {
          var l = Wi(r);
          if (!(l.some(function(d) {
            return d instanceof HTMLLabelElement && d.attributes.for;
          }) && !l.some(function(d) {
            return d instanceof HTMLInputElement || d instanceof HTMLSelectElement;
          }))) {
            var u = Date.now();
            u - i <= ho ? (n++, n === 2 && e(lo(r))) : n = 1, i = u;
          }
        }
      }
      return t.addEventListener("click", a), {
        dblclick: e,
        simDblclick: a
      };
    }
    function co(t, e) {
      t.removeEventListener("dblclick", e.dblclick), t.removeEventListener("click", e.simDblclick);
    }
    var Ze = le(
      ["transform", "webkitTransform", "OTransform", "MozTransform", "msTransform"]
    ), Ut = le(
      ["webkitTransition", "transition", "OTransition", "MozTransition", "msTransition"]
    ), Di = Ut === "webkitTransition" || Ut === "OTransition" ? Ut + "End" : "transitionend";
    function Hi(t) {
      return typeof t == "string" ? document.getElementById(t) : t;
    }
    function Vt(t, e) {
      var i = t.style[e] || t.currentStyle && t.currentStyle[e];
      if ((!i || i === "auto") && document.defaultView) {
        var n = document.defaultView.getComputedStyle(t, null);
        i = n ? n[e] : null;
      }
      return i === "auto" ? null : i;
    }
    function B(t, e, i) {
      var n = document.createElement(t);
      return n.className = e || "", i && i.appendChild(n), n;
    }
    function q(t) {
      var e = t.parentNode;
      e && e.removeChild(t);
    }
    function re(t) {
      for (; t.firstChild; )
        t.removeChild(t.firstChild);
    }
    function It(t) {
      var e = t.parentNode;
      e && e.lastChild !== t && e.appendChild(t);
    }
    function Ot(t) {
      var e = t.parentNode;
      e && e.firstChild !== t && e.insertBefore(t, e.firstChild);
    }
    function Re(t, e) {
      if (t.classList !== void 0)
        return t.classList.contains(e);
      var i = se(t);
      return i.length > 0 && new RegExp("(^|\\s)" + e + "(\\s|$)").test(i);
    }
    function P(t, e) {
      if (t.classList !== void 0)
        for (var i = N(e), n = 0, a = i.length; n < a; n++)
          t.classList.add(i[n]);
      else if (!Re(t, e)) {
        var r = se(t);
        Ne(t, (r ? r + " " : "") + e);
      }
    }
    function U(t, e) {
      t.classList !== void 0 ? t.classList.remove(e) : Ne(t, W((" " + se(t) + " ").replace(" " + e + " ", " ")));
    }
    function Ne(t, e) {
      t.className.baseVal === void 0 ? t.className = e : t.className.baseVal = e;
    }
    function se(t) {
      return t.correspondingElement && (t = t.correspondingElement), t.className.baseVal === void 0 ? t.className : t.className.baseVal;
    }
    function at(t, e) {
      "opacity" in t.style ? t.style.opacity = e : "filter" in t.style && fo(t, e);
    }
    function fo(t, e) {
      var i = !1, n = "DXImageTransform.Microsoft.Alpha";
      try {
        i = t.filters.item(n);
      } catch {
        if (e === 1)
          return;
      }
      e = Math.round(e * 100), i ? (i.Enabled = e !== 100, i.Opacity = e) : t.style.filter += " progid:" + n + "(opacity=" + e + ")";
    }
    function le(t) {
      for (var e = document.documentElement.style, i = 0; i < t.length; i++)
        if (t[i] in e)
          return t[i];
      return !1;
    }
    function Ct(t, e, i) {
      var n = e || new k(0, 0);
      t.style[Ze] = (b.ie3d ? "translate(" + n.x + "px," + n.y + "px)" : "translate3d(" + n.x + "px," + n.y + "px,0)") + (i ? " scale(" + i + ")" : "");
    }
    function j(t, e) {
      t._leaflet_pos = e, b.any3d ? Ct(t, e) : (t.style.left = e.x + "px", t.style.top = e.y + "px");
    }
    function Pt(t) {
      return t._leaflet_pos || new k(0, 0);
    }
    var jt, Gt, De;
    if ("onselectstart" in document)
      jt = function() {
        A(window, "selectstart", Y);
      }, Gt = function() {
        H(window, "selectstart", Y);
      };
    else {
      var Kt = le(
        ["userSelect", "WebkitUserSelect", "OUserSelect", "MozUserSelect", "msUserSelect"]
      );
      jt = function() {
        if (Kt) {
          var t = document.documentElement.style;
          De = t[Kt], t[Kt] = "none";
        }
      }, Gt = function() {
        Kt && (document.documentElement.style[Kt] = De, De = void 0);
      };
    }
    function He() {
      A(window, "dragstart", Y);
    }
    function Fe() {
      H(window, "dragstart", Y);
    }
    var he, qe;
    function We(t) {
      for (; t.tabIndex === -1; )
        t = t.parentNode;
      t.style && (ue(), he = t, qe = t.style.outlineStyle, t.style.outlineStyle = "none", A(window, "keydown", ue));
    }
    function ue() {
      he && (he.style.outlineStyle = qe, he = void 0, qe = void 0, H(window, "keydown", ue));
    }
    function Fi(t) {
      do
        t = t.parentNode;
      while ((!t.offsetWidth || !t.offsetHeight) && t !== document.body);
      return t;
    }
    function Ue(t) {
      var e = t.getBoundingClientRect();
      return {
        x: e.width / t.offsetWidth || 1,
        y: e.height / t.offsetHeight || 1,
        boundingClientRect: e
      };
    }
    var po = {
      __proto__: null,
      TRANSFORM: Ze,
      TRANSITION: Ut,
      TRANSITION_END: Di,
      get: Hi,
      getStyle: Vt,
      create: B,
      remove: q,
      empty: re,
      toFront: It,
      toBack: Ot,
      hasClass: Re,
      addClass: P,
      removeClass: U,
      setClass: Ne,
      getClass: se,
      setOpacity: at,
      testProp: le,
      setTransform: Ct,
      setPosition: j,
      getPosition: Pt,
      get disableTextSelection() {
        return jt;
      },
      get enableTextSelection() {
        return Gt;
      },
      disableImageDrag: He,
      enableImageDrag: Fe,
      preventOutline: We,
      restoreOutline: ue,
      getSizedParentNode: Fi,
      getScale: Ue
    };
    function A(t, e, i, n) {
      if (e && typeof e == "object")
        for (var a in e)
          je(t, a, e[a], i);
      else {
        e = N(e);
        for (var r = 0, l = e.length; r < l; r++)
          je(t, e[r], i, n);
      }
      return this;
    }
    var pt = "_leaflet_events";
    function H(t, e, i, n) {
      if (arguments.length === 1)
        qi(t), delete t[pt];
      else if (e && typeof e == "object")
        for (var a in e)
          Ge(t, a, e[a], i);
      else if (e = N(e), arguments.length === 2)
        qi(t, function(u) {
          return ke(e, u) !== -1;
        });
      else
        for (var r = 0, l = e.length; r < l; r++)
          Ge(t, e[r], i, n);
      return this;
    }
    function qi(t, e) {
      for (var i in t[pt]) {
        var n = i.split(/\d/)[0];
        (!e || e(n)) && Ge(t, n, null, null, i);
      }
    }
    var Ve = {
      mouseenter: "mouseover",
      mouseleave: "mouseout",
      wheel: !("onwheel" in window) && "mousewheel"
    };
    function je(t, e, i, n) {
      var a = e + _(i) + (n ? "_" + _(n) : "");
      if (t[pt] && t[pt][a])
        return this;
      var r = function(u) {
        return i.call(n || t, u || window.event);
      }, l = r;
      !b.touchNative && b.pointer && e.indexOf("touch") === 0 ? r = io(t, e, r) : b.touch && e === "dblclick" ? r = uo(t, r) : "addEventListener" in t ? e === "touchstart" || e === "touchmove" || e === "wheel" || e === "mousewheel" ? t.addEventListener(Ve[e] || e, r, b.passiveEvents ? { passive: !1 } : !1) : e === "mouseenter" || e === "mouseleave" ? (r = function(u) {
        u = u || window.event, Ye(t, u) && l(u);
      }, t.addEventListener(Ve[e], r, !1)) : t.addEventListener(e, l, !1) : t.attachEvent("on" + e, r), t[pt] = t[pt] || {}, t[pt][a] = r;
    }
    function Ge(t, e, i, n, a) {
      a = a || e + _(i) + (n ? "_" + _(n) : "");
      var r = t[pt] && t[pt][a];
      if (!r)
        return this;
      !b.touchNative && b.pointer && e.indexOf("touch") === 0 ? no(t, e, r) : b.touch && e === "dblclick" ? co(t, r) : "removeEventListener" in t ? t.removeEventListener(Ve[e] || e, r, !1) : t.detachEvent("on" + e, r), t[pt][a] = null;
    }
    function Tt(t) {
      return t.stopPropagation ? t.stopPropagation() : t.originalEvent ? t.originalEvent._stopped = !0 : t.cancelBubble = !0, this;
    }
    function Ke(t) {
      return je(t, "wheel", Tt), this;
    }
    function Yt(t) {
      return A(t, "mousedown touchstart dblclick contextmenu", Tt), t._leaflet_disable_click = !0, this;
    }
    function Y(t) {
      return t.preventDefault ? t.preventDefault() : t.returnValue = !1, this;
    }
    function zt(t) {
      return Y(t), Tt(t), this;
    }
    function Wi(t) {
      if (t.composedPath)
        return t.composedPath();
      for (var e = [], i = t.target; i; )
        e.push(i), i = i.parentNode;
      return e;
    }
    function Ui(t, e) {
      if (!e)
        return new k(t.clientX, t.clientY);
      var i = Ue(e), n = i.boundingClientRect;
      return new k(
        // offset.left/top values are in page scale (like clientX/Y),
        // whereas clientLeft/Top (border width) values are the original values (before CSS scale applies).
        (t.clientX - n.left) / i.x - e.clientLeft,
        (t.clientY - n.top) / i.y - e.clientTop
      );
    }
    var mo = b.linux && b.chrome ? window.devicePixelRatio : b.mac ? window.devicePixelRatio * 3 : window.devicePixelRatio > 0 ? 2 * window.devicePixelRatio : 1;
    function Vi(t) {
      return b.edge ? t.wheelDeltaY / 2 : (
        // Don't trust window-geometry-based delta
        t.deltaY && t.deltaMode === 0 ? -t.deltaY / mo : (
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
    function Ye(t, e) {
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
    var _o = {
      __proto__: null,
      on: A,
      off: H,
      stopPropagation: Tt,
      disableScrollPropagation: Ke,
      disableClickPropagation: Yt,
      preventDefault: Y,
      stop: zt,
      getPropagationPath: Wi,
      getMousePosition: Ui,
      getWheelDelta: Vi,
      isExternalTarget: Ye,
      addListener: A,
      removeListener: H
    }, ji = Ft.extend({
      // @method run(el: HTMLElement, newPos: Point, duration?: Number, easeLinearity?: Number)
      // Run an animation of a given element to a new position, optionally setting
      // duration in seconds (`0.25` by default) and easing linearity factor (3rd
      // argument of the [cubic bezier curve](https://cubic-bezier.com/#0,0,.5,1),
      // `0.5` by default).
      run: function(t, e, i, n) {
        this.stop(), this._el = t, this._inProgress = !0, this._duration = i || 0.25, this._easeOutPower = 1 / Math.max(n || 0.5, 0.2), this._startPos = Pt(t), this._offset = e.subtract(this._startPos), this._startTime = +/* @__PURE__ */ new Date(), this.fire("start"), this._animate();
      },
      // @method stop()
      // Stops the animation (if currently running).
      stop: function() {
        this._inProgress && (this._step(!0), this._complete());
      },
      _animate: function() {
        this._animId = $(this._animate, this), this._step();
      },
      _step: function(t) {
        var e = +/* @__PURE__ */ new Date() - this._startTime, i = this._duration * 1e3;
        e < i ? this._runFrame(this._easeOut(e / i), t) : (this._runFrame(1), this._complete());
      },
      _runFrame: function(t, e) {
        var i = this._startPos.add(this._offset.multiplyBy(t));
        e && i._round(), j(this._el, i), this.fire("step");
      },
      _complete: function() {
        ot(this._animId), this._inProgress = !1, this.fire("end");
      },
      _easeOut: function(t) {
        return 1 - Math.pow(1 - t, this._easeOutPower);
      }
    }), I = Ft.extend({
      options: {
        // @section Map State Options
        // @option crs: CRS = L.CRS.EPSG3857
        // The [Coordinate Reference System](#crs) to use. Don't change this if you're not
        // sure what it means.
        crs: Te,
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
        e = x(this, e), this._handlers = [], this._layers = {}, this._zoomBoundLayers = {}, this._sizeChanged = !0, this._initContainer(t), this._initLayout(), this._onResize = c(this._onResize, this), this._initEvents(), e.maxBounds && this.setMaxBounds(e.maxBounds), e.zoom !== void 0 && (this._zoom = this._limitZoom(e.zoom)), e.center && e.zoom !== void 0 && this.setView(M(e.center), e.zoom, { reset: !0 }), this.callInitHooks(), this._zoomAnimated = Ut && b.any3d && !b.mobileOpera && this.options.zoomAnimation, this._zoomAnimated && (this._createAnimProxy(), A(this._proxy, Di, this._catchTransitionEnd, this)), this._addLayers(this.options.layers);
      },
      // @section Methods for modifying map state
      // @method setView(center: LatLng, zoom: Number, options?: Zoom/pan options): this
      // Sets the view of the map (geographical center and zoom) with the given
      // animation options.
      setView: function(t, e, i) {
        if (e = e === void 0 ? this._zoom : this._limitZoom(e), t = this._limitCenter(M(t), e, this.options.maxBounds), i = i || {}, this._stop(), this._loaded && !i.reset && i !== !0) {
          i.animate !== void 0 && (i.zoom = h({ animate: i.animate }, i.zoom), i.pan = h({ animate: i.animate, duration: i.duration }, i.pan));
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
        return t = t || (b.any3d ? this.options.zoomDelta : 1), this.setZoom(this._zoom + t, e);
      },
      // @method zoomOut(delta?: Number, options?: Zoom options): this
      // Decreases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
      zoomOut: function(t, e) {
        return t = t || (b.any3d ? this.options.zoomDelta : 1), this.setZoom(this._zoom - t, e);
      },
      // @method setZoomAround(latlng: LatLng, zoom: Number, options: Zoom options): this
      // Zooms the map while keeping a specified geographical point on the map
      // stationary (e.g. used internally for scroll zoom and double-click zoom).
      // @alternative
      // @method setZoomAround(offset: Point, zoom: Number, options: Zoom options): this
      // Zooms the map while keeping a specified pixel on the map (relative to the top-left corner) stationary.
      setZoomAround: function(t, e, i) {
        var n = this.getZoomScale(e), a = this.getSize().divideBy(2), r = t instanceof k ? t : this.latLngToContainerPoint(t), l = r.subtract(a).multiplyBy(1 - 1 / n), u = this.containerPointToLatLng(a.add(l));
        return this.setView(u, e, { zoom: i });
      },
      _getBoundsCenterZoom: function(t, e) {
        e = e || {}, t = t.getBounds ? t.getBounds() : V(t);
        var i = E(e.paddingTopLeft || e.padding || [0, 0]), n = E(e.paddingBottomRight || e.padding || [0, 0]), a = this.getBoundsZoom(t, !1, i.add(n));
        if (a = typeof e.maxZoom == "number" ? Math.min(e.maxZoom, a) : a, a === 1 / 0)
          return {
            center: t.getCenter(),
            zoom: a
          };
        var r = n.subtract(i).divideBy(2), l = this.project(t.getSouthWest(), a), u = this.project(t.getNorthEast(), a), d = this.unproject(l.add(u).divideBy(2).add(r), a);
        return {
          center: d,
          zoom: a
        };
      },
      // @method fitBounds(bounds: LatLngBounds, options?: fitBounds options): this
      // Sets a map view that contains the given geographical bounds with the
      // maximum zoom level possible.
      fitBounds: function(t, e) {
        if (t = V(t), !t.isValid())
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
        if (t = E(t).round(), e = e || {}, !t.x && !t.y)
          return this.fire("moveend");
        if (e.animate !== !0 && !this.getSize().contains(t))
          return this._resetView(this.unproject(this.project(this.getCenter()).add(t)), this.getZoom()), this;
        if (this._panAnim || (this._panAnim = new ji(), this._panAnim.on({
          step: this._onPanTransitionStep,
          end: this._onPanTransitionEnd
        }, this)), e.noMoveStart || this.fire("movestart"), e.animate !== !1) {
          P(this._mapPane, "leaflet-pan-anim");
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
        if (i = i || {}, i.animate === !1 || !b.any3d)
          return this.setView(t, e, i);
        this._stop();
        var n = this.project(this.getCenter()), a = this.project(t), r = this.getSize(), l = this._zoom;
        t = M(t), e = e === void 0 ? l : e;
        var u = Math.max(r.x, r.y), d = u * this.getZoomScale(l, e), m = a.distanceTo(n) || 1, g = 1.42, y = g * g;
        function z(G) {
          var we = G ? -1 : 1, oa = G ? d : u, aa = d * d - u * u + we * y * y * m * m, ra = 2 * oa * y * m, ri = aa / ra, Cn = Math.sqrt(ri * ri + 1) - ri, sa = Cn < 1e-9 ? -18 : Math.log(Cn);
          return sa;
        }
        function J(G) {
          return (Math.exp(G) - Math.exp(-G)) / 2;
        }
        function K(G) {
          return (Math.exp(G) + Math.exp(-G)) / 2;
        }
        function st(G) {
          return J(G) / K(G);
        }
        var et = z(0);
        function Ht(G) {
          return u * (K(et) / K(et + g * G));
        }
        function ta(G) {
          return u * (K(et) * st(et + g * G) - J(et)) / y;
        }
        function ea(G) {
          return 1 - Math.pow(1 - G, 1.5);
        }
        var ia = Date.now(), Ln = (z(1) - et) / g, na = i.duration ? 1e3 * i.duration : 1e3 * Ln * 0.8;
        function An() {
          var G = (Date.now() - ia) / na, we = ea(G) * Ln;
          G <= 1 ? (this._flyToFrame = $(An, this), this._move(
            this.unproject(n.add(a.subtract(n).multiplyBy(ta(we) / m)), l),
            this.getScaleZoom(u / Ht(we), l),
            { flyTo: !0 }
          )) : this._move(t, e)._moveEnd(!0);
        }
        return this._moveStart(!0, i.noMoveStart), An.call(this), this;
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
        return t = V(t), this.listens("moveend", this._panInsideMaxBounds) && this.off("moveend", this._panInsideMaxBounds), t.isValid() ? (this.options.maxBounds = t, this._loaded && this._panInsideMaxBounds(), this.on("moveend", this._panInsideMaxBounds)) : (this.options.maxBounds = null, this);
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
        var i = this.getCenter(), n = this._limitCenter(i, this._zoom, V(t));
        return i.equals(n) || this.panTo(n, e), this._enforcingBounds = !1, this;
      },
      // @method panInside(latlng: LatLng, options?: padding options): this
      // Pans the map the minimum amount to make the `latlng` visible. Use
      // padding options to fit the display to more restricted bounds.
      // If `latlng` is already within the (optionally padded) display bounds,
      // the map will not be panned.
      panInside: function(t, e) {
        e = e || {};
        var i = E(e.paddingTopLeft || e.padding || [0, 0]), n = E(e.paddingBottomRight || e.padding || [0, 0]), a = this.project(this.getCenter()), r = this.project(t), l = this.getPixelBounds(), u = Q([l.min.add(i), l.max.subtract(n)]), d = u.getSize();
        if (!u.contains(r)) {
          this._enforcingBounds = !0;
          var m = r.subtract(u.getCenter()), g = u.extend(r).getSize().subtract(d);
          a.x += m.x < 0 ? -g.x : g.x, a.y += m.y < 0 ? -g.y : g.y, this.panTo(this.unproject(a), e), this._enforcingBounds = !1;
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
        t = h({
          animate: !1,
          pan: !0
        }, t === !0 ? { animate: !0 } : t);
        var e = this.getSize();
        this._sizeChanged = !0, this._lastCenter = null;
        var i = this.getSize(), n = e.divideBy(2).round(), a = i.divideBy(2).round(), r = n.subtract(a);
        return !r.x && !r.y ? this : (t.animate && t.pan ? this.panBy(r) : (t.pan && this._rawPanBy(r), this.fire("move"), t.debounceMoveend ? (clearTimeout(this._sizeTimer), this._sizeTimer = setTimeout(c(this.fire, this, "moveend"), 200)) : this.fire("moveend")), this.fire("resize", {
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
        if (t = this._locateOptions = h({
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
        var e = c(this._handleGeolocationResponse, this), i = c(this._handleGeolocationError, this);
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
          var e = t.coords.latitude, i = t.coords.longitude, n = new R(e, i), a = n.toBounds(t.coords.accuracy * 2), r = this._locateOptions;
          if (r.setView) {
            var l = this.getBoundsZoom(a);
            this.setView(n, r.maxZoom ? Math.min(l, r.maxZoom) : l);
          }
          var u = {
            latlng: n,
            bounds: a,
            timestamp: t.timestamp
          };
          for (var d in t.coords)
            typeof t.coords[d] == "number" && (u[d] = t.coords[d]);
          this.fire("locationfound", u);
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
        this._locationWatchId !== void 0 && this.stopLocate(), this._stop(), q(this._mapPane), this._clearControlPos && this._clearControlPos(), this._resizeRequest && (ot(this._resizeRequest), this._resizeRequest = null), this._clearHandlers(), this._loaded && this.fire("unload");
        var t;
        for (t in this._layers)
          this._layers[t].remove();
        for (t in this._panes)
          q(this._panes[t]);
        return this._layers = [], this._panes = [], delete this._mapPane, delete this._renderer, this;
      },
      // @section Other Methods
      // @method createPane(name: String, container?: HTMLElement): HTMLElement
      // Creates a new [map pane](#map-pane) with the given name if it doesn't exist already,
      // then returns it. The pane is created as a child of `container`, or
      // as a child of the main map pane if not set.
      createPane: function(t, e) {
        var i = "leaflet-pane" + (t ? " leaflet-" + t.replace("Pane", "") + "-pane" : ""), n = B("div", i, e || this._mapPane);
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
        return new tt(e, i);
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
        t = V(t), i = E(i || [0, 0]);
        var n = this.getZoom() || 0, a = this.getMinZoom(), r = this.getMaxZoom(), l = t.getNorthWest(), u = t.getSouthEast(), d = this.getSize().subtract(i), m = Q(this.project(u, n), this.project(l, n)).getSize(), g = b.any3d ? this.options.zoomSnap : 1, y = d.x / m.x, z = d.y / m.y, J = e ? Math.max(y, z) : Math.min(y, z);
        return n = this.getScaleZoom(J, n), g && (n = Math.round(n / (g / 100)) * (g / 100), n = e ? Math.ceil(n / g) * g : Math.floor(n / g) * g), Math.max(a, Math.min(r, n));
      },
      // @method getSize(): Point
      // Returns the current size of the map container (in pixels).
      getSize: function() {
        return (!this._size || this._sizeChanged) && (this._size = new k(
          this._container.clientWidth || 0,
          this._container.clientHeight || 0
        ), this._sizeChanged = !1), this._size.clone();
      },
      // @method getPixelBounds(): Bounds
      // Returns the bounds of the current map view in projected pixel
      // coordinates (sometimes useful in layer and overlay implementations).
      getPixelBounds: function(t, e) {
        var i = this._getTopLeftPoint(t, e);
        return new F(i, i.add(this.getSize()));
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
        return e = e === void 0 ? this._zoom : e, this.options.crs.latLngToPoint(M(t), e);
      },
      // @method unproject(point: Point, zoom: Number): LatLng
      // Inverse of [`project`](#map-project).
      unproject: function(t, e) {
        return e = e === void 0 ? this._zoom : e, this.options.crs.pointToLatLng(E(t), e);
      },
      // @method layerPointToLatLng(point: Point): LatLng
      // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
      // returns the corresponding geographical coordinate (for the current zoom level).
      layerPointToLatLng: function(t) {
        var e = E(t).add(this.getPixelOrigin());
        return this.unproject(e);
      },
      // @method latLngToLayerPoint(latlng: LatLng): Point
      // Given a geographical coordinate, returns the corresponding pixel coordinate
      // relative to the [origin pixel](#map-getpixelorigin).
      latLngToLayerPoint: function(t) {
        var e = this.project(M(t))._round();
        return e._subtract(this.getPixelOrigin());
      },
      // @method wrapLatLng(latlng: LatLng): LatLng
      // Returns a `LatLng` where `lat` and `lng` has been wrapped according to the
      // map's CRS's `wrapLat` and `wrapLng` properties, if they are outside the
      // CRS's bounds.
      // By default this means longitude is wrapped around the dateline so its
      // value is between -180 and +180 degrees.
      wrapLatLng: function(t) {
        return this.options.crs.wrapLatLng(M(t));
      },
      // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
      // Returns a `LatLngBounds` with the same size as the given one, ensuring that
      // its center is within the CRS's bounds.
      // By default this means the center longitude is wrapped around the dateline so its
      // value is between -180 and +180 degrees, and the majority of the bounds
      // overlaps the CRS's bounds.
      wrapLatLngBounds: function(t) {
        return this.options.crs.wrapLatLngBounds(V(t));
      },
      // @method distance(latlng1: LatLng, latlng2: LatLng): Number
      // Returns the distance between two geographical coordinates according to
      // the map's CRS. By default this measures distance in meters.
      distance: function(t, e) {
        return this.options.crs.distance(M(t), M(e));
      },
      // @method containerPointToLayerPoint(point: Point): Point
      // Given a pixel coordinate relative to the map container, returns the corresponding
      // pixel coordinate relative to the [origin pixel](#map-getpixelorigin).
      containerPointToLayerPoint: function(t) {
        return E(t).subtract(this._getMapPanePos());
      },
      // @method layerPointToContainerPoint(point: Point): Point
      // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
      // returns the corresponding pixel coordinate relative to the map container.
      layerPointToContainerPoint: function(t) {
        return E(t).add(this._getMapPanePos());
      },
      // @method containerPointToLatLng(point: Point): LatLng
      // Given a pixel coordinate relative to the map container, returns
      // the corresponding geographical coordinate (for the current zoom level).
      containerPointToLatLng: function(t) {
        var e = this.containerPointToLayerPoint(E(t));
        return this.layerPointToLatLng(e);
      },
      // @method latLngToContainerPoint(latlng: LatLng): Point
      // Given a geographical coordinate, returns the corresponding pixel coordinate
      // relative to the map container.
      latLngToContainerPoint: function(t) {
        return this.layerPointToContainerPoint(this.latLngToLayerPoint(M(t)));
      },
      // @method mouseEventToContainerPoint(ev: MouseEvent): Point
      // Given a MouseEvent object, returns the pixel coordinate relative to the
      // map container where the event took place.
      mouseEventToContainerPoint: function(t) {
        return Ui(t, this._container);
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
        var e = this._container = Hi(t);
        if (e) {
          if (e._leaflet_id)
            throw new Error("Map container is already initialized.");
        } else throw new Error("Map container not found.");
        A(e, "scroll", this._onScroll, this), this._containerId = _(e);
      },
      _initLayout: function() {
        var t = this._container;
        this._fadeAnimated = this.options.fadeAnimation && b.any3d, P(t, "leaflet-container" + (b.touch ? " leaflet-touch" : "") + (b.retina ? " leaflet-retina" : "") + (b.ielt9 ? " leaflet-oldie" : "") + (b.safari ? " leaflet-safari" : "") + (this._fadeAnimated ? " leaflet-fade-anim" : ""));
        var e = Vt(t, "position");
        e !== "absolute" && e !== "relative" && e !== "fixed" && e !== "sticky" && (t.style.position = "relative"), this._initPanes(), this._initControlPos && this._initControlPos();
      },
      _initPanes: function() {
        var t = this._panes = {};
        this._paneRenderers = {}, this._mapPane = this.createPane("mapPane", this._container), j(this._mapPane, new k(0, 0)), this.createPane("tilePane"), this.createPane("overlayPane"), this.createPane("shadowPane"), this.createPane("markerPane"), this.createPane("tooltipPane"), this.createPane("popupPane"), this.options.markerZoomAnimation || (P(t.markerPane, "leaflet-zoom-hide"), P(t.shadowPane, "leaflet-zoom-hide"));
      },
      // private methods that modify map state
      // @section Map state change events
      _resetView: function(t, e, i) {
        j(this._mapPane, new k(0, 0));
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
        return ot(this._flyToFrame), this._panAnim && this._panAnim.stop(), this;
      },
      _rawPanBy: function(t) {
        j(this._mapPane, this._getMapPanePos().subtract(t));
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
        this._targets = {}, this._targets[_(this._container)] = this;
        var e = t ? H : A;
        e(this._container, "click dblclick mousedown mouseup mouseover mouseout mousemove contextmenu keypress keydown keyup", this._handleDOMEvent, this), this.options.trackResize && e(window, "resize", this._onResize, this), b.any3d && this.options.transform3DLimit && (t ? this.off : this.on).call(this, "moveend", this._onMoveEnd);
      },
      _onResize: function() {
        ot(this._resizeRequest), this._resizeRequest = $(
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
        for (var i = [], n, a = e === "mouseout" || e === "mouseover", r = t.target || t.srcElement, l = !1; r; ) {
          if (n = this._targets[_(r)], n && (e === "click" || e === "preclick") && this._draggableMoved(n)) {
            l = !0;
            break;
          }
          if (n && n.listens(e, !0) && (a && !Ye(r, t) || (i.push(n), a)) || r === this._container)
            break;
          r = r.parentNode;
        }
        return !i.length && !l && !a && this.listens(e, !0) && (i = [this]), i;
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
          i === "mousedown" && We(e), this._fireDOMEvent(t, i);
        }
      },
      _mouseEvents: ["click", "dblclick", "mouseover", "mouseout", "contextmenu"],
      _fireDOMEvent: function(t, e, i) {
        if (t.type === "click") {
          var n = h({}, t);
          n.type = "preclick", this._fireDOMEvent(n, n.type, i);
        }
        var a = this._findEventTargets(t, e);
        if (i) {
          for (var r = [], l = 0; l < i.length; l++)
            i[l].listens(e, !0) && r.push(i[l]);
          a = r.concat(a);
        }
        if (a.length) {
          e === "contextmenu" && Y(t);
          var u = a[0], d = {
            originalEvent: t
          };
          if (t.type !== "keypress" && t.type !== "keydown" && t.type !== "keyup") {
            var m = u.getLatLng && (!u._radius || u._radius <= 10);
            d.containerPoint = m ? this.latLngToContainerPoint(u.getLatLng()) : this.mouseEventToContainerPoint(t), d.layerPoint = this.containerPointToLayerPoint(d.containerPoint), d.latlng = m ? u.getLatLng() : this.layerPointToLatLng(d.layerPoint);
          }
          for (l = 0; l < a.length; l++)
            if (a[l].fire(e, d, !0), d.originalEvent._stopped || a[l].options.bubblingMouseEvents === !1 && ke(this._mouseEvents, e) !== -1)
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
        return Pt(this._mapPane) || new k(0, 0);
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
        return Q([
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
        var n = this.project(t, e), a = this.getSize().divideBy(2), r = new F(n.subtract(a), n.add(a)), l = this._getBoundsOffset(r, i, e);
        return Math.abs(l.x) <= 1 && Math.abs(l.y) <= 1 ? t : this.unproject(n.add(l), e);
      },
      // adjust offset for view to get inside bounds
      _limitOffset: function(t, e) {
        if (!e)
          return t;
        var i = this.getPixelBounds(), n = new F(i.min.add(t), i.max.add(t));
        return t.add(this._getBoundsOffset(n, e));
      },
      // returns offset needed for pxBounds to get inside maxBounds at a specified zoom
      _getBoundsOffset: function(t, e, i) {
        var n = Q(
          this.project(e.getNorthEast(), i),
          this.project(e.getSouthWest(), i)
        ), a = n.min.subtract(t.min), r = n.max.subtract(t.max), l = this._rebound(a.x, -r.x), u = this._rebound(a.y, -r.y);
        return new k(l, u);
      },
      _rebound: function(t, e) {
        return t + e > 0 ? Math.round(t - e) / 2 : Math.max(0, Math.ceil(t)) - Math.max(0, Math.floor(e));
      },
      _limitZoom: function(t) {
        var e = this.getMinZoom(), i = this.getMaxZoom(), n = b.any3d ? this.options.zoomSnap : 1;
        return n && (t = Math.round(t / n) * n), Math.max(e, Math.min(i, t));
      },
      _onPanTransitionStep: function() {
        this.fire("move");
      },
      _onPanTransitionEnd: function() {
        U(this._mapPane, "leaflet-pan-anim"), this.fire("moveend");
      },
      _tryAnimatedPan: function(t, e) {
        var i = this._getCenterOffset(t)._trunc();
        return (e && e.animate) !== !0 && !this.getSize().contains(i) ? !1 : (this.panBy(i, e), !0);
      },
      _createAnimProxy: function() {
        var t = this._proxy = B("div", "leaflet-proxy leaflet-zoom-animated");
        this._panes.mapPane.appendChild(t), this.on("zoomanim", function(e) {
          var i = Ze, n = this._proxy.style[i];
          Ct(this._proxy, this.project(e.center, e.zoom), this.getZoomScale(e.zoom, 1)), n === this._proxy.style[i] && this._animatingZoom && this._onZoomTransitionEnd();
        }, this), this.on("load moveend", this._animMoveEnd, this), this._on("unload", this._destroyAnimProxy, this);
      },
      _destroyAnimProxy: function() {
        q(this._proxy), this.off("load moveend", this._animMoveEnd, this), delete this._proxy;
      },
      _animMoveEnd: function() {
        var t = this.getCenter(), e = this.getZoom();
        Ct(this._proxy, this.project(t, e), this.getZoomScale(e, 1));
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
        return i.animate !== !0 && !this.getSize().contains(a) ? !1 : ($(function() {
          this._moveStart(!0, i.noMoveStart || !1)._animateZoom(t, e, !0);
        }, this), !0);
      },
      _animateZoom: function(t, e, i, n) {
        this._mapPane && (i && (this._animatingZoom = !0, this._animateToCenter = t, this._animateToZoom = e, P(this._mapPane, "leaflet-zoom-anim")), this.fire("zoomanim", {
          center: t,
          zoom: e,
          noUpdate: n
        }), this._tempFireZoomEvent || (this._tempFireZoomEvent = this._zoom !== this._animateToZoom), this._move(this._animateToCenter, this._animateToZoom, void 0, !0), setTimeout(c(this._onZoomTransitionEnd, this), 250));
      },
      _onZoomTransitionEnd: function() {
        this._animatingZoom && (this._mapPane && U(this._mapPane, "leaflet-zoom-anim"), this._animatingZoom = !1, this._move(this._animateToCenter, this._animateToZoom, void 0, !0), this._tempFireZoomEvent && this.fire("zoom"), delete this._tempFireZoomEvent, this.fire("move"), this._moveEnd(!0));
      }
    });
    function go(t, e) {
      return new I(t, e);
    }
    var ht = gt.extend({
      // @section
      // @aka Control Options
      options: {
        // @option position: String = 'topright'
        // The position of the control (one of the map corners). Possible values are `'topleft'`,
        // `'topright'`, `'bottomleft'` or `'bottomright'`
        position: "topright"
      },
      initialize: function(t) {
        x(this, t);
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
        return P(e, "leaflet-control"), i.indexOf("bottom") !== -1 ? n.insertBefore(e, n.firstChild) : n.appendChild(e), this._map.on("unload", this.remove, this), this;
      },
      // @method remove: this
      // Removes the control from the map it is currently active on.
      remove: function() {
        return this._map ? (q(this._container), this.onRemove && this.onRemove(this._map), this._map.off("unload", this.remove, this), this._map = null, this) : this;
      },
      _refocusOnMap: function(t) {
        this._map && t && t.screenX > 0 && t.screenY > 0 && this._map.getContainer().focus();
      }
    }), Jt = function(t) {
      return new ht(t);
    };
    I.include({
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
        var t = this._controlCorners = {}, e = "leaflet-", i = this._controlContainer = B("div", e + "control-container", this._container);
        function n(a, r) {
          var l = e + a + " " + e + r;
          t[a + r] = B("div", l, i);
        }
        n("top", "left"), n("top", "right"), n("bottom", "left"), n("bottom", "right");
      },
      _clearControlPos: function() {
        for (var t in this._controlCorners)
          q(this._controlCorners[t]);
        q(this._controlContainer), delete this._controlCorners, delete this._controlContainer;
      }
    });
    var Gi = ht.extend({
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
        x(this, i), this._layerControlInputs = [], this._layers = [], this._lastZIndex = 0, this._handlingClick = !1, this._preventClick = !1;
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
        return ht.prototype.addTo.call(this, t), this._expandIfNotCollapsed();
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
        var e = this._getLayer(_(t));
        return e && this._layers.splice(this._layers.indexOf(e), 1), this._map ? this._update() : this;
      },
      // @method expand(): this
      // Expand the control container if collapsed.
      expand: function() {
        P(this._container, "leaflet-control-layers-expanded"), this._section.style.height = null;
        var t = this._map.getSize().y - (this._container.offsetTop + 50);
        return t < this._section.clientHeight ? (P(this._section, "leaflet-control-layers-scrollbar"), this._section.style.height = t + "px") : U(this._section, "leaflet-control-layers-scrollbar"), this._checkDisabledLayers(), this;
      },
      // @method collapse(): this
      // Collapse the control container if expanded.
      collapse: function() {
        return U(this._container, "leaflet-control-layers-expanded"), this;
      },
      _initLayout: function() {
        var t = "leaflet-control-layers", e = this._container = B("div", t), i = this.options.collapsed;
        e.setAttribute("aria-haspopup", !0), Yt(e), Ke(e);
        var n = this._section = B("section", t + "-list");
        i && (this._map.on("click", this.collapse, this), A(e, {
          mouseenter: this._expandSafely,
          mouseleave: this.collapse
        }, this));
        var a = this._layersLink = B("a", t + "-toggle", e);
        a.href = "#", a.title = "Layers", a.setAttribute("role", "button"), A(a, {
          keydown: function(r) {
            r.keyCode === 13 && this._expandSafely();
          },
          // Certain screen readers intercept the key event and instead send a click event
          click: function(r) {
            Y(r), this._expandSafely();
          }
        }, this), i || this.expand(), this._baseLayersList = B("div", t + "-base", n), this._separator = B("div", t + "-separator", n), this._overlaysList = B("div", t + "-overlays", n), e.appendChild(n);
      },
      _getLayer: function(t) {
        for (var e = 0; e < this._layers.length; e++)
          if (this._layers[e] && _(this._layers[e].layer) === t)
            return this._layers[e];
      },
      _addLayer: function(t, e, i) {
        this._map && t.on("add remove", this._onLayerChange, this), this._layers.push({
          layer: t,
          name: e,
          overlay: i
        }), this.options.sortLayers && this._layers.sort(c(function(n, a) {
          return this.options.sortFunction(n.layer, a.layer, n.name, a.name);
        }, this)), this.options.autoZIndex && t.setZIndex && (this._lastZIndex++, t.setZIndex(this._lastZIndex)), this._expandIfNotCollapsed();
      },
      _update: function() {
        if (!this._container)
          return this;
        re(this._baseLayersList), re(this._overlaysList), this._layerControlInputs = [];
        var t, e, i, n, a = 0;
        for (i = 0; i < this._layers.length; i++)
          n = this._layers[i], this._addItem(n), e = e || n.overlay, t = t || !n.overlay, a += n.overlay ? 0 : 1;
        return this.options.hideSingleBase && (t = t && a > 1, this._baseLayersList.style.display = t ? "" : "none"), this._separator.style.display = e && t ? "" : "none", this;
      },
      _onLayerChange: function(t) {
        this._handlingClick || this._update();
        var e = this._getLayer(_(t.target)), i = e.overlay ? t.type === "add" ? "overlayadd" : "overlayremove" : t.type === "add" ? "baselayerchange" : null;
        i && this._map.fire(i, e);
      },
      // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see https://stackoverflow.com/a/119079)
      _createRadioElement: function(t, e) {
        var i = '<input type="radio" class="leaflet-control-layers-selector" name="' + t + '"' + (e ? ' checked="checked"' : "") + "/>", n = document.createElement("div");
        return n.innerHTML = i, n.firstChild;
      },
      _addItem: function(t) {
        var e = document.createElement("label"), i = this._map.hasLayer(t.layer), n;
        t.overlay ? (n = document.createElement("input"), n.type = "checkbox", n.className = "leaflet-control-layers-selector", n.defaultChecked = i) : n = this._createRadioElement("leaflet-base-layers_" + _(this), i), this._layerControlInputs.push(n), n.layerId = _(t.layer), A(n, "click", this._onInputClick, this);
        var a = document.createElement("span");
        a.innerHTML = " " + t.name;
        var r = document.createElement("span");
        e.appendChild(r), r.appendChild(n), r.appendChild(a);
        var l = t.overlay ? this._overlaysList : this._baseLayersList;
        return l.appendChild(e), this._checkDisabledLayers(), e;
      },
      _onInputClick: function() {
        if (!this._preventClick) {
          var t = this._layerControlInputs, e, i, n = [], a = [];
          this._handlingClick = !0;
          for (var r = t.length - 1; r >= 0; r--)
            e = t[r], i = this._getLayer(e.layerId).layer, e.checked ? n.push(i) : e.checked || a.push(i);
          for (r = 0; r < a.length; r++)
            this._map.hasLayer(a[r]) && this._map.removeLayer(a[r]);
          for (r = 0; r < n.length; r++)
            this._map.hasLayer(n[r]) || this._map.addLayer(n[r]);
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
        this._preventClick = !0, A(t, "click", Y), this.expand();
        var e = this;
        setTimeout(function() {
          H(t, "click", Y), e._preventClick = !1;
        });
      }
    }), vo = function(t, e, i) {
      return new Gi(t, e, i);
    }, Je = ht.extend({
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
        var e = "leaflet-control-zoom", i = B("div", e + " leaflet-bar"), n = this.options;
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
        var r = B("a", i, n);
        return r.innerHTML = t, r.href = "#", r.title = e, r.setAttribute("role", "button"), r.setAttribute("aria-label", e), Yt(r), A(r, "click", zt), A(r, "click", a, this), A(r, "click", this._refocusOnMap, this), r;
      },
      _updateDisabled: function() {
        var t = this._map, e = "leaflet-disabled";
        U(this._zoomInButton, e), U(this._zoomOutButton, e), this._zoomInButton.setAttribute("aria-disabled", "false"), this._zoomOutButton.setAttribute("aria-disabled", "false"), (this._disabled || t._zoom === t.getMinZoom()) && (P(this._zoomOutButton, e), this._zoomOutButton.setAttribute("aria-disabled", "true")), (this._disabled || t._zoom === t.getMaxZoom()) && (P(this._zoomInButton, e), this._zoomInButton.setAttribute("aria-disabled", "true"));
      }
    });
    I.mergeOptions({
      zoomControl: !0
    }), I.addInitHook(function() {
      this.options.zoomControl && (this.zoomControl = new Je(), this.addControl(this.zoomControl));
    });
    var bo = function(t) {
      return new Je(t);
    }, Ki = ht.extend({
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
        var e = "leaflet-control-scale", i = B("div", e), n = this.options;
        return this._addScales(n, e + "-line", i), t.on(n.updateWhenIdle ? "moveend" : "move", this._update, this), t.whenReady(this._update, this), i;
      },
      onRemove: function(t) {
        t.off(this.options.updateWhenIdle ? "moveend" : "move", this._update, this);
      },
      _addScales: function(t, e, i) {
        t.metric && (this._mScale = B("div", e, i)), t.imperial && (this._iScale = B("div", e, i));
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
    }), xo = function(t) {
      return new Ki(t);
    }, yo = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="leaflet-attribution-flag"><path fill="#4C7BE1" d="M0 0h12v4H0z"/><path fill="#FFD500" d="M0 4h12v3H0z"/><path fill="#E0BC00" d="M0 7h12v1H0z"/></svg>', Xe = ht.extend({
      // @section
      // @aka Control.Attribution options
      options: {
        position: "bottomright",
        // @option prefix: String|false = 'Leaflet'
        // The HTML text shown before the attributions. Pass `false` to disable.
        prefix: '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">' + (b.inlineSvg ? yo + " " : "") + "Leaflet</a>"
      },
      initialize: function(t) {
        x(this, t), this._attributions = {};
      },
      onAdd: function(t) {
        t.attributionControl = this, this._container = B("div", "leaflet-control-attribution"), Yt(this._container);
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
    I.mergeOptions({
      attributionControl: !0
    }), I.addInitHook(function() {
      this.options.attributionControl && new Xe().addTo(this);
    });
    var wo = function(t) {
      return new Xe(t);
    };
    ht.Layers = Gi, ht.Zoom = Je, ht.Scale = Ki, ht.Attribution = Xe, Jt.layers = vo, Jt.zoom = bo, Jt.scale = xo, Jt.attribution = wo;
    var mt = gt.extend({
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
    mt.addTo = function(t, e) {
      return t.addHandler(e, this), this;
    };
    var Eo = { Events: it }, Yi = b.touch ? "touchstart mousedown" : "mousedown", Lt = Ft.extend({
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
        x(this, n), this._element = t, this._dragStartTarget = e || t, this._preventOutline = i;
      },
      // @method enable()
      // Enables the dragging ability
      enable: function() {
        this._enabled || (A(this._dragStartTarget, Yi, this._onDown, this), this._enabled = !0);
      },
      // @method disable()
      // Disables the dragging ability
      disable: function() {
        this._enabled && (Lt._dragging === this && this.finishDrag(!0), H(this._dragStartTarget, Yi, this._onDown, this), this._enabled = !1, this._moved = !1);
      },
      _onDown: function(t) {
        if (this._enabled && (this._moved = !1, !Re(this._element, "leaflet-zoom-anim"))) {
          if (t.touches && t.touches.length !== 1) {
            Lt._dragging === this && this.finishDrag();
            return;
          }
          if (!(Lt._dragging || t.shiftKey || t.which !== 1 && t.button !== 1 && !t.touches) && (Lt._dragging = this, this._preventOutline && We(this._element), He(), jt(), !this._moving)) {
            this.fire("down");
            var e = t.touches ? t.touches[0] : t, i = Fi(this._element);
            this._startPoint = new k(e.clientX, e.clientY), this._startPos = Pt(this._element), this._parentScale = Ue(i);
            var n = t.type === "mousedown";
            A(document, n ? "mousemove" : "touchmove", this._onMove, this), A(document, n ? "mouseup" : "touchend touchcancel", this._onUp, this);
          }
        }
      },
      _onMove: function(t) {
        if (this._enabled) {
          if (t.touches && t.touches.length > 1) {
            this._moved = !0;
            return;
          }
          var e = t.touches && t.touches.length === 1 ? t.touches[0] : t, i = new k(e.clientX, e.clientY)._subtract(this._startPoint);
          !i.x && !i.y || Math.abs(i.x) + Math.abs(i.y) < this.options.clickTolerance || (i.x /= this._parentScale.x, i.y /= this._parentScale.y, Y(t), this._moved || (this.fire("dragstart"), this._moved = !0, P(document.body, "leaflet-dragging"), this._lastTarget = t.target || t.srcElement, window.SVGElementInstance && this._lastTarget instanceof window.SVGElementInstance && (this._lastTarget = this._lastTarget.correspondingUseElement), P(this._lastTarget, "leaflet-drag-target")), this._newPos = this._startPos.add(i), this._moving = !0, this._lastEvent = t, this._updatePosition());
        }
      },
      _updatePosition: function() {
        var t = { originalEvent: this._lastEvent };
        this.fire("predrag", t), j(this._element, this._newPos), this.fire("drag", t);
      },
      _onUp: function() {
        this._enabled && this.finishDrag();
      },
      finishDrag: function(t) {
        U(document.body, "leaflet-dragging"), this._lastTarget && (U(this._lastTarget, "leaflet-drag-target"), this._lastTarget = null), H(document, "mousemove touchmove", this._onMove, this), H(document, "mouseup touchend touchcancel", this._onUp, this), Fe(), Gt();
        var e = this._moved && this._moving;
        this._moving = !1, Lt._dragging = !1, e && this.fire("dragend", {
          noInertia: t,
          distance: this._newPos.distanceTo(this._startPos)
        });
      }
    });
    function Ji(t, e, i) {
      var n, a = [1, 4, 2, 8], r, l, u, d, m, g, y, z;
      for (r = 0, g = t.length; r < g; r++)
        t[r]._code = St(t[r], e);
      for (u = 0; u < 4; u++) {
        for (y = a[u], n = [], r = 0, g = t.length, l = g - 1; r < g; l = r++)
          d = t[r], m = t[l], d._code & y ? m._code & y || (z = ce(m, d, y, e, i), z._code = St(z, e), n.push(z)) : (m._code & y && (z = ce(m, d, y, e, i), z._code = St(z, e), n.push(z)), n.push(d));
        t = n;
      }
      return t;
    }
    function Xi(t, e) {
      var i, n, a, r, l, u, d, m, g;
      if (!t || t.length === 0)
        throw new Error("latlngs not passed");
      rt(t) || (console.warn("latlngs are not flat! Only the first ring will be used"), t = t[0]);
      var y = M([0, 0]), z = V(t), J = z.getNorthWest().distanceTo(z.getSouthWest()) * z.getNorthEast().distanceTo(z.getNorthWest());
      J < 1700 && (y = $e(t));
      var K = t.length, st = [];
      for (i = 0; i < K; i++) {
        var et = M(t[i]);
        st.push(e.project(M([et.lat - y.lat, et.lng - y.lng])));
      }
      for (u = d = m = 0, i = 0, n = K - 1; i < K; n = i++)
        a = st[i], r = st[n], l = a.y * r.x - r.y * a.x, d += (a.x + r.x) * l, m += (a.y + r.y) * l, u += l * 3;
      u === 0 ? g = st[0] : g = [d / u, m / u];
      var Ht = e.unproject(E(g));
      return M([Ht.lat + y.lat, Ht.lng + y.lng]);
    }
    function $e(t) {
      for (var e = 0, i = 0, n = 0, a = 0; a < t.length; a++) {
        var r = M(t[a]);
        e += r.lat, i += r.lng, n++;
      }
      return M([e / n, i / n]);
    }
    var ko = {
      __proto__: null,
      clipPolygon: Ji,
      polygonCenter: Xi,
      centroid: $e
    };
    function $i(t, e) {
      if (!e || !t.length)
        return t.slice();
      var i = e * e;
      return t = Co(t, i), t = Ao(t, i), t;
    }
    function Qi(t, e, i) {
      return Math.sqrt(Xt(t, e, i, !0));
    }
    function Lo(t, e, i) {
      return Xt(t, e, i);
    }
    function Ao(t, e) {
      var i = t.length, n = typeof Uint8Array < "u" ? Uint8Array : Array, a = new n(i);
      a[0] = a[i - 1] = 1, Qe(t, a, e, 0, i - 1);
      var r, l = [];
      for (r = 0; r < i; r++)
        a[r] && l.push(t[r]);
      return l;
    }
    function Qe(t, e, i, n, a) {
      var r = 0, l, u, d;
      for (u = n + 1; u <= a - 1; u++)
        d = Xt(t[u], t[n], t[a], !0), d > r && (l = u, r = d);
      r > i && (e[l] = 1, Qe(t, e, i, n, l), Qe(t, e, i, l, a));
    }
    function Co(t, e) {
      for (var i = [t[0]], n = 1, a = 0, r = t.length; n < r; n++)
        Po(t[n], t[a]) > e && (i.push(t[n]), a = n);
      return a < r - 1 && i.push(t[r - 1]), i;
    }
    var tn;
    function en(t, e, i, n, a) {
      var r = n ? tn : St(t, i), l = St(e, i), u, d, m;
      for (tn = l; ; ) {
        if (!(r | l))
          return [t, e];
        if (r & l)
          return !1;
        u = r || l, d = ce(t, e, u, i, a), m = St(d, i), u === r ? (t = d, r = m) : (e = d, l = m);
      }
    }
    function ce(t, e, i, n, a) {
      var r = e.x - t.x, l = e.y - t.y, u = n.min, d = n.max, m, g;
      return i & 8 ? (m = t.x + r * (d.y - t.y) / l, g = d.y) : i & 4 ? (m = t.x + r * (u.y - t.y) / l, g = u.y) : i & 2 ? (m = d.x, g = t.y + l * (d.x - t.x) / r) : i & 1 && (m = u.x, g = t.y + l * (u.x - t.x) / r), new k(m, g, a);
    }
    function St(t, e) {
      var i = 0;
      return t.x < e.min.x ? i |= 1 : t.x > e.max.x && (i |= 2), t.y < e.min.y ? i |= 4 : t.y > e.max.y && (i |= 8), i;
    }
    function Po(t, e) {
      var i = e.x - t.x, n = e.y - t.y;
      return i * i + n * n;
    }
    function Xt(t, e, i, n) {
      var a = e.x, r = e.y, l = i.x - a, u = i.y - r, d = l * l + u * u, m;
      return d > 0 && (m = ((t.x - a) * l + (t.y - r) * u) / d, m > 1 ? (a = i.x, r = i.y) : m > 0 && (a += l * m, r += u * m)), l = t.x - a, u = t.y - r, n ? l * l + u * u : new k(a, r);
    }
    function rt(t) {
      return !lt(t[0]) || typeof t[0][0] != "object" && typeof t[0][0] < "u";
    }
    function nn(t) {
      return console.warn("Deprecated use of _flat, please use L.LineUtil.isFlat instead."), rt(t);
    }
    function on(t, e) {
      var i, n, a, r, l, u, d, m;
      if (!t || t.length === 0)
        throw new Error("latlngs not passed");
      rt(t) || (console.warn("latlngs are not flat! Only the first ring will be used"), t = t[0]);
      var g = M([0, 0]), y = V(t), z = y.getNorthWest().distanceTo(y.getSouthWest()) * y.getNorthEast().distanceTo(y.getNorthWest());
      z < 1700 && (g = $e(t));
      var J = t.length, K = [];
      for (i = 0; i < J; i++) {
        var st = M(t[i]);
        K.push(e.project(M([st.lat - g.lat, st.lng - g.lng])));
      }
      for (i = 0, n = 0; i < J - 1; i++)
        n += K[i].distanceTo(K[i + 1]) / 2;
      if (n === 0)
        m = K[0];
      else
        for (i = 0, r = 0; i < J - 1; i++)
          if (l = K[i], u = K[i + 1], a = l.distanceTo(u), r += a, r > n) {
            d = (r - n) / a, m = [
              u.x - d * (u.x - l.x),
              u.y - d * (u.y - l.y)
            ];
            break;
          }
      var et = e.unproject(E(m));
      return M([et.lat + g.lat, et.lng + g.lng]);
    }
    var To = {
      __proto__: null,
      simplify: $i,
      pointToSegmentDistance: Qi,
      closestPointOnSegment: Lo,
      clipSegment: en,
      _getEdgeIntersection: ce,
      _getBitCode: St,
      _sqClosestPointOnSegment: Xt,
      isFlat: rt,
      _flat: nn,
      polylineCenter: on
    }, ti = {
      project: function(t) {
        return new k(t.lng, t.lat);
      },
      unproject: function(t) {
        return new R(t.y, t.x);
      },
      bounds: new F([-180, -90], [180, 90])
    }, ei = {
      R: 6378137,
      R_MINOR: 6356752314245179e-9,
      bounds: new F([-2003750834279e-5, -1549657073972e-5], [2003750834279e-5, 1876465623138e-5]),
      project: function(t) {
        var e = Math.PI / 180, i = this.R, n = t.lat * e, a = this.R_MINOR / i, r = Math.sqrt(1 - a * a), l = r * Math.sin(n), u = Math.tan(Math.PI / 4 - n / 2) / Math.pow((1 - l) / (1 + l), r / 2);
        return n = -i * Math.log(Math.max(u, 1e-10)), new k(t.lng * e * i, n);
      },
      unproject: function(t) {
        for (var e = 180 / Math.PI, i = this.R, n = this.R_MINOR / i, a = Math.sqrt(1 - n * n), r = Math.exp(-t.y / i), l = Math.PI / 2 - 2 * Math.atan(r), u = 0, d = 0.1, m; u < 15 && Math.abs(d) > 1e-7; u++)
          m = a * Math.sin(l), m = Math.pow((1 - m) / (1 + m), a / 2), d = Math.PI / 2 - 2 * Math.atan(r * m) - l, l += d;
        return new R(l * e, t.x * e / i);
      }
    }, zo = {
      __proto__: null,
      LonLat: ti,
      Mercator: ei,
      SphericalMercator: Ce
    }, So = h({}, kt, {
      code: "EPSG:3395",
      projection: ei,
      transformation: function() {
        var t = 0.5 / (Math.PI * ei.R);
        return qt(t, 0.5, -t, 0.5);
      }()
    }), an = h({}, kt, {
      code: "EPSG:4326",
      projection: ti,
      transformation: qt(1 / 180, 1, -1 / 180, 0.5)
    }), Mo = h({}, vt, {
      projection: ti,
      transformation: qt(1, 0, -1, 0),
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
    vt.Earth = kt, vt.EPSG3395 = So, vt.EPSG3857 = Te, vt.EPSG900913 = Rn, vt.EPSG4326 = an, vt.Simple = Mo;
    var ut = Ft.extend({
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
        return this._map._targets[_(t)] = this, this;
      },
      removeInteractiveTarget: function(t) {
        return delete this._map._targets[_(t)], this;
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
    I.include({
      // @method addLayer(layer: Layer): this
      // Adds the given layer to the map
      addLayer: function(t) {
        if (!t._layerAdd)
          throw new Error("The provided object is not a Layer.");
        var e = _(t);
        return this._layers[e] ? this : (this._layers[e] = t, t._mapToAdd = this, t.beforeAdd && t.beforeAdd(this), this.whenReady(t._layerAdd, t), this);
      },
      // @method removeLayer(layer: Layer): this
      // Removes the given layer from the map.
      removeLayer: function(t) {
        var e = _(t);
        return this._layers[e] ? (this._loaded && t.onRemove(this), delete this._layers[e], this._loaded && (this.fire("layerremove", { layer: t }), t.fire("remove")), t._map = t._mapToAdd = null, this) : this;
      },
      // @method hasLayer(layer: Layer): Boolean
      // Returns `true` if the given layer is currently added to the map
      hasLayer: function(t) {
        return _(t) in this._layers;
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
        t = t ? lt(t) ? t : [t] : [];
        for (var e = 0, i = t.length; e < i; e++)
          this.addLayer(t[e]);
      },
      _addZoomLimit: function(t) {
        (!isNaN(t.options.maxZoom) || !isNaN(t.options.minZoom)) && (this._zoomBoundLayers[_(t)] = t, this._updateZoomLevels());
      },
      _removeZoomLimit: function(t) {
        var e = _(t);
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
    var Bt = ut.extend({
      initialize: function(t, e) {
        x(this, e), this._layers = {};
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
        return _(t);
      }
    }), Io = function(t, e) {
      return new Bt(t, e);
    }, bt = Bt.extend({
      addLayer: function(t) {
        return this.hasLayer(t) ? this : (t.addEventParent(this), Bt.prototype.addLayer.call(this, t), this.fire("layeradd", { layer: t }));
      },
      removeLayer: function(t) {
        return this.hasLayer(t) ? (t in this._layers && (t = this._layers[t]), t.removeEventParent(this), Bt.prototype.removeLayer.call(this, t), this.fire("layerremove", { layer: t })) : this;
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
        var t = new tt();
        for (var e in this._layers) {
          var i = this._layers[e];
          t.extend(i.getBounds ? i.getBounds() : i.getLatLng());
        }
        return t;
      }
    }), Oo = function(t, e) {
      return new bt(t, e);
    }, Zt = gt.extend({
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
        x(this, t);
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
        var a = E(n), r = E(e === "shadow" && i.shadowAnchor || i.iconAnchor || a && a.divideBy(2, !0));
        t.className = "leaflet-marker-" + e + " " + (i.className || ""), r && (t.style.marginLeft = -r.x + "px", t.style.marginTop = -r.y + "px"), a && (t.style.width = a.x + "px", t.style.height = a.y + "px");
      },
      _createImg: function(t, e) {
        return e = e || document.createElement("img"), e.src = t, e;
      },
      _getIconUrl: function(t) {
        return b.retina && this.options[t + "RetinaUrl"] || this.options[t + "Url"];
      }
    });
    function Bo(t) {
      return new Zt(t);
    }
    var $t = Zt.extend({
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
        return typeof $t.imagePath != "string" && ($t.imagePath = this._detectIconPath()), (this.options.imagePath || $t.imagePath) + Zt.prototype._getIconUrl.call(this, t);
      },
      _stripUrl: function(t) {
        var e = function(i, n, a) {
          var r = n.exec(i);
          return r && r[a];
        };
        return t = e(t, /^url\((['"])?(.+)\1\)$/, 2), t && e(t, /^(.*)marker-icon\.png$/, 1);
      },
      _detectIconPath: function() {
        var t = B("div", "leaflet-default-icon-path", document.body), e = Vt(t, "background-image") || Vt(t, "backgroundImage");
        if (document.body.removeChild(t), e = this._stripUrl(e), e)
          return e;
        var i = document.querySelector('link[href$="leaflet.css"]');
        return i ? i.href.substring(0, i.href.length - 11 - 1) : "";
      }
    }), rn = mt.extend({
      initialize: function(t) {
        this._marker = t;
      },
      addHooks: function() {
        var t = this._marker._icon;
        this._draggable || (this._draggable = new Lt(t, t, !0)), this._draggable.on({
          dragstart: this._onDragStart,
          predrag: this._onPreDrag,
          drag: this._onDrag,
          dragend: this._onDragEnd
        }, this).enable(), P(t, "leaflet-marker-draggable");
      },
      removeHooks: function() {
        this._draggable.off({
          dragstart: this._onDragStart,
          predrag: this._onPreDrag,
          drag: this._onDrag,
          dragend: this._onDragEnd
        }, this).disable(), this._marker._icon && U(this._marker._icon, "leaflet-marker-draggable");
      },
      moved: function() {
        return this._draggable && this._draggable._moved;
      },
      _adjustPan: function(t) {
        var e = this._marker, i = e._map, n = this._marker.options.autoPanSpeed, a = this._marker.options.autoPanPadding, r = Pt(e._icon), l = i.getPixelBounds(), u = i.getPixelOrigin(), d = Q(
          l.min._subtract(u).add(a),
          l.max._subtract(u).subtract(a)
        );
        if (!d.contains(r)) {
          var m = E(
            (Math.max(d.max.x, r.x) - d.max.x) / (l.max.x - d.max.x) - (Math.min(d.min.x, r.x) - d.min.x) / (l.min.x - d.min.x),
            (Math.max(d.max.y, r.y) - d.max.y) / (l.max.y - d.max.y) - (Math.min(d.min.y, r.y) - d.min.y) / (l.min.y - d.min.y)
          ).multiplyBy(n);
          i.panBy(m, { animate: !1 }), this._draggable._newPos._add(m), this._draggable._startPos._add(m), j(e._icon, this._draggable._newPos), this._onDrag(t), this._panRequest = $(this._adjustPan.bind(this, t));
        }
      },
      _onDragStart: function() {
        this._oldLatLng = this._marker.getLatLng(), this._marker.closePopup && this._marker.closePopup(), this._marker.fire("movestart").fire("dragstart");
      },
      _onPreDrag: function(t) {
        this._marker.options.autoPan && (ot(this._panRequest), this._panRequest = $(this._adjustPan.bind(this, t)));
      },
      _onDrag: function(t) {
        var e = this._marker, i = e._shadow, n = Pt(e._icon), a = e._map.layerPointToLatLng(n);
        i && j(i, n), e._latlng = a, t.latlng = a, t.oldLatLng = this._oldLatLng, e.fire("move", t).fire("drag", t);
      },
      _onDragEnd: function(t) {
        ot(this._panRequest), delete this._oldLatLng, this._marker.fire("moveend").fire("dragend", t);
      }
    }), de = ut.extend({
      // @section
      // @aka Marker options
      options: {
        // @option icon: Icon = *
        // Icon instance to use for rendering the marker.
        // See [Icon documentation](#L.Icon) for details on how to customize the marker icon.
        // If not specified, a common instance of `L.Icon.Default` is used.
        icon: new $t(),
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
        x(this, e), this._latlng = M(t);
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
        return this._latlng = M(t), this.update(), this.fire("move", { oldLatLng: e, latlng: this._latlng });
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
        i !== this._icon && (this._icon && this._removeIcon(), n = !0, t.title && (i.title = t.title), i.tagName === "IMG" && (i.alt = t.alt || "")), P(i, e), t.keyboard && (i.tabIndex = "0", i.setAttribute("role", "button")), this._icon = i, t.riseOnHover && this.on({
          mouseover: this._bringToFront,
          mouseout: this._resetZIndex
        }), this.options.autoPanOnFocus && A(i, "focus", this._panOnFocus, this);
        var a = t.icon.createShadow(this._shadow), r = !1;
        a !== this._shadow && (this._removeShadow(), r = !0), a && (P(a, e), a.alt = ""), this._shadow = a, t.opacity < 1 && this._updateOpacity(), n && this.getPane().appendChild(this._icon), this._initInteraction(), a && r && this.getPane(t.shadowPane).appendChild(this._shadow);
      },
      _removeIcon: function() {
        this.options.riseOnHover && this.off({
          mouseover: this._bringToFront,
          mouseout: this._resetZIndex
        }), this.options.autoPanOnFocus && H(this._icon, "focus", this._panOnFocus, this), q(this._icon), this.removeInteractiveTarget(this._icon), this._icon = null;
      },
      _removeShadow: function() {
        this._shadow && q(this._shadow), this._shadow = null;
      },
      _setPos: function(t) {
        this._icon && j(this._icon, t), this._shadow && j(this._shadow, t), this._zIndex = t.y + this.options.zIndexOffset, this._resetZIndex();
      },
      _updateZIndex: function(t) {
        this._icon && (this._icon.style.zIndex = this._zIndex + t);
      },
      _animateZoom: function(t) {
        var e = this._map._latLngToNewLayerPoint(this._latlng, t.zoom, t.center).round();
        this._setPos(e);
      },
      _initInteraction: function() {
        if (this.options.interactive && (P(this._icon, "leaflet-interactive"), this.addInteractiveTarget(this._icon), rn)) {
          var t = this.options.draggable;
          this.dragging && (t = this.dragging.enabled(), this.dragging.disable()), this.dragging = new rn(this), t && this.dragging.enable();
        }
      },
      // @method setOpacity(opacity: Number): this
      // Changes the opacity of the marker.
      setOpacity: function(t) {
        return this.options.opacity = t, this._map && this._updateOpacity(), this;
      },
      _updateOpacity: function() {
        var t = this.options.opacity;
        this._icon && at(this._icon, t), this._shadow && at(this._shadow, t);
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
          var e = this.options.icon.options, i = e.iconSize ? E(e.iconSize) : E(0, 0), n = e.iconAnchor ? E(e.iconAnchor) : E(0, 0);
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
    function Zo(t, e) {
      return new de(t, e);
    }
    var At = ut.extend({
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
        return x(this, t), this._renderer && (this._renderer._updateStyle(this), this.options.stroke && t && Object.prototype.hasOwnProperty.call(t, "weight") && this._updateBounds()), this;
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
    }), fe = At.extend({
      // @section
      // @aka CircleMarker options
      options: {
        fill: !0,
        // @option radius: Number = 10
        // Radius of the circle marker, in pixels
        radius: 10
      },
      initialize: function(t, e) {
        x(this, e), this._latlng = M(t), this._radius = this.options.radius;
      },
      // @method setLatLng(latLng: LatLng): this
      // Sets the position of a circle marker to a new location.
      setLatLng: function(t) {
        var e = this._latlng;
        return this._latlng = M(t), this.redraw(), this.fire("move", { oldLatLng: e, latlng: this._latlng });
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
        return At.prototype.setStyle.call(this, t), this.setRadius(e), this;
      },
      _project: function() {
        this._point = this._map.latLngToLayerPoint(this._latlng), this._updateBounds();
      },
      _updateBounds: function() {
        var t = this._radius, e = this._radiusY || t, i = this._clickTolerance(), n = [t + i, e + i];
        this._pxBounds = new F(this._point.subtract(n), this._point.add(n));
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
    function Ro(t, e) {
      return new fe(t, e);
    }
    var ii = fe.extend({
      initialize: function(t, e, i) {
        if (typeof e == "number" && (e = h({}, i, { radius: e })), x(this, e), this._latlng = M(t), isNaN(this.options.radius))
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
        return new tt(
          this._map.layerPointToLatLng(this._point.subtract(t)),
          this._map.layerPointToLatLng(this._point.add(t))
        );
      },
      setStyle: At.prototype.setStyle,
      _project: function() {
        var t = this._latlng.lng, e = this._latlng.lat, i = this._map, n = i.options.crs;
        if (n.distance === kt.distance) {
          var a = Math.PI / 180, r = this._mRadius / kt.R / a, l = i.project([e + r, t]), u = i.project([e - r, t]), d = l.add(u).divideBy(2), m = i.unproject(d).lat, g = Math.acos((Math.cos(r * a) - Math.sin(e * a) * Math.sin(m * a)) / (Math.cos(e * a) * Math.cos(m * a))) / a;
          (isNaN(g) || g === 0) && (g = r / Math.cos(Math.PI / 180 * e)), this._point = d.subtract(i.getPixelOrigin()), this._radius = isNaN(g) ? 0 : d.x - i.project([m, t - g]).x, this._radiusY = d.y - l.y;
        } else {
          var y = n.unproject(n.project(this._latlng).subtract([this._mRadius, 0]));
          this._point = i.latLngToLayerPoint(this._latlng), this._radius = this._point.x - i.latLngToLayerPoint(y).x;
        }
        this._updateBounds();
      }
    });
    function No(t, e, i) {
      return new ii(t, e, i);
    }
    var xt = At.extend({
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
        x(this, e), this._setLatLngs(t);
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
        for (var e = 1 / 0, i = null, n = Xt, a, r, l = 0, u = this._parts.length; l < u; l++)
          for (var d = this._parts[l], m = 1, g = d.length; m < g; m++) {
            a = d[m - 1], r = d[m];
            var y = n(t, a, r, !0);
            y < e && (e = y, i = n(t, a, r));
          }
        return i && (i.distance = Math.sqrt(e)), i;
      },
      // @method getCenter(): LatLng
      // Returns the center ([centroid](https://en.wikipedia.org/wiki/Centroid)) of the polyline.
      getCenter: function() {
        if (!this._map)
          throw new Error("Must add layer to map before using getCenter()");
        return on(this._defaultShape(), this._map.options.crs);
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
        return e = e || this._defaultShape(), t = M(t), e.push(t), this._bounds.extend(t), this.redraw();
      },
      _setLatLngs: function(t) {
        this._bounds = new tt(), this._latlngs = this._convertLatLngs(t);
      },
      _defaultShape: function() {
        return rt(this._latlngs) ? this._latlngs : this._latlngs[0];
      },
      // recursively convert latlngs input into actual LatLng instances; calculate bounds along the way
      _convertLatLngs: function(t) {
        for (var e = [], i = rt(t), n = 0, a = t.length; n < a; n++)
          i ? (e[n] = M(t[n]), this._bounds.extend(e[n])) : e[n] = this._convertLatLngs(t[n]);
        return e;
      },
      _project: function() {
        var t = new F();
        this._rings = [], this._projectLatlngs(this._latlngs, this._rings, t), this._bounds.isValid() && t.isValid() && (this._rawPxBounds = t, this._updateBounds());
      },
      _updateBounds: function() {
        var t = this._clickTolerance(), e = new k(t, t);
        this._rawPxBounds && (this._pxBounds = new F([
          this._rawPxBounds.min.subtract(e),
          this._rawPxBounds.max.add(e)
        ]));
      },
      // recursively turns latlngs into a set of rings with projected coordinates
      _projectLatlngs: function(t, e, i) {
        var n = t[0] instanceof R, a = t.length, r, l;
        if (n) {
          for (l = [], r = 0; r < a; r++)
            l[r] = this._map.latLngToLayerPoint(t[r]), i.extend(l[r]);
          e.push(l);
        } else
          for (r = 0; r < a; r++)
            this._projectLatlngs(t[r], e, i);
      },
      // clip polyline by renderer bounds so that we have less to render for performance
      _clipPoints: function() {
        var t = this._renderer._bounds;
        if (this._parts = [], !(!this._pxBounds || !this._pxBounds.intersects(t))) {
          if (this.options.noClip) {
            this._parts = this._rings;
            return;
          }
          var e = this._parts, i, n, a, r, l, u, d;
          for (i = 0, a = 0, r = this._rings.length; i < r; i++)
            for (d = this._rings[i], n = 0, l = d.length; n < l - 1; n++)
              u = en(d[n], d[n + 1], t, n, !0), u && (e[a] = e[a] || [], e[a].push(u[0]), (u[1] !== d[n + 1] || n === l - 2) && (e[a].push(u[1]), a++));
        }
      },
      // simplify each clipped part of the polyline for performance
      _simplifyPoints: function() {
        for (var t = this._parts, e = this.options.smoothFactor, i = 0, n = t.length; i < n; i++)
          t[i] = $i(t[i], e);
      },
      _update: function() {
        this._map && (this._clipPoints(), this._simplifyPoints(), this._updatePath());
      },
      _updatePath: function() {
        this._renderer._updatePoly(this);
      },
      // Needed by the `Canvas` renderer for interactivity
      _containsPoint: function(t, e) {
        var i, n, a, r, l, u, d = this._clickTolerance();
        if (!this._pxBounds || !this._pxBounds.contains(t))
          return !1;
        for (i = 0, r = this._parts.length; i < r; i++)
          for (u = this._parts[i], n = 0, l = u.length, a = l - 1; n < l; a = n++)
            if (!(!e && n === 0) && Qi(t, u[a], u[n]) <= d)
              return !0;
        return !1;
      }
    });
    function Do(t, e) {
      return new xt(t, e);
    }
    xt._flat = nn;
    var Rt = xt.extend({
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
        return Xi(this._defaultShape(), this._map.options.crs);
      },
      _convertLatLngs: function(t) {
        var e = xt.prototype._convertLatLngs.call(this, t), i = e.length;
        return i >= 2 && e[0] instanceof R && e[0].equals(e[i - 1]) && e.pop(), e;
      },
      _setLatLngs: function(t) {
        xt.prototype._setLatLngs.call(this, t), rt(this._latlngs) && (this._latlngs = [this._latlngs]);
      },
      _defaultShape: function() {
        return rt(this._latlngs[0]) ? this._latlngs[0] : this._latlngs[0][0];
      },
      _clipPoints: function() {
        var t = this._renderer._bounds, e = this.options.weight, i = new k(e, e);
        if (t = new F(t.min.subtract(i), t.max.add(i)), this._parts = [], !(!this._pxBounds || !this._pxBounds.intersects(t))) {
          if (this.options.noClip) {
            this._parts = this._rings;
            return;
          }
          for (var n = 0, a = this._rings.length, r; n < a; n++)
            r = Ji(this._rings[n], t, !0), r.length && this._parts.push(r);
        }
      },
      _updatePath: function() {
        this._renderer._updatePoly(this, !0);
      },
      // Needed by the `Canvas` renderer for interactivity
      _containsPoint: function(t) {
        var e = !1, i, n, a, r, l, u, d, m;
        if (!this._pxBounds || !this._pxBounds.contains(t))
          return !1;
        for (r = 0, d = this._parts.length; r < d; r++)
          for (i = this._parts[r], l = 0, m = i.length, u = m - 1; l < m; u = l++)
            n = i[l], a = i[u], n.y > t.y != a.y > t.y && t.x < (a.x - n.x) * (t.y - n.y) / (a.y - n.y) + n.x && (e = !e);
        return e || xt.prototype._containsPoint.call(this, t, !0);
      }
    });
    function Ho(t, e) {
      return new Rt(t, e);
    }
    var yt = bt.extend({
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
        x(this, e), this._layers = {}, t && this.addData(t);
      },
      // @method addData( <GeoJSON> data ): this
      // Adds a GeoJSON object to the layer.
      addData: function(t) {
        var e = lt(t) ? t : t.features, i, n, a;
        if (e) {
          for (i = 0, n = e.length; i < n; i++)
            a = e[i], (a.geometries || a.geometry || a.features || a.coordinates) && this.addData(a);
          return this;
        }
        var r = this.options;
        if (r.filter && !r.filter(t))
          return this;
        var l = pe(t, r);
        return l ? (l.feature = ge(t), l.defaultOptions = l.options, this.resetStyle(l), r.onEachFeature && r.onEachFeature(t, l), this.addLayer(l)) : this;
      },
      // @method resetStyle( <Path> layer? ): this
      // Resets the given vector layer's style to the original GeoJSON style, useful for resetting style after hover events.
      // If `layer` is omitted, the style of all features in the current layer is reset.
      resetStyle: function(t) {
        return t === void 0 ? this.eachLayer(this.resetStyle, this) : (t.options = h({}, t.defaultOptions), this._setLayerStyle(t, this.options.style), this);
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
    function pe(t, e) {
      var i = t.type === "Feature" ? t.geometry : t, n = i ? i.coordinates : null, a = [], r = e && e.pointToLayer, l = e && e.coordsToLatLng || ni, u, d, m, g;
      if (!n && !i)
        return null;
      switch (i.type) {
        case "Point":
          return u = l(n), sn(r, t, u, e);
        case "MultiPoint":
          for (m = 0, g = n.length; m < g; m++)
            u = l(n[m]), a.push(sn(r, t, u, e));
          return new bt(a);
        case "LineString":
        case "MultiLineString":
          return d = me(n, i.type === "LineString" ? 0 : 1, l), new xt(d, e);
        case "Polygon":
        case "MultiPolygon":
          return d = me(n, i.type === "Polygon" ? 1 : 2, l), new Rt(d, e);
        case "GeometryCollection":
          for (m = 0, g = i.geometries.length; m < g; m++) {
            var y = pe({
              geometry: i.geometries[m],
              type: "Feature",
              properties: t.properties
            }, e);
            y && a.push(y);
          }
          return new bt(a);
        case "FeatureCollection":
          for (m = 0, g = i.features.length; m < g; m++) {
            var z = pe(i.features[m], e);
            z && a.push(z);
          }
          return new bt(a);
        default:
          throw new Error("Invalid GeoJSON object.");
      }
    }
    function sn(t, e, i, n) {
      return t ? t(e, i) : new de(i, n && n.markersInheritOptions && n);
    }
    function ni(t) {
      return new R(t[1], t[0], t[2]);
    }
    function me(t, e, i) {
      for (var n = [], a = 0, r = t.length, l; a < r; a++)
        l = e ? me(t[a], e - 1, i) : (i || ni)(t[a]), n.push(l);
      return n;
    }
    function oi(t, e) {
      return t = M(t), t.alt !== void 0 ? [C(t.lng, e), C(t.lat, e), C(t.alt, e)] : [C(t.lng, e), C(t.lat, e)];
    }
    function _e(t, e, i, n) {
      for (var a = [], r = 0, l = t.length; r < l; r++)
        a.push(e ? _e(t[r], rt(t[r]) ? 0 : e - 1, i, n) : oi(t[r], n));
      return !e && i && a.length > 0 && a.push(a[0].slice()), a;
    }
    function Nt(t, e) {
      return t.feature ? h({}, t.feature, { geometry: e }) : ge(e);
    }
    function ge(t) {
      return t.type === "Feature" || t.type === "FeatureCollection" ? t : {
        type: "Feature",
        properties: {},
        geometry: t
      };
    }
    var ai = {
      toGeoJSON: function(t) {
        return Nt(this, {
          type: "Point",
          coordinates: oi(this.getLatLng(), t)
        });
      }
    };
    de.include(ai), ii.include(ai), fe.include(ai), xt.include({
      toGeoJSON: function(t) {
        var e = !rt(this._latlngs), i = _e(this._latlngs, e ? 1 : 0, !1, t);
        return Nt(this, {
          type: (e ? "Multi" : "") + "LineString",
          coordinates: i
        });
      }
    }), Rt.include({
      toGeoJSON: function(t) {
        var e = !rt(this._latlngs), i = e && !rt(this._latlngs[0]), n = _e(this._latlngs, i ? 2 : e ? 1 : 0, !0, t);
        return e || (n = [n]), Nt(this, {
          type: (i ? "Multi" : "") + "Polygon",
          coordinates: n
        });
      }
    }), Bt.include({
      toMultiPoint: function(t) {
        var e = [];
        return this.eachLayer(function(i) {
          e.push(i.toGeoJSON(t).geometry.coordinates);
        }), Nt(this, {
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
            var r = a.toGeoJSON(t);
            if (i)
              n.push(r.geometry);
            else {
              var l = ge(r);
              l.type === "FeatureCollection" ? n.push.apply(n, l.features) : n.push(l);
            }
          }
        }), i ? Nt(this, {
          geometries: n,
          type: "GeometryCollection"
        }) : {
          type: "FeatureCollection",
          features: n
        };
      }
    });
    function ln(t, e) {
      return new yt(t, e);
    }
    var Fo = ln, ve = ut.extend({
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
        this._url = t, this._bounds = V(e), x(this, i);
      },
      onAdd: function() {
        this._image || (this._initImage(), this.options.opacity < 1 && this._updateOpacity()), this.options.interactive && (P(this._image, "leaflet-interactive"), this.addInteractiveTarget(this._image)), this.getPane().appendChild(this._image), this._reset();
      },
      onRemove: function() {
        q(this._image), this.options.interactive && this.removeInteractiveTarget(this._image);
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
        return this._map && It(this._image), this;
      },
      // @method bringToBack(): this
      // Brings the layer to the bottom of all overlays.
      bringToBack: function() {
        return this._map && Ot(this._image), this;
      },
      // @method setUrl(url: String): this
      // Changes the URL of the image.
      setUrl: function(t) {
        return this._url = t, this._image && (this._image.src = t), this;
      },
      // @method setBounds(bounds: LatLngBounds): this
      // Update the bounds that this ImageOverlay covers
      setBounds: function(t) {
        return this._bounds = V(t), this._map && this._reset(), this;
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
        var t = this._url.tagName === "IMG", e = this._image = t ? this._url : B("img");
        if (P(e, "leaflet-image-layer"), this._zoomAnimated && P(e, "leaflet-zoom-animated"), this.options.className && P(e, this.options.className), e.onselectstart = w, e.onmousemove = w, e.onload = c(this.fire, this, "load"), e.onerror = c(this._overlayOnError, this, "error"), (this.options.crossOrigin || this.options.crossOrigin === "") && (e.crossOrigin = this.options.crossOrigin === !0 ? "" : this.options.crossOrigin), this.options.zIndex && this._updateZIndex(), t) {
          this._url = e.src;
          return;
        }
        e.src = this._url, e.alt = this.options.alt;
      },
      _animateZoom: function(t) {
        var e = this._map.getZoomScale(t.zoom), i = this._map._latLngBoundsToNewLayerBounds(this._bounds, t.zoom, t.center).min;
        Ct(this._image, i, e);
      },
      _reset: function() {
        var t = this._image, e = new F(
          this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
          this._map.latLngToLayerPoint(this._bounds.getSouthEast())
        ), i = e.getSize();
        j(t, e.min), t.style.width = i.x + "px", t.style.height = i.y + "px";
      },
      _updateOpacity: function() {
        at(this._image, this.options.opacity);
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
    }), qo = function(t, e, i) {
      return new ve(t, e, i);
    }, hn = ve.extend({
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
        var t = this._url.tagName === "VIDEO", e = this._image = t ? this._url : B("video");
        if (P(e, "leaflet-image-layer"), this._zoomAnimated && P(e, "leaflet-zoom-animated"), this.options.className && P(e, this.options.className), e.onselectstart = w, e.onmousemove = w, e.onloadeddata = c(this.fire, this, "load"), t) {
          for (var i = e.getElementsByTagName("source"), n = [], a = 0; a < i.length; a++)
            n.push(i[a].src);
          this._url = i.length > 0 ? n : [e.src];
          return;
        }
        lt(this._url) || (this._url = [this._url]), !this.options.keepAspectRatio && Object.prototype.hasOwnProperty.call(e.style, "objectFit") && (e.style.objectFit = "fill"), e.autoplay = !!this.options.autoplay, e.loop = !!this.options.loop, e.muted = !!this.options.muted, e.playsInline = !!this.options.playsInline;
        for (var r = 0; r < this._url.length; r++) {
          var l = B("source");
          l.src = this._url[r], e.appendChild(l);
        }
      }
      // @method getElement(): HTMLVideoElement
      // Returns the instance of [`HTMLVideoElement`](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement)
      // used by this overlay.
    });
    function Wo(t, e, i) {
      return new hn(t, e, i);
    }
    var un = ve.extend({
      _initImage: function() {
        var t = this._image = this._url;
        P(t, "leaflet-image-layer"), this._zoomAnimated && P(t, "leaflet-zoom-animated"), this.options.className && P(t, this.options.className), t.onselectstart = w, t.onmousemove = w;
      }
      // @method getElement(): SVGElement
      // Returns the instance of [`SVGElement`](https://developer.mozilla.org/docs/Web/API/SVGElement)
      // used by this overlay.
    });
    function Uo(t, e, i) {
      return new un(t, e, i);
    }
    var _t = ut.extend({
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
        t && (t instanceof R || lt(t)) ? (this._latlng = M(t), x(this, e)) : (x(this, t), this._source = e), this.options.content && (this._content = this.options.content);
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
        this._zoomAnimated = t._zoomAnimated, this._container || this._initLayout(), t._fadeAnimated && at(this._container, 0), clearTimeout(this._removeTimeout), this.getPane().appendChild(this._container), this.update(), t._fadeAnimated && at(this._container, 1), this.bringToFront(), this.options.interactive && (P(this._container, "leaflet-interactive"), this.addInteractiveTarget(this._container));
      },
      onRemove: function(t) {
        t._fadeAnimated ? (at(this._container, 0), this._removeTimeout = setTimeout(c(q, void 0, this._container), 200)) : q(this._container), this.options.interactive && (U(this._container, "leaflet-interactive"), this.removeInteractiveTarget(this._container));
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
        return this._latlng = M(t), this._map && (this._updatePosition(), this._adjustPan()), this;
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
        return this._map && It(this._container), this;
      },
      // @method bringToBack: this
      // Brings this overlay to the back of other overlays (in the same map pane).
      bringToBack: function() {
        return this._map && Ot(this._container), this;
      },
      // prepare bound overlay to open: update latlng pos / content source (for FeatureGroup)
      _prepareOpen: function(t) {
        var e = this._source;
        if (!e._map)
          return !1;
        if (e instanceof bt) {
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
          var t = this._map.latLngToLayerPoint(this._latlng), e = E(this.options.offset), i = this._getAnchor();
          this._zoomAnimated ? j(this._container, t.add(i)) : e = e.add(t).add(i);
          var n = this._containerBottom = -e.y, a = this._containerLeft = -Math.round(this._containerWidth / 2) + e.x;
          this._container.style.bottom = n + "px", this._container.style.left = a + "px";
        }
      },
      _getAnchor: function() {
        return [0, 0];
      }
    });
    I.include({
      _initOverlay: function(t, e, i, n) {
        var a = e;
        return a instanceof t || (a = new t(n).setContent(e)), i && a.setLatLng(i), a;
      }
    }), ut.include({
      _initOverlay: function(t, e, i, n) {
        var a = i;
        return a instanceof t ? (x(a, n), a._source = this) : (a = e && !n ? e : new t(n, this), a.setContent(i)), a;
      }
    });
    var be = _t.extend({
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
        return t = arguments.length ? t : this._source._map, !t.hasLayer(this) && t._popup && t._popup.options.autoClose && t.removeLayer(t._popup), t._popup = this, _t.prototype.openOn.call(this, t);
      },
      onAdd: function(t) {
        _t.prototype.onAdd.call(this, t), t.fire("popupopen", { popup: this }), this._source && (this._source.fire("popupopen", { popup: this }, !0), this._source instanceof At || this._source.on("preclick", Tt));
      },
      onRemove: function(t) {
        _t.prototype.onRemove.call(this, t), t.fire("popupclose", { popup: this }), this._source && (this._source.fire("popupclose", { popup: this }, !0), this._source instanceof At || this._source.off("preclick", Tt));
      },
      getEvents: function() {
        var t = _t.prototype.getEvents.call(this);
        return (this.options.closeOnClick !== void 0 ? this.options.closeOnClick : this._map.options.closePopupOnClick) && (t.preclick = this.close), this.options.keepInView && (t.moveend = this._adjustPan), t;
      },
      _initLayout: function() {
        var t = "leaflet-popup", e = this._container = B(
          "div",
          t + " " + (this.options.className || "") + " leaflet-zoom-animated"
        ), i = this._wrapper = B("div", t + "-content-wrapper", e);
        if (this._contentNode = B("div", t + "-content", i), Yt(e), Ke(this._contentNode), A(e, "contextmenu", Tt), this._tipContainer = B("div", t + "-tip-container", e), this._tip = B("div", t + "-tip", this._tipContainer), this.options.closeButton) {
          var n = this._closeButton = B("a", t + "-close-button", e);
          n.setAttribute("role", "button"), n.setAttribute("aria-label", "Close popup"), n.href = "#close", n.innerHTML = '<span aria-hidden="true">&#215;</span>', A(n, "click", function(a) {
            Y(a), this.close();
          }, this);
        }
      },
      _updateLayout: function() {
        var t = this._contentNode, e = t.style;
        e.width = "", e.whiteSpace = "nowrap";
        var i = t.offsetWidth;
        i = Math.min(i, this.options.maxWidth), i = Math.max(i, this.options.minWidth), e.width = i + 1 + "px", e.whiteSpace = "", e.height = "";
        var n = t.offsetHeight, a = this.options.maxHeight, r = "leaflet-popup-scrolled";
        a && n > a ? (e.height = a + "px", P(t, r)) : U(t, r), this._containerWidth = this._container.offsetWidth;
      },
      _animateZoom: function(t) {
        var e = this._map._latLngToNewLayerPoint(this._latlng, t.zoom, t.center), i = this._getAnchor();
        j(this._container, e.add(i));
      },
      _adjustPan: function() {
        if (this.options.autoPan) {
          if (this._map._panAnim && this._map._panAnim.stop(), this._autopanning) {
            this._autopanning = !1;
            return;
          }
          var t = this._map, e = parseInt(Vt(this._container, "marginBottom"), 10) || 0, i = this._container.offsetHeight + e, n = this._containerWidth, a = new k(this._containerLeft, -i - this._containerBottom);
          a._add(Pt(this._container));
          var r = t.layerPointToContainerPoint(a), l = E(this.options.autoPanPadding), u = E(this.options.autoPanPaddingTopLeft || l), d = E(this.options.autoPanPaddingBottomRight || l), m = t.getSize(), g = 0, y = 0;
          r.x + n + d.x > m.x && (g = r.x + n - m.x + d.x), r.x - g - u.x < 0 && (g = r.x - u.x), r.y + i + d.y > m.y && (y = r.y + i - m.y + d.y), r.y - y - u.y < 0 && (y = r.y - u.y), (g || y) && (this.options.keepInView && (this._autopanning = !0), t.fire("autopanstart").panBy([g, y]));
        }
      },
      _getAnchor: function() {
        return E(this._source && this._source._getPopupAnchor ? this._source._getPopupAnchor() : [0, 0]);
      }
    }), Vo = function(t, e) {
      return new be(t, e);
    };
    I.mergeOptions({
      closePopupOnClick: !0
    }), I.include({
      // @method openPopup(popup: Popup): this
      // Opens the specified popup while closing the previously opened (to make sure only one is opened at one time for usability).
      // @alternative
      // @method openPopup(content: String|HTMLElement, latlng: LatLng, options?: Popup options): this
      // Creates a popup with the specified content and options and opens it in the given point on a map.
      openPopup: function(t, e, i) {
        return this._initOverlay(be, t, e, i).openOn(this), this;
      },
      // @method closePopup(popup?: Popup): this
      // Closes the popup previously opened with [openPopup](#map-openpopup) (or the given one).
      closePopup: function(t) {
        return t = arguments.length ? t : this._popup, t && t.close(), this;
      }
    }), ut.include({
      // @method bindPopup(content: String|HTMLElement|Function|Popup, options?: Popup options): this
      // Binds a popup to the layer with the passed `content` and sets up the
      // necessary event listeners. If a `Function` is passed it will receive
      // the layer as the first argument and should return a `String` or `HTMLElement`.
      bindPopup: function(t, e) {
        return this._popup = this._initOverlay(be, this._popup, t, e), this._popupHandlersAdded || (this.on({
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
        return this._popup && (this instanceof bt || (this._popup._source = this), this._popup._prepareOpen(t || this._latlng) && this._popup.openOn(this._map)), this;
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
          zt(t);
          var e = t.layer || t.target;
          if (this._popup._source === e && !(e instanceof At)) {
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
    var xe = _t.extend({
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
        _t.prototype.onAdd.call(this, t), this.setOpacity(this.options.opacity), t.fire("tooltipopen", { tooltip: this }), this._source && (this.addEventParent(this._source), this._source.fire("tooltipopen", { tooltip: this }, !0));
      },
      onRemove: function(t) {
        _t.prototype.onRemove.call(this, t), t.fire("tooltipclose", { tooltip: this }), this._source && (this.removeEventParent(this._source), this._source.fire("tooltipclose", { tooltip: this }, !0));
      },
      getEvents: function() {
        var t = _t.prototype.getEvents.call(this);
        return this.options.permanent || (t.preclick = this.close), t;
      },
      _initLayout: function() {
        var t = "leaflet-tooltip", e = t + " " + (this.options.className || "") + " leaflet-zoom-" + (this._zoomAnimated ? "animated" : "hide");
        this._contentNode = this._container = B("div", e), this._container.setAttribute("role", "tooltip"), this._container.setAttribute("id", "leaflet-tooltip-" + _(this));
      },
      _updateLayout: function() {
      },
      _adjustPan: function() {
      },
      _setPosition: function(t) {
        var e, i, n = this._map, a = this._container, r = n.latLngToContainerPoint(n.getCenter()), l = n.layerPointToContainerPoint(t), u = this.options.direction, d = a.offsetWidth, m = a.offsetHeight, g = E(this.options.offset), y = this._getAnchor();
        u === "top" ? (e = d / 2, i = m) : u === "bottom" ? (e = d / 2, i = 0) : u === "center" ? (e = d / 2, i = m / 2) : u === "right" ? (e = 0, i = m / 2) : u === "left" ? (e = d, i = m / 2) : l.x < r.x ? (u = "right", e = 0, i = m / 2) : (u = "left", e = d + (g.x + y.x) * 2, i = m / 2), t = t.subtract(E(e, i, !0)).add(g).add(y), U(a, "leaflet-tooltip-right"), U(a, "leaflet-tooltip-left"), U(a, "leaflet-tooltip-top"), U(a, "leaflet-tooltip-bottom"), P(a, "leaflet-tooltip-" + u), j(a, t);
      },
      _updatePosition: function() {
        var t = this._map.latLngToLayerPoint(this._latlng);
        this._setPosition(t);
      },
      setOpacity: function(t) {
        this.options.opacity = t, this._container && at(this._container, t);
      },
      _animateZoom: function(t) {
        var e = this._map._latLngToNewLayerPoint(this._latlng, t.zoom, t.center);
        this._setPosition(e);
      },
      _getAnchor: function() {
        return E(this._source && this._source._getTooltipAnchor && !this.options.sticky ? this._source._getTooltipAnchor() : [0, 0]);
      }
    }), jo = function(t, e) {
      return new xe(t, e);
    };
    I.include({
      // @method openTooltip(tooltip: Tooltip): this
      // Opens the specified tooltip.
      // @alternative
      // @method openTooltip(content: String|HTMLElement, latlng: LatLng, options?: Tooltip options): this
      // Creates a tooltip with the specified content and options and open it.
      openTooltip: function(t, e, i) {
        return this._initOverlay(xe, t, e, i).openOn(this), this;
      },
      // @method closeTooltip(tooltip: Tooltip): this
      // Closes the tooltip given as parameter.
      closeTooltip: function(t) {
        return t.close(), this;
      }
    }), ut.include({
      // @method bindTooltip(content: String|HTMLElement|Function|Tooltip, options?: Tooltip options): this
      // Binds a tooltip to the layer with the passed `content` and sets up the
      // necessary event listeners. If a `Function` is passed it will receive
      // the layer as the first argument and should return a `String` or `HTMLElement`.
      bindTooltip: function(t, e) {
        return this._tooltip && this.isTooltipOpen() && this.unbindTooltip(), this._tooltip = this._initOverlay(xe, this._tooltip, t, e), this._initTooltipInteractions(), this._tooltip.options.permanent && this._map && this._map.hasLayer(this) && this.openTooltip(), this;
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
        return this._tooltip && (this instanceof bt || (this._tooltip._source = this), this._tooltip._prepareOpen(t) && (this._tooltip.openOn(this._map), this.getElement ? this._setAriaDescribedByOnLayer(this) : this.eachLayer && this.eachLayer(this._setAriaDescribedByOnLayer, this))), this;
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
        e && (A(e, "focus", function() {
          this._tooltip._source = t, this.openTooltip();
        }, this), A(e, "blur", this.closeTooltip, this));
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
    var cn = Zt.extend({
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
        if (i.html instanceof Element ? (re(e), e.appendChild(i.html)) : e.innerHTML = i.html !== !1 ? i.html : "", i.bgPos) {
          var n = E(i.bgPos);
          e.style.backgroundPosition = -n.x + "px " + -n.y + "px";
        }
        return this._setIconStyles(e, "icon"), e;
      },
      createShadow: function() {
        return null;
      }
    });
    function Go(t) {
      return new cn(t);
    }
    Zt.Default = $t;
    var Qt = ut.extend({
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
        updateWhenIdle: b.mobile,
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
        x(this, t);
      },
      onAdd: function() {
        this._initContainer(), this._levels = {}, this._tiles = {}, this._resetView();
      },
      beforeAdd: function(t) {
        t._addZoomLimit(this);
      },
      onRemove: function(t) {
        this._removeAllTiles(), q(this._container), t._removeZoomLimit(this), this._container = null, this._tileZoom = void 0;
      },
      // @method bringToFront: this
      // Brings the tile layer to the top of all tile layers.
      bringToFront: function() {
        return this._map && (It(this._container), this._setAutoZIndex(Math.max)), this;
      },
      // @method bringToBack: this
      // Brings the tile layer to the bottom of all tile layers.
      bringToBack: function() {
        return this._map && (Ot(this._container), this._setAutoZIndex(Math.min)), this;
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
        return this.options.updateWhenIdle || (this._onMove || (this._onMove = T(this._onMoveEnd, this.options.updateInterval, this)), t.move = this._onMove), this._zoomAnimated && (t.zoomanim = this._animateZoom), t;
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
        return t instanceof k ? t : new k(t, t);
      },
      _updateZIndex: function() {
        this._container && this.options.zIndex !== void 0 && this.options.zIndex !== null && (this._container.style.zIndex = this.options.zIndex);
      },
      _setAutoZIndex: function(t) {
        for (var e = this.getPane().children, i = -t(-1 / 0, 1 / 0), n = 0, a = e.length, r; n < a; n++)
          r = e[n].style.zIndex, e[n] !== this._container && r && (i = t(i, +r));
        isFinite(i) && (this.options.zIndex = i + t(-1, 1), this._updateZIndex());
      },
      _updateOpacity: function() {
        if (this._map && !b.ielt9) {
          at(this._container, this.options.opacity);
          var t = +/* @__PURE__ */ new Date(), e = !1, i = !1;
          for (var n in this._tiles) {
            var a = this._tiles[n];
            if (!(!a.current || !a.loaded)) {
              var r = Math.min(1, (t - a.loaded) / 200);
              at(a.el, r), r < 1 ? e = !0 : (a.active ? i = !0 : this._onOpaqueTile(a), a.active = !0);
            }
          }
          i && !this._noPrune && this._pruneTiles(), e && (ot(this._fadeFrame), this._fadeFrame = $(this._updateOpacity, this));
        }
      },
      _onOpaqueTile: w,
      _initContainer: function() {
        this._container || (this._container = B("div", "leaflet-layer " + (this.options.className || "")), this._updateZIndex(), this.options.opacity < 1 && this._updateOpacity(), this.getPane().appendChild(this._container));
      },
      _updateLevels: function() {
        var t = this._tileZoom, e = this.options.maxZoom;
        if (t !== void 0) {
          for (var i in this._levels)
            i = Number(i), this._levels[i].el.children.length || i === t ? (this._levels[i].el.style.zIndex = e - Math.abs(t - i), this._onUpdateLevel(i)) : (q(this._levels[i].el), this._removeTilesAtZoom(i), this._onRemoveLevel(i), delete this._levels[i]);
          var n = this._levels[t], a = this._map;
          return n || (n = this._levels[t] = {}, n.el = B("div", "leaflet-tile-container leaflet-zoom-animated", this._container), n.el.style.zIndex = e, n.origin = a.project(a.unproject(a.getPixelOrigin()), t).round(), n.zoom = t, this._setZoomTransform(n, a.getCenter(), a.getZoom()), w(n.el.offsetWidth), this._onCreateLevel(n)), this._level = n, n;
        }
      },
      _onUpdateLevel: w,
      _onRemoveLevel: w,
      _onCreateLevel: w,
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
          q(this._levels[t].el), this._onRemoveLevel(Number(t)), delete this._levels[t];
        this._removeAllTiles(), this._tileZoom = void 0;
      },
      _retainParent: function(t, e, i, n) {
        var a = Math.floor(t / 2), r = Math.floor(e / 2), l = i - 1, u = new k(+a, +r);
        u.z = +l;
        var d = this._tileCoordsToKey(u), m = this._tiles[d];
        return m && m.active ? (m.retain = !0, !0) : (m && m.loaded && (m.retain = !0), l > n ? this._retainParent(a, r, l, n) : !1);
      },
      _retainChildren: function(t, e, i, n) {
        for (var a = 2 * t; a < 2 * t + 2; a++)
          for (var r = 2 * e; r < 2 * e + 2; r++) {
            var l = new k(a, r);
            l.z = i + 1;
            var u = this._tileCoordsToKey(l), d = this._tiles[u];
            if (d && d.active) {
              d.retain = !0;
              continue;
            } else d && d.loaded && (d.retain = !0);
            i + 1 < n && this._retainChildren(a, r, i + 1, n);
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
        var r = this.options.updateWhenZooming && a !== this._tileZoom;
        (!n || r) && (this._tileZoom = a, this._abortLoading && this._abortLoading(), this._updateLevels(), this._resetGrid(), a !== void 0 && this._update(t), i || this._pruneTiles(), this._noPrune = !!i), this._setZoomTransforms(t, e);
      },
      _setZoomTransforms: function(t, e) {
        for (var i in this._levels)
          this._setZoomTransform(this._levels[i], t, e);
      },
      _setZoomTransform: function(t, e, i) {
        var n = this._map.getZoomScale(i, t.zoom), a = t.origin.multiplyBy(n).subtract(this._map._getNewPixelOrigin(e, i)).round();
        b.any3d ? Ct(t.el, a, n) : j(t.el, a);
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
        var e = this._map, i = e._animatingZoom ? Math.max(e._animateToZoom, e.getZoom()) : e.getZoom(), n = e.getZoomScale(i, this._tileZoom), a = e.project(t, this._tileZoom).floor(), r = e.getSize().divideBy(n * 2);
        return new F(a.subtract(r), a.add(r));
      },
      // Private method to load tiles in the grid's active zoom level according to map bounds
      _update: function(t) {
        var e = this._map;
        if (e) {
          var i = this._clampZoom(e.getZoom());
          if (t === void 0 && (t = e.getCenter()), this._tileZoom !== void 0) {
            var n = this._getTiledPixelBounds(t), a = this._pxBoundsToTileRange(n), r = a.getCenter(), l = [], u = this.options.keepBuffer, d = new F(
              a.getBottomLeft().subtract([u, -u]),
              a.getTopRight().add([u, -u])
            );
            if (!(isFinite(a.min.x) && isFinite(a.min.y) && isFinite(a.max.x) && isFinite(a.max.y)))
              throw new Error("Attempted to load an infinite number of tiles");
            for (var m in this._tiles) {
              var g = this._tiles[m].coords;
              (g.z !== this._tileZoom || !d.contains(new k(g.x, g.y))) && (this._tiles[m].current = !1);
            }
            if (Math.abs(i - this._tileZoom) > 1) {
              this._setView(t, i);
              return;
            }
            for (var y = a.min.y; y <= a.max.y; y++)
              for (var z = a.min.x; z <= a.max.x; z++) {
                var J = new k(z, y);
                if (J.z = this._tileZoom, !!this._isValidTile(J)) {
                  var K = this._tiles[this._tileCoordsToKey(J)];
                  K ? K.current = !0 : l.push(J);
                }
              }
            if (l.sort(function(et, Ht) {
              return et.distanceTo(r) - Ht.distanceTo(r);
            }), l.length !== 0) {
              this._loading || (this._loading = !0, this.fire("loading"));
              var st = document.createDocumentFragment();
              for (z = 0; z < l.length; z++)
                this._addTile(l[z], st);
              this._level.el.appendChild(st);
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
        return V(this.options.bounds).overlaps(n);
      },
      _keyToBounds: function(t) {
        return this._tileCoordsToBounds(this._keyToTileCoords(t));
      },
      _tileCoordsToNwSe: function(t) {
        var e = this._map, i = this.getTileSize(), n = t.scaleBy(i), a = n.add(i), r = e.unproject(n, t.z), l = e.unproject(a, t.z);
        return [r, l];
      },
      // converts tile coordinates to its geographical bounds
      _tileCoordsToBounds: function(t) {
        var e = this._tileCoordsToNwSe(t), i = new tt(e[0], e[1]);
        return this.options.noWrap || (i = this._map.wrapLatLngBounds(i)), i;
      },
      // converts tile coordinates to key for the tile cache
      _tileCoordsToKey: function(t) {
        return t.x + ":" + t.y + ":" + t.z;
      },
      // converts tile cache key to coordinates
      _keyToTileCoords: function(t) {
        var e = t.split(":"), i = new k(+e[0], +e[1]);
        return i.z = +e[2], i;
      },
      _removeTile: function(t) {
        var e = this._tiles[t];
        e && (q(e.el), delete this._tiles[t], this.fire("tileunload", {
          tile: e.el,
          coords: this._keyToTileCoords(t)
        }));
      },
      _initTile: function(t) {
        P(t, "leaflet-tile");
        var e = this.getTileSize();
        t.style.width = e.x + "px", t.style.height = e.y + "px", t.onselectstart = w, t.onmousemove = w, b.ielt9 && this.options.opacity < 1 && at(t, this.options.opacity);
      },
      _addTile: function(t, e) {
        var i = this._getTilePos(t), n = this._tileCoordsToKey(t), a = this.createTile(this._wrapCoords(t), c(this._tileReady, this, t));
        this._initTile(a), this.createTile.length < 2 && $(c(this._tileReady, this, t, null, a)), j(a, i), this._tiles[n] = {
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
        i = this._tiles[n], i && (i.loaded = +/* @__PURE__ */ new Date(), this._map._fadeAnimated ? (at(i.el, 0), ot(this._fadeFrame), this._fadeFrame = $(this._updateOpacity, this)) : (i.active = !0, this._pruneTiles()), e || (P(i.el, "leaflet-tile-loaded"), this.fire("tileload", {
          tile: i.el,
          coords: t
        })), this._noTilesToLoad() && (this._loading = !1, this.fire("load"), b.ielt9 || !this._map._fadeAnimated ? $(this._pruneTiles, this) : setTimeout(c(this._pruneTiles, this), 250)));
      },
      _getTilePos: function(t) {
        return t.scaleBy(this.getTileSize()).subtract(this._level.origin);
      },
      _wrapCoords: function(t) {
        var e = new k(
          this._wrapX ? O(t.x, this._wrapX) : t.x,
          this._wrapY ? O(t.y, this._wrapY) : t.y
        );
        return e.z = t.z, e;
      },
      _pxBoundsToTileRange: function(t) {
        var e = this.getTileSize();
        return new F(
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
    function Ko(t) {
      return new Qt(t);
    }
    var Dt = Qt.extend({
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
        this._url = t, e = x(this, e), e.detectRetina && b.retina && e.maxZoom > 0 ? (e.tileSize = Math.floor(e.tileSize / 2), e.zoomReverse ? (e.zoomOffset--, e.minZoom = Math.min(e.maxZoom, e.minZoom + 1)) : (e.zoomOffset++, e.maxZoom = Math.max(e.minZoom, e.maxZoom - 1)), e.minZoom = Math.max(0, e.minZoom)) : e.zoomReverse ? e.minZoom = Math.min(e.maxZoom, e.minZoom) : e.maxZoom = Math.max(e.minZoom, e.maxZoom), typeof e.subdomains == "string" && (e.subdomains = e.subdomains.split("")), this.on("tileunload", this._onTileRemove);
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
        return A(i, "load", c(this._tileOnLoad, this, e, i)), A(i, "error", c(this._tileOnError, this, e, i)), (this.options.crossOrigin || this.options.crossOrigin === "") && (i.crossOrigin = this.options.crossOrigin === !0 ? "" : this.options.crossOrigin), typeof this.options.referrerPolicy == "string" && (i.referrerPolicy = this.options.referrerPolicy), i.alt = "", i.src = this.getTileUrl(t), i;
      },
      // @section Extension methods
      // @uninheritable
      // Layers extending `TileLayer` might reimplement the following method.
      // @method getTileUrl(coords: Object): String
      // Called only internally, returns the URL for a tile given its coordinates.
      // Classes extending `TileLayer` can override this function to provide custom tile URL naming schemes.
      getTileUrl: function(t) {
        var e = {
          r: b.retina ? "@2x" : "",
          s: this._getSubdomain(t),
          x: t.x,
          y: t.y,
          z: this._getZoomForUrl()
        };
        if (this._map && !this._map.options.crs.infinite) {
          var i = this._globalTileRange.max.y - t.y;
          this.options.tms && (e.y = i), e["-y"] = i;
        }
        return dt(this._url, h(e, this.options));
      },
      _tileOnLoad: function(t, e) {
        b.ielt9 ? setTimeout(c(t, this, null, e), 0) : t(null, e);
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
          if (this._tiles[t].coords.z !== this._tileZoom && (e = this._tiles[t].el, e.onload = w, e.onerror = w, !e.complete)) {
            e.src = ne;
            var i = this._tiles[t].coords;
            q(e), delete this._tiles[t], this.fire("tileabort", {
              tile: e,
              coords: i
            });
          }
      },
      _removeTile: function(t) {
        var e = this._tiles[t];
        if (e)
          return e.el.setAttribute("src", ne), Qt.prototype._removeTile.call(this, t);
      },
      _tileReady: function(t, e, i) {
        if (!(!this._map || i && i.getAttribute("src") === ne))
          return Qt.prototype._tileReady.call(this, t, e, i);
      }
    });
    function dn(t, e) {
      return new Dt(t, e);
    }
    var fn = Dt.extend({
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
        var i = h({}, this.defaultWmsParams);
        for (var n in e)
          n in this.options || (i[n] = e[n]);
        e = x(this, e);
        var a = e.detectRetina && b.retina ? 2 : 1, r = this.getTileSize();
        i.width = r.x * a, i.height = r.y * a, this.wmsParams = i;
      },
      onAdd: function(t) {
        this._crs = this.options.crs || t.options.crs, this._wmsVersion = parseFloat(this.wmsParams.version);
        var e = this._wmsVersion >= 1.3 ? "crs" : "srs";
        this.wmsParams[e] = this._crs.code, Dt.prototype.onAdd.call(this, t);
      },
      getTileUrl: function(t) {
        var e = this._tileCoordsToNwSe(t), i = this._crs, n = Q(i.project(e[0]), i.project(e[1])), a = n.min, r = n.max, l = (this._wmsVersion >= 1.3 && this._crs === an ? [a.y, a.x, r.y, r.x] : [a.x, a.y, r.x, r.y]).join(","), u = Dt.prototype.getTileUrl.call(this, t);
        return u + D(this.wmsParams, u, this.options.uppercase) + (this.options.uppercase ? "&BBOX=" : "&bbox=") + l;
      },
      // @method setParams(params: Object, noRedraw?: Boolean): this
      // Merges an object with the new parameters and re-requests tiles on the current screen (unless `noRedraw` was set to true).
      setParams: function(t, e) {
        return h(this.wmsParams, t), e || this.redraw(), this;
      }
    });
    function Yo(t, e) {
      return new fn(t, e);
    }
    Dt.WMS = fn, dn.wms = Yo;
    var wt = ut.extend({
      // @section
      // @aka Renderer options
      options: {
        // @option padding: Number = 0.1
        // How much to extend the clip area around the map view (relative to its size)
        // e.g. 0.1 would be 10% of map view in each direction
        padding: 0.1
      },
      initialize: function(t) {
        x(this, t), _(this), this._layers = this._layers || {};
      },
      onAdd: function() {
        this._container || (this._initContainer(), P(this._container, "leaflet-zoom-animated")), this.getPane().appendChild(this._container), this._update(), this.on("update", this._updatePaths, this);
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
        var i = this._map.getZoomScale(e, this._zoom), n = this._map.getSize().multiplyBy(0.5 + this.options.padding), a = this._map.project(this._center, e), r = n.multiplyBy(-i).add(a).subtract(this._map._getNewPixelOrigin(t, e));
        b.any3d ? Ct(this._container, r, i) : j(this._container, r);
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
        this._bounds = new F(i, i.add(e.multiplyBy(1 + t * 2)).round()), this._center = this._map.getCenter(), this._zoom = this._map.getZoom();
      }
    }), pn = wt.extend({
      // @section
      // @aka Canvas options
      options: {
        // @option tolerance: Number = 0
        // How much to extend the click tolerance around a path/object on the map.
        tolerance: 0
      },
      getEvents: function() {
        var t = wt.prototype.getEvents.call(this);
        return t.viewprereset = this._onViewPreReset, t;
      },
      _onViewPreReset: function() {
        this._postponeUpdatePaths = !0;
      },
      onAdd: function() {
        wt.prototype.onAdd.call(this), this._draw();
      },
      _initContainer: function() {
        var t = this._container = document.createElement("canvas");
        A(t, "mousemove", this._onMouseMove, this), A(t, "click dblclick mousedown mouseup contextmenu", this._onClick, this), A(t, "mouseout", this._handleMouseOut, this), t._leaflet_disable_events = !0, this._ctx = t.getContext("2d");
      },
      _destroyContainer: function() {
        ot(this._redrawRequest), delete this._ctx, q(this._container), H(this._container), delete this._container;
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
          wt.prototype._update.call(this);
          var t = this._bounds, e = this._container, i = t.getSize(), n = b.retina ? 2 : 1;
          j(e, t.min), e.width = n * i.x, e.height = n * i.y, e.style.width = i.x + "px", e.style.height = i.y + "px", b.retina && this._ctx.scale(2, 2), this._ctx.translate(-t.min.x, -t.min.y), this.fire("update");
        }
      },
      _reset: function() {
        wt.prototype._reset.call(this), this._postponeUpdatePaths && (this._postponeUpdatePaths = !1, this._updatePaths());
      },
      _initPath: function(t) {
        this._updateDashArray(t), this._layers[_(t)] = t;
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
        i ? i.prev = n : this._drawLast = n, n ? n.next = i : this._drawFirst = i, delete t._order, delete this._layers[_(t)], this._requestRedraw(t);
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
        this._map && (this._extendRedrawBounds(t), this._redrawRequest = this._redrawRequest || $(this._redraw, this));
      },
      _extendRedrawBounds: function(t) {
        if (t._pxBounds) {
          var e = (t.options.weight || 0) + 1;
          this._redrawBounds = this._redrawBounds || new F(), this._redrawBounds.extend(t._pxBounds.min.subtract([e, e])), this._redrawBounds.extend(t._pxBounds.max.add([e, e]));
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
          var i, n, a, r, l = t._parts, u = l.length, d = this._ctx;
          if (u) {
            for (d.beginPath(), i = 0; i < u; i++) {
              for (n = 0, a = l[i].length; n < a; n++)
                r = l[i][n], d[n ? "lineTo" : "moveTo"](r.x, r.y);
              e && d.closePath();
            }
            this._fillStroke(d, t);
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
        e && (U(this._container, "leaflet-interactive"), this._fireEvent([e], t, "mouseout"), this._hoveredLayer = null, this._mouseHoverThrottled = !1);
      },
      _handleMouseHover: function(t, e) {
        if (!this._mouseHoverThrottled) {
          for (var i, n, a = this._drawFirst; a; a = a.next)
            i = a.layer, i.options.interactive && i._containsPoint(e) && (n = i);
          n !== this._hoveredLayer && (this._handleMouseOut(t), n && (P(this._container, "leaflet-interactive"), this._fireEvent([n], t, "mouseover"), this._hoveredLayer = n)), this._fireEvent(this._hoveredLayer ? [this._hoveredLayer] : !1, t), this._mouseHoverThrottled = !0, setTimeout(c(function() {
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
    function mn(t) {
      return b.canvas ? new pn(t) : null;
    }
    var te = function() {
      try {
        return document.namespaces.add("lvml", "urn:schemas-microsoft-com:vml"), function(t) {
          return document.createElement("<lvml:" + t + ' class="lvml">');
        };
      } catch {
      }
      return function(t) {
        return document.createElement("<" + t + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
      };
    }(), Jo = {
      _initContainer: function() {
        this._container = B("div", "leaflet-vml-container");
      },
      _update: function() {
        this._map._animatingZoom || (wt.prototype._update.call(this), this.fire("update"));
      },
      _initPath: function(t) {
        var e = t._container = te("shape");
        P(e, "leaflet-vml-shape " + (this.options.className || "")), e.coordsize = "1 1", t._path = te("path"), e.appendChild(t._path), this._updateStyle(t), this._layers[_(t)] = t;
      },
      _addPath: function(t) {
        var e = t._container;
        this._container.appendChild(e), t.options.interactive && t.addInteractiveTarget(e);
      },
      _removePath: function(t) {
        var e = t._container;
        q(e), t.removeInteractiveTarget(e), delete this._layers[_(t)];
      },
      _updateStyle: function(t) {
        var e = t._stroke, i = t._fill, n = t.options, a = t._container;
        a.stroked = !!n.stroke, a.filled = !!n.fill, n.stroke ? (e || (e = t._stroke = te("stroke")), a.appendChild(e), e.weight = n.weight + "px", e.color = n.color, e.opacity = n.opacity, n.dashArray ? e.dashStyle = lt(n.dashArray) ? n.dashArray.join(" ") : n.dashArray.replace(/( *, *)/g, " ") : e.dashStyle = "", e.endcap = n.lineCap.replace("butt", "flat"), e.joinstyle = n.lineJoin) : e && (a.removeChild(e), t._stroke = null), n.fill ? (i || (i = t._fill = te("fill")), a.appendChild(i), i.color = n.fillColor || n.color, i.opacity = n.fillOpacity) : i && (a.removeChild(i), t._fill = null);
      },
      _updateCircle: function(t) {
        var e = t._point.round(), i = Math.round(t._radius), n = Math.round(t._radiusY || i);
        this._setPath(t, t._empty() ? "M0 0" : "AL " + e.x + "," + e.y + " " + i + "," + n + " 0," + 65535 * 360);
      },
      _setPath: function(t, e) {
        t._path.v = e;
      },
      _bringToFront: function(t) {
        It(t._container);
      },
      _bringToBack: function(t) {
        Ot(t._container);
      }
    }, ye = b.vml ? te : vi, ee = wt.extend({
      _initContainer: function() {
        this._container = ye("svg"), this._container.setAttribute("pointer-events", "none"), this._rootGroup = ye("g"), this._container.appendChild(this._rootGroup);
      },
      _destroyContainer: function() {
        q(this._container), H(this._container), delete this._container, delete this._rootGroup, delete this._svgSize;
      },
      _update: function() {
        if (!(this._map._animatingZoom && this._bounds)) {
          wt.prototype._update.call(this);
          var t = this._bounds, e = t.getSize(), i = this._container;
          (!this._svgSize || !this._svgSize.equals(e)) && (this._svgSize = e, i.setAttribute("width", e.x), i.setAttribute("height", e.y)), j(i, t.min), i.setAttribute("viewBox", [t.min.x, t.min.y, e.x, e.y].join(" ")), this.fire("update");
        }
      },
      // methods below are called by vector layers implementations
      _initPath: function(t) {
        var e = t._path = ye("path");
        t.options.className && P(e, t.options.className), t.options.interactive && P(e, "leaflet-interactive"), this._updateStyle(t), this._layers[_(t)] = t;
      },
      _addPath: function(t) {
        this._rootGroup || this._initContainer(), this._rootGroup.appendChild(t._path), t.addInteractiveTarget(t._path);
      },
      _removePath: function(t) {
        q(t._path), t.removeInteractiveTarget(t._path), delete this._layers[_(t)];
      },
      _updatePath: function(t) {
        t._project(), t._update();
      },
      _updateStyle: function(t) {
        var e = t._path, i = t.options;
        e && (i.stroke ? (e.setAttribute("stroke", i.color), e.setAttribute("stroke-opacity", i.opacity), e.setAttribute("stroke-width", i.weight), e.setAttribute("stroke-linecap", i.lineCap), e.setAttribute("stroke-linejoin", i.lineJoin), i.dashArray ? e.setAttribute("stroke-dasharray", i.dashArray) : e.removeAttribute("stroke-dasharray"), i.dashOffset ? e.setAttribute("stroke-dashoffset", i.dashOffset) : e.removeAttribute("stroke-dashoffset")) : e.setAttribute("stroke", "none"), i.fill ? (e.setAttribute("fill", i.fillColor || i.color), e.setAttribute("fill-opacity", i.fillOpacity), e.setAttribute("fill-rule", i.fillRule || "evenodd")) : e.setAttribute("fill", "none"));
      },
      _updatePoly: function(t, e) {
        this._setPath(t, bi(t._parts, e));
      },
      _updateCircle: function(t) {
        var e = t._point, i = Math.max(Math.round(t._radius), 1), n = Math.max(Math.round(t._radiusY), 1) || i, a = "a" + i + "," + n + " 0 1,0 ", r = t._empty() ? "M0 0" : "M" + (e.x - i) + "," + e.y + a + i * 2 + ",0 " + a + -i * 2 + ",0 ";
        this._setPath(t, r);
      },
      _setPath: function(t, e) {
        t._path.setAttribute("d", e);
      },
      // SVG does not have the concept of zIndex so we resort to changing the DOM order of elements
      _bringToFront: function(t) {
        It(t._path);
      },
      _bringToBack: function(t) {
        Ot(t._path);
      }
    });
    b.vml && ee.include(Jo);
    function _n(t) {
      return b.svg || b.vml ? new ee(t) : null;
    }
    I.include({
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
        return this.options.preferCanvas && mn(t) || _n(t);
      }
    });
    var gn = Rt.extend({
      initialize: function(t, e) {
        Rt.prototype.initialize.call(this, this._boundsToLatLngs(t), e);
      },
      // @method setBounds(latLngBounds: LatLngBounds): this
      // Redraws the rectangle with the passed bounds.
      setBounds: function(t) {
        return this.setLatLngs(this._boundsToLatLngs(t));
      },
      _boundsToLatLngs: function(t) {
        return t = V(t), [
          t.getSouthWest(),
          t.getNorthWest(),
          t.getNorthEast(),
          t.getSouthEast()
        ];
      }
    });
    function Xo(t, e) {
      return new gn(t, e);
    }
    ee.create = ye, ee.pointsToPath = bi, yt.geometryToLayer = pe, yt.coordsToLatLng = ni, yt.coordsToLatLngs = me, yt.latLngToCoords = oi, yt.latLngsToCoords = _e, yt.getFeature = Nt, yt.asFeature = ge, I.mergeOptions({
      // @option boxZoom: Boolean = true
      // Whether the map can be zoomed to a rectangular area specified by
      // dragging the mouse while pressing the shift key.
      boxZoom: !0
    });
    var vn = mt.extend({
      initialize: function(t) {
        this._map = t, this._container = t._container, this._pane = t._panes.overlayPane, this._resetStateTimeout = 0, t.on("unload", this._destroy, this);
      },
      addHooks: function() {
        A(this._container, "mousedown", this._onMouseDown, this);
      },
      removeHooks: function() {
        H(this._container, "mousedown", this._onMouseDown, this);
      },
      moved: function() {
        return this._moved;
      },
      _destroy: function() {
        q(this._pane), delete this._pane;
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
        this._clearDeferredResetState(), this._resetState(), jt(), He(), this._startPoint = this._map.mouseEventToContainerPoint(t), A(document, {
          contextmenu: zt,
          mousemove: this._onMouseMove,
          mouseup: this._onMouseUp,
          keydown: this._onKeyDown
        }, this);
      },
      _onMouseMove: function(t) {
        this._moved || (this._moved = !0, this._box = B("div", "leaflet-zoom-box", this._container), P(this._container, "leaflet-crosshair"), this._map.fire("boxzoomstart")), this._point = this._map.mouseEventToContainerPoint(t);
        var e = new F(this._point, this._startPoint), i = e.getSize();
        j(this._box, e.min), this._box.style.width = i.x + "px", this._box.style.height = i.y + "px";
      },
      _finish: function() {
        this._moved && (q(this._box), U(this._container, "leaflet-crosshair")), Gt(), Fe(), H(document, {
          contextmenu: zt,
          mousemove: this._onMouseMove,
          mouseup: this._onMouseUp,
          keydown: this._onKeyDown
        }, this);
      },
      _onMouseUp: function(t) {
        if (!(t.which !== 1 && t.button !== 1) && (this._finish(), !!this._moved)) {
          this._clearDeferredResetState(), this._resetStateTimeout = setTimeout(c(this._resetState, this), 0);
          var e = new tt(
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
    I.addInitHook("addHandler", "boxZoom", vn), I.mergeOptions({
      // @option doubleClickZoom: Boolean|String = true
      // Whether the map can be zoomed in by double clicking on it and
      // zoomed out by double clicking while holding shift. If passed
      // `'center'`, double-click zoom will zoom to the center of the
      //  view regardless of where the mouse was.
      doubleClickZoom: !0
    });
    var bn = mt.extend({
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
    I.addInitHook("addHandler", "doubleClickZoom", bn), I.mergeOptions({
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
    var xn = mt.extend({
      addHooks: function() {
        if (!this._draggable) {
          var t = this._map;
          this._draggable = new Lt(t._mapPane, t._container), this._draggable.on({
            dragstart: this._onDragStart,
            drag: this._onDrag,
            dragend: this._onDragEnd
          }, this), this._draggable.on("predrag", this._onPreDragLimit, this), t.options.worldCopyJump && (this._draggable.on("predrag", this._onPreDragWrap, this), t.on("zoomend", this._onZoomEnd, this), t.whenReady(this._onZoomEnd, this));
        }
        P(this._map._container, "leaflet-grab leaflet-touch-drag"), this._draggable.enable(), this._positions = [], this._times = [];
      },
      removeHooks: function() {
        U(this._map._container, "leaflet-grab"), U(this._map._container, "leaflet-touch-drag"), this._draggable.disable();
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
          var e = V(this._map.options.maxBounds);
          this._offsetLimit = Q(
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
        var t = this._worldWidth, e = Math.round(t / 2), i = this._initialWorldOffset, n = this._draggable._newPos.x, a = (n - e + i) % t + e - i, r = (n + e + i) % t - e - i, l = Math.abs(a + i) < Math.abs(r + i) ? a : r;
        this._draggable._absPos = this._draggable._newPos.clone(), this._draggable._newPos.x = l;
      },
      _onDragEnd: function(t) {
        var e = this._map, i = e.options, n = !i.inertia || t.noInertia || this._times.length < 2;
        if (e.fire("dragend", t), n)
          e.fire("moveend");
        else {
          this._prunePositions(+/* @__PURE__ */ new Date());
          var a = this._lastPos.subtract(this._positions[0]), r = (this._lastTime - this._times[0]) / 1e3, l = i.easeLinearity, u = a.multiplyBy(l / r), d = u.distanceTo([0, 0]), m = Math.min(i.inertiaMaxSpeed, d), g = u.multiplyBy(m / d), y = m / (i.inertiaDeceleration * l), z = g.multiplyBy(-y / 2).round();
          !z.x && !z.y ? e.fire("moveend") : (z = e._limitOffset(z, e.options.maxBounds), $(function() {
            e.panBy(z, {
              duration: y,
              easeLinearity: l,
              noMoveStart: !0,
              animate: !0
            });
          }));
        }
      }
    });
    I.addInitHook("addHandler", "dragging", xn), I.mergeOptions({
      // @option keyboard: Boolean = true
      // Makes the map focusable and allows users to navigate the map with keyboard
      // arrows and `+`/`-` keys.
      keyboard: !0,
      // @option keyboardPanDelta: Number = 80
      // Amount of pixels to pan when pressing an arrow key.
      keyboardPanDelta: 80
    });
    var yn = mt.extend({
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
        t.tabIndex <= 0 && (t.tabIndex = "0"), A(t, {
          focus: this._onFocus,
          blur: this._onBlur,
          mousedown: this._onMouseDown
        }, this), this._map.on({
          focus: this._addHooks,
          blur: this._removeHooks
        }, this);
      },
      removeHooks: function() {
        this._removeHooks(), H(this._map._container, {
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
        A(document, "keydown", this._onKeyDown, this);
      },
      _removeHooks: function() {
        H(document, "keydown", this._onKeyDown, this);
      },
      _onKeyDown: function(t) {
        if (!(t.altKey || t.ctrlKey || t.metaKey)) {
          var e = t.keyCode, i = this._map, n;
          if (e in this._panKeys) {
            if (!i._panAnim || !i._panAnim._inProgress)
              if (n = this._panKeys[e], t.shiftKey && (n = E(n).multiplyBy(3)), i.options.maxBounds && (n = i._limitOffset(E(n), i.options.maxBounds)), i.options.worldCopyJump) {
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
          zt(t);
        }
      }
    });
    I.addInitHook("addHandler", "keyboard", yn), I.mergeOptions({
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
    var wn = mt.extend({
      addHooks: function() {
        A(this._map._container, "wheel", this._onWheelScroll, this), this._delta = 0;
      },
      removeHooks: function() {
        H(this._map._container, "wheel", this._onWheelScroll, this);
      },
      _onWheelScroll: function(t) {
        var e = Vi(t), i = this._map.options.wheelDebounceTime;
        this._delta += e, this._lastMousePos = this._map.mouseEventToContainerPoint(t), this._startTime || (this._startTime = +/* @__PURE__ */ new Date());
        var n = Math.max(i - (+/* @__PURE__ */ new Date() - this._startTime), 0);
        clearTimeout(this._timer), this._timer = setTimeout(c(this._performZoom, this), n), zt(t);
      },
      _performZoom: function() {
        var t = this._map, e = t.getZoom(), i = this._map.options.zoomSnap || 0;
        t._stop();
        var n = this._delta / (this._map.options.wheelPxPerZoomLevel * 4), a = 4 * Math.log(2 / (1 + Math.exp(-Math.abs(n)))) / Math.LN2, r = i ? Math.ceil(a / i) * i : a, l = t._limitZoom(e + (this._delta > 0 ? r : -r)) - e;
        this._delta = 0, this._startTime = null, l && (t.options.scrollWheelZoom === "center" ? t.setZoom(e + l) : t.setZoomAround(this._lastMousePos, e + l));
      }
    });
    I.addInitHook("addHandler", "scrollWheelZoom", wn);
    var $o = 600;
    I.mergeOptions({
      // @section Touch interaction options
      // @option tapHold: Boolean
      // Enables simulation of `contextmenu` event, default is `true` for mobile Safari.
      tapHold: b.touchNative && b.safari && b.mobile,
      // @option tapTolerance: Number = 15
      // The max number of pixels a user can shift his finger during touch
      // for it to be considered a valid tap.
      tapTolerance: 15
    });
    var En = mt.extend({
      addHooks: function() {
        A(this._map._container, "touchstart", this._onDown, this);
      },
      removeHooks: function() {
        H(this._map._container, "touchstart", this._onDown, this);
      },
      _onDown: function(t) {
        if (clearTimeout(this._holdTimeout), t.touches.length === 1) {
          var e = t.touches[0];
          this._startPos = this._newPos = new k(e.clientX, e.clientY), this._holdTimeout = setTimeout(c(function() {
            this._cancel(), this._isTapValid() && (A(document, "touchend", Y), A(document, "touchend touchcancel", this._cancelClickPrevent), this._simulateEvent("contextmenu", e));
          }, this), $o), A(document, "touchend touchcancel contextmenu", this._cancel, this), A(document, "touchmove", this._onMove, this);
        }
      },
      _cancelClickPrevent: function t() {
        H(document, "touchend", Y), H(document, "touchend touchcancel", t);
      },
      _cancel: function() {
        clearTimeout(this._holdTimeout), H(document, "touchend touchcancel contextmenu", this._cancel, this), H(document, "touchmove", this._onMove, this);
      },
      _onMove: function(t) {
        var e = t.touches[0];
        this._newPos = new k(e.clientX, e.clientY);
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
    I.addInitHook("addHandler", "tapHold", En), I.mergeOptions({
      // @section Touch interaction options
      // @option touchZoom: Boolean|String = *
      // Whether the map can be zoomed by touch-dragging with two fingers. If
      // passed `'center'`, it will zoom to the center of the view regardless of
      // where the touch events (fingers) were. Enabled for touch-capable web
      // browsers.
      touchZoom: b.touch,
      // @option bounceAtZoomLimits: Boolean = true
      // Set it to false if you don't want the map to zoom beyond min/max zoom
      // and then bounce back when pinch-zooming.
      bounceAtZoomLimits: !0
    });
    var kn = mt.extend({
      addHooks: function() {
        P(this._map._container, "leaflet-touch-zoom"), A(this._map._container, "touchstart", this._onTouchStart, this);
      },
      removeHooks: function() {
        U(this._map._container, "leaflet-touch-zoom"), H(this._map._container, "touchstart", this._onTouchStart, this);
      },
      _onTouchStart: function(t) {
        var e = this._map;
        if (!(!t.touches || t.touches.length !== 2 || e._animatingZoom || this._zooming)) {
          var i = e.mouseEventToContainerPoint(t.touches[0]), n = e.mouseEventToContainerPoint(t.touches[1]);
          this._centerPoint = e.getSize()._divideBy(2), this._startLatLng = e.containerPointToLatLng(this._centerPoint), e.options.touchZoom !== "center" && (this._pinchStartLatLng = e.containerPointToLatLng(i.add(n)._divideBy(2))), this._startDist = i.distanceTo(n), this._startZoom = e.getZoom(), this._moved = !1, this._zooming = !0, e._stop(), A(document, "touchmove", this._onTouchMove, this), A(document, "touchend touchcancel", this._onTouchEnd, this), Y(t);
        }
      },
      _onTouchMove: function(t) {
        if (!(!t.touches || t.touches.length !== 2 || !this._zooming)) {
          var e = this._map, i = e.mouseEventToContainerPoint(t.touches[0]), n = e.mouseEventToContainerPoint(t.touches[1]), a = i.distanceTo(n) / this._startDist;
          if (this._zoom = e.getScaleZoom(a, this._startZoom), !e.options.bounceAtZoomLimits && (this._zoom < e.getMinZoom() && a < 1 || this._zoom > e.getMaxZoom() && a > 1) && (this._zoom = e._limitZoom(this._zoom)), e.options.touchZoom === "center") {
            if (this._center = this._startLatLng, a === 1)
              return;
          } else {
            var r = i._add(n)._divideBy(2)._subtract(this._centerPoint);
            if (a === 1 && r.x === 0 && r.y === 0)
              return;
            this._center = e.unproject(e.project(this._pinchStartLatLng, this._zoom).subtract(r), this._zoom);
          }
          this._moved || (e._moveStart(!0, !1), this._moved = !0), ot(this._animRequest);
          var l = c(e._move, e, this._center, this._zoom, { pinch: !0, round: !1 }, void 0);
          this._animRequest = $(l, this, !0), Y(t);
        }
      },
      _onTouchEnd: function() {
        if (!this._moved || !this._zooming) {
          this._zooming = !1;
          return;
        }
        this._zooming = !1, ot(this._animRequest), H(document, "touchmove", this._onTouchMove, this), H(document, "touchend touchcancel", this._onTouchEnd, this), this._map.options.zoomAnimation ? this._map._animateZoom(this._center, this._map._limitZoom(this._zoom), !0, this._map.options.zoomSnap) : this._map._resetView(this._center, this._map._limitZoom(this._zoom));
      }
    });
    I.addInitHook("addHandler", "touchZoom", kn), I.BoxZoom = vn, I.DoubleClickZoom = bn, I.Drag = xn, I.Keyboard = yn, I.ScrollWheelZoom = wn, I.TapHold = En, I.TouchZoom = kn, o.Bounds = F, o.Browser = b, o.CRS = vt, o.Canvas = pn, o.Circle = ii, o.CircleMarker = fe, o.Class = gt, o.Control = ht, o.DivIcon = cn, o.DivOverlay = _t, o.DomEvent = _o, o.DomUtil = po, o.Draggable = Lt, o.Evented = Ft, o.FeatureGroup = bt, o.GeoJSON = yt, o.GridLayer = Qt, o.Handler = mt, o.Icon = Zt, o.ImageOverlay = ve, o.LatLng = R, o.LatLngBounds = tt, o.Layer = ut, o.LayerGroup = Bt, o.LineUtil = To, o.Map = I, o.Marker = de, o.Mixin = Eo, o.Path = At, o.Point = k, o.PolyUtil = ko, o.Polygon = Rt, o.Polyline = xt, o.Popup = be, o.PosAnimation = ji, o.Projection = zo, o.Rectangle = gn, o.Renderer = wt, o.SVG = ee, o.SVGOverlay = un, o.TileLayer = Dt, o.Tooltip = xe, o.Transformation = Pe, o.Util = Bn, o.VideoOverlay = hn, o.bind = c, o.bounds = Q, o.canvas = mn, o.circle = No, o.circleMarker = Ro, o.control = Jt, o.divIcon = Go, o.extend = h, o.featureGroup = Oo, o.geoJSON = ln, o.geoJson = Fo, o.gridLayer = Ko, o.icon = Bo, o.imageOverlay = qo, o.latLng = M, o.latLngBounds = V, o.layerGroup = Io, o.map = go, o.marker = Zo, o.point = E, o.polygon = Ho, o.polyline = Do, o.popup = Vo, o.rectangle = Xo, o.setOptions = x, o.stamp = _, o.svg = _n, o.svgOverlay = Uo, o.tileLayer = dn, o.tooltip = jo, o.transformation = qt, o.version = s, o.videoOverlay = Wo;
    var Qo = window.L;
    o.noConflict = function() {
      return window.L = Qo, this;
    }, window.L = o;
  });
})(li, li.exports);
var Da = li.exports;
const Et = /* @__PURE__ */ Na(Da), Ha = '.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0}.leaflet-container{overflow:hidden}.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow{-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-user-drag:none}.leaflet-tile::selection{background:transparent}.leaflet-safari .leaflet-tile{image-rendering:-webkit-optimize-contrast}.leaflet-safari .leaflet-tile-container{width:1600px;height:1600px;-webkit-transform-origin:0 0}.leaflet-marker-icon,.leaflet-marker-shadow{display:block}.leaflet-container .leaflet-overlay-pane svg{max-width:none!important;max-height:none!important}.leaflet-container .leaflet-marker-pane img,.leaflet-container .leaflet-shadow-pane img,.leaflet-container .leaflet-tile-pane img,.leaflet-container img.leaflet-image-layer,.leaflet-container .leaflet-tile{max-width:none!important;max-height:none!important;width:auto;padding:0}.leaflet-container img.leaflet-tile{mix-blend-mode:plus-lighter}.leaflet-container.leaflet-touch-zoom{-ms-touch-action:pan-x pan-y;touch-action:pan-x pan-y}.leaflet-container.leaflet-touch-drag{-ms-touch-action:pinch-zoom;touch-action:none;touch-action:pinch-zoom}.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom{-ms-touch-action:none;touch-action:none}.leaflet-container{-webkit-tap-highlight-color:transparent}.leaflet-container a{-webkit-tap-highlight-color:rgba(51,181,229,.4)}.leaflet-tile{filter:inherit;visibility:hidden}.leaflet-tile-loaded{visibility:inherit}.leaflet-zoom-box{width:0;height:0;-moz-box-sizing:border-box;box-sizing:border-box;z-index:800}.leaflet-overlay-pane svg{-moz-user-select:none}.leaflet-pane{z-index:400}.leaflet-tile-pane{z-index:200}.leaflet-overlay-pane{z-index:400}.leaflet-shadow-pane{z-index:500}.leaflet-marker-pane{z-index:600}.leaflet-tooltip-pane{z-index:650}.leaflet-popup-pane{z-index:700}.leaflet-map-pane canvas{z-index:100}.leaflet-map-pane svg{z-index:200}.leaflet-vml-shape{width:1px;height:1px}.lvml{behavior:url(#default#VML);display:inline-block;position:absolute}.leaflet-control{position:relative;z-index:800;pointer-events:visiblePainted;pointer-events:auto}.leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none}.leaflet-top{top:0}.leaflet-right{right:0}.leaflet-bottom{bottom:0}.leaflet-left{left:0}.leaflet-control{float:left;clear:both}.leaflet-right .leaflet-control{float:right}.leaflet-top .leaflet-control{margin-top:10px}.leaflet-bottom .leaflet-control{margin-bottom:10px}.leaflet-left .leaflet-control{margin-left:10px}.leaflet-right .leaflet-control{margin-right:10px}.leaflet-fade-anim .leaflet-popup{opacity:0;-webkit-transition:opacity .2s linear;-moz-transition:opacity .2s linear;transition:opacity .2s linear}.leaflet-fade-anim .leaflet-map-pane .leaflet-popup{opacity:1}.leaflet-zoom-animated{-webkit-transform-origin:0 0;-ms-transform-origin:0 0;transform-origin:0 0}svg.leaflet-zoom-animated{will-change:transform}.leaflet-zoom-anim .leaflet-zoom-animated{-webkit-transition:-webkit-transform .25s cubic-bezier(0,0,.25,1);-moz-transition:-moz-transform .25s cubic-bezier(0,0,.25,1);transition:transform .25s cubic-bezier(0,0,.25,1)}.leaflet-zoom-anim .leaflet-tile,.leaflet-pan-anim .leaflet-tile{-webkit-transition:none;-moz-transition:none;transition:none}.leaflet-zoom-anim .leaflet-zoom-hide{visibility:hidden}.leaflet-interactive{cursor:pointer}.leaflet-grab{cursor:-webkit-grab;cursor:-moz-grab;cursor:grab}.leaflet-crosshair,.leaflet-crosshair .leaflet-interactive{cursor:crosshair}.leaflet-popup-pane,.leaflet-control{cursor:auto}.leaflet-dragging .leaflet-grab,.leaflet-dragging .leaflet-grab .leaflet-interactive,.leaflet-dragging .leaflet-marker-draggable{cursor:move;cursor:-webkit-grabbing;cursor:-moz-grabbing;cursor:grabbing}.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-image-layer,.leaflet-pane>svg path,.leaflet-tile-container{pointer-events:none}.leaflet-marker-icon.leaflet-interactive,.leaflet-image-layer.leaflet-interactive,.leaflet-pane>svg path.leaflet-interactive,svg.leaflet-image-layer.leaflet-interactive path{pointer-events:visiblePainted;pointer-events:auto}.leaflet-container{background:#ddd;outline-offset:1px}.leaflet-container a{color:#0078a8}.leaflet-zoom-box{border:2px dotted #38f;background:#ffffff80}.leaflet-container{font-family:Helvetica Neue,Arial,Helvetica,sans-serif;font-size:12px;font-size:.75rem;line-height:1.5}.leaflet-bar{box-shadow:0 1px 5px #000000a6;border-radius:4px}.leaflet-bar a{background-color:#fff;border-bottom:1px solid #ccc;width:26px;height:26px;line-height:26px;display:block;text-align:center;text-decoration:none;color:#000}.leaflet-bar a,.leaflet-control-layers-toggle{background-position:50% 50%;background-repeat:no-repeat;display:block}.leaflet-bar a:hover,.leaflet-bar a:focus{background-color:#f4f4f4}.leaflet-bar a:first-child{border-top-left-radius:4px;border-top-right-radius:4px}.leaflet-bar a:last-child{border-bottom-left-radius:4px;border-bottom-right-radius:4px;border-bottom:none}.leaflet-bar a.leaflet-disabled{cursor:default;background-color:#f4f4f4;color:#bbb}.leaflet-touch .leaflet-bar a{width:30px;height:30px;line-height:30px}.leaflet-touch .leaflet-bar a:first-child{border-top-left-radius:2px;border-top-right-radius:2px}.leaflet-touch .leaflet-bar a:last-child{border-bottom-left-radius:2px;border-bottom-right-radius:2px}.leaflet-control-zoom-in,.leaflet-control-zoom-out{font:700 18px Lucida Console,Monaco,monospace;text-indent:1px}.leaflet-touch .leaflet-control-zoom-in,.leaflet-touch .leaflet-control-zoom-out{font-size:22px}.leaflet-control-layers{box-shadow:0 1px 5px #0006;background:#fff;border-radius:5px}.leaflet-control-layers-toggle{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAQAAAADQ4RFAAACf0lEQVR4AY1UM3gkARTePdvdoTxXKc+qTl3aU5U6b2Kbkz3Gtq3Zw6ziLGNPzrYx7946Tr6/ee/XeCQ4D3ykPtL5tHno4n0d/h3+xfuWHGLX81cn7r0iTNzjr7LrlxCqPtkbTQEHeqOrTy4Yyt3VCi/IOB0v7rVC7q45Q3Gr5K6jt+3Gl5nCoDD4MtO+j96Wu8atmhGqcNGHObuf8OM/x3AMx38+4Z2sPqzCxRFK2aF2e5Jol56XTLyggAMTL56XOMoS1W4pOyjUcGGQdZxU6qRh7B9Zp+PfpOFlqt0zyDZckPi1ttmIp03jX8gyJ8a/PG2yutpS/Vol7peZIbZcKBAEEheEIAgFbDkz5H6Zrkm2hVWGiXKiF4Ycw0RWKdtC16Q7qe3X4iOMxruonzegJzWaXFrU9utOSsLUmrc0YjeWYjCW4PDMADElpJSSQ0vQvA1Tm6/JlKnqFs1EGyZiFCqnRZTEJJJiKRYzVYzJck2Rm6P4iH+cmSY0YzimYa8l0EtTODFWhcMIMVqdsI2uiTvKmTisIDHJ3od5GILVhBCarCfVRmo4uTjkhrhzkiBV7SsaqS+TzrzM1qpGGUFt28pIySQHR6h7F6KSwGWm97ay+Z+ZqMcEjEWebE7wxCSQwpkhJqoZA5ivCdZDjJepuJ9IQjGGUmuXJdBFUygxVqVsxFsLMbDe8ZbDYVCGKxs+W080max1hFCarCfV+C1KATwcnvE9gRRuMP2prdbWGowm1KB1y+zwMMENkM755cJ2yPDtqhTI6ED1M/82yIDtC/4j4BijjeObflpO9I9MwXTCsSX8jWAFeHr05WoLTJ5G8IQVS/7vwR6ohirYM7f6HzYpogfS3R2OAAAAAElFTkSuQmCC);width:36px;height:36px}.leaflet-retina .leaflet-control-layers-toggle{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAQAAABvcdNgAAAEsklEQVR4AWL4TydIhpZK1kpWOlg0w3ZXP6D2soBtG42jeI6ZmQTHzAxiTbSJsYLjO9HhP+WOmcuhciVnmHVQcJnp7DFvScowZorad/+V/fVzMdMT2g9Cv9guXGv/7pYOrXh2U+RRR3dSd9JRx6bIFc/ekqHI29JC6pJ5ZEh1yWkhkbcFeSjxgx3L2m1cb1C7bceyxA+CNjT/Ifff+/kDk2u/w/33/IeCMOSaWZ4glosqT3DNnNZQ7Cs58/3Ce5HL78iZH/vKVIaYlqzfdLu8Vi7dnvUbEza5Idt36tquZFldl6N5Z/POLof0XLK61mZCmJSWjVF9tEjUluu74IUXvgttuVIHE7YxSkaYhJZam7yiM9Pv82JYfl9nptxZaxMJE4YSPty+vF0+Y2up9d3wwijfjZbabqm/3bZ9ecKHsiGmRflnn1MW4pjHf9oLufyn2z3y1D6n8g8TZhxyzipLNPnAUpsOiuWimg52psrTZYnOWYNDTMuWBWa0tJb4rgq1UvmutpaYEbZlwU3CLJm/ayYjHW5/h7xWLn9Hh1vepDkyf7dE7MtT5LR4e7yYpHrkhOUpEfssBLq2pPhAqoSWKUkk7EDqkmK6RrCEzqDjhNDWNE+XSMvkJRDWlZTmCW0l0PHQGRZY5t1L83kT0Y3l2SItk5JAWHl2dCOBm+fPu3fo5/3v61RMCO9Jx2EEYYhb0rmNQMX/vm7gqOEJLcXTGw3CAuRNeyaPWwjR8PRqKQ1PDA/dpv+on9Shox52WFnx0KY8onHayrJzm87i5h9xGw/tfkev0jGsQizqezUKjk12hBMKJ4kbCqGPVNXudyyrShovGw5CgxsRICxF6aRmSjlBnHRzg7Gx8fKqEubI2rahQYdR1YgDIRQO7JvQyD52hoIQx0mxa0ODtW2Iozn1le2iIRdzwWewedyZzewidueOGqlsn1MvcnQpuVwLGG3/IR1hIKxCjelIDZ8ldqWz25jWAsnldEnK0Zxro19TGVb2ffIZEsIO89EIEDvKMPrzmBOQcKQ+rroye6NgRRxqR4U8EAkz0CL6uSGOm6KQCdWjvjRiSP1BPalCRS5iQYiEIvxuBMJEWgzSoHADcVMuN7IuqqTeyUPq22qFimFtxDyBBJEwNyt6TM88blFHao/6tWWhuuOM4SAK4EI4QmFHA+SEyWlp4EQoJ13cYGzMu7yszEIBOm2rVmHUNqwAIQabISNMRstmdhNWcFLsSm+0tjJH1MdRxO5Nx0WDMhCtgD6OKgZeljJqJKc9po8juskR9XN0Y1lZ3mWjLR9JCO1jRDMd0fpYC2VnvjBSEFg7wBENc0R9HFlb0xvF1+TBEpF68d+DHR6IOWVv2BECtxo46hOFUBd/APU57WIoEwJhIi2CdpyZX0m93BZicktMj1AS9dClteUFAUNUIEygRZCtik5zSxI9MubTBH1GOiHsiLJ3OCoSZkILa9PxiN0EbvhsAo8tdAf9Seepd36lGWHmtNANTv5Jd0z4QYyeo/UEJqxKRpg5LZx6btLPsOaEmdMyxYdlc8LMaJnikDlhclqmPiQnTEpLUIZEwkRagjYkEibQErwhkTAKCLQEbUgkzJQWc/0PstHHcfEdQ+UAAAAASUVORK5CYII=);background-size:26px 26px}.leaflet-touch .leaflet-control-layers-toggle{width:44px;height:44px}.leaflet-control-layers .leaflet-control-layers-list,.leaflet-control-layers-expanded .leaflet-control-layers-toggle{display:none}.leaflet-control-layers-expanded .leaflet-control-layers-list{display:block;position:relative}.leaflet-control-layers-expanded{padding:6px 10px 6px 6px;color:#333;background:#fff}.leaflet-control-layers-scrollbar{overflow-y:scroll;overflow-x:hidden;padding-right:5px}.leaflet-control-layers-selector{margin-top:2px;position:relative;top:1px}.leaflet-control-layers label{display:block;font-size:13px;font-size:1.08333em}.leaflet-control-layers-separator{height:0;border-top:1px solid #ddd;margin:5px -10px 5px -6px}.leaflet-default-icon-path{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=)}.leaflet-container .leaflet-control-attribution{background:#fff;background:#fffc;margin:0}.leaflet-control-attribution,.leaflet-control-scale-line{padding:0 5px;color:#333;line-height:1.4}.leaflet-control-attribution a{text-decoration:none}.leaflet-control-attribution a:hover,.leaflet-control-attribution a:focus{text-decoration:underline}.leaflet-attribution-flag{display:inline!important;vertical-align:baseline!important;width:1em;height:.6669em}.leaflet-left .leaflet-control-scale{margin-left:5px}.leaflet-bottom .leaflet-control-scale{margin-bottom:5px}.leaflet-control-scale-line{border:2px solid #777;border-top:none;line-height:1.1;padding:2px 5px 1px;white-space:nowrap;-moz-box-sizing:border-box;box-sizing:border-box;background:#fffc;text-shadow:1px 1px #fff}.leaflet-control-scale-line:not(:first-child){border-top:2px solid #777;border-bottom:none;margin-top:-2px}.leaflet-control-scale-line:not(:first-child):not(:last-child){border-bottom:2px solid #777}.leaflet-touch .leaflet-control-attribution,.leaflet-touch .leaflet-control-layers,.leaflet-touch .leaflet-bar{box-shadow:none}.leaflet-touch .leaflet-control-layers,.leaflet-touch .leaflet-bar{border:2px solid rgba(0,0,0,.2);background-clip:padding-box}.leaflet-popup{position:absolute;text-align:center;margin-bottom:20px}.leaflet-popup-content-wrapper{padding:1px;text-align:left;border-radius:12px}.leaflet-popup-content{margin:13px 24px 13px 20px;line-height:1.3;font-size:13px;font-size:1.08333em;min-height:1px}.leaflet-popup-content p{margin:1.3em 0}.leaflet-popup-tip-container{width:40px;height:20px;position:absolute;left:50%;margin-top:-1px;margin-left:-20px;overflow:hidden;pointer-events:none}.leaflet-popup-tip{width:17px;height:17px;padding:1px;margin:-10px auto 0;pointer-events:auto;-webkit-transform:rotate(45deg);-moz-transform:rotate(45deg);-ms-transform:rotate(45deg);transform:rotate(45deg)}.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#fff;color:#333;box-shadow:0 3px 14px #0006}.leaflet-container a.leaflet-popup-close-button{position:absolute;top:0;right:0;border:none;text-align:center;width:24px;height:24px;font:16px/24px Tahoma,Verdana,sans-serif;color:#757575;text-decoration:none;background:transparent}.leaflet-container a.leaflet-popup-close-button:hover,.leaflet-container a.leaflet-popup-close-button:focus{color:#585858}.leaflet-popup-scrolled{overflow:auto}.leaflet-oldie .leaflet-popup-content-wrapper{-ms-zoom:1}.leaflet-oldie .leaflet-popup-tip{width:24px;margin:0 auto;-ms-filter:"progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)";filter:progid:DXImageTransform.Microsoft.Matrix(M11=.70710678,M12=.70710678,M21=-.70710678,M22=.70710678)}.leaflet-oldie .leaflet-control-zoom,.leaflet-oldie .leaflet-control-layers,.leaflet-oldie .leaflet-popup-content-wrapper,.leaflet-oldie .leaflet-popup-tip{border:1px solid #999}.leaflet-div-icon{background:#fff;border:1px solid #666}.leaflet-tooltip{position:absolute;padding:6px;background-color:#fff;border:1px solid #fff;border-radius:3px;color:#222;white-space:nowrap;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none;box-shadow:0 1px 3px #0006}.leaflet-tooltip.leaflet-interactive{cursor:pointer;pointer-events:auto}.leaflet-tooltip-top:before,.leaflet-tooltip-bottom:before,.leaflet-tooltip-left:before,.leaflet-tooltip-right:before{position:absolute;pointer-events:none;border:6px solid transparent;background:transparent;content:""}.leaflet-tooltip-bottom{margin-top:6px}.leaflet-tooltip-top{margin-top:-6px}.leaflet-tooltip-bottom:before,.leaflet-tooltip-top:before{left:50%;margin-left:-6px}.leaflet-tooltip-top:before{bottom:0;margin-bottom:-12px;border-top-color:#fff}.leaflet-tooltip-bottom:before{top:0;margin-top:-12px;margin-left:-6px;border-bottom-color:#fff}.leaflet-tooltip-left{margin-left:-6px}.leaflet-tooltip-right{margin-left:6px}.leaflet-tooltip-left:before,.leaflet-tooltip-right:before{top:50%;margin-top:-6px}.leaflet-tooltip-left:before{right:0;margin-right:-12px;border-left-color:#fff}.leaflet-tooltip-right:before{left:0;margin-left:-12px;border-right-color:#fff}@media print{.leaflet-control{-webkit-print-color-adjust:exact;print-color-adjust:exact}}', Fa = ":host{display:block;width:100%;height:400px;position:relative;border-radius:var(--border-radius-md, 8px);overflow:hidden;box-shadow:var(--shadow-sm, 0 1px 3px rgba(0,0,0,.1))}.ui-mapa-container{width:100%;height:100%;z-index:1}.leaflet-pane{z-index:400}.leaflet-top,.leaflet-bottom{z-index:1000}", ie = {
  osm: {
    nome: "OpenStreetMap",
    layer: () => Et.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    })
  },
  satelite: {
    nome: "Satélite (Esri)",
    layer: () => Et.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
    })
  },
  topografia: {
    nome: "Topografia",
    layer: () => Et.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    })
  },
  ruas: {
    nome: "Ruas (Esri)",
    layer: () => Et.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012"
    })
  }
};
class qa extends HTMLElement {
  constructor() {
    super();
    f(this, "mapContainer");
    f(this, "mapInstance", null);
    const o = this.attachShadow({ mode: "open" });
    o.innerHTML = `
      <style>
        ${Ha}
        ${Fa}
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
    const o = parseFloat(this.getAttribute("lat") || "-23.550520"), s = parseFloat(this.getAttribute("lng") || "-46.633308"), h = parseInt(this.getAttribute("zoom") || "13", 10);
    this.mapInstance = Et.map(this.mapContainer).setView([o, s], h);
    const p = this.getAttribute("camadas");
    let c = ["osm"];
    p && (c = p.split(",").map((_) => _.trim().toLowerCase()).filter((_) => ie[_]), c.length === 0 && (c = ["osm"]));
    const v = ie[c[0]].layer();
    if (v.addTo(this.mapInstance), c.length > 1) {
      const _ = {};
      _[ie[c[0]].nome] = v;
      for (let T = 1; T < c.length; T++) {
        const O = c[T];
        _[ie[O].nome] = ie[O].layer();
      }
      Et.control.layers(_, void 0, { position: "topright" }).addTo(this.mapInstance);
    }
    Et.Icon.Default.imagePath = "https://unpkg.com/leaflet@1.9.4/dist/images/", setTimeout(() => {
      this.mapInstance && this.mapInstance.invalidateSize();
    }, 100);
  }
  getMap() {
    return this.mapInstance;
  }
}
customElements.get("ui-mapa") || customElements.define("ui-mapa", qa);
class Wa extends HTMLElement {
  constructor() {
    super(...arguments);
    f(this, "marker", null);
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
  attributeChangedCallback(o, s, h) {
    if (s !== h && this.marker) {
      if (o === "lat" || o === "lng") {
        const p = parseFloat(this.getAttribute("lat") || "0"), c = parseFloat(this.getAttribute("lng") || "0");
        this.marker.setLatLng([p, c]);
      }
      o === "titulo" && (this.marker.unbindPopup(), h && this.marker.bindPopup(h));
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
    const h = parseFloat(this.getAttribute("lat") || "0"), p = parseFloat(this.getAttribute("lng") || "0"), c = this.getAttribute("titulo");
    this.marker = Et.marker([h, p]), c && this.marker.bindPopup(c), this.marker.addTo(s);
  }
}
customElements.get("ui-mapa-marcador") || customElements.define("ui-mapa-marcador", Wa);
class Ua extends HTMLElement {
  constructor() {
    super(...arguments);
    f(this, "polyline", null);
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
  attributeChangedCallback(o, s, h) {
    s !== h && this.polyline && (o === "pontos" ? this.polyline.setLatLngs(this.getPontos()) : (o === "cor" || o === "espessura") && this.polyline.setStyle({
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
    const h = this.getAttribute("cor") || "#3388ff", p = parseInt(this.getAttribute("espessura") || "3", 10);
    this.polyline = Et.polyline(this.getPontos(), {
      color: h,
      weight: p
    }), this.polyline.addTo(s);
  }
}
customElements.get("ui-mapa-linha") || customElements.define("ui-mapa-linha", Ua);
export {
  In as UIAlerta,
  Ca as UIAvatar,
  ci as UIBadge,
  zn as UIBotao,
  ca as UIBotaoPrimario,
  Sn as UICampoTexto,
  Ta as UICard,
  Mn as UICheckbox,
  ka as UIChip,
  Sa as UIDialog,
  va as UIIcone,
  hi as UIListaFlutuante,
  qa as UIMapa,
  Ua as UIMapaLinha,
  Wa as UIMapaMarcador,
  Ee as UIModal,
  Oa as UIPopover,
  si as UIRadio,
  fa as UISelect,
  ui as UISwitch,
  Za as UITabela,
  La as UITag,
  ma as UITexto,
  di as UIToast,
  wa as UIToggle,
  On as UITooltip
};
