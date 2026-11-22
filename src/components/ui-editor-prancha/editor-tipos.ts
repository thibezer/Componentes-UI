import type { CamadaPrancha, ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';

/** `editor-concluir`: o usuário confirmou. Os dados são os da prancha naquele instante (o editor não grava nada). */
export interface DetalheEditorConcluirPrancha {
  elementos: ElementoGrafico[];
  camadas: CamadaPrancha[];
  /** Houve mudança desde a carga (ou desde `marcarComoSalvo`). */
  modificado: boolean;
}

/** `editor-cancelar`: o usuário cancelou (botão ou Esc sem nada a cancelar na prancha). */
export interface DetalheEditorCancelarPrancha {
  modificado: boolean;
}

/** Barra de pré-definições: botões, menu "Formas" ou automático (pela largura do editor). */
export type BarraFormasEditorPrancha = 'auto' | 'botoes' | 'menu';

/** Coluna de camadas e propriedades: fixa, gaveta ou automático (pela largura do editor). */
export type LateralEditorPrancha = 'auto' | 'fixa' | 'gaveta';
