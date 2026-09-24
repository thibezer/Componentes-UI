import { ListenerBag } from '../../core/listener-bag';
export declare class UIAlerta extends HTMLElement {
    static get observedAttributes(): string[];
    protected alertaElement: HTMLDivElement;
    protected iconeElement: HTMLSpanElement;
    protected tituloElement: HTMLHeadingElement;
    protected mensagemElement: HTMLParagraphElement;
    protected mensagemTextoElement: HTMLSpanElement;
    protected closeElement: HTMLButtonElement;
    protected acoesElement: HTMLDivElement;
    protected botaoAcaoElement: HTMLButtonElement;
    protected progressoContainer: HTMLDivElement;
    protected progressoBarra: HTMLDivElement;
    protected listeners: ListenerBag;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void;
    fechar(): void;
    protected syncState(): void;
}
export interface UIToastAcao {
    rotulo: string;
    onClick: (e: MouseEvent) => void;
    tipo?: 'primario' | 'secundario' | 'destrutivo';
}
export interface UIToastOpcoes {
    tipo?: 'sucesso' | 'erro' | 'alerta' | 'info';
    titulo?: string;
    mensagem: string;
    duracao?: number;
    posicao?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' | 'bottom-center' | 'top-center';
    acao?: UIToastAcao;
    fechavel?: boolean;
    pausarNoHover?: boolean;
}
export declare class UIToast extends UIAlerta {
    private timerId;
    private tempoRestante;
    private inicioTimestamp;
    private isPausado;
    private acaoConfig?;
    private containerRef;
    configurarAcao(acao: UIToastAcao): void;
    connectedCallback(): void;
    fechar(): void;
    disconnectedCallback(): void;
    private handleAcaoClick;
    private iniciarTimer;
    private pausarTimer;
    private retomarTimer;
    private static obterContainer;
    static notificar(opcoes: UIToastOpcoes): UIToast;
}
