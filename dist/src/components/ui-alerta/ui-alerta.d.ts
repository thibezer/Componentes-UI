export declare class UIAlerta extends HTMLElement {
    static get observedAttributes(): string[];
    protected alertaElement: HTMLDivElement;
    protected iconeElement: HTMLSpanElement;
    protected tituloElement: HTMLHeadingElement;
    protected mensagemElement: HTMLParagraphElement;
    protected closeElement: HTMLButtonElement;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void;
    fechar: () => void;
    protected syncState(): void;
}
export declare class UIToast extends UIAlerta {
    private timerId;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private static obterContainer;
    static notificar(opcoes: {
        tipo?: 'sucesso' | 'erro' | 'alerta' | 'info';
        titulo?: string;
        mensagem: string;
        duracao?: number;
        posicao?: 'bottom-right' | 'top-right';
    }): UIToast;
}
