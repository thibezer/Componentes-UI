/**
 * Utilitários puros (Camada L1) para resolução e sanitização de degradês internos.
 * Não depende de DOM no nível de módulo (100% SSR-safe).
 */

/** Atributos aceitos nos hosts de Web Components para ativar/customizar degradê interno. */
export const ATRIBUTOS_DEGRADE = ['degrade', 'gradiente', 'gradient'] as const;

/** Classes utilitárias contextuais aceitas para ativação de degradê. */
export const CLASSES_DEGRADE = ['degrade', 'ui-degrade', 'gradiente', 'ui-gradiente'] as const;

/** Tamanho máximo aceito para expressões CSS de degradê (proteção contra payloads gigantes/ReDoS). */
const TAMANHO_MAX_DEGRADE = 512;

/** Funções CSS de gradiente aceitas como seguras. */
const FUNCOES_GRADIENTE_PERMITIDAS = new Set([
  'linear-gradient',
  'radial-gradient',
  'conic-gradient',
  'repeating-linear-gradient',
  'repeating-radial-gradient',
  'repeating-conic-gradient'
]);

/** Valores booleanos/semânticos para ativação padrão ou desativação explícita. */
const VALORES_ATIVACAO_PADRAO = new Set(['', 'true', '1', 'sim', 'yes', 'padrao', 'default']);
const VALORES_DESATIVACAO = new Set(['false', '0', 'off', 'none', 'nao', 'não', 'no']);

/** Mapa de presets semânticos de degradê para tokens do sistema de design ($L_0$). */
export const PRESETS_DEGRADE: Readonly<Record<string, string>> = Object.freeze({
  primario: 'var(--ui-gradiente-primario)',
  primaria: 'var(--ui-gradiente-primario)',
  primary: 'var(--ui-gradiente-primario)',
  secundario: 'var(--ui-gradiente-secundario)',
  secundaria: 'var(--ui-gradiente-secundario)',
  secondary: 'var(--ui-gradiente-secundario)',
  destaque: 'var(--ui-gradiente-destaque)',
  accent: 'var(--ui-gradiente-destaque)',
  destrutivo: 'var(--ui-gradiente-destrutivo)',
  destructive: 'var(--ui-gradiente-destrutivo)',
  superficie: 'var(--ui-gradiente-superficie)',
  surface: 'var(--ui-gradiente-superficie)',
  fundo: 'var(--ui-gradiente-superficie)',
  card: 'var(--ui-gradiente-card)',
  elevado: 'var(--ui-gradiente-elevado)',
  elevated: 'var(--ui-gradiente-elevado)',
  sucesso: 'var(--ui-gradiente-sucesso)',
  success: 'var(--ui-gradiente-sucesso)',
  erro: 'var(--ui-gradiente-erro)',
  error: 'var(--ui-gradiente-erro)',
  perigo: 'var(--ui-gradiente-erro)',
  danger: 'var(--ui-gradiente-erro)',
  alerta: 'var(--ui-gradiente-alerta)',
  warning: 'var(--ui-gradiente-alerta)',
  aviso: 'var(--ui-gradiente-alerta)',
  info: 'var(--ui-gradiente-info)',
  informacao: 'var(--ui-gradiente-info)',
  texto: 'var(--ui-gradiente-texto)',
  text: 'var(--ui-gradiente-texto)'
});

/** Bloqueia caracteres e palavras-chave de injeção CSS/XSS em O(n). */
const PADRAO_BLOQUEADO =
  /[;{}<>\\"'\r\n`]|\/\*|\*\/|\b(?:url|image-set|expression|attr|env)\s*\(|(?:javascript|vbscript|data)\s*:|-moz-binding|behavior\s*:/i;

/** Verifica se o nome de atributo pertence aos aliases de degradê. */
export function ehAtributoDegrade(nome: string): boolean {
  const normalizado = nome.toLowerCase();
  return normalizado === 'degrade' || normalizado === 'gradiente' || normalizado === 'gradient';
}

/** Divide argumentos ou camadas separados por vírgula no nível raiz de parênteses. */
function dividirTopoNivel(texto: string): string[] | null {
  const partes: string[] = [];
  let profundidade = 0;
  let inicio = 0;

  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (ch === '(') {
      profundidade++;
    } else if (ch === ')') {
      profundidade--;
      if (profundidade < 0) return null;
    } else if (ch === ',' && profundidade === 0) {
      const trecho = texto.slice(inicio, i).trim();
      if (!trecho) return null;
      partes.push(trecho);
      inicio = i + 1;
    }
  }

  if (profundidade !== 0) return null;
  const ultimo = texto.slice(inicio).trim();
  if (!ultimo) return null;
  partes.push(ultimo);
  return partes;
}

