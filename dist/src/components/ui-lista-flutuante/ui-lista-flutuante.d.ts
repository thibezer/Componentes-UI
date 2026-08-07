export interface ItemLista {
    id: string;
    label: string;
}
export declare class UIListaFlutuante extends HTMLElement {
    static formAssociated: boolean;
    private internals;
    static get observedAttributes(): string[];
    private button;
    private content;
    private textoElement;
    private backdropElement;
    private _itens;
    private _value;
    private observer;
    private focusedIndex;
    constructor();
    connectedCallback(): void;
    private carregarItensFilhos;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
    get value(): string;
    set value(val: string);
    formResetCallback(): void;
    get itens(): ItemLista[];
    set itens(value: ItemLista[]);
    private toggleLista;
    private handleKeyDown;
    private handleListKeyDown;
    private focarPrimeiroItem;
    private moverFoco;
    private abrir;
    private fechar;
    private isMobileOrBottomSheet;
    private posicionarConteudo;
    private handleClickFora;
    private syncLabel;
    private updateSelectedState;
    private renderItens;
    private syncState;
    private selecionarItem;
}
export declare class UISelect extends UIListaFlutuante {
}
