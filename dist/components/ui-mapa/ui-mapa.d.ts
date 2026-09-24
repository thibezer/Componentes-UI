import { default as L } from 'leaflet';
export declare class UIMapa extends HTMLElement {
    static get observedAttributes(): string[];
    private mapContainer;
    private mapInstance;
    private _initTimer;
    private _resizeObserver?;
    private _resizeTimer?;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, oldVal: string, newVal: string): void;
    private initMap;
    getMap(): L.Map | null;
}
