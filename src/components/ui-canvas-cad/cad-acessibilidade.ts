/**
 * Acessibilidade do <ui-canvas-cad>.
 * Responsabilidade única: nomes acessíveis dos botões da barra rápida, estado `aria-pressed` do snap e anúncios
 * (região viva) de seleção e ferramenta para leitores de tela.
 */

import { textoDesenhoRecusado, textoEdicaoRecusada } from './cad-recusas';

/** Botões só com ícone ganham `aria-label` igual ao `title`; `aria-label` já definido é respeitado. */
export function nomearBotoesDaBarra(shadow: ShadowRoot): void {
  shadow.querySelectorAll<HTMLElement>('.cad-quick-toolbar .cad-btn-tool, .layer-panel-close').forEach((b) => {
    const titulo = b.getAttribute('title');
    if (titulo && !b.hasAttribute('aria-label')) b.setAttribute('aria-label', titulo);
  });
}

/** Reflete o snap ligado/desligado no botão da barra. */
export function marcarSnap(shadow: ShadowRoot, ligado: boolean): void {
  const botao = shadow.getElementById('btn-toggle-snap');
  botao?.classList.toggle('active', ligado);
  botao?.setAttribute('aria-pressed', String(ligado));
}

export function textoSelecao(quantidade: number): string {
  if (quantidade <= 0) return 'Nenhuma feição selecionada';
  return quantidade === 1 ? '1 feição selecionada' : `${quantidade} feições selecionadas`;
}

export function textoFerramenta(ferramenta: string | null): string {
  return ferramenta ? `Ferramenta ${ferramenta} ativa` : 'Ferramenta desativada';
}

/** Escreve na região viva (`#cad-status`); trocar o texto é o que dispara o anúncio. */
export function anunciar(shadow: ShadowRoot, texto: string): void {
  const regiao = shadow.getElementById('cad-status');
  if (regiao && regiao.textContent !== texto) regiao.textContent = texto;
}

/** Tempo (ms) que o aviso visível de uma recusa fica na tela. */
export const TEMPO_AVISO_MS = 5000;

/** Mostra a frase no aviso visível (`#cad-aviso`) e some sozinho. Devolve o temporizador para quem precisa cancelar. */
function mostrarAviso(shadow: ShadowRoot, texto: string, anterior: number | undefined): number | undefined {
  const aviso = shadow.getElementById('cad-aviso');
  if (!aviso) return anterior;
  if (anterior !== undefined) window.clearTimeout(anterior);
  aviso.textContent = texto;
  aviso.hidden = false;
  return window.setTimeout(() => {
    aviso.hidden = true;
    aviso.textContent = '';
  }, TEMPO_AVISO_MS);
}

/**
 * Liga os anúncios aos eventos que o próprio componente emite; devolve a função que desliga.
 * Recusas de desenho e de edição viram aviso visível e anúncio, a menos que o host tenha o atributo `sem-avisos`
 * (o consumidor mostra o próprio aviso a partir de `cad-desenho-recusado` / `cad-edicao-recusada`).
 */
export function conectarAnuncios(host: HTMLElement, shadow: ShadowRoot): () => void {
  let temporizador: number | undefined;
  const aoRecusa = (textoDe: (motivo: unknown) => string) => (e: Event): void => {
    if (host.hasAttribute('sem-avisos')) return;
    const texto = textoDe((e as CustomEvent<{ motivo?: unknown }>).detail?.motivo);
    anunciar(shadow, texto);
    temporizador = mostrarAviso(shadow, texto, temporizador);
  };
  const aoDesenhoRecusado = aoRecusa(textoDesenhoRecusado);
  const aoEdicaoRecusada = aoRecusa(textoEdicaoRecusada);
  const aoSelecao = (e: Event): void => {
    const feicoes = (e as CustomEvent<{ feicoes?: unknown[] }>).detail?.feicoes;
    anunciar(shadow, textoSelecao(Array.isArray(feicoes) ? feicoes.length : 0));
  };
  const aoFerramenta = (e: Event): void => {
    const ferramenta = (e as CustomEvent<{ ferramenta?: string | null }>).detail?.ferramenta ?? null;
    anunciar(shadow, textoFerramenta(ferramenta));
  };
  host.addEventListener('cad-selecao', aoSelecao);
  host.addEventListener('cad-ferramenta', aoFerramenta);
  host.addEventListener('cad-desenho-recusado', aoDesenhoRecusado);
  host.addEventListener('cad-edicao-recusada', aoEdicaoRecusada);
  return () => {
    host.removeEventListener('cad-selecao', aoSelecao);
    host.removeEventListener('cad-ferramenta', aoFerramenta);
    host.removeEventListener('cad-desenho-recusado', aoDesenhoRecusado);
    host.removeEventListener('cad-edicao-recusada', aoEdicaoRecusada);
    if (temporizador !== undefined) window.clearTimeout(temporizador);
    temporizador = undefined;
    const aviso = shadow.getElementById('cad-aviso');
    if (aviso) {
      aviso.hidden = true;
      aviso.textContent = '';
    }
  };
}