/** Valida uma única chamada CSS `fn(...)` segura (gradiente ou `var(--token)`). */
function itemGradienteSeguro(item: string): boolean {
  const idxAbre = item.indexOf('(');
  if (idxAbre <= 0 || !item.endsWith(')')) return false;

  const nomeFuncao = item.slice(0, idxAbre).trim().toLowerCase();
  const conteudo = item.slice(idxAbre + 1, -1).trim();
  if (!conteudo) return false;

  if (nomeFuncao === 'var') {
    const args = dividirTopoNivel(conteudo);
    if (!args || args.length === 0 || args.length > 2) return false;
    return /^--[a-zA-Z0-9_-]{1,64}$/.test(args[0]);
  }

  if (!FUNCOES_GRADIENTE_PERMITIDAS.has(nomeFuncao)) {
    return false;
  }

  // Conteúdo interno de gradiente já passou por PADRAO_BLOQUEADO e equilíbrio de parênteses;
  // garante apenas caracteres CSS seguros dentro dos argumentos.
  return /^[a-zA-Z0-9\s,#.%()+\-_/:]+$/.test(conteudo);
}

/**
 * Valida e normaliza uma expressão CSS de degradê contra XSS, CSS injection e sintaxe quebrada.
 * Aceita gradientes CSS nativos (lineares, radiais, cônicos, repetidos e em camadas) ou `var(--token)`.
 */
export function gradienteSeguro(valor: string): string | null {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim();
  if (!limpo || limpo.length > TAMANHO_MAX_DEGRADE) return null;
  if (PADRAO_BLOQUEADO.test(limpo)) return null;

  const camadas = dividirTopoNivel(limpo);
  if (!camadas || camadas.length === 0 || camadas.length > 6) return null;

  for (const camada of camadas) {
    if (!itemGradienteSeguro(camada)) return null;
  }

  return limpo;
}

export interface ResultadoDegrade {
  /** Indica se o componente deve entrar no modo visual de degradê. */
  ativo: boolean;
  /** Token CSS ou gradiente explícito quando especificado; `null` para modo booleano padrão. */
  explicito: string | null;
}

/**
 * Resolve o valor bruto dos atributos `degrade` / `gradiente` / `gradient` em estado e valor CSS seguro.
 */
export function resolverDegrade(valor: string | null | undefined, presetPadrao?: string): ResultadoDegrade {
  if (valor === null || valor === undefined) {
    return { ativo: false, explicito: null };
  }

  if (typeof valor !== 'string') {
    return { ativo: false, explicito: null };
  }

  const limpo = valor.trim();
  const chave = limpo.toLowerCase();

  if (VALORES_DESATIVACAO.has(chave)) {
    return { ativo: false, explicito: null };
  }

  if (VALORES_ATIVACAO_PADRAO.has(chave)) {
    return { ativo: true, explicito: presetPadrao ?? null };
  }

  const preset = PRESETS_DEGRADE[chave];
  if (preset) {
    return { ativo: true, explicito: preset };
  }

  const seguro = gradienteSeguro(limpo);
  if (seguro) {
    return { ativo: true, explicito: seguro };
  }

  return { ativo: false, explicito: null };
}

/** Lê o primeiro atributo de degradê presente no host (`degrade`, `gradiente` ou `gradient`). */
export function obterValorAtributoDegrade(host: Element): string | null {
  for (const attr of ATRIBUTOS_DEGRADE) {
    if (host.hasAttribute(attr)) {
      return host.getAttribute(attr);
    }
  }
  return null;
}

/**
 * Sincroniza o estado interno de degradê entre atributos do host e o elemento-alvo no Shadow DOM.
 * Retorna `true` quando algum modo de degradê (atributo ou classe utilitária no host) está ativo.
 */
export function aplicarDegradeNoElemento(
  host: Element,
  alvoInterno: HTMLElement | null,
  presetExplicitoPadrao?: string
): boolean {
  const bruto = obterValorAtributoDegrade(host);
  const resolvido = resolverDegrade(bruto, presetExplicitoPadrao);
  const ativoPorClasse = CLASSES_DEGRADE.some((cls) => host.classList.contains(cls));
  const ativo = resolvido.ativo || ativoPorClasse;

  if (!alvoInterno) return ativo;

  if (resolvido.explicito) {
    alvoInterno.style.setProperty('--ui-degrade-interno', resolvido.explicito);
  } else {
    alvoInterno.style.removeProperty('--ui-degrade-interno');
  }

  if (ativo) {
    alvoInterno.setAttribute('data-degrade', 'ativo');
  } else {
    alvoInterno.removeAttribute('data-degrade');
  }

  return ativo;
}
