import { default as L } from 'leaflet';
export declare class UIMapa extends HTMLElement {
    private mapContainer;
    private mapInstance;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    private initMap;
    getMap(): L.Map | null;
}
