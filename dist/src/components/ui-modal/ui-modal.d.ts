export declare class UIModal extends HTMLElement {
    static _openCount: number;
    static get observedAttributes(): string[];
    private backdropElement;
    private dialogElement;
    private tituloElement;
    private closeElement;
    private _elementoGatilho;
    private _focables;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void;
    get aberto(): boolean;
    set aberto(val: boolean);
    abrir(): void;
    fechar(): void;
    private syncState;
    private handleBackdropClick;
    private handleCloseClick;
    private _atualizarFocables;
    private _isTopMostModal;
    private handleKeyDown;
}
export declare class UIDialog extends UIModal {
}
