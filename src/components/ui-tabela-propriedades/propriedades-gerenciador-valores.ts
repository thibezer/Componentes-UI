import { CategoriaPropriedades, UIAplicarDetail, UIPropertyChangeDetail } from './tipos';
import { buscarLinhaPropriedade } from './propriedades-dom-utils';
import { isValorMisto, valorInicialDaPropriedade, valoresIguais } from './propriedades-valor-misto';
import { alternarPart } from '../../core/parts';

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
    (Array.isArray(categorias) ? categorias : []).forEach(cat => {
      if (!cat || typeof cat !== 'object') return;
      (Array.isArray(cat.propriedades) ? cat.propriedades : []).forEach(prop => {
        if (!prop || typeof prop !== 'object' || prop.id === undefined || prop.id === null) return;
        const propId = String(prop.id);
        if (vistos.has(propId) && typeof console !== 'undefined') {
          console.warn(`[ui-tabela-propriedades] id de propriedade repetido: "${propId}". Os valores são indexados por id e serão compartilhados.`);
        }
        vistos.add(propId);
        const valor = valorInicialDaPropriedade(prop);
        this.valoresOriginais[propId] = valor;
        this.valoresAtuais[propId] = valor;
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

  public obterValorOriginal(propId: string): any {
    return this.valoresOriginais[propId];
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

  /**
   * Restaura uma propriedade individual ao seu valor original (antes da edição).
   * Devolve `false` se não havia o que restaurar.
   */
  public redefinirValor(propId: string, emitirEvento: boolean = true): boolean {
    if (!(propId in this.valoresOriginais) || !this.isModificada(propId)) return false;
    const valorOriginal = this.valoresOriginais[propId];
    this.definirValor(propId, valorOriginal, emitirEvento && !this.ctx.isModoManual());
    return true;
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

  public aplicar(): void {
    if (!this.isDirty) return;
    const alterados: Record<string, any> = {};
    Object.keys(this.valoresAtuais).forEach(id => {
      if (this.isModificada(id)) alterados[id] = this.valoresAtuais[id];
    });
    this.valoresOriginais = { ...this.valoresAtuais };
    this.ctx.onAtualizarBotoesFooter(false);

    const linhasModificadas = this.ctx.hostElement.shadowRoot?.querySelectorAll('.ui-prop__linha--modificada');
    linhasModificadas?.forEach(el => {
      el.classList.remove('ui-prop__linha--modificada');
      alternarPart(el, 'linha-modificada', false);
    });

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
    if (linha) {
      const modificada = this.isModificada(propId);
      const mista = isValorMisto(this.valoresAtuais[propId]);
      linha.classList.toggle('ui-prop__linha--modificada', modificada);
      linha.classList.toggle('ui-prop__linha--misto', mista);
      alternarPart(linha, 'linha-modificada', modificada);
      alternarPart(linha, 'linha-mista', mista);
    }
    this.ctx.onAtualizarBotoesFooter(this.isDirty);
  }

  private categoriaDe(propId: string): string {
    for (const cat of this.ctx.getCategorias()) {
      if (cat && Array.isArray(cat.propriedades) && cat.propriedades.some(p => p && String(p.id) === String(propId))) {
        return cat.id;
      }
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
