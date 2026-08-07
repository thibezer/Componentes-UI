export declare class UISwitch extends HTMLElement {
    static formAssociated: boolean;
    private internals;
    static get observedAttributes(): string[];
    private containerElement;
    private labelElement;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void;
    get ativo(): boolean;
    set ativo(val: boolean);
    get checked(): boolean;
    set checked(val: boolean);
    get value(): string;
    set value(val: string);
    get name(): string;
    set name(val: string);
    get disabled(): boolean;
    set disabled(val: boolean);
    alternar(): void;
    private syncState;
    formResetCallback(): void;
    private handleClick;
    private handleKeyDown;
    private handleFocus;
    private handleBlur;
}
export declare class UIToggle extends UISwitch {
}
