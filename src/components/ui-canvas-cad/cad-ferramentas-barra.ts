import { FERRAMENTAS, ehFerramenta, type Ferramenta } from '../../gerencigeo-canvas/feature_desenho';

/*
 * Barra opcional de ferramentas de desenho. Só aparece se o consumidor pedir pelo atributo
 * `ferramentas` ("todas" ou uma lista separada por espaço/vírgula); sem o atributo, o componente
 * não mostra nenhuma ferramenta (as ferramentas continuam disponíveis pela API).
 */

const ROTULO: Record<Ferramenta, string> = {
  ponto: 'Ponto', linha: 'Linha', poligono: 'Polígono', retangulo: 'Retângulo', elipse: 'Elipse',
  'poligono-regular': 'Hexágono', estrela: 'Estrela', circulo: 'Círculo',
  texto: 'Texto', caneta: 'Caneta', 'medir-distancia': 'Medir', 'medir-area': 'Área',
  dividir: 'Dividir', 'selecao-laco': 'Laço', 'conta-gotas': 'Cor'
};

/** Interpreta o atributo; nomes desconhecidos são ignorados e a ordem da barra é sempre a canônica. */
export function interpretarFerramentas(valor: string | null): Ferramenta[] {
  if (!valor) return [];
  const itens = valor.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (itens.includes('todas')) return [...FERRAMENTAS];
  const pedidas = new Set(itens.filter(ehFerramenta));
  return FERRAMENTAS.filter((f) => pedidas.has(f));
}

export interface ContextoBarraFerramentas {
  raiz: HTMLElement;
  aoEscolher: (ferramenta: Ferramenta) => void;
}

export class BarraFerramentas {
  private barra: HTMLElement | null = null;

  constructor(private ctx: ContextoBarraFerramentas) {}

  public montar(ferramentas: Ferramenta[]): void {
    this.barra?.remove();
    this.barra = null;
    if (ferramentas.length === 0) return;

    const barra = document.createElement('div');
    barra.className = 'cad-quick-toolbar cad-draw-toolbar';
    barra.setAttribute('role', 'toolbar');
    barra.setAttribute('aria-label', 'Ferramentas de desenho');
    for (const f of ferramentas) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cad-btn-tool cad-draw-btn';
      b.dataset.ferramenta = f;
      b.textContent = ROTULO[f];
      b.title = ROTULO[f];
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => this.ctx.aoEscolher(f));
      barra.appendChild(b);
    }
    this.ctx.raiz.appendChild(barra);
    this.barra = barra;
  }

  public marcar(ativa: Ferramenta | null): void {
    this.barra?.querySelectorAll<HTMLButtonElement>('[data-ferramenta]').forEach((b) => {
      const on = b.dataset.ferramenta === ativa;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  public desmontar(): void {
    this.barra?.remove();
    this.barra = null;
  }
}
