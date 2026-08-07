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
    private _containerElement;
    private _tableElement;
    private _theadElement;
    private _tbodyElement;
    private _colgroupElement;
    private _emptyElement;
    private _scrollHandler;
    private _activeResizeCleanup;
    private _headerEventListeners;
    private _ticking;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, _oldVal: string | null, _newVal: string | null): void;
    private syncAttributes;
    private cleanupEventListeners;
    private addHeaderListener;
    get colunas(): TabelaColuna[];
    set colunas(val: TabelaColuna[]);
    get dados(): Record<string, any>[];
    set dados(val: Record<string, any>[]);
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
}
