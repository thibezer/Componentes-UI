import { CategoriaPropriedades, UIAplicarDetail, UIPropertyChangeDetail } from './tipos';
import { buscarLinhaPropriedade } from './propriedades-dom-utils';
import { isValorMisto, valorInicialDaPropriedade, valoresIguais } from './propriedades-valor-misto';

export { valoresIguais };

export interface ContextoGerenciadorValores {
  hostElement: HTMLElement;
  getCategorias: () => CategoriaPropriedades[];
  onAtualizarBotoesFooter: (dirty: boolean) => void;
  onAtualizarCampoVisual: (propId: string, novoValor: any) => void;
  onRenderCategorias: () => void;
  isModoManual: () => boolean;
}

export class GerenciadorValoresPropriedades {
  private valoresOriginais: Record<string, any> = {};
  private valoresAtuais: Record<string, any> = {};

  constructor(private ctx: ContextoGerenciadorValores) {}

  public inicializarCategorias(categorias: CategoriaPropriedades[]): void {
    this.valoresOriginais = {};
    this.valoresAtuais = {};

    const vistos = new Set<string>();
    categorias.forEach(cat => {
      (cat.propriedades || []).forEach(prop => {
        if (vistos.has(prop.id) && typeof console !== 'undefined') {
          console.warn(`[ui-tabela-propriedades] id de propriedade repetido: "${prop.id}". Os valores são indexados por id e serão compartilhados.`);
        }
        vistos.add(prop.id);
        const valor = valorInicialDaPropriedade(prop);
        this.valoresOriginais[prop.id] = valor;
        this.valoresAtuais[prop.id] = valor;
      });
    });

    this.ctx.onAtualizarBotoesFooter(false);
  }

  /** Há alguma propriedade com valor diferente do original (último aplicar/carregar)? */
  public get isDirty(): boolean {
    return Object.keys(this.valoresAtuais).some(id => this.isModificada(id));
  }

  public isModificada(propId: string): boolean {
    return !valoresIguais(this.valoresAtuais[propId], this.valoresOriginais[propId]);
  }

  public getValores(): Record<string, any> {
    return { ...this.valoresAtuais };
  }

  public getValoresOriginais(): Record<string, any> {
    return { ...this.valoresOriginais };
  }

  public setValores(novosValores: Record<string, any>): void {
    if (!novosValores || typeof novosValores !== 'object') return;
    Object.keys(novosValores).forEach(key => {
      this.valoresAtuais[key] = novosValores[key];
      this.valoresOriginais[key] = novosValores[key];
    });
    this.ctx.onAtualizarBotoesFooter(this.isDirty);
  }

  public obterValor(propId: string): any {
    return this.valoresAtuais[propId];
  }

  /** Alteração programática: atualiza o editor na tela; não emite se o valor não mudou. */
  public definirValor(propId: string, novoValor: any, emitirEvento: boolean = true): void {
    const valorAnterior = this.valoresAtuais[propId];
    if (valoresIguais(valorAnterior, novoValor)) return;
    this.valoresAtuais[propId] = novoValor;
    this.aposAlterar(propId);
    this.ctx.onAtualizarCampoVisual(propId, novoValor);

    if (emitirEvento) {
      this.emitirAlteracao(propId, novoValor, valorAnterior, this.categoriaDe(propId));
    }
  }

  /** Alteração feita pelo usuário num editor. Em modo manual só emite no Aplicar. */
  public registrarAlteracao(categoriaId: string, propId: string, novoValor: any): void {
    const valorAnterior = this.valoresAtuais[propId];
    if (valoresIguais(valorAnterior, novoValor)) return;
    this.valoresAtuais[propId] = novoValor;
    this.aposAlterar(propId);

    if (!this.ctx.isModoManual()) {
      this.emitirAlteracao(propId, novoValor, valorAnterior, categoriaId);
    }
  }

  /**
   * Volta uma propriedade ao valor do último carregar/aplicar. Emite `ui-propriedade-alterada`
   * fora do modo manual. Devolve `false` se não havia o que restaurar.
   */
  public reverter(propId: string): boolean {
    if (!(propId in this.valoresOriginais) || !this.isModificada(propId)) return false;
    const valorAnterior = this.valoresAtuais[propId];
    const original = this.valoresOriginais[propId];
    this.valoresAtuais[propId] = original;
    this.aposAlterar(propId);
    this.ctx.onAtualizarCampoVisual(propId, original);
    if (!this.ctx.isModoManual()) {
      this.emitirAlteracao(propId, original, valorAnterior, this.categoriaDe(propId));
    }
    return true;
  }

  public aplicar(): void {
    if (!this.isDirty) return;
    const alterados: Record<string, any> = {};
    Object.keys(this.valoresAtuais).forEach(id => {
      if (this.isModificada(id)) alterados[id] = this.valoresAtuais[id];
    });
    this.valoresOriginais = { ...this.valoresAtuais };
    this.ctx.onAtualizarBotoesFooter(false);

    const linhasModificadas = this.ctx.hostElement.shadowRoot?.querySelectorAll('.ui-prop__linha--modificada');
    linhasModificadas?.forEach(el => el.classList.remove('ui-prop__linha--modificada'));

    this.ctx.hostElement.dispatchEvent(
      new CustomEvent<UIAplicarDetail>('ui-aplicar', {
        bubbles: true,
        composed: true,
        detail: { valores: { ...this.valoresAtuais }, alterados }
      })
    );
  }

  public desfazer(): void {
    if (!this.isDirty) return;
    this.valoresAtuais = { ...this.valoresOriginais };
    this.ctx.onAtualizarBotoesFooter(false);
    this.ctx.onRenderCategorias();

    this.ctx.hostElement.dispatchEvent(
      new CustomEvent('ui-desfazer', {
        bubbles: true,
        composed: true,
        detail: { valores: { ...this.valoresAtuais } }
      })
    );
  }

  /** Marca/desmarca a linha (modificada e mista) e recalcula os botões do rodapé (voltar ao original limpa o estado). */
  private aposAlterar(propId: string): void {
    const linha = buscarLinhaPropriedade(this.ctx.hostElement.shadowRoot, propId);
    linha?.classList.toggle('ui-prop__linha--modificada', this.isModificada(propId));
    linha?.classList.toggle('ui-prop__linha--misto', isValorMisto(this.valoresAtuais[propId]));
    this.ctx.onAtualizarBotoesFooter(this.isDirty);
  }

  private categoriaDe(propId: string): string {
    for (const cat of this.ctx.getCategorias()) {
      if (cat.propriedades?.some(p => p.id === propId)) return cat.id;
    }
    return '';
  }

  private emitirAlteracao(propId: string, novoValor: any, valorAnterior: any, categoriaId: string = ''): void {
    this.ctx.hostElement.dispatchEvent(
      new CustomEvent<UIPropertyChangeDetail>('ui-propriedade-alterada', {
        bubbles: true,
        composed: true,
        detail: {
          id: propId,
          categoriaId,
          valor: novoValor,
          valorAnterior,
          todosValores: { ...this.valoresAtuais }
        }
      })
    );
  }
}
