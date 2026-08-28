import { UIToastOpcoes } from '../components/ui-alerta';
export type UIEmitterCallback = (dados?: any) => void;
declare class UIBusManager {
    private listeners;
    /**
     * Registra um ouvinte para um canal ou evento global.
     */
    on(evento: string, callback: UIEmitterCallback): () => void;
    /**
     * Registra um ouvinte que será executado apenas uma única vez.
     */
    once(evento: string, callback: UIEmitterCallback): void;
    /**
     * Remove um ouvinte previamente registrado.
     */
    off(evento: string, callback: UIEmitterCallback): void;
    /**
     * Emite um evento com dados para todos os ouvintes inscritos.
     */
    emit(evento: string, dados?: any): void;
    /**
     * Abre um modal pelo seu ID no documento.
     */
    abrirModal(idModal: string): boolean;
    /**
     * Fecha um modal pelo seu ID ou todos os modais abertos se nenhum ID for passado.
     */
    fecharModal(idModal?: string): boolean;
    /**
     * Dispara uma notificação toast flutuante inteligente.
     */
    notificar(opcoes: UIToastOpcoes | string): void;
    /**
     * Copia um texto para a área de transferência do usuário e exibe feedback opcional.
     */
    copiar(texto: string, mensagemFeedback?: string): Promise<boolean>;
    /**
     * Altera a densidade visual global do kit (compacta, normal ou relaxada).
     */
    definirDensidade(densidade: 'compacta' | 'normal' | 'padrao' | 'relaxada' | number): void;
    /**
     * Alterna ou define o tema visual global.
     */
    definirTema(tema?: 'claro' | 'escuro'): string;
}
export declare const UIBus: UIBusManager;
export {};
