/*
 * Posição dos HUDs do canvas (`#cm-draw-hud` e `#cm-vertex-edit-hud`). Os dois usam a mesma regra, em CSS:
 * centralizados na área visível do mapa (descontadas as margens de barras e painéis sobrepostos),
 * ancorados à base e sem passar dos limites (largura e altura máximas; o conteúdo quebra de linha e, no extremo, é cortado).
 *
 * As margens vêm de custom properties no conteiner do mapa: `--cad-hud-topo`, `--cad-hud-base`,
 * `--cad-hud-esquerda` e `--cad-hud-direita`. Quem prefere CSS define-as no host (`ui-canvas-cad { --cad-hud-base: 56px }`);
 * `definirMargensHud` as grava inline no conteiner do mapa (e vence o CSS do host).
 */

export interface MargensHud {
  topo: number;
  base: number;
  esquerda: number;
  direita: number;
}

export const MARGEM_HUD_PADRAO: MargensHud = { topo: 0, base: 16, esquerda: 0, direita: 0 };

/** Folga mínima entre o HUD e as bordas da área visível (px). */
export const FOLGA_HUD = 16;
/** Parte da largura do mapa que o HUD pode ocupar, no máximo. */
export const FRACAO_LARGURA_HUD = 0.92;

export const PROPRIEDADES_HUD: Record<keyof MargensHud, string> = {
  topo: '--cad-hud-topo',
  base: '--cad-hud-base',
  esquerda: '--cad-hud-esquerda',
  direita: '--cad-hud-direita'
};

/** Posicionamento comum aos dois HUDs. Equivale a `posicaoHud`. */
export const CSS_POSICAO_HUD =
  'position:absolute;box-sizing:border-box;z-index:10000;' +
  'left:calc(var(--cad-hud-esquerda,0px) + (100% - var(--cad-hud-esquerda,0px) - var(--cad-hud-direita,0px)) / 2);' +
  'bottom:var(--cad-hud-base,16px);transform:translateX(-50%);width:max-content;' +
  'max-width:min(92%, calc(100% - var(--cad-hud-esquerda,0px) - var(--cad-hud-direita,0px) - 16px));' +
  'max-height:calc(100% - var(--cad-hud-topo,0px) - var(--cad-hud-base,16px) - 8px);overflow:hidden;' +
  'display:flex;flex-wrap:wrap;';

/** Mesma conta do CSS, em número: serve de referência para os testes e para quem posiciona algo junto do HUD. */
export function posicaoHud(largura: number, altura: number, margens: Partial<MargensHud> = {}): {
  centroX: number; base: number; larguraMax: number; alturaMax: number;
} {
  const m = { ...MARGEM_HUD_PADRAO, ...margens };
  const visivel = Math.max(0, largura - m.esquerda - m.direita);
  return {
    centroX: m.esquerda + visivel / 2,
    base: m.base,
    larguraMax: Math.max(0, Math.min(largura * FRACAO_LARGURA_HUD, visivel - FOLGA_HUD)),
    alturaMax: Math.max(0, altura - m.topo - m.base - 8)
  };
}

/** Grava (ou, para chaves ausentes/inválidas, remove) as margens no conteiner do mapa. */
export function aplicarMargensHud(conteiner: HTMLElement, margens: Partial<MargensHud>): void {
  for (const k of Object.keys(PROPRIEDADES_HUD) as Array<keyof MargensHud>) {
    const v = margens[k];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) conteiner.style.setProperty(PROPRIEDADES_HUD[k], `${v}px`);
    else conteiner.style.removeProperty(PROPRIEDADES_HUD[k]);
  }
}
