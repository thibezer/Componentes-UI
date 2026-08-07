export declare class UITooltip extends HTMLElement {
    static get observedAttributes(): string[];
    private containerElement;
    private bubbleElement;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void;
    get aberto(): boolean;
    set aberto(val: boolean);
    get disabled(): boolean;
    set disabled(val: boolean);
    mostrar(): void;
    ocultar(): void;
    private posicionarBubble;
    private syncState;
    private handleMouseEnter;
    private handleMouseLeave;
    private handleClick;
    private handleClickOutside;
}
export declare class UIPopover extends UITooltip {
}
