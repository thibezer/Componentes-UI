export type PosicaoDrawer = 'direita' | 'esquerda' | 'baixo' | 'cima';
export declare class UIDrawer extends HTMLElement {
    static get observedAttributes(): string[];
    private backdropElement;
    private painelElement;
    private tituloElement;
    private descricaoElement;
    private closeElement;
    private listeners;
    private _elementoGatilho;
    private _focables;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
    private handleSlotChange;
    get aberto(): boolean;
    set aberto(val: boolean);
    get posicao(): PosicaoDrawer;
    set posicao(val: PosicaoDrawer);
    abrir(): void;
    fechar(): void;
    alternar(): void;
    private syncState;
    private static atualizarScrollLock;
    private handleBackdropClick;
    private handleCloseClick;
    private _atualizarFocables;
    private _isTopMostDrawer;
    private handleKeyDown;
}
export declare class UISheet extends UIDrawer {
}
export declare class UIPainelLateral extends UIDrawer {
}
export declare class UIGaveta extends UIDrawer {
}
