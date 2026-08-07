export declare class UIRadio extends HTMLElement {
    static formAssociated: boolean;
    private internals;
    static _registry: Map<string, Set<UIRadio>>;
    static get observedAttributes(): string[];
    private containerElement;
    private labelElement;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    private register;
    private unregister;
    attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void;
    get marcado(): boolean;
    set marcado(val: boolean);
    get name(): string;
    set name(val: string);
    get disabled(): boolean;
    set disabled(val: boolean);
    selecionar(): void;
    syncState(): void;
    formResetCallback(): void;
    private handleClick;
    private handleKeyDown;
    private handleFocus;
    private handleBlur;
}
