var qt = Object.defineProperty;
var Nt = (n, i, t) => i in n ? qt(n, i, { enumerable: !0, configurable: !0, writable: !0, value: t }) : n[i] = t;
var c = (n, i, t) => Nt(n, typeof i != "symbol" ? i + "" : i, t);
import y from "leaflet";
const Bt = ':host{display:inline-block;width:100%;box-sizing:border-box}:host([inline]){width:auto;height:auto}.ui-botao-primario{display:inline-flex;align-items:center;justify-content:center;gap:var(--ui-espaco-sm, 6px);width:100%;height:var(--ui-campo-altura, 100%);min-height:var(--ui-campo-altura, var(--ui-altura-minima, 15px));box-sizing:border-box;padding:0 12px;border:1px solid transparent;border-radius:var(--ui-raio-borda, 6px);font-family:var(--ui-fonte-base, "Inter", sans-serif);font-size:clamp(11px,.85rem,13px);font-weight:600;line-height:1;transition:background-color .15s cubic-bezier(.16,1,.3,1),border-color .15s cubic-bezier(.16,1,.3,1),color .15s cubic-bezier(.16,1,.3,1),filter .15s cubic-bezier(.16,1,.3,1),transform .12s cubic-bezier(.34,1.56,.64,1),box-shadow .15s ease;text-align:center;-webkit-user-select:none;user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent}.ui-botao-primario:focus-visible{outline:none;box-shadow:0 0 0 2px var(--ui-cor-fundo, #0b0b0d),0 0 0 4px var(--ui-cor-primaria, #00E08A)}.ui-botao-primario--has-icon-start{padding-left:8px!important;padding-right:12px!important}.ui-botao-primario--has-icon-end{padding-left:12px!important;padding-right:8px!important}::slotted(svg),::slotted(ui-icone){display:inline-flex!important;align-items:center!important;justify-content:center!important;vertical-align:middle!important;flex-shrink:0!important;line-height:1!important;width:14px!important;height:14px!important;box-sizing:content-box;shape-rendering:geometricPrecision}::slotted(span),::slotted(label),::slotted(p){display:inline-flex;align-items:center;line-height:1}::slotted(div){display:inline-flex;align-items:center;justify-content:center;line-height:1;height:100%}.ui-botao-primario,.ui-botao-primario--primary,.ui-botao-primario--primario{background:var(--ui-cor-primaria, #00E08A);color:var(--ui-cor-texto-sobre-primaria, #000000);border-color:transparent}.ui-botao-primario--primary:hover:not(:disabled),.ui-botao-primario--primario:hover:not(:disabled),.ui-botao-primario:hover:not(:disabled){filter:brightness(1.1)}.ui-botao-primario--destaque{background:var(--ui-cor-destaque, var(--ui-cor-primaria, #00E08A));color:var(--ui-cor-texto-sobre-primaria, #000000)}.ui-botao-primario--secondary,.ui-botao-primario--secundario{background:var(--ui-cor-botao-secundario-fundo, #1e1e24);color:var(--ui-cor-texto, #e1e1e6);border-color:var(--ui-cor-borda, rgba(255, 255, 255, .12))}.ui-botao-primario--secondary:hover:not(:disabled),.ui-botao-primario--secundario:hover:not(:disabled){background:var(--ui-cor-botao-secundario-hover, #2a2a34);border-color:#ffffff3d}.ui-botao-primario--ghost,.ui-botao-primario--terciario{background:transparent;color:var(--ui-cor-texto, #e1e1e6);border-color:transparent}.ui-botao-primario--ghost:hover:not(:disabled),.ui-botao-primario--terciario:hover:not(:disabled){background:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-botao-primario--destructive,.ui-botao-primario--destrutivo,.ui-botao-primario--erro{background:var(--ui-cor-botao-destrutivo-fundo, #ff4444);color:var(--ui-cor-botao-destrutivo-texto, #ffffff);border-color:transparent}.ui-botao-primario--destructive:hover:not(:disabled),.ui-botao-primario--destrutivo:hover:not(:disabled),.ui-botao-primario--erro:hover:not(:disabled){background:var(--ui-cor-botao-destrutivo-hover, #e03333)}.ui-botao-primario--outline,.ui-botao-primario--borda{background:transparent;color:var(--ui-cor-primaria, #00E08A);border-color:var(--ui-cor-primaria, #00E08A)}.ui-botao-primario--outline:hover:not(:disabled),.ui-botao-primario--borda:hover:not(:disabled){background:#00e08a1f;border-color:var(--ui-cor-primaria, #00E08A);filter:brightness(1.08)}.ui-botao-primario--icon-only,.ui-botao-primario--icone{padding:0;width:var(--ui-campo-altura, var(--ui-altura-minima, 15px));min-width:var(--ui-campo-altura, var(--ui-altura-minima, 15px));height:var(--ui-campo-altura, var(--ui-altura-minima, 15px));aspect-ratio:1;border-radius:var(--ui-raio-borda, 6px)}.ui-botao-primario--hover{filter:brightness(1.15)!important}.ui-botao-primario:active:not(:disabled),.ui-botao-primario--active{transform:scale(.97)!important;filter:brightness(.9)!important}.ui-botao-primario:disabled,.ui-botao-primario--disabled{opacity:.45;cursor:not-allowed;transform:none!important;filter:none!important}.ui-botao-primario--carregando,.ui-botao-primario--loading{cursor:wait;opacity:.85;pointer-events:none}.ui-botao-primario__spinner{width:14px;height:14px;animation:ui-spin .75s linear infinite;flex-shrink:0;shape-rendering:geometricPrecision}@keyframes ui-spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}@media (max-width: 640px){:host(:not([inline])) .ui-botao-primario{min-height:max(var(--ui-campo-altura, 38px),38px);font-size:14px;padding:0 14px}}';
class F {
  constructor() {
    c(this, "entries", []);
  }
  /**
   * Adiciona um ouvinte de evento e rastreia sua referência para limpeza futura.
   * Suporta handlers tipados (MouseEvent, KeyboardEvent, CustomEvent, etc.).
   */
  add(i, t, e, o) {
    if (!i) return;
    const a = e;
    i.addEventListener(t, a, o), this.entries.push({ target: i, type: t, listener: a, options: o });
  }
  /**
   * Remove todos os ouvintes de eventos atualmente registrados e esvazia a coleção.
   */
  cleanup() {
    this.entries.forEach(({ target: i, type: t, listener: e, options: o }) => {
      i.removeEventListener(t, e, o);
    }), this.entries = [];
  }
  /**
   * Retorna a quantidade de ouvintes ativos rastreados.
   */
  get size() {
    return this.entries.length;
  }
}
class wt extends HTMLElement {
  constructor() {
    super();
    c(this, "button");
    c(this, "spinnerContainer");
    c(this, "slotElement");
    c(this, "opticalState", null);
    c(this, "listeners", new F());
    c(this, "handleSlotChange", () => {
      this.sanitizeAndBalanceContent(), this.syncState();
    });
    c(this, "handleClick", (t) => {
      if (this.hasAttribute("disabled") || this.carregando) {
        t.preventDefault(), t.stopPropagation();
        return;
      }
      this.dispatchEvent(new CustomEvent("ui-click", { detail: { originalEvent: t }, bubbles: !0, composed: !0 }));
      const e = this.closest("form");
      if (e) {
        if (this.hasAttribute("tipo-reset") || this.getAttribute("type") === "reset")
          e.reset();
        else if (this.hasAttribute("tipo-submit") || this.getAttribute("type") === "submit")
          try {
            e.requestSubmit(this.button);
          } catch {
            e.requestSubmit();
          }
      }
    });
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${Bt}</style>
      <button class="ui-botao-primario" type="button">
        <span class="ui-botao-primario__spinner-container" style="display: none;">
          <svg class="ui-botao-primario__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2 a 10 10 0 0 1 10 10"></path>
          </svg>
        </span>
        <slot></slot>
      </button>
    `, this.button = t.querySelector("button"), this.spinnerContainer = t.querySelector(".ui-botao-primario__spinner-container"), this.slotElement = t.querySelector("slot");
  }
  static get observedAttributes() {
    return ["disabled", "variante", "carregando", "loading", "estado", "tamanho", "size", "altura", "height", "densidade"];
  }
  connectedCallback() {
    this.listeners.cleanup(), this.listeners.add(this.button, "click", this.handleClick), this.listeners.add(this.slotElement, "slotchange", this.handleSlotChange), this.sanitizeAndBalanceContent(), this.syncState();
  }
  disconnectedCallback() {
    this.listeners.cleanup();
  }
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  get carregando() {
    return this.hasAttribute("carregando") || this.hasAttribute("loading");
  }
  set carregando(t) {
    t ? this.setAttribute("carregando", "") : (this.removeAttribute("carregando"), this.removeAttribute("loading"));
  }
  /**
   * Remove espaços e quebras de linha fantasmas no slot e identifica
   * se há ícone no início ou fim para aplicar compensação óptica de padding.
   */
  sanitizeAndBalanceContent() {
    const t = (a) => {
      if (a.nodeType !== Node.ELEMENT_NODE) return !1;
      const r = a, s = r.tagName.toLowerCase();
      if (s === "ui-icone" || s === "svg" || s === "i" || r.hasAttribute("data-icon") || r.classList.contains("icon") || r.classList.contains("icone")) return !0;
      const l = typeof r.className == "string" ? r.className : "";
      return !!/\b(fa[srlb]?|fa-[\w-]+|lucide|tabler)\b/i.test(l);
    }, e = this.slotElement ? this.slotElement.assignedNodes() : Array.from(this.childNodes), o = [];
    for (let a = 0; a < e.length; a++) {
      const r = e[a];
      if (r.nodeType === Node.TEXT_NODE) {
        const s = r.textContent || "";
        if (!s.trim())
          e.length > 1 && (r.textContent = "");
        else {
          const l = e[a - 1];
          l && t(l) && (r.textContent = s.replace(/^\s+/, ""));
          const h = e[a + 1];
          h && t(h) && (r.textContent = (r.textContent || "").replace(/\s+$/, "")), (r.textContent || "").trim().length > 0 && o.push(r);
        }
      } else r.nodeType === Node.ELEMENT_NODE && o.push(r);
    }
    if (o.length >= 2)
      t(o[0]) ? this.opticalState = "icon-start" : t(o[o.length - 1]) ? this.opticalState = "icon-end" : this.opticalState = null;
    else if (o.length === 1) {
      const a = o[0];
      if (t(a))
        this.opticalState = "icon-only";
      else if (a.nodeType === Node.ELEMENT_NODE) {
        const r = a;
        r.children.length >= 2 ? t(r.firstElementChild) ? this.opticalState = "icon-start" : t(r.lastElementChild) ? this.opticalState = "icon-end" : this.opticalState = null : r.children.length === 1 && t(r.firstElementChild) ? this.opticalState = "icon-only" : this.opticalState = null;
      } else
        this.opticalState = null;
    } else
      this.opticalState = null;
  }
  syncState() {
    const t = this.getAttribute("altura") || this.getAttribute("height");
    t ? this.style.setProperty("--ui-campo-altura", isNaN(Number(t)) ? t : `${t}px`) : this.style.removeProperty("--ui-campo-altura");
    const e = this.carregando, o = this.hasAttribute("disabled") || e, a = this.getAttribute("variante") || "primario", r = this.getAttribute("estado");
    this.button.disabled = o, this.spinnerContainer.style.display = e ? "inline-flex" : "none";
    const s = ["ui-botao-primario", `ui-botao-primario--${a}`];
    o && !e && s.push("ui-botao-primario--disabled"), e && s.push("ui-botao-primario--carregando"), r && s.push(`ui-botao-primario--${r}`), this.opticalState === "icon-start" ? s.push("ui-botao-primario--has-icon-start") : this.opticalState === "icon-end" && s.push("ui-botao-primario--has-icon-end"), (this.opticalState === "icon-only" || a === "icon-only" || a === "icone") && s.push("ui-botao-primario--icon-only"), this.button.className = s.join(" ");
  }
}
class $t extends wt {
}
customElements.get("ui-botao") || customElements.define("ui-botao", wt);
customElements.get("ui-botao-primario") || customElements.define("ui-botao-primario", $t);
class Rt {
  constructor(i, t, e) {
    c(this, "scrollHandler");
    c(this, "resizeHandler");
    c(this, "posicionar", () => {
      if (this.isMobileOrBottomSheet()) {
        this.content.style.top = "", this.content.style.left = "", this.content.style.minWidth = "";
        return;
      }
      const i = this.button.getBoundingClientRect();
      this.content.style.top = `${Math.round(i.bottom + 2)}px`, this.content.style.left = `${Math.round(i.left)}px`, this.content.style.minWidth = `${Math.round(Math.max(i.width, 120))}px`;
    });
    this.host = i, this.button = t, this.content = e;
  }
  isMobileOrBottomSheet() {
    return typeof window > "u" ? !1 : window.innerWidth <= 640 || this.host.hasAttribute("bottom-sheet") || this.host.hasAttribute("modo-mobile");
  }
  ativarAcompanhamento(i) {
    if (this.scrollHandler = i, this.resizeHandler = this.posicionar, window.addEventListener("scroll", this.scrollHandler, { capture: !0, passive: !0 }), window.addEventListener("resize", this.resizeHandler, { passive: !0 }), typeof this.content.showPopover == "function")
      try {
        this.content.showPopover();
      } catch {
      }
  }
  desativarAcompanhamento() {
    if (this.scrollHandler && (window.removeEventListener("scroll", this.scrollHandler, { capture: !0 }), this.scrollHandler = void 0), this.resizeHandler && (window.removeEventListener("resize", this.resizeHandler), this.resizeHandler = void 0), typeof this.content.hidePopover == "function")
      try {
        this.content.hidePopover();
      } catch {
      }
  }
}
class Ht {
  constructor(i) {
    c(this, "focusedIndex", -1);
    this.listElement = i;
  }
  focarPrimeiroItem() {
    const i = Array.from(this.listElement.querySelectorAll(".ui-lista-flutuante__item"));
    i.length > 0 && (this.focusedIndex = 0, i[0].focus());
  }
  resetarFoco() {
    this.focusedIndex = -1;
  }
  moverFoco(i) {
    const t = Array.from(this.listElement.querySelectorAll(".ui-lista-flutuante__item"));
    t.length !== 0 && (this.focusedIndex += i, this.focusedIndex < 0 && (this.focusedIndex = t.length - 1), this.focusedIndex >= t.length && (this.focusedIndex = 0), t[this.focusedIndex].focus());
  }
  tratarKeydownLista(i, t, e, o, a) {
    i.key === "ArrowDown" ? (i.preventDefault(), this.moverFoco(1)) : i.key === "ArrowUp" ? (i.preventDefault(), this.moverFoco(-1)) : i.key === "Enter" || i.key === " " ? (i.preventDefault(), this.focusedIndex >= 0 && this.focusedIndex < t.length && e(t[this.focusedIndex])) : i.key === "Escape" && (i.preventDefault(), o(), a.focus());
  }
}
const Ot = ':host{display:inline-block;position:relative;width:100%;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}:host([inline]){width:auto}.ui-lista-flutuante__container{display:flex;flex-direction:column;width:100%;position:relative}.ui-lista-flutuante__label{font-family:var(--ui-fonte-base, "Inter", sans-serif);font-size:var(--ui-tamanho-corpo-sm, 13px);font-weight:var(--ui-peso-medio, 500);color:var(--ui-cor-texto, #e1e1e6);margin-bottom:4px;-webkit-user-select:none;user-select:none;flex-shrink:0}.ui-lista-flutuante__gatilho{display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;height:var(--ui-campo-altura, 100%);min-height:var(--ui-campo-altura, var(--ui-altura-minima, 15px));padding:0 8px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 6px);font-family:var(--ui-fonte-base, "Inter", sans-serif);font-size:clamp(11px,.85rem,13px);line-height:1;cursor:pointer;box-sizing:border-box;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:border-color .15s ease,background-color .15s ease}.ui-lista-flutuante__gatilho:hover:not(:disabled){border-color:var(--ui-cor-primaria, #00E08A)}.ui-lista-flutuante__gatilho:disabled{opacity:.5;cursor:not-allowed}.ui-lista-flutuante__texto{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left}.ui-lista-flutuante__seta{font-size:10px;line-height:1;display:inline-flex;align-items:center;justify-content:center;transition:transform .2s ease;color:var(--ui-cor-texto-secundario, #888899);flex-shrink:0;shape-rendering:geometricPrecision}:host([aberta]) .ui-lista-flutuante__seta{transform:rotate(180deg)}.ui-lista-flutuante__backdrop{display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:transparent;-webkit-backdrop-filter:none;backdrop-filter:none;z-index:9998}:host([aberta]) .ui-lista-flutuante__backdrop{display:block}:host(:not([aberta])) .ui-lista-flutuante__conteudo{display:none!important}:host([aberta]) .ui-lista-flutuante__conteudo{display:block}.ui-lista-flutuante__conteudo{position:fixed;margin:0;padding:4px;list-style:none;background-color:var(--ui-cor-fundo-menu, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .14));border-radius:var(--ui-raio-borda, 6px);box-shadow:0 8px 28px #0000008c;max-height:220px;overflow-y:auto;z-index:9999;box-sizing:border-box;inset:auto}.ui-lista-flutuante__sheet-header{display:none;width:100%;margin-bottom:8px}.ui-lista-flutuante__handle{width:36px;height:4px;border-radius:2px;background-color:#ffffff40;margin:2px auto 8px}.ui-lista-flutuante__sheet-title-bar{display:flex;align-items:center;justify-content:space-between;width:100%;padding:4px 6px 8px;border-bottom:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .08));margin-bottom:6px}.ui-lista-flutuante__sheet-titulo{font-size:13px;font-weight:600;color:var(--ui-cor-primaria, #00E08A);letter-spacing:.3px;text-transform:uppercase}.ui-lista-flutuante__sheet-close{background:transparent;border:none;color:var(--ui-cor-texto-secundario, #888899);font-size:14px;cursor:pointer;padding:4px 8px;border-radius:4px;display:flex;align-items:center;justify-content:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:color .15s,background-color .15s}.ui-lista-flutuante__sheet-close:hover{color:#fff;background-color:#ffffff14}.ui-lista-flutuante__item{padding:6px 10px;font-family:var(--ui-fonte-base, "Inter", sans-serif);font-size:12px;line-height:1.2;color:var(--ui-cor-texto, #e1e1e6);border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:background-color .12s ease,color .12s ease;-webkit-user-select:none;user-select:none}.ui-lista-flutuante__item:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-lista-flutuante__item--selecionado{background-color:#00e08a26;color:var(--ui-cor-primaria, #00E08A);font-weight:600}.ui-lista-flutuante__item--selecionado:after{content:"✓";font-size:11px;color:var(--ui-cor-primaria, #00E08A)}@media (max-width: 640px){.ui-lista-flutuante__gatilho{min-height:max(var(--ui-campo-altura, 38px),38px);font-size:15px}:host([aberta]) .ui-lista-flutuante__backdrop{background-color:#00000059;-webkit-backdrop-filter:none;backdrop-filter:none}.ui-lista-flutuante__conteudo{position:fixed!important;bottom:0!important;top:auto!important;left:0!important;width:100vw!important;max-width:100vw!important;min-width:100vw!important;max-height:70vh!important;max-height:70dvh!important;border-radius:16px 16px 0 0!important;border-bottom:none!important;padding:10px 16px calc(24px + env(safe-area-inset-bottom,0px)) 16px!important;box-shadow:0 -8px 32px #000000b3!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;animation:ui-bottom-sheet-slide .22s cubic-bezier(.4,0,.2,1)}.ui-lista-flutuante__sheet-header{display:flex!important;flex-direction:column!important}.ui-lista-flutuante__sheet-close{min-width:44px;min-height:44px;font-size:18px}.ui-lista-flutuante__item{padding:12px 14px!important;font-size:15px!important;margin-bottom:3px}}:host([bottom-sheet][aberta]) .ui-lista-flutuante__backdrop,:host([modo-mobile][aberta]) .ui-lista-flutuante__backdrop{background-color:#00000059;-webkit-backdrop-filter:none;backdrop-filter:none}:host([bottom-sheet]) .ui-lista-flutuante__conteudo,:host([modo-mobile]) .ui-lista-flutuante__conteudo{position:fixed!important;bottom:0!important;top:auto!important;left:0!important;width:100vw!important;max-width:100vw!important;min-width:100vw!important;max-height:70vh!important;max-height:70dvh!important;border-radius:16px 16px 0 0!important;border-bottom:none!important;padding:10px 16px calc(24px + env(safe-area-inset-bottom,0px)) 16px!important;box-shadow:0 -8px 32px #000000b3!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;animation:ui-bottom-sheet-slide .22s cubic-bezier(.4,0,.2,1)}:host([bottom-sheet]) .ui-lista-flutuante__sheet-header,:host([modo-mobile]) .ui-lista-flutuante__sheet-header{display:flex!important;flex-direction:column!important}:host([bottom-sheet]) .ui-lista-flutuante__sheet-close,:host([modo-mobile]) .ui-lista-flutuante__sheet-close{min-width:44px;min-height:44px;font-size:18px}:host([bottom-sheet]) .ui-lista-flutuante__item,:host([modo-mobile]) .ui-lista-flutuante__item{padding:12px 14px!important;font-size:15px!important;margin-bottom:3px}@keyframes ui-bottom-sheet-slide{0%{transform:translateY(100%)}to{transform:translateY(0)}}', Dt = [
  "aberta",
  "texto-padrao",
  "value",
  "disabled",
  "bottom-sheet",
  "modo-mobile",
  "label",
  "rotulo",
  "placeholder",
  "tamanho",
  "size",
  "altura",
  "height",
  "densidade"
];
function Ft() {
  return `
    <style>${Ot}</style>
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
}
function mt(n, i, t) {
  n.innerHTML = "", i.forEach((e) => {
    const o = document.createElement("li"), a = String(e.id) === String(t);
    o.className = `ui-lista-flutuante__item ${a ? "ui-lista-flutuante__item--selecionado" : ""}`, o.setAttribute("data-id", e.id), o.textContent = e.label, o.role = "option", o.tabIndex = -1, a && o.setAttribute("aria-selected", "true"), n.appendChild(o);
  });
}
function Vt(n, i) {
  n.querySelectorAll(".ui-lista-flutuante__item").forEach((e) => {
    e.getAttribute("data-id") === String(i) ? (e.classList.add("ui-lista-flutuante__item--selecionado"), e.setAttribute("aria-selected", "true")) : (e.classList.remove("ui-lista-flutuante__item--selecionado"), e.removeAttribute("aria-selected"));
  });
}
class ct extends HTMLElement {
  constructor() {
    super();
    c(this, "internals");
    c(this, "labelElement");
    c(this, "button");
    c(this, "content");
    c(this, "listElement");
    c(this, "textoElement");
    c(this, "backdropElement");
    c(this, "sheetTituloElement");
    c(this, "sheetCloseButton");
    c(this, "listeners", new F());
    c(this, "_itens", []);
    c(this, "_value", "");
    c(this, "_defaultValue", "");
    c(this, "observer");
    c(this, "posicionamento");
    c(this, "teclado");
    c(this, "toggleLista", (t) => {
      t.stopPropagation(), !this.hasAttribute("disabled") && (this.hasAttribute("aberta") ? this.fechar() : this.abrir());
    });
    c(this, "handleKeyDown", (t) => {
      this.hasAttribute("disabled") || (t.key === "Enter" || t.key === " " || t.key === "ArrowDown") && (t.preventDefault(), this.hasAttribute("aberta") ? this.teclado.focarPrimeiroItem() : this.abrir());
    });
    c(this, "handleListKeyDown", (t) => {
      this.hasAttribute("aberta") && this.teclado.tratarKeydownLista(
        t,
        this._itens,
        (e) => this.selecionarItem(e),
        this.fechar,
        this.button
      );
    });
    c(this, "fechar", () => {
      this.hasAttribute("aberta") && (this.removeAttribute("aberta"), this.posicionamento.desativarAcompanhamento(), this.teclado.resetarFoco());
    });
    c(this, "handleClickFora", (t) => {
      if (!this.hasAttribute("aberta")) return;
      const e = t.composedPath();
      !e.includes(this) && !e.includes(this.content) && this.fechar();
    });
    c(this, "handleListClick", (t) => {
      var r;
      t.stopPropagation();
      const e = (r = t.target) == null ? void 0 : r.closest("li[data-id]");
      if (!e) return;
      const o = e.getAttribute("data-id"), a = this._itens.find((s) => String(s.id) === String(o));
      a && this.selecionarItem(a);
    });
    this.internals = this.attachInternals();
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = Ft(), this.labelElement = t.querySelector(".ui-lista-flutuante__label"), this.button = t.querySelector(".ui-lista-flutuante__gatilho"), this.content = t.querySelector(".ui-lista-flutuante__conteudo"), this.listElement = t.querySelector(".ui-lista-flutuante__lista"), this.textoElement = t.querySelector(".ui-lista-flutuante__texto"), this.backdropElement = t.querySelector(".ui-lista-flutuante__backdrop"), this.sheetTituloElement = t.querySelector(".ui-lista-flutuante__sheet-titulo"), this.sheetCloseButton = t.querySelector(".ui-lista-flutuante__sheet-close"), this.posicionamento = new Rt(this, this.button, this.content), this.teclado = new Ht(this.listElement);
  }
  static get observedAttributes() {
    return Dt;
  }
  connectedCallback() {
    this.listeners.cleanup(), this.listeners.add(this.button, "click", this.toggleLista), this.listeners.add(this.button, "keydown", this.handleKeyDown), this.listeners.add(this.content, "keydown", this.handleListKeyDown), this.listeners.add(this.backdropElement, "click", this.fechar), this.listeners.add(this.listElement, "click", this.handleListClick), this.listeners.add(this.sheetCloseButton, "click", (t) => {
      t.stopPropagation(), this.fechar();
    }), this.listeners.add(document, "click", this.handleClickFora), this._defaultValue = this.getAttribute("value") || "", this.carregarItensFilhos(), this.syncState(), this.observer = new MutationObserver(() => this.carregarItensFilhos()), this.observer.observe(this, { childList: !0, subtree: !0 });
  }
  carregarItensFilhos() {
    const t = Array.from(this.querySelectorAll('option, ui-opcao, [role="option"], [data-opcao], [data-value]:not(input):not(select)'));
    t.length > 0 && (this._itens = t.map((e, o) => {
      var r;
      const a = e.getAttribute("value") || e.getAttribute("data-value") || String(o + 1);
      return {
        id: a,
        label: ((r = e.textContent) == null ? void 0 : r.trim()) || a || `Opção ${o + 1}`
      };
    }), mt(this.listElement, this._itens, this._value), this.syncLabel());
  }
  disconnectedCallback() {
    this.listeners.cleanup(), this.observer && this.observer.disconnect(), this.fechar();
  }
  attributeChangedCallback(t, e, o) {
    t === "aberta" && this.button.setAttribute("aria-expanded", String(o !== null)), (t === "texto-padrao" || t === "placeholder" || t === "label" || t === "rotulo") && this.syncLabel(), t === "value" && o !== this._value && (this.value = o || ""), t === "disabled" && (this.button.disabled = o !== null), (t === "altura" || t === "height") && (o ? this.style.setProperty("--ui-campo-altura", isNaN(Number(o)) ? o : `${o}px`) : this.style.removeProperty("--ui-campo-altura"));
  }
  get value() {
    return this._value;
  }
  set value(t) {
    this._value = t, this.setAttribute("value", t), this.internals.setFormValue(t), this.syncLabel(), Vt(this.listElement, this._value);
  }
  get label() {
    return this.getAttribute("label") || this.getAttribute("rotulo") || "";
  }
  set label(t) {
    t ? this.setAttribute("label", t) : (this.removeAttribute("label"), this.removeAttribute("rotulo")), this.syncLabel();
  }
  formResetCallback() {
    this.value = this._defaultValue;
  }
  get itens() {
    return this._itens;
  }
  set itens(t) {
    this._itens = t || [], mt(this.listElement, this._itens, this._value), this.syncLabel();
  }
  abrir() {
    this.hasAttribute("aberta") || (this.setAttribute("aberta", ""), this.posicionamento.posicionar(), this.posicionamento.ativarAcompanhamento(this.fechar));
  }
  syncLabel() {
    const t = this.getAttribute("label") || this.getAttribute("rotulo");
    if (t)
      this.labelElement.textContent = t, this.labelElement.style.display = "block", this.sheetTituloElement.textContent = t;
    else {
      this.labelElement.style.display = "none";
      const o = this.getAttribute("texto-padrao") || this.getAttribute("placeholder") || "Opções";
      this.sheetTituloElement.textContent = o;
    }
    const e = this._itens.find((o) => String(o.id) === String(this._value));
    if (e)
      this.textoElement.textContent = e.label;
    else {
      const o = this.getAttribute("texto-padrao") || this.getAttribute("placeholder") || "Opções";
      this.textoElement.textContent = o;
    }
  }
  syncState() {
    const t = this.getAttribute("altura") || this.getAttribute("height");
    t && this.style.setProperty("--ui-campo-altura", isNaN(Number(t)) ? t : `${t}px`), this.hasAttribute("value") && (this._value = this.getAttribute("value") || "", this.internals.setFormValue(this._value)), this.syncLabel();
  }
  selecionarItem(t) {
    this.value = t.id, this.fechar(), this.dispatchEvent(
      new CustomEvent("ui-selecionar", {
        detail: t,
        bubbles: !0,
        composed: !0
      })
    ), this.dispatchEvent(
      new Event("change", {
        bubbles: !0,
        composed: !0
      })
    ), this.dispatchEvent(
      new Event("input", {
        bubbles: !0,
        composed: !0
      })
    );
  }
}
c(ct, "formAssociated", !0);
class jt extends ct {
}
customElements.get("ui-lista-flutuante") || customElements.define("ui-lista-flutuante", ct);
customElements.get("ui-select") || customElements.define("ui-select", jt);
const Gt = ':host{display:block;box-sizing:border-box;margin:0;padding:0;color:var(--ui-cor-texto, #e1e1e6);font-family:var(--ui-fonte-base, "Inter", sans-serif)}:host([inline]){display:inline-block}.ui-texto{margin:0;padding:0;box-sizing:border-box;font-family:inherit;color:inherit;font-size:inherit;font-weight:inherit;line-height:inherit}.ui-texto--h1{font-size:var(--ui-tamanho-h1, clamp(24px, 4vw, 36px));font-weight:var(--ui-peso-negrito, 700);line-height:var(--ui-altura-linha-titulo, 1.25);letter-spacing:-.5px}.ui-texto--h2{font-size:var(--ui-tamanho-h2, clamp(20px, 3vw, 28px));font-weight:var(--ui-peso-seminegrito, 600);line-height:var(--ui-altura-linha-titulo, 1.25);letter-spacing:-.3px}.ui-texto--h3{font-size:var(--ui-tamanho-h3, clamp(18px, 2.4vw, 24px));font-weight:var(--ui-peso-seminegrito, 600);line-height:var(--ui-altura-linha-titulo, 1.25)}.ui-texto--h4{font-size:var(--ui-tamanho-h4, clamp(16px, 2vw, 20px));font-weight:var(--ui-peso-medio, 500);line-height:var(--ui-altura-linha-titulo, 1.25)}.ui-texto--h5{font-size:var(--ui-tamanho-h5, clamp(14px, 1.6vw, 18px));font-weight:var(--ui-peso-medio, 500);line-height:var(--ui-altura-linha-titulo, 1.25)}.ui-texto--h6{font-size:var(--ui-tamanho-h6, clamp(13px, 1.2vw, 16px));font-weight:var(--ui-peso-seminegrito, 600);line-height:var(--ui-altura-linha-titulo, 1.25);text-transform:uppercase;letter-spacing:.5px}.ui-texto--corpo{font-size:var(--ui-tamanho-corpo, 14px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-corpo, 1.5)}.ui-texto--corpo-sm{font-size:var(--ui-tamanho-corpo-sm, 13px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-corpo, 1.5)}.ui-texto--caption{font-size:var(--ui-tamanho-caption, 11px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-compacta, 1.2);color:var(--ui-cor-texto-secundario, #888899)}.ui-texto--codigo{font-family:var(--ui-fonte-codigo, monospace);font-size:var(--ui-tamanho-codigo, 12px);font-weight:var(--ui-peso-normal, 400);line-height:var(--ui-altura-linha-corpo, 1.5);background:var(--ui-cor-fundo-elevado, #1a1a1e);padding:2px 6px;border-radius:4px;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12))}.ui-texto--cor-primaria{color:var(--ui-cor-primaria, #00E08A)}.ui-texto--cor-secundaria{color:var(--ui-cor-texto-secundario, #888899)}.ui-texto--cor-destaque{color:var(--ui-cor-destaque, #00E08A)}.ui-texto--cor-erro{color:var(--ui-cor-texto-erro, #ff5555)}.ui-texto--cor-sucesso{color:var(--ui-cor-texto-sucesso, #00E08A)}.ui-texto--cor-alerta{color:var(--ui-cor-texto-alerta, #ffb86c)}.ui-texto--peso-normal{font-weight:var(--ui-peso-normal, 400)!important}.ui-texto--peso-medio{font-weight:var(--ui-peso-medio, 500)!important}.ui-texto--peso-seminegrito{font-weight:var(--ui-peso-seminegrito, 600)!important}.ui-texto--peso-negrito{font-weight:var(--ui-peso-negrito, 700)!important}.ui-texto--alinhamento-esquerda{text-align:left}.ui-texto--alinhamento-centro{text-align:center}.ui-texto--alinhamento-direita{text-align:right}.ui-texto--alinhamento-justificado{text-align:justify}.ui-texto--truncar{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}', Wt = /* @__PURE__ */ new Set([
  "p",
  "span",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "small",
  "code",
  "strong",
  "em",
  "label",
  "blockquote",
  "pre",
  "b",
  "i"
]);
class Ut extends HTMLElement {
  constructor() {
    super();
    c(this, "container");
    c(this, "shadow");
    this.shadow = this.attachShadow({ mode: "open" }), this.container = document.createElement("p"), this.container.className = "ui-texto ui-texto--corpo", this.container.appendChild(document.createElement("slot")), this.shadow.innerHTML = `<style>${Gt}</style>`, this.shadow.appendChild(this.container);
  }
  static get observedAttributes() {
    return ["variante", "tag", "cor", "peso", "alinhamento", "truncar"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback(t, e, o) {
    this.render();
  }
  resolveTag() {
    const t = this.getAttribute("tag");
    if (t) {
      const o = t.toLowerCase().trim();
      if (Wt.has(o))
        return o;
      console.warn(`[ui-texto] Tag "${t}" não permitida ou inválida. Utilizando fallback semântico.`);
    }
    const e = (this.getAttribute("variante") || "corpo").toLowerCase();
    switch (e) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return e;
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
    const t = this.resolveTag(), e = this.getAttribute("variante") || "corpo", o = this.getAttribute("cor"), a = this.getAttribute("peso"), r = this.getAttribute("alinhamento"), s = this.hasAttribute("truncar");
    if (this.container.tagName.toLowerCase() !== t) {
      const h = document.createElement(t);
      h.appendChild(document.createElement("slot")), this.shadow.replaceChild(h, this.container), this.container = h;
    }
    const l = ["ui-texto", `ui-texto--${e}`];
    o && l.push(`ui-texto--cor-${o}`), a && l.push(`ui-texto--peso-${a}`), r && l.push(`ui-texto--alinhamento-${r}`), s && l.push("ui-texto--truncar"), this.container.className = l.join(" ");
  }
}
customElements.get("ui-texto") || customElements.define("ui-texto", Ut);
const Yt = ':host{display:flex;flex-direction:column;gap:4px;width:100%;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}:host([inline]){width:auto;display:inline-flex}.ui-campo-texto__container{position:relative;width:100%;display:flex;flex-direction:column;justify-content:center}:host([label-flutuante]) .ui-campo-texto__container{margin-top:6px}.ui-campo-texto__label{display:flex;align-items:center;justify-content:space-between;font-size:var(--ui-tamanho-corpo-sm, 13px);font-weight:var(--ui-peso-medio, 500);color:var(--ui-cor-texto, #e1e1e6);-webkit-user-select:none;user-select:none;margin-bottom:4px;flex-shrink:0}.ui-campo-texto__wrapper{position:relative;display:flex;align-items:center;width:100%;height:var(--ui-campo-altura, 100%);min-height:var(--ui-campo-altura, var(--ui-altura-minima, 15px));background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 6px);padding:0 8px;gap:6px;box-sizing:border-box;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease}.ui-campo-texto__wrapper--foco{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a2e;background-color:var(--ui-cor-fundo-menu, #18181c)}.ui-campo-texto__wrapper--erro{border-color:var(--ui-cor-texto-erro, #ff5555)!important;box-shadow:0 0 0 2px #ff55552e!important}.ui-campo-texto__wrapper--disabled{opacity:.5;cursor:not-allowed;background-color:#ffffff08}.ui-campo-texto__input{flex:1;width:100%;height:100%;min-height:0;background:transparent;border:none;outline:none;color:var(--ui-cor-texto, #e1e1e6);font-family:inherit;font-size:clamp(11px,.85rem,13px);line-height:1.2;padding:0;margin:0;box-sizing:border-box}.ui-campo-texto__input::placeholder{color:var(--ui-cor-texto-secundario, #888899);opacity:.65}.ui-campo-texto__input:disabled{cursor:not-allowed}.ui-campo-texto__icone{display:inline-flex;align-items:center;justify-content:center;color:var(--ui-cor-texto-secundario, #888899);flex-shrink:0;font-size:14px;line-height:1;max-height:100%}.ui-campo-texto__icone svg,.ui-campo-texto__icone ::slotted(svg),.ui-campo-texto__icone ::slotted(ui-icone){shape-rendering:geometricPrecision;display:inline-flex;vertical-align:middle}.ui-campo-texto__icone--clicavel{cursor:pointer;-webkit-user-select:none;user-select:none;transition:opacity .15s ease,transform .15s ease}.ui-campo-texto__icone--clicavel:hover{opacity:.85;transform:scale(1.1)}:host([label-flutuante]) .ui-campo-texto__label{position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--ui-cor-texto-secundario, #888899);pointer-events:none;z-index:3;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);padding:0 4px;border-radius:3px;margin-bottom:0;white-space:nowrap;max-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis;transition:top .15s cubic-bezier(.4,0,.2,1),transform .15s cubic-bezier(.4,0,.2,1),color .15s ease,font-size .15s ease}:host([label-flutuante][tem-icone-esquerda]) .ui-campo-texto__label{left:28px}:host([label-flutuante]) .ui-campo-texto__label--ativa{top:-8px;left:8px!important;transform:translateY(0) scale(.85);transform-origin:left top;font-weight:600;color:var(--ui-cor-primaria, #00E08A);background-color:var(--ui-cor-fundo-elevado, #1a1a1e)}:host([label-flutuante][erro]) .ui-campo-texto__label--ativa,:host([label-flutuante][mensagem-erro]) .ui-campo-texto__label--ativa{color:var(--ui-cor-texto-erro, #ff5555)}.ui-campo-texto__helper{font-size:var(--ui-tamanho-caption, 11px);color:var(--ui-cor-texto-secundario, #888899);line-height:var(--ui-altura-linha-compacta, 1.2);margin-top:2px}.ui-campo-texto__helper--erro{color:var(--ui-cor-texto-erro, #ff5555);font-weight:500;display:flex;align-items:center;gap:4px}.ui-campo-texto__wrapper{touch-action:manipulation;-webkit-tap-highlight-color:transparent}.ui-campo-texto__input{touch-action:manipulation}@media (max-width: 640px),(pointer: coarse) and (max-width: 1024px){.ui-campo-texto__input{font-size:16px!important}:host(:not([inline])) .ui-campo-texto__wrapper{min-height:max(var(--ui-campo-altura, 38px),38px);padding:0 10px}.ui-campo-texto__label{font-size:13px}.ui-campo-texto__icone--clicavel{min-width:32px;min-height:32px}}', Xt = [
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
  "alternar-senha",
  "tamanho",
  "size",
  "altura",
  "height",
  "densidade"
];
function Kt() {
  return `
    <style>${Yt}</style>
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
  `;
}
function Zt(n) {
  const { labelElement: i, inputElement: t, labelText: e, placeholderText: o, isFlutuante: a, estaFocado: r } = n, s = t.value.trim() !== "";
  let l = !1;
  try {
    l = t.matches(":-webkit-autofill");
  } catch {
    l = !1;
  }
  e ? (i.textContent = e, i.style.display = "flex", a && (r || s || l) ? i.classList.add("ui-campo-texto__label--ativa") : i.classList.remove("ui-campo-texto__label--ativa")) : i.style.display = "none", a && !r && !s && !l ? t.placeholder = "" : t.placeholder = o;
}
function Qt(n, i, t) {
  i ? (n.classList.add("ui-campo-texto__icone--clicavel"), n.setAttribute("role", "button"), n.setAttribute("tabindex", "0"), n.setAttribute("aria-label", t ? "Ocultar senha" : "Exibir senha")) : (n.classList.remove("ui-campo-texto__icone--clicavel"), n.removeAttribute("role"), n.removeAttribute("tabindex"), n.removeAttribute("aria-label"));
}
function Jt(n, i, t, e, o, a) {
  e ? (n.classList.add("ui-campo-texto__wrapper--erro"), i.setAttribute("aria-invalid", "true")) : (n.classList.remove("ui-campo-texto__wrapper--erro"), i.removeAttribute("aria-invalid")), e && o ? (t.textContent = `⚠️ ${o}`, t.className = "ui-campo-texto__helper ui-campo-texto__helper--erro", t.style.display = "block") : a ? (t.textContent = a, t.className = "ui-campo-texto__helper", t.style.display = "block") : t.style.display = "none";
}
class Et extends HTMLElement {
  constructor() {
    super();
    c(this, "internals");
    c(this, "labelElement");
    c(this, "wrapperElement");
    c(this, "inputElement");
    c(this, "helperElement");
    c(this, "rightIconContainer");
    c(this, "leftSlotElement");
    c(this, "_senhaVisivel", !1);
    c(this, "_checkTimer", null);
    c(this, "_focado", !1);
    c(this, "_inputId");
    c(this, "_defaultValue", "");
    c(this, "handleSlotChange", () => {
      this.syncState();
    });
    c(this, "handleRightIconClick", (t) => {
      (this.getAttribute("tipo") === "password" || this.hasAttribute("alternar-senha")) && (t.stopPropagation(), this.alternarVisibilidadeSenha());
    });
    c(this, "handleRightIconKeyDown", (t) => {
      (this.getAttribute("tipo") === "password" || this.hasAttribute("alternar-senha")) && (t.key === "Enter" || t.key === " ") && (t.preventDefault(), t.stopPropagation(), this.alternarVisibilidadeSenha());
    });
    c(this, "handleFocus", () => {
      this._focado = !0, this.wrapperElement.classList.add("ui-campo-texto__wrapper--foco"), this.syncState();
    });
    c(this, "handleBlur", () => {
      this._focado = !1, this.wrapperElement.classList.remove("ui-campo-texto__wrapper--foco"), this.syncState();
    });
    c(this, "handleInput", (t) => {
      t.stopPropagation();
      const e = t.target.value;
      this.internals.setFormValue(e), this.syncState(), this.dispatchEvent(
        new CustomEvent("ui-input", {
          detail: { value: e },
          bubbles: !0,
          composed: !0
        })
      ), this.dispatchEvent(
        new Event("input", {
          bubbles: !0,
          composed: !0
        })
      );
    });
    c(this, "handleChange", (t) => {
      t.stopPropagation();
      const e = t.target.value;
      this.internals.setFormValue(e), this.dispatchEvent(
        new CustomEvent("ui-change", {
          detail: { value: e },
          bubbles: !0,
          composed: !0
        })
      ), this.dispatchEvent(
        new Event("change", {
          bubbles: !0,
          composed: !0
        })
      );
    });
    this.internals = this.attachInternals();
    const t = this.attachShadow({ mode: "open", delegatesFocus: !0 });
    t.innerHTML = Kt(), this.labelElement = t.querySelector(".ui-campo-texto__label"), this.wrapperElement = t.querySelector(".ui-campo-texto__wrapper"), this.inputElement = t.querySelector(".ui-campo-texto__input"), this.helperElement = t.querySelector(".ui-campo-texto__helper"), this.rightIconContainer = t.querySelector(".ui-campo-texto__icone--direita"), this.leftSlotElement = t.querySelector('slot[name="icone-esquerda"]'), this._inputId = `ui-input-${Math.random().toString(36).substring(2, 9)}`, this.inputElement.id = this._inputId, this.labelElement.htmlFor = this._inputId, this.helperElement.id = `${this._inputId}-helper`, this.inputElement.setAttribute("aria-describedby", `${this._inputId}-helper`);
  }
  static get observedAttributes() {
    return Xt;
  }
  focus(t) {
    this.inputElement.focus(t);
  }
  blur() {
    this.inputElement.blur();
  }
  connectedCallback() {
    this.inputElement.addEventListener("input", this.handleInput), this.inputElement.addEventListener("change", this.handleChange), this.inputElement.addEventListener("focus", this.handleFocus), this.inputElement.addEventListener("blur", this.handleBlur), this.rightIconContainer.addEventListener("click", this.handleRightIconClick), this.rightIconContainer.addEventListener("keydown", this.handleRightIconKeyDown), this.leftSlotElement.addEventListener("slotchange", this.handleSlotChange), this._defaultValue = this.getAttribute("value") || "", this.hasAttribute("value") && !this.inputElement.value && (this.inputElement.value = this._defaultValue), this.syncState(), this._checkTimer = setTimeout(() => this.syncState(), 100);
  }
  disconnectedCallback() {
    this.inputElement.removeEventListener("input", this.handleInput), this.inputElement.removeEventListener("change", this.handleChange), this.inputElement.removeEventListener("focus", this.handleFocus), this.inputElement.removeEventListener("blur", this.handleBlur), this.rightIconContainer.removeEventListener("click", this.handleRightIconClick), this.rightIconContainer.removeEventListener("keydown", this.handleRightIconKeyDown), this.leftSlotElement.removeEventListener("slotchange", this.handleSlotChange), this._checkTimer && clearTimeout(this._checkTimer);
  }
  attributeChangedCallback(t, e, o) {
    t === "value" && o !== this.inputElement.value && !this._focado && (this.inputElement.value = o || ""), this.syncState();
  }
  get value() {
    return this.inputElement.value;
  }
  set value(t) {
    this.inputElement.value = t, this.setAttribute("value", t), this.syncState();
  }
  alternarVisibilidadeSenha() {
    var o;
    if (!(this.getAttribute("tipo") === "password" || this._senhaVisivel)) return;
    this._senhaVisivel = !this._senhaVisivel, this.inputElement.type = this._senhaVisivel ? "text" : "password";
    const e = (o = this.shadowRoot) == null ? void 0 : o.querySelector('slot[name="icone-direita"]');
    e && e.assignedElements().forEach((r) => {
      var s, l;
      (((s = r.textContent) == null ? void 0 : s.trim()) === "👁️" || ((l = r.textContent) == null ? void 0 : l.trim()) === "🙈") && (r.textContent = this._senhaVisivel ? "🙈" : "👁️");
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
    const e = this.getAttribute("altura") || this.getAttribute("height");
    e ? this.style.setProperty("--ui-campo-altura", isNaN(Number(e)) ? e : `${e}px`) : this.style.removeProperty("--ui-campo-altura"), Zt({
      labelElement: this.labelElement,
      inputElement: this.inputElement,
      labelText: this.getAttribute("label"),
      placeholderText: this.getAttribute("placeholder") || "",
      isFlutuante: this.hasAttribute("label-flutuante"),
      estaFocado: this._focado
    });
    const o = this.getAttribute("tipo") || "text";
    this._senhaVisivel || (this.inputElement.type = o), this.internals.setFormValue(this.inputElement.value);
    const a = this.hasAttribute("disabled"), r = this.hasAttribute("readonly");
    this.inputElement.disabled = a, this.inputElement.readOnly = r, a ? this.wrapperElement.classList.add("ui-campo-texto__wrapper--disabled") : this.wrapperElement.classList.remove("ui-campo-texto__wrapper--disabled");
    const s = o === "password" || this.hasAttribute("alternar-senha");
    Qt(this.rightIconContainer, s, this._senhaVisivel);
    const l = this.hasAttribute("erro") || this.hasAttribute("mensagem-erro");
    Jt(
      this.wrapperElement,
      this.inputElement,
      this.helperElement,
      l,
      this.getAttribute("mensagem-erro"),
      this.getAttribute("helper-text")
    );
  }
  formResetCallback() {
    this.inputElement.value = this._defaultValue, this.syncState();
  }
}
c(Et, "formAssociated", !0);
customElements.get("ui-campo-texto") || customElements.define("ui-campo-texto", Et);
const te = ':host{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;line-height:1;color:inherit;flex-shrink:0;width:var(--ui-tamanho-icone, 20px);height:var(--ui-tamanho-icone, 20px);box-sizing:border-box}.ui-icone{display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;color:inherit;font-size:var(--ui-tamanho-icone, 20px)}::slotted(svg),.ui-icone svg{width:100%!important;height:100%!important;display:block;shape-rendering:geometricPrecision}:host([cor="primaria"]),:host([color="primaria"]){color:var(--ui-cor-primaria, #00E08A)}:host([cor="secundaria"]),:host([color="secundaria"]){color:var(--ui-cor-texto-secundario, #888899)}:host([cor="erro"]),:host([color="erro"]){color:var(--ui-cor-texto-erro, #ff5555)}:host([cor="sucesso"]),:host([color="sucesso"]){color:var(--ui-cor-texto-sucesso, #00E08A)}:host([cor="alerta"]),:host([color="alerta"]){color:var(--ui-cor-texto-alerta, #ffb86c)}', ft = {
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
class ee extends HTMLElement {
  constructor() {
    super();
    c(this, "iconContainer");
    c(this, "svgContainer");
    c(this, "slotElement");
    c(this, "handleSlotChange", () => {
      this.syncState();
    });
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${te}</style>
      <span class="ui-icone" aria-hidden="true">
        <span class="ui-icone__svg" style="display: none;"></span>
        <slot></slot>
      </span>
    `, this.iconContainer = t.querySelector(".ui-icone"), this.svgContainer = t.querySelector(".ui-icone__svg"), this.slotElement = t.querySelector("slot");
  }
  static get observedAttributes() {
    return ["tamanho", "size", "cor", "color", "nome", "name"];
  }
  connectedCallback() {
    this.slotElement.addEventListener("slotchange", this.handleSlotChange), this.syncState();
  }
  disconnectedCallback() {
    this.slotElement.removeEventListener("slotchange", this.handleSlotChange);
  }
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  resolveTamanhoPx() {
    const t = this.getAttribute("tamanho") || this.getAttribute("size") || "md";
    switch (t.toLowerCase()) {
      case "sm":
        return "16px";
      case "md":
        return "20px";
      case "lg":
        return "24px";
      case "xl":
        return "32px";
      default:
        return isNaN(Number(t)) ? t : `${t}px`;
    }
  }
  syncState() {
    const t = this.resolveTamanhoPx();
    this.style.setProperty("--ui-tamanho-icone", t);
    const e = this.getAttribute("cor") || this.getAttribute("color");
    e ? (this.style.setProperty("--ui-cor-icone", e), this.iconContainer.style.color = e) : (this.style.removeProperty("--ui-cor-icone"), this.iconContainer.style.color = ""), this.hasAttribute("aria-label") || this.hasAttribute("label") ? this.iconContainer.removeAttribute("aria-hidden") : this.iconContainer.setAttribute("aria-hidden", "true");
    const a = this.getAttribute("nome") || this.getAttribute("name"), r = this.slotElement.assignedNodes().length > 0;
    a && ft[a] && !r ? (this.svgContainer.innerHTML = ft[a], this.svgContainer.style.display = "inline-flex") : (this.svgContainer.innerHTML = "", this.svgContainer.style.display = "none");
  }
}
customElements.get("ui-icone") || customElements.define("ui-icone", ee);
const ie = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-checkbox{display:inline-flex;align-items:center;gap:8px;cursor:pointer;-webkit-user-select:none;user-select:none;line-height:1;outline:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent}.ui-checkbox--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-checkbox__box{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;min-width:16px;min-height:16px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:4px;box-sizing:border-box;transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease;flex-shrink:0}.ui-checkbox:focus-visible .ui-checkbox__box,.ui-checkbox--foco .ui-checkbox__box{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a40}.ui-checkbox--checked .ui-checkbox__box,.ui-checkbox--indeterminate .ui-checkbox__box{background-color:var(--ui-cor-primaria, #00E08A);border-color:var(--ui-cor-primaria, #00E08A);color:var(--ui-cor-texto-sobre-primaria, #000000)}.ui-checkbox__mark{width:12px;height:12px;display:flex;align-items:center;justify-content:center;transition:transform .15s cubic-bezier(.4,0,.2,1),opacity .15s ease;transform:scale(0);opacity:0}.ui-checkbox--checked .ui-checkbox__mark,.ui-checkbox--indeterminate .ui-checkbox__mark{transform:scale(1);opacity:1}.ui-checkbox__mark svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;shape-rendering:geometricPrecision}.ui-checkbox__label{display:inline-flex;align-items:center;font-size:clamp(11px,.85rem,14px);color:var(--ui-cor-texto, #e1e1e6);line-height:1}.ui-checkbox--label-esquerda{flex-direction:row-reverse}@media (max-width: 640px){.ui-checkbox{min-height:40px;padding:4px 0}.ui-checkbox__box{width:20px;height:20px;min-width:20px;min-height:20px}.ui-checkbox__mark{width:14px;height:14px}.ui-checkbox__label{font-size:14px}}';
class kt extends HTMLElement {
  constructor() {
    super();
    c(this, "internals");
    c(this, "containerElement");
    c(this, "markElement");
    c(this, "labelElement");
    c(this, "listeners", new F());
    c(this, "_defaultChecked", !1);
    c(this, "_defaultIndeterminate", !1);
    c(this, "handleClick", (t) => {
      t.preventDefault(), this.alternar();
    });
    c(this, "handleKeyDown", (t) => {
      (t.key === " " || t.key === "Enter") && (t.preventDefault(), this.alternar());
    });
    c(this, "handleFocus", () => {
      this.containerElement.classList.add("ui-checkbox--foco");
    });
    c(this, "handleBlur", () => {
      this.containerElement.classList.remove("ui-checkbox--foco");
    });
    this.internals = this.attachInternals();
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${ie}</style>
      <div class="ui-checkbox" tabindex="0" role="checkbox" aria-checked="false">
        <span class="ui-checkbox__box">
          <span class="ui-checkbox__mark"></span>
        </span>
        <span class="ui-checkbox__label" style="display: none;"></span>
      </div>
    `, this.containerElement = t.querySelector(".ui-checkbox"), this.markElement = t.querySelector(".ui-checkbox__mark"), this.labelElement = t.querySelector(".ui-checkbox__label");
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
    this.listeners.cleanup(), this.listeners.add(this.containerElement, "click", this.handleClick), this.listeners.add(this.containerElement, "keydown", this.handleKeyDown), this.listeners.add(this.containerElement, "focus", this.handleFocus), this.listeners.add(this.containerElement, "blur", this.handleBlur), this._defaultChecked = this.hasAttribute("marcado") || this.hasAttribute("checked"), this._defaultIndeterminate = this.hasAttribute("indeterminado") || this.hasAttribute("indeterminate"), this.syncState();
  }
  disconnectedCallback() {
    this.listeners.cleanup();
  }
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  get marcado() {
    return this.hasAttribute("marcado") || this.hasAttribute("checked");
  }
  set marcado(t) {
    t ? this.setAttribute("marcado", "") : (this.removeAttribute("marcado"), this.removeAttribute("checked")), this.syncState();
  }
  get checked() {
    return this.marcado;
  }
  set checked(t) {
    this.marcado = t;
  }
  get value() {
    return this.getAttribute("value") || "on";
  }
  set value(t) {
    this.setAttribute("value", t), this.syncState();
  }
  get name() {
    return this.getAttribute("name") || "";
  }
  set name(t) {
    this.setAttribute("name", t), this.syncState();
  }
  get indeterminado() {
    return this.hasAttribute("indeterminado") || this.hasAttribute("indeterminate");
  }
  set indeterminado(t) {
    t ? this.setAttribute("indeterminado", "") : (this.removeAttribute("indeterminado"), this.removeAttribute("indeterminate")), this.syncState();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(t) {
    t ? this.setAttribute("disabled", "") : this.removeAttribute("disabled"), this.syncState();
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
    ), this.dispatchEvent(
      new Event("change", {
        bubbles: !0,
        composed: !0
      })
    ));
  }
  syncState() {
    const t = this.marcado, e = this.indeterminado, o = this.disabled, a = this.getAttribute("label"), r = this.getAttribute("posicao-label") || "direita";
    this.containerElement.setAttribute(
      "aria-checked",
      e ? "mixed" : String(t)
    ), o ? (this.containerElement.classList.add("ui-checkbox--disabled"), this.containerElement.setAttribute("tabindex", "-1"), this.containerElement.setAttribute("aria-disabled", "true")) : (this.containerElement.classList.remove("ui-checkbox--disabled"), this.containerElement.setAttribute("tabindex", "0"), this.containerElement.removeAttribute("aria-disabled")), t ? this.containerElement.classList.add("ui-checkbox--checked") : this.containerElement.classList.remove("ui-checkbox--checked"), e ? this.containerElement.classList.add("ui-checkbox--indeterminate") : this.containerElement.classList.remove("ui-checkbox--indeterminate"), r === "esquerda" ? this.containerElement.classList.add("ui-checkbox--label-esquerda") : this.containerElement.classList.remove("ui-checkbox--label-esquerda"), e ? this.markElement.innerHTML = `
        <svg viewBox="0 0 24 24">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      ` : t ? this.markElement.innerHTML = `
        <svg viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      ` : this.markElement.innerHTML = "", a ? (this.labelElement.textContent = a, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", t ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null);
  }
  formResetCallback() {
    this.marcado = this._defaultChecked, this.indeterminado = this._defaultIndeterminate;
  }
}
c(kt, "formAssociated", !0);
customElements.get("ui-checkbox") || customElements.define("ui-checkbox", kt);
const oe = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-radio{display:inline-flex;align-items:center;gap:8px;cursor:pointer;-webkit-user-select:none;user-select:none;line-height:1;outline:none}.ui-radio--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-radio__circle{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;min-width:16px;min-height:16px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:50%;box-sizing:border-box;transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease;flex-shrink:0}.ui-radio:focus-visible .ui-radio__circle,.ui-radio--foco .ui-radio__circle{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a40}.ui-radio--checked .ui-radio__circle{border-color:var(--ui-cor-primaria, #00E08A)}.ui-radio__dot{width:8px;height:8px;border-radius:50%;background-color:var(--ui-cor-primaria, #00E08A);transition:transform .15s cubic-bezier(.4,0,.2,1),opacity .15s ease;transform:scale(0);opacity:0}.ui-radio--checked .ui-radio__dot{transform:scale(1);opacity:1}.ui-radio__label{display:inline-flex;align-items:center;font-size:clamp(11px,.85rem,14px);color:var(--ui-cor-texto, #e1e1e6);line-height:1}.ui-radio--label-esquerda{flex-direction:row-reverse}', G = class G extends HTMLElement {
  constructor() {
    super();
    c(this, "internals");
    c(this, "containerElement");
    c(this, "labelElement");
    c(this, "_defaultChecked", !1);
    c(this, "handleClick", (t) => {
      t.preventDefault(), this.selecionar(), this.containerElement.focus();
    });
    c(this, "handleKeyDown", (t) => {
      if (t.key === " " || t.key === "Enter")
        t.preventDefault(), this.selecionar();
      else if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(t.key)) {
        t.preventDefault();
        const o = this.getGroupRadios().filter((s) => !s.disabled);
        if (o.length <= 1) return;
        const a = o.indexOf(this);
        let r = a;
        if (t.key === "ArrowDown" || t.key === "ArrowRight" ? r = (a + 1) % o.length : (t.key === "ArrowUp" || t.key === "ArrowLeft") && (r = (a - 1 + o.length) % o.length), r !== a && r >= 0 && r < o.length) {
          const s = o[r];
          s.selecionar(), s.containerElement.focus();
        }
      }
    });
    c(this, "handleFocus", () => {
      this.containerElement.classList.add("ui-radio--foco");
    });
    c(this, "handleBlur", () => {
      this.containerElement.classList.remove("ui-radio--foco");
    });
    this.internals = this.attachInternals();
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${oe}</style>
      <div class="ui-radio" tabindex="0" role="radio" aria-checked="false">
        <span class="ui-radio__circle">
          <span class="ui-radio__dot"></span>
        </span>
        <span class="ui-radio__label" style="display: none;"></span>
      </div>
    `, this.containerElement = t.querySelector(".ui-radio"), this.labelElement = t.querySelector(".ui-radio__label");
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
    this.containerElement.addEventListener("click", this.handleClick), this.containerElement.addEventListener("keydown", this.handleKeyDown), this.containerElement.addEventListener("focus", this.handleFocus), this.containerElement.addEventListener("blur", this.handleBlur), this._defaultChecked = this.hasAttribute("marcado") || this.hasAttribute("checked"), this.register(), this.syncState();
  }
  disconnectedCallback() {
    this.containerElement.removeEventListener("click", this.handleClick), this.containerElement.removeEventListener("keydown", this.handleKeyDown), this.containerElement.removeEventListener("focus", this.handleFocus), this.containerElement.removeEventListener("blur", this.handleBlur), this.unregister();
  }
  getScopeNode() {
    return this.closest("form") || this.getRootNode() || document;
  }
  register() {
    const t = this.name;
    if (t) {
      const e = this.getScopeNode();
      G._registry.has(e) || G._registry.set(e, /* @__PURE__ */ new Map());
      const o = G._registry.get(e);
      o.has(t) || o.set(t, /* @__PURE__ */ new Set()), o.get(t).add(this);
    }
  }
  unregister() {
    const t = this.name;
    if (t) {
      const e = this.getScopeNode(), o = G._registry.get(e);
      if (o && o.has(t)) {
        const a = o.get(t);
        a.delete(this), a.size === 0 && o.delete(t), o.size === 0 && G._registry.delete(e);
      }
    }
  }
  getGroupRadios() {
    const t = this.name;
    if (!t) return [];
    const e = this.getScopeNode(), o = G._registry.get(e);
    return !o || !o.has(t) ? [] : Array.from(o.get(t));
  }
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  get marcado() {
    return this.hasAttribute("marcado") || this.hasAttribute("checked");
  }
  set marcado(t) {
    t ? this.setAttribute("marcado", "") : (this.removeAttribute("marcado"), this.removeAttribute("checked"));
  }
  get name() {
    return this.getAttribute("name") || this.getAttribute("nome") || "";
  }
  set name(t) {
    this.unregister(), this.setAttribute("name", t), this.register(), this.syncState();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(t) {
    t ? this.setAttribute("disabled", "") : this.removeAttribute("disabled"), this.syncState();
  }
  selecionar() {
    if (this.disabled || this.marcado) return;
    this.getGroupRadios().forEach((e) => {
      e !== this && (e.removeAttribute("marcado"), e.removeAttribute("checked"), e.syncState());
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
    ), this.dispatchEvent(
      new Event("change", {
        bubbles: !0,
        composed: !0
      })
    );
  }
  syncState() {
    const t = this.marcado, e = this.disabled, o = this.getAttribute("label"), a = this.getAttribute("posicao-label") || "direita";
    if (this.containerElement.setAttribute("aria-checked", String(t)), e)
      this.containerElement.classList.add("ui-radio--disabled"), this.containerElement.setAttribute("tabindex", "-1"), this.containerElement.setAttribute("aria-disabled", "true");
    else {
      this.containerElement.classList.remove("ui-radio--disabled"), this.containerElement.removeAttribute("aria-disabled");
      const r = this.getGroupRadios();
      r.length > 0 ? r.some((l) => l.marcado) ? this.containerElement.setAttribute("tabindex", t ? "0" : "-1") : this.containerElement.setAttribute("tabindex", r[0] === this ? "0" : "-1") : this.containerElement.setAttribute("tabindex", "0");
    }
    t ? this.containerElement.classList.add("ui-radio--checked") : this.containerElement.classList.remove("ui-radio--checked"), a === "esquerda" ? this.containerElement.classList.add("ui-radio--label-esquerda") : this.containerElement.classList.remove("ui-radio--label-esquerda"), o ? (this.labelElement.textContent = o, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", t ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null);
  }
  formResetCallback() {
    this.marcado = this._defaultChecked, this._defaultChecked ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null), this.syncState();
  }
};
c(G, "formAssociated", !0), // Registro estruturado com WeakMap para prevenir vazamentos de memória (Memory Leaks)
c(G, "_registry", /* @__PURE__ */ new WeakMap());
let st = G;
customElements.get("ui-radio") || customElements.define("ui-radio", st);
const ae = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer;-webkit-user-select:none;user-select:none;line-height:1;outline:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent}.ui-switch--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-switch__track{display:inline-flex;align-items:center;position:relative;width:36px;height:20px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:999px;box-sizing:border-box;padding:1px;transition:background-color .2s ease,border-color .2s ease,box-shadow .2s ease;flex-shrink:0}.ui-switch:focus-visible .ui-switch__track,.ui-switch--foco .ui-switch__track{border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 0 0 2px #00e08a40}.ui-switch--checked .ui-switch__track{background-color:var(--ui-cor-primaria, #00E08A);border-color:var(--ui-cor-primaria, #00E08A)}.ui-switch__thumb{display:block;width:16px;height:16px;background-color:#fff;border-radius:50%;box-shadow:0 1px 3px #0000004d;transition:transform .2s cubic-bezier(.4,0,.2,1),background-color .2s ease;transform:translate(0)}.ui-switch--checked .ui-switch__thumb{transform:translate(16px);background-color:var(--ui-cor-texto-sobre-primaria, #000000)}.ui-switch--sm .ui-switch__track{width:28px;height:16px;padding:1px}.ui-switch--sm .ui-switch__thumb{width:12px;height:12px}.ui-switch--sm.ui-switch--checked .ui-switch__thumb{transform:translate(12px)}.ui-switch--lg .ui-switch__track{width:44px;height:24px;padding:1px}.ui-switch--lg .ui-switch__thumb{width:20px;height:20px}.ui-switch--lg.ui-switch--checked .ui-switch__thumb{transform:translate(20px)}.ui-switch__label{display:inline-flex;align-items:center;font-size:clamp(11px,.85rem,14px);color:var(--ui-cor-texto, #e1e1e6);line-height:1}.ui-switch--label-esquerda{flex-direction:row-reverse}@media (max-width: 640px){.ui-switch{min-height:40px;padding:4px 0}.ui-switch__label{font-size:14px}}';
class dt extends HTMLElement {
  constructor() {
    super();
    c(this, "internals");
    c(this, "containerElement");
    c(this, "labelElement");
    c(this, "listeners", new F());
    c(this, "_defaultChecked", !1);
    c(this, "handleClick", (t) => {
      t.preventDefault(), this.alternar();
    });
    c(this, "handleKeyDown", (t) => {
      (t.key === " " || t.key === "Enter") && (t.preventDefault(), this.alternar());
    });
    c(this, "handleFocus", () => {
      this.containerElement.classList.add("ui-switch--foco");
    });
    c(this, "handleBlur", () => {
      this.containerElement.classList.remove("ui-switch--foco");
    });
    this.internals = this.attachInternals();
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${ae}</style>
      <div class="ui-switch" tabindex="0" role="switch" aria-checked="false">
        <span class="ui-switch__track">
          <span class="ui-switch__thumb"></span>
        </span>
        <span class="ui-switch__label" style="display: none;"></span>
      </div>
    `, this.containerElement = t.querySelector(".ui-switch"), this.labelElement = t.querySelector(".ui-switch__label");
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
    this.listeners.cleanup(), this.listeners.add(this.containerElement, "click", this.handleClick), this.listeners.add(this.containerElement, "keydown", this.handleKeyDown), this.listeners.add(this.containerElement, "focus", this.handleFocus), this.listeners.add(this.containerElement, "blur", this.handleBlur), this._defaultChecked = this.hasAttribute("ativo") || this.hasAttribute("ligado") || this.hasAttribute("checked"), this.syncState();
  }
  disconnectedCallback() {
    this.listeners.cleanup();
  }
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  get ativo() {
    return this.hasAttribute("ativo") || this.hasAttribute("ligado") || this.hasAttribute("checked");
  }
  set ativo(t) {
    t ? this.setAttribute("ativo", "") : (this.removeAttribute("ativo"), this.removeAttribute("ligado"), this.removeAttribute("checked")), this.syncState();
  }
  get checked() {
    return this.ativo;
  }
  set checked(t) {
    this.ativo = t;
  }
  get value() {
    return this.getAttribute("value") || "on";
  }
  set value(t) {
    this.setAttribute("value", t), this.syncState();
  }
  get name() {
    return this.getAttribute("name") || "";
  }
  set name(t) {
    this.setAttribute("name", t), this.syncState();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(t) {
    t ? this.setAttribute("disabled", "") : this.removeAttribute("disabled"), this.syncState();
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
    ), this.dispatchEvent(
      new Event("change", {
        bubbles: !0,
        composed: !0
      })
    ));
  }
  syncState() {
    const t = this.ativo, e = this.disabled, o = this.getAttribute("tamanho") || this.getAttribute("size") || "md", a = this.getAttribute("label"), r = this.getAttribute("posicao-label") || "direita";
    this.containerElement.setAttribute("aria-checked", String(t)), e ? (this.containerElement.classList.add("ui-switch--disabled"), this.containerElement.setAttribute("tabindex", "-1"), this.containerElement.setAttribute("aria-disabled", "true")) : (this.containerElement.classList.remove("ui-switch--disabled"), this.containerElement.setAttribute("tabindex", "0"), this.containerElement.removeAttribute("aria-disabled")), t ? this.containerElement.classList.add("ui-switch--checked") : this.containerElement.classList.remove("ui-switch--checked"), this.containerElement.classList.remove("ui-switch--sm", "ui-switch--md", "ui-switch--lg"), ["sm", "md", "lg"].includes(o) ? this.containerElement.classList.add(`ui-switch--${o}`) : this.containerElement.classList.add("ui-switch--md"), r === "esquerda" ? this.containerElement.classList.add("ui-switch--label-esquerda") : this.containerElement.classList.remove("ui-switch--label-esquerda"), a ? (this.labelElement.textContent = a, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", t ? this.internals.setFormValue(this.getAttribute("value") || "on") : this.internals.setFormValue(null);
  }
  formResetCallback() {
    this.ativo = this._defaultChecked;
  }
}
c(dt, "formAssociated", !0);
class re extends dt {
}
customElements.get("ui-switch") || customElements.define("ui-switch", dt);
customElements.get("ui-toggle") || customElements.define("ui-toggle", re);
const ne = ':host{display:inline-flex;align-items:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle}.ui-badge{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600;line-height:1;-webkit-user-select:none;user-select:none;box-sizing:border-box;transition:background-color .15s ease,color .15s ease,border-color .15s ease;white-space:nowrap}::slotted(svg),::slotted(ui-icone){width:12px!important;height:12px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;line-height:1!important;vertical-align:middle!important;shape-rendering:geometricPrecision;flex-shrink:0}::slotted(span){display:inline-flex;align-items:center;line-height:1}.ui-badge--suave{background-color:var(--ui-cor-badge-fundo, rgba(255, 255, 255, .08));color:var(--ui-cor-badge-texto, #e1e1e6);border:1px solid transparent}.ui-badge--solido{background-color:var(--ui-cor-badge-solido, #888899);color:#000;border:1px solid transparent}.ui-badge--contornado{background-color:transparent;color:var(--ui-cor-badge-texto, #e1e1e6);border:1px solid var(--ui-cor-badge-borda, rgba(255, 255, 255, .2))}.ui-badge--sucesso.ui-badge--suave{background-color:#00e08a26;color:var(--ui-cor-primaria, #00E08A)}.ui-badge--sucesso.ui-badge--solido{background-color:var(--ui-cor-primaria, #00E08A);color:#000}.ui-badge--sucesso.ui-badge--contornado{color:var(--ui-cor-primaria, #00E08A);border-color:#00e08a66}.ui-badge--erro.ui-badge--suave{background-color:#ff555526;color:var(--ui-cor-texto-erro, #ff5555)}.ui-badge--erro.ui-badge--solido{background-color:var(--ui-cor-texto-erro, #ff5555);color:#fff}.ui-badge--erro.ui-badge--contornado{color:var(--ui-cor-texto-erro, #ff5555);border-color:#f556}.ui-badge--alerta.ui-badge--suave{background-color:#ffb86c26;color:var(--ui-cor-texto-alerta, #ffb86c)}.ui-badge--alerta.ui-badge--solido{background-color:var(--ui-cor-texto-alerta, #ffb86c);color:#000}.ui-badge--alerta.ui-badge--contornado{color:var(--ui-cor-texto-alerta, #ffb86c);border-color:#ffb86c66}.ui-badge--info.ui-badge--suave,.ui-badge--primaria.ui-badge--suave{background-color:#00aaff26;color:#0af}.ui-badge--info.ui-badge--solido,.ui-badge--primaria.ui-badge--solido{background-color:#0af;color:#fff}.ui-badge--info.ui-badge--contornado,.ui-badge--primaria.ui-badge--contornado{color:#0af;border-color:#0af6}.ui-badge--neutro.ui-badge--suave{background-color:#ffffff14;color:var(--ui-cor-texto-secundario, #888899)}.ui-badge__close{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;cursor:pointer;opacity:.7;transition:opacity .15s ease,background-color .15s ease;font-size:10px;line-height:1;margin-left:2px}.ui-badge__close:hover{opacity:1;background-color:#fff3}';
class ut extends HTMLElement {
  constructor() {
    super();
    c(this, "badgeElement");
    c(this, "labelElement");
    c(this, "closeElement");
    c(this, "listeners", new F());
    c(this, "handleRemove", (t) => {
      var e;
      t.stopPropagation(), this.dispatchEvent(
        new CustomEvent("ui-remove", {
          detail: {
            value: this.getAttribute("value") || ((e = this.textContent) == null ? void 0 : e.trim()) || ""
          },
          bubbles: !0,
          composed: !0
        })
      );
    });
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${ne}</style>
      <span class="ui-badge">
        <slot></slot>
        <span class="ui-badge__label" style="display: none;"></span>
        <span class="ui-badge__close" role="button" tabindex="0" aria-label="Remover" style="display: none;" title="Remover">✕</span>
      </span>
    `, this.badgeElement = t.querySelector(".ui-badge"), this.labelElement = t.querySelector(".ui-badge__label"), this.closeElement = t.querySelector(".ui-badge__close");
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
    this.listeners.cleanup(), this.listeners.add(this.closeElement, "click", this.handleRemove), this.listeners.add(this.closeElement, "keydown", (t) => {
      (t.key === "Enter" || t.key === " ") && (t.preventDefault(), this.handleRemove(t));
    }), this.syncState();
  }
  disconnectedCallback() {
    this.listeners.cleanup();
  }
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  get removivel() {
    return this.hasAttribute("removivel") || this.hasAttribute("removable");
  }
  set removivel(t) {
    t ? this.setAttribute("removivel", "") : (this.removeAttribute("removivel"), this.removeAttribute("removable"));
  }
  syncState() {
    const t = this.getAttribute("variante") || this.getAttribute("variant") || "neutro", e = this.getAttribute("estilo") || "suave", o = this.getAttribute("label"), a = this.removivel;
    this.badgeElement.className = "ui-badge", this.badgeElement.classList.add(`ui-badge--${t}`), this.badgeElement.classList.add(`ui-badge--${e}`), o ? (this.labelElement.textContent = o, this.labelElement.style.display = "inline") : this.labelElement.style.display = "none", a ? this.closeElement.style.display = "inline-flex" : this.closeElement.style.display = "none";
  }
}
class se extends ut {
}
class le extends ut {
}
customElements.get("ui-badge") || customElements.define("ui-badge", ut);
customElements.get("ui-chip") || customElements.define("ui-chip", se);
customElements.get("ui-tag") || customElements.define("ui-tag", le);
const ce = ':host{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif);vertical-align:middle;position:relative}.ui-avatar{position:relative;display:inline-flex;align-items:center;justify-content:center;width:var(--ui-tamanho-avatar, 36px);height:var(--ui-tamanho-avatar, 36px);min-width:var(--ui-tamanho-avatar, 36px);min-height:var(--ui-tamanho-avatar, 36px);border-radius:50%;background-color:var(--ui-cor-fundo-elevado, #22222a);color:var(--ui-cor-primaria, #00E08A);font-weight:600;font-size:var(--ui-avatar-font-size, 14px);-webkit-user-select:none;user-select:none;box-sizing:border-box;overflow:hidden;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));line-height:1}.ui-avatar__img{width:100%;height:100%;object-fit:cover;display:block}.ui-avatar--quadrado{border-radius:8px}.ui-avatar__status{position:absolute;bottom:0;right:0;width:25%;height:25%;min-width:8px;min-height:8px;max-width:14px;max-height:14px;border-radius:50%;border:2px solid var(--ui-cor-fundo-card, #121214);box-sizing:border-box}.ui-avatar__status--online{background-color:var(--ui-cor-primaria, #00E08A)}.ui-avatar__status--offline{background-color:#889}.ui-avatar__status--ausente{background-color:#ffb86c}.ui-avatar__status--ocupado{background-color:#f55}.ui-avatar--xs{--ui-tamanho-avatar: 20px;--ui-avatar-font-size: 10px}.ui-avatar--sm{--ui-tamanho-avatar: 28px;--ui-avatar-font-size: 11px}.ui-avatar--md{--ui-tamanho-avatar: 36px;--ui-avatar-font-size: 14px}.ui-avatar--lg{--ui-tamanho-avatar: 48px;--ui-avatar-font-size: 18px}.ui-avatar--xl{--ui-tamanho-avatar: 64px;--ui-avatar-font-size: 24px}';
class de extends HTMLElement {
  constructor() {
    super();
    c(this, "avatarElement");
    c(this, "statusElement");
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${ce}</style>
      <div class="ui-avatar">
        <span class="ui-avatar__content"></span>
      </div>
      <span class="ui-avatar__status" style="display: none;"></span>
    `, this.avatarElement = t.querySelector(".ui-avatar"), this.statusElement = t.querySelector(".ui-avatar__status");
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
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  extrairIniciais(t) {
    const e = t.trim().split(/\s+/).filter(Boolean);
    if (e.length === 0) return "?";
    if (e.length === 1)
      return e[0].substring(0, 2).toUpperCase();
    const o = e[0][0], a = e[e.length - 1][0];
    return (o + a).toUpperCase();
  }
  syncState() {
    const t = this.getAttribute("src"), e = this.getAttribute("nome") || this.getAttribute("name") || "", o = this.getAttribute("tamanho") || this.getAttribute("size") || "md", a = this.getAttribute("formato") || "circulo", r = this.getAttribute("status");
    this.avatarElement.className = "ui-avatar", ["xs", "sm", "md", "lg", "xl"].includes(o) ? (this.avatarElement.classList.add(`ui-avatar--${o}`), this.avatarElement.style.removeProperty("--ui-tamanho-avatar")) : isNaN(parseInt(o, 10)) ? this.avatarElement.style.removeProperty("--ui-tamanho-avatar") : this.avatarElement.style.setProperty("--ui-tamanho-avatar", `${parseInt(o, 10)}px`), a === "quadrado" && this.avatarElement.classList.add("ui-avatar--quadrado");
    const s = this.avatarElement.querySelector(".ui-avatar__content");
    if (s)
      if (t) {
        const l = s.querySelector("img");
        if (l && l.getAttribute("src") === t)
          l.alt = e || "Avatar";
        else {
          s.textContent = "";
          const h = document.createElement("img");
          h.className = "ui-avatar__img", h.src = t, h.alt = e || "Avatar", h.onerror = () => {
            this.renderFallback(s, e);
          }, s.appendChild(h);
        }
      } else
        s.textContent = "", this.renderFallback(s, e);
    r && ["online", "offline", "ausente", "ocupado"].includes(r) ? (this.statusElement.className = `ui-avatar__status ui-avatar__status--${r}`, this.statusElement.style.display = "block") : this.statusElement.style.display = "none";
  }
  renderFallback(t, e) {
    e ? t.textContent = this.extrairIniciais(e) : t.innerHTML = `
        <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      `;
  }
}
customElements.get("ui-avatar") || customElements.define("ui-avatar", de);
class ue {
  constructor(i, t) {
    c(this, "rafId", null);
    c(this, "resizeObserver");
    this.trackElement = i, this.indicadorElement = t;
  }
  iniciarObserver(i, t) {
    typeof ResizeObserver < "u" && (this.resizeObserver = new ResizeObserver(() => {
      this.atualizar(), t && t();
    }), this.resizeObserver.observe(i));
  }
  destruir() {
    this.resizeObserver && (this.resizeObserver.disconnect(), this.resizeObserver = void 0), this.rafId !== null && (cancelAnimationFrame(this.rafId), this.rafId = null);
  }
  atualizar() {
    this.rafId !== null && cancelAnimationFrame(this.rafId), this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const i = this.trackElement.querySelector(".ui-segmented__item--ativo");
      if (!i) {
        this.indicadorElement.style.opacity = "0";
        return;
      }
      const t = Math.round(i.offsetLeft), e = Math.round(i.offsetWidth);
      this.indicadorElement.style.transform = `translateX(${t}px)`, this.indicadorElement.style.width = `${e}px`, this.indicadorElement.style.opacity = "1";
    });
  }
}
function he(n, i, t, e) {
  if (t) return;
  const o = Array.from(
    i.querySelectorAll(".ui-segmented__item:not(:disabled)")
  );
  if (o.length === 0) return;
  const a = o.findIndex((l) => l.classList.contains("ui-segmented__item--ativo"));
  let r = a;
  if (n.key === "ArrowRight" || n.key === "ArrowDown")
    n.preventDefault(), r = (a + 1) % o.length;
  else if (n.key === "ArrowLeft" || n.key === "ArrowUp")
    n.preventDefault(), r = (a - 1 + o.length) % o.length;
  else if (n.key === "Home")
    n.preventDefault(), r = 0;
  else if (n.key === "End")
    n.preventDefault(), r = o.length - 1;
  else
    return;
  const s = o[r];
  if (s && s.dataset.indice) {
    const l = parseInt(s.dataset.indice, 10);
    e(l);
  }
}
const pe = ':host{display:inline-block;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}:host([largura-total]),:host([full-width]){display:block;width:100%}.ui-segmented{display:inline-flex;position:relative;background-color:var(--ui-cor-fundo, #0b0b0d);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 8px);padding:3px;box-sizing:border-box;-webkit-user-select:none;user-select:none;gap:2px;align-items:center}:root[data-tema=claro] .ui-segmented,[data-tema=claro] .ui-segmented{background-color:var(--ui-cor-fundo-elevado, #f1f3f5);border-color:#00000014}.ui-segmented--full{display:flex;width:100%}.ui-segmented--full .ui-segmented__item{flex:1}.ui-segmented--sm{padding:2px;height:28px}.ui-segmented--sm .ui-segmented__item{font-size:12px;padding:0 8px;height:22px}.ui-segmented--md{padding:3px;height:36px}.ui-segmented--md .ui-segmented__item{font-size:13px;padding:0 14px;height:28px}.ui-segmented--lg{padding:4px;height:42px}.ui-segmented--lg .ui-segmented__item{font-size:14px;padding:0 18px;height:32px}.ui-segmented__indicador{position:absolute;top:3px;bottom:3px;left:0;background-color:var(--ui-cor-fundo-elevado, #1e1e24);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:calc(var(--ui-raio-borda, 8px) - 2px);box-shadow:0 2px 8px #0006;pointer-events:none;transition:transform .22s cubic-bezier(.16,1,.3,1),width .22s cubic-bezier(.16,1,.3,1),opacity .15s ease;z-index:1;opacity:0}:root[data-tema=claro] .ui-segmented__indicador,[data-tema=claro] .ui-segmented__indicador{background-color:#fff;border-color:#0000001a;box-shadow:0 2px 6px #00000014}.ui-segmented--sm .ui-segmented__indicador{top:2px;bottom:2px}.ui-segmented--lg .ui-segmented__indicador{top:4px;bottom:4px}.ui-segmented__item{position:relative;z-index:2;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:transparent;border:none;color:var(--ui-cor-texto-secundario, #888899);font-family:inherit;font-weight:500;cursor:pointer;border-radius:calc(var(--ui-raio-borda, 8px) - 2px);line-height:1;white-space:nowrap;transition:color .15s ease;box-sizing:border-box}:root[data-tema=claro] .ui-segmented__item,[data-tema=claro] .ui-segmented__item{color:#6c757d}.ui-segmented__item:hover:not(:disabled){color:var(--ui-cor-texto, #e1e1e6)}:root[data-tema=claro] .ui-segmented__item:hover:not(:disabled){color:#1a1a1e}.ui-segmented__item--ativo{color:var(--ui-cor-texto, #ffffff)!important;font-weight:600}:root[data-tema=claro] .ui-segmented__item--ativo{color:#1a1a1e!important}.ui-segmented__item:focus-visible{outline:none;box-shadow:0 0 0 2px var(--ui-cor-primaria, #00E08A)}.ui-segmented__item:disabled{opacity:.35;cursor:not-allowed}.ui-segmented__icone{display:inline-flex;align-items:center;justify-content:center;line-height:1}.ui-segmented__icone ui-icone,.ui-segmented__icone svg{shape-rendering:geometricPrecision;display:inline-flex;align-items:center;justify-content:center}', me = [
  "valor",
  "value",
  "name",
  "disabled",
  "tamanho",
  "size",
  "largura-total",
  "full-width"
];
function fe() {
  return `
    <style>${pe}</style>
    <div class="ui-segmented ui-segmented--md" role="radiogroup">
      <div class="ui-segmented__indicador"></div>
      <div class="ui-segmented__track" style="display: contents;"></div>
      <slot style="display: none;"></slot>
    </div>
  `;
}
function be(n, i, t, e, o) {
  const a = document.createElement("button");
  a.type = "button", a.role = "radio", a.className = "ui-segmented__item", a.dataset.valor = n.valor, a.dataset.indice = String(i);
  const r = n.valor === t;
  if (a.setAttribute("aria-checked", String(r)), a.tabIndex = r ? 0 : -1, r && a.classList.add("ui-segmented__item--ativo"), (e || n.disabled) && (a.disabled = !0), n.icone) {
    const l = document.createElement("span");
    l.className = "ui-segmented__icone";
    const h = document.createElement("ui-icone");
    h.setAttribute("nome", n.icone), h.setAttribute("tamanho", "14"), l.appendChild(h), a.appendChild(l);
  }
  const s = document.createElement("span");
  return s.className = "ui-segmented__texto", s.textContent = n.rotulo, a.appendChild(s), a.addEventListener("click", (l) => {
    l.stopPropagation(), o();
  }), a;
}
class ht extends HTMLElement {
  constructor() {
    super();
    c(this, "internals");
    c(this, "rootElement");
    c(this, "trackElement");
    c(this, "indicadorElement");
    c(this, "slotElement");
    c(this, "_opcoes", []);
    c(this, "_defaultValue", "");
    c(this, "listeners", new F());
    c(this, "indicadorController");
    c(this, "handleSlotChange", () => {
      this._opcoes.length === 0 && this.carregarOpcoes();
    });
    c(this, "handleKeyDown", (t) => {
      he(t, this.trackElement, this.disabled, (e) => {
        this.selecionarIndice(e);
      });
    });
    this.attachInternals && (this.internals = this.attachInternals());
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = fe(), this.rootElement = t.querySelector(".ui-segmented"), this.indicadorElement = t.querySelector(".ui-segmented__indicador"), this.trackElement = t.querySelector(".ui-segmented__track"), this.slotElement = t.querySelector("slot"), this.indicadorController = new ue(
      this.trackElement,
      this.indicadorElement
    );
  }
  static get observedAttributes() {
    return me;
  }
  connectedCallback() {
    this.listeners.cleanup(), this.listeners.add(this.rootElement, "keydown", this.handleKeyDown), this.listeners.add(this.slotElement, "slotchange", this.handleSlotChange), this._defaultValue || (this._defaultValue = this.getAttribute("valor") || this.getAttribute("value") || ""), this.indicadorController.iniciarObserver(this.rootElement), this.carregarOpcoes(), this.syncState();
  }
  disconnectedCallback() {
    this.listeners.cleanup(), this.indicadorController.destruir();
  }
  attributeChangedCallback(t, e, o) {
    e !== o && (t === "valor" || t === "value" ? this.atualizarSelecao(o || "") : this.syncState());
  }
  formResetCallback() {
    this.valor = this._defaultValue;
  }
  get valor() {
    return this.getAttribute("valor") || this.getAttribute("value") || "";
  }
  set valor(t) {
    this.setAttribute("valor", t), this.atualizarSelecao(t);
  }
  get value() {
    return this.valor;
  }
  set value(t) {
    this.valor = t;
  }
  get name() {
    return this.getAttribute("name") || "";
  }
  set name(t) {
    this.setAttribute("name", t);
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(t) {
    t ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
  }
  get opcoes() {
    return this._opcoes;
  }
  set opcoes(t) {
    this._opcoes = Array.isArray(t) ? t : [], this.renderizarOpcoes();
  }
  carregarOpcoes() {
    const t = this.slotElement.assignedElements();
    if (t.length > 0) {
      const e = [];
      t.forEach((o) => {
        var a, r;
        if (o instanceof HTMLElement) {
          const s = o.getAttribute("valor") || o.getAttribute("value") || o.getAttribute("data-value") || ((a = o.textContent) == null ? void 0 : a.trim()) || "", l = o.getAttribute("label") || o.getAttribute("rotulo") || ((r = o.textContent) == null ? void 0 : r.trim()) || s, h = o.getAttribute("icone") || o.getAttribute("icon") || void 0, u = o.hasAttribute("disabled");
          e.push({ valor: s, rotulo: l, icone: h, disabled: u });
        }
      }), this._opcoes = e, this.renderizarOpcoes();
    }
  }
  renderizarOpcoes() {
    this.trackElement.innerHTML = "";
    const t = this.valor, e = this.disabled;
    this._opcoes.forEach((o, a) => {
      const r = be(
        o,
        a,
        t,
        e,
        () => this.selecionarIndice(a)
      );
      this.trackElement.appendChild(r);
    }), !t && this._opcoes.length > 0 ? this.selecionarIndice(0, !1) : this.indicadorController.atualizar();
  }
  selecionarIndice(t, e = !0) {
    if (this.disabled) return;
    const o = this._opcoes[t];
    if (!o || o.disabled) return;
    const a = this.valor;
    this.setAttribute("valor", o.valor), this.internals && this.internals.setFormValue(o.valor), this.atualizarSelecao(o.valor), e && a !== o.valor && (this.dispatchEvent(
      new CustomEvent("ui-change", {
        detail: { valor: o.valor, rotulo: o.rotulo, indice: t },
        bubbles: !0,
        composed: !0
      })
    ), this.dispatchEvent(
      new CustomEvent("ui-selecionar", {
        detail: { valor: o.valor, rotulo: o.rotulo, indice: t },
        bubbles: !0,
        composed: !0
      })
    ));
  }
  atualizarSelecao(t) {
    Array.from(this.trackElement.querySelectorAll(".ui-segmented__item")).forEach((o) => {
      const a = o.dataset.valor === t;
      o.classList.toggle("ui-segmented__item--ativo", a), o.setAttribute("aria-checked", String(a)), o.tabIndex = a ? 0 : -1, a && o.focus();
    }), this.internals && this.internals.setFormValue(t), this.indicadorController.atualizar();
  }
  syncState() {
    const t = this.getAttribute("tamanho") || this.getAttribute("size") || "md", e = this.hasAttribute("largura-total") || this.hasAttribute("full-width"), o = this.disabled;
    this.rootElement.className = `ui-segmented ui-segmented--${t}`, e && this.rootElement.classList.add("ui-segmented--full"), this.rootElement.setAttribute("aria-disabled", String(o)), Array.from(this.trackElement.querySelectorAll(".ui-segmented__item")).forEach((r) => {
      r.disabled = o;
    }), this.indicadorController.atualizar();
  }
}
c(ht, "formAssociated", !0);
class ge extends ht {
}
customElements.get("ui-segmented") || customElements.define("ui-segmented", ht);
customElements.get("ui-segmento") || customElements.define("ui-segmento", ge);
const ve = ':host{display:block;width:100%;box-sizing:border-box}:host(.h-full),:host([style*="height: 100%"]){height:100%}.ui-card{display:flex;flex-direction:column;width:100%;height:100%;box-sizing:border-box;background-color:var(--ui-cor-fundo-card, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 8px);overflow:hidden;transition:transform .2s cubic-bezier(.4,0,.2,1),box-shadow .2s cubic-bezier(.4,0,.2,1),border-color .2s ease;color:var(--ui-cor-texto, #e1e1e6);font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-card--plano{background-color:var(--ui-cor-fundo-card, #18181c);box-shadow:none}.ui-card--elevado{background-color:var(--ui-cor-fundo-elevado, #1e1e24);box-shadow:0 8px 24px #0006;border-color:#ffffff14}.ui-card--destaque{border-color:var(--ui-cor-primaria, #00E08A);background-color:var(--ui-cor-fundo-card, #18181c);box-shadow:0 0 0 1px #00e08a40}.ui-card--clicavel{cursor:pointer;-webkit-user-select:none;user-select:none}.ui-card--clicavel:hover{transform:translateY(-3px);border-color:var(--ui-cor-primaria, #00E08A);box-shadow:0 10px 30px #00000080,0 0 15px #00e08a26}.ui-card--clicavel:active{transform:translateY(-1px)}.ui-card--disabled{opacity:.5;cursor:not-allowed!important;pointer-events:none}.ui-card__media{width:100%;overflow:hidden;display:block;line-height:0}::slotted([slot="midia"]),::slotted([slot="media"]){width:100%;height:auto;display:block;object-fit:cover}.ui-card__header{padding:14px 16px 8px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box}.ui-card__body{padding:12px 16px;flex:1;box-sizing:border-box}.ui-card__footer{padding:10px 16px 14px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box}.ui-card--compacto .ui-card__header{padding:10px 12px 6px}.ui-card--compacto .ui-card__body{padding:8px 12px}.ui-card--compacto .ui-card__footer{padding:8px 12px 10px}';
class xe extends HTMLElement {
  constructor() {
    super();
    c(this, "cardElement");
    c(this, "listeners", new F());
    c(this, "handleSlotChange", () => {
      this.syncState();
    });
    c(this, "handleClick", (t) => {
      this.disabled || t && t.target && t.target instanceof HTMLElement && t.target.closest('button, a, input, select, textarea, ui-botao, ui-switch, ui-checkbox, ui-radio, [role="button"]') || this.clicavel && (this.dispatchEvent(
        new CustomEvent("ui-click", {
          detail: {
            id: this.id || "sem-id"
          },
          bubbles: !0,
          composed: !0
        })
      ), this.dispatchEvent(
        new CustomEvent("ui-clique", {
          detail: {
            id: this.id || "sem-id"
          },
          bubbles: !0,
          composed: !0
        })
      ));
    });
    c(this, "handleKeyDown", (t) => {
      !this.clicavel || this.disabled || (t.key === "Enter" || t.key === " ") && (t.preventDefault(), this.handleClick());
    });
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${ve}</style>
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
    `, this.cardElement = t.querySelector(".ui-card");
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
    var e;
    this.listeners.cleanup(), this.listeners.add(this.cardElement, "click", this.handleClick), this.listeners.add(this.cardElement, "keydown", this.handleKeyDown);
    const t = (e = this.shadowRoot) == null ? void 0 : e.querySelectorAll("slot");
    t == null || t.forEach((o) => this.listeners.add(o, "slotchange", this.handleSlotChange)), this.syncState();
  }
  disconnectedCallback() {
    this.listeners.cleanup();
  }
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  get clicavel() {
    return this.hasAttribute("clicavel") || this.hasAttribute("clickable");
  }
  set clicavel(t) {
    t ? this.setAttribute("clicavel", "") : (this.removeAttribute("clicavel"), this.removeAttribute("clickable")), this.syncState();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(t) {
    t ? this.setAttribute("disabled", "") : this.removeAttribute("disabled"), this.syncState();
  }
  syncState() {
    var d, p, m;
    const t = this.getAttribute("elevacao") || this.getAttribute("elevation") || "plano", e = this.getAttribute("variante") || this.getAttribute("variant"), o = this.clicavel, a = this.hasAttribute("compacto") || this.hasAttribute("compact"), r = this.disabled;
    this.cardElement.className = "ui-card", this.cardElement.classList.add(`ui-card--${t}`), e && this.cardElement.classList.add(`ui-card--${e}`), o ? (this.cardElement.classList.add("ui-card--clicavel"), this.cardElement.setAttribute("tabindex", "0")) : this.cardElement.removeAttribute("tabindex"), a && this.cardElement.classList.add("ui-card--compacto"), r && this.cardElement.classList.add("ui-card--disabled");
    const s = (d = this.shadowRoot) == null ? void 0 : d.querySelector(".ui-card__header"), l = (p = this.shadowRoot) == null ? void 0 : p.querySelector(".ui-card__footer"), h = (m = this.shadowRoot) == null ? void 0 : m.querySelector(".ui-card__media"), u = (f) => {
      var v;
      const b = f.map((w) => `slot[name="${w}"]`).join(", ");
      return Array.from(((v = this.shadowRoot) == null ? void 0 : v.querySelectorAll(b)) || []).some((w) => w.assignedNodes({ flatten: !0 }).some((T) => T.nodeType === Node.ELEMENT_NODE || T.textContent && T.textContent.trim() !== "")) || f.some((w) => this.querySelector(`[slot="${w}"]`) !== null);
    };
    h && (h.style.display = u(["midia", "media"]) ? "block" : "none"), s && (s.style.display = u(["cabecalho", "header"]) ? "flex" : "none"), l && (l.style.display = u(["rodape", "footer"]) ? "flex" : "none");
  }
}
customElements.get("ui-card") || customElements.define("ui-card", xe);
const ye = ':host{display:block;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-modal__backdrop{display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background-color:#000000b3;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);z-index:9998;opacity:0;pointer-events:none;transition:opacity .25s ease}:host([aberto]) .ui-modal__backdrop,:host([open]) .ui-modal__backdrop{display:block;opacity:1;pointer-events:auto}.ui-modal__dialog{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.95);max-width:560px;width:90%;max-height:85vh;background-color:var(--ui-cor-fundo-card, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-radius:var(--ui-raio-borda, 12px);box-shadow:0 12px 36px #0009;z-index:9999;display:flex;flex-direction:column;opacity:0;visibility:hidden;pointer-events:none;overflow:hidden;transition:transform .25s cubic-bezier(.16,1,.3,1),opacity .2s ease,visibility .2s ease;box-sizing:border-box;color:var(--ui-cor-texto, #e1e1e6)}:host([aberto]) .ui-modal__dialog,:host([open]) .ui-modal__dialog{opacity:1;visibility:visible;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}@starting-style{:host([aberto]) .ui-modal__dialog,:host([open]) .ui-modal__dialog{opacity:0;transform:translate(-50%,-50%) scale(.94)}:host([aberto]) .ui-modal__backdrop,:host([open]) .ui-modal__backdrop{opacity:0}}.ui-modal__handle{display:none;width:36px;height:4px;border-radius:2px;background-color:#ffffff40;margin:6px auto 12px;flex-shrink:0}.ui-modal__header{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);gap:12px}.ui-modal__titulo{font-size:18px;font-weight:600;margin:0;color:var(--ui-cor-texto, #e1e1e6)}.ui-modal__close{background:transparent;border:none;color:var(--ui-cor-texto-secundario, #888899);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;line-height:1;display:inline-flex;align-items:center;justify-content:center;transition:color .15s ease,background-color .15s ease;touch-action:manipulation;-webkit-tap-highlight-color:transparent}.ui-modal__close svg,.ui-modal__close ::slotted(svg){shape-rendering:geometricPrecision}.ui-modal__close:hover{color:#fff;background-color:#ffffff1a}.ui-modal__body{padding:20px;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;flex:1;box-sizing:border-box}.ui-modal__footer{padding:14px 20px;display:flex;align-items:center;justify-content:flex-end;gap:12px;border-top:1px solid rgba(255,255,255,.08);background-color:#00000026}@media (max-width: 640px){.ui-modal__dialog{top:auto!important;bottom:0!important;left:0!important;transform:translateY(100%)!important;width:100vw!important;max-width:100vw!important;border-radius:16px 16px 0 0!important;max-height:85vh!important;max-height:85dvh!important;border-bottom:none!important;box-shadow:0 -8px 32px #000000b3!important}.ui-modal__close{min-width:44px;min-height:44px;font-size:18px}.ui-modal__footer{padding-bottom:calc(14px + env(safe-area-inset-bottom,0px))!important}:host([aberto]) .ui-modal__dialog,:host([open]) .ui-modal__dialog{transform:translateY(0)!important}.ui-modal__handle{display:block!important}}:host([bottom-sheet]) .ui-modal__dialog{top:auto!important;bottom:0!important;left:0!important;transform:translateY(100%)!important;width:100vw!important;max-width:100vw!important;border-radius:16px 16px 0 0!important;max-height:85vh!important;max-height:85dvh!important;border-bottom:none!important;box-shadow:0 -8px 32px #000000b3!important}:host([bottom-sheet]) .ui-modal__close{min-width:44px;min-height:44px;font-size:18px}:host([bottom-sheet]) .ui-modal__footer{padding-bottom:calc(14px + env(safe-area-inset-bottom,0px))!important}:host([bottom-sheet][aberto]) .ui-modal__dialog,:host([bottom-sheet][open]) .ui-modal__dialog{transform:translateY(0)!important}:host([bottom-sheet]) .ui-modal__handle{display:block!important}', j = class j extends HTMLElement {
  constructor() {
    super();
    c(this, "backdropElement");
    c(this, "dialogElement");
    c(this, "tituloElement");
    c(this, "closeElement");
    c(this, "_elementoGatilho", null);
    c(this, "_focables", []);
    c(this, "handleSlotChange", () => {
      this.syncState();
    });
    c(this, "handleBackdropClick", (t) => {
      t.stopPropagation(), this.fechar();
    });
    c(this, "handleCloseClick", (t) => {
      t.stopPropagation(), this.fechar();
    });
    c(this, "handleKeyDown", (t) => {
      var e, o;
      if (this.aberto && this._isTopMostModal()) {
        if (t.key === "Escape")
          this.fechar(), t.stopImmediatePropagation();
        else if (t.key === "Tab") {
          if (this._atualizarFocables(), this._focables.length === 0) {
            t.preventDefault();
            return;
          }
          const a = this._focables[0], r = this._focables[this._focables.length - 1], s = this.getRootNode().activeElement;
          t.shiftKey ? (s === a || !this.contains(s) && !((e = this.shadowRoot) != null && e.contains(s))) && (t.preventDefault(), r.focus()) : (s === r || !this.contains(s) && !((o = this.shadowRoot) != null && o.contains(s))) && (t.preventDefault(), a.focus());
        }
      }
    });
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${ye}</style>
      <div class="ui-modal__backdrop"></div>
      <div class="ui-modal__dialog" role="dialog" aria-modal="true" tabindex="-1">
        <div class="ui-modal__handle"></div>
        <div class="ui-modal__header">
          <h3 class="ui-modal__titulo"></h3>
          <button class="ui-modal__close" type="button" aria-label="Fechar modal" title="Fechar">✕</button>
        </div>
        <div class="ui-modal__body">
          <slot></slot>
        </div>
        <div class="ui-modal__footer">
          <slot name="rodape"></slot>
          <slot name="footer"></slot>
        </div>
      </div>
    `, this.backdropElement = t.querySelector(".ui-modal__backdrop"), this.dialogElement = t.querySelector(".ui-modal__dialog"), this.tituloElement = t.querySelector(".ui-modal__titulo"), this.closeElement = t.querySelector(".ui-modal__close");
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
    this.backdropElement.addEventListener("click", this.handleBackdropClick), this.closeElement.addEventListener("click", this.handleCloseClick), window.addEventListener("keydown", this.handleKeyDown), this.shadowRoot.querySelectorAll("slot").forEach((e) => {
      e.addEventListener("slotchange", this.handleSlotChange);
    }), this.syncState();
  }
  disconnectedCallback() {
    this.backdropElement.removeEventListener("click", this.handleBackdropClick), this.closeElement.removeEventListener("click", this.handleCloseClick), window.removeEventListener("keydown", this.handleKeyDown), this.shadowRoot.querySelectorAll("slot").forEach((e) => {
      e.removeEventListener("slotchange", this.handleSlotChange);
    }), this.hasAttribute("data-scroll-locked") && (this.removeAttribute("data-scroll-locked"), j._openCount = Math.max(0, j._openCount - 1), j._openCount === 0 && (document.body.style.overflow = ""));
  }
  attributeChangedCallback(t, e, o) {
    (t === "aberto" || t === "open") && o !== null && (document.activeElement && document.activeElement !== document.body && (this._elementoGatilho = document.activeElement), setTimeout(() => {
      this._atualizarFocables(), this._focables.length > 0 ? this._focables[0].focus() : this.dialogElement.focus();
    }, 0)), this.syncState();
  }
  get aberto() {
    return this.hasAttribute("aberto") || this.hasAttribute("open");
  }
  set aberto(t) {
    t ? this.setAttribute("aberto", "") : (this.removeAttribute("aberto"), this.removeAttribute("open")), this.syncState();
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
    var a, r;
    const t = this.aberto, e = this.getAttribute("titulo") || this.getAttribute("title") || "", o = (a = this.shadowRoot) == null ? void 0 : a.querySelector(".ui-modal__footer");
    if (this.dialogElement.setAttribute("aria-hidden", String(!t)), e ? (this.tituloElement.textContent = e, this.tituloElement.style.display = "block") : this.tituloElement.style.display = "none", o) {
      const l = Array.from(((r = this.shadowRoot) == null ? void 0 : r.querySelectorAll('slot[name="rodape"], slot[name="footer"]')) || []).some((h) => h.assignedNodes({ flatten: !0 }).some((d) => d.nodeType === Node.ELEMENT_NODE || d.textContent && d.textContent.trim() !== "")) || this.querySelector('[slot="rodape"], [slot="footer"]') !== null;
      o.style.display = l ? "flex" : "none";
    }
    t ? this.hasAttribute("data-scroll-locked") || (this.setAttribute("data-scroll-locked", "true"), j._openCount++, j._openCount === 1 && (document.body.style.overflow = "hidden")) : this.hasAttribute("data-scroll-locked") && (this.removeAttribute("data-scroll-locked"), j._openCount = Math.max(0, j._openCount - 1), j._openCount === 0 && (document.body.style.overflow = ""));
  }
  _atualizarFocables() {
    const t = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"]), ui-campo-texto, ui-botao, ui-botao-primario, ui-checkbox, ui-switch, ui-lista-flutuante, ui-radio, ui-select';
    let e = Array.from(this.shadowRoot.querySelectorAll(t));
    e = e.filter((r) => window.getComputedStyle(r).display !== "none");
    const o = this.shadowRoot.querySelectorAll("slot");
    let a = [];
    o.forEach((r) => {
      r.assignedElements({ flatten: !0 }).forEach((l) => {
        l instanceof HTMLElement && (l.matches(t) && a.push(l), a.push(...Array.from(l.querySelectorAll(t))));
      });
    }), this._focables = [...e, ...a].filter((r) => !r.hasAttribute("disabled") && r.getAttribute("aria-hidden") !== "true");
  }
  _isTopMostModal() {
    const t = Array.from(document.querySelectorAll("ui-modal[aberto], ui-modal[open], ui-dialog[aberto], ui-dialog[open]"));
    return t[t.length - 1] === this;
  }
};
c(j, "_openCount", 0);
let et = j;
class _e extends et {
}
customElements.get("ui-modal") || customElements.define("ui-modal", et);
customElements.get("ui-dialog") || customElements.define("ui-dialog", _e);
const we = ':host{display:block;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-drawer__backdrop{position:fixed;top:0;left:0;width:100vw;height:100vh;background-color:#000000a6;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);z-index:9998;opacity:0;pointer-events:none;transition:opacity .25s ease}:host([aberto]) .ui-drawer__backdrop,:host([open]) .ui-drawer__backdrop{opacity:1;pointer-events:auto}.ui-drawer__painel{position:fixed;z-index:9999;background-color:var(--ui-cor-fundo-card, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));box-shadow:0 16px 40px #000000b3;display:flex;flex-direction:column;opacity:0;visibility:hidden;pointer-events:none;transition:transform .25s cubic-bezier(.16,1,.3,1),opacity .2s ease,visibility .2s ease;box-sizing:border-box;color:var(--ui-cor-texto, #e1e1e6)}:root[data-tema=claro] .ui-drawer__painel,[data-tema=claro] .ui-drawer__painel{background-color:#fff;border-color:#0000001f;box-shadow:0 12px 32px #00000026;color:#1a1a1e}:host(:not([posicao])) .ui-drawer__painel,:host([posicao="direita"]) .ui-drawer__painel,:host([position="right"]) .ui-drawer__painel{top:0;right:0;bottom:0;width:var(--ui-drawer-largura, 480px);max-width:92vw;height:100vh;transform:translate(100%);border-left:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16))}:host([aberto]:not([posicao])) .ui-drawer__painel,:host([open]:not([posicao])) .ui-drawer__painel,:host([aberto][posicao="direita"]) .ui-drawer__painel,:host([open][posicao="direita"]) .ui-drawer__painel,:host([aberto][position="right"]) .ui-drawer__painel,:host([open][position="right"]) .ui-drawer__painel{transform:translate(0);opacity:1;visibility:visible;pointer-events:auto}:host([posicao="esquerda"]) .ui-drawer__painel,:host([position="left"]) .ui-drawer__painel{top:0;left:0;bottom:0;width:var(--ui-drawer-largura, 480px);max-width:92vw;height:100vh;transform:translate(-100%);border-right:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16))}:host([aberto][posicao="esquerda"]) .ui-drawer__painel,:host([open][posicao="esquerda"]) .ui-drawer__painel,:host([aberto][position="left"]) .ui-drawer__painel,:host([open][position="left"]) .ui-drawer__painel{transform:translate(0);opacity:1;visibility:visible;pointer-events:auto}:host([posicao="baixo"]) .ui-drawer__painel,:host([position="bottom"]) .ui-drawer__painel{bottom:0;left:0;right:0;width:100vw;max-height:85vh;transform:translateY(100%);border-top:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-top-left-radius:14px;border-top-right-radius:14px}:host([aberto][posicao="baixo"]) .ui-drawer__painel,:host([open][posicao="baixo"]) .ui-drawer__painel,:host([aberto][position="bottom"]) .ui-drawer__painel,:host([open][position="bottom"]) .ui-drawer__painel{transform:translateY(0);opacity:1;visibility:visible;pointer-events:auto}:host([posicao="cima"]) .ui-drawer__painel,:host([position="top"]) .ui-drawer__painel{top:0;left:0;right:0;width:100vw;max-height:85vh;transform:translateY(-100%);border-bottom:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));border-bottom-left-radius:14px;border-bottom-right-radius:14px}:host([aberto][posicao="cima"]) .ui-drawer__painel,:host([open][posicao="cima"]) .ui-drawer__painel,:host([aberto][position="top"]) .ui-drawer__painel,:host([open][position="top"]) .ui-drawer__painel{transform:translateY(0);opacity:1;visibility:visible;pointer-events:auto}.ui-drawer__header{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .08));flex-shrink:0}:root[data-tema=claro] .ui-drawer__header,[data-tema=claro] .ui-drawer__header{border-bottom-color:#00000014}.ui-drawer__titulo-container{display:flex;flex-direction:column;gap:2px}.ui-drawer__titulo{margin:0;font-size:16px;font-weight:600;color:var(--ui-cor-texto, #ffffff)}:root[data-tema=claro] .ui-drawer__titulo,[data-tema=claro] .ui-drawer__titulo{color:#1a1a1e}.ui-drawer__descricao{margin:0;font-size:13px;color:var(--ui-cor-texto-secundario, #888899)}.ui-drawer__close{background:transparent;border:none;color:var(--ui-cor-texto-secundario, #888899);font-size:16px;cursor:pointer;padding:6px;border-radius:6px;line-height:1;display:flex;align-items:center;justify-content:center;transition:color .15s ease,background-color .15s ease}.ui-drawer__close svg,.ui-drawer__close ::slotted(svg){shape-rendering:geometricPrecision}.ui-drawer__close:hover{color:var(--ui-cor-texto, #ffffff);background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-drawer__close:focus-visible{outline:none;box-shadow:0 0 0 2px var(--ui-cor-primaria, #00E08A)}.ui-drawer__body{padding:20px;overflow-y:auto;flex:1;box-sizing:border-box}.ui-drawer__footer{padding:14px 20px;border-top:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .08));display:flex;align-items:center;justify-content:flex-end;gap:10px;background-color:#00000026;flex-shrink:0}:root[data-tema=claro] .ui-drawer__footer,[data-tema=claro] .ui-drawer__footer{border-top-color:#00000014;background-color:#00000008}@starting-style{:host([aberto]:not([posicao])) .ui-drawer__painel,:host([open]:not([posicao])) .ui-drawer__painel,:host([aberto][posicao="direita"]) .ui-drawer__painel,:host([open][posicao="direita"]) .ui-drawer__painel{transform:translate(100%);opacity:0}:host([aberto][posicao="esquerda"]) .ui-drawer__painel,:host([open][posicao="esquerda"]) .ui-drawer__painel{transform:translate(-100%);opacity:0}:host([aberto][posicao="baixo"]) .ui-drawer__painel,:host([open][posicao="baixo"]) .ui-drawer__painel{transform:translateY(100%);opacity:0}:host([aberto]) .ui-drawer__backdrop,:host([open]) .ui-drawer__backdrop{opacity:0}}', rt = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"]), ui-campo-texto, ui-botao, ui-botao-primario, ui-checkbox, ui-switch, ui-lista-flutuante, ui-radio, ui-select, ui-segmented';
function nt(n, i) {
  let t = Array.from(n.querySelectorAll(rt));
  t = t.filter((a) => {
    try {
      return window.getComputedStyle(a).display !== "none";
    } catch {
      return !0;
    }
  });
  const e = n.querySelectorAll("slot"), o = [];
  return e.forEach((a) => {
    a.assignedElements({ flatten: !0 }).forEach((s) => {
      s instanceof HTMLElement && (s.matches(rt) && o.push(s), o.push(...Array.from(s.querySelectorAll(rt))));
    });
  }), [...t, ...o].filter((a) => !a.hasAttribute("disabled") && a.getAttribute("aria-hidden") !== "true");
}
function Ee(n) {
  if (typeof document > "u") return !0;
  const i = Array.from(
    document.querySelectorAll("ui-drawer[aberto], ui-drawer[open], ui-sheet[aberto], ui-sheet[open]")
  );
  return i[i.length - 1] === n;
}
function ke(n, i, t, e) {
  if (i.length === 0) {
    n.preventDefault();
    return;
  }
  const o = i[0], a = i[i.length - 1], r = t.getRootNode(), s = r == null ? void 0 : r.activeElement;
  n.shiftKey ? (s === o || !t.contains(s) && !e.contains(s)) && (n.preventDefault(), a.focus()) : (s === a || !t.contains(s) && !e.contains(s)) && (n.preventDefault(), o.focus());
}
function Ce() {
  if (typeof document > "u") return;
  document.querySelectorAll(
    "ui-modal[aberto], ui-modal[open], ui-dialog[aberto], ui-dialog[open], ui-drawer[aberto], ui-drawer[open], ui-sheet[aberto], ui-sheet[open]"
  ).length > 0 ? document.body.style.overflow = "hidden" : document.body.style.overflow = "";
}
class K extends HTMLElement {
  constructor() {
    super();
    c(this, "backdropElement");
    c(this, "painelElement");
    c(this, "tituloElement");
    c(this, "descricaoElement");
    c(this, "closeElement");
    c(this, "listeners", new F());
    c(this, "_elementoGatilho", null);
    c(this, "_focables", []);
    c(this, "handleSlotChange", () => {
      this.syncState();
    });
    c(this, "handleBackdropClick", (t) => {
      t.stopPropagation(), this.hasAttribute("estatico") || this.hasAttribute("static") || this.fechar();
    });
    c(this, "handleCloseClick", (t) => {
      t.stopPropagation(), this.fechar();
    });
    c(this, "handleKeyDown", (t) => {
      this.aberto && Ee(this) && (t.key === "Escape" ? this.hasAttribute("estatico") || this.hasAttribute("static") || (this.fechar(), t.stopImmediatePropagation()) : t.key === "Tab" && (this._focables = nt(this.shadowRoot), ke(t, this._focables, this, this.shadowRoot)));
    });
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${we}</style>
      <div class="ui-drawer__backdrop"></div>
      <aside class="ui-drawer__painel" role="dialog" aria-modal="true" tabindex="-1">
        <div class="ui-drawer__header">
          <div class="ui-drawer__titulo-container">
            <h3 class="ui-drawer__titulo"></h3>
            <p class="ui-drawer__descricao" style="display: none;"></p>
          </div>
          <button type="button" class="ui-drawer__close" aria-label="Fechar painel lateral" title="Fechar">✕</button>
        </div>
        <div class="ui-drawer__body">
          <slot></slot>
        </div>
        <div class="ui-drawer__footer">
          <slot name="rodape"></slot>
          <slot name="footer"></slot>
        </div>
      </aside>
    `, this.backdropElement = t.querySelector(".ui-drawer__backdrop"), this.painelElement = t.querySelector(".ui-drawer__painel"), this.tituloElement = t.querySelector(".ui-drawer__titulo"), this.descricaoElement = t.querySelector(".ui-drawer__descricao"), this.closeElement = t.querySelector(".ui-drawer__close");
  }
  static get observedAttributes() {
    return [
      "aberto",
      "open",
      "posicao",
      "position",
      "titulo",
      "title",
      "descricao",
      "description",
      "largura",
      "width",
      "estatico",
      "static"
    ];
  }
  connectedCallback() {
    this.listeners.cleanup(), this.listeners.add(this.backdropElement, "click", this.handleBackdropClick), this.listeners.add(this.closeElement, "click", this.handleCloseClick), this.listeners.add(window, "keydown", this.handleKeyDown), this.shadowRoot.querySelectorAll("slot").forEach((e) => {
      this.listeners.add(e, "slotchange", this.handleSlotChange);
    }), this.syncState();
  }
  disconnectedCallback() {
    this.listeners.cleanup(), K.atualizarScrollLock();
  }
  attributeChangedCallback(t, e, o) {
    (t === "aberto" || t === "open") && o !== null && (document.activeElement && document.activeElement !== document.body && (this._elementoGatilho = document.activeElement), setTimeout(() => {
      this._focables = nt(this.shadowRoot), this._focables.length > 0 ? this._focables[0].focus() : this.painelElement.focus();
    }, 0)), this.syncState();
  }
  get aberto() {
    return this.hasAttribute("aberto") || this.hasAttribute("open");
  }
  set aberto(t) {
    t ? this.setAttribute("aberto", "") : (this.removeAttribute("aberto"), this.removeAttribute("open")), this.syncState();
  }
  get posicao() {
    const t = (this.getAttribute("posicao") || this.getAttribute("position") || "direita").toLowerCase();
    return t === "esquerda" || t === "left" ? "esquerda" : t === "baixo" || t === "bottom" ? "baixo" : t === "cima" || t === "top" ? "cima" : "direita";
  }
  set posicao(t) {
    this.setAttribute("posicao", t);
  }
  abrir() {
    this.aberto || (document.activeElement && document.activeElement !== document.body && (this._elementoGatilho = document.activeElement), this.aberto = !0, this.dispatchEvent(
      new CustomEvent("ui-abrir", {
        bubbles: !0,
        composed: !0
      })
    ), setTimeout(() => {
      this._focables = nt(this.shadowRoot), this._focables.length > 0 ? this._focables[0].focus() : this.painelElement.focus();
    }, 0));
  }
  fechar() {
    this.aberto && (this.aberto = !1, this.dispatchEvent(
      new CustomEvent("ui-fechar", {
        bubbles: !0,
        composed: !0
      })
    ), this._elementoGatilho && (this._elementoGatilho.focus(), this._elementoGatilho = null));
  }
  alternar() {
    this.aberto ? this.fechar() : this.abrir();
  }
  syncState() {
    var s, l;
    const t = this.aberto, e = this.getAttribute("titulo") || this.getAttribute("title") || "", o = this.getAttribute("descricao") || this.getAttribute("description") || "", a = this.getAttribute("largura") || this.getAttribute("width"), r = (s = this.shadowRoot) == null ? void 0 : s.querySelector(".ui-drawer__footer");
    if (this.painelElement.setAttribute("aria-hidden", String(!t)), e ? (this.tituloElement.textContent = e, this.tituloElement.style.display = "block") : this.tituloElement.style.display = "none", o ? (this.descricaoElement.textContent = o, this.descricaoElement.style.display = "block") : this.descricaoElement.style.display = "none", a ? this.style.setProperty("--ui-drawer-largura", isNaN(Number(a)) ? a : `${a}px`) : this.style.removeProperty("--ui-drawer-largura"), r) {
      const u = Array.from(((l = this.shadowRoot) == null ? void 0 : l.querySelectorAll('slot[name="rodape"], slot[name="footer"]')) || []).some((d) => d.assignedNodes({ flatten: !0 }).some((m) => m.nodeType === Node.ELEMENT_NODE || m.textContent && m.textContent.trim() !== "")) || this.querySelector('[slot="rodape"], [slot="footer"]') !== null;
      r.style.display = u ? "flex" : "none";
    }
    K.atualizarScrollLock();
  }
  static atualizarScrollLock() {
    Ce();
  }
}
class Ae extends K {
}
class Se extends K {
}
class ze extends K {
}
customElements.get("ui-drawer") || customElements.define("ui-drawer", K);
customElements.get("ui-sheet") || customElements.define("ui-sheet", Ae);
customElements.get("ui-painel-lateral") || customElements.define("ui-painel-lateral", Se);
customElements.get("ui-gaveta") || customElements.define("ui-gaveta", ze);
const Le = ':host{display:block;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-alerta{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-radius:var(--ui-raio-borda, 8px);border:1px solid transparent;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);box-sizing:border-box;position:relative;transition:opacity .2s ease,transform .2s ease;line-height:1.4}.ui-alerta__icone{display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;line-height:1}.ui-alerta__icone svg,.ui-alerta__icone ::slotted(svg),.ui-alerta__icone ::slotted(ui-icone){shape-rendering:geometricPrecision}.ui-alerta__conteudo{flex:1}.ui-alerta__titulo{font-size:14px;font-weight:600;margin:0 0 2px;line-height:1.2}.ui-alerta__mensagem{font-size:13px;margin:0;opacity:.9}.ui-alerta__close{background:transparent;border:none;color:currentColor;opacity:.7;font-size:14px;cursor:pointer;padding:2px 6px;border-radius:4px;line-height:1;flex-shrink:0;margin-top:-2px;margin-right:-4px;transition:opacity .15s ease,background-color .15s ease}.ui-alerta__close:hover{opacity:1;background-color:#ffffff26}.ui-alerta--sucesso{background-color:#00e08a1f;border-color:#00e08a4d;color:var(--ui-cor-texto-sucesso, #00E08A)}.ui-alerta--sucesso .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}.ui-alerta--erro{background-color:#ff55551f;border-color:#ff55554d;color:var(--ui-cor-texto-erro, #ff5555)}.ui-alerta--erro .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}.ui-alerta--alerta{background-color:#ffb86c1f;border-color:#ffb86c4d;color:var(--ui-cor-texto-alerta, #ffb86c)}.ui-alerta--alerta .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}.ui-alerta--info{background-color:#00aaff1f;border-color:#00aaff4d;color:#0af}.ui-alerta--info .ui-alerta__mensagem{color:var(--ui-cor-texto, #e1e1e6)}.ui-alerta__acoes{display:flex;align-items:center;flex-shrink:0;margin-left:4px}.ui-alerta__botao-acao{background:#ffffff14;border:1px solid rgba(255,255,255,.16);color:inherit;font-family:inherit;font-size:12px;font-weight:600;padding:4px 10px;border-radius:5px;cursor:pointer;line-height:1;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;transition:background-color .15s ease,border-color .15s ease,transform .1s ease}.ui-alerta__botao-acao:hover{background:#ffffff2e;border-color:#ffffff4d}.ui-alerta__botao-acao:active{transform:scale(.96)}.ui-alerta__botao-acao:focus-visible{outline:none;box-shadow:0 0 0 2px var(--ui-cor-fundo, #0b0b0d),0 0 0 4px var(--ui-cor-primaria, #00E08A)}.ui-alerta__botao-acao--primario{background:#00e08a26;border-color:#00e08a59;color:var(--ui-cor-primaria, #00E08A)}.ui-alerta__botao-acao--primario:hover{background:#00e08a40;border-color:#00e08a80}.ui-alerta__botao-acao--destrutivo{background:#ff444426;border-color:#ff444459;color:var(--ui-cor-texto-erro, #ff5555)}.ui-alerta__botao-acao--destrutivo:hover{background:#ff444440;border-color:#ff444480}:host(ui-toast){display:block;width:100%;box-sizing:border-box;pointer-events:auto;transition:transform .25s cubic-bezier(.16,1,.3,1),opacity .25s ease}.ui-toast__banner{box-shadow:0 10px 32px #000000a6,0 0 0 1px #ffffff14;animation:ui-toast-slide .3s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden}.ui-toast__progresso{position:absolute;bottom:0;left:0;right:0;height:2px;background:#ffffff14;overflow:hidden}.ui-toast__progresso-barra{width:100%;height:100%;background:currentColor;opacity:.7;transform-origin:left;animation:ui-toast-timer linear forwards}:host(ui-toast:hover) .ui-toast__progresso-barra,:host(ui-toast:focus-within) .ui-toast__progresso-barra{animation-play-state:paused}@keyframes ui-toast-timer{0%{transform:scaleX(1)}to{transform:scaleX(0)}}@keyframes ui-toast-slide{0%{transform:translate(100%);opacity:0}to{transform:translate(0);opacity:1}}@starting-style{:host(ui-toast){opacity:0;transform:translateY(12px) scale(.96)}}', bt = {
  sucesso: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  erro: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  alerta: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  info: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
};
class Ct extends HTMLElement {
  constructor() {
    super();
    c(this, "alertaElement");
    c(this, "iconeElement");
    c(this, "tituloElement");
    c(this, "mensagemElement");
    c(this, "mensagemTextoElement");
    c(this, "closeElement");
    c(this, "acoesElement");
    c(this, "botaoAcaoElement");
    c(this, "progressoContainer");
    c(this, "progressoBarra");
    c(this, "listeners", new F());
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${Le}</style>
      <div class="ui-alerta" role="alert">
        <span class="ui-alerta__icone"></span>
        <div class="ui-alerta__conteudo">
          <h4 class="ui-alerta__titulo" style="display: none;"></h4>
          <p class="ui-alerta__mensagem">
            <span class="ui-alerta__mensagem-texto" style="display: none;"></span>
            <slot></slot>
          </p>
        </div>
        <div class="ui-alerta__acoes" style="display: none;">
          <button type="button" class="ui-alerta__botao-acao"></button>
        </div>
        <button class="ui-alerta__close" type="button" aria-label="Fechar alerta" style="display: none;" title="Fechar">✕</button>
        <div class="ui-toast__progresso" style="display: none;">
          <div class="ui-toast__progresso-barra"></div>
        </div>
      </div>
    `, this.alertaElement = t.querySelector(".ui-alerta"), this.iconeElement = t.querySelector(".ui-alerta__icone"), this.tituloElement = t.querySelector(".ui-alerta__titulo"), this.mensagemElement = t.querySelector(".ui-alerta__mensagem"), this.mensagemTextoElement = t.querySelector(".ui-alerta__mensagem-texto"), this.closeElement = t.querySelector(".ui-alerta__close"), this.acoesElement = t.querySelector(".ui-alerta__acoes"), this.botaoAcaoElement = t.querySelector(".ui-alerta__botao-acao"), this.progressoContainer = t.querySelector(".ui-toast__progresso"), this.progressoBarra = t.querySelector(".ui-toast__progresso-barra");
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
    this.listeners.cleanup(), this.listeners.add(this.closeElement, "click", () => this.fechar()), this.syncState();
  }
  disconnectedCallback() {
    this.listeners.cleanup();
  }
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  fechar() {
    this.dispatchEvent(
      new CustomEvent("ui-fechar", {
        bubbles: !0,
        composed: !0
      })
    ), this.remove();
  }
  syncState() {
    const t = this.getAttribute("tipo") || this.getAttribute("variante") || this.getAttribute("variant") || "info", e = this.getAttribute("titulo") || this.getAttribute("title"), o = this.getAttribute("mensagem"), a = this.hasAttribute("fechavel") || this.hasAttribute("dismissible");
    this.alertaElement.className = `ui-alerta ui-alerta--${t}`;
    const r = bt[t] || bt.info;
    this.iconeElement.innerHTML = r, e ? (this.tituloElement.textContent = e, this.tituloElement.style.display = "block") : (this.tituloElement.style.display = "none", this.tituloElement.textContent = ""), o ? (this.mensagemTextoElement.textContent = o, this.mensagemTextoElement.style.display = "inline") : (this.mensagemTextoElement.style.display = "none", this.mensagemTextoElement.textContent = ""), a ? this.closeElement.style.display = "block" : this.closeElement.style.display = "none";
  }
}
customElements.get("ui-alerta") || customElements.define("ui-alerta", Ct);
class Q extends Ct {
  constructor() {
    super(...arguments);
    c(this, "timerId", null);
    c(this, "tempoRestante", 4e3);
    c(this, "inicioTimestamp", 0);
    c(this, "isPausado", !1);
    c(this, "acaoConfig");
    c(this, "containerRef", null);
    c(this, "handleAcaoClick", (t) => {
      var e, o, a;
      t.stopPropagation(), (e = this.acaoConfig) != null && e.onClick && this.acaoConfig.onClick(t), this.dispatchEvent(
        new CustomEvent("ui-toast-acao", {
          detail: {
            rotulo: (o = this.acaoConfig) == null ? void 0 : o.rotulo,
            tipo: (a = this.acaoConfig) == null ? void 0 : a.tipo
          },
          bubbles: !0,
          composed: !0
        })
      ), this.fechar();
    });
    c(this, "pausarTimer", () => {
      if (this.isPausado || this.tempoRestante <= 0) return;
      this.isPausado = !0, this.timerId && (clearTimeout(this.timerId), this.timerId = null);
      const t = Date.now() - this.inicioTimestamp;
      this.tempoRestante = Math.max(0, this.tempoRestante - t), this.progressoBarra.style.animationPlayState = "paused";
    });
    c(this, "retomarTimer", () => {
      !this.isPausado || this.tempoRestante <= 0 || (this.isPausado = !1, this.progressoBarra.style.animationPlayState = "running", this.iniciarTimer(Math.max(this.tempoRestante, 300)));
    });
  }
  configurarAcao(t) {
    this.acaoConfig = t, this.botaoAcaoElement.textContent = t.rotulo, this.acoesElement.style.display = "flex";
    const e = t.tipo || "primario";
    this.botaoAcaoElement.className = `ui-alerta__botao-acao ui-alerta__botao-acao--${e}`;
  }
  connectedCallback() {
    super.connectedCallback(), this.containerRef = this.parentElement, this.alertaElement.classList.add("ui-toast__banner"), this.acaoConfig && this.listeners.add(this.botaoAcaoElement, "click", this.handleAcaoClick);
    const t = this.getAttribute("duracao") || this.getAttribute("duration") || "4000", e = parseInt(t, 10);
    this.tempoRestante = isNaN(e) ? 4e3 : e, this.tempoRestante > 0 ? (this.progressoContainer.style.display = "block", this.progressoBarra.style.animationDuration = `${this.tempoRestante}ms`, this.getAttribute("pausar-no-hover") !== "false" && (this.listeners.add(this, "mouseenter", this.pausarTimer), this.listeners.add(this, "mouseleave", this.retomarTimer), this.listeners.add(this, "focusin", this.pausarTimer), this.listeners.add(this, "focusout", this.retomarTimer)), this.iniciarTimer(this.tempoRestante)) : this.progressoContainer.style.display = "none";
  }
  fechar() {
    const t = this.parentElement || this.containerRef;
    super.fechar(), t && t.id.startsWith("ui-toast-container-") && t.children.length === 0 && t.remove();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.timerId && (clearTimeout(this.timerId), this.timerId = null), this.containerRef && this.containerRef.id.startsWith("ui-toast-container-") && this.containerRef.children.length === 0 && (this.containerRef.remove(), this.containerRef = null);
  }
  iniciarTimer(t) {
    this.timerId && clearTimeout(this.timerId), this.inicioTimestamp = Date.now(), this.timerId = setTimeout(() => {
      this.fechar();
    }, t);
  }
  static obterContainer(t) {
    const e = `ui-toast-container-${t}`;
    let o = document.getElementById(e);
    return o || (o = document.createElement("div"), o.id = e, o.style.position = "fixed", o.style.zIndex = "10000", o.style.display = "flex", o.style.gap = "10px", o.style.maxWidth = "400px", o.style.width = "calc(100vw - 32px)", o.style.pointerEvents = "none", o.style.boxSizing = "border-box", o.style.transition = "all 0.2s ease", t === "top-right" ? (o.style.top = "20px", o.style.right = "20px", o.style.flexDirection = "column") : t === "top-left" ? (o.style.top = "20px", o.style.left = "20px", o.style.flexDirection = "column") : t === "bottom-left" ? (o.style.bottom = "20px", o.style.left = "20px", o.style.flexDirection = "column-reverse") : t === "top-center" ? (o.style.top = "20px", o.style.left = "50%", o.style.transform = "translateX(-50%)", o.style.flexDirection = "column") : t === "bottom-center" ? (o.style.bottom = "20px", o.style.left = "50%", o.style.transform = "translateX(-50%)", o.style.flexDirection = "column-reverse") : (o.style.bottom = "20px", o.style.right = "20px", o.style.flexDirection = "column-reverse"), document.body.appendChild(o)), o;
  }
  // Utilitário estático para disparo imperativo de Toasts de qualquer lugar no código
  static notificar(t) {
    const e = t.posicao || "bottom-right", o = document.createElement("ui-toast");
    return t.tipo && o.setAttribute("tipo", t.tipo), t.titulo && o.setAttribute("titulo", t.titulo), t.mensagem && o.setAttribute("mensagem", t.mensagem), t.duracao !== void 0 && o.setAttribute("duracao", String(t.duracao)), t.pausarNoHover === !1 && o.setAttribute("pausar-no-hover", "false"), o.setAttribute("posicao", e), t.fechavel !== !1 && o.setAttribute("fechavel", ""), t.acao && o.configurarAcao(t.acao), Q.obterContainer(e).appendChild(o), o;
  }
}
customElements.get("ui-toast") || customElements.define("ui-toast", Q);
const Me = ":host{display:inline-flex;position:relative;align-items:center;justify-content:center;vertical-align:middle;box-sizing:border-box;--ui-tooltip-texto-distancia: 260px;--ui-tooltip-seta-espaco: 70px}.ui-tooltip__bubble{position:fixed;z-index:10001;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:500;background-color:var(--ui-cor-fundo-elevado, #1e1e24);color:var(--ui-cor-texto, #e1e1e6);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));box-shadow:0 4px 16px #00000080;white-space:normal;max-width:var(--ui-tooltip-texto-distancia, 260px);width:max-content;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s ease,visibility .15s ease;line-height:1.35;box-sizing:border-box;-webkit-user-select:none;user-select:none;margin:0}.ui-tooltip__bubble[popover]{margin:0;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .16));background-color:var(--ui-cor-fundo-elevado, #1e1e24);color:var(--ui-cor-texto, #e1e1e6);padding:6px 10px;overflow:visible;max-width:var(--ui-tooltip-texto-distancia, 260px);width:max-content;white-space:normal}.ui-tooltip__texto{display:inline-block;max-width:100%}.ui-tooltip__arrow{position:absolute;width:0;height:0;border-style:solid}.ui-tooltip--topo .ui-tooltip__arrow{bottom:-5px;left:50%;transform:translate(-50%);border-width:5px 5px 0 5px;border-color:var(--ui-cor-fundo-elevado, #1e1e24) transparent transparent transparent}.ui-tooltip--baixo .ui-tooltip__arrow{top:-5px;left:50%;transform:translate(-50%);border-width:0 5px 5px 5px;border-color:transparent transparent var(--ui-cor-fundo-elevado, #1e1e24) transparent}.ui-tooltip--esquerda .ui-tooltip__arrow{right:-5px;top:50%;transform:translateY(-50%);border-width:5px 0 5px 5px;border-color:transparent transparent transparent var(--ui-cor-fundo-elevado, #1e1e24)}.ui-tooltip--direita .ui-tooltip__arrow{left:-5px;top:50%;transform:translateY(-50%);border-width:5px 5px 5px 0;border-color:transparent var(--ui-cor-fundo-elevado, #1e1e24) transparent transparent}.ui-tooltip--visivel .ui-tooltip__bubble{opacity:1;visibility:visible;pointer-events:auto;transform:scale(1)}@starting-style{.ui-tooltip--visivel .ui-tooltip__bubble,.ui-tooltip__bubble:popover-open{opacity:0;transform:scale(.94)}}";
class At extends HTMLElement {
  constructor() {
    super();
    c(this, "containerElement");
    c(this, "bubbleElement");
    c(this, "_posicionamentoAtivo", !1);
    c(this, "posicionarBubble", () => {
      if (!this.aberto) return;
      const t = this.getBoundingClientRect(), e = this.bubbleElement.getBoundingClientRect(), o = this.getAttribute("posicao") || this.getAttribute("position") || "topo";
      let a = "topo";
      ["topo", "top"].includes(o) ? a = "topo" : ["baixo", "bottom"].includes(o) ? a = "baixo" : ["esquerda", "left"].includes(o) ? a = "esquerda" : ["direita", "right"].includes(o) && (a = "direita");
      let r = 0, s = 0;
      const l = 8;
      a === "topo" ? (r = t.top - e.height - l, s = t.left + t.width / 2 - e.width / 2) : a === "baixo" ? (r = t.bottom + l, s = t.left + t.width / 2 - e.width / 2) : a === "esquerda" ? (r = t.top + t.height / 2 - e.height / 2, s = t.left - e.width - l) : a === "direita" && (r = t.top + t.height / 2 - e.height / 2, s = t.right + l), s = Math.max(8, Math.min(s, window.innerWidth - e.width - 8)), r = Math.max(8, Math.min(r, window.innerHeight - e.height - 8)), this.bubbleElement.style.top = `${Math.round(r)}px`, this.bubbleElement.style.left = `${Math.round(s)}px`;
    });
    c(this, "handleMouseEnter", () => {
      const t = this.getAttribute("gatilho") || this.getAttribute("trigger") || "hover";
      (t === "hover" || t === "passar-mouse") && this.mostrar();
    });
    c(this, "handleMouseLeave", () => {
      const t = this.getAttribute("gatilho") || this.getAttribute("trigger") || "hover";
      (t === "hover" || t === "passar-mouse") && this.ocultar();
    });
    c(this, "handleClick", (t) => {
      const e = this.getAttribute("gatilho") || this.getAttribute("trigger") || "hover", o = window.matchMedia("(pointer: coarse)").matches;
      (e === "clique" || e === "click" || o) && (t.stopPropagation(), this.aberto = !this.aberto);
    });
    c(this, "handleClickOutside", (t) => {
      t.composedPath().includes(this) || this.ocultar();
    });
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${Me}</style>
      <div class="ui-tooltip ui-tooltip--topo">
        <slot></slot>
        <div class="ui-tooltip__bubble" role="tooltip" popover="manual">
          <span class="ui-tooltip__texto"></span>
          <slot name="conteudo"></slot>
          <span class="ui-tooltip__arrow"></span>
        </div>
      </div>
    `, this.containerElement = t.querySelector(".ui-tooltip"), this.bubbleElement = t.querySelector(".ui-tooltip__bubble");
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
    this.addEventListener("mouseenter", this.handleMouseEnter), this.addEventListener("mouseleave", this.handleMouseLeave), this.addEventListener("focusin", this.handleMouseEnter), this.addEventListener("focusout", this.handleMouseLeave), this.addEventListener("click", this.handleClick), this.syncState();
  }
  disconnectedCallback() {
    this.removeEventListener("mouseenter", this.handleMouseEnter), this.removeEventListener("mouseleave", this.handleMouseLeave), this.removeEventListener("focusin", this.handleMouseEnter), this.removeEventListener("focusout", this.handleMouseLeave), this.removeEventListener("click", this.handleClick), document.removeEventListener("click", this.handleClickOutside), this._posicionamentoAtivo && (this._posicionamentoAtivo = !1, window.removeEventListener("scroll", this.posicionarBubble, { capture: !0 }), window.removeEventListener("resize", this.posicionarBubble)), this.ocultar();
  }
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  get aberto() {
    return this.hasAttribute("aberto") || this.hasAttribute("open");
  }
  set aberto(t) {
    t ? this.setAttribute("aberto", "") : (this.removeAttribute("aberto"), this.removeAttribute("open")), this.syncState();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(t) {
    t ? this.setAttribute("disabled", "") : this.removeAttribute("disabled"), this.syncState();
  }
  mostrar() {
    this.disabled || (this.aberto = !0);
  }
  ocultar() {
    this.aberto = !1;
  }
  syncState() {
    var s;
    const t = this.aberto, e = this.getAttribute("posicao") || this.getAttribute("position") || "topo", o = this.getAttribute("texto") || this.getAttribute("text") || "", a = (s = this.shadowRoot) == null ? void 0 : s.querySelector(".ui-tooltip__texto");
    let r = "topo";
    if (["topo", "top"].includes(e) ? r = "topo" : ["baixo", "bottom"].includes(e) ? r = "baixo" : ["esquerda", "left"].includes(e) ? r = "esquerda" : ["direita", "right"].includes(e) && (r = "direita"), this.containerElement.className = `ui-tooltip ui-tooltip--${r}`, a && (o ? (a.textContent = o, a.style.display = "inline") : a.style.display = "none"), t) {
      if (document.addEventListener("click", this.handleClickOutside), typeof this.bubbleElement.showPopover == "function")
        try {
          this.bubbleElement.showPopover();
        } catch {
        }
      this.containerElement.classList.add("ui-tooltip--visivel"), requestAnimationFrame(() => {
        this.posicionarBubble();
      }), this._posicionamentoAtivo || (this._posicionamentoAtivo = !0, window.addEventListener("scroll", this.posicionarBubble, { capture: !0, passive: !0 }), window.addEventListener("resize", this.posicionarBubble, { passive: !0 }));
    } else {
      if (document.removeEventListener("click", this.handleClickOutside), typeof this.bubbleElement.hidePopover == "function")
        try {
          this.bubbleElement.hidePopover();
        } catch {
        }
      this.containerElement.classList.remove("ui-tooltip--visivel"), this._posicionamentoAtivo && (this._posicionamentoAtivo = !1, window.removeEventListener("scroll", this.posicionarBubble, { capture: !0 }), window.removeEventListener("resize", this.posicionarBubble));
    }
  }
}
class Pe extends At {
}
customElements.get("ui-tooltip") || customElements.define("ui-tooltip", At);
customElements.get("ui-popover") || customElements.define("ui-popover", Pe);
class Ie {
  constructor(i) {
    c(this, "autoFetchController", null);
    this.ctx = i;
  }
  async carregar(i) {
    if (!i) return;
    this.autoFetchController && (this.autoFetchController.abort(), this.autoFetchController = null);
    const t = new AbortController();
    this.autoFetchController = t, this.ctx.onCarregandoAlterado(!0), this.ctx.host.dispatchEvent(
      new CustomEvent("ui-fetch-start", {
        bubbles: !0,
        composed: !0,
        detail: { url: i }
      })
    );
    try {
      const e = await fetch(i, { signal: t.signal });
      if (!e.ok)
        throw new Error(`HTTP ${e.status}: ${e.statusText}`);
      const o = await e.json(), a = Array.isArray(o) ? o : o.dados || o.items || o.data || o.rows || [];
      this.autoFetchController === t && (this.ctx.onDadosRecebidos(a), this.ctx.onCarregandoAlterado(!1), this.autoFetchController = null, this.ctx.host.dispatchEvent(
        new CustomEvent("ui-fetch-sucesso", {
          bubbles: !0,
          composed: !0,
          detail: { url: i, total: a.length, dados: a }
        })
      ));
    } catch (e) {
      if (e.name === "AbortError")
        return;
      this.autoFetchController === t && (this.ctx.onCarregandoAlterado(!1), this.autoFetchController = null, console.error("[ui-tabela] Erro ao carregar dados remotos:", e), this.ctx.host.dispatchEvent(
        new CustomEvent("ui-fetch-erro", {
          bubbles: !0,
          composed: !0,
          detail: { url: i, erro: e.message || String(e) }
        })
      ));
    }
  }
  abortar() {
    this.autoFetchController && (this.autoFetchController.abort(), this.autoFetchController = null);
  }
}
function Te(n, i, t = "id") {
  if (!n || n.length === 0) return -1;
  if (typeof i == "function")
    return n.findIndex(i);
  const e = n.findIndex((o) => !o || typeof o != "object" ? !1 : o[t] !== void 0 && (o[t] === i || String(o[t]) === String(i)) || o.id !== void 0 && (o.id === i || String(o.id) === String(i)) || o._id !== void 0 && (o._id === i || String(o._id) === String(i)) || o.codigo !== void 0 && (o.codigo === i || String(o.codigo) === String(i)) || o.key !== void 0 && (o.key === i || String(o.key) === String(i)));
  if (e !== -1)
    return e;
  if (typeof i == "number" && Number.isInteger(i)) {
    if (i >= 0 && i < n.length)
      return i;
  } else if (typeof i == "string" && /^\d+$/.test(i.trim())) {
    const o = parseInt(i.trim(), 10);
    if (o >= 0 && o < n.length)
      return o;
  }
  return -1;
}
class gt {
  constructor(i) {
    c(this, "itemSelecionado", null);
    c(this, "indiceSelecionado", null);
    this.ctx = i;
  }
  getItemSelecionado() {
    return this.itemSelecionado;
  }
  setItemSelecionado(i) {
    this.itemSelecionado = i, this.indiceSelecionado = i ? this.ctx.dadosExibicao.indexOf(i) : null, this.atualizarLinhasSelecionadas();
  }
  getIndiceSelecionado() {
    return this.indiceSelecionado;
  }
  setIndiceSelecionado(i) {
    this.indiceSelecionado = i, this.itemSelecionado = i !== null && i >= 0 && i < this.ctx.dadosExibicao.length ? this.ctx.dadosExibicao[i] : null, this.atualizarLinhasSelecionadas();
  }
  limparSelecao() {
    this.itemSelecionado = null, this.indiceSelecionado = null, this.atualizarLinhasSelecionadas();
  }
  isItemSelecionado(i, t) {
    if (this.itemSelecionado) {
      if (this.itemSelecionado === i) return !0;
      const e = this.ctx.chaveId;
      if (i[e] !== void 0 && this.itemSelecionado[e] !== void 0)
        return String(i[e]) === String(this.itemSelecionado[e]);
      if (i.id !== void 0 && this.itemSelecionado.id !== void 0)
        return String(i.id) === String(this.itemSelecionado.id);
    }
    return this.indiceSelecionado !== null && this.indiceSelecionado === t;
  }
  atualizarLinhasSelecionadas() {
    if (!this.ctx.tbodyElement) return;
    this.ctx.tbodyElement.querySelectorAll("tr:not(.ui-tabela__virtual-spacer)").forEach((t) => {
      const e = t.getAttribute("data-index"), o = e !== null ? parseInt(e, 10) : -1, a = o >= 0 ? this.ctx.dadosExibicao[o] : null, r = a ? this.isItemSelecionado(a, o) : !1;
      t.classList.toggle("ui-tabela__tr--selecionada", r), r ? t.setAttribute("data-selecionada", "true") : t.removeAttribute("data-selecionada");
    });
  }
  rolarPara(i, t) {
    var l, h, u;
    const e = Te(this.ctx.dadosExibicao, i, this.ctx.chaveId);
    if (e === -1)
      return !1;
    const o = this.ctx.dadosExibicao[e], a = (t == null ? void 0 : t.comportamento) || "smooth";
    t != null && t.selecionar && (this.itemSelecionado = o, this.indiceSelecionado = e, this.atualizarLinhasSelecionadas(), this.ctx.host.dispatchEvent(
      new CustomEvent("ui-linha-selecionada", {
        bubbles: !0,
        composed: !0,
        detail: { item: o, indice: e }
      })
    ));
    const r = this.ctx.getRowHeight(), s = (l = this.ctx.tbodyElement) == null ? void 0 : l.querySelector(
      `tr[data-index="${e}"]`
    );
    if (s && !s.classList.contains("ui-tabela__virtual-spacer"))
      return this.ctx.containerElement && (typeof window.happyDOM < "u" || typeof process < "u" && ((h = process.env) == null ? void 0 : h.NODE_ENV) === "test") && (this.ctx.containerElement.scrollTop = e * r), typeof s.scrollIntoView == "function" && s.scrollIntoView({ behavior: a, block: "nearest" }), !0;
    if (this.ctx.containerElement) {
      const d = Math.max(0, e * r);
      if (typeof this.ctx.containerElement.scrollTo == "function")
        try {
          this.ctx.containerElement.scrollTo({
            top: d,
            behavior: a
          });
        } catch {
          this.ctx.containerElement.scrollTop = d;
        }
      else
        this.ctx.containerElement.scrollTop = d;
      return (a === "auto" || typeof window.happyDOM < "u" || typeof process < "u" && ((u = process.env) == null ? void 0 : u.NODE_ENV) === "test") && (this.ctx.containerElement.scrollTop = d, this.ctx.onRenderBody()), !0;
    }
    return !1;
  }
}
function qe(n, i, t) {
  return n !== t ? {
    idColuna: t,
    direcao: "asc"
  } : i === "asc" ? {
    idColuna: t,
    direcao: "desc"
  } : i === "desc" ? {
    idColuna: null,
    direcao: "original"
  } : {
    idColuna: t,
    direcao: "asc"
  };
}
function Ne(n, i, t) {
  if (!i || t === "original")
    return [...n];
  const e = t === "asc" ? 1 : -1;
  return [...n].sort((o, a) => {
    const r = o[i], s = a[i];
    return r === s ? 0 : r == null ? 1 * e : s == null ? -1 * e : typeof r == "number" && typeof s == "number" ? (r - s) * e : String(r).localeCompare(String(s), "pt-BR", {
      numeric: !0,
      sensitivity: "base"
    }) * e;
  });
}
class Be {
  constructor() {
    c(this, "dadosOriginais", []);
    c(this, "dadosExibicao", []);
    c(this, "colunaOrdenada", null);
    c(this, "direcaoOrdenacao", "original");
    c(this, "ultimoFiltro", "");
  }
  getDadosOriginais() {
    return this.dadosOriginais;
  }
  setDadosOriginais(i) {
    this.dadosOriginais = Array.isArray(i) ? [...i] : [], this.aplicarOrdenacao();
  }
  getDadosExibicao() {
    return this.dadosExibicao;
  }
  getColunaOrdenada() {
    return this.colunaOrdenada;
  }
  setColunaOrdenada(i) {
    this.colunaOrdenada = i, i ? this.direcaoOrdenacao === "original" && (this.direcaoOrdenacao = "asc") : this.direcaoOrdenacao = "original", this.aplicarOrdenacao();
  }
  getDirecaoOrdenacao() {
    return this.direcaoOrdenacao;
  }
  setDirecaoOrdenacao(i) {
    this.direcaoOrdenacao = i || "original", this.direcaoOrdenacao === "original" && (this.colunaOrdenada = null), this.aplicarOrdenacao();
  }
  alternarOrdenacaoColuna(i) {
    if (!i.ordenavel) return null;
    const t = qe(this.colunaOrdenada, this.direcaoOrdenacao, i.id);
    return this.colunaOrdenada = t.idColuna, this.direcaoOrdenacao = t.direcao, this.aplicarOrdenacao(), t;
  }
  aplicarOrdenacao() {
    this.dadosExibicao = Ne(
      this.dadosOriginais,
      this.colunaOrdenada,
      this.direcaoOrdenacao
    );
  }
  filtrar(i) {
    if (this.ultimoFiltro = (i || "").trim().toLowerCase(), !this.ultimoFiltro) {
      this.aplicarOrdenacao();
      return;
    }
    this.dadosExibicao = this.dadosOriginais.filter((t) => Object.values(t).some((e) => e == null ? !1 : String(e).toLowerCase().includes(this.ultimoFiltro)));
  }
}
const $e = ':host{display:block;width:100%;box-sizing:border-box;font-family:inherit;color:var(--ui-cor-texto, #e1e1e6);position:relative}.ui-tabela-container{width:100%;max-width:100%;max-height:var(--ui-tabela-max-height, 500px);overflow-x:auto;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-x pan-y;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 6px);background-color:var(--ui-cor-superficie, #141417);box-sizing:border-box;position:relative}.ui-tabela{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:14px}.ui-tabela thead{position:sticky;top:0;z-index:10;background-color:var(--ui-cor-fundo-elevado, #1a1a1e)}.ui-tabela th{position:sticky;top:0;z-index:10;padding:10px 16px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);font-weight:600;border-bottom:2px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));white-space:nowrap;-webkit-user-select:none;user-select:none;box-sizing:border-box}.ui-tabela__resizer{position:absolute;top:0;right:0;width:6px;height:100%;cursor:col-resize;-webkit-user-select:none;user-select:none;z-index:20;transition:background-color .15s ease}.ui-tabela__resizer:hover,.ui-tabela__resizer--ativo{background-color:var(--ui-cor-primaria, #00E08A)}:host([densidade="compacta"]) th,:host([densidade="compacta"]) td,:host([density="compact"]) th,:host([density="compact"]) td{padding:4px 8px}:host([densidade="normal"]) th,:host([densidade="normal"]) td,:host([density="normal"]) th,:host([density="normal"]) td{padding:10px 16px}:host([densidade="relaxada"]) th,:host([densidade="relaxada"]) td,:host([density="relaxed"]) th,:host([density="relaxed"]) td{padding:16px 20px}.ui-tabela__header-content{display:inline-flex;align-items:center;vertical-align:middle;width:100%;box-sizing:border-box}.ui-tabela__header-text{margin-right:90px;display:inline-flex;align-items:center}.ui-tabela__sort-icon,.ui-tabela__header-icon{width:70px;min-width:70px;max-width:70px;display:inline-flex;justify-content:center;align-items:center;transition:transform .2s ease,opacity .2s ease}.ui-tabela th.ui-tabela__th--ordenavel{cursor:pointer}.ui-tabela th.ui-tabela__th--ordenavel:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-tabela__sort-arrow{display:inline-block;width:12px;height:12px;vertical-align:middle;shape-rendering:geometricPrecision;transition:transform .2s ease,fill .2s ease;fill:var(--ui-cor-primaria, #00E08A)}.ui-tabela__sort-arrow--desc{transform:rotate(180deg)}.ui-tabela__sort-arrow--inativo{opacity:.3;fill:var(--ui-cor-texto-secundario, #888899)}.ui-tabela td{padding:10px 16px;border-bottom:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .06));white-space:nowrap;vertical-align:middle;color:var(--ui-cor-texto, #e1e1e6);box-sizing:border-box}.ui-tabela__cell-content{display:inline-flex;align-items:center;vertical-align:middle}.ui-tabela__cell-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.ui-tabela--alinhar-esquerda{text-align:left}.ui-tabela--alinhar-esquerda .ui-tabela__header-content,.ui-tabela--alinhar-esquerda .ui-tabela__cell-content{justify-content:flex-start}.ui-tabela--alinhar-centro{text-align:center}.ui-tabela--alinhar-centro .ui-tabela__header-content,.ui-tabela--alinhar-centro .ui-tabela__cell-content{justify-content:center}.ui-tabela--alinhar-direita{text-align:right}.ui-tabela--alinhar-direita .ui-tabela__header-content,.ui-tabela--alinhar-direita .ui-tabela__cell-content{justify-content:flex-end}.ui-tabela tbody tr:nth-child(2n){background-color:var(--ui-cor-fundo-card, rgba(255, 255, 255, .02))}.ui-tabela tbody tr:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08))}.ui-tabela tbody tr.ui-tabela__tr--selecionada,.ui-tabela tbody tr[data-selecionada=true]{background-color:#00e08a24!important;box-shadow:inset 3px 0 0 var(--ui-cor-primaria, #00E08A)}.ui-tabela tbody tr.ui-tabela__tr--selecionada:hover,.ui-tabela tbody tr[data-selecionada=true]:hover{background-color:#00e08a38!important}.ui-tabela__virtual-spacer td{padding:0!important;border:none!important;height:inherit;background:transparent!important}.ui-tabela__empty{padding:48px 24px;text-align:center;border:2px dashed var(--ui-cor-borda, rgba(255, 255, 255, .2));border-radius:var(--ui-raio-borda, 6px);margin:16px;color:var(--ui-cor-texto-secundario, #888899);background-color:var(--ui-cor-fundo, #0b0b0d);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;box-sizing:border-box}.ui-tabela__empty-icon{width:32px;height:32px;opacity:.5;fill:currentColor}.ui-tabela__empty-text{font-size:14px;font-weight:500;color:var(--ui-cor-texto-secundario, #888899)}.ui-tabela__loading{position:absolute;top:0;left:0;right:0;bottom:0;background-color:#0b0b0db3;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:50;color:var(--ui-cor-primaria, #00E08A);font-size:14px}.ui-tabela__spinner{width:32px;height:32px;border:3px solid rgba(255,255,255,.15);border-top-color:var(--ui-cor-primaria, #00E08A);border-radius:50%;animation:ui-tabela-spin .8s linear infinite}@keyframes ui-tabela-spin{to{transform:rotate(360deg)}}.ui-tabela__context-menu{position:absolute;z-index:100;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .2));border-radius:var(--ui-raio-borda, 6px);box-shadow:0 4px 20px #0009;padding:6px;display:flex;flex-direction:column;gap:4px;min-width:200px;font-size:13px;color:var(--ui-cor-texto, #e1e1e6)}.ui-tabela__context-item{padding:8px 12px;border-radius:4px;cursor:pointer;color:var(--ui-cor-texto, #e1e1e6);display:flex;align-items:center;justify-content:space-between;gap:8px;transition:background-color .15s ease}.ui-tabela__context-item:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08));color:var(--ui-cor-primaria, #00E08A)}.ui-tabela__prompt-dialog{border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .2));border-radius:var(--ui-raio-borda, 6px);background-color:var(--ui-cor-fundo-elevado, #1a1a1e);color:var(--ui-cor-texto, #e1e1e6);padding:12px;box-shadow:0 8px 32px #000c;font-family:inherit;font-size:14px}.ui-tabela__prompt-dialog::backdrop{background:#0000004d}.ui-tabela__prompt-title{margin-bottom:8px;font-weight:500}.ui-tabela__prompt-dialog input{width:100%;padding:6px 8px;border-radius:4px;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .2));background:var(--ui-cor-superficie, #141417);color:var(--ui-cor-texto, #e1e1e6);margin-bottom:12px;box-sizing:border-box}.ui-tabela__prompt-actions{display:flex;justify-content:flex-end;gap:8px}.ui-tabela__prompt-actions button{background:var(--ui-cor-borda, rgba(255, 255, 255, .12));color:var(--ui-cor-texto, #e1e1e6);border:none;padding:6px 12px;border-radius:4px;cursor:pointer}.ui-tabela__prompt-actions button:last-child{background:var(--ui-cor-primaria, #00E08A);color:#000;font-weight:600}@media (max-width: 640px){.ui-tabela th{padding:8px 10px;font-size:12px}.ui-tabela td{padding:8px 10px;font-size:13px}.ui-tabela__header-text{margin-right:16px}.ui-tabela__sort-icon,.ui-tabela__header-icon{width:24px;min-width:24px;max-width:24px}.ui-tabela__resizer{width:14px}}';
function St(n) {
  return n == null || n === "" ? "" : typeof n == "number" ? `${n}px` : n;
}
function zt(n) {
  return n === "centro" || n === "center" ? "ui-tabela--alinhar-centro" : n === "direita" || n === "right" ? "ui-tabela--alinhar-direita" : "ui-tabela--alinhar-esquerda";
}
function Lt(n) {
  return n === "centro" || n === "center" ? "center" : n === "direita" || n === "right" ? "right" : "left";
}
function Re(n) {
  return n === "compacta" ? 30 : n === "relaxada" ? 56 : 42;
}
function He(n, i, t, e) {
  n.innerHTML = `<style>${$e}</style>`;
  const o = document.createElement("div");
  o.className = "ui-tabela-container", t && (o.style.maxHeight = t);
  const a = document.createElement("div");
  a.className = "ui-tabela__empty", a.style.display = "none";
  const r = document.createElement("div");
  r.innerHTML = `
    <svg class="ui-tabela__empty-icon" viewBox="0 0 24 24">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
    </svg>`;
  const s = document.createElement("span");
  s.className = "ui-tabela__empty-text", s.textContent = i, a.appendChild(r), a.appendChild(s);
  const l = document.createElement("table");
  l.className = "ui-tabela";
  const h = document.createElement("colgroup"), u = document.createElement("thead"), d = document.createElement("tbody");
  l.appendChild(h), l.appendChild(u), l.appendChild(d), o.appendChild(a), o.appendChild(l);
  const p = document.createElement("div");
  return p.className = "ui-tabela__loading", p.style.display = e ? "flex" : "none", p.innerHTML = `
    <div class="ui-tabela__spinner"></div>
    <span>Carregando dados...</span>
  `, o.appendChild(p), n.appendChild(o), {
    containerElement: o,
    tableElement: l,
    theadElement: u,
    tbodyElement: d,
    colgroupElement: h,
    emptyElement: a,
    loadingElement: p
  };
}
function Oe(n) {
  if (!n.theadElement || !n.colgroupElement) return;
  n.headerListeners.cleanup(), n.theadElement.innerHTML = "", n.colgroupElement.innerHTML = "";
  const i = document.createElement("tr");
  n.colunas.forEach((t, e) => {
    const o = document.createElement("col");
    t.largura !== void 0 && (o.style.width = n.formatWidth(t.largura)), n.colgroupElement.appendChild(o);
    const a = document.createElement("th"), r = n.getAlignmentClass(t.alinhamento);
    if (a.className = r, a.style.textAlign = n.getTextAlign(t.alinhamento), t.largura !== void 0 && (a.style.width = n.formatWidth(t.largura)), t.larguraMinima !== void 0 && (a.style.minWidth = n.formatWidth(t.larguraMinima)), t.larguraMaxima !== void 0) {
      const f = n.formatWidth(t.larguraMaxima);
      a.style.maxWidth = f, a.style.overflow = "hidden", a.style.textOverflow = "ellipsis", a.style.whiteSpace = "nowrap";
    }
    if (t.tooltip && (a.title = t.tooltip), t.ordenavel) {
      a.classList.add("ui-tabela__th--ordenavel");
      const f = () => n.onHeaderClick(t);
      n.headerListeners.add(a, "click", f);
    }
    const s = (f) => n.onHeaderContextMenu(f, t, e, a);
    n.headerListeners.add(a, "contextmenu", s);
    const l = document.createElement("div");
    l.className = "ui-tabela__header-content";
    const h = document.createElement("span");
    h.className = "ui-tabela__header-text", h.textContent = t.rotulo, l.appendChild(h);
    const u = document.createElement("span");
    if (u.className = "ui-tabela__sort-icon", t.ordenavel) {
      const f = n.colunaOrdenada === t.id && n.direcaoOrdenacao !== "original", b = f && n.direcaoOrdenacao === "desc", g = f ? "" : "ui-tabela__sort-arrow--inativo", v = b ? "ui-tabela__sort-arrow--desc" : "";
      u.innerHTML = `
        <svg class="ui-tabela__sort-arrow ${g} ${v}" viewBox="0 0 24 24">
          <path d="M7 14l5-5 5 5H7z"/>
        </svg>
      `;
    }
    l.appendChild(u), a.appendChild(l);
    const d = document.createElement("div");
    d.className = "ui-tabela__resizer", d.title = "Arrastar para redimensionar largura (duplo-clique para auto-ajuste)";
    const p = (f) => n.onInitColumnResize(f, t, e, a, d);
    n.headerListeners.add(d, "mousedown", p);
    const m = (f) => {
      f.stopPropagation(), n.onColumnAutoFit(t, a, o);
    };
    n.headerListeners.add(d, "dblclick", m), a.appendChild(d), i.appendChild(a);
  }), n.theadElement.appendChild(i);
}
function De(n) {
  if (!n.tbodyElement || !n.tableElement || !n.emptyElement || !n.containerElement) return;
  if (!n.dadosExibicao || n.dadosExibicao.length === 0) {
    n.emptyElement.style.display = "flex", n.tableElement.style.display = "none";
    return;
  }
  n.emptyElement.style.display = "none", n.tableElement.style.display = "table";
  const i = n.dadosExibicao.length, t = n.rowHeight, e = n.virtualizar && i > 30;
  let o = 0, a = i;
  if (e) {
    const s = n.containerElement.scrollTop, l = n.containerElement.clientHeight || 400, h = 5;
    o = Math.max(0, Math.floor(s / t) - h), a = Math.min(i, Math.ceil((s + l) / t) + h);
  }
  n.tbodyElement.innerHTML = "";
  const r = document.createDocumentFragment();
  if (e && o > 0) {
    const s = document.createElement("tr");
    s.className = "ui-tabela__virtual-spacer", s.style.height = `${o * t}px`;
    const l = document.createElement("td");
    l.colSpan = n.colunas.length || 1, s.appendChild(l), r.appendChild(s);
  }
  for (let s = o; s < a; s++) {
    const l = n.dadosExibicao[s], h = document.createElement("tr");
    h.setAttribute("data-index", String(s));
    const u = n.chaveId;
    l[u] !== void 0 ? h.setAttribute("data-id", String(l[u])) : l.id !== void 0 ? h.setAttribute("data-id", String(l.id)) : l._id !== void 0 && h.setAttribute("data-id", String(l._id)), n.isItemSelecionado(l, s) && (h.classList.add("ui-tabela__tr--selecionada"), h.setAttribute("data-selecionada", "true")), h.addEventListener("click", (d) => {
      const p = d.target;
      p && p.closest("button, input, select, textarea, a, [data-prevent-select]") || n.onLinhaClique(l, s);
    }), n.colunas.forEach((d) => {
      const p = document.createElement("td"), m = n.getAlignmentClass(d.alinhamento);
      if (p.className = m, p.style.textAlign = n.getTextAlign(d.alinhamento), d.larguraMaxima !== void 0) {
        const g = n.formatWidth(d.larguraMaxima);
        p.style.maxWidth = g, p.style.overflow = "hidden", p.style.textOverflow = "ellipsis", p.style.whiteSpace = "nowrap";
      }
      const f = document.createElement("div");
      f.className = "ui-tabela__cell-content", d.larguraMaxima !== void 0 && f.classList.add("ui-tabela__cell-truncate");
      const b = l[d.id];
      if (typeof d.render == "function") {
        const g = d.render(b, l, s);
        g instanceof Node ? f.appendChild(g) : f.textContent = String(g ?? "");
      } else if (b instanceof Node)
        f.appendChild(b);
      else {
        const g = b != null ? String(b) : "";
        f.textContent = g, d.larguraMaxima !== void 0 && !d.tooltip && (p.title = g);
      }
      p.appendChild(f), h.appendChild(p);
    }), r.appendChild(h);
  }
  if (e && a < i) {
    const s = document.createElement("tr");
    s.className = "ui-tabela__virtual-spacer", s.style.height = `${(i - a) * t}px`;
    const l = document.createElement("td");
    l.colSpan = n.colunas.length || 1, s.appendChild(l), r.appendChild(s);
  }
  n.tbodyElement.appendChild(r);
}
function Fe(n) {
  const {
    evento: i,
    coluna: t,
    colIndex: e,
    thElement: o,
    resizer: a,
    colgroupElement: r,
    onResizeStart: s,
    onResizeEnd: l
  } = n;
  i.stopPropagation(), i.preventDefault(), s(), a.classList.add("ui-tabela__resizer--ativo");
  const h = i.pageX, u = o.offsetWidth, d = r == null ? void 0 : r.children[e], p = (b) => {
    const g = b.pageX - h;
    let v = u + g;
    if (t.larguraMinima !== void 0) {
      const w = typeof t.larguraMinima == "number" ? t.larguraMinima : parseInt(t.larguraMinima, 10);
      isNaN(w) || (v = Math.max(w, v));
    } else
      v = Math.max(60, v);
    if (t.larguraMaxima !== void 0) {
      const w = typeof t.larguraMaxima == "number" ? t.larguraMaxima : parseInt(t.larguraMaxima, 10);
      isNaN(w) || (v = Math.min(w, v));
    }
    t.largura = `${v}px`, o.style.width = `${v}px`, d && (d.style.width = `${v}px`);
  }, m = () => {
    f(), l(String(t.largura));
  }, f = () => {
    a.classList.remove("ui-tabela__resizer--ativo"), window.removeEventListener("mousemove", p), window.removeEventListener("mouseup", m);
  };
  return window.addEventListener("mousemove", p), window.addEventListener("mouseup", m), f;
}
function Ve(n) {
  const {
    evento: i,
    coluna: t,
    colIndex: e,
    thElement: o,
    colgroupElement: a,
    shadow: r,
    onResizeEnd: s
  } = n, l = document.createElement("dialog");
  l.className = "ui-tabela__prompt-dialog", l.style.position = "fixed", l.style.left = `${i.clientX}px`, l.style.top = `${i.clientY}px`;
  const h = document.createElement("div");
  h.className = "ui-tabela__prompt-title", h.textContent = `Largura para "${t.rotulo}" (px ou auto):`;
  const u = document.createElement("input");
  u.type = "text";
  const d = t.largura ? String(t.largura).replace("px", "") : "auto";
  u.value = d;
  const p = document.createElement("div");
  p.className = "ui-tabela__prompt-actions";
  const m = document.createElement("button");
  m.textContent = "Aplicar";
  const f = document.createElement("button");
  f.textContent = "Cancelar", p.appendChild(f), p.appendChild(m), l.appendChild(h), l.appendChild(u), l.appendChild(p), r.appendChild(l), l.showModal();
  const b = () => {
    const v = u.value.trim().toLowerCase();
    if (v === "" || v === "auto")
      t.largura = void 0, o.style.width = "", a != null && a.children[e] && (a.children[e].style.width = "");
    else {
      const w = parseInt(v, 10);
      !isNaN(w) && w > 20 && (t.largura = `${w}px`, o.style.width = `${w}px`, a != null && a.children[e] && (a.children[e].style.width = `${w}px`));
    }
    l.close(), l.remove(), s(t.largura ? String(t.largura) : "auto");
  };
  m.addEventListener("click", (g) => {
    g.stopPropagation(), b();
  }), f.addEventListener("click", (g) => {
    g.stopPropagation(), l.close(), l.remove();
  }), u.addEventListener("keydown", (g) => {
    g.key === "Enter" ? (g.preventDefault(), b()) : g.key === "Escape" && (g.preventDefault(), l.close(), l.remove());
  }), setTimeout(() => u.focus(), 10);
}
function je(n, i, t, e, o, a) {
  return Fe({
    evento: n,
    coluna: i,
    colIndex: t,
    thElement: e,
    resizer: o,
    colgroupElement: a.colgroupElement,
    onResizeStart: () => a.onSetIsResizing(!0),
    onResizeEnd: (r) => {
      setTimeout(() => a.onSetIsResizing(!1), 50), a.host.dispatchEvent(
        new CustomEvent("ui-column-resize", {
          detail: { idColuna: i.id, largura: r },
          bubbles: !0,
          composed: !0
        })
      );
    }
  });
}
function Ge(n, i, t, e, o) {
  n.preventDefault(), n.stopPropagation(), Ve({
    evento: n,
    coluna: i,
    colIndex: t,
    thElement: e,
    colgroupElement: o.colgroupElement,
    shadow: o.shadow,
    onResizeEnd: (a) => {
      o.host.dispatchEvent(
        new CustomEvent("ui-column-resize", {
          detail: { idColuna: i.id, largura: a },
          bubbles: !0,
          composed: !0
        })
      );
    }
  });
}
function We(n) {
  Oe({
    theadElement: n.theadElement,
    colgroupElement: n.colgroupElement,
    colunas: n.colunas,
    colunaOrdenada: n.dadosController.getColunaOrdenada(),
    direcaoOrdenacao: n.dadosController.getDirecaoOrdenacao(),
    headerListeners: n.headerListeners,
    formatWidth: St,
    getAlignmentClass: zt,
    getTextAlign: Lt,
    onHeaderClick: (i) => n.onHeaderClick(i),
    onHeaderContextMenu: (i, t, e, o) => {
      Ge(i, t, e, o, {
        host: n.host,
        colgroupElement: n.colgroupElement,
        shadow: n.shadow,
        onSetIsResizing: n.onSetIsResizing
      });
    },
    onInitColumnResize: (i, t, e, o, a) => {
      const r = je(i, t, e, o, a, {
        host: n.host,
        colgroupElement: n.colgroupElement,
        shadow: n.shadow,
        onSetIsResizing: n.onSetIsResizing
      });
      n.onActiveResizeCleanup(r);
    },
    onColumnAutoFit: (i, t, e) => {
      i.largura = void 0, t.style.width = "", e.style.width = "", n.host.dispatchEvent(
        new CustomEvent("ui-column-resize", {
          bubbles: !0,
          composed: !0,
          detail: { idColuna: i.id, largura: "auto" }
        })
      );
    }
  });
}
function Ue(n) {
  De({
    tbodyElement: n.tbodyElement,
    tableElement: n.tableElement,
    emptyElement: n.emptyElement,
    containerElement: n.containerElement,
    dadosExibicao: n.dadosController.getDadosExibicao(),
    colunas: n.colunas,
    chaveId: n.chaveId,
    virtualizar: n.virtualizar,
    rowHeight: n.rowHeight,
    isItemSelecionado: (i, t) => n.selecaoController.isItemSelecionado(i, t),
    onLinhaClique: (i, t) => {
      n.selecaoController.setItemSelecionado(i), n.host.dispatchEvent(
        new CustomEvent("ui-linha-clique", {
          bubbles: !0,
          composed: !0,
          detail: { item: i, indice: t }
        })
      );
    },
    formatWidth: St,
    getAlignmentClass: zt,
    getTextAlign: Lt
  });
}
function Ye(n, i) {
  let t = !1;
  const e = () => {
    t || (window.requestAnimationFrame(() => {
      i(), t = !1;
    }), t = !0);
  };
  return n.addEventListener("scroll", e), e;
}
function Xe(n, i, t, e) {
  return He(n, i, t, e);
}
function Mt(n) {
  const i = n.host.getAttribute("texto-vazio") || n.host.getAttribute("empty-text");
  i && n.onTextoVazioAlterado(i);
  const t = n.host.getAttribute("virtualizar") || n.host.getAttribute("virtualize");
  t !== null && n.onVirtualizarAlterado(t !== "false");
  const e = n.host.getAttribute("src");
  e && n.host.isConnected && n.onCarregarSrc(e);
  const o = n.host.hasAttribute("carregando") || n.host.hasAttribute("loading");
  n.onCarregandoAlterado(o), n.loadingElement && (n.loadingElement.style.display = o ? "flex" : "none");
}
function Ke(n, i, t) {
  if (Mt(t), n === "max-height" && t.containerElement) {
    t.containerElement.style.maxHeight = i || "";
    return;
  }
  if ((n === "texto-vazio" || n === "empty-text") && t.emptyElement) {
    const e = t.emptyElement.querySelector(".ui-tabela__empty-text");
    e && i && (e.textContent = i), t.onRenderBody();
    return;
  }
  if (n === "carregando" || n === "loading") {
    t.loadingElement && (t.loadingElement.style.display = i !== null ? "flex" : "none");
    return;
  }
  if (n === "densidade" || n === "density") {
    t.onRenderBody();
    return;
  }
  t.onRenderTotal();
}
class Ze extends HTMLElement {
  constructor() {
    super();
    c(this, "shadow");
    c(this, "_colunas", []);
    c(this, "_textoVazio", "Nenhum registro encontrado");
    c(this, "_virtualizar", !0);
    c(this, "_isResizing", !1);
    c(this, "_carregando", !1);
    c(this, "_src", null);
    c(this, "_containerElement", null);
    c(this, "_tableElement", null);
    c(this, "_theadElement", null);
    c(this, "_tbodyElement", null);
    c(this, "_colgroupElement", null);
    c(this, "_emptyElement", null);
    c(this, "_loadingElement", null);
    c(this, "_scrollHandler", null);
    c(this, "_activeResizeCleanup", null);
    c(this, "_headerListeners", new F());
    c(this, "remotaController");
    c(this, "selecaoController");
    c(this, "dadosController", new Be());
    this.shadow = this.attachShadow({ mode: "open" }), this.remotaController = new Ie({
      host: this,
      onCarregandoAlterado: (t) => {
        this.carregando = t;
      },
      onDadosRecebidos: (t) => {
        this.dados = t;
      }
    }), this.selecaoController = new gt({
      host: this,
      tbodyElement: null,
      containerElement: null,
      dadosExibicao: this.dadosController.getDadosExibicao(),
      chaveId: this.chaveId,
      getRowHeight: () => this.getRowHeight(),
      onRenderBody: () => this.renderBody()
    });
  }
  static get observedAttributes() {
    return ["texto-vazio", "empty-text", "max-height", "densidade", "density", "virtualizar", "virtualize", "src", "carregando", "loading", "chave-id", "id-key"];
  }
  connectedCallback() {
    this.syncAttributes(), !this.hasAttribute("densidade") && !this.hasAttribute("density") && this.setAttribute("densidade", "normal"), this.renderTotal(), this._src && this.remotaController.carregar(this._src);
  }
  disconnectedCallback() {
    this.cleanupEventListeners();
  }
  attributeChangedCallback(t, e, o) {
    Ke(t, o, this.obterContextoAtributos());
  }
  syncAttributes() {
    Mt(this.obterContextoAtributos());
  }
  obterContextoAtributos() {
    return {
      host: this,
      containerElement: this._containerElement,
      emptyElement: this._emptyElement,
      loadingElement: this._loadingElement,
      onTextoVazioAlterado: (t) => {
        this._textoVazio = t;
      },
      onVirtualizarAlterado: (t) => {
        this._virtualizar = t;
      },
      onCarregarSrc: (t) => {
        this._src = t, this.remotaController.carregar(t);
      },
      onCarregandoAlterado: (t) => {
        this._carregando = t;
      },
      onRenderBody: () => this.renderBody(),
      onRenderTotal: () => this.renderTotal()
    };
  }
  get src() {
    return this._src;
  }
  set src(t) {
    this._src = t, t ? (this.setAttribute("src", t), this.remotaController.carregar(t)) : this.removeAttribute("src");
  }
  get carregando() {
    return this._carregando;
  }
  set carregando(t) {
    this._carregando = !!t, this._carregando ? this.setAttribute("carregando", "") : (this.removeAttribute("carregando"), this.removeAttribute("loading")), this._loadingElement && (this._loadingElement.style.display = this._carregando ? "flex" : "none");
  }
  async carregarDoEndpoint(t) {
    await this.remotaController.carregar(t || this._src || "");
  }
  async recarregar() {
    this._src ? await this.remotaController.carregar(this._src) : (this.dadosController.aplicarOrdenacao(), this.renderBody());
  }
  filtrar(t) {
    this.dadosController.filtrar(t), this.atualizarContextoSelecao(), this.renderBody();
  }
  cleanupEventListeners() {
    this._containerElement && this._scrollHandler && (this._containerElement.removeEventListener("scroll", this._scrollHandler), this._scrollHandler = null), this._activeResizeCleanup && (this._activeResizeCleanup(), this._activeResizeCleanup = null), this.remotaController.abortar(), this._headerListeners.cleanup();
  }
  get colunas() {
    return this._colunas;
  }
  set colunas(t) {
    this._colunas = Array.isArray(t) ? t : [], this.renderTotal();
  }
  get dados() {
    return this.dadosController.getDadosOriginais();
  }
  set dados(t) {
    this.dadosController.setDadosOriginais(t), this.atualizarContextoSelecao(), this.renderBody();
  }
  get itens() {
    return this.dados;
  }
  set itens(t) {
    this.dados = t;
  }
  get chaveId() {
    return this.getAttribute("chave-id") || this.getAttribute("id-key") || "id";
  }
  set chaveId(t) {
    t ? this.setAttribute("chave-id", t) : (this.removeAttribute("chave-id"), this.removeAttribute("id-key")), this.atualizarContextoSelecao();
  }
  get itemSelecionado() {
    return this.selecaoController.getItemSelecionado();
  }
  set itemSelecionado(t) {
    this.selecaoController.setItemSelecionado(t);
  }
  get indiceSelecionado() {
    return this.selecaoController.getIndiceSelecionado();
  }
  set indiceSelecionado(t) {
    this.selecaoController.setIndiceSelecionado(t);
  }
  limparSelecao() {
    this.selecaoController.limparSelecao();
  }
  get densidade() {
    const t = this.getAttribute("densidade") || this.getAttribute("density");
    return t === "compacta" || t === "compact" ? "compacta" : t === "relaxada" || t === "relaxed" ? "relaxada" : "normal";
  }
  set densidade(t) {
    t ? this.setAttribute("densidade", t) : (this.removeAttribute("densidade"), this.removeAttribute("density")), this.renderBody();
  }
  get virtualizar() {
    return this._virtualizar;
  }
  set virtualizar(t) {
    this._virtualizar = !!t, this._virtualizar ? this.setAttribute("virtualizar", "true") : this.removeAttribute("virtualizar"), this.renderTotal();
  }
  get colunaOrdenada() {
    return this.dadosController.getColunaOrdenada();
  }
  set colunaOrdenada(t) {
    this.dadosController.setColunaOrdenada(t), this.renderHeader(), this.renderBody();
  }
  get direcaoOrdenacao() {
    return this.dadosController.getDirecaoOrdenacao();
  }
  set direcaoOrdenacao(t) {
    this.dadosController.setDirecaoOrdenacao(t), this.renderHeader(), this.renderBody();
  }
  get textoVazio() {
    return this._textoVazio;
  }
  set textoVazio(t) {
    this._textoVazio = t || "Nenhum registro encontrado", this.renderTotal();
  }
  handleHeaderClick(t) {
    if (!t.ordenavel || this._isResizing) return;
    const e = this.dadosController.alternarOrdenacaoColuna(t);
    e && (this.atualizarContextoSelecao(), this.renderHeader(), this.renderBody(), this.dispatchEvent(new CustomEvent("ui-sort", { detail: e, bubbles: !0, composed: !0 })));
  }
  getRowHeight() {
    return Re(this.densidade);
  }
  atualizarContextoSelecao() {
    this.selecaoController = new gt({
      host: this,
      tbodyElement: this._tbodyElement,
      containerElement: this._containerElement,
      dadosExibicao: this.dadosController.getDadosExibicao(),
      chaveId: this.chaveId,
      getRowHeight: () => this.getRowHeight(),
      onRenderBody: () => this.renderBody()
    });
  }
  renderTotal() {
    if (this.shadow) {
      if (this._containerElement) {
        if (this._containerElement.style.maxHeight = this.getAttribute("max-height") || "", this._emptyElement) {
          const t = this._emptyElement.querySelector(".ui-tabela__empty-text");
          t && (t.textContent = this._textoVazio);
        }
      } else {
        this.cleanupEventListeners();
        const t = Xe(this.shadow, this._textoVazio, this.getAttribute("max-height"), this._carregando);
        this._containerElement = t.containerElement, this._tableElement = t.tableElement, this._colgroupElement = t.colgroupElement, this._theadElement = t.theadElement, this._tbodyElement = t.tbodyElement, this._emptyElement = t.emptyElement, this._loadingElement = t.loadingElement, this.atualizarContextoSelecao();
      }
      this.renderHeader(), this.renderBody(), this._virtualizar && this._containerElement && !this._scrollHandler && (this._scrollHandler = Ye(this._containerElement, () => this.renderBody()));
    }
  }
  obterContextoRenderizador() {
    return {
      host: this,
      shadow: this.shadow,
      theadElement: this._theadElement,
      colgroupElement: this._colgroupElement,
      tbodyElement: this._tbodyElement,
      tableElement: this._tableElement,
      emptyElement: this._emptyElement,
      containerElement: this._containerElement,
      colunas: this._colunas,
      dadosController: this.dadosController,
      selecaoController: this.selecaoController,
      chaveId: this.chaveId,
      virtualizar: this._virtualizar,
      rowHeight: this.getRowHeight(),
      headerListeners: this._headerListeners,
      onSetIsResizing: (t) => {
        this._isResizing = t;
      },
      onActiveResizeCleanup: (t) => {
        this._activeResizeCleanup = t;
      },
      onHeaderClick: (t) => this.handleHeaderClick(t)
    };
  }
  renderHeader() {
    We(this.obterContextoRenderizador());
  }
  renderBody() {
    Ue(this.obterContextoRenderizador());
  }
  rolarPara(t, e) {
    return this.selecaoController.rolarPara(t, e);
  }
}
customElements.get("ui-tabela") || customElements.define("ui-tabela", Ze);
const Qe = ':host{display:block;box-sizing:border-box;font-family:var(--ui-fonte-base, "Inter", sans-serif)}.ui-stat{padding:18px 20px;border-radius:var(--ui-raio-borda, 10px);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));background-color:var(--ui-cor-fundo-card, #18181c);color:var(--ui-cor-texto, #e1e1e6);box-sizing:border-box;display:flex;flex-direction:column;position:relative;transition:border-color .15s ease,box-shadow .15s ease}:root[data-tema=claro] .ui-stat,[data-tema=claro] .ui-stat{background-color:#fff;border-color:#00000017;color:#1a1a1e;box-shadow:0 1px 3px #0000000a}.ui-stat--baixa{box-shadow:0 2px 6px #0000004d}.ui-stat--media{box-shadow:0 4px 14px #0006}.ui-stat--alta{box-shadow:0 8px 24px #00000080}.ui-stat__cabecalho{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px}.ui-stat__rotulo{font-size:13px;font-weight:500;color:var(--ui-cor-texto-secundario, #888899);letter-spacing:.01em}:root[data-tema=claro] .ui-stat__rotulo,[data-tema=claro] .ui-stat__rotulo{color:#6c757d}.ui-stat__icone-slot{display:flex;align-items:center;color:var(--ui-cor-texto-secundario, #888899)}.ui-stat__icone-slot svg,.ui-stat__icone-slot ::slotted(svg),.ui-stat__icone-slot ::slotted(ui-icone){shape-rendering:geometricPrecision}.ui-stat__conteudo{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px}.ui-stat__valor{font-size:28px;font-weight:700;color:var(--ui-cor-texto, #ffffff);line-height:1.15;letter-spacing:-.025em}:root[data-tema=claro] .ui-stat__valor,[data-tema=claro] .ui-stat__valor{color:#111114}.ui-stat__indicador{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:5px;font-size:12px;font-weight:600;line-height:1}.ui-stat__indicador--positivo,.ui-stat__indicador--alta{background-color:#00e08a24;color:var(--ui-cor-primaria, #00E08A)}.ui-stat__indicador--negativo,.ui-stat__indicador--baixa{background-color:#ff444424;color:var(--ui-cor-texto-erro, #ff5555)}.ui-stat__indicador--neutro{background-color:#ffffff14;color:var(--ui-cor-texto-secundario, #888899)}:root[data-tema=claro] .ui-stat__indicador--neutro,[data-tema=claro] .ui-stat__indicador--neutro{background-color:#f1f3f5;color:#495057}.ui-stat__seta{font-size:.85em;line-height:1}.ui-stat__rodape{display:flex;flex-direction:column;gap:6px}.ui-stat__descricao{font-size:12px;color:var(--ui-cor-texto-secundario, #888899);line-height:1.3}:root[data-tema=claro] .ui-stat__descricao,[data-tema=claro] .ui-stat__descricao{color:#6c757d}';
class pt extends HTMLElement {
  constructor() {
    super();
    c(this, "statElement");
    c(this, "rotuloElement");
    c(this, "valorElement");
    c(this, "indicadorElement");
    c(this, "setaElement");
    c(this, "variacaoElement");
    c(this, "descricaoElement");
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${Qe}</style>
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
    `, this.statElement = t.querySelector(".ui-stat"), this.rotuloElement = t.querySelector(".ui-stat__rotulo"), this.valorElement = t.querySelector(".ui-stat__valor"), this.indicadorElement = t.querySelector(".ui-stat__indicador"), this.setaElement = t.querySelector(".ui-stat__seta"), this.variacaoElement = t.querySelector(".ui-stat__variacao"), this.descricaoElement = t.querySelector(".ui-stat__descricao");
  }
  static get observedAttributes() {
    return [
      "rotulo",
      "label",
      "valor",
      "value",
      "variacao",
      "trend",
      "tendencia",
      "direction",
      "descricao",
      "description",
      "elevacao",
      "elevation"
    ];
  }
  connectedCallback() {
    this.syncState();
  }
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  get rotulo() {
    return this.getAttribute("rotulo") || this.getAttribute("label") || "";
  }
  set rotulo(t) {
    this.setAttribute("rotulo", t);
  }
  get valor() {
    return this.getAttribute("valor") || this.getAttribute("value") || "";
  }
  set valor(t) {
    this.setAttribute("valor", t);
  }
  get variacao() {
    return this.getAttribute("variacao") || this.getAttribute("trend") || "";
  }
  set variacao(t) {
    this.setAttribute("variacao", t);
  }
  get tendencia() {
    const t = (this.getAttribute("tendencia") || this.getAttribute("direction") || "positivo").toLowerCase();
    return t === "baixa" || t === "negativo" || t === "down" ? "baixa" : t === "neutro" || t === "neutral" ? "neutro" : "alta";
  }
  set tendencia(t) {
    this.setAttribute("tendencia", t);
  }
  get descricao() {
    return this.getAttribute("descricao") || this.getAttribute("description") || "";
  }
  set descricao(t) {
    this.setAttribute("descricao", t);
  }
  syncState() {
    const t = this.rotulo, e = this.valor, o = this.variacao, a = this.tendencia, r = this.descricao, s = this.getAttribute("elevacao") || this.getAttribute("elevation") || "baixa";
    this.statElement.className = `ui-stat ui-stat--${s}`, this.rotuloElement.textContent = t, this.valorElement.textContent = e, o ? (this.variacaoElement.textContent = o, this.indicadorElement.style.display = "inline-flex", a === "baixa" ? (this.indicadorElement.className = "ui-stat__indicador ui-stat__indicador--negativo", this.setaElement.textContent = "↓", this.indicadorElement.setAttribute("aria-label", `Queda de ${o}`)) : a === "neutro" ? (this.indicadorElement.className = "ui-stat__indicador ui-stat__indicador--neutro", this.setaElement.textContent = "→", this.indicadorElement.setAttribute("aria-label", `Variação estável de ${o}`)) : (this.indicadorElement.className = "ui-stat__indicador ui-stat__indicador--positivo", this.setaElement.textContent = "↑", this.indicadorElement.setAttribute("aria-label", `Aumento de ${o}`))) : this.indicadorElement.style.display = "none", r ? (this.descricaoElement.textContent = r, this.descricaoElement.style.display = "block") : this.descricaoElement.style.display = "none";
  }
}
class Je extends pt {
}
class ti extends pt {
}
customElements.get("ui-stat") || customElements.define("ui-stat", pt);
customElements.get("ui-kpi") || customElements.define("ui-kpi", Je);
customElements.get("ui-metrica") || customElements.define("ui-metrica", ti);
const Pt = '.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0}.leaflet-container{overflow:hidden}.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow{-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-user-drag:none}.leaflet-tile::selection{background:transparent}.leaflet-safari .leaflet-tile{image-rendering:-webkit-optimize-contrast}.leaflet-safari .leaflet-tile-container{width:1600px;height:1600px;-webkit-transform-origin:0 0}.leaflet-marker-icon,.leaflet-marker-shadow{display:block}.leaflet-container .leaflet-overlay-pane svg{max-width:none!important;max-height:none!important}.leaflet-container .leaflet-marker-pane img,.leaflet-container .leaflet-shadow-pane img,.leaflet-container .leaflet-tile-pane img,.leaflet-container img.leaflet-image-layer,.leaflet-container .leaflet-tile{max-width:none!important;max-height:none!important;width:auto;padding:0}.leaflet-container img.leaflet-tile{mix-blend-mode:plus-lighter}.leaflet-container.leaflet-touch-zoom{-ms-touch-action:pan-x pan-y;touch-action:pan-x pan-y}.leaflet-container.leaflet-touch-drag{-ms-touch-action:pinch-zoom;touch-action:none;touch-action:pinch-zoom}.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom{-ms-touch-action:none;touch-action:none}.leaflet-container{-webkit-tap-highlight-color:transparent}.leaflet-container a{-webkit-tap-highlight-color:rgba(51,181,229,.4)}.leaflet-tile{filter:inherit;visibility:hidden}.leaflet-tile-loaded{visibility:inherit}.leaflet-zoom-box{width:0;height:0;-moz-box-sizing:border-box;box-sizing:border-box;z-index:800}.leaflet-overlay-pane svg{-moz-user-select:none}.leaflet-pane{z-index:400}.leaflet-tile-pane{z-index:200}.leaflet-overlay-pane{z-index:400}.leaflet-shadow-pane{z-index:500}.leaflet-marker-pane{z-index:600}.leaflet-tooltip-pane{z-index:650}.leaflet-popup-pane{z-index:700}.leaflet-map-pane canvas{z-index:100}.leaflet-map-pane svg{z-index:200}.leaflet-vml-shape{width:1px;height:1px}.lvml{behavior:url(#default#VML);display:inline-block;position:absolute}.leaflet-control{position:relative;z-index:800;pointer-events:visiblePainted;pointer-events:auto}.leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none}.leaflet-top{top:0}.leaflet-right{right:0}.leaflet-bottom{bottom:0}.leaflet-left{left:0}.leaflet-control{float:left;clear:both}.leaflet-right .leaflet-control{float:right}.leaflet-top .leaflet-control{margin-top:10px}.leaflet-bottom .leaflet-control{margin-bottom:10px}.leaflet-left .leaflet-control{margin-left:10px}.leaflet-right .leaflet-control{margin-right:10px}.leaflet-fade-anim .leaflet-popup{opacity:0;-webkit-transition:opacity .2s linear;-moz-transition:opacity .2s linear;transition:opacity .2s linear}.leaflet-fade-anim .leaflet-map-pane .leaflet-popup{opacity:1}.leaflet-zoom-animated{-webkit-transform-origin:0 0;-ms-transform-origin:0 0;transform-origin:0 0}svg.leaflet-zoom-animated{will-change:transform}.leaflet-zoom-anim .leaflet-zoom-animated{-webkit-transition:-webkit-transform .25s cubic-bezier(0,0,.25,1);-moz-transition:-moz-transform .25s cubic-bezier(0,0,.25,1);transition:transform .25s cubic-bezier(0,0,.25,1)}.leaflet-zoom-anim .leaflet-tile,.leaflet-pan-anim .leaflet-tile{-webkit-transition:none;-moz-transition:none;transition:none}.leaflet-zoom-anim .leaflet-zoom-hide{visibility:hidden}.leaflet-interactive{cursor:pointer}.leaflet-grab{cursor:-webkit-grab;cursor:-moz-grab;cursor:grab}.leaflet-crosshair,.leaflet-crosshair .leaflet-interactive{cursor:crosshair}.leaflet-popup-pane,.leaflet-control{cursor:auto}.leaflet-dragging .leaflet-grab,.leaflet-dragging .leaflet-grab .leaflet-interactive,.leaflet-dragging .leaflet-marker-draggable{cursor:move;cursor:-webkit-grabbing;cursor:-moz-grabbing;cursor:grabbing}.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-image-layer,.leaflet-pane>svg path,.leaflet-tile-container{pointer-events:none}.leaflet-marker-icon.leaflet-interactive,.leaflet-image-layer.leaflet-interactive,.leaflet-pane>svg path.leaflet-interactive,svg.leaflet-image-layer.leaflet-interactive path{pointer-events:visiblePainted;pointer-events:auto}.leaflet-container{background:#ddd;outline-offset:1px}.leaflet-container a{color:#0078a8}.leaflet-zoom-box{border:2px dotted #38f;background:#ffffff80}.leaflet-container{font-family:Helvetica Neue,Arial,Helvetica,sans-serif;font-size:12px;font-size:.75rem;line-height:1.5}.leaflet-bar{box-shadow:0 1px 5px #000000a6;border-radius:4px}.leaflet-bar a{background-color:#fff;border-bottom:1px solid #ccc;width:26px;height:26px;line-height:26px;display:block;text-align:center;text-decoration:none;color:#000}.leaflet-bar a,.leaflet-control-layers-toggle{background-position:50% 50%;background-repeat:no-repeat;display:block}.leaflet-bar a:hover,.leaflet-bar a:focus{background-color:#f4f4f4}.leaflet-bar a:first-child{border-top-left-radius:4px;border-top-right-radius:4px}.leaflet-bar a:last-child{border-bottom-left-radius:4px;border-bottom-right-radius:4px;border-bottom:none}.leaflet-bar a.leaflet-disabled{cursor:default;background-color:#f4f4f4;color:#bbb}.leaflet-touch .leaflet-bar a{width:30px;height:30px;line-height:30px}.leaflet-touch .leaflet-bar a:first-child{border-top-left-radius:2px;border-top-right-radius:2px}.leaflet-touch .leaflet-bar a:last-child{border-bottom-left-radius:2px;border-bottom-right-radius:2px}.leaflet-control-zoom-in,.leaflet-control-zoom-out{font:700 18px Lucida Console,Monaco,monospace;text-indent:1px}.leaflet-touch .leaflet-control-zoom-in,.leaflet-touch .leaflet-control-zoom-out{font-size:22px}.leaflet-control-layers{box-shadow:0 1px 5px #0006;background:#fff;border-radius:5px}.leaflet-control-layers-toggle{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAQAAAADQ4RFAAACf0lEQVR4AY1UM3gkARTePdvdoTxXKc+qTl3aU5U6b2Kbkz3Gtq3Zw6ziLGNPzrYx7946Tr6/ee/XeCQ4D3ykPtL5tHno4n0d/h3+xfuWHGLX81cn7r0iTNzjr7LrlxCqPtkbTQEHeqOrTy4Yyt3VCi/IOB0v7rVC7q45Q3Gr5K6jt+3Gl5nCoDD4MtO+j96Wu8atmhGqcNGHObuf8OM/x3AMx38+4Z2sPqzCxRFK2aF2e5Jol56XTLyggAMTL56XOMoS1W4pOyjUcGGQdZxU6qRh7B9Zp+PfpOFlqt0zyDZckPi1ttmIp03jX8gyJ8a/PG2yutpS/Vol7peZIbZcKBAEEheEIAgFbDkz5H6Zrkm2hVWGiXKiF4Ycw0RWKdtC16Q7qe3X4iOMxruonzegJzWaXFrU9utOSsLUmrc0YjeWYjCW4PDMADElpJSSQ0vQvA1Tm6/JlKnqFs1EGyZiFCqnRZTEJJJiKRYzVYzJck2Rm6P4iH+cmSY0YzimYa8l0EtTODFWhcMIMVqdsI2uiTvKmTisIDHJ3od5GILVhBCarCfVRmo4uTjkhrhzkiBV7SsaqS+TzrzM1qpGGUFt28pIySQHR6h7F6KSwGWm97ay+Z+ZqMcEjEWebE7wxCSQwpkhJqoZA5ivCdZDjJepuJ9IQjGGUmuXJdBFUygxVqVsxFsLMbDe8ZbDYVCGKxs+W080max1hFCarCfV+C1KATwcnvE9gRRuMP2prdbWGowm1KB1y+zwMMENkM755cJ2yPDtqhTI6ED1M/82yIDtC/4j4BijjeObflpO9I9MwXTCsSX8jWAFeHr05WoLTJ5G8IQVS/7vwR6ohirYM7f6HzYpogfS3R2OAAAAAElFTkSuQmCC);width:36px;height:36px}.leaflet-retina .leaflet-control-layers-toggle{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAQAAABvcdNgAAAEsklEQVR4AWL4TydIhpZK1kpWOlg0w3ZXP6D2soBtG42jeI6ZmQTHzAxiTbSJsYLjO9HhP+WOmcuhciVnmHVQcJnp7DFvScowZorad/+V/fVzMdMT2g9Cv9guXGv/7pYOrXh2U+RRR3dSd9JRx6bIFc/ekqHI29JC6pJ5ZEh1yWkhkbcFeSjxgx3L2m1cb1C7bceyxA+CNjT/Ifff+/kDk2u/w/33/IeCMOSaWZ4glosqT3DNnNZQ7Cs58/3Ce5HL78iZH/vKVIaYlqzfdLu8Vi7dnvUbEza5Idt36tquZFldl6N5Z/POLof0XLK61mZCmJSWjVF9tEjUluu74IUXvgttuVIHE7YxSkaYhJZam7yiM9Pv82JYfl9nptxZaxMJE4YSPty+vF0+Y2up9d3wwijfjZbabqm/3bZ9ecKHsiGmRflnn1MW4pjHf9oLufyn2z3y1D6n8g8TZhxyzipLNPnAUpsOiuWimg52psrTZYnOWYNDTMuWBWa0tJb4rgq1UvmutpaYEbZlwU3CLJm/ayYjHW5/h7xWLn9Hh1vepDkyf7dE7MtT5LR4e7yYpHrkhOUpEfssBLq2pPhAqoSWKUkk7EDqkmK6RrCEzqDjhNDWNE+XSMvkJRDWlZTmCW0l0PHQGRZY5t1L83kT0Y3l2SItk5JAWHl2dCOBm+fPu3fo5/3v61RMCO9Jx2EEYYhb0rmNQMX/vm7gqOEJLcXTGw3CAuRNeyaPWwjR8PRqKQ1PDA/dpv+on9Shox52WFnx0KY8onHayrJzm87i5h9xGw/tfkev0jGsQizqezUKjk12hBMKJ4kbCqGPVNXudyyrShovGw5CgxsRICxF6aRmSjlBnHRzg7Gx8fKqEubI2rahQYdR1YgDIRQO7JvQyD52hoIQx0mxa0ODtW2Iozn1le2iIRdzwWewedyZzewidueOGqlsn1MvcnQpuVwLGG3/IR1hIKxCjelIDZ8ldqWz25jWAsnldEnK0Zxro19TGVb2ffIZEsIO89EIEDvKMPrzmBOQcKQ+rroye6NgRRxqR4U8EAkz0CL6uSGOm6KQCdWjvjRiSP1BPalCRS5iQYiEIvxuBMJEWgzSoHADcVMuN7IuqqTeyUPq22qFimFtxDyBBJEwNyt6TM88blFHao/6tWWhuuOM4SAK4EI4QmFHA+SEyWlp4EQoJ13cYGzMu7yszEIBOm2rVmHUNqwAIQabISNMRstmdhNWcFLsSm+0tjJH1MdRxO5Nx0WDMhCtgD6OKgZeljJqJKc9po8juskR9XN0Y1lZ3mWjLR9JCO1jRDMd0fpYC2VnvjBSEFg7wBENc0R9HFlb0xvF1+TBEpF68d+DHR6IOWVv2BECtxo46hOFUBd/APU57WIoEwJhIi2CdpyZX0m93BZicktMj1AS9dClteUFAUNUIEygRZCtik5zSxI9MubTBH1GOiHsiLJ3OCoSZkILa9PxiN0EbvhsAo8tdAf9Seepd36lGWHmtNANTv5Jd0z4QYyeo/UEJqxKRpg5LZx6btLPsOaEmdMyxYdlc8LMaJnikDlhclqmPiQnTEpLUIZEwkRagjYkEibQErwhkTAKCLQEbUgkzJQWc/0PstHHcfEdQ+UAAAAASUVORK5CYII=);background-size:26px 26px}.leaflet-touch .leaflet-control-layers-toggle{width:44px;height:44px}.leaflet-control-layers .leaflet-control-layers-list,.leaflet-control-layers-expanded .leaflet-control-layers-toggle{display:none}.leaflet-control-layers-expanded .leaflet-control-layers-list{display:block;position:relative}.leaflet-control-layers-expanded{padding:6px 10px 6px 6px;color:#333;background:#fff}.leaflet-control-layers-scrollbar{overflow-y:scroll;overflow-x:hidden;padding-right:5px}.leaflet-control-layers-selector{margin-top:2px;position:relative;top:1px}.leaflet-control-layers label{display:block;font-size:13px;font-size:1.08333em}.leaflet-control-layers-separator{height:0;border-top:1px solid #ddd;margin:5px -10px 5px -6px}.leaflet-default-icon-path{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=)}.leaflet-container .leaflet-control-attribution{background:#fff;background:#fffc;margin:0}.leaflet-control-attribution,.leaflet-control-scale-line{padding:0 5px;color:#333;line-height:1.4}.leaflet-control-attribution a{text-decoration:none}.leaflet-control-attribution a:hover,.leaflet-control-attribution a:focus{text-decoration:underline}.leaflet-attribution-flag{display:inline!important;vertical-align:baseline!important;width:1em;height:.6669em}.leaflet-left .leaflet-control-scale{margin-left:5px}.leaflet-bottom .leaflet-control-scale{margin-bottom:5px}.leaflet-control-scale-line{border:2px solid #777;border-top:none;line-height:1.1;padding:2px 5px 1px;white-space:nowrap;-moz-box-sizing:border-box;box-sizing:border-box;background:#fffc;text-shadow:1px 1px #fff}.leaflet-control-scale-line:not(:first-child){border-top:2px solid #777;border-bottom:none;margin-top:-2px}.leaflet-control-scale-line:not(:first-child):not(:last-child){border-bottom:2px solid #777}.leaflet-touch .leaflet-control-attribution,.leaflet-touch .leaflet-control-layers,.leaflet-touch .leaflet-bar{box-shadow:none}.leaflet-touch .leaflet-control-layers,.leaflet-touch .leaflet-bar{border:2px solid rgba(0,0,0,.2);background-clip:padding-box}.leaflet-popup{position:absolute;text-align:center;margin-bottom:20px}.leaflet-popup-content-wrapper{padding:1px;text-align:left;border-radius:12px}.leaflet-popup-content{margin:13px 24px 13px 20px;line-height:1.3;font-size:13px;font-size:1.08333em;min-height:1px}.leaflet-popup-content p{margin:1.3em 0}.leaflet-popup-tip-container{width:40px;height:20px;position:absolute;left:50%;margin-top:-1px;margin-left:-20px;overflow:hidden;pointer-events:none}.leaflet-popup-tip{width:17px;height:17px;padding:1px;margin:-10px auto 0;pointer-events:auto;-webkit-transform:rotate(45deg);-moz-transform:rotate(45deg);-ms-transform:rotate(45deg);transform:rotate(45deg)}.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#fff;color:#333;box-shadow:0 3px 14px #0006}.leaflet-container a.leaflet-popup-close-button{position:absolute;top:0;right:0;border:none;text-align:center;width:24px;height:24px;font:16px/24px Tahoma,Verdana,sans-serif;color:#757575;text-decoration:none;background:transparent}.leaflet-container a.leaflet-popup-close-button:hover,.leaflet-container a.leaflet-popup-close-button:focus{color:#585858}.leaflet-popup-scrolled{overflow:auto}.leaflet-oldie .leaflet-popup-content-wrapper{-ms-zoom:1}.leaflet-oldie .leaflet-popup-tip{width:24px;margin:0 auto;-ms-filter:"progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)";filter:progid:DXImageTransform.Microsoft.Matrix(M11=.70710678,M12=.70710678,M21=-.70710678,M22=.70710678)}.leaflet-oldie .leaflet-control-zoom,.leaflet-oldie .leaflet-control-layers,.leaflet-oldie .leaflet-popup-content-wrapper,.leaflet-oldie .leaflet-popup-tip{border:1px solid #999}.leaflet-div-icon{background:#fff;border:1px solid #666}.leaflet-tooltip{position:absolute;padding:6px;background-color:#fff;border:1px solid #fff;border-radius:3px;color:#222;white-space:nowrap;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none;box-shadow:0 1px 3px #0006}.leaflet-tooltip.leaflet-interactive{cursor:pointer;pointer-events:auto}.leaflet-tooltip-top:before,.leaflet-tooltip-bottom:before,.leaflet-tooltip-left:before,.leaflet-tooltip-right:before{position:absolute;pointer-events:none;border:6px solid transparent;background:transparent;content:""}.leaflet-tooltip-bottom{margin-top:6px}.leaflet-tooltip-top{margin-top:-6px}.leaflet-tooltip-bottom:before,.leaflet-tooltip-top:before{left:50%;margin-left:-6px}.leaflet-tooltip-top:before{bottom:0;margin-bottom:-12px;border-top-color:#fff}.leaflet-tooltip-bottom:before{top:0;margin-top:-12px;margin-left:-6px;border-bottom-color:#fff}.leaflet-tooltip-left{margin-left:-6px}.leaflet-tooltip-right{margin-left:6px}.leaflet-tooltip-left:before,.leaflet-tooltip-right:before{top:50%;margin-top:-6px}.leaflet-tooltip-left:before{right:0;margin-right:-12px;border-left-color:#fff}.leaflet-tooltip-right:before{left:0;margin-left:-12px;border-right-color:#fff}@media print{.leaflet-control{-webkit-print-color-adjust:exact;print-color-adjust:exact}}', ei = ":host{display:block;width:100%;height:400px;position:relative;border-radius:var(--border-radius-md, 8px);overflow:hidden;box-shadow:var(--shadow-sm, 0 1px 3px rgba(0,0,0,.1))}.ui-mapa-container{width:100%;height:100%;z-index:1}.leaflet-top,.leaflet-bottom{z-index:1000}", Z = {
  osm: {
    nome: "OpenStreetMap",
    layer: () => y.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    })
  },
  satelite: {
    nome: "Satélite (Esri)",
    layer: () => y.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
    })
  },
  topografia: {
    nome: "Topografia",
    layer: () => y.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    })
  },
  ruas: {
    nome: "Ruas (Esri)",
    layer: () => y.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012"
    })
  }
};
class ii extends HTMLElement {
  constructor() {
    super();
    c(this, "mapContainer");
    c(this, "mapInstance", null);
    c(this, "_initTimer", null);
    c(this, "_resizeObserver");
    c(this, "_resizeTimer");
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>
        ${Pt}
        ${ei}
      </style>
      <div class="ui-mapa-container" id="map-container"></div>
      <div style="display: none;"><slot></slot></div>
    `, this.mapContainer = t.getElementById("map-container");
  }
  static get observedAttributes() {
    return ["lat", "lng", "zoom"];
  }
  connectedCallback() {
    this._initTimer = window.setTimeout(() => {
      this.initMap();
    }, 0);
  }
  disconnectedCallback() {
    this._initTimer && (window.clearTimeout(this._initTimer), this._initTimer = null), this._resizeObserver && (this._resizeObserver.disconnect(), this._resizeObserver = void 0), this._resizeTimer && (window.clearTimeout(this._resizeTimer), this._resizeTimer = null), this.mapInstance && (this.mapInstance.remove(), this.mapInstance = null);
  }
  attributeChangedCallback(t, e, o) {
    if (e !== o && this.mapInstance) {
      const a = parseFloat(this.getAttribute("lat") || "-23.550520"), r = parseFloat(this.getAttribute("lng") || "-46.633308"), s = parseInt(this.getAttribute("zoom") || "13", 10);
      !isNaN(a) && !isNaN(r) && this.mapInstance.setView([a, r], s);
    }
  }
  initMap() {
    if (this.mapInstance) return;
    const t = parseFloat(this.getAttribute("lat") || "-23.550520"), e = parseFloat(this.getAttribute("lng") || "-46.633308"), o = parseInt(this.getAttribute("zoom") || "13", 10);
    this.mapInstance = y.map(this.mapContainer).setView([t, e], o);
    const a = this.getAttribute("camadas");
    let r = ["osm"];
    a && (r = a.split(",").map((l) => l.trim().toLowerCase()).filter((l) => Z[l]), r.length === 0 && (r = ["osm"]));
    const s = Z[r[0]].layer();
    if (s.addTo(this.mapInstance), r.length > 1) {
      const l = {};
      l[Z[r[0]].nome] = s;
      for (let h = 1; h < r.length; h++) {
        const u = r[h];
        l[Z[u].nome] = Z[u].layer();
      }
      y.control.layers(l, void 0, { position: "topright" }).addTo(this.mapInstance);
    }
    y.Icon.Default.imagePath = "https://unpkg.com/leaflet@1.9.4/dist/images/", typeof ResizeObserver < "u" && this.mapContainer && (this._resizeObserver = new ResizeObserver(() => {
      this._resizeTimer && clearTimeout(this._resizeTimer), this._resizeTimer = setTimeout(() => {
        this.mapInstance && this.mapInstance.invalidateSize();
      }, 60);
    }), this._resizeObserver.observe(this.mapContainer)), setTimeout(() => {
      this.mapInstance && this.mapInstance.invalidateSize();
    }, 100), this.dispatchEvent(new CustomEvent("ui-mapa-pronto", {
      detail: { map: this.mapInstance },
      bubbles: !0,
      composed: !0
    }));
  }
  getMap() {
    return this.mapInstance;
  }
}
customElements.get("ui-mapa") || customElements.define("ui-mapa", ii);
const E = (n) => n == null ? "" : String(n).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"), io = (n, i = 3) => n == null || isNaN(n) ? "—" : n.toLocaleString("pt-BR", {
  minimumFractionDigits: i,
  maximumFractionDigits: i
}), R = (n, i) => {
  if (n == null || i === null || i === void 0)
    return null;
  const t = (a) => {
    if (typeof a == "number") return a;
    if (typeof a == "string") {
      const r = a.trim().replace(",", ".");
      return parseFloat(r);
    }
    return NaN;
  }, e = t(n), o = t(i);
  return isNaN(e) || isNaN(o) ? null : Math.abs(e) > 90 || Math.abs(o) > 180 ? (console.warn(`[gerencigeo-canvas] Coordenada fora do limite geográfico WGS-84 (Lat: ${e}, Lon: ${o}). Parece ser projeção UTM plana.`), null) : e === 0 && o === 0 ? null : { lat: e, lon: o };
}, J = (n, i) => !n || !Array.isArray(n) || n.length === 0 ? "" : `<div class="ui-popup-actions-footer">${n.map((e) => {
  const o = e.variante || "secondary";
  return `<button type="button" class="ui-popup-btn ui-popup-btn-${E(o)}" data-acao-id="${E(e.id)}" data-elemento-id="${E(String(i))}">${E(e.rotulo)}</button>`;
}).join("")}</div>`, tt = (n, i, t, e) => {
  const o = n != null && n.getElement ? n.getElement() : null;
  if (!o) return;
  o.querySelectorAll(".ui-popup-btn").forEach((r) => {
    r.onclick = (s) => {
      s.preventDefault(), s.stopPropagation();
      const l = r.getAttribute("data-acao-id"), h = r.getAttribute("data-elemento-id") ?? (i == null ? void 0 : i.id);
      l && h !== void 0 && h !== null && (t.onPopupAcao && t.onPopupAcao(l, h, i), e && typeof e.closePopup == "function" ? e.closePopup() : n._map && typeof n._map.closePopup == "function" && n._map.closePopup());
    };
  });
}, it = (n, i) => {
  const t = {};
  return n.forEach((e) => {
    let o;
    i && e[i] !== void 0 && e[i] !== null ? o = e[i] : (o = e.grupoId ?? e.grupoKey, o == null && (e.matricula_id !== void 0 && e.matricula_id !== null ? o = `mat_${e.matricula_id}` : e.planilha_origem ? o = e.planilha_origem : o = "padrao"));
    const a = String(o);
    t[a] || (t[a] = []), t[a].push(e);
  }), t;
}, ot = (n) => [...n].sort((i, t) => {
  const e = (o) => {
    const a = o.ordem ?? o.indice ?? o.index ?? o.seq ?? o.ordem_caminhamento ?? o.id, r = Number(a);
    return isNaN(r) ? 999999 : r;
  };
  return e(i) - e(t);
}), vt = (n) => {
  if (!n || typeof n != "string") return null;
  const i = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
  let t, e = 0, o = 0, a = 0;
  for (; (t = i.exec(n)) !== null; ) {
    const r = parseFloat(t[1]), s = parseFloat(t[2]);
    if (!isNaN(r) && !isNaN(s)) {
      const l = R(s, r) || R(r, s);
      l && (e += l.lat, o += l.lon, a++);
    }
  }
  return a > 0 ? {
    lat: e / a,
    lon: o / a
  } : null;
};
class oi extends HTMLElement {
  constructor() {
    super(...arguments);
    c(this, "marker", null);
    c(this, "_initTimer", null);
    c(this, "_retryCount", 0);
    c(this, "_parentMap", null);
    c(this, "handleMapReady", () => {
      this.marker && (this.marker.remove(), this.marker = null), this.initMarker();
    });
  }
  static get observedAttributes() {
    return ["lat", "lng", "titulo"];
  }
  connectedCallback() {
    this._parentMap = this.closest("ui-mapa"), this._parentMap && this._parentMap.addEventListener("ui-mapa-pronto", this.handleMapReady), this._initTimer = setTimeout(() => this.initMarker(), 0);
  }
  disconnectedCallback() {
    this._initTimer && (clearTimeout(this._initTimer), this._initTimer = null), this._parentMap && (this._parentMap.removeEventListener("ui-mapa-pronto", this.handleMapReady), this._parentMap = null), this.marker && (this.marker.remove(), this.marker = null);
  }
  attributeChangedCallback(t, e, o) {
    if (e !== o && this.marker) {
      if (t === "lat" || t === "lng") {
        const a = R(this.getAttribute("lat"), this.getAttribute("lng"));
        a && this.marker.setLatLng([a.lat, a.lon]);
      }
      t === "titulo" && (this.marker.unbindPopup(), o && this.marker.bindPopup(this.createPopupContent(o)));
    }
  }
  createPopupContent(t) {
    const e = document.createElement("div");
    return e.className = "ui-mapa-popup", e.textContent = t, e;
  }
  initMarker() {
    const t = this._parentMap || this.closest("ui-mapa");
    if (!t) {
      console.warn("<ui-mapa-marcador> deve estar dentro de um elemento <ui-mapa>");
      return;
    }
    const e = t.getMap();
    if (!e) {
      if (this._retryCount >= 30) {
        console.warn("<ui-mapa-marcador> Tempo limite esgotado aguardando inicialização do mapa pai.");
        return;
      }
      this._retryCount++, this._initTimer = setTimeout(() => this.initMarker(), 50);
      return;
    }
    this._retryCount = 0;
    const o = R(this.getAttribute("lat"), this.getAttribute("lng"));
    if (!o) return;
    const a = this.getAttribute("titulo");
    this.marker = y.marker([o.lat, o.lon]), a && this.marker.bindPopup(this.createPopupContent(a)), this.marker.addTo(e);
  }
}
customElements.get("ui-mapa-marcador") || customElements.define("ui-mapa-marcador", oi);
class ai extends HTMLElement {
  constructor() {
    super(...arguments);
    c(this, "polyline", null);
    c(this, "_initTimer", null);
    c(this, "_retryCount", 0);
  }
  static get observedAttributes() {
    return ["pontos", "cor", "espessura"];
  }
  connectedCallback() {
    this._initTimer = setTimeout(() => this.initLinha(), 0);
  }
  disconnectedCallback() {
    this._initTimer && (clearTimeout(this._initTimer), this._initTimer = null), this.polyline && (this.polyline.remove(), this.polyline = null);
  }
  attributeChangedCallback(t, e, o) {
    e !== o && this.polyline && (t === "pontos" ? this.polyline.setLatLngs(this.getPontos()) : (t === "cor" || t === "espessura") && this.polyline.setStyle({
      color: this.getAttribute("cor") || "#3388ff",
      weight: parseInt(this.getAttribute("espessura") || "3", 10)
    }));
  }
  getPontos() {
    try {
      const t = this.getAttribute("pontos");
      if (t)
        return JSON.parse(t);
    } catch (t) {
      console.error('Formato inválido para atributo pontos no <ui-mapa-linha>. Deve ser um JSON array, ex: "[[lat, lng], ...]"', t);
    }
    return [];
  }
  initLinha() {
    const t = this.closest("ui-mapa");
    if (!t) {
      console.warn("<ui-mapa-linha> deve estar dentro de um elemento <ui-mapa>");
      return;
    }
    const e = t.getMap();
    if (!e) {
      if (this._retryCount >= 30) {
        console.warn("<ui-mapa-linha> Tempo limite esgotado aguardando inicialização do mapa pai.");
        return;
      }
      this._retryCount++, this._initTimer = setTimeout(() => this.initLinha(), 50);
      return;
    }
    this._retryCount = 0;
    const o = this.getAttribute("cor") || "#3388ff", a = parseInt(this.getAttribute("espessura") || "3", 10);
    this.polyline = y.polyline(this.getPontos(), {
      color: o,
      weight: a
    }), this.polyline.addTo(e);
  }
}
customElements.get("ui-mapa-linha") || customElements.define("ui-mapa-linha", ai);
const ri = ":host{display:block;box-sizing:border-box}:host([inline]){display:inline-block}.ui-skeleton{background:var(--ui-cor-fundo-elevado, #1e1e24);background-image:linear-gradient(90deg,#fff0,#ffffff12,#fff0);background-size:200% 100%;background-repeat:no-repeat;border-radius:var(--ui-raio-borda, 6px);position:relative;overflow:hidden;box-sizing:border-box;animation:ui-skeleton-shimmer 1.6s ease-in-out infinite}:root[data-tema=claro] .ui-skeleton,[data-tema=claro] .ui-skeleton{background:var(--ui-cor-fundo-elevado, #e9ecef);background-image:linear-gradient(90deg,#0000,#0000000f,#0000)}@keyframes ui-skeleton-shimmer{0%{background-position:-200% 0}to{background-position:200% 0}}.ui-skeleton--pulso{background-image:none;animation:ui-skeleton-pulse 1.8s ease-in-out infinite}@keyframes ui-skeleton-pulse{0%,to{opacity:1}50%{opacity:.45}}.ui-skeleton--estatico{animation:none;background-image:none}.ui-skeleton--texto{height:1.1em;border-radius:4px}.ui-skeleton--circular{border-radius:50%!important;aspect-ratio:1;width:var(--ui-skeleton-largura, 40px);height:var(--ui-skeleton-altura, 40px)}.ui-skeleton--retangular{border-radius:var(--ui-raio-borda, 6px);min-height:20px}.ui-skeleton__linhas{display:flex;flex-direction:column;gap:8px;width:100%}.ui-skeleton__linhas .ui-skeleton{width:100%}.ui-skeleton__linhas .ui-skeleton:last-child:not(:first-child){width:65%}.ui-skeleton--card{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:var(--ui-raio-borda, 10px);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .08));background:var(--ui-cor-fundo-card, #18181c);animation:none}.ui-skeleton__card-media{width:100%;height:120px;border-radius:6px}.ui-skeleton__card-header{display:flex;align-items:center;gap:10px}.ui-skeleton__card-avatar{width:36px;height:36px;border-radius:50%;flex-shrink:0}.ui-skeleton__card-title{width:50%;height:16px}@media (prefers-reduced-motion: reduce){.ui-skeleton{animation:none!important;background-image:none!important;opacity:.7}}";
class It extends HTMLElement {
  constructor() {
    super();
    c(this, "rootElement");
    const t = this.attachShadow({ mode: "open" });
    t.innerHTML = `
      <style>${ri}</style>
      <div class="ui-skeleton-container" role="status" aria-label="Carregando..."></div>
    `, this.rootElement = t.querySelector(".ui-skeleton-container");
  }
  static get observedAttributes() {
    return [
      "variante",
      "variant",
      "largura",
      "width",
      "altura",
      "height",
      "raio",
      "radius",
      "linhas",
      "lines",
      "count",
      "animado",
      "animated"
    ];
  }
  connectedCallback() {
    this.hasAttribute("aria-hidden") || this.setAttribute("aria-hidden", "true"), this.syncState();
  }
  attributeChangedCallback(t, e, o) {
    this.syncState();
  }
  get variante() {
    const t = (this.getAttribute("variante") || this.getAttribute("variant") || "texto").toLowerCase();
    return t === "circulo" || t === "circular" ? "circular" : t === "retangulo" || t === "retangular" ? "retangular" : t === "card" ? "card" : "texto";
  }
  set variante(t) {
    this.setAttribute("variante", t);
  }
  get animado() {
    const t = (this.getAttribute("animado") || this.getAttribute("animated") || "shimmer").toLowerCase();
    return t === "pulse" || t === "pulso" ? "pulso" : t === "none" || t === "nenhum" || t === "estatico" ? "nenhum" : "shimmer";
  }
  set animado(t) {
    this.setAttribute("animado", t);
  }
  get linhas() {
    const t = parseInt(this.getAttribute("linhas") || this.getAttribute("lines") || this.getAttribute("count") || "1", 10);
    return isNaN(t) || t < 1 ? 1 : t;
  }
  set linhas(t) {
    this.setAttribute("linhas", String(t));
  }
  syncState() {
    const t = this.variante, e = this.animado, o = this.getAttribute("largura") || this.getAttribute("width"), a = this.getAttribute("altura") || this.getAttribute("height"), r = this.getAttribute("raio") || this.getAttribute("radius"), s = this.linhas;
    this.rootElement.innerHTML = "";
    const l = e === "pulso" ? "ui-skeleton--pulso" : e === "nenhum" ? "ui-skeleton--estatico" : "";
    if (t === "card") {
      const u = document.createElement("div");
      u.className = "ui-skeleton ui-skeleton--card";
      const d = document.createElement("div");
      d.className = `ui-skeleton ui-skeleton__card-media ${l}`;
      const p = document.createElement("div");
      p.className = "ui-skeleton__card-header";
      const m = document.createElement("div");
      m.className = `ui-skeleton ui-skeleton__card-avatar ${l}`;
      const f = document.createElement("div");
      f.className = `ui-skeleton ui-skeleton__card-title ${l}`, p.appendChild(m), p.appendChild(f);
      const b = document.createElement("div");
      b.className = "ui-skeleton__linhas";
      for (let g = 0; g < 2; g++) {
        const v = document.createElement("div");
        v.className = `ui-skeleton ui-skeleton--texto ${l}`, b.appendChild(v);
      }
      u.appendChild(d), u.appendChild(p), u.appendChild(b), this.rootElement.appendChild(u);
      return;
    }
    if (s > 1 && t === "texto") {
      const u = document.createElement("div");
      u.className = "ui-skeleton__linhas";
      for (let d = 0; d < s; d++) {
        const p = document.createElement("div");
        p.className = `ui-skeleton ui-skeleton--texto ${l}`, a && (p.style.height = isNaN(Number(a)) ? a : `${a}px`), r && (p.style.borderRadius = isNaN(Number(r)) ? r : `${r}px`), u.appendChild(p);
      }
      o && (u.style.width = isNaN(Number(o)) ? o : `${o}px`), this.rootElement.appendChild(u);
      return;
    }
    const h = document.createElement("div");
    h.className = `ui-skeleton ui-skeleton--${t} ${l}`.trim(), o && (h.style.width = isNaN(Number(o)) ? o : `${o}px`), a && (h.style.height = isNaN(Number(a)) ? a : `${a}px`), r && (h.style.borderRadius = isNaN(Number(r)) ? r : `${r}px`), this.rootElement.appendChild(h);
  }
}
class ni extends It {
}
customElements.get("ui-skeleton") || customElements.define("ui-skeleton", It);
customElements.get("ui-esqueleto") || customElements.define("ui-esqueleto", ni);
const si = ':host{display:block;width:100%;height:520px;position:relative;border-radius:var(--ui-radius-lg, 10px);overflow:hidden;box-shadow:0 10px 30px -5px #0009;border:1px solid rgba(255,255,255,.1);background:#080d0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,sans-serif;user-select:none;-webkit-user-select:none}*,*:before,*:after{box-sizing:border-box}.cad-root{position:relative;width:100%;height:100%;display:flex;overflow:hidden}.cad-map-container{width:100%;height:100%;background:#080d0a;z-index:1}.qgis-layer-panel{position:absolute;top:12px;left:12px;z-index:1000;width:290px;max-height:calc(100% - 24px);background:#0a120eeb;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.15);border-radius:8px;box-shadow:0 20px 40px #000000b3;display:flex;flex-direction:column;transition:transform .25s cubic-bezier(.16,1,.3,1),opacity .25s ease;overflow:hidden}.qgis-layer-panel.collapsed{transform:translate(-310px);opacity:0;pointer-events:none}.layer-panel-header{padding:10px 14px;background:#ffffff08;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between}.layer-panel-title{font-size:12px;font-weight:700;letter-spacing:.5px;color:#00f5a0;display:flex;align-items:center;gap:6px;text-transform:uppercase}.layer-panel-close{background:transparent;border:none;color:#ffffff80;cursor:pointer;padding:2px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:all .15s}.layer-panel-close:hover{color:#fff;background:#ffffff1a}.layer-panel-body{padding:8px 10px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;max-height:400px}.layer-panel-body::-webkit-scrollbar{width:5px}.layer-panel-body::-webkit-scrollbar-track{background:transparent}.layer-panel-body::-webkit-scrollbar-thumb{background:#fff3;border-radius:4px}.layer-panel-body::-webkit-scrollbar-thumb:hover{background:#00f5a066}.layer-item{background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.08);border-radius:0;padding:4px;display:flex;flex-direction:column;gap:3px;transition:background .15s ease}.layer-item:last-child{border-bottom:none}.layer-item:hover{background:#ffffff08;border-radius:4px}.layer-item-row{display:flex;align-items:center;justify-content:space-between;min-height:18px}.layer-item-label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;line-height:1.2;color:#ffffffe6;cursor:pointer;-webkit-user-select:none;user-select:none}.layer-chk-visibility{-moz-appearance:none;appearance:none;-webkit-appearance:none;width:14px;height:14px;border:1px solid rgba(255,255,255,.4);border-radius:3px;background:#0006;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;position:relative;transition:all .15s ease;flex-shrink:0;margin:0}.layer-chk-visibility:hover{border-color:#00f5a0}.layer-chk-visibility:checked{background:#00f5a0;border-color:#00f5a0}.layer-chk-visibility:checked:after{content:"";width:3.5px;height:7px;border:solid #04150c;border-width:0 1.5px 1.5px 0;transform:rotate(45deg) translateY(-.5px);display:block}.layer-item-actions{display:flex;align-items:center;gap:4px}.btn-layer-action{background:transparent;border:none;color:#fff6;cursor:pointer;padding:2px;border-radius:3px;display:flex;align-items:center;justify-content:center;transition:all .15s}.btn-layer-action:hover{color:#00f5a0;background:#ffffff14}.btn-layer-action.active{color:#f43f5e;background:#f43f5e26}.layer-controls-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:9.5px;line-height:1;color:#ffffff80;padding-left:21px}.layer-opacity-slider{flex:1;height:3px;margin:0;border-radius:2px;background:#ffffff26;accent-color:#00f5a0;cursor:pointer}.scale-mode-pill{font-size:8.5px;font-weight:600;padding:1px 6px;border-radius:6px;background:#ffffff0f;color:#ffffffb3;cursor:pointer;border:1px solid rgba(255,255,255,.1);transition:all .15s;line-height:1.2}.scale-mode-pill:hover{border-color:#00f5a0;color:#00f5a0;background:#00f5a01a}.cad-quick-toolbar{position:absolute;top:12px;right:12px;z-index:1000;display:flex;flex-direction:column;gap:6px;background:#0c1510eb;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:5px;box-shadow:0 10px 25px -5px #0009}.cad-btn-tool{background:transparent;border:none;color:#fff9;cursor:pointer;padding:7px;border-radius:5px;display:flex;align-items:center;justify-content:center;transition:all .15s}.cad-btn-tool:hover{background:#ffffff1a;color:#fff}.cad-btn-tool.active{background:#00f5a026;color:#00f5a0;border:1px solid rgba(0,245,160,.3)}.cad-selection-box{pointer-events:none;box-sizing:border-box}.custom-leaflet-marker{cursor:pointer}.custom-leaflet-marker:hover{filter:brightness(1.25);transform:scale(1.15);transition:transform .15s ease}.leaflet-popup-content-wrapper{background:#0f1712!important;color:#f8fafc!important;border:1px solid rgba(255,255,255,.15)!important;border-radius:8px!important;box-shadow:0 10px 25px #0009!important;padding:0!important;backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important}.leaflet-popup-tip{background:#0f1712!important;border:1px solid rgba(255,255,255,.15)!important;box-shadow:none!important}.leaflet-popup-close-button{color:#fff9!important;padding:6px!important;transition:color .15s ease}.leaflet-popup-close-button:hover{color:#fff!important}.leaflet-popup-content{margin:12px 14px!important;line-height:1.4;font-family:inherit;color:#f8fafc}.compact-popup .leaflet-popup-content{margin:10px 12px!important}.ui-popup-actions-footer{display:flex;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.1);justify-content:flex-end;align-items:center;flex-wrap:wrap}.ui-popup-btn{display:inline-flex;align-items:center;justify-content:center;font-family:inherit;font-size:11px;font-weight:500;padding:4px 9px;border-radius:var(--ui-raio-borda, var(--ui-radius-sm, 6px));cursor:pointer;transition:all .15s ease;border:1px solid transparent;outline:none;line-height:1.25;-webkit-user-select:none;user-select:none}.ui-popup-btn-primary{background:var(--ui-cor-primaria, #00f5a0);color:#080d0a;font-weight:600;border-color:var(--ui-cor-primaria, #00f5a0)}.ui-popup-btn-primary:hover{filter:brightness(1.1);box-shadow:0 0 10px #00f5a059}.ui-popup-btn-secondary{background:#ffffff14;color:#fff;border-color:#ffffff2e}.ui-popup-btn-secondary:hover{background:#ffffff29;border-color:#ffffff4d}.ui-popup-btn-destrutivo{background:#ef444426;color:#f87171;border-color:#ef444459}.ui-popup-btn-destrutivo:hover{background:#ef444440;border-color:#ef444499;color:#fff}@media (max-width: 520px){.qgis-layer-panel{top:8px;left:8px;right:8px;width:auto;max-height:calc(100% - 16px)}.qgis-layer-panel.collapsed{transform:translateY(-115%)}.layer-panel-close{min-width:36px;min-height:36px;font-size:16px}.layer-action-btn{min-width:32px;min-height:32px}}.cad-destaque-marker-container{pointer-events:none!important;background:transparent!important;border:none!important;overflow:visible!important}.cad-destaque-marker-container *{pointer-events:none!important}.cad-pulse-highlight{position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;pointer-events:none!important;user-select:none;-webkit-user-select:none}.cad-pulse-core{position:absolute;width:14px;height:14px;border-radius:50%;background-color:var(--cad-pulse-cor, #00f5a0);box-shadow:0 0 10px var(--cad-pulse-cor, #00f5a0),0 0 20px var(--cad-pulse-cor, #00f5a0);pointer-events:none!important;animation:cad-pulse-glow 1.4s ease-in-out infinite alternate}.cad-pulse-ring{position:absolute;width:100%;height:100%;border-radius:50%;border:2.5px solid var(--cad-pulse-cor, #00f5a0);box-shadow:0 0 10px var(--cad-pulse-cor, #00f5a0);pointer-events:none!important;opacity:0;animation:cad-pulse-ping 1.8s cubic-bezier(0,0,.2,1) infinite}.cad-pulse-ring.ring-2{animation-delay:.6s}@keyframes cad-pulse-ping{0%{transform:scale(.35);opacity:.95}60%{opacity:.5}to{transform:scale(2.5);opacity:0}}@keyframes cad-pulse-glow{0%{transform:scale(.85);opacity:.8}to{transform:scale(1.15);opacity:1;box-shadow:0 0 14px var(--cad-pulse-cor, #00f5a0),0 0 26px var(--cad-pulse-cor, #00f5a0)}}', xt = {
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
}, X = class X {
  constructor() {
    c(this, "config");
    this.config = this.loadConfig();
  }
  static getInstance() {
    return X.instance || (X.instance = new X()), X.instance;
  }
  loadConfig() {
    try {
      const i = typeof localStorage < "u" ? localStorage.getItem("gerencigeo_mapa_config") : null;
      if (i)
        return { ...xt, ...JSON.parse(i) };
    } catch (i) {
      console.error("Erro ao carregar configurações do mapa", i);
    }
    return { ...xt };
  }
  saveConfig(i) {
    this.config = { ...this.config, ...i }, typeof localStorage < "u" && localStorage.setItem("gerencigeo_mapa_config", JSON.stringify(this.config));
  }
  getConfig() {
    return this.config = this.loadConfig(), { ...this.config };
  }
};
c(X, "instance");
let lt = X;
class li {
  constructor(i) {
    c(this, "map", null);
    c(this, "configManager", lt.getInstance());
    c(this, "config", this.configManager.getConfig());
    c(this, "apiBaseUrl", "/api");
    c(this, "bancoPontosGroup", y.layerGroup());
    c(this, "pontosVizinhosGroup", y.layerGroup());
    c(this, "controller");
    c(this, "containerElement", null);
    c(this, "bc");
    c(this, "currentSigefAbortController");
    this.controller = i;
  }
  init(i) {
    if (this.map)
      try {
        this.map.off(), this.map.remove();
      } catch {
      } finally {
        this.map = null;
      }
    const t = typeof i == "string" ? document.getElementById(i) : i;
    if (!t) return null;
    if (this.containerElement = t, t._leaflet_id)
      try {
        delete t._leaflet_id;
      } catch {
        t._leaflet_id = void 0;
      }
    if (this.map = y.map(t, {
      maxZoom: 24,
      scrollWheelZoom: !0,
      preferCanvas: this.config.preferCanvas !== void 0 ? this.config.preferCanvas : !0,
      zoomControl: !1
      // O controle de zoom é gerenciado pelo CAD ou scroll
    }).setView([-23.7661, -53.3204], 14), this.listenConfigBroadcast(), this.applyMapStyles(), !this.map.getPane("sigefPane")) {
      const e = this.map.createPane("sigefPane");
      e.style.zIndex = "390";
    }
    if (!this.map.getPane("perimetroPane")) {
      const e = this.map.createPane("perimetroPane");
      e.style.zIndex = "450";
    }
    if (!this.map.getPane("verticesPane")) {
      const e = this.map.createPane("verticesPane");
      e.style.zIndex = "650";
    }
    return y.control.scale({
      metric: !0,
      imperial: !1,
      position: "bottomleft"
    }).addTo(this.map), this.map.on("click", (e) => {
      if (this.controller.modoCliqueSequencialAtivo || this.controller.canvasInteracao && this.controller.canvasInteracao.selectionHappened)
        return;
      (this.controller.layerManager ? this.controller.layerManager.isLayerActiveAndSelectable("sigef") : !1) && this.consultarSigef(e);
    }), setTimeout(() => {
      this.invalidateSize();
    }, 250), this.map;
  }
  /**
   * Recalcula com segurança as dimensões do viewport Leaflet.
   * Absorve silenciosamente exceções de desmontagem e panes desanexados (undefined._leaflet_pos).
   */
  invalidateSize(i = !1) {
    var t, e;
    if (this.map)
      try {
        const o = (e = (t = this.map).getContainer) == null ? void 0 : e.call(t);
        if (!o || !o.parentNode) return;
        this.map.invalidateSize({ animate: i, pan: !1 });
      } catch {
      }
  }
  applyMapStyles() {
    const i = this.containerElement || document.getElementById("mapa-triagem");
    i && (this.config.crosshair ? i.style.cursor = "crosshair" : i.style.cursor = "");
  }
  listenConfigBroadcast() {
    if (!(typeof BroadcastChannel > "u"))
      try {
        this.bc = new BroadcastChannel("gerencigeo_map_config"), this.bc.onmessage = (i) => {
          i.data === "RELOAD_REQUIRED" && (this.config = this.configManager.getConfig(), this.applyMapStyles(), window.dispatchEvent(new CustomEvent("gerencigeo:map_config_changed", { detail: this.config })));
        };
      } catch {
      }
  }
  destroy() {
    if (this.currentSigefAbortController && (this.currentSigefAbortController.abort(), this.currentSigefAbortController = void 0), this.bc) {
      try {
        this.bc.close();
      } catch {
      }
      this.bc = void 0;
    }
    if (this.map)
      try {
        this.map.off(), this.map.remove();
      } catch {
      } finally {
        this.map = null;
      }
    if (this.containerElement && this.containerElement._leaflet_id)
      try {
        delete this.containerElement._leaflet_id;
      } catch {
        this.containerElement._leaflet_id = void 0;
      }
  }
  preCarregarTilesRegiao(i) {
    if (!this.map) return;
    const t = Math.floor(this.map.getZoom()), e = Math.max(t, 12), o = Math.min(t + 1, 19), a = i.pad(0.2), r = ["mt0", "mt1", "mt2", "mt3"];
    let s = 0;
    const l = 32;
    for (let h = e; h <= o && s < l; h++) {
      const u = a.getNorthWest(), d = a.getSouthEast(), p = this.lonToTileX(u.lng, h), m = this.lonToTileX(d.lng, h), f = this.latToTileY(u.lat, h), b = this.latToTileY(d.lat, h);
      for (let g = p; g <= m && s < l; g++)
        for (let v = f; v <= b && s < l; v++) {
          const L = `https://${r[(g + v) % r.length]}.google.com/vt/lyrs=s,h&x=${g}&y=${v}&z=${h}`, T = new Image();
          T.src = L, s++;
        }
    }
  }
  lonToTileX(i, t) {
    return Math.floor((i + 180) / 360 * Math.pow(2, t));
  }
  latToTileY(i, t) {
    const e = i * Math.PI / 180;
    return Math.floor(
      (1 - Math.log(Math.tan(e) + 1 / Math.cos(e)) / Math.PI) / 2 * Math.pow(2, t)
    );
  }
  async consultarSigef(i) {
    if (!this.map) return;
    const t = this.map.getSize(), e = this.map.getBounds(), o = e.getSouthWest(), a = e.getNorthEast(), r = `${o.lng},${o.lat},${a.lng},${a.lat}`;
    let s = 0, l = 0;
    try {
      if (i.containerPoint)
        s = Math.round(i.containerPoint.x), l = Math.round(i.containerPoint.y);
      else if (i.layerPoint) {
        const f = this.map.layerPointToContainerPoint(i.layerPoint);
        s = Math.round(f.x), l = Math.round(f.y);
      }
    } catch {
      s = 0, l = 0;
    }
    const h = `https://acervofundiario.incra.gov.br/i3geo/ogc.php?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FORMAT=image/png&TRANSPARENT=true&QUERY_LAYERS=certificada_sigef_particular_pr&LAYERS=certificada_sigef_particular_pr&INFO_FORMAT=application/json&X=${s}&Y=${l}&WIDTH=${t.x}&HEIGHT=${t.y}&SRS=EPSG:4326&BBOX=${r}`, u = this.map.getContainer();
    u.style.cursor = "wait";
    const d = y.popup({
      className: "compact-sigef-popup",
      maxWidth: 250
    }).setLatLng(i.latlng).setContent(`
        <div style="font-family:sans-serif; display:flex; align-items:center; gap:8px; color:rgba(255,255,255,0.9); font-size:12px;">
          <svg style="animation:spin 1s linear infinite; width:14px; height:14px; flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" stroke-width="4" fill="none"></circle>
            <path fill="#00f5a0" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Consultando...
        </div>
      `).openOn(this.map);
    this.currentSigefAbortController && this.currentSigefAbortController.abort(), this.currentSigefAbortController = new AbortController();
    const p = this.currentSigefAbortController.signal, m = setTimeout(() => {
      this.currentSigefAbortController && this.currentSigefAbortController.abort();
    }, 8e3);
    try {
      const b = typeof window < "u" && (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1") || window.location.origin.includes("[::1]")) ? `${this.apiBaseUrl}/proxy/sigef?url=${encodeURIComponent(h)}` : `${window.location.origin}/api.php?action=proxy_sigef&url=${encodeURIComponent(h)}`, g = await fetch(b, { signal: p });
      clearTimeout(m);
      let v = null;
      if (g.ok) {
        const w = await g.text();
        try {
          v = JSON.parse(w);
        } catch {
          v = null;
        }
      }
      if (v && v.features && v.features.length > 0) {
        const w = v.features[0], L = w.properties || {}, T = String(w.id || L.parcela_codigo || L.co_parcela || L.id_parcela || ""), _ = String(L.nome_area || L.nome_imovel || "Imóvel Sem Nome");
        if (T) {
          const C = encodeURIComponent(T), x = `https://sigef.incra.gov.br/geo/exportar/parcela/shp/${C}/`, S = `https://sigef.incra.gov.br/geo/parcela/detalhe/${C}/`, z = document.createElement("div");
          z.style.cssText = "font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.4; min-width:180px;", z.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; padding-bottom:5px; border-bottom:1px solid rgba(255, 255, 255, 0.1);">
              <span style="font-weight:700; font-size:11px; color:#10b981; text-transform:uppercase; letter-spacing:0.5px;">SIGEF</span>
              <span style="font-size:10px; color:rgba(255, 255, 255, 0.5);">${E(L.situacao_informada || L.status || "Certificada")}</span>
            </div>
            <div style="font-weight:700; font-size:12px; margin-bottom:4px; color:#ffffff; word-break:break-word;">${E(_)}</div>
            <div style="font-size:11px; color:rgba(255, 255, 255, 0.7); margin-bottom:2px;">Cód: <span style="font-family:monospace;">${E(L.codigo_imovel || "N/A")}</span></div>
            <div style="display:flex; gap:12px; font-size:11px; color:rgba(255, 255, 255, 0.7); margin-bottom:6px;">
              <span>Mat: <strong style="color:#ffffff;">${E(L.registro_matricula || L.matricula || "N/A")}</strong></span>
              <span>${E(L.data_submissao || "")}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:5px; padding-top:6px; border-top:1px solid rgba(255, 255, 255, 0.1);">
              <a href="${x}" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; justify-content:center; gap:5px; padding:5px 8px; background:rgba(16, 185, 129, 0.15); border:1px solid rgba(16, 185, 129, 0.3); color:#34d399; font-size:11px; font-weight:700; border-radius:5px; text-decoration:none; cursor:pointer;">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Baixar Shapefile
              </a>
              <button class="btn-importar-confrontante-sigef" style="display:flex; align-items:center; justify-content:center; gap:5px; padding:5px 8px; background:rgba(14, 165, 233, 0.15); border:1px solid rgba(14, 165, 233, 0.3); color:#38bdf8; font-size:11px; font-weight:700; border-radius:5px; cursor:pointer; width:100%; text-align:center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Importar Confrontante (CSV)
              </button>
              <a href="${S}" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; justify-content:center; gap:4px; padding:4px 6px; background:rgba(255, 255, 255, 0.05); border:1px solid rgba(255, 255, 255, 0.1); color:rgba(255, 255, 255, 0.7); font-size:10px; font-weight:600; border-radius:5px; text-decoration:none; cursor:pointer;">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Abrir no SIGEF
              </a>
            </div>
          `;
          const N = z.querySelector(".btn-importar-confrontante-sigef");
          N && N.addEventListener("click", () => {
            window.dispatchEvent(
              new CustomEvent("gerencigeo:importar_vizinho_sigef", {
                detail: { uuid: T, nome: _ }
              })
            );
          }), d.setContent(z);
        } else
          d.setContent(`
            <div style="font-family:sans-serif; font-size:12px; color:#b45309; padding:2px 0;">
              Lote identificado, mas código da parcela indisponível.
            </div>
          `);
      } else
        d.setContent(`
          <div style="font-family:sans-serif; font-size:12px; color:rgba(255, 255, 255, 0.7); padding:2px 0;">
            Nenhum imóvel SIGEF certificado neste ponto.
          </div>
        `);
    } catch (f) {
      f.name === "AbortError" ? d.setContent(`
          <div style="font-family:sans-serif; font-size:12px; color:#f59e0b; padding:2px 0;">
            Consulta cancelada ou tempo limite de resposta esgotado.
          </div>
        `) : (console.warn("Erro ao consultar SIGEF:", f), d.setContent(`
          <div style="font-family:sans-serif; font-size:12px; color:#f59e0b; padding:2px 0;">
            Serviço de consulta SIGEF indisponível nesta área.
          </div>
        `));
    } finally {
      u.style.cursor = "";
    }
  }
}
const ci = [
  "verticesPane",
  "perimetroPane",
  "overlayPane",
  "markerPane",
  "pane-vertices",
  "pane-perimetro",
  "pane-vizinhos",
  "pane-homologados",
  "pane-homologados-pontos"
];
class di {
  constructor(i) {
    c(this, "ctx");
    c(this, "map", null);
    c(this, "mapContainer", null);
    // Estados de Pan (Rodinha)
    c(this, "isPanning", !1);
    c(this, "lastMousePos", { x: 0, y: 0 });
    // Estados de Seleção (Clique Esquerdo)
    c(this, "isSelecting", !1);
    c(this, "selectStartPos", { x: 0, y: 0 });
    c(this, "selectStartPoint", null);
    c(this, "selectionDiv", null);
    // Tempo do último clique do botão do meio
    c(this, "lastMiddleClickTime", 0);
    // Estados de Toque (Mobile/Tablet)
    c(this, "touchStartPos", { x: 0, y: 0 });
    c(this, "touchStartDist", 0);
    c(this, "isTouchPanning", !1);
    // Sinaliza que uma caixa de seleção foi arrastada
    c(this, "selectionHappened", !1);
    // Sinaliza que uma operação de pan ocorreu
    c(this, "panHappened", !1);
    c(this, "handleTouchStart", (i) => {
      if (!(!this.map || !this.mapContainer)) {
        if (i.touches.length === 1)
          this.isTouchPanning = !0, this.touchStartPos = { x: i.touches[0].clientX, y: i.touches[0].clientY };
        else if (i.touches.length === 2) {
          this.isTouchPanning = !1;
          const t = i.touches[0].clientX - i.touches[1].clientX, e = i.touches[0].clientY - i.touches[1].clientY;
          this.touchStartDist = Math.hypot(t, e);
        }
      }
    });
    c(this, "handleTouchMove", (i) => {
      if (!(!this.map || !this.mapContainer)) {
        if (i.touches.length === 1 && this.isTouchPanning) {
          i.preventDefault(), this.panHappened = !0;
          const t = this.touchStartPos.x - i.touches[0].clientX, e = this.touchStartPos.y - i.touches[0].clientY;
          this.map.panBy([t, e], { animate: !1 }), this.touchStartPos = { x: i.touches[0].clientX, y: i.touches[0].clientY };
        } else if (i.touches.length === 2 && this.touchStartDist > 0) {
          i.preventDefault(), this.panHappened = !0;
          const t = i.touches[0].clientX - i.touches[1].clientX, e = i.touches[0].clientY - i.touches[1].clientY, o = Math.hypot(t, e);
          Math.abs(o - this.touchStartDist) > 25 && (o > this.touchStartDist ? this.map.zoomIn(1) : this.map.zoomOut(1), this.touchStartDist = o);
        }
      }
    });
    c(this, "handleTouchEnd", () => {
      this.isTouchPanning = !1, this.touchStartDist = 0, setTimeout(() => {
        this.panHappened = !1;
      }, 120);
    });
    c(this, "handleContextMenu", (i) => {
      i.preventDefault();
    });
    c(this, "handleMouseDown", (i) => {
      if (!(!this.map || !this.mapContainer)) {
        if (i.button === 1) {
          i.preventDefault();
          const t = Date.now();
          if (t - this.lastMiddleClickTime < 300) {
            this.zoomExtents();
            return;
          }
          this.lastMiddleClickTime = t, this.isPanning = !0, this.panHappened = !1, this.lastMousePos = { x: i.clientX, y: i.clientY }, this.mapContainer.style.cursor = "grabbing";
          return;
        }
        if (i.button === 0) {
          if (this.selectionHappened = !1, this.ctx.mapaController && this.ctx.mapaController.modoCliqueSequencialAtivo)
            return;
          const t = this.mapContainer.getBoundingClientRect(), e = i.clientX - t.left, o = i.clientY - t.top;
          this.isSelecting = !0, this.selectStartPos = { x: e, y: o }, this.selectStartPoint = this.map.mouseEventToContainerPoint(i), this.selectionDiv && (this.selectionDiv.style.left = `${e}px`, this.selectionDiv.style.top = `${o}px`, this.selectionDiv.style.width = "0px", this.selectionDiv.style.height = "0px", this.selectionDiv.style.display = "block"), this.setPanesPointerEvents("none");
        }
      }
    });
    c(this, "handleMouseMove", (i) => {
      if (!(!this.map || !this.mapContainer)) {
        if (this.isPanning) {
          const t = this.lastMousePos.x - i.clientX, e = this.lastMousePos.y - i.clientY;
          (Math.abs(t) > 1 || Math.abs(e) > 1) && (this.panHappened = !0), this.map.panBy([t, e], { animate: !1 }), this.lastMousePos = { x: i.clientX, y: i.clientY };
          return;
        }
        if (this.isSelecting && this.selectionDiv) {
          const t = this.mapContainer.getBoundingClientRect(), e = i.clientX - t.left, o = i.clientY - t.top, a = Math.abs(e - this.selectStartPos.x), r = Math.abs(o - this.selectStartPos.y), s = Math.min(e, this.selectStartPos.x), l = Math.min(o, this.selectStartPos.y);
          this.selectionDiv.style.left = `${Math.round(s)}px`, this.selectionDiv.style.top = `${Math.round(l)}px`, this.selectionDiv.style.width = `${Math.round(a)}px`, this.selectionDiv.style.height = `${Math.round(r)}px`, e >= this.selectStartPos.x ? (this.selectionDiv.style.background = "rgba(14, 116, 144, 0.22)", this.selectionDiv.style.border = "1px solid #06b6d4") : (this.selectionDiv.style.background = "rgba(16, 185, 129, 0.22)", this.selectionDiv.style.border = "1px dashed #10b981");
        }
      }
    });
    c(this, "handleMouseUp", (i) => {
      var t, e, o, a, r, s;
      if (this.isPanning && (this.isPanning = !1, this.mapContainer && (this.mapContainer.style.cursor = "grab"), setTimeout(() => {
        this.panHappened = !1;
      }, 120)), this.isSelecting) {
        if (this.isSelecting = !1, this.selectionDiv && (this.selectionDiv.style.display = "none"), !this.map || !this.mapContainer) return;
        this.map.closePopup(), setTimeout(() => {
          try {
            this.setPanesPointerEvents("auto"), this.ctx.layerManager && this.ctx.layerManager.ensurePanes();
          } catch {
          }
        }, 80);
        const l = this.mapContainer.getBoundingClientRect(), h = i.clientX - l.left, u = i.clientY - l.top, d = this.map.mouseEventToContainerPoint(i), p = Math.abs(h - this.selectStartPos.x), m = Math.abs(u - this.selectStartPos.y);
        if (p < 4 && m < 4) {
          this.selectionHappened = !1;
          const _ = i.target;
          _ && ((t = _.classList) != null && t.contains("leaflet-container") || _.id === "mapa-triagem" || (e = _.closest) != null && e.call(_, ".leaflet-pane")) && ((o = _.closest) != null && o.call(_, ".custom-leaflet-marker") || (a = _.closest) != null && a.call(_, ".custom-div-icon") || this.limparSelecao());
          return;
        }
        if (!this.selectStartPoint)
          return;
        this.selectionHappened = !0, setTimeout(() => {
          this.selectionHappened = !1;
        }, 120);
        const f = {
          x1: Math.min(this.selectStartPoint.x, d.x),
          y1: Math.min(this.selectStartPoint.y, d.y),
          x2: Math.max(this.selectStartPoint.x, d.x),
          y2: Math.max(this.selectStartPoint.y, d.y)
        }, b = ((r = this.ctx.mapaController) == null ? void 0 : r.getMarkers()) || [], g = ((s = this.ctx.mapaController) == null ? void 0 : s.getVizinhosMarkers()) || [], v = [], w = [], L = !this.ctx.layerManager || this.ctx.layerManager.isLayerActiveAndSelectable("vertices"), T = !this.ctx.layerManager || this.ctx.layerManager.isLayerActiveAndSelectable("vizinhos");
        L && b.forEach((_) => {
          const C = _.pontoId;
          if (!C) return;
          const x = this.map.latLngToContainerPoint(_.getLatLng());
          x.x >= f.x1 && x.x <= f.x2 && x.y >= f.y1 && x.y <= f.y2 && v.push(C);
        }), T && g.forEach((_) => {
          const C = _.pontoId;
          if (!C) return;
          const x = this.map.latLngToContainerPoint(_.getLatLng());
          x.x >= f.x1 && x.x <= f.x2 && x.y >= f.y1 && x.y <= f.y2 && w.push(C);
        }), i.ctrlKey || i.metaKey ? (v.forEach((_) => {
          this.ctx.selectedPontoIds.includes(_) ? this.ctx.selectedPontoIds = this.ctx.selectedPontoIds.filter((C) => C !== _) : this.ctx.selectedPontoIds.push(_);
        }), w.forEach((_) => {
          this.ctx.selectedVizinhoPontoIds.includes(_) ? this.ctx.selectedVizinhoPontoIds = this.ctx.selectedVizinhoPontoIds.filter((C) => C !== _) : this.ctx.selectedVizinhoPontoIds.push(_);
        })) : (this.ctx.selectedPontoIds = v, this.ctx.selectedVizinhoPontoIds = w), this.ctx.selectedPontoIds.length > 0 && (this.ctx.lastSelectedPontoId = this.ctx.selectedPontoIds[this.ctx.selectedPontoIds.length - 1]), this.notificarSelecao();
      }
    });
    c(this, "handleKeyDown", (i) => {
      if (i.key === "Escape") {
        const t = document.activeElement;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable))
          return;
        this.isSelecting && (this.isSelecting = !1, this.selectionDiv && (this.selectionDiv.style.display = "none"), this.setPanesPointerEvents("auto"), this.ctx.layerManager && this.ctx.layerManager.ensurePanes()), this.limparSelecao();
      }
    });
    this.ctx = {
      selectedPontoIds: [],
      selectedVizinhoPontoIds: [],
      lastSelectedPontoId: null,
      pontosList: [],
      ...i
    };
  }
  ativar(i, t) {
    if (this.ctx.mapaController = i, t && (this.ctx.containerHost = t), this.map = i.getMap(), !!this.map && (this.mapContainer = this.map.getContainer(), !!this.mapContainer)) {
      if (this.map.dragging.disable(), this.map.doubleClickZoom.disable(), !this.selectionDiv) {
        this.selectionDiv = document.createElement("div"), this.selectionDiv.className = "cad-selection-box", this.selectionDiv.style.position = "absolute", this.selectionDiv.style.zIndex = "9999", this.selectionDiv.style.pointerEvents = "none", this.selectionDiv.style.display = "none", this.selectionDiv.style.borderRadius = "2px";
        const e = this.mapContainer;
        e.style.position = "relative", e.appendChild(this.selectionDiv);
      }
      this.mapContainer.addEventListener("mousedown", this.handleMouseDown), this.mapContainer.addEventListener("mousemove", this.handleMouseMove), window.addEventListener("mouseup", this.handleMouseUp), this.mapContainer.addEventListener("contextmenu", this.handleContextMenu), window.addEventListener("keydown", this.handleKeyDown), this.mapContainer.addEventListener("touchstart", this.handleTouchStart, { passive: !1 }), this.mapContainer.addEventListener("touchmove", this.handleTouchMove, { passive: !1 }), this.mapContainer.addEventListener("touchend", this.handleTouchEnd), this.mapContainer.addEventListener("touchcancel", this.handleTouchEnd);
    }
  }
  desativar() {
    this.mapContainer && (this.mapContainer.removeEventListener("mousedown", this.handleMouseDown), this.mapContainer.removeEventListener("mousemove", this.handleMouseMove), this.mapContainer.removeEventListener("contextmenu", this.handleContextMenu), this.mapContainer.removeEventListener("touchstart", this.handleTouchStart), this.mapContainer.removeEventListener("touchmove", this.handleTouchMove), this.mapContainer.removeEventListener("touchend", this.handleTouchEnd), this.mapContainer.removeEventListener("touchcancel", this.handleTouchEnd)), window.removeEventListener("mouseup", this.handleMouseUp), window.removeEventListener("keydown", this.handleKeyDown), this.selectionDiv && this.selectionDiv.parentNode && (this.selectionDiv.parentNode.removeChild(this.selectionDiv), this.selectionDiv = null), this.map && (this.map.dragging.enable(), this.map.doubleClickZoom.enable()), this.setPanesPointerEvents("auto");
  }
  setPanesPointerEvents(i) {
    this.map && ci.forEach((t) => {
      var o;
      const e = (o = this.map) == null ? void 0 : o.getPane(t);
      e && (e.style.pointerEvents = i);
    });
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
    const i = this.ctx.pontosList.filter((t) => t.tipo_ponto !== "B" && t.tipo !== "B");
    i.length > 0 && this.ctx.mapaController && this.ctx.mapaController.fitBounds(i);
  }
  destroy() {
    this.desativar();
  }
}
class D {
  static register(i, t) {
    this.renderers.set(i.toLowerCase(), t);
  }
  static get(i) {
    return this.renderers.get(i.toLowerCase());
  }
  static has(i) {
    return this.renderers.has(i.toLowerCase());
  }
  static getRegisteredTypes() {
    return Array.from(this.renderers.keys());
  }
}
c(D, "renderers", /* @__PURE__ */ new Map());
class ui {
  render(i, t, e) {
    var l, h, u;
    const o = ((l = i.dados) == null ? void 0 : l.url) || "https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}", a = ((h = i.dados) == null ? void 0 : h.subdomains) || ["mt0", "mt1", "mt2", "mt3"], r = ((u = i.dados) == null ? void 0 : u.attribution) || "Google Satélite";
    return y.tileLayer(o, {
      maxZoom: 24,
      maxNativeZoom: 20,
      subdomains: a,
      attribution: r,
      keepBuffer: 16,
      updateWhenZooming: !1,
      updateWhenIdle: !0,
      className: "smooth-zoom-layer",
      opacity: i.opacidade !== void 0 ? i.opacidade : 1,
      pane: `pane-${i.id}`
    });
  }
  update(i, t, e) {
    t instanceof y.TileLayer && e.opacidade !== void 0 && t.setOpacity(e.opacidade);
  }
  destroy(i, t) {
    t.hasLayer(i) && t.removeLayer(i);
  }
}
class hi {
  render(i, t, e) {
    var h, u, d, p;
    const o = ((h = i.dados) == null ? void 0 : h.url) || "https://acervofundiario.incra.gov.br/i3geo/ogc.php", a = ((u = i.dados) == null ? void 0 : u.layers) || "certificada_sigef_particular_pr", r = ((d = i.dados) == null ? void 0 : d.format) || "image/png", s = ((p = i.dados) == null ? void 0 : p.attribution) || "INCRA/SIGEF";
    return y.tileLayer.wms(o, {
      layers: a,
      format: r,
      transparent: !0,
      version: "1.1.1",
      pane: `pane-${i.id}`,
      attribution: s,
      className: "sigef-wms-layer",
      keepBuffer: 8,
      updateWhenZooming: !1,
      updateWhenIdle: !0,
      opacity: i.opacidade !== void 0 ? i.opacidade : 0.85
    });
  }
  update(i, t, e) {
    t instanceof y.TileLayer.WMS && e.opacidade !== void 0 && t.setOpacity(e.opacidade);
  }
  destroy(i, t) {
    t.hasLayer(i) && t.removeLayer(i);
  }
}
class pi {
  constructor() {
    c(this, "zoomListenerMap", /* @__PURE__ */ new WeakMap());
  }
  render(i, t, e) {
    const o = y.layerGroup(), a = `pane-${i.id}`;
    this.rebuildLines(i, o, t, e, a);
    const r = () => {
      if (i.estilo.scaleMode === "world") {
        const s = this.calculateWeight(i, t, e);
        o.eachLayer((l) => {
          l.setStyle && l.setStyle({ weight: s });
        });
      }
    };
    return t.on("zoomend", r), this.zoomListenerMap.set(o, r), o;
  }
  calculateWeight(i, t, e) {
    const o = i.estilo.espessuraLinha || e.config.perimetroWeight || 2, a = e.graphicScale.lineScaleMultiplier || 1;
    if (i.estilo.scaleMode === "world") {
      const r = i.estilo.dimensaoMetros || 0.3, s = t.getCenter(), l = t.getZoom(), h = 40075016686e-3 * Math.abs(Math.cos(s.lat * Math.PI / 180)) / Math.pow(2, l + 8), u = r / (h > 0 ? h : 1);
      return Math.max(1, Math.round(u * a));
    }
    return Math.max(1, Math.round(o * a));
  }
  rebuildLines(i, t, e, o, a) {
    var b, g, v, w, L, T, _, C;
    const r = i.id === "homologados", s = ((b = i.dados) == null ? void 0 : b.conexoes) ?? (Array.isArray(i.dados) && i.dados.length > 0 && "origemId" in i.dados[0] ? i.dados : null), l = ((g = i.dados) == null ? void 0 : g.segmentos) || o.segmentos || [], h = ((v = i.dados) == null ? void 0 : v.pontos) || (r ? o.bancoPontos || [] : o.pontos) || [], u = this.calculateWeight(i, e, o), d = i.opacidade !== void 0 ? i.opacidade : 1, p = i.interativo && !i.bloqueada, m = [];
    h.forEach((x) => {
      const S = R(x.lat ?? x.latitude ?? x.y, x.lon ?? x.lng ?? x.longitude ?? x.x);
      S && m.push({ ...x, lat: S.lat, lon: S.lon });
    });
    const f = (x) => {
      const S = m.find((z) => String(z.id) === String(x));
      if (S) return S;
      if (o.pontos) {
        const z = o.pontos.find((N) => String(N.id) === String(x));
        if (z) {
          const N = R(z.lat, z.lon);
          if (N) return { ...z, lat: N.lat, lon: N.lon };
        }
      }
      return null;
    };
    if (s && Array.isArray(s)) {
      s.forEach((x) => {
        var N, H, M, O, $, A, k;
        const S = f(x.origemId), z = f(x.destinoId);
        if (S && z && S.lat && S.lon && z.lat && z.lon) {
          const P = x.tipoLinha === "tracejada" || ((N = x.estilo) == null ? void 0 : N.tipoLinha) === "tracejada", I = ((H = x.estilo) == null ? void 0 : H.cor) || ((M = x.estilo) == null ? void 0 : M.color) || i.estilo.corPrimaria || "#00f5a0", q = ((O = x.estilo) == null ? void 0 : O.espessura) || (($ = x.estilo) == null ? void 0 : $.weight) || u, B = y.polyline([[S.lat, S.lon], [z.lat, z.lon]], {
            color: I,
            weight: q,
            opacity: ((A = x.estilo) == null ? void 0 : A.opacidade) ?? d,
            dashArray: P ? "6, 6" : i.estilo.dashArray,
            pane: a,
            interactive: p
          });
          if (p) {
            const W = x.acoes || i.acoes || ((k = i.dados) == null ? void 0 : k.acoes) || [], U = `${x.origemId}-${x.destinoId}`, Y = J(W, U);
            B.bindPopup(`
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
                <div style="font-weight:700; font-size:12px; margin-bottom:3px; color:#ffffff;">Conexão ${E(String(x.origemId))} ↔ ${E(String(x.destinoId))}</div>
                <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Tipo: ${E(x.tipoLinha || "contínua")}</div>
                ${Y}
              </div>
            `, { className: "compact-popup", maxWidth: 220 }), B.on("popupopen", (Tt) => {
              if (o.modoSequencial) {
                B.closePopup();
                return;
              }
              tt(Tt.popup, x, o, B);
            });
          }
          B.addTo(t);
        }
      });
      return;
    }
    if ((w = i.dados) != null && w.polilinhaSequencial || ((L = i.dados) == null ? void 0 : L.fechar) !== void 0 && m.length >= 2) {
      const x = ((T = i.dados) == null ? void 0 : T.chaveGrupo) || o.chaveGrupo, S = it(m, x), z = ((_ = i.dados) == null ? void 0 : _.fechar) !== !1, N = i.estilo.corPrimaria || "#00f5a0";
      Object.entries(S).forEach(([H, M]) => {
        const O = ot(M);
        if (O.length < 2) return;
        const $ = O.map((k) => [k.lat, k.lon]), A = y.polyline($, {
          color: N,
          weight: u,
          opacity: d,
          dashArray: i.estilo.dashArray,
          pane: a,
          interactive: p
        });
        if (p && A.bindPopup(`
            <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
              <div style="font-weight:700; font-size:12px; margin-bottom:3px; color:#ffffff;">Polilinha: Grupo ${E(H)}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Vértices: ${O.length}</div>
            </div>
          `, { className: "compact-popup", maxWidth: 220 }), A.addTo(t), z && $.length >= 3) {
          const k = $[$.length - 1], P = $[0];
          y.polyline([k, P], {
            color: N,
            weight: u,
            opacity: d,
            dashArray: "4, 4",
            pane: a,
            interactive: p
          }).addTo(t);
        }
      });
      return;
    }
    if (!r && l && l.length > 0)
      l.forEach((x) => {
        var N;
        const S = m.find((H) => String(H.id) === String(x.ponto_inicio_id)), z = m.find((H) => String(H.id) === String(x.ponto_fim_id));
        if (S && z && S.lat && S.lon && z.lat && z.lon) {
          const H = x.tipo_limite_sigef || x.tipo_limite || "", M = x.metodo_posicionamento_sigef || x.metodo_posicionamento || "", O = H === "LA1" ? "#10b981" : H === "LN1" ? "#3b82f6" : "#00f5a0", $ = i.estilo.corPrimaria || O, A = y.polyline([[S.lat, S.lon], [z.lat, z.lon]], {
            color: $,
            weight: u,
            opacity: d,
            dashArray: H === "LN1" ? "6, 6" : i.estilo.dashArray,
            pane: a,
            interactive: p
          });
          if (p) {
            const k = x.acoes || i.acoes || ((N = i.dados) == null ? void 0 : N.acoes) || [], P = `${x.ponto_inicio_id}-${x.ponto_fim_id}`, I = J(k, P);
            A.bindPopup(`
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
                <div style="font-weight:700; font-size:12px; margin-bottom:3px; color:#ffffff;">${E(S.nome_vertice)} ↔ ${E(z.nome_vertice)}</div>
                <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Limite: ${E(H || "N/A")} · ${E(M || "N/A")}</div>
                ${I}
              </div>
            `, {
              className: "compact-popup",
              maxWidth: 220
            }), A.on("popupopen", (q) => {
              if (o.modoSequencial) {
                A.closePopup();
                return;
              }
              tt(q.popup, x, o, A);
            });
          }
          A.addTo(t);
        }
      });
    else if (m && m.length >= 2) {
      const x = m.filter(
        (M) => M.lat && M.lon && M.tipo_ponto !== "B" && M.tipo !== "B" && M.ignorar_poligono !== 1
      ), S = ((C = i.dados) == null ? void 0 : C.chaveGrupo) || o.chaveGrupo, z = it(x, S), N = i.estilo.corPrimaria || (r ? "#f59e0b" : "#10b981"), H = i.estilo.dashArray || (r ? "6, 8" : void 0);
      Object.values(z).forEach((M) => {
        const O = ot(M);
        if (O.length < 2) return;
        const $ = O.map((k) => [k.lat, k.lon]);
        if (y.polyline($, {
          color: N,
          weight: u,
          opacity: d,
          dashArray: H,
          pane: a,
          interactive: p
        }).addTo(t), $.length >= 3) {
          const k = $[$.length - 1], P = $[0];
          y.polyline([k, P], {
            color: N,
            weight: u,
            opacity: d,
            dashArray: r ? "6, 8" : "4, 4",
            pane: a,
            interactive: p
          }).addTo(t);
        }
      });
    }
  }
  update(i, t, e, o, a) {
    e.opacidade !== void 0 && e.estilo === void 0 && e.dados === void 0 || (e.opacidade !== void 0 || e.estilo !== void 0 || e.dados !== void 0) && (t.clearLayers(), this.rebuildLines(i, t, a, o, `pane-${i.id}`));
  }
  destroy(i, t) {
    const e = this.zoomListenerMap.get(i);
    e && (t.off("zoomend", e), this.zoomListenerMap.delete(i)), i.clearLayers(), t.hasLayer(i) && t.removeLayer(i);
  }
}
function at(n, i, t, e = "", o = "") {
  const a = `width: ${i + 4}px; height: ${i + 4}px;`, r = i;
  switch (n) {
    case "square":
      return `<div id="${o}" class="${t} ${e} rounded-sm shadow-md" style="width:${r}px; height:${r}px;"></div>`;
    case "circle-dot":
      return `
        <div id="${o}" class="relative flex items-center justify-center ${e}" style="${a}">
          <div class="${t} rounded-full shadow-md" style="width:${r}px; height:${r}px;"></div>
          <div class="absolute bg-white rounded-full" style="width:${Math.max(3, Math.floor(r / 3))}px; height:${Math.max(3, Math.floor(r / 3))}px;"></div>
        </div>
      `;
    case "x":
    case "cross":
      return `
        <div id="${o}" class="relative flex items-center justify-center ${e}" style="${a}">
          <svg width="${i + 2}" height="${i + 2}" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">
            <path d="M 2,2 L 8,8 M 8,2 L 2,8" stroke="#000000" stroke-width="2.5" stroke-linecap="round" />
            <path d="M 2,2 L 8,8 M 8,2 L 2,8" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
          </svg>
        </div>
      `;
    case "triangle":
      return `
        <div id="${o}" class="${e}" style="width:0; height:0; border-left:${r / 2}px solid transparent; border-right:${r / 2}px solid transparent; border-bottom:${r}px solid currentColor;"></div>
      `;
    case "circle":
    default:
      return `<div id="${o}" class="${t} ${e} rounded-full shadow-md" style="width:${r}px; height:${r}px;"></div>`;
  }
}
class mi {
  constructor() {
    c(this, "zoomListenerMap", /* @__PURE__ */ new WeakMap());
  }
  render(i, t, e) {
    const o = y.layerGroup(), a = `pane-${i.id}`;
    this.rebuildPoints(i, o, t, e, a);
    const r = () => {
      i.estilo.scaleMode === "world" && o.eachLayer((s) => {
        if (s.setIcon && s.baseSize && s.shapeStyle && s.markerBg && s.pontoId) {
          const l = this.calculateSize(i, t, e, s.baseSize), h = e.config.enableAnimations ? "transition-all duration-150" : "", u = at(s.shapeStyle, l, s.markerBg, h, `map-marker-${i.id}-${s.pontoId}`), d = y.divIcon({
            html: u,
            className: "custom-leaflet-marker flex items-center justify-center",
            iconSize: [l + 6, l + 6]
          });
          s.setIcon(d);
        }
      });
    };
    return t.on("zoomend", r), this.zoomListenerMap.set(o, r), o;
  }
  calculateSize(i, t, e, o) {
    const a = e.graphicScale.markerScaleMultiplier || 1;
    if (i.estilo.scaleMode === "world") {
      const r = i.estilo.dimensaoMetros || 0.25, s = t.getCenter(), l = t.getZoom(), h = 40075016686e-3 * Math.abs(Math.cos(s.lat * Math.PI / 180)) / Math.pow(2, l + 8), u = r / (h > 0 ? h : 1);
      return Math.max(o, Math.round(u * a));
    }
    return Math.max(4, Math.round(o * a));
  }
  rebuildPoints(i, t, e, o, a) {
    var d;
    const r = i.id === "homologados" || i.id === "homologados-pontos", s = i.id === "vizinhos", h = (((d = i.dados) == null ? void 0 : d.pontos) ?? (Array.isArray(i.dados) ? i.dados : null)) || (r ? o.bancoPontos || [] : o.pontos) || [], u = i.interativo && !i.bloqueada;
    h.forEach((p) => {
      var g;
      const m = p.lat ?? p.latitude ?? p.y, f = p.lon ?? p.lng ?? p.longitude ?? p.x, b = R(m, f);
      if (b) {
        const { lat: v, lon: w } = b, L = p.tipo_ponto === "B" || p.tipo === "B", T = p.tipo_ponto === "M" || p.tipo === "M";
        let _ = p.estilo || i.estilo.estiloMarcador || "circle", C = "bg-mint-vibrant", x = i.estilo.tamanhoMarcador || 7;
        r ? (_ = "circle", C = "bg-amber-500", x = 8) : s ? (_ = T ? "circle-dot" : "cross", C = "bg-[#a855f7]", x = T ? 10 : 8) : T ? (C = "bg-indigo-500", _ = "circle-dot", x = 10) : L && (C = "bg-rose-500", _ = "square", x = 9);
        const S = this.calculateSize(i, e, o, x), z = o.config.enableAnimations ? "transition-all duration-150" : "", N = at(_, S, C, z, `map-marker-${i.id}-${p.id}`), H = y.divIcon({
          html: N,
          className: "custom-leaflet-marker flex items-center justify-center",
          iconSize: [S + 6, S + 6]
        }), M = y.marker([v, w], {
          icon: H,
          pane: a,
          interactive: u
        });
        if (M.pontoId = p.id, M.layerId = i.id, M.isVizinho = s, M.baseSize = x, M.shapeStyle = _, M.markerBg = C, u) {
          let O = "";
          const $ = p.acoes || i.acoes || ((g = i.dados) == null ? void 0 : g.acoes) || [], A = J($, p.id);
          if (p.metadados && Object.keys(p.metadados).length > 0) {
            const k = Object.entries(p.metadados).map(([P, I]) => `<div style="font-size:11px; margin-bottom:2px;"><strong>${E(P)}:</strong> ${E(String(I))}</div>`).join("");
            O = `
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.35; min-width:160px;">
                <div style="font-weight:700; font-size:12px; margin-bottom:4px; color:#ffffff;">Ponto ${E(String(p.id))}</div>
                ${k}
                <div style="font-size:10px; color:rgba(255, 255, 255, 0.45); font-family:monospace; margin-top:3px;">Lat ${v.toFixed(6)} &nbsp; Lon ${w.toFixed(6)}</div>
                ${A}
              </div>
            `;
          } else {
            const k = r ? "Vértice Homologado SIGEF" : s ? "Confrontante (Importado)" : T ? "Base Homologada PPP" : L ? "Base de Campo (Translação)" : "Nó / Vértice", P = E(p.codigo_completo || p.nome_vertice || `Ponto ${String(p.id)}`), I = typeof p.este == "number" ? `Este (E): ${p.este.toFixed(2)} m` : "", q = typeof p.norte == "number" ? `Norte (N): ${p.norte.toFixed(2)} m` : "", B = typeof p.altitude == "number" ? `Alt (h): ${p.altitude.toFixed(2)} m` : "";
            O = `
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.35; min-width:170px;">
                <div style="font-weight:700; font-size:13px; margin-bottom:4px; color:${r ? "#fbbf24" : "#ffffff"};">${P}</div>
                <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">${E(k)} · ${E(p.tipo_ponto || p.tipo || "Ponto")}</div>
                ${I || q ? `<div style="font-size:10px; color:rgba(255, 255, 255, 0.7); font-family:monospace; margin-top:3px;">${I} ${q}</div>` : ""}
                ${B ? `<div style="font-size:10px; color:rgba(255, 255, 255, 0.7); font-family:monospace;">${B}</div>` : ""}
                <div style="font-size:10px; color:rgba(255, 255, 255, 0.45); font-family:monospace; margin-top:3px;">Lat ${v.toFixed(6)} &nbsp; Lon ${w.toFixed(6)}</div>
                ${A}
              </div>
            `;
          }
          M.bindPopup(O, {
            className: "compact-popup",
            maxWidth: 240
          }), M.on("click", () => {
            var k;
            if (o.modoSequencial && M.closePopup(), (k = i.dados) != null && k.onClique)
              try {
                i.dados.onClique(p);
              } catch (P) {
                console.error("Erro no callback onClique do ponto:", P);
              }
            o.onMarkerClick && o.onMarkerClick(p.id, s, p, { lat: v, lon: w });
          }), M.on("popupopen", (k) => {
            if (o.modoSequencial) {
              M.closePopup();
              return;
            }
            tt(k.popup, p, o, M);
          });
        }
        M.addTo(t);
      }
    });
  }
  update(i, t, e, o, a) {
    e.opacidade !== void 0 && e.estilo === void 0 && e.dados === void 0 && e.interativo === void 0 && e.bloqueada === void 0 || (e.estilo !== void 0 || e.dados !== void 0 || e.interativo !== void 0 || e.bloqueada !== void 0 || e.opacidade !== void 0) && (t.clearLayers(), this.rebuildPoints(i, t, a, o, `pane-${i.id}`));
  }
  destroy(i, t) {
    const e = this.zoomListenerMap.get(i);
    e && (t.off("zoomend", e), this.zoomListenerMap.delete(i)), i.clearLayers(), t.hasLayer(i) && t.removeLayer(i);
  }
}
class fi {
  render(i, t, e) {
    const o = y.layerGroup(), a = `pane-${i.id}`;
    return this.rebuildPolygons(i, o, e, a), o;
  }
  rebuildPolygons(i, t, e, o) {
    var d, p;
    const r = (((d = i.dados) == null ? void 0 : d.poligonos) ?? (Array.isArray(i.dados) ? i.dados : null)) || ((p = i.dados) == null ? void 0 : p.confrontantes) || e.confrontantes || [], s = i.interativo && !i.bloqueada, l = i.estilo.corPrimaria || "#a855f7", h = i.estilo.espessuraLinha || 1.5, u = i.opacidade !== void 0 ? i.opacidade : 0.8;
    r.forEach((m) => {
      var _, C, x, S, z, N, H, M, O, $;
      if (!m) return;
      const f = ((_ = m.estilo) == null ? void 0 : _.cor) || ((C = m.estilo) == null ? void 0 : C.color) || l, b = ((x = m.estilo) == null ? void 0 : x.espessura) || ((S = m.estilo) == null ? void 0 : S.weight) || h, g = ((z = m.estilo) == null ? void 0 : z.opacidade) ?? u, v = ((N = m.estilo) == null ? void 0 : N.fillColor) || f, w = ((H = m.estilo) == null ? void 0 : H.fillOpacity) ?? Math.min(0.2, g * 0.15), L = ((M = m.estilo) == null ? void 0 : M.dashArray) || i.estilo.dashArray || "4, 6";
      if (m.coordenadas && Array.isArray(m.coordenadas) && m.coordenadas.length >= 3) {
        const A = Array.isArray(m.coordenadas[0]) && Array.isArray(m.coordenadas[0][0]);
        let k;
        if (A ? k = m.coordenadas.map(
          (P) => P.map((I) => {
            const q = R(I[0], I[1]);
            return q ? [q.lat, q.lon] : null;
          }).filter(Boolean)
        ) : k = m.coordenadas.map((P) => {
          const I = R(P[0], P[1]);
          return I ? [I.lat, I.lon] : null;
        }).filter(Boolean), k && (A ? ((O = k[0]) == null ? void 0 : O.length) >= 3 : k.length >= 3)) {
          const P = y.polygon(k, {
            color: f,
            weight: b,
            opacity: g,
            dashArray: L,
            fillColor: v,
            fillOpacity: w,
            pane: o,
            interactive: s
          });
          if (P.poligonoId = m.id, P.layerId = i.id, s) {
            let I = "";
            m.metadados && Object.keys(m.metadados).length > 0 && (I = Object.entries(m.metadados).map(([q, B]) => `<div style="font-size:11px;"><strong>${E(q)}:</strong> ${E(String(B))}</div>`).join("")), P.bindPopup(`
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3; min-width:180px;">
                <div style="font-weight:700; font-size:12px; color:#c084fc; margin-bottom:3px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">Polígono ${E(String(m.id ?? ""))}</div>
                ${I || `<div style="font-size:11px;">Área vetorial definida por ${m.coordenadas.length} vértices</div>`}
              </div>
            `, { className: "compact-popup", maxWidth: 220 }), P.on("popupopen", () => {
              e.modoSequencial && P.closePopup();
            });
          }
          P.addTo(t);
          return;
        }
      }
      const T = m.wkt || m.poligono_wkt;
      if (T) {
        const A = [...T.matchAll(/\(([^()]+)\)/g)];
        if (A.length > 0) {
          const k = E(m.nome_propriedade || `Polígono ${String(m.id || "")}`), P = E(m.nome || "Proprietário"), I = [];
          if (A.forEach((q) => {
            const B = q[1].split(",").map((W) => {
              const U = W.trim().split(/\s+/);
              if (U.length < 2) return null;
              const Y = R(U[1], U[0]);
              return Y ? [Y.lat, Y.lon] : null;
            }).filter((W) => W !== null);
            B.length >= 3 && I.push(B);
          }), I.length > 0) {
            const q = I.length === 1 ? I[0] : I, B = y.polygon(q, {
              color: f,
              weight: b,
              opacity: g,
              dashArray: L,
              fillColor: v,
              fillOpacity: w,
              pane: o,
              interactive: s
            });
            if (B.poligonoId = m.id, B.layerId = i.id, s) {
              const W = m.acoes || i.acoes || (($ = i.dados) == null ? void 0 : $.acoes) || [], U = J(W, m.id);
              B.bindPopup(`
                <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3; min-width:180px;">
                  <div style="font-weight:700; font-size:12px; color:#c084fc; margin-bottom:3px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">${k}</div>
                  <div style="font-size:11px; margin-bottom:2px;"><strong>Identificador:</strong> ${E(String(m.id ?? ""))}</div>
                  ${m.nome ? `<div style="font-size:11px;"><strong>Proprietário:</strong> ${P}</div>` : ""}
                  ${U}
                </div>
              `, { className: "compact-popup", maxWidth: 220 }), B.on("popupopen", (Y) => {
                if (e.modoSequencial) {
                  B.closePopup();
                  return;
                }
                tt(Y.popup, m, e, B);
              });
            }
            B.addTo(t);
          }
        }
      }
      m.pontos && m.pontos.length > 0 && m.pontos.forEach((A) => {
        var P;
        const k = R(A.lat ?? A.latitude ?? A.y, A.lon ?? A.lng ?? A.longitude ?? A.x);
        if (k) {
          const I = y.divIcon({
            html: '<div style="width:8px; height:8px; background:#a855f7; border-radius:50%; border:1px solid #ffffff; box-shadow:0 0 4px rgba(168,85,247,0.8);"></div>',
            className: "custom-leaflet-marker flex items-center justify-center",
            iconSize: [12, 12]
          }), q = y.marker([k.lat, k.lon], {
            icon: I,
            pane: o,
            interactive: s
          });
          if (q.pontoId = A.id, q.isVizinho = !0, q.layerId = i.id, s) {
            const B = A.acoes || m.acoes || i.acoes || ((P = i.dados) == null ? void 0 : P.acoes) || [], W = J(B, A.id);
            q.bindPopup(`
                <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3; min-width:170px;">
                  <div style="font-weight:700; font-size:12px; color:#c084fc; margin-bottom:3px;">${E(A.nome_vertice || String(A.id))}</div>
                  <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Confrontante: ${E(m.nome || "Desconhecido")}</div>
                  <div style="font-size:10px; color:rgba(255, 255, 255, 0.45); font-family:monospace; margin-top:3px;">Lat ${k.lat.toFixed(6)} &nbsp; Lon ${k.lon.toFixed(6)}</div>
                  ${W}
                </div>
              `, { className: "compact-popup", maxWidth: 220 }), q.on("click", () => {
              e.modoSequencial && q.closePopup(), e.onMarkerClick && e.onMarkerClick(A.id, !0, A, { lat: k.lat, lon: k.lon });
            }), q.on("popupopen", (U) => {
              if (e.modoSequencial) {
                q.closePopup();
                return;
              }
              tt(U.popup, A, e, q);
            });
          }
          q.addTo(t);
        }
      });
    });
  }
  update(i, t, e, o) {
    e.opacidade !== void 0 && e.estilo === void 0 && e.dados === void 0 && e.interativo === void 0 && e.bloqueada === void 0 || (e.opacidade !== void 0 || e.estilo !== void 0 || e.dados !== void 0 || e.interativo !== void 0 || e.bloqueada !== void 0) && (t.clearLayers(), this.rebuildPolygons(i, t, o, `pane-${i.id}`));
  }
  destroy(i, t) {
    i.clearLayers(), t.hasLayer(i) && t.removeLayer(i);
  }
}
class bi {
  constructor() {
    c(this, "moveListenerMap", /* @__PURE__ */ new WeakMap());
  }
  render(i, t, e) {
    const o = y.layerGroup(), a = `pane-${i.id}`, r = () => {
      if (o.clearLayers(), !i.visivel) return;
      if (t.getZoom() > 20) {
        const l = t.getBounds(), h = l.getSouth(), u = l.getNorth(), d = l.getWest(), p = l.getEast(), m = t.getCenter(), f = 8999e-9, b = Math.cos(m.lat * Math.PI / 180), g = f / (b > 0.1 ? b : 1), v = Math.floor((u - h) / f), w = Math.floor((p - d) / g);
        if (v < 200 && w < 200) {
          const L = Math.ceil(h / f) * f;
          for (let _ = L; _ <= u; _ += f)
            y.polyline([[_, d], [_, p]], {
              color: i.estilo.corPrimaria || "rgba(0, 245, 160, 0.18)",
              weight: i.estilo.espessuraLinha || 0.6,
              interactive: !1,
              pane: a
            }).addTo(o);
          const T = Math.ceil(d / g) * g;
          for (let _ = T; _ <= p; _ += g)
            y.polyline([[h, _], [u, _]], {
              color: i.estilo.corPrimaria || "rgba(0, 245, 160, 0.18)",
              weight: i.estilo.espessuraLinha || 0.6,
              interactive: !1,
              pane: a
            }).addTo(o);
        }
      }
    };
    return r(), t.on("zoomend moveend", r), this.moveListenerMap.set(o, r), o;
  }
  update(i, t) {
    i.visivel || t.clearLayers();
  }
  destroy(i, t) {
    const e = this.moveListenerMap.get(i);
    e && (t.off("zoomend moveend", e), this.moveListenerMap.delete(i)), i.clearLayers(), t.hasLayer(i) && t.removeLayer(i);
  }
}
D.register("tile", new ui());
D.register("wms", new hi());
D.register("vetorial-linhas", new pi());
D.register("vetorial-pontos", new mi());
D.register("vetorial-poligonos", new fi());
D.register("grid", new bi());
const gi = [
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
    id: "homologados-pontos",
    nome: "Marcos Homologados (SIGEF)",
    categoria: "referencia",
    tipo: "vetorial-pontos",
    visivel: !0,
    opacidade: 1,
    zIndex: 660,
    interativo: !0,
    bloqueada: !1,
    estilo: {
      tamanhoMarcador: 8,
      corPrimaria: "#f59e0b",
      estiloMarcador: "circle",
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
class vi {
  constructor(i) {
    c(this, "layers", []);
    c(this, "layerInstances", /* @__PURE__ */ new Map());
    c(this, "map", null);
    c(this, "context", null);
    c(this, "listeners", []);
    this.layers = (i || gi).map((t) => ({ ...t, estilo: { ...t.estilo } }));
  }
  attachMap(i, t) {
    this.map = i, this.context = t, this.ensurePanes(), this.renderAllLayers();
  }
  ensurePanes() {
    if (!this.map) return;
    this.layers.forEach((t) => {
      const e = `pane-${t.id}`;
      let o = this.map.getPane(e);
      o || (o = this.map.createPane(e)), o && (o.style.zIndex = String(t.zIndex), o.style.pointerEvents = t.interativo && !t.bloqueada && t.visivel ? "auto" : "none");
    }), ["verticesPane", "perimetroPane", "overlayPane"].forEach((t) => {
      const e = this.map.getPane(t);
      e && (e.style.pointerEvents = "auto");
    });
    let i = this.map.getPane("pane-destaque");
    i || (i = this.map.createPane("pane-destaque")), i && (i.style.zIndex = "850", i.style.pointerEvents = "none");
  }
  renderAllLayers() {
    !this.map || !this.context || (this.layers.forEach((i) => {
      if (this.layerInstances.has(i.id)) {
        const t = this.layerInstances.get(i.id), e = D.get(i.tipo);
        e && e.destroy(t, this.map), this.layerInstances.delete(i.id);
      }
      if (i.visivel) {
        const t = D.get(i.tipo);
        if (t) {
          const e = t.render(i, this.map, this.context);
          e && (e.addTo(this.map), this.layerInstances.set(i.id, e));
        }
      }
    }), this.notifyChange());
  }
  setLayerVisibility(i, t) {
    const e = this.layers.find((r) => r.id === i);
    if (!e || e.visivel === t || (e.visivel = t, !this.map || !this.context)) return;
    const o = `pane-${e.id}`, a = this.map.getPane(o);
    if (a && (a.style.display = t ? "" : "none", a.style.pointerEvents = e.visivel && e.interativo && !e.bloqueada ? "auto" : "none"), t) {
      if (!this.layerInstances.has(i)) {
        const r = D.get(e.tipo);
        if (r) {
          const s = r.render(e, this.map, this.context);
          s && (s.addTo(this.map), this.layerInstances.set(i, s));
        }
      }
    } else if (this.layerInstances.has(i)) {
      const r = this.layerInstances.get(i), s = D.get(e.tipo);
      s && s.destroy(r, this.map), this.layerInstances.delete(i);
    }
    this.notifyChange();
  }
  setLayerOpacity(i, t) {
    const e = this.layers.find((a) => a.id === i);
    if (!e) return;
    if (e.opacidade = Math.max(0, Math.min(1, t)), this.map) {
      const a = this.map.getPane(`pane-${i}`);
      a && (a.style.opacity = String(e.opacidade));
    }
    const o = this.layerInstances.get(i);
    if (o && this.map && this.context) {
      const a = D.get(e.tipo);
      a && a.update(e, o, { opacidade: e.opacidade }, this.context, this.map);
    }
    this.notifyChange();
  }
  setLayerZIndex(i, t) {
    const e = this.layers.find((o) => o.id === i);
    if (e) {
      if (e.zIndex = t, this.map) {
        const o = this.map.getPane(`pane-${i}`);
        o && (o.style.zIndex = String(t));
      }
      this.notifyChange();
    }
  }
  setLayerBlocked(i, t) {
    const e = this.layers.find((o) => o.id === i);
    if (e) {
      if (e.bloqueada = t, this.map) {
        const o = this.map.getPane(`pane-${i}`);
        o && (o.style.pointerEvents = e.visivel && e.interativo && !t ? "auto" : "none");
      }
      this.notifyChange();
    }
  }
  setLayerScaleMode(i, t) {
    const e = this.layers.find((a) => a.id === i);
    if (!e) return;
    e.estilo.scaleMode = t;
    const o = this.layerInstances.get(i);
    if (o && this.map && this.context) {
      const a = D.get(e.tipo);
      a && a.update(e, o, { estilo: e.estilo }, this.context, this.map);
    }
    this.notifyChange();
  }
  setGraphicScale(i) {
    this.context && (this.context.graphicScale = { ...this.context.graphicScale, ...i }, this.renderAllLayers());
  }
  updateContext(i) {
    this.context && (this.context = { ...this.context, ...i }, this.renderAllLayers());
  }
  getLayers() {
    return [...this.layers];
  }
  getActiveSelectableLayers() {
    return this.layers.filter((i) => i.visivel && i.interativo && !i.bloqueada);
  }
  isLayerActiveAndSelectable(i) {
    const t = this.layers.find((e) => e.id === i);
    return !!(t && t.visivel && t.interativo && !t.bloqueada);
  }
  getLayerInstance(i) {
    return this.layerInstances.get(i);
  }
  getAllLayerInstances() {
    return Array.from(this.layerInstances.values());
  }
  /**
   * Obtém uma camada existente ou a cria dinamicamente de forma agnóstica.
   */
  getOrCreateLayer(i, t = "vetorial-pontos", e, o = "custom") {
    let a = this.layers.find((r) => r.id === i);
    if (!a) {
      if (a = {
        id: i,
        nome: e || i,
        categoria: o,
        tipo: t,
        visivel: !0,
        opacidade: 1,
        zIndex: t === "vetorial-pontos" ? 650 : t === "vetorial-linhas" ? 450 : 500,
        interativo: !0,
        bloqueada: !1,
        estilo: { scaleMode: "screen" }
      }, this.layers.push(a), this.map) {
        const r = `pane-${a.id}`;
        let s = this.map.getPane(r);
        s || (s = this.map.createPane(r)), s && (s.style.zIndex = String(a.zIndex), s.style.pointerEvents = "auto");
      }
      this.notifyChange();
    }
    return a;
  }
  /**
   * Define os dados de uma camada e solicita re-renderização ao renderizador correspondente.
   */
  setLayerData(i, t) {
    const e = this.layers.find((a) => a.id === i);
    if (!e) return;
    e.dados = t;
    const o = this.layerInstances.get(i);
    if (o && this.map && this.context) {
      const a = D.get(e.tipo);
      a && a.update(e, o, { dados: t }, this.context, this.map);
    } else if (this.map && this.context && e.visivel) {
      const a = D.get(e.tipo);
      if (a) {
        const r = a.render(e, this.map, this.context);
        r && (r.addTo(this.map), this.layerInstances.set(i, r));
      }
    }
    this.notifyChange();
  }
  /**
   * Remove entidades das camadas especificadas ou de todas as camadas vetoriais se omitido.
   */
  clearLayers(i) {
    (i && i.length > 0 ? this.layers.filter((e) => i.includes(e.id)) : this.layers.filter((e) => typeof e.tipo == "string" && e.tipo.startsWith("vetorial"))).forEach((e) => {
      e.dados = null;
      const o = this.layerInstances.get(e.id);
      o && o.clearLayers && o.clearLayers();
    }), !i || i.length === 0 ? this.context && (this.context.pontos = [], this.context.segmentos = [], this.context.confrontantes = []) : this.context && (i.includes("vertices") && (this.context.pontos = []), (i.includes("linhas") || i.includes("perimetro") || i.includes("polilinha")) && (this.context.segmentos = []), (i.includes("poligonos") || i.includes("vizinhos")) && (this.context.confrontantes = [])), this.notifyChange();
  }
  exportState() {
    return this.layers.map((i) => ({
      id: i.id,
      visivel: i.visivel,
      opacidade: i.opacidade,
      zIndex: i.zIndex,
      bloqueada: i.bloqueada,
      estilo: { ...i.estilo }
    }));
  }
  importState(i) {
    !i || !Array.isArray(i) || (i.forEach((t) => {
      const e = this.layers.find((o) => o.id === t.id);
      e && (t.visivel !== void 0 && (e.visivel = t.visivel), t.opacidade !== void 0 && (e.opacidade = t.opacidade), t.zIndex !== void 0 && (e.zIndex = t.zIndex), t.bloqueada !== void 0 && (e.bloqueada = t.bloqueada), t.estilo && (e.estilo = { ...e.estilo, ...t.estilo }));
    }), this.ensurePanes(), this.renderAllLayers());
  }
  onChange(i) {
    return this.listeners.push(i), () => {
      this.listeners = this.listeners.filter((t) => t !== i);
    };
  }
  notifyChange() {
    const i = this.getLayers();
    this.listeners.forEach((t) => {
      try {
        t(i);
      } catch (e) {
        console.error("Erro no listener de camadas:", e);
      }
    });
  }
  destroy() {
    this.map && (this.layerInstances.forEach((i, t) => {
      const e = this.layers.find((o) => o.id === t);
      if (e) {
        const o = D.get(e.tipo);
        o && o.destroy(i, this.map);
      }
    }), this.layerInstances.clear()), this.listeners = [];
  }
}
class xi {
  constructor(i) {
    c(this, "core");
    c(this, "layerManager");
    c(this, "canvasInteracao");
    c(this, "context");
    c(this, "modoCliqueSequencialAtivo", !1);
    c(this, "chaveGrupo");
    c(this, "zonaProjecao", 22);
    c(this, "levantamentoId", null);
    c(this, "customMarkerClickCallback");
    c(this, "customPopupActionCallback");
    c(this, "destaqueMarker", null);
    c(this, "destaqueTimeoutId", null);
    this.core = new li(this), this.layerManager = new vi(i), this.canvasInteracao = new di({
      mapaController: this,
      layerManager: this.layerManager
    }), this.context = {
      pontos: [],
      segmentos: [],
      bancoPontos: [],
      confrontantes: [],
      zonaProjecao: 22,
      config: this.core.config,
      graphicScale: {
        markerScaleMultiplier: 1,
        lineScaleMultiplier: 1,
        scaleModeGlobal: "screen"
      },
      onMarkerClick: (t, e, o, a) => {
        if (this.modoCliqueSequencialAtivo || this.context.modoSequencial)
          return;
        if (this.customMarkerClickCallback)
          try {
            this.customMarkerClickCallback(Number(t), e);
          } catch (s) {
            console.error("Erro no customMarkerClickCallback:", s);
          }
        const r = Number(t);
        e ? this.canvasInteracao.ctx.selectedVizinhoPontoIds = [r] : (this.canvasInteracao.ctx.selectedPontoIds = [r], this.canvasInteracao.ctx.lastSelectedPontoId = r), window.dispatchEvent(new CustomEvent("gerencigeo:ponto-selecionado", {
          detail: { selectedPontoIds: [r], lastSelectedPontoId: r, isVizinho: e }
        }));
      },
      onPopupAcao: (t, e, o) => {
        if (this.customPopupActionCallback)
          try {
            this.customPopupActionCallback(t, e, o);
          } catch (a) {
            console.error("Erro no customPopupActionCallback:", a);
          }
      }
    };
  }
  init(i, t) {
    const e = this.core.init(i);
    return e && (this.layerManager.attachMap(e, this.context), this.canvasInteracao.ativar(this, t)), e;
  }
  invalidateSize() {
    try {
      this.core && (typeof this.core.invalidateSize == "function" ? this.core.invalidateSize() : this.core.map && typeof this.core.map.invalidateSize == "function" && this.core.map.invalidateSize());
    } catch {
    }
  }
  setPontos(i) {
    const t = i || [];
    this.context.pontos = t, this.canvasInteracao.ctx.pontosList = t, this.layerManager.updateContext({ pontos: t });
  }
  setSegmentos(i) {
    const t = i || [];
    this.context.segmentos = t, this.layerManager.updateContext({ segmentos: t });
  }
  setBancoPontos(i) {
    const t = i || [];
    this.context.bancoPontos = t, this.layerManager.updateContext({ bancoPontos: t });
  }
  setConfrontantes(i) {
    const t = i || [];
    this.context.confrontantes = t, this.layerManager.updateContext({ confrontantes: t });
  }
  // --- API Pública Agnóstica de Entidades Vetoriais e Camadas ---
  /**
   * Ingestão de nós pontuais na camada indicada (padrão: 'vertices').
   */
  plotarPontos(i, t = "vertices", e) {
    const o = i || [];
    this.layerManager.getOrCreateLayer(t, "vetorial-pontos", "Pontos / Vértices"), t === "vertices" && (this.context.pontos = o, this.canvasInteracao.ctx.pontosList = o, e && (this.customMarkerClickCallback = (a) => {
      const r = o.find((s) => String(s.id) === String(a)) || { id: a, lat: 0, lon: 0 };
      e(r);
    })), this.layerManager.setLayerData(t, { pontos: o, onClique: e }), this.layerManager.setLayerVisibility(t, !0);
  }
  /**
   * Plota linhas vinculando pares de IDs (origemId -> destinoId).
   */
  plotarConexoes(i, t = "linhas") {
    const e = i || [];
    this.layerManager.getOrCreateLayer(t, "vetorial-linhas", "Conexões / Linhas"), (t === "linhas" || t === "perimetro") && (this.context.segmentos = e.map((o) => ({
      ponto_inicio_id: Number(o.origemId) || 0,
      ponto_fim_id: Number(o.destinoId) || 0,
      tipo_limite_sigef: o.tipoLinha === "tracejada" ? "LN1" : "LA1"
    }))), this.layerManager.setLayerData(t, { conexoes: e }), this.layerManager.setLayerVisibility(t, !0);
  }
  /**
   * Conecta a lista ordenada de pontos em sequência (P1 -> P2 -> ... -> Pn) com fechamento opcional (Pn -> P1).
   */
  plotarPolilinhaSequencial(i, t = !0, e = "polilinha", o) {
    const a = i || [];
    this.layerManager.getOrCreateLayer(e, "vetorial-linhas", "Polilinhas"), (e === "polilinha" || e === "perimetro") && (this.context.pontos = a, this.context.segmentos = [], this.canvasInteracao.ctx.pontosList = a);
    const r = o || this.chaveGrupo || this.context.chaveGrupo;
    this.layerManager.setLayerData(e, {
      pontos: a,
      fechar: t !== !1,
      polilinhaSequencial: !0,
      chaveGrupo: r
    }), this.layerManager.setLayerVisibility(e, !0);
  }
  /**
   * Plota áreas a partir de anéis de coordenadas ou strings WKT.
   */
  plotarPoligonos(i, t = "poligonos") {
    const e = i || [];
    this.layerManager.getOrCreateLayer(t, "vetorial-poligonos", "Polígonos"), this.layerManager.setLayerData(t, { poligonos: e }), this.layerManager.setLayerVisibility(t, !0);
  }
  /**
   * Remove entidades das camadas especificadas ou de todas as camadas vetoriais se omitido.
   */
  limparCamadas(i) {
    this.layerManager.clearLayers(i), (!i || i.length === 0) && this.canvasInteracao.limparSelecao();
  }
  /**
   * Retorna as instâncias gráficas ativas no canvas (de uma camada específica ou de todas).
   */
  obterMarcadores(i) {
    if (i) {
      const t = [], e = this.layerManager.getLayerInstance(i);
      if (e) {
        const o = (a) => {
          a instanceof y.Marker && t.push(a);
        };
        o(e), typeof e.eachLayer == "function" && e.eachLayer(o);
      }
      return t;
    }
    return this.getMarkers();
  }
  /**
   * Plota os pontos do levantamento e opcionalmente associa callback de clique.
   */
  plotPontos(i, t) {
    t && (this.customMarkerClickCallback = t), this.setPontos(i || []);
  }
  /**
   * Plota os segmentos cadastrados conectando os pontos correspondentes.
   */
  plotSegmentos(i, t) {
    const e = i || [];
    if (t != null) {
      const o = t || [];
      this.context.pontos = o, this.canvasInteracao.ctx.pontosList = o;
    }
    this.context.segmentos = e, this.layerManager.updateContext({
      segmentos: e,
      ...t != null ? { pontos: this.context.pontos } : {}
    });
  }
  /**
   * Define os pontos e limpa os segmentos para forçar o fechamento automático da poligonal pelo caminhamento (Pn -> P1).
   */
  plotPolilinhaTemporaria(i) {
    const t = i || [];
    this.context.pontos = t, this.context.segmentos = [], this.canvasInteracao.ctx.pontosList = t, this.layerManager.updateContext({
      pontos: t,
      segmentos: []
    });
  }
  /**
   * Alimenta a camada de vértices homologados do SIGEF.
   */
  plotPoligonalHomologada(i) {
    const t = i || [];
    this.setBancoPontos(t), this.layerManager.setLayerVisibility("homologados", !0), this.layerManager.setLayerVisibility("homologados-pontos", !0);
  }
  /**
   * Alimenta a camada de vértices confrontantes com marcadores e polilinhas.
   */
  plotPontosVizinhos(i) {
    const t = i || [], e = /* @__PURE__ */ new Map();
    t.forEach((r) => {
      const s = r.lat ?? r.latitude ?? r.y, l = r.lon ?? r.lng ?? r.longitude ?? r.x, h = R(s, l);
      h && (r.lat = h.lat, r.lon = h.lon);
      const u = r.confrontante_id ?? r.id_confrontante ?? 0;
      e.has(u) || e.set(u, []), e.get(u).push(r);
    });
    const o = /* @__PURE__ */ new Map();
    (this.context.confrontantes || []).forEach((r) => {
      const s = r.id !== void 0 && r.id !== null ? r.id : 0;
      o.set(s, { ...r, pontos: [] });
    }), e.forEach((r, s) => {
      var l, h;
      if (o.has(s)) {
        const u = o.get(s);
        u.pontos = r;
      } else
        o.set(s, {
          id: s,
          nome: ((l = r[0]) == null ? void 0 : l.nome_confrontante) || "Confrontante",
          nome_propriedade: ((h = r[0]) == null ? void 0 : h.nome_propriedade) || "",
          pontos: r
        });
    });
    const a = Array.from(o.values()).filter((r) => r.pontos && r.pontos.length > 0 || !!r.poligono_wkt);
    this.setConfrontantes(a), this.layerManager.setLayerVisibility("vizinhos", !0);
  }
  /**
   * Alimenta a camada de limites em polígonos WKT.
   */
  plotPoligonosVizinhos(i) {
    const t = i || [], e = /* @__PURE__ */ new Map();
    (this.context.confrontantes || []).forEach((a) => {
      a.id !== void 0 && a.id !== null && a.pontos && a.pontos.length > 0 && e.set(a.id, a.pontos);
    });
    const o = t.map((a) => {
      const r = a.id !== void 0 && a.id !== null ? a.id : void 0;
      return r !== void 0 && (!a.pontos || a.pontos.length === 0) && e.has(r) ? { ...a, pontos: e.get(r) } : { ...a };
    });
    this.setConfrontantes(o), this.layerManager.setLayerVisibility("vizinhos", !0);
  }
  /**
   * Reseta as camadas vetoriais de trabalho, permitindo preservar opcionalmente o banco de pontos homologados.
   */
  clearOverlays(i = !1) {
    this.context.pontos = [], this.context.segmentos = [], this.context.confrontantes = [], this.canvasInteracao.ctx.pontosList = [], this.canvasInteracao.limparSelecao();
    const t = {
      pontos: [],
      segmentos: [],
      confrontantes: []
    };
    i || (this.context.bancoPontos = [], t.bancoPontos = []), this.layerManager.updateContext(t);
  }
  setGraphicScale(i) {
    this.layerManager.setGraphicScale(i);
  }
  exportState() {
    return this.layerManager.exportState();
  }
  importState(i) {
    this.layerManager.importState(i);
  }
  selectPonto(i, t) {
    if (!this.core.map) return;
    const o = this.getMarkers().find((a) => a.pontoId === i);
    if (o) {
      const a = t !== void 0 ? t : this.core.map.getZoom();
      this.core.map.setView(o.getLatLng(), a), o.openPopup();
    }
  }
  fitBounds(i, t = [40, 40], e = !1) {
    if (!this.core.map) return;
    let a = [...i || this.context.pontos || []];
    e && this.context.confrontantes && this.context.confrontantes.forEach((s) => {
      s.pontos && a.push(...s.pontos);
    });
    const r = a.map((s) => {
      const l = s.lat ?? s.latitude ?? s.y, h = s.lon ?? s.lng ?? s.longitude ?? s.x, u = R(l, h);
      return u ? y.latLng(u.lat, u.lon) : null;
    }).filter((s) => s !== null);
    if (r.length === 1)
      this.core.map.setView(r[0], 18);
    else if (r.length > 1) {
      const s = y.latLngBounds(r);
      this.core.map.fitBounds(s, { padding: t }), this.core.map.once("moveend", () => {
        this.core.preCarregarTilesRegiao(s);
      });
    }
    try {
      this.core.map.invalidateSize();
    } catch {
    }
  }
  getMarkers() {
    const i = [], t = /* @__PURE__ */ new Set(), e = (o) => {
      o instanceof y.Marker && o.pontoId !== void 0 && !t.has(o) && (t.add(o), i.push(o));
    };
    return this.core.map && this.core.map.eachLayer((o) => {
      e(o), typeof o.eachLayer == "function" && o.eachLayer(e);
    }), this.layerManager && this.layerManager.getAllLayerInstances().forEach((o) => {
      e(o), typeof o.eachLayer == "function" && o.eachLayer(e);
    }), i;
  }
  getVizinhosMarkers() {
    return this.getMarkers().filter((i) => !!i.isVizinho);
  }
  get destaqueAtivo() {
    return this.destaqueMarker !== null;
  }
  /**
   * Localiza a coordenada geográfica central de qualquer elemento geométrico do canvas pelo identificador (ID).
   * Agnóstico a entidades pontuais, lineares e poligonais.
   */
  localizarCoordenadasElemento(i) {
    var r, s;
    if (i == null) return null;
    const t = String(i).trim(), e = (l) => l ? (l.lon = l.lng, l) : null, a = this.getMarkers().find((l) => {
      var m, f, b, g;
      const h = l.pontoId, u = l.elementoId ?? l.id ?? ((m = l.options) == null ? void 0 : m.pontoId) ?? ((f = l.options) == null ? void 0 : f.id), d = (b = l.elemento) == null ? void 0 : b.nome_vertice, p = (g = l.elemento) == null ? void 0 : g.codigo_completo;
      return String(h) === t || String(u) === t || d && String(d).toLowerCase() === t.toLowerCase() || p && String(p).toLowerCase() === t.toLowerCase();
    });
    if (a && typeof a.getLatLng == "function")
      return e(a.getLatLng());
    if (this.layerManager)
      for (const l of this.layerManager.getAllLayerInstances()) {
        let h = null;
        const u = (d) => {
          var f, b, g, v, w;
          if (h) return;
          const p = d.pontoId ?? d.elementoId ?? d.id ?? ((f = d.options) == null ? void 0 : f.id) ?? ((b = d.options) == null ? void 0 : b.pontoId), m = ((g = d.elemento) == null ? void 0 : g.nome) ?? ((v = d.elemento) == null ? void 0 : v.nome_vertice) ?? ((w = d.options) == null ? void 0 : w.nome);
          (String(p) === t || m && String(m).toLowerCase() === t.toLowerCase()) && (typeof d.getLatLng == "function" ? h = d.getLatLng() : typeof d.getBounds == "function" && (h = d.getBounds().getCenter()));
        };
        if (u(l), typeof l.eachLayer == "function" && l.eachLayer(u), h) return e(h);
      }
    if (this.context.pontos && this.context.pontos.length > 0) {
      const l = this.context.pontos.find(
        (h) => String(h.id) === t || h.nome_vertice && String(h.nome_vertice).toLowerCase() === t.toLowerCase()
      );
      if (l) {
        const h = l.lat ?? l.latitude ?? l.y, u = l.lon ?? l.lng ?? l.longitude ?? l.x, d = R(h, u);
        if (d) return e(y.latLng(d.lat, d.lon));
      }
    }
    if (this.context.bancoPontos && this.context.bancoPontos.length > 0) {
      const l = this.context.bancoPontos.find(
        (h) => String(h.id) === t || h.codigo_completo && String(h.codigo_completo).toLowerCase() === t.toLowerCase() || h.nome_vertice && String(h.nome_vertice).toLowerCase() === t.toLowerCase()
      );
      if (l) {
        const h = l.lat ?? l.latitude ?? l.y, u = l.lon ?? l.lng ?? l.longitude ?? l.x, d = R(h, u);
        if (d) return e(y.latLng(d.lat, d.lon));
      }
    }
    if (this.context.confrontantes && this.context.confrontantes.length > 0) {
      const l = this.context.confrontantes.find(
        (h) => String(h.id) === t || h.nome && String(h.nome).toLowerCase() === t.toLowerCase() || h.nome_propriedade && String(h.nome_propriedade).toLowerCase() === t.toLowerCase()
      );
      if (l) {
        if (l.pontos && l.pontos.length > 0) {
          let h = 0, u = 0, d = 0;
          for (const p of l.pontos) {
            const m = p.lat ?? p.latitude ?? p.y, f = p.lon ?? p.lng ?? p.longitude ?? p.x, b = R(m, f);
            b && (h += b.lat, u += b.lon, d++);
          }
          if (d > 0)
            return e(y.latLng(h / d, u / d));
        }
        if (l.poligono_wkt) {
          const h = vt(l.poligono_wkt);
          if (h) return e(y.latLng(h.lat, h.lon));
        }
      }
    }
    if (this.context.segmentos && this.context.segmentos.length > 0) {
      const l = this.context.segmentos.find(
        (h) => String(h.id) === t || `${h.ponto_inicio_id}-${h.ponto_fim_id}` === t
      );
      if (l) {
        const h = (r = this.context.pontos) == null ? void 0 : r.find((d) => String(d.id) === String(l.ponto_inicio_id)), u = (s = this.context.pontos) == null ? void 0 : s.find((d) => String(d.id) === String(l.ponto_fim_id));
        if (h && u) {
          const d = R(h.lat ?? h.latitude, h.lon ?? h.longitude), p = R(u.lat ?? u.latitude, u.lon ?? u.longitude);
          if (d && p)
            return e(y.latLng((d.lat + p.lat) / 2, (d.lon + p.lon) / 2));
        }
      }
    }
    if (this.layerManager) {
      for (const l of this.layerManager.getLayers())
        if (l.dados) {
          if (Array.isArray(l.dados.pontos)) {
            const h = l.dados.pontos.find((u) => String(u.id) === t || u.nome_vertice && String(u.nome_vertice) === t);
            if (h) {
              const u = R(h.lat, h.lon);
              if (u) return e(y.latLng(u.lat, u.lon));
            }
          }
          if (Array.isArray(l.dados.poligonos)) {
            const h = l.dados.poligonos.find((u) => String(u.id) === t);
            if (h) {
              if (h.wkt) {
                const u = vt(h.wkt);
                if (u) return e(y.latLng(u.lat, u.lon));
              }
              if (Array.isArray(h.coordenadas) && h.coordenadas.length > 0) {
                let u = 0, d = 0, p = 0;
                for (const m of h.coordenadas) {
                  const f = R(m[0], m[1]) || R(m[1], m[0]);
                  f && (u += f.lat, d += f.lon, p++);
                }
                if (p > 0) return e(y.latLng(u / p, d / p));
              }
            }
          }
        }
    }
    return null;
  }
  /**
   * Localiza, enquadra e pulsa visualmente qualquer elemento geométrico do canvas pelo identificador.
   * Não interfere no estado dos marcadores originais e limpa instâncias anteriores.
   *
   * @param id Identificador do elemento (número ou string)
   * @param opcoes Configurações de câmera, duração e cor de destaque
   */
  destacarElemento(i, t) {
    var p, m;
    this.limparDestaque();
    const e = this.getMap();
    if (!e) return;
    const o = this.localizarCoordenadasElemento(i);
    if (!o) {
      console.warn(`[ui-canvas-cad] Elemento com identificador "${i}" não encontrado para destaque.`);
      return;
    }
    const a = (t == null ? void 0 : t.pan) === !0, r = t == null ? void 0 : t.zoom;
    a ? r !== void 0 ? typeof e.flyTo == "function" ? e.flyTo(o, r, { animate: !0 }) : e.setView(o, r, { animate: !0 }) : typeof e.panTo == "function" ? e.panTo(o, { animate: !0 }) : e.setView(o, e.getZoom(), { animate: !0 }) : r !== void 0 && e.setZoom(r, { animate: !0 });
    const s = (t == null ? void 0 : t.cor) || "#00f5a0", l = "pane-destaque";
    let h = e.getPane(l);
    h || (h = e.createPane(l)), h && (h.style.zIndex = "850", h.style.pointerEvents = "none");
    const u = y.divIcon({
      className: "cad-destaque-marker-container",
      html: `
        <div class="cad-pulse-highlight" style="--cad-pulse-cor: ${E(s)};">
          <div class="cad-pulse-core"></div>
          <div class="cad-pulse-ring ring-1"></div>
          <div class="cad-pulse-ring ring-2"></div>
        </div>
      `,
      iconSize: [52, 52],
      iconAnchor: [26, 26]
    });
    this.destaqueMarker = y.marker(o, {
      icon: u,
      pane: l,
      interactive: !1,
      keyboard: !1
    }), this.destaqueMarker.addTo(e);
    const d = (m = (p = this.destaqueMarker).getElement) == null ? void 0 : m.call(p);
    d && (d.style.pointerEvents = "none"), t != null && t.duracaoMs && t.duracaoMs > 0 && (this.destaqueTimeoutId = window.setTimeout(() => {
      this.limparDestaque();
    }, t.duracaoMs));
  }
  /**
   * Remove o anel de destaque pulsante ativo e cancela temporizadores pendentes.
   */
  limparDestaque() {
    if (this.destaqueTimeoutId !== null && (window.clearTimeout(this.destaqueTimeoutId), this.destaqueTimeoutId = null), this.destaqueMarker) {
      const i = this.getMap();
      i && i.hasLayer(this.destaqueMarker) ? i.removeLayer(this.destaqueMarker) : typeof this.destaqueMarker.remove == "function" && this.destaqueMarker.remove(), this.destaqueMarker = null;
    }
  }
  destroy() {
    if (this.limparDestaque(), this.canvasInteracao.desativar(), this.layerManager.destroy(), this.core.destroy(), this.core.map)
      try {
        this.core.map.off(), this.core.map.remove();
      } catch {
      } finally {
        this.core.map = null;
      }
  }
  getMap() {
    return this.core.map;
  }
}
function yi(n, i, t, e) {
  if (!n) return;
  if (n.querySelectorAll(".layer-item").length === i.length) {
    i.forEach((a) => {
      var s, l;
      const r = n.querySelector(`.layer-item[data-layer-id="${a.id}"]`);
      if (r) {
        const h = r.querySelector(".layer-chk-visibility");
        h && h.checked !== a.visivel && (h.checked = a.visivel);
        const u = r.querySelector(".layer-opacity-slider"), d = r.querySelector(".opacity-percent-label"), p = Math.round(a.opacidade * 100);
        u && parseInt(u.value, 10) !== p && (u.value = String(p)), d && (d.textContent = `${p}%`);
        const m = r.querySelector(".btn-lock-layer");
        m && (m.classList.toggle("active", !!a.bloqueada), m.title = a.bloqueada ? "Desbloquear Camada" : "Bloquear Camada");
        const f = r.querySelector(".btn-toggle-scale-mode");
        f && ((s = a.estilo) != null && s.scaleMode) && (f.textContent = ((l = a.estilo) == null ? void 0 : l.scaleMode) === "world" ? "Métrico" : "Tela");
      }
    });
    return;
  }
  n.innerHTML = `
    ${i.map((a) => {
    var r, s;
    return `
      <div class="layer-item" data-layer-id="${a.id}">
        <div class="layer-item-row">
          <label class="layer-item-label">
            <input type="checkbox" class="layer-chk-visibility" data-layer-id="${a.id}" ${a.visivel ? "checked" : ""} />
            <span>${a.nome}</span>
          </label>
          <div class="layer-item-actions">
            <button class="btn-layer-action btn-lock-layer ${a.bloqueada ? "active" : ""}" data-layer-id="${a.id}" type="button" title="${a.bloqueada ? "Desbloquear Camada" : "Bloquear Camada"}">
              ${a.bloqueada ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'}
            </button>
            ${(r = a.estilo) != null && r.scaleMode ? `
              <span class="scale-mode-pill btn-toggle-scale-mode" data-layer-id="${a.id}" title="Alternar modo de escala">
                ${((s = a.estilo) == null ? void 0 : s.scaleMode) === "world" ? "Métrico" : "Tela"}
              </span>
            ` : ""}
          </div>
        </div>
        <div class="layer-controls-row">
          <span>Opacidade</span>
          <input type="range" min="0" max="100" value="${Math.round(a.opacidade * 100)}" class="layer-opacity-slider" data-layer-id="${a.id}" />
          <span class="opacity-percent-label" style="font-family:monospace; font-size:9px; width:28px; text-align:right;">${Math.round(a.opacidade * 100)}%</span>
        </div>
      </div>
    `;
  }).join("")}
  `, t.cleanup(), n.querySelectorAll(".layer-chk-visibility").forEach((a) => {
    t.add(a, "change", (r) => {
      const s = r.target.getAttribute("data-layer-id"), l = r.target.checked;
      s && e.setLayerVisibility(s, l);
    });
  }), n.querySelectorAll(".layer-opacity-slider").forEach((a) => {
    t.add(a, "input", (r) => {
      const s = r.target.getAttribute("data-layer-id"), l = parseInt(r.target.value, 10), h = l / 100, u = r.target.closest(".layer-item"), d = u == null ? void 0 : u.querySelector(".opacity-percent-label");
      d && (d.textContent = `${l}%`), s && e.setLayerOpacity(s, h);
    });
  }), n.querySelectorAll(".btn-lock-layer").forEach((a) => {
    t.add(a, "click", (r) => {
      const s = r.currentTarget.getAttribute("data-layer-id");
      if (s) {
        const l = i.find((h) => h.id === s);
        l && e.setLayerBlocked(s, !l.bloqueada);
      }
    });
  }), n.querySelectorAll(".btn-toggle-scale-mode").forEach((a) => {
    t.add(a, "click", (r) => {
      var l;
      const s = r.currentTarget.getAttribute("data-layer-id");
      if (s) {
        const h = i.find((u) => u.id === s);
        if (h) {
          const u = ((l = h.estilo) == null ? void 0 : l.scaleMode) === "world" ? "screen" : "world";
          e.setLayerScaleMode(s, u);
        }
      }
    });
  });
}
function _i(n, i, t, e) {
  var g, v, w, L, T, _;
  if (n.modoSequencial || n.controller.canvasInteracao.selectionHappened || n.controller.canvasInteracao.panHappened || n.mouseMovedSinceDown) return !1;
  const o = (i == null ? void 0 : i.originalEvent) || i, a = typeof (o == null ? void 0 : o.composedPath) == "function" ? o.composedPath() : [], r = a.length > 0 ? a[0] : (o == null ? void 0 : o.target) || (i == null ? void 0 : i.target);
  if (r) {
    const C = '.custom-leaflet-marker, .leaflet-marker-icon, .leaflet-interactive, .compact-popup, .leaflet-popup, .ui-popup-btn, .cad-btn-tool, .qgis-layer-panel, [class*="leaflet-marker"], [class*="leaflet-popup"]';
    if (((g = r.matches) == null ? void 0 : g.call(r, C)) || ((v = r.closest) == null ? void 0 : v.call(r, C))) return !1;
  }
  const s = n.controller.getMap();
  if (!s || !n.mapContainer) return !1;
  let l, h;
  if (e)
    l = Math.round(e.x), h = Math.round(e.y);
  else if (i != null && i.containerPoint || i != null && i.layerPoint)
    l = Math.round(((w = i.containerPoint) == null ? void 0 : w.x) ?? ((L = i.layerPoint) == null ? void 0 : L.x) ?? 0), h = Math.round(((T = i.containerPoint) == null ? void 0 : T.y) ?? ((_ = i.layerPoint) == null ? void 0 : _.y) ?? 0);
  else {
    const C = n.mapContainer.getBoundingClientRect(), x = (o == null ? void 0 : o.clientX) ?? 0, S = (o == null ? void 0 : o.clientY) ?? 0;
    l = Math.round(x - C.left), h = Math.round(S - C.top);
  }
  const u = { x: l, y: h };
  let d, p;
  const m = t || (i == null ? void 0 : i.latlng);
  if (m && typeof m.lat == "number")
    d = m.lat, p = m.lng ?? m.lon ?? 0;
  else {
    const C = s.containerPointToLatLng(y.point(u.x, u.y));
    d = C.lat, p = C.lng;
  }
  const f = n.controller.layerManager ? n.controller.layerManager.getLayers().filter((C) => C.visivel).map((C) => C.id) : [], b = o;
  return n.host.dispatchEvent(new CustomEvent("ui-canvas-clique", {
    detail: {
      coordenadas: {
        lat: d,
        lng: p
      },
      pontoPixel: u,
      eventoOriginal: b,
      lat: d,
      lon: p,
      lng: p,
      camadasAtivas: f
    },
    bubbles: !0,
    composed: !0
  })), !0;
}
function wi(n, i, t, e) {
  const o = e || n.obterElementoPorId(t);
  n.host.dispatchEvent(new CustomEvent("ui-acao-popup", {
    detail: {
      acaoId: i,
      elementoId: t,
      elemento: o ?? { id: t }
    },
    bubbles: !0,
    composed: !0
  })), n.fecharPopup();
}
function Ei(n, i) {
  let t = null, e = null, o = 0, a = 0;
  function r() {
    var u;
    try {
      if (!n.isConnected) return;
      const d = i.getMap();
      if (!d) return;
      const p = (u = d.getContainer) == null ? void 0 : u.call(d);
      if (!p || !p.parentNode) return;
      i.invalidateSize();
    } catch {
    }
  }
  function s(u = 25) {
    e !== null && (window.clearTimeout(e), e = null), e = window.setTimeout(() => {
      e = null, r();
    }, u);
  }
  function l() {
    h(), !(typeof ResizeObserver > "u") && (t = new ResizeObserver((u) => {
      for (const d of u) {
        let p = 0, m = 0;
        d.contentRect ? (p = d.contentRect.width, m = d.contentRect.height) : d.borderBoxSize && d.borderBoxSize.length > 0 ? (p = d.borderBoxSize[0].inlineSize, m = d.borderBoxSize[0].blockSize) : (p = n.clientWidth || n.offsetWidth, m = n.clientHeight || n.offsetHeight), p > 0 && m > 0 && (Math.abs(p - o) >= 0.5 || Math.abs(m - a) >= 0.5) && (o = p, a = m, s(25));
      }
    }), t.observe(n));
  }
  function h() {
    t && (t.disconnect(), t = null), e !== null && (window.clearTimeout(e), e = null);
  }
  return {
    observe: l,
    disconnect: h,
    invalidateSizeSafely: r
  };
}
class ki extends HTMLElement {
  constructor() {
    super();
    c(this, "shadow");
    c(this, "mapContainer", null);
    c(this, "layersPanel", null);
    c(this, "controller");
    c(this, "controladorTamanho");
    c(this, "isLayersPanelOpen", !1);
    c(this, "initTimeout");
    c(this, "uiListeners", new F());
    c(this, "layerItemListeners", new F());
    c(this, "customMarkerClickHandler");
    c(this, "lastPopupActionEmit");
    c(this, "lastCanvasClickTime", 0);
    c(this, "mouseMovedSinceDown", !1);
    c(this, "mouseDownPos", { x: 0, y: 0 });
    c(this, "_chaveGrupo");
    c(this, "_zonaProjecao", 22);
    c(this, "configBroadcastChannel", null);
    c(this, "_pontos", []);
    c(this, "_segmentos", []);
    c(this, "_bancoPontos", []);
    c(this, "_confrontantes", []);
    this.shadow = this.attachShadow({ mode: "open" }), this.controller = new xi(), this.controladorTamanho = Ei(this, this.controller), this.shadow.innerHTML = `
      <style>
        ${Pt}
        ${si}
      </style>
      <div class="cad-root" id="cad-root">
        <!-- Mapa Leaflet Canvas -->
        <div class="cad-map-container" id="cad-map-container"></div>

        <!-- Painel de Camadas -->
        <div class="qgis-layer-panel collapsed" id="qgis-layer-panel">
          <div class="layer-panel-header">
            <div class="layer-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              Camadas
            </div>
            <button class="layer-panel-close" id="btn-close-layers" type="button" title="Fechar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="layer-panel-body" id="layers-list-container">
            <!-- Camadas renderizadas dinamicamente -->
          </div>
        </div>

        <!-- Toolbar Rápida do Canvas -->
        <div class="cad-quick-toolbar">
          <button class="cad-btn-tool" id="btn-toggle-layers" type="button" title="Camadas">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </button>
          <button class="cad-btn-tool" id="btn-zoom-extents" type="button" title="Enquadrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
          </button>
          <button class="cad-btn-tool" id="btn-clear-selection" type="button" title="Limpar seleção">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
          </button>
        </div>
      </div>
    `, this.mapContainer = this.shadow.getElementById("cad-map-container"), this.layersPanel = this.shadow.getElementById("qgis-layer-panel");
  }
  static get observedAttributes() {
    return [
      "sat-opacity",
      "scale-mode",
      "crosshair",
      "modo-sequencial",
      "chave-grupo",
      "zona-projecao",
      "fuso",
      "canal-configuracao"
    ];
  }
  connectedCallback() {
    const t = this.getAttribute("zona-projecao") || this.getAttribute("fuso");
    if (t) {
      const e = parseInt(t, 10);
      !isNaN(e) && e > 0 && (this._zonaProjecao = e, this.controller.zonaProjecao = e, this.controller.context.zonaProjecao = e);
    }
    this.controladorTamanho.observe(), this.setupConfigBroadcastChannel(), this.initTimeout = window.setTimeout(() => {
      this.initCAD();
    }, 0);
  }
  destroy() {
    if (this.initTimeout && (window.clearTimeout(this.initTimeout), this.initTimeout = void 0), this.controladorTamanho.disconnect(), this.configBroadcastChannel) {
      try {
        this.configBroadcastChannel.close();
      } catch {
      }
      this.configBroadcastChannel = null;
    }
    if (this.limparDestaque(), this.uiListeners.cleanup(), this.layerItemListeners.cleanup(), this.controller.destroy(), this.mapContainer && this.mapContainer._leaflet_id)
      try {
        delete this.mapContainer._leaflet_id;
      } catch {
        this.mapContainer._leaflet_id = void 0;
      }
  }
  disconnectedCallback() {
    this.destroy();
  }
  /**
   * Conecta ao canal de BroadcastChannel especificado no atributo 'canal-configuracao'.
   * 100% configurável sem strings mágicas hardcoded.
   */
  setupConfigBroadcastChannel(t) {
    if (this.configBroadcastChannel) {
      try {
        this.configBroadcastChannel.close();
      } catch {
      }
      this.configBroadcastChannel = null;
    }
    const e = t !== void 0 ? t : this.getAttribute("canal-configuracao");
    if (!(!e || typeof BroadcastChannel > "u"))
      try {
        this.configBroadcastChannel = new BroadcastChannel(e), this.configBroadcastChannel.onmessage = (o) => {
          this.processarMensagemConfiguracao(o.data);
        };
      } catch (o) {
        console.warn(`[ui-canvas-cad] Erro ao conectar ao BroadcastChannel "${e}":`, o);
      }
  }
  /**
   * Processa mensagens recebidas pelo barramento global de configuração.
   * Atualiza cursor, opacidades de camadas e emite evento 'ui-config-aplicada'.
   */
  processarMensagemConfiguracao(t) {
    if (!t || typeof t != "object") return;
    const e = t.tipo || "ESTILOS_ALTERADOS", o = t.configuracoes || t;
    if (o.crosshair !== void 0) {
      const a = !!o.crosshair;
      this.mapContainer && (this.mapContainer.style.cursor = a ? "crosshair" : "");
      const r = this.controller.getMap();
      if (r) {
        const s = r.getContainer();
        s && (s.style.cursor = a ? "crosshair" : "");
      }
      this.controller.core.config.crosshair = a;
    }
    if (o.opacidadeBase !== void 0) {
      const a = parseFloat(o.opacidadeBase);
      isNaN(a) || this.setLayerOpacity("satelite", a);
    }
    if (o.satOpacity !== void 0) {
      const a = parseFloat(o.satOpacity);
      isNaN(a) || this.setLayerOpacity("satelite", a);
    }
    o.opacidades && typeof o.opacidades == "object" && Object.entries(o.opacidades).forEach(([a, r]) => {
      const s = parseFloat(r);
      isNaN(s) || this.setLayerOpacity(a, s);
    }), this.dispatchEvent(new CustomEvent("ui-config-aplicada", {
      detail: {
        tipo: e,
        configuracoes: o
      },
      bubbles: !0,
      composed: !0
    }));
  }
  /**
   * Executa a invalidação dimensional do mapa com salvaguardas de estabilidade
   * absorvendo tentativas de leitura com panes desanexados (undefined._leaflet_pos).
   */
  invalidateSizeSafely() {
    this.controladorTamanho.invalidateSizeSafely();
  }
  attributeChangedCallback(t, e, o) {
    if (e !== o) {
      if (t === "sat-opacity") {
        const a = parseFloat(o);
        isNaN(a) || this.setLayerOpacity("satelite", a);
      } else if (t === "scale-mode")
        (o === "world" || o === "screen") && (this.setLayerScaleMode("perimetro", o), this.setLayerScaleMode("vertices", o));
      else if (t === "modo-sequencial") {
        const a = o !== null && o !== "false";
        this.modoSequencial = a;
      } else if (t === "chave-grupo")
        this.chaveGrupo = o || void 0;
      else if (t === "zona-projecao" || t === "fuso") {
        const a = parseInt(o, 10);
        !isNaN(a) && a > 0 && (this._zonaProjecao = a, t === "fuso" && this.getAttribute("zona-projecao") !== o ? this.setAttribute("zona-projecao", o) : t === "zona-projecao" && this.hasAttribute("fuso") && this.getAttribute("fuso") !== o && this.setAttribute("fuso", o), this.controller.zonaProjecao = a, this.controller.context.zonaProjecao = a);
      } else if (t === "canal-configuracao")
        this.setupConfigBroadcastChannel(o);
      else if (t === "crosshair") {
        const a = o !== null && o !== "false";
        this.mapContainer && (this.mapContainer.style.cursor = a ? "crosshair" : "");
        const r = this.controller.getMap();
        if (r) {
          const s = r.getContainer();
          s && (s.style.cursor = a ? "crosshair" : "");
        }
        this.controller.core.config.crosshair = a;
      }
    }
  }
  initCAD() {
    if (!this.mapContainer) return;
    if (this.mapContainer._leaflet_id && !this.controller.getMap())
      try {
        delete this.mapContainer._leaflet_id;
      } catch {
        this.mapContainer._leaflet_id = void 0;
      }
    if (this.controller.init(this.mapContainer, this.shadow), this.setupUIEvents(), this.renderLayersUI(), this.hasAttribute("modo-sequencial") && (this.controller.modoCliqueSequencialAtivo = !0, this.controller.context.modoSequencial = !0), this.hasAttribute("chave-grupo")) {
      const o = this.getAttribute("chave-grupo");
      o && (this.chaveGrupo = o);
    }
    if (this.hasAttribute("zona-projecao") || this.hasAttribute("fuso")) {
      const o = this.zonaProjecao;
      this.controller.zonaProjecao = o, this.controller.context.zonaProjecao = o;
    }
    if (this.hasAttribute("crosshair")) {
      const o = this.getAttribute("crosshair") !== "false";
      this.mapContainer && (this.mapContainer.style.cursor = o ? "crosshair" : ""), this.controller.core.config.crosshair = o;
    }
    this._pontos.length > 0 && this.controller.setPontos(this._pontos), this._segmentos.length > 0 && this.controller.setSegmentos(this._segmentos), this._bancoPontos.length > 0 && this.controller.setBancoPontos(this._bancoPontos), this._confrontantes.length > 0 && this.controller.setConfrontantes(this._confrontantes), this.controller.layerManager.onChange((o) => {
      this.renderLayersUI(), this.dispatchEvent(new CustomEvent("ui-camadas-alteradas", {
        detail: { layers: o },
        bubbles: !0,
        composed: !0
      }));
    });
    const t = this.controller.context.onMarkerClick;
    this.controller.context.onMarkerClick = (o, a, r, s) => {
      var u;
      let l = r;
      l || (l = this._pontos.find((d) => String(d.id) === String(o)) || this._bancoPontos.find((d) => String(d.id) === String(o)) || this._confrontantes.find((d) => String(d.id) === String(o)));
      let h = s;
      if (!h && l) {
        const d = l.lat ?? l.latitude ?? 0, p = l.lon ?? l.lng ?? l.longitude ?? 0;
        h = { lat: Number(d), lon: Number(p) };
      }
      if (h || (h = { lat: 0, lon: 0 }), this.modoSequencial) {
        (u = this.controller.getMap()) == null || u.closePopup(), this.dispatchEvent(new CustomEvent("ui-clique-sequencial", {
          detail: {
            id: o,
            elemento: l ?? { id: o, lat: h.lat, lon: h.lon },
            coordenadas: h
          },
          bubbles: !0,
          composed: !0
        }));
        return;
      }
      if (this.customMarkerClickHandler)
        try {
          this.customMarkerClickHandler(Number(o), a);
        } catch (d) {
          console.error("Erro no callback de clique de marcador:", d);
        }
      if (t)
        try {
          t(o, a, l, h);
        } catch (d) {
          console.error("Erro no handler anterior de marker click:", d);
        }
      this.dispatchEvent(new CustomEvent("ui-ponto-selecionado", {
        detail: { selectedIds: [o], lastSelectedId: o, isVizinho: a },
        bubbles: !0,
        composed: !0
      })), this.dispatchEvent(new CustomEvent("ui-elemento-selecionado", {
        detail: { id: o, elemento: l, tipo: a ? "vizinho" : "vertice", coordenadas: h },
        bubbles: !0,
        composed: !0
      }));
    }, this.controller.context.onPopupAcao = (o, a, r) => {
      this.dispararAcaoPopup(o, a, r);
    };
    const e = this.controller.getMap();
    e && e.on("click", (o) => {
      this.mouseMovedSinceDown || this.tratarCliqueLivreCanvas(o, o.latlng, o.containerPoint);
    }), setTimeout(() => {
      this.invalidateSizeSafely();
    }, 150);
  }
  setupUIEvents() {
    this.uiListeners.cleanup();
    const t = this.shadow.getElementById("btn-toggle-layers"), e = this.shadow.getElementById("btn-close-layers"), o = this.shadow.getElementById("btn-zoom-extents"), a = this.shadow.getElementById("btn-clear-selection");
    this.uiListeners.add(t, "click", () => {
      this.toggleLayersPanel();
    }), this.uiListeners.add(e, "click", () => {
      this.closeLayersPanel();
    }), this.uiListeners.add(o, "click", () => {
      this.zoomExtents();
    }), this.uiListeners.add(a, "click", () => {
      this.limparSelecao();
    }), this.mapContainer && (this.uiListeners.add(this.mapContainer, "mousedown", (r) => {
      r.button === 0 && (this.mouseDownPos = { x: r.clientX, y: r.clientY }, this.mouseMovedSinceDown = !1);
    }), this.uiListeners.add(this.mapContainer, "mousemove", (r) => {
      Math.hypot(r.clientX - this.mouseDownPos.x, r.clientY - this.mouseDownPos.y) >= 4 && (this.mouseMovedSinceDown = !0);
    }), this.uiListeners.add(this.mapContainer, "click", (r) => {
      r.button === 0 && (this.mouseMovedSinceDown || this.tratarCliqueLivreCanvas(r));
    })), this.uiListeners.add(this.shadow, "click", (r) => {
      var h;
      const s = r.composedPath ? r.composedPath()[0] : r.target, l = (h = s == null ? void 0 : s.closest) == null ? void 0 : h.call(s, ".ui-popup-btn");
      if (l) {
        r.preventDefault(), r.stopPropagation();
        const u = l.getAttribute("data-acao-id"), d = l.getAttribute("data-elemento-id");
        u && d !== null && this.dispararAcaoPopup(u, d);
      }
    });
  }
  /**
   * Monitora e processa cliques em áreas livres do mapa para emissão do evento 'ui-canvas-clique'.
   * Assegura que o evento não dispare indevidamente durante operações de arraste ou janelas de seleção CAD.
   */
  tratarCliqueLivreCanvas(t, e, o) {
    const a = Date.now();
    a - this.lastCanvasClickTime < 50 || (this.lastCanvasClickTime = a, _i(
      {
        host: this,
        controller: this.controller,
        mapContainer: this.mapContainer,
        modoSequencial: this.modoSequencial,
        mouseMovedSinceDown: this.mouseMovedSinceDown
      },
      t,
      e,
      o
    ));
  }
  /**
   * Dispara o evento customizado 'ui-acao-popup' com as informações da ação acionada e fecha o popup.
   */
  dispararAcaoPopup(t, e, o) {
    const a = Date.now();
    this.lastPopupActionEmit && this.lastPopupActionEmit.acaoId === t && this.lastPopupActionEmit.elementoId === e && a - this.lastPopupActionEmit.time < 50 || (this.lastPopupActionEmit = { acaoId: t, elementoId: e, time: a }, wi(
      {
        host: this,
        controller: this.controller,
        mapContainer: this.mapContainer,
        modoSequencial: this.modoSequencial,
        mouseMovedSinceDown: this.mouseMovedSinceDown,
        obterElementoPorId: (r) => this.obterElementoPorId(r),
        fecharPopup: () => {
          var r;
          (r = this.controller.getMap()) == null || r.closePopup();
        }
      },
      t,
      e,
      o
    ));
  }
  obterElementoPorId(t) {
    return this._pontos.find((e) => String(e.id) === String(t)) || this._bancoPontos.find((e) => String(e.id) === String(t)) || this._confrontantes.find((e) => String(e.id) === String(t));
  }
  toggleLayersPanel() {
    this.isLayersPanelOpen = !this.isLayersPanelOpen, this.layersPanel && (this.isLayersPanelOpen ? this.layersPanel.classList.remove("collapsed") : this.layersPanel.classList.add("collapsed"));
    const t = this.shadow.getElementById("btn-toggle-layers");
    t == null || t.classList.toggle("active", this.isLayersPanelOpen);
  }
  closeLayersPanel() {
    var e;
    this.isLayersPanelOpen = !1, (e = this.layersPanel) == null || e.classList.add("collapsed");
    const t = this.shadow.getElementById("btn-toggle-layers");
    t == null || t.classList.remove("active");
  }
  renderLayersUI() {
    const t = this.shadow.getElementById("layers-list-container"), e = this.controller.layerManager.getLayers();
    yi(t, e, this.layerItemListeners, {
      setLayerVisibility: (o, a) => this.setLayerVisibility(o, a),
      setLayerOpacity: (o, a) => this.setLayerOpacity(o, a),
      setLayerBlocked: (o, a) => this.controller.layerManager.setLayerBlocked(o, a),
      setLayerScaleMode: (o, a) => this.setLayerScaleMode(o, a)
    });
  }
  // --- API de Propriedades Públicas ---
  get pontos() {
    return this._pontos;
  }
  set pontos(t) {
    this._pontos = t || [], this.controller.setPontos(this._pontos);
  }
  get segmentos() {
    return this._segmentos;
  }
  set segmentos(t) {
    this._segmentos = t || [], this.controller.setSegmentos(this._segmentos);
  }
  get bancoPontos() {
    return this._bancoPontos;
  }
  set bancoPontos(t) {
    this._bancoPontos = t || [], this.controller.setBancoPontos(this._bancoPontos);
  }
  get pontosHomologados() {
    return this.bancoPontos;
  }
  set pontosHomologados(t) {
    this.bancoPontos = t;
  }
  get confrontantes() {
    return this._confrontantes;
  }
  set confrontantes(t) {
    this._confrontantes = t || [], this.controller.setConfrontantes(this._confrontantes);
  }
  get vizinhos() {
    return this.confrontantes;
  }
  set vizinhos(t) {
    this.confrontantes = t;
  }
  /**
   * Alterna o modo de captura sequencial ponto a ponto (reflte atributo 'modo-sequencial').
   * Quando true, cliques em elementos geométricos suprimem popups e disparam 'ui-clique-sequencial'.
   * Não desseleciona elementos previamente ativos.
   */
  get modoSequencial() {
    return this.hasAttribute("modo-sequencial");
  }
  set modoSequencial(t) {
    var a;
    const e = !!t, o = this.hasAttribute("modo-sequencial");
    e ? o || this.setAttribute("modo-sequencial", "") : o && this.removeAttribute("modo-sequencial"), this.controller.modoCliqueSequencialAtivo = e, this.controller.context.modoSequencial = e, e && ((a = this.controller.getMap()) == null || a.closePopup());
  }
  /**
   * Propriedade de chave de agrupamento genérica para polilinhas e multi-geometrias.
   * Pontos de grupos distintos nunca compartilham uma aresta a menos que exista uma conexão explícita entre seus IDs.
   */
  get chaveGrupo() {
    return this.getAttribute("chave-grupo") || this._chaveGrupo;
  }
  set chaveGrupo(t) {
    this._chaveGrupo = t, t ? this.getAttribute("chave-grupo") !== t && this.setAttribute("chave-grupo", t) : this.hasAttribute("chave-grupo") && this.removeAttribute("chave-grupo"), this.controller.chaveGrupo = t, this.controller.context.chaveGrupo = t, this.controller.layerManager.updateContext({ chaveGrupo: t });
  }
  /**
   * Zona ou fuso de projeção cartográfica ativa (padrão: 22).
   * Validado estritamente para números inteiros positivos (> 0).
   * Sincronizado bidirecionalmente com os atributos 'zona-projecao' e 'fuso'.
   */
  get zonaProjecao() {
    return this._zonaProjecao ?? 22;
  }
  set zonaProjecao(t) {
    const e = typeof t == "number" ? Math.floor(t) : parseInt(String(t), 10);
    if (!isNaN(e) && e > 0) {
      this._zonaProjecao = e;
      const o = String(e);
      this.getAttribute("zona-projecao") !== o && this.setAttribute("zona-projecao", o), this.hasAttribute("fuso") && this.getAttribute("fuso") !== o && this.setAttribute("fuso", o), this.controller.zonaProjecao = e, this.controller.context.zonaProjecao = e;
    }
  }
  /**
   * Nome do canal de BroadcastChannel desacoplado para barramento global de configuração em tempo real.
   * 100% configurável via atributo 'canal-configuracao' sem strings mágicas hardcoded.
   */
  get canalConfiguracao() {
    return this.getAttribute("canal-configuracao");
  }
  set canalConfiguracao(t) {
    t ? this.setAttribute("canal-configuracao", t) : this.removeAttribute("canal-configuracao");
  }
  // --- Métodos Públicos ---
  fitBounds(t, e = [40, 40], o = !1) {
    this.controller.fitBounds(t, e, o);
  }
  zoomExtents() {
    this.controller.canvasInteracao.zoomExtents();
  }
  selectPonto(t, e) {
    this.controller.selectPonto(t, e);
  }
  limparSelecao() {
    this.controller.canvasInteracao.limparSelecao();
  }
  setLayerVisibility(t, e) {
    this.controller.layerManager.setLayerVisibility(t, e);
  }
  setLayerOpacity(t, e) {
    this.controller.layerManager.setLayerOpacity(t, e);
  }
  setLayerScaleMode(t, e) {
    this.controller.layerManager.setLayerScaleMode(t, e);
  }
  setGraphicScale(t) {
    this.controller.setGraphicScale(t);
  }
  exportState() {
    return this.controller.exportState();
  }
  importState(t) {
    this.controller.importState(t);
  }
  invalidateSize() {
    this.invalidateSizeSafely();
  }
  /**
   * Indica se há algum anel de destaque pulsante ativo no canvas.
   */
  get destaqueAtivo() {
    return this.controller.destaqueAtivo;
  }
  /**
   * Localiza, enquadra e pulsa visualmente qualquer elemento geométrico do canvas pelo identificador (ID).
   * Agnóstico a entidades pontuais, lineares e poligonais.
   * Não interfere no estado dos marcadores originais e limpa instâncias anteriores.
   *
   * @param id Identificador do elemento (número ou string)
   * @param opcoes Configurações opcionais de pan suave, nível de zoom, duracaoMs e cor do pulso
   */
  destacarElemento(t, e) {
    !this.controller.getMap() && this.mapContainer && this.initCAD(), this.controller.destacarElemento(t, e);
  }
  /**
   * Remove o anel de destaque pulsante ativo e limpa quaisquer temporizadores pendentes.
   */
  limparDestaque() {
    this.controller.limparDestaque();
  }
  // --- Fachada Agnóstica de Entidades Vetoriais e Camadas (API Pública) ---
  /**
   * Ingestão de nós pontuais na camada indicada (padrão: 'vertices').
   */
  plotarPontos(t, e = "vertices", o) {
    const a = t || [];
    e === "vertices" && (this._pontos = a), this.controller.plotarPontos(a, e, o);
  }
  /**
   * Plota linhas vinculando pares de IDs.
   */
  plotarConexoes(t, e = "linhas") {
    const o = t || [];
    this.controller.plotarConexoes(o, e);
  }
  plotarPolilinhaSequencial(t, e = !0, o = "polilinha", a) {
    const r = t || [];
    (o === "polilinha" || o === "perimetro") && (this._pontos = r, this._segmentos = []);
    const s = a ?? this.chaveGrupo;
    this.controller.plotarPolilinhaSequencial(r, e, o, s);
  }
  /**
   * Plota áreas a partir de anéis de coordenadas ou strings WKT.
   */
  plotarPoligonos(t, e = "poligonos") {
    const o = t || [];
    this.controller.plotarPoligonos(o, e);
  }
  /**
   * Remove entidades das camadas especificadas ou de todas as camadas vetoriais se omitido.
   */
  limparCamadas(t) {
    !t || t.length === 0 ? (this._pontos = [], this._segmentos = [], this._confrontantes = []) : (t.includes("vertices") && (this._pontos = []), (t.includes("linhas") || t.includes("perimetro") || t.includes("polilinha")) && (this._segmentos = []), (t.includes("poligonos") || t.includes("vizinhos")) && (this._confrontantes = [])), this.controller.limparCamadas(t);
  }
  /**
   * Retorna as instâncias gráficas ativas no canvas (de uma camada específica ou de todas).
   */
  obterMarcadores(t) {
    return this.controller.obterMarcadores(t);
  }
  // --- Fachada de Compatibilidade Legada ---
  /**
   * Recebe a lista de vértices e atualiza a camada de pontos do layerManager.
   * Se receber um callback de clique, associa-o ao evento interno.
   */
  plotPontos(t, e) {
    e && (this.customMarkerClickHandler = e);
    const o = t || [];
    this._pontos = o, this.controller.plotPontos(o, e);
  }
  /**
   * Recebe as divisas cadastradas e delega a renderização para a camada vetorial de linhas.
   */
  plotSegmentos(t, e) {
    const o = t || [];
    e != null && (this._pontos = e || []), this._segmentos = o, this.controller.plotSegmentos(o, e);
  }
  /**
   * Define os pontos e limpa os segmentos para forçar o fechamento automático da poligonal pelo caminhamento (Pn -> P1).
   */
  plotPolilinhaTemporaria(t) {
    const e = t || [];
    this._pontos = e, this._segmentos = [], this.controller.plotPolilinhaTemporaria(e);
  }
  /**
   * Alimenta a camada de vértices homologados do SIGEF.
   */
  plotPoligonalHomologada(t) {
    const e = t || [];
    this._bancoPontos = e, this.controller.plotPoligonalHomologada(e), this.setLayerVisibility("homologados", !0), this.setLayerVisibility("homologados-pontos", !0);
  }
  /**
   * Alimenta a camada de vértices confrontantes.
   */
  plotPontosVizinhos(t) {
    const e = t || [];
    this.controller.plotPontosVizinhos(e), this._confrontantes = this.controller.context.confrontantes || [];
  }
  /**
   * Alimenta a camada de limites em polígonos WKT.
   */
  plotPoligonosVizinhos(t) {
    const e = t || [];
    this.controller.plotPoligonosVizinhos(e), this._confrontantes = this.controller.context.confrontantes || [];
  }
  /**
   * Reseta as camadas vetoriais de trabalho, permitindo preservar opcionalmente o banco de pontos homologados.
   */
  clearOverlays(t = !1) {
    this._pontos = [], this._segmentos = [], this._confrontantes = [], t || (this._bancoPontos = []), this.controller.clearOverlays(t);
  }
  /**
   * Devolve o array de marcadores instanciados no Leaflet.
   */
  getMarkers() {
    return this.controller.getMarkers();
  }
  /**
   * Devolve o array de marcadores vizinhos/confrontantes instanciados no Leaflet.
   */
  getVizinhosMarkers() {
    return this.controller.getVizinhosMarkers();
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
customElements.get("ui-canvas-cad") || customElements.define("ui-canvas-cad", ki);
function Ci(n) {
  if (!n || typeof n != "string") return null;
  let i = n.trim();
  if (!i) return null;
  i = i.replace(/(\d),(\d)/g, "$1.$2").replace(/,/g, "."), i = i.replace(/\bpi\b/gi, String(Math.PI)), i = i.replace(/\be\b/gi, String(Math.E));
  let t = 0;
  function e() {
    return i[t] || "";
  }
  function o() {
    return i[t++] || "";
  }
  function a() {
    for (; t < i.length && /\s/.test(i[t]); )
      t++;
  }
  function r() {
    a();
    let u = s();
    for (a(); t < i.length; ) {
      const d = e();
      if (d === "+" || d === "-") {
        o(), a();
        const p = t, m = s();
        a(), i.slice(p, t).includes("%") ? u = d === "+" ? u + u * m : u - u * m : u = d === "+" ? u + m : u - m;
      } else
        break;
    }
    return u;
  }
  function s() {
    a();
    let u = l();
    for (a(); t < i.length; ) {
      const d = e();
      if (d === "*" || d === "/" || d === "x" || d === "X") {
        o(), a();
        const p = l();
        if (d === "/" && p === 0)
          throw new Error("Divisão por zero");
        u = d === "/" ? u / p : u * p, a();
      } else
        break;
    }
    return u;
  }
  function l() {
    a();
    let u = h();
    if (a(), e() === "^") {
      o();
      const d = l();
      u = Math.pow(u, d);
    } else if (i.slice(t, t + 2) === "**") {
      t += 2;
      const d = l();
      u = Math.pow(u, d);
    }
    return u;
  }
  function h() {
    a();
    const u = e();
    if (u === "+" || u === "-") {
      o();
      const m = h();
      return u === "-" ? -m : m;
    }
    if (u === "(") {
      o();
      const m = r();
      return a(), e() === ")" && o(), a(), e() === "%" ? (o(), m / 100) : m;
    }
    const d = i.slice(t).match(/^([a-zA-Z_]\w*)\s*\(/);
    if (d) {
      const m = d[1].toLowerCase();
      t += d[0].length;
      const f = r();
      a(), e() === ")" && o();
      let b = f;
      switch (m) {
        case "sqrt":
          b = Math.sqrt(f);
          break;
        case "abs":
          b = Math.abs(f);
          break;
        case "round":
          b = Math.round(f);
          break;
        case "floor":
          b = Math.floor(f);
          break;
        case "ceil":
          b = Math.ceil(f);
          break;
        case "sin":
          b = Math.sin(f);
          break;
        case "cos":
          b = Math.cos(f);
          break;
        case "tan":
          b = Math.tan(f);
          break;
      }
      return a(), e() === "%" ? (o(), b / 100) : b;
    }
    const p = i.slice(t).match(/^([0-9]+(?:\.[0-9]+)?|\.[0-9]+)/);
    if (p) {
      t += p[0].length;
      let m = parseFloat(p[0]);
      return a(), e() === "%" && (o(), m = m / 100), m;
    }
    throw new Error("Caractere inválido: " + u);
  }
  try {
    const u = r();
    return a(), t < i.length ? null : isFinite(u) ? u : null;
  } catch {
    return null;
  }
}
function Ai(n) {
  const i = document.createElement("span"), t = typeof n == "number" || typeof n == "string" && /^-?\d+(\.\d+)?$/.test(n.trim());
  return i.className = `ui-prop__valor-readonly ${t ? "ui-prop__valor-readonly--numero" : ""}`.trim(), i.textContent = n != null ? String(n) : "—", i;
}
function Si(n, i, t, e) {
  const o = document.createElement("label");
  o.className = "ui-prop__editor-booleano";
  const a = !!t, r = document.createElement("div");
  r.className = `ui-prop__checkbox-custom ${a ? "ui-prop__checkbox-custom--marcado" : ""}`, r.textContent = a ? "✓" : "";
  const s = document.createElement("span");
  return s.className = "ui-prop__booleano-rotulo", s.textContent = a ? "Sim" : "Não", o.appendChild(r), o.appendChild(s), o.addEventListener("click", (l) => {
    l.preventDefault();
    const h = !e.obterValorAtual(i.id);
    e.registrarAlteracao(n, i.id, h), r.classList.toggle("ui-prop__checkbox-custom--marcado", h), r.textContent = h ? "✓" : "", s.textContent = h ? "Sim" : "Não";
  }), o;
}
function zi(n, i, t, e) {
  const o = document.createElement("select");
  return o.className = "ui-prop__editor-select", (i.opcoes || []).forEach((a) => {
    const r = document.createElement("option");
    r.value = String(a.id), r.textContent = a.rotulo, String(a.id) === String(t) && (r.selected = !0), o.appendChild(r);
  }), o.addEventListener("change", () => {
    e.registrarAlteracao(n, i.id, o.value);
  }), o.addEventListener("keydown", (a) => {
    a.key === "Enter" && e.focarProximoEditor(o);
  }), o;
}
function Li(n, i, t) {
  const e = document.createElement("button");
  return e.type = "button", e.className = "ui-prop__btn-acao-inline", e.textContent = i.rotuloAcao || "Editar...", e.addEventListener("click", () => {
    typeof i.onClickAcao == "function" && i.onClickAcao(i), t.despacharEventoAcao(i, n);
  }), e.addEventListener("keydown", (o) => {
    o.key === "Enter" && e.click();
  }), e;
}
function Mi(n, i, t, e) {
  const o = document.createElement("input");
  o.type = "text", o.inputMode = "decimal", o.autocomplete = "off", o.spellcheck = !1, o.className = "ui-prop__editor-input ui-prop__editor-input--numero", i.placeholder && (o.placeholder = i.placeholder);
  const a = (s) => {
    if (s == null || s === "") return "";
    const l = Number(s);
    return isNaN(l) ? String(s) : i.casasDecimais !== void 0 ? l.toFixed(i.casasDecimais) : String(l);
  };
  o.value = a(t), o.addEventListener("focus", () => {
    o.select();
  }), o.addEventListener("input", () => {
    const s = o.value, l = /[\+\-\*\/\^\%\(\)]/.test(s) && !/^[+-]?[0-9]*\.?[0-9]*$/.test(s.trim());
    o.classList.toggle("ui-prop__editor-input--calculando", l);
  });
  const r = () => {
    o.classList.remove("ui-prop__editor-input--calculando");
    const s = o.value.trim();
    if (s === "") {
      e.registrarAlteracao(n, i.id, null);
      return;
    }
    const l = Ci(s);
    if (l !== null && !isNaN(l)) {
      let h = l;
      i.casasDecimais !== void 0 && (h = Number(l.toFixed(i.casasDecimais))), o.value = a(h), h !== e.obterValorAtual(i.id) && e.registrarAlteracao(n, i.id, h);
    } else
      o.value = a(e.obterValorAtual(i.id));
  };
  return o.addEventListener("change", r), o.addEventListener("blur", r), o.addEventListener("keydown", (s) => {
    if (s.key === "Enter")
      r(), e.focarProximoEditor(o);
    else if (s.key === "Escape")
      o.classList.remove("ui-prop__editor-input--calculando"), o.value = a(e.obterValorAtual(i.id)), o.blur();
    else if (s.key === "ArrowUp" || s.key === "ArrowDown") {
      s.preventDefault();
      const l = parseFloat(o.value) || 0;
      let h = i.casasDecimais !== void 0 ? Math.pow(10, -i.casasDecimais) : 1;
      s.shiftKey ? h *= 10 : s.altKey && (h *= 0.1);
      let u = s.key === "ArrowUp" ? l + h : l - h;
      i.casasDecimais !== void 0 ? u = Number(u.toFixed(i.casasDecimais)) : u = Math.round(u * 100) / 100, o.value = a(u), e.registrarAlteracao(n, i.id, u);
    }
  }), o;
}
function Pi(n, i, t, e) {
  const o = document.createElement("input");
  o.type = "text", o.className = "ui-prop__editor-input", i.placeholder && (o.placeholder = i.placeholder), o.value = t != null ? String(t) : "", o.addEventListener("focus", () => {
    o.select();
  });
  const a = () => {
    o.value !== e.obterValorAtual(i.id) && e.registrarAlteracao(n, i.id, o.value);
  };
  return o.addEventListener("change", a), o.addEventListener("keydown", (r) => {
    r.key === "Enter" ? (a(), e.focarProximoEditor(o)) : r.key === "Escape" && (o.value = String(e.obterValorAtual(i.id) ?? ""), o.blur());
  }), o;
}
function Ii(n, i, t, e) {
  const o = document.createElement("div");
  o.className = "ui-prop__editor-linha-container";
  const a = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  a.setAttribute("class", "ui-prop__linha-amostra-svg"), a.setAttribute("viewBox", "0 0 44 12");
  const r = document.createElementNS("http://www.w3.org/2000/svg", "line");
  r.setAttribute("x1", "0"), r.setAttribute("y1", "6"), r.setAttribute("x2", "44"), r.setAttribute("y2", "6");
  const s = (u) => {
    const d = String(u || "").toLowerCase();
    d.includes("dash") || d.includes("tracej") || d.includes("hidden") ? r.setAttribute("stroke-dasharray", "6,3") : d.includes("dot") || d.includes("ponto") || d.includes("pontilh") ? r.setAttribute("stroke-dasharray", "2,3") : d.includes("center") || d.includes("eixo") ? r.setAttribute("stroke-dasharray", "8,3,2,3") : r.setAttribute("stroke-dasharray", "none");
  };
  s(t), a.appendChild(r);
  const l = document.createElement("select");
  return l.className = "ui-prop__linha-select", (i.opcoes && i.opcoes.length > 0 ? i.opcoes : [
    { id: "ByLayer", rotulo: "ByLayer" },
    { id: "ByBlock", rotulo: "ByBlock" },
    { id: "Continuous", rotulo: "Continuous" },
    { id: "Dashed", rotulo: "Dashed" },
    { id: "Hidden", rotulo: "Hidden" },
    { id: "Center", rotulo: "Center" },
    { id: "Dotted", rotulo: "Dotted" }
  ]).forEach((u) => {
    const d = document.createElement("option");
    d.value = String(u.id), d.textContent = u.rotulo, String(u.id).toLowerCase() === String(t).toLowerCase() && (d.selected = !0), l.appendChild(d);
  }), l.addEventListener("change", () => {
    s(l.value), e.registrarAlteracao(n, i.id, l.value);
  }), l.addEventListener("keydown", (u) => {
    u.key === "Enter" && e.focarProximoEditor(l);
  }), o.appendChild(a), o.appendChild(l), o;
}
function Ti(n, i, t, e) {
  const o = document.createElement("div");
  o.className = "ui-prop__editor-espessura-container";
  const a = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  a.setAttribute("class", "ui-prop__espessura-amostra-svg"), a.setAttribute("viewBox", "0 0 38 12");
  const r = document.createElementNS("http://www.w3.org/2000/svg", "line");
  r.setAttribute("x1", "0"), r.setAttribute("y1", "6"), r.setAttribute("x2", "38"), r.setAttribute("y2", "6");
  const s = (u) => {
    const d = parseFloat(String(u).replace(/[^0-9.]/g, ""));
    return isNaN(d) || d <= 0 ? 1.5 : Math.min(8, Math.max(1, d * 8));
  };
  r.setAttribute("stroke-width", String(s(t))), a.appendChild(r);
  const l = document.createElement("select");
  return l.className = "ui-prop__espessura-select", (i.opcoes && i.opcoes.length > 0 ? i.opcoes : [
    { id: "ByLayer", rotulo: "ByLayer" },
    { id: "ByBlock", rotulo: "ByBlock" },
    { id: "0.00 mm", rotulo: "0.00 mm" },
    { id: "0.05 mm", rotulo: "0.05 mm" },
    { id: "0.09 mm", rotulo: "0.09 mm" },
    { id: "0.13 mm", rotulo: "0.13 mm" },
    { id: "0.15 mm", rotulo: "0.15 mm" },
    { id: "0.18 mm", rotulo: "0.18 mm" },
    { id: "0.20 mm", rotulo: "0.20 mm" },
    { id: "0.25 mm", rotulo: "0.25 mm" },
    { id: "0.30 mm", rotulo: "0.30 mm" },
    { id: "0.35 mm", rotulo: "0.35 mm" },
    { id: "0.40 mm", rotulo: "0.40 mm" },
    { id: "0.50 mm", rotulo: "0.50 mm" },
    { id: "0.60 mm", rotulo: "0.60 mm" },
    { id: "0.70 mm", rotulo: "0.70 mm" },
    { id: "1.00 mm", rotulo: "1.00 mm" },
    { id: "1.40 mm", rotulo: "1.40 mm" },
    { id: "2.00 mm", rotulo: "2.00 mm" }
  ]).forEach((u) => {
    const d = document.createElement("option");
    d.value = String(u.id), d.textContent = u.rotulo, String(u.id).toLowerCase() === String(t).toLowerCase() && (d.selected = !0), l.appendChild(d);
  }), l.addEventListener("change", () => {
    r.setAttribute("stroke-width", String(s(l.value))), e.registrarAlteracao(n, i.id, l.value);
  }), l.addEventListener("keydown", (u) => {
    u.key === "Enter" && e.focarProximoEditor(l);
  }), o.appendChild(a), o.appendChild(l), o;
}
function qi(n, i, t, e) {
  const o = document.createElement("div");
  o.className = "ui-prop__editor-cor-cad-container";
  const a = document.createElement("div");
  a.className = "ui-prop__cor-amostra";
  const r = (u) => {
    const d = String(u).toLowerCase();
    return d === "red" || d === "1" ? "#ff0000" : d === "yellow" || d === "2" ? "#ffff00" : d === "green" || d === "3" ? "#00ff00" : d === "cyan" || d === "4" ? "#00ffff" : d === "blue" || d === "5" ? "#0000ff" : d === "magenta" || d === "6" ? "#ff00ff" : d === "white" || d === "7" || d === "bylayer" || d === "byblock" ? "#ffffff" : d.startsWith("#") ? d : "#ffffff";
  };
  a.style.backgroundColor = r(t);
  const s = document.createElement("select");
  s.className = "ui-prop__cor-cad-select", [
    { id: "ByLayer", rotulo: "ByLayer" },
    { id: "ByBlock", rotulo: "ByBlock" },
    { id: "Red", rotulo: "Red (1)" },
    { id: "Yellow", rotulo: "Yellow (2)" },
    { id: "Green", rotulo: "Green (3)" },
    { id: "Cyan", rotulo: "Cyan (4)" },
    { id: "Blue", rotulo: "Blue (5)" },
    { id: "Magenta", rotulo: "Magenta (6)" },
    { id: "White", rotulo: "White (7)" },
    { id: "custom", rotulo: "Selecionar cor..." }
  ].forEach((u) => {
    const d = document.createElement("option");
    d.value = u.id, d.textContent = u.rotulo, String(u.id).toLowerCase() === String(t).toLowerCase() && (d.selected = !0), s.appendChild(d);
  });
  const h = document.createElement("input");
  return h.type = "color", h.className = "ui-prop__cor-picker-oculto", h.addEventListener("input", () => {
    const u = h.value;
    a.style.backgroundColor = u, e.registrarAlteracao(n, i.id, u);
  }), s.addEventListener("change", () => {
    s.value === "custom" ? h.click() : (a.style.backgroundColor = r(s.value), e.registrarAlteracao(n, i.id, s.value));
  }), s.addEventListener("keydown", (u) => {
    u.key === "Enter" && e.focarProximoEditor(s);
  }), o.appendChild(a), o.appendChild(s), o.appendChild(h), o;
}
function Ni(n, i, t, e) {
  const o = document.createElement("div");
  o.className = "ui-prop__editor-cor-container";
  const a = document.createElement("div");
  a.className = "ui-prop__cor-amostra", a.style.backgroundColor = t || "#ffffff";
  const r = document.createElement("span");
  r.className = "ui-prop__cor-texto", r.textContent = i.textoAmostra || String(t || "ByLayer");
  const s = document.createElement("input");
  return s.type = "color", s.className = "ui-prop__cor-picker-oculto", s.value = typeof t == "string" && t.startsWith("#") ? t : "#ffffff", s.addEventListener("input", () => {
    const l = s.value;
    a.style.backgroundColor = l, r.textContent = l, e.registrarAlteracao(n, i.id, l);
  }), o.addEventListener("click", () => {
    s.click();
  }), o.appendChild(a), o.appendChild(r), o.appendChild(s), o;
}
function Bi(n, i, t, e) {
  return i.somenteLeitura || i.tipo === "readonly" ? Ai(t) : i.tipo === "booleano" ? Si(n, i, t, e) : i.tipo === "linha" || i.tipo === "linetype" ? Ii(n, i, t, e) : i.tipo === "espessura" || i.tipo === "lineweight" ? Ti(n, i, t, e) : i.tipo === "cor-cad" ? qi(n, i, t, e) : i.tipo === "selecao" ? zi(n, i, t, e) : i.tipo === "cor" ? Ni(n, i, t, e) : i.tipo === "acao" ? Li(n, i, e) : i.tipo === "numero" ? Mi(n, i, t, e) : Pi(n, i, t, e);
}
function $i(n) {
  if (!n.tipoContainerElement) return;
  if (!n.tipos || n.tipos.length === 0) {
    n.tipoContainerElement.style.display = "none";
    return;
  }
  n.tipoContainerElement.style.display = "flex", n.tipoContainerElement.innerHTML = "";
  const i = n.tipos.find((t) => String(t.id) === String(n.tipoSelecionadoId)) || n.tipos[0];
  if (n.estiloVisual === "revit") {
    const t = document.createElement("div");
    t.className = "ui-prop__tipo-revit-card";
    const e = document.createElement("div");
    e.className = "ui-prop__tipo-miniatura", i.iconeSvg ? e.innerHTML = i.iconeSvg : e.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <path d="M3 9h18M9 21V9"></path>
        </svg>
      `;
    const o = document.createElement("div");
    o.className = "ui-prop__tipo-info";
    const a = document.createElement("div");
    a.className = "ui-prop__tipo-nome", a.textContent = i.rotulo;
    const r = document.createElement("div");
    r.className = "ui-prop__tipo-subtexto", r.textContent = i.subtipo || "Tipo de Família", o.appendChild(a), o.appendChild(r), t.appendChild(e), t.appendChild(o);
    const s = document.createElement("div");
    s.className = "ui-prop__tipo-revit-subbarra";
    const l = document.createElement("select");
    l.className = "ui-prop__tipo-select", n.tipos.forEach((u) => {
      const d = document.createElement("option");
      d.value = u.id, d.textContent = `${u.rotulo}${u.subtipo ? ` : ${u.subtipo}` : ""}`, String(u.id) === String(n.tipoSelecionadoId) && (d.selected = !0), l.appendChild(d);
    }), l.addEventListener("change", () => {
      n.onSelecionarTipo(l.value);
    });
    const h = document.createElement("button");
    h.type = "button", h.className = "ui-prop__btn-editar-tipo", h.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: -1px;">
        <rect x="3" y="3" width="12" height="12" rx="1"></rect>
        <rect x="9" y="9" width="12" height="12" rx="1"></rect>
      </svg>
      <span>Editar tipo</span>
    `, h.addEventListener("click", () => {
      n.onEditarTipo(i);
    }), s.appendChild(l), s.appendChild(h), n.tipoContainerElement.appendChild(t), n.tipoContainerElement.appendChild(s);
  } else {
    const t = document.createElement("div");
    t.className = "ui-prop__tipo-autocad-bar";
    const e = document.createElement("select");
    e.className = "ui-prop__tipo-select", n.tipos.forEach((l) => {
      const h = document.createElement("option");
      h.value = l.id, h.textContent = l.rotulo, String(l.id) === String(n.tipoSelecionadoId) && (h.selected = !0), e.appendChild(h);
    }), e.addEventListener("change", () => {
      n.onSelecionarTipo(e.value);
    });
    const o = document.createElement("div");
    o.className = "ui-prop__tipo-autocad-acoes";
    const a = document.createElement("button");
    a.type = "button", a.className = "ui-prop__btn-autocad", a.title = "Seleção rápida", a.setAttribute("aria-label", "Seleção rápida"), a.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    `, a.addEventListener("click", () => {
      n.onQuickSelect(i);
    });
    const r = document.createElement("button");
    r.type = "button", r.className = "ui-prop__btn-autocad", r.title = "Selecionar objetos", r.setAttribute("aria-label", "Selecionar objetos"), r.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="7"></circle>
        <line x1="12" y1="2" x2="12" y2="7"></line>
        <line x1="12" y1="17" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="7" y2="12"></line>
        <line x1="17" y1="12" x2="22" y2="12"></line>
        <line x1="12" y1="9" x2="12" y2="15" stroke-width="2.5"></line>
        <line x1="9" y1="12" x2="15" y2="12" stroke-width="2.5"></line>
      </svg>
    `, r.addEventListener("click", () => {
      n.onSelectObjects(i);
    });
    const s = document.createElement("button");
    s.type = "button", s.className = "ui-prop__btn-autocad", s.title = "Calculadora rápida", s.setAttribute("aria-label", "Calculadora rápida"), s.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="2" width="16" height="20" rx="2"></rect>
        <line x1="8" y1="6" x2="16" y2="6"></line>
        <circle cx="8" cy="11" r="1" fill="currentColor"></circle>
        <circle cx="12" cy="11" r="1" fill="currentColor"></circle>
        <circle cx="16" cy="11" r="1" fill="currentColor"></circle>
        <circle cx="8" cy="15" r="1" fill="currentColor"></circle>
        <circle cx="12" cy="15" r="1" fill="currentColor"></circle>
        <circle cx="16" cy="15" r="1" fill="currentColor"></circle>
      </svg>
    `, s.addEventListener("click", () => {
      n.onCalculadora(i);
    }), o.appendChild(a), o.appendChild(r), o.appendChild(s), t.appendChild(e), t.appendChild(o), n.tipoContainerElement.appendChild(t);
  }
}
function Ri(n) {
  let i = 45;
  function t(o) {
    const a = Math.max(20, Math.min(65, o));
    return i = a, n.hostElement.style.setProperty("--ui-prop-rotulo-largura", `${a}%`), n.splitterElement && (n.splitterElement.style.left = `calc(${a}% - 4px)`), a;
  }
  function e() {
    if (!n.splitterElement || !n.corpoElement) return;
    n.splitterListeners.cleanup();
    let o = !1;
    const a = (r) => {
      if (r.button !== 0) return;
      r.preventDefault(), r.stopPropagation(), o = !0, n.splitterElement.classList.add("ui-prop__splitter--ativo");
      try {
        n.splitterElement.setPointerCapture(r.pointerId);
      } catch {
      }
      const s = n.corpoElement.getBoundingClientRect(), l = (u) => {
        if (!o) return;
        const d = s.width;
        if (d <= 0) return;
        const p = u.clientX - s.left;
        let g = Math.max(80, Math.min(d - 130, p)) / d * 100;
        g = Math.max(20, Math.min(65, g)), t(g);
      }, h = (u) => {
        if (o) {
          o = !1, n.splitterElement.classList.remove("ui-prop__splitter--ativo");
          try {
            n.splitterElement.hasPointerCapture(u.pointerId) && n.splitterElement.releasePointerCapture(u.pointerId);
          } catch {
          }
          n.splitterElement.removeEventListener("pointermove", l), n.splitterElement.removeEventListener("pointerup", h), n.splitterElement.removeEventListener("pointercancel", h), n.onLarguraAlterada(i), n.hostElement.dispatchEvent(
            new CustomEvent("ui-splitter-resize", {
              bubbles: !0,
              composed: !0,
              detail: { larguraPorcentagem: i }
            })
          );
        }
      };
      n.splitterElement.addEventListener("pointermove", l), n.splitterElement.addEventListener("pointerup", h), n.splitterElement.addEventListener("pointercancel", h);
    };
    n.splitterListeners.add(n.splitterElement, "pointerdown", a), n.splitterListeners.add(n.splitterElement, "dblclick", () => {
      t(45), n.onLarguraAlterada(45), n.hostElement.dispatchEvent(
        new CustomEvent("ui-splitter-resize", {
          bubbles: !0,
          composed: !0,
          detail: { larguraPorcentagem: 45 }
        })
      );
    });
  }
  return {
    init: e,
    definirLarguraRotulo: t
  };
}
const Hi = `:host{display:flex;flex-direction:column;box-sizing:border-box;font-family:var(--ui-fonte-familia, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);font-size:var(--ui-tamanho-corpo-sm, 12px);color:var(--ui-cor-texto, #e1e1e6);background-color:var(--ui-cor-superficie, #141417);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:var(--ui-raio-borda, 4px);overflow:hidden;width:100%;max-width:100%;height:100%;min-height:250px;-webkit-user-select:none;user-select:none;--ui-prop-altura-linha: 24px;--ui-prop-rotulo-largura: 45%}:host([densidade="compacta"]){--ui-prop-altura-linha: 20px;font-size:11px}:host([densidade="relaxada"]){--ui-prop-altura-linha: 30px;font-size:13px}.ui-prop__header{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background-color:var(--ui-cor-fundo-elevado, #1a1a1e);border-bottom:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));flex-shrink:0}.ui-prop__header-titulo{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--ui-cor-texto, #ffffff);text-transform:uppercase;letter-spacing:.5px}.ui-prop__header-icone{display:flex;align-items:center;color:var(--ui-cor-destaque, #00E08A)}.ui-prop__header-acoes{display:flex;align-items:center;gap:4px}.ui-prop__btn-icone{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:transparent;border:none;border-radius:3px;color:var(--ui-cor-texto-secundario, #888899);cursor:pointer;transition:all .15s ease;padding:0}.ui-prop__btn-icone:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08));color:var(--ui-cor-texto, #ffffff)}.ui-prop__tipo-seletor-container{padding:8px 10px;background-color:var(--ui-cor-superficie, #141417);border-bottom:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .08));display:flex;flex-direction:column;gap:6px;flex-shrink:0}.ui-prop__tipo-revit-card{display:flex;align-items:center;gap:10px;background-color:var(--ui-cor-fundo-card, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:4px;padding:6px 8px;cursor:pointer;transition:border-color .15s ease}.ui-prop__tipo-revit-card:hover{border-color:var(--ui-cor-destaque, #00E08A)}.ui-prop__tipo-miniatura{width:32px;height:32px;border-radius:3px;background-color:var(--ui-cor-fundo-elevado, #24242a);display:flex;align-items:center;justify-content:center;color:var(--ui-cor-destaque, #00E08A);flex-shrink:0}.ui-prop__tipo-info{display:flex;flex-direction:column;flex:1;min-width:0}.ui-prop__tipo-nome{font-weight:600;font-size:12px;color:var(--ui-cor-texto, #ffffff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ui-prop__tipo-subtexto{font-size:11px;color:var(--ui-cor-texto-secundario, #888899);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ui-prop__tipo-revit-subbarra{display:flex;align-items:center;gap:6px}.ui-prop__tipo-select{flex:1;min-width:0;width:0;height:24px;background-color:var(--ui-cor-fundo-card, #18181c);color:var(--ui-cor-texto, #e1e1e6);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .15));border-radius:3px;padding:0 22px 0 6px;font-size:11px;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23888899' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;background-size:10px 6px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;box-sizing:border-box}.ui-prop__tipo-select:focus{border-color:var(--ui-cor-destaque, #00E08A)}.ui-prop__btn-editar-tipo{height:24px;padding:0 8px;background-color:var(--ui-cor-botao-secundario-fundo, #1e1e24);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .15));border-radius:3px;color:var(--ui-cor-texto, #ffffff);font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s ease}.ui-prop__btn-editar-tipo:hover{background-color:var(--ui-cor-botao-secundario-hover, #2a2a34);border-color:var(--ui-cor-destaque, #00E08A)}.ui-prop__tipo-autocad-bar{display:flex;align-items:center;gap:4px;width:100%;min-width:0;box-sizing:border-box}.ui-prop__tipo-autocad-acoes{display:flex;align-items:center;gap:3px;flex-shrink:0}.ui-prop__btn-autocad{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:var(--ui-cor-fundo-card, #18181c);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .15));border-radius:3px;color:var(--ui-cor-texto, #e1e1e6);cursor:pointer;padding:0;transition:all .15s ease}.ui-prop__btn-autocad:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .1));border-color:var(--ui-cor-destaque, #00E08A);color:var(--ui-cor-destaque, #00E08A)}.ui-prop__btn-autocad:active{transform:scale(.95)}.ui-prop__filtro-container{display:flex;align-items:center;padding:4px 8px;background-color:var(--ui-cor-fundo, #0b0b0d);border-bottom:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .08));gap:6px;flex-shrink:0}.ui-prop__filtro-icone{color:var(--ui-cor-texto-secundario, #888899);flex-shrink:0}.ui-prop__filtro-input{flex:1;background:transparent;border:none;outline:none;font-size:11px;color:var(--ui-cor-texto, #e1e1e6);padding:3px 0}.ui-prop__filtro-input::placeholder{color:var(--ui-cor-texto-secundario, #666677)}.ui-prop__corpo{flex:1;overflow-y:auto;overflow-x:hidden;background-color:var(--ui-cor-superficie, #141417);position:relative}.ui-prop__corpo::-webkit-scrollbar{width:8px}.ui-prop__corpo::-webkit-scrollbar-track{background:var(--ui-cor-fundo, #0b0b0d)}.ui-prop__corpo::-webkit-scrollbar-thumb{background:#ffffff2e;border-radius:4px}.ui-prop__corpo::-webkit-scrollbar-thumb:hover{background:#ffffff4d}.ui-prop__categoria{border-bottom:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .1))}.ui-prop__categoria-header{position:relative;z-index:25;display:flex;align-items:center;justify-content:space-between;height:24px;padding:0 8px;background-color:var(--ui-cor-fundo-elevado, #18181d);cursor:pointer;-webkit-user-select:none;user-select:none;font-weight:600;font-size:11px;color:var(--ui-cor-texto, #ffffff);border-top:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .05));transition:background-color .15s ease}.ui-prop__categoria-header:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .06))}.ui-prop__categoria-titulo-bloco{display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ui-prop__categoria-seta{display:inline-flex;align-items:center;justify-content:center;font-size:9px;width:12px;height:12px;color:var(--ui-cor-texto-secundario, #888899);transition:transform .15s ease}.ui-prop__categoria--aberta .ui-prop__categoria-seta{transform:rotate(90deg)}.ui-prop__categoria-contador{font-size:10px;font-weight:400;color:var(--ui-cor-texto-secundario, #888899)}.ui-prop__categoria-conteudo{display:none}.ui-prop__categoria--aberta .ui-prop__categoria-conteudo{display:block}.ui-prop__linha{display:flex;align-items:stretch;min-height:var(--ui-prop-altura-linha, 24px);border-bottom:1px dotted var(--ui-cor-borda, rgba(255, 255, 255, .08));box-sizing:border-box;position:relative;z-index:1;transition:background-color .1s ease}.ui-prop__linha:hover{background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .04))}.ui-prop__linha:focus-within{background-color:#00e08a14}.ui-prop__linha:focus-within .ui-prop__col-rotulo{color:var(--ui-cor-texto, #ffffff);font-weight:500}.ui-prop__linha--modificada{background-color:#00e08a0d}.ui-prop__col-rotulo{width:var(--ui-prop-rotulo-largura, 45%);padding:2px 6px 2px 14px;display:flex;align-items:center;color:var(--ui-cor-texto-secundario, #9999aa);border-right:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .08));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;position:relative;flex-shrink:0;box-sizing:border-box}.ui-prop__col-rotulo span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ui-prop__col-rotulo--scrub{cursor:ew-resize;-webkit-user-select:none;user-select:none;transition:color .15s ease,background-color .15s ease}.ui-prop__col-rotulo--scrub:hover{color:var(--ui-cor-destaque, #00E08A);background-color:#00e08a0d}.ui-prop__col-rotulo--arrastando{color:#000!important;background-color:var(--ui-cor-destaque, #00E08A)!important;font-weight:600;cursor:ew-resize!important}.ui-prop__col-rotulo--arrastando span{color:#000!important}.ui-prop__splitter{position:absolute;top:0;bottom:0;min-height:100%;left:calc(var(--ui-prop-rotulo-largura, 45%) - 4px);width:8px;cursor:col-resize;z-index:10;touch-action:none;-webkit-user-select:none;user-select:none;display:flex;align-items:center;justify-content:center}.ui-prop__splitter:after{content:"";position:absolute;top:0;bottom:0;left:3px;width:2px;background-color:transparent;pointer-events:none;transition:background-color .15s ease,box-shadow .15s ease}.ui-prop__splitter:hover:after,.ui-prop__splitter--ativo:after{background-color:var(--ui-cor-destaque, #00E08A);box-shadow:0 0 6px #00e08a80}.ui-prop__splitter--ativo{background-color:#00e08a14}.ui-prop__col-valor{width:calc(100% - var(--ui-prop-rotulo-largura, 45%));flex:1 1 0px;min-width:0!important;display:flex;align-items:stretch;padding:0;overflow:hidden;box-sizing:border-box;position:relative;transition:background-color .1s ease,box-shadow .1s ease}.ui-prop__col-valor:focus-within{background-color:var(--ui-cor-fundo, #0b0b0d);box-shadow:inset 0 0 0 1px var(--ui-cor-destaque, #00E08A)}.ui-prop__editor-input{width:100%;min-width:0;height:100%;min-height:var(--ui-prop-altura-linha, 24px);background:transparent;border:none;border-radius:0;color:var(--ui-cor-texto, #ffffff);font-family:inherit;font-size:11px;padding:0 8px;outline:none;box-sizing:border-box;transition:background-color .1s ease}.ui-prop__editor-input:hover{background-color:#ffffff08}.ui-prop__editor-input--numero{text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-variant-numeric:tabular-nums}.ui-prop__editor-input--calculando{color:var(--ui-cor-destaque, #00E08A)!important;font-weight:500}.ui-prop__col-valor:has(.ui-prop__editor-input--calculando){background-color:#00e08a14!important;box-shadow:inset 0 0 0 1.5px var(--ui-cor-destaque, #00E08A)!important}.ui-prop__editor-select{flex:1 1 0px;min-width:0!important;width:0!important;max-width:100%;height:100%;min-height:var(--ui-prop-altura-linha, 24px);background-color:transparent;color:var(--ui-cor-texto, #ffffff);border:none;border-radius:0;font-size:11px;padding:0 20px 0 8px;outline:none;cursor:pointer;box-sizing:border-box;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23888899' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;background-size:8px 5px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;transition:background-color .1s ease}.ui-prop__editor-select:hover{background-color:#ffffff08}.ui-prop__editor-select option{background-color:var(--ui-cor-fundo-elevado, #18181c);color:var(--ui-cor-texto, #ffffff)}.ui-prop__editor-cor-container{display:flex;align-items:center;gap:6px;width:100%;max-width:100%;min-width:0!important;height:100%;min-height:var(--ui-prop-altura-linha, 24px);cursor:pointer;padding:0 20px 0 8px;box-sizing:border-box;position:relative;border:none;border-radius:0;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23888899' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;background-size:8px 5px;transition:background-color .1s ease}.ui-prop__editor-cor-container:hover{background-color:#ffffff0a}.ui-prop__cor-amostra{width:13px;height:13px;border-radius:2px;border:1px solid rgba(255,255,255,.3);flex-shrink:0;box-sizing:border-box}.ui-prop__cor-texto{flex:1 1 0px;min-width:0!important;width:0!important;font-size:11px;color:var(--ui-cor-texto, #ffffff);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ui-prop__cor-picker-oculto{position:absolute;opacity:0;pointer-events:none;width:0;height:0}.ui-prop__editor-linha-container{display:flex;align-items:center;gap:6px;width:100%;max-width:100%;min-width:0!important;height:100%;min-height:var(--ui-prop-altura-linha, 24px);padding:0 0 0 8px;box-sizing:border-box;overflow:hidden;border:none;border-radius:0}.ui-prop__linha-amostra-svg{width:24px;height:10px;flex-shrink:0}.ui-prop__linha-amostra-svg line{stroke:var(--ui-cor-texto, #e1e1e6);stroke-width:1.5}.ui-prop__linha-select{flex:1 1 0px;min-width:0!important;width:0!important;max-width:100%;height:100%;background:transparent;color:var(--ui-cor-texto, #ffffff);border:none;border-radius:0;font-size:11px;padding:0 20px 0 4px;outline:none;cursor:pointer;box-sizing:border-box;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23888899' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;background-size:8px 5px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.ui-prop__linha-select:hover{background-color:#ffffff08}.ui-prop__linha-select option{background-color:var(--ui-cor-fundo-elevado, #18181c);color:var(--ui-cor-texto, #ffffff)}.ui-prop__editor-espessura-container{display:flex;align-items:center;gap:6px;width:100%;max-width:100%;min-width:0!important;height:100%;min-height:var(--ui-prop-altura-linha, 24px);padding:0 0 0 8px;box-sizing:border-box;overflow:hidden;border:none;border-radius:0}.ui-prop__espessura-amostra-svg{width:20px;height:10px;flex-shrink:0}.ui-prop__espessura-amostra-svg line{stroke:var(--ui-cor-texto, #e1e1e6)}.ui-prop__espessura-select{flex:1 1 0px;min-width:0!important;width:0!important;max-width:100%;height:100%;background:transparent;color:var(--ui-cor-texto, #ffffff);border:none;border-radius:0;font-size:11px;padding:0 20px 0 4px;outline:none;cursor:pointer;box-sizing:border-box;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23888899' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;background-size:8px 5px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.ui-prop__espessura-select:hover{background-color:#ffffff08}.ui-prop__espessura-select option{background-color:var(--ui-cor-fundo-elevado, #18181c);color:var(--ui-cor-texto, #ffffff)}.ui-prop__editor-cor-cad-container{display:flex;align-items:center;gap:6px;width:100%;max-width:100%;min-width:0!important;height:100%;min-height:var(--ui-prop-altura-linha, 24px);padding:0 0 0 8px;box-sizing:border-box;overflow:hidden;border:none;border-radius:0}.ui-prop__cor-cad-select{flex:1 1 0px;min-width:0!important;width:0!important;max-width:100%;height:100%;background:transparent;color:var(--ui-cor-texto, #ffffff);border:none;border-radius:0;font-size:11px;padding:0 20px 0 4px;outline:none;cursor:pointer;box-sizing:border-box;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23888899' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;background-size:8px 5px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.ui-prop__cor-cad-select:hover{background-color:#ffffff08}.ui-prop__cor-cad-select option{background-color:var(--ui-cor-fundo-elevado, #18181c);color:var(--ui-cor-texto, #ffffff)}.ui-prop__editor-booleano{display:flex;align-items:center;gap:6px;width:100%;height:100%;min-height:var(--ui-prop-altura-linha, 24px);cursor:pointer;padding:0 8px;box-sizing:border-box;-webkit-user-select:none;user-select:none}.ui-prop__editor-booleano:hover{background-color:#ffffff08}.ui-prop__checkbox-custom{width:13px;height:13px;border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .25));border-radius:2px;background-color:var(--ui-cor-fundo, #0b0b0d);display:flex;align-items:center;justify-content:center;transition:all .15s ease}.ui-prop__checkbox-custom--marcado{background-color:var(--ui-cor-destaque, #00E08A);border-color:var(--ui-cor-destaque, #00E08A);color:#000}.ui-prop__booleano-rotulo{font-size:11px;color:var(--ui-cor-texto, #ffffff)}.ui-prop__btn-acao-inline{width:100%;height:100%;min-height:var(--ui-prop-altura-linha, 24px);padding:0 8px;background-color:transparent;border:none;border-radius:0;color:var(--ui-cor-texto, #ffffff);font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;text-align:left;transition:all .15s ease;box-sizing:border-box}.ui-prop__btn-acao-inline:hover{background-color:#ffffff0a;color:var(--ui-cor-destaque, #00E08A)}.ui-prop__valor-readonly{display:flex;align-items:center;width:100%;height:100%;min-height:var(--ui-prop-altura-linha, 24px);font-size:11px;color:var(--ui-cor-texto-secundario, #777788);padding:0 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;-webkit-user-select:text;user-select:text}.ui-prop__valor-readonly--numero{justify-content:flex-end;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-variant-numeric:tabular-nums}.ui-prop__unidade-sufixo{display:flex;align-items:center;font-size:10px;color:var(--ui-cor-texto-secundario, #777788);padding-right:8px;flex-shrink:0;-webkit-user-select:none;user-select:none}.ui-prop__vazio{padding:24px 16px;text-align:center;color:var(--ui-cor-texto-secundario, #888899);font-size:12px}.ui-prop__footer{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background-color:var(--ui-cor-fundo-elevado, #18181c);border-top:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .1));flex-shrink:0}.ui-prop__link-ajuda{font-size:11px;color:var(--ui-cor-destaque, #00E08A);text-decoration:none;cursor:pointer}.ui-prop__link-ajuda:hover{text-decoration:underline}.ui-prop__footer-botoes{display:flex;gap:6px}.ui-prop__btn-aplicar{height:24px;padding:0 12px;background-color:var(--ui-cor-destaque, #00E08A);color:#000;border:none;border-radius:3px;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s ease}.ui-prop__btn-aplicar:disabled{background-color:#ffffff1a;color:#ffffff4d;cursor:not-allowed}.ui-prop__btn-desfazer{height:24px;padding:0 8px;background:transparent;color:var(--ui-cor-texto-secundario, #888899);border:1px solid var(--ui-cor-borda, rgba(255, 255, 255, .12));border-radius:3px;font-size:11px;cursor:pointer;transition:all .15s ease}.ui-prop__btn-desfazer:hover:not(:disabled){background-color:var(--ui-cor-hover-menu, rgba(255, 255, 255, .08));color:var(--ui-cor-texto, #ffffff)}.ui-prop__btn-desfazer:disabled{opacity:.4;cursor:not-allowed}@media (max-width: 640px){:host{--ui-prop-altura-linha: 28px;font-size:13px}.ui-prop__btn-icone{min-width:28px;min-height:28px}.ui-prop__footer-botoes{gap:8px}.ui-prop__btn-aplicar,.ui-prop__btn-desfazer{height:30px;font-size:12px;padding:0 12px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}.ui-prop__editor-input,.ui-prop__editor-select{touch-action:manipulation;font-size:14px}}`;
function Oi() {
  return `
    <style>${Hi}</style>
    <div class="ui-prop__container" id="container">
      <!-- 1. Header Superior -->
      <header class="ui-prop__header" id="header">
        <div class="ui-prop__header-titulo">
          <span class="ui-prop__header-icone">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </span>
          <span id="header-titulo-texto">Propriedades</span>
        </div>
        <div class="ui-prop__header-acoes">
          <button type="button" class="ui-prop__btn-icone" id="btn-expandir-tudo" title="Expandir/Recolher Tudo" aria-label="Expandir ou recolher tudo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="7 13 12 18 17 13"></polyline>
              <polyline points="7 6 12 11 17 6"></polyline>
            </svg>
          </button>
          <button type="button" class="ui-prop__btn-icone" id="btn-fechar" title="Fechar" aria-label="Fechar" style="display: none;">
            ✕
          </button>
        </div>
      </header>

      <!-- 2. Seletor de Tipo (AutoCAD / Revit) -->
      <div class="ui-prop__tipo-seletor-container" id="tipo-container" style="display: none;"></div>

      <!-- 3. Busca Rápida de Propriedades -->
      <div class="ui-prop__filtro-container" id="filtro-container" style="display: none;">
        <svg class="ui-prop__filtro-icone" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="ui-prop__filtro-input" id="filtro-input" placeholder="Filtrar propriedades..." />
      </div>

      <!-- 4. Corpo Rolável com Grade de Categorias -->
      <div class="ui-prop__corpo" id="corpo">
        <div class="ui-prop__splitter" id="splitter"></div>
        <div class="ui-prop__lista-categorias" id="lista-categorias"></div>
      </div>

      <!-- 5. Rodapé com Ações (Aplicar / Desfazer) -->
      <footer class="ui-prop__footer" id="footer" style="display: none;">
        <a class="ui-prop__link-ajuda" id="link-ajuda">Ajuda de propriedades</a>
        <div class="ui-prop__footer-botoes">
          <button type="button" class="ui-prop__btn-desfazer" id="btn-desfazer" disabled>Desfazer</button>
          <button type="button" class="ui-prop__btn-aplicar" id="btn-aplicar" disabled>Aplicar</button>
        </div>
      </footer>
    </div>
  `;
}
function Di(n) {
  const { listaContainer: i, categorias: t, termoBusca: e, onToggleCategoria: o, linhaCtx: a } = n;
  if (i.innerHTML = "", !t || t.length === 0) {
    const s = document.createElement("div");
    s.className = "ui-prop__vazio", s.textContent = "Nenhuma propriedade disponível.", i.appendChild(s);
    return;
  }
  const r = document.createDocumentFragment();
  t.forEach((s) => {
    const l = (s.propriedades || []).filter((v) => e ? v.rotulo.toLowerCase().includes(e) || String(v.id).toLowerCase().includes(e) : !0);
    if (e && l.length === 0)
      return;
    const h = s.aberto !== !1, u = document.createElement("div");
    u.className = `ui-prop__categoria ${h ? "ui-prop__categoria--aberta" : ""}`, u.setAttribute("data-cat-id", s.id);
    const d = document.createElement("div");
    d.className = "ui-prop__categoria-header";
    const p = document.createElement("div");
    p.className = "ui-prop__categoria-titulo-bloco";
    const m = document.createElement("span");
    m.className = "ui-prop__categoria-seta", m.textContent = "▶";
    const f = document.createElement("span");
    f.textContent = s.titulo, p.appendChild(m), p.appendChild(f);
    const b = document.createElement("span");
    b.className = "ui-prop__categoria-contador", b.textContent = String(l.length), d.appendChild(p), d.appendChild(b), d.addEventListener("click", () => o(s.id)), d.addEventListener("dblclick", () => o(s.id));
    const g = document.createElement("div");
    g.className = "ui-prop__categoria-conteudo", l.forEach((v) => {
      const w = Fi(s.id, v, a);
      g.appendChild(w);
    }), u.appendChild(d), u.appendChild(g), r.appendChild(u);
  }), i.appendChild(r);
}
function Fi(n, i, t) {
  const e = document.createElement("div");
  e.className = "ui-prop__linha", e.setAttribute("data-prop-id", i.id);
  const o = t.valoresAtuais[i.id] !== void 0 ? t.valoresAtuais[i.id] : i.valor, a = t.valoresOriginais[i.id];
  t.isDirty && o !== a && e.classList.add("ui-prop__linha--modificada"), e.addEventListener("dblclick", () => {
    const u = e.querySelector(
      'input:not([type="color"]):not(.ui-prop__cor-picker-oculto), select, .ui-prop__btn-acao-inline'
    );
    u && (u.focus(), u instanceof HTMLInputElement && u.select());
  });
  const r = document.createElement("div");
  r.className = "ui-prop__col-rotulo", r.title = i.rotulo;
  const s = document.createElement("span");
  s.textContent = i.rotulo, r.appendChild(s), i.tipo === "numero" && !i.somenteLeitura && Vi(r, n, i, t);
  const l = document.createElement("div");
  l.className = "ui-prop__col-valor";
  const h = Bi(n, i, o, t.editorCtx);
  if (l.appendChild(h), i.unidade) {
    const u = document.createElement("span");
    u.className = "ui-prop__unidade-sufixo", u.textContent = i.unidade, l.appendChild(u);
  }
  return e.appendChild(r), e.appendChild(l), e;
}
function Vi(n, i, t, e) {
  n.classList.add("ui-prop__col-rotulo--scrub"), n.title = `${t.rotulo} (Arraste para ajustar, duplo-clique para editar)`;
  let o = 0, a = 0, r = !1;
  n.addEventListener("pointerdown", (s) => {
    if (s.button !== 0) return;
    o = s.clientX;
    const l = e.valoresAtuais[t.id];
    a = typeof l == "number" ? l : parseFloat(String(l || 0)) || 0, r = !1;
    try {
      n.setPointerCapture(s.pointerId);
    } catch {
    }
    n.classList.add("ui-prop__col-rotulo--arrastando");
    const h = (d) => {
      const p = d.clientX - o;
      if (Math.abs(p) > 2 && (r = !0), r) {
        let m = 1;
        d.shiftKey ? m = 0.1 : (d.ctrlKey || d.metaKey) && (m = 10);
        const f = t.casasDecimais !== void 0 ? t.casasDecimais : 2, b = Math.pow(10, -Math.min(f, 2));
        let g = a + p * b * m;
        t.casasDecimais !== void 0 ? g = Number(g.toFixed(t.casasDecimais)) : g = Math.round(g * 100) / 100, e.editorCtx.registrarAlteracao(i, t.id, g), e.onAtualizarCampoVisual(t.id, g);
      }
    }, u = (d) => {
      n.classList.remove("ui-prop__col-rotulo--arrastando");
      try {
        n.hasPointerCapture(d.pointerId) && n.releasePointerCapture(d.pointerId);
      } catch {
      }
      n.removeEventListener("pointermove", h), n.removeEventListener("pointerup", u), n.removeEventListener("pointercancel", u);
    };
    n.addEventListener("pointermove", h), n.addEventListener("pointerup", u), n.addEventListener("pointercancel", u);
  });
}
class ji {
  constructor(i) {
    c(this, "valoresOriginais", {});
    c(this, "valoresAtuais", {});
    c(this, "dirty", !1);
    this.ctx = i;
  }
  inicializarCategorias(i) {
    this.valoresOriginais = {}, this.valoresAtuais = {}, this.dirty = !1, i.forEach((t) => {
      (t.propriedades || []).forEach((e) => {
        this.valoresOriginais[e.id] = e.valor, this.valoresAtuais[e.id] = e.valor;
      });
    }), this.ctx.onAtualizarBotoesFooter(this.dirty);
  }
  get isDirty() {
    return this.dirty;
  }
  getValores() {
    return { ...this.valoresAtuais };
  }
  setValores(i) {
    !i || typeof i != "object" || (Object.keys(i).forEach((t) => {
      this.valoresAtuais[t] = i[t], this.valoresOriginais[t] = i[t];
    }), this.dirty = !1, this.ctx.onAtualizarBotoesFooter(this.dirty));
  }
  obterValor(i) {
    return this.valoresAtuais[i];
  }
  definirValor(i, t, e = !0) {
    var a;
    const o = this.valoresAtuais[i];
    if (this.valoresAtuais[i] = t, this.dirty = !0, this.ctx.onAtualizarBotoesFooter(this.dirty), this.ctx.onAtualizarCampoVisual(i, t), e) {
      let r = "";
      for (const s of this.ctx.getCategorias())
        if ((a = s.propriedades) != null && a.some((l) => l.id === i)) {
          r = s.id;
          break;
        }
      this.emitirAlteracao(i, t, o, r);
    }
  }
  registrarAlteracao(i, t, e) {
    var r;
    const o = this.valoresAtuais[t];
    this.valoresAtuais[t] = e, this.dirty = !0, this.ctx.onAtualizarBotoesFooter(this.dirty);
    const a = (r = this.ctx.hostElement.shadowRoot) == null ? void 0 : r.querySelector(`[data-prop-id="${t}"]`);
    a && a.classList.add("ui-prop__linha--modificada"), this.ctx.isModoManual() || this.emitirAlteracao(t, e, o, i);
  }
  aplicar() {
    var t;
    if (!this.dirty) return;
    this.valoresOriginais = { ...this.valoresAtuais }, this.dirty = !1, this.ctx.onAtualizarBotoesFooter(this.dirty);
    const i = (t = this.ctx.hostElement.shadowRoot) == null ? void 0 : t.querySelectorAll(".ui-prop__linha--modificada");
    i == null || i.forEach((e) => e.classList.remove("ui-prop__linha--modificada")), this.ctx.hostElement.dispatchEvent(
      new CustomEvent("ui-aplicar", {
        bubbles: !0,
        composed: !0,
        detail: { valores: { ...this.valoresAtuais } }
      })
    );
  }
  desfazer() {
    this.dirty && (this.valoresAtuais = { ...this.valoresOriginais }, this.dirty = !1, this.ctx.onAtualizarBotoesFooter(this.dirty), this.ctx.onRenderCategorias(), this.ctx.hostElement.dispatchEvent(
      new CustomEvent("ui-desfazer", {
        bubbles: !0,
        composed: !0,
        detail: { valores: { ...this.valoresAtuais } }
      })
    ));
  }
  emitirAlteracao(i, t, e, o = "") {
    this.ctx.hostElement.dispatchEvent(
      new CustomEvent("ui-propriedade-alterada", {
        bubbles: !0,
        composed: !0,
        detail: {
          id: i,
          categoriaId: o,
          valor: t,
          valorAnterior: e,
          todosValores: { ...this.valoresAtuais }
        }
      })
    );
  }
}
function Gi(n) {
  const { shadow: i, listeners: t, host: e, onToggleExpandirTodas: o, onFiltrar: a, onAplicar: r, onDesfazer: s } = n, l = i.getElementById("btn-expandir-tudo");
  l && t.add(l, "click", o);
  const h = i.getElementById("btn-fechar");
  h && t.add(h, "click", () => {
    e.dispatchEvent(new CustomEvent("ui-fechar", { bubbles: !0, composed: !0 }));
  });
  const u = i.getElementById("filtro-input");
  u && t.add(u, "input", () => {
    const f = (u.value || "").trim().toLowerCase();
    a(f);
  });
  const d = i.getElementById("btn-aplicar");
  d && t.add(d, "click", r);
  const p = i.getElementById("btn-desfazer");
  p && t.add(p, "click", s);
  const m = i.getElementById("link-ajuda");
  m && t.add(m, "click", () => {
    e.dispatchEvent(new CustomEvent("ui-ajuda", { bubbles: !0, composed: !0 }));
  });
}
function Wi(n, i) {
  const t = n.getElementById("header-titulo-texto");
  t && (t.textContent = i.getAttribute("titulo") || "Propriedades");
  const e = n.getElementById("btn-fechar");
  e && (e.style.display = i.hasAttribute("fechavel") ? "inline-flex" : "none");
  const o = n.getElementById("filtro-container");
  o && (o.style.display = i.hasAttribute("filtro") ? "flex" : "none");
  const a = n.getElementById("footer");
  a && (a.style.display = i.getAttribute("modo-aplicar") === "manual" ? "flex" : "none");
}
function Ui(n, i) {
  const t = Array.from(
    n.querySelectorAll(
      '.ui-prop__linha input:not([disabled]):not([type="color"]):not(.ui-prop__cor-picker-oculto), .ui-prop__linha select:not([disabled]), .ui-prop__linha .ui-prop__btn-acao-inline:not([disabled])'
    )
  ), e = t.indexOf(i);
  if (e !== -1 && e + 1 < t.length) {
    const o = t[e + 1];
    o.focus(), o instanceof HTMLInputElement && o.select();
  }
}
function yt(n, i, t) {
  const e = n.querySelector(`[data-prop-id="${i}"]`);
  if (!e) return;
  const o = e.querySelector('input:not([type="color"]):not(.ui-prop__cor-picker-oculto)');
  o && (o.value = String(t ?? ""));
}
function Yi(n, i) {
  i.forEach((e) => e.aberto = !0), n.querySelectorAll(".ui-prop__categoria").forEach((e) => e.classList.add("ui-prop__categoria--aberta"));
}
function Xi(n, i) {
  i.forEach((e) => e.aberto = !1), n.querySelectorAll(".ui-prop__categoria").forEach((e) => e.classList.remove("ui-prop__categoria--aberta"));
}
function Ki(n, i, t, e) {
  const o = t.find((a) => a.id === e);
  if (o) {
    o.aberto = o.aberto === !1;
    const a = n.querySelector(`[data-cat-id="${e}"]`);
    a && a.classList.toggle("ui-prop__categoria--aberta", !!o.aberto), i.dispatchEvent(
      new CustomEvent("ui-categoria-toggle", {
        bubbles: !0,
        composed: !0,
        detail: { id: e, aberto: o.aberto }
      })
    );
  }
}
class Zi extends HTMLElement {
  constructor() {
    super();
    c(this, "shadow");
    c(this, "listeners", new F());
    c(this, "splitterListeners", new F());
    c(this, "controladorSplitter");
    c(this, "gerenciadorValores");
    c(this, "_categorias", []);
    c(this, "_tipos", []);
    c(this, "_tipoSelecionadoId", "");
    c(this, "_termoBusca", "");
    c(this, "_larguraRotuloPorcentagem", 45);
    c(this, "tipoContainerElement");
    c(this, "corpoElement");
    c(this, "btnAplicarElement");
    c(this, "btnDesfazerElement");
    c(this, "splitterElement");
    this.shadow = this.attachShadow({ mode: "open" }), this.shadow.innerHTML = Oi(), this.tipoContainerElement = this.shadow.getElementById("tipo-container"), this.corpoElement = this.shadow.getElementById("corpo"), this.btnAplicarElement = this.shadow.getElementById("btn-aplicar"), this.btnDesfazerElement = this.shadow.getElementById("btn-desfazer"), this.splitterElement = this.shadow.getElementById("splitter"), this.gerenciadorValores = new ji({
      hostElement: this,
      getCategorias: () => this._categorias,
      onAtualizarBotoesFooter: (t) => {
        this.btnAplicarElement.disabled = !t, this.btnDesfazerElement.disabled = !t;
      },
      onAtualizarCampoVisual: (t, e) => yt(this.shadow, t, e),
      onRenderCategorias: () => this.renderCategorias(),
      isModoManual: () => this.getAttribute("modo-aplicar") === "manual"
    }), this.controladorSplitter = Ri({
      hostElement: this,
      corpoElement: this.corpoElement,
      splitterElement: this.splitterElement,
      splitterListeners: this.splitterListeners,
      onLarguraAlterada: (t) => {
        this._larguraRotuloPorcentagem = t;
      }
    });
  }
  static get observedAttributes() {
    return [
      "titulo",
      "estilo-visual",
      "modo-aplicar",
      "filtro",
      "densidade",
      "largura-rotulo",
      "fechavel"
    ];
  }
  get larguraRotuloPorcentagem() {
    return this._larguraRotuloPorcentagem;
  }
  connectedCallback() {
    this.listeners.cleanup(), Gi({
      shadow: this.shadow,
      listeners: this.listeners,
      host: this,
      onToggleExpandirTodas: () => this.toggleExpandirTodas(),
      onFiltrar: (t) => {
        this._termoBusca = t, this.renderCategorias();
      },
      onAplicar: () => this.aplicar(),
      onDesfazer: () => this.desfazer()
    }), this.controladorSplitter.init(), this.syncState();
  }
  disconnectedCallback() {
    this.listeners.cleanup(), this.splitterListeners.cleanup();
  }
  attributeChangedCallback(t, e, o) {
    if (t === "largura-rotulo" && o) {
      const a = parseFloat(o);
      isNaN(a) || (this._larguraRotuloPorcentagem = this.controladorSplitter.definirLarguraRotulo(a));
    }
    this.syncState();
  }
  get categorias() {
    return this._categorias;
  }
  set categorias(t) {
    this._categorias = Array.isArray(t) ? t : [], this.gerenciadorValores.inicializarCategorias(this._categorias), this.renderCategorias();
  }
  get tipos() {
    return this._tipos;
  }
  set tipos(t) {
    this._tipos = Array.isArray(t) ? t : [], this.renderSeletorTipos();
  }
  get tipoSelecionado() {
    return this._tipoSelecionadoId;
  }
  set tipoSelecionado(t) {
    this._tipoSelecionadoId = t, this.renderSeletorTipos();
  }
  get valores() {
    return this.gerenciadorValores.getValores();
  }
  set valores(t) {
    this.gerenciadorValores.setValores(t), this.renderCategorias();
  }
  get isDirty() {
    return this.gerenciadorValores.isDirty;
  }
  get dirty() {
    return this.gerenciadorValores.isDirty;
  }
  obterValor(t) {
    return this.gerenciadorValores.obterValor(t);
  }
  definirValor(t, e, o = !0) {
    this.gerenciadorValores.definirValor(t, e, o);
  }
  aplicar() {
    this.gerenciadorValores.aplicar();
  }
  desfazer() {
    this.gerenciadorValores.desfazer();
  }
  expandirTudo() {
    Yi(this.shadow, this._categorias);
  }
  colapsarTudo() {
    Xi(this.shadow, this._categorias);
  }
  toggleCategoria(t) {
    Ki(this.shadow, this, this._categorias, t);
  }
  syncState() {
    Wi(this.shadow, this);
    const t = this.getAttribute("largura-rotulo");
    if (t) {
      const e = parseFloat(t);
      isNaN(e) || (this._larguraRotuloPorcentagem = this.controladorSplitter.definirLarguraRotulo(e));
    }
    this.renderSeletorTipos(), this.renderCategorias();
  }
  toggleExpandirTodas() {
    this._categorias.some((e) => e.aberto === !1) ? this.expandirTudo() : this.colapsarTudo();
  }
  renderSeletorTipos() {
    $i({
      tipoContainerElement: this.tipoContainerElement,
      tipos: this._tipos,
      tipoSelecionadoId: this._tipoSelecionadoId,
      estiloVisual: this.getAttribute("estilo-visual") || "autocad",
      onSelecionarTipo: (t) => {
        this._tipoSelecionadoId = t, this.renderSeletorTipos();
        const e = this._tipos.find((o) => String(o.id) === String(t));
        this.dispatchEvent(new CustomEvent("ui-tipo-alterado", { bubbles: !0, composed: !0, detail: { id: t, tipo: e } }));
      },
      onEditarTipo: (t) => this.dispatchEvent(new CustomEvent("ui-editar-tipo-clique", { bubbles: !0, composed: !0, detail: { tipo: t } })),
      onQuickSelect: (t) => this.dispatchEvent(new CustomEvent("ui-quick-select", { bubbles: !0, composed: !0, detail: { tipo: t } })),
      onSelectObjects: (t) => this.dispatchEvent(new CustomEvent("ui-selecionar-objetos", { bubbles: !0, composed: !0, detail: { tipo: t } })),
      onCalculadora: (t) => this.dispatchEvent(new CustomEvent("ui-calculadora", { bubbles: !0, composed: !0, detail: { tipo: t } }))
    });
  }
  renderCategorias() {
    const t = this.shadow.getElementById("lista-categorias");
    t && Di({
      listaContainer: t,
      categorias: this._categorias,
      termoBusca: this._termoBusca,
      onToggleCategoria: (e) => this.toggleCategoria(e),
      linhaCtx: {
        valoresAtuais: this.gerenciadorValores.getValores(),
        valoresOriginais: {},
        isDirty: this.gerenciadorValores.isDirty,
        onAtualizarCampoVisual: (e, o) => yt(this.shadow, e, o),
        editorCtx: {
          obterValorAtual: (e) => this.gerenciadorValores.obterValor(e),
          registrarAlteracao: (e, o, a) => {
            this.gerenciadorValores.registrarAlteracao(e, o, a);
          },
          focarProximoEditor: (e) => Ui(this.shadow, e),
          despacharEventoAcao: (e, o) => {
            this.dispatchEvent(
              new CustomEvent("ui-acao-clique", {
                bubbles: !0,
                composed: !0,
                detail: { id: e.id, categoriaId: o, propriedade: e }
              })
            );
          }
        }
      }
    });
  }
}
customElements.get("ui-tabela-propriedades") || customElements.define("ui-tabela-propriedades", Zi);
class oo {
  constructor(i, t) {
    c(this, "polylines", []);
    c(this, "bancoPontosAtivo", !1);
    c(this, "core");
    this.core = i;
  }
  setBancoPontosAtivo(i) {
    this.bancoPontosAtivo = i;
  }
  plotSegmentos(i, t) {
    this.core.map && i.forEach((e) => {
      const o = t.find((r) => String(r.id) === String(e.ponto_inicio_id)), a = t.find((r) => String(r.id) === String(e.ponto_fim_id));
      if (o && a && o.lat && o.lon && a.lat && a.lon) {
        const r = e.tipo_limite_sigef || e.tipo_limite || "", s = e.metodo_posicionamento_sigef || e.metodo_posicionamento || "", l = this.bancoPontosAtivo ? "#94a3b8" : r === "LA1" ? "#10b981" : "#3b82f6", h = this.core.config.perimetroWeight, u = this.bancoPontosAtivo ? 0.4 : 1, d = y.polyline([[o.lat, o.lon], [a.lat, a.lon]], {
          color: l,
          weight: h,
          opacity: u,
          dashArray: r === "LN1" ? "6, 6" : void 0,
          pane: "perimetroPane"
        }).bindPopup(`
          <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
            <div style="font-weight:700; font-size:12px; margin-bottom:3px; color:#ffffff;">${E(o.nome_vertice)} ↔ ${E(a.nome_vertice)}</div>
            <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Limite: ${E(r)} · ${E(s)}</div>
          </div>
        `, {
          className: "compact-popup",
          maxWidth: 220
        }).addTo(this.core.map);
        this.polylines.push(d);
      }
    });
  }
  plotPolilinhaTemporaria(i) {
    var l, h, u;
    if (!this.core.map) return;
    const t = i.filter(
      (d) => d.lat && d.lon && d.lat !== 0 && d.lon !== 0 && d.tipo_ponto !== "B" && d.tipo !== "B" && d.ignorar_poligono !== 1
    );
    if (t.length < 2) return;
    const e = ((l = this.core.controller) == null ? void 0 : l.chaveGrupo) || ((u = (h = this.core.controller) == null ? void 0 : h.context) == null ? void 0 : u.chaveGrupo), o = it(t, e), a = this.bancoPontosAtivo ? "#94a3b8" : "#10b981", r = this.core.config.fechamentoWeight || 2, s = this.bancoPontosAtivo ? 0.4 : 1;
    Object.values(o).forEach((d) => {
      const p = ot(d);
      if (p.length < 2) return;
      for (let g = 0; g < p.length - 1; g++) {
        const v = p[g], w = p[g + 1], L = y.polyline([[v.lat, v.lon], [w.lat, w.lon]], {
          color: a,
          weight: r,
          opacity: s,
          pane: "perimetroPane"
        }).addTo(this.core.map);
        this.polylines.push(L);
      }
      const m = p[p.length - 1], f = p[0], b = y.polyline([[m.lat, m.lon], [f.lat, f.lon]], {
        color: a,
        weight: r,
        opacity: s,
        dashArray: "4, 4",
        pane: "perimetroPane"
      }).addTo(this.core.map);
      this.polylines.push(b);
    });
  }
  plotPoligonalHomologada(i) {
    var a, r, s;
    if (!this.core.map || !this.core.bancoPontosGroup) return;
    this.core.bancoPontosGroup.clearLayers();
    const t = i.filter((l) => l.lat && l.lon && l.lat !== 0 && l.lon !== 0);
    if (t.length === 0) return;
    this.bancoPontosAtivo = !0, t.forEach((l) => {
      const h = `
        <div class="w-4.5 h-4.5 bg-amber-500 text-slate-950 border-2 border-slate-900 rounded-full flex items-center justify-center text-[7px] font-black font-mono shadow-md hover:scale-125 transition-transform" id="banco-marker-${l.id}">
          H
        </div>
      `, u = y.divIcon({
        html: h,
        className: "banco-leaflet-marker",
        iconSize: [18, 18]
      }), d = `
        <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.35; min-width:180px;">
          <div style="font-weight:800; font-size:11px; color:#fbbf24; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid rgba(255, 255, 255, 0.1); padding-bottom:3px; margin-bottom:5px;">Vértice Homologado SIGEF</div>
          <div style="font-weight:700; font-size:13px; margin-bottom:3px; color:#ffffff;">${E(l.codigo_completo || l.nome_vertice)}</div>
          <div style="font-size:11px; color:rgba(255, 255, 255, 0.7); font-family:monospace;">Este (E): ${l.este ? l.este.toFixed(2) : "N/A"} m</div>
          <div style="font-size:11px; color:rgba(255, 255, 255, 0.7); font-family:monospace; margin-bottom:3px;">Norte (N): ${l.norte ? l.norte.toFixed(2) : "N/A"} m</div>
          <div style="font-size:11px; color:rgba(255, 255, 255, 0.7); margin-bottom:2px;">Alt (h): <strong>${l.altitude ? l.altitude.toFixed(2) : "N/A"} m</strong></div>
          <div style="font-size:10px; color:rgba(255, 255, 255, 0.45);">Método: ${E(l.metodo_posicionamento) || "N/A"} · Limite: ${E(l.tipo_limite) || "N/A"}</div>
          ${l.confrontante_descritivo ? `<div style="font-size:10px; color:rgba(255, 255, 255, 0.65); border-top:1px solid rgba(255, 255, 255, 0.1); padding-top:4px; margin-top:4px; word-break:break-word;"><strong>Conf:</strong> ${E(l.confrontante_descritivo)}</div>` : ""}
        </div>
      `;
      y.marker([l.lat, l.lon], {
        icon: u,
        pane: "verticesPane"
      }).bindPopup(d, { className: "compact-popup", maxWidth: 220 }).addTo(this.core.bancoPontosGroup);
    });
    const e = ((a = this.core.controller) == null ? void 0 : a.chaveGrupo) || ((s = (r = this.core.controller) == null ? void 0 : r.context) == null ? void 0 : s.chaveGrupo), o = it(t, e);
    for (const l in o) {
      const h = ot(o[l]);
      if (h.length >= 2) {
        const u = h.map((d) => y.latLng(d.lat, d.lon));
        u.push(y.latLng(h[0].lat, h[0].lon)), y.polyline(u, {
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
    this.core.map && this.polylines.forEach((i) => this.core.map.removeLayer(i)), this.core.bancoPontosGroup && this.core.bancoPontosGroup.clearLayers(), this.polylines = [];
  }
}
class ao {
  constructor(i, t) {
    c(this, "markers", []);
    c(this, "vizinhosMarkers", []);
    c(this, "vizinhosPoligonos", []);
    c(this, "core");
    c(this, "controller");
    this.core = i, this.controller = t;
  }
  plotPontos(i, t) {
    this.core.map && i.forEach((e) => {
      var o, a, r;
      if (e.lat && e.lon && e.lat !== 0 && e.lon !== 0) {
        const s = e.tipo_ponto === "B" || e.tipo === "B", l = e.tipo_ponto === "M" || e.tipo === "M";
        let h = "bg-mint-vibrant", u = "x", d = 7;
        l ? (h = "bg-indigo-500", d = 9) : s && (h = "bg-rose-500", d = 9);
        const p = this.core.config.enableAnimations ? "transition-all duration-150" : "", m = (a = (o = this.controller) == null ? void 0 : o.linhas) != null && a.bancoPontosAtivo ? "opacity-40 hover:opacity-100" : "", f = at(u, d, h, `${p} ${m}`, `map-marker-${e.id}`), b = y.divIcon({
          html: f,
          className: "custom-leaflet-marker flex items-center justify-center",
          iconSize: [d + 6, d + 6]
        }), g = l ? "Base Homologada PPP" : s ? "Base de Campo (Translação)" : "Vértice de Perímetro", v = y.marker([e.lat, e.lon], {
          icon: b,
          pane: "verticesPane"
        });
        v.pontoId = e.id, (r = this.controller) != null && r.modoCliqueSequencialAtivo || v.bindPopup(`
            <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
              <div style="font-weight:700; font-size:13px; margin-bottom:4px; color:#ffffff;">${E(e.nome_vertice)}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">${E(g)} · ${E(e.tipo_ponto || e.tipo)}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.45); font-family:monospace; margin-top:4px;">Lat ${e.lat.toFixed(6)} &nbsp; Lon ${e.lon.toFixed(6)}</div>
            </div>
          `, {
          className: "compact-popup",
          maxWidth: 220
        }), v.addTo(this.core.map), v.setZIndexOffset(1e3), v.on("click", () => {
          t(e.id);
        }), this.markers.push(v);
      }
    });
  }
  plotPontosVizinhos(i) {
    if (!this.core.map || !this.core.pontosVizinhosGroup) return;
    this.core.map.hasLayer(this.core.pontosVizinhosGroup) || this.core.pontosVizinhosGroup.addTo(this.core.map), this.vizinhosMarkers && this.vizinhosMarkers.length > 0 && (this.vizinhosMarkers.forEach((e) => {
      e.off(), e.unbindPopup();
    }), this.vizinhosMarkers = []), this.core.pontosVizinhosGroup.clearLayers();
    const t = /* @__PURE__ */ new Map();
    (i || []).forEach((e) => {
      const o = e.lat ?? e.latitude ?? e.y, a = e.lon ?? e.lng ?? e.longitude ?? e.x, r = typeof o == "string" ? parseFloat(o.replace(",", ".")) : Number(o), s = typeof a == "string" ? parseFloat(a.replace(",", ".")) : Number(a);
      if (r !== void 0 && s !== void 0 && !isNaN(r) && !isNaN(s) && r !== 0 && s !== 0) {
        e.lat = r, e.lon = s;
        const l = e.confrontante_id !== void 0 && e.confrontante_id !== null ? String(e.confrontante_id) : "0";
        t.has(l) || t.set(l, []), t.get(l).push(e);
      }
    }), t.forEach((e) => {
      if (e.length >= 2) {
        e.sort((a, r) => Number(a.id) - Number(r.id));
        const o = e.map((a) => y.latLng(a.lat, a.lon));
        e.length > 2 && o.push(y.latLng(e[0].lat, e[0].lon)), y.polyline(o, {
          color: "#a855f7",
          weight: this.core.config.vizinhoWeight,
          dashArray: "4, 6",
          pane: "overlayPane"
        }).addTo(this.core.pontosVizinhosGroup);
      }
      e.forEach((o) => {
        var p, m;
        const a = document.createElement("div");
        a.className = "p-2 font-sans text-xs bg-[#0c1510] text-white min-w-[200px] rounded", a.innerHTML = `
          <div class="font-bold text-purple-400 mb-1 border-b border-white/10 pb-1">Confrontante (Importado)</div>
          <div class="mb-1"><strong>Vértice:</strong> <span class="font-mono">${E(o.nome_vertice || "")}</span></div>
          <div class="mb-1"><strong>Proprietário:</strong> ${E(o.nome_confrontante || "") || "Desconhecido"}</div>
          <div class="mb-1"><strong>Propriedade:</strong> ${E(o.nome_propriedade || "") || "Desconhecida"}</div>
          <div class="mb-1"><strong>Coordenadas:</strong> ${o.lat.toFixed(7)}, ${o.lon.toFixed(7)}</div>
          <div class="text-[10px] text-white/50 border-t border-white/5 pt-1 mt-1 font-mono uppercase tracking-wider mb-2">Pontos Imutáveis do Vizinho</div>
          <div style="display:flex; gap:6px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px;">
            <button class="btn-integrar" style="padding:3px 8px; font-size:10px; font-weight:700; border-radius:4px; background:#00f5a0; color:#04150c; border:none; cursor:pointer;" type="button">
              Integrar
            </button>
            <button class="btn-ocultar" style="padding:3px 8px; font-size:10px; font-weight:700; border-radius:4px; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.8); border:1px solid rgba(255,255,255,0.15); cursor:pointer;" type="button">
              Ocultar
            </button>
          </div>
        `, (p = a.querySelector(".btn-integrar")) == null || p.addEventListener("click", () => {
          window.dispatchEvent(new CustomEvent("gerencigeo:integrar_vizinho", { detail: { pontoId: o.id } }));
        }), (m = a.querySelector(".btn-ocultar")) == null || m.addEventListener("click", () => {
          window.dispatchEvent(new CustomEvent("gerencigeo:ocultar_vizinho", { detail: { pontoId: o.id } }));
        });
        let r = this.core.config.markerStyleV || "cross", s = this.core.config.markerSizeV || 8;
        o.tipo_ponto === "M" || o.tipo === "M" || o.tipo === "B" ? (r = this.core.config.markerStyleM || "circle-dot", s = this.core.config.markerSizeM || 14) : (o.tipo_ponto === "P" || o.tipo === "P" || o.tipo === "O") && (r = this.core.config.markerStyleP || "circle", s = this.core.config.markerSizeP || 10);
        const l = this.core.config.enableAnimations ? "transition-all duration-150" : "", h = at(r, s, "bg-[#a855f7]", l, `map-marker-vizinho-${o.id}`), u = y.divIcon({
          html: h,
          className: "custom-leaflet-marker flex items-center justify-center",
          iconSize: [s + 4, s + 4]
        }), d = y.marker([o.lat, o.lon], {
          icon: u,
          pane: "overlayPane"
        }).bindPopup(a, { className: "custom-leaflet-popup" });
        d.pontoId = o.id, d.isVizinho = !0, d.addTo(this.core.pontosVizinhosGroup), this.vizinhosMarkers.push(d);
      });
    });
  }
  /**
   * Desenha o perímetro (limites) dos imóveis vizinhos importados via WKT POLYGON
   */
  plotPoligonosVizinhos(i) {
    !this.core.map || !this.core.pontosVizinhosGroup || (this.core.map.hasLayer(this.core.pontosVizinhosGroup) || this.core.pontosVizinhosGroup.addTo(this.core.map), this.vizinhosPoligonos.length > 0 && (this.vizinhosPoligonos.forEach((t) => t.off()), this.vizinhosPoligonos = []), (i || []).forEach((t) => {
      if (!t || !t.poligono_wkt) return;
      const e = /POLYGON\s*\(\s*\(\s*(.*?)\s*\)\s*\)/i.exec(t.poligono_wkt);
      if (!e) return;
      const o = e[1].split(",").map((l) => {
        const h = l.trim().split(/\s+/), u = parseFloat(h[0]), d = parseFloat(h[1]);
        return !isNaN(d) && !isNaN(u) ? [d, u] : null;
      }).filter((l) => l !== null);
      if (o.length < 3) return;
      const a = E(t.nome_propriedade || "Propriedade Vizinha"), r = E(t.nome || "Desconhecido"), s = y.polygon(o, {
        color: "#a855f7",
        weight: this.core.config.vizinhoWeight,
        dashArray: "4, 6",
        fillColor: "#a855f7",
        fillOpacity: 0.05,
        pane: "overlayPane"
      }).bindPopup(`
        <div class="p-2 font-sans text-xs bg-[#0c1510] text-white min-w-[200px] rounded">
          <div class="font-bold text-purple-400 mb-1 border-b border-white/10 pb-1">Limite do Vizinho (Importado)</div>
          <div class="mb-1"><strong>Propriedade:</strong> ${a}</div>
          <div class="mb-1"><strong>Proprietário:</strong> ${r}</div>
        </div>
      `, { className: "custom-leaflet-popup" });
      s.addTo(this.core.pontosVizinhosGroup), this.vizinhosPoligonos.push(s);
    }));
  }
  clearMarkers() {
    this.markers && (this.markers.forEach((i) => {
      i.off(), i.unbindPopup(), this.core.map && this.core.map.removeLayer(i);
    }), this.markers = []), this.vizinhosMarkers && (this.vizinhosMarkers.forEach((i) => {
      i.off(), i.unbindPopup();
    }), this.vizinhosMarkers = []), this.vizinhosPoligonos && (this.vizinhosPoligonos.forEach((i) => i.off()), this.vizinhosPoligonos = []), this.core.pontosVizinhosGroup && this.core.pontosVizinhosGroup.clearLayers();
  }
}
class Qi {
  constructor() {
    c(this, "listeners", /* @__PURE__ */ new Map());
  }
  on(i, t) {
    return this.listeners.has(i) || this.listeners.set(i, /* @__PURE__ */ new Set()), this.listeners.get(i).add(t), () => this.off(i, t);
  }
  once(i, t) {
    const e = (o) => {
      this.off(i, e), t(o);
    };
    this.on(i, e);
  }
  off(i, t) {
    const e = this.listeners.get(i);
    e && (e.delete(t), e.size === 0 && this.listeners.delete(i));
  }
  emit(i, t) {
    const e = this.listeners.get(i);
    e && e.forEach((o) => {
      try {
        o(t);
      } catch (a) {
        console.error(`[UIBus] Erro ao executar ouvinte do evento "${i}":`, a);
      }
    }), typeof window < "u" && window.dispatchEvent(
      new CustomEvent(`uibus:${i}`, {
        detail: t,
        bubbles: !0,
        composed: !0
      })
    );
  }
  /* ====================================================
     Métodos de Atalho e Ações de Alta Produtividade
     ==================================================== */
  /**
   * Abre um modal pelo seu ID no documento.
   */
  abrirModal(i) {
    const t = document.getElementById(i);
    return t && typeof t.abrir == "function" ? (t.abrir(), this.emit("modal:aberto", { id: i }), !0) : t ? (t.setAttribute("aberto", ""), this.emit("modal:aberto", { id: i }), !0) : (console.warn(`[UIBus] Modal com ID "${i}" não encontrado no DOM.`), !1);
  }
  /**
   * Fecha um modal pelo seu ID ou todos os modais abertos se nenhum ID for passado.
   */
  fecharModal(i) {
    if (i) {
      const t = document.getElementById(i);
      return t && typeof t.fechar == "function" ? (t.fechar(), this.emit("modal:fechado", { id: i }), !0) : t ? (t.removeAttribute("aberto"), t.removeAttribute("open"), this.emit("modal:fechado", { id: i }), !0) : !1;
    } else
      return document.querySelectorAll(
        "ui-modal[aberto], ui-modal[open], ui-dialog[aberto], ui-dialog[open]"
      ).forEach((e) => {
        typeof e.fechar == "function" ? e.fechar() : (e.removeAttribute("aberto"), e.removeAttribute("open"));
      }), this.emit("modal:fechado-todos"), !0;
  }
  /**
   * Abre um painel lateral (drawer / sheet) pelo seu ID no documento.
   */
  abrirDrawer(i) {
    const t = document.getElementById(i);
    return t && typeof t.abrir == "function" ? (t.abrir(), this.emit("drawer:aberto", { id: i }), !0) : t ? (t.setAttribute("aberto", ""), this.emit("drawer:aberto", { id: i }), !0) : (console.warn(`[UIBus] Drawer com ID "${i}" não encontrado no DOM.`), !1);
  }
  /**
   * Fecha um painel lateral (drawer / sheet) pelo seu ID ou todos se nenhum for passado.
   */
  fecharDrawer(i) {
    if (i) {
      const t = document.getElementById(i);
      return t && typeof t.fechar == "function" ? (t.fechar(), this.emit("drawer:fechado", { id: i }), !0) : t ? (t.removeAttribute("aberto"), t.removeAttribute("open"), this.emit("drawer:fechado", { id: i }), !0) : !1;
    } else
      return document.querySelectorAll(
        "ui-drawer[aberto], ui-drawer[open], ui-sheet[aberto], ui-sheet[open]"
      ).forEach((e) => {
        typeof e.fechar == "function" ? e.fechar() : (e.removeAttribute("aberto"), e.removeAttribute("open"));
      }), this.emit("drawer:fechado-todos"), !0;
  }
  /**
   * Dispara uma notificação toast flutuante inteligente.
   */
  notificar(i) {
    typeof i == "string" ? Q.notificar({ mensagem: i, tipo: "info" }) : Q.notificar(i);
  }
  /**
   * Copia um texto para a área de transferência do usuário e exibe feedback opcional.
   */
  async copiar(i, t) {
    try {
      return await navigator.clipboard.writeText(i), t !== void 0 && this.notificar({
        tipo: "sucesso",
        mensagem: t || "Copiado para a área de transferência!"
      }), this.emit("clipboard:copiado", { texto: i }), !0;
    } catch (e) {
      return console.error("[UIBus] Falha ao copiar texto:", e), this.notificar({
        tipo: "erro",
        mensagem: "Não foi possível copiar o texto."
      }), !1;
    }
  }
  /**
   * Altera a densidade visual global do kit (compacta, normal ou relaxada).
   */
  definirDensidade(i) {
    let t = 34;
    typeof i == "number" ? t = Math.max(15, i) : i === "compacta" ? t = 26 : i === "relaxada" ? t = 42 : t = 34, document.documentElement.style.setProperty("--ui-altura-minima", `${t}px`), document.documentElement.style.setProperty("--ui-campo-altura", `${t}px`), document.documentElement.setAttribute("data-ui-densidade", typeof i == "string" ? i : "custom"), this.emit("densidade:alterada", { densidade: i, alturaPx: t });
  }
  /**
   * Alterna ou define o tema visual global.
   */
  definirTema(i) {
    const t = document.documentElement;
    let e = t.getAttribute("data-tema");
    e || (e = t.classList.contains("dark") ? "escuro" : t.classList.contains("light") ? "claro" : "escuro");
    const o = i || (e === "escuro" ? "claro" : "escuro");
    return t.setAttribute("data-tema", o), o === "escuro" ? (t.classList.add("dark"), t.classList.remove("light")) : (t.classList.remove("dark"), t.classList.add("light")), this.emit("tema:alterado", { tema: o }), o;
  }
}
const V = new Qi();
let _t = !1;
function Ji() {
  _t || typeof document > "u" || (_t = !0, document.addEventListener("click", (n) => {
    const i = n.composedPath ? n.composedPath() : [n.target], t = "[target-modal], [modal-alvo], [dismiss-modal], [fechar-modal], [target-drawer], [drawer-alvo], [dismiss-drawer], [fechar-drawer], [toast-sucesso], [toast-erro], [toast-alerta], [toast-info], [copiar-texto], [alternar-tema], [definir-densidade], [limpar-form]";
    let e = null;
    for (const m of i)
      if (m instanceof HTMLElement && m.matches(t)) {
        e = m;
        break;
      }
    if (!e) return;
    const o = e.getAttribute("target-modal") || e.getAttribute("modal-alvo");
    if (o && V.abrirModal(o), e.hasAttribute("dismiss-modal") || e.hasAttribute("fechar-modal")) {
      const m = e.getAttribute("dismiss-modal") || e.getAttribute("fechar-modal");
      if (m && m !== "")
        V.fecharModal(m);
      else {
        let f = null;
        for (const b of i)
          if (b instanceof HTMLElement && (b.matches("ui-modal, ui-dialog") || b.tagName === "UI-MODAL" || b.tagName === "UI-DIALOG")) {
            f = b;
            break;
          }
        f && (typeof f.fechar == "function" ? f.fechar() : (f.removeAttribute("aberto"), f.removeAttribute("open")));
      }
    }
    const a = e.getAttribute("target-drawer") || e.getAttribute("drawer-alvo");
    if (a && V.abrirDrawer(a), e.hasAttribute("dismiss-drawer") || e.hasAttribute("fechar-drawer")) {
      const m = e.getAttribute("dismiss-drawer") || e.getAttribute("fechar-drawer");
      if (m && m !== "")
        V.fecharDrawer(m);
      else {
        let f = null;
        for (const b of i)
          if (b instanceof HTMLElement && (b.matches("ui-drawer, ui-sheet, ui-painel-lateral, ui-gaveta") || b.tagName.startsWith("UI-DRAWER") || b.tagName.startsWith("UI-SHEET"))) {
            f = b;
            break;
          }
        f && (typeof f.fechar == "function" ? f.fechar() : (f.removeAttribute("aberto"), f.removeAttribute("open")));
      }
    }
    const r = e.getAttribute("toast-sucesso");
    r && V.notificar({ tipo: "sucesso", mensagem: r });
    const s = e.getAttribute("toast-erro");
    s && V.notificar({ tipo: "erro", mensagem: s });
    const l = e.getAttribute("toast-alerta");
    l && V.notificar({ tipo: "alerta", mensagem: l });
    const h = e.getAttribute("toast-info");
    h && V.notificar({ tipo: "info", mensagem: h });
    const u = e.getAttribute("copiar-texto");
    if (u !== null) {
      let m = u;
      if (u.startsWith("#") || u.startsWith(".") || u.match(/^[a-zA-Z0-9_-]+$/))
        try {
          let b = null;
          u.startsWith("#") || u.startsWith(".") ? b = document.querySelector(u) : b = document.getElementById(u) || document.querySelector(`#${u}`), b && (m = b.value !== void 0 && b.value !== null ? b.value : b.textContent || "");
        } catch {
        }
      const f = e.getAttribute("copiar-mensagem") || "Copiado com sucesso!";
      V.copiar(m, f);
    }
    e.hasAttribute("alternar-tema") && V.definirTema();
    const d = e.getAttribute("definir-densidade");
    d && V.definirDensidade(d);
    const p = e.getAttribute("limpar-form");
    if (p) {
      const m = document.getElementById(p);
      m && typeof m.reset == "function" && (m.reset(), V.notificar({ tipo: "info", mensagem: "Formulário limpo." }));
    }
  }));
}
typeof document < "u" && Ji();
export {
  Xt as ATRIBUTOS_OBSERVADOS_CAMPO_TEXTO,
  Dt as ATRIBUTOS_OBSERVADOS_LISTA_FLUTUANTE,
  me as ATRIBUTOS_OBSERVADOS_SEGMENTED,
  xi as CADMapaController,
  ci as CAD_INTERACTIVE_PANES,
  xi as CanvasCADController,
  di as CanvasInteracao,
  vi as CanvasLayerManager,
  xt as DEFAULT_CONFIG,
  gi as DEFAULT_LAYERS,
  xi as GerenciGeoMapaController,
  ji as GerenciadorValoresPropriedades,
  bi as GridLayerRenderer,
  bt as ICONES_ALERTA,
  D as LayerRendererFactory,
  Rt as ListaFlutuantePosicionamento,
  Ht as ListaFlutuanteTeclado,
  F as ListenerBag,
  lt as MapaConfigManager,
  li as MapaCore,
  oo as MapaLinhas,
  ao as MapaMarcadores,
  ue as SegmentedIndicadorController,
  Be as TabelaOrquestradorDados,
  Ie as TabelaRemotaController,
  gt as TabelaSelecaoController,
  ui as TileLayerRenderer,
  Ct as UIAlerta,
  de as UIAvatar,
  ut as UIBadge,
  wt as UIBotao,
  $t as UIBotaoPrimario,
  V as UIBus,
  Et as UICampoTexto,
  ki as UICanvasCAD,
  xe as UICard,
  kt as UICheckbox,
  se as UIChip,
  _e as UIDialog,
  K as UIDrawer,
  ni as UIEsqueleto,
  ze as UIGaveta,
  ee as UIIcone,
  Je as UIKpi,
  ct as UIListaFlutuante,
  ii as UIMapa,
  ai as UIMapaLinha,
  oi as UIMapaMarcador,
  ti as UIMetrica,
  et as UIModal,
  Se as UIPainelLateral,
  Pe as UIPopover,
  st as UIRadio,
  ht as UISegmented,
  ge as UISegmento,
  jt as UISelect,
  Ae as UISheet,
  It as UISkeleton,
  pt as UIStat,
  dt as UISwitch,
  Ze as UITabela,
  Zi as UITabelaPropriedades,
  le as UITag,
  Ut as UITexto,
  Q as UIToast,
  re as UIToggle,
  At as UITooltip,
  pi as VectorLinesLayerRenderer,
  mi as VectorPointsLayerRenderer,
  fi as VectorPolygonsLayerRenderer,
  hi as WmsLayerRenderer,
  Ge as abrirPopoverRedimensionamento,
  it as agruparPontosPorChave,
  Ki as alternarCategoria,
  qe as alternarDirecaoOrdenacao,
  Ne as aplicarOrdenacaoTabela,
  yt as atualizarCampoVisual,
  Vt as atualizarEstadoSelecaoLista,
  Ce as atualizarScrollLockDrawer,
  Ci as avaliarExpressaoMatematica,
  tt as bindPopupAcoesEvents,
  Xi as colapsarTodasCategorias,
  Gi as conectarPainelControles,
  be as criarBotaoOpcao,
  Ri as criarControladorSplitter,
  Ei as criarControladorTamanho,
  Li as criarEditorAcao,
  Si as criarEditorBooleano,
  qi as criarEditorCorCad,
  Ni as criarEditorCorSwatch,
  Ii as criarEditorLinetype,
  Ti as criarEditorLineweight,
  Mi as criarEditorNumero,
  Ai as criarEditorReadonly,
  zi as criarEditorSelecao,
  Pi as criarEditorTexto,
  Bi as criarEditorValor,
  Fi as criarLinhaPropriedade,
  Kt as criarTemplateCampoTexto,
  Ft as criarTemplateListaFlutuante,
  fe as criarTemplateSegmented,
  E as escapeHtml,
  Ue as executarOrquestracaoCorpo,
  We as executarOrquestracaoHeader,
  je as executarRedimensionamentoColuna,
  Ve as exibirPromptPopoverRedimensionamento,
  Yi as expandirTodasCategorias,
  vt as extrairCentroDeWkt,
  Ui as focarProximoEditor,
  io as formatUTM,
  St as formatWidth,
  ke as gerenciarTabTrap,
  zt as getAlignmentClass,
  at as getPointShapeHtml,
  Re as getRowHeight,
  Lt as getTextAlign,
  Ye as inicializarScrollVirtualizacao,
  Fe as iniciarRedimensionamentoColuna,
  Ji as initZeroJSTriggers,
  Ee as isTopMostDrawer,
  Te as localizarIndiceItem,
  He as montarEstruturaDOM,
  nt as obterElementosFocaveis,
  ot as ordenarPontosPorSequencia,
  Xe as orquestrarEstruturaInicial,
  R as parseCoordenada,
  wi as processarAcaoPopup,
  _i as processarCliqueLivreCanvas,
  J as renderPopupAcoesHtml,
  Di as renderizarCategoriasETree,
  De as renderizarCorpoTabela,
  Oe as renderizarHeaderTabela,
  mt as renderizarItensLista,
  yi as renderizarPainelCamadas,
  $i as renderizarSeletorTipos,
  Mt as sincronizarAtributosTabela,
  Jt as sincronizarFeedbackErro,
  Qt as sincronizarIconeSenha,
  Zt as sincronizarLabelEPlaceholder,
  Wi as sincronizarPainelControles,
  Ke as tratarMudancaAtributoTabela,
  he as tratarTecladoSegmented
};
