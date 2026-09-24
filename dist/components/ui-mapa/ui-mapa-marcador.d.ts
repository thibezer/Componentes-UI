export declare class UIMapaMarcador extends HTMLElement {
    static get observedAttributes(): string[];
    private marker;
    private _initTimer;
    private _retryCount;
    private _parentMap;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleMapReady;
    attributeChangedCallback(name: string, oldVal: string, newVal: string): void;
    private createPopupContent;
    private initMarker;
}
