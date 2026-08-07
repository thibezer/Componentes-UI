export declare class UIMapaMarcador extends HTMLElement {
    static get observedAttributes(): string[];
    private marker;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldVal: string, newVal: string): void;
    private initMarker;
}
