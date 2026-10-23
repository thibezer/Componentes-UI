import estilos from './ui-area-texto.css?inline';

export const ATRIBUTOS_OBSERVADOS_AREA_TEXTO = [
  'label',
  'placeholder',
  'value',
  'obrigatorio',
  'required',
  'minlength',
  'min-length',
  'maxlength',
  'max-length',
  'mensagem-validacao',
  'helper-text',
  'erro',
  'mensagem-erro',
  'disabled',
  'readonly',
  'linhas',
  'linhas-max',
  'auto-altura',
  'redimensionar',
  'contador',
  'aria-label'
];

export function criarTemplateAreaTexto(): string {
  return `
    <style>${estilos}</style>
    <div class="ui-area-texto__container">
      <label class="ui-area-texto__label" part="rotulo" style="display: none;"></label>
      <div class="ui-area-texto__wrapper" part="campo">
        <textarea class="ui-area-texto__input" part="input" rows="4"></textarea>
      </div>
    </div>
    <div class="ui-area-texto__rodape" part="rodape">
      <div class="ui-area-texto__helper" part="ajuda" aria-live="polite" style="display: none;"></div>
      <span class="ui-area-texto__contador" part="contador" aria-hidden="true" hidden></span>
    </div>
    <span class="ui-area-texto__anuncio" role="status" aria-live="polite"></span>
  `;
}
