/* ====================================================
   UI Texto Editável - Tipos e Contratos
   ==================================================== */

export type VarianteTextoEditavel =
  | 'secundario'
  | 'secondary'
  | 'primario'
  | 'primary'
  | 'ghost'
  | 'terciario'
  | 'outline'
  | 'borda'
  | 'texto'
  | 'plano'
  | 'destaque'
  | 'destrutivo';

export type TamanhoTextoEditavel = 'sm' | 'md' | 'lg';

export type ModoTextoEditavel = 'leitura' | 'edicao';

export type ComportamentoAoPerderFoco = 'salvar' | 'cancelar' | 'ignorar';

export interface DetalheEventoSalvar {
  valor: string;
  valorAnterior: string;
}

export interface DetalheEventoCancelar {
  valor: string;
}

export interface DetalheEventoModoAlterado {
  modo: ModoTextoEditavel;
}
