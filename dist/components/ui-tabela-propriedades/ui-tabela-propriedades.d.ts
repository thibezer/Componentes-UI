export type TipoPropriedade = 'texto' | 'numero' | 'selecao' | 'booleano' | 'cor' | 'cor-cad' | 'linha' | 'linetype' | 'espessura' | 'lineweight' | 'acao' | 'readonly';
export interface OpcaoPropriedade {
    id: string | number;
    rotulo: string;
}
export interface ItemPropriedade {
    id: string;
    rotulo: string;
    tipo: TipoPropriedade;
    valor: any;
    unidade?: string;
    casasDecimais?: number;
    opcoes?: OpcaoPropriedade[];
    placeholder?: string;
    somenteLeitura?: boolean;
    dica?: string;
    rotuloAcao?: string;
    textoAmostra?: string;
    onClickAcao?: (item: ItemPropriedade) => void;
}
export interface CategoriaPropriedades {
    id: string;
    titulo: string;
    aberto?: boolean;
    propriedades: ItemPropriedade[];
}
export interface SeletorTipoItem {
    id: string;
    rotulo: string;
    subtipo?: string;
    iconeSvg?: string;
}
export interface UIPropertyChangeDetail {
    id: string;
    categoriaId: string;
    valor: any;
    valorAnterior: any;
    todosValores: Record<string, any>;
}
/**
 * Avaliador de expressões matemáticas para campos numéricos técnicos (AutoCAD / Revit / Blender).
 * Parser seguro de descida recursiva sem eval(), com suporte a +, -, *, /, ^, parênteses,
 * porcentagens, constantes (pi) e funções matemáticas (sqrt, abs, round, sin, cos).
 */
export declare function avaliarExpressaoMatematica(expr: string): number | null;
export declare class UITabelaPropriedades extends HTMLElement {
    static get observedAttributes(): string[];
    private shadow;
    private listeners;
    private splitterListeners;
    private _categorias;
    private _valoresOriginais;
    private _valoresAtuais;
    private _tipos;
    private _tipoSelecionadoId;
    private _termoBusca;
    private _dirty;
    private _larguraRotuloPorcentagem;
    private headerTituloElement;
    private tipoContainerElement;
    private filtroInputElement;
    private corpoElement;
    private footerElement;
    private btnAplicarElement;
    private btnDesfazerElement;
    private splitterElement;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, _oldVal: string | null, _newVal: string | null): void;
    get categorias(): CategoriaPropriedades[];
    set categorias(novas: CategoriaPropriedades[]);
    get valores(): Record<string, any>;
    set valores(novosValores: Record<string, any>);
    get tipos(): SeletorTipoItem[];
    set tipos(novosTipos: SeletorTipoItem[]);
    get tipoSelecionado(): string;
    set tipoSelecionado(novoId: string);
    get dirty(): boolean;
    /**
     * Define programmaticamente o valor de uma propriedade.
     */
    definirValor(idPropriedade: string, valor: any): void;
    /**
     * Obtém o valor atual de uma propriedade pelo ID.
     */
    obterValor(idPropriedade: string): any;
    /**
     * Confirma e aplica todas as edições pendentes (modo manual estilo Revit).
     */
    aplicar(): void;
    /**
     * Desfaz todas as alterações pendentes e restaura os valores originais.
     */
    desfazer(): void;
    /**
     * Expande todas as categorias da tabela.
     */
    expandirTudo(): void;
    /**
     * Colapsa todas as categorias da tabela.
     */
    colapsarTudo(): void;
    /**
     * Alterna uma categoria específica entre expandida e colapsada.
     */
    toggleCategoria(idCategoria: string): void;
    private syncState;
    private initSplitter;
    private definirLarguraRotulo;
    private toggleExpandirTodas;
    private renderSeletorTipos;
    private selecionarTipo;
    private renderCategorias;
    private criarLinhaPropriedade;
    private criarEditorValor;
    private registrarAlteracao;
    private emitirAlteracao;
    private atualizarBotoesFooter;
    private focarProximoEditor;
    private atualizarCampoVisual;
}
