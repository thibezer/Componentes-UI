import { CategoriaPropriedades, UIPropertyChangeDetail } from './tipos';

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
  private dirty: boolean = false;

  constructor(private ctx: ContextoGerenciadorValores) {}

  public inicializarCategorias(categorias: CategoriaPropriedades[]): void {
    this.valoresOriginais = {};
    this.valoresAtuais = {};
    this.dirty = false;

    categorias.forEach(cat => {
      (cat.propriedades || []).forEach(prop => {
        this.valoresOriginais[prop.id] = prop.valor;
        this.valoresAtuais[prop.id] = prop.valor;
      });
    });

    this.ctx.onAtualizarBotoesFooter(this.dirty);
  }

  public get isDirty(): boolean {
    return this.dirty;
  }

  public getValores(): Record<string, any> {
    return { ...this.valoresAtuais };
  }

  public setValores(novosValores: Record<string, any>): void {
    if (!novosValores || typeof novosValores !== 'object') return;
    Object.keys(novosValores).forEach(key => {
      this.valoresAtuais[key] = novosValores[key];
      this.valoresOriginais[key] = novosValores[key];
    });
    this.dirty = false;
    this.ctx.onAtualizarBotoesFooter(this.dirty);
  }

  public obterValor(propId: string): any {
    return this.valoresAtuais[propId];
  }

  public definirValor(propId: string, novoValor: any, emitirEvento: boolean = true): void {
    const valorAnterior = this.valoresAtuais[propId];
    this.valoresAtuais[propId] = novoValor;
    this.dirty = true;
    this.ctx.onAtualizarBotoesFooter(this.dirty);

    this.ctx.onAtualizarCampoVisual(propId, novoValor);

    if (emitirEvento) {
      let categoriaId = '';
      for (const cat of this.ctx.getCategorias()) {
        if (cat.propriedades?.some(p => p.id === propId)) {
          categoriaId = cat.id;
          break;
        }
      }
      this.emitirAlteracao(propId, novoValor, valorAnterior, categoriaId);
    }
  }

  public registrarAlteracao(categoriaId: string, propId: string, novoValor: any): void {
    const valorAnterior = this.valoresAtuais[propId];
    this.valoresAtuais[propId] = novoValor;
    this.dirty = true;
    this.ctx.onAtualizarBotoesFooter(this.dirty);

    const linha = this.ctx.hostElement.shadowRoot?.querySelector(`[data-prop-id="${propId}"]`);
    if (linha) {
      linha.classList.add('ui-prop__linha--modificada');
    }

    if (!this.ctx.isModoManual()) {
      this.emitirAlteracao(propId, novoValor, valorAnterior, categoriaId);
    }
  }

  public aplicar(): void {
    if (!this.dirty) return;
    this.valoresOriginais = { ...this.valoresAtuais };
    this.dirty = false;
    this.ctx.onAtualizarBotoesFooter(this.dirty);

    const linhasModificadas = this.ctx.hostElement.shadowRoot?.querySelectorAll('.ui-prop__linha--modificada');
    linhasModificadas?.forEach(el => el.classList.remove('ui-prop__linha--modificada'));

    this.ctx.hostElement.dispatchEvent(
      new CustomEvent('ui-aplicar', {
        bubbles: true,
        composed: true,
        detail: { valores: { ...this.valoresAtuais } }
      })
    );
  }

  public desfazer(): void {
    if (!this.dirty) return;
    this.valoresAtuais = { ...this.valoresOriginais };
    this.dirty = false;
    this.ctx.onAtualizarBotoesFooter(this.dirty);
    this.ctx.onRenderCategorias();

    this.ctx.hostElement.dispatchEvent(
      new CustomEvent('ui-desfazer', {
        bubbles: true,
        composed: true,
        detail: { valores: { ...this.valoresAtuais } }
      })
    );
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
