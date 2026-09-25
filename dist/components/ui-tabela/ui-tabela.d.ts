export type DensidadeTabela = 'compacta' | 'normal' | 'relaxada';
export interface TabelaColuna<T = any> {
    id: string;
    rotulo: string;
    largura?: string | number;
    larguraMinima?: string | number;
    larguraMaxima?: string | number;
    alinhamento?: 'esquerda' | 'centro' | 'direita' | 'left' | 'center' | 'right';
    ordenavel?: boolean;
    tooltip?: string;
    render?: (valor: any, item: T, index: number) => HTMLElement | string;
}
export interface UISortDetail {
    idColuna: string | null;
    direcao: 'asc' | 'desc' | 'original';
}
export interface UIColumnResizeDetail {
    idColuna: string;
    largura: string;
}
export interface UIRowScrollOptions {
    comportamento?: 'smooth' | 'auto';
    selecionar?: boolean;
}
export declare class UITabela extends HTMLElement {
    static get observedAttributes(): string[];
    private shadow;
    private _colunas;
    private _dadosOriginais;
    private _dadosExibicao;
    private _colunaOrdenada;
    private _direcaoOrdenacao;
    private _textoVazio;
    private _virtualizar;
    private _isResizing;
    private _carregando;
    private _src;
    private _ultimoFiltro;
    private _autoFetchController;
    private _itemSelecionado;
    private _indiceSelecionado;
    private _containerElement;
    private _tableElement;
    private _theadElement;
    private _tbodyElement;
    private _colgroupElement;
    private _emptyElement;
    private _loadingElement;
    private _scrollHandler;
    private _activeResizeCleanup;
    private _headerListeners;
    private _ticking;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _oldVal: string | null, _newVal: string | null): void;
    private syncAttributes;
    get src(): string | null;
    set src(val: string | null);
    get carregando(): boolean;
    set carregando(val: boolean);
    /**
     * Realiza busca assíncrona automática a partir de um endpoint JSON.
     */
    carregarDoEndpoint(url?: string): Promise<void>;
    /**
     * Recarrega os dados do endpoint atual.
     */
    recarregar(): Promise<void>;
    /**
     * Filtra os registros exibidos por um termo de busca em todas as colunas.
     */
    filtrar(termo: string): void;
    private renderLoading;
    private cleanupEventListeners;
    private addHeaderListener;
    get colunas(): TabelaColuna[];
    set colunas(val: TabelaColuna[]);
    get dados(): Record<string, any>[];
    set dados(val: Record<string, any>[]);
    get itens(): Record<string, any>[];
    set itens(val: Record<string, any>[]);
    get chaveId(): string;
    set chaveId(val: string);
    get itemSelecionado(): Record<string, any> | null;
    set itemSelecionado(item: Record<string, any> | null);
    get indiceSelecionado(): number | null;
    set indiceSelecionado(idx: number | null);
    limparSelecao(): void;
    get densidade(): DensidadeTabela;
    set densidade(val: DensidadeTabela);
    get virtualizar(): boolean;
    set virtualizar(val: boolean);
    get colunaOrdenada(): string | null;
    set colunaOrdenada(id: string | null);
    get direcaoOrdenacao(): 'asc' | 'desc' | 'original';
    set direcaoOrdenacao(dir: 'asc' | 'desc' | 'original');
    get textoVazio(): string;
    set textoVazio(txt: string);
    private handleHeaderClick;
    private aplicarOrdenacao;
    private initColumnResize;
    private showPromptPopover;
    private handleHeaderContextMenu;
    private formatWidth;
    private getAlignmentClass;
    private getTextAlign;
    private getRowHeight;
    renderTotal(): void;
    private renderHeader;
    renderBody(): void;
    private isItemSelecionado;
    private atualizarLinhasSelecionadas;
    /**
     * Localiza o índice de um item pelo ID, chave ou índice direto.
     */
    private localizarIndiceItem;
    /**
     * Realiza a rolagem programática (e seleção opcional) até uma linha específica da tabela.
     * Suporta virtualização (cálculo de deslocamento do scroll quando a linha não está no DOM),
     * permitindo que aplicações externas foquem elementos facilmente.
     *
     * @param idOuIndice ID do item (ou campo chave), predicado funcional ou índice na tabela.
     * @param opcoes Opções de comportamento ('smooth' | 'auto') e seleção.
     * @returns true se o item foi localizado e rolado com sucesso, ou false caso contrário.
     */
    rolarPara(idOuIndice: string | number | ((item: any, index: number) => boolean), opcoes?: UIRowScrollOptions): boolean;
}
