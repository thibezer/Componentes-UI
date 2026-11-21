import { corSegura } from '../../gerencigeo-canvas/motor/estilo';

/*
 * Cores da interface do canvas (seleção, alças, guias, grade, réguas, mesa, folha) vindas dos tokens. O CSS do componente
 * mapeia cada uma para um token (`--ui-prancha-*` → `--ui-cor-*`, ver `ui-canvas-prancha.css`); aqui elas são lidas UMA vez
 * por `getComputedStyle` e guardadas, e relidas só quando o tema muda. O padrão seguro abaixo vale quando o estilo
 * computado não está disponível (SSR, testes) e espelha os valores dos tokens do tema escuro.
 */

export interface CoresInterfacePrancha {
  mesa: string;
  papel: string;
  bordaPapel: string;
  grade: string;
  selecao: string;
  alca: string;
  guia: string;
  guiaInteligente: string;
  snap: string;
  regua: string;
  textoRegua: string;
}

/** Variável CSS de cada cor (definidas no `:host` do componente a partir dos tokens). */
export const VARIAVEIS_CORES: Readonly<Record<keyof CoresInterfacePrancha, string>> = Object.freeze({
  mesa: '--ui-prancha-mesa',
  papel: '--ui-prancha-papel',
  bordaPapel: '--ui-prancha-borda-papel',
  grade: '--ui-prancha-grade',
  selecao: '--ui-prancha-selecao',
  alca: '--ui-prancha-alca',
  guia: '--ui-prancha-guia',
  guiaInteligente: '--ui-prancha-guia-inteligente',
  snap: '--ui-prancha-snap',
  regua: '--ui-prancha-regua',
  textoRegua: '--ui-prancha-texto-regua'
});

/**
 * Padrão seguro: espelho dos tokens (`--ui-cor-fundo`, `--ui-cor-papel`, `--ui-cor-borda`, `--ui-cor-guia`,
 * `--ui-cor-primaria`, `--ui-cor-superficie`, `--ui-cor-guia-inteligente`, `--ui-cor-fundo-elevado`,
 * `--ui-cor-texto-secundario`) do tema escuro. Só vale quando o estilo computado não existe.
 */
export const CORES_PADRAO_PRANCHA: Readonly<CoresInterfacePrancha> = Object.freeze({
  mesa: '#0b0b0d',
  papel: '#ffffff',
  bordaPapel: 'rgba(255, 255, 255, 0.08)',
  grade: 'rgba(59, 155, 255, 0.22)',
  selecao: '#00E08A',
  alca: '#141417',
  guia: '#3b9bff',
  guiaInteligente: '#ff4fd8',
  snap: '#00E08A',
  regua: '#1a1a1e',
  textoRegua: '#9696a6'
});

/** Lê as cores do estilo computado do host; o que faltar (ou não for cor aceita) fica com o padrão. */
export function resolverCores(host: Element | null): CoresInterfacePrancha {
  const saida: CoresInterfacePrancha = { ...CORES_PADRAO_PRANCHA };
  if (!host || typeof getComputedStyle !== 'function') return saida;
  let estilo: CSSStyleDeclaration | null = null;
  try {
    estilo = getComputedStyle(host);
  } catch {
    return saida;
  }
  for (const chave of Object.keys(VARIAVEIS_CORES) as Array<keyof CoresInterfacePrancha>) {
    const v = estilo.getPropertyValue(VARIAVEIS_CORES[chave])?.trim();
    if (v) saida[chave] = corSegura(v, CORES_PADRAO_PRANCHA[chave]);
  }
  return saida;
}
