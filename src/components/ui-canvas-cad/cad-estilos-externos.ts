/*
 * CSS do consumidor dentro do shadow root do <ui-canvas-cad> (ex.: popups e rótulos que o app estiliza).
 * Usa `adoptedStyleSheets` quando existe; senão, um <style> no shadow root. As folhas recebidas são
 * copiadas como texto: folhas do `document` não podem ser adotadas direto, e assim o resultado não
 * depende de a folha original continuar viva. Para acompanhar mudanças, chame de novo.
 */

export type EstilosExternos = string | CSSStyleSheet[] | null | undefined;

const ATRIBUTO_FALLBACK = 'data-cad-estilos-externos';

/** Texto de uma folha; folhas de outra origem (SecurityError) são ignoradas. */
function folhaParaTexto(folha: CSSStyleSheet): string {
  try {
    return Array.from(folha.cssRules, (r) => r.cssText).join('\n');
  } catch {
    return '';
  }
}

export function estilosParaTexto(entrada: EstilosExternos): string[] {
  if (typeof entrada === 'string') return entrada.trim() ? [entrada] : [];
  if (!Array.isArray(entrada)) return [];
  return entrada.map((f) => (typeof f === 'string' ? f : folhaParaTexto(f))).filter((t) => t.trim() !== '');
}

export class EstilosExternosShadow {
  private textos: string[] = [];
  private adotadas: CSSStyleSheet[] = [];
  private fallback: HTMLStyleElement | null = null;

  constructor(private shadow: ShadowRoot) {}

  /** O que o consumidor pediu por último (para reaplicar quando o componente reconecta). */
  public get pedido(): readonly string[] {
    return this.textos;
  }

  public definir(entrada: EstilosExternos): void {
    this.textos = estilosParaTexto(entrada);
    this.aplicar();
  }

  /** Tira as folhas do shadow root, mantendo o pedido para `aplicar()` depois. */
  public limpar(): void {
    this.remover();
  }

  public aplicar(): void {
    this.remover();
    if (this.textos.length === 0) return;
    const raiz = this.shadow as ShadowRoot & { adoptedStyleSheets?: CSSStyleSheet[] };
    if (typeof CSSStyleSheet !== 'undefined' && Array.isArray(raiz.adoptedStyleSheets)) {
      try {
        this.adotadas = this.textos.map((t) => {
          const folha = new CSSStyleSheet();
          folha.replaceSync(t);
          return folha;
        });
        raiz.adoptedStyleSheets = [...raiz.adoptedStyleSheets, ...this.adotadas];
        return;
      } catch {
        this.adotadas = [];
      }
    }
    const style = document.createElement('style');
    style.setAttribute(ATRIBUTO_FALLBACK, '');
    style.textContent = this.textos.join('\n');
    this.shadow.appendChild(style);
    this.fallback = style;
  }

  private remover(): void {
    const raiz = this.shadow as ShadowRoot & { adoptedStyleSheets?: CSSStyleSheet[] };
    if (this.adotadas.length > 0 && Array.isArray(raiz.adoptedStyleSheets)) {
      raiz.adoptedStyleSheets = raiz.adoptedStyleSheets.filter((f) => !this.adotadas.includes(f));
    }
    this.adotadas = [];
    this.fallback?.remove();
    this.fallback = null;
  }
}
