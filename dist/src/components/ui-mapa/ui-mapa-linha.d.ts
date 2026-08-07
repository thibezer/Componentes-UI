export declare class UIMapaLinha extends HTMLElement {
    static get observedAttributes(): string[];
    private polyline;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldVal: string, newVal: string): void;
    private getPontos;
    private initLinha;
}
