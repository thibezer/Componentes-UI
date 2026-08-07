export declare class UIAvatar extends HTMLElement {
    static get observedAttributes(): string[];
    private avatarElement;
    private statusElement;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void;
    private extrairIniciais;
    private syncState;
    private renderFallback;
}
