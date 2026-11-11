import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  gerarChaveStoragePropriedades,
  normalizarEstadoPersistidoPropriedades,
  carregarEstadoPropriedades,
  salvarEstadoPropriedades,
  limparEstadoPropriedades,
  LembrancaCategoriasPropriedades
} from './propriedades-persistencia';
import type { CategoriaPropriedades } from './tipos';

describe('propriedades-persistencia (Camada A — funções puras e storage seguro)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gera chave de storage com fallback para id e "default"', () => {
    expect(gerarChaveStoragePropriedades('painel-cad', 'outro')).toBe('ui_tabela_propriedades_estado_painel-cad');
    expect(gerarChaveStoragePropriedades(null, 'meu-id')).toBe('ui_tabela_propriedades_estado_meu-id');
    expect(gerarChaveStoragePropriedades('   ', '')).toBe('ui_tabela_propriedades_estado_default');
    expect(gerarChaveStoragePropriedades(undefined, undefined)).toBe('ui_tabela_propriedades_estado_default');
  });

  it('normaliza entradas hostis e bloqueia chaves de poluição de protótipo', () => {
    expect(normalizarEstadoPersistidoPropriedades(null)).toBeNull();
    expect(normalizarEstadoPersistidoPropriedades([1, 2, 3])).toBeNull();
    expect(normalizarEstadoPersistidoPropriedades('lixo')).toBeNull();

    const bruto = JSON.parse(
      '{"versao": "errada", "categorias": {"geral": false, "geo": true, "invalido": "sim", "num": 1, "__proto__": false, "constructor": true}, "ultimaAtualizacao": "abc"}'
    );
    const norm = normalizarEstadoPersistidoPropriedades(bruto);
    expect(norm).not.toBeNull();
    expect(norm!.versao).toBe(1);
    expect(norm!.ultimaAtualizacao).toBeUndefined();
    expect(norm!.categorias).toEqual({ geral: false, geo: true });
    expect(Object.prototype.hasOwnProperty.call(norm!.categorias, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(norm!.categorias, 'constructor')).toBe(false);
  });

  it('salva, carrega e limpa no localStorage tolerando JSON corrompido e exceções do storage', () => {
    const chave = gerarChaveStoragePropriedades('teste-crud');
    salvarEstadoPropriedades(chave, { versao: 1, categorias: { geral: false, estilo: true }, ultimaAtualizacao: 123 });
    expect(carregarEstadoPropriedades(chave)).toEqual({
      versao: 1,
      categorias: { geral: false, estilo: true },
      ultimaAtualizacao: 123
    });

    limparEstadoPropriedades(chave);
    expect(carregarEstadoPropriedades(chave)).toBeNull();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(chave, '{json-quebrado');
    expect(carregarEstadoPropriedades(chave)).toBeNull();
    expect(warnSpy).toHaveBeenCalled();

    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => salvarEstadoPropriedades(chave, { versao: 1, categorias: { a: true } })).not.toThrow();

    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => carregarEstadoPropriedades(chave)).not.toThrow();

    setSpy.mockRestore();
    getSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('LembrancaCategoriasPropriedades preserva preferências sem mutar objetos congelados', () => {
    let persistir = false;
    let conectado = true;
    const lembranca = new LembrancaCategoriasPropriedades(() => ({
      persistir,
      conectado,
      storageKey: 'mem',
      id: ''
    }));

    const catCongelada = Object.freeze({
      id: 'geral',
      titulo: 'Geral',
      aberto: true,
      propriedades: []
    }) as CategoriaPropriedades;

    expect(lembranca.estaAberta(catCongelada)).toBe(true);
    lembranca.registrar('geral', false);
    expect(lembranca.estaAberta(catCongelada)).toBe(false);
    expect(() => lembranca.aplicarEmCategorias([catCongelada, null as unknown as CategoriaPropriedades])).not.toThrow();
    expect(catCongelada.aberto).toBe(true);
  });
});
