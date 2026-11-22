export interface EntradaMedicaoBarra {
  barra: HTMLElement;
  botoesFormas: HTMLElement;
  botaoLateral: HTMLElement;
  lateralVisivel: boolean;
  colapsadaAtual: boolean;
  /** Largura (px) observada pelo ResizeObserver como fallback quando `barra.clientWidth` é 0 (ex.: happy-dom). */
  larguraObservada: number;
}

export interface MedicaoBarraFormas {
  larguraDisponivel: number;
  larguraNecessaria: number;
  transbordouNoDom: boolean;
}

const ESTILO_MEDICAO =
  'display:flex !important;flex-wrap:nowrap !important;width:max-content !important;max-width:none !important;position:absolute !important;visibility:hidden !important;pointer-events:none !important;left:0 !important;top:0 !important;';

const numeroFinitoPositivo = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

const lerPx = (valor: string | null | undefined, padrao: number): number => {
  if (typeof valor !== 'string' || !valor) return padrao;
  const n = parseFloat(valor);
  return Number.isFinite(n) && n >= 0 ? n : padrao;
};

const estiloComputado = (el: HTMLElement): CSSStyleDeclaration | null => {
  try {
    return typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  } catch {
    return null;
  }
};

const larguraCaixa = (el: HTMLElement, incluirScroll = false): number => {
  let rectW = 0;
  try {
    rectW = el.getBoundingClientRect?.().width ?? 0;
  } catch {
    rectW = 0;
  }
  const offW = numeroFinitoPositivo(el.offsetWidth);
  const scrW = incluirScroll ? numeroFinitoPositivo(el.scrollWidth) : 0;
  return Math.max(numeroFinitoPositivo(rectW), offW, scrW, 0);
};

function medirPorFilhos(botoesFormas: HTMLElement, botoes: HTMLElement[]): { largura: number; medido: boolean } {
  const cs = estiloComputado(botoesFormas);
  const gap = lerPx(cs?.columnGap, 4);
  const extra =
    lerPx(cs?.paddingLeft, 0) +
    lerPx(cs?.paddingRight, 0) +
    lerPx(cs?.borderLeftWidth, 0) +
    lerPx(cs?.borderRightWidth, 0);

  let soma = 0;
  let medido = false;
  for (const b of botoes) {
    const w = larguraCaixa(b, true);
    if (w > 0) medido = true;
    soma += w;
  }
  return {
    largura: medido ? soma + Math.max(0, botoes.length - 1) * gap + extra : 0,
    medido
  };
}

function detectarTransbordoNoDom(botoesFormas: HTMLElement, botoes: HTMLElement[]): boolean {
  const primeiro = botoes[0];
  if (primeiro) {
    const altOffset = numeroFinitoPositivo(primeiro.offsetHeight);
    if (altOffset > 0) {
      const topoBase = primeiro.offsetTop;
      const folga = Math.max(4, altOffset * 0.5);
      if (botoes.some((b) => b.offsetTop > topoBase + folga)) return true;
    }
    try {
      const r0 = primeiro.getBoundingClientRect?.();
      if (r0 && r0.height > 0) {
        const folga = Math.max(4, r0.height * 0.5);
        if (botoes.some((b) => (b.getBoundingClientRect?.()?.top ?? r0.top) > r0.top + folga)) return true;
      }
    } catch {
      /* ambiente sem layout */
    }
  }
  const clientW = numeroFinitoPositivo(botoesFormas.clientWidth);
  const scrollW = numeroFinitoPositivo(botoesFormas.scrollWidth);
  return clientW > 0 && scrollW > clientW + 1;
}

/**
 * Mede no DOM a largura disponível para os botões de pré-definições e a largura necessária para exibi-los em uma
 * única linha (mesmo quando `.botoes-formas` está oculto por já ter colapsado em `"Formas ▾"`).
 */
export function medirBarraFormas(entrada: EntradaMedicaoBarra): MedicaoBarraFormas {
  const { barra, botoesFormas, botaoLateral, lateralVisivel, colapsadaAtual, larguraObservada } = entrada;

  const csBarra = estiloComputado(barra);
  const padBarra = lerPx(csBarra?.paddingLeft, 0) + lerPx(csBarra?.paddingRight, 0);
  const gapBarra = lerPx(csBarra?.columnGap, 4);

  let larguraBarra = numeroFinitoPositivo(barra.clientWidth);
  if (!(larguraBarra > 0)) {
    let rectBarra = 0;
    try {
      rectBarra = numeroFinitoPositivo(barra.getBoundingClientRect?.().width);
    } catch {
      rectBarra = 0;
    }
    larguraBarra = rectBarra > 0 ? rectBarra : numeroFinitoPositivo(larguraObservada);
  }

  let larguraDisponivel = Math.max(0, larguraBarra - padBarra);
  if (larguraDisponivel > 0 && lateralVisivel) {
    const largLateral = larguraCaixa(botaoLateral, false);
    if (largLateral > 0) {
      larguraDisponivel = Math.max(0, larguraDisponivel - largLateral - gapBarra);
    }
  }
  if (!(larguraDisponivel > 0) && !colapsadaAtual) {
    larguraDisponivel = numeroFinitoPositivo(botoesFormas.clientWidth);
  }

  const botoes = Array.from(botoesFormas.querySelectorAll<HTMLElement>('button[data-predefinicao]'));
  if (botoes.length === 0) {
    return { larguraDisponivel, larguraNecessaria: 0, transbordouNoDom: false };
  }

  if (colapsadaAtual) {
    // `.botoes-formas` está com `display: none`; mede em linha única fora do fluxo sem causar pintura intermediária.
    const estiloAnterior = botoesFormas.getAttribute('style');
    try {
      botoesFormas.style.cssText = ESTILO_MEDICAO;
      const porFilhos = medirPorFilhos(botoesFormas, botoes);
      let rectW = 0;
      try {
        rectW = numeroFinitoPositivo(botoesFormas.getBoundingClientRect?.().width);
      } catch {
        rectW = 0;
      }
      const scrollW = numeroFinitoPositivo(botoesFormas.scrollWidth);
      return {
        larguraDisponivel,
        larguraNecessaria: Math.max(porFilhos.largura, rectW, scrollW),
        transbordouNoDom: false
      };
    } finally {
      if (estiloAnterior === null) botoesFormas.removeAttribute('style');
      else botoesFormas.setAttribute('style', estiloAnterior);
    }
  }

  const transbordouNoDom = detectarTransbordoNoDom(botoesFormas, botoes);
  const porFilhos = medirPorFilhos(botoesFormas, botoes);
  const clientW = numeroFinitoPositivo(botoesFormas.clientWidth);
  const scrollW = numeroFinitoPositivo(botoesFormas.scrollWidth);
  const larguraNecessaria = porFilhos.medido
    ? (clientW > 0 && scrollW > clientW + 1 ? Math.max(porFilhos.largura, scrollW) : porFilhos.largura)
    : scrollW;

  return { larguraDisponivel, larguraNecessaria, transbordouNoDom };
}
