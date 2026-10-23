/** Direções em que o usuário pode redimensionar a área de texto (atributo `redimensionar`). */
export type RedimensionamentoAreaTexto = 'nenhum' | 'vertical' | 'horizontal' | 'ambos';

/** `detail` de `ui-input` e `ui-change`. */
export interface DetalheValorAreaTexto {
  value: string;
}

/** `detail` de `ui-enviar` (Ctrl/Cmd + Enter). */
export interface DetalheEnviarAreaTexto {
  value: string;
}

/** Nível visual do contador de caracteres. */
export type NivelContador = 'normal' | 'aviso' | 'excedido';

export interface EstadoContador {
  /** Texto visível: `42` ou `42 / 500`. */
  texto: string;
  nivel: NivelContador;
  /** Mensagem para leitores de tela; vazia enquanto o nível for `normal`. */
  anuncio: string;
}
