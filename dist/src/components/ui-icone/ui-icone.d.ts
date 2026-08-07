export type TamanhoIcone = 'sm' | 'md' | 'lg' | 'xl' | string | number;
export declare class UIIcone extends HTMLElement {
    static get observedAttributes(): string[];
    private iconContainer;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void;
    private resolveTamanhoPx;
    private syncState;
}
