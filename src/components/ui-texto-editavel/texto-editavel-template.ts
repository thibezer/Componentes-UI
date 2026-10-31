/* ====================================================
   UI Texto Editável - Template e Atributos Observados
   ==================================================== */

export const ATRIBUTOS_OBSERVADOS_TEXTO_EDITAVEL = [
  'valor',
  'value',
  'placeholder',
  'variante',
  'tamanho',
  'disabled',
  'desabilitado',
  'readonly',
  'somente-leitura',
  'ao-perder-foco',
  'obrigatorio',
  'maxlength',
  'limite-caracteres',
  'name',
  'nome'
] as const;

export function criarTemplateTextoEditavel(estilos: string): string {
  return `
    <style>${estilos}</style>
    <div class="ui-texto-editavel ui-texto-editavel--secundario" data-modo="leitura" part="base">
      <button 
        class="ui-texto-editavel__botao" 
        part="botao" 
        type="button"
        aria-description="Pressione Enter ou clique duas vezes para editar"
      >
        <span class="ui-texto-editavel__texto" part="texto"></span>
      </button>
      <input 
        class="ui-texto-editavel__input" 
        part="input" 
        type="text" 
        autocomplete="off" 
        spellcheck="false" 
      />
    </div>
  `;
}
