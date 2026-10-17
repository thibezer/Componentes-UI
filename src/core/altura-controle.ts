/**
 * Altura única dos controles (botão, campo, lista, segmented, ui-linha).
 * Responsabilidade única: transformar os atributos `altura` / `tamanho` / `densidade` (hostis por definição)
 * no valor da variável CSS `--ui-campo-altura`, o contrato que todos os controles de uma mesma linha leem.
 *
 * Precedência: `altura` explícita > `tamanho`/`size`/`densidade` > herdado do contêiner (`ui-linha`, CSS do consumidor)
 * > token global (`--ui-altura-md`).
 */

export const TAMANHOS_CONTROLE = ['sm', 'md', 'lg'] as const;
export type TamanhoControle = (typeof TAMANHOS_CONTROLE)[number];

/** Nome da variável CSS lida por todos os controles. */
export const VARIAVEL_ALTURA_CONTROLE = '--ui-campo-altura';

const ALTURA_MIN_PX = 15;
const ALTURA_MAX_PX = 200;
const ALTURA_MAX_REM = 12.5;

const SINONIMOS: Readonly<Record<string, TamanhoControle>> = {
  sm: 'sm',
  compacta: 'sm',
  compacto: 'sm',
  md: 'md',
  padrao: 'md',
  'padrão': 'md',
  normal: 'md',
  lg: 'lg',
  relaxada: 'lg',
  relaxado: 'lg',
  conforto: 'lg'
};

/** Valor CSS (com fallback literal) de cada tamanho; segue os tokens de `src/tokens/spacing.css`. */
const VALOR_POR_TAMANHO: Readonly<Record<TamanhoControle, string>> = {
  sm: 'var(--ui-altura-sm, 26px)',
  md: 'var(--ui-altura-md, 34px)',
  lg: 'var(--ui-altura-lg, 42px)'
};

/** Reconhece `sm|md|lg` e os sinônimos de densidade (`compacta`, `padrao`, `relaxada`...). `null` se desconhecido. */
export function normalizarTamanhoControle(valor: string | null | undefined): TamanhoControle | null {
  const chave = (valor ?? '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(SINONIMOS, chave) ? SINONIMOS[chave] : null;
}

/** Valor CSS do tamanho nomeado, ou `null` quando o nome não é reconhecido. */
export function alturaDoTamanho(valor: string | null | undefined): string | null {
  const tamanho = normalizarTamanhoControle(valor);
  return tamanho ? VALOR_POR_TAMANHO[tamanho] : null;
}

/**
 * Altura explícita: número (px) ou número com unidade `px|rem|em`.
 * Valores fora de [15px, 200px] são limitados; lixo (`NaN`, negativo, `calc(`, `;`) devolve `null`.
 */
export function normalizarAltura(valor: string | number | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim().toLowerCase();
  const m = /^(\d+(?:\.\d+)?|\.\d+)(px|rem|em)?$/.exec(texto);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unidade = m[2] ?? 'px';
  if (unidade === 'px') return `${Math.min(ALTURA_MAX_PX, Math.max(ALTURA_MIN_PX, n))}px`;
  return `${Math.min(ALTURA_MAX_REM, n)}${unidade}`;
}

export interface EntradaAlturaControle {
  altura?: string | null;
  tamanho?: string | null;
}

/** Aplica a precedência `altura` > `tamanho`. `null` = nada a declarar (herda do contêiner/token). */
export function resolverAlturaControle(entrada: EntradaAlturaControle): string | null {
  return normalizarAltura(entrada.altura) ?? alturaDoTamanho(entrada.tamanho);
}

/** Lê os atributos (PT e EN) de um elemento no formato esperado por `resolverAlturaControle`. */
export function lerEntradaAltura(el: Element): EntradaAlturaControle {
  return {
    altura: el.getAttribute('altura') ?? el.getAttribute('height'),
    tamanho: el.getAttribute('tamanho') ?? el.getAttribute('size') ?? el.getAttribute('densidade')
  };
}

/** Elementos cuja variável inline foi escrita por nós: só esses têm a variável removida ao limpar o atributo. */
const ESCRITOS = new WeakSet<Element>();

/**
 * Sincroniza `--ui-campo-altura` inline do elemento com seus atributos. Sem atributo válido, remove o que
 * escrevemos (preservando uma variável inline do próprio consumidor) e o elemento herda do contêiner/token.
 */
export function aplicarAlturaControle(el: HTMLElement): void {
  try {
    const valor = resolverAlturaControle(lerEntradaAltura(el));
    if (valor) {
      el.style.setProperty(VARIAVEL_ALTURA_CONTROLE, valor);
      ESCRITOS.add(el);
    } else if (ESCRITOS.has(el)) {
      el.style.removeProperty(VARIAVEL_ALTURA_CONTROLE);
      ESCRITOS.delete(el);
    }
  } catch {
    /* Regra #0: estilo indisponível (SSR parcial, elemento destacado) nunca derruba o ciclo de vida. */
  }
}
