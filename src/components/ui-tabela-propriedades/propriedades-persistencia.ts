/* ====================================================
   UI Tabela de Propriedades - Memória e Persistência das Categorias
   Responsabilidade única: preservar o estado aberto/fechado das
   categorias em memória (entre trocas de seleção) e no localStorage,
   com tolerância a SSR, objetos congelados e dados corrompidos.
   ==================================================== */

import type {
  CategoriaPropriedades,
  EstadoPersistidoPropriedades,
  UICategoriasEstadoDetail
} from './tipos';

const PREFIXO_STORAGE = 'ui_tabela_propriedades_estado_';
const CHAVES_PROIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);

export interface ContextoLembrancaPropriedades {
  persistir: boolean;
  conectado: boolean;
  storageKey: string | null;
  id: string;
}

function ehObjetoPlano(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function obterLocalStorageSeguro(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Gera a chave determinística usada no localStorage para uma instância do painel.
 */
export function gerarChaveStoragePropriedades(
  storageKey?: string | null,
  elementId?: string | null
): string {
  const chaveLimpa = typeof storageKey === 'string' ? storageKey.trim() : '';
  const idLimpo = typeof elementId === 'string' ? elementId.trim() : '';
  const identificador = chaveLimpa || idLimpo || 'default';
  return `${PREFIXO_STORAGE}${identificador}`;
}

/**
 * Valida e sanitiza o JSON vindo do storage campo a campo.
 * Entradas inválidas ou com poluição de protótipo são descartadas sem lançar exceção.
 */
export function normalizarEstadoPersistidoPropriedades(
  bruto: unknown
): EstadoPersistidoPropriedades | null {
  if (!ehObjetoPlano(bruto)) return null;

  const categorias: Record<string, boolean> = {};
  if (ehObjetoPlano(bruto.categorias)) {
    for (const [id, aberto] of Object.entries(bruto.categorias)) {
      if (!id || CHAVES_PROIBIDAS.has(id)) continue;
      if (typeof aberto === 'boolean') {
        categorias[id] = aberto;
      }
    }
  }

  const versao =
    typeof bruto.versao === 'number' && Number.isFinite(bruto.versao) ? bruto.versao : 1;
  const ultimaAtualizacao =
    typeof bruto.ultimaAtualizacao === 'number' && Number.isFinite(bruto.ultimaAtualizacao)
      ? bruto.ultimaAtualizacao
      : undefined;

  return ultimaAtualizacao !== undefined
    ? { versao, categorias, ultimaAtualizacao }
    : { versao, categorias };
}

/**
 * Lê o estado persistido do localStorage de forma segura em SSR e ambientes restritos.
 */
export function carregarEstadoPropriedades(
  storageKey: string
): EstadoPersistidoPropriedades | null {
  const storage = obterLocalStorageSeguro();
  if (!storage) return null;
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    return normalizarEstadoPersistidoPropriedades(JSON.parse(raw));
  } catch (err) {
    console.warn(
      `[ui-tabela-propriedades] Não foi possível carregar o estado persistido (${storageKey}):`,
      err
    );
    return null;
  }
}

/**
 * Grava o estado persistido no localStorage com proteção contra cota excedida e restrições de sandbox.
 */
export function salvarEstadoPropriedades(
  storageKey: string,
  estado: EstadoPersistidoPropriedades
): void {
  const storage = obterLocalStorageSeguro();
  if (!storage) return;
  try {
    storage.setItem(storageKey, JSON.stringify(estado));
  } catch (err) {
    console.warn(
      `[ui-tabela-propriedades] Não foi possível salvar o estado persistido (${storageKey}):`,
      err
    );
  }
}

/**
 * Remove o estado persistido no localStorage sem falhar em ambientes restritos.
 */
export function limparEstadoPropriedades(storageKey: string): void {
  const storage = obterLocalStorageSeguro();
  if (!storage) return;
  try {
    storage.removeItem(storageKey);
  } catch {
    // Silencioso em ambientes com storage restrito
  }
}

/** Extrai o identificador normalizado de uma categoria ou devolve `null` se inválido. */
export function idDaCategoria(cat: unknown): string | null {
  if (!cat || typeof cat !== 'object') return null;
  const idBruto = (cat as { id?: unknown }).id;
  if (idBruto === undefined || idBruto === null) return null;
  const id = String(idBruto);
  if (!id || CHAVES_PROIBIDAS.has(id)) return null;
  return id;
}

/** Estado padrão declarado pelo objeto `CategoriaPropriedades` (`true` quando omitido). */
export function abertoPadraoDaCategoria(cat: CategoriaPropriedades): boolean {
  return cat.aberto !== undefined ? cat.aberto !== false : cat.aberta !== false;
}

/** Atualiza `aberto` (e `aberta`, se existir) no objeto da categoria sem quebrar objetos congelados. */
export function sincronizarCampoAberto(cat: CategoriaPropriedades, aberto: boolean): void {
  if (!cat || typeof cat !== 'object' || Object.isFrozen(cat)) return;
  try {
    cat.aberto = aberto;
    if ('aberta' in cat) {
      cat.aberta = aberto;
    }
  } catch {
    // Ignora objetos com descritores somente leitura ou Proxy restrito
  }
}

/**
 * Gerencia o estado lembrado de abertura/fechamento das categorias em memória e no localStorage.
 */
export class LembrancaCategoriasPropriedades {
  private preferencias = new Map<string, boolean>();
  private origensAberto = new Map<string, boolean>();
  private ultimaChaveCarregada: string | null = null;

  constructor(private readonly getContexto: () => ContextoLembrancaPropriedades) {}

  public chaveAtual(): string {
    const ctx = this.getContexto();
    return gerarChaveStoragePropriedades(ctx.storageKey, ctx.id);
  }

  /** Carrega preferências do storage. Quando `substituirExistentes` é falso, preserva alterações feitas antes da conexão. */
  public carregarDoStorage(substituirExistentes = false): boolean {
    const ctx = this.getContexto();
    const chave = gerarChaveStoragePropriedades(ctx.storageKey, ctx.id);
    if (substituirExistentes) {
      this.preferencias.clear();
    }
    this.ultimaChaveCarregada = chave;

    if (!ctx.persistir) return false;
    const estado = carregarEstadoPropriedades(chave);
    if (!estado) return false;

    for (const [id, aberto] of Object.entries(estado.categorias)) {
      if (substituirExistentes || !this.preferencias.has(id)) {
        this.preferencias.set(id, aberto);
      }
    }
    return true;
  }

  /** Recarrega o estado se `id` ou `storage-key` tiver mudado após a conexão. */
  public sincronizarSeChaveMudou(): boolean {
    const ctx = this.getContexto();
    if (!ctx.conectado || !ctx.persistir) return false;
    const chave = gerarChaveStoragePropriedades(ctx.storageKey, ctx.id);
    if (this.ultimaChaveCarregada === null) {
      return this.carregarDoStorage(false);
    }
    if (chave !== this.ultimaChaveCarregada) {
      return this.carregarDoStorage(true);
    }
    return false;
  }

  /** Registra os padrões originais enviados pela aplicação para permitir restauração via `limpar()`. */
  public registrarOrigens(categorias: CategoriaPropriedades[]): void {
    this.origensAberto.clear();
    if (!Array.isArray(categorias)) return;
    for (const cat of categorias) {
      const id = idDaCategoria(cat);
      if (id !== null) {
        this.origensAberto.set(id, abertoPadraoDaCategoria(cat));
      }
    }
  }

  /** Aplica sobre os objetos mutáveis de `categorias` as preferências lembradas para cada `id`. */
  public aplicarEmCategorias(categorias: CategoriaPropriedades[]): void {
    if (!Array.isArray(categorias)) return;
    for (const cat of categorias) {
      const id = idDaCategoria(cat);
      if (id !== null && this.preferencias.has(id)) {
        sincronizarCampoAberto(cat, this.preferencias.get(id)!);
      }
    }
  }

  /** Restaura nos objetos mutáveis os valores iniciais enviados pela aplicação. */
  public restaurarOrigensEmCategorias(categorias: CategoriaPropriedades[]): void {
    if (!Array.isArray(categorias)) return;
    for (const cat of categorias) {
      const id = idDaCategoria(cat);
      if (id !== null && this.origensAberto.has(id)) {
        sincronizarCampoAberto(cat, this.origensAberto.get(id)!);
      }
    }
  }

  /** Estado efetivo da categoria considerando preferência lembrada e padrão da própria categoria. */
  public estaAberta(cat: CategoriaPropriedades): boolean {
    if (!cat || typeof cat !== 'object') return true;
    const id = idDaCategoria(cat);
    if (id !== null && this.preferencias.has(id)) {
      return this.preferencias.get(id)!;
    }
    return abertoPadraoDaCategoria(cat);
  }

  public registrar(idCategoria: string, aberto: boolean, persistirAgora = true): void {
    if (!idCategoria || CHAVES_PROIBIDAS.has(idCategoria)) return;
    this.preferencias.set(idCategoria, Boolean(aberto));
    if (persistirAgora) {
      this.salvar();
    }
  }

  public registrarVarias(entradas: Iterable<[string, boolean]>, persistirAgora = true): void {
    let alterou = false;
    for (const [id, aberto] of entradas) {
      if (!id || CHAVES_PROIBIDAS.has(id)) continue;
      this.preferencias.set(id, Boolean(aberto));
      alterou = true;
    }
    if (alterou && persistirAgora) {
      this.salvar();
    }
  }

  public salvar(): void {
    const ctx = this.getContexto();
    if (!ctx.persistir || !ctx.conectado) return;
    const chave = gerarChaveStoragePropriedades(ctx.storageKey, ctx.id);
    this.ultimaChaveCarregada = chave;
    if (this.preferencias.size === 0) return;

    const categorias: Record<string, boolean> = {};
    for (const [id, aberto] of this.preferencias.entries()) {
      categorias[id] = aberto;
    }
    salvarEstadoPropriedades(chave, {
      versao: 1,
      categorias,
      ultimaAtualizacao: Date.now()
    });
  }

  public limpar(categoriasAtuais?: CategoriaPropriedades[]): void {
    this.preferencias.clear();
    if (categoriasAtuais) {
      this.restaurarOrigensEmCategorias(categoriasAtuais);
    }
    limparEstadoPropriedades(this.chaveAtual());
  }

  public obterEstado(categoriasAtuais: CategoriaPropriedades[]): Record<string, boolean> {
    const estado: Record<string, boolean> = {};
    for (const [id, aberto] of this.preferencias.entries()) {
      estado[id] = aberto;
    }
    if (Array.isArray(categoriasAtuais)) {
      for (const cat of categoriasAtuais) {
        const id = idDaCategoria(cat);
        if (id !== null && !(id in estado)) {
          estado[id] = this.estaAberta(cat);
        }
      }
    }
    return estado;
  }

  public montarDetalheEvento(categoriasAtuais: CategoriaPropriedades[]): UICategoriasEstadoDetail {
    const estado = this.obterEstado(categoriasAtuais);
    const abertas: string[] = [];
    const fechadas: string[] = [];
    for (const [id, aberto] of Object.entries(estado)) {
      if (aberto) abertas.push(id);
      else fechadas.push(id);
    }
    return { estado, abertas, fechadas };
  }
}
