import estilos from './ui-lista-flutuante.css?inline';

export const ATRIBUTOS_OBSERVADOS_LISTA_FLUTUANTE = [
  'aberta',
  'texto-padrao',
  'value',
  'disabled',
  'bottom-sheet',
  'modo-mobile',
  'label',
  'rotulo',
  'placeholder',
  'tamanho',
  'size',
  'altura',
  'height',
  'densidade'
];

export function criarTemplateListaFlutuante(): string {
  return `
    <style>${estilos}</style>
    <div class="ui-lista-flutuante__container">
      <label class="ui-lista-flutuante__label" style="display: none;"></label>
      <div class="ui-lista-flutuante__backdrop"></div>
      <button class="ui-lista-flutuante__gatilho" aria-haspopup="listbox" aria-expanded="false" type="button">
        <span class="ui-lista-flutuante__texto"></span>
        <span class="ui-lista-flutuante__seta">▼</span>
      </button>
      <div class="ui-lista-flutuante__conteudo" role="listbox" popover="manual">
        <div class="ui-lista-flutuante__sheet-header">
          <div class="ui-lista-flutuante__handle"></div>
          <div class="ui-lista-flutuante__sheet-title-bar">
            <span class="ui-lista-flutuante__sheet-titulo">Selecione uma opção</span>
            <button class="ui-lista-flutuante__sheet-close" type="button" aria-label="Fechar">✕</button>
          </div>
        </div>
        <ul class="ui-lista-flutuante__lista" style="margin: 0; padding: 0; list-style: none;"></ul>
      </div>
    </div>
  `;
}
