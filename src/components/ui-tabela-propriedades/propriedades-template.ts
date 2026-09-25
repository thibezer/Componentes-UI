import estilos from './ui-tabela-propriedades.css?inline';

export function criarTemplateTabelaPropriedades(): string {
  return `
    <style>${estilos}</style>
    <div class="ui-prop__container" id="container">
      <!-- 1. Header Superior -->
      <header class="ui-prop__header" id="header">
        <div class="ui-prop__header-titulo">
          <span class="ui-prop__header-icone">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </span>
          <span id="header-titulo-texto">Propriedades</span>
        </div>
        <div class="ui-prop__header-acoes">
          <button type="button" class="ui-prop__btn-icone" id="btn-expandir-tudo" title="Expandir/Recolher Tudo" aria-label="Expandir ou recolher tudo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="7 13 12 18 17 13"></polyline>
              <polyline points="7 6 12 11 17 6"></polyline>
            </svg>
          </button>
          <button type="button" class="ui-prop__btn-icone" id="btn-fechar" title="Fechar" aria-label="Fechar" style="display: none;">
            ✕
          </button>
        </div>
      </header>

      <!-- 2. Seletor de Tipo (AutoCAD / Revit) -->
      <div class="ui-prop__tipo-seletor-container" id="tipo-container" style="display: none;"></div>

      <!-- 3. Busca Rápida de Propriedades -->
      <div class="ui-prop__filtro-container" id="filtro-container" style="display: none;">
        <svg class="ui-prop__filtro-icone" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="ui-prop__filtro-input" id="filtro-input" placeholder="Filtrar propriedades..." />
      </div>

      <!-- 4. Corpo Rolável com Grade de Categorias -->
      <div class="ui-prop__corpo" id="corpo">
        <div class="ui-prop__splitter" id="splitter"></div>
        <div class="ui-prop__lista-categorias" id="lista-categorias"></div>
      </div>

      <!-- 5. Rodapé com Ações (Aplicar / Desfazer) -->
      <footer class="ui-prop__footer" id="footer" style="display: none;">
        <a class="ui-prop__link-ajuda" id="link-ajuda">Ajuda de propriedades</a>
        <div class="ui-prop__footer-botoes">
          <button type="button" class="ui-prop__btn-desfazer" id="btn-desfazer" disabled>Desfazer</button>
          <button type="button" class="ui-prop__btn-aplicar" id="btn-aplicar" disabled>Aplicar</button>
        </div>
      </footer>
    </div>
  `;
}
