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

/** O atributo pede o botão "Editar" (edição de vértices da feição selecionada)? Vale em "todas" ou com a palavra `editar`. */
export function barraPedeEdicao(valor: string | null): boolean {
  if (!valor) return false;
  const itens = valor.split(/[\s,]+/).map((s) => s.trim().toLowerCase());
  return itens.includes('todas') || itens.includes('editar');
}

export interface ContextoBarraFerramentas {
  raiz: HTMLElement;
  aoEscolher: (ferramenta: Ferramenta) => void;
  /** Clique em "Editar". Sem isto o botão não é montado. */
  aoEditar?: () => void;
}

export class BarraFerramentas {
  private barra: HTMLElement | null = null;

  constructor(private ctx: ContextoBarraFerramentas) {}

  public montar(ferramentas: Ferramenta[], comEdicao = false): void {
    this.barra?.remove();
    this.barra = null;
    const editar = comEdicao && !!this.ctx.aoEditar;
    if (ferramentas.length === 0 && !editar) return;

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
    if (editar) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cad-btn-tool cad-draw-btn';
      b.dataset.acao = 'editar';
      b.textContent = 'Editar';
      b.title = 'Editar os vértices da feição selecionada (Enter ou duplo clique)';
      b.setAttribute('aria-pressed', String(this.editando));
      b.classList.toggle('active', this.editando);
      b.addEventListener('click', () => this.ctx.aoEditar!());
      barra.appendChild(b);
    }
    this.ctx.raiz.appendChild(barra);
    this.barra = barra;
  }

  private editando = false;

  /** Reflete no botão "Editar" se a edição está em curso. */
  public marcarEdicao(ativa: boolean): void {
    this.editando = ativa;
    const b = this.barra?.querySelector<HTMLButtonElement>('[data-acao="editar"]');
    if (!b) return;
    b.classList.toggle('active', ativa);
    b.setAttribute('aria-pressed', String(ativa));
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
