import estilos from './ui-campo-texto.css?inline';

export const ATRIBUTOS_OBSERVADOS_CAMPO_TEXTO = [
  'label',
  'placeholder',
  'value',
  'tipo',
  'helper-text',
  'erro',
  'mensagem-erro',
  'disabled',
  'readonly',
  'label-flutuante',
  'alternar-senha',
  'tamanho',
  'size',
  'altura',
  'height',
  'densidade'
];

export function criarTemplateCampoTexto(): string {
  return `
    <style>${estilos}</style>
    <div class="ui-campo-texto__container">
      <label class="ui-campo-texto__label" style="display: none;"></label>
      <div class="ui-campo-texto__wrapper">
        <span class="ui-campo-texto__icone ui-campo-texto__icone--esquerda">
          <slot name="icone-esquerda"></slot>
        </span>
        <input class="ui-campo-texto__input" type="text" />
        <span class="ui-campo-texto__icone ui-campo-texto__icone--direita">
          <slot name="icone-direita"></slot>
        </span>
      </div>
    </div>
    <div class="ui-campo-texto__helper" style="display: none;"></div>
  `;
}
