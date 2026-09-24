export interface ItemLista {
    id: string;
    label: string;
}
export declare class UIListaFlutuante extends HTMLElement {
    static formAssociated: boolean;
    private internals;
    static get observedAttributes(): string[];
    private labelElement;
    private button;
    private content;
    private listElement;
    private textoElement;
    private backdropElement;
    private sheetTituloElement;
    private sheetCloseButton;
    private listeners;
    private _itens;
    private _value;
    private _defaultValue;
    private observer;
    private focusedIndex;
    constructor();
    connectedCallback(): void;
    carregarItensFilhos(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
    get value(): string;
    set value(val: string);
    get label(): string;
    set label(val: string);
    formResetCallback(): void;
    get itens(): ItemLista[];
    set itens(value: ItemLista[]);
    private toggleLista;
    private handleKeyDown;
    private handleListKeyDown;
    private focarPrimeiroItem;
    private moverFoco;
    abrir(): void;
    fechar: () => void;
    private isMobileOrBottomSheet;
    private posicionarConteudo;
    private handleClickFora;
    private syncLabel;
    private updateSelectedState;
    private renderItens;
    private handleListClick;
    private syncState;
    private selecionarItem;
}
export declare class UISelect extends UIListaFlutuante {
}
