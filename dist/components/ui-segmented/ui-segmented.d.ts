export interface UISegmentedOpcao {
    valor: string;
    rotulo: string;
    icone?: string;
    disabled?: boolean;
}
export declare class UISegmented extends HTMLElement {
    static formAssociated: boolean;
    static get observedAttributes(): string[];
    private internals?;
    private rootElement;
    private trackElement;
    private indicadorElement;
    private slotElement;
    private _opcoes;
    private _defaultValue;
    private listeners;
    private resizeObserver?;
    private _rafId;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, old: string | null, value: string | null): void;
    formResetCallback(): void;
    get valor(): string;
    set valor(val: string);
    get value(): string;
    set value(val: string);
    get name(): string;
    set name(val: string);
    get disabled(): boolean;
    set disabled(val: boolean);
    get opcoes(): UISegmentedOpcao[];
    set opcoes(val: UISegmentedOpcao[]);
    private handleSlotChange;
    private carregarOpcoes;
    private renderizarOpcoes;
    selecionarIndice(indice: number, dispararEventos?: boolean): void;
    private atualizarSelecao;
    private atualizarPosicaoIndicador;
    private handleKeyDown;
    private syncState;
}
export declare class UISegmento extends UISegmented {
}
