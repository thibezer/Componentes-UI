import estilos from './ui-canvas-prancha.css?inline';

/*
 * Shadow DOM do `<ui-canvas-prancha>`: só marcação fixa (nenhum dado do usuário passa por aqui). Duas réguas, a área de
 * desenho com dois canvases (base: mesa, folha, grade e elementos; sobreposição: seleção, alças, guias, snap, prévia) e a
 * região viva para os anúncios de leitores de tela.
 */
export function obterTemplatePrancha(): string {
  return `
    <style>${estilos}</style>
    <div class="raiz" part="base">
      <div class="canto" part="canto-reguas" aria-hidden="true"></div>
      <canvas class="regua regua-h" id="regua-h" part="regua regua-horizontal" aria-hidden="true"></canvas>
      <canvas class="regua regua-v" id="regua-v" part="regua regua-vertical" aria-hidden="true"></canvas>
      <div class="viewport" id="viewport" part="viewport" tabindex="0" role="application"
        aria-roledescription="prancha de desenho" aria-label="Prancha" aria-describedby="ajuda">
        <canvas class="camada" id="camada-base" part="canvas"></canvas>
        <canvas class="camada" id="camada-sobreposicao" part="sobreposicao"></canvas>
      </div>
      <div class="status" id="ajuda">Atalhos: V seleção, A seleção direta, H mão, M retângulo, L elipse, P caneta, barra invertida linha, T texto. Setas movem, Shift multiplica por 10. Delete exclui. Ctrl+Z desfaz. Ctrl+0 ajusta a folha.</div>
      <div class="status" id="status" part="status" role="status" aria-live="polite"></div>
    </div>
  `;
}
