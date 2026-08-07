export type VarianteBotao = 'primary' | 'primario' | 'secondary' | 'secundario' | 'ghost' | 'terciario' | 'destructive' | 'destrutivo' | 'erro' | 'icon-only' | 'icone' | 'destaque';
export declare class UIBotao extends HTMLElement {
    static get observedAttributes(): string[];
    private button;
    private spinnerContainer;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void;
    get carregando(): boolean;
    set carregando(val: boolean);
    private syncState;
    private handleClick;
}
export declare class UIBotaoPrimario extends UIBotao {
}
