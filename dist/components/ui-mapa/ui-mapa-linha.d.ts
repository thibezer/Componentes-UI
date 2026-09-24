export declare class UIMapaLinha extends HTMLElement {
    static get observedAttributes(): string[];
    private polyline;
    private _initTimer;
    private _retryCount;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldVal: string, newVal: string): void;
    private getPontos;
    private initLinha;
}
