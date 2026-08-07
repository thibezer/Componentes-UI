export declare class UICard extends HTMLElement {
    static get observedAttributes(): string[];
    private cardElement;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void;
    get clicavel(): boolean;
    set clicavel(val: boolean);
    get disabled(): boolean;
    set disabled(val: boolean);
    private syncState;
    private handleClick;
}
